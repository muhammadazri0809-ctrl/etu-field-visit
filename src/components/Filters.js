import { View } from 'react-native';
import React from 'react';
import { Dropdown } from './Dropdown';
import { countIn } from '../logic/rules';
import { ALL, estatesIn, fieldTriggers, uniq } from '../logic/triggers';
import { styles } from '../theme';

export function Filters({ estates, fields, visits, actions, sel, onChange }) {
  const regions = uniq(estates.map((e) => e.region));
  const sous = uniq(estates.filter((e) => !sel.region || e.region === sel.region).map((e) => e.sou));
  const es = estatesIn(estates, sel);
  const estate = es.find((e) => e.id === sel.estateId) || null;
  const ef = estate ? fields.filter((f) => f.estateId === estate.id) : [];

  const fieldOpts = [{ value: ALL, label: 'All fields (estate summary)' }].concat(
    ef.map((f) => {
      const t = fieldTriggers(f, visits, actions);
      const red = countIn(t, 'action');
      const amb = countIn(t, 'monitor');
      return {
        value: f.id,
        label: 'Field ' + f.code,
        sub: (f.year ? 'PY ' + f.year + ' · ' : '') + (f.ha || '-') + ' ha · ' + (red ? red + ' action' : amb ? amb + ' monitor' : 'all good'),
        tone: red ? 'att' : amb ? 'mon' : 'good',
      };
    })
  );

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.row2}>
        <Dropdown
          label="Region"
          value={sel.region || ALL}
          options={[{ value: ALL, label: 'All regions' }].concat(
            regions.map((r) => ({ value: r, label: r, sub: estates.filter((e) => e.region === r).length + ' estates' }))
          )}
          onChange={(v) => onChange({ region: v === ALL ? null : v })}
        />
        <Dropdown
          label="SOU"
          value={sel.sou || ALL}
          options={[{ value: ALL, label: 'All SOU' }].concat(
            sous.map((u) => ({ value: u, label: u, sub: estates.filter((e) => e.sou === u).length + ' estates' }))
          )}
          onChange={(v) => onChange({ region: sel.region, sou: v === ALL ? null : v })}
        />
      </View>
      <View style={styles.row2}>
        <Dropdown
          label="Estate"
          value={estate ? estate.id : ALL}
          options={[{ value: ALL, label: 'All estates (summary)' }].concat(
            es.map((e) => ({
              value: e.id,
              label: e.name,
              sub: [e.sou, fields.filter((f) => f.estateId === e.id).length + ' fields'].filter(Boolean).join(' · '),
            }))
          )}
          onChange={(v) => onChange({ region: sel.region, sou: sel.sou, estateId: v === ALL ? null : v })}
        />
        <Dropdown
          label="Field"
          value={sel.fieldId || ALL}
          placeholder={estate ? 'All fields' : 'Pick estate first'}
          options={estate ? fieldOpts : []}
          onChange={(v) => onChange({ region: sel.region, sou: sel.sou, estateId: estate ? estate.id : null, fieldId: v === ALL ? null : v })}
        />
      </View>
    </View>
  );
}
