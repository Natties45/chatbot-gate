import { Role, User } from '@chatbot-gate/shared';

export const mockUsers: User[] = [
  { id: '1', username: 'admin', role: 'ADMIN', status: 'ACTIVE' },
  { id: '2', username: 'noc01', role: 'NOC', status: 'ACTIVE' },
  { id: '3', username: 'noc02', role: 'NOC', status: 'ACTIVE' },
  { id: '4', username: 'ops01', role: 'OPERATION', status: 'ACTIVE' },
  { id: '5', username: 'ops02', role: 'OPERATION', status: 'ACTIVE' },
];

export const mockSettings = {
  KB_REPO_URL: 'https://github.com/company/kb-data',
  AI_MODEL: 'gemini-1.5-pro',
  CASE_PUSH_ENDPOINT: 'https://api.company.local/cases'
};
