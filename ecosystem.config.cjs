module.exports = {
  apps: [
    {
      name: "flb-backend",
      cwd: "./backend",
      script: "server.js",
      instances: 1,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3002
      }
    },
    {
      name: "flb-frontend",
      cwd: ".",
      script: "npx",
      args: "vite --port 3465 --host",
      instances: 1,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
