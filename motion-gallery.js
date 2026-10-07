(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const rails = [...document.querySelectorAll('[data-motion-rail]')];
  if (!rails.length) return;
  const controllers = [];
  let queued = 0;

  function refresh() {
    queued = 0;
    controllers.forEach(controller => controller.update());
  }

  function queueRefresh() {
    if (!queued) queued = requestAnimationFrame(refresh);
  }

  rails.forEach(rail => {
    const component = rail.closest('[data-motion-gallery]');
    const cards = [...rail.querySelectorAll('.motion-card')];
    if (!component || !cards.length) return;
    const previous = component.querySelector('[data-motion-prev]');
    const next = component.querySelector('[data-motion-next]');
    const status = component.querySelector('[data-motion-status]');
    const controls = component.querySelector('.motion-rail-controls');
    if (controls) controls.hidden = false;

    function update() {
      const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
      if (previous) previous.disabled = rail.scrollLeft <= 2;
      if (next) next.disabled = rail.scrollLeft >= max - 2;
      const bounds = rail.getBoundingClientRect();
      const visible = [];
      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const width = Math.max(0, Math.min(rect.right, bounds.right) - Math.max(rect.left, bounds.left));
        if (rect.width && width / rect.width >= .5) visible.push(index + 1);
      });
      if (status && visible.length) {
        const first = visible[0], last = visible[visible.length - 1];
        const text = first === last ? `Video ${first} of ${cards.length}` : `Videos ${first}–${last} of ${cards.length}`;
        if (status.textContent !== text) status.textContent = text;
      }
    }

    function move(direction) {
      const distance = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : rail.clientWidth;
      rail.scrollBy({ left: direction * distance, behavior: reduced.matches ? 'auto' : 'smooth' });
    }

    previous?.addEventListener('click', () => move(-1));
    next?.addEventListener('click', () => move(1));
    rail.addEventListener('scroll', queueRefresh, { passive: true });
    rail.addEventListener('keydown', event => {
      // Links and any focused child controls keep their own keys.
      if (event.target !== rail || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        move(event.key === 'ArrowLeft' ? -1 : 1);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        rail.scrollTo({ left: event.key === 'Home' ? 0 : rail.scrollWidth - rail.clientWidth, behavior: reduced.matches ? 'auto' : 'smooth' });
      }
    });
    controllers.push({ update });
    if ('ResizeObserver' in window) new ResizeObserver(queueRefresh).observe(rail);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) queueRefresh();
  });
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(queued);
    queued = 0;
  });
  window.addEventListener('pageshow', queueRefresh);
  window.addEventListener('scroll', queueRefresh, { passive: true });
  window.addEventListener('resize', queueRefresh);
  reduced.addEventListener('change', queueRefresh);
  refresh();
})();
