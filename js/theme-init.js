(function () {
  var mode = 'dark';
  try {
    var saved = localStorage.getItem('passport.theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') mode = saved;
  } catch (err) { /* noop */ }

  var effective = mode;
  if (mode === 'system') {
    try {
      effective = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch (err) {
      effective = 'dark';
    }
  }
  document.documentElement.setAttribute('data-theme-mode', mode);
  document.documentElement.setAttribute('data-theme', effective);
})();
