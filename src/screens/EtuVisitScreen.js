import { Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { DateField } from '../components/DateField';
import { CTA, Chip, DeleteBox, Field, KV, SearchBox, Section, TONE_BG, TONE_FG } from '../components/ui';
import { newId, showDate } from '../logic/dates';
import { ESTAT, ESTAT_ORDER, catOf, etuCounts, etuReport } from '../logic/etu';
import { norm } from '../logic/importRows';
import { C, F, T, styles } from '../theme';

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

export function EtuVisitScreen(p) {
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
    } catch (_err) {
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
            <Text style={styles.pageTitle} numberOfLines={2}>{e ? e.name + ' Estate' : 'New field visit'}</Text>
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
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Field not listed? Type code" placeholderTextColor={C.faint} autoCapitalize="characters" value={code} onChangeText={setCode} />
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
                          <T style={styles.topicText} numberOfLines={2}>{x.t}</T>
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
            <CTA label="SHARE REPORT (WHATSAPP)" icon="share-social" secondary onPress={share} />
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
