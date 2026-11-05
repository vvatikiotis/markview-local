/**
 * Advanced Tables Plugin
 * Provides extended table features including multiline, rowspan, headerless
 */

import type { MarkdownIt } from 'markdown-it';
import markdownItMultimdTable from 'markdown-it-multimd-table';
import type { MarkdownPlugin } from '../types';

export const tablesPlugin: MarkdownPlugin = {
  id: 'tables',
  name: 'Advanced Tables',
  version: '4.2.3', // markdown-it-multimd-table version
  description: 'Advanced GFM tables with multiline cells, rowspan, and headerless tables',
  category: 'core',
  priority: 10,
  enabledByDefault: true,
  settingsKey: 'tables', // Maps to existing setting

  install(md) {
    // markdown-it 15 removed utils.assign. Keep the legacy helper local to this
    // plugin's installation; rendering and other plugins use the original instance.
    const compatibleMd: MarkdownIt = Object.create(md, {
      utils: { value: { ...md.utils, assign: Object.assign } },
    });
    markdownItMultimdTable(compatibleMd, {
      multiline: true,
      rowspan: true,
      headerless: true,
      multibody: false,
      autolabel: true,
    });
  },
};
