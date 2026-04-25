import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const appRoot = process.cwd();
const androidDir = path.join(appRoot, "android");
const gradleWrapper = path.join(androidDir, "gradlew.bat");
const localProperties = path.join(androidDir, "local.properties");
const args = process.argv.slice(2);

if (!existsSync(gradleWrapper)) {
  console.error("Missing android/gradlew.bat. Run Expo prebuild first if the native project was removed.");
  process.exit(1);
}

if (!existsSync(localProperties)) {
  console.error("Missing android/local.properties.");
  console.error("Create it with: sdk.dir=C:\\\\Users\\\\<you>\\\\AppData\\\\Local\\\\Android\\\\Sdk");
  process.exit(1);
}

if (!process.env.JAVA_HOME && !process.env.STUDIO_JDK && !process.env.JDK_HOME) {
  console.error("JAVA_HOME is not set.");
  console.error("Set JAVA_HOME to Android Studio's embedded JDK or a JDK 17 installation.");
  console.error("Typical path: C:\\Program Files\\Android\\Android Studio\\jbr");
  process.exit(1);
}

if (!args.length) {
  console.error("Usage: node scripts/android-gradle.mjs <gradle-task> [more-args]");
  process.exit(1);
}

try {
  const sdkLine = readFileSync(localProperties, "utf8")
    .split(/\r?\n/)
    .find((line) => line.startsWith("sdk.dir="));

  if (!sdkLine) {
    console.error("android/local.properties does not contain sdk.dir.");
    process.exit(1);
  }
} catch (error) {
  console.error("Failed to read android/local.properties:", error);
  process.exit(1);
}

const child = spawn("cmd.exe", ["/c", "gradlew.bat", ...args], {
  cwd: androidDir,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
