import { afterEach, describe, expect, test } from 'bun:test';
import { chmodSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { loadShapingContext } from '../.gsd/extensions/gsd-shape/context';
import type { ShapingContextFailure, ShapingContextResult, ShapingContextSuccess } from '../.gsd/extensions/gsd-shape/types';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function expectReady(result: ShapingContextResult): ShapingContextSuccess {
  expect(result.outcome).toBe('ready');
  if (result.outcome !== 'ready') {
    throw new Error(`expected ready result, got ${result.outcome}`);
  }
  return result;
}

function expectFailure(
  result: ShapingContextResult,
  outcome: ShapingContextFailure['outcome'],
): ShapingContextFailure {
  expect(result.outcome).toBe(outcome);
  if (result.outcome === 'ready') {
    throw new Error(`expected ${outcome} result`);
  }
  return result;
}

function createRepoFixture(options?: {
  project?: string;
  requirements?: string;
  decisions?: string;
  milestoneId?: string;
  milestoneContext?: string;
  milestoneRoadmap?: string;
}): string {
  const root = mkdtempSync(path.join(tmpdir(), 'gsd-shape-context-'));
  tempDirs.push(root);

  const milestoneId = options?.milestoneId ?? 'M001';
  const milestoneDir = path.join(root, '.gsd', 'milestones', milestoneId);

  mkdirSync(milestoneDir, { recursive: true });

  writeFileSync(path.join(root, '.gsd', 'PROJECT.md'), options?.project ?? defaultProject());
  writeFileSync(path.join(root, '.gsd', 'REQUIREMENTS.md'), options?.requirements ?? defaultRequirements());
  writeFileSync(path.join(root, '.gsd', 'DECISIONS.md'), options?.decisions ?? defaultDecisions());
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
    '# Project',
    '',
    '## What This Is',
    'A shaping extension test fixture.',
    '',
    '## Current State',
    'The first milestone is active.',
    '',
    '## Milestone Sequence',
    '- [ ] M001: Extension foundation and GSD interop',
  ].join('\n');
}

function defaultRequirements(): string {
  return [
    '# Requirements',
    '',
    '## Active',
    '### R001 — GSD-to-shaping loop',
    '',
    '## Validated',
    'None yet.',
    '',
    '## Deferred',
    '### R010 — Release-readiness / QA hardening pass',
    '',
    '## Out of Scope',
    '### R013 — Full G-Stack parity on first release',
  ].join('\n');
}

function defaultDecisions(): string {
  return [
    '# Decisions Register',
    '',
    '| # | When | Scope | Decision | Choice | Rationale | Revisable? | Made By |',
    '|---|------|-------|----------|--------|-----------|------------|---------|',
    '| D001 | M001 | pattern | How shaping outputs are persisted | Stay inside GSD artifacts | Keeps the loop grounded. | Yes | collaborative |',
  ].join('\n');
}

function defaultMilestoneContext(milestoneId: string): string {
  return [
    `# ${milestoneId}: Extension foundation and GSD interop`,
    '',
    '## Project Description',
    'Build the extension shell and command surface.',
  ].join('\n');
}

function defaultRoadmap(milestoneId: string): string {
  return [
    `# ${milestoneId}: Extension foundation and GSD interop`,
    '',
    '## Slice Overview',
    '| ID | Slice | Risk | Depends | Done | After this |',
    '|----|-------|------|---------|------|------------|',
    '| S01 | Extension shell and entrypoint | high | — | ⬜ | A pi/GSD user can invoke the shaping workflow from an extension command. |',
  ].join('\n');
}

describe('loadShapingContext', () => {
  test('loads the active milestone context from stable .gsd artifacts', async () => {
    const root = createRepoFixture();

    const ready = expectReady(await loadShapingContext(root));

    expect(ready.context.activeMilestoneId).toBe('M001');
    expect(ready.context.project.milestoneSequence).toHaveLength(1);
    expect(ready.context.requirements.active.map(item => item.id)).toEqual(['R001']);
    expect(ready.context.decisions.map(item => item.id)).toEqual(['D001']);
    expect(ready.context.milestone.slices.map(item => item.id)).toEqual(['S01']);
    expect(ready.context.milestone.completedSliceIds).toEqual([]);
    expect(ready.context.files.project.absolutePath.startsWith(root)).toBe(true);
    expect(ready.context.files.milestoneRoadmap.relativePath).toBe('.gsd/milestones/M001/M001-ROADMAP.md');
  });

  test('missing .gsd project artifact returns missing_context diagnostics', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'gsd-shape-context-missing-'));
    tempDirs.push(root);

    const failure = expectFailure(await loadShapingContext(root), 'missing_context');

    expect(failure.blockingFile).toBe('.gsd/PROJECT.md');
    expect(failure.message).toContain('Required shaping artifact');
  });

  test('missing roadmap returns missing_context diagnostics naming the blocked file', async () => {
    const root = createRepoFixture();
    rmSync(path.join(root, '.gsd', 'milestones', 'M001', 'M001-ROADMAP.md'));

    const failure = expectFailure(await loadShapingContext(root), 'missing_context');

    expect(failure.blockingFile).toBe('.gsd/milestones/M001/M001-ROADMAP.md');
  });

  test('empty requirements file returns malformed_context diagnostics', async () => {
    const root = createRepoFixture({ requirements: '' });

    const failure = expectFailure(await loadShapingContext(root), 'malformed_context');

    expect(failure.blockingFile).toBe('.gsd/REQUIREMENTS.md');
    expect(failure.expected).toContain('standard requirements headings');
  });

  test('malformed project headings return actionable parse diagnostics', async () => {
    const root = createRepoFixture({
      project: ['# Project', '', '## Current State', 'Missing the milestone sequence heading.'].join('\n'),
    });

    const failure = expectFailure(await loadShapingContext(root), 'malformed_context');

    expect(failure.blockingFile).toBe('.gsd/PROJECT.md');
    expect(failure.message).toContain('## Milestone Sequence');
  });

  test('unreadable artifacts return missing_context diagnostics instead of throwing', async () => {
    const root = createRepoFixture();
    const decisionsPath = path.join(root, '.gsd', 'DECISIONS.md');
    chmodSync(decisionsPath, 0o000);

    const failure = expectFailure(await loadShapingContext(root), 'missing_context');

    expect(failure.blockingFile).toBe('.gsd/DECISIONS.md');
    expect(failure.detail).toContain('Filesystem read failed');

    chmodSync(decisionsPath, 0o644);
  });

  test('reports malformed_context when there is no active milestone data', async () => {
    const root = createRepoFixture({
      project: [
        '# Project',
        '',
        '## Milestone Sequence',
        '- [x] M001: Extension foundation and GSD interop',
      ].join('\n'),
    });

    const failure = expectFailure(await loadShapingContext(root), 'malformed_context');

    expect(failure.blockingFile).toBe('.gsd/PROJECT.md');
    expect(failure.message).toContain('active milestone');
  });

  test('uses the first incomplete milestone when multiple milestones exist', async () => {
    const root = createRepoFixture({
      project: [
        '# Project',
        '',
        '## What This Is',
        'A shaping extension test fixture.',
        '',
        '## Milestone Sequence',
        '- [x] M001: Finished groundwork',
        '- [ ] M002: New active milestone',
      ].join('\n'),
      milestoneId: 'M002',
      milestoneContext: defaultMilestoneContext('M002'),
      milestoneRoadmap: [
        '# M002: New active milestone',
        '',
        '## Slice Overview',
        '| ID | Slice | Risk | Depends | Done | After this |',
        '|----|-------|------|---------|------|------------|',
        '| S01 | Next slice | medium | S00 | ✅ | The new milestone is active. |',
      ].join('\n'),
    });

    const ready = expectReady(await loadShapingContext(root));

    expect(ready.context.activeMilestoneId).toBe('M002');
    expect(ready.context.milestone.completedSliceIds).toEqual(['S01']);
    expect(ready.context.files.milestoneContext.relativePath).toBe('.gsd/milestones/M002/M002-CONTEXT.md');
  });
});
