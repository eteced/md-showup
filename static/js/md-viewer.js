const MdViewer = {
    md: null,
    tocCollapsed: Utils.getStored("md_toc_collapsed", false),
    defaultTocRatio: 0.25,
    defaultReopenTop: null, // computed on init

    init() {
        this.md = window.markdownit({
            html: false,
            linkify: true,
            typographer: true,
            highlight: function (str, lang) {
                if (lang && window.hljs && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(str, { language: lang }).value;
                    } catch (_) {}
                }
                return "";
            },
        });

        this.initDivider();
        this.initTocToggle();
        this.restoreTocWidth();
        this.restoreTocState();

        const path = decodeURIComponent(window.location.pathname.slice("/view/".length));
        if (path) {
            this.loadFile(path);
        }
    },

    async loadFile(path) {
        const resp = await Auth.apiFetch("/api/file/" + encodeURIComponent(path));
        if (!resp.ok) return;
        const data = await resp.json();

        document.getElementById("file-name").textContent = data.name;
        document.title = data.name + " - MD Showup";

        const contentEl = document.getElementById("md-content");
        contentEl.innerHTML = this.md.render(data.content);

        this.makeCodeBlocksCollapsible(contentEl);
        this.makeBlockquotesCollapsible(contentEl);
        this.buildTOC(contentEl);
        contentEl.parentElement.scrollTop = 0;
    },

    // ---- Collapsible Code Blocks ----
    makeCodeBlocksCollapsible(container) {
        const pres = container.querySelectorAll("pre");
        pres.forEach(pre => {
            const code = pre.querySelector("code");
            if (!code) return;

            const langClass = Array.from(code.classList).find(c => c.startsWith("language-"));
            const lang = langClass ? langClass.replace("language-", "") : "";

            const wrapper = document.createElement("div");
            wrapper.className = "code-block";

            const header = document.createElement("div");
            header.className = "code-block-header";
            header.innerHTML = `
                <span class="code-block-lang">${lang || "code"}</span>
                <span class="code-block-toggle">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </span>
            `;

            const body = document.createElement("div");
            body.className = "code-block-body";

            pre.parentNode.insertBefore(wrapper, pre);
            body.appendChild(pre);
            wrapper.appendChild(header);
            wrapper.appendChild(body);

            header.addEventListener("click", () => {
                wrapper.classList.toggle("collapsed");
            });
        });
    },

    // ---- Collapsible Blockquotes ----
    makeBlockquotesCollapsible(container) {
        const blockquotes = container.querySelectorAll("blockquote");
        blockquotes.forEach(bq => {
            // Skip if already wrapped
            if (bq.parentElement.classList.contains("quote-block-body")) return;

            const firstLine = bq.textContent.trim().split("\n")[0];
            const preview = firstLine.length > 60 ? firstLine.slice(0, 60) + "..." : firstLine;

            const wrapper = document.createElement("div");
            wrapper.className = "quote-block";

            const header = document.createElement("div");
            header.className = "quote-block-header";
            header.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                <span>${this._escHtml(preview)}</span>
            `;

            const body = document.createElement("div");
            body.className = "quote-block-body";

            bq.parentNode.insertBefore(wrapper, bq);
            body.appendChild(bq);
            wrapper.appendChild(header);
            wrapper.appendChild(body);

            header.addEventListener("click", () => {
                wrapper.classList.toggle("collapsed");
            });
        });
    },

    _escHtml(s) {
        const d = document.createElement("div");
        d.textContent = s;
        return d.innerHTML;
    },

    buildTOC(container) {
        const headings = container.querySelectorAll("h1, h2, h3, h4");
        const tocEl = document.getElementById("toc-content");
        tocEl.innerHTML = "";

        if (headings.length === 0) {
            tocEl.textContent = "No headings";
            this._headings = [];
            this._tocLinks = [];
            return;
        }

        this._headings = Array.from(headings);
        this._tocLinks = [];

        const ul = document.createElement("ul");
        this._headings.forEach((h, i) => {
            const id = "toc-heading-" + i;
            h.id = id;
            const li = document.createElement("li");
            li.className = "toc-" + h.tagName.toLowerCase();
            const a = document.createElement("a");
            a.href = "#" + id;
            a.textContent = h.textContent;
            a.dataset.tocIndex = i;
            a.addEventListener("click", (e) => {
                e.preventDefault();
                h.scrollIntoView({ behavior: "smooth", block: "start" });
            });
            li.appendChild(a);
            ul.appendChild(li);
            this._tocLinks.push(a);
        });
        tocEl.appendChild(ul);
        this.initScrollSync();
    },

    // ---- Scroll Sync: highlight active TOC item ----
    _headings: [],
    _tocLinks: [],
    _scrollSyncInited: false,
    _activeTocIndex: -1,

    initScrollSync() {
        if (this._scrollSyncInited) return;
        this._scrollSyncInited = true;

        const wrapper = document.getElementById("md-content-wrapper");
        const tocEl = document.getElementById("toc-content");

        wrapper.addEventListener("scroll", () => {
            const idx = this._findActiveHeading(wrapper);
            if (idx === this._activeTocIndex) return;
            this._activeTocIndex = idx;

            this._tocLinks.forEach((a, i) => {
                a.classList.toggle("toc-active", i === idx);
            });

            if (idx >= 0 && this._tocLinks[idx]) {
                const link = this._tocLinks[idx];
                link.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        });
    },

    _findActiveHeading(wrapper) {
        const scrollTop = wrapper.scrollTop;
        const offset = 8;
        let active = -1;

        for (let i = 0; i < this._headings.length; i++) {
            const h = this._headings[i];
            const top = h.getBoundingClientRect().top - wrapper.getBoundingClientRect().top + scrollTop;
            if (top <= scrollTop + offset) {
                active = i;
            } else {
                break;
            }
        }
        return active;
    },

    // ---- TOC Toggle ----
    initTocToggle() {
        const btn = document.getElementById("toc-toggle");
        const panel = document.getElementById("toc-panel");
        const reopenBtn = document.getElementById("toc-reopen-btn");

        const chevronDown = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
        const chevronLeft = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';

        btn.addEventListener("click", () => {
            this.tocCollapsed = !this.tocCollapsed;
            panel.classList.toggle("collapsed", this.tocCollapsed);
            if (this.tocCollapsed) {
                btn.innerHTML = chevronLeft;
                btn.title = "Expand TOC";
                reopenBtn.style.display = "flex";
                this.resetReopenFade(reopenBtn);
            } else {
                btn.innerHTML = chevronDown;
                btn.title = "Collapse TOC";
                reopenBtn.style.display = "none";
            }
            this.saveTocState();
        });

        reopenBtn.addEventListener("click", (e) => {
            if (reopenBtn._dragged) return;
            this.tocCollapsed = false;
            panel.classList.remove("collapsed");
            btn.innerHTML = chevronDown;
            btn.title = "Collapse TOC";
            reopenBtn.style.display = "none";
            this.saveTocState();
        });

        // Double-click reopen button: reset position to default (center)
        reopenBtn.addEventListener("dblclick", (e) => {
            e.preventDefault();
            this.resetReopenBtnPosition(reopenBtn);
            this.saveTocState();
        });

        this.initReopenBtnDrag(reopenBtn);
    },

    // ---- Persist TOC state ----
    saveTocState() {
        Utils.setStored("md_toc_collapsed", this.tocCollapsed);
        const reopenBtn = document.getElementById("toc-reopen-btn");
        if (reopenBtn && this.tocCollapsed) {
            const top = parseInt(reopenBtn.style.top, 10);
            if (!isNaN(top)) {
                Utils.setStored("md_toc_reopen_top", top);
            }
        }
    },

    restoreTocState() {
        const panel = document.getElementById("toc-panel");
        const btn = document.getElementById("toc-toggle");
        const reopenBtn = document.getElementById("toc-reopen-btn");

        const chevronDown = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
        const chevronLeft = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';

        // Compute default center position
        this.defaultReopenTop = Math.round(window.innerHeight / 2 - 20);

        if (this.tocCollapsed) {
            panel.classList.add("collapsed");
            btn.innerHTML = chevronLeft;
            btn.title = "Expand TOC";
            reopenBtn.style.display = "flex";

            // Restore reopen button position
            const savedTop = Utils.getStored("md_toc_reopen_top", null);
            if (savedTop !== null) {
                const maxTop = window.innerHeight - 48;
                reopenBtn.style.top = Math.max(8, Math.min(maxTop, savedTop)) + "px";
                reopenBtn.style.transform = "none";
            }
            this.resetReopenFade(reopenBtn);
        } else {
            panel.classList.remove("collapsed");
            btn.innerHTML = chevronDown;
            btn.title = "Collapse TOC";
            reopenBtn.style.display = "none";
        }
    },

    resetReopenBtnPosition(btn) {
        const centerTop = Math.round(window.innerHeight / 2 - 20);
        btn.style.top = centerTop + "px";
        btn.style.transform = "none";
    },

    // ---- Reopen Button Drag & Fade ----
    _fadeTimer: null,

    resetReopenFade(btn) {
        btn.classList.remove("fade");
        clearTimeout(this._fadeTimer);
        this._fadeTimer = setTimeout(() => {
            if (btn.style.display !== "none") {
                btn.classList.add("fade");
            }
        }, 2500);
    },

    initReopenBtnDrag(btn) {
        let startY, startTop, dragging = false, moved = false;

        btn.addEventListener("mousedown", (e) => {
            e.preventDefault();
            dragging = true;
            moved = false;
            btn._dragged = false;
            startY = e.clientY;
            startTop = btn.getBoundingClientRect().top;
            btn.classList.add("dragging");
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        });

        const onMove = (e) => {
            if (!dragging) return;
            const dy = e.clientY - startY;
            if (Math.abs(dy) > 3) moved = true;
            const newTop = startTop + dy;
            const maxTop = window.innerHeight - 48;
            btn.style.top = Math.max(8, Math.min(maxTop, newTop)) + "px";
            btn.style.transform = "none";
        };

        const onUp = () => {
            dragging = false;
            btn.classList.remove("dragging");
            btn._dragged = moved;
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            if (moved) {
                this.saveTocState();
                setTimeout(() => { btn._dragged = false; }, 50);
            }
            this.resetReopenFade(btn);
        };

        btn.addEventListener("mouseenter", () => {
            btn.classList.remove("fade");
            clearTimeout(this._fadeTimer);
        });

        btn.addEventListener("mouseleave", () => {
            this.resetReopenFade(btn);
        });
    },

    // ---- Draggable Divider ----
    initDivider() {
        const divider = document.getElementById("divider");
        const tocPanel = document.getElementById("toc-panel");
        const viewerBody = document.querySelector(".viewer-body");
        let startX, startWidth;

        const onMouseDown = (e) => {
            e.preventDefault();
            startX = e.clientX;
            startWidth = tocPanel.getBoundingClientRect().width;
            divider.classList.add("active");
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        };

        const onMouseMove = (e) => {
            const dx = e.clientX - startX;
            const containerWidth = viewerBody.clientWidth;
            let newWidth = startWidth + dx;
            const minW = containerWidth * 0.1;
            const maxW = containerWidth * 0.5;
            newWidth = Math.max(minW, Math.min(maxW, newWidth));
            tocPanel.style.width = newWidth + "px";
        };

        const onMouseUp = () => {
            divider.classList.remove("active");
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            const containerWidth = viewerBody.clientWidth;
            const ratio = tocPanel.clientWidth / containerWidth;
            Utils.setStored("md_toc_ratio", ratio);
        };

        divider.addEventListener("mousedown", onMouseDown);

        divider.addEventListener("dblclick", () => {
            const containerWidth = viewerBody.clientWidth;
            tocPanel.style.width = (this.defaultTocRatio * containerWidth) + "px";
            Utils.setStored("md_toc_ratio", this.defaultTocRatio);
        });
    },

    restoreTocWidth() {
        const ratio = Utils.getStored("md_toc_ratio", null);
        if (ratio !== null) {
            const tocPanel = document.getElementById("toc-panel");
            tocPanel.style.width = (ratio * 100) + "%";
        }
    }
};