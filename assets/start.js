// 5-minute setup: the three lanes work as tabs, each lane shows how many of its
// steps are ticked off, and Lane 2 builds your GitHub Pages link as you type.
(() => {
  if (location.hash === '#ship') location.replace('ship.html'); // Ship used to live on this page
  const { store } = window.UND;
  const lanes = [...document.querySelectorAll('.lane')];
  const tabs = [...document.querySelectorAll('.lane-tab')];

  function showLane(id) {
    if (!lanes.some((lane) => lane.id === id)) return false;
    for (const lane of lanes) lane.hidden = lane.id !== id;
    for (const tab of tabs) tab.setAttribute('aria-current', String(tab.hash === `#${id}`));
    return true;
  }

  // Show the lane a link points to, then scroll to its target: hiding the other
  // lanes moves everything below them (like #tools), so the browser's own jump misses.
  function follow(id, behavior) {
    showLane(id);
    document.getElementById(id)?.scrollIntoView({ behavior });
  }
  for (const tab of tabs) tab.addEventListener('click', () => showLane(tab.hash.slice(1)));
  window.addEventListener('hashchange', () => follow(location.hash.slice(1), 'auto'));
  showLane('lane-1');
  follow(location.hash.slice(1), 'instant');

  function updateProgress(lane) {
    const boxes = [...lane.querySelectorAll('input[type="checkbox"]')];
    const done = boxes.filter((box) => box.checked).length;
    lane.querySelector('.progress i').style.setProperty('--p', `${(done / boxes.length) * 100}%`);
    lane.querySelector('.progress-count').textContent = `${done} of ${boxes.length} done`;
  }
  for (const lane of lanes) {
    updateProgress(lane);
    lane.addEventListener('change', () => updateProgress(lane));
  }

  // The Gemini Canvas sketch: Code and Preview tabs switch like the real ones.
  const canvas = document.querySelector('.mock-canvas');
  canvas.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-view]');
    if (!tab) return;
    for (const b of canvas.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed', String(b === tab));
    canvas.querySelector('.mc-preview').hidden = tab.dataset.view !== 'preview';
    canvas.querySelector('.mc-code').hidden = tab.dataset.view !== 'code';
  });

  // https://USERNAME.github.io/REPO/ — the inputs grow as you type.
  const user = document.getElementById('gh-user');
  const repo = document.getElementById('gh-repo');
  const open = document.getElementById('gh-open');
  function updateLink() {
    const name = user.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const project = repo.value.trim().replace(/[^\w.-]/g, '');
    for (const input of [user, repo]) {
      input.style.width = `${Math.max(input.placeholder.length, input.value.length) + 2}ch`;
      store.set(input.id, input.value);
    }
    open.hidden = !(name && project);
    open.href = `https://${name}.github.io/${project}/`;
  }
  for (const input of [user, repo]) {
    input.value = store.get(input.id) || '';
    input.addEventListener('input', updateLink);
  }
  updateLink();
})();
