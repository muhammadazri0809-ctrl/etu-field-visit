import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { styles } from '../theme';

// Gently pulsing grey block, shaped like the content that is coming
export function Bone({ style }) {
  const o = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 0.9, duration: 650, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return <Animated.View style={[styles.bone, style, { opacity: o }]} />;
}

// Placeholder page shown while saved data and fonts load
export function SkeletonPage() {
  return (
    <View style={styles.page}>
      <View style={styles.sumCard}>
        <Bone style={{ width: '45%', height: 12 }} />
        <Bone style={{ width: '75%', height: 26 }} />
        <View style={styles.kpiGrid}>
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} style={{ width: '48.5%', height: 64, borderRadius: 16 }} />
          ))}
        </View>
      </View>
      <Bone style={{ height: 56, borderRadius: 18 }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.card, { paddingVertical: 16 }]}>
          <Bone style={{ width: 48, height: 48, borderRadius: 14 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <Bone style={{ width: '60%', height: 16 }} />
            <Bone style={{ width: '85%', height: 12 }} />
          </View>
        </View>
      ))}
    </View>
  );
}
