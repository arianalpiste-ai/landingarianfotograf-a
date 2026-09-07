(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var selection = new URLSearchParams(location.search).has('seleccion');
  var viewer = setupViewer();
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  setupHeader();
  setupNav();
  document.querySelectorAll('.fade-up').forEach(function (el) { el.classList.add('in-view'); });
  if (document.getElementById('heroSlides')) {
    fetch('assets/manifest.json').then(function (r) {
      if (!r.ok) throw new Error('No se pudo cargar la galería');
      return r.json();
    }).then(function (data) {
      buildHero(data.hero);
      ['eventos', 'retratos'].forEach(function (key) {
        var container = document.getElementById(key + 'Groups');
        data[key].forEach(function (group, i) {
          var title = group.title || 'Retratos · Sesión ' + (i + 1);
          var wrap = document.createElement('div');
          wrap.className = 'event-group';
          var heading = document.createElement('h3');
          heading.className = 'event-group-title';
          heading.textContent = title;
          wrap.appendChild(heading);
          container.appendChild(wrap);
          buildGallery(wrap, group.items, title, group.featured, key + '-' + i);
        });
      });
      ['paisaje', 'documental'].forEach(function (key) {
        buildGallery(document.getElementById(key + 'Grid'), data[key], key === 'paisaje' ? 'Paisaje & Viajes' : 'Documental', (data.featured || {})[key], key);
      });
      setupCategoryNav();
    }).catch(function () {
      var error = document.createElement('p');
      error.className = 'gallery-error';
      error.textContent = 'No pudimos cargar las fotografías. Recarga la página para volver a intentarlo.';
      document.getElementById('eventosGroups').appendChild(error);
    }).finally(hidePreloader);
    document.getElementById('heroScroll').addEventListener('click', function () {
      document.getElementById('eventos').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
    });
    if (selection) {
      var note = document.createElement('p');
      note.className = 'selection-note';
      note.textContent = 'Selección de fotos: abre cada sesión y anota los nombres de tus tres favoritas, en el orden que prefieras.';
      document.querySelector('main').prepend(note);
    }
  } else {
    document.querySelectorAll('.pp-item').forEach(function (item) {
      var title = item.querySelector('.pp-title').textContent;
      item.setAttribute('role', 'button');
      item.tabIndex = 0;
      item.setAttribute('aria-label', 'Ver fotografías de ' + title);
      var images = item.dataset.gallery.split(',').slice(0, 5).map(function (src, i) {
        return { src: src.trim(), alt: title + ' · Fotografía ' + (i + 1) };
      });
      function open() { viewer.open(images, 0, title, item); }
      item.addEventListener('click', open);
      item.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    hidePreloader();
  }

  function hidePreloader() {
    var el = document.getElementById('preloader');
    if (el) el.classList.add('hidden');
  }

  function buildGallery(container, items, title, featured, id) {
    var chosen = (featured || []).map(function (src) { return items.find(function (im) { return im.src === src; }); }).filter(Boolean).slice(0, 3);
    var ordered = chosen.concat(items.filter(function (im) { return chosen.indexOf(im) === -1; }));
    var rows = [];
    var wrap = document.createElement('div');
    wrap.className = 'photo-rows-wrap';
    wrap.id = 'photos-' + id;
    container.appendChild(wrap);
    ordered.forEach(function (item, i) {
      if (i % 3 === 0) {
        var row = document.createElement('div');
        row.className = 'photo-row';
        row.hidden = i >= 3;
        wrap.appendChild(row);
        rows.push(row);
      }
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'photo-item';
      button.style.setProperty('--ratio', item.w / item.h);
      button.dataset.src = item.src;
      button.setAttribute('aria-label', 'Abrir ' + title + ', fotografía ' + (i + 1));
      var img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = item.w;
      img.height = item.h;
      img.alt = item.alt || title + ' · Fotografía ' + (i + 1);
      if (item.srcset) { img.srcset = item.srcset; img.sizes = '(max-width: 760px) calc(100vw - 48px), 45vw'; }
      img.src = item.src;
      button.appendChild(img);
      if (selection) {
        var label = document.createElement('span');
        label.className = 'photo-reference';
        label.textContent = item.src.split('/').pop();
        button.appendChild(label);
      }
      button.addEventListener('click', function () { viewer.open(ordered, i, title, button); });
      rows[rows.length - 1].appendChild(button);
    });
    if (ordered.length > 3) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'show-more-btn';
      btn.setAttribute('aria-controls', wrap.id);
      btn.setAttribute('aria-expanded', 'false');
      var moreText = 'Ver fotos';
      btn.textContent = moreText;
      btn.addEventListener('click', function () {
        var expand = btn.getAttribute('aria-expanded') !== 'true';
        rows.forEach(function (row, i) { row.hidden = i > 0 && !expand; });
        btn.setAttribute('aria-expanded', String(expand));
        btn.textContent = expand ? 'Ocultar fotos' : moreText;
        if (!expand) container.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      });
      container.appendChild(btn);
    }
  }

  function buildHero(slides) {
    if (!slides || !slides.length) return;
    var container = document.getElementById('heroSlides');
    var dots = document.getElementById('heroDots');
    var pause = document.getElementById('heroPause');
    var current = 0, timer, paused = reduced.matches;
    var nodes = [], controls = [];
    slides.forEach(function (slide, i) {
      var el = document.createElement('div');
      el.className = 'hero-slide' + (i === 0 ? ' active' : '');
      container.appendChild(el);
      nodes.push(el);
      var dot = document.createElement('button');
      dot.className = 'hero-dot';
      dot.setAttribute('aria-label', 'Mostrar imagen ' + (i + 1));
      dot.setAttribute('aria-pressed', String(i === 0));
      dot.addEventListener('click', function () { go(i); });
      dots.appendChild(dot);
      controls.push(dot);
    });
    function load(i) {
      if (nodes[i].firstChild) return;
      var im = document.createElement('img');
      im.alt = '';
      im.width = slides[i].w;
      im.height = slides[i].h;
      if (slides[i].srcset) { im.srcset = slides[i].srcset; im.sizes = '100vw'; }
      im.fetchPriority = i === 0 ? 'high' : 'low';
      im.src = slides[i].src;
      nodes[i].appendChild(im);
    }
    function schedule() {
      clearTimeout(timer);
      pause.textContent = paused ? 'Reanudar presentación' : 'Pausar presentación';
      pause.setAttribute('aria-pressed', String(paused));
      if (!paused && !document.hidden) timer = setTimeout(function () { go((current + 1) % slides.length); }, 5500);
    }
    function go(i) {
      load(i);
      nodes[current].classList.remove('active');
      controls[current].setAttribute('aria-pressed', 'false');
      current = i;
      nodes[current].classList.add('active');
      controls[current].setAttribute('aria-pressed', 'true');
      schedule();
    }
    pause.addEventListener('click', function () { paused = !paused; schedule(); });
    reduced.addEventListener('change', function () { paused = reduced.matches; schedule(); });
    document.addEventListener('visibilitychange', schedule);
    go(0);
  }

  function setupViewer() {
    var modal = document.getElementById('lightbox');
    var img = document.getElementById('lightboxImg');
    var count = document.getElementById('lightboxCount');
    var titleEl = document.getElementById('lightboxTitle');
    var reference = document.getElementById('lightboxReference');
    var status = document.getElementById('lightboxStatus');
    var closeBtn = document.getElementById('lightboxClose');
    var prev = document.getElementById('lightboxPrev');
    var next = document.getElementById('lightboxNext');
    var images = [], index = 0, title = '', opener, token = 0, inertStates = [], start;
    function render() {
      var ticket = ++token;
      var data = images[index];
      img.classList.remove('show');
      count.textContent = (index + 1) + ' de ' + images.length;
      titleEl.textContent = title;
      reference.textContent = selection ? data.src.split('/').pop() : '';
      status.textContent = 'Cargando fotografía…';
      prev.hidden = next.hidden = images.length < 2;
      var preload = new Image();
      preload.onload = function () {
        if (ticket !== token) return;
        img.src = data.src;
        img.alt = data.alt || title + ' · Fotografía ' + (index + 1) + ' de ' + images.length;
        img.classList.add('show');
        status.textContent = '';
      };
      preload.onerror = function () { if (ticket === token) status.textContent = 'No se pudo cargar esta foto. Puedes pasar a la siguiente.'; };
      preload.src = data.src;
    }
    function move(delta) { index = (index + delta + images.length) % images.length; render(); }
    function close() {
      ++token;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      inertStates.forEach(function (state) { state[0].inert = state[1]; });
      if (opener) opener.focus({ preventScroll: true });
    }
    closeBtn.addEventListener('click', close);
    prev.addEventListener('click', function () { move(-1); });
    next.addEventListener('click', function () { move(1); });
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    modal.addEventListener('touchstart', function (e) { if (e.touches.length === 1) start = { x: e.touches[0].clientX, y: e.touches[0].clientY }; else start = null; }, { passive: true });
    modal.addEventListener('touchend', function (e) {
      if (!start || !e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - start.x, dy = e.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
      start = null;
    }, { passive: true });
    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
      if (e.key === 'Tab') {
        var buttons = [closeBtn, prev, next].filter(function (b) { return !b.hidden; });
        var first = buttons[0], last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
      }
    });
    return { open: function (list, selected, sessionTitle, trigger) {
      images = list; index = selected; title = sessionTitle; opener = trigger;
      inertStates = Array.from(document.body.children).filter(function (el) { return el !== modal && el.tagName !== 'SCRIPT'; }).map(function (el) { return [el, el.inert]; });
      inertStates.forEach(function (state) { state[0].inert = true; });
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      render();
      requestAnimationFrame(function () { if (modal.classList.contains('open')) closeBtn.focus(); });
    } };
  }

  function setupHeader() {
    var header = document.getElementById('siteHeader');
    function update() { header.classList.toggle('solid', window.scrollY > 60); }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }
  function setupNav() {
    var toggle = document.getElementById('navToggle'), nav = document.getElementById('mainNav');
    var mobile = window.matchMedia('(max-width: 1100px)');
    function setOpen(open) {
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      nav.inert = mobile.matches && !open;
    }
    toggle.addEventListener('click', function () { setOpen(!document.body.classList.contains('nav-open')); });
    nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { setOpen(false); toggle.focus(); } });
    document.addEventListener('click', function (e) { if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false); });
    mobile.addEventListener('change', function () { setOpen(false); });
    setOpen(false);
    var localLinks = Array.from(nav.querySelectorAll('a[href*="#"]')).filter(function (a) { return document.getElementById(a.hash.slice(1)); });
    if (localLinks.length) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) localLinks.forEach(function (a) { a.classList.toggle('active', a.hash === '#' + entry.target.id); });
        });
      }, { rootMargin: '-20% 0px -65% 0px' });
      localLinks.forEach(function (a) { observer.observe(document.getElementById(a.hash.slice(1))); });
    }
  }
  function setupCategoryNav() {
    var links = Array.from(document.querySelectorAll('.category-nav a'));
    function update() {
      var active = links[0];
      links.forEach(function (a) { if (document.querySelector(a.hash).getBoundingClientRect().top <= 200) active = a; });
      links.forEach(function (a) { if (a === active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }
})();
