// Injects a small floating light/dark toggle button on every page that
// includes this script. The actual theme value is read/applied earlier
// (see the inline snippet in each page's <head>) so there's no flash of
// the wrong theme — this just adds the visible control and persists
// changes for next time.
(function () {
  function sunIcon() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
  }
  function moonIcon() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>';
  }

  function init() {
    var btn = document.createElement('button');
    btn.id = 'themeToggleBtn';
    btn.setAttribute('aria-label', 'Switch between light and dark theme');
    btn.style.cssText = [
      'position:fixed', 'bottom:18px', 'right:18px', 'z-index:999',
      'width:44px', 'height:44px', 'border-radius:50%',
      'border:1px solid var(--border)', 'background:var(--umber)', 'color:var(--cream)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'cursor:pointer', 'box-shadow:0 6px 18px rgba(0,0,0,0.25)'
    ].join(';');

    function render() {
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      btn.innerHTML = current === 'dark' ? sunIcon() : moonIcon();
      btn.title = current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    }

    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('bitespot_theme', next); } catch (e) { /* storage unavailable, ignore */ }
      render();
    });

    render();
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
