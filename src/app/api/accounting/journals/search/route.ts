import { NextResponse } from 'next/server';

const journalsMockData = [
    {
        journal_number: "JNL-2024-001",
        journal_date: "2024-03-15",
        account_year: "2024",
        account_month: "03",
        journal_status: "POSTED",
        reversed_journal_number: "",
        balance_error_flag: "N",
        lob: "LIFE",
        business_key: "RCP-10001",
        tranno: 1001,
        business_process_code: "BP-MIN-RCPT-NEW",
        accounting_event_id: "EVT-ACC-20240315",
        account_group: "GRP-001"
    },
    {
        journal_number: "JNL-2024-002",
        journal_date: "2024-03-20",
        account_year: "2024",
        account_month: "03",
        journal_status: "PENDING",
        reversed_journal_number: "",
        balance_error_flag: "N",
        lob: "HEALTH",
        business_key: "POL-20002",
        tranno: 1002,
        business_process_code: "BP-MIN-RCPT-NEW",
        accounting_event_id: "EVT-ACC-20240320",
        account_group: "GRP-002"
    }
];

export async function GET() {
    return NextResponse.json(journalsMockData);
}
