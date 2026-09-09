(function () {
  'use strict';

  if (window.__arianTrackingInitialized) return;
  window.__arianTrackingInitialized = true;

  var PIXEL_ID = '1595821982250654';

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

  function trackStandard(name, parameters, id) {
    if (typeof window.fbq !== 'function') return;
    window.fbq('track', name, parameters || {}, id ? { eventID: id } : undefined);
  }

  function trackCustom(name, parameters, id) {
    if (typeof window.fbq !== 'function') return;
    window.fbq('trackCustom', name, parameters || {}, id ? { eventID: id } : undefined);
  }

  loadPixel();
  window.fbq('init', PIXEL_ID);
  trackStandard('PageView', {}, eventId('pageview'));

  var body = document.body;
  if (body.dataset.contentType === 'portfolio') {
    trackStandard('ViewContent', {
      content_name: body.dataset.contentName || 'Portafolio',
      content_category: 'portfolio',
      content_type: 'gallery'
    }, eventId('portfolio-view'));
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

    actions.forEach(function (action) {
      if (action === 'meeting-intent') trackCustom('MeetingIntent', parameters, eventId('meeting-intent'));
      if (action === 'contact') trackStandard('Contact', parameters, eventId('contact'));
      if (action === 'high-intent') trackCustom('HighIntentLead', parameters, eventId('high-intent'));
      if (action === 'portfolio-click') trackCustom('PortfolioClick', parameters, eventId('portfolio-click'));
      if (action === 'blog-to-landing') trackCustom('BlogToLanding', parameters, eventId('blog-to-landing'));
    });
  });
})();
