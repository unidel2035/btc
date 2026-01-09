/**
 * Dashboard Example
 *
 * Demonstrates how to use the dashboard server and API
 */

import { DashboardServer } from '../src/dashboard/server.js';

console.log('🚀 Dashboard Example\n');
console.log('This example demonstrates the dashboard server functionality.\n');

// Start the dashboard server
console.log('Starting dashboard server...\n');

const server = new DashboardServer(8080, '0.0.0.0');
server.start();

console.log('\n📝 Available features:');
console.log('  - Dashboard overview with key metrics');
console.log('  - Real-time signals feed');
console.log('  - Position management (view, close, update SL/TP)');
console.log('  - News feed with sentiment analysis');
console.log('  - Analytics and performance reports');
console.log('  - Settings management');
console.log('  - WebSocket real-time updates\n');

console.log('🌐 Access the dashboard at: http://localhost:8080\n');
console.log('📡 WebSocket endpoint: ws://localhost:8080\n');

console.log('🛠️  API Endpoints:');
console.log('  GET  /api/health              - Health check');
console.log('  GET  /api/dashboard           - Dashboard overview');
console.log('  GET  /api/signals             - Get signals');
console.log('  GET  /api/positions           - Get open positions');
console.log('  GET  /api/positions/history   - Get position history');
console.log('  POST /api/positions/:id/close - Close a position');
console.log('  POST /api/positions/:id/update - Update position SL/TP');
console.log('  GET  /api/news                - Get news feed');
console.log('  GET  /api/settings            - Get settings');
console.log('  POST /api/settings            - Update settings');
console.log('  GET  /api/analytics/performance - Get performance metrics');
console.log('  GET  /api/analytics/strategies  - Get strategy stats');
console.log('  GET  /api/analytics/trades      - Get trade journal\n');

console.log('💡 Tips:');
console.log('  - The dashboard uses mock data for demonstration');
console.log('  - WebSocket updates occur every 5 seconds for prices and positions');
console.log('  - News updates broadcast every 30 seconds');
console.log('  - All pages are responsive and work on mobile devices\n');

console.log('Press Ctrl+C to stop the server\n');
