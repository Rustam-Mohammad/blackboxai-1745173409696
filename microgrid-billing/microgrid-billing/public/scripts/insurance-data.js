document.addEventListener('DOMContentLoaded', () => {
  console.log('Insurance Data: Script loaded');
  
  // Add authentication check
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  if (!username || !role || role !== 'spoc') {
    console.log('Insurance Data: Invalid login, redirecting to /index.html');
    alert('Please log in as SPOC!');
    window.location.href = '/index.html';
    return;
  }

  let allData = [];
  let filteredData = [];
  let allHamlets = [];
  let allMonths = [];

  function loadData() {
    console.log('Insurance Data: Fetching all insurance claims');
    Promise.all([
      fetch('/api/insurance/all/submissions')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json().catch(() => []);
        }),
      fetch('/api/insurance/all/drafts')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json().catch(() => []);
        })
    ])
      .then(([submissions, drafts]) => {
        // Combine and format the data
        allData = [
          ...(Array.isArray(submissions) ? submissions : []).map(s => ({ ...s, status: 'Submitted' })),
          ...(Array.isArray(drafts) ? drafts : []).map(d => ({ ...d, status: 'Draft' }))
        ];
        console.log('Insurance Data: Loaded', allData.length, 'records');
        
        const tbody = document.querySelector('#insuranceTable tbody');
        const hamletLabel = document.getElementById('hamletLabel');
        const hamletDropdown = document.getElementById('hamletDropdown');
        const monthLabel = document.getElementById('monthLabel');
        const monthDropdown = document.getElementById('monthDropdown');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');

        // Populate hamlet dropdown - Fix: use allData instead of data
        allHamlets = [...new Set(allData.map(claim => claim.hamlet))];
        hamletDropdown.innerHTML = '<label><input type="checkbox" value="">All</label>' + 
          allHamlets.map(h => `<label><input type="checkbox" value="${h}">${h}</label>`).join('');
        console.log('Insurance Data: Hamlets:', allHamlets);

        // Populate month dropdown - Fix: use allData instead of data
        allMonths = [...new Set(allData.map(claim => {
          if (!claim.claim_date) return null;
          const date = new Date(claim.claim_date);
          return `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
        }).filter(m => m))];
        monthDropdown.innerHTML = '<label><input type="checkbox" value="">All</label>' + 
          allMonths.map(m => `<label><input type="checkbox" value="${m}">${m}</label>`).join('');
        console.log('Insurance Data: Months:', allMonths);

        // Toggle dropdowns
        hamletLabel.addEventListener('click', () => toggleDropdown(hamletDropdown));
        monthLabel.addEventListener('click', () => toggleDropdown(monthDropdown));

        // Filter on checkbox change
        [hamletDropdown, monthDropdown].forEach(dropdown => {
          dropdown.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', filterAndRender);
          });
        });

        // Clear filters
        clearFiltersBtn.addEventListener('click', () => {
          console.log('Insurance Data: Clearing filters');
          hamletDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
          monthDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
          hamletLabel.textContent = 'Hamlet';
          monthLabel.textContent = 'Month';
          filterAndRender();
        });

        // Initial render
        filterAndRender();

        // CSV download
        document.getElementById('downloadCsvBtn').addEventListener('click', () => {
          console.log('Insurance Data: Downloading CSV');
          const selectedHamlets = Array.from(hamletDropdown.querySelectorAll('input:checked')).map(cb => cb.value).filter(v => v);
          const selectedMonths = Array.from(monthDropdown.querySelectorAll('input:checked')).map(cb => cb.value).filter(v => v);
          const csv = [
            'State,District,Block,GP,Village,Hamlet,VEC Name,Microgrid ID,Claim Reference Number,Claim Date,Claiming For,Claim Application Photo,Claiming For Image,Status',
            ...filteredData.map(claim => 
              `${claim.state || ''},${claim.district || ''},${claim.block || ''},${claim.gp || ''},${claim.village || ''},${claim.hamlet || ''},${claim.vec_name || ''},${claim.microgrid_id || ''},${claim.claim_ref_number || ''},${claim.claim_date || ''},${claim.claiming_for || ''},${claim.claim_application_photo ? '/Uploads/' + claim.claim_application_photo : ''},${claim.claiming_for_image ? '/Uploads/' + claim.claiming_for_image : ''},${claim.status || 'Submitted'}`
            )
          ].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `insurance_data${selectedHamlets.length ? '_' + selectedHamlets.join('_') : ''}${selectedMonths.length ? '_' + selectedMonths.map(m => m.replace(' ', '_')).join('_') : ''}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        });
      })
      .catch(error => {
        console.error('Insurance Data: Error fetching data:', error);
        alert('Error loading insurance data');
      });
  }

  function toggleDropdown(dropdown) {
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  }

  function filterAndRender() {
    console.log('Insurance Data: Filtering and rendering');
    const hamletDropdown = document.getElementById('hamletDropdown');
    const monthDropdown = document.getElementById('monthDropdown');
    const selectedHamlets = Array.from(hamletDropdown.querySelectorAll('input:checked')).map(cb => cb.value).filter(v => v);
    const selectedMonths = Array.from(monthDropdown.querySelectorAll('input:checked')).map(cb => cb.value).filter(v => v);
    const tbody = document.querySelector('#insuranceTable tbody');

    filteredData = allData.filter(claim => {
      const matchesHamlet = !selectedHamlets.length || selectedHamlets.includes(claim.hamlet);
      const claimMonth = claim.claim_date ? `${new Date(claim.claim_date).toLocaleString('default', { month: 'long' })} ${new Date(claim.claim_date).getFullYear()}` : null;
      const matchesMonth = !selectedMonths.length || (claimMonth && selectedMonths.includes(claimMonth));
      return matchesHamlet && matchesMonth;
    });

    tbody.innerHTML = '';
    filteredData.forEach(claim => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${claim.state || 'N/A'}</td>
        <td>${claim.district || 'N/A'}</td>
        <td>${claim.block || 'N/A'}</td>
        <td>${claim.gp || 'N/A'}</td>
        <td>${claim.village || 'N/A'}</td>
        <td>${claim.hamlet || 'N/A'}</td>
        <td>${claim.vec_name || 'N/A'}</td>
        <td>${claim.microgrid_id || 'N/A'}</td>
        <td>${claim.claim_ref_number || 'N/A'}</td>
        <td>${claim.claim_date || 'N/A'}</td>
        <td>${claim.claiming_for || 'N/A'}</td>
        <td>${claim.claim_application_photo ? `<a href="/Uploads/${claim.claim_application_photo}" target="_blank">View</a>` : 'N/A'}</td>
        <td>${claim.claiming_for_image ? `<a href="/Uploads/${claim.claiming_for_image}" target="_blank">View</a>` : 'N/A'}</td>
        <td>${claim.status || 'Submitted'}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Initial load
  loadData();

  document.getElementById('backBtn').addEventListener('click', () => {
    console.log('Insurance Data: Back to spoc-dashboard');
    window.location.href = '/spoc-dashboard.html';
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    console.log('Insurance Data: Logout clicked');
    localStorage.clear();
    window.location.href = '/index.html';
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');
    }
  });
});