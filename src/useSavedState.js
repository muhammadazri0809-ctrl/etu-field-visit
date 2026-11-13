import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for everything the app saves on the phone
export const KEYS = {
  estates: 'v3-estates',
  fields: 'v3-fields',
  visits: 'v3-visits',
  actions: 'v3-actions',
  settings: 'v5-settings',
  sel: 'v6-lookup',
  etu: 'v8-etu',
};

// ===== HELPER: state that saves itself =====
// Returns [value, setValue, { ready, error }].
// - ready: the saved value has been read (show the app only after this)
// - error: a message to show the user when reading or saving failed
// If the saved text cannot be read, it is copied to "<key>-damaged" and never
// overwritten, so nothing is lost silently.
export function useSavedState(key, startValue) {
  const [value, setValue] = useState(startValue);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const canSave = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      let saved = null;
      try {
        saved = await AsyncStorage.getItem(key);
      } catch (_e) {
        try {
          saved = await AsyncStorage.getItem(key); // one retry
        } catch (e2) {
          // Could not read: do NOT save over the stored data
          if (alive) {
            setError('Could not read saved data (' + key + '). Changes will not be saved. Restart the app. ' + e2.message);
            setReady(true);
          }
          return;
        }
      }
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (alive) setValue(parsed);
        } catch (_e) {
          try {
            await AsyncStorage.setItem(key + '-damaged', saved);
          } catch (_e2) {
            // ignore: best effort copy
          }
          if (alive) setError('Some saved data (' + key + ') was damaged. A copy was kept; starting this part empty.');
        }
      }
      canSave.current = true;
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [key]);

  useEffect(() => {
    if (!ready || !canSave.current) return;
    AsyncStorage.setItem(key, JSON.stringify(value)).catch((e) => {
      setError('Could not save data (' + key + '): ' + e.message + '. Phone storage may be full.');
    });
  }, [key, value, ready]);

  return [value, setValue, { ready, error }];
}
