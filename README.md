# Heartless

A minimalist text and Markdown editor for macOS and Windows.

No clutter. No cloud. Just text.

Built out of frustration with the plain-text editors that ship with an OS:
fine for a quick note, awkward the moment you want tabs, Markdown that renders,
or a folder open on the side. Heartless sits between those and a full IDE — it
opens source files with syntax highlighting for reading and quick edits, but it
is a writing tool, not a development environment.

---

## Features

- **WYSIWYG** — write in rich text, Markdown stays hidden
- **Split view** — raw Markdown on the left, live preview on the right
- **Browser-style tabs** — work on multiple files at once, with dirty indicators
- **Code viewing** — source files open with syntax highlighting, search, and folding
- **File previews** — images, PDFs, and `.docx` open read-only in place
- **File explorer** — browse a folder, drag files into the editor as references
- **Snippet Vault** — save reusable fragments, drag-and-drop to insert
- **Native file dialogs** — open, save, and export `.md` files
- **Responsive layout** — adapts gracefully to narrow windows
- **Themes** — light, cream, and dark, with a built-in colour editor
- **Localised** — English, Português, 日本語

## Install

Grab the latest build from [Releases](https://github.com/hzguz/heartless-app/releases).

### A note on the security warning

The installers are **not code-signed**, so your OS will warn you the first time:

- **Windows** — SmartScreen shows *"Windows protected your PC"*.
  Click **More info** → **Run anyway**.
- **macOS** — Gatekeeper says the app *"cannot be opened because the developer
  cannot be verified"*. Right-click the app → **Open**, then confirm. Or:
  **System Settings → Privacy & Security → Open Anyway**.

This is expected for an unsigned independent build — not a sign of anything
malicious. Signing certificates cost a few hundred dollars a year, which is hard
to justify for a project given away for free. If you'd rather not trust a binary,
build it yourself from source (below) — that is exactly why the code is MIT.

## Building from source

> Requires [Node.js](https://nodejs.org) 18+ and [Yarn](https://yarnpkg.com).

```bash
yarn install
yarn dev
```

## Scripts

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `yarn dev`           | Start development (Vite + Electron)  |
| `yarn build`         | Compile for production               |
| `yarn package:mac`   | Build `.dmg` for macOS               |
| `yarn package:win`   | Build `.exe` installer for Windows   |
| `yarn test`          | Run the test suite (Vitest)          |
| `yarn tsc --noEmit`  | Type-check only                      |

## Tech stack

| Layer      | Technology                    |
| ---------- | ----------------------------- |
| Shell      | Electron                      |
| UI         | React 18 + TypeScript         |
| Bundler    | Vite                          |
| Editor     | Tiptap v2 + tiptap-markdown   |
| Styling    | Tailwind CSS                  |
| State      | Zustand                       |
| Animations | Framer Motion                 |

## License

[MIT](LICENSE) — use it, fork it, ship it, no strings attached.

Bundled open-source components are credited in
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
