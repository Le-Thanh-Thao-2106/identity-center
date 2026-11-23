const catalog = document.getElementById("appCatalog");
const hubMessage = document.getElementById("hubMessage");
const logoutButton = document.getElementById("logoutButton");
const openBreastCare = document.getElementById("openBreastCare");
const consent = document.getElementById("appConsent");
const consentButtons = [...consent.querySelectorAll("button[data-decision]")];
let launchPending = false;

function showHubMessage(message, error = false) {
    hubMessage.textContent = message;
    hubMessage.hidden = !message;
    hubMessage.dataset.error = String(error);
}

function launchParams() {
    const params = new URLSearchParams(location.search);
    const app = params.get("app");
    const state = params.get("state");
    const codeChallenge = params.get("code_challenge");

    if (app !== "breastcare" || !HANDOFF_VALUE.test(state) || !HANDOFF_VALUE.test(codeChallenge)) {
        return null;
    }

    return { app, state, codeChallenge };
}

function clearLaunch() {
    history.replaceState(null, "", "/");
}

function showPortalProfile(profile) {
    const name = profile.full_name || profile.email || "Người dùng";
    document.getElementById("accountName").textContent = name;
    document.getElementById("accountAvatar").textContent =
        Array.from(name)[0].toLocaleUpperCase("vi");
    catalog.hidden = false;
    logoutButton.hidden = false;
    openBreastCare.textContent =
        profile.permissions?.breastcare === false ? "Cấp quyền để mở BreastCare" : "Mở BreastCare";
}

function showPortalError(error) {
    if (error.status === 401) {
        void endPortalSession();
        location.replace("/login.html");
        return;
    }

    const message =
        error.name === "TimeoutError"
            ? "Máy chủ chưa phản hồi. Vui lòng thử lại."
            : error.message || "Không thể kết nối với Identity Center.";
    if (consent.open) {
        const errorMessage = document.getElementById("consentError");
        errorMessage.textContent = message;
        errorMessage.hidden = false;
    } else {
        clearLaunch();
        showHubMessage(message, true);
    }
}

async function finishLaunch(attempt, decision) {
    if (!attempt || launchPending) return;
    const token = portalToken();
    launchPending = true;
    consentButtons.forEach((button) => (button.disabled = true));
    openBreastCare.disabled = true;
    document.getElementById("consentError").hidden = true;
    if (!consent.open) showHubMessage("Đang mở BreastCare…");

    try {
        const data = await portalRequest("portal/launch", {
            token,
            body: { app: attempt.app, code_challenge: attempt.codeChallenge, decision },
        });
        if (token !== portalToken()) return;

        if (data.allowed === true && HANDOFF_VALUE.test(data.authorization_code)) {
            const profile = data.profile || readPortalProfile();
            if (profile) {
                profile.permissions = { ...profile.permissions, breastcare: true };
                savePortalProfile(profile, token);
            }
            const result = new URLSearchParams({
                code: data.authorization_code,
                state: attempt.state,
            });
            location.replace(`${BREASTCARE_WEB}/launch.html#${result}`);
            return;
        }
        if (data.allowed !== false) {
            throw new Error("Mã truy cập không hợp lệ. Vui lòng mở lại BreastCare.");
        }

        const profile =
            data.profile ||
            readPortalProfile() ||
            (await portalRequest("portal/profile", { token }));
        if (token !== portalToken()) return;
        if (decision === "deny") {
            profile.permissions = { ...profile.permissions, breastcare: false };
        }
        savePortalProfile(profile, token);
        showPortalProfile(profile);

        if (decision === "deny") {
            clearLaunch();
            if (consent.open) consent.close();
            showHubMessage("Bạn đã từ chối quyền truy cập của BreastCare.");
            openBreastCare.focus();
        } else {
            showHubMessage("");
            if (!consent.open) consent.showModal();
        }
    } catch (error) {
        if (token === portalToken()) showPortalError(error);
    } finally {
        launchPending = false;
        consentButtons.forEach((button) => (button.disabled = false));
        openBreastCare.disabled = false;
    }
}

async function showPortal() {
    const token = portalToken();
    if (!token) {
        location.replace("/login.html");
        return;
    }

    const attempt = launchParams();
    if (attempt) {
        const cached = readPortalProfile();
        if (cached) showPortalProfile(cached);
        await finishLaunch(attempt);
        return;
    }
    if (location.search) clearLaunch();

    try {
        const profile = readPortalProfile() || (await portalRequest("portal/profile", { token }));
        if (token !== portalToken()) return;
        if (!readPortalProfile()) savePortalProfile(profile, token);
        showPortalProfile(profile);
        showHubMessage("");
    } catch (error) {
        if (token === portalToken()) showPortalError(error);
    }
}

openBreastCare.addEventListener("click", () => {
    openBreastCare.disabled = true;
    location.replace(`${BREASTCARE_WEB}/launch.html`);
});
logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    catalog.hidden = true;
    showHubMessage("Đang đăng xuất…");
    await endPortalSession();
    location.replace("/login.html");
});
consentButtons.forEach((button) => {
    button.addEventListener("click", () => finishLaunch(launchParams(), button.dataset.decision));
});
consent.addEventListener("cancel", (event) => {
    if (launchPending) {
        event.preventDefault();
    } else {
        clearLaunch();
    }
});

showPortal();
