// Plugin signatures use markdown-it 15's bundled instance and renderer types.

declare module 'markdown-it-sub' {
  import type { MarkdownIt } from 'markdown-it';
  const markdownItSub: (md: MarkdownIt) => void;
  export = markdownItSub;
}

declare module 'markdown-it-sup' {
  import type { MarkdownIt } from 'markdown-it';
  const markdownItSup: (md: MarkdownIt) => void;
  export = markdownItSup;
}

declare module 'markdown-it-abbr' {
  import type { MarkdownIt } from 'markdown-it';
  const markdownItAbbr: (md: MarkdownIt) => void;
  export = markdownItAbbr;
}

declare module 'markdown-it-ins' {
  import type { MarkdownIt } from 'markdown-it';
  const markdownItIns: (md: MarkdownIt) => void;
  export = markdownItIns;
}

declare module 'markdown-it-mark' {
  import type { MarkdownIt } from 'markdown-it';
  const markdownItMark: (md: MarkdownIt) => void;
  export = markdownItMark;
}

declare module 'markdown-it-deflist' {
  import type { MarkdownIt } from 'markdown-it';
  const markdownItDeflist: (md: MarkdownIt) => void;
  export = markdownItDeflist;
}

declare module 'markdown-it-footnote' {
  import type { MarkdownIt } from 'markdown-it';
  const footnote: (md: MarkdownIt) => void;
  export default footnote;
}

declare module 'markdown-it-emoji' {
  import type { MarkdownIt } from 'markdown-it';
  export const full: (md: MarkdownIt) => void;
}

declare module 'markdown-it-container' {
  import type { MarkdownIt, RendererRule } from 'markdown-it';
  interface ContainerOptions {
    validate?: (params: string) => boolean | RegExpMatchArray | null;
    render?: RendererRule;
    marker?: string;
  }
  const container: (md: MarkdownIt, name: string, options?: ContainerOptions) => void;
  export default container;
}

declare module 'markdown-it-multimd-table' {
  import type { MarkdownIt } from 'markdown-it';
  interface TableOptions {
    multiline?: boolean;
    rowspan?: boolean;
    headerless?: boolean;
    multibody?: boolean;
    autolabel?: boolean;
  }
  const table: (md: MarkdownIt, options?: TableOptions) => void;
  export default table;
}
