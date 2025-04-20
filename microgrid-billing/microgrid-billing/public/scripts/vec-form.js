document.addEventListener('DOMContentLoaded', () => {
  console.log('vec-form.js loaded');
  const urlParams = new URLSearchParams(window.location.search);
  const hamlet = urlParams.get('hamlet');
  const submissionIndex = urlParams.get('submission');
  const draftIndex = urlParams.get('draft');
  const mode = urlParams.get('mode') || 'edit';
  const form = document.getElementById('vecForm');
  const issueSelect = form.querySelector('[name="general_issues"]');
  const issueImgDiv = document.getElementById('issueImgDiv');
  const submitBtn = document.getElementById('submitBtn');
  const draftBtn = document.getElementById('draftBtn');
  const backBtn = document.getElementById('backBtn');

  console.log('URL params:', { hamlet, submissionIndex, draftIndex, mode });

  if (!hamlet) {
    console.error('No hamlet specified');
    alert('No hamlet specified!');
    window.location.href = '/dashboard.html';
    return;
  }
  document.getElementById('hamlet').textContent = hamlet;

  function updateAmountCollected() {
    const currentMonth = form.submission_date.value.slice(0, 7);
    console.log('Updating amount collected for month:', currentMonth);
    fetch('/api/hh-list?all=true')
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch HH data');
        return response.json();
      })
      .then(hhData => {
        const hhSubmissions = hhData.map(hh =>
          fetch(`/api/hh/${encodeURIComponent(hh.customer_id)}`)
            .then(res => res.json())
            .then(data => ({ submissions: data.submissions || [], hamlet: data.hamlet }))
        );
        Promise.all(hhSubmissions).then(allSubs => {
          const totalCollected = allSubs
            .filter(hh => hh.hamlet.toLowerCase() === hamlet.toLowerCase())
            .flatMap(hh => hh.submissions)
            .filter(sub => sub.read_date && sub.read_date.slice(0, 7) === currentMonth)
            .reduce((sum, sub) => sum + (parseFloat(sub.amount_paid) || 0), 0);
          form.amount_collected_for_the_Month.value = totalCollected.toFixed(2);
          calculateFields();
        });
      })
      .catch(error => {
        console.error('Error fetching HH data:', error);
        form.amount_collected_for_the_Month.value = '0.00';
      });
  }

  function checkSubmissionLimit() {
    const submissionDate = form.submission_date.value;
    if (!submissionDate) return;
    const submissionMonth = submissionDate.slice(0, 7);
    console.log('Checking submission limit for month:', submissionMonth);
    fetch(`/api/vec/${encodeURIComponent(hamlet)}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch VEC data');
        return response.json();
      })
      .then(data => {
        const submissions = data.submissions || [];
        const hasSubmission = submissions.some(sub => sub.submission_date && sub.submission_date.slice(0, 7) === submissionMonth);
        if (hasSubmission && mode !== 'readonly' && (submissionIndex === null || parseInt(submissionIndex) !== submissions.findIndex(sub => sub.submission_date && sub.submission_date.slice(0, 7) === submissionMonth))) {
          submitBtn.disabled = true;
          draftBtn.disabled = true;
          alert('A submission for this month already exists.');
        } else {
          submitBtn.disabled = false;
          draftBtn.disabled = false;
        }
      })
      .catch(error => console.error('Error checking submission limit:', error));
  }

  function calculateFields() {
    if (mode === 'readonly') return;
    const amountCollected = parseFloat(form.amount_collected_for_the_Month.value) || 0;
    const amountOtherSource = parseFloat(form.amount_other_source.value) || 0;
    const totalAmountCollected = amountCollected + amountOtherSource;
    form.total_amount_collected_for_the_Month.value = totalAmountCollected.toFixed(2);

    const expenditure = parseFloat(form.expenditure_for_the_Month.value) || 0;
    const savingMonth = totalAmountCollected - expenditure;
    form.savings_for_this_month.value = savingMonth.toFixed(2);

    const amountBank = parseFloat(form.amount_bank.value) || 0;
    form.amount_hand.value = ((parseFloat(form.total_savings.value) || 0) - amountBank).toFixed(2);
  }

  function getPreviousTotalSaving(submissions) {
    if (submissions.length === 0) return 0;
    const latestSubmission = submissions.reduce((latest, sub) => {
      if (!sub.submission_date) return latest;
      return !latest.submission_date || sub.submission_date > latest.submission_date ? sub : latest;
    }, {});
    return parseFloat(latestSubmission.total_savings) || 0;
  }

  function populateForm(data, isDraft = false) {
    console.log('Populating form with data:', data);
    form.state.value = data.state || 'Jharkhand';
    form.district.value = data.district || 'Dumka';
    form.block.value = data.block || 'Kurdeg';
    form.gp.value = data.gp || 'Barkibiura';
    form.village.value = data.village || 'Saraipani';
    form.hamlet.value = data.hamlet || hamlet;
    form.vec_name.value = data.vec_name || 'Prakash Saur Oorja Samiti';
    form.micro_id.value = data.micro_id || 'MG-SARAIPANI';
    form.submission_date.value = data.submission_date || '';
    form.amount_collected_for_the_Month.value = (parseFloat(data.amount_collected_for_the_Month) || 0).toFixed(2);
    form.amount_other_source.value = data.amount_other_source || '';
    form.total_amount_collected_for_the_Month.value = (parseFloat(data.total_amount_collected_for_the_Month) || 0).toFixed(2);
    form.expenditure_for_the_Month.value = data.expenditure_for_the_Month || '';
    form.savings_for_this_month.value = (parseFloat(data.savings_for_this_month) || 0).toFixed(2);
    form.total_savings.value = data.total_savings || (isDraft ? '' : data.total_savings || '');
    form.amount_bank.value = data.amount_bank || '';
    form.amount_hand.value = (parseFloat(data.amount_hand) || 0).toFixed(2);
    let issues = data.general_issues;
    if (typeof issues === 'string') issues = issues.split(',');
    else if (!Array.isArray(issues)) issues = issues ? [issues] : ['No Issue'];
    Array.from(issueSelect.options).forEach(option => {
      option.selected = issues.includes(option.value);
    });
    issueImgDiv.style.display = issues.some(i => i !== 'No Issue') ? 'block' : 'none';
  }

  function makeFormReadOnly() {
    console.log('Making form read-only');
    Array.from(form.elements).forEach(element => {
      if (element.tagName !== 'BUTTON') element.disabled = true;
    });
    submitBtn.style.display = 'none';
    draftBtn.style.display = 'none';
    backBtn.textContent = 'View Submissions';
  }

  fetch(`/api/vec/${encodeURIComponent(hamlet)}`)
    .then(response => {
      console.log('Fetch VEC response:', { status: response.status });
      if (!response.ok) throw new Error('Failed to fetch VEC data: ' + response.status);
      return response.json();
    })
    .then(data => {
      console.log('VEC data:', data);
      const submissions = data.submissions || [];
      const drafts = data.drafts || [];

      if (mode === 'readonly' && submissionIndex !== null) {
        const submission = submissions[parseInt(submissionIndex)];
        if (!submission) throw new Error('Submission not found');
        populateForm(submission);
        makeFormReadOnly();
      } else if (draftIndex !== null) {
        const draft = drafts[parseInt(draftIndex)];
        if (!draft) throw new Error('Draft not found');
        populateForm(draft, true);
        if (mode === 'readonly') {
          makeFormReadOnly();
        } else {
          form.submission_date.disabled = false;
          if (submissions.length > 0) {
            const prevTotalSaving = getPreviousTotalSaving(submissions);
            form.total_savings.value = (prevTotalSaving + (parseFloat(form.savings_for_this_month.value) || 0)).toFixed(2);
            form.total_savings.readOnly = true;
          } else {
            form.total_savings.readOnly = false;
          }
          updateAmountCollected();
          checkSubmissionLimit();
        }
      } else {
        populateForm(data);
        form.submission_date.value = new Date().toISOString().split('T')[0];
        form.submission_date.disabled = false;
        if (submissions.length > 0) {
          const prevTotalSaving = getPreviousTotalSaving(submissions);
          form.total_savings.value = prevTotalSaving.toFixed(2);
          form.total_savings.readOnly = true;
        } else {
          form.total_savings.value = '';
          form.total_savings.readOnly = false;
        }
        updateAmountCollected();
        checkSubmissionLimit();
      }
    })
    .catch(error => {
      console.error('Error fetching VEC data:', error);
      alert('Error loading VEC data: ' + error.message);
    });

  form.submission_date.addEventListener('change', () => {
    console.log('Submission date changed:', form.submission_date.value);
    updateAmountCollected();
    checkSubmissionLimit();
  });

  issueSelect.addEventListener('change', () => {
    const selectedIssues = Array.from(issueSelect.selectedOptions).map(opt => opt.value);
    console.log('Issues selected:', selectedIssues);
    issueImgDiv.style.display = selectedIssues.length && !selectedIssues.includes('No Issue') ? 'block' : 'none';
  });

  form.amount_other_source.addEventListener('input', () => {
    console.log('Amount other source input:', form.amount_other_source.value);
    calculateFields();
    if (!form.total_savings.readOnly) return;
    const prevTotalSaving = parseFloat(form.total_savings.value) - (parseFloat(form.savings_for_this_month.value) || 0);
    const newSavingMonth = parseFloat(form.savings_for_this_month.value) || 0;
    form.total_savings.value = (prevTotalSaving + newSavingMonth).toFixed(2);
  });

  form.expenditure_for_the_Month.addEventListener('input', () => {
    console.log('Expenditure input:', form.expenditure_for_the_Month.value);
    calculateFields();
    if (!form.total_savings.readOnly) return;
    const prevTotalSaving = parseFloat(form.total_savings.value) - (parseFloat(form.savings_for_this_month.value) || 0);
    const newSavingMonth = parseFloat(form.savings_for_this_month.value) || 0;
    form.total_savings.value = (prevTotalSaving + newSavingMonth).toFixed(2);
  });

  form.amount_bank.addEventListener('input', () => {
    console.log('Amount bank input:', form.amount_bank.value);
    calculateFields();
  });

  if (!form.total_savings.readOnly) {
    form.total_savings.addEventListener('input', calculateFields);
  }

  form.addEventListener('submit', function(e) {
    if (mode === 'readonly') return;
    e.preventDefault();
    console.log('Form submitted');
    const formData = new FormData();
    const submission = {};
    for (const [key, value] of new FormData(form)) {
      if (key === 'general_issues') {
        submission[key] = Array.from(form.general_issues.selectedOptions).map(opt => opt.value);
      } else if (key !== 'issue_img') {
        submission[key] = value;
      }
    }
    console.log('Submission data:', submission);
    formData.append('submission', JSON.stringify(submission));
    if (form.issue_img.files[0]) {
      console.log('Appending issue image:', form.issue_img.files[0].name);
      formData.append('issue_img', form.issue_img.files[0]);
    }

    fetch(`/api/vec/${encodeURIComponent(hamlet)}/submit`, {
      method: 'POST',
      body: formData
    })
      .then(response => {
        console.log('Submit response:', { status: response.status });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        console.log('Submit result:', data);
        if (data.success) {
          window.location.href = `/vec-submissions.html?hamlet=${encodeURIComponent(hamlet)}`;
        } else {
          alert('Submission failed: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(error => {
        console.error('Submission error:', error);
        alert('Error submitting form: ' + error.message);
      });
  });

  draftBtn.addEventListener('click', function() {
    console.log('Save Draft clicked for hamlet:', hamlet);
    if (!form.submission_date.value) {
      console.warn('Submission date is empty');
      alert('Please enter a submission date before saving draft.');
      return;
    }
    const formData = new FormData();
    const draft = {};
    for (const [key, value] of new FormData(form)) {
      if (key === 'general_issues') {
        draft[key] = Array.from(form.general_issues.selectedOptions).map(opt => opt.value);
      } else if (key !== 'issue_img') {
        draft[key] = value;
      }
    }
    console.log('Draft data to save:', draft);
    formData.append('draft', JSON.stringify(draft));
    if (form.issue_img.files[0]) {
      console.log('Issue image included:', form.issue_img.files[0].name);
      formData.append('issue_img', form.issue_img.files[0]);
    } else {
      console.log('No issue image included');
    }

    const url = `/api/vec/${encodeURIComponent(hamlet)}/draft`;
    console.log('Sending draft to URL:', url);

    fetch(url, {
      method: 'POST',
      body: formData
    })
      .then(response => {
        console.log('Draft response status:', response.status);
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(`HTTP error! Status: ${response.status}, Body: ${text}`);
          });
        }
        return response.json();
      })
      .then(data => {
        console.log('Draft response data:', data);
        if (data.success) {
          console.log('Draft saved successfully, redirecting to submissions');
          window.location.href = `/vec-submissions.html?hamlet=${encodeURIComponent(hamlet)}`;
        } else {
          console.error('Draft save failed:', data.error);
          alert('Draft save failed: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(error => {
        console.error('Draft save error:', error);
        alert('Error saving draft: ' + error.message);
      });
  });

  backBtn.addEventListener('click', () => {
    console.log('Back button clicked, redirecting to submissions');
    window.location.href = `/vec-submissions.html?hamlet=${encodeURIComponent(hamlet)}`;
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    console.log('Logout button clicked');
    localStorage.clear();
    window.location.href = '/index.html';
  });
});