# Trive — Browser Extension (v0.1.0)

Trive is a fast, clean, local browser extension for capturing notes and managing tasks quickly before they disappear.

Built for **Brave Browser** and all **Chromium-based browsers** (Chrome, Edge, Opera) using **Manifest V3** and `chrome.storage.local`.

---

## 🚀 Quick Installation Guide

You can install Trive either by downloading the pre-built release package or by building from source.

### Option A: Install from Release Zip (Recommended)

1. Download the latest release package (**`v0.1.0`**) zip file.
2. Extract the downloaded zip file to a folder on your computer.
3. Open **Brave** or **Chrome** and navigate to:
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
4. Enable **Developer mode** (toggle switch in top-right corner).
5. Click **Load unpacked** in top action bar.
6. Select the extracted release folder (`dist/`).
7. **Pin Trive** to your browser toolbar.

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
   - **Pin Trive** to your toolbar.

---

## ⌨️ Keyboard Shortcuts

Access Trive features directly with left-hand accessible shortcuts:

- **Alt + Shift + A** → Open Notes directly
- **Alt + Shift + S** → Open Todos directly

Shortcuts can also be customized in your browser's extension shortcut settings (`chrome://extensions/shortcuts` or `brave://extensions/shortcuts`).

---

## 💡 Usage & Sections

### 🏠 Home Page
Central hub with direct navigation to **Notes** and **Todos**.

### 📝 Notes
1. **Create Note**: Click **Notes** → **+ New**, write your note, and click **Save Note**.
2. **View Notes**: Browse your saved notes listed newest-first.
3. **Edit Note**: Click any note card to open detail view, edit content, and click **Save Note**.
4. **Delete Note**: Click **Delete Note** and confirm in the dialog.

### ☑️ Todos
1. **Add Todo**: Type a task in the input box and press **Enter** or click **Add**.
2. **Complete Todo**: Click the checkbox to toggle completion state.
3. **Delete Individual Todo**: Click **Delete** on any task item.
4. **Bulk Delete**: Click **Delete Todos** to open prompt offering to **Delete completed**, **Delete all**, or **Cancel**.

---

## ✨ Key Features (v0.1.0)

- **Neo-Brutalist Visual Identity**: High-contrast, bold typography, hard offset shadows, Memphis geometric accents.
- **Direct Keyboard Access**: Direct shortcuts to Notes and Todos.
- **Notes & Todos**: Simple, fast local note-taking and task list.
- **100% Offline & Private**: Stored locally in `chrome.storage.local`. Zero tracking, zero external APIs.

---

## 🛠️ Tech Stack & Structure

- **TypeScript** (Strict mode)
- **HTML5 & Vanilla CSS** (Neo-Brutalist + Memphis style)
- **Manifest V3** & **Chromium Extension APIs**
- **Vite** & **Vitest**

```text
Trive/
├── dist/                   # Compiled output folder for extension
├── public/                 # Extension icons
├── src/
│   ├── background/         # Background service worker for commands
│   ├── popup/              # UI views (HTML, CSS, TypeScript)
│   ├── storage/            # Local storage handling (notes & todos)
│   ├── types/              # TypeScript interfaces (Note, Todo)
│   ├── utils/              # Date formatting utilities
│   └── __tests__/          # Vitest test suite
├── manifest.json
├── package.json
└── README.md
```
