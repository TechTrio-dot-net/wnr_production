/**
 * PM2 Ecosystem Configuration for Production
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      name: "wnr-backend",
      script: "./dist/server.js",
      instances: 2, // Use 2 instances for load balancing (or "max" for all CPUs)
      exec_mode: "cluster", // Cluster mode for better performance
      env: {
        NODE_ENV: "production",
        PORT: 5001,
      },
      // Production settings
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
      // Logging
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      // Memory management
      max_memory_restart: "500M",
      // Health check
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
};
