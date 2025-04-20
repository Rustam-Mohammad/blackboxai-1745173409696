document.addEventListener('DOMContentLoaded', () => {
  console.log('edit-vec-form.js loaded');
  const role = localStorage.getItem('role');
  if (role !== 'spoc') {
    console.error('Access restricted: role is not spoc');
    alert('Access restricted to SPOC only!');
    window.location.href = '/index.html';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const hamlet = urlParams.get('hamlet');
  const subIndex = parseInt(urlParams.get('subIndex'));
  const form = document.getElementById('vecForm');
  const issueSelect = form.querySelector('[name="general_issues"]');
  const issueImgDiv = document.getElementById('issueImgDiv');
  const submitBtn = document.getElementById('submitBtn');
  const backBtn = document.getElementById('backBtn');

  console.log('URL params:', { hamlet, subIndex });

  if (!hamlet || isNaN(subIndex)) {
    console.error('Invalid parameters:', { hamlet, subIndex });
    alert('Invalid submission parameters');
    window.location.href = '/edit-entries.html';
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
        const otherSubmissions = submissions.filter((_, idx) => idx !== subIndex);
        const hasSubmission = otherSubmissions.some(sub => sub.submission_date && sub.submission_date.slice(0, 7) === submissionMonth);
        if (hasSubmission) {
          submitBtn.disabled = true;
          alert('A submission for this month already exists.');
        } else {
          submitBtn.disabled = false;
        }
      })
      .catch(error => console.error('Error checking submission limit:', error));
  }

  function calculateFields() {
    console.log('Calculating fields');
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
    const priorSubmissions = submissions.filter((_, idx) => idx < subIndex);
    if (priorSubmissions.length === 0) return 0;
    const latestSubmission = priorSubmissions.reduce((latest, sub) => {
      if (!sub.submission_date) return latest;
      return !latest.submission_date || sub.submission_date > latest.submission_date ? sub : latest;
    }, {});
    return parseFloat(latestSubmission.total_savings) || 0;
  }

  function populateForm(data, submission) {
    console.log('Populating form with data:', { vec: data, submission });
    form.state.value = data.state || 'Jharkhand';
    form.district.value = data.district || 'Dumka';
    form.block.value = data.block || 'Kurdeg';
    form.gp.value = data.gp || 'Barkibiura';
    form.village.value = data.village || 'Saraipani';
    form.hamlet.value = data.hamlet || hamlet;
    form.vec_name.value = data.vec_name || 'Prakash Saur Oorja Samiti';
    form.micro_id.value = data.micro_id || 'MG-SARAIPANI';
    form.submission_date.value = submission.submission_date || '';
    form.amount_collected_for_the_Month.value = (parseFloat(submission.amount_collected_for_the_Month) || 0).toFixed(2);
    form.amount_other_source.value = submission.amount_other_source || '';
    form.total_amount_collected_for_the_Month.value = (parseFloat(submission.total_amount_collected_for_the_Month) || 0).toFixed(2);
    form.expenditure_for_the_Month.value = submission.expenditure_for_the_Month || '';
    form.savings_for_this_month.value = (parseFloat(submission.savings_for_this_month) || 0).toFixed(2);
    form.total_savings.value = submission.total_savings || '';
    form.amount_bank.value = submission.amount_bank || '';
    form.amount_hand.value = (parseFloat(submission.amount_hand) || 0).toFixed(2);
    let issues = submission.general_issues;
    if (typeof issues === 'string') issues = issues.split(',');
    else if (!Array.isArray(issues)) issues = issues ? [issues] : ['No Issue'];
    Array.from(issueSelect.options).forEach(option => {
      option.selected = issues.includes(option.value);
    });
    issueImgDiv.style.display = issues.some(i => i !== 'No Issue') ? 'block' : 'none';
  }

  function loadSubmission() {
    console.log('Loading submission for:', { hamlet, subIndex });
    fetch(`/api/vec/${encodeURIComponent(hamlet)}`)
      .then(response => {
        console.log('Fetch VEC response:', { status: response.status });
        if (!response.ok) throw new Error('Failed to fetch VEC data');
        return response.json();
      })
      .then(data => {
        if (!data.submissions || subIndex < 0 || subIndex >= data.submissions.length) {
          console.error('Submission not found:', { subIndex, submissionsLength: data.submissions?.length });
          alert('Submission not found');
          window.location.href = '/edit-entries.html';
          return;
        }
        const submission = data.submissions[subIndex];
        populateForm(data, submission);
        const submissions = data.submissions || [];
        if (submissions.length > 0) {
          const prevTotalSaving = getPreviousTotalSaving(submissions);
          const currentSaving = parseFloat(form.savings_for_this_month.value) || 0;
          form.total_savings.value = (prevTotalSaving + currentSaving).toFixed(2);
          form.total_savings.readOnly = true;
        } else {
          form.total_savings.readOnly = false;
        }
        updateAmountCollected();
        checkSubmissionLimit();
      })
      .catch(error => {
        console.error('Error loading submission:', error);
        alert('Error loading submission: ' + error.message);
        window.location.href = '/edit-entries.html';
      });
  }

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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Form submitted for edit');
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
    formData.append('submission', JSON.stringify({ subIndex, ...submission }));
    if (form.issue_img.files[0]) {
      console.log('Appending issue image:', form.issue_img.files[0].name);
      formData.append('issue_img', form.issue_img.files[0]);
    }

    fetch(`/api/vec/${encodeURIComponent(hamlet)}/edit`, {
      method: 'POST',
      body: formData
    })
      .then(response => {
        console.log('Edit response:', { status: response.status });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        console.log('Edit result:', data);
        if (data.success) {
          alert('Submission updated successfully');
          window.location.href = '/edit-entries.html';
        } else {
          alert('Failed to update submission: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(error => {
        console.error('Error updating submission:', error);
        alert('Error updating submission: ' + error.message);
      });
  });

  backBtn.addEventListener('click', () => {
    console.log('Back button clicked');
    window.location.href = '/edit-entries.html';
  });

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

  loadSubmission();
});