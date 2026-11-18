/* Small Gods, Large Debts — approved promotional art gallery, November 2026. */
(() => {
  const gallery = document.getElementById('sgld-gallery');
  const controls = document.getElementById('sgld-gallery-controls');
  if (!gallery || !controls) return;
  const cards = [...gallery.querySelectorAll('.sgld-media')];
  const prev = document.getElementById('sgld-gallery-prev');
  const next = document.getElementById('sgld-gallery-next');
  const count = document.getElementById('sgld-gallery-count');
  if (!cards.length || !prev || !next || !count) return;
  controls.hidden = false;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function currentIndex() {
    if (gallery.scrollLeft <= 4) return 0;
    if (gallery.scrollLeft >= gallery.scrollWidth - gallery.clientWidth - 4) return cards.length - 1;
    const left = gallery.getBoundingClientRect().left;
    let index = 0;
    let distance = Number.POSITIVE_INFINITY;
    cards.forEach((card, i) => {
      const delta = Math.abs(card.getBoundingClientRect().left - left);
      if (delta < distance) { index = i; distance = delta; }
    });
    return index;
  }
  function update() {
    const index = currentIndex();
    count.textContent = (index + 1) + ' / ' + cards.length;
    prev.disabled = index === 0;
    next.disabled = index === cards.length - 1;
  }
  function navigate(step) {
    const targetIndex = Math.min(cards.length - 1, Math.max(0, currentIndex() + step));
    const target = cards[targetIndex];
    const delta = target.getBoundingClientRect().left - gallery.getBoundingClientRect().left;
    gallery.scrollBy({left: delta, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'});
    count.textContent = (targetIndex + 1) + ' / ' + cards.length;
    prev.disabled = targetIndex === 0;
    next.disabled = targetIndex === cards.length - 1;
  }
  prev.addEventListener('click', () => navigate(-1));
  next.addEventListener('click', () => navigate(1));
  gallery.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      navigate(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  let queued = false;
  gallery.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, {passive: true});
  window.addEventListener('resize', update, {passive: true});
  update();
})();