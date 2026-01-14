-- Add summaryUpdatedAt column if missing (init already includes summary)
ALTER TABLE "Conversation"
ADD COLUMN IF NOT EXISTS "summaryUpdatedAt" TIMESTAMP(3);
