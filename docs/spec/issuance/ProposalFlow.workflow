package com.anaira.issuance.workflow;

// W2: Proposal lifecycle — DRAFT → SUBMITTED → FINALIZED → POLICY_CREATED.
// Triggered by QuoteFinalized; finalize plugs into Policy module to create the master policy.
//
// UPDATE PATTERN: WaitForProposalUpdate runs in parallel with CreateProposal from
// workflow start, allowing iterative edits at any point while the proposal is in
// DRAFT. After each update the wait is reopened so further edits remain possible.

workflow ProposalFlow {

    document: ProposalCase;

    signals {
        ProposalUpdateRequested(payload: ProposalUpdateSignal);
        ProposalReadyToSubmit(payload: ProposalSubmitSignal);
        ProposalReadyToFinalize(payload: ProposalFinalizeSignal);
    }

    items {

        CreateProposal {
            type: command CreateProposalCommand;
        }

        // Parallel interrupt listener — open at start alongside CreateProposal.
        // Reopened after each update so further edits remain possible while DRAFT.
        WaitForProposalUpdate {
            type: wait(ProposalUpdateRequested);
        }

        UpdateProposal {
            type: command UpdateProposalCommand;
        }

        WaitForSubmit {
            type: wait(ProposalReadyToSubmit);
        }

        SubmitProposal {
            type: command SubmitProposalCommand;
        }

        WaitForFinalize {
            type: wait(ProposalReadyToFinalize);
        }

        FinalizeProposal {
            type: command FinalizeProposalCommand;
        }

        CreateMasterPolicy {
            type: command CreateMasterPolicyCommand;
        }
    }

    routes {

        // Main flow + update listener open in parallel.
        start open [CreateProposal, WaitForProposalUpdate];

        on completed(CreateProposal)
            open [WaitForSubmit];

        // Iterative edits while in DRAFT
        on completed(WaitForProposalUpdate)
            open [UpdateProposal];

        on completed(UpdateProposal)
            reopen [WaitForProposalUpdate];

        on completed(WaitForSubmit)
            open [SubmitProposal];

        on completed(SubmitProposal)
            open [WaitForFinalize];

        on completed(WaitForFinalize)
            open [FinalizeProposal];

        // FinalizeProposal plugs into Policy module via CreateMasterPolicyCommand
        on completed(FinalizeProposal)
            open [CreateMasterPolicy];

        done whenAny [CreateMasterPolicy];
    }
}
