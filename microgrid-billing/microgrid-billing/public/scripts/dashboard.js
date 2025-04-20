document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  const hamlet = localStorage.getItem('hamlet');

  // Redirect if not logged in
  if (!username || !role) {
    alert('Please log in first!');
    window.location.href = '/index.html';
    return;
  }

  // Display username
  document.getElementById('usernameDisplay').textContent = username;

  // Button event listeners
  const hhFormBtn = document.getElementById('hhFormBtn');
  const vecFormBtn = document.getElementById('vecFormBtn');
  const backBtn = document.getElementById('backBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const insuranceFormBtn = document.getElementById('insuranceFormBtn');

  hhFormBtn.addEventListener('click', () => {
    window.location.href = `/hh-list.html${hamlet ? '?hamlet=' + encodeURIComponent(hamlet) : ''}`;
  });

  vecFormBtn.addEventListener('click', () => {
    window.location.href = `/vec-submissions.html${hamlet ? '?hamlet=' + encodeURIComponent(hamlet) : ''}`;
  });

  insuranceFormBtn.addEventListener('click', () => {
    window.location.href = `/insurance-submissions.html${hamlet ? '?hamlet=' + encodeURIComponent(hamlet) : ''}`;
  });

  backBtn.addEventListener('click', () => {
    window.location.href = '/index.html';
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/index.html';
  });
});