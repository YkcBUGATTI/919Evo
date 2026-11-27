/* ==========================================================================
   Porsche 919 Hybrid Evo · Unrestricted Telemetry Lab (#telemetry)
   Strict Physics Invariants:
     - 2017 WEC Spec caps speed <= 335 km/h, 500 PS ICE + 400 PS MGU (900 PS),
       6.37 MJ lap energy, 100% baseline downforce, and bans active DRS.
     - 2018 EVO Spec reaches 369.4 km/h (Nordschleife) / 359 km/h (Spa),
       720 PS V4 + 440 PS MGU (1,160 PS), 8.49 MJ lap energy, +53% downforce.
     - Speed == 0 km/h forces Output = 0 PS, Downforce = 0%, DRS = false, Regen = false.
     - KERS Brake-by-Wire (>= 40 km/h) cuts ICE to 0, harvests front-axle -320 kW,
       and closes DRS to maximize braking downforce.
     - DRS (EVO only, >= 140 km/h) reduces drag & lowers downforce index by ~28%.
     - IntersectionObserver suspends requestAnimationFrame when offscreen.
   ========================================================================== */
(function () {
  'use strict';

  var sec = document.getElementById('telemetry');
  if (!sec) return;

  var canvas = document.getElementById('telemetryCanvas');
  var slider = document.getElementById('telSpeedSlider');
  var sliderValEl = document.getElementById('telSpeedValText');
  var sliderMaxEl = document.getElementById('telSpeedMaxText');
  var statusEl = document.getElementById('labStageStatus');
  var badgeText = document.getElementById('labBadgeText');

  var outEl = document.getElementById('telOutput');
  var dfEl = document.getElementById('telDownforce');
  var mjEl = document.getElementById('telEnergy');
  var stateEl = document.getElementById('telAeroState');

  var specBtns = Array.prototype.slice.call(sec.querySelectorAll('[data-spec]'));
  var trackBtns = Array.prototype.slice.call(sec.querySelectorAll('[data-track]'));
  var drsBtn = document.getElementById('drsBtn');
  var boostBtn = document.getElementById('eboostBtn');
  var regenBtn = document.getElementById('kersBtn');

  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LBL = {
    unitPower: sec.getAttribute('data-lbl-power-unit') || 'PS',
    idle: sec.getAttribute('data-lbl-idle') || 'IDLE · 0 PS',
    wecBanned: sec.getAttribute('data-lbl-wec-banned') || 'WEC BANNED',
    drsActive: sec.getAttribute('data-lbl-drs-active') || 'DRS OPEN · FRONT + REAR',
    drsStandby: sec.getAttribute('data-lbl-drs-standby') || 'STANDBY (<140)',
    boostActive: sec.getAttribute('data-lbl-boost-active') || 'AWD · +440',
    rwdOnly: sec.getAttribute('data-lbl-rwd') || 'V4 RWD',
    regenActive: sec.getAttribute('data-lbl-regen-active') || 'KERS HARVEST · 800V',
    regenStandby: sec.getAttribute('data-lbl-regen-standby') || 'STANDBY (<40)',
    frontAxis: sec.getAttribute('data-lbl-front') || 'F AXLE MGU',
    rearAxis: sec.getAttribute('data-lbl-rear') || 'R AXLE V4',
    effLabel: sec.getAttribute('data-lbl-eff') || 'AERO EFF',
    trackNring: sec.getAttribute('data-lbl-nring') || 'NORDSCHLEIFE',
    trackSpa: sec.getAttribute('data-lbl-spa') || 'SPA'
  };

  var SPECS = {
    wec: {
      label: '2017 WEC',
      maxV_nring: 335,
      maxV_spa: 335,
      iceMax: 500,
      mguMax: 400,
      totalMax: 900,
      energyMJ: 6.37,
      dfMult: 100,
      effMult: 100,
      drsAllowed: false
    },
    evo: {
      label: '2018 EVO',
      maxV_nring: 369.4,
      maxV_spa: 359,
      iceMax: 720,
      mguMax: 440,
      totalMax: 1160,
      energyMJ: 8.49,
      dfMult: 153,
      effMult: 166,
      drsAllowed: true
    }
  };

  var state = {
    spec: 'evo',
    track: 'nring',
    targetV: 320,
    curV: 320,
    curPower: 1160,
    curDf: 115,
    drs: false,
    boost: true,
    regen: false,
    visible: false,
    interacted: false,
    nudgeDone: false,
    rafId: null
  };

  var streamlines = [];
  for (var i = 0; i < 18; i++) {
    streamlines.push({
      x: Math.random(),
      yNorm: (i + 0.5) / 18,
      speed: 0.76 + (i % 5) * 0.14,
      len: 0.08 + (i % 3) * 0.035
    });
  }

  function currentMaxV() {
    var sp = SPECS[state.spec];
    return state.track === 'nring' ? sp.maxV_nring : sp.maxV_spa;
  }

  function syncSliderVisual(val) {
    if (!slider) return;
    var maxV = currentMaxV();
    slider.max = String(Math.round(maxV));
    slider.value = String(Math.round(val));
    var pct = maxV > 0 ? (val / maxV) * 100 : 0;
    slider.style.setProperty('--pct', pct.toFixed(1) + '%');
    if (sliderValEl) sliderValEl.textContent = String(Math.round(val));
    if (sliderMaxEl) sliderMaxEl.textContent = String(maxV);
  }

  function syncDrsLock() {
    if (!drsBtn) return;
    var allowed = SPECS[state.spec].drsAllowed;
    if (!allowed) {
      state.drs = false;
      drsBtn.classList.remove('is-active');
      drsBtn.setAttribute('aria-pressed', 'false');
      drsBtn.setAttribute('aria-disabled', 'true');
    } else {
      drsBtn.removeAttribute('aria-disabled');
    }
  }

  function computeTargets() {
    var sp = SPECS[state.spec];
    var maxV = currentMaxV();
    var v = Math.min(state.targetV, maxV);
    var vRatio = v / 369.4;

    var regenActive = state.regen && v >= 40;
    var drsActive = sp.drsAllowed && state.drs && !regenActive && v >= 140;
    var boostActive = state.boost && !regenActive && v > 0.5;

    var dfIdx = v <= 0.5 ? 0 : sp.dfMult * Math.pow(vRatio, 2);
    if (drsActive) dfIdx *= 0.72;

    var icePower = 0;
    var mguPower = 0;
    var totalPower = 0;

    if (v > 0.5 && !regenActive) {
      var load = Math.min(1, 0.34 + 0.66 * Math.pow(v / maxV, 0.55));
      icePower = sp.iceMax * load;
      if (v >= maxV * 0.85) icePower = sp.iceMax;
      if (boostActive) {
        mguPower = sp.mguMax * Math.min(1, 0.55 + 0.45 * (v / 220));
        if (v >= 220) mguPower = sp.mguMax;
      }
      totalPower = Math.min(sp.totalMax, icePower + mguPower);
    }

    return {
      sp: sp,
      maxV: maxV,
      v: v,
      dfIdx: dfIdx,
      icePower: icePower,
      mguPower: mguPower,
      totalPower: totalPower,
      drsActive: drsActive,
      boostActive: boostActive,
      regenActive: regenActive
    };
  }

  function updateDomReadouts(t) {
    if (outEl) {
      outEl.classList.remove('is-boost', 'is-regen');
      if (t.v <= 0.5) {
        outEl.innerHTML = '0<em>' + LBL.unitPower + '</em>';
      } else if (t.regenActive) {
        outEl.innerHTML = '-320<em>kW</em>';
        outEl.classList.add('is-regen');
      } else {
        outEl.innerHTML = Math.round(state.curPower).toLocaleString('en-US') + '<em>' + LBL.unitPower + '</em>';
        if (t.boostActive) outEl.classList.add('is-boost');
      }
    }

    if (dfEl) {
      dfEl.classList.toggle('is-drs', t.drsActive);
      dfEl.innerHTML = Math.round(state.curDf) + '<em>%</em>';
    }

    if (mjEl) {
      mjEl.innerHTML = t.sp.energyMJ.toFixed(2) + '<em>MJ</em>';
    }

    if (stateEl) {
      stateEl.classList.remove('is-drs', 'is-regen', 'is-boost');
      if (t.v <= 0.5) {
        stateEl.textContent = LBL.idle;
      } else if (t.regenActive) {
        stateEl.textContent = LBL.regenActive;
        stateEl.classList.add('is-regen');
      } else if (state.regen && t.v < 40) {
        stateEl.textContent = LBL.regenStandby;
      } else if (!t.sp.drsAllowed && state.drs) {
        stateEl.textContent = LBL.wecBanned;
      } else if (t.drsActive) {
        stateEl.textContent = LBL.drsActive;
        stateEl.classList.add('is-drs');
      } else if (t.sp.drsAllowed && state.drs && t.v < 140) {
        stateEl.textContent = LBL.drsStandby;
      } else if (t.boostActive) {
        stateEl.textContent = LBL.boostActive + ' ' + LBL.unitPower;
        stateEl.classList.add('is-boost');
      } else {
        stateEl.textContent = LBL.rwdOnly;
      }
    }

    if (statusEl) {
      statusEl.classList.toggle('is-drs', t.drsActive);
      statusEl.classList.toggle('is-regen', t.regenActive);
    }

    if (badgeText) {
      var trackTag = state.track === 'nring' ? LBL.trackNring : LBL.trackSpa;
      var parts = [t.sp.label, trackTag, Math.round(state.curV) + ' KM/H'];
      if (t.regenActive) parts.push('KERS 800V');
      else if (t.drsActive) parts.push('DRS OPEN');
      badgeText.textContent = parts.join(' · ');
    }
  }

  function resizeCanvas() {
    if (!canvas) return null;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(rect.width * dpr);
    var h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { ctx: canvas.getContext('2d'), w: rect.width, h: rect.height, dpr: dpr };
  }

  function drawOverlay(t, dt) {
    var box = resizeCanvas();
    if (!box) return;
    var ctx = box.ctx;
    var w = box.w;
    var h = box.h;
    ctx.setTransform(box.dpr, 0, 0, box.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var speedNorm = Math.max(0, Math.min(1, state.curV / 370));
    var dfNorm = Math.max(0, Math.min(1, state.curDf / 153));
    var rgb = t.regenActive
      ? 'rgba(107, 182, 217,'
      : (t.drsActive ? 'rgba(221, 228, 236,' : 'rgba(213, 0, 28,');

    var dir = t.regenActive ? -1 : 1;
    var flowRate = (0.06 + speedNorm * 0.98) * dt * dir;

    streamlines.forEach(function (line) {
      if (!prefersReduced) {
        line.x += flowRate * line.speed;
        if (line.x > 1.12) line.x = -0.12;
        if (line.x < -0.12) line.x = 1.12;
      }
      var yBase = line.yNorm * h;
      var distCenter = line.yNorm - 0.54;
      var pinch = Math.exp(-Math.pow(line.x - 0.48, 2) / 0.10) *
        (line.yNorm > 0.5 ? -16 : 12) * (0.2 + dfNorm * 0.85);
      var x1 = line.x * w;
      var x2 = x1 - dir * line.len * w * (0.35 + speedNorm * 0.9);
      var y1 = yBase + pinch;
      var y2 = yBase + pinch * 0.6;

      var grad = ctx.createLinearGradient(x2, y2, x1, y1);
      var alpha = (0.06 + speedNorm * 0.58) * (1 - Math.abs(distCenter) * 0.65);
      grad.addColorStop(0, rgb + ' 0)');
      grad.addColorStop(0.55, rgb + ' ' + (alpha * 0.65).toFixed(2) + ')');
      grad.addColorStop(1, rgb + ' ' + alpha.toFixed(2) + ')');

      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth = t.drsActive ? 1.0 : (1.1 + dfNorm * 0.85);
      ctx.moveTo(x2, y2);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    });

    /* Subtle Axle Energy & Aero Efficiency Hairlines */
    var solidAccent = t.regenActive ? '#6BB6D9' : (t.drsActive ? '#DDE4EC' : '#D5001C');
    var barW = 96;
    var barX = w - barW - 14;
    var barY = h - 34;

    ctx.font = '10px "IBM Plex Mono", ui-monospace, Consolas, monospace';
    ctx.fillStyle = 'rgba(247, 248, 250, 0.72)';
    var frontLabel = t.regenActive ? '-320 kW' : (Math.round(t.mguPower) + ' ' + LBL.unitPower);
    ctx.fillText(LBL.frontAxis + ' · ' + frontLabel, barX - 28, barY);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(barX, barY + 4, barW, 2);
    ctx.fillStyle = solidAccent;
    var frontRatio = t.regenActive ? 0.85 : Math.min(1, t.mguPower / 440);
    ctx.fillRect(barX, barY + 4, barW * frontRatio, 2);

    ctx.fillStyle = 'rgba(247, 248, 250, 0.72)';
    ctx.fillText(LBL.rearAxis + ' · ' + Math.round(t.icePower) + ' ' + LBL.unitPower, barX - 28, barY + 18);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(barX, barY + 22, barW, 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(barX, barY + 22, barW * Math.min(1, t.icePower / 720), 2);

    var effPct = state.curV <= 0.5 ? 0 : (t.sp.effMult / 166);
    ctx.fillStyle = 'rgba(247, 248, 250, 0.68)';
    ctx.fillText(LBL.effLabel + ' ' + (state.curV <= 0.5 ? '0%' : t.sp.effMult + '%'), 14, barY + 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(14, barY + 8, 96, 2);
    ctx.fillStyle = solidAccent;
    ctx.fillRect(14, barY + 8, 96 * effPct, 2);
  }

  function stepVal(cur, target, lerp) {
    var diff = target - cur;
    return Math.abs(diff) < 0.8 ? target : cur + diff * lerp;
  }

  var lastTime = performance.now();
  function tick(now) {
    var dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    var t = computeTargets();
    var lerp = prefersReduced ? 1 : Math.min(1, dt * 12);
    state.curV = stepVal(state.curV, t.v, lerp);
    state.curPower = stepVal(state.curPower, t.totalPower, lerp);
    state.curDf = stepVal(state.curDf, t.dfIdx, lerp);

    updateDomReadouts(t);
    drawOverlay(t, dt);

    if (state.visible && !prefersReduced) {
      state.rafId = requestAnimationFrame(tick);
    } else {
      state.rafId = null;
    }
  }

  function startLoop() {
    if (prefersReduced) {
      var t = computeTargets();
      state.curV = t.v;
      state.curPower = t.totalPower;
      state.curDf = t.dfIdx;
      updateDomReadouts(t);
      drawOverlay(t, 0.016);
      return;
    }
    if (!state.rafId && state.visible) {
      lastTime = performance.now();
      state.rafId = requestAnimationFrame(tick);
    }
  }

  function runFirstEntryNudge() {
    if (prefersReduced || state.nudgeDone || state.interacted) return;
    state.nudgeDone = true;
    var origV = state.targetV;
    state.targetV = 369.4;
    syncSliderVisual(369.4);
    setTimeout(function () {
      if (!state.interacted) {
        state.targetV = origV;
        syncSliderVisual(origV);
      }
    }, 760);
  }

  specBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.interacted = true;
      var next = btn.getAttribute('data-spec');
      if (!SPECS[next]) return;
      state.spec = next;
      specBtns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      syncDrsLock();
      var clamped = Math.min(state.targetV, currentMaxV());
      state.targetV = clamped;
      syncSliderVisual(clamped);
      startLoop();
    });
  });

  trackBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.interacted = true;
      var next = btn.getAttribute('data-track');
      if (next !== 'nring' && next !== 'spa') return;
      state.track = next;
      trackBtns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var clamped = Math.min(state.targetV, currentMaxV());
      state.targetV = clamped;
      syncSliderVisual(clamped);
      startLoop();
    });
  });

  if (drsBtn) {
    drsBtn.addEventListener('click', function () {
      if (!SPECS[state.spec].drsAllowed) return;
      state.interacted = true;
      state.drs = !state.drs;
      if (state.drs) {
        state.regen = false;
        if (regenBtn) {
          regenBtn.classList.remove('is-active');
          regenBtn.setAttribute('aria-pressed', 'false');
        }
      }
      drsBtn.classList.toggle('is-active', state.drs);
      drsBtn.setAttribute('aria-pressed', state.drs ? 'true' : 'false');
      startLoop();
    });
  }

  if (boostBtn) {
    boostBtn.addEventListener('click', function () {
      state.interacted = true;
      state.boost = !state.boost;
      if (state.boost && state.regen) {
        state.regen = false;
        if (regenBtn) {
          regenBtn.classList.remove('is-active');
          regenBtn.setAttribute('aria-pressed', 'false');
        }
      }
      boostBtn.classList.toggle('is-active', state.boost);
      boostBtn.setAttribute('aria-pressed', state.boost ? 'true' : 'false');
      startLoop();
    });
  }

  if (regenBtn) {
    regenBtn.addEventListener('click', function () {
      state.interacted = true;
      state.regen = !state.regen;
      if (state.regen) {
        state.drs = false;
        if (drsBtn) {
          drsBtn.classList.remove('is-active');
          drsBtn.setAttribute('aria-pressed', 'false');
        }
      }
      regenBtn.classList.toggle('is-active', state.regen);
      regenBtn.setAttribute('aria-pressed', state.regen ? 'true' : 'false');
      startLoop();
    });
  }

  if (slider) {
    slider.addEventListener('input', function () {
      state.interacted = true;
      var raw = parseFloat(slider.value) || 0;
      var maxV = currentMaxV();
      var clamped = Math.min(raw, maxV);
      state.targetV = clamped;
      syncSliderVisual(clamped);
      startLoop();
    });
  }

  if ('IntersectionObserver' in window) {
    var labIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        state.visible = entry.isIntersecting;
        if (state.visible) {
          startLoop();
          runFirstEntryNudge();
        } else if (state.rafId) {
          cancelAnimationFrame(state.rafId);
          state.rafId = null;
        }
      });
    }, { threshold: 0.12 });
    labIo.observe(sec);
  } else {
    state.visible = true;
    startLoop();
  }

  syncDrsLock();
  syncSliderVisual(state.targetV);
  updateDomReadouts(computeTargets());
  drawOverlay(computeTargets(), 0.016);
})();
