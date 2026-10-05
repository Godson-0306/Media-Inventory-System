import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gtech.assetops",
  appName: "Asset Operations",
  webDir: "www",
  server: {
    url: "https://media-inventory-system.vercel.app",
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
