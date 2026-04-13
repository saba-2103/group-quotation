import { NextResponse } from "next/server";

const mockPostingRuleLines: Record<string, object[]> = {
  "PR-001": [
    {
      acct_seqno: 1,
      account_sub_group: "Sub-group-A",
      dc_ind: "D",
      gl_pseudo_name: "Prem-income-life"
    },
    {
      acct_seqno: 2,
      account_sub_group: "Sub-group-B",
      dc_ind: "C",
      gl_pseudo_name: "Cash-clearing"
    }
  ],
  "PR-002": [
    {
      acct_seqno: 1,
      account_sub_group: "Sub-group-A",
      dc_ind: "D",
      gl_pseudo_name: "Prem-income-life"
    }
  ],
  "PR-003": [
    {
      acct_seqno: 1,
      account_sub_group: "Sub-group-C",
      dc_ind: "D",
      gl_pseudo_name: "Prem-income-health"
    },
    {
      acct_seqno: 2,
      account_sub_group: "Sub-group-D",
      dc_ind: "C",
      gl_pseudo_name: "Cash-clearing"
    }
  ]
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json(mockPostingRuleLines[id] ?? []);
}
