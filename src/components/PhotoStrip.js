import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, T, styles } from '../theme';
import { Thumb } from './Thumb';
import { forgetPhoto, keepPhoto } from '../storage';

// =====================================================
// PHOTOS: take or pick, show thumbnails, tap to view
// =====================================================
export function PhotoStrip({ photos, onChange, readOnly }) {
  const [view, setView] = useState(null);
  const [msg, setMsg] = useState('');
  const list = photos || [];

  const add = async (camera) => {
    setMsg('');
    try {
      if (camera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setMsg('Camera permission is needed to take photos.');
          return;
        }
      }
      const opts = { mediaTypes: ['images'], quality: 0.4, allowsEditing: false };
      const res = camera
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled) return;
      // copy out of the cache folder so the photo is not lost later
      onChange([...list, ...res.assets.map((a) => keepPhoto(a.uri))]);
    } catch (e) {
      setMsg(camera ? 'Camera is not available here. Use Gallery.' : 'Could not open photos: ' + e.message);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      {list.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.photoRow}>
            {list.map((uri, i) => (
              <Pressable key={uri + i} onPress={() => setView(uri)}>
                <Thumb uri={uri} style={styles.thumb} />
                {!readOnly && (
                  <Pressable
                    style={styles.thumbX}
                    hitSlop={8}
                    onPress={() => {
                      onChange(list.filter((x, j) => j !== i));
                      forgetPhoto(uri);
                    }}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
      {!readOnly && (
        <View style={styles.row2}>
          <Pressable style={styles.photoBtn} onPress={() => add(true)}>
            <Ionicons name="camera" size={17} color={C.accent} />
            <T style={styles.photoBtnText}>Camera</T>
          </Pressable>
          <Pressable style={styles.photoBtn} onPress={() => add(false)}>
            <Ionicons name="images" size={17} color={C.accent} />
            <T style={styles.photoBtnText}>Gallery</T>
          </Pressable>
        </View>
      )}
      {msg ? <T style={styles.hint}>{msg}</T> : null}
      <Modal visible={!!view} transparent animationType="fade" onRequestClose={() => setView(null)}>
        <Pressable style={styles.photoView} onPress={() => setView(null)}>
          {view && <Thumb uri={view} style={styles.photoBig} fit="contain" full />}
          <T style={styles.photoClose}>Tap to close</T>
        </Pressable>
      </Modal>
    </View>
  );
}
