/**
 * Client for OVERDARE Studio's local RPC server.
 *
 * Transport (reverse-engineered from the OVERDARE AI agent / diligent runtime,
 * file apps/overdare-ai-agent/sidecar/src/tools/studiorpc): a plain TCP socket
 * speaking newline-delimited JSON-RPC 2.0.
 *
 *   Connect : net.createConnection(host, port)   default 127.0.0.1:13377
 *   Send    : JSON.stringify({ jsonrpc:"2.0", id, method, params }) + "\n"
 *   Receive : one line of JSON -> { result } | { error: { code, message } }
 *
 * The agent opens a fresh connection per call (one request, one line back),
 * so we do the same — simple and matches the server's expectations.
 */

import net from "node:net";
import readline from "node:readline";

export interface RpcConfig {
  host: string;
  port: number;
  timeoutMs: number;
}

export function loadRpcConfig(): RpcConfig {
  // The agent resolves these via STUDIO_HOST / STUDIO_PORT (STUDIO_RPC_* are
  // accepted as fallbacks for convenience).
  const host =
    process.env.STUDIO_HOST ?? process.env.STUDIO_RPC_HOST ?? "localhost";
  const port = Number(
    process.env.STUDIO_PORT ?? process.env.STUDIO_RPC_PORT ?? 13377,
  );
  const timeoutMs = Number(process.env.STUDIO_RPC_TIMEOUT_MS ?? 10000);
  return { host, port, timeoutMs };
}

export class StudioRpcError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "StudioRpcError";
  }
}

interface JsonRpcResponse<T> {
  jsonrpc?: string;
  id?: number;
  result?: T;
  error?: { code?: number; message?: string };
}

export class StudioRpcClient {
  private id = 0;
  private readonly host: string;
  private readonly port: number;

  constructor(private readonly config: RpcConfig = loadRpcConfig()) {
    // localhost can resolve to ::1 first; the server binds IPv4, so pin it.
    this.host = config.host === "localhost" ? "127.0.0.1" : config.host;
    this.port = config.port;
  }

  get endpoint(): string {
    return `tcp://${this.host}:${this.port} (newline JSON-RPC 2.0)`;
  }

  /**
   * Call a Studio RPC method (e.g. "level.browse", "instance.upsert").
   * Resolves with the `result` field, or throws StudioRpcError.
   */
  call<T = unknown>(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const id = ++this.id;
    const request: Record<string, unknown> = { jsonrpc: "2.0", id, method };
    if (Object.keys(params).length > 0) request.params = params;

    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      const socket = net.createConnection({ host: this.host, port: this.port }, () => {
        socket.write(`${JSON.stringify(request)}\n`);
      });

      const rl = readline.createInterface({ input: socket });

      const cleanup = () => {
        clearTimeout(timer);
        rl.close();
        socket.destroy();
      };

      const timer = setTimeout(() => {
        settle(() => {
          cleanup();
          reject(
            new StudioRpcError(
              `RPC "${method}" timed out after ${this.config.timeoutMs}ms.`,
            ),
          );
        });
      }, this.config.timeoutMs);

      rl.once("line", (line: string) => {
        settle(() => {
          cleanup();
          let res: JsonRpcResponse<T>;
          try {
            res = JSON.parse(line);
          } catch {
            return reject(
              new StudioRpcError(
                `Failed to parse Studio RPC response: ${line.slice(0, 200)}`,
              ),
            );
          }
          if (res.error) {
            return reject(
              new StudioRpcError(
                `RPC "${method}" error [${res.error.code ?? "?"}]: ${
                  res.error.message ?? "unknown"
                }`,
                res.error.code,
              ),
            );
          }
          resolve(res.result as T);
        });
      });

      const onError = (err: unknown) => {
        settle(() => {
          cleanup();
          reject(
            new StudioRpcError(
              `Cannot reach Studio at ${this.host}:${this.port}. Is OVERDARE Studio running with a project open? (${(err as Error)?.message ?? String(err)})`,
              undefined,
              err,
            ),
          );
        });
      };
      // Handle errors from BOTH the socket and the readline interface. Without
      // the rl handler, a connection-refused error (Studio down) re-emits as an
      // unhandled 'error' on the Interface and crashes the whole process.
      socket.on("error", onError);
      rl.on("error", onError);
    });
  }

  /** Lightweight reachability check. */
  async ping(): Promise<boolean> {
    try {
      await this.call("level.browse", {});
      return true;
    } catch {
      return false;
    }
  }
}
