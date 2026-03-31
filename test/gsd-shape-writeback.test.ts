import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { addDecision, prepareMilestoneChangePayload, updateRequirementStatus } from '../.gsd/extensions/gsd-shape/writeback';
import type { NewDecision, RequirementUpdate } from '../.gsd/extensions/gsd-shape/types';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function createRepoFixture(options?: {
  requirements?: string;
  decisions?: string;
}): { gsdRoot: string; repoRoot: string } {
  const root = mkdtempSync(path.join(tmpdir(), 'gsd-shape-writeback-'));
  tempDirs.push(root);

  const gsdRoot = path.join(root, '.gsd');
  mkdirSync(gsdRoot, { recursive: true });

  writeFileSync(path.join(gsdRoot, 'REQUIREMENTS.md'), options?.requirements ?? defaultRequirements());
  writeFileSync(path.join(gsdRoot, 'DECISIONS.md'), options?.decisions ?? defaultDecisions());

  return { gsdRoot, repoRoot: root };
}

function defaultRequirements(): string {
  return [
    '# Requirements',
    '',
    '## Active',
    '',
    '| ID | Status | Notes |',
    '|----|--------|-------|',
    '| [R001] | active | Initial requirement |',
    '| [R002] | active | Another requirement |',
    '',
    '## Validated',
    '',
    '| ID | Status | Notes |',
    '|----|--------|-------|',
    '| [R005] | validated | Completed requirement |',
    '',
    '## Deferred',
    '',
    '| ID | Status | Notes |',
    '|----|--------|-------|',
    '| [R010] | deferred | Deferred for later |',
  ].join('\n');
}

function defaultDecisions(): string {
  return [
    '# Decisions Register',
    '',
    '## D001',
    '',
    '**Scope:** pattern',
    '**Decision:** How shaping outputs are persisted',
    '**Choice:** Stay inside GSD artifacts',
    '**Rationale:** Keeps the loop grounded.',
    '**Revisable:** Yes',
    '**Made by:** collaborative',
    '',
    '---',
    '',
  ].join('\n');
}

describe('updateRequirementStatus', () => {
  test('updates requirement status in REQUIREMENTS.md', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();

    await updateRequirementStatus(gsdRoot, repoRoot, {
      id: 'R001',
      status: 'validated',
    });

    const content = await require('node:fs/promises').readFile(path.join(gsdRoot, 'REQUIREMENTS.md'), 'utf-8');
    expect(content).toContain('[R001]');
    expect(content).toContain('validated');
    expect(content).toContain('Initial requirement');
  });

  test('appends notes to existing requirement', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();

    await updateRequirementStatus(gsdRoot, repoRoot, {
      id: 'R001',
      notes: 'Additional implementation notes',
    });

    const content = await require('node:fs/promises').readFile(path.join(gsdRoot, 'REQUIREMENTS.md'), 'utf-8');
    expect(content).toContain('[R001]');
    expect(content).toContain('Initial requirement');
    expect(content).toContain('Additional implementation notes');
  });

  test('appends validation info to notes', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();

    await updateRequirementStatus(gsdRoot, repoRoot, {
      id: 'R001',
      validation: 'Verified via integration test suite',
    });

    const content = await require('node:fs/promises').readFile(path.join(gsdRoot, 'REQUIREMENTS.md'), 'utf-8');
    expect(content).toContain('[R001]');
    expect(content).toContain('Validation: Verified via integration test suite');
  });

  test('updates status and notes together', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();

    await updateRequirementStatus(gsdRoot, repoRoot, {
      id: 'R001',
      status: 'validated',
      notes: 'Implementation complete',
      validation: 'All tests passing',
    });

    const content = await require('node:fs/promises').readFile(path.join(gsdRoot, 'REQUIREMENTS.md'), 'utf-8');
    expect(content).toContain('[R001]');
    expect(content).toContain('validated');
    expect(content).toContain('Implementation complete');
    expect(content).toContain('Validation: All tests passing');
  });

  test('appends to existing notes instead of replacing', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture({
      requirements: [
        '# Requirements',
        '',
        '## Active',
        '',
        '| ID | Status | Notes |',
        '|----|--------|-------|',
        '| [R001] | active | Existing note |',
      ].join('\n'),
    });

    await updateRequirementStatus(gsdRoot, repoRoot, {
      id: 'R001',
      notes: 'New note',
    });

    const content = await require('node:fs/promises').readFile(path.join(gsdRoot, 'REQUIREMENTS.md'), 'utf-8');
    expect(content).toContain('Existing note; New note');
  });

  test('throws error when requirement not found', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();

    await expect(
      updateRequirementStatus(gsdRoot, repoRoot, {
        id: 'R999',
        status: 'validated',
      })
    ).rejects.toThrow('Requirement R999 not found');
  });

  test('handles deferred requirements', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();

    await updateRequirementStatus(gsdRoot, repoRoot, {
      id: 'R010',
      status: 'active',
    });

    const content = await require('node:fs/promises').readFile(path.join(gsdRoot, 'REQUIREMENTS.md'), 'utf-8');
    expect(content).toContain('[R010]');
    expect(content).toContain('active');
  });

  test('handles multi-line requirement entries', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture({
      requirements: [
        '# Requirements',
        '',
        '## Active',
        '',
        '| ID | Status | Notes |',
        '|----|--------|-------|',
        '| [R001] | active | Line one',
        '| [R002] | active | Line two |',
      ].join('\n'),
    });

    await updateRequirementStatus(gsdRoot, repoRoot, {
      id: 'R002',
      status: 'validated',
    });

    const content = await require('node:fs/promises').readFile(path.join(gsdRoot, 'REQUIREMENTS.md'), 'utf-8');
    expect(content).toContain('[R002]');
    expect(content).toContain('validated');
    expect(content).toContain('[R001]'); // Should not affect R001
  });
});

describe('addDecision', () => {
  test('appends a new decision to DECISIONS.md', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();

    const newDecision: NewDecision = {
      scope: 'architecture',
      decision: 'Data storage backend',
      choice: 'Use PostgreSQL with JSONB',
      rationale: 'Relational ACID guarantees with flexible schema',
      revisable: 'Yes',
      made_by: 'agent',
    };

    await addDecision(gsdRoot, repoRoot, newDecision);

    const content = await require('node:fs/promises').readFile(path.join(gsdRoot, 'DECISIONS.md'), 'utf-8');
    expect(content).toContain('## D002');
    expect(content).toContain('Data storage backend');
    expect(content).toContain('Use PostgreSQL with JSONB');
    expect(content).toContain('Relational ACID guarantees with flexible schema');
  });

  test('auto-increments decision ID from existing entries', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture({
      decisions: [
        '# Decisions Register',
        '',
        '## D001',
        '',
        '**Scope:** pattern',
        '**Decision:** First decision',
        '**Choice:** Choice one',
        '**Rationale:** Rationale one',
        '',
        '---',
        '',
        '## D005',
        '',
        '**Scope:** library',
        '**Decision:** Fifth decision',
        '**Choice:** Choice five',
        '**Rationale:** Rationale five',
        '',
        '---',
        '',
      ].join('\n'),
    });

    const newDecision: NewDecision = {
      scope: 'test',
      decision: 'Test decision',
      choice: 'Test choice',
      rationale: 'Test rationale',
    };

    await addDecision(gsdRoot, repoRoot, newDecision);

    const content = await require('node:fs/promises').readFile(path.join(gsdRoot, 'DECISIONS.md'), 'utf-8');
    expect(content).toContain('## D006');
  });

  test('handles first decision whenDECISIONS.md is empty', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture({
      decisions: '# Decisions Register\n\n',
    });

    const newDecision: NewDecision = {
      scope: 'initial',
      decision: 'First ever decision',
      choice: 'Initial choice',
      rationale: 'Initial rationale',
    };

    await addDecision(gsdRoot, repoRoot, newDecision);

    const content = await require('node:fs/promises').readFile(path.join(gsdRoot, 'DECISIONS.md'), 'utf-8');
    expect(content).toContain('## D001');
  });

  test('includes optional fields when provided', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();

    const newDecision: NewDecision = {
      scope: 'test',
      decision: 'Full decision',
      choice: 'Full choice',
      rationale: 'Full rationale',
      revisable: 'No',
      when_context: 'M001',
      made_by: 'human',
    };

    await addDecision(gsdRoot, repoRoot, newDecision);

    const content = await require('node:fs/promises').readFile(path.join(gsdRoot, 'DECISIONS.md'), 'utf-8');
    expect(content).toContain('**Revisable:** No');
    expect(content).toContain('**When/Context:** M001');
    expect(content).toContain('**Made by:** human');
  });

  test('omits optional fields when not provided', async () => {
    const { gsdRoot, repoRoot } = createRepoFixture();

    const newDecision: NewDecision = {
      scope: 'test',
      decision: 'Minimal decision',
      choice: 'Minimal choice',
      rationale: 'Minimal rationale',
    };

    await addDecision(gsdRoot, repoRoot, newDecision);

    const content = await require('node:fs/promises').readFile(path.join(gsdRoot, 'DECISIONS.md'), 'utf-8');
    expect(content).toContain('## D002'); // ID auto-assigned
    expect(content).toContain('Minimal decision');
    expect(content).toContain('Minimal choice');
    expect(content).toContain('Minimal rationale');
    // Check that the new D002 decision doesn't contain optional fields
    // Extract just the D002 section and verify it doesn't have those fields
    const d002Match = content.match(/## D002\n\n([\s\S]*?)\n\n---/);
    expect(d002Match).toBeTruthy();
    if (d002Match) {
      const d002Section = d002Match[1];
      expect(d002Section).not.toContain('**Revisable:**');
      expect(d002Section).not.toContain('**When/Context:**');
      expect(d002Section).not.toContain('**Made by:**');
    }
  });
});

describe('prepareMilestoneChangePayload', () => {
  test('validates and returns complete milestone change payload', () => {
    const payload = {
      milestoneId: 'M001',
      title: 'Extension foundation',
      vision: 'Build extension shell',
      successCriteria: ['Criterion 1', 'Criterion 2'],
      keyRisks: [{ risk: 'Risk 1', whyItMatters: 'Important' }],
      proofStrategy: [{ riskOrUnknown: 'Unknown 1', retireIn: 'S01', whatWillBeProven: 'Proof 1' }],
      verificationContract: 'Contract text',
      verificationIntegration: 'Integration text',
      verificationOperational: 'Operational text',
      verificationUat: 'UAT text',
      definitionOfDone: ['Done item 1', 'Done item 2'],
      requirementCoverage: 'Coverage text',
      boundaryMapMarkdown: '# Boundary Map',
      slices: [
        {
          sliceId: 'S01',
          title: 'Slice 1',
          risk: 'high',
          depends: [],
          demo: 'After S01',
          goal: 'Goal 1',
          successCriteria: 'Success criteria 1',
          proofLevel: 'PROOF_1',
          integrationClosure: 'Integration 1',
          observabilityImpact: 'Observability 1',
        },
      ],
    };

    const result = prepareMilestoneChangePayload(payload);

    expect(result.milestoneId).toBe('M001');
    expect(result.successCriteria).toHaveLength(2);
    expect(result.slices).toHaveLength(1);
    expect(result.slices[0].sliceId).toBe('S01');
  });

  test('throws error when milestoneId is missing', () => {
    const payload = {
      title: 'Test',
      vision: 'Test',
      successCriteria: ['Valid'],
      keyRisks: [],
      proofStrategy: [],
      verificationContract: 'Test',
      verificationIntegration: 'Test',
      verificationOperational: 'Test',
      verificationUat: 'Test',
      definitionOfDone: ['Valid'],
      requirementCoverage: 'Test',
      boundaryMapMarkdown: 'Test',
      slices: [],
    };

    expect(() => prepareMilestoneChangePayload(payload as any)).toThrow('milestoneId is required');
  });

  test('throws error when title is missing', () => {
    const payload = {
      milestoneId: 'M001',
      vision: 'Test',
      successCriteria: ['Valid'],
      keyRisks: [],
      proofStrategy: [],
      verificationContract: 'Test',
      verificationIntegration: 'Test',
      verificationOperational: 'Test',
      verificationUat: 'Test',
      definitionOfDone: ['Valid'],
      requirementCoverage: 'Test',
      boundaryMapMarkdown: 'Test',
      slices: [],
    };

    expect(() => prepareMilestoneChangePayload(payload as any)).toThrow('title is required');
  });

  test('throws error when successCriteria is empty', () => {
    const payload = {
      milestoneId: 'M001',
      title: 'Test',
      vision: 'Test',
      successCriteria: [],
      keyRisks: [],
      proofStrategy: [],
      verificationContract: 'Test',
      verificationIntegration: 'Test',
      verificationOperational: 'Test',
      verificationUat: 'Test',
      definitionOfDone: ['Valid'],
      requirementCoverage: 'Test',
      boundaryMapMarkdown: 'Test',
      slices: [],
    };

    expect(() => prepareMilestoneChangePayload(payload)).toThrow('successCriteria must be a non-empty array');
  });

  test('throws error when definitionOfDone is empty', () => {
    const payload = {
      milestoneId: 'M001',
      title: 'Test',
      vision: 'Test',
      successCriteria: ['Valid'],
      keyRisks: [],
      proofStrategy: [],
      verificationContract: 'Test',
      verificationIntegration: 'Test',
      verificationOperational: 'Test',
      verificationUat: 'Test',
      definitionOfDone: [],
      requirementCoverage: 'Test',
      boundaryMapMarkdown: 'Test',
      slices: [],
    };

    expect(() => prepareMilestoneChangePayload(payload)).toThrow('definitionOfDone must be a non-empty array');
  });

  test('throws error when slices array is missing', () => {
    const payload = {
      milestoneId: 'M001',
      title: 'Test',
      vision: 'Test',
      successCriteria: ['Valid'],
      keyRisks: [],
      proofStrategy: [],
      verificationContract: 'Test',
      verificationIntegration: 'Test',
      verificationOperational: 'Test',
      verificationUat: 'Test',
      definitionOfDone: ['Valid'],
      requirementCoverage: 'Test',
      boundaryMapMarkdown: 'Test',
    };

    expect(() => prepareMilestoneChangePayload(payload as any)).toThrow('slices is required');
  });

  test('throws error when slice is missing required fields', () => {
    const payload = {
      milestoneId: 'M001',
      title: 'Test',
      vision: 'Test',
      successCriteria: ['Valid'],
      keyRisks: [],
      proofStrategy: [],
      verificationContract: 'Test',
      verificationIntegration: 'Test',
      verificationOperational: 'Test',
      verificationUat: 'Test',
      definitionOfDone: ['Valid'],
      requirementCoverage: 'Test',
      boundaryMapMarkdown: 'Test',
      slices: [
        {
          sliceId: 'S01',
          title: 'Slice 1',
          risk: 'high',
          depends: [],
        } as any,
      ],
    };

    expect(() => prepareMilestoneChangePayload(payload)).toThrow('Slice S01 is missing demo');
  });

  test('throws error for missing sliceId', () => {
    const payload = {
      milestoneId: 'M001',
      title: 'Test',
      vision: 'Test',
      successCriteria: ['Valid'],
      keyRisks: [],
      proofStrategy: [],
      verificationContract: 'Test',
      verificationIntegration: 'Test',
      verificationOperational: 'Test',
      verificationUat: 'Test',
      definitionOfDone: ['Valid'],
      requirementCoverage: 'Test',
      boundaryMapMarkdown: 'Test',
      slices: [
        {
          title: 'Slice 1',
          risk: 'high',
          depends: [],
          demo: 'After S01',
          goal: 'Goal 1',
          successCriteria: 'Success criteria 1',
          proofLevel: 'PROOF_1',
          integrationClosure: 'Integration 1',
          observabilityImpact: 'Observability 1',
        } as any,
      ],
    };

    expect(() => prepareMilestoneChangePayload(payload)).toThrow('Slice at index 0 is missing sliceId');
  });

  test('validates multiple slices', () => {
    const payload = {
      milestoneId: 'M001',
      title: 'Test',
      vision: 'Test',
      successCriteria: ['Valid'],
      keyRisks: [],
      proofStrategy: [],
      verificationContract: 'Test',
      verificationIntegration: 'Test',
      verificationOperational: 'Test',
      verificationUat: 'Test',
      definitionOfDone: ['Valid'],
      requirementCoverage: 'Test',
      boundaryMapMarkdown: 'Test',
      slices: [
        {
          sliceId: 'S01',
          title: 'Slice 1',
          risk: 'high',
          depends: [],
          demo: 'After S01',
          goal: 'Goal 1',
          successCriteria: 'Success criteria 1',
          proofLevel: 'PROOF_1',
          integrationClosure: 'Integration 1',
          observabilityImpact: 'Observability 1',
        },
        {
          sliceId: 'S02',
          title: 'Slice 2',
          risk: 'medium',
          depends: ['S01'],
          demo: 'After S02',
          goal: 'Goal 2',
          successCriteria: 'Success criteria 2',
          proofLevel: 'PROOF_2',
          integrationClosure: 'Integration 2',
          observabilityImpact: 'Observability 2',
        },
      ],
    };

    const result = prepareMilestoneChangePayload(payload);

    expect(result.slices).toHaveLength(2);
    expect(result.slices[0].sliceId).toBe('S01');
    expect(result.slices[1].sliceId).toBe('S02');
    expect(result.slices[1].depends).toEqual(['S01']);
  });

  test('preserves optional fields in output', () => {
    const payload = {
      milestoneId: 'M001',
      title: 'Test',
      vision: 'Test',
      successCriteria: ['Valid'],
      keyRisks: [],
      proofStrategy: [],
      verificationContract: 'Test',
      verificationIntegration: 'Test',
      verificationOperational: 'Test',
      verificationUat: 'Test',
      definitionOfDone: ['Valid'],
      requirementCoverage: 'Test',
      boundaryMapMarkdown: 'Test',
      slices: [
        {
          sliceId: 'S01',
          title: 'Slice 1',
          risk: 'high',
          depends: [],
          demo: 'After S01',
          goal: 'Goal 1',
          successCriteria: 'Success criteria 1',
          proofLevel: 'PROOF_1',
          integrationClosure: 'Integration 1',
          observabilityImpact: 'Observability 1',
        },
      ],
      status: 'active',
      dependsOn: [],
    };

    const result = prepareMilestoneChangePayload(payload);

    expect(result.status).toBe('active');
    expect(result.dependsOn).toEqual([]);
  });
});
