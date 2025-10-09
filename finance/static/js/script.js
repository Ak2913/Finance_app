document.addEventListener("DOMContentLoaded", () => {

    // ====== USER MANAGEMENT ======
    const userTable = document.querySelector(".user-table tbody");
    const userModal = document.getElementById("userModal");
    const addUserBtn = document.getElementById("addUserBtn");
    const closeUserModal = userModal?.querySelector(".close");
    const viewUserModal = document.getElementById("viewModal");
    const closeViewModal = viewUserModal?.querySelector(".closeView");
    const userForm = document.getElementById("addUserForm");
    const userModalTitle = document.getElementById("userModalTitle");
    const originalUserIdInput = document.getElementById("originalUserId");
    const idProofInput = document.getElementById("idProof");
    const photoInput = document.getElementById("photo");
    const viewIdProof = document.getElementById("viewIdProof");
    const viewPhoto = document.getElementById("viewPhoto");
    const viewCheque = document.getElementById("viewChequefile");

    function computeNextUserId() {
        const ids = Array.from(userTable.querySelectorAll("tr td:first-child"))
            .map(td => td.textContent.trim())
            .filter(id => /^U\d{4}$/.test(id))
            .map(id => parseInt(id.substring(1), 10));
        const nextNum = ids.length ? Math.max(...ids) + 1 : 1;
        return `U${String(nextNum).padStart(4, '0')}`;
    }

    addUserBtn?.addEventListener("click", () => {
        userModalTitle.textContent = "Add User";
        userForm.action = userForm.dataset.addAction;
        originalUserIdInput.value = "";
        idProofInput.required = true;
        photoInput.required = true;
        userForm.reset();
        document.getElementById("userId").value = computeNextUserId();
        userModal.style.display = "block";
    });

    closeUserModal?.addEventListener("click", () => userModal.style.display = "none");
    closeViewModal?.addEventListener("click", () => viewUserModal.style.display = "none");

    userTable?.addEventListener("click", e => {
        const row = e.target.closest("tr");
        if (!row) return;

        // View Documents
        if (e.target.closest('.view-btn')) {
            viewIdProof.href = `/static/uploads/${row.querySelector('.id-proof')?.textContent || ''}`;
            viewPhoto.href = `/static/uploads/${row.querySelector('.photo')?.textContent || ''}`;
            if (viewCheque) viewCheque.href = `/static/uploads/${row.querySelector('.chequeFile')?.textContent || ''}`;
            viewUserModal.style.display = 'block';
            return;
        }

        // Edit User
        if (e.target.closest('.edit-btn')) {
            const cells = row.querySelectorAll('td');
            document.getElementById('userId').value = cells[0].textContent.trim();
            document.getElementById('name').value = cells[1].textContent.trim();
            document.getElementById('address').value = cells[2].textContent.trim();
            document.getElementById('email').value = cells[3].textContent.trim();
            document.getElementById('contact').value = cells[4].textContent.trim();
            document.getElementById('status').value = cells[5].textContent.trim();
            originalUserIdInput.value = cells[0].textContent.trim();
            userModalTitle.textContent = 'Edit User';
            userForm.action = userForm.dataset.editAction;
            idProofInput.required = false;
            photoInput.required = false;
            userModal.style.display = 'block';
            return;
        }

        // Delete User
        if (e.target.closest('.delete-btn')) {
            if (!confirm('Are you sure you want to delete this user?')) return;
            const userId = row.dataset.userId;
            fetch(`/users/${encodeURIComponent(userId)}/delete`, { method: 'POST' })
                .then(res => res.json())
                .then(data => data.success ? row.remove() : alert('Delete failed.'))
                .catch(() => alert('Network error.'));
            return;
        }
    });

    // Submit User Form via AJAX
    userForm?.addEventListener("submit", e => {
        e.preventDefault();
        const formData = new FormData(userForm);
        fetch(userForm.action, { method: "POST", body: formData })
            .then(res => res.ok ? res.json() : Promise.reject("Network error"))
            .then(data => {
                if (!data.success) return alert(data.message || "Operation failed");

                userModal.style.display = "none";
                userForm.reset();

                // Update or add user row
                let existingRow = Array.from(userTable.querySelectorAll("tr"))
                    .find(r => r.children[0].textContent.trim() === data.user.userId);

                if (existingRow) {
                    existingRow.children[1].textContent = data.user.name;
                    existingRow.children[2].textContent = data.user.address;
                    existingRow.children[3].textContent = data.user.email;
                    existingRow.children[4].textContent = data.user.contact;
                    existingRow.children[5].textContent = data.user.status;
                } else {
                    const tr = document.createElement("tr");
                    tr.dataset.userId = data.user.userId;
                    tr.innerHTML = `
                        <td>${data.user.userId}</td>
                        <td>${data.user.name}</td>
                        <td>${data.user.address}</td>
                        <td>${data.user.email}</td>
                        <td>${data.user.contact}</td>
                        <td>${data.user.status}</td>
                        <td>
                            <button class="view-btn">View</button>
                            <button class="edit-btn">Edit</button>
                            <button class="delete-btn">Delete</button>
                        </td>
                    `;
                    userTable.appendChild(tr);
                }
            })
            .catch(err => { console.error(err); alert("Network error"); });
    });

    // ====== PAYMENT & TRANSACTION MANAGEMENT ======
    const paymentTable = document.getElementById("paymentTable");
    const txnModal = document.getElementById("txnModal");
    const txnForm = document.getElementById("txnForm");
    const txnUid = document.getElementById("txnUid");
    const txnName = document.getElementById("txnName");
    const txnTotal = document.getElementById("txnTotal");
    const txnViewModal = document.getElementById("txnViewModal");
    const txnViewTableBody = document.querySelector("#txnViewTable tbody");
    const closeTxn = document.getElementById("closeTxn");
    const closeTxnView = document.getElementById("closeTxnView");
    let currentPaymentRow = null;

    paymentTable?.addEventListener("click", e => {
        const row = e.target.closest("tr");
        if (!row) return;

        // Add Transaction
        if (e.target.closest(".add-txn-btn")) {
            currentPaymentRow = row;
            txnUid.value = row.children[0].textContent.trim();
            txnName.value = row.children[1].textContent.trim();
            txnTotal.value = row.children[2].textContent.trim();
            txnForm.action = `/payments/${e.target.dataset.paymentId}/transactions`;
            txnModal.style.display = "block";
            return;
        }

        // View Transactions
        if (e.target.closest(".view-txn-btn")) {
            const paymentId = e.target.dataset.paymentId;
            fetch(`/payments/${paymentId}/transactions/list`)
                .then(r => r.ok ? r.json() : Promise.reject("Failed to fetch"))
                .then(data => {
                    txnViewTableBody.innerHTML = "";
                    data.forEach(txn => {
                        const tr = document.createElement("tr");
                        tr.innerHTML = `
                            <td>${txn.date || ""}</td>
                            <td>${txn.user_id || ""}</td>
                            <td>${txn.name || ""}</td>
                            <td>${txn.total_amount?.toFixed(2) || ""}</td>
                            <td>${txn.deposit_amount?.toFixed(2) || ""}</td>
                        `;
                        txnViewTableBody.appendChild(tr);
                    });
                    txnViewModal.style.display = "block";
                });
            return;
        }

        // Delete Payment
        if (e.target.closest(".delete-payment-btn")) {
            if (!confirm("Are you sure you want to delete this payment?")) return;
            const pid = e.target.dataset.paymentId;
            fetch(`/payments/${pid}/delete`, { method: 'POST' })
                .then(res => res.json())
                .then(data => data.success ? row.remove() : alert('Delete failed'))
                .catch(() => alert('Network error'));
            return;
        }
    });

    // Submit Transaction Form via AJAX
    txnForm?.addEventListener("submit", e => {
        e.preventDefault();
        const formData = new FormData(txnForm);

        fetch(txnForm.action, { method: "POST", body: formData })
            .then(res => res.ok ? res.json() : Promise.reject("Network error"))
            .then(data => {
                if (!data.success) return alert(data.message || "Transaction failed");

                txnModal.style.display = "none";
                txnForm.reset();

                // Update payment row
                if (currentPaymentRow) {
                    currentPaymentRow.children[4].textContent = Number(data.pending).toFixed(2); // Pending
                    // Status cell is second last column
                    const statusCell = currentPaymentRow.children[currentPaymentRow.children.length - 2];
                    if (statusCell) statusCell.textContent = data.status;

                    // If status turned Done, decrement Total Investment on dashboard if present
                    if (data.status === 'Done') {
                        const totalInvEl = document.getElementById('totalInvestmentValue');
                        if (totalInvEl) {
                            const curr = parseFloat(totalInvEl.textContent.replace(/,/g, '')) || 0;
                            const principal = parseFloat(currentPaymentRow.children[2].textContent.replace(/,/g, '')) || 0;
                            const next = Math.max(0, curr - principal);
                            totalInvEl.textContent = next.toFixed(2);
                        }
                    }
                }

                // Reload transaction view
                const paymentId = txnForm.action.match(/\/payments\/(\d+)\/transactions/)[1];
                fetch(`/payments/${paymentId}/transactions/list`)
                    .then(r => r.ok ? r.json() : [])
                    .then(data => {
                        txnViewTableBody.innerHTML = "";
                        data.forEach(txn => {
                            const tr = document.createElement("tr");
                            tr.innerHTML = `
                                <td>${txn.date || ""}</td>
                                <td>${txn.user_id || ""}</td>
                                <td>${txn.name || ""}</td>
                                <td>${txn.total_amount?.toFixed(2) || ""}</td>
                                <td>${txn.deposit_amount?.toFixed(2) || ""}</td>
                            `;
                            txnViewTableBody.appendChild(tr);
                        });
                        txnViewModal.style.display = "block";
                    });
            })
            .catch(err => { console.error(err); alert("Network error"); });
    });

    // Close modals
    [userModal, viewUserModal, txnModal, txnViewModal].forEach(modal => {
        modal?.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });
    });
    closeTxn?.addEventListener("click", () => txnModal.style.display = "none");
    closeTxnView?.addEventListener("click", () => txnViewModal.style.display = "none");

    // ====== SEARCH & PAGINATION ======
    function setupPagination(tableBody, controlsEl, pageSize) {
        if (!tableBody || !controlsEl) return;
        let currentPage = 1;
        function renderPage(page) {
            const allRows = Array.from(tableBody.querySelectorAll('tr')).filter(r => r.style.display !== 'none');
            const totalPages = Math.max(1, Math.ceil(allRows.length / pageSize));
            currentPage = Math.min(Math.max(1, page), totalPages);
            tableBody.querySelectorAll('tr').forEach(r => r.style.display = 'none');
            const start = (currentPage - 1) * pageSize;
            allRows.slice(start, start + pageSize).forEach(r => r.style.display = '');
            controlsEl.querySelector('.page-info').textContent = `Page ${currentPage} of ${totalPages}`;
            controlsEl.querySelector('.prev-page').disabled = currentPage === 1;
            controlsEl.querySelector('.next-page').disabled = currentPage === totalPages;
        }
        const prevBtn = controlsEl.querySelector('.prev-page');
        const nextBtn = controlsEl.querySelector('.next-page');
        prevBtn?.addEventListener('click', e => { e.preventDefault(); renderPage(currentPage - 1); });
        nextBtn?.addEventListener('click', e => { e.preventDefault(); renderPage(currentPage + 1); });
        renderPage(1);
    }

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    function performSearch() {
        const term = searchInput.value.trim().toLowerCase();
        Array.from(userTable.querySelectorAll('tr')).forEach(row => {
            const status = (row.dataset.status || '').toLowerCase();
            row.style.display = !term || status.includes(term) ? '' : 'none';
        });
        setupPagination(userTable, document.getElementById('userPagination'), 8);
    }

    searchBtn?.addEventListener('click', performSearch);
    clearSearchBtn?.addEventListener('click', () => { searchInput.value = ''; performSearch(); });
    searchInput?.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(); });

    setupPagination(userTable, document.getElementById('userPagination'), 8);
    setupPagination(paymentTable, document.getElementById('paymentPagination'), 8);

});
