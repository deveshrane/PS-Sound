/*
 * Stretched strings: standing waves and the sonometer (text 7.6 (5) and
 * (7), Fig 7.5, Examples 1, 2 and 4).
 *
 * Standing waves: a wave and its reflection, equal and opposite, added
 * point by point. With both ends fixed only whole loops fit, so n loops
 * means λ = 2l/n.
 *
 * Sonometer: the wire's tension comes from the hanger (T = Mg), its mass
 * per unit length from its radius and material, so
 *     f₁ = (1/2l) √(T/m),   fₙ = n f₁.
 * Click the wire to pluck it at any point. A string plucked at p, released
 * from rest, holds its modes in the proportions
 *     aₙ ∝ sin(nπp/l) / n²
 * so plucking in the middle gives mostly the principal note, and plucking
 * near an end brings in the higher modes. Each mode is drawn at its own
 * frequency (scaled down to be visible) and heard at its true one.
 *
 * The fork-and-rider experiment: a fork on the bridge drives the wire.
 * Only a fork matching one of the modes makes a large vibration, and the
 * rider flies off only if it is not sitting at a node of that mode.
 */
(function () {
  "use strict";

  var C = App.COLOR, D = App.d, UI = App.ui, fmt = App.fmt;
  var NMODES = 8, FVIS = 1.1;

  var state = {
    mode: "sono",
    t: 0,
    // standing-wave builder
    loops: 2, parts: true, slow: false,
    // sonometer
    M: 4, l: 0.5, r: 0.25,
    amps: [], pluckP: null, pluckT: 0, touch: false,
    drive: false, F: 320, driveAmp: 0,
    rider: 0.5, riderOff: false, riderFly: null
  };

  function mu() { var r = state.r / 1000; return Math.PI * r * r * 7800; }
  function tension() { return state.M * App.G; }
  function f1() { return Math.sqrt(tension() / mu()) / (2 * state.l); }

  /* ------------------------------------------------------------------
     Plucking and driving
     ------------------------------------------------------------------ */

  function pluck(p) {
    state.drive = false;
    if (driveBtn) { driveBtn.setAttribute("aria-pressed", "false"); driveBtn.textContent = "Put the fork on the bridge"; }
    state.pluckP = p;
    state.pluckT = 0;
    state.amps = [];
    var max = 0;
    for (var n = 1; n <= NMODES; n++) {
      var a = Math.sin(n * Math.PI * p) / (n * n * p * (1 - p));
      if (state.touch && n % 2 === 1) a = 0;   // a finger at the middle allows no motion there
      state.amps.push(a);
      max = Math.max(max, Math.abs(a));
    }
    state.amps = state.amps.map(function (a) { return a / (max || 1); });
    refresh();
  }

  function decay(n) {
    var tau = 3.2 / (1 + 0.35 * (n - 1));
    if (state.touch && n % 2 === 1) tau = 0.06;
    return Math.exp(-state.pluckT / tau);
  }

  // Steady response of mode n to the fork: a sharp peak at F = n f₁.
  function driven(n) {
    var fn = n * f1();
    return App.peak(state.F - fn, 0.012 * fn);
  }

  function shapeAt(u) {
    // u = position along the wire, 0..1; returns displacement, ±1 scale
    var s = 0, n;
    if (state.drive) {
      var c = Math.cos(2 * Math.PI * 1.6 * state.t);
      for (n = 1; n <= NMODES; n++) s += driven(n) * Math.sin(n * Math.PI * u);
      s = (s + 0.05 * Math.sin(Math.PI * u)) * c * state.driveAmp;
    } else if (state.amps.length) {
      for (n = 1; n <= NMODES; n++) {
        s += state.amps[n - 1] * decay(n) * Math.sin(n * Math.PI * u) * Math.cos(2 * Math.PI * FVIS * n * state.t);
      }
    }
    return s;
  }

  function riderLocal() {
    // the rider feels the envelope of the motion where it sits
    var s = 0;
    for (var n = 1; n <= NMODES; n++) s += driven(n) * Math.sin(n * Math.PI * state.rider);
    return Math.abs(s + 0.05 * Math.sin(Math.PI * state.rider)) * state.driveAmp;
  }

  function step(dt) {
    state.t += dt;
    if (state.amps.length) state.pluckT += dt;
    // the wire takes a moment to build up once the fork touches the bridge
    var target = state.drive ? 1 : 0;
    state.driveAmp += (target - state.driveAmp) * (1 - Math.exp(-dt * 1.5));
    if (state.drive && !state.riderOff && riderLocal() > 0.45) {
      state.riderOff = true;
      state.riderFly = { t: 0 };
      refresh();
    }
    if (state.riderFly) state.riderFly.t += dt;
  }

  /* ------------------------------------------------------------------
     Panel
     ------------------------------------------------------------------ */

  var driveBtn = null;

  function build(box) {
    UI.modes(box, [
      { key: "waves", label: "Standing waves" }, { key: "sono", label: "Sonometer" }
    ], state.mode, function (k) { state.mode = k; rebuild(slot); }, "sub-modes", "View");
    var slot = UI.el("div");
    box.appendChild(slot);
    rebuild(slot);
  }

  function rebuild(slot) {
    slot.innerHTML = "";
    driveBtn = null;
    if (state.mode === "waves") {
      UI.label(slot, "Number of loops");
      UI.modes(slot, [1, 2, 3, 4].map(function (n) { return { key: n, label: String(n) }; }), state.loops,
        function (k) { state.loops = k; refresh(); }, "cols-4", "Loops");
      UI.actions(slot, [
        { label: state.parts ? "Hide the two waves" : "Show the two waves", onClick: function (b) {
          state.parts = !state.parts; b.textContent = state.parts ? "Hide the two waves" : "Show the two waves"; } },
        { label: "Slow motion", toggle: true, onClick: function (b) {
          state.slow = !state.slow; b.setAttribute("aria-pressed", String(state.slow)); } }
      ]);
      App.hint("The orange wave travels right, the purple one is its reflection travelling left. Their sum (blue) does not travel at all: it swells and shrinks in loops. The points marked N never move — nodes. Both fixed ends must be nodes, so only whole loops fit, and one loop is half a wavelength.");
    } else {
      UI.slider(slot, { label: "Mass on the hanger M", min: 1, max: 10, step: 0.5, value: state.M, unit: "kg",
        note: "Tension in the wire T = Mg." }, function (v) { state.M = v; refresh(); });
      UI.slider(slot, { label: "Length between bridges l", min: 0.2, max: 1, step: 0.01, value: state.l, unit: "m" },
        function (v) { state.l = v; refresh(); });
      UI.slider(slot, { label: "Radius of the wire r", min: 0.15, max: 0.5, step: 0.05, value: state.r, unit: "mm" },
        function (v) { state.r = v; refresh(); });
      UI.note(slot, "Click anywhere on the wire to pluck it there.");
      UI.actions(slot, [
        { label: "Pluck at the middle", onClick: function () { pluck(0.5); } },
        { label: "Touch the middle", toggle: true, onClick: function (b) {
          state.touch = !state.touch; b.setAttribute("aria-pressed", String(state.touch)); refresh(); } }
      ]);
      UI.label(slot, "Tuning fork and paper rider");
      UI.slider(slot, { label: "Frequency of the fork", min: 50, max: 1000, step: 1, value: state.F, unit: "Hz" },
        function (v) { state.F = v; refresh(); });
      var b = UI.actions(slot, [
        { label: "Put the fork on the bridge", toggle: true, onClick: function (btn) {
          state.drive = !state.drive;
          if (state.drive) { state.amps = []; }
          btn.setAttribute("aria-pressed", String(state.drive));
          btn.textContent = state.drive ? "Take the fork off" : "Put the fork on the bridge";
          refresh(); } },
        { label: "Fork = f₁", onClick: function () { setF(f1()); } },
        { label: "Fork = 2f₁", onClick: function () { setF(2 * f1()); } }
      ]);
      driveBtn = b[0];
      UI.actions(slot, [{ label: "Put the rider back", onClick: function () { state.riderOff = false; state.riderFly = null; refresh(); } }]);
      UI.note(slot, "Drag the paper rider along the wire. At resonance it is thrown off — unless it sits at a node.");
      App.hint("Plucked in the middle, the wire vibrates mostly in one loop: the principal note f. Plucked near one end, higher modes 2f, 3f… join in, as the bars show. Touching the exact middle stops every mode that needs motion there, leaving the 2-loop note. A fork only sets the wire in large vibrations when its frequency equals one of the wire's natural frequencies: resonance.");
      sliderF = slot.querySelectorAll("input[type=range]")[3];
    }
    refresh();
  }

  var sliderF = null;
  function setF(v) {
    state.F = Math.round(App.clamp(v, 50, 1000));
    if (sliderF) {
      sliderF.value = state.F;
      sliderF.parentNode.querySelector("input[type=number]").value = state.F;
    }
    refresh();
  }

  function refresh() {
    var sub = App.sub;
    if (state.mode === "waves") {
      var n = state.loops;
      var lam = ["2l", "l", "2l/3", "l/2"][n - 1];
      App.work([
        { name: "Loops", value: String(n), cls: "key" },
        { name: "One loop", value: "λ/2" },
        { name: "So l = " + n + " × λ/2, λ =", value: lam, cls: "key" },
        { name: "Frequency", value: n === 1 ? "f (principal note)" : n + "f", cls: "key" },
        { name: "Nodes (including both ends)", value: String(n + 1) },
        { name: "Antinodes", value: String(n) }
      ]);
      return;
    }
    var F1 = f1(), rows = [
      { name: "Tension T = Mg", value: fmt(tension(), 1) + " N" },
      { name: "Mass per unit length πr²d", value: fmt(mu() * 1000, 3) + " g/m" },
      { name: "f" + sub("1") + " = (1/2l)√(T/m)", value: App.hz(F1), cls: "key" },
      { name: "Modes 2f" + sub("1") + ", 3f" + sub("1") + ", 4f" + sub("1"), value: App.hz(2 * F1) + ", " + App.hz(3 * F1) + ", " + App.hz(4 * F1) }
    ];
    if (state.drive) {
      var best = 1, bestV = 0;
      for (var k = 1; k <= NMODES; k++) if (driven(k) > bestV) { bestV = driven(k); best = k; }
      rows.push({ name: "Fork frequency", value: App.hz(state.F) });
      rows.push({ name: "Nearest natural frequency", value: (best > 1 ? best : "") + "f" + sub("1") + " = " + App.hz(best * F1) });
      rows.push({ name: "Result", value: bestV > 0.5 ? "Resonance: " + best + " loop" + (best > 1 ? "s" : "") : "Forced vibrations, small", cls: bestV > 0.5 ? "key" : "warn" });
      rows.push({ name: "Rider", value: state.riderOff ? "thrown off" : "stays on", cls: state.riderOff ? "key" : "" });
    } else if (state.pluckP != null) {
      var p = state.pluckP;
      rows.push({ name: "Plucked at", value: fmt(p * state.l * 100, 0) + " cm  (" + fmt(p, 2) + " l)" });
      if (state.touch) rows.push({ name: "Finger at the middle", value: "odd modes stopped", cls: "warn" });
    }
    App.work(rows);
  }

  /* ------------------------------------------------------------------
     Drawing
     ------------------------------------------------------------------ */

  var geo = {};

  function drawWaves(W, H) {
    var x0 = 70, x1 = W - 70, L = x1 - x0, yc = H * 0.42, A = Math.min(46, H * 0.08);
    var n = state.loops, k = n * Math.PI / L, w = 2 * Math.PI * 0.5;
    var t = state.t * (state.slow ? 0.25 : 1);
    D.line(x0, yc, x1, yc, C.faint, 1, [3, 4]);
    D.rect(x0 - 14, yc - 90, 14, 180, C.mark, null);
    D.rect(x1, yc - 90, 14, 180, C.mark, null);
    if (state.parts) {
      D.plot(function (x) { return yc - A * Math.sin(k * (x - x0) - w * t); }, x0, x1, C.wave2, 2, [7, 5]);
      D.plot(function (x) { return yc - A * Math.sin(k * (x - x0) + w * t); }, x0, x1, C.wave3, 2, [2, 4]);
    }
    D.plot(function (x) { return yc - 2 * A * Math.sin(k * (x - x0)); }, x0, x1, C.faint, 1);
    D.plot(function (x) { return yc + 2 * A * Math.sin(k * (x - x0)); }, x0, x1, C.faint, 1);
    D.plot(function (x) { return yc - 2 * A * Math.sin(k * (x - x0)) * Math.cos(w * t); }, x0, x1, C.wave, 4);
    for (var i = 0; i <= n; i++) {
      var nx = x0 + i * L / n;
      D.circle(nx, yc, 6, C.ink, null);
      D.label("N", nx, yc + 2 * A + 22, C.orange, "center", "middle", 13, "700");
    }
    for (var j = 0; j < n; j++) D.label("A", x0 + (j + 0.5) * L / n, yc - 2 * A - 18, C.teal, "center", "middle", 13, "700");
    if (n >= 1) D.hspan(x0, x0 + L / n, yc + 2 * A + 52, "one loop = λ/2");
    var ly = H - 30;
    if (state.parts) {
      D.line(30, ly, 60, ly, C.wave2, 2, [7, 5]); D.label("wave going right", 66, ly, C.note, "left", "middle", 12);
      D.line(200, ly, 230, ly, C.wave3, 2, [2, 4]); D.label("reflected wave going left", 236, ly, C.note, "left", "middle", 12);
    }
    D.line(420, ly, 450, ly, C.wave, 4); D.label("their sum: what the string does", 456, ly, C.note, "left", "middle", 12);
  }

  function drawSono(W, H) {
    var ctx = App.ctx;
    var narrow = W < 600;
    var x0 = narrow ? 50 : 90, scale = (W - x0 - (narrow ? 110 : 160)) / 1.0, x1 = x0 + state.l * scale;
    var y = Math.max(120, H * 0.34), A = 34;
    var pulX = W - (narrow ? 40 : 80);
    geo = { x0: x0, x1: x1, y: y };
    // the box
    D.rect(40, y + 30, W - 140, 46, "#f3e5d4", C.woodDark, 1.5);
    D.label("hollow sonometer box", 52, y + 53, C.woodDark, "left", "middle", 11);
    [x0, x1].forEach(function (bx, i) {
      ctx.beginPath();
      ctx.moveTo(bx - 10, y + 30); ctx.lineTo(bx, y); ctx.lineTo(bx + 10, y + 30); ctx.closePath();
      ctx.fillStyle = C.woodDark; ctx.fill();
      if (!narrow) D.label(i ? "movable bridge" : "bridge", bx, y + 90, C.note, "center", "middle", 11);
    });
    var lw = 1 + state.r * 5;
    D.line(48, y, x0, y, C.metalDark, lw);
    D.line(x1, y, pulX, y, C.metalDark, lw);
    D.circle(pulX, y + 14, 14, C.accentFill, C.accent, 2);
    var hy = y + 120 + state.M * 6;
    D.line(pulX + 14, y + 14, pulX + 14, hy, C.metalDark, lw);
    var wsz = 20 + state.M * 3;
    D.rect(pulX + 14 - wsz / 2, hy, wsz, wsz, C.metalDark, C.ink, 1.5);
    D.label("M = " + fmt(state.M) + " kg", pulX + 14, hy + wsz + 14, C.mark, "center", "middle", 12);

    // the vibrating part
    D.plot(function (x) { return y - A * shapeAt((x - x0) / (x1 - x0)); }, x0, x1, C.metalDark, lw + 0.6, false, 220);
    if (state.touch) {
      var mx = (x0 + x1) / 2;
      D.roundRect(mx - 7, y - 30, 14, 24, 7, "#f2c6a0", C.woodDark, 1.2);
      D.label("finger", mx, y - 40, C.note, "center", "middle", 11);
    }
    if (state.pluckP != null && !state.drive && state.pluckT < 0.6) {
      D.arrow(x0 + state.pluckP * (x1 - x0), y - 60, x0 + state.pluckP * (x1 - x0), y - 14, C.orange, 2);
    }

    // the fork, standing on the box beside the first bridge
    if (state.drive) {
      var fa = 3 * Math.cos(2 * Math.PI * 6 * state.t);
      D.fork(x0 - 30, y + 30, 70, fa, C.metalDark, App.hz(state.F));
    }

    // the rider
    var rx = x0 + state.rider * (x1 - x0);
    var ry = y - A * shapeAt(state.rider);
    if (state.riderOff && state.riderFly) {
      var tt = state.riderFly.t;
      rx += 60 * tt;
      ry = y - 4 - 220 * tt + 300 * tt * tt;
    } else if (state.drive) {
      ry -= Math.abs(riderLocal()) * 6 * Math.abs(Math.sin(2 * Math.PI * 1.6 * state.t));
    }
    if (ry < H + 20) {
      ctx.beginPath();
      ctx.moveTo(rx - 9, ry); ctx.lineTo(rx, ry - 14); ctx.lineTo(rx + 9, ry);
      ctx.strokeStyle = C.red; ctx.lineWidth = 2.4; ctx.lineJoin = "round"; ctx.stroke();
    }
    geo.rider = { x: x0 + state.rider * (x1 - x0), y: y - 8 };
    D.hspan(x0, x1, y + 110, "l = " + fmt(state.l * 100, 0) + " cm");

    // mode strengths
    var gy = Math.max(y + 170, H * 0.6), gh = H - gy - 46, bw = Math.min(54, (W - 70) / NMODES - 12);
    if (gh > 40) {
      D.label(state.drive ? "How strongly each mode is driven by the fork" : "Modes present in the vibration", 50, gy - 12, C.mark, "left", "middle", 13);
      var F1 = f1();
      for (var n = 1; n <= NMODES; n++) {
        var v = state.drive ? driven(n) * state.driveAmp : state.amps.length ? Math.abs(state.amps[n - 1]) * decay(n) : 0;
        var bx = 50 + (n - 1) * (bw + 12);
        D.meter(bx, gy, bw, gh, v, "", n === 1 ? C.accent : C.teal);
        D.label(bw < 44 ? String(n) : n + (n === 1 ? " loop" : " loops"), bx + bw / 2, gy + gh + 13, C.note, "center", "middle", 11);
        if (bw >= 44) D.label(App.hz(n * F1), bx + bw / 2, gy + gh + 28, C.mark, "center", "middle", 11);
      }
    }
    if (!state.amps.length && !state.drive) D.label(narrow ? "Tap the wire to pluck it" : "Click the wire between the bridges to pluck it", narrow ? W / 2 : (x0 + x1) / 2, y - 60, C.note, "center", "middle", 13);
    if (state.riderOff) D.badge("Resonance! The rider is thrown off", W - 16, 16, "#dcfce7", C.green, "right");
    else D.badge("Wire drawn slowed down", W - 16, 16, null, null, "right");
  }

  function onRider(x, y) {
    return geo.rider && !state.riderOff && Math.abs(x - geo.rider.x) < 14 && Math.abs(y - geo.rider.y) < 18;
  }

  var dragging = false;

  App.register({
    id: "sonometer",
    title: "String & sonometer",
    sub: "Standing waves, modes of a string, and the paper rider",
    build: build,
    step: step,
    draw: function (W, H) { if (state.mode === "waves") drawWaves(W, H); else drawSono(W, H); },
    pointer: function (kind, x, y) {
      if (state.mode !== "sono") return false;
      if (kind === "down") {
        if (onRider(x, y)) { dragging = true; return true; }
        if (x > geo.x0 + 4 && x < geo.x1 - 4 && Math.abs(y - geo.y) < 30) {
          pluck((x - geo.x0) / (geo.x1 - geo.x0));
          return false;
        }
        return false;
      }
      if (kind === "move" && dragging) {
        state.rider = App.clamp((x - geo.x0) / (geo.x1 - geo.x0), 0.03, 0.97);
      }
      if (kind === "up") dragging = false;
    },
    cursor: function (x, y) {
      if (state.mode !== "sono") return "default";
      if (dragging) return "grabbing";
      if (onRider(x, y)) return "grab";
      if (x > geo.x0 && x < geo.x1 && Math.abs(y - geo.y) < 30) return "pointer";
      return "default";
    },
    sound: function () {
      if (state.mode !== "sono") return [];
      var F1 = f1(), out = [];
      if (state.drive) {
        out.push({ f: state.F, a: 0.15 });
        for (var n = 1; n <= 4; n++) out.push({ f: n * F1, a: 0.6 * driven(n) * state.driveAmp });
        return out;
      }
      if (!state.amps.length) return [];
      for (var k = 1; k <= 6; k++) out.push({ f: k * F1, a: 0.55 * Math.abs(state.amps[k - 1]) * decay(k) });
      return out;
    }
  });
})();
