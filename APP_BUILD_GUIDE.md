# Ledger UK App Build Guide

This project is ready to be wrapped as a mobile app with Capacitor.

## 1. Install Node.js LTS

Install Node.js LTS from https://nodejs.org/.

After installing, open PowerShell and check:

```bash
node -v
npm -v
```

Both commands should print version numbers.

## 2. Install app build dependencies

In this folder:

```bash
npm install
```

## 3. Add mobile platforms

Android:

```bash
npm run cap:add:android
npm run cap:sync
npm run cap:open:android
```

iPhone/iPad:

```bash
npm run cap:add:ios
npm run cap:sync
npm run cap:open:ios
```

iOS builds require a Mac with Xcode. Android builds require Android Studio.

## 4. After every website change

Run:

```bash
npm run cap:sync
```

Then rebuild from Android Studio or Xcode.
