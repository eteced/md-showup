const Utils = {
    getStored(key, defaultVal) {
        const v = localStorage.getItem(key);
        return v !== null ? JSON.parse(v) : defaultVal;
    },

    setStored(key, val) {
        localStorage.setItem(key, JSON.stringify(val));
    },

    formatSize(bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    },

    getSessionCookie() {
        const parts = document.cookie.split("; ");
        for (const part of parts) {
            if (part.startsWith("md_session=")) {
                return part.substring("md_session=".length);
            }
        }
        return null;
    }
};
