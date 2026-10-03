/*
 * Natural frequency. Four bodies, each vibrating freely at the frequency
 * its own build decides (text 7.6, examples 1, 2, 4 and 5):
 *
 *   simple pendulum   f = (1 / 2π) √(g / l)
 *   load on a spring  f = (1 / 2π) √(K / m)
 *   stretched string  f = (1 / 2l) √(T / πr²d)
 *   air column        f = v / 4l (closed at one end) or v / 2l (open)
 *
 * The motion on screen is computed from the same f that the working
 * shows. Strings and air columns vibrate hundreds of times a second, far
 * too fast to see, so they are drawn slowed down — the badge says by how
 * much — while the sound, when it is on, plays at the true frequency.
 */
(function () {
  "use strict";

  var C = App.COLOR, D = App.d, UI = App.ui, fmt = App.fmt, sub = App.sub;

  var PLANETS = {
    earth: { g: 9.8, name: "Earth" },
    moon: { g: 1.6, name: "Moon" },
    jupiter: { g: 24.8, name: "Jupiter" }
  };

  var MATERIALS = {
    steel: { d: 7800, name: "Steel", color: "#64748b" },
    copper: { d: 8900, name: "Copper", color: "#b45309" },
    nylon: { d: 1150, name: "Nylon", color: "#a8a29e" }
  };

  var HINTS = {
    pendulum: "A longer pendulum swings more slowly: f ∝ 1/√l, so four times the length halves the frequency. The mass of the bob does not appear in the formula, so it does not matter. On the Moon, where g is smaller, the same pendulum swings more slowly.",
    spring: "A stiffer spring (larger force constant K) vibrates faster and a heavier load vibrates more slowly: f ∝ √K and f ∝ 1/√m. Same load on different springs, or different loads on the same spring, give different natural frequencies.",
    string: "f ∝ 1/l, f ∝ 1/r, f ∝ √T and f ∝ 1/√d. To raise the pitch, shorten the string, use a thinner one, or tighten it. Turn the sound on and hear the note change as you move the sliders.",
    air: "For an air column f ∝ 1/l: the longer the column, the lower the note. A pipe closed at one end gives v/4l; an open pipe of the same length gives v/2l, twice the frequency. Opening holes in a flute shortens the column and raises the note."
  };

  var state = {
    mode: "pendulum",
    t: 0,
    pend: { l: 1.0, planet: "earth" },
    spring: { K: 40, m: 0.5 },
    string: { l: 0.5, T: 60, r: 0.3, mat: "steel" },
    air: { kind: "closed", l: 34 },
    pin: null
  };

  /* ------------------------------------------------------------------
     Physics
     ------------------------------------------------------------------ */

  function massPerLength() {
    var s = state.string;
    var r = s.r / 1000;
    return Math.PI * r * r * MATERIALS[s.mat].d;
  }

  function freq() {
    var m = state.mode;
    if (m === "pendulum") return Math.sqrt(PLANETS[state.pend.planet].g / state.pend.l) / (2 * Math.PI);
    if (m === "spring") return Math.sqrt(state.spring.K / state.spring.m) / (2 * Math.PI);
    if (m === "string") return Math.sqrt(state.string.T / massPerLength()) / (2 * state.string.l);
    var l = state.air.l / 100;
    return App.V_SOUND / ((state.air.kind === "closed" ? 4 : 2) * l);
  }

  // What we draw: slow enough to follow by eye.
  function shownFreq(f) {
    var cap = state.mode === "pendulum" ? 99 : state.mode === "spring" ? 3 : state.mode === "string" ? 1.4 : 0.9;
    return Math.min(f, cap);
  }

  /* ------------------------------------------------------------------
     Panel
     ------------------------------------------------------------------ */

  var box, pinButtons;

  function build(b) {
    box = b;
    UI.modes(box, [
      { key: "pendulum", label: "Pendulum" },
      { key: "spring", label: "Spring" },
      { key: "string", label: "String" },
      { key: "air", label: "Air column" }
    ], state.mode, function (k) { state.mode = k; state.t = 0; rebuild(); }, "sub-modes cols-4", "Vibrating body");
    var slot = UI.el("div");
    slot.id = "natSlot";
    box.appendChild(slot);
    pinButtons = UI.actions(box, [
      { label: "Pin this frequency", onClick: function () { state.pin = { mode: state.mode, f: freq() }; refresh(); } },
      { label: "Clear pin", onClick: function () { state.pin = null; refresh(); } }
    ]);
    UI.note(box, "Pin a setting, change one quantity, and the working shows how many times the frequency changed.");
    rebuild();
  }

  function rebuild() {
    var slot = document.getElementById("natSlot");
    slot.innerHTML = "";
    var m = state.mode;
    if (m === "pendulum") {
      UI.slider(slot, { label: "Length l", min: 0.1, max: 2, step: 0.05, value: state.pend.l, unit: "m" },
        function (v) { state.pend.l = v; refresh(); });
      UI.modes(slot, [
        { key: "earth", label: "Earth" }, { key: "moon", label: "Moon" }, { key: "jupiter", label: "Jupiter" }
      ], state.pend.planet, function (k) { state.pend.planet = k; refresh(); }, "cols-3", "Place");
    } else if (m === "spring") {
      UI.slider(slot, { label: "Force constant K", min: 5, max: 200, step: 5, value: state.spring.K, unit: "N/m",
        note: "K is the force needed to stretch the spring by 1 m: large for a hard spring." },
        function (v) { state.spring.K = v; refresh(); });
      UI.slider(slot, { label: "Mass of load m", min: 0.05, max: 2, step: 0.05, value: state.spring.m, unit: "kg" },
        function (v) { state.spring.m = v; refresh(); });
    } else if (m === "string") {
      UI.slider(slot, { label: "Length l", min: 0.2, max: 1, step: 0.01, value: state.string.l, unit: "m" },
        function (v) { state.string.l = v; refresh(); });
      UI.slider(slot, { label: "Tension T", min: 10, max: 200, step: 5, value: state.string.T, unit: "N" },
        function (v) { state.string.T = v; refresh(); });
      UI.slider(slot, { label: "Radius r", min: 0.1, max: 0.6, step: 0.05, value: state.string.r, unit: "mm" },
        function (v) { state.string.r = v; refresh(); });
      UI.modes(slot, [
        { key: "steel", label: "Steel" }, { key: "copper", label: "Copper" }, { key: "nylon", label: "Nylon" }
      ], state.string.mat, function (k) { state.string.mat = k; refresh(); }, "cols-3", "Material");
    } else {
      UI.modes(slot, [
        { key: "closed", label: "Closed at one end" }, { key: "open", label: "Open at both ends" }
      ], state.air.kind, function (k) { state.air.kind = k; refresh(); }, "", "Pipe");
      UI.slider(slot, { label: "Length of air column l", min: 10, max: 100, step: 1, value: state.air.l, unit: "cm" },
        function (v) { state.air.l = v; refresh(); });
    }
    App.hint(HINTS[m]);
    refresh();
  }

  function refresh() {
    var m = state.mode, f = freq(), rows = [];
    var hz = App.hz;
    if (m === "pendulum") {
      var g = PLANETS[state.pend.planet].g;
      rows.push({ name: "Formula", value: "f = (1/2π)√(g/l)", cls: "formula" });
      rows.push({ name: "Length l", value: fmt(state.pend.l) + " m" });
      rows.push({ name: "g (" + PLANETS[state.pend.planet].name + ")", value: g + " m s⁻²" });
      rows.push({ name: "f = (1/2π)√(" + g + " / " + fmt(state.pend.l) + ")", value: hz(f), cls: "key" });
    } else if (m === "spring") {
      rows.push({ name: "Formula", value: "f = (1/2π)√(K/m)", cls: "formula" });
      rows.push({ name: "Force constant K", value: state.spring.K + " N/m" });
      rows.push({ name: "Mass m", value: fmt(state.spring.m) + " kg" });
      rows.push({ name: "f = (1/2π)√(" + state.spring.K + " / " + fmt(state.spring.m) + ")", value: hz(f), cls: "key" });
    } else if (m === "string") {
      var mu = massPerLength();
      rows.push({ name: "Formula", value: "f = (1/2l)√(T/πr²d)", cls: "formula" });
      rows.push({ name: "Length l", value: fmt(state.string.l) + " m" });
      rows.push({ name: "Tension T", value: state.string.T + " N" });
      rows.push({ name: "Radius r", value: fmt(state.string.r) + " mm" });
      rows.push({ name: "Density d (" + MATERIALS[state.string.mat].name + ")", value: MATERIALS[state.string.mat].d + " kg m⁻³" });
      rows.push({ name: "Mass per unit length πr²d", value: fmt(mu * 1000, 3) + " g/m" });
      rows.push({ name: "Natural frequency f", value: hz(f), cls: "key" });
    } else {
      var closed = state.air.kind === "closed";
      rows.push({ name: "Formula", value: closed ? "f = v / 4l" : "f = v / 2l", cls: "formula" });
      rows.push({ name: "Speed of sound v", value: App.V_SOUND + " m/s" });
      rows.push({ name: "Length l", value: state.air.l + " cm" });
      rows.push({ name: "Wavelength λ = " + (closed ? "4l" : "2l"), value: fmt((closed ? 4 : 2) * state.air.l) + " cm" });
      rows.push({ name: "Natural frequency f", value: hz(f), cls: "key" });
    }
    rows.push({ name: "Time period T = 1/f", value: f >= 10 ? fmt(1000 / f, 2) + " ms" : fmt(1 / f, 2) + " s" });
    rows.push({ name: "Can we hear it?", value: f < 20 ? "No: below 20 Hz" : f > 20000 ? "No: above 20 kHz" : "Yes", cls: f < 20 ? "warn" : "" });
    if (state.pin && state.pin.mode === m) {
      rows.push({ name: "Pinned frequency f₀", value: hz(state.pin.f) });
      rows.push({ name: "f / f₀", value: "× " + fmt(f / state.pin.f, 2), cls: "key" });
    }
    App.work(rows);
  }

  /* ------------------------------------------------------------------
     Drawing
     ------------------------------------------------------------------ */

  function slowBadge(W, f) {
    var shown = shownFreq(f);
    if (f / shown > 1.05) D.badge("Slowed down × " + fmt(f / shown, 0), W - 16, 16, null, null, "right");
  }

  function drawPendulum(W, H, f) {
    var cx = W / 2, top = 56;
    var scale = (H - 150) / 2.0;
    var L = state.pend.l * scale;
    var th0 = 0.22, th = th0 * Math.cos(2 * Math.PI * f * state.t);
    D.ceiling(cx - 90, cx + 90, top);
    ctx().beginPath();
    ctx().setLineDash([4, 4]);
    ctx().arc(cx, top, L, Math.PI / 2 - th0, Math.PI / 2 + th0);
    ctx().strokeStyle = C.faint;
    ctx().lineWidth = 1.4;
    ctx().stroke();
    ctx().setLineDash([]);
    D.line(cx, top, cx, top + L + 30, C.faint, 1, [3, 4]);
    var bx = cx + L * Math.sin(th), by = top + L * Math.cos(th);
    D.line(cx, top, bx, by, C.mark, 1.8);
    D.circle(bx, by, 15, C.accent, C.ink, 2);
    D.vspan(cx - 70, top, top + L, "l = " + fmt(state.pend.l) + " m", C.note, "left");
    var p = PLANETS[state.pend.planet];
    D.badge(p.name + ": g = " + p.g + " m s⁻²", 16, 16);
    D.label("One swing O → A → O → B → O takes T = " + fmt(1 / f, 2) + " s", cx, H - 26, C.note, "center", "middle", 12);
  }

  function drawSpring(W, H, f) {
    var cx = W / 2, top = 56;
    var s = state.spring;
    var rest = Math.min(H * 0.42, 260);
    var amp = 36;
    var x = amp * Math.cos(2 * Math.PI * shownFreq(f) * state.t);
    var side = 34 + 46 * Math.sqrt(s.m / 2);
    var yMass = top + rest + x;
    D.ceiling(cx - 80, cx + 80, top);
    D.line(cx - 70, top + rest, cx + 70, top + rest, C.faint, 1, [3, 4]);
    D.label("mean position", cx + 74, top + rest, C.note, "left", "middle", 11);
    D.spring(cx, top, yMass, 9, 16, C.mark, 1.2 + 3.2 * (s.K / 200));
    D.rect(cx - side / 2, yMass, side, side, C.accent, C.ink, 2);
    D.label(fmt(s.m) + " kg", cx, yMass + side / 2, "#ffffff", "center", "middle", 12, "700");
    D.label("K = " + s.K + " N/m", cx + 26, top + rest * 0.45, C.mark, "left", "middle", 12);
    slowBadge(W, f);
    D.label("Thicker spring wire = stiffer spring (larger K). Bigger block = heavier load.", cx, H - 26, C.note, "center", "middle", 12);
  }

  function drawString(W, H, f) {
    var s = state.string;
    var x0 = 70, scale = (W - 210) / 1.0;
    var x1 = x0 + s.l * scale;
    var y = H * 0.42;
    var mat = MATERIALS[s.mat];
    // sounding board
    D.rect(40, y + 26, W - 110, 34, "#f3e5d4", C.woodDark, 1.5);
    D.label("sonometer box", 50, y + 43, C.woodDark, "left", "middle", 11);
    // bridges
    [x0, x1].forEach(function (bx) {
      ctx().beginPath();
      ctx().moveTo(bx - 9, y + 26); ctx().lineTo(bx, y); ctx().lineTo(bx + 9, y + 26); ctx().closePath();
      ctx().fillStyle = C.woodDark; ctx().fill();
    });
    // pulley and weight at the right
    var px = W - 60, py = y - 4;
    D.line(x1, y, px, y, mat.color, 1 + s.r * 6);
    D.line(46, y, x0, y, mat.color, 1 + s.r * 6);
    D.circle(px, py + 14, 14, C.accentFill, C.accent, 2);
    var hang = py + 14 + 60 + Math.min(80, s.T / 2.5);
    D.line(px + 14, py + 14, px + 14, hang, mat.color, 1 + s.r * 6);
    var wsz = 22 + s.T / 8;
    D.rect(px + 14 - wsz / 2, hang, wsz, wsz * 0.9, C.metalDark, C.ink, 1.5);
    D.label("T = " + s.T + " N", px + 14, hang + wsz * 0.9 + 14, C.mark, "center", "middle", 12);
    // vibrating part
    var amp = 26 * Math.cos(2 * Math.PI * shownFreq(f) * state.t);
    D.plot(function (x) { return y - amp * Math.sin(Math.PI * (x - x0) / (x1 - x0)); }, x0, x1, mat.color, 1 + s.r * 6);
    D.plot(function (x) { return y - 26 * Math.sin(Math.PI * (x - x0) / (x1 - x0)); }, x0, x1, C.faint, 1, [3, 4]);
    D.plot(function (x) { return y + 26 * Math.sin(Math.PI * (x - x0) / (x1 - x0)); }, x0, x1, C.faint, 1, [3, 4]);
    D.hspan(x0, x1, y + 80, "l = " + fmt(s.l) + " m");
    D.badge(mat.name + " wire, r = " + fmt(s.r) + " mm", 16, 16);
    slowBadge(W, f);
    D.label("Plucked in the middle, it vibrates in one loop: the principal note.", W / 2, H - 26, C.note, "center", "middle", 12);
  }

  function drawAir(W, H, f) {
    var a = state.air, closed = a.kind === "closed";
    var x0 = 80, scale = (W - 200) / 1.0;
    var L = a.l / 100 * scale, x1 = x0 + L;
    var yc = H * 0.42, h = 44;
    var k = closed ? Math.PI / (2 * L) : Math.PI / L;
    var env = closed ? function (x) { return Math.sin(k * (x - x0)); } : function (x) { return Math.cos(k * (x - x0)); };
    D.rect(x0, yc - h, L, 2 * h, C.air, null);
    D.plot(function (x) { return yc - (h - 6) * env(x); }, x0, x1, C.faint, 1.4, [4, 4]);
    D.plot(function (x) { return yc + (h - 6) * env(x); }, x0, x1, C.faint, 1.4, [4, 4]);
    var c = Math.cos(2 * Math.PI * shownFreq(f) * state.t);
    var cols = Math.max(8, Math.round(L / 11)), rows = 6;
    for (var i = 0; i < cols; i++) {
      for (var j = 0; j < rows; j++) {
        var bx = x0 + (i + 0.5) * L / cols, by = yc - h + (j + 0.5) * 2 * h / rows;
        D.dot(bx + 7 * env(bx) * c, by, C.accent, 2.6);
      }
    }
    D.line(x0, yc - h, x1, yc - h, C.ink, 3);
    D.line(x0, yc + h, x1, yc + h, C.ink, 3);
    if (closed) D.rect(x0 - 10, yc - h - 4, 10, 2 * h + 8, C.ink, null);
    // node / antinode marks
    if (closed) {
      D.label("N", x0, yc + h + 20, C.orange, "center", "middle", 13, "700");
      D.label("A", x1, yc - h - 16, C.teal, "center", "middle", 13, "700");
    } else {
      D.label("A", x0, yc - h - 16, C.teal, "center", "middle", 13, "700");
      D.label("N", (x0 + x1) / 2, yc + h + 20, C.orange, "center", "middle", 13, "700");
      D.label("A", x1, yc - h - 16, C.teal, "center", "middle", 13, "700");
    }
    D.ripples(x1 + 4, yc, 0, 3, 14, 0.7, C.accent, 0.7);
    if (!closed) D.ripples(x0 - 4, yc, Math.PI, 3, 14, 0.7, C.accent, 0.7);
    D.hspan(x0, x1, yc + h + 46, "l = " + a.l + " cm  =  " + (closed ? "λ/4" : "λ/2"));
    D.badge(closed ? "Closed end: node (air cannot move)" : "Both ends open: antinodes", 16, 16);
    slowBadge(W, f);
    D.label("Dots are air particles: they move along the pipe, most at A, not at all at N.", W / 2, H - 26, C.note, "center", "middle", 12);
  }

  function ctx() { return App.ctx; }

  App.register({
    id: "natural",
    title: "Natural frequency",
    sub: "Every body has its own frequency, set by its build",
    build: build,
    step: function (dt) { state.t += dt; },
    draw: function (W, H) {
      var f = freq();
      if (state.mode === "pendulum") drawPendulum(W, H, f);
      else if (state.mode === "spring") drawSpring(W, H, f);
      else if (state.mode === "string") drawString(W, H, f);
      else drawAir(W, H, f);
    },
    sound: function () {
      if (state.mode === "string" || state.mode === "air") return [{ f: freq(), a: 0.5 }];
      return [];
    }
  });
})();
