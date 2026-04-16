/**
 * ConnectorManagerService
 *
 * Connector Manager service is not available in the current deployment.
 * All connectors are reported as 'available' so null fields from the
 * Analytics API render as "—" rather than "Not configured".
 *
 * TODO: Wire up real Connector Manager when the service is deployed.
 * Spec: GET /api/connectors/v1/connections/{id}/status
 * See: docs/components/backend/specs/analytics-views-api.md §8
 */

import { BaseApiService, RestProtocol, apiRegistry } from '@hai3/react';
import type { DataAvailability } from '../types';

type ConnectionId = keyof DataAvailability;

const CONNECTION_IDS: ConnectionId[] = ['git', 'tasks', 'ci', 'comms', 'hr', 'ai'];

export class ConnectorManagerService extends BaseApiService {
  constructor() {
    super({ baseURL: '/api/connectors/v1' }, new RestProtocol());
  }

  /** Returns 'available' for all connectors — no real API call. */
  async getDataAvailability(): Promise<DataAvailability> {
    return Object.fromEntries(
      CONNECTION_IDS.map((id) => [id, 'available']),
    ) as DataAvailability;
  }
}

apiRegistry.register(ConnectorManagerService);
