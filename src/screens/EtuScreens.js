import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DateField } from '../components/DateField';
import { PhotoStrip } from '../components/PhotoStrip';
import { CatIcon, StatusChip } from '../components/etu';
import { CTA, Chip, DateBox, DeleteBox, Empty, Field, FilterChips, Hero, PageHead, Section, TONE_FG } from '../components/ui';
import { showDate } from '../logic/dates';
import { ACTION_BY, ECATS, ESTAT, ESTAT_ORDER, UOMS, WORD_LIB, etuCounts } from '../logic/etu';
import { norm } from '../logic/importRows';
import { C, T, styles } from '../theme';

// ---------- 1. visit list ----------
export function EtuListScreen(p) {
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
              <Text style={styles.rcardTitle} numberOfLines={2}>{(e.name || 'No estate') + ' Estate'}</Text>
              <T style={styles.meta} numberOfLines={2}>{[e.region, e.sou, v.visitedBy].filter(Boolean).join(' · ') || 'Tap to add details'}</T>
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
export function EtuFieldScreen(p) {
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
export function EtuObsScreen(p) {
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
  const applyLib = (x) => {
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
              <Pressable key={ix} style={styles.libItem} onPress={() => applyLib(x)}>
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
