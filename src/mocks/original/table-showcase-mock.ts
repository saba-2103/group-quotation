import type { TableConfig, RowData } from "@shared/types";

// ============================================
// TABLE 1: Basic Table (No Selection, No Actions)
// ============================================

export const basicTableConfig: TableConfig = {
  columns: [
    {
      id: "productName",
      header: "Product Name",
      accessorKey: "productName",
      width: "200px",
      type: "text"
    },
    {
      id: "category",
      header: "Category",
      accessorKey: "category",
      width: "150px",
      type: "text"
    },
    {
      id: "price",
      header: "Price",
      accessorKey: "price",
      width: "120px",
      type: "currency",
      align: "right"
    },
    {
      id: "stock",
      header: "Stock",
      accessorKey: "stock",
      width: "100px",
      type: "number",
      align: "right"
    }
  ],
  selectable: false,
  pagination: {
    enabled: false,
    pageSize: 10
  }
};

export const basicTableData: RowData[] = [
  { id: "1", productName: "Laptop Pro", category: "Electronics", price: 1299, stock: 45 },
  { id: "2", productName: "Wireless Mouse", category: "Accessories", price: 29, stock: 120 },
  { id: "3", productName: "USB-C Cable", category: "Accessories", price: 15, stock: 200 }
];

// ============================================
// TABLE 2: Selectable Table with Bulk Actions
// ============================================

export const selectableTableConfig: TableConfig = {
  columns: [
    {
      id: "employeeId",
      header: "Employee ID",
      accessorKey: "employeeId",
      width: "120px",
      type: "link",
      linkRoute: "/employees/:id"
    },
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
      width: "180px",
      type: "text"
    },
    {
      id: "department",
      header: "Department",
      accessorKey: "department",
      width: "150px",
      type: "badge",
      valueMapping: [
        { value: "Engineering", label: "Engineering", color: "info" },
        { value: "Sales", label: "Sales", color: "success" },
        { value: "HR", label: "HR", color: "warning" }
      ]
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      width: "120px",
      type: "status",
      valueMapping: [
        { value: "Active", label: "Active", color: "success" },
        { value: "On Leave", label: "On Leave", color: "warning" }
      ]
    }
  ],
  selectable: true,
  bulkActions: [
    {
      id: "export",
      label: "Export",
      icon: "Download",
      intent: "export"
    },
    {
      id: "delete",
      label: "Delete",
      icon: "Trash2",
      intent: "delete",
      variant: "destructive"
    }
  ],
  pagination: {
    enabled: true,
    pageSize: 5
  }
};

export const selectableTableData: RowData[] = [
  { id: "1", employeeId: "EMP001", name: "John Doe", department: "Engineering", status: "Active" },
  { id: "2", employeeId: "EMP002", name: "Jane Smith", department: "Sales", status: "Active" },
  { id: "3", employeeId: "EMP003", name: "Bob Johnson", department: "HR", status: "On Leave" },
  { id: "4", employeeId: "EMP004", name: "Alice Brown", department: "Engineering", status: "Active" },
  { id: "5", employeeId: "EMP005", name: "Charlie Wilson", department: "Sales", status: "Active" }
];

// ============================================
// TABLE 3: Table with Row Actions
// ============================================

export const rowActionsTableConfig: TableConfig = {
  columns: [
    {
      id: "orderId",
      header: "Order ID",
      accessorKey: "orderId",
      width: "120px",
      type: "link",
      linkRoute: "/orders/:id"
    },
    {
      id: "customer",
      header: "Customer",
      accessorKey: "customer",
      width: "180px",
      type: "text"
    },
    {
      id: "amount",
      header: "Amount",
      accessorKey: "amount",
      width: "120px",
      type: "currency",
      align: "right"
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      width: "120px",
      type: "status",
      valueMapping: [
        { value: "Pending", label: "Pending", color: "warning" },
        { value: "Completed", label: "Completed", color: "success" },
        { value: "Cancelled", label: "Cancelled", color: "error" }
      ]
    }
  ],
  rowActions: [
    {
      id: "view",
      label: "View",
      icon: "Eye",
      intent: "view"
    },
    {
      id: "edit",
      label: "Edit",
      icon: "Edit",
      intent: "edit"
    },
    {
      id: "delete",
      label: "Delete",
      icon: "Trash2",
      intent: "delete",
      variant: "destructive"
    }
  ],
  selectable: false,
  pagination: {
    enabled: true,
    pageSize: 5
  }
};

export const rowActionsTableData: RowData[] = [
  { id: "1", orderId: "ORD-001", customer: "Acme Corp", amount: 5000, status: "Completed" },
  { id: "2", orderId: "ORD-002", customer: "Tech Solutions", amount: 3500, status: "Pending" },
  { id: "3", orderId: "ORD-003", customer: "Global Industries", amount: 7200, status: "Completed" },
  { id: "4", orderId: "ORD-004", customer: "StartUp Inc", amount: 1200, status: "Cancelled" }
];

// ============================================
// TABLE 4: Full-Featured Table (Selection + Row Actions + Bulk Actions)
// ============================================

export const fullFeaturedTableConfig: TableConfig = {
  columns: [
    {
      id: "ticketId",
      header: "Ticket ID",
      accessorKey: "ticketId",
      width: "120px",
      type: "link",
      linkRoute: "/tickets/:id"
    },
    {
      id: "title",
      header: "Title",
      accessorKey: "title",
      width: "250px",
      type: "text"
    },
    {
      id: "priority",
      header: "Priority",
      accessorKey: "priority",
      width: "120px",
      type: "badge",
      valueMapping: [
        { value: "Low", label: "Low", color: "default" },
        { value: "Medium", label: "Medium", color: "info" },
        { value: "High", label: "High", color: "warning" },
        { value: "Critical", label: "Critical", color: "error" }
      ]
    },
    {
      id: "assignee",
      header: "Assignee",
      accessorKey: "assignee",
      width: "150px",
      type: "text"
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      width: "120px",
      type: "status",
      valueMapping: [
        { value: "Open", label: "Open", color: "info" },
        { value: "In Progress", label: "In Progress", color: "warning" },
        { value: "Resolved", label: "Resolved", color: "success" }
      ]
    }
  ],
  selectable: true,
  rowActions: [
    {
      id: "view",
      label: "View",
      icon: "Eye",
      intent: "view"
    },
    {
      id: "edit",
      label: "Edit",
      icon: "Edit",
      intent: "edit"
    }
  ],
  bulkActions: [
    {
      id: "assign",
      label: "Assign",
      icon: "UserPlus",
      intent: "assign"
    },
    {
      id: "close",
      label: "Close",
      icon: "CheckCircle",
      intent: "approve"
    },
    {
      id: "delete",
      label: "Delete",
      icon: "Trash2",
      intent: "delete",
      variant: "destructive"
    }
  ],
  pagination: {
    enabled: true,
    pageSize: 5
  }
};

export const fullFeaturedTableData: RowData[] = [
  {
    id: "1",
    ticketId: "TKT-001",
    title: "Login issue on mobile app",
    priority: "High",
    assignee: "John Doe",
    status: "In Progress"
  },
  {
    id: "2",
    ticketId: "TKT-002",
    title: "Payment gateway error",
    priority: "Critical",
    assignee: "Jane Smith",
    status: "Open"
  },
  {
    id: "3",
    ticketId: "TKT-003",
    title: "UI alignment issue",
    priority: "Low",
    assignee: "Bob Johnson",
    status: "Resolved"
  },
  {
    id: "4",
    ticketId: "TKT-004",
    title: "Database connection timeout",
    priority: "High",
    assignee: "Alice Brown",
    status: "In Progress"
  },
  {
    id: "5",
    ticketId: "TKT-005",
    title: "Email notification not working",
    priority: "Medium",
    assignee: "Charlie Wilson",
    status: "Open"
  }
];

// ============================================
// TABLE 5: Wide Table with Sticky Columns (>7 columns)
// ============================================

export const wideTableConfig: TableConfig = {
  columns: [
    {
      id: "transactionId",
      header: "Transaction ID",
      accessorKey: "transactionId",
      width: "150px",
      type: "link",
      linkRoute: "/transactions/:id"
    },
    {
      id: "date",
      header: "Date",
      accessorKey: "date",
      width: "120px",
      type: "date"
    },
    {
      id: "merchant",
      header: "Merchant",
      accessorKey: "merchant",
      width: "180px",
      type: "text"
    },
    {
      id: "category",
      header: "Category",
      accessorKey: "category",
      width: "130px",
      type: "badge",
      valueMapping: [
        { value: "Food", label: "Food", color: "success" },
        { value: "Transport", label: "Transport", color: "info" },
        { value: "Shopping", label: "Shopping", color: "warning" }
      ]
    },
    {
      id: "amount",
      header: "Amount",
      accessorKey: "amount",
      width: "120px",
      type: "currency",
      align: "right"
    },
    {
      id: "paymentMethod",
      header: "Payment Method",
      accessorKey: "paymentMethod",
      width: "150px",
      type: "text"
    },
    {
      id: "location",
      header: "Location",
      accessorKey: "location",
      width: "180px",
      type: "text"
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      width: "120px",
      type: "status",
      valueMapping: [
        { value: "Completed", label: "Completed", color: "success" },
        { value: "Pending", label: "Pending", color: "warning" },
        { value: "Failed", label: "Failed", color: "error" }
      ]
    }
  ],
  selectable: true,
  rowActions: [
    {
      id: "view",
      label: "View Details",
      icon: "Eye",
      intent: "view"
    },
    {
      id: "refund",
      label: "Refund",
      icon: "RotateCcw",
      intent: "custom"
    }
  ],
  pagination: {
    enabled: true,
    pageSize: 5
  }
};

export const wideTableData: RowData[] = [
  {
    id: "1",
    transactionId: "TXN-2024-001",
    date: "2024-01-15",
    merchant: "Starbucks",
    category: "Food",
    amount: 12.5,
    paymentMethod: "Credit Card",
    location: "New York, NY",
    status: "Completed"
  },
  {
    id: "2",
    transactionId: "TXN-2024-002",
    date: "2024-01-16",
    merchant: "Uber",
    category: "Transport",
    amount: 25.0,
    paymentMethod: "Debit Card",
    location: "San Francisco, CA",
    status: "Completed"
  },
  {
    id: "3",
    transactionId: "TXN-2024-003",
    date: "2024-01-17",
    merchant: "Amazon",
    category: "Shopping",
    amount: 89.99,
    paymentMethod: "Credit Card",
    location: "Seattle, WA",
    status: "Pending"
  },
  {
    id: "4",
    transactionId: "TXN-2024-004",
    date: "2024-01-18",
    merchant: "McDonald's",
    category: "Food",
    amount: 8.75,
    paymentMethod: "Cash",
    location: "Chicago, IL",
    status: "Completed"
  }
];

// ============================================
// TABLE 6: Minimal Table (2 columns, no features)
// ============================================

export const minimalTableConfig: TableConfig = {
  columns: [
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
      width: "200px",
      type: "text"
    },
    {
      id: "value",
      header: "Value",
      accessorKey: "value",
      width: "150px",
      type: "text",
      align: "right"
    }
  ],
  selectable: false,
  pagination: {
    enabled: false,
    pageSize: 10
  }
};

export const minimalTableData: RowData[] = [
  { id: "1", name: "Total Users", value: "1,234" },
  { id: "2", name: "Active Sessions", value: "456" },
  { id: "3", name: "Revenue", value: "$12,345" }
];

// ============================================
// Mock Data Registry
// ============================================

export const tableShowcaseMock: Record<string, { config: TableConfig; data: RowData[] }> = {
  "basic-table": {
    config: basicTableConfig,
    data: basicTableData
  },
  "selectable-table": {
    config: selectableTableConfig,
    data: selectableTableData
  },
  "row-actions-table": {
    config: rowActionsTableConfig,
    data: rowActionsTableData
  },
  "full-featured-table": {
    config: fullFeaturedTableConfig,
    data: fullFeaturedTableData
  },
  "wide-table": {
    config: wideTableConfig,
    data: wideTableData
  },
  "minimal-table": {
    config: minimalTableConfig,
    data: minimalTableData
  }
};
