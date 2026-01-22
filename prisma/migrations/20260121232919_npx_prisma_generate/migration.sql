-- AlterTable
ALTER TABLE "PendingConfirmation" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProcessedToolCall" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "pending_conversation_user_tool_ticker" RENAME TO "PendingConfirmation_conversationId_userId_toolName_ticker_key";
