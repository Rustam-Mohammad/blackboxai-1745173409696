if (localStorage.getItem('role') !== 'spoc') {
  alert('Access denied: Only SPOCs can view this page.');
  window.location.href = '/index.html';
}

document.getElementById('bulkVecForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData();
  formData.append('file', document.querySelector('[name="file"]').files[0]);

  fetch('/api/vec/bulk', {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        document.getElementById('uploadStatus').textContent = `Successfully added ${data.count} VECs.`;
        e.target.reset();
      } else {
        document.getElementById('uploadStatus').textContent = 'Error uploading VECs.';
      }
    })
    .catch(error => {
      document.getElementById('uploadStatus').textContent = 'Error: ' + error.message;
    });
});

document.getElementById('backBtn').addEventListener('click', () => {
  window.location.href = '/spoc-dashboard.html';
});