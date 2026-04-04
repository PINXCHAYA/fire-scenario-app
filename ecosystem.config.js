module.exports = {
  apps: [
    {
      name: 'fire-scenario-app',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        ADMIN_KEY: 'change-this-admin-key-before-production',
        TRUST_PROXY: 'true'
      }
    }
  ]
};
