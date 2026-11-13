// ETU FIELD VISIT v7.6 (bottom nav, new dashboard, step-by-step visit, ETU field visit, ranked priorities, tidy pages, profit in RM mil, region/SOU in Estates, reads full estate report workbook, region/SOU lookup, fields, upload, photos, settings)
// Site visits + 10 activity triggers + follow-up actions
// + 12 cost elements + estate profit
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
  ActivityIndicator,
  Share,
  Modal,
  Image,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as XLSX from 'xlsx';
import Svg, {
  Path,
  G,
  Rect,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import {
  useFonts,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import {
  PublicSans_400Regular,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
} from '@expo-google-fonts/public-sans';

// ===== COLOURS (same palette as ETU Field Visit) =====
const C = {
  bg: '#F4F2EA',
  surface: '#FFFDF8',
  sunk: '#EBE7DA',
  ink: '#1B241B',
  muted: '#4F564A',
  line: '#D6D1BF',
  accent: '#335F3B',
  accentSoft: '#E3EADB',
  brand: '#2C5534',
  gold: '#A8812C',
  goldSoft: '#F3E9CF',
  att: '#B4533C',
  attBg: '#F5E4DC',
  rnd: '#4A7391',
  rndBg: '#E2EBF1',
  mon: '#A8741F',
  monBg: '#F5EAD2',
  good: '#4F7D3C',
  goodBg: '#E4EEDB',
  amber: '#D9A43A',
  sky1: '#D6E8F1',
  sky2: '#F3F0E2',
  skyTop: '#E8F0EE',
  hill: '#D3DCC0',
  soil: '#BCD29A',
  soil2: '#A3C07F',
  road: '#E2D5B2',
};
const PALM = ['', '#A9BB92', '#7A9466', '#4C6C45'];

// ===== FONTS =====
const F = {
  display: 'BarlowCondensed_600SemiBold',
  displayBold: 'BarlowCondensed_700Bold',
  body: 'PublicSans_400Regular',
  semi: 'PublicSans_600SemiBold',
  bold: 'PublicSans_700Bold',
};

// Text that always uses the body font
function T({ style, ...props }) {
  return <Text style={[styles.body, style]} {...props} />;
}

// ===== HELPER: state that saves itself =====
function useSavedState(key, startValue) {
  const [value, setValue] = useState(startValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key).then((saved) => {
      if (saved) setValue(JSON.parse(saved));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(key, JSON.stringify(value));
    }
  }, [value, loaded]);

  return [value, setValue];
}

// ===== HELPERS: dates =====
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toKey(d) {
  return (
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

function today() {
  return toKey(new Date());
}

function addDays(key, n) {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toKey(d);
}

function showDate(key) {
  if (!key || key.length < 10) return key || '-';
  const p = key.split('-');
  return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
}

function newId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 5);
}

// ===== OIL PALM PLANTATION SCENE =====
function n1(v) {
  return v.toFixed(1);
}

function palm(x, by, h, k, lean) {
  const cx = x + lean;
  const cy = by - h;
  const r = h * 0.55;
  const tw = Math.max(1.2, h * 0.07);
  const D = [
    [-1, -0.15], [-0.85, 0.3], [-0.5, -0.55],
    [-0.1, -0.8], [0.35, -0.65], [0.8, 0.25],
    [1, -0.1], [-0.55, 0.55], [0.55, 0.55],
  ];
  let f = '';
  D.forEach(([dx, dy]) => {
    const L = Math.hypot(dx, dy);
    const ux = dx / L;
    const uy = dy / L;
    const tx = cx + ux * r;
    const ty = cy + uy * r + r * 0.28;
    const mx = (cx + tx) / 2;
    const my = (cy + ty) / 2 - r * 0.12;
    const w = r * 0.13;
    f +=
      'M' + n1(cx) + ' ' + n1(cy) +
      'Q' + n1(mx - uy * w) + ' ' + n1(my + ux * w) +
      ' ' + n1(tx) + ' ' + n1(ty) +
      'Q' + n1(mx + uy * w) + ' ' + n1(my - ux * w) +
      ' ' + n1(cx) + ' ' + n1(cy) + 'Z';
  });
  const trunk =
    'M' + x + ' ' + by +
    'Q' + n1(x + lean * 0.3) + ' ' + n1(by - h * 0.5) +
    ' ' + n1(cx) + ' ' + n1(cy);
  return { trunk: trunk, fronds: f, k: k, tw: tw };
}

const BACK_PALMS = [];
for (let x = -6; x < 410; x += 23) {
  BACK_PALMS.push(palm(x, 92 + ((x / 23) % 2) * 2, 26, 1, ((x * 7) % 5) - 2));
}
const MID_PALMS = [];
for (let x = 10; x < 410; x += 46) {
  MID_PALMS.push(palm(x, 110, 44, 2, ((x * 3) % 7) - 3));
}
const FRONT_PALMS = [palm(4, 134, 58, 3, 6), palm(396, 134, 54, 3, -6)];

function PalmGroup({ list }) {
  return list.map((p, i) => (
    <G key={i}>
      <Path
        d={p.trunk}
        stroke={PALM[p.k]}
        strokeWidth={p.tw}
        fill="none"
        strokeLinecap="round"
      />
      <Path d={p.fronds} fill={PALM[p.k]} />
    </G>
  ));
}

function Scene({ height }) {
  return (
    <Svg
      width="100%"
      height={height}
      viewBox="0 0 400 130"
      preserveAspectRatio="xMidYMax slice"
      style={styles.scene}>
      <Path
        d="M0 78 Q70 52 150 70 T300 62 T400 70 V130 H0z"
        fill={C.hill}
      />
      <PalmGroup list={BACK_PALMS} />
      <Path d="M0 96 Q200 88 400 96 V130 H0z" fill={C.soil} />
      <PalmGroup list={MID_PALMS} />
      <Path d="M0 112 Q200 106 400 112 V130 H0z" fill={C.soil2} />
      <Path d="M150 130 L196 108 L204 108 L250 130z" fill={C.road} />
      <PalmGroup list={FRONT_PALMS} />
    </Svg>
  );
}

// =====================================================
// THE 10 CORE ACTIVITIES + THEIR TRIGGERS
// op '>' bigger is worse, '<' smaller is worse,
// 'yes' = confirmed case is always Action.
// Change the numbers to match your SOP.
// =====================================================
const ACTIVITIES = [
  {
    id: 1, name: 'Harvesting & Evacuation', icon: 'leaf',
    rules: [
      { id: 'h_int', name: 'Harvesting interval', unit: 'days', op: '>', amber: 10, red: 12 },
      { id: 'h_ffb', name: 'FFB awaiting evacuation', unit: 'hrs', op: '>', amber: 12, red: 24 },
      { id: 'h_task', name: 'Daily task achieved', unit: '%', op: '<', amber: 80, red: 50 },
    ],
  },
  {
    id: 2, name: 'Harvesting Quality & Recovery', icon: 'ribbon',
    rules: [
      { id: 'q_ripe', name: 'Ripe bunches unharvested', unit: 'bunch/ha', op: '>', amber: 1, red: 3 },
      { id: 'q_loose', name: 'Loose fruit left behind', unit: 'kg/ha', op: '>', amber: 2, red: 5 },
      { id: 'q_stalk', name: 'Long stalk > 5 cm', unit: '%', op: '>', amber: 5, red: 10 },
    ],
  },
  {
    id: 3, name: 'Manpower & Productivity', icon: 'people',
    rules: [
      { id: 'm_out', name: 'Output vs baseline', unit: '%', op: '<', amber: 90, red: 80 },
      { id: 'm_abs', name: 'Absenteeism', unit: '%', op: '>', amber: 10, red: 15 },
    ],
  },
  {
    id: 4, name: 'Field Upkeep', icon: 'construct',
    rules: [
      { id: 'u_cov', name: 'Daily ha coverage vs target', unit: '%', op: '<', amber: 90, red: 75 },
      { id: 'u_untr', name: 'Untreated / missed strips', unit: 'ha', op: '>', amber: 0, red: 2 },
      { id: 'u_late', name: 'Scheduled work late', unit: 'days', op: '>', amber: 1, red: 3 },
    ],
  },
  {
    id: 5, name: 'Fertilizer', icon: 'flask',
    rules: [
      { id: 'f_var', name: 'Application rate variance', unit: '%', op: '>', amber: 10, red: 15 },
      { id: 'f_late', name: 'Manuring programme overdue', unit: 'days', op: '>', amber: 7, red: 14 },
    ],
  },
  {
    id: 6, name: 'Pest, Disease & Palm Health', icon: 'bug',
    rules: [
      { id: 'p_gano', name: 'Ganoderma confirmed', unit: '', op: 'yes' },
      { id: 'p_yel', name: 'Yellowing index', unit: '%', op: '>', amber: 10, red: 15 },
      { id: 'p_rat', name: 'Fresh rat damage', unit: '%', op: '>', amber: 3, red: 5 },
    ],
  },
  {
    id: 7, name: 'Water & Soil', icon: 'water',
    rules: [
      { id: 'w_log', name: 'Waterlogged area', unit: 'ha', op: '>', amber: 0, red: 2 },
      { id: 'w_drain', name: 'Drain flow restriction', unit: '%', op: '>', amber: 25, red: 60 },
    ],
  },
  {
    id: 8, name: 'Roads & Accessibility', icon: 'map',
    rules: [
      { id: 'r_imp', name: 'Path / road impassable', unit: '', op: 'yes' },
      { id: 'r_bridge', name: 'Bridge / culvert risk', unit: '/10', op: '>', amber: 5, red: 7 },
    ],
  },
  {
    id: 9, name: 'Transport & Machinery', icon: 'car',
    rules: [
      { id: 'l_brk', name: 'Breakdown delay', unit: 'hrs', op: '>', amber: 0.5, red: 2 },
      { id: 'l_pend', name: 'FFB pending, no lorry', unit: 'tonnes', op: '>', amber: 5, red: 15 },
    ],
  },
  {
    id: 10, name: 'Field Compliance', icon: 'shield-checkmark',
    rules: [
      { id: 'c_std', name: 'Field standard not met', unit: '', op: 'yes' },
      { id: 'c_behind', name: 'Work behind schedule', unit: '%', op: '>', amber: 15, red: 30 },
    ],
  },
];

// Remember the default trigger numbers
const DEFAULT_RULES = {};
ACTIVITIES.forEach((a) =>
  a.rules.forEach((r) => {
    DEFAULT_RULES[r.id] = { red: r.red, amber: r.amber };
  })
);

// Put the numbers from Settings into the rules
function applySettings(st) {
  const s = st || {};
  LIMITS.cost = num(s.cost) !== null ? num(s.cost) : DEFAULT_LIMITS.cost;
  LIMITS.yieldRed = num(s.yieldRed) !== null ? num(s.yieldRed) : DEFAULT_LIMITS.yieldRed;
  LIMITS.yieldAmber = num(s.yieldAmber) !== null ? num(s.yieldAmber) : DEFAULT_LIMITS.yieldAmber;
  ACTIVITIES.forEach((a) =>
    a.rules.forEach((r) => {
      const o = (s.rules || {})[r.id] || {};
      r.red = num(o.red) !== null ? num(o.red) : DEFAULT_RULES[r.id].red;
      r.amber = num(o.amber) !== null ? num(o.amber) : DEFAULT_RULES[r.id].amber;
    })
  );
}

function actOf(id) {
  return ACTIVITIES.find((a) => a.id === Number(id)) || ACTIVITIES[0];
}

function no2(id) {
  return String(id).padStart(2, '0');
}

// ===== THE 12 COST ELEMENTS (RM/ha YTD) =====
const COSTS = [
  'Harvesting & Collection',
  'Transport',
  'Manuring',
  'Weeding',
  'Sanitation & Pruning',
  'Pest & Disease',
  'Water & Soil Conservation',
  'Other Upkeep',
  'Estate Admin',
  'Labour Overheads',
  'Roads & Bridges',
  'Depreciation',
];
// Default limits (can be changed in Settings)
const LIMITS = { cost: 10, yieldRed: -10, yieldAmber: -5 };
const DEFAULT_LIMITS = { ...LIMITS };

// ===== STATUS =====
const STATUS = {
  good: { label: 'Good', tone: 'good', icon: 'checkmark-circle' },
  monitor: { label: 'Monitor', tone: 'mon', icon: 'warning' },
  action: { label: 'Action', tone: 'att', icon: 'alert-circle' },
};
const RANK = { good: 0, monitor: 1, action: 2 };

// ===== TRIGGER: one reading -> good / monitor / action =====
function evaluate(rule, raw) {
  if (rule.op === 'yes') {
    if (raw === 'yes') return 'action';
    if (raw === 'no') return 'good';
    return null;
  }
  const v = parseFloat(raw);
  if (isNaN(v)) return null;
  if (rule.op === '>') {
    if (v > rule.red) return 'action';
    if (v > rule.amber) return 'monitor';
    return 'good';
  }
  if (v < rule.red) return 'action';
  if (v < rule.amber) return 'monitor';
  return 'good';
}

function limitText(rule) {
  if (rule.op === 'yes') return 'Yes = Action';
  return 'Action ' + rule.op + ' ' + rule.red + ' · Monitor ' + rule.op + ' ' + rule.amber;
}


// ===== FIELD YIELD TRIGGER (YTD mt/ha vs budget) =====
// (yield limits are in LIMITS above)

// ===== ONE FIELD'S CHECK IN A VISIT =====
function checkOf(visit, fieldId) {
  return (visit.checks || {})[fieldId] || { readings: {}, manual: {}, notes: {} };
}

// Worst result of the readings for one activity
function autoStatus(check, act) {
  let worst = null;
  act.rules.forEach((r) => {
    const st = evaluate(r, (check.readings || {})[r.id]);
    if (st && (worst === null || RANK[st] > RANK[worst])) worst = st;
  });
  return worst;
}

// Your own choice wins; otherwise the auto trigger
function actStatus(check, act) {
  return (check.manual || {})[act.id] || autoStatus(check, act);
}

// Every (field, activity) result in a visit
function findings(visit) {
  const out = [];
  (visit.fieldIds || []).forEach((fid) => {
    const ck = checkOf(visit, fid);
    ACTIVITIES.forEach((act) => {
      const st = actStatus(ck, act);
      if (st) out.push({ fieldId: fid, act: act, st: st, note: (ck.notes || {})[act.id] || '' });
    });
  });
  return out;
}

function countIn(list, st) {
  return list.filter((x) => x.st === st).length;
}

// ===== NUMBERS =====
function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function variance(act, bgt) {
  const a = num(act);
  const b = num(bgt);
  if (a === null || b === null || b === 0) return null;
  return ((a - b) / b) * 100;
}

function pctText(v) {
  if (v === null || v === undefined) return '-';
  return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
}

// RM'000 -> "RM 16.26 mil"
function rmMil(v) {
  const n = num(v);
  if (n === null) return '-';
  const s = (n / 1000).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return 'RM ' + s + ' mil';
}

function money(v) {
  const n = num(v);
  return n === null ? '-' : Math.round(n).toLocaleString('en-MY');
}

// ===== FIELD HELPERS =====
function yieldVar(f) {
  return variance(f.ypAct, f.ypBgt);
}

function yieldStatus(f) {
  const v = yieldVar(f);
  if (v === null) return null;
  if (v < LIMITS.yieldRed) return 'action';
  if (v < LIMITS.yieldAmber) return 'monitor';
  return 'good';
}

function costOf(obj, i) {
  return (obj.costs || {})[i] || {};
}

function costAlerts(obj) {
  return COSTS.filter((n, i) => {
    const v = variance(costOf(obj, i).act, costOf(obj, i).bgt);
    return v !== null && v > LIMITS.cost;
  });
}

// Estate cost = field costs weighted by mature ha
function estateCost(fields) {
  const costs = {};
  COSTS.forEach((n, i) => {
    let a = 0;
    let ah = 0;
    let b = 0;
    let bh = 0;
    fields.forEach((f) => {
      const ha = num(f.ha) || 0;
      const c = costOf(f, i);
      if (num(c.act) !== null && ha) {
        a += num(c.act) * ha;
        ah += ha;
      }
      if (num(c.bgt) !== null && ha) {
        b += num(c.bgt) * ha;
        bh += ha;
      }
    });
    costs[i] = {
      act: ah ? String(a / ah) : '',
      bgt: bh ? String(b / bh) : '',
    };
  });
  return { costs: costs };
}

// Estate yield = weighted by mature ha
function estateYield(fields) {
  let a = 0;
  let b = 0;
  let h = 0;
  fields.forEach((f) => {
    const ha = num(f.ha) || 0;
    if (num(f.ypAct) !== null && num(f.ypBgt) !== null && ha) {
      a += num(f.ypAct) * ha;
      b += num(f.ypBgt) * ha;
      h += ha;
    }
  });
  if (!h) return null;
  return { act: a / h, bgt: b / h, v: ((a - b) / b) * 100, ha: h };
}

function profitVar(estate) {
  return variance(estate.profitAct, estate.profitBgt);
}

function latestVisit(visits, estateId) {
  return visits
    .filter((v) => v.estateId === estateId)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

// Latest visit that included this field
function latestFieldVisit(visits, fieldId) {
  return visits
    .filter((v) => (v.fieldIds || []).includes(fieldId))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

// ===== FOLLOW-UP ACTIONS =====
function isOverdue(a) {
  return a.status !== 'done' && a.due && a.due < today();
}

// ===== WHATSAPP / EMAIL VISIT REPORT =====
function visitReport(visit, estate, fields, actions) {
  const fcode = (id) => (id ? (fields.find((f) => f.id === id) || {}).code || '?' : 'Estate');
  const all = findings(visit);
  const lines = [
    'ETU FIELD VISIT REPORT',
    estate.name + ' · ' + showDate(visit.date),
    'Fields: ' + (visit.fieldIds || []).map(fcode).join(', '),
    '',
    'Action: ' + countIn(all, 'action') +
      ' | Monitor: ' + countIn(all, 'monitor') +
      ' | Good: ' + countIn(all, 'good'),
  ];
  (visit.fieldIds || []).forEach((fid) => {
    const f = fields.find((x) => x.id === fid) || {};
    const ck = checkOf(visit, fid);
    lines.push('', 'FIELD ' + (f.code || '?') +
      (f.ypAct ? '  (yield ' + f.ypAct + ' vs ' + (f.ypBgt || '-') + ' mt/ha, ' + pctText(yieldVar(f)) + ')' : ''));
    ACTIVITIES.forEach((a) => {
      const st = actStatus(ck, a);
      if (!st || st === 'good') return;
      lines.push(no2(a.id) + '. ' + a.name + ': ' + STATUS[st].label.toUpperCase());
      a.rules.forEach((r) => {
        const raw = (ck.readings || {})[r.id];
        if (raw) lines.push('   - ' + r.name + ': ' + raw + (r.unit ? ' ' + r.unit : ''));
      });
      const note = (ck.notes || {})[a.id];
      if (note) lines.push('   Note: ' + note);
      const ph = ((ck.photos || {})[a.id] || []).length;
      if (ph) lines.push('   Photos: ' + ph + ' (in the app)');
    });
    const good = ACTIVITIES.filter((a) => actStatus(ck, a) === 'good').length;
    if (good) lines.push('Good: ' + good + ' activities');
  });
  const mine = actions.filter((x) => x.visitId === visit.id);
  if (mine.length) {
    lines.push('', 'FOLLOW-UP ACTIONS');
    mine.forEach((x) => {
      lines.push(
        '- [' + fcode(x.fieldId) + '] ' + x.text + ' (PIC: ' + (x.pic || '-') +
          ', due ' + showDate(x.due) + ', ' + (x.status === 'done' ? 'DONE' : 'OPEN') + ')'
      );
    });
  }
  const est = fields.filter((f) => f.estateId === estate.id);
  const ca = costAlerts(estateCost(est));
  lines.push('', 'COST & PROFIT');
  lines.push('Estate cost over budget (>' + LIMITS.cost + '%): ' + (ca.length ? ca.join(', ') : 'None'));
  lines.push('Profit vs budget: ' + pctText(profitVar(estate)));
  return lines.join('\n');
}

// =====================================================
// UPLOAD: read estate data from Excel / CSV / pasted text
// One row per field. The app finds the columns by name.
// =====================================================
function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Column names the app understands (any of these spellings)
const COLS = {
  region: ['region', 'wilayah', 'regionname'],
  sou: ['sou', 'souname', 'operatingunit', 'strategicoperatingunit', 'unit'],
  estate: ['estate', 'estatename', 'kebun', 'ladang'],
  code: ['field', 'fieldcode', 'fieldno', 'block', 'blok', 'blockno', 'peringkat'],
  year: ['planted', 'plantedyear', 'yearplanted', 'py', 'plantingyear', 'yop', 'tahuntanam'],
  ha: ['matureha', 'ha', 'hectare', 'hectarage', 'area', 'maturearea', 'mature'],
  ypAct: ['yieldact', 'yieldactual', 'actualyield', 'yphact', 'yield', 'ytdyield', 'yieldytd'],
  ypBgt: ['yieldbgt', 'yieldbudget', 'budgetyield', 'yphbgt'],
  ypLy: ['yieldly', 'yieldlastyear', 'lyyield', 'yphly'],
  profitAct: ['profitact', 'profitactual', 'actualprofit', 'profit'],
  profitBgt: ['profitbgt', 'profitbudget', 'budgetprofit'],
};
const COL_LABEL = {
  region: 'Region', sou: 'SOU', estate: 'Estate', code: 'Field', year: 'Planted', ha: 'Mature ha',
  ypAct: 'Yield Act', ypBgt: 'Yield Bgt', ypLy: 'Yield LY',
  profitAct: 'Profit Act', profitBgt: 'Profit Bgt',
};

// Short names for the 12 cost elements (same order as COSTS)
const COST_ALIASES = [
  ['harvestingcollection', 'harvesting', 'harvcoll', 'harvest'],
  ['transport', 'ffbtransport', 'ffbtrans'],
  ['manuring', 'fertilizer', 'fertiliser', 'manure'],
  ['weeding'],
  ['sanitationpruning', 'sanitation', 'pruning'],
  ['pestdisease', 'pestanddisease', 'pd', 'pnd', 'pest'],
  ['watersoilconservation', 'watermanagement', 'water', 'soilconservation', 'soil'],
  ['otherupkeep', 'upkeep', 'matureupkeep'],
  ['estateadmin', 'admin', 'adminpaidbyho', 'generalcharges', 'general'],
  ['labouroverheads', 'labour', 'laboroverheads'],
  ['roadsbridges', 'roadsandbridges', 'roads', 'road', 'roadmaintenance'],
  ['depreciation', 'estatedepreciation'],
];
const ACT_WORDS = ['act', 'actual', 'a'];
const BGT_WORDS = ['bgt', 'budget', 'b'];

// Which column number holds each value
function matchColumns(header) {
  const map = { costs: {} };
  const used = {};
  header.forEach((h, i) => {
    const n = norm(h);
    if (!n) return;
    Object.keys(COLS).forEach((k) => {
      if (map[k] === undefined && COLS[k].includes(n)) {
        map[k] = i;
        used[i] = COL_LABEL[k];
      }
    });
    if (used[i]) return;
    COST_ALIASES.forEach((aliases, ci) => {
      aliases.forEach((al) => {
        ACT_WORDS.forEach((w) => {
          if (n === al + w || n === w + al) {
            map.costs[ci] = { ...(map.costs[ci] || {}), act: i };
            used[i] = COSTS[ci] + ' Act';
          }
        });
        BGT_WORDS.forEach((w) => {
          if (n === al + w || n === w + al) {
            map.costs[ci] = { ...(map.costs[ci] || {}), bgt: i };
            used[i] = COSTS[ci] + ' Bgt';
          }
        });
      });
    });
  });
  const ignored = header.filter((h, i) => norm(h) && !used[i]);
  return { map: map, found: Object.values(used), ignored: ignored };
}

// Text copied from Excel (tabs) or CSV (commas) -> rows
function textToRows(text) {
  const lines = String(text || '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const tab = lines[0].includes('\t');
  return lines.map((line) => {
    if (tab) return line.split('\t');
    const out = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out;
  });
}

// "1,234.5" or "RM 1,234" -> "1234.5"; blank stays blank
function cleanNum(v) {
  const s = String(v === undefined || v === null ? '' : v).replace(/[^0-9.\-]/g, '');
  return s === '' || s === '-' || s === '.' ? '' : s;
}

// Rows -> preview of what will be imported
function readRows(rows) {
  let hi = -1;
  let m = null;
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const t = matchColumns(rows[i]);
    if (t.map.estate !== undefined && t.map.code !== undefined) {
      hi = i;
      m = t;
      break;
    }
  }
  if (hi < 0) {
    // Show what the app did see, to help fix the file
    const firstRow = rows.find((r) => (r || []).some((c) => String(c || '').trim())) || [];
    const seen = firstRow.map((c) => String(c || '').trim()).filter((c) => c).slice(0, 8);
    return {
      error:
        'Could not find the header row. It needs at least an "Estate" and a "Field" column.' +
        (seen.length ? '\nFirst row seen: ' + seen.join(' | ') : '\nNo data was found.'),
      seen: seen,
    };
  }
  const get = (r, i) => (i === undefined ? '' : String(r[i] === undefined ? '' : r[i]).trim());
  const out = [];
  let skipped = 0;
  rows.slice(hi + 1).forEach((r) => {
    const estate = get(r, m.map.estate);
    const code = get(r, m.map.code).toUpperCase();
    if (!estate || !code) {
      if (r.some((c) => String(c || '').trim())) skipped++;
      return;
    }
    const costs = {};
    Object.keys(m.map.costs).forEach((ci) => {
      costs[ci] = {
        act: cleanNum(get(r, m.map.costs[ci].act)),
        bgt: cleanNum(get(r, m.map.costs[ci].bgt)),
      };
    });
    out.push({
      region: get(r, m.map.region),
      sou: get(r, m.map.sou),
      estate: estate,
      code: code,
      year: cleanNum(get(r, m.map.year)),
      ha: cleanNum(get(r, m.map.ha)),
      ypAct: cleanNum(get(r, m.map.ypAct)),
      ypBgt: cleanNum(get(r, m.map.ypBgt)),
      ypLy: cleanNum(get(r, m.map.ypLy)),
      profitAct: cleanNum(get(r, m.map.profitAct)),
      profitBgt: cleanNum(get(r, m.map.profitBgt)),
      costs: costs,
    });
  });
  return { rows: out, found: m.found, ignored: m.ignored, skipped: skipped };
}

// Merge rows into saved estates & fields (match by name / code)
// replace = true: remove estates & fields that are not in the file
function applyImport(rows, estates, fields, replace) {
  const es = estates.map((e) => ({ ...e }));
  const fs = fields.map((f) => ({ ...f, costs: { ...(f.costs || {}) } }));
  let newE = 0;
  let newF = 0;
  let updF = 0;
  const keep = (oldV, newV) => (newV === '' || newV === undefined ? oldV : newV);
  const seenE = {};
  const seenF = {};
  rows.forEach((r) => {
    let e = es.find((x) => norm(x.name) === norm(r.estate));
    if (!e) {
      e = { id: newId(), name: r.estate, region: '', sou: '', profitAct: '', profitBgt: '' };
      es.push(e);
      newE++;
    }
    seenE[e.id] = true;
    e.region = keep(e.region, r.region);
    e.sou = keep(e.sou, r.sou);
    e.profitAct = keep(e.profitAct, r.profitAct);
    e.profitBgt = keep(e.profitBgt, r.profitBgt);
    let f = fs.find((x) => x.estateId === e.id && x.code === r.code);
    if (!f) {
      f = { id: newId(), estateId: e.id, code: r.code, year: '', ha: '', ypAct: '', ypBgt: '', ypLy: '', costs: {} };
      fs.push(f);
      newF++;
    } else {
      updF++;
    }
    seenF[f.id] = true;
    ['year', 'ha', 'ypAct', 'ypBgt', 'ypLy'].forEach((k) => {
      f[k] = keep(f[k], r[k]);
    });
    Object.keys(r.costs).forEach((ci) => {
      const old = f.costs[ci] || {};
      f.costs[ci] = {
        act: keep(old.act, r.costs[ci].act),
        bgt: keep(old.bgt, r.costs[ci].bgt),
      };
    });
  });
  if (replace) {
    const keptE = es.filter((e) => seenE[e.id]);
    const keptF = fs.filter((f) => seenF[f.id]);
    return {
      estates: keptE, fields: keptF, newE: newE, newF: newF, updF: updF,
      delE: es.length - keptE.length, delF: fs.length - keptF.length,
    };
  }
  return { estates: es, fields: fs, newE: newE, newF: newF, updF: updF, delE: 0, delF: 0 };
}

// Header row for the template (copy into Excel)
function templateHeader() {
  const h = ['Region', 'SOU', 'Estate', 'Field', 'Planted', 'Mature ha', 'Yield Act', 'Yield Bgt', 'Yield LY', 'Profit Act', 'Profit Bgt'];
  COSTS.forEach((c) => {
    h.push(c + ' Act');
    h.push(c + ' Bgt');
  });
  return h.join('\t');
}

// ===== REUSABLE: top bar =====
function TopBar({ sub, onBack, alerts, onBell }) {
  return (
    <View style={styles.top}>
      {onBack ? (
        <Pressable style={styles.iconBtn} onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={C.ink} />
        </Pressable>
      ) : (
        <View style={styles.logo}>
          <Ionicons name="leaf" size={22} color="#fff" />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.topTitle} numberOfLines={1}>
          ETU <Text style={styles.topTitleB}>Field Visit</Text>
        </Text>
        <T style={styles.topSub} numberOfLines={1}>
          {sub}
        </T>
      </View>
      {onBell ? (
      <Pressable style={styles.iconBtn} onPress={onBell}>
        <Ionicons name="notifications-outline" size={20} color={C.ink} />
        {alerts > 0 && (
          <View style={styles.badge}>
            <T style={styles.badgeText}>{alerts}</T>
          </View>
        )}
      </Pressable>
      ) : null}
    </View>
  );
}

// ===== REUSABLE: hero card with plantation =====
function Hero({ eyebrow, title, sub, stats, mini }) {
  return (
    <View style={[styles.hero, mini && styles.heroMini]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.sky1} />
            <Stop offset="1" stopColor={C.sky2} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#sky)" />
      </Svg>
      <Scene height={mini ? 84 : 112} />
      <View style={styles.heroTx}>
        <T style={styles.eyebrowGold}>{eyebrow}</T>
        <Text style={[styles.heroTitle, mini && styles.heroTitleMini]}>
          {title}
        </Text>
        {sub ? <T style={styles.hint}>{sub}</T> : null}
      </View>
      <View style={styles.heroStats}>
        {stats.map((s) => (
          <View key={s.l} style={styles.hstat}>
            <View style={[styles.sic, s.tone && TONE_BG[s.tone]]}>
              <Ionicons
                name={s.ic}
                size={15}
                color={s.tone ? TONE_FG[s.tone] : C.accent}
              />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.hstatVal, mini && { fontSize: 19 }]}>
                {s.v}
              </Text>
              <T style={styles.hstatLbl} numberOfLines={1}>
                {s.l}
              </T>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const TONE_BG = {
  att: { backgroundColor: '#F5E4DC' },
  good: { backgroundColor: '#E4EEDB' },
  mon: { backgroundColor: '#F5EAD2' },
  rnd: { backgroundColor: '#E2EBF1' },
  gold: { backgroundColor: '#F3E9CF' },
  muted: { backgroundColor: '#EBE7DA' },
};
const TONE_FG = {
  att: '#B4533C',
  good: '#4F7D3C',
  mon: '#A8741F',
  rnd: '#4A7391',
  gold: '#A8812C',
  muted: '#4F564A',
};

// ===== REUSABLE: section card with icon title =====
function Section({ icon, title, right, children, style }) {
  return (
    <View style={[styles.section, style]}>
      {title ? (
        <View style={styles.sectionHead}>
          <View style={styles.hic}>
            <Ionicons name={icon} size={17} color={C.accent} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={{ flex: 1 }} />
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// ===== REUSABLE: status chip with dot =====
function Chip({ tone, label, dot }) {
  return (
    <View style={[styles.chip, TONE_BG[tone || 'muted']]}>
      {dot && (
        <View
          style={[
            styles.chipDot,
            { backgroundColor: tone === 'mon' ? C.amber : TONE_FG[tone] },
          ]}
        />
      )}
      <T style={[styles.chipText, { color: TONE_FG[tone || 'muted'] }]}>
        {label}
      </T>
    </View>
  );
}

// ===== REUSABLE: segmented tabs =====
function Seg({ options, value, onChange }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => {
        const on = value === o;
        return (
          <Pressable
            key={o}
            style={[styles.segBtn, on && styles.segBtnOn]}
            onPress={() => onChange(o)}>
            <T style={[styles.segText, on && styles.segTextOn]}>{o}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

// ===== REUSABLE: labelled input =====
function Field({ label, full, multiline, ...props }) {
  return (
    <View style={full ? styles.fieldFull : styles.field}>
      <T style={styles.label}>{label}</T>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        placeholderTextColor="#8A8F80"
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

// ===== REUSABLE: big action button =====
function CTA({ label, icon, onPress, color }) {
  return (
    <Pressable
      style={[styles.cta, color && { backgroundColor: color }]}
      onPress={onPress}>
      <Ionicons name={icon} size={20} color="#fff" />
      <Text style={styles.ctaText}>{label}</Text>
    </Pressable>
  );
}

function Empty({ title, text }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <T style={styles.hint}>{text}</T>
    </View>
  );
}

// ===== REUSABLE: Good / Monitor / Action picker =====
function StatusPicker({ value, onChange }) {
  return (
    <View style={styles.seg}>
      {Object.keys(STATUS).map((k) => {
        const on = value === k;
        const st = STATUS[k];
        return (
          <Pressable
            key={k}
            style={[
              styles.stBtn,
              on && { backgroundColor: TONE_FG[st.tone], borderColor: TONE_FG[st.tone] },
            ]}
            onPress={() => onChange(on ? null : k)}>
            <Ionicons name={st.icon} size={15} color={on ? '#fff' : TONE_FG[st.tone]} />
            <T style={[styles.stText, { color: on ? '#fff' : TONE_FG[st.tone] }]}>
              {st.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

// ===== REUSABLE: horizontal bar (chart) =====
function Bar({ label, value, max, color, right, marker }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const m = marker !== undefined && max > 0 ? Math.min(100, (marker / max) * 100) : null;
  return (
    <View style={{ gap: 3 }}>
      <View style={styles.barHead}>
        <T style={styles.barLabel} numberOfLines={1}>
          {label}
        </T>
        <T style={[styles.barRight, { color: color }]}>{right}</T>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: w + '%', backgroundColor: color }]} />
        {m !== null && <View style={[styles.barMark, { left: m + '%' }]} />}
      </View>
    </View>
  );
}

// ===== REUSABLE: green date box =====
function DateBox({ date }) {
  return (
    <View style={styles.dateBox}>
      <Text style={styles.dateBoxBig}>{date && date.length >= 10 ? Number(date.slice(8)) : '–'}</Text>
      <T style={styles.dateBoxSmall}>{date && date.length >= 10 ? MONTHS[Number(date.slice(5, 7)) - 1] : 'no date'}</T>
    </View>
  );
}

// =====================================================
// MAIN APP
// =====================================================
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    PublicSans_400Regular,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
  });
  const [estates, setEstates] = useSavedState('v3-estates', []);
  const [fields, setFields] = useSavedState('v3-fields', []);
  const [visits, setVisits] = useSavedState('v3-visits', []);
  const [actions, setActions] = useSavedState('v3-actions', []);
  const [settings, setSettings] = useSavedState('v5-settings', {});
  const [sel, setSel] = useSavedState('v6-lookup', {});
  const [etu, setEtu] = useSavedState('v8-etu', []);
  // Page history: the last page is the one on screen
  const [stack, setStack] = useState([{ name: 'home' }]);
  const screen = stack[stack.length - 1];
  const go = (s) => setStack([...stack, s]);
  const goBack = () => setStack(stack.length > 1 ? stack.slice(0, -1) : stack);
  const goHome = () => setStack([{ name: 'home' }]);
  const goTab = (k) => setStack([{ name: k }]);

  // Phone back button = previous page (not close the app)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        setStack(stack.slice(0, -1));
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  // Use the limits from Settings for all triggers
  applySettings(settings);

  // tab = a section page, no tab = the estate / field menu page
  const openEstate = (id, tab) => go({ name: 'estate', id: id, tab: tab || null });
  const openField = (id, tab) => go({ name: 'field', id: id, tab: tab || null });
  const openVisit = (id) => go({ name: 'visit', id: id });

  const save = (list, setList) => (item) =>
    setList(list.map((x) => (x.id === item.id ? item : x)));
  const saveEstate = save(estates, setEstates);
  const saveField = save(fields, setFields);
  const saveVisit = save(visits, setVisits);
  const saveAction = save(actions, setActions);
  const addAction = (a) => setActions([a, ...actions]);
  const deleteAction = (id) => setActions(actions.filter((x) => x.id !== id));

  const openCount = actions.filter((a) => a.status !== 'done').length;

  // ----- ETU field visits -----
  const saveEtu = (v) => {
    setEtu(etu.map((x) => (x.id === v.id ? v : x)));
    setActions(syncEtuActions(v, actions));
  };
  const newEtu = (estateId, fieldId) => {
    const last = [...etu].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    const f = fieldId && fields.find((x) => x.id === fieldId);
    const v = {
      id: newId(), estateId: estateId || null, date: today(), visitedBy: last ? last.visitedBy || '' : '',
      fields: f ? [{ id: newId(), fieldId: f.id, code: f.code, obs: [] }] : [], notes: '', status: 'draft',
    };
    setEtu([v, ...etu]);
    go({ name: 'etuvisit', id: v.id });
  };

  // Start a visit (optionally with fields already ticked)
  const newVisit = (estateId, fieldIds) => {
    const v = { id: newId(), estateId: estateId, date: today(), fieldIds: fieldIds || [], checks: {} };
    setVisits([v, ...visits]);
    openVisit(v.id);
  };
  const common = {
    estates, fields, visits, actions, etu,
    onSaveAction: saveAction,
    onDeleteAction: deleteAction,
    onOpenEstate: openEstate,
    onOpenField: openField,
    onOpenVisit: openVisit,
  };

  let body = null;
  let sub = 'Fields · Triggers · Follow-up · Cost';
  const back = stack.length > 1 ? goBack : null;

  if (screen.name === 'estate') {
    const e = estates.find((x) => x.id === screen.id);
    if (!e) return null;
    sub = e.name + (screen.tab ? ' · ' + screen.tab : '');
    body = (
      <EstateScreen
        key={e.id + (screen.tab || '')}
        {...common}
        estate={e}
        tab={screen.tab}
        onChange={saveEstate}
        onAddField={(f) => setFields([...fields, f])}
        onNewVisit={() => newVisit(e.id, [])}
        onNewEtu={() => newEtu(e.id)}
        onOpenEtu={() => go({ name: 'etu', estateId: e.id })}
        onDelete={() => {
          setEtu(etu.filter((x) => x.estateId !== e.id));
          setEstates(estates.filter((x) => x.id !== e.id));
          setFields(fields.filter((f) => f.estateId !== e.id));
          setVisits(visits.filter((v) => v.estateId !== e.id));
          setActions(actions.filter((a) => a.estateId !== e.id));
          goHome();
        }}
      />
    );
  } else if (screen.name === 'field') {
    const f = fields.find((x) => x.id === screen.id);
    const e = f && estates.find((x) => x.id === f.estateId);
    if (!f || !e) return null;
    sub = e.name + ' · Field ' + f.code + (screen.tab ? ' · ' + screen.tab : '');
    body = (
      <FieldScreen
        key={f.id + (screen.tab || '')}
        {...common}
        field={f}
        estate={e}
        tab={screen.tab}
        onChange={saveField}
        onNewVisit={() => newEtu(e.id, f.id)}
        onDelete={() => {
          setFields(fields.filter((x) => x.id !== f.id));
          setActions(actions.filter((a) => a.fieldId !== f.id));
          goBack();
          goBack();
        }}
      />
    );
  } else if (screen.name === 'visit') {
    const v = visits.find((x) => x.id === screen.id);
    const e = v && estates.find((x) => x.id === v.estateId);
    if (!v || !e) return null;
    sub = e.name + ' · ' + (v.title || 'Visit') + ' · ' + showDate(v.date);
    body = (
      <VisitScreen
        {...common}
        visit={v}
        estate={e}
        estateFields={fields.filter((f) => f.estateId === e.id)}
        onChange={saveVisit}
        onAddAction={addAction}
        onAddField={(f) => setFields([...fields, f])}
        onDelete={() => {
          setVisits(visits.filter((x) => x.id !== v.id));
          setActions(actions.filter((a) => a.visitId !== v.id));
          goBack();
        }}
      />
    );
  } else if (screen.name === 'etu') {
    sub = 'ETU field visit';
    body = <EtuListScreen {...common} estateId={screen.estateId} onNew={(eid) => newEtu(eid)} onOpen={(id) => go({ name: 'etuvisit', id: id })} />;
  } else if (screen.name === 'etuvisit') {
    const v = etu.find((x) => x.id === screen.id);
    if (!v) return null;
    const e = estates.find((x) => x.id === v.estateId);
    sub = 'ETU visit · ' + (e ? e.name + ' · ' : '') + showDate(v.date);
    body = (
      <EtuVisitScreen
        {...common}
        visit={v}
        key={v.id}
        onChange={saveEtu}
        onClose={goBack}
        onOpenField={(fid) => go({ name: 'etufield', vid: v.id, fid: fid })}
        onDelete={() => {
          setEtu(etu.filter((x) => x.id !== v.id));
          setActions(actions.filter((a) => !a.id.startsWith('etu-' + v.id + '-')));
          goBack();
        }}
      />
    );
  } else if (screen.name === 'etufield' || screen.name === 'etuobs') {
    const v = etu.find((x) => x.id === screen.vid);
    const vf = v && (v.fields || []).find((x) => x.id === screen.fid);
    if (!v || !vf) return null;
    const saveVf = (nf) => saveEtu({ ...v, fields: v.fields.map((x) => (x.id === nf.id ? nf : x)) });
    if (screen.name === 'etufield') {
      sub = 'ETU visit · Field ' + vf.code;
      body = (
        <EtuFieldScreen
          {...common}
          visit={v}
          vf={vf}
          onOpenObs={(oid) => go({ name: 'etuobs', vid: v.id, fid: vf.id, oid: oid })}
          onAddObs={() => {
            const o = newObs();
            saveVf({ ...vf, obs: [...(vf.obs || []), o] });
            go({ name: 'etuobs', vid: v.id, fid: vf.id, oid: o.id });
          }}
          onDelete={() => {
            saveEtu({ ...v, fields: v.fields.filter((x) => x.id !== vf.id) });
            goBack();
          }}
        />
      );
    } else {
      const o = (vf.obs || []).find((x) => x.id === screen.oid);
      if (!o) return null;
      sub = 'Field ' + vf.code + ' · observation';
      body = (
        <EtuObsScreen
          key={o.id}
          obs={o}
          vf={vf}
          onChange={(no) => saveVf({ ...vf, obs: vf.obs.map((x) => (x.id === no.id ? no : x)) })}
          onDelete={() => {
            saveVf({ ...vf, obs: vf.obs.filter((x) => x.id !== o.id) });
            goBack();
          }}
        />
      );
    }
  } else if (screen.name === 'more') {
    sub = 'More';
    body = <MoreScreen {...common} onGo={(name) => go({ name: name })} />;
  } else if (screen.name === 'estates') {
    sub = 'Estates';
    body = (
      <EstatesScreen
        {...common}
        onAdd={(name) => setEstates([...estates, { id: newId(), name: name, profitAct: '', profitBgt: '' }])}
      />
    );
  } else if (screen.name === 'alerts') {
    sub = 'Priorities';
    body = <AlertsScreen {...common} />;
  } else if (screen.name === 'profit') {
    sub = 'Profit by estate';
    body = <ProfitScreen {...common} />;
  } else if (screen.name === 'lookup') {
    sub = 'Lookup';
    body = <LookupScreen {...common} sel={sel} setSel={setSel} onNewVisit={newVisit} />;
  } else if (screen.name === 'settings') {
    sub = 'Settings';
    body = (
      <SettingsScreen
        settings={settings}
        setSettings={setSettings}
        counts={{ estates: estates.length, fields: fields.length, visits: visits.length, actions: actions.length }}
        onClearAll={() => {
          setEstates([]);
          setFields([]);
          setVisits([]);
          setActions([]);
          setEtu([]);
          setSel({});
          goHome();
        }}
      />
    );
  } else if (screen.name === 'upload') {
    sub = 'Upload estate data';
    body = (
      <UploadScreen
        estates={estates}
        fields={fields}
        onImport={(es, fs, items) => {
          // drop visits / follow-ups of removed estates and fields
          const eIds = es.map((e) => e.id);
          const fIds = fs.map((f) => f.id);
          const nv = (items && items.visits) || [];
          const na = (items && items.actions) || [];
          const newV = nv.map((v) => v.id);
          const newA = na.map((a) => a.id);
          setEstates(es);
          setFields(fs);
          setEtu(etu.filter((v) => eIds.includes(v.estateId)));
          setVisits(
            nv.concat(
              visits
                .filter((v) => eIds.includes(v.estateId) && !newV.includes(v.id))
                .map((v) => ({ ...v, fieldIds: (v.fieldIds || []).filter((id) => fIds.includes(id)) }))
            )
          );
          setActions(
            na.concat(
              actions.filter(
                (a) => eIds.includes(a.estateId) && (!a.fieldId || fIds.includes(a.fieldId)) && !newA.includes(a.id)
              )
            )
          );
        }}
        onDone={goHome}
      />
    );
  } else {
    body = (
      <HomeScreen
        {...common}
        onGo={(name) => (['estates', 'etu', 'alerts', 'more'].includes(name) ? goTab(name) : go({ name: name }))}
        onNewEtu={() => newEtu(estates.length === 1 ? estates[0].id : null)}
        onOpenEtu={(id) => go({ name: 'etuvisit', id: id })}
        onExample={() => {
          const ex = exampleData();
          setEstates(ex.estates);
          setFields(ex.fields);
          setVisits(ex.visits);
          setActions(ex.actions);
        }}
      />
    );
  }

  return (
    <View style={styles.app}>
      <StatusBar barStyle="dark-content" backgroundColor={C.skyTop} />
      <TopBar sub={sub} onBack={back} />
      <View style={{ flex: 1 }}>{body}</View>
      <BottomNav active={stack[0].name} onGo={goTab} badge={actions.filter((a) => a.status !== 'done' && isOverdue(a)).length} />
    </View>
  );
}

function sortActions(list) {
  return [...list].sort((a, b) => {
    if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
    return (a.due || '').localeCompare(b.due || '');
  });
}

function DeleteBox({ label, button, confirm, setConfirm, onDelete }) {
  if (confirm) {
    return (
      <View style={styles.confirm}>
        <T style={styles.confirmText}>{label}</T>
        <View style={styles.row2}>
          <Pressable style={styles.btnGhost} onPress={() => setConfirm(false)}>
            <T style={styles.bold}>Keep</T>
          </Pressable>
          <Pressable style={styles.btnDanger} onPress={onDelete}>
            <T style={[styles.bold, { color: '#fff' }]}>Delete</T>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <Pressable onPress={() => setConfirm(true)} style={styles.delRow}>
      <Ionicons name="trash-outline" size={16} color={C.att} />
      <T style={{ color: C.att }}>{button}</T>
    </Pressable>
  );
}

// =====================================================
// FIELD: profile & yield, 12 costs, history
// =====================================================
function FieldScreen(p) {
  const { field, estate, visits, actions, tab, onChange } = p;
  const [confirm, setConfirm] = useState(false);
  const set = (k, v) => onChange({ ...field, [k]: v });
  const yv = yieldVar(field);
  const ys = yieldStatus(field);
  const fa = actions.filter((a) => a.fieldId === field.id);
  const open = fa.filter((a) => a.status !== 'done');
  const late = open.filter(isOverdue);
  const ca = costAlerts(field);

  // Every finding for this field, newest visit first
  const hist = [];
  visits
    .filter((v) => (v.fieldIds || []).includes(field.id))
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((v) => {
      const ck = checkOf(v, field.id);
      ACTIVITIES.forEach((act) => {
        const st = actStatus(ck, act);
        if (st && st !== 'good') {
          hist.push({ key: v.id + act.id, date: v.date, title: v.title || 'Site visit', act: act, st: st, note: (ck.notes || {})[act.id] || '', photos: (ck.photos || {})[act.id] || [] });
        }
      });
    });
  // ETU field visit observations for this field
  (p.etu || [])
    .filter((v) => (v.fields || []).some((x) => x.fieldId === field.id))
    .forEach((v) => {
      const vf = v.fields.find((x) => x.fieldId === field.id);
      (vf.obs || [])
        .filter((o) => o.status !== 'good')
        .forEach((o) => {
          const map = { attention: 'action', monitor: 'monitor', rnd: 'monitor' };
          hist.push({
            key: v.id + o.id, date: v.date, title: 'ETU field visit · ' + ESTAT[o.status].short,
            act: { id: 0, name: o.category + (o.title ? ': ' + o.title : '') }, st: map[o.status], note: o.issue || '', photos: o.photos || [], etu: true,
          });
        });
    });
  hist.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const lv = latestFieldVisit(visits, field.id);
  const lck = lv ? checkOf(lv, field.id) : null;
  const red = lv ? ACTIVITIES.filter((a) => actStatus(lck, a) === 'action').length : 0;
  const maxY = Math.max(num(field.ypAct) || 0, num(field.ypBgt) || 0, num(field.ypLy) || 0, 1);
  const go = (t) => p.onOpenField(field.id, t);

  // ---------- menu page ----------
  if (!tab) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Hero
          mini
          eyebrow={estate.name + ' · Field'}
          title={'Field ' + field.code}
          sub={(field.year ? 'Planted ' + field.year + ' · ' : '') + (field.ha || '-') + ' mature ha'}
          stats={[
            { ic: 'leaf', v: pctText(yv), l: 'Yield var', tone: ys ? STATUS[ys].tone : null },
            { ic: 'cash', v: String(ca.length), l: 'Cost over', tone: ca.length ? 'att' : 'good' },
            { ic: 'alert-circle', v: String(red), l: 'Action', tone: red ? 'att' : 'good' },
          ]}
        />
        <Menu>
          <MenuRow icon="leaf-outline" title="Field details & yield" sub={(field.ypAct || '-') + ' vs ' + (field.ypBgt || '-') + ' mt/ha · LY ' + (field.ypLy || '-')} chip={ys ? STATUS[ys].label : null} tone={ys ? STATUS[ys].tone : null} onPress={() => go('Details')} />
          <MenuRow icon="cash-outline" title="Cost" sub={ca.length ? ca.slice(0, 2).join(', ') + (ca.length > 2 ? '…' : '') : '12 elements · within budget'} chip={ca.length ? ca.length + ' over' : null} tone={ca.length ? 'att' : null} onPress={() => go('Cost')} />
          <MenuRow icon="search-outline" title="Findings" sub={lv ? 'Latest: ' + (lv.title || 'visit') + ' ' + showDate(lv.date) : 'Not visited yet'} chip={hist.length ? hist.length + ' found' : null} tone={red ? 'att' : hist.length ? 'mon' : null} onPress={() => go('Findings')} />
          <MenuRow icon="flag-outline" title="Follow-ups" sub={open.length + ' open · ' + (fa.length - open.length) + ' done'} chip={late.length ? late.length + ' overdue' : null} tone={late.length ? 'att' : null} last onPress={() => go('Follow-ups')} />
        </Menu>
        <CTA label="NEW ETU VISIT TO THIS FIELD" icon="walk" onPress={p.onNewVisit} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {tab === 'Details' && (
        <>
          <PageHead icon="leaf-outline" title={'Field ' + field.code} sub={estate.name + ' · details & yield YTD (mt/ha)'} />
          <View style={[styles.profitBox, ys ? TONE_BG[STATUS[ys].tone] : TONE_BG.muted]}>
            <T style={styles.meta}>Yield vs budget</T>
            <Text style={[styles.profitBig, { color: ys ? TONE_FG[STATUS[ys].tone] : C.muted }]}>{pctText(yv)}</Text>
            <T style={styles.meta}>
              {ys ? STATUS[ys].label + ' · ' : ''}Action below {LIMITS.yieldRed}%, Monitor below {LIMITS.yieldAmber}%
            </T>
            {num(field.ypLy) !== null && <T style={styles.meta}>vs last year: {pctText(variance(field.ypAct, field.ypLy))}</T>}
          </View>
          {num(field.ypAct) !== null && (
            <Section icon="bar-chart-outline" title="Yield chart">
              <Bar label="Actual" value={num(field.ypAct)} max={maxY} color={ys ? TONE_FG[STATUS[ys].tone] : C.good} right={field.ypAct} />
              <Bar label="Budget" value={num(field.ypBgt) || 0} max={maxY} color={C.muted} right={field.ypBgt || '-'} />
              <Bar label="Last year" value={num(field.ypLy) || 0} max={maxY} color={C.rnd} right={field.ypLy || '-'} />
            </Section>
          )}
          <Section icon="create-outline" title="Edit">
            <View style={styles.row2}>
              <Field label="Field code" autoCapitalize="characters" value={field.code} onChangeText={(t) => set('code', t.toUpperCase())} />
              <Field label="Planted" keyboardType="numeric" value={field.year || ''} onChangeText={(t) => set('year', t)} />
              <Field label="Mature ha" keyboardType="numeric" value={field.ha || ''} onChangeText={(t) => set('ha', t)} />
            </View>
            <View style={styles.row2}>
              <Field label="Yield act" keyboardType="numeric" placeholder="0.0" value={field.ypAct || ''} onChangeText={(t) => set('ypAct', t)} />
              <Field label="Budget" keyboardType="numeric" placeholder="0.0" value={field.ypBgt || ''} onChangeText={(t) => set('ypBgt', t)} />
              <Field label="Last year" keyboardType="numeric" placeholder="0.0" value={field.ypLy || ''} onChangeText={(t) => set('ypLy', t)} />
            </View>
          </Section>
          <DeleteBox label={'Delete field ' + field.code + ' and its follow-ups?'} button="Delete field" confirm={confirm} setConfirm={setConfirm} onDelete={p.onDelete} />
        </>
      )}

      {tab === 'Cost' && (
        <>
          <PageHead icon="cash-outline" title={'Field ' + field.code + ' cost'} sub="RM/ha YTD · tap a number to edit" />
          <CostTable obj={field} onChange={onChange} />
          <CostChart obj={field} />
        </>
      )}

      {tab === 'Findings' && (
        <>
          <PageHead icon="search-outline" title="Findings" sub={'Field ' + field.code + ' · Monitor and Action from all visits'} />
          {hist.length === 0 && <Empty title="No findings" text="No Monitor or Action findings for this field yet." />}
          {hist.map((h) => (
            <View key={h.key} style={styles.card}>
              <DateBox date={h.date} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={styles.kvLabel} numberOfLines={1}>{h.title}</T>
                <T style={styles.bold}>{h.etu ? h.act.name : no2(h.act.id) + '. ' + h.act.name}</T>
                {h.note ? <T style={styles.meta}>{h.note}</T> : null}
                <View style={styles.chips}>
                  <Chip tone={STATUS[h.st].tone} dot label={STATUS[h.st].label} />
                </View>
                {h.photos.length > 0 && <PhotoStrip photos={h.photos} readOnly />}
              </View>
            </View>
          ))}
        </>
      )}

      {tab === 'Follow-ups' && (
        <>
          <PageHead icon="flag-outline" title="Follow-ups" sub={'Field ' + field.code + ' · ' + open.length + ' open'} />
          {fa.length === 0 && <Empty title="No follow-ups" text="Add them from a site visit." />}
          {sortActions(fa).map((a) => (
            <ActionRow key={a.id} a={a} onSave={p.onSaveAction} onDelete={p.onDeleteAction} showAct />
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ===== 12 cost elements table (field = edit, estate = read only) =====
function CostTable({ obj, onChange, readOnly }) {
  const setCost = (i, k, v) => {
    const costs = { ...(obj.costs || {}) };
    costs[i] = { ...(costs[i] || {}), [k]: v };
    onChange({ ...obj, costs: costs });
  };
  let ta = 0;
  let tb = 0;
  COSTS.forEach((n, i) => {
    ta += num(costOf(obj, i).act) || 0;
    tb += num(costOf(obj, i).bgt) || 0;
  });
  return (
    <Section icon="cash-outline" title="12 cost elements" right={<T style={styles.hint}>RM/ha YTD</T>}>
      <T style={styles.hint}>Red = more than {LIMITS.cost}% above budget.</T>
      <View style={styles.costRow}>
        <T style={[styles.costName, styles.kvLabel]}>Element</T>
        <T style={[styles.costCell, styles.kvLabel]}>Actual</T>
        <T style={[styles.costCell, styles.kvLabel]}>Budget</T>
        <T style={[styles.costVar, styles.kvLabel]}>Var</T>
      </View>
      {COSTS.map((name, i) => {
        const c = costOf(obj, i);
        const v = variance(c.act, c.bgt);
        const over = v !== null && v > LIMITS.cost;
        return (
          <View key={name} style={[styles.costRow, over && { backgroundColor: C.attBg }]}>
            <T style={styles.costName} numberOfLines={2}>{name}</T>
            {readOnly ? (
              <>
                <T style={[styles.costCell, styles.costRo]}>{money(c.act)}</T>
                <T style={[styles.costCell, styles.costRo]}>{money(c.bgt)}</T>
              </>
            ) : (
              <>
                <TextInput style={[styles.input, styles.costCell, styles.costIn]} keyboardType="numeric" placeholder="0" placeholderTextColor="#8A8F80" value={c.act || ''} onChangeText={(t) => setCost(i, 'act', t)} />
                <TextInput style={[styles.input, styles.costCell, styles.costIn]} keyboardType="numeric" placeholder="0" placeholderTextColor="#8A8F80" value={c.bgt || ''} onChangeText={(t) => setCost(i, 'bgt', t)} />
              </>
            )}
            <T style={[styles.costVar, { color: over ? C.att : v !== null && v <= 0 ? C.good : C.muted }]}>
              {pctText(v)}
            </T>
          </View>
        );
      })}
      <View style={[styles.costRow, styles.totalRow]}>
        <T style={[styles.costName, styles.bold]}>TOTAL</T>
        <T style={[styles.costCell, styles.bold]}>{money(ta)}</T>
        <T style={[styles.costCell, styles.bold]}>{money(tb)}</T>
        <T style={[styles.costVar, styles.bold]}>{pctText(variance(ta, tb))}</T>
      </View>
    </Section>
  );
}

function CostChart({ obj }) {
  let max = 1;
  COSTS.forEach((n, i) => {
    max = Math.max(max, num(costOf(obj, i).act) || 0, num(costOf(obj, i).bgt) || 0);
  });
  const rows = COSTS.map((name, i) => ({ name: name, c: costOf(obj, i) })).filter(
    (r) => num(r.c.act) !== null
  );
  if (rows.length === 0) return null;
  return (
    <Section icon="bar-chart-outline" title="Actual vs budget">
      {rows.map((r) => {
        const v = variance(r.c.act, r.c.bgt);
        return (
          <Bar
            key={r.name}
            label={r.name}
            value={num(r.c.act)}
            max={max}
            marker={num(r.c.bgt) === null ? undefined : num(r.c.bgt)}
            color={v !== null && v > LIMITS.cost ? C.att : v !== null && v > 0 ? C.mon : C.good}
            right={pctText(v)}
          />
        );
      })}
      <T style={styles.hint}>Bar = actual. Black line = budget. Red = over the limit.</T>
    </Section>
  );
}

// ===== One follow-up action (tick to close) =====
function ActionRow({ a, field, onSave, onDelete, showAct }) {
  const done = a.status === 'done';
  const late = isOverdue(a);
  return (
    <View style={[styles.rcard, late && { borderColor: C.att }]}>
      <Pressable
        hitSlop={8}
        onPress={() => onSave({ ...a, status: done ? 'open' : 'done', doneAt: done ? null : today() })}>
        <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={done ? C.good : late ? C.att : C.muted} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T style={[styles.bold, done && styles.strike]}>
          {field ? '[' + field + '] ' : ''}
          {a.text}
        </T>
        <T style={styles.meta} numberOfLines={1}>
          {(showAct ? no2(a.actId) + '. ' + actOf(a.actId).name + ' · ' : '') + 'PIC ' + (a.pic || '-')}
        </T>
        <View style={styles.chips}>
          {done ? (
            <Chip tone="good" dot label={'Done ' + showDate(a.doneAt)} />
          ) : late ? (
            <Chip tone="att" dot label={'Overdue · due ' + showDate(a.due)} />
          ) : (
            <Chip tone="mon" dot label={'Open · due ' + showDate(a.due)} />
          )}
        </View>
      </View>
      {onDelete && (
        <Pressable onPress={() => onDelete(a.id)} hitSlop={10}>
          <Ionicons name="trash-outline" size={18} color={C.att} />
        </Pressable>
      )}
    </View>
  );
}

// =====================================================
// SITE VISIT: pick fields, then check 10 activities per field
// =====================================================
function VisitScreen(p) {
  const { visit, estate, estateFields, actions, fields, onChange } = p;
  const ids = visit.fieldIds || [];
  const [cur, setCur] = useState(ids[0] || null);
  const [openAct, setOpenAct] = useState(null);
  const [newCode, setNewCode] = useState('');
  const [form, setForm] = useState({ text: '', pic: '', due: addDays(today(), 7) });
  const [msg, setMsg] = useState('');

  const curId = ids.includes(cur) ? cur : ids[0] || null;
  const curField = estateFields.find((f) => f.id === curId);
  const ck = curId ? checkOf(visit, curId) : null;

  const toggleField = (fid) => {
    const on = ids.includes(fid);
    const next = on ? ids.filter((x) => x !== fid) : [...ids, fid];
    onChange({ ...visit, fieldIds: next });
    if (!on) setCur(fid);
  };

  const quickAdd = () => {
    const code = newCode.trim().toUpperCase();
    if (!code) return;
    const f = { id: newId(), estateId: estate.id, code: code, year: '', ha: '', ypAct: '', ypBgt: '', ypLy: '', costs: {} };
    p.onAddField(f);
    onChange({ ...visit, fieldIds: [...ids, f.id] });
    setCur(f.id);
    setNewCode('');
  };

  const setCheck = (patch) => {
    const checks = { ...(visit.checks || {}) };
    checks[curId] = { ...checkOf(visit, curId), ...patch };
    onChange({ ...visit, checks: checks });
  };
  const setReading = (rid, val) => setCheck({ readings: { ...(ck.readings || {}), [rid]: val } });
  const setManual = (aid, st) => {
    const manual = { ...(ck.manual || {}) };
    if (st) manual[aid] = st;
    else delete manual[aid];
    setCheck({ manual: manual });
  };
  const setNote = (aid, t) => setCheck({ notes: { ...(ck.notes || {}), [aid]: t } });
  const setPhotos = (aid, list) => setCheck({ photos: { ...(ck.photos || {}), [aid]: list } });

  const addFollowUp = (act) => {
    const text = form.text.trim() || (ck.notes || {})[act.id] || '';
    if (!text) return;
    p.onAddAction({
      id: newId(), estateId: estate.id, visitId: visit.id, fieldId: curId,
      actId: act.id, text: text, pic: form.pic.trim(), due: form.due,
      status: 'open', createdAt: today(),
    });
    setForm({ text: '', pic: form.pic, due: addDays(today(), 7) });
  };

  const share = async () => {
    try {
      await Share.share({ message: visitReport(visit, estate, fields, actions) });
    } catch (e) {
      setMsg('Sharing works on the phone, not in this preview.');
    }
  };

  const all = findings(visit);
  const fcount = (fid, st) =>
    ACTIVITIES.filter((a) => actStatus(checkOf(visit, fid), a) === st).length;

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Hero
        mini
        eyebrow={(visit.title || 'Site visit') + ' · ' + estate.name}
        title={showDate(visit.date)}
        sub={ids.length + ' fields visited'}
        stats={[
          { ic: 'alert-circle', v: String(countIn(all, 'action')), l: 'Action', tone: 'att' },
          { ic: 'warning', v: String(countIn(all, 'monitor')), l: 'Monitor', tone: 'mon' },
          { ic: 'checkmark-circle', v: String(countIn(all, 'good')), l: 'Good', tone: 'good' },
        ]}
      />

      <Section icon="grid-outline" title="1. Fields visited">
        <View style={styles.row2}>
          <DateField label="Visit date" value={visit.date} onChange={(d) => onChange({ ...visit, date: d })} />
        </View>
        <View style={styles.chips}>
          {estateFields.map((f) => {
            const on = ids.includes(f.id);
            return (
              <Pressable key={f.id} style={[styles.pickChip, on && styles.pickChipOn]} onPress={() => toggleField(f.id)}>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={16} color={on ? '#fff' : C.accent} />
                <T style={[styles.pickChipText, on && { color: '#fff' }]}>{f.code}</T>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.row2}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="New field code" placeholderTextColor="#8A8F80" autoCapitalize="characters" value={newCode} onChangeText={setNewCode} />
          <Pressable style={styles.addBtn} onPress={quickAdd}>
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>
      </Section>

      {ids.length === 0 ? (
        <Empty title="Pick a field" text="Tick the fields you visited to start checking activities." />
      ) : (
        <>
          <T style={styles.kvLabel}>2. Check activities in field</T>
          <View style={styles.chips}>
            {ids.map((fid) => {
              const f = estateFields.find((x) => x.id === fid) || {};
              const on = fid === curId;
              const red = fcount(fid, 'action');
              return (
                <Pressable key={fid} style={[styles.fieldTab, on && styles.fieldTabOn]} onPress={() => { setCur(fid); setOpenAct(null); }}>
                  <Text style={[styles.fieldTabText, on && { color: '#fff' }]}>{f.code}</Text>
                  {red > 0 && (
                    <View style={styles.tabBadge}>
                      <T style={styles.badgeText}>{red}</T>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {curField && (
            <View style={styles.fieldInfo}>
              <T style={styles.meta}>
                Field {curField.code}
                {curField.ha ? ' · ' + curField.ha + ' ha' : ''}
                {curField.ypAct ? ' · yield ' + curField.ypAct + ' vs ' + (curField.ypBgt || '-') + ' mt/ha' : ''}
              </T>
              {yieldStatus(curField) && (
                <Chip tone={STATUS[yieldStatus(curField)].tone} dot label={'Yield ' + pctText(yieldVar(curField))} />
              )}
            </View>
          )}

          {ACTIVITIES.map((act) => {
            const st = actStatus(ck, act);
            const auto = autoStatus(ck, act);
            const manual = (ck.manual || {})[act.id];
            const isOpen = openAct === act.id;
            const tone = st ? STATUS[st].tone : null;
            const fups = actions.filter((x) => x.visitId === visit.id && x.fieldId === curId && x.actId === act.id);
            return (
              <View key={act.id} style={[styles.actCard, tone && { borderColor: TONE_FG[tone] }]}>
                <Pressable style={styles.actHead} onPress={() => setOpenAct(isOpen ? null : act.id)}>
                  <View style={[styles.actIc, tone ? TONE_BG[tone] : { backgroundColor: C.accentSoft }]}>
                    <Ionicons name={act.icon} size={18} color={tone ? TONE_FG[tone] : C.accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T style={styles.bold} numberOfLines={1}>{no2(act.id)}. {act.name}</T>
                    <View style={styles.chips}>
                      {st ? (
                        <Chip tone={tone} dot label={STATUS[st].label + (manual ? '' : ' (auto)')} />
                      ) : (
                        <Chip tone="muted" label="Not checked" />
                      )}
                      {fups.length > 0 && <Chip tone="rnd" label={fups.length + ' follow-up'} />}
                      {((ck.photos || {})[act.id] || []).length > 0 && (
                        <Chip tone="muted" label={((ck.photos || {})[act.id] || []).length + ' photo'} />
                      )}
                    </View>
                  </View>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={C.muted} />
                </Pressable>

                {isOpen && (
                  <View style={styles.actBody}>
                    <T style={styles.kvLabel}>Readings in field {curField ? curField.code : ''}</T>
                    {act.rules.map((r) => {
                      const raw = (ck.readings || {})[r.id];
                      const res = evaluate(r, raw);
                      return (
                        <View key={r.id} style={styles.readRow}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <T style={styles.ruleName}>{r.name}</T>
                            <T style={styles.meta}>{limitText(r)}</T>
                          </View>
                          {r.op === 'yes' ? (
                            <View style={styles.yesNo}>
                              {['no', 'yes'].map((k) => (
                                <Pressable
                                  key={k}
                                  style={[styles.ynBtn, raw === k && { backgroundColor: k === 'yes' ? C.att : C.good, borderColor: k === 'yes' ? C.att : C.good }]}
                                  onPress={() => setReading(r.id, raw === k ? '' : k)}>
                                  <T style={[styles.ynText, raw === k && { color: '#fff' }]}>{k === 'yes' ? 'Yes' : 'No'}</T>
                                </Pressable>
                              ))}
                            </View>
                          ) : (
                            <TextInput style={[styles.input, styles.readIn]} keyboardType="numeric" placeholder={r.unit} placeholderTextColor="#8A8F80" value={raw || ''} onChangeText={(t) => setReading(r.id, t)} />
                          )}
                          <View style={[styles.resDot, { backgroundColor: res ? TONE_FG[STATUS[res].tone] : C.line }]} />
                        </View>
                      );
                    })}

                    <T style={styles.kvLabel}>Status {auto ? '(auto: ' + STATUS[auto].label + ')' : ''}</T>
                    <StatusPicker value={manual || null} onChange={(k) => setManual(act.id, k)} />

                    {(st === 'monitor' || st === 'action') && (
                      <>
                        <Field label="Finding / note" full multiline placeholder="What you saw, where, why" value={(ck.notes || {})[act.id] || ''} onChangeText={(t) => setNote(act.id, t)} />
                        <T style={styles.kvLabel}>Photos</T>
                        <PhotoStrip photos={(ck.photos || {})[act.id]} onChange={(l) => setPhotos(act.id, l)} />
                        <View style={styles.fupBox}>
                          <T style={styles.kvLabel}>Follow-up actions</T>
                          {fups.map((a) => (
                            <ActionRow key={a.id} a={a} onSave={p.onSaveAction} />
                          ))}
                          <Field label="Action to take" full placeholder="e.g. Dispatch extra crew" value={form.text} onChangeText={(t) => setForm({ ...form, text: t })} />
                          <View style={styles.row2}>
                            <Field label="PIC" placeholder="Name" value={form.pic} onChangeText={(t) => setForm({ ...form, pic: t })} />
                            <DateField label="Due date" value={form.due} onChange={(d) => setForm({ ...form, due: d })} />
                          </View>
                          <CTA label="ADD FOLLOW-UP" icon="flag" color={C.rnd} onPress={() => addFollowUp(act)} />
                        </View>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}

      <CTA label="SHARE VISIT REPORT (WHATSAPP)" icon="share-social" onPress={share} />
      {msg ? <T style={styles.hint}>{msg}</T> : null}

      <Pressable onPress={p.onDelete} style={styles.delRow}>
        <Ionicons name="trash-outline" size={16} color={C.att} />
        <T style={{ color: C.att }}>Delete this visit</T>
      </Pressable>
    </ScrollView>
  );
}

// =====================================================
// EXAMPLE DATA (to try the app)
// =====================================================
function exampleData() {
  const t = today();
  const base = [[420, 400], [180, 190], [600, 520], [150, 160], [90, 95], [55, 40], [55, 60], [20, 25], [80, 90], [125, 120], [110, 105], [70, 75]];
  // field costs = base with a small change per field
  const costs = (k) => {
    const c = {};
    base.forEach((b, i) => {
      const f = 1 + (((i * 7 + k * 3) % 9) - 4) / 50;
      c[i] = { act: String(Math.round(b[0] * f)), bgt: String(b[1]) };
    });
    return c;
  };
  const F = (id, estateId, code, year, ha, a, b, ly, k) => ({
    id: id, estateId: estateId, code: code, year: year, ha: ha,
    ypAct: a, ypBgt: b, ypLy: ly, costs: costs(k),
  });
  const fields = [
    F('f1', 'e1', '3C', '2008', '45.2', '18.2', '21.5', '20.1', 1),
    F('f2', 'e1', '4A', '2012', '38.5', '22.0', '21.0', '19.8', 2),
    F('f3', 'e1', '7A', '2016', '52.0', '19.1', '20.0', '18.0', 3),
    F('f4', 'e2', 'C12', '2010', '40.0', '23.1', '22.0', '21.5', 4),
    F('f5', 'e2', 'C14', '2014', '35.5', '18.9', '21.0', '20.2', 5),
  ];
  const estates = [
    { id: 'e1', name: 'Sungai Mai', region: 'Pahang', sou: 'SOU 1', profitAct: '8450', profitBgt: '9100' },
    { id: 'e2', name: 'Chenor', region: 'Pahang', sou: 'SOU 2', profitAct: '6120', profitBgt: '5800' },
  ];
  const v1 = {
    id: 'v1', estateId: 'e1', date: addDays(t, -2), fieldIds: ['f1', 'f2'],
    checks: {
      f1: {
        readings: { h_int: '14', h_ffb: '8', q_loose: '3', m_out: '92' },
        manual: { 4: 'good', 7: 'good', 8: 'good', 9: 'good', 10: 'good' },
        notes: { 1: 'Interval 14 days, oil loss risk', 2: 'Loose fruit in palm circles near path 2' },
      },
      f2: {
        readings: { p_gano: 'yes', w_log: '0', f_late: '9' },
        manual: { 1: 'good', 2: 'good', 4: 'good' },
        notes: { 6: 'Ganoderma confirmed, 6 palms', 5: 'Manuring round 9 days late' },
      },
    },
  };
  const v2 = {
    id: 'v2', estateId: 'e2', date: addDays(t, -5), fieldIds: ['f4', 'f5'],
    checks: {
      f4: {
        readings: { h_int: '9', l_brk: '2.5' },
        manual: { 2: 'good', 4: 'good' },
        notes: { 9: 'Tractor T-45 breakdown' },
      },
      f5: {
        readings: { r_bridge: '6', u_cov: '82' },
        manual: { 1: 'good' },
        notes: { 8: 'Culvert C1 cracking', 4: 'Weeding coverage behind target' },
      },
    },
  };
  const actions = [
    { id: 'a1', estateId: 'e1', visitId: 'v1', fieldId: 'f1', actId: 1, text: 'Dispatch extra harvesting crew', pic: 'Mandor Ali', due: addDays(t, -1), status: 'open', createdAt: v1.date },
    { id: 'a2', estateId: 'e1', visitId: 'v1', fieldId: 'f2', actId: 6, text: 'Remove Ganoderma palms', pic: 'Assistant Div 2', due: addDays(t, 5), status: 'open', createdAt: v1.date },
    { id: 'a3', estateId: 'e2', visitId: 'v2', fieldId: 'f4', actId: 9, text: 'Repair T-45 hydraulic hose', pic: 'Workshop', due: addDays(t, -3), status: 'done', doneAt: addDays(t, -4), createdAt: v2.date },
  ];
  return { estates: estates, fields: fields, visits: [v1, v2], actions: actions };
}

// =====================================================
// UPLOAD SCREEN: pick Excel/CSV or paste from Excel
// =====================================================
function UploadScreen({ estates, fields, onImport, onDone }) {
  const [paste, setPaste] = useState('');
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [replace, setReplace] = useState(false);

  // Read the first sheet that has Estate + Field columns
  const readWorkbook = (wb) => {
    // A full estate report (Performance + Cost sheets): read it all
    if (isReportWorkbook(wb)) return readReportWorkbook(wb);
    let best = null;
    wb.SheetNames.forEach((n) => {
      if (best && !best.error) return;
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' });
      const r = readRows(rows);
      if (!best || !r.error) best = { ...r, sheet: n };
    });
    if (best && best.error) {
      best.error += '\nSheets in file: ' + wb.SheetNames.join(', ');
    }
    return best || { error: 'The file has no sheets.' };
  };

  const pickFile = async () => {
    setDone(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      setBusy(true);
      setFileName(asset.name || 'file');
      let wb;
      if (asset.file) {
        // web preview
        const buf = await asset.file.arrayBuffer();
        wb = XLSX.read(buf, { type: 'array' });
      } else {
        // phone: read the file as base64
        const b64 = await readAsBase64(asset.uri);
        if (!b64) throw new Error('the file looks empty (0 bytes). Save it again and retry.');
        wb = XLSX.read(b64, { type: 'base64' });
      }
      setResult(readWorkbook(wb));
    } catch (e) {
      setResult({ error: 'Could not read the file: ' + e.message });
    }
    setBusy(false);
  };

  const readPaste = () => {
    setDone(null);
    setFileName('Pasted data');
    if (!paste.trim()) {
      setResult({ error: 'The paste box is empty. To upload a file, use PICK EXCEL / CSV FILE above.' });
      return;
    }
    setResult(readRows(textToRows(paste)));
  };

  const doImport = () => {
    const out = applyImport(result.rows, estates, fields, replace);
    const items = result.report ? reportItems(result, out.estates, out.fields) : null;
    onImport(out.estates, out.fields, items);
    setDone({ ...out, nv: items ? items.visits.length : 0, na: items ? items.actions.length : 0 });
    setResult(null);
    setPaste('');
  };

  const shareTemplate = async () => {
    try {
      await Share.share({ message: templateHeader() });
    } catch (e) {
      // ignore
    }
  };

  const ests = result && result.rows ? [...new Set(result.rows.map((r) => r.estate))] : [];

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Hero
        mini
        eyebrow="Upload estate data"
        title="Excel, CSV or paste"
        sub="One row per field. The app finds the columns by name."
        stats={[
          { ic: 'business', v: String(estates.length), l: 'Estates' },
          { ic: 'grid', v: String(fields.length), l: 'Fields' },
          { ic: 'document-text', v: 'xlsx', l: 'csv · paste', tone: 'rnd' },
        ]}
      />

      {done && (
        <View style={[styles.result, TONE_BG.good]}>
          <Ionicons name="checkmark-circle" size={22} color={C.good} />
          <View style={{ flex: 1, gap: 6 }}>
            <T style={[styles.bold, { color: C.good }]}>
              Imported: {done.newE} new estates, {done.newF} new fields, {done.updF} fields updated
              {done.delE + done.delF > 0 ? ', ' + done.delE + ' estates and ' + done.delF + ' fields removed' : ''}
              {done.nv || done.na ? ', ' + done.nv + ' visits and ' + done.na + ' follow-ups added' : ''}.
            </T>
            <Pressable onPress={onDone}>
              <T style={styles.link}>Go to Home</T>
            </Pressable>
          </View>
        </View>
      )}

      <Section icon="cloud-upload-outline" title="1. Upload a file">
        <T style={styles.hint}>Excel (.xlsx / .xls) or CSV from your phone, Drive or email.</T>
        <CTA label={busy ? 'READING…' : 'PICK EXCEL / CSV FILE'} icon="document-attach" onPress={pickFile} />
      </Section>

      <Section icon="clipboard-outline" title="Or paste from Excel">
        <T style={styles.hint}>Select the cells in Excel (with the header row), copy, and paste here.</T>
        <TextInput
          style={[styles.input, styles.pasteBox]}
          multiline
          placeholder={'Estate\tField\tMature ha\tYield Act ...'}
          placeholderTextColor="#8A8F80"
          value={paste}
          onChangeText={setPaste}
        />
        <CTA label="READ PASTED DATA" icon="reader-outline" color={C.rnd} onPress={readPaste} />
      </Section>

      {result && result.error && (
        <View style={[styles.result, TONE_BG.att]}>
          <Ionicons name="alert-circle" size={22} color={C.att} />
          <T style={[styles.resultText, { color: C.att, flex: 1 }]}>{result.error}</T>
        </View>
      )}

      {result && result.rows && (
        <Section icon="eye-outline" title="2. Check before import">
          <T style={styles.meta}>
            {fileName}
            {result.sheet ? ' · sheet "' + result.sheet + '"' : ''}
          </T>
          <View style={styles.kv}>
            <KV label="Rows (fields)" value={String(result.rows.length)} />
            <KV label="Estates" value={String(ests.length)} />
            <KV label="Skipped rows" value={String(result.skipped)} />
            <KV label={result.report ? 'Sheets read' : 'Columns read'} value={String(result.found.length)} />
            {result.report && <KV label="Fields with cost" value={String(result.costFields)} />}
            {result.report && <KV label="Visits (PMU, agronomist)" value={String(result.visits.length)} />}
            {result.report && <KV label="Follow-ups (Mission 1)" value={String(result.actions.length)} />}
          </View>
          <T style={styles.kvLabel}>{result.report ? 'Sheets used' : 'Columns recognised'}</T>
          <View style={styles.chips}>
            {result.found.map((c) => (
              <Chip key={c} tone="good" label={c} />
            ))}
          </View>
          {result.ignored.length > 0 && (
            <>
              <T style={styles.kvLabel}>Not used</T>
              <View style={styles.chips}>
                {result.ignored.map((c, i) => (
                  <Chip key={i} tone="muted" label={String(c)} />
                ))}
              </View>
            </>
          )}
          <T style={styles.kvLabel}>First rows</T>
          {result.rows.slice(0, 6).map((r, i) => (
            <View key={i} style={styles.readRow}>
              <T style={[styles.bold, { width: 90 }]} numberOfLines={1}>{r.estate}</T>
              <T style={[styles.bold, { width: 44 }]}>{r.code}</T>
              <T style={[styles.meta, { flex: 1 }]} numberOfLines={1}>
                {(r.ha || '-') + ' ha · yield ' + (r.ypAct || '-') + ' / ' + (r.ypBgt || '-') + ' · ' + Object.keys(r.costs).length + ' costs'}
              </T>
            </View>
          ))}
          <Pressable style={[styles.switchRow, replace && styles.switchRowOn]} onPress={() => setReplace(!replace)}>
            <Ionicons name={replace ? 'checkbox' : 'square-outline'} size={22} color={replace ? C.att : C.accent} />
            <View style={{ flex: 1 }}>
              <T style={styles.bold}>Replace all data</T>
              <T style={styles.meta}>
                {replace
                  ? 'Estates and fields NOT in this file will be removed (with their visits and follow-ups). Matching ones keep their history.'
                  : 'Off: merge. Same estate/field is updated, others are kept. Blank cells keep the old value.'}
              </T>
            </View>
          </Pressable>
          <CTA
            label={(replace ? 'REPLACE WITH ' : 'IMPORT ') + result.rows.length + ' FIELDS'}
            icon="checkmark-done"
            color={replace ? C.att : C.good}
            onPress={doImport}
          />
        </Section>
      )}

      <Section icon="help-circle-outline" title="File format">
        <T style={styles.meta}>
          Needed: <T style={styles.bold}>Estate</T>, <T style={styles.bold}>Field</T>.
          {'\n'}Optional: Region, SOU, Planted, Mature ha, Yield Act, Yield Bgt, Yield LY, Profit Act, Profit Bgt (RM'000, estate level), and for each of the 12 cost elements {'"<Element> Act"'} and {'"<Element> Bgt"'} (RM/ha), e.g. "Manuring Act", "Manuring Bgt".
        </T>
        <CTA label="SHARE TEMPLATE HEADER ROW" icon="share-outline" color={C.muted} onPress={shareTemplate} />
      </Section>
    </ScrollView>
  );
}

// Read a picked file on the phone as base64 text
async function readAsBase64(uri) {
  // 1st try: Expo file system (most reliable on Android)
  try {
    const b64 = await new File(uri).base64();
    if (b64) return b64;
  } catch (e) {
    // fall back below
  }
  // 2nd try: fetch + FileReader
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error('cannot open file'));
    r.readAsDataURL(blob);
  });
}

function KV({ label, value }) {
  return (
    <View style={styles.kvItem}>
      <T style={styles.kvLabel}>{label}</T>
      <T style={styles.kvValue} numberOfLines={1}>
        {value}
      </T>
    </View>
  );
}

// =====================================================
// DATE FIELD: tap to open a calendar (no typing)
// =====================================================
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function DateField({ label, value, onChange, style }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((value || today()).slice(0, 7));

  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1;
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const shift = (n) => {
    const d = new Date(y, m + n, 1);
    setMonth(toKey(d).slice(0, 7));
  };
  const pick = (d) => {
    onChange(toKey(new Date(y, m, d)));
    setOpen(false);
  };

  return (
    <View style={[styles.field, style]}>
      {label ? <T style={styles.label}>{label}</T> : null}
      <Pressable
        style={[styles.input, styles.dateBtn]}
        onPress={() => {
          setMonth((value || today()).slice(0, 7));
          setOpen(true);
        }}>
        <Ionicons name="calendar-outline" size={17} color={C.accent} />
        <T style={styles.dateBtnText}>{value ? showDate(value) : 'Pick a date'}</T>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setOpen(false)}>
          <Pressable style={styles.calCard} onPress={() => {}}>
            <View style={styles.calHead}>
              <Pressable style={styles.iconBtn} onPress={() => shift(-1)}>
                <Ionicons name="chevron-back" size={20} color={C.ink} />
              </Pressable>
              <Text style={styles.calTitle}>
                {MONTHS[m]} {y}
              </Text>
              <Pressable style={styles.iconBtn} onPress={() => shift(1)}>
                <Ionicons name="chevron-forward" size={20} color={C.ink} />
              </Pressable>
            </View>
            <View style={styles.calGrid}>
              {WEEK.map((w, i) => (
                <T key={'w' + i} style={styles.calWeek}>{w}</T>
              ))}
              {cells.map((d, i) => {
                if (!d) return <View key={'e' + i} style={styles.calCell} />;
                const key = toKey(new Date(y, m, d));
                const on = key === value;
                const isToday = key === today();
                return (
                  <Pressable
                    key={key}
                    style={[styles.calCell, on && styles.calOn, !on && isToday && styles.calToday]}
                    onPress={() => pick(d)}>
                    <T style={[styles.calDay, on && { color: '#fff' }]}>{d}</T>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.row2}>
              <Pressable style={styles.btnGhost} onPress={() => { onChange(today()); setOpen(false); }}>
                <T style={styles.bold}>Today</T>
              </Pressable>
              <Pressable style={styles.btnGhost} onPress={() => setOpen(false)}>
                <T style={styles.bold}>Close</T>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// =====================================================
// PHOTOS: take or pick, show thumbnails, tap to view
// =====================================================
function PhotoStrip({ photos, onChange, readOnly }) {
  const [view, setView] = useState(null);
  const [msg, setMsg] = useState('');
  const list = photos || [];

  const add = async (camera) => {
    setMsg('');
    try {
      if (camera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setMsg('Camera permission is needed to take photos.');
          return;
        }
      }
      const opts = { mediaTypes: ['images'], quality: 0.4, allowsEditing: false };
      const res = camera
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled) return;
      onChange([...list, ...res.assets.map((a) => a.uri)]);
    } catch (e) {
      setMsg(camera ? 'Camera is not available here. Use Gallery.' : 'Could not open photos: ' + e.message);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      {list.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.photoRow}>
            {list.map((uri, i) => (
              <Pressable key={uri + i} onPress={() => setView(uri)}>
                <Image source={{ uri: uri }} style={styles.thumb} />
                {!readOnly && (
                  <Pressable
                    style={styles.thumbX}
                    hitSlop={8}
                    onPress={() => onChange(list.filter((x, j) => j !== i))}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
      {!readOnly && (
        <View style={styles.row2}>
          <Pressable style={styles.photoBtn} onPress={() => add(true)}>
            <Ionicons name="camera" size={17} color={C.accent} />
            <T style={styles.photoBtnText}>Camera</T>
          </Pressable>
          <Pressable style={styles.photoBtn} onPress={() => add(false)}>
            <Ionicons name="images" size={17} color={C.accent} />
            <T style={styles.photoBtnText}>Gallery</T>
          </Pressable>
        </View>
      )}
      {msg ? <T style={styles.hint}>{msg}</T> : null}
      <Modal visible={!!view} transparent animationType="fade" onRequestClose={() => setView(null)}>
        <Pressable style={styles.photoView} onPress={() => setView(null)}>
          {view && <Image source={{ uri: view }} style={styles.photoBig} resizeMode="contain" />}
          <T style={styles.photoClose}>Tap to close</T>
        </Pressable>
      </Modal>
    </View>
  );
}

// =====================================================
// SETTINGS: change trigger limits without coding
// =====================================================
function SettingsScreen({ settings, setSettings, counts, onClearAll }) {
  const [openAct, setOpenAct] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const s = settings || {};
  const setTop = (k, v) => setSettings({ ...s, [k]: v });
  const setRule = (rid, k, v) => {
    const rules = { ...(s.rules || {}) };
    rules[rid] = { ...(rules[rid] || {}), [k]: v };
    setSettings({ ...s, rules: rules });
  };
  const val = (rid, k) => {
    const o = (s.rules || {})[rid] || {};
    return o[k] !== undefined ? o[k] : '';
  };
  const changed = Object.keys(s.rules || {}).length + ['cost', 'yieldRed', 'yieldAmber'].filter((k) => s[k] !== undefined && s[k] !== '').length;

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Hero
        mini
        eyebrow="Settings"
        title="Trigger limits"
        sub="Leave a box empty to use the default (shown in grey)."
        stats={[
          { ic: 'cash', v: LIMITS.cost + '%', l: 'Cost limit', tone: 'att' },
          { ic: 'leaf', v: LIMITS.yieldRed + '%', l: 'Yield action', tone: 'att' },
          { ic: 'options', v: String(changed), l: 'Changed', tone: changed ? 'mon' : 'good' },
        ]}
      />

      <Section icon="cash-outline" title="Cost & yield">
        <Field
          label={'Cost over budget = Action when above (%) · default ' + DEFAULT_LIMITS.cost}
          full
          keyboardType="numeric"
          placeholder={String(DEFAULT_LIMITS.cost)}
          value={s.cost || ''}
          onChangeText={(t) => setTop('cost', t)}
        />
        <View style={styles.row2}>
          <Field
            label={'Yield Action below (%)'}
            keyboardType="numeric"
            placeholder={String(DEFAULT_LIMITS.yieldRed)}
            value={s.yieldRed || ''}
            onChangeText={(t) => setTop('yieldRed', t)}
          />
          <Field
            label={'Yield Monitor below (%)'}
            keyboardType="numeric"
            placeholder={String(DEFAULT_LIMITS.yieldAmber)}
            value={s.yieldAmber || ''}
            onChangeText={(t) => setTop('yieldAmber', t)}
          />
        </View>
      </Section>

      <Section icon="flash-outline" title="Activity triggers">
        <T style={styles.hint}>Tap an activity to change its Action and Monitor numbers.</T>
        {ACTIVITIES.map((a) => {
          const isOpen = openAct === a.id;
          const nums = a.rules.filter((r) => r.op !== 'yes');
          return (
            <View key={a.id} style={styles.rcardCol}>
              <Pressable style={styles.setHead} onPress={() => setOpenAct(isOpen ? null : a.id)}>
                <Ionicons name={a.icon} size={18} color={C.accent} />
                <T style={[styles.bold, { flex: 1 }]}>{no2(a.id)}. {a.name}</T>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
              </Pressable>
              {isOpen &&
                nums.map((r) => (
                  <View key={r.id} style={{ gap: 4 }}>
                    <T style={styles.ruleName}>
                      {r.name} ({r.unit}) · {r.op === '>' ? 'higher is worse' : 'lower is worse'}
                    </T>
                    <View style={styles.row2}>
                      <Field
                        label="Action"
                        keyboardType="numeric"
                        placeholder={String(DEFAULT_RULES[r.id].red)}
                        value={val(r.id, 'red')}
                        onChangeText={(t) => setRule(r.id, 'red', t)}
                      />
                      <Field
                        label="Monitor"
                        keyboardType="numeric"
                        placeholder={String(DEFAULT_RULES[r.id].amber)}
                        value={val(r.id, 'amber')}
                        onChangeText={(t) => setRule(r.id, 'amber', t)}
                      />
                    </View>
                  </View>
                ))}
            </View>
          );
        })}
      </Section>

      <CTA label="RESET LIMITS TO DEFAULT" icon="refresh" color={C.muted} onPress={() => setSettings({})} />

      <Section icon="trash-outline" title="Clear all data">
        <T style={styles.meta}>
          Removes {counts.estates} estates, {counts.fields} fields, {counts.visits} visits and {counts.actions} follow-ups
          (including photos) from this phone. Trigger limits are kept. This cannot be undone.
        </T>
        {confirm ? (
          <View style={styles.confirm}>
            <T style={styles.confirmText}>Are you sure? Everything will be deleted.</T>
            <View style={styles.row2}>
              <Pressable style={styles.btnGhost} onPress={() => setConfirm(false)}>
                <T style={styles.bold}>Cancel</T>
              </Pressable>
              <Pressable style={styles.btnDanger} onPress={onClearAll}>
                <T style={[styles.bold, { color: '#fff' }]}>Yes, clear all</T>
              </Pressable>
            </View>
          </View>
        ) : (
          <CTA label="CLEAR ALL DATA" icon="trash" color={C.att} onPress={() => setConfirm(true)} />
        )}
      </Section>
    </ScrollView>
  );
}

// =====================================================
// DROPDOWN: tap to open a list (with search)
// =====================================================
function Dropdown({ label, value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const sel = options.find((o) => o.value === value);
  const list = options.filter((o) => norm(o.label).includes(norm(q)));
  return (
    <View style={styles.field}>
      {label ? <T style={styles.label}>{label}</T> : null}
      <Pressable style={[styles.input, styles.ddBtn]} onPress={() => setOpen(true)}>
        <T style={[styles.ddText, !sel && { color: '#8A8F80' }]} numberOfLines={1}>
          {sel ? sel.label : placeholder || 'Select'}
        </T>
        <Ionicons name="chevron-down" size={18} color={C.accent} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setOpen(false)}>
          <Pressable style={styles.ddCard} onPress={() => {}}>
            <Text style={styles.calTitle}>{label || 'Select'}</Text>
            {options.length > 6 && (
              <TextInput
                style={styles.input}
                placeholder="Search"
                placeholderTextColor="#8A8F80"
                value={q}
                onChangeText={setQ}
              />
            )}
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {list.map((o) => {
                const on = o.value === value;
                return (
                  <Pressable
                    key={String(o.value)}
                    style={[styles.ddRow, on && styles.ddRowOn]}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                      setQ('');
                    }}>
                    <View style={{ flex: 1 }}>
                      <T style={[styles.bold, on && { color: C.accent }]}>{o.label}</T>
                      {o.sub ? <T style={styles.meta}>{o.sub}</T> : null}
                    </View>
                    {o.tone && <View style={[styles.resDot, { backgroundColor: TONE_FG[o.tone] }]} />}
                    {on && <Ionicons name="checkmark" size={18} color={C.accent} />}
                  </Pressable>
                );
              })}
              {list.length === 0 && <T style={styles.hint}>Nothing found.</T>}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// =====================================================
// ALL TRIGGERS FOR ONE FIELD
// =====================================================
function fieldTriggers(f, visits, actions) {
  const out = [];
  const ys = yieldStatus(f);
  if (ys === 'action' || ys === 'monitor') {
    out.push({ key: 'y', st: ys, icon: 'trending-down', text: 'Yield below budget', sub: f.ypAct + ' vs ' + f.ypBgt + ' mt/ha (' + pctText(yieldVar(f)) + ')' });
  }
  COSTS.forEach((name, i) => {
    const v = variance(costOf(f, i).act, costOf(f, i).bgt);
    if (v !== null && v > LIMITS.cost) {
      out.push({ key: 'c' + i, st: 'action', icon: 'cash', text: name + ' cost over budget', sub: money(costOf(f, i).act) + ' vs ' + money(costOf(f, i).bgt) + ' RM/ha (' + pctText(v) + ')' });
    }
  });
  const lv = latestFieldVisit(visits, f.id);
  if (lv) {
    const ck = checkOf(lv, f.id);
    ACTIVITIES.forEach((a) => {
      const st = actStatus(ck, a);
      if (st === 'action' || st === 'monitor') {
        out.push({ key: 'a' + a.id, st: st, icon: a.icon, text: no2(a.id) + '. ' + a.name, sub: ((ck.notes || {})[a.id] || 'Visit ' + showDate(lv.date)), photos: (ck.photos || {})[a.id] || [] });
      }
    });
  }
  actions
    .filter((x) => x.fieldId === f.id && x.status !== 'done')
    .forEach((x) => {
      out.push({ key: 'f' + x.id, st: isOverdue(x) ? 'action' : 'monitor', icon: isOverdue(x) ? 'time' : 'flag', text: 'Follow-up: ' + x.text, sub: (isOverdue(x) ? 'Overdue · due ' : 'Due ') + showDate(x.due) + ' · PIC ' + (x.pic || '-') });
    });
  return out.sort((a, b) => RANK[b.st] - RANK[a.st]);
}

// =====================================================
// FILTERS: Region > SOU > Estate > Field
// =====================================================
const ALL = '__all__';

function uniq(list) {
  return [...new Set(list.filter(Boolean))].sort();
}

// Estates that match the chosen Region and SOU
function estatesIn(estates, sel) {
  return estates.filter(
    (e) => (!sel.region || e.region === sel.region) && (!sel.sou || e.sou === sel.sou)
  );
}

function Filters({ estates, fields, visits, actions, sel, onChange }) {
  const regions = uniq(estates.map((e) => e.region));
  const sous = uniq(estates.filter((e) => !sel.region || e.region === sel.region).map((e) => e.sou));
  const es = estatesIn(estates, sel);
  const estate = es.find((e) => e.id === sel.estateId) || null;
  const ef = estate ? fields.filter((f) => f.estateId === estate.id) : [];

  const fieldOpts = [{ value: ALL, label: 'All fields (estate summary)' }].concat(
    ef.map((f) => {
      const t = fieldTriggers(f, visits, actions);
      const red = countIn(t, 'action');
      const amb = countIn(t, 'monitor');
      return {
        value: f.id,
        label: 'Field ' + f.code,
        sub: (f.year ? 'PY ' + f.year + ' · ' : '') + (f.ha || '-') + ' ha · ' + (red ? red + ' action' : amb ? amb + ' monitor' : 'all good'),
        tone: red ? 'att' : amb ? 'mon' : 'good',
      };
    })
  );

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.row2}>
        <Dropdown
          label="Region"
          value={sel.region || ALL}
          options={[{ value: ALL, label: 'All regions' }].concat(
            regions.map((r) => ({ value: r, label: r, sub: estates.filter((e) => e.region === r).length + ' estates' }))
          )}
          onChange={(v) => onChange({ region: v === ALL ? null : v })}
        />
        <Dropdown
          label="SOU"
          value={sel.sou || ALL}
          options={[{ value: ALL, label: 'All SOU' }].concat(
            sous.map((u) => ({ value: u, label: u, sub: estates.filter((e) => e.sou === u).length + ' estates' }))
          )}
          onChange={(v) => onChange({ region: sel.region, sou: v === ALL ? null : v })}
        />
      </View>
      <View style={styles.row2}>
        <Dropdown
          label="Estate"
          value={estate ? estate.id : ALL}
          options={[{ value: ALL, label: 'All estates (summary)' }].concat(
            es.map((e) => ({
              value: e.id,
              label: e.name,
              sub: [e.sou, fields.filter((f) => f.estateId === e.id).length + ' fields'].filter(Boolean).join(' · '),
            }))
          )}
          onChange={(v) => onChange({ region: sel.region, sou: sel.sou, estateId: v === ALL ? null : v })}
        />
        <Dropdown
          label="Field"
          value={sel.fieldId || ALL}
          placeholder={estate ? 'All fields' : 'Pick estate first'}
          options={estate ? fieldOpts : []}
          onChange={(v) => onChange({ region: sel.region, sou: sel.sou, estateId: estate ? estate.id : null, fieldId: v === ALL ? null : v })}
        />
      </View>
    </View>
  );
}

// =====================================================
// LOOKUP: Region / SOU / Estate / Field views
// =====================================================
function LookupScreen(p) {
  const { estates, fields, sel, setSel } = p;
  const es = estatesIn(estates, sel);
  const estate = es.find((e) => e.id === sel.estateId) || null;
  const ef = estate ? fields.filter((f) => f.estateId === estate.id) : [];
  const field = ef.find((f) => f.id === sel.fieldId) || null;

  if (estates.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Empty title="No estates yet" text="Upload your estate data or load the example data on Home." />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.selBar}>
        <Filters {...p} sel={sel} onChange={setSel} />
      </View>

      {field ? (
        <FieldLookup {...p} estate={estate} field={field} />
      ) : estate ? (
        <EstateLookup {...p} estate={estate} ef={ef} onPickField={(id) => setSel({ ...sel, estateId: estate.id, fieldId: id })} />
      ) : (
        <GroupLookup {...p} es={es} onPickEstate={(id) => setSel({ ...sel, estateId: id, fieldId: null })} />
      )}
    </ScrollView>
  );
}

// Summary for a Region / SOU (or all estates)
function GroupLookup(p) {
  const { es, fields, visits, actions, sel } = p;
  const title = sel.sou || sel.region || 'All estates';
  const rows = es
    .map((e) => {
      const ef = fields.filter((f) => f.estateId === e.id);
      let red = 0;
      let amb = 0;
      ef.forEach((f) => {
        const t = fieldTriggers(f, visits, actions);
        red += countIn(t, 'action');
        amb += countIn(t, 'monitor');
      });
      return { e: e, ef: ef, red: red, amb: amb, ey: estateYield(ef), pv: profitVar(e) };
    })
    .sort((a, b) => b.red - a.red || b.amb - a.amb);
  const allF = fields.filter((f) => es.some((e) => e.id === f.estateId));
  const gy = estateYield(allF);
  let pa = 0;
  let pb = 0;
  es.forEach((e) => {
    if (num(e.profitAct) !== null && num(e.profitBgt) !== null) {
      pa += num(e.profitAct);
      pb += num(e.profitBgt);
    }
  });
  const gpv = pb ? ((pa - pb) / pb) * 100 : null;
  const totalRed = rows.reduce((s, r) => s + r.red, 0);
  const maxP = rows.reduce((m, r) => Math.max(m, num(r.e.profitAct) || 0, num(r.e.profitBgt) || 0), 1);

  return (
    <>
      <Hero
        mini
        eyebrow={sel.sou ? 'SOU summary' : sel.region ? 'Region summary' : 'All estates'}
        title={title}
        sub={es.length + ' estates · ' + allF.length + ' fields' + (gy ? ' · ' + gy.ha.toFixed(0) + ' mature ha' : '')}
        stats={[
          { ic: 'alert-circle', v: String(totalRed), l: 'Action', tone: 'att' },
          { ic: 'leaf', v: gy ? pctText(gy.v) : '-', l: 'Yield var', tone: gy && gy.v < LIMITS.yieldAmber ? 'att' : 'good' },
          { ic: 'trending-up', v: pctText(gpv), l: 'Profit var', tone: gpv !== null && gpv < 0 ? 'att' : 'good' },
        ]}
      />
      <Section icon="podium-outline" title="Estates by urgency" right={<T style={styles.hint}>Tap to open</T>}>
        {rows.length === 0 && <T style={styles.hint}>No estates in this selection.</T>}
        {rows.map((r) => (
          <Pressable key={r.e.id} style={styles.rcard} onPress={() => p.onPickEstate(r.e.id)}>
            <View style={[styles.estBox, r.red ? { backgroundColor: C.att } : null]}>
              <Text style={styles.estBoxText}>{r.e.name.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rcardTitle}>{r.e.name}</Text>
              <T style={styles.meta} numberOfLines={1}>
                {[r.e.sou, r.ef.length + ' fields', r.ey ? 'yield ' + pctText(r.ey.v) : null, 'profit ' + pctText(r.pv)].filter(Boolean).join(' · ')}
              </T>
              <View style={styles.chips}>
                {r.red > 0 && <Chip tone="att" dot label={r.red + ' action'} />}
                {r.amb > 0 && <Chip tone="mon" dot label={r.amb + ' monitor'} />}
                {r.red + r.amb === 0 && <Chip tone="good" dot label="All clear" />}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Pressable>
        ))}
      </Section>
      {rows.some((r) => num(r.e.profitAct) !== null) && (
        <Section icon="bar-chart-outline" title="Profit by estate" right={<T style={styles.hint}>YTD</T>}>
          {rows
            .filter((r) => num(r.e.profitAct) !== null)
            .map((r) => (
              <Bar
                key={r.e.id}
                label={r.e.name + '  ' + rmMil(r.e.profitAct)}
                value={num(r.e.profitAct)}
                max={maxP}
                marker={num(r.e.profitBgt) === null ? undefined : num(r.e.profitBgt)}
                color={r.pv !== null && r.pv < 0 ? C.att : C.good}
                right={pctText(r.pv)}
              />
            ))}
          <T style={styles.hint}>Bar = actual profit. Black line = budget.</T>
        </Section>
      )}
    </>
  );
}

function FieldLookup(p) {
  const { field, estate, visits, actions } = p;
  const trig = fieldTriggers(field, visits, actions);
  const red = countIn(trig, 'action');
  const amb = countIn(trig, 'monitor');
  const ys = yieldStatus(field);
  const lv = latestFieldVisit(visits, field.id);
  const ck = lv ? checkOf(lv, field.id) : null;
  const fa = actions.filter((a) => a.fieldId === field.id);
  const maxY = Math.max(num(field.ypAct) || 0, num(field.ypBgt) || 0, num(field.ypLy) || 0, 1);
  const over = costAlerts(field).length;

  return (
    <>
      <Hero
        mini
        eyebrow={estate.name}
        title={'Field ' + field.code}
        sub={(field.year ? 'Planted ' + field.year + ' · ' : '') + (field.ha || '-') + ' mature ha'}
        stats={[
          { ic: 'alert-circle', v: String(red), l: 'Action', tone: 'att' },
          { ic: 'warning', v: String(amb), l: 'Monitor', tone: 'mon' },
          { ic: 'leaf', v: pctText(yieldVar(field)), l: 'Yield var', tone: ys ? STATUS[ys].tone : null },
        ]}
      />

      {trig.length > 0 ? (
        <View style={styles.exc}>
          <View style={styles.excHead}>
            <View style={[styles.hic, { backgroundColor: C.att }]}>
              <Ionicons name="alert" size={17} color="#fff" />
            </View>
            <Text style={styles.excTitle}>TRIGGERED IN THIS FIELD</Text>
            <View style={{ flex: 1 }} />
            <View style={styles.excCount}>
              <T style={styles.excCountText}>{trig.length}</T>
            </View>
          </View>
          {trig.map((t) => (
            <View key={t.key} style={styles.exRow}>
              <View style={[styles.exIc, TONE_BG[STATUS[t.st].tone]]}>
                <Ionicons name={t.icon} size={19} color={TONE_FG[STATUS[t.st].tone]} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <T style={styles.exTitle}>{t.text}</T>
                <T style={styles.meta}>{t.sub}</T>
                {t.photos && t.photos.length > 0 && <PhotoStrip photos={t.photos} readOnly />}
              </View>
              <Chip tone={STATUS[t.st].tone} dot label={STATUS[t.st].label} />
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.result, TONE_BG.good]}>
          <Ionicons name="checkmark-circle" size={22} color={C.good} />
          <T style={[styles.bold, { color: C.good, flex: 1 }]}>All clear. Nothing triggered in this field.</T>
        </View>
      )}

      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <CTA label="NEW VISIT HERE" icon="add" onPress={() => p.onNewVisit(estate.id, [field.id])} />
        </View>
        <View style={{ flex: 1 }}>
          <CTA label="EDIT DATA" icon="create" color={C.muted} onPress={() => p.onOpenField(field.id, 'Details')} />
        </View>
      </View>

      <Section icon="leaf-outline" title="Yield YTD" right={<T style={styles.hint}>mt/ha</T>}>
        {num(field.ypAct) === null ? (
          <T style={styles.hint}>No yield data yet.</T>
        ) : (
          <>
            <Bar label="Actual" value={num(field.ypAct)} max={maxY} color={ys ? TONE_FG[STATUS[ys].tone] : C.good} right={field.ypAct + ' (' + pctText(yieldVar(field)) + ')'} />
            <Bar label="Budget" value={num(field.ypBgt) || 0} max={maxY} color={C.muted} right={field.ypBgt || '-'} />
            <Bar label="Last year" value={num(field.ypLy) || 0} max={maxY} color={C.rnd} right={field.ypLy || '-'} />
          </>
        )}
      </Section>

      <Section icon="cash-outline" title="Cost" right={<T style={[styles.hint, over && { color: C.att }]}>{over} of 12 over budget</T>}>
        <CostMini obj={field} />
      </Section>

      <Section icon="calendar-outline" title={lv ? 'Latest visit · ' + showDate(lv.date) : 'Latest visit'}>
        {!lv ? (
          <T style={styles.hint}>This field has not been visited yet.</T>
        ) : (
          <View style={styles.actGrid}>
            {ACTIVITIES.map((a) => {
              const st = actStatus(ck, a);
              const tone = st ? STATUS[st].tone : 'muted';
              return (
                <Pressable key={a.id} style={[styles.actTile, TONE_BG[tone]]} onPress={() => p.onOpenVisit(lv.id)}>
                  <Ionicons name={a.icon} size={16} color={TONE_FG[tone]} />
                  <T style={[styles.actTileText, { color: TONE_FG[tone] }]} numberOfLines={2}>
                    {no2(a.id)} {a.name}
                  </T>
                </Pressable>
              );
            })}
          </View>
        )}
      </Section>

      <Section icon="flag-outline" title="Follow-ups">
        {fa.length === 0 ? (
          <T style={styles.hint}>No follow-ups for this field.</T>
        ) : (
          sortActions(fa).map((a) => <ActionRow key={a.id} a={a} onSave={p.onSaveAction} showAct />)
        )}
      </Section>
    </>
  );
}

// Compact list of the 12 costs (bar = actual, line = budget)
function CostMini({ obj }) {
  let max = 1;
  COSTS.forEach((n, i) => {
    max = Math.max(max, num(costOf(obj, i).act) || 0, num(costOf(obj, i).bgt) || 0);
  });
  const rows = COSTS.map((name, i) => ({ name: name, c: costOf(obj, i) })).filter((r) => num(r.c.act) !== null);
  if (!rows.length) return <T style={styles.hint}>No cost data yet.</T>;
  return rows.map((r) => {
    const v = variance(r.c.act, r.c.bgt);
    return (
      <Bar
        key={r.name}
        label={r.name + '  ' + money(r.c.act)}
        value={num(r.c.act)}
        max={max}
        marker={num(r.c.bgt) === null ? undefined : num(r.c.bgt)}
        color={v !== null && v > LIMITS.cost ? C.att : v !== null && v > 0 ? C.mon : C.good}
        right={pctText(v)}
      />
    );
  });
}

function EstateLookup(p) {
  const { estate, ef, visits, actions } = p;
  const ey = estateYield(ef);
  const pv = profitVar(estate);
  const rows = ef
    .map((f) => {
      const t = fieldTriggers(f, visits, actions);
      return { f: f, t: t, red: countIn(t, 'action'), amb: countIn(t, 'monitor') };
    })
    .sort((a, b) => b.red - a.red || b.amb - a.amb);
  const totalRed = rows.reduce((s, r) => s + r.red, 0);

  return (
    <>
      <Hero
        mini
        eyebrow="Estate summary"
        title={estate.name}
        sub={ef.length + ' fields · ' + (ey ? ey.ha.toFixed(1) + ' mature ha' : 'no area yet')}
        stats={[
          { ic: 'alert-circle', v: String(totalRed), l: 'Action', tone: 'att' },
          { ic: 'leaf', v: ey ? pctText(ey.v) : '-', l: 'Yield var', tone: ey && ey.v < LIMITS.yieldAmber ? 'att' : 'good' },
          { ic: 'trending-up', v: pctText(pv), l: 'Profit var', tone: pv !== null && pv < 0 ? 'att' : 'good' },
        ]}
      />
      <Section icon="podium-outline" title="Fields by urgency" right={<T style={styles.hint}>Tap to open</T>}>
        {rows.length === 0 && <T style={styles.hint}>No fields yet.</T>}
        {rows.map((r) => {
          const ys = yieldStatus(r.f);
          return (
            <Pressable key={r.f.id} style={styles.rcard} onPress={() => p.onPickField(r.f.id)}>
              <View style={[styles.fieldBox, r.red ? TONE_BG.att : r.amb ? TONE_BG.mon : TONE_BG.good]}>
                <Text style={[styles.fieldBoxText, { color: r.red ? C.att : r.amb ? C.mon : C.good }]}>{r.f.code}</Text>
                <T style={styles.fieldBoxSub}>{r.f.ha ? r.f.ha + ' ha' : ''}</T>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={styles.bold} numberOfLines={1}>
                  {r.t.length ? r.t[0].text : 'All clear'}
                </T>
                <View style={styles.chips}>
                  {r.red > 0 && <Chip tone="att" dot label={r.red + ' action'} />}
                  {r.amb > 0 && <Chip tone="mon" dot label={r.amb + ' monitor'} />}
                  {ys && <Chip tone={STATUS[ys].tone} label={'Yield ' + pctText(yieldVar(r.f))} />}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </Pressable>
          );
        })}
      </Section>
    </>
  );
}

// =====================================================
// READ A FULL ESTATE REPORT WORKBOOK (no template needed)
// e.g. "Field Assessment" workbook with sheets:
// Performance, Performance Estate, P&L, <Estate> Cost,
// Field Assessment, Agronomist Visit, Mission 1 Tracker
// =====================================================
const MONTH_NO = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function sheetRows(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
}

function findSheet(wb, name) {
  return wb.SheetNames.find((n) => norm(n) === norm(name));
}

// Find the header row that has all these words, return column finder
function findHeader(rows, words, from) {
  for (let i = from || 0; i < Math.min(rows.length, 400); i++) {
    const cells = (rows[i] || []).map(norm);
    if (words.every((w) => cells.includes(norm(w)))) {
      const col = (key, not) => {
        const k = norm(key);
        return cells.findIndex((c) => c.startsWith(k) && (!not || !c.includes(norm(not))));
      };
      return { i: i, col: col };
    }
  }
  return null;
}

function cellNum(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const s = String(v || '').replace(/[^0-9.\-]/g, '');
  if (!s || s === '-' || s === '.') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function numText(v, dp) {
  const n = cellNum(v);
  if (n === null) return '';
  return String(Math.round(n * Math.pow(10, dp)) / Math.pow(10, dp));
}

// Excel date (serial number / text / Date) -> 'YYYY-MM-DD'
function cellDate(v) {
  if (v instanceof Date) return toKey(v);
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return d.y + '-' + String(d.m).padStart(2, '0') + '-' + String(d.d).padStart(2, '0');
  }
  const s = String(v || '');
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  const day = s.match(/\b(\d{1,2})(st|nd|rd|th)?\b/);
  const mon = s.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/);
  const yr = s.match(/\b(20\d{2})\b/);
  if (day && mon && yr) {
    return yr[1] + '-' + String(MONTH_NO[mon[1]]).padStart(2, '0') + '-' + String(Number(day[1])).padStart(2, '0');
  }
  return '';
}

function firstLine(v, max) {
  const s = String(v || '').split(/\r?\n/).map((x) => x.trim()).filter((x) => x)[0] || '';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// Which of the 10 activities a finding belongs to
function activityFor(text) {
  const t = norm(text);
  if (/ganoderma|pd|pest|disease|rat|bagworm|beetle/.test(t)) return 6;
  if (/manur|fertili|nutri/.test(t)) return 5;
  if (/water|flood|drain/.test(t)) return 7;
  if (/road|access|bridge|fieldcondition|rehab/.test(t)) return 8;
  if (/transport|lorry|vehicle|machine/.test(t)) return 9;
  if (/canopy|prun|upkeep|weed|sanitation|circle|path/.test(t)) return 4;
  if (/loosefruit|quality|oer|ripe|recovery/.test(t)) return 2;
  if (/harvest|round|cropping/.test(t)) return 1;
  if (/manpower|labour|worker|productivity/.test(t)) return 3;
  return 10;
}

// Field cost line -> one of the 12 cost elements (index in COSTS)
function costIndex(level, n2, n4, n6) {
  const a = norm(n2);
  if (level === '2d') {
    if (a.includes('harvest')) return 0;
    if (a.includes('transport')) return 1;
    if (a.includes('manuring')) return 2;
    return -1;
  }
  if (level === '4d' && a.includes('matureupkeep')) {
    const b = norm(n4);
    if (b.includes('weeding')) return 3;
    if (b.includes('sanitation') || b.includes('pruning')) return 4;
    if (b.includes('pandd') || b.includes('pest')) return 5;
    if (b.includes('water') || b.includes('soil')) return 6;
    return 7;
  }
  if (level === '6d' && a.includes('costallocation')) {
    const c = norm(n6);
    if (c.includes('labour')) return 9;
    if (c.includes('road')) return 10;
    if (c.includes('depreciation')) return 11;
    return 8;
  }
  return -1;
}

// Is this an estate report workbook?
function isReportWorkbook(wb) {
  return !!(findSheet(wb, 'Performance') && wb.SheetNames.some((n) => / cost$/i.test(n.trim())));
}

function readReportWorkbook(wb) {
  const used = [];
  const est = {}; // estate key -> info
  const ekey = (name) => norm(name);

  // 1. Estates: code + SOU (Performance Estate)
  const peName = findSheet(wb, 'Performance Estate');
  const visitDates = {};
  if (peName) {
    const rows = sheetRows(wb, peName);
    const h = findHeader(rows, ['Estate', 'SOU']);
    if (h) {
      used.push(peName);
      const cE = h.col('estate', 'code');
      const cCode = h.col('estatecode');
      const cSou = h.col('sou');
      for (let i = h.i + 1; i < rows.length; i++) {
        const name = String(rows[i][cE] || '').trim();
        if (!name) break;
        est[ekey(name)] = {
          name: name,
          code: String(rows[i][cCode] || '').trim(),
          sou: String(rows[i][cSou] || '').trim(),
          region: '',
          profitAct: '',
          profitBgt: '',
        };
      }
    }
    const hv = findHeader(rows, ['Estate', 'Visit Date']);
    if (hv) {
      const cE = hv.col('estate');
      const cD = hv.col('visitdate');
      for (let i = hv.i + 1; i < rows.length; i++) {
        const name = String(rows[i][cE] || '').trim();
        if (!name) break;
        visitDates[ekey(name)] = cellDate(rows[i][cD]);
      }
    }
  }

  // 2. Fields + yield (Performance)
  const perfName = findSheet(wb, 'Performance');
  const fields = {}; // ref -> field
  {
    const rows = sheetRows(wb, perfName);
    const h = findHeader(rows, ['Estate', 'Field ID']);
    if (!h) return { error: 'Sheet "Performance" has no "Estate" + "Field ID" header.' };
    used.push(perfName);
    const c = {
      e: h.col('estate'), id: h.col('fieldid'), py: h.col('planted'), ha: h.col('mature'),
      a: h.col('ytdactual'), b: h.col('ytdbudget'), ly: h.col('ytdprior'),
    };
    for (let i = h.i + 1; i < rows.length; i++) {
      const r = rows[i];
      const name = String(r[c.e] || '').trim();
      const ref = String(r[c.id] || '').trim().toUpperCase();
      if (!name || !ref || norm(name) === 'estate') continue;
      if (!est[ekey(name)]) est[ekey(name)] = { name: name, code: '', sou: '', region: '', profitAct: '', profitBgt: '' };
      const e = est[ekey(name)];
      // short code: "E1342016A" -> "2016A" (drop the estate code)
      const code = e.code && ref.startsWith(e.code.toUpperCase()) && ref.length > e.code.length
        ? ref.slice(e.code.length)
        : ref;
      fields[ref] = {
        estate: e.name, code: code, ref: ref,
        year: numText(r[c.py], 0), ha: numText(r[c.ha], 2),
        ypAct: numText(r[c.a], 3), ypBgt: numText(r[c.b], 3), ypLy: numText(r[c.ly], 3),
        costs: {},
      };
    }
  }
  const fieldOf = (ref) => fields[String(ref || '').trim().toUpperCase()];

  // 3. Profit + region (P&L)
  const plName = findSheet(wb, 'P&L');
  if (plName) {
    const rows = sheetRows(wb, plName);
    const h = findHeader(rows, ['P&L Line']);
    if (h) {
      used.push(plName);
      const gp = rows.find((r) => norm(r[0]) === 'grossprofit') || rows.find((r) => norm(r[0]) === 'cropprofit');
      Object.values(est).forEach((e) => {
        const k = norm(e.name) + 'ytd';
        const col = (rows[h.i] || []).findIndex((x) => norm(x).startsWith(k) && norm(x).includes('rmm') && !norm(x).includes('per'));
        if (gp && col >= 0 && cellNum(gp[col]) !== null) {
          e.profitAct = String(Math.round(cellNum(gp[col]) * 1000)); // RM M -> RM'000
        }
      });
    }
    // Region name = column after the estates in "Measure | <estates> | STR | UMY"
    const hm = findHeader(rows, ['Measure']);
    if (hm) {
      const head = rows[hm.i].map((x) => String(x || '').trim());
      let last = -1;
      head.forEach((x, j) => {
        if (est[ekey(x)]) last = j;
      });
      const region = last >= 0 ? head[last + 1] : '';
      if (region) Object.values(est).forEach((e) => (e.region = region));
    }
  }

  // 4. Field costs (<Estate> Cost sheets), RM'000 -> RM/ha
  let costFields = 0;
  wb.SheetNames.filter((n) => / cost$/i.test(n.trim())).forEach((sn) => {
    const rows = sheetRows(wb, sn);
    const h = findHeader(rows, ['Field', 'Level']);
    if (!h) return;
    used.push(sn);
    const c = {
      f: h.col('field'), lv: h.col('level'), n2: h.col('costelement2d'), n4: h.col('costelement4d'),
      n6: h.col('costelement6d'), a: h.col('ytdactual'), b: h.col('ytdbudget'),
    };
    const sums = {};
    for (let i = h.i + 1; i < rows.length; i++) {
      const r = rows[i];
      const fid = String(r[c.f] || '').trim().toUpperCase();
      if (!fid) continue;
      const k = costIndex(norm(r[c.lv]), r[c.n2], r[c.n4], r[c.n6]);
      if (k < 0) continue;
      const s = (sums[fid] = sums[fid] || {});
      s[k] = s[k] || { a: 0, b: 0 };
      s[k].a += cellNum(r[c.a]) || 0;
      s[k].b += cellNum(r[c.b]) || 0;
    }
    Object.keys(sums).forEach((fid) => {
      const f = fieldOf(fid);
      const ha = f ? cellNum(f.ha) : null;
      if (!f || !ha) return;
      costFields++;
      Object.keys(sums[fid]).forEach((k) => {
        f.costs[k] = {
          act: String(Math.round((sums[fid][k].a * 1000) / ha)),
          bgt: String(Math.round((sums[fid][k].b * 1000) / ha)),
        };
      });
    });
  });

  // 5. Visits: PMU upkeep scores (Field Assessment)
  const visits = [];
  const faName = findSheet(wb, 'Field Assessment');
  if (faName) {
    const rows = sheetRows(wb, faName);
    const h = findHeader(rows, ['Estate', 'Field ID', 'Circle']);
    if (h) {
      used.push(faName);
      const c = {
        e: h.col('estate'), id: h.col('fieldid'), st: h.col('pmustatus'), rem: h.col('pmupictorial'),
        sc: [h.col('circle', 'sanitation'), h.col('path'), h.col('circlesanitation'), h.col('selectiveweeding'), h.col('pruning')],
      };
      const scName = ['Circle', 'Path', 'Circle sanitation', 'Selective weeding', 'Pruning'];
      const byEst = {};
      for (let i = h.i + 1; i < rows.length; i++) {
        const r = rows[i];
        const f = fieldOf(r[c.id]);
        if (!f || !norm(r[c.st]).startsWith('assessed')) continue;
        const sc = c.sc.map((j) => cellNum(r[j]));
        const ok = sc.filter((x) => x !== null);
        if (!ok.length) continue;
        const avg = ok.reduce((s, x) => s + x, 0) / ok.length;
        const st = avg < 0.85 ? 'action' : avg < 0.9 ? 'monitor' : 'good';
        const low = sc.map((x, j) => (x !== null && x < 0.85 ? scName[j] + ' ' + Math.round(x * 100) + '%' : null)).filter((x) => x);
        const note = 'PMU ' + Math.round(avg * 100) + '%' + (low.length ? ' · low: ' + low.join(', ') : '') +
          (r[c.rem] ? ' · ' + firstLine(r[c.rem], 160) : '');
        const k = ekey(f.estate);
        const v = (byEst[k] = byEst[k] || { key: 'pmu-' + k, estate: f.estate, title: 'PMU upkeep assessment', date: visitDates[k] || '', checks: {} });
        const ck = (v.checks[f.ref] = v.checks[f.ref] || { manual: {}, notes: {} });
        ck.manual[4] = st;
        ck.notes[4] = note;
      }
      Object.values(byEst).forEach((v) => visits.push(v));
    }
  }

  // 6. Visits: agronomist findings
  const avName = findSheet(wb, 'Agronomist Visit');
  if (avName) {
    const rows = sheetRows(wb, avName);
    const h = findHeader(rows, ['Estate', 'Field ID', 'Main Issue']);
    if (h) {
      used.push(avName);
      const c = {
        id: h.col('fieldid'), d: h.col('visitdate'), who: h.col('visitingagronomist'), bt: h.col('visitbatch'),
        m: h.col('mainissue'), s: h.col('subissue'), r: h.col('reason'), p: h.col('actionplan'),
      };
      const byKey = {};
      for (let i = h.i + 1; i < rows.length; i++) {
        const r = rows[i];
        const f = fieldOf(r[c.id]);
        if (!f) continue;
        // no date: use the half-year in the batch name, e.g. "R&D 2025 (1H)" / "(2H25)"
        const batch = String(r[c.bt] || '').trim();
        const hy = batch.match(/(1H|2H)\s*(\d{2,4})|(\d{4})\s*\((1H|2H)\)/i);
        const yr = hy ? (hy[2] || hy[3]) : '';
        const half = hy ? (hy[1] || hy[4]).toUpperCase() : '';
        const date = cellDate(r[c.d]) || (yr ? (yr.length === 2 ? '20' + yr : yr) + (half === '1H' ? '-06-30' : '-12-31') : '');
        const k = 'av-' + ekey(f.estate) + '-' + norm(batch) + '-' + date;
        const v = (byKey[k] = byKey[k] || {
          key: k, estate: f.estate, date: date,
          title: 'Agronomist' + (batch ? ' · ' + batch : '') + (r[c.who] ? ' · ' + String(r[c.who]).trim() : ''),
          checks: {},
        });
        const issue = [r[c.m], r[c.s]].filter((x) => x && x !== '—').join(' / ');
        const act = activityFor(issue);
        const st = /ganoderma/i.test(issue) ? 'action' : 'monitor';
        const ck = (v.checks[f.ref] = v.checks[f.ref] || { manual: {}, notes: {} });
        if (!ck.manual[act] || st === 'action') ck.manual[act] = st;
        const note = (issue ? issue + ': ' : '') + firstLine(r[c.r], 140) + (r[c.p] ? ' → ' + firstLine(r[c.p], 120) : '');
        ck.notes[act] = ck.notes[act] ? ck.notes[act] + '\n' + note : note;
      }
      Object.values(byKey).forEach((v) => visits.push(v));
    }
  }

  // 7. Follow-ups: Mission 1 action items (YPH + OER tables)
  const actions = [];
  const m1Name = findSheet(wb, 'Mission 1 Tracker');
  if (m1Name) {
    const rows = sheetRows(wb, m1Name);
    let h = findHeader(rows, ['Source', 'Estate', 'Parameter']);
    if (h) used.push(m1Name);
    while (h) {
      const c = {
        e: h.col('estate'), id: 2, p: h.col('parameter'), a: h.col('actionitemas'), fn: h.col('fieldnameas'),
        lf: h.col('linkedfieldid'), st: h.col('progressstatus'), s0: h.col('actualstart'), te: h.col('targetend'),
        cd: h.col('completeddate'), nr: h.col('newrevised'), pic: h.col('personincharge'),
      };
      let i = h.i + 1;
      for (; i < rows.length; i++) {
        const r = rows[i];
        const name = String(r[c.e] || '').trim();
        if (!name || !est[ekey(name)]) break;
        const id = String(r[c.id] || '').trim();
        const status = String(r[c.st] || '').trim();
        if (!id || /omit/i.test(status) || /omit/i.test(String(r[3] || ''))) continue;
        const f = fieldOf(r[c.lf]);
        const where = f || !r[c.fn] || /^all/i.test(String(r[c.fn])) ? '' : ' (fields: ' + firstLine(r[c.fn], 60) + ')';
        const done = /complet/i.test(status);
        actions.push({
          key: 'm1-' + id + (f ? '-' + f.ref : ''),
          estate: est[ekey(name)].name,
          fieldRef: f ? f.ref : null,
          actId: activityFor(r[c.p] + ' ' + r[c.a]),
          text: id + ' ' + String(r[c.p] || '').trim() + ': ' + firstLine(r[c.a], 120) + where,
          pic: firstLine(r[c.pic], 60),
          due: cellDate(r[c.nr]) || cellDate(r[c.te]),
          status: done ? 'done' : 'open',
          doneAt: done ? cellDate(r[c.cd]) || null : null,
          createdAt: cellDate(r[c.s0]) || today(),
        });
      }
      h = findHeader(rows, ['Source', 'Estate', 'Parameter'], i);
    }
  }

  // Fields -> import rows (same shape as a simple table)
  const out = Object.values(fields).map((f) => {
    const e = est[ekey(f.estate)];
    return {
      estate: f.estate, region: e.region, sou: e.sou, code: f.code,
      year: f.year, ha: f.ha, ypAct: f.ypAct, ypBgt: f.ypBgt, ypLy: f.ypLy,
      profitAct: e.profitAct, profitBgt: e.profitBgt, costs: f.costs, ref: f.ref,
    };
  });
  if (!out.length) return { error: 'The workbook has a "Performance" sheet, but no fields were found in it.' };
  return {
    rows: out,
    report: true,
    found: used,
    ignored: wb.SheetNames.filter((n) => !used.includes(n)),
    skipped: 0,
    sheet: '',
    costFields: costFields,
    visits: visits,
    actions: actions,
  };
}

// After estates/fields are saved: turn report visits + follow-ups into app items
function reportItems(result, es, fs) {
  const eId = (name) => (es.find((e) => norm(e.name) === norm(name)) || {}).id;
  const fId = {};
  result.rows.forEach((r) => {
    const e = eId(r.estate);
    const f = fs.find((x) => x.estateId === e && x.code === r.code);
    if (f) fId[r.ref] = f.id;
  });
  const visits = result.visits
    .map((v) => {
      const checks = {};
      Object.keys(v.checks).forEach((ref) => {
        if (fId[ref]) checks[fId[ref]] = { readings: {}, ...v.checks[ref] };
      });
      return {
        id: 'x-' + v.key, estateId: eId(v.estate), date: v.date || '',
        title: v.title, fieldIds: Object.keys(checks), checks: checks,
      };
    })
    .filter((v) => v.estateId && v.fieldIds.length);
  const actions = result.actions
    .map((a) => ({
      id: 'x-' + a.key, estateId: eId(a.estate), visitId: null,
      fieldId: a.fieldRef ? fId[a.fieldRef] || null : null,
      actId: a.actId, text: a.text, pic: a.pic, due: a.due,
      status: a.status, doneAt: a.doneAt, createdAt: a.createdAt,
    }))
    .filter((a) => a.estateId);
  return { visits: visits, actions: actions };
}

// =====================================================
// TIDY PAGES: small building blocks
// =====================================================

// Big square button on Home
function Tile({ icon, title, sub, tone, badge, onPress, wide }) {
  return (
    <Pressable style={[styles.tile, wide && { width: '100%' }]} onPress={onPress}>
      <View style={[styles.tileIc, tone && TONE_BG[tone]]}>
        <Ionicons name={icon} size={22} color={tone ? TONE_FG[tone] : C.accent} />
      </View>
      <Text style={styles.tileTitle} numberOfLines={1}>{title}</Text>
      <T style={styles.tileSub} numberOfLines={1}>{sub}</T>
      {badge ? (
        <View style={styles.tileBadge}>
          <T style={styles.badgeText}>{badge}</T>
        </View>
      ) : null}
    </Pressable>
  );
}

// One row in a menu list: icon · title / sub · chip · >
function MenuRow({ icon, title, sub, chip, tone, onPress, last }) {
  return (
    <Pressable style={[styles.menuRow, last && { borderBottomWidth: 0 }]} onPress={onPress}>
      <View style={[styles.menuIc, tone && TONE_BG[tone]]}>
        <Ionicons name={icon} size={19} color={tone ? TONE_FG[tone] : C.accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T style={styles.menuTitle}>{title}</T>
        {sub ? <T style={styles.meta} numberOfLines={1}>{sub}</T> : null}
      </View>
      {chip ? <Chip tone={tone || 'muted'} label={chip} /> : null}
      <Ionicons name="chevron-forward" size={18} color={C.muted} />
    </Pressable>
  );
}

function Menu({ children }) {
  return <View style={styles.menu}>{children}</View>;
}

// Page title for a section page
function PageHead({ icon, title, sub, right }) {
  return (
    <View style={styles.pageHead}>
      <View style={styles.hic}>
        <Ionicons name={icon} size={18} color={C.accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.pageTitle}>{title}</Text>
        {sub ? <T style={styles.meta}>{sub}</T> : null}
      </View>
      {right}
    </View>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <View style={styles.searchBox}>
      <Ionicons name="search" size={18} color={C.muted} />
      <TextInput
        style={styles.searchIn}
        placeholder={placeholder || 'Search'}
        placeholderTextColor="#8A8F80"
        value={value}
        onChangeText={onChange}
      />
      {value ? (
        <Pressable onPress={() => onChange('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={C.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

// Row of filter chips: options = [{ key, label, n }]
function FilterChips({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.filterRow}>
        {options.map((o) => {
          const on = o.key === value;
          return (
            <Pressable key={o.key} style={[styles.filterChip, on && styles.filterChipOn]} onPress={() => onChange(o.key)}>
              <T style={[styles.filterText, on && { color: '#fff' }]}>
                {o.label}
                {o.n !== undefined ? ' ' + o.n : ''}
              </T>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

// =====================================================
// PRIORITIES: one row per field, ranked by impact
// tonnes lost = mature ha x (budget - actual) yield YTD
// =====================================================
function fieldPriorities(p) {
  const { estates, fields, visits, actions } = p;
  const etu = p.etu || [];
  const out = [];
  fields.forEach((f) => {
    const e = estates.find((x) => x.id === f.estateId);
    if (!e) return;
    const ha = num(f.ha) || 0;
    const gap = num(f.ypBgt) !== null && num(f.ypAct) !== null ? num(f.ypBgt) - num(f.ypAct) : 0;
    const tLost = gap > 0 ? gap * ha : 0;
    const ys = yieldStatus(f);
    const ca = costAlerts(f);
    const lv = latestFieldVisit(visits, f.id);
    const ck = lv ? checkOf(lv, f.id) : null;
    const red = lv ? ACTIVITIES.filter((a) => actStatus(ck, a) === 'action').map((a) => a.name) : [];
    const late = actions.filter((a) => a.fieldId === f.id && a.status !== 'done' && isOverdue(a));
    // latest ETU visit that has this field
    let att = 0;
    const ev = etu
      .filter((v) => (v.fields || []).some((x) => x.fieldId === f.id))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    if (ev) {
      const vf = ev.fields.find((x) => x.fieldId === f.id);
      att = (vf.obs || []).filter((o) => o.status === 'attention').length;
    }
    const yBad = ys === 'action' || ys === 'monitor';
    if (!yBad && !ca.length && !red.length && !late.length && !att) return;
    const reasons = [];
    if (yBad) reasons.push({ t: 'Yield ' + pctText(yieldVar(f)), tone: ys === 'action' ? 'att' : 'mon' });
    if (late.length) reasons.push({ t: late.length + ' overdue', tone: 'att' });
    if (att) reasons.push({ t: att + ' ETU attention', tone: 'att' });
    if (red.length) reasons.push({ t: red.length + ' activity', tone: 'att' });
    if (ca.length) reasons.push({ t: ca.length + ' cost over', tone: 'mon' });
    const score = tLost + 15 * late.length + 10 * att + 4 * red.length + 2 * ca.length;
    out.push({
      key: f.id, f: f, e: e, tLost: tLost, score: score, reasons: reasons,
      tone: ys === 'action' || late.length || att ? 'att' : 'mon',
      sub: red.length ? red.slice(0, 2).join(', ') : ca.length ? ca.slice(0, 2).join(', ') : '',
    });
  });
  return out.sort((a, b) => b.score - a.score);
}

// estate-level items (follow-ups with no field, profit)
function estatePriorities(p) {
  const out = [];
  p.actions
    .filter((a) => !a.fieldId && a.status !== 'done' && isOverdue(a))
    .forEach((a) => {
      const e = p.estates.find((x) => x.id === a.estateId);
      if (e) out.push({ key: a.id, e: e, icon: 'time', tone: 'att', text: a.text, sub: 'Overdue since ' + showDate(a.due) + ' · PIC ' + (a.pic || '-'), go: () => p.onOpenEstate(e.id, 'Follow-ups') });
    });
  p.estates.forEach((e) => {
    const pv = profitVar(e);
    if (pv !== null && pv < 0) out.push({ key: e.id + 'p', e: e, icon: 'trending-down', tone: 'mon', text: 'Profit below budget ' + pctText(pv), sub: rmMil(e.profitAct) + ' YTD', go: () => p.onOpenEstate(e.id, 'Profit') });
  });
  return out;
}

function PriorityRow({ it, rank, onPress }) {
  return (
    <Pressable style={styles.exRow} onPress={onPress}>
      <View style={[styles.rankBox, TONE_BG[it.tone]]}>
        <Text style={[styles.rankNo, { color: TONE_FG[it.tone] }]}>{rank}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T style={styles.kvLabel} numberOfLines={1}>{it.e.name}</T>
        <T style={styles.exTitle} numberOfLines={1}>
          Field {it.f.code}
          {it.tLost >= 1 ? <T style={[styles.meta, { color: C.att }]}>{'  ' + Math.round(it.tLost).toLocaleString('en-MY') + ' t below budget'}</T> : null}
        </T>
        <View style={[styles.chips, { marginTop: 3 }]}>
          {it.reasons.map((r) => (
            <Chip key={r.t} tone={r.tone} label={r.t} />
          ))}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.muted} />
    </Pressable>
  );
}

function EstateItemRow({ it }) {
  return (
    <Pressable style={styles.exRow} onPress={it.go}>
      <View style={[styles.exIc, TONE_BG[it.tone]]}>
        <Ionicons name={it.icon} size={19} color={TONE_FG[it.tone]} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T style={styles.kvLabel} numberOfLines={1}>{it.e.name + ' · estate'}</T>
        <T style={styles.exTitle} numberOfLines={1}>{it.text}</T>
        <T style={styles.meta} numberOfLines={1}>{it.sub}</T>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.muted} />
    </Pressable>
  );
}

// =====================================================
// PRIORITIES PAGE
// =====================================================
function AlertsScreen(p) {
  const pri = fieldPriorities(p);
  const est = estatePriorities(p);
  const [kind, setKind] = useState('fields');
  const [ee, setEe] = useState('all');
  const [q, setQ] = useState('');
  const estIds = [...new Set(pri.map((x) => x.e.id))];
  const list = pri.filter((x) => (ee === 'all' || x.e.id === ee) && norm(x.f.code + x.e.name).includes(norm(q)));
  const elist = est.filter((x) => ee === 'all' || x.e.id === ee);
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <PageHead icon="podium-outline" title="Priorities" sub="One row per field, worst first" />
      <FilterChips
        value={kind}
        onChange={setKind}
        options={[
          { key: 'fields', label: 'Fields', n: pri.length },
          { key: 'estate', label: 'Estate items', n: est.length },
        ]}
      />
      {estIds.length > 1 && (
        <FilterChips
          value={ee}
          onChange={setEe}
          options={[{ key: 'all', label: 'All estates' }].concat(estIds.map((id) => ({ key: id, label: p.estates.find((e) => e.id === id).name })))}
        />
      )}
      {kind === 'fields' ? (
        <>
          <SearchBox value={q} onChange={setQ} placeholder="Search field code" />
          <View style={styles.exc}>
            {list.slice(0, 150).map((it) => (
              <PriorityRow key={it.key} it={it} rank={pri.indexOf(it) + 1} onPress={() => p.onOpenField(it.f.id)} />
            ))}
            {list.length === 0 && (
              <View style={styles.exRow}>
                <T style={styles.hint}>Nothing here.</T>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.exc}>
          {elist.map((it) => (
            <EstateItemRow key={it.key} it={it} />
          ))}
          {elist.length === 0 && (
            <View style={styles.exRow}>
              <T style={styles.hint}>No estate-level items.</T>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// =====================================================
// ESTATES LIST
// =====================================================
function EstatesScreen(p) {
  const { estates, fields, visits, actions } = p;
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [rg, setRg] = useSavedState('v7-region', ALL);
  const [so, setSo] = useSavedState('v7-sou', ALL);
  const regions = uniq(estates.map((e) => e.region));
  const inRegion = estates.filter((e) => rg === ALL || e.region === rg);
  const sous = uniq(inRegion.map((e) => e.sou));
  const sou = sous.includes(so) ? so : ALL;
  const list = inRegion
    .filter((e) => sou === ALL || e.sou === sou)
    .filter((e) => norm(e.name + e.region + e.sou).includes(norm(q)));
  // summary of what is shown
  const lf = fields.filter((f) => list.some((e) => e.id === f.estateId));
  const ly = estateYield(lf);
  const lp = list.filter((e) => num(e.profitAct) !== null).reduce((s, e) => s + num(e.profitAct), 0);
  const filtered = rg !== ALL || sou !== ALL;
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <PageHead icon="business-outline" title="Estates" sub={estates.length + ' estates · ' + fields.length + ' fields'} />
      <View style={styles.selBar}>
        <View style={styles.row2}>
          <Dropdown
            label="Region"
            value={rg}
            options={[{ value: ALL, label: 'All regions', sub: estates.length + ' estates' }].concat(
              regions.map((r) => ({ value: r, label: r, sub: estates.filter((e) => e.region === r).length + ' estates' }))
            )}
            onChange={(v) => {
              setRg(v);
              setSo(ALL);
            }}
          />
          <Dropdown
            label="SOU"
            value={sou}
            options={[{ value: ALL, label: 'All SOU', sub: inRegion.length + ' estates' }].concat(
              sous.map((s) => ({ value: s, label: s, sub: inRegion.filter((e) => e.sou === s).length + ' estates' }))
            )}
            onChange={setSo}
          />
        </View>
      </View>
      {estates.length > 0 && (
        <View style={styles.sumRow}>
          <View style={styles.sumItem}>
            <Text style={styles.sumVal}>{list.length}</Text>
            <T style={styles.sumLbl}>{filtered ? 'Estates shown' : 'Estates'}</T>
          </View>
          <View style={styles.sumItem}>
            <Text style={styles.sumVal}>{ly ? Math.round(ly.ha).toLocaleString('en-MY') : '-'}</Text>
            <T style={styles.sumLbl}>Mature ha</T>
          </View>
          <View style={styles.sumItem}>
            <Text style={[styles.sumVal, ly && { color: ly.v < LIMITS.yieldAmber ? C.att : C.good }]}>{ly ? pctText(ly.v) : '-'}</Text>
            <T style={styles.sumLbl}>Yield vs bgt</T>
          </View>
          <View style={styles.sumItem}>
            <Text style={styles.sumVal}>{lp ? (lp / 1000).toFixed(1) : '-'}</Text>
            <T style={styles.sumLbl}>Profit RM mil</T>
          </View>
        </View>
      )}
      {estates.length > 4 && <SearchBox value={q} onChange={setQ} placeholder="Search estate" />}
      {list.map((e) => {
        const ef = fields.filter((f) => f.estateId === e.id);
        const ey = estateYield(ef);
        const oa = actions.filter((a) => a.estateId === e.id && a.status !== 'done').length;
        const v = latestVisit(visits, e.id);
        return (
          <Pressable key={e.id} style={styles.card} onPress={() => p.onOpenEstate(e.id)}>
            <View style={styles.estBox}>
              <Text style={styles.estBoxText}>{e.name.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rcardTitle}>{e.name}</Text>
              <T style={styles.meta} numberOfLines={1}>
                {[e.region, e.sou].filter(Boolean).join(' · ') || 'No region / SOU'}
              </T>
              <View style={styles.chips}>
                <Chip tone="muted" label={ef.length + ' fields'} />
                {ey && <Chip tone={ey.v < LIMITS.yieldAmber ? 'att' : 'good'} dot label={'Yield ' + pctText(ey.v)} />}
                {oa > 0 && <Chip tone="rnd" label={oa + ' follow-up'} />}
                {v && v.date ? <Chip tone="muted" label={'Visit ' + showDate(v.date)} /> : null}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Pressable>
        );
      })}
      {list.length === 0 && <Empty title="No estates" text={q ? 'Nothing matches your search.' : 'Upload data or add an estate.'} />}
      {adding ? (
        <Section icon="add-circle-outline" title="New estate">
          <Field label="Estate name" full value={name} onChangeText={setName} placeholder="e.g. Sungai Mai" />
          <View style={styles.row2}>
            <Pressable style={styles.btnGhost} onPress={() => setAdding(false)}>
              <T style={styles.bold}>Cancel</T>
            </Pressable>
            <Pressable
              style={[styles.btnGhost, { backgroundColor: C.accent, borderColor: C.accent }]}
              onPress={() => {
                if (name.trim()) p.onAdd(name.trim());
                setName('');
                setAdding(false);
              }}>
              <T style={[styles.bold, { color: '#fff' }]}>Add</T>
            </Pressable>
          </View>
        </Section>
      ) : (
        <Pressable style={styles.delRow} onPress={() => setAdding(true)}>
          <Ionicons name="add-circle-outline" size={18} color={C.accent} />
          <T style={styles.link}>Add an estate by hand</T>
        </Pressable>
      )}
    </ScrollView>
  );
}

// =====================================================
// PROFIT PAGE (all estates)
// =====================================================
function ProfitScreen(p) {
  const { estates, fields } = p;
  const list = estates.filter((e) => num(e.profitAct) !== null);
  const maxP = list.reduce((m, e) => Math.max(m, num(e.profitAct) || 0, num(e.profitBgt) || 0), 1);
  const total = list.reduce((s, e) => s + (num(e.profitAct) || 0), 0);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <PageHead icon="bar-chart-outline" title="Profit by estate" sub={'YTD · total ' + rmMil(total)} />
      {list.length === 0 && <Empty title="No profit data" text="Upload the workbook (P&L sheet) or type it in each estate's Profit page." />}
      {list.length > 0 && (
        <Section icon="podium-outline" title="Actual vs budget">
          {list.map((e) => {
            const pv = profitVar(e);
            return (
              <Bar
                key={e.id}
                label={e.name + '  ' + rmMil(e.profitAct)}
                value={num(e.profitAct) || 0}
                max={maxP}
                marker={num(e.profitBgt) === null ? undefined : num(e.profitBgt)}
                color={pv !== null && pv < 0 ? C.att : C.good}
                right={pctText(pv)}
              />
            );
          })}
          <T style={styles.hint}>Bar = actual. Black line = budget (if entered).</T>
        </Section>
      )}
      <Menu>
        {list.map((e, i) => {
          const ey = estateYield(fields.filter((f) => f.estateId === e.id));
          const perHa = ey ? (num(e.profitAct) * 1000) / ey.ha : null;
          const pv = profitVar(e);
          return (
            <MenuRow
              key={e.id}
              icon="trending-up"
              title={e.name}
              sub={rmMil(e.profitAct) + (perHa !== null ? ' · RM ' + money(perHa) + '/ha' : '')}
              chip={pv === null ? 'No budget' : pctText(pv)}
              tone={pv === null ? 'muted' : pv < 0 ? 'att' : 'good'}
              last={i === list.length - 1}
              onPress={() => p.onOpenEstate(e.id, 'Profit')}
            />
          );
        })}
      </Menu>
    </ScrollView>
  );
}

// =====================================================
// ESTATE: menu page, and one page per section
// =====================================================
function EstateScreen(p) {
  const { estate, fields, visits, actions, tab, onChange } = p;
  const [confirm, setConfirm] = useState(false);
  const [q, setQ] = useState('');
  const [ff, setFf] = useState('all');
  const [adding, setAdding] = useState(false);
  const [nf, setNf] = useState({ code: '', year: '', ha: '' });
  const ef = fields.filter((f) => f.estateId === estate.id);
  const ev = visits.filter((v) => v.estateId === estate.id).sort((a, b) => b.date.localeCompare(a.date));
  const ea = actions.filter((a) => a.estateId === estate.id);
  const open = ea.filter((a) => a.status !== 'done');
  const late = open.filter(isOverdue);
  const pv = profitVar(estate);
  const ey = estateYield(ef);
  const ec = estateCost(ef);
  const fcode = (id) => (id ? (fields.find((f) => f.id === id) || {}).code || '?' : 'Estate');
  const yLow = ef.filter((f) => yieldStatus(f) === 'action' || yieldStatus(f) === 'monitor').length;
  const cOver = ef.filter((f) => costAlerts(f).length).length;
  const fieldRed = (f) => {
    const lv = latestFieldVisit(visits, f.id);
    return lv ? ACTIVITIES.filter((a) => actStatus(checkOf(lv, f.id), a) === 'action').length : 0;
  };
  const aRed = ef.filter((f) => fieldRed(f) > 0).length;
  const eEtu = (p.etu || []).filter((v) => v.estateId === estate.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const eAtt = eEtu.length ? etuCounts(eEtu[0]).attention : 0;

  // ---------- menu page ----------
  if (!tab) {
    const go = (t) => p.onOpenEstate(estate.id, t);
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Hero
          mini
          eyebrow={[estate.region, estate.sou].filter(Boolean).join(' · ') || 'Estate'}
          title={estate.name}
          sub={ef.length + ' fields · ' + (ey ? ey.ha.toFixed(1) + ' mature ha' : 'no area yet')}
          stats={[
            { ic: 'leaf', v: ey ? ey.act.toFixed(1) : '-', l: 'Yield mt/ha', tone: ey && ey.v < LIMITS.yieldAmber ? 'att' : 'good' },
            { ic: 'flag', v: String(open.length), l: 'Follow-ups', tone: late.length ? 'att' : open.length ? 'mon' : 'good' },
            { ic: 'trending-up', v: pctText(pv), l: 'Profit var', tone: pv !== null && pv < 0 ? 'att' : 'good' },
          ]}
        />
        <Menu>
          <MenuRow icon="grid-outline" title="Fields" sub={ef.length + ' fields · ' + yLow + ' yield below budget'} chip={aRed ? aRed + ' action' : null} tone={aRed ? 'att' : null} onPress={() => go('Fields')} />
          <MenuRow icon="walk-outline" title="ETU field visits" sub={eEtu.length ? eEtu.length + ' visits · latest ' + showDate(eEtu[0].date) : 'No ETU visits yet'} chip={eAtt ? eAtt + ' attention' : null} tone={eAtt ? 'att' : null} onPress={p.onOpenEtu} />
          <MenuRow icon="calendar-outline" title="Assessments & checks" sub={ev.length ? ev.length + ' · PMU, agronomist, activity checks' : 'None yet'} onPress={() => go('Visits')} />
          <MenuRow icon="flag-outline" title="Follow-ups" sub={open.length + ' open · ' + (ea.length - open.length) + ' done'} chip={late.length ? late.length + ' overdue' : null} tone={late.length ? 'att' : null} onPress={() => go('Follow-ups')} />
          <MenuRow icon="cash-outline" title="Cost" sub={'12 elements · ' + costAlerts(ec).length + ' over budget (estate)'} chip={cOver ? cOver + ' fields over' : null} tone={cOver ? 'mon' : null} onPress={() => go('Cost')} />
          <MenuRow icon="trending-up" title="Profit" sub={num(estate.profitAct) !== null ? rmMil(estate.profitAct) + ' YTD' : 'Not entered'} chip={pv !== null ? pctText(pv) : null} tone={pv !== null && pv < 0 ? 'att' : 'good'} onPress={() => go('Profit')} />
          <MenuRow icon="information-circle-outline" title="Estate details" sub="Name · region · SOU · delete" last onPress={() => go('Details')} />
        </Menu>
        <CTA label="NEW ETU FIELD VISIT" icon="walk" onPress={p.onNewEtu} />
      </ScrollView>
    );
  }

  // ---------- section pages ----------
  const fieldList = ef
    .filter((f) => norm(f.code).includes(norm(q)))
    .filter((f) => {
      if (ff === 'action') return fieldRed(f) > 0;
      if (ff === 'yield') return yieldStatus(f) === 'action' || yieldStatus(f) === 'monitor';
      if (ff === 'cost') return costAlerts(f).length > 0;
      return true;
    });

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {tab === 'Fields' && (
        <>
          <PageHead icon="grid-outline" title="Fields" sub={estate.name + ' · ' + ef.length + ' fields · yield YTD mt/ha'} />
          <SearchBox value={q} onChange={setQ} placeholder="Search field code, e.g. 2016A" />
          <FilterChips
            value={ff}
            onChange={setFf}
            options={[
              { key: 'all', label: 'All', n: ef.length },
              { key: 'action', label: 'Action', n: aRed },
              { key: 'yield', label: 'Yield low', n: yLow },
              { key: 'cost', label: 'Cost over', n: cOver },
            ]}
          />
          {fieldList.length === 0 && <Empty title="No fields" text={ef.length ? 'Nothing matches.' : 'Add your fields below.'} />}
          {fieldList.map((f) => {
            const ys = yieldStatus(f);
            const red = fieldRed(f);
            const ca = costAlerts(f).length;
            return (
              <Pressable key={f.id} style={styles.card} onPress={() => p.onOpenField(f.id)}>
                <View style={[styles.fieldBox, ys && TONE_BG[STATUS[ys].tone]]}>
                  <Text style={[styles.fieldBoxText, ys && { color: TONE_FG[STATUS[ys].tone] }]} numberOfLines={1}>
                    {f.code}
                  </Text>
                  <T style={styles.fieldBoxSub}>{f.year ? 'PY ' + f.year : ''}</T>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T style={styles.bold}>
                    {f.ypAct || '-'} <T style={styles.meta}>vs {f.ypBgt || '-'} · {f.ha || '-'} ha</T>
                  </T>
                  <View style={styles.chips}>
                    {ys && <Chip tone={STATUS[ys].tone} dot label={pctText(yieldVar(f))} />}
                    {red > 0 && <Chip tone="att" label={red + ' action'} />}
                    {ca > 0 && <Chip tone="mon" label={ca + ' cost'} />}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </Pressable>
            );
          })}
          {adding ? (
            <Section icon="add-circle-outline" title="Add field">
              <View style={styles.row2}>
                <Field label="Field code" placeholder="e.g. 3C" autoCapitalize="characters" value={nf.code} onChangeText={(t) => setNf({ ...nf, code: t })} />
                <Field label="Planted" placeholder="2008" keyboardType="numeric" value={nf.year} onChangeText={(t) => setNf({ ...nf, year: t })} />
                <Field label="Mature ha" placeholder="0.0" keyboardType="numeric" value={nf.ha} onChangeText={(t) => setNf({ ...nf, ha: t })} />
              </View>
              <CTA
                label="ADD FIELD"
                icon="add"
                onPress={() => {
                  const code = nf.code.trim().toUpperCase();
                  if (!code) return;
                  p.onAddField({ id: newId(), estateId: estate.id, code: code, year: nf.year, ha: nf.ha, ypAct: '', ypBgt: '', ypLy: '', costs: {} });
                  setNf({ code: '', year: '', ha: '' });
                  setAdding(false);
                }}
              />
            </Section>
          ) : (
            <Pressable style={styles.delRow} onPress={() => setAdding(true)}>
              <Ionicons name="add-circle-outline" size={18} color={C.accent} />
              <T style={styles.link}>Add a field by hand</T>
            </Pressable>
          )}
        </>
      )}

      {tab === 'Visits' && (
        <>
          <PageHead icon="calendar-outline" title="Assessments & checks" sub={estate.name + ' · PMU, agronomist and 10-activity checks'} />
          <CTA label="NEW 10-ACTIVITY CHECK" icon="add" color={C.rnd} onPress={p.onNewVisit} />
          {ev.length === 0 && <Empty title="No visits yet" text="Start your first site visit." />}
          {ev.map((v) => {
            const all = findings(v);
            const red = countIn(all, 'action');
            const amber = countIn(all, 'monitor');
            const ids = v.fieldIds || [];
            return (
              <Pressable key={v.id} style={styles.card} onPress={() => p.onOpenVisit(v.id)}>
                <DateBox date={v.date} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T style={styles.bold} numberOfLines={1}>{v.title || 'Site visit'}</T>
                  <T style={styles.meta} numberOfLines={1}>
                    {ids.length > 5 ? ids.length + ' fields' : 'Fields ' + (ids.map(fcode).join(', ') || '-')}
                  </T>
                  <View style={styles.chips}>
                    {red > 0 && <Chip tone="att" dot label={red + ' action'} />}
                    {amber > 0 && <Chip tone="mon" dot label={amber + ' monitor'} />}
                    {all.length > 0 && red + amber === 0 && <Chip tone="good" dot label="All good" />}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </Pressable>
            );
          })}
        </>
      )}

      {tab === 'Follow-ups' && (
        <>
          <PageHead icon="flag-outline" title="Follow-ups" sub={estate.name + ' · ' + open.length + ' open · ' + late.length + ' overdue'} />
          <FilterChips
            value={ff}
            onChange={setFf}
            options={[
              { key: 'all', label: 'Open', n: open.length },
              { key: 'late', label: 'Overdue', n: late.length },
              { key: 'done', label: 'Done', n: ea.length - open.length },
            ]}
          />
          {ea.length === 0 && <Empty title="No follow-ups" text="Add them from a site visit (Monitor or Action)." />}
          {sortActions(ff === 'done' ? ea.filter((a) => a.status === 'done') : ff === 'late' ? late : open).map((a) => (
            <ActionRow key={a.id} a={a} field={fcode(a.fieldId)} onSave={p.onSaveAction} onDelete={p.onDeleteAction} showAct />
          ))}
        </>
      )}

      {tab === 'Cost' && (
        <>
          <PageHead icon="cash-outline" title="Estate cost" sub="RM/ha YTD · field costs weighted by mature ha" />
          <CostTable obj={ec} readOnly />
          <CostChart obj={ec} />
          <Section icon="grid-outline" title="Fields over budget" right={<T style={styles.hint}>{cOver} fields</T>}>
            {ef.filter((f) => costAlerts(f).length).length === 0 && <T style={styles.hint}>All fields within budget.</T>}
            {ef
              .filter((f) => costAlerts(f).length)
              .map((f) => (
                <Pressable key={f.id} style={styles.readRow} onPress={() => p.onOpenField(f.id, 'Cost')}>
                  <T style={[styles.bold, { width: 62 }]}>{f.code}</T>
                  <T style={[styles.meta, { flex: 1 }]} numberOfLines={1}>{costAlerts(f).join(', ')}</T>
                  <Ionicons name="chevron-forward" size={16} color={C.muted} />
                </Pressable>
              ))}
          </Section>
        </>
      )}

      {tab === 'Profit' && (
        <>
          <PageHead icon="trending-up" title="Estate profit" sub={estate.name + ' · YTD'} />
          <View style={[styles.profitBox, pv !== null && pv < 0 ? TONE_BG.att : TONE_BG.good]}>
            <T style={styles.meta}>{pv === null ? 'Profit YTD' : 'Variance vs budget'}</T>
            <Text style={[styles.profitBig, { color: pv !== null && pv < 0 ? C.att : C.good }]}>
              {pv === null ? rmMil(estate.profitAct) : pctText(pv)}
            </Text>
            {pv !== null && <T style={styles.meta}>{rmMil(estate.profitAct) + ' actual · ' + rmMil(num(estate.profitAct) - num(estate.profitBgt)) + ' vs budget'}</T>}
            {ey && num(estate.profitAct) !== null && (
              <T style={styles.meta}>Profit per mature ha: RM {money((num(estate.profitAct) * 1000) / ey.ha)}</T>
            )}
          </View>
          <Section icon="create-outline" title="Edit">
            <View style={styles.row2}>
              <Field label="Actual (RM'000)" keyboardType="numeric" placeholder="0" value={estate.profitAct || ''} onChangeText={(t) => onChange({ ...estate, profitAct: t })} />
              <Field label="Budget (RM'000)" keyboardType="numeric" placeholder="0" value={estate.profitBgt || ''} onChangeText={(t) => onChange({ ...estate, profitBgt: t })} />
            </View>
            <T style={styles.hint}>Type in RM'000, e.g. 16259 = RM 16.26 mil.</T>
            <View>
            </View>
          </Section>
        </>
      )}

      {tab === 'Details' && (
        <>
          <PageHead icon="information-circle-outline" title="Estate details" />
          <Section>
            <Field label="Estate name" full value={estate.name} onChangeText={(t) => onChange({ ...estate, name: t })} />
            <View style={styles.row2}>
              <Field label="Region" placeholder="e.g. STR" value={estate.region || ''} onChangeText={(t) => onChange({ ...estate, region: t })} />
              <Field label="SOU" placeholder="e.g. SOU 20" value={estate.sou || ''} onChangeText={(t) => onChange({ ...estate, sou: t })} />
            </View>
            <View style={styles.kv}>
              <KV label="Fields" value={String(ef.length)} />
              <KV label="Mature ha" value={ey ? ey.ha.toFixed(1) : '-'} />
              <KV label="Yield YTD" value={ey ? ey.act.toFixed(2) + ' mt/ha' : '-'} />
              <KV label="Yield budget" value={ey ? ey.bgt.toFixed(2) + ' mt/ha' : '-'} />
            </View>
          </Section>
          <DeleteBox label={'Delete ' + estate.name + ' with all fields, visits and actions?'} button="Delete estate" confirm={confirm} setConfirm={setConfirm} onDelete={p.onDelete} />
        </>
      )}
    </ScrollView>
  );
}

// =====================================================
// ETU FIELD VISIT: visits -> fields -> observations
// (same flow as the ETU Field Visit web app, visit part only)
// =====================================================
const ESTAT = {
  attention: { label: 'Attention Required', short: 'Attention', tone: 'att', icon: 'alert-circle' },
  rnd: { label: 'R&D Remark', short: 'R&D', tone: 'rnd', icon: 'flask' },
  monitor: { label: 'Monitor', short: 'Monitor', tone: 'mon', icon: 'eye' },
  good: { label: 'Good Practices', short: 'Good', tone: 'good', icon: 'checkmark-circle' },
};
const ESTAT_ORDER = ['attention', 'rnd', 'monitor', 'good'];
const ECATS = [
  { k: 'Pest & Disease', ic: 'bug', c: '#B4533C' },
  { k: 'Palm Stand / Abnormal Palm', ic: 'leaf', c: '#B0822A' },
  { k: 'Field Upkeep / Weeding', ic: 'cut', c: '#4F8A3A' },
  { k: 'Yield Making (EFB / MCP / Manuring)', ic: 'flask', c: '#6A9A2A' },
  { k: 'Harvesting', ic: 'basket', c: '#C4651C' },
  { k: 'Drainage / Water Mgmt.', ic: 'water', c: '#2F7FC1' },
  { k: 'Accessibility / Infra.', ic: 'map', c: '#8A6A45' },
  { k: 'Field Practice', ic: 'clipboard', c: '#2F8A86' },
  { k: 'Other', ic: 'ellipsis-horizontal', c: '#7A7A70' },
];
const catOf = (k) => ECATS.find((c) => c.k === k) || ECATS[ECATS.length - 1];
const ACTION_BY = ['Estate', 'R&D', 'Agronomist', 'Region', 'Estate & R&D'];
const UOMS = ['Ha', 'palms', 'points', 'm', 'km', 'units', '%'];

// Standard wording: NTR – UTO Site Visit Summary (Oct 2026)
// s=status c=category t=observation i=issue r=root cause a=action plan b=action by
const WORD_LIB = [{"s": "attention", "c": "Pest & Disease", "t": "Historical Bagworm", "i": "Historical bagworm damage was observed on fronds, resulting in significant leaf defoliation that may reduce photosynthetic capacity and adversely affect palm growth and yield if left untreated.", "r": "This area was prone to bagworm infestations, primarily due to the movement of prime movers. The situation was further aggravated by the estate's proximity to neighbouringsmallholder estates, which facilitated the spread of bagworms across plantation boundaries and into the estate.", "a": "Continue regular bagworm census in all affected fields and monitor infestation levels, particularly along estate boundaries adjacent to neighboring smallholders' estate.\nCarry out targeted treatment using cypermethrin via airblastspraying in accordance with the recommended dosage and safety procedures.", "b": "Estate"}, {"s": "good", "c": "Field Practice", "t": "Canopy Management", "i": "Pruning activities were well maintained, with palms meeting the required pruning standard and canopy condition."}, {"s": "good", "c": "Field Practice", "t": "Strip spray", "i": "Strip spraying was well maintained, with minimal weed competition along the harvesting path and palm row."}, {"s": "good", "c": "Field Practice", "t": "Selective weeding", "i": "Selective spraying was well maintained, with woodies effectively controlled in the visited area."}, {"s": "good", "c": "Field Practice", "t": "Circle raking", "i": "Circle raking was well maintained, with palm circles clean and clear of debris to support loose fruit collection."}, {"s": "good", "c": "Field Practice", "t": "Path in good condition", "i": "Harvesting paths were well maintained and clear of obstruction, supporting field accessibility and crop evacuation."}, {"s": "good", "c": "Field Practice", "t": "Bunch formation", "i": "Good bunch formation was observed, indicating healthy palm growth and satisfactory crop development for the palm age."}, {"s": "attention", "c": "Yield Making (EFB / MCP / Manuring)", "t": "Fertilizer Placement & Application", "i": "Fertilizer application was observed; however, some palms were not applied with fertilizer, and fertilizer placement was noted to be inconsistent with ARM's and SOP's recommended application standards.", "r": "MTFA -The gearbox malfunctioned several days before, resulting in equipment downtime.\nIFM -The machine was operated until the evening, causing excessive heat in both the machine and its control valve. This resulted in a slight delay in fertilizer application compared to the normal.\nEstate want to expedite the 2nd half application as to prevent from further delay and other issues i.e. caking.", "a": "Follow up with the vendor to obtain the repair quotation as soon as possible.\nImplement the semi-mechanical application method for flat areas to improve application efficiency.\nApply fertilizer manually using wheelbarrows in terrace areas to ensure complete coverage and prevent missed inter-palm areas.\nMonitor fertilizer application progress to ensure all targeted palms receive the required fertilizer according to the recommended dosage by R&D.\nEstate will liaise with regional MUM Executive for implementation by using IFM as discussed on 21/10/2026.", "b": "Estate"}, {"s": "attention", "c": "Palm Stand / Abnormal Palm", "t": "Non-producing Palm", "i": "Several non-producing palms were observed in spotted areas, reducing the effective palm stand and potential FFB yield.", "r": "Inadequate early identification and follow-up monitoring of abnormal palms during field planting", "a": "Estate in progress to complete the poisoning or removing of confirmed unproductive palms in accordance with estate procedures and safety requirements by using driller, injector and backhoe\nConduct follow-up inspections to verify the status of treated palms and ensure proper removal of dead palms where required.", "b": "Estate"}, {"s": "good", "c": "Field Practice", "t": "Selective weeding within programme", "i": "Selective weeding was carried out within the programme, with woodies and VOPS adequately controlled in the field."}, {"s": "good", "c": "Field Practice", "t": "Road maintenance", "i": "Roads were well maintained, providing good field accessibility for harvesting and crop evacuation activities."}, {"s": "attention", "c": "Field Upkeep / Weeding", "t": "Selective Weeding", "i": "Delayed selective weeding was observed in spotted areas, indicating that spot weeding activities require further improvement.", "r": "Circle spraying was recently completed, while selective weeding is ongoing as per planned programme.", "a": "Prioritize areas with significant weed infestation to minimize competition for nutrients and maintain field accessibility.\nMonitor work progress daily and ensure timely completion according to the estate's upkeep programme.\nConduct follow-up field inspections to assess weeding productivity ,quality and arrange corrective spraying where necessary.", "b": "Estate"}, {"s": "good", "c": "Yield Making (EFB / MCP / Manuring)", "t": "MCP (Yield Making)", "i": "Moisture conservation pits (MCP) were observed in the field, supporting water retention and moisture conservation."}, {"s": "good", "c": "Field Practice", "t": "Strip spray", "i": "Strip weeding was well maintained, with minimal weed competition along the harvesting path and palm row."}, {"s": "attention", "c": "Field Upkeep / Weeding", "t": "NMS Spray", "i": "Poor NMS spray coverage particularly behind the palm areas, leaving weed growth that may hinder accessibility and harvesting.", "r": "The spraying programmewas initially delayed due to machine operator unavailability, followed by further delays caused by machinery breakdown.", "a": "Estate to conduct NMS spraying machine calibration to ensure the correct spray volume, pressure, and nozzle output for effective weed control.\nConduct regular field inspections to evaluate spraying effectiveness and carry out corrective spraying where necessary.", "b": "Estate"}, {"s": "attention", "c": "Yield Making (EFB / MCP / Manuring)", "t": "Bunch Formation", "i": "Low bunch formation was observed on several palms, which may reduce FFB production and overall yield performance.", "r": "Low bunch formation was attributed to the historical bagworm infestation, which caused leaf defoliation and reduced the palms' photosynthetic capacity. The affected palms are still in the recovery stage following pest control, and their productivity has yet to fully recover, resulting in lower bunch formation.\nLow rainfall received from January until April 2024 at average 104mm per month may affect low female inflorescence in 1st semester 2026.", "a": "Zero losses by ensuring all harvested FFB and loose fruits are fully collected, transported, and delivered to the mill.", "b": "Estate"}, {"s": "good", "c": "Field Practice", "t": "Circle spray", "i": "Circle spraying was recently completed, with palm circles clear of weeds to support loose fruit collection."}, {"s": "attention", "c": "Field Upkeep / Weeding", "t": "VOPS", "i": "Big VOPS were observed in selected areas, competing with palms for nutrients and indicating spot weeding requires improvement.", "r": "Ineffective spot weeding and inadequate follow-up monitoring resulted in VOPS regrowth and persistence in selected areas, leading to competition with palms for nutrients\n.Currently estate in programeat Scaborrodivision to eradicate/remove Vops.", "a": "Estate carry out VOPS poisoning by check-roll workers to clear the VOPS", "b": "Estate"}, {"s": "attention", "c": "Pest & Disease", "t": "Ganoderma", "i": "Ganoderma-infected palms were observed, resulting in vacant points and a reduced palm stand within the field.", "r": "Historical of Ganoderma for past year", "a": "Estate will carry out Ganoderma Census for this year as well as to carry out soil mounding for the unhealthy but productive palm", "b": "Estate"}, {"s": "attention", "c": "Palm Stand / Abnormal Palm", "t": "Abnormal Palm", "i": "Several abnormal palms were observed within the field, potentially affecting palm growth and field operations.", "r": "Inadequate early identification and follow-up monitoring of abnormal palms during field planting", "a": "Estate will carry out the removal of abnormal and unproductive palms", "b": "Estate"}, {"s": "attention", "c": "Palm Stand / Abnormal Palm", "t": "Etiolation", "i": "Several palms were observed to be etiolated, with elongated trunks and poor canopy development.", "r": "High SPH during field planting", "a": "Estate will carry out conduct census for etiolated palm and will do selective thinning after get confirmation by R&D", "b": "Estate"}, {"s": "rnd", "c": "Palm Stand / Abnormal Palm", "t": "Etiolation", "i": "Erect canopy growth due to high-density planting at 179 (latest SPH from PAU).", "r": "High SPH during field planting", "a": "Abnormal palms removal completed by using poisoning.", "b": "R&D"}, {"s": "rnd", "c": "Pest & Disease", "t": "Bagworm", "i": "Persistent bagworm infestation in >70% area for the past 3 years.", "r": "The spread of bagworm infestation from adjacent smallholder estates as well as cattle roaming in the estate.", "a": "Continuous monitoring (84ha) and (8ha)affected . Trunk injection and perimeter spraying in progress and target to zero affected at this field.", "b": "R&D"}, {"s": "rnd", "c": "Accessibility / Infra.", "t": "Flash Flood –Drain", "i": "Seasonal flooding is affecting 15ha of area.", "r": "Blocking drainage system from stakeholder village and the field under the main road drain make the flash flood happen .", "a": "Annual desilting of the collection drain and sub-soil fertilizer application", "b": "R&D"}, {"s": "good", "c": "Field Practice", "t": "General upkeep", "i": "General field upkeep was well maintained i.e. strip spray, selective weeding and canopy management, with satisfactory field conditions observed across the visited area."}, {"s": "attention", "c": "Harvesting", "t": "Crop Losses", "i": "Uncollected loose fruits were observed within palm circles in spotted areas, which have been 5 days delay after the last harvesting round (10 Oct 2026).", "r": "This primarily due to assisted harvesting gang start on 7,8,9 and 10th butdue to rain interuptionon 9 and 12th LFcollection activity also interuptedwith separate LF collection gang,thiscauses different timing of LF collected, however coupled with havingrain interference which slowed collection progress. For month of Oct 26 estate experience 5 days of rain during working hour with 245mm."}, {"s": "attention", "c": "Accessibility / Infra.", "t": "Path Damage", "i": "Damaged harvesting paths were observed at spotted areas within the fields. These conditions have significantly limited field access, reduced operational effectiveness, and hindered routine estate operations.", "r": "Damaged path due to soggy soil from frequent rain received. For month of Aug 26 estate experienced 10 days of rain interference, Sep 26 (15 days) & Oct 26 (16 days) withaccumulated rain received forthese 3 particular monthat 668mm.", "a": "Identifypatches of damaged path andperform repairusingimported lateritic soil from nearby area, to avoid damage feeder root.", "b": "Estate"}, {"s": "attention", "c": "Field Practice", "t": "Canopy Management", "i": "Delay pruning was observed in portion areas in the field, potentially effecting bunch accessibility.", "r": "Estate experienced shortage of harvesters for first half FY2026 due to repartrationof experienced 10 harvesters, which causing some task beingleft/delayed pruning. In month of May 26 and July 26 estate had received 13 new PMIwhich is still under training with low productivity."}, {"s": "attention", "c": "Accessibility / Infra.", "t": "Road Damage", "i": "Road damage was observed in certain portion, which may affect crop evacuation.", "r": "Damageroad due to requentmovement with heavy machineries coupled with frequent rain received. For month of Aug 26 estate experienced 10 days of rain interference, Sep 26 (15 days) & Oct 26 (16 days) withaccumulated rain received forthese 3 particular monthat 668mm.", "a": "Estate will channel out water on the damaged road and apply crusher run to theaffected patches. Estate will construct roadside pit to avoid water stagnant on the road. Initiate road grading for 1000M field road when weather is permissible.", "b": "Estate"}, {"s": "attention", "c": "Field Upkeep / Weeding", "t": "Selective Weeding", "i": "Minimal woodies was observed in spotted areas, indicating that spot weeding activities require further improvement", "r": "Selective was last done in May but due toweeds competitiveness cause vigorousgrowth ofwoodies certain portion.", "a": "Estate willarrange additional round of spot spray for spotted area to eradicate patches of missed out woodies.", "b": "Estate"}, {"s": "monitor", "c": "Pest & Disease", "t": "Historical Bagworm", "i": "Signs of historical bagworm damage were observed. Last treatment based on chemical issuance recorded on last Nov 2025. The census data given by estate the fields recorded below ATL."}, {"s": "rnd", "c": "Other", "t": "Yield Impacted by Maturity", "i": "The budget for the 1st year is relatively high, given that harvesting was only been carried out for 2 months, with 4 harvesting rounds per year, as maturity was only reached in Nov. 2025.", "r": "The budget crop was relatively high at 21.67 mt/ha and was not accurately adjusted and unachieveable for newly mature area.", "a": "The 2026 budget has been revised; however, it remains relatively high at 21.67 mt/ha. The estate is to ensure harvesting is conducted at a minimum of 2.5 rounds/month to achieve the targeted budget.", "b": "R&D"}, {"s": "rnd", "c": "Pest & Disease", "t": "Bagworm", "i": "A prolonged moderate to severe bagworm infestation has been observed since Jan 2025, with peak incidence recorded in Sept. 2025. The infestation has affected approximately 25% of the area, attributed to delayed treatment intervention.", "r": "Delayed treatment due to insufficient allocation of chemical cypermethrin forFY 2025 coupled withmultiple stages of bagworm lifecycle. Estate has torequest from R&D for additional chemical allocation.", "a": "Latest census and random field checks during the visit indicate a reduction in the infested area. Continue routine census monitoring, and if infestation exceeds the threshold level, proceed with trunk injection at 14-day intervals. The estate should remain vigilant, initiate census promptly upon detection of persistent symptoms, and commence treatment once pest populations surpass the economic threshold.", "b": "R&D"}, {"s": "rnd", "c": "Yield Making (EFB / MCP / Manuring)", "t": "High Male Inflorescence", "i": "Two consecutive moisture-deficit periods were recorded in Mar–Apr 2023 and Jan–Feb 2024. These dry spells resulted in increased male inflorescence production and higher rates of floral abortion, leading to reduced bunch formation after lag periods of approximately 8–11 months and 19–25 months. The impact was further exacerbated by the predominance of lateritic soils across most of the area, which are highly prone to moisture stress.", "r": "Moisture deficit due to prolonged dry period on, FY2023-6 consecutives month received rainfall below <150mm(Jan-July 2023). FY2024-3 Months received rainfall below <150MM(Jan,Feb& Apr).", "a": "Pruned fronds should be applied together with EFB at a rate of 40 t/ha within the existing MCP. The current interrow ground cover, whether legumes or grasses, should be preserved, with maintenance restricted to the palm circles only.", "b": "R&D"}, {"s": "good", "c": "Field Practice", "t": "Road condition", "i": "Road maintained in good condition, providing efficient access for field operations."}, {"s": "attention", "c": "Pest & Disease", "t": "Bagworm", "i": "Bagworm infestation was observed; resulting in significant leaf defoliation that may reduce photosynthetic capacity and adversely affect palm growth and yield if left untreated.", "r": "Bagworm infestation started from neighbouringsmallholder, main spreading agent i.ecattle & monkey intrusion and estate vehicle.", "a": "Estate will continue routine census monitoring, and if infestation exceeds the threshold level, proceed with trunk injection at 14-day intervals. The estate should remain vigilant, initiate census promptly upon detection of persistent symptoms, and commence treatment once pest populations surpass the economic threshold.", "b": "Estate"}, {"s": "attention", "c": "Field Practice", "t": "Delay Pruning", "i": "Delay pruning was observed in selected palms in the field, potentially effecting bunch accessibility.", "r": "Estate experienced shortage of harvesters for first half FY2026 due to repartrationof experienced 10 harvesters, which causing some task beingleft/delayed pruning. In month of May 26 and July 26 estate had received 13 new PMIwhich is still under training with low productivity.", "a": "Estate to deploy additional pruner (SPG) frommain division to assist in speeding up pruning completion for the field.\nAllocated individual task and to implement progressive pruning.", "b": "Estate"}, {"s": "monitor", "c": "Pest & Disease", "t": "Bagworm", "i": "A prolonged moderate to severe bagworm infestation has been observed since Jan 2025, with peak incidence recorded in Nov 2025. The infestation has affected approximately 20% of the area, attributed to delayed treatment intervention.", "r": "Estate has established 3 treatment teams to carry out trunk injection. Additional round of treatment required due to multistagesof bagworm cycle. To speed up the treatment estate had appoint contracttreatment teamto ensure the treatment completed timely.", "a": "Continue regular bagworm census in all affected fields and monitor infestation levels, particularly along estate boundaries adjacent to neighboring smallholders' estate.\nCarry out targeted treatment using cypermethrin via airblastspraying in accordance with the recommended dosage and safety procedures.", "b": "Estate"}, {"s": "attention", "c": "Yield Making (EFB / MCP / Manuring)", "t": "High Male Inflorescence", "i": "Two consecutive moisture-deficit periods were recorded in Mar–Apr 2023 and Jan–Feb 2024. These dry spells resulted in increased male inflorescence production and higher rates of floral abortion, leading to reduced bunch formation after lag periods of approximately 8–11 months and 19–25 months. The impact was further exacerbated by the predominance of lateritic soils across most of the area, which are highly prone to moisture stress.", "r": "Moisture deficit due to prolonged dry period on, FY2023-6 consecutives month received rainfall below <150mm(Jan-July 2023). FY2024-3 Months received rainfall below <150MM(Jan,Feb& Apr).", "a": "Pruned fronds should be applied together with EFB at a rate of 40 t/ha within the existing MCP. The current interrow ground cover, whether legumes or grasses, should be preserved, with maintenance restricted to the palm circles only.", "b": "R&D"}, {"s": "monitor", "c": "Accessibility / Infra.", "t": "Narrow terraces", "i": "Half of the area (37 ha) consists of narrow terraces, which are impeding accessibility.", "r": "Narrow terrace constructed due to steep terrace slope between 20-25 degree. Limited accessibility due to collapsed terrace at few points."}, {"s": "attention", "c": "Field Upkeep / Weeding", "t": "Selective Spray", "i": "Delayed selective spraying was observed in spotted areas, indicating that spot weeding requires further improvement.", "r": "The areas were on terrace lips in open areas. This causes vigorous growth of woodies.", "a": "Estate will conduct selective spray, however some vegetation need to be maintain to avoid soil erosion near terrace lips.", "b": "Estate"}, {"s": "attention", "c": "Pest & Disease", "t": "Ganoderma", "i": "Ganoderma-infected palms were observed in certain areas, which may lead to palm mortality and loss of productive stand.", "r": "Latest Ganoderma census at 5% infestation.", "a": "To carry out proper census, identify and mark the Ganoderma infected palms.\nEstate had budgeted allocation for Ganoderma census and treatmentfor FY 2027.", "b": "Estate"}, {"s": "good", "c": "Field Practice", "t": "Canopy Management", "i": "Pruning is in progress, with 90% of the field completed. Frond snapping was observed on several palms, which may affect canopy and bunch development."}, {"s": "good", "c": "Palm Stand / Abnormal Palm", "t": "Thinning", "i": "Thinning has been carried out, reducing the stand from 160 SPH (original) to 144 SPH (current)."}, {"s": "rnd", "c": "Palm Stand / Abnormal Palm", "t": "Leaning Palm & Etiolation", "i": "Small and elongated ABW (7.7kg) due to canopy etiolation (SPH 171) especially among the leaning palms planted on Kranjiseries with thick organic horizon (29.35ha).", "r": "Soil series Kranji–leaning palm is potentially associated with inadequate root anchorage under soft, saturated soil conditions, compounded by prolonged waterlogging and possible soil subsidence due to drainage.", "a": "To carry out soil mounding for the leaning palms concurrent with special (selective) thinning procedure in the affected area (refer AFR report 2025).", "b": "R&D"}, {"s": "monitor", "c": "Pest & Disease", "t": "Historical Bagworm", "i": "Signs of historical bagworm damage were observed. The census data given by estate the fields recorded below ATL."}, {"s": "good", "c": "Field Practice", "t": "Strip spray", "i": "Strip spray was well maintained, with minimal weed competition along the harvesting path and palm row."}, {"s": "good", "c": "Drainage / Water Mgmt.", "t": "Field drain desilting", "i": "Field drains were desilted by the estate, supporting effective water flow and drainage in the field."}, {"s": "good", "c": "Field Practice", "t": "Piezometer installed", "i": "A piezometer was installed and functioning in the field to support water level monitoring and management."}, {"s": "rnd", "c": "Drainage / Water Mgmt.", "t": "Flooding", "i": "Prolonged flooding in 42% (29.86ha) of area during raining season. Zip- planting area.", "r": "Desiltingfield drain was carried out previously 50% of the area, leads to prolonged water stagnant, especially during the monsoon season especially at low lying area."}, {"s": "attention", "c": "Pest & Disease", "t": "Rat Damage", "i": "Rat damage was observed on several palms within the field, which may have affected optimal bunch formation.", "r": "First baiting completed in June 2026. Second round application planned in October 2026. Field adjacent to local village and smallholder.", "a": "Carry out second campaign in October FY 2026 –3 baits per palm..", "b": "Estate"}, {"s": "good", "c": "Field Practice", "t": "Selective weeding", "i": "Selective weeding was well maintained, with woodies effectively controlled in the visited area."}, {"s": "good", "c": "Drainage / Water Mgmt.", "t": "Drain desilting", "i": "Field drain desilting was observed, supporting effective water flow and drainage in the field."}, {"s": "attention", "c": "Yield Making (EFB / MCP / Manuring)", "t": "Malformed Bunches", "i": "Bunch formation was generally good for the palm age, but malformed bunches were found on several palms, which may reduce FFB production and yield.", "r": "Reduced pollen availability may lead to inadequate pollination, poor fruit set and malformed bunches, potentially due to rat infestationon male inflorescences.", "a": "Carry out census at affected area and secondround of rat baiting in October 2026", "b": "Estate"}, {"s": "attention", "c": "Pest & Disease", "t": "Rat Damage", "i": "Rat damage was observed in the field, which may lead to crop loss and reduced FFB yield if left uncontrolled.", "r": "Field 2020B located adjacent to smallholder and local village. First baiting completed in June 2026. Second round application planned in October 2026.", "a": "Carry out secondbaiting in October 2026", "b": "Estate"}, {"s": "attention", "c": "Palm Stand / Abnormal Palm", "t": "Uneven Palm Growth", "i": "Uneven palm growth was observed, with stunted palms in high water level areas, which may affect the palm stand and yield potential.", "r": "Prolonged water stagnant at low-lying area with inadequate portable water pump capacity to pump out water.", "a": "Propose electrical water pump to be installed at 2017A –project approved and at tender stage. Connect round culvert to channel out water to low lying area.", "b": "Estate"}, {"s": "attention", "c": "Field Upkeep / Weeding", "t": "Circle Raking", "i": "Delayed circle raking was observed in spotted areas, indicating that raking activities require further improvement.", "r": "Flood prone area over 15% of 2017A (low lying area) -disrupt circle accessibility during monsoon season.", "a": "Lowering water level at affected area and plan for circle raking once ground condition permit access.", "b": "Estate"}, {"s": "attention", "c": "Drainage / Water Mgmt.", "t": "Silted Drain", "i": "Silted drains at spotted areas were observed, which may impede water flow and affect water management in the field.", "r": "Occurs atlow-lying area portion, resulting in water accumulation. Fluctuating water levels accelerate silt deposition in field drains, requiring more frequent desilting compared to areas on higher ground.", "a": "Increase desilting frequency of field drains to maintain effective water flow, prioritisinglow-lying and silt-prone areas.", "b": "Estate"}, {"s": "rnd", "c": "Harvesting", "t": "Crop Recovery", "i": "Uncollected and rotten bunch in 30% of area.", "r": "Removal of undeveloped/malform rotten bunches on palm.", "a": "To improve undeveloped bunches on palm follow up by circle raking .", "b": "R&D"}, {"s": "rnd", "c": "Drainage / Water Mgmt.", "t": "Flooding", "i": "Flooding in 18% of the area next to the DID canal.", "r": "Low lying area followed by heavy rainfall received in Sept, 207 mmwithin 12 days and Oct, 203mm within 8 days.", "a": "Newdiesel engine have been installed at the nearest outlet in Jan 2026. Desilting drain to carry out twice a year frequncy", "b": "R&D"}, {"s": "rnd", "c": "Pest & Disease", "t": "Old Rat Damage", "i": "High number of old rat damage observed in 20% area (>70% fruitlets nibbled).", "r": "First round completed in June 2026. Second campaign is currently in progress and will be completed in Oct 26.", "a": "Very minimal fresh damage observed. Rate population under control.", "b": "R&D"}, {"s": "rnd", "c": "Field Practice", "t": "Over Pruning", "i": "Over-pruned palms were observed in 30% of the area.", "r": "To ease mchanicalfertiliserapplication at 2022B using MTFA –accessibility.", "a": "To improve frond retention standard by keeping 2-3 fronds below the lowest bunch.", "b": "R&D"}, {"s": "attention", "c": "Field Upkeep / Weeding", "t": "Circle Raking", "i": "Delay circle raking at spotted areas was observed in the field; palm circles to be monitored to support loose fruit collection.", "r": "Trash resulted from removal of undeveloped/malform rotten bunches on palm.", "a": "To deploy one round of circle raking in FY2026", "b": "Estate"}, {"s": "attention", "c": "Yield Making (EFB / MCP / Manuring)", "t": "Malformed Bunches", "i": "Malformed bunches were observed on several palms, which may reduce FFB production and overall yield performance.", "r": "Rat infestation on the male inflorescece as observed from the old rat damaged to malform bunches.", "a": "To carry out second campaign of rat baiting by Oct26.", "b": "Estate"}, {"s": "monitor", "c": "Pest & Disease", "t": "Bagworm", "i": "Bagworm infestation was last treated on 7 Oct 2026; Latest census data given by the estate recorded below ATL.", "a": "Latest census and random field checks during the visit indicate a reduction in the infested area. Continue routine census monitoring, and if infestation exceeds the threshold level, proceed with trunk injection at 14-day intervals. The estate should remain vigilant, initiate census promptly upon detection of persistent symptoms, and commence treatment once pest populations surpass the economic threshold.", "b": "R&D"}, {"s": "good", "c": "Palm Stand / Abnormal Palm", "t": "Palm Supply (Flood)", "i": "3,131 palms were supplied in 2024 @ 26% due to flooding; growth of the supplied palms is to be monitored."}, {"s": "good", "c": "Field Practice", "t": "Upkeep (well maintained)", "i": "General field upkeep was well maintained, with satisfactory field conditions observed across the visited area."}, {"s": "good", "c": "Field Practice", "t": "Field & collection drain", "i": "Field and collection drains were well maintained, supporting effective water flow and drainage in the field."}];

function newObs() {
  return {
    id: newId(), status: 'attention', category: 'Pest & Disease', title: '', affectedHa: '',
    issue: '', root: '', photos: [], actionBy: 'Estate', due: '', action: '', target: '', uom: 'Ha', remark: '',
  };
}

function etuCounts(v) {
  const c = { attention: 0, rnd: 0, monitor: 0, good: 0, photos: 0, actions: 0 };
  (v.fields || []).forEach((f) =>
    (f.obs || []).forEach((o) => {
      c[o.status] = (c[o.status] || 0) + 1;
      c.photos += (o.photos || []).length;
      if (o.status !== 'good' && (o.action || '').trim()) c.actions++;
    })
  );
  return c;
}

// Observations with an action plan become follow-ups (Follow-ups pages)
function syncEtuActions(v, actions) {
  const key = 'etu-' + v.id + '-';
  const old = {};
  actions.filter((a) => a.id.startsWith(key)).forEach((a) => (old[a.id] = a));
  const keep = actions.filter((a) => !a.id.startsWith(key));
  const add = [];
  (v.fields || []).forEach((f) =>
    (f.obs || []).forEach((o) => {
      if (o.status === 'good' || !(o.action || '').trim()) return;
      const id = key + o.id;
      const prev = old[id] || {};
      add.push({
        id: id, estateId: v.estateId, visitId: null, fieldId: f.fieldId || null,
        actId: activityFor(o.category + ' ' + o.title),
        text: (f.fieldId ? '' : 'Field ' + f.code + ' · ') + (o.title || o.category) + ': ' + firstLine(o.action, 110),
        pic: o.actionBy || 'Estate', due: o.due || '', status: prev.status || 'open', doneAt: prev.doneAt || null,
        createdAt: prev.createdAt || v.date || today(),
      });
    })
  );
  return add.concat(keep);
}

function etuReport(v, estate) {
  const c = etuCounts(v);
  const L = [
    'ETU FIELD VISIT – ' + (estate ? estate.name : '') + ' Estate',
    [estate && estate.region, estate && estate.sou].filter(Boolean).join(' · '),
    showDate(v.date) + (v.visitedBy ? ' · Visited by ' + v.visitedBy : ''),
    'Fields: ' + ((v.fields || []).map((f) => f.code).join(', ') || '-'),
    'Attention ' + c.attention + ' | R&D ' + c.rnd + ' | Monitor ' + c.monitor + ' | Good ' + c.good,
  ];
  const dot = { attention: '🔴', rnd: '🔵', monitor: '🟠', good: '🟢' };
  (v.fields || []).forEach((f) => {
    L.push('', 'FIELD ' + f.code);
    ESTAT_ORDER.forEach((st) =>
      (f.obs || [])
        .filter((o) => o.status === st)
        .forEach((o) => {
          L.push(dot[st] + ' ' + ESTAT[st].short + ' – ' + o.category + (o.title ? ': ' + o.title : '') + (o.affectedHa ? ' (' + o.affectedHa + ' ha)' : ''));
          if (o.issue) L.push('Issue: ' + o.issue);
          if (o.root) L.push('Root cause: ' + o.root);
          if (st !== 'good' && o.action) {
            L.push('Action (' + (o.actionBy || 'Estate') + (o.due ? ', by ' + showDate(o.due) : '') + '): ' + o.action);
          }
          if (st !== 'good' && o.remark) L.push('Remark: ' + o.remark);
          if ((o.photos || []).length) L.push('Photos: ' + o.photos.length + ' (in the app)');
        })
    );
  });
  if ((v.notes || '').trim()) L.push('', 'ADDITIONAL ISSUES', v.notes.trim());
  return L.filter((x) => x !== '').join('\n').replace(/\n(FIELD|ADDITIONAL)/g, '\n\n$1');
}

// small coloured topic icon for a category
function CatIcon({ cat, size }) {
  const c = catOf(cat);
  const s = size || 38;
  return (
    <View style={[styles.catIc, { width: s, height: s, backgroundColor: c.c + '22' }]}>
      <Ionicons name={c.ic} size={Math.round(s * 0.55)} color={c.c} />
    </View>
  );
}

function StatusChip({ st }) {
  const s = ESTAT[st] || ESTAT.good;
  return <Chip tone={s.tone} dot label={s.label} />;
}

// ---------- 1. visit list ----------
function EtuListScreen(p) {
  const { etu, estates } = p;
  const [est, setEst] = useState(p.estateId || 'all');
  const list = etu
    .filter((v) => est === 'all' || v.estateId === est)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const nFields = list.reduce((n, v) => n + (v.fields || []).length, 0);
  const nAtt = list.reduce((n, v) => n + etuCounts(v).attention, 0);
  const visited = [...new Set(etu.map((v) => v.estateId))];
  const ename = (id) => (estates.find((e) => e.id === id) || {}).name || 'Estate';
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Hero
        eyebrow="ETU field visit"
        title={list.length ? visited.length + ' estate' + (visited.length === 1 ? '' : 's') + ' visited' : 'Ready for your first visit'}
        sub={list.length ? 'Latest visit ' + showDate(list[0].date) : 'Record issues, photos and action plans by field'}
        stats={[
          { ic: 'list', v: String(list.length), l: 'Visits' },
          { ic: 'grid', v: String(nFields), l: 'Fields' },
          { ic: 'alert-circle', v: String(nAtt), l: 'Attention', tone: nAtt ? 'att' : 'good' },
        ]}
      />
      <CTA label="NEW FIELD VISIT" icon="add" onPress={() => p.onNew(est !== 'all' ? est : estates.length === 1 ? estates[0].id : null)} />
      {visited.length > 1 && (
        <FilterChips
          value={est}
          onChange={setEst}
          options={[{ key: 'all', label: 'All', n: etu.length }].concat(
            visited.map((id) => ({ key: id, label: ename(id), n: etu.filter((v) => v.estateId === id).length }))
          )}
        />
      )}
      {list.length === 0 && (
        <Empty title="No visits yet" text="Tap NEW FIELD VISIT at the estate. Add each field you assess, record observations with photos, then share the report." />
      )}
      {list.map((v) => {
        const c = etuCounts(v);
        const e = estates.find((x) => x.id === v.estateId) || {};
        return (
          <Pressable key={v.id} style={styles.card} onPress={() => p.onOpen(v.id)}>
            <DateBox date={v.date} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rcardTitle} numberOfLines={1}>{(e.name || 'No estate') + ' Estate'}</Text>
              <T style={styles.meta} numberOfLines={1}>{[e.region, e.sou, v.visitedBy].filter(Boolean).join(' · ') || 'Tap to add details'}</T>
              <View style={styles.chips}>
                <Chip tone={v.status === 'done' ? 'good' : 'rnd'} dot label={v.status === 'done' ? 'Completed' : 'In progress'} />
                <Chip tone="muted" label={(v.fields || []).length + ' fields'} />
                {c.attention > 0 && <Chip tone="att" dot label={c.attention + ' attention'} />}
                {c.rnd > 0 && <Chip tone="rnd" dot label={c.rnd + ' R&D'} />}
                {c.actions > 0 && <Chip tone="muted" label={c.actions + ' actions'} />}
                {c.photos > 0 && <Chip tone="muted" label={c.photos + ' photos'} />}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ---------- 3. one field in the visit ----------
function EtuFieldScreen(p) {
  const { visit, vf, estates } = p;
  const [confirm, setConfirm] = useState(false);
  const e = estates.find((x) => x.id === visit.estateId);
  const obs = vf.obs || [];
  const att = obs.filter((o) => o.status === 'attention').length;
  const nph = obs.reduce((n, o) => n + (o.photos || []).length, 0);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Hero
        mini
        eyebrow={'ETU field visit · ' + (e ? e.name : '')}
        title={'Field ' + vf.code}
        sub={showDate(visit.date)}
        stats={[
          { ic: 'eye', v: String(obs.length), l: 'Remarks' },
          { ic: 'alert-circle', v: String(att), l: 'Attention', tone: att ? 'att' : 'good' },
          { ic: 'camera', v: String(nph), l: 'Photos' },
        ]}
      />
      <Section
        icon="eye-outline"
        title={'Observations · ' + obs.length}
        right={
          <Pressable style={styles.smallBtn} onPress={p.onAddObs}>
            <Ionicons name="add" size={16} color="#fff" />
            <T style={styles.smallBtnText}>Add</T>
          </Pressable>
        }>
        {obs.length === 0 && <T style={styles.hint}>Record issues and good practices seen in this field. Issues get an action plan.</T>}
        {ESTAT_ORDER.flatMap((st) => obs.filter((o) => o.status === st)).map((o) => (
          <Pressable key={o.id} style={styles.ocard} onPress={() => p.onOpenObs(o.id)}>
            <CatIcon cat={o.category} />
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <T style={styles.kvLabel} numberOfLines={1}>{o.category}</T>
              <T style={styles.bold}>{o.title || 'Untitled'}</T>
              <View style={[styles.chips, { marginTop: 0 }]}>
                <StatusChip st={o.status} />
                {o.affectedHa ? <Chip tone="muted" label={o.affectedHa + ' ha'} /> : null}
              </View>
              {o.issue ? <T style={styles.meta} numberOfLines={2}>{o.issue}</T> : null}
              {(o.photos || []).length > 0 && (
                <View style={styles.photoRow}>
                  {o.photos.slice(0, 4).map((u, i) => (
                    <Image key={u + i} source={{ uri: u }} style={styles.thumbS} />
                  ))}
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </Section>
      <DeleteBox label={'Remove field ' + vf.code + ' and its observations from this visit?'} button="Remove field" confirm={confirm} setConfirm={setConfirm} onDelete={p.onDelete} />
    </ScrollView>
  );
}

// ---------- 4. one observation ----------
function EtuObsScreen(p) {
  const { obs, vf } = p;
  const [showLib, setShowLib] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const set = (k, v) => p.onChange({ ...obs, [k]: v });
  const setMany = (o) => p.onChange({ ...obs, ...o });
  const titles = [...new Set(WORD_LIB.filter((x) => x.c === obs.category).map((x) => x.t))].slice(0, 10);
  const q = norm(obs.title);
  const lib = WORD_LIB.map((x, ix) => ({ x: x, ix: ix, sc: (x.c === obs.category ? 2 : 0) + (x.s === obs.status ? 1 : 0) + (q && norm(x.t).includes(q) ? 4 : 0) }))
    .filter((y) => y.sc >= 2)
    .sort((a, b) => b.sc - a.sc)
    .slice(0, 4);
  const useLib = (x) => {
    const o = { title: obs.title || x.t, issue: x.i };
    if (x.r) o.root = x.r;
    if (obs.status !== 'good') {
      if (x.a) o.action = x.a;
      if (x.b) o.actionBy = x.b;
    }
    setMany(o);
    setShowLib(false);
  };
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <PageHead icon="eye-outline" title={obs.title || 'Observation'} sub={'Field ' + vf.code + ' · ' + obs.category} />

      <Section icon="flag-outline" title="Status">
        <View style={styles.stGrid}>
          {ESTAT_ORDER.map((k) => {
            const on = obs.status === k;
            const fg = TONE_FG[ESTAT[k].tone];
            return (
              <Pressable key={k} style={[styles.stCell, on && { backgroundColor: fg, borderColor: fg }]} onPress={() => set('status', k)}>
                <Ionicons name={ESTAT[k].icon} size={16} color={on ? '#fff' : fg} />
                <T style={[styles.stText, { color: on ? '#fff' : fg }]}>{ESTAT[k].label}</T>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section icon="apps-outline" title="Issue category">
        <View style={styles.catGrid}>
          {ECATS.map((c) => {
            const on = obs.category === c.k;
            return (
              <Pressable key={c.k} style={[styles.catBtn, on && { borderColor: c.c, backgroundColor: c.c + '18' }]} onPress={() => set('category', c.k)}>
                <View style={[styles.catIc, { width: 30, height: 30, backgroundColor: on ? c.c : c.c + '22' }]}>
                  <Ionicons name={c.ic} size={17} color={on ? '#fff' : c.c} />
                </View>
                <T style={styles.catText} numberOfLines={2}>{c.k}</T>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section icon="create-outline" title="Observation">
        <Field label="Observation" full value={obs.title} placeholder="e.g. Historical Bagworm" onChangeText={(t) => set('title', t)} />
        {titles.length > 0 && (
          <View style={[styles.chips, { marginTop: 0 }]}>
            {titles.map((t) => (
              <Pressable key={t} style={[styles.filterChip, obs.title === t && styles.filterChipOn]} onPress={() => set('title', t)}>
                <T style={[styles.filterText, obs.title === t && { color: '#fff' }]}>{t}</T>
              </Pressable>
            ))}
          </View>
        )}
        <Field label="Affected ha (optional)" full keyboardType="numeric" value={obs.affectedHa} onChangeText={(t) => set('affectedHa', t)} />
        <Field label="Issue highlighted" full multiline value={obs.issue} placeholder="What was observed and its effect" onChangeText={(t) => set('issue', t)} />
        <Pressable style={styles.ghostBtn} onPress={() => setShowLib(!showLib)}>
          <Ionicons name="library-outline" size={16} color={C.accent} />
          <T style={styles.link}>{showLib ? 'Hide standard wording' : 'Use standard wording'}</T>
        </Pressable>
        {showLib && (
          <View style={{ gap: 6 }}>
            <T style={styles.kvLabel}>NTR – UTO wording library · tap to use</T>
            {lib.length === 0 && <T style={styles.hint}>No wording for this category yet.</T>}
            {lib.map(({ x, ix }) => (
              <Pressable key={ix} style={styles.libItem} onPress={() => useLib(x)}>
                <T style={[styles.bold, { color: C.accent }]}>{x.t}</T>
                <T style={styles.meta} numberOfLines={3}>{x.i}</T>
                <T style={styles.hint}>{ESTAT[x.s].short}{x.a ? ' · + root cause & action plan' : x.r ? ' · + root cause' : ''}</T>
              </Pressable>
            ))}
          </View>
        )}
        <Field label="Root cause (estate)" full multiline value={obs.root} placeholder="One point per line" onChangeText={(t) => set('root', t)} />
      </Section>

      <Section icon="camera-outline" title="Field evidence">
        <PhotoStrip photos={obs.photos} onChange={(l) => set('photos', l)} />
      </Section>

      {obs.status !== 'good' && (
        <Section icon="locate-outline" title="Estate action plan">
          <T style={styles.label}>Action by</T>
          <View style={[styles.chips, { marginTop: 0 }]}>
            {ACTION_BY.map((b) => (
              <Pressable key={b} style={[styles.filterChip, obs.actionBy === b && styles.filterChipOn]} onPress={() => set('actionBy', b)}>
                <T style={[styles.filterText, obs.actionBy === b && { color: '#fff' }]}>{b}</T>
              </Pressable>
            ))}
          </View>
          <View style={styles.row2}>
            <DateField label="Target completion" value={obs.due} onChange={(d) => set('due', d)} />
          </View>
          <Field label="Action plan" full multiline value={obs.action} placeholder="One action per line" onChangeText={(t) => set('action', t)} />
          <View style={styles.row2}>
            <Field label="Target" keyboardType="numeric" value={obs.target} onChangeText={(t) => set('target', t)} />
            <View style={styles.field}>
              <T style={styles.label}>Unit</T>
              <View style={[styles.chips, { marginTop: 0 }]}>
                {UOMS.slice(0, 4).map((u) => (
                  <Pressable key={u} style={[styles.filterChip, obs.uom === u && styles.filterChipOn]} onPress={() => set('uom', u)}>
                    <T style={[styles.filterText, obs.uom === u && { color: '#fff' }]}>{u}</T>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          <Field label="Remarks & recommendation" full multiline value={obs.remark} onChangeText={(t) => set('remark', t)} />
          <T style={styles.hint}>An action plan here also appears in the estate's Follow-ups, with PIC = Action by.</T>
        </Section>
      )}

      <DeleteBox label="Remove this observation?" button="Remove observation" confirm={confirm} setConfirm={setConfirm} onDelete={p.onDelete} />
    </ScrollView>
  );
}

// =====================================================
// BOTTOM NAVIGATION (always visible)
// =====================================================
const NAV = [
  { k: 'home', label: 'Home', ic: 'home' },
  { k: 'estates', label: 'Estates', ic: 'business' },
  { k: 'etu', label: 'Visits', ic: 'walk' },
  { k: 'alerts', label: 'Priorities', ic: 'alert-circle' },
  { k: 'more', label: 'More', ic: 'menu' },
];

function BottomNav({ active, onGo, badge }) {
  return (
    <View style={styles.nav}>
      {NAV.map((n) => {
        const on = n.k === active;
        return (
          <Pressable key={n.k} style={styles.navBtn} onPress={() => onGo(n.k)}>
            {on && <View style={styles.navBar} />}
            <View>
              <Ionicons name={on ? n.ic : n.ic + '-outline'} size={24} color={on ? C.accent : C.muted} />
              {n.k === 'alerts' && badge > 0 ? (
                <View style={styles.navBadge}>
                  <T style={styles.badgeText}>{badge > 99 ? '99+' : badge}</T>
                </View>
              ) : null}
            </View>
            <T style={[styles.navText, on && { color: C.accent }]}>{n.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

// =====================================================
// MORE: profit, upload, settings
// =====================================================
function MoreScreen(p) {
  const { estates, fields, visits, actions } = p;
  const etu = p.etu || [];
  const total = estates.reduce((s, e) => s + (num(e.profitAct) || 0), 0);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <PageHead icon="menu-outline" title="More" sub="Reports, data and settings" />
      <Menu>
        <MenuRow icon="bar-chart-outline" title="Profit by estate" sub={total ? rmMil(total) + ' YTD' : 'No profit data'} tone="gold" onPress={() => p.onGo('profit')} />
        <MenuRow icon="cloud-upload-outline" title="Upload estate data" sub="Excel workbook, CSV or paste" tone="rnd" onPress={() => p.onGo('upload')} />
        <MenuRow icon="options-outline" title="Settings" sub="Trigger limits · clear data" last onPress={() => p.onGo('settings')} />
      </Menu>
      <Section icon="phone-portrait-outline" title="On this phone">
        <View style={styles.kv}>
          <KV label="Estates" value={String(estates.length)} />
          <KV label="Fields" value={String(fields.length)} />
          <KV label="ETU visits" value={String(etu.length)} />
          <KV label="Follow-ups" value={String(actions.length)} />
          <KV label="Assessments" value={String(visits.length)} />
          <KV label="Internet needed" value="No, works offline" />
        </View>
        <T style={styles.hint}>Everything is saved on this phone as you type. No internet is needed in the field.</T>
      </Section>
    </ScrollView>
  );
}

// =====================================================
// HOME DASHBOARD
// =====================================================
function Kpi({ v, label, tone, icon, onPress }) {
  return (
    <Pressable style={[styles.kpi, { borderLeftColor: TONE_FG[tone] }]} onPress={onPress}>
      <View style={styles.rowBetween}>
        <Text style={[styles.kpiVal, { color: TONE_FG[tone] }]}>{v}</Text>
        <Ionicons name={icon} size={20} color={TONE_FG[tone]} />
      </View>
      <T style={styles.kpiLbl}>{label}</T>
    </Pressable>
  );
}

function HomeScreen(p) {
  const { estates, fields, actions } = p;
  const etu = p.etu || [];
  const pri = fieldPriorities(p);
  const open = actions.filter((a) => a.status !== 'done');
  const overdue = open.filter(isOverdue);
  const tLost = pri.reduce((s, x) => s + x.tLost, 0);
  const month = today().slice(0, 7);
  const doneMonth = etu.filter((v) => v.status === 'done' && (v.date || '').slice(0, 7) === month).length;
  const drafts = etu.filter((v) => v.status !== 'done');
  const recent = [...etu].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 3);
  const withProfit = estates.filter((e) => num(e.profitAct) !== null);
  const total = withProfit.reduce((s, e) => s + (num(e.profitAct) || 0), 0);
  const maxP = withProfit.reduce((m, e) => Math.max(m, num(e.profitAct) || 0), 1);
  const d = new Date();
  const hi = d.getHours() < 12 ? 'Good morning' : d.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  if (estates.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Hero eyebrow="ETU field visit" title="Welcome" sub="Start by uploading your estate workbook" stats={[{ ic: 'business', v: '0', l: 'Estates' }, { ic: 'grid', v: '0', l: 'Fields' }, { ic: 'walk', v: '0', l: 'Visits' }]} />
        <CTA label="UPLOAD ESTATE DATA" icon="cloud-upload" color={C.rnd} onPress={() => p.onGo('upload')} />
        <CTA label="LOAD EXAMPLE DATA" icon="download-outline" color={C.muted} onPress={p.onExample} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      {/* summary */}
      <View style={styles.sumCard}>
        <T style={styles.sumEyebrow}>{hi + ' · ' + showDate(today())}</T>
        <View style={styles.sumMain}>
          <Text style={[styles.sumBig, { color: pri.length ? C.att : C.good }]}>{pri.length}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sumTitle}>{pri.length ? 'fields need attention' : 'fields need attention. All in order.'}</Text>
            <T style={styles.meta}>
              {Math.round(tLost).toLocaleString('en-MY')} t below budget YTD · {fields.length} fields · {estates.length} estates
            </T>
          </View>
        </View>
        <View style={styles.kpiGrid}>
          <Kpi v={String(overdue.length)} label="Overdue follow-ups" tone={overdue.length ? 'att' : 'good'} icon="time" onPress={() => p.onGo('alerts')} />
          <Kpi v={String(open.length)} label="Open follow-ups" tone={open.length ? 'mon' : 'good'} icon="flag" onPress={() => p.onGo('alerts')} />
          <Kpi v={String(doneMonth)} label="Visits completed this month" tone="good" icon="checkmark-done" onPress={() => p.onGo('etu')} />
          <Kpi v={String(drafts.length)} label="Visits in progress" tone={drafts.length ? 'rnd' : 'muted'} icon="create" onPress={() => p.onGo('etu')} />
        </View>
      </View>

      {/* quick actions */}
      <CTA label="NEW FIELD VISIT" icon="add-circle" onPress={() => p.onNewEtu()} />
      <View style={styles.row2}>
        <Pressable style={[styles.quick, { borderColor: C.rnd }]} onPress={() => p.onGo('upload')}>
          <Ionicons name="cloud-upload" size={20} color={C.rnd} />
          <T style={[styles.quickText, { color: C.rnd }]}>Upload data</T>
        </Pressable>
        <Pressable style={[styles.quick, { borderColor: C.att }]} onPress={() => p.onGo('alerts')}>
          <Ionicons name="podium" size={20} color={C.att} />
          <T style={[styles.quickText, { color: C.att }]}>All priorities</T>
        </Pressable>
      </View>

      {/* top 5 */}
      {pri.length > 0 && (
        <Section icon="podium-outline" title="Top 5 fields" right={<T style={styles.hint}>worst first</T>}>
          {pri.slice(0, 5).map((it, i) => (
            <Pressable key={it.key} style={[styles.priRow, { borderLeftColor: TONE_FG[it.tone] }]} onPress={() => p.onOpenField(it.f.id)}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={styles.priTitle} numberOfLines={1}>
                  {i + 1}. {it.e.name} · {it.f.code}
                </T>
                <T style={[styles.meta, { color: TONE_FG[it.tone] }]} numberOfLines={1}>
                  {(it.tLost >= 1 ? Math.round(it.tLost) + ' t below budget · ' : '') + it.reasons.map((r) => r.t).join(' · ')}
                </T>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </Pressable>
          ))}
        </Section>
      )}

      {/* recent activity */}
      <Section icon="time-outline" title="Recent field visits" right={<Pressable onPress={() => p.onGo('etu')}><T style={styles.link}>All visits</T></Pressable>}>
        {recent.length === 0 && <T style={styles.hint}>No ETU field visits yet. Tap NEW FIELD VISIT to start one.</T>}
        {recent.map((v) => {
          const e = estates.find((x) => x.id === v.estateId) || {};
          const c = etuCounts(v);
          return (
            <Pressable key={v.id} style={styles.card} onPress={() => p.onOpenEtu(v.id)}>
              <DateBox date={v.date} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={styles.priTitle} numberOfLines={1}>{(e.name || 'No estate') + ' Estate'}</T>
                <View style={styles.chips}>
                  <Chip tone={v.status === 'done' ? 'good' : 'rnd'} dot label={v.status === 'done' ? 'Completed' : 'In progress'} />
                  <Chip tone="muted" label={(v.fields || []).length + ' fields'} />
                  {c.attention > 0 && <Chip tone="att" label={c.attention + ' attention'} />}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </Pressable>
          );
        })}
      </Section>

      {/* profit */}
      {withProfit.length > 0 && (
        <Section icon="cash-outline" title="Profit YTD" right={<Pressable onPress={() => p.onGo('profit')}><T style={styles.link}>Details</T></Pressable>}>
          <Text style={styles.moneyBig}>{rmMil(total)}</Text>
          {withProfit.map((e) => (
            <Bar key={e.id} label={e.name} value={num(e.profitAct)} max={maxP} color={C.accent} right={rmMil(e.profitAct)} />
          ))}
        </Section>
      )}
    </ScrollView>
  );
}

// =====================================================
// ETU VISIT: step by step  Estate → Fields → Observations → Review
// =====================================================
const STEPS = ['Estate', 'Fields', 'Observations', 'Review'];

function StepBar({ step, setStep, done }) {
  return (
    <View style={styles.stepBar}>
      {STEPS.map((s, i) => {
        const on = i === step;
        const past = i < step || done;
        return (
          <Pressable key={s} style={styles.stepItem} onPress={() => setStep(i)}>
            <View style={[styles.stepDot, past && { backgroundColor: C.good, borderColor: C.good }, on && { backgroundColor: C.accent, borderColor: C.accent }]}>
              {past && !on ? <Ionicons name="checkmark" size={15} color="#fff" /> : <T style={[styles.stepNo, (on || past) && { color: '#fff' }]}>{i + 1}</T>}
            </View>
            <T style={[styles.stepText, on && { color: C.accent, fontFamily: F.bold }]} numberOfLines={1}>{s}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

function EtuVisitScreen(p) {
  const { visit, estates, fields } = p;
  const [step, setStep] = useState(visit.estateId ? ((visit.fields || []).length ? 2 : 1) : 0);
  const [q, setQ] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState(false);
  const e = estates.find((x) => x.id === visit.estateId);
  const ef = fields.filter((f) => f.estateId === visit.estateId);
  const c = etuCounts(visit);
  const vfs = visit.fields || [];
  const set = (k, val) => p.onChange({ ...visit, [k]: val });
  const done = visit.status === 'done';

  // fields seen on earlier visits of this estate
  const recentIds = [];
  (p.etu || [])
    .filter((v) => v.id !== visit.id && v.estateId === visit.estateId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .forEach((v) => (v.fields || []).forEach((f) => f.fieldId && !recentIds.includes(f.fieldId) && recentIds.push(f.fieldId)));

  const has = (fid) => vfs.some((x) => x.fieldId === fid);
  const toggle = (f) => {
    const cur = vfs.find((x) => x.fieldId === f.id);
    if (cur) {
      if ((cur.obs || []).length) {
        setMsg('Field ' + f.code + ' has observations. Open it under Observations to remove it.');
        return;
      }
      set('fields', vfs.filter((x) => x.id !== cur.id));
    } else {
      set('fields', [...vfs, { id: newId(), fieldId: f.id, code: f.code, obs: [] }]);
    }
    setMsg('');
  };
  const addCode = () => {
    const cd = code.trim().toUpperCase();
    if (!cd) return;
    const f = ef.find((x) => x.code === cd);
    if (f) {
      if (!has(f.id)) toggle(f);
    } else if (!vfs.some((x) => x.code === cd)) {
      set('fields', [...vfs, { id: newId(), fieldId: null, code: cd, obs: [] }]);
    }
    setCode('');
  };
  const share = async () => {
    try {
      await Share.share({ message: etuReport(visit, e) });
    } catch (err) {
      setMsg('Sharing works on the phone, not in this preview.');
    }
  };
  const list = ef.filter((f) => norm(f.code).includes(norm(q)));
  const canNext = step === 0 ? !!visit.estateId : step === 1 ? vfs.length > 0 : true;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.visitHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T style={styles.sumEyebrow}>ETU field visit · {showDate(visit.date)}</T>
            <Text style={styles.pageTitle} numberOfLines={1}>{e ? e.name + ' Estate' : 'New field visit'}</Text>
          </View>
          <Chip tone={done ? 'good' : 'rnd'} dot label={done ? 'Completed' : 'In progress'} />
        </View>
        <StepBar step={step} setStep={setStep} done={done} />

        {step === 0 && (
          <>
            <Section icon="business-outline" title="1. Select estate">
              {estates.map((x) => {
                const on = x.id === visit.estateId;
                return (
                  <Pressable key={x.id} style={[styles.pick, on && styles.pickOn]} onPress={() => set('estateId', x.id)}>
                    <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? C.accent : C.muted} />
                    <View style={{ flex: 1 }}>
                      <T style={styles.priTitle}>{x.name}</T>
                      <T style={styles.meta}>{[x.region, x.sou].filter(Boolean).join(' · ') || 'No region / SOU'}</T>
                    </View>
                  </Pressable>
                );
              })}
            </Section>
            <Section icon="calendar-outline" title="Date & team">
              <View style={styles.row2}>
                <DateField label="Visit date" value={visit.date} onChange={(d) => set('date', d)} />
              </View>
              <Field label="Visited by" full value={visit.visitedBy || ''} placeholder="e.g. Azri, ETU" onChangeText={(t) => set('visitedBy', t)} />
            </Section>
          </>
        )}

        {step === 1 && (
          <Section icon="grid-outline" title="2. Select fields" right={<Chip tone={vfs.length ? 'good' : 'muted'} dot label={vfs.length + ' selected'} />}>
            {vfs.length > 0 && (
              <View style={[styles.chips, { marginTop: 0 }]}>
                {vfs.map((x) => (
                  <View key={x.id} style={styles.selChip}>
                    <T style={styles.selChipText}>{x.code}</T>
                  </View>
                ))}
              </View>
            )}
            {recentIds.length > 0 && (
              <>
                <T style={styles.kvLabel}>Visited before</T>
                <View style={[styles.chips, { marginTop: 0 }]}>
                  {recentIds.slice(0, 8).map((id) => {
                    const f = ef.find((x) => x.id === id);
                    if (!f) return null;
                    const on = has(id);
                    return (
                      <Pressable key={id} style={[styles.filterChip, on && styles.filterChipOn]} onPress={() => toggle(f)}>
                        <T style={[styles.filterText, on && { color: '#fff' }]}>{f.code}</T>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
            <SearchBox value={q} onChange={setQ} placeholder={'Search ' + ef.length + ' fields, e.g. 2016A'} />
            {list.slice(0, 60).map((f) => {
              const on = has(f.id);
              return (
                <Pressable key={f.id} style={[styles.pick, on && styles.pickOn]} onPress={() => toggle(f)}>
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? C.accent : C.muted} />
                  <T style={[styles.priTitle, { flex: 1 }]}>Field {f.code}</T>
                  <T style={styles.meta}>{(f.ha || '-') + ' ha'}</T>
                </Pressable>
              );
            })}
            {list.length > 60 && <T style={styles.hint}>Showing 60 of {list.length}. Type to narrow down.</T>}
            <View style={styles.row2}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Field not listed? Type code" placeholderTextColor="#8A8F80" autoCapitalize="characters" value={code} onChangeText={setCode} />
              <Pressable style={styles.addBtn} onPress={addCode}>
                <Ionicons name="add" size={24} color="#fff" />
              </Pressable>
            </View>
          </Section>
        )}

        {step === 2 && (
          <Section icon="eye-outline" title="3. Observations & photos">
            <T style={styles.hint}>Tap a field to record what you saw: issue, photos and action plan.</T>
            {vfs.length === 0 && <T style={styles.hint}>No fields selected. Go back to step 2.</T>}
            {vfs.map((f) => {
              const cnt = ESTAT_ORDER.map((k) => [k, (f.obs || []).filter((o) => o.status === k).length]).filter((x) => x[1]);
              const nph = (f.obs || []).reduce((n, o) => n + (o.photos || []).length, 0);
              const topics = [];
              (f.obs || []).filter((o) => o.status !== 'good').forEach((o) => {
                const t = o.title || o.category;
                if (!topics.find((x) => x.t === t)) topics.push({ t: t, o: o });
              });
              return (
                <Pressable key={f.id} style={styles.fcardE} onPress={() => p.onOpenField(f.id)}>
                  <View style={styles.rowBetween}>
                    <T style={styles.priTitle}>Field {f.code}</T>
                    <View style={styles.smallBtn}>
                      <Ionicons name={(f.obs || []).length ? 'create' : 'add'} size={16} color="#fff" />
                      <T style={styles.smallBtnText}>{(f.obs || []).length ? 'Open' : 'Record'}</T>
                    </View>
                  </View>
                  <View style={[styles.chips, { marginTop: 0 }]}>
                    {cnt.map(([k, n]) => (
                      <Chip key={k} tone={ESTAT[k].tone} dot label={n + ' ' + ESTAT[k].short} />
                    ))}
                    {nph > 0 && <Chip tone="muted" label={nph + ' photos'} />}
                    {!(f.obs || []).length && <Chip tone="muted" label="Not recorded yet" />}
                  </View>
                  {topics.length > 0 && (
                    <View style={[styles.chips, { marginTop: 0 }]}>
                      {topics.slice(0, 4).map((x) => (
                        <View key={x.t} style={styles.topic}>
                          <Ionicons name={catOf(x.o.category).ic} size={13} color={catOf(x.o.category).c} />
                          <T style={styles.topicText} numberOfLines={1}>{x.t}</T>
                        </View>
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </Section>
        )}

        {step === 3 && (
          <>
            <Section icon="document-text-outline" title="4. Additional issues">
              <Field label="" full multiline value={visit.notes || ''} placeholder="Anything else seen on the visit, one point per line" onChangeText={(t) => set('notes', t)} />
            </Section>
            <Section icon="checkmark-done-outline" title="Review">
              <View style={styles.kv}>
                <KV label="Estate" value={e ? e.name : '-'} />
                <KV label="Date" value={showDate(visit.date)} />
                <KV label="Visited by" value={visit.visitedBy || '-'} />
                <KV label="Fields" value={String(vfs.length)} />
              </View>
              <View style={styles.revGrid}>
                {ESTAT_ORDER.map((k) => (
                  <View key={k} style={[styles.revCell, TONE_BG[ESTAT[k].tone]]}>
                    <Text style={[styles.kpiVal, { color: TONE_FG[ESTAT[k].tone] }]}>{c[k]}</Text>
                    <T style={styles.kpiLbl}>{ESTAT[k].short}</T>
                  </View>
                ))}
              </View>
              <T style={styles.meta}>{c.actions} action plans (added to Follow-ups) · {c.photos} photos</T>
              {vfs.some((f) => !(f.obs || []).length) && (
                <T style={[styles.meta, { color: C.mon }]}>
                  Not recorded yet: {vfs.filter((f) => !(f.obs || []).length).map((f) => f.code).join(', ')}
                </T>
              )}
            </Section>
            <CTA label={done ? 'REOPEN VISIT' : 'MARK VISIT AS COMPLETED'} icon={done ? 'refresh' : 'checkmark-done'} color={done ? C.muted : C.good} onPress={() => set('status', done ? 'draft' : 'done')} />
            <CTA label="SHARE REPORT (WHATSAPP)" icon="share-social" color={C.rnd} onPress={share} />
            <DeleteBox label="Delete this visit and all its observations and photos?" button="Delete visit" confirm={confirm} setConfirm={setConfirm} onDelete={p.onDelete} />
          </>
        )}
        {msg ? <T style={[styles.meta, { color: C.mon }]}>{msg}</T> : null}
      </ScrollView>

      {/* step buttons at the thumb */}
      <View style={styles.stepFoot}>
        <Pressable style={[styles.footBtn, step === 0 && { opacity: 0.4 }]} disabled={step === 0} onPress={() => setStep(step - 1)}>
          <Ionicons name="arrow-back" size={20} color={C.ink} />
          <T style={styles.footText}>Back</T>
        </Pressable>
        {step < 3 ? (
          <Pressable style={[styles.footBtn, styles.footNext, !canNext && { opacity: 0.4 }]} disabled={!canNext} onPress={() => setStep(step + 1)}>
            <T style={[styles.footText, { color: '#fff' }]}>Next: {STEPS[step + 1]}</T>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        ) : (
          <Pressable style={[styles.footBtn, styles.footNext]} onPress={p.onClose}>
            <T style={[styles.footText, { color: '#fff' }]}>Done</T>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ===== STYLES =====
const TOP_PAD =
  Platform.OS === 'ios'
    ? 50
    : Platform.OS === 'android'
    ? (StatusBar.currentHeight || 24) + 6
    : 10;

const SHADOW = {
  shadowColor: '#302C1E',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.bg },
  loading: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { fontFamily: F.body, color: C.ink, fontSize: 16 },
  page: { padding: 16, paddingBottom: 32, gap: 12 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: TOP_PAD,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: C.skyTop,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { fontFamily: F.display, fontSize: 24, color: C.ink },
  topTitleB: { fontFamily: F.displayBold, color: C.accent },
  topSub: { fontSize: 13, color: C.muted, fontFamily: F.semi },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: C.att,
    borderWidth: 2,
    borderColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: F.bold },
  hero: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.line,
    minHeight: 178,
    backgroundColor: C.sky2,
  },
  heroMini: { minHeight: 168 },
  scene: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  heroTx: { paddingHorizontal: 14, paddingTop: 12, gap: 2 },
  eyebrowGold: {
    fontSize: 11,
    fontFamily: F.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: C.gold,
  },
  heroTitle: { fontFamily: F.display, fontSize: 25, color: C.ink },
  heroTitleMini: { fontSize: 23 },
  heroStats: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
    marginTop: 'auto',
    paddingTop: 12,
  },
  hstat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,253,248,0.9)',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 7,
  },
  sic: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hstatVal: { fontFamily: F.display, fontSize: 22, color: C.ink, lineHeight: 24 },
  hstatLbl: { fontSize: 11.5, color: C.muted, fontFamily: F.semi },
  section: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
    gap: 12,
    ...SHADOW,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hic: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontFamily: F.display, fontSize: 21, color: C.ink },
  hint: { fontSize: 13.5, color: C.muted, fontFamily: F.semi },
  meta: { fontSize: 14, color: C.muted },
  link: { color: C.accent, fontFamily: F.semi, fontSize: 14, textDecorationLine: 'underline' },
  kv: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  kvItem: { width: '50%', paddingRight: 8 },
  kvLabel: {
    fontSize: 11.5,
    fontFamily: F.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: C.muted,
  },
  kvValue: { fontFamily: F.semi, fontSize: 15, marginTop: 2 },
  seg: { flexDirection: 'row', gap: 6 },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    alignItems: 'center',
  },
  segBtnOn: { backgroundColor: C.accent, borderColor: C.accent },
  segText: { fontFamily: F.semi, fontSize: 14, color: C.muted },
  segTextOn: { color: '#fff' },
  row2: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, gap: 4 },
  fieldFull: { gap: 4 },
  inputMulti: { minHeight: 76, textAlignVertical: 'top' },
  label: { fontSize: 14, fontFamily: F.semi, color: C.muted },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: F.body,
    color: C.ink,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 15,
  },
  ctaText: { fontFamily: F.display, fontSize: 19, color: '#fff', letterSpacing: 0.6 },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.line,
    borderRadius: 14,
    gap: 4,
  },
  emptyTitle: { fontFamily: F.display, fontSize: 21, color: C.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 13, fontFamily: F.semi },
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: C.sunk,
    overflow: 'hidden',
  },
  barFill: { height: 10, borderRadius: 5 },
  confirm: {
    backgroundColor: C.attBg,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  confirmText: { color: C.att, fontFamily: F.semi },
  btnGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnDanger: {
    flex: 1,
    backgroundColor: C.att,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  delRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  ruleName: { fontFamily: F.semi, fontSize: 14 },
  result: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  resultText: { fontFamily: F.semi, fontSize: 14 },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exc: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.attBg,
    overflow: 'hidden',
    ...SHADOW,
  },
  excHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: C.attBg,
  },
  excTitle: { fontFamily: F.display, fontSize: 19, color: C.att, letterSpacing: 0.5 },
  excCount: {
    backgroundColor: C.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  excCountText: { fontSize: 12, fontFamily: F.bold, color: C.att },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  exIc: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exTitle: { fontSize: 16, fontFamily: F.semi },
  rcard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 10,
  },
  rcardTitle: { fontFamily: F.display, fontSize: 20, color: C.ink },
  dateBox: {
    width: 50,
    borderRadius: 12,
    backgroundColor: C.brand,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dateBoxBig: { fontFamily: F.display, fontSize: 22, color: '#fff', lineHeight: 24 },
  dateBoxSmall: {
    fontSize: 10,
    fontFamily: F.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#D9F2E0',
  },
  estBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estBoxText: { fontFamily: F.display, fontSize: 20, color: '#fff' },
  addBtn: {
    width: 46,
    height: 44,
    borderRadius: 10,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bold: { fontFamily: F.semi, fontSize: 16, color: C.ink },
  strike: { textDecorationLine: 'line-through', color: C.muted },
  costRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  totalRow: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 },
  costName: { flex: 1, minWidth: 0, fontSize: 13 },
  costCell: { width: 70, minWidth: 0, textAlign: 'right' },
  costIn: { paddingHorizontal: 8, paddingVertical: 7, fontSize: 14 },
  costVar: { width: 52, textAlign: 'right', fontSize: 12, fontFamily: F.bold },
  profitBox: { borderRadius: 12, padding: 14, alignItems: 'center' },
  profitBig: { fontFamily: F.display, fontSize: 38 },
  stBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  stText: { fontFamily: F.semi, fontSize: 14 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  barLabel: { flex: 1, fontSize: 14, fontFamily: F.semi },
  barRight: { fontSize: 12, fontFamily: F.bold },
  barMark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    marginLeft: -1.5,
    backgroundColor: C.ink,
  },
  actCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    ...SHADOW,
  },
  actHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  actIc: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actBody: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 12,
  },
  readIn: { width: 84, textAlign: 'right' },
  yesNo: { flexDirection: 'row', gap: 4 },
  ynBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
  },
  ynText: { fontFamily: F.semi, fontSize: 13 },
  resDot: { width: 12, height: 12, borderRadius: 6 },
  fupBox: {
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: C.line,
  },
  fieldBox: {
    width: 56,
    height: 50,
    borderRadius: 12,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldBoxText: { fontFamily: F.display, fontSize: 19, color: C.accent, lineHeight: 21 },
  fieldBoxSub: { fontSize: 11, fontFamily: F.bold, color: C.muted },
  costRo: { fontFamily: F.semi, fontSize: 14 },
  pickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
  },
  pickChipOn: { backgroundColor: C.accent, borderColor: C.accent },
  pickChipText: { fontFamily: F.semi, fontSize: 14 },
  fieldTab: {
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    alignItems: 'center',
  },
  fieldTabOn: { backgroundColor: C.brand, borderColor: C.brand },
  fieldTabText: { fontFamily: F.display, fontSize: 20, color: C.ink },
  tabBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: C.att,
    borderWidth: 2,
    borderColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.accentSoft,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pasteBox: { minHeight: 110, textAlignVertical: 'top', fontSize: 13 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBtnText: { fontFamily: F.semi, fontSize: 15 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  calCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calTitle: { fontFamily: F.display, fontSize: 22, color: C.ink },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calWeek: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontFamily: F.bold,
    color: C.muted,
    paddingVertical: 4,
  },
  calCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  calOn: { backgroundColor: C.accent },
  calToday: { borderWidth: 1.5, borderColor: C.gold },
  calDay: { fontFamily: F.semi, fontSize: 15 },
  photoRow: { flexDirection: 'row', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: C.sunk },
  thumbX: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.accent,
    backgroundColor: C.surface,
  },
  photoBtnText: { fontFamily: F.semi, color: C.accent },
  photoView: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBig: { width: '94%', height: '80%' },
  photoClose: { color: '#fff', marginTop: 10 },
  rcardCol: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  setHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ddText: { flex: 1, fontFamily: F.semi, fontSize: 15 },
  ddCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  ddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  ddRowOn: { backgroundColor: C.accentSoft },
  selBar: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    ...SHADOW,
  },
  actGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actTile: {
    width: '48.8%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  actTileText: { flex: 1, fontSize: 12, fontFamily: F.semi },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
  },
  switchRowOn: { borderColor: C.att, backgroundColor: C.attBg },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tile: {
    width: '48.5%',
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    gap: 6,
    ...SHADOW,
  },
  tileIc: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: { fontFamily: F.display, fontSize: 21, color: C.ink },
  tileSub: { fontSize: 13.5, color: C.muted, fontFamily: F.semi },
  tileBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    backgroundColor: C.att,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
    ...SHADOW,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  menuIc: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: { fontFamily: F.semi, fontSize: 17, color: C.ink },
  pageHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  pageTitle: { fontFamily: F.display, fontSize: 26, color: C.ink, lineHeight: 28 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIn: { flex: 1, paddingVertical: 10, fontSize: 15, fontFamily: F.body, color: C.ink },
  filterRow: { flexDirection: 'row', gap: 6 },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  filterChipOn: { backgroundColor: C.accent, borderColor: C.accent },
  filterText: { fontFamily: F.semi, fontSize: 14, color: C.ink },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 11,
  },
  sumRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 10,
    ...SHADOW,
  },
  sumItem: { flex: 1, alignItems: 'center', gap: 2 },
  sumVal: { fontFamily: F.display, fontSize: 22, color: C.ink, lineHeight: 24 },
  sumLbl: { fontSize: 11, color: C.muted, fontFamily: F.semi },
  rankBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rankNo: { fontFamily: F.display, fontSize: 19 },
  catIc: { borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  smallBtnText: { color: '#fff', fontFamily: F.semi, fontSize: 14 },
  fcardE: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    maxWidth: '100%',
  },
  topicText: { fontSize: 13, fontFamily: F.semi },
  thumbS: { width: 52, height: 52, borderRadius: 8, backgroundColor: C.sunk },
  ocard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 12,
  },
  stGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  stCell: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  catBtn: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.bg,
  },
  catText: { flex: 1, fontSize: 13.5, fontFamily: F.semi, color: C.ink },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  libItem: {
    gap: 2,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.accent,
    backgroundColor: C.accentSoft,
  },
  nav: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingBottom: Platform.OS === 'ios' ? 22 : 6,
  },
  navBtn: { flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 2, gap: 2 },
  navBar: { position: 'absolute', top: 0, left: '28%', right: '28%', height: 3, borderRadius: 2, backgroundColor: C.accent },
  navText: { fontSize: 12, fontFamily: F.semi, color: C.muted },
  navBadge: {
    position: 'absolute',
    top: -5,
    right: -12,
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: C.att,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sumCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    gap: 12,
    ...SHADOW,
  },
  sumEyebrow: { fontSize: 12, fontFamily: F.bold, letterSpacing: 0.8, textTransform: 'uppercase', color: C.gold },
  sumMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sumBig: { fontFamily: F.displayBold, fontSize: 56, lineHeight: 58 },
  sumTitle: { fontFamily: F.display, fontSize: 24, color: C.ink, lineHeight: 26 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  kpi: {
    width: '48.5%',
    backgroundColor: C.bg,
    borderRadius: 12,
    borderLeftWidth: 5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  kpiVal: { fontFamily: F.displayBold, fontSize: 30, lineHeight: 32 },
  kpiLbl: { fontSize: 13, fontFamily: F.semi, color: C.muted },
  quick: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: C.surface,
  },
  quickText: { fontFamily: F.bold, fontSize: 15 },
  priRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.bg,
    borderRadius: 12,
    borderLeftWidth: 5,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  priTitle: { fontFamily: F.semi, fontSize: 16.5, color: C.ink },
  moneyBig: { fontFamily: F.displayBold, fontSize: 34, color: C.accent },
  visitHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 10,
  },
  stepItem: { flex: 1, alignItems: 'center', gap: 4 },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: C.line,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNo: { fontFamily: F.bold, fontSize: 14, color: C.muted },
  stepText: { fontSize: 12, fontFamily: F.semi, color: C.muted },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.bg,
  },
  pickOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  selChip: { backgroundColor: C.accent, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  selChipText: { color: '#fff', fontFamily: F.semi, fontSize: 13 },
  revGrid: { flexDirection: 'row', gap: 6 },
  revCell: { flex: 1, borderRadius: 12, padding: 8, alignItems: 'center' },
  stepFoot: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  footBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
  },
  footNext: { flex: 1.6, backgroundColor: C.accent, borderColor: C.accent },
  footText: { fontFamily: F.bold, fontSize: 16, color: C.ink },
});
