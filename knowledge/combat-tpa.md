# PvP combat via the TPA template

Adapted from the diligent `tpa` skill. TPA = **Third-Person Action**: a full PvP combat game (characters, skills, weapons, FSM, slot/sequence/combo system, game UI, input handling, server-client comms) you get in ONE import. Use it only for **PvP action** requests.

## Install

1. `overdare_stop` (big import — never during play).
2. `overdare_asset_import { assetId: "ovdrassetid://28928100", confirmStopped: true }` (name TPA_Test0403).
3. `overdare_browse` to see what landed and where; `overdare_save`.

## Architecture (top→bottom dependency)

```
DATA         SkillDB · CharDB · WeaponDB · AssetDB · Enums
MODEL        CharacterModel · CombatModel · ResourceModel · StatusEffectModel · FSM
CONTROLLER   ServerController · SequencerController · SlotManager · PersistentEffectManager
VIEW         MovementView · CombatView · ButtonLayout · BtnController · CharSelectView · CharacterHpBar · LoadingScreen
PLUGIN       SlotDef/ · SequenceHandler/Hit/ · SequenceHandler/Active/ · StateBehavior/
RUNTIME      ServerRuntime · ClientRuntime (1-line wrappers)
```

## Key paths (browse to confirm in your project)

- `ReplicatedStorage/Data/` — SkillDB, CharDB, WeaponDB, AssetDB, Enums
- `ReplicatedStorage/Module/Util/` — ConfigUtil, SlotUtil, AssetLoaderUtil, ClientBridge
- `ReplicatedStorage/Module/View/` — ButtonLayout, BtnController, FeedbackView, HpBarView, CharSelectView
- `StarterGui/LoadingScreen/`
- `ServerStorage/Module/Model/` — CharacterModel, CombatModel, ResourceModel, StateMachine
- `ServerStorage/Module/Controller/` — ServerController, SequencerController, SlotManager, PersistentEffectManager
- `ServerStorage/Module/SlotDef/` — Attack, Guard, Skill, Dash, SpecialSkill
- `ServerStorage/Module/SequenceHandler/Hit/` (DefaultHit), `.../Active/` (e.g. IceAoE)

## The golden rules

1. **4 data files control all balance & visuals**: SkillDB, CharDB, WeaponDB, AssetDB. Tuning a game = editing these.
2. **Content extension (add a skill/character/weapon) = data + plugin files only. Zero core modification.**
3. Every ServerRuntime is `SequencerController.Bind(script)` (1 line) — it auto-resolves the sequence name to WeaponDB/SkillDB and binds Movement/Hit/Combo/CancelWindow/Hold/SequenceEnd/ActiveTrigger.
4. New *systems* (NPC AI, party, inventory) may need structural changes to Model/Controller layers.

## Working principle

Prefer calling/integrating existing modules; implement from scratch only what they can't do. Plugin extension: similar purpose & unused → modify it; different purpose or in use → add a new file in the same folder.

Because script **edit/read** RPC is absent on this build, modify a TPA ModuleScript by recreating it: read the current source (browse/open in Studio or ask the user), then `overdare_delete_instance` the old ModuleScript and `overdare_script_add` the new version under the same parent with the same name. Always stop → edit → save → play → read Play.log.

To add the matching combat UI (character select, HP bars, result screens), import the UI templates — see `ui-templates`. For attack/combo timing assets, see `actionsequence`.
