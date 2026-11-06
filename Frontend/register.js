document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const alertMessage = document.getElementById('alertMessage');

  if (!registerForm) return;

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    alertMessage.textContent = '';
    alertMessage.style.color = '';

    try {
      // Adjust endpoint if your backend route differs (e.g., /api/users/register)
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      alertMessage.style.color = 'green';
      alertMessage.textContent = 'Registration successful! Please check your email to verify your account.';
      
      registerForm.reset();
    } catch (err) {
      alertMessage.style.color = 'red';
      alertMessage.textContent = err.message || 'An error occurred during registration.';
    }
  });
});
