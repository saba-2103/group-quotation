package com.anaira.policyadmin.command;

// Cross-workflow signaling, sweeper, and handler flows: see AGENT.md §16.4 + §16.5.

command-set ClientCommands {
    writes ClientEntity;

    // MVP demo seeding — ops invokes directly to populate corporate clients
    // for Quote-screen prefill. Full client onboarding workflow is out of scope.
    command CreateClientCommand(registrationData: ClientRegistrationData): string;
}

command-set PolicyCommands {
    writes PolicyEntity;
    writes PolicyPlanEntity;

    // Called by PIM W2 (CreateMasterPolicy) via sync REST. Persists Policy in
    // PENDING + starts PolicyActivationFlow. Returns policyId synchronously.
    command CreatePolicyCommand(
        clientId: string,
        proposalId: string,
        policyType: string,
        effectiveDate: date,
        expiryDate: date,
        premiumType: string,
        lineOfBusiness: string,
        riskTermClassification: string,
        inceptionDate: date,
        ageDefinitionRule: string,
        activationThreshold: int,
        plans: list<PolicyPlanConfig>,
        estimatedPremium: Money
    ): string;

    // Cancels Policy at any non-terminal state. Handler signals
    // PolicyActivationFlow + fans out MemberVoidRequested to in-flight member
    // workflows.
    command CancelPolicyCommand(policyId: string, reason: string): void;

    // Internal — invoked by PolicyActivationFlow when threshold met.
    // Handler also signals all in-flight MemberEnrollmentFlow waiters.
    command ActivatePolicyCommand(policyId: string): void;
}

command-set MemberCommands {
    writes MemberEntity;

    // Called by PIM W3 (AddMemberToPolicy) via sync REST. Persists Member in
    // PENDING + starts MemberEnrollmentFlow. Returns memberId synchronously.
    command AddMemberCommand(
        policyId: string,
        enrollmentData: MemberEnrollmentData
    ): string;

    // Internal — invoked by MemberEnrollmentFlow's ActivateMember state.
    command ActivateMemberCommand(memberId: string): void;

    // Internal — placeholder for future post-activation MemberCancellationFlow.
    // Precondition: isActive (distinct from VoidMemberCommand which requires isPending).
    command CancelMemberCommand(memberId: string, reason: string): void;
}

// ── Workflow activity commands (invoked by MemberEnrollmentFlow) ───────────────

command-set MemberEnrollmentActivities {
    writes MemberEntity;

    command ReserveFloatCommand(memberId: string): FloatReservationResult;

    // Idempotent — safe to call if not reserved or already released.
    command ReleaseFloatCommand(memberId: string): void;

    // Emits MemberApprovalRequested event to outbox (consumed by central Approval
    // module). Sets Member.pendingReason = PENDING_APPROVAL.
    command RequestApprovalCommand(memberId: string): void;

    // PENDING → VOID terminal. Pre-activation only; precondition isPending.
    command VoidMemberCommand(memberId: string, reason: MemberVoidReason): void;
}

// ── Object-store presigned URL commands ────────────────────────────────────────

command-set PolicyFileUrlCommands {
    command GeneratePolicyFileUploadUrlCommand(fileName: string, contentType: string): string;
    command GeneratePolicyFileDownloadUrlCommand(fileId: string): string;
}
