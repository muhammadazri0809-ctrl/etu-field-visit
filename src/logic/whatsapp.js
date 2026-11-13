// =====================================================
// WHATSAPP CHAT IMPORT (pure logic, no phone APIs)
// Reads an exported chat (Android "WhatsApp Chat with X.txt" or iPhone "_chat.txt"),
// finds the estate and field each message talks about, and turns messages +
// photos into ETU visit observations.
// =====================================================
import { norm } from './importRows';
import { ECATS } from './etu';

const IMG_RE = /\.(jpe?g|png|webp|heic|heif)$/i;

// iPhone: [13/11/2026, 09:15:22] Azri: text
const IOS_RE = /^‎?\[(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?\s*([AaPp]\.?\s?[Mm]\.?)?\]\s*([^:]{1,60}?):\s?(.*)$/;
// Android: 13/11/2026, 09:15 - Azri: text   (also 9:15 pm, 13.11.26 and "–")
const AND_RE = /^‎?(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4}),?\s+(\d{1,2})[:.](\d{2})\s*([AaPp]\.?\s?[Mm]\.?)?\s*[-–]\s([^:]{1,60}?):\s?(.*)$/;

// Media placeholders when the chat was exported WITHOUT media (any language)
const OMITTED_RE = /^‎?<[^>]*(omitted|tidak disertakan|disembunyikan|dikecualikan)[^>]*>$|^(image|photo|gambar|foto) (omitted|tidak disertakan)$/i;

function strip(s) {
  return String(s || '').replace(/[‎‏‪-‮﻿]/g, '');
}

// Pull photo file names out of a message; returns { files, rest }
export function extractFiles(text) {
  const files = [];
  let rest = strip(text);
  // iPhone: <attached: 00000012-PHOTO-2026-11-13-09-15-22.jpg>
  rest = rest.replace(/<\s*attached:\s*([^>]+?)\s*>/gi, (m, f) => {
    files.push(f.trim());
    return ' ';
  });
  // Android: IMG-20261113-WA0003.jpg (file attached) / (fail dilampirkan)
  rest = rest.replace(/([\w\-. ()]*?[\w-]+\.(?:jpe?g|png|webp|heic|heif|mp4|opus|pdf|webm))\s*\([^)]*\)/gi, (m, f) => {
    files.push(f.trim());
    return ' ';
  });
  // bare file name on its own
  const t = rest.trim();
  if (/^[\w\-.]+\.(jpe?g|png|webp|heic|heif)$/i.test(t)) {
    files.push(t);
    rest = '';
  }
  return { files: files.filter((f) => IMG_RE.test(f)), rest: rest.replace(/[ \t]+/g, ' ').trim() };
}

// Text of the chat -> messages [{ date: 'YYYY-MM-DD', time: 'HH:MM', sender, text, files, omitted }]
export function parseChat(raw) {
  const lines = strip(raw).replace(/\r\n?/g, '\n').split('\n');
  const heads = [];
  lines.forEach((line) => {
    const m = IOS_RE.exec(line) || AND_RE.exec(line);
    heads.push(m);
  });
  // Day first (13/11) or month first (11/13)? Year first (2026-11-13)?
  let dayFirst = true;
  let yearFirst = false;
  heads.forEach((m) => {
    if (!m) return;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 31) yearFirst = true;
    else if (b > 12) dayFirst = false;
  });
  const out = [];
  lines.forEach((line, i) => {
    const m = heads[i];
    if (!m) {
      if (out.length && line.trim()) out[out.length - 1].text += '\n' + strip(line);
      return;
    }
    let y;
    let mo;
    let d;
    if (yearFirst) {
      y = Number(m[1]);
      mo = Number(m[2]);
      d = Number(m[3]);
    } else {
      d = Number(dayFirst ? m[1] : m[2]);
      mo = Number(dayFirst ? m[2] : m[1]);
      y = Number(m[3]);
    }
    if (y < 100) y += 2000;
    let h = Number(m[4]);
    const ap = (m[6] || '').toLowerCase().replace(/[^ap]/g, '');
    if (ap === 'p' && h < 12) h += 12;
    if (ap === 'a' && h === 12) h = 0;
    const p2 = (n) => String(n).padStart(2, '0');
    out.push({
      date: y + '-' + p2(mo) + '-' + p2(d),
      time: p2(h) + ':' + m[5],
      sender: strip(m[7]).trim(),
      text: strip(m[8]),
    });
  });
  return out.map((msg) => {
    const { files, rest } = extractFiles(msg.text);
    const omitted = OMITTED_RE.test(rest.trim());
    return { ...msg, files, text: omitted ? '' : rest, omitted };
  });
}

function minutes(msg) {
  const [h, m] = msg.time.split(':').map(Number);
  return h * 60 + m;
}

// ---------- what a message is about ----------
const EST_WORDS = /\b(estate|ladang|kebun)\b/gi;
// label must be a whole word and the code must contain a digit (so "blocked" or "field is" are not codes)
const FIELD_RE = /\b(?:field|fld|blok|block|blk|peringkat|prk|fd|petak)\b\s*(?:no\.?)?\s*[:#.-]?\s*([A-Za-z]{0,3}\d[A-Za-z0-9/-]{0,7})\b/gi;
const EST_LABEL_RE = /\b(?:estate|ladang)\s*[:-]\s*([^\n,.;]{2,40})/i;

// Find a known estate mentioned in the text (longest name wins)
export function findEstate(text, estates) {
  const t = ' ' + norm(text) + ' ';
  let best = null;
  estates.forEach((e) => {
    const n = norm(String(e.name || '').replace(EST_WORDS, ''));
    if (n.length >= 3 && t.includes(n) && (!best || n.length > best.n.length)) best = { e, n };
  });
  return best ? best.e : null;
}

// Field codes in the text: explicit ("Field 2016A", "Blok 12") or a known code on its own
export function findFields(text, codes) {
  const found = [];
  const add = (c) => {
    const u = String(c).toUpperCase();
    if (!found.includes(u)) found.push(u);
  };
  let m;
  FIELD_RE.lastIndex = 0;
  while ((m = FIELD_RE.exec(text))) add(m[1]);
  const known = new Set((codes || []).map((c) => String(c).toUpperCase()));
  (String(text).match(/[A-Za-z0-9/-]+/g) || []).forEach((tok) => {
    const u = tok.toUpperCase();
    if (known.has(u) && /\d/.test(u) && u.length >= 2) add(u);
  });
  return found;
}

const CAT_WORDS = [
  ['Pest & Disease', /pest|disease|bagworm|ulat|\brats?\b|tikus|ganoderma|gano\b|beetle|rhino|oryctes|termite|anai|moth|caterpillar|nettle|penyakit|serangga/i],
  ['Field Upkeep / Weeding', /weed|rumpai|lalang|circle|harvesting path|upkeep|slash|herbicide|racun|mikania|fern/i],
  ['Harvesting', /harvest|\bffb\b|loose fruit|\blf\b|unripe|underripe|overripe|tuai|\bbuah\b|crop|rounds?\b|evacuat|collection point/i],
  ['Yield Making (EFB / MCP / Manuring)', /\befb\b|\bmcp\b|manur|fertili[sz]|\bbaja\b|pollinat|yield making/i],
  ['Drainage / Water Mgmt.', /drain|flood|banjir|parit|\bbund|culvert|water ?log|water level|stagnant/i],
  ['Accessibility / Infra.', /\broad|jalan|bridge|jambatan|access|infra|pothole|culvert/i],
  ['Palm Stand / Abnormal Palm', /abnormal|vacant|supply|palm stand|missing palm|dead palm|sterile|leaning|tumbang|stand per/i],
  ['Field Practice', /prun|frond stack|stacking|practice|\bsop\b|census|pelepah/i],
];
export function guessCategory(text) {
  const hit = CAT_WORDS.find(([, re]) => re.test(text));
  return hit ? hit[0] : ECATS[ECATS.length - 1].k;
}

export function guessStatus(text) {
  if (/\b(good practice|good job|well done|bagus|baik|tahniah|commend)/i.test(text)) return 'good';
  if (/\b(r&d|r & d|trial|research|kajian)\b/i.test(text)) return 'rnd';
  if (/\b(monitor|pantau|observe further|keep an eye)\b/i.test(text)) return 'monitor';
  return 'attention';
}

// "Action: ..." / "Tindakan: ..." / "Root cause: ..." / "Punca: ..." labels in a message
export function splitLabels(text) {
  const parts = { issue: [], action: [], root: [] };
  let cur = 'issue';
  String(text)
    .split('\n')
    .forEach((line) => {
      const m = /^\s*[-*•]?\s*(action( plan)?|tindakan|cadangan|recommendation|root cause|punca|cause|issue|observation|pemerhatian|isu)\s*[:-]\s*(.*)$/i.exec(line);
      if (m) {
        const k = m[1].toLowerCase();
        cur = /action|tindakan|cadangan|recommend/.test(k) ? 'action' : /cause|punca/.test(k) ? 'root' : 'issue';
        if (m[3].trim()) parts[cur].push(m[3].trim());
      } else if (line.trim()) parts[cur].push(line.trim());
    });
  return { issue: parts.issue.join('\n'), action: parts.action.join('\n'), root: parts.root.join('\n') };
}

// ---------- lines that are not field remarks ----------
// deleted messages, system notices (English + Malay) and short chat replies
const SKIP_MSG = /^(you deleted this message|this message was deleted|anda telah memadam mesej ini|anda memadam mesej ini|mesej ini telah dipadam|mesej ini dipadam|waiting for this message|menunggu mesej ini|null)\.?$/i;
const SYSTEM_RE = /end-to-end encrypted|disulitkan hujung ke hujung|joined using this group|security code (changed|with)|kod keselamatan|created group|added you|changed the (subject|group|icon)|left$|removed .+$|pinned a message/i;
const NOISE_RE = /^(ok+|okay|noted|nt|thanks?|thank you|tq+|ty|ya+|yes|no|baik|on the way|otw|done|sure|alright|copy|roger|terima kasih|tk|👍+|🙏+|👌+)[\s.!]*$/i;
const EDITED_RE = /\s*<(this message was edited|mesej ini telah disunting|disunting)>\s*$/i;

// Short topic names (same list as the ETU web app), used as the observation title
const TOPICS = [
  ['Strip Spray', /\bstrip/i, 'Field Upkeep / Weeding'],
  ['Selective Spray', /selective|vops|woody|woodies|lalang/i, 'Field Upkeep / Weeding'],
  ['Canopy Management', /prun|canopy|frond/i, 'Field Practice'],
  ['Road Condition', /\broad/i, 'Accessibility / Infra.'],
  ['Bunch Formation', /bunch formation|\bbunch/i, 'Field Practice'],
  ['Path', /\bpaths?\b/i, 'Accessibility / Infra.'],
  ['Water Management', /drain|water|flood/i, 'Drainage / Water Mgmt.'],
  ['Vacant Point', /vacant/i, 'Palm Stand / Abnormal Palm'],
  ['Rat Damage', /\brats?\b|rat damage/i, 'Pest & Disease'],
  ['Circle Raking', /circle/i, 'Field Upkeep / Weeding'],
  ['Crop Losses', /crop loss|crop recovery|uclf|loose fruit|\bscra\b|uhb|hbl|uncollected/i, 'Harvesting'],
];
export function topicsIn(s) {
  return TOPICS.filter((t) => t[1].test(s)).map((t) => t[0]);
}

function shortTitle(t) {
  let s = String(t || '').split(/[.;:\n(]/)[0].trim();
  const w = s.split(/\s+/);
  if (w.length > 7) s = w.slice(0, 7).join(' ') + '…';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function lineStatus(line) {
  if (/^good\b|well maintained|\bclean\b|\bbagus\b|\bbaik\b|good practice/i.test(line)) return 'good';
  if (/\br\s?&\s?d\b|\btrial\b/i.test(line)) return 'rnd';
  if (/\bmonitor|pantau/i.test(line)) return 'monitor';
  return 'attention';
}

// Field code in a line: a known code (2016A also matches "16A" / "2016 A"), "Field 12", or 20xxA
function codeRe(c) {
  const m = String(c).match(/^(19|20)(\d{2})([A-Z0-9]+)$/i);
  const body = m ? '(?:' + m[1] + ')?' + m[2] + '\\s?' + m[3] : String(c).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(?:^|[^0-9A-Za-z])' + body + '(?![0-9A-Za-z])', 'i');
}
const YEAR_CODE = /(?:^|[^0-9A-Za-z])((?:19|20)\d{2}\s?[A-Z]\d?)(?![0-9A-Za-z])/i;
function codeIn(line, known) {
  for (const c of known) if (codeRe(c).test(' ' + line)) return { code: String(c).toUpperCase(), re: codeRe(c) };
  FIELD_RE.lastIndex = 0;
  const m = FIELD_RE.exec(line);
  if (m) return { code: m[1].toUpperCase(), re: new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
  const y = line.match(YEAR_CODE);
  if (y) return { code: y[1].replace(/\s/g, '').toUpperCase(), re: new RegExp(y[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
  return null;
}

const ACTION_LINE = /^(action( plan)?|tindakan|cadangan|recommendation)\s*[:-]\s*(.*)$/i;
const ROOT_LINE = /^(root cause|punca|cause)\s*[:-]\s*(.*)$/i;

const GAP = 30; // minutes: a photo belongs to the message posted nearest in time, within this gap
const PER_OBS = 3; // photos kept per observation
const PER_FIELD = 12; // photos kept per field

// messages -> groups [{ key, estateId, estateName, date, fields: [{ code, fieldId, obs: [...] }] }]
// One observation per remark line (the ETU web app's rule). obs: { title, issue, action, root,
// category, status, files, time, sender }. skipFiles = photo names to ignore (duplicate pictures).
export function buildImport(messages, estates, fields, defaultEstateId, skipFiles) {
  const skip = skipFiles || new Set();
  const groups = [];
  const stats = { messages: messages.length, obs: 0, photos: 0, omitted: 0, skipped: 0, deleted: 0, dupPhotos: 0, unplaced: 0 };
  let estate = defaultEstateId ? estates.find((e) => e.id === defaultEstateId) || null : null;
  let newEstateName = '';
  let fieldCode = '';
  const remarks = []; // messages that gave observations: { min, date, field, obs: [] }
  const shots = []; // photos: { name, min, date, field (from caption) }

  const fieldFor = (date) => {
    const eid = estate ? estate.id : null;
    const ename = estate ? estate.name : newEstateName;
    const key = (eid || 'new:' + norm(ename)) + '|' + date;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, estateId: eid, estateName: ename, date, fields: [] };
      groups.push(g);
    }
    let f = g.fields.find((x) => x.code === fieldCode);
    if (!f) {
      const known = eid ? fields.find((x) => x.estateId === eid && String(x.code).toUpperCase() === fieldCode) : null;
      f = { code: fieldCode, fieldId: known ? known.id : null, obs: [] };
      g.fields.push(f);
    }
    return f;
  };
  const knownCodes = () => fields.filter((f) => !estate || f.estateId === estate.id).map((f) => f.code);

  messages.forEach((msg) => {
    if (msg.omitted) {
      stats.omitted += 1;
      return;
    }
    const raw = (msg.text || '').replace(EDITED_RE, '').trim();
    if (SKIP_MSG.test(raw)) {
      stats.deleted += 1;
      return;
    }
    if (SYSTEM_RE.test(raw) && !msg.files.length) return;
    const minute = minutes(msg);
    const made = [];
    let lastObs = null;

    raw.split('\n').forEach((rawLine) => {
      let line = rawLine.replace(/^[\s\-•*·>]+|^\d+[.)]\s*/g, '').trim();
      if (!line) return;
      // estate named in the line?
      const e = findEstate(line, estates);
      const label = EST_LABEL_RE.exec(line);
      if (e && (!estate || e.id !== estate.id)) {
        estate = e;
        newEstateName = '';
        fieldCode = '';
      } else if (!e && label && !findEstate(label[1], estates)) {
        estate = null;
        newEstateName = label[1].replace(EST_WORDS, '').trim();
        fieldCode = '';
      }
      if (e) line = line.replace(new RegExp(e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ');
      if (label) line = line.replace(EST_LABEL_RE, ' ');
      line = line.replace(EST_WORDS, ' ').trim();
      // field code in the line?
      const c = codeIn(line, knownCodes());
      if (c) {
        if (!estate && !newEstateName) {
          const owners = fields.filter((f) => String(f.code).toUpperCase() === c.code);
          if (owners.length === 1) estate = estates.find((x) => x.id === owners[0].estateId) || null;
        }
        fieldCode = c.code;
        line = line.replace(c.re, ' ').replace(/\b(field|fld|blok|block|blk|peringkat|prk|petak)\b/gi, ' ');
      }
      line = line.replace(/^[\s:–\-.,]+|[\s:–\-.,]+$/g, '').replace(/\s+/g, ' ').trim();
      if (!line) return;
      // "Action: …" / "Root cause: …" belong to the line above
      const act = ACTION_LINE.exec(line);
      const root = ROOT_LINE.exec(line);
      if ((act || root) && lastObs) {
        if (act) lastObs.action = [lastObs.action, act[3]].filter(Boolean).join('\n');
        else lastObs.root = [lastObs.root, root[2]].filter(Boolean).join('\n');
        return;
      }
      if (!fieldCode || line.length < 4 || NOISE_RE.test(line) || /\?$/.test(line)) {
        stats.skipped += 1;
        return;
      }
      const cat = guessCategory(line);
      // a topic names the observation only when it agrees with the main category
      // ("Bagworm on lower fronds" is pest, not canopy management)
      const tps = topicsIn(line).filter((t) => {
        const tc = TOPICS.find((x) => x[0] === t)[2];
        return cat === 'Other' || tc === cat || lineStatus(line) === 'good';
      });
      if (!tps.length && line.split(/\s+/).length > 14 && cat === 'Other') {
        stats.skipped += 1; // long chat sentence with nothing field-related in it
        return;
      }
      const status = lineStatus(line);
      const title = tps.length === 1 ? tps[0] : shortTitle(line);
      const f = fieldFor(msg.date);
      // the same remark twice in one field = one observation
      const dup = f.obs.find((o) => norm(o.title) === norm(title) && o.status === status);
      if (dup) {
        if (!made.includes(dup)) made.push(dup);
        lastObs = dup;
        return;
      }
      const tp = tps.length === 1 ? TOPICS.find((t) => t[0] === tps[0]) : null;
      const obs = {
        title,
        issue: line.charAt(0).toUpperCase() + line.slice(1),
        action: '',
        root: '',
        category: tp ? (status === 'good' ? 'Field Practice' : tp[2]) : cat,
        status,
        files: [],
        time: msg.time,
        sender: msg.sender,
      };
      f.obs.push(obs);
      stats.obs += 1;
      made.push(obs);
      lastObs = obs;
    });

    if (made.length) remarks.push({ min: minute, date: msg.date, ctx: fieldFor(msg.date), obs: made });
    msg.files.forEach((name) => {
      stats.photos += 1;
      if (skip.has(name)) {
        stats.dupPhotos += 1;
        return;
      }
      // a photo with its own caption goes to the observations from that caption
      shots.push({ name, min: minute, date: msg.date, own: made.length ? { ctx: fieldFor(msg.date), obs: made } : null });
    });
  });

  // ---- photos: nearest remark (same day, within GAP), shared out over that remark's lines in order ----
  const byRemark = new Map();
  const place = (target, name) => {
    if (!byRemark.has(target)) byRemark.set(target, []);
    byRemark.get(target).push(name);
  };
  shots.forEach((s) => {
    if (s.own) return place(s.own, s.name);
    let best = null;
    remarks.forEach((r) => {
      if (r.date !== s.date) return;
      const d = Math.abs(r.min - s.min);
      if (d <= GAP && (!best || d < best.d || (d === best.d && r.min <= s.min))) best = { r, d };
    });
    if (best) place(best.r, s.name);
    else stats.unplaced += 1;
  });
  const fieldCount = new Map();
  byRemark.forEach((names, r) => {
    const f = r.ctx;
    let i = 0;
    names.forEach((name) => {
      const used = fieldCount.get(f) || 0;
      // next line of this message that still has room
      let o = null;
      for (let k = 0; k < r.obs.length; k++) {
        const cand = r.obs[(i + k) % r.obs.length];
        if (cand.files.length < PER_OBS) {
          o = cand;
          i = (i + k + 1) % r.obs.length;
          break;
        }
      }
      if (!o || used >= PER_FIELD || o.files.includes(name)) {
        stats.unplaced += 1;
        return;
      }
      o.files.push(name);
      fieldCount.set(f, used + 1);
    });
  });

  // drop empty fields / groups
  groups.forEach((g) => (g.fields = g.fields.filter((f) => f.obs.length)));
  const out = groups.filter((g) => g.fields.length).sort((a, b) => a.date.localeCompare(b.date));
  return { groups: out, stats };
}

// Groups (after the user checked them) -> new ETU visits + estates to create.
// photoUri(fileName) returns the kept photo path, or null when the photo is not available.
export function groupsToVisits(groups, opts) {
  const { estates, fallbackEstateId, newId, photoUri } = opts;
  const newEstates = [];
  const visits = [];
  let attached = 0;
  let missing = 0;
  groups.forEach((g) => {
    let estateId = g.estateId;
    if (!estateId && g.estateName) {
      const key = norm(g.estateName);
      let e = estates.concat(newEstates).find((x) => norm(x.name) === key);
      if (!e) {
        e = { id: newId(), name: g.estateName, region: '', sou: '', profitAct: '', profitBgt: '' };
        newEstates.push(e);
      }
      estateId = e.id;
    }
    if (!estateId) estateId = fallbackEstateId || null;
    const senders = [];
    const vfields = g.fields.map((f) => ({
      id: newId(),
      fieldId: f.fieldId,
      code: f.code === 'GENERAL' ? 'General' : f.code,
      obs: f.obs.map((o) => {
        if (o.sender && !senders.includes(o.sender)) senders.push(o.sender);
        const photos = [];
        o.files.forEach((name) => {
          const uri = photoUri(name);
          if (uri) {
            photos.push(uri);
            attached += 1;
          } else missing += 1;
        });
        return {
          id: newId(),
          status: o.status,
          category: o.category,
          title: o.title,
          affectedHa: '',
          issue: o.issue,
          root: o.root,
          photos,
          actionBy: 'Estate',
          due: '',
          action: o.action,
          target: '',
          uom: 'Ha',
          remark: 'From WhatsApp · ' + [o.sender, o.time].filter(Boolean).join(' ' ),
        };
      }),
    }));
    visits.push({
      id: newId(),
      estateId,
      date: g.date,
      visitedBy: senders.join(', '),
      fields: vfields,
      notes: 'Imported from WhatsApp chat',
      status: 'draft',
    });
  });
  return { visits, newEstates, attached, missing };
}

// Quick fingerprint of a photo's bytes: the same picture posted twice gives the same value
export function bytesHash(u) {
  let h1 = 0x811c9dc5;
  let h2 = u.length;
  for (let i = 0; i < u.length; i++) {
    h1 = Math.imul(h1 ^ u[i], 16777619);
    if ((i & 63) === 0) h2 = Math.imul(h2 ^ u[i], 2654435761);
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + u.length.toString(36);
}
