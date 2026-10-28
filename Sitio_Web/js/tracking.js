(function () {
  'use strict';

  if (window.__arianTrackingInitialized) return;
  window.__arianTrackingInitialized = true;

  var PIXEL_ID = '1595821982250654';

  // El Pixel solo envía desde el dominio público. En localhost, 127.0.0.1 y las vistas previas
  // (*.pages.dev, netlify.app) no se carga: cada evento se escribe en la consola del navegador,
  // para poder revisar los botones sin ensuciar los datos ni los públicos de Meta.
  var PRODUCTION_HOSTS = ['arianalpiste.com', 'www.arianalpiste.com'];
  var isProduction = PRODUCTION_HOSTS.indexOf(window.location.hostname) !== -1;

  function eventId(prefix) {
    var id = window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : Date.now() + '-' + Math.random().toString(16).slice(2);
    return prefix + '-' + id;
  }

  function loadPixel() {
    if (window.fbq) return;
    var fbq = window.fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    // La cola (fbq) existe desde ya y guarda los eventos; el archivo de Meta se descarga después
    // (al terminar la carga, máx. 0,8 s, o con la primera interacción; ver el script del <head>) para no frenar la portada.
    afterLoad(function () {
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    });
  }

  // Carga del Pixel: usa el disparador propio del Pixel (__afterLoad); si la página no lo tiene, el general
  // (__afterIdle); y en páginas sin carga diferida (portafolio), al instante.
  function afterLoad(fn) {
    if (typeof window.__afterLoad === 'function') window.__afterLoad(fn);
    else if (typeof window.__afterIdle === 'function') window.__afterIdle(fn);
    else fn();
  }

  // ¿El archivo de Meta ya llegó y procesó la cola? (fbevents.js define callMethod al cargar)
  function pixelReady() {
    return !isProduction || (typeof window.fbq === 'function' && typeof window.fbq.callMethod === 'function');
  }

  function send(method, name, parameters, id) {
    if (!isProduction) {
      if (window.console && console.info) {
        console.info('[tracking] ' + name + ' (no enviado a Meta desde ' + window.location.hostname + ')', parameters || {});
      }
      return;
    }
    if (typeof window.fbq !== 'function') return;
    window.fbq(method, name, parameters || {}, id ? { eventID: id } : undefined);
  }

  // Línea de servicio de la página (eventos, sesiones o bodas), para separar en Meta de dónde viene cada evento.
  // Páginas de servicio por su ruta; el blog por la paleta de su categoría; /reservar queda «general»
  // salvo en los botones de paquete, que mandan la suya (ver el clic más abajo).
  function serviceLine() {
    var path = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    if (path === '/bodas') return 'bodas';
    if (path === '/sesiones-familiares') return 'sesiones';
    if (path === '/' || path === '/index') return 'eventos';
    if (path === '/contrato' || path === '/gracias/contrato') return 'eventos';  // por ahora el contrato es solo de eventos
    var themed = document.querySelector('[data-theme]');
    var theme = themed ? themed.getAttribute('data-theme') : '';
    if (path.indexOf('/blog') === 0) {
      if (theme === 'champana-aire') return 'bodas';
      if (theme === 'bosque-aire') return 'sesiones';
      if (path === '/blog') return 'general';
      return 'eventos';
    }
    return 'general';
  }

  function withService(parameters) {
    var p = parameters || {};
    if (!p.service_line) p.service_line = serviceLine();
    return p;
  }

  function trackStandard(name, parameters, id) { send('track', name, withService(parameters), id); }

  function trackCustom(name, parameters, id) { send('trackCustom', name, withService(parameters), id); }

  if (isProduction) {
    loadPixel();
    // Sin esto, Meta inventa eventos por su cuenta (por ejemplo SubscribedButtonClick en cada clic
    // a un botón). Debe ir antes de init. Así el Pixel solo envía los eventos definidos en este archivo.
    window.fbq('set', 'autoConfig', false, PIXEL_ID);
    window.fbq('init', PIXEL_ID);
  }
  trackStandard('PageView', {}, eventId('pageview'));

  var body = document.body;

  // «Vio los precios»: la persona llegó a las tarjetas de paquetes de la landing o de Sesiones familiares.
  // Se recuerda durante la visita (sessionStorage) para que también cuente si luego escribe desde otra página.
  var PRICES_SEEN_KEY = 'arian_saw_prices';
  function markPricesSeen() {
    try { window.sessionStorage.setItem(PRICES_SEEN_KEY, '1'); } catch (e) {}
  }
  function pricesSeen() {
    try { return window.sessionStorage.getItem(PRICES_SEEN_KEY) === '1'; } catch (e) { return false; }
  }

  // Origen de la visita, solo para el correo del formulario (no se envía a Meta ni a Analytics): UTM, si llegó con
  // fbclid, sitio de referencia y página de entrada. Se guarda al entrar; solo se reemplaza si otra entrada trae
  // UTM o fbclid nuevos (por ejemplo, vuelve a tocar un anuncio en la misma pestaña).
  var ORIGIN_KEY = 'arian_origin';
  function captureOrigin() {
    try {
      var query = new URLSearchParams(window.location.search);
      var origin = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (key) {
        if (query.get(key)) origin[key] = query.get(key).slice(0, 100);
      });
      if (query.has('fbclid')) origin.fbclid = 'si';
      var hasParams = Object.keys(origin).length > 0;
      if (!hasParams && window.sessionStorage.getItem(ORIGIN_KEY)) return;
      if (document.referrer) {
        var host = new URL(document.referrer).hostname;
        if (host && host.indexOf('arianalpiste.com') === -1) origin.referrer = host;
      }
      origin.landing = window.location.pathname;
      window.sessionStorage.setItem(ORIGIN_KEY, JSON.stringify(origin));
    } catch (e) {}
  }
  captureOrigin();
  window.__arianOrigin = function () {
    var origin = {};
    try { origin = JSON.parse(window.sessionStorage.getItem(ORIGIN_KEY) || '{}') || {}; } catch (e) {}
    origin.vio_precios = pricesSeen() ? 'si' : 'no';
    return origin;
  };

  if (body.dataset.contentType === 'portfolio') {
    trackStandard('ViewContent', {
      content_name: body.dataset.contentName || 'Portafolio',
      content_category: 'portfolio',
      content_type: 'gallery'
    }, eventId('portfolio-view'));
  }
  // Landing de servicio: ViewContent se envía una sola vez, cuando la persona llega a ver los
  // paquetes y precios (no al abrir la página). Se observa la primera tarjeta porque en celular
  // la sección entera es más alta que la pantalla.
  if (body.dataset.contentType === 'service') {
    var offer = document.querySelector('[data-track-offer]');
    var sendOfferView = function () {
      markPricesSeen();
      trackStandard('ViewContent', {
        content_name: body.dataset.contentName || 'Servicio',
        content_category: 'service',
        content_type: 'pricing'
      }, eventId('service-view'));
    };
    if (offer && 'IntersectionObserver' in window) {
      var offerObserver = new IntersectionObserver(function (entries) {
        if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
        offerObserver.disconnect();
        sendOfferView();
      }, { threshold: 0.4 });
      offerObserver.observe(offer);
    } else if (offer) sendOfferView();
  }
  if (body.dataset.contentType === 'article') {
    trackStandard('ViewContent', {
      content_name: body.dataset.contentName,
      content_category: 'blog',
      content_type: 'article',
      content_ids: [body.dataset.contentId]
    }, eventId('article-view'));
  }
  if (body.dataset.contentType === 'blog-index') {
    trackCustom('BlogView', {
      content_name: 'Blog',
      content_category: 'blog'
    }, eventId('blog-view'));
  }

  // Contrato firmado (/gracias/contrato): Purchase del navegador con el mismo ID que manda el servidor.
  document.addEventListener('meta:purchase', function (event) {
    if (!event.detail || !event.detail.eventId) return;
    var p = { content_name: 'Contrato firmado', currency: 'PEN' };
    if (event.detail.value) p.value = Number(event.detail.value);
    trackStandard('Purchase', p, event.detail.eventId);
  });

  document.addEventListener('meta:lead', function (event) {
    if (!event.detail || !event.detail.eventId) return;
    trackStandard('Lead', { content_name: event.detail.contentName || 'Formulario web' }, event.detail.eventId);
  });

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[data-track]');
    if (!link) return;
    var actions = link.dataset.track.split(/\s+/).filter(Boolean);
    var parameters = {
      button_location: link.dataset.trackLocation || 'unknown',
      destination: link.dataset.destination || link.href,
      page_path: window.location.pathname
    };
    if (link.dataset.package) parameters.package_name = link.dataset.package;
    // En /reservar el paquete elegido dice si es de eventos o de sesiones.
    var panel = link.closest('[data-panel]');
    if (panel && (panel.dataset.panel === 'eventos' || panel.dataset.panel === 'sesiones')) parameters.service_line = panel.dataset.panel;
    if (link.dataset.value) {
      parameters.value = Number(link.dataset.value);
      parameters.currency = link.dataset.currency || 'PEN';
    }
    if (link.dataset.sourceArticle) parameters.source_article = link.dataset.sourceArticle;
    // Solo se informa donde tiene sentido: en las páginas de servicio (landing y sesiones), o en cualquier
    // página si ya vio los precios antes en esta visita. Así «no» significa «escribió sin haber visto los precios».
    if (body.dataset.contentType === 'service' || pricesSeen()) {
      parameters.saw_prices = pricesSeen() ? 'yes' : 'no';
    }
    if (body.dataset.contentType === 'service') {
      parameters.content_name = body.dataset.contentName || 'Servicio';
      parameters.content_category = 'service';
    }

    actions.forEach(function (action) {
      // Clic hacia Cal.com: es intención, no una reserva. Va como evento propio para no confundirlo
      // con una cita agendada; la reserva confirmada llega como Lead y Schedule desde el servidor (webhook).
      if (action === 'meeting-intent') trackCustom('MeetingIntent', parameters, eventId('meeting-intent'));
      if (action === 'contact') trackStandard('Contact', parameters, eventId('contact'));
      if (action === 'initiate-checkout') trackStandard('InitiateCheckout', parameters, eventId('initiate-checkout'));
      if (action === 'high-intent') trackCustom('HighIntentLead', parameters, eventId('high-intent'));
      if (action === 'portfolio-click') trackCustom('PortfolioClick', parameters, eventId('portfolio-click'));
      if (action === 'blog-to-landing') trackCustom('BlogToLanding', parameters, eventId('blog-to-landing'));
    });

    // Si el clic cambia de página en la misma pestaña (por ejemplo «Reservar mi fecha») y el archivo de Meta
    // todavía no llegó, se espera un momento (máximo 1,2 s) para que el evento salga antes de navegar.
    // Sin consentimiento de cookies el Pixel nunca llega (js/consent.js): no se espera.
    var sameTab = !link.target || link.target === '_self';
    var href = link.getAttribute('href') || '';
    var cookiesOk = typeof window.__cookiesOk !== 'function' || window.__cookiesOk();
    if (sameTab && cookiesOk && !pixelReady() && href.charAt(0) !== '#' && !link.hasAttribute('data-cal-link') &&
        !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      if (typeof window.__tagsNow === 'function') window.__tagsNow();
      var started = Date.now();
      (function wait() {
        if (pixelReady()) return setTimeout(function () { window.location.href = link.href; }, 300);
        if (Date.now() - started > 1200) return (window.location.href = link.href);
        setTimeout(wait, 50);
      })();
    }
  });
})();
