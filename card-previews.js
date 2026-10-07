(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hoverCapable = matchMedia('(hover: hover) and (pointer: fine)');
  const controllers = [];

  document.querySelectorAll('.work-card[data-preview]').forEach(card => {
    const frames = [...card.querySelectorAll('[data-preview-frame]')];
    if (frames.length !== 3) return;
    let timers = [];
    let hovered = false;
    let focused = false;
    let active = false;
    let generation = 0;

    function cancelTimers() {
      timers.forEach(timer => clearTimeout(timer));
      timers = [];
    }

    function showFrame(index) {
      frames.forEach((frame, current) => {
        frame.dataset.previewCurrent = String(current === index);
      });
    }

    function reset() {
      cancelTimers();
      generation += 1;
      active = false;
      showFrame(0);
      card.dataset.previewPhase = 'idle';
    }

    function preview() {
      if (active || document.hidden) return;
      cancelTimers();
      active = true;
      const currentGeneration = ++generation;
      if (reduced.matches || !hoverCapable.matches) {
        showFrame(0);
        card.dataset.previewPhase = 'complete';
        return;
      }
      const begin = () => {
        if (!active || document.hidden || generation !== currentGeneration) return;
        card.dataset.previewPhase = 'playing';
        showFrame(1);
        timers.push(setTimeout(() => showFrame(2), 1000));
        timers.push(setTimeout(() => showFrame(0), 2000));
        timers.push(setTimeout(() => {
          card.dataset.previewPhase = 'complete';
          timers = [];
        }, 3000));
      };
      if (frames.every(frame => frame.complete && frame.naturalWidth > 0)) {
        begin();
        return;
      }
      // Keep the original visible if an early hover beats a lazy image load.
      card.dataset.previewPhase = 'loading';
      Promise.all(frames.map(frame => {
        // Deferred artwork has no URL until an intentional interaction.
        if (frame.dataset.previewSrc) {
          frame.loading = 'eager';
          if (frame.dataset.previewSrcset) frame.srcset = frame.dataset.previewSrcset;
          frame.src = frame.dataset.previewSrc;
          delete frame.dataset.previewSrc;
          delete frame.dataset.previewSrcset;
          frame.dataset.previewLoaded = 'true';
        }
        if (frame.complete && frame.naturalWidth > 0) return true;
        frame.loading = 'eager';
        if (typeof frame.decode === 'function') return frame.decode().then(() => true, () => false);
        if (frame.complete) return false;
        return new Promise(resolve => {
          const finish = () => {
            frame.removeEventListener('load', finish);
            frame.removeEventListener('error', finish);
            resolve(frame.naturalWidth > 0);
          };
          frame.addEventListener('load', finish);
          frame.addEventListener('error', finish);
        });
      })).then(ready => {
        if (!active || document.hidden || generation !== currentGeneration) return;
        if (ready.every(Boolean)) begin();
        else card.dataset.previewPhase = 'complete';
      });
    }

    card.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      hovered = true;
      preview();
    });
    card.addEventListener('pointerleave', () => {
      hovered = false;
      if (!focused) reset();
    });
    card.addEventListener('focusin', () => {
      if (!card.matches(':focus-visible')) return;
      focused = true;
      preview();
    });
    card.addEventListener('focusout', event => {
      if (event.relatedTarget && card.contains(event.relatedTarget)) return;
      focused = false;
      if (!hovered) reset();
    });
    card.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch') return;
      hovered = false;
      focused = false;
      reset();
    });

    card.classList.add('preview-ready');
    reset();
    controllers.push({
      clear() { hovered = false; focused = false; reset(); },
      preferenceChanged() { const interacting = hovered || focused; reset(); if (interacting) preview(); }
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) controllers.forEach(controller => controller.clear());
  });
  window.addEventListener('pagehide', () => controllers.forEach(controller => controller.clear()));
  reduced.addEventListener('change', () => controllers.forEach(controller => controller.preferenceChanged()));
  hoverCapable.addEventListener('change', () => controllers.forEach(controller => controller.preferenceChanged()));
})();
