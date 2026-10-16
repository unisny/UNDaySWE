// Ship page: the GitHub Pages step builds https://USERNAME.github.io/REPO/ as
// you type, and its two inputs grow to fit.
(() => {
  const { store } = window.UND;
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
