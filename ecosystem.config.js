module.exports = {
  apps: [
    {
      name: 'forestinventory',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/forestinventory',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/root/.pm2/logs/forestinventory-error.log',
      out_file: '/root/.pm2/logs/forestinventory-out.log',
    },
  ],
}
