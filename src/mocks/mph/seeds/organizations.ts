import { Organization } from '../types';

export const organizations: Organization[] = [
  {
    id: 'org-001',
    name: 'Acme Technologies Ltd',
    pan: 'AAACA1234A',
    gst: '27AAACA1234A1Z5',
    cin: 'U72200MH2010PLC209231',
    entityType: 'company',
    address: '12th Floor, Infinity Towers, BKC',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400051',
    assignedPolicies: ['pol-gtl-001', 'pol-gcl-002', 'pol-sav-003'],
  },
];
