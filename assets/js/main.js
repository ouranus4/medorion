/* ============================================================
   MedOrion Awards 2026 — behaviour
   No dependencies. Everything degrades gracefully.
   ============================================================ */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     CONFIGURATION — заповніть ці три константи
     ---------------------------------------------------------- */

  // Telegram-бот, у чат якого падатимуть заявки.
  // 1. Створіть бота через @BotFather -> отримаєте TOKEN
  // 2. Додайте бота у ваш чат/групу, напишіть туди будь-що,
  //    відкрийте https://api.telegram.org/bot<TOKEN>/getUpdates -> звідти візьміть chat.id
  var TG_BOT_TOKEN = '';   // напр. '7712345678:AAG...'
  var TG_CHAT_ID   = '';   // напр. '-1002345678901' або '123456789'

  // Посилання на телесюжет СТБ. Поки порожнє — кнопка «Дивитися сюжет» прихована.
  var STB_VIDEO_URL = '';

  // Куди вести людину, якщо мережа підвела
  var TG_FALLBACK = 'https://t.me/marina_philipenko';

  var CEREMONY = new Date('2026-11-02T16:00:00+02:00');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover     = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ----------------------------------------------------------
     NAV — solid on scroll + burger
     ---------------------------------------------------------- */
  var nav       = $('#nav');
  var burger    = $('#burger');
  var menu      = $('#mobileMenu');
  var stickyCta = $('#stickyCta');
  var hero      = $('#top');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle('solid', y > 24);
    if (stickyCta && hero) {
      stickyCta.classList.toggle('show', y > hero.offsetHeight * 0.85);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Scroll-spy: the black dot follows the section you are reading */
  var spyLinks = $$('#navLinks a[href^="#"]');
  var spyTargets = spyLinks
    .map(function (a) {
      return { link: a, el: document.getElementById(a.getAttribute('href').slice(1)) };
    })
    .filter(function (t) { return t.el; });

  function spy() {
    if (!spyTargets.length) return;
    var probe = (window.scrollY || window.pageYOffset) + window.innerHeight * 0.32;
    var current = spyTargets[0];
    spyTargets.forEach(function (t) {
      if (t.el.offsetTop <= probe) current = t;
    });
    spyLinks.forEach(function (a) { a.classList.toggle('active', a === current.link); });
  }
  window.addEventListener('scroll', spy, { passive: true });
  window.addEventListener('resize', spy);
  spy();

  function setMenu(open) {
    if (!menu || !burger) return;
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('locked', open);
  }
  if (burger) {
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
  }
  if (menu) {
    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    setMenu(false);
    closeModal();
  });

  /* ----------------------------------------------------------
     REVEAL ON SCROLL
     ---------------------------------------------------------- */
  var revealables = $$('.rv:not(.on)');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealables.forEach(function (el) { el.classList.add('on'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('on');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------
     COUNTDOWN
     ---------------------------------------------------------- */
  var cdCells = {
    days:  $('[data-cd="days"]'),
    hours: $('[data-cd="hours"]'),
    mins:  $('[data-cd="mins"]'),
    secs:  $('[data-cd="secs"]')
  };
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function tick() {
    var diff = CEREMONY - new Date();
    if (diff < 0) diff = 0;
    var s = Math.floor(diff / 1000);
    var d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (cdCells.days)  cdCells.days.textContent  = String(d);
    if (cdCells.hours) cdCells.hours.textContent = pad(h);
    if (cdCells.mins)  cdCells.mins.textContent  = pad(m);
    if (cdCells.secs)  cdCells.secs.textContent  = pad(sec);
  }
  if (cdCells.days) { tick(); setInterval(tick, 1000); }

  /* ----------------------------------------------------------
     ANIMATED COUNTERS
     ---------------------------------------------------------- */
  var counters = $$('[data-count]');
  function runCounter(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduceMotion) { el.textContent = target + suffix; return; }
    var dur = 1500, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counters.length) {
    if (!('IntersectionObserver' in window)) {
      counters.forEach(runCounter);
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          runCounter(en.target);
          cio.unobserve(en.target);
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ----------------------------------------------------------
     RUBY CURSOR GLOW
     Feeds the pointer position into --mx/--my so each card can
     bloom a soft ruby light under the cursor. Pointer devices only.
     ---------------------------------------------------------- */
  if (canHover && !reduceMotion) {
    $$('.card, .lau, .host').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });
  }

  /* ----------------------------------------------------------
     HERO GRADIENT
     Silky ruby blades of light sweeping across black, drawn by a
     WebGL fragment shader. Raw WebGL — no library, no build step.
     Falls back to the plain black hero if WebGL is unavailable.
     ---------------------------------------------------------- */
  (function heroGradient() {
    var canvas = $('#heroGradient');
    if (!canvas) return;

    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false })
          || canvas.getContext('experimental-webgl');
    if (!gl) return;

    var VERT =
      'attribute vec2 p;' +
      'void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

    var FRAG =
      'precision highp float;' +
      'uniform vec2 uRes;' +
      'uniform float uTime;' +
      'void main(){' +
      '  vec2 uv = gl_FragCoord.xy / uRes;' +
         // the light originates just off the top-right corner
      '  vec2 d = uv - vec2(1.06, 0.94);' +
      '  d.x *= uRes.x / uRes.y;' +
      '  float r = length(d);' +
      '  float a = atan(d.y, d.x);' +
      '  float t = uTime * 0.085;' +
         // layered angular waves read as folded silk
      '  float v  = sin(a * 7.0  + t * 1.7 + sin(r * 3.0 - t) * 0.9);' +
      '  v += sin(a * 11.0 - t * 1.1 + r * 2.2) * 0.7;' +
      '  v += sin(a * 4.0  + t * 0.6 - r * 1.4) * 0.9;' +
      '  v /= 2.6;' +
      '  float bands = pow(clamp(v * 0.5 + 0.5, 0.0, 1.0), 2.3);' +
      '  float falloff = smoothstep(1.45, 0.02, r);' +
      '  float i = bands * falloff;' +
         // black -> deep wine -> ruby -> hot highlight
      '  vec3 col = vec3(0.015, 0.004, 0.008);' +
      '  col = mix(col, vec3(0.34, 0.015, 0.035), smoothstep(0.03, 0.42, i));' +
      '  col = mix(col, vec3(0.90, 0.05, 0.09),  smoothstep(0.42, 0.74, i));' +
      '  col = mix(col, vec3(1.00, 0.52, 0.45),  smoothstep(0.74, 1.00, i));' +
         // a little dither kills banding on wide flat ramps
      '  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);' +
      '  col += (n - 0.5) * 0.012;' +
      '  gl_FragColor = vec4(col, 1.0);' +
      '}';

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('[MedOrion] shader:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[MedOrion] program:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'uRes');
    var uTime = gl.getUniformLocation(prog, 'uTime');

    // a full-viewport shader does not need retina density
    var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = 0, h = 0;

    function size() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      var nw = Math.round(r.width * DPR), nh = Math.round(r.height * DPR);
      if (nw !== w || nh !== h) {
        w = nw; h = nh;
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      return true;
    }

    // start part-way in so the very first frame already shows formed bands
    var t0 = 14;
    function render(seconds) {
      if (!size()) return false;
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, t0 + seconds);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      canvas.classList.add('lit');
      return true;
    }

    // paint immediately — rAF does not run while the tab is hidden
    render(0);

    if (reduceMotion) return;   // one static frame is enough

    var start = performance.now();
    (function loop() {
      render((performance.now() - start) / 1000);
      requestAnimationFrame(loop);
    })();

    window.addEventListener('resize', function () { w = 0; h = 0; });
  })();

  /* ----------------------------------------------------------
     SPARKLE BUTTONS
     A drifting particle field inside every button — the same look as
     a tsparticles "sparkles" field, done on a canvas so the page keeps
     its zero-dependency, no-build setup.
     One shared rAF loop drives every button; only on-screen buttons draw.
     ---------------------------------------------------------- */
  (function sparkleButtons() {
    if (reduceMotion) return;

    var buttons = $$('.btn');
    if (!buttons.length) return;

    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var fields = [];

    buttons.forEach(function (btn) {
      var canvas = document.createElement('canvas');
      canvas.className = 'btn-sparks';
      canvas.setAttribute('aria-hidden', 'true');
      btn.appendChild(canvas);

      fields.push({
        btn: btn,
        canvas: canvas,
        ctx: canvas.getContext('2d'),
        // white reads on the ruby and ghost buttons; the white button needs ruby
        rgb: btn.classList.contains('btn-white') ? '229,9,20' : '255,255,255',
        parts: [],
        w: 0, h: 0,
        onScreen: false,
        hot: false
      });
    });

    function spawn(f) {
      return {
        x: Math.random() * f.w,
        y: Math.random() * f.h,
        r: 0.3 + Math.random() * 0.8,
        vx: (Math.random() - 0.5) * 0.14,
        vy: (Math.random() - 0.5) * 0.14,
        o: Math.random(),
        dir: Math.random() < 0.5 ? -1 : 1,
        sp: 0.005 + Math.random() * 0.015,
        max: 0.5 + Math.random() * 0.45
      };
    }

    function measure(f) {
      var r = f.btn.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      if (Math.abs(r.width - f.w) < 1 && Math.abs(r.height - f.h) < 1) return true;
      f.w = r.width;
      f.h = r.height;
      f.canvas.width = Math.round(r.width * DPR);
      f.canvas.height = Math.round(r.height * DPR);
      f.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      // sparse enough to read as a starfield rather than noise
      var n = Math.min(44, Math.max(12, Math.round(r.width * r.height / 420)));
      f.parts = [];
      for (var i = 0; i < n; i++) f.parts.push(spawn(f));
      return true;
    }

    function draw(f) {
      var ctx = f.ctx, w = f.w, h = f.h;
      ctx.clearRect(0, 0, w, h);
      var boost = f.hot ? 1.35 : 1;
      for (var i = 0; i < f.parts.length; i++) {
        var p = f.parts[i];
        p.o += p.sp * p.dir;
        if (p.o >= p.max) { p.o = p.max; p.dir = -1; }
        else if (p.o <= 0.05) { p.o = 0.05; p.dir = 1; }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -2) p.x = w + 2; else if (p.x > w + 2) p.x = -2;
        if (p.y < -2) p.y = h + 2; else if (p.y > h + 2) p.y = -2;
        ctx.globalAlpha = Math.min(1, p.o * boost);
        ctx.fillStyle = 'rgb(' + f.rgb + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // brighten the field while the pointer is over the button
    if (canHover) {
      fields.forEach(function (f) {
        f.btn.addEventListener('pointerenter', function () { f.hot = true; });
        f.btn.addEventListener('pointerleave', function () { f.hot = false; });
      });
    }

    // only paint what is actually on screen
    if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var f = fields.filter(function (x) { return x.btn === en.target; })[0];
          if (f) f.onScreen = en.isIntersecting;
        });
      }, { rootMargin: '120px' });
      fields.forEach(function (f) { vio.observe(f.btn); });
    } else {
      fields.forEach(function (f) { f.onScreen = true; });
    }

    function paint(f) {
      if (!measure(f)) return false;
      draw(f);
      if (!f.canvas.classList.contains('lit')) f.canvas.classList.add('lit');
      return true;
    }

    // Size and paint one frame straight away, so a button is never a blank
    // canvas before rAF first fires (rAF does not run while the tab is hidden).
    fields.forEach(paint);

    // The browser already parks rAF while the tab is hidden, so there is no
    // manual pause to manage here — only skip buttons that are off-screen.
    function frame() {
      for (var i = 0; i < fields.length; i++) {
        if (fields[i].onScreen) paint(fields[i]);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // force a re-measure; a button can change size or appear at a new breakpoint
    window.addEventListener('resize', function () {
      fields.forEach(function (f) { f.w = 0; f.h = 0; });
    });
  })();

  /* ----------------------------------------------------------
     LAUREATE PORTRAITS
     A card shows its monogram until a real photo exists at
     assets/img/laureates/<name>.jpg — then the photo swaps in.
     ---------------------------------------------------------- */
  $$('.lau-face[data-portrait]').forEach(function (face) {
    var src = face.getAttribute('data-portrait');
    if (!src) return;
    var probe = new Image();
    probe.onload = function () {
      var img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      face.appendChild(img);
      var mono = $('.monogram', face);
      if (mono) mono.style.display = 'none';
    };
    probe.src = src;
  });

  /* ----------------------------------------------------------
     STB BROADCAST LINK
     ---------------------------------------------------------- */
  var stbLink = $('#stbLink');
  if (stbLink && STB_VIDEO_URL) {
    stbLink.href = STB_VIDEO_URL;
    stbLink.target = '_blank';
    stbLink.rel = 'noopener';
    stbLink.hidden = false;
  }

  /* ----------------------------------------------------------
     MODAL
     ---------------------------------------------------------- */
  var modal = $('#modal');
  var modalClose = $('#modalClose');
  var lastFocus = null;

  function openModal() {
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
    if (modalClose) modalClose.focus();
  }
  function closeModal() {
    if (!modal || !modal.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
  }

  /* ----------------------------------------------------------
     FORM -> TELEGRAM
     ---------------------------------------------------------- */
  var form      = $('#applyForm');
  var submitBtn = $('#submitBtn');
  var formError = $('#formError');

  function fieldOf(input) { return input.closest('.field'); }

  function validate() {
    var ok = true;
    $$('[required]', form).forEach(function (input) {
      var f = fieldOf(input);
      var bad = !input.value || !String(input.value).trim();
      if (!bad && input.type === 'tel') {
        // at least 9 digits — permissive, people type all sorts of formats
        bad = (String(input.value).replace(/\D/g, '').length < 9);
      }
      if (f) f.classList.toggle('invalid', bad);
      if (bad && ok) { input.focus(); ok = false; }
      else if (bad) { ok = false; }
    });
    return ok;
  }

  $$('input, select, textarea', form || document).forEach(function (input) {
    input.addEventListener('input', function () {
      var f = fieldOf(input);
      if (f) f.classList.remove('invalid');
    });
    input.addEventListener('change', function () {
      var f = fieldOf(input);
      if (f) f.classList.remove('invalid');
    });
  });

  function esc(s) {
    return String(s || '—')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function buildMessage(d) {
    return [
      '<b>Нова заявка — MedOrion Awards 2026</b>',
      '',
      '<b>Ім\'я:</b> ' + esc(d.name),
      '<b>Телефон:</b> ' + esc(d.phone),
      '<b>Статус:</b> ' + esc(d.status),
      '<b>Номінація:</b> ' + esc(d.nomination),
      '<b>Соцмережі / сайт:</b> ' + esc(d.link),
      '<b>Повідомлення:</b> ' + esc(d.message),
      '',
      '<i>Джерело: medorion-landing</i>'
    ].join('\n');
  }

  function showError(text) {
    if (!formError) return;
    formError.textContent = text;
    formError.classList.add('show');
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (formError) formError.classList.remove('show');
      if (!validate()) return;

      var data = {
        name:       $('#f-name').value.trim(),
        phone:      $('#f-phone').value.trim(),
        status:     $('#f-status').value,
        nomination: $('#f-nomination').value,
        link:       $('#f-link').value.trim(),
        message:    $('#f-message').value.trim()
      };

      // Not configured yet — don't fail silently, and don't lose the lead.
      if (!TG_BOT_TOKEN || !TG_CHAT_ID) {
        console.warn(
          '[MedOrion] Telegram не налаштовано. Впишіть TG_BOT_TOKEN і TG_CHAT_ID ' +
          'вгорі assets/js/main.js. Заявка НЕ була надіслана:', data
        );
        showError(
          'Форму ще не підключено до Telegram-бота. Напишіть, будь ласка, ' +
          'напряму: t.me/marina_philipenko'
        );
        return;
      }

      submitBtn.setAttribute('data-loading', 'true');
      var original = submitBtn.textContent;
      submitBtn.textContent = 'Надсилаємо…';

      fetch('https://api.telegram.org/bot' + TG_BOT_TOKEN + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TG_CHAT_ID,
          text: buildMessage(data),
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res || res.ok !== true) {
            throw new Error((res && res.description) || 'Telegram API error');
          }
          form.reset();
          openModal();
        })
        .catch(function (err) {
          console.error('[MedOrion] Не вдалося надіслати заявку:', err, data);
          showError(
            'Не вдалося надіслати заявку. Спробуйте ще раз або напишіть напряму: ' +
            TG_FALLBACK.replace('https://', '')
          );
        })
        .then(function () {
          submitBtn.removeAttribute('data-loading');
          submitBtn.textContent = original;
        });
    });
  }
})();
