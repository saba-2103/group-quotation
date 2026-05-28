# E2E test suite — keystone-ui

Playwright tests that drive the live dev deploy at
https://keystone-ui-dev.anairacloud.com. Tests are **read-mostly** — no
mutations against shared backend data — so they can run any time without
poisoning the dataset for human demos.

## Run

```bash
npx playwright test                          # full suite
npx playwright test tests/e2e/role-rbac     # one suite
npx playwright show-report                   # HTML report after a run
```

Override the target URL:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
```

## Suites

| File | Focus |
|------|-------|
| `smoke.spec.ts` | Every menu route loads, dashboard works for every role, every backend search endpoint is reachable via the proxy. The wide-net catch. |
| `role-rbac.spec.ts` | PROP-0009 regression: 6-role enum, server-side menu filter via `/api/config/app?role=`, localStorage persistence, switcher dropdown content + order. |
| `dashboard-inbox.spec.ts` | Each role sees only their own Inbox section(s); Business Processes is sales-only; cross-leak check. |
| `list-pages.spec.ts` | Every list page renders header + table + filter trigger; first row click navigates to the detail route. |
| `detail-pages.spec.ts` | ActionBar role-gating per persona: Sales sees their actions, MPH sees Accept/Reject, UW sees uw-approve/reject, Ops sees repair-edit, Member sees confirm-enrolment. Cross-role negative checks. |
| `demo-narrative.spec.ts` | One test per beat in [docs/planning/DEMO_NARRATIVE_GTL_GCL.md](../../docs/planning/DEMO_NARRATIVE_GTL_GCL.md): §1 Quote creation, §1A GTL PENDING, §1B GCL ACTIVE, §2A threshold gating, §2B MAF/OTP, §3 UW review, §4 Ops repair. |

## Gaps surfaced (2026-05-13 first run)

See [GAPS_2026-05-13.md](./GAPS_2026-05-13.md) for the full triaged list.
Quick summary:
- **Product Gap 1** — DataTable never renders its `title` prop. Section headings
  invisible across every list page and every Inbox section. 10 failures.
- **Product Gap 2** — UW/Member/Ops Inbox row click navigates to a redirect that
  lands on the PAM-side `member-detail.json`, which has no UW/Ops/Member
  actions. 4 failures.

## Data-state skips

8 tests `test.skip` when the backend has no entity in a particular state
(e.g. no `SENT_TO_CLIENT` quote, no `PENDING` policy, no `MAF_PENDING` member).
Re-seed via `npm run seed:backend` and they'll exercise the path.
