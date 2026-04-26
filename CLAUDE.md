# CLAUDE.md

## Project Overview

MD Showup is a self-hosted Markdown file browsing website. Users authenticate with an API key, then browse and read `.md` files from a configured directory. Built with Python/Flask backend and vanilla HTML/CSS/JS frontend.

## Architecture

**Two-page SPA**: File list (`/`) and Markdown viewer (`/view/<path>`). Both pages share the same login overlay, CSS, and JS utilities. Navigation is full page transitions (not client-side routing).

### Backend (Python/Flask)

- `app.py` — Flask routes, `@before_request` auth hook. Page routes (`/`, `/view/*`) always serve HTML; auth is enforced on API routes only.
- `auth.py` — HMAC-signed session cookies. Sessions stored in-memory dict (`_sessions`). Cookie is `md_session=<token>.<hmac_signature>`, `SameSite=Lax`, no `HttpOnly` (JS reads it to detect login state).
- `file_service.py` — `os.walk()` recursive scan of `config.MD_DIRECTORY`. Server-side sort and pagination. Path traversal protection via `os.path.realpath()` + `startswith()` check.
- `config.py` — All deployable settings. **Not committed to git** (use `config.py.template`).

### Frontend (Vanilla JS)

- `auth.js` — Shared auth module. `checkOrPrompt()` on page load: if cookie exists, verify via API; else show login overlay. `_readyCalled` flag prevents double init.
- `file-list.js` — Fetches `/api/files`, renders sortable table. Sort state (`md_sort_by`, `md_sort_order`) and page size (`md_page_size`) persisted to localStorage. Cell auto-scroll on hover for overflow content.
- `md-viewer.js` — Fetches `/api/file/<path>`, renders with markdown-it + KaTeX math. Extracts headings → TOC sidebar. TOC collapse state + reopen button position persisted. Draggable divider between TOC and content. Code blocks and blockquotes wrapped in collapsible containers. Scroll sync highlights active TOC item.
- `utils.js` — `getStored`/`setStored` localStorage wrappers, `getSessionCookie()` reader.
- `files-page.js` / `viewer-page.js` — Page-specific init, call `onPageReady()` after auth.

### Static Assets

- `static/vendor/` — Self-hosted markdown-it, highlight.js, KaTeX, github.min.css (no CDN dependencies)
- `static/vendor/katex-fonts/` — Self-hosted KaTeX woff2 fonts
- `static/fonts/` — Self-hosted Noto Sans Mono CJK SC (16MB OTF, for CJK monospace in code blocks)
- `static/css/style.css` — CSS variables for theming (`--primary`, `--bg`, etc.), full-viewport layout

## Key Design Decisions

- **No framework**: Vanilla JS keeps it simple and dependency-free
- **Server-side pagination**: `/api/files` returns paginated results, not the full list
- **In-memory sessions**: Single-process tool, no database needed. Sessions lost on restart (acceptable)
- **Cookie not HttpOnly**: JS needs to read `md_session` cookie to detect login state without an API call
- **Page routes bypass auth**: `/` and `/view/*` always serve HTML; client-side JS handles the login overlay
- **No external CDN**: All JS/CSS/fonts self-hosted for reliability (especially in China where Google/Cloudflare CDNs may be blocked)

## Common Tasks

### Adding a new API endpoint
1. Add route in `app.py`
2. If it needs auth, it's automatic (all `/api/*` routes require auth by default)
3. If it should bypass auth, add a condition in `auth.py` `require_auth()`

### Modifying the file list table
- Backend: `file_service.py` `_scan_files()` and `list_files()`
- Frontend: `file-list.js` `render()` method, `style.css` `#file-table` section

### Modifying the markdown viewer
- Rendering: `md-viewer.js` `loadFile()` and `makeCodeBlocksCollapsible()` / `makeBlockquotesCollapsible()`
- Math: `md-viewer.js` `_katexPlugin()` — inline `$...$` and block `$$...$$` via KaTeX
- TOC: `md-viewer.js` `buildTOC()`, `initTocToggle()`, `initReopenBtnDrag()`, `initScrollSync()`
- Divider: `md-viewer.js` `initDivider()`
- Styles: `style.css` `.md-content`, `.toc-panel`, `.code-block`, `.quote-block` sections

### Changing the color theme
- Edit CSS variables in `:root` at the top of `style.css`

## Running

```bash
cp config.py.template config.py  #Edit API_KEY, SESSION_SECRET, etc.
pip install -r requirements.txt
python app.py
```

Server runs on `0.0.0.0:<PORT>` with `debug=False`.

## Testing

No automated tests currently. Manual testing:
1. Start server, visit `/`, enter API key
2. Verify file list loads, sort/pagination works
3. Click a file, verify markdown renders with TOC
4. Test TOC collapse/expand, divider drag, double-click reset
5. Refresh page — verify all state persists (sort, page size, TOC width, collapse state)
6. Test direct URL access: `/view/some-file.md`