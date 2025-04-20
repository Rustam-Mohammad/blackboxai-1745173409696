document.addEventListener('DOMContentLoaded', () => {
  const role = localStorage.getItem('role');
  if (role !== 'spoc') {
    alert('Access restricted to SPOC only!');
    window.location.href = '/index.html';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const customerId = urlParams.get('customer_id');
  const subIndex = parseInt(urlParams.get('subIndex'));
  const form = document.getElementById('hhForm');
  const submitBtn = document.getElementById('submitBtn');

  function checkSubmissionLimit() {
    const readDate = form.read_date.value;
    if (!readDate) return;
    const submissionMonth = readDate.slice(0, 7);
    fetch(`/api/hh/${encodeURIComponent(customerId)}`)
      .then(res => res.json())
      .then(data => {
        const submissions = data.submissions || [];
        const otherSubmissions = submissions.filter((_, idx) => idx !== subIndex);
        const hasSubmission = otherSubmissions.some(sub => sub.read_date && sub.read_date.slice(0, 7) === submissionMonth);
        if (hasSubmission) {
          submitBtn.disabled = true;
          alert('A submission for this month already exists.');
        } else {
          submitBtn.disabled = false;
        }
      })
      .catch(error => console.error('Error checking submission limit:', error));
  }

  function validateMeterReading(showAlert = true) {
    const selectedIssues = Array.from(form.individual_issues.selectedOptions).map(opt => opt.value);
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

  function loadSubmission() {
    fetch(`/api/hh/${encodeURIComponent(customerId)}`)
      .then(res => res.json())
      .then(data => {
        if (!data.submissions || subIndex < 0 || subIndex >= data.submissions.length) {
          alert('Submission not found');
          window.location.href = '/edit-entries.html';
          return;
        }
        const submission = data.submissions[subIndex];
        form.customer_id.value = customerId;
        form.hamlet.value = data.hamlet || 'Saraipani';
        form.vec_name.value = data.vec_name || 'Prakash Saur Oorja Samiti';
        form.micro_id.value = data.microgrid_id || 'MG-SARAIPANI';
        form.hh_head.value = data.hh_name || '';
        form.meter_num.value = data.meter_num || 'M12345';
        form.cust_gender.value = data.cust_gender || 'Male';
        form.read_date.value = submission.read_date || '';
        const issueSelect = form.individual_issues;
        Array.from(issueSelect.options).forEach(option => {
          option.selected = submission.individual_issues && submission.individual_issues.includes(option.value);
        });
        updateBillingSection();
        if (submission.individual_issues && submission.individual_issues.length && !submission.individual_issues.includes('No Issue')) {
          document.getElementById('issueImgDiv').style.display = 'block';
        }
        form.bill_id.value = submission.bill_id || '';
        form.meter_read.value = submission.meter_read || '';
        form.prev_read.value = submission.prev_read || '';
        form.net_consumed.value = submission.net_consumed || '';
        form.current_bill.value = submission.current_bill || '';
        form.past_due.value = submission.past_due || '';
        form.total_due.value = submission.total_due || '';
        form.amount_paid.value = submission.amount_paid || '';
        form.amount_balance.value = submission.amount_balance || '';
        checkSubmissionLimit();
      })
      .catch(error => {
        console.error('Error loading submission:', error);
        alert('Error loading submission');
      });
  }

  function updateBillingSection() {
    const selectedIssues = Array.from(form.individual_issues.selectedOptions).map(opt => opt.value);
    const billingSection = document.getElementById('billingSection');
    if (selectedIssues.includes('Migrated') || selectedIssues.includes('Wave off')) {
      billingSection.style.display = 'none';
      form.meter_read.required = false;
      form.amount_paid.required = false;
    } else {
      billingSection.style.display = 'block';
      form.meter_read.required = true;
      form.amount_paid.required = true;
    }
    calculateFields();
  }

  function calculateFields() {
    const selectedIssues = Array.from(form.individual_issues.selectedOptions).map(opt => opt.value);
    const meterRead = parseFloat(form.meter_read.value) || 0;
    const prevRead = parseFloat(form.prev_read.value) || 0;
    const netConsumed = meterRead >= prevRead ? meterRead - prevRead : 0;
    form.net_consumed.value = netConsumed.toFixed(1);

    let currentBill = 0;
    if (!selectedIssues.includes('Migrated') && !selectedIssues.includes('Wave off')) {
      if (selectedIssues.includes('Partial Waive Off - Fixed Charge')) {
        currentBill = netConsumed * 10;
      } else if (selectedIssues.includes('Partial Waive Off - Tariff')) {
        currentBill = 100;
      } else {
        currentBill = netConsumed * 10 + 100;
      }
    }
    form.current_bill.value = currentBill.toFixed(2);

    const pastDue = parseFloat(form.past_due.value) || 0;
    const totalDue = currentBill + pastDue;
    form.total_due.value = totalDue.toFixed(2);

    const amountPaid = parseFloat(form.amount_paid.value) || 0;
    form.amount_balance.value = (totalDue - amountPaid).toFixed(2);
  }

  form.meter_read.addEventListener('blur', () => {
    validateMeterReading();
    calculateFields();
  });
  form.prev_read.addEventListener('input', calculateFields);
  form.past_due.addEventListener('input', calculateFields);
  form.amount_paid.addEventListener('input', calculateFields);
  form.read_date.addEventListener('change', checkSubmissionLimit);
  form.individual_issues.addEventListener('change', updateBillingSection);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateMeterReading()) return;
    const formData = new FormData(form);
    const submission = {};
    formData.forEach((value, key) => {
      if (key === 'individual_issues') {
        submission[key] = Array.from(form.individual_issues.selectedOptions).map(opt => opt.value);
      } else if (key !== 'issue_img' && key !== 'meter_image') {
        submission[key] = value;
      }
    });

    fetch(`/api/hh/${encodeURIComponent(customerId)}/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subIndex, ...submission })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Submission updated successfully');
          window.location.href = '/edit-entries.html';
        } else {
          alert('Failed to update submission: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(error => {
        console.error('Error updating submission:', error);
        alert('Error updating submission');
      });
  });

  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = '/edit-entries.html';
  });

  loadSubmission();
});