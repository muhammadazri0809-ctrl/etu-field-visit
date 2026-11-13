import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Chip } from './ui';
import { ESTAT, catOf } from '../logic/etu';
import { styles } from '../theme';

export function CatIcon({ cat, size }) {
  const c = catOf(cat);
  const s = size || 38;
  return (
    <View style={[styles.catIc, { width: s, height: s, backgroundColor: c.c + '22' }]}>
      <Ionicons name={c.ic} size={Math.round(s * 0.55)} color={c.c} />
    </View>
  );
}

export function StatusChip({ st }) {
  const s = ESTAT[st] || ESTAT.good;
  return <Chip tone={s.tone} dot label={s.label} />;
}
