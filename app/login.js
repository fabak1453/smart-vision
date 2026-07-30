(function () {
  var TOKEN_KEY = 'sv_token';
  var USER_KEY = 'sv_user';
  var REMEMBER_USER_KEY = 'sv_remember_user';

  var form = document.getElementById('login-form');
  var err = document.getElementById('login-err');
  var userInput = document.getElementById('username');
  var passInput = document.getElementById('password');
  var rememberChk = document.getElementById('remember');
  var autoChk = document.getElementById('auto-login');
  var loginBtn = document.getElementById('login-btn');
  var forgetBtn = document.getElementById('forget-btn');
  var teamCache = null;
  var savedCreds = null;

  function queryFlag(name) {
    try {
      return new URLSearchParams(window.location.search || '').get(name) === '1';
    } catch (e) {
      return /[?&]nologin=1(?:&|$)/.test(window.location.search || '');
    }
  }

  var skipAutoLogin = queryFlag('nologin');

  function hasApi() {
    return typeof window.electronAPI !== 'undefined' && window.electronAPI
      && typeof window.electronAPI.loadSavedLogin === 'function';
  }

  function setBusy(on) {
    if (loginBtn) {
      loginBtn.disabled = !!on;
      loginBtn.textContent = on ? 'Signing in…' : 'Sign in';
    }
    // Never lock the password/username fields — user must always be able to type after logout
    if (userInput) {
      userInput.disabled = false;
      userInput.readOnly = false;
    }
    if (passInput) {
      passInput.disabled = false;
      passInput.readOnly = false;
    }
  }

  function unlockFields() {
    setBusy(false);
    if (passInput) {
      passInput.disabled = false;
      passInput.readOnly = false;
      passInput.value = '';
      try { passInput.blur(); } catch (e) { /* ignore */ }
    }
    if (userInput) {
      userInput.disabled = false;
      userInput.readOnly = false;
    }
  }

  function focusPassword() {
    try {
      if (passInput) {
        passInput.disabled = false;
        passInput.readOnly = false;
        passInput.focus();
        passInput.select();
      }
    } catch (e) { /* ignore */ }
  }

  function applySession(session) {
    try {
      localStorage.setItem(TOKEN_KEY, session.token);
      localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    } catch (e) { /* private mode / quota */ }
  }

  async function persistPrefs(username, password) {
    var remember = !!(rememberChk && rememberChk.checked);
    var autoLogin = !!(autoChk && autoChk.checked);
    try {
      if (remember) localStorage.setItem(REMEMBER_USER_KEY, username);
      else localStorage.removeItem(REMEMBER_USER_KEY);
    } catch (e) { /* ignore */ }

    if (!hasApi()) return;
    try {
      if (remember || autoLogin) {
        await window.electronAPI.saveLogin({
          username: username,
          password: autoLogin ? password : '',
          remember: remember,
          autoLogin: autoLogin,
        });
      } else {
        await window.electronAPI.clearSavedLogin();
      }
    } catch (e) { /* ignore */ }
  }

  async function loadTeam() {
    if (teamCache) return teamCache;
    try {
      var res = await fetch('./api.php?t=' + Date.now());
      if (res.ok) {
        var data = await res.json();
        teamCache = Array.isArray(data.TEAM) ? data.TEAM : [];
        return teamCache;
      }
    } catch (e) { /* offline / static */ }
    teamCache = [];
    return teamCache;
  }

  async function tryLogin(username, password, fromAuto) {
    err.textContent = '';
    var team = await loadTeam();
    if (!window.SV_AUTH) {
      err.textContent = 'Login module failed to load. Restart the app.';
      return false;
    }
    var session = window.SV_AUTH.login(team, username, password);
    if (!session) {
      err.textContent = fromAuto
        ? 'Saved login expired — enter your password again.'
        : 'Invalid username or password.';
      return false;
    }
    applySession(session);
    if (!fromAuto) await persistPrefs(username, password);
    window.location.replace('./erp.html');
    return true;
  }

  async function boot() {
    // Already signed in (token still present)
    try {
      if (!skipAutoLogin && window.SV_AUTH && window.SV_AUTH.isSignedIn(localStorage.getItem(TOKEN_KEY))) {
        window.location.replace('./erp.html');
        return;
      }
    } catch (e) { /* continue to form */ }

    // Prefill remembered username from localStorage
    try {
      var remembered = localStorage.getItem(REMEMBER_USER_KEY) || '';
      if (remembered && userInput) userInput.value = remembered;
    } catch (e) { /* ignore */ }

    // Load encrypted saved login (Electron)
    if (hasApi()) {
      try {
        var res = await window.electronAPI.loadSavedLogin();
        if (res && res.ok && res.data) {
          savedCreds = res.data;
          if (forgetBtn) forgetBtn.hidden = false;
          if (savedCreds.username && userInput) userInput.value = savedCreds.username;
          if (rememberChk) rememberChk.checked = savedCreds.remember !== false;
          if (autoChk) autoChk.checked = !!savedCreds.autoLogin;

          // After logout (?nologin=1): show form, never auto-fill password into the input
          if (skipAutoLogin) {
            unlockFields();
            focusPassword();
            // clean URL so refresh can auto-login again if desired
            try {
              if (window.history && window.history.replaceState) {
                window.history.replaceState({}, '', './index.html');
              }
            } catch (e2) { /* ignore */ }
            return;
          }

          if (savedCreds.autoLogin && savedCreds.username && savedCreds.password) {
            // Auto-login without putting password into the DOM field (avoids locked/readonly inputs)
            setBusy(true);
            var ok = false;
            try {
              ok = await tryLogin(savedCreds.username, savedCreds.password, true);
            } finally {
              if (!ok) unlockFields();
            }
            if (ok) return;
            focusPassword();
            return;
          }
        }
      } catch (e) { /* show form */ }
    }

    unlockFields();
    if (userInput && userInput.value) focusPassword();
    else {
      try { if (userInput) userInput.focus(); } catch (e2) { /* ignore */ }
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var username = (userInput.value || '').trim();
    var password = passInput.value || '';
    setBusy(true);
    tryLogin(username, password, false).then(function (ok) {
      if (!ok) {
        unlockFields();
        focusPassword();
      }
    }).catch(function () {
      unlockFields();
      err.textContent = 'Sign-in failed. Please try again.';
      focusPassword();
    });
  });

  // Ensure fields stay editable if browser autofill marks them readonly
  function ensureEditable(el) {
    if (!el) return;
    el.addEventListener('focus', function () {
      el.disabled = false;
      el.readOnly = false;
    });
    el.addEventListener('click', function () {
      el.disabled = false;
      el.readOnly = false;
    });
  }
  ensureEditable(userInput);
  ensureEditable(passInput);

  if (forgetBtn) {
    forgetBtn.addEventListener('click', function () {
      savedCreds = null;
      if (rememberChk) rememberChk.checked = false;
      if (autoChk) autoChk.checked = false;
      unlockFields();
      try { localStorage.removeItem(REMEMBER_USER_KEY); } catch (e) { /* ignore */ }
      if (hasApi()) {
        window.electronAPI.clearSavedLogin().catch(function () {});
      }
      forgetBtn.hidden = true;
      err.textContent = '';
      focusPassword();
    });
  }

  // Auto-login implies remember
  if (autoChk && rememberChk) {
    autoChk.addEventListener('change', function () {
      if (autoChk.checked) rememberChk.checked = true;
    });
  }

  boot();
})();
