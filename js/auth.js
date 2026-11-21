
const registerForm = document.getElementById("registerForm");

if (registerForm) {
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
            alert("Đăng ký thất bại: " + error.message);
            return;
        }

        alert("Tạo tài khoản thành công!");

        window.location.href = "login.html" + (new URLSearchParams(location.search).get("from") === "breastcare" ? "?from=breastcare" : "");
    });
}



const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (error) {
            alert("Đăng nhập thất bại: " + error.message);
            return;
        }

        alert("Đăng nhập thành công!");

        // Kiểm tra có yêu cầu chuyển hướng hay không
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");

        // Chỉ cho phép chuyển hướng trong cùng website
        if (
            redirect &&
            redirect.startsWith("/") &&
            !redirect.startsWith("//")
        ) {
            window.location.href = redirect;
        } else {
            window.location.href = "index.html" + (params.get("from") === "breastcare" ? "?from=breastcare" : "");
        }
    });
}
