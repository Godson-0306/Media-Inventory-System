import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const manifestPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "android",
  "app",
  "src",
  "main",
  "AndroidManifest.xml",
);

const required = [
  '    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
];

let xml = readFileSync(manifestPath, "utf8");
for (const line of required) {
  const name = line.match(/android:name="([^"]+)"/)?.[1];
  if (name && !xml.includes(name)) {
    xml = xml.replace("<manifest", `<manifest>\n${line}`);
    xml = xml.replace("<manifest>\n", `<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n`);
  }
}
if (!xml.includes("android.hardware.location.gps")) {
  xml = xml.replace(
    "</manifest>",
    '    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n</manifest>',
  );
}
writeFileSync(manifestPath, xml);
