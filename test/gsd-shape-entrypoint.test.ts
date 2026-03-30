import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import registerExtension, {
	buildShapingKickoffPrompt,
	GSD_SHAPE_COMMAND,
	type GsdShapeCommandAPI,
	type GsdShapeCommandContext,
	type GsdShapeCommandDefinition,
	loadShapingContext,
} from "../.gsd/extensions/gsd-shape";

const tempDirs: string[] = [];

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

function createRepoFixture(options?: {
	project?: string;
	requirements?: string;
	decisions?: string;
	milestoneId?: string;
	milestoneContext?: string;
	milestoneRoadmap?: string;
}): string {
	const root = mkdtempSync(path.join(tmpdir(), "gsd-shape-entrypoint-"));
	tempDirs.push(root);

	const milestoneId = options?.milestoneId ?? "M001";
	const milestoneDir = path.join(root, ".gsd", "milestones", milestoneId);

	mkdirSync(milestoneDir, { recursive: true });

	writeFileSync(
		path.join(root, ".gsd", "PROJECT.md"),
		options?.project ?? defaultProject(),
	);
	writeFileSync(
		path.join(root, ".gsd", "REQUIREMENTS.md"),
		options?.requirements ?? defaultRequirements(),
	);
	writeFileSync(
		path.join(root, ".gsd", "DECISIONS.md"),
		options?.decisions ?? defaultDecisions(),
	);
	writeFileSync(
		path.join(milestoneDir, `${milestoneId}-CONTEXT.md`),
		options?.milestoneContext ?? defaultMilestoneContext(milestoneId),
	);
	writeFileSync(
		path.join(milestoneDir, `${milestoneId}-ROADMAP.md`),
		options?.milestoneRoadmap ?? defaultRoadmap(milestoneId),
	);

	return root;
}

function defaultProject(): string {
	return [
		"# Project",
		"",
		"## What This Is",
		"A shaping extension entrypoint test fixture.",
		"",
		"## Current State",
		"The first milestone is active and waiting for shaping.",
		"",
		"## Milestone Sequence",
		"- [ ] M001: Extension foundation and GSD interop",
	].join("\n");
}

function defaultRequirements(): string {
	return [
		"# Requirements",
		"",
		"## Active",
		"### R001 — GSD-to-shaping loop",
		"### R002 — Ground the command in current milestone state",
		"",
		"## Validated",
		"### R010 — Shared context loader exists",
		"",
		"## Deferred",
		"### R020 — Automatic shaping trigger",
		"",
		"## Out of Scope",
		"### R030 — Core /gsd mutation in slice one",
	].join("\n");
}

function defaultDecisions(): string {
	return [
		"# Decisions Register",
		"",
		"| # | When | Scope | Decision | Choice | Rationale | Revisable? | Made By |",
		"|---|------|-------|----------|--------|-----------|------------|---------|",
		"| D001 | M001 | pattern | How shaping starts | Use a repo-local command | Keeps shaping optional. | Yes | collaborative |",
		"| D002 | M001 | observability | Busy session behavior | Notify and refuse to queue | Avoids misleading turns. | Yes | collaborative |",
	].join("\n");
}

function defaultMilestoneContext(milestoneId: string): string {
	return [
		`# ${milestoneId}: Extension foundation and GSD interop`,
		"",
		"## Project Description",
		"Build the command surface and queue a grounded shaping kickoff.",
	].join("\n");
}

function defaultRoadmap(milestoneId: string): string {
	return [
		`# ${milestoneId}: Extension foundation and GSD interop`,
		"",
		"## Slice Overview",
		"| ID | Slice | Risk | Depends | Done | After this |",
		"|----|-------|------|---------|------|------------|",
		"| S01 | Extension shell and entrypoint | high | — | ⬜ | A pi/GSD user can invoke the shaping workflow from an extension command. |",
		"| S02 | Shaping session plumbing | medium | S01 | ⬜ | The shaping session can persist approved outputs. |",
	].join("\n");
}

class TestPi implements GsdShapeCommandAPI {
	commands = new Map<string, GsdShapeCommandDefinition>();
	sentMessages: string[] = [];

	registerCommand(name: string, command: GsdShapeCommandDefinition): void {
		this.commands.set(name, command);
	}

	sendUserMessage(content: string): void {
		this.sentMessages.push(content);
	}
}

function createCommandContext(
	root: string,
	options?: { idle?: boolean },
): GsdShapeCommandContext & {
	notifications: Array<{
		message: string;
		level: "info" | "warning" | "error";
	}>;
} {
	const notifications: Array<{
		message: string;
		level: "info" | "warning" | "error";
	}> = [];

	return {
		cwd: root,
		hasUI: true,
		isIdle: () => options?.idle ?? true,
		ui: {
			notify: (message, level) => {
				notifications.push({ message, level });
			},
		},
		notifications,
	};
}

describe("/gsd-shape command registration", () => {
	test("registers a dedicated /gsd-shape entrypoint from the repo-local extension shell", () => {
		const pi = new TestPi();

		registerExtension(pi);

		expect(pi.commands.has(GSD_SHAPE_COMMAND)).toBe(true);
		expect(pi.commands.has("gsd")).toBe(false);
		expect(pi.commands.get(GSD_SHAPE_COMMAND)?.description).toContain(
			"grounded shaping kickoff",
		);
	});
});

describe("/gsd-shape command behavior", () => {
	test("queues a grounded shaping kickoff when the session is idle and context is valid", async () => {
		const root = createRepoFixture();
		const pi = new TestPi();
		registerExtension(pi);

		const command = pi.commands.get(GSD_SHAPE_COMMAND);
		const ctx = createCommandContext(root, { idle: true });

		await command?.handler("", ctx);

		expect(pi.sentMessages).toHaveLength(1);
		expect(pi.sentMessages[0]).toContain(
			"Start an optional GSD shaping session",
		);
		expect(pi.sentMessages[0]).toContain(
			"M001 Extension foundation and GSD interop",
		);
		expect(pi.sentMessages[0]).toContain("R001 GSD-to-shaping loop");
		expect(ctx.notifications).toEqual([
			{
				message: "kickoff_queued: queued grounded shaping kickoff for M001.",
				level: "info",
			},
		]);
	});

	test("busy session emits a busy_session diagnostic and does not queue a kickoff", async () => {
		const root = createRepoFixture();
		const pi = new TestPi();
		registerExtension(pi);

		const command = pi.commands.get(GSD_SHAPE_COMMAND);
		const ctx = createCommandContext(root, { idle: false });

		await command?.handler("", ctx);

		expect(pi.sentMessages).toHaveLength(0);
		expect(ctx.notifications).toEqual([
			{
				message:
					"busy_session: /gsd-shape only queues a kickoff when the current session is idle. Retry when the current turn finishes.",
				level: "warning",
			},
		]);
	});

	test("missing context surfaces the blocking file and does not queue a kickoff", async () => {
		const root = mkdtempSync(
			path.join(tmpdir(), "gsd-shape-entrypoint-missing-"),
		);
		tempDirs.push(root);

		const pi = new TestPi();
		registerExtension(pi);

		const command = pi.commands.get(GSD_SHAPE_COMMAND);
		const ctx = createCommandContext(root, { idle: true });

		await command?.handler("", ctx);

		expect(pi.sentMessages).toHaveLength(0);
		expect(ctx.notifications).toHaveLength(1);
		expect(ctx.notifications[0].level).toBe("error");
		expect(ctx.notifications[0].message).toContain(
			"missing_context:.gsd/PROJECT.md",
		);
	});

	test("unsupported arguments return usage guidance instead of queueing a kickoff", async () => {
		const root = createRepoFixture();
		const pi = new TestPi();
		registerExtension(pi);

		const command = pi.commands.get(GSD_SHAPE_COMMAND);
		const ctx = createCommandContext(root, { idle: true });

		await command?.handler("now", ctx);

		expect(pi.sentMessages).toHaveLength(0);
		expect(ctx.notifications).toEqual([
			{
				message: "Usage: /gsd-shape (no arguments supported in slice one).",
				level: "warning",
			},
		]);
	});

	test("repeated invocation stays deterministic for the same discovered context", async () => {
		const root = createRepoFixture();
		const pi = new TestPi();
		registerExtension(pi);

		const command = pi.commands.get(GSD_SHAPE_COMMAND);
		const firstCtx = createCommandContext(root, { idle: true });
		const secondCtx = createCommandContext(root, { idle: true });

		await command?.handler("", firstCtx);
		await command?.handler("", secondCtx);

		expect(pi.sentMessages).toHaveLength(2);
		expect(pi.sentMessages[0]).toBe(pi.sentMessages[1]);
	});
});

describe("buildShapingKickoffPrompt", () => {
	test("builds a deterministic prompt for partial but valid optional context", async () => {
		const root = createRepoFixture({
			project: [
				"# Project",
				"",
				"## Milestone Sequence",
				"- [ ] M001: Extension foundation and GSD interop",
			].join("\n"),
			milestoneContext: `# M001: Extension foundation and GSD interop`,
		});

		const result = await loadShapingContext(root);
		expect(result.outcome).toBe("ready");
		if (result.outcome !== "ready") {
			throw new Error(`expected ready context, got ${result.outcome}`);
		}

		const prompt = buildShapingKickoffPrompt(result.context);
		const promptAgain = buildShapingKickoffPrompt(result.context);

		expect(prompt.outcome).toBe("ready");
		expect(prompt).toEqual(promptAgain);
		if (prompt.outcome !== "ready") {
			throw new Error(`expected ready prompt, got ${prompt.outcome}`);
		}

		expect(prompt.prompt).toContain("## Repo and milestone state");
		expect(prompt.prompt).toContain("## Slice overview");
		expect(prompt.prompt).not.toContain("What this is:");
		expect(prompt.prompt).not.toContain("Current state:");
	});

	test("fails fast when required prompt sections would render empty", async () => {
		const root = createRepoFixture();
		const result = await loadShapingContext(root);
		expect(result.outcome).toBe("ready");
		if (result.outcome !== "ready") {
			throw new Error(`expected ready context, got ${result.outcome}`);
		}

		const prompt = buildShapingKickoffPrompt({
			...result.context,
			repoRoot: "",
		});

		expect(prompt.outcome).toBe("malformed_context");
		if (prompt.outcome === "ready") {
			throw new Error("expected malformed prompt result");
		}

		expect(prompt.message).toContain("repo and milestone identity");
	});
});
