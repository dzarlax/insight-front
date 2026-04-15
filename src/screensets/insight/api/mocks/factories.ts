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
import { BULLET_DEFS } from '../thresholdConfig';

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

/** Parse numeric value from a range string like '0%', '100%', '8h', '31h', '1k', '18k' */
function parseRangeNum(s: string): number {
  const num = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (s.toLowerCase().endsWith('k')) return num * 1000;
  return isNaN(num) ? 0 : num;
}

/** Position of value within [min, max] as 0–100 percentage, clamped */
function barPct(value: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0) return 0;
  return Math.round(Math.max(0, Math.min(100, ((value - min) / span) * 100)));
}

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

import { TEAMS, PEOPLE, teamMembers, teamHeadcount } from './registry';
export { TEAMS, PEOPLE, teamMembers, teamHeadcount };

// ---------------------------------------------------------------------------
// IC bullet metric definitions (no BULLET_DEFS entries for these)
// ---------------------------------------------------------------------------

type IcBulletDef = {
  metric_key: string;
  section: string;
  label: string;
  sublabel: string;
  unit: string;
  range_min: string;
  range_max: string;
  median: number;
  median_label: string;
  bar_width_pct: number;
  median_left_pct: number;
  higher_is_better: boolean;
  drill_id: string;
  defaultValue: number;
};

/** Compute IC bullet status by comparing value to median. Falls back to 'good' when median is 0. */
function icBulletStatus(value: number, median: number, higherIsBetter: boolean): 'good' | 'warn' | 'bad' {
  if (median === 0) return 'good';
  if (higherIsBetter) {
    if (value >= median * 0.9) return 'good';
    if (value >= median * 0.7) return 'warn';
    return 'bad';
  }
  if (value <= median * 1.15) return 'good';
  if (value <= median * 1.40) return 'warn';
  return 'bad';
}

const IC_BULLET_DEFS: IcBulletDef[] = [
  // task_delivery
  { metric_key: 'tasks_completed',    section: 'task_delivery', label: 'Tasks Completed',          sublabel: 'Jira \u00b7 closed issues in sprint',                                          unit: 'count',  range_min: '0',    range_max: '15',   median: 7,    median_label: 'Median: 7',                          bar_width_pct: 80, median_left_pct: 47, higher_is_better: true,  drill_id: 'tasks-completed', defaultValue: 12  },
  { metric_key: 'task_dev_time',      section: 'task_delivery', label: 'Task Development Time',     sublabel: 'Jira \u00b7 time in In Progress state \u00b7 lower = better',                 unit: 'h',      range_min: '8h',   range_max: '31h',  median: 15,   median_label: 'Median: 15h',                        bar_width_pct: 26, median_left_pct: 30, higher_is_better: false, drill_id: 'cycle-time',      defaultValue: 14  },
  { metric_key: 'estimation_accuracy',section: 'task_delivery', label: 'Estimation Accuracy',       sublabel: 'Jira \u00b7 tasks within \u00b120% of original estimate',                    unit: '\u00d7', range_min: '0\u00d7', range_max: '3\u00d7', median: 0, median_label: 'Target 0.9\u20131.3\u00d7',          bar_width_pct: 37, median_left_pct: 37, higher_is_better: true,  drill_id: '',                defaultValue: 1.1 },
  { metric_key: 'task_reopen_rate',   section: 'task_delivery', label: 'Task Reopen Rate',          sublabel: 'Jira \u00b7 closed then reopened within 14 days \u00b7 lower = better',       unit: '%',      range_min: '0%',   range_max: '15%',  median: 5,    median_label: 'Median: 5%',                         bar_width_pct: 27, median_left_pct: 33, higher_is_better: false, drill_id: 'task-reopen',     defaultValue: 4   },
  { metric_key: 'due_date_compliance',section: 'task_delivery', label: 'Due Date Compliance',       sublabel: 'Jira \u00b7 tasks closed by due date',                                       unit: '%',      range_min: '40%',  range_max: '100%', median: 72,   median_label: 'Median: 72%',                        bar_width_pct: 87, median_left_pct: 53, higher_is_better: true,  drill_id: '',                defaultValue: 92  },
  // git_output
  { metric_key: 'commits',            section: 'git_output',    label: 'Commits Created',           sublabel: 'Bitbucket \u00b7 commits authored',                                          unit: 'count',  range_min: '8',    range_max: '55',   median: 22,   median_label: 'Median: 22',                         bar_width_pct: 55, median_left_pct: 30, higher_is_better: true,  drill_id: 'commits',         defaultValue: 34  },
  { metric_key: 'prs_created',        section: 'git_output',    label: 'Pull Requests Created',     sublabel: 'Bitbucket \u00b7 PRs authored',                                              unit: 'count',  range_min: '2',    range_max: '14',   median: 6,    median_label: 'Median: 6',                          bar_width_pct: 75, median_left_pct: 33, higher_is_better: true,  drill_id: 'pull-requests',   defaultValue: 11  },
  { metric_key: 'prs_merged',         section: 'git_output',    label: 'Pull Requests Merged',      sublabel: 'Bitbucket \u00b7 authored and merged',                                       unit: 'count',  range_min: '0',    range_max: '20',   median: 6,    median_label: 'Median: 6',                          bar_width_pct: 45, median_left_pct: 30, higher_is_better: true,  drill_id: '',                defaultValue: 9   },
  { metric_key: 'clean_loc',          section: 'git_output',    label: 'Clean LOC',                 sublabel: 'Bitbucket \u00b7 lines added \u00b7 excl. spec/config',                     unit: 'count',  range_min: '1k',   range_max: '18k',  median: 7000, median_label: 'Median: 7k',                         bar_width_pct: 65, median_left_pct: 35, higher_is_better: true,  drill_id: '',                defaultValue: 12000 },
  // code_quality
  { metric_key: 'reviews_given',      section: 'code_quality',  label: 'Reviews Given',             sublabel: 'Bitbucket \u00b7 PRs reviewed',                                              unit: 'count',  range_min: '0',    range_max: '20',   median: 8,    median_label: 'Median: 8',                          bar_width_pct: 70, median_left_pct: 40, higher_is_better: true,  drill_id: 'reviews',         defaultValue: 14  },
  { metric_key: 'rework_ratio',       section: 'code_quality',  label: 'Rework Ratio',              sublabel: 'Bitbucket \u00b7 lines changed in follow-up commits \u00b7 lower = better',  unit: '%',      range_min: '0%',   range_max: '50%',  median: 0,    median_label: 'Target <20%',                        bar_width_pct: 24, median_left_pct: 40, higher_is_better: false, drill_id: '',                defaultValue: 12  },
  { metric_key: 'build_success',      section: 'code_quality',  label: 'Build Success Rate',        sublabel: 'CI \u00b7 passed \u00f7 total runs \u00b7 target \u226590%',                unit: '%',      range_min: '0%',   range_max: '100%', median: 87,   median_label: 'Target \u226590% \u00b7 Median: 87%', bar_width_pct: 94, median_left_pct: 87, higher_is_better: true,  drill_id: 'builds',          defaultValue: 94  },
  { metric_key: 'pr_cycle_time',      section: 'code_quality',  label: 'Pull Request Cycle Time',   sublabel: 'Bitbucket \u00b7 PR opened \u2192 merged \u00b7 lower = better',            unit: 'h',      range_min: '0h',   range_max: '72h',  median: 24,   median_label: 'Median: 24h',                        bar_width_pct: 25, median_left_pct: 33, higher_is_better: false, drill_id: 'pull-requests',   defaultValue: 18  },
  { metric_key: 'pickup_time',        section: 'code_quality',  label: 'Pickup Time',               sublabel: 'Bitbucket \u00b7 PR opened \u2192 first review \u00b7 lower = better',      unit: 'h',      range_min: '0h',   range_max: '48h',  median: 0,    median_label: 'Target <24h',                        bar_width_pct:  9, median_left_pct: 50, higher_is_better: false, drill_id: '',                defaultValue: 4.2 },
  { metric_key: 'bugs_fixed',         section: 'code_quality',  label: 'Bugs Fixed',                sublabel: 'Jira \u00b7 bug-type issues closed',                                        unit: 'count',  range_min: '0',    range_max: '30',   median: 9,    median_label: 'Median: 9',                          bar_width_pct: 77, median_left_pct: 30, higher_is_better: true,  drill_id: 'bugs-fixed',      defaultValue: 23  },
  { metric_key: 'bug_reopen_rate',    section: 'code_quality',  label: 'Bug Reopen Rate',           sublabel: 'Jira \u00b7 bugs reopened \u00b7 lower = better',                           unit: '%',      range_min: '0%',   range_max: '30%',  median: 14,   median_label: 'Median: 14% \u00b7 Target <15%',     bar_width_pct: 30, median_left_pct: 47, higher_is_better: false, drill_id: '',                defaultValue: 9   },
  // ai_tools
  { metric_key: 'cursor_completions', section: 'ai_tools',      label: 'Cursor Completions',        sublabel: 'Cursor \u00b7 completions suggested this month',                             unit: 'count',  range_min: '200',  range_max: '5k',   median: 800,  median_label: 'Median: 800',                        bar_width_pct: 21, median_left_pct: 13, higher_is_better: true,  drill_id: '',                defaultValue: 1200 },
  { metric_key: 'cursor_agents',      section: 'ai_tools',      label: 'Cursor Agent Sessions',     sublabel: 'Cursor \u00b7 agentic sessions started',                                    unit: 'count',  range_min: '2',    range_max: '40',   median: 10,   median_label: 'Median: 10',                         bar_width_pct: 42, median_left_pct: 21, higher_is_better: true,  drill_id: '',                defaultValue: 18  },
  { metric_key: 'cursor_lines',       section: 'ai_tools',      label: 'Lines Accepted',            sublabel: 'Cursor \u00b7 lines of code accepted',                                      unit: 'count',  range_min: '0',    range_max: '5k',   median: 1800, median_label: 'Median: 1.8k',                       bar_width_pct: 64, median_left_pct: 36, higher_is_better: true,  drill_id: '',                defaultValue: 3200 },
  { metric_key: 'cc_sessions',        section: 'ai_tools',      label: 'Claude Code Sessions',      sublabel: 'Anthropic Enterprise API \u00b7 sessions this month',                       unit: 'count',  range_min: '0',    range_max: '60',   median: 12,   median_label: 'Median: 12',                         bar_width_pct: 40, median_left_pct: 20, higher_is_better: true,  drill_id: '',                defaultValue: 24  },
  { metric_key: 'cc_tool_accept',     section: 'ai_tools',      label: 'Tool Acceptance Rate',      sublabel: 'Anthropic Enterprise API \u00b7 accepted \u00f7 offered',                   unit: '%',      range_min: '0%',   range_max: '100%', median: 64,   median_label: 'Median: 64%',                        bar_width_pct: 76, median_left_pct: 64, higher_is_better: true,  drill_id: '',                defaultValue: 76  },
  { metric_key: 'cc_lines',           section: 'ai_tools',      label: 'Lines Added (Claude Code)', sublabel: 'Anthropic Enterprise API \u00b7 lines added by Claude Code',                unit: 'count',  range_min: '0',    range_max: '3k',   median: 600,  median_label: 'Median: 600',                        bar_width_pct: 37, median_left_pct: 20, higher_is_better: true,  drill_id: '',                defaultValue: 1100 },
  { metric_key: 'ai_loc_share2',      section: 'ai_tools',      label: 'AI LOC Share',              sublabel: 'Cursor + Claude Code \u00b7 accepted lines \u00f7 clean LOC',              unit: '%',      range_min: '0%',   range_max: '34%',  median: 18,   median_label: 'Median: 18%',                        bar_width_pct: 79, median_left_pct: 53, higher_is_better: true,  drill_id: '',                defaultValue: 27  },
  { metric_key: 'claude_web',         section: 'ai_tools',      label: 'Claude Web Usage',          sublabel: 'Claude Web \u00b7 conversations this month',                                unit: 'count',  range_min: '0',    range_max: '80',   median: 18,   median_label: 'Median: 18',                         bar_width_pct: 40, median_left_pct: 23, higher_is_better: true,  drill_id: '',                defaultValue: 32  },
  { metric_key: 'chatgpt',            section: 'ai_tools',      label: 'ChatGPT Usage',             sublabel: 'ChatGPT \u00b7 conversations this month',                                   unit: 'count',  range_min: '0',    range_max: '40',   median: 12,   median_label: 'Median: 12',                         bar_width_pct: 20, median_left_pct: 30, higher_is_better: true,  drill_id: '',                defaultValue: 8   },
  // collab
  { metric_key: 'slack_thread_participation', section: 'collab', label: 'Thread Participation',    sublabel: 'Slack \u00b7 replies to others\' threads',                                   unit: 'replies', range_min: '0',   range_max: '80',   median: 29,   median_label: 'Median: 29',                         bar_width_pct: 43, median_left_pct: 36, higher_is_better: true,  drill_id: '',                defaultValue: 34  },
  { metric_key: 'slack_message_engagement',   section: 'collab', label: 'Message Engagement',      sublabel: 'Slack \u00b7 avg replies per thread',                                        unit: 'avg',    range_min: '0',    range_max: '5',    median: 1.8,  median_label: 'Median: 1.8',                        bar_width_pct: 42, median_left_pct: 36, higher_is_better: true,  drill_id: '',                defaultValue: 2.1 },
  { metric_key: 'slack_dm_ratio',     section: 'collab',         label: 'DM Ratio',                 sublabel: 'Slack \u00b7 DMs \u00f7 all messages \u00b7 lower = more open',             unit: '%',      range_min: '0%',   range_max: '100%', median: 28,   median_label: 'Median: 28% \u00b7 lower = more open', bar_width_pct: 24, median_left_pct: 28, higher_is_better: false, drill_id: '',                defaultValue: 24  },
  { metric_key: 'm365_teams_messages',section: 'collab',         label: 'Teams Messages',           sublabel: 'Microsoft Teams \u00b7 all channels sent',                                  unit: '/mo',    range_min: '0',    range_max: '400',  median: 148,  median_label: 'Median: 148',                        bar_width_pct: 42, median_left_pct: 37, higher_is_better: true,  drill_id: '',                defaultValue: 168 },
  { metric_key: 'm365_emails_sent',   section: 'collab',         label: 'Emails Sent',              sublabel: 'M365 \u00b7 avg per member \u00b7 lower = better',                          unit: '/mo',    range_min: '0',    range_max: '120',  median: 35,   median_label: 'Median: 35 \u00b7 lower = better',    bar_width_pct: 26, median_left_pct: 29, higher_is_better: false, drill_id: '',                defaultValue: 31  },
  { metric_key: 'm365_files_shared',  section: 'collab',         label: 'Files Shared',             sublabel: 'M365 \u00b7 avg per member',                                                unit: '/mo',    range_min: '0',    range_max: '30',   median: 8,    median_label: 'Median: 8',                          bar_width_pct: 30, median_left_pct: 27, higher_is_better: true,  drill_id: '',                defaultValue: 9   },
  { metric_key: 'meeting_hours',      section: 'collab',         label: 'Meeting Hours',            sublabel: 'Zoom \u00b7 meeting duration + M365 audioDuration \u00b7 lower = more focus time', unit: 'h/mo', range_min: '4h', range_max: '28h', median: 16,  median_label: 'Median: 16h',                        bar_width_pct: 33, median_left_pct: 50, higher_is_better: false, drill_id: '',                defaultValue: 12  },
  { metric_key: 'zoom_calls',         section: 'collab',         label: 'Zoom Calls',               sublabel: 'Zoom API \u00b7 avg calls attended per member',                              unit: '/mo',    range_min: '0',    range_max: '20',   median: 9,    median_label: 'Median: 9',                          bar_width_pct: 55, median_left_pct: 45, higher_is_better: true,  drill_id: '',                defaultValue: 11  },
  { metric_key: 'meeting_free',       section: 'collab',         label: 'Meeting-Free Days',        sublabel: 'Zoom \u00b7 days with no meetings + M365 \u00b7 avg \u00b7 higher = better', unit: 'days',   range_min: '0',    range_max: '10',   median: 4,    median_label: 'Median: 4',                          bar_width_pct: 50, median_left_pct: 40, higher_is_better: true,  drill_id: '',                defaultValue: 5   },
];

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
  return BULLET_DEFS
    .filter((d) => d.section === section)
    .map((d, i) => {
      const raw = Math.round(vary(d.median, i + seed, d.median * 0.3) * 10) / 10;
      // Clamp % to 0-100 (not to range_max which can be <100), others to range
      const clamped = d.unit === '%'
        ? Math.min(100, Math.max(0, raw))
        : Math.min(d.range_max, Math.max(d.range_min, raw));
      const value = INTEGER_UNITS.has(d.unit) ? Math.round(clamped) : clamped;
      return {
        metric_key: d.metric_key,
        value,
        median: d.median,
        p5: d.range_min,
        p95: d.range_max,
      };
    });
}

// ---------------------------------------------------------------------------
// IC bullet sections (with passthrough display fields)
// ---------------------------------------------------------------------------

/**
 * IC bullet section -- uses IC_BULLET_DEFS (no BULLET_DEFS entries).
 * Returns RawBulletAggregateRow with passthrough display fields that
 * transforms.ts reads via `Record<string,unknown>` cast.
 */
const INTEGER_UNITS = new Set(['count', 'tasks', '/mo', '/ 12', 'replies', 'days', '%', '']);

export function mockIcBulletSection(
  section: string,
  seed = 0,
  valueOverrides: Record<string, number> = {},
): RawBulletAggregateRow[] {
  const keys = IC_SECTIONS[section];
  if (!keys) return [];

  return keys.map((key, i) => {
    const def = IC_BULLET_DEFS.find((d) => d.metric_key === key);
    if (!def) {
      return {
        metric_key: key,
        value: 0,
        median: null,
        p5: null,
        p95: null,
      };
    }

    const overridden = Object.prototype.hasOwnProperty.call(valueOverrides, key);
    const rawValue = overridden
      ? valueOverrides[key]!
      : Math.round(vary(def.defaultValue, i + seed, def.defaultValue * 0.2) * 10) / 10;
    const clamped = def.unit === '%' ? Math.min(100, Math.max(0, rawValue)) : rawValue;
    const value = INTEGER_UNITS.has(def.unit) ? Math.round(clamped) : clamped;

    // Build the base raw row
    const row: RawBulletAggregateRow = {
      metric_key: def.metric_key,
      value,
      median: def.median ?? null,
      p5: null,
      p95: null,
    };

    // Attach passthrough display fields that transforms.ts reads
    // when no BULLET_DEFS match is found (the IC-level path)
    const ext = row as RawBulletAggregateRow & Record<string, unknown>;
    ext['section'] = def.section;
    ext['label'] = def.label;
    ext['sublabel'] = def.sublabel;
    ext['unit'] = def.unit;
    ext['range_min'] = def.range_min;
    ext['range_max'] = def.range_max;
    ext['median_label'] = def.median_label;
    const rMin = parseRangeNum(def.range_min);
    const rMax = parseRangeNum(def.range_max);
    ext['bar_left_pct'] = 0;
    ext['bar_width_pct'] = barPct(value, rMin, rMax);
    ext['median_left_pct'] = def.median === 0 ? def.median_left_pct : barPct(def.median, rMin, rMax);
    ext['status'] = icBulletStatus(value, def.median, def.higher_is_better);
    ext['drill_id'] = def.drill_id;

    return row;
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
