document.addEventListener('DOMContentLoaded', () => {
  console.log('VEC-Bulk: Script loaded at', new Date().toISOString());

  const role = localStorage.getItem('role');
  if (role !== 'spoc') {
    console.log('VEC-Bulk: Access restricted, redirecting to /index.html');
    alert('Access restricted to SPOC only!');
    window.location.href = '/index.html';
    return;
  }

  const vecBulkForm = document.getElementById('vecBulkForm');
  const hamletDropdown = document.getElementById('hamletDropdown');
  const hamletLabel = document.getElementById('hamletLabel');
  const tableBody = document.querySelector('#vecTable tbody');
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

  let vecData = [];
  let allHamlets = [];
  let pendingUpload = null;

  // Download template
  downloadTemplateBtn.addEventListener('click', () => {
    console.log('VEC-Bulk: Downloading template');
    const headers = 'hamlet,vec_name,state,district,block,gp,village,microgrid_id\n';
    const sample = 'Hamlet1,VEC1,State1,District1,Block1,GP1,Village1,MG001\n';
    const csv = headers + sample;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vec_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Handle VEC upload
  vecBulkForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('VEC-Bulk: Form submitted');
    const fileInput = vecBulkForm.querySelector('input[type="file"]');
    const file = fileInput.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (result) => {
        console.log('VEC-Bulk: CSV parsed', result.data.length, 'rows');
        const requiredHeaders = ['hamlet', 'vec_name', 'state', 'district', 'block', 'gp', 'village', 'microgrid_id'];
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
            <td>${row.hamlet || 'N/A'}</td>
            <td>${row.vec_name || 'N/A'}</td>
            <td>${row.state || 'N/A'}</td>
            <td>${row.district || 'N/A'}</td>
            <td>${row.block || 'N/A'}</td>
            <td>${row.gp || 'N/A'}</td>
            <td>${row.village || 'N/A'}</td>
            <td>${row.microgrid_id || 'N/A'}</td>
          `;
          previewTableBody.appendChild(tr);
        });
        previewErrors.textContent = result.data.length > 5 ? `Showing first 5 of ${result.data.length} rows` : '';
        previewModal.style.display = 'block';
      },
      error: (error) => {
        console.error('VEC-Bulk: CSV parse error:', error);
        alert('Error parsing CSV file');
      }
    });
  });

  // Confirm upload
  confirmUploadBtn.addEventListener('click', () => {
    if (!pendingUpload) return;
    console.log('VEC-Bulk: Confirming upload');
    const formData = new FormData();
    formData.append('file', pendingUpload);

    uploadProgress.style.display = 'block';
    uploadProgress.value = 0;
    vecBulkForm.querySelector('button[type="submit"]').disabled = true;

    const progressInterval = setInterval(() => {
      uploadProgress.value += 10;
      if (uploadProgress.value >= 90) clearInterval(progressInterval);
    }, 200);

    fetch('/api/vec/bulk', {
      method: 'POST',
      headers: { 'x-user-role': 'spoc' },
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        clearInterval(progressInterval);
        uploadProgress.value = 100;
        if (data.success) {
          alert(`Successfully uploaded ${data.count} VECs`);
          vecBulkForm.reset();
          loadData();
        } else {
          alert(`Failed to upload VECs: ${data.error || 'Unknown error'}`);
        }
      })
      .catch(error => {
        console.error('VEC-Bulk: Error uploading VEC:', error);
        alert('Error uploading VECs');
      })
      .finally(() => {
        uploadProgress.style.display = 'none';
        vecBulkForm.querySelector('button[type="submit"]').disabled = false;
        previewModal.style.display = 'none';
        pendingUpload = null;
      });
  });

  // Cancel upload
  cancelUploadBtn.addEventListener('click', () => {
    console.log('VEC-Bulk: Cancel upload');
    previewModal.style.display = 'none';
    vecBulkForm.reset();
    pendingUpload = null;
  });

  // Load VEC data
  function loadData() {
    console.log('VEC-Bulk: Loading data');
    tableBody.innerHTML = '<tr><td colspan="10">Loading...</td></tr>';
    fetch('/api/vec-list', { headers: { 'x-user-role': 'spoc' } })
      .then(res => res.json())
      .then(data => {
        vecData = data;
        allHamlets = [...new Set(vecData.map(v => v.hamlet))];

        hamletDropdown.innerHTML = '<label><input type="checkbox" value="">All</label>' +
          allHamlets.map(h => `<label><input type="checkbox" value="${h}">${h}</label>`).join('');

        hamletDropdown.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
          checkbox.addEventListener('change', renderTable);
        });

        renderTable();
      })
      .catch(error => {
        console.error('VEC-Bulk: Error fetching VEC data:', error);
        tableBody.innerHTML = '<tr><td colspan="10">Error loading data</td></tr>';
      });
  }

  // Render table
  function renderTable() {
    console.log('VEC-Bulk: Rendering table');
    const selectedHamlets = Array.from(hamletDropdown.querySelectorAll('input:checked'))
      .map(cb => cb.value)
      .filter(v => v);
    hamletLabel.textContent = selectedHamlets.length ? `Hamlet: ${selectedHamlets.join(', ')}` : 'Hamlet';

    const filteredVEC = selectedHamlets.length
      ? vecData.filter(v => selectedHamlets.includes(v.hamlet))
      : vecData;

    tableBody.innerHTML = '';
    filteredVEC.forEach(vec => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><input type="checkbox" class="batch-select" data-id="${vec.hamlet}"></td>
        <td>${vec.hamlet || 'N/A'}</td>
        <td>${vec.vec_name || 'N/A'}</td>
        <td>${vec.state || 'N/A'}</td>
        <td>${vec.district || 'N/A'}</td>
        <td>${vec.block || 'N/A'}</td>
        <td>${vec.gp || 'N/A'}</td>
        <td>${vec.village || 'N/A'}</td>
        <td>${vec.microgrid_id || 'N/A'}</td>
        <td><button class="remove-btn" data-id="${vec.hamlet}">Remove</button></td>
      `;
      tableBody.appendChild(row);
    });

    // Remove button listeners
    tableBody.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm(`Are you sure you want to remove VEC (${id})? This will delete all associated data.`)) {
          console.log('VEC-Bulk: Removing VEC', id);
          fetch('/api/vec/delete', {
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
                alert('VEC removed successfully');
                loadData();
              } else {
                alert(`Failed to remove VEC: ${data.error || 'Unknown error'}`);
              }
            })
            .catch(error => {
              console.error('VEC-Bulk: Error removing VEC:', error);
              alert('Error removing VEC');
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
      alert('No VECs selected');
      return;
    }
    if (confirm(`Are you sure you want to remove ${selectedIds.length} VEC(s)?`)) {
      console.log('VEC-Bulk: Batch removing', selectedIds);
      fetch('/api/vec/delete', {
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
            alert(`${selectedIds.length} VEC(s) removed successfully`);
            loadData();
          } else {
            alert(`Failed to remove VECs: ${data.error || 'Unknown error'}`);
          }
        })
        .catch(error => {
          console.error('VEC-Bulk: Error batch removing:', error);
          alert('Error removing VECs');
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
    console.log('VEC-Bulk: Clearing filters');
    hamletDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });
    hamletLabel.textContent = 'Hamlet';
    renderTable();
  });

  // Back and Logout
  backBtn.addEventListener('click', () => {
    console.log('VEC-Bulk: Navigating back');
    window.location.href = '/spoc-dashboard.html';
  });

  logoutBtn.addEventListener('click', () => {
    console.log('VEC-Bulk: Logging out');
    localStorage.clear();
    window.location.href = '/index.html';
  });

  // Dropdown toggle
  hamletLabel.addEventListener('click', () => {
    console.log('VEC-Bulk: Toggling hamlet dropdown');
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