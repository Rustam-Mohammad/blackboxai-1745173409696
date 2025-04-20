document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const hamlet = urlParams.get('hamlet') || localStorage.getItem('hamlet');
  if (!hamlet) {
    alert('No hamlet specified!');
    window.location.href = '/dashboard.html';
  }
  document.getElementById('hamlet_display').textContent = hamlet;
  document.getElementById('hamlet').value = hamlet;

  fetch('/api/vec/' + encodeURIComponent(hamlet))
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch VEC data: ' + response.status);
      return response.json();
    })
    .then(vecData => {
      const setValue = (id, value) => {
        const elem = document.getElementById(id);
        if (elem) elem.value = value || '';
      };
      setValue('vec_name', vecData.vec_name);
      setValue('state', vecData.state);
      setValue('district', vecData.district);
      setValue('block', vecData.block);
      setValue('gp', vecData.gp);
      setValue('village', vecData.village);
      setValue('microgrid_id', vecData.microgrid_id);
      setValue('submission_date', new Date().toISOString().split('T')[0]);
      makeStaticFieldsReadOnly();

      const submissions = vecData.submissions || [];
      const isFirstSubmission = submissions.length === 0;

      fetch('/api/hh-list?hamlet=' + encodeURIComponent(hamlet))
        .then(response => response.json())
        .then(hhList => {
          Promise.all(hhList.map(hh => 
            fetch('/api/hh/' + encodeURIComponent(hh.customer_id)).then(res => res.json())
          ))
            .then(hhData => {
              const totalCollected = hhData.reduce((sum, hh) => {
                const hhSubmissions = hh.submissions || [];
                const latestSubmission = hhSubmissions.length > 0 ? hhSubmissions[hhSubmissions.length - 1] : null;
                return sum + (latestSubmission && latestSubmission.amount_paid ? parseFloat(latestSubmission.amount_paid) : 0);
              }, 0);
              setValue('amount_collected', totalCollected.toFixed(2));

              const expenditureInput = document.getElementById('expenditure');
              const totalSavingMonthInput = document.getElementById('total_saving_month');
              const totalSavingInput = document.getElementById('total_saving');
              const amountInBankInput = document.getElementById('amount_in_bank');
              const amountInHandInput = document.getElementById('amount_in_hand');

              if (isFirstSubmission) {
                totalSavingInput.removeAttribute('readonly');
              } else {
                const prevTotalSaving = submissions.length > 0 ? parseFloat(submissions[submissions.length - 1].total_saving || 0) : 0;
                totalSavingInput.setAttribute('readonly', true);
              }

              function updateCalculations() {
                const expenditure = parseFloat(expenditureInput.value) || 0;
                const totalSavingMonth = totalCollected - expenditure;
                totalSavingMonthInput.value = totalSavingMonth.toFixed(2);

                if (!isFirstSubmission) {
                  const prevTotalSaving = parseFloat(submissions[submissions.length - 1].total_saving || 0);
                  totalSavingInput.value = (totalSavingMonth + prevTotalSaving).toFixed(2);
                }

                const totalSaving = parseFloat(totalSavingInput.value) || 0;
                const amountInBank = parseFloat(amountInBankInput.value) || 0;
                amountInHandInput.value = (totalSaving - amountInBank).toFixed(2);
              }

              expenditureInput.addEventListener('input', updateCalculations);
              amountInBankInput.addEventListener('input', updateCalculations);
              totalSavingInput.addEventListener('input', updateCalculations);
              updateCalculations();
            });
        });
    })
    .catch(error => {
      console.error('Error fetching VEC data:', error);
      alert('Error loading VEC data: ' + error.message);
    });

  function makeStaticFieldsReadOnly() {
    ['hamlet', 'vec_name', 'state', 'district', 'block', 'gp', 'village', 'microgrid_id', 'amount_collected'].forEach(id => {
      const elem = document.getElementById(id);
      if (elem) elem.readOnly = true;
    });
  }

  const vecForm = document.getElementById('vecForm');
  if (vecForm) {
    vecForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const formData = new FormData();
      const submission = {};
      for (const [key, value] of new FormData(this)) {
        if (key === 'general_issue') {
          submission[key] = submission[key] ? submission[key].concat(value) : [value];
        } else if (key !== 'issue_img') {
          submission[key] = value;
        }
      }
      formData.append('submission', JSON.stringify(submission));
      if (this.issue_img && this.issue_img.files[0]) formData.append('issue_img', this.issue_img.files[0]);

      fetch(`/api/vec/${encodeURIComponent(hamlet)}/submit`, {
        method: 'POST',
        body: formData
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to submit: ' + response.status);
          return response.json();
        })
        .then(data => {
          if (data.success) window.location.href = `/vec-submissions.html?hamlet=${encodeURIComponent(hamlet)}`;
          else alert('Submission failed: ' + (data.error || 'Unknown error'));
        })
        .catch(error => {
          console.error('Submission error:', error);
          alert('Error submitting form: ' + error.message);
        });
    });
  }

  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = `/vec-submissions.html?hamlet=${encodeURIComponent(hamlet)}`;
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/index.html';
  });
});