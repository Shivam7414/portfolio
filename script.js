/* =====================================================================
   Shivam Kumar - "Production Grade"
   Hand-coded, no build step. One IIFE.

   Checkpoint A: core utilities, hero headline reveal, Three.js hero
   scene (node-graph + particle field) with full fallbacks, cursor glow,
   magnetic actions, header/menu/anchor/nav-spy. Later checkpoints add the
   SVG diagram engine and the remaining section interactions.

   No-JS safe · reduced-motion safe · feature-detected throughout.
   ===================================================================== */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine   = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";
  var hasST   = hasGSAP && typeof window.ScrollTrigger !== "undefined";
  var NS = "http://www.w3.org/2000/svg";

  if (hasST) gsap.registerPlugin(ScrollTrigger);

  function svgEl(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* =====================================================================
     HERO HEADLINE - split into words for the line-rise reveal
     ===================================================================== */
  (function splitTitle() {
    var h1 = document.querySelector(".hero__title");
    if (!h1) return;
    var frag = document.createDocumentFragment();
    function emit(text, accent) {
      text.split(/(\s+)/).forEach(function (tok) {
        if (tok === "") return;
        if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(" ")); return; }
        var w = document.createElement("span");
        w.className = "word" + (accent ? " word--accent" : "");
        var inner = document.createElement("span");
        inner.className = "word__in"; inner.textContent = tok;
        if (accent) { inner.style.fontFamily = "var(--font-serif)"; inner.style.fontStyle = "italic"; inner.style.color = "var(--accent-2)"; }
        w.appendChild(inner); frag.appendChild(w);
      });
    }
    Array.prototype.slice.call(h1.childNodes).forEach(function (node) {
      if (node.nodeType === 3) emit(node.textContent, false);
      else if (node.nodeName === "EM") emit(node.textContent, true);
    });
    h1.textContent = "";
    h1.appendChild(frag);
  })();

  /* =====================================================================
     THREE.JS HERO - node graph + particle field, mouse-reactive
     Boots only when safe; otherwise the CSS/SVG fallback stays visible.
     ===================================================================== */
  function webglOK() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  function bootHero(THREE, canvas, hero) {
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);
    camera.position.z = 64;

    function size() {
      var w = hero.clientWidth, h = hero.clientHeight;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    /* round, soft point sprite */
    function dotTexture() {
      var c = document.createElement("canvas"); c.width = c.height = 64;
      var x = c.getContext("2d");
      var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.3, "rgba(180,196,255,0.95)");
      g.addColorStop(1, "rgba(140,160,255,0)");
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    }
    var dot = dotTexture();

    var COUNT = window.innerWidth < 768 ? 60 : 120;
    var SPREAD_X = 62, SPREAD_Y = 36, SPREAD_Z = 26;

    /* ----- nodes ----- */
    var nodePos = new Float32Array(COUNT * 3);
    var pts = [];
    for (var i = 0; i < COUNT; i++) {
      var x = (Math.random() * 2 - 1) * SPREAD_X;
      var y = (Math.random() * 2 - 1) * SPREAD_Y;
      var z = (Math.random() * 2 - 1) * SPREAD_Z;
      nodePos[i * 3] = x; nodePos[i * 3 + 1] = y; nodePos[i * 3 + 2] = z;
      pts.push([x, y, z]);
    }
    var nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePos, 3));
    var nodeMat = new THREE.PointsMaterial({
      size: 2.4, map: dot, color: 0xBFCAFF, transparent: true, opacity: 0.95,
      sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    var nodes = new THREE.Points(nodeGeo, nodeMat);

    /* ----- edges (computed once: nearest, capped per node) ----- */
    var TH = 22, MAX_PER = 3, segs = [];
    for (var a = 0; a < COUNT; a++) {
      var conn = 0;
      for (var b = a + 1; b < COUNT && conn < MAX_PER; b++) {
        var dx = pts[a][0] - pts[b][0], dy = pts[a][1] - pts[b][1], dz = pts[a][2] - pts[b][2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < TH) {
          segs.push(pts[a][0], pts[a][1], pts[a][2], pts[b][0], pts[b][1], pts[b][2]);
          conn++;
        }
      }
    }
    var edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(segs), 3));
    var edgeMat = new THREE.LineBasicMaterial({ color: 0x1F3BFF, transparent: true, opacity: 0.20, depthWrite: false, blending: THREE.AdditiveBlending });
    var edges = new THREE.LineSegments(edgeGeo, edgeMat);

    var graph = new THREE.Group();
    graph.add(edges); graph.add(nodes);
    scene.add(graph);

    /* ----- particle field (depth layer) ----- */
    var PCOUNT = COUNT * 4;
    var pPos = new Float32Array(PCOUNT * 3);
    for (var p = 0; p < PCOUNT; p++) {
      pPos[p * 3] = (Math.random() * 2 - 1) * 110;
      pPos[p * 3 + 1] = (Math.random() * 2 - 1) * 70;
      pPos[p * 3 + 2] = (Math.random() * 2 - 1) * 70 - 40;
    }
    var fieldGeo = new THREE.BufferGeometry();
    fieldGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    var fieldMat = new THREE.PointsMaterial({ size: 1.0, map: dot, color: 0x5B79FF, transparent: true, opacity: 0.5, sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending });
    var field = new THREE.Points(fieldGeo, fieldMat);
    scene.add(field);

    /* ----- interaction + loop ----- */
    var pointerX = 0, pointerY = 0, tpx = 0, tpy = 0, spin = 0, active = true, running = false;
    window.addEventListener("pointermove", function (e) {
      tpx = (e.clientX / window.innerWidth) * 2 - 1;
      tpy = (e.clientY / window.innerHeight) * 2 - 1;
    });

    function frame() {
      if (!active || document.hidden) { running = false; return; }
      running = true;
      pointerX += (tpx - pointerX) * 0.04;
      pointerY += (tpy - pointerY) * 0.04;
      spin += 0.0006;
      graph.rotation.y = spin + pointerX * 0.5;
      graph.rotation.x = pointerY * 0.28;
      field.rotation.y = -spin * 0.4;
      field.rotation.x = pointerY * 0.12;
      camera.position.x += (pointerX * 6 - camera.position.x) * 0.04;
      camera.position.y += (-pointerY * 4 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    function start() { if (!running) requestAnimationFrame(frame); }

    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(size, 150); }, { passive: true });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { active = e.isIntersecting; if (active) start(); });
      }, { threshold: 0.01 }).observe(hero);
    }

    size();
    document.body.classList.add("webgl-on");
    start();
  }

  /* Load Three.js (ESM) on demand - only when we actually intend to animate the hero. */
  (function loadHero() {
    var canvas = document.getElementById("heroCanvas");
    var hero = document.getElementById("hero");
    if (!canvas || !hero || reduce || !webglOK()) return;
    if (!fine && window.innerWidth < 768) return; // skip heavy WebGL on small touch screens
    import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js")
      .then(function (T) { bootHero(T, canvas, hero); })
      .catch(function () { /* import failed - CSS/SVG fallback stays visible */ });
  })();

  /* =====================================================================
     HERO LOAD TIMELINE
     ===================================================================== */
  if (hasGSAP && !reduce) {
    gsap.set([".hero__kicker", ".hero__standfirst", ".hero__actions", ".hero__cue"], { opacity: 0, y: 24 });
    gsap.set(".hero__title .word__in", { yPercent: 118 });
    var tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.15 });
    tl.to(".hero__kicker", { opacity: 1, y: 0, duration: 0.7 })
      .to(".hero__title .word__in", { yPercent: 0, duration: 0.9, stagger: 0.045 }, "-=0.35")
      .to([".hero__standfirst", ".hero__actions"], { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 }, "-=0.5")
      .to(".hero__cue", { opacity: 1, y: 0, duration: 0.6 }, "-=0.4");
  }

  /* =====================================================================
     CURSOR GLOW (desktop fine-pointer only)
     ===================================================================== */
  if (fine && !reduce) {
    var glow = document.querySelector(".cursor-glow");
    if (glow) {
      var gx = window.innerWidth / 2, gy = window.innerHeight / 2, gtx = gx, gty = gy, gshown = false;
      window.addEventListener("pointermove", function (e) {
        gtx = e.clientX; gty = e.clientY;
        if (!gshown) { gshown = true; document.body.classList.add("cursor-on"); }
      });
      (function gloop() {
        gx += (gtx - gx) * 0.15; gy += (gty - gy) * 0.15;
        glow.style.transform = "translate(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px)";
        requestAnimationFrame(gloop);
      })();
    }
  }

  /* =====================================================================
     MAGNETIC ACTIONS
     ===================================================================== */
  if (fine && !reduce) {
    document.querySelectorAll(".btn--primary, .header__cta, [data-magnetic]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1) + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* =====================================================================
     FOOTER YEAR
     ===================================================================== */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =====================================================================
     HEADER SCROLLED STATE
     ===================================================================== */
  var header = document.querySelector(".site-header");
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (header) header.classList.toggle("is-scrolled", y > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* =====================================================================
     MOBILE MENU
     ===================================================================== */
  var toggle = document.getElementById("menuToggle");
  var mobileMenu = document.getElementById("mobileMenu");
  function closeMenu() {
    document.body.classList.remove("menu-open");
    if (toggle) { toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "Open menu"); }
    if (mobileMenu) mobileMenu.setAttribute("aria-hidden", "true");
  }
  if (toggle && mobileMenu) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      mobileMenu.setAttribute("aria-hidden", open ? "false" : "true");
    });
    mobileMenu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeMenu); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  }

  /* =====================================================================
     SMOOTH ANCHOR SCROLL
     ===================================================================== */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (id === "#" || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      var top = target.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
      if (history.replaceState) history.replaceState(null, "", id);
    });
  });

  /* =====================================================================
     ACTIVE SECTION IN NAV
     ===================================================================== */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a"));
  var sectionMap = {};
  navLinks.forEach(function (link) {
    var id = link.getAttribute("href").replace("#", "");
    if (document.getElementById(id)) sectionMap[id] = link;
  });
  if ("IntersectionObserver" in window && Object.keys(sectionMap).length) {
    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          navLinks.forEach(function (l) { l.classList.remove("is-active"); });
          if (sectionMap[entry.target.id]) sectionMap[entry.target.id].classList.add("is-active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(sectionMap).forEach(function (id) { navIo.observe(document.getElementById(id)); });
  }

  /* =====================================================================
     SVG DIAGRAM ENGINE - each project & the RAG flow drawn as a live system.
     Labelled nodes, connectors, and event packets that flow and react to
     hover. Logic preserved from the original build; only its CSS changed.
     ===================================================================== */
  var SPECS = {
    sendmepls: {
      h: 480,
      aria: "SendMePls: customer and agent apps over WebSockets to a REST API, with Redis, a queue, and an AI pricing service.",
      nodes: [
        { id: "customer", label: "Customer",   x: 120, y: 120, kind: "client" },
        { id: "agent",    label: "Agent",      x: 120, y: 360, kind: "client" },
        { id: "ws",       label: "WebSocket",  x: 370, y: 240, kind: "rt" },
        { id: "api",      label: "REST API",   x: 620, y: 240, kind: "hub" },
        { id: "redis",    label: "Redis",      x: 880, y: 120, kind: "store" },
        { id: "queue",    label: "Queue",      x: 880, y: 240, kind: "service" },
        { id: "ai",       label: "AI Pricing", x: 880, y: 360, kind: "ai" }
      ],
      edges: [["customer","ws"],["agent","ws"],["ws","api"],["api","redis"],["api","queue"],["api","ai"]],
      flows: [["customer","ws","api","redis"],["redis","api","ws","agent"],["api","queue"],["api","ai"]]
    },
    indikosh: {
      h: 460,
      aria: "Indikosh: a mobile app and admin panel on a REST API that calls TripJack, Yatra, Easebuzz, and MySQL.",
      nodes: [
        { id: "mobile",   label: "Mobile",   x: 120, y: 120, kind: "client" },
        { id: "admin",    label: "Admin",    x: 120, y: 340, kind: "client" },
        { id: "api",      label: "REST API", x: 380, y: 230, kind: "hub" },
        { id: "tripjack", label: "TripJack", x: 640, y: 90,  kind: "service" },
        { id: "yatra",    label: "Yatra",    x: 640, y: 230, kind: "service" },
        { id: "easebuzz", label: "Easebuzz", x: 640, y: 370, kind: "pay" },
        { id: "mysql",    label: "MySQL",    x: 880, y: 230, kind: "store" }
      ],
      edges: [["mobile","api"],["admin","api"],["api","tripjack"],["api","yatra"],["api","easebuzz"],["api","mysql"]],
      flows: [["mobile","api","tripjack"],["mobile","api","yatra"],["api","easebuzz"],["api","mysql"]]
    },
    vendor: {
      h: 470,
      aria: "Vendor & Workforce: an app over MySQL with a queued export pipeline, plus a Text-to-SQL path through an LLM and Qdrant.",
      nodes: [
        { id: "user",   label: "User",      x: 120, y: 130, kind: "client" },
        { id: "app",    label: "App / API", x: 390, y: 130, kind: "hub" },
        { id: "mysql",  label: "MySQL",     x: 660, y: 130, kind: "store" },
        { id: "queue",  label: "Exports",   x: 660, y: 340, kind: "service" },
        { id: "llm",    label: "LLM",       x: 130, y: 340, kind: "ai" },
        { id: "qdrant", label: "Qdrant",    x: 390, y: 340, kind: "store" }
      ],
      edges: [["user","app"],["app","mysql"],["app","queue"],["queue","mysql"],["user","llm"],["llm","qdrant"],["llm","app"]],
      flows: [["user","llm","qdrant","llm","app","mysql"],["app","queue","mysql"]]
    },
    rfqai: {
      h: 430,
      aria: "RfqAI: a document chunked and read by an LLM, priced against Qdrant and market rates, producing a report.",
      nodes: [
        { id: "doc",     label: "Document",     x: 140, y: 150, kind: "client" },
        { id: "chunker", label: "Chunker",      x: 360, y: 150, kind: "service" },
        { id: "llm",     label: "LLM",          x: 560, y: 150, kind: "ai" },
        { id: "qdrant",  label: "Qdrant",       x: 770, y: 90,  kind: "store" },
        { id: "market",  label: "Market Rates", x: 770, y: 270, kind: "service" },
        { id: "report",  label: "Report",       x: 910, y: 180, kind: "hub" }
      ],
      edges: [["doc","chunker"],["chunker","llm"],["llm","qdrant"],["llm","market"],["qdrant","report"],["market","report"]],
      flows: [["doc","chunker","llm","qdrant","report"],["llm","market","report"]]
    },
    myrentalspot: {
      h: 500,
      aria: "MyRentalSpot: renters and landlords on an app that routes payments through Stripe Connect to multiple banks.",
      nodes: [
        { id: "renter",   label: "Renter",         x: 130, y: 120, kind: "client" },
        { id: "landlord", label: "Landlord",       x: 130, y: 380, kind: "client" },
        { id: "api",      label: "App / API",      x: 380, y: 250, kind: "hub" },
        { id: "stripe",   label: "Stripe Connect", x: 640, y: 250, kind: "pay" },
        { id: "banka",    label: "Bank A",         x: 890, y: 130, kind: "store" },
        { id: "bankb",    label: "Bank B",         x: 890, y: 250, kind: "store" },
        { id: "mysql",    label: "MySQL",          x: 640, y: 440, kind: "store" }
      ],
      edges: [["renter","api"],["landlord","api"],["api","stripe"],["stripe","banka"],["stripe","bankb"],["api","mysql"]],
      flows: [["renter","api","stripe","banka"],["landlord","api","stripe","bankb"],["api","mysql"]]
    },
    jodlaw: {
      h: 440,
      aria: "Jod Law Firm: a Laravel CMS serving visitors and an admin, capturing leads into MySQL and running on AWS.",
      nodes: [
        { id: "visitor", label: "Visitor",     x: 130, y: 130, kind: "client" },
        { id: "cms",     label: "Laravel CMS", x: 400, y: 130, kind: "hub" },
        { id: "mysql",   label: "MySQL",       x: 680, y: 130, kind: "store" },
        { id: "admin",   label: "Admin",       x: 130, y: 340, kind: "client" },
        { id: "leads",   label: "Leads",       x: 400, y: 340, kind: "service" },
        { id: "aws",     label: "AWS / CDN",   x: 680, y: 340, kind: "service" }
      ],
      edges: [["visitor","cms"],["cms","mysql"],["admin","cms"],["cms","leads"],["leads","mysql"],["cms","aws"]],
      flows: [["visitor","cms","leads","mysql"],["admin","cms","mysql"],["cms","aws"]]
    },
    rag: {
      h: 470,
      aria: "A retrieval-augmented generation flow: a question is embedded, matched in Qdrant against indexed documents, and answered by an LLM.",
      nodes: [
        { id: "query",  label: "Question",  x: 110, y: 240, kind: "client" },
        { id: "embed",  label: "Embed",     x: 330, y: 240, kind: "service" },
        { id: "qdrant", label: "Qdrant",    x: 560, y: 115, kind: "store" },
        { id: "docs",   label: "Documents", x: 560, y: 365, kind: "store" },
        { id: "llm",    label: "LLM",       x: 770, y: 240, kind: "ai" },
        { id: "answer", label: "Answer",    x: 925, y: 240, kind: "hub" }
      ],
      edges: [["query","embed"],["embed","qdrant"],["docs","qdrant"],["qdrant","llm"],["llm","answer"]],
      flows: [["query","embed","qdrant","llm","answer"],["docs","qdrant","llm"]]
    }
  };

  function buildDiagram(mount, spec) {
    var vbW = 1000, vbH = spec.h || 520;
    var svg = svgEl("svg", { viewBox: "0 0 " + vbW + " " + vbH, class: "dgm", preserveAspectRatio: "xMidYMid meet", role: "img" });
    svg.setAttribute("aria-label", spec.aria || "System architecture diagram");
    var gEdges = svgEl("g"), gPk = svgEl("g"), gNodes = svgEl("g");

    var map = {};
    spec.nodes.forEach(function (n) { map[n.id] = n; });

    /* node box half-extents (must match the rect drawn below) */
    function boxHalf(n) { return { hw: Math.max(n.label.length * 16 + 46, 130) / 2, hh: 31 }; }
    /* point where the centre-to-centre line exits `from`'s box border toward `to` */
    function edgePoint(from, to) {
      var ex = boxHalf(from), dx = to.x - from.x, dy = to.y - from.y;
      var tx = dx !== 0 ? ex.hw / Math.abs(dx) : Infinity;
      var ty = dy !== 0 ? ex.hh / Math.abs(dy) : Infinity;
      var t = Math.min(tx, ty);
      return { x: from.x + dx * t, y: from.y + dy * t };
    }

    var edgeEls = {};
    spec.edges.forEach(function (e) {
      var a = map[e[0]], b = map[e[1]];
      var p1 = edgePoint(a, b), p2 = edgePoint(b, a);
      var line = svgEl("line", { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, class: "dgm__edge" });
      gEdges.appendChild(line);
      edgeEls[e[0] + ">" + e[1]] = line; edgeEls[e[1] + ">" + e[0]] = line;
    });

    spec.nodes.forEach(function (n) {
      var g = svgEl("g", { class: "dgm__node" + (n.kind ? " is-" + n.kind : "") });
      var w = Math.max(n.label.length * 16 + 46, 130), h = 62;
      g.appendChild(svgEl("rect", { x: n.x - w / 2, y: n.y - h / 2, width: w, height: h, rx: 11, class: "dgm__box" }));
      var t = svgEl("text", { x: n.x, y: n.y, "text-anchor": "middle", "dominant-baseline": "central", class: "dgm__label" });
      t.textContent = n.label;
      g.appendChild(t);
      gNodes.appendChild(g);
      n._g = g;
    });

    svg.appendChild(gEdges); svg.appendChild(gPk); svg.appendChild(gNodes);
    mount.appendChild(svg);

    var flows = (spec.flows || []).map(function (seq, i) {
      var pts = seq.map(function (id) { return [map[id].x, map[id].y]; });
      var segz = [], total = 0;
      for (var k = 0; k < pts.length - 1; k++) {
        var L = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]);
        segz.push(L); total += L;
      }
      var glow = svgEl("circle", { r: 11, class: "dgm__pk-glow" });
      var core = svgEl("circle", { r: 5, class: "dgm__pk" });
      gPk.appendChild(glow); gPk.appendChild(core);
      return { pts: pts, segs: segz, total: total, glow: glow, core: core, t: (i / Math.max(1, seq.length)) + Math.random() * 0.4, sp: spec.speed || 0.0023 };
    });

    function place(f) {
      var d = f.t * f.total, i = 0;
      while (i < f.segs.length && d > f.segs[i]) { d -= f.segs[i]; i++; }
      if (i >= f.segs.length) { i = f.segs.length - 1; d = f.segs[i]; }
      var a = f.pts[i], b = f.pts[i + 1] || a;
      var r = f.segs[i] ? d / f.segs[i] : 0;
      var x = a[0] + (b[0] - a[0]) * r, y = a[1] + (b[1] - a[1]) * r;
      f.core.setAttribute("cx", x); f.core.setAttribute("cy", y);
      f.glow.setAttribute("cx", x); f.glow.setAttribute("cy", y);
    }
    flows.forEach(place);

    spec.nodes.forEach(function (n) {
      n._g.addEventListener("mouseenter", function () {
        spec.edges.forEach(function (e) {
          if (e[0] === n.id || e[1] === n.id) { var ln = edgeEls[e[0] + ">" + e[1]]; if (ln) ln.classList.add("is-active"); }
        });
        n._g.classList.add("is-hot");
      });
      n._g.addEventListener("mouseleave", function () {
        gEdges.querySelectorAll(".dgm__edge").forEach(function (l) { l.classList.remove("is-active"); });
        n._g.classList.remove("is-hot");
      });
    });

    var speedMul = 1;
    mount.addEventListener("mouseenter", function () { speedMul = 2.6; });
    mount.addEventListener("mouseleave", function () { speedMul = 1; });

    return {
      tick: function () { for (var i = 0; i < flows.length; i++) { var f = flows[i]; f.t += f.sp * speedMul; if (f.t > 1) f.t -= 1; place(f); } },
      static: function () { flows.forEach(function (f) { f.t = 0.5; place(f); }); }
    };
  }

  var diagrams = [];
  document.querySelectorAll("[data-diagram]").forEach(function (mount) {
    var spec = SPECS[mount.getAttribute("data-diagram")];
    if (!spec) return;
    var anim = buildDiagram(mount, spec);
    var rec = { anim: anim, active: false };
    diagrams.push(rec);
    if (reduce) { anim.static(); return; }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { rec.active = e.isIntersecting; }); }, { threshold: 0.05 }).observe(mount);
    } else { rec.active = true; }
  });
  if (!reduce && diagrams.length) {
    (function dloop() {
      if (!document.hidden) { for (var i = 0; i < diagrams.length; i++) if (diagrams[i].active) diagrams[i].anim.tick(); }
      requestAnimationFrame(dloop);
    })();
  }

  /* =====================================================================
     CAPABILITY GLYPHS - 7 line icons, drawn on as they enter view
     ===================================================================== */
  var ICONS = [
    /* Backend */            '<rect x="6" y="7" width="20" height="6" rx="1.6"/><rect x="6" y="19" width="20" height="6" rx="1.6"/><circle cx="10" cy="10" r="1"/><circle cx="10" cy="22" r="1"/>',
    /* Distributed */        '<circle cx="16" cy="16" r="3.1"/><circle cx="7" cy="8" r="2"/><circle cx="25" cy="9" r="2"/><circle cx="9" cy="25" r="2"/><circle cx="24" cy="24" r="2"/><path d="M13.3 14.1 8.6 9.7M18.7 14.3 23 10.7M13.6 18 10.2 23.1M18.6 18.2 22.3 22.3"/>',
    /* AI & RAG */           '<path d="M10 23h11a5 5 0 0 0 .8-9.94 7 7 0 0 0-13.2-1.2A4.5 4.5 0 0 0 10 23z"/><path d="M16 14.5v5"/><path d="M13.5 16.5 16 14l2.5 2.5"/>',
    /* Databases */          '<ellipse cx="16" cy="8" rx="9" ry="3"/><path d="M7 8v8c0 1.7 4 3 9 3s9-1.3 9-3V8"/><path d="M7 16v8c0 1.7 4 3 9 3s9-1.3 9-3v-8"/>',
    /* Cloud Infra */        '<path d="M9.5 23h11a5 5 0 0 0 .4-9.98 7 7 0 0 0-13.2-1.1A4.6 4.6 0 0 0 9.5 23z"/>',
    /* Payments */           '<rect x="5" y="9" width="22" height="14" rx="2"/><path d="M5 13.5h22"/><path d="M9 19h5"/>',
    /* Performance */        '<path d="M17 4 8 18h6l-1 10 11-16h-7z"/>'
  ];
  document.querySelectorAll(".cap__icon").forEach(function (el, i) {
    if (!ICONS[i]) return;
    el.innerHTML = '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + ICONS[i] + "</svg>";
  });

  /* =====================================================================
     SCROLL REVEALS (+ icon stroke-draw)
     ===================================================================== */
  if (hasGSAP && hasST && !reduce) {
    gsap.utils.toArray("[data-reveal]").forEach(function (el) {
      gsap.set(el, { opacity: 0, y: 18 });
      var iconShapes = el.querySelectorAll(".cap__icon svg > *");
      iconShapes.forEach(function (s) {
        var len = 60; try { len = s.getTotalLength(); } catch (e) {}
        if (!len || !isFinite(len)) len = 60;
        s.style.strokeDasharray = len; s.style.strokeDashoffset = len;
      });
      ScrollTrigger.create({
        trigger: el, start: "top 88%", once: true,
        onEnter: function () {
          gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" });
          iconShapes.forEach(function (s, k) {
            gsap.to(s, { strokeDashoffset: 0, duration: 0.9, delay: 0.12 + k * 0.07, ease: "power2.out" });
          });
        }
      });
    });
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  } else if (hasGSAP) {
    gsap.set("[data-reveal]", { opacity: 1, y: 0 });
  }

  /* =====================================================================
     CARD TILT (desktop fine-pointer only)
     ===================================================================== */
  if (fine && !reduce) {
    document.querySelectorAll("[data-tilt]").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = "perspective(900px) rotateX(" + (-py * 4).toFixed(2) + "deg) rotateY(" + (px * 5).toFixed(2) + "deg)";
      });
      card.addEventListener("pointerleave", function () { card.style.transform = ""; });
    });
  }

  /* =====================================================================
     DEEP-DIVE TOGGLES (accessible, height-animated)
     ===================================================================== */
  document.querySelectorAll("[data-deepdive]").forEach(function (btn) {
    var panel = btn.nextElementSibling;
    if (!panel) return;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      if (open) {
        if (hasGSAP && !reduce) {
          gsap.to(panel, { height: 0, opacity: 0, duration: 0.3, ease: "power2.in", onComplete: function () { panel.hidden = true; panel.style.height = ""; panel.style.opacity = ""; } });
        } else { panel.hidden = true; }
      } else {
        panel.hidden = false;
        if (hasGSAP && !reduce) {
          gsap.from(panel, { height: 0, opacity: 0, duration: 0.4, ease: "power2.out", onComplete: function () { panel.style.height = ""; } });
        }
      }
    });
  });

  /* =====================================================================
     TECH STACK - category filter
     ===================================================================== */
  (function initStackFilter() {
    var pills = document.querySelectorAll(".stack__pill");
    if (!pills.length) return;
    var tiles = document.querySelectorAll(".tech");
    pills.forEach(function (p) {
      p.addEventListener("click", function () {
        pills.forEach(function (x) { x.classList.remove("is-on"); });
        p.classList.add("is-on");
        var f = p.getAttribute("data-filter");
        tiles.forEach(function (t) {
          var match = f === "all" || (" " + t.getAttribute("data-cat") + " ").indexOf(" " + f + " ") > -1;
          t.classList.toggle("is-dim", !match);
        });
      });
    });
  })();
})();
