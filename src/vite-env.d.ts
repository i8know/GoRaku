/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*/zip.js" {
  const content: any;
  export default content;
  export const BlobReader: any;
  export const BlobWriter: any;
  export const TextWriter: any;
  export const ZipReader: any;
  export const configure: any;
}
