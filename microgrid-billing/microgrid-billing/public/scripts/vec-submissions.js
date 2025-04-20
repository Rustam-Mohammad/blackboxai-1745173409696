document.addEventListener('DOMContentLoaded', () => {
  console.log('vec-submissions.js loaded');
  const urlParams = new URLSearchParams(window.location.search);
  let hamlet = urlParams.get('hamlet');
  const container = document.querySelector('.vec-submissions-container');

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

  fetch(`/api/vec/${encodeURIComponent(hamlet)}`)
    .then(response => {
      console.log('Fetch /api/vec response:', { status: response.status, ok: response.ok });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return response.json();
    })
    .then(vecData => {
      console.log('VEC data received:', vecData);
      const submissions = vecData.submissions || [];
      const drafts = vecData.drafts || [];
      console.log('Submissions:', submissions);
      console.log('Drafts:', drafts);
      const submissionsDiv = document.getElementById('submissions');
      submissionsDiv.innerHTML = '';

      if (submissions.length === 0 && drafts.length === 0) {
        submissionsDiv.innerHTML = '<p>No submissions or drafts yet.</p>';
      } else {
        // Render Submissions
        if (submissions.length > 0) {
          submissions.forEach((submission, index) => {
            console.log('Rendering submission:', {
              index,
              submission_date: submission.submission_date,
              total_amount_collected_for_the_Month: submission.total_amount_collected_for_the_Month
            });
            const card = document.createElement('div');
            card.className = 'submission-card';
            card.innerHTML = `
              <h3>Submission ${index + 1}</h3>
              <p><strong>Date:</strong> ${submission.submission_date || 'N/A'}</p>
              <p><strong>Amount Collected:</strong> ${submission.total_amount_collected_for_the_Month || '0'}</p>
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
          drafts.forEach((draft, index) => {
            console.log('Rendering draft:', {
              index,
              submission_date: draft.submission_date,
              total_amount_collected_for_the_Month: draft.total_amount_collected_for_the_Month
            });
            const card = document.createElement('div');
            card.className = 'submission-card draft-card';
            card.innerHTML = `
              <h3>Draft ${index + 1}</h3>
              <p><strong>Date:</strong> ${draft.submission_date || 'Not set'}</p>
              <p><strong>Amount Collected:</strong> ${draft.total_amount_collected_for_the_Month || '0'}</p>
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
          submissionsDiv.innerHTML += '<p>No drafts available.</p>';
        }

        // Attach View button listeners
        document.querySelectorAll('.view-btn').forEach(button => {
          button.addEventListener('click', () => {
            const index = button.getAttribute('data-index');
            const btnHamlet = button.getAttribute('data-hamlet');
            const type = button.getAttribute('data-type');
            console.log('View button clicked:', { index, hamlet: btnHamlet, type });
            const url = `/vec-form.html?hamlet=${encodeURIComponent(btnHamlet)}&${type}=${index}&mode=readonly`;
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
            const url = `/vec-form.html?hamlet=${encodeURIComponent(btnHamlet)}&draft=${index}`;
            console.log('Redirecting to:', url);
            window.location.href = url;
          });
        });

        // Attach Delete button listeners
        document.querySelectorAll('.delete-btn').forEach(button => {
          button.addEventListener('click', () => {
            const index = button.getAttribute('data-index');
            const btnHamlet = button.getAttribute('data-hamlet');
            const type = button.getAttribute('data-type');
            
            if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
              console.log('Delete button clicked:', { index, hamlet: btnHamlet, type });
              fetch(`/api/vec/${encodeURIComponent(btnHamlet)}/drafts/${index}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json'
                }
              })
              .then(response => {
                if (!response.ok) {
                  return response.json().then(err => {
                    throw new Error(err.error || 'Failed to delete draft');
                  });
                }
                return response.json();
              })
              .then(data => {
                console.log('Delete response:', data);
                alert('Draft deleted successfully');
                window.location.reload();
              })
              .catch(error => {
                console.error('Error deleting draft:', error);
                alert(error.message || 'Error deleting draft. Please try again.');
              });
            }
          });
        });
      }
    })
    .catch(error => {
      console.error('Error fetching submissions:', error.message);
      document.getElementById('submissions').innerHTML = '<p>Error loading submissions. Please try again later.</p>';
    });

  const newEntryBtn = document.getElementById('newEntryBtn');
  if (newEntryBtn) {
    newEntryBtn.addEventListener('click', () => {
      console.log('New Entry button clicked');
      const url = `/vec-form.html?hamlet=${encodeURIComponent(hamlet)}`;
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