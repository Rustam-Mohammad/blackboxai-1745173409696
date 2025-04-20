document.addEventListener('DOMContentLoaded', () => {
  console.log('Edit Entries: Script loaded');
  const role = localStorage.getItem('role');
  if (role !== 'spoc') {
    console.log('Edit Entries: Access restricted, redirecting');
    alert('Access restricted to SPOC only!');
    window.location.href = '/index.html';
    return;
  }

  const username = localStorage.getItem('username');
  const usernameDisplay = document.getElementById('usernameDisplay');
  if (usernameDisplay && username) {
    usernameDisplay.textContent = username;
    console.log('Edit Entries: Username set to', username);
  }

  let hhData = [];
  let vecData = [];
  let allHamlets = [];
  let allMonths = [];

  function loadData() {
    console.log('Edit Entries: Fetching /api/hh-list and /api/vec-list');
    Promise.all([
      fetch('/api/hh-list?all=true').then(res => res.json()),
      fetch('/api/vec-list').then(res => res.json())
    ])
      .then(([hh, vec]) => {
        hhData = hh.flatMap(h => h.submissions.map((s, i) => ({ ...s, type: 'HH', customer_id: h.customer_id, hh_name: h.hh_name, subIndex: i, hamlet: h.hamlet })));
        vecData = vec.flatMap(v => v.submissions.map((s, i) => ({ ...s, type: 'VEC', hamlet: v.hamlet, vec_name: v.vec_name, subIndex: i })));
        console.log('Edit Entries: Loaded', hhData.length, 'HH and', vecData.length, 'VEC entries');

        const typeLabel = document.getElementById('typeLabel');
        const typeDropdown = document.getElementById('typeDropdown');
        const hamletLabel = document.getElementById('hamletLabel');
        const hamletDropdown = document.getElementById('hamletDropdown');
        const monthLabel = document.getElementById('monthLabel');
        const monthDropdown = document.getElementById('monthDropdown');

        // Populate hamlet dropdown
        allHamlets = [...new Set([...hh.map(h => h.hamlet), ...vec.map(v => v.hamlet)])];
        hamletDropdown.innerHTML = '<label><input type="checkbox" value="">All</label>' + 
          allHamlets.map(h => `<label><input type="checkbox" value="${h}">${h}</label>`).join('');
        console.log('Edit Entries: Hamlets:', allHamlets);

        // Populate month dropdown
        allMonths = [...new Set([...hhData, ...vecData].map(entry => {
          const date = entry.read_date || entry.submission_date;
          if (!date) return null;
          const d = new Date(date);
          return `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
        }).filter(m => m))];
        monthDropdown.innerHTML = '<label><input type="checkbox" value="">All</label>' + 
          allMonths.map(m => `<label><input type="checkbox" value="${m}">${m}</label>`).join('');
        console.log('Edit Entries: Months:', allMonths);

        // Toggle dropdowns
        typeLabel.addEventListener('click', () => toggleDropdown(typeDropdown));
        hamletLabel.addEventListener('click', () => toggleDropdown(hamletDropdown));
        monthLabel.addEventListener('click', () => toggleDropdown(monthDropdown));

        // Filter on checkbox change
        [typeDropdown, hamletDropdown, monthDropdown].forEach(dropdown => {
          dropdown.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', filterAndRender);
          });
        });

        // Search input
        const searchInput = document.getElementById('hhSearch');
        searchInput.addEventListener('input', filterAndRender);

        // Clear filter button
        const clearFilterBtn = document.getElementById('clearFilterBtn');
        clearFilterBtn.addEventListener('click', () => {
          console.log('Edit Entries: Clearing filters');
          [typeDropdown, hamletDropdown, monthDropdown].forEach(dropdown => {
            dropdown.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
              checkbox.checked = false;
            });
          });
          searchInput.value = '';
          filterAndRender();
        });

        filterAndRender();
      })
      .catch(error => {
        console.error('Edit Entries: Error fetching data:', error);
        alert('Error loading entries');
      });
  }

  function toggleDropdown(dropdown) {
    const isHidden = dropdown.style.display !== 'block';
    dropdown.style.display = isHidden ? 'block' : 'none';
    console.log('Edit Entries: Dropdown', dropdown.id, isHidden ? 'shown' : 'hidden');
  }

  function filterAndRender() {
    console.log('Edit Entries: Filtering and rendering');
    const typeDropdown = document.getElementById('typeDropdown');
    const hamletDropdown = document.getElementById('hamletDropdown');
    const monthDropdown = document.getElementById('monthDropdown');
    const searchInput = document.getElementById('hhSearch');
    const searchQuery = searchInput.value.trim().toLowerCase();
    console.log('Edit Entries: Search query:', searchQuery);
    const selectedTypes = Array.from(typeDropdown.querySelectorAll('input:checked')).map(cb => cb.value);
    const selectedHamlets = Array.from(hamletDropdown.querySelectorAll('input:checked')).map(cb => cb.value).filter(v => v);
    const selectedMonths = Array.from(monthDropdown.querySelectorAll('input:checked')).map(cb => cb.value).filter(v => v);
    const entriesContainer = document.getElementById('entriesContainer');
    const allEntries = [...hhData, ...vecData].filter(entry => {
      const matchesType = !selectedTypes.length || selectedTypes.includes(entry.type);
      const matchesHamlet = !selectedHamlets.length || selectedHamlets.includes(entry.hamlet);
      const entryMonth = (entry.read_date || entry.submission_date) ? 
        `${new Date(entry.read_date || entry.submission_date).toLocaleString('default', { month: 'long' })} ${new Date(entry.read_date || entry.submission_date).getFullYear()}` : null;
      const matchesMonth = !selectedMonths.length || (entryMonth && selectedMonths.includes(entryMonth));
      const matchesSearch = !searchQuery || 
        (entry.type === 'HH' && (
          (entry.customer_id && entry.customer_id.toLowerCase().includes(searchQuery)) || 
          (entry.hh_name && entry.hh_name.toLowerCase().includes(searchQuery))
        )) || 
        (entry.type === 'VEC' && (
          (entry.vec_name && entry.vec_name.toLowerCase().includes(searchQuery)) || 
          (entry.hamlet && entry.hamlet.toLowerCase().includes(searchQuery))
        ));
      return matchesType && matchesHamlet && matchesMonth && matchesSearch;
    });

    entriesContainer.innerHTML = '';
    allEntries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'submission-card';
      if (entry.type === 'HH') {
        card.innerHTML = `
          <h3>HH: ${entry.customer_id} (${entry.hh_name || 'N/A'})</h3>
          <p>Date: ${entry.read_date || 'N/A'}</p>
          <p>Meter Reading: ${entry.meter_read || 'N/A'}</p>
          <p>Amount Paid: ${entry.amount_paid || 'N/A'}</p>
          <div class="button-container">
            <button class="form-btn" data-type="HH" data-id="${entry.customer_id}" data-index="${entry.subIndex}">Edit</button>
            <button class="remove-btn" data-type="HH" data-id="${entry.customer_id}" data-index="${entry.subIndex}">Remove</button>
          </div>
        `;
      } else {
        card.innerHTML = `
          <h3>VEC: ${entry.hamlet} (${entry.vec_name || 'N/A'})</h3>
          <p>Date: ${entry.submission_date || 'N/A'}</p>
          <p>Amount Collected: ${entry.amount_collected || 'N/A'}</p>
          <div class="button-container">
            <button class="form-btn" data-type="VEC" data-id="${entry.hamlet}" data-index="${entry.subIndex}">Edit</button>
            <button class="remove-btn" data-type="VEC" data-id="${entry.hamlet}" data-index="${entry.subIndex}">Remove</button>
          </div>
        `;
      }

      card.querySelector('.form-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const type = e.target.getAttribute('data-type');
        const id = e.target.getAttribute('data-id');
        const subIndex = e.target.getAttribute('data-index');
        console.log('Edit Entries: Editing', type, 'ID:', id, 'subIndex:', subIndex);
        if (type === 'HH') {
          window.location.href = `/edit-hh-form.html?customer_id=${encodeURIComponent(id)}&subIndex=${subIndex}`;
        } else {
          window.location.href = `/edit-vec-form.html?hamlet=${encodeURIComponent(id)}&subIndex=${subIndex}`;
        }
      });

      card.querySelector('.remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const type = e.target.getAttribute('data-type');
        const id = e.target.getAttribute('data-id');
        const subIndex = e.target.getAttribute('data-index');
        console.log('Edit Entries: Removing', type, 'ID:', id, 'subIndex:', subIndex);
        if (confirm(`Are you sure you want to remove this ${type} submission? This action cannot be undone.`)) {
          fetch(`/api/${type.toLowerCase()}/${encodeURIComponent(id)}/remove`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-role': 'spoc'
            },
            body: JSON.stringify({ subIndex: parseInt(subIndex) })
          })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                alert('Submission removed successfully');
                loadData();
              } else {
                alert('Failed to remove submission: ' + (data.error || 'Unknown error'));
              }
            })
            .catch(error => {
              console.error('Edit Entries: Error removing submission:', error);
              alert('Error removing submission');
            });
        }
      });

      entriesContainer.appendChild(card);
    });
  }

  loadData();

  document.getElementById('backBtn').addEventListener('click', () => {
    console.log('Edit Entries: Back to spoc-dashboard');
    window.location.href = '/spoc-dashboard.html';
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    console.log('Edit Entries: Logout clicked');
    localStorage.clear();
    window.location.href = '/index.html';
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');
    }
  });
});