import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from '../components/Dropdown';
import { Chip, Empty, Field, PageHead, SearchBox, Section } from '../components/ui';
import { showDate } from '../logic/dates';
import { norm } from '../logic/importRows';
import { LIMITS, estateYield, latestVisit, num, pctText, variance } from '../logic/rules';
import { ALL, uniq } from '../logic/triggers';
import { C, T, styles } from '../theme';
import { useSavedState } from '../useSavedState';

// =====================================================
// ESTATES LIST
// =====================================================
export function EstatesScreen(p) {
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
  // profit vs budget, only estates that have both numbers
  const both = list.filter((e) => num(e.profitAct) !== null && num(e.profitBgt) !== null);
  const lpv = both.length
    ? variance(both.reduce((s, e) => s + num(e.profitAct), 0), both.reduce((s, e) => s + num(e.profitBgt), 0))
    : null;
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
            <Text style={[styles.sumVal, ly && { color: ly.v < LIMITS.yieldAmber ? C.attInk : C.goodInk }]}>{ly ? pctText(ly.v) : '-'}</Text>
            <T style={styles.sumLbl}>Yield vs bgt</T>
          </View>
          <View style={styles.sumItem}>
            <Text style={[styles.sumVal, lpv !== null && { color: lpv < 0 ? C.attInk : C.goodInk }]}>
              {lp ? (lp / 1000).toFixed(1) : '-'}
            </Text>
            <T style={styles.sumLbl}>{lpv !== null ? 'Profit RM mil · ' + pctText(lpv) : 'Profit RM mil'}</T>
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
              <T style={styles.meta} numberOfLines={2}>
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
