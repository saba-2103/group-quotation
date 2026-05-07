package com.anaira.quotation.workflow;

workflow MemberQuoteWorkflow {

    document: MemberQuoteCase;

    signals {
        MemberQuoteFinalizedSignal(payload: MemberQuoteFinalized);
        MemberQuotePremiumUpdatedSignal(payload: MemberQuotePremiumUpdated);
    }

    items {

        IdentifyMemberPlan {
            type: evaluation IdentifyMemberPlanEvaluation;
        }

        UpdateMemberPlanOnQuote {
            type: command UpdateMemberPlanCommand;
        }

        CalculateMemberQuotePremium {
            type: evaluation CalculateMemberQuotePremiumEvaluation;
        }

        UpdateMemberQuotePremium {
            type: command UpdateMemberPremiumCommand;
        }

        // Opened in parallel after UpdateMemberQuotePremium; whichever signal
        // arrives first drives the terminal branch.
        WaitForPremiumUpdated {
            type: wait(MemberQuotePremiumUpdatedSignal);
        }

        WaitForQuoteFinalized {
            type: wait(MemberQuoteFinalizedSignal);
        }

        SubmitMemberQuote {
            type: command SubmitMemberQuoteCommand;
        }

        SendMemberQuoteToPolicyIssuance {
            type: command SendMemberQuoteToPolicyIssuanceCommand;
        }
    }

    routes {

        start open [IdentifyMemberPlan];

        on completed(IdentifyMemberPlan)
            open [UpdateMemberPlanOnQuote];

        on completed(UpdateMemberPlanOnQuote)
            open [CalculateMemberQuotePremium];

        on completed(CalculateMemberQuotePremium)
            open [UpdateMemberQuotePremium];

        on completed(UpdateMemberQuotePremium)
            open [WaitForPremiumUpdated, WaitForQuoteFinalized];

        on completed(WaitForPremiumUpdated)
            open [SubmitMemberQuote];

        on completed(WaitForQuoteFinalized)
            open [SendMemberQuoteToPolicyIssuance];

        done whenAny [SendMemberQuoteToPolicyIssuance];
    }
}
