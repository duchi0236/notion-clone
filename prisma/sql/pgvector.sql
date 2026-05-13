-- Optional pgvector setup for ClawNote semantic search.
-- Run after `prisma db push` when using a PostgreSQL image with pgvector installed.
-- For vanilla postgres:16-alpine, install/use a pgvector-enabled image first.

CREATE EXTENSION IF NOT EXISTS vector;

-- Prisma owns the SearchIndex table. This optional column is managed manually.
ALTER TABLE "SearchIndex"
  ADD COLUMN IF NOT EXISTS "embeddingVector" vector(1536);

CREATE INDEX IF NOT EXISTS "SearchIndex_embeddingVector_idx"
  ON "SearchIndex"
  USING ivfflat ("embeddingVector" vector_cosine_ops)
  WITH (lists = 100);

-- Example query:
-- SELECT "documentId", title, 1 - ("embeddingVector" <=> '[0.1,0.2,...]'::vector) AS score
-- FROM "SearchIndex"
-- WHERE "embeddingVector" IS NOT NULL
-- ORDER BY "embeddingVector" <=> '[0.1,0.2,...]'::vector
-- LIMIT 10;
