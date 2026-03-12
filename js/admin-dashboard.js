document.addEventListener("DOMContentLoaded", function () {
    var state = {
        students: [],
        teachers: [],
        payments: [],
        pendingRequests: []
    };

    var currency = "KSh";

    function toMoney(amount) {
        var n = Number(amount || 0);
        return currency + " " + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    function parseSubjects(raw) {
        return String(raw || "")
            .split(",")
            .map(function (s) { return s.trim(); })
            .filter(Boolean);
    }

    function openModal(id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove("hidden");
    }

    function closeModal(id) {
        var el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    async function loadAll() {
        try {
            var results = await Promise.all([
                window.EduFlowAPI.request("/admin/overview"),
                window.EduFlowAPI.request("/admin/students"),
                window.EduFlowAPI.request("/admin/teachers"),
                window.EduFlowAPI.request("/admin/payment-records"),
                window.EduFlowAPI.request("/admin/registration-requests?status=pending")
            ]);
            var overview = results[0].data || {};
            state.students = results[1].data || [];
            state.teachers = results[2].data || [];
            state.payments = results[3].data || [];
            state.pendingRequests = results[4].data || [];

            renderStudents();
            renderTeachers();
            renderPayments();
            renderPendingRequests();
            drawPaymentsChart();
            updateStats(overview);
        } catch (error) {
            alert(error.message || "Failed to load admin data");
        }
    }

    function updateStats(overview) {
        setText("total-students-stat", String(overview.totalStudents || state.students.length));
        setText("total-teachers-stat", String(overview.totalTeachers || state.teachers.length));
        setText("finance-total-paid", toMoney(overview.totalPaid || sumPaymentsByStatus("Completed")));
        setText("pending-requests-count", String(overview.pendingRequests || state.pendingRequests.length));

        var now = new Date();
        var thisMonth = state.payments
            .filter(function (p) {
                var d = new Date(p.payment_date || p.paymentDate);
                return (p.status || "").toLowerCase() === "completed" &&
                    d.getMonth() === now.getMonth() &&
                    d.getFullYear() === now.getFullYear();
            })
            .reduce(function (acc, p) { return acc + Number(p.amount || 0); }, 0);

        setText("revenue-this-month-stat", toMoney(thisMonth));
        setText("completed-payments-total", toMoney(sumPaymentsByStatus("Completed")));
        setText("pending-payments-total", toMoney(sumPaymentsByStatus("Pending")));
        setText("failed-payments-total", toMoney(sumPaymentsByStatus("Failed")));
        setText("payments-records-count", String(state.payments.length));
    }

    function sumPaymentsByStatus(status) {
        return state.payments
            .filter(function (p) { return String(p.status || "").toLowerCase() === status.toLowerCase(); })
            .reduce(function (acc, p) { return acc + Number(p.amount || 0); }, 0);
    }

    function renderStudents() {
        var tbody = document.getElementById("students-table-body");
        if (!tbody) return;
        tbody.innerHTML = "";
        state.students.forEach(function (s) {
            var tr = document.createElement("tr");
            var subjects = [];
            try {
                subjects = Array.isArray(s.subjects) ? s.subjects : JSON.parse(s.subjects || "[]");
            } catch (e) {
                subjects = [];
            }
            tr.innerHTML = [
                "<td><span class='table-id'>" + esc(s.student_id || s.studentId || "") + "</span></td>",
                "<td><span class='table-name'>" + esc(s.name || "") + "</span></td>",
                "<td>" + esc(s.grade_level || s.grade || "-") + "</td>",
                "<td>" + esc(subjects.join(", ")) + "</td>",
                "<td><span class='status-badge " + ((s.status || "Active") === "Active" ? "active" : "inactive") + "'>" + esc(s.status || "Active") + "</span></td>",
                "<td><button class='action-btn' data-type='student' data-id='" + esc(s.student_id || "") + "'>Delete</button></td>"
            ].join("");
            tbody.appendChild(tr);
        });
    }

    function renderTeachers() {
        var tbody = document.getElementById("teachers-table-body");
        if (!tbody) return;
        tbody.innerHTML = "";
        state.teachers.forEach(function (t) {
            var subjects = [];
            try {
                subjects = Array.isArray(t.subjects) ? t.subjects : JSON.parse(t.subjects || "[]");
            } catch (e) {
                subjects = [];
            }
            var subjectsLabel = subjects.map(function (s) {
                if (typeof s === "string") return s;
                if (s && typeof s === "object") {
                    return s.gradeLevel ? (s.name + " (" + s.gradeLevel + ")") : s.name;
                }
                return "";
            }).filter(Boolean).join(", ");
            var tr = document.createElement("tr");
            tr.innerHTML = [
                "<td><span class='table-id'>" + esc(t.teacher_id || t.teacherId || "") + "</span></td>",
                "<td><span class='table-name'>" + esc(t.name || "") + "</span></td>",
                "<td>" + esc(subjectsLabel) + "</td>",
                "<td>" + esc(String(t.classesCount || "-")) + "</td>",
                "<td>" +
                    "<button class='action-btn' data-type='assign-teacher-subjects' data-id='" + esc(t.teacher_id || "") + "'>Assign Subjects</button> " +
                    "<button class='action-btn' data-type='teacher' data-id='" + esc(t.teacher_id || "") + "'>Delete</button>" +
                "</td>"
            ].join("");
            tbody.appendChild(tr);
        });
    }

    function renderPayments() {
        var tbody = document.getElementById("payment-history-body");
        if (!tbody) return;
        tbody.innerHTML = "";
        state.payments.forEach(function (p) {
            var tr = document.createElement("tr");
            var statusLower = String(p.status || "").toLowerCase();
            var actions = "";
            if (statusLower === "pending") {
                actions = "<button class='action-btn approval-btn' data-type='approve-payment' data-id='" + esc(p.id || "") + "'>Approve</button> " +
                          "<button class='action-btn approval-btn' data-type='reject-payment' data-id='" + esc(p.id || "") + "'>Reject</button>";
            }
            tr.innerHTML = [
                "<td><span class='table-id'>" + esc(p.transaction_id || p.transactionId || "") + "</span></td>",
                "<td>" + esc(p.student_name || p.studentName || "") + " (" + esc(p.student_identifier || p.studentId || "") + ")" +
                    (p.fee_name ? "<br><small>" + esc(p.fee_name) + "</small>" : "") + "</td>",
                "<td>" + esc(toMoney(p.amount)) + "</td>",
                "<td><span class='status-badge " + ((p.status || "") === "Completed" ? "active" : "inactive") + "'>" + esc(p.status || "") + "</span>" +
                    (actions ? "<div class='inline-actions'>" + actions + "</div>" : "") + "</td>",
                "<td>" + esc((p.payment_date || p.paymentDate || "").toString().slice(0, 10)) + "</td>",
                "<td>" + esc(p.payment_method || p.method || "") + "</td>"
            ].join("");
            tbody.appendChild(tr);
        });
        setText("payment-history-count", String(state.payments.length));
    }

    function renderPendingRequests() {
        var tbody = document.getElementById("approval-requests-body");
        if (!tbody) return;
        tbody.innerHTML = "";
        state.pendingRequests.forEach(function (r) {
            var tr = document.createElement("tr");
            tr.innerHTML = [
                "<td>" + esc(r.full_name) + "</td>",
                "<td>" + esc(r.email) + "</td>",
                "<td>" + esc(r.role) + "</td>",
                "<td>" + esc(r.registration_number) + "</td>",
                "<td>" + esc((r.created_at || "").slice(0, 10)) + "</td>",
                "<td>",
                "<button class='action-btn approval-btn' data-action='approve' data-id='" + esc(r.id) + "'>Approve</button> ",
                "<button class='action-btn approval-btn' data-action='reject' data-id='" + esc(r.id) + "'>Reject</button>",
                "</td>"
            ].join("");
            tbody.appendChild(tr);
        });
        setText("pending-requests-count", String(state.pendingRequests.length));
    }

    function esc(v) {
        return String(v || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function drawPaymentsChart() {
        var canvas = document.getElementById("payments-chart");
        if (!canvas || !canvas.getContext) return;
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var series = buildMonthlySeries();
        var max = Math.max.apply(null, series.map(function (s) { return s.total; }).concat([1]));
        var margin = { left: 35, right: 10, top: 18, bottom: 30 };
        var cw = canvas.width - margin.left - margin.right;
        var ch = canvas.height - margin.top - margin.bottom;
        var barW = Math.max(24, cw / (series.length * 1.8));
        var gap = (cw - barW * series.length) / Math.max(1, series.length - 1);

        ctx.strokeStyle = "#d1d5db";
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top + ch);
        ctx.lineTo(margin.left + cw, margin.top + ch);
        ctx.stroke();

        series.forEach(function (item, i) {
            var x = margin.left + i * (barW + gap);
            var h = (item.total / max) * (ch - 5);
            var y = margin.top + ch - h;
            ctx.fillStyle = "#6d28d9";
            ctx.fillRect(x, y, barW, h);
            ctx.fillStyle = "#111827";
            ctx.textAlign = "center";
            ctx.font = "12px sans-serif";
            ctx.fillText(item.label, x + barW / 2, margin.top + ch + 16);
        });
    }

    function buildMonthlySeries() {
        var now = new Date();
        var list = [];
        for (var i = 5; i >= 0; i--) {
            var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            var total = state.payments
                .filter(function (p) {
                    var pd = new Date(p.payment_date || p.paymentDate);
                    return (p.status || "") === "Completed" &&
                        pd.getMonth() === d.getMonth() &&
                        pd.getFullYear() === d.getFullYear();
                })
                .reduce(function (acc, p) { return acc + Number(p.amount || 0); }, 0);
            list.push({ label: d.toLocaleString(undefined, { month: "short" }), total: total });
        }
        return list;
    }

    function setupForms() {
        var studentForm = document.getElementById("student-form");
        var teacherForm = document.getElementById("teacher-form");
        var paymentForm = document.getElementById("payment-form");
        var gradeFeeForm = document.getElementById("grade-fee-form");

        studentForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            try {
                await window.EduFlowAPI.request("/admin/students", {
                    method: "POST",
                    body: JSON.stringify({
                        studentId: document.getElementById("student-id").value.trim(),
                        name: document.getElementById("student-name").value.trim(),
                        grade: document.getElementById("student-grade").value.trim(),
                        email: document.getElementById("student-email").value.trim(),
                        subjects: parseSubjects(document.getElementById("student-subjects").value)
                    })
                });
                studentForm.reset();
                closeModal("student-modal");
                await loadAll();
            } catch (error) {
                alert(error.message || "Could not create student");
            }
        });

        teacherForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            try {
                await window.EduFlowAPI.request("/admin/teachers", {
                    method: "POST",
                    body: JSON.stringify({
                        teacherId: document.getElementById("teacher-id").value.trim(),
                        name: document.getElementById("teacher-name").value.trim(),
                        email: document.getElementById("teacher-email").value.trim(),
                        subjects: parseSubjects(document.getElementById("teacher-subjects").value)
                    })
                });
                teacherForm.reset();
                closeModal("teacher-modal");
                await loadAll();
            } catch (error) {
                alert(error.message || "Could not create teacher");
            }
        });

        paymentForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            try {
                await window.EduFlowAPI.request("/admin/payment-records", {
                    method: "POST",
                    body: JSON.stringify({
                        studentId: document.getElementById("payment-student-id").value.trim(),
                        studentName: document.getElementById("payment-student-name").value.trim(),
                        amount: Number(document.getElementById("payment-amount").value),
                        paymentDate: document.getElementById("payment-date").value,
                        paymentMethod: document.getElementById("payment-method").value.trim(),
                        status: document.getElementById("payment-status").value
                    })
                });
                paymentForm.reset();
                closeModal("payment-modal");
                await loadAll();
            } catch (error) {
                alert(error.message || "Could not create payment record");
            }
        });

        gradeFeeForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            try {
                await window.EduFlowAPI.request("/admin/grade-fees", {
                    method: "POST",
                    body: JSON.stringify({
                        gradeLevel: document.getElementById("grade-fee-grade").value.trim(),
                        feeName: document.getElementById("grade-fee-name").value.trim(),
                        amount: Number(document.getElementById("grade-fee-amount").value),
                        dueDate: document.getElementById("grade-fee-due").value
                    })
                });
                gradeFeeForm.reset();
                closeModal("grade-fee-modal");
                await loadAll();
            } catch (error) {
                alert(error.message || "Could not save grade fee");
            }
        });
    }

    function setupActions() {
        document.getElementById("open-add-student").addEventListener("click", function () { openModal("student-modal"); });
        document.getElementById("open-add-teacher").addEventListener("click", function () { openModal("teacher-modal"); });
        document.getElementById("open-add-payment").addEventListener("click", function () { openModal("payment-modal"); });
        document.getElementById("open-grade-fee").addEventListener("click", function () { openModal("grade-fee-modal"); });
        document.getElementById("open-quick-add").addEventListener("click", function () { openModal("student-modal"); });

        document.querySelectorAll("[data-close-modal]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                closeModal(btn.getAttribute("data-close-modal"));
            });
        });

        document.addEventListener("click", async function (e) {
            var target = e.target;
            if (target.classList.contains("approval-btn")) {
                var id = target.getAttribute("data-id");
                var action = target.getAttribute("data-action");
                var type = target.getAttribute("data-type");
                if (type === "approve-payment" || type === "reject-payment") {
                    try {
                        var path = "/admin/payments/" + id + "/" + (type === "approve-payment" ? "approve" : "reject");
                        await window.EduFlowAPI.request(path, { method: "POST", body: JSON.stringify({}) });
                        await loadAll();
                    } catch (error) {
                        alert(error.message || "Payment action failed");
                    }
                    return;
                }

                if (action) {
                    try {
                        await window.EduFlowAPI.request("/admin/registration-requests/" + id + "/" + action, {
                            method: "POST",
                            body: JSON.stringify({})
                        });
                        await loadAll();
                    } catch (error) {
                        alert(error.message || "Action failed");
                    }
                }
            }

            if (target.classList.contains("action-btn") && target.getAttribute("data-type") === "student") {
                try {
                    await window.EduFlowAPI.request("/admin/students/" + encodeURIComponent(target.getAttribute("data-id")), {
                        method: "DELETE"
                    });
                    await loadAll();
                } catch (error) {
                    alert(error.message || "Could not delete student");
                }
            }

            if (target.classList.contains("action-btn") && target.getAttribute("data-type") === "teacher") {
                try {
                    await window.EduFlowAPI.request("/admin/teachers/" + encodeURIComponent(target.getAttribute("data-id")), {
                        method: "DELETE"
                    });
                    await loadAll();
                } catch (error) {
                    alert(error.message || "Could not delete teacher");
                }
            }

            if (target.classList.contains("action-btn") && target.getAttribute("data-type") === "assign-teacher-subjects") {
                var teacherId = target.getAttribute("data-id");
                var current = "";
                var teacher = state.teachers.find(function (t) {
                    return String(t.teacher_id || t.teacherId || "") === String(teacherId || "");
                });
                if (teacher) {
                    var currentSubjects = [];
                    try {
                        currentSubjects = Array.isArray(teacher.subjects) ? teacher.subjects : JSON.parse(teacher.subjects || "[]");
                    } catch (error) {
                        currentSubjects = [];
                    }
                    current = currentSubjects.map(function (s) {
                        if (typeof s === "string") return s;
                        if (s && typeof s === "object") {
                            return s.gradeLevel ? (s.name + " | " + s.gradeLevel) : s.name;
                        }
                        return "";
                    }).filter(Boolean).join(", ");
                }

                var input = prompt("Assign subjects + grades to " + teacherId + " (comma separated, e.g., Math|Grade 10, Physics|Grade 11):", current);
                if (input === null) return;
                var subjects = parseSubjects(input);
                if (!subjects.length) {
                    alert("No subjects provided.");
                    return;
                }

                try {
                    await window.EduFlowAPI.request("/admin/teachers/" + encodeURIComponent(teacherId) + "/subjects", {
                        method: "POST",
                        body: JSON.stringify({ subjects: subjects })
                    });
                    await loadAll();
                } catch (error) {
                    alert(error.message || "Could not assign teacher subjects");
                }
            }
        });
    }

    function setupSearch() {
        var search = document.getElementById("admin-search");
        search.addEventListener("input", function () {
            var term = search.value.trim().toLowerCase();
            ["students-table-body", "teachers-table-body", "payment-history-body", "approval-requests-body"].forEach(function (id) {
                var body = document.getElementById(id);
                if (!body) return;
                Array.prototype.forEach.call(body.querySelectorAll("tr"), function (row) {
                    row.style.display = !term || row.textContent.toLowerCase().indexOf(term) !== -1 ? "" : "none";
                });
            });
        });
    }

    function setupReports() {
        document.getElementById("download-students-report").addEventListener("click", function () {
            downloadCsv("students-report.csv", state.students, ["student_id", "name", "email", "grade_level", "status"]);
        });
        document.getElementById("download-teachers-report").addEventListener("click", function () {
            downloadCsv("teachers-report.csv", state.teachers, ["teacher_id", "name", "email"]);
        });
        document.getElementById("download-payments-report").addEventListener("click", function () {
            downloadCsv("payments-report.csv", state.payments, ["transaction_id", "student_identifier", "student_name", "amount", "status", "payment_date", "payment_method"]);
        });
        document.getElementById("download-summary-report").addEventListener("click", function () {
            var summary = [{
                total_students: state.students.length,
                total_teachers: state.teachers.length,
                total_payments: state.payments.length,
                total_paid: sumPaymentsByStatus("Completed")
            }];
            downloadCsv("system-summary.csv", summary, ["total_students", "total_teachers", "total_payments", "total_paid"]);
        });
    }

    function downloadCsv(fileName, rows, columns) {
        var head = columns.join(",");
        var body = rows.map(function (row) {
            return columns.map(function (col) {
                var val = row[col] === undefined || row[col] === null ? "" : String(row[col]);
                return '"' + val.replace(/"/g, '""') + '"';
            }).join(",");
        }).join("\n");
        var csv = head + "\n" + body;
        var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setText("report-status", "Downloaded " + fileName + " at " + new Date().toLocaleString());
    }

    setupActions();
    setupForms();
    setupSearch();
    setupReports();
    loadAll();
});
