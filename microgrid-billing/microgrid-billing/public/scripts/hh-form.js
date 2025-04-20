document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const customerId = urlParams.get('customer_id');
  const submissionIndex = urlParams.get('submission');
  const draftIndex = urlParams.get('draft');
  const mode = urlParams.get('mode') || 'edit';
  const form = document.getElementById('hhForm');
  const issueSelect = form.querySelector('[name="individual_issues"]');
  const issueImgDiv = document.getElementById('issueImgDiv');
  const submitBtn = document.getElementById('submitBtn');
  const draftBtn = document.getElementById('draftBtn');
  const billingSection = document.getElementById('billingSection');

  if (!customerId) {
    alert('No customer ID provided!');
    window.location.href = '/hh-list.html';
  }

  function checkSubmissionLimit() {
    const readDate = form.read_date.value;
    if (!readDate) return;
    const submissionMonth = readDate.slice(0, 7);
    fetch(`/api/hh/${encodeURIComponent(customerId)}`)
      .then(response => response.json())
      .then(data => {
        const submissions = data.submissions || [];
        const hasSubmission = submissions.some(sub => sub.read_date && sub.read_date.slice(0, 7) === submissionMonth);
        if (hasSubmission && mode !== 'readonly' && (submissionIndex === null || parseInt(submissionIndex) !== submissions.findIndex(sub => sub.read_date && sub.read_date.slice(0, 7) === submissionMonth))) {
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

  function validateMeterReading(showAlert = true) {
    const selectedIssues = Array.from(issueSelect.selectedOptions).map(opt => opt.value);
    if (selectedIssues.includes('Migrated') || selectedIssues.includes('Wave off')) {
      return true; // Skip validation if no billing
    }
    const meterRead = parseFloat(form.meter_read.value) || 0;
    const prevRead = parseFloat(form.prev_read.value) || 0;
    if (form.meter_read.value && meterRead < prevRead) {
      if (showAlert) {
        alert('Current Meter Reading cannot be less than Previous Reading (' + prevRead + ').');
      }
      return false;
    }
    return true;
  }

  fetch('/api/hh/' + encodeURIComponent(customerId))
    .then(response => {
      if (!response.ok) throw new Error(`Failed to fetch HH data: ${response.status}`);
      return response.json();
    })
    .then(data => {
      console.log('HH Data Response:', data);
      if (!data || !data.customer_id) throw new Error('Invalid HH data: ' + JSON.stringify(data));
      form.customer_id.value = data.customer_id;
      form.hh_head.value = data.hh_name || 'Unknown';
      form.state.value = data.state || '';
      form.district.value = data.district || '';
      form.block.value = data.block || '';
      form.gp.value = data.gp || '';
      form.village.value = data.village || '';
      form.hamlet.value = data.hamlet || '';
      form.vec_name.value = data.vec_name || '';
      form.meter_num.value = data.meter_num || '';
      const submissions = data.submissions || [];
      const drafts = data.drafts || [];
      const lastSubmission = submissions[submissions.length - 1] || {};

      if (mode === 'readonly' && submissionIndex !== null) {
        const submission = submissions[parseInt(submissionIndex)];
        if (!submission) throw new Error('Submission not found');
        populateForm(submission);
        makeFormReadOnly();
      } else if (mode === 'readonly' && draftIndex !== null) {
        const draft = drafts[parseInt(draftIndex)];
        if (!draft) throw new Error('Draft not found');
        populateForm(draft);
        makeFormReadOnly();
      } else if (mode === 'edit' && draftIndex !== null) {
        const draft = drafts[parseInt(draftIndex)];
        if (!draft) throw new Error('Draft not found');
        populateForm(draft);
        if (submissions.length > 0 || drafts.length > 1) {
          form.prev_read.readOnly = true;
          form.past_due.readOnly = true;
        }
        updateBilling();
      } else if (mode === 'edit' && submissionIndex !== null) {
        const submission = submissions[parseInt(submissionIndex)];
        if (!submission) throw new Error('Submission not found');
        if (submission.amount_paid) {
          populateForm(submission);
          makeFormReadOnly();
          alert('This submission cannot be edited because payment has already been recorded.');
        } else {
          populateForm(submission);
          if (submissions.length > 1 || (submissions.length === 1 && submissionIndex !== '0')) {
            form.prev_read.readOnly = true;
            form.past_due.readOnly = true;
          }
          updateBilling();
        }
      } else {
        form.read_date.value = new Date().toISOString().split('T')[0];
        form.prev_read.value = lastSubmission.meter_read || '';
        form.past_due.value = lastSubmission.amount_balance || '0';
        form.bill_id.value = `BILL-${Date.now()}`;
        if (submissions.length > 0) {
          form.prev_read.readOnly = true;
          form.past_due.readOnly = true;
        }
        updateBilling();
      }
      makeStaticFieldsReadOnly();
      updateFormBasedOnIssues();
      checkSubmissionLimit();
    })
    .catch(error => {
      console.error('Error loading submission:', error);
      alert('Error loading submission: ' + error.message);
      window.location.href = '/hh-list.html';
    });

  issueSelect.addEventListener('change', () => {
    updateFormBasedOnIssues();
    updateBilling();
  });
  form.meter_read.addEventListener('blur', () => {
    validateMeterReading();
    updateBilling();
  });
  form.prev_read.addEventListener('input', updateBilling);
  form.past_due.addEventListener('input', updateBilling);
  form.amount_paid.addEventListener('input', updateBilling);
  form.read_date.addEventListener('change', checkSubmissionLimit);

  function updateBilling() {
    if (mode === 'readonly' || !billingSection) return;
    const meterRead = parseFloat(form.meter_read.value) || 0;
    const prevRead = parseFloat(form.prev_read.value) || 0;
    const pastDue = parseFloat(form.past_due.value) || 0;
    const amountPaid = parseFloat(form.amount_paid.value) || 0;
    const selectedIssues = Array.from(issueSelect.selectedOptions).map(opt => opt.value);

    const unitsConsumed = meterRead >= prevRead ? meterRead - prevRead : 0;
    let currentBill;
    if (selectedIssues.includes('Partial Waive Off - Fixed Charge')) {
      currentBill = 10 * unitsConsumed;
    } else if (selectedIssues.includes('Partial Waive Off - Tariff')) {
      currentBill = 100;
    } else {
      currentBill = (10 * unitsConsumed) + 100;
    }
    const totalDue = currentBill + pastDue;
    const balance = totalDue - amountPaid;

    form.net_consumed.value = unitsConsumed.toFixed(1);
    form.current_bill.value = currentBill.toFixed(2);
    form.total_due.value = totalDue.toFixed(2);
    form.amount_balance.value = balance.toFixed(2);
  }

  function populateForm(data) {
    form.read_date.value = data.read_date || '';
    form.meter_read.value = data.meter_read || '';
    form.prev_read.value = data.prev_read || '';
    form.net_consumed.value = data.net_consumed || '';
    form.current_bill.value = data.current_bill || '';
    form.past_due.value = data.past_due || '0';
    form.total_due.value = data.total_due || '';
    form.amount_paid.value = data.amount_paid || '';
    form.amount_balance.value = data.amount_balance || '';
    form.bill_id.value = data.bill_id || '';
    let issues = data.individual_issues;
    if (typeof issues === 'string') {
      issues = issues.split(',');
    } else if (!Array.isArray(issues)) {
      issues = issues ? [issues] : ['No Issue'];
    }
    Array.from(issueSelect.options).forEach(option => {
      option.selected = issues.includes(option.value);
    });
    updateFormBasedOnIssues();
  }

  function makeFormReadOnly() {
    Array.from(form.elements).forEach(element => {
      if (element.tagName !== 'BUTTON') element.disabled = true;
    });
    submitBtn.style.display = 'none';
    draftBtn.style.display = 'none';
  }

  function makeStaticFieldsReadOnly() {
    form.state.readOnly = true;
    form.district.readOnly = true;
    form.block.readOnly = true;
    form.gp.readOnly = true;
    form.village.readOnly = true;
    form.hamlet.readOnly = true;
    form.vec_name.readOnly = true;
    form.micro_id.readOnly = true;
    form.customer_id.readOnly = true;
    form.hh_head.readOnly = true;
    form.cust_gender.readOnly = true;
  }

  function updateFormBasedOnIssues() {
    const selectedIssues = Array.from(issueSelect.selectedOptions).map(opt => opt.value);
    const isBillingVisible = selectedIssues.length === 0 || 
                           selectedIssues.every(issue => 
                             issue === 'No Issue' || 
                             issue === 'Partial Waive Off - Fixed Charge' || 
                             issue === 'Partial Waive Off - Tariff'
                           );

    if (!isBillingVisible && mode !== 'readonly') {
      billingSection.style.display = 'none';
      form.read_date.disabled = true;
      issueImgDiv.style.display = 'block';
    } else {
      billingSection.style.display = 'block';
      form.read_date.disabled = false;
      issueImgDiv.style.display = 'none';
      if (mode !== 'readonly') updateBilling();
    }
  }

  form.addEventListener('submit', function(e) {
    if (mode === 'readonly') return;
    e.preventDefault();
    if (!validateMeterReading()) return;
    const formData = new FormData();
    const submission = {};
    for (const [key, value] of new FormData(form)) {
      if (key !== 'issue_img' && key !== 'meter_image') {
        if (key === 'individual_issues') {
          submission[key] = submission[key] || [];
          submission[key].push(value);
        } else {
          submission[key] = value;
        }
      }
    }
    formData.append('submission', JSON.stringify(submission));
    if (form.issue_img.files[0]) formData.append('issue_img', form.issue_img.files[0]);
    if (form.meter_image.files[0]) formData.append('meter_image', form.meter_image.files[0]);

    const url = draftIndex !== null
      ? `/api/hh/${encodeURIComponent(customerId)}/submit?draft=${draftIndex}`
      : `/api/hh/${encodeURIComponent(customerId)}/submit`;

    fetch(url, {
      method: 'POST',
      body: formData
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (data.success) {
          window.location.href = `/hh-submissions.html?customer_id=${encodeURIComponent(customerId)}`;
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
    if (!validateMeterReading()) return;
    const formData = new FormData();
    const draft = {};
    for (const [key, value] of new FormData(form)) {
      if (key !== 'issue_img' && key !== 'meter_image') {
        if (key === 'individual_issues') {
          draft[key] = draft[key] || [];
          draft[key].push(value);
        } else {
          draft[key] = value;
        }
      }
    }
    formData.append('draft', JSON.stringify(draft));
    if (form.issue_img.files[0]) formData.append('issue_img', form.issue_img.files[0]);
    if (form.meter_image.files[0]) formData.append('meter_image', form.meter_image.files[0]);

    fetch(`/api/hh/${encodeURIComponent(customerId)}/draft`, {
      method: 'POST',
      body: formData
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (data.success) {
          window.location.href = `/hh-submissions.html?customer_id=${encodeURIComponent(customerId)}`;
        } else {
          alert('Draft save failed: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(error => {
        console.error('Draft save error:', error);
        alert('Error saving draft: ' + error.message);
      });
  });

  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = `/hh-submissions.html?customer_id=${encodeURIComponent(customerId)}`;
  });
});