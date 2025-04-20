document.addEventListener('DOMContentLoaded', () => {
  console.log('User Management: Script loaded');
  const role = localStorage.getItem('role');
  if (role !== 'spoc') {
    console.log('User Management: Access restricted, redirecting');
    alert('Access restricted to SPOC only!');
    window.location.href = '/index.html';
    return;
  }

  const username = localStorage.getItem('username');
  const usernameDisplay = document.getElementById('usernameDisplay');
  if (usernameDisplay && username) {
    usernameDisplay.textContent = username;
    console.log('User Management: Username set to', username);
  }

  const addUserBtn = document.getElementById('addUserBtn');
  const addUserFormDiv = document.getElementById('addUserForm');
  const addUserForm = document.getElementById('addUser');
  const tbody = document.querySelector('#userTable tbody');

  // Load user list
  function loadUsers() {
    console.log('User Management: Fetching /api/users');
    fetch('/api/users')
      .then(response => response.json())
      .then(users => {
        tbody.innerHTML = '';
        users.forEach(user => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${user.username}</td>
            <td class="password-cell">
              <span class="password" data-password="${user.password}">****</span>
              <button class="form-btn toggle-password">Show</button>
            </td>
            <td>${user.hamlet || 'N/A'}</td>
            <td><button class="remove-btn" data-username="${user.username}">Remove</button></td>
          `;
          tbody.appendChild(row);
        });

        // Add event listeners to toggle password visibility
        document.querySelectorAll('.toggle-password').forEach(btn => {
          btn.addEventListener('click', () => {
            const passwordSpan = btn.previousElementSibling;
            const realPassword = passwordSpan.getAttribute('data-password');
            if (passwordSpan.textContent === '****') {
              passwordSpan.textContent = realPassword;
              btn.textContent = 'Hide';
            } else {
              passwordSpan.textContent = '****';
              btn.textContent = 'Show';
            }
          });
        });

        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const username = btn.getAttribute('data-username');
            if (confirm(`Are you sure you want to remove user "${username}"?`)) {
              console.log('User Management: Removing user', username);
              fetch('/api/users/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
              })
                .then(response => response.json())
                .then(data => {
                  if (data.success) {
                    alert('User removed successfully');
                    loadUsers();
                  } else {
                    alert('Failed to remove user');
                  }
                })
                .catch(error => {
                  console.error('User Management: Error removing user:', error);
                  alert('Error removing user');
                });
            }
          });
        });
      })
      .catch(error => {
        console.error('User Management: Error fetching users:', error);
        alert('Error loading user list');
      });
  }

  // Initial load
  loadUsers();

  // Toggle Add User form
  addUserBtn.addEventListener('click', () => {
    const isHidden = addUserFormDiv.style.display === 'none';
    addUserFormDiv.style.display = isHidden ? 'block' : 'none';
    console.log('User Management: Add user form', isHidden ? 'shown' : 'hidden');
  });

  // Handle Add User form submission
  addUserForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = addUserForm.username.value;
    const password = addUserForm.password.value;
    const hamlet = addUserForm.hamlet.value;
    console.log('User Management: Adding user', username);
    fetch('/api/users/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, hamlet })
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('User added successfully');
          addUserForm.reset();
          addUserFormDiv.style.display = 'none';
          loadUsers();
        } else {
          alert('Failed to add user');
        }
      })
      .catch(error => {
        console.error('User Management: Error adding user:', error);
        alert('Error adding user');
      });
  });

  // Back button
  document.getElementById('backBtn').addEventListener('click', () => {
    console.log('User Management: Back to spoc-dashboard');
    window.location.href = '/spoc-dashboard.html';
  });

  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', () => {
    console.log('User Management: Logout clicked');
    localStorage.clear();
    window.location.href = '/index.html';
  });
});