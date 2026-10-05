// LAN pairing + Wi-Fi CSV auth — real electron/pairing.js module
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const pairing = require('./electron/pairing');

let n = 0;
const ok = (cond, msg) => {
  n++;
  if (!cond) { console.error('  ✗ FAIL:', msg); process.exit(1); }
  console.log('  ✓', msg);
};

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-pairing-'));
pairing.init(dir);

function req(addr, opts) {
  const o = opts || {};
  const headers = {};
  if (o.headerPin) headers['x-sv-pin'] = o.headerPin;
  if (o.token) headers.authorization = 'Bearer ' + o.token;
  return {
    socket: { remoteAddress: addr },
    url: '/backup/export' + (o.queryPin ? '?pin=' + o.queryPin : ''),
    headers,
  };
}

console.log('— LAN pairing / Wi-Fi CSV suite —');

// Pairing off → LAN blocked, loopback still allowed
pairing.setEnabled(false);
ok(pairing.requireCsvPin(req('127.0.0.1')).ok === true, 'loopback always allowed for CSV');
ok(pairing.requireCsvPin(req('192.168.1.9')).status === 403, 'LAN CSV blocked while Wi-Fi CSV is off');

// Turn LAN on → PIN generated
const st = pairing.setEnabled(true);
ok(st.enabled === true && /^\d{6}$/.test(st.pin), 'enabling LAN issues a 6-digit PIN');
const pin = st.pin;

// Public status must never leak the PIN
const pub = pairing.publicStatus(12345);
ok(pub.ok === true && pub.enabled === true && pub.canPair === true, 'publicStatus reports reachability + pairing readiness');
ok(pub.pin === undefined && !JSON.stringify(pub).includes(pin), 'publicStatus never exposes the PIN');
ok(Array.isArray(pub.urls), 'publicStatus exposes the LAN urls for building the address');

// CSV auth by PIN (header + query), and rejects a wrong PIN
ok(pairing.requireCsvPin(req('192.168.1.9', { headerPin: pin })).ok === true, 'CSV accepts the PIN via X-SV-PIN header');
ok(pairing.requireCsvPin(req('192.168.1.9', { queryPin: pin })).ok === true, 'CSV accepts the PIN via ?pin=');
ok(pairing.requireCsvPin(req('192.168.1.9', { headerPin: '000000' })).status === 401, 'CSV rejects a wrong PIN');

// Pair a device, then the paired token also authorises CSV (no PIN re-entry)
const paired = pairing.pair(pin, 'phone-1');
ok(paired.ok === true && paired.device.token, 'device pairs with the PIN and receives a token');
const withToken = req('192.168.1.9', { token: paired.device.token });
ok(pairing.requireCsvPin(withToken).ok === true, 'paired device token authorises CSV without re-typing the PIN');
ok(pairing.requireAuth(withToken).ok === true, 'paired device token authorises /api/sync');
ok(pairing.requireAuth(req('192.168.1.9', { token: 'nope' })).status === 401, 'unknown token still rejected on /api/sync');
ok(pairing.pair('000000', 'phone-2').ok === false, 'pairing with a wrong PIN is refused');

// Rotating the PIN invalidates the old one
const newPin = pairing.newPin();
ok(newPin !== pin && pairing.requireCsvPin(req('192.168.1.9', { headerPin: pin })).status === 401, 'rotating the PIN invalidates the previous PIN');
ok(pairing.requireCsvPin(req('192.168.1.9', { headerPin: newPin })).ok === true, 'the rotated PIN works');

// The shop PC remembers its LAN port so the phone's saved IP:port stays valid
ok(pairing.getLanPort() === 0, 'fresh install has no remembered LAN port');
pairing.setLanPort(51732);
ok(pairing.getLanPort() === 51732, 'LAN port round-trips');
pairing.setLanPort(999999);
ok(pairing.getLanPort() === 0, 'an invalid LAN port is ignored');
pairing.setLanPort(51732);
const pinBeforeRestart = pairing.status().pin;
pairing.init(dir); // re-read from disk — simulates an app restart
ok(pairing.getLanPort() === 51732, 'LAN port survives a restart');
ok(pairing.status().pin === pinBeforeRestart, 'PIN survives a restart');
ok(pairing.requireCsvPin(req('192.168.1.9', { headerPin: pinBeforeRestart })).ok === true, 'CSV still authorises with the same PIN after restart');

console.log('\nALL ' + n + ' LAN SYNC TESTS PASSED ✓');
