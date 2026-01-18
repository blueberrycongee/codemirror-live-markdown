/**
 * Table Serializer Utility
 *
 * Converts structured table data back to Markdown
 */

import { TableData } from './tableParser';

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function alignmentCell(alignment: 'left' | 'center' | 'right' | null): string {
  if (alignment === 'left') return ':---';
  if (alignment === 'right') return '---:';
  if (alignment === 'center') return ':---:';
  return '---';
}

export function serializeMarkdownTable(data: TableData): string {
  const headerLine = `| ${data.headers.map(escapeCell).join(' | ')} |`;
  const separatorLine = `| ${data.alignments
    .map(alignmentCell)
    .join(' | ')} |`;
  const rowLines = data.rows.map(
    (row) => `| ${row.map(escapeCell).join(' | ')} |`
  );

  return [headerLine, separatorLine, ...rowLines].join('\n');
}
