(function () {
  'use strict';

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  setupHeader();
  setupNavToggle();
  setupFadeIn();
  setupScrollSpy();

  var heroSlidesEl = document.getElementById('heroSlides');
  if (heroSlidesEl) {
    // Página de portafolio: carga el manifest y arma hero + galerías + lightbox
    fetch('assets/manifest.json')
      .then(function (r) { return r.json(); })
      .then(initPortfolio)
      .catch(function (err) { console.error('No se pudo cargar el manifest de imágenes', err); hidePreloader(); });
  } else {
    if (document.querySelector('.pp-item')) setupPreviewLightbox();
    hidePreloader();
  }

  function hidePreloader() {
    var preloader = document.getElementById('preloader');
    if (!preloader) return;
    window.requestAnimationFrame(function () {
      setTimeout(function () { preloader.classList.add('hidden'); }, 250);
    });
  }

  function initPortfolio(data) {
    buildHero(data.hero);
    var eventosFlat = buildEventGroups('eventosGroups', data.eventos);
    buildGrid('retratosGrid', data.retratos, 'Retrato');
    buildGrid('paisajeGrid', data.paisaje, 'Paisaje & Viajes');
    buildGrid('documentalGrid', data.documental, 'Documental');

    var allImages = [].concat(eventosFlat, data.retratos, data.paisaje, data.documental);
    setupLightbox(allImages);
    setupHeroScrollButton();
    hidePreloader();
  }

  /* ---------- Eventos: subgrupos con subtítulo por evento ---------- */
  function buildEventGroups(containerId, groups) {
    var container = document.getElementById(containerId);
    if (!container || !groups) return [];
    var flat = [];

    groups.forEach(function (group, gi) {
      var wrap = document.createElement('div');
      wrap.className = 'event-group';

      var title = document.createElement('h3');
      title.className = 'event-group-title';
      title.textContent = group.title;
      wrap.appendChild(title);

      var grid = document.createElement('div');
      grid.className = 'masonry';
      grid.id = containerId + gi;
      wrap.appendChild(grid);

      container.appendChild(wrap);
      buildGrid(grid.id, group.items, group.title);
      flat = flat.concat(group.items);
    });

    return flat;
  }

  /* ---------- Hero slideshow (portafolio.html) ---------- */
  function buildHero(slides) {
    var container = document.getElementById('heroSlides');
    var dotsContainer = document.getElementById('heroDots');
    if (!slides || !slides.length) return;

    slides.forEach(function (slide, i) {
      var div = document.createElement('div');
      div.className = 'hero-slide' + (i === 0 ? ' active' : '');
      div.style.backgroundImage = 'url(' + slide.src + ')';
      container.appendChild(div);

      if (dotsContainer) {
        var dot = document.createElement('button');
        dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Imagen ' + (i + 1));
        dot.addEventListener('click', function () { goToSlide(i); });
        dotsContainer.appendChild(dot);
      }
    });

    var slideEls = container.querySelectorAll('.hero-slide');
    var dotEls = dotsContainer ? dotsContainer.querySelectorAll('.hero-dot') : [];
    var current = 0;
    var timer;

    function goToSlide(index) {
      slideEls[current].classList.remove('active');
      if (dotEls[current]) dotEls[current].classList.remove('active');
      current = index;
      slideEls[current].classList.add('active');
      if (dotEls[current]) dotEls[current].classList.add('active');
      resetTimer();
    }

    function nextSlide() { goToSlide((current + 1) % slideEls.length); }

    function resetTimer() {
      clearInterval(timer);
      timer = setInterval(nextSlide, 5500);
    }

    resetTimer();
  }

  function setupHeroScrollButton() {
    var btn = document.getElementById('heroScroll');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var target = document.getElementById('eventos');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* ---------- Masonry grids ---------- */
  function buildGrid(containerId, items, altPrefix) {
    var container = document.getElementById(containerId);
    if (!container || !items) return;
    items.forEach(function (item, i) {
      var fig = document.createElement('div');
      fig.className = 'masonry-item fade-up';
      fig.dataset.src = item.src;

      var img = document.createElement('img');
      img.loading = 'lazy';
      img.src = item.src;
      img.alt = altPrefix + ' ' + (i + 1);
      img.width = item.w;
      img.height = item.h;
      img.style.aspectRatio = item.w + ' / ' + item.h;
      img.addEventListener('load', function () { img.classList.add('loaded'); });

      fig.appendChild(img);
      container.appendChild(fig);
    });
    observeFadeUps(container.querySelectorAll('.fade-up'));
  }

  /* ---------- Lightbox ---------- */
  function setupLightbox(allImages) {
    var lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    var imgEl = document.getElementById('lightboxImg');
    var countEl = document.getElementById('lightboxCount');
    var closeBtn = document.getElementById('lightboxClose');
    var prevBtn = document.getElementById('lightboxPrev');
    var nextBtn = document.getElementById('lightboxNext');
    var current = 0;

    document.querySelectorAll('.masonry-item').forEach(function (item, index) {
      item.addEventListener('click', function () { open(index); });
    });

    function open(index) {
      current = index;
      render(true);
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }

    function render(isFirst) {
      var data = allImages[current];
      var swap = function () {
        var tmp = new Image();
        tmp.onload = function () {
          imgEl.src = data.src;
          requestAnimationFrame(function () { imgEl.classList.add('show'); });
        };
        tmp.src = data.src;
        countEl.textContent = (current + 1) + ' / ' + allImages.length;
      };
      if (isFirst) {
        swap();
      } else {
        imgEl.classList.remove('show');
        setTimeout(swap, 300);
      }
    }

    function prev() { current = (current - 1 + allImages.length) % allImages.length; render(); }
    function next() { current = (current + 1) % allImages.length; render(); }

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) close(); });

    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    });
  }

  /* ---------- Preview lightbox (home → "Trabajos recientes") ---------- */
  function setupPreviewLightbox() {
    var lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    var imgEl = document.getElementById('lightboxImg');
    var countEl = document.getElementById('lightboxCount');
    var closeBtn = document.getElementById('lightboxClose');
    var prevBtn = document.getElementById('lightboxPrev');
    var nextBtn = document.getElementById('lightboxNext');
    var images = [];
    var current = 0;

    document.querySelectorAll('.pp-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var gallery = (item.dataset.gallery || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!gallery.length) return;
        images = gallery.slice(0, 5);
        open(0);
      });
    });

    function open(index) {
      current = index;
      render(true);
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }

    function render(isFirst) {
      var src = images[current];
      var swap = function () {
        var tmp = new Image();
        tmp.onload = function () {
          imgEl.src = src;
          requestAnimationFrame(function () { imgEl.classList.add('show'); });
        };
        tmp.src = src;
        countEl.textContent = (current + 1) + ' / ' + images.length;
      };
      if (isFirst) {
        swap();
      } else {
        imgEl.classList.remove('show');
        setTimeout(swap, 300);
      }
    }

    function prev() { current = (current - 1 + images.length) % images.length; render(); }
    function next() { current = (current + 1) % images.length; render(); }

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) close(); });

    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    });
  }

  /* ---------- Header ---------- */
  function setupHeader() {
    var header = document.getElementById('siteHeader');
    if (!header) return;
    function onScroll() {
      if (window.scrollY > 60) header.classList.add('solid');
      else header.classList.remove('solid');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function setupNavToggle() {
    var toggle = document.getElementById('navToggle');
    var nav = document.getElementById('mainNav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () {
      document.body.classList.toggle('nav-open');
    });
    nav.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        document.body.classList.remove('nav-open');
      });
    });
  }

  /* Observa solo los anchors cuyo id existe en la página actual
     (así el mismo nav sirve para index.html y portafolio.html) */
  function setupScrollSpy() {
    var links = document.querySelectorAll('.nav-link[href*="#"]');
    var map = {};
    var targets = [];

    links.forEach(function (link) {
      var hash = link.getAttribute('href').split('#')[1];
      if (!hash) return;
      var el = document.getElementById(hash);
      if (!el) return; // enlace a otra página, no aplica scrollspy aquí
      map[hash] = map[hash] || [];
      map[hash].push(link);
      targets.push(el);
    });

    if (!targets.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          document.querySelectorAll('.nav-link').forEach(function (l) { l.classList.remove('active'); });
          var activeLinks = map[entry.target.id] || [];
          activeLinks.forEach(function (l) { l.classList.add('active'); });
        }
      });
    }, { rootMargin: '-45% 0px -45% 0px' });

    targets.forEach(function (el) { observer.observe(el); });
  }

  function observeFadeUps(nodeList) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    nodeList.forEach(function (el) { observer.observe(el); });
  }

  function setupFadeIn() {
    observeFadeUps(document.querySelectorAll('.fade-up'));
  }
})();
