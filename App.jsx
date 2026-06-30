import { useState, useRef, useEffect } from "react";

// ── PALETTE ──────────────────────────────────────────────────────
const P = {
  bg: "#F5EEE4", dark: "#26231E", acc1: "#C46B49", acc2: "#A89470",
  cream: "#FCF8F0", muted: "#B4AA9B", lgray: "#F0EBE3", mid: "#3D3830",
  green: "#7A9E7E", blue: "#5B8DB8", purple: "#8B6BAE",
  brown1: "#9B6B3A", brown2: "#5C4A3A", auto: "#EDE6DD",
};

const MEALS = [
  { id: "breakfast", label: "Breakfast", emoji: "🌅", color: P.acc1 },
  { id: "lunch",     label: "Lunch",     emoji: "☀️",  color: P.brown1 },
  { id: "dinner",    label: "Dinner",    emoji: "🌙", color: P.brown2 },
  { id: "snacks",    label: "Snacks",    emoji: "🍎", color: "#7A6B55" },
];

// ── AI LOOKUP ────────────────────────────────────────────────────
async function aiLookup(foodName, portion) {
  await fetch("/.netlify/functions/claude", {
    method: "POST",
   headers: { 
  "Content-Type": "application/json",
   },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      system: `You are a nutrition database. Return ONLY valid JSON, no markdown, no explanation.
Given food name and portion in grams, return: {"cal":number,"protein":number,"carbs":number,"fat":number,"fiber":number}
All values are for the exact portion given (not per 100g). Use accurate Indonesian and international food data.`,
      messages: [{ role: "user", content: `Food: "${foodName}", Portion: ${portion}g` }]
    })
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ── CALORIE RING ─────────────────────────────────────────────────
function Ring({ value, max, size = 110 }) {
  const r = 44, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, max > 0 ? value / max : 0);
  const over = value > max;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={P.lgray} strokeWidth={10} />
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={over ? "#C0392B" : P.acc1} strokeWidth={10}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s ease" }} />
    </svg>
  );
}

// ── MACRO BAR ────────────────────────────────────────────────────
function MacroBar({ label, val, max, color }) {
  const pct = Math.min(100, max > 0 ? (val / max) * 100 : 0);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: P.mid, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color }}>{Math.round(val)}g <span style={{ color: P.muted, fontWeight: 400 }}>/ {max}g</span></span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: P.lgray, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

// ── ADD FOOD MODAL ────────────────────────────────────────────────
function AddModal({ meal, onAdd, onClose }) {
  const [food, setFood] = useState("");
  const [portion, setPortion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef();
  useEffect(() => { inputRef.current?.focus(); }, []);

  async function lookup() {
    if (!food.trim() || !portion) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await aiLookup(food.trim(), Number(portion));
      setResult({ name: food.trim(), portion: Number(portion), ...data });
    } catch { setError("Tidak bisa hitung — coba nama yang lebih spesifik."); }
    setLoading(false);
  }

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10, boxSizing: "border-box",
    border: `1.5px solid ${P.lgray}`, background: P.cream, fontSize: 13,
    color: P.dark, fontFamily: "inherit", outline: "none", transition: "border 0.2s",
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(38,35,30,0.65)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: P.bg, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400,
        boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: meal.color }}>{meal.emoji} Tambah ke {meal.label}</div>
            <div style={{ fontSize: 11, color: P.muted, marginTop: 3 }}>AI auto-hitung kalori & semua makro</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: P.muted, fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Inputs */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: P.mid, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>Nama Makanan</div>
          <input ref={inputRef} value={food} onChange={e => { setFood(e.target.value); setResult(null); setError(""); }}
            onKeyDown={e => e.key === "Enter" && lookup()}
            placeholder="cth: Nasi goreng, Ayam panggang, Salad Caesar..."
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = P.acc1}
            onBlur={e => e.target.style.borderColor = P.lgray}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: P.mid, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>Porsi (gram)</div>
          <input type="number" value={portion} onChange={e => { setPortion(e.target.value); setResult(null); setError(""); }}
            onKeyDown={e => e.key === "Enter" && lookup()}
            placeholder="cth: 150"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = P.acc1}
            onBlur={e => e.target.style.borderColor = P.lgray}
          />
        </div>

        <button onClick={lookup} disabled={!food.trim() || !portion || loading}
          style={{
            width: "100%", padding: 13, borderRadius: 12, border: "none",
            background: (!food.trim() || !portion) ? P.lgray : P.acc1,
            color: (!food.trim() || !portion) ? P.muted : "white",
            fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            letterSpacing: "0.03em", transition: "all 0.2s",
          }}>
          {loading ? "⏳  Menghitung kalori..." : "✦  Hitung dengan AI"}
        </button>

        {error && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: "#FEF0ED", borderRadius: 8, fontSize: 12, color: P.acc1 }}>{error}</div>
        )}

        {result && (
          <div style={{ marginTop: 14, padding: 16, background: P.cream, borderRadius: 12, border: `1.5px solid ${meal.color}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: P.dark, marginBottom: 12 }}>
              {result.name} <span style={{ color: P.muted, fontWeight: 400 }}>— {result.portion}g</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, marginBottom: 14 }}>
              {[
                { l: "Kalori", v: Math.round(result.cal), u: "kcal", c: P.acc1 },
                { l: "Protein", v: Math.round(result.protein), u: "g", c: "#C46B49" },
                { l: "Carbs", v: Math.round(result.carbs), u: "g", c: P.brown1 },
                { l: "Fat", v: Math.round(result.fat), u: "g", c: "#7A6B55" },
                { l: "Fiber", v: Math.round(result.fiber || 0), u: "g", c: P.green },
              ].map(m => (
                <div key={m.l} style={{ textAlign: "center", padding: "8px 4px", background: P.bg, borderRadius: 8 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: m.c, lineHeight: 1 }}>{m.v}</div>
                  <div style={{ fontSize: 8, color: P.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "2px 0" }}>{m.u}</div>
                  <div style={{ fontSize: 9, color: P.mid }}>{m.l}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { onAdd(result); onClose(); }}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "none", background: meal.color, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              + Tambahkan ke {meal.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── FOOD ROW ─────────────────────────────────────────────────────
function FoodRow({ item, onDelete }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 56px 70px 52px 52px 52px 24px",
      gap: 4, padding: "7px 10px", background: P.cream, borderRadius: 8,
      marginBottom: 3, border: `1px solid ${P.lgray}`, alignItems: "center",
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: P.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
      <span style={{ fontSize: 11, color: P.muted, textAlign: "center" }}>{item.portion}g</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: P.acc1, textAlign: "center" }}>{Math.round(item.cal)} kcal</span>
      <span style={{ fontSize: 11, color: "#C46B49", textAlign: "center" }}>{Math.round(item.protein)}g</span>
      <span style={{ fontSize: 11, color: P.brown1, textAlign: "center" }}>{Math.round(item.carbs)}g</span>
      <span style={{ fontSize: 11, color: "#7A6B55", textAlign: "center" }}>{Math.round(item.fat)}g</span>
      <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: P.muted, fontSize: 15, padding: 0, lineHeight: 1 }}
        onMouseEnter={e => e.target.style.color = P.acc1}
        onMouseLeave={e => e.target.style.color = P.muted}>×</button>
    </div>
  );
}

// ── MEAL SECTION ─────────────────────────────────────────────────
function MealSection({ meal, items, onAdd, onDelete }) {
  const [open, setOpen] = useState(false);
  const subtotal = items.reduce((a, i) => ({ cal: a.cal + i.cal, protein: a.protein + i.protein }), { cal: 0, protein: 0 });

  return (
    <>
      {open && <AddModal meal={meal} onAdd={item => onAdd(meal.id, { ...item, id: Date.now() })} onClose={() => setOpen(false)} />}
      <div style={{ background: P.cream, borderRadius: 14, marginBottom: 10, overflow: "hidden", border: `1px solid ${P.lgray}`, boxShadow: "0 1px 6px rgba(38,35,30,0.05)" }}>
        {/* Header */}
        <div style={{ background: meal.color, padding: "11px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15 }}>{meal.emoji}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.03em" }}>{meal.label}</span>
            {items.length > 0 && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
                {Math.round(subtotal.cal)} kcal · {Math.round(subtotal.protein)}g protein
              </span>
            )}
          </div>
          <button onClick={() => setOpen(true)} style={{
            background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)",
            color: "white", borderRadius: 8, padding: "4px 12px", fontSize: 11,
            fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>+ Tambah</button>
        </div>

        {/* Body */}
        <div style={{ padding: items.length ? "8px 8px 4px" : 10 }}>
          {items.length === 0 ? (
            <p style={{ margin: 0, fontSize: 11, color: P.muted, textAlign: "center", padding: "6px 0", fontStyle: "italic" }}>
              Belum ada makanan — klik + Tambah
            </p>
          ) : (
            <>
              {/* Col headers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 70px 52px 52px 52px 24px", gap: 4, padding: "0 10px 5px" }}>
                {["Makanan","Porsi","Kalori","Protein","Carbs","Fat",""].map((h, i) => (
                  <span key={i} style={{ fontSize: 9, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: i > 0 ? "center" : "left" }}>{h}</span>
                ))}
              </div>
              {items.map(item => <FoodRow key={item.id} item={item} onDelete={() => onDelete(meal.id, item.id)} />)}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── WATER TRACKER ─────────────────────────────────────────────────
function Water({ value, onChange }) {
  return (
    <div style={{ background: P.cream, borderRadius: 12, padding: "10px 14px", border: `1px solid ${P.lgray}`, display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 16 }}>💧</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: P.mid }}>Air Minum</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: P.blue }}>{value.toFixed(1)}L / 3.0L</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: P.lgray, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, (value / 3) * 100)}%`, background: P.blue, borderRadius: 99, transition: "width 0.3s" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        <button onClick={() => onChange(Math.max(0, Math.round((value - 0.25) * 10) / 10))}
          style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${P.lgray}`, background: P.bg, color: P.mid, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>−</button>
        <button onClick={() => onChange(Math.round((value + 0.25) * 10) / 10)}
          style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: P.blue, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+</button>
      </div>
    </div>
  );
}

// ── TABS ──────────────────────────────────────────────────────────
function Tab({ active, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
      background: active ? P.acc1 : "transparent",
      color: active ? "white" : P.muted,
      fontSize: 12, fontWeight: 700, fontFamily: "inherit",
      transition: "all 0.2s", letterSpacing: "0.03em",
    }}>{label}</button>
  );
}

// ── WEEKLY VIEW ───────────────────────────────────────────────────
function WeeklyView({ weekData, setWeekData }) {
  const days = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
  const metrics = [
    { key: "cal",     label: "Calories (kcal)", color: P.acc1 },
    { key: "protein", label: "Protein (g)",     color: "#C46B49" },
    { key: "carbs",   label: "Carbs (g)",       color: P.brown1 },
    { key: "fat",     label: "Fat (g)",         color: "#7A6B55" },
    { key: "water",   label: "Water (L)",       color: P.blue },
  ];
  const avg = arr => { const s = arr.reduce((a,b)=>a+Number(b),0); return Math.round(s/arr.length * 10)/10; };
  const update = (mi, di, v) => setWeekData(d => d.map((r,i) => i===mi ? r.map((x,j) => j===di ? v : x) : r));

  return (
    <div style={{ background: P.cream, borderRadius: 14, overflow: "hidden", border: `1px solid ${P.lgray}` }}>
      {/* Section header */}
      <div style={{ background: P.acc1, padding: "10px 14px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "white", letterSpacing: "0.06em" }}>DAILY CALORIE & MACRO LOG</div>
      </div>
      {/* Col headers */}
      <div style={{ background: P.mid, display: "grid", gridTemplateColumns: "1fr repeat(7,1fr) 60px", gap: 2, padding: "5px 10px" }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: P.acc2 }}>METRIC</span>
        {days.map(d => <span key={d} style={{ fontSize: 9, fontWeight: 700, color: P.acc2, textAlign: "center" }}>{d}</span>)}
        <span style={{ fontSize: 9, fontWeight: 700, color: P.acc2, textAlign: "center" }}>AVG</span>
      </div>
      {metrics.map((m, mi) => (
        <div key={m.key} style={{ background: mi%2===0 ? P.cream : P.lgray, display: "grid", gridTemplateColumns: "1fr repeat(7,1fr) 60px", gap: 2, padding: "0 10px", alignItems: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: m.color, padding: "5px 0" }}>{m.label}</div>
          {weekData[mi].map((v, di) => (
            <input key={di} type="number" value={v}
              onChange={e => update(mi, di, e.target.value)}
              style={{ textAlign: "center", fontSize: 11, border: "none", background: "transparent", color: P.dark, fontFamily: "inherit", padding: "5px 0", width: "100%", outline: "none" }} />
          ))}
          <div style={{ fontSize: 11, fontWeight: 700, color: m.color, textAlign: "center", padding: "5px 0" }}>{avg(weekData[mi])}</div>
        </div>
      ))}
      {/* Macro % */}
      <div style={{ background: P.mid, padding: "8px 14px", marginTop: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "white", letterSpacing: "0.06em", marginBottom: 6 }}>MACRO DISTRIBUTION (auto)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {[
            { label: "Protein %", si: 1, f: 4, c: "#C46B49" },
            { label: "Carbs %",   si: 2, f: 4, c: P.brown1 },
            { label: "Fat %",     si: 3, f: 9, c: "#7A6B55" },
          ].map((m, i) => {
            const pcts = weekData[0].map((cal, di) => cal > 0 ? Math.round(weekData[m.si][di] * m.f / cal * 100) : 0);
            const a = Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length);
            return (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: m.c }}>{a}%</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>{m.label}</div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Body stats */}
      <div style={{ background: P.purple, padding: "8px 14px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "white", letterSpacing: "0.06em", marginBottom: 8 }}>BODY STATS & PROGRESS</div>
        {[
          { label: "Berat (kg)", color: P.green },
          { label: "Pinggang (cm)", color: P.acc1 },
          { label: "Pinggul (cm)", color: "#C46B49" },
        ].map((stat, si) => {
          const [vals, setVals] = useState(Array(7).fill(""));
          const change = vals[6] && vals[0] ? (Number(vals[6]) - Number(vals[0])).toFixed(1) : "—";
          const down = Number(change) < 0;
          return (
            <div key={si} style={{ marginBottom: si < 2 ? 6 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: stat.color, width: 90, flexShrink: 0 }}>{stat.label}</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, flex: 1 }}>
                  {vals.map((v, i) => (
                    <input key={i} type="number" value={v}
                      onChange={e => setVals(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                      style={{ textAlign: "center", fontSize: 10, border: "none", background: "rgba(255,255,255,0.1)", borderRadius: 4, color: "white", fontFamily: "inherit", padding: "3px 0", width: "100%", outline: "none" }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: change === "—" ? "rgba(255,255,255,0.4)" : down ? P.green : "#E74C3C", width: 36, textAlign: "right", flexShrink: 0 }}>{change}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("daily");
  const [target, setTarget] = useState(1800);
  const [proteinTarget, setProteinTarget] = useState(140);
  const [editingTarget, setEditingTarget] = useState(false);
  const [meals, setMeals] = useState({ breakfast: [], lunch: [], dinner: [], snacks: [] });
  const [water, setWater] = useState(0);
  const [workout, setWorkout] = useState("");
  const [weekData, setWeekData] = useState(Array(5).fill(null).map(() => Array(7).fill(0)));

  const date = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const addFood = (mealId, item) => setMeals(m => ({ ...m, [mealId]: [...m[mealId], item] }));
  const deleteFood = (mealId, id) => setMeals(m => ({ ...m, [mealId]: m[mealId].filter(f => f.id !== id) }));

  const allFoods = Object.values(meals).flat();
  const totals = allFoods.reduce((a, f) => ({
    cal: a.cal + f.cal, protein: a.protein + f.protein,
    carbs: a.carbs + f.carbs, fat: a.fat + f.fat,
  }), { cal: 0, protein: 0, carbs: 0, fat: 0 });

  const remaining = target - Math.round(totals.cal);
  const over = remaining < 0;
  const calPct = Math.min(100, (totals.cal / target) * 100);

  return (
    <div style={{ minHeight: "100vh", background: P.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── HEADER ── */}
      <div style={{ background: P.dark, padding: "18px 18px 14px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>
                CALORIE <span style={{ color: P.acc1 }}>&</span> JOURNAL
              </h1>
              <p style={{ margin: "3px 0 0", fontSize: 10, color: P.acc2, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Track · Nourish · Transform
              </p>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: P.muted }}>{date}</p>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 14, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 4 }}>
            <Tab active={tab === "daily"}  label="Daily Tracker"   onClick={() => setTab("daily")} />
            <Tab active={tab === "weekly"} label="Weekly Overview" onClick={() => setTab("weekly")} />
          </div>
        </div>
      </div>

      {/* Terracotta stripe */}
      <div style={{ height: 4, background: P.acc1 }} />

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 14px 40px" }}>

        {tab === "daily" && (
          <>
            {/* ── DASHBOARD CARD ── */}
            <div style={{ background: P.cream, borderRadius: 16, padding: 18, marginBottom: 12, border: `1px solid ${P.lgray}`, boxShadow: "0 2px 12px rgba(38,35,30,0.06)" }}>
              <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 14 }}>
                {/* Ring */}
                <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
                  <Ring value={totals.cal} max={target} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 19, fontWeight: 800, color: P.acc1, lineHeight: 1 }}>{Math.round(totals.cal)}</span>
                    <span style={{ fontSize: 9, color: P.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>kcal</span>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: P.muted }}>Target harian</span>
                    {editingTarget ? (
                      <input type="number" defaultValue={target}
                        onBlur={e => { setTarget(Number(e.target.value) || 1800); setEditingTarget(false); }}
                        autoFocus style={{ width: 70, fontSize: 12, fontWeight: 700, color: P.acc1, border: `1px solid ${P.acc1}`, borderRadius: 6, padding: "2px 6px", textAlign: "right", fontFamily: "inherit", outline: "none", background: P.bg }} />
                    ) : (
                      <span onClick={() => setEditingTarget(true)} style={{ fontSize: 12, fontWeight: 700, color: P.acc1, cursor: "pointer", borderBottom: `1px dashed ${P.acc2}` }}>
                        {target.toLocaleString()} kcal ✏️
                      </span>
                    )}
                  </div>
                  <div style={{ height: 7, borderRadius: 99, background: P.lgray, overflow: "hidden", marginBottom: 10 }}>
                    <div style={{ height: "100%", borderRadius: 99, transition: "width 0.5s", width: `${calPct}%`, background: over ? "#C0392B" : calPct > 85 ? "#E67E22" : P.acc1 }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                    <div style={{ background: over ? "#FEF0ED" : "#EBF5EC", borderRadius: 9, padding: "7px 10px" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: over ? "#C0392B" : P.green }}>{over ? `+${Math.abs(remaining).toLocaleString()}` : remaining.toLocaleString()}</div>
                      <div style={{ fontSize: 9, color: P.muted }}>{over ? "kcal over" : "kcal tersisa"}</div>
                    </div>
                    <div style={{ background: P.lgray, borderRadius: 9, padding: "7px 10px" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: P.mid }}>{Math.round(calPct)}%</div>
                      <div style={{ fontSize: 9, color: P.muted }}>dari target</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Macro bars */}
              <div style={{ borderTop: `1px solid ${P.lgray}`, paddingTop: 12 }}>
                <MacroBar label="Protein" val={totals.protein} max={proteinTarget} color="#C46B49" />
                <MacroBar label="Carbs"   val={totals.carbs}   max={Math.round(target * 0.45 / 4)} color={P.brown1} />
                <MacroBar label="Fat"     val={totals.fat}     max={Math.round(target * 0.28 / 9)} color="#7A6B55" />
              </div>
            </div>

            {/* ── WATER ── */}
            <Water value={water} onChange={setWater} />

            {/* ── MEAL SECTIONS ── */}
            {MEALS.map(meal => (
              <MealSection key={meal.id} meal={meal}
                items={meals[meal.id]}
                onAdd={addFood}
                onDelete={deleteFood} />
            ))}

            {/* ── WORKOUT NOTE ── */}
            <div style={{ background: P.cream, borderRadius: 12, padding: "10px 14px", border: `1px solid ${P.lgray}`, marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14 }}>🏋️</span>
              <input value={workout} onChange={e => setWorkout(e.target.value)}
                placeholder="Catatan workout / aktivitas hari ini..."
                style={{ flex: 1, border: "none", background: "transparent", fontSize: 12, color: P.dark, fontFamily: "inherit", outline: "none" }} />
            </div>

            {/* ── DAILY SUMMARY ── */}
            {allFoods.length > 0 && (
              <div style={{ background: P.dark, borderRadius: 14, padding: 16, border: `1px solid ${P.mid}` }}>
                <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: P.acc2, letterSpacing: "0.1em", textTransform: "uppercase" }}>Daily Total</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
                  {[
                    { l: "Kalori", v: `${Math.round(totals.cal).toLocaleString()} kcal`, c: P.acc1 },
                    { l: "Protein", v: `${Math.round(totals.protein)}g`, c: "#C46B49" },
                    { l: "Carbs", v: `${Math.round(totals.carbs)}g`, c: P.brown1 },
                    { l: "Fat", v: `${Math.round(totals.fat)}g`, c: "#7A6B55" },
                  ].map(s => (
                    <div key={s.l} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 9, color: P.muted, marginTop: 2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "9px 12px", background: over ? "rgba(192,57,43,0.15)" : "rgba(122,158,126,0.15)", borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: over ? "#E74C3C" : P.green, textAlign: "center" }}>
                    {over ? `⚠ Over ${Math.abs(remaining).toLocaleString()} kcal dari target` : `✓ Sisa ${remaining.toLocaleString()} kcal dari target`}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "weekly" && <WeeklyView weekData={weekData} setWeekData={setWeekData} />}
      </div>
    </div>
  );
}
