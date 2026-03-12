(function () {
    function parseSession() {
        try {
            var raw = localStorage.getItem("userSession");
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    function checkAuthentication() {
        var userSession = parseSession();
        var userRole = localStorage.getItem("userRole");
        if (!userSession || !userRole) {
            window.location.href = "index.html";
            return false;
        }
        return true;
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function formatMoney(value) {
        var numeric = Number(value || 0);
        return "KSh " + numeric.toLocaleString();
    }

    function formatDateToday() {
        return new Date().toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }

    function bindSessionIdentity() {
        var session = parseSession();
        if (!session) return;
        var name = session.name || "Student";
        var role = (session.role || "").toLowerCase();

        var userMetaName = document.querySelector(".user-meta h4");
        if (userMetaName) userMetaName.textContent = name;
        if (role === "student") setText("student-sidebar-name", name);
    }

    async function hydrateStudentDashboard() {
        var role = (localStorage.getItem("userRole") || "").toLowerCase();
        var hasDashboard = document.getElementById("student-welcome-name");
        if (role !== "student" || !hasDashboard || !window.EduFlowAPI) return;

        setText("student-today-date", formatDateToday());

        try {
            var res = await window.EduFlowAPI.request("/student/me/summary");
            var data = res && res.data ? res.data : {};
            var profile = data.profile || {};
            var stats = data.stats || {};
            var term = data.currentTerm || {};

            setText("student-sidebar-name", profile.name || "Student");
            setText("student-sidebar-class", [profile.gradeLevel || "Class", profile.stream || ""].filter(Boolean).join(" • "));
            setText("student-welcome-name", "Good morning, " + (profile.name || "Student") + "!");
            setText("student-term-badge", (term.termName || "Term") + " • " + (term.yearLabel || ""));
            setText("student-gpa-value", Number(stats.gpa || 0).toFixed(2));
            setText("student-attendance-value", String(Number(stats.attendancePercentage || 0)) + "%");
            setText("student-fees-value", formatMoney(stats.pendingFees || 0));
            setText("student-assignments-value", String(Number(stats.assignmentsDue || 0)) + " Due");
        } catch (error) {
            console.error("Could not load student dashboard data:", error);
        }
    }

    if (!checkAuthentication()) return;
    bindSessionIdentity();

    function setupSidebar() {
        var container = document.querySelector(".app-container");
        var toggle = document.querySelector(".menu-toggle");
        var backdrop = document.querySelector(".sidebar-backdrop");
        if (container && toggle) {
            toggle.addEventListener("click", function () {
                container.classList.toggle("sidebar-open");
            });
        }
        if (container && backdrop) {
            backdrop.addEventListener("click", function () {
                container.classList.remove("sidebar-open");
            });
        }
    }

    var STORAGE_KEY = "eduflow_profilePhotoDataUrl_v1";
    var MAX_BYTES = 5 * 1024 * 1024;

    function safeGet(key) {
        try { return localStorage.getItem(key); } catch (_) { return null; }
    }

    function safeSet(key, value) {
        try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
    }

    function isImageDataUrl(value) {
        return typeof value === "string" && /^data:image\//.test(value);
    }

    function updateStatus(text) {
        var el = document.getElementById("photo-status");
        if (el) el.textContent = text;
    }

    function applyPhoto(dataUrl) {
        var targets = document.querySelectorAll(".header-avatar, .user-avatar, .profile-avatar");
        for (var i = 0; i < targets.length; i++) {
            var img = targets[i];
            if (img && img.tagName === "IMG") img.src = dataUrl;
        }
    }

    function ensureInput() {
        var input = document.getElementById("profile-photo-input");
        if (input) return input;
        input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.id = "profile-photo-input";
        input.style.display = "none";
        document.body.appendChild(input);
        return input;
    }

    function openPicker() {
        var input = ensureInput();
        if (!input) return;
        input.value = "";
        input.click();
    }

    function setupPhotoUpload() {
        var stored = safeGet(STORAGE_KEY);
        if (isImageDataUrl(stored)) applyPhoto(stored);

        var clickable = document.querySelectorAll(".avatar-edit-btn, .profile-avatar, .header-avatar, .user-avatar");
        for (var j = 0; j < clickable.length; j++) {
            var node = clickable[j];
            if (!node) continue;
            node.style.cursor = "pointer";
            node.addEventListener("click", function () { openPicker(); });
        }

        var inputEl = ensureInput();
        if (!inputEl) return;

        inputEl.addEventListener("change", function () {
            var file = inputEl.files && inputEl.files[0] ? inputEl.files[0] : null;
            if (!file) return;

            var isImage = typeof file.type === "string" && file.type.indexOf("image/") === 0;
            if (!isImage) {
                updateStatus("Please select an image file.");
                return;
            }
            if (file.size > MAX_BYTES) {
                updateStatus("Image too large. Please choose a file under 5MB.");
                return;
            }

            var reader = new FileReader();
            reader.onload = function () {
                var dataUrl = typeof reader.result === "string" ? reader.result : null;
                if (!isImageDataUrl(dataUrl)) {
                    updateStatus("Could not read the image. Try another file.");
                    return;
                }
                applyPhoto(dataUrl);
                updateStatus("Profile photo updated.");
                safeSet(STORAGE_KEY, dataUrl);
            };
            reader.onerror = function () {
                updateStatus("Could not read the image. Try another file.");
            };
            reader.readAsDataURL(file);
        });
    }

    function animateNumberElement(el) {
        if (!el) return;
        var original = (el.textContent || "").trim();
        var match = original.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
        if (!match) return;

        var prefix = match[1] || "";
        var numStr = match[2];
        var suffix = match[3] || "";
        var target = parseFloat(numStr);
        if (!isFinite(target) || target <= 0) return;

        var isInt = Math.abs(target % 1) < 0.0001;
        var start = target <= 20 ? Math.max(0, target - 2) : Math.max(0, target - Math.max(2, target * 0.1));
        var frames = 6;
        var duration = 300;
        var stepTime = duration / frames;
        var current = start;
        var step = (target - start) / frames;
        var frame = 0;

        function render(value, done) {
            var display = isInt ? Math.round(value) : value.toFixed(2).replace(/\.00$/, "");
            el.textContent = prefix + display + suffix;
            if (done) el.textContent = original;
        }

        render(start, false);
        var timer = setInterval(function () {
            frame += 1;
            if (frame >= frames) {
                clearInterval(timer);
                render(target, true);
                return;
            }
            current += step;
            render(current, false);
        }, stepTime);
    }

    function runNumberAnimations() {
        var selectors = [".stat-value", ".donut-center .percent"];
        for (var s = 0; s < selectors.length; s++) {
            var nodes = document.querySelectorAll(selectors[s]);
            for (var i = 0; i < nodes.length; i++) animateNumberElement(nodes[i]);
        }
    }

    function runChartAnimations() {
        var bars = document.querySelectorAll(".bar-chart .bar");
        for (var i = 0; i < bars.length; i++) {
            (function (bar, delay) {
                if (!bar) return;
                var targetHeight = bar.style.height || "";
                if (!targetHeight) return;
                bar.style.height = "0%";
                setTimeout(function () { bar.style.height = targetHeight; }, delay);
            })(bars[i], 80 * i);
        }

        var donut = document.querySelector(".donut-chart");
        if (donut) {
            setTimeout(function () { donut.classList.add("is-ready"); }, 150);
        }
    }

    function initAnimations() {
        setupSidebar();
        setupPhotoUpload();
        runNumberAnimations();
        runChartAnimations();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAnimations);
        document.addEventListener("DOMContentLoaded", hydrateStudentDashboard);
    } else {
        initAnimations();
        hydrateStudentDashboard();
    }
})();
