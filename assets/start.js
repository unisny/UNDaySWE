// Build page: old links to steps that moved go on to the Ship page, and the
// codespace sketch's index.html and Preview tabs switch like the real ones.
(() => {
  const MOVED = { '#ship': 'ship.html', '#lane-2': 'ship.html#online' };
  if (MOVED[location.hash]) location.replace(MOVED[location.hash]);

  const editor = document.querySelector('.mock-editor');
  editor.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-view]');
    if (!tab) return;
    for (const b of editor.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed', String(b === tab));
    editor.querySelector('.mc-preview').hidden = tab.dataset.view !== 'preview';
    editor.querySelector('.mc-code').hidden = tab.dataset.view !== 'code';
  });
})();
