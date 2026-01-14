import { Role } from "@prisma/client";

export type VoiceClientDeps = {
  addMessage: (role: Role, text?: string) => Promise<void>;
  ensureConversation: () => Promise<string>;
};

export type VapiClient = {
  start?: (assistantId: string | unknown, assistantOverrides?: unknown) => Promise<unknown> | void;
  connect?: (assistantId: string | unknown, assistantOverrides?: unknown) => Promise<unknown> | void;
  stop?: () => Promise<unknown> | void;
  disconnect?: () => Promise<unknown> | void;
  on?: (event: string, cb: (payload: unknown) => void) => void;
};
