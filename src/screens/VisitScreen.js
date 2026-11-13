import React, { useState } from 'react';
import { Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DateField } from '../components/DateField';
import { PhotoStrip } from '../components/PhotoStrip';
import { CTA, Chip, Empty, Field, Hero, Section, StatusPicker, TONE_BG, TONE_FG } from '../components/ui';
import { addDays, newId, showDate, today } from '../logic/dates';
import { ACTIVITIES, STATUS, actStatus, autoStatus, checkOf, countIn, evaluate, findings, limitText, no2, pctText, yieldStatus, yieldVar } from '../logic/rules';
import { visitReport } from '../logic/visitReport';
import { ActionRow } from './FieldScreen';
import { C, T, styles } from '../theme';

// =====================================================
// SITE VISIT: pick fields, then check 10 activities per field
// =====================================================
export function VisitScreen(p) {
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
    } catch (_e) {
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
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="New field code" placeholderTextColor={C.faint} autoCapitalize="characters" value={newCode} onChangeText={setNewCode} />
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
                    <T style={styles.bold} numberOfLines={2}>{no2(act.id)}. {act.name}</T>
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
                            <TextInput style={[styles.input, styles.readIn]} keyboardType="numeric" placeholder={r.unit} placeholderTextColor={C.faint} value={raw || ''} onChangeText={(t) => setReading(r.id, t)} />
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
                          <CTA label="ADD FOLLOW-UP" icon="flag" secondary onPress={() => addFollowUp(act)} />
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
