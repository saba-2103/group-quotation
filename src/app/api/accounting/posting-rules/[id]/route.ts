import { NextResponse } from "next/server";

const mockPostingRuleHeaders: Record<string, object> = {
  "PR-001": {
    lob: "Life",
    business_process_code: "Prem-receipt",
    account_group: "GRP-001"
  },
  "PR-002": {
    lob: "Life",
    business_process_code: "Prem-receipt",
    account_group: "GRP-001"
  },
  "PR-003": {
    lob: "Health",
    business_process_code: "Prem-receipt",
    account_group: "GRP-002"
  }
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const header = mockPostingRuleHeaders[id];
  if (!header) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(header);
}
