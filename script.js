/* ==========================================================================
   Shivam Kumar · portfolio
   GSAP + ScrollTrigger, native scroll, no build step.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mouse = { x: -9999, y: -9999, active: false };

  window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }, { passive: true });
  document.addEventListener('mouseleave', () => { mouse.active = false; });

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ------------------------------------------------------------- 2D noise */
  const perm = new Uint8Array(512);
  {
    const p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const X = xi & 255, Y = yi & 255;
    x -= xi; y -= yi;
    const u = fade(x), v = fade(y);
    const a = perm[X] + Y, b = perm[X + 1] + Y;
    return lerp(
      lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u),
      lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u),
      v
    );
  }

  /* ------------------------------------------------------ signal field */
  // A ridgeline plot drawn back to front: each line fills beneath itself so
  // nearer ridges hide the ones behind. The cursor raises a swell in it.
  class Field {
    constructor(canvas, opts) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.o = Object.assign({ lines: 44, top: 0.3, bottom: 1.02, peak: 7, step: 7, calm: false, bg: '#0b0b0e', fg: '242,242,244', acc: '#d4ff3a' }, opts);
      this.t = Math.random() * 50;
      this.mx = -9999; this.my = -9999;
      this.intro = 0; this.flat = 0;
      this.running = false;
      this.resize();
      new ResizeObserver(() => this.resize()).observe(canvas);
      new IntersectionObserver(([e]) => { e.isIntersecting ? this.start() : this.stop(); }, { rootMargin: '80px' }).observe(canvas);
    }
    resize() {
      const r = this.c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = r.width; this.h = r.height;
      this.c.width = Math.round(r.width * dpr);
      this.c.height = Math.round(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.o.lines = this.w < 700 ? Math.round(this.o.baseLines * .62) : this.o.baseLines;
      this.draw();
    }
    start() {
      if (this.running || reduce) return;
      this.running = true;
      let last = performance.now();
      const loop = (now) => {
        if (!this.running) return;
        this.t += Math.min(now - last, 50) / 1000;
        last = now;
        this.follow();
        this.draw();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
    stop() { this.running = false; cancelAnimationFrame(this.raf); }
    follow() {
      const r = this.c.getBoundingClientRect();
      let tx, ty;
      if (fine && mouse.active) { tx = mouse.x - r.left; ty = mouse.y - r.top; }
      else { tx = this.w * (0.5 + 0.34 * Math.sin(this.t * 0.37)); ty = this.h * (this.o.top + 0.3 + 0.18 * Math.sin(this.t * 0.61)); }
      if (this.mx < -9000) { this.mx = tx; this.my = ty; }
      this.mx = lerp(this.mx, tx, 0.09);
      this.my = lerp(this.my, ty, 0.09);
    }
    draw() {
      const { ctx, w, h, o } = this;
      if (!w) return;
      ctx.clearRect(0, 0, w, h);
      const n = o.lines;
      const y0 = h * o.top, y1 = h * o.bottom;
      const gap = (y1 - y0) / (n - 1);
      const k = (1 - this.intro) * (1 - this.flat);
      const t = this.t;
      const sigma = Math.max(70, w * 0.07);
      const pulseX = ((t * 0.16) % 1.4 - 0.2) * w;
      const pulseLine = Math.floor(t * 0.16 / 1.4 * 7) % n;
      let hot = -1, hotDist = 1e9;
      for (let i = 0; i < n; i++) { const d = Math.abs(y0 + i * gap - this.my); if (d < hotDist) { hotDist = d; hot = i; } }
      if (hotDist > gap * 3) hot = -1;

      for (let i = 0; i < n; i++) {
        const by = y0 + i * gap;
        const line = new Path2D();
        const drift = 0.5 + 0.1 * Math.sin(i * 0.9 + t * 0.2);
        for (let x = -o.step; x <= w + o.step; x += o.step) {
          const nx = x / w;
          let hgt;
          if (o.calm) {
            hgt = (noise(x * 0.01 + i * 3.1, t * 0.25 + i) * 0.5 + 0.5) * gap * 0.45;
            if (i === pulseLine) hgt += Math.exp(-((x - pulseX) ** 2) / (2 * 38 * 38)) * gap * 5.5;
          } else {
            const env = Math.exp(-(((nx - drift) / 0.22) ** 2));
            const a = noise(x * 0.0058 + i * 1.7, t * 0.16 + i * 0.13) * 0.5 + 0.5;
            const b = noise(x * 0.022 - i * 0.9, t * 0.33 + i * 0.05) * 0.5 + 0.5;
            hgt = (a ** 2.4) * env * gap * o.peak + b * gap * 0.42 * (0.35 + env);
          }
          const dx = x - this.mx, dy = by - this.my;
          hgt += Math.exp(-(dx * dx) / (2 * sigma * sigma) - (dy * dy) / (2 * 80 * 80)) * gap * (o.calm ? 3.2 : 4.6);
          const y = by - hgt * k;
          x === -o.step ? line.moveTo(x, y) : line.lineTo(x, y);
        }
        const fill = new Path2D(line);
        fill.lineTo(w + o.step, h + 2);
        fill.lineTo(-o.step, h + 2);
        fill.closePath();
        ctx.fillStyle = o.bg;
        ctx.fill(fill);
        const depth = i / (n - 1);
        if (i === hot) { ctx.strokeStyle = o.acc; ctx.lineWidth = 1.6; }
        else { ctx.strokeStyle = `rgba(${o.fg},${0.16 + depth * 0.5})`; ctx.lineWidth = 1; }
        ctx.stroke(line);
      }
    }
  }

  // If a pinned panel's content is taller than the screen, zoom it down to fit.
  function fitPanel(el) {
    const fit = () => {
      el.style.zoom = '';
      const need = el.scrollHeight;
      if (need > innerHeight + 1) el.style.zoom = (innerHeight / need).toFixed(4);
    };
    fit();
    ScrollTrigger.addEventListener('refreshInit', fit);
  }

  /* --------------------------------------------------------------- theme */
  const THEMES = {
    ink: { '--bg': '#0b0b0e', '--fg': '#f2f2f4', '--acc': '#d4ff3a' },
    fincard: { '--bg': '#4a2fe0', '--fg': '#ffffff', '--acc': '#d4ff3a' },
    sendme: { '--bg': '#0e3b2f', '--fg': '#eafff5', '--acc': '#5cf2c8' },
    indikosh: { '--bg': '#dbe6ff', '--fg': '#0b1530', '--acc': '#1f5cff' },
    vendor: { '--bg': '#17181c', '--fg': '#f1f1f3', '--acc': '#ffb020' },
    rfq: { '--bg': '#101c52', '--fg': '#eef3ff', '--acc': '#7fe3ff' },
    rental: { '--bg': '#f6dde3', '--fg': '#1b0b12', '--acc': '#d6246e' },
    jod: { '--bg': '#3a0d18', '--fg': '#fbeff1', '--acc': '#e8c06a' },
    paper: { '--bg': '#ececee', '--fg': '#0b0b0e', '--acc': '#4a2fe0' },
    volt: { '--bg': '#d4ff3a', '--fg': '#0b0b0e', '--acc': '#0b0b0e' },
  };
  const metaTheme = $('meta[name="theme-color"]');
  let theme = 'ink';
  function setTheme(name, instant) {
    if (!THEMES[name] || name === theme) return;
    theme = name;
    gsap.to(root, { ...THEMES[name], duration: instant || reduce ? 0 : 0.75, ease: 'power2.out', overwrite: 'auto' });
    metaTheme.setAttribute('content', THEMES[name]['--bg']);
  }

  /* ------------------------------------------------------ chapter label */
  const chNo = $('.nav__chapter-no');
  const chName = $('.nav__chapter-name');
  let chapter = '00|Home';
  function setChapter(value) {
    if (value === chapter) return;
    chapter = value;
    const [no, name] = value.split('|');
    chNo.textContent = no;
    const old = chName.firstElementChild;
    const next = document.createElement('span');
    next.textContent = name;
    chName.appendChild(next);
    if (reduce) { old.remove(); return; }
    gsap.fromTo(next, { yPercent: 0 }, { yPercent: -100, duration: 0.5, ease: 'power3.inOut' });
    gsap.to(old, { yPercent: -100, duration: 0.5, ease: 'power3.inOut', onComplete: () => { old.remove(); gsap.set(next, { yPercent: 0 }); } });
  }

  /* -------------------------------------------------------------- cursor */
  function initCursor() {
    if (!fine || reduce) return;
    root.classList.add('has-cursor');
    const cur = $('.cursor');
    const label = $('.cursor__label');
    const dx = gsap.quickTo('.cursor__dot', 'x', { duration: 0.08 });
    const dy = gsap.quickTo('.cursor__dot', 'y', { duration: 0.08 });
    const rx = gsap.quickTo('.cursor__ring', 'x', { duration: 0.45, ease: 'power3' });
    const ry = gsap.quickTo('.cursor__ring', 'y', { duration: 0.45, ease: 'power3' });
    window.addEventListener('mousemove', (e) => { cur.classList.add('is-live'); dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.remove('is-live'));
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('a, button, [data-cursor]');
      if (!t) return;
      label.textContent = t.dataset.cursor || '';
      cur.classList.toggle('is-hover', !!t.dataset.cursor);
      cur.classList.toggle('is-link', !t.dataset.cursor);
    });
    document.addEventListener('mouseout', (e) => {
      const t = e.target.closest('a, button, [data-cursor]');
      if (t && !t.contains(e.relatedTarget)) cur.classList.remove('is-hover', 'is-link');
    });
  }

  /* ---------------------------------------------------------------- hero */
  let heroField;
  function initHero() {
    heroField = new Field($('.hero__field'), { baseLines: 46, top: 0.34, bottom: 1.04, peak: 7.5 });
    heroField.intro = 1;

    const letters = [];
    $$('.hero__line').forEach((line) => {
      const text = line.textContent;
      line.textContent = '';
      [...text].forEach((c) => {
        const mask = document.createElement('span');
        mask.className = 'ch-mask';
        const ch = document.createElement('span');
        ch.className = 'ch';
        ch.textContent = c;
        mask.appendChild(ch);
        line.appendChild(mask);
        letters.push({ el: ch, wd: 100, wg: 800 });
      });
    });
    const els = letters.map((l) => l.el);
    const apply = (l) => { l.el.style.fontVariationSettings = `"wdth" ${l.wd.toFixed(1)}, "wght" ${l.wg.toFixed(0)}`; };

    let live = false;
    if (reduce) {
      heroField.intro = 0;
      heroField.draw();
      live = false;
    } else {
      letters.forEach((l) => { l.wd = 62; l.wg = 200; apply(l); });
      gsap.set(els, { yPercent: 108 });
      const tl = gsap.timeline({ delay: 0.2 });
      tl.to(els, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.045 })
        .to(letters, { wd: 100, wg: 800, duration: 1.5, ease: 'expo.inOut', stagger: 0.045, onUpdate() { this.targets().forEach(apply); } }, 0.25)
        .to(heroField, { intro: 0, duration: 2.4, ease: 'expo.out' }, 0.1)
        .from('.hero__top, .hero__foot', { autoAlpha: 0, y: 24, duration: 0.9, ease: 'power3.out', stagger: 0.12 }, 0.8)
        .add(() => { live = true; });
    }

    // letters swell toward the cursor, and breathe on touch screens
    const hero = $('.hero');
    let heroVisible = true;
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);
    let t0 = 0;
    const loop = () => {
      requestAnimationFrame(loop);
      if (!live || !heroVisible) return;
      t0 += 0.016;
      const rects = fine ? els.map((el) => el.getBoundingClientRect()) : null;
      letters.forEach((l, i) => {
        let inf;
        if (fine) {
          if (!mouse.active) inf = 0;
          else {
            const r = rects[i];
            const d = Math.hypot(mouse.x - (r.left + r.width / 2), mouse.y - (r.top + r.height / 2));
            inf = Math.exp(-((d / 240) ** 2));
          }
        } else {
          inf = (Math.sin(t0 * 1.3 - i * 0.55) * 0.5 + 0.5) * 0.55;
        }
        const tw = 100 + 25 * inf, tg = 800 + 100 * inf;
        l.wd = lerp(l.wd, tw, 0.12);
        l.wg = lerp(l.wg, tg, 0.12);
        apply(l);
      });
    };
    if (!reduce) requestAnimationFrame(loop);

    // scroll out: the signal flattens and the name pulls apart
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: (self) => { heroField.flat = self.progress; if (!heroField.running) heroField.draw(); },
    });
    if (!reduce) {
      gsap.to('.hero__line:first-child', { xPercent: -14, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__line--r', { xPercent: 14, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.fromTo('.hero__foot, .hero__top', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -40, ease: 'none', immediateRender: false, scrollTrigger: { trigger: hero, start: '30% top', end: '70% top', scrub: true } });
    }
  }

  /* ----------------------------------------------------------- statement */
  function initStatement() {
    const text = $('.statement__text');
    const items = [];
    [...text.childNodes].forEach((node) => {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w';
          w.textContent = part;
          frag.appendChild(w);
          items.push(w);
        });
        node.replaceWith(frag);
      } else if (node.classList && node.classList.contains('glyph')) {
        items.push(node);
      }
    });
    const caret = document.createElement('span');
    caret.className = 'statement__caret';
    text.prepend(caret);

    const pin = $('.statement__pin');
    const label = $('.statement__label');
    const fitText = () => {
      text.style.fontSize = '';
      const cs = getComputedStyle(pin);
      const avail = innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - label.offsetHeight - parseFloat(cs.rowGap || 0) - 8;
      let fs = parseFloat(getComputedStyle(text).fontSize);
      while (text.offsetHeight > avail && fs > 14) {
        fs *= 0.94;
        text.style.fontSize = fs + 'px';
      }
    };
    fitText();
    ScrollTrigger.addEventListener('refreshInit', fitText);

    let current = -1;
    const place = (idx, instant) => {
      if (idx === current) return;
      current = idx;
      items.forEach((el, i) => { el.classList.toggle('is-read', i < idx); el.classList.toggle('is-now', i === idx); });
      const el = items[idx];
      if (!el) { gsap.to(caret, { opacity: 0, duration: 0.3 }); return; }
      const pad = parseFloat(getComputedStyle(text).fontSize) * 0.06;
      gsap.to(caret, {
        x: el.offsetLeft - pad, y: el.offsetTop + el.offsetHeight * 0.02, width: el.offsetWidth + pad * 2, height: el.offsetHeight * 0.98,
        opacity: 1, duration: instant ? 0 : 0.28, ease: 'power3.out', overwrite: true,
      });
    };

    ScrollTrigger.create({
      trigger: '.statement', start: 'top top', end: '+=170%', pin: true, pinSpacing: true,
      onUpdate: (self) => place(Math.min(items.length, Math.floor(self.progress * (items.length + 1)))),
      onRefresh: (self) => { current = -1; place(Math.min(items.length, Math.floor(self.progress * (items.length + 1))), true); },
    });
    gsap.from('.statement__label', { autoAlpha: 0, x: -20, duration: 0.8, scrollTrigger: { trigger: '.statement', start: 'top 70%' } });
  }

  /* --------------------------------------------------------- split-flap */
  const FLAP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-&';
  class Flap {
    constructor(parent) {
      const el = document.createElement('span');
      el.className = 'flap';
      el.innerHTML = '<span class="flap__h flap__h--t"><span class="flap__c"></span></span><span class="flap__h flap__h--b"><span class="flap__c"></span></span><span class="flap__h flap__h--ft"><span class="flap__c"></span></span><span class="flap__h flap__h--fb"><span class="flap__c"></span></span>';
      parent.appendChild(el);
      this.halves = [...el.children];
      [this.t, this.b, this.ft, this.fb] = this.halves.map((x) => x.firstChild);
      this.cur = ' ';
      this.tl = null;
    }
    snap(ch) {
      this.cur = ch;
      this.t.textContent = this.b.textContent = this.ft.textContent = this.fb.textContent = ch;
      gsap.set([this.halves[2], this.halves[3]], { visibility: 'hidden', rotationX: 0 });
    }
    to(target, delay, force) {
      if (this.tl) { if (force) return; this.tl.kill(); this.tl = null; this.snap(this.cur); }
      if (target === this.cur && !force) return;
      if (reduce) { this.snap(target); return; }
      const hops = (force ? 2 : 1) + ((Math.random() * 3) | 0);
      const seq = [];
      for (let i = 0; i < hops; i++) seq.push(FLAP_CHARS[(Math.random() * FLAP_CHARS.length) | 0]);
      seq.push(target);
      const tl = gsap.timeline({ delay, onComplete: () => { this.tl = null; } });
      const [, , ftH, fbH] = this.halves;
      seq.forEach((next) => {
        tl.call(() => {
          const from = this.cur;
          this.t.textContent = next; this.b.textContent = from;
          this.ft.textContent = from; this.fb.textContent = next;
          gsap.set(ftH, { visibility: 'visible', rotationX: 0 });
          gsap.set(fbH, { visibility: 'visible', rotationX: 90 });
        });
        tl.to(ftH, { rotationX: -90, duration: 0.06, ease: 'power1.in' });
        tl.to(fbH, { rotationX: 0, duration: 0.07, ease: 'power1.out' });
        tl.call(() => { this.b.textContent = next; this.cur = next; gsap.set([ftH, fbH], { visibility: 'hidden' }); });
      });
      this.tl = tl;
    }
  }

  /* ------------------------------------------------------------ work index */
  function initBoard() {
    const GROUPS = [['no', 2], ['name', 16], ['kind', 11], ['status', 8]];
    const rows = $$('.dep__rows a').map((a) => {
      const flaps = {};
      GROUPS.forEach(([key, n]) => {
        const wrap = document.createElement('span');
        wrap.className = `dep__g dep__g--${key}`;
        wrap.setAttribute('aria-hidden', 'true');
        wrap.style.gridTemplateColumns = `repeat(${n}, minmax(0, 1fr))`;
        a.appendChild(wrap);
        flaps[key] = [...Array(n)].map(() => new Flap(wrap));
      });
      if (a.dataset.status === 'LIVE') a.classList.add('is-live');
      return { a, flaps };
    });
    const flipRow = (r, delay) => GROUPS.forEach(([key, n], gi) => {
      const text = (r.a.dataset[key] || '').padEnd(n, ' ').slice(0, n);
      r.flaps[key].forEach((f, k) => f.to(text[k], delay + gi * 0.07 + k * 0.022));
    });
    ScrollTrigger.create({ trigger: '.dep', start: 'top 82%', once: true, onEnter: () => rows.forEach((r, i) => flipRow(r, i * 0.11)) });
    rows.forEach((r) => {
      r.a.addEventListener('mouseenter', () => r.flaps.name.forEach((f, k) => { if (f.cur !== ' ') f.to(f.cur, k * 0.02, true); }));
      r.a.addEventListener('click', (e) => {
        const film = $(r.a.hash);
        const st = film && ScrollTrigger.getAll().find((s) => s.trigger === film && s.pin);
        if (!st) return;
        e.preventDefault();
        window.scrollTo({ top: st.start + 2, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
    if (window.SplitText && !reduce) {
      const split = SplitText.create('.work__title', { type: 'chars', mask: 'chars' });
      gsap.from(split.chars, { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: '.work', start: 'top 70%' } });
    }
  }

  /* ---------------------------------------------------------------- films */
  // Every project is a pinned film: a title card, then a few beats, while a
  // device on stage acts the product out. Scenes read the timeline's time.
  const seg = (t, a, d) => clamp((t - a) / d, 0, 1);
  const inOut = gsap.parseEase('power2.inOut');
  const out2 = gsap.parseEase('power2.out');
  const setText = (el, v) => { if (el.textContent !== v) el.textContent = v; };
  const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

  const SCENES = {
    fincard(root, tl, at, on) {
      const q = (s) => $(s, root), qa = (s) => $$(s, root);
      const CIRC = 414.7;
      const frags = qa('.frag');
      gsap.set(q('.checks'), { autoAlpha: 0 });
      tl.fromTo(frags, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.03, ease: 'back.out(1.6)' }, 0.45)
        .to(frags, { left: '50%', top: '50%', xPercent: -50, yPercent: -50, scale: 0.2, autoAlpha: 0, duration: 0.5, stagger: 0.025, ease: 'power3.in' }, at(1) - 0.3)
        .to(q('.phone'), { scale: 1.04, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.inOut' }, at(1) + 0.15)
        .to(q('.scr--splash'), { autoAlpha: 0, scale: 1.08, duration: 0.25 }, at(1) + 0.2)
        .fromTo(q('.scr--home'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, immediateRender: false }, at(1) + 0.2)
        .fromTo(q('.ring__val'), { strokeDashoffset: CIRC }, { strokeDashoffset: CIRC * 0.36, duration: 0.6, ease: 'power2.out' }, at(1) + 0.3)
        .from(qa('.ringbox__label, .ringbox__line'), { autoAlpha: 0, y: 12, duration: 0.2, stagger: 0.05 }, at(1) + 0.7)
        .to(q('.ringbox'), { scale: 0.9, duration: 0.35 }, at(2))
        .to(q('.checks'), { autoAlpha: 1, duration: 0.01 }, at(2) + 0.05)
        .from(qa('.chk'), { autoAlpha: 0, y: 28, rotationX: -40, duration: 0.3, stagger: 0.06, ease: 'power3.out' }, at(2) + 0.05)
        .from(qa('.chk em'), { scale: 0.6, autoAlpha: 0, duration: 0.2, stagger: 0.08, ease: 'back.out(2)' }, at(2) + 0.45)
        .to(q('.scr--home'), { xPercent: -24, autoAlpha: 0, duration: 0.3 }, at(3))
        .fromTo(q('.scr--sim'), { xPercent: 34, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.3, immediateRender: false }, at(3));

      const score = q('.js-score'), sim = q('.js-sim'), delta = q('.js-delta'), label = q('.js-sim-label');
      const lv1 = q('.js-lv1'), lv2 = q('.js-lv2');
      const lf1 = q('.js-lf1'), lt1 = q('.js-lt1'), lf2 = q('.js-lf2'), lt2 = q('.js-lt2');
      on((t) => {
        setText(score, String(Math.round(64 * out2(seg(t, at(1) + 0.3, 0.6)))));
        const k = inOut(seg(t, at(3) + 0.25, 0.55));
        const s = Math.round(64 + 12 * k);
        setText(sim, String(s));
        setText(delta, '+' + (s - 64));
        setText(label, s >= 75 ? 'Strong' : 'On track');
        label.classList.toggle('is-strong', s >= 75);
        const p1 = 20 + 52 * k, p2 = 70 - 52 * k;
        lf1.style.width = p1 + '%'; lt1.style.left = p1 + '%';
        lf2.style.width = p2 + '%'; lt2.style.left = p2 + '%';
        setText(lv1, inr(Math.round((40000 + 80000 * k) / 500) * 500));
        setText(lv2, inr(Math.round((31200 - 23200 * k) / 100) * 100));
      });
    },

    sendme(root, tl, at, on) {
      const q = (s) => $(s, root), qa = (s) => $$(s, root);
      const routes = qa('.map__route'), riders = qa('.map__rider'), halos = qa('.map__halo');
      const len = routes[0].getTotalLength();
      gsap.set(routes, { strokeDasharray: len, strokeDashoffset: len });
      tl.to(routes, { strokeDashoffset: 0, duration: 0.55 }, at(0) + 0.05);
      const pks = qa('.relay__pk');
      const fwd = pks.filter((p) => !p.classList.contains('relay__pk--b'));
      const back = pks.filter((p) => p.classList.contains('relay__pk--b'));
      tl.fromTo(fwd, { left: '0%' }, { left: '100%', duration: 0.22, repeat: 3, stagger: 0.1, ease: 'none' }, at(1))
        .fromTo(back, { left: '100%' }, { left: '0%', duration: 0.22, repeat: 3, ease: 'none' }, at(1) + 0.05)
        .fromTo(q('.ai-chip'), { autoAlpha: 0, y: 16, scale: 0.85 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(2)' }, at(2) + 0.35);
      const node = q('.relay__node');
      const eta = q('.js-eta'), sc = q('.js-status-c'), sr = q('.js-status-r'), btn = q('.js-btn');
      const steps = qa('.sm__steps li');
      const ease = gsap.parseEase('power1.inOut');
      on((t) => {
        const p = ease(seg(t, at(1) + 0.1, 0.75)) * 0.6 + ease(seg(t, at(2) + 0.05, 0.4)) * 0.4;
        const pt = routes[0].getPointAtLength(p * len);
        [...riders, ...halos].forEach((c) => { c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); });
        const live = t > at(1) - 0.05 && t < at(2) + 0.3;
        pks.forEach((k) => { k.style.opacity = live ? 1 : 0; });
        node.classList.toggle('is-live', live);
        const done = t > at(2) + 0.45;
        setText(eta, done ? '0' : String(Math.max(1, Math.round(12 - 11 * p))));
        const phase = t < at(0) + 0.35 ? 0 : t < at(1) + 0.1 ? 1 : done ? 3 : 2;
        setText(sc, ['Finding a rider', 'Rider assigned · Arjun', 'On the way', 'Delivered'][phase]);
        setText(sr, ['New order · 1.2 km', 'Heading to pickup', 'Drop at Sardarpura', 'Delivered'][phase]);
        setText(btn, ['Accept order', 'Picked up', 'Mark delivered', 'Done'][phase]);
        [at(0) + 0.1, at(1) + 0.1, at(1) + 0.4, at(2) + 0.45].forEach((th, i) => steps[i].classList.toggle('is-done', t > th));
      });
    },

    indikosh(root, tl, at, on) {
      const q = (s) => $(s, root), qa = (s) => $$(s, root);
      const tabs = qa('.ik__tabs span'), ink = q('.ik__ink'), qEl = q('.js-ik-q'), dEl = q('.js-ik-d');
      const TABS = [
        ['<b>JDH</b> → <b>DEL</b>', 'Fri, 14 Nov · 1 adult · Economy'],
        ['<b>New Delhi</b>', '14 to 16 Nov · 2 nights · 1 room'],
        ['<b>JDH</b> → <b>JAI</b>', 'Fri, 14 Nov · Sleeper · 1 seat'],
      ];
      const rows = qa('.ik__res li');
      tl.fromTo(rows, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.1, ease: 'power3.out' }, at(1) + 0.05)
        .from(qa('.ik__res .src'), { scale: 0.5, autoAlpha: 0, duration: 0.2, stagger: 0.1, ease: 'back.out(2)' }, at(1) + 0.25)
        .fromTo(q('.ik__sheet'), { yPercent: 110 }, { yPercent: 0, duration: 0.25, ease: 'power3.out' }, at(2) + 0.02)
        .to(q('.ik__sheet'), { yPercent: 110, duration: 0.2, ease: 'power2.in' }, at(2) + 0.38)
        .fromTo(q('.ik__ticket'), { autoAlpha: 0, y: 40, scale: 0.9 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.25, ease: 'back.out(1.4)' }, at(2) + 0.6);
      let tab = -1;
      on((t) => {
        const s = seg(t, at(0) + 0.05, 0.8);
        const i = s < 0.25 ? 0 : s < 0.5 ? 1 : s < 0.75 ? 2 : 0;
        if (i !== tab) {
          tab = i;
          tabs.forEach((x, k) => x.classList.toggle('is-on', k === i));
          ink.style.transform = `translateX(${i * 100}%)`;
          qEl.innerHTML = TABS[i][0];
          dEl.textContent = TABS[i][1];
        }
        rows[0].classList.toggle('is-pick', t > at(2));
      });
    },

    vendor(root, tl, at, on) {
      const q = (s) => $(s, root), qa = (s) => $$(s, root);
      const views = qa('.vw');
      gsap.set(views.slice(1), { autoAlpha: 0 });
      [1, 2].forEach((i) => {
        tl.to(views[i - 1], { autoAlpha: 0, y: -20, duration: 0.25 }, at(i) - 0.05)
          .fromTo(views[i], { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.3, immediateRender: false }, at(i) + 0.1);
      });
      const cellsWrap = q('.cells');
      const cells = [...Array(48)].map(() => { const c = document.createElement('i'); cellsWrap.appendChild(c); return c; });
      const trs = qa('.res tr').slice(1);
      tl.from(q('.bubble'), { autoAlpha: 0, y: 16, scale: 0.95, duration: 0.25 }, at(2) + 0.05)
        .fromTo(trs, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15, stagger: 0.08 }, at(2) + 0.62)
        .fromTo(q('.scope'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, at(2) + 0.85);
      const side = qa('.win__side span'), card = q('.tcard'), cols = qa('.flow__col'), role = q('.js-vrole');
      const chunk = q('.js-chunk'), file = q('.file'), sql = q('.js-sql');
      const ROLE = ['Submitted by vendor', 'Waiting on manager', 'Waiting on finance', 'Approved and ready to pay'];
      const SQL = "SELECT v.name, b.amount, SUM(t.billed) AS billed\nFROM vendors v\nJOIN budgets b ON b.vendor_id = v.id\nJOIN timesheets t ON t.vendor_id = v.id\nWHERE t.month = '2026-08'\n  AND v.id IN (:allowed_vendor_ids)\nGROUP BY v.id HAVING billed > b.amount;";
      let lastK = -1;
      on((t) => {
        const beat = t < at(1) ? 0 : t < at(2) ? 1 : 2;
        side.forEach((x, i) => x.classList.toggle('is-on', i === [2, 3, 4][beat]));
        const f = seg(t, at(0) + 0.1, 0.75) * 3;
        const whole = Math.min(2, Math.floor(f));
        const pos = f >= 3 ? 3 : whole + inOut(f - whole);
        card.style.setProperty('--i', pos.toFixed(3));
        const col = Math.round(pos);
        cols.forEach((c, i) => c.classList.toggle('is-on', i === col));
        setText(role, ROLE[col]);
        const k = Math.floor(seg(t, at(1) + 0.1, 0.6) * 12);
        if (k !== lastK) {
          lastK = k;
          cells.forEach((c, i) => c.classList.toggle('is-on', i < k * 4));
          chunk.textContent = `Chunk ${k} / 12`;
          file.classList.toggle('is-on', k === 12);
        }
        setText(sql, SQL.slice(0, Math.round(seg(t, at(2) + 0.15, 0.45) * SQL.length)));
      });
    },

    rfq(root, tl, at, on) {
      const q = (s) => $(s, root), qa = (s) => $$(s, root);
      const doc = q('.doc'), scan = q('.doc__scan'), items = qa('.doc__lines .is-item');
      const out = q('.rfq__out');
      gsap.set(doc, { rotation: -4 });
      tl.fromTo(doc, { xPercent: 50 }, { xPercent: 0, duration: 0.4 }, at(1) - 0.15)
        .fromTo(out, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out' }, at(1) - 0.05)
        .fromTo(qa('.est tbody tr'), { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, duration: 0.25, stagger: 0.08, ease: 'power3.out' }, at(1) + 0.15)
        .fromTo(qa('.est .src'), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.2, stagger: 0.09, ease: 'back.out(2)' }, at(2) + 0.2)
        .fromTo(q('.report'), { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.25 }, at(2) + 0.75);
      const rates = qa('.js-rate'), total = q('.js-total');
      let marks = null;
      on((t) => {
        const s = seg(t, at(0) + 0.05, 0.75);
        scan.style.top = (s * 100).toFixed(2) + '%';
        scan.style.opacity = s > 0 && s < 1 ? 1 : 0;
        if (!marks) marks = items.map((it) => (it.offsetTop + it.parentElement.offsetTop) / doc.offsetHeight);
        items.forEach((it, i) => it.style.setProperty('--hl', clamp((s - marks[i]) / 0.08, 0, 1).toFixed(3)));
        let sum = 0;
        rates.forEach((el, i) => {
          const f = seg(t, at(2) + 0.05 + i * 0.09, 0.25);
          setText(el, f === 0 ? '…' : inr(+el.dataset.v * f));
          sum += +el.dataset.v * +el.dataset.q * f;
        });
        setText(total, inr(sum));
      });
    },

    rental(root, tl, at, on) {
      const q = (s) => $(s, root), qa = (s) => $$(s, root);
      const views = qa('.mr__v');
      gsap.set(views.slice(1), { autoAlpha: 0 });
      [1, 2].forEach((i) => {
        tl.to(views[i - 1], { autoAlpha: 0, y: -20, duration: 0.25 }, at(i) - 0.05)
          .fromTo(views[i], { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.3, immediateRender: false }, at(i) + 0.1);
      });
      const sig = q('.sig');
      const L = sig.getTotalLength();
      gsap.set(sig, { strokeDasharray: L, strokeDashoffset: L });
      tl.from(q('.mr__app'), { autoAlpha: 0, x: -30, duration: 0.3 }, at(0) + 0.05)
        .from(q('.lease'), { autoAlpha: 0, y: 40, duration: 0.35 }, at(0) + 0.15)
        .to(sig, { strokeDashoffset: 0, duration: 0.45, ease: 'power1.inOut' }, at(0) + 0.35)
        .fromTo(q('.stamp'), { autoAlpha: 0, scale: 1.8, rotation: -8 }, { autoAlpha: 1, scale: 1, rotation: -8, duration: 0.15, ease: 'power2.in' }, at(0) + 0.82);
      const paths = qa('.route__p');
      const lens = paths.map((p) => p.getTotalLength());
      paths.forEach((p, i) => gsap.set(p, { strokeDasharray: lens[i], strokeDashoffset: lens[i] }));
      tl.to(paths[0], { strokeDashoffset: 0, duration: 0.2 }, at(1) + 0.15)
        .to(paths.slice(1), { strokeDashoffset: 0, duration: 0.25, stagger: 0.05 }, at(1) + 0.3)
        .fromTo(qa('.js-amt'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, stagger: 0.08 }, at(1) + 0.5)
        .fromTo(qa('.months li'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.25, stagger: 0.06 }, at(2) + 0.15)
        .fromTo(qa('.months em'), { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.15, stagger: 0.08, ease: 'back.out(2)' }, at(2) + 0.4);
      const dots = qa('.route__dot'), toggle = q('.toggle');
      on((t) => {
        const s = t - (at(1) + 0.45);
        const live = s > 0 && t < at(2) + 0.1;
        dots.forEach((d, k) => {
          d.style.opacity = live ? 1 : 0;
          if (!live) return;
          const u = (s * 1.4 + k * 0.25) % 1;
          const di = (k % 3) + 1;
          const pt = u < 0.4 ? paths[0].getPointAtLength((u / 0.4) * lens[0]) : paths[di].getPointAtLength(((u - 0.4) / 0.6) * lens[di]);
          d.setAttribute('cx', pt.x); d.setAttribute('cy', pt.y);
        });
        toggle.classList.toggle('is-on', t > at(2) + 0.1);
      });
    },

    jod(root, tl, at, on) {
      const q = (s) => $(s, root), qa = (s) => $$(s, root);
      const pieces = [q('.site__nav'), q('.site__hero'), ...qa('.site__cards > div')];
      const toast = q('.toast'), cms = q('.cms'), term = q('.term');
      tl.fromTo(pieces, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.07, ease: 'power3.out' }, at(0))
        .fromTo(toast, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'back.out(2)' }, at(0) + 0.6)
        .to(toast, { autoAlpha: 0, duration: 0.15 }, at(1) - 0.1)
        .fromTo(cms, { xPercent: 105 }, { xPercent: 0, duration: 0.3, ease: 'power3.out' }, at(1))
        .to(cms, { xPercent: 105, duration: 0.25 }, at(2) - 0.05)
        .fromTo(term, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power3.out' }, at(2));
      const cmsEl = q('.js-cms'), hero = q('.js-hero-t'), termEl = q('.js-term');
      const S1 = 'Protect the name you built.', S2 = 'Your brand, registered right.';
      const TERM = [
        '$ deploy jodlawfirm.com',
        '  server   aws ec2          ready',
        '  app      laravel          migrated',
        '  tls      certbot          valid',
        '  cdn      static assets    cached',
        '  https://jodlawfirm.com    200 OK',
      ];
      on((t) => {
        const u = seg(t, at(1) + 0.3, 0.5);
        let s = S1;
        if (u > 0) s = u < 0.4 ? S1.slice(0, Math.round(S1.length * (1 - u / 0.4))) : S2.slice(0, Math.round(S2.length * ((u - 0.4) / 0.6)));
        setText(cmsEl, s);
        setText(hero, s || ' ');
        setText(termEl, TERM.slice(0, Math.ceil(seg(t, at(2) + 0.2, 0.6) * TERM.length)).join('\n'));
      });
    },
  };

  function initFilms() {
    const T0 = 0.8;
    const at = (i) => T0 + i;
    $$('.film').forEach((film) => {
      const beats = $$('.beat', film);
      const n = beats.length;
      const title = $('.film__title', film);
      const name = $('.film__name', film);
      const stage = $('.film__stage', film);
      const foot = $('.film__foot', film);
      const stepsWrap = $('.film__steps', film);
      const steps = beats.map(() => { const i = document.createElement('i'); stepsWrap.appendChild(i); return i; });

      // title card: split, and shrink if a single word would overflow
      let chars = [name];
      let words = [name];
      if (window.SplitText) {
        const split = SplitText.create(name, { type: 'words,chars', wordsClass: 'fw' });
        chars = split.chars; words = split.words;
      }
      const fit = () => {
        name.style.fontSize = '';
        const max = title.clientWidth * 0.92;
        const widest = Math.max(...words.map((w) => w.offsetWidth));
        if (widest > max) name.style.fontSize = parseFloat(getComputedStyle(name).fontSize) * (max / widest) + 'px';
      };
      fit();
      ScrollTrigger.addEventListener('refreshInit', fit);

      const updaters = [];
      const on = (fn) => updaters.push(fn);
      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
      tl.to($$('.label, .film__sub', title), { autoAlpha: 0, y: -24, duration: 0.3 }, 0.05)
        .to(chars, { yPercent: -110, autoAlpha: 0, duration: 0.35, stagger: { amount: 0.22 }, ease: 'power2.in' }, 0.05)
        .fromTo(stage, { autoAlpha: 0, y: 90, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }, 0.35)
        .fromTo(beats[0], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out' }, 0.55)
        .fromTo(foot, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.65);
      for (let i = 1; i < n; i++) {
        tl.to(beats[i - 1], { autoAlpha: 0, y: -36, duration: 0.25, ease: 'power2.in' }, at(i) - 0.2)
          .fromTo(beats[i], { autoAlpha: 0, y: 44 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out' }, at(i) + 0.05);
      }
      // every device is scaled to fit the space its stage actually has
      const devices = $$('[data-tilt]', stage).map((device) => {
        const wrap = document.createElement('div');
        wrap.className = 'film__fit';
        device.parentNode.insertBefore(wrap, device);
        wrap.appendChild(device);
        return { wrap, device };
      });
      const fitStage = () => {
        const w = stage.clientWidth, h = stage.clientHeight;
        devices.forEach(({ wrap, device }) => {
          const k = Math.min(1, w / device.offsetWidth, h / device.offsetHeight);
          wrap.style.scale = k.toFixed(4);
        });
      };
      fitStage();
      ScrollTrigger.addEventListener('refresh', fitStage);

      const scene = SCENES[film.dataset.film];
      if (scene) scene(film, tl, at, on);
      tl.to({}, { duration: 0.01 }, at(n) + 0.15);

      const update = () => {
        const t = tl.time();
        updaters.forEach((f) => f(t));
        const cur = t < T0 - 0.2 ? -1 : clamp(Math.floor(t - T0 + 0.2), 0, n - 1);
        steps.forEach((s, k) => s.classList.toggle('is-on', k === cur));
      };
      tl.eventCallback('onUpdate', update);
      update();

      ScrollTrigger.create({
        animation: tl, trigger: film, start: 'top top',
        end: () => '+=' + Math.round((n + 1) * 72) + '%',
        pin: true, scrub: 0.8, invalidateOnRefresh: true,
      });

      // the device leans toward the cursor
      if (fine && !reduce) {
        $$('[data-tilt]', film).forEach((el) => {
          gsap.set(el, { transformPerspective: 1400 });
          const rx = gsap.quickTo(el, 'rotationX', { duration: 0.8, ease: 'power3' });
          const ry = gsap.quickTo(el, 'rotationY', { duration: 0.8, ease: 'power3' });
          film.addEventListener('mousemove', (e) => {
            const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
            rx(-ny * 8); ry(nx * 11);
          });
        });
        const frags = $('.frags', film);
        if (frags) {
          const fx = gsap.quickTo(frags, 'x', { duration: 1, ease: 'power3' });
          const fy = gsap.quickTo(frags, 'y', { duration: 1, ease: 'power3' });
          film.addEventListener('mousemove', (e) => { fx(-(e.clientX / innerWidth - 0.5) * 40); fy(-(e.clientY / innerHeight - 0.5) * 30); });
        }
      }
    });
  }

  /* ---------------------------------------------------------------- drum */
  function initSkills() {
    const skills = $$('.skill');
    const n = skills.length;
    const ring = $('.drum__ring');
    const faces = skills.map((s) => {
      const f = document.createElement('div');
      f.className = 'drum__face';
      f.textContent = s.dataset.word;
      ring.appendChild(f);
      return f;
    });
    const step = 360 / n;
    let R = 0;
    const layout = () => {
      const hgt = ring.offsetHeight;
      R = (hgt / 2) / Math.tan(Math.PI / n);
      faces.forEach((f, i) => { f.style.transform = `rotateX(${-i * step}deg) translateZ(${R}px)`; });
      render();
    };
    const state = { v: 0 };
    let active = 0;
    const render = () => {
      ring.style.transform = `translateZ(${-R}px) rotateX(${state.v * step}deg)`;
      faces.forEach((f, i) => {
        const rel = Math.abs(state.v - i);
        const near = clamp(1 - rel, 0, 1);
        f.style.visibility = rel >= 1.9 ? 'hidden' : 'visible';
        f.style.opacity = clamp(1 - rel * 0.45, 0.08, 1).toFixed(3);
        f.style.fontVariationSettings = `"wdth" ${(70 + 55 * near).toFixed(1)}, "wght" ${(300 + 600 * near).toFixed(0)}`;
      });
      const a = clamp(Math.round(state.v), 0, n - 1);
      if (a !== active) {
        const prev = skills[active];
        active = a;
        const next = skills[a];
        gsap.to(prev.children, { autoAlpha: 0, y: -14, duration: 0.2, overwrite: true, onComplete: () => prev.classList.remove('is-on') });
        next.classList.add('is-on');
        gsap.fromTo(next.children, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5, delay: 0.1, stagger: 0.05, ease: 'expo.out', overwrite: true });
      }
    };
    fitPanel($('.skills__pin'));
    gsap.to(state, {
      v: n - 1, ease: 'none', onUpdate: render,
      scrollTrigger: { trigger: '.skills', start: 'top top', end: () => '+=' + (n - 1) * 50 + '%', pin: true, scrub: 0.9, onRefresh: layout },
    });
    layout();
    gsap.from('.drum', { autoAlpha: 0, rotationX: -30, y: 60, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.skills', start: 'top 70%' } });
  }

  /* --------------------------------------------------------------- ruler */
  function initExperience() {
    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const BASE = 2019;
    const now = new Date();
    const nowIdx = (now.getFullYear() - BASE) * 12 + now.getMonth();
    const idx = (s) => { if (s === 'now') return nowIdx; const [y, m] = s.split('-').map(Number); return (y - BASE) * 12 + (m - 1); };
    const MIN = -5, MAX = nowIdx + 7;

    // two lanes of cards: work and study
    const cards = $('.exp__cards');
    const roles = $$('.role');
    const slots = {};
    [['work', 'Work', 'Still studying. My first job starts in December 2022.'], ['study', 'Study', 'Not studying at this point, working full-time.']].forEach(([key, name, empty]) => {
      const slot = document.createElement('div');
      slot.className = 'exp__slot';
      slot.innerHTML = `<p class="label">${name}</p><div class="exp__slot-body"><p class="exp__empty role">${empty}</p></div>`;
      cards.appendChild(slot);
      slots[key] = { body: slot.querySelector('.exp__slot-body'), empty: slot.querySelector('.exp__empty'), current: null };
    });
    const items = roles.map((r) => {
      const track = r.dataset.track;
      slots[track].body.appendChild(r);
      return { el: r, track, s: idx(r.dataset.start), e: idx(r.dataset.end), short: r.dataset.short };
    });

    const track = $('.js-ruler');
    let ppm = 30;
    const bars = [];
    const build = () => {
      ppm = clamp(innerWidth / 26, 18, 52);
      track.innerHTML = '';
      bars.length = 0;
      track.style.width = (MAX - MIN) * ppm + 'px';
      for (let m = MIN; m < MAX; m++) {
        const t = document.createElement('i');
        const year = ((m % 12) + 12) % 12 === 0;
        t.className = 'tick' + (year ? ' tick--year' : '');
        t.style.left = (m - MIN) * ppm + 'px';
        if (year) t.innerHTML = `<span class="tick__y">${BASE + Math.floor(m / 12)}</span>`;
        track.appendChild(t);
      }
      items.forEach((it) => {
        const b = document.createElement('span');
        b.className = 'bar bar--' + it.track;
        b.style.left = (it.s - MIN) * ppm + 'px';
        b.style.width = (it.e - it.s + 1) * ppm - 3 + 'px';
        b.innerHTML = `<span>${it.short}</span>`;
        track.appendChild(b);
        bars.push(b);
        it.left = (it.s - MIN) * ppm;
        it.width = (it.e - it.s + 1) * ppm - 3;
      });
      render(true);
    };

    const monthEl = $('.js-month'), yearEl = $('.js-year');
    const state = { v: 0 };
    let lastM = null;
    const render = (force) => {
      const W = track.parentElement.offsetWidth;
      const x = W / 2 - (state.v - MIN + 0.5) * ppm;
      gsap.set(track, { x });
      // keep each bar's label inside the visible part of the ruler
      items.forEach((it, i) => {
        const lab = bars[i] && bars[i].firstChild;
        if (!lab) return;
        const room = it.width - lab.offsetWidth - 20;
        lab.style.transform = `translateX(${clamp(-x - it.left, 0, Math.max(0, room))}px)`;
      });
      const m = Math.round(state.v);
      if (m === lastM && !force) return;
      lastM = m;
      monthEl.textContent = MONTHS[((m % 12) + 12) % 12];
      yearEl.textContent = BASE + Math.floor(m / 12);
      ['work', 'study'].forEach((key) => {
        const slot = slots[key];
        const hit = items.find((it) => it.track === key && m >= it.s && m <= it.e);
        const next = hit ? hit.el : slot.empty;
        if (slot.current === next) return;
        const prev = slot.current;
        slot.current = next;
        if (prev) gsap.to(prev, { autoAlpha: 0, y: -16, duration: 0.2, overwrite: true, onComplete: () => prev.classList.remove('is-on') });
        next.classList.add('is-on');
        gsap.fromTo(next, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: reduce ? 0 : 0.5, delay: prev ? 0.12 : 0, ease: 'expo.out', overwrite: true });
      });
      items.forEach((it, i) => bars[i] && bars[i].classList.toggle('is-on', m >= it.s && m <= it.e));
    };

    fitPanel($('.exp__pin'));
    gsap.to(state, {
      v: nowIdx, ease: 'none', onUpdate: () => render(),
      scrollTrigger: { trigger: '.exp', start: 'top top', end: '+=380%', pin: true, scrub: 0.7, onRefresh: build },
    });
    build();
  }

  /* ------------------------------------------------------------- contact */
  function initContact() {
    new Field($('.contact__field'), { baseLines: 22, top: 0.3, bottom: 1.05, calm: true });
    if (reduce) return;
    gsap.from('.contact__title > span', {
      yPercent: 60, autoAlpha: 0, rotationX: -50, transformOrigin: '50% 100%', duration: 1.1, ease: 'expo.out', stagger: 0.1,
      scrollTrigger: { trigger: '.contact', start: 'top 65%' },
    });
    gsap.from('.contact__lede, .contact__mail, .contact__links li, .contact__inner > .label', {
      y: 30, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07,
      scrollTrigger: { trigger: '.contact__title', start: 'top 60%' },
    });
  }

  /* -------------------------------------------------- section awareness */
  function initSections() {
    const sections = $$('main section[data-chapter]');
    const box = (el) => (el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el);
    let ticking = false;
    const check = () => {
      ticking = false;
      const mid = innerHeight * 0.5;
      for (const s of sections) {
        const r = box(s).getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) {
          setChapter(s.dataset.chapter);
          setTheme(s.dataset.theme);
          break;
        }
      }
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
    ScrollTrigger.addEventListener('refresh', check);
    check();
  }

  /* ---------------------------------------------------------------- boot */
  const boot = () => {
    initCursor();
    initHero();
    initStatement();
    initBoard();
    initFilms();
    initSkills();
    initExperience();
    initContact();
    initSections();
    ScrollTrigger.refresh();
  };
  const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1800))]) : Promise.resolve();
  fontsReady.then(boot);
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
