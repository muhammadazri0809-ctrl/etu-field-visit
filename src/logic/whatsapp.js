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

// Text left after removing estate name, field codes and filler words
function leftover(text, estateName, codes) {
  let t = String(text);
  if (estateName) t = t.replace(new RegExp(estateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ');
  t = t.replace(FIELD_RE, ' ').replace(EST_WORDS, ' ');
  codes.forEach((c) => (t = t.replace(new RegExp('\\b' + c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '\\b', 'ig'), ' ')));
  t = t.replace(/\b(visit|lawatan|site|today|hari ini|and|dan|&)\b/gi, ' ');
  return t.replace(/[^A-Za-z0-9]+/g, '');
}

const GAP = 30; // minutes: photos sent this close to a message belong to it

// messages -> groups [{ key, estateId, estateName, date, fields: [{ code, fieldId, obs: [...] }] }]
// obs: { text, title, issue, action, root, category, status, files: [], time, sender }
export function buildImport(messages, estates, fields, defaultEstateId) {
  const groups = [];
  const stats = { messages: messages.length, obs: 0, photos: 0, omitted: 0, skipped: 0 };
  let estate = defaultEstateId ? estates.find((e) => e.id === defaultEstateId) || null : null;
  let newEstateName = '';
  let fieldCode = '';
  let last = null; // last observation { obs, msg, ctx }
  let pending = []; // photos waiting for a message { file, msg, ctx }

  const ctxKey = () => (estate ? estate.id : 'new:' + newEstateName) + '|' + fieldCode;
  const codesOf = (est) => fields.filter((f) => !est || f.estateId === est.id).map((f) => f.code);

  const groupFor = (date) => {
    const eid = estate ? estate.id : null;
    const ename = estate ? estate.name : newEstateName;
    const key = (eid || 'new:' + norm(ename)) + '|' + date;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, estateId: eid, estateName: ename, date, fields: [] };
      groups.push(g);
    }
    const code = fieldCode || 'GENERAL';
    let f = g.fields.find((x) => x.code === code);
    if (!f) {
      const known = eid ? fields.find((x) => x.estateId === eid && String(x.code).toUpperCase() === code) : null;
      f = { code, fieldId: known ? known.id : null, obs: [] };
      g.fields.push(f);
    }
    return f;
  };

  // "Bukit Badak Field 2016A - bagworm…" -> "bagworm…" (the place is already known)
  const stripPlace = (text) => {
    let t = text;
    const en = estate ? estate.name : newEstateName;
    if (en) t = t.replace(new RegExp('^\\s*' + en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*(estate|ladang)?', 'i'), '');
    FIELD_RE.lastIndex = 0;
    t = t.replace(new RegExp('^[\\s,:;-]*' + FIELD_RE.source, 'i'), '');
    if (fieldCode) t = t.replace(new RegExp('^[\\s,:;-]*' + fieldCode.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '\\b', 'i'), '');
    t = t.replace(/^[\s,:;.-]+/, '');
    return t || text;
  };

  const addObs = (msg, text, files) => {
    const parts = splitLabels(stripPlace(text));
    const issue = parts.issue || '';
    const obs = {
      text,
      title: (issue.split('\n')[0] || (files.length ? 'Photo observation' : '')).slice(0, 70),
      issue,
      action: parts.action,
      root: parts.root,
      category: guessCategory(text),
      status: guessStatus(text),
      files: [...files],
      time: msg.time,
      sender: msg.sender,
    };
    groupFor(msg.date).obs.push(obs);
    stats.obs += 1;
    last = { obs, msg, ctx: ctxKey() };
    return obs;
  };

  // photos with no message near them become their own observation
  const flushPending = () => {
    pending.forEach((p) => {
      if (last && last.ctx === p.ctx && last.msg.date === p.msg.date && Math.abs(minutes(p.msg) - minutes(last.msg)) <= GAP) {
        last.obs.files.push(p.file);
      } else {
        const keep = { estate, newEstateName, fieldCode };
        // photo belongs to the context it was sent in
        [estate, newEstateName, fieldCode] = [p.state.estate, p.state.newEstateName, p.state.fieldCode];
        addObs(p.msg, '', [p.file]);
        ({ estate, newEstateName, fieldCode } = keep);
      }
    });
    pending = [];
  };

  messages.forEach((msg) => {
    if (msg.omitted) {
      stats.omitted += 1;
      return;
    }
    const text = (msg.text || '').trim();
    stats.photos += msg.files.length;

    // 1. does the message change estate / field?
    if (text) {
      const e = findEstate(text, estates);
      const label = EST_LABEL_RE.exec(text);
      let changed = false;
      if (e && (!estate || e.id !== estate.id)) {
        flushPending();
        estate = e;
        newEstateName = '';
        fieldCode = '';
        changed = true;
      } else if (!e && label && !findEstate(label[1], estates)) {
        flushPending();
        estate = null;
        newEstateName = label[1].replace(EST_WORDS, '').trim();
        fieldCode = '';
        changed = true;
      }
      const fc = findFields(text, codesOf(estate));
      if (fc.length) {
        if (!estate && !newEstateName) {
          // a known field code tells us the estate when it is unique
          const owners = fields.filter((f) => String(f.code).toUpperCase() === fc[0]);
          if (owners.length === 1) estate = estates.find((x) => x.id === owners[0].estateId) || null;
        }
        if (fc[0] !== fieldCode) {
          if (!changed) flushPending();
          fieldCode = fc[0];
        }
      }
      // only a heading like "Bukit Badak - Field 2016A"? then it just sets the place
      const rest = leftover(text, estate ? estate.name : newEstateName, fc);
      if (rest.length < 6 && !msg.files.length) {
        stats.skipped += 1;
        return;
      }
    }

    // 2. message with words = new observation (with its own photos + photos sent just before)
    if (text) {
      const before = pending.filter((p) => p.ctx === ctxKey() && p.msg.date === msg.date && minutes(msg) - minutes(p.msg) <= GAP);
      pending = pending.filter((p) => !before.includes(p));
      flushPending();
      addObs(msg, text, before.map((p) => p.file).concat(msg.files));
      return;
    }

    // 3. photo only: add to the last observation if it was just before, else wait for the next message
    msg.files.forEach((file) => {
      if (last && last.ctx === ctxKey() && last.msg.date === msg.date && minutes(msg) - minutes(last.msg) <= GAP && !pending.length) {
        last.obs.files.push(file);
      } else {
        pending.push({ file, msg, ctx: ctxKey(), state: { estate, newEstateName, fieldCode } });
      }
    });
  });
  flushPending();
  groups.sort((a, b) => a.date.localeCompare(b.date));
  return { groups, stats };
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
