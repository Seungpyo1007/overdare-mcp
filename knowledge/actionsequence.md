# Action Sequences (attacks, combos, skills)

Adapted from the diligent `actionsequence` skill. **Action Sequence** = the asset/system; **Action Sequencer** = the editor. Used for attack/skill timing: animation + collision (hit) + trigger/event tracks. Pairs with `combat-tpa`.

> Tooling note: there is a real RPC `action_sequencer_service.apply_json` for applying sequence JSON, but this MCP does not wrap it yet. For now, author sequences in Studio's Action Sequencer editor, or apply JSON via `overdare_rpc { method: "action_sequencer_service.apply_json", params: {...} }` (experimental — confirm the param shape first). This recipe gives you the structure to design them.

## Lifecycle

`ActionRunner:Play(sequencerId)` → the asset is cloned under the character's Humanoid → ServerRuntime/ClientRuntime execute → the clone is destroyed on sequence end (child event connections auto-disconnect). Objects cloned elsewhere (ground AoE zones, etc.) must be managed via `PersistentEffectManager`.

## Track types

- **Clip-based (start~end range):** Animation, Sound, CameraShake, Trigger Track.
- **Key-based (single point):** Control, Collision, Event, Camera FOV, Camera Zoom.
- **CollisionTrack** detects hit targets by area overlap; the callback fires once **per target** (not as an array).
- **TriggerTrack** is "apply → restore" pairs. On sequence replacement, the previous sequence's End fires before the new one's Start.

## Track naming (auto-recognized by SequencerController.Bind)

Present = bound, absent = skipped.

TriggerTrack:
- `Sequence` (**required**) — sequence lifetime. Start = movement lock, End = unlock + FSM Idle.
- `KeyInput` (combo only) — combo input accept window. Start = ready, End = clear.
- `CancelWindow` (optional) — combo instant-transition + general cancel; place at the sequence **tail**.

CollisionTrack: `HitTrigger` / `HitTrigger{N}` — area hit detection (customizable via SkillDB `HitTriggers`).

EventTrack (markers): `ActiveTrigger` / `ActiveTrigger{1..10}` — custom callback (SkillDB `ActiveHandler` or `options.OnActiveTrigger`).

## CancelWindow & combos

Place `CancelWindow` at the tail to handle combo instant-transition **and** general cancel with one track:
- buffered same-slot input → advance to next combo step immediately;
- not a combo → cancelable ON, another slot's input can cancel the current sequence;
- range ends → cancelable OFF.

Combo modes: **A** (default) — wait for `Sequence` End, then if buffered advance. **B** — `CancelWindow` Start, then if buffered replace immediately (also add a `KeyInput` track). Combos apply to ANY slot defined as a **table** in WeaponDB.

## Authoring quick reference

| Goal | Required tracks | Notes |
|---|---|---|
| Basic attack | Sequence + Animation + HitTrigger | CollisionTrack for hits |
| Combo attack | + KeyInput | slot defined as a table in WeaponDB |
| Smooth combo | + CancelWindow (tail) | |
| Hold skill (guard) | Sequence + Animation | SkillDB InputType=Hold |
| Dash | Sequence + Animation | SkillDB ClientDash config |
| Multi-hit | Sequence + Animation + HitTrigger1..N | multiple CollisionTracks |
| Custom action | + ActiveTrigger EventTrack | SkillDB ActiveHandler or callback |

## Naming rules

Sequence names are **unique** within the project; multiple characters may share one. **Sequence name = SkillDB key = WeaponDB slot value.** ServerRuntime standard = `SequencerController.Bind(script)`; ClientRuntime = `ClientBridge.Bind(script)`.
