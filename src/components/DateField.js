import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MONTHS, showDate, toKey, today } from '../logic/dates';
import { C, T, styles } from '../theme';

// =====================================================
// DATE FIELD: tap to open a calendar (no typing)
// =====================================================
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function DateField({ label, value, onChange, style }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((value || today()).slice(0, 7));

  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1;
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const shift = (n) => {
    const d = new Date(y, m + n, 1);
    setMonth(toKey(d).slice(0, 7));
  };
  const pick = (d) => {
    onChange(toKey(new Date(y, m, d)));
    setOpen(false);
  };

  return (
    <View style={[styles.field, style]}>
      {label ? <T style={styles.label}>{label}</T> : null}
      <Pressable
        style={[styles.input, styles.dateBtn]}
        onPress={() => {
          setMonth((value || today()).slice(0, 7));
          setOpen(true);
        }}>
        <Ionicons name="calendar-outline" size={17} color={C.accent} />
        <T style={styles.dateBtnText}>{value ? showDate(value) : 'Pick a date'}</T>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setOpen(false)}>
          <Pressable style={styles.calCard} onPress={() => {}}>
            <View style={styles.calHead}>
              <Pressable style={styles.iconBtn} onPress={() => shift(-1)}>
                <Ionicons name="chevron-back" size={20} color={C.ink} />
              </Pressable>
              <Text style={styles.calTitle}>
                {MONTHS[m]} {y}
              </Text>
              <Pressable style={styles.iconBtn} onPress={() => shift(1)}>
                <Ionicons name="chevron-forward" size={20} color={C.ink} />
              </Pressable>
            </View>
            <View style={styles.calGrid}>
              {WEEK.map((w, i) => (
                <T key={'w' + i} style={styles.calWeek}>{w}</T>
              ))}
              {cells.map((d, i) => {
                if (!d) return <View key={'e' + i} style={styles.calCell} />;
                const key = toKey(new Date(y, m, d));
                const on = key === value;
                const isToday = key === today();
                return (
                  <Pressable
                    key={key}
                    style={[styles.calCell, on && styles.calOn, !on && isToday && styles.calToday]}
                    onPress={() => pick(d)}>
                    <T style={[styles.calDay, on && { color: '#fff' }]}>{d}</T>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.row2}>
              <Pressable style={styles.btnGhost} onPress={() => { onChange(today()); setOpen(false); }}>
                <T style={styles.bold}>Today</T>
              </Pressable>
              <Pressable style={styles.btnGhost} onPress={() => setOpen(false)}>
                <T style={styles.bold}>Close</T>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
