// FILE: vite-env.d.ts
// PHOENIX PROTOCOL - FULL ENV & MODULE DECLARATIONS V6.0

/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 1. FIX: Support for CSS side-effect imports
declare module "*.css" {
  const content: string;
  export default content;
}

// 2. FIX: Support for Moment.js locale side-effect imports
declare module 'moment/locale/*' {
  import { Locale } from 'moment';
  const locale: Locale;
  export default locale;
}

// 3. FIX: Support for Third-Party Libraries
declare module 'react-google-drive-picker';
declare module 'react-quill';
declare module 'react-force-graph-2d';
declare module 'react-force-graph-3d';

// 4. FIX: Support for PDF imports
declare module 'pdfjs-dist/build/pdf.worker.entry';