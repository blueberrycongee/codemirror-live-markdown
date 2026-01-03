import { Facet } from '@codemirror/state';

/**
 * Facet: Controls whether Live Preview mode is enabled
 * - true: Enable Live Preview (hide marks on inactive lines)
 * - false: Source mode (show all marks)
 */
export const collapseOnSelectionFacet = Facet.define<boolean, boolean>({
  combine: (values) => values[0] ?? false,
});
