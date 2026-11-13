import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { C } from '../theme';

// Soft glow: a circle that fades out to nothing (looks like a blurred blob)
function Glow({ id, color, opacity }) {
  return (
    <RadialGradient id={id} cx="50%" cy="50%" r="50%">
      <Stop offset="0" stopColor={color} stopOpacity={opacity} />
      <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.45} />
      <Stop offset="1" stopColor={color} stopOpacity="0" />
    </RadialGradient>
  );
}

// One palm frond (for the faint leaves in the corners)
const FROND =
  'M0 0 Q40 -18 92 -6 Q60 -2 36 6 Q20 10 0 0Z ' +
  'M0 0 Q30 -46 78 -64 Q52 -36 32 -16 Q16 -4 0 0Z ' +
  'M0 0 Q-8 -50 18 -92 Q14 -52 8 -26 Q4 -8 0 0Z';

// Full-screen nature background that sits behind the glass cards
export function Backdrop() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 860">
      <Defs>
        <LinearGradient id="bdSky" x1="0" y1="0" x2="0.35" y2="1">
          <Stop offset="0" stopColor={C.mint} />
          <Stop offset="0.5" stopColor={C.sage} />
          <Stop offset="1" stopColor={C.sand} />
        </LinearGradient>
        <Glow id="gLeaf" color="#7DBB86" opacity={0.55} />
        <Glow id="gRiver" color="#7CC3C4" opacity={0.45} />
        <Glow id="gSun" color="#F2CB7E" opacity={0.5} />
        <Glow id="gMoss" color="#A9C97A" opacity={0.5} />
      </Defs>
      <Rect width="400" height="860" fill="url(#bdSky)" />
      <Circle cx="40" cy="90" r="210" fill="url(#gLeaf)" />
      <Circle cx="390" cy="330" r="200" fill="url(#gRiver)" />
      <Circle cx="30" cy="640" r="220" fill="url(#gSun)" />
      <Circle cx="360" cy="820" r="230" fill="url(#gMoss)" />
      <G opacity={0.1} fill={C.brand}>
        <Path d={FROND} transform="translate(392 150) scale(-1.5 1.5)" />
        <Path d={FROND} transform="translate(8 860) scale(1.7 1.7)" />
      </G>
    </Svg>
  );
}
