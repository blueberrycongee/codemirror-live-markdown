import { describe, it, expect } from 'vitest';
import { parseMarkdownTable } from '../tableParser';

describe('parseMarkdownTable', () => {
  it('should parse simple table', () => {
    const source = `| Name | Age |
|------|-----|
| Alice | 25 |
| Bob | 30 |`;

    const result = parseMarkdownTable(source);

    expect(result).not.toBeNull();
    expect(result?.headers).toEqual(['Name', 'Age']);
    expect(result?.rows).toEqual([
      ['Alice', '25'],
      ['Bob', '30'],
    ]);
  });

  it('should parse table with alignment', () => {
    const source = `| Left | Center | Right |
|:-----|:------:|------:|
| L | C | R |`;

    const result = parseMarkdownTable(source);

    expect(result).not.toBeNull();
    expect(result?.alignments).toEqual(['left', 'center', 'right']);
  });

  it('should handle empty cells', () => {
    const source = `| A | B | C |
|---|---|---|
| 1 |   | 3 |
|   | 2 |   |`;

    const result = parseMarkdownTable(source);

    expect(result).not.toBeNull();
    expect(result?.rows).toEqual([
      ['1', '', '3'],
      ['', '2', ''],
    ]);
  });

  it('should return null for invalid table', () => {
    // 没有分隔行
    expect(parseMarkdownTable('| A | B |')).toBeNull();

    // 分隔行格式错误
    expect(parseMarkdownTable('| A | B |\n| x | y |')).toBeNull();

    // 空内容
    expect(parseMarkdownTable('')).toBeNull();

    // 只有一行
    expect(parseMarkdownTable('| A |')).toBeNull();
  });

  it('should trim cell content', () => {
    const source = `|  Name  |  Age  |
|--------|-------|
|  Alice  |  25  |`;

    const result = parseMarkdownTable(source);

    expect(result?.headers).toEqual(['Name', 'Age']);
    expect(result?.rows[0]).toEqual(['Alice', '25']);
  });

  it('should handle escaped pipes', () => {
    const source = `| Expression | Result |
|------------|--------|
| a \\| b | true |`;

    const result = parseMarkdownTable(source);

    expect(result).not.toBeNull();
    expect(result?.rows[0][0]).toBe('a | b');
  });

  it('should handle table without leading/trailing pipes', () => {
    const source = `Name | Age
-----|-----
Alice | 25`;

    const result = parseMarkdownTable(source);

    expect(result).not.toBeNull();
    expect(result?.headers).toEqual(['Name', 'Age']);
  });

  it('should handle mismatched column counts in rows', () => {
    const source = `| A | B | C |
|---|---|---|
| 1 | 2 |
| 1 | 2 | 3 | 4 |`;

    const result = parseMarkdownTable(source);

    expect(result).not.toBeNull();
    // 行应该被规范化到表头列数
    expect(result?.rows[0]).toEqual(['1', '2', '']);
    expect(result?.rows[1]).toEqual(['1', '2', '3']);
  });

  it('should handle null alignment (no colons)', () => {
    const source = `| A | B |
|---|---|
| 1 | 2 |`;

    const result = parseMarkdownTable(source);

    expect(result?.alignments).toEqual([null, null]);
  });

  it('should handle table with only headers', () => {
    const source = `| A | B |
|---|---|`;

    const result = parseMarkdownTable(source);

    expect(result).not.toBeNull();
    expect(result?.headers).toEqual(['A', 'B']);
    expect(result?.rows).toEqual([]);
  });
});
