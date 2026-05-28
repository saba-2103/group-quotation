package com.anaira.issuance.command;

// ── Proposal commands (W2) ─────────────────────────────────────────────────────

command-set ProposalCommands {
    writes ProposalEntity;
    writes ProposalPlanEntity;

    // W2: triggered by QuoteFinalized event; copies plan/mapping/census/premium from quote
    command CreateProposalCommand(
        quoteId: string,
        clientId: string,
        policyType: string,
        plans: list<Plan>,
        memberToPlanMapping: string,
        aggregateCensus: AggregateCensus,
        estimatedPremium: QuotePremium
    ): string;

    // W2: amend proposal contents while still in DRAFT
    command UpdateProposalCommand(
        proposalId: string,
        plans: list<Plan>,
        memberToPlanMapping: string,
        aggregateCensus: AggregateCensus,
        estimatedPremium: QuotePremium
    ): void;

    // W2: lock proposal from further updates
    command SubmitProposalCommand(proposalId: string): void;

    // W2: signal readiness for policy creation; ProposalFlow proceeds to CreateMasterPolicy
    command FinalizeProposalCommand(proposalId: string): void;

    // W2: plugs into Policy module — calls PolicyCommands.CreatePolicyCommand (sync REST);
    // records returned policyId/policyNumber on the Proposal and emits PolicyCreated.
    command CreateMasterPolicyCommand(proposalId: string): void;

    command CancelProposalCommand(proposalId: string, reason: string): void;
}

// ── PolicyMember commands (W3) ───────────────────────────────────────────────

command-set PolicyMemberCommands {
    writes PolicyMemberEntity;

    // W3: created from census upload, single API call, or W4 finalization
    command CreatePolicyMemberCommand(
        policyId: string,
        memberId: string,
        planNo: string,
        memberData: MemberData,
        censusSubmissionId?: string,
        censusRowNumber?: int
    ): string;

    // W3: replace memberData; resets state to CREATED and clears premium so member is re-priced
    command UpdateMemberCommand(
        policyMemberId: string,
        memberData: MemberData
    ): void;

    // W3: calls Rule Engine calculate-premium (sync REST); CREATED → PRICED
    command PriceMemberCommand(policyMemberId: string): MemberPremium;

    // W3: MAF flow — applicable for GCL or specific product rules; PRICED → MAF_PENDING
    command SendMAFCommand(policyMemberId: string): void;

    command ConfirmMAFCommand(policyMemberId: string): void;

    // W3: calls Rule Engine classify-member (sync REST); routes to STP/REPAIR/REVIEW/REJECT
    command ClassifyMemberCommand(policyMemberId: string): ClassifyMemberResult;

    // W3: lane = REPAIR → emits MemberRepairRequested → Kafka → Ops Workbench
    command MarkRepairPendingCommand(
        policyMemberId: string,
        errors: list<ClassificationError>
    ): void;

    // W3: MemberRepairCompleted received from Kafka → apply corrections → re-classify
    command CompleteMemberRepairCommand(
        policyMemberId: string,
        corrections: MemberRepairCorrections
    ): void;

    // W3: lane = REVIEW → emits MemberReferredToUw → Kafka → UW Workbench
    command MarkReferredToUwCommand(
        policyMemberId: string,
        uwQuestionSetCode: string
    ): void;

    // W3: UW workbench approved the case; REFERRED_TO_UW → CLASSIFYING (caller re-runs classify)
    command ApproveUwCaseCommand(policyMemberId: string): void;

    // W3: UW workbench rejected the case; REFERRED_TO_UW → REJECTED
    command RejectUwCaseCommand(policyMemberId: string, reason: string): void;

    // W3: lane = STP → CLASSIFYING → APPROVED (premium already set by PriceMember)
    command ApproveMemberCommand(policyMemberId: string): void;

    // W3: lane = REJECT
    command RejectMemberCommand(policyMemberId: string, reason: string): void;

    // W3: APPROVED → SENT_FOR_ISSUANCE; explicit handoff signal before Policy Admin call
    command SendMemberForIssuanceCommand(policyMemberId: string): void;

    // W3: calls Float Mgmt deduct (mock) + Policy Admin add-member (sync REST) → ADDED
    command AddMemberToPolicyCommand(policyMemberId: string): void;

    // W3: ops cleanup of unused/abandoned members; terminal
    command ArchiveMemberCommand(policyMemberId: string, reason: string): void;
}

// ── CensusSubmission commands ────────────────────────────────────────────────

command-set CensusSubmissionCommands {
    writes CensusSubmissionEntity;
    writes CensusSubmissionRowEntity;
    writes PolicyMemberEntity;

    // Issues an opaque presigned uploadUrl + fileRef from the storage layer and
    // persists the submission in INITIATED. UI PUTs the file to uploadUrl next.
    command InitiateCensusSubmissionCommand(policyId: string): InitiateCensusSubmissionResult;

    // Reads the uploaded file by its fileRef, parses + validates rows,
    // persists CensusSubmissionRow records, transitions submission to INGESTED.
    // Quote-defined-format validation is deferred; this command does only structural parsing.
    command IngestCensusFileCommand(submissionId: string): void;

    // Transitions submission to SUBMITTED and emits CensusSubmissionSubmitted.
    // A workflow processor consumes the event and starts MemberLifecycleFlow per accepted row,
    // each invoking CreatePolicyMemberCommand with the row's payload.
    command SubmitCensusSubmissionCommand(submissionId: string): void;

    // Persistence side of CensusSubmission.recordCompletion(); fired by CensusSubmissionFlow
    // once every accepted row has reached a terminal PolicyMember state.
    command RecordCensusSubmissionCompletionCommand(submissionId: string): void;
}
