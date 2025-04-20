document.addEventListener('DOMContentLoaded', () => {
  console.log('insurance-submissions.js loaded');
  const urlParams = new URLSearchParams(window.location.search);
  let hamlet = urlParams.get('hamlet');
  const container = document.querySelector('.insurance-submissions-container');

  if (!hamlet) {
    hamlet = container.getAttribute('data-hamlet') || localStorage.getItem('hamlet');
  }

  console.log('Hamlet determined:', hamlet);

  if (!hamlet) {
    console.error('No hamlet specified');
    alert('Error: No hamlet specified. Please try again.');
    window.location.href = '/dashboard.html';
    return;
  }

  document.getElementById('hamlet').textContent = hamlet;
  container.setAttribute('data-hamlet', hamlet);

  fetch(`/api/insurance/${encodeURIComponent(hamlet)}`)
    .then(response => {
      console.log('Fetch /api/insurance response:', { status: response.status, ok: response.ok });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return response.json();
    })
    .then(insuranceData => {
      console.log('Insurance data received:', insuranceData);
      const submissions = insuranceData.submissions || [];
      const drafts = insuranceData.drafts || [];
      console.log('Submissions:', submissions);
      console.log('Drafts:', drafts);
      const submissionsDiv = document.getElementById('submissions');
      submissionsDiv.innerHTML = '';

      if (submissions.length === 0 && drafts.length === 0) {
        submissionsDiv.innerHTML = '<p>No insurance claim requests or drafts yet.</p>';
      } else {
        // Render Submissions
        if (submissions.length > 0) {
          submissions.forEach((submission, index) => {
            console.log('Rendering submission:', {
              index,
              claim_date: submission.claim_date,
              claim_ref_number: submission.claim_ref_number
            });
            const card = document.createElement('div');
            card.className = 'submission-card';
            card.innerHTML = `
              <h3>Insurance Claim Request ${index + 1}</h3>
              <p><strong>Date:</strong> ${submission.claim_date || 'N/A'}</p>
              <p><strong>Reference Number:</strong> ${submission.claim_ref_number || 'N/A'}</p>
              <p><strong>Claiming for:</strong> ${submission.claiming_for || 'N/A'}</p>
              <div class="button-group">
                <button class="view-btn" data-index="${index}" data-hamlet="${hamlet}" data-type="submission">View</button>
              </div>
            `;
            submissionsDiv.appendChild(card);
          });
        } else {
          console.log('No submissions to render');
        }

        // Render Drafts
        if (drafts.length > 0) {
          // In the drafts rendering section
          drafts.forEach((draft, index) => {
            console.log('Rendering draft:', {
              index,
              claim_date: draft.claim_date,
              claim_ref_number: draft.claim_ref_number
            });
            const card = document.createElement('div');
            card.className = 'submission-card draft-card';
            card.innerHTML = `
              <h3>Draft Claim Request ${index + 1}</h3>
              <p><strong>Date:</strong> ${draft.claim_date || 'Not set'}</p>
              <p><strong>Reference Number:</strong> ${draft.claim_ref_number || 'Not set'}</p>
              <p><strong>Claiming for:</strong> ${draft.claiming_for || 'Not set'}</p>
              <div class="button-group">
                <button class="view-btn" data-index="${index}" data-hamlet="${hamlet}" data-type="draft">View</button>
                <button class="edit-btn" data-index="${index}" data-hamlet="${hamlet}" data-type="draft">Edit</button>
                <button class="delete-btn" data-index="${index}" data-hamlet="${hamlet}" data-type="draft">Delete</button>
              </div>
            `;
            submissionsDiv.appendChild(card);
          });
        } else {
          console.log('No drafts to render');
        }

        // Attach View button listeners
        document.querySelectorAll('.view-btn').forEach(button => {
          button.addEventListener('click', () => {
            const index = button.getAttribute('data-index');
            const btnHamlet = button.getAttribute('data-hamlet');
            const type = button.getAttribute('data-type');
            console.log('View button clicked:', { index, hamlet: btnHamlet, type });
            const url = `/insurance-form.html?hamlet=${encodeURIComponent(btnHamlet)}&${type}=${index}&mode=readonly`;
            console.log('Redirecting to:', url);
            window.location.href = url;
          });
        });

        // Attach Edit button listeners
        document.querySelectorAll('.edit-btn').forEach(button => {
          button.addEventListener('click', () => {
            const index = button.getAttribute('data-index');
            const btnHamlet = button.getAttribute('data-hamlet');
            console.log('Edit button clicked:', { index, hamlet: btnHamlet });
            const url = `/insurance-form.html?hamlet=${encodeURIComponent(btnHamlet)}&draft=${index}`;
            console.log('Redirecting to:', url);
            window.location.href = url;
          });
        });

        // Update the delete button handler
        document.querySelectorAll('.delete-btn').forEach(button => {
          button.addEventListener('click', () => {
            const index = button.getAttribute('data-index');
            const btnHamlet = button.getAttribute('data-hamlet');
            
            if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
              console.log('Delete button clicked:', { index, hamlet: btnHamlet });
              
              fetch(`/api/insurance/${encodeURIComponent(btnHamlet)}/drafts/${index}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json'
                }
              })
              .then(response => {
                console.log('Delete response status:', response.status);
                if (!response.ok) {
                  throw new Error('Failed to delete draft');
                }
                return response.json();
              })
              .then(data => {
                console.log('Delete successful:', data);
                // Remove the card from DOM
                const card = button.closest('.submission-card');
                if (card) {
                  card.remove();
                }
                // Don't reload the page, just show success message
                alert('Draft deleted successfully');
              })
              .catch(error => {
                console.error('Error deleting draft:', error);
                alert('Error deleting draft: ' + error.message);
              });
            }
          });
        });
      }
    })
    .catch(error => {
      console.error('Error fetching insurance claims:', error.message);
      document.getElementById('submissions').innerHTML = '<p>Error loading insurance claim requests. Please try again later.</p>';
    });

  const newEntryBtn = document.getElementById('newEntryBtn');
  if (newEntryBtn) {
    newEntryBtn.addEventListener('click', () => {
      console.log('New Entry button clicked');
      const url = `/insurance-form.html?hamlet=${encodeURIComponent(hamlet)}`;
      console.log('Redirecting to:', url);
      window.location.href = url;
    });
  } else {
    console.error('Error: #newEntryBtn not found in DOM');
  }

  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      console.log('Back button clicked');
      window.location.href = '/dashboard.html';
    });
  } else {
    console.error('Error: #backBtn not found in DOM');
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      console.log('Logout button clicked');
      localStorage.clear();
      window.location.href = '/index.html';
    });
  } else {
    console.error('Error: #logoutBtn not found in DOM');
  }
});