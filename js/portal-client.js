const BREASTCARE_WEB = "https://breast-cancer-da2.onrender.com";
const BREASTCARE_API = "https://breast-cancer-da2-api.onrender.com";
const PORTAL_SESSION_KEY = "identity_portal_token";
const PORTAL_PROFILE_KEY = "identity_verified_profile";
const PORTAL_REQUEST_TIMEOUT_MS = 65000;
const PORTAL_PROFILE_MAX_AGE_MS = 5 * 60 * 1000;
const HANDOFF_VALUE = /^[A-Za-z0-9_-]{43}$/;

function portalToken() {
    return sessionStorage.getItem(PORTAL_SESSION_KEY);
}

function readPortalProfile() {
    try {
        const cached = JSON.parse(sessionStorage.getItem(PORTAL_PROFILE_KEY));
        const age = Date.now() - cached?.checkedAt;
        if (cached?.token === portalToken() && age >= 0 && age < PORTAL_PROFILE_MAX_AGE_MS) {
            return cached.profile;
        }
    } catch {
        // The portal can retrieve the profile from the API again.
    }
    return null;
}

function savePortalProfile(profile, token) {
    if (!profile || !token || token !== portalToken()) return;
    sessionStorage.setItem(
        PORTAL_PROFILE_KEY,
        JSON.stringify({
            token,
            profile,
            checkedAt: Date.now(),
        }),
    );
}

async function portalRequest(
    path,
    {
        body,
        token = portalToken(),
        signal = AbortSignal.timeout(PORTAL_REQUEST_TIMEOUT_MS),
        keepalive = false,
    } = {},
) {
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (body !== undefined) headers.set("Content-Type", "application/json");

    const response = await fetch(`${BREASTCARE_API}/account/${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal,
        keepalive,
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
    sessionStorage.removeItem(PORTAL_PROFILE_KEY);
    if (!token) return;

    try {
        await portalRequest("portal/logout", {
            body: {},
            token,
            signal: AbortSignal.timeout(5000),
            keepalive: true,
        });
    } catch {
        // The browser session is already cleared. A server token will expire automatically.
    }
}

window.addEventListener("pageshow", (event) => {
    if (event.persisted) location.reload();
});
