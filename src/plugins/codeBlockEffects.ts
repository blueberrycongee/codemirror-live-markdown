import { StateEffect } from '@codemirror/state';

export interface CodeBlockSourceModeToggle {
  from: number;
  to: number;
  showSource: boolean;
}

export const setCodeBlockSourceMode =
  StateEffect.define<CodeBlockSourceModeToggle>();
