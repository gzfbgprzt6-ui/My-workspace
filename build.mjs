import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/assets', { recursive: true });
await build({ entryPoints: ['src/main.tsx'], bundle: true, minify: true, format: 'esm', target: 'es2020', outfile: 'dist/tmp.js', define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'none' });
execSync('npx tailwindcss -i src/index.css -o dist/tmp.css --minify', { stdio: 'ignore' });
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);
const js = readFileSync('dist/tmp.js'); const css = readFileSync('dist/tmp.css');
const jsName = `assets/app-${hash(js)}.js`; const cssName = `assets/app-${hash(css)}.css`;
writeFileSync(`dist/${jsName}`, js); writeFileSync(`dist/${cssName}`, css);
rmSync('dist/tmp.js'); rmSync('dist/tmp.css');
cpSync('public/icons', 'dist/icons', { recursive: true });
cpSync('public/manifest.webmanifest', 'dist/manifest.webmanifest');
writeFileSync('dist/.nojekyll', '');
const html = `<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#F8F9FC" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#121119" media="(prefers-color-scheme: dark)" />
<meta name="description" content="Osobni radni prostor: zadaci, kalendar, projekti, bilješke i financije." />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="My Workspace" />
<title>My Workspace</title>
<link rel="manifest" href="manifest.webmanifest" />
<link rel="icon" type="image/png" href="icons/favicon-32.png" />
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..800;1,9..40,400..600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="${cssName}" />
<script type="module" src="${jsName}"></script>
</head>
<body>
<div id="root"></div>
<noscript>Za rad aplikacije potreban je JavaScript.</noscript>
</body>
</html>`;
writeFileSync('dist/index.html', html);
const assets = ['./', './index.html', `./${jsName}`, `./${cssName}`, './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'];
const sw = readFileSync('public/sw.template.js', 'utf8').replace('__VERSION__', hash(js + css)).replace('__ASSETS__', JSON.stringify(assets));
writeFileSync('dist/sw.js', sw);
console.log('built', jsName, (js.length / 1024).toFixed(0) + 'KB');
