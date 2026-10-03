/*
 * Sound: vibrations and resonance. ICSE Class X, Chapter 7, section B.
 *
 * One page, eight simulations. This file is the part they share: the
 * canvas, the drawing helpers, the panel builders, the animation loop and
 * a small audio engine. Each simulation lives in sims/*.js and registers
 * itself with App.register({...}). Only the topic on screen is stepped,
 * drawn and heard.
 *
 * A simulation object may define:
 *   id, title, sub            identity and panel heading
 *   build(box)                fill the panel slot with its controls
 *   enter() / leave()         called when it comes on or goes off screen
 *   step(dt)                  advance the model by dt seconds
 *   draw(W, H)                paint the canvas
 *   sound()                   list of voices {f, a, type} or {noise:true, a}
 *   pointer(kind, x, y)       canvas pointer events ("down", "move", "up")
 *   cursor(x, y)              css cursor to show over the canvas
 */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  var COLOR = {
    ink: "#1e293b",
    mark: "#334155",
    guide: "#94a3b8",
    faint: "#cbd5e1",
    note: "#64748b",
    metal: "#7c8ea4",
    metalDark: "#475569",
    accent: "#0f6f93",
    accentFill: "#e0f2fe",
    wave: "#0f6f93",
    wave2: "#b45309",
    wave3: "#7c3aed",
    teal: "#0f766e",
    orange: "#b45309",
    red: "#b91c1c",
    green: "#15803d",
    wood: "#c08a5a",
    woodDark: "#8a5a35",
    water: "rgba(56,189,248,0.28)",
    waterEdge: "#0284c7",
    air: "rgba(15,111,147,0.06)",
    halo: "rgba(251,252,254,0.92)",
    paper: "#fbfcfe"
  };

  var UI_FONT =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  var reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  var App = window.App = {
    COLOR: COLOR,
    UI_FONT: UI_FONT,
    G: 9.8,
    V_SOUND: 340,
    sims: {},
    order: [],
    cur: null,
    paused: false,
    W: 0,
    H: 0
  };

  /* ------------------------------------------------------------------
     Canvas plumbing
     ------------------------------------------------------------------ */

  var canvas = $("canvas");
  var ctx = canvas.getContext("2d");
  var host = canvas.parentNode;
  App.ctx = ctx;
  App.canvas = canvas;

  function fit() {
    var dpr = window.devicePixelRatio || 1;
    var w = host.clientWidth;
    var h = host.clientHeight;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    App.W = w;
    App.H = h;
  }

  function needsFit() {
    var dpr = window.devicePixelRatio || 1;
    return canvas.width !== Math.round(host.clientWidth * dpr) ||
      canvas.height !== Math.round(host.clientHeight * dpr);
  }

  /* ------------------------------------------------------------------
     Drawing helpers
     ------------------------------------------------------------------ */

  var D = App.d = {};

  D.line = function (x1, y1, x2, y2, color, width, dashed) {
    ctx.beginPath();
    ctx.setLineDash(dashed ? (dashed === true ? [6, 4] : dashed) : []);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1.4;
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // Two strokes meeting at the tip rather than a filled triangle.
  D.arrow = function (x1, y1, x2, y2, color, width, head) {
    D.line(x1, y1, x2, y2, color, width, false);
    head = head || 10;
    var ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x2 - head * Math.cos(ang - Math.PI / 7), y2 - head * Math.sin(ang - Math.PI / 7));
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang + Math.PI / 7), y2 - head * Math.sin(ang + Math.PI / 7));
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  };

  D.label = function (text, x, y, color, align, baseline, size, weight) {
    ctx.font = (weight || "600") + " " + (size || 13) + "px " + UI_FONT;
    ctx.textAlign = align || "center";
    ctx.textBaseline = baseline || "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = COLOR.halo;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color || COLOR.ink;
    ctx.fillText(text, x, y);
  };

  D.textWidth = function (text, size, weight) {
    ctx.font = (weight || "600") + " " + (size || 13) + "px " + UI_FONT;
    return ctx.measureText(text).width;
  };

  D.dot = function (x, y, color, r) {
    ctx.beginPath();
    ctx.arc(x, y, r || 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };

  D.circle = function (x, y, r, fill, stroke, lw) {
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.4; ctx.stroke(); }
  };

  D.roundRect = function (x, y, w, h, r, fill, stroke, lw) {
    ctx.beginPath();
    ctx.setLineDash([]);
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.4; ctx.stroke(); }
  };

  D.rect = function (x, y, w, h, fill, stroke, lw) { D.roundRect(x, y, w, h, 0, fill, stroke, lw); };

  // Stroke y = fn(x) from x0 to x1.
  D.plot = function (fn, x0, x1, color, width, dashed, n) {
    n = n || Math.max(40, Math.round(Math.abs(x1 - x0) / 2));
    ctx.beginPath();
    ctx.setLineDash(dashed ? (dashed === true ? [6, 4] : dashed) : []);
    for (var i = 0; i <= n; i++) {
      var x = x0 + (x1 - x0) * i / n;
      var y = fn(x);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // A hatched support: a thick line with short strokes above it.
  D.ceiling = function (x1, x2, y) {
    D.line(x1, y, x2, y, COLOR.mark, 3);
    for (var x = x1 + 6; x < x2; x += 11) D.line(x, y, x - 8, y - 9, COLOR.guide, 1.3);
  };

  D.floor = function (x1, x2, y) {
    D.line(x1, y, x2, y, COLOR.mark, 3);
    for (var x = x1 + 2; x < x2; x += 11) D.line(x, y, x + 8, y + 9, COLOR.guide, 1.3);
  };

  // A coil spring from (x, y1) down to (x, y2).
  D.spring = function (x, y1, y2, coils, half, color, width) {
    var lead = Math.min(10, Math.abs(y2 - y1) * 0.1);
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y1 + lead);
    var n = coils * 2;
    for (var i = 0; i < n; i++) {
      var y = y1 + lead + (y2 - y1 - 2 * lead) * (i + 0.5) / n;
      ctx.lineTo(x + (i % 2 ? -half : half), y);
    }
    ctx.lineTo(x, y2 - lead);
    ctx.lineTo(x, y2);
    ctx.strokeStyle = color || COLOR.mark;
    ctx.lineWidth = width || 2;
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  // A tuning fork standing upright with its stem at (x, y). amp is the
  // outward bow of the prongs in pixels, for drawing it vibrating.
  D.fork = function (x, y, h, amp, color, label) {
    var w = h * 0.36, stem = h * 0.34, prong = h - stem;
    var top = y - h, bend = y - stem;
    color = color || COLOR.metalDark;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(4, h * 0.075);
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - amp, top);
    ctx.lineTo(x - w / 2, bend - w * 0.4);
    ctx.quadraticCurveTo(x - w / 2, bend, x, bend);
    ctx.quadraticCurveTo(x + w / 2, bend, x + w / 2, bend - w * 0.4);
    ctx.lineTo(x + w / 2 + amp, top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, bend);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
    if (label) D.label(label, x, top - 12, COLOR.mark, "center", "middle", 12);
    return { top: top, w: w, prong: prong };
  };

  // Curved sound "ripples" spreading from (x, y) in direction dir (radians).
  D.ripples = function (x, y, dir, count, gap, size, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    for (var i = 0; i < count; i++) {
      var r = gap * (i + 1);
      ctx.beginPath();
      ctx.arc(x, y, r, dir - size, dir + size);
      ctx.strokeStyle = color || COLOR.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  };

  // A small pill, used for "slowed down" badges and status chips.
  D.badge = function (text, x, y, fill, color, align) {
    var w = D.textWidth(text, 12, "700") + 16;
    var bx = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    D.roundRect(bx, y, w, 22, 11, fill || COLOR.accentFill, null);
    D.label(text, bx + w / 2, y + 11.5, color || COLOR.accent, "center", "middle", 12, "700");
    return w;
  };

  // A dimension line with the label set beside it.
  D.hspan = function (x1, x2, y, text, color) {
    color = color || COLOR.note;
    D.line(x1, y, x2, y, color, 1.2);
    D.line(x1, y - 5, x1, y + 5, color, 1.2);
    D.line(x2, y - 5, x2, y + 5, color, 1.2);
    if (text) D.label(text, (x1 + x2) / 2, y + 14, color, "center", "middle", 12);
  };

  D.vspan = function (x, y1, y2, text, color, side) {
    color = color || COLOR.note;
    D.line(x, y1, x, y2, color, 1.2);
    D.line(x - 5, y1, x + 5, y1, color, 1.2);
    D.line(x - 5, y2, x + 5, y2, color, 1.2);
    if (text) {
      if (side === "left") D.label(text, x - 9, (y1 + y2) / 2, color, "right", "middle", 12);
      else D.label(text, x + 9, (y1 + y2) / 2, color, "left", "middle", 12);
    }
  };

  // Axes with arrowheads. (x, y) is the origin; w and h the lengths.
  // mid = true puts the time axis through the middle of the height.
  D.axes = function (x, y, w, h, xLabel, yLabel, mid) {
    var y0 = mid ? y - h / 2 : y;
    D.arrow(x, y0, x + w, y0, COLOR.mark, 1.4, 8);
    D.arrow(x, y, x, y - h, COLOR.mark, 1.4, 8);
    if (mid) D.line(x, y, x, y0, COLOR.mark, 1.4);
    if (xLabel) D.label(xLabel, x + w, y0 + 14, COLOR.note, "right", "middle", 11);
    if (yLabel) D.label(yLabel, x + 6, y - h + 2, COLOR.note, "left", "middle", 11);
  };

  // A meter bar filled to fraction v (0..1).
  D.meter = function (x, y, w, h, v, title, color) {
    D.roundRect(x, y, w, h, 4, "#eef2f7", COLOR.faint, 1);
    var hh = Math.max(0, Math.min(1, v)) * (h - 4);
    D.roundRect(x + 2, y + h - 2 - hh, w - 4, hh, 3, color || COLOR.accent, null);
    if (title) D.label(title, x + w / 2, y + h + 14, COLOR.note, "center", "middle", 11);
  };

  /* ------------------------------------------------------------------
     Small utilities
     ------------------------------------------------------------------ */

  App.fmt = function (x, dp) {
    if (!isFinite(x)) return "—";
    if (dp == null) dp = Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? 1 : 2;
    var s = x.toFixed(dp);
    if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
    return s === "-0" ? "0" : s;
  };

  // Frequencies read best with their unit chosen to fit.
  App.hz = function (f) {
    if (!isFinite(f)) return "—";
    if (f >= 1e6) return App.fmt(f / 1e6, 3) + " MHz";
    if (f >= 1e4) return App.fmt(f / 1e3, 1) + " kHz";
    return App.fmt(f, f >= 100 ? 0 : f >= 10 ? 1 : 2) + " Hz";
  };

  App.clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };

  // A resonance peak, 1 at x = 0, falling off over a half-width w.
  App.peak = function (x, w) { return 1 / (1 + (x / w) * (x / w)); };

  App.reduced = function () { return !!(reduceMotion && reduceMotion.matches); };

  /* ------------------------------------------------------------------
     Panel builders
     ------------------------------------------------------------------ */

  var uid = 0;
  function nextId(p) { uid += 1; return (p || "c") + uid; }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  var UI = App.ui = { el: el };

  // A row of segmented buttons. options: [{key, label}]. Returns a setter.
  UI.modes = function (box, options, value, onChange, cls, ariaLabel) {
    var wrap = el("div", "modes " + (cls || ""));
    wrap.setAttribute("role", "group");
    if (ariaLabel) wrap.setAttribute("aria-label", ariaLabel);
    var buttons = options.map(function (o) {
      var b = el("button", null, o.label);
      b.type = "button";
      b.setAttribute("aria-pressed", String(o.key === value));
      b.addEventListener("click", function () { set(o.key); onChange(o.key); });
      wrap.appendChild(b);
      return b;
    });
    function set(k) {
      options.forEach(function (o, i) { buttons[i].setAttribute("aria-pressed", String(o.key === k)); });
    }
    box.appendChild(wrap);
    return set;
  };

  // A slider with its number box, two views of one number.
  // opts: {label, min, max, step, value, unit, note, dp}
  UI.slider = function (box, opts, apply) {
    var id = nextId("s");
    var c = el("div", "control");
    var row = el("div", "row");
    var lab = el("label", null, opts.label);
    lab.htmlFor = id;
    var num = el("input");
    num.type = "number";
    num.min = opts.min; num.max = opts.max; num.step = opts.step; num.value = opts.value;
    num.setAttribute("aria-label", opts.label.replace(/<[^>]+>/g, ""));
    var unit = el("span", "unit", opts.unit || "");
    row.appendChild(lab); row.appendChild(num); row.appendChild(unit);
    var sl = el("input");
    sl.type = "range"; sl.id = id;
    sl.min = opts.min; sl.max = opts.max; sl.step = opts.step; sl.value = opts.value;
    c.appendChild(row); c.appendChild(sl);
    var note = null;
    if (opts.note) { note = el("p", "note", opts.note); c.appendChild(note); }
    box.appendChild(c);
    var lo = parseFloat(opts.min), hi = parseFloat(opts.max);
    function set(v, from) {
      if (isNaN(v)) return;
      v = Math.min(hi, Math.max(lo, v));
      if (from !== "slider") sl.value = v;
      if (from !== "box") num.value = v;
      apply(v);
    }
    sl.addEventListener("input", function () { set(parseFloat(sl.value), "slider"); });
    num.addEventListener("input", function () { set(parseFloat(num.value), "box"); });
    num.addEventListener("blur", function () { set(parseFloat(num.value), null); });
    return { set: function (v) { set(v, null); }, el: c, note: note, slider: sl };
  };

  // Action buttons. specs: [{label, primary, onClick, toggle}]. Returns the buttons.
  UI.actions = function (box, specs) {
    var wrap = el("div", "actions " + (specs.length === 3 ? "three" : specs.length === 2 ? "two" : ""));
    if (specs.length === 1) wrap.style.gridTemplateColumns = "1fr";
    var out = specs.map(function (s) {
      var b = el("button", s.primary ? "primary" : "", s.label);
      b.type = "button";
      if (s.toggle) b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () { s.onClick(b); });
      wrap.appendChild(b);
      return b;
    });
    box.appendChild(wrap);
    return out;
  };

  UI.select = function (box, label, options, value, onChange) {
    var id = nextId("sel");
    var c = el("div", "control");
    var lab = el("label", null, label);
    lab.htmlFor = id;
    lab.style.marginBottom = "6px";
    var s = el("select");
    s.id = id;
    options.forEach(function (o) {
      var op = el("option", null, o.label);
      op.value = o.key;
      if (o.key === value) op.selected = true;
      s.appendChild(op);
    });
    s.addEventListener("change", function () { onChange(s.value); });
    c.appendChild(lab); c.appendChild(s);
    box.appendChild(c);
    return s;
  };

  UI.note = function (box, html) {
    var p = el("p", "note", html);
    p.style.margin = "-8px 0 16px";
    box.appendChild(p);
    return p;
  };

  UI.label = function (box, text) {
    var p = el("p", "section-label", text);
    box.appendChild(p);
    return p;
  };

  /* ------------------------------------------------------------------
     Working panel and hint
     ------------------------------------------------------------------ */

  // rows: [{name, value, cls, id}] ; ids can be updated with App.setWork.
  var workCells = {};
  App.work = function (rows) {
    var html = "";
    workCells = {};
    rows.forEach(function (r) {
      if (!r) return;
      html += '<div class="line ' + (r.cls || "") + '"><span class="name">' + r.name +
        '</span><span class="value"' + (r.id ? ' data-w="' + r.id + '"' : "") + ">" +
        (r.value == null ? "" : r.value) + "</span></div>";
    });
    var w = $("work");
    w.innerHTML = html;
    Array.prototype.forEach.call(w.querySelectorAll("[data-w]"), function (c) {
      workCells[c.getAttribute("data-w")] = c;
    });
  };

  App.setWork = function (id, html) {
    var c = workCells[id];
    if (c && c.innerHTML !== String(html)) c.innerHTML = html;
  };

  App.hint = function (text) { $("hint").innerHTML = text; };

  App.sub = function (s) { return "<sub>" + s + "</sub>"; };

  /* ------------------------------------------------------------------
     Audio
     ------------------------------------------------------------------ */

  var audio = { ctx: null, master: null, voices: [], noise: null, on: false };
  var MAX_VOICES = 8;

  function ensureAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!audio.ctx) {
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.16;
      audio.master.connect(audio.ctx.destination);
      for (var i = 0; i < MAX_VOICES; i++) {
        var o = audio.ctx.createOscillator();
        var g = audio.ctx.createGain();
        g.gain.value = 0;
        o.connect(g);
        g.connect(audio.master);
        o.start();
        audio.voices.push({ o: o, g: g, type: "sine" });
      }
      // White noise, for a radio between stations.
      var len = audio.ctx.sampleRate * 2;
      var buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var j = 0; j < len; j++) data[j] = Math.random() * 2 - 1;
      var src = audio.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      var ng = audio.ctx.createGain();
      ng.gain.value = 0;
      src.connect(ng);
      ng.connect(audio.master);
      src.start();
      audio.noise = ng;
    }
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    return true;
  }

  function updateAudio(list) {
    if (!audio.ctx) return;
    var now = audio.ctx.currentTime;
    var tones = [], noiseA = 0;
    (list || []).forEach(function (v) {
      if (!v) return;
      if (v.noise) noiseA = Math.max(noiseA, v.a || 0);
      else tones.push(v);
    });
    for (var i = 0; i < audio.voices.length; i++) {
      var voice = audio.voices[i], spec = tones[i];
      var a = 0;
      if (audio.on && spec && spec.f >= 20 && spec.f <= 20000) {
        a = App.clamp(spec.a || 0, 0, 1);
        var type = spec.type || "sine";
        if (voice.type !== type) { voice.o.type = type; voice.type = type; }
        voice.o.frequency.setTargetAtTime(spec.f, now, 0.015);
        if (type !== "sine") a *= 0.35;  // harsher waves sound louder
      }
      voice.g.gain.setTargetAtTime(a, now, 0.03);
    }
    audio.noise.gain.setTargetAtTime(audio.on ? App.clamp(noiseA, 0, 1) * 0.5 : 0, now, 0.05);
  }

  App.soundOn = function () { return audio.on; };

  /* ------------------------------------------------------------------
     Registration, switching and the loop
     ------------------------------------------------------------------ */

  App.register = function (sim) {
    App.sims[sim.id] = sim;
    App.order.push(sim.id);
  };

  var topicButtons = Array.prototype.slice.call(document.querySelectorAll("[data-topic]"));

  App.show = function (id) {
    var sim = App.sims[id];
    if (!sim) return;
    if (App.cur && App.cur.leave) App.cur.leave();
    App.cur = sim;
    topicButtons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-topic") === id));
    });
    $("tTitle").textContent = sim.title;
    $("tSub").textContent = sim.sub || "";
    var box = $("controls");
    box.innerHTML = "";
    $("work").innerHTML = "";
    App.hint("");
    if (sim.build) sim.build(box);
    if (sim.enter) sim.enter();
    canvas.style.cursor = "default";
    if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
  };

  topicButtons.forEach(function (b) {
    b.addEventListener("click", function () { App.show(b.getAttribute("data-topic")); });
  });

  var pauseBtn = $("pause");
  function setPaused(p) {
    App.paused = p;
    pauseBtn.textContent = p ? "Play" : "Pause";
    pauseBtn.setAttribute("aria-pressed", String(p));
  }
  pauseBtn.addEventListener("click", function () { setPaused(!App.paused); });

  var soundBtn = $("sound");
  soundBtn.addEventListener("click", function () {
    if (!audio.on && !ensureAudio()) {
      soundBtn.textContent = "No audio here";
      return;
    }
    audio.on = !audio.on;
    soundBtn.textContent = audio.on ? "Sound: on" : "Sound: off";
    soundBtn.setAttribute("aria-pressed", String(audio.on));
    if (!audio.on) updateAudio([]);
  });

  function point(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  canvas.addEventListener("pointerdown", function (e) {
    if (!App.cur || !App.cur.pointer) return;
    var p = point(e);
    if (App.cur.pointer("down", p.x, p.y) !== false) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!App.cur) return;
    var p = point(e);
    if (App.cur.pointer) App.cur.pointer("move", p.x, p.y);
    canvas.style.cursor = App.cur.cursor ? (App.cur.cursor(p.x, p.y) || "default") : "default";
  });
  function up(e) {
    if (!App.cur || !App.cur.pointer) return;
    var p = point(e);
    App.cur.pointer("up", p.x, p.y);
  }
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  var last = 0;
  function frame(now) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (needsFit()) fit();
    var sim = App.cur;
    if (sim) {
      if (!App.paused && sim.step) {
        // Small fixed sub-steps keep the integrators stable.
        var n = Math.max(1, Math.ceil(dt / 0.004));
        for (var i = 0; i < n; i++) sim.step(dt / n);
      }
      ctx.clearRect(0, 0, App.W, App.H);
      ctx.fillStyle = COLOR.paper;
      ctx.fillRect(0, 0, App.W, App.H);
      if (sim.draw) sim.draw(App.W, App.H);
      updateAudio(sim.sound && !App.paused ? sim.sound() : []);
    }
    requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) updateAudio([]);
    last = 0;
  });

  App.start = function () {
    fit();
    window.addEventListener("resize", fit);
    var first = location.hash.slice(1);
    App.show(App.sims[first] ? first : App.order[0]);
    if (App.reduced()) setPaused(true);
    requestAnimationFrame(frame);
  };
})();
