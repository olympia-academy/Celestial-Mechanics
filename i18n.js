(function (root) {
  'use strict';
  // Shared by the hosted app and both offline editions. Only these trusted
  // catalogue strings may contain markup; dynamic values are rendered as text.
  const messages = {
    pageTitle: ['Celestial Mechanics · A two-body laboratory', 'Himmelmekanikk · Et laboratorium for to legemer'],
    title: ['Celestial Mechanics', 'Himmelmekanikk'],
    eyebrow: ['A TWO-BODY LABORATORY', 'ET LABORATORIUM FOR TO LEGEMER'],
    intro: ['Explore the motion of two gravitating bodies.', 'Utforsk bevegelsen til to legemer som tiltrekker hverandre.'],
    language: ['Language', 'Språk'],
    controlsLabel: ['Initial conditions and view settings', 'Startbetingelser og visningsvalg'],
    startOrbit: ['Start with an orbit', 'Velg en bane'],
    presetsLabel: ['Orbit presets', 'Forhåndsvalgte baner'],
    circle: ['Circle', 'Sirkel'], ellipse: ['Ellipse', 'Ellipse'],
    parabola: ['Parabola', 'Parabel'], hyperbola: ['Hyperbola', 'Hyperbel'],
    radial: ['Radial motion', 'Radiell bevegelse'], binary: ['Two equal masses', 'To like masser'],
    initialConditions: ['Initial conditions', 'Startbetingelser'],
    changesReset: ['Changes reset', 'Endringer starter på nytt'],
    massRatio: ['Mass ratio <span class="math">m / M</span>', 'Masseforhold <span class="math">m / M</span>'],
    testParticle: ['Test particle', 'Testpartikkel'], exactValue: ['Exact value', 'Nøyaktig verdi'],
    distance: ['Initial separation <span class="math">r₀</span>', 'Startavstand <span class="math">r₀</span>'],
    speed: ['Relative initial speed <span class="math">v₀</span>', 'Relativ startfart <span class="math">v₀</span>'],
    circularSpeed: ['Circular speed', 'Sirkelhastighet'], escapeSpeed: ['Escape speed', 'Unnslippingsfart'],
    angle: ['Angle from the tangent', 'Vinkel fra tangenten'],
    inward: ['−90° inward', '−90° innover'], tangent: ['0° tangent', '0° tangent'], outward: ['+90° outward', '+90° utover'],
    view: ['View', 'Visning'], referenceFrame: ['Reference frame', 'Referansesystem'],
    barycentric: ['Centre of mass', 'Massesenter'], primary: ['Follow the central body M', 'Følg sentrallegemet M'], relative: ['Relative orbit', 'Relativ bane'],
    showTrails: ['Show orbital trails', 'Vis banespor'], showVectors: ['Show velocity and A-vectors', 'Vis hastighetsvektorer og A-vektor'],
    showApsides: ['Show nearest and farthest points', 'Vis nærmeste og fjerneste punkt'], zoom: ['Zoom', 'Zoom'],
    simulationLabel: ['Animated planetary orbit', 'Animert planetbane'], time: ['Time', 'Tid'],
    canvasFallback: ['Your browser must support canvas to display the animation. Orbital properties are listed below.', 'Nettleseren må støtte canvas for å vise animasjonen. Baneegenskapene er oppgitt nedenfor.'],
    legend: ['Legend', 'Tegnforklaring'], centralBody: ['Central body M', 'Sentrallegeme M'], body: ['Body m', 'Legeme m'],
    play: ['Play', 'Spill av'], pause: ['Pause', 'Pause'], reset: ['Reset', 'Start på nytt'], fit: ['Fit orbit', 'Tilpass bane'], playbackSpeed: ['Speed', 'Tempo'],
    propertiesLabel: ['Orbital properties', 'Baneegenskaper'], morePropertiesLabel: ['More orbital properties', 'Flere baneegenskaper'],
    eccentricity: ['Eccentricity <span class="math">e</span>', 'Eksentrisitet <span class="math">e</span>'],
    eccentricityHint: ['0: circle · 1: parabola', '0: sirkel · 1: parabel'],
    energy: ['Specific energy <span class="math">ε</span>', 'Spesifikk energi <span class="math">ε</span>'],
    energyHint: ['Negative energy gives a bound orbit', 'Negativ energi gir en bundet bane'],
    period: ['Orbital period <span class="math">T</span>', 'Omløpstid <span class="math">T</span>'],
    periodHint: ["In the model's time unit", 'I modellens tidsenhet'],
    minDistance: ['Minimum separation', 'Minste avstand'], maxDistance: ['Maximum separation', 'Største avstand'],
    momentum: ['Angular momentum <span class="math">h</span>', 'Dreieimpuls <span class="math">h</span>'],
    initialCircular: ['Initial circular speed', 'Sirkelhastighet ved start'], initialEscape: ['Initial escape speed', 'Unnslippingsfart ved start'],
    model: ['Model and units', 'Modell og enheter'],
    modelGravity: [
      'The simulation uses Newtonian gravity for two point masses. The mass ratio is <span class="math">q = m/M</span>. When the masses are comparable, both move noticeably around their common centre of mass. The value <span class="math">q = 0</span> is the test-particle limit.',
      'Simuleringen bruker Newtons gravitasjonslov for to punktmasser. Masseforholdet er <span class="math">q = m/M</span>. Når massene er sammenlignbare, beveger begge seg tydelig rundt det felles massesenteret. Verdien <span class="math">q = 0</span> er testpartikkelgrensen.'
    ],
    modelUnits: [
      'The units are chosen so that <span class="math">G = M = R = 1</span>. Separations are measured in <span class="math">R</span>, speed in <span class="math">√(GM/R)</span> and time in <span class="math">√(R³/GM)</span>. In these units, the gravitational parameter for relative motion is <span class="math">μ = 1 + q</span>, corresponding to <span class="math">G(M + m)</span>.',
      'Enhetene er valgt slik at <span class="math">G = M = R = 1</span>. Avstander måles i <span class="math">R</span>, fart i <span class="math">√(GM/R)</span> og tid i <span class="math">√(R³/GM)</span>. I disse enhetene er gravitasjonsparameteren for relativ bevegelse <span class="math">μ = 1 + q</span>, som svarer til <span class="math">G(M + m)</span>.'
    ],
    modelRelative: [
      'The initial speed is the speed of <span class="math">m</span> relative to <span class="math">M</span>. Energy and angular momentum are given per unit of reduced mass, in units of <span class="math">GM/R</span> and <span class="math">√(GMR)</span>. Following the central body changes the view; the calculation still includes both bodies.',
      'Startfarten er farten til <span class="math">m</span> relativt til <span class="math">M</span>. Energi og dreieimpuls oppgis per enhet redusert masse, i enhetene <span class="math">GM/R</span> og <span class="math">√(GMR)</span>. Når visningen følger sentrallegemet, inngår fortsatt begge legemene i beregningen.'
    ],
    modelMarkers: [
      'The markers are sized for visibility and are not to scale. The model has no physical surfaces or collision radii. Changing an initial condition restarts the simulation with the new value.',
      'Markørene er gjort store nok til å være synlige og viser ikke fysiske størrelser. Modellen har ingen overflater eller kollisjonsradier. Når en startbetingelse endres, starter simuleringen på nytt med den nye verdien.'
    ],
    modelPath: [
      "The dashed line shows the predicted orbit, while the solid trail shows the motion so far. Open and very elongated orbits may extend beyond the view. Select “Fit orbit” to include the bodies' current positions.",
      'Den stiplede linjen viser den beregnede banen, mens det heltrukne sporet viser bevegelsen så langt. Åpne og svært langstrakte baner kan strekke seg utenfor bildet. Velg «Tilpass bane» for å ta med legemenes nåværende posisjoner.'
    ],
    footerPhysics: ['Newtonian gravity · Two bodies · One orbital plane', 'Newtons gravitasjon · To legemer · Ett baneplan'],
    footerHistory: ["From Kepler's planetary orbits to the hydrogen atom", 'Fra Keplers planetbaner til hydrogenatomet'],
    circleDescription: ['Constant separation', 'Konstant avstand'], ellipseDescription: ['Bound motion', 'Bundet bevegelse'],
    parabolaDescription: ['At the escape threshold', 'På grensen til å unnslippe'], hyperbolaDescription: ['Unbound motion', 'Ubundet bevegelse'],
    collisionDescription: ['Motion ending in a collision', 'Bevegelse som ender i kollisjon'], radialDescription: ['Motion along a straight line', 'Bevegelse langs en rett linje'],
    none: ['None', 'Ingen'], unbound: ['Unbound', 'Ubundet'],
    speedReference: ['{ratio} × local circular speed. Speed stays fixed when the mass changes.', '{ratio} × lokal sirkelhastighet. Farten beholdes når massen endres.'],
    massTest: ['Test-particle limit: M remains at the centre of mass while the particle moves in its gravitational field.', 'Testpartikkelgrensen: M blir i massesenteret mens partikkelen beveger seg i gravitasjonsfeltet.'],
    massDescription: ['M is {percent}% of the separation from the centre of mass. Both bodies move.', 'Avstanden fra M til massesenteret er {percent} % av avstanden mellom legemene. Begge beveger seg.'],
    aRadial: ['Angular momentum is zero. Radial motion is a degenerate case, even though e = 1.', 'Dreieimpulsen er null. Radiell bevegelse er et degenerert tilfelle, selv om e = 1.'],
    aCircle: ['A = 0: A circle has no unique periapsis direction.', 'A = 0: En sirkel har ingen entydig retning mot periapsis.'],
    aDescription: ['A/μ = e = {e}. A points towards periapsis of the relative orbit. Arrow lengths are scaled to fit the view.', 'A/μ = e = {e}. A peker mot periapsis i den relative banen. Pilenes lengder er tilpasset visningen.'],
    canvasDescription: ['{orbit}. Mass ratio {q}, eccentricity {e}, energy {energy}. Use the controls to adjust the initial conditions.', '{orbit}. Masseforhold {q}, eksentrisitet {e}, energi {energy}. Bruk kontrollene til å endre startbetingelsene.'],
    changed: ['{orbit}. Eccentricity {e}.', '{orbit}. Eksentrisitet {e}.'],
    initialError: ['Could not calculate the initial conditions. Check the values and try again.', 'Kunne ikke beregne startbetingelsene. Kontroller verdiene og prøv igjen.'],
    calculationError: ['Calculation stopped. Select Reset or change the initial conditions.', 'Beregningen stoppet. Velg Start på nytt eller endre startbetingelsene.'],
    resetAnnouncement: ['Returned to the initial state. Playback is paused.', 'Tilbake til starttilstanden. Avspillingen er satt på pause.'],
    fitAnnouncement: ['The view now includes the orbit and the current positions of both bodies.', 'Utsnittet viser nå banen og de nåværende posisjonene til begge legemene.'],
    periapsis: ['Periapsis', 'Periapsis'], apoapsis: ['Apoapsis', 'Apoapsis'],
    periShort: ['Peri', 'Peri'], apoShort: ['Apo', 'Apo'],
    outside: ['Outside the view · select Fit orbit', 'Utenfor bildet · velg Tilpass bane'],
    arrows: ['Arrows scaled for readability', 'Pillengder tilpasset lesbarheten'],
    collision: ["The point masses meet at r = 0. Newton's point-mass model is singular here; playback has stopped.", 'Punktmassene møtes ved r = 0. Newtons punktmassemodell er singulær her; avspillingen har stoppet.'],
    collisionAnnouncement: ['Radial collision. The simulation has stopped.', 'Radiell kollisjon. Simuleringen har stoppet.']
  };
  let language = 'en';
  function t(key, values) {
    if (!Object.hasOwn(messages, key)) throw new Error('Unknown translation key: ' + key);
    const text = messages[key][language === 'nb' ? 1 : 0];
    return values ? text.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match) : text;
  }
  function apply(nextLanguage) {
    language = nextLanguage === 'nb' ? 'nb' : 'en';
    document.documentElement.lang = language;
    document.title = t('pageTitle');
    document.querySelectorAll('[data-i18n]').forEach(element => { element.innerHTML = t(element.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(element => { element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel)); });
    document.getElementById('language-select').value = language;
  }
  const api = {t, apply, get language() { return language; }};
  root.OrbitI18n = api;
  const requested = new URLSearchParams(root.location.search).get('lang');
  apply(requested === 'nb' || requested === 'en' ? requested : document.documentElement.lang);
})(window);
