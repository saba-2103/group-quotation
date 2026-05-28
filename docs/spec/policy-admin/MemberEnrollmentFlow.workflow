package com.anaira.policyadmin.workflow;

// Per-member enrollment workflow — see AGENT.md §16.2 for design rationale.
// Workflow ID: "member-enrollment-{memberId}". Terminates at ActivateMember or VoidMember.

workflow MemberEnrollmentFlow {

    document: MemberEnrollmentCase;

    signals {
        FloatTopUpReceived(payload: FloatTopUpSignal);
        MemberApprovalCompleted(payload: MemberApprovalCompletedSignal);
        PolicyActivated(payload: PolicyActivatedSignal);
        MemberVoidRequested(payload: MemberVoidRequestedSignal);
    }

    items {

        // ── Main happy-path items ────────────────────────────────────────────

        CheckPolicyState {
            type: gateway PolicyStateGateway;
        }

        ReserveFloat {
            type: command ReserveFloatCommand;
        }

        WaitForFloatTopUp {
            type: wait(FloatTopUpReceived);
        }

        RequestApproval {
            type: command RequestApprovalCommand;
        }

        WaitForApproval {
            type: wait(MemberApprovalCompleted);
        }

        EvaluatePolicyState {
            type: gateway PolicyStateGateway;
        }

        WaitForPolicyActivation {
            type: wait(PolicyActivated);
        }

        ActivateMember {
            type: command ActivateMemberCommand;
        }

        // ── Cancellation branch (parallel with main flow) ────────────────────

        AwaitCancellation {
            type: wait(MemberVoidRequested);
        }

        ReleaseFloat {
            type: command ReleaseFloatCommand;
        }

        VoidMember {
            type: command VoidMemberCommand;
        }
    }

    routes {

        start open [CheckPolicyState, AwaitCancellation];

        on completed(CheckPolicyState)
            decide on policyState {
                ACTIVE:    open [ReserveFloat];
                PENDING:   open [ReserveFloat];
                CANCELLED: open [VoidMember];
            };

        on completed(ReserveFloat)
            decide on status {
                RESERVED:     open [RequestApproval];
                INSUFFICIENT: open [WaitForFloatTopUp];
            };

        on completed(WaitForFloatTopUp)
            reopen [ReserveFloat];

        on completed(RequestApproval)
            open [WaitForApproval];

        on completed(WaitForApproval)
            decide on decision {
                APPROVED:    open [EvaluatePolicyState];
                REJECTED:    open [VoidMember];
                CONDITIONAL: open [EvaluatePolicyState];
            };

        on completed(EvaluatePolicyState)
            decide on policyState {
                ACTIVE:    open [ActivateMember];
                PENDING:   open [WaitForPolicyActivation];
                CANCELLED: open [ReleaseFloat];
            };

        on completed(WaitForPolicyActivation)
            open [ActivateMember];

        on completed(AwaitCancellation)
            open [ReleaseFloat];

        on completed(ReleaseFloat)
            open [VoidMember];

        done whenAny [ActivateMember, VoidMember];
    }
}
