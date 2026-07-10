/**
 * Unreal Engine Remote Control API client (OVERDARE Studio exposes it on
 * 127.0.0.1:30010, no auth). This is the low-level Unreal layer: call any
 * UFunction, read/write any property, describe objects, search assets.
 *
 * Docs surface (from GET /remote/info):
 *   PUT /remote/object/call      {objectPath, functionName, parameters, generateTransaction}
 *   PUT /remote/object/property  {objectPath, propertyName, access, propertyValue?}
 *   PUT /remote/object/describe  {objectPath}
 *   PUT /remote/search/assets    {Query, Filter:{ClassNames,PackagePaths,RecursivePaths}, Limit}
 *   PUT /remote/batch            {Requests:[...]}
 */

export interface RcConfig {
  host: string;
  port: number;
  timeoutMs: number;
}

export function loadRcConfig(): RcConfig {
  return {
    host: process.env.UE_RC_HOST ?? "127.0.0.1",
    port: Number(process.env.UE_RC_PORT ?? 30010),
    timeoutMs: Number(process.env.UE_RC_TIMEOUT_MS ?? 15000),
  };
}

export class RemoteControlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RemoteControlError";
  }
}

export class RemoteControlClient {
  private readonly base: string;
  constructor(private readonly config: RcConfig = loadRcConfig()) {
    const host = config.host === "localhost" ? "127.0.0.1" : config.host;
    this.base = `http://${host}:${config.port}`;
  }

  get endpoint(): string {
    return this.base;
  }

  private async req<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    let res: Response;
    try {
      res = await fetch(this.base + path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      const reason =
        (err as Error)?.name === "AbortError"
          ? `timed out after ${this.config.timeoutMs}ms`
          : `cannot reach UE Remote Control at ${this.base}`;
      throw new RemoteControlError(`${method} ${path} failed: ${reason}. Is OVERDARE Studio running?`);
    } finally {
      clearTimeout(timer);
    }
    const text = await res.text();
    if (!res.ok) {
      throw new RemoteControlError(`${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 500)}`);
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  info() {
    return this.req("GET", "/remote/info");
  }

  searchAssets(opts: {
    query?: string;
    classNames?: string[];
    packagePaths?: string[];
    recursive?: boolean;
    limit?: number;
  }) {
    const Filter: Record<string, unknown> = {};
    if (opts.classNames) Filter.ClassNames = opts.classNames;
    if (opts.packagePaths) Filter.PackagePaths = opts.packagePaths;
    if (opts.recursive !== undefined) Filter.RecursivePaths = opts.recursive;
    return this.req("PUT", "/remote/search/assets", {
      Query: opts.query ?? "",
      Filter: Object.keys(Filter).length ? Filter : undefined,
      Limit: opts.limit ?? 25,
    });
  }

  call(objectPath: string, functionName: string, parameters: Record<string, unknown> = {}, generateTransaction = true) {
    return this.req("PUT", "/remote/object/call", {
      objectPath,
      functionName,
      parameters,
      generateTransaction,
    });
  }

  getProperty(objectPath: string, propertyName: string) {
    return this.req("PUT", "/remote/object/property", {
      objectPath,
      propertyName,
      access: "READ_ACCESS",
    });
  }

  setProperty(objectPath: string, propertyName: string, propertyValue: unknown) {
    return this.req("PUT", "/remote/object/property", {
      objectPath,
      propertyName,
      access: "WRITE_TRANSACTION_ACCESS",
      propertyValue: { [propertyName]: propertyValue },
    });
  }

  describe(objectPath: string) {
    return this.req("PUT", "/remote/object/describe", { objectPath });
  }

  batch(requests: Array<{ RequestId?: number; URL: string; Verb: string; Body?: unknown }>) {
    return this.req("PUT", "/remote/batch", { Requests: requests });
  }
}
