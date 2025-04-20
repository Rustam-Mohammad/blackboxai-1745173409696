document.addEventListener('DOMContentLoaded', () => {
  console.log('VEC Data: Script loaded');
  let allData = [];
  let filteredData = [];
  let allHamlets = [];
  let allMonths = [];

  function loadData() {
    console.log('VEC Data: Fetching /api/vec-list');
    fetch('/api/vec-list')
      .then(response => response.json())
      .then(data => {
        allData = data;
        console.log('VEC Data: Loaded', data.length, 'records');
        const tbody = document.querySelector('#vecTable tbody');
        const hamletLabel = document.getElementById('hamletLabel');
        const hamletDropdown = document.getElementById('hamletDropdown');
        const monthLabel = document.getElementById('monthLabel');
        const monthDropdown = document.getElementById('monthDropdown');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');

        // Populate hamlet dropdown
        allHamlets = [...new Set(data.map(vec => vec.hamlet))];
        hamletDropdown.innerHTML = '<label><input type="checkbox" value="">All</label>' + 
          allHamlets.map(h => `<label><input type="checkbox" value="${h}">${h}</label>`).join('');
        console.log('VEC Data: Hamlets:', allHamlets);

        // Populate month dropdown
        allMonths = [...new Set(data.flatMap(vec => vec.submissions.map(sub => {
          if (!sub.submission_date) return null;
          const date = new Date(sub.submission_date);
          return `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
        }).filter(m => m)))];
        monthDropdown.innerHTML = '<label><input type="checkbox" value="">All</label>' + 
          allMonths.map(m => `<label><input type="checkbox" value="${m}">${m}</label>`).join('');
        console.log('VEC Data: Months:', allMonths);

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
          console.log('VEC Data: Clearing filters');
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
          console.log('VEC Data: Downloading CSV');
          const selectedHamlets = Array.from(hamletDropdown.querySelectorAll('input:checked')).map(cb => cb.value).filter(v => v);
          const selectedMonths = Array.from(monthDropdown.querySelectorAll('input:checked')).map(cb => cb.value).filter(v => v);
          const csv = [
            'Microgrid ID,VEC Name,Hamlet,Village,GP,Block,District,Submission Date,General Issues,Amount Collected for the Month,Amount from Other Source,Total Amount Collected for the Month,Expenditure for the Month,Savings for the Month,Total Savings,Amount in Bank,Amount in Hand',
            ...filteredData.map(sub => {
              const vec = sub.vec;
              return `${vec.microgrid_id || ''},${vec.vec_name || ''},${vec.hamlet || ''},${vec.village || ''},${vec.gp || ''},${vec.block || ''},${vec.district || ''},${sub.submission_date || ''},${sub.general_issues ? sub.general_issues.join(',') : ''},${sub.amount_collected || ''},${sub.amount_other_source || ''},${sub.total_amount_collected || ''},${sub.expenditure || ''},${sub.saving_month || ''},${sub.total_saving || ''},${sub.amount_bank || ''},${sub.amount_hand || ''}`;
            })
          ].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `vec_data${selectedHamlets.length ? '_' + selectedHamlets.join('_') : ''}${selectedMonths.length ? '_' + selectedMonths.map(m => m.replace(' ', '_')).join('_') : ''}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }, { once: true });
      })
      .catch(error => {
        console.error('VEC Data: Error fetching data:', error);
        alert('Error loading VEC data');
      });
  }

  function toggleDropdown(dropdown) {
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  }

  function filterAndRender() {
    console.log('VEC Data: Filtering and rendering');
    const hamletDropdown = document.getElementById('hamletDropdown');
    const monthDropdown = document.getElementById('monthDropdown');
    const selectedHamlets = Array.from(hamletDropdown.querySelectorAll('input:checked')).map(cb => cb.value).filter(v => v);
    const selectedMonths = Array.from(monthDropdown.querySelectorAll('input:checked')).map(cb => cb.value).filter(v => v);
    const tbody = document.querySelector('#vecTable tbody');

    filteredData = allData.flatMap(vec => vec.submissions.map(sub => ({ ...sub, vec }))).filter(sub => {
      const matchesHamlet = !selectedHamlets.length || selectedHamlets.includes(sub.vec.hamlet);
      const subMonth = sub.submission_date ? `${new Date(sub.submission_date).toLocaleString('default', { month: 'long' })} ${new Date(sub.submission_date).getFullYear()}` : null;
      const matchesMonth = !selectedMonths.length || (subMonth && selectedMonths.includes(subMonth));
      return matchesHamlet && matchesMonth;
    });

    tbody.innerHTML = '';
    filteredData.forEach(sub => {
      const vec = sub.vec;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${vec.state || 'N/A'}</td>
        <td>${vec.district || 'N/A'}</td>
        <td>${vec.block || 'N/A'}</td>
        <td>${vec.gp || 'N/A'}</td>
        <td>${vec.village || 'N/A'}</td>
        <td>${vec.hamlet || 'N/A'}</td>
        <td>${vec.vec_name || 'N/A'}</td>
        <td>${vec.microgrid_id || 'N/A'}</td>
        <td>${sub.submission_date || 'N/A'}</td>
        <td>${sub.general_issues ? sub.general_issues.join(', ') : 'N/A'}</td>
        <td>${sub.amount_collected || '0'}</td>
        <td>${sub.amount_other_source || '0'}</td>
        <td>${sub.total_amount_collected || '0'}</td>
        <td>${sub.expenditure || '0'}</td>
        <td>${sub.saving_month || '0'}</td>
        <td>${sub.total_saving || '0'}</td>
        <td>${sub.amount_bank || '0'}</td>
        <td>${sub.amount_hand || '0'}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Initial load
  loadData();

  document.getElementById('backBtn').addEventListener('click', () => {
    console.log('VEC Data: Back to spoc-dashboard');
    window.location.href = '/spoc-dashboard.html';
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    console.log('VEC Data: Logout clicked');
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