import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { C } from '../theme';

// Warm off-white page with one very faint sand glow at the top (Earthy Minimal)
export function Backdrop() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 860">
      <Defs>
        <RadialGradient id="bdSand" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={C.sand} stopOpacity={0.35} />
          <Stop offset="1" stopColor={C.sand} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="400" height="860" fill={C.page} />
      <Circle cx="360" cy="40" r="260" fill="url(#bdSand)" />
    </Svg>
  );
}
