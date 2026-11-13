import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import React from 'react';
import { Scene } from './Scene';
import { MONTHS } from '../logic/dates';
import { STATUS } from '../logic/rules';
import { C, T, styles } from '../theme';

// ===== REUSABLE: top bar =====
export function TopBar({ sub, onBack, alerts, onBell, top }) {
  return (
    <View style={[styles.top, top ? { paddingTop: Math.max(top + 6, 14) } : null]}>
      {onBack ? (
        <Pressable style={styles.iconBtn} onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={C.ink} />
        </Pressable>
      ) : (
        <View style={styles.logo}>
          <Ionicons name="leaf" size={22} color="#fff" />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.topTitle} numberOfLines={1}>
          ETU <Text style={styles.topTitleB}>Field Visit</Text>
        </Text>
        <T style={styles.topSub} numberOfLines={1}>
          {sub}
        </T>
      </View>
      {onBell ? (
      <Pressable style={styles.iconBtn} onPress={onBell}>
        <Ionicons name="notifications-outline" size={20} color={C.ink} />
        {alerts > 0 && (
          <View style={styles.badge}>
            <T style={styles.badgeText}>{alerts}</T>
          </View>
        )}
      </Pressable>
      ) : null}
    </View>
  );
}

// ===== REUSABLE: hero card with plantation =====
export function Hero({ eyebrow, title, sub, stats, mini }) {
  return (
    <View style={[styles.hero, mini && styles.heroMini]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.sky1} />
            <Stop offset="1" stopColor={C.sky2} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#sky)" />
      </Svg>
      <Scene height={mini ? 84 : 112} />
      <View style={styles.heroTx}>
        <T style={styles.eyebrowGold}>{eyebrow}</T>
        <Text style={[styles.heroTitle, mini && styles.heroTitleMini]}>
          {title}
        </Text>
        {sub ? <T style={styles.hint}>{sub}</T> : null}
      </View>
      <View style={styles.heroStats}>
        {stats.map((s) => (
          <View key={s.l} style={styles.hstat}>
            <View style={[styles.sic, s.tone && TONE_BG[s.tone]]}>
              <Ionicons
                name={s.ic}
                size={15}
                color={s.tone ? TONE_FG[s.tone] : C.accent}
              />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.hstatVal, mini && { fontSize: 19 }]}>
                {s.v}
              </Text>
              <T style={styles.hstatLbl} numberOfLines={1}>
                {s.l}
              </T>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export const TONE_BG = {
  att: { backgroundColor: '#F5E4DC' },
  good: { backgroundColor: '#E4EEDB' },
  mon: { backgroundColor: '#F5EAD2' },
  rnd: { backgroundColor: '#E2EBF1' },
  gold: { backgroundColor: '#F3E9CF' },
  muted: { backgroundColor: '#EBE7DA' },
};
export const TONE_FG = {
  att: '#B4533C',
  good: '#4F7D3C',
  mon: '#A8741F',
  rnd: '#4A7391',
  gold: '#A8812C',
  muted: '#4F564A',
};

// ===== REUSABLE: section card with icon title =====
export function Section({ icon, title, right, children, style }) {
  return (
    <View style={[styles.section, style]}>
      {title ? (
        <View style={styles.sectionHead}>
          <View style={styles.hic}>
            <Ionicons name={icon} size={17} color={C.accent} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={{ flex: 1 }} />
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// ===== REUSABLE: status chip with dot =====
export function Chip({ tone, label, dot }) {
  return (
    <View style={[styles.chip, TONE_BG[tone || 'muted']]}>
      {dot && (
        <View
          style={[
            styles.chipDot,
            { backgroundColor: tone === 'mon' ? C.amber : TONE_FG[tone] },
          ]}
        />
      )}
      <T style={[styles.chipText, { color: TONE_FG[tone || 'muted'] }]}>
        {label}
      </T>
    </View>
  );
}

// ===== REUSABLE: labelled input =====
export function Field({ label, full, multiline, ...props }) {
  return (
    <View style={full ? styles.fieldFull : styles.field}>
      <T style={styles.label}>{label}</T>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        placeholderTextColor="#8A8F80"
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

// ===== REUSABLE: big action button =====
export function CTA({ label, icon, onPress, color }) {
  return (
    <Pressable
      style={[styles.cta, color && { backgroundColor: color }]}
      onPress={onPress}>
      <Ionicons name={icon} size={20} color="#fff" />
      <Text style={styles.ctaText}>{label}</Text>
    </Pressable>
  );
}

export function Empty({ title, text }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <T style={styles.hint}>{text}</T>
    </View>
  );
}

// ===== REUSABLE: Good / Monitor / Action picker =====
export function StatusPicker({ value, onChange }) {
  return (
    <View style={styles.seg}>
      {Object.keys(STATUS).map((k) => {
        const on = value === k;
        const st = STATUS[k];
        return (
          <Pressable
            key={k}
            style={[
              styles.stBtn,
              on && { backgroundColor: TONE_FG[st.tone], borderColor: TONE_FG[st.tone] },
            ]}
            onPress={() => onChange(on ? null : k)}>
            <Ionicons name={st.icon} size={15} color={on ? '#fff' : TONE_FG[st.tone]} />
            <T style={[styles.stText, { color: on ? '#fff' : TONE_FG[st.tone] }]}>
              {st.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

// ===== REUSABLE: horizontal bar (chart) =====
export function Bar({ label, value, max, color, right, marker }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const m = marker !== undefined && max > 0 ? Math.min(100, (marker / max) * 100) : null;
  return (
    <View style={{ gap: 3 }}>
      <View style={styles.barHead}>
        <T style={styles.barLabel} numberOfLines={1}>
          {label}
        </T>
        <T style={[styles.barRight, { color: color }]}>{right}</T>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: w + '%', backgroundColor: color }]} />
        {m !== null && <View style={[styles.barMark, { left: m + '%' }]} />}
      </View>
    </View>
  );
}

// ===== REUSABLE: green date box =====
export function DateBox({ date }) {
  return (
    <View style={styles.dateBox}>
      <Text style={styles.dateBoxBig}>{date && date.length >= 10 ? Number(date.slice(8)) : '–'}</Text>
      <T style={styles.dateBoxSmall}>{date && date.length >= 10 ? MONTHS[Number(date.slice(5, 7)) - 1] : 'no date'}</T>
    </View>
  );
}


export function DeleteBox({ label, button, confirm, setConfirm, onDelete }) {
  if (confirm) {
    return (
      <View style={styles.confirm}>
        <T style={styles.confirmText}>{label}</T>
        <View style={styles.row2}>
          <Pressable style={styles.btnGhost} onPress={() => setConfirm(false)}>
            <T style={styles.bold}>Keep</T>
          </Pressable>
          <Pressable style={styles.btnDanger} onPress={onDelete}>
            <T style={[styles.bold, { color: '#fff' }]}>Delete</T>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <Pressable onPress={() => setConfirm(true)} style={styles.delRow}>
      <Ionicons name="trash-outline" size={16} color={C.att} />
      <T style={{ color: C.att }}>{button}</T>
    </Pressable>
  );
}


export function KV({ label, value }) {
  return (
    <View style={styles.kvItem}>
      <T style={styles.kvLabel}>{label}</T>
      <T style={styles.kvValue} numberOfLines={1}>
        {value}
      </T>
    </View>
  );
}


// =====================================================
// TIDY PAGES: small building blocks
// =====================================================

// One row in a menu list: icon · title / sub · chip · >
export function MenuRow({ icon, title, sub, chip, tone, onPress, last }) {
  return (
    <Pressable style={[styles.menuRow, last && { borderBottomWidth: 0 }]} onPress={onPress}>
      <View style={[styles.menuIc, tone && TONE_BG[tone]]}>
        <Ionicons name={icon} size={19} color={tone ? TONE_FG[tone] : C.accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T style={styles.menuTitle}>{title}</T>
        {sub ? <T style={styles.meta} numberOfLines={1}>{sub}</T> : null}
      </View>
      {chip ? <Chip tone={tone || 'muted'} label={chip} /> : null}
      <Ionicons name="chevron-forward" size={18} color={C.muted} />
    </Pressable>
  );
}

export function Menu({ children }) {
  return <View style={styles.menu}>{children}</View>;
}

// Page title for a section page
export function PageHead({ icon, title, sub, right }) {
  return (
    <View style={styles.pageHead}>
      <View style={styles.hic}>
        <Ionicons name={icon} size={18} color={C.accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.pageTitle}>{title}</Text>
        {sub ? <T style={styles.meta}>{sub}</T> : null}
      </View>
      {right}
    </View>
  );
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <View style={styles.searchBox}>
      <Ionicons name="search" size={18} color={C.muted} />
      <TextInput
        style={styles.searchIn}
        placeholder={placeholder || 'Search'}
        placeholderTextColor="#8A8F80"
        value={value}
        onChangeText={onChange}
      />
      {value ? (
        <Pressable onPress={() => onChange('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={C.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

// Row of filter chips: options = [{ key, label, n }]
export function FilterChips({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.filterRow}>
        {options.map((o) => {
          const on = o.key === value;
          return (
            <Pressable key={o.key} style={[styles.filterChip, on && styles.filterChipOn]} onPress={() => onChange(o.key)}>
              <T style={[styles.filterText, on && { color: '#fff' }]}>
                {o.label}
                {o.n !== undefined ? ' ' + o.n : ''}
              </T>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
