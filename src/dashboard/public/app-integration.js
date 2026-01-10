/**
 * Integration Layer for Modern UI/UX Features
 * Connects the new theme, sidebar, and notification systems with existing app
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎨 Initializing Modern UI/UX...');

  // Initialize theme system (already initialized by theme.js)
  console.log('✅ Theme system initialized');

  // Initialize sidebar (already initialized by sidebar.js)
  console.log('✅ Sidebar system initialized');

  // Initialize notifications (already initialized by notifications.js)
  console.log('✅ Notification system initialized');

  // Sync header status with WebSocket status
  syncStatusIndicators();

  // Sync header metrics with dashboard metrics
  syncMetrics();

  // Setup notification listeners
  setupNotificationListeners();

  // Setup mobile menu overlay
  setupMobileMenu();

  console.log('🚀 Modern UI/UX Ready!');
});

/**
 * Sync status indicators between header and sidebar
 */
function syncStatusIndicators() {
  const sidebarStatus = document.getElementById('wsStatus');
  const sidebarStatusText = document.getElementById('wsStatusText');
  const headerStatus = document.getElementById('headerStatus');
  const headerStatusText = document.getElementById('headerStatusText');

  // Create a mutation observer to watch sidebar status changes
  if (sidebarStatus && headerStatus) {
    const observer = new MutationObserver(() => {
      const isConnected = sidebarStatus.classList.contains('connected');
      const statusText = sidebarStatusText ? sidebarStatusText.textContent : '';

      if (isConnected) {
        headerStatus.classList.add('online');
      } else {
        headerStatus.classList.remove('online');
      }

      if (headerStatusText) {
        headerStatusText.textContent = statusText;
      }
    });

    observer.observe(sidebarStatus, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Initial sync
    if (sidebarStatus.classList.contains('connected')) {
      headerStatus.classList.add('online');
    }
    if (headerStatusText && sidebarStatusText) {
      headerStatusText.textContent = sidebarStatusText.textContent;
    }
  }
}

/**
 * Sync metrics between dashboard and header
 */
function syncMetrics() {
  const dashboardBalance = document.getElementById('balance');
  const headerBalance = document.getElementById('headerBalance');
  const dashboardPnL = document.getElementById('pnl');
  const dashboardPnLPercent = document.getElementById('pnlPercent');
  const headerPnL = document.getElementById('headerPnL');

  if (!headerBalance || !headerPnL) return;

  // Update header when dashboard metrics change
  const updateHeader = () => {
    if (dashboardBalance) {
      headerBalance.textContent = dashboardBalance.textContent;
    }

    if (dashboardPnL && dashboardPnLPercent) {
      const pnlValue = dashboardPnL.textContent;
      const pnlPercent = dashboardPnLPercent.textContent;
      headerPnL.textContent = `${pnlValue} (${pnlPercent})`;

      // Apply color class
      headerPnL.classList.remove('positive', 'negative');
      if (dashboardPnL.textContent.includes('+') || dashboardPnL.textContent.startsWith('$')) {
        const value = parseFloat(pnlValue.replace(/[$,+]/g, ''));
        if (value > 0) {
          headerPnL.classList.add('positive');
        } else if (value < 0) {
          headerPnL.classList.add('negative');
        }
      }
    }
  };

  // Initial update
  updateHeader();

  // Watch for changes
  if (dashboardBalance) {
    const observer = new MutationObserver(updateHeader);
    observer.observe(dashboardBalance, { childList: true, characterData: true, subtree: true });
  }

  if (dashboardPnL) {
    const observer = new MutationObserver(updateHeader);
    observer.observe(dashboardPnL, { childList: true, characterData: true, subtree: true });
  }

  // Also update every 5 seconds as fallback
  setInterval(updateHeader, 5000);
}

/**
 * Setup notification listeners for trading events
 */
function setupNotificationListeners() {
  // Listen for WebSocket events and create notifications
  if (typeof window !== 'undefined' && window.addEventListener) {
    // Signal notifications
    window.addEventListener('signal', (event) => {
      if (event.detail && window.notificationCenter) {
        const signal = event.detail;
        window.notificationCenter.add({
          icon: signal.action === 'BUY' ? '📈' : signal.action === 'SELL' ? '📉' : '📊',
          title: `${signal.action} Signal`,
          message: `${signal.symbol} - ${signal.reason || 'New trading signal'}`,
        });
      }
    });

    // Position notifications
    window.addEventListener('positionOpened', (event) => {
      if (event.detail && window.notificationCenter) {
        const position = event.detail;
        window.notificationCenter.add({
          icon: '🟢',
          title: 'Position Opened',
          message: `${position.symbol} ${position.side} at $${position.entryPrice}`,
        });
      }
    });

    window.addEventListener('positionClosed', (event) => {
      if (event.detail && window.notificationCenter) {
        const position = event.detail;
        const pnl = position.pnl || 0;
        const icon = pnl > 0 ? '✅' : '❌';
        window.notificationCenter.add({
          icon,
          title: 'Position Closed',
          message: `${position.symbol} ${position.side} - PnL: ${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)}`,
        });
      }
    });

    // Alert notifications
    window.addEventListener('alert', (event) => {
      if (event.detail && window.notificationCenter) {
        const alert = event.detail;
        window.notificationCenter.add({
          icon: alert.type === 'warning' ? '⚠️' : alert.type === 'error' ? '❌' : 'ℹ️',
          title: alert.title || 'Alert',
          message: alert.message,
        });
      }
    });
  }
}

/**
 * Setup mobile menu overlay
 */
function setupMobileMenu() {
  // Create overlay element
  const overlay = document.createElement('div');
  overlay.className = 'mobile-overlay';
  document.body.appendChild(overlay);

  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');

  if (!sidebar || !sidebarToggle) return;

  // Toggle sidebar on mobile
  sidebarToggle.addEventListener('click', () => {
    if (window.innerWidth < 768) {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    }
  });

  // Close sidebar when clicking overlay
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });

  // Close sidebar when navigating
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      }
    });
  });
}

// Export functions for use in other modules
window.appIntegration = {
  syncStatusIndicators,
  syncMetrics,
  setupNotificationListeners,
};
