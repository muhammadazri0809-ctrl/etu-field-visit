import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COSTS, LIMITS, costOf, money, num, pctText, variance } from '../logic/rules';
import { C, T, styles } from '../theme';
import { FilterChips, Section } from './ui';

// Colour for a cost variance: over the limit = Action, over budget = Monitor, else Good
export function costTone(v) {
  if (v === null) return 'muted';
  if (v > LIMITS.cost) return 'att';
  if (v > 0) return 'mon';
  return 'good';
}
const FG = { att: C.att, mon: C.mon, good: C.good, muted: C.muted };
const BG = { att: C.attBg, mon: C.monBg, good: C.goodBg, muted: C.sunk };

// Variance pill: arrow + percent (+ word when over the limit), never colour alone
export function VarPill({ v, big }) {
  const tone = costTone(v);
  const icon = v === null ? 'remove' : v > 0 ? 'arrow-up' : v < 0 ? 'arrow-down' : 'remove';
  return (
    <View style={[styles.varPill, { backgroundColor: BG[tone] }, big && styles.varPillBig]}>
      <Ionicons name={icon} size={big ? 16 : 13} color={FG[tone]} />
      <Text style={[styles.varPillText, { color: FG[tone] }, big && styles.varPillTextBig]}>
        {v === null ? 'no data' : pctText(v).replace('+', '')}
        {tone === 'att' ? ' over' : ''}
      </Text>
    </View>
  );
}

// Bar centred on budget: right = over budget, left = under. Thin mark = the limit.
export function VarBar({ v }) {
  const SPAN = Math.max(LIMITS.cost * 3, 30); // % shown from the centre to each end
  const w = v === null ? 0 : Math.min(50, (Math.abs(v) / SPAN) * 50);
  const tone = costTone(v);
  const limitAt = 50 + Math.min(50, (LIMITS.cost / SPAN) * 50);
  return (
    <View style={styles.vbar}>
      <View
        style={[
          styles.vbarFill,
          { width: w + '%', backgroundColor: FG[tone] },
          v !== null && v >= 0 ? { left: '50%' } : { right: '50%' },
        ]}
      />
      <View style={styles.vbarMid} />
      <View style={[styles.vbarLimit, { left: limitAt + '%' }]} />
    </View>
  );
}

function totals(obj) {
  let ta = 0;
  let tb = 0;
  COSTS.forEach((n, i) => {
    ta += num(costOf(obj, i).act) || 0;
    tb += num(costOf(obj, i).bgt) || 0;
  });
  return { ta, tb, v: variance(ta, tb) };
}

// ===== 12 cost elements (field = tap to edit, estate = read only) =====
export function CostList({ obj, onChange, readOnly, title }) {
  const [order, setOrder] = useState('worst');
  const [edit, setEdit] = useState(null); // element index being edited
  const t = totals(obj);
  const rows = COSTS.map((name, i) => {
    const c = costOf(obj, i);
    return { i, name, c, v: variance(c.act, c.bgt) };
  });
  const over = rows.filter((r) => r.v !== null && r.v > LIMITS.cost).length;
  const shown =
    order === 'worst'
      ? [...rows].sort((a, b) => (b.v === null ? -999 : b.v) - (a.v === null ? -999 : a.v))
      : rows;

  return (
    <Section icon="cash-outline" title={title || '12 cost elements'} right={<T style={styles.hint}>RM/ha YTD</T>}>
      <View style={styles.costSum}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T style={styles.kvLabel}>Total</T>
          <Text style={styles.costSumVal}>{money(t.ta)}</Text>
          <T style={styles.meta}>vs {money(t.tb)} budget</T>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <VarPill v={t.v} big />
          <T style={styles.hint}>
            {over} of 12 over +{LIMITS.cost}%
          </T>
        </View>
      </View>

      <FilterChips
        value={order}
        onChange={setOrder}
        options={[
          { key: 'worst', label: 'Worst first' },
          { key: 'list', label: 'List order' },
        ]}
      />

      <View>
        {shown.map((r, k) => {
          const tone = costTone(r.v);
          const Row = readOnly ? View : Pressable;
          return (
            <Row
              key={r.name}
              onPress={readOnly ? undefined : () => setEdit(r.i)}
              style={[styles.costItem, k === 0 && { borderTopWidth: 0 }, tone === 'att' && styles.costItemOver]}>
              <View style={styles.rowBetween}>
                <T style={styles.costItemName}>{r.name}</T>
                <VarPill v={r.v} />
              </View>
              <View style={styles.rowBetween}>
                <T style={styles.meta}>
                  <T style={styles.costNum}>{money(r.c.act)}</T> actual · {money(r.c.bgt)} budget
                </T>
                {!readOnly && <Ionicons name="create-outline" size={17} color={C.accent} />}
              </View>
              <VarBar v={r.v} />
            </Row>
          );
        })}
      </View>
      <T style={styles.hint}>
        Bar starts at budget (centre line): right = over, left = under. Thin mark = +{LIMITS.cost}% limit.
        {readOnly ? ' Estate cost = field costs weighted by mature ha.' : ' Tap a row to change the numbers.'}
      </T>

      {!readOnly && edit !== null && (
        <CostSheet
          obj={obj}
          index={edit}
          onIndex={setEdit}
          onClose={() => setEdit(null)}
          onChange={onChange}
        />
      )}
    </Section>
  );
}

// Bottom sheet with two big number boxes for one cost element
function CostSheet({ obj, index, onIndex, onClose, onChange }) {
  const c = costOf(obj, index);
  const v = variance(c.act, c.bgt);
  const set = (k, val) => {
    const costs = { ...(obj.costs || {}) };
    costs[index] = { ...(costs[index] || {}), [k]: val };
    onChange({ ...obj, costs: costs });
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBg} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.sheetGrip} />
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T style={styles.kvLabel}>
                Element {index + 1} of {COSTS.length} · RM/ha
              </T>
              <Text style={styles.sheetTitle}>{COSTS[index]}</Text>
            </View>
            <VarPill v={v} big />
          </View>
          <View style={styles.row2}>
            <View style={styles.field}>
              <T style={styles.label}>Actual</T>
              <TextInput
                style={[styles.input, styles.bigNum]}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={C.faint}
                value={c.act || ''}
                onChangeText={(x) => set('act', x)}
                autoFocus
              />
            </View>
            <View style={styles.field}>
              <T style={styles.label}>Budget</T>
              <TextInput
                style={[styles.input, styles.bigNum]}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={C.faint}
                value={c.bgt || ''}
                onChangeText={(x) => set('bgt', x)}
              />
            </View>
          </View>
          <VarBar v={v} />
          <View style={styles.row2}>
            <Pressable
              style={[styles.footBtn, index === 0 && { opacity: 0.4 }]}
              disabled={index === 0}
              onPress={() => onIndex(index - 1)}>
              <Ionicons name="chevron-back" size={18} color={C.ink} />
              <T style={styles.footText}>Previous</T>
            </Pressable>
            {index < COSTS.length - 1 ? (
              <Pressable style={[styles.footBtn, styles.footNext]} onPress={() => onIndex(index + 1)}>
                <T style={[styles.footText, { color: '#fff' }]}>Next</T>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </Pressable>
            ) : (
              <Pressable style={[styles.footBtn, styles.footNext]} onPress={onClose}>
                <T style={[styles.footText, { color: '#fff' }]}>Done</T>
                <Ionicons name="checkmark" size={18} color="#fff" />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
