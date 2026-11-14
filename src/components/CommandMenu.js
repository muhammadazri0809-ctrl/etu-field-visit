import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { norm } from '../logic/importRows';
import { showDate } from '../logic/dates';
import { C, T, styles } from '../theme';

// Quick actions always listed (hint = the faster way to do it next time)
const ACTIONS = [
  { k: 'new', icon: 'add-circle', title: 'New field visit', words: 'new visit start etu' },
  { k: 'wa', icon: 'logo-whatsapp', title: 'Import WhatsApp chat', words: 'whatsapp chat import zip' },
  { k: 'upload', icon: 'cloud-upload', title: 'Upload estate data', words: 'excel upload csv workbook data' },
  { k: 'alerts', icon: 'alert-circle', title: 'Priorities', words: 'priorities worst overdue alerts' },
  { k: 'profit', icon: 'bar-chart', title: 'Profit by estate', words: 'profit money rm' },
  { k: 'settings', icon: 'options', title: 'Settings · backup', words: 'settings backup restore limits' },
];

// Search everything and jump there: estates, fields (by code), visits and actions
export function CommandMenu({ visible, onClose, estates, fields, etu, onPick }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const n = norm(q);
    const ename = (id) => (estates.find((e) => e.id === id) || {}).name || '';
    const out = [];
    ACTIONS.forEach((a) => {
      if (!n || norm(a.title + a.words).includes(n)) out.push({ key: 'a' + a.k, icon: a.icon, title: a.title, go: { action: a.k } });
    });
    if (n) {
      estates.forEach((e) => {
        if (norm(e.name + (e.region || '') + (e.sou || '')).includes(n))
          out.push({ key: 'e' + e.id, icon: 'business', title: e.name, sub: [e.region, e.sou].filter(Boolean).join(' · ') || 'Estate', go: { estate: e.id } });
      });
      fields.forEach((f) => {
        if (norm(f.code).includes(n) || norm(ename(f.estateId) + f.code).includes(n))
          out.push({ key: 'f' + f.id, icon: 'grid', title: 'Field ' + f.code, sub: ename(f.estateId), go: { field: f.id } });
      });
      etu.forEach((v) => {
        if (norm(ename(v.estateId) + (v.date || '') + showDate(v.date) + (v.visitedBy || '')).includes(n))
          out.push({ key: 'v' + v.id, icon: 'walk', title: (ename(v.estateId) || 'Visit') + ' · ' + showDate(v.date), sub: 'ETU visit', go: { visit: v.id } });
      });
    }
    return out.slice(0, 40);
  }, [q, estates, fields, etu]);

  const close = () => {
    setQ('');
    onClose();
  };
  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={C.muted} />
        <TextInput
          style={styles.searchIn}
          placeholder="Estate, field code (e.g. 2016A) or action"
          placeholderTextColor={C.faint}
          value={q}
          onChangeText={setQ}
          autoFocus
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => results[0] && (onPick(results[0].go), close())}
        />
      </View>
      <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
        {results.map((r, i) => (
          <Pressable
            key={r.key}
            style={[styles.ddRow, i === 0 && q ? styles.ddRowOn : null]}
            onPress={() => {
              onPick(r.go);
              close();
            }}>
            <Ionicons name={r.icon} size={18} color={C.accent} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.bold} numberOfLines={1}>{r.title}</Text>
              {r.sub ? <T style={styles.meta} numberOfLines={1}>{r.sub}</T> : null}
            </View>
            {i === 0 && q ? <T style={styles.kbdHint}>↵ Go</T> : null}
          </Pressable>
        ))}
        {results.length === 0 && <T style={styles.hint}>Nothing found for “{q}”.</T>}
      </ScrollView>
      <T style={styles.hint}>
        Tips: press Go on the keyboard to open the first result · swipe a visit sideways to delete · drag this sheet down to close.
      </T>
    </BottomSheet>
  );
}
