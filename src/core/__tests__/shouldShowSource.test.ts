import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { shouldShowSource } from '../shouldShowSource';
import { collapseOnSelectionFacet } from '../facets';
import { mouseSelectingField } from '../mouseSelecting';

describe('shouldShowSource', () => {
  it('should return false when Live Preview is disabled', () => {
    const state = EditorState.create({
      doc: 'Hello **world** test',
      extensions: [collapseOnSelectionFacet.of(false), mouseSelectingField],
    });

    expect(shouldShowSource(state, 6, 15)).toBe(false);
  });

  it('should return false when dragging', () => {
    const state = EditorState.create({
      doc: 'Hello **world** test',
      extensions: [collapseOnSelectionFacet.of(true), mouseSelectingField],
    });

    // Simulate dragging state
    const newState = state.update({
      effects: [],
    }).state;

    expect(shouldShowSource(newState, 6, 15)).toBe(false);
  });

  it('should return false when cursor is outside the range', () => {
    const state = EditorState.create({
      doc: 'Hello **world** test',
      selection: { anchor: 5 }, // Before "**world**"
      extensions: [collapseOnSelectionFacet.of(true), mouseSelectingField],
    });

    expect(shouldShowSource(state, 6, 15)).toBe(false);
  });

  it('should return true when cursor is inside the range', () => {
    const state = EditorState.create({
      doc: 'Hello **world** test',
      selection: { anchor: 10 }, // Inside "**world**"
      extensions: [collapseOnSelectionFacet.of(true), mouseSelectingField],
    });

    expect(shouldShowSource(state, 6, 15)).toBe(true);
  });

  it('should return true when selection overlaps the range', () => {
    const state = EditorState.create({
      doc: 'Hello **world** test',
      selection: { anchor: 4, head: 12 }, // Overlaps "**world**"
      extensions: [collapseOnSelectionFacet.of(true), mouseSelectingField],
    });

    expect(shouldShowSource(state, 6, 15)).toBe(true);
  });

  it('should return true when cursor is at the boundary', () => {
    const state = EditorState.create({
      doc: 'Hello **world** test',
      selection: { anchor: 6 }, // At the start of "**world**"
      extensions: [collapseOnSelectionFacet.of(true), mouseSelectingField],
    });

    expect(shouldShowSource(state, 6, 15)).toBe(true);
  });
});
