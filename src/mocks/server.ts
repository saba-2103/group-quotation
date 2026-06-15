import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Node-side MSW server (used in Jest / Vitest tests).
export const server = setupServer(...handlers);
