(function () {
    function toNum(value) {
        return Number(value || 0);
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function renderChart(monthly) {
        var container = document.getElementById("attendance-chart-bars");
        if (!container) return;
        container.innerHTML = "";

        var data = Array.isArray(monthly) ? monthly : [];
        if (!data.length) {
            container.innerHTML = "<p class='text-muted'>No attendance records yet.</p>";
            return;
        }

        data.slice(-6).forEach(function (item) {
            var present = toNum(item.present_count);
            var absent = toNum(item.absent_count);
            var late = toNum(item.late_count);
            var total = Math.max(1, present + absent + late);
            var presentHeight = Math.round((present / total) * 100);
            var absentHeight = Math.round((absent / total) * 100);
            var lateHeight = Math.round((late / total) * 100);

            var group = document.createElement("div");
            group.className = "bar-group";
            group.innerHTML = [
                "<div class='bar present' style='height: " + presentHeight + "%;'></div>",
                absent > 0 ? "<div class='bar absent' style='height: " + absentHeight + "%;'></div>" : "",
                late > 0 ? "<div class='bar late' style='height: " + lateHeight + "%;'></div>" : "",
                "<label>" + (item.month_label || "-") + "</label>"
            ].join("");
            container.appendChild(group);
        });
    }

    async function initAttendance() {
        if (!window.EduFlowAPI) return;
        try {
            var res = await window.EduFlowAPI.request("/student/me/attendance");
            var summary = res.summary || {};
            setText("attendance-rate", String(toNum(summary.overallRate)) + "%");
            setText("attendance-present", String(toNum(summary.presentDays)));
            setText("attendance-absent", String(toNum(summary.absentDays)));
            setText("attendance-late", String(toNum(summary.lateDays)));
            setText("attendance-present-meta", toNum(summary.presentDays) + " days present");
            renderChart(res.monthly || []);
        } catch (error) {
            console.error("Failed to load attendance:", error);
            var container = document.getElementById("attendance-chart-bars");
            if (container) container.innerHTML = "<p class='text-muted'>Could not load attendance data.</p>";
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAttendance);
    } else {
        initAttendance();
    }
})();
