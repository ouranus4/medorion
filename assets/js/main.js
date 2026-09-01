/* ============================================================
   MedOrion Awards 2026 — behaviour
   No dependencies. Everything degrades gracefully.
   ============================================================ */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     CONFIGURATION — заповніть ці три константи
     ---------------------------------------------------------- */

  // ── КУДИ ПАДАЮТЬ ЗАЯВКИ ──────────────────────────────────
  //
  // ВАРІАНТ А (рекомендований). Адреса вашого Cloudflare Worker.
  // Токен бота лежить усередині Worker'а і в цей файл не потрапляє.
  // Інструкція: telegram-worker/README.md
  var TG_ENDPOINT = 'https://medorion-form.medorionawards.workers.dev';
  //
  // ВАРІАНТ Б (швидкий). Токен просто тут, без проксі.
  // Працює одразу, але репозиторій сайту ПУБЛІЧНИЙ: токен побачить
  // будь-хто, хто відкриє сторінку, і зможе слати вам повідомлення
  // від імені бота. Використовуйте, лише поки немає Worker'а.
  // 1. @BotFather -> /newbot -> TOKEN
  // 2. напишіть боту в потрібний чат, відкрийте
  //    https://api.telegram.org/bot<TOKEN>/getUpdates -> звідти chat.id
  var TG_BOT_TOKEN = '';   // напр. '7712345678:AAG...'
  var TG_CHAT_ID   = '';   // напр. '-1002345678901' або '123456789'


  // Instagram лауреатів. Можна вставити або повне посилання на пост,
  // або нік без «@» — тоді відкриється профіль.
  // Порожнє поле = картка лишається без посилання.
  var LAUREATE_INSTAGRAM = {
    'lukine':            'https://www.instagram.com/p/DcosxTStvRo/',
    'stefaniia-didenko': 'https://www.instagram.com/p/DcosbX_Nj4Y/',
    'marina-kinakh':     'https://www.instagram.com/p/Dcd_y_vt8dL/',
    'anna-holovko':      'https://www.instagram.com/p/DcJYM3VNlas/',
    'grand-cosmetic':    'https://www.instagram.com/p/Da5edR3t_s3/',
    'olha-samokhvalova': 'https://www.instagram.com/p/DavPuDbtTNc/',
    'liliia-yurkova':    'https://www.instagram.com/p/DaKEyWuNh8v/',
    'maryna-oushen':     'https://www.instagram.com/p/DZ9w1Rnt0La/',
    'inna-prystupa':     'https://www.instagram.com/p/DZ9uPaLtVFX/',

    // Експертна рада
    'zolotareva':        'https://www.instagram.com/p/DZfI5WAtnoG/',
    'reynolds':          'https://www.instagram.com/p/DZfJJLGNDz3/',
    'zaruzhko':          'https://www.instagram.com/p/DZfJXOkNVGZ/',
    'chernomorets':      'https://www.instagram.com/p/DZhV-6-NiEi/',
    'raevskiy':          'https://www.instagram.com/p/DZhWzf_Nnas/',
    'kosmachova':        'https://www.instagram.com/p/Dcv4ebMNKt3/'
  };

  // Куди вести людину, якщо мережа підвела
  var TG_FALLBACK = 'https://t.me/marina_philipenko';


  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Ефекти, що ховають вміст (маска заголовка, промальовка ліній), вмикаються
  // лише коли цей скрипт справді виконався. Без нього — і якщо він упаде —
  // сторінка лишається повністю читабельною, просто без анімацій.
  if (!reduceMotion) document.documentElement.classList.add('fx');
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
     ЗАВІСА ЗАВАНТАЖЕННЯ
     Тримає перший екран, поки не готові шрифти й важливі картинки.
     Знімається за будь-яких обставин: є жорсткий тайм-аут, і навіть
     якщо щось не завантажиться, сторінка відкриється.
     ---------------------------------------------------------- */
  (function loader() {
    var box  = $('#loader');
    var fill = $('#ldFill');
    var pct  = $('#ldPct');

    function open() {
      document.body.classList.remove('loading');
      if (box) box.classList.add('gone');
      // прибираємо з дерева, щоб не ловив фокус і не читався з екрана
      setTimeout(function () { if (box && box.parentNode) box.remove(); }, 1200);
    }

    if (!box || reduceMotion) { open(); return; }

    document.body.classList.add('loading');
    // будь-яка несподівана помилка не має замкнути сторінку
    window.addEventListener('error', open);

    // чекаємо тільки на те, що видно на першому екрані
    var critical = ['assets/img/logo.png', 'assets/img/hosts-cut.webp', 'assets/img/space-bg.webp'];
    var total = critical.length + 1;          // + шрифти
    var done  = 0;
    var shown = 0;
    var start = Date.now();
    var finished = false;

    function step() {
      var target = Math.round(done / total * 100);
      // смуга ніколи не стрибає назад і не завмирає на нулі
      shown = Math.max(shown, target);
      if (fill) fill.style.width = shown + '%';
      if (pct)  pct.textContent = shown;
    }

    function tick() {
      done++;
      step();
      if (done >= total) finish();
    }

    function finish() {
      if (finished) return;
      finished = true;
      shown = 100; step();
      // мінімум 600 мс, щоб смуга не мигнула й одразу не зникла
      var wait = Math.max(0, 600 - (Date.now() - start));
      setTimeout(open, wait + 260);
    }

    critical.forEach(function (src) {
      var im = new Image();
      im.onload = im.onerror = tick;
      im.src = src;
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(tick).catch(tick);
    } else {
      tick();
    }

    // страховка: за 3 секунди відкриваємо в будь-якому разі
    setTimeout(finish, 3000);
  })();

  /* ----------------------------------------------------------
     СМУГА ПРОГРЕСУ ПРОКРУТКИ
     ---------------------------------------------------------- */
  (function scrollProgress() {
    var bar = $('#scrollBar');
    var box = bar && bar.parentNode;
    if (!bar) return;
    var ticking = false;

    function paint() {
      ticking = false;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
      bar.style.width = (p * 100).toFixed(2) + '%';
      box.classList.toggle('on', window.scrollY > 120);
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(paint);
    }, { passive: true });
    window.addEventListener('resize', paint, { passive: true });
    paint();
  })();

  /* ----------------------------------------------------------
     СЕКЦІЯ У ПОЛІ ЗОРУ
     Дає класи для промальовки лінії між блоками й появи заголовка.
     ---------------------------------------------------------- */
  (function sectionsIn() {
    var secs = $$('section');
    var heads = $$('.sec-head h2');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      secs.forEach(function (s) { s.classList.add('in'); });
      heads.forEach(function (h) { h.classList.add('on'); });
      return;
    }
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        sio.unobserve(en.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    secs.forEach(function (s) { sio.observe(s); });

    var hio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('on');
        hio.unobserve(en.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    heads.forEach(function (h) { hio.observe(h); });
  })();

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
     TICKER
     The CSS marquee shifts the track by -50%, so the content has to
     appear exactly twice for the loop to be seamless.
     ---------------------------------------------------------- */
  (function ticker() {
    var track = $('#tickerTrack');
    if (!track) return;
    var original = track.innerHTML;
    track.innerHTML = original + original;
    track.setAttribute('aria-hidden', 'true');

    // The marquee travels -50% of the track's own width, so the seam only
    // lands correctly once the width has stopped changing. Duplicating the
    // markup, decoding the logos and swapping in the web font all move it,
    // and each move shows up as a stutter. Restart the animation after the
    // last of them instead of letting it run through the reflow.
    function restart() {
      track.style.animation = 'none';
      void track.offsetWidth;          // force reflow so the restart takes
      track.style.animation = '';
    }
    var imgs = Array.prototype.slice.call(track.querySelectorAll('img'));
    var settle = Promise.all(imgs.map(function (img) {
      return img.decode ? img.decode().catch(function () {}) :
        (img.complete ? Promise.resolve() :
          new Promise(function (r) { img.onload = img.onerror = r; }));
    }));
    if (document.fonts && document.fonts.ready) {
      settle = Promise.all([settle, document.fonts.ready]);
    }
    settle.then(restart);
  })();

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

    // A full-screen shader redrawing every frame for the whole session is a
    // steady GPU cost that shows up elsewhere on the page — the ticker was
    // stuttering because of it. Draw only while the hero is actually on
    // screen and the tab is in front; the clock keeps running either way, so
    // the bands are where they should be when it comes back.
    var start = performance.now();
    var raf = 0;
    var onScreen = true;

    function loop() {
      render((performance.now() - start) / 1000);
      raf = requestAnimationFrame(loop);
    }
    function play() {
      if (raf || !onScreen || document.hidden) return;
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        onScreen ? play() : stop();
      }, { threshold: 0 }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : play();
    });
    play();

    window.addEventListener('resize', function () { w = 0; h = 0; });
  })();

  /* ----------------------------------------------------------
     STORY VIDEO
     The native centred play button lands on the reporter's face, so the
     video ships without controls and we drive the first play ourselves.
     ---------------------------------------------------------- */
  (function storyVideo() {
    var frame = $('#videoFrame');
    var video = $('#storyVideo');
    var btn = $('#storyPlay');
    if (!frame || !video || !btn) return;

    btn.addEventListener('click', function () {
      video.setAttribute('controls', '');
      frame.classList.add('playing');
      var p = video.play();
      // autoplay policies can still refuse; leave the controls so the
      // viewer can start it by hand rather than facing a dead frame
      if (p && p.catch) p.catch(function () {});
    });

    video.addEventListener('pause', function () {
      if (video.currentTime === 0) frame.classList.remove('playing');
    });
  })();

  /* ----------------------------------------------------------
     GALLERY: SHOW MORE
     The tail of the mosaic is folded away so the section stays short.
     ---------------------------------------------------------- */
  (function mosaicMore() {
    var btn = $('#mosaicMore');
    var grid = $('#mosaic');
    if (!btn || !grid) return;

    var hidden = $$('.mo-more', grid);
    if (!hidden.length) { btn.parentNode.style.display = 'none'; return; }
    $('.more-count', btn).textContent = '+' + hidden.length;

    btn.addEventListener('click', function () {
      var open = grid.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      $('.more-label', btn).textContent = open ? 'Згорнути' : 'Більше фото';
      if (!open) grid.scrollIntoView({ block: 'nearest' });
    });
  })();

  /* ----------------------------------------------------------
     SEGMENT PORTRAITS
     Same idea as the laureate cards: a segment shows its line icon
     until a photo turns up at assets/img/segments/<name>.jpg.
     ---------------------------------------------------------- */
  $$('.seg-face[data-photo]').forEach(function (slot) {
    var src = slot.getAttribute('data-photo');
    if (!src) return;
    var probe = new Image();
    probe.onload = function () {
      var img = document.createElement('img');
      img.src = src;
      img.alt = slot.getAttribute('data-alt') || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      slot.appendChild(img);
      slot.classList.add('has-photo');
      var ic = $('.ic', slot);
      if (ic) ic.style.display = 'none';
    };
    probe.src = src;
  });

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
     LAUREATE INSTAGRAM LINKS
     A handle in LAUREATE_INSTAGRAM turns the whole card into a link.
     Uses a stretched <a> overlay rather than a click handler, so the
     card stays keyboard-focusable and reads as a real link.
     ---------------------------------------------------------- */
  $$('.lau-face[data-key]').forEach(function (face) {
    var raw = LAUREATE_INSTAGRAM[face.getAttribute('data-key')];
    if (!raw) return;
    raw = String(raw).trim();
    if (!raw) return;

    // accept a full post/profile URL or a bare handle
    var url, label;
    if (/^https?:\/\//i.test(raw)) {
      if (!/(^|\.)instagram\.com$/i.test(new URL(raw).hostname)) return;
      url = raw;
      label = 'Instagram';
    } else {
      var handle = raw.replace(/^@/, '');
      url = 'https://www.instagram.com/' + encodeURIComponent(handle) + '/';
      label = '@' + handle;
    }

    var card = face.closest('.lau');
    if (!card) return;
    var name = (($('.lau-name', card) || {}).textContent || '').trim();

    // badge in the corner of the portrait
    var badge = document.createElement('span');
    badge.className = 'lau-ig';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = '<svg class="ic"><use href="#i-instagram"></use></svg>';
    face.appendChild(badge);

    // the reference, under the role
    var body = $('.lau-body', card);
    if (body) {
      var tag = document.createElement('span');
      tag.className = 'lau-handle';
      tag.textContent = label;
      var role = $('.lau-role', card);
      if (role && role.nextSibling) body.insertBefore(tag, role.nextSibling);
      else body.appendChild(tag);
    }

    var link = document.createElement('a');
    link.className = 'lau-link';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', name + ' — публікація в Instagram');
    card.appendChild(link);
    card.classList.add('has-link');
  });

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

      var honeypot = $('#f-company');
      var data = {
        name:       $('#f-name').value.trim(),
        phone:      $('#f-phone').value.trim(),
        status:     $('#f-status').value,
        nomination: $('#f-nomination').value,
        link:       $('#f-link').value.trim(),
        message:    $('#f-message').value.trim(),
        company:    honeypot ? honeypot.value : ''   // пастка для ботів
      };

      // Not configured yet — don't fail silently, and don't lose the lead.
      if (!TG_ENDPOINT && (!TG_BOT_TOKEN || !TG_CHAT_ID)) {
        console.warn(
          '[MedOrion] Прийом заявок не налаштовано. Впишіть TG_ENDPOINT ' +
          '(або TG_BOT_TOKEN і TG_CHAT_ID) вгорі assets/js/main.js. ' +
          'Заявка НЕ була надіслана:', data
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

      // Через проксі йде сира заявка — текст збирає Worker.
      // Навпростець — уже готове повідомлення для Bot API.
      var url  = TG_ENDPOINT ||
                 ('https://api.telegram.org/bot' + TG_BOT_TOKEN + '/sendMessage');
      var payload = TG_ENDPOINT ? data : {
        chat_id: TG_CHAT_ID,
        text: buildMessage(data),
        parse_mode: 'HTML',
        disable_web_page_preview: true
      };

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res || res.ok !== true) {
            throw new Error((res && (res.description || res.error)) || 'send failed');
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
