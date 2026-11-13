import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PhotoStrip } from '../components/PhotoStrip';
import { Bar, CTA, Chip, DateBox, DeleteBox, Empty, Field, Hero, Menu, MenuRow, PageHead, Section, TONE_BG, TONE_FG } from '../components/ui';
import { showDate, today } from '../logic/dates';
import { ESTAT } from '../logic/etu';
import { ACTIVITIES, LIMITS, STATUS, actOf, actStatus, checkOf, costAlerts, isOverdue, latestFieldVisit, no2, num, pctText, sortActions, variance, yieldStatus, yieldVar } from '../logic/rules';
import { C, T, styles } from '../theme';
import { CostList } from '../components/CostList';

// =====================================================
// FIELD: profile & yield, 12 costs, history
// =====================================================
export function FieldScreen(p) {
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
          <PageHead icon="cash-outline" title={'Field ' + field.code + ' cost'} sub="RM/ha YTD · tap a row to edit" />
          <CostList obj={field} onChange={onChange} />
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
                <T style={styles.kvLabel} numberOfLines={2}>{h.title}</T>
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

// ===== One follow-up action (tick to close) =====
export function ActionRow({ a, field, onSave, onDelete, showAct }) {
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
        <T style={styles.meta} numberOfLines={2}>
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
