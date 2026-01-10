/**
 * Logout Handler
 * Handles user logout functionality
 */

(function() {
  // Find logout link
  const logoutLink = document.getElementById('logoutLink');

  if (logoutLink) {
    logoutLink.addEventListener('click', function(e) {
      e.preventDefault();

      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');

      // Call logout endpoint (optional, for server-side cleanup if needed)
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .finally(() => {
        // Redirect to login page
        window.location.href = '/login.html';
      });
    });
  }
})();
