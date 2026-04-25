const FileList = {
    sortBy: Utils.getStored("md_sort_by", "name"),
    sortOrder: Utils.getStored("md_sort_order", "asc"),
    page: 1,
    pageSize: Utils.getStored("md_page_size", 50),
    total: 0,

    init() {
        const thead = document.querySelector("#file-table thead");
        thead.addEventListener("click", (e) => {
            const th = e.target.closest("th.sortable");
            if (!th) return;
            const col = th.dataset.sort;
            if (col === this.sortBy) {
                this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
            } else {
                this.sortBy = col;
                this.sortOrder = "asc";
            }
            Utils.setStored("md_sort_by", this.sortBy);
            Utils.setStored("md_sort_order", this.sortOrder);
            this.page = 1;
            this.load();
        });

        const tbody = document.getElementById("file-tbody");
        tbody.addEventListener("click", (e) => {
            const tr = e.target.closest("tr");
            if (!tr) return;
            const path = tr.dataset.path;
            if (path) {
                window.location.href = "/view/" + encodeURIComponent(path);
            }
        });

        this.initCellScroll(tbody);
        this.load();
    },

    async load() {
        const params = new URLSearchParams({
            sort_by: this.sortBy,
            sort_order: this.sortOrder,
            page: this.page,
            page_size: this.pageSize,
        });
        const resp = await Auth.apiFetch("/api/files?" + params);
        if (!resp.ok) return;
        const data = await resp.json();
        this.total = data.total;
        this.render(data.files);
        this.renderPagination();
        this.updateSortIndicators();
    },

    render(files) {
        const tbody = document.getElementById("file-tbody");
        tbody.innerHTML = "";
        const fileIcon = '<span class="file-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>';
        const dirIcon = '<span class="file-icon" style="color:var(--text-muted)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></span>';
        for (const f of files) {
            const tr = document.createElement("tr");
            tr.dataset.path = f.path;
            const nameDisplay = f.dir
                ? `${dirIcon}<span class="dir-label">${this._esc(f.dir)}/</span>${fileIcon}<span>${this._esc(f.name)}</span>`
                : `${fileIcon}<span>${this._esc(f.name)}</span>`;
            tr.innerHTML = `
                <td><div class="cell-scroll">${nameDisplay}</div></td>
                <td><div class="cell-scroll"><span>${this._esc(f.mtime_display)}</span></div></td>
                <td><div class="cell-scroll"><span>${this._esc(f.size_display)}</span></div></td>
            `;
            tbody.appendChild(tr);
        }
    },

    renderPagination() {
        const el = document.getElementById("pagination");
        const totalPages = Math.max(1, Math.ceil(this.total / this.pageSize));
        const page = Math.min(this.page, totalPages);

        el.innerHTML = "";

        const info = document.createElement("span");
        info.textContent = `${this.total} files, page ${page}/${totalPages}`;

        const controls = document.createElement("span");
        controls.style.display = "flex";
        controls.style.alignItems = "center";
        controls.style.gap = "6px";

        const prevBtn = document.createElement("button");
        prevBtn.textContent = "Prev";
        prevBtn.disabled = page <= 1;
        prevBtn.onclick = () => { this.page--; this.load(); };

        const nextBtn = document.createElement("button");
        nextBtn.textContent = "Next";
        nextBtn.disabled = page >= totalPages;
        nextBtn.onclick = () => { this.page++; this.load(); };

        const sizeLabel = document.createElement("span");
        sizeLabel.textContent = "Per page:";

        const sizeSelect = document.createElement("select");
        [20, 50, 100, 200].forEach(n => {
            const opt = document.createElement("option");
            opt.value = n;
            opt.textContent = n;
            if (n === this.pageSize) opt.selected = true;
            sizeSelect.appendChild(opt);
        });
        sizeSelect.onchange = () => {
            this.pageSize = parseInt(sizeSelect.value);
            Utils.setStored("md_page_size", this.pageSize);
            this.page = 1;
            this.load();
        };

        controls.append(prevBtn, nextBtn, sizeLabel, sizeSelect);
        el.append(info, controls);
    },

    updateSortIndicators() {
        document.querySelectorAll("#file-table th.sortable").forEach(th => {
            th.classList.remove("sort-asc", "sort-desc");
            if (th.dataset.sort === this.sortBy) {
                th.classList.add(this.sortOrder === "asc" ? "sort-asc" : "sort-desc");
            }
        });
    },

    // ---- Cell auto-scroll ----
    _cellAnimations: new Map(),

    initCellScroll(tbody) {
        tbody.addEventListener("mouseover", (e) => {
            const cell = e.target.closest("td");
            if (!cell) return;
            if (this._cellAnimations.has(cell)) return;
            this.startCellScroll(cell);
        });

        tbody.addEventListener("mouseout", (e) => {
            const cell = e.target.closest("td");
            if (!cell) return;
            const related = e.relatedTarget;
            if (related && cell.contains(related)) return;
            this.stopCellScroll(cell);
        });
    },

    startCellScroll(td) {
        const wrapper = td.querySelector(".cell-scroll");
        if (!wrapper) return;

        const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
        if (maxScroll <= 0) return;

        let phase = "scroll-right";
        let animId = null;
        let pauseTimer = null;
        const speed = 0.5;

        const cancel = () => {
            if (animId) cancelAnimationFrame(animId);
            if (pauseTimer) clearTimeout(pauseTimer);
            animId = null;
            pauseTimer = null;
        };

        const tick = () => {
            if (phase === "scroll-right") {
                wrapper.scrollLeft += speed;
                if (wrapper.scrollLeft >= maxScroll - 0.5) {
                    wrapper.scrollLeft = maxScroll;
                    phase = "pause-end";
                    pauseTimer = setTimeout(() => {
                        phase = "scroll-left";
                        animId = requestAnimationFrame(tick);
                    }, 2000);
                    return;
                }
            } else if (phase === "scroll-left") {
                wrapper.scrollLeft -= speed;
                if (wrapper.scrollLeft <= 0.5) {
                    wrapper.scrollLeft = 0;
                    phase = "pause-start";
                    pauseTimer = setTimeout(() => {
                        phase = "scroll-right";
                        animId = requestAnimationFrame(tick);
                    }, 2000);
                    return;
                }
            }
            animId = requestAnimationFrame(tick);
        };

        this._cellAnimations.set(td, cancel);
        animId = requestAnimationFrame(tick);
    },

    stopCellScroll(td) {
        const cancel = this._cellAnimations.get(td);
        if (cancel) {
            cancel();
            this._cellAnimations.delete(td);
        }
        const wrapper = td.querySelector(".cell-scroll");
        if (wrapper) wrapper.scrollLeft = 0;
    },

    _esc(s) {
        const d = document.createElement("div");
        d.textContent = s;
        return d.innerHTML;
    }
};
