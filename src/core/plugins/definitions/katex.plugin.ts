/**
 * KaTeX Math Plugin
 * Renders LaTeX math equations using KaTeX
 */

import { katex } from '@mdit/plugin-katex';
import type { MarkdownPlugin } from '../types';

export const katexPlugin: MarkdownPlugin = {
  id: 'katex',
  name: 'Math Equations',
  version: '1.1.5', // @mdit/plugin-katex version
  description: 'Render LaTeX math equations ($...$ inline, $$...$$ display)',
  category: 'content',
  priority: 20,
  enabledByDefault: true,

  install(md) {
    md.use(katex, {
      throwOnError: false,
      errorColor: '#cc0000',
    });
  },
};
