import { useState, useEffect, useRef } from "react";

// ── Nutrition math ──────────────────────────────────────────────────────────
function calcTDEE(weight, height, age, sex, activity, goal) {
  const bmr =
    sex === "female"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;
  const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }[activity];
  let tdee = Math.round(bmr * mult);
  if (goal === "lose") tdee -= 400;
  if (goal === "gain") tdee += 250;
  return tdee;
}

function calcMacros(tdee, weight) {
  const protein = Math.round(weight * 1.7);
  const fat = Math.round((tdee * 0.28) / 9);
  const carbs = Math.round((tdee - protein * 4 - fat * 9) / 4);
  return { protein, fat, carbs };
}

// ── API ─────────────────────────────────────────────────────────────────────
async function callClaude(messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: "You are a nutrition assistant. Return ONLY valid JSON with no markdown fences, no extra text.",
      messages,
    }),
  });
  const data = await res.json();
  const raw = data.content?.find((c) => c.type === "text")?.text || "{}";
  return JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
}

function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg: "#F5F7F2",
  white: "#FFFFFF",
  green: "#6BAA78",
  greenDark: "#4D8060",
  greenLight: "#EBF4EE",
  peach: "#F0C4A8",
  peachLight: "#FDF3EC",
  text: "#1C2519",
  muted: "#738070",
  border: "#E0E6DC",
  pill: (hex) => ({ bg: hex + "22", dot: hex }),
};

const pill = (color) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: color + "28",
  borderRadius: 100,
  padding: "5px 12px",
  fontSize: 13,
  fontWeight: 500,
  color: C.text,
});

const card = {
  background: C.white,
  borderRadius: 20,
  padding: "20px 18px",
  border: `1px solid ${C.border}`,
  marginBottom: 12,
};

const btn = {
  background: C.green,
  color: "#fff",
  border: "none",
  borderRadius: 14,
  padding: "15px 24px",
  fontFamily: "inherit",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
  letterSpacing: "0.01em",
  transition: "background 0.15s",
};

const btnGhost = {
  background: "transparent",
  color: C.green,
  border: `1.5px solid ${C.green}`,
  borderRadius: 14,
  padding: "13px 24px",
  fontFamily: "inherit",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  letterSpacing: "0.01em",
};

const input = {
  width: "100%",
  border: `1.5px solid ${C.border}`,
  borderRadius: 12,
  padding: "13px 14px",
  fontSize: 15,
  fontFamily: "inherit",
  color: C.text,
  background: C.white,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

const label = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: C.muted,
  marginBottom: 7,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
};

const heading = { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, color: C.text };

// ── Macro Pill ──────────────────────────────────────────────────────────────
function Pill({ label: lbl, value, unit, color }) {
  return (
    <div style={pill(color)}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontWeight: 700 }}>{value}{unit}</span>
      <span style={{ color: C.muted }}>{lbl}</span>
    </div>
  );
}

// ── App root ────────────────────────────────────────────────────────────────
export default function App() {
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("recipe");

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: C.text,
        maxWidth: 480,
        margin: "0 auto",
        position: "relative",
      }}
    >
      {!profile ? (
        <Onboarding onComplete={setProfile} />
      ) : (
        <MainApp profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════════════════════════════════════════════

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "", sex: "female",
    age: "", height: "", weight: "",
    activity: "moderate", goal: "maintain",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const finish = () => {
    const weight = +form.weight, height = +form.height, age = +form.age;
    const tdee = calcTDEE(weight, height, age, form.sex, form.activity, form.goal);
    const { protein, fat, carbs } = calcMacros(tdee, weight);
    onComplete({ ...form, weight, height, age, tdee, protein, fat, carbs });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "0 20px 48px" }}>
      <div style={{ paddingTop: 56, paddingBottom: 28 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 3, borderRadius: 3,
                background: i <= step ? C.green : C.border,
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Step {step} of 3
        </span>
      </div>

      {step === 1 && <Step1 form={form} update={update} onNext={() => setStep(2)} />}
      {step === 2 && <Step2 form={form} update={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <Step3 form={form} update={update} onFinish={finish} onBack={() => setStep(2)} />}
    </div>
  );
}

function Step1({ form, update, onNext }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <h1 style={{ ...heading, fontSize: 40, margin: "0 0 10px" }}>Hi there!</h1>
      <p style={{ color: C.muted, fontSize: 16, lineHeight: 1.65, margin: "0 0 36px" }}>
        Let's set up your nutrition profile so every meal is perfectly sized for you.
      </p>

      <div style={{ marginBottom: 22 }}>
        <label style={label}>Your name</label>
        <input
          style={input}
          placeholder="e.g. Sofia"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 40 }}>
        <label style={label}>Biological sex</label>
        <div style={{ display: "flex", gap: 10 }}>
          {[["female", "♀  Female"], ["male", "♂  Male"]].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => update("sex", val)}
              style={{
                flex: 1, padding: 14, borderRadius: 14, border: "none",
                background: form.sex === val ? C.greenLight : C.white,
                color: form.sex === val ? C.greenDark : C.muted,
                fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer",
                border: form.sex === val ? `2px solid ${C.green}` : `2px solid ${C.border}`,
                transition: "all 0.15s",
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "auto" }}>
        <button
          style={{ ...btn, opacity: form.name.trim() ? 1 : 0.45 }}
          disabled={!form.name.trim()}
          onClick={onNext}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

function Step2({ form, update, onNext, onBack }) {
  const valid = form.age && form.height && form.weight;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <h1 style={{ ...heading, fontSize: 36, margin: "0 0 10px" }}>
        Your stats,<br />{form.name || "friend"} ✨
      </h1>
      <p style={{ color: C.muted, fontSize: 15, margin: "0 0 30px", lineHeight: 1.6 }}>
        These help calculate your exact calorie and protein needs.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 40 }}>
        {[
          ["Age", "age", "number", "e.g. 26", 14, 100],
          ["Height (cm)", "height", "number", "e.g. 165", 130, 220],
          ["Weight (kg)", "weight", "number", "e.g. 62", 30, 250],
        ].map(([lbl, key, type, ph, mn, mx]) => (
          <div key={key}>
            <label style={label}>{lbl}</label>
            <input
              style={input}
              type={type}
              min={mn}
              max={mx}
              placeholder={ph}
              value={form[key]}
              onChange={(e) => update(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto", display: "flex", gap: 10 }}>
        <button onClick={onBack} style={{ ...btnGhost, flex: "0 0 72px" }}>←</button>
        <button
          style={{ ...btn, flex: 1, opacity: valid ? 1 : 0.45 }}
          disabled={!valid}
          onClick={onNext}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

function Step3({ form, update, onFinish, onBack }) {
  const activities = [
    { id: "sedentary", icon: "🪑", title: "Mostly sitting", sub: "Desk job, little movement" },
    { id: "light", icon: "🚶", title: "Light activity", sub: "Walk or light exercise 1–3×/week" },
    { id: "moderate", icon: "🏃", title: "Moderately active", sub: "Exercise 3–5 days a week" },
    { id: "active", icon: "💪", title: "Very active", sub: "Exercise 6–7 days a week" },
  ];
  const goals = [
    { id: "lose", icon: "📉", label: "Lose weight" },
    { id: "maintain", icon: "⚖️", label: "Maintain" },
    { id: "gain", icon: "📈", label: "Gain weight" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <h1 style={{ ...heading, fontSize: 36, margin: "0 0 10px" }}>Almost there! 🌿</h1>
      <p style={{ color: C.muted, fontSize: 15, margin: "0 0 26px", lineHeight: 1.6 }}>
        Two last questions and your portions will always be spot-on.
      </p>

      <div style={{ marginBottom: 24 }}>
        <label style={label}>Activity level</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {activities.map((a) => (
            <button
              key={a.id}
              onClick={() => update("activity", a.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 14px", borderRadius: 14, cursor: "pointer",
                border: form.activity === a.id ? `2px solid ${C.green}` : `2px solid ${C.border}`,
                background: form.activity === a.id ? C.greenLight : C.white,
                textAlign: "left", width: "100%", fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: form.activity === a.id ? C.greenDark : C.text }}>
                  {a.title}
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>{a.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <label style={label}>Your goal</label>
        <div style={{ display: "flex", gap: 8 }}>
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => update("goal", g.id)}
              style={{
                flex: 1, padding: "12px 6px", borderRadius: 14, cursor: "pointer",
                border: form.goal === g.id ? `2px solid ${C.green}` : `2px solid ${C.border}`,
                background: form.goal === g.id ? C.greenLight : C.white,
                fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>{g.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: form.goal === g.id ? C.greenDark : C.text, lineHeight: 1.3 }}>
                {g.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "auto", display: "flex", gap: 10 }}>
        <button onClick={onBack} style={{ ...btnGhost, flex: "0 0 72px" }}>←</button>
        <button style={{ ...btn, flex: 1 }} onClick={onFinish}>
          Let's eat! 🎉
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════

function MainApp({ profile, activeTab, setActiveTab }) {
  const { name, tdee, protein, fat, carbs } = profile;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 76 }}>
      {/* Header */}
      <div style={{ padding: "48px 20px 18px", background: C.white, borderBottom: `1px solid ${C.border}` }}>
        <p style={{ margin: 0, fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Welcome back
        </p>
        <h2 style={{ ...heading, fontSize: 28, margin: "3px 0 14px" }}>{name} 🌿</h2>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <Pill label="kcal/day" value={tdee.toLocaleString()} unit="" color="#6BAA78" />
          <Pill label="protein" value={protein} unit="g" color="#D97B6B" />
          <Pill label="carbs" value={carbs} unit="g" color="#C9A84C" />
          <Pill label="fat" value={fat} unit="g" color="#7FAED0" />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "20px 20px 8px", overflowY: "auto" }}>
        {activeTab === "recipe" && <RecipeTab profile={profile} />}
        {activeTab === "scan" && <ScanTab profile={profile} />}
        {activeTab === "goals" && <GoalsTab profile={profile} />}
      </div>

      {/* Bottom nav */}
      <div
        style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 480,
          background: C.white, borderTop: `1px solid ${C.border}`,
          display: "flex", zIndex: 100,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {[
          { id: "recipe", icon: "🍽️", label: "Recipe" },
          { id: "scan", icon: "📷", label: "Scan" },
          { id: "goals", icon: "🎯", label: "My Goals" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, background: "none", border: "none", cursor: "pointer",
              padding: "10px 0 12px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              fontFamily: "inherit",
            }}
          >
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span
              style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                color: activeTab === tab.id ? C.green : C.muted,
                textTransform: "uppercase",
              }}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RECIPE TAB
// ══════════════════════════════════════════════════════════════════════════════

function RecipeTab({ profile }) {
  const [recipe, setRecipe] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyze = async () => {
    if (!recipe.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const prompt = `
User daily nutrition targets:
- Calories: ${profile.tdee} kcal
- Protein: ${profile.protein}g, Carbs: ${profile.carbs}g, Fat: ${profile.fat}g
- Weight: ${profile.weight}kg, Goal: ${profile.goal}

Recipe:
${recipe}

Analyze this recipe. Assume this will be one of 3 meals (~33% of daily calories).
Tell them: how much to eat (portion), and if cooking just for themselves, how much of the recipe to actually make.

Return exactly this JSON structure:
{
  "dish_name": "Pasta Arrabiata",
  "servings_in_recipe": 4,
  "calories_per_serving": 380,
  "protein_per_serving": 14,
  "carbs_per_serving": 58,
  "fat_per_serving": 10,
  "recommended_servings": "1.5",
  "recommended_calories": 570,
  "recommended_protein": 21,
  "recommended_carbs": 87,
  "recommended_fat": 15,
  "portion_visual": "A large bowl, roughly the size of your two fists",
  "cooking_advice": "The recipe makes 4 servings. Cook a quarter of it to get your perfect portion, or make the full batch and refrigerate the rest for 3 meals.",
  "adjusted_ingredients": ["125g pasta", "1/4 can crushed tomatoes", "1 garlic clove", "1 tsp olive oil"],
  "tip": "Add a handful of spinach for extra iron without adding many calories."
}`;

    try {
      const json = await callClaude([{ role: "user", content: prompt }]);
      setResult(json);
    } catch {
      setError("Couldn't analyze the recipe. Please check the format and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ ...heading, fontSize: 24, margin: "0 0 6px" }}>Recipe Adjuster</h3>
      <p style={{ color: C.muted, fontSize: 14, margin: "0 0 18px", lineHeight: 1.6 }}>
        Paste any recipe — get back exactly how much to cook and eat.
      </p>

      <div style={card}>
        <label style={label}>Your recipe</label>
        <textarea
          style={{
            ...input, minHeight: 150, resize: "vertical",
            lineHeight: 1.65, display: "block",
          }}
          placeholder={
            "Paste a recipe here. Example:\n\nChicken Fried Rice\n– 400g cooked rice\n– 200g chicken breast\n– 2 eggs\n– 3 tbsp soy sauce\n– 2 tsp sesame oil\n– spring onions\n\nFry chicken, scramble eggs, add rice and sauce."
          }
          value={recipe}
          onChange={(e) => setRecipe(e.target.value)}
        />
      </div>

      <button
        style={{ ...btn, opacity: recipe.trim() && !loading ? 1 : 0.4, marginBottom: 16 }}
        disabled={!recipe.trim() || loading}
        onClick={analyze}
      >
        {loading ? "Calculating your portion..." : "✨ Adjust for my portion"}
      </button>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "11px 14px", color: "#B91C1C", fontSize: 14, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {result && <RecipeResult result={result} />}
    </div>
  );
}

function RecipeResult({ result }) {
  return (
    <div style={{ ...card, borderLeft: `4px solid ${C.green}`, borderRadius: "0 20px 20px 0" }}>
      <p style={{ ...heading, fontSize: 21, margin: "0 0 3px" }}>{result.dish_name}</p>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 16px" }}>
        Full recipe: {result.servings_in_recipe} servings · {result.calories_per_serving} kcal each
      </p>

      {/* Big recommendation */}
      <div style={{ background: C.greenLight, borderRadius: 16, padding: "14px 16px", marginBottom: 14 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: C.greenDark }}>
          Eat {result.recommended_servings} serving{result.recommended_servings !== "1" ? "s" : ""}
        </p>
        <p style={{ margin: "5px 0 0", fontSize: 13, color: C.greenDark, opacity: 0.85 }}>
          {result.portion_visual}
        </p>
      </div>

      {/* Macros */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
        <Pill label="kcal" value={result.recommended_calories} unit="" color="#6BAA78" />
        <Pill label="protein" value={result.recommended_protein} unit="g" color="#D97B6B" />
        <Pill label="carbs" value={result.recommended_carbs} unit="g" color="#C9A84C" />
        <Pill label="fat" value={result.recommended_fat} unit="g" color="#7FAED0" />
      </div>

      {/* Cooking advice */}
      {result.cooking_advice && (
        <div style={{ background: C.bg, borderRadius: 12, padding: "11px 14px", marginBottom: 14, fontSize: 14, color: C.text, lineHeight: 1.6 }}>
          <span style={{ fontWeight: 600 }}>How much to cook: </span>
          {result.cooking_advice}
        </div>
      )}

      {/* Adjusted ingredients */}
      {result.adjusted_ingredients?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ ...label, marginBottom: 10 }}>Ingredients for your portion</p>
          {result.adjusted_ingredients.map((ing, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, color: C.text, marginBottom: 5 }}>
              <span style={{ color: C.green, fontWeight: 700, marginTop: 1 }}>–</span>
              <span>{ing}</span>
            </div>
          ))}
        </div>
      )}

      {result.tip && (
        <div style={{ background: C.peachLight, borderRadius: 12, padding: "11px 14px", fontSize: 13, color: C.text, lineHeight: 1.55 }}>
          💡 {result.tip}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCAN TAB
// ══════════════════════════════════════════════════════════════════════════════

function ScanTab({ profile }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f?.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const base64 = await toBase64(file);
      const prompt = `
User daily targets: ${profile.tdee} kcal, protein ${profile.protein}g, carbs ${profile.carbs}g, fat ${profile.fat}g. Goal: ${profile.goal}.

Look at this food photo. Identify everything visible, estimate the nutrition for what's shown, and tell them how much they should eat for a single meal (~33% of their daily calories).

Return exactly this JSON:
{
  "foods": ["grilled salmon fillet", "steamed broccoli", "white rice"],
  "total_calories_shown": 650,
  "total_protein_shown": 45,
  "total_carbs_shown": 70,
  "total_fat_shown": 16,
  "eat_fraction": "all of it",
  "recommended_calories": 650,
  "recommended_protein": 45,
  "recommended_carbs": 70,
  "recommended_fat": 16,
  "verdict": "Perfect size for your goals — eat it all",
  "adjustment": "The portion shown fits your calorie target almost exactly.",
  "tip": "This is high in omega-3s. Try to have fish like this 2–3 times per week."
}`;

      const json = await callClaude([
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
            { type: "text", text: prompt },
          ],
        },
      ]);
      setResult(json);
    } catch {
      setError("Couldn't read the image. Try a clearer, well-lit photo of the food.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ ...heading, fontSize: 24, margin: "0 0 6px" }}>Food Scanner</h3>
      <p style={{ color: C.muted, fontSize: 14, margin: "0 0 18px", lineHeight: 1.6 }}>
        Take or upload a photo of your meal — I'll tell you exactly how much to eat.
      </p>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          ...card,
          border: `2px dashed ${preview ? C.green : C.border}`,
          boxShadow: "none",
          padding: 0,
          overflow: "hidden",
          cursor: preview ? "default" : "pointer",
          marginBottom: 12,
          minHeight: preview ? 0 : 160,
        }}
        onClick={() => !preview && fileRef.current.click()}
      >
        {preview ? (
          <div style={{ position: "relative" }}>
            <img
              src={preview}
              alt="Food"
              style={{ width: "100%", display: "block", maxHeight: 260, objectFit: "cover" }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreview(null);
                setFile(null);
                setResult(null);
              }}
              style={{
                position: "absolute", top: 10, right: 10,
                width: 30, height: 30, borderRadius: "50%",
                background: "rgba(0,0,0,0.55)", border: "none",
                color: "#fff", fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <div style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📷</div>
            <p style={{ color: C.muted, fontWeight: 500, margin: "0 0 4px", fontSize: 15 }}>
              Tap to upload a food photo
            </p>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>or drag and drop here</p>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {preview && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => fileRef.current.click()}
            style={{ ...btnGhost, flex: "0 0 120px", fontSize: 14 }}
          >
            Change photo
          </button>
          <button
            style={{ ...btn, flex: 1, opacity: !loading ? 1 : 0.4 }}
            disabled={loading}
            onClick={analyze}
          >
            {loading ? "Analyzing..." : "✨ Analyze this meal"}
          </button>
        </div>
      )}

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "11px 14px", color: "#B91C1C", fontSize: 14, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {result && <ScanResult result={result} />}
    </div>
  );
}

function ScanResult({ result }) {
  const isGood = result.recommended_calories <= result.total_calories_shown * 1.1;
  return (
    <div style={{ ...card, borderLeft: `4px solid ${C.green}`, borderRadius: "0 20px 20px 0" }}>
      <p style={{ ...heading, fontSize: 18, margin: "0 0 3px" }}>
        {result.foods?.join(", ") || "Food detected"}
      </p>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 14px" }}>
        Estimated in photo: ~{result.total_calories_shown} kcal
      </p>

      <div style={{ background: C.greenLight, borderRadius: 16, padding: "14px 16px", marginBottom: 14 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: C.greenDark }}>
          {result.verdict}
        </p>
        {result.adjustment && (
          <p style={{ margin: "6px 0 0", fontSize: 13, color: C.greenDark, opacity: 0.85, lineHeight: 1.55 }}>
            {result.adjustment}
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
        <Pill label="kcal" value={result.recommended_calories} unit="" color="#6BAA78" />
        <Pill label="protein" value={result.recommended_protein} unit="g" color="#D97B6B" />
        <Pill label="carbs" value={result.recommended_carbs} unit="g" color="#C9A84C" />
        <Pill label="fat" value={result.recommended_fat} unit="g" color="#7FAED0" />
      </div>

      {result.tip && (
        <div style={{ background: C.peachLight, borderRadius: 12, padding: "11px 14px", fontSize: 13, color: C.text, lineHeight: 1.55 }}>
          💡 {result.tip}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GOALS TAB
// ══════════════════════════════════════════════════════════════════════════════

function GoalsTab({ profile }) {
  const { name, tdee, protein, fat, carbs, weight, goal, activity, sex, age, height } = profile;

  const goalLabel = { lose: "Lose weight 📉", maintain: "Maintain weight ⚖️", gain: "Gain weight 📈" }[goal];
  const actLabel = {
    sedentary: "Mostly sitting 🪑",
    light: "Lightly active 🚶",
    moderate: "Moderately active 🏃",
    active: "Very active 💪",
  }[activity];

  const MacroBar = ({ lbl, grams, color, kcal }) => {
    const pct = Math.round((kcal / tdee) * 100);
    return (
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{lbl}</span>
          <span style={{ fontSize: 13, color: C.muted }}>{grams}g · {kcal} kcal · {pct}%</span>
        </div>
        <div style={{ height: 8, background: C.border, borderRadius: 6, overflow: "hidden" }}>
          <div
            style={{
              height: "100%", borderRadius: 6, background: color,
              width: `${pct}%`, transition: "width 0.6s ease",
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div>
      <h3 style={{ ...heading, fontSize: 24, margin: "0 0 6px" }}>Your Goals</h3>
      <p style={{ color: C.muted, fontSize: 14, margin: "0 0 18px", lineHeight: 1.6 }}>
        Every portion calculation is tailored to these numbers, {name}.
      </p>

      {/* Big calorie card */}
      <div style={{ ...card, background: C.green, border: "none", marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Daily calorie target
        </p>
        <p style={{ ...heading, fontSize: 52, margin: "8px 0 4px", color: "#fff", letterSpacing: "-0.02em" }}>
          {tdee.toLocaleString()}
        </p>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: 15 }}>kilocalories per day</p>
      </div>

      {/* Per-meal guide */}
      <div style={{ ...card, marginBottom: 12 }}>
        <p style={{ ...label, marginBottom: 14 }}>Per-meal targets (3 meals)</p>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { lbl: "Calories", val: Math.round(tdee / 3), unit: "kcal", color: C.greenLight, tc: C.greenDark },
            { lbl: "Protein", val: Math.round(protein / 3), unit: "g", color: C.peachLight, tc: "#A0522D" },
            { lbl: "Carbs", val: Math.round(carbs / 3), unit: "g", color: "#FEF9E7", tc: "#8B6914" },
          ].map((m) => (
            <div key={m.lbl} style={{
              flex: 1, background: m.color, borderRadius: 14, padding: "12px 10px", textAlign: "center",
            }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: m.tc }}>{m.val}</p>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: m.tc, opacity: 0.8, fontWeight: 600 }}>{m.unit} {m.lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Macro breakdown */}
      <div style={{ ...card, marginBottom: 12 }}>
        <p style={{ ...label, marginBottom: 18 }}>Macro breakdown</p>
        <MacroBar lbl="🥩 Protein" grams={protein} color="#D97B6B" kcal={protein * 4} />
        <MacroBar lbl="🌾 Carbohydrates" grams={carbs} color="#C9A84C" kcal={carbs * 4} />
        <MacroBar lbl="🥑 Fats" grams={fat} color="#7FAED0" kcal={fat * 9} />
      </div>

      {/* Profile summary */}
      <div style={card}>
        <p style={{ ...label, marginBottom: 14 }}>Profile</p>
        {[
          ["Age", `${age} years old`],
          ["Height & Weight", `${height} cm · ${weight} kg`],
          ["Biological sex", sex === "female" ? "Female" : "Male"],
          ["Activity level", actLabel],
          ["Goal", goalLabel],
        ].map(([k, v]) => (
          <div
            key={k}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: `1px solid ${C.border}`,
            }}
          >
            <span style={{ fontSize: 13, color: C.muted }}>{k}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
