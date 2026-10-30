/* Newtonian two-body motion in G = M = R = 1 units.
 * The universal Kepler equation is solved afresh for each requested time:
 * no integration steps or accumulated integration drift. Reference:
 * Wisdom & Hernandez (2015), https://doi.org/10.1093/mnras/stv1862.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.OrbitPhysics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TAU = 2 * Math.PI;
  const norm = a => Math.hypot(a[0], a[1]);
  const scale = (a, k) => [a[0] * k, a[1] * k];

  // Stable Stumpff functions at and on both sides of the parabolic limit.
  function stumpff(z) {
    if (Math.abs(z) < 0.1) {
      let c = 0.5, s = 1 / 6, tc = c, ts = s;
      for (let k = 1; k < 12; k++) {
        tc *= -z / ((2 * k + 1) * (2 * k + 2));
        ts *= -z / ((2 * k + 2) * (2 * k + 3));
        c += tc; s += ts;
      }
      return [c, s];
    }
    if (z > 0) {
      const u = Math.sqrt(z);
      return [2 * Math.sin(u / 2) ** 2 / z, (u - Math.sin(u)) / (u * u * u)];
    }
    const u = Math.sqrt(-z);
    if (u > 700) return [Infinity, Infinity];
    return [2 * Math.sinh(u / 2) ** 2 / (-z), (Math.sinh(u) - u) / (u * u * u)];
  }

  // Time between the origin and r0 on a radial trajectory, on one branch.
  function radialFlightTime(r0, energy, mu) {
    const x = Math.max(-1, energy * r0 / mu);
    let integral;
    if (Math.abs(x) < 0.001) {
      integral = 2 / 3;
      let coefficient = 1;
      for (let n = 1; n < 12; n++) {
        coefficient *= -(2 * n - 1) * x / (2 * n);
        integral += coefficient / (n + 1.5);
      }
    } else if (x > 0) {
      const u = Math.sqrt(x);
      integral = Math.sqrt(1 + x) / x - Math.asinh(u) / (u * u * u);
    } else {
      const u = Math.sqrt(-x);
      integral = (Math.asin(u) - u * Math.sqrt(1 + x)) / (u * u * u);
    }
    return r0 ** 1.5 / Math.sqrt(2 * mu) * integral;
  }

  function createOrbit(input = {}) {
    const config = {
      massRatio: Number(input.massRatio ?? 0.01),
      r0: Number(input.r0 ?? 1),
      speed: Number(input.speed ?? 1),
      angleDeg: Number(input.angleDeg ?? 0)
    };
    if (!Object.values(config).every(Number.isFinite)) throw new RangeError('All initial values must be finite numbers.');
    if (config.massRatio < 0 || config.r0 <= 0 || config.speed < 0) {
      throw new RangeError('Mass ratio and speed must be non-negative, and separation must be positive.');
    }
    const {massRatio: q, r0, speed, angleDeg} = config;
    const mu = 1 + q, sqrtMu = Math.sqrt(mu);
    const angle = angleDeg * Math.PI / 180;
    let vx = speed * Math.sin(angle), vy = speed * Math.cos(angle);
    // Exact cardinal directions should remain exactly radial / tangential.
    if (Math.abs(vx) < 1e-14 * speed) vx = 0;
    if (Math.abs(vy) < 1e-14 * speed) vy = 0;
    const initialR = [r0, 0], initialV = [vx, vy];
    let energy = (vx * vx + vy * vy) / 2 - mu / r0;
    if (Math.abs(energy) <= 8 * Number.EPSILON * mu / r0) energy = 0;
    const h = r0 * vy;
    const radial = h === 0;
    const alpha = -2 * energy / mu;
    const eVec = [(vy * h - mu) / mu, -vx * h / mu];
    const e = norm(eVec);
    const p = h * h / mu;
    const a = energy === 0 ? null : -mu / (2 * energy);
    const period = energy < 0 && !radial ? TAU * Math.sqrt(a * a * a / mu) : null;
    const periapsis = radial ? 0 : p / (1 + e);
    const apoapsis = energy < 0 ? a * (1 + e) : null;
    const circularSpeed = Math.sqrt(mu / r0);
    const escapeSpeed = Math.SQRT2 * circularSpeed;
    const type = radial ? 'radial' : e < 1e-10 ? 'circle' : energy < 0 ? 'ellipse' : energy === 0 ? 'parabola' : 'hyperbola';
    let collisionTime = null;
    if (radial && (vx < 0 || energy < 0)) {
      const branchTime = radialFlightTime(r0, energy, mu);
      collisionTime = vx <= 0 ? branchTime : TAU * Math.sqrt(a * a * a / mu) - branchTime;
    }

    function universal(chi, target) {
      const z = alpha * chi * chi;
      const [c, s] = stumpff(z);
      if (!Number.isFinite(c) || !Number.isFinite(s)) return {f: Infinity, derivative: Infinity};
      const x2c = chi * chi * c;
      const x3s = chi * chi * chi * s;
      const f = r0 * vx / sqrtMu * x2c + (1 - alpha * r0) * x3s + r0 * chi - target;
      const derivative = r0 * vx / sqrtMu * chi * (1 - z * s) + (1 - alpha * r0) * x2c + r0;
      return {f, derivative, c, s};
    }

    function solveChi(dt) {
      const target = sqrtMu * dt;
      let low = 0, high = Math.sqrt(r0);
      for (let i = 0; universal(high, target).f < 0; i++) {
        if (i > 100) throw new RangeError('Time is outside the supported calculation range.');
        high *= 2;
      }
      let x = Math.min(high, target / r0);
      if (x === high) x *= 0.5;
      for (let i = 0; i < 120; i++) {
        const result = universal(x, target);
        if (Math.abs(result.f) <= 4 * Number.EPSILON * Math.max(target, r0 * x, 1e-12)) return x;
        if (result.f > 0) high = x; else low = x;
        if (high - low <= 4 * Number.EPSILON * Math.max(high, 1e-10)) return (low + high) / 2;
        const proposed = x - result.f / result.derivative;
        x = Number.isFinite(proposed) && proposed > low && proposed < high ? proposed : (low + high) / 2;
      }
      return (low + high) / 2;
    }

    function sample(time) {
      if (!Number.isFinite(time) || time < 0) throw new RangeError('Time must be a finite, non-negative number.');
      if (collisionTime !== null && time >= collisionTime) {
        return {r: [0, 0], v: null, distance: 0, speed: null, collision: true, t: collisionTime};
      }
      const dt = period ? time % period : time;
      if (dt === 0) return {r: initialR.slice(), v: initialV.slice(), distance: r0, speed, collision: false, t: time};
      const chi = solveChi(dt), [c, s] = stumpff(alpha * chi * chi);
      const x2c = chi * chi * c, x3s = chi * chi * chi * s;
      const f = 1 - x2c / r0;
      const g = dt - x3s / sqrtMu;
      const r = [f * r0 + g * vx, g * vy];
      const distance = norm(r);
      // Differentiate r(chi), then resolve the velocity into radial and
      // tangential components. This avoids cancellation in the f/g
      // derivatives when an escaping body is far from its initial position.
      const z = alpha * chi * chi;
      const radialSpeed = (r0 * vx * (1 - z * c) +
        sqrtMu * (1 - alpha * r0) * chi * (1 - z * s)) / distance;
      const tangentSpeed = h / distance;
      const ux = r[0] / distance, uy = r[1] / distance;
      const v = [radialSpeed * ux - tangentSpeed * uy,
        radialSpeed * uy + tangentSpeed * ux];
      return {r, v, distance, speed: norm(v), collision: false, t: time};
    }

    function bodies(time) {
      const relative = sample(time);
      return {
        primary: {r: scale(relative.r, -q / (1 + q)), v: relative.v && scale(relative.v, -q / (1 + q))},
        secondary: {r: scale(relative.r, 1 / (1 + q)), v: relative.v && scale(relative.v, 1 / (1 + q))},
        relative
      };
    }

    function path({extent = 12 * r0, samples = 720} = {}) {
      if (!(extent > 0) || !Number.isFinite(extent)) throw new RangeError('The plot extent must be positive and finite.');
      const count = Math.max(24, Math.min(10000, Math.round(samples) || 720));
      if (radial) {
        const end = Math.min(extent, apoapsis ?? extent);
        return Array.from({length: count + 1}, (_, i) => [end * i / count, 0]);
      }
      if (extent < periapsis) return [];
      const axis = e > 1e-12 ? [eVec[0] / e, eVec[1] / e] : [1, 0];
      const side = [-axis[1], axis[0]];
      if (energy < 0) {
        // Eccentric anomaly avoids dividing by 1 - e at apoapsis. In a
        // nearly radial ellipse e can round to 1 while both apsides remain
        // well determined. Half angles also avoid cancellation near periapsis.
        const limit = extent < apoapsis ? 2 * Math.asin(Math.sqrt(
          Math.max(0, Math.min(1, (extent - periapsis) / (apoapsis - periapsis))))) : Math.PI;
        const semiMinor = Math.sqrt(a * p);
        return Array.from({length: count + 1}, (_, i) => {
          const anomaly = -limit + 2 * limit * i / count;
          const x = periapsis * Math.cos(anomaly / 2) ** 2 - apoapsis * Math.sin(anomaly / 2) ** 2;
          const y = semiMinor * Math.sin(anomaly);
          return [axis[0] * x + side[0] * y, axis[1] * x + side[1] * y];
        });
      }
      const limit = Math.acos(Math.max(-1, Math.min(1, (p / extent - 1) / e)));
      const result = [];
      for (let i = 0; i <= count; i++) {
        const phi = -limit + 2 * limit * i / count;
        const radius = p / (1 + e * Math.cos(phi));
        const x = radius * Math.cos(phi), y = radius * Math.sin(phi);
        result.push([axis[0] * x + side[0] * y, axis[1] * x + side[1] * y]);
      }
      return result;
    }

    return Object.freeze({config: Object.freeze(config), mu, energy, h, eVec, A: scale(eVec, mu), e, p, a,
      period, periapsis, apoapsis, circularSpeed, escapeSpeed, type, collisionTime,
      initialR, initialV, sample, bodies, path});
  }
  return Object.freeze({createOrbit});
});
