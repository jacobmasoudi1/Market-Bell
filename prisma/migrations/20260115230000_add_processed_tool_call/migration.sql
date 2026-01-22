-- CreateEnum
CREATE TYPE "ToolCallStatus" AS ENUM ('processing', 'succeeded', 'failed');

-- AlterTable PendingConfirmation adjustments
ALTER TABLE "PendingConfirmation"
  ALTER COLUMN "ticker" DROP NOT NULL,
  ADD COLUMN     "argsHash" TEXT,
  ADD COLUMN     "toolCallId" TEXT,
  ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Drop old indexes on PendingConfirmation
DROP INDEX IF EXISTS "PendingConfirmation_conversationId_toolName_ticker_idx";
DROP INDEX IF EXISTS "PendingConfirmation_conversationId_toolName_ticker_key";

-- Recreate indexes with latest-wins semantics
CREATE INDEX "PendingConfirmation_conversationId_userId_toolName_ticker_idx"
  ON "PendingConfirmation"("conversationId", "userId", "toolName", "ticker");
CREATE INDEX "PendingConfirmation_expiresAt_idx" ON "PendingConfirmation"("expiresAt");
CREATE UNIQUE INDEX "pending_conversation_user_tool_ticker"
  ON "PendingConfirmation"("conversationId", "userId", "toolName", "ticker");

-- CreateTable ProcessedToolCall
CREATE TABLE "ProcessedToolCall" (
    "id" TEXT NOT NULL,
    "toolCallId" TEXT NOT NULL,
    "eventId" TEXT,
    "conversationId" TEXT,
    "userId" TEXT,
    "toolName" TEXT,
    "status" "ToolCallStatus" NOT NULL,
    "resultJson" JSONB,
    "errorJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedToolCall_pkey" PRIMARY KEY ("id")
);

-- Indexes for ProcessedToolCall
CREATE UNIQUE INDEX "ProcessedToolCall_toolCallId_key" ON "ProcessedToolCall"("toolCallId");
CREATE INDEX "ProcessedToolCall_eventId_idx" ON "ProcessedToolCall"("eventId");
CREATE INDEX "ProcessedToolCall_conversationId_idx" ON "ProcessedToolCall"("conversationId");
