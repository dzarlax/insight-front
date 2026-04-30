/**
 * Identity Resolution mock map.
 *
 * Mirrors the pattern used by `src/screensets/insight/api/mocks.ts` for the
 * analytics endpoints: the mock map is a separate, dynamically-imported
 * module that the consuming `*ApiService` registers when `mocksEnabled()`
 * is true. Identity tree is sourced from the screenset's `PEOPLE` registry
 * via `buildIdentityTree`, so the demo-tenant hierarchy lives in exactly
 * one place.
 */

import type { MockMap } from '@hai3/react';
import { buildIdentityTree } from '@/screensets/insight/api/mocks/registry';
import type { IdentityPersonRaw } from '@/app/types/identity';

export const identityMockMap: MockMap = {
  'GET /api/identity-resolution/v1/persons/:email': (
    _body: unknown,
    params?: Record<string, string>,
  ): IdentityPersonRaw | null => {
    const email = decodeURIComponent(params?.email ?? '');
    return buildIdentityTree(email) as IdentityPersonRaw | null;
  },
};
