import { prisma } from "../src/lib/prisma";
import { executeAgentJob } from "../src/lib/openclaw/execute-job";
import Redis from "ioredis";

const pollMs = Math.max(500, Number(process.env.AGENT_WORKER_POLL_MS ?? 1500));
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 }) : null;
let stopping = false;
let publishing = false;

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

async function claimAndRun() {
  const queued = await prisma.agentJob.findFirst({
    where: { status: "QUEUED", nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
  });
  if (!queued) return false;
  const claimed = await prisma.agentJob.updateMany({
    where: { id: queued.id, status: "QUEUED" },
    data: { status: "PLANNING", startedAt: queued.startedAt ?? new Date(), attempts: { increment: 1 } },
  });
  if (!claimed.count) return true;
  await executeAgentJob(queued.id);
  return true;
}

async function publishOutbox() {
  if (publishing) return;
  publishing = true;
  try {
    const events = await prisma.outboxEvent.findMany({
      where: { processedAt: null, availableAt: { lte: new Date() } },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    for (const event of events) {
      try {
        if (redis) {
          await redis.publish(`clawnote:${event.workspaceId}:events`, JSON.stringify({
            id: event.id,
            topic: event.topic,
            aggregateId: event.aggregateId,
            payload: event.payload,
          }));
        }
        await prisma.outboxEvent.updateMany({
          where: { id: event.id, processedAt: null },
          data: { processedAt: new Date(), attempts: { increment: 1 }, lastError: null },
        });
      } catch (error) {
        const attempts = event.attempts + 1;
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            attempts,
            lastError: error instanceof Error ? error.message : String(error),
            availableAt: new Date(Date.now() + Math.min(60_000, 1000 * 2 ** Math.min(attempts, 6))),
          },
        });
      }
    }
  } finally {
    publishing = false;
  }
}

async function recoverInterruptedJobs() {
  const cutoff = new Date(Date.now() - Number(process.env.AGENT_STALE_JOB_MS ?? 10 * 60_000));
  const recovered = await prisma.agentJob.updateMany({
    where: {
      status: { in: ["PLANNING", "RUNNING", "VERIFYING"] },
      updatedAt: { lt: cutoff },
    },
    data: {
      status: "WAITING_REVIEW",
      error: { code: "INTERRUPTED", message: "Worker 或 Gateway 中断；为避免重复高风险写入，需要人工复核后继续。" },
    },
  });
  if (recovered.count) console.warn(`[clawnote-worker] moved ${recovered.count} interrupted job(s) to WAITING_REVIEW`);
}

async function main() {
  await recoverInterruptedJobs();
  const outboxTimer = setInterval(() => void publishOutbox().catch((error) => {
    console.error("[clawnote-worker] outbox delivery failed", error);
  }), Math.max(500, Number(process.env.OUTBOX_POLL_MS ?? 1000)));
  while (!stopping) {
    const worked = await claimAndRun().catch((error) => {
      console.error("[clawnote-worker] agent job failed", error);
      return false;
    });
    if (!worked) await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  clearInterval(outboxTimer);
  await publishOutbox();
  if (redis) await redis.quit();
  await prisma.$disconnect();
}

void main();
