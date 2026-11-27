/* ==========================================================================
   Porsche 919 Hybrid Evo · Cinema Stages, V4+MGU Power Split Slider,
   76vw Tribute Filmstrip & Spec Ledger
   ========================================================================== */
(function () {
  'use strict';

  /* 1. Multi-Layer 100vw Cinema Stages (#powertrain, #aerodynamics, #spa, #nordschleife) */
  var stages = Array.prototype.slice.call(document.querySelectorAll('.cinema-stage[data-stage]'));
  stages.forEach(function (stage) {
    var tabs = Array.prototype.slice.call(stage.querySelectorAll('.stage-tab[data-target]'));
    var layers = Array.prototype.slice.call(stage.querySelectorAll('.cinema-stage__layer[data-layer]'));
    var titleEl = stage.querySelector('[data-stage-title]');
    var copyEl = stage.querySelector('[data-stage-copy]');

    function activate(targetKey, srcBtn) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-target') === targetKey;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on && !srcBtn) srcBtn = t;
      });
      layers.forEach(function (l) {
        l.classList.toggle('is-active', l.getAttribute('data-layer') === targetKey);
      });
      if (srcBtn) {
        var nextTitle = srcBtn.getAttribute('data-title');
        var nextCopy = srcBtn.getAttribute('data-copy');
        if (titleEl && nextTitle) titleEl.textContent = nextTitle;
        if (copyEl && nextCopy) copyEl.textContent = nextCopy;
      }
      if (window.EvoSyncStageVideos) window.EvoSyncStageVideos(stage);
    }

    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        activate(btn.getAttribute('data-target'), btn);
      });
    });
  });

  /* 2. Lineage Hairline Columns Highlight */
  var lineageCols = Array.prototype.slice.call(document.querySelectorAll('.lineage-col'));
  lineageCols.forEach(function (col) {
    col.addEventListener('click', function () {
      lineageCols.forEach(function (c) { c.classList.remove('is-active'); });
      col.classList.add('is-active');
    });
  });

  /* 3. Interactive 9R9 2.0L V4 + Front MGU Power Split Bar (2,000 - 9,000 rpm) */
  var ptSlider = document.getElementById('ptRpmSlider');
  if (ptSlider) {
    var unitLbl = ptSlider.getAttribute('data-unit') || 'PS';
    var ptRpmEl = document.getElementById('ptValRpm');
    var ptV4El = document.getElementById('ptValV4');
    var ptMguEl = document.getElementById('ptValMgu');
    var ptTotEl = document.getElementById('ptValTotal');
    var ptBarV4 = document.getElementById('ptBarV4');
    var ptBarMgu = document.getElementById('ptBarMgu');

    function updatePowerBar(rpm) {
      var r = Math.max(2000, Math.min(9000, rpm));
      var norm = (r - 2000) / 7000;
      var v4 = Math.round(180 + 540 * Math.pow(norm, 0.85));
      if (r >= 8900) v4 = 720;
      var mgu = r >= 4500 ? 440 : Math.round(280 + 160 * ((r - 2000) / 2500));
      var total = Math.min(1160, v4 + mgu);

      var pct = norm * 100;
      ptSlider.style.setProperty('--pct', pct.toFixed(1) + '%');

      if (ptRpmEl) ptRpmEl.innerHTML = r.toLocaleString('en-US') + '<em>rpm</em>';
      if (ptV4El) ptV4El.innerHTML = v4.toLocaleString('en-US') + '<em>' + unitLbl + '</em>';
      if (ptMguEl) ptMguEl.innerHTML = mgu.toLocaleString('en-US') + '<em>' + unitLbl + '</em>';
      if (ptTotEl) ptTotEl.innerHTML = total.toLocaleString('en-US') + '<em>' + unitLbl + '</em>';
      if (ptBarV4) ptBarV4.style.width = ((v4 / 1160) * 100).toFixed(1) + '%';
      if (ptBarMgu) ptBarMgu.style.width = ((mgu / 1160) * 100).toFixed(1) + '%';
    }

    ptSlider.addEventListener('input', function () {
      updatePowerBar(parseInt(ptSlider.value, 10) || 9000);
    });
    updatePowerBar(parseInt(ptSlider.value, 10) || 9000);
  }

  /* 4. IMAX Continuous Constant-Velocity Tribute Tour Filmstrip (#imaxTrack) */
  var imaxTrack = document.getElementById('imaxTrack');
  if (imaxTrack) {
    var carouselWrap = imaxTrack.closest('.imax-carousel-wrap');
    var origSlides = Array.prototype.slice.call(imaxTrack.querySelectorAll('.imax-slide'));
    var prevBtn = document.getElementById('imaxPrevBtn');
    var nextBtn = document.getElementById('imaxNextBtn');
    var playBtn = document.getElementById('imaxPlayBtn');
    var countEl = document.getElementById('imaxCounter');
    var progEl = document.getElementById('imaxProgressBar');
    var lightboxEl = document.getElementById('lightbox');
    var reducedQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

    if (origSlides.length) {
      var origCount = origSlides.length;
      var reel = document.createElement('div');
      reel.className = 'imax-reel';

      origSlides.forEach(function (s) {
        reel.appendChild(s);
      });
      origSlides.forEach(function (s) {
        var clone = s.cloneNode(true);
        clone.classList.add('is-clone');
        clone.setAttribute('aria-hidden', 'true');
        clone.setAttribute('tabindex', '-1');
        var cImg = clone.querySelector('img');
        if (cImg) cImg.loading = 'eager';
        reel.appendChild(clone);
      });
      imaxTrack.appendChild(reel);

      var firstClone = reel.children[origCount] || null;
      var loopWidth = 0;
      var offset = 0;
      var currentSpeed = 0;
      var nudgeDelta = 0;
      var inView = !('IntersectionObserver' in window);
      var isDragging = false;
      var userPaused = false;
      var lastTs = 0;
      var rafId = null;

      function pad2(n) {
        return n < 10 ? '0' + n : String(n);
      }

      function isReducedMotion() {
        return !!(reducedQuery && reducedQuery.matches);
      }

      function isLightboxOpen() {
        return !!(lightboxEl && (lightboxEl.classList.contains('is-open') || !lightboxEl.hasAttribute('hidden')));
      }

      function getBaseSpeed() {
        return window.innerWidth <= 600 ? 36 : 56;
      }

      function wrapOffset(v) {
        if (loopWidth <= 0) return 0;
        var r = v % loopWidth;
        return r < 0 ? r + loopWidth : r;
      }

      function applyVisual() {
        if (loopWidth <= 0) return;
        reel.style.transform = 'translate3d(' + (-offset).toFixed(2) + 'px, 0, 0)';
        if (progEl) {
          progEl.style.setProperty('--prog', (offset / loopWidth).toFixed(4));
        }
        if (countEl) {
          var stepW = loopWidth / origCount;
          if (stepW > 0) {
            var activeIdx = Math.floor(wrapOffset(offset + stepW * 0.35) / stepW) % origCount;
            countEl.textContent = pad2(activeIdx + 1) + ' / ' + pad2(origCount);
          }
        }
      }

      function measureLoop() {
        var prevLoop = loopWidth;
        var nextLoop = 0;
        if (firstClone && origSlides[0]) {
          nextLoop = firstClone.offsetLeft - origSlides[0].offsetLeft;
        }
        if (nextLoop > 10) {
          if (prevLoop > 10 && Math.abs(prevLoop - nextLoop) > 1) {
            offset = wrapOffset(offset * (nextLoop / prevLoop));
          }
          loopWidth = nextLoop;
          applyVisual();
        }
      }

      function shouldCruise() {
        return (
          origCount > 1 &&
          inView &&
          !document.hidden &&
          !userPaused &&
          !isDragging &&
          !isLightboxOpen() &&
          !isReducedMotion()
        );
      }

      function wakeLoop() {
        if (rafId === null) {
          lastTs = performance.now();
          rafId = requestAnimationFrame(onFrame);
        }
      }

      function onFrame(now) {
        rafId = null;
        if (loopWidth <= 0) measureLoop();
        if (!lastTs) lastTs = now;
        var dt = Math.min(0.05, Math.max(0, (now - lastTs) / 1000));
        lastTs = now;

        var targetSpeed = shouldCruise() ? getBaseSpeed() : 0;
        currentSpeed += (targetSpeed - currentSpeed) * Math.min(1, dt * 10);
        if (Math.abs(currentSpeed - targetSpeed) < 0.25) {
          currentSpeed = targetSpeed;
        }

        if (Math.abs(nudgeDelta) > 0.3) {
          var nudgeStep = nudgeDelta * Math.min(1, dt * 8);
          offset = wrapOffset(offset + nudgeStep);
          nudgeDelta -= nudgeStep;
        } else if (nudgeDelta !== 0) {
          offset = wrapOffset(offset + nudgeDelta);
          nudgeDelta = 0;
        }

        if (currentSpeed > 0) {
          offset = wrapOffset(offset + currentSpeed * dt);
        }

        applyVisual();

        if (shouldCruise() || currentSpeed > 0.25 || Math.abs(nudgeDelta) > 0.3) {
          rafId = requestAnimationFrame(onFrame);
        }
      }

      function syncState() {
        var cruising = shouldCruise();
        if (carouselWrap) {
          carouselWrap.classList.toggle('is-paused', !cruising);
        }
        if (playBtn) {
          playBtn.classList.toggle('is-paused', userPaused);
          playBtn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
          var lbl = userPaused
            ? (playBtn.getAttribute('data-lbl-play') || 'Resume tribute tour autoplay')
            : (playBtn.getAttribute('data-lbl-pause') || 'Pause tribute tour autoplay');
          playBtn.setAttribute('aria-label', lbl);
        }
        if (cruising || currentSpeed > 0.25 || Math.abs(nudgeDelta) > 0.3) {
          wakeLoop();
        }
      }

      function nudgeBy(dir) {
        measureLoop();
        if (loopWidth <= 0) return;
        var stepW = loopWidth / origCount;
        if (isReducedMotion()) {
          offset = wrapOffset(offset + dir * stepW);
          applyVisual();
          return;
        }
        nudgeDelta += dir * stepW;
        wakeLoop();
      }

      if (prevBtn) {
        prevBtn.addEventListener('click', function () {
          nudgeBy(-1);
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          nudgeBy(1);
        });
      }

      if (playBtn) {
        playBtn.addEventListener('click', function () {
          userPaused = !userPaused;
          syncState();
        });
      }

      if (carouselWrap) {
        carouselWrap.addEventListener('keydown', function (e) {
          if (isLightboxOpen()) return;
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            nudgeBy(1);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            nudgeBy(-1);
          }
        });
      }

      var dragLastX = 0;
      var dragMoved = 0;
      var capturedDrag = false;
      var suppressClickUntil = 0;

      imaxTrack.addEventListener('dragstart', function (e) {
        e.preventDefault();
      });

      imaxTrack.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        isDragging = true;
        dragLastX = e.clientX;
        dragMoved = 0;
        capturedDrag = false;
        nudgeDelta = 0;
        currentSpeed = 0;
        imaxTrack.classList.add('is-dragging');
        syncState();
      });

      window.addEventListener('pointermove', function (e) {
        if (!isDragging) return;
        var dx = e.clientX - dragLastX;
        dragLastX = e.clientX;
        dragMoved += Math.abs(dx);
        if (!capturedDrag && dragMoved > 6 && imaxTrack.setPointerCapture) {
          capturedDrag = true;
          try { imaxTrack.setPointerCapture(e.pointerId); } catch (_) {}
        }
        offset = wrapOffset(offset - dx);
        applyVisual();
      }, { passive: true });

      function endDrag(e) {
        if (!isDragging) return;
        isDragging = false;
        imaxTrack.classList.remove('is-dragging');
        if (capturedDrag && imaxTrack.releasePointerCapture && e && e.pointerId !== undefined) {
          try { imaxTrack.releasePointerCapture(e.pointerId); } catch (_) {}
        }
        capturedDrag = false;
        if (dragMoved > 8) {
          suppressClickUntil = performance.now() + 240;
        }
        syncState();
      }

      window.addEventListener('pointerup', endDrag, { passive: true });
      window.addEventListener('pointercancel', endDrag, { passive: true });

      imaxTrack.addEventListener('click', function (e) {
        if (performance.now() < suppressClickUntil) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);

      imaxTrack.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          e.preventDefault();
          nudgeDelta = 0;
          offset = wrapOffset(offset + e.deltaX);
          applyVisual();
        }
      }, { passive: false });

      if ('IntersectionObserver' in window) {
        var obsTarget = carouselWrap || imaxTrack;
        var trackObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting !== inView) {
              inView = entry.isIntersecting;
              if (inView) measureLoop();
              syncState();
            }
          });
        }, { threshold: 0.1 });
        trackObserver.observe(obsTarget);
      }

      if ('ResizeObserver' in window) {
        var reelObserver = new ResizeObserver(measureLoop);
        reelObserver.observe(reel);
      }
      window.addEventListener('resize', measureLoop);

      if (lightboxEl && 'MutationObserver' in window) {
        var lbObserver = new MutationObserver(syncState);
        lbObserver.observe(lightboxEl, { attributes: true, attributeFilter: ['class', 'hidden'] });
      }

      document.addEventListener('visibilitychange', syncState);
      if (reducedQuery && reducedQuery.addEventListener) {
        reducedQuery.addEventListener('change', syncState);
      }

      measureLoop();
      syncState();
    }
  }

  /* 5. Specifications Comparison Row & 5-Category Filter */
  var modeRowBtns = Array.prototype.slice.call(document.querySelectorAll('.mode-row-btn'));
  modeRowBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      modeRowBtns.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
    });
  });

  var specTabs = Array.prototype.slice.call(document.querySelectorAll('.spec-tab[data-cat]'));
  var specItems = Array.prototype.slice.call(document.querySelectorAll('.ledger-item[data-cat]'));
  specTabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = btn.getAttribute('data-cat');
      specTabs.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      specItems.forEach(function (item) {
        var show = cat === 'all' || item.getAttribute('data-cat') === cat;
        if (show) item.removeAttribute('hidden');
        else item.setAttribute('hidden', '');
      });
    });
  });
})();
