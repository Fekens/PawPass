document.addEventListener('click', function (event) {
  var button = event.target.closest('[data-view]');
  if (!button) return;
  var route = button.getAttribute('data-view');
  if (!route) return;
  window.location.hash = route;
  if (typeof render === 'function') render();
}, true);
