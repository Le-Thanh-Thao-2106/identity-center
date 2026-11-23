const stage = document.querySelector(".motion-stage");
const panels = [...stage.querySelectorAll("[data-form-mode]")];
const coverAction = stage.querySelector(".identity-cover-action");
const route = { login: "/login.html", register: "/register.html" };
let pendingRequest = null;

function activePanel() {
    return panels.find((panel) => panel.dataset.formMode === stage.dataset.mode);
}

function showAuthMessage(panel, value, isError = false) {
    const message = panel.querySelector('[role="status"]');
    message.textContent = value;
    message.hidden = !value;
    message.dataset.error = String(isError);
}

function setPasswordVisible(toggle, visible) {
    toggle.previousElementSibling.type = visible ? "text" : "password";
    toggle.setAttribute("aria-pressed", String(visible));
    toggle.setAttribute("aria-label", visible ? "Ẩn mật khẩu" : "Hiện mật khẩu");
}

function resetAuthForm(panel) {
    panel.querySelector("form").reset();
    setPasswordVisible(panel.querySelector(".identity-password button"), false);
}

function updateSubmitButtons() {
    for (const panel of panels) {
        const button = panel.querySelector('button[type="submit"]');
        const current = pendingRequest !== null && panel === activePanel();
        button.disabled = pendingRequest !== null;
        panel.querySelector("[data-cancel-auth]").hidden = !current;
    }
}

function showMode(mode, { focus = false } = {}) {
    stage.dataset.mode = mode;
    const nextPanel = activePanel();

    for (const panel of panels) {
        resetAuthForm(panel);
        showAuthMessage(panel, "");
    }

    // Move focus out of the departing panel before hiding it from assistive technology.
    nextPanel.inert = false;
    nextPanel.removeAttribute("aria-hidden");
    if (focus) nextPanel.querySelector('[aria-current="page"]').focus({ preventScroll: true });

    for (const panel of panels) {
        if (panel === nextPanel) continue;
        panel.inert = true;
        panel.setAttribute("aria-hidden", "true");
    }

    const alternate = mode === "login" ? "register" : "login";
    coverAction.href = route[alternate];
    coverAction.dataset.changeMode = alternate;
    coverAction.textContent = mode === "login" ? "Tạo tài khoản →" : "← Về đăng nhập";
    document.title = mode === "login" ? "Đăng nhập | Identity Center" : "Đăng ký | Identity Center";
}

stage.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-change-mode]");
    if (
        !link ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey
    ) {
        return;
    }

    event.preventDefault();
    const mode = link.dataset.changeMode;
    if (pendingRequest || mode === stage.dataset.mode) return;
    history.pushState(null, "", route[mode]);
    showMode(mode, { focus: true });
});

window.addEventListener("popstate", () => {
    const mode = location.pathname === route.register ? "register" : "login";
    if (mode === stage.dataset.mode) return;
    pendingRequest?.abort();
    pendingRequest = null;
    showMode(mode, { focus: true });
    updateSubmitButtons();
});

for (const panel of panels) {
    const form = panel.querySelector("form");
    const mode = form.dataset.mode;
    const password = panel.querySelector(".identity-password input");
    const toggle = panel.querySelector(".identity-password button");

    panel.querySelector("[data-cancel-auth]").addEventListener("click", () => {
        pendingRequest?.abort();
        pendingRequest = null;
        password.value = "";
        const confirmation = form.querySelector("#register-confirmPassword");
        if (confirmation) confirmation.value = "";
        setPasswordVisible(toggle, false);
        updateSubmitButtons();
        showAuthMessage(panel, "Đã hủy yêu cầu. Bạn có thể thử lại.");
        password.focus();
    });

    toggle.addEventListener("click", () =>
        setPasswordVisible(toggle, password.type === "password"),
    );

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (pendingRequest || panel.inert) return;

        const body = {
            email: form.querySelector('input[type="email"]').value,
            password: password.value,
        };

        if (mode === "register") {
            if (body.password !== document.getElementById("register-confirmPassword").value) {
                showAuthMessage(panel, "Hai ô mật khẩu chưa khớp.", true);
                return;
            }
            body.full_name = document.getElementById("register-fullName").value;
        }

        const request = new AbortController();
        pendingRequest = request;
        updateSubmitButtons();
        showAuthMessage(panel, "Đang xử lý…");
        const slow = setTimeout(() => {
            if (pendingRequest === request) {
                showAuthMessage(
                    panel,
                    "Máy chủ phản hồi chậm. Bạn có thể chờ hoặc hủy để thử lại.",
                );
            }
        }, 4000);
        const timeout = AbortSignal.timeout(PORTAL_REQUEST_TIMEOUT_MS);
        const signal = AbortSignal.any([request.signal, timeout]);

        try {
            const result = await portalRequest(mode, { body, token: null, signal });
            if (pendingRequest !== request) return;

            if (mode === "register") {
                history.replaceState(null, "", route.login);
                showMode("login", { focus: true });
                showAuthMessage(activePanel(), "Tạo tài khoản thành công. Vui lòng đăng nhập.");
                return;
            }
            if (!HANDOFF_VALUE.test(result.portal_token)) {
                throw new Error("Dịch vụ chưa cấp phiên Identity Center.");
            }
            sessionStorage.setItem(PORTAL_SESSION_KEY, result.portal_token);
            savePortalProfile(result.profile, result.portal_token);
            location.replace("/");
        } catch (error) {
            if (pendingRequest === request) {
                showAuthMessage(
                    panel,
                    timeout.aborted
                        ? "Máy chủ chưa phản hồi. Vui lòng thử lại."
                        : error.message || "Không thể kết nối với dịch vụ tài khoản.",
                    true,
                );
            }
        } finally {
            clearTimeout(slow);
            if (pendingRequest === request) {
                pendingRequest = null;
                password.value = "";
                const confirmation = form.querySelector("#register-confirmPassword");
                if (confirmation) confirmation.value = "";
                setPasswordVisible(toggle, false);
                updateSubmitButtons();
            }
        }
    });
}

function prepareAuthForm() {
    panels.forEach(resetAuthForm);
    const registered = new URLSearchParams(location.search).has("registered");
    if (location.search) history.replaceState(null, "", location.pathname);

    void endPortalSession();
    if (registered && stage.dataset.mode === "login") {
        showAuthMessage(activePanel(), "Tạo tài khoản thành công. Vui lòng đăng nhập.");
    }

    updateSubmitButtons();
}

prepareAuthForm();
