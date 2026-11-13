import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import * as DocumentPicker from 'expo-document-picker';
import { Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import { CTA, Chip, Hero, KV, Section, TONE_BG } from '../components/ui';
import { applyImport, readRows, templateHeader, textToRows } from '../logic/importRows';
import { isReportWorkbook, readReportWorkbook, reportItems } from '../logic/reportWorkbook';
import { C, T, styles } from '../theme';

// =====================================================
// UPLOAD SCREEN: pick Excel/CSV or paste from Excel
// =====================================================
export function UploadScreen({ estates, fields, onImport, onDone }) {
  const [paste, setPaste] = useState('');
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [replace, setReplace] = useState(false);

  // Read the first sheet that has Estate + Field columns
  const readWorkbook = (wb) => {
    // A full estate report (Performance + Cost sheets): read it all
    if (isReportWorkbook(wb)) return readReportWorkbook(wb);
    let best = null;
    wb.SheetNames.forEach((n) => {
      if (best && !best.error) return;
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' });
      const r = readRows(rows);
      if (!best || !r.error) best = { ...r, sheet: n };
    });
    if (best && best.error) {
      best.error += '\nSheets in file: ' + wb.SheetNames.join(', ');
    }
    return best || { error: 'The file has no sheets.' };
  };

  const pickFile = async () => {
    setDone(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      setBusy(true);
      setFileName(asset.name || 'file');
      let wb;
      if (asset.file) {
        // web preview
        const buf = await asset.file.arrayBuffer();
        wb = XLSX.read(buf, { type: 'array' });
      } else {
        // phone: read the file as base64
        const b64 = await readAsBase64(asset.uri);
        if (!b64) throw new Error('the file looks empty (0 bytes). Save it again and retry.');
        wb = XLSX.read(b64, { type: 'base64' });
      }
      setResult(readWorkbook(wb));
    } catch (e) {
      setResult({ error: 'Could not read the file: ' + e.message });
    }
    setBusy(false);
  };

  const readPaste = () => {
    setDone(null);
    setFileName('Pasted data');
    if (!paste.trim()) {
      setResult({ error: 'The paste box is empty. To upload a file, use PICK EXCEL / CSV FILE above.' });
      return;
    }
    setResult(readRows(textToRows(paste)));
  };

  const doImport = () => {
    const out = applyImport(result.rows, estates, fields, replace);
    const items = result.report ? reportItems(result, out.estates, out.fields) : null;
    onImport(out.estates, out.fields, items);
    setDone({ ...out, nv: items ? items.visits.length : 0, na: items ? items.actions.length : 0 });
    setResult(null);
    setPaste('');
  };

  const shareTemplate = async () => {
    try {
      await Share.share({ message: templateHeader() });
    } catch (_e) {
      // ignore
    }
  };

  const ests = result && result.rows ? [...new Set(result.rows.map((r) => r.estate))] : [];

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Hero
        mini
        eyebrow="Upload estate data"
        title="Excel, CSV or paste"
        sub="One row per field. The app finds the columns by name."
        stats={[
          { ic: 'business', v: String(estates.length), l: 'Estates' },
          { ic: 'grid', v: String(fields.length), l: 'Fields' },
          { ic: 'document-text', v: 'xlsx', l: 'csv · paste', tone: 'rnd' },
        ]}
      />

      {done && (
        <View style={[styles.result, TONE_BG.good]}>
          <Ionicons name="checkmark-circle" size={22} color={C.good} />
          <View style={{ flex: 1, gap: 6 }}>
            <T style={[styles.bold, { color: C.goodInk }]}>
              Imported: {done.newE} new estates, {done.newF} new fields, {done.updF} fields updated
              {done.delE + done.delF > 0 ? ', ' + done.delE + ' estates and ' + done.delF + ' fields removed' : ''}
              {done.nv || done.na ? ', ' + done.nv + ' visits and ' + done.na + ' follow-ups added' : ''}.
            </T>
            <Pressable onPress={onDone}>
              <T style={styles.link}>Go to Home</T>
            </Pressable>
          </View>
        </View>
      )}

      <Section icon="cloud-upload-outline" title="1. Upload a file">
        <T style={styles.hint}>Excel (.xlsx / .xls) or CSV from your phone, Drive or email.</T>
        <CTA label={busy ? 'READING…' : 'PICK EXCEL / CSV FILE'} icon="document-attach" onPress={pickFile} />
      </Section>

      <Section icon="clipboard-outline" title="Or paste from Excel">
        <T style={styles.hint}>Select the cells in Excel (with the header row), copy, and paste here.</T>
        <TextInput
          style={[styles.input, styles.pasteBox]}
          multiline
          placeholder={'Estate\tField\tMature ha\tYield Act ...'}
          placeholderTextColor={C.faint}
          value={paste}
          onChangeText={setPaste}
        />
        <CTA label="READ PASTED DATA" icon="reader-outline" secondary onPress={readPaste} />
      </Section>

      {result && result.error && (
        <View style={[styles.result, TONE_BG.att]}>
          <Ionicons name="alert-circle" size={22} color={C.att} />
          <T style={[styles.resultText, { color: C.att, flex: 1 }]}>{result.error}</T>
        </View>
      )}

      {result && result.rows && (
        <Section icon="eye-outline" title="2. Check before import">
          <T style={styles.meta}>
            {fileName}
            {result.sheet ? ' · sheet "' + result.sheet + '"' : ''}
          </T>
          <View style={styles.kv}>
            <KV label="Rows (fields)" value={String(result.rows.length)} />
            <KV label="Estates" value={String(ests.length)} />
            <KV label="Skipped rows" value={String(result.skipped)} />
            <KV label={result.report ? 'Sheets read' : 'Columns read'} value={String(result.found.length)} />
            {result.report && <KV label="Fields with cost" value={String(result.costFields)} />}
            {result.report && <KV label="Visits (PMU, agronomist)" value={String(result.visits.length)} />}
            {result.report && <KV label="Follow-ups (Mission 1)" value={String(result.actions.length)} />}
          </View>
          <T style={styles.kvLabel}>{result.report ? 'Sheets used' : 'Columns recognised'}</T>
          <View style={styles.chips}>
            {result.found.map((c) => (
              <Chip key={c} tone="good" label={c} />
            ))}
          </View>
          {result.ignored.length > 0 && (
            <>
              <T style={styles.kvLabel}>Not used</T>
              <View style={styles.chips}>
                {result.ignored.map((c, i) => (
                  <Chip key={i} tone="muted" label={String(c)} />
                ))}
              </View>
            </>
          )}
          <T style={styles.kvLabel}>First rows</T>
          {result.rows.slice(0, 6).map((r, i) => (
            <View key={i} style={styles.readRow}>
              <T style={[styles.bold, { width: 90 }]} numberOfLines={1}>{r.estate}</T>
              <T style={[styles.bold, { width: 44 }]}>{r.code}</T>
              <T style={[styles.meta, { flex: 1 }]} numberOfLines={1}>
                {(r.ha || '-') + ' ha · yield ' + (r.ypAct || '-') + ' / ' + (r.ypBgt || '-') + ' · ' + Object.keys(r.costs).length + ' costs'}
              </T>
            </View>
          ))}
          <Pressable style={[styles.switchRow, replace && styles.switchRowOn]} onPress={() => setReplace(!replace)}>
            <Ionicons name={replace ? 'checkbox' : 'square-outline'} size={22} color={replace ? C.att : C.accent} />
            <View style={{ flex: 1 }}>
              <T style={styles.bold}>Replace all data</T>
              <T style={styles.meta}>
                {replace
                  ? 'Estates and fields NOT in this file will be removed (with their visits and follow-ups). Matching ones keep their history.'
                  : 'Off: merge. Same estate/field is updated, others are kept. Blank cells keep the old value.'}
              </T>
            </View>
          </Pressable>
          <CTA
            label={(replace ? 'REPLACE WITH ' : 'IMPORT ') + result.rows.length + ' FIELDS'}
            icon="checkmark-done"
            color={replace ? C.att : C.good}
            onPress={doImport}
          />
        </Section>
      )}

      <Section icon="help-circle-outline" title="File format">
        <T style={styles.meta}>
          Needed: <T style={styles.bold}>Estate</T>, <T style={styles.bold}>Field</T>.
          {'\n'}Optional: Region, SOU, Planted, Mature ha, Yield Act, Yield Bgt, Yield LY, Profit Act, Profit Bgt (RM'000, estate level), and for each of the 12 cost elements {'"<Element> Act"'} and {'"<Element> Bgt"'} (RM/ha), e.g. "Manuring Act", "Manuring Bgt".
        </T>
        <CTA label="SHARE TEMPLATE HEADER ROW" icon="share-outline" secondary onPress={shareTemplate} />
      </Section>
    </ScrollView>
  );
}

// Read a picked file on the phone as base64 text
async function readAsBase64(uri) {
  // 1st try: Expo file system (most reliable on Android)
  try {
    const b64 = await new File(uri).base64();
    if (b64) return b64;
  } catch (_e) {
    // fall back below
  }
  // 2nd try: fetch + FileReader
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error('cannot open file'));
    r.readAsDataURL(blob);
  });
}
