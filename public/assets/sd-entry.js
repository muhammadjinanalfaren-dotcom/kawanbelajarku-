// Preserve bookmarked routes from the previous site.
const legacy = () => location.hash.startsWith('#/') && location.hash.length > 2;
const initial = legacy();
addEventListener('hashchange', () => {
  if (initial !== legacy()) location.reload();
});
if (initial) await import('./student.js');else await import('./sd-student.js');
