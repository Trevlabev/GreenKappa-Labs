/* Six-step onboarding carousel. Independent of Classic/Cascade demo controls. */
(() => {
  'use strict';
  const carousel = document.querySelector('.af-steps-carousel');
  if (!carousel) return;
  const track = carousel.querySelector('.af-steps-track');
  const slides = Array.from(track.querySelectorAll('.af-step-card'));
  const back = carousel.querySelector('[data-steps-dir="-1"]');
  const forward = carousel.querySelector('[data-steps-dir="1"]');
  const counter = carousel.querySelector('.af-steps-counter');
  const pagination = carousel.querySelector('.af-steps-pagination');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visibleCount = () => window.matchMedia('(max-width: 680px)').matches ? 1
    : window.matchMedia('(max-width: 1000px)').matches ? 2 : 3;
  let page = 0, scrollFrame = 0;

  function pageCount() { return Math.ceil(slides.length / visibleCount()); }
  function firstIndex(p) { return Math.min(p * visibleCount(), slides.length - visibleCount()); }
  function refreshControls() {
    const totalPages = pageCount();
    page = Math.max(0, Math.min(page, totalPages - 1));
    const first = firstIndex(page);
    const last = Math.min(slides.length, first + visibleCount());
    counter.textContent = String(first + 1).padStart(2, '0') + '–'
      + String(last).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    back.disabled = page === 0;
    forward.disabled = page === totalPages - 1;
    pagination.replaceChildren();
    for (let i = 0; i < totalPages; i++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', 'Show steps ' + (firstIndex(i) + 1)
        + ' through ' + Math.min(slides.length, firstIndex(i) + visibleCount()));
      button.setAttribute('aria-pressed', String(i === page));
      button.addEventListener('click', () => goTo(i));
      pagination.appendChild(button);
    }
  }
  function goTo(nextPage, instant = false) {
    page = Math.max(0, Math.min(nextPage, pageCount() - 1));
    const offset = slides[firstIndex(page)].offsetLeft - slides[0].offsetLeft;
    track.scrollTo({ left: offset, behavior: instant || reducedMotion.matches ? 'instant' : 'smooth' });
    refreshControls();
  }
  back.addEventListener('click', () => goTo(page - 1));
  forward.addEventListener('click', () => goTo(page + 1));
  track.addEventListener('keydown', event => {
    if (event.target !== track || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') goTo(0);
    else if (event.key === 'End') goTo(pageCount() - 1);
    else goTo(page + (event.key === 'ArrowRight' ? 1 : -1));
  });
  track.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const itemWidth = slides.length > 1
        ? slides[1].offsetLeft - slides[0].offsetLeft
        : track.clientWidth;
      if (!itemWidth) return;
      const first = Math.round(track.scrollLeft / itemWidth);
      const proposed = Math.round(first / visibleCount());
      if (proposed !== page) {
        page = Math.max(0, Math.min(proposed, pageCount() - 1));
        refreshControls();
      }
    });
  }, { passive: true });
  window.addEventListener('resize', () => goTo(page, true), { passive: true });
  goTo(0, true);
})();
