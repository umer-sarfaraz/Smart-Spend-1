// Penny Roost website: the few things that move. Everything works without it.
(function () {
  document.documentElement.classList.remove('no-js');

  // The header gets a hairline once the page has moved.
  var head = document.querySelector('.site-head');
  if (head) {
    var onScroll = function () { head.classList.toggle('scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canWatch = 'IntersectionObserver' in window;

  // Sections rise in once, as they arrive.
  var reveals = document.querySelectorAll('.reveal');
  if (!canWatch || reduce) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { seen.observe(el); });
    // A jump to #prices skips the sections in between; never leave them hidden.
    var catchUp = function () {
      reveals.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in'); });
    };
    window.addEventListener('load', function () { setTimeout(catchUp, 1200); });
    window.addEventListener('hashchange', function () { setTimeout(catchUp, 600); });
    window.addEventListener('beforeprint', function () { reveals.forEach(function (el) { el.classList.add('in'); }); });
  }

  // The phone beside the features shows the screen the reader has reached.
  var screens = document.querySelectorAll('.stage .screen img');
  var features = document.querySelectorAll('.feature[data-screen]');
  if (screens.length && features.length && canWatch) {
    var show = function (name) {
      screens.forEach(function (img) { img.classList.toggle('on', img.getAttribute('data-screen') === name); });
    };
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) show(e.target.getAttribute('data-screen')); });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    features.forEach(function (f) { watch.observe(f); });
  }

  // Monthly or yearly price.
  var plan = document.querySelector('.plan.featured');
  var buttons = document.querySelectorAll('.toggle button');
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      var yearly = b.getAttribute('data-period') === 'year';
      buttons.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      if (plan) plan.classList.toggle('show-yearly', yearly);
    });
  });
})();
