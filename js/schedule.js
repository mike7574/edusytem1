(function () {
    var dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    function toTime(v) {
        var raw = String(v || "");
        if (!raw) return "-";
        return raw.slice(0, 5);
    }

    function todayName() {
        return new Date().toLocaleDateString("en-US", { weekday: "long" });
    }

    function renderToday(rows) {
        var day = todayName();
        var titleEl = document.getElementById("schedule-today-day");
        var countEl = document.getElementById("schedule-today-count");
        var grid = document.getElementById("today-classes-grid");
        if (!grid) return;

        if (titleEl) titleEl.textContent = day;
        var todayRows = rows.filter(function (r) { return r.day_of_week === day; });
        if (countEl) countEl.textContent = String(todayRows.length);

        grid.innerHTML = "";
        if (!todayRows.length) {
            grid.innerHTML = "<p class='text-muted'>No classes scheduled for today.</p>";
            return;
        }

        todayRows.forEach(function (row) {
            var card = document.createElement("div");
            card.className = "class-card-mini";
            var teacher = row.teacher_name ? " • " + row.teacher_name : "";
            card.innerHTML = [
                "<div class='mini-icon'>SB</div>",
                "<div class='mini-info'>",
                "<h4>" + row.subject_name + "</h4>",
                "<p>" + toTime(row.start_time) + " - " + toTime(row.end_time) + " • " + (row.room_location || "Room") + teacher + "</p>",
                "</div>",
                "<span class='mini-arrow'>></span>"
            ].join("");
            grid.appendChild(card);
        });
    }

    function renderWeek(rows) {
        var wrap = document.getElementById("weekly-schedule");
        if (!wrap) return;
        wrap.innerHTML = "";

        dayOrder.forEach(function (day) {
            var dayRows = rows.filter(function (r) { return r.day_of_week === day; });
            var col = document.createElement("div");
            col.className = "day-column";
            col.innerHTML = "<h3 class='day-title'>" + day + "</h3>";

            if (!dayRows.length) {
                var empty = document.createElement("p");
                empty.className = "text-muted";
                empty.textContent = "No class";
                col.appendChild(empty);
            } else {
                dayRows.forEach(function (row, idx) {
                    var item = document.createElement("div");
                    item.className = "schedule-item " + (idx % 2 === 0 ? "purple" : "green");
                    var teacher = row.teacher_name ? "Teacher: " + row.teacher_name : "";
                    item.innerHTML = [
                        "<p class='subject'>" + row.subject_name + "</p>",
                        "<p class='time'>Time: " + toTime(row.start_time) + " - " + toTime(row.end_time) + "</p>",
                        "<p class='room'>Room: " + (row.room_location || "Room") + "</p>",
                        "<p class='teacher'>" + teacher + "</p>"
                    ].join("");
                    col.appendChild(item);
                });
            }

            wrap.appendChild(col);
        });
    }

    async function initSchedule() {
        if (!window.EduFlowAPI) return;
        try {
            var res = await window.EduFlowAPI.request("/student/me/schedule");
            var rows = Array.isArray(res.data) ? res.data : [];
            renderToday(rows);
            renderWeek(rows);
        } catch (error) {
            console.error("Failed to load schedule:", error);
            var wrap = document.getElementById("weekly-schedule");
            if (wrap) wrap.innerHTML = "<p class='text-muted'>Could not load schedule data.</p>";
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSchedule);
    } else {
        initSchedule();
    }
})();
