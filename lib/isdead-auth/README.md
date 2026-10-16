# isdead-auth

Shared sign-in for every IsDead app on yourappisdead.com: Firebase Authentication (email/password + Google).

- `config.ts`: env → Firebase web config; cookie name/options (`isdead_session`, path `/`).
- `server.ts`: firebase-admin; `createSessionFromIdToken`, `verifySessionCookie`, demo cookie signing.
- `client.ts`: browser helpers (sign up, sign in, reset password, Google popup) that POST the ID token to the app's session endpoint.

Each app exposes `POST <basePath>/api/session` that calls `createSessionFromIdToken`, maps the Firebase uid to its own users table, and sets the cookie. Because the cookie has path `/` on yourappisdead.com, one sign-in covers every app; each app verifies the same cookie with the same Firebase project.

Env: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `FIREBASE_SERVICE_ACCOUNT_JSON` (and optional `ISDEAD_COOKIE_DOMAIN`). Without them, `firebaseConfigured()` is false and apps show "Sign-in not configured".

## Guest sessions (no sign-up)

Entering `/app` without a session redirects through `entryRedirect()` to `GET <basePath>/api/session/guest?next=<path>`. This sets `isdead_guest` (per-visitor id `g_…`, HMAC-signed using the existing `AUTH_SECRET`, 180 days, path `/`) and returns to the app. Production requires that existing secret; development uses the upstream development fallback. Set `GUESTS=0` to disable guest entry. No secret provisioning or configuration change is part of the parity work.

`currentUser()` returns `guest: true` for guests. They use the same tools and save in the `canvaisdead-designs` IndexedDB database, with a library record keyed by their guest ID. Legacy `canvaisdead:<guestId>:designs` localStorage data is read until the first successful IndexedDB save; its bytes are retained unchanged. Login remains reachable for guests and supports only Google and email/password. Signing in does not enable cloud storage or a different feature tier.

### CanvaIsDead local handoff

After Firebase verification, `POST /api/session` still returns 204 and sets the account cookie. If the previous guest cookie verifies, the response includes `x-isdead-previous-guest` and `x-isdead-account` (URI-encoded IDs). It **retains** the guest cookie until the browser confirms its local copy. No design, media, title or other content enters these requests, and no Firestore adoption runs.

The browser copies all guest pages/media/notes into the account's local library, keeping the guest originals. Stable content-derived IDs avoid duplicate copies on retry and preserve later account edits. Saved and unsaved guest versions are both kept when they differ. Existing account designs are never replaced. The editor return link maps to the copied design.

Design copying now reads and writes structured repository records directly. Guest/source checks compare revisions (or unchanged legacy bytes before migration), while pending edits use the immutable design-store array identity. An atomic destination revision check rejects stale writes. SHA-256 content IDs use bounded canonical-JSON chunks and keep the previous IDs, including Unicode and sorted property ordering, so previously copied designs are not duplicated. This content-ID helper does not sign cookies or change authentication cryptography. Large fingerprints yield to the browser and report progress per design; the library still must fit memory and local storage.

The separate Uploads library is copied too, including unplaced originals and nonexpired Trash. Pending imports/file actions in this tab settle first; failed imports require retry or explicit skip. Each destination asset and its receipt commit atomically. Receipts make retries idempotent even after an account copy is renamed, trashed or permanently deleted. The source upload revision is checked again after design copying; concurrent changes require retry. Guest files remain in their original local library.

Only after both local copies succeed does the browser call `DELETE /api/session/guest` with the same two headers. The server verifies the current account/guest pair before clearing the guest cookie. Until acknowledgment, `currentUser().pendingGuestId` lets the app resume recovery after a reload. Confirmation times out after 15 seconds. Read/write/confirmation failures show retry and local backup controls, including raw corrupt-data recovery. Unsaved edits require keeping the tab open or downloading a backup before leaving.

The copy needs enough browser storage for both libraries; a quota failure leaves the originals available for backup/retry. The destination commit uses an atomic revision check, followed by source/pending-edit checks before acknowledgment. This remains a snapshot copy on one origin/device, not continuous cross-tab synchronization. In-progress editing in other tabs is not continuously transferred. The shared guest cookie is cleared after CanvaIsDead acknowledges its own copy, as upstream cleared it during any sign-in; coordinating guest recovery across other subapps remains separate work. An external app that clears the shared cookie before CanvaIsDead observes it cannot trigger this handoff. No other subapp's storage is read or changed.
