import React from 'react';
import { Image } from 'expo-image';
import { C } from '../theme';

// Photo with a soft leaf-green placeholder that fades into the picture.
// expo-image decodes the photo at the size it is shown (not full camera size),
// so long lists of thumbnails stay light on memory.
export function Thumb({ uri, style, fit, full }) {
  return (
    <Image
      source={{ uri }}
      style={[{ backgroundColor: C.sunk }, style]}
      contentFit={fit || 'cover'}
      transition={180}
      recyclingKey={uri}
      cachePolicy="memory-disk"
      placeholderContentFit="cover"
      allowDownscaling={!full}
      accessibilityIgnoresInvertColors
    />
  );
}
