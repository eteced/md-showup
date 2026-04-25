const Auth = {
    _ready: false,
    _readyCalled: false,

    async login(apiKey) {
        const resp = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: apiKey }),
        });
        if (!resp.ok) {
            const data = await resp.json().catch(() => ({}));
            throw new Error(data.error || "Login failed");
        }
        return true;
    },

    async logout() {
        await fetch("/api/logout", { method: "POST" });
    },

    isLoggedIn() {
        return !!Utils.getSessionCookie();
    },

    async apiFetch(url, options = {}) {
        const resp = await fetch(url, options);
        if (resp.status === 401) {
            this.showLogin();
            throw new Error("Session expired");
        }
        return resp;
    },

    showLogin() {
        const overlay = document.getElementById("login-overlay");
        if (overlay) overlay.style.display = "flex";
    },

    hideLogin() {
        const overlay = document.getElementById("login-overlay");
        if (overlay) overlay.style.display = "none";
    },

    _callPageReady() {
        if (this._readyCalled) return;
        this._readyCalled = true;
        if (typeof onPageReady === "function") onPageReady();
    },

    initLogin() {
        if (this._ready) return;
        this._ready = true;

        const form = document.getElementById("login-form");
        const errorEl = document.getElementById("login-error");

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            errorEl.textContent = "";
            const apiKey = document.getElementById("api-key-input").value.trim();
            if (!apiKey) {
                errorEl.textContent = "Please enter an API key";
                return;
            }
            try {
                await Auth.login(apiKey);
                Auth.hideLogin();
                Auth._callPageReady();
            } catch (err) {
                errorEl.textContent = err.message || "Login failed";
            }
        });
    },

    async checkOrPrompt() {
        this.initLogin();

        if (!this.isLoggedIn()) {
            this.showLogin();
            return;
        }

        // Verify session is still valid
        try {
            const resp = await fetch("/api/files?sort_by=name&sort_order=asc&page=1&page_size=1");
            if (resp.ok) {
                this.hideLogin();
                this._callPageReady();
            } else {
                this.showLogin();
            }
        } catch {
            this.showLogin();
        }
    }
};
