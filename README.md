# Trove

> Lightweight browser-native note and task capture.

Trove is a browser extension I built to quickly capture notes and tasks without leaving the page I'm working on. Built for those moments when you're watching a video, reading an article, or browsing and need to write something down immediately.

---

## Features

- Quick note-taking with edit & delete
- Simple todo list with completion tracking
- Keyboard shortcuts for direct access
- Local-first storage — no account required
- Works fully offline
- Dark Neo-Brutalist UI

---

## Installation

### Download release

1. Download the latest release zip.
2. Extract to a folder.
3. Open `brave://extensions` (or `chrome://extensions`).
4. Enable **Developer mode**.
5. Click **Load unpacked** → select the `dist/` folder.
6. Pin Trove to your toolbar.

### Build from source

```bash
pnpm install
pnpm build
```

Then load the `dist/` folder as an unpacked extension.

---

## Usage

```
Home
├── Notes
└── Todos
```

**Notes** — Create, edit, and delete notes stored newest-first.

**Todos** — Add tasks, mark complete, delete individually or in bulk.

**Keyboard shortcuts**

| Shortcut | Action |
| --- | --- |
| `Alt + Shift + A` | Open Notes |
| `Alt + Shift + S` | Open Todos |

Shortcuts can be customized at `brave://extensions/shortcuts`.

---

## Development

```bash
pnpm install     # install dependencies
pnpm test        # run unit tests
pnpm build       # production build → dist/
```

**Tech stack:** TypeScript · Vite · Vitest · Manifest V3 · Chrome Extension APIs

```
src/
├── background/   # Extension command handling
├── popup/        # Extension UI (HTML, CSS, TS)
├── storage/      # Local persistence
├── types/        # Shared interfaces
└── utils/        # Utilities
```

---

## Privacy

Trove stores notes and todos locally using `chrome.storage.local`. It does not require an account, send data to a server, or use external APIs.

---

## License

Trove is licensed under the MIT License.
