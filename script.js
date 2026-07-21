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
