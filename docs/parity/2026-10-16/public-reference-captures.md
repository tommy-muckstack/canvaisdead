# Public homepage and login reference capture

Status: pending native evidence. This independent verification PR starts from main, after the auth-only #48 merge. No product behavior or billing configuration changes.

Observe the original homepage and login route beside the live clone at 1440 × 900 and 390 × 844. Record HTTP status, sanitized final URL, challenge state, visible copy, computed geometry/styles, accessibility snapshots and original PNG bytes. Each case uses a fresh logged-out browser context. The workflow does not create accounts, submit forms, accept consent, use SSO, enter payment details, start trials, or share anything.

Local browsers remain unavailable on this host; successful clone runs establish that public Linux CI can launch Chromium, not that Canva will permit access there. This is the first bounded attempt to obtain native original reference captures from that runner. A navigation failure, access challenge or error page is recorded as blocked evidence and fails the capture check. No challenge bypass is attempted. A successful capture is not itself a parity match.

The public-repository-only workflow uses pinned actions, read-only GitHub permissions and no credentials, artifact/cache uploads or deployment steps. Browser screenshots remain in job logs until retained as documentation evidence; no original assets are copied into the application. Full-page captures are bounded to documents at most 20,000px tall, with longer pages explicitly marked incomplete. Lazy-loading, menus, hover/focus, animations and logged-in flows still require further observations.

The original login route may redirect by locale. Record the browser's actual final URL instead of assuming the text retriever's prior locale. The clone target is the public Vercel deployment; its deployed commit must not be inferred from the capture PR's source commit.
