import { ScrollView } from 'react-native';
import React from 'react';
import { Bar, Empty, Menu, MenuRow, PageHead, Section } from '../components/ui';
import { estateYield, money, num, pctText, profitVar, rmMil } from '../logic/rules';
import { C, T, styles } from '../theme';

// =====================================================
// PROFIT PAGE (all estates)
// =====================================================
export function ProfitScreen(p) {
  const { estates, fields } = p;
  const list = estates.filter((e) => num(e.profitAct) !== null);
  const maxP = list.reduce((m, e) => Math.max(m, num(e.profitAct) || 0, num(e.profitBgt) || 0), 1);
  const total = list.reduce((s, e) => s + (num(e.profitAct) || 0), 0);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <PageHead icon="bar-chart-outline" title="Profit by estate" sub={'YTD · total ' + rmMil(total)} />
      {list.length === 0 && <Empty title="No profit data" text="Upload the workbook (P&L sheet) or type it in each estate's Profit page." />}
      {list.length > 0 && (
        <Section icon="podium-outline" title="Actual vs budget">
          {list.map((e) => {
            const pv = profitVar(e);
            return (
              <Bar
                key={e.id}
                label={e.name + '  ' + rmMil(e.profitAct)}
                value={num(e.profitAct) || 0}
                max={maxP}
                marker={num(e.profitBgt) === null ? undefined : num(e.profitBgt)}
                color={pv !== null && pv < 0 ? C.att : C.good}
                right={pctText(pv)}
              />
            );
          })}
          <T style={styles.hint}>Bar = actual. Black line = budget (if entered).</T>
        </Section>
      )}
      <Menu>
        {list.map((e, i) => {
          const ey = estateYield(fields.filter((f) => f.estateId === e.id));
          const perHa = ey ? (num(e.profitAct) * 1000) / ey.ha : null;
          const pv = profitVar(e);
          return (
            <MenuRow
              key={e.id}
              icon="trending-up"
              title={e.name}
              sub={rmMil(e.profitAct) + (perHa !== null ? ' · RM ' + money(perHa) + '/ha' : '')}
              chip={pv === null ? 'No budget' : pctText(pv)}
              tone={pv === null ? 'muted' : pv < 0 ? 'att' : 'good'}
              last={i === list.length - 1}
              onPress={() => p.onOpenEstate(e.id, 'Profit')}
            />
          );
        })}
      </Menu>
    </ScrollView>
  );
}
