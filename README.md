# Trove

> Lightweight browser-native note and task capture.

Trove is a browser extension built to quickly capture notes and tasks without leaving the page you're working on. Built for those moments when you're watching a video, reading an article, or browsing and need to write something down immediately.

---

## Features

- Frictionless quick-capture for notes and todos
- Quick note-taking with `Ctrl + Enter` save and full edit & delete
- Todo list with inline editing, drag-and-drop reordering, and completion tracking
- Performance optimized for minimal memory and CPU footprint
- Custom scroll indicator control with native scrollbar hidden
- Keyboard shortcuts for instant access (`Alt + Shift + A`, `Alt + Shift + S`)
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

**Notes** — Create (`Ctrl + Enter` to save), view, edit, and delete notes (individually from the list or detail view).

**Todos** — Add tasks (appended to bottom), inline edit, drag-and-drop reorder, toggle completion, and delete individually or in bulk.

**Keyboard Shortcuts & Quick Capture Workflows**

| Shortcut | Action | Frictionless Workflow |
| --- | --- | --- |
| `Alt + Shift + A` | Quick Capture Note | Opens directly into Create Note mode with editor auto-focused → Type → `Ctrl + Enter` to save |
| `Alt + Shift + S` | Quick Capture Todo | Opens directly to Todos with input auto-focused → Type → `Enter` to add & remain focused |

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
