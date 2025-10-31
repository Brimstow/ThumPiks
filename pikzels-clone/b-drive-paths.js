// B-Drive Service Paths Configuration
// Hardcoded paths for B drive installations

const B_DRIVE_PATHS = {
  // PostgreSQL
  POSTGRES_BIN: "B:\\Thumbnail_maker\\database\\postgresql\\bin\\postgres.exe",
  PSQL_BIN: "B:\\Thumbnail_maker\\database\\postgresql\\bin\\psql.exe", 
  PG_CTL_BIN: "B:\\Thumbnail_maker\\database\\postgresql\\bin\\pg_ctl.exe",
  POSTGRES_DATA_DIR: "B:\\Thumbnail_maker\\database\\postgresql\\data",
  
  // Redis (Updated to 5.0.14.1)
  REDIS_SERVER: "B:\\Thumbnail_maker\\database\\redis\\redis-server.exe",
  REDIS_CLI: "B:\\Thumbnail_maker\\database\\redis\\redis-cli.exe",
  
  // Project
  PROJECT_ROOT: "B:\\Thumbnail_maker\\pikzels-clone",
  CLIENT_DIR: "B:\\Thumbnail_maker\\pikzels-clone\\client",
  
  // Ports
  POSTGRES_PORT: 8565,
  REDIS_PORT: 8520,
  BACKEND_PORT: 8550,
  FRONTEND_PORT: 8556
};

module.exports = { B_DRIVE_PATHS };