/*
 * Demonstrations of resonance: Experiment 2 (pendulums on a rubber string)
 * and Experiment 1 (two tuning forks on sound boxes).
 *
 * Pendulums. Each pendulum i hangs from a rubber string that every other
 * pendulum tugs on, so
 *     θᵢ'' = −ωᵢ² θᵢ − β θᵢ' + κ ωᵢ² Σⱼ≠ᵢ θⱼ ,   ωᵢ² = g / lᵢ
 * Integrating this gives everything the book describes: B (same length as
 * A) slowly takes all of A's swing and hands it back, while shorter C and
 * longer D only twitch. A slacker string couples harder (larger κ), so the
 * exchange is quicker. Drag any bob except A's up or down to change its
 * length.
 * Drawing convention: the ICSE text says B moves in phase with A. Swing
 * sizes are the real ones; a pendulum in resonance with A is drawn in
 * step with it.
 *
 * Forks. The amplitude of each fork is tracked as an envelope: A decays
 * slowly (fast if touched), and B is fed by A's sound in proportion to a
 * sharp resonance peak in the difference of their frequencies. Wax on B
 * lowers its frequency, so it barely responds — and you can hear beats.
 */
(function () {
  "use strict";

  var C = App.COLOR, D = App.d, UI = App.ui, fmt = App.fmt;
  var BETA = 0.015, TH0 = 0.3;

  var state = {
    mode: "pend",
    t: 0, psi: 0,
    kappa: 0.06,
    pends: null,
    useE: false,
    forkF: 256, wax: 0, aA: 0, aB: 0, touchA: false
  };

  function makePends() {
    var list = [
      { n: "A", l: 1.0, fixed: true },
      { n: "C", l: 0.5 },
      { n: "B", l: 1.0 },
      { n: "D", l: 1.6 }
    ];
    if (state.useE) list.push({ n: "E", l: 0.8 });
    list.forEach(function (p) { p.th = p.n === "A" ? TH0 : 0; p.w = 0; });
    state.pends = list;
    state.t = 0; state.psi = 0;
  }

  function omega(p) { return Math.sqrt(App.G / p.l); }
  function amp(p) { var o = omega(p); return Math.sqrt(p.th * p.th + Math.pow(p.w / o, 2)); }
  function pendA() { return state.pends[0]; }
  function resonant(p) { return Math.abs(p.l - pendA().l) < 0.011; }

  function stepPend(dt) {
    var ps = state.pends, sum = 0, i;
    for (i = 0; i < ps.length; i++) sum += ps[i].th;
    for (i = 0; i < ps.length; i++) {
      var p = ps[i], o2 = App.G / p.l;
      var acc = -o2 * p.th - BETA * p.w + state.kappa * o2 * (sum - p.th);
      p.w += acc * dt;
    }
    for (i = 0; i < ps.length; i++) ps[i].th += ps[i].w * dt;
    state.psi += omega(pendA()) * dt;
  }

  function stepForks(dt) {
    var tauA = state.touchA ? 0.08 : 9, tauB = 7;
    state.aA *= Math.exp(-dt / tauA);
    var df = state.forkF - fB();
    var feed = 0.45 * state.aA * App.peak(df, 1.2);
    state.aB += (feed - state.aB / tauB) * dt;
    state.aB = Math.max(0, state.aB);
  }

  function fB() { return state.forkF - 2.5 * state.wax; }

  /* ------------------------------------------------------------------
     Panel
     ------------------------------------------------------------------ */

  function build(box) {
    if (!state.pends) makePends();
    UI.modes(box, [
      { key: "pend", label: "Pendulums (Exp. 2)" }, { key: "forks", label: "Tuning forks (Exp. 1)" }
    ], state.mode, function (k) { state.mode = k; rebuild(slot); }, "sub-modes", "Experiment");
    var slot = UI.el("div");
    box.appendChild(slot);
    rebuild(slot);
  }

  function rebuild(slot) {
    slot.innerHTML = "";
    if (state.mode === "pend") {
      UI.slider(slot, { label: "Slackness of the rubber string", min: 0.03, max: 0.14, step: 0.01, value: state.kappa,
        note: "A slacker string passes the vibrations on more strongly." }, function (v) { state.kappa = v; refresh(); });
      UI.actions(slot, [
        { label: "Set A swinging", primary: true, onClick: function () { makePends(); refresh(); } },
        { label: state.useE ? "Remove pendulum E" : "Add pendulum E", onClick: function (b) {
          state.useE = !state.useE; b.textContent = state.useE ? "Remove pendulum E" : "Add pendulum E"; makePends(); refresh(); } }
      ]);
      UI.note(slot, "Drag the bob of B, C, D (or E) up or down to change its length. Make one the same length as A and it will resonate.");
      App.hint("A, B, C and D hang from the same rubber string. A and B have the same length, so the same natural frequency. Set A swinging: its vibrations reach the others through the string as forced vibrations. C and D only make small vibrations, but B comes into resonance: it gradually takes over A's swing until A almost stops, then hands it back — energy is shared between them. B swings in phase with A.");
    } else {
      UI.select(slot, "Frequency of the forks", [256, 288, 320, 384, 512].map(function (f) { return { key: String(f), label: f + " Hz" }; }),
        String(state.forkF), function (v) { state.forkF = +v; refresh(); });
      UI.slider(slot, { label: "Wax stuck on fork B", min: 0, max: 6, step: 0.5, value: state.wax, unit: "g",
        note: "Wax makes B heavier, lowering its frequency." }, function (v) { state.wax = v; refresh(); });
      UI.actions(slot, [
        { label: "Strike fork A", primary: true, onClick: function () { state.aA = 1; state.touchA = false; refresh(); } },
        { label: "Touch A to stop it", onClick: function () { state.touchA = true; refresh(); } }
      ]);
      App.hint("Two identical forks stand on sound boxes whose open ends face each other. Strike A: the air in its box vibrates strongly and carries the vibration to B's box. Since B has the same natural frequency, it picks up the vibrations and starts sounding: resonance. Stop A with your hand and B is still heard. Add wax to B and it no longer matches A, so it hardly responds (turn the sound on: you may hear beats).");
    }
    refresh();
  }

  function refresh() {
    if (state.mode === "pend") {
      var rows = [];
      state.pends.forEach(function (p) {
        var f = omega(p) / (2 * Math.PI);
        rows.push({ name: "Pendulum " + p.n + ": l = " + fmt(p.l, 2) + " m", value: App.hz(f) + (p.n === "A" ? " (driver)" : resonant(p) ? " — resonance" : ""), cls: p.n !== "A" && resonant(p) ? "key" : "" });
      });
      rows.push({ name: "Swing of A now", value: "", id: "aA" });
      state.pends.slice(1).forEach(function (p) { rows.push({ name: "Swing of " + p.n + " now", value: "", id: "a" + p.n }); });
      App.work(rows);
      live();
    } else {
      var df = state.forkF - fB();
      App.work([
        { name: "Frequency of fork A", value: App.hz(state.forkF) },
        { name: "Frequency of fork B", value: App.hz(fB()), cls: "key" },
        { name: "Difference", value: fmt(df, 1) + " Hz" },
        { name: "Result", value: df < 0.5 ? "Equal: B resonates" : "Unequal: B barely responds", cls: df < 0.5 ? "key" : "warn" },
        { name: "Fork A sounding", value: "", id: "fa" },
        { name: "Fork B sounding", value: "", id: "fb" }
      ]);
      live();
    }
  }

  function live() {
    if (state.mode === "pend") {
      state.pends.forEach(function (p) { App.setWork("a" + p.n, fmt(amp(p) * 180 / Math.PI, 1) + "°"); });
    } else {
      App.setWork("fa", fmt(state.aA * 100, 0) + " %");
      App.setWork("fb", fmt(state.aB * 100, 0) + " %");
    }
  }

  /* ------------------------------------------------------------------
     Drawing
     ------------------------------------------------------------------ */

  var geo = { bobs: [] };

  function drawPend(W, H) {
    var ctx = App.ctx;
    var ps = state.pends, x0 = 60, x1 = W - 60, sy = 70;
    var barH = 90;
    var scale = (H - sy - barH - 70) / 1.8;
    // the rubber string sags a little with the swing it carries
    var sag = 0;
    ps.forEach(function (p) { sag += p.th; });
    sag = App.clamp(sag * 40 * state.kappa, -8, 8);
    D.line(x0, 30, x0, H - barH - 30, C.mark, 5);
    D.line(x1, 30, x1, H - barH - 30, C.mark, 5);
    ctx.beginPath();
    ctx.moveTo(x0, sy);
    ctx.quadraticCurveTo((x0 + x1) / 2, sy + 6, x1, sy);
    ctx.strokeStyle = C.orange; ctx.lineWidth = 3; ctx.stroke();
    D.label("P", x0 - 14, sy, C.mark, "center", "middle", 13);
    D.label("Q", x1 + 14, sy, C.mark, "center", "middle", 13);
    D.label("rubber string", (x0 + x1) / 2, sy - 16, C.note, "center", "middle", 12);
    geo.bobs = [];
    var gap = (x1 - x0) / (ps.length + 1);
    ps.forEach(function (p, i) {
      var px = x0 + gap * (i + 1);
      var py = sy + 3 + sag * Math.sin(Math.PI * (i + 1) / (ps.length + 1)) * 0.3;
      var L = p.l * scale;
      var th = (p.n === "A" || resonant(p)) ? amp(p) * Math.cos(state.psi) : p.th;
      var bx = px + L * Math.sin(th), by = py + L * Math.cos(th);
      D.line(px, py, px, py + L + 12, C.faint, 1, [3, 4]);
      D.line(px, py, bx, by, C.mark, 1.6);
      var hot = p.n === "A" || resonant(p);
      D.circle(bx, by, 12, hot ? C.accent : "#ffffff", C.ink, 2);
      D.label(p.n, bx, by + 26, C.mark, "center", "middle", 14, "700");
      if (!p.fixed) geo.bobs.push({ p: p, x: px, y: py + L, top: py });
      D.label(fmt(p.l, 2) + " m", px + 8, py + 16, C.note, "left", "middle", 11);
    });
    // swing bars
    var by0 = H - barH + 10, bw = Math.min(70, (W - 120) / ps.length - 20);
    D.label("Size of swing", 60, by0 - 14, C.mark, "left", "middle", 12);
    ps.forEach(function (p, i) {
      var x = 60 + i * (bw + 20);
      var v = amp(p) / TH0;
      D.roundRect(x, by0, bw, 16, 4, "#eef2f7", C.faint, 1);
      D.roundRect(x + 2, by0 + 2, Math.max(0, Math.min(1, v)) * (bw - 4), 12, 3, p.n === "A" ? C.accent : resonant(p) ? C.teal : C.guide, null);
      D.label(p.n, x + bw / 2, by0 + 32, C.mark, "center", "middle", 12, "700");
    });
    D.badge("Drag a bob to change its length", W - 16, 14, null, null, "right");
  }

  function drawForks(W, H) {
    var y = H * 0.6, bw = Math.min(260, W * 0.3), bh = 70;
    var ax = W / 2 - 50 - bw, bx2 = W / 2 + 50;
    D.floor(40, W - 40, y + bh + 2);
    // boxes: A open on the right, B open on the left
    function box(x, openRight, label) {
      D.rect(x, y, bw, bh, C.air, null);
      D.line(x, y, x + bw, y, C.woodDark, 6);
      D.line(x, y + bh, x + bw, y + bh, C.woodDark, 6);
      D.line(openRight ? x : x + bw, y, openRight ? x : x + bw, y + bh, C.woodDark, 6);
      D.label(label, x + bw / 2, y + bh + 24, C.note, "center", "middle", 12);
    }
    box(ax, true, "sound box of A (open end →)");
    box(bx2, false, "(← open end) sound box of B");
    var c = Math.sin(2 * Math.PI * 7 * state.t);
    D.fork(ax + bw / 2, y - 3, 130, 5 * state.aA * c, C.metalDark, "A  " + App.hz(state.forkF));
    D.fork(bx2 + bw / 2, y - 3, 130 + state.wax * 1.5, 5 * Math.min(1, state.aB * 2.2) * c, state.wax > 0 ? C.orange : C.metalDark, "B  " + App.hz(fB()));
    if (state.wax > 0) D.label("wax", bx2 + bw / 2 + 30, y - 120, C.orange, "left", "middle", 11);
    var phase = (state.t * 1.2) % 1;
    D.ripples(ax + bw + 4, y + bh / 2, 0, 3, 16 + 6 * phase, 0.55, C.accent, state.aA);
    D.ripples(bx2 - 4, y + bh / 2, Math.PI, 3, 16 + 6 * phase, 0.55, C.teal, Math.min(1, state.aB * 2.2));
    if (state.touchA && state.aA < 0.05) D.label("A stopped by hand", ax + bw / 2, y - 178, C.red, "center", "middle", 12);
    // meters
    D.meter(W - 130, 40, 30, 120, state.aA, "A", C.accent);
    D.meter(W - 80, 40, 30, 120, Math.min(1, state.aB * 2.2), "B", C.teal);
    D.label("How loudly each fork sounds", W - 90, 24, C.mark, "center", "middle", 12);
    if (state.aB * 2.2 > 0.4 && state.touchA) D.badge("B is still sounding: it was really vibrating", 16, 14, "#dcfce7", C.green);
  }

  var drag = null;

  App.register({
    id: "barton",
    title: "Barton's pendulums & forks",
    sub: "Experiments 1 and 2: which body picks up the vibration?",
    build: build,
    step: function (dt) {
      state.t += dt;
      if (state.mode === "pend") stepPend(dt); else stepForks(dt);
      if (Math.round(state.t * 6) !== Math.round((state.t - dt) * 6)) live();
    },
    draw: function (W, H) { if (state.mode === "pend") drawPend(W, H); else drawForks(W, H); },
    pointer: function (kind, x, y) {
      if (state.mode !== "pend") return false;
      if (kind === "down") {
        geo.bobs.forEach(function (b) { if (Math.abs(x - b.x) < 30 && Math.abs(y - b.y) < 24) drag = b; });
        return !!drag;
      }
      if (kind === "move" && drag) {
        var H = App.H, scale = (H - 70 - 90 - 70) / 1.8;
        var l = App.clamp((y - drag.top) / scale, 0.3, 1.8);
        l = Math.round(l / 0.05) * 0.05;
        if (Math.abs(l - pendA().l) < 0.03) l = pendA().l;
        if (l !== drag.p.l) { drag.p.l = l; refresh(); }
      }
      if (kind === "up") drag = null;
    },
    cursor: function (x, y) {
      if (state.mode !== "pend") return "default";
      if (drag) return "ns-resize";
      var over = geo.bobs.some(function (b) { return Math.abs(x - b.x) < 30 && Math.abs(y - b.y) < 24; });
      return over ? "ns-resize" : "default";
    },
    sound: function () {
      if (state.mode !== "forks") return [];
      return [{ f: state.forkF, a: 0.45 * state.aA }, { f: fB(), a: 0.6 * Math.min(1, state.aB * 2.2) }];
    }
  });
})();
