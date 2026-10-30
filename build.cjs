'use strict';
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
let html = read('index.html');
function replaceOnce(marker, replacement) {
  if (html.split(marker).length !== 2) throw new Error('Expected one build marker: ' + marker);
  html = html.replace(marker, () => replacement);
}
replaceOnce('<link rel="stylesheet" href="styles.css">', '<style>\n' + read('styles.css') + '\n</style>');
for (const file of ['physics.js', 'i18n.js', 'app.js']) {
  replaceOnce('<script defer src="' + file + '"></script>', '');
  replaceOnce('</body>', '<script>\n' + read(file).replace(/<\/script/gi, '<\\/script') + '\n</script>\n</body>');
}
const output = path.join(__dirname, 'output');
html = html.replace(/^[ \t]+$/gm, '');
fs.mkdirSync(output, {recursive: true});
html = html.replace('<!doctype html>', '<!doctype html>\n<!--\n' + read('LICENSE').trim() + '\n-->');
for (const [language, filename] of [['en', 'himmelmekanikk.html'], ['nb', 'himmelmekanikk.nb.html']]) {
  const localized = html.replace('<html lang="en">', '<html lang="' + language + '">');
  fs.writeFileSync(path.join(output, filename), localized);
  console.log('Created output/' + filename + ' (' + Buffer.byteLength(localized) + ' bytes).');
}
