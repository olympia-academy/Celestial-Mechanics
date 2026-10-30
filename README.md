# Himmelmekanikk

En interaktiv simulator for Newtons tolegemeproblem. Juster masser og
startbetingelser, og utforsk sirkelbaner, ellipser, parabler og hyperbler.
Appen bruker ingen nettjenester, eksterne skrifter eller npm-avhengigheter.

**[Åpne simulatoren](https://dagvidb.github.io/Himmelmekanikk/)**

## Åpne appen

Simulatoren kan brukes via lenken over eller lastes ned for bruk uten nett:

1. Åpne [output/himmelmekanikk.html](output/himmelmekanikk.html) på GitHub og velg
   **Download raw file** i verktøylinjen over filen. Alternativt: velg
   **Code → Download ZIP** på repositoryets forside og pakk ut ZIP-filen.
2. Åpne den nedlastede `himmelmekanikk.html` i en nettleser.

Denne ene filen inneholder hele appen og kan deles videre. Den krever
ingen installasjon, server eller nettilgang, og er laget for moderne
nettlesere på Windows, macOS og Linux. GitHubs vanlige filvisning viser
kildekoden; bruk simulatorlenken eller last ned filen for å kjøre appen.

## Utvikling

Installer Node.js 20 eller nyere for å bygge appen og kjøre tester.
Ingen `npm install` er nødvendig for appen eller fysikktestene.

```sh
npm start       # Lokal utviklingsserver på http://127.0.0.1:4173
npm test        # Fysikktester
npm run build   # Oppdater output/himmelmekanikk.html etter kildeendringer
```

Utviklingsserveren lytter bare lokalt. GitHub Pages viser `index.html`
med de tilhørende JavaScript- og CSS-filene.

## Kontroller

- Masseforholdet q = m/M: fra testpartikkelgrensen til m = 5 M.
- Startavstand, relativ startfart og vinkel fra tangenten.
- Forhåndsvalg for sirkel, ellipse, parabel, hyperbel og to like masser.
- Pause, start på nytt, tempo, zoom og tilpasning av utsnittet.
- Felles massesenter, visning som følger M, eller den relative banen.
- Banespor, hastighetsvektorer, Runge-Lenz-vektor og apsider.

Fysiske parameterendringer setter tiden tilbake til null. Farten beholdes
når massen endres; dermed kan den nye massen endre banetype. Forhåndsvalg
beregner farten på nytt med den gjeldende totale massen. Knappen
«Sirkelhastighet» velger også tangentiell retning. Knappen
«Unnslippingsfart» beholder den valgte retningen.

## Fysikk og enheter

Enhetene er G = M = R = 1. Fart måles i sqrt(GM/R), tid i
sqrt(R^3/GM). Den relative posisjonen r = r_m - r_M oppfyller
r'' = -(1+q) r/|r|^3. I massesentersystemet er
r_M = -q r/(1+q) og r_m = r/(1+q).

Energien epsilon = v^2/2 - mu/r og dreieimpulsen h = r × v er
oppgitt per redusert masse; ved q = 0 brukes testpartikkelgrensen.
A = v × h - mu rhat og e = |A|/mu. Retning 0 grader gir en
tangentiell hastighet mot klokken; positive vinkler gir utoverrettet
radialkomponent. Alle startposisjoner er (r0,0).

Motoren løser den universelle Kepler-ligningen for hvert tidspunkt,
med stabile Stumpff-funksjoner ved parabelgrensen. Den bruker ikke
Euler-integrasjon og akkumulerer derfor ikke integrasjonsdrift.
Flyttall og den numeriske rotløsningen gir likevel endelig presisjon.
Ved radielt innfall stopper modellen ved den analytiske kollisjonstiden:
punktmassepotensialet er singulært ved r = 0.

Legemene er punktmasser. Markørene angir identitet og omtrentlig
masseforhold, ikke fysiske radier. Ingen tidevann, andre legemer,
relativitet eller stråling er inkludert. Den stiplede kurven er den
beregnede banen; en åpen bane fortsetter utenfor utsnittet. Når en
svært lang ellipse klippes, vises bare den delen som passer i utsnittet.
Velg «Tilpass bane» for å inkludere legemenes nåværende posisjoner.
Vektorpilenes lengder er tilpasset lesbarheten; tallverdiene står ved siden av.

## Kilde og kontroll

Metode: J. Wisdom og D. M. Hernandez, «A fast and accurate universal
Kepler solver without Stumpff series», MNRAS 453 (2015), 3015–3023,
https://doi.org/10.1093/mnras/stv1862. Implementasjonen her bruker
Stumpff-funksjoner med serie nær null og en sikret Newton-/halveringsmetode.

`npm test` kjører fysikktestene med Nodes innebygde testverktøy.
Testene dekker energi, dreieimpuls, A-vektor, hele omløp, parabelens
Barker-løsning, hyperbler, masseforhold, radielle kollisjoner og det
utvidede kontrollområdet ved lange tider.

### Valgfrie nettlesertester

Grensesnitttestene bruker Playwright med en isolert nettleserprofil.
Installer testverktøyet og Chromium hvis du vil kjøre disse:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
npm run build
npm run test:ui
```

Sett eventuelt miljøvariabelen `PLAYWRIGHT_PATH` til en eksisterende
Playwright-installasjon, og `PLAYWRIGHT_CHANNEL` til `msedge` eller
`chrome` for å bruke en installert nettleser. Testene kontrollerer blant
annet banetyper, kontroller, mobilbredder og den selvstendige HTML-filen.
Skjermbilder lagres i `output/` og holdes utenfor Git.

## Filer

- physics.js: uavhengig beregningsmotor.
- app.js: kontroller, visning og animasjon.
- index.html og styles.css: brukergrensesnitt.
- physics.test.cjs og ui-test.cjs: verifikasjon.
- build.cjs: samler appen i én HTML-fil.
- server.cjs: valgfri lokal utviklingsserver.
- output/himmelmekanikk.html: portabel app.
