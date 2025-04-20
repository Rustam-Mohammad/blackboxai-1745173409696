document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const passwordInput = document.getElementById('passwordInput');
  const passwordToggle = document.getElementById('passwordToggle');

  if (!loginForm || !passwordInput || !passwordToggle) {
    console.error('Login page elements missing:', {
      loginForm: !!loginForm,
      passwordInput: !!passwordInput,
      passwordToggle: !!passwordToggle
    });
    return;
  }

  // Handle login submission
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = passwordInput.value;

    console.log('Submitting login:', { username, password: '[hidden]' });

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(response => {
        console.log('Login response status:', response.status);
        if (!response.ok) throw new Error('Login failed: ' + response.status);
        return response.json();
      })
      .then(data => {
        console.log('Login response data:', data);
        if (data.success) {
          localStorage.setItem('username', data.username);
          localStorage.setItem('role', data.role);
          localStorage.setItem('hamlet', data.hamlet || '');
          console.log('Login data stored:', { username: data.username, role: data.role, hamlet: data.hamlet });
          window.location.href = data.role === 'spoc' ? '/spoc-dashboard.html' : '/dashboard.html';
        } else {
          alert('Login failed: ' + data.error);
          console.error('Login failed:', data.error);
        }
      })
      .catch(error => {
        console.error('Error during login:', error.message);
        alert('Error during login: ' + error.message);
      });
  });

  // Toggle password visibility
  passwordToggle.addEventListener('click', () => {
    const isVisible = passwordInput.type === 'text';
    passwordInput.type = isVisible ? 'password' : 'text';
    passwordToggle.textContent = isVisible ? '👁️' : '👁️‍🗨️';
    console.log('Password visibility toggled:', passwordInput.type);
  });
});