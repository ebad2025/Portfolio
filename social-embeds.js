(() => {
  'use strict';
  const previews = [...document.querySelectorAll('[data-social-video]')];
  if (!previews.length || typeof HTMLDialogElement === 'undefined') return;
  const videos = previews.map(preview => ({
    preview,
    title: preview.dataset.videoTitle,
    provider: preview.dataset.provider,
    original: preview.href,
    embed: preview.dataset.embedSrc
  })).filter(video => {
    try {
      const original = new URL(video.original);
      const embed = new URL(video.embed);
      const instagram = video.provider === 'Instagram' && original.hostname === 'www.instagram.com' && embed.hostname === original.hostname && /^\/(p|reel)\/[A-Za-z0-9_-]+\/embed\/$/.test(embed.pathname);
      const linkedin = video.provider === 'LinkedIn' && original.hostname === 'www.linkedin.com' && embed.hostname === original.hostname && /^\/embed\/feed\/update\/urn:li:activity:\d+$/.test(embed.pathname);
      return original.protocol === 'https:' && embed.protocol === 'https:' && (instagram || linkedin);
    } catch { return false; }
  });
  if (!videos.length) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'social-video-dialog';
  dialog.setAttribute('aria-labelledby', 'social-video-title');
  dialog.innerHTML = `<div class="social-video-header"><div><p class="social-video-kicker"></p><h2 id="social-video-title"></h2></div><button class="social-video-close" type="button" aria-label="Close video">✕</button></div><p class="social-video-status" role="status" aria-live="polite"></p><div class="social-video-frame"></div><div class="social-video-footer"><div class="social-video-buttons"><button class="social-video-prev" type="button" aria-label="Previous video">←</button><button class="social-video-next" type="button" aria-label="Next video">→</button></div><a class="social-video-original" target="_blank" rel="noopener noreferrer"></a></div><p class="social-video-note">If playback is unavailable, open the original post above.</p>`;
  document.body.append(dialog);
  const frameBox = dialog.querySelector('.social-video-frame');
  const title = dialog.querySelector('#social-video-title');
  const kicker = dialog.querySelector('.social-video-kicker');
  const status = dialog.querySelector('.social-video-status');
  const original = dialog.querySelector('.social-video-original');
  const previous = dialog.querySelector('.social-video-prev');
  const next = dialog.querySelector('.social-video-next');
  const close = dialog.querySelector('.social-video-close');
  let selected = 0;
  let opener = null;
  let pending = 0;

  function unload() {
    clearTimeout(pending);
    pending = 0;
    frameBox.replaceChildren();
  }

  function select(index) {
    if (index < 0 || index >= videos.length) return;
    unload();
    selected = index;
    const video = videos[index];
    title.textContent = video.title;
    kicker.textContent = `${String(index + 1).padStart(2, '0')} / ${String(videos.length).padStart(2, '0')} · ${video.provider}`;
    status.textContent = `Loading ${video.provider} player…`;
    original.href = video.original;
    original.textContent = `Open on ${video.provider} ↗`;
    previous.disabled = index === 0;
    next.disabled = index === videos.length - 1;
    dialog.dataset.provider = video.provider.toLowerCase();
    const frame = document.createElement('iframe');
    frame.title = `${video.title} — ${video.provider} video`;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allow = 'fullscreen; encrypted-media; picture-in-picture';
    frame.allowFullscreen = true;
    frame.addEventListener('load', () => {
      if (frameBox.firstElementChild !== frame) return;
      clearTimeout(pending);
      status.textContent = `Playback is provided by ${video.provider}.`;
    });
    frame.addEventListener('error', () => {
      if (frameBox.firstElementChild !== frame) return;
      clearTimeout(pending);
      status.textContent = 'The player could not load. Use the original post link below.';
    });
    pending = setTimeout(() => {
      if (frameBox.firstElementChild === frame) status.textContent = 'Taking longer to load? You can open the original post below.';
    }, 10000);
    const source = new URL(video.embed);
    if (video.provider === 'Instagram') {
      // Match the iframe URL emitted by Instagram's official embed.js.
      source.searchParams.set('cr', '1');
      source.searchParams.set('v', '14');
      source.searchParams.set('wp', String(Math.round(frameBox.clientWidth)));
      source.searchParams.set('rd', location.origin);
      source.searchParams.set('rp', location.pathname);
    }
    frame.src = source.href;
    frameBox.append(frame);
  }

  videos.forEach((video, index) => {
    video.preview.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = video.preview;
      dialog.showModal();
      select(index);
      close.focus();
    });
  });
  previous.addEventListener('click', () => {
    select(selected - 1);
    if (previous.disabled) next.focus();
  });
  next.addEventListener('click', () => {
    select(selected + 1);
    if (next.disabled) previous.focus();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    unload();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });
  window.addEventListener('pagehide', () => {
    if (dialog.open) dialog.close();
    else unload();
  });
})();
