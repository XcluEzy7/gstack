export type Host = 'claude' | 'codex' | 'opencode';

export interface HostPaths {
  skillRoot: string;
  localSkillRoot: string;
  binDir: string;
  browseDir: string;
}

export const HOST_PATHS: Record<Host, HostPaths> = {
  claude: {
    skillRoot: '~/.claude/skills/gstack',
    localSkillRoot: '.claude/skills/gstack',
    binDir: '~/.claude/skills/gstack/bin',
    browseDir: '~/.claude/skills/gstack/browse/dist',
  },
  codex: {
    skillRoot: '$GSTACK_ROOT',
    localSkillRoot: '.agents/skills/gstack',
    binDir: '$GSTACK_BIN',
    browseDir: '$GSTACK_BROWSE',
  },
  opencode: {
    skillRoot: '~/.config/opencode/skills/gstack',
    localSkillRoot: '.opencode/skills/gstack',
    binDir: '~/.config/opencode/skills/gstack/bin',
    browseDir: '~/.config/opencode/skills/gstack/browse/dist',
  },
};

export interface TemplateContext {
  skillName: string;
  tmplPath: string;
  benefitsFrom?: string[];
  host: Host;
  paths: HostPaths;
  preambleTier?: number;  // 1-4, controls which preamble sections are included
}

/**
 * Documents the skill discovery contract for a host.
 * OpenCode uses local-before-global precedence: .opencode/skills/ takes priority
 * over ~/.config/opencode/skills/ for project-specific installations.
 */
export interface DiscoveryContract {
  /** The host this contract applies to */
  host: Host;
  /** Human-readable description of discovery precedence */
  precedence: string;
  /** Ordered list of discovery paths (highest priority first) */
  discoveryPaths: string[];
}

/**
 * OpenCode discovery contract: local skills take precedence over global.
 *
 * OpenCode is unique among gstack hosts in that it checks project-local skills
 * before user-global skills. This enables:
 * - Project-specific skill overrides
 * - Team-shared configurations in .opencode/skills/
 * - Isolated development environments
 */
export const OPENCODE_DISCOVERY_CONTRACT: DiscoveryContract = {
  host: 'opencode',
  precedence: 'local-before-global',
  discoveryPaths: [
    '.opencode/skills/',           // Project-local (highest priority)
    '~/.config/opencode/skills/',  // User-global
  ],
};
