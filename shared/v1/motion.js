/* ==========================================================================
   HYPERCAR FLAGSHIP · Unified Motion & Tactile Interaction Layer (shared/v1)
   - Brand accent auto-resolved from each site's tokens.css / style.css
   - Zero transform collisions with [data-parallax] or .reveal-curtain
   - Strict ZH/EN isolation driven by document.documentElement.lang
   - Full prefers-reduced-motion compliance & IntersectionObserver visibility fallback
   ========================================================================== */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var body = document.body;
  if (!docEl || !body) return;

  var isEn = (docEl.getAttribute('lang') || '').toLowerCase().indexOf('en') === 0;
  var mqReduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var prefersReduced = !!(mqReduced && mqReduced.matches);
  var finePointer = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);

  var T = isEn
    ? {
        railAria: 'Chapter navigation',
        topAria: 'Back to top',
        prevAria: 'Previous image',
        nextAria: 'Next image',
        closeTxt: 'CLOSE ESC',
        zoomIn: '2× ZOOM',
        zoomOut: '1× FIT',
        copied: 'COPIED · ',
        inspect: 'Inspect detail'
      }
    : {
        railAria: '章节快速导航',
        topAria: '返回顶部',
        prevAria: '上一张',
        nextAria: '下一张',
        closeTxt: '关闭 ESC',
        zoomIn: '2× 放大',
        zoomOut: '1× 还原',
        copied: '已复制 · ',
        inspect: '放大查看'
      };

  /* ------------------------------------------------------------------------
     1. Resolve Brand Accent Color & RGB from Site CSS Custom Properties
     ------------------------------------------------------------------------ */
  function resolveBrandAccent() {
    var candidates = [
      '--accent', '--papaya', '--porsche-red', '--french-blue', '--aerolithe',
      '--eb-blue', '--cognac', '--sapphire', '--divo-blue', '--rosso-hot',
      '--rosso', '--tang', '--bronze', '--petronas', '--gold',
      '--amr-titanium', '--champagne', '--red', '--cyan-dark', '--cyan'
    ];
    var cs = getComputedStyle(docEl);
    var raw = '';
    for (var i = 0; i < candidates.length; i++) {
      var val = cs.getPropertyValue(candidates[i]);
      if (val && val.trim()) {
        raw = val.trim();
        break;
      }
    }
    if (!raw) raw = '#C8A55B';

    var probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;color:' + raw;
    body.appendChild(probe);
    var rgbStr = getComputedStyle(probe).color;
    probe.remove();

    var m = rgbStr && rgbStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) {
      docEl.style.setProperty('--hc-accent', 'rgb(' + m[1] + ', ' + m[2] + ', ' + m[3] + ')');
      docEl.style.setProperty('--hc-accent-rgb', m[1] + ', ' + m[2] + ', ' + m[3]);
    } else {
      docEl.style.setProperty('--hc-accent', raw);
    }
  }
  resolveBrandAccent();

  /* ------------------------------------------------------------------------
     2. Light-Section Polarity Helper
     ------------------------------------------------------------------------ */
  function isSectionLight(sec) {
    if (!sec) return false;
    var theme = (sec.getAttribute('data-theme') || sec.getAttribute('data-polarity') || '').toLowerCase();
    if (theme === 'light') return true;
    if (theme === 'dark') return false;
    if (sec.classList.contains('studio-stage--light')) return true;
    var bg = getComputedStyle(sec).backgroundColor;
    var m = bg && bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/i);
    if (!m) return false;
    var a = m[4] !== undefined ? parseFloat(m[4]) : 1;
    if (a < 0.2) return false;
    var lum = (0.299 * Number(m[1]) + 0.587 * Number(m[2]) + 0.114 * Number(m[3])) / 255;
    return lum > 0.62;
  }

  /* ------------------------------------------------------------------------
     3. Top 2px Brand Scroll Progress Hairline & Scroll Sync
     ------------------------------------------------------------------------ */
  var hasNativeProgress = !!document.getElementById('navBar');
  var progressBarWrap = null;
  if (!hasNativeProgress) {
    progressBarWrap = document.createElement('div');
    progressBarWrap.className = 'hc-progress';
    progressBarWrap.setAttribute('aria-hidden', 'true');
    progressBarWrap.innerHTML = '<span class="hc-progress__bar"></span>';
    body.appendChild(progressBarWrap);
  }

  /* ------------------------------------------------------------------------
     4. Hero Choreographed Entrance & Subtle Depth (Never hides h1)
     ------------------------------------------------------------------------ */
  var heroSec = document.getElementById('hero') || document.querySelector('section.hero');
  if (heroSec && !prefersReduced) {
    var heroChildren = heroSec.querySelectorAll(
      '.hero__eyebrow, .hero__kicker, .hero__sub, .hero__desc, .hero__meta, .hero__strip, .hero__cue'
    );
    for (var hi = 0; hi < heroChildren.length; hi++) {
      var hEl = heroChildren[hi];
      if (!hEl.style.getPropertyValue('--hc-delay')) {
        hEl.style.setProperty('--hc-delay', (90 + hi * 75) + 'ms');
      }
      hEl.classList.add('hc-hero-item');
    }
    var heroImg = heroSec.querySelector('img.hero__media, img.hero__bg');
    if (heroImg && !heroImg.hasAttribute('data-parallax') && !heroImg.closest('[data-parallax]')) {
      heroImg.classList.add('hc-hero-drift');
    }
  }

  /* ------------------------------------------------------------------------
     5. Section Heading Brand Hairline & Rhythmic Metric Grid Stagger
     ------------------------------------------------------------------------ */
  var observedRevealTargets = [];

  function registerReveal(el, delayMs) {
    if (!el) return;
    if (delayMs) el.style.setProperty('--hc-delay', delayMs + 'ms');
    observedRevealTargets.push(el);
  }

  var headings = Array.prototype.slice.call(
    document.querySelectorAll('main .sec-heading, main section > .wrap > h2, main section > div > .wrap > h2')
  );
  headings.forEach(function (h) {
    if (h.closest('#hero, #lightbox, #indexOverlay, #menuOverlay')) return;
    h.classList.add('hc-heading-reveal');
    if (getComputedStyle(h).textAlign === 'center') {
      h.classList.add('hc-heading-center');
    }
    registerReveal(h, 0);
  });

  var staggerGroupSelectors = [
    '.manifesto__triad', '.triad-grid', '.perf-grid', '.chassis-grid',
    '.craft-stats', '.pb-stats', '.lineage-cols', '.evo-cols',
    '.detail-gallery', '.timing-ledger', '.modes-row', '.hero__strip'
  ];
  var seenStaggerNodes = [];
  staggerGroupSelectors.forEach(function (sel) {
    var groups = document.querySelectorAll(sel);
    for (var gi = 0; gi < groups.length; gi++) {
      var group = groups[gi];
      if (group.closest('#lightbox, #indexOverlay, #menuOverlay, #hero')) continue;
      var kids = group.children;
      for (var ki = 0; ki < kids.length; ki++) {
        var child = kids[ki];
        if (seenStaggerNodes.indexOf(child) !== -1) continue;
        if (child.hasAttribute('data-parallax') || child.classList.contains('reveal-curtain')) continue;
        if (child.classList.contains('reveal-fade') || child.classList.contains('reveal')) continue;
        seenStaggerNodes.push(child);
        child.classList.add('hc-stagger-item');
        registerReveal(child, Math.min(ki, 6) * 65);
      }
    }
  });

  /* ------------------------------------------------------------------------
     6. Editorial Media Aperture Reveal, Lens Hover & Inspect Affordance
     ------------------------------------------------------------------------ */
  var mediaFrameSelectors = [
    'main figure img',
    'main .edge-diptych img',
    'main .diptych img',
    'main .split-media img',
    'main .bento img',
    'main .gallery-card img',
    'main .atelier-card img',
    'main .story-media img',
    'main .design-plate__frame img',
    'main .detail-card__media img',
    'main .spider-frame__media img',
    'main .asym-gallery img',
    'main .cosworth-centerpiece img',
    'main .cockpit-pane__media img',
    'main .pt-cutaway-plate img'
  ].join(',');

  function isInteractiveLabSection(el) {
    var sec = el.closest('section');
    if (!sec) return false;
    var id = (sec.id || '').toLowerCase();
    if (/lab|horology|telemetry|hykers|powerunit|speedkey|dynamics|lightspeed|windtunnel|windlab|turntable/.test(id)) {
      if (sec.querySelector('canvas, input[type="range"]')) return true;
    }
    return false;
  }

  var editorialImgs = Array.prototype.slice.call(document.querySelectorAll(mediaFrameSelectors));
  var processedFrameHosts = [];

  editorialImgs.forEach(function (img) {
    if (!img.getAttribute('src')) return;
    if (img.closest('#hero, .hero, .cinema-stage, .studio-stage, .imax-track, #lightbox, .hc-lightbox, #indexOverlay, .specs-anchor')) {
      return;
    }
    if (img.hasAttribute('data-parallax') || img.closest('[data-parallax], .reveal-curtain, .aero-stage, .aero-canvas-box, .workbench, canvas')) {
      return;
    }
    if (isInteractiveLabSection(img) && img.closest('.aero-stage, .lab-stage, .workbench-stage')) {
      return;
    }
    var host = img.parentElement;
    if (!host || processedFrameHosts.indexOf(host) !== -1) return;
    // Skip if host also holds multiple images or text-heavy wrapper directly around non-card content
    if (host.querySelectorAll('img').length > 1) return;
    processedFrameHosts.push(host);

    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
    }
    host.classList.add('hc-media-frame');
    if (!prefersReduced) {
      host.classList.add('hc-aperture');
      registerReveal(host, 0);
    } else {
      host.classList.add('is-hc-in');
    }
  });

  /* ------------------------------------------------------------------------
     7. Fine-Pointer Specular Sheen on Architectural Columns & Cards
     ------------------------------------------------------------------------ */
  if (finePointer && !prefersReduced) {
    var sheenEls = document.querySelectorAll(
      '.lineage-col, .evo-col, .triad-item, .timing-col, .mode-btn, .mode-row-btn, .ledger-item, .spec-table__row, .ledger-row, .spec-row'
    );
    for (var si = 0; si < sheenEls.length; si++) {
      (function (el) {
        if (el.closest('#lightbox, #indexOverlay')) return;
        el.classList.add('hc-sheen');
        el.addEventListener('mousemove', function (ev) {
          var r = el.getBoundingClientRect();
          if (!r.width || !r.height) return;
          el.style.setProperty('--hc-mx', (((ev.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
          el.style.setProperty('--hc-my', (((ev.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
        }, { passive: true });
      })(sheenEls[si]);
    }
  }

  /* ------------------------------------------------------------------------
     8. Smooth Stage & Spec Tab Swap Micro-Fade
     ------------------------------------------------------------------------ */
  function pulseSwap(el) {
    if (!el || prefersReduced) return;
    el.classList.remove('hc-swap-in');
    void el.offsetWidth;
    el.classList.add('hc-swap-in');
  }

  document.addEventListener('click', function (ev) {
    var tab = ev.target.closest
      ? ev.target.closest('.stage-tab, .tab-btn, .arch-tab, [data-bespoke-tab], [data-atelier-tab], .sketch-tab-btn')
      : null;
    if (tab) {
      var scope = tab.closest('section, [data-stage]') || document;
      var targets = scope.querySelectorAll('[data-stage-title], [data-stage-copy], [data-stage-meta], #archTitle, #archDesc, #sketchTitle, #sketchDesc, [data-bespoke-panel]:not([hidden]), [data-atelier-panel]:not([hidden])');
      setTimeout(function () {
        for (var ti = 0; ti < targets.length; ti++) {
          if (!targets[ti].hasAttribute('hidden')) pulseSwap(targets[ti]);
        }
      }, 20);
    }

    var specBtn = ev.target.closest
      ? ev.target.closest('.spec-tab, [data-spec-filter], .specs-tab, [data-spec-cat]')
      : null;
    if (specBtn) {
      var sec = specBtn.closest('section') || document;
      setTimeout(function () {
        var visibleRows = sec.querySelectorAll('.ledger-item:not([hidden]), .ledger-row:not([hidden]), .spec-table__row:not([hidden]), .spec-row:not([hidden]), .specs-panel:not([hidden])');
        var maxPulse = Math.min(visibleRows.length, 16);
        for (var ri = 0; ri < maxPulse; ri++) {
          pulseSwap(visibleRows[ri]);
        }
      }, 15);
    }
  });

  /* ------------------------------------------------------------------------
     9. Static-First Metric Count-Up Gap Fill (Only for static un-counted KPIs)
     ------------------------------------------------------------------------ */
  var staticCountItems = [];
  if (!prefersReduced) {
    var candidateB = document.querySelectorAll(
      '.triad-item > b, .hero-stat > b, .hero__metric > b, .metric-item > b, .perf-metric > b, .lab-metric > b, .chapter-intro__stat > b'
    );
    for (var ci = 0; ci < candidateB.length; ci++) {
      var bEl = candidateB[ci];
      if (bEl.hasAttribute('data-count') || bEl.hasAttribute('data-to') || bEl.classList.contains('count')) continue;
      if (bEl.closest('#aero-lab, #aerolab, #telemetry, #horology, [data-stage] canvas')) continue;
      if (isInteractiveLabSection(bEl)) continue;

      var clone = bEl.cloneNode(true);
      var ems = clone.querySelectorAll('em, span, small');
      for (var ei = 0; ei < ems.length; ei++) ems[ei].remove();
      var numText = (clone.textContent || '').replace(/\u00a0/g, ' ').trim();
      if (!/^\d[\d,]*(?:\.\d+)?$/.test(numText)) continue;

      var targetNum = parseFloat(numText.replace(/,/g, ''));
      if (!isFinite(targetNum) || targetNum <= 0) continue;

      var origHtml = bEl.innerHTML;
      var suffixHtml = '';
      var firstEm = bEl.querySelector('em, span, small');
      if (firstEm) suffixHtml = firstEm.outerHTML;
      var hasComma = numText.indexOf(',') !== -1;
      var dotIdx = numText.indexOf('.');
      var decimals = dotIdx !== -1 ? numText.length - dotIdx - 1 : 0;

      staticCountItems.push({
        el: bEl,
        target: targetNum,
        decimals: decimals,
        hasComma: hasComma,
        suffixHtml: suffixHtml,
        origHtml: origHtml,
        done: false
      });
    }
  }

  function runStaticCount(item) {
    if (item.done) return;
    item.done = true;
    var start = performance.now();
    var dur = 720;
    function step(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      var val = item.target * eased;
      var str = item.decimals > 0 ? val.toFixed(item.decimals) : String(Math.round(val));
      if (item.hasComma) {
        var parts = str.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        str = parts.join('.');
      }
      if (t < 1) {
        item.el.innerHTML = str + item.suffixHtml;
        requestAnimationFrame(step);
      } else {
        item.el.innerHTML = item.origHtml;
      }
    }
    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------------------
     10. IntersectionObserver + Scroll Visibility Flush (Never stuck at 0)
     ------------------------------------------------------------------------ */
  function flushReveals() {
    var vh = window.innerHeight || 900;
    for (var i = 0; i < observedRevealTargets.length; i++) {
      var el = observedRevealTargets[i];
      if (!el.classList.contains('is-hc-in') && el.getBoundingClientRect().top <= vh * 1.04) {
        el.classList.add('is-hc-in');
      }
    }
    for (var j = 0; j < staticCountItems.length; j++) {
      var item = staticCountItems[j];
      if (!item.done && item.el.getBoundingClientRect().top <= vh * 0.96) {
        runStaticCount(item);
      }
    }
  }

  if (prefersReduced) {
    observedRevealTargets.forEach(function (el) { el.classList.add('is-hc-in'); });
  } else if ('IntersectionObserver' in window) {
    var revIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-hc-in');
          revIO.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -3% 0px', threshold: 0.01 });
    observedRevealTargets.forEach(function (el) { revIO.observe(el); });

    if (staticCountItems.length) {
      var cntIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            for (var k = 0; k < staticCountItems.length; k++) {
              if (staticCountItems[k].el === en.target) {
                runStaticCount(staticCountItems[k]);
                break;
              }
            }
            cntIO.unobserve(en.target);
          }
        });
      }, { threshold: 0.25 });
      staticCountItems.forEach(function (it) { cntIO.observe(it.el); });
    }
    flushReveals();
  } else {
    observedRevealTargets.forEach(function (el) { el.classList.add('is-hc-in'); });
  }

  /* ------------------------------------------------------------------------
     11. Desktop Architectural Chapter Rail + Back-to-Top Trigger
     ------------------------------------------------------------------------ */
  var sections = Array.prototype.slice.call(document.querySelectorAll('main > section[id], main section[id]'))
    .filter(function (sec, idx, arr) {
      // Keep top-level sections inside main without nesting duplicates
      return arr.indexOf(sec) === idx && sec.parentElement && sec.parentElement.tagName === 'MAIN';
    });

  // Extract localized section labels cleanly from DOM (menu links or headings)
  var labelMap = {};
  var menuLinks = document.querySelectorAll('.index-link, .menu-overlay__nav a');
  for (var mi = 0; mi < menuLinks.length; mi++) {
    var href = menuLinks[mi].getAttribute('href') || '';
    if (href.charAt(0) === '#') {
      var targetId = href.slice(1);
      var titleNode = menuLinks[mi].querySelector('.index-link__title') || menuLinks[mi];
      var txt = (titleNode.textContent || '').replace(/\s+/g, ' ').trim();
      if (txt) labelMap[targetId] = txt;
    }
  }

  var railEl = null;
  var railBtns = [];
  if (sections.length >= 4) {
    railEl = document.createElement('nav');
    railEl.className = 'hc-rail';
    railEl.setAttribute('aria-label', T.railAria);

    sections.forEach(function (sec, i) {
      var num = String(i + 1).padStart(2, '0');
      var hEl = sec.querySelector('h1, h2, h3');
      var fallbackName = hEl ? (hEl.textContent || '').replace(/\s+/g, ' ').trim() : sec.id.toUpperCase();
      if (fallbackName.length > 22) fallbackName = fallbackName.slice(0, 20) + '…';
      var lbl = labelMap[sec.id] || fallbackName;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hc-rail__item';
      btn.setAttribute('data-hc-sec', sec.id);
      btn.setAttribute('aria-label', num + ' · ' + lbl);

      var spanLbl = document.createElement('span');
      spanLbl.className = 'hc-rail__label';
      spanLbl.textContent = num + ' · ' + lbl;

      var spanTick = document.createElement('span');
      spanTick.className = 'hc-rail__tick';
      spanTick.setAttribute('aria-hidden', 'true');

      btn.appendChild(spanLbl);
      btn.appendChild(spanTick);
      btn.addEventListener('click', function () {
        sec.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
      });
      railEl.appendChild(btn);
      railBtns.push(btn);
    });
    body.appendChild(railEl);
  }

  // Back-to-top trigger (skip if site already has .scroll-gauge e.g. 499p-redesign)
  var topBtn = null;
  if (!document.querySelector('.scroll-gauge')) {
    topBtn = document.createElement('button');
    topBtn.type = 'button';
    topBtn.className = 'hc-top-btn';
    topBtn.setAttribute('aria-label', T.topAria);
    topBtn.innerHTML =
      '<svg class="hc-top-btn__ring" viewBox="0 0 38 38" aria-hidden="true">' +
        '<rect class="hc-top-btn__arc" x="1" y="1" width="36" height="36" rx="2"></rect>' +
      '</svg>' +
      '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
        '<path d="M7 11V3M7 3L3.5 6.5M7 3L10.5 6.5" stroke="currentColor" stroke-width="1.35" stroke-linecap="square"/>' +
      '</svg>';
    topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
    body.appendChild(topBtn);
  }

  /* ------------------------------------------------------------------------
     12. Scroll Frame: Progress Hairline, Active Chapter, Light Polarity, Hero Depth
     ------------------------------------------------------------------------ */
  var scrollRaf = null;
  var activeSecIdx = 0;

  function updateScrollState() {
    scrollRaf = null;
    var y = window.scrollY || window.pageYOffset || 0;
    var vh = window.innerHeight || 900;
    var docH = Math.max(1, docEl.scrollHeight - vh);
    var p = Math.max(0, Math.min(1, y / docH));
    docEl.style.setProperty('--hc-scroll', p.toFixed(4));

    if (topBtn) {
      topBtn.classList.toggle('is-visible', y > vh * 0.65);
      // Light check near bottom-right corner
      var lightNearTopBtn = false;
      for (var bi = 0; bi < sections.length; bi++) {
        var br = sections[bi].getBoundingClientRect();
        if (br.top <= vh - 40 && br.bottom >= vh - 40) {
          lightNearTopBtn = isSectionLight(sections[bi]);
          break;
        }
      }
      topBtn.classList.toggle('hc-top-btn--light', lightNearTopBtn);
    }

    if (sections.length && railEl) {
      var probeY = vh * 0.48;
      var activeSec = sections[0];
      activeSecIdx = 0;
      for (var si = 0; si < sections.length; si++) {
        var r = sections[si].getBoundingClientRect();
        if (r.top <= probeY) {
          activeSec = sections[si];
          activeSecIdx = si;
        }
      }
      for (var ri = 0; ri < railBtns.length; ri++) {
        railBtns[ri].classList.toggle('is-active', ri === activeSecIdx);
      }
      railEl.classList.toggle('hc-rail--light', isSectionLight(activeSec));
    }

    if (heroSec && !prefersReduced && y < heroSec.offsetHeight * 1.15) {
      var lockup = heroSec.querySelector('.hero__lockup');
      if (lockup) {
        var ratio = Math.min(1, y / Math.max(1, heroSec.offsetHeight));
        lockup.style.transform = 'translate3d(0, ' + (-ratio * 18).toFixed(1) + 'px, 0)';
        lockup.style.opacity = String(Math.max(0.18, 1 - ratio * 0.95).toFixed(3));
      }
    } else if (heroSec && heroSec.querySelector('.hero__lockup')) {
      var lk = heroSec.querySelector('.hero__lockup');
      if (y === 0) {
        lk.style.transform = '';
        lk.style.opacity = '';
      }
    }

    flushReveals();
  }

  window.addEventListener('scroll', function () {
    if (!scrollRaf) scrollRaf = requestAnimationFrame(updateScrollState);
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (!scrollRaf) scrollRaf = requestAnimationFrame(updateScrollState);
  }, { passive: true });
  updateScrollState();

  // Alt+ArrowDown / Alt+ArrowUp chapter stepping
  document.addEventListener('keydown', function (ev) {
    if (!ev.altKey || ev.ctrlKey || ev.metaKey || !sections.length) return;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      var nextIdx = ev.key === 'ArrowDown'
        ? Math.min(sections.length - 1, activeSecIdx + 1)
        : Math.max(0, activeSecIdx - 1);
      sections[nextIdx].scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    }
  });

  /* ------------------------------------------------------------------------
     13. Enhanced Cinema Lightbox (Deck Prev/Next, Counter, 2x Zoom/Pan, Swipe)
     ------------------------------------------------------------------------ */
  var nativeLb = document.getElementById('lightbox');
  var lbEl = nativeLb;
  var isFallbackLb = false;

  if (!lbEl) {
    isFallbackLb = true;
    lbEl = document.createElement('div');
    lbEl.id = 'hcLightbox';
    lbEl.className = 'hc-lightbox';
    lbEl.setAttribute('role', 'dialog');
    lbEl.setAttribute('aria-modal', 'true');
    lbEl.setAttribute('aria-label', T.inspect);
    lbEl.setAttribute('hidden', '');
    lbEl.innerHTML =
      '<button class="hc-lightbox__close" id="hcLightboxClose" type="button">' + T.closeTxt + '</button>' +
      '<img class="hc-lightbox__img" id="hcLightboxImg" src="" alt="">' +
      '<p class="hc-lightbox__cap" id="hcLightboxCap"></p>';
    body.appendChild(lbEl);
  }

  var lbImg = document.getElementById(isFallbackLb ? 'hcLightboxImg' : 'lightboxImg') || lbEl.querySelector('img');
  var lbCap = document.getElementById(isFallbackLb ? 'hcLightboxCap' : 'lightboxCap');
  var lbTitle = document.getElementById('lightboxTitle');
  var lbDesc = document.getElementById('lightboxDesc');
  var lbClose = document.getElementById(isFallbackLb ? 'hcLightboxClose' : 'lightboxClose');

  // Build deduplicated image deck across the whole page
  var deck = [];
  var seenSrcs = [];

  function addToDeck(item) {
    if (!item || !item.src) return;
    var norm = item.src.split('?')[0].split('#')[0];
    if (!norm || seenSrcs.indexOf(norm) !== -1) return;
    seenSrcs.push(norm);
    deck.push(item);
  }

  function extractInfoFromTrigger(el) {
    var img = el.tagName === 'IMG' ? el : el.querySelector('img');
    var src = el.getAttribute('data-lightbox-src') || el.getAttribute('data-src') || (img && (img.currentSrc || img.getAttribute('src')));
    var alt = el.getAttribute('data-lightbox-alt') || (img && img.getAttribute('alt')) || '';
    var fig = el.closest('figure, .imax-slide, .detail-card, .design-plate');
    var h = fig ? fig.querySelector('h3, strong') : null;
    var p = fig ? fig.querySelector('figcaption p, figcaption span, p') : null;
    var figCap = fig && fig.querySelector('figcaption') ? (fig.querySelector('figcaption').textContent || '').replace(/\s+/g, ' ').trim() : '';
    var cap = el.getAttribute('data-lightbox-cap') || (h && p ? h.textContent.trim() + ' — ' + p.textContent.trim() : (figCap || alt));
    return { src: src, alt: alt, title: h ? h.textContent.trim() : alt, cap: cap };
  }

  var explicitTriggers = document.querySelectorAll('[data-lightbox], [data-lightbox-img], .imax-slide:not(.is-clone)');
  for (var xi = 0; xi < explicitTriggers.length; xi++) {
    if (explicitTriggers[xi].closest('#lightbox, .hc-lightbox')) continue;
    addToDeck(extractInfoFromTrigger(explicitTriggers[xi]));
  }

  // Also wire un-bound editorial plates so visitors can click & inspect any large plate
  processedFrameHosts.forEach(function (host) {
    var img = host.querySelector('img');
    if (!img) return;
    var clickableParent = host.closest('[data-lightbox], [data-lightbox-img], .imax-slide, a, button');
    var info = extractInfoFromTrigger(clickableParent || img);
    addToDeck(info);

    if (!clickableParent && !img.hasAttribute('data-lightbox-img')) {
      host.classList.add('hc-inspect-target');
      if (!host.querySelector('.hc-inspect-badge')) {
        var badge = document.createElement('span');
        badge.className = 'hc-inspect-badge';
        badge.setAttribute('aria-hidden', 'true');
        badge.textContent = '+';
        host.appendChild(badge);
      }
      if (!host.hasAttribute('tabindex')) host.setAttribute('tabindex', '0');
      if (!host.hasAttribute('role')) host.setAttribute('role', 'button');
      if (!host.getAttribute('aria-label')) host.setAttribute('aria-label', info.alt || T.inspect);

      var triggerOpen = function () {
        var idx = findDeckIndex(info.src);
        openDeckAt(idx >= 0 ? idx : 0, info);
      };
      host.addEventListener('click', function (ev) {
        if (ev.target && ev.target.closest('a, button')) return;
        triggerOpen();
      });
      host.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          triggerOpen();
        }
      });
    }
  });

  function findDeckIndex(src) {
    if (!src) return -1;
    var clean = src.split('?')[0].split('#')[0];
    var fileOnly = clean.split('/').pop();
    for (var i = 0; i < deck.length; i++) {
      var dClean = deck[i].src.split('?')[0].split('#')[0];
      if (dClean === clean || (fileOnly && dClean.split('/').pop() === fileOnly)) return i;
    }
    return -1;
  }

  var hasNativeNav = !!(document.getElementById('lightboxPrev') || document.getElementById('lightboxNext'));
  var hasNativeCount = !!document.getElementById('lightboxCount');
  var hcPrevBtn = null;
  var hcNextBtn = null;
  var hcCountEl = null;
  var hcZoomBtn = null;
  var currentDeckIdx = 0;
  var isZoomed = false;

  function resetZoom() {
    isZoomed = false;
    if (lbImg) {
      lbImg.classList.remove('is-zoomed');
      lbImg.style.removeProperty('--hc-pan-x');
      lbImg.style.removeProperty('--hc-pan-y');
    }
    if (hcZoomBtn) {
      hcZoomBtn.classList.remove('is-active');
      hcZoomBtn.setAttribute('aria-pressed', 'false');
      hcZoomBtn.textContent = T.zoomIn;
    }
  }

  function toggleZoom() {
    if (!lbImg) return;
    isZoomed = !isZoomed;
    lbImg.classList.toggle('is-zoomed', isZoomed);
    if (!isZoomed) {
      lbImg.style.removeProperty('--hc-pan-x');
      lbImg.style.removeProperty('--hc-pan-y');
    }
    if (hcZoomBtn) {
      hcZoomBtn.classList.toggle('is-active', isZoomed);
      hcZoomBtn.setAttribute('aria-pressed', isZoomed ? 'true' : 'false');
      hcZoomBtn.textContent = isZoomed ? T.zoomOut : T.zoomIn;
    }
  }

  function syncLightboxControls() {
    if (lbEl && lbEl.hasAttribute('hidden') && lbEl.classList.contains('is-open')) {
      lbEl.classList.remove('is-open');
    }
    var open = isLbOpen();
    if (!open) {
      resetZoom();
      return;
    }
    if (lbImg) {
      lbImg.classList.add('is-zoomable');
      var idx = findDeckIndex(lbImg.getAttribute('src') || lbImg.src);
      if (idx >= 0) currentDeckIdx = idx;
    }
    var showMulti = deck.length > 1;
    if (hcPrevBtn) hcPrevBtn.hidden = !showMulti;
    if (hcNextBtn) hcNextBtn.hidden = !showMulti;
    if (hcCountEl) {
      hcCountEl.hidden = !showMulti;
      if (showMulti) {
        hcCountEl.textContent = String(currentDeckIdx + 1).padStart(2, '0') + ' / ' + String(deck.length).padStart(2, '0');
      }
    }
  }

  function isLbOpen() {
    if (!lbEl || lbEl.hasAttribute('hidden')) return false;
    var cs = getComputedStyle(lbEl);
    return cs.display !== 'none' && cs.pointerEvents !== 'none' && parseFloat(cs.opacity) > 0.05;
  }

  function openDeckAt(idx, fallbackItem) {
    var item = deck[idx] || fallbackItem;
    if (!lbEl || !lbImg || !item) return;
    currentDeckIdx = idx >= 0 ? idx : 0;
    resetZoom();
    lbImg.src = item.src;
    lbImg.alt = item.alt || '';
    if (lbCap && !lbTitle) lbCap.textContent = item.cap || item.alt || '';
    if (lbTitle) lbTitle.textContent = item.title || item.alt || '';
    if (lbDesc) lbDesc.textContent = item.cap && item.cap !== item.title ? item.cap : '';
    lbEl.removeAttribute('hidden');
    void lbEl.offsetWidth;
    lbEl.classList.add('is-open');
    syncLightboxControls();
    if (lbClose) lbClose.focus();
  }

  function closeFallbackLb() {
    if (!isFallbackLb || !lbEl) return;
    resetZoom();
    lbEl.classList.remove('is-open');
    lbEl.setAttribute('hidden', '');
  }

  function stepDeck(dir) {
    if (deck.length <= 1) return;
    currentDeckIdx = (currentDeckIdx + dir + deck.length) % deck.length;
    var item = deck[currentDeckIdx];
    if (!item || !lbImg) return;
    resetZoom();
    lbImg.src = item.src;
    lbImg.alt = item.alt || '';
    if (lbCap && !lbTitle) lbCap.textContent = item.cap || item.alt || '';
    if (lbTitle) lbTitle.textContent = item.title || item.alt || '';
    if (lbDesc) lbDesc.textContent = item.cap && item.cap !== item.title ? item.cap : '';
    syncLightboxControls();
  }

  // Inject architectural Lightbox controls (Toolbar + Prev/Next if missing)
  if (lbEl) {
    var toolbar = document.createElement('div');
    toolbar.className = 'hc-lb-toolbar';

    if (!hasNativeCount) {
      hcCountEl = document.createElement('span');
      hcCountEl.className = 'hc-lb-count';
      hcCountEl.hidden = true;
      toolbar.appendChild(hcCountEl);
    }

    hcZoomBtn = document.createElement('button');
    hcZoomBtn.type = 'button';
    hcZoomBtn.className = 'hc-lb-zoom';
    hcZoomBtn.setAttribute('aria-pressed', 'false');
    hcZoomBtn.textContent = T.zoomIn;
    hcZoomBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      toggleZoom();
    });
    toolbar.appendChild(hcZoomBtn);
    lbEl.appendChild(toolbar);

    if (!hasNativeNav && deck.length > 1) {
      hcPrevBtn = document.createElement('button');
      hcPrevBtn.type = 'button';
      hcPrevBtn.className = 'hc-lb-nav hc-lb-nav--prev';
      hcPrevBtn.setAttribute('aria-label', T.prevAria);
      hcPrevBtn.textContent = '←';
      hcPrevBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        stepDeck(-1);
      });

      hcNextBtn = document.createElement('button');
      hcNextBtn.type = 'button';
      hcNextBtn.className = 'hc-lb-nav hc-lb-nav--next';
      hcNextBtn.setAttribute('aria-label', T.nextAria);
      hcNextBtn.textContent = '→';
      hcNextBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        stepDeck(1);
      });

      lbEl.appendChild(hcPrevBtn);
      lbEl.appendChild(hcNextBtn);
    }

    if (lbImg) {
      lbImg.classList.add('is-zoomable');
      lbImg.addEventListener('click', function (ev) {
        if (!isLbOpen()) return;
        ev.stopPropagation();
        toggleZoom();
      });
      lbEl.addEventListener('mousemove', function (ev) {
        if (!isZoomed || !lbImg || !isLbOpen()) return;
        var vw = window.innerWidth || 1440;
        var vh = window.innerHeight || 900;
        var px = (0.5 - ev.clientX / vw) * 240;
        var py = (0.5 - ev.clientY / vh) * 180;
        lbImg.style.setProperty('--hc-pan-x', px.toFixed(1) + 'px');
        lbImg.style.setProperty('--hc-pan-y', py.toFixed(1) + 'px');
      }, { passive: true });
    }

    if (isFallbackLb) {
      if (lbClose) lbClose.addEventListener('click', closeFallbackLb);
      lbEl.addEventListener('click', function (ev) {
        if (ev.target === lbEl) closeFallbackLb();
      });
    }

    // Touch horizontal swipe inside lightbox
    var lbTouchX = 0;
    lbEl.addEventListener('touchstart', function (ev) {
      if (ev.touches && ev.touches.length === 1) lbTouchX = ev.touches[0].clientX;
    }, { passive: true });
    lbEl.addEventListener('touchend', function (ev) {
      if (isZoomed || !ev.changedTouches || !ev.changedTouches.length) return;
      var dx = ev.changedTouches[0].clientX - lbTouchX;
      if (Math.abs(dx) > 48 && !hasNativeNav && deck.length > 1) {
        stepDeck(dx < 0 ? 1 : -1);
      }
    }, { passive: true });

    if ('MutationObserver' in window) {
      var lbObs = new MutationObserver(syncLightboxControls);
      lbObs.observe(lbEl, { attributes: true, attributeFilter: ['class', 'hidden'] });
    }

    document.addEventListener('keydown', function (ev) {
      if (!isLbOpen()) return;
      if (ev.key === 'Escape') {
        if (isZoomed) resetZoom();
        if (isFallbackLb) closeFallbackLb();
      } else if (ev.key === 'z' || ev.key === 'Z') {
        ev.preventDefault();
        toggleZoom();
      } else if (!hasNativeNav && deck.length > 1) {
        if (ev.key === 'ArrowLeft') {
          ev.preventDefault();
          stepDeck(-1);
        } else if (ev.key === 'ArrowRight') {
          ev.preventDefault();
          stepDeck(1);
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     14. Interactive Spec Ledger Row Click-to-Copy + Micro-Toast
     ------------------------------------------------------------------------ */
  var toastEl = null;
  var toastTimer = null;

  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'hc-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-open');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-open');
    }, 1500);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
    } else {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
        body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      } catch (_) {}
    }
  }

  var specSections = Array.prototype.slice.call(document.querySelectorAll('#specs, #legacy'));
  if (specSections.length) {
    var specRowSel = '.ledger-item, .ledger-row, .spec-table__row, .spec-row';
    specSections.forEach(function (specSection) {
      var rows = specSection.querySelectorAll(specRowSel);
      for (var sri = 0; sri < rows.length; sri++) {
        rows[sri].classList.add('hc-spec-copy');
      }
      specSection.addEventListener('click', function (ev) {
        var row = ev.target.closest ? ev.target.closest(specRowSel) : null;
        if (!row || row.closest('button, a')) return;
        var parts = row.querySelectorAll('span, b, strong, dt, dd');
        var kTxt = '';
        var vTxt = '';
        if (parts.length >= 2) {
          kTxt = (parts[0].textContent || '').replace(/\s+/g, ' ').trim();
          vTxt = (parts[1].textContent || '').replace(/\s+/g, ' ').trim();
        } else {
          kTxt = (row.textContent || '').replace(/\s+/g, ' ').trim();
        }
        if (!kTxt) return;
        var payload = vTxt ? (kTxt + ': ' + vTxt) : kTxt;
        copyText(payload);
        row.classList.add('is-copied');
        setTimeout(function () { row.classList.remove('is-copied'); }, 450);
        showToast(T.copied + kTxt);
      });
    });
  }

  /* ------------------------------------------------------------------------
     15. Restrained Magnetic Micro-Pull on Architectural Buttons (Fine Pointer)
     ------------------------------------------------------------------------ */
  if (finePointer && !prefersReduced) {
    var magTargets = document.querySelectorAll('.carousel-btn, .hc-top-btn, .menu-trigger, .nav__menu-btn');
    for (var mgi = 0; mgi < magTargets.length; mgi++) {
      (function (btn) {
        btn.addEventListener('mousemove', function (ev) {
          var r = btn.getBoundingClientRect();
          if (!r.width || !r.height) return;
          var dx = ((ev.clientX - (r.left + r.width * 0.5)) / (r.width * 0.5)) * 3;
          var dy = ((ev.clientY - (r.top + r.height * 0.5)) / (r.height * 0.5)) * 3;
          btn.style.transform = 'translate3d(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px, 0)';
        }, { passive: true });
        btn.addEventListener('mouseleave', function () {
          btn.style.transform = '';
        });
      })(magTargets[mgi]);
    }
  }
})();
