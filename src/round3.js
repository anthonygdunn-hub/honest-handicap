/* ===== round three: sound, 3D kit, driving range (appended to site.js at build) ===== */
/* sound on tap: tiny synthesised effects, muted until someone switches them on */
window.HHsound = (function () {
  'use strict';
  var on = false, ac = null;
  try { on = localStorage.getItem('hh-sound') === '1'; } catch (e) {}
  function ctx() {
    if (!ac) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function noise(a, dur) {
    var b = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var s = a.createBufferSource(); s.buffer = b; return s;
  }
  function env(g, t, peak, att, dec) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(.0001, t + att + dec); }
  function burst(a, t, freq, q, peak, dec, type) {
    var n = noise(a, dec + .05), f = a.createBiquadFilter(), g = a.createGain();
    f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q; env(g, t, peak, .002, dec);
    n.connect(f); f.connect(g); g.connect(a.destination); n.start(t); n.stop(t + dec + .05);
  }
  function tone(a, t, f0, f1, peak, dec, type) {
    var o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dec); env(g, t, peak, .002, dec);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dec + .05);
  }
  var S = {
    strike: function (a, t) { burst(a, t, 3400, .9, .8, .09); tone(a, t, 1500, 520, .25, .07, 'triangle'); },
    iron: function (a, t) { burst(a, t, 2300, 1.2, .7, .07); tone(a, t, 220, 90, .35, .1); },
    putt: function (a, t) { tone(a, t, 1050, 700, .22, .06); burst(a, t, 1800, 3, .15, .03); },
    cup: function (a, t) { [0, .07, .13, .2].forEach(function (d, i) { burst(a, t + d, 2600 - i * 300, 6, .3 - i * .05, .03); }); tone(a, t + .05, 320, 110, .3, .28); },
    lip: function (a, t) { burst(a, t, 2800, 6, .25, .03); tone(a, t, 600, 900, .08, .2, 'triangle'); },
    whoosh: function (a, t) {
      var n = noise(a, .45), f = a.createBiquadFilter(), g = a.createGain(); f.type = 'bandpass'; f.Q.value = 1.4;
      f.frequency.setValueAtTime(350, t); f.frequency.exponentialRampToValueAtTime(2400, t + .3);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.35, t + .22); g.gain.exponentialRampToValueAtTime(.0001, t + .4);
      n.connect(f); f.connect(g); g.connect(a.destination); n.start(t); n.stop(t + .45);
    },
    land: function (a, t) { tone(a, t, 130, 55, .3, .16); burst(a, t, 500, 1, .12, .08, 'lowpass'); }
  };
  var api = {
    get on() { return on; },
    set: function (v) { on = !!v; try { localStorage.setItem('hh-sound', on ? '1' : '0'); } catch (e) {} if (on) ctx(); sync(); },
    play: function (name, delay) { if (!on || !S[name]) return; var a = ctx(); if (a) S[name](a, a.currentTime + .01 + (delay || 0)); }
  };
  function sync() {
    [].forEach.call(document.querySelectorAll('.snd'), function (b) {
      b.setAttribute('aria-pressed', String(on)); b.title = 'Sound effects: ' + (on ? 'on' : 'off');
    });
  }
  [].forEach.call(document.querySelectorAll('.snd'), function (b) {
    b.addEventListener('click', function () { api.set(!on); if (on) api.play('cup'); });
  });
  sync();
  return api;
})();

/* 3D kit: loads three.js (self-hosted) only when a viewer is about to come on screen */
(function () {
  'use strict';
  var els = [].slice.call(document.querySelectorAll('[data-club3d]')); if (!els.length) return;
  // the picker and notes work even before (or without) the 3D
  [].forEach.call(document.querySelectorAll('[data-k3pick]'), function (pick) {
    var sec = pick.closest('section'), view = sec && sec.querySelector('[data-club3d]');
    [].forEach.call(pick.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-kind');
        [].forEach.call(pick.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        [].forEach.call(sec.querySelectorAll('.k3note'), function (n) { n.classList.toggle('on', n.getAttribute('data-for') === k); });
        if (view) { view.setAttribute('data-club3d', k); if (view._api) view._api.show(k); }
        window.HHsound && HHsound.play('putt');
      });
    });
  });
  var gl = false;
  try { var c = document.createElement('canvas'); gl = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) {}
  if (!gl || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('no3d'); }); return; }
  var mod = null;
  function load(el) {
    if (!mod) mod = import(new URL((el.getAttribute('data-base') || '/media/3d/') + 'kit3d.js', location.href).href);
    return mod;
  }
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (x) {
      if (!x.isIntersecting || x.target._k3) return;
      var el = x.target; el._k3 = 1; io.unobserve(el);
      load(el).then(function (m) { el._api = m.mount(el, el.getAttribute('data-club3d'), { scroll: el.hasAttribute('data-scroll') }); })
        .catch(function (err) { console.warn('3D kit unavailable', err); el.classList.add('no3d'); });
    });
  }, { rootMargin: '400px 0px' });
  els.forEach(function (e) { io.observe(e); });
})();

/* driving range: three presses (start, power, strike), perspective ball flight, best carry kept */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  [].slice.call(document.querySelectorAll('[data-range]')).forEach(function (R) {
    var cv = R.querySelector('.rangegame'), ctx = cv.getContext('2d'), msgEl = R.querySelector('.range-msg'), hit = R.querySelector('.range-hit'), bestEl = R.querySelector('[data-best]');
    var CLUBS = { driver: { name: 'Driver', max: 265, apex: 30, roll: 22, snd: 'strike' }, iron: { name: '7-iron', max: 162, apex: 27, roll: 7, snd: 'iron' }, wedge: { name: 'Wedge', max: 98, apex: 30, roll: 2, snd: 'iron' } };
    var TARGETS = [[-12, 60], [10, 100], [-8, 150], [14, 200], [0, 250]];
    var club = 'driver', best = {};
    try { best = JSON.parse(localStorage.getItem('hh-range-best')) || {}; } catch (e) {}
    var W, H, hor, K, Z0 = 6, HC = 1.7, trees = [];
    var state = 'idle', m = 0, power = 0, t0 = 0, tb = 0, shot = null, old = [], raf = 0;
    for (var i = 0; i < 70; i++) trees.push([Math.random(), .5 + Math.random() * .8]);

    function say(t) { msgEl.textContent = t; }
    function showBest() { var b = best[club]; bestEl.textContent = b ? CLUBS[club].name + ', ' + b + ' yds' : 'none yet with the ' + CLUBS[club].name.toLowerCase(); }
    function size() {
      var r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); if (!r.width) return;
      W = r.width; H = r.height; cv.width = Math.round(W * d); cv.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0);
      hor = H * .34; K = (H * .8 - hor) * Z0 / HC; draw();
    }
    function P(x, y, z) { var s = K / (z + Z0), ys = Math.min(1, W / H * .5); return { x: W / 2 + x * s * (W < 600 ? .75 : 1), y: hor + (HC - y * ys) * s, s: s }; }
    function label() { hit.textContent = state === 'power' ? 'Set power' : state === 'back' ? 'Strike!' : 'Swing'; }

    function draw() {
      var g = ctx.createLinearGradient(0, 0, 0, hor); g.addColorStop(0, '#7FB8E0'); g.addColorStop(1, '#DCEEF8');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, hor + 1);
      ctx.fillStyle = '#2D5A37';
      trees.forEach(function (t) { var x = t[0] * W, r = (8 + t[1] * 10) * (W / 900 + .4); ctx.beginPath(); ctx.arc(x, hor - r * .35, r, Math.PI, 0); ctx.fill(); });
      ctx.fillRect(0, hor - 4, W, 5);
      var gg = ctx.createLinearGradient(0, hor, 0, H); gg.addColorStop(0, '#5E9F5F'); gg.addColorStop(1, '#3F8A47');
      ctx.fillStyle = gg; ctx.fillRect(0, hor, W, H - hor);
      for (var x = -90, k = 0; x < 90; x += 9, k++) {
        if (k % 2) continue;
        var a = P(x, 0, 0), b = P(x + 9, 0, 0), c = P(x + 9, 0, 400), d = P(x, 0, 400);
        ctx.fillStyle = '#ffffff12'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill();
      }
      ctx.font = '700 11px Arial, sans-serif'; ctx.textAlign = 'center';
      TARGETS.slice().reverse().forEach(function (t) {
        var c = P(t[0], 0, t[1]), n = P(t[0], 0, t[1] - 7), f = P(t[0], 0, t[1] + 7), rx = 10 * c.s * (W < 600 ? .75 : 1), ry = Math.max(1.5, (n.y - f.y) / 2);
        ctx.fillStyle = '#7CC77F'; ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff70'; ctx.lineWidth = 1; ctx.stroke();
        var ph = Math.max(10, 3.2 * c.s); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, c.s * .06);
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x, c.y - ph); ctx.stroke();
        ctx.fillStyle = '#D21F25'; ctx.beginPath(); ctx.moveTo(c.x, c.y - ph); ctx.lineTo(c.x + ph * .35, c.y - ph * .85); ctx.lineTo(c.x, c.y - ph * .7); ctx.fill();
        var sx = P(t[0] + (t[0] < 0 ? -16 : 16), 0, t[1]);
        ctx.fillStyle = '#ffffffd9'; ctx.fillRect(sx.x - 14, sx.y - 16, 28, 13); ctx.fillStyle = '#004225'; ctx.fillText(t[1], sx.x, sx.y - 6);
      });
      old.forEach(function (o) { var q = P(o.x, 0, o.z); ctx.fillStyle = '#ffffffb0'; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1.4, q.s * .05), 0, Math.PI * 2); ctx.fill(); });
      var m1 = P(-.9, 0, -.6), m2 = P(.9, 0, -.6), m3 = P(.9, 0, 1.2), m4 = P(-.9, 0, 1.2);
      ctx.fillStyle = '#1F5A2E'; ctx.beginPath(); ctx.moveTo(m1.x, m1.y); ctx.lineTo(m2.x, m2.y); ctx.lineTo(m3.x, m3.y); ctx.lineTo(m4.x, m4.y); ctx.fill();
      var bx = 0, by = 0, bz = 0;
      if (shot) {
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
        shot.trail.forEach(function (p, i) { var q = P(p[0], p[1], p[2]); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.stroke();
        bx = shot.x; by = shot.y; bz = shot.z;
        if (shot.landed) {
          var lq = P(shot.lx, 0, shot.lz); ctx.font = '700 13px Arial, sans-serif';
          var txt = shot.carry + ' yds', tw = ctx.measureText(txt).width + 12;
          ctx.fillStyle = '#ffffffe6'; ctx.fillRect(lq.x - tw / 2, lq.y - 30, tw, 18); ctx.fillStyle = '#004225'; ctx.fillText(txt, lq.x, lq.y - 17);
        }
      }
      var sh = P(bx, 0, bz), bp = P(bx, by, bz), br = Math.max(1.6, Math.min(5.5, bp.s * .045));
      ctx.fillStyle = '#00000040'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, br * 1.1, br * .45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bp.x, bp.y - br, br, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#1B1B1B'; ctx.lineWidth = .8; ctx.stroke();
      // swing meter: white to red is power, the green line is the strike spot
      var mx0 = W * .08, mx1 = W * .92, my = H - 26, span = mx1 - mx0, at = function (v) { return mx0 + (v + .2) / 1.35 * span; };
      ctx.fillStyle = '#00000059'; ctx.fillRect(mx0 - 4, my - 4, span + 8, 18);
      var mg = ctx.createLinearGradient(at(0), 0, at(1.15), 0); mg.addColorStop(0, '#ffffff'); mg.addColorStop(.75, '#F2C94C'); mg.addColorStop(.87, '#D21F25');
      ctx.fillStyle = mg; ctx.fillRect(at(0), my, at(1.15) - at(0), 10);
      ctx.fillStyle = '#ffffff55'; ctx.fillRect(mx0, my, at(0) - mx0, 10);
      ctx.fillStyle = '#004225'; ctx.fillRect(at(-.03), my - 6, at(.03) - at(-.03), 22);
      ctx.fillStyle = '#1B1B1B'; ctx.fillRect(at(1) - 1, my - 4, 2, 18);
      if (state === 'back' || shot) { ctx.fillStyle = '#1563A5'; ctx.fillRect(at(power) - 1.5, my - 4, 3, 18); }
      if (state === 'power' || state === 'back') {
        var nx = at(m); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1B1B1B'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(nx, my - 2); ctx.lineTo(nx - 7, my - 13); ctx.lineTo(nx + 7, my - 13); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.textAlign = 'left'; ctx.font = '700 13px Arial, sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText(CLUBS[club].name.toUpperCase(), mx0, my - 12);
    }

    function press() {
      var now = performance.now();
      if (state === 'idle') {
        if (shot && !shot.done) return;
        if (shot) { old.push({ x: shot.lx, z: shot.lz }); if (old.length > 12) old.shift(); }
        shot = null; state = 'power'; t0 = now; m = 0; say('Backswing… press again to set the power'); go();
      } else if (state === 'power') { power = m; state = 'back'; tb = now; say('Coming down… strike on the green line'); }
      else if (state === 'back') strike(m);
      label();
    }
    function strike(at) {
      var c = CLUBS[club], a = Math.max(-1.6, Math.min(1.6, at / .1)), p = Math.min(power, 1.15), duff = at < -.18;
      if (p > 1) a += (Math.random() < .5 ? -1 : 1) * (p - 1) * 6;
      var carry = c.max * Math.pow(Math.min(p, 1), 1.1) * (1 - .16 * Math.min(1, Math.abs(a))) * (p > 1 ? 1 - (p - 1) * 1.2 : 1);
      if (duff) carry *= .25;
      carry = Math.max(4, carry);
      var side = a * carry * .17, apex = c.apex * (.55 + .45 * Math.min(p, 1)) * (duff ? .15 : 1) * .62;
      var roll = c.roll * Math.min(p, 1) * (duff ? .5 : 1);
      shot = { carry: Math.round(carry), side: side, apex: apex, roll: roll, a: a, p: p, duff: duff, T: (1.3 + carry / 190) * (reduce ? .25 : 1), trail: [[0, 0, 0]], x: 0, y: 0, z: 0, landed: false, done: false };
      state = 'flying'; t0 = performance.now(); say('…'); label();
      if (window.HHsound) { HHsound.play('whoosh'); HHsound.play(c.snd, .2); }
      go();
    }
    function finish() {
      var s = shot, off = Math.round(Math.abs(s.lx)), total = Math.round(s.lz), dir = s.lx < 0 ? 'left' : 'right', q;
      if (s.duff) q = 'Duffed it. We\'ve all been there.';
      else if (s.p > 1.02) q = 'Overswung it. Classic.';
      else if (s.p < .5) q = 'Bit of a half swing, that.';
      else if (Math.abs(s.a) < .2 && s.p > .88) q = 'Flushed it. Tell everyone in the bar.';
      else if (s.a > .45) q = 'Big slice. Your playing partners saw that.';
      else if (s.a < -.45) q = 'Hooked it. Shout fore.';
      else q = 'Playable. You\'d take that on the first tee.';
      say(s.carry + ' yds carry, ' + total + ' total' + (off >= 3 ? ', ' + off + ' yds ' + dir : ', dead straight') + '. ' + q);
      if (!s.duff && (!best[club] || s.carry > best[club])) { best[club] = s.carry; try { localStorage.setItem('hh-range-best', JSON.stringify(best)); } catch (e) {} showBest(); }
      s.done = true; state = 'idle'; label();
    }
    function tick(now) {
      raf = 0;
      if (state === 'power') { m = (now - t0) / 1050; if (m >= 1.15) { power = 1.15; m = 1.15; state = 'back'; tb = now; say('Overswung! Strike on the green line'); label(); } }
      else if (state === 'back') { m = power - (now - tb) / 620; if (m <= -.2) strike(-.2); }
      else if (state === 'flying') {
        var s = shot, u = (now - t0) / 1000;
        if (!s.landed) {
          var t = Math.min(1, u / s.T);
          s.z = s.carry * (1 - Math.pow(1 - t, 1.35)); s.x = s.side * Math.pow(t, 1.8); s.y = s.apex * Math.sin(Math.PI * Math.pow(t, 1.25));
          s.trail.push([s.x, s.y, s.z]);
          if (t >= 1) { s.landed = true; s.lx = s.x; s.lz = s.z; s.y = 0; s.tl = now; window.HHsound && HHsound.play('land'); }
        } else {
          var r = Math.min(1, (now - s.tl) / (reduce ? 150 : 900)), e = 1 - Math.pow(1 - r, 2);
          s.z = s.lz + s.roll * e; s.x = s.lx + s.side * .04 * e; s.y = 0;
          if (r >= 1) { s.lx = s.x; s.lz = s.z; finish(); }
        }
      }
      draw();
      if (state !== 'idle') go();
    }
    function go() { if (!raf) raf = requestAnimationFrame(tick); }

    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); cv.focus({ preventScroll: true }); press(); });
    hit.addEventListener('click', press);
    cv.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); } });
    [].forEach.call(R.querySelectorAll('[data-club]'), function (b) {
      b.addEventListener('click', function () {
        if (state !== 'idle') return;
        club = b.getAttribute('data-club');
        [].forEach.call(R.querySelectorAll('[data-club]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        if (shot) { old.push({ x: shot.lx || 0, z: shot.lz || 0 }); shot = null; }
        showBest(); say('Tap the range to start your swing'); draw();
      });
    });
    addEventListener('resize', size);
    showBest(); size();
  });
})();
