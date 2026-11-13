import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CTA, Chip, DateBox, PageHead, Section } from '../components/ui';
import { Dropdown } from '../components/Dropdown';
import { newId, showDate } from '../logic/dates';
import { ESTAT } from '../logic/etu';
import { buildImport, groupsToVisits, parseChat, relink } from '../logic/whatsapp';
import { keepPhoto } from '../storage';
import { pickChatFiles } from '../whatsappFiles';
import { C, T, styles } from '../theme';

// =====================================================
// IMPORT A WHATSAPP CHAT INTO ETU VISITS
// =====================================================
export function WaImportScreen({ estates, fields, onImport, onUpload }) {
  const [chat, setChat] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [fallback, setFallback] = useState(estates.length === 1 ? estates[0].id : null);

  const result = useMemo(() => {
    if (!chat) return null;
    return buildImport(parseChat(chat.text), estates, fields, null, chat.dups);
  }, [chat, estates, fields]);

  const pick = async () => {
    setMsg('');
    setBusy(true);
    try {
      const c = await pickChatFiles();
      if (c) setChat(c);
    } catch (e) {
      setMsg(e.message);
    }
    setBusy(false);
  };

  // estate chosen by hand on a visit card wins over what the chat said
  const [picked, setPicked] = useState({});
  const groups = result
    ? result.groups
        .filter((g) => g.fields.some((f) => f.obs.length))
        .map((g) => (picked[g.key] ? relink({ ...g, estateId: picked[g.key], estateName: '' }, fields) : g))
    : [];
  const allFiles = groups.flatMap((g) => g.fields.flatMap((f) => f.obs.flatMap((o) => o.files)));
  const found = chat ? allFiles.filter((n) => chat.photos[n]).length : 0;
  const noEstate = groups.filter((g) => !g.estateId && !g.estateName).length;
  const newNames = [...new Set(groups.filter((g) => !g.estateId && g.estateName).map((g) => g.estateName))];
  const allF = groups.reduce((n, g) => n + g.fields.length, 0);
  const matchedF = groups.reduce((n, g) => n + g.fields.filter((f) => f.fieldId).length, 0);
  const nObs = groups.reduce((n, g) => n + g.fields.reduce((m, f) => m + f.obs.length, 0), 0);
  const blocked = noEstate > 0 && !fallback;

  const doImport = () => {
    setBusy(true);
    try {
      const kept = {};
      const out = groupsToVisits(groups, {
        estates,
        fallbackEstateId: fallback,
        newId,
        photoUri: (name) => {
          if (!chat.photos[name]) return null;
          if (!kept[name]) kept[name] = keepPhoto(chat.photos[name]);
          return kept[name];
        },
      });
      onImport(out);
    } catch (e) {
      setMsg('Could not import: ' + e.message);
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <PageHead icon="logo-whatsapp" title="Import WhatsApp chat" sub="Observations and photos become ETU visits" />

      {fields.length === 0 ? (
        <Section icon="cloud-upload-outline" title="Upload estate data first">
          <T style={styles.meta}>
            The chat is checked against your estate data: estate names and field codes are matched to the estates and
            fields from your Excel upload. Upload it first so every remark lands on the right field.
          </T>
          <CTA label="UPLOAD ESTATE DATA" icon="cloud-upload" secondary onPress={onUpload} />
        </Section>
      ) : (
        <T style={styles.hint}>
          Matching against your estate data: {estates.length} estates, {fields.length} fields.
        </T>
      )}

      {!chat && (
        <Section icon="information-circle-outline" title="How to export">
          <T style={styles.meta}>
            1. In WhatsApp open the group or chat · tap ⋮ (or the name) · More · Export chat ·{' '}
            <T style={styles.bold}>Include media</T>.{'\n'}
            2. Save it to Files or Google Drive.{'\n'}
            3. Tap the button below and pick the <T style={styles.bold}>.zip</T>, or the{' '}
            <T style={styles.bold}>.txt</T> together with its photos (select several).
          </T>
          <T style={styles.hint}>
            Each line under a field code becomes one observation, e.g. &quot;2016A&quot; then &quot;Delay circle
            raking&quot; and &quot;Spotted strip spraying&quot; on their own lines. Photos go to the remark posted
            nearest in time. Write &quot;Action: …&quot; under a line for its action plan.
          </T>
        </Section>
      )}

      <CTA
        label={busy ? 'READING…' : chat ? 'PICK OTHER FILES' : 'PICK CHAT FILES'}
        icon="document-attach-outline"
        secondary={!!chat}
        onPress={busy ? undefined : pick}
      />
      {busy && <ActivityIndicator color={C.accent} />}
      {msg ? <T style={[styles.hint, { color: C.attInk }]}>{msg}</T> : null}

      {result && (
        <>
          <Section icon="checkmark-done-outline" title="Found in the chat">
            <View style={styles.chips}>
              <Chip tone="muted" label={result.stats.messages + ' messages'} />
              <Chip tone="good" icon="eye" label={nObs + ' observations'} />
              <Chip tone={found < allFiles.length ? 'mon' : 'good'} icon="image" label={found + ' of ' + allFiles.length + ' photos'} />
              <Chip
                tone={matchedF < allF ? 'mon' : 'good'}
                icon="grid"
                label={matchedF + ' of ' + allF + ' fields in estate data'}
              />
              {newNames.length > 0 && (
                <Chip tone="mon" icon="alert-circle" label={newNames.length + ' estate' + (newNames.length === 1 ? '' : 's') + ' not in estate data'} />
              )}
            </View>
            {allFiles.length > found && (
              <T style={styles.hint}>
                {allFiles.length - found} photos are named in the chat but were not picked. Export with &quot;Include
                media&quot;, or pick the photos together with the .txt.
              </T>
            )}
            {(result.stats.deleted > 0 || result.stats.dupPhotos > 0 || result.stats.unplaced > 0) && (
              <T style={styles.hint}>
                {[
                  result.stats.deleted ? result.stats.deleted + ' deleted messages skipped' : '',
                  result.stats.dupPhotos ? result.stats.dupPhotos + ' repeated photos removed' : '',
                  result.stats.unplaced ? result.stats.unplaced + ' photos not near any remark (left out)' : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
                .
              </T>
            )}
            {result.stats.omitted > 0 && (
              <T style={styles.hint}>{result.stats.omitted} media were left out of the export (&quot;Media omitted&quot;).</T>
            )}
            {noEstate > 0 && (
              <Dropdown
                label="Estate for messages that do not name one"
                value={fallback}
                options={estates.map((e) => ({ value: e.id, label: e.name }))}
                onChange={setFallback}
                placeholder="Choose estate"
              />
            )}
          </Section>

          {groups.length === 0 && (
            <Section icon="alert-circle-outline" title="No observations found">
              <T style={styles.meta}>
                The chat was read, but no message looked like an observation. Make sure messages name the estate and
                field, e.g. &quot;Bukit Badak Field 2016A bagworm on lower fronds&quot;.
              </T>
            </Section>
          )}

          {groups.map((g) => (
            <GroupCard
              key={g.key}
              g={g}
              photos={chat.photos}
              estates={estates}
              fallback={fallback}
              onPick={(id) => setPicked({ ...picked, [g.key]: id })}
            />
          ))}

          {groups.length > 0 && (
            <CTA
              label={blocked ? 'CHOOSE AN ESTATE ABOVE' : 'IMPORT ' + groups.length + ' VISIT' + (groups.length === 1 ? '' : 'S')}
              icon="download-outline"
              color={blocked ? C.faint : undefined}
              onPress={blocked || busy ? undefined : doImport}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

function GroupCard({ g, photos, estates, fallback, onPick }) {
  const e = g.estateId ? estates.find((x) => x.id === g.estateId) : null;
  const fb = !g.estateId && !g.estateName ? estates.find((x) => x.id === fallback) : null;
  const name = e ? e.name : g.estateName || (fb ? fb.name : 'Estate not named');
  return (
    <View style={styles.section}>
      <View style={styles.visitHead}>
        <DateBox date={g.date} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rcardTitle}>{name}</Text>
          <View style={styles.chips}>
            {!e && g.estateName ? <Chip tone="mon" icon="alert-circle" label="Not in estate data · new estate" /> : null}
            {!e && !g.estateName ? <Chip tone={fb ? 'muted' : 'att'} label={fb ? 'Chosen estate' : 'Choose estate'} /> : null}
            <Chip tone="muted" label={showDate(g.date)} />
          </View>
        </View>
      </View>
      <Dropdown
        label="Estate for this visit"
        value={g.estateId}
        options={estates.map((x) => ({ value: x.id, label: x.name }))}
        onChange={onPick}
        placeholder={g.estateName ? 'New estate: ' + g.estateName : 'Choose estate'}
      />
      {g.fields
        .filter((f) => f.obs.length)
        .map((f) => (
          <View key={f.code} style={styles.waField}>
            <View style={styles.rowBetween}>
              <T style={styles.bold}>{f.code === 'GENERAL' ? 'General (no field named)' : 'Field ' + f.code}</T>
              {!f.fieldId && f.code !== 'GENERAL' ? <Chip tone="mon" label="Not in estate data" /> : null}
            </View>
            {f.obs.map((o, i) => (
              <View key={i} style={styles.waObs}>
                <View style={styles.chips}>
                  <Chip tone={ESTAT[o.status].tone} icon={ESTAT[o.status].icon} label={ESTAT[o.status].short} />
                  <Chip tone="muted" label={o.category} />
                </View>
                {o.issue ? <T style={styles.meta} numberOfLines={3}>{o.issue}</T> : null}
                {o.action ? (
                  <T style={styles.hint} numberOfLines={2}>
                    Action: {o.action}
                  </T>
                ) : null}
                {o.files.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.photoRow}>
                      {o.files.map((n) =>
                        photos[n] ? (
                          <Image key={n} source={{ uri: photos[n] }} style={styles.thumbS} />
                        ) : (
                          <View key={n} style={[styles.thumbS, styles.thumbMissing]}>
                            <Ionicons name="image-outline" size={18} color={C.faint} />
                          </View>
                        )
                      )}
                    </View>
                  </ScrollView>
                )}
              </View>
            ))}
          </View>
        ))}
    </View>
  );
}
