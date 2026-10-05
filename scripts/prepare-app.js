#!/usr/bin/env node
'use strict';
/**
 * Bundles React for offline Electron use and compiles smart-vision-app.jsx → .js
 * so the packaged .exe does not depend on unpkg or live internet.
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const root = path.join(__dirname, '..');
const vendorDir = path.join(root, 'app', 'vendor');

const vendorFiles = [
  ['node_modules/react/umd/react.production.min.js', 'react.production.min.js'],
  ['node_modules/react-dom/umd/react-dom.production.min.js', 'react-dom.production.min.js'],
  ['node_modules/@babel/standalone/babel.min.js', 'babel.min.js'],
  // Camera barcode / QR decoding, loaded on demand by app/scanner.js.
  ['node_modules/@zxing/library/umd/index.min.js', 'zxing.min.js'],
  // Bill PDFs made on the phone (app/bill-share.js), loaded on demand.
  ['node_modules/jspdf/dist/jspdf.umd.min.js', 'jspdf.umd.min.js'],
  ['node_modules/html2canvas/dist/html2canvas.min.js', 'html2canvas.min.js'],
];

function copyVendor() {
  fs.mkdirSync(vendorDir, { recursive: true });
  for (const [relSrc, name] of vendorFiles) {
    const src = path.join(root, relSrc);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing ${relSrc} — run npm install first`);
    }
    fs.copyFileSync(src, path.join(vendorDir, name));
  }
}

function compileApp() {
  const jsx = path.join(root, 'app', 'smart-vision-app.jsx');
  const out = path.join(root, 'app', 'smart-vision-app.js');
  const { code } = babel.transformFileSync(jsx, {
    filename: jsx,
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
  });
  fs.writeFileSync(out, code, 'utf8');
}

copyVendor();
compileApp();
console.log('prepare-app: vendor scripts + smart-vision-app.js ready');
