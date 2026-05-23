# Delete My Data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Delete My Data" button to Settings with two-step confirmation that clears all data and returns to onboarding.

**Architecture:** Two changes in `src/dr_asif_v21_app.jsx`: (1) Add trigger button + confirmation box to `SettingsPanel` reusing the existing `conf` state pattern, (2) Pass `onDeleteAll` callback from `App` that calls `StorageService.clearAll()` and resets state.

**Tech Stack:** React, inline styles, localStorage via `StorageService`

---

### Task 1: Add delete button + confirmation to SettingsPanel

**Files:**
- Modify: `src/dr_asif_v21_app.jsx:957,1043-1044`

- [ ] **Step 1: Add `onDeleteAll` to SettingsPanel props destructuring**

Line 957, change:
```jsx
function SettingsPanel({gender, setGender, userProfile, setUserProfile, onClose}) {
```
To:
```jsx
function SettingsPanel({gender, setGender, userProfile, setUserProfile, onClose, onDeleteAll}) {
```

- [ ] **Step 2: Add "Delete My Data" button and confirmation box**

After the Medical Disclaimer `</Card>` on line 1043, before `</div>` on line 1044, insert:

```jsx
      {/* Delete My Data */}
      <Card>
        <Ttl>Data</Ttl>
        {conf!=="del" ? (
          <button onClick={() => setConf("del")} style={{width:"100%",padding:"11px 0",borderRadius:11,border:`1.5px solid ${T.alert}`,background:T.surface,color:T.alert,fontSize:13,fontWeight:600,cursor:"pointer"}}>Delete My Data</button>
        ) : (
          <div style={{background:T.alertL,borderRadius:11,padding:13,border:`1px solid ${T.alert}25`}}>
            <p style={{color:T.navy,fontSize:13,fontWeight:600,margin:"0 0 7px",textAlign:"center"}}>Delete All Your Data?</p>
            <p style={{color:T.mid,fontSize:12,margin:"0 0 12px",textAlign:"center",lineHeight:1.5}}>This will permanently delete all your progress, logs, challenge records, messages, and settings. This action cannot be undone.</p>
            <div style={{display:"flex",gap:7}}>
              <button onClick={() => setConf(null)} style={{flex:1,padding:"10px 0",borderRadius:9,border:`1px solid ${T.border}`,background:T.surface,color:T.mid,fontSize:13,cursor:"pointer"}}>Cancel</button>
              <button onClick={() => { onDeleteAll(); }} style={{flex:1,padding:"10px 0",borderRadius:9,border:"none",background:T.alert,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Yes, Delete All</button>
            </div>
          </div>
        )}
      </Card>
```

- [ ] **Step 3: Verify SettingsPanel renders**

Run: `npm run dev`
Open the app, navigate to Settings, scroll down. Confirm the "Delete My Data" button appears below the Medical Disclaimer card.

- [ ] **Step 4: Commit**

```bash
git add src/dr_asif_v21_app.jsx
git commit -m "feat: add Delete My Data button and confirmation UI to Settings

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Wire onDeleteAll callback in App

**Files:**
- Modify: `src/dr_asif_v21_app.jsx:2,1136`

- [ ] **Step 1: Import StorageService**

Line 2 currently:
```jsx
import { useGender, useUserProfile, useStreak, useCaloriesFood, useCaloriesExercise, useChallengePhase, useChallengeStarted, useChallengeChecked, useTrackEntries, useCoachMessages, useCommunityLiked } from "./services/storage";
```

Change to add `StorageService`:
```jsx
import { useGender, useUserProfile, useStreak, useCaloriesFood, useCaloriesExercise, useChallengePhase, useChallengeStarted, useChallengeChecked, useTrackEntries, useCoachMessages, useCommunityLiked, StorageService } from "./services/storage";
```

- [ ] **Step 2: Define onDeleteAll callback and pass to SettingsPanel**

Line 1136 currently:
```jsx
<SettingsPanel gender={gender} setGender={setGender} userProfile={userProfile} setUserProfile={setUserProfile} onClose={()=>setSettings(false)}/>
```

Change to:
```jsx
<SettingsPanel gender={gender} setGender={setGender} userProfile={userProfile} setUserProfile={setUserProfile} onClose={()=>setSettings(false)} onDeleteAll={()=>{StorageService.clearAll();setGender(null);setUserProfile(null);setSettings(false);}}/>
```

- [ ] **Step 3: Verify end-to-end flow**

Run: `npm run dev`
1. Use the app normally (select gender, log some data)
2. Open Settings → scroll to "Delete My Data" → tap it
3. Confirm the warning text is shown
4. Tap "Yes, Delete All"
5. Verify: app returns to Onboarding gender selection screen
6. Refresh the page — confirm still on onboarding (data gone from localStorage)

- [ ] **Step 4: Commit**

```bash
git add src/dr_asif_v21_app.jsx
git commit -m "feat: wire delete-all-data callback to clear storage and reset state

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```
