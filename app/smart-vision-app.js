// ===== Smart Vision CRM — runnable build with in-browser mock API =====
// Real page components from the production app, served by a mock API
// seeded from the Laravel ErpSeeder so the whole ERP runs with no backend.
const {
  useState,
  useEffect,
  useCallback,
  useRef
} = React;

/* ---------------- hash router ---------------- */
function currentPath() {
  const h = window.location.hash.replace(/^#/, '');
  return h || '/';
}
function routeKey(pathname) {
  return String(pathname || '').replace(/^\//, '').split('?')[0];
}
function hashQuery() {
  const h = String(window.location.hash || '').replace(/^#/, '');
  const i = h.indexOf('?');
  return new URLSearchParams(i < 0 ? '' : h.slice(i + 1));
}
function hashOpenId() {
  const v = hashQuery().get('open');
  return v ? String(v) : '';
}
function useLocation() {
  const [pathname, setPathname] = useState(currentPath());
  useEffect(() => {
    const f = () => setPathname(currentPath());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return {
    pathname
  };
}
function useNavigate() {
  return to => {
    const path = String(to).startsWith('/') ? to : '/' + to;
    if (window.location.hash !== '#' + path) window.location.hash = path;
  };
}

/* ---------------- auth (persistent until sign out) ---------------- */
const MASTER_LOGIN = {
  username: 'smart',
  password: '1234'
};
const SESSION_TOKEN = 'sv-master-session';
function getToken() {
  return localStorage.getItem('sv_token');
}
function setToken(t) {
  t ? localStorage.setItem('sv_token', t) : localStorage.removeItem('sv_token');
}
function isLoggedIn() {
  const t = getToken();
  return typeof window !== 'undefined' && window.SV_AUTH ? window.SV_AUTH.isSignedIn(t) : t === SESSION_TOKEN || t && /^sv-team-\d+$/.test(t);
}
function findTeamMemberByLogin(username, password) {
  const u = String(username || '').trim().toLowerCase();
  if (!u || password == null || password === '') return null;
  return TEAM.find(t => t.login_username && String(t.login_username).trim().toLowerCase() === u && String(t.login_password || '') === String(password)) || null;
}
function authenticateCredentials(username, password) {
  if (username === MASTER_LOGIN.username && password === MASTER_LOGIN.password) {
    return {
      token: SESSION_TOKEN,
      user: {
        name: 'smart',
        role: 'Owner · Smart Vision',
        master: true
      }
    };
  }
  const member = findTeamMemberByLogin(username, password);
  if (member) {
    return {
      token: 'sv-team-' + member.id,
      user: {
        name: member.name,
        role: member.role + ' · Smart Vision',
        teamId: member.id
      }
    };
  }
  return null;
}
(function clearLegacyDemoSession() {
  if (getToken() === 'demo') {
    setToken(null);
    localStorage.removeItem('sv_user');
  }
})();

/* ---------------- format ---------------- */
const inr = n => '\u20B9' + Number(n || 0).toLocaleString('en-IN');
const lakh = n => '\u20B9' + (Number(n || 0) / 100000).toFixed(1) + 'L';
const date = d => d ? new Date(d).toLocaleDateString('en-IN', {
  day: '2-digit',
  month: 'short',
  year: '2-digit'
}) : '\u2014';

/* ====================================================================== */
/* ====================  MOCK DATABASE (from ErpSeeder)  ================= */
/* ====================================================================== */
const TODAY = new Date();
const iso = days => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};
const O = name => typeof name === 'object' && name ? name : {
  name
};
const Erp = typeof globalThis !== 'undefined' && globalThis.SV_ERP || null;
function getDeviceId() {
  try {
    let id = localStorage.getItem('sv_device_id');
    if (!id) {
      id = Erp && Erp.newUuid() || 'dev-' + Date.now();
      localStorage.setItem('sv_device_id', id);
    }
    return id;
  } catch (e) {
    return 'desktop';
  }
}
function getNumberPrefix() {
  try {
    return localStorage.getItem('sv_number_prefix') || '';
  } catch (e) {
    return '';
  }
}
function getPairing() {
  try {
    return JSON.parse(localStorage.getItem('sv_pairing') || 'null');
  } catch (e) {
    return null;
  }
}
function setPairing(p) {
  try {
    if (!p) localStorage.removeItem('sv_pairing');else localStorage.setItem('sv_pairing', JSON.stringify(p));
  } catch (e) {/* ignore */}
}
function isApkShell() {
  return typeof window !== 'undefined' && !!(window.Capacitor || window.SV_APK);
}
const DB = {
  customers: [{
    id: 1,
    name: 'Sunrise Heights CHS',
    area: 'Baner',
    type: 'Residential',
    contact_name: 'Anil Deshpande',
    phone: '98220 41187',
    sites: 1,
    owner: O('Rohit Sharma'),
    lifetime_value: 186400
  }, {
    id: 2,
    name: 'Trimurti Jewellers',
    area: 'Laxmi Road',
    type: 'Commercial',
    contact_name: 'Nitin Saraf',
    phone: '98500 22743',
    sites: 2,
    owner: O('Priya Kulkarni'),
    lifetime_value: 124600
  }, {
    id: 3,
    name: 'Orchid Hotel',
    area: 'Balewadi',
    type: 'Commercial',
    contact_name: 'Rhea Menon',
    phone: '99700 18452',
    sites: 1,
    owner: O('Rohit Sharma'),
    lifetime_value: 406000
  }, {
    id: 4,
    name: 'Zenith Logistics',
    area: 'Chakan',
    type: 'Industrial',
    contact_name: 'Suresh Iyer',
    phone: '98810 67234',
    sites: 3,
    owner: O('Priya Kulkarni'),
    lifetime_value: 276500
  }, {
    id: 5,
    name: 'Dr. Phadke Clinic',
    area: 'Aundh',
    type: 'Commercial',
    contact_name: 'Dr. Phadke',
    phone: '94220 90315',
    sites: 1,
    owner: O('Amit Naik'),
    lifetime_value: 38400
  }, {
    id: 6,
    name: 'Blue Dart Hub',
    area: 'Hinjawadi',
    type: 'Industrial',
    contact_name: 'Karan Mehta',
    phone: '99230 55876',
    sites: 1,
    owner: O('Rohit Sharma'),
    lifetime_value: 158200
  }, {
    id: 7,
    name: 'Galaxy Gym',
    area: 'Wakad',
    type: 'Commercial',
    contact_name: 'Sahil Rana',
    phone: '97650 28194',
    sites: 1,
    owner: O('Priya Kulkarni'),
    lifetime_value: 54000
  }, {
    id: 8,
    name: 'Kakade Retail',
    area: 'FC Road',
    type: 'Commercial',
    contact_name: 'Vinay Kakade',
    phone: '98230 77561',
    sites: 2,
    owner: O('Amit Naik'),
    lifetime_value: 28900
  }, {
    id: 9,
    name: 'Greenfield School',
    area: 'Bavdhan',
    type: 'Commercial',
    contact_name: 'Principal Office',
    phone: '98905 11220',
    sites: 2,
    owner: O('Rohit Sharma'),
    lifetime_value: 210000
  }, {
    id: 10,
    name: 'Mehta Residence',
    area: 'Kalyani Nagar',
    type: 'Residential',
    contact_name: 'Sameer Mehta',
    phone: '99201 44556',
    sites: 1,
    owner: O('Amit Naik'),
    lifetime_value: 64200
  }],
  leads: [{
    id: 1,
    name: 'Roy Villa',
    requirement: 'Kalyani Nagar · 8-cam villa, night vision',
    value: 72000,
    source: 'Referral',
    segment: 'Residential',
    owner: O('Rohit Sharma'),
    stage: 0
  }, {
    id: 2,
    name: 'Stellar Coworking',
    requirement: '3 floors · 24 cams + access control',
    value: 190000,
    source: 'IndiaMART',
    segment: 'Commercial',
    owner: O('Priya Kulkarni'),
    stage: 0
  }, {
    id: 3,
    name: 'Gupta Stores',
    requirement: '4-cam shop + monitor',
    value: 26000,
    source: 'JustDial',
    segment: 'Commercial',
    owner: O('Amit Naik'),
    stage: 0
  }, {
    id: 4,
    name: 'Lakeview Society',
    requirement: 'Perimeter + lift cams · 28 units',
    value: 240000,
    source: 'Referral',
    segment: 'Residential',
    owner: O('Rohit Sharma'),
    stage: 1
  }, {
    id: 5,
    name: 'Apex Auto Garage',
    requirement: '8 cams · yard coverage',
    value: 68000,
    source: 'JustDial',
    segment: 'Commercial',
    owner: O('Priya Kulkarni'),
    stage: 1
  }, {
    id: 6,
    name: 'Greenfield School',
    requirement: '18 cams · campus + gates',
    value: 178000,
    source: 'IndiaMART',
    segment: 'Commercial',
    owner: O('Rohit Sharma'),
    stage: 1
  }, {
    id: 7,
    name: 'Orchid Hotel',
    requirement: '32-cam upgrade · 2 NVR',
    value: 342000,
    source: 'Existing',
    segment: 'Commercial',
    owner: O('Rohit Sharma'),
    stage: 2
  }, {
    id: 8,
    name: 'Zenith Logistics',
    requirement: 'Warehouse 24-cam + PTZ',
    value: 276500,
    source: 'IndiaMART',
    segment: 'Industrial',
    owner: O('Priya Kulkarni'),
    stage: 2
  }, {
    id: 9,
    name: 'Shree Textiles',
    requirement: '12 cams · shop floor',
    value: 96000,
    source: 'JustDial',
    segment: 'Industrial',
    owner: O('Priya Kulkarni'),
    stage: 2
  }, {
    id: 10,
    name: 'Sunrise Heights CHS',
    requirement: '16-cam society + NVR · revised twice',
    value: 186400,
    source: 'Referral',
    segment: 'Residential',
    owner: O('Rohit Sharma'),
    stage: 3
  }, {
    id: 11,
    name: 'Trimurti Jewellers',
    requirement: 'Vault PTZ + alarm integration',
    value: 124600,
    source: 'Existing',
    segment: 'Commercial',
    owner: O('Priya Kulkarni'),
    stage: 3
  }, {
    id: 12,
    name: 'Kakade Retail',
    requirement: '4-cam shop package',
    value: 28900,
    source: 'Walk-in',
    segment: 'Commercial',
    owner: O('Priya Kulkarni'),
    stage: 4
  }, {
    id: 13,
    name: 'Mehta Residence',
    requirement: '6-cam villa + video doorbell',
    value: 64200,
    source: 'Referral',
    segment: 'Residential',
    owner: O('Amit Naik'),
    stage: 4
  }, {
    id: 14,
    name: 'Blue Dart Hub',
    requirement: '12-cam bullet + PoE',
    value: 158200,
    source: 'Existing',
    segment: 'Industrial',
    owner: O('Rohit Sharma'),
    stage: 4
  }],
  quotes: [{
    id: 1,
    number: 'QT-1001',
    customer: O('Sunrise Heights CHS'),
    scope: '16-cam society setup + NVR 16ch',
    total: 186400,
    status: 'sent',
    owner: O('Rohit Sharma'),
    valid_till: iso(15),
    items: [{
      id: 1,
      description: 'Hikvision 2MP Dome × 16',
      amount: 26400
    }, {
      id: 2,
      description: 'Hikvision NVR 16ch + 8TB',
      amount: 14500
    }, {
      id: 3,
      description: 'Cabling, PoE & installation',
      amount: 145500
    }]
  }, {
    id: 2,
    number: 'QT-1002',
    customer: O('Kakade Retail'),
    scope: '4-cam shop package + DVR',
    total: 28900,
    status: 'accepted',
    owner: O('Priya Kulkarni'),
    valid_till: iso(15),
    converted: true,
    invoice_number: 'INV-2002',
    job_number: 'JOB-3006',
    items: [{
      id: 1,
      description: 'Hikvision 2MP Dome × 4',
      amount: 6600,
      qty: 4,
      product_id: 1
    }, {
      id: 2,
      description: 'DVR 4ch + 1TB',
      amount: 3600
    }, {
      id: 3,
      description: 'Install & cabling',
      amount: 18700
    }]
  }, {
    id: 3,
    number: 'QT-1003',
    customer: O('Orchid Hotel'),
    scope: '32-cam upgrade, 2× NVR',
    total: 342000,
    status: 'negotiation',
    owner: O('Rohit Sharma'),
    valid_till: iso(15),
    items: [{
      id: 1,
      description: 'Hikvision 4MP Bullet × 32',
      amount: 86400
    }, {
      id: 2,
      description: 'NVR 16ch × 2',
      amount: 25000
    }, {
      id: 3,
      description: 'PoE switches + cabling',
      amount: 90600
    }, {
      id: 4,
      description: 'Installation & commissioning',
      amount: 140000
    }]
  }, {
    id: 4,
    number: 'QT-1004',
    customer: O('Mehta Residence'),
    scope: '6-cam villa + video doorbell',
    total: 64200,
    status: 'draft',
    owner: O('Amit Naik'),
    valid_till: iso(15),
    items: [{
      id: 1,
      description: 'Hikvision 2MP Dome × 6',
      amount: 9900
    }, {
      id: 2,
      description: 'Video doorbell',
      amount: 8500
    }, {
      id: 3,
      description: 'NVR + install',
      amount: 45800
    }]
  }, {
    id: 5,
    number: 'QT-1005',
    customer: O('Zenith Logistics'),
    scope: 'Warehouse 24-cam + PTZ',
    total: 276500,
    status: 'sent',
    owner: O('Priya Kulkarni'),
    valid_till: iso(15),
    items: [{
      id: 1,
      description: 'Hikvision 4MP Bullet × 24',
      amount: 64800
    }, {
      id: 2,
      description: 'CP Plus 4MP PTZ 25x × 2',
      amount: 42000
    }, {
      id: 3,
      description: 'NVR + PoE + cabling',
      amount: 169700
    }]
  }],
  invoices: [{
    id: 1,
    number: 'INV-2001',
    customer: O('Sunrise Heights CHS'),
    total: 186400,
    paid: 93200,
    status: 'partial',
    issue_date: iso(-16),
    due_date: iso(-1)
  }, {
    id: 2,
    number: 'INV-2002',
    customer: O('Kakade Retail'),
    total: 28900,
    paid: 28900,
    status: 'paid',
    issue_date: iso(-16),
    due_date: iso(-1)
  }, {
    id: 3,
    number: 'INV-2003',
    customer: O('Dr. Phadke Clinic'),
    total: 38400,
    paid: 38400,
    status: 'paid',
    issue_date: iso(-20),
    due_date: iso(-5)
  }, {
    id: 4,
    number: 'INV-2004',
    customer: O('Zenith Logistics'),
    total: 276500,
    paid: 138250,
    status: 'partial',
    issue_date: iso(-19),
    due_date: iso(-4)
  }, {
    id: 5,
    number: 'INV-2005',
    customer: O('Trimurti Jewellers'),
    total: 124600,
    paid: 0,
    status: 'overdue',
    issue_date: iso(-39),
    due_date: iso(-24)
  }, {
    id: 6,
    number: 'INV-2006',
    customer: O('Blue Dart Hub'),
    total: 158200,
    paid: 158200,
    status: 'paid',
    issue_date: iso(-45),
    due_date: iso(-30)
  }].map(i => ({
    ...i,
    balance: i.total - i.paid
  })),
  jobs: [{
    id: 1,
    number: 'JOB-3001',
    customer: O('Orchid Hotel'),
    type: 'install',
    scope: '32-cam upgrade, 2× NVR',
    scheduled_on: iso(2),
    slot: '10:00–14:00',
    technician: O('Vikram Jadhav'),
    status: 'scheduled',
    checklist: [{
      id: 1,
      label: 'Site survey signed off',
      done: true
    }, {
      id: 2,
      label: 'Cabling & conduits',
      done: true
    }, {
      id: 3,
      label: 'Camera mounting',
      done: false
    }, {
      id: 4,
      label: 'NVR config & handover',
      done: false
    }]
  }, {
    id: 2,
    number: 'JOB-3002',
    customer: O('Sunrise Heights CHS'),
    type: 'install',
    scope: '16-cam society + NVR',
    scheduled_on: iso(0),
    slot: '09:00–18:00',
    technician: O('Santosh More'),
    status: 'in_progress',
    checklist: [{
      id: 1,
      label: 'Backbone cabling',
      done: true
    }, {
      id: 2,
      label: 'Camera mounting (16)',
      done: true
    }, {
      id: 3,
      label: 'NVR + PoE config',
      done: false
    }, {
      id: 4,
      label: 'Customer walkthrough',
      done: false
    }]
  }, {
    id: 3,
    number: 'JOB-3003',
    customer: O('Mehta Residence'),
    type: 'survey',
    scope: '6-cam villa site survey',
    scheduled_on: iso(1),
    slot: '11:00–12:00',
    technician: O('Imran Shaikh'),
    status: 'scheduled',
    checklist: []
  }, {
    id: 4,
    number: 'JOB-3004',
    customer: O('Zenith Logistics'),
    type: 'install',
    scope: 'Warehouse 24-cam + PTZ',
    scheduled_on: iso(5),
    slot: 'TBD',
    technician: null,
    status: 'unassigned',
    checklist: []
  }, {
    id: 5,
    number: 'JOB-3005',
    customer: O('Galaxy Gym'),
    type: 'repair',
    scope: 'Replace faulty camera 3',
    scheduled_on: iso(0),
    slot: '15:00–16:00',
    technician: O('Datta Pawar'),
    status: 'scheduled',
    checklist: []
  }, {
    id: 6,
    number: 'JOB-3006',
    customer: O('Kakade Retail'),
    type: 'install',
    scope: '4-cam shop package',
    scheduled_on: iso(-3),
    slot: 'Done',
    technician: O('Santosh More'),
    status: 'done',
    checklist: [{
      id: 1,
      label: 'Cabling',
      done: true
    }, {
      id: 2,
      label: 'Cameras + DVR',
      done: true
    }, {
      id: 3,
      label: 'Handover',
      done: true
    }]
  }],
  tickets: [{
    id: 1,
    number: 'TKT-4001',
    customer: O('Galaxy Gym'),
    issue: 'Camera 3 offline after power cut',
    priority: 'high',
    coverage: 'amc',
    assignee: O('Vikram Jadhav'),
    status: 'open',
    sla_state: 'at_risk',
    activities: [{
      id: 1,
      note: 'Logged via WhatsApp by Sahil Rana',
      created_at: iso(0)
    }, {
      id: 2,
      note: 'Assigned to Vikram Jadhav',
      created_at: iso(0)
    }]
  }, {
    id: 2,
    number: 'TKT-4002',
    customer: O('Orchid Hotel'),
    issue: 'NVR not recording channel 12',
    priority: 'high',
    coverage: 'amc',
    assignee: O('Datta Pawar'),
    status: 'in_progress',
    sla_state: 'breached',
    activities: [{
      id: 1,
      note: 'Reported by front desk',
      created_at: iso(-1)
    }, {
      id: 2,
      note: 'Datta on site — HDD bay suspected',
      created_at: iso(0)
    }]
  }, {
    id: 3,
    number: 'TKT-4003',
    customer: O('Mehta Residence'),
    issue: 'Doorbell app not connecting',
    priority: 'medium',
    coverage: 'warranty',
    assignee: O('Imran Shaikh'),
    status: 'open',
    sla_state: 'ok',
    activities: [{
      id: 1,
      note: 'Customer raised via call',
      created_at: iso(0)
    }]
  }, {
    id: 4,
    number: 'TKT-4004',
    customer: O('Kakade Retail'),
    issue: 'Footage playback choppy',
    priority: 'low',
    coverage: 'paid',
    assignee: O('Santosh More'),
    status: 'open',
    sla_state: 'ok',
    activities: [{
      id: 1,
      note: 'Logged at counter',
      created_at: iso(0)
    }]
  }],
  amc: [{
    id: 1,
    number: 'AMC-5001',
    customer: O('Orchid Hotel'),
    plan: 'gold',
    devices: 32,
    value: 64000,
    starts_on: iso(-357),
    ends_on: iso(8),
    visits_total: 4,
    visits_used: 2,
    status: 'expiring'
  }, {
    id: 2,
    number: 'AMC-5002',
    customer: O('Trimurti Jewellers'),
    plan: 'gold',
    devices: 19,
    value: 48000,
    starts_on: iso(-364),
    ends_on: iso(1),
    visits_total: 4,
    visits_used: 3,
    status: 'expiring'
  }, {
    id: 3,
    number: 'AMC-5003',
    customer: O('Zenith Logistics'),
    plan: 'silver',
    devices: 41,
    value: 56000,
    starts_on: iso(-165),
    ends_on: iso(200),
    visits_total: 4,
    visits_used: 1,
    status: 'active'
  }, {
    id: 4,
    number: 'AMC-5004',
    customer: O('Greenfield School'),
    plan: 'silver',
    devices: 18,
    value: 32000,
    starts_on: iso(-275),
    ends_on: iso(90),
    visits_total: 4,
    visits_used: 2,
    status: 'active'
  }],
  products: [{
    id: 1,
    sku: 'CAM-HIK-201',
    name: 'Hikvision 2MP Dome',
    specs: '2MP IR dome, 2.8mm',
    category: 'Cameras',
    purchase_price: 1100,
    sale_price: 1650,
    stock: 240,
    reserved: 12,
    reorder_level: 40,
    track_serials: true
  }, {
    id: 2,
    sku: 'CAM-HIK-405',
    name: 'Hikvision 4MP Bullet',
    specs: '4MP ColorVu bullet',
    category: 'Cameras',
    purchase_price: 1850,
    sale_price: 2700,
    stock: 86,
    reserved: 24,
    reorder_level: 30,
    track_serials: true
  }, {
    id: 3,
    sku: 'CAM-CPP-PTZ',
    name: 'CP Plus 4MP PTZ 25x',
    specs: 'PTZ 25x optical zoom',
    category: 'Cameras',
    purchase_price: 14500,
    sale_price: 21000,
    stock: 6,
    reserved: 2,
    reorder_level: 4,
    track_serials: true
  }, {
    id: 4,
    sku: 'NVR-HIK-516',
    name: 'Hikvision NVR 16ch',
    specs: '16ch 4K NVR + 8TB bay',
    category: 'Recorders',
    purchase_price: 8200,
    sale_price: 12500,
    stock: 18,
    reserved: 4,
    reorder_level: 6,
    track_serials: true
  }, {
    id: 5,
    sku: 'DVR-HIK-104',
    name: 'Hikvision DVR 4ch',
    specs: '4ch 1080p DVR',
    category: 'Recorders',
    purchase_price: 2400,
    sale_price: 3600,
    stock: 32,
    reserved: 6,
    reorder_level: 10,
    track_serials: true
  }, {
    id: 6,
    sku: 'HDD-WD-4TB',
    name: 'WD Purple 4TB',
    specs: 'Surveillance HDD',
    category: 'Storage',
    purchase_price: 6200,
    sale_price: 8400,
    stock: 12,
    reserved: 0,
    reorder_level: 0,
    track_serials: false
  }, {
    id: 7,
    sku: 'SWT-POE-8',
    name: 'PoE Switch 8-port',
    specs: '8-port PoE 96W',
    category: 'Cables & Power',
    purchase_price: 2100,
    sale_price: 3200,
    stock: 4,
    reserved: 0,
    reorder_level: 8,
    track_serials: false
  }, {
    id: 8,
    sku: 'CBL-CAT6-305',
    name: 'Cat6 Cable 305m',
    specs: 'Cat6 outdoor roll',
    category: 'Cables & Power',
    purchase_price: 4800,
    sale_price: 6500,
    stock: 9,
    reserved: 1,
    reorder_level: 0,
    track_serials: false
  }, {
    id: 9,
    sku: 'UPS-1KVA',
    name: 'UPS 1KVA',
    specs: 'Line-interactive UPS',
    category: 'Cables & Power',
    purchase_price: 3400,
    sale_price: 4900,
    stock: 2,
    reserved: 0,
    reorder_level: 4,
    track_serials: false
  }],
  serials: [...Array.from({
    length: 8
  }, (_, i) => {
    const n = i + 1;
    const inst = n <= 2;
    return {
      id: n,
      serial_no: 'CAM-HIK-201-SN' + String(n).padStart(4, '0'),
      product: O('Hikvision 2MP Dome'),
      customer: inst ? O('Sunrise Heights CHS') : null,
      status: inst ? 'installed' : 'in_stock',
      in_warranty: inst,
      sold_on: inst ? iso(-120) : null,
      warranty_end: inst ? iso(600) : null
    };
  }), ...Array.from({
    length: 3
  }, (_, i) => {
    const n = i + 1;
    const inst = n <= 2;
    return {
      id: 100 + n,
      serial_no: 'NVR-HIK-516-SN' + String(n).padStart(4, '0'),
      product: O('Hikvision NVR 16ch'),
      customer: inst ? O('Sunrise Heights CHS') : null,
      status: inst ? 'installed' : 'in_stock',
      in_warranty: inst,
      sold_on: inst ? iso(-120) : null,
      warranty_end: inst ? iso(600) : null
    };
  })],
  equipment: [{
    id: 1,
    name: 'Hikvision 2MP Dome',
    customer: O('Sunrise Heights CHS'),
    product: O('Hikvision 2MP Dome'),
    serial: {
      serial_no: 'CAM-HIK-201-SN0001'
    },
    location: 'Lobby entrance',
    installed_on: iso(-120),
    warranty_end: iso(600),
    in_warranty: true
  }, {
    id: 2,
    name: 'Hikvision NVR 16ch',
    customer: O('Sunrise Heights CHS'),
    product: O('Hikvision NVR 16ch'),
    serial: {
      serial_no: 'NVR-HIK-516-SN0001'
    },
    location: 'Security room',
    installed_on: iso(-120),
    warranty_end: iso(600),
    in_warranty: true
  }, {
    id: 3,
    name: 'CP Plus 4MP PTZ 25x',
    customer: O('Trimurti Jewellers'),
    product: O('CP Plus 4MP PTZ 25x'),
    serial: {
      serial_no: 'CAM-CPP-PTZ-SN0007'
    },
    location: 'Vault corridor',
    installed_on: iso(-400),
    warranty_end: iso(-40),
    in_warranty: false
  }, {
    id: 4,
    name: 'Hikvision 4MP Bullet',
    customer: O('Orchid Hotel'),
    product: O('Hikvision 4MP Bullet'),
    serial: {
      serial_no: 'CAM-HIK-405-SN0012'
    },
    location: 'Pool deck',
    installed_on: iso(-200),
    warranty_end: iso(530),
    in_warranty: true
  }, {
    id: 5,
    name: 'Hikvision DVR 4ch',
    customer: O('Kakade Retail'),
    product: O('Hikvision DVR 4ch'),
    serial: {
      serial_no: 'DVR-HIK-104-SN0003'
    },
    location: 'Back office',
    installed_on: iso(-90),
    warranty_end: iso(640),
    in_warranty: true
  }, {
    id: 6,
    name: 'Hikvision 2MP Dome',
    customer: O('Dr. Phadke Clinic'),
    product: O('Hikvision 2MP Dome'),
    serial: {
      serial_no: 'CAM-HIK-201-SN0021'
    },
    location: 'Waiting area',
    installed_on: iso(-500),
    warranty_end: iso(-130),
    in_warranty: false
  }],
  credentials: [{
    id: 1,
    label: 'Society NVR',
    customer: O('Sunrise Heights CHS'),
    host: '192.168.1.108',
    port: 8000,
    username: 'admin',
    password: 'Sun@8841',
    notes: 'Static IP via router port-forward'
  }, {
    id: 2,
    label: 'Hotel NVR-1',
    customer: O('Orchid Hotel'),
    host: '10.0.0.21',
    port: 8000,
    username: 'orchid_admin',
    password: 'Orc#4521',
    notes: 'Lobby rack, channel 1–16'
  }, {
    id: 3,
    label: 'Vault DVR',
    customer: O('Trimurti Jewellers'),
    host: '192.168.0.50',
    port: 37777,
    username: 'admin',
    password: 'Vault@99',
    notes: 'Alarm panel integrated'
  }, {
    id: 4,
    label: 'Warehouse NVR',
    customer: O('Zenith Logistics'),
    host: '172.16.4.10',
    port: 8000,
    username: 'zenith',
    password: 'Zen!2240',
    notes: 'PTZ presets configured'
  }, {
    id: 5,
    label: 'Shop DVR',
    customer: O('Kakade Retail'),
    host: '192.168.1.64',
    port: 37777,
    username: 'admin',
    password: 'Kak@1290',
    notes: '—'
  }],
  purchaseOrders: [{
    id: 1,
    number: 'PO-6001',
    supplier: O('Hikvision Distributor (Pune)'),
    ordered_on: iso(-9),
    eta: iso(3),
    total: 184000,
    status: 'ordered',
    items: [{
      id: 1,
      description: 'Hikvision 4MP Bullet',
      qty: 40,
      unit_price: 1850
    }, {
      id: 2,
      description: 'Hikvision NVR 16ch',
      qty: 8,
      unit_price: 8200
    }, {
      id: 3,
      description: 'WD Purple 4TB',
      qty: 6,
      unit_price: 6200
    }]
  }, {
    id: 2,
    number: 'PO-6002',
    supplier: O('CP Plus Regional'),
    ordered_on: iso(-4),
    eta: iso(6),
    total: 116000,
    status: 'partial',
    items: [{
      id: 1,
      description: 'CP Plus 4MP PTZ 25x',
      qty: 6,
      unit_price: 14500
    }, {
      id: 2,
      description: 'PoE Switch 8-port',
      qty: 12,
      unit_price: 2100
    }]
  }, {
    id: 3,
    number: 'PO-6003',
    supplier: O('Hikvision Distributor (Pune)'),
    ordered_on: iso(-30),
    eta: iso(-20),
    total: 96000,
    status: 'received',
    items: [{
      id: 1,
      description: 'Hikvision 2MP Dome',
      qty: 60,
      unit_price: 1100
    }, {
      id: 2,
      description: 'Cat6 Cable 305m',
      qty: 6,
      unit_price: 4800
    }]
  }],
  repairs: [{
    id: 1,
    number: 'SR-7001',
    customer: O('Galaxy Gym'),
    device: 'Hikvision 2MP Dome',
    serial_no: 'CAM-HIK-201-SN0033',
    issue: 'No power after lightning surge',
    coverage: 'amc',
    received_on: iso(-2),
    promised_on: iso(2),
    technician: O('Vikram Jadhav'),
    charge: 0,
    status: 'diagnosing'
  }, {
    id: 2,
    number: 'SR-7002',
    customer: O('Trimurti Jewellers'),
    device: 'CP Plus 4MP PTZ 25x',
    serial_no: 'CAM-CPP-PTZ-SN0007',
    issue: 'PTZ motor stuck, zoom not working',
    coverage: 'paid',
    received_on: iso(-5),
    promised_on: iso(1),
    technician: O('Datta Pawar'),
    charge: 3500,
    status: 'repairing'
  }, {
    id: 3,
    number: 'SR-7003',
    customer: O('Kakade Retail'),
    device: 'Hikvision DVR 4ch',
    serial_no: 'DVR-HIK-104-SN0003',
    issue: 'HDD not detected, boot loop',
    coverage: 'warranty',
    received_on: iso(-6),
    promised_on: iso(-1),
    technician: O('Santosh More'),
    charge: 0,
    status: 'ready'
  }, {
    id: 4,
    number: 'SR-7004',
    customer: O('Orchid Hotel'),
    device: 'Hikvision NVR 16ch',
    serial_no: 'NVR-HIK-516-SN0009',
    issue: 'Channels 9-16 no signal',
    coverage: 'amc',
    received_on: iso(-1),
    promised_on: iso(3),
    technician: null,
    charge: 0,
    status: 'received'
  }, {
    id: 5,
    number: 'SR-7005',
    customer: O('Mehta Residence'),
    device: 'Video doorbell',
    serial_no: 'DB-MEH-SN0001',
    issue: 'Wifi module replaced',
    coverage: 'paid',
    received_on: iso(-9),
    promised_on: iso(-4),
    technician: O('Imran Shaikh'),
    charge: 1800,
    status: 'delivered'
  }],
  ledger: [{
    id: 1,
    number: 'CB-8001',
    direction: 'out',
    category: 'Rent',
    amount: 18000,
    on: iso(-12),
    party: 'Shop landlord',
    note: 'Monthly shop rent'
  }, {
    id: 2,
    number: 'CB-8002',
    direction: 'out',
    category: 'Salary',
    amount: 25000,
    on: iso(-5),
    party: 'Technicians',
    note: 'Staff salary'
  }, {
    id: 3,
    number: 'CB-8003',
    direction: 'in',
    category: 'Other income',
    amount: 2500,
    on: iso(-3),
    party: 'Scrap buyer',
    note: 'Old camera scrap'
  }],
  stock_moves: []
};

/* ---------------- derived report payloads ---------------- */
let dashCache = null;
function dashboardPayload() {
  refreshDerived();
  if (dashCache) return dashCache;
  const openLeads = DB.leads.filter(l => l.stage < 4);
  dashCache = {
    kpis: {
      revenue_month: monthCollected(),
      open_leads: openLeads.length,
      pipeline_value: openLeads.reduce((a, l) => a + l.value, 0),
      active_amc: DB.amc.length,
      open_tickets: DB.tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
      breaching_sla: DB.tickets.filter(t => t.sla_state === 'breached').length
    },
    insights: insightsPayload().slice(0, 3),
    funnel: [0, 1, 2, 3, 4].map(s => ({
      name: ['Enquiry', 'Survey', 'Quoted', 'Negotiation', 'Won'][s],
      count: DB.leads.filter(l => l.stage === s).length
    })),
    recent_quotes: DB.quotes.map(q => ({
      id: q.id,
      number: q.number,
      customer: q.customer,
      total: q.total,
      status: q.status
    }))
  };
  return dashCache;
}
function leadsBoardPayload() {
  const names = ['Enquiry', 'Survey', 'Quoted', 'Negotiation', 'Won'];
  return [0, 1, 2, 3, 4].map(s => {
    const items = DB.leads.filter(l => l.stage === s);
    return {
      stage: s,
      name: names[s],
      items,
      sum: items.reduce((a, l) => a + l.value, 0)
    };
  });
}
function invoiceStatsPayload() {
  const billed = DB.invoices.reduce((a, i) => a + i.total, 0);
  const received = DB.invoices.reduce((a, i) => a + i.paid, 0);
  const overdue = DB.invoices.filter(i => new Date(i.due_date) < TODAY && i.balance > 0).reduce((a, i) => a + i.balance, 0);
  return {
    billed,
    received,
    outstanding: billed - received,
    overdue
  };
}
function outstandingPayload() {
  return DB.invoices.filter(i => i.balance > 0).map(i => ({
    number: i.number,
    customer: i.customer?.name || '—',
    total: i.total,
    balance: i.balance,
    due_date: date(i.due_date),
    status: i.status
  }));
}
function warrantyPayload() {
  // v5: serials + ALL equipment (in and out of warranty), deduped by serial no.
  refreshDerived();
  const seen = new Set();
  const rows = [];
  DB.serials.filter(s => s.warranty_end || s.status === 'installed').forEach(s => {
    seen.add(s.serial_no);
    rows.push({
      serial_no: s.serial_no,
      product: s.product?.name || s.product,
      customer: s.customer?.name || '—',
      warranty_end: date(s.warranty_end),
      in_warranty: !!s.in_warranty
    });
  });
  DB.equipment.forEach(e => {
    const sn = e.serial?.serial_no;
    if (sn && seen.has(sn)) return;
    rows.push({
      serial_no: sn || '—',
      product: e.product?.name || e.name,
      customer: e.customer?.name || '—',
      warranty_end: date(e.warranty_end),
      in_warranty: !!e.in_warranty
    });
  });
  return rows;
}
function reportsPayload() {
  const st = invoiceStatsPayload();
  return [{
    key: 'sales',
    title: 'Sales — this month',
    value: lakh(monthCollected()),
    note: 'collected'
  }, {
    key: 'pipeline',
    title: 'Open pipeline',
    value: lakh(dashboardPayload().kpis.pipeline_value),
    note: DB.leads.filter(l => l.stage < 4).length + ' leads'
  }, {
    key: 'inventory',
    title: 'Stock value',
    value: lakh(DB.products.reduce((a, p) => a + p.purchase_price * p.stock, 0)),
    note: DB.products.length + ' SKUs'
  }, {
    key: 'amc',
    title: 'AMC contracts',
    value: String(DB.amc.length),
    value2: '',
    note: DB.amc.filter(a => a.status === 'expiring').length + ' expiring'
  }, {
    key: 'service',
    title: 'Open tickets',
    value: String(DB.tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length),
    note: DB.tickets.filter(t => t.sla_state === 'breached').length + ' breaching SLA'
  }, {
    key: 'outstanding',
    title: 'Receivables',
    value: lakh(st.outstanding),
    note: lakh(st.overdue) + ' overdue'
  }, {
    key: 'profit',
    title: 'Cash profit — this month',
    value: lakh(accountsPayload('month').profit),
    note: 'money in − money out'
  }];
}
function insightsPayload() {
  // v5: generated live from the actual data (was hardcoded demo text)
  refreshDerived();
  const out = [];
  const breached = DB.tickets.filter(t => t.sla_state === 'breached' && t.status !== 'resolved' && t.status !== 'closed');
  if (breached.length) out.push({
    tone: 'red',
    title: `${breached.length} ticket${breached.length > 1 ? 's' : ''} breaching SLA`,
    body: breached.slice(0, 3).map(t => `${t.customer?.name} — ${t.issue} (${t.number})`).join(' · ') + '. Assign or resolve today.'
  });
  const expiring = DB.amc.filter(a => a.status === 'expiring');
  if (expiring.length) out.push({
    tone: 'amber',
    title: `${expiring.length} AMC contract${expiring.length > 1 ? 's' : ''} expiring soon`,
    body: expiring.map(a => `${a.customer?.name} (${date(a.ends_on)})`).join(', ') + ` — ${lakh(expiring.reduce((s, a) => s + num(a.value), 0))} of recurring value at risk. Send renewals.`
  });
  const due = DB.invoices.filter(x => x.balance > 0);
  if (due.length) {
    const worst = [...due].sort((a, b) => b.balance - a.balance)[0];
    out.push({
      tone: 'amber',
      title: `${lakh(due.reduce((s, x) => s + x.balance, 0))} receivables outstanding`,
      body: `${worst.customer?.name} owes the most (${inr(worst.balance)} on ${worst.number}${worst.status === 'overdue' ? ', overdue' : ''}). Consider a WhatsApp reminder run.`
    });
  }
  const open = DB.leads.filter(l => l.stage < 4);
  if (open.length) {
    const hot = [...open].sort((a, b) => b.value - a.value)[0];
    out.push({
      tone: 'green',
      title: `Pipeline at ${lakh(open.reduce((s, l) => s + l.value, 0))}`,
      body: `${open.length} open lead${open.length > 1 ? 's' : ''}. Biggest: ${hot.name} (${inr(hot.value)}, ${['enquiry', 'survey', 'quoted', 'negotiation'][hot.stage]} stage) — push to close.`
    });
  }
  const low = DB.products.filter(p => p.reorder_level > 0 && p.stock <= p.reorder_level);
  if (low.length) {
    const onOrder = new Set(DB.purchaseOrders.filter(p => p.status === 'ordered' || p.status === 'partial').flatMap(p => (p.items || []).map(it => it.description)));
    out.push({
      tone: 'amber',
      title: `${low.length} product${low.length > 1 ? 's' : ''} below reorder level`,
      body: low.slice(0, 3).map(p => `${p.name} (${p.stock} left${onOrder.has(p.name) ? ', on order' : ''})`).join(' · ') + '. Raise purchase orders.'
    });
  }
  const lateRep = DB.repairs.filter(r => r.status !== 'delivered' && new Date(r.promised_on) < TODAY);
  if (lateRep.length) out.push({
    tone: 'red',
    title: `${lateRep.length} repair${lateRep.length > 1 ? 's' : ''} past promised date`,
    body: lateRep.slice(0, 3).map(r => `${r.number} · ${r.customer?.name} — ${r.device}`).join(' · ') + '. Update customers.'
  });
  if (!out.length) out.push({
    tone: 'green',
    title: 'All clear',
    body: 'No SLA breaches, overdue receivables, expiring AMCs or low stock right now.'
  });
  return out;
}
function searchNorm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function searchCompact(s) {
  return searchNorm(s).replace(/\s+/g, '');
}
function searchMatch(hay, q) {
  const nq = searchNorm(q);
  if (!nq) return false;
  const h = searchNorm(hay);
  const hc = searchCompact(hay);
  const qc = searchCompact(q);
  if (h.includes(nq) || qc && hc.includes(qc)) return true;
  return nq.split(/\s+/).every(t => t && (h.includes(t) || hc.includes(t)));
}
function searchRank(hay, q) {
  const h = searchNorm(hay);
  const nq = searchNorm(q);
  const hc = searchCompact(hay);
  const qc = searchCompact(q);
  if (h === nq || hc === qc) return 0;
  if (h.startsWith(nq) || hc.startsWith(qc)) return 1;
  if (h.split(' ').some(w => w.startsWith(nq))) return 2;
  return 3;
}
function searchTop(rows, hayFn, q, limit) {
  return rows.map((r, i) => ({
    r,
    i,
    rank: searchRank(hayFn(r), q)
  })).filter(x => searchMatch(hayFn(x.r), q)).sort((a, b) => a.rank - b.rank || a.i - b.i).slice(0, limit).map(x => x.r);
}
function searchPayload(q) {
  q = String(q || '').trim();
  return {
    results: {
      products: searchTop(DB.products, p => [p.sku, p.name, p.specs, p.category].join(' '), q, 20),
      customers: searchTop(DB.customers, c => [c.name, c.area, c.contact_name, c.phone].join(' '), q, 8),
      invoices: searchTop(DB.invoices, i => [i.number, i.customer?.name, i.note].join(' '), q, 8),
      serials: searchTop(DB.serials, s => [s.serial_no, s.product?.name, s.customer?.name].join(' '), q, 8),
      tickets: searchTop(DB.tickets, t => [t.number, t.issue, t.customer?.name].join(' '), q, 8),
      leads: searchTop(DB.leads, l => [l.name, l.requirement, l.source, l.segment].join(' '), q, 8)
    }
  };
}

/* ---------------- mock api router ---------------- */
function attachCustomerDetail(c) {
  const name = c && c.name;
  return {
    ...c,
    equipment: DB.equipment.filter(e => e.customer?.name === name).map(e => ({
      id: e.id,
      name: e.name,
      location: e.location
    })),
    credentials: DB.credentials.filter(cr => cr.customer?.name === name).map(cr => ({
      id: cr.id,
      label: cr.label,
      host: cr.host
    }))
  };
}
function route(path) {
  refreshDerived(); // v5: invoices→overdue, AMC→expiring/expired, warranty flags — always live
  const i = path.indexOf('?');
  const p = i < 0 ? path : path.slice(0, i);
  const params = new URLSearchParams(i < 0 ? '' : path.slice(i + 1));
  const filter = params.get('filter');
  const status = params.get('status');
  if (p === '/dashboard') return dashboardPayload();
  if (p === '/leads-board') return leadsBoardPayload();
  if (p === '/quotes') return {
    data: DB.quotes.filter(x => !filter || x.status === filter)
  };
  if (p === '/invoices') return {
    data: DB.invoices.filter(x => !status || x.status === status)
  };
  if (p === '/invoices-stats') return invoiceStatsPayload();
  if (p.startsWith('/invoices/') && p.endsWith('/whatsapp')) return {
    url: 'https://wa.me/?text=Invoice+reminder'
  };
  if (p === '/reports/outstanding') return outstandingPayload();
  if (p === '/reports/warranty') return warrantyPayload();
  if (p === '/reports') return reportsPayload();
  if (p === '/insights') return insightsPayload();
  if (p === '/customers') return {
    data: DB.customers.filter(x => !filter || x.type === filter).map(attachCustomerDetail)
  };
  if (p === '/jobs') return {
    data: DB.jobs
  };
  if (p === '/tickets') return {
    data: DB.tickets.filter(x => !status || x.status === status)
  };
  if (p === '/amc') return {
    data: DB.amc.filter(x => !filter || x.status === filter)
  };
  if (p.startsWith('/amc/') && p.endsWith('/renewal')) return {
    url: 'https://wa.me/?text=AMC+renewal'
  };
  if (p === '/equipment') return {
    data: DB.equipment
  };
  if (p === '/credentials') return {
    data: DB.credentials
  };
  if (p === '/products') {
    let data = DB.products;
    if (filter === 'out') data = data.filter(x => num(x.stock) <= 0);else if (filter === 'low') data = data.filter(x => num(x.stock) > 0 && num(x.reorder_level) > 0 && num(x.stock) <= num(x.reorder_level));else if (filter === 'in') data = data.filter(x => num(x.stock) > 0);
    return {
      data
    };
  }
  if (p === '/serials') return {
    data: DB.serials
  };
  if (p === '/purchase-orders') return {
    data: DB.purchaseOrders
  };
  if (p === '/repairs') return {
    data: DB.repairs.filter(x => !filter || x.status === filter)
  };
  if (p === '/accounts') return accountsPayload(params.get('period') || 'month');
  if (p.startsWith('/search')) return searchPayload(params.get('q'));
  return null;
}
const api = {
  get: path => new Promise(res => setTimeout(() => res(route(path)), 140)),
  post: (path, body) => new Promise(res => setTimeout(() => {
    if (path === '/login') {
      const session = authenticateCredentials(body && body.username, body && body.password);
      if (session) return res(session);
      return res({
        error: 'invalid'
      });
    }
    const adv = path.match(/^\/leads\/(\d+)\/advance$/);
    if (adv) {
      const l = DB.leads.find(x => x.id === +adv[1]);
      if (l && l.stage < 4) {
        l.stage++;
        if (l.stage === 4) ensureCustomer(l);
        afterMutation();
      }
      return res({
        ok: true
      });
    }
    res({
      ok: true
    });
  }, 140)),
  put: () => Promise.resolve({
    ok: true
  }),
  del: () => Promise.resolve({
    ok: true
  }),
  raw: async path => {
    if (path === '/backup/export') {
      return {
        blob: async () => buildBackupCsvBlob()
      };
    }
    throw new Error('not found');
  },
  upload: async (path, fd) => {
    if (path === '/backup/import') {
      const file = fd.get('file');
      const text = await file.text();
      const restored = await importBackupCsv(text);
      return {
        restored
      };
    }
    throw new Error('not found');
  }
};
const queuedCount = () => 0;
const flushQueue = async () => 0;

/* ---------------- useFetch ---------------- */
function useFetch(path, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reload = useCallback(() => {
    api.get(path).then(d => {
      setData(d);
      setError(null);
    }).catch(e => setError(e)).finally(() => setLoading(false));
  }, [path]);
  useEffect(() => {
    setLoading(true);
    reload();
    /* eslint-disable-next-line */
  }, deps);
  return {
    data,
    loading,
    error,
    reload,
    setData
  };
}

/* ====================================================================== */
/* ====================  UI primitives  ================================= */
/* ====================================================================== */
const ICONS = {
  search: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 21l-4.3-4.3"
  })),
  grid: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3.5",
    y: "3.5",
    width: "7",
    height: "7",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13.5",
    y: "3.5",
    width: "7",
    height: "7",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3.5",
    y: "13.5",
    width: "7",
    height: "7",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13.5",
    y: "13.5",
    width: "7",
    height: "7",
    rx: "1.5"
  })),
  users: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "8",
    r: "3.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3.5 19c.7-3 2.8-4.5 5.5-4.5s4.8 1.5 5.5 4.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "17",
    cy: "9",
    r: "2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M17.5 14c1.8.4 2.8 1.5 3.2 3.4"
  })),
  layers: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 3l9 5-9 5-9-5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 13l9 5 9-5"
  })),
  file: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M6 3h8l4 4v14H6z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 3v4h4"
  })),
  box: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 7.5l9 4.5 9-4.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 12v9"
  })),
  calendar: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3.5",
    y: "5",
    width: "17",
    height: "16",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 3v4M8 3v4M3.5 10.5h17"
  })),
  tag: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M20 12.5l-7.5 7.5L3 10.5V4h6.5z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7.5",
    cy: "8",
    r: "1.2"
  })),
  chart: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M5 20V12M11 20V5M17 20v-6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 20h18"
  })),
  bell: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M18 9a6 6 0 0 0-12 0c0 6.5-2.5 6.5-2.5 8.5h17C20.5 15.5 18 15.5 18 9z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.5 20.5a1.8 1.8 0 0 0 3 0"
  })),
  sliders: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M4 8h9M19 8h1M4 16h2M12 16h8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15.5",
    cy: "8",
    r: "2.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "16",
    r: "2.2"
  })),
  camera: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "2.5",
    y: "7",
    width: "12.5",
    height: "10",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 10.5l6.5-3v9l-6.5-3"
  })),
  plus: /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14M5 12h14"
  }),
  download: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 3v11"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7.5 10.5L12 15l4.5-4.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 20.5h16"
  })),
  upload: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 21V10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7.5 13.5L12 9l4.5 4.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 3.5h16"
  })),
  eye: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "2.4"
  })),
  printer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M7 8V3.5h10V8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 17H4v-7.5h16V17h-3"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "7",
    y: "14",
    width: "10",
    height: "6.5"
  })),
  send: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M21.5 2.5L11 13"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21.5 2.5L15 21l-4-8-8.5-4z"
  })),
  chevD: /*#__PURE__*/React.createElement("path", {
    d: "M6.5 9.5l5.5 5.5 5.5-5.5"
  }),
  chevL: /*#__PURE__*/React.createElement("path", {
    d: "M14.5 6.5L9 12l5.5 5.5"
  }),
  chevR: /*#__PURE__*/React.createElement("path", {
    d: "M9.5 6.5L15 12l-5.5 5.5"
  }),
  check: /*#__PURE__*/React.createElement("path", {
    d: "M5 13l4 4L19 7"
  }),
  clock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "8.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7.5V12l3 2"
  })),
  alert: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 3.5L22 20.5H2z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 10v4.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 17.6v.3"
  })),
  filter: /*#__PURE__*/React.createElement("path", {
    d: "M3.5 5h17l-6.7 7.8V19l-3.6 2v-8.2z"
  }),
  wrench: /*#__PURE__*/React.createElement("path", {
    d: "M14.8 6.2a4.2 4.2 0 0 0-5.6 5.6L3 18l3 3 6.2-6.2a4.2 4.2 0 0 0 5.6-5.6L15 12l-3-3z"
  }),
  key: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "8",
    cy: "15",
    r: "4.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M11 12l8.5-8.5M16 3.5l3 3M14 5.5l3 3"
  })),
  shield: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 12l2 2 4-4"
  })),
  barcode: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "5",
    width: "2",
    height: "14"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "7",
    y: "5",
    width: "1.4",
    height: "14"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "5",
    width: "3",
    height: "14"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "15",
    y: "5",
    width: "1.4",
    height: "14"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "18.5",
    y: "5",
    width: "2.5",
    height: "14"
  })),
  whatsapp: /*#__PURE__*/React.createElement("path", {
    d: "M12 3a9 9 0 0 0-7.7 13.6L3 21l4.6-1.2A9 9 0 1 0 12 3zm0 2a7 7 0 0 1 5.9 10.8l.7 2.6-2.6-.7A7 7 0 1 1 12 5zm-2.3 3c-.2 0-.5.1-.7.4-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.7 2.7 4.2 3.6 2 .8 2.4.7 2.9.6.5-.1 1.4-.6 1.6-1.2.2-.6.2-1 .1-1.2 0-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.6.8c-.1.1-.3.2-.5.1-.7-.3-1.4-.6-2.3-1.7-.2-.3 0-.4.1-.6l.4-.6c.1-.2 0-.4 0-.5l-.7-1.7c-.2-.4-.4-.4-.5-.4z"
  })
};
function Ic({
  n,
  s = 16,
  sw = 1.7,
  style
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: sw,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, ICONS[n]);
}
const AV_COLORS = ['#5b7fd4', '#b06fc9', '#4ca08a', '#cf8e4a', '#c96a6a', '#6a9bc9'];
function Av({
  name = '?',
  size = 26
}) {
  const ini = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return /*#__PURE__*/React.createElement("span", {
    className: "av",
    title: name,
    style: {
      width: size,
      height: size,
      fontSize: size * 0.37,
      background: AV_COLORS[h % AV_COLORS.length]
    }
  }, ini);
}
function Pill({
  t,
  dot,
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: 'pill pill-' + t
  }, dot ? /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }) : null, children);
}

/* ====================================================================== */
/* ====================  CREATE / EDIT machinery  ====================== */
/* ====================================================================== */
const TEAM = [{
  id: 1,
  name: 'smart',
  role: 'Owner',
  phone: '94261 77057',
  login_username: 'smart',
  login_password: '1234'
}, {
  id: 2,
  name: 'Rohit Sharma',
  role: 'Sales Lead',
  phone: '94261 77057'
}, {
  id: 3,
  name: 'Priya Kulkarni',
  role: 'Sales Executive',
  phone: '98500 22743'
}, {
  id: 4,
  name: 'Amit Naik',
  role: 'Sales Executive',
  phone: '98230 77561'
}, {
  id: 5,
  name: 'Akram Suli',
  role: 'Technician',
  phone: '98220 41187'
}, {
  id: 6,
  name: 'Vikram Jadhav',
  role: 'Senior Technician',
  phone: '98810 67234'
}, {
  id: 7,
  name: 'Santosh More',
  role: 'Technician',
  phone: '97650 28194'
}, {
  id: 8,
  name: 'Imran Shaikh',
  role: 'Technician',
  phone: '99201 44556'
}, {
  id: 9,
  name: 'Datta Pawar',
  role: 'Technician',
  phone: '98905 11220'
}];
function ensureTeamLoginDefaults() {
  TEAM.forEach(t => {
    if (!t.login_username && t.role === 'Owner' && String(t.name).toLowerCase() === 'smart') {
      t.login_username = 'smart';
      t.login_password = t.login_password || MASTER_LOGIN.password;
    }
  });
}
const teamNames = () => TEAM.map(t => t.name);

/* ---------------- company + quote catalog (persisted with ERP state) ---------------- */
const COMPANY_DEFAULT = {
  name: 'Smart Vision Enterprise',
  phone: '94261 77057',
  email: 'smartvisionenterprise20@gmail.com',
  web: 'www.smartvision.ink',
  address: 'G-9, City Point, Bus Station Road, Borsad - 388540',
  gstin: '24ABCDE1234F1Z5',
  logo: './assets/sv-logo.png',
  extras: 'Extra: CCTV cabling (incl. PVC pipe & laying) ₹65/Mtr · Camera fitting ₹250/No.',
  quoteTerms: 'Prices are inclusive of GST. 50% advance along with the order, balance on completion. Warranty as per brand standard. This quotation is valid for 15 days from the date above.',
  invoiceTerms: 'Thank you for your business. Please make payment by the due date via UPI / NEFT / cheque in favour of Smart Vision Enterprise.',
  ledgerCategories: []
};
const COMPANY = (() => {
  try {
    return {
      ...COMPANY_DEFAULT,
      ...JSON.parse(localStorage.getItem('sv_company') || '{}')
    };
  } catch {
    return {
      ...COMPANY_DEFAULT
    };
  }
})();
function saveCompany(patch) {
  Object.assign(COMPANY, patch);
  try {
    localStorage.setItem('sv_company', JSON.stringify(COMPANY));
  } catch (e) {/* ignore */}
  lastSaved = '';
  return afterMutation();
}
const HD_ITEMS = ['4 CH DVR', '2 MP HD Camera — 4 Nos', '1 TB HDD', 'Power Supply', 'Connector', 'Including 50 Mtr. Cable'];
const IP_ITEMS = ['4 CH NVR', '2 MP IP Camera — 4 Nos', '1 TB HDD', '4 Port POE', 'Connector', 'Including 50 Mtr. Cable'];
const PACKAGES = [{
  group: 'HD Camera Solution',
  brand: 'Dahua',
  price: 13250,
  items: HD_ITEMS
}, {
  group: 'HD Camera Solution',
  brand: 'Hikvision',
  price: 14200,
  items: HD_ITEMS
}, {
  group: 'HD Camera Solution',
  brand: 'Prama',
  price: 12499,
  items: HD_ITEMS
}, {
  group: 'IP Camera Solution',
  brand: 'Dahua',
  price: 25700,
  items: IP_ITEMS
}, {
  group: 'IP Camera Solution',
  brand: 'Hikvision',
  price: 27690,
  items: IP_ITEMS
}, {
  group: 'IP Camera Solution',
  brand: 'Prama',
  price: 24500,
  items: IP_ITEMS
}];
const EXTRAS_FALLBACK = 'Extra: CCTV cabling (incl. PVC pipe & laying) ₹65/Mtr · Camera fitting ₹250/No.';
const AMC_PACKAGES = [{
  group: 'AMC Plan',
  brand: 'Basic',
  price: 6000,
  items: ['2 preventive visits / year', 'Phone & remote support', 'Labour on call-out (parts extra)', 'Up to 8 cameras']
}, {
  group: 'AMC Plan',
  brand: 'Silver',
  price: 12000,
  items: ['4 preventive visits / year', 'Priority support', 'Free labour on visits', 'Up to 16 cameras + 1 NVR']
}, {
  group: 'AMC Plan',
  brand: 'Gold',
  price: 22000,
  items: ['6 visits / year + emergency', '24h SLA support', 'Free labour + 10% parts discount', 'Up to 32 cameras + 2 NVR']
}];
const CATALOG_DEFAULT = [...PACKAGES, ...AMC_PACKAGES].map((p, i) => ({
  id: i + 1,
  ...p,
  items: [...p.items]
}));
const CATALOG = (() => {
  try {
    const s = JSON.parse(localStorage.getItem('sv_catalog') || 'null');
    return Array.isArray(s) && s.length ? s : CATALOG_DEFAULT.map(p => ({
      ...p,
      items: [...p.items]
    }));
  } catch {
    return CATALOG_DEFAULT.map(p => ({
      ...p,
      items: [...p.items]
    }));
  }
})();
const CATALOG_GROUPS = ['HD Camera Solution', 'IP Camera Solution', 'AMC Plan'];
function saveCatalog() {
  try {
    localStorage.setItem('sv_catalog', JSON.stringify(CATALOG));
  } catch (e) {/* legacy cache */}
  lastSaved = '';
  return afterMutation();
}

/* ---------------- data persistence (server-shared, with local fallback) ----------------
   - If an ./api.php (or Python dev server) backend is reachable, ALL data is
     stored server-side in data.json, so every device/browser shares it.
   - If no backend (e.g. opened as a static file or on plain Netlify), it falls
     back to this browser's localStorage. */
const API_URL = './api.php';
const PERSIST_KEY = 'sv_state_v1';
const SAVE_FAIL_MSG = 'Could not save to disk. Keep the app open and try again, or export a backup from Settings.';
let serverOK = false;
function stateRecordCount(s) {
  if (!s || typeof s !== 'object') return 0;
  let n = 0;
  if (s.DB && typeof s.DB === 'object') {
    Object.values(s.DB).forEach(rows => {
      if (Array.isArray(rows)) n += rows.length;
    });
  }
  if (Array.isArray(s.TEAM)) n += s.TEAM.length;
  if (Array.isArray(s.CATALOG)) n += s.CATALOG.length;
  return n;
}
function applyCatalog(rows) {
  if (!Array.isArray(rows)) return;
  CATALOG.length = 0;
  rows.forEach(x => CATALOG.push(x));
}
function applyCompany(c) {
  if (!c || typeof c !== 'object') return;
  Object.assign(COMPANY, COMPANY_DEFAULT, c);
  if (!Array.isArray(COMPANY.ledgerCategories)) COMPANY.ledgerCategories = [];
}
function applyState(s, present) {
  derivedDirty = true;
  dashCache = null;
  if (!s) return;
  if (s.DB) {
    Object.keys(DB).forEach(k => {
      if (!Array.isArray(DB[k])) return;
      if (present && !present.has(k)) return;
      DB[k].length = 0;
      if (Array.isArray(s.DB[k])) s.DB[k].forEach(x => DB[k].push(x));
    });
  }
  if (!present || present.has('team')) {
    if (Array.isArray(s.TEAM)) {
      TEAM.length = 0;
      s.TEAM.forEach(x => TEAM.push(x));
    }
  }
  if (Array.isArray(s.CATALOG) && (!present || present.has('catalog'))) applyCatalog(s.CATALOG);
  if (s.COMPANY && (!present || present.has('company'))) applyCompany(s.COMPANY);
  if (s.revision != null) currentRevision = Number(s.revision) || 0;
  ensureTeamLoginDefaults();
  if (Erp) Erp.ensureSyncMeta({
    DB,
    TEAM,
    CATALOG,
    COMPANY
  }, {
    deviceId: getDeviceId()
  });
}
let currentRevision = 0;
function snapshotState() {
  const snap = {
    DB,
    TEAM,
    CATALOG,
    COMPANY: {
      ...COMPANY
    },
    savedAt: Date.now(),
    revision: currentRevision,
    device_id: getDeviceId()
  };
  if (Erp) Erp.ensureSyncMeta(snap, {
    deviceId: getDeviceId()
  });
  return snap;
}
let lastSaved = '';
let persistQueue = Promise.resolve();
let persistWanted = false;
function markSaved(payload) {
  lastSaved = payload;
}
async function persistStateNow() {
  let payload;
  try {
    payload = JSON.stringify(snapshotState());
  } catch (e) {
    return false;
  }
  if (payload === lastSaved) return true;
  let localOk = true;
  try {
    localStorage.setItem(PERSIST_KEY, payload);
  } catch (e) {
    localOk = false;
  }
  if (!serverOK || getPairing()) {
    if (localOk) markSaved(payload);
    return localOk;
  }
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    });
    const ok = localOk && !!(res && res.ok);
    if (ok) markSaved(payload);
    return ok;
  } catch (e) {
    return false;
  }
}
function writeStateSync() {
  let payload;
  try {
    payload = JSON.stringify(snapshotState());
  } catch (e) {
    return;
  }
  if (payload === lastSaved) return;
  try {
    localStorage.setItem(PERSIST_KEY, payload);
  } catch (e) {/* ignore */}
  if (serverOK && !getPairing()) {
    try {
      fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: payload,
        keepalive: true
      });
    } catch (e) {/* ignore */}
    return;
  }
  markSaved(payload);
}
function pairingAuthHeaders(p) {
  const pair = p || getPairing();
  if (!pair || !pair.token) return {};
  return {
    Authorization: 'Bearer ' + pair.token,
    'Content-Type': 'application/json'
  };
}
function shopUrl(path) {
  const pair = getPairing();
  const base = pair && pair.url || (typeof window !== 'undefined' ? window.location.origin : '');
  return String(base).replace(/\/+$/, '') + path;
}
async function pairWithShop({
  url,
  pin
}) {
  const base = String(url || '').trim().replace(/\/+$/, '');
  const res = await fetch(base + '/api/pair', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pin: String(pin || '').trim(),
      device_id: getDeviceId()
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Pairing failed');
  setPairing({
    url: base,
    token: data.token,
    prefix: data.prefix,
    device_id: data.device_id
  });
  try {
    localStorage.setItem('sv_number_prefix', data.prefix || '');
    if (data.device_id) localStorage.setItem('sv_device_id', data.device_id);
  } catch (e) {/* ignore */}
  if (data.snapshot) {
    applyState(data.snapshot);
    currentRevision = num(data.snapshot.revision);
    lastSaved = '';
    await persistStateNow();
  }
  return data;
}
async function syncWithShop() {
  const pair = getPairing();
  if (!pair || !Erp) throw new Error('Not paired with a shop PC.');
  await persistStateNow();
  const local = snapshotState();
  const body = Erp.collectPending(local, currentRevision);
  body.deletes = pendingDeletes.slice();
  body.device_id = getDeviceId();
  body.base_revision = currentRevision;
  const post = async payload => fetch(shopUrl('/api/sync'), {
    method: 'POST',
    headers: pairingAuthHeaders(pair),
    body: JSON.stringify(payload)
  });
  let res = await post(body);
  let data = await res.json().catch(() => ({}));
  if (res.status === 409 && data.snapshot) {
    const retry = Erp.localOnlyPayload(data.snapshot, local);
    retry.deletes = pendingDeletes.slice();
    retry.device_id = getDeviceId();
    retry.base_revision = num(data.snapshot.revision);
    applyState(Erp.rebaseLocal(data.snapshot, local));
    res = await post(retry);
    data = await res.json().catch(() => ({}));
  }
  if (!res.ok || !data.ok) throw new Error(data.error || 'Sync failed');
  if (data.snapshot) {
    applyState(data.snapshot);
    currentRevision = num(data.snapshot.revision);
  } else if (data.revision != null) currentRevision = num(data.revision);
  pendingDeletes.length = 0;
  lastSaved = '';
  await persistStateNow();
  try {
    localStorage.setItem('sv_last_sync', new Date().toISOString());
  } catch (e) {/* ignore */}
  return data;
}
async function unpairShop() {
  setPairing(null);
  try {
    localStorage.removeItem('sv_number_prefix');
  } catch (e) {/* ignore */}
}
function tableCount(state, key) {
  const rows = state && state.DB && state.DB[key];
  return Array.isArray(rows) ? rows.length : 0;
}
function shouldPreferLocalSnapshot(localState, serverState, lc, sc, lAt, sAt) {
  if (lAt > sAt) return true;
  if (lAt < sAt) return false;
  if (lc > sc) return true;
  if (lc < sc) return false;
  for (const k of Object.keys(DB)) {
    const dl = tableCount(localState, k);
    const ds = tableCount(serverState, k);
    if (dl !== ds) return dl > ds;
  }
  const lcCat = Array.isArray(localState && localState.CATALOG) ? localState.CATALOG.length : 0;
  const scCat = Array.isArray(serverState && serverState.CATALOG) ? serverState.CATALOG.length : 0;
  if (lcCat !== scCat) return lcCat > scCat;
  const lt = Array.isArray(localState && localState.TEAM) ? localState.TEAM.length : 0;
  const st = Array.isArray(serverState && serverState.TEAM) ? serverState.TEAM.length : 0;
  if (lt !== st) return lt > st;
  return false;
}
async function commitChange(work) {
  if (work) await Promise.resolve(work());
  const ok = await afterMutation();
  if (!ok && typeof alert === 'function') alert(SAVE_FAIL_MSG);
  return ok;
}
function afterMutation() {
  persistWanted = true;
  derivedDirty = true;
  dashCache = null;
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('sv-persist-start'));
    } catch (e) {/* ignore */}
  }
  persistQueue = persistQueue.then(async () => {
    let lastOk = true;
    while (persistWanted) {
      persistWanted = false;
      lastOk = await persistStateNow();
    }
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('sv-persist', {
          detail: {
            ok: lastOk
          }
        }));
      } catch (e) {/* ignore */}
    }
    return lastOk;
  });
  return persistQueue;
}
async function loadServerState() {
  try {
    const res = await fetch(API_URL + '?t=' + Date.now());
    if (!res || !res.ok) return null;
    serverOK = true;
    if (typeof res.text === 'function') {
      const raw = await res.text();
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }
    if (typeof res.json === 'function') {
      try {
        return await res.json();
      } catch (e) {
        return null;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}
function finishBoot(serverState, localState) {
  const sc = stateRecordCount(serverState);
  const lc = stateRecordCount(localState);
  const sAt = Number(serverState && serverState.savedAt) || 0;
  const lAt = Number(localState && localState.savedAt) || 0;
  if (sc > 0 && lc > 0) {
    if (shouldPreferLocalSnapshot(localState, serverState, lc, sc, lAt, sAt)) applyState(localState);else applyState(serverState);
  } else if (sc > 0) {
    applyState(serverState);
  } else if (lc > 0) {
    applyState(localState);
  }
  ensureTeamLoginDefaults();
  healAcceptedQuoteLinks();
  try {
    const leg = JSON.parse(localStorage.getItem('sv_catalog') || 'null');
    if (Array.isArray(leg) && leg.length && leg.length > CATALOG.length) applyCatalog(leg);
  } catch (e) {/* ignore */}
  if (serverOK && (sc > 0 || lc > 0)) afterMutation();
}
let bootReady = false;
const bootPromise = (async () => {
  let localState = null;
  try {
    localState = JSON.parse(localStorage.getItem(PERSIST_KEY) || 'null');
  } catch (e) {/* ignore */}
  if (stateRecordCount(localState) > 0) applyState(localState);
  const serverState = await loadServerState();
  finishBoot(serverState, localState);
  bootReady = true;
})().catch(() => {
  bootReady = true;
});
function persistState() {
  afterMutation();
}
if (typeof window !== 'undefined') {
  setInterval(persistState, 1500);
  window.addEventListener('beforeunload', writeStateSync);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) writeStateSync();
  });
}

/* ---------------- CSV backup / restore (Excel-friendly v2 + legacy v1) ---------------- */
const SvCsv = typeof globalThis !== 'undefined' && globalThis.SvBackupCsv || (typeof require === 'function' ? (() => {
  try {
    return require('./backup-csv');
  } catch (e) {
    return null;
  }
})() : null);
if (!SvCsv) throw new Error('backup-csv.js not loaded — include app/backup-csv.js before the app');
const BACKUP_CSV_MARKER = SvCsv.MARKER_V2 || SvCsv.MARKER;
function buildBackupCsvText() {
  return SvCsv.stateToCsv(snapshotState());
}
function buildBackupCsvBlob() {
  return new Blob([buildBackupCsvText()], {
    type: 'text/csv;charset=utf-8'
  });
}
function parseBackupCsv(text) {
  const {
    state,
    counts,
    sections
  } = SvCsv.csvToState(text);
  return {
    newDB: state.DB || {},
    newTeam: state.TEAM || [],
    newCatalog: state.CATALOG,
    newCompany: state.COMPANY,
    counts,
    sections
  };
}
async function importBackupCsv(text) {
  const {
    newDB,
    newTeam,
    newCatalog,
    newCompany,
    counts,
    sections
  } = parseBackupCsv(text);
  const present = new Set(Array.isArray(sections) && sections.length ? sections : Object.keys(newDB || {}));
  if (Array.isArray(newTeam)) present.add('team');
  if (newCatalog) present.add('catalog');
  if (newCompany) present.add('company');
  const omitted = Object.keys(DB).filter(k => k !== 'stock_moves' && Array.isArray(DB[k]) && DB[k].length > 0 && !present.has(k));
  if (omitted.length) {
    throw new Error('Incomplete backup (missing ## ' + omitted.join(', ## ') + '). Restore cancelled so live data is not wiped.');
  }
  applyState({
    DB: newDB,
    TEAM: newTeam,
    CATALOG: newCatalog,
    COMPANY: newCompany
  }, present);
  lastSaved = '';
  await persistStateNow();
  return counts;
}
async function flushToServer() {
  await persistStateNow();
}
if (typeof window !== 'undefined') {
  window.__svFlush = flushToServer;
  window.flushToServer = flushToServer;
}
function countCsvRecords(csvText) {
  return SvCsv.countCsvRecords(csvText);
}
async function downloadBackupCsv(csvText, filename) {
  if (typeof window !== 'undefined' && window.electronAPI?.saveBackupCsv) {
    const r = await window.electronAPI.saveBackupCsv(csvText, filename);
    if (r?.ok) return r.path || null;
  }
  const blob = new Blob([csvText], {
    type: 'text/csv;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return null;
}
const nextId = arr => Erp ? Erp.nextId(arr) : arr.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
const num = v => Number(v) || 0;
const touch = row => Erp ? Erp.stampRow(row, getDeviceId()) : row;
const genNum = (prefix, arr, base) => {
  if (Erp) return Erp.genNum(prefix, arr, base, getNumberPrefix());
  const mx = arr.reduce((m, x) => {
    const n = parseInt(String(x.number || '').replace(/^\D+/, ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, base);
  return prefix + (mx + 1);
};
function recordStockMove(product, qty, reason, ref) {
  if (!qty) return;
  if (Erp) {
    Erp.appendStockMove({
      DB,
      TEAM,
      CATALOG,
      COMPANY
    }, {
      product,
      qty,
      reason,
      ref,
      deviceId: getDeviceId()
    });
    Erp.recomputeStock({
      DB,
      TEAM,
      CATALOG,
      COMPANY
    });
    const live = (DB.products || []).find(x => x === product || product && (x.uuid && x.uuid === product.uuid || x.id && x.id === product.id || x.sku && x.sku === product.sku));
    if (live && product && product !== live) product.stock = live.stock;
    return;
  }
  if (product) product.stock = Math.max(0, num(product.stock) + qty);
}

/* ================== v5: cross-module wiring helpers ================== */
// Lifetime value = total billed to the customer. Bumped on every invoice.
function bumpLTV(name, amount) {
  const c = DB.customers.find(x => x.name === name);
  if (c) c.lifetime_value = num(c.lifetime_value) + num(amount);
}
// One place that creates invoices — used by manual create, accepted quotes,
// AMC billing and chargeable repairs — so LTV & numbering stay consistent.
function findProductForLine(desc, productId) {
  const pid = num(productId);
  if (pid) {
    const byId = DB.products.find(x => x.id === pid);
    if (byId) return byId;
  }
  const d = String(desc || '').trim();
  if (!d) return null;
  const exact = DB.products.find(x => x.name === d);
  if (exact) return exact;
  let best = null;
  DB.products.forEach(p => {
    if (d.includes(p.name) && (!best || p.name.length > best.name.length)) best = p;
  });
  return best;
}
function parseQtyFromDescription(desc) {
  const d = String(desc || '');
  const m = d.match(/[×x]\s*(\d+)\s*$/i) || d.match(/\b(\d+)\s*(?:nos|units|pcs)\b/i);
  return m ? num(m[1]) : 0;
}
function lineItemQty(it) {
  const fromField = num(it.qty);
  if (fromField > 0) return fromField;
  const fromDesc = parseQtyFromDescription(it.description);
  return fromDesc > 0 ? fromDesc : 1;
}
function normalizeQuoteItems(raw) {
  const out = [];
  (raw || []).forEach(i => {
    const description = String(i.description || '').trim();
    if (!description) return;
    const p = findProductForLine(description, i.product_id);
    const qty = lineItemQty(i);
    out.push({
      id: out.length + 1,
      description,
      amount: num(i.amount),
      qty,
      product_id: p ? p.id : num(i.product_id) || null
    });
  });
  return out;
}
function validateStockForLines(lines) {
  const warnings = [];
  let blocked = false;
  (lines || []).forEach(it => {
    const qty = lineItemQty(it);
    const p = findProductForLine(it.description, it.product_id);
    if (!p) return;
    if (p.track_serials) {
      warnings.push(`${p.name}: assign ${qty} serial(s) via Serials / Equipment (not auto-deducted on invoice)`);
      return;
    }
    if (num(p.stock) < qty) {
      warnings.push(`${p.name}: need ${qty}, only ${p.stock} in stock — invoice will still save, restock from Inventory`);
    }
  });
  return {
    warnings,
    blocked
  };
}
function issueStockFromLines(lines, {
  allowNegative = false
} = {}) {
  const warnings = [];
  (lines || []).forEach(it => {
    const qty = lineItemQty(it);
    const p = findProductForLine(it.description, it.product_id);
    if (!p) return;
    if (p.track_serials) return;
    if (!allowNegative && num(p.stock) < qty) return;
    recordStockMove(p, -qty, 'issue', '');
  });
  return warnings;
}
function createInvoice({
  customer,
  total,
  dueDays = 15,
  items = [],
  note = '',
  issueStock = true,
  persist = true
}) {
  const t = num(total);
  const normItems = items && items.length ? normalizeQuoteItems(items) : [];
  const inv = {
    id: nextId(DB.invoices),
    number: genNum('INV-', DB.invoices, 2000),
    customer: O(customer),
    total: t,
    paid: 0,
    balance: t,
    status: 'sent',
    issue_date: iso(0),
    due_date: iso(dueDays),
    items: normItems.length ? normItems : items,
    note,
    payments: []
  };
  if (issueStock && normItems.length) {
    const pre = validateStockForLines(normItems);
    if (pre.blocked) {
      if (typeof alert === 'function') alert('Invoice not created — fix stock first:\n' + pre.warnings.join('\n'));
      return null;
    }
    issueStockFromLines(normItems);
    if (pre.warnings.length) inv.stock_note = pre.warnings.join('; ');
  }
  touch(inv);
  (inv.items || []).forEach(it => touch(it));
  DB.invoices.push(inv);
  bumpLTV(customer, t);
  if (persist) afterMutation();
  return inv;
}
function healAcceptedQuoteLinks() {
  DB.quotes.forEach(q => {
    if (q.status !== 'accepted' || q.converted) return;
    const inv = DB.invoices.find(i => i.note === 'From ' + q.number || i.customer?.name === q.customer?.name && Math.abs(num(i.total) - num(q.total)) < 1);
    const job = DB.jobs.find(j => j.customer?.name === q.customer?.name && String(j.scope || '').includes(q.number));
    if (inv || job) {
      q.converted = true;
      if (inv && !q.invoice_number) q.invoice_number = inv.number;
      if (job && !q.job_number) q.job_number = job.number;
    }
  });
}
// Lead won → make sure the customer exists in the Customers module.
function ensureCustomer(lead) {
  if (!lead || DB.customers.some(c => c.name === lead.name)) return;
  const row = {
    id: nextId(DB.customers),
    name: lead.name,
    area: '',
    type: lead.segment || 'Commercial',
    contact_name: '',
    phone: '',
    sites: 1,
    owner: O(lead.owner?.name || teamNames()[0]),
    lifetime_value: 0
  };
  touch(row);
  DB.customers.push(row);
}
// Accepted quote → invoice + installation job + mark lead as Won (once).
function convertQuote(q) {
  if (!q || q.converted || q.status !== 'accepted') return false;
  if (q.invoice_number) {
    q.converted = true;
    return false;
  }
  const custName = q.customer?.name;
  if (!custName) return false;
  q.converted = true;
  const lead = DB.leads.find(l => l.name === custName && l.stage < 4);
  if (lead) {
    lead.stage = 4;
    ensureCustomer(lead);
  }
  if (!DB.customers.some(c => c.name === custName)) ensureCustomer({
    name: custName,
    segment: 'Commercial',
    owner: q.owner
  });
  const inv = createInvoice({
    customer: custName,
    total: q.total,
    items: q.items || [],
    note: 'From ' + q.number,
    persist: false
  });
  if (!inv) {
    q.converted = false;
    return false;
  }
  q.invoice_number = inv.number;
  if (inv.stock_note) q.stock_note = inv.stock_note;
  const job = {
    id: nextId(DB.jobs),
    number: genNum('JOB-', DB.jobs, 3000),
    customer: O(custName),
    type: 'install',
    scope: q.scope || 'Installation per ' + q.number,
    scheduled_on: iso(3),
    slot: 'TBD',
    technician: null,
    status: 'unassigned',
    checklist: []
  };
  touch(job);
  DB.jobs.push(job);
  q.job_number = job.number;
  touch(q);
  afterMutation();
  return true;
}
// PO received → stock in (matches line items to products by name, once).
function receivePO(po) {
  if (!po || po.stocked) return;
  po.stocked = true;
  if (!po.received_on) po.received_on = iso(0);
  (po.items || []).forEach(it => {
    const p = DB.products.find(x => x.name === it.description);
    if (p) {
      recordStockMove(p, num(it.qty), 'receive', po.number);
    }
  });
  touch(po);
  afterMutation();
}
// Live derived statuses — recomputed from dates on every read so nothing
// stays frozen in time (invoices→overdue, AMC→expiring/expired, warranty).
let derivedDirty = true;
let derivedDay = '';
function refreshDerived() {
  const now = TODAY.getTime();
  const day = TODAY.toISOString().slice(0, 10);
  if (!derivedDirty && day === derivedDay) return;
  derivedDirty = false;
  derivedDay = day;
  DB.invoices.forEach(i => {
    i.balance = num(i.total) - num(i.paid);
    if (i.balance <= 0 && num(i.total) > 0) i.status = 'paid';else if (new Date(i.due_date).getTime() < now && i.balance > 0) i.status = 'overdue';else if (num(i.paid) > 0) i.status = 'partial';else if (i.status === 'paid' || i.status === 'overdue' || i.status === 'partial') i.status = 'sent';
  });
  DB.amc.forEach(a => {
    const end = new Date(a.ends_on).getTime();
    a.status = end < now ? 'expired' : end < now + 30 * 864e5 ? 'expiring' : 'active';
  });
  DB.equipment.forEach(e => {
    if (e.warranty_end) e.in_warranty = new Date(e.warranty_end).getTime() > now;
  });
  DB.serials.forEach(s => {
    if (s.warranty_end) s.in_warranty = new Date(s.warranty_end).getTime() > now;
  });
}
// Payments collected in the current calendar month (uses the v5 payments log;
// seeded invoices without a log are attributed to their issue month).
function monthCollected() {
  const y = TODAY.getFullYear(),
    m = TODAY.getMonth();
  const inMonth = d => {
    const x = new Date(d);
    return x.getFullYear() === y && x.getMonth() === m;
  };
  return DB.invoices.reduce((a, i) => {
    if (Array.isArray(i.payments) && i.payments.length) return a + i.payments.filter(p => inMonth(p.on)).reduce((s, p) => s + num(p.amount), 0);
    return a + (inMonth(i.issue_date) ? num(i.paid) : 0);
  }, 0);
}
function parseEntryDate(v) {
  const s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T12:00:00').toISOString();
  if (s && !Number.isNaN(new Date(s).getTime())) return new Date(s).toISOString();
  return iso(0);
}
function inAccountsPeriod(d, period) {
  if (period !== 'month') return true;
  const x = new Date(d);
  return x.getFullYear() === TODAY.getFullYear() && x.getMonth() === TODAY.getMonth();
}
function ensureLedger() {
  if (!Array.isArray(DB.ledger)) DB.ledger = [];
}
function invoiceCashMoves() {
  const rows = [];
  DB.invoices.forEach(i => {
    if (Array.isArray(i.payments) && i.payments.length) {
      i.payments.forEach((p, idx) => {
        const amt = num(p.amount);
        if (amt <= 0) return;
        rows.push({
          id: 'inv-' + i.id + '-' + idx,
          source: 'invoice',
          direction: 'in',
          category: 'Customer collection',
          amount: amt,
          on: p.on || i.issue_date,
          party: i.customer?.name || '—',
          note: i.number,
          number: i.number,
          locked: true
        });
      });
      return;
    }
    const amt = num(i.paid);
    if (amt <= 0) return;
    rows.push({
      id: 'inv-' + i.id,
      source: 'invoice',
      direction: 'in',
      category: 'Customer collection',
      amount: amt,
      on: i.issue_date,
      party: i.customer?.name || '—',
      note: i.number,
      number: i.number,
      locked: true
    });
  });
  return rows;
}
function purchaseCashMoves() {
  return DB.purchaseOrders.filter(p => p.status === 'received' || p.stocked).map(p => ({
    id: 'po-' + p.id,
    source: 'purchase',
    direction: 'out',
    category: 'Purchase',
    amount: num(p.total),
    on: p.received_on || p.eta || p.ordered_on,
    party: p.supplier?.name || '—',
    note: p.number,
    number: p.number,
    locked: true
  })).filter(r => r.amount > 0);
}
function ledgerCashMoves() {
  ensureLedger();
  return DB.ledger.map(e => ({
    id: e.id,
    source: 'ledger',
    direction: e.direction === 'out' ? 'out' : 'in',
    category: e.category || 'Miscellaneous',
    amount: num(e.amount),
    on: e.on,
    party: e.party || '—',
    note: e.note || '',
    number: e.number,
    locked: false
  })).filter(r => r.amount > 0);
}
function accountsPayload(period) {
  ensureLedger();
  const p = period === 'all' ? 'all' : 'month';
  const rows = [...invoiceCashMoves(), ...purchaseCashMoves(), ...ledgerCashMoves()].filter(r => inAccountsPeriod(r.on, p)).sort((a, b) => new Date(b.on) - new Date(a.on));
  const money_in = rows.filter(r => r.direction === 'in').reduce((a, r) => a + r.amount, 0);
  const money_out = rows.filter(r => r.direction === 'out').reduce((a, r) => a + r.amount, 0);
  const collections = rows.filter(r => r.direction === 'in' && r.source === 'invoice').reduce((a, r) => a + r.amount, 0);
  const other_in = rows.filter(r => r.direction === 'in' && r.source !== 'invoice').reduce((a, r) => a + r.amount, 0);
  const purchases = rows.filter(r => r.source === 'purchase').reduce((a, r) => a + r.amount, 0);
  const expenses = rows.filter(r => r.direction === 'out' && r.source !== 'purchase').reduce((a, r) => a + r.amount, 0);
  const billed = DB.invoices.filter(i => inAccountsPeriod(i.issue_date, p)).reduce((a, i) => a + num(i.total), 0);
  const profit = money_in - money_out;
  const margin = money_in > 0 ? Math.round(profit / money_in * 100) : 0;
  const book_profit = billed - purchases - expenses + other_in;
  return {
    period: p,
    rows,
    money_in,
    money_out,
    profit,
    margin,
    billed,
    collections,
    other_in,
    purchases,
    expenses,
    book_profit
  };
}
// Customer rename cascades to every module that links by name.
function cascadeCustomerRename(oldName, newName) {
  const fix = o => {
    if (o && o.name === oldName) o.name = newName;
  };
  DB.leads.forEach(l => {
    if (l.name === oldName) l.name = newName;
  });
  DB.quotes.forEach(q => fix(q.customer));
  DB.invoices.forEach(i => fix(i.customer));
  DB.jobs.forEach(j => fix(j.customer));
  DB.tickets.forEach(t => fix(t.customer));
  DB.amc.forEach(a => fix(a.customer));
  DB.equipment.forEach(e => fix(e.customer));
  DB.credentials.forEach(c => fix(c.customer));
  DB.serials.forEach(s => fix(s.customer));
  DB.repairs.forEach(r => fix(r.customer));
}
function cascadeCustomerDelete(name) {
  const match = row => row?.customer?.name === name;
  const strip = arr => {
    for (let k = arr.length - 1; k >= 0; k--) if (match(arr[k])) arr.splice(k, 1);
  };
  strip(DB.quotes);
  strip(DB.invoices);
  strip(DB.jobs);
  strip(DB.tickets);
  strip(DB.amc);
  strip(DB.equipment);
  strip(DB.credentials);
  strip(DB.serials);
  strip(DB.repairs);
  for (let k = DB.leads.length - 1; k >= 0; k--) if (DB.leads[k].name === name) DB.leads.splice(k, 1);
}
const customerLinkCount = name => DB.quotes.filter(q => q.customer?.name === name).length + DB.invoices.filter(i => i.customer?.name === name).length + DB.jobs.filter(j => j.customer?.name === name).length + DB.tickets.filter(t => t.customer?.name === name).length + DB.amc.filter(a => a.customer?.name === name).length + DB.equipment.filter(e => e.customer?.name === name).length + DB.serials.filter(s => s.customer?.name === name).length + DB.repairs.filter(r => r.customer?.name === name).length;
// Team rename/remove cascades to owner / technician / assignee links.
function cascadeTeamRename(oldName, newName) {
  const fix = o => {
    if (o && o.name === oldName) o.name = newName;
  };
  DB.leads.forEach(l => fix(l.owner));
  DB.quotes.forEach(q => fix(q.owner));
  DB.customers.forEach(c => fix(c.owner));
  DB.jobs.forEach(j => fix(j.technician));
  DB.tickets.forEach(t => fix(t.assignee));
  DB.repairs.forEach(r => fix(r.technician));
}
function cascadeTeamRemove(name) {
  const fallback = TEAM.find(t => t.name !== name)?.name || null;
  DB.leads.forEach(l => {
    if (l.owner?.name === name) l.owner = fallback ? O(fallback) : null;
  });
  DB.quotes.forEach(q => {
    if (q.owner?.name === name) q.owner = fallback ? O(fallback) : null;
  });
  DB.customers.forEach(c => {
    if (c.owner?.name === name) c.owner = fallback ? O(fallback) : null;
  });
  DB.jobs.forEach(j => {
    if (j.technician?.name === name) j.technician = null;
  });
  DB.tickets.forEach(t => {
    if (t.assignee?.name === name) t.assignee = null;
  });
  DB.repairs.forEach(r => {
    if (r.technician?.name === name) r.technician = null;
  });
}
// WhatsApp — opens WhatsApp Web via API; quotes/invoices also generate a PDF for attach.
async function waSend({
  customerName,
  message,
  kind,
  doc
}) {
  if (!customerName) return;
  try {
    const res = await fetch('./api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerName,
        message,
        kind: kind || null,
        doc: doc || null,
        company: {
          ...COMPANY
        }
      })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      alert(data.error || 'Could not open WhatsApp.');
      return;
    }
    const pdfFullUrl = data.pdfUrl ? window.location.origin + data.pdfUrl : null;
    const waMe = data.whatsappWebUrl && String(data.whatsappWebUrl).includes('web.whatsapp.com') ? data.whatsappWebUrl.replace('https://web.whatsapp.com/send', 'https://wa.me/' + (data.phone || '')).replace(/phone=\d+&text=/, '') : null;
    const mobileWa = data.phone ? 'https://wa.me/' + data.phone + '?text=' + encodeURIComponent(message) : data.whatsappWebUrl;
    if (isApkShell()) {
      window.open(mobileWa, '_blank', 'noopener,noreferrer');
      return;
    }
    if (window.electronAPI && window.electronAPI.whatsappOpen) {
      await window.electronAPI.whatsappOpen({
        whatsappWebUrl: data.whatsappWebUrl,
        pdfUrl: pdfFullUrl,
        filename: data.filename
      });
      return;
    }
    window.open(data.whatsappWebUrl, '_blank', 'noopener,noreferrer');
    if (pdfFullUrl && data.filename) {
      const a = document.createElement('a');
      a.href = pdfFullUrl;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      alert('WhatsApp Web opened in your browser.\n\nOpen the document tab → Print → Save as PDF, then attach the PDF in WhatsApp (📎).');
    }
  } catch (e) {
    alert('WhatsApp send failed. Check your connection and try again.');
  }
}
function waOpen(custName, message, docOpts) {
  waSend({
    customerName: custName,
    message,
    kind: docOpts && docOpts.kind,
    doc: docOpts && docOpts.doc
  });
}
const custNames = () => DB.customers.map(c => c.name);
const prodNames = () => DB.products.map(p => p.name);
const suppNames = () => [...new Set(DB.purchaseOrders.map(p => p.supplier?.name).filter(Boolean))];
const LEDGER_DEFAULT_CATS = ['Rent', 'Salary', 'Travel', 'Fuel', 'Tools', 'Office', 'Tax', 'Petty cash', 'Other income', 'Owner capital', 'Supplier refund', 'Miscellaneous'];
function rememberLedgerCategory(name) {
  const n = String(name || '').trim();
  if (!n) return '';
  if (!Array.isArray(COMPANY.ledgerCategories)) COMPANY.ledgerCategories = [];
  const exists = [...LEDGER_DEFAULT_CATS, ...COMPANY.ledgerCategories].some(c => String(c).toLowerCase() === n.toLowerCase());
  if (!exists) COMPANY.ledgerCategories.push(n);
  return n;
}
function resolveLedgerCategory(v) {
  const custom = String(v && v.new_category || '').trim();
  const picked = String(v && v.category || '').trim();
  const name = rememberLedgerCategory(custom || picked) || 'Miscellaneous';
  return name;
}
function ledgerCatNames() {
  if (!Array.isArray(COMPANY.ledgerCategories)) COMPANY.ledgerCategories = [];
  const used = (DB.ledger || []).map(e => e.category).filter(Boolean);
  const all = [...LEDGER_DEFAULT_CATS, ...COMPANY.ledgerCategories, ...used];
  const seen = new Set();
  return all.filter(c => {
    const k = String(c || '').trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
const ENTITIES = {
  lead: {
    label: 'Lead',
    fields: [{
      key: 'name',
      label: 'Lead name'
    }, {
      key: 'requirement',
      label: 'Requirement',
      type: 'textarea'
    }, {
      key: 'value',
      label: 'Estimated value (₹)',
      type: 'number'
    }, {
      key: 'source',
      label: 'Source',
      type: 'select',
      options: ['Referral', 'IndiaMART', 'JustDial', 'Existing', 'Walk-in']
    }, {
      key: 'segment',
      label: 'Segment',
      type: 'select',
      options: ['Residential', 'Commercial', 'Industrial']
    }, {
      key: 'owner',
      label: 'Owner',
      type: 'select',
      options: teamNames
    }, {
      key: 'stage',
      label: 'Stage',
      type: 'select',
      options: [['0', 'Enquiry'], ['1', 'Survey'], ['2', 'Quoted'], ['3', 'Negotiation'], ['4', 'Won']],
      default: '0'
    }],
    create: v => DB.leads.push({
      id: nextId(DB.leads),
      name: v.name,
      requirement: v.requirement,
      value: num(v.value),
      source: v.source || 'Referral',
      segment: v.segment || 'Commercial',
      owner: O(v.owner || teamNames()[0]),
      stage: num(v.stage)
    })
  },
  quote: {
    label: 'Quotation',
    fields: [{
      key: 'customer',
      label: 'Customer',
      type: 'select',
      options: custNames
    }, {
      key: 'scope',
      label: 'Scope',
      type: 'textarea'
    }, {
      key: 'total',
      label: 'Value (₹)',
      type: 'number'
    }, {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: ['draft', 'sent', 'negotiation', 'accepted', 'expired'],
      default: 'draft'
    }, {
      key: 'owner',
      label: 'Owner',
      type: 'select',
      options: teamNames
    }],
    create: v => {
      const scope = (v.scope || '').trim();
      const total = num(v.total);
      const items = scope ? [{
        id: 1,
        description: scope,
        amount: total,
        qty: 1
      }] : [];
      const q = {
        id: nextId(DB.quotes),
        number: genNum('QT-', DB.quotes, 1000),
        customer: O(v.customer),
        scope: scope || 'Custom quotation',
        total,
        status: v.status || 'draft',
        owner: O(v.owner || teamNames()[0]),
        valid_till: iso(15),
        items
      };
      DB.quotes.push(q);
      if (q.status === 'accepted') convertQuote(q);
    }
  },
  invoice: {
    label: 'Invoice',
    fields: [{
      key: 'customer',
      label: 'Customer',
      type: 'select',
      options: custNames
    }, {
      key: 'total',
      label: 'Total (₹)',
      type: 'number'
    }, {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: ['sent', 'partial', 'paid', 'overdue', 'draft'],
      default: 'sent'
    }, {
      key: 'due_days',
      label: 'Due in (days)',
      type: 'number',
      default: 15
    }],
    create: v => {
      const inv = createInvoice({
        customer: v.customer,
        total: num(v.total),
        dueDays: num(v.due_days) || 15
      });
      if (inv && v.status && v.status !== 'sent') inv.status = v.status;
      return inv != null;
    }
  },
  customer: {
    label: 'Customer',
    fields: [{
      key: 'name',
      label: 'Customer name'
    }, {
      key: 'area',
      label: 'Area'
    }, {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: ['Residential', 'Commercial', 'Industrial'],
      default: 'Commercial'
    }, {
      key: 'contact_name',
      label: 'Contact person'
    }, {
      key: 'phone',
      label: 'Phone'
    }, {
      key: 'sites',
      label: 'Sites',
      type: 'number',
      default: 1
    }, {
      key: 'owner',
      label: 'Owner',
      type: 'select',
      options: teamNames
    }],
    create: v => {
      const nm = (v.name || '').trim();
      if (!nm) {
        alert('Enter a customer name.');
        return false;
      }
      if (DB.customers.some(c => c.name.toLowerCase() === nm.toLowerCase())) {
        alert(`A customer named "${nm}" already exists — open that record instead of creating a duplicate.`);
        return false;
      }
      DB.customers.push({
        id: nextId(DB.customers),
        name: nm,
        area: v.area,
        type: v.type || 'Commercial',
        contact_name: v.contact_name,
        phone: v.phone,
        sites: num(v.sites) || 1,
        owner: O(v.owner || teamNames()[0]),
        lifetime_value: 0
      });
      return true;
    }
  },
  job: {
    label: 'Job',
    fields: [{
      key: 'customer',
      label: 'Customer',
      type: 'select',
      options: custNames
    }, {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: ['install', 'survey', 'amc', 'repair'],
      default: 'install'
    }, {
      key: 'scope',
      label: 'Scope',
      type: 'textarea'
    }, {
      key: 'in_days',
      label: 'Scheduled in (days)',
      type: 'number',
      default: 1
    }, {
      key: 'slot',
      label: 'Slot'
    }, {
      key: 'technician',
      label: 'Technician',
      type: 'select',
      options: teamNames
    }, {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: ['scheduled', 'unassigned', 'in_progress', 'done', 'cancelled'],
      default: 'scheduled'
    }],
    create: v => DB.jobs.push({
      id: nextId(DB.jobs),
      number: genNum('JOB-', DB.jobs, 3000),
      customer: O(v.customer),
      type: v.type || 'install',
      scope: v.scope,
      scheduled_on: iso(num(v.in_days)),
      slot: v.slot || 'TBD',
      technician: v.technician ? O(v.technician) : null,
      status: v.status || 'scheduled',
      checklist: []
    })
  },
  ticket: {
    label: 'Ticket',
    fields: [{
      key: 'customer',
      label: 'Customer',
      type: 'select',
      options: custNames
    }, {
      key: 'issue',
      label: 'Issue',
      type: 'textarea'
    }, {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      options: ['high', 'medium', 'low'],
      default: 'medium'
    }, {
      key: 'coverage',
      label: 'Coverage',
      type: 'select',
      options: ['amc', 'warranty', 'paid'],
      default: 'paid'
    }, {
      key: 'assignee',
      label: 'Assign to',
      type: 'select',
      options: teamNames
    }, {
      key: 'sla_state',
      label: 'SLA',
      type: 'select',
      options: [['ok', 'On track'], ['at_risk', 'At risk'], ['breached', 'Breached']],
      default: 'ok'
    }],
    create: v => DB.tickets.push({
      id: nextId(DB.tickets),
      number: genNum('TKT-', DB.tickets, 4000),
      customer: O(v.customer),
      issue: v.issue,
      priority: v.priority || 'medium',
      coverage: v.coverage || 'paid',
      assignee: v.assignee ? O(v.assignee) : null,
      status: 'open',
      sla_state: v.sla_state || 'ok',
      activities: [{
        id: 1,
        note: 'Ticket created',
        created_at: iso(0)
      }]
    })
  },
  amc: {
    label: 'Contract',
    fields: [{
      key: 'customer',
      label: 'Customer',
      type: 'select',
      options: custNames
    }, {
      key: 'plan',
      label: 'Plan',
      type: 'select',
      options: ['basic', 'silver', 'gold'],
      default: 'silver'
    }, {
      key: 'devices',
      label: 'Devices',
      type: 'number'
    }, {
      key: 'value',
      label: 'Annual value (₹)',
      type: 'number'
    }, {
      key: 'visits_total',
      label: 'Visits / year',
      type: 'number',
      default: 4
    }, {
      key: 'end_days',
      label: 'Ends in (days)',
      type: 'number',
      default: 365
    }],
    create: v => {
      const ed = num(v.end_days);
      const a = {
        id: nextId(DB.amc),
        number: genNum('AMC-', DB.amc, 5000),
        customer: O(v.customer),
        plan: v.plan || 'silver',
        devices: num(v.devices),
        value: num(v.value),
        starts_on: iso(ed - 365),
        ends_on: iso(ed),
        visits_total: num(v.visits_total) || 4,
        visits_used: 0,
        status: ed < 0 ? 'expired' : ed < 30 ? 'expiring' : 'active'
      };
      DB.amc.push(a);
      if (a.value > 0) {
        const inv = createInvoice({
          customer: v.customer,
          total: a.value,
          note: 'AMC ' + a.number + ' — annual charge',
          issueStock: false
        });
        if (inv) a.invoice_number = inv.number;
      }
    }
  },
  product: {
    label: 'Product',
    fields: [{
      key: 'sku',
      label: 'SKU'
    }, {
      key: 'name',
      label: 'Product name'
    }, {
      key: 'specs',
      label: 'Specs'
    }, {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: ['Cameras', 'Recorders', 'Storage', 'Cables & Power'],
      default: 'Cameras'
    }, {
      key: 'purchase_price',
      label: 'Purchase price (₹)',
      type: 'number'
    }, {
      key: 'sale_price',
      label: 'Sale price (₹)',
      type: 'number'
    }, {
      key: 'stock',
      label: 'Stock',
      type: 'number',
      min: 0,
      default: 0
    }, {
      key: 'reserved',
      label: 'Reserved',
      type: 'number',
      default: 0
    }, {
      key: 'reorder_level',
      label: 'Reorder level',
      type: 'number',
      default: 0
    }, {
      key: 'track_serials',
      label: 'Serial tracked',
      type: 'select',
      options: ['Yes', 'No'],
      default: 'No'
    }],
    create: v => DB.products.push({
      id: nextId(DB.products),
      sku: v.sku,
      name: v.name,
      specs: v.specs,
      category: v.category || 'Cameras',
      purchase_price: num(v.purchase_price),
      sale_price: num(v.sale_price),
      stock: num(v.stock),
      reserved: num(v.reserved),
      reorder_level: num(v.reorder_level),
      track_serials: v.track_serials === 'Yes'
    })
  },
  serial: {
    label: 'Serial',
    fields: [{
      key: 'serial_no',
      label: 'Serial number'
    }, {
      key: 'product',
      label: 'Product',
      type: 'select',
      options: prodNames
    }, {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: ['in_stock', 'sold', 'installed', 'rma', 'returned'],
      default: 'in_stock'
    }, {
      key: 'customer',
      label: 'Customer (optional)',
      type: 'select',
      options: custNames
    }],
    create: v => {
      const s = {
        id: nextId(DB.serials),
        serial_no: v.serial_no,
        product: O(v.product),
        customer: v.customer ? O(v.customer) : null,
        status: v.status || 'in_stock',
        in_warranty: v.status === 'installed',
        sold_on: v.status === 'installed' ? iso(0) : null,
        warranty_end: v.status === 'installed' ? iso(730) : null
      };
      DB.serials.push(s);
      if (s.status === 'sold' || s.status === 'installed') {
        const p = DB.products.find(x => x.name === v.product);
        if (p && p.stock > 0) recordStockMove(p, -1, 'serial', v.serial_no);
      }
      if (s.status === 'installed' && v.customer && !DB.equipment.some(e => e.serial?.serial_no === v.serial_no)) {
        DB.equipment.push({
          id: nextId(DB.equipment),
          name: v.product,
          customer: O(v.customer),
          product: O(v.product),
          serial: {
            serial_no: v.serial_no
          },
          location: '—',
          installed_on: iso(0),
          warranty_end: iso(730),
          in_warranty: true
        });
      }
    }
  },
  credential: {
    label: 'Credential',
    fields: [{
      key: 'label',
      label: 'Label'
    }, {
      key: 'customer',
      label: 'Customer',
      type: 'select',
      options: custNames
    }, {
      key: 'host',
      label: 'Host / IP'
    }, {
      key: 'port',
      label: 'Port',
      type: 'number',
      default: 8000
    }, {
      key: 'username',
      label: 'Username'
    }, {
      key: 'password',
      label: 'Password'
    }, {
      key: 'notes',
      label: 'Notes'
    }],
    create: v => DB.credentials.push({
      id: nextId(DB.credentials),
      label: v.label,
      customer: O(v.customer),
      host: v.host,
      port: num(v.port) || 8000,
      username: v.username,
      password: v.password,
      notes: v.notes || '—'
    })
  },
  po: {
    label: 'Purchase Order',
    fields: [{
      key: 'supplier',
      label: 'Supplier',
      type: 'select',
      options: suppNames
    }, {
      key: 'product',
      label: 'Product',
      type: 'select',
      options: prodNames
    }, {
      key: 'qty',
      label: 'Quantity',
      type: 'number',
      default: 1
    }, {
      key: 'total',
      label: 'Value (₹, blank = qty × purchase price)',
      type: 'number'
    }, {
      key: 'eta_days',
      label: 'ETA in (days)',
      type: 'number',
      default: 7
    }, {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: ['draft', 'ordered', 'partial', 'received', 'cancelled'],
      default: 'ordered'
    }],
    create: v => {
      const p = DB.products.find(x => x.name === v.product);
      const qty = num(v.qty) || 1;
      const unit = p ? p.purchase_price : 0;
      const total = num(v.total) || qty * unit;
      const items = v.product ? [{
        id: 1,
        description: v.product,
        qty,
        unit_price: unit
      }] : [];
      const po = {
        id: nextId(DB.purchaseOrders),
        number: genNum('PO-', DB.purchaseOrders, 6000),
        supplier: O(v.supplier),
        ordered_on: iso(0),
        eta: iso(num(v.eta_days) || 7),
        total,
        status: v.status || 'ordered',
        items
      };
      DB.purchaseOrders.push(po);
      if (po.status === 'received') receivePO(po);
    }
  },
  equipment: {
    label: 'Equipment',
    fields: [{
      key: 'name',
      label: 'Product (from inventory)',
      type: 'select',
      options: prodNames
    }, {
      key: 'customer',
      label: 'Customer',
      type: 'select',
      options: custNames
    }, {
      key: 'location',
      label: 'Location'
    }, {
      key: 'serial_no',
      label: 'Serial number'
    }, {
      key: 'installed_days_ago',
      label: 'Installed (days ago)',
      type: 'number',
      default: 0
    }, {
      key: 'warranty_days',
      label: 'Warranty ends in (days)',
      type: 'number',
      default: 365
    }],
    create: v => {
      const w = num(v.warranty_days) || 365;
      DB.equipment.push({
        id: nextId(DB.equipment),
        name: v.name,
        customer: O(v.customer),
        product: O(v.name),
        serial: {
          serial_no: v.serial_no || '—'
        },
        location: v.location,
        installed_on: iso(-num(v.installed_days_ago)),
        warranty_end: iso(w),
        in_warranty: w > 0
      });
      if (v.serial_no && !DB.serials.some(s => s.serial_no === v.serial_no)) {
        DB.serials.push({
          id: nextId(DB.serials),
          serial_no: v.serial_no,
          product: O(v.name),
          customer: O(v.customer),
          status: 'installed',
          in_warranty: w > 0,
          sold_on: iso(-num(v.installed_days_ago)),
          warranty_end: iso(w)
        });
        const p = DB.products.find(x => x.name === v.name);
        if (p && p.stock > 0) recordStockMove(p, -1, 'equipment', v.serial_no);
      }
    }
  },
  repair: {
    label: 'Repair',
    fields: [{
      key: 'customer',
      label: 'Customer',
      type: 'select',
      options: custNames
    }, {
      key: 'device',
      label: 'Device'
    }, {
      key: 'serial_no',
      label: 'Serial number'
    }, {
      key: 'issue',
      label: 'Reported problem',
      type: 'textarea'
    }, {
      key: 'coverage',
      label: 'Coverage',
      type: 'select',
      options: ['amc', 'warranty', 'paid'],
      default: 'paid'
    }, {
      key: 'technician',
      label: 'Technician',
      type: 'select',
      options: teamNames
    }, {
      key: 'promised_days',
      label: 'Promised in (days)',
      type: 'number',
      default: 3
    }, {
      key: 'charge',
      label: 'Estimated charge (₹)',
      type: 'number',
      default: 0
    }, {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [['received', 'Received'], ['diagnosing', 'Diagnosing'], ['repairing', 'Repairing'], ['ready', 'Ready'], ['delivered', 'Delivered']],
      default: 'received'
    }],
    create: v => DB.repairs.push({
      id: nextId(DB.repairs),
      number: genNum('SR-', DB.repairs, 7000),
      customer: O(v.customer),
      device: v.device,
      serial_no: v.serial_no,
      issue: v.issue,
      coverage: v.coverage || 'paid',
      received_on: iso(0),
      promised_on: iso(num(v.promised_days) || 3),
      technician: v.technician ? O(v.technician) : null,
      charge: num(v.charge),
      status: v.status || 'received'
    })
  },
  ledger: {
    label: 'Cash entry',
    fields: [{
      key: 'direction',
      label: 'Type',
      type: 'select',
      options: [['in', 'Money in'], ['out', 'Money out']],
      default: 'in'
    }, {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: ledgerCatNames,
      default: 'Miscellaneous'
    }, {
      key: 'new_category',
      label: 'Or type a new category (saved for next time)'
    }, {
      key: 'amount',
      label: 'Amount (₹)',
      type: 'number'
    }, {
      key: 'on',
      label: 'Date (YYYY-MM-DD)',
      default: iso(0).slice(0, 10)
    }, {
      key: 'party',
      label: 'From / to (person or vendor)'
    }, {
      key: 'note',
      label: 'Note'
    }],
    create: v => {
      ensureLedger();
      const amt = num(v.amount);
      if (amt <= 0) {
        alert('Enter an amount greater than 0.');
        return false;
      }
      DB.ledger.push({
        id: nextId(DB.ledger),
        number: genNum('CB-', DB.ledger, 8000),
        direction: v.direction === 'out' ? 'out' : 'in',
        category: resolveLedgerCategory(v),
        amount: amt,
        on: parseEntryDate(v.on),
        party: (v.party || '').trim(),
        note: (v.note || '').trim()
      });
      return true;
    }
  }
};
(function wrapEntityCreates() {
  Object.keys(ENTITIES).forEach(k => {
    const orig = ENTITIES[k].create;
    ENTITIES[k].create = v => {
      const lens = {};
      Object.keys(DB).forEach(t => {
        if (Array.isArray(DB[t])) lens[t] = DB[t].length;
      });
      const r = orig(v);
      Object.keys(lens).forEach(t => {
        if (Array.isArray(DB[t]) && DB[t].length > lens[t]) DB[t].slice(lens[t]).forEach(row => touch(row));
      });
      return r;
    };
  });
})();
function addScannedSerial(serialNo, productName) {
  const sn = String(serialNo || '').replace(/[\r\n\t]/g, '').trim();
  if (!sn) return {
    ok: false,
    error: 'Empty scan — try again.'
  };
  const product = String(productName || '').trim();
  if (!product) return {
    ok: false,
    error: 'Select a product first, then scan.'
  };
  const dup = DB.serials.find(s => String(s.serial_no || '').toLowerCase() === sn.toLowerCase());
  if (dup) return {
    ok: false,
    error: 'Already registered: ' + dup.serial_no,
    existing: dup
  };
  const p = DB.products.find(x => x.name === product);
  if (!p) return {
    ok: false,
    error: 'Product not found — pick a product from the list, then scan.'
  };
  const row = {
    id: nextId(DB.serials),
    serial_no: sn,
    product: O(product),
    customer: null,
    status: 'in_stock',
    in_warranty: false,
    sold_on: null,
    warranty_end: null
  };
  DB.serials.push(row);
  p.track_serials = true;
  recordStockMove(p, 1, 'scan', sn);
  touch(row);
  touch(p);
  afterMutation();
  return {
    ok: true,
    serial: row,
    product: p
  };
}
const ENTITY_STORE = {
  lead: 'leads',
  quote: 'quotes',
  invoice: 'invoices',
  customer: 'customers',
  job: 'jobs',
  ticket: 'tickets',
  amc: 'amc',
  product: 'products',
  serial: 'serials',
  credential: 'credentials',
  po: 'purchaseOrders',
  equipment: 'equipment',
  repair: 'repairs',
  ledger: 'ledger'
};
const pendingDeletes = [];
function entityDelete(entity, id) {
  const table = ENTITY_STORE[entity];
  if (!table || !Array.isArray(DB[table])) return false;
  const i = DB[table].findIndex(x => x.id === id);
  if (i < 0) return false;
  const row = DB[table][i];
  if (Erp) {
    Erp.tombstone(row, getDeviceId());
    pendingDeletes.push({
      table,
      uuid: row.uuid,
      deleted_at: row.deleted_at,
      updated_at: row.updated_at
    });
  }
  DB[table].splice(i, 1);
  afterMutation();
  return true;
}
function entityEditFields(entity) {
  const cfg = ENTITIES[entity];
  if (!cfg) return [];
  if (entity === 'job') return [{
    key: 'customer',
    label: 'Customer',
    type: 'select',
    options: custNames
  }, {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: ['install', 'survey', 'amc', 'repair']
  }, {
    key: 'scope',
    label: 'Scope',
    type: 'textarea'
  }, {
    key: 'scheduled_on',
    label: 'Scheduled on (YYYY-MM-DD)'
  }, {
    key: 'slot',
    label: 'Slot'
  }, {
    key: 'technician',
    label: 'Technician',
    type: 'select',
    options: teamNames
  }, {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: ['scheduled', 'unassigned', 'in_progress', 'done', 'cancelled']
  }];
  if (entity === 'ticket') return [{
    key: 'customer',
    label: 'Customer',
    type: 'select',
    options: custNames
  }, {
    key: 'issue',
    label: 'Issue',
    type: 'textarea'
  }, {
    key: 'priority',
    label: 'Priority',
    type: 'select',
    options: ['high', 'medium', 'low']
  }, {
    key: 'coverage',
    label: 'Coverage',
    type: 'select',
    options: ['amc', 'warranty', 'paid']
  }, {
    key: 'assignee',
    label: 'Assign to',
    type: 'select',
    options: teamNames
  }, {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: ['open', 'in_progress', 'on_hold', 'resolved', 'closed']
  }, {
    key: 'sla_state',
    label: 'SLA',
    type: 'select',
    options: [['ok', 'On track'], ['at_risk', 'At risk'], ['breached', 'Breached'], ['met', 'Met']]
  }];
  if (entity === 'amc') return [{
    key: 'customer',
    label: 'Customer',
    type: 'select',
    options: custNames
  }, {
    key: 'plan',
    label: 'Plan',
    type: 'select',
    options: ['basic', 'silver', 'gold']
  }, {
    key: 'devices',
    label: 'Devices',
    type: 'number'
  }, {
    key: 'value',
    label: 'Annual value (₹)',
    type: 'number'
  }, {
    key: 'visits_total',
    label: 'Visits / year',
    type: 'number'
  }, {
    key: 'visits_used',
    label: 'Visits used',
    type: 'number'
  }, {
    key: 'starts_on',
    label: 'Starts on (YYYY-MM-DD)'
  }, {
    key: 'ends_on',
    label: 'Ends on (YYYY-MM-DD)'
  }, {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: ['active', 'expiring', 'expired']
  }];
  if (entity === 'equipment') return [{
    key: 'name',
    label: 'Device name'
  }, {
    key: 'customer',
    label: 'Customer',
    type: 'select',
    options: custNames
  }, {
    key: 'location',
    label: 'Location'
  }, {
    key: 'serial_no',
    label: 'Serial number'
  }, {
    key: 'installed_on',
    label: 'Installed on (YYYY-MM-DD)'
  }, {
    key: 'warranty_end',
    label: 'Warranty end (YYYY-MM-DD)'
  }];
  if (entity === 'repair') return [{
    key: 'customer',
    label: 'Customer',
    type: 'select',
    options: custNames
  }, {
    key: 'device',
    label: 'Device'
  }, {
    key: 'serial_no',
    label: 'Serial number'
  }, {
    key: 'issue',
    label: 'Reported problem',
    type: 'textarea'
  }, {
    key: 'coverage',
    label: 'Coverage',
    type: 'select',
    options: ['amc', 'warranty', 'paid']
  }, {
    key: 'technician',
    label: 'Technician',
    type: 'select',
    options: teamNames
  }, {
    key: 'promised_on',
    label: 'Promised on (YYYY-MM-DD)'
  }, {
    key: 'charge',
    label: 'Charge (₹)',
    type: 'number'
  }, {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [['received', 'Received'], ['diagnosing', 'Diagnosing'], ['repairing', 'Repairing'], ['ready', 'Ready'], ['delivered', 'Delivered']]
  }];
  if (entity === 'po') return [{
    key: 'supplier',
    label: 'Supplier'
  }, {
    key: 'eta',
    label: 'ETA (YYYY-MM-DD)'
  }, {
    key: 'total',
    label: 'Value (₹)',
    type: 'number'
  }, {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: ['draft', 'ordered', 'partial', 'received', 'cancelled']
  }];
  if (entity === 'invoice') return [{
    key: 'customer',
    label: 'Customer',
    type: 'select',
    options: custNames
  }, {
    key: 'total',
    label: 'Total (₹)',
    type: 'number'
  }, {
    key: 'paid',
    label: 'Paid (₹)',
    type: 'number'
  }, {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: ['sent', 'partial', 'paid', 'overdue', 'draft']
  }, {
    key: 'issue_date',
    label: 'Issue date (YYYY-MM-DD)'
  }, {
    key: 'due_date',
    label: 'Due date (YYYY-MM-DD)'
  }, {
    key: 'note',
    label: 'Note'
  }];
  if (entity === 'product') return cfg.fields;
  if (entity === 'serial') return cfg.fields;
  if (entity === 'credential') return cfg.fields;
  if (entity === 'lead') return cfg.fields;
  if (entity === 'quote') return [{
    key: 'customer',
    label: 'Customer',
    type: 'select',
    options: custNames
  }, {
    key: 'scope',
    label: 'Scope',
    type: 'textarea'
  }, {
    key: 'total',
    label: 'Value (₹)',
    type: 'number'
  }, {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: ['draft', 'sent', 'negotiation', 'accepted', 'expired']
  }, {
    key: 'owner',
    label: 'Owner',
    type: 'select',
    options: teamNames
  }, {
    key: 'valid_till',
    label: 'Valid till (YYYY-MM-DD)'
  }];
  return cfg.fields;
}
function entityToInitial(entity, r) {
  if (!r) return {};
  if (entity === 'job') return {
    customer: r.customer?.name || '',
    type: r.type || 'install',
    scope: r.scope || '',
    scheduled_on: r.scheduled_on || '',
    slot: r.slot || '',
    technician: r.technician?.name || '',
    status: r.status || 'scheduled'
  };
  if (entity === 'ticket') return {
    customer: r.customer?.name || '',
    issue: r.issue || '',
    priority: r.priority || 'medium',
    coverage: r.coverage || 'paid',
    assignee: r.assignee?.name || '',
    status: r.status || 'open',
    sla_state: r.sla_state || 'ok'
  };
  if (entity === 'amc') return {
    customer: r.customer?.name || '',
    plan: r.plan || 'silver',
    devices: r.devices,
    value: r.value,
    visits_total: r.visits_total,
    visits_used: r.visits_used,
    starts_on: r.starts_on || '',
    ends_on: r.ends_on || '',
    status: r.status || 'active'
  };
  if (entity === 'equipment') return {
    name: r.name || '',
    customer: r.customer?.name || '',
    location: r.location || '',
    serial_no: r.serial?.serial_no || '',
    installed_on: r.installed_on || '',
    warranty_end: r.warranty_end || ''
  };
  if (entity === 'credential') return {
    label: r.label || '',
    customer: r.customer?.name || '',
    host: r.host || '',
    port: r.port || 8000,
    username: r.username || '',
    password: r.password || '',
    notes: r.notes || ''
  };
  if (entity === 'product') return {
    sku: r.sku || '',
    name: r.name || '',
    specs: r.specs || '',
    category: r.category || 'Cameras',
    purchase_price: r.purchase_price,
    sale_price: r.sale_price,
    stock: r.stock,
    reserved: r.reserved,
    reorder_level: r.reorder_level,
    track_serials: r.track_serials ? 'Yes' : 'No'
  };
  if (entity === 'serial') return {
    serial_no: r.serial_no || '',
    product: r.product?.name || '',
    status: r.status || 'in_stock',
    customer: r.customer?.name || ''
  };
  if (entity === 'po') return {
    supplier: r.supplier?.name || '',
    eta: r.eta || '',
    total: r.total,
    status: r.status || 'ordered'
  };
  if (entity === 'repair') return {
    customer: r.customer?.name || '',
    device: r.device || '',
    serial_no: r.serial_no || '',
    issue: r.issue || '',
    coverage: r.coverage || 'paid',
    technician: r.technician?.name || '',
    promised_on: r.promised_on || '',
    charge: r.charge,
    status: r.status || 'received'
  };
  if (entity === 'lead') return {
    name: r.name || '',
    requirement: r.requirement || '',
    value: r.value,
    source: r.source || '',
    segment: r.segment || '',
    owner: r.owner?.name || '',
    stage: String(r.stage ?? 0)
  };
  if (entity === 'quote') return {
    customer: r.customer?.name || '',
    scope: r.scope || '',
    total: r.total,
    status: r.status || 'draft',
    owner: r.owner?.name || '',
    valid_till: r.valid_till || ''
  };
  if (entity === 'invoice') return {
    customer: r.customer?.name || '',
    total: r.total,
    paid: r.paid,
    status: r.status || 'sent',
    issue_date: r.issue_date || '',
    due_date: r.due_date || '',
    note: r.note || ''
  };
  if (entity === 'ledger') return {
    direction: r.direction || 'in',
    category: r.category || 'Miscellaneous',
    amount: r.amount,
    on: String(r.on || '').slice(0, 10),
    party: r.party || '',
    note: r.note || '',
    new_category: ''
  };
  return {};
}
function entityApplyEdit(entity, row, v) {
  if (!row) return;
  try {
    if (entity === 'job') {
      Object.assign(row, {
        customer: O(v.customer),
        type: v.type || row.type,
        scope: v.scope,
        scheduled_on: v.scheduled_on || row.scheduled_on,
        slot: v.slot || 'TBD',
        technician: v.technician ? O(v.technician) : null,
        status: v.status || row.status
      });
      return;
    }
    if (entity === 'ticket') {
      Object.assign(row, {
        customer: O(v.customer),
        issue: v.issue,
        priority: v.priority || row.priority,
        coverage: v.coverage || row.coverage,
        assignee: v.assignee ? O(v.assignee) : null,
        status: v.status || row.status,
        sla_state: v.sla_state || row.sla_state
      });
      return;
    }
    if (entity === 'amc') {
      Object.assign(row, {
        customer: O(v.customer),
        plan: v.plan || row.plan,
        devices: num(v.devices),
        value: num(v.value),
        visits_total: num(v.visits_total) || row.visits_total,
        visits_used: num(v.visits_used),
        starts_on: v.starts_on || row.starts_on,
        ends_on: v.ends_on || row.ends_on,
        status: v.status || row.status
      });
      return;
    }
    if (entity === 'equipment') {
      Object.assign(row, {
        name: v.name,
        customer: O(v.customer),
        product: O(v.name),
        location: v.location,
        serial: {
          serial_no: v.serial_no || '—'
        },
        installed_on: v.installed_on || row.installed_on,
        warranty_end: v.warranty_end || row.warranty_end,
        in_warranty: v.warranty_end ? new Date(v.warranty_end).getTime() > Date.now() : row.in_warranty
      });
      return;
    }
    if (entity === 'credential') {
      Object.assign(row, {
        label: v.label,
        customer: O(v.customer),
        host: v.host,
        port: num(v.port) || 8000,
        username: v.username,
        password: v.password,
        notes: v.notes || '—'
      });
      return;
    }
    if (entity === 'product') {
      if (Erp) Erp.recomputeStock({
        DB,
        TEAM,
        CATALOG,
        COMPANY
      });
      const prev = num(row.stock);
      Object.assign(row, {
        sku: v.sku,
        name: v.name,
        specs: v.specs,
        category: v.category || row.category,
        purchase_price: num(v.purchase_price),
        sale_price: num(v.sale_price),
        reserved: num(v.reserved),
        reorder_level: num(v.reorder_level),
        track_serials: v.track_serials === 'Yes'
      });
      const next = Math.max(0, num(v.stock));
      if (next !== prev) recordStockMove(row, next - prev, 'adjust', row.sku);else row.stock = next;
      const live = (DB.products || []).find(x => x === row || row.sku && x.sku === row.sku || row.id && x.id === row.id);
      if (live) row.stock = live.stock;
      return;
    }
    if (entity === 'serial') {
      Object.assign(row, {
        serial_no: v.serial_no,
        product: O(v.product),
        status: v.status || row.status,
        customer: v.customer ? O(v.customer) : null,
        in_warranty: v.status === 'installed' ? true : !!row.in_warranty
      });
      return;
    }
    if (entity === 'po') {
      const prev = row.status;
      Object.assign(row, {
        supplier: O(v.supplier),
        eta: v.eta || row.eta,
        total: num(v.total),
        status: v.status || row.status
      });
      if (prev !== 'received' && row.status === 'received') receivePO(row);
      return;
    }
    if (entity === 'repair') {
      Object.assign(row, {
        customer: O(v.customer),
        device: v.device,
        serial_no: v.serial_no,
        issue: v.issue,
        coverage: v.coverage || row.coverage,
        technician: v.technician ? O(v.technician) : null,
        promised_on: v.promised_on || row.promised_on,
        charge: num(v.charge),
        status: v.status || row.status
      });
      return;
    }
    if (entity === 'lead') {
      Object.assign(row, {
        name: v.name,
        requirement: v.requirement,
        value: num(v.value),
        source: v.source || row.source,
        segment: v.segment || row.segment,
        owner: O(v.owner || teamNames()[0]),
        stage: num(v.stage)
      });
      return;
    }
    if (entity === 'quote') {
      Object.assign(row, {
        customer: O(v.customer),
        scope: v.scope,
        total: num(v.total),
        status: v.status || row.status,
        owner: O(v.owner || teamNames()[0]),
        valid_till: v.valid_till || row.valid_till
      });
      if (Array.isArray(v.items)) row.items = normalizeQuoteItems(v.items);
      if (v.status === 'accepted' && !row.converted) convertQuote(row);
      return;
    }
    if (entity === 'invoice') {
      const normItems = v.items ? normalizeQuoteItems(v.items) : row.items || [];
      Object.assign(row, {
        customer: O(v.customer),
        total: num(v.total),
        paid: num(v.paid),
        status: v.status || row.status,
        issue_date: v.issue_date || row.issue_date,
        due_date: v.due_date || row.due_date,
        note: v.note || '',
        items: normItems
      });
      row.balance = row.total - row.paid;
      return;
    }
    if (entity === 'ledger') {
      Object.assign(row, {
        direction: v.direction === 'out' ? 'out' : 'in',
        category: resolveLedgerCategory(v),
        amount: num(v.amount),
        on: parseEntryDate(v.on),
        party: v.party || '',
        note: v.note || ''
      });
      return;
    }
  } finally {
    if (row) touch(row);
    afterMutation();
  }
}
function FormModal({
  title,
  fields,
  submitLabel = 'Save',
  initial,
  onClose,
  onSave,
  busy = false
}) {
  const [form, setForm] = useState(() => {
    const o = {
      ...(initial || {})
    };
    fields.forEach(f => {
      if (o[f.key] === undefined) o[f.key] = f.default ?? '';
    });
    return o;
  });
  const set = (k, v) => setForm(s => ({
    ...s,
    [k]: v
  }));
  return /*#__PURE__*/React.createElement("div", {
    className: "scrim show",
    style: {
      zIndex: 60
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%,-50%)',
      width: 380,
      maxWidth: '92vw',
      maxHeight: '88vh',
      overflowY: 'auto',
      background: 'var(--card)',
      border: '1px solid var(--ln)',
      borderRadius: 16,
      padding: '22px 22px 18px',
      boxShadow: '0 20px 60px rgba(40,35,20,.22)',
      zIndex: 61
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      letterSpacing: '-.01em',
      marginBottom: 6
    }
  }, title), fields.map(f => {
    const opts = typeof f.options === 'function' ? f.options() : f.options;
    return /*#__PURE__*/React.createElement("div", {
      key: f.key
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-l"
    }, f.label), f.type === 'select' ? /*#__PURE__*/React.createElement("select", {
      className: "inp",
      value: form[f.key],
      onChange: e => set(f.key, e.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Select…"), opts.map(o => {
      const [val, lab] = Array.isArray(o) ? o : [o, o];
      return /*#__PURE__*/React.createElement("option", {
        key: val,
        value: val
      }, lab);
    })) : f.type === 'textarea' ? /*#__PURE__*/React.createElement("textarea", {
      className: "inp",
      rows: 2,
      value: form[f.key],
      onChange: e => set(f.key, e.target.value)
    }) : f.type === 'password' ? /*#__PURE__*/React.createElement("input", {
      className: "inp",
      type: "password",
      autoComplete: "new-password",
      value: form[f.key],
      onChange: e => set(f.key, e.target.value)
    }) : /*#__PURE__*/React.createElement("input", {
      className: "inp",
      type: f.type === 'number' ? 'number' : 'text',
      min: f.type === 'number' ? f.min ?? 0 : undefined,
      value: form[f.key] ?? '',
      onChange: e => set(f.key, e.target.value)
    }));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 9,
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    disabled: busy,
    onClick: onClose
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    disabled: busy,
    onClick: () => onSave(form)
  }, busy ? 'Saving…' : submitLabel))));
}
function CreateButton({
  entity,
  label,
  onDone,
  className,
  initial
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cfg = ENTITIES[entity];
  const handleSave = async v => {
    const created = cfg.create(v);
    if (created === false) return;
    setBusy(true);
    try {
      const ok = await commitChange();
      if (!ok) return;
      setOpen(false);
      onDone && onDone();
    } finally {
      setBusy(false);
    }
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: className || 'btn-p',
    onClick: () => setOpen(true)
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "plus",
    s: 14,
    sw: 2.2
  }), label || 'New ' + cfg.label), open && /*#__PURE__*/React.createElement(FormModal, {
    title: label || 'New ' + cfg.label,
    fields: cfg.fields,
    submitLabel: 'Save',
    busy: busy,
    initial: initial,
    onClose: () => {
      if (!busy) setOpen(false);
    },
    onSave: handleSave
  }));
}
function NotifPopover({
  onClose,
  onGo
}) {
  refreshDerived(); // v5: notifications read live AMC/invoice/warranty status
  const items = [...DB.tickets.filter(t => (t.sla_state === 'breached' || t.sla_state === 'at_risk') && t.status !== 'resolved' && t.status !== 'closed').map(t => ({
    tone: 'red',
    text: `${t.number} · ${t.customer?.name || '—'}`,
    sub: t.issue,
    path: '/tickets'
  })), ...DB.amc.filter(a => a.status === 'expiring').map(a => ({
    tone: 'amber',
    text: `AMC expiring · ${a.customer?.name || '—'}`,
    sub: `Ends ${date(a.ends_on)}`,
    path: '/amc'
  })), ...DB.invoices.filter(i => i.status === 'overdue').map(i => ({
    tone: 'red',
    text: `Overdue · ${i.customer?.name || '—'}`,
    sub: `${i.number} · ${inr(i.balance)} due ${date(i.due_date)}`,
    path: '/invoices'
  })), ...DB.products.filter(p => p.reorder_level > 0 && p.stock <= p.reorder_level).map(p => ({
    tone: 'amber',
    text: `Low stock · ${p.name}`,
    sub: `${p.stock} left`,
    path: '/inventory?open=' + p.id
  }))];
  return /*#__PURE__*/React.createElement("div", {
    onMouseLeave: onClose,
    style: {
      position: 'absolute',
      top: 42,
      right: 0,
      width: 300,
      background: '#fff',
      border: '1px solid var(--ln)',
      borderRadius: 12,
      boxShadow: '0 12px 40px rgba(40,35,20,.18)',
      zIndex: 60,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sg",
    style: {
      padding: '10px 14px 6px'
    }
  }, "Notifications · ", items.length), items.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty",
    style: {
      padding: 18
    }
  }, "All clear"), items.map((it, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: "sn",
    style: {
      borderRadius: 0,
      alignItems: 'flex-start',
      gap: 9,
      padding: '10px 14px'
    },
    onClick: () => onGo(it.path)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: `var(--${it.tone})`,
      marginTop: 5,
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontWeight: 800,
      fontSize: 12
    }
  }, it.text), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 11,
      color: 'var(--mut)',
      fontWeight: 600
    }
  }, it.sub)))));
}

/* ---------------- Drawer ---------------- */
function Drawer({
  rec,
  onClose
}) {
  const show = !!rec;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: 'scrim' + (show ? ' show' : ''),
    onClick: onClose
  }), /*#__PURE__*/React.createElement("aside", {
    className: 'drawer' + (show ? ' show' : '')
  }, rec && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "dwh"
  }, rec.av ? /*#__PURE__*/React.createElement(Av, {
    name: rec.av,
    size: 40
  }) : rec.icon ? /*#__PURE__*/React.createElement("span", {
    className: "tldot",
    style: {
      width: 40,
      height: 40
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    n: rec.icon,
    s: 18
  })) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dt"
  }, rec.title), /*#__PURE__*/React.createElement("div", {
    className: "ds"
  }, rec.subtitle)), /*#__PURE__*/React.createElement("button", {
    className: "dwclose",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "chevR",
    s: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dwbody"
  }, rec.body), rec.foot ? /*#__PURE__*/React.createElement("div", {
    className: "dwfoot"
  }, rec.foot) : null)));
}
function DwSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "dwsec"
  }, label), children);
}
function DwBox({
  rows
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "dwbox"
  }, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    className: "drow",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, r[0]), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, r[1]))));
}

/* ---------------- Shell ---------------- */
const NAV = [['Sales', [['', 'grid', 'Dashboard'], ['leads', 'layers', 'CRM / Leads'], ['quotes', 'file', 'Quotations'], ['invoices', 'file', 'Billing & Invoices'], ['outstanding', 'alert', 'Outstanding'], ['accounts', 'wallet', 'Accounts'], ['customers', 'users', 'Customers']]], ['Operations', [['jobs', 'calendar', 'Installation Jobs'], ['tickets', 'tag', 'Service Tickets'], ['service', 'wrench', 'Service & Repair'], ['amc', 'check', 'AMC Management'], ['equipment', 'shield', 'Equipment Register'], ['credentials', 'key', 'Credential Manager']]], ['Catalog', [['inventory', 'box', 'Inventory'], ['serials', 'box', 'Serial Tracking'], ['warranty', 'shield', 'Warranty'], ['purchasing', 'download', 'Purchase Mgmt']]], ['Insights', [['reports', 'chart', 'Reports'], ['insights', 'sliders', 'AI Insights'], ['team', 'users', 'Team & Owners'], ['settings', 'sliders', 'Settings']]]];
const BOTTOM = [['', 'grid', 'Home'], ['leads', 'layers', 'CRM'], ['tickets', 'tag', 'Tickets'], ['inventory', 'box', 'Stock'], ['jobs', 'calendar', 'Jobs']];
function Shell({
  active,
  children
}) {
  const nav = useNavigate();
  const loc = useLocation();
  const [sbOpen, setSbOpen] = useState(false);
  const [results, setResults] = useState(null);
  const [q, setQ] = useState('');
  const [notif, setNotif] = useState(false);
  const [saveState, setSaveState] = useState('saved');
  const cur = active ?? routeKey(loc.pathname);
  const go = id => {
    nav('/' + id);
    setSbOpen(false);
  };
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('sv_user') || '{}') || {};
  } catch (e) {
    user = {};
  }
  useEffect(() => {
    if (q.length < 1) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      api.get('/search?q=' + encodeURIComponent(q)).then(r => setResults(r.results)).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const onStart = () => setSaveState('saving');
    const onDone = e => setSaveState(e.detail?.ok === false ? 'error' : 'saved');
    window.addEventListener('sv-persist-start', onStart);
    window.addEventListener('sv-persist', onDone);
    return () => {
      window.removeEventListener('sv-persist-start', onStart);
      window.removeEventListener('sv-persist', onDone);
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement("div", {
    className: 'scrim' + (sbOpen ? ' show' : ''),
    onClick: () => setSbOpen(false),
    style: {
      zIndex: 41
    }
  }), /*#__PURE__*/React.createElement("nav", {
    className: 'sb' + (sbOpen ? ' show' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bmark",
    style: {
      background: '#fff',
      border: '1px solid var(--ln)',
      padding: 5
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "./assets/sv-emblem.png",
    alt: "Smart Vision",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'contain'
    }
  })), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("div", {
    className: "bt1"
  }, COMPANY.name.split(' ').slice(0, 2).join(' ')), /*#__PURE__*/React.createElement("div", {
    className: "bt2"
  }, "CCTV ERP"))), NAV.map(([grp, items]) => /*#__PURE__*/React.createElement("div", {
    key: grp
  }, /*#__PURE__*/React.createElement("div", {
    className: "sg"
  }, grp), items.map(([id, ic, label]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    className: 'sn' + (id === cur ? ' on' : ''),
    onClick: () => go(id)
  }, /*#__PURE__*/React.createElement(Ic, {
    n: ic,
    s: 15
  }), label)))), /*#__PURE__*/React.createElement("div", {
    className: "sb-foot"
  }, /*#__PURE__*/React.createElement(Av, {
    name: user.name || 'User',
    size: 32
  }), /*#__PURE__*/React.createElement("div", {
    className: "who"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, user.name || 'User'), /*#__PURE__*/React.createElement("div", {
    className: "rl"
  }, user.role || '')), /*#__PURE__*/React.createElement("button", {
    className: "dwclose",
    title: "Sign out",
    style: {
      marginLeft: 'auto'
    },
    onClick: () => {
      if (!confirm('Sign out of Smart Vision ERP?')) return;
      setToken(null);
      localStorage.removeItem('sv_user');
      // nologin=1 skips one auto-login so the password field stays usable
      window.location.replace('./index.html?nologin=1');
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "chevR",
    s: 15
  })))), /*#__PURE__*/React.createElement("div", {
    className: "main"
  }, /*#__PURE__*/React.createElement("header", {
    className: "tb"
  }, /*#__PURE__*/React.createElement("button", {
    className: "hamb",
    onClick: () => setSbOpen(true)
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "grid",
    s: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "srch",
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "search",
    s: 15
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Search products, SKU, customers, invoices…",
    value: q,
    onChange: e => setQ(e.target.value),
    onBlur: () => setTimeout(() => setResults(null), 220)
  }), results && /*#__PURE__*/React.createElement(SearchResults, {
    results: results,
    onPick: path => {
      setQ('');
      setResults(null);
      nav(path);
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "spacer",
    style: {
      flex: 1
    }
  }), saveState !== 'saved' && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      marginRight: 10,
      color: saveState === 'error' ? 'var(--red)' : 'var(--mut)'
    },
    title: "Database save status"
  }, saveState === 'saving' ? 'Saving…' : 'Save failed — retry from Settings'), isApkShell() && !getPairing() && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      marginRight: 10,
      color: 'var(--amber)'
    }
  }, "Not synced"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "tbic",
    onClick: () => setNotif(v => !v)
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "bell",
    s: 17
  }), /*#__PURE__*/React.createElement("span", {
    className: "badge"
  })), notif && /*#__PURE__*/React.createElement(NotifPopover, {
    onClose: () => setNotif(false),
    onGo: p => {
      setNotif(false);
      nav(p);
    }
  })), /*#__PURE__*/React.createElement(CreateButton, {
    entity: "lead",
    label: "Create",
    onDone: () => go('leads')
  })), /*#__PURE__*/React.createElement("main", {
    className: "page"
  }, children)), /*#__PURE__*/React.createElement("nav", {
    className: "bnav"
  }, BOTTOM.map(([id, ic, label]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    className: 'bn' + (id === cur ? ' on' : ''),
    onClick: () => go(id)
  }, id === 'tickets' ? /*#__PURE__*/React.createElement("span", {
    className: "bdot"
  }) : null, /*#__PURE__*/React.createElement(Ic, {
    n: ic,
    s: 20
  }), label))));
}
function SearchResults({
  results,
  onPick
}) {
  const groups = [['products', 'Inventory', r => `/inventory?open=${r.id}`, r => `${r.sku} — ${r.name}${num(r.stock) <= 0 ? ' · out of stock' : ' · ' + r.stock + ' in stock'}`], ['customers', 'Customers', r => `/customers?open=${r.id}`, r => r.name], ['invoices', 'Invoices', r => `/invoices?open=${r.id}`, r => r.number], ['serials', 'Serials', r => `/serials?open=${r.id}`, r => r.serial_no], ['tickets', 'Tickets', r => `/tickets?open=${r.id}`, r => `${r.number} — ${r.issue}`], ['leads', 'Leads', r => `/leads?open=${r.id}`, r => r.name]];
  const any = groups.some(([k]) => (results[k] || []).length);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 44,
      left: 0,
      right: 0,
      background: '#fff',
      border: '1px solid var(--ln)',
      borderRadius: 10,
      boxShadow: '0 8px 30px rgba(40,35,20,.14)',
      zIndex: 50,
      maxHeight: 380,
      overflowY: 'auto'
    }
  }, !any && /*#__PURE__*/React.createElement("div", {
    className: "empty",
    style: {
      padding: 20
    }
  }, "No matches"), groups.map(([k, label, path, text]) => (results[k] || []).length ? /*#__PURE__*/React.createElement("div", {
    key: k
  }, /*#__PURE__*/React.createElement("div", {
    className: "sg",
    style: {
      padding: '8px 12px 4px'
    }
  }, label), results[k].map(r => /*#__PURE__*/React.createElement("button", {
    key: r.id,
    className: "sn",
    style: {
      borderRadius: 0
    },
    onMouseDown: () => onPick(path(r))
  }, text(r)))) : null));
}
function PageHead({
  title,
  sub,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ph"
  }, /*#__PURE__*/React.createElement("h1", null, title), sub ? /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, sub) : null, /*#__PURE__*/React.createElement("div", {
    className: "spacer"
  }), children);
}
function Stat({
  n,
  v,
  s,
  tone
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "stc"
  }, /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, n), /*#__PURE__*/React.createElement("span", {
    className: 'v' + (tone ? ' ' + tone : '')
  }, v), /*#__PURE__*/React.createElement("span", {
    className: "s"
  }, s));
}
function StatRow({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "stc-row"
  }, children);
}
function useHashOpen(rows, openFn, loading) {
  const loc = useLocation();
  const openRef = useRef(openFn);
  const rowsRef = useRef(rows);
  openRef.current = openFn;
  rowsRef.current = rows;
  useEffect(() => {
    if (loading) return;
    const id = hashOpenId();
    if (!id) return;
    const list = rowsRef.current;
    if (!Array.isArray(list) || !list.length) return;
    const r = list.find(x => String(x.id) === id);
    if (r) openRef.current(r);
  }, [loading, loc.pathname]);
}

/* ---------------- TablePage ---------------- */
function TablePage({
  active,
  title,
  sub,
  endpoint,
  columns,
  rowToRecord,
  stats,
  chips,
  actions,
  primaryAction,
  entity,
  recFoot,
  rowSearch,
  refresh
}) {
  const loc = useLocation();
  const [filter, setFilter] = useState(chips?.[0]?.value ?? null);
  const [qLocal, setQLocal] = useState('');
  const [rec, setRec] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const path = endpoint + (filter ? (endpoint.includes('?') ? '&' : '?') + 'filter=' + filter : '');
  const {
    data,
    loading,
    reload
  } = useFetch(path, [path, refresh]);
  const allRows = Array.isArray(data) ? data : data?.data ?? [];
  const rows = rowSearch && qLocal.trim() ? allRows.filter(r => searchMatch(rowSearch(r), qLocal)) : allRows;
  const cfg = entity ? ENTITIES[entity] : null;
  const canMutate = !!(entity && ENTITY_STORE[entity]);
  const doDelete = async r => {
    if (!canMutate) return;
    if (!confirm(`Delete this ${cfg?.label || 'record'}? This cannot be undone.`)) return;
    if (entityDelete(entity, r.id)) {
      await afterMutation();
      setRec(null);
      reload();
    }
  };
  const doSaveEdit = async v => {
    if (!editRow || !canMutate) return;
    const row = DB[ENTITY_STORE[entity]]?.find(x => x.id === editRow.id);
    if (!row) return;
    entityApplyEdit(entity, row, v);
    await afterMutation();
    setEditRow(null);
    setRec(null);
    reload();
  };
  const openRow = r => {
    if (!rowToRecord) return;
    const base = rowToRecord(r);
    const extra = recFoot ? recFoot(r, () => {
      reload();
      setRec(null);
    }) : null;
    base.foot = /*#__PURE__*/React.createElement(React.Fragment, null, canMutate && /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      onClick: () => setEditRow(r)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "sliders",
      s: 14
    }), "Edit"), canMutate && /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      style: {
        color: 'var(--red)'
      },
      onClick: () => doDelete(r)
    }, "Delete"), extra);
    setRec(base);
  };
  const openRowRef = useRef(openRow);
  openRowRef.current = openRow;
  useEffect(() => {
    if (loading) return;
    const id = hashOpenId();
    if (!id) return;
    const r = allRows.find(x => String(x.id) === id);
    if (r) openRowRef.current(r);
  }, [loading, loc.pathname, data]);
  return /*#__PURE__*/React.createElement(Shell, {
    active: active
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: title,
    sub: sub
  }, actions, primaryAction || (entity ? /*#__PURE__*/React.createElement(CreateButton, {
    entity: entity,
    onDone: reload
  }) : /*#__PURE__*/React.createElement("button", {
    className: "btn-p"
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "plus",
    s: 14,
    sw: 2.2
  }), "New"))), stats && /*#__PURE__*/React.createElement(StatRow, null, stats.map((s, i) => /*#__PURE__*/React.createElement(Stat, {
    key: i,
    ...s
  }))), (chips || rowSearch) && /*#__PURE__*/React.createElement("div", {
    className: "chips",
    style: {
      alignItems: 'center'
    }
  }, chips && chips.map(c => /*#__PURE__*/React.createElement("span", {
    key: c.value ?? 'all',
    className: 'chip' + ((c.value ?? null) === filter ? ' on' : ''),
    onClick: () => setFilter(c.value ?? null)
  }, c.label)), rowSearch && /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      marginLeft: 'auto',
      maxWidth: 240,
      height: 34
    },
    placeholder: "Find on this page…",
    value: qLocal,
    onChange: e => setQLocal(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, loading ? /*#__PURE__*/React.createElement("div", {
    className: "loading"
  }, "Loading…") : rows.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No records yet") : /*#__PURE__*/React.createElement("div", {
    className: "tscroll"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    className: c.num ? 'num' : c.deskOnly ? 'desk-only' : ''
  }, c.label)))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.id,
    onClick: () => openRow(r)
  }, columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    className: (c.num ? 'num ' : '') + (c.deskOnly ? 'desk-only ' : '') + (c.t1 ? 't1' : '')
  }, c.render ? c.render(r) : r[c.key])))))))), /*#__PURE__*/React.createElement(Drawer, {
    rec: rec,
    onClose: () => setRec(null)
  }), editRow && /*#__PURE__*/React.createElement(FormModal, {
    title: 'Edit ' + (cfg?.label || 'record'),
    submitLabel: "Save Changes",
    fields: entityEditFields(entity),
    initial: entityToInitial(entity, editRow),
    onClose: () => setEditRow(null),
    onSave: doSaveEdit
  }));
}

/* ====================================================================== */
/* ====================  PAGES  ========================================= */
/* ====================================================================== */
const findCust = name => DB.customers.find(c => c.name === name) || {};
const waNumber = phone => {
  const d = String(phone || '').replace(/\D/g, '');
  return d ? '91' + d.replace(/^91/, '') : '';
};
function Letterhead() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderBottom: '2px solid #102a43',
      paddingBottom: 12,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: COMPANY.logo,
    alt: COMPANY.name,
    style: {
      height: 62,
      maxWidth: 280,
      objectFit: 'contain'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      fontSize: 10.5,
      lineHeight: 1.55,
      color: '#3a4147'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 13,
      color: '#102a43'
    }
  }, COMPANY.name), /*#__PURE__*/React.createElement("div", null, COMPANY.address), /*#__PURE__*/React.createElement("div", null, COMPANY.phone, " · ", COMPANY.email), /*#__PURE__*/React.createElement("div", null, COMPANY.web, COMPANY.gstin ? ' · GSTIN ' + COMPANY.gstin : ''), /*#__PURE__*/React.createElement("div", null, COMPANY.address), /*#__PURE__*/React.createElement("div", null, COMPANY.phone, " · ", COMPANY.email), /*#__PURE__*/React.createElement("div", null, COMPANY.web)));
}
function PartyBlock({
  label,
  doc
}) {
  const c = findCust(doc.customer?.name);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: '.08em',
      color: '#8b8577'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 14,
      marginTop: 4
    }
  }, doc.customer?.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#5d6470',
      marginTop: 2
    }
  }, [c.area, c.contact_name].filter(Boolean).join(' · ')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#5d6470'
    }
  }, c.phone || ''));
}
function ItemTable({
  items
}) {
  return /*#__PURE__*/React.createElement("table", {
    className: "sh-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      width: 30
    }
  }, "#"), /*#__PURE__*/React.createElement("th", null, "Description"), /*#__PURE__*/React.createElement("th", {
    className: "num",
    style: {
      width: 110
    }
  }, "Amount"))), /*#__PURE__*/React.createElement("tbody", null, items.map((it, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, i + 1), /*#__PURE__*/React.createElement("td", null, it.description), /*#__PURE__*/React.createElement("td", {
    className: "num"
  }, it.amount > 0 ? inr(it.amount) : 'incl.')))));
}
function Totals({
  total,
  extraRows
}) {
  const taxable = Math.round(total / 1.18);
  const gst = total - taxable;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 270,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '5px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#5d6470'
    }
  }, "Taxable value"), /*#__PURE__*/React.createElement("b", null, inr(taxable))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '5px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#5d6470'
    }
  }, "GST @ 18%"), /*#__PURE__*/React.createElement("b", null, inr(gst))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderTop: '1px solid #ddd',
      marginTop: 4,
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("b", null, "Grand Total"), /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#102a43'
    }
  }, inr(total))), extraRows));
}
function QuoteSheet({
  doc
}) {
  const items = doc.items?.length ? doc.items : [{
    description: doc.scope || 'CCTV solution',
    amount: doc.total
  }];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Letterhead, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(PartyBlock, {
    label: "QUOTATION FOR",
    doc: doc
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: '-.02em',
      color: '#102a43'
    }
  }, "QUOTATION"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#3a4147',
      marginTop: 6,
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, doc.number)), /*#__PURE__*/React.createElement("div", null, "Date: ", date(iso(0))), /*#__PURE__*/React.createElement("div", null, "Valid till: ", date(doc.valid_till))))), /*#__PURE__*/React.createElement(ItemTable, {
    items: items
  }), /*#__PURE__*/React.createElement(Totals, {
    total: doc.total
  }), /*#__PURE__*/React.createElement("div", {
    className: "sh-terms"
  }, /*#__PURE__*/React.createElement("b", null, "Terms & Conditions"), /*#__PURE__*/React.createElement("br", null), COMPANY.extras, /*#__PURE__*/React.createElement("br", null), COMPANY.quoteTerms, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 34
    }
  }, /*#__PURE__*/React.createElement("span", null, "Customer acceptance"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "For ", /*#__PURE__*/React.createElement("b", null, COMPANY.name), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("br", null), "Authorised Signatory"))));
}
function InvoiceSheet({
  doc
}) {
  const items = doc.items?.length ? doc.items : [{
    description: 'CCTV Supply, Installation & Commissioning',
    amount: doc.total
  }];
  const extra = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '5px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#1a7f4b'
    }
  }, "Received"), /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#1a7f4b'
    }
  }, inr(doc.paid))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '5px 0',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("b", null, "Balance Due"), /*#__PURE__*/React.createElement("b", {
    style: {
      color: doc.balance ? '#c0392b' : '#1a7f4b'
    }
  }, inr(doc.balance))));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Letterhead, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(PartyBlock, {
    label: "BILL TO",
    doc: doc
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: '-.02em',
      color: '#102a43'
    }
  }, "TAX INVOICE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#3a4147',
      marginTop: 6,
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, doc.number)), /*#__PURE__*/React.createElement("div", null, "Issued: ", date(doc.issue_date)), /*#__PURE__*/React.createElement("div", null, "Due: ", date(doc.due_date))))), /*#__PURE__*/React.createElement(ItemTable, {
    items: items
  }), /*#__PURE__*/React.createElement(Totals, {
    total: doc.total,
    extraRows: extra
  }), /*#__PURE__*/React.createElement("div", {
    className: "sh-terms"
  }, COMPANY.invoiceTerms, " ", COMPANY.extras, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: 34
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "For ", /*#__PURE__*/React.createElement("b", null, COMPANY.name), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("br", null), "Authorised Signatory"))));
}
function PrintHost({
  kind,
  doc,
  onClose
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "print-host"
  }, /*#__PURE__*/React.createElement("div", {
    className: "print-bar no-print"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ttl"
  }, kind === 'quote' ? 'Quotation' : 'Tax Invoice', " · ", doc.number, " · A4"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    onClick: onClose,
    style: {
      background: 'transparent',
      color: '#fff',
      borderColor: 'rgba(255,255,255,.3)'
    }
  }, "Close"), /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    onClick: () => window.print()
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "printer",
    s: 14
  }), "Print A4")), /*#__PURE__*/React.createElement("div", {
    className: "sheet-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet"
  }, kind === 'quote' ? /*#__PURE__*/React.createElement(QuoteSheet, {
    doc: doc
  }) : /*#__PURE__*/React.createElement(InvoiceSheet, {
    doc: doc
  }))));
}
function lineUnitPrice(it) {
  if (it.unit_price != null && it.unit_price !== '') return num(it.unit_price);
  const q = Math.max(1, num(it.qty) || 1);
  const a = num(it.amount);
  return q > 0 && a ? a / q : 0;
}
function lineTotalFromItem(it) {
  const q = Math.max(1, num(it.qty) || 1);
  return lineUnitPrice(it) * q;
}
function mapBuilderLine(i) {
  const qty = num(i.qty) || 1;
  const amount = num(i.amount);
  const unit_price = i.unit_price != null && i.unit_price !== '' ? num(i.unit_price) : amount && qty ? amount / qty : '';
  const lineAmount = unit_price ? unit_price * qty : amount;
  return {
    description: i.description,
    amount: lineAmount || amount || '',
    qty,
    product_id: i.product_id || '',
    unit_price: unit_price || ''
  };
}
function applyBuilderItemChange(it, k, v) {
  const next = {
    ...it,
    [k]: v
  };
  let qty = Math.max(1, num(k === 'qty' ? v : next.qty) || 1);
  next.qty = qty;
  if (k === 'amount') {
    const a = num(v);
    next.amount = a;
    next.unit_price = qty > 0 ? a / qty : '';
    return next;
  }
  let unit = next.unit_price != null && next.unit_price !== '' ? num(next.unit_price) : lineUnitPrice(next);
  if (k === 'unit_price') unit = num(v);
  if (unit > 0) {
    next.unit_price = unit;
    next.amount = unit * qty;
  }
  return next;
}
function catalogQuoteItems(plan, group) {
  const headDesc = plan.brand + ' ' + group + (group === 'AMC Plan' ? ' — annual contract' : ' — complete package');
  const main = {
    description: headDesc,
    amount: plan.price,
    qty: 1,
    product_id: ''
  };
  const headProd = findProductForLine(headDesc);
  if (headProd) main.product_id = headProd.id;
  return [main].concat((plan.items || []).map(d => {
    const prod = findProductForLine(String(d));
    return {
      description: d,
      amount: 0,
      qty: 1,
      product_id: prod ? prod.id : ''
    };
  }));
}
function QuoteBuilder({
  title,
  initial,
  editing,
  onClose,
  onSave
}) {
  const [customer, setCustomer] = useState(initial?.customer || '');
  const [scope, setScope] = useState(initial?.scope || '');
  const [items, setItems] = useState(initial?.items?.length ? initial.items.map(mapBuilderLine) : [{
    description: '',
    amount: '',
    qty: 1,
    product_id: '',
    unit_price: ''
  }]);
  const [status, setStatus] = useState(initial?.status || 'draft');
  const [owner, setOwner] = useState(initial?.owner || teamNames()[0] || 'Owner');
  const [err, setErr] = useState('');
  const total = items.reduce((a, i) => a + (Number(i.amount) || 0), 0);
  const setItem = (idx, k, v) => setItems(s => s.map((it, i) => i === idx ? applyBuilderItemChange(it, k, v) : it));
  const pickProduct = (idx, productId) => {
    const p = productId ? DB.products.find(x => x.id === +productId) : null;
    setItems(s => s.map((it, i) => {
      if (i !== idx) return it;
      const qty = Math.max(1, num(it.qty) || 1);
      if (!p) return {
        ...it,
        product_id: '',
        unit_price: ''
      };
      const unit = num(p.sale_price);
      return {
        ...it,
        product_id: p.id,
        description: p.name,
        unit_price: unit,
        amount: unit * qty
      };
    }));
  };
  const addLine = () => setItems(s => [...s, {
    description: '',
    amount: '',
    qty: 1,
    product_id: '',
    unit_price: ''
  }]);
  const removeLine = idx => setItems(s => s.length > 1 ? s.filter((_, i) => i !== idx) : s);
  return /*#__PURE__*/React.createElement("div", {
    className: "scrim show",
    style: {
      zIndex: 60
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%,-50%)',
      width: 540,
      maxWidth: '94vw',
      maxHeight: '90vh',
      overflowY: 'auto',
      background: 'var(--card)',
      border: '1px solid var(--ln)',
      borderRadius: 16,
      padding: '22px 22px 18px',
      boxShadow: '0 20px 60px rgba(40,35,20,.22)',
      zIndex: 61
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      letterSpacing: '-.01em',
      marginBottom: 8
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Customer"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    value: customer,
    onChange: e => setCustomer(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select…"), custNames().map(n => /*#__PURE__*/React.createElement("option", {
    key: n,
    value: n
  }, n)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Scope / title"), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    value: scope,
    placeholder: "e.g. 8-cam villa",
    onChange: e => setScope(e.target.value)
  }))), /*#__PURE__*/React.createElement("label", {
    className: "field-l",
    style: {
      marginBottom: 8
    }
  }, "Line items"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7
    }
  }, items.map((it, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    style: {
      display: 'flex',
      gap: 7,
      alignItems: 'center',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("select", {
    className: "inp",
    style: {
      width: 150,
      flex: 'none'
    },
    value: it.product_id || '',
    onChange: e => pickProduct(idx, e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Inventory…"), DB.products.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name))), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      flex: 1,
      minWidth: 120
    },
    placeholder: "Description",
    value: it.description,
    onChange: e => setItem(idx, 'description', e.target.value)
  }), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      width: 56,
      flex: 'none'
    },
    type: "number",
    min: 1,
    title: "Qty",
    placeholder: "Qty",
    value: it.qty,
    onChange: e => setItem(idx, 'qty', e.target.value)
  }), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      width: 110,
      flex: 'none'
    },
    type: "number",
    placeholder: "Line ₹",
    title: "Line total (qty × unit)",
    value: it.amount,
    onChange: e => setItem(idx, 'amount', e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "act",
    title: "Remove",
    style: {
      flex: 'none',
      fontSize: 18,
      lineHeight: 1
    },
    onClick: () => removeLine(idx)
  }, "×")))), /*#__PURE__*/React.createElement("button", {
    className: "btn-g",
    style: {
      marginTop: 8,
      paddingLeft: 0
    },
    onClick: addLine
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "plus",
    s: 13,
    sw: 2.4
  }), "Add line"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTop: '1px solid var(--ln)',
      marginTop: 10,
      paddingTop: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--mut)',
      fontWeight: 700
    }
  }, "Total (incl. GST)"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 19,
      fontWeight: 800
    }
  }, inr(total))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Status"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    value: status,
    onChange: e => setStatus(e.target.value)
  }, ['draft', 'sent', 'negotiation', 'accepted', 'expired'].map(s => /*#__PURE__*/React.createElement("option", {
    key: s,
    value: s
  }, s)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Owner"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    value: owner,
    onChange: e => setOwner(e.target.value)
  }, teamNames().map(t => /*#__PURE__*/React.createElement("option", {
    key: t,
    value: t
  }, t))))), err && /*#__PURE__*/React.createElement("div", {
    className: "err",
    style: {
      color: 'var(--red)',
      fontSize: 12,
      fontWeight: 700,
      marginTop: 10
    }
  }, err), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 9,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: onClose
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: () => {
      if (!customer) {
        setErr('Please select a customer.');
        return;
      }
      if (!items.some(i => String(i.description || '').trim())) {
        setErr('Add at least one line item with a description.');
        return;
      }
      onSave({
        customer,
        scope,
        items,
        status,
        owner
      });
    }
  }, editing ? 'Save Changes' : 'Create Quotation'))));
}
function InvoiceBuilder({
  title,
  initial,
  editing,
  onClose,
  onSave
}) {
  const [customer, setCustomer] = useState(initial?.customer || '');
  const [items, setItems] = useState(initial?.items?.length ? initial.items.map(mapBuilderLine) : [{
    description: '',
    amount: '',
    qty: 1,
    product_id: '',
    unit_price: ''
  }]);
  const [dueDays, setDueDays] = useState(initial?.dueDays ?? 15);
  const [note, setNote] = useState(initial?.note || '');
  const [err, setErr] = useState('');
  const total = items.reduce((a, i) => a + (Number(i.amount) || 0), 0);
  const setItem = (idx, k, v) => setItems(s => s.map((it, i) => i === idx ? applyBuilderItemChange(it, k, v) : it));
  const pickProduct = (idx, productId) => {
    const p = productId ? DB.products.find(x => x.id === +productId) : null;
    setItems(s => s.map((it, i) => {
      if (i !== idx) return it;
      const qty = Math.max(1, num(it.qty) || 1);
      if (!p) return {
        ...it,
        product_id: '',
        unit_price: ''
      };
      const unit = num(p.sale_price);
      return {
        ...it,
        product_id: p.id,
        description: p.name,
        unit_price: unit,
        amount: unit * qty
      };
    }));
  };
  const addLine = () => setItems(s => [...s, {
    description: '',
    amount: '',
    qty: 1,
    product_id: '',
    unit_price: ''
  }]);
  const removeLine = idx => setItems(s => s.length > 1 ? s.filter((_, i) => i !== idx) : s);
  return /*#__PURE__*/React.createElement("div", {
    className: "scrim show",
    style: {
      zIndex: 60
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%,-50%)',
      width: 540,
      maxWidth: '94vw',
      maxHeight: '90vh',
      overflowY: 'auto',
      background: 'var(--card)',
      border: '1px solid var(--ln)',
      borderRadius: 16,
      padding: '22px 22px 18px',
      boxShadow: '0 20px 60px rgba(40,35,20,.22)',
      zIndex: 61
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      letterSpacing: '-.01em',
      marginBottom: 8
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Customer"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    value: customer,
    onChange: e => setCustomer(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select…"), custNames().map(n => /*#__PURE__*/React.createElement("option", {
    key: n,
    value: n
  }, n)))), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 120
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Due in (days)"), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    type: "number",
    min: 1,
    value: dueDays,
    onChange: e => setDueDays(e.target.value)
  }))), /*#__PURE__*/React.createElement("label", {
    className: "field-l",
    style: {
      marginBottom: 8
    }
  }, "Line items"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7
    }
  }, items.map((it, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    style: {
      display: 'flex',
      gap: 7,
      alignItems: 'center',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("select", {
    className: "inp",
    style: {
      width: 150,
      flex: 'none'
    },
    value: it.product_id || '',
    onChange: e => pickProduct(idx, e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Inventory…"), DB.products.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name))), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      flex: 1,
      minWidth: 120
    },
    placeholder: "Description",
    value: it.description,
    onChange: e => setItem(idx, 'description', e.target.value)
  }), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      width: 56,
      flex: 'none'
    },
    type: "number",
    min: 1,
    title: "Qty",
    placeholder: "Qty",
    value: it.qty,
    onChange: e => setItem(idx, 'qty', e.target.value)
  }), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      width: 110,
      flex: 'none'
    },
    type: "number",
    placeholder: "Line ₹",
    title: "Line total (qty × unit)",
    value: it.amount,
    onChange: e => setItem(idx, 'amount', e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "act",
    title: "Remove",
    style: {
      flex: 'none',
      fontSize: 18,
      lineHeight: 1
    },
    onClick: () => removeLine(idx)
  }, "×")))), /*#__PURE__*/React.createElement("button", {
    className: "btn-g",
    style: {
      marginTop: 8,
      paddingLeft: 0
    },
    onClick: addLine
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "plus",
    s: 13,
    sw: 2.4
  }), "Add line"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTop: '1px solid var(--ln)',
      marginTop: 10,
      paddingTop: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--mut)',
      fontWeight: 700
    }
  }, "Total (incl. GST)"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 19,
      fontWeight: 800
    }
  }, inr(total))), /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Note"), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    value: note,
    placeholder: "Optional note",
    onChange: e => setNote(e.target.value)
  }), err && /*#__PURE__*/React.createElement("div", {
    className: "err",
    style: {
      color: 'var(--red)',
      fontSize: 12,
      fontWeight: 700,
      marginTop: 10
    }
  }, err), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 9,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: onClose
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: () => {
      if (!customer) {
        setErr('Please select a customer.');
        return;
      }
      if (!items.some(i => String(i.description || '').trim())) {
        setErr('Add at least one line item with a description.');
        return;
      }
      onSave({
        customer,
        items,
        dueDays: num(dueDays) || 15,
        note,
        total,
        editing
      });
    }
  }, editing ? 'Save Changes' : 'Create Invoice'))));
}
const Q_TONE = {
  draft: 'gray',
  sent: 'blue',
  negotiation: 'violet',
  accepted: 'green',
  expired: 'red'
};
function PlanEditor({
  plan,
  onClose,
  onSave
}) {
  const [brand, setBrand] = useState(plan.brand || '');
  const [price, setPrice] = useState(plan.price ?? '');
  const [items, setItems] = useState(plan.items?.length ? [...plan.items] : ['']);
  const setItem = (i, v) => setItems(s => s.map((x, j) => j === i ? v : x));
  return /*#__PURE__*/React.createElement("div", {
    className: "scrim show",
    style: {
      zIndex: 60
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%,-50%)',
      width: 430,
      maxWidth: '94vw',
      maxHeight: '90vh',
      overflowY: 'auto',
      background: 'var(--card)',
      border: '1px solid var(--ln)',
      borderRadius: 16,
      padding: '22px 22px 18px',
      boxShadow: '0 20px 60px rgba(40,35,20,.22)',
      zIndex: 61
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      marginBottom: 2
    }
  }, plan.isNew ? 'Add plan' : 'Edit plan'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--mut)',
      fontWeight: 700,
      marginBottom: 8
    }
  }, plan.group), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Brand / name"), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    value: brand,
    placeholder: "e.g. Hikvision",
    onChange: e => setBrand(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 130
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Price (₹", plan.group === 'AMC Plan' ? '/yr' : '', ")"), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    type: "number",
    value: price,
    onChange: e => setPrice(e.target.value)
  }))), /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Inclusions"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 7,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      flex: 1
    },
    value: it,
    placeholder: "Line item",
    onChange: e => setItem(i, e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "act",
    title: "Remove",
    style: {
      fontSize: 18,
      lineHeight: 1
    },
    onClick: () => setItems(s => s.length > 1 ? s.filter((_, j) => j !== i) : s)
  }, "×")))), /*#__PURE__*/React.createElement("button", {
    className: "btn-g",
    style: {
      marginTop: 8,
      paddingLeft: 0
    },
    onClick: () => setItems(s => [...s, ''])
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "plus",
    s: 13,
    sw: 2.4
  }), "Add line"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 9,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: onClose
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: () => onSave({
      ...plan,
      brand,
      price,
      items
    })
  }, plan.isNew ? 'Add plan' : 'Save plan'))));
}
function Dashboard() {
  const nav = useNavigate();
  const {
    data,
    loading
  } = useFetch('/dashboard');
  return /*#__PURE__*/React.createElement(Shell, {
    active: ""
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "Dashboard",
    sub: "Smart Vision Enterprise · Borsad"
  }, /*#__PURE__*/React.createElement(CreateButton, {
    entity: "lead",
    label: "New Lead",
    onDone: () => nav('/leads')
  })), loading || !data ? /*#__PURE__*/React.createElement("div", {
    className: "loading"
  }, "Loading…") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(StatRow, null, /*#__PURE__*/React.createElement(Stat, {
    n: "REVENUE — MONTH",
    v: lakh(data.kpis.revenue_month),
    s: "collected",
    tone: "up"
  }), /*#__PURE__*/React.createElement(Stat, {
    n: "OPEN LEADS",
    v: data.kpis.open_leads,
    s: lakh(data.kpis.pipeline_value) + ' in pipeline'
  }), /*#__PURE__*/React.createElement(Stat, {
    n: "ACTIVE AMC",
    v: data.kpis.active_amc,
    s: "contracts live"
  }), /*#__PURE__*/React.createElement(Stat, {
    n: "OPEN TICKETS",
    v: data.kpis.open_tickets,
    s: data.kpis.breaching_sla + ' breaching SLA',
    tone: data.kpis.breaching_sla ? 'dn' : undefined
  })), data.insights?.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "panel",
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pah",
    style: {
      padding: '0 0 12px',
      border: 'none'
    }
  }, /*#__PURE__*/React.createElement("h3", null, "AI Business Insights")), data.insights.map((c, i) => /*#__PURE__*/React.createElement("div", {
    className: "insight",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "idot",
    style: {
      background: `var(--${c.tone === 'red' ? 'red' : c.tone === 'amber' ? 'amber' : 'green'})`
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "it"
  }, c.title), /*#__PURE__*/React.createElement("div", {
    className: "ib"
  }, c.body))))), /*#__PURE__*/React.createElement("div", {
    className: "grid2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pah"
  }, /*#__PURE__*/React.createElement("h3", null, "Pipeline"), /*#__PURE__*/React.createElement("div", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("button", {
    className: "lnk",
    onClick: () => nav('/leads')
  }, "Open board ", /*#__PURE__*/React.createElement(Ic, {
    n: "chevR",
    s: 12
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flist"
  }, data.funnel.map(f => {
    const max = Math.max(...data.funnel.map(x => x.count)) || 1;
    return /*#__PURE__*/React.createElement("div", {
      className: "frow",
      key: f.name
    }, /*#__PURE__*/React.createElement("span", null, f.name), /*#__PURE__*/React.createElement("span", {
      className: "fbar"
    }, /*#__PURE__*/React.createElement("i", {
      style: {
        width: f.count / max * 100 + '%'
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "cnt"
    }, f.count));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pah"
  }, /*#__PURE__*/React.createElement("h3", null, "Recent quotations"), /*#__PURE__*/React.createElement("div", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("button", {
    className: "lnk",
    onClick: () => nav('/quotes')
  }, "View all ", /*#__PURE__*/React.createElement(Ic, {
    n: "chevR",
    s: 12
  }))), /*#__PURE__*/React.createElement("div", {
    className: "tscroll"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Quote"), /*#__PURE__*/React.createElement("th", null, "Customer"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Value"), /*#__PURE__*/React.createElement("th", null, "Status"))), /*#__PURE__*/React.createElement("tbody", null, data.recent_quotes.map(q => /*#__PURE__*/React.createElement("tr", {
    key: q.id,
    onClick: () => nav('/quotes')
  }, /*#__PURE__*/React.createElement("td", {
    className: "t1"
  }, q.number), /*#__PURE__*/React.createElement("td", {
    className: "t1"
  }, q.customer?.name), /*#__PURE__*/React.createElement("td", {
    className: "num t1"
  }, inr(q.total)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Pill, {
    t: Q_TONE[q.status],
    dot: true
  }, q.status)))))))))));
}
const LEAD_COLORS = ['#9ca3af', '#60a5fa', '#a78bfa', '#fbbf24', '#34d399'];
function Leads() {
  const {
    data,
    loading,
    reload
  } = useFetch('/leads-board');
  const [rec, setRec] = useState(null);
  const advance = async id => {
    await api.post(`/leads/${id}/advance`);
    await afterMutation();
    reload();
    setRec(null);
  };
  const openLead = l => setRec({
    title: l.name,
    subtitle: l.requirement,
    av: l.name,
    body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DwSection, {
      label: "Pipeline stage"
    }, /*#__PURE__*/React.createElement("div", {
      className: "stepper"
    }, ['Enquiry', 'Survey', 'Quoted', 'Negotiation', 'Won'].map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: s,
      className: 'stp ' + (i < l.stage ? 'done' : i === l.stage ? 'cur' : '')
    }, /*#__PURE__*/React.createElement("span", {
      className: "sdot"
    }, i < l.stage ? /*#__PURE__*/React.createElement(Ic, {
      n: "check",
      s: 11,
      sw: 2.6
    }) : null), /*#__PURE__*/React.createElement("span", {
      className: "sl"
    }, s))))), /*#__PURE__*/React.createElement(DwSection, {
      label: "Lead details"
    }, /*#__PURE__*/React.createElement(DwBox, {
      rows: [['Estimated value', inr(l.value)], ['Source', l.source || '—'], ['Segment', l.segment || '—'], ['Owner', l.owner?.name || '—']]
    }))),
    foot: /*#__PURE__*/React.createElement("button", {
      className: "btn-p",
      style: {
        flex: 1,
        justifyContent: 'center'
      },
      onClick: () => advance(l.id),
      disabled: l.stage >= 4
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "check",
      s: 14,
      sw: 2.4
    }), "Advance Stage")
  });
  useHashOpen(data ? data.flatMap(c => c.items) : [], openLead, loading);
  return /*#__PURE__*/React.createElement(Shell, {
    active: "leads"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "CRM — Sales Pipeline",
    sub: data ? `${data.reduce((a, c) => a + (c.stage < 4 ? c.items.length : 0), 0)} open leads` : ''
  }, /*#__PURE__*/React.createElement(CreateButton, {
    entity: "lead",
    onDone: reload
  })), loading || !data ? /*#__PURE__*/React.createElement("div", {
    className: "loading"
  }, "Loading…") : /*#__PURE__*/React.createElement("div", {
    className: "kan"
  }, data.map(col => /*#__PURE__*/React.createElement("div", {
    className: "kol",
    key: col.stage
  }, /*#__PURE__*/React.createElement("div", {
    className: "kolh"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cd",
    style: {
      background: LEAD_COLORS[col.stage]
    }
  }), col.name, /*#__PURE__*/React.createElement("span", {
    className: "cnt"
  }, col.items.length), /*#__PURE__*/React.createElement("span", {
    className: "sum"
  }, lakh(col.sum))), col.items.map(l => /*#__PURE__*/React.createElement("div", {
    className: "kard",
    key: l.id,
    onClick: () => openLead(l)
  }, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, l.name), /*#__PURE__*/React.createElement("div", {
    className: "rq"
  }, l.requirement), /*#__PURE__*/React.createElement("div", {
    className: "ktags"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ktag src"
  }, l.source), /*#__PURE__*/React.createElement("span", {
    className: "ktag"
  }, l.segment)), /*#__PURE__*/React.createElement("div", {
    className: "kft"
  }, /*#__PURE__*/React.createElement(Av, {
    name: l.owner?.name || '?',
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    className: "kval"
  }, inr(l.value)))))))), /*#__PURE__*/React.createElement(Drawer, {
    rec: rec,
    onClose: () => setRec(null)
  }));
}
function Quotes() {
  const [filter, setFilter] = useState(null);
  const path = '/quotes' + (filter ? '?filter=' + filter : '');
  const {
    data,
    loading,
    reload
  } = useFetch(path, [path]);
  const rows = data?.data ?? [];
  const [rec, setRec] = useState(null);
  const [printDoc, setPrintDoc] = useState(null);
  const [builder, setBuilder] = useState(null);
  const [planEdit, setPlanEdit] = useState(null);
  const [, force] = useState(0);
  const savePlan = async v => {
    const price = num(v.price);
    const items = v.items.map(s => s.trim()).filter(Boolean);
    if (!v.brand.trim()) return;
    if (v.isNew) CATALOG.push({
      id: CATALOG.reduce((m, x) => Math.max(m, x.id), 0) + 1,
      group: v.group,
      brand: v.brand.trim(),
      price,
      items
    });else {
      const p = CATALOG.find(x => x.id === v.id);
      if (p) Object.assign(p, {
        brand: v.brand.trim(),
        price,
        items
      });
    }
    await saveCatalog();
    setPlanEdit(null);
    force(n => n + 1);
  };
  const saveQuote = async q => {
    const items = normalizeQuoteItems(q.items);
    const total = items.reduce((a, i) => a + i.amount, 0);
    if (builder?.editing) {
      const ex = DB.quotes.find(x => x.id === builder.editing);
      if (ex) {
        Object.assign(ex, {
          customer: O(q.customer),
          scope: q.scope || items[0]?.description || ex.scope,
          total,
          status: q.status,
          owner: O(q.owner),
          items
        });
        if (ex.status === 'accepted' && !ex.converted) convertQuote(ex);
      }
    } else {
      const nq = {
        id: nextId(DB.quotes),
        number: genNum('QT-', DB.quotes, 1000),
        customer: O(q.customer),
        scope: q.scope || items[0]?.description || 'Custom quotation',
        total,
        status: q.status || 'draft',
        owner: O(q.owner || teamNames()[0]),
        valid_till: iso(15),
        items
      };
      DB.quotes.push(nq);
      if (nq.status === 'accepted') convertQuote(nq);
    }
    await commitChange();
    setBuilder(null);
    setRec(null);
    setFilter(null);
    reload();
  };
  const waQuote = r => {
    const message = `Hello ${r.customer?.name || ''},\n\nPlease find your quotation ${r.number} — ${r.scope || 'CCTV solution'}.\nTotal: ${inr(r.total)} (incl. GST), valid till ${date(r.valid_till)}.\n\nRegards,\n${COMPANY.name}\n${COMPANY.phone}`;
    waOpen(r.customer?.name, message, {
      kind: 'quote',
      doc: r
    });
  };
  const open = r => setRec({
    title: r.number,
    subtitle: r.customer?.name,
    icon: 'file',
    body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DwSection, {
      label: "Summary"
    }, /*#__PURE__*/React.createElement(DwBox, {
      rows: [['Status', /*#__PURE__*/React.createElement(Pill, {
        t: Q_TONE[r.status],
        dot: true
      }, r.status)], ['Valid till', date(r.valid_till)], ['Owner', r.owner?.name || '—'], ['Scope', r.scope || '—'], ['Total', inr(r.total)], ...(r.converted ? [['Invoice', r.invoice_number || '—'], ['Install job', r.job_number || '—']] : []), ...(r.stock_note ? [['Stock', r.stock_note]] : [])]
    })), /*#__PURE__*/React.createElement(DwSection, {
      label: "Line items"
    }, !r.items || !r.items.length ? /*#__PURE__*/React.createElement("div", {
      className: "empty",
      style: {
        padding: 14,
        fontSize: 12
      }
    }, "No line items yet — tap Edit to add products and amounts.") : /*#__PURE__*/React.createElement("div", {
      className: "dwbox"
    }, r.items.map(it => /*#__PURE__*/React.createElement("div", {
      className: "li",
      key: it.id
    }, /*#__PURE__*/React.createElement("div", {
      className: "lin"
    }, it.description, it.qty > 1 ? ` × ${it.qty}` : ''), /*#__PURE__*/React.createElement("span", {
      className: "lip"
    }, it.amount > 0 ? inr(it.amount) : 'incl.')))))),
    foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      onClick: () => setBuilder({
        title: 'Edit ' + r.number,
        editing: r.id,
        initial: {
          customer: r.customer?.name,
          scope: r.scope,
          items: r.items,
          status: r.status,
          owner: r.owner?.name
        }
      })
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "sliders",
      s: 14
    }), "Edit"), /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      style: {
        color: 'var(--red)'
      },
      onClick: async () => {
        if (confirm(`Delete quotation ${r.number}?`)) {
          entityDelete('quote', r.id);
          await afterMutation();
          setRec(null);
          reload();
        }
      }
    }, "Delete"), /*#__PURE__*/React.createElement("button", {
      className: "btn-o wa-btn",
      onClick: () => waQuote(r)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "whatsapp",
      s: 14
    }), "Send"), /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      onClick: () => setPrintDoc(r)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "printer",
      s: 14
    }), "Print A4"))
  });
  return /*#__PURE__*/React.createElement(Shell, {
    active: "quotes"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "Quotations",
    sub: "Sales quotes & standard packages"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    onClick: () => setBuilder({
      title: 'New Quotation',
      initial: {},
      key: 'new-' + Date.now()
    })
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "plus",
    s: 14,
    sw: 2.2
  }), "New Quotation")), [['HD Camera Solution', '· 4 CH · 4 cameras · tap a card to quote', true], ['IP Camera Solution', '· 4 CH · 4 cameras · tap a card to quote', true], ['AMC Plan', '· annual maintenance · tap a card to quote', false]].map(([g, sub, showExtras]) => /*#__PURE__*/React.createElement("div", {
    className: "panel",
    key: g,
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pah",
    style: {
      padding: '0 0 12px',
      border: 'none'
    }
  }, /*#__PURE__*/React.createElement("h3", null, g), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, sub), /*#__PURE__*/React.createElement("div", {
    className: "spacer",
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn-g",
    onClick: () => setPlanEdit({
      group: g,
      isNew: true,
      brand: '',
      price: '',
      items: ['']
    })
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "plus",
    s: 13,
    sw: 2.2
  }), "Add plan")), /*#__PURE__*/React.createElement("div", {
    className: "grid-cards"
  }, CATALOG.filter(p => p.group === g).map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    style: {
      border: '1px solid var(--ln)',
      borderRadius: 12,
      padding: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      fontSize: 14
    }
  }, p.brand), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      fontSize: 16,
      color: 'var(--a-ink)'
    }
  }, inr(p.price), g === 'AMC Plan' ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--mut)'
    }
  }, "/yr") : '')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--ink2)',
      fontWeight: 600,
      lineHeight: 1.5
    }
  }, p.items.join(' · ')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 2,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-o",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: e => {
      e.stopPropagation();
      setBuilder({
        title: 'Quote · ' + p.brand + ' ' + p.group,
        initial: {
          scope: p.brand + ' ' + p.group,
          items: catalogQuoteItems(p, g)
        }
      });
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "plus",
    s: 13,
    sw: 2.2
  }), "Quote this"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-o",
    onClick: e => {
      e.stopPropagation();
      setPlanEdit({
        id: p.id,
        group: p.group,
        brand: p.brand,
        price: p.price,
        items: [...p.items]
      });
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "sliders",
    s: 14
  }), "Edit"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-o",
    style: {
      color: 'var(--red)'
    },
    onClick: async e => {
      e.stopPropagation();
      if (confirm(`Delete the ${p.brand} ${p.group} plan?`)) {
        const i = CATALOG.findIndex(x => x.id === p.id);
        if (i >= 0) CATALOG.splice(i, 1);
        await saveCatalog();
        force(n => n + 1);
      }
    }
  }, "Delete"))))), showExtras && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--mut)',
      fontWeight: 600,
      marginTop: 10
    }
  }, COMPANY.extras))), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, [['All', null], ['Draft', 'draft'], ['Sent', 'sent'], ['Accepted', 'accepted'], ['Expired', 'expired']].map(([l, v]) => /*#__PURE__*/React.createElement("span", {
    key: l,
    className: 'chip' + (v === filter ? ' on' : ''),
    onClick: () => setFilter(v)
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, loading ? /*#__PURE__*/React.createElement("div", {
    className: "loading"
  }, "Loading…") : rows.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No quotations") : /*#__PURE__*/React.createElement("div", {
    className: "tscroll"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Quote"), /*#__PURE__*/React.createElement("th", null, "Customer"), /*#__PURE__*/React.createElement("th", {
    className: "desk-only"
  }, "Scope"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Value"), /*#__PURE__*/React.createElement("th", null, "Status"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.id,
    onClick: () => open(r)
  }, /*#__PURE__*/React.createElement("td", {
    className: "t1"
  }, r.number), /*#__PURE__*/React.createElement("td", {
    className: "t1"
  }, r.customer?.name), /*#__PURE__*/React.createElement("td", {
    className: "desk-only"
  }, r.scope), /*#__PURE__*/React.createElement("td", {
    className: "num t1"
  }, inr(r.total)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Pill, {
    t: Q_TONE[r.status],
    dot: true
  }, r.status)))))))), /*#__PURE__*/React.createElement(Drawer, {
    rec: rec,
    onClose: () => setRec(null)
  }), builder && /*#__PURE__*/React.createElement(QuoteBuilder, {
    key: builder.key || builder.title,
    title: builder.title,
    initial: builder.initial,
    editing: builder.editing,
    onClose: () => setBuilder(null),
    onSave: saveQuote
  }), planEdit && /*#__PURE__*/React.createElement(PlanEditor, {
    plan: planEdit,
    onClose: () => setPlanEdit(null),
    onSave: savePlan
  }), printDoc && /*#__PURE__*/React.createElement(PrintHost, {
    kind: "quote",
    doc: printDoc,
    onClose: () => setPrintDoc(null)
  }));
}
const INV_TONE = {
  draft: 'gray',
  sent: 'blue',
  partial: 'amber',
  paid: 'green',
  overdue: 'red'
};
function Invoices() {
  const [filter, setFilter] = useState(null);
  const path = '/invoices' + (filter ? '?status=' + filter : '');
  const {
    data,
    loading,
    reload
  } = useFetch(path, [path]);
  const {
    data: stats,
    reload: reloadStats
  } = useFetch('/invoices-stats');
  const [rec, setRec] = useState(null);
  const rows = data?.data ?? [];
  const [payFor, setPayFor] = useState(null);
  const [printDoc, setPrintDoc] = useState(null);
  const [invoiceBuilder, setInvoiceBuilder] = useState(null);
  const whatsapp = r => {
    const message = `Hello ${r.customer?.name || ''},\n\nGentle reminder for invoice ${r.number}.\nTotal: ${inr(r.total)} · Received: ${inr(r.paid)} · Balance due: ${inr(r.balance)} (due ${date(r.due_date)}).\n\nRegards,\n${COMPANY.name}\n${COMPANY.phone}`;
    waOpen(r.customer?.name, message, {
      kind: 'invoice',
      doc: r
    });
  };
  const recordPayment = async vals => {
    const inv = DB.invoices.find(x => x.id === payFor.id);
    if (inv) {
      const amt = Math.min(num(inv.total) - num(inv.paid), Number(vals.amount) || 0);
      if (amt > 0) {
        inv.paid = num(inv.paid) + amt;
        if (!Array.isArray(inv.payments)) inv.payments = [];
        inv.payments.push({
          amount: amt,
          on: iso(0)
        });
      }
      inv.balance = inv.total - inv.paid;
      inv.status = inv.balance <= 0 ? 'paid' : inv.paid > 0 ? 'partial' : inv.status;
    }
    await commitChange();
    setPayFor(null);
    reload();
    reloadStats();
  };
  const saveInvoice = async v => {
    const items = normalizeQuoteItems(v.items);
    const total = items.reduce((a, i) => a + i.amount, 0) || num(v.total);
    if (v.editing) {
      const row = DB.invoices.find(x => x.id === v.editing);
      if (row) {
        entityApplyEdit('invoice', row, {
          customer: v.customer,
          total,
          paid: row.paid,
          status: row.status,
          issue_date: row.issue_date,
          due_date: row.due_date,
          note: v.note,
          items
        });
      }
    } else {
      const inv = createInvoice({
        customer: v.customer,
        total,
        items,
        dueDays: v.dueDays,
        note: v.note,
        persist: false
      });
      if (!inv) return;
    }
    await commitChange();
    setInvoiceBuilder(null);
    setRec(null);
    reload();
    reloadStats();
  };
  const open = r => setRec({
    title: r.number,
    subtitle: r.customer?.name,
    icon: 'file',
    body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DwSection, {
      label: "Invoice"
    }, /*#__PURE__*/React.createElement(DwBox, {
      rows: [['Status', /*#__PURE__*/React.createElement(Pill, {
        t: INV_TONE[r.status],
        dot: true
      }, r.status)], ['Issued', date(r.issue_date)], ['Due', date(r.due_date)], ['Total', inr(r.total)], ['Received', inr(r.paid)], ['Balance', inr(r.balance)], ...(r.stock_note ? [['Stock', r.stock_note]] : [])]
    })), /*#__PURE__*/React.createElement(DwSection, {
      label: "Line items"
    }, !r.items || !r.items.length ? /*#__PURE__*/React.createElement("div", {
      className: "empty",
      style: {
        padding: 14,
        fontSize: 12
      }
    }, "No line items — tap Edit to add products and amounts.") : /*#__PURE__*/React.createElement("div", {
      className: "dwbox"
    }, r.items.map(it => /*#__PURE__*/React.createElement("div", {
      className: "li",
      key: it.id
    }, /*#__PURE__*/React.createElement("div", {
      className: "lin"
    }, it.description, it.qty > 1 ? ` × ${it.qty}` : ''), /*#__PURE__*/React.createElement("span", {
      className: "lip"
    }, it.amount > 0 ? inr(it.amount) : 'incl.')))))),
    foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      onClick: () => setInvoiceBuilder({
        title: 'Edit ' + r.number,
        editing: r.id,
        initial: {
          customer: r.customer?.name,
          items: r.items,
          note: r.note || '',
          dueDays: Math.max(1, Math.round((new Date(r.due_date).getTime() - new Date(r.issue_date).getTime()) / 864e5))
        }
      })
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "sliders",
      s: 14
    }), "Edit"), /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      style: {
        color: 'var(--red)'
      },
      onClick: async () => {
        if (confirm(`Delete invoice ${r.number}?`)) {
          entityDelete('invoice', r.id);
          await afterMutation();
          setRec(null);
          reload();
          reloadStats();
        }
      }
    }, "Delete"), /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      onClick: () => setPrintDoc(r)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "printer",
      s: 14
    }), "Print"), /*#__PURE__*/React.createElement("button", {
      className: "btn-o wa-btn",
      onClick: () => whatsapp(r)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "whatsapp",
      s: 14
    }), "Remind"), /*#__PURE__*/React.createElement("button", {
      className: "btn-p",
      onClick: () => {
        setRec(null);
        setPayFor(r);
      }
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "check",
      s: 14,
      sw: 2.4
    }), "Record Payment"))
  });
  useHashOpen(rows, open, loading);
  return /*#__PURE__*/React.createElement(Shell, {
    active: "invoices"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "Billing & Invoices"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    onClick: () => setInvoiceBuilder({
      title: 'New Invoice',
      initial: {},
      key: 'new-' + Date.now()
    })
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "plus",
    s: 14,
    sw: 2.2
  }), "New Invoice")), stats && /*#__PURE__*/React.createElement(StatRow, null, /*#__PURE__*/React.createElement(Stat, {
    n: "BILLED",
    v: lakh(stats.billed),
    s: "total"
  }), /*#__PURE__*/React.createElement(Stat, {
    n: "RECEIVED",
    v: lakh(stats.received),
    s: "collected",
    tone: "up"
  }), /*#__PURE__*/React.createElement(Stat, {
    n: "OUTSTANDING",
    v: lakh(stats.outstanding),
    s: "receivable"
  }), /*#__PURE__*/React.createElement(Stat, {
    n: "OVERDUE",
    v: lakh(stats.overdue),
    s: "past due",
    tone: "dn"
  })), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, [['All', null], ['Paid', 'paid'], ['Partial', 'partial'], ['Overdue', 'overdue'], ['Draft', 'draft']].map(([l, v]) => /*#__PURE__*/React.createElement("span", {
    key: l,
    className: 'chip' + (v === filter ? ' on' : ''),
    onClick: () => setFilter(v)
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, loading ? /*#__PURE__*/React.createElement("div", {
    className: "loading"
  }, "Loading…") : rows.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No invoices") : /*#__PURE__*/React.createElement("div", {
    className: "tscroll"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Invoice"), /*#__PURE__*/React.createElement("th", null, "Customer"), /*#__PURE__*/React.createElement("th", null, "Due"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Amount"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Balance"), /*#__PURE__*/React.createElement("th", null, "Status"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.id,
    onClick: () => open(r)
  }, /*#__PURE__*/React.createElement("td", {
    className: "t1"
  }, r.number), /*#__PURE__*/React.createElement("td", {
    className: "t1"
  }, r.customer?.name), /*#__PURE__*/React.createElement("td", null, date(r.due_date)), /*#__PURE__*/React.createElement("td", {
    className: "num t1"
  }, inr(r.total)), /*#__PURE__*/React.createElement("td", {
    className: "num",
    style: {
      color: r.balance ? 'var(--red)' : 'var(--mut)'
    }
  }, r.balance ? inr(r.balance) : '✓'), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Pill, {
    t: INV_TONE[r.status],
    dot: true
  }, r.status)))))))), payFor && /*#__PURE__*/React.createElement(FormModal, {
    title: `Record Payment · ${payFor.number}`,
    submitLabel: "Save Payment",
    initial: {
      amount: payFor.balance
    },
    fields: [{
      key: 'amount',
      label: 'Amount (₹)',
      type: 'number'
    }],
    onClose: () => setPayFor(null),
    onSave: recordPayment
  }), invoiceBuilder && /*#__PURE__*/React.createElement(InvoiceBuilder, {
    key: invoiceBuilder.key || invoiceBuilder.title,
    title: invoiceBuilder.title,
    initial: invoiceBuilder.initial,
    editing: invoiceBuilder.editing,
    onClose: () => setInvoiceBuilder(null),
    onSave: v => saveInvoice({
      ...v,
      editing: invoiceBuilder.editing
    })
  }), printDoc && /*#__PURE__*/React.createElement(PrintHost, {
    kind: "invoice",
    doc: printDoc,
    onClose: () => setPrintDoc(null)
  }), /*#__PURE__*/React.createElement(Drawer, {
    rec: rec,
    onClose: () => setRec(null)
  }));
}
const OUT_TONE = {
  sent: 'blue',
  partial: 'amber',
  overdue: 'red'
};
function Outstanding() {
  const {
    data,
    loading
  } = useFetch('/reports/outstanding');
  return /*#__PURE__*/React.createElement(Shell, {
    active: "outstanding"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "Outstanding Payments",
    sub: "Receivables by due date"
  }), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, loading || !data ? /*#__PURE__*/React.createElement("div", {
    className: "loading"
  }, "Loading…") : data.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "All clear — nothing outstanding") : /*#__PURE__*/React.createElement("div", {
    className: "tscroll"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Invoice"), /*#__PURE__*/React.createElement("th", null, "Customer"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Total"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Balance"), /*#__PURE__*/React.createElement("th", null, "Due"), /*#__PURE__*/React.createElement("th", null, "Status"))), /*#__PURE__*/React.createElement("tbody", null, data.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    className: "t1"
  }, r.number), /*#__PURE__*/React.createElement("td", null, r.customer), /*#__PURE__*/React.createElement("td", {
    className: "num"
  }, inr(r.total)), /*#__PURE__*/React.createElement("td", {
    className: "num t1",
    style: {
      color: 'var(--red)'
    }
  }, inr(r.balance)), /*#__PURE__*/React.createElement("td", null, r.due_date || '—'), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Pill, {
    t: OUT_TONE[r.status],
    dot: true
  }, r.status)))))))));
}
function Accounts() {
  const [period, setPeriod] = useState('month');
  const [dir, setDir] = useState(null);
  const [rec, setRec] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const {
    data,
    loading,
    reload
  } = useFetch('/accounts?period=' + period, [period]);
  const rows = (data?.rows || []).filter(r => !dir || r.direction === dir);
  const today = iso(0).slice(0, 10);
  const open = r => {
    const locked = !!r.locked;
    setRec({
      title: r.direction === 'in' ? 'Money in' : 'Money out',
      subtitle: r.number || r.category,
      icon: 'wallet',
      body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DwSection, {
        label: "Entry"
      }, /*#__PURE__*/React.createElement(DwBox, {
        rows: [['Type', r.direction === 'in' ? 'Money in' : 'Money out'], ['Category', r.category], ['Amount', inr(r.amount)], ['Date', date(r.on)], ['Party', r.party || '—'], ['Source', r.source === 'invoice' ? 'Invoice payment' : r.source === 'purchase' ? 'Purchase order' : 'Manual cashbook'], ['Note', r.note || '—']]
      })), locked && /*#__PURE__*/React.createElement("div", {
        className: "t2",
        style: {
          padding: '8px 2px'
        }
      }, r.source === 'invoice' ? 'Collected from Billing — record extra payments on the invoice.' : 'Paid via Purchase Management when the PO is marked received.')),
      foot: locked ? null : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        className: "btn-o",
        onClick: () => setEditRow(r)
      }, /*#__PURE__*/React.createElement(Ic, {
        n: "sliders",
        s: 14
      }), "Edit"), /*#__PURE__*/React.createElement("button", {
        className: "btn-o",
        style: {
          color: 'var(--red)'
        },
        onClick: async () => {
          if (!confirm('Delete this cashbook entry?')) return;
          entityDelete('ledger', r.id);
          await afterMutation();
          setRec(null);
          reload();
        }
      }, "Delete"))
    });
  };
  return /*#__PURE__*/React.createElement(Shell, {
    active: "accounts"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "Accounts",
    sub: "Money in, money out & profit"
  }, /*#__PURE__*/React.createElement(CreateButton, {
    entity: "ledger",
    label: "Money in",
    className: "btn-p",
    initial: {
      direction: 'in',
      category: 'Other income',
      on: today
    },
    onDone: reload
  }), /*#__PURE__*/React.createElement(CreateButton, {
    entity: "ledger",
    label: "Money out",
    className: "btn-o",
    initial: {
      direction: 'out',
      category: 'Rent',
      on: today
    },
    onDone: reload
  })), data && /*#__PURE__*/React.createElement(StatRow, null, /*#__PURE__*/React.createElement(Stat, {
    n: "MONEY IN",
    v: lakh(data.money_in),
    s: "collections + other",
    tone: "up"
  }), /*#__PURE__*/React.createElement(Stat, {
    n: "MONEY OUT",
    v: lakh(data.money_out),
    s: "purchases + expenses",
    tone: "dn"
  }), /*#__PURE__*/React.createElement(Stat, {
    n: "CASH PROFIT",
    v: lakh(data.profit),
    s: data.margin + '% of money in',
    tone: data.profit >= 0 ? 'up' : 'dn'
  }), /*#__PURE__*/React.createElement(Stat, {
    n: "BOOK PROFIT",
    v: lakh(data.book_profit),
    s: "billed − purchases − expenses"
  })), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, [['This month', 'month'], ['All time', 'all']].map(([l, v]) => /*#__PURE__*/React.createElement("span", {
    key: v,
    className: 'chip' + (period === v ? ' on' : ''),
    onClick: () => setPeriod(v)
  }, l)), [['All entries', null], ['In', 'in'], ['Out', 'out']].map(([l, v]) => /*#__PURE__*/React.createElement("span", {
    key: l,
    className: 'chip' + (dir === v ? ' on' : ''),
    onClick: () => setDir(v)
  }, l))), data && /*#__PURE__*/React.createElement("div", {
    className: "panel",
    style: {
      padding: 16,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 13,
      marginBottom: 10
    }
  }, "Breakdown"), /*#__PURE__*/React.createElement("div", {
    className: "dwbox"
  }, /*#__PURE__*/React.createElement("div", {
    className: "drow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Customer collections"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, inr(data.collections))), /*#__PURE__*/React.createElement("div", {
    className: "drow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Other income"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, inr(data.other_in))), /*#__PURE__*/React.createElement("div", {
    className: "drow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Purchases (received POs)"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, inr(data.purchases))), /*#__PURE__*/React.createElement("div", {
    className: "drow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Operating expenses"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, inr(data.expenses))), /*#__PURE__*/React.createElement("div", {
    className: "drow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Billed (invoices)"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, inr(data.billed)))), /*#__PURE__*/React.createElement("div", {
    className: "t2",
    style: {
      marginTop: 10
    }
  }, "Customer collections come from invoice payments. Supplier spend comes from received purchase orders. Add rent, salary and other cash here.")), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, loading || !data ? /*#__PURE__*/React.createElement("div", {
    className: "loading"
  }, "Loading…") : rows.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No money movements in this period") : /*#__PURE__*/React.createElement("div", {
    className: "tscroll"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Date"), /*#__PURE__*/React.createElement("th", null, "Type"), /*#__PURE__*/React.createElement("th", null, "Category"), /*#__PURE__*/React.createElement("th", {
    className: "desk-only"
  }, "Party"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Amount"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: String(r.id),
    onClick: () => open(r)
  }, /*#__PURE__*/React.createElement("td", null, date(r.on)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Pill, {
    t: r.direction === 'in' ? 'green' : 'red',
    dot: true
  }, r.direction === 'in' ? 'In' : 'Out')), /*#__PURE__*/React.createElement("td", {
    className: "t1"
  }, r.category, /*#__PURE__*/React.createElement("div", {
    className: "t2"
  }, r.number || r.note)), /*#__PURE__*/React.createElement("td", {
    className: "desk-only"
  }, r.party), /*#__PURE__*/React.createElement("td", {
    className: "num t1",
    style: {
      color: r.direction === 'in' ? 'var(--green)' : 'var(--red)'
    }
  }, r.direction === 'in' ? '+' : '−', inr(r.amount)))))))), /*#__PURE__*/React.createElement(Drawer, {
    rec: rec,
    onClose: () => setRec(null)
  }), editRow && /*#__PURE__*/React.createElement(FormModal, {
    title: "Edit cash entry",
    submitLabel: "Save Changes",
    fields: ENTITIES.ledger.fields,
    initial: entityToInitial('ledger', editRow),
    onClose: () => setEditRow(null),
    onSave: async v => {
      const row = DB.ledger.find(x => x.id === editRow.id);
      if (row) entityApplyEdit('ledger', row, v);
      await afterMutation();
      setEditRow(null);
      setRec(null);
      reload();
    }
  }));
}
const CUST_TYPE = {
  Residential: 'blue',
  Commercial: 'violet',
  Industrial: 'amber'
};
const REP_STATUS = {
  received: ['Received', 'blue'],
  diagnosing: ['Diagnosing', 'amber'],
  repairing: ['Repairing', 'violet'],
  ready: ['Ready', 'green'],
  delivered: ['Delivered', 'gray']
};
const REP_COV = {
  amc: 'violet',
  warranty: 'blue',
  paid: 'gray'
};
function repairStatus(status) {
  return REP_STATUS[status] || ['Unknown', 'gray'];
}
function buildTimeline(name) {
  const ev = [];
  DB.quotes.filter(q => q.customer?.name === name).forEach(q => {
    ev.push({
      t: new Date(q.valid_till).getTime() - 15 * 864e5,
      icon: 'file',
      tone: 'blue',
      title: `Quotation ${q.number}`,
      detail: q.scope || '—',
      amount: q.total,
      tag: q.status
    });
  });
  DB.jobs.filter(j => j.customer?.name === name).forEach(j => {
    ev.push({
      t: new Date(j.scheduled_on).getTime(),
      icon: j.type === 'repair' ? 'wrench' : 'calendar',
      tone: j.status === 'done' ? 'green' : 'amber',
      title: `${j.type === 'install' ? 'Installation' : j.type === 'survey' ? 'Site survey' : j.type === 'repair' ? 'Repair visit' : 'AMC visit'} ${j.number}`,
      detail: j.scope || '—',
      tag: j.status.replace('_', ' ')
    });
  });
  DB.invoices.filter(i => i.customer?.name === name).forEach(i => {
    ev.push({
      t: new Date(i.issue_date).getTime(),
      icon: 'file',
      tone: 'gray',
      title: `Invoice ${i.number}`,
      detail: i.note ? 'Billed · ' + i.note : 'Billed',
      amount: i.total,
      tag: i.status
    });
    if (Array.isArray(i.payments) && i.payments.length) {
      i.payments.forEach(p => ev.push({
        t: new Date(p.on).getTime(),
        icon: 'check',
        tone: 'green',
        title: 'Payment received',
        detail: `Against ${i.number}`,
        amount: p.amount,
        tag: 'paid'
      }));
    } else if (i.paid > 0) {
      ev.push({
        t: new Date(i.issue_date).getTime() + 2 * 864e5,
        icon: 'check',
        tone: 'green',
        title: 'Payment received',
        detail: `Against ${i.number}`,
        amount: i.paid,
        tag: 'paid'
      });
    }
  });
  DB.repairs.filter(r => r.customer?.name === name).forEach(r => {
    ev.push({
      t: new Date(r.received_on).getTime(),
      icon: 'wrench',
      tone: 'violet',
      title: `Service ${r.number}`,
      detail: `${r.device} — ${r.issue}`,
      amount: r.charge || 0,
      tag: repairStatus(r.status)[0]
    });
  });
  DB.tickets.filter(t => t.customer?.name === name).forEach(t => {
    (t.activities || []).slice(0, 1).forEach(a => ev.push({
      t: new Date(a.created_at).getTime(),
      icon: 'tag',
      tone: 'amber',
      title: `Ticket ${t.number}`,
      detail: t.issue,
      tag: t.status.replace('_', ' ')
    }));
  });
  DB.amc.filter(a => a.customer?.name === name).forEach(a => {
    ev.push({
      t: new Date(a.starts_on).getTime(),
      icon: 'shield',
      tone: a.value === 0 ? 'green' : 'violet',
      title: `AMC ${a.number}`,
      detail: `${a.plan} plan · ${a.devices} devices${a.value === 0 ? ' · complimentary' : ''}`,
      amount: a.value,
      tag: a.status
    });
  });
  return ev.sort((x, y) => y.t - x.t);
}
function Customers() {
  const [filter, setFilter] = useState(null);
  const path = '/customers' + (filter ? '?filter=' + filter : '');
  const {
    data,
    loading,
    reload
  } = useFetch(path, [path]);
  const rows = data?.data ?? [];
  const nav = useNavigate();
  const [rec, setRec] = useState(null);
  const [tab, setTab] = useState('timeline');
  const [editCust, setEditCust] = useState(null);
  const saveCustomer = async v => {
    const c = DB.customers.find(x => x.id === editCust.id);
    if (!c) {
      setEditCust(null);
      return;
    }
    const newName = (v.name || '').trim();
    if (!newName) return;
    if (newName !== c.name && DB.customers.some(x => x.id !== c.id && x.name.toLowerCase() === newName.toLowerCase())) {
      alert(`Another customer named "${newName}" already exists.`);
      return;
    }
    if (newName !== c.name) cascadeCustomerRename(c.name, newName);
    Object.assign(c, {
      name: newName,
      area: v.area,
      type: v.type,
      contact_name: v.contact_name,
      phone: v.phone,
      sites: num(v.sites) || 1,
      owner: O(v.owner || c.owner?.name || teamNames()[0])
    });
    await commitChange();
    setEditCust(null);
    setRec(null);
    reload();
  };
  const deleteCustomer = async r => {
    const links = customerLinkCount(r.name);
    const creds = DB.credentials.filter(c => c.customer?.name === r.name).length;
    if (links > 0) {
      const extra = creds ? ` and ${creds} credential(s)` : '';
      if (!confirm(`Delete "${r.name}" and ALL ${links} linked record(s) (quotes, invoices, jobs, tickets, AMC, equipment, serials, repairs)${extra}? This cannot be undone. Export a backup first if you may need this data later.`)) return;
      cascadeCustomerDelete(r.name);
    } else if (!confirm(`Delete customer "${r.name}"?${creds ? ` ${creds} saved credential(s) will also be removed.` : ''}`)) return;else cascadeCustomerDelete(r.name);
    const i = DB.customers.findIndex(x => x.id === r.id);
    if (i >= 0) DB.customers.splice(i, 1);
    await commitChange();
    setRec(null);
    reload();
  };
  const grantFreeAmc = async name => {
    if (DB.amc.some(a => a.customer?.name === name && a.status !== 'expired')) {
      if (!confirm('This customer already has an active AMC. Add a complimentary one anyway?')) return;
    }
    DB.amc.push({
      id: nextId(DB.amc),
      number: genNum('AMC-', DB.amc, 5000),
      customer: O(name),
      plan: 'basic',
      devices: DB.equipment.filter(e => e.customer?.name === name).length || 4,
      value: 0,
      starts_on: iso(0),
      ends_on: iso(365),
      visits_total: 2,
      visits_used: 0,
      status: 'active'
    });
    await commitChange();
    reload();
    openCustomer(findCust(name), true);
  };
  const openCustomer = (r, keepTab) => {
    if (!r || !r.name) return;
    if (!keepTab) setTab('timeline');
    const timeline = buildTimeline(r.name);
    const equip = DB.equipment.filter(e => e.customer?.name === r.name);
    const amcs = DB.amc.filter(a => a.customer?.name === r.name);
    const totalPaid = DB.invoices.filter(i => i.customer?.name === r.name).reduce((a, i) => a + i.paid, 0);
    const balance = DB.invoices.filter(i => i.customer?.name === r.name).reduce((a, i) => a + (i.balance || 0), 0);
    setRec({
      title: r.name,
      subtitle: `${r.type} · ${r.area || ''}`,
      av: r.name,
      body: /*#__PURE__*/React.createElement(CustomerBody, {
        r: r,
        timeline: timeline,
        equip: equip,
        amcs: amcs,
        totalPaid: totalPaid,
        balance: balance,
        nav: nav,
        grantFreeAmc: grantFreeAmc
      }),
      foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        className: "btn-o",
        onClick: () => setEditCust(r)
      }, /*#__PURE__*/React.createElement(Ic, {
        n: "sliders",
        s: 14
      }), "Edit"), /*#__PURE__*/React.createElement("button", {
        className: "btn-o",
        style: {
          color: 'var(--red)'
        },
        onClick: () => deleteCustomer(r)
      }, "Delete"))
    });
  };
  useHashOpen(rows, openCustomer, loading);
  return /*#__PURE__*/React.createElement(Shell, {
    active: "customers"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "Customers",
    sub: "All accounts"
  }, /*#__PURE__*/React.createElement(CreateButton, {
    entity: "customer",
    onDone: reload
  })), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, [['All', null], ['Residential', 'Residential'], ['Commercial', 'Commercial'], ['Industrial', 'Industrial']].map(([l, v]) => /*#__PURE__*/React.createElement("span", {
    key: l,
    className: 'chip' + (v === filter ? ' on' : ''),
    onClick: () => setFilter(v)
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, loading ? /*#__PURE__*/React.createElement("div", {
    className: "loading"
  }, "Loading…") : rows.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No customers") : /*#__PURE__*/React.createElement("div", {
    className: "tscroll"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Customer"), /*#__PURE__*/React.createElement("th", null, "Type"), /*#__PURE__*/React.createElement("th", {
    className: "desk-only"
  }, "Contact"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Sites"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Lifetime value"), /*#__PURE__*/React.createElement("th", {
    className: "desk-only"
  }, "Owner"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.id,
    onClick: () => openCustomer(r)
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    className: "t1"
  }, r.name), /*#__PURE__*/React.createElement("div", {
    className: "t2"
  }, r.area)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Pill, {
    t: CUST_TYPE[r.type]
  }, r.type)), /*#__PURE__*/React.createElement("td", {
    className: "desk-only"
  }, r.contact_name), /*#__PURE__*/React.createElement("td", {
    className: "num"
  }, r.sites), /*#__PURE__*/React.createElement("td", {
    className: "num t1"
  }, inr(r.lifetime_value)), /*#__PURE__*/React.createElement("td", {
    className: "desk-only"
  }, r.owner ? /*#__PURE__*/React.createElement(Av, {
    name: r.owner.name,
    size: 24
  }) : '—'))))))), /*#__PURE__*/React.createElement(Drawer, {
    rec: rec,
    onClose: () => setRec(null)
  }), editCust && /*#__PURE__*/React.createElement(FormModal, {
    title: 'Edit ' + editCust.name,
    submitLabel: "Save Changes",
    initial: {
      name: editCust.name,
      area: editCust.area,
      type: editCust.type,
      contact_name: editCust.contact_name,
      phone: editCust.phone,
      sites: editCust.sites,
      owner: editCust.owner?.name
    },
    fields: ENTITIES.customer.fields,
    onClose: () => setEditCust(null),
    onSave: saveCustomer
  }));
}
function CustomerBody({
  r,
  timeline,
  equip,
  amcs,
  totalPaid,
  balance,
  nav,
  grantFreeAmc
}) {
  const [tab, setTab] = useState('timeline');
  const hasFreeAmc = amcs.some(a => a.value === 0);
  const TABS = [['timeline', 'Timeline'], ['equipment', `Equipment · ${equip.length}`], ['service', 'Service & AMC']];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DwSection, {
    label: "Account"
  }, /*#__PURE__*/React.createElement(DwBox, {
    rows: [['Contact', r.contact_name || '—'], ['Phone', r.phone || '—'], ['Sites', r.sites], ['Lifetime value', inr(r.lifetime_value)], ['Paid to date', inr(totalPaid)], ['Outstanding', balance ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--red)'
      }
    }, inr(balance)) : '₹0']]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      margin: '4px 0 14px'
    }
  }, TABS.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: 'chip' + (tab === k ? ' on' : ''),
    onClick: () => setTab(k)
  }, l))), tab === 'timeline' && (timeline.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No activity yet") : /*#__PURE__*/React.createElement("div", {
    className: "tl",
    style: {
      border: '1px solid var(--ln)',
      borderRadius: 12,
      background: '#fff',
      padding: '4px 0'
    }
  }, timeline.map((e, i) => /*#__PURE__*/React.createElement("div", {
    className: "tlrow",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "tldot",
    style: {
      width: 30,
      height: 30,
      background: `var(--${e.tone}-bg, var(--field))`,
      color: `var(--${e.tone})`
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    n: e.icon,
    s: 14
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "t1",
    style: {
      fontSize: 12.5
    }
  }, e.title), e.amount != null && e.amount > 0 ? /*#__PURE__*/React.createElement("span", {
    className: "t1",
    style: {
      fontSize: 12.5
    }
  }, inr(e.amount)) : null), /*#__PURE__*/React.createElement("div", {
    className: "t2",
    style: {
      whiteSpace: 'normal'
    }
  }, e.detail), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      marginTop: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      color: 'var(--mut)',
      fontWeight: 700
    }
  }, date(e.t)), e.tag ? /*#__PURE__*/React.createElement(Pill, {
    t: "gray"
  }, e.tag) : null)))))), tab === 'equipment' && (equip.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No equipment on record") : /*#__PURE__*/React.createElement("div", {
    className: "dwbox"
  }, equip.map(e => /*#__PURE__*/React.createElement("div", {
    className: "li",
    key: e.id,
    style: {
      cursor: 'pointer'
    },
    onClick: () => nav('/inventory'),
    title: "Open in inventory"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tldot",
    style: {
      width: 28,
      height: 28,
      background: 'var(--a-soft)',
      color: 'var(--a-ink)',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "camera",
    s: 13
  })), /*#__PURE__*/React.createElement("div", {
    className: "lin",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700
    }
  }, e.name), /*#__PURE__*/React.createElement("div", {
    className: "t2"
  }, e.serial?.serial_no, " · ", e.location)), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, e.in_warranty ? /*#__PURE__*/React.createElement(Pill, {
    t: "green",
    dot: true
  }, "warranty") : /*#__PURE__*/React.createElement(Pill, {
    t: "gray"
  }, "out"), /*#__PURE__*/React.createElement(Ic, {
    n: "chevR",
    s: 13,
    style: {
      color: 'var(--mut)'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: 'var(--mut)',
      fontWeight: 600,
      padding: '8px 4px 2px'
    }
  }, "Tap a device to open its product in Inventory."))), tab === 'service' && /*#__PURE__*/React.createElement(React.Fragment, null, amcs.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty",
    style: {
      marginBottom: 12
    }
  }, "No AMC contracts") : /*#__PURE__*/React.createElement("div", {
    className: "dwbox",
    style: {
      marginBottom: 12
    }
  }, amcs.map(a => /*#__PURE__*/React.createElement("div", {
    className: "li",
    key: a.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "lin",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700
    }
  }, a.number, " · ", a.plan, a.value === 0 ? ' (free)' : ''), /*#__PURE__*/React.createElement("div", {
    className: "t2"
  }, date(a.starts_on), " → ", date(a.ends_on), " · ", a.visits_used, "/", a.visits_total, " visits")), /*#__PURE__*/React.createElement("span", {
    className: "lip"
  }, a.value ? inr(a.value) : 'Free')))), /*#__PURE__*/React.createElement("div", {
    className: "dwbox",
    style: {
      marginBottom: 12
    }
  }, timeline.filter(e => e.icon === 'wrench' || e.icon === 'tag').length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No service history") : timeline.filter(e => e.icon === 'wrench' || e.icon === 'tag').map((e, i) => /*#__PURE__*/React.createElement("div", {
    className: "li",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "lin",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700
    }
  }, e.title), /*#__PURE__*/React.createElement("div", {
    className: "t2",
    style: {
      whiteSpace: 'normal'
    }
  }, e.detail), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: 'var(--mut)',
      fontWeight: 700,
      marginTop: 2
    }
  }, date(e.t))), e.amount > 0 ? /*#__PURE__*/React.createElement("span", {
    className: "lip"
  }, inr(e.amount)) : /*#__PURE__*/React.createElement(Pill, {
    t: "green"
  }, "free")))), /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    style: {
      width: '100%',
      justifyContent: 'center'
    },
    disabled: hasFreeAmc,
    onClick: () => grantFreeAmc(r.name)
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "shield",
    s: 14
  }), hasFreeAmc ? 'Complimentary AMC active' : 'Grant free AMC (1 year)')));
}
const JOB_TYPE = {
  install: 'amber',
  survey: 'blue',
  amc: 'green',
  repair: 'red'
};
const JOB_STATUS = {
  unassigned: 'red',
  scheduled: 'blue',
  in_progress: 'amber',
  done: 'green',
  cancelled: 'gray'
};
function Jobs() {
  return /*#__PURE__*/React.createElement(TablePage, {
    active: "jobs",
    title: "Installation Jobs",
    sub: "Field schedule",
    endpoint: "/jobs",
    entity: "job",
    columns: [{
      key: 'number',
      label: 'Job',
      t1: true
    }, {
      key: 'customer',
      label: 'Customer',
      render: r => r.customer?.name
    }, {
      key: 'type',
      label: 'Type',
      render: r => /*#__PURE__*/React.createElement(Pill, {
        t: JOB_TYPE[r.type]
      }, r.type)
    }, {
      key: 'scheduled_on',
      label: 'Date',
      render: r => date(r.scheduled_on)
    }, {
      key: 'technician',
      label: 'Tech',
      deskOnly: true,
      render: r => r.technician ? /*#__PURE__*/React.createElement(Av, {
        name: r.technician.name,
        size: 22
      }) : '—'
    }, {
      key: 'status',
      label: 'Status',
      render: r => /*#__PURE__*/React.createElement(Pill, {
        t: JOB_STATUS[r.status],
        dot: true
      }, r.status.replace('_', ' '))
    }],
    rowToRecord: r => ({
      title: r.customer?.name,
      subtitle: `${r.type} · ${r.slot || ''}`,
      icon: r.type === 'repair' ? 'wrench' : 'calendar',
      body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DwSection, {
        label: "Job"
      }, /*#__PURE__*/React.createElement(DwBox, {
        rows: [['Type', /*#__PURE__*/React.createElement(Pill, {
          t: JOB_TYPE[r.type]
        }, r.type)], ['Scope', r.scope || '—'], ['Scheduled', date(r.scheduled_on)], ['Slot', r.slot || '—'], ['Technician', r.technician?.name || 'Unassigned'], ['Status', /*#__PURE__*/React.createElement(Pill, {
          t: JOB_STATUS[r.status],
          dot: true
        }, r.status.replace('_', ' '))]]
      })), r.checklist?.length > 0 && /*#__PURE__*/React.createElement(DwSection, {
        label: "Checklist"
      }, /*#__PURE__*/React.createElement("div", {
        className: "dwbox"
      }, r.checklist.map(c => /*#__PURE__*/React.createElement("div", {
        className: "li",
        key: c.id
      }, /*#__PURE__*/React.createElement("span", {
        className: "sdot",
        style: {
          width: 18,
          height: 18,
          border: '2px solid var(--ln)',
          borderRadius: 5,
          background: c.done ? 'var(--a)' : '#fff'
        }
      }), /*#__PURE__*/React.createElement("div", {
        className: "lin",
        style: {
          fontWeight: 600
        }
      }, c.label))))))
    })
  });
}
const TKT_PRI = {
  high: 'red',
  medium: 'amber',
  low: 'gray'
};
const TKT_COV = {
  amc: 'violet',
  warranty: 'blue',
  paid: 'gray'
};
const TKT_SLA = {
  breached: ['Breached', 'red'],
  at_risk: ['At risk', 'amber'],
  ok: ['On track', 'green'],
  met: ['Met', 'green'],
  none: ['—', 'gray']
};
const TKT_ST = {
  open: 'blue',
  in_progress: 'amber',
  on_hold: 'gray',
  resolved: 'green',
  closed: 'gray'
};
function Tickets() {
  const [filter, setFilter] = useState(null);
  const path = '/tickets' + (filter ? '?status=' + filter : '');
  const {
    data,
    loading,
    reload
  } = useFetch(path, [path]);
  const [rec, setRec] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const rows = data?.data ?? [];
  const setTicketStatus = async (r, status) => {
    const t = DB.tickets.find(x => x.id === r.id);
    if (!t) return;
    t.status = status;
    if (!Array.isArray(t.activities)) t.activities = [];
    const note = status === 'resolved' ? 'Resolved' : status === 'in_progress' ? 'Work started' : status === 'on_hold' ? 'Put on hold' : 'Status: ' + status;
    t.activities.push({
      id: nextId(t.activities),
      note,
      created_at: iso(0)
    });
    if (status === 'resolved') {
      t.sla_state = t.sla_state === 'breached' ? 'breached' : 'met';
      if (t.coverage === 'amc') {
        // v5: AMC-covered ticket consumes a contract visit
        const c = DB.amc.find(a => a.customer?.name === t.customer?.name && a.status !== 'expired' && a.visits_used < a.visits_total);
        if (c) {
          c.visits_used += 1;
          t.activities.push({
            id: nextId(t.activities),
            note: `AMC visit logged on ${c.number} (${c.visits_used}/${c.visits_total})`,
            created_at: iso(0)
          });
        }
      }
    }
    await commitChange();
    reload();
    setRec(null);
  };
  const open = r => setRec({
    title: r.number,
    subtitle: r.issue,
    icon: 'tag',
    body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DwSection, {
      label: "Ticket"
    }, /*#__PURE__*/React.createElement(DwBox, {
      rows: [['Customer', r.customer?.name], ['Priority', /*#__PURE__*/React.createElement(Pill, {
        t: TKT_PRI[r.priority]
      }, r.priority)], ['Coverage', /*#__PURE__*/React.createElement(Pill, {
        t: TKT_COV[r.coverage]
      }, r.coverage)], ['Assigned', r.assignee?.name || '—'], ['SLA', /*#__PURE__*/React.createElement(Pill, {
        t: TKT_SLA[r.sla_state][1]
      }, TKT_SLA[r.sla_state][0])], ['Status', /*#__PURE__*/React.createElement(Pill, {
        t: TKT_ST[r.status],
        dot: true
      }, r.status.replace('_', ' '))]]
    })), r.activities?.length > 0 && /*#__PURE__*/React.createElement(DwSection, {
      label: "Activity"
    }, /*#__PURE__*/React.createElement("div", {
      className: "tl",
      style: {
        border: '1px solid var(--ln)',
        borderRadius: 12,
        background: '#fff'
      }
    }, r.activities.map(a => /*#__PURE__*/React.createElement("div", {
      className: "tlrow",
      key: a.id
    }, /*#__PURE__*/React.createElement("span", {
      className: "tldot",
      style: {
        width: 26,
        height: 26
      }
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "clock",
      s: 13
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "t1",
      style: {
        fontSize: 12
      }
    }, a.note), /*#__PURE__*/React.createElement("div", {
      className: "t2"
    }, date(a.created_at)))))))),
    foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      onClick: () => setEditRow(r)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "sliders",
      s: 14
    }), "Edit"), /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      style: {
        color: 'var(--red)'
      },
      onClick: async () => {
        if (confirm('Delete this ticket?')) {
          entityDelete('ticket', r.id);
          await afterMutation();
          setRec(null);
          reload();
        }
      }
    }, "Delete"), r.status === 'open' && /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      onClick: () => setTicketStatus(r, 'in_progress')
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "clock",
      s: 14
    }), "Start"), (r.status === 'open' || r.status === 'in_progress') && /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      onClick: () => setTicketStatus(r, 'on_hold')
    }, "Hold"), r.status === 'on_hold' && /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      onClick: () => setTicketStatus(r, 'in_progress')
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "clock",
      s: 14
    }), "Resume"), /*#__PURE__*/React.createElement("button", {
      className: "btn-p",
      style: {
        flex: 1,
        justifyContent: 'center'
      },
      onClick: () => setTicketStatus(r, 'resolved'),
      disabled: r.status === 'resolved' || r.status === 'closed'
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "check",
      s: 14,
      sw: 2.4
    }), "Resolve"))
  });
  useHashOpen(rows, open, loading);
  return /*#__PURE__*/React.createElement(Shell, {
    active: "tickets"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "Service Tickets",
    sub: "SLA target 24h"
  }, /*#__PURE__*/React.createElement(CreateButton, {
    entity: "ticket",
    onDone: reload
  })), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, [['All', null], ['Open', 'open'], ['In progress', 'in_progress'], ['On hold', 'on_hold'], ['Resolved', 'resolved']].map(([l, v]) => /*#__PURE__*/React.createElement("span", {
    key: l,
    className: 'chip' + (v === filter ? ' on' : ''),
    onClick: () => setFilter(v)
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, loading ? /*#__PURE__*/React.createElement("div", {
    className: "loading"
  }, "Loading…") : rows.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No tickets") : /*#__PURE__*/React.createElement("div", {
    className: "tscroll"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Ticket"), /*#__PURE__*/React.createElement("th", null, "Issue"), /*#__PURE__*/React.createElement("th", {
    className: "desk-only"
  }, "Assigned"), /*#__PURE__*/React.createElement("th", null, "SLA"), /*#__PURE__*/React.createElement("th", null, "Status"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.id,
    onClick: () => open(r)
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: `var(--${TKT_PRI[r.priority] === 'gray' ? 'green' : TKT_PRI[r.priority]})`
    }
  }), r.number)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    className: "t1",
    style: {
      whiteSpace: 'normal',
      maxWidth: 240
    }
  }, r.issue)), /*#__PURE__*/React.createElement("td", {
    className: "desk-only"
  }, r.assignee ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7
    }
  }, /*#__PURE__*/React.createElement(Av, {
    name: r.assignee.name,
    size: 22
  }), r.assignee.name) : '—'), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Pill, {
    t: TKT_SLA[r.sla_state][1]
  }, TKT_SLA[r.sla_state][0])), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Pill, {
    t: TKT_ST[r.status],
    dot: true
  }, r.status.replace('_', ' '))))))))), /*#__PURE__*/React.createElement(Drawer, {
    rec: rec,
    onClose: () => setRec(null)
  }), editRow && /*#__PURE__*/React.createElement(FormModal, {
    title: "Edit Ticket",
    submitLabel: "Save Changes",
    fields: entityEditFields('ticket'),
    initial: entityToInitial('ticket', editRow),
    onClose: () => setEditRow(null),
    onSave: async v => {
      const row = DB.tickets.find(x => x.id === editRow.id);
      if (row) entityApplyEdit('ticket', row, v);
      await afterMutation();
      setEditRow(null);
      setRec(null);
      reload();
    }
  }));
}
const AMC_PLAN = {
  basic: 'gray',
  silver: 'blue',
  gold: 'violet'
};
const AMC_STATUS = {
  active: ['Active', 'green'],
  expiring: ['Expiring', 'amber'],
  expired: ['Expired', 'red']
};
function Amc() {
  const [filter, setFilter] = useState(null);
  const path = '/amc' + (filter ? '?filter=' + filter : '');
  const {
    data,
    loading,
    reload
  } = useFetch(path, [path]);
  const [rec, setRec] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const rows = data?.data ?? [];
  const renew = r => {
    const message = `Hello ${r.customer?.name || ''},\n\nYour AMC ${r.number} (${r.plan} plan, ${r.devices} devices) ${r.status === 'expired' ? 'expired' : 'is due for renewal'} on ${date(r.ends_on)}.\nRenewal value: ${inr(r.value)}/year.\n\nShall we schedule the renewal?\n\nRegards,\n${COMPANY.name}\n${COMPANY.phone}`;
    waOpen(r.customer?.name, message);
  };
  const logVisit = r => {
    const c = DB.amc.find(x => x.id === r.id);
    if (c) c.visits_used = Math.min(c.visits_total, c.visits_used + 1);
    reload();
    setRec(null);
  };
  const open = r => setRec({
    title: r.customer?.name,
    subtitle: `${r.number} · ${r.plan} plan`,
    av: r.customer?.name,
    body: /*#__PURE__*/React.createElement(DwSection, {
      label: "Contract"
    }, /*#__PURE__*/React.createElement(DwBox, {
      rows: [['Plan', /*#__PURE__*/React.createElement(Pill, {
        t: AMC_PLAN[r.plan],
        dot: true
      }, r.plan)], ['Devices', r.devices], ['Period', `${date(r.starts_on)} → ${date(r.ends_on)}`], ['Visits used', `${r.visits_used} of ${r.visits_total}`], ['Annual value', inr(r.value)], ['Status', /*#__PURE__*/React.createElement(Pill, {
        t: AMC_STATUS[r.status][1],
        dot: true
      }, AMC_STATUS[r.status][0])]]
    })),
    foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      onClick: () => setEditRow(r)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "sliders",
      s: 14
    }), "Edit"), /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      style: {
        color: 'var(--red)'
      },
      onClick: async () => {
        if (confirm('Delete this AMC contract?')) {
          entityDelete('amc', r.id);
          await afterMutation();
          setRec(null);
          reload();
        }
      }
    }, "Delete"), /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      onClick: () => logVisit(r)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "calendar",
      s: 14
    }), "Log Visit"), /*#__PURE__*/React.createElement("button", {
      className: "btn-p wa-btn",
      onClick: () => renew(r)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "whatsapp",
      s: 14
    }), "Send Renewal"))
  });
  return /*#__PURE__*/React.createElement(Shell, {
    active: "amc"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "AMC Management",
    sub: "Annual maintenance contracts"
  }, /*#__PURE__*/React.createElement(CreateButton, {
    entity: "amc",
    onDone: reload
  })), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, [['All', null], ['Expiring', 'expiring'], ['Expired', 'expired']].map(([l, v]) => /*#__PURE__*/React.createElement("span", {
    key: l,
    className: 'chip' + (v === filter ? ' on' : ''),
    onClick: () => setFilter(v)
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, loading ? /*#__PURE__*/React.createElement("div", {
    className: "loading"
  }, "Loading…") : rows.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No contracts") : /*#__PURE__*/React.createElement("div", {
    className: "tscroll"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Contract"), /*#__PURE__*/React.createElement("th", null, "Customer"), /*#__PURE__*/React.createElement("th", null, "Plan"), /*#__PURE__*/React.createElement("th", null, "Visits"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Value"), /*#__PURE__*/React.createElement("th", null, "Status"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.id,
    onClick: () => open(r)
  }, /*#__PURE__*/React.createElement("td", {
    className: "t1"
  }, r.number), /*#__PURE__*/React.createElement("td", {
    className: "t1"
  }, r.customer?.name), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Pill, {
    t: AMC_PLAN[r.plan],
    dot: true
  }, r.plan)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "metab"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: r.visits_used / r.visits_total * 100 + '%'
    }
  })), " ", r.visits_used, "/", r.visits_total), /*#__PURE__*/React.createElement("td", {
    className: "num t1"
  }, inr(r.value)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Pill, {
    t: AMC_STATUS[r.status][1],
    dot: true
  }, AMC_STATUS[r.status][0])))))))), /*#__PURE__*/React.createElement(Drawer, {
    rec: rec,
    onClose: () => setRec(null)
  }), editRow && /*#__PURE__*/React.createElement(FormModal, {
    title: "Edit AMC Contract",
    submitLabel: "Save Changes",
    fields: entityEditFields('amc'),
    initial: entityToInitial('amc', editRow),
    onClose: () => setEditRow(null),
    onSave: async v => {
      const row = DB.amc.find(x => x.id === editRow.id);
      if (row) entityApplyEdit('amc', row, v);
      await afterMutation();
      setEditRow(null);
      setRec(null);
      reload();
    }
  }));
}
function Equipment() {
  return /*#__PURE__*/React.createElement(TablePage, {
    active: "equipment",
    title: "Customer Equipment Register",
    sub: "Installed devices",
    endpoint: "/equipment",
    entity: "equipment",
    columns: [{
      key: 'name',
      label: 'Device',
      t1: true
    }, {
      key: 'customer',
      label: 'Customer',
      render: r => r.customer?.name
    }, {
      key: 'location',
      label: 'Location',
      deskOnly: true
    }, {
      key: 'installed_on',
      label: 'Installed',
      render: r => date(r.installed_on)
    }, {
      key: 'warranty',
      label: 'Warranty',
      render: r => r.in_warranty ? /*#__PURE__*/React.createElement(Pill, {
        t: "green",
        dot: true
      }, "Active") : /*#__PURE__*/React.createElement(Pill, {
        t: "gray"
      }, "Expired")
    }],
    rowToRecord: r => ({
      title: r.name,
      subtitle: r.customer?.name,
      icon: 'shield',
      body: /*#__PURE__*/React.createElement(DwSection, {
        label: "Equipment"
      }, /*#__PURE__*/React.createElement(DwBox, {
        rows: [['Product', r.product?.name || '—'], ['Serial', r.serial?.serial_no || '—'], ['Location', r.location || '—'], ['Installed', date(r.installed_on)], ['Warranty end', date(r.warranty_end)]]
      }))
    })
  });
}
function Secret({
  value
}) {
  const [show, setShow] = useState(false);
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'monospace'
    }
  }, show ? value : '••••••••'), /*#__PURE__*/React.createElement("button", {
    className: "act",
    onClick: e => {
      e.stopPropagation();
      setShow(s => !s);
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "eye",
    s: 13
  })));
}
function Credentials() {
  return /*#__PURE__*/React.createElement(TablePage, {
    active: "credentials",
    title: "Customer Credential Manager",
    sub: "NVR/DVR logins · encrypted at rest",
    endpoint: "/credentials",
    entity: "credential",
    columns: [{
      key: 'label',
      label: 'Label',
      t1: true
    }, {
      key: 'customer',
      label: 'Customer',
      render: r => r.customer?.name
    }, {
      key: 'host',
      label: 'Host',
      deskOnly: true
    }, {
      key: 'username',
      label: 'Username'
    }],
    rowToRecord: r => ({
      title: r.label,
      subtitle: r.customer?.name,
      icon: 'key',
      body: /*#__PURE__*/React.createElement(DwSection, {
        label: "Credential"
      }, /*#__PURE__*/React.createElement(DwBox, {
        rows: [['Host', r.host || '—'], ['Port', r.port || '—'], ['Username', r.username || '—'], ['Password', /*#__PURE__*/React.createElement(Secret, {
          value: r.password || ''
        })], ['Notes', r.notes || '—']]
      }))
    })
  });
}
function statusOf(p) {
  if (p.stock <= 0) return ['Out of stock', 'red'];
  if (p.reorder_level > 0 && p.stock <= p.reorder_level) return ['Low stock', 'amber'];
  return ['In stock', 'green'];
}
function StockAdjust({
  r,
  done
}) {
  const [qty, setQty] = useState(String(r.stock ?? 0));
  const save = async e => {
    e.stopPropagation();
    const n = parseInt(qty, 10);
    if (isNaN(n) || n < 0) {
      alert('Enter a stock quantity of 0 or more.');
      return;
    }
    const p = DB.products.find(x => x.id === r.id);
    if (!p) return;
    const prev = num(p.stock);
    const delta = n - prev;
    if (delta) recordStockMove(p, delta, 'adjust', p.sku);else {
      p.stock = n;
      touch(p);
    }
    await commitChange();
    done();
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      flex: 1,
      flexWrap: 'wrap'
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    type: "number",
    min: 0,
    value: qty,
    onChange: e => setQty(e.target.value),
    style: {
      width: 100
    },
    title: "Set stock quantity"
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    style: {
      justifyContent: 'center'
    },
    onClick: save
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "sliders",
    s: 14
  }), "Set stock"));
}
function Inventory() {
  const [scan, setScan] = useState(false);
  const [refresh, setRefresh] = useState(0);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TablePage, {
    active: "inventory",
    title: "Inventory",
    sub: "Products & stock",
    endpoint: "/products",
    entity: "product",
    refresh: refresh,
    actions: /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      onClick: () => setScan(true)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "barcode",
      s: 14
    }), "Scan to add"),
    recFoot: (r, done) => /*#__PURE__*/React.createElement(StockAdjust, {
      r: r,
      done: done
    }),
    rowSearch: r => [r.sku, r.name, r.specs, r.category].join(' '),
    chips: [{
      label: 'All'
    }, {
      label: 'In stock',
      value: 'in'
    }, {
      label: 'Low',
      value: 'low'
    }, {
      label: 'Out of stock',
      value: 'out'
    }],
    columns: [{
      key: 'sku',
      label: 'SKU',
      render: r => /*#__PURE__*/React.createElement("span", {
        className: "sku"
      }, r.sku)
    }, {
      key: 'name',
      label: 'Product',
      render: r => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        className: "t1"
      }, r.name), /*#__PURE__*/React.createElement("div", {
        className: "t2"
      }, r.specs))
    }, {
      key: 'category',
      label: 'Category',
      deskOnly: true
    }, {
      key: 'sale_price',
      label: 'Sale',
      num: true,
      t1: true,
      render: r => inr(r.sale_price)
    }, {
      key: 'stock',
      label: 'Stock',
      render: r => {
        const [, tone] = statusOf(r);
        return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
          className: "stockbar"
        }, /*#__PURE__*/React.createElement("i", {
          style: {
            width: Math.min(100, r.stock) + '%',
            background: `var(--${tone === 'green' ? 'green' : tone})`
          }
        })), /*#__PURE__*/React.createElement("b", null, r.stock));
      }
    }, {
      key: 'status',
      label: 'Status',
      render: r => {
        const [l, t] = statusOf(r);
        return /*#__PURE__*/React.createElement(Pill, {
          t: t,
          dot: true
        }, l);
      }
    }],
    rowToRecord: r => {
      const margin = r.sale_price ? Math.round((r.sale_price - r.purchase_price) / r.sale_price * 100) : 0;
      return {
        title: r.name,
        subtitle: `${r.sku} · ${r.category || ''}`,
        icon: r.category === 'Cameras' ? 'camera' : 'box',
        body: /*#__PURE__*/React.createElement(DwSection, {
          label: "Pricing & stock"
        }, /*#__PURE__*/React.createElement("div", {
          className: "dwbox"
        }, /*#__PURE__*/React.createElement("div", {
          className: "li"
        }, /*#__PURE__*/React.createElement("div", {
          className: "lin"
        }, "Purchase price"), /*#__PURE__*/React.createElement("span", {
          className: "lip"
        }, inr(r.purchase_price))), /*#__PURE__*/React.createElement("div", {
          className: "li"
        }, /*#__PURE__*/React.createElement("div", {
          className: "lin"
        }, "Sale price"), /*#__PURE__*/React.createElement("span", {
          className: "lip"
        }, inr(r.sale_price))), /*#__PURE__*/React.createElement("div", {
          className: "li"
        }, /*#__PURE__*/React.createElement("div", {
          className: "lin",
          style: {
            color: 'var(--a-ink)'
          }
        }, "Margin"), /*#__PURE__*/React.createElement("span", {
          className: "lip",
          style: {
            color: 'var(--a-ink)'
          }
        }, margin, "%")), /*#__PURE__*/React.createElement("div", {
          className: "li",
          style: {
            background: 'var(--field)'
          }
        }, /*#__PURE__*/React.createElement("div", {
          className: "lin"
        }, "In stock / reserved"), /*#__PURE__*/React.createElement("span", {
          className: "lip"
        }, r.stock, " / ", r.reserved)), /*#__PURE__*/React.createElement("div", {
          className: "li"
        }, /*#__PURE__*/React.createElement("div", {
          className: "lin"
        }, "Serial tracked"), /*#__PURE__*/React.createElement("span", {
          className: "lip"
        }, r.track_serials ? 'Yes' : 'No'))))
      };
    }
  }), scan && /*#__PURE__*/React.createElement(ScanToAddSerial, {
    onClose: () => setScan(false),
    onAdded: () => setRefresh(n => n + 1)
  }));
}
const SER_TONE = {
  in_stock: 'gray',
  sold: 'blue',
  installed: 'green',
  rma: 'amber',
  returned: 'red'
};
function ScanToAddSerial({
  onClose,
  onAdded
}) {
  const names = prodNames();
  const [product, setProduct] = useState(names[0] || '');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [log, setLog] = useState([]);
  const inp = useRef(null);
  useEffect(() => {
    setTimeout(() => inp.current && inp.current.focus(), 50);
  }, [log.length]);
  const submit = async raw => {
    setErr('');
    setMsg('');
    const r = addScannedSerial(raw != null ? raw : code, product);
    if (!r.ok) {
      setErr(r.error);
      setCode('');
      setTimeout(() => inp.current && inp.current.focus(), 30);
      return;
    }
    const ok = await commitChange();
    if (!ok) {
      setErr(SAVE_FAIL_MSG);
      return;
    }
    setLog(s => [{
      sn: r.serial.serial_no,
      stock: r.product ? r.product.stock : '—'
    }, ...s].slice(0, 12));
    setMsg('Added ' + r.serial.serial_no + (r.product ? ' · stock ' + r.product.stock : ''));
    setCode('');
    onAdded && onAdded(r);
    setTimeout(() => inp.current && inp.current.focus(), 30);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "scrim show",
    style: {
      zIndex: 60
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%,-50%)',
      width: 460,
      maxWidth: '94vw',
      maxHeight: '90vh',
      overflowY: 'auto',
      background: 'var(--card)',
      border: '1px solid var(--ln)',
      borderRadius: 16,
      padding: '22px 22px 18px',
      boxShadow: '0 20px 60px rgba(40,35,20,.22)',
      zIndex: 61
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      marginBottom: 4
    }
  }, "Scan to add serial"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--mut)',
      fontWeight: 600,
      marginBottom: 12,
      lineHeight: 1.45
    }
  }, "Choose the product, then scan with a USB barcode scanner, the phone camera, or type the serial and press Enter. Each new SN is saved as in-stock and adds 1 to inventory."), /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Product"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    value: product,
    onChange: e => setProduct(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select…"), names.map(n => /*#__PURE__*/React.createElement("option", {
    key: n,
    value: n
  }, n))), /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Scan barcode / serial"), /*#__PURE__*/React.createElement("input", {
    ref: inp,
    className: "inp",
    value: code,
    autoComplete: "off",
    autoFocus: true,
    placeholder: "Waiting for scanner…",
    onChange: e => setCode(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit(e.target.value);
      }
    }
  }), isApkShell() && /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    style: {
      marginTop: 10,
      justifyContent: 'center',
      width: '100%'
    },
    onClick: async () => {
      try {
        if (window.SV_APK && window.SV_APK.scanBarcode) {
          const sn = await window.SV_APK.scanBarcode();
          if (sn) submit(sn);
        } else {
          alert('Camera scan is available in the Android app.');
        }
      } catch (e) {
        setErr(e.message || 'Camera scan failed');
      }
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "camera",
    s: 14
  }), "Use camera"), err && /*#__PURE__*/React.createElement("div", {
    className: "err",
    style: {
      color: 'var(--red)',
      fontSize: 12,
      fontWeight: 700,
      marginTop: 10
    }
  }, err), msg && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--green)',
      fontSize: 12,
      fontWeight: 700,
      marginTop: 10
    }
  }, msg), log.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "dwbox",
    style: {
      marginTop: 12
    }
  }, log.map((x, i) => /*#__PURE__*/React.createElement("div", {
    className: "drow",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, x.sn), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, "stock ", x.stock)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 9,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: onClose
  }, "Done"), /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: () => submit(code)
  }, "Add"))));
}
function Serials() {
  const [scan, setScan] = useState(false);
  const [refresh, setRefresh] = useState(0);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TablePage, {
    active: "serials",
    title: "Serial Tracking",
    sub: "Per-unit serial register",
    endpoint: "/serials",
    entity: "serial",
    refresh: refresh,
    actions: /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      onClick: () => setScan(true)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "barcode",
      s: 14
    }), "Scan to add"),
    chips: [{
      label: 'All'
    }],
    columns: [{
      key: 'serial_no',
      label: 'Serial',
      t1: true
    }, {
      key: 'product',
      label: 'Product',
      render: r => r.product?.name
    }, {
      key: 'customer',
      label: 'Customer',
      deskOnly: true,
      render: r => r.customer?.name || '—'
    }, {
      key: 'warranty',
      label: 'Warranty',
      render: r => r.in_warranty ? /*#__PURE__*/React.createElement(Pill, {
        t: "green",
        dot: true
      }, "In warranty") : /*#__PURE__*/React.createElement(Pill, {
        t: "gray"
      }, "—")
    }, {
      key: 'status',
      label: 'Status',
      render: r => /*#__PURE__*/React.createElement(Pill, {
        t: SER_TONE[r.status],
        dot: true
      }, r.status.replace('_', ' '))
    }],
    rowToRecord: r => ({
      title: r.serial_no,
      subtitle: r.product?.name,
      icon: 'box',
      body: /*#__PURE__*/React.createElement(DwSection, {
        label: "Serial"
      }, /*#__PURE__*/React.createElement(DwBox, {
        rows: [['Status', /*#__PURE__*/React.createElement(Pill, {
          t: SER_TONE[r.status],
          dot: true
        }, r.status.replace('_', ' '))], ['Customer', r.customer?.name || '—'], ['Sold on', date(r.sold_on)], ['Warranty end', date(r.warranty_end)]]
      }))
    })
  }), scan && /*#__PURE__*/React.createElement(ScanToAddSerial, {
    onClose: () => setScan(false),
    onAdded: () => setRefresh(n => n + 1)
  }));
}
function Warranty() {
  const {
    data,
    loading
  } = useFetch('/reports/warranty');
  return /*#__PURE__*/React.createElement(Shell, {
    active: "warranty"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "Warranty Tracking",
    sub: "Serialised units & coverage"
  }), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, loading || !data ? /*#__PURE__*/React.createElement("div", {
    className: "loading"
  }, "Loading…") : data.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No warranty records") : /*#__PURE__*/React.createElement("div", {
    className: "tscroll"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Serial"), /*#__PURE__*/React.createElement("th", null, "Product"), /*#__PURE__*/React.createElement("th", null, "Customer"), /*#__PURE__*/React.createElement("th", null, "Warranty end"), /*#__PURE__*/React.createElement("th", null, "Status"))), /*#__PURE__*/React.createElement("tbody", null, data.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    className: "t1"
  }, r.serial_no), /*#__PURE__*/React.createElement("td", null, r.product), /*#__PURE__*/React.createElement("td", null, r.customer || '—'), /*#__PURE__*/React.createElement("td", null, r.warranty_end), /*#__PURE__*/React.createElement("td", null, r.in_warranty ? /*#__PURE__*/React.createElement(Pill, {
    t: "green",
    dot: true
  }, "In warranty") : /*#__PURE__*/React.createElement(Pill, {
    t: "red",
    dot: true
  }, "Expired")))))))));
}
const PO_STATUS = {
  draft: 'gray',
  ordered: 'blue',
  partial: 'amber',
  received: 'green',
  cancelled: 'red'
};
function Purchasing() {
  const advancePO = (r, done) => {
    const po = DB.purchaseOrders.find(x => x.id === r.id);
    if (!po) return;
    const order = ['draft', 'ordered', 'partial', 'received'];
    const i = order.indexOf(po.status);
    if (po.status === 'cancelled' || po.status === 'received') return;
    po.status = i < 0 ? 'ordered' : order[Math.min(i + 1, order.length - 1)];
    if (po.status === 'received') receivePO(po); // v5: stock in on receipt
    done();
  };
  const receiveNow = (r, done) => {
    const po = DB.purchaseOrders.find(x => x.id === r.id);
    if (!po || po.status === 'received' || po.status === 'cancelled') return;
    po.status = 'received';
    receivePO(po);
    done();
  };
  return /*#__PURE__*/React.createElement(TablePage, {
    active: "purchasing",
    title: "Purchase Management",
    sub: "Supplier purchase orders · receiving updates stock",
    endpoint: "/purchase-orders",
    entity: "po",
    recFoot: (r, done) => r.status === 'received' || r.status === 'cancelled' ? /*#__PURE__*/React.createElement("span", {
      className: "t2",
      style: {
        padding: '6px 2px'
      }
    }, r.status === 'received' ? r.stocked ? 'Received — stock updated' : 'Received' : 'Cancelled') : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      onClick: () => advancePO(r, done)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "chevR",
      s: 14
    }), "Next stage"), /*#__PURE__*/React.createElement("button", {
      className: "btn-p",
      style: {
        flex: 1,
        justifyContent: 'center'
      },
      onClick: () => receiveNow(r, done)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "download",
      s: 14
    }), "Mark Received (stock in)")),
    columns: [{
      key: 'number',
      label: 'PO No.',
      t1: true
    }, {
      key: 'supplier',
      label: 'Supplier',
      render: r => r.supplier?.name
    }, {
      key: 'eta',
      label: 'ETA',
      deskOnly: true,
      render: r => date(r.eta)
    }, {
      key: 'total',
      label: 'Value',
      num: true,
      t1: true,
      render: r => inr(r.total)
    }, {
      key: 'status',
      label: 'Status',
      render: r => /*#__PURE__*/React.createElement(Pill, {
        t: PO_STATUS[r.status],
        dot: true
      }, r.status)
    }],
    rowToRecord: r => ({
      title: r.number,
      subtitle: r.supplier?.name,
      icon: 'download',
      body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DwSection, {
        label: "Order"
      }, /*#__PURE__*/React.createElement(DwBox, {
        rows: [['Supplier', r.supplier?.name], ['Ordered', date(r.ordered_on)], ['ETA', date(r.eta)], ['Total', inr(r.total)], ['Status', /*#__PURE__*/React.createElement(Pill, {
          t: PO_STATUS[r.status],
          dot: true
        }, r.status)]]
      })), r.items?.length > 0 && /*#__PURE__*/React.createElement(DwSection, {
        label: "Items"
      }, /*#__PURE__*/React.createElement("div", {
        className: "dwbox"
      }, r.items.map(it => /*#__PURE__*/React.createElement("div", {
        className: "li",
        key: it.id
      }, /*#__PURE__*/React.createElement("div", {
        className: "lin"
      }, it.description), /*#__PURE__*/React.createElement("span", {
        className: "liq"
      }, "×", it.qty), /*#__PURE__*/React.createElement("span", {
        className: "lip"
      }, inr(it.unit_price)))))))
    })
  });
}
const RPT_ICON = {
  sales: 'chart',
  pipeline: 'layers',
  inventory: 'box',
  amc: 'check',
  service: 'tag',
  outstanding: 'alert',
  profit: 'wallet'
};
function Reports() {
  const {
    data,
    loading
  } = useFetch('/reports');
  return /*#__PURE__*/React.createElement(Shell, {
    active: "reports"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "Reports",
    sub: "Live business metrics"
  }), loading || !data ? /*#__PURE__*/React.createElement("div", {
    className: "loading"
  }, "Loading…") : /*#__PURE__*/React.createElement("div", {
    className: "grid-cards"
  }, data.map(c => /*#__PURE__*/React.createElement("div", {
    className: "panel",
    key: c.key,
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tldot",
    style: {
      width: 36,
      height: 36,
      background: 'var(--a-soft)',
      color: 'var(--a-ink)'
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    n: RPT_ICON[c.key] || 'chart',
    s: 17
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 14
    }
  }, c.title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6,
      marginTop: 12,
      paddingTop: 12,
      borderTop: '1px solid var(--ln2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 800
    }
  }, c.value), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--mut)',
      fontWeight: 700
    }
  }, c.note))))));
}
function Insights() {
  const {
    data,
    loading
  } = useFetch('/insights');
  return /*#__PURE__*/React.createElement(Shell, {
    active: "insights"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "AI Business Insights",
    sub: "Signals computed from your live data"
  }), /*#__PURE__*/React.createElement("div", {
    className: "panel",
    style: {
      padding: 16
    }
  }, loading || !data ? /*#__PURE__*/React.createElement("div", {
    className: "loading"
  }, "Analysing…") : data.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No signals right now — business looks healthy.") : data.map((c, i) => /*#__PURE__*/React.createElement("div", {
    className: "insight",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "idot",
    style: {
      background: `var(--${c.tone === 'red' ? 'red' : c.tone === 'amber' ? 'amber' : 'green'})`
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "it"
  }, c.title), /*#__PURE__*/React.createElement("div", {
    className: "ib"
  }, c.body))))));
}
const ROLE_OPTS = ['Owner', 'Admin', 'Sales Lead', 'Sales Executive', 'Senior Technician', 'Technician', 'Accounts'];
function Team() {
  const [, force] = useState(0);
  const refresh = () => force(n => n + 1);
  const [edit, setEdit] = useState(null); // {id?} or 'new'
  const save = async v => {
    if (!v.name?.trim()) return;
    const nm = v.name.trim();
    const loginU = (v.login_username || '').trim();
    const loginP = v.login_password || '';
    if (loginU) {
      const clash = TEAM.some(t => t.login_username && String(t.login_username).trim().toLowerCase() === loginU.toLowerCase() && (edit === 'new' || t.id !== edit.id));
      if (clash) {
        alert(`Login username "${loginU}" is already in use.`);
        return;
      }
      if (edit === 'new' && !loginP) {
        alert('Set an app login password for this username.');
        return;
      }
    }
    if (edit === 'new') {
      if (TEAM.some(t => t.name.toLowerCase() === nm.toLowerCase())) {
        alert(`"${nm}" is already on the team.`);
        return;
      }
      TEAM.push({
        id: nextId(TEAM),
        name: nm,
        role: v.role || 'Technician',
        phone: v.phone || '',
        login_username: loginU || undefined,
        login_password: loginU ? loginP : undefined
      });
    } else {
      const m = TEAM.find(t => t.id === edit.id);
      if (m) {
        if (nm !== m.name) {
          if (TEAM.some(t => t.id !== m.id && t.name.toLowerCase() === nm.toLowerCase())) {
            alert(`"${nm}" is already on the team.`);
            return;
          }
          cascadeTeamRename(m.name, nm);
        }
        const nextLogin = loginU || '';
        const nextPass = loginP || (nextLogin ? m.login_password || '' : '');
        if (nextLogin && !nextPass) {
          alert('Set a password for this login username.');
          return;
        }
        Object.assign(m, {
          name: nm,
          role: v.role,
          phone: v.phone,
          login_username: nextLogin || undefined,
          login_password: nextLogin ? nextPass : undefined
        });
      }
    }
    await commitChange();
    setEdit(null);
    refresh();
  };
  const remove = async t => {
    if (TEAM.length <= 1) {
      alert('At least one team member is required.');
      return;
    }
    if (!confirm(`Remove ${t.name} from the team? Their jobs/tickets become unassigned and their accounts move to another owner.`)) return;
    cascadeTeamRemove(t.name); // v5: no dangling references
    const i = TEAM.findIndex(x => x.id === t.id);
    if (i >= 0) TEAM.splice(i, 1);
    await commitChange();
    refresh();
  };
  return /*#__PURE__*/React.createElement(Shell, {
    active: "team"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "Team & Owners",
    sub: "Admin · manage staff, owners & technicians"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    onClick: () => setEdit('new')
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "plus",
    s: 14,
    sw: 2.2
  }), "Add Member")), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tscroll"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Name"), /*#__PURE__*/React.createElement("th", null, "Role"), /*#__PURE__*/React.createElement("th", {
    className: "desk-only"
  }, "App login"), /*#__PURE__*/React.createElement("th", {
    className: "desk-only"
  }, "Phone"), /*#__PURE__*/React.createElement("th", {
    style: {
      width: 96
    }
  }, "Actions"))), /*#__PURE__*/React.createElement("tbody", null, TEAM.map(t => /*#__PURE__*/React.createElement("tr", {
    key: t.id
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(Av, {
    name: t.name,
    size: 26
  }), /*#__PURE__*/React.createElement("b", null, t.name))), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Pill, {
    t: t.role === 'Owner' ? 'violet' : t.role === 'Admin' ? 'blue' : t.role.includes('Sales') ? 'green' : 'gray'
  }, t.role)), /*#__PURE__*/React.createElement("td", {
    className: "desk-only"
  }, t.login_username ? /*#__PURE__*/React.createElement("span", {
    className: "t1"
  }, t.login_username) : /*#__PURE__*/React.createElement("span", {
    className: "t2"
  }, "—")), /*#__PURE__*/React.createElement("td", {
    className: "desk-only"
  }, t.phone || '—'), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "act",
    title: "Edit",
    onClick: () => setEdit(t)
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "sliders",
    s: 14
  })), /*#__PURE__*/React.createElement("button", {
    className: "act",
    title: "Remove",
    style: {
      color: 'var(--red)',
      fontSize: 17,
      lineHeight: 1
    },
    onClick: () => remove(t)
  }, "×"))))))))), edit && /*#__PURE__*/React.createElement(FormModal, {
    title: edit === 'new' ? 'Add Team Member' : 'Edit ' + edit.name,
    submitLabel: edit === 'new' ? 'Add Member' : 'Save Changes',
    initial: edit === 'new' ? {
      role: 'Technician'
    } : {
      name: edit.name,
      role: edit.role,
      phone: edit.phone || '',
      login_username: edit.login_username || '',
      login_password: ''
    },
    fields: [{
      key: 'name',
      label: 'Full name'
    }, {
      key: 'role',
      label: 'Role',
      type: 'select',
      options: ROLE_OPTS,
      default: 'Technician'
    }, {
      key: 'phone',
      label: 'Phone'
    }, {
      key: 'login_username',
      label: 'App login username'
    }, {
      key: 'login_password',
      label: edit === 'new' ? 'App login password' : 'App login password (blank = keep current)',
      type: 'password'
    }],
    onClose: () => setEdit(null),
    onSave: save
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px 16px',
      fontSize: 12,
      color: 'var(--mut)',
      fontWeight: 600,
      lineHeight: 1.45
    }
  }, "Team members with an app login username and password can sign in on the login screen (master owner login ", /*#__PURE__*/React.createElement("b", null, "smart"), " always works)."));
}
function CompanyEditor() {
  const [f, setF] = useState({
    ...COMPANY
  });
  const [saved, setSaved] = useState(false);
  const logoRef = useRef();
  const set = (k, v) => {
    setF(s => ({
      ...s,
      [k]: v
    }));
    setSaved(false);
  };
  const pickLogo = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      set('logo', r.result);
    };
    r.readAsDataURL(file);
  };
  const apply = async () => {
    await saveCompany(f);
    setSaved(true);
  };
  const reset = async () => {
    localStorage.removeItem('sv_company');
    Object.assign(COMPANY, COMPANY_DEFAULT);
    setF({
      ...COMPANY_DEFAULT
    });
    await commitChange();
    setSaved(true);
  };
  const txt = [['name', 'Business name'], ['gstin', 'GSTIN'], ['phone', 'Phone'], ['email', 'Email'], ['web', 'Website'], ['address', 'Address']];
  return /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pah"
  }, /*#__PURE__*/React.createElement("h3", null, "Company profile & branding"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "· appears on quotes & invoices")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 132,
      height: 72,
      borderRadius: 10,
      border: '1px solid var(--ln)',
      background: '#fff',
      display: 'grid',
      placeItems: 'center',
      overflow: 'hidden',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: f.logo,
    alt: "logo",
    style: {
      maxWidth: '90%',
      maxHeight: '86%',
      objectFit: 'contain'
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    onClick: () => logoRef.current?.click()
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "upload",
    s: 14
  }), "Replace logo"), /*#__PURE__*/React.createElement("input", {
    ref: logoRef,
    type: "file",
    accept: "image/*",
    hidden: true,
    onChange: pickLogo
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--mut)',
      fontWeight: 600,
      marginTop: 6
    }
  }, "PNG with transparent background works best."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,1fr)',
      gap: 10
    }
  }, txt.map(([k, label]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      gridColumn: k === 'address' ? '1 / -1' : 'auto'
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, label), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    value: f[k] || '',
    onChange: e => set(k, e.target.value)
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Extra charges note (quotes & invoices)"), /*#__PURE__*/React.createElement("textarea", {
    className: "inp",
    rows: 2,
    value: f.extras || '',
    onChange: e => set('extras', e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Quotation terms & conditions"), /*#__PURE__*/React.createElement("textarea", {
    className: "inp",
    rows: 3,
    value: f.quoteTerms || '',
    onChange: e => set('quoteTerms', e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Invoice terms & conditions"), /*#__PURE__*/React.createElement("textarea", {
    className: "inp",
    rows: 3,
    value: f.invoiceTerms || '',
    onChange: e => set('invoiceTerms', e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    onClick: apply
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "check",
    s: 14,
    sw: 2.4
  }), "Save changes"), /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    onClick: reset
  }, "Reset to defaults"), saved && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      fontWeight: 700,
      color: 'var(--a-ink)'
    }
  }, "Saved ✓"))));
}
function WifiCsvPanel({
  busy,
  setBusy,
  setMsg,
  msg
}) {
  const hasLan = typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.lanStatus === 'function';
  const [lan, setLan] = useState({
    enabled: false,
    pin: '',
    urls: []
  });
  const refreshLan = async () => {
    if (!hasLan) return;
    try {
      const st = await window.electronAPI.lanStatus();
      if (st) setLan(st);
    } catch (e) {/* ignore */}
  };
  useEffect(() => {
    refreshLan();
  }, []);
  const csvLinks = (lan.urls || []).map(u => u.replace(/\/+$/, '') + '/wifi-csv.html');
  if (!hasLan) {
    return /*#__PURE__*/React.createElement("div", {
      className: "panel"
    }, /*#__PURE__*/React.createElement("div", {
      className: "pah"
    }, /*#__PURE__*/React.createElement("h3", null, "Phone & Samsung tablet — CSV on Wi-Fi"), /*#__PURE__*/React.createElement("span", {
      className: "sub"
    }, "· same network")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        fontSize: 12.5,
        fontWeight: 700,
        color: 'var(--ink2)'
      }
    }, "This control is in the Windows desktop app. Open Settings there to share CSV with a phone or tablet."));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pah"
  }, /*#__PURE__*/React.createElement("h3", null, "Phone & Samsung tablet — CSV on Wi-Fi"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "· same Wi-Fi as this PC")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--ink2)',
      fontWeight: 600,
      lineHeight: 1.5
    }
  }, "Keep this ERP open. Put the phone or Samsung tablet on the ", /*#__PURE__*/React.createElement("b", null, "same Wi-Fi"), ", then open the link below in Chrome. Enter the PIN. ", /*#__PURE__*/React.createElement("b", null, "Download CSV"), " pulls a full backup onto the device. ", /*#__PURE__*/React.createElement("b", null, "Send CSV to shop PC"), " restores that file here (replaces live data)."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 700
    }
  }, lan.enabled ? /*#__PURE__*/React.createElement(React.Fragment, null, "Wi-Fi CSV is on · PIN ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--a-ink)',
      fontSize: 18
    }
  }, lan.pin)) : 'Wi-Fi CSV is off.'), csvLinks.length > 0 && csvLinks.map(link => /*#__PURE__*/React.createElement("div", {
    key: link,
    style: {
      fontSize: 13,
      fontWeight: 700,
      wordBreak: 'break-all',
      background: 'var(--field)',
      padding: 12,
      borderRadius: 10
    }
  }, "Open on tablet / phone:", ' ', /*#__PURE__*/React.createElement("a", {
    href: link,
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      color: 'var(--a-ink)'
    }
  }, link))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    disabled: busy,
    onClick: async () => {
      setBusy(true);
      setMsg('');
      try {
        await window.electronAPI.lanEnable(!lan.enabled);
        await refreshLan();
        setMsg(lan.enabled ? 'Wi-Fi CSV turned off.' : 'Wi-Fi CSV on — open the link on the phone or Samsung tablet.');
      } catch (e) {
        setMsg(e.message || 'Could not toggle Wi-Fi CSV');
      } finally {
        setBusy(false);
      }
    }
  }, lan.enabled ? 'Turn off Wi-Fi CSV' : 'Turn on Wi-Fi CSV'), /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    disabled: busy || !lan.enabled,
    onClick: async () => {
      setBusy(true);
      try {
        await window.electronAPI.lanRotatePin();
        await refreshLan();
        setMsg('New PIN generated.');
      } catch (e) {
        setMsg(e.message || 'Could not rotate PIN');
      } finally {
        setBusy(false);
      }
    }
  }, "New PIN")), msg && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 700,
      color: 'var(--a-ink)'
    }
  }, msg)));
}
function MobileSyncPanel({
  busy,
  setBusy,
  setMsg,
  msg
}) {
  const hasLan = typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.lanStatus === 'function';
  const [lan, setLan] = useState({
    enabled: false,
    pin: '',
    urls: [],
    devices: []
  });
  const [pairUrl, setPairUrl] = useState('');
  const [pairPin, setPairPin] = useState('');
  const pair = getPairing();
  let lastSync = '';
  try {
    lastSync = localStorage.getItem('sv_last_sync') || '';
  } catch (e) {
    lastSync = '';
  }
  const refreshLan = async () => {
    if (!hasLan) return;
    try {
      const st = await window.electronAPI.lanStatus();
      if (st) setLan(st);
    } catch (e) {/* ignore */}
  };
  useEffect(() => {
    refreshLan();
  }, []);
  const qrText = lan.enabled && lan.urls && lan.urls[0] ? JSON.stringify({
    url: lan.urls[0],
    pairingPin: lan.pin,
    revision: currentRevision
  }) : '';
  return /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pah"
  }, /*#__PURE__*/React.createElement("h3", null, "Mobile / Android sync"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "· offline phone · merge on shop Wi-Fi")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--ink2)',
      fontWeight: 600,
      lineHeight: 1.5
    }
  }, "Technicians work offline on the APK. When they return to the shop, pair once (PIN) then Sync. The shop PC stays the source of truth. LAN pairing is off until you enable it."), hasLan && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 700
    }
  }, lan.enabled ? /*#__PURE__*/React.createElement(React.Fragment, null, "LAN pairing on · PIN ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--a-ink)'
    }
  }, lan.pin)) : 'LAN pairing is off.'), lan.urls && lan.urls.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--mut)'
    }
  }, lan.urls.join(' · ')), qrText && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      wordBreak: 'break-all',
      background: 'var(--field)',
      padding: 10,
      borderRadius: 10
    }
  }, "Scan or type: ", qrText), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    disabled: busy,
    onClick: async () => {
      setBusy(true);
      setMsg('');
      try {
        await window.electronAPI.lanEnable(!lan.enabled);
        await refreshLan();
        setMsg(lan.enabled ? 'LAN pairing disabled.' : 'LAN pairing enabled — phones can pair on this Wi-Fi.');
      } catch (e) {
        setMsg(e.message || 'Could not toggle LAN');
      } finally {
        setBusy(false);
      }
    }
  }, lan.enabled ? 'Disable LAN pairing' : 'Enable LAN pairing'), /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    disabled: busy || !lan.enabled,
    onClick: async () => {
      setBusy(true);
      try {
        await window.electronAPI.lanRotatePin();
        await refreshLan();
        setMsg('New pairing PIN generated.');
      } catch (e) {
        setMsg(e.message || 'Could not rotate PIN');
      } finally {
        setBusy(false);
      }
    }
  }, "New PIN")), (lan.devices || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 700
    }
  }, "Paired devices: ", lan.devices.map(d => d.prefix + (d.name ? ' (' + d.name + ')' : '')).join(', '))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 700
    }
  }, "This device ", pair ? 'is paired' : 'is not paired', getNumberPrefix() ? ' · numbers ' + getNumberPrefix() : '', "."), lastSync && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--mut)',
      fontWeight: 600
    }
  }, "Last sync: ", lastSync), !hasLan && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "Shop PC URL"), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    value: pairUrl,
    onChange: e => setPairUrl(e.target.value),
    placeholder: "http://192.168.1.10:port"
  }), /*#__PURE__*/React.createElement("label", {
    className: "field-l"
  }, "PIN"), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    value: pairPin,
    onChange: e => setPairPin(e.target.value),
    placeholder: "6-digit PIN"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, !hasLan && !pair && /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    disabled: busy,
    onClick: async () => {
      setBusy(true);
      setMsg('');
      try {
        let url = pairUrl,
          pin = pairPin;
        if (window.SV_APK && window.SV_APK.scanPairingQr) {
          const scanned = await window.SV_APK.scanPairingQr();
          if (scanned && scanned.url) {
            url = scanned.url;
            pin = scanned.pairingPin || pin;
          }
        }
        await pairWithShop({
          url,
          pin
        });
        setMsg('Paired. Pull complete — you can work offline.');
      } catch (e) {
        setMsg(e.message || 'Pair failed');
      } finally {
        setBusy(false);
      }
    }
  }, "Pair with shop PC"), pair && /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    disabled: busy,
    onClick: async () => {
      setBusy(true);
      setMsg('');
      try {
        await syncWithShop();
        setMsg('Synced with shop PC.');
      } catch (e) {
        setMsg(e.message || 'Sync failed');
      } finally {
        setBusy(false);
      }
    }
  }, "Sync now"), pair && /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    disabled: busy,
    onClick: () => {
      unpairShop();
      setMsg('Unpaired. Local data stays on this device.');
    }
  }, "Unpair")), msg && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 700,
      color: 'var(--a-ink)'
    }
  }, msg)));
}
function Settings() {
  const fileRef = useRef();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState('saved');
  const [drive, setDrive] = useState({
    configured: false,
    connected: false,
    email: '',
    clientId: '',
    hasSecret: false
  });
  const [driveFiles, setDriveFiles] = useState(null);
  const [oauthForm, setOauthForm] = useState(null);
  const hasDriveApi = typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.gdriveStatus === 'function';
  const refreshDrive = async () => {
    if (!hasDriveApi) return;
    try {
      const st = await window.electronAPI.gdriveStatus();
      if (st) setDrive(st);
    } catch (e) {/* ignore */}
  };
  useEffect(() => {
    refreshDrive();
  }, []);
  useEffect(() => {
    const onStart = () => setSaveState('saving');
    const onDone = e => setSaveState(e.detail?.ok === false ? 'error' : 'saved');
    window.addEventListener('sv-persist-start', onStart);
    window.addEventListener('sv-persist', onDone);
    return () => {
      window.removeEventListener('sv-persist-start', onStart);
      window.removeEventListener('sv-persist', onDone);
    };
  }, []);
  const getCsvForBackup = async () => {
    await flushToServer();
    let csvText = buildBackupCsvText();
    const memRows = countCsvRecords(csvText);
    let localSavedAt = 0;
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (raw) localSavedAt = Number(JSON.parse(raw).savedAt) || 0;
    } catch (e) {/* ignore */}
    if (serverOK) {
      try {
        const res = await fetch(new URL('/backup/export', window.location.href).href + '?t=' + Date.now());
        if (res.ok) {
          const serverCsv = await res.text();
          const serverRows = countCsvRecords(serverCsv);
          const serverAtMatch = serverCsv.match(/^#\s*savedAt=(\d+)/m);
          const serverAt = serverAtMatch ? Number(serverAtMatch[1]) : 0;
          const memoryIsNewer = localSavedAt > serverAt || localSavedAt === serverAt && memRows >= serverRows;
          if (!memoryIsNewer && serverRows > memRows) csvText = serverCsv;
        }
      } catch (e) {/* keep in-memory */}
    }
    return csvText;
  };
  const exportCsv = async () => {
    setBusy(true);
    setMsg('');
    try {
      const csvText = await getCsvForBackup();
      const rows = countCsvRecords(csvText);
      if (rows < 1) {
        setMsg('Nothing to export — add data first.');
        return;
      }
      const filename = 'cctv-erp-backup-' + new Date().toISOString().slice(0, 10) + '.csv';
      const savedPath = await downloadBackupCsv(csvText, filename);
      setMsg(savedPath ? `Backup saved (${rows} records) → ${savedPath}` : `Backup downloaded (${rows} records).`);
    } catch {
      setMsg('Export failed.');
    } finally {
      setBusy(false);
    }
  };
  const importCsv = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Restore will REPLACE all current data with the backup. Continue?')) return;
    setBusy(true);
    setMsg('');
    try {
      const text = await file.text();
      const restored = await importBackupCsv(text);
      const total = Object.values(restored).reduce((a, b) => a + b, 0);
      setMsg(`Restored ${total} records across ${Object.keys(restored).length} tables. Reloading…`);
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setMsg(err.message ? `Restore failed — ${err.message}` : 'Restore failed — check the file format.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const saveOauth = async v => {
    if (!hasDriveApi) return;
    setBusy(true);
    setMsg('');
    try {
      const r = await window.electronAPI.gdriveSaveCredentials({
        clientId: v.clientId,
        clientSecret: v.clientSecret
      });
      setOauthForm(null);
      await refreshDrive();
      setMsg(r.configured ? 'Google OAuth credentials saved.' : 'Client ID is required.');
    } catch (e) {
      setMsg('Could not save Google credentials.');
    } finally {
      setBusy(false);
    }
  };
  const connectDrive = async () => {
    if (!hasDriveApi) {
      setMsg('Google Drive is only available in the desktop app.');
      return;
    }
    setBusy(true);
    setMsg('Opening Google sign-in…');
    try {
      const r = await window.electronAPI.gdriveConnect();
      await refreshDrive();
      setMsg(r.ok ? `Connected to Google Drive${r.email ? ' as ' + r.email : ''}.` : r.error || 'Connect failed.');
    } catch (e) {
      setMsg(e.message || 'Connect failed.');
    } finally {
      setBusy(false);
    }
  };
  const disconnectDrive = async () => {
    if (!hasDriveApi) return;
    if (!confirm('Disconnect Google Drive from this PC?')) return;
    await window.electronAPI.gdriveDisconnect();
    setDriveFiles(null);
    await refreshDrive();
    setMsg('Google Drive disconnected.');
  };
  const backupToDrive = async () => {
    if (!hasDriveApi) {
      setMsg('Google Drive is only available in the desktop app.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const csvText = await getCsvForBackup();
      const rows = countCsvRecords(csvText);
      if (rows < 1) {
        setMsg('Nothing to back up — add data first.');
        return;
      }
      const filename = 'cctv-erp-backup-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.csv';
      const r = await window.electronAPI.gdriveUpload(csvText, filename);
      if (!r.ok) {
        setMsg(r.error || 'Google Drive upload failed.');
        return;
      }
      setMsg(`Uploaded to Google Drive → ${r.folder}/${r.file?.name || filename} (${rows} records).`);
    } catch (e) {
      setMsg(e.message || 'Google Drive upload failed.');
    } finally {
      setBusy(false);
    }
  };
  const openDriveRestore = async () => {
    if (!hasDriveApi) {
      setMsg('Google Drive is only available in the desktop app.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const r = await window.electronAPI.gdriveList();
      if (!r.ok) {
        setMsg(r.error || 'Could not list Drive backups.');
        return;
      }
      if (!r.files || !r.files.length) {
        setMsg('No backups found in Google Drive folder “Smart Vision ERP Backups”.');
        return;
      }
      setDriveFiles(r.files);
      setMsg(`Found ${r.files.length} backup(s) on Google Drive — pick one to restore.`);
    } catch (e) {
      setMsg(e.message || 'Could not list Drive backups.');
    } finally {
      setBusy(false);
    }
  };
  const restoreFromDrive = async file => {
    if (!file?.id) return;
    if (!confirm(`Restore will REPLACE all current data with:\n${file.name}\n\nContinue?`)) return;
    setBusy(true);
    setMsg('Downloading from Google Drive…');
    try {
      const r = await window.electronAPI.gdriveDownload(file.id);
      if (!r.ok || !r.csvText) {
        setMsg(r.error || 'Download failed.');
        return;
      }
      const restored = await importBackupCsv(r.csvText);
      const total = Object.values(restored).reduce((a, b) => a + b, 0);
      setDriveFiles(null);
      setMsg(`Restored ${total} records from ${r.name || file.name}. Reloading…`);
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      setMsg(e.message || 'Restore from Google Drive failed.');
    } finally {
      setBusy(false);
    }
  };
  const fmtDriveDate = isoStr => {
    if (!isoStr) return '';
    try {
      return new Date(isoStr).toLocaleString();
    } catch (e) {
      return isoStr;
    }
  };
  return /*#__PURE__*/React.createElement(Shell, {
    active: "settings"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "Settings",
    sub: `Workspace · Smart Vision Enterprise, Borsad · Data: ${saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed — retry from Backup' : 'Saved to disk'}`
  }), /*#__PURE__*/React.createElement(CompanyEditor, null), /*#__PURE__*/React.createElement(WifiCsvPanel, {
    busy: busy,
    setBusy: setBusy,
    setMsg: setMsg,
    msg: msg
  }), /*#__PURE__*/React.createElement(MobileSyncPanel, {
    busy: busy,
    setBusy: setBusy,
    setMsg: setMsg,
    msg: msg
  }), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pah"
  }, /*#__PURE__*/React.createElement("h3", null, "Full Data Backup & Restore"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "· CSV · every table")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--ink2)',
      fontWeight: 600,
      lineHeight: 1.5
    }
  }, "Export is Excel-friendly: one section per table (## customers, ## quotes, …) with normal columns. Edit in Excel, leave id blank for new rows, use plain names for customer/owner links. Line items use Description|Amount;… Duplicate names/numbers resolve on restore (last row wins). Restore replaces all live data — export first if you may need a rollback. Old v1 JSON backups still restore."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    onClick: exportCsv,
    disabled: busy
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "download",
    s: 14
  }), "Export full backup"), /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    onClick: () => fileRef.current?.click(),
    disabled: busy
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "upload",
    s: 14
  }), "Restore from CSV"), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: ".csv",
    hidden: true,
    onChange: importCsv
  })))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pah"
  }, /*#__PURE__*/React.createElement("h3", null, "Google Drive Backup & Restore"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, "· cloud · same CSV format")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--ink2)',
      fontWeight: 600,
      lineHeight: 1.5
    }
  }, "Backups go to a Drive folder named ", /*#__PURE__*/React.createElement("b", null, "Smart Vision ERP Backups"), ". Requires a Google Cloud ", /*#__PURE__*/React.createElement("b", null, "Desktop"), " OAuth client with the ", /*#__PURE__*/React.createElement("b", null, "Google Drive API"), " enabled. Paste Client ID (and Secret) once, then Connect."), !hasDriveApi && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 700,
      color: 'var(--red)'
    }
  }, "Google Drive buttons work in the installed desktop app (not in a plain browser)."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 700,
      color: 'var(--ink2)'
    }
  }, drive.connected ? /*#__PURE__*/React.createElement(React.Fragment, null, "Connected", drive.email ? /*#__PURE__*/React.createElement(React.Fragment, null, " as ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--a-ink)'
    }
  }, drive.email)) : '', ".") : drive.configured ? 'OAuth configured — connect your Google account.' : 'OAuth not configured yet.'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    disabled: busy || !hasDriveApi,
    onClick: () => setOauthForm({
      clientId: drive.clientId || '',
      clientSecret: ''
    })
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "sliders",
    s: 14
  }), "Google API credentials"), !drive.connected ? /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    onClick: connectDrive,
    disabled: busy || !hasDriveApi || !drive.configured
  }, "Connect Google Drive") : /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    onClick: disconnectDrive,
    disabled: busy
  }, "Disconnect"), /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    onClick: backupToDrive,
    disabled: busy || !hasDriveApi || !drive.connected
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "upload",
    s: 14
  }), "Backup to Google Drive"), /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    onClick: openDriveRestore,
    disabled: busy || !hasDriveApi || !drive.connected
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "download",
    s: 14
  }), "Restore from Google Drive")), driveFiles && /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--ln)',
      borderRadius: 12,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      fontWeight: 800,
      fontSize: 13,
      background: 'var(--field)'
    }
  }, "Choose a Drive backup", /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    style: {
      float: 'right',
      padding: '4px 10px'
    },
    onClick: () => setDriveFiles(null),
    disabled: busy
  }, "Close")), /*#__PURE__*/React.createElement("div", {
    className: "tscroll",
    style: {
      maxHeight: 260
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "File"), /*#__PURE__*/React.createElement("th", null, "Created"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, driveFiles.map(f => /*#__PURE__*/React.createElement("tr", {
    key: f.id
  }, /*#__PURE__*/React.createElement("td", {
    className: "t1"
  }, f.name), /*#__PURE__*/React.createElement("td", {
    className: "t2"
  }, fmtDriveDate(f.createdTime || f.modifiedTime)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    style: {
      padding: '6px 10px'
    },
    disabled: busy,
    onClick: () => restoreFromDrive(f)
  }, "Restore")))))))), msg && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 700,
      color: 'var(--a-ink)'
    }
  }, msg))), oauthForm && /*#__PURE__*/React.createElement(FormModal, {
    title: "Google OAuth credentials",
    submitLabel: "Save",
    initial: oauthForm,
    fields: [{
      key: 'clientId',
      label: 'Client ID (Desktop app)'
    }, {
      key: 'clientSecret',
      label: 'Client Secret (optional for some clients)',
      type: 'password'
    }],
    onClose: () => setOauthForm(null),
    onSave: saveOauth
  }));
}

/* ---------------- router ---------------- */
function ServiceRepair() {
  const [filter, setFilter] = useState(null);
  const path = '/repairs' + (filter ? '?filter=' + filter : '');
  const {
    data,
    loading,
    reload
  } = useFetch(path, [path]);
  const rows = data?.data ?? [];
  const [rec, setRec] = useState(null);
  const [printDoc, setPrintDoc] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const repairDoc = (r, kind) => {
    const items = [{
      id: 1,
      description: `${kind === 'quote' ? 'Repair estimate' : 'Repair'} — ${r.device}${r.serial_no ? ' (' + r.serial_no + ')' : ''}`,
      amount: r.charge
    }, {
      id: 2,
      description: `Reported issue: ${r.issue}`,
      amount: 0
    }];
    if (kind === 'quote') return {
      number: r.number.replace('SR-', 'SRQ-'),
      customer: r.customer,
      scope: `${r.device} — ${r.issue}`,
      total: r.charge,
      valid_till: r.promised_on,
      items
    };
    return {
      number: r.number.replace('SR-', 'SRB-'),
      customer: r.customer,
      total: r.charge,
      paid: 0,
      balance: r.charge,
      issue_date: iso(0),
      due_date: r.promised_on,
      items
    };
  };
  const waRepair = r => {
    const message = `Hello ${r.customer?.name || ''},\n\nUpdate on your repair ${r.number} — ${r.device}.\nStatus: ${repairStatus(r.status)[0]}${r.charge ? ', estimate ' + inr(r.charge) : ''}.\n\nRegards,\n${COMPANY.name}\n${COMPANY.phone}`;
    const doc = r.charge ? repairDoc(r, 'quote') : null;
    waOpen(r.customer?.name, message, doc ? {
      kind: 'quote',
      doc
    } : undefined);
  };
  const advance = async r => {
    const order = ['received', 'diagnosing', 'repairing', 'ready', 'delivered'];
    const t = DB.repairs.find(x => x.id === r.id);
    if (t) {
      const i = order.indexOf(t.status);
      if (i < order.length - 1) t.status = order[i + 1];
      if (t.status === 'delivered' && t.coverage === 'paid' && num(t.charge) > 0 && !t.invoice_number) {
        const custName = t.customer?.name;
        if (custName) {
          const inv = createInvoice({
            customer: custName,
            total: t.charge,
            dueDays: 7,
            items: [{
              id: 1,
              description: `Repair ${t.number} — ${t.device}${t.serial_no ? ' (' + t.serial_no + ')' : ''}`,
              amount: t.charge
            }],
            note: 'From ' + t.number
          });
          if (inv) t.invoice_number = inv.number;
        }
      }
    }
    await commitChange();
    reload();
    setRec(null);
  };
  const open = r => setRec({
    title: r.number,
    subtitle: r.device,
    icon: 'wrench',
    body: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DwSection, {
      label: "Repair job"
    }, /*#__PURE__*/React.createElement(DwBox, {
      rows: [['Customer', r.customer?.name], ['Device', r.device], ['Serial', r.serial_no || '—'], ['Coverage', /*#__PURE__*/React.createElement(Pill, {
        t: REP_COV[r.coverage]
      }, r.coverage)], ['Received', date(r.received_on)], ['Promised', date(r.promised_on)], ['Technician', r.technician?.name || 'Unassigned'], ['Charge', r.charge ? inr(r.charge) : 'Free (covered)'], ['Invoice', r.invoice_number || '— (billed on delivery)'], ['Status', /*#__PURE__*/React.createElement(Pill, {
        t: repairStatus(r.status)[1],
        dot: true
      }, repairStatus(r.status)[0])]]
    })), /*#__PURE__*/React.createElement(DwSection, {
      label: "Reported problem"
    }, /*#__PURE__*/React.createElement("div", {
      className: "dwbox"
    }, /*#__PURE__*/React.createElement("div", {
      className: "li"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lin",
      style: {
        fontWeight: 600,
        whiteSpace: 'normal'
      }
    }, r.issue)))), /*#__PURE__*/React.createElement(DwSection, {
      label: "Documents"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      style: {
        flex: 1,
        justifyContent: 'center'
      },
      onClick: () => setPrintDoc({
        kind: 'quote',
        doc: repairDoc(r, 'quote')
      })
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "printer",
      s: 14
    }), "Quote A4"), /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      style: {
        flex: 1,
        justifyContent: 'center'
      },
      onClick: () => setPrintDoc({
        kind: 'invoice',
        doc: repairDoc(r, 'bill')
      })
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "printer",
      s: 14
    }), "Bill A4")))),
    foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      onClick: () => setEditRow(r)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "sliders",
      s: 14
    }), "Edit"), /*#__PURE__*/React.createElement("button", {
      className: "btn-o",
      style: {
        color: 'var(--red)'
      },
      onClick: async () => {
        if (confirm('Delete this repair job?')) {
          entityDelete('repair', r.id);
          await afterMutation();
          setRec(null);
          reload();
        }
      }
    }, "Delete"), /*#__PURE__*/React.createElement("button", {
      className: "btn-o wa-btn",
      onClick: () => waRepair(r)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "whatsapp",
      s: 14
    }), "Update"), /*#__PURE__*/React.createElement("button", {
      className: "btn-p",
      onClick: () => advance(r),
      disabled: r.status === 'delivered'
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "check",
      s: 14,
      sw: 2.4
    }), "Advance"))
  });
  return /*#__PURE__*/React.createElement(Shell, {
    active: "service"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "Service & Repair",
    sub: "Bench repairs · estimate, repair & bill"
  }, /*#__PURE__*/React.createElement(CreateButton, {
    entity: "repair",
    onDone: reload
  })), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, [['All', null], ['Received', 'received'], ['Diagnosing', 'diagnosing'], ['Repairing', 'repairing'], ['Ready', 'ready'], ['Delivered', 'delivered']].map(([l, v]) => /*#__PURE__*/React.createElement("span", {
    key: l,
    className: 'chip' + (v === filter ? ' on' : ''),
    onClick: () => setFilter(v)
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, loading ? /*#__PURE__*/React.createElement("div", {
    className: "loading"
  }, "Loading…") : rows.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No repair jobs") : /*#__PURE__*/React.createElement("div", {
    className: "tscroll"
  }, /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Job"), /*#__PURE__*/React.createElement("th", null, "Customer"), /*#__PURE__*/React.createElement("th", {
    className: "desk-only"
  }, "Device"), /*#__PURE__*/React.createElement("th", null, "Coverage"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Charge"), /*#__PURE__*/React.createElement("th", null, "Status"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.id,
    onClick: () => open(r)
  }, /*#__PURE__*/React.createElement("td", {
    className: "t1"
  }, r.number), /*#__PURE__*/React.createElement("td", {
    className: "t1"
  }, r.customer?.name), /*#__PURE__*/React.createElement("td", {
    className: "desk-only"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t1"
  }, r.device), /*#__PURE__*/React.createElement("div", {
    className: "t2"
  }, r.serial_no)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Pill, {
    t: REP_COV[r.coverage]
  }, r.coverage)), /*#__PURE__*/React.createElement("td", {
    className: "num t1"
  }, r.charge ? inr(r.charge) : '—'), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Pill, {
    t: repairStatus(r.status)[1],
    dot: true
  }, repairStatus(r.status)[0])))))))), /*#__PURE__*/React.createElement(Drawer, {
    rec: rec,
    onClose: () => setRec(null)
  }), editRow && /*#__PURE__*/React.createElement(FormModal, {
    title: "Edit Repair",
    submitLabel: "Save Changes",
    fields: entityEditFields('repair'),
    initial: entityToInitial('repair', editRow),
    onClose: () => setEditRow(null),
    onSave: async v => {
      const row = DB.repairs.find(x => x.id === editRow.id);
      if (row) entityApplyEdit('repair', row, v);
      await afterMutation();
      setEditRow(null);
      setRec(null);
      reload();
    }
  }), printDoc && /*#__PURE__*/React.createElement(PrintHost, {
    kind: printDoc.kind,
    doc: printDoc.doc,
    onClose: () => setPrintDoc(null)
  }));
}
const ROUTE_MAP = {
  '': Dashboard,
  leads: Leads,
  quotes: Quotes,
  invoices: Invoices,
  outstanding: Outstanding,
  accounts: Accounts,
  customers: Customers,
  jobs: Jobs,
  tickets: Tickets,
  amc: Amc,
  equipment: Equipment,
  credentials: Credentials,
  inventory: Inventory,
  serials: Serials,
  warranty: Warranty,
  purchasing: Purchasing,
  reports: Reports,
  insights: Insights,
  team: Team,
  settings: Settings,
  service: ServiceRepair
};
function SmartVisionApp() {
  const {
    pathname
  } = useLocation();
  useEffect(() => {
    if (!isLoggedIn()) window.location.replace('./index.html');
  }, []);
  if (!isLoggedIn()) return null;
  const path = routeKey(pathname);
  const Cmp = ROUTE_MAP[path] || Dashboard;
  return /*#__PURE__*/React.createElement(Cmp, null);
}
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      err: null
    };
  }
  static getDerivedStateFromError(err) {
    return {
      err: err || true
    };
  }
  render() {
    if (this.state.err) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          padding: 32,
          fontFamily: 'system-ui, sans-serif',
          maxWidth: 480
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 800,
          fontSize: 18,
          marginBottom: 8
        }
      }, "Something went wrong"), /*#__PURE__*/React.createElement("div", {
        style: {
          color: '#666',
          fontSize: 13,
          lineHeight: 1.45,
          marginBottom: 16
        }
      }, "The last screen hit an error. Your data is still on disk — reload to continue."), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "btn-p",
        onClick: () => window.location.reload()
      }, "Reload"));
    }
    return this.props.children;
  }
}
function AppRoot() {
  const [ready, setReady] = useState(bootReady);
  useEffect(() => {
    if (ready) return;
    bootPromise.then(() => setReady(true)).catch(() => setReady(true));
  }, [ready]);
  if (!ready) return /*#__PURE__*/React.createElement("div", {
    className: "loading",
    style: {
      padding: 40
    }
  }, "Loading…");
  return /*#__PURE__*/React.createElement(AppErrorBoundary, null, /*#__PURE__*/React.createElement(SmartVisionApp, null));
}
window.SmartVisionApp = AppRoot;