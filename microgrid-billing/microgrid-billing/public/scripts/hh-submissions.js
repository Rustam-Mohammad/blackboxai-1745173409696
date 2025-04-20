document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const customerId = urlParams.get('customer_id');

  if (!customerId) {
    alert('No customer ID provided!');
    window.location.href = '/hh-list.html';
    return;
  }

  fetch('/api/hh/' + encodeURIComponent(customerId))
    .then(response => {
      if (!response.ok) throw new Error(`Failed to fetch HH data: ${response.status}`);
      return response.json();
    })
    .then(data => {
      console.log('API response:', data); // Debug: Confirm meter_read
      const submissionList = document.getElementById('submissionList');
      const submissions = data.submissions || [];
      const drafts = data.drafts || [];
      if (submissions.length === 0 && drafts.length === 0) {
        submissionList.innerHTML = '<p>No previous submissions or drafts found.</p>';
      } else {
        // Display drafts
        drafts.forEach((draft, index) => {
          const card = document.createElement('div');
          card.className = 'submission-card draft';
          card.innerHTML = `
            <h3>Draft ${index + 1}</h3>
            <p>Date: ${draft.read_date || 'N/A'}</p>
            <p>Meter Reading: ${draft.meter_read || 'N/A'}</p>
            <p>Status: Draft (Payment Pending)</p>
            <div class="button-group">
              <button class="view-btn">View</button>
              <button class="edit-btn">Edit</button>
              <button class="delete-btn">Delete</button>
            </div>
          `;
          card.querySelector('.view-btn').addEventListener('click', () => {
            window.location.href = `/hh-form.html?customer_id=${encodeURIComponent(customerId)}&draft=${index}&mode=readonly`;
          });
          card.querySelector('.edit-btn').addEventListener('click', () => {
            window.location.href = `/hh-form.html?customer_id=${encodeURIComponent(customerId)}&draft=${index}&mode=edit`;
          });
          card.querySelector('.delete-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
              fetch(`/api/hh/${encodeURIComponent(customerId)}/drafts/${index}`, {
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
          submissionList.appendChild(card);
        });
        // Display submissions
        submissions.forEach((submission, index) => {
          const card = document.createElement('div');
          card.className = 'submission-card';
          const isEditable = !submission.amount_paid;
          card.innerHTML = `
            <h3>Submission ${index + 1}</h3>
            <p>Date: ${submission.read_date || 'N/A'}</p>
            <p>Meter Reading: ${submission.meter_read || 'N/A'}</p>
            <p>Amount Paid: ${submission.amount_paid || 'Not Paid'}</p>
            <div class="button-group">
              <button class="view-btn">View</button>
              ${isEditable ? '<button class="edit-btn">Edit</button>' : ''}
              ${isEditable ? '<button class="delete-btn">Delete</button>' : ''}
            </div>
          `;
          card.querySelector('.view-btn').addEventListener('click', () => {
            window.location.href = `/hh-form.html?customer_id=${encodeURIComponent(customerId)}&submission=${index}&mode=readonly`;
          });
          if (isEditable) {
            card.querySelector('.edit-btn').addEventListener('click', () => {
              window.location.href = `/hh-form.html?customer_id=${encodeURIComponent(customerId)}&submission=${index}&mode=edit`;
            });
            card.querySelector('.delete-btn').addEventListener('click', () => {
              if (confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
                fetch(`/api/hh/${encodeURIComponent(customerId)}/submissions/${index}`, {
                  method: 'DELETE'
                })
                .then(response => {
                  if (!response.ok) throw new Error('Failed to delete submission');
                  return response.json();
                })
                .then(() => {
                  alert('Submission deleted successfully');
                  window.location.reload();
                })
                .catch(error => {
                  console.error('Error deleting submission:', error);
                  alert('Error deleting submission. Please try again.');
                });
              }
            });
          }
          submissionList.appendChild(card);
        });
      }
    })
    .catch(error => {
      console.error('Error fetching submissions:', error);
      alert('Error loading submissions: ' + error.message);
    });

  document.getElementById('newEntryBtn').addEventListener('click', () => {
    window.location.href = `/hh-form.html?customer_id=${encodeURIComponent(customerId)}&mode=edit`;
  });

  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = '/hh-list.html';
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/index.html';
  });
});

function renderDraftCards(drafts) {
  const container = document.getElementById('draft-cards-container');
  container.innerHTML = '';

  drafts.forEach(draft => {
    const card = document.createElement('div');
    card.className = 'draft-card';
    card.innerHTML = `
      <h3>Draft #${draft.id}</h3>
      <p><strong>Date:</strong> ${new Date(draft.created_at).toLocaleDateString()}</p>
      <p><strong>Status:</strong> ${draft.status}</p>
      <div class="button-group">
        <button class="view-btn" onclick="viewDraft(${draft.id})">View</button>
        <button class="edit-btn" onclick="editDraft(${draft.id})">Edit</button>
        <button class="delete-btn" onclick="deleteDraft(${draft.id})">Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
}

async function deleteDraft(draftId) {
  if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
    try {
      const response = await fetch(`/api/hh-drafts/${draftId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Draft deleted successfully');
        loadDrafts(); // Refresh the draft list
      } else {
        throw new Error('Failed to delete draft');
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      alert('Error deleting draft. Please try again.');
    }
  }
}