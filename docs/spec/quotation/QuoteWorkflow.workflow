package com.anaira.quotation.workflow;

workflow QuoteWorkflow {

    document: QuoteCase;

    signals {
        QuoteFinalizedSignal(payload: QuoteFinalized);
        QuotePriceRequestedSignal(payload: QuotePriceRequested);
    }

    items {

        SendQuoteToPolicyIssuance {
            type: command SendQuoteToPolicyIssuanceCommand;
        }
        
        WaitForQuotePriceRequested {
            type: wait(QuotePriceRequestedSignal);
        }

        WaitForQuoteFinalized {
            type: wait(QuoteFinalizedSignal);
        }
        
        CalculateQuotePremium {
            type: evaluation CalculateQuotePremiumEvaluation;
        }

        UpdateQuotePremium {
            type: command UpdatePremiumCommand;
        }
        
    }

    routes {

        start open [WaitForQuotePriceRequested, WaitForQuoteFinalized];
        on completed(WaitForQuotePriceRequested)
            open [CalculateQuotePremium];
        on completed(CalculateQuotePremium)
            open [UpdateQuotePremium];
        on completed(UpdateQuotePremium)
            reopen [WaitForQuotePriceRequested];
            
        on completed(WaitForQuoteFinalized)
            open [SendQuoteToPolicyIssuance];

        done whenAny [SendQuoteToPolicyIssuance];
    }
}
