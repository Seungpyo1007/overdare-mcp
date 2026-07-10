#!/usr/bin/env node
/**
 * Overdare CLI — talk to OVERDARE Studio straight from the terminal.
 *
 *   overdare                       # interactive prompt (REPL)
 *   overdare browse Workspace      # one-shot command
 *   overdare rpc instance.read '{"path":"Workspace.Baseplate"}'
 *
 * Studio must be running with a project open.
 */

import readline from "node:readline";
import { StudioRpcClient } from "./rpcClient.js";

const client = new StudioRpcClient();

const HELP = `
Overdare CLI — commands:
  browse [path] [depth]        Browse the DataModel tree (default: root, depth 2)
  delete <guid> [guid...]      Delete instance(s) by GUID
  script-add <Class> <parentGuid> <name> [source]
                               Create a Luau script (Class = Script|LocalScript|ModuleScript)
                               e.g. script-add Script <ssGuid> Main "print('hi')"
  save                         Save the project
  publish                      Publish to the OVERDARE Hub
  play / stop / shot           Start / stop playtest, screenshot
  rpc <method> [jsonParams]    Call any RPC method directly (escape hatch)
  ping                         Check if Studio is reachable
  help                         Show this
  exit                         Quit (REPL only)

  Note: get GUIDs from 'browse'. On this Studio build instance.read/upsert/move
  and script.read/edit/grep are not exposed by the server (use 'rpc' to probe).
`.trim();

function print(data: unknown) {
  if (typeof data === "string") console.log(data);
  else console.log(JSON.stringify(data, null, 2));
}

/** Parse a single command line into [cmd, ...args], respecting quotes/JSON. */
function tokenize(line: string): string[] {
  const out: string[] = [];
  let buf = "";
  let depth = 0;
  let quote = "";
  for (const ch of line.trim()) {
    if (quote) {
      buf += ch;
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") {
      buf += ch;
      quote = ch;
    } else if (ch === "{" || ch === "[") {
      depth++;
      buf += ch;
    } else if (ch === "}" || ch === "]") {
      depth--;
      buf += ch;
    } else if (ch === " " && depth === 0) {
      if (buf) out.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf) out.push(buf);
  return out;
}

const tryJson = (s?: string): unknown =>
  s == null ? undefined : (() => { try { return JSON.parse(s); } catch { return s; } })();

async function run(cmd: string, args: string[]): Promise<void> {
  switch (cmd) {
    case "browse": {
      const path = args[0];
      const depth = args[1] != null ? Number(args[1]) : 2;
      print(await client.call("level.browse", { path, depth }));
      break;
    }
    case "read":
      print(await client.call("instance.read", { path: args[0] }));
      break;
    case "create": {
      const [className, parent, name, propsJson] = args;
      print(
        await client.call("instance.upsert", {
          className,
          parent,
          name,
          properties: tryJson(propsJson),
        }),
      );
      break;
    }
    case "delete":
      // Verified schema: instance.delete { items: [ { targetGuid } ] }
      print(
        await client.call("instance.delete", {
          items: args.map((targetGuid) => ({ targetGuid })),
        }),
      );
      break;
    case "move":
      print(await client.call("instance.move", { guid: args[0], parentGuid: args[1] }));
      break;
    case "script-read":
      print(await client.call("script.read", { targetGuid: args[0] }));
      break;
    case "script-add": {
      // Verified schema: script.add { class, parentGuid, name, source }
      const [cls, parentGuid, name, source] = args;
      print(
        await client.call("script.add", {
          class: cls,
          parentGuid,
          name,
          source: source ?? "",
        }),
      );
      break;
    }
    case "script-edit":
      print(await client.call("script.edit", { path: args[0], source: args[1] }));
      break;
    case "grep":
      print(await client.call("script.grep", { pattern: args[0] }));
      break;
    case "save":
      print(await client.call("level.save.file", {}));
      break;
    case "publish":
      print(await client.call("level.publish", {}));
      break;
    case "play":
      print(await client.call("game.play", {}));
      break;
    case "stop":
      print(await client.call("game.stop", {}));
      break;
    case "shot":
    case "screenshot":
      print(await client.call("game.screenshot", {}));
      break;
    case "rpc":
      print(await client.call(args[0], (tryJson(args[1]) as Record<string, unknown>) ?? {}));
      break;
    case "ping":
      print((await client.ping()) ? "Studio reachable ✅" : "Studio NOT reachable ❌");
      break;
    case "help":
    case "?":
      print(HELP);
      break;
    default:
      print(`Unknown command: ${cmd}\n\n${HELP}`);
  }
}

async function repl() {
  console.log(`Overdare CLI  ->  ${client.endpoint}`);
  const reachable = await client.ping();
  console.log(
    reachable
      ? "Connected to OVERDARE Studio ✅  (type 'help')"
      : "Studio not reachable yet ❌  — open OVERDARE Studio, then 'ping'. (type 'help')",
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const prompt = () => process.stdout.write("overdare> ");
  prompt();

  // Buffer lines and drain them through a single async worker. This survives
  // piped input (where EOF fires 'close' before async commands finish) and
  // interactive typing alike — we only exit once the queue is drained.
  const pending: string[] = [];
  let inputClosed = false;
  let working = false;

  const finish = () => {
    console.log("bye 👋");
    process.exit(0);
  };

  const drain = async () => {
    if (working) return;
    working = true;
    while (pending.length > 0) {
      const tokens = tokenize(pending.shift() as string);
      const cmd = tokens.shift();
      if (!cmd) continue;
      if (cmd === "exit" || cmd === "quit") return finish();
      try {
        await run(cmd, tokens);
      } catch (err) {
        console.error((err as Error).message);
      }
      prompt();
    }
    working = false;
    if (inputClosed) finish();
  };

  rl.on("line", (line) => {
    pending.push(line);
    void drain();
  });
  rl.on("close", () => {
    inputClosed = true;
    void drain();
  });
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    await repl();
    return;
  }
  // One-shot mode: re-tokenize so quoted JSON survives shell splitting too.
  const cmd = argv[0];
  const rest = argv.slice(1);
  try {
    await run(cmd, rest);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}

main();
