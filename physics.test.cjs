'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {createOrbit} = require('./physics.js');
function close(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} ≠ ${expected}`);
}
function conserved(orbit, t, tolerance = 3e-10) {
  const {r, v, collision} = orbit.sample(t);
  assert.equal(collision, false);
  assert.ok([...r, ...v].every(Number.isFinite));
  close((v[0] ** 2 + v[1] ** 2) / 2 - orbit.mu / Math.hypot(...r), orbit.energy, tolerance);
  const h = r[0] * v[1] - r[1] * v[0];
  close(h, orbit.h, tolerance);
  close((v[1] * h - orbit.mu * r[0] / Math.hypot(...r)) / orbit.mu, orbit.eVec[0], tolerance);
  close((-v[0] * h - orbit.mu * r[1] / Math.hypot(...r)) / orbit.mu, orbit.eVec[1], tolerance);
}

test('circular motion and full period, including equal masses', () => {
  for (const massRatio of [0, .01, 1, 5]) {
    const r0 = 1.7, mu = 1 + massRatio;
    const orbit = createOrbit({massRatio, r0, speed: Math.sqrt(mu / r0), angleDeg: 0});
    assert.equal(orbit.type, 'circle');
    const quarter = orbit.sample(orbit.period / 4);
    close(quarter.r[0], 0); close(quarter.r[1], r0);
    close(orbit.sample(orbit.period).r[0], r0);
    close(orbit.sample(orbit.period * 10000 + orbit.period / 4).r[1], r0, 1e-8);
    conserved(orbit, orbit.period * .373);
  }
});

test('bound orbits conserve energy, h and the LRL vector over repeated periods', () => {
  for (const angleDeg of [-60, -25, 0, 40, 75]) {
    const orbit = createOrbit({massRatio: .4, r0: 2.2, speed: .6, angleDeg});
    assert.equal(orbit.type, 'ellipse');
    for (const phase of [.01, .2, .49, .8, 1.27, 30.37]) conserved(orbit, phase * orbit.period);
    close(orbit.sample(orbit.period).r[0], 2.2);
    close(orbit.a, -orbit.mu / (2 * orbit.energy));
  }
});

test('parabolic Barker solution is reproduced with no singular orbital elements', () => {
  const orbit = createOrbit({massRatio: 0, r0: 1, speed: Math.SQRT2, angleDeg: 0});
  assert.equal(orbit.type, 'parabola');
  assert.equal(orbit.a, null); assert.equal(orbit.period, null);
  for (const d of [.1, 1, 4, 30]) {
    const time = Math.SQRT2 * (d + d ** 3 / 3);
    const state = orbit.sample(time);
    close(state.r[0], 1 - d * d, 2e-10); close(state.r[1], 2 * d, 2e-10);
    conserved(orbit, time);
  }
});

test('hyperbolas and both near-parabolic limits remain finite and conserve invariants', () => {
  for (const factor of [1 - 1e-7, 1 + 1e-7, 1.1, 1.8]) {
    const orbit = createOrbit({massRatio: .2, r0: .75, speed: factor * Math.sqrt(2 * 1.2 / .75), angleDeg: -25});
    for (const time of [.001, .1, 1, 10, 1000]) conserved(orbit, time, 3e-8);
  }
});

test('changing mass affects relative motion and moves both bodies about the barycentre', () => {
  const small = createOrbit({massRatio: 0, r0: 1, speed: 1.5});
  const equal = createOrbit({massRatio: 1, r0: 1, speed: 1.5});
  assert.equal(small.type, 'hyperbola'); assert.equal(equal.type, 'ellipse');
  for (const massRatio of [0, .03, 1, 5]) {
    const orbit = createOrbit({massRatio, r0: 1, speed: 1.2});
    const state = orbit.bodies(.4);
    for (let i = 0; i < 2; i++) {
      close(state.primary.r[i] + massRatio * state.secondary.r[i], 0);
      close(state.primary.v[i] + massRatio * state.secondary.v[i], 0);
      close(state.secondary.r[i] - state.primary.r[i], state.relative.r[i]);
    }
  }
});

test('radial free fall stops at the analytic collision time and never crosses the origin', () => {
  const orbit = createOrbit({massRatio: 0, r0: 1, speed: 0});
  assert.equal(orbit.type, 'radial');
  close(orbit.collisionTime, Math.PI / (2 * Math.SQRT2));
  for (const f of [.1, .5, .9, .999]) {
    assert.ok(orbit.sample(f * orbit.collisionTime).r[0] > 0);
    conserved(orbit, f * orbit.collisionTime, 1e-8);
  }
  assert.equal(orbit.sample(orbit.collisionTime).collision, true);
  assert.equal(orbit.sample(orbit.collisionTime * 2).v, null);
});

test('outward bound radial motion turns back; unbound radial motion escapes', () => {
  const bound = createOrbit({massRatio: 0, r0: 1, speed: .8, angleDeg: 90});
  assert.equal(bound.type, 'radial'); assert.ok(bound.collisionTime > 1);
  assert.ok(bound.sample(.1).r[0] > 1);
  assert.ok(bound.sample(bound.collisionTime * .95).v[0] < 0);
  for (const speed of [Math.SQRT2, 2]) {
    const outgoing = createOrbit({massRatio: 0, r0: 1, speed, angleDeg: 90});
    assert.equal(outgoing.collisionTime, null);
    conserved(outgoing, 10);
    const incoming = createOrbit({massRatio: 0, r0: 1, speed, angleDeg: -90});
    assert.ok(incoming.collisionTime > 0);
    conserved(incoming, .9 * incoming.collisionTime, 1e-8);
    assert.equal(incoming.sample(incoming.collisionTime).collision, true);
  }
});

test('predicted paths satisfy the conic equation and clipping radius', () => {
  for (const speed of [.6, 1, Math.SQRT2, 2]) {
    const orbit = createOrbit({massRatio: 0, r0: 1, speed, angleDeg: 20});
    const points = orbit.path({extent: 4, samples: 100});
    assert.equal(points.length, 101);
    for (const r of points) {
      const length = Math.hypot(...r);
      assert.ok(length <= 4 + 1e-10);
      close(orbit.eVec[0] * r[0] + orbit.eVec[1] * r[1], orbit.p - length);
    }
  }
});

test('nearly radial ellipses retain finite paths and both apsides', () => {
  for (const speed of [1e-5, 1e-6]) {
    for (const angleDeg of [-89, 89]) {
      const orbit = createOrbit({massRatio: 5, r0: .25, speed, angleDeg});
      assert.equal(orbit.type, 'ellipse');
      const points = orbit.path({extent: 1.5, samples: 1100});
      assert.equal(points.length, 1101);
      assert.ok(points.every(r => r.every(Number.isFinite)));
      close(Math.hypot(...points[0]) / orbit.apoapsis, 1, 1e-12);
      close(Math.hypot(...points.at(-1)) / orbit.apoapsis, 1, 1e-12);
      close(Math.hypot(...points[550]) / orbit.periapsis, 1, 1e-12);
      for (const r of points) assert.ok(Math.hypot(...r) <= orbit.apoapsis * (1 + 1e-12));
    }
  }
});

test('elliptic paths clip correctly for nearly radial and near-parabolic orbits', () => {
  for (const speed of [1e-6, .6, Math.SQRT2 * (1 - 1e-7)]) {
    const orbit = createOrbit({massRatio: 0, r0: 1, speed, angleDeg: 20});
    const extent = Math.min(4, (orbit.periapsis + orbit.apoapsis) / 2);
    const points = orbit.path({extent, samples: 100});
    assert.equal(points.length, 101);
    assert.ok(points.every(r => r.every(Number.isFinite)));
    close(Math.hypot(...points[0]) / extent, 1, 1e-12);
    close(Math.hypot(...points.at(-1)) / extent, 1, 1e-12);
    for (const r of points) assert.ok(Math.hypot(...r) <= extent * (1 + 1e-12));
    assert.deepEqual(orbit.path({extent: orbit.periapsis / 2}), []);
  }
});

test('invalid physical inputs and invalid times are rejected', () => {
  for (const input of [{r0: 0}, {speed: -1}, {massRatio: -1}, {angleDeg: NaN}]) {
    assert.throws(() => createOrbit(input), RangeError);
  }
  const orbit = createOrbit();
  for (const time of [-1, Infinity, NaN]) assert.throws(() => orbit.sample(time), RangeError);
});

test('the full control range remains stable at long elapsed times', () => {
  for (const massRatio of [0, .01, 1, 5]) {
    for (const r0 of [.25, 1, 4]) {
      for (const speed of [.1, .5, 1, 4, 10]) {
        for (const angleDeg of [-85, -45, 0, 45, 85]) {
          const orbit = createOrbit({massRatio, r0, speed, angleDeg});
          for (const time of [.001, .1, 1, 100, 10000]) conserved(orbit, time, 2e-8);
        }
      }
    }
  }
});
