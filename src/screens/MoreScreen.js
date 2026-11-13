import { ScrollView, View } from 'react-native';
import React from 'react';
import { KV, Menu, MenuRow, PageHead, Section } from '../components/ui';
import { num, rmMil } from '../logic/rules';
import { T, styles } from '../theme';

// =====================================================
// MORE: profit, upload, settings
// =====================================================
export function MoreScreen(p) {
  const { estates, fields, visits, actions } = p;
  const etu = p.etu || [];
  const total = estates.reduce((s, e) => s + (num(e.profitAct) || 0), 0);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <PageHead icon="menu-outline" title="More" sub="Reports, data and settings" />
      <Menu>
        <MenuRow icon="bar-chart-outline" title="Profit by estate" sub={total ? rmMil(total) + ' YTD' : 'No profit data'} tone="gold" onPress={() => p.onGo('profit')} />
        <MenuRow icon="cloud-upload-outline" title="Upload estate data" sub="Excel workbook, CSV or paste" tone="rnd" onPress={() => p.onGo('upload')} />
        <MenuRow icon="options-outline" title="Settings" sub="Trigger limits · clear data" last onPress={() => p.onGo('settings')} />
      </Menu>
      <Section icon="phone-portrait-outline" title="On this phone">
        <View style={styles.kv}>
          <KV label="Estates" value={String(estates.length)} />
          <KV label="Fields" value={String(fields.length)} />
          <KV label="ETU visits" value={String(etu.length)} />
          <KV label="Follow-ups" value={String(actions.length)} />
          <KV label="Assessments" value={String(visits.length)} />
          <KV label="Internet needed" value="No, works offline" />
        </View>
        <T style={styles.hint}>Everything is saved on this phone as you type. No internet is needed in the field.</T>
      </Section>
    </ScrollView>
  );
}
