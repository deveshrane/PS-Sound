/*
 * Resonance in an air column (Experiment 3, Fig 7.10, Examples 5 and 6).
 *
 * The water surface closes the bottom of the air column in tube A, so the
 * column is a pipe closed at one end. With a fork of frequency f held
 * over the mouth it resonates when
 *     l = λ/4, 3λ/4, 5λ/4 …,   λ = v / f,   v = 340 m/s
 * so the second loud position is three times the first. Loudness is a
 * sharp peak around each of those lengths. Recording readings and working
 * back from them gives λ = 4l₁ and v = fλ, as a student would in the lab.
 * End correction is out of syllabus and ignored.
 *
 * The test-tube view is the exercise question: tubes of the same height
 * with different water levels, and one fork tried over each.
 */
(function () {
  "use strict";

  var C = App.COLOR, D = App.d, UI = App.ui, fmt = App.fmt;
  var TUBE = 100, WIDTH_CM = 0.9;

  var state = {
    mode: "lab",
    t: 0,
    f: 512, l: 4, aF: 1, readings: [],
    tubes: [12, 14, 16, 18], ft: 4250, over: 3, aT: 1
  };

  function lam() { return App.V_SOUND * 100 / state.f; }
  function lamT() { return App.V_SOUND * 100 / state.ft; }

  function loudAt(l, L, width) {
    var best = 0;
    for (var k = 1; k <= 8; k++) best = Math.max(best, App.peak(l - (2 * k - 1) * L / 4, width));
    return best;
  }
  function loud() { return state.l < 0.3 ? 0 : loudAt(state.l, lam(), WIDTH_CM); }
  function loudTube(i) { var l = 20 - state.tubes[i]; return l < 0.2 ? 0 : loudAt(l, lamT(), 0.18); }

  /* ------------------------------------------------------------------
     Panel
     ------------------------------------------------------------------ */

  var lSlider = null, tableBox = null;

  function build(box) {
    UI.modes(box, [
      { key: "lab", label: "Resonance tube" }, { key: "tubes", label: "Test tubes" }
    ], state.mode, function (k) { state.mode = k; rebuild(slot); }, "sub-modes", "View");
    var slot = UI.el("div");
    box.appendChild(slot);
    rebuild(slot);
  }

  function rebuild(slot) {
    slot.innerHTML = "";
    lSlider = null; tableBox = null;
    if (state.mode === "lab") {
      UI.select(slot, "Tuning fork", [256, 288, 320, 384, 480, 512].map(function (f) { return { key: String(f), label: f + " Hz" }; }),
        String(state.f), function (v) { state.f = +v; state.readings = []; state.aF = 1; refresh(); });
      lSlider = UI.slider(slot, { label: "Length of air column l", min: 0, max: 98, step: 0.1, value: state.l, unit: "cm",
        note: "Or drag vessel B up and down." }, function (v) { state.l = v; refresh(); });
      UI.actions(slot, [
        { label: "Strike the fork", onClick: function () { state.aF = 1; } },
        { label: "Record reading", primary: true, onClick: record },
        { label: "Clear", onClick: function () { state.readings = []; refresh(); } }
      ]);
      UI.label(slot, "Readings");
      tableBox = UI.el("div");
      slot.appendChild(tableBox);
      App.hint("Start with the tube full of water and lower vessel B slowly. The fork forces the air column to vibrate. When the column's natural frequency equals the fork's, it resonates and a loud sound is heard (first at l = λ/4). Keep lowering: the sound dies, then comes back loud when the length is about three times the first (3λ/4). Record both loud positions to find λ and the speed of sound.");
    } else {
      ["A", "B", "C", "D"].forEach(function (n, i) {
        UI.slider(slot, { label: "Water in tube " + n, min: 0, max: 19.5, step: 0.5, value: state.tubes[i], unit: "cm" },
          function (v) { state.tubes[i] = v; refresh(); });
      });
      UI.slider(slot, { label: "Frequency of the fork", min: 1000, max: 9000, step: 10, value: state.ft, unit: "Hz" },
        function (v) { state.ft = v; refresh(); });
      UI.note(slot, "Click a tube to hold the vibrating fork over it.");
      App.hint("Each tube is 20 cm tall, so its air column is 20 cm minus the water. A fork gives a loud sound only over a tube whose air column is λ/4, 3λ/4, 5λ/4 … of its wavelength. If one tube resonates, another resonates too when its air column is three times as long.");
    }
    refresh();
  }

  function record() {
    state.readings.push({ l: state.l, loud: loud() > 0.6 });
    state.readings.sort(function (a, b) { return a.l - b.l; });
    refresh();
  }

  function refresh() {
    if (state.mode === "lab") {
      var rows = [
        { name: "Fork frequency f", value: App.hz(state.f) },
        { name: "Air column now", value: "", id: "l", cls: "key" },
        { name: "Sound", value: "", id: "s" }
      ];
      var louds = state.readings.filter(function (r) { return r.loud; }).map(function (r) { return r.l; });
      if (louds.length) {
        var l1 = louds[0];
        rows.push({ name: "First resonance l" + App.sub("1"), value: fmt(l1, 1) + " cm" });
        rows.push({ name: "λ = 4 l" + App.sub("1"), value: fmt(4 * l1, 1) + " cm" });
        rows.push({ name: "v = f λ", value: fmt(state.f * 4 * l1 / 100, 0) + " m/s", cls: "key" });
        var l2 = louds.filter(function (x) { return x > 1.8 * l1; })[0];
        if (l2) {
          rows.push({ name: "Second resonance l" + App.sub("2"), value: fmt(l2, 1) + " cm" });
          rows.push({ name: "l" + App.sub("2") + " / l" + App.sub("1"), value: fmt(l2 / l1, 2) + "  (≈ 3)", cls: "key" });
          rows.push({ name: "Check: λ = 2(l" + App.sub("2") + " − l" + App.sub("1") + ")", value: fmt(2 * (l2 - l1), 1) + " cm" });
        }
      } else {
        rows.push({ name: "Expected first resonance λ/4", value: "find it by listening!" });
      }
      App.work(rows);
      if (tableBox) {
        var h = '<table class="readings"><thead><tr><th>#</th><th>Air column l</th><th>Sound</th></tr></thead><tbody>';
        if (!state.readings.length) h += '<tr><td colspan="3" class="empty">No readings yet</td></tr>';
        state.readings.forEach(function (r, i) {
          h += "<tr><td>" + (i + 1) + "</td><td>" + fmt(r.l, 1) + " cm</td><td class=\"" + (r.loud ? "loud" : "") + "\">" + (r.loud ? "Loud" : "Faint") + "</td></tr>";
        });
        tableBox.innerHTML = h + "</tbody></table>";
      }
      live();
    } else {
      var LT = lamT(), rowsT = [
        { name: "Fork frequency", value: App.hz(state.ft) },
        { name: "λ/4 for this fork", value: fmt(LT / 4, 2) + " cm", cls: "key" }
      ];
      ["A", "B", "C", "D"].forEach(function (n, i) {
        var l = 20 - state.tubes[i];
        rowsT.push({ name: "Tube " + n + ": air column " + fmt(l, 1) + " cm", value: loudTube(i) > 0.6 ? "Loud" : "Faint", cls: loudTube(i) > 0.6 ? "key" : "" });
      });
      App.work(rowsT);
    }
  }

  function live() {
    if (state.mode !== "lab") return;
    App.setWork("l", fmt(state.l, 1) + " cm");
    var v = loud();
    App.setWork("s", state.aF < 0.08 ? "Strike the fork" : v > 0.6 ? "LOUD: resonance" : v > 0.2 ? "Getting louder…" : "Faint");
  }

  /* ------------------------------------------------------------------
     Drawing
     ------------------------------------------------------------------ */

  var geo = {};

  function drawLab(W, H) {
    var top = 80, sc = (H - top - 70) / TUBE;
    var tx = Math.max(150, W * 0.3), tw = 40;
    var level = top + state.l * sc, bottom = top + TUBE * sc;
    var v = loud() * state.aF;
    // scale
    for (var cm = 0; cm <= TUBE; cm += 5) {
      var y = top + cm * sc;
      D.line(tx - tw / 2 - (cm % 10 ? 8 : 14), y, tx - tw / 2 - 2, y, C.mark, 1.2);
      if (cm % 10 === 0) D.label(String(cm), tx - tw / 2 - 20, y, C.note, "right", "middle", 11);
    }
    D.label("cm", tx - tw / 2 - 20, top - 16, C.note, "right", "middle", 11);
    // tube A
    D.rect(tx - tw / 2, top, tw, state.l * sc, C.air, null);
    D.rect(tx - tw / 2, level, tw, bottom - level, C.water, null);
    D.line(tx - tw / 2, level, tx + tw / 2, level, C.waterEdge, 1.5);
    if (v > 0.15 && state.l > 1) {
      var L = lam();
      [1, -1].forEach(function (sgn) {
        var ctx = App.ctx;
        ctx.save();
        ctx.globalAlpha = Math.min(1, v * 1.2);
        ctx.beginPath();
        for (var i = 0; i <= 80; i++) {
          var yy = top + (level - top) * i / 80;
          var dist = (level - yy) / sc;
          var xx = tx + sgn * (tw / 2 - 4) * Math.sin(2 * Math.PI * dist / L);
          if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.strokeStyle = C.wave; ctx.lineWidth = 2; ctx.setLineDash(sgn < 0 ? [5, 4] : []);
        ctx.stroke(); ctx.restore();
      });
    }
    D.line(tx - tw / 2, top, tx - tw / 2, bottom + 4, C.ink, 3);
    D.line(tx + tw / 2, top, tx + tw / 2, bottom + 4, C.ink, 3);
    D.label("A", tx, bottom + 22, C.mark, "center", "middle", 14, "700");
    // reservoir B, its water surface level with A's
    var rx = Math.min(W - 170, tx + 220), rw = 90, rh = 80;
    var rTop = level - 30;
    D.rect(rx, level, rw, rh - 30, C.water, null);
    D.line(rx, level, rx + rw, level, C.waterEdge, 1.5);
    D.line(rx, rTop, rx, rTop + rh, C.ink, 3);
    D.line(rx + rw, rTop, rx + rw, rTop + rh, C.ink, 3);
    D.line(rx, rTop + rh, rx + rw, rTop + rh, C.ink, 3);
    D.label("B", rx + rw / 2, rTop - 14, C.mark, "center", "middle", 14, "700");
    geo.res = { x: rx, y: rTop, w: rw, h: rh, top: top, sc: sc };
    // rubber tube
    var ctx2 = App.ctx;
    ctx2.beginPath();
    ctx2.moveTo(tx, bottom + 4);
    ctx2.lineTo(tx, bottom + 30);
    ctx2.quadraticCurveTo(tx, bottom + 50, tx + 30, bottom + 50);
    ctx2.lineTo(rx + rw / 2 - 30, bottom + 50);
    ctx2.quadraticCurveTo(rx + rw / 2, bottom + 50, rx + rw / 2, bottom + 30);
    ctx2.lineTo(rx + rw / 2, rTop + rh);
    ctx2.strokeStyle = "#475569"; ctx2.lineWidth = 9; ctx2.stroke();
    ctx2.strokeStyle = C.water; ctx2.lineWidth = 5; ctx2.stroke();
    D.label("rubber tube", (tx + rx) / 2 + 20, bottom + 64, C.note, "center", "middle", 11);
    // stand for B
    D.line(rx + rw + 30, 40, rx + rw + 30, H - 20, C.mark, 4);
    D.line(rx + rw, rTop + 20, rx + rw + 30, rTop + 20, C.mark, 4);
    // the fork, prongs horizontal over the mouth
    var c = Math.sin(2 * Math.PI * 8 * state.t) * 3 * state.aF;
    var fy = top - 26;
    D.line(tx - 90, fy, tx - 44, fy, C.metalDark, 6);
    var ctx3 = App.ctx;
    ctx3.beginPath();
    ctx3.moveTo(tx + 30, fy - 9 - c); ctx3.lineTo(tx - 30, fy - 9);
    ctx3.quadraticCurveTo(tx - 44, fy - 9, tx - 44, fy);
    ctx3.quadraticCurveTo(tx - 44, fy + 9, tx - 30, fy + 9);
    ctx3.lineTo(tx + 30, fy + 9 + c);
    ctx3.strokeStyle = C.metalDark; ctx3.lineWidth = 5; ctx3.lineCap = "round"; ctx3.stroke();
    D.label(App.hz(state.f) + " fork", tx - 98, fy, C.mark, "right", "middle", 12);
    if (v > 0.15) {
      D.ripples(tx + 30, top - 2, -0.5, 3, 18, 0.5, C.accent, Math.min(1, v * 1.3));
      if (v > 0.6) D.label("LOUD!", tx + 110, top + 10, C.red, "left", "middle", 20, "800");
    }
    D.vspan(tx + tw / 2 + 16, top, level, "l = " + fmt(state.l, 1) + " cm", C.accent);
    // loudness meter
    D.meter(W - 70, 60, 34, 200, v, "loudness", v > 0.6 ? C.green : C.accent);
    if (state.aF < 0.08) D.badge("The fork has died away: strike it again", 16, 14, "#fef3c7", "#92400e");
    else D.badge("Drag vessel B up or down", 16, 14);
  }

  function drawTubes(W, H) {
    var n = 4, gap = Math.min(150, (W - 120) / n), x0 = W / 2 - gap * (n - 1) / 2;
    var top = 140, sc = Math.min(16, (H - top - 120) / 20), tw = 46;
    geo.tubes = [];
    for (var i = 0; i < n; i++) {
      var cx = x0 + i * gap, bot = top + 20 * sc;
      var wl = bot - state.tubes[i] * sc;
      D.rect(cx - tw / 2, wl, tw, bot - wl, C.water, null);
      D.line(cx - tw / 2, wl, cx + tw / 2, wl, C.waterEdge, 1.5);
      var ctx = App.ctx;
      ctx.beginPath();
      ctx.moveTo(cx - tw / 2, top);
      ctx.lineTo(cx - tw / 2, bot - tw / 2);
      ctx.arc(cx, bot - tw / 2, tw / 2, Math.PI, 0, true);
      ctx.lineTo(cx + tw / 2, top);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
      D.label("ABCD"[i], cx, bot + 22, C.mark, "center", "middle", 15, "700");
      D.label(fmt(20 - state.tubes[i], 1) + " cm of air", cx, bot + 42, C.note, "center", "middle", 11);
      geo.tubes.push({ x: cx, top: top, bot: bot, w: tw });
      if (state.over === i) {
        var lv = loudTube(i);
        var c = Math.sin(2 * Math.PI * 8 * state.t) * 2.5;
        var ctx2 = App.ctx;
        var fy = top - 30;
        ctx2.beginPath();
        ctx2.moveTo(cx + 26, fy - 8 - c); ctx2.lineTo(cx - 22, fy - 8);
        ctx2.quadraticCurveTo(cx - 34, fy - 8, cx - 34, fy);
        ctx2.quadraticCurveTo(cx - 34, fy + 8, cx - 22, fy + 8);
        ctx2.lineTo(cx + 26, fy + 8 + c);
        ctx2.strokeStyle = C.metalDark; ctx2.lineWidth = 4.5; ctx2.lineCap = "round"; ctx2.stroke();
        D.line(cx - 34, fy, cx - 70, fy, C.metalDark, 5);
        if (lv > 0.5) {
          D.ripples(cx + 24, top - 4, -0.45, 3, 14, 0.5, C.accent, 1);
          D.label("LOUD!", cx, top - 70, C.red, "center", "middle", 18, "800");
        } else D.label("faint", cx, top - 62, C.note, "center", "middle", 13);
      }
    }
    D.label("Fork: " + App.hz(state.ft) + "   ·   λ = " + fmt(lamT(), 2) + " cm   ·   λ/4 = " + fmt(lamT() / 4, 2) + " cm", W / 2, H - 30, C.mark, "center", "middle", 13);
    D.badge("Click a tube to hold the fork over it", 16, 14);
  }

  var dragging = false;

  App.register({
    id: "tube",
    title: "Resonance tube",
    sub: "Experiment 3: find the lengths that resonate with a fork",
    build: build,
    step: function (dt) {
      state.t += dt;
      state.aF *= Math.exp(-dt / 14);
      if (Math.round(state.t * 5) !== Math.round((state.t - dt) * 5)) live();
    },
    draw: function (W, H) { if (state.mode === "lab") drawLab(W, H); else drawTubes(W, H); },
    pointer: function (kind, x, y) {
      if (state.mode === "tubes") {
        if (kind === "down" && geo.tubes) {
          geo.tubes.forEach(function (t, i) {
            if (Math.abs(x - t.x) < t.w && y > t.top - 60 && y < t.bot + 10) state.over = i;
          });
        }
        return false;
      }
      var r = geo.res;
      if (!r) return false;
      if (kind === "down") {
        dragging = x > r.x - 10 && x < r.x + r.w + 10 && y > r.y - 20 && y < r.y + r.h + 10;
        return dragging;
      }
      if (kind === "move" && dragging) {
        var l = App.clamp((y + 30 - r.top) / r.sc, 0, 98);
        state.l = Math.round(l * 10) / 10;
        if (lSlider) lSlider.set(state.l);
      }
      if (kind === "up") dragging = false;
    },
    cursor: function (x, y) {
      if (state.mode === "tubes") return "pointer";
      var r = geo.res;
      if (dragging) return "ns-resize";
      return r && x > r.x - 10 && x < r.x + r.w + 10 && y > r.y - 20 && y < r.y + r.h + 10 ? "ns-resize" : "default";
    },
    sound: function () {
      if (state.mode === "lab") return [{ f: state.f, a: state.aF * (0.08 + 0.75 * loud()) }];
      return [{ f: state.ft, a: 0.08 + 0.6 * loudTube(state.over) }];
    }
  });
})();
