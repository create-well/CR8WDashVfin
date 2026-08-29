# Google Calendar OAuth Redirect URI Fix

## Confirmed symptom

The deployed dashboard sends Google an OAuth request with `redirect_uri=https://cr8w-dash-vfin.vercel.app`. Google returns `Error 400: redirect_uri_mismatch` before authorization completes.

## Current implementation

The dashboard derives the redirect URI from `window.location.origin` in three places: the OAuth request builders in `HubView.tsx` and `WorkshopsView.tsx`, and the authorization-code exchange in `App.tsx`. `window.location.origin` omits the trailing slash.

## Confirmed root cause

The configured Google OAuth client does not currently accept the deployed dashboard callback as an exact match. The original app request used `https://cr8w-dash-vfin.vercel.app` without a trailing slash, and a direct verification request using the canonical `https://cr8w-dash-vfin.vercel.app/` value was also rejected with `redirect_uri_mismatch`. Google therefore has no matching Authorized redirect URI for this deployed callback, or the client ID belongs to a different Google Cloud project. The external OAuth client must be corrected by an authorized operator.

## Acceptance criteria

1. The dashboard uses one canonical redirect URI configuration for the production Vercel origin.
2. The OAuth authorization request and server token exchange send the identical redirect URI string.
3. Local development remains explicit and does not silently reuse the production callback.
4. No Google client secret or server credential enters the client bundle.
5. Existing OAuth behavior, PKCE flow, and token storage behavior remain unchanged apart from callback normalization.
6. Tests and production build pass, and the final diff contains no secrets.
7. The report identifies the exact external Google Cloud Console callback value that must be present if repository verification cannot inspect that credential.

## Implementation roadmap

1. Centralize the public callback URI in the existing client configuration module, with a trailing slash for the deployed Vercel origin and an explicit localhost fallback.
2. Replace duplicated `window.location.origin` callback construction with the shared helper in the authorization requests and callback exchange.
3. Add a deterministic contract test for callback equality and trailing-slash normalization.
4. Run the test suite, production build, and diff inspection. Report any remaining Google Cloud Console configuration requirement without changing external credentials.

## References

[1] [Google, Using OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server). Google documents that a `redirect_uri_mismatch` occurs when the request value does not match an authorized redirect URI for the supplied client ID.
