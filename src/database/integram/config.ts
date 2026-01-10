/**
 * Integram Database Configuration
 * Configuration for connecting to Integram cloud database
 */

export const INTEGRAM_CONFIG = {
  serverUrl: process.env.INTEGRAM_URL || 'https://интеграм.рф',
  database: process.env.INTEGRAM_DATABASE || 'bts',
  login: process.env.INTEGRAM_LOGIN || 'd',
  password: process.env.INTEGRAM_PASSWORD || 'd',
};
