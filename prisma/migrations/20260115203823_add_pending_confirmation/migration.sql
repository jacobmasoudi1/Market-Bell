-- CreateTable
CREATE TABLE "PendingConfirmation" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingConfirmation_conversationId_toolName_ticker_idx" ON "PendingConfirmation"("conversationId", "toolName", "ticker");

-- CreateIndex
CREATE UNIQUE INDEX "PendingConfirmation_conversationId_toolName_ticker_key" ON "PendingConfirmation"("conversationId", "toolName", "ticker");
