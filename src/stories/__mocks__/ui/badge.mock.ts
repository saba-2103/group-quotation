export const badgeMocks = {
  variants: [
    "default",
    "secondary",
    "destructive",
    "outline",
    "success",
    "warning",
    "info",
  ] as const,

  labels: {
    default: "Default",
    secondary: "Secondary",
    destructive: "Rejected",
    outline: "Outline",
    success: "Approved",
    warning: "Pending",
    info: "In Progress",
  },

  statusExamples: {
    census: [
      { label: "Not Started", variant: "default" as const },
      { label: "Uploaded", variant: "info" as const },
      { label: "Exceptions", variant: "warning" as const },
      { label: "Approved", variant: "success" as const },
    ],
    fcl: [
      { label: "Not Computed", variant: "default" as const },
      { label: "Computed", variant: "success" as const },
      { label: "Evidence Pending", variant: "warning" as const },
    ],
  },
};
