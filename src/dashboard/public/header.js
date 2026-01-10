// Modern Top Header Functionality

// State
const headerState = {
  notifications: [],
  unreadCount: 0,
  balance: 0,
  todayPnL: 0,
  todayPnLPercent: 0,
  systemStatus: 'connecting', // connecting, live, paper, warning, error, stopped
  theme: localStorage.getItem('theme') || 'dark',
};

// Initialize Header
function initializeHeader() {
  setupSidebarToggle();
  setupNotifications();
  setupThemeSwitcher();
  setupUserMenu();
  setupQuickActions();
  setupStatusIndicator();

  // Update header data every 5 seconds
  setInterval(updateHeaderData, 5000);

  // Initialize theme
  applyTheme(headerState.theme);
}

// Sidebar Toggle
function setupSidebarToggle() {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      sidebar.classList.toggle('show');
    });
  }
}

// Notifications
function setupNotifications() {
  const notificationBtn = document.getElementById('notificationBtn');
  const notificationDropdown = document.getElementById('notificationDropdown');
  const markAllReadBtn = document.getElementById('markAllReadBtn');

  if (notificationBtn && notificationDropdown) {
    notificationBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notificationDropdown.style.display = notificationDropdown.style.display === 'none' ? 'block' : 'none';

      // Close user menu if open
      const userDropdown = document.getElementById('userDropdown');
      if (userDropdown) userDropdown.style.display = 'none';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!notificationBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
        notificationDropdown.style.display = 'none';
      }
    });
  }

  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', () => {
      markAllNotificationsRead();
    });
  }
}

function addNotification(notification) {
  headerState.notifications.unshift(notification);
  if (!notification.read) {
    headerState.unreadCount++;
  }
  updateNotificationUI();
}

function markAllNotificationsRead() {
  headerState.notifications.forEach(n => n.read = true);
  headerState.unreadCount = 0;
  updateNotificationUI();
}

function updateNotificationUI() {
  const badge = document.getElementById('notificationBadge');
  const list = document.getElementById('notificationList');

  if (badge) {
    if (headerState.unreadCount > 0) {
      badge.style.display = 'block';
      badge.textContent = headerState.unreadCount > 99 ? '99+' : headerState.unreadCount;
    } else {
      badge.style.display = 'none';
    }
  }

  if (list) {
    if (headerState.notifications.length === 0) {
      list.innerHTML = '<p class="no-notifications" data-i18n="header.noNotifications">No new notifications</p>';
    } else {
      list.innerHTML = headerState.notifications.slice(0, 10).map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
          <div class="notification-title">${escapeHtml(n.title)}</div>
          <div class="notification-message">${escapeHtml(n.message)}</div>
          <div class="notification-time">${formatTimestamp(n.timestamp)}</div>
        </div>
      `).join('');

      // Add click handlers
      list.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.id;
          const notification = headerState.notifications.find(n => n.id === id);
          if (notification && !notification.read) {
            notification.read = true;
            headerState.unreadCount--;
            updateNotificationUI();
          }
        });
      });
    }
  }
}

// Theme Switcher
function setupThemeSwitcher() {
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');

  if (themeToggle && themeIcon) {
    themeToggle.addEventListener('click', () => {
      headerState.theme = headerState.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', headerState.theme);
      applyTheme(headerState.theme);
    });
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  const themeIcon = document.getElementById('themeIcon');

  if (theme === 'light') {
    root.style.setProperty('--bg-primary', '#ffffff');
    root.style.setProperty('--bg-secondary', '#f7fafc');
    root.style.setProperty('--bg-tertiary', '#edf2f7');
    root.style.setProperty('--text-primary', '#1a202c');
    root.style.setProperty('--text-secondary', '#4a5568');
    root.style.setProperty('--border', '#e2e8f0');
    if (themeIcon) themeIcon.textContent = '☀️';
  } else {
    root.style.setProperty('--bg-primary', '#0a0e27');
    root.style.setProperty('--bg-secondary', '#141932');
    root.style.setProperty('--bg-tertiary', '#1e2442');
    root.style.setProperty('--text-primary', '#ffffff');
    root.style.setProperty('--text-secondary', '#a0aec0');
    root.style.setProperty('--border', '#2d3748');
    if (themeIcon) themeIcon.textContent = '🌙';
  }
}

// User Menu
function setupUserMenu() {
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userDropdown = document.getElementById('userDropdown');
  const logoutLink = document.getElementById('logoutLink');
  const profileLink = document.getElementById('profileLink');

  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';

      // Close notification dropdown if open
      const notificationDropdown = document.getElementById('notificationDropdown');
      if (notificationDropdown) notificationDropdown.style.display = 'none';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.style.display = 'none';
      }
    });
  }

  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to logout?')) {
        // Implement logout functionality
        console.log('Logout clicked');
      }
    });
  }

  if (profileLink) {
    profileLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Profile clicked');
    });
  }
}

// Quick Actions
function setupQuickActions() {
  const newPositionBtn = document.getElementById('newPositionBtn');
  const closeAllBtn = document.getElementById('closeAllBtn');
  const pauseTradingBtn = document.getElementById('pauseTradingBtn');

  if (newPositionBtn) {
    newPositionBtn.addEventListener('click', () => {
      console.log('New position clicked');
      // Navigate to positions page or open modal
      const event = new CustomEvent('openNewPosition');
      window.dispatchEvent(event);
    });
  }

  if (closeAllBtn) {
    closeAllBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to close all positions?')) {
        console.log('Close all clicked');
        // Implement close all positions
        const event = new CustomEvent('closeAllPositions');
        window.dispatchEvent(event);
      }
    });
  }

  if (pauseTradingBtn) {
    pauseTradingBtn.addEventListener('click', () => {
      console.log('Pause trading clicked');
      // Toggle trading pause
      const event = new CustomEvent('toggleTradingPause');
      window.dispatchEvent(event);
    });
  }
}

// Status Indicator
function setupStatusIndicator() {
  updateSystemStatus('connecting');
}

function updateSystemStatus(status) {
  headerState.systemStatus = status;
  const indicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');

  if (indicator) {
    indicator.className = 'status-indicator ' + status;
  }

  if (statusText) {
    const statusMap = {
      connecting: 'status.connecting',
      live: 'status.live',
      paper: 'status.paper',
      warning: 'status.warning',
      error: 'status.error',
      stopped: 'status.stopped'
    };

    const key = statusMap[status] || 'status.connecting';
    if (typeof i18next !== 'undefined' && i18next.t) {
      statusText.textContent = i18next.t(key);
    } else {
      // Fallback text
      const fallback = {
        connecting: 'Connecting...',
        live: '✅ Live Trading',
        paper: '⏸️ Paper Trading',
        warning: '⚠️ Warning',
        error: '❌ Error',
        stopped: '⏹️ Stopped'
      };
      statusText.textContent = fallback[status] || 'Connecting...';
    }
  }
}

// Update Header Data
function updateHeaderData() {
  // This will be called from app.js when state updates
  updateBalance(headerState.balance);
  updatePnL(headerState.todayPnL, headerState.todayPnLPercent);
}

function updateBalance(balance) {
  headerState.balance = balance;
  const balanceElement = document.getElementById('headerBalance');
  if (balanceElement) {
    balanceElement.textContent = '$' + balance.toFixed(2);
  }
}

function updatePnL(pnl, percent) {
  headerState.todayPnL = pnl;
  headerState.todayPnLPercent = percent;

  const pnlElement = document.getElementById('headerPnL');
  const pnlPercentElement = document.getElementById('headerPnLPercent');

  if (pnlElement) {
    pnlElement.textContent = (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2);
    pnlElement.className = 'pnl-value ' + (pnl >= 0 ? 'positive' : 'negative');
  }

  if (pnlPercentElement) {
    pnlPercentElement.textContent = '(' + (percent >= 0 ? '+' : '') + percent.toFixed(2) + '%)';
  }
}

// Utility Functions
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) { // Less than 1 minute
    return 'Just now';
  } else if (diff < 3600000) { // Less than 1 hour
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diff < 86400000) { // Less than 1 day
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Expose functions globally for integration with app.js
window.headerState = headerState;
window.updateSystemStatus = updateSystemStatus;
window.updateBalance = updateBalance;
window.updatePnL = updatePnL;
window.addNotification = addNotification;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeHeader);
} else {
  initializeHeader();
}
