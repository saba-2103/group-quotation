package com.anaira.issuance.workflow;

// UPDATE/ARCHIVE PATTERN: WaitForMemberUpdate and WaitForMemberArchive run in
// parallel with CreatePolicyMember from workflow start. WaitForMemberUpdate is
// reopened after each update so iterative edits remain possible throughout the
// DRAFT state. WaitForMemberArchive provides an out-of-band terminal branch that
// can fire from any non-terminal state.

workflow MemberLifecycleFlow {

    document: PolicyMemberCase;

    signals {
        MemberUpdateRequested(payload: MemberUpdateRequestedSignal);
        MAFConfirmed(payload: MAFConfirmedSignal);
        MemberRepairCompleted(payload: MemberRepairCompletedSignal);
        MemberReviewCompleted(payload: MemberReviewCompletedSignal);
        MemberArchiveRequested(payload: MemberArchiveRequestedSignal);
    }

    items {

        CreatePolicyMember {
            type: command CreatePolicyMemberCommand;
        }

        // Parallel interrupt listener — reopened after each update so iterative
        // edits are possible while member is non-terminal.
        WaitForMemberUpdate {
            type: wait(MemberUpdateRequested);
        }

        UpdateMember {
            type: command UpdateMemberCommand;
        }

        PriceMember {
            type: command PriceMemberCommand;
        }

        CheckMAFRequired {
            type: gateway MAFRequiredGateway;
        }

        SendMAF {
            type: command SendMAFCommand;
        }

        WaitForMAF {
            type: wait(MAFConfirmed);
        }

        ConfirmMAF {
            type: command ConfirmMAFCommand;
        }

        ClassifyMember {
            type: evaluation MemberClassificationEvaluation;
        }

        ApproveMember {
            type: command ApproveMemberCommand;
        }

        MarkRepairPending {
            type: command MarkRepairPendingCommand;
        }

        WaitForRepair {
            type: wait(MemberRepairCompleted);
        }

        CompleteMemberRepair {
            type: command CompleteMemberRepairCommand;
        }

        MarkReferredToUw {
            type: command MarkReferredToUwCommand;
        }

        WaitForUwDecision {
            type: wait(MemberReviewCompleted);
        }

        UwDecisionGateway {
            type: gateway UwDecisionGateway;
        }

        ApproveUwCase {
            type: command ApproveUwCaseCommand;
        }

        RejectUwCase {
            type: command RejectUwCaseCommand;
        }

        RejectMember {
            type: command RejectMemberCommand;
        }

        SendForIssuance {
            type: command SendMemberForIssuanceCommand;
        }

        AddMemberToPolicy {
            type: command AddMemberToPolicyCommand;
        }

        // Out-of-band terminal cleanup; parallel listener open from workflow start.
        WaitForMemberArchive {
            type: wait(MemberArchiveRequested);
        }

        ArchiveMember {
            type: command ArchiveMemberCommand;
        }
    }

    routes {

        // Main flow + interrupt listeners open in parallel.
        start open [CreatePolicyMember, WaitForMemberUpdate, WaitForMemberArchive];

        on completed(CreatePolicyMember)
            open [PriceMember];

        on completed(PriceMember)
            open [CheckMAFRequired];

        // Iterative edits while non-terminal — UpdateMember resets the member to CREATED
        on completed(WaitForMemberUpdate)
            open [UpdateMember];

        on completed(UpdateMember)
            reopen [WaitForMemberUpdate];

        on completed(CheckMAFRequired)
            decide on mafApplicable {
                Yes: open [SendMAF];
                No: open [ClassifyMember];
            };

        on completed(SendMAF)
            open [WaitForMAF];

        on completed(WaitForMAF)
            open [ConfirmMAF];

        on completed(ConfirmMAF)
            open [ClassifyMember];

        on completed(ClassifyMember)
            decide on lane {
                STP: open [ApproveMember];
                REPAIR: open [MarkRepairPending];
                REVIEW: open [MarkReferredToUw];
                REJECT: open [RejectMember];
            };

        on completed(MarkRepairPending)
            open [WaitForRepair];

        on completed(WaitForRepair)
            open [CompleteMemberRepair];

        on completed(CompleteMemberRepair)
            reopen [ClassifyMember];

        on completed(MarkReferredToUw)
            open [WaitForUwDecision];

        on completed(WaitForUwDecision)
            open [UwDecisionGateway];

        on completed(UwDecisionGateway)
            decide on uwDecision {
                Approved: open [ApproveUwCase];
                Rejected: open [RejectUwCase];
            };

        on completed(ApproveUwCase)
            reopen [ClassifyMember];

        on completed(ApproveMember)
            open [SendForIssuance];

        on completed(SendForIssuance)
            open [AddMemberToPolicy];

        // Out-of-band terminal cleanup
        on completed(WaitForMemberArchive)
            open [ArchiveMember];

        done whenAny [AddMemberToPolicy, RejectMember, RejectUwCase, ArchiveMember];
    }
}

// Bulk member upload: UI calls Initiate, PUTs the file, calls Ingest, then Submit.
// SubmitCensusSubmission emits CensusSubmissionSubmitted; FanOutMembers starts one
// MemberLifecycleFlow per accepted row. TrackCompletion waits for every spawned
// member workflow to terminate, then RecordCompletion writes the COMPLETED status.
//
// COMPLETION LOOP: WaitForMemberWorkflowDone opens in parallel with TrackCompletion
// after FanOutMembers. Each time a spawned member workflow signals back, both
// TrackCompletion and WaitForMemberWorkflowDone are reopened — keeping the loop
// alive until TrackCompletion determines all rows are accounted for and proceeds
// to RecordCompletion.

workflow CensusSubmissionFlow {

    document: CensusSubmissionCase;

    signals {
        CensusFileUploaded(payload: CensusFileUploadedSignal);
        CensusSubmitRequested(payload: CensusSubmitRequestedSignal);
        PolicyMemberWorkflowDone(payload: PolicyMemberWorkflowDoneSignal);
    }

    items {

        InitiateSubmission { type: command InitiateCensusSubmissionCommand; }
        WaitForUpload      { type: wait(CensusFileUploaded); }
        IngestFile         { type: command IngestCensusFileCommand; }
        WaitForSubmit      { type: wait(CensusSubmitRequested); }
        SubmitSubmission   { type: command SubmitCensusSubmissionCommand; }
        FanOutMembers      { type: gateway CensusFanOutGateway; }
        // Opened in parallel with TrackCompletion; loops until all members report.
        WaitForMemberWorkflowDone { type: wait(PolicyMemberWorkflowDone); }
        TrackCompletion    { type: gateway CensusCompletionGateway; }
        RecordCompletion   { type: command RecordCensusSubmissionCompletionCommand; }
    }

    routes {

        start open [InitiateSubmission];

        on completed(InitiateSubmission)
            open [WaitForUpload];

        on completed(WaitForUpload)
            open [IngestFile];

        on completed(IngestFile)
            open [WaitForSubmit];

        on completed(WaitForSubmit)
            open [SubmitSubmission];

        // FanOutMembers gateway starts one MemberLifecycleFlow per accepted row,
        // each invoking CreatePolicyMemberCommand with the row payload.
        on completed(SubmitSubmission)
            open [FanOutMembers];

        // Open TrackCompletion and the signal listener in parallel.
        on completed(FanOutMembers)
            open [TrackCompletion, WaitForMemberWorkflowDone];

        // Each spawned member workflow signals back when it terminates; reopen
        // both the gateway and the listener to continue accumulating completions.
        on completed(WaitForMemberWorkflowDone)
            reopen [TrackCompletion, WaitForMemberWorkflowDone];

        on completed(TrackCompletion)
            open [RecordCompletion];

        done whenAny [RecordCompletion];
    }
}
