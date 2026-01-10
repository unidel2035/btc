/**
 * Notification Center System
 * Handles notification dropdown, badges, and real-time updates
 */

class NotificationCenter {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.isOpen = false;
    this.maxNotifications = 50;
    this.init();
  }

  /**
   * Initialize notification center
   */
  init() {
    // Load notifications from localStorage
    this.loadNotifications();

    // Setup dropdown toggle
    this.setupToggle();

    // Setup click outside to close
    this.setupClickOutside();

    // Update UI
    this.updateUI();
  }

  /**
   * Load notifications from localStorage
   */
  loadNotifications() {
    try {
      const saved = localStorage.getItem('notifications');
      if (saved) {
        this.notifications = JSON.parse(saved);
        this.updateUnreadCount();
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  /**
   * Save notifications to localStorage
   */
  saveNotifications() {
    try {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }

  /**
   * Add a new notification
   */
  add(notification) {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    };

    this.notifications.unshift(newNotification);

    // Limit total notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    this.updateUnreadCount();
    this.saveNotifications();
    this.updateUI();

    // Show badge animation
    this.animateBadge();

    return newNotification;
  }

  /**
   * Mark notification as read
   */
  markAsRead(id) {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      this.updateUnreadCount();
      this.saveNotifications();
      this.updateUI();
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    this.notifications.forEach((n) => (n.read = true));
    this.updateUnreadCount();
    this.saveNotifications();
    this.updateUI();
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications = [];
    this.unreadCount = 0;
    this.saveNotifications();
    this.updateUI();
  }

  /**
   * Update unread count
   */
  updateUnreadCount() {
    this.unreadCount = this.notifications.filter((n) => !n.read).length;
  }

  /**
   * Update UI
   */
  updateUI() {
    this.updateBadge();
    this.renderNotifications();
  }

  /**
   * Update badge
   */
  updateBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  /**
   * Animate badge
   */
  animateBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
      badge.classList.add('pulse-animation');
      setTimeout(() => badge.classList.remove('pulse-animation'), 600);
    }
  }

  /**
   * Render notifications list
   */
  renderNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;

    if (this.notifications.length === 0) {
      container.innerHTML = `
        <div class="notification-empty">
          <p>No notifications</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.notifications
      .slice(0, 10) // Show only recent 10
      .map((notif) => this.renderNotification(notif))
      .join('');

    // Add click handlers
    container.querySelectorAll('.notification-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = parseFloat(item.dataset.id);
        this.markAsRead(id);
      });
    });
  }

  /**
   * Render single notification
   */
  renderNotification(notif) {
    const timeAgo = this.getTimeAgo(notif.timestamp);
    const unreadClass = notif.read ? '' : 'unread';

    return `
      <div class="notification-item ${unreadClass}" data-id="${notif.id}">
        <span class="notification-icon">${notif.icon || '🔔'}</span>
        <div class="notification-content">
          <div class="notification-title">${notif.title}</div>
          <div class="notification-message">${notif.message}</div>
          <div class="notification-time">${timeAgo}</div>
        </div>
      </div>
    `;
  }

  /**
   * Get time ago string
   */
  getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return time.toLocaleDateString();
  }

  /**
   * Setup dropdown toggle
   */
  setupToggle() {
    const toggleBtn = document.getElementById('notificationToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });
    }

    // Mark all as read button
    const markAllBtn = document.getElementById('markAllRead');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.markAllAsRead();
      });
    }
  }

  /**
   * Toggle dropdown
   */
  toggle() {
    this.isOpen = !this.isOpen;
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
      dropdown.style.display = this.isOpen ? 'block' : 'none';
    }
  }

  /**
   * Setup click outside to close
   */
  setupClickOutside() {
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('notificationDropdown');
      const toggle = document.getElementById('notificationToggle');

      if (
        this.isOpen &&
        dropdown &&
        !dropdown.contains(e.target) &&
        e.target !== toggle &&
        !toggle.contains(e.target)
      ) {
        this.isOpen = false;
        dropdown.style.display = 'none';
      }
    });
  }
}

// Initialize notification center
const notificationCenter = new NotificationCenter();

// Export for use in other modules
window.notificationCenter = notificationCenter;
