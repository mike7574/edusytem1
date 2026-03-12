(function () {
    function toNum(value) {
        return Number(value || 0);
    }

    function esc(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function gradeClass(grade) {
        var g = String(grade || "").toUpperCase();
        if (g.indexOf("A") === 0) return "purple";
        if (g.indexOf("B") === 0) return "green";
        if (g.indexOf("C") === 0) return "orange";
        return "pink";
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    async function initGrades() {
        if (!window.EduFlowAPI) return;
        try {
            var res = await window.EduFlowAPI.request("/student/me/grades");
            var rows = Array.isArray(res.data) ? res.data : [];
            var summary = res.summary || {};

            setText("grades-average", String(toNum(summary.classAverage)) + "/100");
            setText("grades-highest", String(toNum(summary.highest)) + "/100");
            setText("grades-lowest", String(toNum(summary.lowest)) + "/100");
            setText("grades-subject-count", String(toNum(summary.subjects)));

            var termName = rows.length ? rows[0].term_name : "Current Term";
            setText("grades-term-title", termName + " Results");

            var tbody = document.getElementById("grades-table-body");
            if (!tbody) return;
            tbody.innerHTML = "";

            if (!rows.length) {
                tbody.innerHTML = "<tr><td colspan='5' class='text-muted'>No grades available yet.</td></tr>";
                return;
            }

            rows.forEach(function (row) {
                var score = toNum(row.score);
                var progress = Math.max(0, Math.min(100, toNum(row.progress_percentage || row.score)));
                var tr = document.createElement("tr");
                tr.innerHTML = [
                    "<td><strong>" + esc(row.subject_name) + "</strong></td>",
                    "<td class='text-muted'>" + esc(row.teacher_name || "TBA") + "</td>",
                    "<td><span class='score-pill blue'>" + esc(score) + "</span></td>",
                    "<td><span class='grade-badge " + gradeClass(row.grade) + "'>" + esc(row.grade || "-") + "</span></td>",
                    "<td><div class='progress-bar-container'><div class='progress-fill' style='width: " + progress + "%;'></div></div></td>"
                ].join("");
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error("Failed to load grades:", error);
            var tbody = document.getElementById("grades-table-body");
            if (tbody) tbody.innerHTML = "<tr><td colspan='5' class='text-muted'>Could not load grades data.</td></tr>";
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initGrades);
    } else {
        initGrades();
    }
})();
