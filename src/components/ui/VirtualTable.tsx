import { type CSSProperties, type ReactElement, type ReactNode, useMemo } from 'react';
import { List, type RowComponentProps } from 'react-window';

interface VTRowProps {
  dataItems: unknown[];
  renderFn: (item: unknown, index: number, style: CSSProperties) => ReactElement;
}

function VTRow({ index, style, dataItems, renderFn }: RowComponentProps<VTRowProps>) {
  return renderFn(dataItems[index], index, style);
}

interface VirtualTableProps<T> {
  data: T[];
  rowHeight?: number;
  height?: number;
  header: ReactNode;
  renderRow: (item: T, index: number, style: CSSProperties) => ReactElement;
}

export default function VirtualTable<T>({
  data,
  rowHeight = 44,
  height = 600,
  header,
  renderRow,
}: VirtualTableProps<T>) {
  const rowProps = useMemo(() => ({
    dataItems: data as unknown[],
    renderFn: renderRow as (item: unknown, index: number, style: CSSProperties) => ReactElement,
  }), [data, renderRow]);

  return (
    <div className="virtual-table-wrap">
      <div className="virtual-table-header">
        {header}
      </div>
      <div className="virtual-table-body">
        <List
          rowComponent={VTRow}
          rowCount={data.length}
          rowHeight={rowHeight}
          rowProps={rowProps}
          overscanCount={10}
          style={{ height: Math.min(height, 660) }}
        />
      </div>
    </div>
  );
}
