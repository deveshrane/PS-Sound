/*
 * Resonance around us (text 7.10 and Exercise 7(B) Q13).
 *
 * Four scenes, each a driven body with a natural frequency:
 *   bridge   soldiers' steps drive the deck (f = 1.8 Hz). In step, the
 *            pushes add up; out of step their phases wander and mostly
 *            cancel. The deck is integrated as a damped driven oscillator
 *            and gives way past a safe amplitude.
 *   vehicle  the piston's frequency rises with speed; one loosely fixed
 *            part has a natural frequency of 20 Hz and rattles at the speed
 *            that matches it. Tightening it moves its frequency out of range.
 *   radio    the capacitor knob sets the frequency of the tuning circuit;
 *            only the station whose frequency matches comes through.
 *   glass    a singer's note drives a wine glass (f = 880 Hz); held at the
 *            right pitch and loud enough, the vibration grows until it cracks.
 */
(function () {
  "use strict";

  var C = App.COLOR, D = App.d, UI = App.ui, fmt = App.fmt;

  var BRIDGE_F = 1.8, PART_F = 20, GLASS_F = 880;
  var STATIONS = [
    { name: "Station A", f: 558e3, notes: [440, 554] },
    { name: "Station B", f: 819e3, notes: [392, 494] },
    { name: "Station C", f: 1017e3, notes: [523, 659] },
    { name: "Station D", f: 1395e3, notes: [349, 440] }
  ];
  var L_COIL = 250e-6;

  var state = {
    scene: "bridge", t: 0,
    // bridge
    rate: 1.4, inStep: true, x: 0, v: 0, phi: 0, psi: [], collapsed: false,
    // vehicle
    speed: 40, tight: false, rattle: 0, road: 0,
    // radio
    cap: 300,
    // glass
    pitch: 600, loud: 85, singing: false, ga: 0, broken: false, ping: 0
  };
  for (var i = 0; i < 8; i++) state.psi.push(Math.random() * 6.28);

  /* ------------------------------------------------------------------
     Physics per scene
     ------------------------------------------------------------------ */

  function bridgeStep(dt) {
    if (state.collapsed) return;
    var w0 = 2 * Math.PI * BRIDGE_F, b = 0.15, F0 = 3;
    state.phi += 2 * Math.PI * state.rate * dt;
    var F;
    if (state.inStep) F = F0 * Math.cos(state.phi);
    else {
      F = 0;
      for (var k = 0; k < state.psi.length; k++) {
        state.psi[k] += (Math.random() - 0.5) * 6 * dt;
        F += Math.cos(state.phi + state.psi[k]);
      }
      F *= F0 / state.psi.length;
    }
    var a = -w0 * w0 * state.x - b * state.v + F;
    state.v += a * dt;
    state.x += state.v * dt;
    if (bridgeAmp() > 1.25) { state.collapsed = true; refresh(); }
  }
  function bridgeAmp() {
    var w = 2 * Math.PI * BRIDGE_F;
    return Math.sqrt(state.x * state.x + Math.pow(state.v / w, 2));
  }

  function pistonF() { return state.speed / 4; }
  function partF() { return state.tight ? 45 : PART_F; }
  function vehicleStep(dt) {
    var target = state.speed < 2 ? 0 : App.peak(pistonF() - partF(), 1.1);
    state.rattle += (target - state.rattle) * (1 - Math.exp(-dt * 4));
    state.road += state.speed * dt * 4;
  }

  function tunedF() { return 1 / (2 * Math.PI * Math.sqrt(L_COIL * state.cap * 1e-12)); }
  function signal() {
    var best = { s: 0, st: null };
    STATIONS.forEach(function (st) {
      var s = App.peak(tunedF() - st.f, 9e3);
      if (s > best.s) best = { s: s, st: st };
    });
    return best;
  }

  function glassStep(dt) {
    state.ping *= Math.exp(-dt / 0.9);
    if (state.broken) { state.ga = 0; return; }
    var drive = state.singing ? (state.loud / 100) * App.peak(state.pitch - GLASS_F, 6) : 0;
    state.ga += (0.5 * drive - state.ga / 3) * dt;   // builds over a few seconds
    state.ga = Math.max(0, state.ga);
    if (state.ga > 1) { state.broken = true; state.singing = false; if (singBtn) { singBtn.textContent = "Sing"; singBtn.setAttribute("aria-pressed", "false"); } refresh(); }
  }

  /* ------------------------------------------------------------------
     Panel
     ------------------------------------------------------------------ */

  var singBtn = null;

  function build(box) {
    UI.modes(box, [
      { key: "bridge", label: "Bridge" }, { key: "vehicle", label: "Vehicle" },
      { key: "radio", label: "Radio" }, { key: "glass", label: "Glass" }
    ], state.scene, function (k) { state.scene = k; rebuild(slot); }, "sub-modes cols-4", "Scene");
    var slot = UI.el("div");
    box.appendChild(slot);
    rebuild(slot);
  }

  function rebuild(slot) {
    slot.innerHTML = "";
    singBtn = null;
    var s = state.scene;
    if (s === "bridge") {
      UI.slider(slot, { label: "Steps per second", min: 1, max: 2.6, step: 0.05, value: state.rate, unit: "/s" },
        function (v) { state.rate = v; refresh(); });
      UI.modes(slot, [{ key: "in", label: "March in step" }, { key: "break", label: "Break step" }],
        state.inStep ? "in" : "break", function (k) { state.inStep = k === "in"; refresh(); }, "", "Marching");
      UI.actions(slot, [{ label: "Rebuild the bridge", onClick: function () { state.collapsed = false; state.x = 0; state.v = 0; refresh(); } }]);
      App.hint("Marching in step, every soldier pushes the bridge at the same moment: a periodic force at the frequency of the steps. If that equals the natural frequency of the bridge (1.8 Hz here) the bridge resonates and its swing grows until it may collapse. That is why soldiers are asked to break step on a suspension bridge: their pushes then come at random moments and mostly cancel.");
    } else if (s === "vehicle") {
      UI.slider(slot, { label: "Speed of the vehicle", min: 0, max: 120, step: 1, value: state.speed, unit: "km/h" },
        function (v) { state.speed = v; refresh(); });
      UI.actions(slot, [{ label: "Tighten the loose part", toggle: true, onClick: function (b) {
        state.tight = !state.tight; b.setAttribute("aria-pressed", String(state.tight)); refresh(); } }]);
      App.hint("The piston moves to and fro at a frequency that depends on the speed. At one particular speed it equals the natural frequency of some loosely fixed part, which then vibrates violently by resonance and rattles. To stop it, change the speed — or fix the part tightly, which changes its natural frequency.");
    } else if (s === "radio") {
      UI.slider(slot, { label: "Turn the tuning knob (capacitor)", min: 40, max: 500, step: 1, value: state.cap, unit: "pF" },
        function (v) { state.cap = v; refresh(); });
      App.hint("All four stations' waves reach the aerial at once. The tuning circuit vibrates electrically at a frequency set by its capacitor. Turning the knob changes that frequency; when it equals a station's frequency, resonance occurs and only that station's signal is picked up and amplified. The others do not match and are left out.");
    } else {
      UI.slider(slot, { label: "Pitch of the singer's note", min: 300, max: 1500, step: 1, value: state.pitch, unit: "Hz" },
        function (v) { state.pitch = v; refresh(); });
      UI.slider(slot, { label: "Loudness", min: 0, max: 100, step: 1, value: state.loud, unit: "%" },
        function (v) { state.loud = v; refresh(); });
      var bs = UI.actions(slot, [
        { label: "Sing", toggle: true, primary: false, onClick: function (b) {
          if (state.broken) return;
          state.singing = !state.singing; b.setAttribute("aria-pressed", String(state.singing));
          b.textContent = state.singing ? "Stop singing" : "Sing"; refresh(); } },
        { label: "Tap the glass", onClick: function () { if (!state.broken) state.ping = 1; } },
        { label: "New glass", onClick: function () { state.broken = false; state.ga = 0; refresh(); } }
      ]);
      singBtn = bs[0];
      App.hint("Tap the glass to hear its natural frequency. A singer who holds a loud note of exactly that frequency forces the glass to vibrate in resonance: its walls swing more and more until the glass cracks. A note even slightly off barely moves it.");
    }
    refresh();
  }

  function refresh() {
    var s = state.scene;
    if (s === "bridge") {
      App.work([
        { name: "Natural frequency of the bridge", value: App.hz(BRIDGE_F) },
        { name: "Frequency of the steps", value: App.hz(state.rate), cls: "key" },
        { name: "Soldiers", value: state.inStep ? "in step (pushes add up)" : "out of step (pushes cancel)" },
        { name: "Swing of the bridge", value: "", id: "amp" },
        { name: "State", value: "", id: "st" }
      ]);
    } else if (s === "vehicle") {
      App.work([
        { name: "Speed", value: state.speed + " km/h" },
        { name: "Frequency of the piston", value: App.hz(pistonF()), cls: "key" },
        { name: "Natural frequency of the loose part", value: App.hz(partF()) + (state.tight ? " (tightened)" : "") },
        { name: "Rattle", value: "", id: "r" }
      ]);
    } else if (s === "radio") {
      var sg = signal();
      App.work([
        { name: "Capacitor", value: state.cap + " pF" },
        { name: "Frequency of the tuning circuit", value: App.hz(tunedF()), cls: "key" },
        { name: "Nearest station", value: sg.st.name + ", " + App.hz(sg.st.f) },
        { name: "Reception", value: sg.s > 0.6 ? "Clear: resonance" : sg.s > 0.15 ? "Weak, with hiss" : "Only hiss", cls: sg.s > 0.6 ? "key" : "warn" }
      ]);
    } else {
      App.work([
        { name: "Natural frequency of the glass", value: App.hz(GLASS_F) },
        { name: "Singer's note", value: App.hz(state.pitch), cls: "key" },
        { name: "Difference", value: App.hz(Math.abs(state.pitch - GLASS_F)) },
        { name: "Vibration of the glass", value: "", id: "g" },
        { name: "State", value: state.broken ? "Cracked by resonance" : state.singing ? "Singing" : "Quiet", cls: state.broken ? "key" : "" }
      ]);
    }
    live();
  }

  function live() {
    var s = state.scene;
    if (s === "bridge") {
      App.setWork("amp", fmt(Math.min(1, bridgeAmp() / 1.25) * 100, 0) + " % of the safe limit");
      App.setWork("st", state.collapsed ? "COLLAPSED" : bridgeAmp() > 0.6 ? "Dangerous: resonance" : "Safe");
    } else if (s === "vehicle") {
      App.setWork("r", state.rattle > 0.5 ? "Loud rattle: resonance" : state.rattle > 0.15 ? "Slight" : "None");
    } else if (s === "glass") {
      App.setWork("g", fmt(Math.min(1, state.ga) * 100, 0) + " % of breaking");
    }
  }

  /* ------------------------------------------------------------------
     Drawing
     ------------------------------------------------------------------ */

  function soldier(x, y, phase, h) {
    var leg = Math.sin(phase) * 0.45;
    D.circle(x, y - h, h * 0.13, "#334155", null);
    D.line(x, y - h * 0.86, x, y - h * 0.42, "#334155", 3);
    D.line(x, y - h * 0.42, x + Math.sin(leg) * h * 0.42, y, "#334155", 3);
    D.line(x, y - h * 0.42, x - Math.sin(leg) * h * 0.42, y, "#334155", 3);
    D.line(x, y - h * 0.75, x - Math.sin(leg) * h * 0.3, y - h * 0.45, "#334155", 2.5);
    D.line(x - 6, y - h * 1.16, x + 6, y - h * 1.16, "#15803d", 4);
  }

  function drawBridge(W, H) {
    var x0 = 70, x1 = W - 70, deckY = H * 0.5, towerH = 150;
    var amp = state.collapsed ? 0 : App.clamp(state.x * 55, -70, 70);
    // water
    D.rect(0, deckY + 90, W, H - deckY - 90, "rgba(56,189,248,0.18)", null);
    // towers
    [x0, x1].forEach(function (tx) {
      D.rect(tx - 10, deckY - towerH, 20, towerH + 90, "#64748b", null);
    });
    function deck(u) { return deckY + amp * Math.sin(Math.PI * u); }
    var ctx = App.ctx;
    if (!state.collapsed) {
      // cables
      ctx.beginPath();
      for (var i = 0; i <= 60; i++) {
        var u = i / 60, x = x0 + u * (x1 - x0);
        var y = deckY - towerH + (towerH - 20) * 4 * u * (1 - u) + amp * Math.sin(Math.PI * u) * 0.9;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = C.metalDark; ctx.lineWidth = 2.5; ctx.stroke();
      for (var j = 1; j < 12; j++) {
        var uu = j / 12, xx = x0 + uu * (x1 - x0);
        var cy = deckY - towerH + (towerH - 20) * 4 * uu * (1 - uu) + amp * Math.sin(Math.PI * uu) * 0.9;
        D.line(xx, cy, xx, deck(uu), C.guide, 1);
      }
      D.plot(function (x) { return deck((x - x0) / (x1 - x0)); }, x0, x1, C.woodDark, 8, false, 80);
      // soldiers
      for (var k = 0; k < 8; k++) {
        var p = ((state.t * 0.04 + k / 8) % 1);
        var sx = x0 + 20 + p * (x1 - x0 - 40);
        var ph = state.inStep ? state.phi : state.phi + state.psi[k];
        soldier(sx, deck((sx - x0) / (x1 - x0)) - 4, ph, 34);
      }
    } else {
      var mid = (x0 + x1) / 2;
      ctx.beginPath();
      ctx.moveTo(x0, deckY); ctx.lineTo(mid - 30, deckY + 120);
      ctx.moveTo(x1, deckY); ctx.lineTo(mid + 30, deckY + 130);
      ctx.strokeStyle = C.woodDark; ctx.lineWidth = 8; ctx.stroke();
      D.label("The bridge has collapsed!", W / 2, deckY - 110, C.red, "center", "middle", 20, "800");
      D.label("Press “Rebuild the bridge”, then try breaking step.", W / 2, deckY - 80, C.note, "center", "middle", 13);
    }
    D.meter(W - 60, 40, 28, 150, bridgeAmp() / 1.25, "swing", bridgeAmp() > 0.6 ? C.red : C.accent);
    D.badge("Bridge's natural frequency: 1.8 Hz", 16, 14);
  }

  function drawVehicle(W, H) {
    var gy = H * 0.62;
    // road
    D.rect(0, gy, W, 40, "#cbd5e1", null);
    for (var x = -((state.road) % 80); x < W; x += 80) D.rect(x, gy + 18, 40, 4, "#ffffff", null);
    var cx = W / 2, body = 280, bh = 70;
    var shake = state.rattle * 7 * Math.sin(2 * Math.PI * 9 * state.t);
    // body
    D.roundRect(cx - body / 2, gy - 40 - bh, body, bh, 14, C.accent, C.ink, 2);
    D.roundRect(cx - body / 4, gy - 40 - bh - 50, body / 2, 56, 12, C.accent, C.ink, 2);
    D.roundRect(cx - body / 4 + 10, gy - 40 - bh - 42, body / 4 - 14, 38, 6, C.accentFill, null);
    D.roundRect(cx + 4, gy - 40 - bh - 42, body / 4 - 14, 38, 6, C.accentFill, null);
    // loose mudguard over the rear wheel
    var mx = cx - body / 2 + 60;
    var ctx = App.ctx;
    ctx.save();
    ctx.translate(mx, gy - 44);
    ctx.rotate(shake * 0.03);
    ctx.beginPath();
    ctx.arc(0, 4 + shake * 0.5, 36, Math.PI, 0);
    ctx.strokeStyle = state.rattle > 0.5 ? C.red : C.ink; ctx.lineWidth = 6; ctx.stroke();
    ctx.restore();
    if (state.rattle > 0.3) {
      D.label("rattle!", mx - 60, gy - 90, C.red, "center", "middle", 16, "800");
      D.ripples(mx - 30, gy - 60, Math.PI * 1.15, 3, 10, 0.5, C.red, state.rattle);
    }
    // wheels
    [cx - body / 2 + 60, cx + body / 2 - 60].forEach(function (wx) {
      D.circle(wx, gy - 26, 26, "#1e293b", null);
      D.circle(wx, gy - 26, 10, "#94a3b8", null);
      var a = state.road / 26;
      D.line(wx, gy - 26, wx + 22 * Math.cos(a), gy - 26 + 22 * Math.sin(a), "#94a3b8", 3);
    });
    D.label("loosely fixed mudguard (natural frequency " + App.hz(partF()) + ")", mx - 40, gy + 62, C.note, "left", "middle", 12);
    D.label("Piston frequency: " + App.hz(pistonF()), W / 2, 40, C.mark, "center", "middle", 15);
    D.meter(W - 60, 40, 28, 150, state.rattle, "rattle", state.rattle > 0.5 ? C.red : C.accent);
  }

  function drawRadio(W, H) {
    var bx = 60, by = 50, bw = W - 140, bh = Math.min(170, H * 0.3);
    D.roundRect(bx, by, bw, bh, 16, "#7c5a3a", C.ink, 2);
    D.roundRect(bx + 20, by + 20, bw - 140, bh - 40, 8, "#fef9ec", C.ink, 1.5);
    // dial
    var d0 = bx + 40, d1 = bx + bw - 140, dy = by + bh / 2;
    var fmin = 450e3, fmax = 1450e3;
    function X(f) { return d0 + (f - fmin) / (fmax - fmin) * (d1 - d0); }
    for (var f = 500e3; f <= 1400e3; f += 100e3) {
      D.line(X(f), dy + 10, X(f), dy + 24, C.mark, 1.2);
      D.label(String(f / 1e3), X(f), dy + 36, C.note, "center", "middle", 10);
    }
    D.label("kHz", d1 + 18, dy + 36, C.note, "left", "middle", 10);
    STATIONS.forEach(function (st) {
      D.label(st.name.replace("Station ", ""), X(st.f), dy - 22, C.mark, "center", "middle", 12, "700");
      D.line(X(st.f), dy - 12, X(st.f), dy + 8, C.guide, 1, [2, 3]);
    });
    var nx = X(App.clamp(tunedF(), fmin, fmax));
    D.line(nx, by + 26, nx, by + bh - 26, C.red, 3);
    // knob and speaker
    var kx = bx + bw - 60, ky = by + bh / 2;
    D.circle(kx, ky, 30, "#334155", C.ink, 2);
    var ang = (state.cap - 40) / 460 * Math.PI * 1.6 - Math.PI * 0.8 - Math.PI / 2;
    D.line(kx, ky, kx + 24 * Math.cos(ang), ky + 24 * Math.sin(ang), "#f8fafc", 3);
    D.label("tuning knob", kx, ky + 44, "#fef9ec", "center", "middle", 11);
    // response of the tuning circuit vs frequency
    var gx = 70, gw = W - 150, gy = H - 50, gh = Math.max(80, H - by - bh - 130);
    D.axes(gx, gy, gw + 10, gh + 10, "frequency →", "how strongly the circuit responds");
    function GX(f) { return gx + (f - fmin) / (fmax - fmin) * gw; }
    D.plot(function (x) { var f = fmin + (x - gx) / gw * (fmax - fmin); return gy - App.peak(f - tunedF(), 9e3) * gh; }, gx, gx + gw, C.accent, 2.2, false, 500);
    STATIONS.forEach(function (st, i) {
      D.arrow(GX(st.f), gy - gh + 10, GX(st.f), gy - 4, C.orange, 1.6, 8);
      D.label(st.name + " " + App.hz(st.f), GX(st.f), gy - gh + (i % 2 ? -2 : -16), C.orange, "center", "middle", 11);
    });
    var sg = signal();
    D.meter(W - 60, by, 26, bh, sg.s, "signal", sg.s > 0.6 ? C.green : C.accent);
    if (sg.s > 0.6) D.badge("Receiving " + sg.st.name, 16, 14, "#dcfce7", C.green);
    else D.badge("Hiss: no station matches the circuit", 16, 14, "#fef3c7", "#92400e");
  }

  function drawGlass(W, H) {
    var gx = W * 0.62, base = H * 0.72, gh = Math.min(220, H * 0.42);
    var a = state.broken ? 0 : Math.min(1, state.ga) + state.ping * 0.15;
    var wob = a * 9 * Math.sin(2 * Math.PI * 7 * state.t);
    var ctx = App.ctx;
    D.floor(40, W - 40, base + 4);
    if (!state.broken) {
      // stem and foot
      D.line(gx, base, gx, base - gh * 0.42, C.metalDark, 3);
      ctx.beginPath(); ctx.ellipse(gx, base, 46, 8, 0, 0, Math.PI * 2);
      ctx.strokeStyle = C.metalDark; ctx.lineWidth = 2.5; ctx.stroke();
      // bowl, its walls flexing
      var top = base - gh, bw = 62 + wob;
      ctx.beginPath();
      ctx.moveTo(gx - bw, top);
      ctx.bezierCurveTo(gx - bw - 6, top + gh * 0.36, gx - 22, top + gh * 0.56, gx, base - gh * 0.42);
      ctx.bezierCurveTo(gx + 22, top + gh * 0.56, gx + bw + 6, top + gh * 0.36, gx + bw, top);
      ctx.fillStyle = "rgba(224,242,254,0.55)"; ctx.fill();
      ctx.strokeStyle = state.ga > 0.6 ? C.red : C.metalDark; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(gx, top, bw, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (state.ga > 0.75) {
        D.line(gx - 20, top + 20, gx - 8, top + 50, C.red, 1.5);
        D.line(gx - 8, top + 50, gx - 18, top + 70, C.red, 1.5);
      }
    } else {
      for (var s = 0; s < 9; s++) {
        var sx = gx - 90 + s * 22, sy = base - 4 - (s % 3) * 3;
        ctx.beginPath();
        ctx.moveTo(sx, sy); ctx.lineTo(sx + 12, sy - 10 - (s % 2) * 6); ctx.lineTo(sx + 18, sy);
        ctx.closePath(); ctx.fillStyle = "rgba(186,230,253,0.8)"; ctx.fill();
        ctx.strokeStyle = C.metalDark; ctx.lineWidth = 1.2; ctx.stroke();
      }
      D.label("Shattered by resonance!", gx, base - gh * 0.6, C.red, "center", "middle", 20, "800");
    }
    // the singer
    var sx0 = W * 0.2, sy0 = base;
    D.circle(sx0, sy0 - 150, 26, "#f2c6a0", C.ink, 2);
    D.roundRect(sx0 - 30, sy0 - 120, 60, 120, 20, C.teal, C.ink, 2);
    D.circle(sx0 + 14, sy0 - 146, state.singing ? 6 : 2, C.ink, null);
    if (state.singing) D.ripples(sx0 + 30, sy0 - 146, 0, 4, 22, 0.45, C.accent, state.loud / 100);
    D.label("singer: " + App.hz(state.pitch), sx0, sy0 + 24, C.mark, "center", "middle", 12);
    D.label("glass: natural frequency " + App.hz(GLASS_F), gx, base + 24, C.mark, "center", "middle", 12);
    D.meter(W - 60, 40, 28, 150, Math.min(1, state.ga), "vibration", state.ga > 0.6 ? C.red : C.accent);
  }

  App.register({
    id: "everyday",
    title: "Resonance around us",
    sub: "Bridges, rattling vehicles, radios and singing glasses",
    build: build,
    step: function (dt) {
      state.t += dt;
      if (state.scene === "bridge") bridgeStep(dt);
      else if (state.scene === "vehicle") vehicleStep(dt);
      else if (state.scene === "glass") glassStep(dt);
      if (Math.round(state.t * 6) !== Math.round((state.t - dt) * 6)) live();
    },
    draw: function (W, H) {
      if (state.scene === "bridge") drawBridge(W, H);
      else if (state.scene === "vehicle") drawVehicle(W, H);
      else if (state.scene === "radio") drawRadio(W, H);
      else drawGlass(W, H);
    },
    sound: function () {
      var s = state.scene;
      if (s === "vehicle") {
        if (state.speed < 2) return [];
        return [{ f: Math.max(40, pistonF() * 3), a: 0.12, type: "sawtooth" }, { f: partF() * 4, a: 0.9 * state.rattle, type: "square" }];
      }
      if (s === "radio") {
        var sg = signal();
        var note = sg.st.notes[Math.floor(state.t / 0.35) % 2];
        return [{ f: note, a: 0.5 * sg.s }, { noise: true, a: 0.35 * (1 - sg.s) }];
      }
      if (s === "glass") {
        var out = [{ f: GLASS_F, a: 0.5 * state.ping + 0.4 * Math.min(1, state.ga) }];
        if (state.singing) out.push({ f: state.pitch * (1 + 0.004 * Math.sin(2 * Math.PI * 5 * state.t)), a: 0.4 * state.loud / 100 });
        return out;
      }
      return [];
    }
  });
})();
