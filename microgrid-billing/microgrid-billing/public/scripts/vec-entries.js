if (localStorage.getItem('role') !== 'spoc') {
  alert('Access denied: Only SPOCs can view this page.');
  window.location.href = '/index.html';
}

fetch('/api/vec/Saraipani')
  .then(response => response.json())
  .then(data => {
    const tbody = document.querySelector('#vecTable tbody');
    let csvContent = 'Hamlet,Date,Amount Collected,Total Saving\n';

    const submissions = data.submissions || [];
    submissions.forEach(submission => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${data.hamlet}</td>
        <td>${submission.submission_date || 'N/A'}</td>
        <td>${submission.amount_collected || 'N/A'}</td>
        <td>${submission.total_saving || 'N/A'}</td>
      `;
      tbody.appendChild(row);

      csvContent += `${data.hamlet},${submission.submission_date || 'N/A'},${submission.amount_collected || 'N/A'},${submission.total_saving || 'N/A'}\n`;
    });

    document.getElementById('downloadCsvBtn').addEventListener('click', () => {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vec_entries.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  })
  .catch(error => {
    console.error('Error fetching VEC entries:', error);
    alert('Error loading VEC entries: ' + error.message);
  });

document.getElementById('backBtn').addEventListener('click', () => {
  window.location.href = '/spoc-dashboard.html';
});