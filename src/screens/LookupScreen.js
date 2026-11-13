import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Filters } from '../components/Filters';
import { PhotoStrip } from '../components/PhotoStrip';
import { Bar, CTA, Chip, Empty, Hero, Section, TONE_BG, TONE_FG } from '../components/ui';
import { showDate } from '../logic/dates';
import { ACTIVITIES, LIMITS, STATUS, actStatus, checkOf, countIn, estateYield, latestFieldVisit, no2, num, pctText, profitVar, rmMil, sortActions, yieldStatus, yieldVar } from '../logic/rules';
import { estatesIn, fieldTriggers } from '../logic/triggers';
import { ActionRow } from './FieldScreen';
import { C, T, styles } from '../theme';
import { CostList } from '../components/CostList';

// =====================================================
// LOOKUP: Region / SOU / Estate / Field views
// =====================================================
export function LookupScreen(p) {
  const { estates, fields, sel, setSel } = p;
  const es = estatesIn(estates, sel);
  const estate = es.find((e) => e.id === sel.estateId) || null;
  const ef = estate ? fields.filter((f) => f.estateId === estate.id) : [];
  const field = ef.find((f) => f.id === sel.fieldId) || null;

  if (estates.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Empty title="No estates yet" text="Upload your estate data or load the example data on Home." />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.selBar}>
        <Filters {...p} sel={sel} onChange={setSel} />
      </View>

      {field ? (
        <FieldLookup {...p} estate={estate} field={field} />
      ) : estate ? (
        <EstateLookup {...p} estate={estate} ef={ef} onPickField={(id) => setSel({ ...sel, estateId: estate.id, fieldId: id })} />
      ) : (
        <GroupLookup {...p} es={es} onPickEstate={(id) => setSel({ ...sel, estateId: id, fieldId: null })} />
      )}
    </ScrollView>
  );
}

// Summary for a Region / SOU (or all estates)
function GroupLookup(p) {
  const { es, fields, visits, actions, sel } = p;
  const title = sel.sou || sel.region || 'All estates';
  const rows = es
    .map((e) => {
      const ef = fields.filter((f) => f.estateId === e.id);
      let red = 0;
      let amb = 0;
      ef.forEach((f) => {
        const t = fieldTriggers(f, visits, actions);
        red += countIn(t, 'action');
        amb += countIn(t, 'monitor');
      });
      return { e: e, ef: ef, red: red, amb: amb, ey: estateYield(ef), pv: profitVar(e) };
    })
    .sort((a, b) => b.red - a.red || b.amb - a.amb);
  const allF = fields.filter((f) => es.some((e) => e.id === f.estateId));
  const gy = estateYield(allF);
  let pa = 0;
  let pb = 0;
  es.forEach((e) => {
    if (num(e.profitAct) !== null && num(e.profitBgt) !== null) {
      pa += num(e.profitAct);
      pb += num(e.profitBgt);
    }
  });
  const gpv = pb ? ((pa - pb) / pb) * 100 : null;
  const totalRed = rows.reduce((s, r) => s + r.red, 0);
  const maxP = rows.reduce((m, r) => Math.max(m, num(r.e.profitAct) || 0, num(r.e.profitBgt) || 0), 1);

  return (
    <>
      <Hero
        mini
        eyebrow={sel.sou ? 'SOU summary' : sel.region ? 'Region summary' : 'All estates'}
        title={title}
        sub={es.length + ' estates · ' + allF.length + ' fields' + (gy ? ' · ' + gy.ha.toFixed(0) + ' mature ha' : '')}
        stats={[
          { ic: 'alert-circle', v: String(totalRed), l: 'Action', tone: 'att' },
          { ic: 'leaf', v: gy ? pctText(gy.v) : '-', l: 'Yield var', tone: gy && gy.v < LIMITS.yieldAmber ? 'att' : 'good' },
          { ic: 'trending-up', v: pctText(gpv), l: 'Profit var', tone: gpv !== null && gpv < 0 ? 'att' : 'good' },
        ]}
      />
      <Section icon="podium-outline" title="Estates by urgency" right={<T style={styles.hint}>Tap to open</T>}>
        {rows.length === 0 && <T style={styles.hint}>No estates in this selection.</T>}
        {rows.map((r) => (
          <Pressable key={r.e.id} style={styles.rcard} onPress={() => p.onPickEstate(r.e.id)}>
            <View style={[styles.estBox, r.red ? { backgroundColor: C.att } : null]}>
              <Text style={styles.estBoxText}>{r.e.name.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rcardTitle}>{r.e.name}</Text>
              <T style={styles.meta} numberOfLines={2}>
                {[r.e.sou, r.ef.length + ' fields', r.ey ? 'yield ' + pctText(r.ey.v) : null, 'profit ' + pctText(r.pv)].filter(Boolean).join(' · ')}
              </T>
              <View style={styles.chips}>
                {r.red > 0 && <Chip tone="att" dot label={r.red + ' action'} />}
                {r.amb > 0 && <Chip tone="mon" dot label={r.amb + ' monitor'} />}
                {r.red + r.amb === 0 && <Chip tone="good" dot label="All clear" />}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Pressable>
        ))}
      </Section>
      {rows.some((r) => num(r.e.profitAct) !== null) && (
        <Section icon="bar-chart-outline" title="Profit by estate" right={<T style={styles.hint}>YTD</T>}>
          {rows
            .filter((r) => num(r.e.profitAct) !== null)
            .map((r) => (
              <Bar
                key={r.e.id}
                label={r.e.name + '  ' + rmMil(r.e.profitAct)}
                value={num(r.e.profitAct)}
                max={maxP}
                marker={num(r.e.profitBgt) === null ? undefined : num(r.e.profitBgt)}
                color={r.pv !== null && r.pv < 0 ? C.att : C.good}
                right={pctText(r.pv)}
              />
            ))}
          <T style={styles.hint}>Bar = actual profit. Black line = budget.</T>
        </Section>
      )}
    </>
  );
}

function FieldLookup(p) {
  const { field, estate, visits, actions } = p;
  const trig = fieldTriggers(field, visits, actions);
  const red = countIn(trig, 'action');
  const amb = countIn(trig, 'monitor');
  const ys = yieldStatus(field);
  const lv = latestFieldVisit(visits, field.id);
  const ck = lv ? checkOf(lv, field.id) : null;
  const fa = actions.filter((a) => a.fieldId === field.id);
  const maxY = Math.max(num(field.ypAct) || 0, num(field.ypBgt) || 0, num(field.ypLy) || 0, 1);

  return (
    <>
      <Hero
        mini
        eyebrow={estate.name}
        title={'Field ' + field.code}
        sub={(field.year ? 'Planted ' + field.year + ' · ' : '') + (field.ha || '-') + ' mature ha'}
        stats={[
          { ic: 'alert-circle', v: String(red), l: 'Action', tone: 'att' },
          { ic: 'warning', v: String(amb), l: 'Monitor', tone: 'mon' },
          { ic: 'leaf', v: pctText(yieldVar(field)), l: 'Yield var', tone: ys ? STATUS[ys].tone : null },
        ]}
      />

      {trig.length > 0 ? (
        <View style={styles.exc}>
          <View style={styles.excHead}>
            <View style={[styles.hic, { backgroundColor: C.att }]}>
              <Ionicons name="alert" size={17} color="#fff" />
            </View>
            <Text style={styles.excTitle}>TRIGGERED IN THIS FIELD</Text>
            <View style={{ flex: 1 }} />
            <View style={styles.excCount}>
              <T style={styles.excCountText}>{trig.length}</T>
            </View>
          </View>
          {trig.map((t) => (
            <View key={t.key} style={styles.exRow}>
              <View style={[styles.exIc, TONE_BG[STATUS[t.st].tone]]}>
                <Ionicons name={t.icon} size={19} color={TONE_FG[STATUS[t.st].tone]} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <T style={styles.exTitle}>{t.text}</T>
                <T style={styles.meta}>{t.sub}</T>
                {t.photos && t.photos.length > 0 && <PhotoStrip photos={t.photos} readOnly />}
              </View>
              <Chip tone={STATUS[t.st].tone} dot label={STATUS[t.st].label} />
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.result, TONE_BG.good]}>
          <Ionicons name="checkmark-circle" size={22} color={C.good} />
          <T style={[styles.bold, { color: C.good, flex: 1 }]}>All clear. Nothing triggered in this field.</T>
        </View>
      )}

      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <CTA label="NEW VISIT HERE" icon="add" onPress={() => p.onNewVisit(estate.id, [field.id])} />
        </View>
        <View style={{ flex: 1 }}>
          <CTA label="EDIT DATA" icon="create" secondary onPress={() => p.onOpenField(field.id, 'Details')} />
        </View>
      </View>

      <Section icon="leaf-outline" title="Yield YTD" right={<T style={styles.hint}>mt/ha</T>}>
        {num(field.ypAct) === null ? (
          <T style={styles.hint}>No yield data yet.</T>
        ) : (
          <>
            <Bar label="Actual" value={num(field.ypAct)} max={maxY} color={ys ? TONE_FG[STATUS[ys].tone] : C.good} right={field.ypAct + ' (' + pctText(yieldVar(field)) + ')'} />
            <Bar label="Budget" value={num(field.ypBgt) || 0} max={maxY} color={C.muted} right={field.ypBgt || '-'} />
            <Bar label="Last year" value={num(field.ypLy) || 0} max={maxY} color={C.rnd} right={field.ypLy || '-'} />
          </>
        )}
      </Section>

      <CostList obj={field} readOnly title="Cost" />

      <Section icon="calendar-outline" title={lv ? 'Latest visit · ' + showDate(lv.date) : 'Latest visit'}>
        {!lv ? (
          <T style={styles.hint}>This field has not been visited yet.</T>
        ) : (
          <View style={styles.actGrid}>
            {ACTIVITIES.map((a) => {
              const st = actStatus(ck, a);
              const tone = st ? STATUS[st].tone : 'muted';
              return (
                <Pressable key={a.id} style={[styles.actTile, TONE_BG[tone]]} onPress={() => p.onOpenVisit(lv.id)}>
                  <Ionicons name={a.icon} size={16} color={TONE_FG[tone]} />
                  <T style={[styles.actTileText, { color: TONE_FG[tone] }]} numberOfLines={2}>
                    {no2(a.id)} {a.name}
                  </T>
                </Pressable>
              );
            })}
          </View>
        )}
      </Section>

      <Section icon="flag-outline" title="Follow-ups">
        {fa.length === 0 ? (
          <T style={styles.hint}>No follow-ups for this field.</T>
        ) : (
          sortActions(fa).map((a) => <ActionRow key={a.id} a={a} onSave={p.onSaveAction} showAct />)
        )}
      </Section>
    </>
  );
}

// Compact list of the 12 costs (bar = actual, line = budget)

function EstateLookup(p) {
  const { estate, ef, visits, actions } = p;
  const ey = estateYield(ef);
  const pv = profitVar(estate);
  const rows = ef
    .map((f) => {
      const t = fieldTriggers(f, visits, actions);
      return { f: f, t: t, red: countIn(t, 'action'), amb: countIn(t, 'monitor') };
    })
    .sort((a, b) => b.red - a.red || b.amb - a.amb);
  const totalRed = rows.reduce((s, r) => s + r.red, 0);

  return (
    <>
      <Hero
        mini
        eyebrow="Estate summary"
        title={estate.name}
        sub={ef.length + ' fields · ' + (ey ? ey.ha.toFixed(1) + ' mature ha' : 'no area yet')}
        stats={[
          { ic: 'alert-circle', v: String(totalRed), l: 'Action', tone: 'att' },
          { ic: 'leaf', v: ey ? pctText(ey.v) : '-', l: 'Yield var', tone: ey && ey.v < LIMITS.yieldAmber ? 'att' : 'good' },
          { ic: 'trending-up', v: pctText(pv), l: 'Profit var', tone: pv !== null && pv < 0 ? 'att' : 'good' },
        ]}
      />
      <Section icon="podium-outline" title="Fields by urgency" right={<T style={styles.hint}>Tap to open</T>}>
        {rows.length === 0 && <T style={styles.hint}>No fields yet.</T>}
        {rows.map((r) => {
          const ys = yieldStatus(r.f);
          return (
            <Pressable key={r.f.id} style={styles.rcard} onPress={() => p.onPickField(r.f.id)}>
              <View style={[styles.fieldBox, r.red ? TONE_BG.att : r.amb ? TONE_BG.mon : TONE_BG.good]}>
                <Text style={[styles.fieldBoxText, { color: r.red ? C.att : r.amb ? C.mon : C.good }]}>{r.f.code}</Text>
                <T style={styles.fieldBoxSub}>{r.f.ha ? r.f.ha + ' ha' : ''}</T>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={styles.bold} numberOfLines={2}>
                  {r.t.length ? r.t[0].text : 'All clear'}
                </T>
                <View style={styles.chips}>
                  {r.red > 0 && <Chip tone="att" dot label={r.red + ' action'} />}
                  {r.amb > 0 && <Chip tone="mon" dot label={r.amb + ' monitor'} />}
                  {ys && <Chip tone={STATUS[ys].tone} label={'Yield ' + pctText(yieldVar(r.f))} />}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </Pressable>
          );
        })}
      </Section>
    </>
  );
}
