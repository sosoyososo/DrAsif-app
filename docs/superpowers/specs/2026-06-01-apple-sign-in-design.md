# Sign in with Apple — Capacitor iOS

## Overview

Add a "Sign in with Apple" button to the Onboarding screen step 1 (below "Next — Personalise My Plan →"). Tapping it triggers the native iOS Sign in with Apple UI via `@capacitor-community/apple-sign-in`, then sends the raw credential data to the server endpoint.

## API Endpoints

- **Dev**: `http://localhost:8080/auth/apple`
- **Prod**: `https://drasif-app-server-production-e198.up.railway.app/auth/apple`

## Architecture

```
[Onboarding JS]
    → AppleSignIn.authenticate()  [@capacitor-community/apple-sign-in]
    → iOS ASAuthorizationAppleID UI (system modal)
    → Returns { identityToken, authorizationCode, user, fullName, email }
    → POST raw credential to API endpoint
    → onSelect(sel, null) on success → app proceeds to HomeTab
```

## Changes

| File | Change |
|---|---|
| `package.json` | Add `@capacitor-community/apple-sign-in` |
| `ios/App/App/Info.plist` | Add Sign in with Apple capability + `AAPLServiceConfiguration` |
| `ios/App/App/AppDelegate.swift` | (unchanged — Capacitor proxy already handles URL/userActivity) |
| `src/dr_asif_v21_app.jsx` | Import plugin, add button JSX, wire `handleAppleSignIn` |

## Button UI

- **Position**: Below "Next — Personalise My Plan →" on step 1 of Onboarding
- **Style**: Full-width, border `2px solid rgba(255,255,255,0.35)`, background `rgba(0,0,0,0.25)`, white text, Apple SVG logo
- **Visibility**: Only when `sel` (gender) is selected AND `ok` (disclaimer) is checked
- **Loading state**: Text "Signing in...", opacity 0.7, `not-allowed` cursor
- **Error**: `ToastMsg` "Sign in failed. Please try again." on network failure

## Payload sent to server

```json
POST /auth/apple
Content-Type: application/json

{
  "identityToken": "<JWT string>",
  "authorizationCode": "<string>",
  "user": "<Apple user ID string>",
  "fullName": {
    "givenName": "<string>",
    "familyName": "<string>"
  },
  "email": "<string>"
}
```

Server is responsible for:
1. Validating the JWT `identityToken` with Apple's public keys
2. Exchanging the `authorizationCode` with Apple for session tokens
3. Creating / updating the user account

## Pre-production configuration (Apple Developer Console)

1. **App ID**: Enable "Sign in with Apple" capability on your existing App ID or create a new one
2. **Services ID**: Create a "Sign in with Apple" Services ID (client ID, e.g. `com.drasif.loseweightsmarter`)
3. **Configure Domains**: Add `drasif-app-server-production-e198.up.railway.app` to allowed email reply domains
4. **Info.plist**: Set `AAPLServiceConfiguration` with your Services ID

## No changes to Android

Sign in with Apple is iOS-only. The button is only added to the Onboarding flow which is identical for both platforms.