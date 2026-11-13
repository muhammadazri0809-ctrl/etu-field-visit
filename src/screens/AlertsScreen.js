import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Chip, FilterChips, PageHead, SearchBox, TONE_BG, TONE_FG } from '../components/ui';
import { showDate } from '../logic/dates';
import { norm } from '../logic/importRows';
import { ACTIVITIES, actStatus, checkOf, costAlerts, isOverdue, latestFieldVisit, num, pctText, profitVar, rmMil, yieldStatus, yieldVar } from '../logic/rules';
import { C, T, styles } from '../theme';

// =====================================================
// PRIORITIES: one row per field, ranked by impact
// tonnes lost = mature ha x (budget - actual) yield YTD
// =====================================================
export function fieldPriorities(p) {
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

function PriorityRow({ it, rank, max, onPress }) {
  const w = max > 0 ? Math.max(4, Math.min(100, (it.tLost / max) * 100)) : 0;
  return (
    <Pressable style={styles.exRow} onPress={onPress}>
      <View style={[styles.rankBox, TONE_BG[it.tone]]}>
        <Text style={[styles.rankNo, { color: TONE_FG[it.tone] }]}>{rank}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <T style={styles.kvLabel} numberOfLines={1}>{it.e.name}</T>
        <T style={styles.exTitle} numberOfLines={2}>Field {it.f.code}</T>
        {it.tLost >= 1 ? (
          <View style={styles.sevRow}>
            <Ionicons name="trending-down" size={16} color={C.attInk} />
            <View style={styles.sevTrack}>
              <View style={[styles.sevFill, { width: w + '%' }]} />
            </View>
            <T style={styles.sevText}>{Math.round(it.tLost).toLocaleString('en-MY')} t</T>
          </View>
        ) : null}
        <View style={styles.chips}>
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
        <T style={styles.exTitle} numberOfLines={2}>{it.text}</T>
        <T style={styles.meta} numberOfLines={2}>{it.sub}</T>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.muted} />
    </Pressable>
  );
}

// =====================================================
// PRIORITIES PAGE
// =====================================================
export function AlertsScreen(p) {
  const pri = fieldPriorities(p);
  const est = estatePriorities(p);
  const [ee, setEe] = useState('all'); // 'all' or one estate id (tap the chip again for all)
  const [q, setQ] = useState('');
  const estIds = [...new Set(pri.map((x) => x.e.id).concat(est.map((x) => x.e.id)))];
  const list = pri.filter((x) => (ee === 'all' || x.e.id === ee) && norm(x.f.code + x.e.name).includes(norm(q)));
  const elist = est.filter((x) => ee === 'all' || x.e.id === ee);
  const maxLost = Math.max(0, ...pri.map((x) => x.tLost));
  // same count as the red badge on the Priorities tab
  const overdue = p.actions
    .filter((a) => a.status !== 'done' && isOverdue(a) && (ee === 'all' || a.estateId === ee))
    .sort((a, b) => (a.due || '').localeCompare(b.due || ''));
  const fcode = (id) => (p.fields.find((f) => f.id === id) || {}).code;
  const ename = (id) => (p.estates.find((e) => e.id === id) || {}).name || 'Estate';
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <PageHead
        icon="podium-outline"
        title="Priorities"
        sub={(ee === 'all' ? 'All estates' : ename(ee)) + ' · ' + list.length + ' fields, worst first'}
      />
      {estIds.length > 1 && (
        <FilterChips
          value={ee}
          onChange={(k) => setEe(k === ee ? 'all' : k)}
          options={estIds.map((id) => ({
            key: id,
            label: ename(id),
            n: pri.filter((x) => x.e.id === id).length,
          }))}
        />
      )}
      <SearchBox value={q} onChange={setQ} placeholder="Search field code" />
      {overdue.length > 0 && !q && (
        <View style={styles.exc}>
          <View style={styles.excHead}>
            <Ionicons name="time" size={18} color={C.attInk} />
            <T style={styles.excTitle}>Overdue follow-ups</T>
            <View style={{ flex: 1 }} />
            <View style={styles.excCount}>
              <T style={styles.excCountText}>{overdue.length}</T>
            </View>
          </View>
          {overdue.slice(0, 20).map((a) => (
            <Pressable
              key={a.id}
              style={styles.exRow}
              onPress={() => (a.fieldId ? p.onOpenField(a.fieldId, 'Follow-ups') : p.onOpenEstate(a.estateId, 'Follow-ups'))}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={styles.kvLabel} numberOfLines={1}>
                  {ename(a.estateId)}
                  {a.fieldId ? ' · Field ' + fcode(a.fieldId) : ' · estate'}
                </T>
                <T style={styles.exTitle} numberOfLines={2}>{a.text}</T>
                <T style={[styles.meta, { color: C.attInk }]}>
                  Due {showDate(a.due)}
                  {a.pic ? ' · ' + a.pic : ''}
                </T>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </Pressable>
          ))}
        </View>
      )}
      {elist.length > 0 && !q && (
        <View style={styles.exc}>
          <View style={styles.excHead}>
            <T style={styles.excTitle}>Estate level</T>
            <View style={{ flex: 1 }} />
            <View style={styles.excCount}>
              <T style={styles.excCountText}>{elist.length}</T>
            </View>
          </View>
          {elist.map((it) => (
            <EstateItemRow key={it.key} it={it} />
          ))}
        </View>
      )}
      <View style={styles.exc}>
        {list.slice(0, 150).map((it) => (
          <PriorityRow key={it.key} it={it} rank={pri.indexOf(it) + 1} max={maxLost} onPress={() => p.onOpenField(it.f.id)} />
        ))}
        {list.length === 0 && (
          <View style={styles.exRow}>
            <T style={styles.hint}>{q ? 'No field matches.' : 'Nothing needs attention.'}</T>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
