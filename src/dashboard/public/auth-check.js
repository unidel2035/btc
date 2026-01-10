/**
 * Authentication Check Script
 * Runs on dashboard page load to verify user is authenticated
 */

(function() {
  // Check if user is authenticated
  const token = localStorage.getItem('authToken');

  if (!token) {
    // No token, redirect to login
    window.location.href = '/login.html';
    return;
  }

  // Verify token with server
  fetch('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Invalid token');
    }
    return response.json();
  })
  .then(data => {
    // Token is valid, update UI with user info
    const user = data.user;

    // Update user dropdown with real user data
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement) {
      userNameElement.textContent = user.fullName || user.username;
    }

    const userEmailElement = document.querySelector('.user-email');
    if (userEmailElement) {
      userEmailElement.textContent = user.email || '';
    }

    // Store user data in session
    window.currentUser = user;

    console.log('✅ User authenticated:', user.username);
  })
  .catch(error => {
    // Token is invalid or expired
    console.error('Authentication failed:', error);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  });
})();
