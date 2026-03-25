/**
 * 🛡️ PM2 Ecosystem Configuration — PRN-Vigilante
 *
 * Garante que o Worker nunca morra.
 * PM2 reinicia automaticamente em caso de:
 * - Crash fatal
 * - Uso excessivo de memória (> 512MB)
 * - Saída inesperada do processo
 *
 * Para usar:
 *   npm install -g pm2
 *   pm2 start ecosystem.config.js
 *   pm2 monit  (monitorar)
 *   pm2 logs   (ver logs)
 */

module.exports = {
  apps: [
    {
      name: 'prn-worker',
      script: 'automation/src/index.ts',
      interpreter: 'bun',

      // ── Resiliência ──
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      max_memory_restart: '512M',

      // ── Ambiente ──
      cwd: __dirname,
      env_file: 'automation/.env',

      // ── Logs ──
      error_file: 'logs/worker-error.log',
      out_file: 'logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // ── Monitoramento ──
      watch: false,
      kill_timeout: 10000,

      // ── Circuit Breaker ──
      exp_backoff_restart_delay: 1000,
    },
  ],
}
