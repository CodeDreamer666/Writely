-- Documents library: created date, pinning and searchable plain text.
ALTER TABLE "Document" ADD COLUMN "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "plainText" TEXT NOT NULL DEFAULT '',
ADD COLUMN "wordCount" INTEGER NOT NULL DEFAULT 0;

-- Existing documents: the best known creation time is their last edit.
UPDATE "Document" SET "created" = "updated";

-- Approximate plain text for existing documents; every later save stores the exact text.
UPDATE "Document" SET "plainText" = btrim(regexp_replace(
  replace(replace(replace(replace(replace(replace(
    regexp_replace(regexp_replace("html", '</(p|h[1-6]|li|blockquote|pre)>|<br ?/?>', ' ', 'gi'), '<[^>]*>', '', 'g'),
  '&nbsp;', ' '), '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&#39;', ''''), '&amp;', '&'),
  '\s+', ' ', 'g'));
UPDATE "Document" SET "wordCount" = CASE WHEN "plainText" = '' THEN 0
  ELSE array_length(regexp_split_to_array("plainText", '\s+'), 1) END;

CREATE INDEX "Document_userId_updated_idx" ON "Document"("userId", "updated");

-- Case-insensitive substring search on titles and text.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Document_title_trgm_idx" ON "Document" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Document_plainText_trgm_idx" ON "Document" USING GIN ("plainText" gin_trgm_ops);

-- Preferences and first-run state. Existing accounts have already been welcomed.
ALTER TABLE "Workspace" ADD COLUMN "preferences" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "welcomedAt" TIMESTAMP(3),
ADD COLUMN "welcomeBackAt" TIMESTAMP(3);
UPDATE "Workspace" SET "welcomedAt" = CURRENT_TIMESTAMP;

-- Days with writing activity.
CREATE TABLE "WritingDay" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,

    CONSTRAINT "WritingDay_pkey" PRIMARY KEY ("userId","day")
);
ALTER TABLE "WritingDay" ADD CONSTRAINT "WritingDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
