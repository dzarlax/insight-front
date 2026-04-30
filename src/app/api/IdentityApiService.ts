/**
 * Identity API Service
 * Fetches person data from the Identity Resolution service via the API Gateway.
 *
 * Uses the JWT `sub` claim (email) to look up the current user.
 */

import { BaseApiService, RestProtocol, RestMockPlugin, apiRegistry } from '@hai3/react';
import { AuthPlugin } from '@/app/plugins/AuthPlugin';
import { mocksEnabled } from '@/app/config/mocksEnabled';
import type { IdentityPerson, IdentityPersonRaw } from '@/app/types/identity';
import { toIdentityPerson } from '@/app/types/identity';

export class IdentityApiService extends BaseApiService {
  constructor() {
    const restProtocol = new RestProtocol({ timeout: 10000 });

    super({ baseURL: '/api/identity-resolution/v1' }, restProtocol);

    if (mocksEnabled()) {
      // Mock map is dynamically imported so production bundles never pull
      // in the demo-tenant data — same pattern as InsightApiService.
      void import('./identityMocks').then(({ identityMockMap }) => {
        this.registerPlugin(
          restProtocol,
          new RestMockPlugin({ mockMap: identityMockMap, delay: 50 }),
        );
      });
    }

    restProtocol.plugins.add(new AuthPlugin());
  }

  /** Look up a person by email. */
  async getPersonByEmail(email: string): Promise<IdentityPerson> {
    const raw = await this.protocol(RestProtocol).get<IdentityPersonRaw>(`/persons/${encodeURIComponent(email)}`);
    return toIdentityPerson(raw);
  }
}

apiRegistry.register(IdentityApiService);
