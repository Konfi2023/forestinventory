import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'eu.forestmanager.app',
  appName: 'Forest Manager',
  webDir: 'cap-www',
  server: {
    url: 'https://forest-manager.eu/app',
    cleartext: false,
    allowNavigation: [
      'forest-manager.eu',
      '*.forest-manager.eu',
      'auth.forest-manager.eu',
    ],
  },
  ios: {
    scheme: 'ForestManager',
    contentInset: 'automatic',
    backgroundColor: '#0f172a',
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#0f172a',
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a',
    },
  },
};

export default config;
