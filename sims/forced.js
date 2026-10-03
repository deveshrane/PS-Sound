/*
 * Forced vibrations and resonance (text 7.8 and 7.9).
 *
 * A load on a spring hangs from a support that a motor moves up and down
 * at the driving frequency n. The body obeys
 *
 *     x'' = −ω₀² x − b x' + F cos(2πn t)
 *
 * integrated step by step, so the amplitude really does build up, beat,
 * settle, and grow huge when n = f. "Sweep and plot" steps n across the
 * range, lets the body settle at each value (time runs twenty times faster
 * while it does), and plots the amplitude it actually reached: the
 * resonance curve is measured, not drawn from a formula. The formula
 * curve can be shown dashed for comparison.
 *
 * Drawing convention: the ICSE text says resonant vibrations are in phase
 * with the driving force. The amplitude here is the real one; the body is
 * drawn in step with the driver at resonance so the picture matches the
 * book.
 */
(function () {
  "use strict";

  var C = App.COLOR, D = App.d, UI = App.ui, fmt = App.fmt;
  var DAMP = { low: 0.25, medium: 0.8, high: 2.0 };
  var F0 = 2.5, STRIP = 10, FAST = 20;

  var state = {
    f0: 2, n: 1.2, damp: "low",
    x: 0, v: 0, phi: 0, t: 0,
    hist: [], points: [], theory: true,
    sweep: null
  };

  function b() { return DAMP[state.damp]; }
  function w0() { return 2 * Math.PI * state.f0; }
  function steady(n) {
    var w = 2 * Math.PI * n, o = w0();
    return F0 / Math.sqrt(Math.pow(o * o - w * w, 2) + Math.pow(b() * w, 2));
  }
  function ampNow() {
    var w = 2 * Math.PI * state.n;
    return Math.sqrt(state.x * state.x + Math.pow(state.v / w, 2));
  }

  function integrate(dt) {
    var o = w0();
    state.phi += 2 * Math.PI * state.n * dt;
    var a = -o * o * state.x - b() * state.v + F0 * Math.cos(state.phi);
    state.v += a * dt;
    state.x += state.v * dt;
    state.t += dt;
  }

  /* ------------------------------------------------------------------
     Sweep: settle at each frequency, then record the amplitude reached
     ------------------------------------------------------------------ */

  function sweepList() {
    var list = [], f = state.f0;
    for (var n = 0.5; n <= 4.51; n += 0.25) list.push(+n.toFixed(2));
    [-0.3, -0.15, -0.07, -0.03, 0, 0.03, 0.07, 0.15, 0.3].forEach(function (d) {
      var v = +(f + d).toFixed(2);
      if (v > 0.3 && v < 4.5) list.push(v);
    });
    list.sort(function (p, q) { return p - q; });
    return list.filter(function (v, i) { return i === 0 || Math.abs(v - list[i - 1]) > 0.005; });
  }

  function startSweep() {
    state.points = [];
    state.x = 0; state.v = 0;
    state.sweep = { list: sweepList(), i: 0, wait: 0, peak: 0, phase: "settle" };
    setN(state.sweep.list[0]);
    if (sweepBtn) sweepBtn.textContent = "Stop the sweep";
  }

  function stopSweep() {
    state.sweep = null;
    if (sweepBtn) sweepBtn.textContent = "Sweep and plot";
  }

  function sweepStep(dt) {
    var s = state.sweep;
    s.wait += dt;
    var settle = Math.min(40, 10 / b());   // long enough for the start-up wobble to die away
    if (s.phase === "settle" && s.wait > settle) { s.phase = "measure"; s.wait = 0; s.peak = 0; }
    if (s.phase === "measure") {
      s.peak = Math.max(s.peak, Math.abs(state.x));
      if (s.wait > 1 / state.n + 0.05) {
        state.points.push({ n: state.n, a: s.peak });
        s.i += 1;
        if (s.i >= s.list.length) { stopSweep(); refresh(); return; }
        setN(s.list[s.i]);
        s.phase = "settle"; s.wait = 0;
      }
    }
  }

  function step(dt) {
    var k = state.sweep ? FAST : 1;
    for (var i = 0; i < k; i++) {
      integrate(dt);
      if (state.sweep) sweepStep(dt);
    }
    var h = state.hist;
    if (!h.length || state.t - h[h.length - 1].t > 0.015) h.push({ t: state.t, x: state.x });
    while (h.length && h[0].t < state.t - STRIP * k) h.shift();
    if (Math.round(state.t * 8) !== Math.round((state.t - dt * k) * 8)) live();
  }

  /* ------------------------------------------------------------------
     Panel
     ------------------------------------------------------------------ */

  var nSlider = null, sweepBtn = null;

  function setN(v) {
    state.n = v;
    if (nSlider) nSlider.set(+v.toFixed(2));
  }

  function build(box) {
    nSlider = UI.slider(box, { label: "Driving frequency n", min: 0.2, max: 5, step: 0.01, value: state.n, unit: "Hz" },
      function (v) { state.n = v; refresh(); });
    UI.slider(box, { label: "Natural frequency of the body f", min: 1, max: 3, step: 0.1, value: state.f0, unit: "Hz",
      note: "Set by the spring and the load." }, function (v) { state.f0 = v; state.points = []; refresh(); });
    UI.label(box, "Damping (resistance)");
    UI.modes(box, [
      { key: "low", label: "Low" }, { key: "medium", label: "Medium" }, { key: "high", label: "High" }
    ], state.damp, function (k) { state.damp = k; state.points = []; refresh(); }, "cols-3", "Damping");
    var bs = UI.actions(box, [
      { label: "Set n = f", primary: true, onClick: function () { stopSweep(); setN(state.f0); refresh(); } },
      { label: "Sweep and plot", onClick: function () { if (state.sweep) stopSweep(); else startSweep(); } },
      { label: "Clear plot", onClick: function () { stopSweep(); state.points = []; } }
    ]);
    sweepBtn = bs[1];
    UI.actions(box, [{ label: "Show the formula curve", toggle: true, onClick: function (btn) {
      state.theory = !state.theory; btn.setAttribute("aria-pressed", String(state.theory)); } }])[0]
      .setAttribute("aria-pressed", String(state.theory));
    App.hint("The body is forced to vibrate at the driver's frequency n, not its own. When n is far from f the pushes keep fighting the motion and the amplitude stays small. When n = f every push arrives in step and adds energy: the amplitude grows until the energy lost to damping each cycle equals the energy fed in. That is resonance. With less damping the peak is taller and sharper. Watch the trace below the spring: right after you change n you can see the amplitude build up.");
    refresh();
  }

  function status() {
    var r = state.n / state.f0;
    if (Math.abs(state.n - state.f0) <= 0.03) return { t: "Resonance (n = f)", c: "key" };
    if (r > 0.85 && r < 1.15) return { t: "Close to resonance", c: "" };
    return { t: "Forced vibrations, small", c: "warn" };
  }

  function refresh() {
    App.work([
      { name: "Natural frequency f", value: App.hz(state.f0) },
      { name: "Driving frequency n", value: App.hz(state.n), cls: "key" },
      { name: "Body vibrates at", value: App.hz(state.n) + " (the driver's)" },
      { name: "n / f", value: fmt(state.n / state.f0, 2) },
      { name: "Damping", value: { low: "Low", medium: "Medium", high: "High" }[state.damp] },
      { name: "Steady amplitude reached", value: fmt(steady(state.n) * 10, 1) + " cm" },
      { name: "Amplitude now", value: "", id: "now" },
      { name: "State", value: "", id: "state" }
    ]);
    live();
  }

  function live() {
    var s = status();
    App.setWork("now", fmt(ampNow() * 10, 1) + " cm");
    App.setWork("state", state.sweep ? "Sweeping: " + App.hz(state.n) : s.t);
  }

  /* ------------------------------------------------------------------
     Drawing
     ------------------------------------------------------------------ */

  function draw(W, H) {
    var ctx = App.ctx;
    var leftW = Math.min(300, W * 0.36);
    var cx = leftW / 2 + 20;
    var topY = 30, stripH = Math.min(150, H * 0.24);
    var scenH = H - stripH - 50;

    // the motor and crank
    var wx = cx - 70, wy = topY + 34, wr = 22;
    D.circle(wx, wy, wr, C.accentFill, C.accent, 2);
    var px = wx + wr * 0.7 * Math.sin(state.phi), py = wy - wr * 0.7 * Math.cos(state.phi);
    D.dot(wx, wy, C.accent, 3);
    D.dot(px, py, C.ink, 4);
    var PX = 140;   // pixels per unit of x (one unit reads as 10 cm)
    var drive = Math.max(3, PX * F0 / (w0() * w0())) * Math.cos(state.phi);
    var plateY = topY + 70 + drive;
    D.line(px, py, cx, plateY - 8, C.metalDark, 2.5);
    D.label("motor (driver)", wx, wy - wr - 12, C.mark, "center", "middle", 12);
    D.rect(cx - 50, plateY - 8, 100, 10, C.metalDark, null);
    D.line(cx - 60, topY + 52, cx - 60, topY + 92, C.faint, 3);
    D.line(cx + 60, topY + 52, cx + 60, topY + 92, C.faint, 3);

    // the body, drawn in step with the driver at resonance (see header)
    var A = ampNow();
    var w = 2 * Math.PI * state.n, o = w0();
    var delta = Math.atan2(b() * w, o * o - w * w);
    var near = Math.exp(-Math.pow((state.n - state.f0) / (0.12 * state.f0), 2));
    var shown = A * Math.cos(state.phi - delta * (1 - near));
    var restY = topY + 70 + Math.min(200, scenH * 0.5);
    var disp = App.clamp(shown * PX, -Math.min(120, scenH * 0.3), Math.min(120, scenH * 0.3));
    var my = restY + disp;
    D.line(cx - 50, restY + 20, cx + 50, restY + 20, C.faint, 1, [3, 4]);
    D.spring(cx, plateY + 2, my, 10, 15, C.mark, 2);
    D.rect(cx - 26, my, 52, 40, C.accent, C.ink, 2);
    D.label("body", cx, my + 20, "#ffffff", "center", "middle", 12, "700");
    D.label("f = " + App.hz(state.f0), cx + 34, my + 20, C.mark, "left", "middle", 12);
    D.label("n = " + App.hz(state.n), cx + 58, plateY - 3, C.mark, "left", "middle", 12);

    // resonance graph
    var gx = leftW + 80, gw = W - gx - 40, gy = topY + 20, gh = scenH - 70;
    var nMax = 5;
    var aMax = Math.max(steady(state.f0), 0.1) * 1.12;
    state.points.forEach(function (p) { aMax = Math.max(aMax, p.a * 1.08); });
    function X(n) { return gx + n / nMax * gw; }
    function Y(a) { return gy + gh - Math.min(a, aMax) / aMax * gh; }
    D.axes(gx, gy + gh, gw + 10, gh + 10, "", "amplitude");
    D.label("driving frequency n →", gx + gw + 10, gy + gh + 34, C.note, "right", "middle", 11);
    for (var k = 1; k <= 5; k++) {
      D.line(X(k), gy + gh, X(k), gy + gh + 5, C.mark, 1.2);
      D.label(k + " Hz", X(k), gy + gh + 16, C.note, "center", "middle", 11);
    }
    D.line(X(state.f0), gy, X(state.f0), gy + gh, C.faint, 1.2, [4, 4]);
    D.label("n = f", X(state.f0), gy - 8, C.mark, "center", "middle", 12);
    if (state.theory) D.plot(function (x) { return Y(steady((x - gx) / gw * nMax)); }, X(0.2), X(nMax), C.guide, 1.4, [5, 4], 400);
    if (state.points.length > 1) {
      ctx.beginPath();
      state.points.forEach(function (p, i) { if (i === 0) ctx.moveTo(X(p.n), Y(p.a)); else ctx.lineTo(X(p.n), Y(p.a)); });
      ctx.strokeStyle = C.orange; ctx.lineWidth = 2; ctx.stroke();
    }
    state.points.forEach(function (p) { D.circle(X(p.n), Y(p.a), 3.5, C.orange, null); });
    D.circle(X(state.n), Y(A), 7, C.accent, C.ink, 1.5);
    if (state.points.length) D.label("measured", X(state.points[state.points.length - 1].n) + 8, Y(state.points[state.points.length - 1].a) - 10, C.orange, "left", "middle", 11);

    // strip chart of the body's displacement
    var sx = 50, sw = W - 90, sy = H - stripH - 18, sh = stripH;
    var mid = sy + sh / 2;
    var span = STRIP * (state.sweep ? FAST : 1);
    D.axes(sx, sy + sh, sw, sh, "time →", "displacement of the body", true);
    var hh = state.hist, t0 = state.t - span;
    if (hh.length > 1) {
      var amax = Math.max(steady(state.f0), 0.1);
      ctx.beginPath();
      hh.forEach(function (p, i) {
        var x = sx + (p.t - t0) / span * sw, y = mid - App.clamp(p.x / amax, -1, 1) * (sh / 2 - 6);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = C.wave; ctx.lineWidth = 1.8; ctx.stroke();
    }
    var st = status();
    if (state.sweep) D.badge("Sweeping: time running × " + FAST, W - 16, 14, null, null, "right");
    else if (st.c === "key") D.badge("Resonance: n = f", W - 16, 14, "#dcfce7", C.green, "right");
  }

  App.register({
    id: "forced",
    title: "Forced vibrations & resonance",
    sub: "Drive a body at any frequency and watch the amplitude",
    build: build,
    leave: stopSweep,
    step: step,
    draw: draw
  });
})();
