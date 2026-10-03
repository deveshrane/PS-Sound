/*
 * Organ pipes: modes of vibration of an air column (text 7.6 (4)).
 *
 * A closed end is a node (the air there cannot move); an open end is an
 * antinode. Fitting a standing wave to those ends gives
 *     closed at one end:  l = λ/4, 3λ/4, 5λ/4 …   f = v/4l × 1, 3, 5 …
 *     open at both ends:  l = λ/2, λ, 3λ/2 …      f = v/2l × 1, 2, 3 …
 * The particles are moved by the same envelope that sets the N and A
 * marks, and the frequencies are read from the same λ, so the picture
 * and the numbers agree. v = 340 m/s. End correction is out of syllabus.
 */
(function () {
  "use strict";

  var C = App.COLOR, D = App.d, UI = App.ui, fmt = App.fmt;

  var state = { kind: "closed", l: 50, m: 1, t: 0 };

  function harmonic() { return state.kind === "closed" ? 2 * state.m - 1 : state.m; }
  function lambdaCm() { return (state.kind === "closed" ? 4 : 2) * state.l / harmonic(); }
  function freq() { return App.V_SOUND / (lambdaCm() / 100); }

  var setMode = null;

  function build(box) {
    UI.modes(box, [
      { key: "closed", label: "Closed at one end" }, { key: "open", label: "Open at both ends" }
    ], state.kind, function (k) { state.kind = k; refresh(); }, "sub-modes", "Pipe");
    UI.slider(box, { label: "Length of the pipe l", min: 10, max: 150, step: 1, value: state.l, unit: "cm" },
      function (v) { state.l = v; refresh(); });
    UI.label(box, "Mode of vibration");
    setMode = UI.modes(box, [1, 2, 3, 4].map(function (m) { return { key: m, label: ["1st", "2nd", "3rd", "4th"][m - 1] }; }),
      state.m, function (k) { state.m = k; refresh(); }, "cols-4", "Mode");
    UI.note(box, "Blowing harder makes a pipe jump to a higher mode.");
    App.hint("A closed end is always a node and an open end always an antinode. A closed pipe can only hold an odd number of quarter wavelengths, so its frequencies go 1 : 3 : 5. An open pipe holds whole half wavelengths, so its frequencies go 1 : 2 : 3. The frequency ladder at the bottom compares the two for the same length.");
    refresh();
  }

  function refresh() {
    var closed = state.kind === "closed", h = harmonic(), sub = App.sub;
    var f1 = App.V_SOUND / ((closed ? 4 : 2) * state.l / 100);
    var lens = closed ? ["λ/4", "3λ/4", "5λ/4", "7λ/4"] : ["λ/2", "λ", "3λ/2", "2λ"];
    App.work([
      { name: "Speed of sound v", value: App.V_SOUND + " m/s" },
      { name: "Length l", value: state.l + " cm" },
      { name: "Fits as l =", value: lens[state.m - 1], cls: "key" },
      { name: "Wavelength λ", value: fmt(lambdaCm(), 1) + " cm" },
      { name: "Lowest frequency f" + sub("1") + " = " + (closed ? "v/4l" : "v/2l"), value: App.hz(f1) },
      { name: "This mode f = " + (h === 1 ? "" : h) + "f" + sub("1"), value: App.hz(freq()), cls: "key" },
      { name: "Allowed modes", value: closed ? "f₁, 3f₁, 5f₁ … (1 : 3 : 5)" : "f₁, 2f₁, 3f₁ … (1 : 2 : 3)" }
    ]);
  }

  function draw(W, H) {
    var closed = state.kind === "closed";
    var x0 = 90, maxL = 150, scale = (W - 230) / maxL;
    var L = state.l * scale, x1 = x0 + L;
    var yc = H * 0.34, h = Math.min(56, H * 0.09);
    var hm = harmonic();
    var k = closed ? hm * Math.PI / (2 * L) : hm * Math.PI / L;
    var env = closed ? function (x) { return Math.sin(k * (x - x0)); } : function (x) { return Math.cos(k * (x - x0)); };

    D.rect(x0, yc - h, L, 2 * h, C.air, null);
    D.plot(function (x) { return yc - (h - 6) * env(x); }, x0, x1, C.wave, 1.8, false, 200);
    D.plot(function (x) { return yc + (h - 6) * env(x); }, x0, x1, C.wave, 1.8, [6, 4], 200);
    var c = Math.cos(2 * Math.PI * 0.8 * state.t);
    var cols = Math.max(10, Math.round(L / 10)), rows = 7;
    for (var i = 0; i < cols; i++) {
      for (var j = 0; j < rows; j++) {
        var bx = x0 + (i + 0.5) * L / cols, by = yc - h + (j + 0.5) * 2 * h / rows;
        D.dot(bx + Math.min(8, L / cols * 0.6) * env(bx) * c, by, C.orange, 2.4);
      }
    }
    D.line(x0, yc - h, x1, yc - h, C.ink, 3);
    D.line(x0, yc + h, x1, yc + h, C.ink, 3);
    if (closed) D.rect(x0 - 10, yc - h - 4, 10, 2 * h + 8, C.ink, null);
    for (var q = 0; q < 12; q++) {
      var xn = closed ? x0 + q * Math.PI / k : x0 + (q + 0.5) * Math.PI / k;
      var xa = closed ? x0 + (q + 0.5) * Math.PI / k : x0 + q * Math.PI / k;
      if (xn <= x1 + 0.5) D.label("N", xn, yc + h + 18, C.orange, "center", "middle", 13, "700");
      if (xa <= x1 + 0.5) D.label("A", xa, yc - h - 16, C.teal, "center", "middle", 13, "700");
    }
    D.ripples(x1 + 4, yc, 0, 3, 14, 0.7, C.accent, 0.7);
    if (!closed) D.ripples(x0 - 4, yc, Math.PI, 3, 14, 0.7, C.accent, 0.7);
    D.hspan(x0, x1, yc + h + 46, "l = " + state.l + " cm");
    D.badge(closed ? "Closed end = node · open end = antinode" : "Open ends = antinodes", 16, 16);
    D.badge("Particles drawn slowed down", W - 16, 16, null, null, "right");

    // frequency ladder for both pipes of this length
    var fx0 = 120, fx1 = W - 50, gy = Math.max(yc + h + 110, H * 0.66);
    var fc = App.V_SOUND / (4 * state.l / 100), fmax = fc * 8.5;
    function X(f) { return fx0 + f / fmax * (fx1 - fx0); }
    D.label("Frequency ladder for l = " + state.l + " cm", 30, gy - 30, C.mark, "left", "middle", 13);
    [["closed", gy, C.orange], ["open", gy + 50, C.teal]].forEach(function (r) {
      var isC = r[0] === "closed";
      D.label(isC ? "closed pipe" : "open pipe", fx0 - 12, r[1], r[2], "right", "middle", 12);
      D.line(fx0, r[1], fx1, r[1], C.faint, 1.2);
      for (var n = 1; n <= 8; n++) {
        var fn = isC ? (2 * n - 1) * fc : n * 2 * fc;
        if (fn > fmax) break;
        var on = state.kind === r[0] && (isC ? 2 * state.m - 1 : state.m) === (isC ? 2 * n - 1 : n);
        D.circle(X(fn), r[1], on ? 8 : 5, on ? r[2] : "#ffffff", r[2], 2);
        D.label(isC ? (2 * n - 1) + "f₁" : n === 1 ? "2f₁" : (2 * n) + "f₁", X(fn), r[1] - 16, C.note, "center", "middle", 10);
      }
    });
    D.label("f₁ here = " + App.hz(fc) + " (closed pipe's lowest note)", fx0, gy + 84, C.note, "left", "middle", 11);
  }

  App.register({
    id: "pipes",
    title: "Organ pipes",
    sub: "Modes of an air column: closed 1 : 3 : 5, open 1 : 2 : 3",
    build: build,
    step: function (dt) { state.t += dt; },
    draw: draw,
    sound: function () { return [{ f: freq(), a: 0.5 }]; }
  });
})();
