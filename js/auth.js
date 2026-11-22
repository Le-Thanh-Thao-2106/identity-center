const BREASTCARE_WEB = "https://breast-cancer-da2.onrender.com";
const BREASTCARE_API = "https://breast-cancer-da2-api.onrender.com";
const HANDOFF_VALUE = /^[A-Za-z0-9_-]{43}$/;

const form = document.getElementById("registerForm") || document.getElementById("loginForm");
const mode = form.id === "registerForm" ? "register" : "login";
const message = document.getElementById("authMessage");
const button = form.querySelector('button[type="submit"]');
const params = new URLSearchParams(location.search);
const state = params.get("state");
const codeChallenge = params.get("code_challenge");

if (!HANDOFF_VALUE.test(state) || !HANDOFF_VALUE.test(codeChallenge)) {
    location.replace(`${BREASTCARE_WEB}/${mode}.html`);
} else {
    const alternatePage = mode === "login" ? "register" : "login";
    const alternateParams = new URLSearchParams({ from: "breastcare", state, code_challenge: codeChallenge });
    document.getElementById("alternateAuth").href = `${alternatePage}.html?${alternateParams}`;
    button.disabled = false;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const body = { email, password, code_challenge: codeChallenge };
        if (mode === "register") {
            if (password !== document.getElementById("confirmPassword").value) {
                message.textContent = "Mật khẩu xác nhận không khớp.";
                return;
            }
            body.full_name = document.getElementById("fullName").value;
        }

        button.disabled = true;
        message.textContent = "Đang xử lý…";
        try {
            const response = await fetch(`${BREASTCARE_API}/account/${mode}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify(body)
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(response.status === 404
                    ? "FastAPI chưa triển khai luồng đăng nhập mới."
                    : result.detail || "Không thể kết nối với dịch vụ đăng nhập.");
            }
            if (!HANDOFF_VALUE.test(result.authorization_code)) {
                throw new Error("Dịch vụ chưa trả mã đăng nhập BreastCare.");
            }
            const fragment = new URLSearchParams({ code: result.authorization_code, state });
            location.replace(`${BREASTCARE_WEB}/login.html#${fragment}`);
        } catch (error) {
            message.textContent = error.message;
            button.disabled = false;
        }
    });
}
