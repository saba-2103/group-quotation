package com.anaira.insurance.group;

workflow GroupQuotationWorkflow {

    document: GroupQuotationCase;

    signals {
        MedicalDataReceived(payload: MedicalUnderwritingReport);
        SanctionCheckCleared(payload: SanctionCheckResult);
        ClientAcceptedQuote(payload: QuoteAcceptanceData);
        ClientDeclinedQuote(payload: QuoteDeclinedData);
    }

    items {

        CaptureSchemeDetails {
            type: wait(CaptureSchemeDetailsCompleted);
        }

        CreateQuotationRecord {
            type: command CreateQuotationRecordCommand;
        }

        SanctionAndComplianceCheck {
            type: wait(SanctionAndComplianceCheckCompleted);
        }

        WaitForSanctionClearance {
            type: wait(SanctionCheckCleared);
        }

        EscalateComplianceDelay {
            type: wait(EscalateComplianceDelayCompleted);
        }

        CollectMemberMedicalData {
            type: wait(CollectMemberMedicalDataCompleted);
        }

        WaitForMedicalData {
            type: wait(MedicalDataReceived);
        }

        EscalateMedicalDataDelay {
            type: wait(EscalateMedicalDataDelayCompleted);
        }

        ReviewMedicalData {
            type: wait(ReviewMedicalDataCompleted);
        }

        ActuarialReview {
            type: wait(ActuarialReviewCompleted);
        }

        EscalateActuarialDelay {
            type: wait(EscalateActuarialDelayCompleted);
        }

        RiskGrading {
            type: evaluation RiskGradingEvaluation;
        }

        PrepareQuoteDocument {
            type: wait(PrepareQuoteDocumentCompleted);
        }

        EscalateQuotePreparation {
            type: wait(EscalateQuotePreparationCompleted);
        }

        ManagerApproval {
            type: wait(ManagerApprovalCompleted);
        }

        SendQuoteToClient {
            type: gateway QuoteDeliveryGateway;
        }

        WaitForClientDecision {
            type: wait(ClientAcceptedQuote);
        }

        EscalateClientNoResponse {
            type: wait(EscalateClientNoResponseCompleted);
        }

        BindPolicy {
            type: command BindPolicyCommand;
        }

        CloseAsDeclined {
            type: command CloseQuotationCommand;
        }

        CloseAsWithdrawn {
            type: command CloseQuotationCommand;
        }
    }

    routes {

        start open [CaptureSchemeDetails];

        on completed(CaptureSchemeDetails)
            open [CreateQuotationRecord];

        on completed(CreateQuotationRecord)
            open [SanctionAndComplianceCheck, WaitForSanctionClearance,
                  CollectMemberMedicalData, WaitForMedicalData];

        on completed(SanctionAndComplianceCheck)
            decide on complianceOutcome {
                Proceed: open [ReviewMedicalData];
                Decline: open [CloseAsDeclined];
            };

        on completed(ReviewMedicalData)
            decide on underwritingComplexity {
                Standard: open [RiskGrading];
                Complex:  open [ActuarialReview];
            };

        on completed(ActuarialReview)
            open [RiskGrading];

        on completed(EscalateActuarialDelay)
            open [RiskGrading];

        on completed(RiskGrading)
            open [PrepareQuoteDocument];

        on completed(PrepareQuoteDocument)
            open [ManagerApproval];

        on completed(ManagerApproval)
            open [SendQuoteToClient];

        on completed(SendQuoteToClient)
            open [WaitForClientDecision];

        on completed(WaitForClientDecision)
            open [BindPolicy];

        on completed(EscalateClientNoResponse)
            decide on clientFollowUp {
                Extend:   reopen [WaitForClientDecision];
                Withdraw: open [CloseAsWithdrawn];
            };

        done whenAny [BindPolicy, CloseAsDeclined, CloseAsWithdrawn];
    }
}