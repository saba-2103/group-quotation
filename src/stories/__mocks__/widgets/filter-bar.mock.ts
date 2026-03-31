import { FilterConfig } from '@/components/widgets/controls/FilterBar';

const laneFilter: FilterConfig = {
    id: "lane",
    label: "Lane",
    type: "select",
    options: [
        { value: "GREEN", label: "Green" },
        { value: "AMBER", label: "Amber" },
        { value: "RED", label: "Red" },
    ],
};

const statusFilter: FilterConfig = {
    id: "status",
    label: "Status",
    type: "select",
    options: [
        { value: "active", label: "Active" },
        { value: "pending", label: "Pending" },
        { value: "expired", label: "Expired" },
    ],
};

const branchFilter: FilterConfig = {
    id: "branch",
    label: "Branch",
    type: "select",
    field: "branch",
    options: [
        { value: "dubai", label: "Dubai" },
        { value: "abu-dhabi", label: "Abu Dhabi" },
        { value: "sharjah", label: "Sharjah" },
    ],
};

const policyTypeFilter: FilterConfig = {
    id: "policyType",
    label: "Policy Type",
    type: "select",
    options: [
        { value: "health", label: "Health" },
        { value: "life", label: "Life" },
        { value: "auto", label: "Auto" },
    ],
};

export const filterBarMocks = {
    // Pattern: claims-list.json — no stateKey, no field
    claims: {
        filters: [laneFilter, statusFilter],
    },

    // Pattern: members.json — custom placeholder, no stateKey
    members: {
        placeholder: "Search members...",
        filters: [statusFilter, policyTypeFilter],
    },

    // Pattern: quotations.json — explicit stateKey, field on filters
    quotations: {
        stateKey: "story:filter-bar:quotations",
        filters: [branchFilter, statusFilter, policyTypeFilter],
    },
};
