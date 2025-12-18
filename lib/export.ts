function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  downloadBlob(filename, blob);
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  const needsQuotes = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function toCsv(rows: Array<Record<string, unknown>>, columns?: string[]) {
  const cols = columns?.length
    ? columns
    : Array.from(
        rows.reduce((set, r) => {
          Object.keys(r).forEach((k) => set.add(k));
          return set;
        }, new Set<string>()),
      );

  const header = cols.join(',');
  const lines = rows.map((r) => cols.map((c) => csvEscape(r[c])).join(','));
  return [header, ...lines].join('\n');
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>, columns?: string[]) {
  const csv = toCsv(rows, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(filename, blob);
}



