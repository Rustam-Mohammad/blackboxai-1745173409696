if (localStorage.getItem('role') !== 'spoc') {
  alert('Access denied: Only SPOCs can view this page.');
  window.location.href = '/index.html';
}

fetch('/api/hh-list')
  .then(response => response.json())
  .then(hhList => {
    const hhPromises = hhList.map(hh => 
      fetch(`/api/hh/${encodeURIComponent(hh.customer_id)}`).then(res => res.json())
    );
    Promise.all(hhPromises)
      .then(hhData => {
        const tbody = document.querySelector('#hhTable tbody');
        let csvContent = 'Customer ID,HH Name,Date,Meter Reading,Units Consumed,Current Bill,Past Due,Total Due,Amount Paid,Balance\n';

        hhData.forEach(hh => {
          const submissions = hh.submissions || [];
          submissions.forEach(submission => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${hh.customer_id}</td>
              <td>${hh.hh_name}</td>
              <td>${submission.read_date || 'N/A'}</td>
              <td>${submission.meter_read || 'N/A'}</td>
              <td>${submission.net_consumed || 'N/A'}</td>
              <td>${submission.current_bill || 'N/A'}</td>
              <td>${submission.past_due || '0'}</td>
              <td>${submission.total_due || 'N/A'}</td>
              <td>${submission.amount_paid || 'Not Paid'}</td>
              <td>${submission.amount_balance || 'N/A'}</td>
            `;
            tbody.appendChild(row);

            csvContent += `${hh.customer_id},${hh.hh_name},${submission.read_date || 'N/A'},${submission.meter_read || 'N/A'},${submission.net_consumed || 'N/A'},${submission.current_bill || 'N/A'},${submission.past_due || '0'},${submission.total_due || 'N/A'},${submission.amount_paid || 'Not Paid'},${submission.amount_balance || 'N/A'}\n`;
          });
        });

        document.getElementById('downloadCsvBtn').addEventListener('click', () => {
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'hh_entries.csv';
          a.click();
          window.URL.revokeObjectURL(url);
        });
      });
  })
  .catch(error => {
    console.error('Error fetching HH entries:', error);
    alert('Error loading HH entries: ' + error.message);
  });

document.getElementById('backBtn').addEventListener('click', () => {
  window.location.href = '/spoc-dashboard.html';
});