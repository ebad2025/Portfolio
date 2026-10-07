(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.documentElement.classList.add('has-js');
  const base = document.body.dataset.base || './';
  // Rotate only images that are ready; the home link remains an ordinary link.
  document.querySelectorAll('.logo-mark').forEach(mark => {
    const frames = [...mark.querySelectorAll('.logo-frame')];
    if (!frames.length) return;
    let available = [];
    let position = 0;
    let timer = null;
    let pageActive = true;

    function show(index) {
      frames.forEach((frame, frameIndex) => { frame.dataset.logoActive = String(frameIndex === index); });
      mark.dataset.logoIndex = String(index);
    }

    function stop() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    }

    function schedule() {
      stop();
      if (!pageActive || document.hidden || reduced.matches || available.length < 2) return;
      timer = setTimeout(() => {
        position = (position + 1) % available.length;
        show(available[position]);
        schedule();
      }, 2000);
    }

    function restart() {
      stop();
      position = 0;
      if (available.length) show(available[0]);
      schedule();
    }

    function ready(image) {
      if (!image) return Promise.resolve(false);
      const loaded = image.complete ? Promise.resolve(image.naturalWidth > 0) : new Promise(resolve => {
        const finish = () => {
          image.removeEventListener('load', finish);
          image.removeEventListener('error', finish);
          resolve(image.naturalWidth > 0);
        };
        image.addEventListener('load', finish);
        image.addEventListener('error', finish);
      });
      return loaded.then(success => {
        if (!success) return false;
        return typeof image.decode === 'function' ? image.decode().then(() => true, () => false) : true;
      });
    }

    show(0);
    Promise.all(frames.map(frame => ready(frame.querySelector('img')))).then(results => {
      available = results.flatMap((success, index) => success ? [index] : []);
      restart();
    });
    document.addEventListener('visibilitychange', restart);
    reduced.addEventListener('change', restart);
    window.addEventListener('pagehide', () => { pageActive = false; restart(); });
    window.addEventListener('pageshow', () => { pageActive = true; restart(); });
  });

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const glowSurfaces = [...document.querySelectorAll('.artwork-stage, .work-card, .case-hero, .contact')];
  let glowSurface = null;
  let glowFrame = 0;
  let glowPoint = null;
  const clearGlow = () => {
    cancelAnimationFrame(glowFrame);
    glowFrame = 0;
    glowSurface?.classList.remove('glow-active');
    glowSurface = null;
    glowPoint = null;
  };
  glowSurfaces.forEach(surface => {
    surface.classList.add('glow-surface');
    const glow = document.createElement('span');
    glow.className = 'surface-glow';
    glow.setAttribute('aria-hidden', 'true');
    surface.append(glow);
    const followPointer = event => {
      if (event.pointerType !== 'mouse' || reduced.matches || !finePointer.matches) return;
      if (glowSurface !== surface) {
        clearGlow();
        glowSurface = surface;
      }
      glowPoint = { x: event.clientX, y: event.clientY };
      if (glowFrame) return;
      glowFrame = requestAnimationFrame(() => {
        glowFrame = 0;
        if (!glowSurface || !glowPoint) return;
        const bounds = glowSurface.getBoundingClientRect();
        glowSurface.style.setProperty('--glow-x', `${glowPoint.x - bounds.left}px`);
        glowSurface.style.setProperty('--glow-y', `${glowPoint.y - bounds.top}px`);
        glowSurface.classList.add('glow-active');
      });
    };
    surface.addEventListener('pointerenter', followPointer);
    surface.addEventListener('pointermove', followPointer);
    surface.addEventListener('pointerleave', () => { if (glowSurface === surface) clearGlow(); });
  });
  reduced.addEventListener('change', clearGlow);
  finePointer.addEventListener('change', clearGlow);
  window.addEventListener('blur', clearGlow);
  window.addEventListener('scroll', clearGlow, { passive: true });
  window.addEventListener('pagehide', clearGlow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearGlow(); });
  const projects = [
    { key: 'product-stories', title: 'Product stories', meta: 'IFFCO Urban Gardens · Ecommerce', cover: 'ecommerce-1', width: 720, kind: 'product', alt: 'IFFCO DIY Potting Mixture packs in a cream and sage product composition' },
    { key: 'packaging-labels', title: 'Packaging & labels', meta: 'IFFCO Urban Gardens · Packaging', cover: 'packaging-tulsi-soil', display: 'display/packaging-tulsi-soil-960.webp', displaySrcset: 'display/packaging-tulsi-soil-480.webp 480w, display/packaging-tulsi-soil-960.webp 960w, display/packaging-tulsi-soil-1600.webp 1600w', extension: 'jpeg', width: 1600, height: 1367, kind: 'packaging', alt: 'IFFCO Tulsi Soil packaging layout in black and green with front, back, side panels and print guides' },
    { key: 'social-motion', title: 'Social & motion', meta: 'IFFCO Urban Gardens · Social content', cover: 'social-1', width: 720, kind: 'social', alt: 'Plant-stress carousel opening with a green leaf and luminous waveform' },
    { key: 'bright-edge', title: 'Branding', meta: 'In-house & freelance · Brand identity', cover: 'branding-plantable-diaries', display: 'display/branding-plantable-diaries-960.webp', displaySrcset: 'display/branding-plantable-diaries-480.webp 480w, display/branding-plantable-diaries-960.webp 960w, display/branding-plantable-diaries-1312.webp 1312w', extension: 'jpeg', width: 1312, height: 1199, kind: 'brand', alt: 'Cream and sage ECO NOTES plantable diary mockups showing front and back covers and planting instructions' }
  ];
  const deck = document.querySelector('[data-deck]');
  if (deck) {
    const stage = deck.querySelector('.artwork-stage');
    const layers = [...deck.querySelectorAll('.deck-layer')];
    const controls = document.querySelector('.deck-controls');
    const caption = deck.querySelector('.artwork-caption');
    const links = document.querySelectorAll('[data-selected-link]');
    let selected = 0;
    let previousPointer = null;
    function select(index, animate = true) {
      selected = (index + projects.length) % projects.length;
      const project = projects[selected];
      layers.forEach(layer => {
        const depth = Number(layer.dataset.depth);
        const item = projects[(selected + depth) % projects.length];
        const image = layer.querySelector('img');
        image.src = `${base}assets/${item.display || `${item.cover}.${item.extension || 'webp'}`}`;
        if (item.displaySrcset) image.srcset = item.displaySrcset.split(', ').map(source => `${base}assets/${source}`).join(', ');
        else if (item.extension) image.removeAttribute('srcset');
        else image.srcset = `${base}assets/${item.cover}-480.webp 480w, ${base}assets/${item.cover}.webp ${item.width}w`;
        image.width = item.width;
        image.height = item.height || 720;
        image.alt = depth === 0 ? item.alt : '';
        layer.dataset.kind = item.kind;
      });
      links.forEach(link => {
        link.href = `${base}work/${project.key}/`;
        link.setAttribute('aria-label', `${link.classList.contains('view-orb') ? 'View' : 'Explore this collection:'} ${project.title}`);
      });
      caption.querySelector('[data-title]').textContent = project.title;
      caption.querySelector('[data-meta]').textContent = project.meta;
      caption.querySelector('[data-counter]').textContent = `${String(selected + 1).padStart(2, '0')} / 04`;
      controls.querySelectorAll('[data-select]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.select) === selected)));
      if (animate && !reduced.matches) {
        const front = layers.find(layer => layer.dataset.depth === '0');
        front.getAnimations().forEach(animation => animation.cancel());
        front.animate([{ transform: 'translate(12%, 4%) rotate(7deg)', opacity: .25 }, { transform: 'rotate(-2deg)', opacity: 1 }], { duration: 610, easing: 'cubic-bezier(.2,.8,.2,1)' });
        caption.classList.remove('deck-echo');
        void caption.offsetWidth;
        caption.classList.add('deck-echo');
      }
    }
    controls.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-select')) select(Number(button.dataset.select));
      if (button.hasAttribute('data-step')) select(selected + Number(button.dataset.step));
    });
    controls.addEventListener('keydown', event => {
      if (!event.target.matches('[data-select]')) return;
      let index;
      const focused = Number(event.target.dataset.select);
      if (event.key === 'ArrowRight') index = focused + 1;
      else if (event.key === 'ArrowLeft') index = focused - 1;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = projects.length - 1;
      else return;
      event.preventDefault();
      select(index);
      controls.querySelector(`[data-select="${selected}"]`).focus();
    });
    stage.addEventListener('pointerdown', event => {
      if (event.target.closest('a,button')) return;
      previousPointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
      stage.setPointerCapture(event.pointerId);
    });
    stage.addEventListener('pointerup', event => {
      if (!previousPointer || previousPointer.id !== event.pointerId) return;
      const dx = event.clientX - previousPointer.x;
      const dy = event.clientY - previousPointer.y;
      previousPointer = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) select(selected + (dx < 0 ? 1 : -1));
    });
    stage.addEventListener('pointercancel', () => { previousPointer = null; });
    stage.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || reduced.matches) return;
      const rect = stage.getBoundingClientRect();
      stage.style.setProperty('--mx', `${((.5 - (event.clientY - rect.top) / rect.height) * 7).toFixed(2)}deg`);
      stage.style.setProperty('--my', `${(((event.clientX - rect.left) / rect.width - .5) * 9).toFixed(2)}deg`);
    });
    stage.addEventListener('pointerleave', () => { stage.style.setProperty('--mx', '0deg'); stage.style.setProperty('--my', '0deg'); });
    const orb = deck.querySelector('.view-orb');
    orb.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || reduced.matches) return;
      const rect = orb.getBoundingClientRect();
      orb.style.transform = `translate(${(event.clientX - rect.left - rect.width / 2) * .16}px,${(event.clientY - rect.top - rect.height / 2) * .16}px)`;
    });
    orb.addEventListener('pointerleave', () => { orb.style.transform = ''; });
    reduced.addEventListener('change', () => { if (reduced.matches) { stage.style.setProperty('--mx', '0deg'); stage.style.setProperty('--my', '0deg'); orb.style.transform = ''; layers.forEach(layer => layer.getAnimations().forEach(animation => animation.cancel())); } });
    select(0, false);
  }

  // Content is visible until an observer is successfully installed.
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove('is-pending'); observer.unobserve(entry.target); } });
    }, { threshold: .08, rootMargin: '0px 0px -25px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(element => {
      element.classList.add('reveal');
      if (element.getBoundingClientRect().top > innerHeight - 30) element.classList.add('is-pending');
      observer.observe(element);
    });
    reduced.addEventListener('change', () => { if (reduced.matches) { document.querySelectorAll('.is-pending').forEach(element => element.classList.remove('is-pending')); observer.disconnect(); } });
    window.addEventListener('beforeprint', () => { document.querySelectorAll('.is-pending').forEach(element => element.classList.remove('is-pending')); });
  }

  // A shared cover animates into its page on browsers supporting cross-document transitions.
  document.querySelectorAll('a[data-project-link]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reduced.matches) return;
      document.querySelectorAll('[style*="view-transition-name"]').forEach(element => { element.style.viewTransitionName = ''; });
      const image = link.querySelector('.work-preview-frame[data-preview-current="true"]') || link.querySelector('.work-cover') || document.querySelector('.deck-layer[data-depth="0"] img');
      if (image) image.style.viewTransitionName = 'project-art';
    });
  });
  window.addEventListener('pageshow', () => { document.querySelectorAll('[data-project-link] img').forEach(image => { image.style.viewTransitionName = ''; }); });
  const progress = document.querySelector('.read-progress');
  if (progress) {
    let queued = false;
    const updateProgress = () => { const distance = document.documentElement.scrollHeight - innerHeight; progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0})`; queued = false; };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(updateProgress); } }, { passive: true });
    addEventListener('resize', updateProgress);
    updateProgress();
  }
})();
