import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, useFonts } from '@expo-google-fonts/barlow-condensed';
import { PublicSans_400Regular, PublicSans_600SemiBold, PublicSans_700Bold } from '@expo-google-fonts/public-sans';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, StatusBar, View } from 'react-native';
import { Backdrop } from './components/Backdrop';
import { BottomNav } from './components/BottomNav';
import { TopBar } from './components/ui';
import { newId, showDate, today } from './logic/dates';
import { newObs, syncEtuActions } from './logic/etu';
import { exampleData } from './logic/exampleData';
import { applySettings, isOverdue } from './logic/rules';
import { AlertsScreen } from './screens/AlertsScreen';
import { EstateScreen } from './screens/EstateScreen';
import { EstatesScreen } from './screens/EstatesScreen';
import { EtuFieldScreen, EtuListScreen, EtuObsScreen } from './screens/EtuScreens';
import { EtuVisitScreen } from './screens/EtuVisitScreen';
import { FieldScreen } from './screens/FieldScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LookupScreen } from './screens/LookupScreen';
import { MoreScreen } from './screens/MoreScreen';
import { ProfitScreen } from './screens/ProfitScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { UploadScreen } from './screens/UploadScreen';
import { VisitScreen } from './screens/VisitScreen';
import { WaImportScreen } from './screens/WaImportScreen';
import { UndoBar } from './components/SwipeRow';
import { C, T, styles } from './theme';
import { KEYS, useSavedState } from './useSavedState';
import { clearPhotos } from './storage';

// =====================================================
// MAIN APP
// =====================================================
// Keeps the app clear of the phone's status bar and Back / Home buttons
export default function Root() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

function App() {
  const insets = useSafeAreaInsets();
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    PublicSans_400Regular,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
  });
  const [estates, setEstates, sEstates] = useSavedState(KEYS.estates, []);
  const [fields, setFields, sFields] = useSavedState(KEYS.fields, []);
  const [visits, setVisits, sVisits] = useSavedState(KEYS.visits, []);
  const [actions, setActions, sActions] = useSavedState(KEYS.actions, []);
  const [settings, setSettings, sSettings] = useSavedState(KEYS.settings, {});
  const [sel, setSel, sSel] = useSavedState(KEYS.sel, {});
  const [etu, setEtu, sEtu] = useSavedState(KEYS.etu, []);
  const stores = [sEstates, sFields, sVisits, sActions, sSettings, sSel, sEtu];
  const dataReady = stores.every((x) => x.ready);
  const storeError = stores.map((x) => x.error).find(Boolean);
  // Page history: the last page is the one on screen.
  // Always update from the latest stack (prev), so two quick taps never lose a step.
  const [stack, setStack] = useState([{ name: 'home' }]);
  const screen = stack[stack.length - 1];
  const go = (s) => setStack((prev) => [...prev, s]);
  const goBack = (n = 1) =>
    setStack((prev) => (prev.length > n ? prev.slice(0, -n) : prev.slice(0, 1)));
  const goHome = () => setStack([{ name: 'home' }]);
  const goTab = (k) => setStack([{ name: k }]);

  // Phone back button = previous page; from another tab go Home first; close only from Home
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        setStack((prev) => prev.slice(0, -1));
        return true;
      }
      if (stack[0].name !== 'home') {
        setStack([{ name: 'home' }]);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack]);

  // Undo bar after deleting a visit, and short notices (e.g. after an import)
  const [undo, setUndo] = useState(null);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!undo && !notice) return undefined;
    const t = setTimeout(() => {
      setUndo(null);
      setNotice('');
    }, 6000);
    return () => clearTimeout(t);
  }, [undo, notice]);

  // Use the limits from Settings for all triggers (only when Settings change)
  useMemo(() => applySettings(settings), [settings]);

  if ((!fontsLoaded && !fontError) || !dataReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  // tab = a section page, no tab = the estate / field menu page
  const openEstate = (id, tab) => go({ name: 'estate', id: id, tab: tab || null });
  const openField = (id, tab) => go({ name: 'field', id: id, tab: tab || null });
  const openVisit = (id) => go({ name: 'visit', id: id });

  // All list updates use the latest saved list (prev), so quick edits never overwrite each other
  const save = (setList) => (item) =>
    setList((prev) => prev.map((x) => (x.id === item.id ? item : x)));
  const saveEstate = save(setEstates);
  const saveField = save(setFields);
  const saveVisit = save(setVisits);
  const saveAction = save(setActions);
  const addAction = (a) => setActions((prev) => [a, ...prev]);
  const deleteAction = (id) => setActions((prev) => prev.filter((x) => x.id !== id));
  const addField = (f) => setFields((prev) => [...prev, f]);

  // ----- ETU field visits -----
  const saveEtu = (v) => {
    setEtu((prev) => prev.map((x) => (x.id === v.id ? v : x)));
    setActions((prev) => syncEtuActions(v, prev));
  };
  // Delete a visit (and its follow-ups) but keep a copy for Undo
  const deleteEtu = (id) => {
    const v = etu.find((x) => x.id === id);
    if (!v) return;
    const key = 'etu-' + v.id + '-';
    setUndo({ visit: v, actions: actions.filter((a) => a.id.startsWith(key)) });
    setEtu((prev) => prev.filter((x) => x.id !== id));
    setActions((prev) => prev.filter((a) => !a.id.startsWith(key)));
  };
  const undoDelete = () => {
    if (!undo) return;
    setEtu((prev) => [undo.visit, ...prev]);
    setActions((prev) => [...undo.actions, ...prev]);
    setUndo(null);
  };

  const newEtu = (estateId, fieldId) => {
    const last = [...etu].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    const f = fieldId && fields.find((x) => x.id === fieldId);
    const v = {
      id: newId(), estateId: estateId || null, date: today(), visitedBy: last ? last.visitedBy || '' : '',
      fields: f ? [{ id: newId(), fieldId: f.id, code: f.code, obs: [] }] : [], notes: '', status: 'draft',
    };
    setEtu((prev) => [v, ...prev]);
    go({ name: 'etuvisit', id: v.id });
  };

  // Start a visit (optionally with fields already ticked)
  const newVisit = (estateId, fieldIds) => {
    const v = { id: newId(), estateId: estateId, date: today(), fieldIds: fieldIds || [], checks: {} };
    setVisits((prev) => [v, ...prev]);
    openVisit(v.id);
  };
  const common = {
    estates, fields, visits, actions, etu,
    onSaveAction: saveAction,
    onDeleteAction: deleteAction,
    onOpenEstate: openEstate,
    onOpenField: openField,
    onOpenVisit: openVisit,
  };

  let body = null;
  let sub = 'Fields · Triggers · Follow-up · Cost';
  const back = stack.length > 1 ? () => goBack() : null;

  if (screen.name === 'estate') {
    const e = estates.find((x) => x.id === screen.id);
    if (!e) return null;
    sub = e.name + (screen.tab ? ' · ' + screen.tab : '');
    body = (
      <EstateScreen
        key={e.id + (screen.tab || '')}
        {...common}
        estate={e}
        tab={screen.tab}
        onChange={saveEstate}
        onAddField={addField}
        onNewVisit={() => newVisit(e.id, [])}
        onNewEtu={() => newEtu(e.id)}
        onOpenEtu={() => go({ name: 'etu', estateId: e.id })}
        onDelete={() => {
          setEtu((prev) => prev.filter((x) => x.estateId !== e.id));
          setEstates((prev) => prev.filter((x) => x.id !== e.id));
          setFields((prev) => prev.filter((f) => f.estateId !== e.id));
          setVisits((prev) => prev.filter((v) => v.estateId !== e.id));
          setActions((prev) => prev.filter((a) => a.estateId !== e.id));
          goHome();
        }}
      />
    );
  } else if (screen.name === 'field') {
    const f = fields.find((x) => x.id === screen.id);
    const e = f && estates.find((x) => x.id === f.estateId);
    if (!f || !e) return null;
    sub = e.name + ' · Field ' + f.code + (screen.tab ? ' · ' + screen.tab : '');
    body = (
      <FieldScreen
        key={f.id + (screen.tab || '')}
        {...common}
        field={f}
        estate={e}
        tab={screen.tab}
        onChange={saveField}
        onNewVisit={() => newEtu(e.id, f.id)}
        onDelete={() => {
          setFields((prev) => prev.filter((x) => x.id !== f.id));
          setActions((prev) => prev.filter((a) => a.fieldId !== f.id));
          goBack(2);
        }}
      />
    );
  } else if (screen.name === 'visit') {
    const v = visits.find((x) => x.id === screen.id);
    const e = v && estates.find((x) => x.id === v.estateId);
    if (!v || !e) return null;
    sub = e.name + ' · ' + (v.title || 'Visit') + ' · ' + showDate(v.date);
    body = (
      <VisitScreen
        {...common}
        visit={v}
        estate={e}
        estateFields={fields.filter((f) => f.estateId === e.id)}
        onChange={saveVisit}
        onAddAction={addAction}
        onAddField={addField}
        onDelete={() => {
          setVisits((prev) => prev.filter((x) => x.id !== v.id));
          setActions((prev) => prev.filter((a) => a.visitId !== v.id));
          goBack();
        }}
      />
    );
  } else if (screen.name === 'etu') {
    sub = 'ETU field visit';
    body = (
      <EtuListScreen
        {...common}
        estateId={screen.estateId}
        onNew={(eid) => newEtu(eid)}
        onOpen={(id) => go({ name: 'etuvisit', id: id })}
        onImportWa={() => go({ name: 'waimport' })}
        onDelete={deleteEtu}
      />
    );
  } else if (screen.name === 'waimport') {
    sub = 'Visits · Import WhatsApp chat';
    body = (
      <WaImportScreen
        estates={estates}
        fields={fields}
        onImport={(out) => {
          if (out.newEstates.length) setEstates((prev) => [...prev, ...out.newEstates]);
          setEtu((prev) => [...out.visits, ...prev]);
          setActions((prev) => out.visits.reduce((acc, v) => syncEtuActions(v, acc), prev));
          setNotice(
            out.visits.length + ' visit' + (out.visits.length === 1 ? '' : 's') + ' imported · ' + out.attached + ' photos'
          );
          goBack();
        }}
      />
    );
  } else if (screen.name === 'etuvisit') {
    const v = etu.find((x) => x.id === screen.id);
    if (!v) return null;
    const e = estates.find((x) => x.id === v.estateId);
    sub = 'ETU visit · ' + (e ? e.name + ' · ' : '') + showDate(v.date);
    body = (
      <EtuVisitScreen
        {...common}
        visit={v}
        key={v.id}
        onChange={saveEtu}
        onClose={() => goBack()}
        onOpenField={(fid) => go({ name: 'etufield', vid: v.id, fid: fid })}
        onDelete={() => {
          setEtu((prev) => prev.filter((x) => x.id !== v.id));
          setActions((prev) => prev.filter((a) => !a.id.startsWith('etu-' + v.id + '-')));
          goBack();
        }}
      />
    );
  } else if (screen.name === 'etufield' || screen.name === 'etuobs') {
    const v = etu.find((x) => x.id === screen.vid);
    const vf = v && (v.fields || []).find((x) => x.id === screen.fid);
    if (!v || !vf) return null;
    const saveVf = (nf) => saveEtu({ ...v, fields: v.fields.map((x) => (x.id === nf.id ? nf : x)) });
    if (screen.name === 'etufield') {
      sub = 'ETU visit · Field ' + vf.code;
      body = (
        <EtuFieldScreen
          {...common}
          visit={v}
          vf={vf}
          onOpenObs={(oid) => go({ name: 'etuobs', vid: v.id, fid: vf.id, oid: oid })}
          onAddObs={() => {
            const o = newObs();
            saveVf({ ...vf, obs: [...(vf.obs || []), o] });
            go({ name: 'etuobs', vid: v.id, fid: vf.id, oid: o.id });
          }}
          onDelete={() => {
            saveEtu({ ...v, fields: v.fields.filter((x) => x.id !== vf.id) });
            goBack();
          }}
        />
      );
    } else {
      const o = (vf.obs || []).find((x) => x.id === screen.oid);
      if (!o) return null;
      sub = 'Field ' + vf.code + ' · observation';
      body = (
        <EtuObsScreen
          key={o.id}
          obs={o}
          vf={vf}
          onChange={(no) => saveVf({ ...vf, obs: vf.obs.map((x) => (x.id === no.id ? no : x)) })}
          onDelete={() => {
            saveVf({ ...vf, obs: vf.obs.filter((x) => x.id !== o.id) });
            goBack();
          }}
        />
      );
    }
  } else if (screen.name === 'more') {
    sub = 'More';
    body = <MoreScreen {...common} onGo={(name) => go({ name: name })} />;
  } else if (screen.name === 'estates') {
    sub = 'Estates';
    body = (
      <EstatesScreen
        {...common}
        onAdd={(name) => setEstates((prev) => [...prev, { id: newId(), name: name, profitAct: '', profitBgt: '' }])}
      />
    );
  } else if (screen.name === 'alerts') {
    sub = 'Priorities';
    body = <AlertsScreen {...common} />;
  } else if (screen.name === 'profit') {
    sub = 'Profit by estate';
    body = <ProfitScreen {...common} />;
  } else if (screen.name === 'lookup') {
    sub = 'Lookup';
    body = <LookupScreen {...common} sel={sel} setSel={setSel} onNewVisit={newVisit} />;
  } else if (screen.name === 'settings') {
    sub = 'Settings';
    body = (
      <SettingsScreen
        settings={settings}
        setSettings={setSettings}
        counts={{ estates: estates.length, fields: fields.length, visits: visits.length, actions: actions.length }}
        backupData={{ estates, fields, visits, actions, settings, sel, etu }}
        onRestore={(d) => {
          setEstates(d.estates);
          setFields(d.fields);
          setVisits(d.visits);
          setActions(d.actions);
          setSettings(d.settings);
          setSel(d.sel);
          setEtu(d.etu);
          goHome();
        }}
        onClearAll={() => {
          setEstates([]);
          setFields([]);
          setVisits([]);
          setActions([]);
          setEtu([]);
          setSel({});
          clearPhotos();
          goHome();
        }}
      />
    );
  } else if (screen.name === 'upload') {
    sub = 'Upload estate data';
    body = (
      <UploadScreen
        estates={estates}
        fields={fields}
        onImport={(es, fs, items) => {
          // drop visits / follow-ups of removed estates and fields
          const eIds = es.map((e) => e.id);
          const fIds = fs.map((f) => f.id);
          const nv = (items && items.visits) || [];
          const na = (items && items.actions) || [];
          const newV = nv.map((v) => v.id);
          const newA = na.map((a) => a.id);
          setEstates(es);
          setFields(fs);
          setEtu((prev) => prev.filter((v) => eIds.includes(v.estateId)));
          setVisits((visits) =>
            nv.concat(
              visits
                .filter((v) => eIds.includes(v.estateId) && !newV.includes(v.id))
                .map((v) => ({ ...v, fieldIds: (v.fieldIds || []).filter((id) => fIds.includes(id)) }))
            )
          );
          setActions((actions) =>
            na.concat(
              actions.filter(
                (a) => eIds.includes(a.estateId) && (!a.fieldId || fIds.includes(a.fieldId)) && !newA.includes(a.id)
              )
            )
          );
        }}
        onDone={goHome}
      />
    );
  } else {
    body = (
      <HomeScreen
        {...common}
        onGo={(name) => (['estates', 'etu', 'alerts', 'more'].includes(name) ? goTab(name) : go({ name: name }))}
        onNewEtu={() => newEtu(estates.length === 1 ? estates[0].id : null)}
        onOpenEtu={(id) => go({ name: 'etuvisit', id: id })}
        onExample={() => {
          const ex = exampleData();
          setEstates(ex.estates);
          setFields(ex.fields);
          setVisits(ex.visits);
          setActions(ex.actions);
        }}
      />
    );
  }

  // While filling in a visit, hide the bottom bar: more room, no accidental tab switch
  const inVisit = ['visit', 'etuvisit', 'etufield', 'etuobs'].includes(screen.name);

  return (
    <View style={styles.app}>
      <Backdrop />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <TopBar sub={sub} onBack={back} top={insets.top} />
      {storeError ? (
        <View style={styles.storeWarn}>
          <T style={styles.storeWarnText}>{storeError}</T>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>{body}</View>
      {undo ? (
        <UndoBar text="Visit deleted" onUndo={undoDelete} />
      ) : notice ? (
        <View style={styles.undoBar}>
          <T style={styles.undoText}>{notice}</T>
        </View>
      ) : null}
      {inVisit ? (
        <View style={{ height: insets.bottom }} />
      ) : (
        <BottomNav
          bottom={insets.bottom}
          active={stack[0].name}
          onGo={goTab}
          badge={actions.filter((a) => a.status !== 'done' && isOverdue(a)).length}
        />
      )}
    </View>
  );
}
