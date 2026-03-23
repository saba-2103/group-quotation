import type { Meta, StoryObj } from '@storybook/react';
import { SearchableDropdownWidget } from '../../components/widgets/controls/searchDropDown/index';

const meta: Meta<typeof SearchableDropdownWidget> = {
    title: 'Widgets/SearchableDropdown',
    component: SearchableDropdownWidget,
    tags: ['autodocs'],
    parameters: {
        nextjs: { appDirectory: true },
    },
};

export default meta;
type Story = StoryObj<typeof SearchableDropdownWidget>;

const countryOptions = [
    { code: 'AU', description: 'Australia' },
    { code: 'CA', description: 'Canada' },
    { code: 'CN', description: 'China' },
    { code: 'FR', description: 'France' },
    { code: 'DE', description: 'Germany' },
    { code: 'IN', description: 'India' },
    { code: 'JP', description: 'Japan' },
    { code: 'NZ', description: 'New Zealand' },
    { code: 'SG', description: 'Singapore' },
    { code: 'GB', description: 'United Kingdom' },
    { code: 'US', description: 'United States' },
];

const statusOptions = [
    { code: 'AC', description: 'Active' },
    { code: 'IA', description: 'Inactive' },
    { code: 'PE', description: 'Pending' },
    { code: 'SU', description: 'Suspended' },
];

// --- Optional field (NULL injected automatically) ---
export const OptionalField: Story = {
    args: {
        config: {
            id: 'searchable-dropdown-optional',
            type: 'searchable-dropdown',
            props: {
                label: 'Country',
                mandatory: false,
                placeholder: 'Select a country...',
                options: countryOptions,
            },
        },
    },
};

// --- Mandatory field (no NULL option) ---
export const MandatoryField: Story = {
    args: {
        config: {
            id: 'searchable-dropdown-mandatory',
            type: 'searchable-dropdown',
            props: {
                label: 'Country',
                mandatory: true,
                placeholder: 'Select a country...',
                options: countryOptions,
            },
        },
    },
};

// --- With pre-selected value ---
export const WithPreselectedValue: Story = {
    args: {
        config: {
            id: 'searchable-dropdown-preselected',
            type: 'searchable-dropdown',
            props: {
                label: 'Status',
                mandatory: true,
                placeholder: 'Select status...',
                options: statusOptions,
                value: 'AC',
            },
        },
    },
};

// --- Disabled state ---
export const Disabled: Story = {
    args: {
        config: {
            id: 'searchable-dropdown-disabled',
            type: 'searchable-dropdown',
            props: {
                label: 'Country',
                mandatory: false,
                placeholder: 'Select a country...',
                options: countryOptions,
                value: 'GB',
                disabled: true,
            },
        },
    },
};

// --- Without label ---
export const NoLabel: Story = {
    args: {
        config: {
            id: 'searchable-dropdown-no-label',
            type: 'searchable-dropdown',
            props: {
                mandatory: false,
                placeholder: 'Select status...',
                options: statusOptions,
            },
        },
    },
};
