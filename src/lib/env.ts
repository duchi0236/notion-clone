const REQUIRED_IN_PRODUCTION = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "CLAWNOTE_AGENT_TOKEN",
] as const;

const INSECURE_VALUES = new Set([
  "",
  "replace-with-a-long-random-secret",
  "replace-with-agent-token",
  "dev-change-me-agent-token",
  "ci-secret-change-me",
  "ci-agent-token",
  "development",
  "dev",
]);

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function validateEnv() {
  if (!isProduction()) return { ok: true, errors: [] as string[] };

  const errors: string[] = [];
  for (const key of REQUIRED_IN_PRODUCTION) {
    const value = process.env[key] ?? "";
    if (INSECURE_VALUES.has(value) || value.length < 16) {
      errors.push(`${key} is missing or insecure for production`);
    }
  }

  if ((process.env.NEXTAUTH_URL ?? "").startsWith("http://") && !process.env.NEXTAUTH_URL?.includes("localhost")) {
    errors.push("NEXTAUTH_URL should use HTTPS in production");
  }

  return { ok: errors.length === 0, errors };
}

export function assertEnv() {
  const result = validateEnv();
  if (!result.ok) {
    throw new Error(`Invalid production environment: ${result.errors.join("; ")}`);
  }
}

export function getUploadConfig() {
  const maxSizeMb = Number(process.env.MAX_UPLOAD_MB ?? 20);
  const allowedTypes = (process.env.ALLOWED_UPLOAD_TYPES ?? "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    maxSizeBytes: Math.max(1, maxSizeMb) * 1024 * 1024,
    allowedTypes,
    uploadDir: process.env.UPLOAD_DIR || "public/uploads",
  };
}
