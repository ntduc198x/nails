import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const appRoot = process.cwd();
const androidDir = path.join(appRoot, "android");
const localPropertiesPath = path.join(androidDir, "local.properties");
const checks = [];

function record(label, ok, detail) {
  checks.push({ label, ok, detail });
}

record("android/ exists", existsSync(androidDir), androidDir);
record("gradlew.bat exists", existsSync(path.join(androidDir, "gradlew.bat")), path.join(androidDir, "gradlew.bat"));

if (existsSync(localPropertiesPath)) {
  const localProperties = readFileSync(localPropertiesPath, "utf8");
  const sdkLine = localProperties.split(/\r?\n/).find((line) => line.startsWith("sdk.dir="));
  record("android/local.properties exists", true, localPropertiesPath);
  record("sdk.dir configured", Boolean(sdkLine), sdkLine ?? "Missing sdk.dir entry");
} else {
  record("android/local.properties exists", false, localPropertiesPath);
}

record(
  "JAVA_HOME or STUDIO_JDK configured",
  Boolean(process.env.JAVA_HOME || process.env.STUDIO_JDK || process.env.JDK_HOME),
  process.env.JAVA_HOME || process.env.STUDIO_JDK || process.env.JDK_HOME || "Missing Java environment variable",
);

for (const check of checks) {
  console.log(`${check.ok ? "OK " : "NO "}${check.label}: ${check.detail}`);
}

const hasFailure = checks.some((check) => !check.ok);
if (hasFailure) {
  console.error("\nAndroid Studio setup is incomplete.");
  console.error("Open ANDROID_STUDIO.md in apps/mobile for the exact fix steps.");
  process.exit(1);
}

console.log("\nAndroid Studio setup looks ready.");
