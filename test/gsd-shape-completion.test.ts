import { afterEach, describe, expect, test, mock } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "bun:sqlite";

import {
	closeDB,
	createMockContext,
	getLastNudgedMilestone,
	handleAgentEnd,
	isMilestoneComplete,
	setLastNudgedMilestone,
	__resetDBSingleton,
} from "../.gsd/extensions/gsd-shape/completion";

const tempDirs: string[] = [];

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
	__resetDBSingleton();
});

function createRepoWithGSD(options?: {
	milestones?: {
		id: string;
		title: string;
		status: string;
		slices: Array<{
			id: string;
			title: string;
			status: string;
		}>;
	}[];
}): string {
	const root = mkdtempSync(path.join(tmpdir(), "gsd-shape-completion-"));
	tempDirs.push(root);

	const gsdDir = path.join(root, ".gsd");
	mkdirSync(gsdDir, { recursive: true });

	// Create GSD database
	const dbPath = path.join(gsdDir, "gsd.db");
	const db = new Database(dbPath);

	// Create tables matching GSD schema
	db.exec(`
		CREATE TABLE IF NOT EXISTS milestones (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'active'
		);
		CREATE TABLE IF NOT EXISTS slices (
			id TEXT PRIMARY KEY,
			milestone_id TEXT NOT NULL,
			title TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending',
			FOREIGN KEY (milestone_id) REFERENCES milestones(id)
		);
	`);

	// Insert milestones and slices from options
	const milestones = options?.milestones ?? [
		{
			id: "M001",
			title: "First milestone",
			status: "active",
			slices: [
				{ id: "S01", title: "Slice 1", status: "complete" },
				{ id: "S02", title: "Slice 2", status: "complete" },
			],
		},
	];

	const milestoneStmt = db.prepare(
		"INSERT INTO milestones (id, title, status) VALUES (?, ?, ?)",
	);
	const sliceStmt = db.prepare(
		"INSERT INTO slices (id, milestone_id, title, status) VALUES (?, ?, ?, ?)",
	);

	for (const milestone of milestones) {
		milestoneStmt.run(milestone.id, milestone.title, milestone.status);
		for (const slice of milestone.slices) {
			sliceStmt.run(slice.id, milestone.id, slice.title, slice.status);
		}
	}

	db.close();

	return root;
}

describe("isMilestoneComplete", () => {
	test("returns true when all slices for a milestone are complete", () => {
		const root = createRepoWithGSD({
			milestones: [
				{
					id: "M001",
					title: "Complete milestone",
					status: "active",
					slices: [
						{ id: "S01", title: "Slice 1", status: "complete" },
						{ id: "S02", title: "Slice 2", status: "complete" },
						{ id: "S03", title: "Slice 3", status: "complete" },
					],
				},
			],
		});

		const isComplete = isMilestoneComplete(root, "M001");
		expect(isComplete).toBe(true);
	});

	test("returns false when any slice is not complete", () => {
		const root = createRepoWithGSD({
			milestones: [
				{
					id: "M001",
					title: "Incomplete milestone",
					status: "active",
					slices: [
						{ id: "S01", title: "Slice 1", status: "complete" },
						{ id: "S02", title: "Slice 2", status: "pending" },
						{ id: "S03", title: "Slice 3", status: "complete" },
					],
				},
			],
		});

		const isComplete = isMilestoneComplete(root, "M001");
		expect(isComplete).toBe(false);
	});

	test("returns false when all slices have status other than 'complete'", () => {
		const root = createRepoWithGSD({
			milestones: [
				{
					id: "M001",
					title: "Not-started milestone",
					status: "active",
					slices: [
						{ id: "S01", title: "Slice 1", status: "pending" },
						{ id: "S02", title: "Slice 2", status: "in_progress" },
						{ id: "S03", title: "Slice 3", status: "blocked" },
					],
				},
			],
		});

		const isComplete = isMilestoneComplete(root, "M001");
		expect(isComplete).toBe(false);
	});

	test("returns true when milestone has no slices", () => {
		const root = createRepoWithGSD({
			milestones: [
				{
					id: "M001",
					title: "Empty milestone",
					status: "active",
					slices: [],
				},
			],
		});

		const isComplete = isMilestoneComplete(root, "M001");
		expect(isComplete).toBe(true);
	});

	test("returns false when database does not exist", () => {
		const root = mkdtempSync(path.join(tmpdir(), "gsd-shape-no-db-"));
		tempDirs.push(root);

		const isComplete = isMilestoneComplete(root, "M001");
		expect(isComplete).toBe(false);
	});

	test("returns false for non-existent milestone ID", () => {
		const root = createRepoWithGSD({
			milestones: [
				{
					id: "M001",
					title: "First milestone",
					status: "active",
					slices: [{ id: "S01", title: "Slice 1", status: "complete" }],
				},
			],
		});

		const isComplete = isMilestoneComplete(root, "M999");
		expect(isComplete).toBe(false);
	});
});

describe("getLastNudgedMilestone and setLastNudgedMilestone", () => {
	test("returns null when no milestone has been nudged", () => {
		const ctx = createMockContext({});

		const lastNudged = getLastNudgedMilestone(ctx);
		expect(lastNudged).toBeNull();
	});

	test("returns the milestone ID that was previously set", () => {
		const sessionStore: Record<string, string> = {};
		const sessionManager = {
			get: (key: string) => sessionStore[key],
			set: (key: string, value: string) => {
				sessionStore[key] = value;
			},
		};

		const ctx = createMockContext({ sessionManager });

		setLastNudgedMilestone(ctx, "M001");
		const lastNudged = getLastNudgedMilestone(ctx);
		expect(lastNudged).toBe("M001");
	});

	test("overwrites previous value when set multiple times", () => {
		const sessionStore: Record<string, string> = {};
		const sessionManager = {
			get: (key: string) => sessionStore[key],
			set: (key: string, value: string) => {
				sessionStore[key] = value;
			},
		};

		const ctx = createMockContext({ sessionManager });

		setLastNudgedMilestone(ctx, "M001");
		expect(getLastNudgedMilestone(ctx)).toBe("M001");

		setLastNudgedMilestone(ctx, "M002");
		expect(getLastNudgedMilestone(ctx)).toBe("M002");
	});

	test("handles missing sessionManager gracefully", () => {
		const ctx = createMockContext({});

		setLastNudgedMilestone(ctx, "M001"); // Should not throw
		const lastNudged = getLastNudgedMilestone(ctx);
		expect(lastNudged).toBeNull(); // sessionManager.get is undefined
	});

	test("handles sessionManager.get undefined gracefully", () => {
		const sessionManager = {
			// get is intentionally undefined
		};

		const ctx = createMockContext({ sessionManager });

		const lastNudged = getLastNudgedMilestone(ctx);
		expect(lastNudged).toBeNull();
	});

	test("handles sessionManager.set undefined gracefully", () => {
		const sessionManager = {
			// set is intentionally undefined
		};

		const ctx = createMockContext({ sessionManager });

		setLastNudgedMilestone(ctx, "M001"); // Should not throw
	});
});

describe("handleAgentEnd", () => {
	test("emits nudge notification when milestone completes for the first time", async () => {
		const root = createRepoWithGSD({
			milestones: [
				{
					id: "M001",
					title: "Complete milestone",
					status: "active",
					slices: [
						{ id: "S01", title: "Slice 1", status: "complete" },
						{ id: "S02", title: "Slice 2", status: "complete" },
					],
				},
			],
		});

		const notifications: string[] = [];
		const sessionStore: Record<string, string> = {};

		const ctx = createMockContext({
			cwd: root,
			notify: (msg: string) => {
				notifications.push(msg);
			},
			sessionManager: {
				get: (key: string) => sessionStore[key],
				set: (key: string, value: string) => {
					sessionStore[key] = value;
				},
			},
		});

		await handleAgentEnd({}, ctx);

		expect(notifications).toHaveLength(1);
		expect(notifications[0]).toContain("shaping_nudge:");
		expect(notifications[0]).toContain("M001");
		expect(notifications[0]).toContain("complete");
		expect(notifications[0]).toContain("/gsd-shape");
		expect(sessionStore["gsd_shape:last_nudged_milestone"]).toBe("M001");
	});

	test("does not emit nudge when milestone was already nudged", async () => {
		const root = createRepoWithGSD({
			milestones: [
				{
					id: "M001",
					title: "Complete milestone",
					status: "active",
					slices: [
						{ id: "S01", title: "Slice 1", status: "complete" },
						{ id: "S02", title: "Slice 2", status: "complete" },
					],
				},
			],
		});

		const notifications: string[] = [];
		const sessionStore: Record<string, string> = {
			"gsd_shape:last_nudged_milestone": "M001", // Already nudged
		};

		const ctx = createMockContext({
			cwd: root,
			notify: (msg: string) => {
				notifications.push(msg);
			},
			sessionManager: {
				get: (key: string) => sessionStore[key],
				set: (key: string, value: string) => {
					sessionStore[key] = value;
				},
			},
		});

		await handleAgentEnd({}, ctx);

		expect(notifications).toHaveLength(0);
	});

	test("does not emit nudge when milestone is not complete", async () => {
		const root = createRepoWithGSD({
			milestones: [
				{
					id: "M001",
					title: "Incomplete milestone",
					status: "active",
					slices: [
						{ id: "S01", title: "Slice 1", status: "complete" },
						{ id: "S02", title: "Slice 2", status: "pending" },
					],
				},
			],
		});

		const notifications: string[] = [];
		const sessionStore: Record<string, string> = {};

		const ctx = createMockContext({
			cwd: root,
			notify: (msg: string) => {
				notifications.push(msg);
			},
			sessionManager: {
				get: (key: string) => sessionStore[key],
				set: (key: string, value: string) => {
					sessionStore[key] = value;
				},
			},
		});

		await handleAgentEnd({}, ctx);

		expect(notifications).toHaveLength(0);
		expect(sessionStore["gsd_shape:last_nudged_milestone"]).toBeUndefined();
	});

	test("does not emit nudge when no active milestone exists", async () => {
		const root = createRepoWithGSD({
			milestones: [
				{
					id: "M001",
					title: "Completed milestone",
					status: "completed", // Not active
					slices: [
						{ id: "S01", title: "Slice 1", status: "complete" },
					],
				},
			],
		});

		const notifications: string[] = [];
		const sessionStore: Record<string, string> = {};

		const ctx = createMockContext({
			cwd: root,
			notify: (msg: string) => {
				notifications.push(msg);
			},
			sessionManager: {
				get: (key: string) => sessionStore[key],
				set: (key: string, value: string) => {
					sessionStore[key] = value;
				},
			},
		});

		await handleAgentEnd({}, ctx);

		expect(notifications).toHaveLength(0);
	});

	test("handles missing cwd gracefully", async () => {
		const notifications: string[] = [];
		const sessionStore: Record<string, string> = {};

		const ctx = createMockContext({
			// cwd is intentionally missing
			notify: (msg: string) => {
				notifications.push(msg);
			},
			sessionManager: {
				get: (key: string) => sessionStore[key],
				set: (key: string, value: string) => {
					sessionStore[key] = value;
				},
			},
		});

		await handleAgentEnd({}, ctx);

		expect(notifications).toHaveLength(0);
	});

	test("handles missing ui.notify gracefully", async () => {
		const root = createRepoWithGSD({
			milestones: [
				{
					id: "M001",
					title: "Complete milestone",
					status: "active",
					slices: [
						{ id: "S01", title: "Slice 1", status: "complete" },
					],
				},
			],
		});

		const sessionStore: Record<string, string> = {};

		const ctx = createMockContext({
			cwd: root,
			// notify is intentionally missing
			sessionManager: {
				get: (key: string) => sessionStore[key],
				set: (key: string, value: string) => {
					sessionStore[key] = value;
				},
			},
		});

		await handleAgentEnd({}, ctx);

		// Should not throw
	});

	test("nudge notification uses the correct stable prefix", async () => {
		const root = createRepoWithGSD({
			milestones: [
				{
					id: "M001",
					title: "Complete milestone",
					status: "active",
					slices: [
						{ id: "S01", title: "Slice 1", status: "complete" },
					],
				},
			],
		});

		const notifications: string[] = [];
		const sessionStore: Record<string, string> = {};

		const ctx = createMockContext({
			cwd: root,
			notify: (msg: string) => {
				notifications.push(msg);
			},
			sessionManager: {
				get: (key: string) => sessionStore[key],
				set: (key: string, value: string) => {
					sessionStore[key] = value;
				},
			},
		});

		await handleAgentEnd({}, ctx);

		expect(notifications).toHaveLength(1);
		expect(notifications[0]).toMatch(/^shaping_nudge:/);
	});

	test("emits nudge for different milestone after first one was nudged", async () => {
		const root = createRepoWithGSD({
			milestones: [
				{
					id: "M001",
					title: "First milestone done",
					status: "completed",
					slices: [
						{ id: "S01", title: "Slice 1", status: "complete" },
					],
				},
				{
					id: "M002",
					title: "Second milestone done",
					status: "active",
					slices: [
						{ id: "S02", title: "Slice 2", status: "complete" },
					],
				},
			],
		});

		const notifications: string[] = [];
		const sessionStore: Record<string, string> = {
			"gsd_shape:last_nudged_milestone": "M001", // Already nudged
		};

		const ctx = createMockContext({
			cwd: root,
			notify: (msg: string) => {
				notifications.push(msg);
			},
			sessionManager: {
				get: (key: string) => sessionStore[key],
				set: (key: string, value: string) => {
					sessionStore[key] = value;
				},
			},
		});

		await handleAgentEnd({}, ctx);

		expect(notifications).toHaveLength(1);
		expect(notifications[0]).toContain("M002");
		expect(sessionStore["gsd_shape:last_nudged_milestone"]).toBe("M002");
	});
});

describe("createMockContext", () => {
	test("creates a context with custom cwd", () => {
		const ctx = createMockContext({ cwd: "/test/path" });
		expect(ctx.cwd).toBe("/test/path");
	});

	test("creates a context with custom notify function", () => {
		let called = false;
		const ctx = createMockContext({
			notify: () => {
				called = true;
			},
		});

		ctx.ui?.notify?.("test");
		expect(called).toBe(true);
	});

	test("creates a context with custom sessionManager", () => {
		const store: Record<string, string> = {};
		const ctx = createMockContext({
			sessionManager: {
				get: (key: string) => store[key],
				set: (key: string, value: string) => {
					store[key] = value;
				},
			},
		});

		ctx.sessionManager?.set?.("test", "value");
		expect(ctx.sessionManager?.get?.("test")).toBe("value");
	});
});

describe("closeDB", () => {
	test("closes database connection gracefully", () => {
		const root = createRepoWithGSD();

		// Open DB by calling isMilestoneComplete
		isMilestoneComplete(root, "M001");

		// Close DB
		expect(() => closeDB()).not.toThrow();
	});

	test("handles closing when no DB is open", () => {
		// Reset singleton
		__resetDBSingleton();

		// Close DB
		expect(() => closeDB()).not.toThrow();
	});
});
