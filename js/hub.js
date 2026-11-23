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

async function finishLaunch(attempt, decision) {
    if (!attempt || launchPending) return;
    launchPending = true;
    consentButtons.forEach((button) => (button.disabled = true));
    openBreastCare.disabled = true;
    document.getElementById("consentError").hidden = true;

    try {
        const data = await portalRequest("portal/launch", {
            body: { app: attempt.app, code_challenge: attempt.codeChallenge, decision },
        });

        if (data.allowed && HANDOFF_VALUE.test(data.authorization_code)) {
            const result = new URLSearchParams({
                code: data.authorization_code,
                state: attempt.state,
            });
            location.replace(`${BREASTCARE_WEB}/launch.html#${result}`);
            return;
        }

        if (decision === "deny") {
            clearLaunch();
            consent.close();
            openBreastCare.textContent = "Cấp quyền để mở BreastCare";
            showHubMessage("Bạn đã từ chối quyền truy cập của BreastCare.");
            openBreastCare.focus();
        } else if (!data.allowed) {
            if (!consent.open) consent.showModal();
        } else {
            throw new Error("Mã truy cập không hợp lệ. Vui lòng mở lại BreastCare.");
        }
    } catch (error) {
        if (error.status === 401) {
            await endPortalSession();
            location.replace("/login.html");
            return;
        }
        if (consent.open) {
            const errorMessage = document.getElementById("consentError");
            errorMessage.textContent = error.message;
            errorMessage.hidden = false;
        } else {
            clearLaunch();
            showHubMessage(error.message, true);
        }
    } finally {
        launchPending = false;
        consentButtons.forEach((button) => (button.disabled = false));
        openBreastCare.disabled = false;
    }
}

async function showPortal() {
    if (!portalToken()) {
        location.replace("/login.html");
        return;
    }

    try {
        const profile = await portalRequest("portal/profile");
        const name = profile.full_name || profile.email;
        document.getElementById("accountName").textContent = name;
        document.getElementById("accountAvatar").textContent =
            Array.from(name)[0].toLocaleUpperCase("vi");
        catalog.hidden = false;
        logoutButton.hidden = false;
        showHubMessage("");

        const permission = profile.permissions.breastcare;
        if (permission === false) openBreastCare.textContent = "Cấp quyền để mở BreastCare";
        const attempt = launchParams();
        if (!attempt && location.search) clearLaunch();
        if (!attempt) return;

        if (permission === true) {
            await finishLaunch(attempt);
        } else {
            consent.showModal();
        }
    } catch (error) {
        if (error.status === 401) {
            await endPortalSession();
            location.replace("/login.html");
        } else {
            showHubMessage(error.message, true);
        }
    }
}

openBreastCare.addEventListener("click", () => location.replace(`${BREASTCARE_WEB}/launch.html`));
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
