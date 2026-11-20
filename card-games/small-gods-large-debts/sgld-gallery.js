/* SG,LD — accessible tarot inspector, motion gate and swipe controls; v2.0-P */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const video = document.getElementById('sgld-deck-video');
  const toggle = document.getElementById('sgld-motion-toggle');
  const slowNetwork = Boolean(navigator.connection && navigator.connection.saveData);
  let manualPause = false;
  function setVideoState(playing) {
    if (!video || !toggle) return;
    toggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
    toggle.innerHTML = playing ? 'Pause deck animation <span aria-hidden="true">Ⅱ</span>' : 'Play deck animation <span aria-hidden="true">▶</span>';
  }
  if (video && toggle) {
    video.addEventListener('play', () => setVideoState(true));
    video.addEventListener('pause', () => setVideoState(false));
    toggle.addEventListener('click', async () => {
      if (!video.paused) { manualPause = true; video.pause(); return; }
      manualPause = false;
      try { await video.play(); } catch (_) { video.setAttribute('controls', ''); }
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) { video.pause(); continue; }
          if (!manualPause && !reduced.matches && !slowNetwork) video.play().catch(() => {});
        }
      }, {threshold: .48});
      observer.observe(video);
    }
    reduced.addEventListener?.('change', () => { if (reduced.matches) video.pause(); });
  }

  document.querySelectorAll('[data-scroll]').forEach(button => {
    button.addEventListener('click', () => {
      const container = document.getElementById(button.dataset.target);
      if (!container) return;
      const first = container.querySelector('.sgld-deity');
      const distance = first ? first.getBoundingClientRect().width + 16 : container.clientWidth * .78;
      container.scrollBy({left: (button.dataset.scroll === 'next' ? 1 : -1) * distance, behavior: reduced.matches ? 'instant' : 'smooth'});
    });
  });

  const dialog = document.getElementById('sgld-card-dialog');
  const closing = dialog?.querySelector('[data-close]');
  const image = dialog?.querySelector('[data-dialog-image]');
  const name = dialog?.querySelector('[data-dialog-name]');
  const domain = dialog?.querySelector('[data-dialog-domain]');
  const ability = dialog?.querySelector('[data-dialog-ability]');
  if (dialog && image && name && domain && ability) {
    let lastFocus = null;
    document.querySelectorAll('[data-inspect]').forEach(button => {
      button.addEventListener('click', () => {
        lastFocus = button;
        name.textContent = button.dataset.name || '';
        domain.textContent = button.dataset.domain || '';
        ability.textContent = button.dataset.ability || '';
        image.src = button.dataset.image || '';
        image.alt = 'Approved tarot artwork for ' + (button.dataset.name || 'deity');
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else window.open(button.dataset.image, '_blank', 'noopener');
      });
    });
    closing?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { lastFocus?.focus(); });
  }
})();
