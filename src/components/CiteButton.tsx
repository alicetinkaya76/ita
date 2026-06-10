import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toBibTeX, toRIS, entryUrl, type CitationInput } from '../utils/citation';

interface Props {
  kind: 'scholar' | 'work';
  id: string;
  title: string;
  author?: string;
  filename: string;
}

export default function CiteButton({ kind, id, title, author, filename }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const buildText = useCallback((fmt: 'bibtex' | 'ris'): string => {
    const input: CitationInput = {
      kind,
      id,
      title,
      author,
      url: entryUrl(`${kind === 'scholar' ? 'scholars' : 'sources'}/${id}`),
      accessed: new Date().toISOString().slice(0, 10),
    };
    return fmt === 'bibtex' ? toBibTeX(input) : toRIS(input);
  }, [kind, id, title, author]);

  const copy = useCallback(async (fmt: 'bibtex' | 'ris') => {
    try {
      await navigator.clipboard.writeText(buildText(fmt));
      setCopied(fmt);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }, [buildText]);

  const download = useCallback((fmt: 'bibtex' | 'ris') => {
    const ext = fmt === 'bibtex' ? 'bib' : 'ris';
    const blob = new Blob([buildText(fmt)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }, [buildText, filename]);

  return (
    <div className="cite-wrap" onMouseLeave={() => setOpen(false)}>
      <button className="cite-btn" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M5.5 4H3v8h2.5M10.5 4H13v8h-2.5M7 3.5L6 12.5M10 3.5L9 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{t('common.cite')}</span>
      </button>
      {open && (
        <div className="cite-dropdown">
          {(['bibtex', 'ris'] as const).map(fmt => (
            <div key={fmt} className="cite-row">
              <span className="cite-fmt">{fmt === 'bibtex' ? 'BibTeX' : 'RIS'}</span>
              <button className="cite-action" onClick={() => copy(fmt)}>
                {copied === fmt ? t('common.copied') : t('common.copy')}
              </button>
              <button
                className="cite-action cite-action-icon"
                onClick={() => download(fmt)}
                aria-label={t('common.download')}
                title={t('common.download')}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 2v8M5 7l3 3 3-3M3 13h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
