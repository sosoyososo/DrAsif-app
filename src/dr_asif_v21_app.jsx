import { useState, useEffect, useRef } from "react";
import { useGender, useUserProfile, useStreak, useCaloriesFood, useCaloriesExercise, useChallengePhase, useChallengeStarted, useChallengeChecked, useTrackEntries, useCoachMessages, useCommunityLiked, StorageService } from "./services/storage";

const T = {
  bg: "#F4F6F9", surface: "#FFFFFF", surfaceAlt: "#F8FAFC",
  navy: "#0F2D4A", navyMid: "#1A4A6E", teal: "#1A7A6E", tealL: "#22A090", tealXL: "#D6F0ED",
  gold: "#B8860B", goldXL: "#FAF4E6", sage: "#2E7D57", sageXL: "#EAF5EE",
  mid: "#4A6680", light: "#8AA4BA", border: "#E2EAF0",
  alert: "#C0392B", alertL: "#FDECEA",
};

const PLANS = {
  male: {
    label: "Men", icon: "♂", presetMeals: 1600, recommended: 2500, deficit: 500,
    meals: [
      { name: "Intelligent Breakfast", time: "11am–12pm", kcal: 400, icon: "☕", tag: "No Carbs", why: "No carbs keeps you fat-burning for 18–20 hours. Protein only." },
      { name: "Clever Lunch", time: "3–4pm", kcal: 800, icon: "🍱", tag: "All Macros · Your favourites", why: "Eat what you love. All macronutrients here. This is what makes ABS-X sustainable." },
      { name: "Light Supper", time: "7–8pm", kcal: 400, icon: "🌙", tag: "Early & Light", why: "Early supper extends your overnight fast. Whole fruit or salad." },
    ],
    bmi: { range: "18.5–24.9" }, waist: { target: "Under 94 cm" }, bodyFat: { ripped: "< 15%" },
  },
  female: {
    label: "Women", icon: "♀", presetMeals: 1200, recommended: 2000, deficit: 500,
    meals: [
      { name: "Intelligent Breakfast", time: "11am–12pm", kcal: 300, icon: "☕", tag: "No Carbs", why: "No carbs keeps you fat-burning for 18–20 hours. Protein only." },
      { name: "Clever Lunch", time: "3–4pm", kcal: 600, icon: "🍱", tag: "All Macros · Your favourites", why: "Eat what you love. All macronutrients here. This is what makes ABS-X sustainable." },
      { name: "Light Supper", time: "7–8pm", kcal: 300, icon: "🌙", tag: "Early & Light", why: "Early supper extends your overnight fast. Whole fruit or salad." },
    ],
    bmi: { range: "18.5–24.9" }, waist: { target: "Under 80 cm" }, bodyFat: { ripped: "< 20%" },
  },
};

const QUOTES = [
  { text: "If I can do it, you can do it too.", src: "Dr. Asif Mushtaq" },
  { text: "Perfection is not a destination but a journey.", src: "Chapter 1" },
  { text: "Work smarter, not harder.", src: "Chapter 5" },
  { text: "Don't judge yourself — the body will take its time.", src: "X-Point Theory" },
  { text: "The mind is the most crucial part of the weight-loss triangle.", src: "Chapter 6" },
  { text: "This is not a 100-metre race. It's a marathon.", src: "Chapter 12" },
  { text: "Be respectful to your taste buds when planning your diet.", src: "Chapter 3" },
  { text: "Self-love is a sign of gratitude.", src: "Chapter 10" },
  { text: "When you are hungry during fasting, your body is using its fat reserves. Good news!", src: "Chapter 13" },
  { text: "Once your autopilot switches on, staying fit feels effortless.", src: "Chapter 6" },
];

const PHASES = {
  week3: {
    label: "3-Week Habit", emoji: "🌱", color: T.teal, days: 21,
    targets: [{ id: "fast", l: "Fasted 14–16 hours", i: "⏰" }, { id: "walk", l: "Walked on empty stomach", i: "🚶" }, { id: "breakfast", l: "Delayed breakfast (11am+)", i: "☕" }, { id: "meals", l: "Ate only preset meals", i: "🍽" }, { id: "exercise", l: "Burned 500 kcal", i: "🔥" }, { id: "protein", l: "Hit protein: 1–1.5g/kg", i: "🥩" }, { id: "water", l: "Drank 2–3 litres water", i: "💧" }],
    tips: [{ i: "🧠", t: "Don't aim for perfection — aim for consistency. Starting is everything." }, { i: "☕", t: "Black coffee before your fasting walk reduces hunger and helps you through it." }, { i: "💧", t: "When hungry during fasting, drink 2 glasses of water first — thirst mimics hunger." }, { i: "🥩", t: "Protein 1–1.5g per kg body weight. Eggs, chicken, fish, beans. Protects muscle." }, { i: "📌", t: "Print the ABS-X plan and put it on your fridge. Seeing it daily reinforces the habit." }],
    warning: "Your body may show little change in the first 3 weeks — this is the blind period. Stay the course.",
  },
  month3: {
    label: "3-Month Weight Loss", emoji: "⚖️", color: "#1A4A6E", days: 90,
    targets: [{ id: "fast", l: "Fasted 14–16 hours", i: "⏰" }, { id: "meals", l: "Ate only preset meals", i: "🍽" }, { id: "exercise", l: "Burned 500 kcal", i: "🔥" }, { id: "protein", l: "Hit protein: 1–1.5g/kg", i: "🥩" }, { id: "nosnack", l: "No snacking between meals", i: "🚫" }, { id: "nosoda", l: "No soda or fizzy drinks", i: "🥤" }, { id: "weighed", l: "Logged weight this week", i: "📊" }],
    tips: [{ i: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", t: "Brighton, London, Manchester — all reach Scotland if heading right. Your start doesn't matter." }, { i: "⏳", t: "The blind period A→X is where most people quit. Knowing it exists is your weapon." }, { i: "🥩", t: "Protein prevents muscle loss during deficit. The weight you lose is fat, not muscle." }, { i: "🔄", t: "Slip for a day? Ask 'What are my options now?' then restart. Don't judge yourself." }, { i: "💪", t: "25% light weights in daily exercise builds metabolic muscle and prevents skinny fat." }],
    warning: "Results vary by starting weight, age and metabolism. You will reach your X-Point — keep going.",
  },
  month3fit: {
    label: "3-Month Fitness", emoji: "💪", color: "#6B3FA0", days: 90,
    targets: [{ id: "meals", l: "Ate only preset meals", i: "🍽" }, { id: "exercise", l: "Completed daily exercise", i: "🔥" }, { id: "weights", l: "Strength / Muscle Yoga", i: "💪" }, { id: "protein", l: "Hit protein: 1–1.5g/kg", i: "🥩" }, { id: "sleep", l: "Slept 8 hours", i: "😴" }, { id: "composition", l: "Logged body composition", i: "📐" }],
    tips: [{ i: "💪", t: "Muscle Yoga: lighter weight, full contraction, hold 5–10 seconds, repeat. More growth, less injury." }, { i: "📊", t: "Body composition machine not just scales. Muscle weighs more than fat." }, { i: "🥩", t: "Protein 1–1.5g/kg. Lean meat, eggs, fish, beans, dairy. Preserves muscle as fat reduces." }, { i: "😴", t: "Sleep is non-negotiable. 8 hours for muscle repair and fat metabolism." }, { i: "🌿", t: "You've done the hard part. Trust your autopilot. The mind is now the big boss." }],
    warning: "This phase is about body composition, not scales. Fat replaced by muscle — trust body fat % not weight.",
  },
};

function calcProfile(gender, age, weight, height, activity) {
  const floor = gender === "male" ? 1400 : 1200;
  const bmr = gender === "male"
    ? (10 * weight) + (6.25 * height) - (5 * age) + 5
    : (10 * weight) + (6.25 * height) - (5 * age) - 161;
  const maint = Math.round(bmr * parseFloat(activity));
  const diet = Math.max(Math.round(maint - 500), floor);
  const bmi = Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10;
  const bmiLabel = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy" : bmi < 30 ? "Overweight" : "Obese";
  return { maint, diet, bmi, bmiLabel, weight, age, height, activity };
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function LogoMark({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect width="100" height="100" rx="20" fill="#0F2D4A" />
      <text x="10" y="72" fontFamily="Georgia,serif" fontSize="62" fontWeight="700" fill="#FFF">DA</text>
      <rect x="62" y="4" width="34" height="34" rx="7" fill="#1A7A6E" />
      <line x1="79" y1="11" x2="79" y2="31" stroke="#FFF" strokeWidth="6" strokeLinecap="round" />
      <line x1="69" y1="21" x2="89" y2="21" stroke="#FFF" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
const Card = ({ children, style = {} }) => (
  <div style={{ background: T.surface, borderRadius: 16, padding: "15px 17px", boxShadow: "0 1px 4px rgba(15,45,74,0.06),0 4px 14px rgba(15,45,74,0.04)", border: `1px solid ${T.border}`, marginBottom: 11, ...style }}>{children}</div>
);
const Ttl = ({ children, style = {} }) => (
  <p style={{ color: T.navy, fontSize: 13, fontFamily: "sans-serif", fontWeight: 700, margin: "0 0 11px", ...style }}>{children}</p>
);
const ToastMsg = ({ msg }) => msg ? (
  <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: T.navy, color: "#fff", padding: "9px 20px", borderRadius: 50, fontSize: 12, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(15,45,74,0.3)", pointerEvents: "none" }}>{msg}</div>
) : null;

// ── Calc form ─────────────────────────────────────────────────────────────────
function CalcForm({ gender, onSave, onSkip }) {
  const [age, setAge] = useState(""); const [wt, setWt] = useState(""); const [ht, setHt] = useState("");
  const [act, setAct] = useState("1.375"); const [res, setRes] = useState(null); const [err, setErr] = useState("");
  const inp = { width: "100%", padding: "12px 13px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.28)", fontSize: 14, background: "rgba(255,255,255,0.13)", color: "#fff", outline: "none", boxSizing: "border-box" };
  const go = () => {
    const a = parseFloat(age), w = parseFloat(wt), h = parseFloat(ht);
    if (!a || !w || !h || a < 16 || w < 30 || h < 100) { setErr("Please fill all fields with valid numbers."); return; }
    setErr(""); setRes(calcProfile(gender, a, w, h, act));
  };
  if (res) return (
    <div>
      <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 14, marginBottom: 12, border: "1px solid rgba(255,255,255,0.18)" }}>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 10px" }}>Your personalised plan</p>
        {[["Maintenance", `${res.maint.toLocaleString()} kcal/day`, "Your body burns this at rest"], ["Diet target", `${res.diet.toLocaleString()} kcal/day`, "Eat 500 kcal less"], ["Exercise goal", "500 kcal/day", "Burn 500 kcal more"], ["Total deficit", "1,000 kcal/day", "≈ 1 kg fat per week"]].map(([l, v, n], i, a) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: i < a.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
            <div><p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: "0 0 1px" }}>{l}</p><p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, margin: 0 }}>{n}</p></div>
            <p style={{ color: i === 3 ? "#22A090" : "#fff", fontSize: 13, fontWeight: 700, margin: 0 }}>{v}</p>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[["BMI", `${res.bmi} · ${res.bmiLabel}`], ["Healthy weight", "NHS Calculation"]].map(([l, v]) => (
          <div key={l} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 11, padding: "10px 12px" }}>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, margin: "0 0 3px" }}>{l}</p>
            <p style={{ color: "#fff", fontSize: 13, fontWeight: 700, margin: 0 }}>{v}</p>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setRes(null)} style={{ flex: 1, padding: 12, borderRadius: 11, border: "1.5px solid rgba(255,255,255,0.25)", background: "transparent", color: "rgba(255,255,255,0.7)", fontSize: 13, cursor: "pointer" }}>← Redo</button>
        <button onClick={() => onSave(res)} style={{ flex: 2, padding: 12, borderRadius: 11, border: "none", background: "#fff", color: T.navy, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Use This Plan →</button>
      </div>
    </div>
  );
  return (
    <div>
      <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, margin: "0 0 14px", textAlign: "center", lineHeight: 1.5 }}>NHS Mifflin-St Jeor personalised calculation</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {[["Age", age, setAge, "e.g. 42"], ["Weight (kg)", wt, setWt, "e.g. 85"]].map(([l, v, s, p]) => (
          <div key={l}><label style={{ display: "block", color: "rgba(255,255,255,0.55)", fontSize: 11, marginBottom: 5 }}>{l}</label><input type="number" value={v} onChange={e => s(e.target.value)} placeholder={p} style={inp} /></div>
        ))}
      </div>
      <div style={{ marginBottom: 12 }}><label style={{ display: "block", color: "rgba(255,255,255,0.55)", fontSize: 11, marginBottom: 5 }}>Height (cm)</label><input type="number" value={ht} onChange={e => setHt(e.target.value)} placeholder="e.g. 175" style={inp} /></div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", color: "rgba(255,255,255,0.55)", fontSize: 11, marginBottom: 8 }}>Activity level</label>
        {[["1.2", "Mostly sitting", "Desk job, little exercise"], ["1.375", "Light movement", "Walking, exercise 1–3×/week"], ["1.55", "Moderately active", "Exercise 3–5×/week"], ["1.725", "Very active", "Hard exercise most days"]].map(([v, l, s]) => (
          <button key={v} onClick={() => setAct(v)} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${act === v ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.15)"}`, background: act === v ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)", cursor: "pointer", marginBottom: 6 }}>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: act === v ? 700 : 400 }}>{l}</span>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 2 }}>{s}</span>
          </button>
        ))}
      </div>
      {err && <p style={{ color: "#FDECEA", fontSize: 12, margin: "0 0 10px" }}>{err}</p>}
      <button onClick={go} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: "#fff", color: T.navy, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>Calculate My Plan</button>
      <button onClick={onSkip} style={{ width: "100%", padding: 11, borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}>Skip — use standard plan</button>
    </div>
  );
}

// ── Splash ────────────────────────────────────────────────────────────────────
function Splash({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, []);
  return (
    <div style={{ height: "100%", background: "linear-gradient(160deg,#0F2D4A,#1A4A6E 45%,#1A7A6E)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40 }}>
      <LogoMark size={80} />
      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: 4, margin: "18px 0 2px", textTransform: "uppercase" }}>DR</p>
      <p style={{ color: "#fff", fontSize: 44, fontFamily: "Georgia,serif", fontWeight: 700, margin: 0, letterSpacing: -1 }}>Asif</p>
      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 20, fontFamily: "Georgia,serif", letterSpacing: 6, margin: "2px 0 14px" }}>Diet</p>
      <div style={{ width: 30, height: 1.5, background: "#1A7A6E", margin: "0 auto 14px" }} />
      <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase" }}>Lose Weight Smarter for Life</p>
    </div>
  );
}

// ── Onboarding ────────────────────────────────────────────────────────────────
function Onboarding({ onSelect }) {
  const [step, setStep] = useState(1); const [sel, setSel] = useState(null); const [ok, setOk] = useState(false);
  return (
    <div style={{ minHeight: "100%", background: "linear-gradient(160deg,#0F2D4A,#1A4A6E 45%,#1A7A6E)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 22px", textAlign: "center", overflowY: "auto" }}>
      <LogoMark size={60} />
      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: 3.5, margin: "12px 0 2px", textTransform: "uppercase" }}>DR</p>
      <p style={{ color: "#fff", fontSize: 36, fontFamily: "Georgia,serif", fontWeight: 700, margin: 0, letterSpacing: -1 }}>Asif <span style={{ fontWeight: 300, letterSpacing: 4, fontSize: 30 }}>Diet</span></p>
      <div style={{ width: 24, height: 1.5, background: "#1A7A6E", margin: "10px auto 14px" }} />
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[1, 2].map(s => <div key={s} style={{ width: s === step ? 22 : 7, height: 4, borderRadius: 99, background: s <= step ? "#fff" : "rgba(255,255,255,0.2)", transition: "all 0.3s" }} />)}
      </div>
      {step === 1 && (
        <div style={{ width: "100%", textAlign: "left" }}>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, fontFamily: "Georgia,serif", fontStyle: "italic", margin: "0 0 20px", textAlign: "center", lineHeight: 1.6 }}>"If I can do it, you can do it too."<br /><span style={{ fontSize: 12, fontStyle: "normal", color: "rgba(255,255,255,0.45)" }}>— Dr. Asif Mushtaq</span></p>
          <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
            {[["male", "♂", "I am a Man"], ["female", "♀", "I am a Woman"]].map(([k, icon, lbl]) => (
              <button key={k} onClick={() => setSel(k)} style={{ flex: 1, background: sel === k ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)", borderRadius: 16, border: `2px solid ${sel === k ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"}`, padding: "18px 8px", cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ fontSize: 28, color: "#fff", marginBottom: 7 }}>{icon}</div>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{lbl}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setOk(a => !a)} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "0 0 16px", width: "100%" }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: "2px solid rgba(255,255,255,0.4)", flexShrink: 0, marginTop: 1, background: ok ? "#1A7A6E" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
              {ok && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
            </div>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, lineHeight: 1.65, margin: 0 }}>I understand this app is for general wellness guidance — not a substitute for professional medical advice. I will consult my GP before significant health changes.</p>
          </button>
          <button onClick={() => ok && sel && setStep(2)} style={{ width: "100%", padding: 15, borderRadius: 14, border: "none", background: ok && sel ? "#fff" : "rgba(255,255,255,0.2)", color: ok && sel ? T.navy : "rgba(255,255,255,0.4)", fontSize: 15, fontWeight: 700, cursor: ok && sel ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
            Next — Personalise My Plan →
          </button>
        </div>
      )}
      {step === 2 && (
        <div style={{ width: "100%", textAlign: "left" }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, margin: "0 0 16px", textAlign: "center" }}>Step 2 — Your personalised calorie plan</p>
          <CalcForm gender={sel} onSave={p => onSelect(sel, p)} onSkip={() => onSelect(sel, null)} />
        </div>
      )}
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomeTab({ plan, streakDays, setStreakDays, setShowSettings }) {
  const q = QUOTES[new Date().getDate() % QUOTES.length];
  const sc = streakDays.filter(Boolean).length;
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div style={{ height: "100%", overflowY: "auto", background: T.bg, paddingBottom: 90 }}>
      <div style={{ background: "linear-gradient(135deg,#0F2D4A,#1A4A6E 55%,#1A7A6E)", padding: "36px 18px 26px", marginBottom: 12, paddingTop: "calc(36px + 5px + var(--sa-top, 0px))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 11, margin: "0 0 5px", letterSpacing: 1.5, textTransform: "uppercase" }}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
            <p style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "0 0 5px", letterSpacing: -0.5 }}>Welcome Back 👋</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22A090" }} />
              <span style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>
                {plan.icon} {plan.label}'s Plan · {plan.presetMeals.toLocaleString()} kcal
                {plan.personalised && <span style={{ marginLeft: 8, background: "rgba(255,255,255,0.18)", borderRadius: 50, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>✦ Personalised</span>}
              </span>
            </div>
          </div>
          <LogoMark size={44} />
        </div>
        <div style={{ marginTop: 15, background: "rgba(255,255,255,0.09)", borderRadius: 13, padding: "13px 15px", border: "1px solid rgba(255,255,255,0.12)" }}>
          <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, margin: "0 0 5px", letterSpacing: 1.5, textTransform: "uppercase" }}>{q.src}</p>
          <p style={{ color: "rgba(255,255,255,0.92)", fontSize: 14, fontFamily: "Georgia,serif", fontStyle: "italic", margin: 0, lineHeight: 1.6 }}>"{q.text}"</p>
        </div>
      </div>
      <div style={{ padding: "0 15px" }}>
        {/* Plan bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.surface, borderRadius: 13, padding: "10px 15px", marginBottom: 11, border: `1px solid ${T.border}`, boxShadow: "0 1px 4px rgba(15,45,74,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.teal }} />
            <div>
              <p style={{ color: T.navy, fontSize: 13, fontWeight: 700, margin: "0 0 1px" }}>{plan.icon} {plan.label}'s Plan <span style={{ background: plan.personalised ? T.teal : T.navyMid, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 50, marginLeft: 4 }}>{plan.personalised ? "✦ Personalised" : "Standard"}</span></p>
              <p style={{ color: T.light, fontSize: 11, margin: 0 }}>{plan.presetMeals.toLocaleString()} kcal · 🔥 500 kcal burn goal</p>
            </div>
          </div>
          <button onClick={() => setShowSettings(true)} style={{ background: T.tealXL, border: "none", borderRadius: 9, padding: "7px 12px", color: T.teal, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Change ⚙</button>
        </div>
        {/* Book */}
        <Card style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ flexShrink: 0, width: 62, height: 84, borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 14px rgba(15,45,74,0.2)" }}>
            <svg width="62" height="84" viewBox="0 0 72 96">
              <rect width="72" height="96" fill="#FF8800" />
              <text x="36" y="13" textAnchor="middle" fontFamily="sans-serif" fontSize="5.5" fill="white" fontWeight="700">DR ASIF MUSHTAQ</text>
              <text x="36" y="35" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill="white" fontWeight="900">LOSE</text>
              <text x="36" y="49" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill="white" fontWeight="900">WEIGHT</text>
              <text x="36" y="63" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill="white" fontWeight="900">SMARTER</text>
              <text x="36" y="77" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill="white" fontWeight="900">FOR LIFE</text>
              <text x="36" y="90" textAnchor="middle" fontFamily="sans-serif" fontSize="4.5" fill="rgba(255,255,255,0.8)">NO INJECTIONS · NO DRUGS</text>
            </svg>
          </div>
          <div>
            <p style={{ color: T.light, fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 4px" }}>Published Book</p>
            <p style={{ color: T.navy, fontSize: 14, fontWeight: 700, margin: "0 0 3px" }}>Lose Weight Smarter for Life</p>
            <p style={{ color: T.mid, fontSize: 12, margin: "0 0 8px" }}>Dr. Asif Mushtaq</p>
            <span style={{ background: T.tealXL, color: T.teal, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 50 }}>2nd Edition 2026</span>
          </div>
        </Card>
        {/* 3 Steps */}
        <Card>
          <Ttl>3 Simple Steps · Chapter 1</Ttl>
          {[["🚶", "Walk on empty stomach", "Burns fat fastest. Before breakfast, during your fast."], ["⏰", "Delay breakfast", "Push to 10–11am. Extend your overnight fast."], ["⌛", "Wait — be patient", "The X-Point is coming. Don't quit in the blind period."]].map(([icon, title, desc], i) => (
            <div key={i} style={{ display: "flex", gap: 11, padding: "9px 0", borderBottom: i < 2 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ width: 33, height: 33, borderRadius: 9, background: T.tealXL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
              <div><p style={{ color: T.navy, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{title}</p><p style={{ color: T.mid, fontSize: 12, margin: 0, lineHeight: 1.4 }}>{desc}</p></div>
            </div>
          ))}
        </Card>
        {/* Meals */}
        <Card>
          <Ttl>Your ABS-X Meal Plan</Ttl>
          {plan.meals.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < plan.meals.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: T.tealXL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{m.icon}</div>
                <div><p style={{ color: T.navy, fontSize: 13, fontWeight: 700, margin: "0 0 1px" }}>{m.name}</p><p style={{ color: T.light, fontSize: 11, margin: 0 }}>{m.time} · {m.tag}</p></div>
              </div>
              <p style={{ color: T.teal, fontSize: 15, fontWeight: 700, margin: 0 }}>{m.kcal}</p>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 9, borderTop: `2px solid ${T.border}`, marginTop: 4 }}>
            <span style={{ color: T.navy, fontSize: 13, fontWeight: 700 }}>Daily total</span>
            <span style={{ color: T.teal, fontSize: 15, fontWeight: 700 }}>{plan.presetMeals} kcal</span>
          </div>
        </Card>
        {/* Streak */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
            <Ttl style={{ margin: 0 }}>Daily Streak 🔥</Ttl>
            <span style={{ color: T.teal, fontSize: 13, fontWeight: 700 }}>{sc}/7 days</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {days.map((d, i) => (
              <button key={i} onClick={() => { const n = [...streakDays]; n[i] = !n[i]; setStreakDays(n); }} style={{ flex: 1, aspectRatio: "1", borderRadius: 9, border: "none", background: streakDays[i] ? T.teal : T.border, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, transition: "all 0.2s" }}>
                <span style={{ color: streakDays[i] ? "#fff" : T.light, fontSize: 10, fontWeight: 700 }}>{d}</span>
                {streakDays[i] && <span style={{ fontSize: 8 }}>✓</span>}
              </button>
            ))}
          </div>
          {sc >= 7 && <div style={{ marginTop: 11, padding: "9px 13px", background: T.sageXL, borderRadius: 9, textAlign: "center" }}><p style={{ color: T.sage, fontSize: 13, fontWeight: 700, margin: 0 }}>🏆 7 days! Your autopilot is building.</p></div>}
        </Card>
      </div>
    </div>
  );
}

// ── CALORIES ──────────────────────────────────────────────────────────────────
function CaloriesTab({ plan }) {
  const lim = plan.presetMeals;
  const [food, setFood] = useCaloriesFood([]); const [ex, setEx] = useCaloriesExercise([]);
  const [nm, setNm] = useState(""); const [nk, setNk] = useState(""); const [sm, setSm] = useState(false);
  const [mins, setMins] = useState("30"); const [sex, setSex] = useState(false);
  const [toast, setToast] = useState("");
  // ── Photo scanner state ──
  const [scanning, setScanning] = useState(false);
  const [scanImg, setScanImg] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const fileRef = useRef();

  const eaten = food.reduce((s, f) => s + f.kcal, 0);
  const burned = ex.reduce((s, e) => s + e.kcal, 0);
  const pct = Math.round((eaten / lim) * 100);
  const bpct = Math.round((burned / 500) * 100);
  const over = eaten > lim; const bover = burned > 500;
  const tover = (eaten - burned) - (lim - 500);
  const bdone = burned >= 500;
  const R = 41, circ = 2 * Math.PI * R;
  const showT = m => { setToast(m); setTimeout(() => setToast(""), 2400); };
  const addF = () => { if (!nm || !nk) return; setFood(p => [...p, { id: Date.now(), name: nm, kcal: parseInt(nk), type: "manual" }]); showT(`✓ ${nm} added`); setNm(""); setNk(""); setSm(false); };
  const addE = () => { const m = parseInt(mins) || 0; if (!m) return; const k = Math.round(6 * m); setEx(p => [...p, { id: Date.now(), kcal: k, mins: m }]); showT(burned + k >= 500 ? "✓ 500 kcal goal reached! 🏆🔥" : `✓ ${k} kcal burned`); setSex(false); setMins("30"); };

  // ── Photo scan via Anthropic vision ──
  const handleImageSelect = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setScanImg(URL.createObjectURL(file)); setScanResult(null); setScanError(""); setScanning(true);
    try {
      const base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{
            role: "user", content: [{ type: "image", source: { type: "base64", media_type: file.type, data: base64 } }, {
              type: "text", text: `You are a nutrition expert. Analyse this food image and return ONLY a JSON object — no markdown, no explanation, just raw JSON:
{"foodName":"Grilled chicken with rice","totalKcal":520,"confidence":"high","breakdown":[{"item":"Grilled chicken breast","kcal":280,"portion":"150g"},{"item":"Steamed rice","kcal":200,"portion":"150g"}],"macros":{"protein":"38g","carbs":"52g","fat":"8g"},"tip":"Good high-protein meal. Counts as your Clever Lunch."}
If you cannot identify food, return: {"error":"Could not identify food. Please try a clearer photo."}`}]
          }]
        })
      });
      const data = await response.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.error) { setScanError(parsed.error); } else { setScanResult(parsed); }
    } catch { setScanError("Couldn't analyse the image. Please try again with a clearer photo."); }
    setScanning(false);
  };

  const addFoodFromScan = () => {
    if (!scanResult) return;
    setFood(p => [...p, { id: Date.now(), name: scanResult.foodName, kcal: scanResult.totalKcal, type: "scan" }]);
    showT(`✓ ${scanResult.foodName} added — ${scanResult.totalKcal} kcal 📸`);
    setScanResult(null); setScanImg(null);
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", background: T.bg, paddingBottom: 90, paddingTop: "var(--sa-top)" }}>
      <ToastMsg msg={toast} />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} style={{ display: "none" }} />
      <div style={{ padding: "20px 15px 0", paddingTop: "20px" }}>
        <p style={{ color: T.navy, fontSize: 22, fontWeight: 700, margin: "0 0 2px" }}>Daily Calories 🍽</p>
        <p style={{ color: T.light, fontSize: 12, margin: "0 0 13px" }}>{plan.icon} {plan.label} · {lim.toLocaleString()} kcal limit · 500 kcal burn goal</p>

        {/* Dual rings */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            {[[pct, over ? T.alert : pct > 80 ? T.gold : T.teal, `${eaten}`, `of ${lim} kcal`, "🍽 Food"], [bpct, bdone ? T.sage : bpct > 60 ? T.gold : T.teal, `${burned}`, "of 500 goal", "🔥 Exercise"]].map(([p, col, val, sub, lbl], ri) => (
              <div key={ri} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <svg width={92} height={92} viewBox="0 0 92 92">
                  <circle cx="46" cy="46" r={R} fill="none" stroke={T.border} strokeWidth="8" />
                  <circle cx="46" cy="46" r={R} fill="none" stroke={col} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${circ * (p / 100)} ${circ}`} strokeDashoffset={circ * 0.25} style={{ transition: "stroke-dasharray 0.5s" }} />
                  <text x="46" y="43" textAnchor="middle" fontFamily="sans-serif" fontSize="16" fontWeight="700" fill={T.navy}>{p}%</text>
                  <text x="46" y="57" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill={T.light}>used</text>
                </svg>
                <p style={{ color: T.navy, fontSize: 11, fontWeight: 700, margin: "3px 0 1px" }}>{lbl}</p>
                <p style={{ color: col, fontSize: 13, fontWeight: 700, margin: "0 0 1px" }}>{val} kcal</p>
                <p style={{ color: T.light, fontSize: 10, margin: 0 }}>{sub}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginTop: 11, paddingTop: 11, borderTop: `1px solid ${T.border}` }}>
            {[["Eaten", eaten, T.teal], ["Burned", burned, T.sage], [tover > 0 ? "Over" : "Left", Math.abs(tover), tover > 0 ? T.alert : T.navy]].map(([l, v, c]) => (
              <div key={l} style={{ textAlign: "center", padding: "7px 3px", background: `${c}10`, borderRadius: 9 }}>
                <p style={{ color: c, fontSize: 15, fontWeight: 700, margin: 0 }}>{v}</p>
                <p style={{ color: T.light, fontSize: 9, margin: 0 }}>kcal · {l}</p>
              </div>
            ))}
          </div>
          {tover && <div style={{ marginTop: 9, padding: "8px 11px", background: T.alertL, borderRadius: 9 }}><p style={{ color: T.alert, fontSize: 12, margin: 0, fontWeight: 600 }}>⚠️ Over limit. Ask: "What are my options now?"</p></div>}
        </Card>

        {/* ── AI PHOTO SCANNER ── */}
        <Card style={{ marginBottom: 11 }}>
          <Ttl>📸 AI Food Scanner</Ttl>
          <p style={{ color: T.mid, fontSize: 13, margin: "0 0 12px", lineHeight: 1.5 }}>Take a photo of any meal — the AI identifies the food and estimates calories and macros instantly.</p>
          <button onClick={() => fileRef.current.click()} style={{ width: "100%", padding: "14px 0", borderRadius: 13, background: `linear-gradient(135deg,${T.sage},${T.teal})`, border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 4px 16px rgba(26,122,110,0.25)`, marginBottom: 12 }}>
            📷 &nbsp; Take Photo or Upload Image
          </button>

          {scanImg && <div style={{ marginBottom: 12 }}><img src={scanImg} alt="food scan" style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover" }} /></div>}

          {scanning && <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
            <p style={{ color: T.mid, fontSize: 14, margin: 0 }}>Analysing your food…</p>
            <p style={{ color: T.light, fontSize: 12, margin: "4px 0 0" }}>Reading Dr. Mushtaq's nutrition guidelines 📖</p>
          </div>}

          {scanError && <div style={{ padding: "11px 13px", background: T.alertL, borderRadius: 11, marginBottom: 11, border: `1px solid ${T.alert}25` }}><p style={{ color: T.alert, fontSize: 13, margin: 0 }}>{scanError}</p></div>}

          {scanResult && (
            <div style={{ background: `${T.sage}10`, borderRadius: 13, padding: "13px 15px", border: `1.5px solid ${T.sage}35` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 9 }}>
                <div><p style={{ color: T.navy, fontSize: 15, fontWeight: 700, margin: "0 0 2px" }}>{scanResult.foodName}</p><p style={{ color: T.light, fontSize: 11, margin: 0 }}>Confidence: {scanResult.confidence}</p></div>
                <div style={{ textAlign: "right" }}><p style={{ color: T.teal, fontSize: 22, fontWeight: 700, margin: 0 }}>{scanResult.totalKcal}</p><p style={{ color: T.light, fontSize: 11, margin: 0 }}>kcal</p></div>
              </div>
              {scanResult.breakdown?.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: `1px solid ${T.border}` }}>
                  <span style={{ color: T.mid, fontSize: 12 }}>{item.item} <span style={{ color: T.light }}>({item.portion})</span></span>
                  <span style={{ color: T.teal, fontSize: 12, fontWeight: 600 }}>{item.kcal} kcal</span>
                </div>
              ))}
              {scanResult.macros && (
                <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
                  {Object.entries(scanResult.macros).map(([k, v]) => (
                    <div key={k} style={{ flex: 1, background: T.tealXL, borderRadius: 8, padding: "6px 4px", textAlign: "center" }}>
                      <p style={{ color: T.navy, fontSize: 11, fontWeight: 700, margin: 0 }}>{v}</p>
                      <p style={{ color: T.light, fontSize: 10, margin: 0, textTransform: "capitalize" }}>{k}</p>
                    </div>
                  ))}
                </div>
              )}
              {scanResult.tip && <p style={{ color: T.sage, fontSize: 12, margin: "9px 0 11px", fontStyle: "italic", lineHeight: 1.4 }}>💡 {scanResult.tip}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                <button onClick={addFoodFromScan} style={{ flex: 1, padding: "12px 0", borderRadius: 11, border: "none", background: `linear-gradient(135deg,${T.teal},${T.navyMid})`, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>+ Add to Today's Log</button>
                <button onClick={() => { setScanResult(null); setScanImg(null); }} style={{ padding: "12px 14px", borderRadius: 11, border: `1px solid ${T.border}`, background: T.surface, color: T.mid, fontSize: 14, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          )}
        </Card>

        {/* Manual entry */}
        <button onClick={() => setSm(s => !s)} style={{ width: "100%", padding: "11px 0", borderRadius: 12, marginBottom: 9, border: `1.5px dashed ${T.border}`, background: "transparent", color: T.mid, fontSize: 13, cursor: "pointer" }}>✏️ Add food manually</button>
        {sm && <Card style={{ marginBottom: 9 }}>
          <Ttl>Add Food Manually</Ttl>
          <input value={nm} onChange={e => setNm(e.target.value)} placeholder="Food name" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 13, background: T.surfaceAlt, color: T.navy, outline: "none", boxSizing: "border-box", marginBottom: 9 }} />
          <input type="number" value={nk} onChange={e => setNk(e.target.value)} placeholder="Calories (kcal)" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 13, background: T.surfaceAlt, color: T.navy, outline: "none", boxSizing: "border-box", marginBottom: 9 }} />
          <button onClick={addF} style={{ width: "100%", padding: 11, borderRadius: 10, border: "none", background: `linear-gradient(135deg,${T.teal},${T.navyMid})`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add Food</button>
        </Card>}

        {/* Food log */}
        {food.length > 0 && <Card style={{ marginBottom: 9 }}>
          <Ttl>Today's Food Log</Ttl>
          {food.map((f, i) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < food.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div><p style={{ color: T.navy, fontSize: 13, fontWeight: 600, margin: "0 0 1px" }}>{f.name}</p><p style={{ color: T.light, fontSize: 10, margin: 0 }}>{f.type === "scan" ? "📸 AI scan" : "✏️ Manual"}</p></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: T.teal, fontSize: 13, fontWeight: 700 }}>{f.kcal} kcal</span>
                <button onClick={() => setFood(p => p.filter(x => x.id !== f.id))} style={{ background: "none", border: "none", color: T.light, fontSize: 14, cursor: "pointer", padding: 0 }}>✕</button>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 9, borderTop: `2px solid ${T.border}`, marginTop: 4 }}>
            <span style={{ color: T.navy, fontSize: 13, fontWeight: 700 }}>Total eaten</span>
            <span style={{ color: T.teal, fontSize: 14, fontWeight: 700 }}>{eaten} kcal</span>
          </div>
        </Card>}

        {/* Exercise */}
        <Card style={{ background: bdone ? T.sageXL : T.surface, border: `1.5px solid ${bdone ? T.sage : T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
            <div>
              <p style={{ color: bdone ? T.sage : T.teal, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 2px" }}>{bdone ? "✅ Goal Reached!" : "🔥 Daily Burn Goal"}</p>
              <p style={{ color: T.navy, fontSize: 17, fontWeight: 700, margin: 0 }}>{burned} / 500 kcal</p>
            </div>
            <span style={{ fontSize: 24 }}>{bdone ? "🏆" : "🔥"}</span>
          </div>
          <div style={{ background: T.border, borderRadius: 50, height: 8, marginBottom: 11 }}>
            <div style={{ background: bdone ? T.sage : T.teal, borderRadius: 50, height: "100%", width: `${bpct}%`, transition: "width 0.4s" }} />
          </div>
          {!sex ? <button onClick={() => setSex(true)} style={{ width: "100%", padding: 11, borderRadius: 10, border: "none", background: `linear-gradient(135deg,${T.sage},${T.teal})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{bdone ? "Log more exercise" : `+ Log Exercise (${Math.max(0, 500 - burned)} kcal to go)`}</button>
            : <div>
              <p style={{ color: T.navy, fontSize: 12, fontWeight: 600, margin: "0 0 8px" }}>Brisk walking — how many minutes?</p>
              <div style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 9 }}>
                <input type="number" value={mins} onChange={e => setMins(e.target.value)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 13, background: T.surfaceAlt, color: T.navy, outline: "none" }} />
                <span style={{ color: T.light, fontSize: 12 }}>mins ≈ {Math.round(6 * (parseInt(mins) || 0))} kcal</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addE} style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", background: `linear-gradient(135deg,${T.sage},${T.teal})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Log Exercise</button>
                <button onClick={() => setSex(false)} style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, color: T.mid, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>}
        </Card>
      </div>
    </div>
  );
}
// ── FOOD GUIDE ────────────────────────────────────────────────────────────────
function FoodTab({ plan }) {
  const [sec, setSec] = useState("principles");
  const [meal, setMeal] = useState("breakfast");
  const [view, setView] = useState("foods");
  const [expCat, setExpCat] = useState(0);
  const [expRec, setExpRec] = useState(null);
  const mc = { breakfast: "#1A7A6E", lunch: "#1A4A6E", supper: "#2E7D57" };
  const foods = {
    breakfast: {
      icon: "☀️", tagline: "No carbs. Protein & healthy fat only.", warning: "⚠️ No bread, cereal, rice, fruit juice or toast.", cats: [
        { n: "Eggs", i: "🥚", items: [["Boiled eggs (2)", 140, "Simplest, most portable"], ["Scrambled eggs (2)", 200, "No toast"], ["Omelette with cheese & mushrooms", 280, "Zero carbs, very filling"], ["Poached eggs (2)", 140, "Skip the toast"]] },
        { n: "Lean protein", i: "🍗", items: [["Smoked salmon (80g)", 130, "Rich in omega-3"], ["Tinned tuna in water (100g)", 100, "Quick and filling"], ["Greek yoghurt plain (150g)", 140, "Protein + fat"], ["Cottage cheese (100g)", 98, "High protein, very low cal"], ["Grilled chicken (100g)", 165, "Classic option"]] },
        { n: "Drinks", i: "☕", items: [["Black coffee (no sugar)", 2, "Dr. Mushtaq's top pick"], ["Green tea", 0, "Boosts metabolism"], ["Sparkling water", 0, "Fizzy without the sugar"], ["Water (unlimited)", 0, "Drink 2–3L daily"]] },
      ], recipes: [
        { name: "Classic ABS-X Breakfast", kcal: 220, time: "5 mins", ing: ["2 boiled eggs", "Black coffee", "Salt & pepper"], method: "Boil eggs 7 minutes. Season. Have black coffee before or alongside.", tip: "Prepare eggs the night before — grab and go in the morning." },
        { name: "Smoked Salmon Plate", kcal: 310, time: "3 mins", ing: ["80g smoked salmon", "2 boiled eggs", "Cucumber slices"], method: "Plate salmon and cucumber. Add boiled eggs. No bread, no crackers.", tip: "Feels like a restaurant meal. Keeps you full well past lunchtime." },
        { name: "Cheese Omelette", kcal: 330, time: "8 mins", ing: ["3 eggs", "30g cheddar", "Mushrooms", "1 tsp olive oil"], method: "Beat eggs, pour into oiled pan. Add mushrooms and cheese. Fold, cook 2 more mins.", tip: "Add any vegetables — spinach, peppers, onion. All zero carbs." },
      ]
    },
    lunch: {
      icon: "🍱", tagline: "All macros. Eat what you love. Your biggest meal.", warning: "✅ Carbs welcome. Choose wholemeal over refined where possible.", cats: [
        { n: "Unrefined carbs", i: "🌾", items: [["Brown rice (100g cooked)", 130, "Slower release"], ["Sweet potato (150g baked)", 130, "Excellent fibre"], ["Wholemeal bread (2 slices)", 190, "Always over white"], ["Chapati (1 medium)", 140, "Good South Asian option"], ["Whole grain pasta (100g)", 150, "Higher fibre"], ["Naan bread (1 medium)", 280, "Your favourite? Count it in"]] },
        { n: "Lean proteins", i: "🍗", items: [["Grilled chicken breast (150g)", 248, "Best weight-loss protein"], ["Salmon fillet (150g)", 280, "Rich in omega-3"], ["White fish (150g)", 160, "Cod, haddock, sea bass"], ["Prawns (150g)", 150, "Very low calorie"], ["Chickpeas (150g)", 180, "Plant protein + carbs"], ["Lean beef (150g)", 280, "Lean cuts only"]] },
        { n: "Vegetables (eat freely)", i: "🥦", items: [["Mixed salad (large bowl)", 20, "Eat as much as you like"], ["Broccoli (100g)", 34, "Most nutritious vegetable"], ["Spinach (100g)", 23, "Iron rich"], ["Cucumber (100g)", 15, "Very filling"], ["Tomatoes (2 medium)", 44, "Good in any dish"], ["Peppers (1 medium)", 31, "High vitamin C"]] },
      ], recipes: [
        { name: "Grilled Chicken & Brown Rice", kcal: 580, time: "20 mins", ing: ["150g chicken breast", "100g brown rice", "Large salad", "Olive oil & lemon"], method: "Season and grill chicken 6–7 mins each side. Cook rice. Plate with salad. Drizzle olive oil and lemon.", tip: "Make double the chicken — save half for tomorrow's lunch." },
        { name: "Salmon & Sweet Potato", kcal: 620, time: "25 mins", ing: ["150g salmon", "150g sweet potato", "Green beans", "Lemon"], method: "Bake sweet potato 25 mins at 200°C. Pan-fry salmon 4 mins each side. Steam beans.", tip: "Omega-3, complex carbs, fibre — one of the most nutritious lunches." },
        { name: "Chicken & Vegetable Curry", kcal: 680, time: "30 mins", ing: ["150g chicken diced", "1 tin tomatoes", "Onion, garlic", "Curry spices", "100g brown rice"], method: "Fry onion. Add spices and chicken. Add tomatoes. Simmer 20 mins. Serve with rice.", tip: "Eat your favourite curry. Spices are calorie-free and healthy." },
      ]
    },
    supper: {
      icon: "🌙", tagline: "Early & light. By 7–8pm at the latest.", warning: "Keep light — fruit, salad, or soup. Not a second main meal.", cats: [
        { n: "Whole fruits", i: "🍎", items: [["Mixed fruit salad (200g)", 100, "Apple, orange, grapes, berries"], ["Apple (1 medium)", 80, "High fibre"], ["Banana (1 medium)", 105, "Potassium for recovery"], ["Mango (150g)", 90, "Your favourite fruit — here it is"], ["Strawberries (200g)", 64, "Low calorie, high antioxidants"], ["Watermelon (200g)", 60, "Mostly water — very filling"]] },
        { n: "Vegetable-based", i: "🥗", items: [["Large green salad", 120, "Unlimited leaves"], ["Tomato & cucumber salad", 60, "Olive oil, lemon, mint"], ["Vegetable soup (300ml)", 120, "Warming winter option"], ["Roasted vegetables (200g)", 120, "Courgette, peppers, aubergine"]] },
        { n: "Light protein", i: "🍳", items: [["Greek yoghurt (150g)", 140, "With fruit on top"], ["Cottage cheese (100g)", 98, "High protein, very low cal"], ["Lentil soup (300ml)", 180, "Filling and nutritious"], ["1 boiled egg + salad", 130, "When you need more"]] },
      ], recipes: [
        { name: "Classic Fruit Salad", kcal: 140, time: "5 mins", ing: ["1 apple", "1 orange", "100g grapes", "100g strawberries", "Lime juice", "Mint"], method: "Chop fruit into bowl. Squeeze lime. Add mint. Mix gently.", tip: "Make a big batch — ready for 2 suppers." },
        { name: "Mediterranean Salad", kcal: 180, time: "8 mins", ing: ["Mixed leaves", "1 tomato", "½ cucumber", "50g feta", "Olive oil & lemon"], method: "Toss leaves with cucumber and tomato. Add crumbled feta. Dress with olive oil and lemon.", tip: "Feta adds protein without many calories." },
        { name: "Yoghurt & Fruit Bowl", kcal: 200, time: "2 mins", ing: ["150g Greek yoghurt", "1 banana sliced", "Strawberries", "1 tsp honey", "Cinnamon"], method: "Spoon yoghurt into bowl. Top with fruit. Drizzle honey. Dust cinnamon.", tip: "Feels like dessert — perfect light supper." },
      ]
    },
  };
  const md = foods[meal];
  const mealIdx = { breakfast: 0, lunch: 1, supper: 2 };
  return (
    <div style={{ height: "100%", overflowY: "auto", background: T.bg, paddingBottom: 90 }}>
      <div style={{ background: "linear-gradient(135deg,#0F2D4A,#1A4A6E 50%,#1A7A6E)", padding: "28px 18px 22px", marginBottom: 12, paddingTop: "var(--sa-top)" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 4px" }}>Chapter 3</p>
        <p style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>Food Guide 🥗</p>
        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "11px 13px", border: "1px solid rgba(255,255,255,0.12)" }}>
          <p style={{ color: "rgba(255,255,255,0.88)", fontSize: 13, fontFamily: "Georgia,serif", fontStyle: "italic", margin: "0 0 3px", lineHeight: 1.5 }}>"Be respectful to your taste buds when planning your diet."</p>
          <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, margin: 0 }}>— Dr. Asif Mushtaq, Chapter 3</p>
        </div>
      </div>
      <div style={{ padding: "0 15px" }}>
        <div style={{ display: "flex", background: T.surface, borderRadius: 12, padding: 4, marginBottom: 13, border: `1px solid ${T.border}` }}>
          {[["principles", "🌿 Principles"], ["meals", "🍽 Meals & Recipes"]].map(([v, l]) => (
            <button key={v} onClick={() => setSec(v)} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", background: sec === v ? T.navy : "transparent", color: sec === v ? "#fff" : T.mid, fontSize: 12, fontWeight: sec === v ? 700 : 400, cursor: "pointer", transition: "all 0.2s" }}>{l}</button>
          ))}
        </div>
        {sec === "principles" && (
          <div>
            <Card style={{ background: T.tealXL, border: `1px solid ${T.teal}25` }}>
              <p style={{ color: T.teal, fontSize: 13, fontWeight: 700, margin: "0 0 7px" }}>🌟 The most important rule</p>
              <p style={{ color: T.mid, fontSize: 14, lineHeight: 1.7, margin: "0 0 9px" }}><strong style={{ color: T.navy }}>The best diet is the one you will actually follow.</strong> The Clever Lunch is built around the foods you love — because enjoyment = sustainability for life.</p>
              <p style={{ color: T.mid, fontSize: 13, lineHeight: 1.6, margin: 0 }}>Choose <strong>intelligently</strong>: unrefined where possible, within your calorie budget, and avoid carbs only at breakfast.</p>
            </Card>
            <Card>
              <Ttl>3 Intelligent Food Rules</Ttl>
              {[["1", "Avoid carbs at breakfast only", "Keep body fat-burning for 18–20 hours. Lunch and supper — carbs welcome.", T.teal], ["2", "Stay within your calorie budget", `Breakfast ${plan.meals[0].kcal} · Lunch ${plan.meals[1].kcal} · Supper ${plan.meals[2].kcal}. Flexible between meals.`, T.navyMid], ["3", "Choose unrefined over refined", "Wholemeal over white. Whole fruit over juice. Real food over processed.", T.sage]].map(([n, r, d, c], i) => (
                <div key={i} style={{ display: "flex", gap: 11, padding: "10px 0", borderBottom: i < 2 ? `1px solid ${T.border}` : "none" }}>
                  <div style={{ width: 27, height: 27, borderRadius: "50%", background: c, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{n}</div>
                  <div><p style={{ color: T.navy, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{r}</p><p style={{ color: T.mid, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{d}</p></div>
                </div>
              ))}
            </Card>
            <Card style={{ background: T.alertL, border: `1px solid ${T.alert}25` }}>
              <p style={{ color: T.alert, fontSize: 13, fontWeight: 700, margin: "0 0 9px" }}>❌ Always avoid</p>
              {[["Soda & fizzy drinks", "Even diet/sugar-free — trigger cravings"], ["Refined carbs", "White bread, sugary cereals, pastries"], ["Ultra-processed food", "High sodium, preservatives, hidden sugar"], ["Snacking between meals", "Breaks the fat-burning cycle"], ["Fruit juice", "Same calories as soda, barely more nutrition"]].map(([f, r], i) => (
                <div key={i} style={{ display: "flex", gap: 9, padding: "7px 0", borderBottom: i < 4 ? `1px solid rgba(192,57,43,0.1)` : "none" }}>
                  <span style={{ color: T.alert, fontSize: 13, flexShrink: 0 }}>✕</span>
                  <div><span style={{ color: T.navy, fontSize: 13, fontWeight: 600 }}>{f}</span><p style={{ color: T.mid, fontSize: 11, margin: "1px 0 0" }}>{r}</p></div>
                </div>
              ))}
            </Card>
          </div>
        )}
        {sec === "meals" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 13 }}>
              {[["breakfast", "☀️", "Breakfast"], ["lunch", "🍱", "Lunch"], ["supper", "🌙", "Supper"]].map(([k, icon, lbl]) => (
                <button key={k} onClick={() => { setMeal(k); setExpCat(0); setExpRec(null); setView("foods"); }} style={{ flex: 1, padding: "10px 5px", borderRadius: 12, background: meal === k ? mc[k] : T.surface, border: `1px solid ${meal === k ? mc[k] : T.border}`, cursor: "pointer", transition: "all 0.2s" }}>
                  <div style={{ fontSize: 19, marginBottom: 3 }}>{icon}</div>
                  <p style={{ color: meal === k ? "#fff" : T.navy, fontSize: 11, fontWeight: 700, margin: 0 }}>{lbl}</p>
                  <p style={{ color: meal === k ? "rgba(255,255,255,0.7)" : T.light, fontSize: 10, margin: "2px 0 0" }}>{plan.meals[mealIdx[k]].kcal} kcal</p>
                </button>
              ))}
            </div>
            <div style={{ background: `${mc[meal]}15`, border: `1px solid ${mc[meal]}30`, borderRadius: 12, padding: "10px 13px", marginBottom: 11 }}>
              <p style={{ color: mc[meal], fontSize: 13, fontWeight: 700, margin: "0 0 3px" }}>{md.icon} {md.tagline}</p>
              <p style={{ color: T.mid, fontSize: 12, margin: 0 }}>{md.warning}</p>
            </div>
            <div style={{ display: "flex", background: T.surface, borderRadius: 12, padding: 4, marginBottom: 12, border: `1px solid ${T.border}` }}>
              {[["foods", "🥘 Food Options"], ["recipes", "👨‍🍳 Recipes"]].map(([v, l]) => (
                <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", background: view === v ? mc[meal] : "transparent", color: view === v ? "#fff" : T.mid, fontSize: 12, fontWeight: view === v ? 700 : 400, cursor: "pointer", transition: "all 0.2s" }}>{l}</button>
              ))}
            </div>
            {view === "foods" && md.cats.map((cat, ci) => (
              <div key={ci} style={{ marginBottom: 9 }}>
                <button onClick={() => setExpCat(expCat === ci ? null : ci)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 15px", borderRadius: 12, background: T.surface, border: `1px solid ${expCat === ci ? mc[meal] : T.border}`, cursor: "pointer" }}>
                  <div style={{ display: "flex", gap: 9, alignItems: "center" }}><span style={{ fontSize: 19 }}>{cat.i}</span><span style={{ color: T.navy, fontSize: 13, fontWeight: 700 }}>{cat.n}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ background: `${mc[meal]}15`, color: mc[meal], fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 50 }}>{cat.items.length} options</span>
                    <span style={{ color: T.light }}>{expCat === ci ? "↑" : "↓"}</span>
                  </div>
                </button>
                {expCat === ci && (
                  <div style={{ background: T.surface, borderRadius: "0 0 12px 12px", border: `1px solid ${T.border}`, borderTop: "none", padding: "3px 0 7px" }}>
                    {cat.items.map(([name, kcal, note], ii) => (
                      <div key={ii} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 15px", borderBottom: ii < cat.items.length - 1 ? `1px solid ${T.border}` : "none" }}>
                        <div style={{ flex: 1 }}><p style={{ color: T.navy, fontSize: 13, fontWeight: 600, margin: "0 0 1px" }}>{name}</p><p style={{ color: T.light, fontSize: 11, margin: 0 }}>{note}</p></div>
                        <div style={{ background: `${mc[meal]}15`, borderRadius: 8, padding: "5px 9px", marginLeft: 9, flexShrink: 0 }}>
                          <p style={{ color: mc[meal], fontSize: 13, fontWeight: 700, margin: 0 }}>{kcal}</p>
                          <p style={{ color: T.light, fontSize: 9, margin: 0, textAlign: "center" }}>kcal</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {view === "recipes" && (
              <div>
                <div style={{ background: T.tealXL, borderRadius: 11, padding: "8px 12px", marginBottom: 11, border: `1px solid ${T.teal}20` }}><p style={{ color: T.teal, fontSize: 12, margin: 0, lineHeight: 1.5 }}>💡 General recipes — original, not from any published source. Calories approximate.</p></div>
                {md.recipes.map((r, ri) => (
                  <div key={ri} onClick={() => setExpRec(expRec === ri ? null : ri)} style={{ background: T.surface, borderRadius: 13, padding: "13px 15px", marginBottom: 9, border: `1.5px solid ${expRec === ri ? mc[meal] : T.border}`, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div style={{ flex: 1 }}><p style={{ color: T.navy, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{r.name}</p><div style={{ display: "flex", gap: 7 }}><span style={{ background: `${mc[meal]}15`, color: mc[meal], fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 50 }}>~{r.kcal} kcal</span><span style={{ background: T.border, color: T.mid, fontSize: 11, padding: "2px 7px", borderRadius: 50 }}>⏱ {r.time}</span></div></div>
                      <span style={{ color: T.light, fontSize: 15, marginLeft: 9 }}>{expRec === ri ? "↑" : "↓"}</span>
                    </div>
                    {expRec === ri && (
                      <div style={{ marginTop: 13, paddingTop: 13, borderTop: `1px solid ${T.border}` }}>
                        <p style={{ color: T.navy, fontSize: 12, fontWeight: 700, margin: "0 0 7px" }}>Ingredients:</p>
                        {r.ing.map((ing, ii) => <div key={ii} style={{ display: "flex", gap: 7, padding: "3px 0" }}><span style={{ color: mc[meal], fontSize: 12, flexShrink: 0 }}>·</span><span style={{ color: T.mid, fontSize: 13 }}>{ing}</span></div>)}
                        <p style={{ color: T.navy, fontSize: 12, fontWeight: 700, margin: "10px 0 4px" }}>Method:</p>
                        <p style={{ color: T.mid, fontSize: 13, lineHeight: 1.65, margin: "0 0 9px" }}>{r.method}</p>
                        <div style={{ background: `${mc[meal]}12`, borderRadius: 9, padding: "8px 11px" }}><p style={{ color: mc[meal], fontSize: 12, fontWeight: 600, margin: "0 0 2px" }}>💡 Tip</p><p style={{ color: T.mid, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{r.tip}</p></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CHALLENGE ─────────────────────────────────────────────────────────────────
function ChallengeTab({ plan }) {
  const [phase, setPhase] = useChallengePhase("week3");
  const [started, setStarted] = useChallengeStarted(false);
  const [checked, setChecked] = useChallengeChecked({});
  const cfg = PHASES[phase];
  const dk = new Date().toISOString().split("T")[0];
  const tc = checked[dk] || {};
  const done = cfg.targets.filter(t => tc[t.id]).length;
  const toggle = id => setChecked(c => ({ ...c, [dk]: { ...tc, [id]: !tc[id] } }));
  return (
    <div style={{ height: "100%", overflowY: "auto", background: T.bg, paddingBottom: 90 }}>
      <div style={{ background: `linear-gradient(160deg,${cfg.color},#0F2D4A)`, padding: "28px 18px 20px", marginBottom: 12, paddingTop: "var(--sa-top)" }}>
        <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 4px" }}>Programme</p>
        <p style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "0 0 13px" }}>{cfg.emoji} {cfg.label}</p>
        <div style={{ display: "flex", gap: 8 }}>
          {Object.entries(PHASES).map(([k, p]) => (
            <button key={k} onClick={() => setPhase(k)} style={{ padding: "6px 12px", borderRadius: 50, border: "none", background: phase === k ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.18)", color: phase === k ? T.navy : "#fff", fontSize: 11, fontWeight: phase === k ? 700 : 400, cursor: "pointer" }}>{p.emoji} {p.label.split(" ")[0]}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: "0 15px" }}>
        {!started ? (
          <Card>
            <Ttl>Daily targets · {plan.icon} {plan.label}'s Plan</Ttl>
            <div style={{ background: T.tealXL, borderRadius: 9, padding: "9px 12px", marginBottom: 13 }}><p style={{ color: T.teal, fontSize: 12, margin: 0, lineHeight: 1.55 }}>💡 {cfg.tips[0].text}</p></div>
            {cfg.targets.map((t, i) => (
              <div key={t.id} style={{ display: "flex", gap: 9, padding: "7px 0", borderBottom: i < cfg.targets.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <span style={{ fontSize: 15 }}>{t.i}</span><span style={{ color: T.mid, fontSize: 13 }}>{t.l}</span>
              </div>
            ))}
            <div style={{ marginTop: 13, background: T.surfaceAlt, borderRadius: 10, padding: "10px 12px", border: `1px solid ${T.border}` }}><p style={{ color: T.mid, fontSize: 12, margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>{cfg.warning}</p></div>
            <button onClick={() => setStarted(true)} style={{ width: "100%", marginTop: 14, padding: 14, borderRadius: 12, border: "none", background: `linear-gradient(135deg,${cfg.color},#0F2D4A)`, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Start {cfg.label} Today →</button>
          </Card>
        ) : (
          <div>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
                <Ttl style={{ margin: 0 }}>Today's Checklist</Ttl>
                <span style={{ color: cfg.color, fontSize: 12, fontWeight: 700 }}>{done}/{cfg.targets.length}</span>
              </div>
              {cfg.targets.map((t, i) => (
                <button key={t.id} onClick={() => toggle(t.id)} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 0", borderBottom: i < cfg.targets.length - 1 ? `1px solid ${T.border}` : "none", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: `2px solid ${tc[t.id] ? cfg.color : T.border}`, background: tc[t.id] ? cfg.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                    {tc[t.id] && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 15 }}>{t.i}</span>
                  <span style={{ color: tc[t.id] ? T.light : T.navy, fontSize: 13, textDecoration: tc[t.id] ? "line-through" : "none" }}>{t.l}</span>
                </button>
              ))}
              <div style={{ marginTop: 13, background: T.border, borderRadius: 50, height: 8 }}>
                <div style={{ background: `linear-gradient(90deg,${cfg.color},${T.teal})`, borderRadius: 50, height: "100%", width: `${(done / cfg.targets.length) * 100}%`, transition: "width 0.3s" }} />
              </div>
              {done === cfg.targets.length && <div style={{ marginTop: 11, padding: "9px 13px", background: T.sageXL, borderRadius: 9, textAlign: "center" }}><p style={{ color: T.sage, fontSize: 13, fontWeight: 700, margin: 0 }}>🌿 Perfect day! Your autopilot is building.</p></div>}
              <button onClick={() => setStarted(false)} style={{ width: "100%", marginTop: 12, padding: 10, borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.light, fontSize: 12, cursor: "pointer" }}>← Back to programme info</button>
            </Card>
            <Card style={{ background: T.surfaceAlt }}>
              <Ttl>💡 Book Tips · {cfg.label}</Ttl>
              {cfg.tips.map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: 11, padding: "8px 0", borderBottom: i < cfg.tips.length - 1 ? `1px solid ${T.border}` : "none" }}>
                  <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1.4 }}>{tip.i}</span>
                  <p style={{ color: T.mid, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{tip.t}</p>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ── COACH ─────────────────────────────────────────────────────────────────────
function CoachTab({ plan, gender }) {
  const [msgs, setMsgs] = useCoachMessages([{ role: "assistant", text: `Hello! 🌿 I'm your AI Coach, trained on all 13 chapters of Dr. Asif Mushtaq's book.\n\nYou're on the ${plan.icon} ${plan.label}'s Plan:\n• Diet target: ${plan.presetMeals.toLocaleString()} kcal/day\n• Exercise goal: 500 kcal daily 🔥\n• Total deficit: 1,000 kcal/day → ≈ 1 kg fat/week\n\n"If I can do it, you can do it too." — Dr. Mushtaq\n\nWhat would you like help with?` }]);
  const [inp, setInp] = useState(""); const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [msgs, loading]);
  const qp = ["What is the X-Point?", "How to structure my Clever Lunch?", "Tell me about skinny jabs", "I slipped — what now?", "Best exercise during fasting", "How to stay motivated?"];
  const send = async () => {
    if (!inp.trim() || loading) return;
    const u = { role: "user", text: inp.trim() }; setMsgs(m => [...m, u]); setInp(""); setLoading(true);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 900, system: `You are an inspiring AI health coach for the Dr Asif Diet app, based on Dr. Asif Mushtaq's book "Lose Weight Smarter for Life" (2nd Edition 2026). User: ${gender === "male" ? "MAN" : "WOMAN"}. Diet target: ${plan.presetMeals} kcal/day. Exercise goal: 500 kcal burned daily. Be warm, practical and concise (3–5 sentences). End with a motivational quote from the book or an encouraging question. Reference chapters naturally.`, messages: [...msgs, u].map(m => ({ role: m.role, content: m.text })) }) });
      const d = await r.json();
      setMsgs(m => [...m, { role: "assistant", text: d.content?.find(b => b.type === "text")?.text || "Please try again." }]);
    } catch { setMsgs(m => [...m, { role: "assistant", text: "Connection issue — please check your internet and try again." }]); }
    setLoading(false);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg, paddingTop: "var(--sa-top)" }}>
      <div style={{ padding: "20px 17px 7px", flexShrink: 0 }}>
        <p style={{ color: T.navy, fontSize: 22, fontWeight: 700, margin: 0 }}>AI Coach ✨</p>
        <p style={{ color: T.light, fontSize: 12, marginTop: 3 }}>All 13 chapters · {plan.icon} {plan.label} · {plan.presetMeals} kcal</p>
      </div>
      <div ref={ref} style={{ flex: 1, overflowY: "auto", padding: "0 17px" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 11 }}>
            {m.role === "assistant" && <div style={{ width: 31, height: 31, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg,${T.teal},${T.navyMid})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginRight: 8, marginTop: 2 }}>💚</div>}
            <div style={{ maxWidth: "80%", padding: "11px 14px", borderRadius: m.role === "user" ? "17px 17px 4px 17px" : "17px 17px 17px 4px", background: m.role === "user" ? `linear-gradient(135deg,${T.teal},${T.navyMid})` : T.surface, color: m.role === "user" ? "#fff" : T.navy, fontSize: 13, lineHeight: 1.7, boxShadow: "0 2px 10px rgba(15,45,74,0.07)", border: m.role === "assistant" ? `1px solid ${T.border}` : "none", whiteSpace: "pre-line" }}>{m.text}</div>
          </div>
        ))}
        {loading && <div style={{ display: "flex", marginBottom: 11 }}><div style={{ width: 31, height: 31, borderRadius: "50%", background: `linear-gradient(135deg,${T.teal},${T.navyMid})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginRight: 8 }}>💚</div><div style={{ padding: "11px 14px", borderRadius: "17px 17px 17px 4px", background: T.surface, border: `1px solid ${T.border}`, color: T.light, fontSize: 13, fontStyle: "italic" }}>Reading Dr. Mushtaq's book... 📖</div></div>}
        <div style={{ height: 16 }} />
      </div>
      <div style={{ padding: "5px 17px 3px", display: "flex", gap: 6, overflowX: "auto", flexShrink: 0 }}>
        {qp.map((q, i) => <button key={i} onClick={() => setInp(q)} style={{ padding: "5px 11px", borderRadius: 50, border: `1px solid ${T.border}`, background: T.surface, color: T.mid, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{q}</button>)}
      </div>
      <div style={{ padding: "5px 17px 16px", display: "flex", gap: 8, flexShrink: 0 }}>
        <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask anything about your plan..." style={{ flex: 1, padding: "11px 15px", borderRadius: 50, border: `1.5px solid ${T.border}`, fontSize: 13, background: T.surface, color: T.navy, outline: "none" }} />
        <button onClick={send} disabled={loading} style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: loading ? T.light : `linear-gradient(135deg,${T.teal},${T.navyMid})`, color: "#fff", fontSize: 17, cursor: loading ? "default" : "pointer", flexShrink: 0 }}>→</button>
      </div>
    </div>
  );
}

// ── MORE TABS ─────────────────────────────────────────────────────────────────
function TrackTab({ plan, gender }) {
  const [entries, setEntries] = useTrackEntries([]);
  const [w, setW] = useState(""); const [wt, setWt] = useState(""); const [bf, setBf] = useState("");
  const add = () => { if (!w && !wt) return; setEntries(p => [{ date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }), w, wt, bf }, ...p].slice(0, 10)); setW(""); setWt(""); setBf(""); };
  return (
    <div style={{ height: "100%", overflowY: "auto", background: T.bg, padding: "22px 15px 90px", paddingTop: "var(--sa-top)" }}>
      <div style={{ paddingTop: "22px", marginBottom: 18 }}>
        <p style={{ color: T.navy, fontSize: 22, fontWeight: 700, margin: "0 0 3px" }}>Track Progress 📊</p>
        <p style={{ color: T.light, fontSize: 12, margin: "0 0 14px" }}>Weekly weigh-ins — same time, same conditions.</p>
      </div>
      <Card style={{ background: T.tealXL, border: `1px solid ${T.teal}20` }}>
        <Ttl>🎯 Your Targets</Ttl>
        {[["BMI target", plan.bmi.range], ["Waist target", plan.waist.target], ["Body fat (ripped)", plan.bodyFat.ripped], ["Exercise goal", "500 kcal daily 🔥"]].map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
            <span style={{ color: T.mid, fontSize: 13 }}>{l}</span>
            <span style={{ color: T.teal, fontSize: 13, fontWeight: 700 }}>{v}</span>
          </div>
        ))}
      </Card>
      <Card>
        <Ttl>Log Measurements</Ttl>
        {[["Weight (kg)", w, setW, "e.g. 85"], ["Waist (cm)", wt, setWt, gender === "male" ? "Target < 94" : "Target < 80"], ["Body fat %", bf, setBf, gender === "male" ? "Target < 15%" : "Target < 20%"]].map(([l, v, s, p]) => (
          <div key={l} style={{ marginBottom: 10 }}>
            <label style={{ display: "block", color: T.navy, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{l}</label>
            <input type="number" value={v} onChange={e => s(e.target.value)} placeholder={p} style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 13, background: T.surfaceAlt, color: T.navy, outline: "none", boxSizing: "border-box" }} />
          </div>
        ))}
        <button onClick={add} style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: `linear-gradient(135deg,${T.teal},${T.navyMid})`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save Measurements</button>
      </Card>
      {entries.length > 0 && <Card>
        <Ttl>History</Ttl>
        {entries.map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < entries.length - 1 ? `1px solid ${T.border}` : "none" }}>
            <span style={{ color: T.light, fontSize: 12 }}>{e.date}</span>
            <div style={{ display: "flex", gap: 9 }}>
              {e.w && <span style={{ color: T.teal, fontSize: 12, fontWeight: 700 }}>{e.w}kg</span>}
              {e.wt && <span style={{ color: T.sage, fontSize: 12, fontWeight: 700 }}>{e.wt}cm</span>}
              {e.bf && <span style={{ color: T.gold, fontSize: 12, fontWeight: 700 }}>{e.bf}%</span>}
            </div>
          </div>
        ))}
      </Card>}
    </div>
  );
}

function MindTab() {
  const affs = ["If Dr. Mushtaq can go from one-pack to six-pack at 46 after a stroke — I can do this.", "The body will take its time. I will not judge myself in the blind period.", "What is easy to do is also easy not to do. I choose to do it.", "My X-Point is coming. Every disciplined day brings it closer.", "Hunger during fasting is good news — my body is burning fat reserves.", "I am not on a diet. I am building a lifestyle.", "Work smarter, not harder.", "This is not a 100-metre race. It's a marathon.", "Self-love is a sign of gratitude.", "Once my autopilot switches on, staying fit will feel effortless."];
  const [ai, setAi] = useState(new Date().getDate() % 10); const [ci, setCi] = useState(false); const [exp, setExp] = useState(null);
  const tools = [{ i: "❓", t: "1-Question Rule", c: T.teal, w: "After any slip", h: "Ask: 'What are my options now?' Shifts mind from problem to solution instantly. Don't dwell — move forward." },
  { i: "🤔", t: "2-Question Rule", c: T.sage, w: "Before eating outside your plan", h: "'Do I need this?' — pause. 'Do I REALLY need this?' — longer pause. The honest answer is usually no." },
  { i: "📅", t: "3-Week Challenge", c: T.gold, w: "From Day 1", h: "Habits form after 21 days of consistent repetition. Your subconscious autopilot switches on after 3 weeks." }];
  return (
    <div style={{ height: "100%", overflowY: "auto", background: T.bg, paddingBottom: 90 }}>
      <div style={{ background: "linear-gradient(135deg,#2C1654,#6B3FA0)", padding: "28px 18px 22px", marginBottom: 12, paddingTop: "var(--sa-top)" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 4px" }}>Chapter 6 & 10</p>
        <p style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "0 0 14px" }}>The Mind 🧠</p>
        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.14)" }}>
          <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, margin: "0 0 5px", letterSpacing: 1.5, textTransform: "uppercase" }}>Today's Affirmation</p>
          <p style={{ color: "#fff", fontSize: 14, fontFamily: "Georgia,serif", fontStyle: "italic", margin: "0 0 11px", lineHeight: 1.6 }}>"{affs[ai]}"</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setAi(i => (i + 1) % affs.length)} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 50, padding: "5px 13px", color: "#fff", fontSize: 12, cursor: "pointer" }}>Next →</button>
            {!ci ? <button onClick={() => setCi(true)} style={{ background: "rgba(255,255,255,0.9)", border: "none", borderRadius: 50, padding: "5px 13px", color: "#2C1654", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✓ I affirm this</button> : <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, paddingTop: 7 }}>✓ Checked in today 🌿</span>}
          </div>
        </div>
      </div>
      <div style={{ padding: "0 15px" }}>
        <Ttl>Psychology Tools · Chapter 6</Ttl>
        {tools.map((t, i) => (
          <div key={i} onClick={() => setExp(exp === i ? null : i)} style={{ background: T.surface, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1.5px solid ${exp === i ? t.c : T.border}`, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${t.c}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{t.i}</div>
              <div style={{ flex: 1 }}><p style={{ color: T.navy, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{t.t}</p><p style={{ color: t.c, fontSize: 12, margin: 0 }}>{t.w}</p></div>
              <span style={{ color: T.light, fontSize: 14 }}>{exp === i ? "↑" : "↓"}</span>
            </div>
            {exp === i && <p style={{ color: T.mid, fontSize: 13, lineHeight: 1.7, margin: "11px 0 0", paddingTop: 11, borderTop: `1px solid ${T.border}` }}>{t.h}</p>}
          </div>
        ))}
        <Card>
          <Ttl>Mind Types · Chapter 6</Ttl>
          {[["PPM ☀️", "Positively Programmed", "Consistently disciplined. Habits deeply embedded. Protect this.", T.sage], ["MPM 🌤", "Mixed Programmed", "Does well sometimes, struggles at others. Most people. 3-week challenge reprogrammes you.", T.gold], ["NPM 🌧", "Negatively Programmed", "Consistently struggles — but rare. Most 'NPM' people are actually MPM.", T.teal]].map(([l, n, d, c]) => (
            <div key={l} style={{ padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 3 }}><span style={{ background: `${c}15`, color: c, fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 50 }}>{l}</span><span style={{ color: T.navy, fontSize: 13, fontWeight: 600 }}>{n}</span></div>
              <p style={{ color: T.mid, fontSize: 12, margin: 0, lineHeight: 1.5, paddingLeft: 4 }}>{d}</p>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function LearnTab() {
  const [exp, setExp] = useState(null);
  const chs = [
    { n: 1, e: "🏥", c: T.teal, t: "My Story", s: "Stroke at 46, BMI 34, 104 kg. Six-pack naturally in under 6 months. Three steps: walk fasted, delay breakfast, wait." },
    { n: 2, e: "⚖️", c: T.sage, t: "Losing Weight", s: "X Triangle (Mind+Diet+Exercise). X-Point Theory — blind period A→X, smooth X→Y. Scotland analogy. BMI & waist targets." },
    { n: 3, e: "🥗", c: T.gold, t: "The ABS-X Diet", s: "Balanced & Sustainable. NOT keto. Intelligent Breakfast (no carbs) · Clever Lunch (all macros, your favourites) · Light Supper. Men 1,600 kcal. Women 1,200 kcal." },
    { n: 4, e: "💉", c: "#8B3A62", t: "Skinny Jabs — The Full Story", s: "NEW 2nd Edition. Semaglutide (Wegovy), Mounjaro. Weight returns ~18 months after stopping. 25–40% loss is muscle. MHRA 2026 pancreatitis alert." },
    { n: 5, e: "🚶", c: T.teal, t: "Exercise", s: "Moderate 110–140 bpm beats high intensity. 500 kcal daily. 75% cardio + 25% weights. Exercise during fasting for fat burn." },
    { n: 6, e: "🧠", c: "#6B3FA0", t: "The Mind", s: "Most crucial triangle part. PPM/NPM/MPM types. 21-day challenge. 1-Question + 2-Question psychology. Autopilot after 3 weeks." },
    { n: 7, e: "🌟", c: T.teal, t: "Staying Fit", s: "Balance not deficit. Weekly weigh-ins. Recalculate as you lose. 2/3 weights + 1/3 cardio, 30–45 mins daily." },
    { n: 8, e: "💪", c: T.sage, t: "Getting Ripped", s: "Body composition not scales. Men <15% body fat. Women <20%. Protein 1–1.5g/kg. Body composition machine." },
    { n: 9, e: "✨", c: T.gold, t: "Getting Toned", s: "Muscle Yoga: lighter weight + full contraction + hold 5–10 secs + repeat. BDNF release. No hanging skin if done sustainably." },
    { n: 10, e: "☀️", c: T.teal, t: "Stay Positive", s: "1-Question rule. Sleep 8 hours. Self-love as gratitude. Use energy on what matters. Switch off and recharge." },
    { n: 11, e: "🤝", c: T.sage, t: "Helping Others", s: "'We get fit and unfit together.' Lead by example. Kids learn by watching. Getting fit is the best gift." },
    { n: 12, e: "❓", c: T.navyMid, t: "FAQs", s: "Delay breakfast — not the most important meal. 1hr brisk walk = 500 kcal. Regular 30–45 min beats occasional 2 hours." },
    { n: 13, e: "💡", c: T.gold, t: "Simple Tips", s: "Water before meals. Black coffee before exercise. Hunger during fasting = fat burning. Buy target outfit and hang it visibly." },
  ];
  return (
    <div style={{ height: "100%", overflowY: "auto", background: T.bg, padding: "22px 15px 90px", paddingTop: "var(--sa-top)" }}>
      <div style={{ paddingTop: "22px", marginBottom: 18 }}>
        <p style={{ color: T.navy, fontSize: 22, fontWeight: 700, margin: "0 0 14px" }}>The Book — 13 Chapters 📖</p>
      </div>
      {chs.map(ch => (
        <div key={ch.n} onClick={() => setExp(exp === ch.n ? null : ch.n)} style={{ background: T.surface, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${T.border}`, cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 33, height: 33, borderRadius: 8, background: `${ch.c}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{ch.e}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span style={{ background: `${ch.c}15`, color: ch.c, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 50 }}>Ch.{ch.n}</span>
                {ch.n === 4 && <span style={{ background: "#8B3A6215", color: "#8B3A62", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 50 }}>NEW</span>}
              </div>
              <p style={{ color: T.navy, fontSize: 13, fontWeight: 700, margin: 0 }}>{ch.t}</p>
            </div>
            <span style={{ color: T.light, fontSize: 14 }}>{exp === ch.n ? "↑" : "↓"}</span>
          </div>
          {exp === ch.n && <p style={{ color: T.mid, fontSize: 12, lineHeight: 1.65, margin: "10px 0 0", paddingTop: 10, borderTop: `1px solid ${T.border}` }}>{ch.s}</p>}
        </div>
      ))}
    </div>
  );
}

function CommunityTab() {
  const reviews = [
    { name: "Patricia Sharman", cred: "NHS England", av: "P", c: T.teal, out: "Lost 16 kg in 3 months", text: "I am 62 years old, and I lost an impressive 16 kg in just three months. Simple lifestyle changes significantly improved my overall well-being.", lk: 214 },
    { name: "Dr Kofi Dapaah", cred: "NHS England", av: "K", c: T.navyMid, out: "Lost 10 kg", text: "I lost 10 kg following Dr Asif's diet book. Weight loss seems sustainable and I recommend his book to all looking to improve their health.", lk: 178 },
    { name: "Dr Barrie Stevenson", cred: "NHS England", av: "B", c: T.sage, out: "Life-changing", text: "Life changing! Clear and simple system for losing weight and building muscle. Built on a strong scientific foundation.", lk: 195 },
    { name: "Dr Simon Williams", cred: "General Practitioner", av: "S", c: T.gold, out: "Sustainable lifestyle", text: "Asif offers guidance and hope — not just weight loss but peace of mind. This book offers a sustainable lifestyle choice.", lk: 163 },
  ];
  const [liked, setLiked] = useCommunityLiked(reviews.map(() => false));
  const [lks, setLks] = useState(reviews.map(r => r.lk));
  return (
    <div style={{ height: "100%", overflowY: "auto", background: T.bg, padding: "22px 15px 90px", paddingTop: "var(--sa-top)" }}>
      <div style={{ paddingTop: "24px", marginBottom: 20 }}>
        <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", letterSpacing: 2, textTransform: "uppercase", margin: "0 0 4px" }}>Chapter 11</p>
        <p style={{ color: T.navy, fontSize: 26, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Community</p>
      </div>
      <p style={{ color: T.mid, fontSize: 13, fontStyle: "italic", margin: "0 0 14px" }}>"We get fit and unfit together." — Chapter 11</p>
      <div style={{ display: "flex", gap: 9, background: T.tealXL, borderRadius: 11, padding: "9px 12px", marginBottom: 14, border: `1px solid ${T.teal}20` }}>
        <span style={{ fontSize: 15 }}>✅</span>
        <p style={{ color: T.mid, fontSize: 12, lineHeight: 1.6, margin: 0 }}>All reviews are <strong style={{ color: T.navy }}>real and verified</strong> — published on the book cover and interior.</p>
      </div>
      {reviews.map((r, i) => (
        <div key={i} style={{ background: T.surface, borderRadius: 14, padding: "14px 16px", marginBottom: 10, boxShadow: "0 1px 4px rgba(15,45,74,0.06)", border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${r.c},${r.c}88)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>{r.av}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ color: T.navy, fontSize: 13, fontWeight: 700 }}>{r.name}</span><span style={{ background: T.tealXL, color: T.teal, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 50 }}>✓ VERIFIED</span></div>
              <span style={{ color: T.light, fontSize: 11 }}>{r.cred}</span>
            </div>
          </div>
          <div style={{ background: `${r.c}12`, border: `1px solid ${r.c}28`, borderRadius: 7, padding: "4px 9px", marginBottom: 8, display: "inline-block" }}><span style={{ color: r.c, fontSize: 11, fontWeight: 700 }}>🏆 {r.out}</span></div>
          <p style={{ color: T.mid, fontSize: 13, lineHeight: 1.7, margin: "0 0 9px", fontStyle: "italic" }}>"{r.text}"</p>
          <button onClick={() => { const nl = [...liked]; nl[i] = !nl[i]; setLiked(nl); const lk = [...lks]; lk[i] += nl[i] ? 1 : -1; setLks(lk); }} style={{ background: liked[i] ? `${T.teal}12` : "none", border: liked[i] ? `1px solid ${T.teal}28` : "none", borderRadius: 50, padding: "4px 11px", cursor: "pointer", color: liked[i] ? T.teal : T.light, fontSize: 12, fontWeight: liked[i] ? 700 : 400 }}>{liked[i] ? "💙" : "🤍"} {lks[i]}</button>
        </div>
      ))}
    </div>
  );
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function SettingsPanel({ gender, setGender, userProfile, setUserProfile, onClose, onDeleteAll }) {
  const plan = PLANS[gender];
  const [sc, setSc] = useState(false); const [conf, setConf] = useState(null); const [toast, setToast] = useState("");
  const [age, setAge] = useState(""); const [wt, setWt] = useState(""); const [ht, setHt] = useState(""); const [act, setAct] = useState("1.375"); const [res, setRes] = useState(null);
  const showT = m => { setToast(m); setTimeout(() => setToast(""), 2600); };
  const inp = { width: "100%", padding: "11px 12px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.25)", fontSize: 13, background: "rgba(255,255,255,0.12)", color: "#fff", outline: "none", boxSizing: "border-box" };
  const doCalc = () => { const a = parseFloat(age), w = parseFloat(wt), h = parseFloat(ht); if (!a || !w || !h || a < 16 || w < 30 || h < 100) { return; } setRes(calcProfile(gender, a, w, h, act)); };
  return (
    <div style={{ padding: "14px 16px 80px", paddingTop: "14px" }}>
      <ToastMsg msg={toast} />
      <p style={{ color: T.light, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Your Plan</p>
      <Card style={{ background: T.tealXL, border: `1.5px solid ${T.teal}30` }}>
        <p style={{ color: T.teal, fontSize: 16, fontWeight: 700, margin: "0 0 3px" }}>{plan.icon} {plan.label}'s Plan <span style={{ background: userProfile ? T.teal : T.navyMid, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 50, marginLeft: 4 }}>{userProfile ? "✦ Personalised" : "Standard"}</span></p>
        <p style={{ color: T.mid, fontSize: 13, margin: "0 0 12px" }}>{userProfile ? userProfile.diet.toLocaleString() : plan.presetMeals.toLocaleString()} kcal daily target</p>
        {userProfile && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 7, marginBottom: 12 }}>
          {[["Age", `${userProfile.age}y`], ["Weight", `${userProfile.weight}kg`], ["Height", `${userProfile.height}cm`], ["BMI", userProfile.bmi]].map(([l, v]) => (
            <div key={l} style={{ background: T.surface, borderRadius: 8, padding: "7px 6px", textAlign: "center" }}><p style={{ color: T.light, fontSize: 9, margin: "0 0 2px" }}>{l}</p><p style={{ color: T.navy, fontSize: 11, fontWeight: 700, margin: 0 }}>{v}</p></div>
          ))}
        </div>}
        {/* Breakdown */}
        <div style={{ background: T.surface, borderRadius: 11, padding: "10px 12px", marginBottom: 12 }}>
          <p style={{ color: T.light, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 7px" }}>Daily breakdown</p>
          {[["Breakfast", `${userProfile ? Math.round(userProfile.diet * .25) : plan.meals[0].kcal} kcal`, T.teal], ["Clever Lunch", `${userProfile ? Math.round(userProfile.diet * .50) : plan.meals[1].kcal} kcal`, T.navyMid], ["Supper", `${userProfile ? userProfile.diet - Math.round(userProfile.diet * .25) - Math.round(userProfile.diet * .50) : plan.meals[2].kcal} kcal`, T.sage], ["Exercise goal", "500 kcal 🔥", T.teal]].map(([l, v, c]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ color: T.mid, fontSize: 12 }}>{l}</span>
              <span style={{ color: c, fontSize: 13, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
          {userProfile && <p style={{ color: T.teal, fontSize: 11, margin: "8px 0 0", lineHeight: 1.5 }}>💡 Recalculate every 5–10 kg lost — your maintenance calories decrease as you get lighter.</p>}
        </div>
        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button onClick={() => { setSc(s => !s); setConf(null); setRes(null); }} style={{ width: "100%", padding: "12px 0", borderRadius: 11, border: "none", background: `linear-gradient(135deg,${T.teal},${T.navyMid})`, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {sc ? "↑ Close calculator" : userProfile ? "🔄 Recalculate my plan" : "✨ Calculate personalised plan"}
          </button>

          {userProfile && <>
            {!sc && <button onClick={() => setConf("std")} style={{ width: "100%", padding: "11px 0", borderRadius: 11, border: `1.5px solid ${T.border}`, background: T.surface, color: T.mid, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Switch to standard {plan.label}'s plan ({plan.presetMeals.toLocaleString()} kcal)</button>}
            {conf === "std" && <div style={{ background: T.surfaceAlt, borderRadius: 11, padding: 13, border: `1px solid ${T.border}` }}>
              <p style={{ color: T.navy, fontSize: 13, fontWeight: 600, margin: "0 0 7px", textAlign: "center" }}>Switch to standard plan?</p>
              <div style={{ display: "flex", gap: 7 }}>
                <button onClick={() => setConf(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: `1px solid ${T.border}`, background: T.surface, color: T.mid, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => { setUserProfile(null); setConf(null); showT(`✓ Standard plan · Tap Done to continue`); }} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none", background: T.navy, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Yes, switch</button>
              </div>
            </div>}
          </>
          }

          {!sc && <button onClick={() => setConf("sw")} style={{ width: "100%", padding: "11px 0", borderRadius: 11, border: `1.5px solid ${T.border}`, background: T.surface, color: T.mid, fontSize: 13, cursor: "pointer" }}>Switch Men's / Women's plan</button>}
          {conf === "sw" && <div style={{ background: T.alertL, borderRadius: 11, padding: 13, border: `1px solid ${T.alert}25` }}>
            <p style={{ color: T.navy, fontSize: 13, fontWeight: 600, margin: "0 0 7px", textAlign: "center" }}>Switch plan?</p>
            <p style={{ color: T.mid, fontSize: 12, margin: "0 0 11px", textAlign: "center", lineHeight: 1.5 }}>Takes you back to plan selection. Your progress and streak are kept.</p>
            <div style={{ display: "flex", gap: 7 }}><button onClick={() => setConf(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: `1px solid ${T.border}`, background: T.surface, color: T.mid, fontSize: 13, cursor: "pointer" }}>Cancel</button><button onClick={() => { setUserProfile(null); setGender(null); onClose(); }} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none", background: T.alert, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Yes</button></div>
          </div>}

          {/* Inline calculator */}
          {sc && <div style={{ padding: 14, background: "linear-gradient(160deg,#0F2D4A,#1A7A6E)", borderRadius: 12, marginTop: 4 }}>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, textAlign: "center", margin: "0 0 12px" }}>NHS Mifflin-St Jeor method</p>
            {!res ? (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 9 }}>
                  {[["Age", age, setAge, "e.g. 42"], ["Weight kg", wt, setWt, "e.g. 85"]].map(([l, v, s, p]) => (<div key={l}><label style={{ display: "block", color: "rgba(255,255,255,0.55)", fontSize: 11, marginBottom: 4 }}>{l}</label><input type="number" value={v} onChange={e => s(e.target.value)} placeholder={p} style={inp} /></div>))}
                </div>
                <div style={{ marginBottom: 12 }}><label style={{ display: "block", color: "rgba(255,255,255,0.55)", fontSize: 11, marginBottom: 4 }}>Height (cm)</label><input type="number" value={ht} onChange={e => setHt(e.target.value)} placeholder="e.g. 175" style={inp} /></div>
                <button onClick={doCalc} style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: "#fff", color: T.navy, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 7 }}>Calculate</button>
                <button onClick={() => { setUserProfile(null); setSc(false); showT(`✓ Standard plan · Tap Done`); }} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}>Use standard plan</button>
              </div>
            ) : (
              <div>
                <p style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: "0 0 5px" }}>New target: {res.diet.toLocaleString()} kcal/day</p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: "0 0 12px" }}>BMI: {res.bmi} · {res.bmiLabel}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setRes(null)} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.25)", background: "transparent", color: "rgba(255,255,255,0.7)", fontSize: 13, cursor: "pointer" }}>← Redo</button>
                  <button onClick={() => { setUserProfile(res); setSc(false); setRes(null); showT(`✓ Plan updated · ${res.diet.toLocaleString()} kcal · Tap Done`); }} style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", background: "#fff", color: T.navy, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save Plan →</button>
                </div>
              </div>
            )}
          </div>}
        </div>
      </Card>
      <Card>
        <Ttl>About</Ttl>
        {[["Book", "Lose Weight Smarter for Life"], ["Author", "Dr. Asif Mushtaq"], ["Method", "ABS-X Diet · X-Point Theory"], ["Edition", "2nd Edition · 2026"], ["App", "v2.0.0"]].map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
            <span style={{ color: T.light, fontSize: 12 }}>{l}</span>
            <span style={{ color: T.navy, fontSize: 12, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </Card>
      <Card style={{ background: T.goldXL, border: `1px solid ${T.border}` }}>
        <p style={{ color: T.navy, fontSize: 11, fontWeight: 700, margin: "0 0 6px" }}>⚕️ Medical Disclaimer</p>
        <p style={{ color: T.mid, fontSize: 12, lineHeight: 1.65, margin: "0 0 7px" }}>For general wellness guidance only — not a substitute for professional medical advice. Always consult your GP before significant health changes.</p>
        <p style={{ color: T.light, fontSize: 11, margin: 0 }}>© 2026 Dr. Asif Mushtaq · All rights reserved</p>
      </Card>
      {/* Delete My Data */}
      <Card>
        <Ttl>Data</Ttl>
        {conf !== "del" ? (
          <button onClick={() => setConf("del")} style={{ width: "100%", padding: "11px 0", borderRadius: 11, border: `1.5px solid ${T.alert}`, background: T.surface, color: T.alert, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Delete My Data</button>
        ) : (
          <div style={{ background: T.alertL, borderRadius: 11, padding: 13, border: `1px solid ${T.alert}25` }}>
            <p style={{ color: T.navy, fontSize: 13, fontWeight: 600, margin: "0 0 7px", textAlign: "center" }}>Delete All Your Data?</p>
            <p style={{ color: T.mid, fontSize: 12, margin: "0 0 12px", textAlign: "center", lineHeight: 1.5 }}>This will permanently delete all your progress, logs, challenge records, messages, and settings. This action cannot be undone.</p>
            <div style={{ display: "flex", gap: 7 }}>
              <button onClick={() => setConf(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: `1px solid ${T.border}`, background: T.surface, color: T.mid, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { onDeleteAll(); }} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none", background: T.alert, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Yes, Delete All</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
const PT = [{ id: "home", i: "🌿", l: "Home" }, { id: "calories", i: "🍽", l: "Calories" }, { id: "food", i: "🥗", l: "Food" }, { id: "challenge", i: "🏆", l: "Challenge" }, { id: "coach", i: "✨", l: "Coach" }];
const MT = [{ id: "track", i: "📊", l: "Track" }, { id: "mind", i: "🧠", l: "Mind" }, { id: "learn", i: "📖", l: "Learn" }, { id: "community", i: "💛", l: "More" }];
const TC = { home: T.teal, calories: T.teal, food: T.sage, challenge: "#6B3FA0", coach: T.teal, track: T.navyMid, mind: "#6B3FA0", learn: T.navyMid, community: T.sage };

export default function App() {
  const [splash, setSplash] = useState(true);
  const [gender, setGender] = useGender(null);
  const [active, setActive] = useState("home");
  const [streak, setStreak] = useStreak(Array(7).fill(false));
  const [settings, setSettings] = useState(false);
  const [more, setMore] = useState(false);
  const [userProfile, setUserProfile] = useUserProfile(null);

  const base = gender ? PLANS[gender] : null;
  const plan = base && userProfile ? {
    ...base,
    presetMeals: userProfile.diet,
    personalised: true,
    bmiValue: userProfile.bmi,
    meals: [
      { ...base.meals[0], kcal: Math.round(userProfile.diet * .25) },
      { ...base.meals[1], kcal: Math.round(userProfile.diet * .50) },
      { ...base.meals[2], kcal: userProfile.diet - Math.round(userProfile.diet * .25) - Math.round(userProfile.diet * .50) },
    ],
  } : base;

  if (splash) return <div style={{ width: "100%", height: "100vh", overflow: "hidden" }}><Splash onDone={() => setSplash(false)} /></div>;
  if (!gender) return <div style={{ width: "100%", height: "100vh", overflowY: "auto" }}><Onboarding onSelect={(g, p) => { setGender(g); if (p) setUserProfile(p); setActive("home"); }} /></div>;

  const render = () => {
    switch (active) {
      case "home": return <HomeTab plan={plan} gender={gender} streakDays={streak} setStreakDays={setStreak} setShowSettings={setSettings} />;
      case "calories": return <CaloriesTab plan={plan} gender={gender} />;
      case "food": return <FoodTab plan={plan} gender={gender} />;
      case "challenge": return <ChallengeTab plan={plan} gender={gender} />;
      case "coach": return <CoachTab plan={plan} gender={gender} />;
      case "track": return <TrackTab plan={plan} gender={gender} />;
      case "mind": return <MindTab />;
      case "learn": return <LearnTab />;
      case "community": return <CommunityTab />;
      default: return null;
    }
  };

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: T.bg, position: "relative", overflow: "hidden" }}>
      {/* Gear icon */}
      <div style={{ position: "absolute", right: 12, top: "var(--sa-top)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36 }}>
        <button onClick={() => { setSettings(true); setMore(false); }} style={{ background: "rgba(255,255,255,0.95)", border: `1px solid ${T.border}`, borderRadius: 50, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: T.mid, cursor: "pointer", boxShadow: "0 2px 8px rgba(15,45,74,0.08)" }}>⚙</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>{render()}</div>

      {/* More drawer */}
      {more && (
        <>
          <div onClick={() => setMore(false)} style={{ position: "absolute", inset: 0, zIndex: 98, background: "rgba(15,45,74,0.42)", backdropFilter: "blur(3px)" }} />
          <div style={{ left: 0, right: 0, zIndex: 99, background: "#fff", borderRadius: "22px 22px 0 0", borderTop: `1px solid ${T.border}`, padding: "13px 18px 20px", boxShadow: "0 -6px 28px rgba(15,45,74,0.14)" }}>
            <div style={{ width: 38, height: 4, borderRadius: 99, background: T.border, margin: "0 auto 14px" }} />
            <p style={{ color: T.light, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 11px" }}>More</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              {MT.map(t => {
                const ia = active === t.id; const ac = TC[t.id] || T.teal; return (
                  <button key={t.id} onClick={() => { setActive(t.id); setMore(false); }} style={{ display: "flex", alignItems: "center", gap: 10, border: `1.5px solid ${ia ? ac : T.border}`, background: ia ? `${ac}10` : T.surfaceAlt, borderRadius: 13, padding: "13px 14px", cursor: "pointer", transition: "all 0.15s" }}>
                    <span style={{ fontSize: 20 }}>{t.i}</span>
                    <span style={{ fontSize: 13, color: ia ? ac : T.mid, fontWeight: ia ? 700 : 500 }}>{t.l}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}


      {/* Settings overlay — slides up, tabs ALWAYS visible */}
      {settings && (
        <>
          <div onClick={() => setSettings(false)} style={{ position: "absolute", inset: 0, zIndex: 98, background: "rgba(15,45,74,0.42)", backdropFilter: "blur(3px)" }} />
          <div style={{ left: 0, right: 0, zIndex: 99, background: T.surface, borderRadius: "24px 24px 0 0", borderTop: `1px solid ${T.border}`, boxShadow: "0 -8px 36px rgba(15,45,74,0.18)", maxHeight: "calc(100vh - var(--sa-top, 0px) - 36px - var(--sa-bottom, 0px) - 58px - 10px)", display: "flex", flexDirection: "column" }}>
            <div style={{ flexShrink: 0, padding: "12px 18px 0" }}>
              <div style={{ width: 38, height: 4, borderRadius: 99, background: T.border, margin: "0 auto 12px" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <p style={{ color: T.navy, fontSize: 18, fontWeight: 700, margin: 0 }}>Settings</p>
                <button onClick={() => setSettings(false)} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 50, padding: "7px 16px", fontSize: 13, color: T.mid, cursor: "pointer", fontWeight: 600 }}>Done ✓</button>
              </div>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              <SettingsPanel gender={gender} setGender={setGender} userProfile={userProfile} setUserProfile={setUserProfile} onClose={() => setSettings(false)} onDeleteAll={() => { StorageService.clearAll(); setStreak(Array(7).fill(false)); setGender(null); setUserProfile(null); setSettings(false); }} />
            </div>
          </div>
        </>
      )}

      {/* Bottom nav — always visible */}
      <div style={{ background: "rgba(255,255,255,0.98)", backdropFilter: "blur(24px)", borderTop: `1px solid ${T.border}`, padding: "5px 0", flexShrink: 0, zIndex: 100, paddingBottom: "var(--sa-bottom)" }}>
        <div style={{ display: "flex", padding: "0 3px" }}>
          {PT.map(t => {
            const ia = active === t.id; const ac = TC[t.id] || T.teal; return (
              <button key={t.id} onClick={() => { setActive(t.id); setMore(false); }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, border: "none", background: "transparent", cursor: "pointer", padding: "4px 1px", minWidth: 0 }}>
                <div style={{ width: 42, height: 27, borderRadius: 9, background: ia ? `${ac}18` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, transition: "background 0.2s" }}>{t.i}</div>
                <span style={{ fontSize: 10, color: ia ? ac : T.light, fontWeight: ia ? 700 : 400, lineHeight: 1.2, whiteSpace: "nowrap" }}>{t.l}</span>
                {ia && <div style={{ width: 16, height: 2.5, borderRadius: 99, background: ac, marginTop: 1 }} />}
              </button>
            );
          })}
          {/* More button */}
          {(() => {
            const mia = MT.some(t => t.id === active); return (
              <button onClick={() => { setMore(m => !m); setSettings(false); }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, border: "none", background: "transparent", cursor: "pointer", padding: "4px 1px", minWidth: 0 }}>
                <div style={{ width: 42, height: 27, borderRadius: 9, background: mia || more ? `${T.navyMid}18` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, transition: "background 0.2s", letterSpacing: 1 }}>{more ? "✕" : "•••"}</div>
                <span style={{ fontSize: 10, color: mia || more ? T.navyMid : T.light, fontWeight: mia ? 700 : 400, lineHeight: 1.2 }}>More</span>
                {mia && <div style={{ width: 16, height: 2.5, borderRadius: 99, background: T.navyMid, marginTop: 1 }} />}
              </button>
            );
          })()}
        </div>
      </div>


    </div>
  );
}
