import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Bar, CTA, Chip, DateBox, Hero, Section, TONE_FG } from '../components/ui';
import { showDate, today } from '../logic/dates';
import { etuCounts } from '../logic/etu';
import { isOverdue, num, rmMil } from '../logic/rules';
import { fieldPriorities } from './AlertsScreen';
import { C, T, styles } from '../theme';

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

export function HomeScreen(p) {
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
