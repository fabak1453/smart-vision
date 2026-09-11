#!/usr/bin/env node
'use strict';
/**
 * Copy compiled ERP web files from ../app into apk/www.
 * Does not modify the Windows Electron app/ folder.
 */
const fs = require('fs');
const path = require('path');

const apkRoot = path.join(__dirname, '..');
const repoRoot = path.join(apkRoot, '..');
const srcDir = path.join(repoRoot, 'app');
const destDir = path.join(apkRoot, 'www');
const bridgeSrc = path.join(apkRoot, 'apk-bridge.js');

const SKIP = new Set(['.DS_Store']);
const SKIP_EXT = new Set(['.jsx']);

function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    if (SKIP.has(name) || name === 'apk-bridge.js') continue;
    const src = path.join(from, name);
    const dest = path.join(to, name);
    const st = fs.statSync(src);
    if (st.isDirectory()) {
      copyTree(src, dest);
      continue;
    }
    if (SKIP_EXT.has(path.extname(name))) continue;
    fs.copyFileSync(src, dest);
  }
}

function injectBridge(erpHtmlPath) {
  let html = fs.readFileSync(erpHtmlPath, 'utf8');
  if (html.includes('apk-bridge.js')) return;
  html = html.replace(
    '<script src="./erp-model.js"></script>',
    '<script src="./erp-model.js"></script>\n<script src="./apk-bridge.js"></script>'
  );
  fs.writeFileSync(erpHtmlPath, html);
}

if (!fs.existsSync(srcDir)) {
  console.error('apk sync-web: missing ../app');
  process.exit(1);
}

fs.rmSync(destDir, { recursive: true, force: true });
copyTree(srcDir, destDir);
if (fs.existsSync(bridgeSrc)) {
  fs.copyFileSync(bridgeSrc, path.join(destDir, 'apk-bridge.js'));
}
const erpHtml = path.join(destDir, 'erp.html');
if (fs.existsSync(erpHtml)) injectBridge(erpHtml);
console.log('apk sync-web: copied ERP UI → apk/www (Windows app/ unchanged)');
