(function () {
    function toNum(value) {
        return Number(value || 0);
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function renderGrades(grades) {
        var grid = document.getElementById("profile-grades-grid");
        if (!grid) return;
        grid.innerHTML = "";

        if (!grades.length) {
            grid.innerHTML = "<p class='text-muted'>No grade records available.</p>";
            return;
        }

        grades.forEach(function (grade) {
            var tile = document.createElement("div");
            tile.className = "grade-tile";
            tile.innerHTML = [
                "<div class='grade-head'>",
                "<span class='text-muted'>" + (grade.subject_name || "Subject") + "</span>",
                "<span class='grade-pill'>" + (grade.grade || "-") + "</span>",
                "</div>",
                "<div class='grade-score'>" + toNum(grade.score) + "</div>"
            ].join("");
            grid.appendChild(tile);
        });
    }

    function renderAwards(awards) {
        var grid = document.getElementById("profile-awards-grid");
        if (!grid) return;
        grid.innerHTML = "";

        if (!awards.length) {
            grid.innerHTML = "<p class='text-muted'>No awards yet.</p>";
            return;
        }

        awards.forEach(function (award, idx) {
            var classes = ["award-amber", "award-blue", "award-pink", "award-green"];
            var tile = document.createElement("div");
            tile.className = "award-tile " + classes[idx % classes.length];
            tile.innerHTML = [
                "<div class='award-icon'>AW</div>",
                "<div class='award-title'>" + (award.award_name || "Award") + "</div>",
                "<div class='award-sub text-muted'>" + (award.award_date ? String(award.award_date).slice(0, 10) : "") + "</div>"
            ].join("");
            grid.appendChild(tile);
        });
    }

    async function initProfile() {
        if (!window.EduFlowAPI) return;
        try {
            var res = await window.EduFlowAPI.request("/student/me/profile");
            var data = res.data || {};
            var user = data.user || {};
            var grades = Array.isArray(data.grades) ? data.grades : [];
            var awards = Array.isArray(data.awards) ? data.awards : [];

            setText("profile-name", user.name || "Student");
            setText("profile-subtitle", [user.gradeLevel || "Class", user.stream || ""].filter(Boolean).join(" • "));
            setText("profile-student-id", user.studentId || "-");
            setText("profile-chip-id", user.studentId || "-");
            setText("profile-chip-status", user.status || "Active");
            setText("profile-gpa", Number(user.gpa || 0).toFixed(2));
            setText("profile-rank", user.classRank ? ("#" + user.classRank) : "N/A");
            setText("profile-credits", toNum(user.creditsEarned) + "/" + toNum(user.totalCredits));
            setText("profile-email", user.email || "-");
            setText("profile-guardian-name", user.guardianName || "-");
            setText("profile-guardian-phone", user.guardianPhone || "-");
            setText("student-sidebar-name", user.name || "Student");
            setText("student-sidebar-class", [user.gradeLevel || "Class", user.stream || ""].filter(Boolean).join(" • "));

            renderGrades(grades);
            renderAwards(awards);
        } catch (error) {
            console.error("Failed to load profile:", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initProfile);
    } else {
        initProfile();
    }
})();
