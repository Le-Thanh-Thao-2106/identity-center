const breastCareHandoff = new URLSearchParams(location.search).get("from") === "breastcare";

if (breastCareHandoff) {
    const page = location.pathname.endsWith("/register.html") ? "register.html" : "login.html";
    location.replace(`https://breast-cancer-da2.onrender.com/${page}`);
}
