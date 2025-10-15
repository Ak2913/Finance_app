document.addEventListener("DOMContentLoaded", () => {
    const userTable = document.querySelector(".user-table tbody");
    const addUserBtn = document.getElementById("addUserBtn");
    const userModal = document.getElementById("userModal");
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
    const viewCheque = document.getElementById("viewChequeFile");

    const sortNameHeader = document.getElementById("sortName");
    const sortEmailHeader = document.getElementById("sortEmail");
    const sortStatusHeader = document.getElementById("sortStatus");
    let nameAsc = true, emailAsc = true, statusAsc = true;

    function computeNextUserId() {
        const ids = Array.from(userTable.querySelectorAll("tr td:first-child"))
            .map(td => td.textContent.trim())
            .filter(id => /^U\d{4}$/.test(id))
            .map(id => parseInt(id.substring(1), 10));
        const nextNum = ids.length ? Math.max(...ids) + 1 : 1;
        return `U${String(nextNum).padStart(4, '0')}`;
    }

    function clearSortIcons() {
        sortNameHeader.querySelector("i").className = "fa-solid fa-sort";
        sortEmailHeader.querySelector("i").className = "fa-solid fa-sort";
        sortStatusHeader.querySelector("i").className = "fa-solid fa-sort";
    }

    function updateSortIcon(header, ascending) {
        header.querySelector("i").className = ascending ? "fa-solid fa-sort-up" : "fa-solid fa-sort-down";
    }

    function sortTable(tableBody, columnIndex, ascending = true, isStatus = false) {
        const rows = Array.from(tableBody.querySelectorAll("tr")).filter(r => r.style.display !== "none");
        rows.sort((a, b) => {
            let valA = a.children[columnIndex].textContent.trim().toLowerCase();
            let valB = b.children[columnIndex].textContent.trim().toLowerCase();
            if (isStatus) { valA = valA === "active" ? 0 : 1; valB = valB === "active" ? 0 : 1; }
            if (valA < valB) return ascending ? -1 : 1;
            if (valA > valB) return ascending ? 1 : -1;
            return 0;
        });
        rows.forEach(r => tableBody.appendChild(r));
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

        if (e.target.closest('.view-btn')) {
            viewIdProof.href = `/static/uploads/${row.querySelector('.id-proof')?.textContent || ''}`;
            viewPhoto.href = `/static/uploads/${row.querySelector('.photo')?.textContent || ''}`;
            if (viewCheque) viewCheque.href = `/static/uploads/${row.querySelector('.ChequeFile')?.textContent || ''}`;
            viewUserModal.style.display = 'block';
            return;
        }

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

        if (e.target.closest('.delete-btn')) {
            if (!confirm('Are you sure you want to delete this user?')) return;
            const userId = row.dataset.userId;
            fetch(`/users/${encodeURIComponent(userId)}/delete`, { method: 'POST' })
                .then(async res => { let data; try { data = await res.json(); } catch { throw new Error("Invalid JSON"); } if (res.ok && data.success) fadeOutRow(row); else alert(data.message || 'Delete failed.'); })
                .catch(() => alert('Network error.'));
            return;
        }
    });

    userForm?.addEventListener("submit", e => {
        e.preventDefault();
        const formData = new FormData(userForm);
        fetch(userForm.action, { method: "POST", body: formData })
            .then(res => res.ok ? res.json() : Promise.reject("Network error"))
            .then(data => {
                if (!data.success) return alert(data.message || "Operation failed");
                userModal.style.display = "none";
                userForm.reset();
                let existingRow = Array.from(userTable.querySelectorAll("tr")).find(r => r.children[0].textContent.trim() === data.user.userId);
                if (existingRow) {
                    existingRow.children[1].textContent = data.user.name;
                    existingRow.children[2].textContent = data.user.address;
                    existingRow.children[3].textContent = data.user.email;
                    existingRow.children[4].textContent = data.user.contact;
                    existingRow.children[5].textContent = data.user.status;
                    existingRow.dataset.status = data.user.status.toLowerCase();
                } else {
                    const tr = document.createElement("tr");
                    tr.dataset.userId = data.user.userId;
                    tr.dataset.status = data.user.status.trim().toLowerCase();
                    tr.innerHTML = `
                        <td>${data.user.userId}</td>
                        <td>${data.user.name}</td>
                        <td>${data.user.address}</td>
                        <td>${data.user.email}</td>
                        <td>${data.user.contact}</td>
                        <td>${data.user.status}</td>
                        <td>
                            <button class="action-btn view-btn" title="View"><i class="fa-solid fa-eye"></i></button>
                            <button class="action-btn edit-btn" title="Edit"><i class="fa-solid fa-edit"></i></button>
                            <button class="action-btn delete-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </td>
                        <td style="display:none" class="documents">
                            <span class="id-proof">${data.user.id_proof || ''}</span>
                            <span class="photo">${data.user.photo || ''}</span>
                            <span class="ChequeFile">${data.user.chequeFile || ''}</span>
                        </td>
                    `;
                    userTable.appendChild(tr);
                }
                performSearch();
            })
            .catch(err => { console.error(err); alert("Network error"); });
    });

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const statusFilter = document.getElementById('statusFilter');

    function performSearch() {
        const term = searchInput.value.trim().toLowerCase();
        const statusTerm = (statusFilter?.value || '').toLowerCase();
        Array.from(userTable.querySelectorAll('tr')).forEach(row => {
            const id = row.children[0].textContent.trim().toLowerCase();
            const name = row.children[1].textContent.trim().toLowerCase();
            const email = row.children[3].textContent.trim().toLowerCase();
            const contact = row.children[4].textContent.trim().toLowerCase();
            const status = (row.dataset.status || row.children[5].textContent).trim().toLowerCase();
            row.style.display = ((!term || id.includes(term) || name.includes(term) || email.includes(term) || contact.includes(term)) && (!statusTerm || status === statusTerm)) ? '' : 'none';
        });
    }

    searchBtn?.addEventListener('click', performSearch);
    clearSearchBtn?.addEventListener('click', () => { searchInput.value = ''; statusFilter.value = ''; performSearch(); });
    searchInput?.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(); });
    statusFilter?.addEventListener('change', performSearch);

    sortNameHeader?.addEventListener("click", () => { sortTable(userTable, 1, nameAsc); clearSortIcons(); updateSortIcon(sortNameHeader, nameAsc); nameAsc = !nameAsc; });
    sortEmailHeader?.addEventListener("click", () => { sortTable(userTable, 3, emailAsc); clearSortIcons(); updateSortIcon(sortEmailHeader, emailAsc); emailAsc = !emailAsc; });
    sortStatusHeader?.addEventListener("click", () => { sortTable(userTable, 5, statusAsc, true); clearSortIcons(); updateSortIcon(sortStatusHeader, statusAsc); statusAsc = !statusAsc; });

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
        if (e.target.closest(".add-txn-btn")) {
            currentPaymentRow = row;
            txnUid.value = row.children[0].textContent.trim();
            txnName.value = row.children[1].textContent.trim();
            txnTotal.value = row.children[2].textContent.trim();
            txnForm.action = `/payments/${e.target.dataset.paymentId}/transactions`;
            txnModal.style.display = "block";
            return;
        }
        if (e.target.closest(".view-txn-btn")) {
            const paymentId = e.target.dataset.paymentId;
            fetch(`/payments/${paymentId}/transactions/list`)
                .then(r => r.ok ? r.json() : Promise.reject("Failed to fetch"))
                .then(data => {
                    txnViewTableBody.innerHTML = "";
                    data.forEach(txn => {
                         totalDeposited += parseFloat(txn.deposit_amount || 0);
                        const tr = document.createElement("tr");
                        tr.innerHTML = `
                            <td>${txn.date || ""}</td>
                            <td>${txn.user_id || ""}</td>
                            <td>${txn.name || ""}</td>
                            <td>${txn.total_amount?.toFixed(2) || ""}</td>
                            <td>${txn.deposit_amount?.toFixed(2) || ""}</td>
                        `;
                        txnViewTableBody.appendChild(tr);
                    })
                    txnViewModal.style.display = "block";
                })
                .catch(() => alert("Failed to load transactions."));
            return;
        }
        if (e.target.closest(".delete-payment-btn")) {
            if (!confirm("Are you sure you want to delete this payment?")) return;
            const pid = e.target.dataset.paymentId;
            fetch(`/payments/${pid}/delete`, { method: 'POST' })
                .then(async res => { let data; try { data = await res.json(); } catch { throw new Error("Invalid JSON"); } if (res.ok && data.success) fadeOutRow(row); else alert(data.message || "Delete failed"); })
                .catch(err => { console.error(err); alert("Network error"); });
            return;
        }
    });

    txnForm?.addEventListener("submit", e => {
        e.preventDefault();
        const formData = new FormData(txnForm);
        fetch(txnForm.action, { method: "POST", body: formData })
            .then(res => res.ok ? res.json() : Promise.reject("Network error"))
            .then(data => {
                if (!data.success) return alert(data.message || "Transaction failed");
                txnModal.style.display = "none";
                txnForm.reset();
                if (currentPaymentRow) {
                    currentPaymentRow.children[4].textContent = Number(data.pending).toFixed(2);
                    currentPaymentRow.children[7].textContent = data.status;
                }
            })
            .catch(err => { console.error(err); alert("Network error"); });
    });

    [userModal, viewUserModal, txnModal, txnViewModal].forEach(modal => { modal?.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; }); });
    closeTxn?.addEventListener("click", () => txnModal.style.display = "none");
    closeTxnView?.addEventListener("click", () => txnViewModal.style.display = "none");
    window.addEventListener("keydown", e => { if (e.key === "Escape") document.querySelectorAll(".modal").forEach(m => m.style.display = "none"); });

    function setupPagination(tableBody, controlsEl, pageSize) {
        if (!tableBody || !controlsEl) return;
        let currentPage = 1;
        function renderPage(page) {
            const allRows = Array.from(tableBody.querySelectorAll('tr')).filter(r => r.style.display !== 'none');
            const totalPages = Math.max(1, Math.ceil(allRows.length / pageSize));
            currentPage = Math.min(Math.max(1, page), totalPages);
            tableBody.querySelectorAll('tr').forEach(r => r.style.display = 'none');
            allRows.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize).forEach(r => r.style.display = '');
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

    setupPagination(userTable, document.getElementById('userPagination'), 8);
    setupPagination(paymentTable, document.getElementById('paymentPagination'), 8);

    function fadeOutRow(row) {
        row.style.transition = "opacity 0.4s";
        row.style.opacity = "0";
        setTimeout(() => row.remove(), 400);
    }

    // --- MOCK DATA FOR DEMO PURPOSES ---
    function addMockUsers() {
        if (!userTable) return;
        const mockUsers = [
            {
                userId: "U0001", name: "Alice Smith", address: "123 Main St", email: "alice@example.com",
                contact: "9876543210", status: "Active", id_proof: "alice_id.pdf", photo: "alice_photo.jpg", chequeFile: "alice_cheque.pdf"
            },
            {
                userId: "U0002", name: "Bob Johnson", address: "456 Oak Ave", email: "bob@example.com",
                contact: "9123456780", status: "Inactive", id_proof: "bob_id.pdf", photo: "bob_photo.jpg", chequeFile: "bob_cheque.pdf"
            }
        ];
        mockUsers.forEach(u => {
            const tr = document.createElement("tr");
            tr.dataset.userId = u.userId;
            tr.dataset.status = u.status.toLowerCase();
            tr.innerHTML = `
                <td>${u.userId}</td>
                <td>${u.name}</td>
                <td>${u.address}</td>
                <td>${u.email}</td>
                <td>${u.contact}</td>
                <td>${u.status}</td>
                <td>
                    <button class="action-btn view-btn" title="View"><i class="fa-solid fa-eye"></i></button>
                    <button class="action-btn edit-btn" title="Edit"><i class="fa-solid fa-edit"></i></button>
                    <button class="action-btn delete-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </td>
                <td style="display:none" class="documents">
                    <span class="id-proof">${u.id_proof}</span>
                    <span class="photo">${u.photo}</span>
                    <span class="ChequeFile">${u.chequeFile}</span>
                </td>
            `;
            userTable.appendChild(tr);
        });
    }

    function addMockPayments() {
        if (!paymentTable) return;
        const mockPayments = [
            {
                paymentId: "P0001", name: "Alice Smith", total: "1000.00", pending: "500.00", 
                date: "2025-10-01", mode: "Cash", status: "Partial"
            },
            {
                paymentId: "P0002", name: "Bob Johnson", total: "2000.00", pending: "0.00", 
                date: "2025-10-05", mode: "Cheque", status: "Completed"
            }
        ];
        mockPayments.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${p.paymentId}</td>
                <td>${p.name}</td>
                <td>${p.total}</td>
                <td>${p.date}</td>
                <td>${p.pending}</td>
                <td>${p.mode}</td>
                <td>
                    <button class="action-btn add-txn-btn" data-payment-id="${p.paymentId}" title="Add Txn"><i class="fa-solid fa-plus"></i></button>
                    <button class="action-btn view-txn-btn" data-payment-id="${p.paymentId}" title="View Txns"><i class="fa-solid fa-eye"></i></button>
                    <button class="action-btn delete-payment-btn" data-payment-id="${p.paymentId}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </td>
                <td>${p.status}</td>
            `;
            paymentTable.appendChild(tr);
        });
    }

    addMockUsers();
    addMockPayments();
});
