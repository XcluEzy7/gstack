
## 2026-03-26 — OpenCode Host Capability Contract

### What was done
Extended `scripts/resolvers/types.ts` to add `'opencode'` as a third explicit host with:
- **Host type union**: Now `'claude' | 'codex' | 'opencode'`
- **HOST_PATHS entry**: Global (`~/.config/opencode/skills/gstack`) and local (`.opencode/skills/gstack`) paths
- **DiscoveryContract interface**: Documents precedence rules for preventing duplicate skill loading when both `.agents/skills` and `.opencode/skills` exist
- **OPENCODE_DISCOVERY_CONTRACT**: Default contract with `local-before-global` precedence, `first-wins` dedupe strategy

### Key patterns
- **Unified types**: Removed duplicated `HostPaths`, `HOST_PATHS`, `TemplateContext` from `gen-skill-docs.ts` (lines 37-65) — now imports from `types.ts`
- **Host detection updated**: `gen-skill-docs.ts` now recognizes `--host=opencode` flag
- **Discovery semantics**: Local skills override global skills; duplicates silently skipped

### Files modified
- `scripts/resolvers/types.ts` — Added `opencode` host, `DiscoveryContract` interface, `OPENCODE_DISCOVERY_CONTRACT` constant
- `scripts/gen-skill-docs.ts` — Removed duplicated interfaces, added `opencode` to host detection

### Verification
- `bun run gen:skill-docs` passes for both `claude` and `codex` hosts
- TypeScript compiles without errors
- Build succeeds: all 28 skills generated for both hosts
