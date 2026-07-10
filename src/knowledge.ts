/**
 * Knowledge / recipes — battle-tested OVERDARE build playbooks adapted from the
 * built-in agent's skills (UI templates, TPA combat, action sequences, Luau
 * gotchas, publishing). Exposed two ways so the model reliably finds them:
 *   - MCP resources:  overdare://knowledge/<topic>   (pulled on demand)
 *   - tool overdare_recipe(topic?)                    (index, or one recipe)
 *
 * The markdown lives in ../knowledge (a sibling of dist/ and src/), read at
 * runtime — no build copy needed.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface Recipe {
  topic: string;
  title: string;
  file: string;
  summary: string;
}

// Topic ids (tuple = source of truth for the overdare_recipe enum).
const TOPICS = [
  "overview",
  "luau-gotchas",
  "ui-recipes",
  "ui-templates",
  "combat-tpa",
  "actionsequence",
  "publish",
  "blender-bridge",
] as const;

export const RECIPES: Recipe[] = [
  {
    topic: "overview",
    title: "OVERDARE build playbook (overview)",
    file: "overdare-overview.md",
    summary:
      "Golden path; the two ways to add content (import pro assets vs build); hard constraints; debug discipline. Read this first.",
  },
  {
    topic: "luau-gotchas",
    title: "Luau / API gotchas (OVERDARE != Roblox)",
    file: "luau-gotchas.md",
    summary:
      "API diffs (no Font/MouseButton1Click; BorderPixelSize), Play.log debugging, the two Studio-hang dangers, server-side Humanoid.",
  },
  {
    topic: "ui-recipes",
    title: "UI recipes (hand-built, non-template)",
    file: "ui-recipes.md",
    summary:
      "Bespoke mobile UI: safe areas, UDim2 Position/Size rules, ZIndex bands, text sizes, naming, Activated wiring, world-space GUI.",
  },
  {
    topic: "ui-templates",
    title: "Official UI templates (import by id)",
    file: "ui-templates.md",
    summary:
      "12 pro UI screens (HUD/popup/loading/leaderboard/boss/result) with asset ids; which to pick; import -> move -> rename -> wire.",
  },
  {
    topic: "combat-tpa",
    title: "PvP combat via the TPA template",
    file: "combat-tpa.md",
    summary:
      "Install a full PvP combat game by id; layer architecture; the 4 data files + plugin-only extension rule.",
  },
  {
    topic: "actionsequence",
    title: "Action Sequences (attacks/combos/skills)",
    file: "actionsequence.md",
    summary:
      "Track types, naming (Sequence/KeyInput/CancelWindow/HitTrigger/ActiveTrigger), combo modes, authoring quick reference.",
  },
  {
    topic: "publish",
    title: "Publishing a world",
    file: "publish.md",
    summary:
      "Backend-exists decision, metadata params (worldName/description/category/keyword), description URL-encoding, -32009=canceled.",
  },
  {
    topic: "blender-bridge",
    title: "Blender <-> OVERDARE bridge (cross-MCP)",
    file: "blender-bridge.md",
    summary:
      "Use the connected Blender MCP as a content factory: image/texture/decal/UI bridge (works), reference-rebuild workflow, and the mesh-import limit. Honest about what can/can't transfer.",
  },
];

let dirCache: string | null = null;
export function knowledgeDir(): string {
  if (!dirCache) dirCache = fileURLToPath(new URL("../knowledge/", import.meta.url));
  return dirCache;
}

export function readRecipe(topic: string): string | null {
  const r = RECIPES.find((x) => x.topic === topic);
  if (!r) return null;
  try {
    return readFileSync(join(knowledgeDir(), r.file), "utf8");
  } catch {
    return null;
  }
}

export function registerKnowledge(server: McpServer): void {
  for (const r of RECIPES) {
    server.registerResource(
      r.topic,
      `overdare://knowledge/${r.topic}`,
      { title: r.title, description: r.summary, mimeType: "text/markdown" },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: readRecipe(r.topic) ?? `Recipe "${r.topic}" not found on disk.`,
          },
        ],
      }),
    );
  }

  server.registerTool(
    "overdare_recipe",
    {
      description:
        "Read a battle-tested OVERDARE build recipe (adapted from the built-in agent's skills). Omit `topic` to list all recipes; pass one to read it. Consult BEFORE building UI, combat, or publishing. Topics: " +
        TOPICS.join(", ") +
        ".",
      inputSchema: {
        topic: z.enum(TOPICS).optional().describe("Recipe topic; omit to list all."),
      },
    },
    async (args: Record<string, unknown>) => {
      const topic = args.topic as string | undefined;
      if (!topic) {
        const text = JSON.stringify(
          RECIPES.map((r) => ({ topic: r.topic, title: r.title, summary: r.summary })),
          null,
          2,
        );
        return { content: [{ type: "text" as const, text }] };
      }
      const text = readRecipe(topic) ?? `Unknown recipe topic "${topic}".`;
      return { content: [{ type: "text" as const, text }] };
    },
  );
}
