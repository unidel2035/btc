/**
 * Modern UI Components Library
 * Trading Bot Dashboard - Reusable UI Components
 *
 * This library provides 10 modern, accessible UI components:
 * 1. Card - Flexible card containers with variants
 * 2. Button - Interactive buttons with ripple effects
 * 3. Badge - Status badges for visual indicators
 * 4. Modal - Dialog modals with animations
 * 5. Tooltip - Contextual tooltips
 * 6. Table - Sortable data tables
 * 7. Skeleton - Loading placeholders
 * 8. Progress - Progress bars and indicators
 * 9. Input - Form inputs with validation
 * 10. Tabs - Tabbed navigation
 *
 * @module ui-components
 */

// Component imports
export { Card, createCard } from './Card.js';
export { Button, createButton } from './Button.js';
export { Badge, createBadge } from './Badge.js';
export { Modal, createModal } from './Modal.js';
export { Tooltip, createTooltip } from './Tooltip.js';
export { Table, createTable } from './Table.js';
export { Skeleton, createSkeleton } from './Skeleton.js';
export { Progress, createProgress } from './Progress.js';
export { Input, createInput } from './Input.js';
export { Tabs, createTabs } from './Tabs.js';

/**
 * Component factory - creates any component by type
 * @param {string} type - Component type
 * @param {Object} options - Component options
 * @returns {HTMLElement}
 */
export function createComponent(type, options) {
  const factories = {
    card: createCard,
    button: createButton,
    badge: createBadge,
    modal: createModal,
    tooltip: createTooltip,
    table: createTable,
    skeleton: createSkeleton,
    progress: createProgress,
    input: createInput,
    tabs: createTabs,
  };

  const factory = factories[type.toLowerCase()];

  if (!factory) {
    throw new Error(`Unknown component type: ${type}`);
  }

  return factory(options);
}

/**
 * Initialize UI components library
 * Loads CSS files and sets up global configurations
 */
export function initUIComponents() {
  // Check if styles are already loaded
  if (document.getElementById('ui-components-styles')) {
    return;
  }

  // Load animations CSS
  const animationsLink = document.createElement('link');
  animationsLink.id = 'ui-animations-styles';
  animationsLink.rel = 'stylesheet';
  animationsLink.href = '/styles/animations.css';
  document.head.appendChild(animationsLink);

  // Load components CSS
  const componentsLink = document.createElement('link');
  componentsLink.id = 'ui-components-styles';
  componentsLink.rel = 'stylesheet';
  componentsLink.href = '/styles/components.css';
  document.head.appendChild(componentsLink);

  console.log('UI Components library initialized');
}

/**
 * Version info
 */
export const version = '1.0.0';

/**
 * Default export - library object
 */
export default {
  Card,
  Button,
  Badge,
  Modal,
  Tooltip,
  Table,
  Skeleton,
  Progress,
  Input,
  Tabs,
  createCard,
  createButton,
  createBadge,
  createModal,
  createTooltip,
  createTable,
  createSkeleton,
  createProgress,
  createInput,
  createTabs,
  createComponent,
  initUIComponents,
  version,
};
