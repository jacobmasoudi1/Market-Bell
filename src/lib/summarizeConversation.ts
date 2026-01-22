import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { isNoiseText } from "@/lib/conversationUtils";

const MIN_MESSAGES = 3;
const MAX_MESSAGES = 20;
const SUMMARY_COOLDOWN_MS = 60_000;
const SUMMARY_MAX = 240;

async function generateTitle(conversationText: string) {
  try {
    const r = await openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      max_output_tokens: 30,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Write a short title (<= 60 characters) for this conversation. No quotes. No trailing punctuation. Use only info in the messages. Prefer tickers + intent (e.g., 'TSLA watchlist and movers').",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: conversationText,
            },
          ],
        },
      ],
    });

    const title =
      (r as any).output_text ??
      (r as any).output
        ?.flatMap((item: any) => item.content?.map((part: any) => part.text?.value ?? part.text).filter(Boolean) ?? [])
        .join(" ")
        .trim();

    if (!title) return null;
    const t = title.replace(/\s+/g, " ").trim();
    return t.length > 60 ? `${t.slice(0, 59)}…` : t;
  } catch (err) {
    console.error("Failed to generate title", err);
    return null;
  }
}

export async function maybeUpdateConversationSummary(conversationId: string): Promise<void> {
  try {
    const [messageCount, conversation] = await Promise.all([
      prisma.message.count({ where: { conversationId } }),
      prisma.conversation.findUnique({
        where: { id: conversationId },
      }),
    ]);

    if (messageCount < MIN_MESSAGES) return;
    if (!conversation) return;

    const convoSummaryUpdatedAt = (conversation as any)?.summaryUpdatedAt as Date | null | undefined;
    const canUpdateSummary = !convoSummaryUpdatedAt || Date.now() - convoSummaryUpdatedAt.getTime() > SUMMARY_COOLDOWN_MS;

    const recentMessages = await prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_MESSAGES * 2,
      select: { role: true, text: true, createdAt: true },
    });

    const lastMessageRole = recentMessages[0]?.role;
    if (lastMessageRole !== "assistant") return;

    const cleanedMessages = recentMessages
      .map((m) => ({ ...m, text: (m.text ?? "").trim() }))
      .filter((m) => !isNoiseText(m.text))
      .slice(0, MAX_MESSAGES)
      .reverse();

    if (!cleanedMessages.length) return;

    const conversationText = cleanedMessages.map((m) => `${m.role}: ${m.text}`).join("\n\n");

    let newSummary: string | null = null;
    if (canUpdateSummary) {
      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        temperature: 0.1,
        max_output_tokens: 120,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "Summarize the conversation in 1-2 sentences (<= 240 characters). Only use information present in the messages. Do not invent market data, prices, or news.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: conversationText,
              },
            ],
          },
        ],
      });

      const summary =
        (response as any).output_text ??
        (response as any).output
          ?.flatMap((item: any) => item.content?.map((part: any) => part.text?.value ?? part.text).filter(Boolean) ?? [])
          .join(" ")
          .trim();

      if (summary) {
        newSummary = summary.length > SUMMARY_MAX ? summary.slice(0, SUMMARY_MAX) : summary;
      }
    }

    const existingTitle = (conversation as any)?.title?.trim() || "";
    const looksLikePlaceholder =
      existingTitle.toLowerCase().startsWith("voice session live") ||
      existingTitle.toLowerCase().startsWith("conversation ") ||
      existingTitle.toLowerCase().startsWith("hi. i'm") ||
      existingTitle.toLowerCase().startsWith("hi i'm") ||
      existingTitle.toLowerCase().startsWith("hello") ||
      existingTitle.toLowerCase().startsWith("tap to load");
    const shouldUpdateTitle = !existingTitle || looksLikePlaceholder || existingTitle.length < 8;

    let newTitle: string | null = null;
    if (shouldUpdateTitle) {
      newTitle = await generateTitle(conversationText);
      if (!newTitle) {
        const firstUserText = cleanedMessages.find((m) => m.role === "user")?.text || cleanedMessages[0]?.text || "";
        const fallback = firstUserText.replace(/\s+/g, " ").trim();
        newTitle = fallback ? (fallback.length > 60 ? `${fallback.slice(0, 59)}…` : fallback) : null;
      }
    }

    const updateData: Record<string, any> = {};
    if (newSummary) {
      updateData.summary = newSummary;
      updateData.summaryUpdatedAt = new Date();
    }
    if (newTitle) {
      updateData.title = newTitle;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: updateData,
      });
    }
  } catch (error) {
    console.error("Failed to update conversation summary", { conversationId, error });
    // Soft retry once after a brief delay to handle transient model/db errors.
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await maybeUpdateConversationSummary(conversationId);
    } catch (err) {
      console.error("Summary retry failed", { conversationId, error: err });
    }
  }
}
