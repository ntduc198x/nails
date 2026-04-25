# Android Studio Setup

Use this guide when opening `apps/mobile` in Android Studio.

## Open The Right Folder

Open:

```text
apps/mobile/android
```

Do not open the monorepo root in Android Studio if your goal is just to run the Android app.

## Required Tools

Install:

1. Android Studio
2. Android SDK Platform for the project's compile SDK
3. Android SDK Build-Tools
4. Android Emulator or a physical Android device
5. JDK 17

Android Studio usually ships with an embedded JDK at a path like:

```text
C:\Program Files\Android\Android Studio\jbr
```

## Required Local File

Create or verify:

```text
apps/mobile/android/local.properties
```

Example:

```properties
sdk.dir=C\:\\Users\\<your-user>\\AppData\\Local\\Android\\Sdk
```

This file is machine-local and should not be committed.

## Required Environment Variable

Set one of these:

- `JAVA_HOME`
- `STUDIO_JDK`
- `JDK_HOME`

Recommended:

```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
```

Permanent on Windows:

1. Open `System Properties`
2. Go to `Environment Variables`
3. Add `JAVA_HOME`
4. Point it to Android Studio `jbr`

## Quick Checks

From `apps/mobile`:

```powershell
npm run android:studio:doctor
```

If that passes, Gradle should be able to run.

## Run From Terminal

From `apps/mobile`:

```powershell
npm run android:gradle:assembleDebug
```

Install to a running emulator/device:

```powershell
npm run android:gradle:installDebug
```

## Run From Android Studio

1. Open `apps/mobile/android`
2. Wait for Gradle sync to finish
3. Select emulator or device
4. Run the `app` configuration

## Metro / JS Runtime

For React Native debug flow, run Metro from `apps/mobile` in another terminal:

```powershell
npm start
```

If you use the Android emulator, this project already points debug builds to:

```text
10.0.2.2
```

That allows the emulator to reach Metro on your host machine.

## If Sync Fails

Check these first:

1. `JAVA_HOME` points to JDK 17
2. `android/local.properties` exists and `sdk.dir` is correct
3. Android SDK packages are installed in Android Studio SDK Manager
4. You opened `apps/mobile/android`, not the wrong folder

## Current Status In This Repo

This repo already has:

- native Android project checked in
- `android/local.properties` on this machine
- debug dev-server host override for emulator
- Gradle wrapper scripts

The missing piece in the current shell was Java environment setup.
