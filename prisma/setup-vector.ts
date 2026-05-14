import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
  await prisma.$executeRaw`ALTER TABLE "SearchIndex" ADD COLUMN IF NOT EXISTS "embeddingVector" vector(1536)`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SearchIndex_embeddingVector_idx" ON "SearchIndex" USING ivfflat ("embeddingVector" vector_cosine_ops) WITH (lists = 100)`;
  console.log("pgvector setup completed");
}

main()
  .catch((error) => {
    console.error("pgvector setup failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
