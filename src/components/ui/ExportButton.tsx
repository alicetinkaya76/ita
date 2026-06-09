import { useTranslation } from 'react-i18next';
import { useCallback, useState } from 'react';

interface ExportButtonProps<T> {
  data: T[];
  filename: string;
  csvHeaders?: string[];
  csvRow?: (item: T) => string[];
}

export default function ExportButton<T>({ data, filename, csvHeaders, csvRow }: ExportButtonProps<T>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const download = useCallback((content: string, ext: string, mime: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }, [filename]);

  const exportJSON = () => {
    download(JSON.stringify(data, null, 2), 'json', 'application/json');
  };

  const exportCSV = () => {
    if (!csvHeaders || !csvRow) return;
    const escapeCsv = (v: string) => {
      if (v.includes(',') || v.includes('"') || v.includes('\n')) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    };
    const rows = [
      csvHeaders.join(','),
      ...data.map(item => csvRow(item).map(escapeCsv).join(','))
    ];
    download(rows.join('\n'), 'csv', 'text/csv');
  };

  return (
    <div className="export-wrap" onMouseLeave={() => setOpen(false)}>
      <button className="export-btn" onClick={() => setOpen(!open)}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M8 2v9M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>{t('common.export')}</span>
      </button>
      {open && (
        <div className="export-dropdown">
          <button className="export-option" onClick={exportJSON}>
            <span className="export-icon">{ }</span> JSON
          </button>
          {csvHeaders && csvRow && (
            <button className="export-option" onClick={exportCSV}>
              <span className="export-icon">⊞</span> CSV
            </button>
          )}
        </div>
      )}
    </div>
  );
}
