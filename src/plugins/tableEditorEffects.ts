import { StateEffect } from '@codemirror/state';

export interface TableSourceModeToggle {
  from: number;
  to: number;
  showSource: boolean;
}

export const setTableSourceMode = StateEffect.define<TableSourceModeToggle>();
