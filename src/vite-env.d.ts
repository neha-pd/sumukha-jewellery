interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly BASE_URL: string;
  readonly VITE_WHATSAPP_NUMBER?: string;
  readonly VITE_BASE_PATH?: string;
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
