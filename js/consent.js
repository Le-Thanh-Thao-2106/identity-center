
// Lấy mã yêu cầu cấp quyền từ URL
const params = new URLSearchParams(window.location.search);
const authorizationId = params.get("authorization_id");

// Lấy các thành phần HTML
const clientName = document.getElementById("clientName");
const redirectUri = document.getElementById("redirectUri");
const scopeList = document.getElementById("scopeList");
const consentMessage = document.getElementById("consentMessage");
const approveBtn = document.getElementById("approveBtn");
const denyBtn = document.getElementById("denyBtn");

// Hiển thị thông báo
function showMessage(message) {
    consentMessage.textContent = message;
}

// Tải thông tin yêu cầu cấp quyền
async function loadAuthorization() {

    // Kiểm tra mã yêu cầu
    if (!authorizationId) {
        showMessage("Không tìm thấy mã yêu cầu cấp quyền.");
        approveBtn.disabled = true;
        denyBtn.disabled = true;
        return;
    }

    // Kiểm tra người dùng đã đăng nhập
    const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError) {
        showMessage("Lỗi kiểm tra đăng nhập: " + sessionError.message);
        return;
    }

    // Nếu chưa đăng nhập, chuyển đến trang đăng nhập
    if (!sessionData.session) {
        const returnUrl =
            window.location.pathname + window.location.search;

        window.location.href =
            "../../login.html?redirect=" +
            encodeURIComponent(returnUrl);
        return;
    }

    // Lấy thông tin yêu cầu OAuth từ Supabase
    const { data, error } =
        await supabaseClient.auth.oauth.getAuthorizationDetails(
            authorizationId
        );

    if (error || !data) {
        showMessage(
            "Không thể tải thông tin cấp quyền: " +
            (error?.message || "Yêu cầu không hợp lệ.")
        );
        approveBtn.disabled = true;
        denyBtn.disabled = true;
        return;
    }

    // Nếu yêu cầu đã được cấp quyền trước đó
    if (!("authorization_id" in data)) {
        window.location.href = data.redirect_url;
        return;
    }

    // Hiển thị tên ứng dụng và địa chỉ chuyển hướng
    clientName.textContent =
        data.client.name || "Ứng dụng chưa đặt tên";

    redirectUri.textContent =
        data.redirect_uri || "Không có";

    // Hiển thị danh sách quyền được yêu cầu
    scopeList.innerHTML = "";

    const scopes = data.scope
        ? data.scope.split(" ")
        : [];

    if (scopes.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Không có quyền nào được yêu cầu.";
        scopeList.appendChild(li);
    } else {
        scopes.forEach((scope) => {
            const li = document.createElement("li");
            li.textContent = scope;
            scopeList.appendChild(li);
        });
    }
}

// Xử lý khi người dùng chọn Cho phép
approveBtn.addEventListener("click", async () => {

    approveBtn.disabled = true;
    denyBtn.disabled = true;

    showMessage("Đang xử lý yêu cầu cấp quyền...");

    const { data, error } =
        await supabaseClient.auth.oauth.approveAuthorization(
            authorizationId
        );

    if (error) {
        showMessage("Cấp quyền thất bại: " + error.message);
        approveBtn.disabled = false;
        denyBtn.disabled = false;
        return;
    }

    window.location.href = data.redirect_url;
});

// Xử lý khi người dùng chọn Từ chối
denyBtn.addEventListener("click", async () => {

    approveBtn.disabled = true;
    denyBtn.disabled = true;

    showMessage("Đang xử lý yêu cầu...");

    const { data, error } =
        await supabaseClient.auth.oauth.denyAuthorization(
            authorizationId
        );

    if (error) {
        showMessage("Từ chối yêu cầu thất bại: " + error.message);
        approveBtn.disabled = false;
        denyBtn.disabled = false;
        return;
    }

    window.location.href = data.redirect_url;
});

// Khởi chạy trang cấp quyền
loadAuthorization();
