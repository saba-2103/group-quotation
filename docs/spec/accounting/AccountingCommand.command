package com.anaira.accounting.command;

command-set AccountingEventCommands {
    command CreateAccountingEventCommand(
        id: string,
        component: Component,
        lob: LineOfBusiness,
        businessKey: string,
        businessProcessCode: BusinessProcessCode,
        eventDate: date,
        reference: string,
        remarks: string,
        details: list<EventDetailInput>
    ): AccountingEventId;

    command UpdateAccountingEventCommand(
        id: AccountingEventId,
        component: Component,
        lob: LineOfBusiness,
        businessKey: string,
        businessProcessCode: BusinessProcessCode,
        eventDate: date,
        reference: string,
        remarks: string
    ): void;

    command PostAccountingEventCommand(id: AccountingEventId): void;

    command ReverseAccountingEventCommand(id: AccountingEventId, reversalEventDate: date): AccountingEventId;

    command MarkEventPostedCommand(id: AccountingEventId): void;

    command MarkEventAsFailedCommand(id: AccountingEventId, errorDetails: string): void;

    command AddEventDetailsCommand(id: AccountingEventId, details: list<EventDetailInput>): void;

    command RemoveEventDetailsCommand(id: AccountingEventId, detailIds: list<EventDetailId>): void;

    command UpdateEventDetailsCommand(id: AccountingEventId, updates: list<EventDetailInput>): void;

    command OverwriteEventDetailsCommand(id: AccountingEventId, details: list<EventDetailInput>): void;
}

command-set AccountingJournalCommands {
    command CreateDirectJournalCommand(
        journalNumber: string,
        journalDate: date,
        component: Component,
        lob: LineOfBusiness,
        businessProcessCode: BusinessProcessCode,
        businessKey: string,
        accountGroup: AccountGroup,
        lines: list<JournalLineInput>
    ): JournalNumber;

    command UpdateJournalCommand(
        journalNumber: JournalNumber,
        journalDate: date,
        component: Component,
        lob: LineOfBusiness
    ): void;

    command PostJournalCommand(journalNumber: JournalNumber): void;

    command AddJournalLinesCommand(journalNumber: JournalNumber, lines: list<JournalLineInput>): void;

    command RemoveJournalLinesCommand(journalNumber: JournalNumber, lineIds: list<JournalLineId>): void;

    command UpdateJournalLinesCommand(journalNumber: JournalNumber, updates: list<JournalLineUpdate>): void;

    command OverwriteJournalLinesCommand(journalNumber: JournalNumber, lines: list<JournalLineInput>): void;

    command ReverseJournalCommand(journalNumber: JournalNumber, reversalDate: date, reasonCode: string): JournalNumber;
}

command-set AccountingPeriodCommands {
    command DefineAccountingPeriodCommand(dateRange: DateRange): PeriodId;
    command OpenAccountingPeriodCommand(periodId: PeriodId): void;
    command CloseAccountingPeriodCommand(periodId: PeriodId): void;
    command ReopenAccountingPeriodCommand(periodId: PeriodId): void;
    command DeleteAccountingPeriodCommand(periodId: PeriodId, reason: string): void;
    command MovePeriodDateRangeCommand(periodId: PeriodId, dateRange: DateRange): void;
}

command-set PostingRuleCommands {
    command DefinePostingRuleCommand(
        lob: LineOfBusiness,
        businessProcessCode: BusinessProcessCode,
        accountGroup: AccountGroup,
        accountSubgroup: AccountSubgroup,
        debitCreditIndicator: DebitCreditIndicator,
        glPseudoName: GlPseudoName
    ): PostingRuleId;

    command UpdatePostingRuleCommand(
        ruleId: PostingRuleId,
        debitCreditIndicator: DebitCreditIndicator,
        glPseudoName: GlPseudoName
    ): void;

    command DeletePostingRuleCommand(ruleId: PostingRuleId, reason: string): void;
}
