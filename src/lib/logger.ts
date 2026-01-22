type Level = "debug" | "info" | "warn" | "error";

export type LogContext = {
  requestId?: string;
  conversationId?: string;
  toolCallId?: string;
  userId?: string;
  toolName?: string;
};

export type Logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
  child: (ctx: LogContext) => Logger;
  context: LogContext;
};

const noop = () => {};
const levels: Level[] = ["debug", "info", "warn", "error"];

function emit(level: Level, msg: string, context: LogContext, meta?: Record<string, unknown>) {
  const payload = {
    level,
    msg,
    ...context,
    ...(meta ?? {}),
  };

  // Keep logging lightweight; console output is sufficient here.
  if (level === "error") {
    console.error(payload);
  } else if (level === "warn") {
    console.warn(payload);
  } else if (level === "info") {
    console.info(payload);
  } else {
    console.debug(payload);
  }
}

export function createLogger(context: LogContext = {}): Logger {
  const logger: Partial<Logger> = { context };

  for (const level of levels) {
    (logger as any)[level] = (msg: string, meta?: Record<string, unknown>) => emit(level, msg, context, meta);
  }

  logger.child = (ctx: LogContext) => createLogger({ ...context, ...ctx });

  return logger as Logger;
}

export const logger = createLogger();
