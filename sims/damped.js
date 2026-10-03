/*
 * Damped vibrations (text 7.7). A simple pendulum swings in a medium that
 * pushes back with a force proportional to its velocity:
 *
 *     θ'' = −(g/l) sin θ − b θ'
 *
 * b grows with the viscosity of the medium and with the size of what has
 * to be pushed through it (a cardboard sheet on the bob pushes far more
 * medium than a small sphere). Everything on screen — the trace, the
 * energy bars, the count of vibrations, the falling amplitude — comes out
 * of integrating that one equation. In vacuum b = 0 and the same code
 * gives natural vibrations of constant amplitude.
 *
 * Out of syllabus and left out on purpose: buoyancy, which would also
 * slow a pendulum in water a little.
 */
(function () {
  "use strict";

  var C = App.COLOR, D = App.d, UI = App.ui, fmt = App.fmt;

  var MEDIA = {
    vacuum: { b: 0, name: "Vacuum", fill: null },
    air: { b: 0.08, name: "Air", fill: null },
    water: { b: 0.7, name: "Water", fill: "rgba(56,189,248,0.22)" },
    oil: { b: 2.6, name: "Thick oil", fill: "rgba(217,119,6,0.22)" }
  };
  var BOBS = { sphere: { k: 1, name: "Small sphere" }, card: { k: 4, name: "Sphere + cardboard" } };

  var TH0 = 0.35, WINDOW = 20;

  var state = {
    medium: "air", bob: "sphere", l: 1.0,
    th: TH0, w: 0, t: 0, E0: 0, amp: TH0, half: 0, hist: [], lastW: 0
  };

  function b() { return MEDIA[state.medium].b * BOBS[state.bob].k; }
  function w0() { return Math.sqrt(App.G / state.l); }

  function energy() {
    var g = App.G, l = state.l;
    var pe = g * l * (1 - Math.cos(state.th));
    var ke = 0.5 * l * l * state.w * state.w;
    return { pe: pe, ke: ke, total: pe + ke };
  }

  function release() {
    state.th = TH0; state.w = 0; state.t = 0; state.amp = TH0; state.half = 0;
    state.hist = [{ t: 0, th: TH0 }];
    state.lastW = 0;
    state.E0 = energy().total;
    refresh();
  }

  function step(dt) {
    var g = App.G, l = state.l, bb = b();
    // semi-implicit Euler is plenty at 4 ms steps
    var acc = -(g / l) * Math.sin(state.th) - bb * state.w;
    state.w += acc * dt;
    state.th += state.w * dt;
    state.t += dt;
    // each turning point is half a vibration; its |θ| is the amplitude now
    if (state.lastW !== 0 && (state.w > 0) !== (state.lastW > 0)) {
      state.half += 1;
      state.amp = Math.abs(state.th);
    }
    state.lastW = state.w;
    var h = state.hist;
    if (!h.length || state.t - h[h.length - 1].t > 0.02) h.push({ t: state.t, th: state.th });
    while (h.length && h[0].t < state.t - WINDOW) h.shift();
    if (Math.round(state.t * 10) !== Math.round((state.t - dt) * 10)) live();
  }

  /* ------------------------------------------------------------------
     Panel
     ------------------------------------------------------------------ */

  function build(box) {
    UI.label(box, "Medium around the pendulum");
    UI.modes(box, [
      { key: "vacuum", label: "Vacuum" }, { key: "air", label: "Air" },
      { key: "water", label: "Water" }, { key: "oil", label: "Oil" }
    ], state.medium, function (k) { state.medium = k; release(); }, "cols-4", "Medium");
    UI.label(box, "Bob");
    UI.modes(box, [
      { key: "sphere", label: "Small sphere" }, { key: "card", label: "+ cardboard sheet" }
    ], state.bob, function (k) { state.bob = k; release(); }, "", "Bob");
    UI.slider(box, { label: "Length l", min: 0.25, max: 2, step: 0.05, value: state.l, unit: "m" },
      function (v) { state.l = v; release(); });
    UI.actions(box, [{ label: "Pull aside and release", primary: true, onClick: release }]);
    App.hint("Two forces act: the restoring force and the resistance of the medium. The resistance is proportional to the velocity, so the bob does work against it and its energy turns into heat in the medium. The thicker the medium, or the larger the body, the faster the amplitude falls. Try oil with the cardboard sheet: the bob does not even swing past the middle.");
    release();
  }

  function refresh() {
    var bb = b(), om = w0();
    var under = bb / 2 < om;
    var fd = under ? Math.sqrt(om * om - bb * bb / 4) / (2 * Math.PI) : 0;
    App.work([
      { name: "Medium", value: MEDIA[state.medium].name + (state.bob === "card" ? ", with cardboard" : "") },
      { name: "Resistance b", value: fmt(bb, 2) + " s⁻¹" },
      { name: "Natural frequency f", value: App.hz(om / (2 * Math.PI)) },
      { name: "Frequency of the damped swing", value: bb === 0 ? "same as natural" : under ? App.hz(fd) + " (less)" : "does not vibrate" },
      { name: "Amplitude now", value: "", id: "amp", cls: "key" },
      { name: "Energy left", value: "", id: "left" },
      { name: "Turned into heat", value: "", id: "heat", cls: "energy" },
      { name: "Vibrations completed", value: "", id: "count" },
      { name: "Time", value: "", id: "time" }
    ]);
    live();
  }

  function live() {
    var e = energy();
    var left = state.E0 > 0 ? e.total / state.E0 : 1;
    App.setWork("amp", fmt(state.amp * 180 / Math.PI, 1) + "°  (started at " + fmt(TH0 * 180 / Math.PI, 0) + "°)");
    App.setWork("left", fmt(left * 100, 0) + " %");
    App.setWork("heat", fmt((1 - left) * 100, 0) + " %");
    App.setWork("count", String(Math.floor(state.half / 2)));
    App.setWork("time", fmt(state.t, 1) + " s");
  }

  /* ------------------------------------------------------------------
     Drawing
     ------------------------------------------------------------------ */

  function draw(W, H) {
    var ctx = App.ctx;
    var topH = H * 0.56;
    var cx = Math.min(W * 0.34, W / 2 - 60), top = 46;
    var Lp = (topH - 90) * state.l / 2;
    var med = MEDIA[state.medium];

    // the tank, or the bell jar for vacuum
    var tankX = cx - 150, tankW = 300, tankY = top + 14, tankH = topH - tankY - 6;
    if (med.fill) {
      D.rect(tankX, tankY + 20, tankW, tankH - 20, med.fill, null);
      D.line(tankX, tankY + 20, tankX + tankW, tankY + 20, C.waterEdge, 1.2);
    }
    if (state.medium === "vacuum") {
      ctx.save();
      ctx.setLineDash([6, 5]);
      D.roundRect(tankX, tankY - 10, tankW, tankH + 10, 40, null, C.guide, 1.5);
      ctx.restore();
    }
    D.line(tankX, tankY, tankX, tankY + tankH, C.mark, 2);
    D.line(tankX + tankW, tankY, tankX + tankW, tankY + tankH, C.mark, 2);
    D.line(tankX, tankY + tankH, tankX + tankW, tankY + tankH, C.mark, 2);
    D.label(med.name, tankX + 10, tankY + tankH - 14, C.note, "left", "middle", 12);

    D.ceiling(cx - 60, cx + 60, top);
    var bx = cx + Lp * Math.sin(state.th), by = top + Lp * Math.cos(state.th);
    D.line(cx, top, cx, top + Lp + 20, C.faint, 1, [3, 4]);
    D.line(cx, top, bx, by, C.mark, 1.8);
    if (state.bob === "card") {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(-state.th);
      D.rect(-26, -34, 52, 30, "#e7d3b0", C.woodDark, 1.4);
      ctx.restore();
    }
    D.circle(bx, by, 12, C.accent, C.ink, 2);

    // energy bars
    var e = energy();
    var E0 = state.E0 || 1;
    var ex = Math.max(cx + 190, W * 0.6), ew = 34, eh = topH - 110, ey = 60;
    D.label("Energy", ex + 70, ey - 18, C.mark, "center", "middle", 13);
    var bars = [
      { v: e.ke / E0, t: "KE", c: C.accent },
      { v: e.pe / E0, t: "PE", c: C.teal },
      { v: Math.max(0, 1 - e.total / E0), t: "Heat", c: C.red }
    ];
    bars.forEach(function (br, i) { D.meter(ex + i * (ew + 18), ey, ew, eh, br.v, br.t, br.c); });
    D.label("KE + PE + heat = what the bob started with", ex + 70, ey + eh + 34, C.note, "center", "middle", 11);

    // displacement–time trace
    var gx = 56, gw = W - gx - 30, gy0 = topH + 30, gh = H - gy0 - 34;
    var mid = gy0 + gh / 2, sc = (gh / 2 - 6) / TH0;
    var t0 = Math.max(0, state.t - WINDOW);
    function X(t) { return gx + (t - t0) / WINDOW * gw; }
    D.axes(gx, gy0 + gh, gw, gh, "time →", "displacement", true);
    D.line(gx, mid - TH0 * sc, gx + gw, mid - TH0 * sc, C.faint, 1, [3, 4]);
    D.line(gx, mid + TH0 * sc, gx + gw, mid + TH0 * sc, C.faint, 1, [3, 4]);
    var bb = b();
    if (bb > 0 && bb / 2 < w0()) {
      D.plot(function (x) { var t = t0 + (x - gx) / gw * WINDOW; return mid - TH0 * Math.exp(-bb * t / 2) * sc; }, gx, gx + gw, C.orange, 1.4, [5, 5]);
      D.plot(function (x) { var t = t0 + (x - gx) / gw * WINDOW; return mid + TH0 * Math.exp(-bb * t / 2) * sc; }, gx, gx + gw, C.orange, 1.4, [5, 5]);
    }
    var h = state.hist;
    if (h.length > 1) {
      ctx.beginPath();
      for (var i = 0; i < h.length; i++) {
        var x = X(h[i].t), y = mid - h[i].th * sc;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = C.wave;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
    D.label("+a", gx - 8, mid - TH0 * sc, C.note, "right", "middle", 11);
    D.label("−a", gx - 8, mid + TH0 * sc, C.note, "right", "middle", 11);
    if (bb > 0) D.label("dashed: the shrinking amplitude", gx + gw - 4, gy0 + 4, C.orange, "right", "middle", 11);
  }

  App.register({
    id: "damped",
    title: "Damped vibrations",
    sub: "A resistive medium steals energy, so the amplitude falls",
    build: build,
    step: step,
    draw: draw
  });
})();
