document.addEventListener('DOMContentLoaded', () => {
  console.log('SPOC Dashboard: Script loaded at', new Date().toISOString());

  // Authentication check
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  if (!username || !role || role !== 'spoc') {
    console.log('SPOC Dashboard: Invalid login, redirecting to /index.html');
    alert('Please log in as SPOC!');
    window.location.href = '/index.html';
    return;
  }

  // Set username display
  const usernameDisplay = document.getElementById('usernameDisplay');
  if (usernameDisplay) {
    usernameDisplay.textContent = username;
    console.log('SPOC Dashboard: Username set to', username);
  } else {
    console.error('SPOC Dashboard: usernameDisplay element not found');
  }

  // Logout button handler
  function attachLogoutHandler(btn) {
    console.log('SPOC Dashboard: Attaching logout handler');
    btn.addEventListener('click', () => {
      console.log('SPOC Dashboard: Logout button clicked');
      try {
        localStorage.clear();
        console.log('SPOC Dashboard: localStorage cleared');
        console.log('SPOC Dashboard: Redirecting to /index.html');
        window.location.href = '/index.html';
      } catch (error) {
        console.error('SPOC Dashboard: Logout error:', error);
        alert('Error logging out. Please try again.');
      }
    });
  }

  // Try to find logout button
  let logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    console.log('SPOC Dashboard: Logout button found immediately');
    attachLogoutHandler(logoutBtn);
  } else {
    console.warn('SPOC Dashboard: logoutBtn not found, starting poll');
    let attempts = 0;
    const maxAttempts = 10; // 5s
    const pollInterval = setInterval(() => {
      logoutBtn = document.getElementById('logoutBtn');
      attempts++;
      if (logoutBtn) {
        console.log('SPOC Dashboard: Logout button found after', attempts, 'attempts');
        clearInterval(pollInterval);
        attachLogoutHandler(logoutBtn);
      } else if (attempts >= maxAttempts) {
        console.error('SPOC Dashboard: Gave up finding logoutBtn after 5s');
        clearInterval(pollInterval);
      }
    }, 500);
  }
});