import { SideBarType, type AppConfig } from '@shared/types';

export const mphAppConfig: AppConfig = {
  title: 'MPH Portal',
  description: 'Master Policyholder Self-Service Portal',
  logo: {
    icon: 'Shield',
    size: 32,
  },
  navigation: {
    sideBarType: SideBarType.NESTED,
    menuItems: [
      {
        id: 'mph-dashboard',
        label: 'Dashboard',
        url: '/mph/dashboard',
        icon: 'LayoutDashboard',
      },
      {
        id: 'mph-setup',
        label: 'Buy / Setup',
        url: '/mph/setup',
        icon: 'ClipboardList',
      },
      {
        id: 'mph-policies',
        label: 'Policies',
        url: '/mph/policies',
        icon: 'FileText',
      },
      {
        id: 'mph-members',
        label: 'Members',
        icon: 'Users',
        subMenuItems: [
          { id: 'mph-members-roster', label: 'Roster', url: '/mph/members' },
          { id: 'mph-members-add', label: 'Add Member', url: '/mph/members/add' },
          { id: 'mph-members-bulk', label: 'Bulk Upload', url: '/mph/members/bulk' },
        ],
      },
      {
        id: 'mph-endorsements',
        label: 'Endorsements',
        url: '/mph/endorsements',
        icon: 'FilePen',
      },
      {
        id: 'mph-claims',
        label: 'Claims',
        url: '/mph/claims',
        icon: 'Stethoscope',
      },
      {
        id: 'mph-renewals',
        label: 'Renewals',
        url: '/mph/renewals',
        icon: 'RefreshCw',
      },
      {
        id: 'mph-billing',
        label: 'Billing & Statements',
        url: '/mph/billing',
        icon: 'Receipt',
      },
      {
        id: 'mph-documents',
        label: 'Documents',
        icon: 'FolderOpen',
        subMenuItems: [
          { id: 'mph-doc-center', label: 'Document Center', url: '/mph/documents' },
          { id: 'mph-corporate-docs', label: 'Corporate Documents', url: '/mph/documents/corporate' },
        ],
      },
      {
        id: 'mph-wallet',
        label: 'Wallet / Cash Deposit',
        url: '/mph/wallet',
        icon: 'Wallet',
      },
      {
        id: 'mph-mis',
        label: 'MIS / Reports',
        url: '/mph/mis',
        icon: 'BarChart3',
      },
      {
        id: 'mph-tasks',
        label: 'Tasks & Notifications',
        url: '/mph/tasks',
        icon: 'Bell',
      },
      {
        id: 'mph-admin',
        label: 'Administration',
        icon: 'Settings',
        subMenuItems: [
          { id: 'mph-admin-users', label: 'Users & Roles', url: '/mph/admin/users' },
          { id: 'mph-admin-audit', label: 'Audit Trail', url: '/mph/admin/audit' },
          { id: 'mph-admin-service-requests', label: 'Service Requests', url: '/mph/admin/service-requests' },
        ],
      },
    ],
  },
};
