/**
 * insightMockMap — wires factories.ts mock builders into the URL routes
 * the analytics-api gateway exposes. Consumed by `InsightApiService`
 * when `VITE_ENABLE_MOCKS=true`.
 *
 * Keys are full request paths (RestMockPlugin matches against the full
 * URL, see connectorManagerService.ts for the same pattern). Method
 * prefix is required.
 */

import type { MockMap } from '@hai3/react';
import { METRIC_REGISTRY } from '../metricRegistry';
import {
  mockExecRows,
  mockTeamMemberRows,
  mockTeamBulletSection,
  mockIcAggregateRow,
  mockIcBulletSection,
  mockLocTrendSeries,
  mockDeliveryTrendSeries,
} from './factories';
import { PEOPLE } from './registry';

const wrap = <T>(items: T[]) => ({
  items,
  page_info: { has_next: false, cursor: null },
});

// Default IC view persona — first PEOPLE entry (Bob Park demo target).
const defaultPersonId = PEOPLE[0]?.person_id ?? 'bob.park@example.com';

// Key format used by hai3 RestMockPlugin.findMockFactory:
//   `${method.toUpperCase()} ${context.url}`
// We don't know whether `context.url` is the absolute path or the
// path-after-baseURL. Register BOTH so it works either way.
const handlers: MockMap = {
  [METRIC_REGISTRY.EXEC_SUMMARY]:         () => wrap(mockExecRows()),
  [METRIC_REGISTRY.TEAM_MEMBER]:          () => wrap(mockTeamMemberRows()),
  // Team-view sections use BULLET_DEFS section names: 'task_delivery',
  // 'code_quality', 'collaboration', 'ai_adoption'. NOT the IC namespace
  // ('collab' / 'ai_tools') which only IC_BULLET_DEFS uses.
  [METRIC_REGISTRY.TEAM_BULLET_DELIVERY]: () => wrap(mockTeamBulletSection('task_delivery')),
  [METRIC_REGISTRY.TEAM_BULLET_QUALITY]:  () => wrap(mockTeamBulletSection('code_quality')),
  [METRIC_REGISTRY.TEAM_BULLET_COLLAB]:   () => wrap(mockTeamBulletSection('collaboration')),
  [METRIC_REGISTRY.TEAM_BULLET_AI]:       () => wrap(mockTeamBulletSection('ai_adoption')),
  [METRIC_REGISTRY.IC_KPIS]:              () => wrap([mockIcAggregateRow({ person_id: defaultPersonId })]),
  [METRIC_REGISTRY.IC_BULLET_DELIVERY]:   () => wrap(mockIcBulletSection('task_delivery')),
  [METRIC_REGISTRY.IC_BULLET_COLLAB]:     () => wrap(mockIcBulletSection('collab')),
  [METRIC_REGISTRY.IC_BULLET_AI]:         () => wrap(mockIcBulletSection('ai_tools')),
  [METRIC_REGISTRY.IC_BULLET_GIT]:        () => wrap(mockIcBulletSection('git_output')),
  [METRIC_REGISTRY.IC_CHART_LOC]:         () => wrap(mockLocTrendSeries(8)),
  [METRIC_REGISTRY.IC_CHART_DELIVERY]:    () => wrap(mockDeliveryTrendSeries(8)),
  [METRIC_REGISTRY.IC_DRILL]:             () => wrap([]),
  [METRIC_REGISTRY.IC_TIMEOFF]:           () => wrap([]),
};

const map: MockMap = {};
for (const [id, fn] of Object.entries(handlers)) {
  map[`POST /api/analytics/v1/metrics/${id}/query`] = fn;
  map[`POST /metrics/${id}/query`] = fn;
}

export const insightMockMap: MockMap = map;
