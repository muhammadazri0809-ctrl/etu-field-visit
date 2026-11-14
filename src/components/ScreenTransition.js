import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

// Each page slides in from the side it comes from (deeper = from the right,
// back = from the left, tab change = fade up). A new page starts its own
// animation straight away, so quick taps are never blocked by a running one.
export function ScreenTransition({ dir, children }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    return () => v.stopAnimation();
  }, [v]);
  const from = dir === 'back' ? -28 : dir === 'push' ? 28 : 0;
  const style = {
    flex: 1,
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [dir === 'tab' ? 0 : 0.4, 1] }),
    transform: [
      { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) },
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dir === 'tab' ? 10 : 0, 0] }) },
    ],
  };
  return <Animated.View style={style}>{children}</Animated.View>;
}
