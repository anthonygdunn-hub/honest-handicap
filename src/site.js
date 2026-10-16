/* Honest Handicap: menu, golf animations, and the two forms.
   No libraries. Anyone with "reduce motion" switched on gets still pictures. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FN = 'https://acdpgarasgfhvupzsbxf.supabase.co/functions/v1/';
  var loaded = Date.now();

  /* mobile menu */
  var btn = document.querySelector('.menu-btn'), nav = document.getElementById('mainnav');
  function closeMenu() { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  btn.addEventListener('click', function () { var o = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', String(o)); });
  window.HHcloseMenu = closeMenu;

  /* reveal: pencil circles draw, score bars fill, blocks rise */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .25 }) : null;
  function observe(root) {
    (root || document).querySelectorAll('.rv-up, .verdict, .rcard, .bars').forEach(function (el) {
      if (!io || reduce) { el.classList.add('in'); return; }
      if (!el.classList.contains('in')) io.observe(el);
    });
  }
  window.HHobserve = observe;

  /* the putt line: the ball rolls toward the flag as the page scrolls */
  var ball = document.querySelector('.putt .ball'), head = document.getElementById('top');
  function onScroll() {
    var max = document.documentElement.scrollHeight - innerHeight;
    var p = max > 0 ? Math.min(1, scrollY / max) : 0;
    ball.style.setProperty('--p', (p * (innerWidth - 34)) + 'px');
    head.classList.toggle('stuck', scrollY > 10);
  }
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll);

  /* still pictures for anyone who prefers less motion */
  if (reduce) document.querySelectorAll('svg.anim').forEach(function (s) { if (s.pauseAnimations) { s.setCurrentTime(+s.dataset.still || 0); s.pauseAnimations(); } });

  /* ---- forms ---- */
  function show(msg, text, bad) { msg.textContent = text; msg.classList.add('show'); msg.classList.toggle('bad', !!bad); msg.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); }
  function missing(f) {
    return Array.prototype.filter.call(f.querySelectorAll('[required]'), function (i) {
      if (i.matches(':disabled')) return false;
      return i.type === 'checkbox' ? !i.checked : !String(i.value).trim();
    });
  }
  function busy(f, on, label) {
    var b = f.querySelector('button[type=submit]');
    if (!b) return;
    if (on) { b.dataset.label = b.firstChild.textContent; b.firstChild.textContent = label; b.disabled = true; }
    else { b.firstChild.textContent = b.dataset.label || b.firstChild.textContent; b.disabled = false; }
  }
  function post(name, body) {
    var opts = { method: 'POST', body: body };
    if (!(body instanceof FormData)) { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(body); }
    return fetch(FN + name, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; });
    });
  }
  function mailFallback(f, subject) {
    var lines = [];
    Array.prototype.forEach.call(f.elements, function (el) {
      if (!el.name || el.type === 'submit' || el.type === 'file' || el.name === 'website' || el.name === 'code') return;
      var lab = f.querySelector('label[for="' + el.id + '"]');
      lines.push((lab ? lab.textContent : el.name) + ': ' + (el.type === 'checkbox' ? (el.checked ? 'Yes' : 'No') : el.value));
    });
    return 'mailto:hello@honesthandicap.golf?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
  }

  /* Become a tester */
  var join = document.getElementById('joinform');
  if (join) join.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = join.querySelector('.msg'), bad = missing(join);
    if (bad.length) { show(msg, 'Please fill in the boxes marked as needed, and tick the box at the end.', true); bad[0].focus(); return; }
    var d = {}; Array.prototype.forEach.call(join.elements, function (el) { if (el.name) d[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
    d.ms = Date.now() - loaded;
    busy(join, true, 'Sending...');
    post('hh-join', d).then(function (j) {
      busy(join, false);
      if (j.ok) {
        join.reset();
        join.innerHTML = '<div class="done full"><h2>You\'re on the list</h2><p>' + (j.already
          ? 'You\'re already a tester. Use your tester code to <a href="/submit/">hand in a card</a>.'
          : 'Thanks. Anthony will be in touch with your tester code once he\'s had a look, usually within a few days.') + '</p></div>';
        observe(join);
      } else show(msg, j.error || 'That didn\'t go through. Please try again.', true);
    }).catch(function () {
      busy(join, false);
      show(msg, 'We couldn\'t reach the server. Your email app will open with everything filled in instead.', true);
      location.href = mailFallback(join, 'Become a tester');
    });
  });

  /* Hand in a review card */
  var card = document.getElementById('reviewform');
  if (card) {
    var code = document.getElementById('r-code'), rest = document.getElementById('r-rest'), hi = document.getElementById('r-hi');
    var check = document.getElementById('r-check'), cmsg = document.getElementById('r-codemsg');
    var photos = document.getElementById('r-photos'), thumbs = document.getElementById('r-thumbs');
    var shrunk = [];
    rest.disabled = true;

    function checkCode() {
      if (!code.value.trim()) { show(cmsg, 'Put your tester code in first. It looks like HH-7KQ2-MX9P.', true); code.focus(); return; }
      var fd = new FormData(); fd.append('code', code.value); fd.append('check', '1'); fd.append('website', card.website.value);
      check.disabled = true; check.firstChild.textContent = 'Checking...';
      post('hh-card', fd).then(function (j) {
        check.disabled = false; check.firstChild.textContent = 'Check my code';
        if (j.ok && j.first_name) {
          cmsg.classList.remove('show');
          hi.innerHTML = 'Hi <strong></strong>, the card is yours. Your name and home course go on from your tester record.';
          hi.querySelector('strong').textContent = j.first_name;
          hi.hidden = false; rest.disabled = false; code.readOnly = true; check.hidden = true;
          var hc = document.getElementById('r-hc'); if (hc && !hc.value && j.handicap != null) hc.value = j.handicap;
          document.getElementById('r-prod').focus();
        } else show(cmsg, j.error || 'That code didn\'t work.', true);
      }).catch(function () { check.disabled = false; check.firstChild.textContent = 'Check my code'; show(cmsg, 'We couldn\'t reach the server. Try again in a minute.', true); });
    }
    check.addEventListener('click', checkCode);
    code.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); checkCode(); } });

    /* photos: shrink to 1800px JPEGs in the browser (this also turns iPhone HEIC photos into JPEGs) */
    function shrink(file) {
      return new Promise(function (ok) {
        var url = URL.createObjectURL(file), img = new Image();
        img.onload = function () {
          var s = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
          var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          c.toBlob(function (b) { ok(b ? new File([b], 'photo.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', .85);
        };
        img.onerror = function () { URL.revokeObjectURL(url); ok(file); };
        img.src = url;
      });
    }
    photos.addEventListener('change', function () {
      var list = Array.prototype.slice.call(photos.files, 0, 3);
      if (photos.files.length > 3) show(card.querySelector('#r-rest .msg'), 'Only the first three photos will be sent.', false);
      thumbs.innerHTML = '';
      Promise.all(list.map(shrink)).then(function (out) {
        shrunk = out;
        out.forEach(function (f) { var i = new Image(); i.alt = ''; i.src = URL.createObjectURL(f); thumbs.appendChild(i); });
      });
    });

    card.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = card.querySelector('#r-rest .msg');
      if (rest.disabled) { checkCode(); return; }
      var bad = missing(card);
      if (bad.length) { show(msg, 'Please fill in the boxes marked as needed: all five scores, your verdict and how it played.', true); bad[0].focus(); return; }
      var w = document.getElementById('r-play');
      if (w.value.trim().length < 150) { show(msg, 'Tell us a bit more about how it played: a couple of paragraphs is perfect.', true); w.focus(); return; }
      var fd = new FormData();
      Array.prototype.forEach.call(card.elements, function (el) { if (el.name && el.type !== 'file' && el.type !== 'submit') fd.append(el.name, el.value); });
      shrunk.forEach(function (f, i) { fd.append('photos', f, 'photo' + (i + 1) + '.jpg'); });
      fd.append('ms', String(Date.now() - loaded));
      busy(card, true, shrunk.length ? 'Sending card and photos...' : 'Sending...');
      post('hh-card', fd).then(function (j) {
        busy(card, false);
        if (j.ok) {
          card.innerHTML = '<div class="done full"><h2>Card handed in</h2><p>Thanks' + (j.first_name ? ', ' + j.first_name.replace(/[<>&]/g, '') : '') +
            '. Anthony checks every card before it goes up' + (j.photos ? ', photos and all' : '') + '. You\'ll see it on the site once it\'s live.</p>' +
            '<p><a class="btn btn-line btn-sm" href="/submit/">Hand in another card<span class="gb"></span></a></p></div>';
          observe(card); scrollTo(0, 0);
        } else {
          show(msg, j.error || 'That didn\'t go through. Please try again.', true);
          var f = j.field && document.querySelector('[name="' + j.field + '"]'); if (f) f.focus();
        }
      }).catch(function () { busy(card, false); show(msg, 'We couldn\'t reach the server. Nothing has been lost: try again in a minute.', true); });
    });
  }

  observe(); onScroll();
})();

/* ===== scroll scenes =====
   Each [data-scene] gets a progress from 0 to 1. Pinned scenes (data-pin) measure it across their
   tall section while the inside stays put; on small screens they don't pin and play as they come
   into view. Reduced motion: every scene jumps straight to its finished picture. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pinMQ = matchMedia('(min-width:900px) and (min-height:620px) and (prefers-reduced-motion:no-preference)');
  var root = document.documentElement, head = document.getElementById('top');
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var easeInOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var back = function (t) { var c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  var hh = 76;
  function setHead() { hh = head ? head.offsetHeight : 76; root.style.setProperty('--hh', hh + 'px'); }

  var SCENES = {
    hero: function (el) {
      var svg = el.querySelector('#hole'); if (!svg) return null;
      var path = svg.querySelector('#flight'), L = path.getTotalLength();
      var ball = svg.querySelector('#ball'), shadow = svg.querySelector('#shadow'), club = svg.querySelector('#club');
      var ripple = svg.querySelector('#ripple'), inhole = svg.querySelector('#inhole'), yds = svg.querySelector('#yds');
      var hint = el.querySelector('.scroll-hint');
      var layers = [].slice.call(svg.querySelectorAll('.px')), mx = 0, my = 0, lastP = 0;
      if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
        el.addEventListener('mousemove', function (ev) {
          var r = svg.getBoundingClientRect(); mx = (ev.clientX - r.left) / r.width - .5; my = (ev.clientY - r.top) / r.height - .5; paint();
        });
        el.addEventListener('mouseleave', function () { mx = my = 0; paint(); });
      }
      function paint() {
        layers.forEach(function (g) {
          var d = +g.getAttribute('data-depth');
          g.setAttribute('transform', 'translate(' + (-mx * 26 * d - lastP * 60 * d).toFixed(1) + ' ' + (-my * 14 * d + lastP * 30 * d).toFixed(1) + ')');
        });
      }
      // reveal the dashed flight trail with a mask that grows along the same path
      var NS = 'http://www.w3.org/2000/svg';
      var mask = document.createElementNS(NS, 'mask'); mask.id = 'trailmask'; mask.setAttribute('maskUnits', 'userSpaceOnUse');
      var mp = document.createElementNS(NS, 'path'); mp.setAttribute('d', path.getAttribute('d'));
      mp.setAttribute('fill', 'none'); mp.setAttribute('stroke', '#fff'); mp.setAttribute('stroke-width', '10'); mp.setAttribute('pathLength', '1000');
      mask.appendChild(mp); svg.querySelector('defs').appendChild(mask); path.setAttribute('mask', 'url(#trailmask)');
      var fm = svg.querySelector('#flightmask'); if (fm) fm.remove();
      var FLY = .965; // the last bit of the path is the roll across the green
      return {
        unpinned: function () { var r = svg.getBoundingClientRect(); return clamp((innerHeight - r.bottom) / (innerHeight * .45)); },
        set: function (p) {
          var sw = p < .06 ? 75 * easeOut(seg(p, 0, .06)) : p < .12 ? 75 * (1 - easeInOut(seg(p, .06, .12))) : -95 * easeOut(seg(p, .12, .24));
          club.setAttribute('transform', 'rotate(' + sw.toFixed(1) + ' 72 240)');
          club.style.opacity = 1 - seg(p, .3, .4);
          var s = easeInOut(seg(p, .12, .7)), r = seg(p, .7, .8);
          var at = p < .7 ? s * FLY : FLY + (1 - FLY) * r;
          var pt = path.getPointAtLength(at * L);
          ball.setAttribute('cx', pt.x.toFixed(1)); ball.setAttribute('cy', pt.y.toFixed(1));
          var drop = seg(p, .8, .86);
          ball.setAttribute('r', (7 * (1 - drop * .6)).toFixed(2)); ball.style.opacity = 1 - drop;
          var gy = 338 - (pt.x - 90) * 48 / 380, lift = Math.max(0, gy - pt.y);
          shadow.setAttribute('cx', pt.x.toFixed(1)); shadow.setAttribute('cy', gy.toFixed(1));
          shadow.style.opacity = (.25 * (1 - Math.min(1, lift / 220)) * (1 - drop)).toFixed(3);
          mp.setAttribute('stroke-dasharray', (at * 1000).toFixed(1) + ' 1000');
          path.style.opacity = .85 * (1 - seg(p, .9, 1) * .6);
          var rp = seg(p, .82, .95);
          ripple.setAttribute('rx', (30 * rp).toFixed(1)); ripple.setAttribute('ry', (8 * rp).toFixed(1));
          ripple.style.opacity = rp > 0 ? (1 - rp).toFixed(2) : 0;
          inhole.style.opacity = seg(p, .83, .9);
          if (p >= .84 && lastP < .84 && window.HHsound) HHsound.play('cup');
          if (p >= .13 && lastP < .13 && window.HHsound) HHsound.play('strike');
          yds.textContent = Math.round(168 * s) + ' yds';
          if (hint) hint.style.opacity = 1 - seg(p, 0, .08);
          lastP = p; paint();
        }
      };
    },

    kitbag: function (el) {
      var bag = el.querySelector('.bag-body'), bagSvg = el.querySelector('.bag');
      var tiles = [].slice.call(el.querySelectorAll('.kit a')), off = [];
      function measure() {
        tiles.forEach(function (t) { t.style.transform = ''; });
        if (!bagSvg) return;
        var b = bagSvg.getBoundingClientRect(), bx = b.left + b.width * .45, by = b.top + b.height * .25;
        off = tiles.map(function (t) { var r = t.getBoundingClientRect(); return [bx - (r.left + r.width / 2), by - (r.top + r.height / 2)]; });
      }
      return {
        measure: measure,
        set: function (p) {
          if (bag) bag.style.transform = 'rotate(' + (-38 * easeOut(seg(p, 0, .22))) + 'deg)';
          tiles.forEach(function (t, i) {
            var e = back(seg(p, .14 + i * .045, .44 + i * .045)), o = off[i] || [0, 0];
            if (e >= 1) { t.style.transform = ''; t.style.opacity = ''; return; }
            t.style.transform = 'translate(' + (o[0] * (1 - e)).toFixed(1) + 'px,' + (o[1] * (1 - e)).toFixed(1) + 'px) scale(' + (.25 + .75 * Math.min(1, e)).toFixed(3) + ') rotate(' + (-50 * (1 - e)).toFixed(1) + 'deg)';
            t.style.opacity = Math.min(1, e * 2.5).toFixed(2);
          });
        }
      };
    },

    card: function (el) {
      var steps = [].slice.call(el.querySelectorAll('.cs-steps li'));
      var hws = [].slice.call(el.querySelectorAll('.hw')).map(function (h) {
        var own = h.getAttribute('data-at'), host = h.closest('[data-at]');
        return [h, own ? +own : host ? +host.getAttribute('data-at') + .08 : 0];
      });
      var rows = [].slice.call(el.querySelectorAll('.cs-row'));
      var ell = el.querySelector('.cs-verdict ellipse'), vat = +(el.querySelector('.cs-verdict') || { getAttribute: function () { return .86; } }).getAttribute('data-at');
      return {
        set: function (p) {
          var cur = p < .3 ? 0 : p < .64 ? 1 : 2;
          steps.forEach(function (s, i) { s.classList.toggle('on', i === cur || p >= 1); });
          hws.forEach(function (h) { h[0].classList.toggle('w', p >= h[1]); });
          rows.forEach(function (r) { r.style.setProperty('--f', easeOut(seg(p, +r.getAttribute('data-at'), +r.getAttribute('data-at') + .1)).toFixed(3)); });
          if (ell) ell.style.strokeDashoffset = (100 - 100 * easeInOut(seg(p, vat, vat + .1))).toFixed(1);
        }
      };
    },

    swing: function (el) {
      if (reduce) return null;
      var cv = el.querySelector('.swing-cv'), ctx = cv && cv.getContext('2d'); if (!ctx) return null;
      var n = +el.getAttribute('data-frames'), small = innerWidth < 700;
      var base = el.getAttribute(small ? 'data-src-sm' : 'data-src'), imgs = [], loaded = 0, started = false, cur = -1, lines = [].slice.call(el.querySelectorAll('.swing-copy p'));
      function pad(i) { return ('00' + (i + 1)).slice(-3); }
      function load() {
        if (started) return; started = true;
        // the strike frames first, then fill the gaps, so scrubbing never waits long
        var order = []; for (var step = 16; step >= 1; step = Math.floor(step / 2)) { for (var i = 0; i < n; i += step) if (order.indexOf(i) === -1) order.push(i); if (step === 1) break; }
        order.forEach(function (i) { var im = new Image(); im.decoding = 'async'; im.onload = function () { loaded++; if (i === 0 || cur === -1) draw(i); }; im.src = base + pad(i) + '.webp'; imgs[i] = im; });
      }
      function size() { var r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); cur = -1; }
      function nearest(i) { for (var k = 0; k < n; k++) { var a = imgs[i - k], b = imgs[i + k]; if (a && a.complete && a.naturalWidth) return a; if (b && b.complete && b.naturalWidth) return b; } return null; }
      function draw(i) {
        var im = nearest(i); if (!im) return;
        var cw = cv.width, ch = cv.height, s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
        // keep the golfer in shot on narrow screens
        var ff = small ? .5 : .39, at = small ? .5 : .64, x = Math.min(0, Math.max(cw - w, cw * at - ff * w));
        ctx.drawImage(im, x, (ch - h) / 2, w, h);
        cv.classList.add('ready'); cur = i;
      }
      return {
        measure: function () { size(); },
        set: function (p) {
          var r = el.getBoundingClientRect();
          if (!started && r.top < innerHeight * 2.5 && r.bottom > -innerHeight) load();
          if (!started) return;
          var i = Math.round(easeInOut(seg(p, .05, .95)) * (n - 1)); if (i !== cur) draw(i);
          if (p >= .5 && (el._lp || 0) < .5 && window.HHsound) HHsound.play('strike'); el._lp = p;
          lines.forEach(function (l) { l.classList.toggle('on', p >= +l.getAttribute('data-from') && p < +l.getAttribute('data-to')); });
        }
      };
    },

    course: function (el) {
      if (reduce) return null;
      var svg = el.querySelector('.course-map'); if (!svg) return null;
      var H = JSON.parse(el.getAttribute('data-holes')), n = H.length;
      var shots = [].slice.call(svg.querySelectorAll('.shot')), ball = svg.querySelector('.cmball');
      var cards = [].slice.call(el.querySelectorAll('.ccard')), prog = el.querySelector('.cprog'), dots = [];
      el.classList.add('fly');
      for (var k = 0; k < n; k++) { var d = document.createElement('i'); prog.appendChild(d); dots.push(d); }
      var lens = shots.map(function (p) { return p.getTotalLength(); });
      var aspect = 1.6, narrow = false, lastHole = -1;
      var FULL = [-40, -60, 1680, 1120];
      var views = H.map(function (h) {
        var xs = [h[0][0], h[1][0], h[2][0]], ys = [h[0][1], h[1][1], h[2][1]];
        var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
        return [x0 - 120, y0 - 120, x1 - x0 + 240, y1 - y0 + 200];
      });
      function fit(v) {
        var w = v[2], h = v[3], cx = v[0] + w / 2, cy = v[1] + h / 2;
        if (narrow) { h *= 1.5; cy += v[3] * .28; } else { w *= 1.25; cx += v[2] * .12; } // leave room for the card
        if (w / h < aspect) w = h * aspect; else h = w / aspect;
        return [cx - w / 2, cy - h / 2 - (narrow ? 0 : h * .04), w, h];
      }
      function mix(a, b, t) { return a.map(function (x, i) { return x + (b[i] - x) * t; }); }
      function dash(L, e) { var s = '', run = e * 1000; for (var x = 0; x + 10 <= run; x += 10) s += '1 9 '; return (s || '0 0 ') + '0 2000'; }
      return {
        measure: function () { el._p = null; var r = svg.getBoundingClientRect(); aspect = r.width / Math.max(1, r.height); narrow = r.width < 860; },
        set: function (p) {
          if (p === el._p) return; el._p = p; // nothing moves while it's off screen
          var A = .06, B = .95, q = seg(p, A, B) * n, i = Math.min(n - 1, Math.floor(q)), f = p >= B ? 1 : q - i, view, travel;
          if (p < A) { view = mix(fit(FULL), fit(views[0]), easeInOut(seg(p, 0, A))); travel = 0; i = 0; f = 0; }
          else if (p > B) { view = mix(fit(views[n - 1]), fit(FULL), easeInOut(seg(p, B, 1))); travel = 1; }
          else {
            view = i === 0 ? fit(views[0]) : mix(fit(views[i - 1]), fit(views[i]), easeInOut(seg(f, 0, .3)));
            travel = easeInOut(seg(f, .32, .9));
          }
          svg.setAttribute('viewBox', view.map(function (v) { return v.toFixed(1); }).join(' '));
          shots.forEach(function (s, k) {
            if (k < i) { s.style.opacity = .85; s.setAttribute('stroke-dasharray', '1 9'); }
            else if (k > i) s.style.opacity = 0;
            else { s.style.opacity = .95; s.setAttribute('stroke-dasharray', dash(lens[k], travel)); }
          });
          var pt = shots[i].getPointAtLength(lens[i] * travel), hop = Math.sin(Math.PI * Math.min(1, travel / .92));
          ball.setAttribute('cx', pt.x.toFixed(1)); ball.setAttribute('cy', pt.y.toFixed(1));
          ball.setAttribute('r', (6 + 5 * hop).toFixed(1)); ball.style.opacity = travel > .985 ? 0 : 1;
          var show = p < A ? (p > .02 ? 0 : -1) : i;
          cards.forEach(function (c, k) { c.classList.toggle('on', k === show); c.tabIndex = k === show ? 0 : -1; });
          dots.forEach(function (d, k) { d.className = k < i || (k === i && travel > .98) ? 'cp-done' : k === i && p >= A ? 'cp-on' : ''; });
          if (i !== lastHole && p >= A && p <= B) { if (lastHole !== -1 && window.HHsound) HHsound.play('whoosh'); lastHole = i; }
          if (travel > .98 && el._holed !== i) { el._holed = i; window.HHsound && HHsound.play('cup'); }
          if (travel < .9 && el._holed === i) el._holed = -1;
        }
      };
    },

    bars: function (el) {
      var fills = [].slice.call(el.querySelectorAll('.fill'));
      return { set: function (p) { fills.forEach(function (f, i) { f.style.setProperty('--f', easeOut(seg(p, i * .1, .45 + i * .1)).toFixed(3)); }); } };
    },

    verdict: function (el) {
      var ell = el.querySelector('ellipse');
      return { set: function (p) { if (ell) ell.style.strokeDashoffset = (100 - 100 * easeInOut(seg(p, .1, .6))).toFixed(1); } };
    }
  };

  var scenes = [].slice.call(document.querySelectorAll('[data-scene]')).map(function (el) {
    var make = SCENES[el.getAttribute('data-scene')], s = make && make(el);
    if (!s) return null;
    s.el = el; s.pin = el.hasAttribute('data-pin'); s.pinAll = el.hasAttribute('data-pin-all');
    return s;
  }).filter(Boolean);

  function progress(s) {
    var r = s.el.getBoundingClientRect();
    if ((s.pin && pinMQ.matches) || s.pinAll) {
      var total = s.el.offsetHeight - (innerHeight - hh);
      return total > 0 ? clamp((hh - r.top) / total) : 1;
    }
    if (s.unpinned) return s.unpinned();
    return clamp((innerHeight * .9 - r.top) / (innerHeight * .6));
  }

  /* walk the 18: a rail down the left edge with a marker per hole (section) */
  var rail = null, marks = [], railH = 0;
  function buildRail() {
    var main = document.getElementById('main'); if (!main || document.querySelector('.page')) return; // not in the one-file preview
    var found = [].slice.call(main.querySelectorAll('.shead .hole .eyebrow, .prose > h2, .writeup > h2, .rv h2, .shead h2, .rail-head'));
    var seen = [], items = [];
    found.forEach(function (n) {
      var box = n.closest('.shead, .rail-head') || n; if (seen.indexOf(box) !== -1) return; seen.push(box);
      var eb = box.querySelector && box.querySelector('.eyebrow'), h2 = box.tagName === 'H2' ? box : box.querySelector('h2');
      var label = (eb && /hole/i.test(eb.textContent) ? eb.textContent.split('·')[0].trim() + ' · ' : '') + (h2 ? h2.textContent : eb ? eb.textContent : '');
      items.push({ el: box, label: label });
    });
    var mainTop = main.getBoundingClientRect().top + scrollY;
    if (!items.length || items[0].el.getBoundingClientRect().top + scrollY - mainTop > 200) items.unshift({ el: main, label: 'First tee' });
    rail = document.createElement('div'); rail.className = 'rail'; rail.setAttribute('aria-hidden', 'true');
    rail.innerHTML = '<div class="line"></div><div class="walked"></div><div class="tee"></div>' +
      '<svg class="pin" viewBox="0 0 20 28"><line x1="4" y1="2" x2="4" y2="28" stroke="#1B1B1B" stroke-width="2"/><path class="flag-wave" d="M5 3 L19 8 L5 13 Z" fill="#D21F25"/></svg><div class="ball"></div>';
    items.push({ el: null, label: 'The 19th hole' });
    marks = items.map(function (it) {
      var m = document.createElement('div'); m.className = 'mk'; m.innerHTML = '<span></span>'; m.firstChild.textContent = it.label;
      m.addEventListener('click', function () { if (it.el) scrollTo({ top: it.el.getBoundingClientRect().top + scrollY - hh - 20, behavior: reduce ? 'auto' : 'smooth' }); else scrollTo({ top: root.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }); });
      rail.appendChild(m); return { m: m, el: it.el, at: 1 };
    });
    document.body.appendChild(rail);
  }
  function placeRail() {
    if (!rail) return;
    railH = rail.offsetHeight; var max = root.scrollHeight - innerHeight;
    marks.forEach(function (k) {
      k.at = k.el ? clamp((k.el.getBoundingClientRect().top + scrollY - hh - innerHeight * .25) / Math.max(1, max)) : 1;
      k.m.style.top = (k.at * railH) + 'px';
    });
  }
  function moveRail() {
    if (!rail || !railH) return;
    var max = root.scrollHeight - innerHeight, p = max > 0 ? clamp(scrollY / max) : 0, cur = 0;
    rail.style.setProperty('--y', (p * railH) + 'px');
    marks.forEach(function (k, i) { var past = p + .001 >= k.at; k.m.classList.toggle('past', past); if (past) cur = i; });
    marks.forEach(function (k, i) { k.m.classList.toggle('cur', i === cur); });
  }

  var ticking = false;
  function frame() {
    ticking = false;
    scenes.forEach(function (s) { s.set(progress(s)); });
    moveRail();
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  function layout() {
    setHead();
    scenes.forEach(function (s) { if (s.measure) { s.set(0); s.measure(); } });
    placeRail(); frame();
  }

  buildRail();
  if (reduce) { setHead(); scenes.forEach(function (s) { s.set(1); }); placeRail(); moveRail(); addEventListener('scroll', moveRail, { passive: true }); return; }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', layout);
  if (pinMQ.addEventListener) pinMQ.addEventListener('change', layout);
  addEventListener('load', layout);
  layout();
})();

/* ===== round two: videos, stats, golfers like me, the caddie, putting, cursor and card tilt ===== */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* looping course footage: only loads when nearly on screen, pauses when off it, never with reduced motion or data saver */
  var vids = [].slice.call(document.querySelectorAll('video[data-src]'));
  if (!reduce && !saveData && 'IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (!v.src) { v.src = v.getAttribute('data-src'); v.load(); }
          var pr = v.play(); if (pr && pr.then) pr.then(function () { v.classList.add('playing'); }).catch(function () {});
        } else if (v.src) v.pause();
      });
    }, { rootMargin: '200px 0px' });
    vids.forEach(function (v) { vio.observe(v); });
  }

  /* live stats count up once, when they come into view */
  var counts = [].slice.call(document.querySelectorAll('[data-count]'));
  if (counts.length && !reduce && 'IntersectionObserver' in window) {
    counts.forEach(function (c) { c.textContent = '0'; });
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; cio.unobserve(e.target);
        var el = e.target, to = +el.getAttribute('data-count'), dec = String(to).indexOf('.') > -1 ? 1 : 0, t0 = performance.now();
        (function tick(t) { var k = Math.min(1, (t - t0) / 1400), v = to * (1 - Math.pow(1 - k, 3)); el.textContent = v.toFixed(dec); if (k < 1) requestAnimationFrame(tick); })(t0);
      });
    }, { threshold: .6 });
    counts.forEach(function (c) { cio.observe(c); });
  }

  /* golfers like me: reviews from testers near your handicap come first */
  [].slice.call(document.querySelectorAll('[data-likeme]')).forEach(function (box) {
    var input = box.querySelector('input'), out = box.querySelector('output'), wrap = box.parentNode.querySelector('.cards');
    if (!input || !wrap) return;
    var cards = [].slice.call(wrap.querySelectorAll('.rcard'));
    var saved = store.get('hh-handicap'); if (saved !== null && !isNaN(+saved)) input.value = saved;
    function fmt(v) { return v < 0 ? '+' + (-v) : v === 0 ? 'Scratch' : String(v); }
    function apply() {
      var me = +input.value; out.textContent = fmt(me); store.set('hh-handicap', me);
      cards.slice().sort(function (a, b) {
        var ha = a.hasAttribute('data-hc') ? Math.abs(+a.getAttribute('data-hc') - me) : 99, hb = b.hasAttribute('data-hc') ? Math.abs(+b.getAttribute('data-hc') - me) : 99;
        return ha - hb;
      }).forEach(function (c, i) {
        c.style.order = i;
        var near = c.hasAttribute('data-hc') && Math.abs(+c.getAttribute('data-hc') - me) <= 5, tag = c.querySelector('.near');
        if (near && !tag) { tag = document.createElement('span'); tag.className = 'near'; tag.textContent = 'Near your game'; c.appendChild(tag); }
        if (!near && tag) tag.remove();
      });
    }
    input.addEventListener('input', apply); apply();
  });

  /* the caddie: three taps to the categories and reviews worth reading first */
  [].slice.call(document.querySelectorAll('[data-finder]')).forEach(function (f) {
    var data = []; try { data = JSON.parse(f.querySelector('.fdata').textContent); } catch (e) {}
    var qs = [].slice.call(f.querySelectorAll('.fq')), steps = [].slice.call(f.querySelectorAll('.fsteps li')), res = f.querySelector('.fresult'), ans = {};
    var NAMES = { drivers: 'Drivers & woods', irons: 'Irons & hybrids', wedges: 'Wedges', putters: 'Putters', balls: 'Balls', grips: 'Grips', shoes: 'Shoes', bags: 'Bags & trolleys', tech: 'Rangefinders & tech', clothing: 'Clothing' };
    var MISS = { tee: ['drivers', 'balls'], approach: ['irons', 'tech'], short: ['wedges', 'balls'], putt: ['putters', 'grips'], weather: ['shoes', 'clothing', 'grips'], walk: ['bags', 'shoes'] };
    var MID = { low: 6, mid: 15, high: 25, none: 30 };
    var LINE = { tee: 'Fairways first.', approach: 'More greens in regulation.', short: 'Get up and down.', putt: 'Fewer three-putts.', weather: 'Dry, warm and comfortable.', walk: 'Fresher legs on the back nine.' };
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function show(i) {
      qs.forEach(function (q, k) { q.classList.toggle('on', k === i); });
      steps.forEach(function (s, k) { s.classList.toggle('on', k === i); s.classList.toggle('done', k < i); });
      if (qs[i]) { var b = qs[i].querySelector('button'); if (b && document.activeElement && f.contains(document.activeElement)) b.focus(); }
    }
    function result() {
      qs.forEach(function (q) { q.classList.remove('on'); }); steps.forEach(function (s) { s.classList.remove('on'); s.classList.add('done'); });
      var cats = MISS[ans.miss] || [], mid = MID[ans.hc], budget = +ans.budget;
      var picks = data.filter(function (r) { return cats.indexOf(r.c) > -1 && (r.pr == null || r.pr <= budget); })
        .sort(function (a, b) { return (Math.abs((a.h == null ? 99 : a.h) - mid) - Math.abs((b.h == null ? 99 : b.h) - mid)) || ((b.o || 0) - (a.o || 0)); }).slice(0, 4);
      res.innerHTML = '<h3>' + esc(LINE[ans.miss] || 'Here you go.') + '</h3><p>Start with these categories:</p><div class="fcats">' +
        cats.map(function (c) { return '<a href="/reviews/' + c + '/">' + esc(NAMES[c]) + '</a>'; }).join('') + '</div>' +
        (picks.length ? '<p>Reviews from testers nearest your game' + (budget < 9999 ? ', within your budget' : '') + ':</p><ul>' + picks.map(function (r) {
          return '<li><a href="' + esc(r.u) + '"><span>' + esc(r.p) + ' <small>· tested by ' + esc(r.f) + (r.h != null ? ', ' + (r.h < 0 ? '+' + (-r.h) : r.h) : '') + '</small></span><b>' + esc(r.o) + '</b></a></li>';
        }).join('') + '</ul>' : '<p>No reviews in these categories yet: our testers are on it. <a href="/join/">Fancy writing the first one?</a></p>') +
        '<button type="button" class="again">Start again</button>';
      res.querySelector('.again').addEventListener('click', function () { ans = {}; res.innerHTML = ''; qs.forEach(function (q) { [].forEach.call(q.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', 'false'); }); }); show(0); });
      if (window.HHobserve) window.HHobserve(res);
    }
    qs.forEach(function (q, i) {
      [].forEach.call(q.querySelectorAll('button'), function (b) {
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          [].forEach.call(q.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          ans[q.getAttribute('data-q')] = b.getAttribute('data-v');
          if (i < qs.length - 1) setTimeout(function () { show(i + 1); }, reduce ? 0 : 180); else result();
        });
      });
    });
    show(0);
  });

  /* putting: drag back from the ball and let go. Par 2. Keyboard: arrows aim and set pace, Enter putts */
  [].slice.call(document.querySelectorAll('.puttgame')).forEach(function (cv) {
    var wrap = cv.parentNode, msg = wrap.querySelector('.putt-msg'), reset = wrap.querySelector('.putt-reset'), ctx = cv.getContext('2d');
    var W, H, d = Math.min(devicePixelRatio || 1, 2), ball, cup, vel = { x: 0, y: 0 }, strokes = 0, drag = null, moving = false, done = false, aim = { a: 0, p: .5 }, kb = false, slope, lipped = false;
    function size() { var r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
    function newHole() {
      size(); strokes = 0; done = false; moving = false; vel = { x: 0, y: 0 };
      ball = { x: W * (.08 + Math.random() * .1), y: H * (.3 + Math.random() * .4) };
      cup = { x: W * (.72 + Math.random() * .18), y: H * (.25 + Math.random() * .5) };
      slope = { x: (Math.random() - .5) * .012, y: (Math.random() - .5) * .03 };
      aim.a = Math.atan2(cup.y - ball.y, cup.x - ball.x); aim.p = .5;
      say('Drag back from the ball and let go'); drawFrame();
    }
    function say(t) { if (msg) msg.textContent = t; }
    function drawFrame() {
      ctx.clearRect(0, 0, W, H);
      for (var x = -H, n = 0; x < W; x += 36, n++) { ctx.fillStyle = n % 2 ? '#2f7d45' : '#37904f'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 18, 0); ctx.lineTo(x + 18 + H * .4, H); ctx.lineTo(x + H * .4, H); ctx.fill(); }
      ctx.strokeStyle = '#ffffff40'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2);
      ctx.fillStyle = '#0b2a17'; ctx.beginPath(); ctx.ellipse(cup.x, cup.y, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
      if (!done) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cup.x, cup.y); ctx.lineTo(cup.x, cup.y - 46); ctx.stroke();
        ctx.fillStyle = '#D21F25'; ctx.beginPath(); ctx.moveTo(cup.x + 1, cup.y - 46); ctx.lineTo(cup.x + 22, cup.y - 40); ctx.lineTo(cup.x + 1, cup.y - 34); ctx.fill(); }
      var v = drag ? { x: drag.sx - drag.x, y: drag.sy - drag.y } : kb && !moving && !done ? { x: Math.cos(aim.a) * aim.p * 140, y: Math.sin(aim.a) * aim.p * 140 } : null;
      if (v && !moving) {
        var len = Math.min(140, Math.hypot(v.x, v.y)), ang = Math.atan2(v.y, v.x);
        ctx.setLineDash([4, 6]); ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(ball.x + Math.cos(ang) * len * 1.6, ball.y + Math.sin(ang) * len * 1.6); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff33'; ctx.fillRect(10, H - 16, 100, 6); ctx.fillStyle = len > 110 ? '#D21F25' : '#fff'; ctx.fillRect(10, H - 16, len / 140 * 100, 6);
      }
      if (!done || moving) { ctx.fillStyle = '#00000040'; ctx.beginPath(); ctx.ellipse(ball.x + 2, ball.y + 3, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#1B1B1B'; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.font = '700 13px Arial, sans-serif'; ctx.fillText('Strokes: ' + strokes + '   Par 2', W - 130, 22);
    }
    function putt(vx, vy) {
      var len = Math.min(140, Math.hypot(vx, vy)); if (len < 6) return;
      var k = len / Math.hypot(vx, vy) * .12; vel = { x: vx * k, y: vy * k }; strokes++; moving = true; say('Rolling…'); window.HHsound && HHsound.play('putt'); loop();
    }
    function loop() {
      if (!moving) return;
      ball.x += vel.x; ball.y += vel.y; var bk = Math.min(1, Math.hypot(vel.x, vel.y) / 2); vel.x = vel.x * .968 + slope.x * bk; vel.y = vel.y * .968 + slope.y * bk; // break fades as it slows, so it always stops
      if (ball.x < 7 || ball.x > W - 7) { vel.x *= -.6; ball.x = Math.max(7, Math.min(W - 7, ball.x)); }
      if (ball.y < 7 || ball.y > H - 7) { vel.y *= -.6; ball.y = Math.max(7, Math.min(H - 7, ball.y)); }
      var dx = cup.x - ball.x, dy = cup.y - ball.y, dist = Math.hypot(dx, dy), sp = Math.hypot(vel.x, vel.y);
      if (dist < 8 && sp < 4.2) { moving = false; done = true; ball.x = cup.x; ball.y = cup.y; window.HHsound && HHsound.play('cup');
        var names = { 1: 'Holed in one, you jammy so-and-so', 2: 'Two putts. Par. Respectable', 3: 'Three-putt. Happens to the best of us' };
        say((names[strokes] || strokes + ' putts. Maybe test a new putter?') + '.'); drawFrame(); return; }
      if (dist < 9 && sp >= 4.2) { var nx = -dx / dist, ny = -dy / dist; vel.x += nx * .9; vel.y += ny * .9; if (!lipped) { lipped = true; window.HHsound && HHsound.play('lip'); } } else if (dist > 14) lipped = false; // lip-out
      if (sp < .09) { moving = false; vel = { x: 0, y: 0 }; aim.a = Math.atan2(cup.y - ball.y, cup.x - ball.x); say(strokes === 1 ? 'Not bad. Knock it in.' : 'Keep going.'); drawFrame(); return; }
      drawFrame(); requestAnimationFrame(loop);
    }
    function pos(ev) { var r = cv.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }
    cv.addEventListener('pointerdown', function (ev) { if (moving || done) return; kb = false; var p = pos(ev); drag = { sx: p.x, sy: p.y, x: p.x, y: p.y }; cv.setPointerCapture(ev.pointerId); });
    cv.addEventListener('pointermove', function (ev) { if (!drag) return; var p = pos(ev); drag.x = p.x; drag.y = p.y; drawFrame(); });
    cv.addEventListener('pointerup', function () { if (!drag) return; var v = { x: drag.sx - drag.x, y: drag.sy - drag.y }; drag = null; putt(v.x, v.y); });
    cv.addEventListener('pointercancel', function () { drag = null; drawFrame(); });
    cv.addEventListener('keydown', function (ev) {
      if (moving) return; var k = ev.key;
      if (done && (k === 'Enter' || k === ' ')) { ev.preventDefault(); newHole(); return; }
      if (k === 'ArrowLeft') aim.a -= .06; else if (k === 'ArrowRight') aim.a += .06;
      else if (k === 'ArrowUp') aim.p = Math.min(1, aim.p + .05); else if (k === 'ArrowDown') aim.p = Math.max(.05, aim.p - .05);
      else if (k === 'Enter' || k === ' ') { ev.preventDefault(); kb = false; putt(Math.cos(aim.a) * aim.p * 140, Math.sin(aim.a) * aim.p * 140); return; }
      else return;
      ev.preventDefault(); kb = true; drawFrame();
    });
    if (reset) reset.addEventListener('click', newHole);
    var started = false;
    function init() { if (started) return; started = true; newHole(); }
    if ('IntersectionObserver' in window) { var pio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { init(); pio.disconnect(); } }); pio.observe(cv); } else init();
    addEventListener('resize', function () { if (started && !moving) { var bx = ball.x / W, by = ball.y / H, cx = cup.x / W, cy = cup.y / H; size(); ball.x = bx * W; ball.y = by * H; cup.x = cx * W; cup.y = cy * H; drawFrame(); } });
  });

  /* desktop only: a golf ball follows the pointer, cards tilt toward it */
  if (fine && !reduce) {
    var b = document.createElement('div'); b.className = 'cball'; document.body.appendChild(b);
    var trail = []; for (var i = 0; i < 6; i++) { var t = document.createElement('div'); t.className = 'ctrail'; t.style.opacity = (.5 - i * .07).toFixed(2); document.body.appendChild(t); trail.push({ el: t, x: 0, y: 0 }); }
    var tx = -100, ty = -100, bx = -100, by = -100, shown = false;
    addEventListener('pointermove', function (ev) { tx = ev.clientX; ty = ev.clientY; if (!shown) { bx = tx; by = ty; shown = true; } }, { passive: true });
    document.addEventListener('pointerover', function (ev) { b.classList.toggle('big', !!(ev.target.closest && ev.target.closest('a,button,input,select,textarea,canvas'))); });
    document.addEventListener('mouseleave', function () { tx = ty = -100; });
    (function follow() {
      bx += (tx - bx) * .28; by += (ty - by) * .28; b.style.transform = 'translate(' + bx + 'px,' + by + 'px)';
      var px = bx, py = by;
      trail.forEach(function (t) { t.x += (px - t.x) * .35; t.y += (py - t.y) * .35; t.el.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)'; px = t.x; py = t.y; });
      requestAnimationFrame(follow);
    })();
    [].slice.call(document.querySelectorAll('.rcard, .tester, .kit a, .cs-card')).forEach(function (c) {
      c.classList.add('tilt'); var sh = document.createElement('span'); sh.className = 'sheen'; sh.setAttribute('aria-hidden', 'true'); c.appendChild(sh);
      var max = c.classList.contains('cs-card') ? 4 : 9;
      c.addEventListener('pointermove', function (ev) {
        var r = c.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        c.style.transform = 'perspective(900px) rotateX(' + ((.5 - y) * max).toFixed(2) + 'deg) rotateY(' + ((x - .5) * max).toFixed(2) + 'deg) translateY(-4px)';
        c.style.setProperty('--sx', (x * 100).toFixed(1) + '%'); c.style.setProperty('--sy', (y * 100).toFixed(1) + '%');
      });
      c.addEventListener('pointerleave', function () { c.style.transform = ''; });
    });
  }
})();
