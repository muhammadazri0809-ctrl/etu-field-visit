import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CTA, Chip, DateBox, DeleteBox, Empty, Field, FilterChips, Hero, KV, Menu, MenuRow, PageHead, SearchBox, Section, TONE_BG, TONE_FG } from '../components/ui';
import { newId, showDate } from '../logic/dates';
import { etuCounts } from '../logic/etu';
import { norm } from '../logic/importRows';
import { ACTIVITIES, COSTS, LIMITS, STATUS, actStatus, checkOf, costAlerts, costOf, countIn, estateCost, estateYield, findings, isOverdue, latestFieldVisit, money, num, pctText, profitVar, rmMil, sortActions, variance, yieldStatus, yieldVar } from '../logic/rules';
import { ActionRow } from './FieldScreen';
import { CostList, VarPill } from '../components/CostList';
import { C, T, styles } from '../theme';

// =====================================================
// ESTATE: menu page, and one page per section
// =====================================================
export function EstateScreen(p) {
  const { estate, fields, visits, actions, tab, onChange } = p;
  const [confirm, setConfirm] = useState(false);
  const [q, setQ] = useState('');
  const [ff, setFf] = useState('all');
  const [adding, setAdding] = useState(false);
  const [nf, setNf] = useState({ code: '', year: '', ha: '' });
  const ef = fields.filter((f) => f.estateId === estate.id);
  const ev = visits.filter((v) => v.estateId === estate.id).sort((a, b) => b.date.localeCompare(a.date));
  const ea = actions.filter((a) => a.estateId === estate.id);
  const open = ea.filter((a) => a.status !== 'done');
  const late = open.filter(isOverdue);
  const pv = profitVar(estate);
  const ey = estateYield(ef);
  const ec = estateCost(ef);
  const fcode = (id) => (id ? (fields.find((f) => f.id === id) || {}).code || '?' : 'Estate');
  const yLow = ef.filter((f) => yieldStatus(f) === 'action' || yieldStatus(f) === 'monitor').length;
  const cOver = ef.filter((f) => costAlerts(f).length).length;
  const fieldRed = (f) => {
    const lv = latestFieldVisit(visits, f.id);
    return lv ? ACTIVITIES.filter((a) => actStatus(checkOf(lv, f.id), a) === 'action').length : 0;
  };
  const aRed = ef.filter((f) => fieldRed(f) > 0).length;
  const eEtu = (p.etu || []).filter((v) => v.estateId === estate.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const eAtt = eEtu.length ? etuCounts(eEtu[0]).attention : 0;

  // ---------- menu page ----------
  if (!tab) {
    const go = (t) => p.onOpenEstate(estate.id, t);
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Hero
          mini
          eyebrow={[estate.region, estate.sou].filter(Boolean).join(' · ') || 'Estate'}
          title={estate.name}
          sub={ef.length + ' fields · ' + (ey ? ey.ha.toFixed(1) + ' mature ha' : 'no area yet')}
          stats={[
            { ic: 'leaf', v: ey ? ey.act.toFixed(1) : '-', l: 'Yield mt/ha', tone: ey && ey.v < LIMITS.yieldAmber ? 'att' : 'good' },
            { ic: 'flag', v: String(open.length), l: 'Follow-ups', tone: late.length ? 'att' : open.length ? 'mon' : 'good' },
            { ic: 'trending-up', v: pctText(pv), l: 'Profit var', tone: pv !== null && pv < 0 ? 'att' : 'good' },
          ]}
        />
        <EstateOverview
          fields={ef}
          ec={ec}
          late={late}
          fieldRed={fieldRed}
          fcode={fcode}
          onField={p.onOpenField}
          onTab={go}
        />
        <T style={styles.groupLabel}>All sections</T>
        <Menu>
          <MenuRow icon="grid-outline" title="Fields" sub={ef.length + ' fields · ' + yLow + ' yield below budget'} chip={aRed ? aRed + ' action' : null} tone={aRed ? 'att' : null} onPress={() => go('Fields')} />
          <MenuRow icon="walk-outline" title="ETU field visits" sub={eEtu.length ? eEtu.length + ' visits · latest ' + showDate(eEtu[0].date) : 'No ETU visits yet'} chip={eAtt ? eAtt + ' attention' : null} tone={eAtt ? 'att' : null} onPress={p.onOpenEtu} />
          <MenuRow icon="calendar-outline" title="Assessments & checks" sub={ev.length ? ev.length + ' · PMU, agronomist, activity checks' : 'None yet'} onPress={() => go('Visits')} />
          <MenuRow icon="flag-outline" title="Follow-ups" sub={open.length + ' open · ' + (ea.length - open.length) + ' done'} chip={late.length ? late.length + ' overdue' : null} tone={late.length ? 'att' : null} onPress={() => go('Follow-ups')} />
          <MenuRow icon="cash-outline" title="Cost" sub={'12 elements · ' + costAlerts(ec).length + ' over budget (estate)'} chip={cOver ? cOver + ' fields over' : null} tone={cOver ? 'mon' : null} onPress={() => go('Cost')} />
          <MenuRow icon="trending-up" title="Profit" sub={num(estate.profitAct) !== null ? rmMil(estate.profitAct) + ' YTD' : 'Not entered'} chip={pv !== null ? pctText(pv) : null} tone={pv !== null && pv < 0 ? 'att' : 'good'} onPress={() => go('Profit')} />
          <MenuRow icon="information-circle-outline" title="Estate details" sub="Name · region · SOU · delete" last onPress={() => go('Details')} />
        </Menu>
        <CTA label="NEW ETU FIELD VISIT" icon="walk" onPress={p.onNewEtu} />
      </ScrollView>
    );
  }

  // ---------- section pages ----------
  const fieldList = ef
    .filter((f) => norm(f.code).includes(norm(q)))
    .filter((f) => {
      if (ff === 'action') return fieldRed(f) > 0;
      if (ff === 'yield') return yieldStatus(f) === 'action' || yieldStatus(f) === 'monitor';
      if (ff === 'cost') return costAlerts(f).length > 0;
      return true;
    });

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {tab === 'Fields' && (
        <>
          <PageHead icon="grid-outline" title="Fields" sub={estate.name + ' · ' + ef.length + ' fields · yield YTD mt/ha'} />
          <SearchBox value={q} onChange={setQ} placeholder="Search field code, e.g. 2016A" />
          <FilterChips
            value={ff}
            onChange={setFf}
            options={[
              { key: 'all', label: 'All', n: ef.length },
              { key: 'action', label: 'Action', n: aRed },
              { key: 'yield', label: 'Yield low', n: yLow },
              { key: 'cost', label: 'Cost over', n: cOver },
            ]}
          />
          {fieldList.length === 0 && <Empty title="No fields" text={ef.length ? 'Nothing matches.' : 'Add your fields below.'} />}
          {fieldList.map((f) => {
            const ys = yieldStatus(f);
            const red = fieldRed(f);
            const ca = costAlerts(f).length;
            return (
              <Pressable key={f.id} style={styles.card} onPress={() => p.onOpenField(f.id)}>
                <View style={[styles.fieldBox, ys && TONE_BG[STATUS[ys].tone]]}>
                  <Text style={[styles.fieldBoxText, ys && { color: TONE_FG[STATUS[ys].tone] }]} numberOfLines={1}>
                    {f.code}
                  </Text>
                  <T style={styles.fieldBoxSub}>{f.year ? 'PY ' + f.year : ''}</T>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T style={styles.bold}>
                    {f.ypAct || '-'} <T style={styles.meta}>vs {f.ypBgt || '-'} · {f.ha || '-'} ha</T>
                  </T>
                  <View style={styles.chips}>
                    {ys && <Chip tone={STATUS[ys].tone} dot label={pctText(yieldVar(f))} />}
                    {red > 0 && <Chip tone="att" label={red + ' action'} />}
                    {ca > 0 && <Chip tone="mon" label={ca + ' cost'} />}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </Pressable>
            );
          })}
          {adding ? (
            <Section icon="add-circle-outline" title="Add field">
              <View style={styles.row2}>
                <Field label="Field code" placeholder="e.g. 3C" autoCapitalize="characters" value={nf.code} onChangeText={(t) => setNf({ ...nf, code: t })} />
                <Field label="Planted" placeholder="2008" keyboardType="numeric" value={nf.year} onChangeText={(t) => setNf({ ...nf, year: t })} />
                <Field label="Mature ha" placeholder="0.0" keyboardType="numeric" value={nf.ha} onChangeText={(t) => setNf({ ...nf, ha: t })} />
              </View>
              <CTA
                label="ADD FIELD"
                icon="add"
                onPress={() => {
                  const code = nf.code.trim().toUpperCase();
                  if (!code) return;
                  p.onAddField({ id: newId(), estateId: estate.id, code: code, year: nf.year, ha: nf.ha, ypAct: '', ypBgt: '', ypLy: '', costs: {} });
                  setNf({ code: '', year: '', ha: '' });
                  setAdding(false);
                }}
              />
            </Section>
          ) : (
            <Pressable style={styles.delRow} onPress={() => setAdding(true)}>
              <Ionicons name="add-circle-outline" size={18} color={C.accent} />
              <T style={styles.link}>Add a field by hand</T>
            </Pressable>
          )}
        </>
      )}

      {tab === 'Visits' && (
        <>
          <PageHead icon="calendar-outline" title="Assessments & checks" sub={estate.name + ' · PMU, agronomist and 10-activity checks'} />
          <CTA label="NEW 10-ACTIVITY CHECK" icon="add" secondary onPress={p.onNewVisit} />
          {ev.length === 0 && <Empty title="No visits yet" text="Start your first site visit." />}
          {ev.map((v) => {
            const all = findings(v);
            const red = countIn(all, 'action');
            const amber = countIn(all, 'monitor');
            const ids = v.fieldIds || [];
            return (
              <Pressable key={v.id} style={styles.card} onPress={() => p.onOpenVisit(v.id)}>
                <DateBox date={v.date} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T style={styles.bold} numberOfLines={2}>{v.title || 'Site visit'}</T>
                  <T style={styles.meta} numberOfLines={2}>
                    {ids.length > 5 ? ids.length + ' fields' : 'Fields ' + (ids.map(fcode).join(', ') || '-')}
                  </T>
                  <View style={styles.chips}>
                    {red > 0 && <Chip tone="att" dot label={red + ' action'} />}
                    {amber > 0 && <Chip tone="mon" dot label={amber + ' monitor'} />}
                    {all.length > 0 && red + amber === 0 && <Chip tone="good" dot label="All good" />}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </Pressable>
            );
          })}
        </>
      )}

      {tab === 'Follow-ups' && (
        <>
          <PageHead icon="flag-outline" title="Follow-ups" sub={estate.name + ' · ' + open.length + ' open · ' + late.length + ' overdue'} />
          <FilterChips
            value={ff}
            onChange={setFf}
            options={[
              { key: 'all', label: 'Open', n: open.length },
              { key: 'late', label: 'Overdue', n: late.length },
              { key: 'done', label: 'Done', n: ea.length - open.length },
            ]}
          />
          {ea.length === 0 && <Empty title="No follow-ups" text="Add them from a site visit (Monitor or Action)." />}
          {sortActions(ff === 'done' ? ea.filter((a) => a.status === 'done') : ff === 'late' ? late : open).map((a) => (
            <ActionRow key={a.id} a={a} field={fcode(a.fieldId)} onSave={p.onSaveAction} onDelete={p.onDeleteAction} showAct />
          ))}
        </>
      )}

      {tab === 'Cost' && (
        <>
          <PageHead icon="cash-outline" title="Estate cost" sub="RM/ha YTD · field costs weighted by mature ha" />
          <CostList obj={ec} readOnly />
          <Section icon="grid-outline" title="Fields over budget" right={<T style={styles.hint}>{cOver} fields</T>}>
            {ef.filter((f) => costAlerts(f).length).length === 0 && <T style={styles.hint}>All fields within budget.</T>}
            {ef
              .filter((f) => costAlerts(f).length)
              .map((f) => (
                <Pressable key={f.id} style={styles.readRow} onPress={() => p.onOpenField(f.id, 'Cost')}>
                  <T style={[styles.bold, { width: 62 }]}>{f.code}</T>
                  <T style={[styles.meta, { flex: 1 }]} numberOfLines={2}>{costAlerts(f).join(', ')}</T>
                  <Ionicons name="chevron-forward" size={16} color={C.muted} />
                </Pressable>
              ))}
          </Section>
        </>
      )}

      {tab === 'Profit' && (
        <>
          <PageHead icon="trending-up" title="Estate profit" sub={estate.name + ' · YTD'} />
          <View style={[styles.profitBox, pv !== null && pv < 0 ? TONE_BG.att : TONE_BG.good]}>
            <T style={styles.meta}>{pv === null ? 'Profit YTD' : 'Variance vs budget'}</T>
            <Text style={[styles.profitBig, { color: pv !== null && pv < 0 ? C.att : C.good }]}>
              {pv === null ? rmMil(estate.profitAct) : pctText(pv)}
            </Text>
            {pv !== null && <T style={styles.meta}>{rmMil(estate.profitAct) + ' actual · ' + rmMil(num(estate.profitAct) - num(estate.profitBgt)) + ' vs budget'}</T>}
            {ey && num(estate.profitAct) !== null && (
              <T style={styles.meta}>Profit per mature ha: RM {money((num(estate.profitAct) * 1000) / ey.ha)}</T>
            )}
          </View>
          <Section icon="create-outline" title="Edit">
            <View style={styles.row2}>
              <Field label="Actual (RM'000)" keyboardType="numeric" placeholder="0" value={estate.profitAct || ''} onChangeText={(t) => onChange({ ...estate, profitAct: t })} />
              <Field label="Budget (RM'000)" keyboardType="numeric" placeholder="0" value={estate.profitBgt || ''} onChangeText={(t) => onChange({ ...estate, profitBgt: t })} />
            </View>
            <T style={styles.hint}>Type in RM'000, e.g. 16259 = RM 16.26 mil.</T>
            <View>
            </View>
          </Section>
        </>
      )}

      {tab === 'Details' && (
        <>
          <PageHead icon="information-circle-outline" title="Estate details" />
          <Section>
            <Field label="Estate name" full value={estate.name} onChangeText={(t) => onChange({ ...estate, name: t })} />
            <View style={styles.row2}>
              <Field label="Region" placeholder="e.g. STR" value={estate.region || ''} onChangeText={(t) => onChange({ ...estate, region: t })} />
              <Field label="SOU" placeholder="e.g. SOU 20" value={estate.sou || ''} onChangeText={(t) => onChange({ ...estate, sou: t })} />
            </View>
            <View style={styles.kv}>
              <KV label="Fields" value={String(ef.length)} />
              <KV label="Mature ha" value={ey ? ey.ha.toFixed(1) : '-'} />
              <KV label="Yield YTD" value={ey ? ey.act.toFixed(2) + ' mt/ha' : '-'} />
              <KV label="Yield budget" value={ey ? ey.bgt.toFixed(2) + ' mt/ha' : '-'} />
            </View>
          </Section>
          <DeleteBox label={'Delete ' + estate.name + ' with all fields, visits and actions?'} button="Delete estate" confirm={confirm} setConfirm={setConfirm} onDelete={p.onDelete} />
        </>
      )}
    </ScrollView>
  );
}

// ===== Estate overview: what needs attention, without opening each section =====
function EstateOverview({ fields, ec, late, fieldRed, fcode, onField, onTab }) {
  // worst fields: action findings, low yield or cost over the limit
  const scored = fields
    .map((f) => {
      const yv = yieldVar(f);
      const ys = yieldStatus(f);
      const red = fieldRed(f);
      const ca = costAlerts(f).length;
      const score = red * 3 + (ys === 'action' ? 3 : ys === 'monitor' ? 1 : 0) + ca;
      return { f, yv, ys, red, ca, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (a.yv === null ? 0 : a.yv) - (b.yv === null ? 0 : b.yv));
  const costRows = COSTS.map((name, i) => ({ name, v: variance(costOf(ec, i).act, costOf(ec, i).bgt) }))
    .filter((r) => r.v !== null && r.v > LIMITS.cost)
    .sort((a, b) => b.v - a.v);

  if (!scored.length && !costRows.length && !late.length) {
    return (
      <Section icon="checkmark-circle-outline" title="All on track">
        <T style={styles.hint}>No fields need action, no cost element is over the limit and no follow-up is overdue.</T>
      </Section>
    );
  }

  const SeeAll = ({ tab, n }) => (
    <Pressable onPress={() => onTab(tab)} hitSlop={8} style={styles.seeAll}>
      <T style={styles.seeAllText}>{n > 3 ? 'See all ' + n : 'Open'}</T>
      <Ionicons name="chevron-forward" size={14} color={C.accent} />
    </Pressable>
  );

  return (
    <Section icon="alert-circle-outline" title="Needs attention">
      {scored.length > 0 && (
        <View style={styles.ovGroup}>
          <View style={styles.rowBetween}>
            <T style={styles.kvLabel}>Fields · worst first</T>
            <SeeAll tab="Fields" n={scored.length} />
          </View>
          {scored.slice(0, 3).map((x) => (
            <Pressable key={x.f.id} style={styles.ovRow} onPress={() => onField(x.f.id)}>
              <View style={[styles.ovCode, x.ys && TONE_BG[STATUS[x.ys].tone]]}>
                <Text style={[styles.ovCodeText, x.ys && { color: TONE_FG[STATUS[x.ys].tone] }]} numberOfLines={1}>
                  {x.f.code}
                </Text>
              </View>
              <View style={[styles.chips, { flex: 1, marginTop: 0 }]}>
                {x.yv !== null && (
                  <Chip tone={x.ys ? STATUS[x.ys].tone : 'muted'} icon={x.yv < 0 ? 'arrow-down' : 'arrow-up'} label={'Yield ' + pctText(x.yv)} />
                )}
                {x.red > 0 && <Chip tone="att" icon="alert-circle" label={x.red + ' action'} />}
                {x.ca > 0 && <Chip tone="mon" icon="cash" label={x.ca + ' cost over'} />}
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.faint} />
            </Pressable>
          ))}
        </View>
      )}
      {costRows.length > 0 && (
        <View style={styles.ovGroup}>
          <View style={styles.rowBetween}>
            <T style={styles.kvLabel}>Cost over +{LIMITS.cost}% (estate)</T>
            <SeeAll tab="Cost" n={costRows.length} />
          </View>
          {costRows.slice(0, 3).map((r) => (
            <Pressable key={r.name} style={styles.ovRow} onPress={() => onTab('Cost')}>
              <T style={[styles.bold, { flex: 1 }]}>{r.name}</T>
              <VarPill v={r.v} />
            </Pressable>
          ))}
        </View>
      )}
      {late.length > 0 && (
        <View style={styles.ovGroup}>
          <View style={styles.rowBetween}>
            <T style={styles.kvLabel}>Overdue follow-ups</T>
            <SeeAll tab="Follow-ups" n={late.length} />
          </View>
          {late.slice(0, 3).map((a) => (
            <Pressable key={a.id} style={styles.ovRow} onPress={() => onTab('Follow-ups')}>
              <Ionicons name="time" size={18} color={C.att} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={styles.bold} numberOfLines={2}>{a.text}</T>
                <T style={[styles.meta, { color: C.attInk }]}>
                  {fcode(a.fieldId)} · due {showDate(a.due)}
                </T>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Section>
  );
}
