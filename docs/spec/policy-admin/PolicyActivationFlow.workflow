package com.anaira.policyadmin.workflow;

// Deal-level activation coordinator — see AGENT.md §16.3 for design rationale.
// Workflow ID: "policy-activation-{policyId}". Terminates on ActivatePolicy or AwaitPolicyCancellation.

workflow PolicyActivationFlow {

    document: PolicyActivationCase;

    signals {
        MemberPendingForActivation(payload: MemberPendingSignal);
        PolicyCancelled(payload: PolicyCancelledSignal);
    }

    items {

        EvaluateThreshold {
            type: evaluation ThresholdEvaluation;
        }

        AwaitMembershipChange {
            type: wait(MemberPendingForActivation);
        }

        ActivatePolicy {
            type: command ActivatePolicyCommand;
        }

        AwaitPolicyCancellation {
            type: wait(PolicyCancelled);
        }
    }

    routes {

        start open [EvaluateThreshold, AwaitPolicyCancellation];

        on completed(EvaluateThreshold)
            decide on thresholdMet {
                YES: open [ActivatePolicy];
                NO:  open [AwaitMembershipChange];
            };

        on completed(AwaitMembershipChange)
            reopen [EvaluateThreshold];

        done whenAny [ActivatePolicy, AwaitPolicyCancellation];
    }
}
