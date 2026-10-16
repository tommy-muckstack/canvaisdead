# Reachable Projects navigation on mobile

Date: 2026-10-16. Parent: #51, `847d62dbf29654e6bfb09b79b4547c8eb160cb9a`. Status: **differs**; native verification and paired captures pending.

## Observed behavior

The completed parent run reports the “Everything included” badge intercepting pointer events over the mobile Trash link. The rename/copy/trash/restore workflow reaches its second Trash navigation and stops there (`library.spec.ts:43`); the expired-Trash case also times out. The badge is positioned absolutely at the top of the Projects container, where the mobile view links appear.

At widths up to 820px, the Projects badge now occupies its own normal-flow row above the view links. It keeps the product's free-access copy and avoids covering either navigation target. Desktop, Home and editor rules are unchanged. This is a responsive reachability fix, not an original/clone visual-match claim.

## Verification scope

Add a native desktop/mobile case that measures both project links and the badge, checks that pointer hit targets are the links and that their rectangles do not overlap the badge, clicks Trash, checks the empty state and current-page indication, and uses keyboard Enter to return to All projects. Capture both Projects and empty Trash before/after, including computed geometry/style and accessibility snapshots.

Parent empty-Trash captures use direct route navigation because the mobile link is obstructed; this is not a claim that the parent's link works. Changed captures come from the actual link flow. The original full rename/copy/trash/undo/restore/permanent-deletion and retention assertions remain. The rename validation alert is scoped to its form, excluding Next.js's route announcer without changing the requested error message or subsequent keyboard/search assertions.

Only production change: one mobile Projects CSS rule. No storage, auth, analytics, service, dependency or billing changes. Native results and paired screenshots will be recorded here. Folder/star/shared-project features, exact reference appearance and other parity rows remain unfinished.
