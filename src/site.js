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
          yds.textContent = Math.round(168 * s) + ' yds';
          if (hint) hint.style.opacity = 1 - seg(p, 0, .08);
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
    s.el = el; s.pin = el.hasAttribute('data-pin');
    return s;
  }).filter(Boolean);

  function progress(s) {
    var r = s.el.getBoundingClientRect();
    if (s.pin && pinMQ.matches) {
      var total = s.el.offsetHeight - (innerHeight - hh);
      return total > 0 ? clamp((hh - r.top) / total) : 1;
    }
    if (s.unpinned) return s.unpinned();
    return clamp((innerHeight * .9 - r.top) / (innerHeight * .6));
  }

  /* walk the 18: a rail down the left edge with a marker per hole (section) */
  var rail = null, marks = [], railH = 0;
  function buildRail() {
    var main = document.getElementById('main'); if (!main) return;
    var found = [].slice.call(main.querySelectorAll('.shead .hole .eyebrow, .prose > h2, .writeup > h2, .rv h2, .shead h2'));
    var seen = [], items = [];
    found.forEach(function (n) {
      var box = n.closest('.shead') || n; if (seen.indexOf(box) !== -1) return; seen.push(box);
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
