(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var selection = new URLSearchParams(location.search).has('seleccion');
  var viewer = setupViewer();
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  setupHeader();
  setupGuidesDropdown();
  setupNav();
  setupContactForm();
  setupArticleToc();
  setupCalEmbed();
  setupFamilyCarousel();
  setupPlaceToggle();
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

  function setupContactForm() {
    var form = document.querySelector('form[name="contacto"]');
    if (!form) return;
    var button = form.querySelector('button[type="submit"]');
    var status = form.querySelector('.form-status');
    var started = form.querySelector('[name="iniciado"]');

    function resetStartedAt() { started.value = String(Date.now()); }
    resetStartedAt();

    var contactResult = new URLSearchParams(location.search).get('contacto');
    if (contactResult === 'exito' || contactResult === 'error') {
      status.className = 'form-status ' + (contactResult === 'exito' ? 'is-success' : 'is-error');
      status.textContent = contactResult === 'exito'
        ? '¡Gracias! Tu consulta fue enviada correctamente.'
        : 'No pudimos enviar tu consulta. Inténtalo nuevamente o escríbenos por WhatsApp.';
      var cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete('contacto');
      history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;

      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      status.className = 'form-status';
      status.textContent = '';

      var data = Object.fromEntries(new FormData(form).entries());
      fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (response) {
        if (!response.ok) throw new Error('No se pudo enviar el formulario');
        return response.json();
      }).then(function (result) {
        if (result.eventId) {
          document.dispatchEvent(new CustomEvent('meta:lead', {
            detail: { eventId: result.eventId, contentName: data.evento || 'Formulario web' }
          }));
        }
        form.reset();
        resetStartedAt();
        status.className = 'form-status is-success';
        status.textContent = '¡Gracias! Tu consulta fue enviada correctamente.';
      }).catch(function () {
        status.className = 'form-status is-error';
        status.textContent = 'No pudimos enviar tu consulta. Inténtalo nuevamente o escríbenos por WhatsApp.';
      }).finally(function () {
        button.disabled = false;
        button.removeAttribute('aria-busy');
      });
    });
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
    if (!modal) return { open: function () {} };
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
    if (!header) return;
    function update() { header.classList.toggle('solid', window.scrollY > 60); }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }
  function setupGuidesDropdown() {
    var nav = document.getElementById('mainNav');
    if (!nav) return;
    var dropdown = nav.querySelector('.nav-dropdown');
    if (!dropdown) {
      var guideLinks = Array.from(nav.querySelectorAll('a')).filter(function (link) {
        var path = new URL(link.href, location.href).pathname;
        return path.indexOf('/blog') === 0 || path.indexOf('/recursos') === 0;
      });
      if (!guideLinks.length) return;
      dropdown = document.createElement('div');
      dropdown.className = 'nav-dropdown';
      dropdown.innerHTML = '<button type="button" class="nav-link nav-dropdown-toggle" aria-expanded="false">Contenido<svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5 6 6.5l5-5"/></svg></button><div class="nav-dropdown-menu"><a href="/blog/"><strong>Blog</strong><span>Consejos para planificar tus fotos</span></a><a href="/recursos/"><strong>Recursos gratuitos</strong><span>Checklists y guías prácticas</span></a></div>';
      guideLinks[0].before(dropdown);
      guideLinks.forEach(function (link) { link.remove(); });
    }
    var button = dropdown.querySelector('.nav-dropdown-toggle');
    if (location.pathname.indexOf('/blog') === 0 || location.pathname.indexOf('/recursos') === 0) button.classList.add('active');
    function setGuidesOpen(open) {
      dropdown.classList.toggle('open', open);
      button.setAttribute('aria-expanded', String(open));
    }
    button.addEventListener('click', function (event) {
      event.stopPropagation();
      setGuidesOpen(!dropdown.classList.contains('open'));
    });
    dropdown.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', function () { setGuidesOpen(false); }); });
    document.addEventListener('click', function (event) { if (!dropdown.contains(event.target)) setGuidesOpen(false); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && dropdown.classList.contains('open')) {
        setGuidesOpen(false);
        button.focus();
      }
    });
  }
  function setupNav() {
    var toggle = document.getElementById('navToggle'), nav = document.getElementById('mainNav');
    if (!toggle || !nav) return;
    var mobile = window.matchMedia('(max-width: 1100px)');
    function setOpen(open) {
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      nav.inert = mobile.matches && !open;
      if (!open) {
        var guides = nav.querySelector('.nav-dropdown');
        if (guides) {
          guides.classList.remove('open');
          guides.querySelector('.nav-dropdown-toggle').setAttribute('aria-expanded', 'false');
        }
      }
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

  function setupArticleToc() {
    var toc = document.querySelector('.article-toc');
    var body = document.querySelector('.article-body');
    var list = toc && toc.querySelector('.article-toc-list');
    var toggle = toc && toc.querySelector('.article-toc-toggle');
    if (!toc || !body || !list || !toggle) return;
    var headings = Array.from(body.querySelectorAll('h2'));
    if (headings.length < 2) { toc.remove(); return; }
    var usedIds = {};
    var links = headings.map(function (h) {
      if (!h.id) {
        var base = h.textContent.trim().toLowerCase()
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') || 'seccion';
        var id = base, n = 2;
        while (usedIds[id]) { id = base + '-' + (n++); }
        usedIds[id] = true;
        h.id = id;
      }
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent.trim();
      li.appendChild(a);
      list.appendChild(li);
      return a;
    });
    var narrow = window.matchMedia('(max-width: 899px)');
    function setOpen(open) {
      toc.setAttribute('data-open', String(open));
      toggle.setAttribute('aria-expanded', String(open));
    }
    toggle.addEventListener('click', function () { setOpen(toc.getAttribute('data-open') === 'false'); });
    setOpen(!narrow.matches);
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var link = links[headings.indexOf(entry.target)];
        links.forEach(function (a) { a.classList.remove('is-active'); });
        link.classList.add('is-active');
      });
    }, { rootMargin: '-20% 0px -65% 0px' });
    headings.forEach(function (h) { observer.observe(h); });
  }
  function setupCalEmbed() {
    (function (C, A, L) {
      var p = function (a, ar) { a.q.push(ar); };
      var d = C.document;
      C.Cal = C.Cal || function () {
        var cal = C.Cal; var ar = arguments;
        if (!cal.loaded) {
          cal.ns = {}; cal.q = cal.q || [];
          d.head.appendChild(d.createElement('script')).src = A;
          cal.loaded = true;
        }
        if (ar[0] === L) {
          var api = function () { p(api, arguments); };
          var namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === 'string') {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ['initNamespace', namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, 'https://app.cal.com/embed/embed.js', 'init');
    window.Cal('init', '15min', { origin: 'https://app.cal.com' });
    window.Cal.config = window.Cal.config || {};
    window.Cal.config.forwardQueryParams = true;
    window.Cal.ns['15min']('ui', { hideEventTypeDetails: false, layout: 'month_view' });
    document.querySelectorAll('[data-cal-link]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); });
    });
  }
  // Carrusel simple de la landing de sesiones familiares, en bucle continuo. El movimiento es el
  // desplazamiento nativo del navegador (deslizar con el dedo funciona solo). Para que no tenga
  // principio ni fin, las fotos se copian una vez antes y una vez después; cuando el desplazamiento
  // se detiene sobre una copia, se salta sin animación a la foto original equivalente.
  function setupFamilyCarousel() {
    var root = document.getElementById('familyCarousel');
    if (!root) return;
    var viewport = root.querySelector('.fc-viewport');
    var track = root.querySelector('.fc-track');
    var dotsWrap = root.querySelector('.fc-dots');
    var originals = Array.from(track.querySelectorAll('.fc-slide'));
    var n = originals.length;
    if (n < 2) return;
    var images = originals.map(function (slide) { return { src: slide.dataset.full, alt: slide.querySelector('img').alt }; });
    var target = null, settleTimer = null, touching = false, ticking = false;

    function copy(slide) {
      var clone = slide.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelector('.fc-card').tabIndex = -1;
      return clone;
    }
    originals.forEach(function (slide) { track.insertBefore(copy(slide), originals[0]); });
    originals.forEach(function (slide) { track.appendChild(copy(slide)); });
    var slides = Array.from(track.querySelectorAll('.fc-slide')); // copias · originales · copias
    slides.forEach(function (slide, i) {
      var card = slide.querySelector('.fc-card');
      card.addEventListener('click', function () { viewer.open(images, i % n, 'Sesiones recientes', card); });
    });

    var dots = originals.map(function (slide, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'fc-dot';
      dot.setAttribute('aria-label', 'Ir a la foto ' + (i + 1) + ' de ' + n);
      dot.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(dot);
      return dot;
    });

    function stepWidth() { return slides[1].offsetLeft - slides[0].offsetLeft; }
    function raw() { return Math.round(viewport.scrollLeft / stepWidth()); }
    function logical(value) { return ((value % n) + n) % n; }
    function jump(position) { viewport.scrollLeft = position * stepWidth(); }
    function scrollToPosition(position) {
      var last = slides.length - Math.max(1, Math.round(viewport.clientWidth / stepWidth()));
      target = Math.max(0, Math.min(last, position));
      viewport.scrollTo({ left: target * stepWidth(), behavior: reduced.matches ? 'auto' : 'smooth' });
    }
    function move(dir) { scrollToPosition((target === null ? raw() : target) + dir); }
    function goTo(index) {
      var from = target === null ? raw() : target;
      var delta = index - logical(from);
      delta -= n * Math.round(delta / n); // camino más corto
      scrollToPosition(from + delta);
    }
    function update() {
      ticking = false;
      var current = logical(raw());
      dots.forEach(function (dot, i) {
        if (i === current) dot.setAttribute('aria-current', 'true'); else dot.removeAttribute('aria-current');
      });
    }
    // Al detenerse, vuelve al juego central de fotos. Es la misma imagen en el mismo lugar: no se nota.
    function settle() {
      clearTimeout(settleTimer);
      if (touching) return;
      target = null;
      var position = raw();
      if (position < n) jump(position + n);
      else if (position >= 2 * n) jump(position - n);
    }

    root.querySelector('.fc-prev').addEventListener('click', function () { move(-1); });
    root.querySelector('.fc-next').addEventListener('click', function () { move(1); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
    });
    viewport.addEventListener('scroll', function () {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 140);
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    viewport.addEventListener('scrollend', settle);
    viewport.addEventListener('touchstart', function () { touching = true; }, { passive: true });
    ['touchend', 'touchcancel'].forEach(function (type) {
      viewport.addEventListener(type, function () { touching = false; clearTimeout(settleTimer); settleTimer = setTimeout(settle, 140); }, { passive: true });
    });
    window.addEventListener('resize', function () { var keep = logical(raw()); target = null; jump(n + keep); update(); });

    // Las copias comparten archivo con las originales: se cargan todas al acercarse, para que el salto no parpadee.
    function loadAll() { slides.forEach(function (slide) { var img = slide.querySelector('img'); img.loading = 'eager'; img.decoding = 'sync'; }); }
    if ('IntersectionObserver' in window) {
      var near = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) { loadAll(); near.disconnect(); }
      }, { rootMargin: '600px 0px' });
      near.observe(root);
    } else loadAll();

    root.classList.add('is-loop');
    jump(n);
    update();
  }
  // Selector Exteriores / Estudio de los paquetes: muestra los precios y detalles del lugar elegido
  // y actualiza lo que se envía al Pixel al tocar «Reservar».
  function setupPlaceToggle() {
    var buttons = Array.from(document.querySelectorAll('[data-place-btn]'));
    if (!buttons.length) return;
    var labels = { exteriores: 'Exteriores', estudio: 'Estudio' };
    function setPlace(place) {
      if (!labels[place]) return;
      buttons.forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.placeBtn === place)); });
      document.querySelectorAll('[data-place]').forEach(function (el) { el.hidden = el.dataset.place !== place; });
      document.querySelectorAll('[data-package-name]').forEach(function (link) {
        link.dataset.package = link.dataset.packageName + ' · ' + labels[place];
        link.dataset.value = place === 'estudio' ? link.dataset.valueEstudio : link.dataset.valueExteriores;
      });
    }
    buttons.forEach(function (button) { button.addEventListener('click', function () { setPlace(button.dataset.placeBtn); }); });
    document.querySelectorAll('[data-place-pick]').forEach(function (link) {
      link.addEventListener('click', function () { setPlace(link.dataset.placePick); });
    });
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
