(function (g) {
  const MASTER_USER = 'smart';
  const MASTER_PASS = '1234';
  const SESSION_MASTER = 'sv-master-session';

  function teamToken(id) {
    return 'sv-team-' + id;
  }

  function matchTeam(team, username, password) {
    const u = String(username || '').trim().toLowerCase();
    if (!u || password == null || password === '') return null;
    return (team || []).find((t) =>
      t.login_username
      && String(t.login_username).trim().toLowerCase() === u
      && String(t.login_password || '') === String(password)
    ) || null;
  }

  function login(team, username, password) {
    const u = String(username || '').trim();
    const p = String(password || '');
    if (u === MASTER_USER && p === MASTER_PASS) {
      return { token: SESSION_MASTER, user: { name: 'smart', role: 'Owner · Smart Vision', master: true } };
    }
    const member = matchTeam(team, u, p);
    if (member) {
      return {
        token: teamToken(member.id),
        user: { name: member.name, role: member.role + ' · Smart Vision', teamId: member.id },
      };
    }
    return null;
  }

  function isSignedIn(token) {
    return !!token && (token === SESSION_MASTER || /^sv-team-\d+$/.test(token));
  }

  g.SV_AUTH = { login, isSignedIn, matchTeam, SESSION_MASTER, teamToken, MASTER_USER };
})(typeof window !== 'undefined' ? window : globalThis);
