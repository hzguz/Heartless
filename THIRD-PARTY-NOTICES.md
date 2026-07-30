# Third-Party Notices

Heartless is distributed under the MIT License (see [LICENSE](LICENSE)) and
bundles the open-source components listed below. All are permissively licensed;
none impose copyleft obligations on this project.

This file is provided as attribution. Each project's own licence text ships
inside its package under `node_modules/<name>/`.

---

## Apache License 2.0

- **pdfjs-dist** — Mozilla Foundation — https://github.com/mozilla/pdf.js

> Licensed under the Apache License, Version 2.0. A copy of the licence is
> available at http://www.apache.org/licenses/LICENSE-2.0

## BSD 2-Clause

- **mammoth** — Michael Williamson — https://github.com/mwilliamson/mammoth.js

## ISC

- **lucide-react** — Lucide Contributors — https://github.com/lucide-icons/lucide

## MIT

**Runtime / framework**
- electron — https://github.com/electron/electron
- react, react-dom — https://github.com/facebook/react
- zustand — https://github.com/pmndrs/zustand
- framer-motion — https://github.com/motiondivision/motion

**Editor (Tiptap / ProseMirror)**
- @tiptap/react, @tiptap/starter-kit, @tiptap/pm
- @tiptap/extension-link, @tiptap/extension-placeholder
- @tiptap/extension-task-item, @tiptap/extension-task-list
- tiptap-markdown — https://github.com/aguingand/tiptap-markdown

**Code editor (CodeMirror 6)**
- @codemirror/state, @codemirror/view, @codemirror/language
- @codemirror/commands, @codemirror/search
- @codemirror/lang-css, @codemirror/lang-html, @codemirror/lang-javascript
- @codemirror/lang-json, @codemirror/lang-markdown, @codemirror/lang-php
- @codemirror/lang-xml
- @lezer/highlight
- @replit/codemirror-indentation-markers

**Other**
- marked — https://github.com/markedjs/marked
- @tanstack/react-virtual — https://github.com/TanStack/virtual

---

## Fonts

Heartless ships no font files. It uses the fonts already present on the
operating system, in this order of preference:

- Monospace: `ui-monospace`, `SFMono-Regular`, `JetBrains Mono`, `Menlo`, `Consolas`
- Sans: `-apple-system`, `BlinkMacSystemFont`, `Inter`, `Segoe UI`, `Helvetica Neue`, `Arial`

`JetBrains Mono` and `Inter` are only used if the user happens to have them
installed locally; nothing is downloaded at runtime.
