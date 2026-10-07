import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.base6a975d266a8000184833026a.app',
  appName: 'Chaveiro Já',
  webDir: 'dist',
  server: {
    // Keep the native shell pointed at the published Base44 application. This
    // preserves the existing authentication and backend behavior while the
    // iOS signing configuration remains fully controlled by this repository.
    url: 'https://woodoo-quick-lock-link.base44.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
};

export default config;
