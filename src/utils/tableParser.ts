/**
 * 表格解析工具
 *
 * 将 Markdown 表格源码解析为结构化数据
 */

/**
 * 表格数据结构
 */
export interface TableData {
  headers: string[];
  alignments: ('left' | 'center' | 'right' | null)[];
  rows: string[][];
}

/**
 * 解析表格行，处理转义管道符
 */
function parseRow(line: string): string[] {
  // 先替换转义管道符为占位符
  const placeholder = '\x00PIPE\x00';
  const escaped = line.replace(/\\\|/g, placeholder);

  // 按管道符分割
  const cells = escaped.split('|');

  // 去掉首尾空单元格（由于 |col1|col2| 格式）
  if (cells.length > 0 && cells[0].trim() === '') cells.shift();
  if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop();

  // 还原占位符并清理
  return cells.map((cell) => cell.replace(new RegExp(placeholder, 'g'), '|').trim());
}

/**
 * 解析对齐方式
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
 * 检查是否为分隔行
 */
function isSeparatorRow(cells: string[]): boolean {
  if (cells.length === 0) return false;
  return cells.every((cell) => /^:?-+:?$/.test(cell.trim()));
}

/**
 * 解析 Markdown 表格
 *
 * @param source - 表格源码
 * @returns 解析后的表格数据，无效表格返回 null
 */
export function parseMarkdownTable(source: string): TableData | null {
  const lines = source.split('\n').filter((line) => line.trim() !== '');

  if (lines.length < 2) return null;

  // 解析表头
  const headerCells = parseRow(lines[0]);
  if (headerCells.length === 0) return null;

  // 解析分隔行
  const separatorCells = parseRow(lines[1]);
  if (!isSeparatorRow(separatorCells)) return null;

  // 列数必须匹配
  if (headerCells.length !== separatorCells.length) return null;

  // 解析对齐方式
  const alignments = separatorCells.map(parseAlignment);

  // 解析数据行
  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const rowCells = parseRow(lines[i]);
    // 补齐或截断到表头列数
    const normalizedRow = headerCells.map((_, idx) => rowCells[idx] ?? '');
    rows.push(normalizedRow);
  }

  return {
    headers: headerCells,
    alignments,
    rows,
  };
}
