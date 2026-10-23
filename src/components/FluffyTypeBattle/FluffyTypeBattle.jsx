import { memo, useEffect, useRef, useState } from "react";
import "./FluffyTypeBattle.css";

/* ---------- Small helpers ---------- */
const rnd = (a) => a[(Math.random() * a.length) | 0];
const pick = (a, n) => Array.from({ length: n }, () => rnd(a));
const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const c01 = (v) => Math.max(0, Math.min(1, v));

/* ---------- Practice material ---------- */
const HOME =
    "sad dad lad fall flask salad glass shall ask all add dash flash hall hash gash half slag lass has had gals alfalfa jag".split(
      " ",
    ),
  TOP =
    "type power tower quiet write poetry pretty report upper trip wire pure you your tire ripe pipe equip require outpour".split(
      " ",
    ),
  BOT =
    "cabin number vex maxim zinc van combine brave convex bunny mix vibe zebra next cave name venom box mom zone nectar bonus".split(
      " ",
    ),
  COM =
    "the be to of and in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time just know take people into year good".split(
      " ",
    ),
  PUN = [
    "hello,",
    "world!",
    "it's",
    "(really?)",
    '"quoted"',
    "well-known",
    "a;b",
    "50%",
    "$20",
    "e-mail:",
    "#tag",
    "yes/no",
    "end.",
    "{ok}",
    "[1]",
    "a&b",
    "x=5;",
    "what?!",
    "'single'",
    "4*3",
    "5+5",
    "100%",
    "co-op",
    "rock-n-roll",
  ],
  SEN = [
    "The quick brown fox jumps over the lazy dog.",
    "Practice makes progress, so keep your eyes on the screen and your fingers on the home row.",
    "Good typing is about rhythm, not about rushing.",
    "Pack my box with five dozen liquor jugs.",
    "A steady pace with few mistakes beats a fast pace with many.",
    "How vexingly quick daft zebras jump!",
    "Every great developer once struggled to find the right keys.",
    "Accuracy first, speed second, and confidence will follow.",
    "Sphinx of black quartz, judge my vow.",
    "Take a deep breath, relax your shoulders, and type the next line.",
  ];
const EX = [
  {
    id: "home",
    label: "Home row",
    level: "Beginner",
    hint: "Keep your fingers on A S D F · J K L ;",
    make: () => pick(HOME, 20).join(" "),
  },
  {
    id: "top",
    label: "Top row",
    level: "Beginner",
    hint: "Reach up for Q W E R T Y U I O P without moving your wrists.",
    make: () => pick(TOP, 18).join(" "),
  },
  {
    id: "bottom",
    label: "Bottom row",
    level: "Beginner",
    hint: "Words heavy in Z X C V B N M keys.",
    make: () => pick(BOT, 18).join(" "),
  },
  {
    id: "numbers",
    label: "Numbers",
    level: "Intermediate",
    hint: "Number row: 0 to 9.",
    make: () => Array.from({ length: 14 }, () => String(Math.floor(Math.random() * 90000) + 10)).join(" "),
  },
  {
    id: "words",
    label: "Common words",
    level: "Intermediate",
    hint: "The most frequent English words, the base of real-world typing.",
    make: () => pick(COM, 26).join(" "),
  },
  {
    id: "punct",
    label: "Punctuation",
    level: "Advanced",
    hint: "Symbols and punctuation need the Shift key and pinky fingers.",
    make: () => pick(PUN, 14).join(" "),
  },
  {
    id: "sentences",
    label: "Sentences",
    level: "Advanced",
    hint: "Three full sentences with capitals and punctuation.",
    make: () => shuffle(SEN).slice(0, 3).join(" "),
  },
  {
    id: "paragraph",
    label: "Paragraph",
    level: "Expert",
    hint: "A longer passage to test stamina and consistency.",
    make: () => shuffle(SEN).slice(0, 6).join(" "),
  },
];

/* ---------- Keyboard map + history ---------- */
const ROWS = ["1234567890", "qwertyuiop", "asdfghjkl;", "zxcvbnm,./"],
  ROWEX = ["numbers", "top", "home", "bottom"],
  ROWN = { numbers: "number row", top: "top row", home: "home row", bottom: "bottom row", punct: "punctuation keys" },
  exForKey = (k) => {
    const r = ROWS.findIndex((x) => x.includes(k));
    return r < 0 ? "punct" : ROWEX[r];
  },
  keyName = (k) => (k === " " ? "Space" : k.toUpperCase()),
  levelOf = (w) =>
    w < 15 ? "Beginner" : w < 30 ? "Learner" : w < 45 ? "Average" : w < 60 ? "Good" : w < 80 ? "Fast" : "Expert";

const HK = "task-lab:typing-history";
const loadH = () => {
    try {
      return JSON.parse(localStorage.getItem(HK)) || [];
    } catch (e) {
      return [];
    }
  },
  saveH = (h) => {
    try {
      localStorage.setItem(HK, JSON.stringify(h));
    } catch (e) {}
  };

/* ---------- Analysis ---------- */
function analyse(en, typed, target, ex, previous) {
  const t0 = en[0].t,
    t1 = en[en.length - 1].t,
    secs = Math.max((t1 - t0) / 1000, 1),
    min = secs / 60,
    total = en.length,
    hits = en.filter((e) => e.ok).length,
    misses = total - hits;
  let unc = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] !== target[i]) unc++;
  const corrected = Math.max(0, misses - unc),
    gross = total / 5 / min,
    net = Math.max(0, (typed.length / 5 - unc) / min),
    accuracy = (hits / total) * 100;
  const keys = {},
    gaps = [];
  en.forEach((e, i) => {
    const k = e.ch.toLowerCase(),
      s = keys[k] || (keys[k] = { n: 0, miss: 0, lat: [] });
    s.n++;
    if (!e.ok) s.miss++;
    if (i > 0) {
      const g = Math.min(e.t - en[i - 1].t, 2000);
      s.lat.push(g);
      gaps.push(g);
    }
  });
  const avgAll = mean(gaps),
    list = Object.entries(keys).map(([k, s]) => ({
      k,
      ...s,
      rate: s.miss / s.n,
      avg: s.lat.length ? mean(s.lat) : null,
    }));
  const problem = list
    .filter((x) => x.miss > 0)
    .sort((a, b) => b.miss - a.miss || b.rate - a.rate)
    .slice(0, 5);
  const slow = list
    .filter((x) => x.k !== " " && x.lat.length >= 2 && x.avg > avgAll * 1.3)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);
  const nb = Math.floor((t1 - t0) / 1000) + 1,
    counts = Array(nb).fill(0);
  en.forEach((e) => {
    if (e.ok) counts[Math.floor((e.t - t0) / 1000)]++;
  });
  const raw = counts.map((c) => c * 12),
    timeline = raw.map((_, i) => mean(raw.slice(Math.max(0, i - 1), i + 2)));
  let cons = null;
  if (nb >= 4 && mean(raw) > 0) {
    const m = mean(raw),
      sd = Math.sqrt(mean(raw.map((v) => (v - m) ** 2)));
    cons = Math.max(0, Math.min(100, 100 - (sd / m) * 100));
  }
  const sg = [];
  if (accuracy < 90)
    sg.push({
      tone: "rose",
      title: "Slow down, accuracy comes first",
      text: `Your keystroke accuracy was ${accuracy.toFixed(1)}%. Drop your speed by about 15% until you reach 95%+, then build speed back up.`,
    });
  else if (accuracy < 96)
    sg.push({
      tone: "sun",
      title: "Almost clean",
      text: `Accuracy ${accuracy.toFixed(1)}%. Aim for 96%+ before chasing a higher WPM. Check the problem keys.`,
    });
  else if (net < 40)
    sg.push({
      tone: "mint",
      title: "Accuracy is solid, now add speed",
      text: `${accuracy.toFixed(1)}% accuracy gives you room to push. Type about 10% faster while the rhythm builds.`,
    });
  const byEx = {};
  problem.forEach((p) => {
    if (p.k !== " ") byEx[exForKey(p.k)] = (byEx[exForKey(p.k)] || 0) + p.miss;
  });
  const worst = Object.entries(byEx).sort((a, b) => b[1] - a[1])[0];
  if (worst) {
    const ks = problem
      .filter((p) => p.k !== " " && exForKey(p.k) === worst[0])
      .map((p) => keyName(p.k))
      .join(", ");
    sg.push({
      tone: "sun",
      title: `Most errors are on the ${ROWN[worst[0]]}`,
      text: `Keys ${ks} caused ${worst[1]} mistake${worst[1] > 1 ? "s" : ""}. A short drill there will fix it fastest.`,
      practise: worst[0],
    });
  }
  if (slow.length)
    sg.push({
      tone: "sun",
      title: "Slow keys",
      text: `${slow.map((s) => `${keyName(s.k)} (${Math.round(s.avg)} ms)`).join(", ")} take longer than your average of ${Math.round(avgAll)} ms. Hesitation usually means you are searching for the key.`,
    });
  if (cons !== null && cons < 70)
    sg.push({
      tone: "sun",
      title: "Uneven rhythm",
      text: `Your speed swings a lot (consistency ${Math.round(cons)}%). Type to an imaginary metronome.`,
    });
  if (corrected / total > 0.08)
    sg.push({
      tone: "sun",
      title: "Too many corrections",
      text: `You fixed ${corrected} mistake${corrected > 1 ? "s" : ""} with Backspace. Read one word ahead and type deliberately.`,
    });
  const next = EX[EX.findIndex((e) => e.id === ex.id) + 1];
  if (accuracy >= 95 && net >= 25 && next)
    sg.push({
      tone: "mint",
      title: `Ready for ${next.label}`,
      text: `Good control here. ${next.label} (${next.level}) is the next step up.`,
      practise: next.id,
    });
  if (!sg.length)
    sg.push({
      tone: "mint",
      title: "Great session",
      text: "No weak spots detected. Take a fresh text and try to beat this WPM.",
    });
  return {
    secs,
    gross,
    net,
    accuracy,
    total,
    misses,
    unc,
    corrected,
    keys,
    problem,
    slow,
    avgAll,
    timeline,
    cons,
    level: levelOf(net),
    sg,
    previous,
  };
}

/* ---------- Fighters ---------- */
const CH = [
  {
    id: "blade",
    name: "Ren",
    role: "Swordsman",
    desc: "Katana cuts with a long lunge. Balanced damage and speed.",
    w: [1.5, 3.4, 0.4],
    lg: 230,
    hits: [0.5],
    dmg: 1,
    spd: 1,
    kind: "melee",
    pop: "SLASH",
    fx: "#dfe9ff",
    look: {
      skin: "#e2b48f",
      hair: "short",
      hairCol: "#14141a",
      top: "#2c3345",
      pants: "#1c1e28",
      boots: "#0f1015",
      belt: "#0c0c10",
      collar: "#222838",
      scarf: "#9c2f3c",
      weapon: "katana",
      bladeCol: "#d6dde9",
      fx: "#dfe9ff",
    },
  },
  {
    id: "fist",
    name: "Haru",
    role: "Boxer",
    desc: "Fast two-hit combos. Quickest hands, shortest reach.",
    w: [2.2, -0.4, 1.57],
    lg: 330,
    hits: [0.4, 0.65],
    dmg: 1,
    spd: 1.35,
    kind: "melee",
    pop: "HIT",
    fx: "#ffb36b",
    look: {
      skin: "#c78f69",
      hair: "crop",
      hairCol: "#1a120e",
      top: "#b9bdc6",
      bare: true,
      pants: "#22252e",
      boots: "#14151a",
      belt: "#2a2c35",
      glove: "#b3262e",
      weapon: "gloves",
      w: 1.08,
      fx: "#ffb36b",
    },
  },
  {
    id: "archer",
    name: "Yuki",
    role: "Archer",
    desc: "Arrows from range. Heavy 1.5 damage, slower draw.",
    w: [1.5, 1.7, 1.45],
    lg: 0,
    hits: [0.5],
    dmg: 1.5,
    spd: 0.85,
    kind: "proj",
    proj: "arrow",
    pop: "SHOT",
    fx: "#ffd27a",
    look: {
      skin: "#e8bf9f",
      hair: "ponytail",
      hairCol: "#3b2316",
      top: "#4f5d3c",
      pants: "#2e2b26",
      boots: "#3b2a1c",
      belt: "#6b4a2a",
      collar: "#44512f",
      strap: "#6b4a2a",
      weapon: "bow",
      fx: "#ffd27a",
    },
  },
  {
    id: "knife",
    name: "Kage",
    role: "Knife Thrower",
    desc: "Throwing knife volleys. 25% chance to evade enemy hits.",
    w: [1.0, 3.3, 1.5],
    lg: 50,
    hits: [0.45],
    dmg: 1,
    spd: 1.2,
    dodge: 0.25,
    kind: "proj",
    proj: "knife",
    pop: "CUT",
    fx: "#c9b8ff",
    look: {
      skin: "#d9a67f",
      hood: "#252630",
      mask: "#15161c",
      top: "#252630",
      pants: "#1a1b22",
      boots: "#101014",
      belt: "#6b6f80",
      strap: "#8a8fa3",
      weapon: "knife",
      fx: "#c9b8ff",
    },
  },
];
const ENEMIES = [
  {
    skin: "#8d9c7c",
    hair: "messy",
    hairCol: "#2b2a22",
    top: "#4c5147",
    pants: "#2e302b",
    boots: "#1b1c18",
    belt: "#23241f",
    hunch: 8,
    weapon: "claws",
    sick: true,
    w: 0.95,
  },
  {
    skin: "#b98363",
    hair: "bald",
    top: "#3a404c",
    bare: true,
    pants: "#262a33",
    boots: "#15161b",
    belt: "#6b5a3a",
    weapon: "pipe",
    h: 1.1,
    w: 1.35,
  },
  {
    skin: "#d6a888",
    hair: "knot",
    hairCol: "#101015",
    top: "#5a2630",
    pants: "#1f2230",
    boots: "#111114",
    belt: "#c9b98a",
    collar: "#3b1820",
    weapon: "katana",
    bladeCol: "#aeb4c2",
    fx: "#ffd27a",
  },
  {
    skin: "#b99c82",
    hood: "#2d3834",
    mask: "#161a18",
    top: "#2d3834",
    pants: "#1d2220",
    boots: "#101211",
    belt: "#4a4f4c",
    weapon: "dagger",
    h: 0.95,
    w: 0.9,
  },
];

const NAMES = ["Infected", "Brute", "Duelist", "Stalker"];
// Each enemy type (cycles every 4 rounds) fights differently.
const TRAITS = [
  { text: "Regenerates if you slow down", regen: 0.3 },
  { text: "Hits hard, strikes slowly", dmg: 1.4, gap: 1.25 },
  { text: "Parries 1 in 4 attacks", parry: 0.25 },
  { text: "Fast and evasive, low HP", gap: 0.75, evade: 0.2, hp: 0.8 },
];
const DIFF = {
  easy: { label: "Chill", gap: 1.25, dmg: 0.75, hp: 0.85 },
  normal: { label: "Normal", gap: 1, dmg: 1, hp: 1 },
  hard: { label: "Brutal", gap: 0.8, dmg: 1.3, hp: 1.2 },
};
const COLS = ["#5b6b4f", "#6b4f4f", "#4f5b6b", "#6b604f", "#54506b"];

/* =====================================================================
   Battle engine: typing state, combat, canvas drawing.
   It lives in a closure (not React state) because it runs a 60fps loop.
   React only receives a small snapshot through onUi (about 8x per second).
   ===================================================================== */
function createBattle({ canvas, onUi, onReport }) {
  const SB = 1;
  let ctx = canvas.getContext("2d");
  const MAIN = ctx;
  let ex = EX[0],
    target = "",
    typed = "",
    phase = "idle",
    log = [],
    words = [],
    judged = 0;
  let t0 = 0,
    elapsed = 0,
    shake = 0,
    T = 0,
    hist = loadH(),
    G = {},
    PT = [],
    PP = [],
    PR = [];
  let hudT = 0,
    SEL = 0,
    raf = 0,
    dead = false,
    startId = 0,
    diff = "normal",
    wordOf = [];

  const spd = () => (1 + (G.lvl - 1) * 0.35) * CH[SEL].spd;

  function snapshot() {
    const tot = log.length;
    const hits = log.filter((x) => x.ok).length;
    const wrong = [...typed].filter((c, i) => c !== target[i]).length;
    const C = CH[SEL];
    return {
      startId,
      exId: ex.id,
      hint: ex.hint,
      sel: SEL,
      target,
      typed,
      phase,
      time: elapsed,
      wpm: Math.round(elapsed > 1 ? Math.max(0, (typed.length / 5 - wrong) / (elapsed / 60)) : 0),
      acc: tot ? Math.round((hits / tot) * 100) : 100,
      prog: target.length ? Math.round((typed.length / target.length) * 100) : 0,
      hn: C.name + " · " + C.role,
      charDesc: C.name + " · " + C.desc,
      hp: Math.max(0, G.hp),
      foe: Math.max(0, (G.foeHp / G.foeMax) * 100),
      ult: G.ult || 0,
      lvl: G.lvl,
      spdText: "Attack ×" + spd().toFixed(2) + " · foe strikes every " + interval().toFixed(1) + "s",
      fn: NAMES[(G.lvl - 1) % 4] + (G.lvl > 4 ? " " + "I".repeat(Math.ceil(G.lvl / 4)) : ""),
      trait: TR().text,
      chg: G.fsw >= 0 ? 1 : phase === "running" && alive() ? c01(1 - G.cd / interval()) : 0,
      diff,
      hist,
    };
  }
  const emit = () => {
    if (!dead) onUi(snapshot());
  };
  const hud = emit; // levelUp() below calls hud()

  /* ---------- difficulty + enemy tuning ---------- */
  const TR = () => TRAITS[(G.lvl - 1) % 4];
  // seconds between enemy attacks: shrinks every round
  const interval = () => Math.max(0.9, (2.8 - 0.2 * (G.lvl - 1)) * DIFF[diff].gap * (TR().gap || 1));
  const foeDmg = (m) => Math.max(1, Math.round((7 + (G.lvl - 1) * 1.5) * DIFF[diff].dmg * (TR().dmg || 1) * m));
  function spawnStats() {
    G.foeMax = Math.max(3, Math.round((5 + G.lvl + Math.floor(G.lvl / 2)) * DIFF[diff].hp * (TR().hp || 1)));
    G.foeHp = G.foeMax;
  }
  function battle() {
    G = {
      hp: 100,
      lvl: 1,
      kills: 0,
      q: 0,
      qm: [],
      fq: 0,
      sw: -1,
      hit: 0,
      fsw: -1,
      fhit: 0,
      fdmg: 8,
      hurt: 0,
      fhurt: 0,
      dying: 0,
      spawn: 1,
      cd: 2.5,
      combo: 0,
      maxCombo: 0,
      taken: 0,
      over: false,
      dead: 0,
      res: null,
      ult: 0,
      mult: 1,
      stop: 0,
    };
    spawnStats();
    PT = [];
    PP = [];
    PR = [];
  }

  function start(e) {
    ex = e;
    target = e.make();
    typed = "";
    phase = "idle";
    log = [];
    judged = 0;
    elapsed = 0;
    startId++;
    words = [...target.matchAll(/\S+/g)].map((m) => ({ s: m.index, e: m.index + m[0].length, slip: false }));
    wordOf = [];
    words.forEach((w, wi) => {
      for (let i = w.s; i <= w.e; i++) wordOf[i] = wi;
    });
    battle();
    onReport(null);
    emit();
  }

  const queue = (m) => {
    if (G.q < 4) {
      G.q++;
      G.qm.push(m);
    }
  }; // at most 4 strikes can be banked
  function judge() {
    while (judged < words.length) {
      const w = words[judged],
        last = judged === words.length - 1;
      if (typed.length < (last ? w.e : w.e + 1)) break;
      judged++;
      if (phase !== "running" || G.over) continue;
      const clean = typed.slice(w.s, w.e) === target.slice(w.s, w.e);
      if (clean && !w.slip) {
        // clean word: full strike, damage grows with the combo (up to x2)
        G.combo++;
        G.maxCombo = Math.max(G.maxCombo, G.combo);
        queue(1 + Math.min(G.combo - 1, 20) * 0.05);
        G.ult = Math.min(10, (G.ult || 0) + 1);
        if (G.ult >= 10) G.ultNow = 1;
        if (G.combo % 5 === 0) pop("COMBO ×" + G.combo, 450, 90, "#7fe9ff", 30);
      } else if (clean) {
        // a typo was made and fixed: the word lands, but weak, and the combo breaks
        G.combo = 0;
        queue(0.6);
        pop("SLOPPY", HEROX + 40, GY - 170, "#ffd23f", 24);
      } else {
        G.fq = Math.min(G.fq + 1, 2);
        G.combo = 0;
        G.ult = Math.max(0, (G.ult || 0) - 3);
        shake = 8;
      }
    }
  }

  function input(raw) {
    if (phase === "done") return;
    const v = raw.slice(0, target.length);
    const lock = judged ? words[judged - 1].e + 1 : 0;
    if (v.length < lock || v.slice(0, lock) !== typed.slice(0, lock)) {
      emit();
      return;
    } // finished words are locked
    const now = performance.now();
    if (phase === "idle" && v.length) {
      t0 = now;
      phase = "running";
    }
    for (let i = typed.length; i < v.length; i++) {
      const ok = v[i] === target[i];
      if (!ok && words[wordOf[i]]) words[wordOf[i]].slip = true; // even a corrected typo counts against the word
      log.push({ t: now, ch: target[i], ok });
    }
    typed = v;
    judge();
    emit();
    if (v.length === target.length) finish("done");
  }

  function finish(res) {
    if (phase === "done" || !log.length) return;
    const prev = hist.find((h) => h.ex === ex.id) || null;
    const r = analyse(log, typed, target, ex, prev);
    phase = "done";
    G.res = res;
    hist = [
      {
        d: new Date().toISOString(),
        ex: ex.id,
        net: +r.net.toFixed(1),
        acc: +r.accuracy.toFixed(1),
        gross: +r.gross.toFixed(1),
      },
      ...hist,
    ].slice(0, 20);
    saveH(hist);
    emit();
    onReport({
      r,
      res,
      exLabel: ex.label,
      lvl: G.lvl,
      kills: G.kills,
      maxCombo: G.maxCombo,
      taken: G.taken,
      diff: DIFF[diff].label,
    });
  }

  /* ---------- combat ---------- */
  const alive = () => G.foeHp > 0 && !G.dying && G.spawn >= 1,
    FOEX = 650,
    HEROX = 250,
    GY = 255;
  function pop(t, x, y, c, sz) {
    PP.push({ t, x, y, c, sz: sz || 30, l: 1 });
  }
  function burst(x, y, c, n) {
    for (let i = 0; i < n; i++)
      PT.push({ x, y, vx: (Math.random() - 0.5) * 360, vy: -Math.random() * 300 - 40, l: 0.6, c });
  }
  function hitFoe(d, force) {
    const C = CH[SEL],
      tr = TR();
    if (!force && tr.parry && Math.random() < tr.parry) {
      G.fhurt = 0.3;
      shake = 3;
      burst(FOEX - 60, GY - 90, "#ffffff", 8);
      pop("BLOCKED!", FOEX - 30, GY - 150, "#fff", 32);
      return;
    }
    if (!force && tr.evade && Math.random() < tr.evade) {
      pop("DODGED!", FOEX - 10, GY - 150, "#fff", 32);
      return;
    }
    G.foeHp -= d;
    G.fhurt = 1;
    G.stop = 0.06;
    shake = 6;
    burst(FOEX - 60, GY - 90, C.fx, 12);
    pop(C.pop, FOEX - 30, GY - 150, C.fx, 44);
    const big = (G.mult || 1) > 1.3 || force;
    pop("-" + Math.round(d * 10) / 10, FOEX + 30, GY - 118, big ? "#ffd23f" : "#fff", big ? 34 : 26);
    if (G.foeHp <= 0) {
      G.dying = 0.001;
      G.kills++;
      burst(FOEX, GY - 70, COLS[(G.lvl - 1) % 5], 26);
    }
  }
  function hitHero() {
    if (G.hp <= 0) return;
    if (Math.random() < (CH[SEL].dodge || 0)) {
      G.dg = 1;
      pop("MISS!", HEROX, GY - 150, "#fff", 28);
      return;
    }
    G.hp -= G.fdmg;
    G.taken += G.fdmg;
    G.stop = 0.07;
    G.hurt = 1;
    shake = 10;
    burst(HEROX + 30, GY - 90, "#ff4d6d", 14);
    pop("-" + G.fdmg, HEROX, GY - 150, "#ff6b81");
    if (G.hp <= 0) {
      G.hp = 0;
      G.over = true;
      finish("defeat");
    }
  }
  function levelUp() {
    G.lvl++;
    spawnStats();
    G.hp = Math.min(100, G.hp + 18);
    G.dying = 0;
    G.spawn = 0.001;
    G.cd = 2.5;
    G.fq = 0;
    G.q = Math.min(G.q, 2);
    G.qm.length = Math.min(G.qm.length, 2);
    pop("ROUND " + G.lvl, 450, 100, "#fff", 40);
    pop(TR().text, 450, 142, "#ffd23f", 24);
    hud();
  }
  function update(dt) {
    const g = G;
    if (phase === "running" && !g.over) {
      g.cd -= dt;
      if (alive() && TR().regen && g.foeHp < g.foeMax) g.foeHp = Math.min(g.foeMax, g.foeHp + TR().regen * dt);
      if (alive() && g.fsw < 0 && (g.fq > 0 || g.cd <= 0)) {
        if (g.fq > 0) {
          g.fq--;
          g.fdmg = foeDmg(1.5);
        } else {
          g.fdmg = foeDmg(1);
          g.cd = interval();
        }
        g.fsw = 0;
        g.fhit = 0;
      }
      if (alive() && g.sw < 0 && g.q > 0) {
        g.q--;
        g.mult = g.qm.shift() || 1;
        g.sw = 0;
        g.hit = 0;
      }
    }
    if (g.sw >= 0) {
      g.sw += (dt * spd()) / 0.55;
      const C = CH[SEL];
      while (g.hit < C.hits.length && g.sw >= C.hits[g.hit]) {
        g.hit++;
        strike(C);
      }
      if (g.sw >= 1) g.sw = -1;
    }
    if (g.fsw >= 0) {
      g.fsw += dt / 0.6;
      if (!g.fhit && g.fsw >= 0.5) {
        g.fhit = 1;
        hitHero();
      }
      if (g.fsw >= 1) g.fsw = -1;
    }
    g.hurt = Math.max(0, g.hurt - dt * 3);
    g.dg = Math.max(0, (g.dg || 0) - dt * 2.5);
    if (g.ultNow && alive() && phase === "running" && !g.over) {
      g.ultNow = 0;
      g.ult = 0;
      g.ultT = 0.3;
      g.ultV = 1;
      shake = 22;
      pop("FINISHER!", 450, 100, CH[SEL].fx, 40);
    }
    if (g.ultT > 0) {
      g.ultT -= dt;
      if (g.ultT <= 0 && alive()) hitFoe(4, true);
    }
    g.ultV = Math.max(0, (g.ultV || 0) - dt * 1.6);
    g.fhurt = Math.max(0, g.fhurt - dt * 4);
    if (g.dying > 0) {
      g.dying += dt / 0.9;
      if (g.dying >= 1) levelUp();
    }
    if (g.spawn < 1) g.spawn = Math.min(1, g.spawn + dt / 0.7);
    if (g.over) g.dead += dt;
    shake = Math.max(0, shake - dt * 30);
    PT.forEach((p) => {
      p.l -= dt;
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
    PT = PT.filter((p) => p.l > 0);
    PR.forEach((q) => {
      q.t += dt;
      if (q.t >= q.d) {
        q.t = 9;
        if (alive()) hitFoe(q.dmg);
      }
    });
    PR = PR.filter((q) => q.t < 9);
    if (g.sw > 0.1 && g.sw < 0.5 && Math.random() < 0.5)
      PT.push({
        x: HEROX + Math.sin(c01(g.sw) * Math.PI) * CH[SEL].lg - 20,
        y: GY - 2,
        vx: -70 - Math.random() * 70,
        vy: -40 - Math.random() * 50,
        l: 0.5,
        c: "#d9c3a5",
      });
    PP.forEach((p) => {
      p.l -= dt * 1.1;
      p.y -= dt * 50;
    });
    PP = PP.filter((p) => p.l > 0);
  }
  const swing = (p, r, w, e) =>
    p < 0.25
      ? lerp(r, w, ease(p / 0.25))
      : p < 0.55
        ? lerp(w, e, ease((p - 0.25) / 0.3))
        : lerp(e, r, ease((p - 0.55) / 0.45));

  /* ---------- drawing ---------- */
  /* ---------- art helpers ---------- */
  const hexRgb = (h) => {
    h = h.replace("#", "");
    if (h.length === 3) h = h.replace(/./g, "$&$&");
    return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16));
  };
  const mix = (a, b, t) => {
    const A = hexRgb(a),
      B = hexRgb(b);
    return (
      "#" +
      A.map((v, i) =>
        Math.round(v + (B[i] - v) * t)
          .toString(16)
          .padStart(2, "0"),
      ).join("")
    );
  };
  const shade = (c, a) => mix(c, a > 0 ? "#ffffff" : "#000000", Math.abs(a));
  const OUT = "rgba(8,8,16,.88)";
  function seg(a, b, c, d) {
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
    ctx.stroke();
  }
  function limb(a, b, c, d, w, col) {
    ctx.lineCap = "round";
    ctx.strokeStyle = OUT;
    ctx.lineWidth = w + 3;
    seg(a, b, c, d);
    ctx.strokeStyle = shade(col, -0.3);
    ctx.lineWidth = w;
    seg(a, b, c, d);
    ctx.strokeStyle = col;
    ctx.lineWidth = w * 0.66;
    seg(a - w * 0.1, b - w * 0.12, c - w * 0.1, d - w * 0.12);
    ctx.strokeStyle = shade(col, 0.22);
    ctx.lineWidth = Math.max(1, w * 0.16);
    seg(a - w * 0.22, b - w * 0.26, c - w * 0.22, d - w * 0.26);
  }
  function shape(pts, fill) {
    let y0 = 1e9,
      y1 = -1e9;
    pts.forEach((p) => {
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    });
    const g = ctx.createLinearGradient(0, y0, 0, y1 + 1);
    g.addColorStop(0, shade(fill, 0.18));
    g.addColorStop(1, shade(fill, -0.3));
    ctx.fillStyle = g;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    pts.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](p[0], p[1]));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  function ball(x, y, r, fill) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
    g.addColorStop(0, shade(fill, 0.25));
    g.addColorStop(1, shade(fill, -0.35));
    ctx.fillStyle = g;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 7);
    ctx.fill();
    ctx.stroke();
  }
  // two-bone IK: returns [jointX, jointY, endX, endY]
  function ik(sx, sy, hx, hy, l1, l2, bend) {
    let dx = hx - sx,
      dy = hy - sy,
      d = Math.hypot(dx, dy) || 1;
    const max = l1 + l2 - 0.5;
    if (d > max) {
      hx = sx + (dx / d) * max;
      hy = sy + (dy / d) * max;
      dx = hx - sx;
      dy = hy - sy;
      d = max;
    }
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d),
      h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    return [sx + (dx * a) / d + (-dy / d) * h * bend, sy + (dy * a) / d + (dx / d) * h * bend, hx, hy];
  }

  /* ---------- one humanoid renderer for fighters and enemies (faces right) ---------- */
  function figure(x, gy, S, o) {
    const hurt = o.hurt > 0,
      K = (c) => (hurt ? mix(c, "#ff4a4a", 0.42) : c);
    const s = S.h || 1,
      bw = S.w || 1,
      lg = o.lg || 0,
      sw = o.p >= 0;
    const bob = sw ? 0 : Math.sin(T * 3) * 1.4,
      crouch = lg * 12 * s;
    const lean = (S.hunch || 0) + lg * 9;
    const hipX = x,
      hipY = gy - 68 * s + bob + crouch;
    const shX = x + lean,
      shY = gy - 110 * s + bob * 0.6 + crouch * 0.7;
    const hdX = shX + 3 + lean * 0.15,
      hdY = gy - 128 * s + bob * 0.6 + crouch * 0.7;
    const fx = x + (15 + 32 * lg) * s,
      bx = x - (17 + 10 * lg) * s;
    const skin = K(S.skin),
      pants = K(S.pants),
      top = K(S.top),
      boots = K(S.boots);
    const sleeve = S.bare ? skin : top,
      sleeveB = S.bare ? shade(skin, -0.15) : shade(top, -0.2);
    const sx = shX + 1,
      sy = shY + 3;
    const hand = (ang, reach) => {
      const AL = 52 * s * reach;
      return [sx + Math.sin(ang) * AL, sy + Math.cos(ang) * AL];
    };
    const bow = S.weapon === "bow";
    const pull = !bow ? 0 : sw ? (o.p < 0.5 ? ease(o.p / 0.5) : Math.max(0, 1 - (o.p - 0.5) * 8)) : 0.15;
    const fh = hand(o.a, o.reach == null ? 1 : o.reach);
    const nock = [fh[0] - 4 - pull * 26 * s, fh[1]];
    const bh = bow ? nock : hand(o.a2 == null ? 0.3 : o.a2, o.reach2 == null ? 1 : o.reach2);
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const boot = (px) =>
      shape(
        [
          [-5, -9],
          [7, -8],
          [15, -3],
          [15, 0],
          [-6, 0],
        ].map((p) => [px + p[0] * s, gy + p[1] * s]),
        boots,
      );
    const leg = (px, col) => {
      const k = ik(hipX, hipY, px, gy - 5 * s, 36 * s, 36 * s, -1);
      limb(hipX, hipY, k[0], k[1], 13 * s * bw, col);
      limb(k[0], k[1], k[2], k[3], 10.5 * s * bw, shade(col, -0.12));
      boot(px);
    };
    const arm = (h, sl, fore) => {
      const e = ik(sx, sy, h[0], h[1], 27 * s, 27 * s, 1);
      limb(sx, sy, e[0], e[1], 9.5 * s * bw, sl);
      limb(e[0], e[1], e[2], e[3], 8.5 * s * bw, fore);
      return e;
    };

    leg(bx, shade(pants, -0.2));
    // far arm
    const eb = arm(bh, sleeveB, S.bare ? sleeveB : sleeveB);
    if (S.glove) {
      limb(eb[0] + (eb[2] - eb[0]) * 0.55, eb[1] + (eb[3] - eb[1]) * 0.55, eb[2], eb[3], 9 * s, "#cfcbc0");
      ball(eb[2], eb[3], 7 * s, shade(K(S.glove), -0.1));
    } else ball(eb[2], eb[3], 4.4 * s, shade(skin, -0.12));
    // scarf behind the body
    if (S.scarf) {
      const wv = Math.sin(T * 5) * 4;
      limb(shX - 5, shY - 2, shX - 24, shY + 6 + wv, 6, S.scarf);
      limb(shX - 24, shY + 6 + wv, shX - 42, shY + 1 + wv * 1.4, 5, shade(S.scarf, -0.1));
    }
    // torso
    shape(
      [
        [shX - 9 * bw, shY],
        [shX + 9 * bw, shY],
        [shX + 11 * bw, shY + 15 * s],
        [hipX + 8 * bw, hipY],
        [hipX - 8 * bw, hipY],
        [shX - 10 * bw, shY + 14 * s],
      ],
      top,
    );
    if (S.strap) limb(shX - 7 * bw, shY + 2, hipX + 8 * bw, hipY - 3, 3.2, S.strap);
    if (S.belt) limb(hipX - 8 * bw, hipY - 2, hipX + 8 * bw, hipY - 2, 4, S.belt);
    leg(fx, pants);
    // neck + head
    limb(shX + 1, shY - 1, hdX - 1, hdY + 8 * s, 7 * s, skin);
    if (S.collar)
      shape(
        [
          [shX - 5, shY - 3],
          [shX + 7, shY - 3],
          [shX + 8, shY + 3],
          [shX - 4, shY + 4],
        ],
        K(S.collar),
      );
    ball(hdX, hdY, 10.5 * s, skin);
    const P = (pts) => pts.map((p) => [hdX + p[0] * s, hdY + p[1] * s]);
    // face: small, serious eye, angled brow, no mouth smile
    const ex = hdX + 5.2 * s,
      ey = hdY - 1 * s;
    if (S.sick) {
      ctx.fillStyle = "rgba(40,50,40,.45)";
      ctx.beginPath();
      ctx.ellipse(ex, ey + 2.6 * s, 3 * s, 1.6 * s, 0, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = S.sick ? "#dfe6c8" : "#f2ece6";
    ctx.beginPath();
    ctx.ellipse(ex, ey, 2.3 * s, 1.7 * s, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#14121a";
    ctx.beginPath();
    ctx.arc(ex + 0.7 * s, ey, 1.1 * s, 0, 7);
    ctx.fill();
    ctx.strokeStyle = "#1a1410";
    ctx.lineWidth = 1.7;
    seg(hdX + 2 * s, hdY - 4.8 * s, hdX + 8 * s, hdY - 3.2 * s);
    shape(
      P([
        [9.5, -0.5],
        [13.5, 3.5],
        [9.5, 4.5],
      ]),
      shade(skin, -0.08),
    );
    ctx.strokeStyle = "#4a2a26";
    ctx.lineWidth = 1.3;
    seg(hdX + 5 * s, hdY + 7 * s, hdX + 9 * s, hdY + 6.6 * s);
    ball(hdX - 2 * s, hdY + 1 * s, 2.7 * s, shade(skin, -0.05));
    const HAIR = {
      short: [
        [-11, 3],
        [-11, -6],
        [-5, -12.5],
        [4, -12.5],
        [10.5, -7],
        [6.5, -5.5],
        [2, -7.5],
        [-4, -5.5],
        [-8, 2],
      ],
      crop: [
        [-11, 1],
        [-10.5, -7],
        [-4, -12],
        [4, -12],
        [10, -7],
        [5, -6.5],
        [-3, -6.5],
        [-8, 0],
      ],
      messy: [
        [-11, 4],
        [-12, -5],
        [-8, -11],
        [-4, -15],
        [0, -11],
        [4, -15],
        [8, -10],
        [11, -6],
        [5, -6],
        [0, -7],
        [-6, -5],
        [-8, 3],
      ],
    };
    const hc = K(S.hairCol || "#111");
    if (S.hood)
      shape(
        P([
          [-12, 7],
          [-13, -5],
          [-6, -14],
          [4, -14.5],
          [11.5, -8],
          [12, -1],
          [8, -4],
          [3, -8],
          [-3, -8],
          [-8, -1],
        ]),
        K(S.hood),
      );
    else if (S.hair === "ponytail") {
      shape(
        P([
          [-10, -5],
          [-17, -3],
          [-23 + Math.sin(T * 3) * 2, 8],
          [-16, 5],
          [-10, 1],
        ]),
        hc,
      );
      shape(P(HAIR.short), hc);
    } else if (S.hair === "knot") {
      ball(hdX - 1 * s, hdY - 15 * s, 4 * s, hc);
      shape(P(HAIR.crop), hc);
    } else if (HAIR[S.hair]) shape(P(HAIR[S.hair]), hc);
    if (S.mask)
      shape(
        P([
          [-1, 2.5],
          [11, 1.5],
          [10, 8.5],
          [1, 10.5],
        ]),
        K(S.mask),
      );
    // near arm + weapon
    const e = arm(fh, sleeve, S.bare ? skin : shade(sleeve, 0.05));
    const hx = e[2],
      hy = e[3],
      dx = Math.sin(o.a),
      dy = Math.cos(o.a),
      t = (n) => [hx + dx * n * s, hy + dy * n * s];
    const wp = S.weapon;
    if (wp === "katana") {
      (o.trail || []).forEach((a, i) => {
        const px = sx + Math.sin(a) * 52 * s,
          py = sy + Math.cos(a) * 52 * s;
        ctx.globalAlpha = 0.35 / (i + 1);
        ctx.strokeStyle = S.fx || "#dfe9ff";
        ctx.lineWidth = 7;
        seg(px, py, px + Math.sin(a) * 76 * s, py + Math.cos(a) * 76 * s);
      });
      ctx.globalAlpha = 1;
      const g = t(8),
        tp = t(82);
      limb(hx - dx * 9 * s, hy - dy * 9 * s, g[0], g[1], 5, "#1a1a20");
      limb(g[0] - dy * 6, g[1] + dx * 6, g[0] + dy * 6, g[1] - dx * 6, 3.2, "#c9a24b");
      ctx.lineCap = "butt";
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 6;
      seg(g[0], g[1], tp[0], tp[1]);
      if (sw) {
        ctx.shadowColor = S.fx || "#fff";
        ctx.shadowBlur = 14;
      }
      ctx.strokeStyle = S.bladeCol || "#d6dde9";
      ctx.lineWidth = 3.6;
      seg(g[0], g[1], tp[0], tp[1]);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,.85)";
      ctx.lineWidth = 1;
      seg(g[0] - dy, g[1] + dx, tp[0] - dy, tp[1] + dx);
      ball(hx, hy, 4.6 * s, skin);
    } else if (wp === "gloves") {
      limb(e[0] + (hx - e[0]) * 0.55, e[1] + (hy - e[1]) * 0.55, hx, hy, 9.2 * s, "#e6e2d8");
      ball(hx, hy, 7.6 * s, K(S.glove));
      if (sw && o.p > 0.25 && o.p < 0.8) {
        ctx.strokeStyle = "rgba(255,255,255,.55)";
        ctx.lineWidth = 2;
        for (let k = -1; k <= 1; k++)
          seg(
            hx + dx * 14 * s - dy * k * 8,
            hy + dy * 14 * s + dx * k * 8,
            hx + dx * 42 * s - dy * k * 8,
            hy + dy * 42 * s + dx * k * 8,
          );
      }
    } else if (bow) {
      const top2 = [fh[0] + 3 * s, fh[1] - 40 * s],
        bot = [fh[0] + 3 * s, fh[1] + 40 * s];
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(top2[0], top2[1]);
      ctx.quadraticCurveTo(fh[0] + 24 * s - pull * 8, fh[1], bot[0], bot[1]);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 6.5;
      ctx.stroke();
      ctx.strokeStyle = "#7a5430";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = "#e8e4d8";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(top2[0], top2[1]);
      ctx.lineTo(nock[0], nock[1]);
      ctx.lineTo(bot[0], bot[1]);
      ctx.stroke();
      if (!sw || o.p < 0.52) {
        const tipx = fh[0] + 30 * s;
        ctx.strokeStyle = "#d8c9a0";
        ctx.lineWidth = 2.2;
        seg(nock[0], nock[1], tipx, nock[1]);
        shape(
          [
            [tipx, nock[1] - 3],
            [tipx + 9, nock[1]],
            [tipx, nock[1] + 3],
          ],
          "#cfd6e2",
        );
        ctx.strokeStyle = "#b3262e";
        ctx.lineWidth = 2;
        seg(nock[0] + 2, nock[1], nock[0] + 9, nock[1] - 3);
        seg(nock[0] + 2, nock[1], nock[0] + 9, nock[1] + 3);
      }
      ball(hx, hy, 4.6 * s, skin);
    } else if (wp === "knife" || wp === "dagger") {
      if (!sw || o.p < 0.46 || o.p > 0.8 || wp === "dagger") {
        const len = wp === "knife" ? 34 : 30,
          g = t(7),
          tp = t(len);
        limb(hx - dx * 3 * s, hy - dy * 3 * s, g[0], g[1], 4.5, "#1a1a22");
        ctx.lineCap = "butt";
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 5;
        seg(g[0], g[1], tp[0], tp[1]);
        ctx.strokeStyle = wp === "knife" ? "#e3e8f0" : "#c9ced8";
        ctx.lineWidth = 3;
        seg(g[0], g[1], tp[0], tp[1]);
      }
      ball(hx, hy, 4.5 * s, skin);
    } else if (wp === "pipe") {
      const tp = t(64);
      limb(hx - dx * 8 * s, hy - dy * 8 * s, tp[0], tp[1], 7.5, "#6e747d");
      limb(hx - dx * 6 * s, hy - dy * 6 * s, hx + dx * 8 * s, hy + dy * 8 * s, 8.5, "#2a2a30");
      ball(hx, hy, 5.6 * s, skin);
    } else if (wp === "claws") {
      ball(hx, hy, 5 * s, skin);
      ctx.strokeStyle = "#cfd3c0";
      ctx.lineWidth = 1.6;
      for (let k = -1; k <= 1; k++)
        seg(hx + dx * 3, hy + dy * 3, hx + dx * 14 * s - dy * k * 5, hy + dy * 14 * s + dx * k * 5);
    }
    ctx.restore();
  }
  const hero = (x, gy, c, o) => figure(x, gy, c.look, o);
  function enemy(x, gy, k, sc, col, ang, hurt, lg) {
    const sp = ENEMIES[k],
      S = { ...sp, h: (sp.h || 1) * sc, top: mix(sp.top, col, 0.22) };
    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    figure(0, gy, S, { a: ang, a2: ang + 0.3, reach: 1, reach2: 1, lg, hurt, p: lg > 0 ? 0.5 : -1 });
    ctx.restore();
  }
  function strike(C) {
    const d = (C.dmg * (G.mult || 1)) / C.hits.length;
    if (C.kind === "proj") PR.push({ t: 0, d: 0.3, dmg: d, type: C.proj, x: HEROX + 66, y: GY - 104 });
    else if (alive()) hitFoe(d);
  }
  function impact(x, y, v, col) {
    if (v <= 0.3) return;
    ctx.save();
    const r = 46 * v + 14,
      gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "rgba(255,255,255," + 0.95 * v + ")");
    gr.addColorStop(0.4, col);
    gr.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalAlpha = Math.min(1, v);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,244,214," + v + ")";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.283 + x,
        r1 = 10 + 16 * (1 - v),
        r2 = r1 + 22 * v;
      seg(x + Math.cos(a) * r1, y + Math.sin(a) * r1, x + Math.cos(a) * r2, y + Math.sin(a) * r2);
    }
    ctx.restore();
  }

  /* ---------- night street scene ---------- */
  const FAR = [],
    NEAR = [];
  (function () {
    let x = -20;
    while (x < 920) {
      const w = 30 + Math.random() * 34,
        h = 80 + Math.random() * 90,
        wins = [];
      for (let wy = GY - h + 8; wy < GY - 14; wy += 11)
        for (let wx = x + 5; wx < x + w - 6; wx += 9) if (Math.random() < 0.28) wins.push([wx, wy]);
      FAR.push({ x, w, h, wins });
      x += w + Math.random() * 6;
    }
    x = -30;
    while (x < 930) {
      const w = 56 + Math.random() * 50,
        h = 40 + Math.random() * 70,
        wins = [];
      for (let wy = GY - h + 10; wy < GY - 16; wy += 14)
        for (let wx = x + 7; wx < x + w - 8; wx += 13) if (Math.random() < 0.16) wins.push([wx, wy]);
      NEAR.push({ x, w, h, wins });
      x += w + Math.random() * 10;
    }
  })();
  const RAIN = Array.from({ length: 120 }, () => [Math.random() * 900, Math.random() * 320, Math.random() * 0.6 + 0.7]);
  function scene() {
    const sky = ctx.createLinearGradient(0, 0, 0, GY);
    sky.addColorStop(0, "#0a0f1d");
    sky.addColorStop(0.55, "#222942");
    sky.addColorStop(1, "#6a5460");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 900, 300);
    const mg = ctx.createRadialGradient(760, 62, 4, 760, 62, 70);
    mg.addColorStop(0, "rgba(230,236,255,.55)");
    mg.addColorStop(1, "rgba(230,236,255,0)");
    ctx.fillStyle = mg;
    ctx.fillRect(690, 0, 140, 140);
    ctx.fillStyle = "rgba(225,232,250,.85)";
    ctx.beginPath();
    ctx.arc(760, 62, 17, 0, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(18,22,40,.55)";
    for (let i = 0; i < 3; i++) {
      const cx = ((i * 330 + T * 7) % 1200) - 150;
      ctx.beginPath();
      ctx.ellipse(cx, 52 + i * 26, 120, 9, 0, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = "#171c32";
    FAR.forEach((b) => ctx.fillRect(b.x, GY - b.h, b.w, b.h));
    ctx.fillStyle = "rgba(240,205,130,.5)";
    FAR.forEach((b) => b.wins.forEach((w) => ctx.fillRect(w[0], w[1], 3, 4)));
    ctx.fillStyle = "#0e111d";
    NEAR.forEach((b) => ctx.fillRect(b.x, GY - b.h, b.w, b.h));
    ctx.fillStyle = "rgba(240,190,110,.65)";
    NEAR.forEach((b) => b.wins.forEach((w) => ctx.fillRect(w[0], w[1], 5, 6)));
    const hz = ctx.createLinearGradient(0, GY - 90, 0, GY);
    hz.addColorStop(0, "rgba(150,115,125,0)");
    hz.addColorStop(1, "rgba(165,120,125,.32)");
    ctx.fillStyle = hz;
    ctx.fillRect(0, GY - 90, 900, 90);
    const fl = ctx.createLinearGradient(0, GY, 0, 300);
    fl.addColorStop(0, "#2b2d38");
    fl.addColorStop(1, "#101117");
    ctx.fillStyle = fl;
    ctx.fillRect(0, GY, 900, 50);
    ctx.fillStyle = "#4a4d5c";
    ctx.fillRect(0, GY, 900, 3);
    ctx.fillStyle = "rgba(210,200,160,.3)";
    for (let i = 0; i < 10; i++) ctx.fillRect(i * 96 + 14, GY + 28, 46, 3);
    [
      [190, 276, 90],
      [520, 283, 120],
      [790, 274, 80],
    ].forEach((p) => {
      const pg = ctx.createLinearGradient(0, p[1] - 6, 0, p[1] + 6);
      pg.addColorStop(0, "rgba(150,165,200,.30)");
      pg.addColorStop(1, "rgba(60,70,100,.18)");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], p[2], 6, 0, 0, 7);
      ctx.fill();
    });
    [
      [110, 1],
      [800, -1],
    ].forEach((l) => {
      const lx = l[0],
        dir = l[1];
      ctx.fillStyle = "#0b0c13";
      ctx.fillRect(lx - 3, GY - 176, 6, 176);
      ctx.fillRect(lx - 3, GY - 176, 28 * dir, 5);
      ctx.fillRect(lx + 22 * dir - 6, GY - 172, 12, 5);
      const fk = 0.27 + 0.03 * Math.sin(T * 9 + lx);
      ctx.globalCompositeOperation = "lighter";
      const lgd = ctx.createRadialGradient(lx + 26 * dir, GY - 168, 4, lx + 26 * dir, GY - 140, 150);
      lgd.addColorStop(0, "rgba(255,205,125," + fk + ")");
      lgd.addColorStop(1, "rgba(255,205,125,0)");
      ctx.fillStyle = lgd;
      ctx.fillRect(lx - 130, 0, 290, 300);
      const gg = ctx.createRadialGradient(lx + 26 * dir, GY + 6, 4, lx + 26 * dir, GY + 6, 90);
      gg.addColorStop(0, "rgba(255,205,125,.22)");
      gg.addColorStop(1, "rgba(255,205,125,0)");
      ctx.fillStyle = gg;
      ctx.fillRect(lx - 80, GY - 20, 200, 70);
      ctx.globalCompositeOperation = "source-over";
    });
  }

  /* ---------- frame ---------- */
  function draw() {
    const g = G;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    ctx.clearRect(0, 0, 900, 300);
    scene();
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    const C = CH[SEL],
      sp = g.sw >= 0,
      p = sp ? g.sw : -1,
      pp = c01(p),
      W = C.w,
      fist = C.id === "fist";
    const hx = HEROX + (sp ? Math.sin(pp * Math.PI) * C.lg : 0) - g.hurt * 30 - (g.dg || 0) * 70;
    const pose = (q, hurt) => ({
      a: swing(q, W[0], W[1], W[2]),
      a2: swing((q + 0.4) % 1, W[0], W[1], W[2]),
      reach: fist ? swing(q, 0.55, 0.55, 1) : 1,
      reach2: fist ? swing((q + 0.4) % 1, 0.55, 0.55, 1) : 1,
      lg: Math.sin(c01(q) * Math.PI),
      hurt,
      p: q,
      trail: [],
    });
    const o = sp
      ? pose(p, g.hurt)
      : {
          a: W[0] + Math.sin(T * 3) * 0.05,
          a2: fist ? W[0] + Math.sin(T * 3 + 1) * 0.05 : 0.3,
          reach: fist ? 0.55 : 1,
          reach2: fist ? 0.55 : 1,
          lg: 0,
          hurt: g.hurt,
          p: -1,
          trail: [],
        };
    if (C.id === "blade" && sp && p > 0.25 && p < 0.7)
      o.trail = [swing(p - 0.05, W[0], W[1], W[2]), swing(p - 0.1, W[0], W[1], W[2])];
    // ground shadows
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.beginPath();
    ctx.ellipse(hx + 4, GY + 4, g.over ? 60 : 44, 7, 0, 0, 7);
    ctx.fill();
    const fs = g.fsw >= 0,
      fp = fs ? g.fsw : 0,
      sc = 1 + Math.min(0.03 * g.lvl, 0.15);
    const fx = FOEX + (1 - ease(g.spawn)) * 260 - (fs ? Math.sin(c01(fp) * Math.PI) * 240 : 0) + g.fhurt * 25;
    ctx.beginPath();
    ctx.ellipse(fx, GY + 4, 52 * sc, 8, 0, 0, 7);
    ctx.fill();
    // fighter (with motion afterimages for melee lunges)
    ctx.save();
    if (g.over) {
      ctx.translate(hx, GY);
      ctx.rotate(Math.min(g.dead * 2, 1.45));
      ctx.translate(-hx, -GY);
    }
    ctx.globalAlpha = 1 - (g.dg || 0) * 0.6;
    if (sp && C.kind === "melee" && pp > 0.15) {
      ctx.globalAlpha = 0.16;
      for (let i = 3; i >= 1; i--) {
        const q = Math.max(0, p - i * 0.07);
        hero(HEROX + Math.sin(c01(q) * Math.PI) * C.lg, GY, C, pose(q, 0));
      }
      ctx.globalAlpha = 1 - (g.dg || 0) * 0.6;
    }
    hero(hx, GY, C, o);
    ctx.restore();
    // enemy
    ctx.save();
    ctx.globalAlpha = c01(1 - g.dying);
    if (g.dying > 0) {
      ctx.translate(fx, GY);
      ctx.rotate(g.dying * 0.9);
      ctx.translate(-fx, -GY);
    }
    enemy(
      fx,
      GY + g.dying * 10,
      (g.lvl - 1) % 4,
      sc,
      COLS[(g.lvl - 1) % 5],
      fs ? swing(fp, 1.3, 3.3, 0.45) : 1.3 + Math.sin(T * 2.6) * 0.05,
      g.fhurt,
      fs ? Math.sin(c01(fp) * Math.PI) : 0,
    );
    ctx.restore();
    impact(fx - 40, GY - 90, g.fhurt, "rgba(255,200,90,.9)");
    impact(hx + 40, GY - 90, g.hurt, "rgba(255,80,80,.9)");
    // projectiles
    PR.forEach((q) => {
      const u = ease(c01(q.t / q.d)),
        px = lerp(q.x, FOEX - 50, u),
        py = lerp(q.y, GY - 92, u),
        ang = Math.atan2(GY - 92 - q.y, FOEX - 50 - q.x);
      ctx.save();
      ctx.translate(px, py);
      if (q.type === "arrow") {
        ctx.rotate(ang);
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        seg(-90, 0, -50, 0);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#d8c9a0";
        ctx.lineWidth = 2.4;
        seg(-46, 0, 0, 0);
        shape(
          [
            [0, -3.5],
            [10, 0],
            [0, 3.5],
          ],
          "#cfd6e2",
        );
        ctx.strokeStyle = "#b3262e";
        ctx.lineWidth = 2;
        seg(-46, 0, -40, -3.5);
        seg(-46, 0, -40, 3.5);
      } else {
        ctx.rotate(T * 30);
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 6;
        ctx.lineCap = "butt";
        seg(-4, 0, 22, 0);
        ctx.strokeStyle = "#e3e8f0";
        ctx.lineWidth = 3.2;
        seg(0, 0, 22, 0);
        ctx.strokeStyle = "#1a1a22";
        ctx.lineWidth = 4.5;
        seg(-10, 0, 0, 0);
      }
      ctx.restore();
    });
    // sparks and dust
    PT.forEach((q) => {
      ctx.globalAlpha = c01(q.l * 1.6);
      ctx.strokeStyle = q.c;
      ctx.lineWidth = 2;
      seg(q.x, q.y, q.x - q.vx * 0.025, q.y - q.vy * 0.025);
    });
    ctx.globalAlpha = 1;
    // finisher beam
    if (g.ultV > 0) {
      ctx.save();
      ctx.globalAlpha = g.ultV * 0.55;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 900, 300);
      ctx.globalAlpha = g.ultV;
      ctx.strokeStyle = C.fx;
      ctx.lineWidth = 16 * g.ultV;
      seg(0, 40, 900, 260);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 6 * g.ultV;
      seg(0, 40, 900, 260);
      ctx.restore();
    }
    // rain over everything
    ctx.strokeStyle = "rgba(190,205,230,.22)";
    ctx.lineWidth = 1;
    RAIN.forEach((r) => {
      const ry = ((r[1] + T * 520 * r[2]) % 330) - 15,
        rx = (r[0] - T * 60 * r[2] + 1800) % 900;
      seg(rx, ry, rx - 5 * r[2], ry + 16 * r[2]);
    });
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const vg = ctx.createRadialGradient(450, 150, 150, 450, 150, 560);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, 900, 300);
    // popups
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    const FNT = '"Arial Black", Impact, system-ui, sans-serif';
    PP.forEach((q) => {
      ctx.globalAlpha = c01(q.l * 1.4);
      ctx.font = "900 " + q.sz + "px " + FNT;
      ctx.lineWidth = 7;
      ctx.strokeStyle = "#0b0b12";
      ctx.strokeText(q.t, q.x, q.y);
      ctx.fillStyle = q.c;
      ctx.fillText(q.t, q.x, q.y);
    });
    ctx.globalAlpha = 1;
    const word = (t, y, col, sz) => {
      ctx.font = "900 " + sz + "px " + FNT;
      ctx.lineWidth = 14;
      ctx.strokeStyle = "#0b0b12";
      ctx.strokeText(t, 450, y);
      ctx.fillStyle = col;
      ctx.fillText(t, 450, y);
    };
    if (phase === "idle") word("READY?", 70, "#f2f2f6", 46);
    else if (phase === "running" && elapsed < 0.9) {
      ctx.globalAlpha = c01(1 - elapsed / 0.9);
      word("FIGHT!", 70, "#ffd23f", 52);
      ctx.globalAlpha = 1;
    }
    if (g.combo >= 2 && phase === "running") {
      ctx.textAlign = "left";
      ctx.font = "900 34px " + FNT;
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#0b0b12";
      ctx.strokeText("×" + g.combo + " COMBO", 22, 56);
      ctx.fillStyle = "#ffd23f";
      ctx.fillText("×" + g.combo + " COMBO", 22, 56);
      ctx.textAlign = "center";
    }
    if (g.over) word("K.O.", 120, "#ff5a4a", 80);
    if (phase === "done" && !g.over) word(g.res === "done" ? "FINISHED" : "STOPPED", 90, "#f2f2f6", 50);
  }

  // extra effects drawn on top of the scene: hurt flash, low-HP pulse, enemy attack warning
  function overlay() {
    const g = G;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (g.hurt > 0) {
      ctx.fillStyle = "rgba(255,60,90," + g.hurt * 0.2 + ")";
      ctx.fillRect(0, 0, 900, 300);
    }
    if (phase === "running" && !g.over && g.hp < 30) {
      const a = 0.18 + 0.1 * Math.sin(T * 6);
      const v = ctx.createRadialGradient(450, 150, 160, 450, 150, 520);
      v.addColorStop(0, "rgba(255,40,80,0)");
      v.addColorStop(1, "rgba(255,40,80," + a + ")");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, 900, 300);
    }
    if (phase === "running" && !g.over && alive() && g.fsw < 0 && g.cd < 0.7) {
      const pulse = 0.5 + 0.5 * Math.sin(T * 30);
      ctx.textAlign = "center";
      ctx.font = "900 52px system-ui, sans-serif";
      ctx.lineJoin = "round";
      ctx.lineWidth = 9;
      ctx.strokeStyle = "#1f1b4d";
      ctx.strokeText("!", FOEX - 10, GY - 185);
      ctx.fillStyle = "rgb(255," + ((70 + pulse * 120) | 0) + ",90)";
      ctx.fillText("!", FOEX - 10, GY - 185);
    }
    ctx.restore();
  }

  function drawThumbs(cs) {
    const keep = ctx;
    cs.forEach((cn, i) => {
      if (!cn) return;
      ctx = cn.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, 120, 150);
      ctx.fillStyle = "rgba(20,20,40,.22)";
      ctx.beginPath();
      ctx.ellipse(55, 148, 30, 5, 0, 0, 7);
      ctx.fill();
      ctx.setTransform(0.88, 0, 0, 0.88, 0, 0);
      hero(62, 168, CH[i], {
        a: CH[i].w[0],
        a2: CH[i].id === "fist" ? CH[i].w[0] : 0.3,
        reach: CH[i].id === "fist" ? 0.55 : 1,
        reach2: CH[i].id === "fist" ? 0.55 : 1,
        lg: 0,
        hurt: 0,
        p: -1,
        trail: [],
      });
    });
    ctx = keep;
  }

  let last = performance.now();
  function loop(now) {
    if (dead) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    T += dt;
    if (phase === "running") elapsed = (now - t0) / 1000;
    const stopped = G.stop > 0; // brief hit-stop on impact
    G.stop = Math.max(0, (G.stop || 0) - dt);
    update(stopped ? dt * 0.12 : dt);
    draw();
    overlay();
    hudT += dt;
    if (hudT > 0.12) {
      hudT = 0;
      if (phase === "running") emit();
    }
  }

  start(EX[0]);
  raf = requestAnimationFrame(loop);

  return {
    start,
    restart: () => start(ex),
    select: (i) => {
      SEL = i;
      start(ex);
    },
    setDiff: (id) => {
      diff = id;
      start(ex);
    },
    input,
    finish,
    drawThumbs,
    clearHistory: () => {
      hist = [];
      saveH([]);
      emit();
    },
    destroy: () => {
      dead = true;
      cancelAnimationFrame(raf);
    },
  };
}

/* ---------- Small visual pieces ---------- */
function Spark({ data }) {
  const W = 320,
    H = 100,
    P = 10,
    mx = Math.max(20, ...data) * 1.1;
  const pts = data.map((v, i) => [
    P + (data.length === 1 ? (W - 2 * P) / 2 : (i / (data.length - 1)) * (W - 2 * P)),
    H - P - (v / mx) * (H - 2 * P),
  ]);
  return (
    <svg className="ftb-sp" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Speed over time">
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={P}
          x2={W - P}
          y1={H - P - f * (H - 2 * P)}
          y2={H - P - f * (H - 2 * P)}
          stroke="currentColor"
          strokeOpacity=".15"
        />
      ))}
      {pts.length > 1 && (
        <polyline
          points={pts.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#7fd8ff" stroke="currentColor" strokeWidth="2.5" />
      ))}
    </svg>
  );
}

function Keyboard({ keys }) {
  return (
    <>
      <div className="ftb-kb" role="img" aria-label="Keyboard heat map of your mistakes">
        {ROWS.map((row, i) => (
          <div key={i} className="ftb-kr" style={{ marginLeft: i * 14 }}>
            {[...row].map((k) => {
              const s = keys[k];
              const cls = !s ? "" : s.miss === 0 ? "g" : s.miss / s.n < 0.2 ? "wn" : "b";
              return (
                <span
                  key={k}
                  className={"ftb-k" + (cls ? " ftb-" + cls : "")}
                  title={s ? `${s.miss} mistakes in ${s.n} presses` : "not used"}
                >
                  {k.toUpperCase()}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <p className="ftb-lg">
        <span>
          <i className="ftb-k ftb-g" />
          Clean
        </span>
        <span>
          <i className="ftb-k ftb-wn" />
          Some errors
        </span>
        <span>
          <i className="ftb-k ftb-b" />
          Many errors
        </span>
        <span>
          <i className="ftb-k" />
          Not used
        </span>
      </p>
    </>
  );
}

function Card({ label, value, unit, big }) {
  return (
    <div className={"ftb-card" + (big ? " ftb-big" : "")}>
      <small>{label}</small>
      <b>{value}</b>
      <span>{unit}</span>
    </div>
  );
}

const RESULT_TEXT = { done: "Text complete", defeat: "Warrior defeated", quit: "Stopped early" };

function Report({ data, onPractise, innerRef }) {
  const { r, res, exLabel, lvl, kills, maxCombo, taken, diff } = data;
  const d = r.previous ? r.net - r.previous.net : null;
  return (
    <section className="ftb-panel" ref={innerRef} aria-live="polite">
      <div className="ftb-rh">
        <h2>Analytical report</h2>
        <span className="ftb-lvl">{r.level}</span>
      </div>
      <p className="ftb-sub">
        {exLabel} · {diff} · {r.secs.toFixed(1)} s · {RESULT_TEXT[res]} · {kills} enemies defeated
        {d !== null && (
          <b className={d >= 0 ? "ftb-up" : "ftb-dn"}>
            {" "}
            {d >= 0 ? "▲" : "▼"} {Math.abs(d).toFixed(1)} WPM vs your last {exLabel.toLowerCase()} run
          </b>
        )}
      </p>
      <div className="ftb-grid">
        <Card label="Net speed" value={r.net.toFixed(1)} unit="WPM" big />
        <Card label="Gross speed" value={r.gross.toFixed(1)} unit="WPM" />
        <Card label="Accuracy" value={r.accuracy.toFixed(1)} unit="%" big />
        <Card
          label="Consistency"
          value={r.cons === null ? "n/a" : Math.round(r.cons)}
          unit={r.cons === null ? "too short" : "%"}
        />
        <Card label="Keystrokes" value={r.total} unit="total" />
        <Card label="Mistakes" value={r.misses} unit={`${r.corrected} fixed · ${r.unc} left`} />
        <Card label="Best combo" value={"×" + maxCombo} unit="clean words in a row" />
        <Card label="Damage taken" value={taken} unit="HP lost" />
        <Card label="Round reached" value={lvl} unit={`${kills} defeated`} />
      </div>
      <div className="ftb-two">
        <div>
          <h3>Speed over time</h3>
          <Spark data={r.timeline} />
          <p className="ftb-note">Words per minute, second by second.</p>
        </div>
        <div>
          <h3>Mistake heat map</h3>
          <Keyboard keys={r.keys} />
        </div>
      </div>
      <div className="ftb-two">
        <div>
          <h3>Problem keys</h3>
          {r.problem.length ? (
            <ul className="ftb-ls">
              {r.problem.map((p) => (
                <li key={p.k}>
                  <kbd>{keyName(p.k)}</kbd>
                  <span>
                    {p.miss} of {p.n} presses wrong
                  </span>
                  <b>{Math.round(p.rate * 100)}%</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ftb-note">No mistakes at all. Perfect run!</p>
          )}
        </div>
        <div>
          <h3>Slowest keys</h3>
          {r.slow.length ? (
            <ul className="ftb-ls">
              {r.slow.map((s) => (
                <li key={s.k}>
                  <kbd>{keyName(s.k)}</kbd>
                  <span>avg gap before this key</span>
                  <b>{Math.round(s.avg)} ms</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ftb-note">No key stood out as slow (average gap {Math.round(r.avgAll)} ms).</p>
          )}
        </div>
      </div>
      <h3>Suggestions</h3>
      <ul>
        {r.sg.map((s, i) => (
          <li key={i} className={"ftb-sg ftb-" + s.tone}>
            <div>
              <b>{s.title}</b>
              <p>{s.text}</p>
            </div>
            {s.practise && (
              <button className="ftb-btn ftb-btn--sun" type="button" onClick={() => onPractise(s.practise)}>
                Practise
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Step({ n, tone, aside, children }) {
  return (
    <h2 className="ftb-step">
      <span className={"ftb-badge ftb-" + tone}>{n}</span>
      {children}
      {aside}
    </h2>
  );
}

const TypedText = memo(function TypedText({ target, typed, phase }) {
  return (
    <div className="ftb-txt">
      {[...target].map((c, i) => {
        const t = typed[i];
        const cls =
          t === undefined ? (i === typed.length && phase !== "done" ? "cur" : "") : t === target[i] ? "ok" : "bad";
        return (
          <span key={i} className={"ftb-c" + (cls ? " ftb-" + cls : "")}>
            {c}
          </span>
        );
      })}
    </div>
  );
});

const TIPS = {
  idle: "Start typing to begin. The enemy starts charging as soon as you do.",
  running:
    "Finish a word and press Space to strike. Clean words build a combo. A typo makes the word sloppy, a wrong word costs you a hit. Esc for fresh text.",
  done: "Finished. See your report below.",
};

const INITIAL = {
  startId: 0,
  exId: EX[0].id,
  hint: EX[0].hint,
  sel: 0,
  target: "",
  typed: "",
  phase: "idle",
  time: 0,
  wpm: 0,
  acc: 100,
  prog: 0,
  hn: CH[0].name + " · " + CH[0].role,
  charDesc: CH[0].name + " · " + CH[0].desc,
  hp: 100,
  foe: 100,
  ult: 0,
  lvl: 1,
  spdText: "",
  fn: NAMES[0],
  trait: TRAITS[0].text,
  chg: 0,
  diff: "normal",
  hist: [],
};

/* ---------- Main component ---------- */
export default function FluffyTypeBattle() {
  const [ui, setUi] = useState(INITIAL);
  const [rep, setRep] = useState(null);
  const engine = useRef(null);
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const thumbs = useRef([]);
  const repRef = useRef(null);

  useEffect(() => {
    const eng = createBattle({ canvas: canvasRef.current, onUi: setUi, onReport: setRep });
    engine.current = eng;
    eng.drawThumbs(thumbs.current);
    return () => {
      eng.destroy();
      engine.current = null;
    };
  }, []);

  // focus the typing box after every new text
  useEffect(() => {
    inputRef.current?.focus();
  }, [ui.startId]);
  useEffect(() => {
    if (rep) repRef.current?.scrollIntoView({ block: "nearest" });
  }, [rep]);

  const practise = (id) => {
    engine.current?.start(EX.find((e) => e.id === id));
    window.scrollTo({ top: 0 });
  };
  const prevent = (e) => e.preventDefault();

  return (
    <div className="ftb">
      <main className="ftb-w">
        <div className="ftb-setup">
          <section className="ftb-panel">
            <Step n={1} tone="yl">
              Pick a drill
            </Step>
            <div className="ftb-row" role="group" aria-label="Choose an exercise">
              {EX.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className="ftb-chip"
                  aria-pressed={e.id === ui.exId}
                  onClick={() => engine.current?.start(e)}
                >
                  {e.label}
                  <small>{e.level}</small>
                </button>
              ))}
            </div>
            <p className="ftb-hint">{ui.hint}</p>
            <div className="ftb-diff" role="group" aria-label="Difficulty">
              <span>Difficulty</span>
              {Object.entries(DIFF).map(([id, d]) => (
                <button
                  key={id}
                  type="button"
                  className="ftb-chip ftb-chip--sm"
                  aria-pressed={id === ui.diff}
                  onClick={() => engine.current?.setDiff(id)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </section>

          <section className="ftb-panel">
            <Step n={2} tone="pk">
              Choose your fighter
            </Step>
            <div className="ftb-chs" role="group" aria-label="Choose your fighter">
              {CH.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  className="ftb-ch"
                  aria-pressed={i === ui.sel}
                  onClick={() => engine.current?.select(i)}
                >
                  <canvas
                    ref={(el) => {
                      thumbs.current[i] = el;
                    }}
                    width={120}
                    height={150}
                  />
                  <b>{c.name}</b>
                  <small>{c.role}</small>
                </button>
              ))}
            </div>
            <p className="ftb-hint">{ui.charDesc}</p>
          </section>
        </div>

        <section className="ftb-panel">
          <Step n={3} tone="mt">
            Type to fight
          </Step>
          <div className="ftb-hud">
            <div>
              <label>{ui.hn}</label>
              <div className="ftb-trk">
                <i style={{ width: ui.hp + "%" }} />
              </div>
            </div>
            <div className="ftb-mid">
              <b>ROUND {ui.lvl}</b>
              <small>{ui.spdText}</small>
            </div>
            <div className="ftb-r">
              <label>{ui.fn}</label>
              <div className="ftb-trk">
                <i style={{ width: ui.foe + "%" }} />
              </div>
              <small className="ftb-trait">{ui.trait}</small>
            </div>
          </div>
          <div className="ftb-meters">
            <div className="ftb-ult">
              <span>{ui.ult >= 10 ? "FINISHER READY" : "SURGE " + ui.ult + "/10"}</span>
              <div className="ftb-trk">
                <i style={{ width: ui.ult * 10 + "%" }} />
              </div>
            </div>
            <div className="ftb-ult ftb-chg">
              <span>ENEMY CHARGE</span>
              <div className="ftb-trk">
                <i style={{ width: ui.chg * 100 + "%" }} />
              </div>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            className="ftb-cv"
            width={900}
            height={300}
            role="img"
            aria-label="Night street fight between your fighter and an enemy"
          />
          <div className="ftb-stats">
            <div className="ftb-stat">
              <small>Time</small>
              <b>{ui.time.toFixed(1)}s</b>
            </div>
            <div className="ftb-stat">
              <small>Speed</small>
              <b>{ui.wpm}</b> WPM
            </div>
            <div className="ftb-stat">
              <small>Accuracy</small>
              <b>{ui.acc}%</b>
            </div>
            <div className="ftb-stat">
              <small>Progress</small>
              <b>{ui.prog}%</b>
            </div>
          </div>
          <div className="ftb-tx" onClick={() => inputRef.current?.focus()}>
            <TypedText target={ui.target} typed={ui.typed} phase={ui.phase} />
            <input
              ref={inputRef}
              className="ftb-inp"
              value={ui.typed}
              onChange={(e) => engine.current?.input(e.target.value)}
              onPaste={prevent}
              onDrop={prevent}
              onKeyDown={(e) => {
                if (e.key === "Escape") engine.current?.restart();
              }}
              disabled={ui.phase === "done"}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Type the text shown above"
            />
          </div>
          <p className="ftb-tip">{TIPS[ui.phase]}</p>
          <div className="ftb-row" style={{ marginTop: 14 }}>
            <button className="ftb-btn ftb-btn--mint" type="button" onClick={() => engine.current?.restart()}>
              New text
            </button>
            <button
              className="ftb-btn"
              type="button"
              disabled={ui.phase !== "running"}
              onClick={() => engine.current?.finish("quit")}
            >
              Finish now
            </button>
          </div>
        </section>

        {rep && <Report data={rep} onPractise={practise} innerRef={repRef} />}

        {ui.hist.length > 0 && (
          <section className="ftb-panel">
            <div className="ftb-rh">
              <h2>Recent sessions</h2>
              <button className="ftb-btn" type="button" onClick={() => engine.current?.clearHistory()}>
                Clear
              </button>
            </div>
            <div className="ftb-tw">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Exercise</th>
                    <th>Net WPM</th>
                    <th>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {ui.hist.slice(0, 8).map((x, i) => (
                    <tr key={x.d + i}>
                      <td>
                        {new Date(x.d).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>{EX.find((e) => e.id === x.ex)?.label ?? x.ex}</td>
                      <td>
                        <b>{x.net}</b>
                      </td>
                      <td>{x.acc}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}