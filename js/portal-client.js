const BREASTCARE_WEB = "https://breast-cancer-da2.onrender.com";
const BREASTCARE_API = "https://breast-cancer-da2-api.onrender.com";
const PORTAL_SESSION_KEY = "identity_portal_token";
const HANDOFF_VALUE = /^[A-Za-z0-9_-]{43}$/;

function portalToken() {
    return sessionStorage.getItem(PORTAL_SESSION_KEY);
}

async function portalRequest(path, { body, token = portalToken(), signal } = {}) {
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (body !== undefined) headers.set("Content-Type", "application/json");

    const response = await fetch(`${BREASTCARE_API}/account/${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal,
    });
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.detail || "Dịch vụ tài khoản tạm thời không khả dụng.");
        error.status = response.status;
        throw error;
    }
    return data;
}

async function endPortalSession() {
    const token = portalToken();
    sessionStorage.removeItem(PORTAL_SESSION_KEY);
    if (!token) return;

    try {
        await portalRequest("portal/logout", {
            body: {},
            token,
            signal: AbortSignal.timeout(5000),
        });
    } catch {
        // The browser session is already cleared. A server token will expire automatically.
    }
}

window.addEventListener("pageshow", (event) => {
    if (event.persisted) location.reload();
});
