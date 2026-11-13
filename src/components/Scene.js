import Svg, { G, Path } from 'react-native-svg';
import React from 'react';
import { C, PALM, styles } from '../theme';

function n1(v) {
  return v.toFixed(1);
}

function palm(x, by, h, k, lean) {
  const cx = x + lean;
  const cy = by - h;
  const r = h * 0.55;
  const tw = Math.max(1.2, h * 0.07);
  const D = [
    [-1, -0.15], [-0.85, 0.3], [-0.5, -0.55],
    [-0.1, -0.8], [0.35, -0.65], [0.8, 0.25],
    [1, -0.1], [-0.55, 0.55], [0.55, 0.55],
  ];
  let f = '';
  D.forEach(([dx, dy]) => {
    const L = Math.hypot(dx, dy);
    const ux = dx / L;
    const uy = dy / L;
    const tx = cx + ux * r;
    const ty = cy + uy * r + r * 0.28;
    const mx = (cx + tx) / 2;
    const my = (cy + ty) / 2 - r * 0.12;
    const w = r * 0.13;
    f +=
      'M' + n1(cx) + ' ' + n1(cy) +
      'Q' + n1(mx - uy * w) + ' ' + n1(my + ux * w) +
      ' ' + n1(tx) + ' ' + n1(ty) +
      'Q' + n1(mx + uy * w) + ' ' + n1(my - ux * w) +
      ' ' + n1(cx) + ' ' + n1(cy) + 'Z';
  });
  const trunk =
    'M' + x + ' ' + by +
    'Q' + n1(x + lean * 0.3) + ' ' + n1(by - h * 0.5) +
    ' ' + n1(cx) + ' ' + n1(cy);
  return { trunk: trunk, fronds: f, k: k, tw: tw };
}

const BACK_PALMS = [];
for (let x = -6; x < 410; x += 23) {
  BACK_PALMS.push(palm(x, 92 + ((x / 23) % 2) * 2, 26, 1, ((x * 7) % 5) - 2));
}
const MID_PALMS = [];
for (let x = 10; x < 410; x += 46) {
  MID_PALMS.push(palm(x, 110, 44, 2, ((x * 3) % 7) - 3));
}
const FRONT_PALMS = [palm(4, 134, 58, 3, 6), palm(396, 134, 54, 3, -6)];

function PalmGroup({ list }) {
  return list.map((p, i) => (
    <G key={i}>
      <Path
        d={p.trunk}
        stroke={PALM[p.k]}
        strokeWidth={p.tw}
        fill="none"
        strokeLinecap="round"
      />
      <Path d={p.fronds} fill={PALM[p.k]} />
    </G>
  ));
}

export function Scene({ height }) {
  return (
    <Svg
      width="100%"
      height={height}
      viewBox="0 0 400 130"
      preserveAspectRatio="xMidYMax slice"
      style={styles.scene}>
      <Path
        d="M0 78 Q70 52 150 70 T300 62 T400 70 V130 H0z"
        fill={C.hill}
      />
      <PalmGroup list={BACK_PALMS} />
      <Path d="M0 96 Q200 88 400 96 V130 H0z" fill={C.soil} />
      <PalmGroup list={MID_PALMS} />
      <Path d="M0 112 Q200 106 400 112 V130 H0z" fill={C.soil2} />
      <Path d="M150 130 L196 108 L204 108 L250 130z" fill={C.road} />
      <PalmGroup list={FRONT_PALMS} />
    </Svg>
  );
}
