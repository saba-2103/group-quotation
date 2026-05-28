package com.anaira.quotation.command;

command-set QuoteCommands {
    writes QuoteEntity;
    writes QuotePlanEntity;

    // W1 step 1 - creates Quote in DRAFT
    command CreateQuoteCommand(
        clientId: string,
        policyType: PolicyType
    ): string;

    // W1 step 1a - G1 placeholder: policy detail (effective date, expiry, premium type, etc.)
    command UpdatePolicyDetailCommand(
        quoteId: string,
        premiumType: PremiumType,
        effectiveDate: date,
        expiryDate: date,
        inceptionDate: date,
        ageDefinitionRule: AgeDefinitionRule,
        riskTermClassification: RiskTermClassification,
        lineOfBusiness: LineOfBusiness
    ): void;

    // W1 step 2 - add a plan to the draft quote
    command AddPlanCommand(
        quoteId: string,
        plan: Plan
    ): void;

    // W1 step 2 - update an existing plan in the draft quote
    command UpdatePlanCommand(
        quoteId: string,
        plan: Plan
    ): void;

    // W1 step 2 - remove a plan from the draft quote
    command RemovePlanCommand(
        quoteId: string,
        planNo: string
    ): void;

    // W1 step 2b - G2 placeholder: member-to-plan mapping as DMN decision table JSON
    command UpdateMemberToPlanMappingCommand(
        quoteId: string,
        mapping: string
    ): void;

    // W1 step 3
    command UpdateAggregateCensusCommand(
        quoteId: string,
        census: AggregateCensus
    ): void;

    // W1 step 3a - define the column contract for the census file (Frictionless Table Schema)
    command UpdateCensusFileFormatCommand(
        quoteId: string,
        format: CensusFileFormat
    ): void;

    // W1 step 4a - Sales requests price; emits QuotePriceRequested to workflow calculates and calls UpdatePremiumCommand
    command RequestQuotePriceCommand(quoteId: string): void;

    // W1 step 4 b - workflow returns price; this command updates the Quote with the premium and triggers the next workflow step
    command UpdatePremiumCommand(
        quoteId: string,
        premium: QuotePremium
    ): void;

    // W1 step 5 - internal approval/QC complete; emits QuoteSubmitted to Kafka
    command SubmitQuoteCommand(quoteId: string): void;

    // W1 step 5a - sales delivers quote to client; emits QuoteSentToClient to Kafka
    command SendToClientCommand(quoteId: string): void;

    // W1 step 5b - client accepts; emits QuoteAccepted to Kafka
    command AcceptQuoteCommand(quoteId: string): void;

    // W1 step 5c - client rejects (terminal); emits QuoteRejected to Kafka
    command RejectQuoteCommand(quoteId: string): void;

    // W1 - sales pulls back before client decision (terminal); emits QuoteWithdrawn to Kafka
    command WithdrawQuoteCommand(quoteId: string): void;

    // W1 - time-based termination (terminal); emits QuoteExpired to Kafka
    command ExpireQuoteCommand(quoteId: string): void;

    // W1 step 6 - paperwork complete; emits QuoteFinalized to Kafka; triggers W2
    command FinalizeQuoteCommand(quoteId: string): void;

    // W1 step 7 - workflow handoff after QuoteFinalized; triggers policy issuance (W2)
    command SendQuoteToPolicyIssuanceCommand(quoteId: string): void;
}

command-set MemberQuoteCommands {
    writes MemberQuoteEntity;

    // W4 - GCL only; partner initiates member quote.
    // memberId is not yet known (member entity is created downstream at enrollment); planNo is resolved separately by UpdateMemberPlanCommand.
    command CreateMemberQuoteCommand(
        policyId: string,
        memberData: MemberData,
        sumAssured?: Money
    ): string;

    // W4 - workflow step. Handler queries the parent Policy for the plan that applies to this member and invokes MemberQuote.setPlan.
    command UpdateMemberPlanCommand(memberQuoteId: string): void;

    // W4 - premium computed externally via Rule Engine; this command writes the result onto the aggregate
    command UpdateMemberPremiumCommand(
        memberQuoteId: string,
        memberData: MemberData,
        premium: MemberQuotePremium
    ): void;

    // W4 - submit member quote to partner; emits MemberQuoteSubmitted to Kafka
    command SubmitMemberQuoteCommand(memberQuoteId: string): void;

    // W4 - finalized=true: locks premium; creates PolicyMember to triggers W3
    command FinalizeMemberQuoteCommand(memberQuoteId: string): void;

    // W4 - workflow handoff after MemberQuoteFinalized; triggers policy issuance for the member
    command SendMemberQuoteToPolicyIssuanceCommand(memberQuoteId: string): void;
}

// File URL commands - generate presigned URLs for upload/download via object store.
// No DB writes; handler implementation talks to the object store (e.g. S3) directly.
command-set FileUrlCommands {
    command GenerateFileUploadUrlCommand(fileName: string, contentType: string): string;
    command GenerateFileDownloadUrlCommand(fileId: string): string;
}
