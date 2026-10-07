(() => {
  const container = document.querySelector('[data-hero-words]');
  if (!container) return;

  const words = Array.from(container.querySelectorAll('[data-hero-word]'));
  if (words.length < 2) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeIndex = 0;
  let timer = null;
  let pageSuspended = false;

  function showWord(index) {
    activeIndex = index;
    words.forEach((word, wordIndex) => {
      word.setAttribute('data-word-active', String(wordIndex === activeIndex));
    });
  }

  function stop() {
    if (timer === null) return;
    window.clearInterval(timer);
    timer = null;
  }

  function syncPlayback() {
    stop();
    if (reducedMotion.matches) {
      showWord(0);
      return;
    }
    if (document.hidden || pageSuspended) return;
    timer = window.setInterval(() => {
      showWord((activeIndex + 1) % words.length);
    }, 2000);
  }

  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', syncPlayback);
  window.addEventListener('pagehide', () => {
    pageSuspended = true;
    stop();
  });
  window.addEventListener('pageshow', () => {
    pageSuspended = false;
    syncPlayback();
  });

  showWord(0);
  syncPlayback();
})();
