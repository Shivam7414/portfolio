/* =====================================================================
   Shivam Kumar  -  Portfolio interactions
   Native scrolling. GSAP reveals where available, with graceful fallback.
   Custom cursor, masked hero reveal, scroll progress.
   Respects prefers-reduced-motion and touch.
   ===================================================================== */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine   = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGSAP  = typeof window.gsap !== "undefined";
  var hasST    = hasGSAP && typeof window.ScrollTrigger !== "undefined";

  if (hasST) gsap.registerPlugin(ScrollTrigger);

  /* ----------  Footer year  ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ----------  Header scrolled state  ---------- */
  var header = document.querySelector(".site-header");
  var progressBar = document.querySelector(".scroll-progress span");
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (header) header.classList.toggle("is-scrolled", y > 24);
    if (progressBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? y / max : 0;
      progressBar.style.transform = "scaleX(" + p.toFixed(4) + ")";
    }
  }

  /* ----------  Mobile menu  ---------- */
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

  /* ----------  Scroll listener (native scrolling)  ---------- */
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ----------  Smooth anchor scroll  ---------- */
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

  /* ----------  Custom cursor  ---------- */
  if (fine && !reduce) {
    var cursor = document.querySelector(".cursor");
    var ring = document.querySelector(".cursor__ring");
    var dot = document.querySelector(".cursor__dot");
    if (cursor && ring && dot) {
      document.body.classList.add("has-cursor");
      var mx = window.innerWidth / 2, my = window.innerHeight / 2;
      var rx = mx, ry = my, scale = 1, targetScale = 1;
      dot.style.transform = "translate(" + mx + "px," + my + "px)";
      document.addEventListener("mousemove", function (e) {
        mx = e.clientX; my = e.clientY;
        dot.style.transform = "translate(" + mx + "px," + my + "px)";
      });
      (function loop() {
        rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
        scale += (targetScale - scale) * 0.18;
        ring.style.transform = "translate(" + rx.toFixed(2) + "px," + ry.toFixed(2) + "px) scale(" + scale.toFixed(3) + ")";
        requestAnimationFrame(loop);
      })();
      document.querySelectorAll("a, button, [data-magnetic], .case").forEach(function (el) {
        el.addEventListener("mouseenter", function () { targetScale = 1.7; cursor.classList.add("is-hover"); });
        el.addEventListener("mouseleave", function () { targetScale = 1; cursor.classList.remove("is-hover"); });
      });
      document.documentElement.addEventListener("mouseleave", function () { cursor.classList.add("is-hidden"); });
      document.documentElement.addEventListener("mouseenter", function () { cursor.classList.remove("is-hidden"); });
    }
  }

  /* ----------  Magnetic elements  ---------- */
  if (fine && !reduce) {
    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.3;
        var y = (e.clientY - r.top - r.height / 2) * 0.3;
        el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = "translate(0,0)"; });
    });
  }

  /* ----------  Hero load + scroll reveals  ---------- */
  if (hasGSAP && !reduce) {
    var tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.15 });
    gsap.set(".hero__title .line__in", { yPercent: 115 });
    gsap.set([".hero__meta", ".hero__intro", ".hero__now", ".hero__marquee"], { opacity: 0, y: 26 });
    tl.to(".hero__meta", { opacity: 1, y: 0, duration: 0.7 })
      .to(".hero__title .line__in", { yPercent: 0, duration: 0.95, stagger: 0.09 }, "-=0.35")
      .to([".hero__intro", ".hero__now"], { opacity: 1, y: 0, duration: 0.85, stagger: 0.12 }, "-=0.5")
      .to(".hero__marquee", { opacity: 1, y: 0, duration: 0.7 }, "-=0.5");

    if (hasST) {
      gsap.utils.toArray("[data-reveal]").forEach(function (el) {
        gsap.set(el, { opacity: 0, y: 30 });
        ScrollTrigger.create({
          trigger: el, start: "top 88%", once: true,
          onEnter: function () { gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }); }
        });
      });
      window.addEventListener("load", function () { ScrollTrigger.refresh(); });
    } else {
      gsap.set("[data-reveal]", { opacity: 1, y: 0 });
    }
  }

  /* ----------  Active section in nav  ---------- */
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

  /* ----------  Scroll-velocity reactive marquee  ---------- */
  (function scrollMarquee() {
    if (reduce) return; /* CSS reduced-motion keeps it static */
    var track = document.querySelector(".marquee__track");
    if (!track) return;

    track.style.animation = "none";
    track.style.willChange = "transform";

    var half = track.scrollWidth / 2;
    var x = 0, vel = 0, base = 0.6;
    var lastY = window.pageYOffset || document.documentElement.scrollTop || 0;

    window.addEventListener("scroll", function () {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      vel += y - lastY;
      lastY = y;
    }, { passive: true });

    function recompute() { half = track.scrollWidth / 2; }
    window.addEventListener("resize", recompute);
    window.addEventListener("load", recompute);

    (function tick() {
      var speed = base + Math.min(Math.abs(vel) * 0.22, 26);
      x -= speed;
      if (half > 0 && x <= -half) x += half;
      track.style.transform = "translate3d(" + x.toFixed(2) + "px,0,0)";
      vel *= 0.86;
      requestAnimationFrame(tick);
    })();
  })();
})();
