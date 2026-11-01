export interface FoliateTocItem {
  label: string;
  href: string;
  subitems?: FoliateTocItem[] | null;
}

export interface FoliateSection {
  id: string | number;
  cfi?: string;
  size?: number;
  linear?: string;
  load?: () => Promise<string>;
  unload?: () => void;
  createDocument?: () => Promise<Document>;
  resolveHref?: (href: string) => string;
}

export interface FoliateBookMetadata {
  title?: string | { [lang: string]: string };
  author?:
    | string
    | { name?: string; [key: string]: unknown }
    | Array<string | { name?: string; [key: string]: unknown }>;
  description?: string;
  language?: string | string[];
  publisher?: string;
}

export interface FoliateBook {
  metadata?: FoliateBookMetadata;
  toc?: FoliateTocItem[];
  sections: FoliateSection[];
  dir?: "ltr" | "rtl";
  rendition?: {
    layout?: string;
    spread?: string;
  };
  getCover?: () => Promise<Blob | null>;
  resolveCFI?: (cfi: string) => {
    index: number;
    anchor: (doc: Document) => Range | Element | null;
  };
  resolveHref?: (href: string) => {
    index: number;
    anchor?: (doc: Document) => Range | Element | null;
  } | null;
  destroy?: () => void;
}

export interface FoliateRenderer extends HTMLElement {
  open: (book: FoliateBook) => void;
  goTo: (target: unknown) => Promise<void>;
  prev: (distance?: number) => Promise<void>;
  next: (distance?: number) => Promise<void>;
  setStyles?: (styles: string | [string, string]) => void;
  getContents: () => Array<{
    index: number;
    doc: Document;
    overlayer?: unknown;
  }>;
  destroy?: () => void;
}

export interface FoliateRelocateDetail {
  fraction?: number;
  cfi?: string;
  index?: number;
  range?: Range;
  tocItem?: FoliateTocItem;
}

export declare class View extends HTMLElement {
  book: FoliateBook;
  renderer: FoliateRenderer;
  lastLocation?: FoliateRelocateDetail;
  open(book: File | Blob | string | FoliateBook): Promise<void>;
  init(options: { lastLocation?: string; showTextStart?: boolean }): Promise<void>;
  close(): void;
  goTo(target: string | number | { fraction: number }): Promise<unknown>;
  goToFraction(frac: number): Promise<void>;
  prev(distance?: number): Promise<void>;
  next(distance?: number): Promise<void>;
  goLeft(): Promise<void>;
  goRight(): Promise<void>;
  getCFI(index: number, range?: Range): string;
  deselect(): void;
}

export declare function makeBook(file: File | Blob | string): Promise<FoliateBook>;

