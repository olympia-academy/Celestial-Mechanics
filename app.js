(function () {
  'use strict';
  const $ = function (id) { return document.getElementById(id); };
  const canvas = $('orbit-canvas');
  const ctx = canvas.getContext('2d');
  const names = {circle: 'Circle', ellipse: 'Ellipse', parabola: 'Parabola', hyperbola: 'Hyperbola', radial: 'Radial motion'};
  const defaults = {massRatio: 0.05, r0: 1, speed: 1.2 * Math.sqrt(1.05), angleDeg: 0};
  const clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  const finite = function (v) { return typeof v === 'number' && Number.isFinite(v); };
  const storageKey = 'planetbaner-v1';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = {
    params: Object.assign({}, defaults), orbit: null, time: 0, running: !reducedMotion,
    timeScale: 1, zoom: 1, frame: 'barycentric', showTrails: true, showVectors: false,
    showApsides: false, preset: 'ellipse', path: [], trail: [], current: null,
    camera: {x: 0, y: 0, span: 4}, width: 800, height: 550, scale: 100,
    lastStamp: null, lastReadout: 0, dirty: true
  };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && saved.version === 1) {
      const p = saved.params || {};
      if (finite(p.massRatio)) state.params.massRatio = clamp(p.massRatio, 0, 5);
      if (finite(p.r0)) state.params.r0 = clamp(p.r0, 0.25, 4);
      if (finite(p.speed)) state.params.speed = clamp(p.speed, 0, 10);
      if (finite(p.angleDeg)) state.params.angleDeg = clamp(p.angleDeg, -90, 90);
      if (['barycentric', 'primary', 'relative'].includes(saved.frame)) state.frame = saved.frame;
      if (finite(saved.timeScale)) state.timeScale = clamp(saved.timeScale, 0.1, 4);
      state.showVectors = !!saved.showVectors;
      state.showApsides = !!saved.showApsides;
      state.preset = null;
    }
  } catch (_) { /* Private browsing can disable storage. */ }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        version: 1, params: state.params, frame: state.frame, timeScale: state.timeScale,
        showVectors: state.showVectors, showApsides: state.showApsides
      }));
    } catch (_) { /* The simulator also works without storage. */ }
  }
  function fmt(n, digits) {
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    if (!Number.isFinite(n)) return '∞';
    if (Math.abs(n) < 1e-12) n = 0;
    if (Math.abs(n) >= 100000 || (Math.abs(n) > 0 && Math.abs(n) < 0.0001)) {
      return n.toExponential(2).replace('e+', ' · 10^').replace('e-', ' · 10^−');
    }
    return new Intl.NumberFormat('en-GB', {useGrouping: false, maximumFractionDigits: digits === undefined ? 3 : digits}).format(n);
  }
  function announce(text) { $('live-status').textContent = text; }
  function message(text) {
    $('error-message').textContent = text || '';
    $('error-message').hidden = !text;
  }
  function updatePlayback() {
    $('play-button').textContent = state.running ? 'Pause' : 'Play';
    $('play-button').setAttribute('aria-pressed', String(state.running));
  }
  function pointsForFrame(r) {
    const q = state.params.massRatio;
    if (state.frame === 'barycentric') {
      return [[-q * r[0] / (1 + q), -q * r[1] / (1 + q)], [r[0] / (1 + q), r[1] / (1 + q)]];
    }
    return [[0, 0], r];
  }
  function fit(includeCurrent) {
    const distance = includeCurrent && state.current ? Math.hypot.apply(null, state.current.r) : 0;
    const extent = Math.max(6 * state.params.r0, distance * 1.25);
    state.path = state.orbit.path({extent: extent, samples: 1100});
    const all = [[0, 0]];
    state.path.forEach(function (r) { pointsForFrame(r).forEach(function (p) { all.push(p); }); });
    pointsForFrame(state.orbit.initialR).forEach(function (p) { all.push(p); });
    if (includeCurrent && state.current) pointsForFrame(state.current.r).forEach(function (p) { all.push(p); });
    let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
    all.forEach(function (p) {
      if (!finite(p[0]) || !finite(p[1])) return;
      xmin = Math.min(xmin, p[0]); xmax = Math.max(xmax, p[0]);
      ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]);
    });
    state.camera = {
      x: (xmin + xmax) / 2, y: (ymin + ymax) / 2,
      span: Math.max(ymax - ymin, (xmax - xmin) / Math.max(0.4, state.width / state.height), state.params.r0 * 0.65) * 1.3
    };
    state.zoom = 1;
    $('zoom').value = '1';
    $('zoom-value').textContent = '1.00×';
    state.dirty = true;
  }

  function updateControls() {
    const p = state.params, o = state.orbit;
    $('mass-ratio').max = p.massRatio > 2 ? '5' : '2';
    $('mass-ratio').value = p.massRatio;
    document.querySelector('.mass-field .range-endpoints span:last-child').textContent = p.massRatio > 2 ? '5 × M' : '2 × M';
    $('mass-ratio-number').value = Number(p.massRatio.toPrecision(8));
    $('mass-ratio-value').textContent = fmt(p.massRatio, 5) + ' × M';
    $('distance').value = p.r0;
    $('distance-value').textContent = fmt(p.r0, 2) + ' R';
    $('speed').max = String(Math.max(4, Math.ceil(p.speed)));
    $('speed').value = p.speed;
    $('speed-number').value = Number(p.speed.toPrecision(10));
    $('speed-value').textContent = fmt(p.speed, 4);
    $('angle').value = p.angleDeg;
    $('angle-value').textContent = (p.angleDeg > 0 ? '+' : '') + fmt(p.angleDeg, 1) + '°';
    $('reference-frame').value = state.frame;
    $('show-vectors').checked = state.showVectors;
    $('show-apsides').checked = state.showApsides;
    $('time-scale').value = state.timeScale;
    $('time-scale-value').textContent = fmt(state.timeScale, 1) + '×';
    $('orbit-type').textContent = names[o.type] || o.type;
    const descriptions = {
      circle: 'Constant separation', ellipse: 'Bound motion',
      parabola: 'At the escape threshold', hyperbola: 'Unbound motion',
      radial: o.collisionTime !== null && finite(o.collisionTime) ? 'Motion ending in a collision' : 'Motion along a straight line'
    };
    $('orbit-description').textContent = descriptions[o.type];
    $('eccentricity-value').textContent = fmt(o.e, Math.abs(o.e - 1) < 0.001 ? 8 : 4);
    $('energy-value').textContent = fmt(o.energy, 5);
    $('period-value').textContent = o.period ? fmt(o.period, 3) : 'None';
    $('periapsis-value').textContent = fmt(o.periapsis, 4) + ' R';
    $('apoapsis-value').textContent = o.apoapsis === null ? 'Unbound' : fmt(o.apoapsis, 4) + ' R';
    $('angular-momentum-value').textContent = fmt(o.h, 4);
    $('circular-speed-value').textContent = fmt(o.circularSpeed, 5);
    $('escape-speed-value').textContent = fmt(o.escapeSpeed, 5);
    $('speed-reference').textContent = fmt(p.speed / o.circularSpeed, 3) + ' × local circular speed. Speed stays fixed when the mass changes.';
    $('mass-description').textContent = p.massRatio === 0 ?
      'Test-particle limit: M remains at the centre of mass while the particle moves in its gravitational field.' :
      'M is ' + fmt(p.massRatio / (1 + p.massRatio) * 100, 2) + '% of the separation from the centre of mass. Both bodies move.';
    $('a-vector-description').textContent = o.type === 'radial' ?
      'Angular momentum is zero. Radial motion is a degenerate case, even though e = 1.' :
      o.type === 'circle' ? 'A = 0: A circle has no unique periapsis direction.' :
      'A/μ = e = ' + fmt(o.e, 5) + '. A points towards periapsis of the relative orbit. Arrow lengths are scaled to fit the view.';
    document.querySelectorAll('[data-preset]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.preset === state.preset));
    });
    const legend = document.querySelector('.scene-legend');
    legend.children[0].hidden = state.frame === 'relative';
    legend.children[2].hidden = state.frame === 'relative';
    canvas.setAttribute('aria-label', names[o.type] + '. Mass ratio ' + fmt(p.massRatio) +
      ', eccentricity ' + fmt(o.e, 5) + ', energy ' + fmt(o.energy, 5) + '. Use the controls to adjust the initial conditions.');
    updatePlayback();
  }

  function rebuild(announceChange) {
    try {
      const orbit = window.OrbitPhysics.createOrbit(state.params);
      state.orbit = orbit;
      state.time = 0; state.trail = []; state.lastStamp = null;
      state.current = orbit.sample(0);
      state.trail.push(state.current.r);
      message('');
      fit(false);
      updateControls();
      $('time-display').textContent = '0.00';
      if (announceChange) announce(names[orbit.type] + '. Eccentricity ' + fmt(orbit.e, 5) + '.');
      save();
    } catch (err) {
      state.running = false; updatePlayback();
      message('Could not calculate the initial conditions: ' + err.message);
    }
  }
  function changeParam(key, value) {
    if (!finite(value)) return;
    const limits = {massRatio: [0, 5], r0: [0.25, 4], speed: [0, 10], angleDeg: [-90, 90]};
    state.params[key] = clamp(value, limits[key][0], limits[key][1]);
    state.preset = null;
    rebuild(true);
  }
  [['mass-ratio', 'massRatio'], ['distance', 'r0'], ['speed', 'speed'], ['angle', 'angleDeg']].forEach(function (pair) {
    $(pair[0]).addEventListener('input', function (event) { changeParam(pair[1], Number(event.target.value)); });
  });
  [['mass-ratio-number', 'massRatio'], ['speed-number', 'speed']].forEach(function (pair) {
    $(pair[0]).addEventListener('change', function (event) {
      if (event.target.value.trim() === '' || !finite(event.target.valueAsNumber)) { updateControls(); return; }
      changeParam(pair[1], event.target.valueAsNumber);
    });
  });
  document.querySelectorAll('[data-preset]').forEach(function (button) {
    button.addEventListener('click', function () {
      const kind = button.dataset.preset;
      if (kind === 'binary') { state.params.massRatio = 1; state.params.r0 = 1.6; }
      const vc = Math.sqrt((1 + state.params.massRatio) / state.params.r0);
      const factors = {circle: 1, ellipse: 1.2, parabola: Math.SQRT2, hyperbola: 1.65, binary: 1.15};
      state.params.speed = vc * factors[kind];
      state.params.angleDeg = 0;
      state.preset = kind;
      rebuild(true);
    });
  });
  $('circular-button').addEventListener('click', function () {
    state.params.speed = state.orbit.circularSpeed; state.params.angleDeg = 0;
    state.preset = 'circle'; rebuild(true);
  });
  $('escape-button').addEventListener('click', function () {
    state.params.speed = state.orbit.escapeSpeed;
    state.preset = Math.abs(state.params.angleDeg) < 1e-10 ? 'parabola' : null;
    rebuild(true);
  });
  function togglePlay() {
    if (state.current && state.current.collision) { state.time = 0; state.trail = []; state.current = state.orbit.sample(0); message(''); }
    state.running = !state.running; state.lastStamp = null; state.dirty = true; updatePlayback();
  }
  $('play-button').addEventListener('click', togglePlay);
  $('reset-button').addEventListener('click', function () {
    state.running = false; rebuild(false); announce('Returned to the initial state. Playback is paused.');
  });
  $('fit-button').addEventListener('click', function () { fit(true); announce('The view now includes the orbit and the current positions of both bodies.'); });
  $('reference-frame').addEventListener('change', function (event) {
    state.frame = event.target.value; fit(true); updateControls(); save();
  });
  $('time-scale').addEventListener('input', function (event) {
    state.timeScale = Number(event.target.value); $('time-scale-value').textContent = fmt(state.timeScale, 1) + '×'; save();
  });
  $('zoom').addEventListener('input', function (event) {
    state.zoom = Number(event.target.value); $('zoom-value').textContent = fmt(state.zoom, 2) + '×'; state.dirty = true;
  });
  [['show-trails', 'showTrails'], ['show-vectors', 'showVectors'], ['show-apsides', 'showApsides']].forEach(function (pair) {
    $(pair[0]).addEventListener('change', function (event) { state[pair[1]] = event.target.checked; state.dirty = true; save(); });
  });
  document.addEventListener('keydown', function (event) {
    if (event.code === 'Space' && (event.target === document.body || event.target === canvas)) {
      event.preventDefault(); togglePlay();
    }
  });
  document.addEventListener('visibilitychange', function () { state.lastStamp = null; });

  function screen(p) {
    return [state.width / 2 + (p[0] - state.camera.x) * state.scale, state.height / 2 - (p[1] - state.camera.y) * state.scale + 10];
  }
  function line(points, color, width, dash) {
    if (points.length < 2) return;
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath();
    let begun = false;
    points.forEach(function (p) {
      const xy = screen(p);
      if (!finite(xy[0]) || !finite(xy[1])) { begun = false; return; }
      if (!begun) { ctx.moveTo(xy[0], xy[1]); begun = true; } else ctx.lineTo(xy[0], xy[1]);
    });
    ctx.stroke(); ctx.setLineDash([]);
  }
  function dot(p, radius, color, name) {
    const xy = screen(p);
    if (xy[0] < -30 || xy[0] > state.width + 30 || xy[1] < -30 || xy[1] > state.height + 30) return false;
    const glow = ctx.createRadialGradient(xy[0], xy[1], radius * 0.5, xy[0], xy[1], radius * 3.4);
    glow.addColorStop(0, color + '50'); glow.addColorStop(1, color + '00');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(xy[0], xy[1], radius * 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(xy[0], xy[1], radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e6edf1'; ctx.font = '12px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(name, Math.min(state.width - 25, xy[0] + radius + 7), Math.max(55, xy[1] - radius - 4));
    return true;
  }
  function cross(p, label) {
    const xy = screen(p);
    ctx.strokeStyle = '#8298a8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xy[0] - 5, xy[1]); ctx.lineTo(xy[0] + 5, xy[1]);
    ctx.moveTo(xy[0], xy[1] - 5); ctx.lineTo(xy[0], xy[1] + 5); ctx.stroke();
    if (label && state.width >= 500) {
      ctx.fillStyle = '#91a4b3'; ctx.font = '11px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(label, xy[0] + 8, xy[1] + 17);
    }
  }
  function arrow(start, vector, color, label, pixelLength) {
    const n = Math.hypot(vector[0], vector[1]);
    if (n < 1e-10) return;
    const a = screen(start);
    const len = pixelLength || Math.min(110, 28 + n * 30);
    const dx = vector[0] / n * len, dy = -vector[1] / n * len;
    const b = [a[0] + dx, a[1] + dy], theta = Math.atan2(dy, dx);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b[0], b[1]);
    ctx.lineTo(b[0] - 7 * Math.cos(theta - 0.45), b[1] - 7 * Math.sin(theta - 0.45));
    ctx.lineTo(b[0] - 7 * Math.cos(theta + 0.45), b[1] - 7 * Math.sin(theta + 0.45));
    ctx.closePath(); ctx.fill();
    ctx.font = 'italic 14px Georgia'; ctx.textAlign = 'left'; ctx.fillText(label, b[0] + 6, b[1] - 5);
  }
  function grid() {
    const span = state.height / state.scale;
    const rough = span / 6, mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const normalized = rough / mag, step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * mag;
    const xlo = state.camera.x - state.width / state.scale / 2;
    const xhi = state.camera.x + state.width / state.scale / 2;
    const ylo = state.camera.y - state.height / state.scale / 2;
    const yhi = state.camera.y + state.height / state.scale / 2;
    ctx.lineWidth = 0.7; ctx.strokeStyle = '#1e3040'; ctx.fillStyle = '#6e8799';
    ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    for (let x = Math.ceil(xlo / step) * step; x <= xhi && finite(x); x += step) {
      const sx = screen([x, 0])[0];
      ctx.beginPath(); ctx.moveTo(sx, 48); ctx.lineTo(sx, state.height - 30); ctx.stroke();
      if (sx > 30 && sx < state.width - 35) ctx.fillText(fmt(x, 2), sx, state.height - 15);
    }
    for (let y = Math.ceil(ylo / step) * step; y <= yhi && finite(y); y += step) {
      const sy = screen([0, y])[1];
      if (sy < 52 || sy > state.height - 40) continue;
      ctx.beginPath(); ctx.moveTo(24, sy); ctx.lineTo(state.width - 20, sy); ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillText(fmt(y, 2), 7, sy - 5);
    }
    ctx.fillStyle = '#9aabb7'; ctx.textAlign = 'right'; ctx.fillText('x / R', state.width - 12, state.height - 15);
    ctx.textAlign = 'left'; ctx.fillText('y / R', 8, 64);
  }
  function draw() {
    if (!state.orbit || !state.current) return;
    state.scale = (state.height - 95) / state.camera.span * state.zoom;
    ctx.clearRect(0, 0, state.width, state.height);
    grid();
    const q = state.params.massRatio;
    const c1 = state.frame === 'barycentric' ? -q / (1 + q) : 0;
    const c2 = state.frame === 'barycentric' ? 1 / (1 + q) : 1;
    const scaled = function (points, k) { return points.map(function (r) { return [r[0] * k, r[1] * k]; }); };
    ctx.save(); ctx.beginPath(); ctx.rect(0, 44, state.width, state.height - 76); ctx.clip();
    if (c1 !== 0) line(scaled(state.path, c1), '#edbd6c66', 1.15, [4, 5]);
    line(scaled(state.path, c2), '#83d2dc77', 1.15, [4, 5]);
    if (state.showTrails) {
      if (c1 !== 0) line(scaled(state.trail, c1), '#edbd6c', 2);
      line(scaled(state.trail, c2), '#83d2dc', 2.2);
    }
    if (state.showApsides && state.orbit.type !== 'circle' && state.orbit.type !== 'radial') {
      const e = state.orbit.e, u = state.orbit.eVec.map(function (n) { return n / e; });
      function apsis(r, name, sign) {
        if (!finite(r)) return;
        const p = [c2 * u[0] * r * sign, c2 * u[1] * r * sign], xy = screen(p);
        if (xy[0] < 30 || xy[0] > state.width - 90 || xy[1] < 70 || xy[1] > state.height - 55) return;
        ctx.strokeStyle = '#a3b6bf'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(xy[0], xy[1], 4, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#b7c5ce'; ctx.font = '11px system-ui'; ctx.textAlign = 'left';
        ctx.fillText(state.width < 500 ? (sign === 1 ? 'Peri' : 'Apo') : name, xy[0] + 8, xy[1] + 22);
      }
      apsis(state.orbit.periapsis, 'Periapsis', 1);
      apsis(state.orbit.apoapsis, 'Apoapsis', -1);
    }
    const r = state.current.r, positions = pointsForFrame(r);
    if (state.frame === 'barycentric') cross([0, 0], q > 0.03 ? 'Centre of mass' : '');
    else if (state.frame === 'primary') cross([q / (1 + q) * r[0], q / (1 + q) * r[1]], 'Centre of mass');
    else cross([0, 0], 'r = 0');
    const primaryVisible = state.frame !== 'relative' ? dot(positions[0], 10, '#edbd6c', 'M') : true;
    const secondaryRadius = state.frame === 'relative' ? 5 : q === 0 ? 4 : clamp(10 * Math.cbrt(q), 4.5, 16);
    const secondaryVisible = dot(positions[1], secondaryRadius, '#83d2dc', state.frame === 'relative' ? 'r' : 'm');
    if (state.showVectors && state.current.v) {
      const v = state.current.v;
      if (c1 !== 0) arrow(positions[0], [c1 * v[0], c1 * v[1]], '#e9c996', 'vM');
      arrow(positions[1], [c2 * v[0], c2 * v[1]], '#a5e5ed', state.frame === 'barycentric' ? 'vm' : 'vrel');
      if (state.orbit.e > 1e-8) arrow(positions[0], state.orbit.eVec, '#c6b4ed', 'A', Math.min(100, 35 + state.orbit.e * 40));
    }
    ctx.restore();
    ctx.font = '11px system-ui'; ctx.fillStyle = '#9aabb7'; ctx.textAlign = 'right';
    if (!secondaryVisible || !primaryVisible) ctx.fillText('Outside the view · select Fit orbit', state.width - 16, 58);
    else if (state.showVectors) ctx.fillText('Arrows scaled for readability', state.width - 16, state.height - 35);
    state.dirty = false;
  }
  function resize() {
    const box = $('scene').getBoundingClientRect();
    state.width = Math.max(1, box.width); state.height = Math.max(1, box.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(state.width * dpr); canvas.height = Math.round(state.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state.orbit) fit(true);
    state.dirty = true;
  }
  new ResizeObserver(resize).observe($('scene'));
  function tick(stamp) {
    const elapsed = state.lastStamp === null ? 0 : Math.min((stamp - state.lastStamp) / 1000, 0.06);
    state.lastStamp = stamp;
    if (state.running && !document.hidden && state.orbit && elapsed > 0) {
      const target = state.time + elapsed * state.timeScale;
      const steps = Math.max(1, Math.ceil(elapsed * state.timeScale / 0.018));
      try {
        for (let i = 1; i <= steps; i++) {
          const t = state.time + (target - state.time) * i / steps;
          const result = state.orbit.sample(t);
          state.current = result;
          state.trail.push(result.r);
          if (result.collision) {
            state.running = false;
            state.time = finite(state.orbit.collisionTime) ? state.orbit.collisionTime : t;
            message('The point masses meet at r = 0. Newton\'s point-mass model is singular here; playback has stopped.');
            announce('Radial collision. The simulation has stopped.'); updatePlayback();
            break;
          }
        }
        if (state.running) state.time = target;
        if (state.trail.length > 1500) state.trail.splice(0, state.trail.length - 1500);
      } catch (err) {
        state.running = false; updatePlayback();
        message('Calculation stopped: ' + err.message + '. Select Reset or change the initial conditions.');
      }
      state.dirty = true;
    }
    if (stamp - state.lastReadout > 120) {
      $('time-display').textContent = fmt(state.time, 2);
      state.lastReadout = stamp;
    }
    if (state.dirty) draw();
    requestAnimationFrame(tick);
  }
  resize(); rebuild(false); requestAnimationFrame(tick);
})();
