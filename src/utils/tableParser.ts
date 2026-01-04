/**
 * Table Parser Utility
 *
 * Parses Markdown table source into structured data
 */

/**
 * Table data structure
 */
export interface TableData {
  headers: string[];
  alignments: ('left' | 'center' | 'right' | null)[];
  rows: string[][];
}

/**
 * Parse table row, handling escaped pipes
 */
function parseRow(line: string): string[] {
  // Replace escaped pipes with placeholder first
  const placeholder = '\x00PIPE\x00';
  const escaped = line.replace(/\\\|/g, placeholder);

  // Split by pipe
  const cells = escaped.split('|');

  // Remove empty cells at start/end (due to |col1|col2| format)
  if (cells.length > 0 && cells[0].trim() === '') cells.shift();
  if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop();

  // Restore placeholder and clean up
  return cells.map((cell) =>
    cell.replace(new RegExp(placeholder, 'g'), '|').trim()
  );
}

/**
 * Parse alignment
 */
function parseAlignment(cell: string): 'left' | 'center' | 'right' | null {
  const trimmed = cell.trim();
  const left = trimmed.startsWith(':');
  const right = trimmed.endsWith(':');

  if (left && right) return 'center';
  if (left) return 'left';
  if (right) return 'right';
  return null;
}

/**
 * Check if row is a separator row
 */
function isSeparatorRow(cells: string[]): boolean {
  if (cells.length === 0) return false;
  return cells.every((cell) => /^:?-+:?$/.test(cell.trim()));
}

/**
 * Parse Markdown table
 *
 * @param source - Table source
 * @returns Parsed table data, null for invalid table
 */
export function parseMarkdownTable(source: string): TableData | null {
  const lines = source.split('\n').filter((line) => line.trim() !== '');

  if (lines.length < 2) return null;

  // Parse header
  const headerCells = parseRow(lines[0]);
  if (headerCells.length === 0) return null;

  // Parse separator row
  const separatorCells = parseRow(lines[1]);
  if (!isSeparatorRow(separatorCells)) return null;

  // Column count must match
  if (headerCells.length !== separatorCells.length) return null;

  // Parse alignments
  const alignments = separatorCells.map(parseAlignment);

  // Parse data rows
  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const rowCells = parseRow(lines[i]);
    // Pad or truncate to header column count
    const normalizedRow = headerCells.map((_, idx) => rowCells[idx] ?? '');
    rows.push(normalizedRow);
  }

  return {
    headers: headerCells,
    alignments,
    rows,
  };
}
