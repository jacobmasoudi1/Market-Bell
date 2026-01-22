import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type StoredToolResult = {
  results: Array<{ toolCallId: string; result: unknown }>;
  status?: number;
};

export type ToolReplayState =
  | { state: "succeeded"; response: StoredToolResult }
  | { state: "failed"; response: StoredToolResult }
  | { state: "processing" }
  | null;

type ToolCallMeta = {
  conversationId?: string | null;
  userId?: string | null;
  toolName?: string | null;
  eventId?: string | null;
};

const processed = prisma.processedToolCall;

export async function recordToolCallStart(toolCallId: string, meta: ToolCallMeta = {}) {
  return processed.upsert({
    where: { toolCallId },
    update: {
      conversationId: meta.conversationId ?? undefined,
      userId: meta.userId ?? undefined,
      toolName: meta.toolName ?? undefined,
      eventId: meta.eventId ?? undefined,
    },
    create: {
      toolCallId,
      status: "processing",
      conversationId: meta.conversationId ?? undefined,
      userId: meta.userId ?? undefined,
      toolName: meta.toolName ?? undefined,
      eventId: meta.eventId ?? undefined,
    },
  });
}

export async function markToolCallSucceeded(toolCallId: string, response: StoredToolResult) {
  return processed.updateMany({
    where: { toolCallId, status: "processing" },
    data: {
      status: "succeeded",
      resultJson: response as Prisma.InputJsonValue,
      errorJson: Prisma.JsonNull, // safest for Prisma Json fields
    },
  });
}

export async function markToolCallFailed(toolCallId: string, response: StoredToolResult) {
  return processed.updateMany({
    where: { toolCallId, status: "processing" },
    data: {
      status: "failed",
      errorJson: response as Prisma.InputJsonValue,
      resultJson: Prisma.JsonNull,
    },
  });
}

export async function getToolCallState(toolCallId: string): Promise<ToolReplayState> {
  const record = await processed.findUnique({ where: { toolCallId } });
  if (!record) return null;

  if (record.status === "processing") return { state: "processing" };

  if (record.status === "succeeded" && record.resultJson) {
    return { state: "succeeded", response: record.resultJson as StoredToolResult };
  }

  if (record.status === "failed" && record.errorJson) {
    return { state: "failed", response: record.errorJson as StoredToolResult };
  }

  return null;
}
