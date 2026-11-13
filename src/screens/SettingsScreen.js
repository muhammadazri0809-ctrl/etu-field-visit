import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CTA, Field, Hero, Section } from '../components/ui';
import { ACTIVITIES, DEFAULT_LIMITS, DEFAULT_RULES, LIMITS, no2 } from '../logic/rules';
import { C, T, styles } from '../theme';
import { exportBackup, pickBackup, restorePhotos } from '../storage';
import { backupSummary } from '../logic/backup';
import { showDate } from '../logic/dates';

// =====================================================
// SETTINGS: change trigger limits without coding
// =====================================================
export function SettingsScreen({ settings, setSettings, counts, onClearAll, backupData, onRestore }) {
  const [openAct, setOpenAct] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const s = settings || {};
  const setTop = (k, v) => setSettings({ ...s, [k]: v });
  const setRule = (rid, k, v) => {
    const rules = { ...(s.rules || {}) };
    rules[rid] = { ...(rules[rid] || {}), [k]: v };
    setSettings({ ...s, rules: rules });
  };
  const val = (rid, k) => {
    const o = (s.rules || {})[rid] || {};
    return o[k] !== undefined ? o[k] : '';
  };
  const changed = Object.keys(s.rules || {}).length + ['cost', 'yieldRed', 'yieldAmber'].filter((k) => s[k] !== undefined && s[k] !== '').length;

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Hero
        mini
        eyebrow="Settings"
        title="Trigger limits"
        sub="Leave a box empty to use the default (shown in grey)."
        stats={[
          { ic: 'cash', v: LIMITS.cost + '%', l: 'Cost limit', tone: 'att' },
          { ic: 'leaf', v: LIMITS.yieldRed + '%', l: 'Yield action', tone: 'att' },
          { ic: 'options', v: String(changed), l: 'Changed', tone: changed ? 'mon' : 'good' },
        ]}
      />

      <Section icon="cash-outline" title="Cost & yield">
        <Field
          label={'Cost over budget = Action when above (%) · default ' + DEFAULT_LIMITS.cost}
          full
          keyboardType="numeric"
          placeholder={String(DEFAULT_LIMITS.cost)}
          value={s.cost || ''}
          onChangeText={(t) => setTop('cost', t)}
        />
        <View style={styles.row2}>
          <Field
            label={'Yield Action below (%)'}
            keyboardType="numeric"
            placeholder={String(DEFAULT_LIMITS.yieldRed)}
            value={s.yieldRed || ''}
            onChangeText={(t) => setTop('yieldRed', t)}
          />
          <Field
            label={'Yield Monitor below (%)'}
            keyboardType="numeric"
            placeholder={String(DEFAULT_LIMITS.yieldAmber)}
            value={s.yieldAmber || ''}
            onChangeText={(t) => setTop('yieldAmber', t)}
          />
        </View>
      </Section>

      <Section icon="flash-outline" title="Activity triggers">
        <T style={styles.hint}>Tap an activity to change its Action and Monitor numbers.</T>
        {ACTIVITIES.map((a) => {
          const isOpen = openAct === a.id;
          const nums = a.rules.filter((r) => r.op !== 'yes');
          return (
            <View key={a.id} style={styles.rcardCol}>
              <Pressable style={styles.setHead} onPress={() => setOpenAct(isOpen ? null : a.id)}>
                <Ionicons name={a.icon} size={18} color={C.accent} />
                <T style={[styles.bold, { flex: 1 }]}>{no2(a.id)}. {a.name}</T>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
              </Pressable>
              {isOpen &&
                nums.map((r) => (
                  <View key={r.id} style={{ gap: 4 }}>
                    <T style={styles.ruleName}>
                      {r.name} ({r.unit}) · {r.op === '>' ? 'higher is worse' : 'lower is worse'}
                    </T>
                    <View style={styles.row2}>
                      <Field
                        label="Action"
                        keyboardType="numeric"
                        placeholder={String(DEFAULT_RULES[r.id].red)}
                        value={val(r.id, 'red')}
                        onChangeText={(t) => setRule(r.id, 'red', t)}
                      />
                      <Field
                        label="Monitor"
                        keyboardType="numeric"
                        placeholder={String(DEFAULT_RULES[r.id].amber)}
                        value={val(r.id, 'amber')}
                        onChangeText={(t) => setRule(r.id, 'amber', t)}
                      />
                    </View>
                  </View>
                ))}
            </View>
          );
        })}
      </Section>

      <CTA label="RESET LIMITS TO DEFAULT" icon="refresh" secondary onPress={() => setSettings({})} />

      <BackupSection data={backupData} onRestore={onRestore} />

      <Section icon="trash-outline" title="Clear all data">
        <T style={styles.meta}>
          Removes {counts.estates} estates, {counts.fields} fields, {counts.visits} visits and {counts.actions} follow-ups
          (including photos) from this phone. Trigger limits are kept. This cannot be undone.
        </T>
        {confirm ? (
          <View style={styles.confirm}>
            <T style={styles.confirmText}>Are you sure? Everything will be deleted.</T>
            <View style={styles.row2}>
              <Pressable style={styles.btnGhost} onPress={() => setConfirm(false)}>
                <T style={styles.bold}>Cancel</T>
              </Pressable>
              <Pressable style={styles.btnDanger} onPress={onClearAll}>
                <T style={[styles.bold, { color: '#fff' }]}>Yes, clear all</T>
              </Pressable>
            </View>
          </View>
        ) : (
          <CTA label="CLEAR ALL DATA" icon="trash" color={C.att} onPress={() => setConfirm(true)} />
        )}
      </Section>
    </ScrollView>
  );
}

// ===== BACKUP / RESTORE =====
// All data lives only on this phone. A backup file (with photos) can be saved to
// Drive / WhatsApp / email and restored on this or a new phone.
function BackupSection({ data, onRestore }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState(null);

  const doExport = async () => {
    setMsg('');
    setBusy('export');
    try {
      setMsg(await exportBackup(data));
    } catch (e) {
      setMsg('Could not make backup: ' + e.message);
    }
    setBusy('');
  };

  const doPick = async () => {
    setMsg('');
    setBusy('import');
    try {
      const b = await pickBackup();
      if (b) setPending(b);
    } catch (e) {
      setMsg('Could not read backup: ' + e.message);
    }
    setBusy('');
  };

  const doRestore = () => {
    try {
      const d = restorePhotos(pending);
      setPending(null);
      onRestore(d);
    } catch (e) {
      setMsg('Could not restore: ' + e.message);
    }
  };

  return (
    <Section icon="cloud-upload-outline" title="Backup & restore">
      <T style={styles.meta}>
        Your data is only on this phone. Save a backup file (with photos) to Google Drive, WhatsApp or email
        regularly, so nothing is lost if the phone is lost or the app is removed.
      </T>
      <CTA
        label={busy === 'export' ? 'MAKING BACKUP...' : 'SAVE BACKUP FILE'}
        icon="download-outline"
        onPress={busy ? undefined : doExport}
      />
      {pending ? (
        <View style={styles.confirm}>
          <T style={styles.confirmText}>
            Replace everything on this phone with the backup
            {pending.createdAt ? ' from ' + showDate(pending.createdAt.slice(0, 10)) : ''}?
            {'\n'}It has {backupSummary(pending.data)}, {Object.keys(pending.photos).length} photos.
          </T>
          <View style={styles.row2}>
            <Pressable style={styles.btnGhost} onPress={() => setPending(null)}>
              <T style={styles.bold}>Cancel</T>
            </Pressable>
            <Pressable style={styles.btnDanger} onPress={doRestore}>
              <T style={[styles.bold, { color: '#fff' }]}>Yes, restore</T>
            </Pressable>
          </View>
        </View>
      ) : (
        <CTA
          label={busy === 'import' ? 'READING...' : 'RESTORE FROM BACKUP'}
          icon="push-outline"
          color={C.muted}
          onPress={busy ? undefined : doPick}
        />
      )}
      {msg ? <T style={styles.hint}>{msg}</T> : null}
    </Section>
  );
}
