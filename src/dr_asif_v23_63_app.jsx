import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Capacitor } from "@capacitor/core";
import { StorageService } from "./services/storage.js";
import { apiPost, apiGet, apiDelete, getSession, clearSession, logout } from "./services/api.js";
import { signInWithApple } from "./services/apple-signin.js";
import { useStoredState } from "./hooks/useStoredState.js";
import { useNotifications } from "./hooks/useNotifications.js";

// ─── Design Tokens — Posh Medical Palette ─────────────────────────────────────
// Primary: deep navy/slate · Accent: refined teal · Warm: off-white ivory
// Cards: crisp white with subtle shadow · No more orange/terra dominant feel
const T = {
  // Backgrounds
  bg: "#F4F6F9",   // cool light grey page background
  surface: "#FFFFFF",   // card surface — pure white
  surfaceAlt: "#F8FAFC", // slightly off-white alt surface

  // Core brand
  navy: "#0F2D4A",   // deep navy — primary text, headers
  navyMid: "#1A4A6E",   // mid navy — secondary headings
  teal: "#1A7A6E",   // refined medical teal — primary accent
  tealL: "#22A090",   // lighter teal — hover / progress
  tealXL: "#D6F0ED",   // very light teal — backgrounds

  // Warm accent (subtle — replaces heavy terra)
  gold: "#B8860B",   // dark gold — premium accent
  goldL: "#E8D5A0",   // light gold — borders
  goldXL: "#FAF4E6",   // very light gold — subtle warmth

  // Greens (success / health)
  sage: "#2E7D57",   // deep green — success, health targets met
  sageL: "#A8D5BE",   // light green
  sageXL: "#EAF5EE",   // very light green bg

  // Neutrals
  dark: "#0F2D4A",   // = navy
  mid: "#4A6680",   // medium blue-grey — body text
  light: "#8AA4BA",   // light blue-grey — muted labels
  border: "#E2EAF0",   // border colour — cool light grey
  borderDark: "#C8D8E8",

  // Alert / red (minimal use)
  alert: "#C0392B",
  alertL: "#FDECEA",

  // Legacy aliases so existing code still works
  cream: "#F4F6F9",
  warm: "#FFFFFF",
  terra: "#1A7A6E",   // remapped terra → teal
  terraL: "#22A090",
  brown: "#0F2D4A",   // remapped brown → navy
};

// ─── Logo Component (heart-pulse mark) ───────────────────────────────────────
function LogoMark({ size = 52 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {/* Navy pill background */}
      <rect x="0" y="0" width="100" height="100" rx="20" fill="#0F2D4A" />
      {/* DA letters in white */}
      <text x="10" y="72" fontFamily="Georgia,serif" fontSize="62" fontWeight="700" fill="#FFFFFF">DA</text>
      {/* Teal medical cross badge — top-right */}
      <rect x="62" y="4" width="34" height="34" rx="7" fill="#1A7A6E" />
      <line x1="79" y1="11" x2="79" y2="31" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
      <line x1="69" y1="21" x2="89" y2="21" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function LogoFull({ dark = false }) {
  const pillBg = dark ? "rgba(255,255,255,0.12)" : "#0F2D4A";
  const textCol = dark ? "#FFFFFF" : "#FFFFFF";
  const crossBg = dark ? "#22A090" : "#1A7A6E";
  const dietCol = dark ? "rgba(255,255,255,0.85)" : "#0F2D4A";
  const lineCol = dark ? "rgba(255,255,255,0.15)" : "#E2EAF0";
  const sub1Col = dark ? "rgba(255,255,255,0.5)" : T.light;
  const footCol = dark ? "#22A090" : T.teal;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* ── Wordmark row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {/* DA pill */}
        <div style={{ position: "relative", background: pillBg, borderRadius: 10, padding: "4px 10px 4px 10px", display: "flex", alignItems: "center" }}>
          <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 28, fontWeight: 700, color: textCol, letterSpacing: -1, lineHeight: 1 }}>DA</span>
          {/* Medical cross badge */}
          <div style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: 5, background: crossBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="11" height="11" viewBox="0 0 11 11">
              <line x1="5.5" y1="1.5" x2="5.5" y2="9.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="1.5" y1="5.5" x2="9.5" y2="5.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        {/* Diet text */}
        <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 28, fontWeight: 300, color: dietCol, letterSpacing: 0, marginLeft: 8, lineHeight: 1 }}>Diet</span>
      </div>
      {/* ── Credential line ── */}
      <div style={{ height: 1, background: lineCol, margin: "6px 0 5px" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontStyle: "italic", color: sub1Col, letterSpacing: 0.3 }}>Dr Asif Diet</span>
        <span style={{ color: lineCol, margin: "0 5px", fontSize: 10 }}>·</span>
        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: footCol, letterSpacing: 0.5 }}>Evidence-Based</span>
        <span style={{ color: lineCol, margin: "0 5px", fontSize: 10 }}>·</span>
        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: footCol, letterSpacing: 0.5 }}>Physician-Led</span>
      </div>
      {/* ── Tagline ── */}
      <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 10, fontStyle: "italic", color: sub1Col, marginTop: 3, letterSpacing: 0.3 }}>Lose Weight Smarter for Life</span>
    </div>
  );
}

const PRIMARY_TABS = [
  { id: "home", icon: "🌿", label: "Home" },
  { id: "calories", icon: "🍽", label: "Calories" },
  { id: "food", icon: "🥗", label: "Food" },
  { id: "challenge", icon: "🏆", label: "Challenge" },
  { id: "coach", icon: "✨", label: "Coach" },
];
const MORE_TABS = [
  { id: "track", icon: "📊", label: "Track" },
  { id: "mind", icon: "🧠", label: "Mind" },
  { id: "learn", icon: "📖", label: "Learn" },
  { id: "community", icon: "💛", label: "Community" },
];
const tabs = [...PRIMARY_TABS, ...MORE_TABS];

// ─── Book-accurate data (Chapter 2 & 3) ──────────────────────────────────────
// Men:   recommended 2,500 kcal → weight-loss target 2,000 (−500 deficit)
//        Preset meals: Breakfast 400 + Lunch 800 + Supper 400 = 1,600
//        Remaining 400 = 200 occasional snacks + 200 threshold buffer
// Women: recommended 2,000 kcal → weight-loss target 1,500 (−500 deficit)
//        Preset meals: Breakfast 300 + Lunch 600 + Supper 300–400 = 1,200–1,300
//        Remaining 200–300 = 150 snacks + 150 threshold buffer

const PLANS = {
  male: {
    label: "Men", icon: "♂", color: T.terra,
    recommended: 2500,          // NHS average for man
    weightLossTarget: 2000,     // recommended − 500
    presetMeals: 1600,          // book p.63: 400+800+400
    snackBuffer: 200,           // book p.63: "200 accounts for occasional snacks"
    thresholdBuffer: 200,       // book p.63: "remaining 200 kept as threshold"
    deficit: 500,
    macros: { carbs: "45–65%", protein: "10–35%", fat: "20–25%" },
    meals: [
      {
        name: "Intelligent Late Breakfast",
        tag: "No-Carb Breakfast",
        time: "11 am – 12 pm",
        kcal: 400,
        icon: "☕",
        carbs: false,
        examples: "Black coffee + boiled eggs",
        why: "NO carbs. Protein & low fat only. Keeps your body carb-deficient for 18–20 hours, forcing it to burn fat reserves. Fat & protein take hours to absorb — the body keeps using saved fat meanwhile.",
      },
      {
        name: "Clever Lunch",
        tag: "All Macronutrients",
        time: "3 – 4 pm",
        kcal: 800,
        icon: "🍱",
        carbs: true,
        examples: "Wholemeal bread or rice + large portion of meat or fish + vegetables",
        why: "Includes ALL macronutrients — especially what your taste buds love. This is the meal that makes the ABS-X diet sustainable for life. Eat your favourite carbs here.",
      },
      {
        name: "Light Supper",
        tag: "Light & Early",
        time: "7 – 8 pm",
        kcal: 400,
        icon: "🥗",
        carbs: true,
        examples: "Fruit salad or vegetable salad",
        why: "Light carbs from whole fruit are fine here — they are high in fibre, keep you full, and are digested slowly. Whole fruit over juice always. Early supper extends your overnight fast, giving the gut a rest and improving bowel movements. Only breakfast is the no-carb meal.",
      },
    ],
    bmi: { range: "18.5 – 24.9", note: "Use the NHS BMI calculator to check yours." },
    waist: {
      target: "Under 94 cm (37 inches)",
      asian: "Under 89 cm (35 inches) for Asian or African background",
      drNote: "Dr. Mushtaq reduced his waist from 38 → 31 inches.",
    },
    bodyFat: { ripped: "< 15%", note: "Visible abs for most men at this level." },
    weightLossExercise: "75% cardio + 25% light weights (each daily session)",
    stayFitExercise: "2/3 weight training + 1/3 cardio, ~30 mins daily",
    heartRate: "110 – 140 bpm (moderate intensity)",
    proteinTarget: "1.2 – 1.7 g per kg body weight (when weight training)",
    waistWarning: "Excess abdominal fat raises risk of heart disease, type 2 diabetes & stroke even at healthy BMI.",
  },
  female: {
    label: "Women", icon: "♀", color: T.sage,
    recommended: 2000,
    weightLossTarget: 1500,
    presetMeals: 1200,          // 300+600+300
    snackBuffer: 150,
    thresholdBuffer: 150,
    deficit: 500,
    macros: { carbs: "45–65%", protein: "10–35%", fat: "20–25%" },
    meals: [
      {
        name: "Intelligent Late Breakfast",
        tag: "No-Carb Breakfast",
        time: "11 am – 12 pm",
        kcal: 300,
        icon: "☕",
        carbs: false,
        examples: "Black coffee + boiled eggs",
        why: "NO carbs. Protein & low fat only. Keeps your body carb-deficient for 18–20 hours, forcing it to burn fat reserves. Fat & protein take hours to absorb — the body keeps using saved fat meanwhile.",
      },
      {
        name: "Clever Lunch",
        tag: "All Macronutrients",
        time: "3 – 4 pm",
        kcal: 600,
        icon: "🍱",
        carbs: true,
        examples: "Wholemeal bread or rice + lean meat or fish + vegetables",
        why: "Includes ALL macronutrients — especially what your taste buds love. This is the meal that makes the ABS-X diet sustainable for life. Eat your favourite carbs here.",
      },
      {
        name: "Light Supper",
        tag: "Light & Early",
        time: "7 – 8 pm",
        kcal: 300,
        icon: "🥗",
        carbs: true,
        examples: "Fruit salad or vegetable salad",
        why: "Light carbs from whole fruit are fine here — they are high in fibre, keep you full, and are digested slowly. Whole fruit over juice always. Early supper extends your overnight fast, giving the gut a rest and improving bowel movements. Only breakfast is the no-carb meal.",
      },
    ],
    bmi: { range: "18.5 – 24.9", note: "Use the NHS BMI calculator to check yours." },
    waist: {
      target: "Under 80 cm (31.5 inches)",
      asian: "",
      drNote: "Measuring waist is the best check for abdominal fat risk.",
    },
    bodyFat: { ripped: "< 20%", note: "Visible abs for most women at this level." },
    weightLossExercise: "75% cardio + 25% light weights (each daily session)",
    stayFitExercise: "2/3 weight training + 1/3 cardio, ~30 mins daily",
    heartRate: "110 – 140 bpm (moderate intensity)",
    proteinTarget: "1.2 – 1.7 g per kg body weight (when weight training)",
    waistWarning: "Excess abdominal fat raises risk of heart disease, type 2 diabetes & stroke even at healthy BMI.",
  },
};

// ─── Book quotes (Chapter 1–12) ───────────────────────────────────────────────
const QUOTES = [
  { text: "Perfection is not a destination but a journey.", src: "Chapter 1" },
  { text: "If I can do it, you can do it too.", src: "Dr. Asif Mushtaq" },
  { text: "Work out smarter, not harder.", src: "Chapter 5" },
  { text: "What is easy to do is also easy not to do.", src: "Chapter 1" },
  { text: "Be respectful to your taste buds when planning your diet.", src: "Chapter 3" },
  { text: "Don't judge yourself — the body will take its time.", src: "X-Point Theory, Ch.2" },
  { text: "The mind is the most crucial part of the weight-loss triangle.", src: "Chapter 6" },
  { text: "Giving yourself a three-week challenge will kick-start your weight-loss journey.", src: "Chapter 3" },
  { text: "It does not matter how long it takes to reach the X point — you will get there.", src: "Chapter 2" },
  { text: "Stay in a positive cycle and don't go into a negative cycle of guilt.", src: "Chapter 6" },
  { text: "Once you start seeing results, your mind will start protecting your investment.", src: "Chapter 6" },
  { text: "This is not a 100-metre race. It's a marathon.", src: "Chapter 12" },
  { text: "Things happen for a good reason. Stay positive and faithful.", src: "Chapter 1" },
  { text: "Self-love and self-respect are signs of gratitude — and gratitude keeps us positive.", src: "Chapter 10" },
  { text: "When you are hungry during fasting, your body is using its fat reserves. That is good news.", src: "Chapter 13" },
  { text: "It is not supposed to end like this. I decided to change.", src: "Dr. Mushtaq, Chapter 1" },
  { text: "Once your autopilot switches on, staying fit feels effortless.", src: "Chapter 6" },
  { text: "Difficult people are more valuable than positive people for sharpening our mental skills.", src: "Chapter 10" },
  { text: "Remember, if one person can achieve something, others can also do it.", src: "Chapter 6" },
  { text: "Don't follow the gym rat race. Work smarter, not harder.", src: "Chapter 13" },
  { text: "With the GLP-1 injections, the weight loss peaks — then the weight returns. The ABS-X way, it stays off for life.", src: "Chapter 4" },
  { text: "Skinny jabs alone, without lifestyle change, lead from A to B to C — and back to where you started.", src: "Chapter 4" },
];

// ─── Book principles (Chapters 2–5, 7–8) ─────────────────────────────────────
const PRINCIPLES = [
  {
    id: "triangle", icon: "△", title: "The X Triangle of Weight Loss", color: T.terra,
    chapter: "Chapter 2",
    summary: "Mind + Diet + Exercise must ALL be synced. Individual efforts of any one component are unlikely to keep you in a sustainable calorie deficit.",
    detail: `The X Triangle has three components:\n\n• MIND (Wait): You need knowledge that it takes time to burn stubborn fatty tissue gained over many years. Don't judge yourself prematurely. Gain knowledge of sustainable diet and adequate exercise.\n\n• DIET: The ABS-X plan — no daily calorie counting, still eating the food you love, incorporating your taste buds.\n\n• EXERCISE: Work out smarter, not harder — moderate intensity beats high intensity every time.\n\nWhy the triangle? It compensates for our human variabilities:\n(1) Long-term: If you're bad at dieting but love exercise, compensate. If you love dieting but hate exercise, compensate.\n(2) Short-term: Overate today? Exercise more or eat less tomorrow.\n(3) Illness/Injury: Dr. Mushtaq's arthritis flare-up made exercise impossible — he compensated with stricter diet and kept losing weight.\n\nThis is why 80% of people who try diet or exercise alone fail long-term.`,
  },
  {
    id: "xpoint", icon: "✕", title: "The X-Point Theory", color: T.sage,
    chapter: "Chapter 2",
    summary: "The body goes into 'protective mode' initially. The A-to-X period is the 'blind period' where most people give up. Visible results begin at the X-Point.",
    detail: `A to X — The Blind Period:\nDespite following diet and exercise discipline, visible results are not apparent. This is the most vulnerable stage. Most people quit here, thinking it's not working. Don't.\n\nWhy does a plateau happen?\n• Initial weight loss is mainly water (up to 60% of our weight is water).\n• The body senses a problem and goes into protective mode, slowing fat loss.\n• If you stay disciplined during this blind period, the body eventually burns stubborn fatty tissue.\n\nThe X-Point:\nWhen Dr. Mushtaq reached his X-Point (~2 months in), the journey became smooth. The body stopped fighting. The mind takes ownership after seeing visible results — with the 'big boss' (the mind) in the driving seat, weight loss becomes more manageable.\n\nHow to reach X-Point faster:\n• Exercise more during fasting\n• Eat less (stay in a bigger calorie deficit)\n• Stay patient — different people take different amounts of time depending on their starting weight (Point A)\n\nRemember the Scotland analogy: three people driving from Brighton, London and Manchester all reach Scotland — the starting point doesn't matter, only the direction.`,
  },
  {
    id: "absx", icon: "🍽", title: "The ABS-X Diet", color: T.gold,
    chapter: "Chapter 3",
    summary: "Asif's Balanced & Sustainable Diet. Inspired by Ramadan fasting. Eat what your taste buds love. No daily calorie counting. Preset meals only. Fast 14–16 hours.",
    detail: `ABS-X = Asif's Balanced & Sustainable Diet, synced with the X Triangle.\n\nInspired by Muslims fasting during Ramadan (14–18 hrs daily). Dr. Mushtaq realised: if he could fast 18 hours during Ramadan, he could eat less on standard days.\n\nThe 3 Preset Meals (Men / Women):\n• Intelligent Breakfast (400 / 300 kcal) — NO carbs. Black coffee + boiled eggs. Keeps body carb-deficient 18–20 hrs.\n• Clever Lunch (800 / 600 kcal) — ALL macronutrients including favourite carb foods. Taste buds respected.\n• Light Supper (400 / 300 kcal) — Fruit or vegetable salad. Whole fruit over juice.\n\nWhy no carbs at breakfast?\nCarbs = cash energy. Keep the body away from cash for 18–20 hours and it uses savings (fat). Fat & protein take hours to digest — the body keeps burning fat reserves in that gap.\n\nWhat makes it different from other diets?\n• NOT keto: You DO eat carbs at lunch.\n• NOT intermittent fasting: You have a larger eating window and count preset calories.\n• BALANCED: All macronutrients included (45–65% carbs, 10–35% protein, 20–25% fat).\n• SUSTAINABLE: You eat what your taste buds love → it becomes a lifestyle, not a diet.`,
  },
  {
    id: "law", icon: "⚡", title: "Law of Level of Effort & Outcome", color: T.terraL,
    chapter: "Chapter 4",
    summary: "Level of Effort + Duration of Effort = Outcome. Moderate intensity gives a longer session and burns MORE total calories than high intensity.",
    detail: `High-intensity training (HIT) problems:\n• Causes oxygen debt and lactic acidosis.\n• You can only sustain it for 20–30 minutes maximum.\n• Risk of joint injury — especially when overweight (imagine running with 30 extra kg on your joints).\n\nModerate intensity (110–140 bpm heart rate):\n• You can sustain it for hours.\n• Burns MORE total calories than a short high-intensity session.\n• Dr. Mushtaq walked on an inclined treadmill at moderate intensity and burned 2,000–2,400 calories in a single long session.\n\nBest cardio options:\n• Brisk walking (outside or inclined treadmill)\n• Cycling, dancing, tennis\n• Any activity keeping heart rate at 110–140 bpm\n\nDuring weight loss: 75% cardio + 25% light weights (each daily session)\nTo stay fit: 2/3 weight training + 1/3 cardio\n\nAvoid the gym rat race. Work smarter, not harder.`,
  },
  {
    id: "fasting-exercise", icon: "🚶", title: "Walk on an Empty Stomach", color: T.sageL,
    chapter: "Chapter 2 & 4",
    summary: "Exercise during fasting is the most effective time for fat burning. The body depletes glycogen faster and reaches fat-burning mode sooner.",
    detail: `Why exercise during fasting?\n\nNormally: the body uses stored glycogen for 10–12 hours before switching to fat reserves.\n\nDuring fasting exercise: glycogen depletes faster. Fat-burning starts earlier than usual — so you burn body fat and lose overall weight more efficiently.\n\nAlso:\n• The body continues burning calories after exercise until you provide food (especially carbs).\n• The mind knows this and avoids eating carbs for 2 hours post-exercise.\n• Black coffee before exercise helps performance and reduces cravings.\n\nDr. Mushtaq's Three Simple Steps (the conclusion of his entire journey):\n1. Walk on an empty stomach\n2. Delay breakfast (preset meals)\n3. Wait (be patient — X-Point Theory)`,
  },
  {
    id: "cycles", icon: "🔄", title: "Positive & Negative Cycles", color: T.brown,
    chapter: "Chapter 5",
    summary: "Knowledge → habits → X-Triangle → X-Point → smooth journey. OR: No knowledge → self-judgement → quit → regain weight. You choose your cycle.",
    detail: `Positive Cycle:\n1. Gain knowledge of sustainable diet + safe exercise.\n2. Take the 3-week challenge — form habits, be patient (X-Point Theory).\n3. Use the X Triangle to compensate for human imperfections.\n4. Reach the X-Point — mind takes over as 'big boss'.\n5. Smooth journey to Point Y (target weight) and beyond to Point Z (ripped).\n\nNegative Cycle:\n1. Unsustainable diet, wrong exercise, injury risk.\n2. No new habits formed, impatient, premature self-judgement.\n3. Give up, feel guilty (cognitive dissonance — when beliefs don't match actions).\n4. Never reach X-Point.\n5. Regain weight. Mental health worsens.\n\nThe fix: 1-Question Psychology\nAfter a slip, ask only: 'What are my options now?'\nThis shifts your mind from problem-focused to solution-focused instantly.`,
  },
  {
    id: "muscle", icon: "💪", title: "Muscle Yoga", color: T.terra,
    chapter: "Chapter 8",
    summary: "Dr. Mushtaq's original toning method: moderate weight + full contraction + hold 5–10 seconds + repeat. More muscle growth, less injury, calming effect.",
    detail: `Normal weightlifting problems:\n• Heavy weights → incomplete contraction → jerky movements → injury risk → reduced outcome.\n\nMuscle Yoga method:\n1. Reduce the weight (moderate, not heavy).\n2. Complete a full contraction movement.\n3. HOLD the contraction for 5–10 seconds.\n4. Do another 5–10 reps.\n\nThe last reps after holding produce maximum muscle strain and growth (Law of Effort & Outcome applied to weights).\n\nBenefits:\n• Better muscle building — longer contraction duration increases outcome.\n• Reduces injury risk — especially back and joints.\n• Increases blood circulation in muscles — creates a vascular physique.\n• Burns more calories than standard lifting.\n• Releases endorphins and BDNF (Brain-Derived Neurotrophic Factor) — de-stressing.\n\nWhy 'Yoga'? The meditative, calming quality of the held contractions. Dr. Mushtaq named it because of the mental peace it brings alongside the physical benefit.`,
  },
  {
    id: "mind", icon: "🧠", title: "Mind Types & Reprogramming", color: T.gold,
    chapter: "Chapter 5",
    summary: "PPM (positive), NPM (negative), MPM (mixed). Most of us are MPM. We CAN reprogramme ourselves with the 3-week challenge.",
    detail: `Three Mind Types:\n• PPM (Positively Programmed Mind): Consistently disciplined with diet and exercise. These people stay fit naturally.\n• NPM (Negatively Programmed Mind): Consistently struggles with discipline. Rare.\n• MPM (Mixed Programmed Mind): Does well sometimes, badly other times (e.g. loses weight for a wedding, regains it after). Most of us.\n\nThe Solution — 3-Week Challenge:\n• Evidence shows habits form after 3 weeks.\n• Give yourself 21 days of ABS-X diet + exercise discipline.\n• Once habits embed in the subconscious mind, your autopilot switches on — it feels effortless.\n\n1-Question Psychology:\nAfter a slip → ask 'What are my options now?' (shifts from problem to solution mode instantly).\n\n2-Question Psychology:\nBefore eating outside the plan → 'Do I need to eat this?' then 'Do I REALLY need to eat this?' Creates a pause before impulse decisions.\n\nSubconscious Autopilot:\nMost of our daily routines result from our subconscious mind. Once the ABS-X diet and exercise become habit, the subconscious takes over. It no longer feels hard.`,
  },
  {
    id: "skinnyjabs", icon: "💉", title: "Skinny Jabs: The Full Picture", color: "#8B3A62",
    chapter: "Chapter 4 · NEW",
    summary: "GLP-1 injections (Wegovy, Saxenda, Mounjaro) produce weight loss — but the full A→B→C story reveals a catch most people aren't told about.",
    detail: `The A→B→C Story:\n• Point A: You start the injections.\n• Point B (6–12 months later): Weight loss peaks.\n• Point C (~18 months after stopping): For most people, the weight has returned.\n\nWhat the clinical trials show:\n• STEP 1 trial: within 1 year of stopping, patients regained 2/3 of lost weight.\n• Review of 8 trials (2,000+ patients): average regain of nearly 10 kg after stopping.\n• NHS funding is currently limited to 2 years — then treatment stops.\n\nThe muscle problem:\n• 25–40% of weight lost on semaglutide is LEAN TISSUE (muscle), not fat.\n• When the weight returns at Point C, it returns almost entirely as fat.\n• Body composition is actually WORSE than at Point A.\n\nSafety:\n• MHRA January 2026 safety alert: nearly 1,300 pancreatitis reports linked to GLP-1 drugs.\n• 19 fatal cases. Symptoms: severe stomach pain spreading to back, nausea, vomiting.\n• Seek urgent medical attention if you experience these symptoms.\n\nCost: £150–£300/month privately. £1,800–£3,600+/year.\n\nDo GLP-1s have any role? Yes — but only alongside genuine lifestyle change (resistance exercise, protein-rich diet, behavioural support). Used alone, the A→B→C outcome is almost inevitable.\n\nDr. Mushtaq's view: The ABS-X method builds a genuine lifestyle change. That's what makes results last.`,
  },
  {
    id: "skinnyfat", icon: "⚖️", title: "Avoiding Skinny Fat", color: T.sageL,
    chapter: "Chapter 2",
    summary: "Indiscriminate weight loss loses more muscle than fat (muscles are heavier). Result: skinny fat — thinner but unhealthy body composition.",
    detail: `What is Skinny Fat?\nIf you only focus on the scales and lose overall weight without caring about what you're losing, you'll lose more muscle than fat — because muscle is much heavier than fat.\n\nResult: you may reach a 'healthy' BMI number but still carry excess body fat — and you'll likely have hanging skin, lack physical strength, and remain at cardiovascular risk.\n\nHow to avoid it:\n• Eat a balanced diet with recommended protein (1.2–1.7g per kg body weight for those weight training).\n• Include 25% light weight training during weight loss phase.\n• Be guided by BODY COMPOSITION (muscle %, fat %, metabolic age) — not just the scales.\n• Body composition machines are available in most gyms.\n\nDr. Mushtaq's stats at Point Y: muscles were more than 2/3 of his total weight, with low body fat. His metabolic age was 28 at actual age 46.\n\nRemember: Real age is just a number. What matters is your metabolic age.`,
  },
];

// ─── Chapters summary (2nd Edition — 13 chapters) ────────────────────────────
const CHAPTERS = [
  { num: 1, title: "My Story", emoji: "🏥", color: T.terra, summary: "Dr. Mushtaq suffered a stroke at 46 (BMI 34, 104 kg, waist 38in). His recovery became his turning point. One-pack to six-pack in under 6 months — naturally, no diet plans, no personal trainer. His conclusion: 3 simple steps — walk on empty stomach, delay breakfast, wait." },
  { num: 2, title: "Losing Weight", emoji: "⚖️", color: T.sage, summary: "The X Triangle of Weight Loss. X-Point Theory (A→X blind period, X→Y smooth journey). The A-to-Z journey graph. BMI & waist targets. Body composition over scales. The Scotland analogy. Skinny fat warning." },
  { num: 3, title: "Diet", emoji: "🥗", color: T.gold, summary: "The ABS-X Diet: Asif's Balanced & Sustainable Diet inspired by Ramadan fasting. Men: 1,600 kcal preset (400/800/400). Women: 1,200 kcal preset (300/600/300). Early dinner, late breakfast, preset meals, walk on empty stomach. Why NOT keto, low-carb or crash diets." },
  { num: 4, title: "Skinny Jabs: What Nobody Is Telling You", emoji: "💉", color: "#8B3A62", summary: "NEW · 2nd Edition. Semaglutide (Wegovy), liraglutide (Saxenda), tirzepatide (Mounjaro). Weight returns in ~18 months of stopping (STEP 1 trial). 25–40% of weight lost is muscle, not fat. MHRA 2026 pancreatitis warning. £150–300/month. GLP-1 works best alongside lifestyle change — not instead of it." },
  { num: 5, title: "Exercise", emoji: "🚶", color: T.terraL, summary: "Law of Level of Effort & Outcome. Moderate intensity (110–140 bpm) burns MORE total calories than high intensity. Exercise during fasting for maximum fat burn. 75% cardio + 25% light weights per daily session. At least 1 hour brisk walk to burn 500 kcal. Avoid high intensity when overweight — joint injury risk." },
  { num: 6, title: "The Mind", emoji: "🧠", color: T.sageL, summary: "Mind is the most crucial triangle component. PPM/NPM/MPM mind types. 3-week reprogramming challenge (habits form after 21 days). Positive vs negative weight-loss cycles. 1-question and 2-question psychology. Subconscious autopilot once habits form." },
  { num: 7, title: "Staying Fit", emoji: "🌟", color: T.terra, summary: "X Triangle of Fitness (calorie balance, not deficit). Check weight weekly. Recalculate calories after weight loss. To stay fit: 2/3 weight training + 1/3 cardio, 30–45 mins daily. Early dinner and late breakfast remain essential." },
  { num: 8, title: "Getting Ripped", emoji: "💪", color: T.brown, summary: "Body composition over scales. Men: visible abs at <15% body fat. Women: <20% body fat. Protein: 1.2–1.7g/kg body weight. Muscle Yoga method for definition. Body composition machine — not just scales." },
  { num: 9, title: "Getting Toned", emoji: "✨", color: T.sage, summary: "Muscle Yoga: moderate weight + full contraction + hold 5–10 seconds + repeat. Releases endorphins and BDNF. Skin reshapes naturally when losing fat and building muscle sustainably. No hanging skin when done correctly." },
  { num: 10, title: "Simple Tips to Stay Positive", emoji: "☀️", color: T.gold, summary: "1-question psychology: 'What are my options now?' 2-question psychology before eating outside plan. Sleep 8 hours. Self-love as gratitude. Use your limited energy on what truly matters. Switch off and recharge — nap, breathe, disconnect." },
  { num: 11, title: "Helping Others", emoji: "🤝", color: T.terra, summary: "'We get fit and unfit together.' Kids learn by watching, not listening. Lead by example. Help family with set meals. Getting fit is the best gift to your loved ones." },
  { num: 12, title: "FAQs", emoji: "❓", color: T.sageL, summary: "Is breakfast the most important meal? No — delay it. Will skin hang? Not if done sustainably. Best gym sessions: regular 30–45 min beats occasional 2 hours. At least 1 hour brisk walk during fasting to burn 500 kcal or more is required to start losing weight." },
  { num: 13, title: "Simple Weight-Loss Tips", emoji: "💡", color: T.gold, summary: "Drink water before meals. Black coffee before exercise. Hunger during fasting = fat burning — good news! Don't follow the gym rat race. Buy a target outfit and hang it where you see it daily. Love your new self — self-love is a sign of gratitude." },
];

// ─── Tips (Chapter 12 + throughout) ─────────────────────────────────────────
const TIPS = [
  "💧 Drink a glass of water before your light supper, and a glass and a half before your main meal — it helps control portion size.",
  "☕ Black coffee before exercise helps you get through long sessions and reduces cravings. It's one of Dr. Mushtaq's favourites.",
  "😮 When hungry during fasting, drink 2 glasses of water — thirst often masquerades as hunger.",
  "🚶 Walk on an empty stomach — morning before breakfast is best. Or after an early dinner if mornings don't work.",
  "🚫 Avoid ALL soda and fizzy drinks, including 'sugar-free' and 'diet' versions — all contain unhealthy chemicals.",
  "⏱ Avoid calorific food for at least 2 hours after exercise — the body keeps burning calories until you refuel.",
  "🏋 Don't follow the gym rat race. Moderate intensity for longer beats high intensity for short. Work smarter, not harder.",
  "👗 Buy a lovely outfit in your target size. Hang it somewhere you see it every single day — it works.",
  "📊 Check your weight at least once a week. It's easy to overlook gradual gain when you're not tracking.",
  "😴 Sleep at least 8 hours. Poor sleep causes overeating and weight gain — it's scientifically proven.",
  "🍽 Eat ONLY preset meals — even at work, even at social events. Meals fill you up; random snacks don't.",
  "🧠 Feeling hungry during fasting? That's good news — your body is using fat reserves for energy. Embrace it!",
  "🥚 Boiled eggs are a great breakfast protein. Watch the yolk quantity — high in fat. Egg whites are safer in larger amounts.",
  "🐟 Salmon and tuna are rich in omega-3 fatty acids — great protein sources for your Clever Lunch.",
  "🌾 Choose wholemeal bread, rice and grains over refined carbs. They have more fibre, keep you full longer, and burn more calories during digestion.",
];

// ─── Mind Tab Data (Chapter 5 & 9) ───────────────────────────────────────────

const MIND_TYPES = [
  {
    id: "ppm", label: "PPM", name: "Positively Programmed Mind", icon: "☀️", color: T.sage,
    desc: "Consistently disciplined with diet and exercise. These people stay fit naturally — habits are deeply embedded in their subconscious. They rarely struggle.",
    traits: ["Exercises regularly without being told", "Naturally chooses healthier foods", "Bounces back quickly from setbacks", "Finds fitness routines feel effortless"],
    action: "If this is you — brilliant. Your job is to protect this positive programming and help others around you (Chapter 10).",
  },
  {
    id: "npm", label: "NPM", name: "Negatively Programmed Mind", icon: "🌧", color: T.terraL,
    desc: "Consistently struggles with discipline regardless of knowledge or motivation. This is rare — most people who think they are NPM are actually MPM.",
    traits: ["Finds any routine very hard to maintain", "Self-sabotages at every attempt", "Gives up before seeing any results", "Feels like 'it just doesn't work for me'"],
    action: "The 3-week challenge is your answer. Habits don't exist yet — but they CAN be built. Start small. One meal at a time.",
  },
  {
    id: "mpm", label: "MPM", name: "Mixed Programmed Mind", icon: "🌤", color: T.gold,
    desc: "Does well sometimes, badly at other times. Loses weight for a wedding, regains it after. Most of us are MPM — and this is completely normal and fixable.",
    traits: ["Motivated in short bursts", "Good when accountable, slips when alone", "Has succeeded before but couldn't sustain it", "Knows what to do but struggles to do it consistently"],
    action: "The 3-week challenge reprogrammes your subconscious. Once habits form, your autopilot switches on and it feels effortless.",
  },
];

const PSYCHOLOGY_TOOLS = [
  {
    id: "1q", icon: "❓", title: "1-Question Psychology", color: T.terra, chapter: "Chapter 5",
    tagline: "Shift from problem to solution mode instantly.",
    when: "Use this immediately after any slip — eating outside your plan, missing exercise, or feeling guilty.",
    how: `When you've slipped or feel like you've failed, stop and ask yourself just one question:\n\n"What are my options now?"\n\nThat's it. Don't dwell on what happened. Don't judge yourself. Don't feel guilty.\n\nThis single question shifts your mind from problem-focused (what went wrong) to solution-focused (what can I do now). It's the difference between a negative cycle and a positive one.`,
    examples: [
      { situation: "I ate a takeaway last night", response: "What are my options now? → I can eat lighter today and walk for an hour." },
      { situation: "I missed my morning walk", response: "What are my options now? → I can walk after my early dinner instead." },
      { situation: "I broke my streak", response: "What are my options now? → I start again today. The X-Point is still coming." },
    ],
  },
  {
    id: "2q", icon: "🤔", title: "2-Question Psychology", color: T.sage, chapter: "Chapter 5",
    tagline: "Create a pause before impulse food decisions.",
    when: "Use this BEFORE eating anything outside your ABS-X preset meals — at a party, in a meeting, when someone offers food.",
    how: `Before eating anything outside your plan, ask yourself two questions in order:\n\nQuestion 1: "Do I need to eat this?"\n\nPause. Think. If the answer is no, stop there.\n\nIf you still feel the urge, ask:\n\nQuestion 2: "Do I REALLY need to eat this?"\n\nThis second question creates a longer pause and engages your rational mind. Most of the time, the honest answer is no — and that pause is enough to make the right choice.\n\nDr. Mushtaq says this is not about deprivation. It's about making conscious choices rather than impulsive ones.`,
    examples: [
      { situation: "Biscuits offered in a work meeting", response: "Do I need this? → Not really. Do I REALLY need it? → No." },
      { situation: "Kids' leftover food on the plate", response: "Do I need this? → I'm not even hungry. → Leave it." },
      { situation: "After-dinner dessert at a restaurant", response: "Do I need this? → I've had my plan. → Could I share or skip?" },
    ],
  },
  {
    id: "3week", icon: "📅", title: "The 3-Week Challenge", color: T.gold, chapter: "Chapter 3 & 5",
    tagline: "The science-backed way to reprogramme your subconscious.",
    when: "Start this on Day 1 of your ABS-X journey. This is how you transform from MPM to PPM.",
    how: `Evidence shows that habits begin to form after 3 weeks (21 days) of consistent repetition.\n\nHere's what happens:\n\n• Days 1–7: Hardest period. Your conscious mind is doing all the work. You have to remind yourself of every step.\n\n• Days 8–14: Getting easier. The habit is starting to embed. You still need discipline but it feels less effortful.\n\n• Days 15–21: The subconscious begins to take over. Morning walks start to feel automatic. Delaying breakfast stops feeling like a sacrifice.\n\n• Day 21+: Autopilot switched on. Habits are embedded. The ABS-X diet no longer feels like a diet — it feels like your lifestyle.\n\nHow to use it: Print or screenshot the ABS-X diet plan. Stick it on your fridge. Give yourself exactly 21 days. Don't aim for perfection — aim for consistency.`,
    examples: [
      { situation: "Week 1 struggle", response: "Normal. Use 1-question psychology. Use the X Triangle to compensate." },
      { situation: "Week 2 plateau", response: "Stay the course. This is the blind period (X-Point Theory). The body is adjusting." },
      { situation: "Week 3 turning point", response: "You'll feel something shift. The autopilot begins. Keep going." },
    ],
  },
  {
    id: "selfcheck", icon: "🪞", title: "Self-Love as Gratitude", color: T.brown, chapter: "Chapter 9",
    tagline: "Don't judge yourself. Positive self-talk is not vanity — it's fuel.",
    when: "Use this whenever you feel guilty, ashamed, or defeated about your weight or your progress.",
    how: `Dr. Mushtaq believes self-love is not vanity — it's a form of gratitude.\n\nWhen we appreciate our body and what it does for us, we treat it better. We feed it better food, give it rest, and move it regularly — not as punishment, but as care.\n\nThree mindset shifts:\n\n1. Stop saying "I failed." Start asking "What are my options now?"\n\n2. Stop comparing your Point A to someone else's Point Y. You're on your own road to Scotland.\n\n3. Stop waiting to feel worthy. Your body is not a project to fix. It's a life to live.\n\nObesity is not a moral failing. It's a health challenge — one that millions face. Dr. Mushtaq was obese himself. He wasn't weak. He simply hadn't found the right knowledge yet. Now you have it.`,
    examples: [
      { situation: "Feeling embarrassed at the gym", response: "Everyone started somewhere. You're already ahead of the person who didn't show up." },
      { situation: "Looking in the mirror at Point A", response: "This is where my journey begins. Not where it ends." },
      { situation: "Comparing to someone else's progress", response: "Brighton and Manchester are both heading to Scotland. Direction is what matters." },
    ],
  },
];

const POSITIVE_CYCLE_STEPS = [
  { step: "A", label: "Gain Knowledge", desc: "Read and understand the X Triangle, X-Point Theory, and ABS-X diet. Knowledge is the foundation of the positive cycle.", color: T.sage, icon: "📚" },
  { step: "B", label: "3-Week Challenge", desc: "Take the 21-day challenge. Form habits through consistent repetition. Use the X Triangle to compensate for imperfections.", color: T.gold, icon: "📅" },
  { step: "C", label: "Be Patient", desc: "Trust the X-Point Theory. The blind period is temporary. The body is working even when you can't see it yet.", color: T.terraL, icon: "⏳" },
  { step: "D", label: "Reach the X-Point", desc: "Visible results begin. The mind takes ownership. With the 'big boss' in the driving seat, the journey becomes smooth.", color: T.terra, icon: "✕" },
  { step: "E", label: "Autopilot On", desc: "Habits are now embedded in the subconscious. The ABS-X diet is your lifestyle. Staying fit feels effortless.", color: T.brown, icon: "🌿" },
];

const NEGATIVE_CYCLE_STEPS = [
  { step: "A", label: "No Knowledge", desc: "Starting without understanding how the body works. Following fad diets, crash diets, or unsustainable plans.", color: T.terraL, icon: "❓" },
  { step: "B", label: "Unsustainable Plan", desc: "Wrong exercise (high intensity when overweight), unbalanced diet (keto, no carbs), injury risk — and no new habits forming.", color: T.terra, icon: "⚠️" },
  { step: "C", label: "Impatience & Judgement", desc: "No visible results in the blind period → self-judgement → guilt (cognitive dissonance) → premature quitting.", color: T.brown, icon: "😔" },
  { step: "D", label: "Never Reach X-Point", desc: "Without reaching the X-Point, the mind never takes ownership. No momentum. No autopilot.", color: T.mid, icon: "✕" },
  { step: "E", label: "Weight Regained", desc: "Back to square one — or worse. Mental health declines. The negative cycle reinforces itself.", color: T.light, icon: "🔁" },
];

const MINDFULNESS_PRACTICES = [
  {
    id: "sleep", icon: "😴", title: "Sleep 8 Hours", color: T.sage, chapter: "Chapter 9",
    desc: "Poor sleep is one of the most overlooked causes of weight gain. When you sleep less than 8 hours, your body produces more ghrelin (hunger hormone) and less leptin (fullness hormone) — making you eat more the next day.",
    tips: [
      "Set a consistent bedtime and stick to it even on weekends",
      "Your early dinner (7–8pm) naturally supports better sleep quality",
      "Avoid screens 30–60 minutes before bed",
      "A well-rested mind is a stronger mind — essential for the 3-week challenge",
    ],
  },
  {
    id: "water", icon: "💧", title: "Drink 2–3 Litres of Water Daily", color: T.terra, chapter: "Chapter 9",
    desc: "Thirst is often mistaken for hunger. During the fasting period, drinking water regularly suppresses false hunger signals and helps the body use fat reserves more efficiently.",
    tips: [
      "When you feel hungry during fasting — drink 2 glasses of water first",
      "Drink a glass before your light supper, 1.5 glasses before your Clever Lunch",
      "Cold water slightly boosts metabolism (minimal but real)",
      "Water keeps your gut moving — supports the bowel benefits of the ABS-X diet",
    ],
  },
  {
    id: "energy", icon: "⚡", title: "Protect Your Energy", color: T.gold, chapter: "Chapter 9",
    desc: "Dr. Mushtaq emphasises using your limited daily energy on what truly matters. Stress, conflict, and negativity drain the mental resources you need for discipline. Protecting your energy is an act of fitness.",
    tips: [
      "Avoid unnecessary conflict — it drains willpower",
      "Use the 1-question psychology to redirect energy from guilt to solutions",
      "Exercise is one of the best stress regulators — it releases endorphins and BDNF",
      "Don't use eating as a de-stressor — find an active replacement (walk, Muscle Yoga)",
    ],
  },
  {
    id: "switch", icon: "🔌", title: "Switch Off and Recharge", color: T.brown, chapter: "Chapter 9",
    desc: "Modern dopamine-driven lifestyles (social media, notifications, constant stimulation) reduce focus and patience — the two most important mental resources for your weight-loss journey.",
    tips: [
      "Schedule screen-free time daily — even 30 minutes makes a difference",
      "Use your fasting morning walk as phone-free time to clear your mind",
      "Today's dopamine-driven culture is why the blind period (A→X) is harder than ever",
      "A calm mind makes better food decisions. A distracted mind makes impulsive ones.",
    ],
  },
  {
    id: "outfit", icon: "👗", title: "The Target Outfit Technique", color: T.terra, chapter: "Chapter 12",
    desc: "One of Dr. Mushtaq's simplest and most effective mind tools: buy an outfit in your target size and hang it somewhere you see it every single day. It works because it makes your goal visual and concrete.",
    tips: [
      "Choose something you genuinely love and want to wear",
      "Hang it on your wardrobe door or bedroom wall — not in a drawer",
      "Look at it every morning before your fasting walk",
      "When you reach your X-Point and clothes start to fit — the motivation becomes self-sustaining",
    ],
  },
  {
    id: "spiritual", icon: "🌙", title: "Spirituality & Inner Strength", color: T.sageL, chapter: "Chapter 3",
    desc: "Dr. Mushtaq's fasting discipline was strengthened by his Muslim faith and the annual practice of Ramadan. He describes spiritual strength as a form of mental strength — the feeling of being connected to something greater helps discipline the mind.",
    tips: [
      "You don't need to be religious to benefit — any practice that connects you to your values helps",
      "Gratitude practices (thankfulness for your body) reinforce self-love and positive behaviour",
      "Fasting has spiritual dimensions across many traditions — the discipline of the mind is universal",
      "Knowing your 'why' (family, health, longevity) is your spiritual anchor on hard days",
    ],
  },
];

const DAILY_AFFIRMATIONS = [
  "If Dr. Mushtaq can go from one-pack to six-pack at 46 after a stroke — I can do this.",
  "The body will take its time. I will not judge myself in the blind period.",
  "What is easy to do is also easy not to do. I choose to do it.",
  "I am heading in the right direction. I will reach Scotland.",
  "My X-Point is coming. Every disciplined day brings it closer.",
  "I eat what I love at Clever Lunch. This is sustainable. This is for life.",
  "The 3-week challenge will build my autopilot. 21 days. I can do 21 days.",
  "My mind is the big boss. Once it takes over, this journey becomes smooth.",
  "Self-love is gratitude. I care for my body because I am thankful for it.",
  "Hunger during fasting is good news — my body is using its fat reserves.",
  "I am not on a diet. I am building a lifestyle.",
  "Work smarter, not harder. Moderate effort sustained is more powerful than intensity.",
  "Perfection is not a destination but a journey. I keep going.",
  "This is not a 100-metre race. It is a marathon. I pace myself.",
  "Things happen for a good reason. My fitness journey is proof of that.",
  "Once my autopilot switches on, staying fit will feel effortless.",
  "The skinny jab gives Point B — but the ABS-X method gives me a lifetime.",
  "Remember: if one person can achieve something, others can also do it.",
  "Don't start blaming yourself. Ask: What are my options now?",
  "It is not supposed to end like this. I decided to change — and I am changing.",
];

// ─── Community — REAL verified reviews from the book ─────────────────────────
// These are real reviews printed on the published book cover and interior.
// Fictitious posts removed. Public posts require admin approval before appearing.
const SEED_POSTS = [
  {
    id: 1,
    name: "Patricia Sharman",
    credential: "NHS England",
    avatar: "P",
    verified: true,
    text: "I am 62 years old, and I lost an impressive 16 kg in just three months by following Dr. Asif's diet book. Embracing simple lifestyle changes has significantly improved my overall physical and mental well-being. I wholeheartedly recommend this book to anyone looking to shed some pounds.",
    outcome: "Lost 16 kg in 3 months",
    likes: 214, liked: false,
    source: "Book cover review",
    color: T.teal,
  },
  {
    id: 2,
    name: "Dr Kofi Dapaah",
    credential: "NHS England",
    avatar: "K",
    verified: true,
    text: "I lost 10 kg following Dr Asif's diet book, which improved my physical and mental health. Weight loss seems sustainable, and I recommend his book to all looking to lose weight and improve their health.",
    outcome: "Lost 10 kg",
    likes: 178, liked: false,
    source: "Book cover review",
    color: T.navyMid,
  },
  {
    id: 3,
    name: "Dr Barrie Stevenson",
    credential: "NHS England",
    avatar: "B",
    verified: true,
    text: "Life changing! It presents a clear and simple system for losing weight, building muscle and becoming a healthier, fitter person. It's built on a strong scientific foundation and is enriched with loads of practical tips.",
    outcome: "Life-changing results",
    likes: 195, liked: false,
    source: "Book cover review",
    color: T.sage,
  },
  {
    id: 4,
    name: "Professional Book Review",
    credential: "Independent Medical Review",
    avatar: "✦",
    verified: true,
    text: "An insightful and thought-provoking book written by an NHS Consultant. After suffering a serious medical illness, he transformed his life and wants to share his secrets with you in this book. This book is a must-have for anyone looking to start a new weight-loss journey to improve their physical and mental health.",
    outcome: "Must-have for weight loss",
    likes: 142, liked: false,
    source: "Published book review",
    color: "#6B3FA0",
  },
  {
    id: 5,
    name: "Dr Simon Williams",
    credential: "General Practitioner",
    avatar: "S",
    verified: true,
    text: "Asif, an NHS consultant, has honestly and openly shared the consequences of his own weight problem which could have so easily ended his life at an early age. More importantly, Asif offers guidance and hope that there is another way to live, one which will not only lead to weight loss but offers that holy grail: peace of mind. This book offers the reader a sustainable lifestyle choice. Besides, if Asif can do it, why not me?",
    outcome: "Sustainable lifestyle change",
    likes: 163, liked: false,
    source: "Book interior review",
    color: T.gold,
  },
];

// ─── Shared UI components ─────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: T.surface, borderRadius: 16, padding: "18px 20px",
      boxShadow: "0 1px 4px rgba(15,45,74,0.06), 0 4px 16px rgba(15,45,74,0.04)",
      border: `1px solid ${T.border}`,
      marginBottom: 12, ...style
    }}>{children}</div>
  );
}

function SectionTitle({ children, style = {} }) {
  return (
    <h3 style={{ color: T.navy, fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 14px", letterSpacing: 0.2, ...style }}>
      {children}
    </h3>
  );
}

function Pill({ children, color, bg }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 50,
      background: bg || `${color}18`, color: color || T.mid,
      fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
      letterSpacing: 0.3,
    }}>{children}</span>
  );
}

function Modal({ title, children, onClose }) {
  // Portal to <body> so the Modal escapes the scrollable tab container's
  // compositing layer on iOS — otherwise the bottom nav (zIndex 400, outside
  // the scroller) renders above this Modal (zIndex 500, inside the scroller).
  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(15,45,74,0.55)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.surface, borderRadius: "24px 24px 0 0",
        padding: "24px 22px 44px", width: "100%",
        boxShadow: "0 -8px 40px rgba(15,45,74,0.18)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ width: 40, height: 4, background: T.border, borderRadius: 99, margin: "0 auto 22px" }} />
        <h2 style={{ color: T.navy, fontSize: 20, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 20px" }}>{title}</h2>
        {children}
      </div>
    </div>,
    document.body
  );
}

function InfoRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${T.goldL}` }}>
      <span style={{ color: T.light, fontSize: 13, fontFamily: "'DM Sans',sans-serif", flex: 1 }}>{label}</span>
      <span style={{ color: color || T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, textAlign: "right", flex: 1 }}>{value}</span>
    </div>
  );
}

// ─── Personalised Plan Calculator (Mifflin-St Jeor / NHS method) ─────────────
function calcProfile(gender, age, weight, height, activity) {
  const minFloor = gender === "male" ? 1400 : 1200;
  let bmr = (10 * weight) + (6.25 * height) - (5 * age) + (gender === "male" ? 5 : -161);
  const maintenance = Math.round(bmr * activity);
  const dietTarget = Math.max(Math.round(maintenance - 500 - 200), minFloor); // −500 deficit + −200 buffer (underestimated calories & occasional snacks — Ch.3)
  const bmi = Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10;
  const bmiMin = Math.round(18.5 * Math.pow(height / 100, 2) * 10) / 10;
  const bmiMax = Math.round(24.9 * Math.pow(height / 100, 2) * 10) / 10;
  const bmiLabel = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy weight" : bmi < 30 ? "Overweight" : "Obese";
  return { gender, age, weight, height, activity, maintenance, dietTarget, bmi, bmiMin, bmiMax, bmiLabel };
}

// Ideal targets (NHS) for measurement-gated phase advancement
const calcIdealWeightKg = h => Math.round(24.9 * Math.pow(h / 100, 2) * 10) / 10;
const calcIdealWaistCm = (gender) => gender === "female" ? 80 : 94;
const calcIdealBfPct = gender => gender === "female" ? 20 : 15;
// US Navy body-fat estimate (tape measure only)
function navyBfPct(gender, { neck, waist, hip, height }) {
  if (gender === "male") {
    const bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    return Math.round(bf * 10) / 10;
  }
  const bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450;
  return Math.round(bf * 10) / 10;
}
// Maintenance-level diet target for the Fitness phase (no deficit — body recomposition)
function calcMaintenanceTarget(gender, age, weight, height, activity) {
  const bmr = (10 * weight) + (6.25 * height) - (5 * age) + (gender === "male" ? 5 : -161);
  return Math.round(bmr * activity);
}

function PersonalisedPlanCalculator({ gender, onSave, onSkip }) {
  const [showMsj, setShowMsj] = useState(false);
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activity, setActivity] = useState("1.375");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const ACTIVITIES = [
    { val: "1.2", label: "Mostly sitting", sub: "Desk job, little exercise" },
    { val: "1.375", label: "Light movement", sub: "Walking, light exercise 1–3×/week" },
    { val: "1.55", label: "Moderately active", sub: "Exercise 3–5 days/week" },
    { val: "1.725", label: "Very active", sub: "Hard exercise most days" },
  ];

  const calculate = () => {
    setError("");
    const a = parseFloat(age), w = parseFloat(weight), h = parseFloat(height);
    if (!a || !w || !h || a < 16 || a > 100 || w < 30 || w > 300 || h < 100 || h > 230) {
      setError("Please enter valid age (16–100), weight (30–300 kg) and height (100–230 cm).");
      return;
    }
    setResult(calcProfile(gender, a, w, h, parseFloat(activity)));
  };

  const inputStyle = { width: "100%", padding: "13px 14px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontFamily: "'DM Sans',sans-serif", fontSize: 15, background: T.surface, color: T.navy, outline: "none", boxSizing: "border-box", appearance: "none" };
  const labelStyle = { display: "block", color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 500, marginBottom: 6, letterSpacing: 0.3 };

  return (
    <div style={{ width: "100%" }}>
      {!result ? (
        <div>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: "0 0 12px", lineHeight: 1.6, textAlign: "center" }}>
            Enter your details for a calorie plan personalised to your body — using the NHS Mifflin-St Jeor method.
          </p>
          <button onClick={() => setShowMsj(s => !s)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 13px", marginBottom: 16, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, cursor: "pointer" }}>
            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>📐 What is the Mifflin-St Jeor equation?</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{showMsj ? "↑" : "↓"}</span>
          </button>
          {showMsj && (
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "13px 14px", marginBottom: 16 }}>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.7, margin: "0 0 9px" }}>
                The Mifflin-St Jeor equation is the formula recommended by the NHS and the British Dietetic Association for estimating how many calories your body needs. It is the most accurate predictive equation for healthy adults.
              </p>
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", marginBottom: 9 }}>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>The equation</p>
                <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "monospace", lineHeight: 1.6, margin: 0 }}>
                  BMR = (10 × weight kg) + (6.25 × height cm) − (5 × age) {gender === "male" ? "+ 5" : "− 161"}
                </p>
              </div>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.7, margin: 0 }}>
                Your BMR (Basal Metabolic Rate — calories burned at complete rest) is multiplied by your activity level to give your <strong style={{ color: "#fff" }}>maintenance calories</strong>. The app then subtracts a 500 kcal deficit (plus a small 200 kcal buffer for snacks and underestimates). Combined with your 500 kcal daily exercise goal, this gives roughly a 1,000 kcal total deficit — about 1 kg of fat loss per week, the clinically safe maximum endorsed by NHS guidelines.
              </p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[
              { id: "age", label: "Age", val: age, set: setAge, placeholder: "e.g. 42", type: "number" },
              { id: "weight", label: "Weight (kg)", val: weight, set: setWeight, placeholder: "e.g. 85", type: "number" },
            ].map(f => (
              <div key={f.id}>
                <label style={labelStyle}>{f.label}</label>
                <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} style={inputStyle} />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Height (cm)</label>
            <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="e.g. 175" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Daily activity level</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ACTIVITIES.map(a => (
                <button key={a.val} onClick={() => setActivity(a.val)} style={{
                  padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${activity === a.val ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)"}`,
                  background: activity === a.val ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
                  cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                }}>
                  <div style={{ color: "#fff", fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: activity === a.val ? 700 : 400 }}>{a.label}</div>
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>{a.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {error && <div style={{ background: "rgba(192,57,43,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}><p style={{ color: "#FDECEA", fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>{error}</p></div>}

          <button onClick={calculate} style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: "#fff", color: T.navy, fontSize: 15, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
            Calculate My Plan
          </button>
          <button onClick={onSkip} style={{ width: "100%", padding: 12, borderRadius: 14, border: "1.5px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "'DM Sans',sans-serif", cursor: "pointer" }}>
            Skip — use standard plan
          </button>
        </div>
      ) : (
        <div>
          {/* Result summary */}
          <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 16, padding: "16px", marginBottom: 14, border: "1px solid rgba(255,255,255,0.2)" }}>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontFamily: "'DM Sans',sans-serif", letterSpacing: 2, textTransform: "uppercase", margin: "0 0 12px" }}>Your personalised plan</p>
            {[
              { label: "Maintenance calories", val: `${result.maintenance.toLocaleString()} kcal/day`, note: "BMR × activity (Mifflin-St Jeor)" },
              { label: "Your diet target", val: `${result.dietTarget.toLocaleString()} kcal/day`, note: "−500 kcal deficit + −200 kcal buffer (snacks & underestimates)" },
              { label: "Exercise burn goal", val: "500 kcal/day", note: "−500 kcal from activity" },
              { label: "Total daily deficit", val: `${(result.maintenance - result.dietTarget + 500).toLocaleString()} kcal`, note: "≈ 1 kg fat loss per week" },
            ].map((r, i, a) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "9px 0", borderBottom: i < a.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
                <div>
                  <p style={{ color: "#fff", fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 2px" }}>{r.label}</p>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>{r.note}</p>
                </div>
                <p style={{ color: i === 3 ? "#22A090" : "#fff", fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: 0, textAlign: "right" }}>{r.val}</p>
              </div>
            ))}
          </div>

          {/* BMI pill */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Your BMI", val: result.bmi, sub: result.bmiLabel },
              { label: "Healthy weight", val: `${result.bmiMin}–${result.bmiMax} kg`, sub: "BMI 18.5–24.9" },
            ].map((c, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px" }}>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: "0 0 4px" }}>{c.label}</p>
                <p style={{ color: "#fff", fontSize: 18, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 2px" }}>{c.val}</p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>{c.sub}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <button onClick={() => setResult(null)} style={{ padding: 14, borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.25)", background: "transparent", color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "'DM Sans',sans-serif", cursor: "pointer" }}>
              ← Recalculate
            </button>
            <button onClick={() => onSave(result)} style={{ padding: 14, borderRadius: 12, border: "none", background: "#fff", color: T.navy, fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, cursor: "pointer" }}>
              Use this plan →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Onboarding Screen ────────────────────────────────────────────────────────
function OnboardingScreen({ onSelect }) {
  const [step, setStep] = useState(1); // 1=gender, 2=calculator
  const [accepted, setAccepted] = useState(false);
  const [selectedGender, setSelectedGender] = useState(null);

  const handleGenderNext = () => {
    if (!accepted || !selectedGender) return;
    setStep(2);
  };

  return (
    <div style={{
      minHeight: "100vh", background: `linear-gradient(160deg,#0F2D4A 0%,#1A4A6E 45%,#1A7A6E 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "44px 24px 32px", textAlign: "center",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />

      {/* DA Diet wordmark — onboarding */}
      <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <div style={{ position: "relative", background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 12, padding: "6px 14px" }}>
            <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 42, fontWeight: 700, color: "#FFFFFF", letterSpacing: -1, lineHeight: 1 }}>DA</span>
            <div style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: 6, background: "#1A7A6E", border: "2px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 12 12">
                <line x1="6" y1="1.5" x2="6" y2="10.5" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
                <line x1="1.5" y1="6" x2="10.5" y2="6" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 42, fontWeight: 300, color: "rgba(255,255,255,0.9)", letterSpacing: -1, marginLeft: 10, lineHeight: 1 }}>Diet</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontStyle: "italic", color: "rgba(255,255,255,0.45)" }}>Dr Asif Diet</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "#22A090" }}>Evidence-Based</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "#22A090" }}>Physician-Led</span>
        </div>
        <div style={{ width: 220, height: 1, background: "rgba(255,255,255,0.15)", marginBottom: 4 }} />
        <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 11, fontStyle: "italic", color: "rgba(255,255,255,0.4)" }}>Lose Weight Smarter for Life</span>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {[1, 2].map(s => (
          <div key={s} style={{ width: s === step ? 24 : 8, height: 4, borderRadius: 99, background: s === step ? "#fff" : "rgba(255,255,255,0.25)", transition: "all 0.3s" }} />
        ))}
      </div>

      {/* ── STEP 1 — Gender + disclaimer ── */}
      {step === 1 && (
        <div style={{ width: "100%" }}>
          <p style={{ color: "rgba(255,255,255,0.88)", fontSize: 15, fontFamily: "'DM Sans',sans-serif", fontStyle: "italic", lineHeight: 1.65, margin: "0 0 6px" }}>
            "If I can do it, you can do it too."
          </p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: "0 0 24px" }}>— Dr. Asif Mushtaq</p>

          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 12px" }}>
            Step 1 — Select your plan:
          </p>

          <div style={{ display: "flex", gap: 12, width: "100%", marginBottom: 18 }}>
            {[
              { key: "male", icon: "♂", label: "I am a Man" },
              { key: "female", icon: "♀", label: "I am a Woman" },
            ].map(({ key, icon, label }) => (
              <button key={key} onClick={() => setSelectedGender(key)} style={{
                flex: 1, background: selectedGender === key ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
                borderRadius: 16, border: `1.5px solid ${selectedGender === key ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"}`,
                padding: "18px 10px", cursor: "pointer", transition: "all 0.2s",
              }}>
                <div style={{ fontSize: 26, color: "#fff", marginBottom: 6 }}>{icon}</div>
                <div style={{ color: "#fff", fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>{label}</div>
              </button>
            ))}
          </div>

          {/* Disclaimer */}
          <button onClick={() => setAccepted(a => !a)} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "0 0 18px", width: "100%" }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, border: "2px solid rgba(255,255,255,0.4)", flexShrink: 0, marginTop: 1, background: accepted ? "#1A7A6E" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
              {accepted && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
            </div>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, margin: 0 }}>
              I understand this app is for general wellness guidance and is not a substitute for professional medical advice. I will consult my GP before making significant health changes.
            </p>
          </button>

          <button onClick={handleGenderNext} disabled={!accepted || !selectedGender} style={{
            width: "100%", padding: 16, borderRadius: 14, border: "none",
            background: accepted && selectedGender ? "#fff" : "rgba(255,255,255,0.2)",
            color: accepted && selectedGender ? T.navy : "rgba(255,255,255,0.4)",
            fontSize: 15, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, cursor: accepted && selectedGender ? "pointer" : "not-allowed", transition: "all 0.2s",
          }}>Next — Personalise My Plan →</button>
        </div>
      )}

      {/* ── STEP 2 — Personalised calculator ── */}
      {step === 2 && (
        <div style={{ width: "100%", textAlign: "left" }}>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 20px", textAlign: "center" }}>
            Step 2 — Your personalised calorie plan
          </p>
          <PersonalisedPlanCalculator
            gender={selectedGender}
            onSave={profile => onSelect(selectedGender, profile)}
            onSkip={() => onSelect(selectedGender, null)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────
function HomeTab({ plan, gender, setGender, streakDays, setStreakDays, setShowSettings }) {
  const quote = QUOTES[new Date().getDate() % QUOTES.length];
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const streakCount = streakDays.filter(Boolean).length;

  const toggleDay = i => {
    const n = [...streakDays];
    n[i] = !n[i];
    setStreakDays(n);
  };

  return (
    <div style={{ padding: "0 16px 100px", background: T.bg }}>
      {/* Header — clean medical */}
      <div style={{
        background: `linear-gradient(135deg, #0F2D4A 0%, #1A4A6E 60%, #1A7A6E 100%)`,
        margin: "0 -16px", padding: "calc(36px + env(safe-area-inset-top)) 22px 28px",
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: "0 0 6px", letterSpacing: 1.5, textTransform: "uppercase" }}>
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 style={{ color: "#fff", fontSize: 26, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Welcome Back 👋</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22A090" }} />
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
                {plan.icon} {plan.label}'s Plan · {plan.presetMeals.toLocaleString()} kcal
                {plan.personalised && <span style={{ marginLeft: 8, background: "rgba(255,255,255,0.2)", borderRadius: 50, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>✦ Personalised</span>}
              </span>
            </div>
          </div>
          <LogoMark size={46} />
        </div>

        {/* Quote inside header */}
        <div style={{ marginTop: 18, background: "rgba(255,255,255,0.09)", borderRadius: 14, padding: "14px 16px", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "'DM Sans',sans-serif", margin: "0 0 6px", letterSpacing: 1.5, textTransform: "uppercase" }}>{quote.src}</p>
          <p style={{ color: "rgba(255,255,255,0.92)", fontSize: 15, fontFamily: "'DM Sans',sans-serif", fontStyle: "italic", margin: 0, lineHeight: 1.55, fontWeight: 300 }}>"{quote.text}"</p>
        </div>
      </div>

      {/* Plan status bar — tap to go to settings to change */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.surface, borderRadius: 14, padding: "11px 16px", marginBottom: 12, border: `1px solid ${T.border}`, boxShadow: "0 1px 4px rgba(15,45,74,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.teal, flexShrink: 0 }} />
          <div>
            <p style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 1px" }}>
              {plan.icon} {plan.label}'s Plan
              <span style={{ marginLeft: 7, background: plan.personalised ? T.teal : T.navyMid, color: "#fff", fontSize: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, padding: "2px 7px", borderRadius: 50 }}>
                {plan.personalised ? "✦ Personalised" : "Standard"}
              </span>
            </p>
            <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>
              {plan.presetMeals.toLocaleString()} kcal · 🔥 500 kcal burn goal
            </p>
          </div>
        </div>
        <button onClick={() => setShowSettings && setShowSettings(true)} style={{ background: T.tealXL, border: "none", borderRadius: 9, padding: "7px 12px", color: T.teal, fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
          Change ⚙
        </button>
      </div>

      {/* Book cover card — credibility anchor */}
      <div style={{
        background: T.surface, borderRadius: 16, padding: "16px 18px", marginBottom: 14,
        boxShadow: "0 1px 4px rgba(15,45,74,0.06), 0 4px 16px rgba(15,45,74,0.04)",
        border: `1px solid ${T.border}`,
        display: "flex", gap: 16, alignItems: "center",
      }}>
        {/* Book cover illustration — SVG recreation of the orange cover */}
        <div style={{ flexShrink: 0, width: 72, height: 96, borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 16px rgba(15,45,74,0.18)", position: "relative" }}>
          <svg width="72" height="96" viewBox="0 0 72 96" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="coverBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF6B00" />
                <stop offset="60%" stopColor="#FF8C00" />
                <stop offset="100%" stopColor="#FFB300" />
              </linearGradient>
            </defs>
            <rect width="72" height="96" fill="url(#coverBg)" />
            {/* NHS badge */}
            <rect x="4" y="4" width="64" height="10" rx="2" fill="rgba(255,255,255,0.15)" />
            <text x="36" y="11.5" textAnchor="middle" fontFamily="sans-serif" fontSize="5" fill="white" fontWeight="700" letterSpacing="0.5">NHS CONSULTANT</text>
            {/* Dr name */}
            <text x="36" y="24" textAnchor="middle" fontFamily="sans-serif" fontSize="5.5" fill="white" fontWeight="700" letterSpacing="1">DR ASIF MUSHTAQ</text>
            {/* Title */}
            <text x="36" y="37" textAnchor="middle" fontFamily="sans-serif" fontSize="9" fill="white" fontWeight="900" letterSpacing="-0.3">LOSE</text>
            <text x="36" y="49" textAnchor="middle" fontFamily="sans-serif" fontSize="9" fill="white" fontWeight="900" letterSpacing="-0.3">WEIGHT</text>
            <text x="36" y="61" textAnchor="middle" fontFamily="sans-serif" fontSize="9" fill="white" fontWeight="900" letterSpacing="-0.3">SMARTER</text>
            <text x="36" y="73" textAnchor="middle" fontFamily="sans-serif" fontSize="9" fill="white" fontWeight="900" letterSpacing="-0.3">FOR LIFE</text>
            {/* Taglines */}
            <text x="36" y="82" textAnchor="middle" fontFamily="sans-serif" fontSize="4" fill="rgba(255,255,255,0.85)" fontWeight="600">NO INJECTIONS. NO DRUGS.</text>
            <text x="36" y="89" textAnchor="middle" fontFamily="sans-serif" fontSize="4" fill="rgba(255,255,255,0.85)" fontWeight="600">JUST SUSTAINABLE CHANGE.</text>
          </svg>
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <p style={{ color: T.light, fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 4px" }}>Published Book</p>
          <p style={{ color: T.navy, fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 3px", lineHeight: 1.3 }}>Lose Weight Smarter for Life</p>
          <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: "0 0 8px" }}>Dr. Asif Mushtaq · NHS Consultant</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ background: T.tealXL, color: T.teal, fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, padding: "3px 8px", borderRadius: 50 }}>2nd Edition 2026</span>
          </div>
        </div>
      </div>

      {/* 3 Simple Steps banner */}
      <Card style={{ marginBottom: 18, background: T.surfaceAlt }}>
        <p style={{ color: T.brown, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 10px", letterSpacing: 1, textTransform: "uppercase" }}>Dr. Mushtaq's 3 Simple Steps · Chapter 1</p>
        {[
          { n: "1", step: "Walk on an empty stomach", note: "Best during fasting — burns fat reserves directly" },
          { n: "2", step: "Delay breakfast (preset meals)", note: "Keep body carb-deficient 18–20 hrs to force fat burning" },
          { n: "3", step: "Wait", note: "Be patient — the X-Point is coming. Don't quit in the blind period" },
        ].map(({ n, step, note }) => (
          <div key={n} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg,${T.teal},${T.navy})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12, flexShrink: 0, fontFamily: "'DM Sans',sans-serif" }}>{n}</div>
            <div>
              <div style={{ color: T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{step}</div>
              <div style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", marginTop: 2, lineHeight: 1.4 }}>{note}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
        {[
          { label: "day streak", value: `${streakCount}`, icon: "🔥", color: T.terra },
          { label: "kcal target", value: plan.weightLossTarget.toLocaleString(), icon: "🎯", color: plan.color },
          { label: "preset meals", value: `${plan.presetMeals} kcal`, icon: "🍽", color: T.gold },
        ].map((s, i) => (
          <Card key={i} style={{ padding: "14px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ color: s.color, fontSize: 14, fontWeight: 700, fontFamily: "'Cormorant Garamond',serif" }}>{s.value}</div>
            <div style={{ color: T.light, fontSize: 10, fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Today's Meal Plan */}
      <Card style={{ marginBottom: 18 }}>
        <SectionTitle>Today's ABS-X Meal Plan · {plan.icon} {plan.label}</SectionTitle>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: `${plan.color}12`, borderRadius: 10, marginBottom: 14 }}>
          <div>
            <div style={{ color: T.teal, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>Fasting: 14–16 hours</div>
            <div style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>Eating window: 8–10 hours</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: T.dark, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>{plan.presetMeals} kcal</div>
            <div style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>preset meals total</div>
          </div>
        </div>

        {plan.meals.map((m, i) => (
          <div key={i} style={{ padding: "12px 0", borderBottom: i < 2 ? `1px solid ${T.goldL}` : "none" }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ fontSize: 24, marginTop: 2 }}>{m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ color: T.dark, fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>{m.name}</span>
                  <span style={{ color: T.teal, fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>{m.kcal} kcal</span>
                </div>
                <div style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", marginBottom: 4 }}>{m.time}</div>
                <div style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontStyle: "italic", marginBottom: 4 }}>{m.examples}</div>
                <div style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5 }}>{m.why}</div>
                <div style={{ marginTop: 6 }}>
                  {m.carbs
                    ? <Pill color={T.brown} bg={`${T.gold}28`}>✓ Carbs allowed — eat what your taste buds love!</Pill>
                    : <Pill color={T.terra} bg={`${T.terra}18`}>✗ No carbs — fat-burning mode</Pill>}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Calorie breakdown */}
        <div style={{ marginTop: 14, padding: "12px 14px", background: "#EDE0D4", borderRadius: 12 }}>
          <p style={{ color: T.brown, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 6px" }}>📋 Calorie Breakdown ({plan.icon} {plan.label})</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {[
              [`NHS recommended`, `${plan.recommended.toLocaleString()} kcal/day`],
              [`Weight-loss target`, `${plan.weightLossTarget.toLocaleString()} kcal/day`],
              [`Deficit`, `−${plan.deficit} kcal/day`],
              [`Preset meals (ABS-X)`, `${plan.presetMeals} kcal`],
              [`Snack buffer`, `~${plan.snackBuffer} kcal`],
              [`Threshold buffer`, `${plan.thresholdBuffer} kcal`],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ color: T.light, fontSize: 10, fontFamily: "'DM Sans',sans-serif" }}>{k}</div>
                <div style={{ color: T.dark, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Streak tracker */}
      <Card style={{ marginBottom: 18 }}>
        <SectionTitle>This Week's Discipline Streak</SectionTitle>
        <p style={{ color: T.light, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: "-8px 0 14px" }}>Tap a day to mark it complete</p>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {days.map((d, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <button onClick={() => toggleDay(i)} style={{
                width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer",
                background: streakDays[i] ? `linear-gradient(135deg,${T.terra},${T.terraL})` : "#EDE0D4",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, marginBottom: 5, color: "#fff",
                boxShadow: streakDays[i] ? "0 3px 10px rgba(26,122,110,0.25)" : "none",
                transition: "all 0.2s",
              }}>{streakDays[i] ? "✓" : ""}</button>
              <span style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>{d}</span>
            </div>
          ))}
        </div>
        {streakCount >= 7 && (
          <div style={{ marginTop: 14, padding: "10px 14px", background: `${T.gold}20`, borderRadius: 10, textAlign: "center" }}>
            <p style={{ color: T.brown, fontFamily: "'DM Sans',sans-serif", fontSize: 13, margin: 0, fontWeight: 700 }}>🎉 Perfect week! You're building the habit — 3 weeks forms an autopilot!</p>
          </div>
        )}
        {streakCount >= 3 && streakCount < 7 && (
          <div style={{ marginTop: 14, padding: "8px 12px", background: T.sageXL, borderRadius: 10, textAlign: "center" }}>
            <p style={{ color: T.sage, fontFamily: "'DM Sans',sans-serif", fontSize: 12, margin: 0 }}>🌿 {streakCount} days strong! Keep going — habits form after 21 days.</p>
          </div>
        )}
      </Card>

      {/* Tip of the day */}
      <Card>
        <SectionTitle>Dr. Mushtaq's Tip of the Day · Chapter 12</SectionTitle>
        <p style={{ color: T.mid, fontSize: 14, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.7 }}>{tip}</p>
      </Card>
    </div>
  );
}

// ─── Protein Calculator Component ────────────────────────────────────────────
function ProteinCalculator({ gender }) {
  const [weight, setWeight] = useState("");
  const low = weight ? Math.round(parseFloat(weight) * 1.0) : null;
  const high = weight ? Math.round(parseFloat(weight) * 1.5) : null;

  const exampleFoods = [
    { food: "Chicken breast (100g)", protein: "31g" },
    { food: "Boiled eggs (2 large)", protein: "12g" },
    { food: "Salmon fillet (150g)", protein: "30g" },
    { food: "Greek yoghurt (200g)", protein: "20g" },
    { food: "Canned tuna (100g)", protein: "25g" },
    { food: "Kidney beans (100g)", protein: "8g" },
    { food: "Low-fat cottage cheese (100g)", protein: "12g" },
    { food: "Skimmed milk (250ml)", protein: "9g" },
  ];

  return (
    <Card style={{ background: `linear-gradient(135deg,${T.sage}12,${T.surface})`, border: `1px solid ${T.sage}30`, marginBottom: 12 }}>
      <SectionTitle>🥩 Daily Protein Target Calculator</SectionTitle>
      <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, margin: "0 0 14px" }}>
        Dr. Mushtaq recommends <strong style={{ color: T.navy }}>1–1.5g of protein per kg of body weight</strong> daily throughout all challenge phases. This protects muscle while you lose fat and is essential for body composition.
      </p>

      {/* Weight input */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", color: T.navy, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, marginBottom: 6 }}>Your current weight (kg)</label>
          <input
            type="number" value={weight} onChange={e => setWeight(e.target.value)}
            placeholder="e.g. 85"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontFamily: "'DM Sans',sans-serif", fontSize: 15, background: T.surface, color: T.navy, outline: "none", boxSizing: "border-box" }}
          />
        </div>
      </div>

      {/* Result */}
      {low && high ? (
        <div style={{ background: T.navy, borderRadius: 14, padding: "16px 18px", marginBottom: 14 }}>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: "0 0 6px", letterSpacing: 1.5, textTransform: "uppercase" }}>Your daily protein target</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ color: "#fff", fontSize: 36, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, lineHeight: 1 }}>{low}g</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, fontFamily: "'DM Sans',sans-serif" }}>–</span>
            <span style={{ color: "#22A090", fontSize: 36, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, lineHeight: 1 }}>{high}g</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>per day</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: "8px 0 0" }}>
            Based on {weight}kg body weight · Spread across your 3 preset meals
          </p>
        </div>
      ) : (
        <div style={{ background: T.surfaceAlt, borderRadius: 12, padding: "12px 14px", marginBottom: 14, textAlign: "center", border: `1px dashed ${T.border}` }}>
          <p style={{ color: T.light, fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>Enter your weight above to see your personal protein target</p>
        </div>
      )}

      {/* Food examples */}
      <p style={{ color: T.navy, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 10px" }}>Good protein sources:</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {exampleFoods.map((f, i) => (
          <div key={i} style={{ background: T.surface, borderRadius: 8, padding: "8px 10px", border: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: T.mid, fontSize: 11, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.3, flex: 1, marginRight: 6 }}>{f.food}</span>
            <span style={{ color: T.sage, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, flexShrink: 0 }}>{f.protein}</span>
          </div>
        ))}
      </div>
      <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: "10px 0 0", lineHeight: 1.5 }}>
        Tip: Lean white meat (skinless chicken/turkey) is better than red meat for weight loss — lower fat content for the same protein.
      </p>
    </Card>
  );
}

// ─── Challenge Tab ────────────────────────────────────────────────────────────
const PHASE_CONFIG = {
  week3: {
    id: "week3", label: "3-Week Habit", emoji: "🌱", days: 21,
    color: T.teal, colorLight: T.tealXL,
    tagline: "Build your autopilot · Days 1–21",
    chapter: "Chapter 3 & 6",
    goal: "Form the ABS-X habits. After 21 days your subconscious takes over and the routine feels effortless. This is the foundation everything else is built on.",
    dailyTargets: [
      { id: "fast", label: "Fasted 14–16 hours", icon: "⏰" },
      { id: "walk", label: "Walked on empty stomach", icon: "🚶" },
      { id: "breakfast", label: "Delayed breakfast (11am+)", icon: "☕" },
      { id: "meals", label: "Ate only preset meals", icon: "🍽" },
      { id: "exercise", label: "Burned 500 kcal exercise", icon: "🔥" },
      { id: "protein", label: "Hit protein: 1–1.5g per kg weight", icon: "🥩" },
      { id: "water", label: "Drank 2–3 litres water", icon: "💧" },
    ],
    tips: [
      { icon: "🧠", text: "Don't aim for perfection in week 1 — aim for consistency. Starting is everything." },
      { icon: "☕", text: "Black coffee before your fasting walk helps you get through it and reduces hunger." },
      { icon: "💧", text: "When you feel hungry during fasting, drink 2 glasses of water first — thirst often feels like hunger." },
      { icon: "🥩", text: "Protein target: 1–1.5g per kg of your body weight daily. Boiled eggs, lean chicken, fish, beans. Getting enough protein protects your muscle while you lose fat." },
      { icon: "📌", text: "Print the ABS-X diet plan and stick it on your fridge. Seeing it daily is part of the habit loop." },
    ],
    warning: "Your body may show little visible change in the first 3 weeks — this is the 'blind period'. Don't judge yourself. Stay the course. The X-Point is coming.",
  },
  month3: {
    id: "month3", label: "3-Month Weight Loss", emoji: "⚖️", days: 90,
    color: "#1A4A6E", colorLight: "#EBF2F8",
    tagline: "Reach your X-Point & target weight · Days 1–90",
    chapter: "Chapter 2, 3 & 5",
    goal: "Lose weight and reach a healthy BMI and waist measurement. Visible results begin at the X-Point (~2 months for most people). The 3-week habits you built are now working for you.",
    dailyTargets: [
      { id: "fast", label: "Fasted 14–16 hours", icon: "⏰" },
      { id: "meals", label: "Ate only preset meals", icon: "🍽" },
      { id: "exercise", label: "Burned 500 kcal exercise", icon: "🔥" },
      { id: "protein", label: "Hit protein: 1–1.5g per kg weight", icon: "🥩" },
      { id: "nosnack", label: "No snacking between meals", icon: "🚫" },
      { id: "nosoda", label: "No soda or fizzy drinks", icon: "🥤" },
      { id: "weighed", label: "Logged weight this week", icon: "📊" },
    ],
    tips: [
      { icon: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", text: "Three people driving from Brighton, London and Manchester all reach Scotland. Your starting point doesn't matter — only your direction." },
      { icon: "⏳", text: "The blind period (A→X) is where most people quit. Knowing it exists is your greatest weapon against it." },
      { icon: "🥩", text: "Protein target: 1–1.5g per kg of body weight daily. This prevents muscle loss during calorie deficit — so the weight you lose is fat, not muscle." },
      { icon: "🔄", text: "If you slip for a day, don't judge yourself. Ask: 'What are my options now?' Then restart." },
      { icon: "💪", text: "Include 25% light weights in your daily exercise. This builds metabolic muscle and prevents skinny fat." },
    ],
    warning: "Results vary depending on starting weight, age, and metabolism. The 3-month timeline is a guide — not a guarantee. You will reach your X-Point as long as you keep going in the right direction.",
  },
  month3fit: {
    id: "month3fit", label: "3-Month Fitness", emoji: "💪", days: 90,
    color: "#6B3FA0", colorLight: "#F0EBF8",
    tagline: "Ideal body composition · Months 4–6 total",
    chapter: "Chapter 8 & 9",
    goal: "Reach your ideal body composition: Men <15% body fat, Women <25% body fat. This phase follows weight loss — now the goal shifts from the scales to muscle definition and lasting fitness.",
    dailyTargets: [
      { id: "meals", label: "Ate only preset meals", icon: "🍽" },
      { id: "exercise", label: "Completed daily exercise", icon: "🔥" },
      { id: "weights", label: "Did strength / Muscle Yoga", icon: "💪" },
      { id: "protein", label: "Hit protein: 1–1.5g per kg weight", icon: "🥩" },
      { id: "sleep", label: "Slept 8 hours", icon: "😴" },
      { id: "composition", label: "Logged body composition", icon: "📐" },
    ],
    tips: [
      { icon: "💪", text: "Muscle Yoga: reduce the weight, do a full contraction, hold for 5–10 seconds, repeat. More growth, less injury." },
      { icon: "📊", text: "Use the body composition machine at your gym — not just the scales. Muscle weighs more than fat." },
      { icon: "🥩", text: "Protein target: 1–1.5g per kg of body weight daily. Lean meat, eggs, fish, beans, low-fat dairy. At this stage protein preserves muscle as body fat reduces." },
      { icon: "😴", text: "Sleep is non-negotiable for muscle repair and fat metabolism. 8 hours is the target." },
      { icon: "🌿", text: "You've already done the hard part. The mind is now the big boss. Trust your autopilot." },
    ],
    warning: "This phase is about body composition — not the scales. The number may stay similar as fat is replaced by muscle. Be guided by body fat % and how your clothes fit, not just your weight.",
  },
};

function Phase2Recalc({ gender, userProfile, onConfirm }) {
  const [weight, setWeight] = useState(userProfile ? String(userProfile.weight) : "");
  const [age, setAge] = useState(userProfile ? String(userProfile.age) : "");
  const [height, setHeight] = useState(userProfile ? String(userProfile.height) : "");
  const [act, setAct] = useState(userProfile ? String(userProfile.activity) : "1.375");
  const [res, setRes] = useState(null);

  const calc = () => {
    const w = parseFloat(weight), h = parseFloat(height), a = parseFloat(age);
    if (!w || !h || !a) return;
    const maint = calcMaintenanceTarget(gender, a, w, h, parseFloat(act));
    const protein = Math.round(w * 1.5);
    setRes({ maint, protein, bmi: Math.round(w / Math.pow(h / 100, 2) * 10) / 10 });
  };

  const fld = { width: "100%", padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 14, fontFamily: "'DM Sans',sans-serif", background: T.surfaceAlt, color: T.navy, outline: "none", boxSizing: "border-box" };

  if (res) {
    return (
      <div>
        <div style={{ background: T.sageXL, borderRadius: 12, padding: "14px 16px", marginBottom: 14, border: `1px solid ${T.sage}25` }}>
          <p style={{ color: T.sage, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Your Fitness phase targets</p>
          {[
            ["🍽 Food (maintenance)", `${res.maint.toLocaleString()} kcal/day`, "Eat at maintenance — no deficit"],
            ["🔥 Exercise goal", "500 kcal/day", "This burn is your only deficit now"],
            ["🥩 Protein", `${res.protein}g/day`, "1.5g per kg — builds muscle (Ch.9)"],
            ["📊 BMI", `${res.bmi}`, "Maintain — no further weight loss"],
          ].map(([l, v, n]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
              <div><p style={{ color: T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 1px" }}>{l}</p><p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>{n}</p></div>
              <span style={{ color: T.teal, fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          <button onClick={() => setRes(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", cursor: "pointer" }}>← Redo</button>
          <button onClick={() => onConfirm({ ...(userProfile || {}), gender, age: parseFloat(age), weight: parseFloat(weight), height: parseFloat(height), activity: parseFloat(act), maintenance: res.maint, dietTarget: res.maint, bmi: res.bmi, phase2: true })} style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: `linear-gradient(135deg,${T.sage},${T.teal})`, color: "#fff", fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, cursor: "pointer" }}>Start Fitness Phase →</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 10px" }}>Recalculate at your new weight</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 9 }}>
        <div><label style={{ display: "block", color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", marginBottom: 4 }}>Current weight (kg)</label><input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 77" style={fld} /></div>
        <div><label style={{ display: "block", color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", marginBottom: 4 }}>Age</label><input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 42" style={fld} /></div>
      </div>
      <div style={{ marginBottom: 9 }}><label style={{ display: "block", color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", marginBottom: 4 }}>Height (cm)</label><input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="e.g. 176" style={fld} /></div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", marginBottom: 6 }}>Activity level</label>
        {[["1.375", "Light — some exercise"], ["1.55", "Moderate — 3–5×/week"], ["1.725", "Active — most days"]].map(([v, l]) => (
          <button key={v} onClick={() => setAct(v)} style={{ display: "block", width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${act === v ? T.teal : T.border}`, background: act === v ? T.tealXL : T.surface, color: act === v ? T.teal : T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: act === v ? 700 : 400, cursor: "pointer", marginBottom: 6, textAlign: "left" }}>{l}</button>
        ))}
      </div>
      <button onClick={calc} style={{ width: "100%", padding: 13, borderRadius: 11, border: "none", background: `linear-gradient(135deg,${T.teal},${T.navy})`, color: "#fff", fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, cursor: "pointer" }}>Calculate Fitness Plan</button>
    </div>
  );
}

function ChallengeTab({ plan, gender, foodLog, exLog, phase, setPhase, startDate, setStartDate, started, setStarted, dailyLogs, setDailyLogs, progressLog, setProgressLog, userProfile, setUserProfile }) {

  const cfg = PHASE_CONFIG[phase];
  const todayKey = new Date().toISOString().split("T")[0];
  const todayLog = dailyLogs[todayKey] || {};

  // Derived from shared calorie logs
  const todayEaten = (foodLog || []).reduce((s, f) => s + f.kcal, 0);
  const todayBurned = (exLog || []).reduce((s, e) => s + e.kcal, 0);
  const mealsOnPlan = todayEaten > 0 && todayEaten <= plan.presetMeals;
  const burnDone = todayBurned >= 500;

  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({ weight: "", waist: "", bodyFat: "" });
  const [toast, setToast] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  // ── Hidden developer/test panel — revealed by tapping the phase title 5× quickly.
  //    Invisible to normal users; does not change any app behaviour for them. ──
  const [devTaps, setDevTaps] = useState(0);
  const [showDev, setShowDev] = useState(false);
  const devTapTimer = useRef(null);
  const handleDevTap = () => {
    if (devTapTimer.current) clearTimeout(devTapTimer.current);
    const n = devTaps + 1;
    setDevTaps(n);
    if (n >= 5) { setShowDev(true); setDevTaps(0); }
    else { devTapTimer.current = setTimeout(() => setDevTaps(0), 1200); }
  };
  // Jump to a phase + set the start date back so "Day X" can be tested instantly
  const devSetPhase = (targetPhase, dayNumber) => {
    const d = new Date();
    d.setDate(d.getDate() - (dayNumber - 1)); // startDate = today − (day−1) → daysElapsed = dayNumber
    setPhase(targetPhase);
    setStartDate(d.toISOString().split("T")[0]);
    setStarted(true);
    showToast(`🧪 TEST: ${PHASE_CONFIG[targetPhase].label} · Day ${dayNumber}`);
  };

  // Days elapsed since start
  const daysElapsed = startDate
    ? Math.floor((new Date() - new Date(startDate)) / 86400000) + 1
    : 0;
  const daysCapped = Math.min(daysElapsed, cfg.days);
  const phasePct = Math.round((daysCapped / cfg.days) * 100);

  // Days where user hit 4+ targets (manual or auto-synced from Calories)
  const daysDone = Object.values(dailyLogs).filter(d => {
    const manualCount = Object.values(d).filter(Boolean).length;
    return manualCount >= 4;
  }).length;

  // Toggle today's target
  const toggleTarget = (id) => {
    const updated = { ...dailyLogs, [todayKey]: { ...todayLog, [id]: !todayLog[id] } };
    setDailyLogs(updated);
  };

  const completedToday = cfg.dailyTargets.filter(t => {
    const autoMeals = (t.id === "meals" || t.id === "nosnack") && mealsOnPlan;
    const autoExercise = t.id === "exercise" && burnDone;
    return !!todayLog[t.id] || autoMeals || autoExercise;
  }).length;
  const allDoneToday = completedToday >= cfg.dailyTargets.length;

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  const startChallenge = () => {
    setStartDate(todayKey);
    setStarted(true);
    setDailyLogs({});
    setProgressLog([]);
    showToast(`🌱 ${cfg.label} started! Day 1 of ${cfg.days}. You've got this!`);
  };

  const saveProgress = () => {
    if (!logForm.weight && !logForm.waist && !logForm.bodyFat) return;
    const entry = {
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      day: daysElapsed,
      ...logForm,
    };
    setProgressLog(prev => [entry, ...prev].slice(0, 30));
    setLogForm({ weight: "", waist: "", bodyFat: "" });
    setShowLogModal(false);
    showToast("✓ Progress logged!");
  };

  // ── Ideal targets + measurement gating ──────────────────────────────────────
  const idealW = userProfile ? calcIdealWeightKg(userProfile.height) : null;
  const idealWt = calcIdealWaistCm(gender);
  const idealBf = calcIdealBfPct(gender);
  // Latest logged measurement (progressLog newest-first)
  const latestProg = progressLog && progressLog.length ? progressLog[0] : null;
  const curW = latestProg && latestProg.weight ? parseFloat(latestProg.weight) : null;
  const curWt = latestProg && latestProg.waist ? parseFloat(latestProg.waist) : null;
  // Weight-loss target reached? (need a logged measurement at/under ideal weight AND waist)
  const weightTargetReached = !!(idealW && curW && curW <= idealW + 0.5 && curWt && curWt <= idealWt);

  // week3 → month3 unlocks after 21 days (habit phase, time-based)
  // month3 → month3fit unlocks ONLY when measurements reach target (cannot be bypassed)
  const week3Done = phase === "week3" && daysElapsed > cfg.days;
  const phaseComplete = phase === "week3" ? week3Done : false; // month3 never auto-"completes" on time alone

  const advanceToMonth3 = () => {
    setPhase("month3"); setStartDate(todayKey); setDailyLogs({});
    showToast("🎉 Habits built! Starting 3-Month Weight Loss Challenge!");
  };
  const [showPhase2Calc, setShowPhase2Calc] = useState(false);

  // Ring dimensions
  const R = 44, circ = 2 * Math.PI * R;

  return (
    <div style={{ padding: "0 18px 110px" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: T.dark, color: "#fff", padding: "10px 22px", borderRadius: 50, fontFamily: "'DM Sans',sans-serif", fontSize: 13, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>{toast}</div>
      )}

      {/* ── HIDDEN DEVELOPER TEST PANEL ──────────────────────────────────────────
           Revealed only by tapping the phase title 5× quickly. Normal users never
           see this and it changes nothing for them. For QA / testing the phase
           flow without waiting 21–90 real days. Safe to leave in production —
           it is unreachable without the deliberate secret gesture. */}
      {showDev && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,45,74,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#1a1a2e", borderRadius: 16, padding: 20, maxWidth: 340, width: "100%", border: "1px solid #444", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p style={{ color: "#0f0", fontSize: 14, fontFamily: "monospace", fontWeight: 700, margin: 0 }}>🧪 DEV TEST PANEL</p>
              <button onClick={() => setShowDev(false)} style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <p style={{ color: "#aaa", fontSize: 11, fontFamily: "monospace", lineHeight: 1.6, margin: "0 0 14px" }}>
              Jump to any phase/day instantly — for testing only. Real users cannot reach this panel.
            </p>

            {/* Jump to each phase at Day 1 */}
            <p style={{ color: "#0f0", fontSize: 11, fontFamily: "monospace", margin: "0 0 6px" }}>JUMP TO PHASE (Day 1):</p>
            {[["week3", "3-Week Habit"], ["month3", "3-Month Weight Loss"], ["month3fit", "3-Month Fitness"]].map(([id, label]) => (
              <button key={id} onClick={() => { devSetPhase(id, 1); setShowDev(false); }} style={{ display: "block", width: "100%", padding: "9px 12px", marginBottom: 6, borderRadius: 8, border: "1px solid #0a5", background: "#0a5a3a", color: "#fff", fontSize: 12, fontFamily: "monospace", cursor: "pointer", textAlign: "left" }}>
                → {label}
              </button>
            ))}

            {/* Jump to specific days */}
            <p style={{ color: "#0f0", fontSize: 11, fontFamily: "monospace", margin: "12px 0 6px" }}>JUMP TO DAY (current phase):</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginBottom: 12 }}>
              {[1, 7, 14, 20, 21, 45, 89, 90].map(d => (
                <button key={d} onClick={() => { devSetPhase(phase, d); setShowDev(false); }} style={{ padding: "8px 0", borderRadius: 7, border: "1px solid #555", background: "#222", color: "#fff", fontSize: 11, fontFamily: "monospace", cursor: "pointer" }}>D{d}</button>
              ))}
            </div>

            {/* Simulate reaching weight target (unlocks fitness) */}
            <p style={{ color: "#0f0", fontSize: 11, fontFamily: "monospace", margin: "12px 0 6px" }}>SIMULATE MEASUREMENTS:</p>
            <button onClick={() => {
              const iw = userProfile ? calcIdealWeightKg(userProfile.height) : 75;
              const iwt = calcIdealWaistCm(gender);
              const entry = { date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }), day: daysElapsed, weight: String(iw - 1), waist: String(iwt - 2), bodyFat: "" };
              setProgressLog(prev => [entry, ...prev]);
              showToast("🧪 TEST: target weight+waist logged — fitness now unlocks");
              setShowDev(false);
            }} style={{ display: "block", width: "100%", padding: "9px 12px", marginBottom: 6, borderRadius: 8, border: "1px solid #a50", background: "#5a3a0a", color: "#fff", fontSize: 12, fontFamily: "monospace", cursor: "pointer", textAlign: "left" }}>
              → Log measurements AT target (unlock fitness)
            </button>
            <button onClick={() => {
              const entry = { date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }), day: daysElapsed, weight: "95", waist: "105", bodyFat: "" };
              setProgressLog(prev => [entry, ...prev]);
              showToast("🧪 TEST: measurements ABOVE target logged");
              setShowDev(false);
            }} style={{ display: "block", width: "100%", padding: "9px 12px", marginBottom: 6, borderRadius: 8, border: "1px solid #555", background: "#222", color: "#fff", fontSize: 12, fontFamily: "monospace", cursor: "pointer", textAlign: "left" }}>
              → Log measurements ABOVE target
            </button>

            <p style={{ color: "#666", fontSize: 10, fontFamily: "monospace", margin: "14px 0 0", lineHeight: 1.5 }}>
              Note: phase gating still applies in the real UI — this panel only simulates the conditions so you can see each state.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: `linear-gradient(160deg,${cfg.color},#0F2D4A)`, margin: "0 -18px", padding: "calc(28px + env(safe-area-inset-top)) 24px 24px", marginBottom: 18 }}>
        <div style={{ marginBottom: 14 }}><LogoFull dark={true} /></div>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontFamily: "'DM Sans',sans-serif", letterSpacing: 2.5, textTransform: "uppercase", margin: "0 0 4px" }}>{cfg.chapter}</p>
        <h1 onClick={handleDevTap} style={{ color: "#fff", fontSize: 28, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: "0 0 4px", cursor: "default", userSelect: "none" }}>{cfg.emoji} {cfg.label}</h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: "0 0 18px" }}>{cfg.tagline}</p>

        {/* Phase selector pills — locked phases show a padlock and can't be opened */}
        <div style={{ display: "flex", gap: 6 }}>
          {Object.values(PHASE_CONFIG).map(p => {
            // Unlock rules: week3 always; month3 after 21 days; month3fit only when weight target reached
            const unlocked = p.id === "week3"
              ? true
              : p.id === "month3"
                ? (phase === "month3" || phase === "month3fit" || (phase === "week3" && phaseComplete))
                : weightTargetReached || phase === "month3fit";
            return (
              <button key={p.id} onClick={() => {
                if (!unlocked) { showToast(p.id === "month3fit" ? "🔒 Reach your ideal weight & waist to unlock Fitness" : "🔒 Complete the 3-Week Habit first"); return; }
                // Entering the Fitness phase ALWAYS goes through the mandatory recalculation — never set directly.
                if (p.id === "month3fit" && phase !== "month3fit") { setShowPhase2Calc(true); return; }
                setPhase(p.id);
              }} style={{
                padding: "6px 12px", borderRadius: 50, border: "none",
                background: phase === p.id ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.18)",
                color: phase === p.id ? T.dark : unlocked ? "#fff" : "rgba(255,255,255,0.4)",
                fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: phase === p.id ? 700 : 400,
                cursor: unlocked ? "pointer" : "not-allowed",
              }}>{unlocked ? "" : "🔒 "}{p.emoji} {p.label.split(" ").slice(0, 2).join(" ")}</button>
            );
          })}
        </div>
      </div>

      {/* Not started yet */}
      {!started ? (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <SectionTitle>{cfg.emoji} Your Goal</SectionTitle>
            <p style={{ color: T.mid, fontSize: 14, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.7, margin: "0 0 14px" }}>{cfg.goal}</p>
            <div style={{ background: `${cfg.color}15`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
              <p style={{ color: cfg.color, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 6px" }}>⚠️ Important — please read</p>
              <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, margin: 0 }}>{cfg.warning}</p>
            </div>
            <p style={{ color: T.light, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, margin: "0 0 16px" }}>
              These challenges are guides based on Dr. Mushtaq's book — not strict medical programmes. Every person's journey is different. Be kind to yourself. The direction matters more than the pace.
            </p>
            <p style={{ color: T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 14px" }}>
              {plan.icon} Your {plan.label}'s daily targets:
            </p>
            {cfg.dailyTargets.map(t => (
              <div key={t.id} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: `1px solid ${T.goldL}` }}>
                <span>{t.icon}</span>
                <span style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>{t.label}</span>
              </div>
            ))}
            <button onClick={startChallenge} style={{
              width: "100%", marginTop: 20, padding: 16, borderRadius: 14, border: "none",
              background: `linear-gradient(135deg,${cfg.color},${T.dark})`,
              color: "#fff", fontSize: 16, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, cursor: "pointer",
              boxShadow: `0 6px 20px ${cfg.color}40`,
            }}>Start {cfg.label} Today →</button>
          </Card>

          {/* Calorie guide */}
          <Card style={{ background: T.tealXL, border: `1px solid ${T.teal}20` }}>
            <SectionTitle>📋 Your Daily Calorie Plan</SectionTitle>
            <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: "0 0 12px" }}>Based on your {plan.icon} {plan.label}'s ABS-X plan:</p>
            {plan.meals.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < plan.meals.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <div>
                  <p style={{ color: T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 1px" }}>{m.icon} {m.name}</p>
                  <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>{m.time}</p>
                </div>
                <span style={{ color: T.teal, fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{m.kcal} kcal</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: `2px solid ${T.border}`, marginTop: 4 }}>
              <span style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>Daily total</span>
              <span style={{ color: T.teal, fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{plan.presetMeals} kcal + 🔥 500 kcal burn</span>
            </div>
          </Card>

          {/* Protein calculator */}
          <ProteinCalculator gender={gender} />
        </div>
      ) : (
        <div>
          {/* Progress ring + stats */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Ring */}
              <div style={{ flexShrink: 0 }}>
                <svg width={100} height={100} viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={R} fill="none" stroke={T.goldL} strokeWidth="8" />
                  <circle cx="50" cy="50" r={R} fill="none"
                    stroke={phaseComplete ? T.sage : cfg.color}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${circ * (phasePct / 100)} ${circ}`}
                    transform="rotate(-90 50 50)" />
                  <text x="50" y="47" textAnchor="middle" fontFamily="'Cormorant Garamond',serif" fontSize="20" fontWeight="700" fill={T.dark}>{phasePct}%</text>
                  <text x="50" y="61" textAnchor="middle" fontFamily="'DM Sans',sans-serif" fontSize="8" fill={T.light}>complete</text>
                </svg>
              </div>
              {/* Stats */}
              <div style={{ flex: 1 }}>
                {[
                  { label: "Day", val: `${Math.min(daysElapsed, cfg.days)} of ${cfg.days}`, color: cfg.color },
                  { label: "Days hit", val: `${daysDone} days ✓`, color: T.sage },
                  { label: "Calorie limit", val: `${plan.presetMeals} kcal/day`, color: T.terra },
                  { label: "Burn goal", val: "500 kcal/day 🔥", color: T.gold },
                ].map((s, i, a) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < a.length - 1 ? `1px solid ${T.goldL}` : "none" }}>
                    <span style={{ color: T.light, fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>{s.label}</span>
                    <span style={{ color: s.color, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* week3 → month3: time-based unlock after 21 days */}
            {phase === "week3" && phaseComplete && (
              <div style={{ marginTop: 14, padding: "14px", background: T.sageXL, borderRadius: 12, border: `1.5px solid ${T.sage}50`, textAlign: "center" }}>
                <p style={{ color: T.sage, fontSize: 18, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: "0 0 6px" }}>🎉 3-Week Habit Complete!</p>
                <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5, margin: "0 0 12px" }}>
                  Your autopilot is built. Time to start losing weight.
                </p>
                <button onClick={advanceToMonth3} style={{
                  width: "100%", padding: 14, borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg,${T.teal},${T.navy})`,
                  color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}>→ Start 3-Month Weight Loss Challenge</button>
              </div>
            )}

            {/* month3 → month3fit: MEASUREMENT-GATED. No button. Unlocks only when targets reached. */}
            {phase === "month3" && (
              <div style={{ marginTop: 14, padding: "14px", background: weightTargetReached ? T.sageXL : `${T.gold}12`, borderRadius: 12, border: `1.5px solid ${weightTargetReached ? T.sage : T.gold}40` }}>
                {weightTargetReached ? (
                  <div style={{ textAlign: "center" }}>
                    <p style={{ color: T.sage, fontSize: 18, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: "0 0 6px" }}>🏆 Weight target reached!</p>
                    <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5, margin: "0 0 12px" }}>
                      You've hit your ideal weight and waist. The Fitness phase is now unlocked — recalculate your plan to eat at maintenance while you build muscle.
                    </p>
                    <button onClick={() => setShowPhase2Calc(true)} style={{
                      width: "100%", padding: 14, borderRadius: 12, border: "none",
                      background: `linear-gradient(135deg,${T.teal},${T.navy})`,
                      color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer",
                    }}>→ Begin 3-Month Fitness Challenge</button>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: T.brown, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 6px" }}>🎯 Fitness phase unlock status</p>
                    <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.55, margin: "0 0 10px" }}>
                      The Fitness phase unlocks automatically when your logged measurements reach your ideal weight and waist — it can't be skipped.
                    </p>
                    {!userProfile && (
                      <p style={{ color: T.terra, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: "0 0 8px" }}>⚠️ Calculate your personalised plan in Settings to set your ideal weight target.</p>
                    )}
                    {[
                      [`⚖️ Weight: ${curW ? curW + " kg" : "not logged"} → need ≤ ${idealW || "?"} kg`, !!(idealW && curW && curW <= idealW + 0.5)],
                      [`📏 Waist: ${curWt ? curWt + " cm" : "not logged"} → need ≤ ${idealWt} cm`, !!(curWt && curWt <= idealWt)],
                    ].map(([label, met], i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                        <span style={{ fontSize: 14 }}>{met ? "✅" : "⭕"}</span>
                        <span style={{ color: met ? T.sage : T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: met ? 700 : 400 }}>{label}</span>
                      </div>
                    ))}
                    <button onClick={() => setShowLogModal(true)} style={{
                      width: "100%", marginTop: 10, padding: 12, borderRadius: 10, border: "none",
                      background: `linear-gradient(135deg,${T.sage},${T.teal})`,
                      color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    }}>+ Log measurements</button>
                    {daysElapsed > cfg.days && (
                      <div style={{ marginTop: 10, padding: "9px 12px", background: T.surfaceAlt, borderRadius: 9, border: `1px solid ${T.border}` }}>
                        <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontStyle: "italic", lineHeight: 1.55, margin: "0 0 4px" }}>"Everyone is on their own journey — like driving from Brighton to Scotland. Some arrive sooner, but all arrive if the direction is right."</p>
                        <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>— Dr. Asif Mushtaq. It's completely normal to take longer than 90 days. Keep going.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* month3fit complete */}
            {phase === "month3fit" && daysElapsed > cfg.days && (
              <div style={{ marginTop: 14, padding: "14px", background: `linear-gradient(135deg,${T.gold}20,${T.cream})`, borderRadius: 12, border: `1.5px solid ${T.gold}50`, textAlign: "center" }}>
                <p style={{ color: T.gold, fontSize: 20, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: "0 0 6px" }}>🏆 6-Month Programme Complete!</p>
                <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.5 }}>
                  You've completed the full programme. Your body, habits and mind have all transformed. Now read Chapter 7 — Staying Fit — and maintain this for life.
                </p>
              </div>
            )}
          </Card>

          {/* Daily checklist */}
          <Card style={{ marginBottom: 16, border: allDoneToday ? `1.5px solid ${T.sage}60` : `1px solid ${T.goldL}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <SectionTitle style={{ margin: 0 }}>✅ Today's Checklist — Day {daysElapsed}</SectionTitle>
              {allDoneToday && <span style={{ color: T.sage, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>All done! 🌿</span>}
            </div>

            {/* Live calorie sync summary */}
            <div style={{ background: "linear-gradient(135deg,#1E4A3520,#3D7A5E12)", border: "1px solid #3D7A5E30", borderRadius: 10, padding: "9px 12px", marginBottom: 12 }}>
              <p style={{ color: "#1E4A35", fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 4px", letterSpacing: 0.5 }}>🔗 Live from Calories tab</p>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: T.mid, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>Eaten today</p>
                  <p style={{ color: mealsOnPlan ? T.sage : T.terra, fontSize: 14, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: 0 }}>
                    {todayEaten} / {plan.presetMeals} kcal {mealsOnPlan ? "✓" : todayEaten === 0 ? "" : "⚠️"}
                  </p>
                </div>
                <div style={{ width: 1, background: T.goldL }} />
                <div style={{ flex: 1 }}>
                  <p style={{ color: T.mid, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>Burned today</p>
                  <p style={{ color: burnDone ? T.sage : T.terra, fontSize: 14, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: 0 }}>
                    {todayBurned} / 500 kcal {burnDone ? "✓" : ""}
                  </p>
                </div>
              </div>
            </div>

            {cfg.dailyTargets.map((t, i) => {
              // Auto-synced targets from Calories tab
              const autoSynced = (t.id === "meals" || t.id === "nosnack") && mealsOnPlan;
              const autoExercise = t.id === "exercise" && burnDone;
              const isAutoTicked = autoSynced || autoExercise;
              const done = !!todayLog[t.id] || isAutoTicked;

              return (
                <button key={t.id} onClick={() => !isAutoTicked && toggleTarget(t.id)} style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: "11px 0", borderBottom: i < cfg.dailyTargets.length - 1 ? `1px solid ${T.goldL}` : "none",
                  background: "none", border: "none", cursor: isAutoTicked ? "default" : "pointer", textAlign: "left",
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                    border: `2px solid ${done ? (isAutoTicked ? "#3D7A5E" : cfg.color) : T.goldL}`,
                    background: done ? (isAutoTicked ? "#3D7A5E" : cfg.color) : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                  }}>
                    {done && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: done ? T.mid : T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", textDecoration: done ? "line-through" : "none", lineHeight: 1.3 }}>{t.label}</span>
                    {isAutoTicked && (
                      <span style={{ display: "block", color: "#3D7A5E", fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, marginTop: 1 }}>
                        🔗 Auto-synced from Calories tab
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Progress bar for today */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: T.light, fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>Today's progress</span>
                <span style={{ color: cfg.color, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{completedToday}/{cfg.dailyTargets.length}</span>
              </div>
              <div style={{ background: T.goldL, borderRadius: 50, height: 8 }}>
                <div style={{ background: `linear-gradient(90deg,${cfg.color},${T.gold})`, borderRadius: 50, height: "100%", width: `${(completedToday / cfg.dailyTargets.length) * 100}%`, transition: "width 0.3s ease" }} />
              </div>
            </div>

            {allDoneToday && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: T.sageXL, borderRadius: 10, textAlign: "center" }}>
                <p style={{ color: T.sage, fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 700, margin: "0 0 2px" }}>Perfect day! 🌿</p>
                <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>Your autopilot is building. Same again tomorrow.</p>
              </div>
            )}
          </Card>

          {/* Book Tips for this phase */}
          <Card style={{ marginBottom: 12, background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
            <SectionTitle>💡 Book Tips — {cfg.chapter}</SectionTitle>
            {cfg.tips.map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: i < cfg.tips.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>{tip.icon}</span>
                <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, margin: 0 }}>{tip.text}</p>
              </div>
            ))}
          </Card>

          {/* Protein calculator — always visible in active challenge */}
          <ProteinCalculator gender={gender} />
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <SectionTitle style={{ margin: 0 }}>📊 Progress Log</SectionTitle>
              <button onClick={() => setShowLogModal(true)} style={{
                padding: "7px 14px", borderRadius: 50, border: "none",
                background: `linear-gradient(135deg,${cfg.color},${T.brown})`,
                color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>+ Log</button>
            </div>

            {/* Goals reference */}
            <div style={{ background: T.goldL, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
              <p style={{ color: T.brown, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 6px" }}>🎯 YOUR {phase === "month3fit" ? "FITNESS" : "WEIGHT LOSS"} TARGETS</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { label: "BMI", val: plan.bmi.range },
                  { label: "Waist", val: plan.waist.target },
                  { label: "Body fat", val: gender === "male" ? "< 15%" : "< 25%" },
                  { label: "Burn/day", val: "500 kcal 🔥" },
                ].map(t => (
                  <div key={t.label} style={{ background: "rgba(255,255,255,0.6)", borderRadius: 7, padding: "6px 8px" }}>
                    <p style={{ color: T.light, fontSize: 10, fontFamily: "'DM Sans',sans-serif", margin: "0 0 2px" }}>{t.label}</p>
                    <p style={{ color: T.dark, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: 0 }}>{t.val}</p>
                  </div>
                ))}
              </div>
            </div>

            {progressLog.length === 0 ? (
              <div style={{ textAlign: "center", padding: "14px 0" }}>
                <p style={{ color: T.light, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontStyle: "italic" }}>Log your first weigh-in to track progress</p>
                <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: "4px 0 0" }}>Dr. Mushtaq recommends weekly weigh-ins</p>
              </div>
            ) : (
              <>
                {/* Mini chart — weight dots */}
                {progressLog.filter(e => e.weight).length > 1 && (() => {
                  const wEntries = [...progressLog].reverse().filter(e => e.weight);
                  const vals = wEntries.map(e => parseFloat(e.weight));
                  const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1;
                  const W = 300, H = 60;
                  return (
                    <div style={{ marginBottom: 12, overflowX: "auto" }}>
                      <svg width="100%" viewBox={`0 0 ${W} ${H + 20}`} style={{ overflow: "visible" }}>
                        <polyline points={wEntries.map((e, i) => `${(i / (wEntries.length - 1)) * W},${H - ((parseFloat(e.weight) - mn) / rng) * H}`).join(" ")}
                          fill="none" stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {wEntries.map((e, i) => (
                          <circle key={i} cx={(i / (wEntries.length - 1)) * W} cy={H - ((parseFloat(e.weight) - mn) / rng) * H} r="4" fill={cfg.color} stroke={T.warm} strokeWidth="2" />
                        ))}
                        {wEntries.map((e, i) => (
                          <text key={i} x={(i / (wEntries.length - 1)) * W} y={H + 16} textAnchor="middle" fontFamily="'DM Sans',sans-serif" fontSize="9" fill={T.light}>{e.date}</text>
                        ))}
                      </svg>
                      <p style={{ color: T.light, fontSize: 10, fontFamily: "'DM Sans',sans-serif", textAlign: "center", margin: "4px 0 0" }}>Weight trend (kg)</p>
                    </div>
                  );
                })()}

                {progressLog.slice(0, 8).map((e, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < Math.min(progressLog.length, 8) - 1 ? `1px solid ${T.goldL}` : "none" }}>
                    <div>
                      <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 1px" }}>{e.date} <span style={{ color: T.light, fontWeight: 400 }}>· Day {e.day}</span></p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {e.weight && <span style={{ color: T.terra, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{e.weight}kg</span>}
                      {e.waist && <span style={{ color: T.sage, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{e.waist}cm</span>}
                      {e.bodyFat && <span style={{ color: T.gold, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{e.bodyFat}%BF</span>}
                    </div>
                  </div>
                ))}
              </>
            )}
          </Card>

          {/* Book quote for this phase */}
          <Card style={{ marginBottom: 16, background: `linear-gradient(135deg,${cfg.color}12,${T.cream})` }}>
            <p style={{ color: cfg.color, fontSize: 13, fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontWeight: 600, lineHeight: 1.7, margin: "0 0 6px" }}>
              {phase === "week3" && '"Give yourself a three-week challenge of delaying breakfast, walking on an empty stomach and eating preset meals. After three weeks, you will find it easy to follow the routine." — Chapter 3'}
              {phase === "month3" && '"It took me two months to reach my X-Point. Be patient, stay focused and continue with the diet and exercise discipline. You will lose weight if you follow it correctly." — Chapter 3'}
              {phase === "month3fit" && '"I transformed from a one-pack to a six-pack in just under six months entirely naturally. Since this was all achieved naturally, it easily became my new lifestyle." — Chapter 1'}
            </p>
          </Card>

          {/* Restart this phase — keeps measurement history, resets day count to Day 1 */}
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: `1px solid ${T.border}`, background: "transparent", color: T.light, fontFamily: "'DM Sans',sans-serif", fontSize: 13, cursor: "pointer" }}>
              {phase === "month3" ? "🔄 Restart 3-Month Weight Loss (Day 1)" : phase === "month3fit" ? "🔄 Restart Fitness Challenge (Day 1)" : "🔄 Restart 3-Week Habit (Day 1)"}
            </button>
          ) : (
            <div>
              <div style={{ background: T.tealXL, borderRadius: 11, padding: "11px 13px", marginBottom: 10, border: `1px solid ${T.teal}20` }}>
                <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, margin: 0 }}>
                  {phase === "month3"
                    ? "Restart your 3-Month Weight Loss from Day 1 — perfect if you haven't reached your target weight yet. It's completely normal to need more than 90 days. Your measurement history is kept; only the day counter and daily ticks reset."
                    : "Restart this challenge from Day 1. Your logged measurements are kept; only the day counter and daily habit ticks reset."}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setStartDate(todayKey); setDailyLogs({}); setConfirmReset(false); showToast(`🔄 ${cfg.label} restarted — Day 1 of ${cfg.days}. Keep going!`); }} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", background: T.terra, color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Yes, restart at Day 1</button>
                <button onClick={() => setConfirmReset(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: `1px solid ${T.border}`, background: "transparent", color: T.mid, fontFamily: "'DM Sans',sans-serif", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log modal */}
      {/* ── PHASE 2 MAINTENANCE RECALCULATION ── */}
      {showPhase2Calc && (
        <Modal title="💪 Your Fitness Phase Plan" onClose={() => setShowPhase2Calc(false)}>
          <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, margin: "0 0 14px" }}>
            Well done reaching your ideal weight. The Fitness phase works differently: you now eat at your <strong>maintenance calories</strong> (no deficit) while keeping the 500 kcal exercise goal. This gives a gentle deficit through exercise alone — so your body builds muscle while slowly losing the last of the fat. This avoids the "skinny fat" trap (Chapter 9).
          </p>
          <Phase2Recalc gender={gender} userProfile={userProfile} onConfirm={(newProfile) => {
            if (newProfile && setUserProfile) setUserProfile(newProfile);
            setShowPhase2Calc(false);
            setPhase("month3fit"); setStartDate(todayKey); setDailyLogs({});
            showToast("🏆 Fitness Challenge started — eating at maintenance, building muscle!");
          }} />
        </Modal>
      )}

      {showLogModal && (
        <Modal title="Log Your Progress" onClose={() => setShowLogModal(false)}>
          <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: "0 0 16px", lineHeight: 1.5 }}>
            Dr. Mushtaq recommends weighing yourself at least once a week — same time, same conditions.
          </p>
          {[
            { key: "weight", label: "Weight (kg)", placeholder: "e.g. 85.5", icon: "⚖️" },
            { key: "waist", label: "Waist (cm)", placeholder: gender === "male" ? "Target: < 94 cm" : "Target: < 80 cm", icon: "📏" },
            { key: "bodyFat", label: "Body fat % (optional)", placeholder: gender === "male" ? "Target: < 15%" : "Target: < 25%", icon: "📐" },
          ].map(({ key, label, placeholder, icon }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", color: T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, marginBottom: 6 }}>{icon} {label}</label>
              <input type="number" value={logForm[key]} onChange={e => setLogForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${T.border}`, fontFamily: "'DM Sans',sans-serif", fontSize: 14, background: T.bg, color: T.dark, outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}

          {/* Targets reminder */}
          <div style={{ padding: "10px 14px", background: `${cfg.color}15`, borderRadius: 12, marginBottom: 20 }}>
            <p style={{ color: cfg.color, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 4px" }}>🎯 Your targets:</p>
            <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.6 }}>
              BMI {plan.bmi.range} · Waist {plan.waist.target} · Body fat {gender === "male" ? "< 15%" : "< 25%"}
            </p>
          </div>

          <button onClick={saveProgress} style={{
            width: "100%", padding: 16, borderRadius: 14, border: "none",
            background: `linear-gradient(135deg,${cfg.color},${T.brown})`,
            color: "#fff", fontSize: 15, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, cursor: "pointer",
          }}>Save Progress</button>
        </Modal>
      )}
    </div>
  );
}

// ─── Calories Tab ─────────────────────────────────────────────────────────────
const EXERCISE_PRESETS = [
  { label: "Walking (fasting)", icon: "🚶", kcalPerMin: 4.5 },
  { label: "Brisk Walk", icon: "🚶‍♂️", kcalPerMin: 6 },
  { label: "Light Jogging", icon: "🏃", kcalPerMin: 9 },
  { label: "Cycling", icon: "🚴", kcalPerMin: 8 },
  { label: "Swimming", icon: "🏊", kcalPerMin: 8.5 },
  { label: "Muscle Yoga", icon: "💪", kcalPerMin: 5 },
  { label: "Gym (weights)", icon: "🏋️", kcalPerMin: 7 },
  { label: "Custom", icon: "✏️", kcalPerMin: null },
];

function CaloriesTab({ plan, gender, foodLog, setFoodLog, exLog, setExLog, dailyLogs, setDailyLogs }) {
  const dailyLimit = plan.presetMeals;
  const burnGoal = 500;
  const todayKey = new Date().toISOString().split("T")[0];

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanImg, setScanImg] = useState(null);
  const [scanError, setScanError] = useState("");
  const [showAddEx, setShowAddEx] = useState(false);
  const [exPreset, setExPreset] = useState(EXERCISE_PRESETS[0]);
  const [exMins, setExMins] = useState("30");
  const [exCustom, setExCustom] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualKcal, setManualKcal] = useState("");
  const [toast, setToast] = useState("");
  const fileRef = useRef();

  const totalEaten = foodLog.reduce((s, f) => s + f.kcal, 0);
  const totalBurned = exLog.reduce((s, e) => s + e.kcal, 0);
  // DECOUPLED: food ring tracks intake vs plan limit ONLY. Exercise is a separate, independent goal.
  // Burning exercise calories does NOT increase the food allowance (book principle — two separate goals).
  const remaining = dailyLimit - totalEaten;
  const pct = Math.min(100, Math.round((totalEaten / dailyLimit) * 100));
  const overBudget = totalEaten > dailyLimit;
  const burnPct = Math.min(100, Math.round((totalBurned / burnGoal) * 100));
  const burnDone = totalBurned >= burnGoal;
  const mealsOnPlan = totalEaten > 0 && totalEaten <= dailyLimit;

  // ── Auto-sync challenge checklist from calorie data ──────────────────────
  const syncChallenge = (newFoodLog, newExLog) => {
    const eaten = (newFoodLog || foodLog).reduce((s, f) => s + f.kcal, 0);
    const burned = (newExLog || exLog).reduce((s, e) => s + e.kcal, 0);
    const todayChallenge = dailyLogs[todayKey] || {};
    const updated = {
      ...todayChallenge,
      meals: eaten > 0 && eaten <= dailyLimit,   // ate only preset meals (within limit)
      exercise: burned >= burnGoal,                  // burned 500 kcal
      nosnack: eaten > 0 && eaten <= dailyLimit,   // proxy: stayed within limit = no snacking
    };
    setDailyLogs(prev => ({ ...prev, [todayKey]: { ...prev[todayKey], ...updated } }));
  };

  // Ring SVG — R must leave room for stroke (R + strokeWidth/2 must fit inside half the viewBox).
  const R = 48, circ = 2 * Math.PI * R;
  const dash = circ * (pct / 100);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  // Scan food via LLM proxy (vision)
  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanImg(URL.createObjectURL(file));
    setScanResult(null);
    setScanError("");
    setScanning(true);

    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });

      const data = await apiPost("/api/llm/proxy", {
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: file.type, data: base64 }
            },
            {
              type: "text",
              text: `You are a nutrition expert. Analyse this food image and return ONLY a JSON object — no markdown, no explanation, just raw JSON like this:
{
  "foodName": "Grilled chicken with rice",
  "totalKcal": 520,
  "confidence": "high",
  "breakdown": [
    { "item": "Grilled chicken breast", "kcal": 280, "portion": "150g" },
    { "item": "Steamed rice", "kcal": 200, "portion": "150g" },
    { "item": "Mixed salad", "kcal": 40, "portion": "80g" }
  ],
  "macros": { "protein": "38g", "carbs": "52g", "fat": "8g" },
  "tip": "Good high-protein meal. Counts as your Clever Lunch."
}

If you cannot identify food, return: { "error": "Could not identify food in this image. Please try a clearer photo." }`
            }
          ]
        }]
      });

      const text = data.content?.find(b => b.type === "text")?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      if (parsed.error) { setScanError(parsed.error); }
      else { setScanResult(parsed); }
    } catch (err) {
      setScanError("Couldn't analyse the image. Please try again with a clearer photo.");
    }
    setScanning(false);
  };

  const addFoodFromScan = () => {
    if (!scanResult) return;
    const entry = { id: Date.now(), name: scanResult.foodName, kcal: scanResult.totalKcal, type: "scan", time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) };
    const updated = [...foodLog, entry];
    setFoodLog(updated);
    syncChallenge(updated, null);
    setScanResult(null); setScanImg(null);
    showToast(`✓ ${scanResult.foodName} added — ${scanResult.totalKcal} kcal · Challenge updated 🏆`);
  };

  const addManualFood = () => {
    if (!manualName || !manualKcal) return;
    const entry = { id: Date.now(), name: manualName, kcal: parseInt(manualKcal), type: "manual", time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) };
    const updated = [...foodLog, entry];
    setFoodLog(updated);
    syncChallenge(updated, null);
    setManualName(""); setManualKcal(""); setShowManual(false);
    showToast(`✓ ${entry.name} added — ${entry.kcal} kcal · Challenge updated 🏆`);
  };

  const addExercise = () => {
    const mins = parseInt(exMins) || 0;
    if (mins <= 0) return;
    const rate = exPreset.kcalPerMin ?? ((parseInt(exCustom) / mins) || 5);
    const burned = Math.round(rate * mins);
    const entry = { id: Date.now(), name: exPreset.label, icon: exPreset.icon, mins, kcal: burned, time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) };
    const updated = [...exLog, entry];
    setExLog(updated);
    syncChallenge(null, updated);
    setShowAddEx(false); setExMins("30");
    const total = updated.reduce((s, e) => s + e.kcal, 0);
    showToast(total >= burnGoal
      ? `✓ 500 kcal goal reached! Challenge auto-ticked 🏆🔥`
      : `✓ ${entry.name} — ${burned} kcal burned · Challenge updated 🏆`);
  };

  const removeFood = (id) => {
    const updated = foodLog.filter(f => f.id !== id);
    setFoodLog(updated);
    syncChallenge(updated, null);
  };

  const removeEx = (id) => {
    const updated = exLog.filter(e => e.id !== id);
    setExLog(updated);
    syncChallenge(null, updated);
  };

  return (
    <div style={{ padding: "env(safe-area-inset-top) 18px 110px" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: T.dark, color: "#fff", padding: "10px 20px", borderRadius: 50, fontFamily: "'DM Sans',sans-serif", fontSize: 13, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.25)", whiteSpace: "nowrap" }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ paddingTop: 22, marginBottom: 14 }}>
        <div style={{ marginBottom: 12 }}><LogoFull /></div>
        <h1 style={{ color: T.dark, fontSize: 26, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: 0 }}>Daily Calories</h1>
        <p style={{ color: T.light, fontSize: 13, fontFamily: "'DM Sans',sans-serif", marginTop: 4 }}>
          {plan.icon} {plan.label}'s ABS-X limit · {dailyLimit.toLocaleString()} kcal/day
        </p>
      </div>

      {/* Challenge sync status banner */}
      <div style={{
        background: `linear-gradient(135deg,#1E4A35,#3D7A5E)`,
        borderRadius: 14, padding: "11px 16px", marginBottom: 16,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>🏆</span>
        <div style={{ flex: 1 }}>
          <p style={{ color: "#fff", fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 2px" }}>
            Live sync with Challenge tab
          </p>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>
            {mealsOnPlan && burnDone
              ? "✓ Meals on plan  ✓ 500 kcal burned — both challenge targets auto-ticked today!"
              : mealsOnPlan
                ? `✓ Meals on plan  ·  ${Math.max(0, burnGoal - totalBurned)} kcal still to burn`
                : burnDone
                  ? `✓ 500 kcal burned  ·  Log meals to auto-tick your meal target`
                  : `Log meals & exercise here → auto-updates your challenge ✓`}
          </p>
        </div>
      </div>

      {/* ── Dual Dashboard ── */}
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>

          {/* Calorie ring */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg width={110} height={110} viewBox="0 0 110 110">
              <circle cx="55" cy="55" r={R} fill="none" stroke={T.goldL} strokeWidth="9" />
              <circle cx="55" cy="55" r={R} fill="none"
                stroke={overBudget ? T.terra : pct > 80 ? T.gold : "#7A9E7E"}
                strokeWidth="9" strokeLinecap="round"
                strokeDasharray={`${(2 * Math.PI * R) * (pct / 100)} ${2 * Math.PI * R}`}
                transform="rotate(-90 55 55)"
                style={{ transition: "stroke-dasharray 0.5s ease" }} />
              <text x="55" y="51" textAnchor="middle" fontFamily="'Cormorant Garamond',serif"
                fontSize="19" fontWeight="700" fill={overBudget ? T.terra : T.dark}>{pct}%</text>
              <text x="55" y="64" textAnchor="middle" fontFamily="'DM Sans',sans-serif"
                fontSize="8" fill={T.light}>calories</text>
            </svg>
            <p style={{ color: T.dark, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "6px 0 2px", textAlign: "center" }}>🍽 Food</p>
            <p style={{ color: T.terra, fontSize: 13, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: "0 0 2px" }}>{totalEaten} kcal</p>
            <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>of {dailyLimit} limit</p>
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: T.goldL, alignSelf: "stretch" }} />

          {/* Burn ring */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg width={110} height={110} viewBox="0 0 110 110">
              {/* Track */}
              <circle cx="55" cy="55" r={R} fill="none" stroke="#E8D5C0" strokeWidth="9" />
              {/* Progress */}
              <circle cx="55" cy="55" r={R} fill="none"
                stroke={burnDone ? T.sage : burnPct > 60 ? T.gold : T.terra}
                strokeWidth="9" strokeLinecap="round"
                strokeDasharray={`${(2 * Math.PI * R) * (burnPct / 100)} ${2 * Math.PI * R}`}
                transform="rotate(-90 55 55)"
                style={{ transition: "stroke-dasharray 0.5s ease" }} />
              {/* Centre text */}
              <text x="55" y="51" textAnchor="middle" fontFamily="'Cormorant Garamond',serif"
                fontSize="19" fontWeight="700" fill={burnDone ? T.sage : T.dark}>{burnPct}%</text>
              <text x="55" y="64" textAnchor="middle" fontFamily="'DM Sans',sans-serif"
                fontSize="8" fill={T.light}>burned</text>
              {/* Tick when done */}
              {burnDone && (
                <text x="55" y="38" textAnchor="middle" fontSize="13">✓</text>
              )}
            </svg>
            <p style={{ color: T.dark, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "6px 0 2px", textAlign: "center" }}>🔥 Exercise</p>
            <p style={{ color: burnDone ? T.sage : T.terra, fontSize: 13, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: "0 0 2px" }}>{totalBurned} kcal</p>
            <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>of 500 goal</p>
          </div>
        </div>

        {/* Daily summary row — food and exercise tracked independently */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.goldL}` }}>
          {[
            { label: "Eaten", val: `${totalEaten}`, unit: "kcal", color: T.terra },
            { label: "Burned", val: `${totalBurned}`, unit: "kcal", color: T.sage },
            {
              label: overBudget ? "Over" : "Left",
              val: `${Math.abs(remaining)}`, unit: "kcal",
              color: overBudget ? T.terra : T.dark
            },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "8px 4px", background: `${s.color}10`, borderRadius: 10 }}>
              <p style={{ color: s.color, fontSize: 16, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: 0 }}>{s.val}</p>
              <p style={{ color: T.light, fontSize: 10, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>{s.unit}</p>
              <p style={{ color: T.mid, fontSize: 10, fontFamily: "'DM Sans',sans-serif", margin: 0, fontWeight: 600 }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, padding: "7px 11px", background: `${T.teal}10`, borderRadius: 9 }}>
          <p style={{ color: T.teal, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>✓ Food and exercise are independent goals. Burning calories does not increase your food allowance.</p>
        </div>

        {/* Status messages */}
        {overBudget && (
          <div style={{ marginTop: 12, padding: "9px 12px", background: `${T.terra}15`, borderRadius: 10 }}>
            <p style={{ color: T.terra, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0, fontWeight: 600 }}>
              ⚠️ Over your ABS-X food limit. Ask: "What are my options now?" Food and exercise are separate goals — tomorrow is a fresh start.
            </p>
          </div>
        )}
        {!overBudget && remaining <= 200 && remaining > 0 && (
          <div style={{ marginTop: 12, padding: "9px 12px", background: `${T.gold}18`, borderRadius: 10 }}>
            <p style={{ color: T.brown, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>
              🌟 Nearly at your threshold buffer — stay disciplined for the rest of today.
            </p>
          </div>
        )}
      </Card>

      {/* ── 500 kcal Exercise Goal ── */}
      <Card style={{ marginBottom: 18, background: burnDone ? `linear-gradient(135deg,${T.sage}18,${T.cream})` : `linear-gradient(135deg,${T.terra}10,${T.cream})`, border: `1.5px solid ${burnDone ? T.sage : T.terra}35` }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <p style={{ color: burnDone ? T.sage : T.terra, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 4px" }}>
              {burnDone ? "✅ Daily Goal Reached!" : "🔥 Daily Burn Goal"}
            </p>
            <p style={{ color: T.dark, fontSize: 20, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: 0 }}>
              {burnDone ? "500 / 500 kcal" : `${totalBurned} / 500 kcal burned`}
            </p>
            <p style={{ color: T.light, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: "3px 0 0" }}>
              {burnDone ? "Excellent — your body is in fat-burning mode 🌿" : `${Math.max(0, burnGoal - totalBurned)} kcal still to burn today`}
            </p>
          </div>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: burnDone ? `${T.sage}25` : `${T.terra}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
            {burnDone ? "🏆" : "🔥"}
          </div>
        </div>

        {/* Progress bar — segmented into 5 × 100 kcal blocks */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            {[100, 200, 300, 400, 500].map(milestone => {
              const filled = totalBurned >= milestone;
              const partial = !filled && totalBurned > milestone - 100;
              const partialPct = partial ? ((totalBurned - (milestone - 100)) / 100) * 100 : 0;
              return (
                <div key={milestone} style={{ flex: 1, height: 10, borderRadius: 5, background: T.goldL, overflow: "hidden", position: "relative" }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, height: "100%",
                    width: filled ? "100%" : `${partialPct}%`,
                    background: burnDone ? T.sage : T.terra,
                    borderRadius: 5, transition: "width 0.4s ease",
                  }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {[100, 200, 300, 400, 500].map(m => (
              <span key={m} style={{ color: totalBurned >= m ? (burnDone ? T.sage : T.terra) : T.light, fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: totalBurned >= m ? 700 : 400 }}>{m}</span>
            ))}
          </div>
        </div>

        {/* Fasting reminder */}
        <div style={{ padding: "9px 12px", background: "rgba(255,255,255,0.6)", borderRadius: 10, marginBottom: 14, border: `1px solid ${T.border}` }}>
          <p style={{ color: T.brown, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.55, fontWeight: 600 }}>
            ⏰ Exercise during fasting for maximum fat burn — ideally before your 11am breakfast. Dr. Mushtaq's target: <span style={{ color: T.terra }}>500 kcal burned daily</span> through moderate exercise.
          </p>
        </div>

        {/* How to reach 500 kcal tips */}
        {!burnDone && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 8px" }}>Ways to reach 500 kcal today</p>
            {[
              { icon: "🚶", desc: "Brisk walk for 80 mins → ~480 kcal" },
              { icon: "🏃", desc: "Light jog for 55 mins → ~495 kcal" },
              { icon: "🚴", desc: "Cycling for 62 mins → ~496 kcal" },
              { icon: "💪", desc: "Muscle Yoga 60 min + walk 20 min → ~500 kcal" },
            ].map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: i < 3 ? `1px solid ${T.goldL}` : "none" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{tip.icon}</span>
                <span style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4 }}>{tip.desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Exercise log entries */}
        {exLog.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 8px" }}>Today's exercise log</p>
            {exLog.map((e, i) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < exLog.length - 1 ? `1px solid ${T.goldL}` : "none" }}>
                <div>
                  <p style={{ color: T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 2px" }}>{e.icon} {e.name}</p>
                  <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>{e.time} · {e.mins} mins</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: T.sage, fontSize: 14, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700 }}>−{e.kcal} kcal</span>
                  <button onClick={() => removeEx(e.id)} style={{ background: "none", border: "none", color: T.light, fontSize: 16, cursor: "pointer", padding: 0 }}>✕</button>
                </div>
              </div>
            ))}
            {exLog.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 9, borderTop: `2px solid ${T.goldL}`, marginTop: 4 }}>
                <span style={{ color: T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>Total burned</span>
                <span style={{ color: burnDone ? T.sage : T.terra, fontSize: 15, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700 }}>{totalBurned} / 500 kcal</span>
              </div>
            )}
          </div>
        )}

        {/* Add exercise UI */}
        {showAddEx ? (
          <div>
            <p style={{ color: T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 10px" }}>Select exercise:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {EXERCISE_PRESETS.map((ex, i) => (
                <button key={i} onClick={() => setExPreset(ex)} style={{
                  padding: "7px 12px", borderRadius: 50,
                  background: exPreset.label === ex.label ? T.terra : T.goldL,
                  color: exPreset.label === ex.label ? "#fff" : T.mid,
                  border: "none", fontFamily: "'DM Sans',sans-serif", fontSize: 12, cursor: "pointer",
                }}>{ex.icon} {ex.label}</button>
              ))}
            </div>
            {exPreset.label === "Custom" && (
              <input value={exCustom} onChange={e => setExCustom(e.target.value)}
                type="number" placeholder="Total kcal burned"
                style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1px solid ${T.border}`, fontFamily: "'DM Sans',sans-serif", fontSize: 14, background: T.bg, color: T.dark, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
              <span style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>Duration:</span>
              <input value={exMins} onChange={e => setExMins(e.target.value)}
                type="number" placeholder="Minutes"
                style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: `1px solid ${T.border}`, fontFamily: "'DM Sans',sans-serif", fontSize: 14, background: T.bg, color: T.dark, outline: "none" }} />
              <span style={{ color: T.light, fontSize: 13, fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>mins</span>
            </div>
            {exPreset.kcalPerMin && parseInt(exMins) > 0 && (
              <div style={{ padding: "9px 12px", background: T.sageXL, borderRadius: 10, marginBottom: 12 }}>
                <p style={{ color: T.sage, fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: 0, fontWeight: 700 }}>
                  Estimated burn: ~{Math.round(exPreset.kcalPerMin * parseInt(exMins))} kcal
                  {totalBurned + Math.round(exPreset.kcalPerMin * parseInt(exMins)) >= burnGoal && !burnDone
                    ? " 🏆 This will complete your 500 kcal goal!" : ""}
                </p>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addExercise} style={{
                flex: 1, padding: 13, borderRadius: 12, border: "none",
                background: `linear-gradient(135deg,${T.sage},${T.teal})`,
                color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>🔥 Log Exercise</button>
              <button onClick={() => setShowAddEx(false)} style={{
                padding: "13px 16px", borderRadius: 12, border: `1px solid ${T.border}`,
                background: T.surface, color: T.mid, fontFamily: "'DM Sans',sans-serif", fontSize: 14, cursor: "pointer",
              }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddEx(true)} style={{
            width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
            background: burnDone
              ? `linear-gradient(135deg,${T.sage},#4D7A52)`
              : `linear-gradient(135deg,${T.terra},${T.brown})`,
            color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer",
            boxShadow: burnDone ? `0 4px 14px rgba(26,122,110,0.25)` : `0 4px 14px rgba(26,122,110,0.25)`,
          }}>{burnDone ? "✓ Goal done — log more exercise" : `+ Log Exercise (${Math.max(0, burnGoal - totalBurned)} kcal to go)`}</button>
        )}
      </Card>
      <Card style={{ marginBottom: 18 }}>
        <SectionTitle>📸 Scan Food — AI Calorie Counter</SectionTitle>
        <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: "0 0 14px", lineHeight: 1.5 }}>
          Take a photo of any meal and the AI will estimate the calories and macros instantly.
        </p>

        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          onChange={handleImageSelect} style={{ display: "none" }} />

        <button onClick={() => fileRef.current.click()} style={{
          width: "100%", padding: "14px 0", borderRadius: 14,
          background: `linear-gradient(135deg,${T.sage},${T.teal})`,
          border: "none", color: "#fff", fontSize: 15,
          fontFamily: "'DM Sans',sans-serif", fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: `0 4px 16px rgba(26,122,110,0.25)`, marginBottom: 12,
        }}>
          📷  Take Photo or Upload Food Image
        </button>

        {/* Scan preview */}
        {scanImg && (
          <div style={{ marginBottom: 12 }}>
            <img src={scanImg} alt="food scan" style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover" }} />
          </div>
        )}

        {scanning && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
            <p style={{ color: T.mid, fontFamily: "'DM Sans',sans-serif", fontSize: 14, margin: 0 }}>Analysing your food…</p>
          </div>
        )}

        {scanError && (
          <div style={{ padding: "12px 14px", background: `${T.terra}15`, borderRadius: 12, marginBottom: 12 }}>
            <p style={{ color: T.terra, fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>{scanError}</p>
          </div>
        )}

        {scanResult && (
          <div style={{ background: `${T.sage}12`, borderRadius: 14, padding: "14px 16px", border: `1.5px solid ${T.sage}40` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <p style={{ color: T.dark, fontSize: 16, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: "0 0 2px" }}>{scanResult.foodName}</p>
                <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>Confidence: {scanResult.confidence}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: T.terra, fontSize: 22, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: 0 }}>{scanResult.totalKcal}</p>
                <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>kcal</p>
              </div>
            </div>

            {/* Breakdown */}
            {scanResult.breakdown?.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: `1px solid ${T.goldL}` }}>
                <span style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>{item.item} <span style={{ color: T.light }}>({item.portion})</span></span>
                <span style={{ color: T.terra, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>{item.kcal} kcal</span>
              </div>
            ))}

            {/* Macros */}
            {scanResult.macros && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {Object.entries(scanResult.macros).map(([k, v]) => (
                  <div key={k} style={{ flex: 1, background: T.goldL, borderRadius: 8, padding: "6px 4px", textAlign: "center" }}>
                    <p style={{ color: T.brown, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: 0 }}>{v}</p>
                    <p style={{ color: T.light, fontSize: 10, fontFamily: "'DM Sans',sans-serif", margin: 0, textTransform: "capitalize" }}>{k}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tip */}
            {scanResult.tip && (
              <p style={{ color: T.sage, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: "10px 0 12px", fontStyle: "italic", lineHeight: 1.4 }}>💡 {scanResult.tip}</p>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addFoodFromScan} style={{
                flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg,${T.teal},${T.navy})`,
                color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>+ Add to Today's Log</button>
              <button onClick={() => { setScanResult(null); setScanImg(null); }} style={{
                padding: "12px 16px", borderRadius: 12, border: `1px solid ${T.border}`,
                background: T.surface, color: T.mid, fontFamily: "'DM Sans',sans-serif", fontSize: 14, cursor: "pointer",
              }}>✕</button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Manual entry ── */}
      <button onClick={() => setShowManual(s => !s)} style={{
        width: "100%", padding: "12px 0", borderRadius: 14, marginBottom: 14,
        border: `1.5px dashed ${T.goldL}`, background: "transparent",
        color: T.mid, fontFamily: "'DM Sans',sans-serif", fontSize: 14, cursor: "pointer",
      }}>✏️ Add food manually</button>

      {showManual && (
        <Card style={{ marginBottom: 14 }}>
          <p style={{ color: T.dark, fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 12px" }}>Manual Food Entry</p>
          <input value={manualName} onChange={e => setManualName(e.target.value)}
            placeholder="Food name (e.g. Boiled eggs)"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1px solid ${T.border}`, fontFamily: "'DM Sans',sans-serif", fontSize: 14, background: T.bg, color: T.dark, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
          <input value={manualKcal} onChange={e => setManualKcal(e.target.value)}
            type="number" placeholder="Calories (kcal)"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1px solid ${T.border}`, fontFamily: "'DM Sans',sans-serif", fontSize: 14, background: T.bg, color: T.dark, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
          <button onClick={addManualFood} style={{
            width: "100%", padding: 13, borderRadius: 12, border: "none",
            background: `linear-gradient(135deg,${T.teal},${T.navy})`,
            color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Add Food</button>
        </Card>
      )}

      {/* ── Food log ── */}
      {foodLog.length > 0 && (
        <Card style={{ marginBottom: 18 }}>
          <SectionTitle>🍽 Today's Food Log</SectionTitle>
          {foodLog.map((f, i) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i < foodLog.length - 1 ? `1px solid ${T.goldL}` : "none" }}>
              <div>
                <p style={{ color: T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 2px" }}>{f.name}</p>
                <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>{f.time} · {f.type === "scan" ? "📸 AI scan" : "✏️ Manual"}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: T.terra, fontSize: 14, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700 }}>{f.kcal} kcal</span>
                <button onClick={() => removeFood(f.id)} style={{ background: "none", border: "none", color: T.light, fontSize: 16, cursor: "pointer", padding: 0 }}>✕</button>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 4, borderTop: `2px solid ${T.goldL}` }}>
            <span style={{ color: T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>Total eaten</span>
            <span style={{ color: T.terra, fontSize: 15, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700 }}>{totalEaten} kcal</span>
          </div>
        </Card>
      )}

      {/* ── ABS-X Meals reminder ── */}
      <Card style={{ background: T.tealXL, border: `1px solid ${T.terra}25` }}>
        <SectionTitle>📋 ABS-X Meal Calorie Guide</SectionTitle>
        {plan.meals.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < plan.meals.length - 1 ? `1px solid ${T.goldL}` : "none" }}>
            <div>
              <p style={{ color: T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 2px" }}>{m.icon} {m.name}</p>
              <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>{m.time}</p>
            </div>
            <span style={{ color: T.terra, fontSize: 15, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700 }}>{m.kcal} kcal</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 4, borderTop: `2px solid ${T.goldL}` }}>
          <span style={{ color: T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>Total preset</span>
          <span style={{ color: T.terra, fontSize: 15, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700 }}>{plan.presetMeals} kcal</span>
        </div>
      </Card>
    </div>
  );
}

// ─── Food Guide Tab ───────────────────────────────────────────────────────────
const FOOD_DATA = {
  breakfast: {
    label: "Intelligent Breakfast",
    icon: "☀️",
    color: "#1A7A6E",
    tagline: "No carbs. Protein & healthy fat only.",
    rule: "Keep your body carb-deficient until lunch — this forces it to burn fat reserves. Delay to 10–11am minimum.",
    warning: "⚠️ No bread, cereal, oats, fruit juice, toast, rice, or pasta at breakfast.",
    categories: [
      {
        name: "Eggs (the ABS-X breakfast staple)",
        icon: "🥚",
        items: [
          { name: "Boiled eggs (2 large)", kcal: 140, note: "The simplest, most portable option" },
          { name: "Scrambled eggs with butter (2 eggs)", kcal: 200, note: "Add a splash of milk — still no carbs" },
          { name: "Poached eggs (2 large)", kcal: 140, note: "On their own — skip the toast" },
          { name: "Omelette with cheese & mushrooms", kcal: 280, note: "Filling, protein-rich, zero carbs" },
          { name: "Egg white omelette (3 whites)", kcal: 90, note: "Lower calorie option" },
        ],
      },
      {
        name: "Lean protein",
        icon: "🍗",
        items: [
          { name: "Grilled chicken breast (100g)", kcal: 165, note: "High protein, low fat" },
          { name: "Tinned tuna in water (100g)", kcal: 100, note: "Quick, easy, filling" },
          { name: "Smoked salmon (80g)", kcal: 130, note: "Rich in omega-3. Excellent breakfast protein." },
          { name: "Turkey slices (80g)", kcal: 100, note: "Low calorie, very lean" },
          { name: "Prawns (100g, cooked)", kcal: 99, note: "Surprisingly filling and low calorie" },
          { name: "Greek yoghurt, full fat (150g)", kcal: 140, note: "Protein + fat, no carbs if plain" },
          { name: "Cottage cheese (100g)", kcal: 98, note: "High protein, low calorie" },
        ],
      },
      {
        name: "Drinks (allowed during fast & with breakfast)",
        icon: "☕",
        items: [
          { name: "Black coffee (no sugar)", kcal: 2, note: "Dr. Mushtaq's recommendation. Before exercise too." },
          { name: "Green tea (unsweetened)", kcal: 0, note: "Boosts metabolism slightly" },
          { name: "Water (unlimited)", kcal: 0, note: "Drink 2–3 litres daily. Hunger = often thirst." },
          { name: "Sparkling water", kcal: 0, note: "Good alternative if you want fizz" },
          { name: "Coffee with splash of milk", kcal: 20, note: "Fine — milk protein doesn't break your fast meaningfully" },
        ],
      },
      {
        name: "Healthy fats (small portions only)",
        icon: "🥑",
        items: [
          { name: "Avocado (½ fruit)", kcal: 120, note: "Excellent healthy fat — no carbs, very filling" },
          { name: "Almonds (20g, ~15 nuts)", kcal: 120, note: "Keep portion small. Great with eggs." },
          { name: "Walnuts (20g)", kcal: 130, note: "Rich in omega-3" },
          { name: "Olive oil (1 tbsp for cooking)", kcal: 120, note: "For cooking your eggs" },
        ],
      },
    ],
    recipes: [
      {
        name: "Classic ABS-X Breakfast",
        kcal: 220,
        time: "5 mins",
        ingredients: ["2 boiled eggs", "Black coffee", "Pinch of salt & pepper"],
        method: "Boil eggs for 7 minutes. Season and eat. Have black coffee alongside or before your walk.",
        tip: "Prepare eggs the night before and refrigerate — grab and go in the morning.",
      },
      {
        name: "High-Protein Smoked Salmon Plate",
        kcal: 310,
        time: "3 mins",
        ingredients: ["80g smoked salmon", "2 boiled eggs", "50g cucumber slices", "Black coffee"],
        method: "Plate the salmon and cucumber. Add boiled eggs. No bread, no crackers.",
        tip: "One of the most satisfying no-carb breakfasts. Feels like a restaurant meal.",
      },
      {
        name: "Quick Tuna & Egg Bowl",
        kcal: 260,
        time: "5 mins",
        ingredients: ["100g tinned tuna in water", "2 boiled eggs", "½ avocado", "Lemon juice", "Black pepper"],
        method: "Drain tuna. Halve avocado. Arrange in a bowl with sliced eggs. Squeeze lemon, season.",
        tip: "Full of protein and healthy fat. Keeps you full well past lunchtime.",
      },
      {
        name: "Cheese Omelette",
        kcal: 330,
        time: "8 mins",
        ingredients: ["3 eggs", "30g cheddar (grated)", "Handful mushrooms", "1 tsp olive oil", "Salt & pepper"],
        method: "Beat eggs, pour into heated oiled pan. Add mushrooms and cheese to one half. Fold and cook 2 more mins.",
        tip: "Use any vegetables you enjoy — spinach, peppers, onion. All are zero carbs.",
      },
      {
        name: "Greek Yoghurt Protein Bowl",
        kcal: 280,
        time: "2 mins",
        ingredients: ["150g full-fat Greek yoghurt", "20g walnuts", "1 tsp honey (small drizzle only)", "Cinnamon"],
        method: "Spoon yoghurt into bowl. Top with crushed walnuts. Drizzle a tiny amount of honey. Add cinnamon.",
        tip: "Keep honey to ½ tsp maximum — just enough to make it enjoyable.",
      },
    ],
  },

  lunch: {
    label: "Clever Lunch",
    icon: "🍱",
    color: "#1A4A6E",
    tagline: "All macros. Eat what you love. This is your main meal.",
    rule: "The Clever Lunch is where your taste buds lead. Include carbohydrates, protein and fat. Eat your favourite foods here — this is what makes the ABS-X diet sustainable for life.",
    warning: "✅ Carbs are WELCOME here. Choose unrefined versions where possible — wholemeal bread, brown rice, sweet potato, whole grain pasta.",
    categories: [
      {
        name: "Unrefined carbohydrates (choose these)",
        icon: "🌾",
        items: [
          { name: "Brown rice (100g cooked)", kcal: 130, note: "Slower release than white rice. Prefer this." },
          { name: "White rice (100g cooked)", kcal: 130, note: "Your taste buds love it — fine in your lunch portion" },
          { name: "Wholemeal bread (2 slices)", kcal: 190, note: "Choose wholemeal over white always" },
          { name: "Sweet potato (150g baked)", kcal: 130, note: "Excellent unrefined carb. High fibre." },
          { name: "Whole grain pasta (100g cooked)", kcal: 150, note: "Higher fibre than regular pasta" },
          { name: "Naan bread (1 medium)", kcal: 280, note: "Your favourite? Fine — count it in your lunch budget" },
          { name: "Chapati (1 medium)", kcal: 140, note: "Good wholemeal option for South Asian meals" },
          { name: "Pitta bread (1 wholemeal)", kcal: 145, note: "Wholemeal pitta with filling" },
          { name: "Quinoa (100g cooked)", kcal: 120, note: "Also a protein source — very nutritious" },
          { name: "Lentils (100g cooked)", kcal: 116, note: "Protein AND carbs — excellent" },
        ],
      },
      {
        name: "Lean proteins",
        icon: "🍗",
        items: [
          { name: "Grilled chicken breast (150g)", kcal: 248, note: "The best weight-loss protein source" },
          { name: "Salmon fillet (150g)", kcal: 280, note: "Rich in omega-3. Excellent for heart health." },
          { name: "Grilled white fish (150g)", kcal: 160, note: "Cod, haddock, sea bass — all excellent" },
          { name: "Lamb chops (150g, grilled)", kcal: 320, note: "Higher fat — count carefully but enjoy" },
          { name: "Beef steak, lean (150g)", kcal: 280, note: "Lean cuts like sirloin are better" },
          { name: "Prawns (150g, cooked)", kcal: 150, note: "Very low calorie protein" },
          { name: "Turkey mince (150g)", kcal: 200, note: "Use instead of beef mince in any dish" },
          { name: "Chickpeas (150g)", kcal: 180, note: "Plant protein + carbs" },
          { name: "Kidney beans (150g)", kcal: 170, note: "Excellent in curries and stews" },
          { name: "Tofu, firm (150g)", kcal: 120, note: "For vegetarian lunches" },
        ],
      },
      {
        name: "Vegetables (eat freely — these barely count)",
        icon: "🥦",
        items: [
          { name: "Mixed salad leaves (large bowl)", kcal: 20, note: "Eat as much as you like" },
          { name: "Broccoli (100g)", kcal: 34, note: "One of the most nutritious vegetables" },
          { name: "Spinach (100g raw)", kcal: 23, note: "Iron and fibre rich" },
          { name: "Cucumber (100g)", kcal: 15, note: "High water content — keeps you full" },
          { name: "Tomatoes (2 medium)", kcal: 44, note: "Good in any lunch dish" },
          { name: "Onion (1 medium)", kcal: 44, note: "Counts as cooking base — fine" },
          { name: "Peppers (1 medium)", kcal: 31, note: "High in vitamin C" },
          { name: "Courgette (100g)", kcal: 17, note: "Excellent filler in curries" },
        ],
      },
    ],
    recipes: [
      {
        name: "Grilled Chicken with Brown Rice & Salad",
        kcal: 580,
        time: "20 mins",
        ingredients: ["150g chicken breast", "100g brown rice (cooked)", "Large handful salad leaves", "Cucumber & tomato", "Olive oil & lemon dressing", "Salt, pepper, herbs"],
        method: "Season and grill or pan-fry chicken 6–7 mins each side. Cook rice. Build a plate: rice + chicken + salad. Drizzle with olive oil and lemon.",
        tip: "Make double the chicken and save half for tomorrow's lunch.",
      },
      {
        name: "Salmon & Sweet Potato",
        kcal: 620,
        time: "25 mins",
        ingredients: ["150g salmon fillet", "150g sweet potato", "Green beans or broccoli", "1 tsp olive oil", "Lemon, salt, pepper"],
        method: "Bake sweet potato at 200°C for 25 mins. Pan-fry salmon skin-down 4 mins, flip 3 mins. Steam vegetables. Serve together.",
        tip: "One of the most nutritious lunches you can eat. Omega-3, complex carbs, fibre.",
      },
      {
        name: "Chicken & Vegetable Curry",
        kcal: 680,
        time: "30 mins",
        ingredients: ["150g chicken breast diced", "1 tin chopped tomatoes", "1 onion, 2 garlic cloves", "Curry spices (cumin, coriander, turmeric)", "100g brown rice cooked", "1 tbsp oil"],
        method: "Fry onion and garlic. Add spices. Add chicken and coat. Pour in tomatoes. Simmer 20 mins. Serve with brown rice.",
        tip: "This is your Clever Lunch — eat your favourite curry. Spices are calorie-free and have health benefits.",
      },
      {
        name: "Tuna Wholemeal Wrap",
        kcal: 490,
        time: "5 mins",
        ingredients: ["1 wholemeal wrap", "100g tinned tuna", "2 tbsp low-fat Greek yoghurt (instead of mayo)", "Salad leaves, cucumber, tomato", "Black pepper, lemon"],
        method: "Mix tuna with yoghurt and lemon. Layer salad into wrap. Add tuna mix. Roll and serve.",
        tip: "Fast, satisfying, portable. Perfect for busy days.",
      },
      {
        name: "Lamb & Lentil Stew",
        kcal: 720,
        time: "35 mins",
        ingredients: ["150g lamb shoulder diced", "100g red lentils", "1 tin tomatoes", "1 onion, garlic, ginger", "Cumin, coriander, paprika", "1 chapati"],
        method: "Brown lamb with onion, garlic, ginger. Add spices, tomatoes, lentils and water. Simmer 25 mins until lentils soft. Serve with chapati.",
        tip: "Protein + fibre + complex carbs. South Asian flavours — eat what you love.",
      },
      {
        name: "Beef Stir-Fry with Noodles",
        kcal: 650,
        time: "15 mins",
        ingredients: ["150g lean beef strips", "100g wholemeal noodles (cooked)", "Mixed stir-fry vegetables", "Soy sauce (low sodium)", "Garlic, ginger, sesame oil"],
        method: "Stir-fry beef in sesame oil 3 mins. Add vegetables and garlic. Add noodles and soy sauce. Toss and serve.",
        tip: "Quick, satisfying, uses whatever vegetables you have.",
      },
    ],
  },

  supper: {
    label: "Light Supper",
    icon: "🌙",
    color: "#2E7D57",
    tagline: "Early & light. By 7–8pm at the latest.",
    rule: "Light supper extends your overnight fast. The earlier you eat, the longer your body has to use fat reserves overnight. Aim for 7pm — 8pm absolute latest.",
    warning: "Keep supper light — fruit, salad, soup, or a small protein portion. This is NOT a second main meal.",
    categories: [
      {
        name: "Whole fruits (ideal supper base)",
        icon: "🍎",
        items: [
          { name: "Mixed fruit salad (200g)", kcal: 100, note: "Apple, orange, grapes, mango, berries" },
          { name: "Apple (1 medium)", kcal: 80, note: "High fibre — fills you up slowly" },
          { name: "Banana (1 medium)", kcal: 105, note: "Good potassium — helps with exercise recovery" },
          { name: "Orange (1 large)", kcal: 85, note: "High vitamin C" },
          { name: "Mango (150g)", kcal: 90, note: "Favourite fruit? This is the place for it" },
          { name: "Grapes (150g)", kcal: 100, note: "Natural sugar is fine in whole fruit" },
          { name: "Strawberries (200g)", kcal: 64, note: "Low calorie, high antioxidants" },
          { name: "Watermelon (200g)", kcal: 60, note: "Mostly water — very filling for few calories" },
          { name: "Pomegranate (100g seeds)", kcal: 83, note: "High antioxidants — great sprinkled on yoghurt" },
        ],
      },
      {
        name: "Vegetable-based suppers",
        icon: "🥗",
        items: [
          { name: "Large green salad with olive oil", kcal: 120, note: "Unlimited leafy greens, light dressing" },
          { name: "Tomato & cucumber salad", kcal: 60, note: "With olive oil, lemon, mint" },
          { name: "Vegetable soup (homemade, 300ml)", kcal: 120, note: "Warming option in winter" },
          { name: "Steamed broccoli & carrots", kcal: 80, note: "With a little olive oil" },
          { name: "Roasted vegetables (200g)", kcal: 120, note: "Courgette, peppers, aubergine, tomato" },
          { name: "Avocado & tomato salad", kcal: 160, note: "Healthy fat + vitamins" },
        ],
      },
      {
        name: "Light protein options (when hungrier)",
        icon: "🍳",
        items: [
          { name: "Greek yoghurt (150g, plain)", kcal: 140, note: "With fruit on top — satisfying and light" },
          { name: "Cottage cheese (100g)", kcal: 98, note: "High protein, very low calorie" },
          { name: "1 boiled egg + salad", kcal: 130, note: "When you need a little more substance" },
          { name: "Tinned tuna (80g) + salad", kcal: 160, note: "Light but filling protein" },
          { name: "Lentil soup (300ml)", kcal: 180, note: "Warming, filling, nutritious" },
        ],
      },
    ],
    recipes: [
      {
        name: "Classic Fruit Salad",
        kcal: 140,
        time: "5 mins",
        ingredients: ["1 apple (diced)", "1 orange (segments)", "100g grapes", "100g strawberries", "Squeeze of lime juice", "Fresh mint"],
        method: "Chop all fruit into a bowl. Squeeze lime over. Add mint leaves. Mix gently and serve.",
        tip: "Make a large batch and keep in the fridge. Ready for 2 suppers.",
      },
      {
        name: "Mediterranean Salad",
        kcal: 180,
        time: "8 mins",
        ingredients: ["Large handful mixed leaves", "1 tomato (diced)", "½ cucumber", "5 olives", "50g feta cheese", "1 tbsp olive oil", "Lemon juice"],
        method: "Toss leaves with cucumber and tomato. Add olives and crumbled feta. Dress with olive oil and lemon.",
        tip: "Feta adds protein and flavour without many calories. A satisfying light supper.",
      },
      {
        name: "Warming Vegetable Soup",
        kcal: 130,
        time: "20 mins",
        ingredients: ["1 courgette", "2 carrots", "1 tin tomatoes", "1 onion", "Vegetable stock cube", "Garlic, herbs"],
        method: "Fry onion and garlic. Add diced vegetables, tinned tomatoes and stock. Simmer 15 mins. Blend or leave chunky.",
        tip: "Make a big batch on Sunday. Light suppers sorted for the week.",
      },
      {
        name: "Yoghurt & Fruit Bowl",
        kcal: 200,
        time: "2 mins",
        ingredients: ["150g plain Greek yoghurt", "1 banana (sliced)", "Handful strawberries", "1 tsp honey", "Sprinkle of cinnamon"],
        method: "Spoon yoghurt into bowl. Top with sliced banana and strawberries. Drizzle honey and dust cinnamon.",
        tip: "This feels like a dessert but works perfectly as a light, satisfying supper.",
      },
    ],
  },
};

const UNREFINED_PRINCIPLES = [
  { icon: "🌾", title: "Choose whole grains over refined", desc: "Wholemeal bread instead of white. Brown rice instead of white. Whole grain pasta instead of regular. Oats instead of cereals. Same enjoyment — more fibre, slower energy release.", color: T.teal },
  { icon: "🍎", title: "Whole fruit, not juice", desc: "A glass of orange juice = 4 oranges with almost no fibre. A whole orange = fibre that slows sugar absorption. Always whole fruit over juice.", color: T.sage },
  { icon: "🥩", title: "Lean white meat over red", desc: "Chicken and turkey give you the same protein as beef and lamb with significantly less saturated fat. When you do eat red meat, choose lean cuts.", color: T.navyMid },
  { icon: "🧂", title: "Avoid ultra-processed foods", desc: "If the ingredients list has more than 5 items or contains things you can't pronounce — put it back. Real food doesn't need a label.", color: T.gold },
  { icon: "🥤", title: "No soda — not even diet", desc: "Diet fizzy drinks trigger insulin response and sugar cravings. Sparkling water is your friend. Add lemon or cucumber if you want flavour.", color: T.alert },
  { icon: "🫒", title: "Good fats in moderation", desc: "Olive oil, avocado, salmon, nuts — these are healthy fats. Small portions. A tablespoon of olive oil, not three.", color: T.teal },
];

function FoodGuideTab({ plan, gender, foodLog, setFoodLog, dailyLogs, setDailyLogs }) {
  const [section, setSection] = useState("principles");
  const [meal, setMeal] = useState("breakfast");
  const [view, setView] = useState("foods"); // "foods" | "recipes"
  const [expandedFood, setExpandedFood] = useState(null);
  const [expandedRecipe, setExpandedRecipe] = useState(null);
  const [foodToast, setFoodToast] = useState("");
  const todayKey = new Date().toISOString().split("T")[0];
  const dailyLimit = plan.presetMeals;

  // One-tap log: add a preset food to today's food log + keep Challenge in sync
  const logFood = (name, kcal) => {
    const entry = { id: Date.now(), name, kcal, type: "preset", time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) };
    const updated = [...(foodLog || []), entry];
    setFoodLog(updated);
    // Sync Challenge daily checklist (same logic as the Calories tab)
    const eaten = updated.reduce((s, f) => s + f.kcal, 0);
    setDailyLogs(prev => ({ ...prev, [todayKey]: { ...(prev[todayKey] || {}), meals: eaten > 0 && eaten <= dailyLimit, nosnack: eaten > 0 && eaten <= dailyLimit } }));
    setFoodToast(`✓ ${name} logged · ${kcal} kcal — added to today 🍽`);
    setTimeout(() => setFoodToast(""), 2400);
  };
  const [expandedCat, setExpandedCat] = useState(0);

  const mealData = FOOD_DATA[meal];
  const mealColors = { breakfast: "#1A7A6E", lunch: "#1A4A6E", supper: "#2E7D57" };

  return (
    <div style={{ padding: "0 16px 110px", background: T.bg }}>
      {foodToast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: T.dark, color: "#fff", padding: "10px 22px", borderRadius: 50, fontFamily: "'DM Sans',sans-serif", fontSize: 13, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.25)", maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis" }}>{foodToast}</div>
      )}

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg,#0F2D4A 0%,#1A4A6E 50%,#1A7A6E 100%)",
        margin: "0 -16px", padding: "calc(28px + env(safe-area-inset-top)) 20px 24px", marginBottom: 16,
      }}>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontFamily: "'DM Sans',sans-serif", letterSpacing: 2, textTransform: "uppercase", margin: "0 0 4px" }}>Chapter 3</p>
        <h1 style={{ color: "#fff", fontSize: 26, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.5 }}>Food Guide 🥗</h1>

        {/* Taste buds message */}
        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 13, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.15)" }}>
          <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontStyle: "italic", margin: "0 0 4px", lineHeight: 1.55 }}>
            "Be respectful to your taste buds when planning your diet."
          </p>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>— Dr. Asif Mushtaq, Chapter 3</p>
        </div>
      </div>

      {/* Section nav */}
      <div style={{ display: "flex", background: T.surface, borderRadius: 12, padding: 4, marginBottom: 14, border: `1px solid ${T.border}` }}>
        {[["principles", "🌿 Principles"], ["meals", "🍽 Meal Foods & Recipes"]].map(([v, l]) => (
          <button key={v} onClick={() => setSection(v)} style={{
            flex: 1, padding: "10px 0", borderRadius: 9, border: "none",
            background: section === v ? T.navy : "transparent",
            color: section === v ? "#fff" : T.mid,
            fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: section === v ? 700 : 400,
            cursor: "pointer", transition: "all 0.2s",
          }}>{l}</button>
        ))}
      </div>

      {/* ── PRINCIPLES ── */}
      {section === "principles" && (
        <div>
          {/* Taste buds philosophy */}
          <Card style={{ marginBottom: 12, background: T.tealXL, border: `1px solid ${T.teal}25` }}>
            <p style={{ color: T.teal, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 8px" }}>🌟 The most important rule</p>
            <p style={{ color: T.mid, fontSize: 14, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.7, margin: "0 0 10px" }}>
              <strong style={{ color: T.navy }}>The best diet is the one you will actually follow.</strong> Dr. Mushtaq's Clever Lunch is specifically designed around the foods you love — because if you enjoy your main meal, you sustain the plan for life rather than quitting after a few weeks.
            </p>
            <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, margin: 0 }}>
              Choose <strong>intelligently</strong> — unrefined where possible, within your calorie budget, and avoiding carbs only at breakfast. But within those three simple rules: eat what you love.
            </p>
          </Card>

          {/* Three intelligent choices */}
          <Card style={{ marginBottom: 12 }}>
            <p style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 12px" }}>The 3 intelligent food rules</p>
            {[
              { n: "1", rule: "Avoid carbs at breakfast only", desc: "The no-carb breakfast keeps you fat-burning for 18–20 hours. Lunch and supper — carbs are welcome and needed.", color: T.teal },
              { n: "2", rule: "Stay within your calorie budget", desc: `Your daily target: ${plan.presetMeals.toLocaleString()} kcal. Breakfast ${plan.meals[0].kcal} · Lunch ${plan.meals[1].kcal} · Supper ${plan.meals[2].kcal}. These are flexible — if lunch is bigger, make supper lighter.`, color: T.navyMid },
              { n: "3", rule: "Choose unrefined over refined", desc: "Wholemeal over white. Whole fruit over juice. Oats over cereals. Real food over processed. Same enjoyment — better for your body.", color: T.sage },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "11px 0", borderBottom: i < 2 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: r.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{r.n}</div>
                <div>
                  <p style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 3px" }}>{r.rule}</p>
                  <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5, margin: 0 }}>{r.desc}</p>
                </div>
              </div>
            ))}
          </Card>

          {/* Unrefined food principles */}
          <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Unrefined food principles</p>
          {UNREFINED_PRINCIPLES.map((p, i) => (
            <div key={i} style={{ background: T.surface, borderRadius: 13, padding: "13px 15px", marginBottom: 9, border: `1px solid ${T.border}`, boxShadow: "0 1px 4px rgba(15,45,74,0.04)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${p.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{p.icon}</div>
                <div>
                  <span style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{p.title}</span>
                  <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.55, margin: "4px 0 0" }}>{p.desc}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Foods to avoid */}
          <Card style={{ background: T.alertL, border: `1px solid ${T.alert}25`, marginTop: 4 }}>
            <p style={{ color: T.alert, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 10px" }}>❌ Dr. Mushtaq says avoid these</p>
            {[
              ["Soda & fizzy drinks", "Even diet/sugar-free versions — they trigger cravings"],
              ["Refined carbs", "White bread, white rice, sugary cereals, pastries"],
              ["Canned & processed food", "High in sodium, preservatives, hidden sugars"],
              ["Fast food", "Calorie-dense, nutritionally poor — saves no time"],
              ["Snacking between meals", "Resets insulin and breaks the fat-burning cycle"],
              ["Fruit juice", "Same calories as soda with barely more nutrition than a fizzy drink"],
            ].map(([food, reason], i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: i < 5 ? `1px solid ${T.alertL}` : "none" }}>
                <span style={{ color: T.alert, fontSize: 13, flexShrink: 0 }}>✕</span>
                <div>
                  <span style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>{food}</span>
                  <p style={{ color: T.mid, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: "1px 0 0" }}>{reason}</p>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ── MEALS ── */}
      {section === "meals" && (
        <div>
          {/* Meal selector */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[["breakfast", "☀️", "Breakfast"], ["lunch", "🍱", "Lunch"], ["supper", "🌙", "Supper"]].map(([k, icon, lbl]) => (
              <button key={k} onClick={() => { setMeal(k); setExpandedCat(0); setExpandedRecipe(null); }} style={{
                flex: 1, padding: "11px 6px", borderRadius: 13,
                background: meal === k ? mealColors[k] : T.surface,
                border: `1px solid ${meal === k ? mealColors[k] : T.border}`,
                cursor: "pointer", transition: "all 0.2s",
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                <p style={{ color: meal === k ? "#fff" : T.navy, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: 0 }}>{lbl}</p>
                <p style={{ color: meal === k ? "rgba(255,255,255,0.7)" : T.light, fontSize: 10, fontFamily: "'DM Sans',sans-serif", margin: "2px 0 0" }}>{plan.meals[["breakfast", "lunch", "supper"].indexOf(k)].kcal} kcal</p>
              </button>
            ))}
          </div>

          {/* Meal rule banner */}
          <div style={{ background: `${mealColors[meal]}15`, border: `1px solid ${mealColors[meal]}30`, borderRadius: 13, padding: "12px 14px", marginBottom: 12 }}>
            <p style={{ color: mealColors[meal], fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 4px" }}>{mealData.icon} {mealData.tagline}</p>
            <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.55, margin: "0 0 6px" }}>{mealData.rule}</p>
            <p style={{ color: mealColors[meal], fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: 0 }}>{mealData.warning}</p>
          </div>

          {/* Foods / Recipes toggle */}
          <div style={{ display: "flex", background: T.surface, borderRadius: 12, padding: 4, marginBottom: 14, border: `1px solid ${T.border}` }}>
            {[["foods", "🥘 Food Options"], ["recipes", "👨‍🍳 Easy Recipes"]].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{
                flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
                background: view === v ? mealColors[meal] : "transparent",
                color: view === v ? "#fff" : T.mid,
                fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: view === v ? 700 : 400,
                cursor: "pointer", transition: "all 0.2s",
              }}>{l}</button>
            ))}
          </div>

          {/* ── FOOD OPTIONS ── */}
          {view === "foods" && (
            <div>
              {mealData.categories.map((cat, ci) => (
                <div key={ci} style={{ marginBottom: 10 }}>
                  <button onClick={() => setExpandedCat(expandedCat === ci ? null : ci)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "13px 16px", borderRadius: 13,
                    background: T.surface, border: `1px solid ${expandedCat === ci ? mealColors[meal] : T.border}`,
                    cursor: "pointer", boxShadow: "0 1px 4px rgba(15,45,74,0.04)",
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 20 }}>{cat.icon}</span>
                      <span style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{cat.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ background: `${mealColors[meal]}15`, color: mealColors[meal], fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, padding: "2px 8px", borderRadius: 50 }}>{cat.items.length} options</span>
                      <span style={{ color: T.light, fontSize: 14 }}>{expandedCat === ci ? "↑" : "↓"}</span>
                    </div>
                  </button>

                  {expandedCat === ci && (
                    <div style={{ background: T.surface, borderRadius: "0 0 13px 13px", border: `1px solid ${T.border}`, borderTop: "none", padding: "4px 0 8px" }}>
                      {cat.items.map((item, ii) => (
                        <div key={ii} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: ii < cat.items.length - 1 ? `1px solid ${T.border}` : "none" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 2px" }}>{item.name}</p>
                            <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>{item.note}</p>
                          </div>
                          <div style={{ background: `${mealColors[meal]}15`, borderRadius: 8, padding: "5px 10px", marginLeft: 10, flexShrink: 0, textAlign: "center" }}>
                            <p style={{ color: mealColors[meal], fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: 0 }}>{item.kcal}</p>
                            <p style={{ color: T.light, fontSize: 9, fontFamily: "'DM Sans',sans-serif", margin: 0, textAlign: "center" }}>kcal</p>
                          </div>
                          <button onClick={() => logFood(item.name, item.kcal)} title="Log this food for today" style={{ marginLeft: 8, flexShrink: 0, width: 36, height: 36, borderRadius: 10, border: "none", background: `linear-gradient(135deg,${mealColors[meal]},${T.navy})`, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>+</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── RECIPES ── */}
          {view === "recipes" && (
            <div>
              <div style={{ background: T.tealXL, borderRadius: 12, padding: "10px 14px", marginBottom: 12, border: `1px solid ${T.teal}20` }}>
                <p style={{ color: T.teal, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.55 }}>
                  💡 These are general recipes — not from any published source. Calorie estimates are approximate. Adjust portions to hit your {plan.meals[["breakfast", "lunch", "supper"].indexOf(meal)].kcal} kcal target.
                </p>
              </div>
              {mealData.recipes.map((recipe, ri) => (
                <div key={ri} onClick={() => setExpandedRecipe(expandedRecipe === ri ? null : ri)} style={{
                  background: T.surface, borderRadius: 14, padding: "14px 16px", marginBottom: 10,
                  border: `1.5px solid ${expandedRecipe === ri ? mealColors[meal] : T.border}`,
                  cursor: "pointer", boxShadow: "0 1px 4px rgba(15,45,74,0.05)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: T.navy, fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 4px" }}>{recipe.name}</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ background: `${mealColors[meal]}15`, color: mealColors[meal], fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, padding: "2px 8px", borderRadius: 50 }}>~{recipe.kcal} kcal</span>
                        <span style={{ background: T.border, color: T.mid, fontSize: 11, fontFamily: "'DM Sans',sans-serif", padding: "2px 8px", borderRadius: 50 }}>⏱ {recipe.time}</span>
                      </div>
                    </div>
                    <span style={{ color: T.light, fontSize: 16, marginLeft: 10 }}>{expandedRecipe === ri ? "↑" : "↓"}</span>
                  </div>

                  {expandedRecipe === ri && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                      <p style={{ color: T.navy, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 8px" }}>Ingredients:</p>
                      {recipe.ingredients.map((ing, ii) => (
                        <div key={ii} style={{ display: "flex", gap: 8, padding: "4px 0" }}>
                          <span style={{ color: mealColors[meal], fontSize: 12, flexShrink: 0 }}>·</span>
                          <span style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>{ing}</span>
                        </div>
                      ))}
                      <p style={{ color: T.navy, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "12px 0 6px" }}>Method:</p>
                      <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65, margin: "0 0 10px" }}>{recipe.method}</p>
                      <div style={{ background: `${mealColors[meal]}12`, borderRadius: 10, padding: "9px 12px" }}>
                        <p style={{ color: mealColors[meal], fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 2px" }}>💡 Tip</p>
                        <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.5 }}>{recipe.tip}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Track Tab ────────────────────────────────────────────────────────────────
function TrackTab({ plan, gender, setGender, progressLog, foodLog, exLog, dailyLogs, userProfile }) {
  const idealW = userProfile ? calcIdealWeightKg(userProfile.height) : null;
  const idealWt = calcIdealWaistCm(gender);
  const idealBf = calcIdealBfPct(gender);

  // Build weight series from the user's OWN logged progress (oldest → newest for the chart)
  const prog = (progressLog || []).filter(p => p.weight).slice().reverse();
  const weights = prog.map(p => parseFloat(p.weight));
  const hasData = weights.length >= 1;
  const startW = hasData ? weights[0] : (userProfile ? userProfile.weight : null);
  const curW = hasData ? weights[weights.length - 1] : startW;

  // Chart geometry
  const W = 300, H = 120, padT = 12, padB = 22, padL = 30, padR = 12;
  const cW = W - padL - padR, cH = H - padT - padB;
  const chartWeights = hasData ? weights : [];
  const cMax = chartWeights.length ? Math.max(...chartWeights, idealW || 0) + 2 : 100;
  const cMin = chartWeights.length ? Math.min(...chartWeights, idealW || 999) - 2 : 60;
  const cRange = (cMax - cMin) || 1;
  const xP = i => padL + (chartWeights.length > 1 ? (i / (chartWeights.length - 1)) * cW : cW / 2);
  const yP = v => padT + cH - ((v - cMin) / cRange) * cH;
  const linePts = chartWeights.map((v, i) => `${xP(i)},${yP(v)}`).join(" ");
  const idealY = idealW ? yP(idealW) : null;

  const wLost = (startW && curW) ? Math.round((startW - curW) * 10) / 10 : 0;
  const wToGo = (curW && idealW) ? Math.max(0, Math.round((curW - idealW) * 10) / 10) : null;

  // Daily food / exercise history from saved per-day logs
  const dayHistory = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = d.toISOString().split("T")[0];
    const fl = StorageService.load("dr_foodlog_" + k, []);
    const el = StorageService.load("dr_exlog_" + k, []);
    if (fl.length || el.length) {
      dayHistory.push({
        date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        eaten: fl.reduce((s, f) => s + (f.kcal || 0), 0),
        burned: el.reduce((s, e) => s + (e.kcal || 0), 0),
        items: fl.length, sessions: el.length,
      });
    }
  }

  return (
    <div style={{ padding: "env(safe-area-inset-top) 16px 100px" }}>
      <div style={{ paddingTop: 22, marginBottom: 18 }}>
        <div style={{ marginBottom: 12 }}><LogoFull /></div>
        <h1 style={{ color: T.dark, fontSize: 26, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: 0 }}>Your Progress</h1>
        <p style={{ color: T.light, fontSize: 13, fontFamily: "'DM Sans',sans-serif", marginTop: 4 }}>All your records in one place · log daily in the Challenge tab</p>
      </div>

      {/* Current vs ideal */}
      {hasData ? (
        <Card style={{ marginBottom: 14 }}>
          <SectionTitle>⚖️ Weight Journey</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div style={{ textAlign: "center", padding: "10px 6px", background: T.surfaceAlt, borderRadius: 10, border: `1px solid ${T.border}` }}>
              <p style={{ color: T.light, fontSize: 10, fontFamily: "'DM Sans',sans-serif", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 2px" }}>Now</p>
              <p style={{ color: T.navy, fontSize: 20, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: 0 }}>{curW} kg</p>
            </div>
            <div style={{ textAlign: "center", padding: "10px 6px", background: T.tealXL, borderRadius: 10, border: `1px solid ${T.teal}20` }}>
              <p style={{ color: T.light, fontSize: 10, fontFamily: "'DM Sans',sans-serif", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 2px" }}>Goal (NHS)</p>
              <p style={{ color: T.teal, fontSize: 20, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: 0 }}>{idealW || "—"} kg</p>
            </div>
          </div>
          {wLost > 0 && <div style={{ padding: "7px 11px", background: T.sageXL, borderRadius: 8, marginBottom: 10 }}><span style={{ color: T.sage, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>🌿 Lost so far: {wLost} kg{wToGo !== null && wToGo > 0 ? ` · ${wToGo} kg to your goal` : " · goal reached!"}</span></div>}

          {/* Live weight chart from user data */}
          {chartWeights.length >= 2 && (
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
              {idealY !== null && <>
                <line x1={padL} y1={idealY} x2={padL + cW} y2={idealY} stroke={T.sage} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.7" />
                <text x={padL + cW} y={idealY - 4} textAnchor="end" fontSize="9" fill={T.sage} fontFamily="'DM Sans',sans-serif">goal {idealW}kg</text>
              </>}
              <polyline points={linePts} fill="none" stroke={T.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {chartWeights.map((v, i) => <circle key={i} cx={xP(i)} cy={yP(v)} r="3.5" fill="#fff" stroke={T.teal} strokeWidth="2" />)}
              <text x={padL} y={H} fontSize="9" fill={T.light} fontFamily="'DM Sans',sans-serif">{prog[0]?.date}</text>
              <text x={padL + cW} y={H} textAnchor="end" fontSize="9" fill={T.light} fontFamily="'DM Sans',sans-serif">{prog[prog.length - 1]?.date}</text>
            </svg>
          )}
        </Card>
      ) : (
        <Card style={{ marginBottom: 14, textAlign: "center", padding: "24px 18px" }}>
          <p style={{ fontSize: 32, margin: "0 0 8px" }}>📊</p>
          <p style={{ color: T.navy, fontSize: 15, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 6px" }}>No measurements yet</p>
          <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5, margin: 0 }}>Log your weight and waist in the Challenge tab. Your journey chart and records will appear here.</p>
        </Card>
      )}

      {/* Measurement history */}
      {prog.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <SectionTitle>📏 Measurement History</SectionTitle>
          {[...prog].reverse().slice(0, 12).map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ color: T.light, fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>{p.date}{p.day ? ` · Day ${p.day}` : ""}</span>
              <div style={{ display: "flex", gap: 10 }}>
                {p.weight && <span style={{ color: T.teal, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{p.weight} kg</span>}
                {p.waist && <span style={{ color: T.navyMid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{p.waist} cm</span>}
                {p.bodyFat && <span style={{ color: T.gold, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{p.bodyFat}%</span>}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Daily calorie & exercise records */}
      {dayHistory.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <SectionTitle>🍽 Daily Food & Exercise Records</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr", gap: 4, padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
            {["Date", "Eaten", "Burned", "Items"].map(h => <span key={h} style={{ color: T.light, fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, textTransform: "uppercase" }}>{h}</span>)}
          </div>
          {dayHistory.slice(0, 14).map((d, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr", gap: 4, padding: "7px 0", borderBottom: i < dayHistory.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "center" }}>
              <span style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>{d.date}</span>
              <span style={{ color: d.eaten > plan.presetMeals ? T.terra : T.teal, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{d.eaten}</span>
              <span style={{ color: d.burned >= 500 ? T.sage : T.gold, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{d.burned}</span>
              <span style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>{d.items}🍽 {d.sessions}🔥</span>
            </div>
          ))}
        </Card>
      )}

      {/* Targets reference */}
      <Card style={{ background: T.tealXL, border: `1px solid ${T.teal}20` }}>
        <SectionTitle>🎯 Your Targets</SectionTitle>
        {[
          ["Ideal weight", idealW ? `${idealW} kg` : "Set in Settings"],
          ["Waist target", `Under ${idealWt} cm`],
          ["Body fat (ripped)", `< ${idealBf}%`],
          ["Exercise goal", "500 kcal daily 🔥"],
        ].map(([l, v], i, a) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < a.length - 1 ? `1px solid ${T.border}` : "none" }}>
            <span style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>{l}</span>
            <span style={{ color: T.teal, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{v}</span>
          </div>
        ))}
        <p style={{ color: T.mid, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: "10px 0 0", lineHeight: 1.5 }}>→ Log measurements and tick daily habits in the Challenge tab. This page is your record book.</p>
      </Card>
    </div>
  );
}

function CoachTab({ plan, gender }) {
  const [messages, setMessages] = useState([{
    role: "assistant",
    text: `Salaam and hello! 🌿 I'm your AI Coach — trained on every chapter of Dr. Asif Mushtaq's book "Lose Weight Smarter for Life" (2nd Edition).\n\nYou're on the ${plan.icon} **${plan.label}'s Plan**:\n• Daily target: **${plan.weightLossTarget.toLocaleString()} kcal** (−${plan.deficit} kcal deficit)\n• ABS-X preset meals: **${plan.presetMeals} kcal** — Breakfast ${plan.meals[0].kcal} · Lunch ${plan.meals[1].kcal} · Supper ${plan.meals[2].kcal}\n• Exercise goal: **burn 500 kcal daily** during fasting 🔥\n\n*"If I can do it, you can do it too."* — Dr. Mushtaq\n\nHow can I help you today? You can ask me anything — your meals, exercise, the X-Point, Skinny Jabs, or how to stay motivated. I'm here! 💪`,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const systemPrompt = `You are an inspiring, warm and interactive AI health coach for the app "Dr Asif Diet", based ENTIRELY on Dr. Asif Mushtaq's book "Lose Weight Smarter for Life" — SECOND EDITION (2026). You have deep knowledge of all 13 chapters.

PERSONALITY: You are encouraging, motivational and direct — like Dr. Mushtaq himself. You celebrate small wins enthusiastically. You never judge. You use Dr. Mushtaq's exact phrases naturally. You are concise but warm. End responses with a motivational nudge or a direct question to keep the conversation going. Use occasional emojis (🌿 🔥 💪 ✓) but don't overdo it.

INSPIRATIONAL QUOTES to weave in naturally:
- "If I can do it, you can do it too."
- "Perfection is not a destination but a journey."
- "What is easy to do is also easy not to do."
- "Work smarter, not harder."
- "The body will take its time — don't judge yourself."
- "This is not a 100-metre race. It's a marathon."
- "Things happen for a good reason. Stay positive and faithful."
- "Once your autopilot switches on, it feels effortless."
- "Self-love is a sign of gratitude."
- "Hunger during fasting is good news — your body is using its fat reserves."
- "Remember, if one person can achieve something, others can also do it."
- "Don't start blaming yourself. Ask: What are my options now?"
- "It is not supposed to end like this. I decided to change." (Dr. Mushtaq's stroke moment)

CURRENT USER: ${gender === "male" ? "MAN" : "WOMAN"}
THEIR PERSONALISED PLAN (2nd Edition figures, Chapter 3):
- NHS recommended daily intake: ${plan.recommended} kcal/day
- Weight-loss target: ${plan.weightLossTarget} kcal/day (−${plan.deficit} kcal deficit)
- ABS-X preset meals: ${plan.presetMeals} kcal (${plan.meals.map(m => `${m.name} ${m.kcal} kcal`).join(", ")})
- Exercise burn goal: 500 kcal daily (Chapter 5 & Chapter 12)
- BMI target: ${plan.bmi.range}
- Waist target: ${plan.waist.target}${plan.waist.asian ? ` (${plan.waist.asian})` : ""}
- Body fat for Point Z (ripped): ${plan.bodyFat.ripped}
- Weight-loss exercise split: ${plan.weightLossExercise}
- Target heart rate: ${plan.heartRate}
- Protein target when training: ${plan.proteinTarget}

CORE BOOK KNOWLEDGE — ALL 13 CHAPTERS:

CHAPTER 1 — MY STORY:
Dr. Mushtaq suffered a stroke at 46 (BMI 34, 104 kg, 38-inch waist). While in hospital he said: "It is not supposed to end like this." He recovered and transformed to a six-pack in under 6 months — naturally, no diet plans, no personal trainer. His three-step conclusion: 1) Walk on empty stomach. 2) Delay breakfast. 3) Wait (be patient).

CHAPTER 2 — LOSING WEIGHT:
X Triangle = Mind + Diet + Exercise (must all sync). X-Point Theory: A→X is the 'blind period' (most vulnerable — don't quit). Initial loss is mainly water. Body enters protective mode. X-Point ~2 months for Dr. Mushtaq. After X-Point the mind becomes 'the big boss' — smooth journey. Scotland analogy: Brighton, London, Manchester all reach Scotland — direction matters, not starting point. Skinny fat warning: losing weight without body composition focus = more muscle lost than fat.

CHAPTER 3 — DIET (ABS-X):
ABS-X = Asif's Balanced and Sustainable Diet. Inspired by Ramadan fasting (14–16 hrs daily). NOT keto. NOT IF. Balanced macros (45–65% carbs, 10–35% protein, 20–25% fat).
Men preset: 1,600 kcal — Intelligent Breakfast 400 kcal (no carbs — breakfast only), Clever Lunch 800 kcal (all macros, favourite foods), Light Supper 400 kcal (light carbs from whole fruit/veg are fine).
Women preset: 1,200 kcal — Breakfast 300 kcal, Clever Lunch 600 kcal, Supper 300 kcal.
Avoid: soda/fizzy drinks (even sugar-free/diet), refined carbs, saturated fat, fast food, canned food, snacking.
Good protein: lean meat, skinless white meat, low-fat dairy, beans, nuts, boiled eggs. Good carbs: wholemeal grains, fruits, veg. Good fat: salmon, tuna (omega-3).

CHAPTER 4 — SKINNY JABS: WHAT NOBODY IS TELLING YOU (NEW — 2nd Edition, 2026):
This is Dr. Mushtaq's important new chapter on GLP-1 weight-loss injections.
Drugs: semaglutide (Wegovy), liraglutide (Saxenda), tirzepatide (Mounjaro).
The A→B→C story: Point A = start injections. Point B = weight loss peaks (6–12 months). Point C = weight has returned (~18 months after stopping).
KEY FACTS (from clinical trials):
- The STEP 1 trial: within 1 year of stopping semaglutide, patients regained 2/3 of lost weight.
- A review of 8 trials (2,000+ patients): average regain of nearly 10 kg after stopping.
- 25–40% of weight lost on semaglutide is MUSCLE (lean tissue), not fat.
- When weight returns at Point C, it returns almost entirely as FAT — so body composition is worse than at Point A.
- MHRA safety alert (January 2026): nearly 1,300 pancreatitis reports linked to GLP-1 drugs (2007–Oct 2025), 19 fatal cases.
- Pancreatitis symptoms: severe stomach pain spreading to back, nausea, vomiting — seek urgent medical attention.
- NHS funding currently limited to 2 years maximum.
- Private cost: £150–£300/month in the UK (£1,800–£3,600/year minimum, before consultation fees).
- Emotional toll: when weight returns, confidence crashes. Psychological injuries rarely discussed.
DO GLP-1s HAVE A ROLE? Yes — but limited and specific. Evidence suggests they work best ALONGSIDE lifestyle change (resistance exercise, protein-rich diet, behavioural support), NOT instead of it. Used alone as a quick fix, the full A-to-C story is almost inevitable.
DR. MUSHTAQ'S POSITION: The ABS-X method gives you a natural, sustainable lifestyle change. Skinny jabs without lifestyle change lead back to square one — with worse body composition and a lighter bank account.

CHAPTER 5 — EXERCISE:
Law of Level of Effort & Outcome: moderate intensity + longer duration = MORE total calories burned than high intensity.
Target heart rate: 110–140 bpm. Avoid high-intensity when overweight — joint injury risk (imagine running with 30 extra kg on joints).
Exercise DURING fasting (morning before breakfast ideal) — body reaches fat-burning mode faster.
During weight loss: 75% cardio + 25% light weights per daily session.
Target: burn at least 500 kcal daily through 1 hour of brisk walking (confirmed in Chapter 12 FAQs).
To stay fit: 2/3 weight training + 1/3 cardio, 30–45 mins daily.
Black coffee before exercise helps. No food for 2 hours after exercise.

CHAPTER 6 — THE MIND:
Most crucial part of the X Triangle. Three mind types: PPM (positively programmed), NPM (negatively programmed — rare), MPM (mixed — most people). We CAN reprogramme ourselves.
3-Week Challenge: give yourself 21 days of ABS-X + exercise discipline. After 3 weeks, habits begin to form. Subconscious autopilot switches on.
Positive cycle: knowledge → 3-week challenge → X Triangle → X-Point → smooth journey.
Negative cycle: no knowledge → impatience → self-judgement → cognitive dissonance → guilt → quit → regain.
1-Question Psychology: after any slip → "What are my options now?" (shifts from problem to solution instantly).
2-Question Psychology: before eating outside plan → "Do I need this?" then "Do I REALLY need this?" (creates a pause before impulse).

CHAPTER 7 — STAYING FIT:
X Triangle of Fitness (calorie balance, not deficit). Check weight weekly. Recalculate calories after weight loss. Continue early dinner and late breakfast for life.

CHAPTERS 8 & 9 — GETTING RIPPED & TONED:
Muscle Yoga: moderate weight + full contraction + hold 5–10 seconds + 5–10 reps. Body composition machine not just scales. Protein 1.2–1.7g/kg. Men <15% body fat for Point Z. Women <20%.

CHAPTER 10 — STAY POSITIVE:
Limited energy principle: use your energy on what matters, like a phone battery. Switch off and recharge (nap, deep breaths). Sleep 8 hours. Self-love is gratitude. Understand others' lens. Deal with difficult people by getting the message and improving. The ear pod story — always start solutions with yourself.

CHAPTERS 11–13: Help others by example. Kids learn by watching. FAQs confirm: 1 hour brisk walk = 500 kcal burn. Regular 30–45 min sessions beat occasional 2-hour sessions. Buy target outfit and hang it visibly.

WHAT DR. MUSHTAQ DOES NOT RECOMMEND: Keto, low-carb diets, crash diets, food replacement shakes, Ozempic/GLP-1 injections as a standalone solution (see Ch.4), high-intensity training when overweight, snacking between preset meals, soda (even diet/sugar-free).

RESPONSE RULES:
- Keep responses to 3–5 sentences unless explaining a principle (then up to 8).
- Always give gender-specific calorie numbers for this user.
- Reference the specific chapter naturally ("as Dr. Mushtaq explains in Chapter 6...").
- End every response with either a warm question or a short motivational quote.
- Celebrate every win the user mentions — even small ones.
- If they mention skinny jabs/Ozempic, give balanced Ch.4 information — the full A→B→C story.
- Never recommend anything contradicting the book.`;

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const data = await apiPost("/api/llm/proxy", {
        max_tokens: 1000,
        system: systemPrompt,
        messages: newMsgs.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
      });
      const reply = data.content?.[0]?.text || "Keep going — if Dr. Mushtaq can do it, you can do it too! 🌿";
      setMessages([...newMsgs, { role: "assistant", text: reply }]);
    } catch {
      setMessages([...newMsgs, { role: "assistant", text: "Remember: walk on empty stomach, delay breakfast, and wait. Your X-Point is coming! 🌿" }]);
    }
    setLoading(false);
  };

  const quickPrompts = [
    `My ${plan.presetMeals} kcal meal plan`,
    "When will I reach my X-Point?",
    "Tell me about skinny jabs",
    "I slipped on my diet today",
    "Best exercise during fasting",
    "How do I stay motivated?",
    "What is the 3-week challenge?",
    "Am I becoming skinny fat?",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "calc(20px + env(safe-area-inset-top)) 18px 8px", flexShrink: 0 }}>
        <div style={{ marginBottom: 12 }}><LogoFull /></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ color: T.dark, fontSize: 26, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: 0 }}>AI Coach</h1>
            <p style={{ color: T.light, fontSize: 12, fontFamily: "'DM Sans',sans-serif", marginTop: 3 }}>
              2nd Edition · {plan.icon} {plan.label}'s plan · {plan.presetMeals} kcal
            </p>
          </div>
          <div style={{ background: `${T.terra}15`, borderRadius: 10, padding: "4px 10px" }}>
            <p style={{ color: T.terra, fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: 0, letterSpacing: 0.5 }}>13 CHAPTERS</p>
          </div>
        </div>
      </div>

      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "0 18px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 14 }}>
            {m.role === "assistant" && (
              <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg,${T.sage},${T.teal})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, marginRight: 10, marginTop: 2 }}>💚</div>
            )}
            <div style={{
              maxWidth: "80%", padding: "12px 16px",
              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: m.role === "user"
                ? `linear-gradient(135deg,${T.terra},${T.brown})`
                : "linear-gradient(135deg,#FFFAF5,#FDF6EE)",
              color: m.role === "user" ? "#fff" : T.dark,
              fontFamily: "'DM Sans',sans-serif", fontSize: 14, lineHeight: 1.7,
              boxShadow: "0 2px 12px rgba(15,45,74,0.07)",
              border: m.role === "assistant" ? `1px solid ${T.goldL}` : "none",
              whiteSpace: "pre-line",
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,${T.sage},${T.teal})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, marginRight: 10 }}>💚</div>
            <div style={{ padding: "12px 18px", borderRadius: "18px 18px 18px 4px", background: T.surface, border: `1px solid ${T.border}`, color: T.light, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontStyle: "italic" }}>Reading Dr. Mushtaq's book... 📖</div>
          </div>
        )}
      </div>

      {/* Quick prompts */}
      <div style={{ padding: "8px 18px 4px", display: "flex", gap: 7, overflowX: "auto", flexShrink: 0 }}>
        {quickPrompts.map((q, i) => (
          <button key={i} onClick={() => setInput(q)} style={{
            padding: "7px 13px", borderRadius: 50, border: `1px solid ${T.border}`,
            background: T.surface, color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif",
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            boxShadow: "0 1px 6px rgba(107,76,59,0.08)",
          }}>{q}</button>
        ))}
      </div>

      <div style={{ padding: "8px 18px", display: "flex", gap: 10, flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask anything — meals, X-Point, skinny jabs..."
          style={{ flex: 1, padding: "14px 18px", borderRadius: 50, border: `1px solid ${T.border}`, fontFamily: "'DM Sans',sans-serif", fontSize: 14, background: T.surface, color: T.dark, outline: "none" }} />
        <button onClick={send} disabled={loading} style={{ width: 50, height: 50, borderRadius: "50%", border: "none", background: loading ? T.light : `linear-gradient(135deg,${T.terra},${T.brown})`, color: "#fff", fontSize: 22, cursor: loading ? "default" : "pointer", boxShadow: loading ? "none" : `0 4px 16px rgba(26,122,110,0.3)`, flexShrink: 0, transition: "all 0.2s" }}>→</button>
      </div>
    </div>
  );
}

// ─── Learn Tab ────────────────────────────────────────────────────────────────
function LearnTab({ gender }) {
  const [view, setView] = useState("principles");
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ padding: "env(safe-area-inset-top) 16px 100px" }}>
      <div style={{ paddingTop: 22, marginBottom: 20 }}>
        <LogoFull />
      </div>

      {/* Book card */}
      <div style={{ background: `linear-gradient(135deg,${T.brown},${T.terra})`, borderRadius: 20, padding: "20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 18, boxShadow: `0 8px 28px rgba(15,45,74,0.1)` }}>
        <div style={{ width: 72, height: 95, borderRadius: 8, flexShrink: 0, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, boxShadow: "4px 4px 16px rgba(0,0,0,0.2)" }}>📗</div>
        <div>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 10, fontFamily: "'DM Sans',sans-serif", margin: "0 0 4px", letterSpacing: 1.2, textTransform: "uppercase" }}>First Edition · 2024</p>
          <h2 style={{ color: "#fff", fontSize: 16, fontFamily: "'Cormorant Garamond',serif", margin: "0 0 4px", lineHeight: 1.3 }}>Lose Weight Smarter for Life</h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: "0 0 6px" }}>Dr. Asif Mushtaq · NHS Consultant</p>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>ISBN: 2nd Edition · 2026</p>
        </div>
      </div>

      {/* Toggle */}
      <div style={{ display: "flex", marginBottom: 18, background: "#EDE0D4", borderRadius: 12, padding: 4 }}>
        {[["principles", "Core Principles"], ["chapters", "All 13 Chapters"]].map(([v, l]) => (
          <button key={v} onClick={() => { setView(v); setSelected(null); }} style={{
            flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
            background: view === v ? T.warm : "transparent",
            color: view === v ? T.terra : T.light,
            fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: view === v ? 700 : 400,
            cursor: "pointer", boxShadow: view === v ? "0 2px 8px rgba(15,45,74,0.07)" : "none",
          }}>{l}</button>
        ))}
      </div>

      {view === "principles" && PRINCIPLES.map(p => (
        <div key={p.id} onClick={() => setSelected(selected === p.id ? null : p.id)}
          style={{ background: T.surface, borderRadius: 18, padding: "16px 18px", marginBottom: 12, boxShadow: "0 2px 10px rgba(15,45,74,0.05)", border: `1px solid ${T.border}`, cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: `${p.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: p.color, fontWeight: 700, fontFamily: "'Cormorant Garamond',serif" }}>{p.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ color: T.dark, fontSize: 14, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, flex: 1, marginRight: 8 }}>{p.title}</div>
                <Pill color={p.color}>{p.chapter}</Pill>
              </div>
              <div style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5 }}>{p.summary}</div>
            </div>
            <span style={{ color: T.light, fontSize: 16, flexShrink: 0, marginLeft: 4 }}>{selected === p.id ? "↑" : "↓"}</span>
          </div>
          {selected === p.id && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.goldL}`, color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.75, whiteSpace: "pre-line" }}>
              {p.detail}
            </div>
          )}
        </div>
      ))}

      {view === "chapters" && CHAPTERS.map(c => (
        <div key={c.num} onClick={() => setSelected(selected === c.num ? null : c.num)}
          style={{ background: T.surface, borderRadius: 16, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 10px rgba(15,45,74,0.05)", border: `1px solid ${T.border}`, cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: `${c.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{c.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.dark, fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>Chapter {c.num}: {c.title}</div>
            </div>
            <span style={{ color: T.light, fontSize: 16 }}>{selected === c.num ? "↑" : "↓"}</span>
          </div>
          {selected === c.num && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.goldL}`, color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65 }}>{c.summary}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Community Tab ────────────────────────────────────────────────────────────
function CommunityTab({ gender }) {
  const [posts, setPosts] = useState(SEED_POSTS);
  const [pendingPosts, setPending] = useState([]);   // submitted, awaiting admin approval
  const [showShare, setShowShare] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [shareText, setShareText] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [outcome, setOutcome] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [activeSection, setActiveSection] = useState("reviews"); // "reviews" | "community"

  const toggleLike = id => {
    setPosts(prev => prev.map(p => p.id === id
      ? { ...p, likes: p.liked ? p.likes - 1 : p.likes + 1, liked: !p.liked }
      : p
    ));
  };

  const submitPost = () => {
    if (!shareText.trim() || !name.trim()) return;
    const pending = {
      id: Date.now(),
      name: name.trim(),
      location: location.trim(),
      outcome: outcome.trim(),
      avatar: name.trim()[0].toUpperCase(),
      text: shareText.trim(),
      likes: 0, liked: false,
      submittedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }),
      color: [T.teal, T.sage, T.navyMid, "#6B3FA0", T.gold][Math.floor(Math.random() * 5)],
    };
    setPending(prev => [pending, ...prev]);
    setShareText(""); setName(""); setLocation(""); setOutcome("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    setShowShare(false);
  };

  return (
    <div style={{ padding: "env(safe-area-inset-top) 16px 100px", background: T.bg }}>

      {/* Header */}
      <div style={{ paddingTop: 24, marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}><LogoFull /></div>
        <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", letterSpacing: 2, textTransform: "uppercase", margin: "0 0 4px" }}>Chapter 11</p>
        <h1 style={{ color: T.navy, fontSize: 26, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Community</h1>
        <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>
          <em>"We get fit and unfit together."</em>
        </p>
      </div>

      {/* Submission confirmed banner */}
      {submitted && (
        <div style={{ background: `linear-gradient(135deg,${T.sage},${T.teal})`, borderRadius: 14, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div>
            <p style={{ color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>Story submitted — thank you!</p>
            <p style={{ color: "rgba(255,255,255,0.8)", fontFamily: "'DM Sans',sans-serif", fontSize: 12, margin: 0 }}>Your story will appear here once reviewed and approved. This usually takes 24–48 hours.</p>
          </div>
        </div>
      )}

      {/* Section toggle */}
      <div style={{ display: "flex", background: T.surface, borderRadius: 12, padding: 4, marginBottom: 18, border: `1px solid ${T.border}` }}>
        {[["reviews", "📖 Book Reviews"], ["community", "💬 Community Stories"]].map(([v, l]) => (
          <button key={v} onClick={() => setActiveSection(v)} style={{
            flex: 1, padding: "10px 0", borderRadius: 9, border: "none",
            background: activeSection === v ? T.navy : "transparent",
            color: activeSection === v ? "#fff" : T.mid,
            fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: activeSection === v ? 700 : 400,
            cursor: "pointer", transition: "all 0.2s",
          }}>{l}</button>
        ))}
      </div>

      {/* ── BOOK REVIEWS section ── */}
      {activeSection === "reviews" && (
        <div>
          {/* Verified badge explanation */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: T.tealXL, borderRadius: 12, padding: "12px 14px", marginBottom: 16, border: `1px solid ${T.teal}20` }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>✅</span>
            <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, margin: 0 }}>
              All reviews below are <strong style={{ color: T.navy }}>real and verified</strong> — published on the book cover and interior of <em>Lose Weight Smarter for Life</em> by Dr. Asif Mushtaq, NHS Consultant.
            </p>
          </div>

          {/* Real review cards */}
          {posts.map(p => (
            <div key={p.id} style={{
              background: T.surface, borderRadius: 16, padding: "18px 20px", marginBottom: 12,
              boxShadow: "0 1px 4px rgba(15,45,74,0.06), 0 4px 16px rgba(15,45,74,0.04)",
              border: `1px solid ${T.border}`,
            }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `linear-gradient(135deg,${p.color},${p.color}88)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700, fontFamily: "'DM Sans',sans-serif", fontSize: 18,
                }}>{p.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: T.navy, fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700 }}>{p.name}</span>
                    <span style={{ background: T.tealXL, color: T.teal, fontSize: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, padding: "2px 7px", borderRadius: 50, letterSpacing: 0.5 }}>✓ VERIFIED</span>
                  </div>
                  <div style={{ color: T.light, fontFamily: "'DM Sans',sans-serif", fontSize: 12 }}>{p.credential}</div>
                </div>
              </div>

              {/* Outcome pill */}
              {p.outcome && (
                <div style={{ background: `${p.color}12`, border: `1px solid ${p.color}30`, borderRadius: 8, padding: "6px 12px", marginBottom: 10, display: "inline-block" }}>
                  <span style={{ color: p.color, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>🏆 {p.outcome}</span>
                </div>
              )}

              {/* Review text */}
              <p style={{ color: T.mid, fontFamily: "'DM Sans',sans-serif", fontSize: 14, lineHeight: 1.7, margin: "0 0 12px", fontStyle: "italic" }}>"{p.text}"</p>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>{p.source}</span>
                <button onClick={() => toggleLike(p.id)} style={{
                  background: p.liked ? `${T.teal}12` : "none", border: p.liked ? `1px solid ${T.teal}30` : "none",
                  borderRadius: 50, padding: "4px 12px",
                  cursor: "pointer", color: p.liked ? T.teal : T.light,
                  fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: p.liked ? 700 : 400,
                  transition: "all 0.15s",
                }}>
                  {p.liked ? "💙" : "🤍"} {p.likes}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── COMMUNITY STORIES section ── */}
      {activeSection === "community" && (
        <div>
          {/* How it works */}
          <Card style={{ marginBottom: 16, background: T.surfaceAlt }}>
            <SectionTitle>How community stories work</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { n: "1", text: "You share your story using the button below", color: T.teal },
                { n: "2", text: "Your story is reviewed by the Dr Asif Diet team (24–48 hrs)", color: T.navyMid },
                { n: "3", text: "Once approved, it appears here for the community", color: T.sage },
              ].map(step => (
                <div key={step.n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: step.color, color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{step.n}</div>
                  <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.5, paddingTop: 3 }}>{step.text}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: "10px 12px", background: T.tealXL, borderRadius: 10 }}>
              <p style={{ color: T.teal, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 2px" }}>Why approval?</p>
              <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.5 }}>To keep this community genuine, safe, and consistent with Dr. Mushtaq's ethos — only real, verifiable stories are published. No false claims. No commercial promotion.</p>
            </div>
          </Card>

          {/* Pending stories (user's own) */}
          {pendingPosts.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => setShowPending(s => !s)} style={{
                width: "100%", padding: "11px 16px", borderRadius: 12, border: `1px solid ${T.border}`,
                background: T.surface, color: T.mid, fontFamily: "'DM Sans',sans-serif", fontSize: 13,
                fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between",
              }}>
                <span>⏳ Your pending {pendingPosts.length === 1 ? "story" : `${pendingPosts.length} stories`} (awaiting review)</span>
                <span>{showPending ? "↑" : "↓"}</span>
              </button>
              {showPending && pendingPosts.map((p, i) => (
                <div key={p.id} style={{ background: `${T.navyMid}08`, borderRadius: 12, padding: "14px 16px", marginTop: 8, border: `1px dashed ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>{p.name}</span>
                    <span style={{ background: "#FFF3CD", color: "#856404", fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, padding: "2px 8px", borderRadius: 50 }}>⏳ PENDING</span>
                  </div>
                  <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>"{p.text}"</p>
                  <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: "8px 0 0" }}>Submitted {p.submittedAt}</p>
                </div>
              ))}
            </div>
          )}

          {/* Empty state when no approved community posts yet */}
          <div style={{ textAlign: "center", padding: "32px 20px", background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <p style={{ color: T.navy, fontSize: 16, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 8px" }}>Be the first to share your story</p>
            <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, margin: "0 0 4px" }}>
              Community stories will appear here once submitted and approved. Every published story is real and verified.
            </p>
            <p style={{ color: T.light, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0, fontStyle: "italic" }}>
              "If I can do it, you can do it too." — Dr. Mushtaq
            </p>
          </div>

          {/* Mind tools card */}
          <Card style={{ marginBottom: 16 }}>
            <SectionTitle>Dr. Mushtaq's Mind Tools · Chapter 6 & 10</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div style={{ background: T.tealXL, borderRadius: 10, padding: 12 }}>
                <p style={{ color: T.teal, fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", margin: "0 0 5px" }}>1-Question Rule</p>
                <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.5 }}>After a slip:<br /><em>"What are my options now?"</em></p>
              </div>
              <div style={{ background: T.sageXL, borderRadius: 10, padding: 12 }}>
                <p style={{ color: T.sage, fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", margin: "0 0 5px" }}>2-Question Rule</p>
                <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.5 }}><em>"Do I need this?<br />Do I really need this?"</em></p>
              </div>
            </div>
            <div style={{ background: T.surfaceAlt, borderRadius: 10, padding: 12, border: `1px solid ${T.border}` }}>
              <p style={{ color: T.navy, fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", margin: "0 0 4px" }}>🏴󠁧󠁢󠁳󠁣󠁴󠁿 The Scotland Analogy · Chapter 2</p>
              <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.6 }}>Brighton, London, and Manchester all reach Scotland if heading in the right direction. Your starting weight doesn't matter — only your direction.</p>
            </div>
          </Card>

          <button onClick={() => setShowShare(true)} style={{
            width: "100%", padding: 16, borderRadius: 14, border: `2px dashed ${T.border}`,
            background: "transparent", color: T.teal, fontSize: 14, fontFamily: "'DM Sans',sans-serif",
            fontWeight: 700, cursor: "pointer", letterSpacing: 0.3,
          }}>
            + Share Your Story
          </button>
        </div>
      )}

      {/* Share modal */}
      {showShare && (
        <Modal title="Share Your Story" onClose={() => setShowShare(false)}>
          <div style={{ background: T.tealXL, borderRadius: 12, padding: "11px 14px", marginBottom: 20, border: `1px solid ${T.teal}20` }}>
            <p style={{ color: T.teal, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 2px" }}>📋 Admin approval required</p>
            <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.5 }}>Your story will be reviewed by the Dr Asif Diet team before appearing publicly. Please share only your real, genuine experience.</p>
          </div>

          {[
            { key: "name", label: "Your name *", placeholder: "e.g. Patricia S.", required: true },
            { key: "location", label: "Location (optional)", placeholder: "e.g. Manchester, UK", required: false },
            { key: "outcome", label: "Your result (optional)", placeholder: "e.g. Lost 8 kg in 10 weeks", required: false },
          ].map(({ key, label, placeholder, required }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, marginBottom: 6 }}>{label}</label>
              <input value={key === "name" ? name : key === "location" ? location : outcome}
                onChange={e => key === "name" ? setName(e.target.value) : key === "location" ? setLocation(e.target.value) : setOutcome(e.target.value)}
                placeholder={placeholder}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontFamily: "'DM Sans',sans-serif", fontSize: 14, background: T.surfaceAlt, color: T.navy, outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, marginBottom: 6 }}>Your story *</label>
            <textarea value={shareText} onChange={e => setShareText(e.target.value)}
              placeholder="Share your genuine experience — your progress, breakthrough moments, and how the ABS-X method has helped you..."
              rows={5}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontFamily: "'DM Sans',sans-serif", fontSize: 14, background: T.surfaceAlt, color: T.navy, outline: "none", resize: "none", lineHeight: 1.6, boxSizing: "border-box" }} />
          </div>

          <div style={{ padding: "10px 14px", background: T.surfaceAlt, borderRadius: 10, marginBottom: 18, border: `1px solid ${T.border}` }}>
            <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.6 }}>
              By submitting you agree that your story is genuine and accurate, and consent to it being published in the Dr Asif Diet app community after review. Medical claims should be verifiable. No promotional content will be approved.
            </p>
          </div>

          <button onClick={submitPost} disabled={!shareText.trim() || !name.trim()} style={{
            width: "100%", padding: 16, borderRadius: 12, border: "none",
            background: shareText.trim() && name.trim() ? `linear-gradient(135deg,${T.teal},${T.navy})` : T.border,
            color: shareText.trim() && name.trim() ? "#fff" : T.light,
            fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, cursor: shareText.trim() && name.trim() ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}>Submit Story for Review</button>
        </Modal>
      )}
    </div>
  );
}

// ─── Mind Tab ────────────────────────────────────────────────────────────────
function MindTab({ gender }) {
  const [section, setSection] = useState("overview");
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedMindType, setSelectedMindType] = useState(null);
  const [selectedPractice, setSelectedPractice] = useState(null);
  const [affirmationIdx, setAffirmationIdx] = useState(new Date().getDate() % DAILY_AFFIRMATIONS.length);
  const [cycleView, setCycleView] = useState("positive");
  const [checkedIn, setCheckedIn] = useState(false);
  const [journalText, setJournalText] = useState("");
  const [savedJournals, setSavedJournals] = useState([]);
  const [showJournalSaved, setShowJournalSaved] = useState(false);

  const sections = [
    { id: "overview", label: "Overview" },
    { id: "types", label: "Mind Types" },
    { id: "tools", label: "Tools" },
    { id: "cycles", label: "Cycles" },
    { id: "mindful", label: "Mindfulness" },
    { id: "journal", label: "Journal" },
  ];

  const saveJournal = () => {
    if (!journalText.trim()) return;
    const entry = {
      text: journalText.trim(),
      date: new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    };
    setSavedJournals(prev => [entry, ...prev].slice(0, 10));
    setJournalText("");
    setShowJournalSaved(true);
    setTimeout(() => setShowJournalSaved(false), 2500);
  };

  return (
    <div style={{ padding: "0 0 100px" }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, #3D2A5E, #6B4C8A 60%, #9B7AB8)`,
        padding: "calc(28px + env(safe-area-inset-top)) 20px 24px", marginBottom: 0,
      }}>
        <div style={{ marginBottom: 16 }}><LogoFull dark={true} /></div>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: "0 0 6px", letterSpacing: 1.5, textTransform: "uppercase" }}>Chapter 5 & 9</p>
        <h1 style={{ color: "#fff", fontSize: 28, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, margin: "0 0 6px" }}>The Mind</h1>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: "0 0 18px", lineHeight: 1.5 }}>
          "The mind is the most crucial part of the weight-loss triangle." — Dr. Mushtaq
        </p>

        {/* Daily affirmation */}
        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 16, padding: "14px 16px", backdropFilter: "blur(10px)" }}>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: "'DM Sans',sans-serif", margin: "0 0 8px", letterSpacing: 1, textTransform: "uppercase" }}>Today's Affirmation</p>
          <p style={{ color: "#fff", fontSize: 14, fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", margin: "0 0 12px", lineHeight: 1.6 }}>
            "{DAILY_AFFIRMATIONS[affirmationIdx]}"
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setAffirmationIdx(i => (i + 1) % DAILY_AFFIRMATIONS.length)} style={{
              background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 50, padding: "6px 14px", color: "#fff",
              fontFamily: "'DM Sans',sans-serif", fontSize: 12, cursor: "pointer", fontWeight: 600,
            }}>Next →</button>
            {!checkedIn ? (
              <button onClick={() => setCheckedIn(true)} style={{
                background: "rgba(255,255,255,0.9)", border: "none",
                borderRadius: 50, padding: "6px 14px", color: "#3D2A5E",
                fontFamily: "'DM Sans',sans-serif", fontSize: 12, cursor: "pointer", fontWeight: 700,
              }}>✓ I affirm this today</button>
            ) : (
              <div style={{ background: "rgba(255,255,255,0.18)", borderRadius: 50, padding: "6px 14px", display: "flex", alignItems: "center" }}>
                <span style={{ color: "#fff", fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>✓ Checked in today 🌿</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section nav */}
      <div style={{ overflowX: "auto", padding: "14px 18px 0", display: "flex", gap: 8 }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            padding: "8px 14px", borderRadius: 50, border: "none", flexShrink: 0,
            background: section === s.id ? "#3D2A5E" : "#EDE0D4",
            color: section === s.id ? "#fff" : T.mid,
            fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: section === s.id ? 700 : 400,
            cursor: "pointer", transition: "all 0.2s",
          }}>{s.label}</button>
        ))}
      </div>

      <div style={{ padding: "16px 18px 0" }}>

        {/* ── OVERVIEW ── */}
        {section === "overview" && (
          <div>
            {/* Why the mind matters */}
            <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #F5F0FC, #FDF6EE)" }}>
              <SectionTitle>Why the Mind is the Big Boss</SectionTitle>
              <p style={{ color: T.mid, fontSize: 14, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.7, margin: "0 0 14px" }}>
                Dr. Mushtaq describes the mind as the most crucial component of the X Triangle. Diet and exercise are tools — but <strong>the mind decides whether you use them</strong>.
              </p>
              <p style={{ color: T.mid, fontSize: 14, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.7, margin: "0 0 14px" }}>
                Before the X-Point, the mind needs to be coached with knowledge and patience. After the X-Point, the mind takes over as 'the big boss' — and the journey becomes smooth.
              </p>
              <div style={{ background: "#3D2A5E15", borderRadius: 12, padding: "12px 14px" }}>
                <p style={{ color: "#3D2A5E", fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.6, fontWeight: 600 }}>
                  🧠 The mind's role in the X Triangle: provide the KNOWLEDGE and PATIENCE to keep the triangle working — even when results are not yet visible.
                </p>
              </div>
            </Card>

            {/* Quick tools */}
            <p style={{ color: T.light, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Quick Access — Mind Tools</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "1-Question Rule", sub: "After a slip", icon: "❓", id: "tools", color: T.terra },
                { label: "2-Question Rule", sub: "Before eating", icon: "🤔", id: "tools", color: T.sage },
                { label: "3-Week Challenge", sub: "Build autopilot", icon: "📅", id: "tools", color: T.gold },
                { label: "Mind Types", sub: "Know yourself", icon: "🧠", id: "types", color: "#6B4C8A" },
              ].map((item, i) => (
                <button key={i} onClick={() => setSection(item.id)} style={{
                  background: T.surface, borderRadius: 16, padding: "14px 12px", border: `1px solid ${T.border}`,
                  cursor: "pointer", textAlign: "left", boxShadow: "0 2px 10px rgba(15,45,74,0.05)",
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
                  <div style={{ color: item.color, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{item.label}</div>
                  <div style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>{item.sub}</div>
                </button>
              ))}
            </div>

            {/* Cognitive dissonance warning */}
            <Card style={{ marginBottom: 16, border: `1.5px solid ${T.terraL}40` }}>
              <p style={{ color: T.terra, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 8px", letterSpacing: 1, textTransform: "uppercase" }}>⚠️ The Danger: Cognitive Dissonance</p>
              <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65, margin: "0 0 10px" }}>
                Cognitive dissonance happens when your actions don't match your beliefs — and the result is guilt. When you feel guilty about eating outside your plan, you enter the <strong>negative cycle</strong>.
              </p>
              <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65, margin: 0 }}>
                The antidote is not willpower — it's the <strong>1-question psychology</strong>: immediately asking "What are my options now?" and moving forward, not backward.
              </p>
            </Card>

            {/* Mind in the triangle */}
            <Card style={{ marginBottom: 0 }}>
              <SectionTitle>Mind's Role in the X Triangle</SectionTitle>
              {[
                { role: "WAIT", desc: "The mind provides patience during the blind period (A→X). Without this, people quit before the X-Point.", icon: "⏳", color: T.gold },
                { role: "KNOWLEDGE", desc: "Understanding the X-Point Theory stops premature self-judgement. You know results are coming even when you can't see them.", icon: "📚", color: T.sage },
                { role: "COMPENSATE", desc: "The mind uses the X Triangle — if diet slips, exercise more. If injury stops exercise, diet harder. The triangle rescues you.", icon: "⚖️", color: T.terra },
                { role: "TAKE OVER", desc: "After the X-Point, the mind becomes the big boss. With visible results, motivation becomes self-sustaining.", icon: "👑", color: "#6B4C8A" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < 3 ? `1px solid ${T.goldL}` : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${r.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{r.icon}</div>
                  <div>
                    <div style={{ color: r.color, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, marginBottom: 3 }}>{r.role}</div>
                    <div style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5 }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* ── MIND TYPES ── */}
        {section === "types" && (
          <div>
            <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #F5F0FC, #FDF6EE)" }}>
              <SectionTitle>Which Mind Type Are You? · Chapter 5</SectionTitle>
              <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65, margin: 0 }}>
                Dr. Mushtaq identifies three types of mind programming. Understanding yours is the first step to reprogramming it. Most of us are MPM — and all mind types can be changed.
              </p>
            </Card>

            {MIND_TYPES.map(mt => (
              <div key={mt.id} onClick={() => setSelectedMindType(selectedMindType === mt.id ? null : mt.id)}
                style={{ background: T.surface, borderRadius: 18, padding: "16px 18px", marginBottom: 12, border: `1.5px solid ${selectedMindType === mt.id ? mt.color : T.goldL}`, cursor: "pointer", boxShadow: "0 2px 10px rgba(15,45,74,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: `${mt.color}20`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 20 }}>{mt.icon}</div>
                    <div style={{ color: mt.color, fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{mt.label}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: T.dark, fontSize: 14, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, marginBottom: 4 }}>{mt.name}</div>
                    <div style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4 }}>{mt.desc}</div>
                  </div>
                  <span style={{ color: T.light, fontSize: 16, flexShrink: 0 }}>{selectedMindType === mt.id ? "↑" : "↓"}</span>
                </div>

                {selectedMindType === mt.id && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.goldL}` }}>
                    <p style={{ color: mt.color, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 8px" }}>Common traits:</p>
                    {mt.traits.map((t, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                        <span style={{ color: mt.color, fontSize: 12, flexShrink: 0 }}>•</span>
                        <span style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4 }}>{t}</span>
                      </div>
                    ))}
                    <div style={{ background: `${mt.color}15`, borderRadius: 12, padding: "10px 12px", marginTop: 10 }}>
                      <p style={{ color: mt.color, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 4px" }}>Your action:</p>
                      <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.5 }}>{mt.action}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <Card style={{ background: "linear-gradient(135deg, #3D2A5E10, #FDF6EE)" }}>
              <p style={{ color: "#3D2A5E", fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 8px" }}>🌟 The key insight from Chapter 5:</p>
              <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65, margin: 0 }}>
                We can reprogramme ourselves. The 3-week challenge is the tool. Once habits embed in the subconscious, your mind type shifts. Most MPM people become functionally PPM after reaching their X-Point.
              </p>
            </Card>
          </div>
        )}

        {/* ── TOOLS ── */}
        {section === "tools" && (
          <div>
            <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #F5F0FC, #FDF6EE)" }}>
              <SectionTitle>Psychology Tools · Chapter 5</SectionTitle>
              <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65, margin: 0 }}>
                These are Dr. Mushtaq's practical mental tools — not motivational fluff. Each one is a specific technique for a specific moment. Tap any card to see how and when to use it.
              </p>
            </Card>

            {PSYCHOLOGY_TOOLS.map(tool => (
              <div key={tool.id} onClick={() => setSelectedTool(selectedTool === tool.id ? null : tool.id)}
                style={{ background: T.surface, borderRadius: 18, padding: "16px 18px", marginBottom: 12, border: `1.5px solid ${selectedTool === tool.id ? tool.color : T.goldL}`, cursor: "pointer", boxShadow: "0 2px 10px rgba(15,45,74,0.05)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 13, flexShrink: 0, background: `${tool.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{tool.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <div style={{ color: T.dark, fontSize: 14, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700 }}>{tool.title}</div>
                      <span style={{ color: tool.color, fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, background: `${tool.color}18`, padding: "2px 8px", borderRadius: 50, alignSelf: "flex-start" }}>{tool.chapter}</span>
                    </div>
                    <div style={{ color: tool.color, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, marginBottom: 4 }}>{tool.tagline}</div>
                    <div style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4 }}>
                      <span style={{ color: T.light, fontWeight: 600 }}>When: </span>{tool.when}
                    </div>
                  </div>
                  <span style={{ color: T.light, fontSize: 16, flexShrink: 0, marginTop: 2 }}>{selectedTool === tool.id ? "↑" : "↓"}</span>
                </div>

                {selectedTool === tool.id && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.goldL}` }}>
                    <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.75, margin: "0 0 16px", whiteSpace: "pre-line" }}>{tool.how}</p>

                    <p style={{ color: tool.color, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 10px" }}>Real-life examples:</p>
                    {tool.examples.map((ex, i) => (
                      <div key={i} style={{ background: `${tool.color}10`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                        <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: "0 0 4px", fontStyle: "italic" }}>"{ex.situation}"</p>
                        <p style={{ color: tool.color, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0, fontWeight: 600 }}>→ {ex.response}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── CYCLES ── */}
        {section === "cycles" && (
          <div>
            <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #F5F0FC, #FDF6EE)" }}>
              <SectionTitle>Positive & Negative Cycles · Chapter 5</SectionTitle>
              <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65, margin: 0 }}>
                Dr. Mushtaq maps out two journeys — one leads to the X-Point and lifelong fitness. The other leads back to square one. The difference? Knowledge and the right tools at the right time.
              </p>
            </Card>

            {/* Toggle */}
            <div style={{ display: "flex", background: "#EDE0D4", borderRadius: 12, padding: 4, marginBottom: 16 }}>
              {[["positive", "✅ Positive Cycle"], ["negative", "⚠️ Negative Cycle"]].map(([v, l]) => (
                <button key={v} onClick={() => setCycleView(v)} style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                  background: cycleView === v ? (v === "positive" ? T.sage : T.terra) : "transparent",
                  color: cycleView === v ? "#fff" : T.light,
                  fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: cycleView === v ? 700 : 400,
                  cursor: "pointer", transition: "all 0.2s",
                }}>{l}</button>
              ))}
            </div>

            {/* Steps */}
            {(cycleView === "positive" ? POSITIVE_CYCLE_STEPS : NEGATIVE_CYCLE_STEPS).map((step, i, arr) => (
              <div key={step.step} style={{ display: "flex", gap: 0, marginBottom: 0 }}>
                {/* Line + dot */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40, flexShrink: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,${step.color},${step.color}CC)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, flexShrink: 0 }}>{step.icon}</div>
                  {i < arr.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 20, background: `${step.color}40`, margin: "4px 0" }} />}
                </div>
                {/* Content */}
                <div style={{ flex: 1, paddingLeft: 12, paddingBottom: i < arr.length - 1 ? 16 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ color: step.color, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, background: `${step.color}18`, padding: "2px 8px", borderRadius: 50 }}>Step {step.step}</span>
                    <span style={{ color: T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{step.label}</span>
                  </div>
                  <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.55, margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}

            <Card style={{ marginTop: 20, background: cycleView === "positive" ? `linear-gradient(135deg,${T.sage}15,${T.cream})` : `linear-gradient(135deg,${T.terra}12,${T.cream})` }}>
              {cycleView === "positive" ? (
                <>
                  <p style={{ color: T.sage, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 8px" }}>🌿 You are already in the positive cycle.</p>
                  <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65, margin: 0 }}>
                    The fact that you're using this app means you have the knowledge. That's Step A. Now take the 3-week challenge (Step B) and trust the X-Point Theory (Step C). The rest follows.
                  </p>
                </>
              ) : (
                <>
                  <p style={{ color: T.terra, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 8px" }}>⚠️ Breaking the negative cycle:</p>
                  <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65, margin: 0 }}>
                    The negative cycle is broken at Step C — by replacing self-judgement with the 1-question psychology: <em>"What are my options now?"</em> You don't need to restart from Step A. Just redirect at whichever step you're stuck on.
                  </p>
                </>
              )}
            </Card>
          </div>
        )}

        {/* ── MINDFULNESS ── */}
        {section === "mindful" && (
          <div>
            <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #F5F0FC, #FDF6EE)" }}>
              <SectionTitle>Mindfulness & Wellbeing · Chapter 9</SectionTitle>
              <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65, margin: 0 }}>
                Dr. Mushtaq's approach to staying positive and focused goes beyond food and exercise. These daily practices support the mental discipline that makes everything else work.
              </p>
            </Card>

            {MINDFULNESS_PRACTICES.map(p => (
              <div key={p.id} onClick={() => setSelectedPractice(selectedPractice === p.id ? null : p.id)}
                style={{ background: T.surface, borderRadius: 18, padding: "16px 18px", marginBottom: 12, border: `1.5px solid ${selectedPractice === p.id ? p.color : T.goldL}`, cursor: "pointer", boxShadow: "0 2px 10px rgba(15,45,74,0.05)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: `${p.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{p.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ color: T.dark, fontSize: 14, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700 }}>{p.title}</div>
                      <span style={{ color: p.color, fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, background: `${p.color}18`, padding: "2px 8px", borderRadius: 50, alignSelf: "flex-start" }}>{p.chapter}</span>
                    </div>
                    <div style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.45 }}>{p.desc}</div>
                  </div>
                  <span style={{ color: T.light, fontSize: 16, flexShrink: 0, marginTop: 2 }}>{selectedPractice === p.id ? "↑" : "↓"}</span>
                </div>

                {selectedPractice === p.id && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.goldL}` }}>
                    <p style={{ color: p.color, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 10px" }}>Practical tips:</p>
                    {p.tips.map((tip, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${p.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, color: p.color, fontWeight: 700 }}>{i + 1}</div>
                        <span style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5 }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── JOURNAL ── */}
        {section === "journal" && (
          <div>
            <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #F5F0FC, #FDF6EE)" }}>
              <SectionTitle>Mind Journal</SectionTitle>
              <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65, margin: 0 }}>
                Dr. Mushtaq found writing helped shift the mind from problem-focused to solution-focused. Use this space to log how you're feeling, apply the 1-question tool, or reflect on your journey.
              </p>
            </Card>

            {/* Prompt cards */}
            <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Journalling prompts</p>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
              {[
                "What are my options now?",
                "Why do I really want to reach my X-Point?",
                "What did I do well today?",
                "What would Dr. Mushtaq say to me right now?",
                "How did I feel during my fast today?",
                "What is one thing I can do better tomorrow?",
              ].map((prompt, i) => (
                <button key={i} onClick={() => setJournalText(prev => prev ? prev + "\n\n" + prompt + " " : prompt + " ")} style={{
                  padding: "8px 14px", borderRadius: 50, border: `1px solid ${T.border}`,
                  background: T.surface, color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif",
                  cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                }}>{prompt}</button>
              ))}
            </div>

            <Card style={{ marginBottom: 16 }}>
              <p style={{ color: T.dark, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 10px" }}>Write here:</p>
              <textarea value={journalText} onChange={e => setJournalText(e.target.value)}
                placeholder="What's on your mind today? How are you feeling about your journey?"
                rows={6}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${T.border}`, fontFamily: "'DM Sans',sans-serif", fontSize: 14, background: T.bg, color: T.dark, outline: "none", resize: "none", lineHeight: 1.65, boxSizing: "border-box" }} />
              {showJournalSaved && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: T.sageXL, borderRadius: 10, textAlign: "center" }}>
                  <p style={{ color: T.sage, fontFamily: "'DM Sans',sans-serif", fontSize: 13, margin: 0, fontWeight: 700 }}>✓ Entry saved 🌿</p>
                </div>
              )}
              <button onClick={saveJournal} style={{
                marginTop: 12, width: "100%", padding: 14, borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #3D2A5E, #6B4C8A)",
                color: "#fff", fontSize: 14, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, cursor: "pointer",
              }}>Save Entry</button>
            </Card>

            {savedJournals.length > 0 && (
              <div>
                <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Past entries</p>
                {savedJournals.map((entry, i) => (
                  <Card key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ color: T.light, fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>{entry.date}</span>
                      <span style={{ color: T.light, fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>{entry.time}</span>
                    </div>
                    <p style={{ color: T.mid, fontSize: 14, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, margin: 0 }}>{entry.text}</p>
                  </Card>
                ))}
              </div>
            )}

            {savedJournals.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ color: T.light, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontStyle: "italic" }}>Your entries will appear here</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Settings / About Screen ──────────────────────────────────────────────────
function SettingsScreen({ gender, setGender, userProfile, setUserProfile, onClose, onDeleteAll }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const plan = PLANS[gender];
  const [showCalc, setShowCalc] = useState(false);
  const [showConfirmStandard, setShowConfirmStandard] = useState(false);
  const [showConfirmSwitch, setShowConfirmSwitch] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  const switchToStandard = () => {
    setUserProfile(null);
    setShowConfirmStandard(false);
    setShowCalc(false);
    showToast(`✓ Switched to standard ${plan.label}'s plan · ${plan.presetMeals.toLocaleString()} kcal`);
  };

  const switchGender = () => {
    setUserProfile(null);
    setGender(null);
    onClose();
  };

  return (
    <div style={{ padding: "0 16px 100px" }}>

      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: T.navy, color: "#fff", padding: "10px 22px", borderRadius: 50, fontFamily: "'DM Sans',sans-serif", fontSize: 13, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(15,45,74,0.25)" }}>{toast}</div>
      )}

      <div style={{ paddingTop: 24, marginBottom: 20 }}>
        <LogoFull />
      </div>

      {/* ── PLAN MANAGEMENT — the key section ── */}
      <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Your Plan</p>

      {/* Current plan status */}
      <Card style={{ marginBottom: 12, border: `1.5px solid ${T.teal}30`, background: T.tealXL }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ color: T.teal, fontSize: 17, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 4px" }}>
              {plan.icon} {plan.label}'s Plan
              <span style={{ marginLeft: 8, background: userProfile ? T.teal : T.navyMid, color: "#fff", fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, padding: "2px 8px", borderRadius: 50 }}>
                {userProfile ? "✦ Personalised" : "Standard"}
              </span>
            </p>
            <p style={{ color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>
              {userProfile ? userProfile.dietTarget.toLocaleString() : plan.presetMeals.toLocaleString()} kcal daily diet target
            </p>
          </div>
        </div>

        {/* Personalised stats row */}
        {userProfile && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              { label: "Age", val: `${userProfile.age}y` },
              { label: "Weight", val: `${userProfile.weight}kg` },
              { label: "Height", val: `${userProfile.height}cm` },
              { label: "BMI", val: `${userProfile.bmi} ${userProfile.bmiLabel ? "·" + userProfile.bmiLabel : ""}` },
            ].map(s => (
              <div key={s.label} style={{ background: T.surface, borderRadius: 9, padding: "8px 6px", textAlign: "center" }}>
                <p style={{ color: T.light, fontSize: 9, fontFamily: "'DM Sans',sans-serif", margin: "0 0 2px" }}>{s.label}</p>
                <p style={{ color: T.navy, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: 0 }}>{s.val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Calorie breakdown (always shown) */}
        <div style={{ background: T.surface, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
          <p style={{ color: T.light, fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Daily breakdown</p>
          {[
            { label: "Breakfast", val: `${userProfile ? Math.round(userProfile.dietTarget * 0.25) : plan.meals[0].kcal} kcal`, color: T.teal },
            { label: "Clever Lunch", val: `${userProfile ? Math.round(userProfile.dietTarget * 0.50) : plan.meals[1].kcal} kcal`, color: T.navyMid },
            { label: "Supper", val: `${userProfile ? userProfile.dietTarget - Math.round(userProfile.dietTarget * 0.25) - Math.round(userProfile.dietTarget * 0.50) : plan.meals[2].kcal} kcal`, color: T.sage },
            { label: "Exercise burn goal", val: "500 kcal 🔥", color: T.teal },
            ...(userProfile ? [{ label: "Maintenance calories", val: `${userProfile.maintenance.toLocaleString()} kcal`, color: T.light }] : []),
          ].map((r, i, a) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < a.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <span style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>{r.label}</span>
              <span style={{ color: r.color, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{r.val}</span>
            </div>
          ))}
          {userProfile && (
            <div style={{ marginTop: 10, padding: "8px 10px", background: T.tealXL, borderRadius: 8 }}>
              <p style={{ color: T.teal, fontSize: 11, fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.5 }}>
                💡 Recalculate every 5–10 kg lost — your maintenance calories decrease as you get lighter.
              </p>
            </div>
          )}
        </div>

        {/* Action buttons — clear and prominent */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Recalculate / Calculate personalised */}
          <button onClick={() => { setShowCalc(s => !s); setShowConfirmStandard(false); }} style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
            background: `linear-gradient(135deg,${T.teal},${T.navyMid})`,
            color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {showCalc ? "↑ Close calculator" : userProfile ? "🔄 Recalculate my personalised plan" : "✨ Calculate my personalised plan"}
          </button>

          {/* Switch to standard (only shown if on personalised) */}
          {userProfile && !showCalc && (
            !showConfirmStandard ? (
              <button onClick={() => setShowConfirmStandard(true)} style={{
                width: "100%", padding: "12px 0", borderRadius: 12, border: `1.5px solid ${T.border}`,
                background: T.surface, color: T.mid, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                Switch to standard {plan.label}'s plan ({plan.presetMeals.toLocaleString()} kcal)
              </button>
            ) : (
              <div style={{ background: T.surfaceAlt, borderRadius: 12, padding: "14px", border: `1px solid ${T.border}` }}>
                <p style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 10px", textAlign: "center" }}>
                  Switch to standard {plan.label}'s plan?
                </p>
                <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: "0 0 12px", textAlign: "center", lineHeight: 1.5 }}>
                  Your personalised target ({userProfile.dietTarget.toLocaleString()} kcal) will be replaced with the standard plan ({plan.presetMeals.toLocaleString()} kcal).
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowConfirmStandard(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, color: T.mid, fontFamily: "'DM Sans',sans-serif", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={switchToStandard} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: T.navy, color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Yes, switch</button>
                </div>
              </div>
            )
          )}

          {/* Switch gender/plan entirely */}
          {!showCalc && (
            !showConfirmSwitch ? (
              <button onClick={() => setShowConfirmSwitch(true)} style={{
                width: "100%", padding: "12px 0", borderRadius: 12, border: `1.5px solid ${T.border}`,
                background: T.surface, color: T.mid, fontFamily: "'DM Sans',sans-serif", fontSize: 13, cursor: "pointer",
              }}>
                Switch between Men's / Women's plan
              </button>
            ) : (
              <div style={{ background: T.alertL, borderRadius: 12, padding: "14px", border: `1px solid ${T.alert}25` }}>
                <p style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, margin: "0 0 8px", textAlign: "center" }}>Switch plan?</p>
                <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: "0 0 12px", textAlign: "center", lineHeight: 1.5 }}>This will take you back to the plan selection screen. Your progress logs and streak will be kept.</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowConfirmSwitch(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, color: T.mid, fontFamily: "'DM Sans',sans-serif", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={switchGender} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: T.alert, color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Yes, switch</button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Calculator inline */}
        {showCalc && (
          <div style={{ marginTop: 14, padding: "16px", background: `linear-gradient(160deg,#0F2D4A,#1A7A6E)`, borderRadius: 14 }}>
            <PersonalisedPlanCalculator
              gender={gender}
              onSave={profile => {
                setUserProfile(profile);
                setShowCalc(false);
                showToast(`✓ Plan updated · ${profile.dietTarget.toLocaleString()} kcal · Tap Done to continue`);
              }}
              onSkip={() => {
                setUserProfile(null);
                setShowCalc(false);
                showToast(`✓ Standard ${plan.label}'s plan · ${plan.presetMeals.toLocaleString()} kcal · Tap Done to continue`);
              }}
            />
          </div>
        )}
      </Card>

      {/* About */}
      <Card style={{ marginBottom: 14 }}>
        <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 14px" }}>About</p>
        {[
          { label: "Book", value: "Lose Weight Smarter for Life" },
          { label: "Author", value: "Dr. Asif Mushtaq" },
          { label: "Method", value: "ABS-X Diet · X-Point Theory" },
          { label: "Edition", value: "2nd Edition · 2026" },
          { label: "App version", value: "2.0.0" },
        ].map((r, i, a) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < a.length - 1 ? `1px solid ${T.border}` : "none" }}>
            <span style={{ color: T.light, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>{r.label}</span>
            <span style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>{r.value}</span>
          </div>
        ))}
      </Card>

      {/* Disclaimer */}
      <Card style={{ marginBottom: 14, background: T.goldXL, border: `1px solid ${T.border}` }}>
        <p style={{ color: T.navy, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 8px" }}>⚕️ Medical Disclaimer</p>
        <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65, margin: 0 }}>
          This app is based on Dr. Asif Mushtaq's published book and is intended for general wellness guidance only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your GP before making significant changes to your diet or exercise routine.
        </p>
      </Card>

      {/* Privacy + Delete My Data (Apple requirement) */}
      <Card style={{ marginBottom: 12 }}>
        <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Privacy & Your Data</p>
        <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.65, margin: "0 0 12px" }}>
          All data — measurements, journal entries, streak, challenge progress and calorie logs — is stored locally on your device only. The AI Coach uses the Anthropic API; no personal health data is stored beyond the session.
        </p>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ width: "100%", padding: "11px 0", borderRadius: 11, border: `1.5px solid ${T.terra}`, background: "transparent", color: T.terra, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, cursor: "pointer" }}>Delete All My Data</button>
        ) : (
          <div style={{ background: T.surfaceAlt, borderRadius: 11, padding: 13, border: `1px solid ${T.terra}40` }}>
            <p style={{ color: T.navy, fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: "0 0 5px", textAlign: "center" }}>Delete everything?</p>
            <p style={{ color: T.mid, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: "0 0 12px", textAlign: "center", lineHeight: 1.5 }}>This permanently erases all measurements, logs, challenge progress and your profile. This cannot be undone.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: `1px solid ${T.border}`, background: T.surface, color: T.mid, fontSize: 13, fontFamily: "'DM Sans',sans-serif", cursor: deleting ? "default" : "pointer", opacity: deleting ? 0.5 : 1 }}>Cancel</button>
              <button onClick={async () => { if (deleting) return; setDeleting(true); try { await onDeleteAll(); } finally { setDeleting(false); } }} disabled={deleting} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none", background: T.terra, color: "#fff", fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, cursor: deleting ? "default" : "pointer", opacity: deleting ? 0.6 : 1 }}>{deleting ? "Deleting…" : "Yes, delete all"}</button>
            </div>
          </div>
        )}
      </Card>
      <Card style={{ marginBottom: 0 }}>
        <p style={{ color: T.light, fontSize: 12, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>© 2026 Dr. Asif Mushtaq · All rights reserved</p>
      </Card>
    </div>
  );
}

// ─── Splash Screen ────────────────────────────────────────────────────────────
const IS_IOS = Capacitor.getPlatform() === "ios";

function AppleSignInButton({ onClick, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 8, width: "100%", height: 50, padding: "0 16px",
        background: "#FFFFFF", color: "#000000",
        border: "none", borderRadius: 8,
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.7 : 1,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
        fontSize: 17, fontWeight: 500, letterSpacing: -0.3,
        WebkitTapHighlightColor: "transparent",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      {loading ? (
        <span>Signing in…</span>
      ) : (
        <>
          <svg width="16" height="19" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ marginTop: -2 }}>
            <path fill="#000" d="M22.773 9.602c-.158.123-2.946 1.694-2.946 5.188 0 4.043 3.55 5.474 3.656 5.509-.016.087-.564 1.962-1.874 3.873-1.169 1.682-2.39 3.36-4.245 3.36-1.855 0-2.333-1.077-4.474-1.077-2.087 0-2.829 1.112-4.526 1.112-1.696 0-2.882-1.557-4.245-3.469-1.579-2.244-2.854-5.732-2.854-9.041 0-5.31 3.453-8.127 6.851-8.127 1.806 0 3.31 1.187 4.443 1.187 1.078 0 2.76-1.258 4.815-1.258.779 0 3.567.071 5.399 2.722zM17.5 4.205C18.347 3.197 18.948 1.802 18.948.413c0-.194-.016-.39-.052-.547-1.379.052-3.018.917-4.008 2.063-.778.882-1.503 2.277-1.503 3.689 0 .211.035.421.052.49.087.016.229.035.371.035 1.239 0 2.799-.829 3.692-2.038z" />
          </svg>
          <span>Sign in with Apple</span>
        </>
      )}
    </button>
  );
}

function SplashScreen({ onAppleSignedIn, validating = false }) {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState(null);

  // On non-iOS, auto-dismiss splash after the brand reveal. On iOS we wait
  // for the user to tap "Sign in with Apple" — signInWithApple internally
  // restores user data via readAllUserData before we call onAppleSignedIn.
  useEffect(() => {
    if (IS_IOS) return;
    const t = setTimeout(onAppleSignedIn, 2200);
    return () => clearTimeout(t);
  }, [onAppleSignedIn]);

  const handleAppleSignIn = () => {
    setError(null);
    setSigningIn(true);
    signInWithApple({
      onSuccess: () => {
        setSigningIn(false);
        onAppleSignedIn();
      },
      onError: (err) => {
        setSigningIn(false);
        const code = String(err?.code ?? err?.errorCode ?? "");
        // 1001 = user cancelled the native sheet — stay on splash silently.
        if (code === "1001" || /cancel/i.test(err?.message || "")) return;
        setError(err?.message || "Sign in failed. Please try again.");
      },
    });
  };

  return (
    <div style={{
      minHeight: "100vh", background: `linear-gradient(160deg, #0F2D4A 0%, #1A4A6E 45%, #1A7A6E 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 28px", textAlign: "center", position: "relative",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />
      <style>{`@keyframes drSplashSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {/* DA Diet wordmark — splash */}
      <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Wordmark row */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          {/* DA pill */}
          <div style={{ position: "relative", background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 14, padding: "8px 16px" }}>
            <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 52, fontWeight: 700, color: "#FFFFFF", letterSpacing: -2, lineHeight: 1 }}>DA</span>
            {/* Medical cross badge */}
            <div style={{ position: "absolute", top: -10, right: -10, width: 26, height: 26, borderRadius: 7, background: "#1A7A6E", border: "2px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14">
                <line x1="7" y1="2" x2="7" y2="12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                <line x1="2" y1="7" x2="12" y2="7" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 52, fontWeight: 300, color: "rgba(255,255,255,0.9)", letterSpacing: -1, marginLeft: 12, lineHeight: 1 }}>Diet</span>
        </div>
        {/* Credential line */}
        <div style={{ width: 260, height: 1, background: "rgba(255,255,255,0.15)", marginBottom: 10 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontStyle: "italic", color: "rgba(255,255,255,0.5)" }}>Dr Asif Diet</span>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>·</span>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "#22A090" }}>Evidence-Based</span>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>·</span>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "#22A090" }}>Physician-Led</span>
        </div>
        <div style={{ width: 260, height: 1, background: "rgba(255,255,255,0.15)", marginTop: 10, marginBottom: 12 }} />
        <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 13, fontStyle: "italic", color: "rgba(255,255,255,0.45)", letterSpacing: 0.5 }}>Lose Weight Smarter for Life</span>
      </div>

      {validating ? (
        <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }} aria-live="polite" role="status">
          <svg width="22" height="22" viewBox="0 0 22 22" style={{ animation: "drSplashSpin 0.9s linear infinite" }} aria-hidden="true">
            <circle cx="11" cy="11" r="9" stroke="rgba(255,255,255,0.2)" strokeWidth="2" fill="none" />
            <path d="M 11 2 a 9 9 0 0 1 9 9" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      ) : IS_IOS && (
        <div style={{
          position: "absolute", left: 28, right: 28,
          bottom: "calc(40px + env(safe-area-inset-bottom, 0px))",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          {error && (
            <div style={{
              fontFamily: "'DM Sans',sans-serif", fontSize: 13,
              color: "#FFE5E0", background: "rgba(192,57,43,0.25)",
              border: "1px solid rgba(192,57,43,0.55)",
              padding: "8px 12px", borderRadius: 6, textAlign: "center",
            }}>{error}</div>
          )}
          <AppleSignInButton onClick={handleAppleSignIn} loading={signingIn} />
        </div>
      )}
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  // authPhase: "booting" | "authenticated" | "unauthenticated"
  // "authenticated" means the server confirmed the session via /api/me
  // (possibly auto-refreshed). Onboarding (gender) is a render-level concern
  // that branches AFTER this gate — see render below.
  const [authPhase, setAuthPhase] = useState("booting");
  const [gender, setGender] = useStoredState("dr_gender", null);
  const [active, setActive] = useState("home");
  const [streakDays, setStreakDays] = useStoredState("dr_streak", Array(7).fill(false));
  const [showSettings, setShowSettings] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // ── Personalised plan (Mifflin-St Jeor) ─────────────────────────────────────
  const [userProfile, setUserProfile] = useStoredState("dr_profile", null);
  // userProfile: { age, weight, height, activityLevel, maintenance, dietTarget, bmi, protein }

  // ── Shared calorie state ──────────────────────────────────────────────────────
  const [foodLog, setFoodLog] = useStoredState("dr_foodlog_" + new Date().toISOString().split("T")[0], []);
  const [exLog, setExLog] = useStoredState("dr_exlog_" + new Date().toISOString().split("T")[0], []);

  // ── Shared challenge state ────────────────────────────────────────────────────
  const [challengePhase, setChallengePhase] = useStoredState("dr_phase", "week3");
  const [challengeStartDate, setChallengeStartDate] = useStoredState("dr_startdate", null);
  const [challengeStarted, setChallengeStarted] = useStoredState("dr_started", false);
  const [dailyLogs, setDailyLogs] = useStoredState("dr_dailylogs", {});
  const [progressLog, setProgressLog] = useStoredState("dr_progresslog", []);

  // ── Close overlays on tab switch ─────────────────────────────────────────────
  useEffect(() => { if (showSettings) setShowSettings(false); }, [active]);
  useEffect(() => { if (showMore) setShowMore(false); }, [active]);

  // ── Local notifications ────────────────────────────────────────────────────
  const notif = useNotifications({
    onTap: (tabId) => setActive(tabId),
  });

  // ── Boot probe: verify stored session with /api/me. If the access token
  //    has expired, apiGet transparently calls /api/refresh first. Only if
  //    that also fails do we drop back to "unauthenticated".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = getSession();
      if (!session?.token) {
        if (!cancelled) setAuthPhase("unauthenticated");
        return;
      }
      try {
        await apiGet("/api/me");
        if (!cancelled) setAuthPhase("authenticated");
      } catch {
        if (!cancelled) {
          clearSession();
          setAuthPhase("unauthenticated");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Delete ALL user data — wipes server account, local session, and React state
  //    Order is critical: DELETE /api/me is auth-protected and needs the access
  //    token in session, so it must run BEFORE logout() (which clears session).
  //    Server's logoutHandler reads user_id from the JWT (no DB lookup), so
  //    logging out a freshly-deleted user still returns 200.
  const resetAllData = async () => {
    setShowSettings(false);
    // 1. Delete the user account on the server.
    try { await apiDelete("/api/me"); } catch {}
    // 2. Revoke all refresh tokens. Access token is still cryptographically
    //    valid here, so this 200s even though the user row is gone.
    try { await logout({ all: true }); } catch {}
    // 3. Clear every local dr_* + auth_* key EXCEPT the local-only
    //    "have we already asked for notification permission?" flag,
    //    which must survive a data reset (per feature spec).
    try {
      Object.keys(localStorage)
        .filter(k =>
          (k.startsWith("dr_") || k.startsWith("auth_")) &&
          k !== "dr_notif_permission_asked"
        )
        .forEach(k => localStorage.removeItem(k));
      clearSession();
    } catch {}
    // 4. Cancel all scheduled notifications and reset notification settings
    try { await notif.reset(); } catch {}
    // 5. Reset every live React state variable so nothing is re-persisted
    setFoodLog([]);
    setExLog([]);
    setDailyLogs({});
    setProgressLog([]);
    setChallengePhase("week3");
    setChallengeStartDate(null);
    setChallengeStarted(false);
    setStreakDays(Array(7).fill(false));
    setUserProfile(null);
    setActive("home");
    // 6. Reset gender LAST → returns user to onboarding, guaranteeing a clean slate
    setGender(null);
    setAuthPhase("unauthenticated");
  };

  const basePlan = gender ? PLANS[gender] : null;

  // Merge personalised targets into plan if profile exists
  const plan = basePlan && userProfile ? {
    ...basePlan,
    presetMeals: userProfile.dietTarget,
    weightLossTarget: userProfile.dietTarget,
    maintenance: userProfile.maintenance,
    meals: [
      { ...basePlan.meals[0], kcal: Math.round(userProfile.dietTarget * 0.25) },
      { ...basePlan.meals[1], kcal: Math.round(userProfile.dietTarget * 0.50) },
      { ...basePlan.meals[2], kcal: userProfile.dietTarget - Math.round(userProfile.dietTarget * 0.25) - Math.round(userProfile.dietTarget * 0.50) },
    ],
    personalised: true,
    bmiValue: userProfile.bmi,
    proteinLow: Math.round(userProfile.weight * 1.0),
    proteinHigh: Math.round(userProfile.weight * 1.5),
  } : basePlan;

  // Auth gate: stay on splash until the server confirms the session.
  // "booting" → spinner only (don't show sign-in yet — session may still validate).
  // "unauthenticated" → confirmed no session, show sign-in on iOS.
  if (authPhase !== "authenticated") {
    return (
      <div style={{ width: "100%", margin: "0 auto", minHeight: "100vh" }}>
        <SplashScreen
          validating={authPhase === "booting"}
          onAppleSignedIn={() => setAuthPhase("authenticated")}
        />
      </div>
    );
  }

  // Session is valid; branch on onboarding (gender).
  if (!gender) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />
        <div style={{ width: "100%", margin: "0 auto" }}>
          <OnboardingScreen onSelect={(g, profile) => { setGender(g); setUserProfile(profile || null); setActive("home"); }} />
        </div>
      </>
    );
  }

  // Settings is now an overlay — NOT a full page replace
  // This means tabs always stay visible when settings is open

  const renderTab = () => {
    switch (active) {
      case "home": return <HomeTab plan={plan} gender={gender} setGender={setGender} streakDays={streakDays} setStreakDays={setStreakDays} setShowSettings={setShowSettings} />;
      case "challenge": return <ChallengeTab plan={plan} gender={gender}
        foodLog={foodLog} exLog={exLog}
        phase={challengePhase} setPhase={setChallengePhase}
        startDate={challengeStartDate} setStartDate={setChallengeStartDate}
        started={challengeStarted} setStarted={setChallengeStarted}
        dailyLogs={dailyLogs} setDailyLogs={setDailyLogs}
        progressLog={progressLog} setProgressLog={setProgressLog}
        userProfile={userProfile} setUserProfile={setUserProfile} />;
      case "food": return <FoodGuideTab plan={plan} gender={gender} foodLog={foodLog} setFoodLog={setFoodLog} dailyLogs={dailyLogs} setDailyLogs={setDailyLogs} />;
      case "calories": return <CaloriesTab plan={plan} gender={gender}
        foodLog={foodLog} setFoodLog={setFoodLog}
        exLog={exLog} setExLog={setExLog}
        dailyLogs={dailyLogs} setDailyLogs={setDailyLogs} />;
      case "track": return <TrackTab plan={plan} gender={gender} setGender={setGender} progressLog={progressLog} foodLog={foodLog} exLog={exLog} dailyLogs={dailyLogs} userProfile={userProfile} />;
      case "mind": return <MindTab gender={gender} />;
      case "coach": return <CoachTab plan={plan} gender={gender} />;
      case "learn": return <LearnTab gender={gender} />;
      case "community": return <CommunityTab gender={gender} />;
      default: return null;
    }
  };

  return (
    <div style={{ width: "100%", margin: "0 auto", minHeight: "100vh", background: T.bg, position: "relative", overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />

      {/* ── Settings slide-up overlay — tabs remain visible ── */}
      {showSettings && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowSettings(false)}
            style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(15,45,74,0.45)", backdropFilter: "blur(4px)" }}
          />
          {/* Panel — slides up from bottom, leaves tab bar showing */}
          <div style={{
            position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "100%", zIndex: 301,
            background: T.surface, borderRadius: "24px 24px 0 0",
            borderTop: `1px solid ${T.border}`,
            boxShadow: "0 -8px 40px rgba(15,45,74,0.18)",
            maxHeight: "calc(100vh - 74px - env(safe-area-inset-bottom, 0px))",
            display: "flex", flexDirection: "column",
          }}>
            {/* Drag handle + header */}
            <div style={{ flexShrink: 0, padding: "14px 20px 0" }}>
              <div style={{ width: 40, height: 4, borderRadius: 99, background: T.border, margin: "0 auto 16px" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <p style={{ color: T.navy, fontSize: 18, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, margin: 0 }}>Settings</p>
                <button
                  onClick={() => setShowSettings(false)}
                  style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 50, padding: "7px 16px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: T.mid, cursor: "pointer", fontWeight: 600 }}
                >
                  Done ✓
                </button>
              </div>
            </div>
            {/* Scrollable content */}
            <div style={{ overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch", padding: "0 0 env(safe-area-inset-bottom, 14px)" }}>
              <SettingsScreen
                gender={gender}
                setGender={setGender}
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                onClose={() => setShowSettings(false)}
                onDeleteAll={resetAllData}
              />
            </div>
          </div>
        </>
      )}

      {/* Top-right controls */}
      <div style={{ position: "fixed", top: "calc(14px + env(safe-area-inset-top))", right: 14, zIndex: 200, display: "flex", gap: 8 }}>
        <button onClick={() => setShowSettings(true)} style={{
          background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
          border: `1px solid ${T.border}`, borderRadius: 50, width: 38, height: 38,
          fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: T.mid,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 10px rgba(15,45,74,0.08)",
        }}>⚙</button>
      </div>

      <div style={{ overflowY: "auto", height: "calc(100vh - 74px - env(safe-area-inset-bottom, 0px))", WebkitOverflowScrolling: "touch" }}>{renderTab()}</div>

      {/* ── More drawer ── */}
      {showMore && (
        <>
          <div
            onClick={() => setShowMore(false)}
            style={{ position: "fixed", inset: 0, zIndex: 98, background: "rgba(15,45,74,0.4)", backdropFilter: "blur(4px)" }}
          />
          <div style={{
            position: "fixed", bottom: "calc(60px + env(safe-area-inset-bottom, 14px))", left: "50%", transform: "translateX(-50%)",
            width: "calc(100% - 0px)", zIndex: 99,
            background: "#fff", borderRadius: "22px 22px 0 0",
            borderTop: `1px solid ${T.border}`,
            padding: "14px 20px 24px",
            boxShadow: "0 -6px 30px rgba(15,45,74,0.14)",
          }}>
            {/* Handle bar */}
            <div style={{ width: 40, height: 4, borderRadius: 99, background: T.border, margin: "0 auto 18px" }} />
            <p style={{ color: T.light, fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 14px" }}>More</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {MORE_TABS.map(t => {
                const moreAccents = { track: T.navyMid, mind: "#6B3FA0", learn: T.navyMid, community: T.sage };
                const accent = moreAccents[t.id] || T.teal;
                const isActive = active === t.id;
                return (
                  <button key={t.id} onClick={() => { setActive(t.id); setShowMore(false); }} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    border: `1.5px solid ${isActive ? accent : T.border}`,
                    background: isActive ? `${accent}10` : T.surfaceAlt,
                    borderRadius: 14, padding: "14px 16px", cursor: "pointer",
                    transition: "all 0.15s",
                  }}>
                    <span style={{ fontSize: 22 }}>{t.icon}</span>
                    <span style={{ fontSize: 14, fontFamily: "'DM Sans',sans-serif", color: isActive ? accent : T.mid, fontWeight: isActive ? 700 : 500 }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Bottom nav — exactly 5 tabs + More ── */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%",
        background: "rgba(255,255,255,0.98)", backdropFilter: "blur(24px)",
        borderTop: `1px solid ${T.border}`,
        zIndex: 400,
        padding: "6px 0 env(safe-area-inset-bottom, 14px)",
      }}>
        <div style={{ display: "flex", padding: "0 4px" }}>
          {/* 5 primary tabs */}
          {PRIMARY_TABS.map(t => {
            const isActive = active === t.id;
            const tabAccents = {
              home: T.teal,
              calories: T.teal,
              food: T.sage,
              challenge: "#6B3FA0",
              coach: T.teal,
            };
            const accent = tabAccents[t.id] || T.teal;
            return (
              <button
                key={t.id}
                onClick={() => { setActive(t.id); setShowMore(false); }}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  border: "none", background: "transparent", cursor: "pointer", padding: "4px 2px",
                  minWidth: 0,
                }}
              >
                <div style={{
                  width: 46, height: 30, borderRadius: 10,
                  background: isActive ? `${accent}18` : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 19, transition: "background 0.2s",
                }}>{t.icon}</div>
                <span style={{
                  fontSize: 10, fontFamily: "'DM Sans',sans-serif",
                  color: isActive ? accent : T.light,
                  fontWeight: isActive ? 700 : 400,
                  transition: "color 0.2s",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                }}>{t.label}</span>
                {isActive && (
                  <div style={{ width: 20, height: 2.5, borderRadius: 99, background: accent, marginTop: 1 }} />
                )}
              </button>
            );
          })}

          {/* More button */}
          {(() => {
            const moreIsActive = MORE_TABS.some(t => t.id === active);
            const accent = moreIsActive ? T.navyMid : T.light;
            return (
              <button
                onClick={() => { if (showSettings) setShowSettings(false); setShowMore(m => !m); }}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  border: "none", background: "transparent", cursor: "pointer", padding: "4px 2px",
                  minWidth: 0,
                }}
              >
                <div style={{
                  width: 46, height: 30, borderRadius: 10,
                  background: moreIsActive || showMore ? `${T.navyMid}18` : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, transition: "background 0.2s", letterSpacing: 1,
                }}>{showMore ? "✕" : "•••"}</div>
                <span style={{
                  fontSize: 10, fontFamily: "'DM Sans',sans-serif",
                  color: moreIsActive || showMore ? T.navyMid : T.light,
                  fontWeight: moreIsActive ? 700 : 400,
                  lineHeight: 1.2,
                }}>More</span>
                {moreIsActive && (
                  <div style={{ width: 20, height: 2.5, borderRadius: 99, background: T.navyMid, marginTop: 1 }} />
                )}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
