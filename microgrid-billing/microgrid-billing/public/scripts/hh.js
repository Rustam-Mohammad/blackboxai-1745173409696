const urlParams = new URLSearchParams(window.location.search);
const customer_id = urlParams.get('customer_id');

fetch('/api/hh/' + encodeURIComponent(customer_id))
  .then(response => {
    console.log('Fetch Status:', response.status);
    if (!response.ok) throw new Error('Fetch failed: ' + response.status);
    return response.json();
  })
  .then(data => {
    console.log('Fetched Submissions:', data.submissions);
    const submissionsDiv = document.getElementById('submissions');
    submissionsDiv.innerHTML = '';
    if (!data.submissions || data.submissions.length === 0) {
      submissionsDiv.textContent = 'No submissions yet.';
      return;
    }
    data.submissions.forEach((sub, index) => {
      const card = document.createElement('div');
      card.className = 'submission-card';
      card.style.cursor = 'pointer';
      // Card layout as requested
      card.innerHTML = `Meter Reading: ${sub.meter_read || 'N/A'}<br>Date of Submission: ${sub.read_date || 'N/A'}`;
      card.addEventListener('click', () => {
        window.location.href = `/hh-view.html?customer_id=${encodeURIComponent(customer_id)}&index=${index}`;
      });
      submissionsDiv.appendChild(card);
    });
  })
  .catch(error => {
    console.error('Fetch Error:', error);
    document.getElementById('submissions').textContent = 'Error loading submissions.';
  });

document.getElementById('newEntryBtn').addEventListener('click', function() {
  window.location.href = '/hh-form.html?customer_id=' + customer_id;
});
document.getElementById('backBtn').addEventListener('click', function() {
  window.location.href = '/hh-list.html';
});
document.getElementById('logoutBtn').addEventListener('click', function() {
  localStorage.clear();
  window.location.href = '/index.html';
});