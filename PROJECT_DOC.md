# Trove — Project Documentation

> Internal technical reference. See README.md for the user-facing summary.

---

## 1. Project Overview

### Problem
When browsing the web — watching a video, reading an article, doing research — you frequently need to capture a thought, a task, or a reference. Switching to a separate notes app breaks the flow. The browser itself is where the work happens, so the capture tool should live there too.

### Motivation
Trove was built as a personal tool to scratch that itch. It is intentionally minimal: it does one or two things and does them well, without the overhead of a full productivity application.

### Target use case
- Capturing thoughts mid-browse without switching apps
- Maintaining a lightweight task list that is always one keyboard shortcut away
- Keeping data local, private, and under full control

### Design philosophy
- **Fast**: Open, capture, close. No friction.
- **Local-first**: Your data stays on your machine. No accounts, no sync, no cloud.
- **Simple scope**: v0.1.0 is intentionally small. Every feature addition is a deliberate decision.
- **Dark Neo-Brutalist UI**: Strong visual identity without being loud or inaccessible.

---

## 2. Product Scope

### Current — v0.1.0
- Notes (create, edit, delete)
- Todos (add, complete, delete, bulk delete)
- Keyboard shortcuts (Alt+Shift+A, Alt+Shift+S)
- Home page as central navigation hub
- Local-only persistence via `chrome.storage.local`

### Explicitly excluded from v0.1.0
- Due dates, priorities, categories, tags
- Sorting, filtering, drag and drop
- Cloud sync, authentication, collaboration
- AI features
- Notifications or reminders

---

## 3. Features

### Notes
- Create a note via the Create Note view; input auto-focuses.
- Notes are stored and listed newest-first.
- Click any note card to open it in detail/edit view.
- Edit note content inline; save with the Save button.
- Delete note via Delete Note with a confirmation dialog.
- Empty or whitespace-only notes are rejected.

### Todos
- Add a todo via the input box; press Enter or click Add.
- Empty or whitespace-only todos are rejected.
- Toggle completion via checkbox; completed todos show strikethrough text.
- Delete individual todos via the Delete button on each item.
- Bulk delete via the Delete Todos button, which opens a modal with three options:
  - **Delete completed** — removes only completed todos.
  - **Delete all** — removes every todo.
  - **Cancel** — closes the modal without changes.
- Empty state shown when no todos exist.

### Keyboard shortcuts
- `Alt + Shift + A` → Opens extension directly to Notes.
- `Alt + Shift + S` → Opens extension directly to Todos.
- `Alt + Shift + D` is intentionally unassigned (reserved for future use).
- Shortcuts are registered via the native Chrome extension command API.
- Can be customized by the user at `brave://extensions/shortcuts`.

### Navigation
- Extension opens to Home by default.
- Home → Notes, Home → Todos.
- Notes → Home, Todos → Home.
- Notes list → Note detail/edit → Notes list.
- Keyboard shortcuts bypass Home and open the target section directly.

---

## 4. Tech Stack

| Tool | Purpose |
| --- | --- |
| TypeScript | Type-safe development |
| Vite | Build tool and dev server |
| Vitest | Unit testing |
| Chrome Extension Manifest V3 | Extension platform |
| `chrome.storage.local` | Local persistence |
| `chrome.storage.session` | Transient shortcut routing state |
| Vanilla HTML/CSS | UI, zero framework overhead |

No runtime JavaScript libraries. No React, Vue, or Angular.

---

## 5. Architecture

### Extension structure

```
Trove/
├── public/
│   ├── manifest.json       # Extension manifest (source of truth for build)
│   └── icons/              # Extension icons (16, 48, 128)
├── src/
│   ├── background/
│   │   └── background.ts   # MV3 service worker
│   ├── popup/
│   │   ├── popup.html      # Single-page popup shell
│   │   ├── popup.css       # Full design system
│   │   └── popup.ts        # View controller and all UI logic
│   ├── storage/
│   │   ├── notes.ts        # Notes CRUD + persistence
│   │   └── todos.ts        # Todos CRUD + persistence
│   ├── types/
│   │   ├── note.ts         # Note interface
│   │   └── todo.ts         # Todo interface
│   ├── utils/
│   │   └── date.ts         # Date formatting utilities
│   └── __tests__/
│       ├── notes.test.ts   # Notes storage test suite
│       └── todos.test.ts   # Todos storage test suite
├── manifest.json           # Root manifest (reference copy, not used by build)
├── vite.config.ts
├── tsconfig.json
└── vitest.config.ts
```

> **Important:** `public/manifest.json` is the file Vite copies to `dist/`. The root `manifest.json` is a reference copy and is not used by the build.

### Popup lifecycle
The popup is a self-contained single-page application running inside the browser extension popup window. It mounts on `DOMContentLoaded`, checks for a shortcut-triggered `targetView` in storage, and navigates to the appropriate view or defaults to Home.

### View state machine
The popup uses a finite state machine with five states:

```
home → notes-list → note-create
                 → note-detail
     → todos
```

Navigation is handled by the `navigateTo()` function which toggles CSS `hidden`/`active` classes and manages focus.

### Background service worker
The MV3 service worker (`background.ts`) listens for `chrome.commands.onCommand` events. When a shortcut is triggered:
1. Sets `targetView` in `chrome.storage.session` (fallback to `chrome.storage.local`).
2. Calls `chrome.action.openPopup()`.

The popup reads and clears `targetView` on mount in `checkShortcutLaunch()`.

---

## 6. Data Model

### Note

```typescript
interface Note {
  id: string;         // UUID or fallback timestamp-random
  content: string;    // Trimmed note text
  createdAt: number;  // Unix timestamp (ms)
}
```

Storage key: `trove_notes`

### Todo

```typescript
interface Todo {
  id: string;         // UUID or fallback timestamp-random
  text: string;       // Trimmed todo text
  completed: boolean; // Completion state
  createdAt: number;  // Unix timestamp (ms)
}
```

Storage key: `trove_todos`

---

## 7. Storage Layer

Both `storage/notes.ts` and `storage/todos.ts` follow the same pattern:

- Read from `chrome.storage.local` using a named key.
- Sort results by `createdAt` descending (newest first) on retrieval.
- Write operations are serialized through a sequential Promise queue (`withStorageLock`) to prevent race conditions on rapid concurrent modifications.
- Validation (empty content rejection) happens before any storage operation.
- Each module has isolated error handling and throws typed error messages.

---

## 8. Design System

### Color palette

| Token | Value | Usage |
| --- | --- | --- |
| Background | `#F5EED6` | Warm cream base |
| Text | `#111111` | Primary text, borders |
| Red | `#F20D2F` | Primary actions, accents |
| Blue | `#315C98` | Secondary actions, todos accent |
| White | `#FFFDF5` | Card surfaces |

### Typography
System sans-serif stack. Bold (700–900) for headings and labels. Uppercase for section titles and buttons. Strong hierarchy across all views.

### Borders and shadows
- Cards and interactive elements: `3px solid #111111`
- Hard offset shadow: `4px 4px 0 #111111`
- Hover state: `transform: translate(-2px, -2px)` + larger shadow
- Active/pressed state: `transform: translate(2px, 2px)` + smaller shadow

### Decorative layer
Memphis-inspired geometric shapes (stripes, squares, dots) are rendered in a `.memphis-bg` layer with `pointer-events: none`. They are purely decorative and do not affect layout or interaction.

### UI principles
- No glassmorphism, no blur-heavy effects, no gradients
- No pill buttons, no excessive border radius
- Every interactive element has a visible `:focus-visible` state
- Decorative elements never overlap interactive elements

---

## 9. Performance

_Measurements to be added as the project matures._

**Current build output (v0.1.0):**
- `popup.html`: ~7.3 KB (gzip: ~1.6 KB)
- `popup.css`: ~11.4 KB (gzip: ~2.4 KB)
- `popup.js`: ~13.5 KB (gzip: ~3.4 KB)
- `background.js`: ~0.5 KB (gzip: ~0.3 KB)

Total compressed transfer: ~7.7 KB

**Known considerations:**
- `loadAndRenderNotesList()` and `loadAndRenderTodosList()` rebuild all DOM nodes on each navigation. This is fine for small datasets but would need key-based diffing or `DocumentFragment` batching at scale (hundreds of items).

---

## 10. Architectural Decisions

### Why no framework (React/Vue/Svelte)?
The popup is small and self-contained. A framework would add bundle weight, a build-time transform step, and conceptual overhead that outweighs the benefits for this scope. Vanilla TypeScript with direct DOM manipulation is faster to load, easier to reason about, and produces a smaller final bundle.

### Why `chrome.storage.local` and not `localStorage`?
`chrome.storage.local` is the correct API for extension storage. It is accessible from background workers and popup contexts consistently. `localStorage` is scoped to the popup page's origin and is not accessible from service workers.

### Why no backend?
Trove's core value proposition is local-first capture. Adding a backend would introduce authentication, latency, sync conflicts, infrastructure cost, and privacy risk — none of which serve the use case.

### Why MV3 service worker for shortcuts?
Chrome/Brave extensions must use the `chrome.commands` API to register global keyboard shortcuts. Implementing shortcuts purely via `document.addEventListener('keydown')` in the popup would only work while the popup is open, defeating the purpose of a direct-access shortcut.

### Why session storage for shortcut routing?
`chrome.storage.session` is ephemeral — it clears automatically when the browser session ends. It is the correct primitive for passing transient routing state from the background worker to the popup. `chrome.storage.local` is used as a fallback for browsers that do not support `session`.

---

## 11. Development

```bash
pnpm install     # Install dependencies
pnpm test        # Run Vitest unit tests (watch: pnpm test -- --watch)
pnpm build       # Type-check + production build → dist/
```

### Loading in browser (development)
1. Run `pnpm build`.
2. Navigate to `brave://extensions` or `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** → select `dist/`.
5. Reload after each build: click the refresh icon on the extension card.

### Testing
Unit tests live in `src/__tests__/`. They mock `chrome.storage.local` using Vitest's `vi.fn()` and test storage logic in isolation. The popup UI is not currently covered by automated tests.

---

## 12. Release History

### v0.1.0
- Initial release
- Product renamed from Jot to Trove
- Neo-Brutalist + Memphis visual identity
- Central Home page with Notes and Todos navigation
- Notes: create, edit, delete (ported from Phase 1)
- Todos: add, complete, delete, bulk delete with confirmation modal
- Keyboard shortcuts: `Alt+Shift+A` (Notes), `Alt+Shift+S` (Todos)
- Background service worker for native command handling
- Manifest V3 commands registration

---

## 13. Future Roadmap

_Possible future directions — not committed._

- Quick capture mode (open directly to input without navigating Home)
- Note search
- Note/todo count indicators on Home page
- Performance profiling and DOM render optimization
- Options page for user preferences
- Export notes/todos as JSON or plain text
- v0.2.0 scope TBD
