import { describe, expect, test } from 'bun:test';

import { buildShapingKickoffPrompt } from '../.gsd/extensions/gsd-shape/prompt';
import type { ShapingContext } from '../.gsd/extensions/gsd-shape/types';

function createMinimalShapingContext(): ShapingContext {
  return {
    repoRoot: '/test/repo',
    gsdRoot: '/test/repo/.gsd',
    activeMilestoneId: 'M001',
    files: {
      project: {
        key: 'project',
        relativePath: '.gsd/PROJECT.md',
        absolutePath: '/test/repo/.gsd/PROJECT.md',
      },
      requirements: {
        key: 'requirements',
        relativePath: '.gsd/REQUIREMENTS.md',
        absolutePath: '/test/repo/.gsd/REQUIREMENTS.md',
      },
      decisions: {
        key: 'decisions',
        relativePath: '.gsd/DECISIONS.md',
        absolutePath: '/test/repo/.gsd/DECISIONS.md',
      },
      milestoneContext: {
        key: 'milestoneContext',
        relativePath: '.gsd/milestones/M001/M001-CONTEXT.md',
        absolutePath: '/test/repo/.gsd/milestones/M001/M001-CONTEXT.md',
      },
      milestoneRoadmap: {
        key: 'milestoneRoadmap',
        relativePath: '.gsd/milestones/M001/ROADMAP.md',
        absolutePath: '/test/repo/.gsd/milestones/M001/ROADMAP.md',
      },
    },
    project: {
      title: 'Test Project',
      whatThisIs: 'A test project for unit testing',
      currentState: 'Development in progress',
      milestoneSequence: [],
    },
    requirements: {
      active: [{ id: 'R001', title: 'Active requirement', status: 'active' }],
      validated: [],
      deferred: [],
      outOfScope: [],
    },
    decisions: [],
    milestone: {
      id: 'M001',
      title: 'Test Milestone',
      description: 'A test milestone',
      contextTitle: 'M001-CONTEXT.md',
      roadmapTitle: 'ROADMAP.md',
      slices: [],
      completedSliceIds: [],
    },
    raw: {
      project: '',
      requirements: '',
      decisions: '',
      milestoneContext: '',
      milestoneRoadmap: '',
    },
  };
}

function createCompleteShapingContext(): ShapingContext {
  return {
    ...createMinimalShapingContext(),
    milestone: {
      id: 'M001',
      title: 'Test Milestone',
      description: 'A test milestone with slices',
      contextTitle: 'M001-CONTEXT.md',
      roadmapTitle: 'ROADMAP.md',
      slices: [
        {
          id: 'S01',
          title: 'First slice',
          risk: 'medium',
          dependsOn: [],
          completed: true,
          afterThis: 'S02 will extend this',
        },
        {
          id: 'S02',
          title: 'Second slice',
          risk: 'low',
          dependsOn: ['S01'],
          completed: false,
          afterThis: 'S03 will finalize',
        },
      ],
      completedSliceIds: ['S01'],
    },
    decisions: [
      { id: 'D001', scope: 'architecture', decision: 'Use TypeScript', choice: 'TypeScript adopted' },
      { id: 'D002', scope: 'testing', decision: 'Use bun:test', choice: 'bun:test adopted' },
    ],
  };
}

function getPromptOrThrow(result: ReturnType<typeof buildShapingKickoffPrompt>): string {
  if (result.outcome === 'ready') {
    return result.prompt;
  }
  throw new Error(`Expected ready outcome, got ${result.outcome}: ${result.message}`);
}

describe('buildShapingKickoffPrompt', () => {
  test('returns malformed_context when repo root is missing', () => {
    const incompleteContext = {
      ...createMinimalShapingContext(),
      repoRoot: '',
    } as ShapingContext;

    const result = buildShapingKickoffPrompt(incompleteContext);

    expect(result.outcome).toBe('malformed_context');
  });

  test('returns malformed_context when milestone has no slices', () => {
    const incompleteContext = createMinimalShapingContext();

    const result = buildShapingKickoffPrompt(incompleteContext);

    expect(result.outcome).toBe('malformed_context');
  });

  test('returns ready prompt with all sections for valid context', () => {
    const context = createCompleteShapingContext();
    const result = buildShapingKickoffPrompt(context);

    expect(result.outcome).toBe('ready');

    const prompt = getPromptOrThrow(result);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  test('includes Shaping completion instructions section', () => {
    const context = createCompleteShapingContext();
    const result = buildShapingKickoffPrompt(context);

    expect(result.outcome).toBe('ready');

    const prompt = getPromptOrThrow(result);
    expect(prompt).toContain('## Shaping completion instructions');
  });

  test('includes emission guidance text in completion section', () => {
    const context = createCompleteShapingContext();
    const result = buildShapingKickoffPrompt(context);

    expect(result.outcome).toBe('ready');

    const prompt = getPromptOrThrow(result);
    expect(prompt).toContain('when shaping is complete');
    expect(prompt).toContain('emit a reassessment artifact');
    expect(prompt).toContain('shaping extension\'s writeback interface');
    expect(prompt).toContain('TypeScript object literal');
    expect(prompt).toContain('ReassessmentArtifact');
  });

  test('includes Repo and milestone state section', () => {
    const context = createCompleteShapingContext();
    const result = buildShapingKickoffPrompt(context);

    expect(result.outcome).toBe('ready');

    const prompt = getPromptOrThrow(result);
    expect(prompt).toContain('## Repo and milestone state');
    expect(prompt).toContain('- Repo root: /test/repo');
    expect(prompt).toContain('- GSD root: /test/repo/.gsd');
    expect(prompt).toContain('- Active milestone: M001 Test Milestone');
  });

  test('includes Project context section with available fields', () => {
    const context = createCompleteShapingContext();
    const result = buildShapingKickoffPrompt(context);

    expect(result.outcome).toBe('ready');

    const prompt = getPromptOrThrow(result);
    expect(prompt).toContain('## Project context');
    expect(prompt).toContain('- What this is: A test project for unit testing');
    expect(prompt).toContain('- Current state: Development in progress');
    expect(prompt).toContain('- Milestone description: A test milestone with slices');
    expect(prompt).toContain('- Completed slices: S01');
  });

  test('includes Requirement contract section', () => {
    const context = createCompleteShapingContext();
    const result = buildShapingKickoffPrompt(context);

    expect(result.outcome).toBe('ready');

    const prompt = getPromptOrThrow(result);
    expect(prompt).toContain('## Requirement contract');
    expect(prompt).toContain('Active requirements:');
    expect(prompt).toContain('R001 Active requirement');
  });

  test('includes Decision register section', () => {
    const context = createCompleteShapingContext();
    const result = buildShapingKickoffPrompt(context);

    expect(result.outcome).toBe('ready');

    const prompt = getPromptOrThrow(result);
    expect(prompt).toContain('## Decision register');
    expect(prompt).toContain('[architecture]');
    expect(prompt).toContain('[testing]');
    expect(prompt).toContain('TypeScript adopted');
    expect(prompt).toContain('bun:test adopted');
  });

  test('includes Slice overview section with formatted slices', () => {
    const context = createCompleteShapingContext();
    const result = buildShapingKickoffPrompt(context);

    expect(result.outcome).toBe('ready');

    const prompt = getPromptOrThrow(result);
    expect(prompt).toContain('## Slice overview');
    expect(prompt).toContain('- S01 (done, risk:medium, depends:none) — First slice. After this: S02 will extend this');
    expect(prompt).toContain('- S02 (pending, risk:low, depends:S01) — Second slice. After this: S03 will finalize');
  });

  test('includes Stable artifacts consulted section', () => {
    const context = createCompleteShapingContext();
    const result = buildShapingKickoffPrompt(context);

    expect(result.outcome).toBe('ready');

    const prompt = getPromptOrThrow(result);
    expect(prompt).toContain('## Stable artifacts consulted');
    expect(prompt).toContain('- .gsd/PROJECT.md');
    expect(prompt).toContain('- .gsd/REQUIREMENTS.md');
    expect(prompt).toContain('- .gsd/DECISIONS.md');
    expect(prompt).toContain('- .gsd/milestones/M001/M001-CONTEXT.md');
    expect(prompt).toContain('- .gsd/milestones/M001/ROADMAP.md');
  });

  test('includes Kickoff task section with numbered steps', () => {
    const context = createCompleteShapingContext();
    const result = buildShapingKickoffPrompt(context);

    expect(result.outcome).toBe('ready');

    const prompt = getPromptOrThrow(result);
    expect(prompt).toContain('## Kickoff task');
    expect(prompt).toContain('1. Summarize the current shaping state');
    expect(prompt).toContain('2. Call out missing prerequisites or contradictions');
    expect(prompt).toContain('3. Recommend the smallest concrete next shaping action');
    expect(prompt).toContain('4. Keep shaping optional and non-blocking');
  });

  test('completion instructions section appears at the end of prompt', () => {
    const context = createCompleteShapingContext();
    const result = buildShapingKickoffPrompt(context);

    expect(result.outcome).toBe('ready');

    const prompt = getPromptOrThrow(result);
    const lines = prompt.split('\n');

    // Find the Shaping completion instructions section
    const completionSectionIndex = lines.findIndex((line) =>
      line === '## Shaping completion instructions'
    );

    // Verify it exists
    expect(completionSectionIndex).toBeGreaterThan(-1);

    // Verify Kickoff task comes before completion instructions
    const kickoffTaskIndex = lines.findIndex((line) => line === '## Kickoff task');
    expect(kickoffTaskIndex).toBeLessThan(completionSectionIndex);

    // Verify all content after completion section is related to completion instructions
    const afterCompletionLines = lines.slice(completionSectionIndex);
    const afterCompletionText = afterCompletionLines.join('\n');

    expect(afterCompletionText).toContain('when shaping is complete');
    expect(afterCompletionText).toContain('emit a reassessment artifact');
  });
});
