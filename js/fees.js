(function () {
    var state = {
        fees: [],
        payments: [],
        selectedFeeId: null
    };
    var payButtonsBound = false;

    function toNum(value) {
        return Number(value || 0);
    }

    function money(amount) {
        return "KSh " + toNum(amount).toLocaleString();
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function statusClass(status) {
        var s = String(status || "").toLowerCase();
        if (s === "completed" || s === "paid") return "paid";
        if (s === "pending") return "outstanding";
        if (s === "failed") return "failed";
        return "outstanding";
    }

    function renderDonut(paidPct) {
        var donut = document.getElementById("fees-donut");
        var percent = Math.max(0, Math.min(100, toNum(paidPct)));
        if (!donut) return;
        donut.style.background = "conic-gradient(#10B981 0deg " + (percent * 3.6) + "deg, #F87171 " + (percent * 3.6) + "deg 360deg)";
        donut.classList.add("is-ready");
        setText("fees-paid-pct", percent + "%");
    }

    function renderUpcoming(fees) {
        var grid = document.getElementById("fees-upcoming-grid");
        if (!grid) return;
        grid.innerHTML = "";
        var list = fees.filter(function (f) { return toNum(f.outstanding_balance) > 0; }).slice(0, 3);
        if (!list.length) {
            grid.innerHTML = "<p class='text-muted'>No pending fee items.</p>";
            return;
        }

        list.forEach(function (item) {
            var card = document.createElement("div");
            card.className = "pay-card";
            card.innerHTML = [
                "<div class='pay-info'>",
                "<h4>" + (item.fee_name || "Fee Item") + "</h4>",
                "<p>Due: " + (item.due_date ? String(item.due_date).slice(0, 10) : "-") + "</p>",
                "<h3 class='price'>" + money(item.outstanding_balance) + "</h3>",
                "</div>",
                "<button class='pay-now-btn' type='button' data-fee-id='" + item.id + "'>Pay now</button>"
            ].join("");
            grid.appendChild(card);
        });
    }

    function renderPaymentHistory(payments) {
        var list = document.getElementById("payment-history-list");
        if (!list) return;
        list.innerHTML = "";

        if (!payments.length) {
            list.innerHTML = "<li class='payment-history-item'><div class='payment-details'><span class='payment-fee-name'>No payment history yet.</span></div></li>";
            return;
        }

        payments.forEach(function (p) {
            var li = document.createElement("li");
            li.className = "payment-history-item";
            var metaParts = [];
            if (p.payment_date) metaParts.push(String(p.payment_date).slice(0, 10));
            if (p.payment_method) metaParts.push(p.payment_method);
            if (p.reference_id) metaParts.push("Ref: " + p.reference_id);
            li.innerHTML = [
                "<span class='payment-status-icon " + statusClass(p.status) + "' aria-hidden='true'>•</span>",
                "<div class='payment-details'>",
                "<span class='payment-fee-name'>" + (p.fee_name || p.student_name || "Payment") + "</span>",
                "<p class='payment-meta'>" + metaParts.join(" · ") + "</p>",
                "</div>",
                "<div class='payment-amount-block'>",
                "<span class='payment-amount'>" + (statusClass(p.status) === "paid" ? "+" : "") + money(p.amount) + "</span>",
                "<p class='payment-txn'>" + (p.status || "-") + "</p>",
                "</div>"
            ].join("");
            list.appendChild(li);
        });
    }

    function openPaymentModal(feeId) {
        var modal = document.getElementById("student-payment-modal");
        var feeName = document.getElementById("payment-fee-name");
        var outstandingEl = document.getElementById("payment-outstanding");
        var amountEl = document.getElementById("payment-amount");
        var hiddenId = document.getElementById("payment-fee-id");
        var message = document.getElementById("payment-status-msg");
        if (!modal || !feeName || !outstandingEl || !amountEl || !hiddenId) return;

        var fee = state.fees.find(function (f) { return String(f.id) === String(feeId); });
        if (!fee) return;

        state.selectedFeeId = fee.id;
        feeName.value = fee.fee_name || "Fee Item";
        outstandingEl.value = money(f.outstanding_balance);
        amountEl.value = Number(f.outstanding_balance || 0).toFixed(2);
        hiddenId.value = fee.id;
        if (message) message.textContent = "";

        modal.classList.remove("hidden");
    }

    function closePaymentModal() {
        var modal = document.getElementById("student-payment-modal");
        if (modal) modal.classList.add("hidden");
        state.selectedFeeId = null;
    }

    function wirePaymentModal() {
        var modal = document.getElementById("student-payment-modal");
        if (!modal) return;
        modal.addEventListener("click", function (e) {
            var target = e.target;
            if (target.getAttribute("data-close-payment") === "true") {
                closePaymentModal();
            }
        });

        var form = document.getElementById("student-payment-form");
        if (form) {
            form.addEventListener("submit", async function (e) {
                e.preventDefault();
                var amount = Number(document.getElementById("payment-amount").value);
                var method = document.getElementById("payment-method").value;
                var reference = document.getElementById("payment-reference").value.trim();
                var hiddenId = document.getElementById("payment-fee-id").value;
                var message = document.getElementById("payment-status-msg");

                if (!hiddenId || !amount || amount <= 0) {
                    if (message) message.textContent = "Enter a valid amount.";
                    return;
                }

                try {
                    await window.EduFlowAPI.request("/student/me/payments", {
                        method: "POST",
                        body: JSON.stringify({
                            studentFeeId: Number(hiddenId),
                            amount: amount,
                            paymentMethod: method,
                            referenceId: reference,
                            paymentDate: new Date().toISOString().slice(0, 10)
                        })
                    });
                    if (message) message.textContent = "Submitted for approval. We'll refresh your balances.";
                    closePaymentModal();
                    await initFees(); // refresh data
                } catch (error) {
                    if (message) message.textContent = error.message || "Could not submit payment.";
                }
            });
        }
    }

    function wirePayButtons() {
        var grid = document.getElementById("fees-upcoming-grid");
        if (!grid || payButtonsBound) return;
        payButtonsBound = true;
        grid.addEventListener("click", function (e) {
            var btn = e.target.closest(".pay-now-btn");
            if (!btn) return;
            var feeId = btn.getAttribute("data-fee-id");
            openPaymentModal(feeId);
        });
    }

    async function initFees() {
        if (!window.EduFlowAPI) return;
        try {
            var res = await window.EduFlowAPI.request("/student/me/fees");
            var summary = res.summary || {};
            state.fees = Array.isArray(res.fees) ? res.fees : [];
            state.payments = Array.isArray(res.payments) ? res.payments : [];
            var fees = state.fees;
            var payments = state.payments;

            setText("fees-total", money(summary.totalFees));
            setText("fees-paid", money(summary.paid));
            setText("fees-outstanding", money(summary.outstanding));
            setText("fees-year-label", "Backend-linked finance overview");

            renderDonut(summary.paidPct);
            renderUpcoming(fees);
            renderPaymentHistory(payments);
            wirePayButtons();
        } catch (error) {
            console.error("Failed to load fees:", error);
            var list = document.getElementById("payment-history-list");
            if (list) list.innerHTML = "<li class='payment-history-item'><div class='payment-details'><span class='payment-fee-name'>Could not load finance data.</span></div></li>";
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initFees);
        document.addEventListener("DOMContentLoaded", wirePaymentModal);
    } else {
        initFees();
        wirePaymentModal();
    }
})();
