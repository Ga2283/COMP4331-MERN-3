(() => {
  const API_BASE_URL = ''; // Same-origin API through nginx: /api/users/login
  const form = document.getElementById('loginForm');
  const alertBox = document.getElementById('alertMessage');
  const submitButton = document.getElementById('submitButton');

  function showMessage(message, type = 'error') {
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    alertBox.textContent = '';
    alertBox.className = 'alert';
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in…';

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const messages = {
          401: 'Invalid username or password.',
          403: 'Please verify your email address before logging in.'
        };
        throw new Error(messages[response.status] || data.error || 'Unable to log in. Please try again.');
      }
      if (!data.token || !data.user) {
        throw new Error('The server response was incomplete. Please try again.');
      }

      // The API returns a one-day JWT and the authenticated user's public data.
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      showMessage('Login successful. Redirecting…', 'success');
      window.location.assign('user.html');
    } catch (error) {
      showMessage(error.message || 'Could not connect to the server. Please try again.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Log In';
    }
  });
})();
