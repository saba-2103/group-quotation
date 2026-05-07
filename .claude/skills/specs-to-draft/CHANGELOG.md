# specs-to-draft — Skill Changelog

One line per refinement run. Format: `YYYY-MM-DD — <summary> (refined from <N> runs)`

---

2026-05-01 — First run; 6 lessons written to LESSONS.md; no SKILL.md edits (all frequency=1); 2 gap proposals filed (PROP-0001 wizard, PROP-0002 file-upload) (refined from 1 run)
2026-05-01 — SHIP stage tightened: forbid dev-server substitution for /preview-and-deploy; shipper.log must not be written until the skill actually runs (direct correction)
2026-05-01 — Tightened scope control and workflow completeness: no silent golden-path reduction, no dead-end actions, workflow verification required; coordinated `specs-to-tests` and `build-feature` to prefer executable workflow coverage over schema-only smoke checks (direct correction)
2026-05-01 — Added implementation-guide grounding and allowed high-quality new widget creation when required; do not shrink feature scope just because the widget library is incomplete (direct correction)
2026-05-01 — Tightened `specs-to-draft` against the module guide: server-component schema pages, server-side `$ref` resolution, strict form schema rules, form registry regeneration, and widget-compatible API mock shapes (direct correction)
