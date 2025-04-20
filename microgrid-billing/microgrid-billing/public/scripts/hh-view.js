const urlParams = new URLSearchParams(window.location.search);
const customer_id = urlParams.get('customer_id');
const index = parseInt(urlParams.get('index'), 10);

fetch('/api/hh/' + encodeURIComponent(customer_id))
  .then(response => {
    if (!response.ok) throw new Error('Fetch failed: ' + response.status);
    return response.json();
  })
  .then(data => {
    const submissions = data.submissions || [];
    const submission = submissions[index];
    if (!submission) {
      document.getElementById('submissionDetails').textContent = 'Submission not found.';
      return;
    }
    // Populate all fields
    document.querySelector('[name="state"]').value = submission.state || 'N/A';
    document.querySelector('[name="district"]').value = submission.district || 'N/A';
    document.querySelector('[name="block"]').value = submission.block || 'N/A';
    document.querySelector('[name="gp"]').value = submission.gp || 'N/A';
    document.querySelector('[name="village"]').value = submission.village || 'N/A';
    document.querySelector('[name="hamlet"]').value = submission.hamlet || 'N/A';
    document.querySelector('[name="vec_name"]').value = submission.vec_name || 'N/A';
    document.querySelector('[name="micro_id"]').value = submission.micro_id || 'N/A';
    document.querySelector('[name="hh_head"]').value = submission.hh_head || 'N/A';
    document.querySelector('[name="meter_num"]').value = submission.meter_num || 'N/A';
    document.querySelector('[name="customer_id"]').value = submission.customer_id || 'N/A';
    document.querySelector('[name="cust_gender"]').value = submission.cust_gender || 'N/A';
    document.querySelector('[name="read_date"]').value = submission.read_date || 'N/A';
    document.querySelector('[name="individual_issues"]').value = submission.individual_issues || 'N/A';
    document.querySelector('[name="bill_id"]').value = submission.bill_id || 'N/A';
    document.querySelector('[name="meter_read"]').value = submission.meter_read || 'N/A';
    document.querySelector('[name="prev_read"]').value = submission.prev_read || 'N/A';
    document.querySelector('[name="net_consumed"]').value = submission.net_consumed || 'N/A';
    document.querySelector('[name="current_bill"]').value = submission.current_bill || 'N/A';
    document.querySelector('[name="past_due"]').value = submission.past_due || 'N/A';
    document.querySelector('[name="total_due"]').value = submission.total_due || 'N/A';
    document.querySelector('[name="amount_paid"]').value = submission.amount_paid || 'N/A';
    document.querySelector('[name="amount_balance"]').value = submission.amount_balance || 'N/A';

    // Handle images
    if (submission.meter_image) {
      document.getElementById('meter_image').src = submission.meter_image;
    }
    if (submission.issue_img) {
      document.getElementById('issue_img').src = submission.issue_img;
      document.getElementById('issueImgDiv').style.display = 'block';
    }
  })
  .catch(error => {
    console.error('Fetch Error:', error);
    document.getElementById('submissionDetails').textContent = 'Error loading submission.';
  });

document.getElementById('backBtn').addEventListener('click', function() {
  window.location.href = '/hh.html?customer_id=' + customer_id;
});
document.getElementById('logoutBtn').addEventListener('click', function() {
  localStorage.clear();
  window.location.href = '/index.html';
});