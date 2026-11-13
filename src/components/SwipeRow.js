import React, { useRef } from 'react';
import { Animated, PanResponder, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T, styles } from '../theme';

const OPEN = 96; // width of the Delete button
const FULL = 190; // swipe this far to delete straight away

// Swipe a row left or right to show Delete. Swipe far, or tap Delete, to delete.
// The screen shows an Undo bar afterwards, so nothing is lost by accident.
export function SwipeRow({ children, onDelete, label }) {
  const x = useRef(new Animated.Value(0)).current;
  const pos = useRef(0);

  const snap = (to) => {
    pos.current = to;
    Animated.spring(x, { toValue: to, useNativeDriver: true, bounciness: 4 }).start();
  };
  const remove = (dir) => {
    Animated.timing(x, { toValue: dir * 600, duration: 180, useNativeDriver: true }).start(() => {
      pos.current = 0;
      x.setValue(0);
      onDelete();
    });
  };

  const pan = useRef(
    PanResponder.create({
      // only take over for a clear sideways drag, so scrolling and taps still work
      // "Capture" lets the row take the gesture from the card's own tap handler
      onMoveShouldSetPanResponderCapture: (e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (e, g) => x.setValue(pos.current + g.dx),
      onPanResponderRelease: (e, g) => {
        const v = pos.current + g.dx;
        if (Math.abs(v) > FULL || Math.abs(g.vx) > 1.6) remove(v > 0 ? 1 : -1);
        else if (Math.abs(v) > OPEN * 0.6) snap(v > 0 ? OPEN : -OPEN);
        else snap(0);
      },
      onPanResponderTerminate: () => snap(0),
    })
  ).current;

  // which side is showing decides where the Delete button sits
  const leftOpacity = x.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const rightOpacity = x.interpolate({ inputRange: [-1, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const DelBtn = ({ side, opacity }) => (
    <Animated.View style={[styles.swipeAct, side === 'left' ? { left: 0 } : { right: 0 }, { opacity }]}>
      <Pressable
        style={styles.swipeBtn}
        onPress={() => remove(side === 'left' ? 1 : -1)}
        accessibilityLabel={'Delete ' + (label || '')}>
        <Ionicons name="trash" size={22} color="#fff" />
        <T style={styles.swipeText}>Delete</T>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={styles.swipeWrap}>
      <DelBtn side="left" opacity={leftOpacity} />
      <DelBtn side="right" opacity={rightOpacity} />
      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

// Bar at the bottom: "Visit deleted · UNDO"
export function UndoBar({ text, onUndo }) {
  return (
    <View style={styles.undoBar}>
      <Ionicons name="trash-outline" size={18} color="#fff" />
      <T style={styles.undoText}>{text}</T>
      <Pressable onPress={onUndo} hitSlop={10}>
        <T style={styles.undoBtn}>UNDO</T>
      </Pressable>
    </View>
  );
}

