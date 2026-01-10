module.exports = {
  apps: [
    {
      name: 'btc-telegram-bot',
      script: './node_modules/.bin/tsx',
      args: 'examples/telegram-bot-example.ts',
      cwd: '/home/hive/btc',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/telegram-bot-error.log',
      out_file: 'logs/telegram-bot-out.log',
      log_file: 'logs/telegram-bot-combined.log',
      time: true,
      merge_logs: true,
    },
  ],
};
