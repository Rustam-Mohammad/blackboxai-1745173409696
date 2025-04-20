document.addEventListener('DOMContentLoaded', () => {
  console.log('HH-Bulk: Script loaded at', new Date().toISOString());

  const role = localStorage.getItem('role');
  if (role !== 'spoc') {
    console.log('HH-Bulk: Access restricted, redirecting to /index.html');
    alert('Access restricted to SPOC only!');
    window.location.href = '/index.html';
    return;
  }

  const hhBulkForm = document.getElementById('hhBulkForm');
  const hamletDropdown = document.getElementById('hamletDropdown');
  const hamletLabel = document.getElementById('hamletLabel');
  const tableBody = document.querySelector('#hhTable tbody');
  const backBtn = document.getElementById('backBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
  const previewModal = document.getElementById('previewModal');
  const previewTableBody = document.querySelector('#previewTable tbody');
  const previewErrors = document.getElementById('previewErrors');
  const confirmUploadBtn = document.getElementById('confirmUploadBtn');
  const cancelUploadBtn = document.getElementById('cancelUploadBtn');
  const batchRemoveBtn = document.getElementById('batchRemoveBtn');
  const selectAll = document.getElementById('selectAll');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const uploadProgress = document.getElementById('uploadProgress');

  let hhData = [];
  let allHamlets = [];
  let pendingUpload = null;

  // Download template
  downloadTemplateBtn.addEventListener('click', () => {
    console.log('HH-Bulk: Downloading template');
    const headers = 'customer_id,hh_name,hamlet,state,district,block,gp,village,vec_name,meter_num\n';
    const sample = 'CUST001,John Doe,Hamlet1,State1,District1,Block1,GP1,Village1,VEC1,MTR001\n';
    const csv = headers + sample;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hh_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Handle HH upload
  hhBulkForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('HH-Bulk: Form submitted');
    const fileInput = hhBulkForm.querySelector('input[type="file"]');
    const file = fileInput.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (result) => {
        console.log('HH-Bulk: CSV parsed', result.data.length, 'rows');
        const requiredHeaders = ['customer_id', 'hh_name', 'hamlet', 'state', 'district', 'block', 'gp', 'village', 'vec_name', 'meter_num'];
        const headers = Object.keys(result.data[0] || {});
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length) {
          previewErrors.textContent = `Missing columns: ${missingHeaders.join(', ')}`;
          previewModal.style.display = 'block';
          return;
        }

        pendingUpload = file;
        previewTableBody.innerHTML = '';
        const previewData = result.data.slice(0, 5);
        previewData.forEach(row => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${row.customer_id || 'N/A'}</td>
            <td>${row.hh_name || 'N/A'}</td>
            <td>${row.hamlet || 'N/A'}</td>
            <td>${row.state || 'N/A'}</td>
            <td>${row.district || 'N/A'}</td>
            <td>${row.block || 'N/A'}</td>
            <td>${row.gp || 'N/A'}</td>
            <td>${row.village || 'N/A'}</td>
            <td>${row.vec_name || 'N/A'}</td>
            <td>${row.meter_num || 'N/A'}</td>
          `;
          previewTableBody.appendChild(tr);
        });
        previewErrors.textContent = result.data.length > 5 ? `Showing first 5 of ${result.data.length} rows` : '';
        previewModal.style.display = 'block';
      },
      error: (error) => {
        console.error('HH-Bulk: CSV parse error:', error);
        alert('Error parsing CSV file');
      }
    });
  });

  // Confirm upload
  confirmUploadBtn.addEventListener('click', () => {
    if (!pendingUpload) return;
    console.log('HH-Bulk: Confirming upload');
    const formData = new FormData();
    formData.append('file', pendingUpload);

    uploadProgress.style.display = 'block';
    uploadProgress.value = 0;
    hhBulkForm.querySelector('button[type="submit"]').disabled = true;

    const progressInterval = setInterval(() => {
      uploadProgress.value += 10;
      if (uploadProgress.value >= 90) clearInterval(progressInterval);
    }, 200);

    fetch('/api/hh/bulk', {
      method: 'POST',
      headers: { 'x-user-role': 'spoc' },
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        clearInterval(progressInterval);
        uploadProgress.value = 100;
        if (data.success) {
          alert(`Successfully uploaded ${data.count} households`);
          hhBulkForm.reset();
          loadData();
        } else {
          alert(`Failed to upload households: ${data.error || 'Unknown error'}`);
        }
      })
      .catch(error => {
        console.error('HH-Bulk: Error uploading HH:', error);
        alert('Error uploading households');
      })
      .finally(() => {
        uploadProgress.style.display = 'none';
        hhBulkForm.querySelector('button[type="submit"]').disabled = false;
        previewModal.style.display = 'none';
        pendingUpload = null;
      });
  });

  // Cancel upload
  cancelUploadBtn.addEventListener('click', () => {
    console.log('HH-Bulk: Cancel upload');
    previewModal.style.display = 'none';
    hhBulkForm.reset();
    pendingUpload = null;
  });

  // Load HH data
  function loadData() {
    console.log('HH-Bulk: Loading data');
    tableBody.innerHTML = '<tr><td colspan="12">Loading...</td></tr>';
    fetch('/api/hh-list?all=true', { headers: { 'x-user-role': 'spoc' } })
      .then(res => res.json())
      .then(data => {
        hhData = data;
        allHamlets = [...new Set(hhData.map(h => h.hamlet))];

        hamletDropdown.innerHTML = '<label><input type="checkbox" value="">All</label>' +
          allHamlets.map(h => `<label><input type="checkbox" value="${h}">${h}</label>`).join('');

        hamletDropdown.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
          checkbox.addEventListener('change', renderTable);
        });

        renderTable();
      })
      .catch(error => {
        console.error('HH-Bulk: Error fetching HH data:', error);
        tableBody.innerHTML = '<tr><td colspan="12">Error loading data</td></tr>';
      });
  }

  // Render table
  function renderTable() {
    console.log('HH-Bulk: Rendering table');
    const selectedHamlets = Array.from(hamletDropdown.querySelectorAll('input:checked'))
      .map(cb => cb.value)
      .filter(v => v);
    hamletLabel.textContent = selectedHamlets.length ? `Hamlet: ${selectedHamlets.join(', ')}` : 'Hamlet';

    const filteredHH = selectedHamlets.length
      ? hhData.filter(h => selectedHamlets.includes(h.hamlet))
      : hhData;

    tableBody.innerHTML = '';
    filteredHH.forEach(hh => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><input type="checkbox" class="batch-select" data-id="${hh.customer_id}"></td>
        <td>${hh.customer_id || 'N/A'}</td>
        <td>${hh.hh_name || 'N/A'}</td>
        <td>${hh.hamlet || 'N/A'}</td>
        <td>${hh.state || 'N/A'}</td>
        <td>${hh.district || 'N/A'}</td>
        <td>${hh.block || 'N/A'}</td>
        <td>${hh.gp || 'N/A'}</td>
        <td>${hh.village || 'N/A'}</td>
        <td>${hh.vec_name || 'N/A'}</td>
        <td>${hh.meter_num || 'N/A'}</td>
        <td><button class="remove-btn" data-id="${hh.customer_id}">Remove</button></td>
      `;
      tableBody.appendChild(row);
    });

    // Remove button listeners
    tableBody.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm(`Are you sure you want to remove HH (${id})? This will delete all associated data.`)) {
          console.log('HH-Bulk: Removing HH', id);
          fetch('/api/hh/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-role': 'spoc'
            },
            body: JSON.stringify({ id })
          })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                alert('HH removed successfully');
                loadData();
              } else {
                alert(`Failed to remove HH: ${data.error || 'Unknown error'}`);
              }
            })
            .catch(error => {
              console.error('HH-Bulk: Error removing HH:', error);
              alert('Error removing HH');
            });
        }
      });
    });

    // Update select all checkbox
    selectAll.checked = false;
  }

  // Batch remove
  batchRemoveBtn.addEventListener('click', () => {
    const selectedIds = Array.from(tableBody.querySelectorAll('.batch-select:checked'))
      .map(cb => cb.getAttribute('data-id'));
    if (!selectedIds.length) {
      alert('No households selected');
      return;
    }
    if (confirm(`Are you sure you want to remove ${selectedIds.length} household(s)?`)) {
      console.log('HH-Bulk: Batch removing', selectedIds);
      fetch('/api/hh/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'spoc'
        },
        body: JSON.stringify({ ids: selectedIds })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            alert(`${selectedIds.length} household(s) removed successfully`);
            loadData();
          } else {
            alert(`Failed to remove households: ${data.error || 'Unknown error'}`);
          }
        })
        .catch(error => {
          console.error('HH-Bulk: Error batch removing:', error);
          alert('Error removing households');
        });
    }
  });

  // Select all
  selectAll.addEventListener('change', (e) => {
    tableBody.querySelectorAll('.batch-select').forEach(cb => {
      cb.checked = e.target.checked;
    });
  });

  // Clear filters
  clearFiltersBtn.addEventListener('click', () => {
    console.log('HH-Bulk: Clearing filters');
    hamletDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });
    hamletLabel.textContent = 'Hamlet';
    renderTable();
  });

  // Back and Logout
  backBtn.addEventListener('click', () => {
    console.log('HH-Bulk: Navigating back');
    window.location.href = '/spoc-dashboard.html';
  });

  logoutBtn.addEventListener('click', () => {
    console.log('HH-Bulk: Logging out');
    localStorage.clear();
    window.location.href = '/index.html';
  });

  // Dropdown toggle
  hamletLabel.addEventListener('click', () => {
    console.log('HH-Bulk: Toggling hamlet dropdown');
    hamletDropdown.style.display = hamletDropdown.style.display === 'block' ? 'none' : 'block';
  });

  // Close dropdown
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      hamletDropdown.style.display = 'none';
    }
  });

  loadData();
});