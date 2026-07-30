(function () {
  const TOKEN_KEY = 'sv_token';
  const USER_KEY = 'sv_user';

  if (window.SV_AUTH && window.SV_AUTH.isSignedIn(localStorage.getItem(TOKEN_KEY))) {
    window.location.replace('./erp.html');
    return;
  }

  const form = document.getElementById('login-form');
  const err = document.getElementById('login-err');
  let teamCache = null;

  async function loadTeam() {
    if (teamCache) return teamCache;
    try {
      const res = await fetch('./api.php?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        teamCache = Array.isArray(data.TEAM) ? data.TEAM : [];
        return teamCache;
      }
    } catch (e) { /* offline / static */ }
    teamCache = [];
    return teamCache;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const team = await loadTeam();
    const session = window.SV_AUTH.login(team, username, password);
    if (session) {
      localStorage.setItem(TOKEN_KEY, session.token);
      localStorage.setItem(USER_KEY, JSON.stringify(session.user));
      window.location.replace('./erp.html');
      return;
    }
    err.textContent = 'Invalid username or password.';
  });
})();
