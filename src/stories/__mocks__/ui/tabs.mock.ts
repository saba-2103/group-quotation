export const tabsMocks = {
  tabs: {
    simple: ["Overview", "Policy", "Documents"],

    case: ["Common Header", "Policy Profile", "Documents", "Plans"],

    caseWithDisabled: ["Overview", "Policy", "Plans"],

    many: [
      "Common Header",
      "Policy Profile",
      "Documents",
      "Exclusions",
      "Subsidiaries",
      "Plans",
      "Plan Products",
      "Health",
      "Term Life",
      "Credit Life",
      "Investment",
      "Benefits",
    ],
  },

  content: {
    overview: "Overview content goes here.",
    policy: "Policy content goes here.",
    documents: "Documents content goes here.",
    commonHeader: "Common Header tab content.",
    policyProfile: "Policy Profile tab content.",
    plans: "Plans tab content.",
  } as Record<string, string>,
};
