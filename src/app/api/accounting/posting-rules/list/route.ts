import { NextResponse } from "next/server";

const mockPostingRules = [
  {
    ruleId: "PR-001",
    lob: "Life",
    businessProcessCode: "Prem-receipt",
    accountGroup: "GRP-001"
  },
  {
    ruleId: "PR-002",
    lob: "Health",
    businessProcessCode: "Prem-receipt",
    accountGroup: "GRP-002"
  }
];

export async function GET() {
  return NextResponse.json(mockPostingRules);
}
