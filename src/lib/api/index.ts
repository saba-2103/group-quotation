// Generic typed API client + Spring error envelope mapper. Domain-specific
// client modules (quotation, issuance, policy-admin) live in feature branches
// and re-export from here when they land.

export * from './client';
export * from './error-mapper';
