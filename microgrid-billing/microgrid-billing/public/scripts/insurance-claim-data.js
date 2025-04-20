document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('insuranceClaimTable');
    const hamletDropdown = document.getElementById('hamletDropdown');
    const monthDropdown = document.getElementById('monthDropdown');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    const backBtn = document.getElementById('backBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    let allData = [];
    let filteredData = [];
    let selectedHamlet = null;
    let selectedMonth = null;

    // Check login status
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    if (!username || role !== 'spoc') {
        window.location.href = '/login.html';
        return;
    }

    // Fetch all insurance claims data
    async function fetchInsuranceClaims() {
        try {
            const response = await fetch('/api/insurance/all');
            if (!response.ok) throw new Error(`HTTP error: ${response.status} - ${response.statusText}`);
            
            const data = await response.json();
            console.log('Fetched insurance claims:', data);
            
            if (!Array.isArray(data)) {
                console.error('Expected array but got:', typeof data, data);
                allData = [];
            } else {
                allData = data;
            }
            
            filteredData = [...allData];
            populateTable();
            populateDropdowns();
        } catch (error) {
            console.error('Error fetching insurance claims:', error);
            alert('Failed to fetch insurance claims data: ' + error.message);
            allData = [];
            filteredData = [];
            populateTable();
        }
    }

    // Populate table with data
    function populateTable() {
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        if (filteredData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="13" class="no-data">No insurance claim data available</td>';
            tbody.appendChild(row);
            return;
        }

        filteredData.forEach(claim => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${claim.state || ''}</td>
                <td>${claim.district || ''}</td>
                <td>${claim.block || ''}</td>
                <td>${claim.gp || ''}</td>
                <td>${claim.village || ''}</td>
                <td>${claim.hamlet || ''}</td>
                <td>${claim.vec_name || ''}</td>
                <td>${claim.microgrid_id || ''}</td>
                <td>${claim.claim_ref_number || ''}</td>
                <td>${claim.claim_date || ''}</td>
                <td>${claim.claiming_for || ''}</td>
                <td>${claim.claim_application_photo ? `<a href="${claim.claim_application_photo}" target="_blank">View</a>` : ''}</td>
                <td>${claim.claiming_for_image ? `<a href="${claim.claiming_for_image}" target="_blank">View</a>` : ''}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Populate dropdowns with unique values
    function populateDropdowns() {
        if (!Array.isArray(allData) || allData.length === 0) {
            hamletDropdown.innerHTML = '<div class="dropdown-item">No data available</div>';
            monthDropdown.innerHTML = '<div class="dropdown-item">No data available</div>';
            return;
        }

        const hamlets = [...new Set(allData.map(claim => claim.hamlet).filter(Boolean))].sort();
        const months = [...new Set(allData.map(claim => {
            if (!claim.claim_date) return null;
            const date = new Date(claim.claim_date);
            return date.toLocaleString('default', { month: 'long', year: 'numeric' });
        }).filter(Boolean))].sort((a, b) => new Date(b) - new Date(a));

        hamletDropdown.innerHTML = hamlets.length > 0 
            ? hamlets.map(hamlet => `<div class="dropdown-item" data-value="${hamlet}">${hamlet}</div>`).join('')
            : '<div class="dropdown-item">No data available</div>';

        monthDropdown.innerHTML = months.length > 0
            ? months.map(month => `<div class="dropdown-item" data-value="${month}">${month}</div>`).join('')
            : '<div class="dropdown-item">No data available</div>';

        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const dropdown = item.closest('.dropdown');
                const label = dropdown.querySelector('.dropdown-label');
                const value = item.dataset.value;
                label.textContent = value;
                
                if (dropdown.id === 'hamletDropdown') {
                    selectedHamlet = value;
                } else if (dropdown.id === 'monthDropdown') {
                    selectedMonth = value;
                }
                
                filterData();
            });
        });
    }

    // Filter data based on selected criteria
    function filterData() {
        if (!Array.isArray(allData)) {
            filteredData = [];
            populateTable();
            return;
        }

        filteredData = allData.filter(claim => {
            if (!claim.claim_date) return false;
            
            const claimMonth = new Date(claim.claim_date).toLocaleString('default', { month: 'long', year: 'numeric' });
            const hamletMatch = !selectedHamlet || claim.hamlet === selectedHamlet;
            const monthMatch = !selectedMonth || claimMonth === selectedMonth;
            return hamletMatch && monthMatch;
        });
        populateTable();
    }

    // Clear all filters
    clearFiltersBtn.addEventListener('click', () => {
        selectedHamlet = null;
        selectedMonth = null;
        document.querySelectorAll('.dropdown-label').forEach(label => {
            label.textContent = label.id === 'hamletLabel' ? 'Hamlet' : 'Month';
        });
        filteredData = [...allData];
        populateTable();
    });

    // Download data as CSV
    downloadCsvBtn.addEventListener('click', () => {
        if (!Array.isArray(filteredData) || filteredData.length === 0) {
            alert('No data available to download');
            return;
        }

        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
        const csvContent = [
            headers.join(','),
            ...filteredData.map(claim => [
                claim.state || '',
                claim.district || '',
                claim.block || '',
                claim.gp || '',
                claim.village || '',
                claim.hamlet || '',
                claim.vec_name || '',
                claim.microgrid_id || '',
                claim.claim_ref_number || '',
                claim.claim_date || '',
                claim.claiming_for || '',
                claim.claim_application_photo || '',
                claim.claiming_for_image || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'insurance_claims.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    });

    // Back button handler
    backBtn.addEventListener('click', () => {
        window.location.href = '/spoc-dashboard.html';
    });

    // Logout button handler
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        window.location.href = '/login.html';
    });

    // Initial data fetch
    fetchInsuranceClaims();
});