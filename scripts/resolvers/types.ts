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

// ─── Host Capabilities ─────────────────────────────────────────────────────

/**
 * Host-specific capabilities derived from the canonical contract.
 * Generator code queries these capabilities instead of using `host === 'X'` conditionals.
 */
export interface HostCapabilities {
  /** The host this contract applies to */
  host: Host;
  /** Human-readable name for error messages */
  displayName: string;
  /** Uses runtime root override (GSTACK_ROOT env vars for codex, local path resolution for opencode) */
  usesRuntimeRoot: boolean;
  /** Skill directory naming: 'gstack-skill' for codex/opencode, raw name for Claude */
  prefixesSkillName: boolean;
  /** Generates OpenAI YAML for codex/opencode (Claude uses native frontmatter) */
  generatesOpenAIYaml: boolean;
  /** Includes Codex CLI integration blocks (Claude and Open Code can call Codex, Codex cannot call itself) */
  includesCodexCliBlock: boolean;
  /** Skill directories: where skill README/SKILL.md files are written */
  skillDir: {
    /** The root skills directory for this host (e.g., '.agents/skills', '.opencode/skills') */
    root: string;
    /** The full path to the gstack skills directory */
    gstackPath: string;
  };
}

/**
 * Host capabilities derived from the canonical types.
 * Each host defines its behavior contract once, and generator code queries this map.
 */
export const HOST_CAPABILITIES: Record<Host, HostCapabilities> = {
  claude: {
    host: 'claude',
    displayName: 'Claude',
    usesRuntimeRoot: false,
    prefixesSkillName: false,
    generatesOpenAIYaml: false,
    includesCodexCliBlock: true,
    skillDir: {
      root: '.claude/skills',
      gstackPath: '.claude/skills/gstack',
    },
  },
  codex: {
    host: 'codex',
    displayName: 'Codex',
    usesRuntimeRoot: true,
    prefixesSkillName: true,
    generatesOpenAIYaml: true,
    includesCodexCliBlock: false,
    skillDir: {
      root: '.agents/skills',
      gstackPath: '.agents/skills/gstack',
    },
  },
  opencode: {
    host: 'opencode',
    displayName: 'OpenCode',
    usesRuntimeRoot: true,
    prefixesSkillName: true,
    generatesOpenAIYaml: true,
    includesCodexCliBlock: true,
    skillDir: {
      root: '.opencode/skills',
      gstackPath: '.opencode/skills/gstack',
    },
  },
};
