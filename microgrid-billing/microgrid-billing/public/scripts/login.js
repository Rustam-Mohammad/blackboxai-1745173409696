document.getElementById('loginBtn').addEventListener('click', function() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      localStorage.setItem('user', JSON.stringify({ username: data.username, role: data.role }));
      window.location.href = '/dashboard.html';
    } else {
      alert('Login failed!');
    }
  });
});