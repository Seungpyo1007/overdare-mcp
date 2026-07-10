/**
 * Curated OVERDARE Asset Drawer catalog.
 *
 * Importing an asset by id (asset_drawer.import) is how the built-in agent
 * pulls in professionally-made content — full UI screens, a combat template,
 * etc. — instead of hand-building primitives. But a WRONG id permanently HANGS
 * Studio (the user must press Stop). So we ship a curated, verified catalog and
 * make the model pick from it via overdare_assets, never guessing an id.
 *
 * Ids harvested from the diligent skill docs:
 *   C:\Users\29\.overdare\skills\overdare-ui-templates\SKILL.md   (12 UI templates)
 *   C:\Users\29\.overdare\skills\tpa\SKILL.md                      (PvP combat template)
 * assetType is always "MODEL" (the only type asset_drawer.import accepts).
 */

export interface AssetEntry {
  /** Asset Drawer id, form "ovdrassetid://NUMBER". */
  id: string;
  /** Name passed to asset_drawer.import as assetName (also the inserted node's name). */
  name: string;
  type: "MODEL";
  category: "ui" | "combat" | "world";
  description: string;
  /** Placement / wiring hints harvested from the skill docs. */
  notes?: string;
}

export const ASSET_CATALOG: AssetEntry[] = [
  // ---- Official UI templates (overdare-ui-templates) ----------------------
  {
    id: "ovdrassetid://32883100",
    name: "IngameHUD",
    type: "MODEL",
    category: "ui",
    description: "In-game HUD: HP bar, currency, action buttons, menu button.",
    notes: "Move under StarterGui after import. Mobile-first (1386x640); leave safe areas (top-left menu, bottom-left joystick, bottom-right jump).",
  },
  {
    id: "ovdrassetid://32884100",
    name: "PopupGui",
    type: "MODEL",
    category: "ui",
    description: "Generic text popup / modal dialog.",
    notes: "Move under StarterGui. Drive Visible from a LocalScript.",
  },
  {
    id: "ovdrassetid://32883200",
    name: "IconPopupGui",
    type: "MODEL",
    category: "ui",
    description: "Icon + text confirmation popup.",
    notes: "Move under StarterGui.",
  },
  {
    id: "ovdrassetid://32911200",
    name: "LoadingScreenGui",
    type: "MODEL",
    category: "ui",
    description: "Loading / splash screen with progress.",
    notes: "Move under StarterGui; hide when the game is ready.",
  },
  {
    id: "ovdrassetid://32912100",
    name: "LeaderboardHUD",
    type: "MODEL",
    category: "ui",
    description: "Leaderboard / scoreboard panel.",
    notes: "Move under StarterGui; populate rows from a script.",
  },
  {
    id: "ovdrassetid://32913100",
    name: "BossHPHUD",
    type: "MODEL",
    category: "ui",
    description: "Boss health bar HUD (top of screen).",
    notes: "Move under StarterGui; bind the bar to a boss NumberValue/Humanoid.",
  },
  {
    id: "ovdrassetid://32914100",
    name: "CharacterSelectGui",
    type: "MODEL",
    category: "ui",
    description: "Character select screen.",
    notes: "Move under StarterGui; pairs well with the TPA combat template.",
  },
  {
    id: "ovdrassetid://32915100",
    name: "GameOverGui",
    type: "MODEL",
    category: "ui",
    description: "Game over screen.",
    notes: "Move under StarterGui; show on death/fail.",
  },
  {
    id: "ovdrassetid://32912200",
    name: "GameDefeatGui",
    type: "MODEL",
    category: "ui",
    description: "Defeat result screen.",
    notes: "Move under StarterGui.",
  },
  {
    id: "ovdrassetid://32916100",
    name: "GameVictoryGui",
    type: "MODEL",
    category: "ui",
    description: "Victory result screen.",
    notes: "Move under StarterGui.",
  },
  {
    id: "ovdrassetid://32916200",
    name: "GameScoreResultGui",
    type: "MODEL",
    category: "ui",
    description: "Score result screen.",
    notes: "Move under StarterGui.",
  },
  {
    id: "ovdrassetid://32917100",
    name: "GameRankResultGui",
    type: "MODEL",
    category: "ui",
    description: "Rank result screen.",
    notes: "Move under StarterGui.",
  },

  // ---- Combat template (tpa) ---------------------------------------------
  {
    id: "ovdrassetid://28928100",
    name: "TPA_Test0403",
    type: "MODEL",
    category: "combat",
    description:
      "Third-Person Action (PvP combat) template: characters, skills, weapons, FSM, slot/sequence system. A whole playable combat game in one import.",
    notes:
      "Big import — STOP playtest first. Extend by editing only the 4 DB ModuleScripts (SkillDB/CharDB/WeaponDB/AssetDB) and the plugin handlers; see the combat-tpa recipe.",
  },
];

/** Strict id check — a bad id HANGS Studio, so callers must validate first. */
export const isOvdrAssetId = (s: string): boolean => /^ovdrassetid:\/\/\d+$/.test(s);

/** Look up a catalog entry by id ("ovdrassetid://N" or bare "N") or by name (case-insensitive). */
export function findAsset(idOrName: string): AssetEntry | undefined {
  const q = idOrName.trim();
  const asId = isOvdrAssetId(q) ? q : /^\d+$/.test(q) ? `ovdrassetid://${q}` : null;
  if (asId) return ASSET_CATALOG.find((a) => a.id === asId);
  const lower = q.toLowerCase();
  return ASSET_CATALOG.find((a) => a.name.toLowerCase() === lower);
}
