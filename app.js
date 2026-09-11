const MOD = {
  I: { name: "Marco normativo", short: "M1" },
  II: { name: "PLA / FT", short: "M2" },
  III: { name: "Transparencia", short: "M3" },
  IV: { name: "Análisis / NIIF", short: "M4" },
  V: { name: "Agentes", short: "M5" },
  VI: { name: "FCI / FF", short: "M6" },
};
const KEYS = ["I", "II", "III", "IV", "V", "VI"];
const LS_MISS = "prepidoneo_misses_v1";
const LS_LAST = "prepidoneo_last_v1";

const state = { banco: null, tags: null, session: null, tick: null };

const $ = (html) => { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; };
const el = () => document.getElementById("app");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = (arr, n) => shuffle(arr).slice(0, n);
const loadMiss = () => { try { return JSON.parse(localStorage.getItem(LS_MISS) || "[]"); } catch { return []; } };
const saveMiss = (xs) => localStorage.setItem(LS_MISS, JSON.stringify(xs.slice(-200)));

function tagFor(mod, n, q) {
  const stems = (state.tags && state.tags.stems) || [];
  return stems.find((t) => t.modulo === mod && t.n === n) || stems.find((t) => t.q === q) || null;
}

function itemId(mod, n) { return mod + "-" + n; }

function allItems() {
  const out = [];
  for (const m of KEYS) {
    for (const it of state.banco[m] || []) out.push({ ...it, modulo: m, id: itemId(m, it.n) });
  }
  return out;
}

function withOptions(item) {
  const pool = (state.banco[item.modulo] || [])
    .map((x) => x.a)
    .filter((a) => a && a !== item.a);
  const unique = [...new Set(pool)];
  const distractors = pick(unique, 3);
  while (distractors.length < 3) distractors.push("Ninguna de las anteriores es correcta según la guía CNV.");
  const opts = shuffle([item.a, ...distractors]);
  return { ...item, options: opts, answerIndex: opts.indexOf(item.a), tag: tagFor(item.modulo, item.n, item.q) };
}

function explain(item, ok) {
  const t = item.tag;
  const bits = [];
  bits.push(ok ? "Correcto. Es la respuesta de la guía oficial CNV." : "Incorrecto. La guía oficial marca: «" + item.a + "».");
  if (t && t.trampa) bits.push("Trampa típica: " + t.trampa + ".");
  if (t && t.dato_duro) bits.push("Dato ancla: " + t.dato_duro + ".");
  if (t && t.familia) bits.push("Familia: " + t.familia + ".");
  return bits.join(" ");
}

function startSession({ mode, items, seconds, title }) {
  if (state.tick) clearInterval(state.tick);
  state.session = {
    mode, title,
    items: items.map(withOptions),
    i: 0, answers: {}, flagged: {},
    started: Date.now(),
    ends: seconds ? Date.now() + seconds * 1000 : null,
    done: false,
  };
  state.tick = setInterval(render, 1000);
  location.hash = "#/exam";
  render();
}

function current() { return state.session && state.session.items[state.session.i]; }

function submitExam() {
  const s = state.session;
  if (!s || s.done) return;
  s.done = true;
  if (state.tick) clearInterval(state.tick);
  const review = s.items.map((it, idx) => {
    const pickI = s.answers[idx];
    const ok = pickI === it.answerIndex;
    return { it, pickI, ok };
  });
  const correct = review.filter((r) => r.ok).length;
  const misses = loadMiss();
  for (const r of review) if (!r.ok) misses.push({ id: r.it.id, modulo: r.it.modulo, n: r.it.n, q: r.it.q, a: r.it.a });
  saveMiss(misses);
  const byMod = {};
  for (const k of KEYS) byMod[k] = { c: 0, t: 0 };
  for (const r of review) { byMod[r.it.modulo].t++; if (r.ok) byMod[r.it.modulo].c++; }
  const result = { title: s.title, mode: s.mode, correct, total: s.items.length, seconds: Math.round((Date.now() - s.started) / 1000), review, byMod };
  localStorage.setItem(LS_LAST, JSON.stringify({ correct, total: result.total, mode: s.mode, at: Date.now() }));
  state.session.result = result;
  location.hash = "#/resultado";
  render();
}

function timeLeft() {
  const s = state.session;
  if (!s || !s.ends) return null;
  return Math.max(0, Math.floor((s.ends - Date.now()) / 1000));
}

function fmt(sec) {
  const m = Math.floor(sec / 60), r = sec % 60;
  return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
}

function route() {
  const h = (location.hash || "#/").replace(/^#/, "") || "/";
  return h;
}

function landing() {
  const last = (() => { try { return JSON.parse(localStorage.getItem(LS_LAST) || "null"); } catch { return null; } })();
  const n = allItems().length;
  const misses = loadMiss().length;
  return `
    <h1>Rendir el Idóneo no se improvisa.</h1>
    <p class="lead">Práctica con el banco de la <strong>guía oficial CNV</strong> (${n} preguntas). Simulacro de <strong>60 · 45 min · 70%</strong>. Gratis.</p>
    <p class="disclaimer">Esto <strong>no</strong> es el examen ni material avalado por la CNV. Aprobar acá ≠ inscripción en el Registro de Idóneos. Fuente: Guía de Estudio CNV (jun 2026). Oficial: <a href="https://www.argentina.gob.ar/servicio/rendir-el-examen-de-idoneidad" target="_blank" rel="noopener">argentina.gob.ar</a>.</p>
    <div class="row" style="margin:18px 0">
      <button class="btn primary" data-go="#/diagnostico">Empezar diagnóstico (12)</button>
      <button class="btn" data-go="#/simulacro">Simulacro oficial 60</button>
    </div>
    ${last ? `<p class="meta">Última vez: ${last.correct}/${last.total} · ${last.mode}</p>` : ""}
    <div class="grid">
      ${KEYS.map((k) => `<button class="tile" data-go="#/practica/${k}"><b>${k}. ${MOD[k].name}</b><span>${(state.banco[k] || []).length} preguntas</span></button>`).join("")}
    </div>
    <div class="card">
      <h2>Cómo usarlo</h2>
      <p class="meta">Diagnóstico → práctica del módulo flojo → repetir fallos${misses ? ` (${misses} guardados)` : ""} → simulacro de 45 minutos. Desde 2026 el VEP real es <strong>un intento</strong>.</p>
    </div>
    <footer class="site">PrepIdóneo · práctica no oficial · ${n} ítems · GitHub Pages $0</footer>`;
}

function practicaHome() {
  return `<h1>Práctica por módulo</h1><p class="lead">10 preguntas. Feedback al instante.</p>
    <div class="grid">${KEYS.map((k) => `<button class="tile" data-act="prac" data-m="${k}"><b>${k}. ${MOD[k].name}</b><span>${(state.banco[k] || []).length} en banco</span></button>`).join("")}</div>`;
}

function examView() {
  const s = state.session;
  if (!s) return landing();
  if (s.ends && timeLeft() === 0) { submitExam(); return "<p>Tiempo. Corrigiendo…</p>"; }
  const it = current();
  const idx = s.i;
  const picked = s.answers[idx];
  const left = timeLeft();
  const answered = Object.keys(s.answers).length;
  return `
    <div class="row" style="justify-content:space-between">
      <div><span class="badge">${MOD[it.modulo].short}</span> <strong>${s.title}</strong>
        <div class="meta">Pregunta ${idx + 1} / ${s.items.length} · respondidas ${answered}</div></div>
      ${left !== null ? `<div class="timer">${fmt(left)}</div>` : ""}
    </div>
    <div class="progress" style="margin:12px 0"><span style="width:${((idx + 1) / s.items.length) * 100}%"></span></div>
    <div class="card">
      <div class="qtext">${esc(it.q)}</div>
      <div>${it.options.map((o, i) => `<label class="opt ${picked === i ? "on" : ""}"><input type="radio" name="opt" value="${i}" ${picked === i ? "checked" : ""}/><span><strong>${"ABCD"[i]})</strong> ${esc(o)}</span></label>`).join("")}</div>
    </div>
    <div class="row">
      <button class="btn" data-nav="-1" ${idx === 0 ? "disabled" : ""}>Anterior</button>
      <button class="btn" data-nav="1" ${idx === s.items.length - 1 ? "disabled" : ""}>Siguiente</button>
      <button class="btn ghost" data-skip="1">Saltar</button>
      <button class="btn primary" data-finish="1">Terminar y corregir</button>
    </div>`;
}

function resultView() {
  const r = state.session && state.session.result;
  if (!r) return `<p>No hay resultado. <a href="#/">Volver</a></p>`;
  const pct = Math.round((r.correct / r.total) * 100);
  const passLine = r.mode === "oficial"
    ? (r.correct >= 42 ? `<p class="ok">Aprobado (criterio oficial 42/60).</p>` : `<p class="bad">Desaprobado (hacen falta 42/60).</p>`)
    : `<p class="meta">${pct}% · no es el umbral oficial salvo 60 preguntas.</p>`;
  return `
    <h1>Resultado</h1>
    <p class="score">${r.correct}/${r.total}</p>
    ${passLine}
    <p class="meta">${r.title} · tiempo ${fmt(r.seconds)}</p>
    <div class="card"><h2>Por módulo</h2>
      ${KEYS.filter((k) => r.byMod[k].t).map((k) => `<div class="meta" style="margin:6px 0"><b>${k}</b> ${r.byMod[k].c}/${r.byMod[k].t}
        <div class="progress"><span style="width:${r.byMod[k].t ? (r.byMod[k].c / r.byMod[k].t) * 100 : 0}%"></span></div></div>`).join("")}
    </div>
    <div class="row">
      <button class="btn" data-go="#/fallos">Repetir fallos</button>
      <button class="btn primary" data-go="#/">Inicio</button>
    </div>
    <h2>Revisión</h2>
    ${r.review.map((row, i) => `
      <div class="card">
        <div class="badge">${row.it.modulo} · Q${row.it.n}</div>
        <p>${esc(row.it.q)}</p>
        <p class="${row.ok ? "ok" : "bad"}">${row.ok ? "Bien" : "Mal"} · tu respuesta: ${row.pickI == null ? "sin responder" : esc(row.it.options[row.pickI])}</p>
        <p><strong>Oficial:</strong> ${esc(row.it.a)}</p>
        <p class="meta">${esc(explain(row.it, row.ok))}</p>
      </div>`).join("")}`;
}

function render() {
  const r = route();
  const root = el();
  if (!state.banco) { root.innerHTML = "<p>Cargando…</p>"; return; }

  if (r === "/exam") root.innerHTML = examView();
  else if (r === "/resultado") root.innerHTML = resultView();
  else if (r === "/diagnostico") {
    root.innerHTML = `<h1>Diagnóstico</h1><p class="lead">12 preguntas (2 por módulo). ~10 min.</p>
      <button class="btn primary" data-act="diag">Empezar</button>`;
  } else if (r === "/simulacro") {
    root.innerHTML = `<h1>Simulacro oficial</h1>
      <p class="lead">60 preguntas · 10 por módulo · <strong>45 minutos</strong> · se aprueba con 42 (70%).</p>
      <p class="disclaimer">Cronómetro real. Al terminar se corrige solo. Un VEP del examen CNV = un intento: tratá este simulacro en serio.</p>
      <button class="btn primary" data-act="oficial">Comenzar 45:00</button>`;
  } else if (r === "/practica" || r.startsWith("/practica/")) {
    const m = r.split("/")[2];
    if (m && MOD[m]) {
      root.innerHTML = `<h1>Práctica · ${m}. ${MOD[m].name}</h1>
        <p class="meta">${(state.banco[m] || []).length} preguntas · elijo 10 al azar</p>
        <button class="btn primary" data-act="prac" data-m="${m}">Empezar 10</button>`;
    } else root.innerHTML = practicaHome();
  } else if (r === "/fallos") {
    const misses = loadMiss();
    const uniq = [];
    const seen = new Set();
    for (const x of misses.reverse()) { if (!seen.has(x.id)) { seen.add(x.id); uniq.push(x); } }
    root.innerHTML = `<h1>Repetir fallos</h1>
      <p class="lead">${uniq.length} preguntas distintas que pinchaste.</p>
      ${uniq.length ? `<button class="btn primary" data-act="miss">Practicar ${Math.min(15, uniq.length)}</button>` : `<p class="meta">Todavía no hay fallos. Hacé un diagnóstico.</p>`}`;
  } else root.innerHTML = landing();

  root.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => { location.hash = b.getAttribute("data-go"); }));
  root.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => act(b.dataset.act, b.dataset.m)));
  root.querySelectorAll("[data-nav]").forEach((b) => b.addEventListener("click", () => {
    if (!state.session) return;
    state.session.i = Math.max(0, Math.min(state.session.items.length - 1, state.session.i + Number(b.dataset.nav)));
    render();
  }));
  root.querySelectorAll("[data-skip]").forEach((b) => b.addEventListener("click", () => {
    if (!state.session) return;
    if (state.session.i < state.session.items.length - 1) state.session.i++;
    render();
  }));
  root.querySelectorAll("[data-finish]").forEach((b) => b.addEventListener("click", submitExam));
  root.querySelectorAll("input[name=opt]").forEach((inp) => inp.addEventListener("change", () => {
    state.session.answers[state.session.i] = Number(inp.value);
    render();
  }));
}

function act(kind, m) {
  const all = allItems();
  if (kind === "diag") {
    const chosen = [];
    for (const k of KEYS) {
      const tagged = ((state.tags && state.tags.stems) || []).filter((t) => t.modulo === k);
      const pool = all.filter((x) => x.modulo === k);
      const prefer = tagged.map((t) => pool.find((p) => p.n === t.n)).filter(Boolean);
      chosen.push(...pick(prefer.length ? prefer : pool, 2));
    }
    startSession({ mode: "diagnostico", title: "Diagnóstico", items: chosen, seconds: null });
  } else if (kind === "oficial") {
    const items = [];
    for (const k of KEYS) items.push(...pick(all.filter((x) => x.modulo === k), 10));
    startSession({ mode: "oficial", title: "Simulacro oficial", items, seconds: 45 * 60 });
  } else if (kind === "prac") {
    const pool = all.filter((x) => x.modulo === m);
    startSession({ mode: "practica", title: "Práctica " + m, items: pick(pool, Math.min(10, pool.length)), seconds: null });
  } else if (kind === "miss") {
    const misses = loadMiss();
    const uniq = [];
    const seen = new Set();
    for (const x of misses.reverse()) if (!seen.has(x.id)) { seen.add(x.id); uniq.push(x); }
    const items = uniq.map((x) => all.find((i) => i.id === x.id)).filter(Boolean).slice(0, 15);
    if (!items.length) return;
    startSession({ mode: "fallos", title: "Repetir fallos", items, seconds: null });
  }
}

async function init() {
  try {
    const [b, t] = await Promise.all([
      fetch("./data/banco.json").then((r) => r.json()),
      fetch("./data/tags-mvp.json").then((r) => r.ok ? r.json() : { stems: [] }),
    ]);
    state.banco = b;
    state.tags = t;
    render();
  } catch (e) {
    el().innerHTML = "<p>No pude cargar el banco. Recargá la página.</p>";
  }
}

window.addEventListener("hashchange", render);
init();
