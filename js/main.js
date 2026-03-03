(function () {
    // Sidebar (mobile) toggle
    var container = document.querySelector('.app-container');
    var toggle = document.querySelector('.menu-toggle');
    var backdrop = document.querySelector('.sidebar-backdrop');
    if (container && toggle) {
        toggle.addEventListener('click', function () {
            container.classList.toggle('sidebar-open');
        });
    }
    if (container && backdrop) {
        backdrop.addEventListener('click', function () {
            container.classList.remove('sidebar-open');
        });
    }

    // Shared profile photo (persisted in localStorage)
    var STORAGE_KEY = 'eduflow_profilePhotoDataUrl_v1';
    var MAX_BYTES = 5 * 1024 * 1024;

    function safeGet(key) {
        try { return localStorage.getItem(key); } catch (_) { return null; }
    }
    function safeSet(key, value) {
        try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
    }
    function isImageDataUrl(value) {
        return typeof value === 'string' && /^data:image\//.test(value);
    }
    function updateStatus(text) {
        var el = document.getElementById('photo-status');
        if (el) el.textContent = text;
    }
    function applyPhoto(dataUrl) {
        var targets = document.querySelectorAll('.header-avatar, .user-avatar, .profile-avatar');
        for (var i = 0; i < targets.length; i++) {
            var img = targets[i];
            if (img && img.tagName === 'IMG') img.src = dataUrl;
        }
    }

    function ensureInput() {
        var input = document.getElementById('profile-photo-input');
        if (input) return input;
        input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.id = 'profile-photo-input';
        input.style.display = 'none';
        document.body.appendChild(input);
        return input;
    }

    function openPicker() {
        var input = ensureInput();
        if (!input) return;
        input.value = '';
        input.click();
    }

    // Load stored photo on every page
    var stored = safeGet(STORAGE_KEY);
    if (isImageDataUrl(stored)) {
        applyPhoto(stored);
    }

    // Allow changing photo from any page by clicking avatars / pencil
    var clickable = document.querySelectorAll('.avatar-edit-btn, .profile-avatar, .header-avatar, .user-avatar');
    for (var j = 0; j < clickable.length; j++) {
        var node = clickable[j];
        if (!node) continue;
        node.style.cursor = 'pointer';
        node.addEventListener('click', function () { openPicker(); });
    }

    var inputEl = ensureInput();
    if (inputEl) {
        inputEl.addEventListener('change', function () {
            var file = inputEl.files && inputEl.files[0] ? inputEl.files[0] : null;
            if (!file) return;

            var isImage = typeof file.type === 'string' && file.type.indexOf('image/') === 0;
            if (!isImage) {
                updateStatus('Please select an image file.');
                return;
            }
            if (file.size > MAX_BYTES) {
                updateStatus('Image too large. Please choose a file under 5MB.');
                return;
            }

            var reader = new FileReader();
            reader.onload = function () {
                var dataUrl = typeof reader.result === 'string' ? reader.result : null;
                if (!isImageDataUrl(dataUrl)) {
                    updateStatus('Could not read the image. Try another file.');
                    return;
                }
                applyPhoto(dataUrl);
                updateStatus('Profile photo updated.');
                safeSet(STORAGE_KEY, dataUrl);
            };
            reader.onerror = function () {
                updateStatus('Could not read the image. Try another file.');
            };
            reader.readAsDataURL(file);
        });
    }

    // Lightweight number "countdown / count-up" animation
    function animateNumberElement(el) {
        if (!el) return;
        var original = (el.textContent || '').trim();
        if (!original) return;

        var match = original.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
        if (!match) return;

        var prefix = match[1] || '';
        var numStr = match[2];
        var suffix = match[3] || '';
        var target = parseFloat(numStr);
        if (!isFinite(target) || target <= 0) return;

        var isInt = Math.abs(target % 1) < 0.0001;

        // Example: 10 -> start at 8 then reach 10
        var start;
        if (target <= 20) {
            start = Math.max(0, target - 2);
        } else {
            var delta = Math.max(2, target * 0.1);
            start = Math.max(0, target - delta);
        }

        var frames = 6;
        var duration = 300; // ms
        var stepTime = duration / frames;
        var current = start;
        var step = (target - start) / frames;
        var frame = 0;

        function render(value, done) {
            var display = isInt ? Math.round(value) : value.toFixed(2).replace(/\.00$/, '');
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
        var selectors = [
            '.stat-value',
            '.donut-center .percent'
        ];
        for (var s = 0; s < selectors.length; s++) {
            var nodes = document.querySelectorAll(selectors[s]);
            for (var i = 0; i < nodes.length; i++) {
                animateNumberElement(nodes[i]);
            }
        }
    }

    // Simple chart animations (attendance bars + fees donut)
    function runChartAnimations() {
        var bars = document.querySelectorAll('.bar-chart .bar');
        for (var i = 0; i < bars.length; i++) {
            (function (bar, delay) {
                if (!bar) return;
                var targetHeight = bar.style.height || '';
                if (!targetHeight) return;
                bar.style.height = '0%';
                setTimeout(function () {
                    bar.style.height = targetHeight;
                }, delay);
            })(bars[i], 80 * i);
        }

        var donut = document.querySelector('.donut-chart');
        if (donut) {
            setTimeout(function () {
                donut.classList.add('is-ready');
            }, 150);
        }
    }

    function initAnimations() {
        runNumberAnimations();
        runChartAnimations();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAnimations);
    } else {
        initAnimations();
    }
})();
