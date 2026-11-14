import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TONE_FG } from './ui';
import { norm } from '../logic/importRows';
import { C, T, styles } from '../theme';
import { BottomSheet } from './BottomSheet';

// =====================================================
// DROPDOWN: tap to open a list (with search)
// =====================================================
export function Dropdown({ label, value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const sel = options.find((o) => o.value === value);
  const list = options.filter((o) => norm(o.label).includes(norm(q)));
  return (
    <View style={styles.field}>
      {label ? <T style={styles.label}>{label}</T> : null}
      <Pressable style={[styles.input, styles.ddBtn]} onPress={() => setOpen(true)}>
        <T style={[styles.ddText, !sel && { color: C.faint }]} numberOfLines={1}>
          {sel ? sel.label : placeholder || 'Select'}
        </T>
        <Ionicons name="chevron-down" size={18} color={C.accent} />
      </Pressable>
      <BottomSheet visible={open} onClose={() => setOpen(false)}>
          <View style={{ gap: 10 }}>
            <Text style={styles.calTitle}>{label || 'Select'}</Text>
            {options.length > 6 && (
              <TextInput
                style={styles.input}
                placeholder="Search"
                placeholderTextColor={C.faint}
                value={q}
                onChangeText={setQ}
              />
            )}
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {list.map((o) => {
                const on = o.value === value;
                return (
                  <Pressable
                    key={String(o.value)}
                    style={[styles.ddRow, on && styles.ddRowOn]}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                      setQ('');
                    }}>
                    <View style={{ flex: 1 }}>
                      <T style={[styles.bold, on && { color: C.accent }]}>{o.label}</T>
                      {o.sub ? <T style={styles.meta}>{o.sub}</T> : null}
                    </View>
                    {o.tone && <View style={[styles.resDot, { backgroundColor: TONE_FG[o.tone] }]} />}
                    {on && <Ionicons name="checkmark" size={18} color={C.accent} />}
                  </Pressable>
                );
              })}
              {list.length === 0 && <T style={styles.hint}>Nothing found.</T>}
            </ScrollView>
          </View>
      </BottomSheet>
    </View>
  );
}
