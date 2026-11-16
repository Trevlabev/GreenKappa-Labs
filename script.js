(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  const header = $(".site-header");
  const menuButton = $(".menu-button");
  const nav = $(".nav");

  function closeMenu() {
    if (!menuButton || !nav) return;
    menuButton.setAttribute("aria-expanded", "false");
    nav.classList.remove("open");
  }

  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("open", !open);
    });

    $$(".nav a").forEach((link) => link.addEventListener("click", closeMenu));
    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  window.addEventListener("scroll", () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > 12);
  }, { passive: true });

  const galleryImage = $("#galleryImage");
  const galleryCaption = $("#galleryCaption");

  if (galleryImage && galleryCaption) {
    $$(".gallery-tab").forEach((button) => {
      button.addEventListener("click", () => {
        $$(".gallery-tab").forEach((item) => {
          item.classList.toggle("active", item === button);
          item.setAttribute("aria-selected", String(item === button));
        });

        galleryImage.classList.add("switching");
        window.setTimeout(() => {
          galleryImage.src = button.dataset.image;
          galleryImage.alt = button.dataset.alt || "";
          galleryCaption.innerHTML =
            `<strong>${button.dataset.title || ""}</strong><span>${button.dataset.caption || ""}</span>`;
          galleryImage.classList.remove("switching");
        }, 120);
      });
    });
  }


  const gallery = $("[data-showcase]");
  if (gallery) {
    const slides = $$("[data-showcase-slide]", gallery);
    const tabs = $$("[data-showcase-tab]", gallery);
    const prev = $("[data-showcase-prev]", gallery);
    const next = $("[data-showcase-next]", gallery);
    const pause = $("[data-showcase-pause]", gallery);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let current = 0, paused = motion.matches, timer = null;
    function show(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const active = i === current;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", String(!active));
        slide.inert = !active;
      });
      tabs.forEach((tab, i) => {
        tab.classList.toggle("is-active", i === current);
        tab.setAttribute("aria-current", String(i === current));
      });
    }
    function controls() {
      pause.textContent = paused ? "Play" : "Pause";
      pause.setAttribute("aria-pressed", String(paused));
      pause.setAttribute("aria-label", paused ? "Resume automatic gallery rotation" : "Pause automatic gallery rotation");
    }
    function sync() {
      if (timer !== null) clearInterval(timer);
      timer = null;
      if (!paused && !document.hidden)
        timer = setInterval(() => show(current + 1), 6500);
    }
    function navigate(index) { show(index); sync(); }
    prev.addEventListener("click", () => navigate(current - 1));
    next.addEventListener("click", () => navigate(current + 1));
    tabs.forEach((tab, i) => tab.addEventListener("click", () => navigate(i)));

    // Horizontal touch gestures navigate the featured projects; vertical scrolling stays native.
    const viewport = $(".gkl-showcase-viewport", gallery);
    if (viewport) {
      let touchStart = null;
      let suppressLinkClickUntil = 0;
      const swipeDistance = () => Math.max(44, Math.min(82, viewport.clientWidth * 0.12));

      viewport.addEventListener("touchstart", (event) => {
        if (event.touches.length !== 1) {
          touchStart = null;
          return;
        }
        const touch = event.touches[0];
        touchStart = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
        // Prevent the auto-rotation timer from advancing mid-gesture.
        if (timer !== null) clearInterval(timer);
        timer = null;
      }, { passive: true });

      viewport.addEventListener("touchend", (event) => {
        if (!touchStart) return;
        const start = touchStart;
        touchStart = null;
        const touch = Array.from(event.changedTouches).find((t) => t.identifier === start.id);
        if (!touch) { sync(); return; }
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.abs(dx) >= swipeDistance() && Math.abs(dx) > Math.abs(dy) * 1.4) {
          // Swipes change slides but must not open the invisible full-slide project link.
          suppressLinkClickUntil = Date.now() + 500;
          navigate(current + (dx < 0 ? 1 : -1));
        } else {
          sync();
        }
      }, { passive: true });

      viewport.addEventListener("touchcancel", () => {
        touchStart = null;
        sync();
      }, { passive: true });

      viewport.addEventListener("click", (event) => {
        if (Date.now() <= suppressLinkClickUntil) {
          event.preventDefault();
          event.stopImmediatePropagation();
          suppressLinkClickUntil = 0;
        }
      }, true);
    }

    pause.addEventListener("click", () => { paused = !paused; controls(); sync(); });
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", () => {
      if (motion.matches) paused = true;
      controls(); sync();
    });
    show(0); controls(); sync();
  }

  const copyButtons = $$("[data-copy]");
  copyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.dataset.copy || "";
      try {
        await navigator.clipboard.writeText(value);
        const old = button.textContent;
        button.textContent = "Copied";
        window.setTimeout(() => button.textContent = old, 1400);
      } catch {
        window.location.href = `mailto:${value}`;
      }
    });
  });

  const observed = $$(".reveal");
  if ("IntersectionObserver" in window && observed.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });

    observed.forEach((element) => observer.observe(element));
  } else {
    observed.forEach((element) => element.classList.add("visible"));
  }
}());
