# OpenCode First-Class Host Port for gstack

## TL;DR
> **Summary**: Add OpenCode as a first-class host in this dual-host repo by extending the existing host-adapter architecture at the generator, installer, runtime, and test layers, while keeping a single shared skill template source.
> **Deliverables**:
> - OpenCode host contract and generation/install pipeline
> - OpenCode-compatible skills/commands/sidecar assets with explicit parity rules
> - Narrow plugin layer for OpenCode-only runtime hooks
> - Test coverage proving discovery, setup, and safety behavior
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: 1 → 2 → 3 → 7 → 10

## Context
### Original Request
Port this repo one-to-one into an OpenCode-compatible version, research OpenCode thoroughly, and ensure the migrated workflow is fully compatible with OpenCode as a plugin.

### Interview Summary
- The session must produce a full migration plan, not only a gap analysis.
- When CloudCode behavior does not map directly, prefer **native OpenCode adaptation** over strict emulation.
- Keep this as a **dual-host repo** rather than replacing the current host packaging in place.

### Metis Review (gaps addressed)
- Added guardrails to avoid hand-editing generated skills or forking the template tree.
- Added explicit parity classification so “first-class OpenCode” is not claimed before degraded workflows are documented.
- Added rollout sequencing that separates baseline OpenCode parity from plugin-enforced safety parity.

## Work Objectives
### Core Objective
Add OpenCode as a first-class supported host for gstack using the repo’s existing generator/setup architecture, preserving the workflow catalog while adapting host-specific behavior to native OpenCode primitives.

### Deliverables
- Host capability contract covering Claude, Codex, and OpenCode
- `--host opencode` generator and setup flow
- OpenCode skill/command/plugin sidecar layout with explicit precedence rules
- Runtime path/config abstractions that remove Claude-only assumptions from shared host logic
- Workflow parity matrix for all skills and helper tools
- Automated tests and smoke verifications for OpenCode discovery/setup/safety
- Updated docs for install, usage, and known parity limits

### Definition of Done (verifiable conditions with commands)
- `bun run gen:skill-docs --host opencode` completes successfully and emits the expected OpenCode artifacts.
- `bun test` passes with OpenCode host coverage added.
- Running the setup flow for OpenCode creates exactly one active discovery path per install mode with no duplicate skill loading.
- Safety workflows (`careful`, `freeze`, `guard`) have explicit OpenCode behavior: plugin-enforced where available, advisory fallback where not.
- Documentation explains OpenCode install, discovery roots, plugin requirements, and parity/degradation boundaries.

### Must Have
- One shared `.tmpl` source of truth
- Explicit host capability contract with no implicit defaults
- Project-local OpenCode precedence strategy
- Plugin scope limited to runtime hooks/tool interception/auth/env behavior
- Workflow parity matrix for all user-facing skills
- Tests for path leakage and duplicate-discovery regressions

### Must NOT Have
- No hand-edited generated `SKILL.md` files
- No separate forked skill tree for OpenCode unless the plan explicitly marks a sidecar asset as OpenCode-only
- No workflow logic moved into plugins when commands/skills/agents can express it
- No “first-class OpenCode” claim before both baseline parity and safety parity gates pass
- No install mode that leaves both `.agents/skills` and `.opencode/skills` active without defined precedence

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after + existing Bun test suite
- QA policy: Every task includes repository-command scenarios plus explicit failure-path checks
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: host contract, generator abstraction, install layout, runtime abstraction, parity inventory

Wave 2: OpenCode sidecar assets, docs/config migration, browse/helper binary compatibility, safety plugin

Wave 3: end-to-end host tests and rollout gating

### Dependency Matrix (full, all tasks)
| Task | Depends On |
|---|---|
| 1 | — |
| 2 | 1 |
| 3 | 1, 2 |
| 4 | 1 |
| 5 | 1 |
| 6 | 2, 3, 5 |
| 7 | 2, 3, 4 |
| 8 | 3, 4 |
| 9 | 3, 4 |
| 10 | 2, 3, 6, 7, 8, 9 |

### Agent Dispatch Summary
- Wave 1 → 5 tasks → unspecified-high / deep / writing mix
- Wave 2 → 4 tasks → unspecified-high / writing / deep mix
- Wave 3 → 1 task → unspecified-high

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Define the OpenCode host capability contract

  **What to do**: Add a single canonical host contract that specifies, for `claude`, `codex`, and `opencode`, the discovery roots, runtime root variables, local/global install targets, sidecar directories, allowed hook strategy, and duplicate-discovery precedence rules. Update any host typing so implementers never special-case `opencode` ad hoc.
  **Must NOT do**: Do not fork templates or scatter OpenCode constants across unrelated files. Do not infer precedence from runtime behavior; encode it explicitly.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this is the architectural source of truth for all downstream host behavior.
  - Skills: `[]` — no extra skill is required; the repo already contains the relevant host abstraction patterns.
  - Omitted: `['tdd']` — generator contract work depends more on architecture than test-first iteration.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 4, 5 | Blocked By: none

  **References**:
  - Pattern: `scripts/resolvers/types.ts:1-32` — existing host enum and path contract to extend rather than replace.
  - Pattern: `scripts/gen-skill-docs.ts:28-57` — current host parsing and duplicated host-path table that must be unified or driven by the canonical contract.
  - Pattern: `setup:23-70` — current host flag parsing and auto-detection behavior to align with the new contract.
  - Research: `.sisyphus/drafts/opencode-only-port.md:13-25` — confirmed migration scope, dual-host strategy, and OpenCode capability findings.

  **Acceptance Criteria**:
  - [ ] A single host capability definition exists and includes `opencode` with explicit local/global/discovery/runtime metadata.
  - [ ] `claude` and `codex` behavior still resolve through the same contract with no duplicated constants left behind.
  - [ ] The contract explicitly documents how duplicate discovery is prevented when multiple skill roots exist.

  **QA Scenarios**:
  ```
  Scenario: Host contract includes OpenCode and precedence rules
    Tool: Bash
    Steps: Run `bun test test/gen-skill-docs.test.ts` and a host-contract-focused test file added by the task.
    Expected: Tests pass and assert the presence of `opencode` plus explicit precedence metadata.
    Evidence: .sisyphus/evidence/task-1-host-contract.txt

  Scenario: Missing host metadata fails deterministically
    Tool: Bash
    Steps: Run the new host-contract validation test against a deliberately incomplete fixture included in the test suite.
    Expected: Test fails on incomplete `opencode` metadata before generation/setup code runs.
    Evidence: .sisyphus/evidence/task-1-host-contract-error.txt
  ```

  **Commit**: YES | Message: `feat(hosts): define opencode capability contract` | Files: `scripts/resolvers/types.ts`, `scripts/gen-skill-docs.ts`, host contract tests

- [ ] 2. Refactor generator host handling to emit OpenCode artifacts from the shared template tree

  **What to do**: Replace `host === 'codex'` style branching with contract-driven generation so `bun run gen:skill-docs --host opencode` emits the correct outputs, frontmatter transforms, path rewrites, and any OpenCode-only sidecar files required for discovery. Keep `.tmpl` as the single source of truth.
  **Must NOT do**: Do not hand-edit generated `SKILL.md` files. Do not create a parallel OpenCode template tree.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: large but bounded code changes across the generator path.
  - Skills: `[]` — existing repo patterns are sufficient.
  - Omitted: `['frontend-design']` — no UI/design work is involved.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3, 6, 7, 10 | Blocked By: 1

  **References**:
  - Pattern: `scripts/gen-skill-docs.ts:28-57` — current host detection logic and duplicated host path data.
  - Pattern: `scripts/gen-skill-docs.ts:182-221` — preamble generation currently special-cases Codex runtime roots; OpenCode handling must be added without new one-off branches proliferating.
  - Test: `test/gen-skill-docs.test.ts:161-175` — freshness test pattern for generation outputs.
  - Test: `test/gen-skill-docs.test.ts:177-195` — unresolved-placeholder and template placeholder assertions to preserve.

  **Acceptance Criteria**:
  - [ ] `bun run gen:skill-docs --host opencode` succeeds.
  - [ ] Generated OpenCode artifacts contain no unresolved placeholders and no Claude-only hardcoded runtime paths unless explicitly intended for compatibility.
  - [ ] Generator code consumes the canonical host contract instead of duplicating host metadata.

  **QA Scenarios**:
  ```
  Scenario: OpenCode generation succeeds from shared templates
    Tool: Bash
    Steps: Run `bun run gen:skill-docs --host opencode` followed by `bun test test/gen-skill-docs.test.ts`.
    Expected: Generation succeeds and tests confirm freshness, frontmatter validity, and placeholder resolution.
    Evidence: .sisyphus/evidence/task-2-generator.txt

  Scenario: Claude-only path leakage is caught
    Tool: Bash
    Steps: Run the new OpenCode generation assertions that scan emitted outputs for forbidden path patterns such as `~/.claude/skills/gstack` where OpenCode-specific roots are expected.
    Expected: Test fails on path leakage and passes after the fix.
    Evidence: .sisyphus/evidence/task-2-generator-error.txt
  ```

  **Commit**: YES | Message: `feat(generator): emit opencode skill outputs` | Files: `scripts/gen-skill-docs.ts`, resolver helpers, generator tests

- [ ] 3. Add OpenCode installation and auto-detection flows to setup

  **What to do**: Extend `setup` with `--host opencode` and `auto` support for OpenCode CLI detection, plus explicit repo-local/global install layouts and dedupe behavior. Ensure the install flow creates exactly one active discovery path per mode and does not regress Claude/Codex installs.
  **Must NOT do**: Do not rely on users manually creating symlinks without docs/tests. Do not allow `auto` to install duplicate skill roots for the same host.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: setup logic is critical and shell-heavy but bounded.
  - Skills: `[]` — no special workflow skill needed.
  - Omitted: `['tdd']` — install script changes can be validated with focused integration tests after implementation.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 6, 8, 9, 10 | Blocked By: 1, 2

  **References**:
  - Pattern: `setup:23-70` — existing host parsing and auto-detection logic.
  - Pattern: `setup:145-160` — current generated-skill regeneration path used for Codex; OpenCode should hook into the same lifecycle.
  - Pattern: `setup:198-220` — existing symlink/linking helper behavior that informs discovery/dedupe design.
  - Research: `README.md` install sections in the current repo README — current user-facing install behavior must remain valid for existing hosts while OpenCode is added.

  **Acceptance Criteria**:
  - [ ] `./setup --host opencode` is supported and documented.
  - [ ] `./setup --host auto` detects OpenCode when present and does not create duplicate active roots.
  - [ ] Repo-local and global OpenCode install modes are both explicit, tested, and deterministic.

  **QA Scenarios**:
  ```
  Scenario: OpenCode setup creates one deterministic install layout
    Tool: Bash
    Steps: Run setup integration tests covering `--host opencode` and `--host auto` with OpenCode present.
    Expected: Tests assert the expected output directories/files and confirm only one active discovery root per mode.
    Evidence: .sisyphus/evidence/task-3-setup.txt

  Scenario: Duplicate-discovery regression is blocked
    Tool: Bash
    Steps: Run the new setup fixture test where both `.agents/skills` and `.opencode/skills` are present.
    Expected: Setup/test logic either dedupes correctly or fails with a clear error, never leaving ambiguous active roots.
    Evidence: .sisyphus/evidence/task-3-setup-error.txt
  ```

  **Commit**: YES | Message: `feat(setup): support opencode install flows` | Files: `setup`, setup tests, install docs

- [ ] 4. Normalize runtime path and helper resolution for OpenCode

  **What to do**: Generalize runtime path resolution for preambles, helper binaries, analytics/state, and browse access so OpenCode can use the shared runtime contract without Claude-only env names leaking through common paths. Reuse the existing `$GSTACK_ROOT`/`$GSTACK_BIN`/`$GSTACK_BROWSE` abstraction style wherever possible.
  **Must NOT do**: Do not rename helper binaries unnecessarily. Do not duplicate the browse resolution logic per host when a host contract can drive it.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: touches shared runtime assumptions used across many generated artifacts.
  - Skills: `[]` — repo patterns are the key source of truth.
  - Omitted: `['frontend-design']` — not relevant.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 7, 8, 9, 10 | Blocked By: 1

  **References**:
  - Pattern: `scripts/gen-skill-docs.ts:182-221` — shared preamble runtime root generation.
  - Pattern: `scripts/resolvers/types.ts:10-23` — host-specific path abstraction to extend.
  - Research: Oracle recommendation in `m0024` — reuse host-adapter boundaries rather than spreading OpenCode-specific logic across skills.

  **Acceptance Criteria**:
  - [ ] Shared runtime variables resolve correctly for OpenCode without breaking Claude/Codex.
  - [ ] Browse/helper references use contract-driven paths instead of hardcoded Claude roots in shared logic.
  - [ ] State/config paths required by safety/analytics helpers are explicitly mapped for OpenCode.

  **QA Scenarios**:
  ```
  Scenario: Runtime helper resolution works for OpenCode artifacts
    Tool: Bash
    Steps: Generate OpenCode outputs, then run targeted tests that inspect emitted preambles and helper paths.
    Expected: Emitted scripts resolve helper paths through the OpenCode contract and do not rely on Claude-only globals.
    Evidence: .sisyphus/evidence/task-4-runtime.txt

  Scenario: Shared runtime path regression is caught on existing hosts
    Tool: Bash
    Steps: Run the full generation test suite for Claude/Codex plus new OpenCode coverage.
    Expected: Existing host snapshots remain valid; OpenCode additions do not break previous host outputs.
    Evidence: .sisyphus/evidence/task-4-runtime-error.txt
  ```

  **Commit**: YES | Message: `feat(runtime): abstract shared paths for opencode` | Files: generator resolvers, shared runtime helpers, tests

- [ ] 5. Build the workflow parity matrix for all skills and helper tools

  **What to do**: Inventory every user-facing skill/tool and classify OpenCode support as A (full parity), B (minor adaptation), or C (degraded/intentional gap). For every B/C item, specify the exact OpenCode-native substitute, fallback behavior, and release gate language so documentation and implementation stay aligned.
  **Must NOT do**: Do not claim parity by default. Do not leave any skill unclassified.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: this is a decision artifact and release contract as much as an implementation task.
  - Skills: `[]` — focused repo analysis is sufficient.
  - Omitted: `['deepen-plan']` — the plan already contains the needed structure.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6, 7, 9, 10 | Blocked By: 1

  **References**:
  - Pattern: `AGENTS.md` — workflow catalog and supported skills surface to classify.
  - Pattern: `README.md` sprint and power-tools tables — user-facing skill promises that parity claims must match.
  - Research: `.sisyphus/drafts/opencode-only-port.md:13-25` — confirmed migration surface and OpenCode primitive mapping.
  - Research: Oracle guidance in `m0024` — explicitly requires an A/B/C workflow parity matrix before “first-class” claims.

  **Acceptance Criteria**:
  - [ ] Every existing skill/tool is classified A/B/C for OpenCode.
  - [ ] Every B/C item includes an exact substitute/fallback and release-note language.
  - [ ] The matrix is referenced by docs/tests/release gating rather than existing as a stale standalone note.

  **QA Scenarios**:
  ```
  Scenario: Parity matrix covers the entire workflow catalog
    Tool: Bash
    Steps: Run a test or validation script that compares the matrix entries against the discovered skill/tool catalog from AGENTS.md/README metadata.
    Expected: Validation passes only if every user-facing workflow item is classified.
    Evidence: .sisyphus/evidence/task-5-parity-matrix.txt

  Scenario: Missing parity classification is rejected
    Tool: Bash
    Steps: Run the validation against a fixture with one skill intentionally omitted.
    Expected: Validation fails with the missing item identified explicitly.
    Evidence: .sisyphus/evidence/task-5-parity-matrix-error.txt
  ```

  **Commit**: YES | Message: `docs(opencode): add workflow parity matrix` | Files: parity matrix source, validation test, related docs

- [ ] 6. Add OpenCode-native sidecar assets and discovery layout

  **What to do**: Introduce the `.opencode/` sidecar structure needed for OpenCode-first behavior (commands, agents, plugins, or wrappers) while keeping shared skill content generated from the canonical templates. Ensure the layout matches the host contract and does not double-register workflows already exposed through skills.
  **Must NOT do**: Do not copy the entire skill tree into `.opencode/` without a specific need. Do not create command names that collide silently with generated skill commands.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: multi-file host integration work with cross-cutting discovery implications.
  - Skills: `[]` — native repo patterns plus OpenCode docs are enough.
  - Omitted: `['orchestrating-swarms']` — no swarm logic is required.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10 | Blocked By: 2, 3, 5

  **References**:
  - Research: librarian findings in `m0018` — OpenCode extension primitives are agents, commands, skills, and JS/TS plugins; skills are auto-exposed as commands when not colliding.
  - Pattern: `scripts/gen-skill-docs.ts` host-driven generation path — use generation/sidecar outputs rather than manual per-skill edits.
  - Guardrail: Oracle finding in `m0024` — OpenCode-specific sidecars should be narrow and host-adapter driven.

  **Acceptance Criteria**:
  - [ ] `.opencode/` assets exist only where they provide OpenCode-native value unavailable from shared skills alone.
  - [ ] Command/skill naming collisions are explicitly handled.
  - [ ] OpenCode discovery works without duplicate workflow registration.

  **QA Scenarios**:
  ```
  Scenario: OpenCode sidecar assets are discoverable and non-duplicative
    Tool: Bash
    Steps: Run OpenCode-oriented discovery tests or smoke commands against the generated repo-local layout.
    Expected: Expected commands/agents/plugins are discovered once each, with no duplicate skill registration.
    Evidence: .sisyphus/evidence/task-6-sidecar.txt

  Scenario: Command collision is blocked explicitly
    Tool: Bash
    Steps: Run the new collision test against a fixture where an OpenCode command conflicts with a skill-exposed command name.
    Expected: The test fails with a deterministic collision error or documented precedence outcome.
    Evidence: .sisyphus/evidence/task-6-sidecar-error.txt
  ```

  **Commit**: YES | Message: `feat(opencode): add sidecar assets and discovery layout` | Files: `.opencode/**`, generator outputs, discovery tests

- [ ] 7. Migrate project instructions and docs for dual-host OpenCode support

  **What to do**: Update README, AGENTS-level guidance, setup help text, and any host-specific docs so OpenCode install/use/plugin requirements are explicit. Replace Claude-only wording where the repo is now multi-host, but preserve host-specific instructions where behavior genuinely differs.
  **Must NOT do**: Do not promise plugin parity before Task 8 lands. Do not delete existing Claude/Codex instructions.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: this is documentation and user guidance work.
  - Skills: `[]` — direct documentation work.
  - Omitted: `['every-style-editor']` — clarity and correctness matter more than stylistic polish here.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10 | Blocked By: 2, 3, 4, 5

  **References**:
  - Pattern: `README.md` install and troubleshooting sections — existing multi-host documentation baseline.
  - Pattern: `AGENTS.md` — current workflow catalog and context-mode rules that may need OpenCode-specific wording.
  - Research: `.sisyphus/drafts/opencode-only-port.md:13-25` — migration decisions and OpenCode capability notes to preserve.

  **Acceptance Criteria**:
  - [ ] README/setup/help text documents OpenCode local/global install modes, discovery roots, and plugin requirements.
  - [ ] Documentation states which workflows are full parity vs adapted/degraded.
  - [ ] Existing Claude/Codex instructions remain correct after edits.

  **QA Scenarios**:
  ```
  Scenario: Documentation matches implemented OpenCode flows
    Tool: Bash
    Steps: Run doc-oriented tests/lints plus a scripted assertion that README/setup examples reference the actual supported OpenCode commands and paths.
    Expected: Tests pass and every documented OpenCode path/flag matches the implemented setup/generator contract.
    Evidence: .sisyphus/evidence/task-7-docs.txt

  Scenario: Unsupported parity claim is caught
    Tool: Bash
    Steps: Run a doc validation test that compares README parity claims against the parity matrix and plugin availability.
    Expected: The test fails if docs overstate first-class support before required tasks are complete.
    Evidence: .sisyphus/evidence/task-7-docs-error.txt
  ```

  **Commit**: YES | Message: `docs(opencode): document install and parity boundaries` | Files: `README.md`, `AGENTS.md`, setup help text, related docs

- [ ] 8. Implement the narrow OpenCode safety plugin with advisory fallback

  **What to do**: Add an OpenCode plugin that covers runtime-only guardrail behaviors currently tied to Claude-specific safety affordances—especially `careful`, `freeze`, and `guard` interception paths. Keep workflow logic in skills/commands, and document advisory fallback behavior when the plugin is absent.
  **Must NOT do**: Do not move whole skill workflows into plugin code. Do not silently degrade guardrails without surfacing the fallback in docs and parity classification.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: plugin hooks affect runtime safety semantics and must be scoped precisely.
  - Skills: `[]` — plugin behavior should follow the OpenCode docs directly.
  - Omitted: `['agent-native-architecture']` — this is a targeted compatibility layer, not a new agent-native product design.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10 | Blocked By: 3, 4

  **References**:
  - Research: librarian findings in `m0018` — OpenCode plugin hooks support permission interception, auth, env injection, and custom tools.
  - Pattern: current safety skills under `careful/`, `freeze/`, `guard/`, `unfreeze/` — preserve workflow contracts while moving only runtime interception into the plugin.
  - Guardrail: Oracle finding in `m0024` — plugin scope must stay narrow and be release-gated separately from baseline parity.

  **Acceptance Criteria**:
  - [ ] OpenCode plugin enforces the intended runtime guardrail hooks for safety workflows.
  - [ ] Skills still own user-facing workflow logic; plugin code only handles runtime interception/integration.
  - [ ] Advisory fallback behavior is explicit when the plugin is unavailable.

  **QA Scenarios**:
  ```
  Scenario: Safety plugin intercepts guarded commands in OpenCode mode
    Tool: Bash
    Steps: Run plugin tests or OpenCode smoke fixtures that invoke the guarded command path under `careful`/`freeze`/`guard`.
    Expected: Plugin hooks fire, expected warnings/blocks occur, and the behavior matches the documented parity class.
    Evidence: .sisyphus/evidence/task-8-plugin.txt

  Scenario: Missing plugin falls back to advisory mode only
    Tool: Bash
    Steps: Run the same smoke fixture with the plugin disabled or absent.
    Expected: Runtime interception does not occur, but the skill/command output clearly states advisory-only behavior and tests confirm docs match that mode.
    Evidence: .sisyphus/evidence/task-8-plugin-error.txt
  ```

  **Commit**: YES | Message: `feat(plugin): add opencode safety hooks` | Files: `.opencode/plugins/**`, safety skills/docs/tests

- [ ] 9. Verify browse binary and helper-tool compatibility under OpenCode layouts

  **What to do**: Ensure `/browse` and the `gstack-*` helper binaries work correctly when invoked from the OpenCode install/runtime layout, including repo-local and global modes. Document or patch any host-specific assumptions around runtime root, analytics/state directories, and Windows/Node fallback behavior.
  **Must NOT do**: Do not rewrite the browse architecture unless compatibility testing proves it is necessary. Do not leave helper invocation differences undocumented.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: integration-heavy validation across binaries, shell helpers, and runtime paths.
  - Skills: `[]` — no additional skill is required.
  - Omitted: `['test-browser']` — this is binary/runtime compatibility work, not app-browser QA.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10 | Blocked By: 3, 4, 5

  **References**:
  - Pattern: `setup:99-196` — build and Playwright/Chromium verification flow for browse.
  - Pattern: `setup:198-220` — state directory and linked skill behavior that may affect helper runtime assumptions.
  - Pattern: `scripts/gen-skill-docs.ts:182-221` — generated preamble references to helper binaries and analytics files.
  - Research: repo findings summarized in `.sisyphus/drafts/opencode-only-port.md` — helper binaries and browse are part of the migration surface.

  **Acceptance Criteria**:
  - [ ] Browse/runtime helper paths resolve under OpenCode layouts.
  - [ ] Any required Windows/Node fallback behavior remains intact for OpenCode installs.
  - [ ] Helper-tool behavior differences are either fixed or explicitly documented in parity/distro docs.

  **QA Scenarios**:
  ```
  Scenario: Browse/helper binaries resolve in OpenCode layout
    Tool: Bash
    Steps: Run integration tests or smoke scripts that exercise browse binary path resolution and a representative `gstack-*` helper from an OpenCode install fixture.
    Expected: Commands resolve successfully in repo-local and global OpenCode layouts.
    Evidence: .sisyphus/evidence/task-9-binaries.txt

  Scenario: Host-specific fallback regression is detected
    Tool: Bash
    Steps: Run the browse/helper smoke suite against a fixture simulating missing/incorrect OpenCode runtime paths or Windows fallback requirements.
    Expected: Tests fail with a clear compatibility error instead of silently using the wrong host path.
    Evidence: .sisyphus/evidence/task-9-binaries-error.txt
  ```

  **Commit**: YES | Message: `fix(opencode): align browse and helper runtime paths` | Files: browse/runtime helpers, setup logic, integration tests, docs if needed

- [ ] 10. Add end-to-end OpenCode coverage and rollout gating

  **What to do**: Add the final OpenCode test gates: generator path-leak tests, setup/install layout tests, discovery smoke tests, plugin smoke tests, and release gating that blocks “first-class OpenCode” claims until baseline parity plus safety parity pass. Ensure CI/local commands cover the new host explicitly.
  **Must NOT do**: Do not rely on manual spot checks. Do not leave OpenCode coverage outside the normal test/build flow.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: this is the final integration and regression barrier.
  - Skills: `[]` — repository test infrastructure is the main driver.
  - Omitted: `['tdd']` — by this stage the work is integration-hardening, not feature discovery.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification Wave | Blocked By: 2, 3, 6, 7, 8, 9

  **References**:
  - Test: `test/gen-skill-docs.test.ts:161-175` — existing freshness/dry-run test pattern.
  - Test: `test/gen-skill-docs.test.ts:177-195` — placeholder validation pattern to extend with OpenCode artifacts.
  - Guardrail: Oracle finding in `m0024` — release should be staged: R1 baseline parity, R2 plugin-enforced safety parity.
  - Deliverable: parity matrix and docs from Tasks 5 and 7 — rollout gating must reflect them exactly.

  **Acceptance Criteria**:
  - [ ] CI/local test commands include explicit OpenCode coverage.
  - [ ] Release gating prevents first-class support claims until both baseline and plugin safety parity pass.
  - [ ] OpenCode smoke tests cover generation, install/discovery, and safety behavior.

  **QA Scenarios**:
  ```
  Scenario: Full OpenCode regression suite passes
    Tool: Bash
    Steps: Run the repo's OpenCode-inclusive validation command set (for example generation, unit tests, and integration/smoke tests added by this task).
    Expected: All OpenCode gates pass and evidence demonstrates coverage for generation, discovery, setup, and safety.
    Evidence: .sisyphus/evidence/task-10-rollout.txt

  Scenario: First-class claim is blocked when safety parity is missing
    Tool: Bash
    Steps: Run the release-gate validation against a fixture/state where baseline parity is present but plugin safety parity is disabled.
    Expected: Release gating fails with an explicit message that first-class OpenCode support is not yet claimable.
    Evidence: .sisyphus/evidence/task-10-rollout-error.txt
  ```

  **Commit**: YES | Message: `test(opencode): add rollout and parity gates` | Files: test suite, CI/build scripts, release gating docs/config

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit by migration boundary, not by file type.
- Minimum commit sequence:
  1. `feat(hosts): add opencode host contract`
  2. `feat(generator): emit opencode skill artifacts`
  3. `feat(setup): support opencode installation flows`
  4. `feat(runtime): adapt shared paths and helper resolution for opencode`
  5. `feat(plugin): add opencode safety hook support`
  6. `test(opencode): cover generation setup and parity smoke tests`
  7. `docs(opencode): document install usage and parity limits`

## Success Criteria
- OpenCode support is implemented through the host-adapter architecture rather than template duplication.
- OpenCode users can install and discover gstack artifacts in both repo-local and global modes with no duplicate loading.
- Every existing workflow is classified as full parity, minor adaptation, or intentional degradation, with docs matching implementation.
- Plugin-based guardrails are explicitly present or explicitly documented as advisory fallback.
- The repo remains dual-host without regressions to existing Claude/Codex behavior.
