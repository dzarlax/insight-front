/**
 * Threshold & metric configuration
 *
 * Static metadata that cannot be derived from API responses:
 * labels, units, section grouping, and optional absolute targets.
 *
 * All numeric thresholds and range bounds come from the API at runtime
 * (p5/p25/p75/p95 percentiles). Nothing numeric is hardcoded here.
 */

// ---------------------------------------------------------------------------
// Bullet metric definitions
// ---------------------------------------------------------------------------

export type BulletThresholdDef = {
  metric_key: string;
  section: string;
  label: string;
  sublabel: string;
  unit: string;
  drill_id: string;
  higher_is_better: boolean;
  /**
   * Absolute target value for metrics with industry-standard goals
   * (e.g. pickup_time: 24, rework_ratio: 20).
   * Positions the target marker on the bullet bar instead of the company/team median.
   * Only set for metrics where an absolute standard matters more than relative position.
   */
  target_value?: number;
  /** Display label for the target/median marker (e.g. "Target <24h") */
  median_label?: string;
};

/**
 * Team-level bullet metric definitions.
 * Sections: task_delivery, code_quality, estimation, ai_adoption, collaboration
 */
export const BULLET_DEFS: BulletThresholdDef[] = [
  // --- task_delivery ---
  { metric_key: 'tasks_completed',    section: 'task_delivery', label: 'Tasks Closed / Developer',           sublabel: 'Jira \u00b7 closed issues in sprint \u00b7 team median per developer', unit: 'tasks',   drill_id: 'team-tasks',     higher_is_better: true  },
  { metric_key: 'task_dev_time',      section: 'task_delivery', label: 'Task Development Time',              sublabel: 'Jira \u00b7 time in In Progress state \u00b7 lower = better',          unit: 'h',       drill_id: 'team-dev-time',  higher_is_better: false },
  { metric_key: 'task_reopen_rate',   section: 'task_delivery', label: 'Task Reopen Rate',                   sublabel: 'Jira \u00b7 closed then reopened within 14 days \u00b7 lower = better', unit: '%',       drill_id: 'team-reopen',    higher_is_better: false },
  { metric_key: 'due_date_compliance', section: 'task_delivery', label: 'Due Date Compliance',               sublabel: 'Jira \u00b7 tasks closed by due date',                                 unit: '%',       drill_id: '',               higher_is_better: true  },

  // --- code_quality ---
  { metric_key: 'prs_per_dev',        section: 'code_quality',  label: 'Pull Requests Merged / Developer',   sublabel: 'Bitbucket \u00b7 authored and merged \u00b7 team median',              unit: '',        drill_id: 'team-prs',       higher_is_better: true  },
  { metric_key: 'build_success',      section: 'code_quality',  label: 'Build Success Rate',                 sublabel: 'CI \u00b7 passed \u00f7 total runs \u00b7 target \u226590%',            unit: '%',       drill_id: 'team-build',     higher_is_better: true,  target_value: 90, median_label: 'Target \u226590%' },
  { metric_key: 'pr_cycle_time',      section: 'code_quality',  label: 'Pull Request Cycle Time',            sublabel: 'Bitbucket \u00b7 PR opened \u2192 merged \u00b7 lower = better',       unit: 'h',       drill_id: 'team-pr-cycle',  higher_is_better: false },
  { metric_key: 'bugs_fixed',         section: 'code_quality',  label: 'Bugs Fixed',                         sublabel: 'Jira \u00b7 bug-type issues closed',                                   unit: 'count',   drill_id: 'team-bugs',      higher_is_better: true  },

  // --- estimation ---
  { metric_key: 'estimation_accuracy', section: 'estimation',   label: 'Within \u00b120% of estimate',       sublabel: 'Jira \u00b7 original estimate vs time spent',                          unit: '%',       drill_id: '',               higher_is_better: true  },
  { metric_key: 'overrun_ratio',       section: 'estimation',   label: 'Median overrun ratio',               sublabel: 'Jira \u00b7 actual \u00f7 estimated \u00b7 lower = better',            unit: '\u00d7',  drill_id: '',               higher_is_better: false },
  { metric_key: 'scope_completion',    section: 'estimation',   label: 'Scope Completion Rate',              sublabel: 'Jira \u00b7 tasks done \u00f7 committed at sprint start',              unit: '%',       drill_id: '',               higher_is_better: true  },
  { metric_key: 'scope_creep',         section: 'estimation',   label: 'Scope Creep Rate',                   sublabel: 'Jira \u00b7 added mid-sprint \u00f7 original count \u00b7 lower = better', unit: '%',   drill_id: '',               higher_is_better: false },
  { metric_key: 'on_time_delivery',    section: 'estimation',   label: 'On-time Delivery Rate',              sublabel: 'Jira \u00b7 closed by due date',                                       unit: '%',       drill_id: '',               higher_is_better: true  },
  { metric_key: 'avg_slip',            section: 'estimation',   label: 'Avg Slip When Late',                 sublabel: 'Jira \u00b7 days past due date \u00b7 lower = better',                 unit: 'd',       drill_id: '',               higher_is_better: false },

  // --- ai_adoption ---
  { metric_key: 'active_ai_members',  section: 'ai_adoption',   label: 'Active members',                     sublabel: 'Cursor \u00b7 Claude Code \u00b7 Codex \u00b7 any activity this month', unit: '/ 12',   drill_id: 'team-ai-active', higher_is_better: true  },
  { metric_key: 'cursor_active',      section: 'ai_adoption',   label: 'Cursor \u2014 active members',       sublabel: 'Cursor \u00b7 any activity this month',                                unit: '/ 12',   drill_id: '',               higher_is_better: true  },
  { metric_key: 'cc_active',          section: 'ai_adoption',   label: 'Claude Code \u2014 active members',  sublabel: 'Anthropic Enterprise API \u00b7 sessions this month',                  unit: '/ 12',   drill_id: '',               higher_is_better: true  },
  { metric_key: 'codex_active',       section: 'ai_adoption',   label: 'Codex \u2014 active members',        sublabel: 'OpenAI API \u00b7 completions this month',                             unit: '/ 12',   drill_id: '',               higher_is_better: true  },
  { metric_key: 'team_ai_loc',        section: 'ai_adoption',   label: 'Team AI LOC Share',                  sublabel: 'Cursor + Claude Code \u00b7 accepted lines \u00f7 clean LOC',          unit: '%',       drill_id: 'team-ai-loc',    higher_is_better: true  },
  { metric_key: 'cursor_acceptance',  section: 'ai_adoption',   label: 'Cursor Acceptance Rate',             sublabel: 'Cursor \u00b7 accepted \u00f7 shown completions \u00b7 team median',   unit: '%',       drill_id: '',               higher_is_better: true  },
  { metric_key: 'cc_tool_acceptance', section: 'ai_adoption',   label: 'Claude Code Tool Acceptance',        sublabel: 'Anthropic Enterprise API \u00b7 accepted \u00f7 offered \u00b7 team median', unit: '%', drill_id: '',               higher_is_better: true  },

  // --- collaboration ---
  { metric_key: 'slack_thread_participation', section: 'collaboration', label: 'Thread Participation',   sublabel: 'Slack \u00b7 replies to others\' threads',                                     unit: 'replies', drill_id: '', higher_is_better: true  },
  { metric_key: 'slack_message_engagement',   section: 'collaboration', label: 'Message Engagement',     sublabel: 'Slack \u00b7 avg replies per thread',                                          unit: 'avg',     drill_id: '', higher_is_better: true  },
  { metric_key: 'slack_dm_ratio',             section: 'collaboration', label: 'DM Ratio',               sublabel: 'Slack \u00b7 DMs \u00f7 all messages \u00b7 lower = more open',                unit: '%',       drill_id: '', higher_is_better: false },
  { metric_key: 'm365_teams_messages',        section: 'collaboration', label: 'Teams Messages',         sublabel: 'Microsoft Teams \u00b7 all channels sent',                                     unit: '/mo',     drill_id: '', higher_is_better: true  },
  { metric_key: 'm365_emails_sent',           section: 'collaboration', label: 'Emails Sent',            sublabel: 'M365 \u00b7 avg per member \u00b7 lower = better',                             unit: '/mo',     drill_id: '', higher_is_better: false },
  { metric_key: 'm365_files_shared',          section: 'collaboration', label: 'Files Shared',           sublabel: 'M365 \u00b7 avg per member',                                                   unit: '/mo',     drill_id: '', higher_is_better: true  },
  { metric_key: 'meeting_hours',              section: 'collaboration', label: 'Meeting Hours',          sublabel: 'Zoom \u00b7 meeting duration + M365 audioDuration \u00b7 avg \u00b7 lower = better', unit: 'h/mo', drill_id: '', higher_is_better: false },
  { metric_key: 'zoom_calls',                 section: 'collaboration', label: 'Zoom Calls',             sublabel: 'Zoom API \u00b7 avg calls attended per member',                                 unit: '/mo',     drill_id: '', higher_is_better: true  },
  { metric_key: 'meeting_free',               section: 'collaboration', label: 'Meeting-Free Days',      sublabel: 'Zoom \u00b7 days with no meetings + M365 \u00b7 avg \u00b7 higher = better',   unit: 'days',    drill_id: '', higher_is_better: true  },
];

// ---------------------------------------------------------------------------
// IC KPI definitions
// ---------------------------------------------------------------------------

export type IcKpiDef = {
  metric_key: string;
  raw_field: string;
  label: string;
  unit: string;
  sublabel: string;
  description: string;
  higher_is_better: boolean;
  format: 'integer' | 'decimal1' | 'percent' | 'hours';
};

export const IC_KPI_DEFS: IcKpiDef[] = [
  { metric_key: 'bugs_fixed',     raw_field: 'bugs_fixed',       label: 'Bugs Fixed',    unit: '',  sublabel: 'Jira',                 description: 'Bug-type Jira issues closed in the selected period. Reflects quality contribution and team reliability.',                                    higher_is_better: true,  format: 'integer' },
  { metric_key: 'clean_loc',      raw_field: 'loc',              label: 'Clean LOC',     unit: '',  sublabel: 'Bitbucket',            description: 'Authored lines of code excluding AI-generated and config/spec lines. Reflects hands-on coding output.',                                    higher_is_better: true,  format: 'integer' },
  { metric_key: 'ai_loc_share',   raw_field: 'ai_loc_share_pct', label: 'AI LOC Share',  unit: '%', sublabel: 'Cursor + Claude Code', description: 'Share of authored lines accepted from AI suggestions (Cursor + Claude Code). Reflects how much AI tooling contributes to actual output.', higher_is_better: true,  format: 'percent' },
  { metric_key: 'focus_time_pct', raw_field: 'focus_time_pct',   label: 'Focus Time',    unit: '%', sublabel: 'Calendar / M365',      description: 'Share of work time spent in uninterrupted 60-minute+ blocks. Higher means fewer context switches and more deep work.',                      higher_is_better: true,  format: 'percent' },
  { metric_key: 'tasks_closed',   raw_field: 'tasks_closed',     label: 'Tasks Closed',  unit: '',  sublabel: 'Jira',                 description: 'Jira tasks moved to Done in the selected period. Direct measure of delivery throughput.',                                                  higher_is_better: true,  format: 'integer' },
];

// ---------------------------------------------------------------------------
// IC bullet metric definitions
// ---------------------------------------------------------------------------

/**
 * IC-level bullet metric definitions.
 * Sections: task_delivery, git_output, code_quality, ai_tools, collab
 */
export const IC_BULLET_DEFS: BulletThresholdDef[] = [
  // --- task_delivery ---
  { metric_key: 'tasks_completed',     section: 'task_delivery', label: 'Tasks Completed',          sublabel: 'Jira \u00b7 closed issues in sprint',                                          unit: 'count',   drill_id: 'tasks-completed', higher_is_better: true  },
  { metric_key: 'task_dev_time',       section: 'task_delivery', label: 'Task Development Time',    sublabel: 'Jira \u00b7 time in In Progress state \u00b7 lower = better',                   unit: 'h',       drill_id: 'cycle-time',      higher_is_better: false },
  { metric_key: 'estimation_accuracy', section: 'task_delivery', label: 'Estimation Accuracy',      sublabel: 'Jira \u00b7 tasks within \u00b120% of original estimate',                       unit: '\u00d7',  drill_id: '',                higher_is_better: true,  target_value: 0.9, median_label: 'Target 0.9\u20131.3\u00d7' },
  { metric_key: 'task_reopen_rate',    section: 'task_delivery', label: 'Task Reopen Rate',         sublabel: 'Jira \u00b7 closed then reopened within 14 days \u00b7 lower = better',          unit: '%',       drill_id: 'task-reopen',     higher_is_better: false },
  { metric_key: 'due_date_compliance', section: 'task_delivery', label: 'Due Date Compliance',      sublabel: 'Jira \u00b7 tasks closed by due date',                                          unit: '%',       drill_id: '',                higher_is_better: true  },

  // --- git_output ---
  { metric_key: 'commits',             section: 'git_output',    label: 'Commits Created',          sublabel: 'Bitbucket \u00b7 commits authored',                                             unit: 'count',   drill_id: 'commits',         higher_is_better: true  },
  { metric_key: 'prs_created',         section: 'git_output',    label: 'Pull Requests Created',    sublabel: 'Bitbucket \u00b7 PRs authored',                                                 unit: 'count',   drill_id: 'pull-requests',   higher_is_better: true  },
  { metric_key: 'prs_merged',          section: 'git_output',    label: 'Pull Requests Merged',     sublabel: 'Bitbucket \u00b7 authored and merged',                                          unit: 'count',   drill_id: '',                higher_is_better: true  },
  { metric_key: 'clean_loc',           section: 'git_output',    label: 'Clean LOC',                sublabel: 'Bitbucket \u00b7 lines added \u00b7 excl. spec/config',                         unit: 'count',   drill_id: '',                higher_is_better: true  },

  // --- code_quality ---
  { metric_key: 'reviews_given',       section: 'code_quality',  label: 'Reviews Given',            sublabel: 'Bitbucket \u00b7 PRs reviewed',                                                 unit: 'count',   drill_id: 'reviews',         higher_is_better: true  },
  { metric_key: 'rework_ratio',        section: 'code_quality',  label: 'Rework Ratio',             sublabel: 'Bitbucket \u00b7 lines changed in follow-up commits \u00b7 lower = better',     unit: '%',       drill_id: '',                higher_is_better: false, target_value: 20, median_label: 'Target <20%' },
  { metric_key: 'build_success',       section: 'code_quality',  label: 'Build Success Rate',       sublabel: 'CI \u00b7 passed \u00f7 total runs \u00b7 target \u226590%',                    unit: '%',       drill_id: 'builds',          higher_is_better: true,  target_value: 90, median_label: 'Target \u226590%' },
  { metric_key: 'pr_cycle_time',       section: 'code_quality',  label: 'Pull Request Cycle Time',  sublabel: 'Bitbucket \u00b7 PR opened \u2192 merged \u00b7 lower = better',                unit: 'h',       drill_id: 'pull-requests',   higher_is_better: false },
  { metric_key: 'pickup_time',         section: 'code_quality',  label: 'Pickup Time',              sublabel: 'Bitbucket \u00b7 PR opened \u2192 first review \u00b7 lower = better',          unit: 'h',       drill_id: '',                higher_is_better: false, target_value: 24, median_label: 'Target <24h' },
  { metric_key: 'bugs_fixed',          section: 'code_quality',  label: 'Bugs Fixed',               sublabel: 'Jira \u00b7 bug-type issues closed',                                            unit: 'count',   drill_id: 'bugs-fixed',      higher_is_better: true  },
  { metric_key: 'bug_reopen_rate',     section: 'code_quality',  label: 'Bug Reopen Rate',          sublabel: 'Jira \u00b7 bugs reopened \u00b7 lower = better',                               unit: '%',       drill_id: '',                higher_is_better: false },

  // --- ai_tools ---
  { metric_key: 'cursor_completions',  section: 'ai_tools',      label: 'Cursor Completions',       sublabel: 'Cursor \u00b7 completions suggested this month',                                unit: 'count',   drill_id: '',                higher_is_better: true  },
  { metric_key: 'cursor_agents',       section: 'ai_tools',      label: 'Cursor Agent Sessions',    sublabel: 'Cursor \u00b7 agentic sessions started',                                       unit: 'count',   drill_id: '',                higher_is_better: true  },
  { metric_key: 'cursor_lines',        section: 'ai_tools',      label: 'Lines Accepted',           sublabel: 'Cursor \u00b7 lines of code accepted',                                         unit: 'count',   drill_id: '',                higher_is_better: true  },
  { metric_key: 'cc_sessions',         section: 'ai_tools',      label: 'Claude Code Sessions',     sublabel: 'Anthropic Enterprise API \u00b7 sessions this month',                           unit: 'count',   drill_id: '',                higher_is_better: true  },
  { metric_key: 'cc_tool_accept',      section: 'ai_tools',      label: 'Tool Acceptance Rate',     sublabel: 'Anthropic Enterprise API \u00b7 accepted \u00f7 offered',                       unit: '%',       drill_id: '',                higher_is_better: true  },
  { metric_key: 'cc_lines',            section: 'ai_tools',      label: 'Lines Added (Claude Code)',sublabel: 'Anthropic Enterprise API \u00b7 lines added by Claude Code',                    unit: 'count',   drill_id: '',                higher_is_better: true  },
  { metric_key: 'ai_loc_share2',       section: 'ai_tools',      label: 'AI LOC Share',             sublabel: 'Cursor + Claude Code \u00b7 accepted lines \u00f7 clean LOC',                   unit: '%',       drill_id: '',                higher_is_better: true  },
  { metric_key: 'claude_web',          section: 'ai_tools',      label: 'Claude Web Usage',         sublabel: 'Claude Web \u00b7 conversations this month',                                    unit: 'count',   drill_id: '',                higher_is_better: true  },
  { metric_key: 'chatgpt',             section: 'ai_tools',      label: 'ChatGPT Usage',            sublabel: 'ChatGPT \u00b7 conversations this month',                                      unit: 'count',   drill_id: '',                higher_is_better: true  },

  // --- collab ---
  { metric_key: 'slack_thread_participation', section: 'collab', label: 'Thread Participation',     sublabel: 'Slack \u00b7 replies to others\' threads',                                      unit: 'replies', drill_id: '', higher_is_better: true  },
  { metric_key: 'slack_message_engagement',   section: 'collab', label: 'Message Engagement',       sublabel: 'Slack \u00b7 avg replies per thread',                                           unit: 'avg',     drill_id: '', higher_is_better: true  },
  { metric_key: 'slack_dm_ratio',             section: 'collab', label: 'DM Ratio',                 sublabel: 'Slack \u00b7 DMs \u00f7 all messages \u00b7 lower = more open',                  unit: '%',       drill_id: '', higher_is_better: false },
  { metric_key: 'm365_teams_messages',        section: 'collab', label: 'Teams Messages',           sublabel: 'Microsoft Teams \u00b7 all channels sent',                                      unit: '/mo',     drill_id: '', higher_is_better: true  },
  { metric_key: 'm365_emails_sent',           section: 'collab', label: 'Emails Sent',              sublabel: 'M365 \u00b7 avg per member \u00b7 lower = better',                              unit: '/mo',     drill_id: '', higher_is_better: false },
  { metric_key: 'm365_files_shared',          section: 'collab', label: 'Files Shared',             sublabel: 'M365 \u00b7 avg per member',                                                    unit: '/mo',     drill_id: '', higher_is_better: true  },
  { metric_key: 'meeting_hours',              section: 'collab', label: 'Meeting Hours',            sublabel: 'Zoom \u00b7 meeting duration + M365 audioDuration \u00b7 lower = more focus time', unit: 'h/mo', drill_id: '', higher_is_better: false },
  { metric_key: 'zoom_calls',                 section: 'collab', label: 'Zoom Calls',               sublabel: 'Zoom API \u00b7 avg calls attended per member',                                  unit: '/mo',     drill_id: '', higher_is_better: true  },
  { metric_key: 'meeting_free',               section: 'collab', label: 'Meeting-Free Days',        sublabel: 'Zoom \u00b7 days with no meetings + M365 \u00b7 avg \u00b7 higher = better',    unit: 'days',    drill_id: '', higher_is_better: true  },
];
