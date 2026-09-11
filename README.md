# Jot — Phase 1

Jot is a minimal, clean, local browser extension designed for quick note-taking and capturing thoughts before they disappear.

Built for **Brave Browser** and all **Chromium-based browsers** (Chrome, Edge, Opera) using **Manifest V3** and `chrome.storage.local`.

---

## Features (Phase 1)

- **Toolbar Quick Access**: Open extension instantly from the browser toolbar.
- **Immediate Focus Textarea**: Open and write notes without friction.
- **Inline Validation & Feedback**: Clear user feedback for saved or empty notes.
- **Notes List View**: View saved notes listed newest-first with date timestamps and text previews.
- **Note Detail View**: Read full notes comfortably with multiline formatting.
- **Note Deletion**: Delete notes with explicit confirmation state.
- **100% Local Storage**: Stores notes in `chrome.storage.local`. Zero backend, zero tracking, zero external APIs, works fully offline.

---

## Tech Stack

- **TypeScript** (Strict mode)
- **HTML5 & Vanilla CSS**
- **Manifest V3** & **Chromium Extension APIs**
- **Vite** (Build tooling)
- **Vitest** (Unit testing)
- **pnpm** (Package manager)

---

## Installation & Development Setup

### 1. Install Dependencies

Ensure node (v18+) and `pnpm` are installed on your machine.

```bash
pnpm install
```

### 2. Run Tests

Run the test suite to verify storage and note operations:

```bash
pnpm test
```

### 3. Build the Extension

To generate the extension build artifact:

```bash
pnpm build
```

This compiles TypeScript and outputs the ready-to-load extension into the `dist/` directory.

---

## Loading Jot in Brave / Chrome

Follow these steps to load Jot into Brave or any Chromium browser:

1. Open **Brave Browser** (or Chrome).
2. Navigate to the extension management page:
   - In Brave: `brave://extensions`
   - In Chrome: `chrome://extensions`
3. Toggle **Developer mode** in the top right corner to **ON**.
4. Click the **"Load unpacked"** button in the top toolbar.
5. Select the **`dist/`** directory located inside this project folder (`sample/dist`).
6. **Pin Jot** to your browser toolbar for easy access.

---

## Usage Guide

1. **Create a Note**:
   - Click the **Jot** icon in your browser toolbar.
   - Type your note into the text area.
   - Click **Save Note** (or check validation if empty).
2. **View Notes**:
   - Click **See Notes** on the main screen to view all saved notes listed newest-first.
3. **Read Note**:
   - Click any note item in the list to open its full detail view.
4. **Delete Note**:
   - Click **Delete Note** in the detail view.
   - Confirm deletion in the prompt dialog.

---

## Project Structure

```text
sample/
├── dist/                   # Output folder for unpacked extension
├── public/                 # Static assets & Manifest V3 template
│   ├── icons/              # Extension icons (16, 48, 128px)
│   └── manifest.json       # Extension manifest file
├── src/
│   ├── popup/              # Extension popup UI (HTML, CSS, TypeScript)
│   ├── storage/            # chrome.storage.local abstraction logic
│   ├── types/              # TypeScript interfaces (Note)
│   ├── utils/              # Helper functions (Date formatting)
│   └── __tests__/          # Vitest unit test suite
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── README.md
```
