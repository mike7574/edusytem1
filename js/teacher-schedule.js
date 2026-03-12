// js/teacher-schedule.js - Teacher Schedule Page Interactions

document.addEventListener('DOMContentLoaded', function () {
    var toggleBtns = document.querySelectorAll('.toggle-btn');
    var scheduleViews = document.querySelectorAll('.schedule-view');
    var dayHeaders = document.querySelectorAll('.day-header');
    var prevDayBtn = document.querySelector('.prev-day');
    var nextDayBtn = document.querySelector('.next-day');
    var selectedDateEl = document.getElementById('selected-date');
    var weekSelector = document.getElementById('week-selector');

    var currentSelectedDate = new Date(2026, 2, 5);

    toggleBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var selectedView = this.getAttribute('data-view');
            toggleBtns.forEach(function (b) { b.classList.remove('active'); });
            scheduleViews.forEach(function (v) { v.classList.remove('active'); });
            this.classList.add('active');
            var view = document.getElementById(selectedView + '-view');
            if (view) view.classList.add('active');
        });
    });

    function updateSelectedDate() {
        var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        var dateStr = currentSelectedDate.toLocaleDateString('en-US', options);
        if (selectedDateEl) selectedDateEl.textContent = dateStr;
    }

    if (prevDayBtn) {
        prevDayBtn.addEventListener('click', function () {
            currentSelectedDate.setDate(currentSelectedDate.getDate() - 1);
            updateSelectedDate();
        });
    }

    if (nextDayBtn) {
        nextDayBtn.addEventListener('click', function () {
            currentSelectedDate.setDate(currentSelectedDate.getDate() + 1);
            updateSelectedDate();
        });
    }

    if (weekSelector) {
        weekSelector.addEventListener('change', function () {
            console.log('Selected week:', this.value);
        });
    }

    dayHeaders.forEach(function (header) {
        var dayColumn = header.closest('.day-column');
        if (!dayColumn) return;
        dayColumn.addEventListener('click', function () {
            var dayViewBtn = document.querySelector('[data-view="day"]');
            if (dayViewBtn) dayViewBtn.click();
        });
    });

    function animateValue(element, start, end, duration) {
        var startTimestamp = null;
        function step(timestamp) {
            if (!startTimestamp) startTimestamp = timestamp;
            var progress = Math.min((timestamp - startTimestamp) / duration, 1);
            element.textContent = String(Math.floor(progress * (end - start) + start));
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    var summaryValues = document.querySelectorAll('.summary-value');
    summaryValues.forEach(function (val, index) {
        var targetValue = parseInt(val.textContent, 10);
        if (isNaN(targetValue)) return;
        setTimeout(function () {
            animateValue(val, 0, targetValue, 800);
        }, index * 100);
    });

    var classBlocks = document.querySelectorAll('.class-block');
    classBlocks.forEach(function (block) {
        block.addEventListener('mouseenter', function () {
            this.style.transform = 'scale(1.02)';
        });
        block.addEventListener('mouseleave', function () {
            this.style.transform = 'scale(1)';
        });

        block.addEventListener('click', function () {
            var titleNode = this.querySelector('h4');
            var roomNode = this.querySelector('.block-room');
            var title = titleNode ? titleNode.textContent : 'Class';
            var room = roomNode ? roomNode.textContent : 'Room';
            console.log('Class selected:', title, 'at', room);
        });

        var tipTitleNode = block.querySelector('h4');
        var tipRoomNode = block.querySelector('.block-room');
        var tipTitle = tipTitleNode ? tipTitleNode.textContent : 'Class';
        var tipRoom = tipRoomNode ? tipRoomNode.textContent : 'Room';
        block.title = tipTitle + '\n' + tipRoom;
    });

    var printScheduleBtn = document.createElement('button');
    printScheduleBtn.textContent = 'Print Schedule';
    printScheduleBtn.style.cssText = [
        'background: var(--primary-purple)',
        'color: white',
        'border: none',
        'padding: 10px 18px',
        'border-radius: 8px',
        'font-weight: 700',
        'font-size: 14px',
        'cursor: pointer',
        'margin-top: 16px'
    ].join(';');
    printScheduleBtn.addEventListener('click', function () { window.print(); });

    var schedulePageHeader = document.querySelector('.schedule-page-header');
    if (schedulePageHeader && schedulePageHeader.parentNode) {
        schedulePageHeader.parentNode.insertBefore(printScheduleBtn, schedulePageHeader.nextSibling);
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'w' || e.key === 'W') {
            var w = document.querySelector('[data-view="week"]');
            if (w) w.click();
        }
        if (e.key === 'd' || e.key === 'D') {
            var d = document.querySelector('[data-view="day"]');
            if (d) d.click();
        }
        if (e.key === 'l' || e.key === 'L') {
            var l = document.querySelector('[data-view="list"]');
            if (l) l.click();
        }
        var dayView = document.getElementById('day-view');
        if (!dayView || !dayView.classList.contains('active')) return;
        if (e.key === 'ArrowRight' && nextDayBtn) nextDayBtn.click();
        if (e.key === 'ArrowLeft' && prevDayBtn) prevDayBtn.click();
    });

    console.log('Teacher Schedule page loaded and ready');
});
