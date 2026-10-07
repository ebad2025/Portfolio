(() => {
  'use strict';
  const button = document.querySelector('.floating-return');
  if (!button) return;
  const intro = document.querySelector('.deck-controls') || document.querySelector('.case-hero') || document.querySelector('.hero');
  const footer = document.querySelector('.contact');
  let queued = 0;

  function update() {
    queued = 0;
    // Never remove the control while a keyboard user is operating it.
    if (document.activeElement === button) return;
    const pastIntro = intro ? intro.getBoundingClientRect().bottom < 24 : scrollY > innerHeight * .6;
    const footerBounds = footer?.getBoundingClientRect();
    const footerVisible = footerBounds && footerBounds.top < innerHeight && footerBounds.bottom > 0;
    if (!pastIntro || footerVisible || document.querySelector('dialog[open]')) {
      button.hidden = true;
      return;
    }
    const style = getComputedStyle(button);
    const right = innerWidth - parseFloat(style.right);
    const bottom = innerHeight - parseFloat(style.bottom);
    const area = { left: right - parseFloat(style.width) - 8, right: right + 8, top: bottom - parseFloat(style.height) - 8, bottom: bottom + 8 };
    const blocked = [...document.querySelectorAll('a, button, video, iframe, summary, input, select, textarea')].some(control => {
      if (control === button || control.closest('dialog')) return false;
      const bounds = control.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0 && bounds.left < area.right && bounds.right > area.left && bounds.top < area.bottom && bounds.bottom > area.top;
    });
    button.hidden = blocked;
  }
  function schedule() {
    if (!queued) queued = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  document.addEventListener('focusout', schedule);
  document.addEventListener('click', schedule);
  document.addEventListener('close', schedule, true);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
  update();
})();
