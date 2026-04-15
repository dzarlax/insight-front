/**
 * Mock Data Registry — Single Source of Truth
 *
 * All mock data derives from these definitions. Every handler, factory,
 * and identity service must reference this registry instead of having
 * its own hardcoded lists.
 */

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export type MockTeam = {
  id: string;
  name: string;
};

export const TEAMS: MockTeam[] = [
  { id: 'backend',  name: 'Backend' },
  { id: 'frontend', name: 'Frontend' },
  { id: 'platform', name: 'Platform' },
  { id: 'data',     name: 'Data' },
  { id: 'qa',       name: 'QA' },
  { id: 'mobile',   name: 'Mobile' },
];

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export type MockPerson = {
  person_id: string;
  name: string;
  team_id: string;
  role: string;
  seniority: string;
  is_lead: boolean;
  ai_tools: string[];
};

export const PEOPLE: MockPerson[] = [
  // Backend (5 members)
  { person_id: 'p1',  name: 'Alice Kim',      team_id: 'backend',  role: 'Senior Software Engineer', seniority: 'Senior',    is_lead: false, ai_tools: ['Cursor', 'Claude Code'] },
  { person_id: 'p2',  name: 'Bob Park',       team_id: 'backend',  role: 'Tech Lead',                seniority: 'Staff',     is_lead: true,  ai_tools: ['Cursor'] },
  { person_id: 'p13', name: 'Nora Vega',      team_id: 'backend',  role: 'Software Engineer',        seniority: 'Mid',       is_lead: false, ai_tools: ['Cursor', 'Claude Code'] },
  { person_id: 'p14', name: 'Oscar Grant',     team_id: 'backend',  role: 'Junior Software Engineer', seniority: 'Junior',    is_lead: false, ai_tools: ['Cursor'] },
  { person_id: 'p15', name: 'Priya Sharma',    team_id: 'backend',  role: 'Senior Software Engineer', seniority: 'Senior',    is_lead: false, ai_tools: ['Claude Code'] },
  // Frontend (4 members)
  { person_id: 'p3',  name: 'Carol Chen',     team_id: 'frontend', role: 'Tech Lead',                seniority: 'Staff',     is_lead: true,  ai_tools: ['Codex'] },
  { person_id: 'p4',  name: 'David Liu',      team_id: 'frontend', role: 'Junior Software Engineer', seniority: 'Junior',    is_lead: false, ai_tools: ['Cursor'] },
  { person_id: 'p16', name: 'Mia Torres',     team_id: 'frontend', role: 'Software Engineer',        seniority: 'Mid',       is_lead: false, ai_tools: ['Cursor', 'Codex'] },
  { person_id: 'p17', name: 'Ryan Clark',     team_id: 'frontend', role: 'Senior Software Engineer', seniority: 'Senior',    is_lead: false, ai_tools: [] },
  // Platform (3 members)
  { person_id: 'p5',  name: 'Eve Novak',      team_id: 'platform', role: 'Staff Software Engineer',  seniority: 'Staff',     is_lead: false, ai_tools: ['Cursor', 'Claude Code'] },
  { person_id: 'p6',  name: 'Frank Moss',     team_id: 'platform', role: 'Tech Lead',                seniority: 'Principal', is_lead: true,  ai_tools: ['Claude Code'] },
  { person_id: 'p18', name: 'Sam Ortiz',      team_id: 'platform', role: 'Software Engineer',        seniority: 'Mid',       is_lead: false, ai_tools: ['Cursor'] },
  // Data (3 members)
  { person_id: 'p7',  name: 'Grace Wu',       team_id: 'data',     role: 'Software Engineer',        seniority: 'Mid',       is_lead: false, ai_tools: ['Cursor'] },
  { person_id: 'p8',  name: 'Hank Reed',      team_id: 'data',     role: 'Tech Lead',                seniority: 'Senior',    is_lead: true,  ai_tools: ['Cursor', 'Codex'] },
  { person_id: 'p19', name: 'Tina Pham',      team_id: 'data',     role: 'Junior Software Engineer', seniority: 'Junior',    is_lead: false, ai_tools: ['Claude Code'] },
  // QA (3 members)
  { person_id: 'p9',  name: 'Iris Tan',       team_id: 'qa',       role: 'Junior Software Engineer', seniority: 'Junior',    is_lead: false, ai_tools: [] },
  { person_id: 'p10', name: 'Jake Fox',       team_id: 'qa',       role: 'Tech Lead',                seniority: 'Mid',       is_lead: true,  ai_tools: ['Cursor'] },
  { person_id: 'p20', name: 'Uma Roy',        team_id: 'qa',       role: 'Software Engineer',        seniority: 'Mid',       is_lead: false, ai_tools: ['Cursor', 'Claude Code'] },
  // Mobile (3 members)
  { person_id: 'p11', name: 'Kira Sato',      team_id: 'mobile',   role: 'Tech Lead',                seniority: 'Senior',    is_lead: true,  ai_tools: ['Claude Code', 'Codex'] },
  { person_id: 'p12', name: 'Leo Dunn',       team_id: 'mobile',   role: 'Junior Software Engineer', seniority: 'Junior',    is_lead: false, ai_tools: ['Cursor'] },
  { person_id: 'p21', name: 'Vera Cole',      team_id: 'mobile',   role: 'Software Engineer',        seniority: 'Mid',       is_lead: false, ai_tools: [] },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Map person_id → MockPerson for O(1) lookup */
export const PEOPLE_BY_ID: Record<string, MockPerson> = Object.fromEntries(
  PEOPLE.map((p) => [p.person_id, p]),
);

/** Get all people in a team */
export function teamMembers(teamId: string): MockPerson[] {
  return PEOPLE.filter((p) => p.team_id === teamId);
}

/** Get team headcount */
export function teamHeadcount(teamId: string): number {
  return PEOPLE.filter((p) => p.team_id === teamId).length;
}
