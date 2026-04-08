export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

const isProd = process.env.NODE_ENV === "production";

type Level = "info" | "warn" | "error" | "debug";

function emit(level: Level, name: string, message: string, context?: Record<string, unknown>): void {
  const line = isProd
    ? JSON.stringify({
        ts: new Date().toISOString(),
        level,
        name,
        msg: message,
        ...(context ?? {}),
      })
    : `[${level.toUpperCase()}][${name}] ${message}${
        context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : ""
      }`;
  if (level === "error") console.error(line);
  else console.warn(line);
}

export function createLogger(name: string): Logger {
  return {
    info: (m, c) => emit("info", name, m, c),
    warn: (m, c) => emit("warn", name, m, c),
    error: (m, c) => emit("error", name, m, c),
    debug: (m, c) => emit("debug", name, m, c),
  };
}
