/// <reference types="vite/client" />

declare module "*/zip.js" {
  const content: any;
  export default content;
  export const BlobReader: any;
  export const BlobWriter: any;
  export const TextWriter: any;
  export const ZipReader: any;
  export const configure: any;
}
