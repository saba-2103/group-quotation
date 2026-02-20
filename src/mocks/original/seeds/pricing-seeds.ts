import { Product, PremiumMethod, RateRow } from '@shared/types';

export const productSeeds: Product[] = [
    { code: 'GTL_BASE', name: 'Group Term Life Base', type: 'Base' },
    { code: 'GTL_ADD_ACC', name: 'Accidental Death Benefit', type: 'Rider' },
    { code: 'GTL_ADD_CI', name: 'Critical Illness', type: 'Rider' }
];

export const premiumMethodSeeds: PremiumMethod[] = [
    { id: 'pm-1', rateTableId: 'rt-standard-2025', name: 'Standard GTL Rates 2025', lookupBasis: 'Age' }
];

export const rateRowSeeds: RateRow[] = [
    { rateTableId: 'rt-standard-2025', minAge: 18, maxAge: 25, ratePer1000: 1.2 },
    { rateTableId: 'rt-standard-2025', minAge: 26, maxAge: 35, ratePer1000: 1.5 },
    { rateTableId: 'rt-standard-2025', minAge: 36, maxAge: 45, ratePer1000: 2.5 },
    { rateTableId: 'rt-standard-2025', minAge: 46, maxAge: 55, ratePer1000: 4.0 },
    { rateTableId: 'rt-standard-2025', minAge: 56, maxAge: 65, ratePer1000: 8.5 }
];
