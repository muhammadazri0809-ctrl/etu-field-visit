import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { C, T, styles } from '../theme';

// =====================================================
// BOTTOM NAVIGATION (always visible)
// =====================================================
const NAV = [
  { k: 'home', label: 'Home', ic: 'home' },
  { k: 'estates', label: 'Estates', ic: 'business' },
  { k: 'etu', label: 'Visits', ic: 'walk' },
  { k: 'alerts', label: 'Priorities', ic: 'alert-circle' },
  { k: 'more', label: 'More', ic: 'menu' },
];

export function BottomNav({ active, onGo, badge, bottom }) {
  return (
    <View style={[styles.nav, { paddingBottom: (bottom || 0) + 6 }]}>
      {NAV.map((n) => {
        const on = n.k === active;
        return (
          <Pressable key={n.k} style={styles.navBtn} onPress={() => onGo(n.k)}>
            {on && <View style={styles.navBar} />}
            <View>
              <Ionicons name={on ? n.ic : n.ic + '-outline'} size={24} color={on ? C.accent : C.muted} />
              {n.k === 'alerts' && badge > 0 ? (
                <View style={styles.navBadge}>
                  <T style={styles.badgeText}>{badge > 99 ? '99+' : badge}</T>
                </View>
              ) : null}
            </View>
            <T style={[styles.navText, on && { color: C.accent }]}>{n.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
