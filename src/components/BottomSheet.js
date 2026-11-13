import React, { useEffect, useRef } from 'react';
import { Animated, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme';

// Sheet that slides up from the bottom. Drag it down (or tap outside, or Back) to close.
// The slide can be caught mid-way: grabbing it stops the animation where it is.
export function BottomSheet({ visible, onClose, children }) {
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(600)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  useEffect(() => {
    if (!visible) return;
    closing.current = false;
    y.setValue(600);
    Animated.parallel([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }),
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible, y, fade]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(y, { toValue: 700, duration: 200, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => y.stopAnimation(),
      onPanResponderMove: (e, g) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (e, g) => {
        if (g.dy > 120 || g.vy > 1.1) closeRef.current();
        else Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 240 }).start();
      },
      onPanResponderTerminate: () =>
        Animated.spring(y, { toValue: 0, useNativeDriver: true }).start(),
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View style={[styles.sheetBg, { opacity: fade }]}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetWrap}
        pointerEvents="box-none">
        <Animated.View
          style={[styles.sheet, { paddingBottom: 18 + insets.bottom, transform: [{ translateY: y }] }]}>
          {/* drag handle area: pull down to close */}
          <View {...pan.panHandlers} style={styles.sheetHandle} hitSlop={{ top: 10, bottom: 10 }}>
            <View style={styles.sheetGrip} />
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
