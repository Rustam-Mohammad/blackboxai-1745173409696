// Check if user is a SPOC
const role = localStorage.getItem('role');
if (role !== 'spoc') {
  alert('Access denied: Only SPOCs can view this page.');
  window.location.href = '/dashboard.html';
}

// Fetch all HH data
fetch('/api/hh-list')
  .then(response => response.json())
  .then(hhList => {
    const hhPromises = hhList.map(hh => 
      fetch(`/api/hh/${encodeURIComponent(hh.customer_id)}`)
        .then(res => res.json())
    );
    Promise.all(hhPromises)
      .then(hhData => {
        const hhSubmissionsDiv = document.getElementById('hhSubmissions');
        const hhDraftsDiv = document.getElementById('hhDrafts');

        hhData.forEach(hh => {
          // Submissions
          const submissions = hh.submissions || [];
          submissions.forEach((submission, index) => {
            const card = document.createElement('div');
            card.className = 'submission-card';
            card.innerHTML = `
              <h3>${hh.hh_name} - Submission ${index + 1}</h3>
              <p>Customer ID: ${hh.customer_id}</p>
              <p>Date: ${submission.read_date || 'N/A'}</p>
              <p>Meter Reading: ${submission.meter_read || 'N/A'}</p>
              <p>Amount Paid: ${submission.amount_paid || 'Not Paid'}</p>
            `;
            hhSubmissionsDiv.appendChild(card);
          });

          // Drafts
          const drafts = hh.drafts || [];
          drafts.forEach((draft, index) => {
            const card = document.createElement('div');
            card.className = 'submission-card draft';
            card.innerHTML = `
              <h3>${hh.hh_name} - Draft ${index + 1}</h3>
              <p>Customer ID: ${hh.customer_id}</p>
              <p>Date: ${draft.read_date || 'N/A'}</p>
              <p>Meter Reading: ${draft.meter_read || 'N/A'}</p>
              <p>Status: Draft (Payment Pending)</p>
            `;
            hhDraftsDiv.appendChild(card);
          });
        });
      });
  })
  .catch(error => {
    console.error('Error fetching HH data:', error);
    alert('Error loading HH responses: ' + error.message);
  });

// Fetch VEC data
fetch('/api/vec/Saraipani')
  .then(response => response.json())
  .then(data => {
    const vecSubmissionsDiv = document.getElementById('vecSubmissions');
    const submissions = data.submissions || [];
    submissions.forEach((submission, index) => {
      const card = document.createElement('div');
      card.className = 'submission-card';
      card.innerHTML = `
        <h3>VEC Submission ${index + 1}</h3>
        <p>Date: ${submission.submission_date || 'N/A'}</p>
        <p>Amount Collected: ${submission.amount_collected || 'N/A'}</p>
        <p>Total Saving: ${submission.total_saving || 'N/A'}</p>
      `;
      vecSubmissionsDiv.appendChild(card);
    });
  })
  .catch(error => {
    console.error('Error fetching VEC data:', error);
    alert('Error loading VEC responses: ' + error.message);
  });

document.getElementById('backBtn').addEventListener('click', () => {
  window.location.href = '/dashboard.html';
});