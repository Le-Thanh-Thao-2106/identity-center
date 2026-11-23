const form = document.getElementById("identityForm");
const mode = form.dataset.mode;
const message = document.getElementById("authMessage");
const submit = form.querySelector('button[type="submit"]');
const password = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");

function showAuthMessage(value, error = false) {
    message.textContent = value;
    message.hidden = !value;
    message.dataset.error = String(error);
}

function resetAuthForm() {
    form.reset();
    password.type = "password";
    passwordToggle.setAttribute("aria-pressed", "false");
    passwordToggle.setAttribute("aria-label", "Hiện mật khẩu");
}

passwordToggle.addEventListener("click", () => {
    const reveal = password.type === "password";
    password.type = reveal ? "text" : "password";
    passwordToggle.setAttribute("aria-pressed", String(reveal));
    passwordToggle.setAttribute("aria-label", reveal ? "Ẩn mật khẩu" : "Hiện mật khẩu");
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submit.disabled) return;

    const body = {
        email: document.getElementById("email").value,
        password: password.value,
    };
    if (mode === "register") {
        if (body.password !== document.getElementById("confirmPassword").value) {
            showAuthMessage("Hai ô mật khẩu chưa khớp.", true);
            return;
        }
        body.full_name = document.getElementById("fullName").value;
    }

    submit.disabled = true;
    showAuthMessage("Đang xử lý…");
    try {
        const result = await portalRequest(mode, { body, token: null });
        if (mode === "register") {
            location.replace("login.html?registered=1");
            return;
        }
        if (!HANDOFF_VALUE.test(result.portal_token)) {
            throw new Error("Dịch vụ chưa cấp phiên Identity Center.");
        }
        sessionStorage.setItem(PORTAL_SESSION_KEY, result.portal_token);
        location.replace("/");
    } catch (error) {
        showAuthMessage(error.message || "Không thể kết nối với dịch vụ tài khoản.", true);
    } finally {
        resetAuthForm();
        submit.disabled = false;
    }
});

async function prepareAuthForm() {
    resetAuthForm();
    await endPortalSession();
    const params = new URLSearchParams(location.search);
    if (mode === "login" && params.has("registered")) {
        showAuthMessage("Tạo tài khoản thành công. Vui lòng đăng nhập.");
    }

    // Discard any parameters from the retired BreastCare-first flow.
    if (location.search) history.replaceState(null, "", location.pathname);
    submit.disabled = false;
}

prepareAuthForm().catch(() => {
    showAuthMessage("Không thể mở form. Vui lòng tải lại trang.", true);
});
