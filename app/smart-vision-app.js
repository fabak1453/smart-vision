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
  password: 'SV@7866'
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
const O = name => ({
  name
});
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
    items: [{
      id: 1,
      description: 'Hikvision 2MP Dome × 4',
      amount: 6600
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
  }]
};

/* ---------------- derived report payloads ---------------- */
function dashboardPayload() {
  refreshDerived();
  const openLeads = DB.leads.filter(l => l.stage < 4);
  return {
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
    customer: i.customer.name,
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
function searchPayload(q) {
  q = (q || '').toLowerCase();
  const m = s => String(s || '').toLowerCase().includes(q);
  return {
    results: {
      customers: DB.customers.filter(c => m(c.name) || m(c.area)).slice(0, 5),
      invoices: DB.invoices.filter(i => m(i.number) || m(i.customer.name)).slice(0, 5),
      serials: DB.serials.filter(s => m(s.serial_no)).slice(0, 5),
      tickets: DB.tickets.filter(t => m(t.number) || m(t.issue)).slice(0, 5),
      products: DB.products.filter(p => m(p.sku) || m(p.name)).slice(0, 5),
      leads: DB.leads.filter(l => m(l.name)).slice(0, 5)
    }
  };
}

/* ---------------- mock api router ---------------- */
function attachCustomerDetail(c) {
  return {
    ...c,
    equipment: DB.equipment.filter(e => e.customer.name === c.name).map(e => ({
      id: e.id,
      name: e.name,
      location: e.location
    })),
    credentials: DB.credentials.filter(cr => cr.customer.name === c.name).map(cr => ({
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
  if (p === '/products') return {
    data: DB.products
  };
  if (p === '/serials') return {
    data: DB.serials
  };
  if (p === '/purchase-orders') return {
    data: DB.purchaseOrders
  };
  if (p === '/repairs') return {
    data: DB.repairs.filter(x => !filter || x.status === filter)
  };
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
      const restored = importBackupCsv(text);
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
    setLoading(true);
    api.get(path).then(d => {
      setData(d);
      setError(null);
    }).catch(e => setError(e)).finally(() => setLoading(false));
  }, [path]);
  useEffect(() => {
    reload(); /* eslint-disable-next-line */
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
  login_password: 'SV@7866'
}, {
  id: 2,
  name: 'Akram Suli',
  role: 'Technician',
  phone: '98220 41187'
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

/* ---------------- data persistence (server-shared, with local fallback) ----------------
   - If an ./api.php (or Python dev server) backend is reachable, ALL data is
     stored server-side in data.json, so every device/browser shares it.
   - If no backend (e.g. opened as a static file or on plain Netlify), it falls
     back to this browser's localStorage. */
const API_URL = './api.php';
const PERSIST_KEY = 'sv_state_v1';
let serverOK = false;
function applyState(s) {
  if (!s) return;
  if (s.DB) Object.keys(s.DB).forEach(k => {
    if (Array.isArray(DB[k])) {
      DB[k].length = 0;
      s.DB[k].forEach(x => DB[k].push(x));
    }
  });
  if (Array.isArray(s.TEAM)) {
    TEAM.length = 0;
    s.TEAM.forEach(x => TEAM.push(x));
  }
  ensureTeamLoginDefaults();
}
(function boot() {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', API_URL + '?t=' + Date.now(), false); // sync so DB is ready before first render
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) {
      serverOK = true;
      const j = JSON.parse(xhr.responseText || 'null');
      if (j && (j.DB || j.TEAM)) applyState(j);
      return; // server is the source of truth
    }
  } catch (e) {/* no backend reachable */}
  try {
    applyState(JSON.parse(localStorage.getItem(PERSIST_KEY) || 'null'));
  } catch (e) {/* ignore */}
  ensureTeamLoginDefaults();
})();
let lastSaved = '';
function persistState() {
  let payload;
  try {
    payload = JSON.stringify({
      DB,
      TEAM
    });
  } catch (e) {
    return;
  }
  if (payload === lastSaved) return;
  lastSaved = payload;
  try {
    localStorage.setItem(PERSIST_KEY, payload);
  } catch (e) {/* ignore */}
  if (serverOK) {
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
  }
}
if (typeof window !== 'undefined') {
  setInterval(persistState, 1500);
  window.addEventListener('beforeunload', persistState);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) persistState();
  });
}

/* ---------------- CSV backup / restore (all ERP tables) ---------------- */
const BACKUP_CSV_MARKER = '# Smart Vision ERP backup v1';
function csvCell(value) {
  const s = String(value ?? '');
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function parseCsvRow(line) {
  const out = [];
  let cur = '';
  let i = 0;
  let quoted = false;
  while (i < line.length) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      cur += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      i++;
      continue;
    }
    if (ch === ',') {
      out.push(cur);
      cur = '';
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  out.push(cur);
  return out;
}
function buildBackupCsvBlob() {
  const lines = ['entity,id,json'];
  Object.keys(DB).forEach(table => {
    const rows = DB[table];
    if (!Array.isArray(rows)) return;
    rows.forEach(row => {
      lines.push([csvCell(table), csvCell(row.id ?? ''), csvCell(JSON.stringify(row))].join(','));
    });
  });
  TEAM.forEach(row => {
    lines.push([csvCell('team'), csvCell(row.id ?? ''), csvCell(JSON.stringify(row))].join(','));
  });
  const body = '\uFEFF' + BACKUP_CSV_MARKER + '\r\n' + lines.join('\r\n');
  return new Blob([body], {
    type: 'text/csv;charset=utf-8'
  });
}
function importBackupCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(l => l && !l.startsWith('#'));
  if (!lines.length) throw new Error('empty backup');
  const head = lines[0].toLowerCase();
  if (!head.startsWith('entity,')) throw new Error('invalid backup header');
  const newDB = {};
  const newTeam = [];
  const counts = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvRow(lines[i]);
    if (cols.length < 3) continue;
    const entity = cols[0];
    let rec;
    try {
      rec = JSON.parse(cols[2]);
    } catch (e) {
      continue;
    }
    if (entity === 'team') {
      newTeam.push(rec);
      counts.team = (counts.team || 0) + 1;
    } else {
      if (!newDB[entity]) newDB[entity] = [];
      newDB[entity].push(rec);
      counts[entity] = (counts[entity] || 0) + 1;
    }
  }
  if (!Object.keys(counts).length) throw new Error('no records in backup');
  applyState({
    DB: newDB,
    TEAM: newTeam.length ? newTeam : TEAM.slice()
  });
  lastSaved = '';
  persistState();
  return counts;
}
async function flushToServer() {
  let payload;
  try {
    payload = JSON.stringify({
      DB,
      TEAM
    });
  } catch (e) {
    return;
  }
  lastSaved = '';
  persistState();
  if (!serverOK) return;
  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    });
  } catch (e) {/* ignore */}
}
function countCsvRecords(csvText) {
  return String(csvText || '').split(/\r?\n/).filter(l => l && !l.startsWith('#') && !l.toLowerCase().startsWith('entity,')).length;
}
function downloadBackupCsv(csvText, filename) {
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
}
const nextId = arr => arr.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
const num = v => Number(v) || 0;
// v5: collision-proof numbering — scans existing numbers instead of using array length
const genNum = (prefix, arr, base) => {
  const mx = arr.reduce((m, x) => {
    const n = parseInt(String(x.number || '').replace(/^\D+/, ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, base);
  return prefix + (mx + 1);
};

/* ================== v5: cross-module wiring helpers ================== */
// Lifetime value = total billed to the customer. Bumped on every invoice.
function bumpLTV(name, amount) {
  const c = DB.customers.find(x => x.name === name);
  if (c) c.lifetime_value = num(c.lifetime_value) + num(amount);
}
// One place that creates invoices — used by manual create, accepted quotes,
// AMC billing and chargeable repairs — so LTV & numbering stay consistent.
function createInvoice({
  customer,
  total,
  dueDays = 15,
  items = [],
  note = ''
}) {
  const t = num(total);
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
    items,
    note,
    payments: []
  };
  DB.invoices.push(inv);
  bumpLTV(customer, t);
  return inv;
}
// Lead won → make sure the customer exists in the Customers module.
function ensureCustomer(lead) {
  if (!lead || DB.customers.some(c => c.name === lead.name)) return;
  DB.customers.push({
    id: nextId(DB.customers),
    name: lead.name,
    area: '',
    type: lead.segment || 'Commercial',
    contact_name: '',
    phone: '',
    sites: 1,
    owner: O(lead.owner?.name || teamNames()[0]),
    lifetime_value: 0
  });
}
// Accepted quote → invoice + installation job + mark lead as Won (once).
function convertQuote(q) {
  if (!q || q.converted || q.status !== 'accepted') return;
  q.converted = true;
  // make sure the customer exists first, so the invoice's LTV bump lands
  const lead = DB.leads.find(l => l.name === q.customer.name && l.stage < 4);
  if (lead) {
    lead.stage = 4;
    ensureCustomer(lead);
  }
  if (!DB.customers.some(c => c.name === q.customer.name)) ensureCustomer({
    name: q.customer.name,
    segment: 'Commercial',
    owner: q.owner
  });
  const inv = createInvoice({
    customer: q.customer.name,
    total: q.total,
    items: q.items || [],
    note: 'From ' + q.number
  });
  q.invoice_number = inv.number;
  const job = {
    id: nextId(DB.jobs),
    number: genNum('JOB-', DB.jobs, 3000),
    customer: O(q.customer.name),
    type: 'install',
    scope: q.scope || 'Installation per ' + q.number,
    scheduled_on: iso(3),
    slot: 'TBD',
    technician: null,
    status: 'unassigned',
    checklist: []
  };
  DB.jobs.push(job);
  q.job_number = job.number;
}
// PO received → stock in (matches line items to products by name, once).
function receivePO(po) {
  if (!po || po.stocked) return;
  po.stocked = true;
  (po.items || []).forEach(it => {
    const p = DB.products.find(x => x.name === it.description);
    if (p) p.stock = num(p.stock) + num(it.qty);
  });
}
// Live derived statuses — recomputed from dates on every read so nothing
// stays frozen in time (invoices→overdue, AMC→expiring/expired, warranty).
function refreshDerived() {
  const now = TODAY.getTime();
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
const customerLinkCount = name => DB.quotes.filter(q => q.customer?.name === name).length + DB.invoices.filter(i => i.customer?.name === name).length + DB.jobs.filter(j => j.customer?.name === name).length + DB.tickets.filter(t => t.customer?.name === name).length + DB.amc.filter(a => a.customer?.name === name).length + DB.equipment.filter(e => e.customer?.name === name).length + DB.repairs.filter(r => r.customer?.name === name).length;
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
const suppNames = () => [...new Set(DB.purchaseOrders.map(p => p.supplier.name))];
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
      const q = {
        id: nextId(DB.quotes),
        number: genNum('QT-', DB.quotes, 1000),
        customer: O(v.customer),
        scope: v.scope,
        total: num(v.total),
        status: v.status || 'draft',
        owner: O(v.owner || teamNames()[0]),
        valid_till: iso(15),
        items: []
      };
      DB.quotes.push(q);
      convertQuote(q);
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
      if (v.status && v.status !== 'sent') inv.status = v.status;
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
      if (!nm) return;
      if (DB.customers.some(c => c.name.toLowerCase() === nm.toLowerCase())) {
        alert(`A customer named "${nm}" already exists — open that record instead of creating a duplicate.`);
        return;
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
          note: 'AMC ' + a.number + ' — annual charge'
        });
        a.invoice_number = inv.number;
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
      type: 'number'
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
        if (p && p.stock > 0) p.stock -= 1;
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
        if (p && p.stock > 0) p.stock -= 1;
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
  }
};
function FormModal({
  title,
  fields,
  submitLabel = 'Save',
  initial,
  onClose,
  onSave
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
      value: form[f.key],
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
    onClick: onClose
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    className: "btn-p",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: () => onSave(form)
  }, submitLabel))));
}
function CreateButton({
  entity,
  label,
  onDone,
  className
}) {
  const [open, setOpen] = useState(false);
  const cfg = ENTITIES[entity];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: className || 'btn-p',
    onClick: () => setOpen(true)
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "plus",
    s: 14,
    sw: 2.2
  }), label || 'New ' + cfg.label), open && /*#__PURE__*/React.createElement(FormModal, {
    title: 'New ' + cfg.label,
    fields: cfg.fields,
    submitLabel: 'Create ' + cfg.label,
    onClose: () => setOpen(false),
    onSave: v => {
      cfg.create(v);
      setOpen(false);
      onDone && onDone();
    }
  }));
}
function NotifPopover({
  onClose,
  onGo
}) {
  refreshDerived(); // v5: notifications read live AMC/invoice/warranty status
  const items = [...DB.tickets.filter(t => (t.sla_state === 'breached' || t.sla_state === 'at_risk') && t.status !== 'resolved' && t.status !== 'closed').map(t => ({
    tone: 'red',
    text: `${t.number} · ${t.customer.name}`,
    sub: t.issue,
    path: '/tickets'
  })), ...DB.amc.filter(a => a.status === 'expiring').map(a => ({
    tone: 'amber',
    text: `AMC expiring · ${a.customer.name}`,
    sub: `Ends ${date(a.ends_on)}`,
    path: '/amc'
  })), ...DB.invoices.filter(i => i.status === 'overdue').map(i => ({
    tone: 'red',
    text: `Overdue · ${i.customer.name}`,
    sub: `${i.number} · ${inr(i.balance)} due ${date(i.due_date)}`,
    path: '/invoices'
  })), ...DB.products.filter(p => p.reorder_level > 0 && p.stock <= p.reorder_level).map(p => ({
    tone: 'amber',
    text: `Low stock · ${p.name}`,
    sub: `${p.stock} left`,
    path: '/inventory'
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
const NAV = [['Sales', [['', 'grid', 'Dashboard'], ['leads', 'layers', 'CRM / Leads'], ['quotes', 'file', 'Quotations'], ['invoices', 'file', 'Billing & Invoices'], ['outstanding', 'alert', 'Outstanding'], ['customers', 'users', 'Customers']]], ['Operations', [['jobs', 'calendar', 'Installation Jobs'], ['tickets', 'tag', 'Service Tickets'], ['service', 'wrench', 'Service & Repair'], ['amc', 'check', 'AMC Management'], ['equipment', 'shield', 'Equipment Register'], ['credentials', 'key', 'Credential Manager']]], ['Catalog', [['inventory', 'box', 'Inventory'], ['serials', 'box', 'Serial Tracking'], ['warranty', 'shield', 'Warranty'], ['purchasing', 'download', 'Purchase Mgmt']]], ['Insights', [['reports', 'chart', 'Reports'], ['insights', 'sliders', 'AI Insights'], ['team', 'users', 'Team & Owners'], ['settings', 'sliders', 'Settings']]]];
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
  const cur = active ?? loc.pathname.replace('/', '');
  const go = id => {
    nav('/' + id);
    setSbOpen(false);
  };
  const user = JSON.parse(localStorage.getItem('sv_user') || '{}');
  useEffect(() => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      api.get('/search?q=' + encodeURIComponent(q)).then(r => setResults(r.results)).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [q]);
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
      setToken(null);
      localStorage.removeItem('sv_user');
      window.location.replace('./index.html');
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
    placeholder: "Smart search — customers, invoices, serials, tickets…",
    value: q,
    onChange: e => setQ(e.target.value),
    onBlur: () => setTimeout(() => setResults(null), 200)
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
  }), /*#__PURE__*/React.createElement("div", {
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
  const groups = [['customers', 'Customers', () => `/customers`, r => r.name], ['invoices', 'Invoices', () => `/invoices`, r => r.number], ['serials', 'Serials', () => `/serials`, r => r.serial_no], ['tickets', 'Tickets', () => `/tickets`, r => `${r.number} — ${r.issue}`], ['products', 'Products', () => `/inventory`, r => `${r.sku} — ${r.name}`], ['leads', 'Leads', () => `/leads`, r => r.name]];
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
  recFoot
}) {
  const [filter, setFilter] = useState(chips?.[0]?.value ?? null);
  const [rec, setRec] = useState(null);
  const path = endpoint + (filter ? (endpoint.includes('?') ? '&' : '?') + 'filter=' + filter : '');
  const {
    data,
    loading,
    reload
  } = useFetch(path, [path]);
  const rows = Array.isArray(data) ? data : data?.data ?? [];
  const openRow = r => {
    // v5: recFoot lets pages add wired action buttons to the drawer
    if (!rowToRecord) return;
    const base = rowToRecord(r);
    if (recFoot) base.foot = recFoot(r, () => {
      reload();
      setRec(null);
    });
    setRec(base);
  };
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
  }))), chips && /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, chips.map(c => /*#__PURE__*/React.createElement("span", {
    key: c.value ?? 'all',
    className: 'chip' + ((c.value ?? null) === filter ? ' on' : ''),
    onClick: () => setFilter(c.value ?? null)
  }, c.label))), /*#__PURE__*/React.createElement("div", {
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
  }));
}

/* ====================================================================== */
/* ====================  PAGES  ========================================= */
/* ====================================================================== */
/* ====================================================================== */
/* ====================  COMPANY + PACKAGES (from flyer)  =============== */
/* ====================================================================== */
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
  invoiceTerms: 'Thank you for your business. Please make payment by the due date via UPI / NEFT / cheque in favour of Smart Vision Enterprise.'
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
  localStorage.setItem('sv_company', JSON.stringify(COMPANY));
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
  localStorage.setItem('sv_catalog', JSON.stringify(CATALOG));
}
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
function QuoteBuilder({
  title,
  initial,
  editing,
  onClose,
  onSave
}) {
  const [customer, setCustomer] = useState(initial?.customer || '');
  const [scope, setScope] = useState(initial?.scope || '');
  const [items, setItems] = useState(initial?.items?.length ? initial.items.map(i => ({
    description: i.description,
    amount: i.amount || ''
  })) : [{
    description: '',
    amount: ''
  }]);
  const [status, setStatus] = useState(initial?.status || 'draft');
  const [owner, setOwner] = useState(initial?.owner || 'Rohit Sharma');
  const [err, setErr] = useState('');
  const total = items.reduce((a, i) => a + (Number(i.amount) || 0), 0);
  const setItem = (idx, k, v) => setItems(s => s.map((it, i) => i === idx ? {
    ...it,
    [k]: v
  } : it));
  const addLine = () => setItems(s => [...s, {
    description: '',
    amount: ''
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
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      flex: 1
    },
    placeholder: "Description",
    value: it.description,
    onChange: e => setItem(idx, 'description', e.target.value)
  }), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      width: 120
    },
    type: "number",
    placeholder: "Amount ₹",
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
      if (!items.some(i => i.description.trim())) {
        setErr('Add at least one line item.');
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
  const savePlan = v => {
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
    saveCatalog();
    setPlanEdit(null);
    force(n => n + 1);
  };
  const saveQuote = q => {
    const items = q.items.filter(i => i.description).map((i, idx) => ({
      id: idx + 1,
      description: i.description,
      amount: num(i.amount)
    }));
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
        convertQuote(ex);
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
      convertQuote(nq);
    }
    setBuilder(null);
    setRec(null);
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
      }, r.status)], ['Valid till', date(r.valid_till)], ['Owner', r.owner?.name || '—'], ['Scope', r.scope || '—'], ['Total', inr(r.total)], ...(r.converted ? [['Invoice', r.invoice_number || '—'], ['Install job', r.job_number || '—']] : [])]
    })), r.items?.length > 0 && /*#__PURE__*/React.createElement(DwSection, {
      label: "Line items"
    }, /*#__PURE__*/React.createElement("div", {
      className: "dwbox"
    }, r.items.map(it => /*#__PURE__*/React.createElement("div", {
      className: "li",
      key: it.id
    }, /*#__PURE__*/React.createElement("div", {
      className: "lin"
    }, it.description), /*#__PURE__*/React.createElement("span", {
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
      initial: {}
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
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-o",
    style: {
      flex: 1,
      justifyContent: 'center'
    },
    onClick: () => setBuilder({
      title: 'Quote · ' + p.brand + ' ' + p.group,
      initial: {
        scope: p.brand + ' ' + p.group,
        items: [{
          description: p.brand + ' ' + p.group + (g === 'AMC Plan' ? ' — annual contract' : ' — complete package'),
          amount: p.price
        }].concat(p.items.map(d => ({
          description: d,
          amount: 0
        })))
      }
    })
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "plus",
    s: 13,
    sw: 2.2
  }), "Quote this"), /*#__PURE__*/React.createElement("button", {
    className: "act",
    title: "Edit plan",
    onClick: () => setPlanEdit({
      id: p.id,
      group: p.group,
      brand: p.brand,
      price: p.price,
      items: [...p.items]
    })
  }, /*#__PURE__*/React.createElement(Ic, {
    n: "sliders",
    s: 14
  })), /*#__PURE__*/React.createElement("button", {
    className: "act",
    title: "Delete plan",
    style: {
      color: 'var(--red)',
      fontSize: 17,
      lineHeight: 1
    },
    onClick: () => {
      if (confirm(`Delete the ${p.brand} ${p.group} plan?`)) {
        const i = CATALOG.findIndex(x => x.id === p.id);
        if (i >= 0) CATALOG.splice(i, 1);
        saveCatalog();
        force(n => n + 1);
      }
    }
  }, "×"))))), showExtras && /*#__PURE__*/React.createElement("div", {
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
    key: builder.title,
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
  const whatsapp = r => {
    const message = `Hello ${r.customer?.name || ''},\n\nGentle reminder for invoice ${r.number}.\nTotal: ${inr(r.total)} · Received: ${inr(r.paid)} · Balance due: ${inr(r.balance)} (due ${date(r.due_date)}).\n\nRegards,\n${COMPANY.name}\n${COMPANY.phone}`;
    waOpen(r.customer?.name, message, {
      kind: 'invoice',
      doc: r
    });
  };
  const recordPayment = vals => {
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
    setPayFor(null);
    reload();
    reloadStats();
  };
  const open = r => setRec({
    title: r.number,
    subtitle: r.customer?.name,
    icon: 'file',
    body: /*#__PURE__*/React.createElement(DwSection, {
      label: "Invoice"
    }, /*#__PURE__*/React.createElement(DwBox, {
      rows: [['Status', /*#__PURE__*/React.createElement(Pill, {
        t: INV_TONE[r.status],
        dot: true
      }, r.status)], ['Issued', date(r.issue_date)], ['Due', date(r.due_date)], ['Total', inr(r.total)], ['Received', inr(r.paid)], ['Balance', inr(r.balance)]]
    })),
    foot: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
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
  return /*#__PURE__*/React.createElement(Shell, {
    active: "invoices"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "Billing & Invoices"
  }, /*#__PURE__*/React.createElement(CreateButton, {
    entity: "invoice",
    onDone: () => {
      reload();
      reloadStats();
    }
  })), stats && /*#__PURE__*/React.createElement(StatRow, null, /*#__PURE__*/React.createElement(Stat, {
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
const CUST_TYPE = {
  Residential: 'blue',
  Commercial: 'violet',
  Industrial: 'amber'
};
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
      tag: REP_STATUS[r.status][0]
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
  const saveCustomer = v => {
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
    if (newName !== c.name) cascadeCustomerRename(c.name, newName); // v5: rename flows to every module
    Object.assign(c, {
      name: newName,
      area: v.area,
      type: v.type,
      contact_name: v.contact_name,
      phone: v.phone,
      sites: num(v.sites) || 1,
      owner: O(v.owner || c.owner?.name || teamNames()[0])
    });
    setEditCust(null);
    setRec(null);
    reload();
  };
  const deleteCustomer = r => {
    const links = customerLinkCount(r.name);
    if (links > 0) {
      alert(`Cannot delete "${r.name}" — ${links} linked record(s) exist (quotes, invoices, jobs, tickets, AMC, equipment or repairs). Keep the customer for history.`);
      return;
    }
    if (!confirm(`Delete customer "${r.name}"? Their saved device credentials will also be removed.`)) return;
    const i = DB.customers.findIndex(x => x.id === r.id);
    if (i >= 0) DB.customers.splice(i, 1);
    for (let k = DB.credentials.length - 1; k >= 0; k--) if (DB.credentials[k].customer?.name === r.name) DB.credentials.splice(k, 1);
    setRec(null);
    reload();
  };
  const grantFreeAmc = name => {
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
    reload();
    openCustomer(findCust(name), true);
  };
  const openCustomer = (r, keepTab) => {
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
  const rows = data?.data ?? [];
  const setTicketStatus = (r, status) => {
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
    foot: /*#__PURE__*/React.createElement(React.Fragment, null, r.status === 'open' && /*#__PURE__*/React.createElement("button", {
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
function Inventory() {
  const adjust = (r, done) => {
    const v = prompt(`Adjust stock for ${r.name}\nCurrent: ${r.stock}\nEnter change (e.g. 10 = stock in, -3 = stock out):`, '');
    if (v === null) return;
    const d = parseInt(v, 10);
    if (isNaN(d) || d === 0) return;
    const p = DB.products.find(x => x.id === r.id);
    if (p) p.stock = Math.max(0, num(p.stock) + d);
    done();
  };
  return /*#__PURE__*/React.createElement(TablePage, {
    active: "inventory",
    title: "Inventory",
    sub: "Products & stock",
    endpoint: "/products",
    entity: "product",
    recFoot: (r, done) => /*#__PURE__*/React.createElement("button", {
      className: "btn-p",
      style: {
        flex: 1,
        justifyContent: 'center'
      },
      onClick: () => adjust(r, done)
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "sliders",
      s: 14
    }), "Adjust Stock (in / out)"),
    chips: [{
      label: 'All'
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
  });
}
const SER_TONE = {
  in_stock: 'gray',
  sold: 'blue',
  installed: 'green',
  rma: 'amber',
  returned: 'red'
};
function Serials() {
  return /*#__PURE__*/React.createElement(TablePage, {
    active: "serials",
    title: "Serial Tracking",
    sub: "Per-unit serial register",
    endpoint: "/serials",
    entity: "serial",
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
  });
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
  outstanding: 'alert'
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
  const save = v => {
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
    persistState();
    setEdit(null);
    refresh();
  };
  const remove = t => {
    if (TEAM.length <= 1) {
      alert('At least one team member is required.');
      return;
    }
    if (!confirm(`Remove ${t.name} from the team? Their jobs/tickets become unassigned and their accounts move to another owner.`)) return;
    cascadeTeamRemove(t.name); // v5: no dangling references
    const i = TEAM.findIndex(x => x.id === t.id);
    if (i >= 0) TEAM.splice(i, 1);
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
  const apply = () => {
    saveCompany(f);
    setSaved(true);
  };
  const reset = () => {
    localStorage.removeItem('sv_company');
    Object.assign(COMPANY, COMPANY_DEFAULT);
    setF({
      ...COMPANY_DEFAULT
    });
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
function Settings() {
  const fileRef = useRef();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const exportCsv = async () => {
    setBusy(true);
    setMsg('');
    try {
      await flushToServer();
      let csvText = '';
      try {
        const res = await fetch('./backup/export?t=' + Date.now());
        if (res.ok) csvText = await res.text();
      } catch (e) {/* use in-memory fallback */}
      if (countCsvRecords(csvText) < 1) {
        const blob = await buildBackupCsvBlob();
        csvText = await blob.text();
      }
      const rows = countCsvRecords(csvText);
      if (rows < 1) {
        setMsg('Nothing to export — add data first.');
        return;
      }
      downloadBackupCsv(csvText, 'cctv-erp-backup-' + new Date().toISOString().slice(0, 10) + '.csv');
      setMsg(`Backup downloaded (${rows} records).`);
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
      let restored = null;
      try {
        const res = await fetch('./backup/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/csv;charset=utf-8'
          },
          body: text
        });
        const r = await res.json();
        if (res.ok && r.restored) restored = r.restored;
      } catch (err) {/* fallback below */}
      if (!restored) restored = importBackupCsv(text);
      const total = Object.values(restored).reduce((a, b) => a + b, 0);
      setMsg(`Restored ${total} records across ${Object.keys(restored).length} tables. Reloading…`);
      setTimeout(() => window.location.reload(), 600);
    } catch {
      setMsg('Restore failed — check the file format.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  return /*#__PURE__*/React.createElement(Shell, {
    active: "settings"
  }, /*#__PURE__*/React.createElement(PageHead, {
    title: "Settings",
    sub: "Workspace · Smart Vision Enterprise, Borsad"
  }), /*#__PURE__*/React.createElement(CompanyEditor, null), /*#__PURE__*/React.createElement("div", {
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
  }, "Export downloads a single CSV containing all customers, leads, quotes, invoices, payments, inventory, serials, jobs, tickets, AMC contracts, equipment and credentials. Restore replaces the live database with a previously exported file — useful for migrating between hosts or recovering after an offline period."), /*#__PURE__*/React.createElement("div", {
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
  })), msg && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 700,
      color: 'var(--a-ink)'
    }
  }, msg))));
}

/* ---------------- router ---------------- */
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
    const message = `Hello ${r.customer?.name || ''},\n\nUpdate on your repair ${r.number} — ${r.device}.\nStatus: ${REP_STATUS[r.status][0]}${r.charge ? ', estimate ' + inr(r.charge) : ''}.\n\nRegards,\n${COMPANY.name}\n${COMPANY.phone}`;
    const doc = r.charge ? repairDoc(r, 'quote') : null;
    waOpen(r.customer?.name, message, doc ? {
      kind: 'quote',
      doc
    } : undefined);
  };
  const advance = r => {
    const order = ['received', 'diagnosing', 'repairing', 'ready', 'delivered'];
    const t = DB.repairs.find(x => x.id === r.id);
    if (t) {
      const i = order.indexOf(t.status);
      if (i < order.length - 1) t.status = order[i + 1];
      // v5: delivered + chargeable (paid coverage) → bill it into Invoices once
      if (t.status === 'delivered' && t.coverage === 'paid' && num(t.charge) > 0 && !t.invoice_number) {
        const inv = createInvoice({
          customer: t.customer.name,
          total: t.charge,
          dueDays: 7,
          items: [{
            id: 1,
            description: `Repair ${t.number} — ${t.device}${t.serial_no ? ' (' + t.serial_no + ')' : ''}`,
            amount: t.charge
          }],
          note: 'From ' + t.number
        });
        t.invoice_number = inv.number;
      }
    }
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
        t: REP_STATUS[r.status][1],
        dot: true
      }, REP_STATUS[r.status][0])]]
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
    t: REP_STATUS[r.status][1],
    dot: true
  }, REP_STATUS[r.status][0])))))))), /*#__PURE__*/React.createElement(Drawer, {
    rec: rec,
    onClose: () => setRec(null)
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
  const path = pathname.replace(/^\//, '');
  const Cmp = ROUTE_MAP[path] || Dashboard;
  return /*#__PURE__*/React.createElement(Cmp, null);
}
window.SmartVisionApp = SmartVisionApp;