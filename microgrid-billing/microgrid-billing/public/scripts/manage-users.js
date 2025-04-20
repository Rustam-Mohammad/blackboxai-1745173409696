if (localStorage.getItem('role') !== 'spoc') {
  alert('Access denied: Only SPOCs can view this page.');
  window.location.href = '/index.html';
}

function loadUsers() {
  fetch('/api/users')
    .then(response => response.json())
    .then(users => {
      const tbody = document.querySelector('#userTable tbody');
      tbody.innerHTML = '';
      users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${user.username}</td>
          <td>${user.hamlet}</td>
          <td><button class="remove-btn" data-username="${user.username}">Remove</button></td>
        `;
        tbody.appendChild(row);
      });

      document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const username = btn.dataset.username;
          if (confirm(`Remove operator ${username}?`)) {
            fetch('/api/users/remove', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username })
            })
              .then(response => response.json())
              .then(data => {
                if (data.success) loadUsers();
                else alert('Failed to remove user');
              });
          }
        });
      });
    });
}

document.getElementById('addUserForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.querySelector('[name="username"]').value;
  const password = document.querySelector('[name="password"]').value;
  const hamlet = document.querySelector('[name="hamlet"]').value;

  fetch('/api/users/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, hamlet })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        loadUsers();
        e.target.reset();
      } else {
        alert('Failed to add user');
      }
    });
});

document.getElementById('backBtn').addEventListener('click', () => {
  window.location.href = '/spoc-dashboard.html';
});

loadUsers();