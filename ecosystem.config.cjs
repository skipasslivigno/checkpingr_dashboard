// PM2 process definition for the API server on the VPS.
// Used by scripts/deploy.sh so the deploy script does not need to remember
// pm2's CLI flags — `pm2 startOrReload ecosystem.config.cjs` is idempotent
// (starts the process on first deploy, reloads it on every deploy after).
//
// Requires /opt/skiarea/.env.production to exist (see DEPLOY.md, step 3).
module.exports = {
  apps: [
    {
      name: "api-server",
      script: "artifacts/api-server/dist/index.mjs",
      cwd: "/opt/skiarea",
      node_args: "--enable-source-maps",
      env_file: "/opt/skiarea/.env.production",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
