/**
 * Mock Data Factories
 *
 * Generates raw backend data matching the exact ClickHouse response format.
 * Every factory returns data typed as the raw type EXACTLY.
 * No external dependencies -- just pure functions with built-in defaults.
 */

import type {
  RawExecSummaryRow,
  RawTeamMemberRow,
  RawIcAggregateRow,
  RawLocTrendRow,
  RawDeliveryTrendRow,
  RawBulletAggregateRow,
} from '../rawTypes';

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Deterministic pseudo-random variation based on index */
function vary(base: number, index: number, spread: number): number {
  const hash = Math.sin(index * 9301 + 49297) * 49297;
  const factor = (hash - Math.floor(hash)) * 2 - 1; // -1 to 1
  return Math.round((base + factor * spread) * 10) / 10;
}

/** ISO date string for N weeks ago from today */
function isoDate(weeksAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - weeksAgo * 7);
  return d.toISOString().split('T')[0];
}

/** Simple hash of a string to a number (deterministic) */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}


// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

import { TEAMS, PEOPLE, teamMembers, teamHeadcount } from './registry';
export { TEAMS, PEOPLE, teamMembers, teamHeadcount };

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Mock-only value ranges — used only for synthetic data generation.
// These numbers never appear in the UI; they only seed the vary() function.
// All display ranges come from p5/p95 computed from the generated data itself.
// ---------------------------------------------------------------------------

import { IC_BULLET_DEFS as IC_DEFS_CONFIG, BULLET_DEFS as TEAM_DEFS_CONFIG } from '../thresholdConfig';

/** [min, max] generation bounds for each metric_key, mock only. */
const MOCK_RANGES: Record<string, [number, number]> = {
  // task_delivery
  tasks_completed: [2, 15], task_dev_time: [8, 31], estimation_accuracy: [0, 3],
  task_reopen_rate: [0, 15], due_date_compliance: [40, 100],
  // git_output
  commits: [8, 55], prs_created: [2, 14], prs_merged: [0, 20], clean_loc: [1000, 18000],
  // code_quality
  reviews_given: [0, 20], rework_ratio: [0, 50], build_success: [70, 100],
  pr_cycle_time: [0, 72], pickup_time: [0, 48], bugs_fixed: [0, 30],
  bug_reopen_rate: [0, 30], prs_per_dev: [0, 20],
  // ai_tools
  cursor_completions: [200, 5000], cursor_agents: [2, 40], cursor_lines: [0, 5000],
  cc_sessions: [0, 60], cc_tool_accept: [0, 100], cc_lines: [0, 3000],
  ai_loc_share2: [0, 34], claude_web: [0, 80], chatgpt: [0, 40],
  // ai_adoption (team)
  active_ai_members: [0, 12], cursor_active: [0, 12], cc_active: [0, 12],
  codex_active: [0, 12], team_ai_loc: [0, 50], cursor_acceptance: [0, 100],
  cc_tool_acceptance: [0, 100],
  // estimation (team)
  overrun_ratio: [1, 3], scope_completion: [0, 100], scope_creep: [0, 50],
  on_time_delivery: [0, 100], avg_slip: [0, 6],
  // collab
  slack_thread_participation: [0, 80], slack_message_engagement: [0, 5],
  slack_dm_ratio: [0, 100], m365_teams_messages: [0, 400], m365_emails_sent: [0, 120],
  m365_files_shared: [0, 30], meeting_hours: [4, 28], zoom_calls: [0, 20],
  meeting_free: [0, 10],
};

type IcMockDefault = { defaultValue: number; unit: string };
const IC_MOCK_DEFAULTS: Record<string, IcMockDefault> = Object.fromEntries(
  IC_DEFS_CONFIG.map((d) => {
    const [min, max] = MOCK_RANGES[d.metric_key] ?? [0, 100];
    const defaultValue = Math.round((min + (max - min) * 0.65) * 10) / 10;
    return [d.metric_key, { defaultValue, unit: d.unit }];
  }),
);

// IC sections -> metric keys mapping
const IC_SECTIONS: Record<string, string[]> = {
  task_delivery: ['tasks_completed', 'task_dev_time', 'estimation_accuracy', 'task_reopen_rate', 'due_date_compliance'],
  git_output: ['commits', 'prs_created', 'prs_merged', 'clean_loc'],
  code_quality: ['reviews_given', 'rework_ratio', 'build_success', 'pr_cycle_time', 'pickup_time', 'bugs_fixed', 'bug_reopen_rate'],
  ai_tools: ['cursor_completions', 'cursor_agents', 'cursor_lines', 'cc_sessions', 'cc_tool_accept', 'cc_lines', 'ai_loc_share2', 'claude_web', 'chatgpt'],
  collab: ['slack_thread_participation', 'slack_message_engagement', 'slack_dm_ratio', 'm365_teams_messages', 'm365_emails_sent', 'm365_files_shared', 'meeting_hours', 'zoom_calls', 'meeting_free'],
};

// ---------------------------------------------------------------------------
// Single row factories
// ---------------------------------------------------------------------------

export function mockExecRow(overrides?: Partial<RawExecSummaryRow>): RawExecSummaryRow {
  return {
    org_unit_id: 'platform',
    org_unit_name: 'Platform',
    headcount: 12,
    tasks_closed: 48,
    bugs_fixed: 18,
    build_success_pct: 94,
    focus_time_pct: 72,
    ai_adoption_pct: 68,
    ai_loc_share_pct: 22,
    pr_cycle_time_h: 18,
    ...overrides,
  };
}

export function mockTeamMemberRow(overrides?: Partial<RawTeamMemberRow>): RawTeamMemberRow {
  return {
    person_id: 'p1',
    display_name: 'Alice Kim',
    seniority: 'Senior',
    tasks_closed: 12,
    bugs_fixed: 5,
    dev_time_h: 14,
    prs_merged: 11,
    build_success_pct: 96,
    focus_time_pct: 72,
    ai_tools: ['Cursor', 'Claude Code'],
    ai_loc_share_pct: 27,
    ...overrides,
  };
}

export function mockIcAggregateRow(overrides?: Partial<RawIcAggregateRow>): RawIcAggregateRow {
  return {
    person_id: 'p1',
    loc: 12000,
    ai_loc_share_pct: 27,
    prs_merged: 9,
    pr_cycle_time_h: 18,
    focus_time_pct: 72,
    tasks_closed: 12,
    bugs_fixed: 23,
    build_success_pct: 96,
    ai_sessions: 42,
    ...overrides,
  };
}

export function mockLocTrendRow(overrides?: Partial<RawLocTrendRow>): RawLocTrendRow {
  return {
    date_bucket: isoDate(1),
    ai_loc: 920,
    code_loc: 2800,
    spec_lines: 210,
    ...overrides,
  };
}

export function mockDeliveryTrendRow(overrides?: Partial<RawDeliveryTrendRow>): RawDeliveryTrendRow {
  return {
    date_bucket: isoDate(1),
    commits: 9,
    prs_merged: 3,
    tasks_done: 3,
    ...overrides,
  };
}

export function mockBulletRow(overrides?: Partial<RawBulletAggregateRow>): RawBulletAggregateRow {
  return {
    metric_key: 'tasks_completed',
    value: 5.3,
    median: 5.8,
    p5: null,
    p25: null,
    p75: null,
    p95: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Batch generators
// ---------------------------------------------------------------------------

export function mockExecRows(count = TEAMS.length): RawExecSummaryRow[] {
  return Array.from({ length: count }, (_, i) => {
    const t = TEAMS[i % TEAMS.length];
    return mockExecRow({
      org_unit_id: t.id,
      org_unit_name: t.name,
      headcount: teamHeadcount(t.id),
      tasks_closed: Math.round(vary(35, i, 15)),
      bugs_fixed: Math.round(vary(12, i, 7)),
      build_success_pct: Math.min(100, Math.max(70, Math.round(vary(90, i, 8)))),
      focus_time_pct: Math.min(100, Math.max(30, Math.round(vary(63, i, 15)))),
      ai_adoption_pct: Math.min(100, Math.max(10, Math.round(vary(58, i, 20)))),
      ai_loc_share_pct: Math.min(50, Math.max(0, Math.round(vary(20, i, 12)))),
      pr_cycle_time_h: Math.max(5, Math.round(vary(22, i, 8))),
    });
  });
}

export function mockTeamMemberRows(count = PEOPLE.length): RawTeamMemberRow[] {
  return PEOPLE.slice(0, count).map((p, i) => {
    const hasAi = p.ai_tools.length > 0;
    return mockTeamMemberRow({
      person_id: p.person_id,
      display_name: p.name,
      seniority: p.seniority,
      ai_tools: p.ai_tools,
      tasks_closed: Math.max(1, Math.round(vary(7, i, 5))),
      bugs_fixed: Math.max(0, Math.round(vary(3, i, 2))),
      dev_time_h: Math.max(8, Math.round(vary(16, i, 7))),
      prs_merged: Math.max(1, Math.round(vary(6, i, 4))),
      build_success_pct: Math.min(100, Math.max(70, Math.round(vary(90, i, 8)))),
      focus_time_pct: Math.min(100, Math.max(30, Math.round(vary(63, i, 15)))),
      ai_loc_share_pct: hasAi ? Math.min(40, Math.max(5, Math.round(vary(18, i, 10)))) : 0,
    });
  });
}

/** Get team member rows for a specific team */
export function mockTeamMemberRowsForTeam(teamId: string): RawTeamMemberRow[] {
  const members = teamMembers(teamId);
  return members.map((p, i) => {
    const hasAi = p.ai_tools.length > 0;
    return mockTeamMemberRow({
      person_id: p.person_id,
      display_name: p.name,
      seniority: p.seniority,
      ai_tools: p.ai_tools,
      tasks_closed: Math.max(1, Math.round(vary(7, i, 5))),
      bugs_fixed: Math.max(0, Math.round(vary(3, i, 2))),
      dev_time_h: Math.max(8, Math.round(vary(16, i, 7))),
      prs_merged: Math.max(1, Math.round(vary(6, i, 4))),
      build_success_pct: Math.min(100, Math.max(70, Math.round(vary(90, i, 8)))),
      focus_time_pct: Math.min(100, Math.max(30, Math.round(vary(63, i, 15)))),
      ai_loc_share_pct: hasAi ? Math.min(40, Math.max(5, Math.round(vary(18, i, 10)))) : 0,
    });
  });
}

export function mockLocTrendSeries(
  weeks = 8,
  totals?: { codeLoc?: number; aiSharePct?: number },
): RawLocTrendRow[] {
  const baseCode = totals?.codeLoc ? Math.round(totals.codeLoc / weeks) : 2700;
  const aiShare  = (totals?.aiSharePct ?? 30) / 100;
  return Array.from({ length: weeks }, (_, i) => {
    const codeLoc = Math.max(0, Math.round(vary(baseCode, i, baseCode * 0.3)));
    return {
      date_bucket: isoDate(weeks - i),
      ai_loc: Math.max(0, Math.round(codeLoc * aiShare * vary(1, i + 50, 0.3))),
      code_loc: codeLoc,
      spec_lines: Math.max(0, Math.round(vary(Math.round(baseCode * 0.07), i, 80))),
    };
  });
}

export function mockDeliveryTrendSeries(
  weeks = 8,
  totals?: { commits?: number; prsMerged?: number; tasksDone?: number },
): RawDeliveryTrendRow[] {
  const baseCommits = totals?.commits ? Math.round(totals.commits / weeks) : 28;
  const basePrs     = totals?.prsMerged ? Math.round(totals.prsMerged / weeks) : 8;
  const baseTasks   = totals?.tasksDone ? Math.round(totals.tasksDone / weeks) : 9;
  return Array.from({ length: weeks }, (_, i) => ({
    date_bucket: isoDate(weeks - i),
    commits: Math.max(0, Math.round(vary(baseCommits, i, Math.max(1, baseCommits * 0.4)))),
    prs_merged: Math.max(0, Math.round(vary(basePrs, i, Math.max(1, basePrs * 0.4)))),
    tasks_done: Math.max(0, Math.round(vary(baseTasks, i, Math.max(1, baseTasks * 0.4)))),
  }));
}

// ---------------------------------------------------------------------------
// Team bullet sections
// ---------------------------------------------------------------------------

/**
 * Team bullet section -- uses BULLET_DEFS from thresholdConfig.
 * Returns RawBulletAggregateRow[] for the given section.
 */
export function mockTeamBulletSection(section: string, seed = 0): RawBulletAggregateRow[] {
  return TEAM_DEFS_CONFIG
    .filter((d) => d.section === section)
    .map((d, i) => {
      const [min, max] = MOCK_RANGES[d.metric_key] ?? [0, 100];
      const span = max - min;
      const center = min + span * 0.65;
      const raw = Math.round(vary(center, i + seed, span * 0.2) * 10) / 10;
      const clamped = d.unit === '%' ? Math.min(100, Math.max(0, raw)) : Math.min(max, Math.max(min, raw));
      const value = INTEGER_UNITS.has(d.unit) ? Math.round(clamped) : clamped;
      return {
        metric_key: d.metric_key,
        value,
        median: null, // injected by handler
        p5: null,     // injected by handler from cross-team distribution
        p25: null,
        p75: null,
        p95: null,
      };
    });
}

// ---------------------------------------------------------------------------
// IC bullet sections — raw data only (display fields computed by transforms)
// ---------------------------------------------------------------------------

const INTEGER_UNITS = new Set(['count', 'tasks', '/mo', '/ 12', 'replies', 'days', '%', '']);

export function mockIcBulletSection(
  section: string,
  seed = 0,
  valueOverrides: Record<string, number> = {},
): RawBulletAggregateRow[] {
  const keys = IC_SECTIONS[section];
  if (!keys) return [];

  return keys.map((key, i) => {
    const def = IC_MOCK_DEFAULTS[key];
    if (!def) {
      return { metric_key: key, value: 0, median: null, p5: null, p25: null, p75: null, p95: null };
    }

    const overridden = Object.prototype.hasOwnProperty.call(valueOverrides, key);
    const rawValue = overridden
      ? valueOverrides[key]!
      : Math.round(vary(def.defaultValue, i + seed, def.defaultValue * 0.2) * 10) / 10;
    const clamped = def.unit === '%' ? Math.min(100, Math.max(0, rawValue)) : rawValue;
    const value = INTEGER_UNITS.has(def.unit) ? Math.round(clamped) : clamped;

    return {
      metric_key: key,
      value,
      median: null, // injected by handler
      p5: null,     // injected by handler from team distribution
      p25: null,
      p75: null,
      p95: null,
    };
  });
}

// ---------------------------------------------------------------------------
// Complete scenario factories
// ---------------------------------------------------------------------------

export function mockExecScenario(): { teams: RawExecSummaryRow[] } {
  return { teams: mockExecRows(6) };
}

export function mockTeamScenario(teamId = 'backend'): {
  members: RawTeamMemberRow[];
  bullets: Record<string, RawBulletAggregateRow[]>;
} {
  const teamSeed = hashStr(teamId);
  const members = mockTeamMemberRowsForTeam(teamId);

  const bulletSections = ['task_delivery', 'code_quality', 'estimation', 'ai_adoption', 'collaboration'];
  const bullets: Record<string, RawBulletAggregateRow[]> = {};
  for (const section of bulletSections) {
    bullets[section] = mockTeamBulletSection(section, teamSeed);
  }

  return { members, bullets };
}

export function mockIcScenario(personId = 'p1'): {
  kpiAggregate: RawIcAggregateRow;
  prevKpiAggregate: RawIcAggregateRow;
  bullets: Record<string, RawBulletAggregateRow[]>;
  locTrend: RawLocTrendRow[];
  deliveryTrend: RawDeliveryTrendRow[];
} {
  const personSeed = hashStr(personId);

  // "At risk" overrides — these people get metrics below alert thresholds
  // so the Backend team shows realistic attention-needed scenarios.
  const AT_RISK_OVERRIDES: Record<string, Partial<RawIcAggregateRow>> = {
    p14: { focus_time_pct: 48, build_success_pct: 78, ai_loc_share_pct: 6 },  // Oscar Grant
    p15: { focus_time_pct: 52, build_success_pct: 82, ai_loc_share_pct: 4 },  // Priya Sharma
  };
  const atRisk = AT_RISK_OVERRIDES[personId];

  const kpiAggregate = mockIcAggregateRow({
    person_id: personId,
    loc: Math.round(vary(12000, personSeed, 5000)),
    ai_loc_share_pct: atRisk?.ai_loc_share_pct ?? Math.min(100, Math.max(0, Math.round(vary(25, personSeed, 10)))),
    prs_merged: Math.max(1, Math.round(vary(9, personSeed, 4))),
    pr_cycle_time_h: Math.max(1, Math.round(vary(18, personSeed, 8))),
    focus_time_pct: atRisk?.focus_time_pct ?? Math.min(100, Math.max(0, Math.round(vary(68, personSeed, 12)))),
    tasks_closed: Math.max(0, Math.round(vary(12, personSeed, 5))),
    bugs_fixed: Math.max(0, Math.round(vary(5, personSeed, 3))),
    build_success_pct: atRisk?.build_success_pct ?? Math.min(100, Math.max(70, Math.round(vary(94, personSeed, 6)))),
    ai_sessions: Math.round(vary(42, personSeed, 15)),
  });

  // Previous period aggregate for delta computation (slightly lower values)
  const prevKpiAggregate = mockIcAggregateRow({
    person_id: personId,
    loc: Math.round(kpiAggregate.loc * 0.9),
    ai_loc_share_pct: Math.min(100, Math.max(0, Math.round(kpiAggregate.ai_loc_share_pct * 0.85))),
    prs_merged: Math.max(1, kpiAggregate.prs_merged - 2),
    pr_cycle_time_h: Math.max(1, Math.round(kpiAggregate.pr_cycle_time_h * 1.1)),
    focus_time_pct: Math.min(100, Math.max(0, kpiAggregate.focus_time_pct - 5)),
    tasks_closed: Math.max(1, kpiAggregate.tasks_closed - 3),
    bugs_fixed: Math.max(0, kpiAggregate.bugs_fixed - 2),
    build_success_pct: kpiAggregate.build_success_pct !== null
      ? Math.max(70, kpiAggregate.build_success_pct - 2)
      : null,
    ai_sessions: Math.max(0, kpiAggregate.ai_sessions - 8),
  });

  // Sync bullet values for metrics that also appear in the KPI strip,
  // so both views show the same number for the same person.
  const icSections = ['task_delivery', 'git_output', 'code_quality', 'ai_tools', 'collab'];
  const bullets: Record<string, RawBulletAggregateRow[]> = {};
  const sharedOverrides: Record<string, Record<string, number>> = {
    git_output:    { clean_loc: kpiAggregate.loc, prs_merged: kpiAggregate.prs_merged, prs_created: kpiAggregate.prs_merged + Math.max(0, Math.round(vary(1, personSeed, 2))) },
    task_delivery: { tasks_completed: kpiAggregate.tasks_closed },
    code_quality:  { bugs_fixed: kpiAggregate.bugs_fixed, build_success: kpiAggregate.build_success_pct ?? 94 },
    ai_tools:      { ai_loc_share2: kpiAggregate.ai_loc_share_pct },
  };
  for (const section of icSections) {
    bullets[section] = mockIcBulletSection(section, personSeed, sharedOverrides[section] ?? {});
  }

  return {
    kpiAggregate,
    prevKpiAggregate,
    bullets,
    locTrend: mockLocTrendSeries(8, {
      codeLoc: kpiAggregate.loc,
      aiSharePct: kpiAggregate.ai_loc_share_pct,
    }),
    deliveryTrend: mockDeliveryTrendSeries(8, {
      commits: kpiAggregate.prs_merged * 3,   // ~3 commits per PR
      prsMerged: kpiAggregate.prs_merged,
      tasksDone: kpiAggregate.tasks_closed,
    }),
  };
}
