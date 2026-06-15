import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Browser-side MSW worker (used in development via root layout).
export const worker = setupWorker(...handlers);
