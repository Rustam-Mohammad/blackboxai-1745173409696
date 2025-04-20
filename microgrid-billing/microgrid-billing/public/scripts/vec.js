const urlParams = new URLSearchParams(window.location.search);
const hamlet = urlParams.get('hamlet');
const form = document.getElementById('vecForm');
const issueSelect = form.querySelector('[name="general_issues"]');
const issueImgDiv = document.getElementById('issueImgDiv');

// Set current date
form.submission_date.value = new Date().toISOString().split('T')[0];

// Fetch previous VEC submission and HH data
fetch('/api/vec/' + encodeURIComponent(hamlet))
  .then(response => response.json())
  .then(data => {
    const submissions = data.submissions || [];
    const lastSubmission = submissions[submissions.length - 1] || {};

    if (submissions.length === 0) {
      // First submission: Manual entry
      form.amount_collected.value = '';
      form.total_saving.value = '';
    } else {
      // Subsequent submissions: Auto-fill amount_collected from HH data
      fetch('/api/hh-list')
        .then(response => response.json())
        .then(hhData => {
          const hhSubmissions = hhData.map(hh => {
            return fetch('/api/hh/' + encodeURIComponent(hh.customer_id))
              .then(res => res.json())
              .then(data => data.submissions || []);
          });
          Promise.all(hhSubmissions).then(allSubs => {
            const currentMonth = form.submission_date.value.slice(0, 7); // YYYY-MM
            const totalCollected = allSubs.flat()
              .filter(sub => sub.read_date.slice(0, 7) === currentMonth)
              .reduce((sum, sub) => sum + (parseFloat(sub.amount_paid) || 0), 0);
            form.amount_collected.value = totalCollected.toFixed(2);
            form.amount_collected.readOnly = true;
            form.total_saving.value = (parseFloat(lastSubmission.total_saving) || 0).toFixed(2);
            form.total_saving.readOnly = true;
            updateCalculations();
          });
        });
    }
    updateCalculations();
  })
  .catch(error => console.error('Fetch Previous Error:', error));

// Handle issues selection
issueSelect.addEventListener('change', function() {
  const hasIssue = Array.from(this.selectedOptions).some(opt => opt.value !== 'No Issue');
  issueImgDiv.style.display = hasIssue ? 'block' : 'none';
});

// Calculate fields
form.amount_collected.addEventListener('input', updateCalculations);
form.expenditure.addEventListener('input', updateCalculations);
form.total_saving.addEventListener('input', updateCalculations);
form.amount_bank.addEventListener('input', updateCalculations);

function updateCalculations() {
  const amountCollected = parseFloat(form.amount_collected.value) || 0;
  const expenditure = parseFloat(form.expenditure.value) || 0;
  const totalSavingPrev = parseFloat(form.total_saving.value) || 0;
  const amountBank = parseFloat(form.amount_bank.value) || 0;

  const savingMonth = amountCollected - expenditure;
  const totalSaving = savingMonth + (form.total_saving.readOnly ? totalSavingPrev : 0);
  const amountHand = totalSaving - amountBank;

  form.saving_month.value = savingMonth.toFixed(2);
  if (!form.total_saving.readOnly) form.total_saving.value = totalSaving.toFixed(2);
  form.amount_hand.value = amountHand.toFixed(2);
}

// Submit form
form.addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData();
  const submission = {};
  for (const [key, value] of new FormData(form)) {
    if (key !== 'issue_img') submission[key] = value;
  }
  formData.append('submission', JSON.stringify(submission));
  if (form.issue_img.files[0]) formData.append('issue_img', form.issue_img.files[0]);

  fetch('/api/vec/' + encodeURIComponent(hamlet) + '/submit', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return response.json();
  })
  .then(data => {
    if (data.success) {
      window.location.href = '/vec.html';
    } else {
      alert('Submission failed: ' + (data.error || 'Unknown error'));
    }
  })
  .catch(error => {
    alert('Error submitting form: ' + error.message);
  });
});