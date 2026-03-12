document.addEventListener("DOMContentLoaded", function () {
    var state = {
        subjects: [],
        classes: [],
        eligibleStudents: [],
        marks: [],
        activeClass: "all"
    };

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function esc(v) {
        return String(v || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    async function loadContext() {
        try {
            var context = await window.EduFlowAPI.request("/teacher/me/context");
            var c = context.data || {};
            state.subjects = c.subjects || [];
            state.classes = c.classes || [];
            setText("teacher-name-label", c.teacher ? c.teacher.name : "Teacher");
            setText("teacher-subjects-label", state.subjects.map(function (s) {
                return s.gradeLevel ? (s.name + " (" + s.gradeLevel + ")") : s.name;
            }).join(", "));
            setText("teacher-subject-badge", "Subjects: " + state.subjects.length);

            setupClassFilters();
            populateFormOptions();
            await Promise.all([loadEligibleStudents(), loadMarks()]);
            updateStats();
        } catch (error) {
            alert(error.message || "Failed to load teacher context");
        }
    }

    function setupClassFilters() {
        var wrap = document.querySelector(".classes-filter");
        var info = document.getElementById("filter-info");
        if (!wrap) return;
        Array.prototype.slice.call(wrap.querySelectorAll(".class-filter-btn")).forEach(function (btn) {
            if ((btn.getAttribute("data-class") || "") !== "all") btn.remove();
        });
        var uniqueClasses = Array.from(new Set(state.classes || []));
        uniqueClasses.forEach(function (className) {
            var btn = document.createElement("button");
            btn.className = "class-filter-btn";
            btn.setAttribute("data-class", className);
            btn.textContent = className;
            wrap.insertBefore(btn, info);
        });

        wrap.addEventListener("click", async function (e) {
            var btn = e.target.closest(".class-filter-btn");
            if (!btn) return;
            e.preventDefault();
            Array.prototype.slice.call(wrap.querySelectorAll(".class-filter-btn")).forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");
            state.activeClass = btn.getAttribute("data-class") || "all";
            setText("filter-info", state.activeClass === "all" ? "Showing all your classes" : "Showing " + state.activeClass);
            populateFormOptions();
            await Promise.all([loadEligibleStudents(), loadMarks()]);
            updateStats();
        });
    }

    function populateFormOptions() {
        var classSelect = document.getElementById("marks-class");
        var subjectSelect = document.getElementById("marks-subject");
        if (!classSelect || !subjectSelect) return;

        classSelect.innerHTML = "";
        addOption(classSelect, "all", "Select class");
        state.classes.forEach(function (c) { addOption(classSelect, c, c); });
        classSelect.value = state.activeClass;

        subjectSelect.innerHTML = "";
        addOption(subjectSelect, "all", "Select subject");
        state.subjects.forEach(function (s) { addOption(subjectSelect, String(s.id), s.name); });

        classSelect.onchange = loadEligibleStudents;
        subjectSelect.onchange = loadEligibleStudents;
    }

    function addOption(select, value, label) {
        var o = document.createElement("option");
        o.value = value;
        o.textContent = label;
        select.appendChild(o);
    }

    async function loadEligibleStudents() {
        var classVal = document.getElementById("marks-class").value;
        var subjectVal = document.getElementById("marks-subject").value;
        var query = [];
        if (classVal && classVal !== "all") query.push("className=" + encodeURIComponent(classVal));
        if (subjectVal && subjectVal !== "all") query.push("subjectId=" + encodeURIComponent(subjectVal));
        var path = "/teacher/eligible-students" + (query.length ? "?" + query.join("&") : "");
        var result = await window.EduFlowAPI.request(path);
        state.eligibleStudents = result.data || [];

        var studentSelect = document.getElementById("marks-student");
        studentSelect.innerHTML = "";
        addOption(studentSelect, "", "Select student");
        state.eligibleStudents.forEach(function (s) {
            addOption(studentSelect, s.student_id, s.name + " (" + (s.class_name || "-") + ")");
        });

        renderEligibleStudents();
        updateStats();
    }

    function renderEligibleStudents() {
        var list = document.getElementById("eligible-students-list");
        if (!list) return;
        list.innerHTML = "";
        if (!state.eligibleStudents.length) {
            list.innerHTML = "<p class='text-muted'>No eligible students for this filter.</p>";
        } else {
            state.eligibleStudents.forEach(function (s) {
                var row = document.createElement("div");
                row.className = "eligible-student-item";
                row.innerHTML = "<strong>" + esc(s.name) + "</strong><span>" + esc(s.student_id) + " - " + esc(s.class_name) + " - " + esc(s.subject_name) + "</span>";
                list.appendChild(row);
            });
        }
        setText("eligible-count", String(state.eligibleStudents.length));
    }

    async function loadMarks() {
        var result = await window.EduFlowAPI.request("/teacher/marks");
        state.marks = result.data || [];
        renderMarksTable();
    }

    function renderMarksTable() {
        var body = document.getElementById("teacher-marks-body");
        if (!body) return;
        body.innerHTML = "";
        state.marks.forEach(function (m) {
            if (state.activeClass !== "all" && m.class_name !== state.activeClass) return;
            var tr = document.createElement("tr");
            tr.innerHTML = [
                "<td>" + esc(m.class_name) + "</td>",
                "<td>" + esc(m.subject_name) + "</td>",
                "<td>" + esc(m.student_name) + "</td>",
                "<td>" + esc(m.term_name) + "</td>",
                "<td>" + esc(m.score) + "</td>",
                "<td>" + esc(m.grade) + "</td>",
                "<td>" + esc(m.updated_date) + "</td>"
            ].join("");
            body.appendChild(tr);
        });
    }

    function updateStats() {
        var uniqueClasses = Array.from(new Set(state.classes || []));
        setText("my-subjects-count", String(state.subjects.length));
        setText("my-classes-count", String(uniqueClasses.length));
        setText("my-students-count", String(state.eligibleStudents.length));
        var marksCount = state.marks.filter(function (m) {
            return state.activeClass === "all" ? true : m.class_name === state.activeClass;
        }).length;
        setText("marks-recorded-count", String(marksCount));
    }

    function setupForm() {
        var form = document.getElementById("teacher-marks-form");
        var message = document.getElementById("marks-message");
        form.addEventListener("submit", async function (e) {
            e.preventDefault();
            try {
                var payload = {
                    className: document.getElementById("marks-class").value,
                    subjectId: Number(document.getElementById("marks-subject").value),
                    studentId: document.getElementById("marks-student").value,
                    termName: document.getElementById("marks-term").value.trim(),
                    score: Number(document.getElementById("marks-score").value)
                };
                await window.EduFlowAPI.request("/teacher/marks", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                message.textContent = "Mark saved successfully.";
                await loadMarks();
            } catch (error) {
                message.textContent = error.message || "Could not save mark";
            }
        });
    }

    function setupSearch() {
        var input = document.getElementById("teacher-search");
        if (!input) return;
        input.addEventListener("input", function () {
            var term = input.value.trim().toLowerCase();
            var rows = document.querySelectorAll("#teacher-marks-body tr, .eligible-student-item");
            Array.prototype.forEach.call(rows, function (row) {
                row.style.display = !term || row.textContent.toLowerCase().indexOf(term) >= 0 ? "" : "none";
            });
        });
    }

    function setupExport() {
        var exportBtn = document.getElementById("export-marks-link");
        exportBtn.addEventListener("click", function (e) {
            e.preventDefault();
            var filtered = state.marks.filter(function (m) {
                return state.activeClass === "all" ? true : m.class_name === state.activeClass;
            });
            var csv = "Class,Subject,Student,Term,Score,Grade,Date\n" + filtered.map(function (m) {
                return [m.class_name, m.subject_name, m.student_name, m.term_name, m.score, m.grade, m.updated_date]
                    .map(function (v) { return '"' + String(v || "").replace(/"/g, '""') + '"'; })
                    .join(",");
            }).join("\n");
            var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = "teacher-marks.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    document.getElementById("refresh-teacher-view").addEventListener("click", loadContext);
    setupForm();
    setupSearch();
    setupExport();
    loadContext();
});
