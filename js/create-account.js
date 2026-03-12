document.addEventListener("DOMContentLoaded", function () {
    var roleButtons = document.querySelectorAll(".role-btn");
    var roleInput = document.getElementById("role");
    var form = document.getElementById("create-account-form");
    var messageEl = document.getElementById("form-message");
    var passwordInput = document.getElementById("password");
    var registrationInput = document.getElementById("registrationNumber");

    roleButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            roleButtons.forEach(function (btn) { btn.classList.remove("active"); });
            button.classList.add("active");
            roleInput.value = button.getAttribute("data-role");
        });
    });

    registrationInput.addEventListener("input", function () {
        passwordInput.value = registrationInput.value.trim();
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        var fullName = document.getElementById("fullName").value.trim();
        var registrationNumber = registrationInput.value.trim();
        var registrationDate = document.getElementById("registrationDate").value;
        var email = document.getElementById("email").value.trim();
        var role = roleInput.value;

        if (!fullName || !registrationNumber || !email || !role) {
            showMessage("Please fill in all required fields.", true);
            return;
        }

        var gradeLevel = "";
        if (role === "student") {
            var inferred = registrationNumber.match(/(\d{1,2}[A-Z]?)/i);
            gradeLevel = inferred ? "Class " + inferred[1].toUpperCase() : "";
        }

        try {
            await window.EduFlowAPI.request("/auth/register-request", {
                method: "POST",
                body: JSON.stringify({
                    fullName: fullName,
                    email: email,
                    role: role,
                    registrationNumber: registrationNumber,
                    registrationDate: registrationDate || null,
                    gradeLevel: gradeLevel
                })
            });

            showMessage(
                "Request submitted. Admin must approve. Login password is your registration/student ID.",
                false
            );

            setTimeout(function () {
                window.location.href = "index.html";
            }, 1500);
        } catch (error) {
            showMessage(error.message || "Could not submit registration request.", true);
        }
    });

    function showMessage(text, isError) {
        messageEl.textContent = text;
        messageEl.classList.toggle("error", isError);
    }
});
