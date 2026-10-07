(() => {
  'use strict';

  const dialog = document.querySelector('.art-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const image = dialog.querySelector('.dialog-image');
  const caption = dialog.querySelector('[data-dialog-caption]');
  const count = dialog.querySelector('[data-dialog-count]');
  const bottom = dialog.querySelector('.dialog-bottom');
  const previous = dialog.querySelector('[data-dialog-prev]');
  const next = dialog.querySelector('[data-dialog-next]');
  const close = dialog.querySelector('[data-dialog-close]');
  if (!image || !caption || !count || !bottom || !previous || !next || !close) return;

  const viewport = document.createElement('div');
  viewport.className = 'dialog-viewport';
  viewport.tabIndex = 0;
  viewport.setAttribute('role', 'region');
  viewport.setAttribute('aria-label', 'Artwork. Zoom in to inspect details, then scroll to pan.');
  const canvas = document.createElement('div');
  canvas.className = 'dialog-canvas';
  image.before(viewport);
  viewport.append(canvas);
  canvas.append(image);
  image.draggable = false;

  const status = document.createElement('p');
  status.className = 'dialog-status';
  status.setAttribute('role', 'status');
  viewport.append(status);
  const tools = document.createElement('div');
  tools.className = 'dialog-tools';
  const zoomButton = document.createElement('button');
  zoomButton.type = 'button';
  zoomButton.className = 'dialog-tool dialog-zoom';
  zoomButton.textContent = 'Zoom in';
  zoomButton.setAttribute('aria-pressed', 'false');
  const original = document.createElement('a');
  original.className = 'dialog-tool dialog-original';
  original.textContent = 'Open full size ↗';
  original.target = '_blank';
  original.rel = 'noopener noreferrer';
  original.setAttribute('aria-label', 'Open full size artwork in a new tab');
  tools.append(zoomButton, original);
  bottom.append(tools);
  dialog.classList.add('viewer-ready');

  let group = [];
  let active = 0;
  let zoomed = false;
  let loaded = false;
  let returnFocus = null;
  let resizeFrame = 0;

  function fitDimensions() {
    if (!loaded || !image.naturalWidth || !image.naturalHeight) return null;
    const ratio = image.naturalWidth / image.naturalHeight;
    const width = Math.min(viewport.clientWidth, image.naturalWidth, viewport.clientHeight * ratio);
    return { width, height: width / ratio, ratio };
  }

  function layout(resetScroll = false) {
    const fitted = fitDimensions();
    if (!fitted || fitted.width <= 0) return;
    const zoomWidth = Math.min(image.naturalWidth, fitted.width * (fitted.ratio >= 2 ? 3 : 2));
    const canZoom = zoomWidth > fitted.width + 1;
    if (!canZoom) zoomed = false;
    const width = zoomed ? zoomWidth : fitted.width;
    const height = width / fitted.ratio;
    image.style.width = `${width}px`;
    image.style.height = `${height}px`;
    canvas.style.width = `${Math.max(width, viewport.clientWidth)}px`;
    canvas.style.height = `${Math.max(height, viewport.clientHeight)}px`;
    dialog.dataset.zoomed = String(zoomed);
    zoomButton.disabled = !canZoom;
    zoomButton.textContent = zoomed ? 'Fit artwork' : 'Zoom in';
    zoomButton.setAttribute('aria-pressed', String(zoomed));
    zoomButton.setAttribute('aria-label', zoomed ? 'Fit artwork to show the entire image' : 'Zoom in to inspect artwork details');
    viewport.setAttribute('aria-label', zoomed ? 'Zoomed artwork. Scroll or use arrow keys to pan.' : 'Artwork overview. Use Zoom in to inspect details.');
    if (resetScroll) {
      viewport.scrollLeft = Math.max(0, (canvas.offsetWidth - viewport.clientWidth) / 2);
      viewport.scrollTop = Math.max(0, (canvas.offsetHeight - viewport.clientHeight) / 2);
    }
  }

  function finishLoading() {
    if (!dialog.open || !image.naturalWidth) return;
    loaded = true;
    dialog.dataset.loading = 'false';
    status.hidden = true;
    layout(true);
  }

  function showArtwork(index) {
    if (!group.length) return;
    active = (index + group.length) % group.length;
    const link = group[active];
    const source = link.querySelector('img');
    zoomed = false;
    loaded = false;
    dialog.dataset.loading = 'true';
    dialog.dataset.zoomed = 'false';
    zoomButton.disabled = true;
    zoomButton.textContent = 'Zoom in';
    zoomButton.setAttribute('aria-pressed', 'false');
    status.textContent = 'Loading artwork…';
    status.hidden = false;
    image.style.width = '0px';
    image.style.height = '0px';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;
    image.alt = source?.alt || link.dataset.caption || 'Selected artwork';
    caption.textContent = link.dataset.caption || source?.alt || 'Selected artwork';
    count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(group.length).padStart(2, '0')}`;
    previous.hidden = group.length < 2;
    next.hidden = group.length < 2;
    original.href = link.href;
    image.src = link.href;
    if (image.complete && image.naturalWidth) finishLoading();
  }

  image.addEventListener('load', finishLoading);
  image.addEventListener('error', () => {
    if (!dialog.open) return;
    loaded = false;
    status.textContent = 'This image could not load. Open full size to try the original.';
    status.hidden = false;
  });
  document.addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest('a[data-gallery]') : null;
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const seen = new Set();
    group = [...document.querySelectorAll('a[data-gallery]')].filter(item => {
      if (item.dataset.gallery !== link.dataset.gallery || seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    });
    if (!group.length) return;
    event.preventDefault();
    returnFocus = link;
    dialog.showModal();
    showArtwork(group.findIndex(item => item.href === link.href));
    close.focus({ preventScroll: true });
  });

  zoomButton.addEventListener('click', () => {
    if (!loaded) return;
    zoomed = !zoomed;
    layout(true);
    if (zoomed) viewport.focus({ preventScroll: true });
  });
  close.addEventListener('click', () => dialog.close());
  previous.addEventListener('click', () => showArtwork(active - 1));
  next.addEventListener('click', () => showArtwork(active + 1));
  dialog.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    if (zoomed) {
      event.preventDefault();
      const amount = Math.max(60, Math.round(viewport.clientWidth / 4));
      viewport.scrollBy({ left: event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0, top: event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0 });
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showArtwork(active + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    loaded = false;
    zoomed = false;
    image.removeAttribute('src');
    original.removeAttribute('href');
    cancelAnimationFrame(resizeFrame);
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  });
  const resize = () => {
    if (!dialog.open) return;
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => layout(true));
  };
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(viewport);
  else window.addEventListener('resize', resize);
})();
