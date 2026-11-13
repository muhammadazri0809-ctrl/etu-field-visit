import * as XLSX from 'xlsx';
import { applyImport, matchColumns, readRows, templateHeader, textToRows } from '../importRows';

describe('matchColumns', () => {
  test('finds columns by any known spelling', () => {
    const { map, ignored } = matchColumns(['Kebun', 'Blok', 'Mature Ha', 'Yield Act', 'Manuring Act', 'Bgt Manuring', 'Notes']);
    expect(map.estate).toBe(0);
    expect(map.code).toBe(1);
    expect(map.ha).toBe(2);
    expect(map.ypAct).toBe(3);
    expect(map.costs[2]).toEqual({ act: 4, bgt: 5 });
    expect(ignored).toEqual(['Notes']);
  });
});

describe('textToRows', () => {
  test('tab separated (pasted from Excel)', () => {
    expect(textToRows('Estate\tField\nA\tb1\n')).toEqual([['Estate', 'Field'], ['A', 'b1']]);
  });
  test('CSV with quoted commas', () => {
    expect(textToRows('Estate,Field,Mature ha\r\n"Sg. Besar, Estate",P01,"1,234.5"')).toEqual([
      ['Estate', 'Field', 'Mature ha'],
      ['Sg. Besar, Estate', 'P01', '1,234.5'],
    ]);
  });
});

describe('readRows', () => {
  test('finds header below title rows and cleans numbers', () => {
    const res = readRows([
      ['Estate report 2026'],
      [],
      ['Estate', 'Field', 'Mature ha', 'Yield Act', 'Profit Act'],
      ['Alpha', 'p01', '1,234.5', '22.1', 'RM 5,000'],
      ['', 'p02', '10'],
      ['Alpha', '', 'x'],
    ]);
    expect(res.error).toBeUndefined();
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toMatchObject({ estate: 'Alpha', code: 'P01', ha: '1234.5', ypAct: '22.1', profitAct: '5000' });
    expect(res.skipped).toBe(2);
  });
  test('explains a missing header', () => {
    const res = readRows([['Name', 'Value']]);
    expect(res.error).toMatch(/Could not find the header row/);
    expect(res.seen).toEqual(['Name', 'Value']);
  });
  test('template header is understood by the reader', () => {
    const header = templateHeader().split('\t');
    const { map, ignored } = matchColumns(header);
    expect(ignored).toEqual([]);
    expect(Object.keys(map.costs)).toHaveLength(12);
  });
  test('reads a real .xlsx workbook (SheetJS)', () => {
    const ws = XLSX.utils.aoa_to_sheet([['Estate', 'Field', 'Mature ha'], ['Beta', 'B2', 55.5]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    const bin = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const back = XLSX.read(bin, { type: 'base64' });
    const rows = XLSX.utils.sheet_to_json(back.Sheets.Data, { header: 1 });
    expect(readRows(rows).rows[0]).toMatchObject({ estate: 'Beta', code: 'B2', ha: '55.5' });
  });
});

describe('applyImport', () => {
  const estates = [{ id: 'e1', name: 'Alpha', region: 'North', sou: '', profitAct: '1', profitBgt: '2' }];
  const fields = [
    { id: 'f1', estateId: 'e1', code: 'P01', ha: '10', ypAct: '20', costs: { 0: { act: '5', bgt: '6' } } },
    { id: 'f2', estateId: 'e1', code: 'P02', ha: '12', costs: {} },
  ];
  const rows = [
    { estate: 'alpha', code: 'P01', region: '', sou: 'S1', ha: '11', ypAct: '', costs: { 0: { act: '7', bgt: '' } } },
    { estate: 'Gamma', code: 'G1', region: 'South', sou: '', ha: '3', costs: {} },
  ];

  test('merge keeps old values where the file is blank', () => {
    const r = applyImport(rows, estates, fields, false);
    expect(r).toMatchObject({ newE: 1, newF: 1, updF: 1, delE: 0, delF: 0 });
    const f1 = r.fields.find((f) => f.id === 'f1');
    expect(f1).toMatchObject({ ha: '11', ypAct: '20' });
    expect(f1.costs[0]).toEqual({ act: '7', bgt: '6' });
    expect(r.estates[0]).toMatchObject({ region: 'North', sou: 'S1' });
    expect(fields[0].ha).toBe('10'); // input not changed
  });
  test('replace drops estates and fields not in the file', () => {
    const r = applyImport(rows, estates, fields, true);
    expect(r.fields.map((f) => f.code).sort()).toEqual(['G1', 'P01']);
    expect(r.delF).toBe(1);
  });
});
