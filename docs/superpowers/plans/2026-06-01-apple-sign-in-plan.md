# Sign in with Apple Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Sign in with Apple" button on Onboarding step 1 that triggers native iOS Apple Sign In and forwards raw credentials to the server.

**Architecture:** Use `@capacitor-community/apple-sign-in` community plugin. JS button calls `AppleSignIn.authenticate()`, native iOS shows system Sign in with Apple UI, returned credential object is POSTed as JSON to the API endpoint. Button only visible when gender selected + disclaimer checked.

**Tech Stack:** `@capacitor-community/apple-sign-in`, native iOS ASAuthorizationAppleID via Capacitor plugin bridge.

---

## Task 1: Install the community plugin

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add plugin to package.json**

Run:
```bash
cd /Users/karsa/Downloads/upwork/DrAsif
npm install @capacitor-community/apple-sign-in
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @capacitor-community/apple-sign-in

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Add iOS native configuration

**Files:**
- Modify: `ios/App/App/Info.plist`
- Modify: `ios/App/Podfile`

- [ ] **Step 1: Add AAPLServiceConfiguration to Info.plist**

Add this `<dict>` entry inside the existing `<dict>` in Info.plist, before the closing `</dict>`:

```xml
	<key>AAPLServiceConfiguration</key>
	<dict>
		<key>AAPLServiceKey</key>
		<string>com.drasif.loseweightsmarter</string>
	</dict>
```

This sets the Apple Services ID (client ID) for Sign in with Apple. The string value `com.drasif.loseweightsmarter` must match the Services ID created in Apple Developer Console.

- [ ] **Step 2: Verify Podfile has plugin entry**

After running `npx cap sync ios` in a later step, the plugin pod will be auto-added to `Podfile`. No manual Podfile change needed now.

- [ ] **Step 3: Commit**

```bash
git add ios/App/App/Info.plist
git commit -m "feat(ios): add AAPLServiceConfiguration for Sign in with Apple

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Wire button in Onboarding (step 1)

**Files:**
- Modify: `src/dr_asif_v21_app.jsx`

- [ ] **Step 1: Read current Onboarding component to find exact line numbers**

Run:
```bash
grep -n "function Onboarding\|Next — Personalise My Plan\|step === 1" /Users/karsa/Downloads/upwork/DrAsif/src/dr_asif_v21_app.jsx | head -20
```

- [ ] **Step 2: Read Onboarding function in full**

```bash
sed -n '179,221p' /Users/karsa/Downloads/upwork/DrAsif/src/dr_asif_v21_app.jsx
```

- [ ] **Step 3: Add import for AppleSignIn**

Find the existing import line that starts with `import { useState` and add `AppleSignIn` to it:

```js
import { AppleSignIn } from "@capacitor-community/apple-sign-in";
```

Place it alongside the existing import block at the top of the file.

- [ ] **Step 4: Add state + handler inside Onboarding function**

Find the Onboarding function opening line (around line 180):
```js
function Onboarding({ onSelect }) {
```

Add `appleLoading` state and `handleAppleSignIn` handler after the existing state declarations (line 181):

```js
  const [appleLoading, setAppleLoading] = useState(false);

  const handleAppleSignIn = async () => {
    if (!sel) return;
    setAppleLoading(true);
    try {
      const result = await AppleSignIn.authenticate({ clientId: "com.drasif.loseweightsmarter" });
      const apiUrl = "https://drasif-app-server-production-e198.up.railway.app/auth/apple";
      await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityToken: result.identityToken,
          authorizationCode: result.authorizationCode,
          user: result.user,
          fullName: result.fullName,
          email: result.email,
        }),
      });
      onSelect(sel, null);
    } catch (e) {
      console.error("Apple Sign In failed", e);
      // User cancelled — silent, no toast needed
    } finally {
      setAppleLoading(false);
    }
  };
```

- [ ] **Step 5: Add Apple Sign In button below "Next — Personalise My Plan →"**

Find the "Next — Personalise My Plan →" button (around line 208-209) and add the Apple button directly after it inside `{step === 1 && (...)}`:

```jsx
          {sel && ok && (
            <button onClick={handleAppleSignIn} disabled={appleLoading} style={{ width: "100%", marginTop: 10, padding: 13, borderRadius: 14, border: "2px solid rgba(255,255,255,0.35)", background: "rgba(0,0,0,0.25)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: appleLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: appleLoading ? 0.7 : 1, transition: "all 0.2s" }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              {appleLoading ? "Signing in..." : "Sign in with Apple"}
            </button>
          )}
```

The button is wrapped in `{sel && ok && (...)}` — same visibility condition as the Next button.

- [ ] **Step 6: Build to verify no errors**

```bash
npm run build
```

Expected: no errors, `dist/assets/index-*.js` generated.

- [ ] **Step 7: Commit**

```bash
git add src/dr_asif_v21_app.jsx
git commit -m "feat: add Sign in with Apple button on Onboarding

- Wire AppleSignIn.authenticate() from @capacitor-community/apple-sign-in
- POST raw credential to drasif-app-server API
- Button shows when gender selected + disclaimer checked

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Sync Capacitor and verify iOS native plugin wired

**Files:**
- Modify: `ios/App/Podfile` (auto-generated by capacitor sync)

- [ ] **Step 1: Run cap sync ios**

```bash
npx cap sync ios
```

Expected output includes:
```
✓ Sync native
✓ Updating iOS native dependencies
```

- [ ] **Step 2: Verify plugin pod is in Podfile**

```bash
grep -n "apple-sign-in\|AppleSignIn" /Users/karsa/Downloads/upwork/DrAsif/ios/App/Podfile
```

Expected: shows `capacitor-community/apple-sign-in` pod entry.

- [ ] **Step 3: Commit**

```bash
git add ios/App/Podfile ios/App/Podfile.lock
git commit -m "chore: sync @capacitor-community/apple-sign-in to iOS

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Build iOS to verify native integration

**Files:**
- Modify: none (verification only)

- [ ] **Step 1: Run xcodebuild**

```bash
cd /Users/karsa/Downloads/upwork/DrAsif
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -30
```

Expected: `** BUILD SUCCEEDED **` or a list of specific errors to fix.

- [ ] **Step 2: If build fails, check errors**

Common causes:
- Plugin not found: re-run `npx cap sync ios`
- Info.plist XML syntax error: validate with `plutil`
- Missing capability: check Apple Developer Console setup

---

## Spec Coverage Check

- [x] Plugin install → Task 1
- [x] iOS native config → Task 2 (Info.plist AAPLServiceConfiguration)
- [x] JS button with correct style + visibility condition → Task 3
- [x] AppleSignIn.authenticate() call → Task 3
- [x] POST to prod API endpoint → Task 3
- [x] Loading state + error handling → Task 3
- [x] Capacitor sync → Task 4
- [x] iOS build verification → Task 5

**No gaps found.**

## Placeholder Scan

- No "TBD", "TODO", or "implement later" in plan
- All file paths are exact
- All code is complete (no "write similar code here" references)
- API URL is concrete: `https://drasif-app-server-production-e198.up.railway.app/auth/apple`

## Self-Review: Type Consistency

- `AppleSignIn.authenticate({ clientId })` — plugin JS API, matches community plugin signature
- `result.identityToken`, `result.authorizationCode`, `result.user`, `result.fullName`, `result.email` — standard `ASAuthorizationAppleIDCredential` fields surfaced by the plugin
- `onSelect(sel, null)` — matches existing `Onboarding` prop signature (defined in parent App as `(g, p) => { setGender(g); if (p) setUserProfile(p); setActive("home"); }`)

All consistent. Plan complete.