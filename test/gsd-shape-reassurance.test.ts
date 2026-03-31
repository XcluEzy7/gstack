import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { writeReassuranceArtifact } from '../.gsd/extensions/gsd-shape/writeback';
import type { ReassessmentArtifact } from '../.gsd/extensions/gsd-shape/types';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function createRepoFixture(): { gsdRoot: string; repoRoot: string } {
  const root = mkdtempSync(path.join(tmpdir(), 'gsd-shape-reassurance-'));
  tempDirs.push(root);

  const gsdRoot = path.join(root, '.gsd');
  mkdirSync(gsdRoot, { recursive: true });

  return { gsdRoot, repoRoot: root };
}

function createMilestoneLevelArtifact(): ReassessmentArtifact {
  return {
    milestoneId: 'M001',
    sliceId: undefined,
    researchedAt: '2025-04-01T12:00:00Z',
    confidence: 85,
    summary: 'Milestone M001 reassessment completed. Architecture decisions validated.',
    findings: {
      learned: 'Learned that the extension system requires explicit boundary enforcement for file operations.',
      sharpened: 'Sharpened the understanding of GSD artifact conventions for milestone-level vs slice-level outputs.',
      debated: 'Debated whether reassessment should support both milestone and slice scopes.',
    },
    nextMilestone: {
      title: 'M002: Advanced features',
      goal: 'Implement advanced shaping capabilities',
      deliverables: [
        'Reassurance artifact persistence',
        'Next milestone drafts',
        'Handoff contracts',
      ],
      risks: [
        'Complexity may increase',
        'Testing coverage needed',
      ],
    },
    provides: [
      'Grounded research output',
      'Concrete next-milestone draft',
    ],
    affects: [
      'M002 scope',
      'S04 implementation',
    ],
  };
}

function createSliceLevelArtifact(): ReassessmentArtifact {
  return {
    milestoneId: 'M001',
    sliceId: 'S03',
    researchedAt: '2025-04-01T12:00:00Z',
    confidence: 90,
    summary: 'Slice S03 reassessment completed. Reassessment artifact and handoff contract implemented.',
    findings: {
      learned: 'Learned that the writeback pattern from S02 applies cleanly to new artifact types.',
      sharpened: 'Sharpened filepath resolution logic for milestone vs slice scopes.',
      debated: 'Debated markdown section naming conventions.',
    },
    nextMilestone: {
      title: 'M002: Advanced features',
      goal: 'Implement advanced shaping capabilities',
      deliverables: [
        'Testing infrastructure',
        'Documentation updates',
      ],
      risks: [
        'Integration complexity',
      ],
    },
    provides: [
      'Reassurance artifact type',
      'Writeback function',
    ],
    affects: [
      'T03 implementation',
      'S04 planning',
    ],
  };
}

function createEmptyFieldsArtifact(): ReassessmentArtifact {
  return {
    milestoneId: 'M001',
    sliceId: 'EMPTY',
    researchedAt: '2025-04-01T12:00:00Z',
    confidence: 50,
    summary: 'Empty artifact for testing.',
    findings: {
      learned: '',
      sharpened: '',
      debated: '',
    },
    nextMilestone: {
      title: 'M002',
      goal: 'Goal',
      deliverables: [],
      risks: [],
    },
    provides: [],
    affects: [],
  };
}

describe('writeReassuranceArtifact', () => {
  test('writes milestone-level reassessment artifact', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();
    const artifact = createMilestoneLevelArtifact();

    const relativePath = await writeReassuranceArtifact(gsdRoot, repoRoot, artifact);

    // Verify returned path
    expect(relativePath).toBe('.gsd/milestones/M001/M001-REASSESSMENT.md');

    // Verify file exists
    const filepath = path.join(repoRoot, relativePath);
    const content = readFileSync(filepath, 'utf-8');

    // Verify markdown sections
    expect(content).toContain('# Reassessment: M001');
    expect(content).toContain('**Researched at:** 2025-04-01T12:00:00Z');
    expect(content).toContain('**Confidence:** 85%');
    expect(content).toContain('## Summary');
    expect(content).toContain('Milestone M001 reassessment completed.');
    expect(content).toContain('## What Was Learned');
    expect(content).toContain('Learned that the extension system');
    expect(content).toContain('## What Was Sharpened');
    expect(content).toContain('Sharpened the understanding');
    expect(content).toContain('## What Was Debated');
    expect(content).toContain('Debated whether reassessment');
    expect(content).toContain('## Next Milestone');
    expect(content).toContain('**Title:** M002: Advanced features');
    expect(content).toContain('**Goal:** Implement advanced shaping capabilities');
    expect(content).toContain('**Deliverables:**');
    expect(content).toContain('- Reassurance artifact persistence');
    expect(content).toContain('**Risks:**');
    expect(content).toContain('- Complexity may increase');
    expect(content).toContain('## Provides');
    expect(content).toContain('- Grounded research output');
    expect(content).toContain('## Affects');
    expect(content).toContain('- M002 scope');
  });

  test('writes slice-level reassessment artifact', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();
    const artifact = createSliceLevelArtifact();

    const relativePath = await writeReassuranceArtifact(gsdRoot, repoRoot, artifact);

    // Verify returned path
    expect(relativePath).toBe('.gsd/milestones/M001/slices/S03/S03-REASSESSMENT.md');

    // Verify file exists
    const filepath = path.join(repoRoot, relativePath);
    const content = readFileSync(filepath, 'utf-8');

    // Verify markdown sections
    expect(content).toContain('# Reassessment: M001 / S03');
    expect(content).toContain('**Confidence:** 90%');
    expect(content).toContain('## Summary');
    expect(content).toContain('Slice S03 reassessment completed.');
    expect(content).toContain('## What Was Learned');
    expect(content).toContain('Learned that the writeback pattern');
    expect(content).toContain('## What Was Sharpened');
    expect(content).toContain('Sharpened filepath resolution logic');
    expect(content).toContain('## What Was Debated');
    expect(content).toContain('Debated markdown section naming');
    expect(content).toContain('## Next Milestone');
    expect(content).toContain('**Title:** M002: Advanced features');
    expect(content).toContain('**Deliverables:**');
    expect(content).toContain('- Testing infrastructure');
    expect(content).toContain('**Risks:**');
    expect(content).toContain('- Integration complexity');
    expect(content).toContain('## Provides');
    expect(content).toContain('- Reassurance artifact type');
    expect(content).toContain('## Affects');
    expect(content).toContain('- T03 implementation');
  });

  test('throws error when path escapes repo boundary', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();
    const artifact = createMilestoneLevelArtifact();

    // Craft a malicious milestoneId that tries to escape the repo
    const maliciousArtifact: ReassessmentArtifact = {
      ...artifact,
      milestoneId: '../../../etc',
    };

    await expect(
      writeReassuranceArtifact(gsdRoot, repoRoot, maliciousArtifact)
    ).rejects.toThrow('escapes repo root');
  });

  test(' handles empty artifact fields gracefully', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();
    const artifact = createEmptyFieldsArtifact();

    const relativePath = await writeReassuranceArtifact(gsdRoot, repoRoot, artifact);

    // Verify file is created
    const filepath = path.join(repoRoot, relativePath);
    const content = readFileSync(filepath, 'utf-8');

    // Verify sections exist even with empty content
    expect(content).toContain('# Reassessment: M001 / EMPTY');
    expect(content).toContain('**Confidence:** 50%');
    expect(content).toContain('## Summary');
    expect(content).toContain('Empty artifact for testing.');
    expect(content).toContain('## What Was Learned');
    expect(content).toContain('## What Was Sharpened');
    expect(content).toContain('## What Was Debated');
    expect(content).toContain('## Next Milestone');
    expect(content).toContain('**Title:** M002');
    expect(content).toContain('**Goal:** Goal');

    // Provides and Affects sections should NOT appear when empty
    expect(content).not.toContain('## Provides');
    expect(content).not.toContain('## Affects');
  });

  test('creates parent directories if they do not exist', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();
    const artifact = createSliceLevelArtifact();

    // Verify directories do not exist yet
    const milestoneDir = path.join(gsdRoot, 'milestones', 'M001', 'slices', 'S03');
    expect(() => readFileSync(milestoneDir)).toThrow();

    // Write artifact
    await writeReassuranceArtifact(gsdRoot, repoRoot, artifact);

    // Verify directory was created
    const content = readFileSync(path.join(milestoneDir, 'S03-REASSESSMENT.md'), 'utf-8');
    expect(content).toContain('# Reassessment: M001 / S03');
  });

  test('validates fixture structure across milestone and slice scenarios', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();

    // Test milestone-level fixture
    const milestoneArtifact = createMilestoneLevelArtifact();
    const milestonePath = await writeReassuranceArtifact(gsdRoot, repoRoot, milestoneArtifact);
    const milestoneContent = readFileSync(path.join(repoRoot, milestonePath), 'utf-8');

    // Critical fields present
    expect(milestonePath).toContain('M001-REASSESSMENT.md');
    expect(milestoneContent).toContain('## Summary');
    expect(milestoneContent).toContain('## What Was Learned');
    expect(milestoneContent).toContain('## What Was Sharpened');
    expect(milestoneContent).toContain('## What Was Debated');
    expect(milestoneContent).toContain('## Next Milestone');
    expect(milestoneContent).toContain('## Provides');
    expect(milestoneContent).toContain('## Affects');

    // Test slice-level fixture
    const sliceArtifact = createSliceLevelArtifact();
    const slicePath = await writeReassuranceArtifact(gsdRoot, repoRoot, sliceArtifact);
    const sliceContent = readFileSync(path.join(repoRoot, slicePath), 'utf-8');

    // Critical fields present
    expect(slicePath).toContain('S03-REASSESSMENT.md');
    expect(sliceContent).toContain('M001 / S03');
    expect(sliceContent).toContain('## Summary');
    expect(sliceContent).toContain('## What Was Learned');
    expect(sliceContent).toContain('## What Was Sharpened');
    expect(sliceContent).toContain('## What Was Debated');
    expect(sliceContent).toContain('## Next Milestone');
    expect(sliceContent).toContain('## Provides');
    expect(sliceContent).toContain('## Affects');

    // Verify different paths
    expect(milestonePath).not.toBe(slicePath);
    expect(milestonePath).toContain('M001/');
    expect(slicePath).toContain('M001/slices/S03/');
  });

  test('overwrites existing artifact file', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();
    const artifact = createMilestoneLevelArtifact();

    // Write first version
    await writeReassuranceArtifact(gsdRoot, repoRoot, artifact);

    // Modify and write second version
    const updatedArtifact: ReassessmentArtifact = {
      ...artifact,
      confidence: 95,
      summary: 'Updated summary',
    };

    await writeReassuranceArtifact(gsdRoot, repoRoot, updatedArtifact);

    // Verify file contains updated content
    const filepath = path.join(repoRoot, '.gsd', 'milestones', 'M001', 'M001-REASSESSMENT.md');
    const content = readFileSync(filepath, 'utf-8');

    expect(content).toContain('**Confidence:** 95%');
    expect(content).toContain('Updated summary');
    expect(content).not.toContain('**Confidence:** 85%');
  });

  test('handles single deliverable and single risk', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();
    const artifact: ReassessmentArtifact = {
      ...createMilestoneLevelArtifact(),
      nextMilestone: {
        title: 'M003',
        goal: 'Single item test',
        deliverables: ['Single deliverable'],
        risks: ['Single risk'],
      },
    };

    await writeReassuranceArtifact(gsdRoot, repoRoot, artifact);
    const filepath = path.join(repoRoot, '.gsd', 'milestones', 'M001', 'M001-REASSESSMENT.md');
    const content = readFileSync(filepath, 'utf-8');

    expect(content).toContain('**Deliverables:**');
    expect(content).toContain('- Single deliverable');
    expect(content).toContain('**Risks:**');
    expect(content).toContain('- Single risk');
  });

  test('handles multiple provides and affects', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();
    const artifact: ReassessmentArtifact = {
      ...createMilestoneLevelArtifact(),
      provides: [
        'Feature 1',
        'Feature 2',
        'Feature 3',
      ],
      affects: [
        'Team A',
        'Team B',
      ],
    };

    await writeReassuranceArtifact(gsdRoot, repoRoot, artifact);
    const filepath = path.join(repoRoot, '.gsd', 'milestones', 'M001', 'M001-REASSESSMENT.md');
    const content = readFileSync(filepath, 'utf-8');

    expect(content).toContain('## Provides');
    expect(content).toContain('- Feature 1');
    expect(content).toContain('- Feature 2');
    expect(content).toContain('- Feature 3');
    expect(content).toContain('## Affects');
    expect(content).toContain('- Team A');
    expect(content).toContain('- Team B');
  });
});
