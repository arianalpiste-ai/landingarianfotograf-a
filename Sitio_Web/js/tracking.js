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
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    var firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(script, firstScript);
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

  function trackStandard(name, parameters, id) { send('track', name, parameters, id); }

  function trackCustom(name, parameters, id) { send('trackCustom', name, parameters, id); }

  if (isProduction) {
    loadPixel();
    // Sin esto, Meta inventa eventos por su cuenta (por ejemplo SubscribedButtonClick en cada clic
    // a un botón). Debe ir antes de init. Así el Pixel solo envía los eventos definidos en este archivo.
    window.fbq('set', 'autoConfig', false, PIXEL_ID);
    window.fbq('init', PIXEL_ID);
  }
  trackStandard('PageView', {}, eventId('pageview'));

  var body = document.body;
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
    if (link.dataset.value) {
      parameters.value = Number(link.dataset.value);
      parameters.currency = link.dataset.currency || 'PEN';
    }
    if (link.dataset.sourceArticle) parameters.source_article = link.dataset.sourceArticle;
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
  });
})();
