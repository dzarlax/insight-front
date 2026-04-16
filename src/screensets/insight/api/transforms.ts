/**
 * Transform layer
 *
 * Pure functions that map raw ClickHouse aggregates (snake_case) into the
 * pre-formatted UI types consumed by components.
 *
 * Design rules:
 * - Explicit field mapping only (no generic snake->camel converter).
 * - Every function is stateless and side-effect free.
 * - Threshold defaults come from thresholdConfig.ts; backend-provided
 *   values override them when present.
 */

import { keyBy } from 'lodash';
import type {
  PeriodValue,
  ExecTeamRow,
  ExecViewConfig,
  IcKpi,
  BulletMetric,
  LocDataPoint,
  DeliveryDataPoint,
  TeamMember,
} from '../types';
import type {
  RawExecSummaryRow,
  RawIcAggregateRow,
  RawBulletAggregateRow,
  RawLocTrendRow,
  RawDeliveryTrendRow,
  RawTeamMemberRow,
} from './rawTypes';
import { BULLET_DEFS, IC_BULLET_DEFS, IC_KPI_DEFS } from './thresholdConfig';
import type { IcKpiDef } from './thresholdConfig';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function pctInRange(value: number, rangeMin: number, rangeMax: number): number {
  const span = rangeMax - rangeMin;
  if (span <= 0) return 0;
  return Math.round(clamp(((value - rangeMin) / span) * 100, 0, 100));
}

/**
 * Status computed from live company percentiles (p25/p75).
 * good  = top quartile  (above p75 for higher-is-better, below p25 for lower-is-better)
 * warn  = middle half   (p25–p75)
 * bad   = bottom quartile
 */
function evaluateStatus(
  value: number,
  p25: number,
  p75: number,
  higherIsBetter: boolean,
): 'good' | 'warn' | 'bad' {
  if (higherIsBetter) {
    if (value >= p75) return 'good';
    if (value >= p25) return 'warn';
    return 'bad';
  }
  if (value <= p25) return 'good';
  if (value <= p75) return 'warn';
  return 'bad';
}

function formatValue(raw: number, fmt: IcKpiDef['format']): string {
  switch (fmt) {
    case 'integer': return String(Math.round(raw));
    case 'decimal1': return raw.toFixed(1);
    case 'percent': return String(Math.round(raw));
    case 'hours': return `${raw.toFixed(1)}h`;
  }
}

function formatDelta(
  delta: number,
  def: IcKpiDef,
): string {
  const sign = delta > 0 ? '+' : '';
  switch (def.format) {
    case 'integer': return `${sign}${Math.round(delta)}`;
    case 'decimal1': return `${sign}${delta.toFixed(1)}`;
    case 'percent': return `${sign}${Math.round(delta)}%`;
    case 'hours': return `${sign}${delta.toFixed(1)}h`;
  }
}

function deltaType(
  delta: number,
  higherIsBetter: boolean,
): 'good' | 'bad' | 'neutral' {
  const threshold = 0.001;
  if (Math.abs(delta) < threshold) return 'neutral';
  if (higherIsBetter) return delta > 0 ? 'good' : 'bad';
  return delta < 0 ? 'good' : 'bad';
}

function formatDateLabel(isoDate: string, period: PeriodValue): string {
  const d = new Date(isoDate);
  switch (period) {
    case 'week': {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
      return days[d.getUTCDay()] ?? isoDate;
    }
    case 'month': {
      // Week number within the month: W1, W2, ...
      const weekNum = Math.ceil(d.getUTCDate() / 7);
      return `W${weekNum}`;
    }
    case 'quarter': {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
      return months[d.getUTCMonth()] ?? isoDate;
    }
    case 'year': {
      const q = Math.floor(d.getUTCMonth() / 3) + 1;
      return `Q${q}`;
    }
  }
}

function formatRangeStr(value: number, unit: string): string {
  if (unit === '%') return `${value}%`;
  if (unit === 'h' || unit === 'h/mo') return `${value}h`;
  if (unit === 'd') return `${value}d`;
  if (unit === '\u00d7') return `${value}\u00d7`;
  return String(value);
}

// ---------------------------------------------------------------------------
// 1. Executive summary
// ---------------------------------------------------------------------------

export function transformExecRows(
  rows: RawExecSummaryRow[],
  thresholds?: ExecViewConfig['column_thresholds'],
): ExecTeamRow[] {
  return rows.map((r) => {
    let status: 'good' | 'warn' | 'bad' = 'good';

    if (thresholds) {
      const warnings = thresholds.filter((t) => {
        const val = r[t.metric_key as keyof RawExecSummaryRow] as number | null;
        return val !== null && val < t.threshold;
      });
      if (warnings.length >= 2) status = 'bad';
      else if (warnings.length === 1) status = 'warn';
    }

    return {
      team_id: r.org_unit_id,
      team_name: r.org_unit_name,
      headcount: r.headcount,
      tasks_closed: r.tasks_closed,
      bugs_fixed: r.bugs_fixed,
      build_success_pct: r.build_success_pct,
      focus_time_pct: r.focus_time_pct,
      ai_adoption_pct: r.ai_adoption_pct,
      ai_loc_share_pct: r.ai_loc_share_pct,
      pr_cycle_time_h: r.pr_cycle_time_h,
      status,
    };
  });
}

// ---------------------------------------------------------------------------
// 2. IC KPIs
// ---------------------------------------------------------------------------

export function transformIcKpis(
  current: RawIcAggregateRow | null,
  previous: RawIcAggregateRow | null,
  period: PeriodValue,
): IcKpi[] {
  return IC_KPI_DEFS.map((def) => {
    const curVal = current
      ? (current[def.raw_field as keyof RawIcAggregateRow] as number)
      : 0;
    const prevVal = previous
      ? (previous[def.raw_field as keyof RawIcAggregateRow] as number)
      : null;

    const value = formatValue(curVal, def.format);
    let delta = '';
    let dt: 'good' | 'warn' | 'bad' | 'neutral' = 'neutral';

    if (prevVal !== null) {
      const diff = curVal - prevVal;
      delta = formatDelta(diff, def);
      dt = deltaType(diff, def.higher_is_better);
    }

    return {
      period,
      metric_key: def.metric_key,
      label: def.label,
      value,
      unit: def.unit,
      sublabel: def.sublabel,
      description: def.description,
      delta,
      delta_type: dt,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. Bullet metrics
// ---------------------------------------------------------------------------

/** Combined lookup: BULLET_DEFS (team) first, then IC_BULLET_DEFS (IC). */
const ALL_BULLET_DEFS_BY_KEY: Record<string, import('./thresholdConfig').BulletThresholdDef> = keyBy(
  [...BULLET_DEFS, ...IC_BULLET_DEFS],
  'metric_key',
);

function buildMedianLabel(median: number, def: import('./thresholdConfig').BulletThresholdDef): string {
  if (def.median_label) return def.median_label;
  const suffix = def.unit === '%' ? '%' : (def.unit === 'h' || def.unit === 'h/mo') ? 'h' : '';
  if (median >= 1000) return `Median: ${Math.round(median / 100) / 10}k`;
  return `Median: ${median}${suffix}`;
}

export function transformBulletMetrics(
  rows: RawBulletAggregateRow[],
  section: string,
  period: PeriodValue,
): BulletMetric[] {
  const sectionDefs = keyBy(
    [...BULLET_DEFS, ...IC_BULLET_DEFS].filter((d) => d.section === section),
    'metric_key',
  );

  const results: BulletMetric[] = [];
  for (const r of rows) {
    const def = sectionDefs[r.metric_key] ?? ALL_BULLET_DEFS_BY_KEY[r.metric_key];
    if (!def) continue; // unknown metric — skip

    const rangeMin = r.p5 ?? 0;
    const rangeMax = r.p95 ?? 100;
    const span = rangeMax - rangeMin;

    // Status thresholds: live percentiles; fall back to ±25% of range if unavailable
    const p25 = r.p25 ?? (rangeMin + span * 0.25);
    const p75 = r.p75 ?? (rangeMin + span * 0.75);

    const median = r.median ?? 0;

    // Marker: explicit target takes priority; real median next; -1 = no marker
    const hasMarker = def.target_value !== undefined || r.median !== null;
    const markerPos = def.target_value ?? median;

    results.push({
      period,
      section: def.section,
      metric_key: r.metric_key,
      label: def.label,
      sublabel: def.sublabel,
      value: String(r.value),
      unit: def.unit,
      range_min: formatRangeStr(rangeMin, def.unit),
      range_max: formatRangeStr(rangeMax, def.unit),
      median: String(median),
      median_label: hasMarker ? buildMedianLabel(median, def) : '',
      bar_left_pct: 0,
      bar_width_pct: pctInRange(r.value, rangeMin, rangeMax),
      median_left_pct: hasMarker ? pctInRange(markerPos, rangeMin, rangeMax) : -1,
      status: evaluateStatus(r.value, p25, p75, def.higher_is_better),
      drill_id: def.drill_id,
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// 4. Chart transforms
// ---------------------------------------------------------------------------

export function transformLocTrend(
  rows: RawLocTrendRow[],
  period: PeriodValue,
): LocDataPoint[] {
  return rows.map((r) => ({
    label: formatDateLabel(r.date_bucket, period),
    aiLoc: r.ai_loc,
    codeLoc: r.code_loc,
    specLines: r.spec_lines,
  }));
}

export function transformDeliveryTrend(
  rows: RawDeliveryTrendRow[],
  period: PeriodValue,
): DeliveryDataPoint[] {
  return rows.map((r) => ({
    label: formatDateLabel(r.date_bucket, period),
    commits: r.commits,
    prsMerged: r.prs_merged,
    tasksDone: r.tasks_done,
  }));
}

// ---------------------------------------------------------------------------
// 5. Team members
// ---------------------------------------------------------------------------

export function transformTeamMembers(
  rows: RawTeamMemberRow[],
  period: PeriodValue,
): TeamMember[] {
  return rows.map((r) => ({
    person_id: r.person_id,
    period,
    name: r.display_name,
    seniority: r.seniority,
    tasks_closed: r.tasks_closed,
    bugs_fixed: r.bugs_fixed,
    dev_time_h: r.dev_time_h,
    prs_merged: r.prs_merged,
    build_success_pct: r.build_success_pct,
    focus_time_pct: r.focus_time_pct,
    ai_tools: r.ai_tools,
    ai_loc_share_pct: r.ai_loc_share_pct,
  }));
}
