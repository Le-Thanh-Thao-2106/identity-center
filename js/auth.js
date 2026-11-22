
const registerForm = document.getElementById("registerForm");
const authParams = new URLSearchParams(location.search);

function openAccount() {
    const redirect = authParams.get("redirect");
    if (redirect?.startsWith("/")) {
        const target = new URL(redirect, location.origin);
        if (target.origin === location.origin) {
            location.assign(target.href);
            return;
        }
    }

    location.assign("index.html");
}

if (registerForm && supabaseClient) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const fullName = document.getElementById("fullName").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            alert("Mật khẩu xác nhận không khớp!");
            return;
        }

        if (password.length < 6) {
            alert("Mật khẩu phải có ít nhất 6 ký tự!");
            return;
        }

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });

        if (error) {
            alert(error.code === "user_already_exists"
                ? "Email này đã được đăng ký. Vui lòng dùng trang đăng nhập."
                : "Đăng ký thất bại: " + error.message);
            return;
        }

        if (!data.session) {
            alert("Supabase chưa cấp phiên đăng nhập. Vui lòng kiểm tra cấu hình xác nhận email hoặc dùng trang đăng nhập nếu đã có tài khoản.");
            return;
        }

        openAccount();
    });
}



const loginForm = document.getElementById("loginForm");

if (loginForm && supabaseClient) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const { error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (error) {
            alert("Đăng nhập thất bại: " + error.message);
            return;
        }

        openAccount();
    });
}
