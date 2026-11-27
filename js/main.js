/* ==========================================================================
   Porsche 919 Hybrid Evo · Preloader, Dual-Polarity Header, Menu,
   Lightbox & Smart Viewport Video Controller
   ========================================================================== */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. 1px Weissach Crimson Spine Preloader */
  var preloader = document.getElementById('preloader');
  if (preloader) {
    if (prefersReduced) {
      preloader.classList.add('is-done');
    } else {
      requestAnimationFrame(function () {
        preloader.classList.add('is-sweeping');
      });
      var closePre = function () { preloader.classList.add('is-done'); };
      setTimeout(closePre, 460);
      preloader.addEventListener('click', closePre);
    }
  }

  /* 2. Dual-Polarity Floating Header */
  var header = document.getElementById('siteHeader');
  var lightSections = Array.prototype.slice.call(document.querySelectorAll('[data-theme="light"]'));
  function syncHeader() {
    if (!header) return;
    var sy = window.scrollY || window.pageYOffset;
    var scrolled = sy > 40;
    header.classList.toggle('is-scrolled', scrolled);
    if (!scrolled) {
      header.classList.remove('is-light-bar');
      return;
    }
    var probeY = 36;
    var onLight = lightSections.some(function (sec) {
      var r = sec.getBoundingClientRect();
      return r.top <= probeY && r.bottom > probeY;
    });
    header.classList.toggle('is-light-bar', onLight);
  }
  window.addEventListener('scroll', syncHeader, { passive: true });
  syncHeader();

  /* 3. Scroll-Illuminated Manifesto Lines */
  var lines = Array.prototype.slice.call(document.querySelectorAll('.manifesto__line'));
  function syncManifesto() {
    if (!lines.length) return;
    var triggerY = window.innerHeight * 0.80;
    lines.forEach(function (line) {
      var r = line.getBoundingClientRect();
      line.classList.toggle('is-lit', r.top < triggerY);
    });
  }
  window.addEventListener('scroll', syncManifesto, { passive: true });
  syncManifesto();

  /* 4. Fullscreen Index Overlay */
  var menuBtn = document.getElementById('menuBtn');
  var overlay = document.getElementById('indexOverlay');
  var closeBtn = document.getElementById('closeMenuBtn');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.index-link'));

  function setMenu(open) {
    if (!overlay || !menuBtn) return;
    overlay.classList.toggle('is-open', open);
    if (open) {
      overlay.removeAttribute('hidden');
      if (closeBtn) closeBtn.focus();
    } else {
      overlay.setAttribute('hidden', '');
    }
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      setMenu(!(overlay && overlay.classList.contains('is-open')));
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', function () { setMenu(false); if (menuBtn) menuBtn.focus(); });
  navLinks.forEach(function (l) { l.addEventListener('click', function () { setMenu(false); }); });

  /* 5. Lightbox Modal */
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightboxImg');
  var lbCap = document.getElementById('lightboxCap');
  var lbClose = document.getElementById('lightboxClose');
  var lastTrigger = null;

  function openLightbox(src, alt, cap, trigger) {
    if (!lightbox || !lbImg) return;
    lastTrigger = trigger || null;
    lbImg.src = src;
    lbImg.alt = alt || '';
    if (lbCap) lbCap.textContent = cap || '';
    lightbox.removeAttribute('hidden');
    requestAnimationFrame(function () { lightbox.classList.add('is-open'); });
    if (lbClose) lbClose.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('hidden', '');
    if (lastTrigger && lastTrigger.focus) {
      lastTrigger.focus();
      lastTrigger = null;
    }
  }

  document.addEventListener('click', function (ev) {
    var trigger = ev.target.closest ? ev.target.closest('[data-lightbox]') : null;
    if (trigger) {
      var img = trigger.querySelector('img');
      var src = trigger.getAttribute('data-lightbox-src') || (img && img.getAttribute('src'));
      var alt = trigger.getAttribute('data-lightbox-alt') || (img && img.getAttribute('alt')) || '';
      var cap = trigger.getAttribute('data-lightbox-cap') || '';
      if (src) openLightbox(src, alt, cap, trigger);
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' || ev.key === ' ') {
      var activeEl = document.activeElement;
      if (activeEl && activeEl.hasAttribute('data-lightbox') && activeEl.tagName !== 'BUTTON') {
        ev.preventDefault();
        activeEl.click();
      }
    }
  });

  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', function (ev) {
      if (ev.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (overlay && overlay.classList.contains('is-open')) setMenu(false);
      if (lightbox && lightbox.classList.contains('is-open')) closeLightbox();
    }
  });

  /* 6. Smooth Reveals with Scroll Fallback */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal-fade, .reveal-curtain'));
  function revealVisible() {
    var vh = window.innerHeight || 900;
    reveals.forEach(function (el) {
      if (el.classList.contains('is-in')) return;
      if (el.getBoundingClientRect().top <= vh * 1.04) el.classList.add('is-in');
    });
  }
  if (!prefersReduced && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -4% 0px', threshold: 0.02 });
    reveals.forEach(function (el) { io.observe(el); });
    window.addEventListener('scroll', revealVisible, { passive: true });
    revealVisible();
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* 7. Smart Viewport + Active-Layer Video Playback (deferred 650ms past load) */
  function isLayerVideoActive(v) {
    var layer = v.closest('.cinema-stage__layer');
    return !layer || layer.classList.contains('is-active');
  }

  function playOrPauseVideo(v, inView) {
    if (inView && isLayerVideoActive(v)) {
      if (v.getAttribute('preload') === 'none') v.setAttribute('preload', 'metadata');
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      v.pause();
    }
  }

  window.EvoSyncStageVideos = function (container) {
    if (!container) return;
    var vids = Array.prototype.slice.call(container.querySelectorAll('video'));
    vids.forEach(function (v) {
      var rect = v.getBoundingClientRect();
      var vh = window.innerHeight || 900;
      var inView = rect.bottom > 0 && rect.top < vh;
      playOrPauseVideo(v, inView);
    });
  };

  function initVideos() {
    var videos = Array.prototype.slice.call(document.querySelectorAll('video'));
    if ('IntersectionObserver' in window && videos.length) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          playOrPauseVideo(entry.target, entry.isIntersecting);
        });
      }, { threshold: 0.08 });
      videos.forEach(function (v) { vio.observe(v); });
    }
  }
  if (document.readyState === 'complete') {
    setTimeout(initVideos, 650);
  } else {
    window.addEventListener('load', function () {
      setTimeout(initVideos, 650);
    }, { once: true });
  }

  /* 8. Clamped Scroll Parallax (--px-y in [-14px, +14px]) */
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (!prefersReduced && parallaxEls.length) {
    var pxPending = false;
    var updateParallax = function () {
      pxPending = false;
      var vh = window.innerHeight || 900;
      parallaxEls.forEach(function (el) {
        var host = el.closest('section, .cinema-stage, .hero') || el.parentElement;
        if (!host) return;
        var rect = host.getBoundingClientRect();
        if (rect.bottom < -60 || rect.top > vh + 60) return;
        var progress = (rect.top + rect.height * 0.5 - vh * 0.5) / (vh + rect.height);
        var shift = Math.max(-14, Math.min(14, progress * 24));
        el.style.setProperty('--px-y', shift.toFixed(1) + 'px');
      });
    };
    window.addEventListener('scroll', function () {
      if (!pxPending) {
        pxPending = true;
        requestAnimationFrame(updateParallax);
      }
    }, { passive: true });
    updateParallax();
  }

  /* 9. Crisp One-Shot Numeric Roll-Up (420ms, HTML holds final value) */
  var countEls = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  if (!prefersReduced && countEls.length && 'IntersectionObserver' in window) {
    var animateCount = function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      if (isNaN(target)) return;
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var prefix = el.getAttribute('data-prefix') || '';
      var suffixHtml = el.getAttribute('data-suffix') || '';
      var useComma = el.getAttribute('data-comma') === 'true';
      var start = performance.now();
      var dur = 420;
      var frame = function (now) {
        var t = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - t, 3);
        var val = target * eased;
        var str = decimals > 0 ? val.toFixed(decimals) : String(Math.round(val));
        if (useComma && decimals === 0) str = Number(str).toLocaleString('en-US');
        el.innerHTML = prefix + str + suffixHtml;
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.35 });
    countEls.forEach(function (el) { cio.observe(el); });
  }
})();
