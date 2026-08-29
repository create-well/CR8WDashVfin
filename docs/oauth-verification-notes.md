# OAuth Verification Notes

The screenshot shows Google rejecting `redirect_uri=https://cr8w-dash-vfin.vercel.app` with `Error 400: redirect_uri_mismatch`.

A direct authorization request using the same client ID and the normalized callback `https://cr8w-dash-vfin.vercel.app/` also returned `Error 400: redirect_uri_mismatch`. This confirms the deployed callback is not currently accepted by the configured Google OAuth client. The failure occurs at Google's authorization endpoint before the app callback or server token exchange can run.

Repository evidence: `src/app/App.tsx`, `src/app/components/HubView.tsx`, and `src/app/components/WorkshopsView.tsx` previously derived the callback directly from `window.location.origin`, producing the no-slash value shown in the screenshot. The patch centralizes callback normalization and sends the slash-terminated value consistently.

Remaining external requirement: an authorized Google Cloud project administrator must add the exact production callback `https://cr8w-dash-vfin.vercel.app/` to the OAuth client's Authorized redirect URIs, or replace the client ID with the intended OAuth client if this ID belongs to another project. Do not change Google Cloud credentials without explicit access and confirmation.
