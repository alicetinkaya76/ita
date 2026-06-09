import { useTranslation } from 'react-i18next';

interface FilterChip {
  key: string;
  label: string;
  value: string;
}

interface FilterChipsProps {
  chips: FilterChip[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
}

export default function FilterChips({ chips, onRemove, onClearAll }: FilterChipsProps) {
  const { t } = useTranslation();
  if (chips.length === 0) return null;

  return (
    <div className="filter-chips">
      {chips.map(chip => (
        <span key={chip.key} className="filter-chip">
          <span className="filter-chip-label">{chip.label}:</span>
          <span className="filter-chip-value">{chip.value}</span>
          <button
            className="filter-chip-remove"
            onClick={() => onRemove(chip.key)}
            aria-label={`Remove ${chip.label}`}
          >
            ✕
          </button>
        </span>
      ))}
      {chips.length > 1 && onClearAll && (
        <button className="filter-chips-clear" onClick={onClearAll}>
          {t('mobile.clear_filters')}
        </button>
      )}
    </div>
  );
}
