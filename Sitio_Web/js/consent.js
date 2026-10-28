// Aviso de cookies: barra delgada abajo («Configurar» y «Aceptar») y ventana de preferencias con
// dos grupos: Necesarias (siempre activas) y Medición y publicidad (apagada hasta que la persona la active).
// Sin un «Aceptar» guardado, el disparador del <head> (__afterLoad) no descarga ni el Meta Pixel
// (fbevents.js) ni GTM (GA4): los eventos quedan en cola en la página y no salen.
// La elección se guarda en este navegador (localStorage) con la fecha. Cualquier elemento con
// data-cookie-settings abre la ventana de preferencias (por ejemplo, en la Política de privacidad).
(function () {
  'use strict';

  var KEY = 'aa-cookies';
  var DATE_KEY = 'aa-cookies-fecha';
  var INK = '#1F2A44';

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function save(value) {
    try {
      localStorage.setItem(KEY, value);
      localStorage.setItem(DATE_KEY, new Date().toISOString());
    } catch (e) {}
  }

  // Al rechazar después de haber aceptado: borra las cookies de Meta y Google Analytics de este sitio.
  function clearTrackingCookies() {
    var host = location.hostname.replace(/^www\./, '');
    document.cookie.split(';').forEach(function (part) {
      var name = part.split('=')[0].trim();
      if (!/^(_fbp|_fbc|_ga|_ga_.+|_gid)$/.test(name)) return;
      ['', '; domain=' + host, '; domain=.' + host].forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; path=/' + domain;
      });
    });
  }

  var css = '' +
    // Tarjeta flotante abajo, con «Configurar cookies» y «Aceptar» del mismo tamaño
    '.ck-bar{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:2147483000;' +
    'max-width:560px;margin:0 auto;background:#fff;color:' + INK + ';border:1px solid rgba(31,42,68,.14);border-radius:16px;' +
    'box-shadow:0 12px 40px rgba(31,42,68,.18);padding:18px 20px;font:inherit;font-size:.92rem;line-height:1.5}' +
    '.ck-bar[hidden],.ck-modal[hidden]{display:none}' +
    '.ck-bar p{margin:0}' +
    '.ck-bar-actions{display:flex;gap:10px;margin-top:14px}' +
    '.ck-bar .ck-btn{flex:1;min-height:44px;font-size:.92rem}' +
    '@media (max-width:420px){.ck-bar{padding:16px}.ck-bar .ck-btn{padding:8px 10px;font-size:.86rem;white-space:nowrap}}' +
    '.ck-btn{font:inherit;font-weight:600;font-size:.88rem;min-height:40px;padding:8px 22px;border-radius:999px;cursor:pointer;' +
    'border:1.5px solid ' + INK + ';background:' + INK + ';color:#fff}' +
    '.ck-btn.ghost{background:#fff;color:' + INK + '}' +
    '.ck-bar button:focus-visible,.ck-modal button:focus-visible,.ck-modal input:focus-visible+.ck-switch{outline:2px solid ' + INK + ';outline-offset:2px}' +
    // Ventana
    '.ck-modal{position:fixed;inset:0;z-index:2147483001;background:rgba(20,24,36,.45);display:grid;place-items:center;padding:16px;' +
    'font:inherit;color:' + INK + '}' +
    '.ck-panel{position:relative;width:100%;max-width:520px;max-height:calc(100vh - 32px);overflow:auto;background:#fff;' +
    'border-radius:16px;box-shadow:0 20px 60px rgba(20,24,36,.3);padding:26px 24px 22px;font-size:.9rem;line-height:1.5}' +
    '.ck-panel h2{font:inherit;font-size:1.1rem;font-weight:700;margin:0 0 8px;padding-right:32px}' +
    '.ck-panel > p{margin:0 0 16px;color:#4A5468}' +
    '.ck-panel a{color:inherit;text-decoration:underline;text-underline-offset:2px}' +
    '.ck-close{position:absolute;top:14px;right:14px;width:36px;height:36px;border:0;background:none;cursor:pointer;' +
    'font-size:1.5rem;line-height:1;color:' + INK + ';border-radius:8px}' +
    '.ck-group{background:#F3F4F7;border-radius:10px;padding:14px 16px}' +
    '.ck-group + .ck-group{margin-top:10px}' +
    '.ck-head{display:flex;align-items:center;justify-content:space-between;gap:12px}' +
    '.ck-head b{font-weight:700}' +
    '.ck-group p{margin:6px 0 0;font-size:.84rem;color:#4A5468}' +
    '.ck-always{font-size:.8rem;font-weight:600;color:#4A5468}' +
    '.ck-toggle{position:relative;display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:.8rem;font-weight:600}' +
    '.ck-toggle input{position:absolute;opacity:0;width:1px;height:1px}' +
    '.ck-switch{width:42px;height:24px;border-radius:999px;background:#B9BFCC;position:relative;transition:background .2s}' +
    '.ck-switch::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s}' +
    '.ck-toggle input:checked + .ck-switch{background:' + INK + '}' +
    '.ck-toggle input:checked + .ck-switch::after{transform:translateX(18px)}' +
    '.ck-panel-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}' +
    '@media (max-width:480px){.ck-panel-actions{flex-direction:column-reverse}.ck-panel-actions .ck-btn{width:100%}}' +
    '@media (prefers-reduced-motion:reduce){.ck-switch,.ck-switch::after{transition:none}}';

  var bar, modal, toggle, lastFocus;

  function injectStyle() {
    if (document.getElementById('ck-style')) return;
    var style = document.createElement('style');
    style.id = 'ck-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function choose(choice) {
    var before = read();
    save(choice);
    if (bar) bar.hidden = true;
    closeModal();
    if (choice === 'acepta') {
      if (typeof window.__acceptCookies === 'function') window.__acceptCookies();
    } else if (before === 'acepta') {
      // El Pixel o GTM ya pudieron cargarse en esta página: se borran sus cookies y se recarga sin ellos.
      clearTrackingCookies();
      location.reload();
    }
  }

  function buildBar() {
    if (bar) return bar;
    injectStyle();
    bar = document.createElement('div');
    bar.className = 'ck-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Aviso de cookies');
    bar.hidden = true;
    bar.innerHTML =
      '<p>Uso cookies para medir visitas y anuncios. Solo se activan si aceptas.</p>' +
      '<div class="ck-bar-actions">' +
      '<button type="button" class="ck-btn ghost" data-ck="config">Configurar cookies</button>' +
      '<button type="button" class="ck-btn" data-ck="acepta">Aceptar</button>' +
      '</div>';
    bar.addEventListener('click', function (event) {
      var button = event.target.closest('[data-ck]');
      if (!button) return;
      if (button.getAttribute('data-ck') === 'config') openModal();
      else choose('acepta');
    });
    document.body.appendChild(bar);
    return bar;
  }

  function buildModal() {
    if (modal) return modal;
    injectStyle();
    modal = document.createElement('div');
    modal.className = 'ck-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="ck-panel" role="dialog" aria-modal="true" aria-labelledby="ck-title">' +
      '<button type="button" class="ck-close" data-ck="cerrar" aria-label="Cerrar">&times;</button>' +
      '<h2 id="ck-title">Tus preferencias de cookies</h2>' +
      '<p>Elige qué cookies aceptas. Puedes cambiarlo cuando quieras. Más detalles en la ' +
      '<a href="/privacidad#cookies">Política de privacidad</a>.</p>' +
      '<div class="ck-group"><div class="ck-head"><b>Necesarias</b><span class="ck-always">Siempre activas</span></div>' +
      '<p>Hacen que la web funcione y recuerdan esta elección.</p></div>' +
      '<div class="ck-group"><div class="ck-head"><b>Medición y publicidad</b>' +
      '<label class="ck-toggle"><input type="checkbox" id="ck-medicion"><span class="ck-switch" aria-hidden="true"></span>' +
      '<span class="ck-state">Desactivadas</span></label></div>' +
      '<p>Meta Pixel y Google Analytics: cuentan las visitas y miden mis anuncios en Facebook e Instagram.</p></div>' +
      '<div class="ck-panel-actions">' +
      '<button type="button" class="ck-btn ghost" data-ck="guardar">Guardar</button>' +
      '<button type="button" class="ck-btn" data-ck="acepta">Aceptar todas</button>' +
      '</div></div>';
    toggle = modal.querySelector('#ck-medicion');
    var state = modal.querySelector('.ck-state');
    toggle.addEventListener('change', function () {
      state.textContent = toggle.checked ? 'Activadas' : 'Desactivadas';
    });
    modal.addEventListener('click', function (event) {
      if (event.target === modal) return closeModal();
      var button = event.target.closest('[data-ck]');
      if (!button) return;
      var action = button.getAttribute('data-ck');
      if (action === 'cerrar') closeModal();
      else if (action === 'acepta') choose('acepta');
      else if (action === 'guardar') choose(toggle.checked ? 'acepta' : 'rechaza');
    });
    modal.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeModal();
    });
    document.body.appendChild(modal);
    return modal;
  }

  function openModal() {
    buildModal();
    toggle.checked = read() === 'acepta';
    toggle.dispatchEvent(new Event('change'));
    lastFocus = document.activeElement;
    modal.hidden = false;
    modal.querySelector('.ck-close').focus();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  function init() {
    var choice = read();
    if (choice !== 'acepta' && choice !== 'rechaza') buildBar().hidden = false;
    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-cookie-settings]');
      if (!trigger) return;
      event.preventDefault();
      openModal();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
