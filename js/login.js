var selectedRole = "student";

document.addEventListener("DOMContentLoaded", function () {
    var roleButtons = document.querySelectorAll(".role-btn");
    var form = document.querySelector("form");
    var passwordInput = document.getElementById("password");
    var eyeIcon = document.querySelector(".icon-right");

    roleButtons.forEach(function (btn) {
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            roleButtons.forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");
            selectedRole = btn.getAttribute("data-role") || btn.textContent.trim().toLowerCase();
        });
    });

    if (eyeIcon && passwordInput) {
        eyeIcon.addEventListener("click", function () {
            passwordInput.type = passwordInput.type === "password" ? "text" : "password";
        });
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        var email = document.getElementById("email").value.trim();
        var password = document.getElementById("password").value;

        if (!email || !password) {
            alert("Please fill in all fields");
            return;
        }

        try {
            var result = await window.EduFlowAPI.request("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: email,
                    password: password,
                    role: selectedRole
                })
            });

            window.EduFlowAPI.setToken(result.token);

            localStorage.setItem("userSession", JSON.stringify({
                id: result.user.id,
                email: result.user.email,
                role: result.user.role,
                name: result.user.name,
                loginTime: new Date().toISOString()
            }));
            localStorage.setItem("userRole", result.user.role);

            var redirectUrl = "dashboard.html";
            if (result.user.role === "teacher") redirectUrl = "teacher-dashboard.html";
            if (result.user.role === "admin") redirectUrl = "admin-dashboard.html";
            window.location.href = redirectUrl;
        } catch (error) {
            alert(error.message || "Login failed");
        }
    });
});
