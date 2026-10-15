# Integration review — 2026-10-15

The owner authorized reviewing all open PRs and merging acceptable changes into main. This supersedes the earlier instruction to leave PRs unmerged. The parity goal is still incomplete; accepting an incremental implementation does not mark its screen or feature as a visual match.

Reviewed the 22 open PRs, their source changes and combined implementation at `c7f3eaf875a6e234bb3cd23510b58314af9f837a`, plus the independent copy correction at `799a13762e0c058da2a806cdd9df69a38aca555d`. Main's independently merged guest sessions at `eac12c93c2c90d993fe8e02bb08a9c417ca1e997` are already integrated in the stack. No outstanding review submissions or inline threads were found on the open PRs.

## Findings fixed before integration

1. A JSON `null` body sent to the configured session endpoint threw before returning a validation response. The handler now validates the parsed body before reading `idToken` and returns 400 without invoking Firebase or setting cookies for malformed input.
2. A non-ASCII demo-cookie signature with a matching string length could reach `timingSafeEqual` with unequal byte lengths and throw. Validate the signature's ASCII base64url shape before comparison, matching the existing guest-cookie protection.

New regression tests failed on both original exceptions, then passed after these fixes. Valid demo signatures and normal session/handoff flows retain their existing behavior. No keys, environment values, provider choices, payment behavior or data-storage services were changed.

## Per-PR review

All rows below are acceptable for integration with the stated verification limits. Original comparison and browser behavior remain open audit work.

| PR | Area checked | Review outcome |
| --- | --- | --- |
| [#1](https://github.com/tommy-muckstack/canvaisdead/pull/1) | Text decoration, persistence and renderers | Independent toggles, history and SVG/raster behavior covered by unit tests. |
| [#2](https://github.com/tommy-muckstack/canvaisdead/pull/2) | Official Google control | Reuses the existing official asset/control; auth handlers preserved. |
| [#3](https://github.com/tommy-muckstack/canvaisdead/pull/3) | Trial removal | Later all-included wording retains this correction. |
| [#4](https://github.com/tommy-muckstack/canvaisdead/pull/4) | Element locks | Model mutations and destructive operations honor persistent locks. |
| [#5](https://github.com/tommy-muckstack/canvaisdead/pull/5) | Preview deployment exclusion | Applies to parity branches; main keeps its existing deployment behavior. |
| [#6](https://github.com/tommy-muckstack/canvaisdead/pull/6) | Local save recovery | Read failure, quota, retry and detected cross-tab conflicts preserve saved data. |
| [#7](https://github.com/tommy-muckstack/canvaisdead/pull/7) | Backup import/export | Full validation and independent copies; external media rejected; no upload. |
| [#8](https://github.com/tommy-muckstack/canvaisdead/pull/8) | Rotated resizing | Fixed-anchor geometry and minimum-size behavior have regression coverage. |
| [#9](https://github.com/tommy-muckstack/canvaisdead/pull/9) | Text layout | Shared rendering/layout preserves whitespace and grapheme boundaries. |
| [#10](https://github.com/tommy-muckstack/canvaisdead/pull/10) | Multiple pages | Legacy loading, page isolation, history and backup preservation covered. |
| [#11](https://github.com/tommy-muckstack/canvaisdead/pull/11) | Login choices and art | Google/email only, original SaaS-themed artwork, no extra providers. |
| [#12](https://github.com/tommy-muckstack/canvaisdead/pull/12) | Naming and included access | Paid navigation/calculator removed; disclaimer retained. |
| [#13](https://github.com/tommy-muckstack/canvaisdead/pull/13) | Website analytics | Opt-in, privacy signals, route/content redaction, allowlisted properties and disabled defaults. Production configuration is still outstanding. |
| [#14](https://github.com/tommy-muckstack/canvaisdead/pull/14) | Legacy pricing URL | Next.js adds the app base path once; redirect points home. |
| [#15](https://github.com/tommy-muckstack/canvaisdead/pull/15) | Editor chrome and template search | Search, aspect ordering, panel collapse and responsive CSS reviewed; actual visual comparison remains blocked. |
| [#16](https://github.com/tommy-muckstack/canvaisdead/pull/16) | Presentation and notes | Local reads, page navigation, separate audience metadata and private notes reviewed; browser fullscreen/popups unverified. |
| [#17](https://github.com/tommy-muckstack/canvaisdead/pull/17) | Downloads | Snapshot export, page selection, ZIP integrity, PDF dimensions, size bounds and cancellation reviewed. |
| [#19](https://github.com/tommy-muckstack/canvaisdead/pull/19) | Tombstone branding | Shared mark, base-path-aware icons and owner-requested asset provenance retained. |
| [#20](https://github.com/tommy-muckstack/canvaisdead/pull/20) | Lint/dependencies | No existing lock entry's version, URL or integrity changed; additions are tooling. |
| [#21](https://github.com/tommy-muckstack/canvaisdead/pull/21) | Independent copy correction | Naming, no-trial copy, footer and redirect are preserved in the aggregate. Its history is included in integration. |
| [#22](https://github.com/tommy-muckstack/canvaisdead/pull/22) | Guest recovery/auth integration | Local-only handoff, retries, identity validation and recovery retained. Malformed-input findings above are fixed in the integration follow-up. |
| [#23](https://github.com/tommy-muckstack/canvaisdead/pull/23) | Library actions | Copies, restore, expiry boundaries, stale confirmations and persistence-failure handling covered. |

## Verification and limits

Final `npm run lint`, `npm run typecheck`, all 176 unit tests, and `npm run build` pass, including the new malformed-input cases. Fresh local production HTTP checks verify guest entry (307), five guest routes (200), login access, denied guest acknowledgment (401), the malformed demo-cookie fallback without a 500, pricing redirect, corrected public copy and a served favicon. Earlier checks on the unchanged Projects/Trash code verify view selection and unknown-view fallback. Playwright discovers 30 scenarios across 1440 × 900 and 390 × 844; discovery is not execution.

No browser runtime has become available since the recorded launch failures. Paired screenshots, pointer/keyboard rendering behavior, real Firebase signup/login and actual PostHog receipt remain unverified. A clean dependency install remains blocked by network/cache limitations; checks use the documented local package overlay. Builds retain workspace-root and missing Next.js ESLint-plugin warnings. The parity report retains all outstanding functionality and does not claim completion.

Existing Vercel statuses for #1–#4 were successful; later parity previews are intentionally disabled. No PR-triggered GitHub Actions runs were returned for the reviewed heads. Production PostHog variables were not configured because the connected Vercel account lacked access. Existing hosting/auth/analytics account costs have not been verified; no new paid service is introduced.

## Integration method

Preserve the reviewed source tree and both histories of the overlapping copy correction. Merge the stacked child branches into their parents, then merge the complete reviewed set into main. Use merge commits and expected head SHAs, and verify the final main tree and PR states. This retains review history and keeps the aggregate implementation together. Main's normal deployment automation may run after that merge; publishing to main alone does not prove the production deployment succeeded.
