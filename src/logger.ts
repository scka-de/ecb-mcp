/**
 * stderr-only logger.
 *
 * MCP stdio servers communicate via stdout (JSON-RPC).
 * Any console.log() corrupts the protocol. All logging
 * goes to stderr so it never interferes with MCP messages.
 *
 * biome.json has noConsole: "error" to enforce this.
 */

function write(level: string, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const line = data
    ? `[${timestamp}] ${level}: ${message} ${JSON.stringify(data)}`
    : `[${timestamp}] ${level}: ${message}`;
  process.stderr.write(`${line}\n`);
}

export const logger = {
  info: (message: string, data?: unknown) => write("INFO", message, data),
  warn: (message: string, data?: unknown) => write("WARN", message, data),
  error: (message: string, data?: unknown) => write("ERROR", message, data),
  debug: (message: string, data?: unknown) => {
    if (process.env.DEBUG) {
      write("DEBUG", message, data);
    }
  },
};
