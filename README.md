# Jot — Browser Extension (Phase 1)

Jot is a minimal, clean, local browser extension designed for quick note-taking and capturing thoughts before they disappear.

Built for **Brave Browser** and all **Chromium-based browsers** (Chrome, Edge, Opera) using **Manifest V3** and `chrome.storage.local`.

---

## 🚀 Quick Installation Guide

You can install Jot either by downloading the pre-built release package or by building from source.

### Option A: Install from Release Zip (Recommended)

1. Download the latest release package (**`v0.1.0`**) zip file from the Releases page.
2. Extract the downloaded zip file to a folder on your computer.
3. Open **Brave** or **Chrome** and navigate to:
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
4. Enable **Developer mode** (toggle switch in the top-right corner).
5. Click **Load unpacked** in the top action bar.
6. Select the extracted release folder.
7. **Pin Jot** to your browser toolbar.

---

### Option B: Build & Install from Source

1. **Clone repository & install dependencies**:
   ```bash
   pnpm install
   ```

2. **Run tests**:
   ```bash
   pnpm test
   ```

3. **Build extension**:
   ```bash
   pnpm build
   ```
   This generates the compiled extension directory at `dist/`.

4. **Load into Browser**:
   - Go to `brave://extensions` (or `chrome://extensions`).
   - Enable **Developer mode**.
   - Click **Load unpacked** and select the **`dist/`** directory.
   - **Pin Jot** to your toolbar.

---

## 💡 Usage

1. **Create Note**: Click the toolbar icon, write your note, and click **Save Note**.
2. **View Notes**: Click **See Notes** to view your saved notes listed newest-first.
3. **Read & Edit Note**: Click any note item to open it in full view, edit the content, and click **Save Note**.
4. **Delete Note**: Click **Delete Note** and confirm in the dialog prompt.

---

## ✨ Key Features (Phase 1)

- **Toolbar Quick Access**: Open extension instantly from toolbar.
- **Immediate Focus**: Textarea auto-focuses on open.
- **Inline Validation & Feedback**: Clear status messages for saved or empty notes.
- **Notes List & Editable Detail**: Browse notes newest-first, read full text, or edit inline.
- **100% Offline & Private**: Stored locally in `chrome.storage.local`. Zero tracking, zero external APIs.

---

## 🛠️ Tech Stack & Structure

- **TypeScript** (Strict mode)
- **HTML5 & Vanilla CSS**
- **Manifest V3** & **Chromium Extension APIs**
- **Vite** & **Vitest**

```text
sample/
├── dist/                   # Compiled output folder for extension
├── public/                 # Extension icons & Manifest V3
├── src/
│   ├── popup/              # UI components (HTML, CSS, TypeScript)
│   ├── storage/            # chrome.storage.local data handling
│   ├── types/              # TypeScript interfaces (Note)
│   ├── utils/              # Date formatting utilities
│   └── __tests__/          # Vitest test suite
├── package.json
└── README.md
```
