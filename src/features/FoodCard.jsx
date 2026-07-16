import { useMemo, useState } from "react";
import { Card, SectionLabel } from "../components/ui.jsx";
import { num, mealsOf, mealTotals, intakeOf, proteinOf, sanitizeDecimal } from "../lib/util.js";
import { keyPlus } from "../lib/dates.js";
import { resolveTargets, kcalFromMacros, gapSuggestions } from "../lib/adaptive.js";

// The food hub: personal library (foods + bundles), quick protein adds, copy
// yesterday, macro bars, and the evening gap-closer. One card owns eating.

const MacroBar = ({ label, val, target, color, unit = "g" }) => {
  const pct = target ? Math.min(100, (val / target) * 100) : 0;
  return (
    <div style={{ flex: "1 1 30%", minWidth: 90 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
        <span style={{ color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        <span style={{ color: "var(--dim)" }}>
          {Math.round(val)}{target ? ` / ${Math.round(target)}` : ""}{unit}
        </span>
      </div>
      <div style={{ background: "var(--card2)", borderRadius: 6, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 6, transition: "width 0.3s" }} />
      </div>
    </div>
  );
};

const EMPTY_FORM = { name: "", p: "", c: "", f: "", kcal: "", kcalTouched: false, save: true };

export default function FoodCard({ data, day, setDay, update, dateKey }) {
  const meals = mealsOf(day);
  const totals = mealTotals(day);
  const targets = useMemo(() => resolveTargets(data), [data]);
  const intake = intakeOf(day);
  const protein = proteinOf(day);
  const manualCalIn = num(day.calIn) !== null;

  const kcalDone = targets.kcal !== null && intake !== null && intake >= targets.kcal * 0.95;
  const [collapsed, setCollapsed] = useState(meals.length === 0 || kcalDone);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [protDraft, setProtDraft] = useState("");
  const [bundleName, setBundleName] = useState(null); // null = closed, "" = naming

  const [showAll, setShowAll] = useState(false);
  const foods = data.foods || [];
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return foods.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 12);
    if (showAll) return [...foods].sort((a, b) => a.name.localeCompare(b.name));
    return [...foods].sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0)).slice(0, 6);
  }, [foods, query, showAll]);

  const yesterday = mealsOf(data.days[keyPlus(dateKey, -1)]);
  const gap = useMemo(
    () => gapSuggestions(data, day, targets, intake || 0, protein),
    [data, day, targets, intake, protein]
  );

  const setMeals = (m) => setDay({ meals: m });
  const scaled = (f, qty) => ({
    name: f.name, qty,
    kcal: Math.round((num(f.kcal) || 0) * qty),
    p: Math.round((num(f.p) || 0) * qty * 10) / 10,
    c: Math.round((num(f.c) || 0) * qty * 10) / 10,
    f: Math.round((num(f.f) || 0) * qty * 10) / 10,
  });

  const touchFood = (id) => update((d) => ({
    ...d,
    foods: (d.foods || []).map((x) => (x.id === id ? { ...x, lastUsed: Date.now() } : x)),
  }));

  const logFood = (food, qty = 1) => {
    if (food.bundle && Array.isArray(food.items)) {
      // bundles expand into their items so each stays individually editable
      setMeals([...meals, ...food.items.map((it) => ({ ...it }))]);
    } else {
      setMeals([...meals, { foodId: food.id, ...scaled(food, qty) }]);
    }
    touchFood(food.id);
    setQuery("");
  };

  const copyYesterday = () => setMeals([...meals, ...yesterday.map((m) => ({ ...m }))]);

  const saveBundle = () => {
    const name = (bundleName || "").trim();
    if (!name || meals.length < 2) return;
    update((d) => ({
      ...d,
      foods: [...(d.foods || []), {
        id: `b${Date.now()}`, name, bundle: true, lastUsed: Date.now(),
        items: meals.map((m) => ({ name: m.name, qty: m.qty, kcal: m.kcal, p: m.p, c: m.c, f: m.f })),
        kcal: Math.round(totals.kcal), p: totals.p, c: totals.c, f: totals.f,
      }],
    }));
    setBundleName(null);
  };

  const changeQty = (i, delta) => {
    const m = meals[i];
    const per = m.qty > 0 ? { kcal: m.kcal / m.qty, p: m.p / m.qty, c: m.c / m.qty, f: m.f / m.qty } : m;
    const qty = Math.max(0.5, Math.round((m.qty + delta) * 2) / 2);
    setMeals(meals.map((x, xi) => (xi === i ? {
      ...x, qty,
      kcal: Math.round(per.kcal * qty),
      p: Math.round(per.p * qty * 10) / 10,
      c: Math.round(per.c * qty * 10) / 10,
      f: Math.round(per.f * qty * 10) / 10,
    } : x)));
  };
  const removeMeal = (i) => setMeals(meals.filter((_, x) => x !== i));

  // quick protein (the old protein card's fast path, now living here)
  const protEntries = day.proteinEntries || [];
  const addProtein = (g) => {
    if (!g || g <= 0) return;
    const migrated = protEntries.length === 0 && num(day.protein) ? [num(day.protein)] : protEntries;
    setDay({ proteinEntries: [...migrated, g], protein: "" });
  };

  // new/edit food form with macro→kcal auto-calc
  const setF = (k, v) => setForm((s) => {
    const next = { ...s, [k]: v };
    if (k === "kcal") next.kcalTouched = v !== "";
    if (!next.kcalTouched && (k === "p" || k === "c" || k === "f")) {
      const auto = kcalFromMacros(next.p, next.c, next.f);
      next.kcal = auto > 0 ? String(auto) : "";
    }
    return next;
  });
  const openNew = () => { setForm({ ...EMPTY_FORM, name: query.trim() }); setEditId(null); setFormOpen(true); };
  const openEdit = (food) => {
    setForm({ name: food.name, p: String(food.p ?? ""), c: String(food.c ?? ""), f: String(food.f ?? ""), kcal: String(food.kcal ?? ""), kcalTouched: true, save: true });
    setEditId(food.id);
    setFormOpen(true);
  };
  const formValid = num(form.kcal) !== null || num(form.p) !== null || num(form.c) !== null || num(form.f) !== null;
  const submitForm = (alsoLog) => {
    if (!formValid) return;
    const entry = {
      name: form.name.trim() || "food",
      kcal: num(form.kcal) ?? kcalFromMacros(form.p, form.c, form.f),
      p: num(form.p) ?? 0, c: num(form.c) ?? 0, f: num(form.f) ?? 0,
    };
    let saved = null;
    if (editId !== null) {
      update((d) => ({ ...d, foods: (d.foods || []).map((x) => (x.id === editId ? { ...x, ...entry } : x)) }));
    } else if (form.save) {
      saved = { id: `f${Date.now()}`, ...entry, lastUsed: Date.now() };
      update((d) => ({ ...d, foods: [...(d.foods || []), saved] }));
    }
    if (alsoLog && editId === null) {
      if (saved) logFood(saved);
      else setMeals([...meals, { name: entry.name, qty: 1, kcal: entry.kcal, p: entry.p, c: entry.c, f: entry.f }]);
    }
    setForm(EMPTY_FORM);
    setFormOpen(false);
    setEditId(null);
  };
  const deleteFood = (food) => {
    if (!confirm(`Remove "${food.name}" from your library? Logged days keep their history.`)) return;
    update((d) => ({ ...d, foods: (d.foods || []).filter((x) => x.id !== food.id) }));
  };

  const status = kcalDone
    ? `✓ ${Math.round(intake)} kcal · target hit ${collapsed ? "▾" : "▴"}`
    : meals.length || protein > 0
      ? `${intake !== null ? Math.round(intake) : 0} kcal · ${Math.round(protein)}g protein ${collapsed ? "▾" : "▴"}`
      : `tap to log ${collapsed ? "▾" : "▴"}`;

  return (
    <Card style={{ marginTop: 16, borderColor: kcalDone ? "color-mix(in srgb, var(--good) 40%, var(--line))" : undefined }}>
      <button className="row" style={{ width: "100%", justifyContent: "space-between", textAlign: "left" }}
        onClick={() => setCollapsed((c) => !c)}>
        <SectionLabel>Food & protein</SectionLabel>
        <div style={{ fontSize: 13, fontWeight: 700, color: kcalDone ? "var(--good)" : meals.length ? "var(--fuel)" : "var(--dim)", marginBottom: 10 }}>{status}</div>
      </button>

      {!collapsed && (
        <div>
          <div className="row" style={{ alignItems: "baseline", gap: 10, marginBottom: 2 }}>
            <div className="display" style={{ fontSize: 30, fontWeight: 700, color: "var(--fuel)" }}>
              {intake !== null ? intake.toLocaleString() : "—"}
              <span style={{ fontSize: 14, color: "var(--dim)" }}> kcal in</span>
            </div>
            {targets.kcal !== null && (
              <div style={{ fontSize: 13, fontWeight: 700, color: intake !== null && intake > targets.kcal ? "var(--bad)" : "var(--dim)" }}>
                target ~{targets.kcal.toLocaleString()}
                {targets.source === "garmin" ? " (Garmin est.)" : targets.source === "measured" ? " (measured)" : ""}
              </div>
            )}
          </div>
          {manualCalIn && meals.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 6 }}>
              Using your typed MFP total ({num(day.calIn)}) — food log sums to {Math.round(totals.kcal)}.
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "8px 0 10px" }}>
            <MacroBar label="Protein" val={protein} target={targets.protein} color="var(--c-good)" />
            <MacroBar label="Carbs" val={totals.c} target={targets.carbs} color="var(--c-fuel)" />
            <MacroBar label="Fat" val={totals.f} target={targets.fat} color="var(--c-ember)" />
          </div>

          {/* protein quick-adds (food entries count automatically) */}
          <div className="row" style={{ gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {[10, 20, 30, 40].map((g) => (
              <button key={g} className="btn grow" style={{ fontWeight: 800, minWidth: 52 }} onClick={() => addProtein(g)}>+{g}g</button>
            ))}
            <input inputMode="decimal" placeholder="g" value={protDraft}
              onChange={(e) => setProtDraft(sanitizeDecimal(e.target.value))}
              onKeyDown={(e) => { if (e.key === "Enter") { addProtein(num(protDraft)); setProtDraft(""); } }}
              style={{ width: 58, fontSize: 14, padding: 8, textAlign: "center" }} />
            <button className="btn" style={{ fontWeight: 800, fontSize: 12 }}
              title="Replace today's quick-adds with this total (from MyFitnessPal)"
              onClick={() => { const g = num(protDraft); if (g) { setDay({ proteinEntries: [g], protein: "" }); setProtDraft(""); } }}>
              =MFP
            </button>
          </div>
          {(protEntries.length > 0 || num(day.protein)) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {num(day.protein) ? <div style={{ background: "var(--card2)", borderRadius: 8, padding: "4px 9px", fontSize: 12, color: "var(--dim)" }}>{num(day.protein)}g (earlier)</div> : null}
              {protEntries.map((g, i) => (
                <div key={i} style={{ background: "var(--card2)", borderRadius: 8, padding: "4px 8px", fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                  {g}g <button onClick={() => setDay({ proteinEntries: protEntries.filter((_, x) => x !== i) })} aria-label={`Remove ${g}g`} style={{ color: "var(--dim)", fontWeight: 700 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* gap closer */}
          {gap && gap.picks.length > 0 && (
            <div style={{ padding: "9px 11px", borderRadius: 10, background: "color-mix(in srgb, var(--good) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--good) 30%, var(--line))", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--good)", marginBottom: 4 }}>
                {gap.needP}g protein to go{gap.budget !== null ? ` · ${gap.budget} kcal in the budget` : ""} — closes it:
              </div>
              {gap.picks.slice(0, 2).map((s) => (
                <div key={s.food.id} className="row" style={{ gap: 8, fontSize: 13, padding: "3px 0" }}>
                  <span className="grow">{s.servings > 1 ? `${s.servings}× ` : ""}{s.food.name} <span style={{ color: "var(--dim)" }}>+{s.gp}g · {s.kcal} kcal</span></span>
                  <button className="btn" style={{ padding: "3px 10px", fontSize: 12, fontWeight: 800, color: "var(--good)" }}
                    onClick={() => { for (let i = 0; i < s.servings; i++) logFood(s.food); }}>
                    Log
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* logged entries */}
          {meals.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {meals.map((m, i) => (
                <div key={i} className="row" style={{ gap: 8, padding: "6px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <div className="grow" style={{ fontSize: 14 }}>
                    {m.name}
                    <span style={{ color: "var(--dim)", fontSize: 12 }}> · {m.kcal} kcal · {m.p}p/{m.c}c/{m.f}f</span>
                  </div>
                  <button className="btn" style={{ padding: "2px 9px", fontWeight: 800 }} aria-label={`Less ${m.name}`} onClick={() => changeQty(i, -0.5)}>−</button>
                  <div style={{ fontSize: 13, fontWeight: 700, minWidth: 26, textAlign: "center" }}>×{m.qty}</div>
                  <button className="btn" style={{ padding: "2px 9px", fontWeight: 800 }} aria-label={`More ${m.name}`} onClick={() => changeQty(i, 0.5)}>+</button>
                  <button onClick={() => removeMeal(i)} aria-label={`Remove ${m.name}`} style={{ color: "var(--dim)", fontWeight: 700, padding: "0 4px" }}>×</button>
                </div>
              ))}
              {meals.length >= 2 && (
                bundleName === null ? (
                  <button className="btn" style={{ width: "100%", marginTop: 6, fontSize: 12, fontWeight: 700 }} onClick={() => setBundleName("")}>
                    📦 Save these {meals.length} as a bundle
                  </button>
                ) : (
                  <div className="row" style={{ gap: 6, marginTop: 6 }}>
                    <input className="body-font" placeholder="Bundle name — e.g. My breakfast" value={bundleName}
                      onChange={(e) => setBundleName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveBundle()}
                      style={{ fontSize: 14, padding: "8px 10px" }} />
                    <button className="btn primary" style={{ fontWeight: 800 }} disabled={!bundleName.trim()} onClick={saveBundle}>Save</button>
                    <button className="btn" onClick={() => setBundleName(null)}>✕</button>
                  </div>
                )
              )}
            </div>
          )}

          {yesterday.length > 0 && meals.length === 0 && (
            <button className="btn" style={{ width: "100%", marginBottom: 10, fontWeight: 700 }} onClick={copyYesterday}>
              ⧉ Copy yesterday's {yesterday.length} item{yesterday.length === 1 ? "" : "s"} ({Math.round(yesterday.reduce((a, m) => a + m.kcal, 0))} kcal)
            </button>
          )}

          {/* library search + results */}
          {!formOpen && (
            <>
              <input className="body-font" placeholder={foods.length ? "Search your foods…" : "Your library is empty — add your first food"}
                value={query} onChange={(e) => setQuery(e.target.value)}
                style={{ fontSize: 15, padding: "10px 12px", marginBottom: 8 }} />
              {results.map((f) => (
                <div key={f.id} className="row" style={{ gap: 8, padding: "7px 0", borderTop: "1px solid var(--line)" }}>
                  <button className="grow row" style={{ textAlign: "left", gap: 8 }} onClick={() => logFood(f)}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{f.bundle ? "📦 " : ""}{f.name}</span>
                    <span style={{ fontSize: 12, color: "var(--dim)" }}>
                      {f.kcal} kcal · {f.p}p{f.bundle ? ` · ${f.items?.length || 0} items` : `/${f.c}c/${f.f}f`}
                    </span>
                  </button>
                  <button className="btn" style={{ padding: "4px 10px", fontSize: 12, fontWeight: 800, color: "var(--fuel)" }}
                    aria-label={`Log ${f.name}`} onClick={() => logFood(f)}>+ Log</button>
                  {!f.bundle && <button style={{ color: "var(--dim)", fontSize: 13, padding: "0 2px" }} aria-label={`Edit ${f.name}`} onClick={() => openEdit(f)}>✎</button>}
                  <button style={{ color: "var(--dim)", fontSize: 15, padding: "0 2px" }} aria-label={`Delete ${f.name}`} onClick={() => deleteFood(f)}>×</button>
                </div>
              ))}
              {query.trim() && results.length === 0 && (
                <div style={{ fontSize: 13, color: "var(--dim)", padding: "4px 0 8px" }}>Nothing named “{query.trim()}” yet.</div>
              )}
              {!query.trim() && foods.length > 6 && (
                <button
                  style={{ width: "100%", padding: "8px 0", fontSize: 13, fontWeight: 700, color: "var(--fuel)", textAlign: "center" }}
                  onClick={() => setShowAll((s) => !s)}>
                  {showAll ? "Show recent only ▴" : `Show all ${foods.length} foods (A–Z) ▾`}
                </button>
              )}
              <button className="btn" style={{ width: "100%", marginTop: 8, fontWeight: 700 }} onClick={openNew}>
                + New food {query.trim() ? `“${query.trim()}”` : ""}
              </button>
            </>
          )}

          {formOpen && (
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                {editId !== null ? "Edit food" : "New food"}
                <span style={{ color: "var(--dim)", fontWeight: 400 }}> — type the macros off the label; calories fill themselves (4/4/9)</span>
              </div>
              <input className="body-font" placeholder="Name — e.g. Fairlife shake" value={form.name}
                onChange={(e) => setF("name", e.target.value)}
                style={{ fontSize: 15, padding: "10px 12px", marginBottom: 8 }} />
              <div className="row" style={{ gap: 8 }}>
                {[["p", "protein g"], ["c", "carbs g"], ["f", "fat g"]].map(([k, ph]) => (
                  <input key={k} inputMode="decimal" placeholder={ph} value={form[k]}
                    onChange={(e) => setF(k, sanitizeDecimal(e.target.value))}
                    style={{ fontSize: 15, padding: 9, textAlign: "center", flex: 1 }} />
                ))}
                <input inputMode="numeric" placeholder="kcal" value={form.kcal}
                  onChange={(e) => setF("kcal", sanitizeDecimal(e.target.value))}
                  style={{ fontSize: 15, padding: 9, textAlign: "center", flex: 1, borderColor: form.kcalTouched ? "var(--line)" : "color-mix(in srgb, var(--fuel) 45%, var(--line))" }} />
              </div>
              {!form.kcalTouched && num(form.kcal) !== null && (
                <div style={{ fontSize: 11, color: "var(--fuel)", marginTop: 4 }}>kcal auto-calculated from macros — type over it if the label differs</div>
              )}
              {editId === null && (
                <label className="row" style={{ gap: 8, marginTop: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.save} onChange={(e) => setForm((s) => ({ ...s, save: e.target.checked }))} style={{ width: 18, height: 18 }} />
                  Keep in my library (recurring food)
                </label>
              )}
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                {editId === null ? (
                  <button className="btn primary grow" style={{ fontWeight: 800 }} disabled={!formValid} onClick={() => submitForm(true)}>
                    ✓ Log today{form.save ? " & save" : " (one-off)"}
                  </button>
                ) : (
                  <button className="btn primary grow" style={{ fontWeight: 800 }} disabled={!formValid} onClick={() => submitForm(false)}>
                    ✓ Save changes
                  </button>
                )}
                <button className="btn" onClick={() => { setFormOpen(false); setEditId(null); setForm(EMPTY_FORM); }}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 10 }}>
            Food entries fill calories-in and protein automatically. Typing an MFP total in the Garmin card overrides calories for the day.
          </div>
        </div>
      )}
    </Card>
  );
}
