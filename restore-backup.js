require('dotenv').config();
const sql = require('mssql');
const path = require('path');
const fs = require('fs');

// Parse DATABASE_URL (Prisma format: sqlserver://user:password@host:port/database)
function parseDatabaseUrl(url) {
  if (!url) {
    throw new Error('DATABASE_URL is not set in .env file');
  }

  console.log('Parsing DATABASE_URL (masked):', url.replace(/:[^:@]+@/, ':****@'));

  // Remove sqlserver:// prefix if present
  let cleanUrl = url.replace(/^sqlserver:\/\//, '');
  
  // Handle query parameters (split by ; and separate main URL from options)
  const parts = cleanUrl.split(';');
  const mainUrl = parts[0];
  const queryParams = {};
  parts.slice(1).forEach(part => {
    const [key, value] = part.split('=');
    if (key && value) {
      queryParams[key.trim().toLowerCase()] = value.trim();
    }
  });
  
  console.log('Main URL part:', mainUrl);
  console.log('Query params:', queryParams);
  
  // Parse the connection string (Prisma format: user:password@host:port/database)
  // Or alternative: host:password@port or user:password@host:port
  let match = mainUrl.match(/^([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  
  if (match) {
    const config = {
      user: decodeURIComponent(match[1]),
      password: decodeURIComponent(match[2]),
      server: match[3],
      port: parseInt(match[4]),
      database: match[5],
      options: {
        encrypt: true,
        trustServerCertificate: queryParams.trustservercertificate === 'true' || true,
        enableArithAbort: true
      }
    };
    console.log('Parsed as Prisma format with database');
    return config;
  }
  
  // Try format: host:password@port (no user, no database in URL)
  match = mainUrl.match(/^([^:]+):([^@]+)@(\d+)$/);
  if (match) {
    // Try to get database from query params or use default
    const database = queryParams.database || queryParams.initialcatalog || 'Echashma';
    const user = queryParams.user || queryParams.userid || queryParams.uid || 'sa';
    
    const config = {
      user: user,
      password: decodeURIComponent(match[2]),
      server: match[1],
      port: parseInt(match[3]),
      database: database,
      options: {
        encrypt: true,
        trustServerCertificate: queryParams.trustservercertificate === 'true' || true,
        enableArithAbort: true
      }
    };
    console.log('Parsed as simplified format (host:password@port)');
    return config;
  }
  
  // Try format: user:password@host:port
  match = mainUrl.match(/^([^:]+):([^@]+)@([^:]+):(\d+)$/);
  if (match) {
    const database = queryParams.database || queryParams.initialcatalog || 'Echashma';
    const config = {
      user: decodeURIComponent(match[1]),
      password: decodeURIComponent(match[2]),
      server: match[3],
      port: parseInt(match[4]),
      database: database,
      options: {
        encrypt: true,
        trustServerCertificate: queryParams.trustservercertificate === 'true' || true,
        enableArithAbort: true
      }
    };
    console.log('Parsed as format without database in URL');
    return config;
  }
  
  // Try format: host:port (with all params in query string)
  match = mainUrl.match(/^([^:]+):(\d+)$/);
  if (match) {
    const database = queryParams.database || queryParams.initialcatalog || 'Echashma';
    const user = queryParams.user || queryParams.userid || queryParams.uid || 'sa';
    const password = queryParams.password || queryParams.pwd;
    
    if (!password) {
      throw new Error('Password not found in DATABASE_URL query parameters');
    }
    
    const config = {
      user: user,
      password: password,
      server: match[1],
      port: parseInt(match[2]),
      database: database,
      options: {
        encrypt: true,
        trustServerCertificate: queryParams.trustservercertificate === 'true' || true,
        enableArithAbort: true
      }
    };
    console.log('Parsed as host:port format with query params');
    return config;
  }
  
  // Try parsing as connection string format (Server=host,port;Database=db;User Id=user;Password=pass)
  const connParts = cleanUrl.split(';');
  const config = {};
  
  connParts.forEach(part => {
    const [key, value] = part.split('=');
    if (key && value) {
      const normalizedKey = key.trim().toLowerCase();
      if (normalizedKey === 'server' || normalizedKey === 'data source') {
        const serverParts = value.trim().split(',');
        config.server = serverParts[0];
        if (serverParts[1]) config.port = parseInt(serverParts[1]);
      } else if (normalizedKey === 'database' || normalizedKey === 'initial catalog') {
        config.database = value.trim();
      } else if (normalizedKey === 'user id' || normalizedKey === 'uid') {
        config.user = value.trim();
      } else if (normalizedKey === 'password' || normalizedKey === 'pwd') {
        config.password = value.trim();
      }
    }
  });
  
  if (!config.server) {
    throw new Error('Could not parse DATABASE_URL. Expected format: sqlserver://user:password@host:port/database or Server=host;Database=db;User Id=user;Password=pass');
  }
  
  config.options = {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  };
  
  console.log('Parsed as connection string format');
  return config;
}

async function restoreBackup() {
  try {
    const localBackupPath = '/Users/beatrow/Downloads/eCHASMA_190126';
    // Path inside Docker container (SQL Server can access this)
    const containerBackupPath = '/var/opt/mssql/backup/eCHASMA_190126';
    
    // Check if backup file exists locally
    if (!fs.existsSync(localBackupPath)) {
      throw new Error(`Backup file not found at: ${localBackupPath}`);
    }
    
    console.log('Backup file found locally:', localBackupPath);
    console.log('File size:', (fs.statSync(localBackupPath).size / 1024 / 1024).toFixed(2), 'MB');
    console.log('Note: If SQL Server is in Docker, ensure the file is copied to the container.');
    console.log('Using container path:', containerBackupPath);
    
    // Parse database connection
    const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
    console.log('Connecting to database:', dbConfig.server, 'Database:', dbConfig.database);
    
    // Connect to SQL Server
    const pool = await sql.connect(dbConfig);
    console.log('Connected to SQL Server successfully');
    
    // Get database name from config
    const databaseName = dbConfig.database;
    
    // Set database to master to restore
    await pool.request().query(`USE master`);
    console.log('Switched to master database');
    
    // Check if database exists and set to single user mode
    const dbCheck = await pool.request().query(`
      SELECT name FROM sys.databases WHERE name = '${databaseName}'
    `);
    
    if (dbCheck.recordset.length > 0) {
      console.log(`Database ${databaseName} exists. Setting to single user mode...`);
      await pool.request().query(`
        ALTER DATABASE [${databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE
      `);
    }
    
    // Use container path for SQL Server restore
    const backupPath = containerBackupPath;
    
    // First, verify the backup file
    console.log('Verifying backup file...');
    try {
      const headerQuery = `RESTORE HEADERONLY FROM DISK = '${backupPath.replace(/'/g, "''")}'`;
      const headerResult = await pool.request().query(headerQuery);
      console.log('Backup file verified. Backup details:');
      if (headerResult.recordset.length > 0) {
        const backupInfo = headerResult.recordset[0];
        console.log('  Database Name:', backupInfo.DatabaseName);
        console.log('  Backup Type:', backupInfo.BackupTypeDescription);
        console.log('  Backup Date:', backupInfo.BackupStartDate);
      }
    } catch (headerError) {
      console.warn('Warning: Could not read backup header:', headerError.message);
      console.log('Continuing with restore anyway...');
    }
    
    // Get file list from backup
    console.log('Getting file list from backup...');
    const fileListQuery = `RESTORE FILELISTONLY FROM DISK = '${backupPath.replace(/'/g, "''")}'`;
    const fileListResult = await pool.request().query(fileListQuery);
    
    console.log('Files in backup:');
    const moveOptions = [];
    fileListResult.recordset.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.LogicalName} (${file.Type}) - Physical: ${file.PhysicalName}`);
      // Get current database file paths
      const currentPath = file.Type === 'D' 
        ? `/var/opt/mssql/data/${databaseName}.mdf`
        : `/var/opt/mssql/data/${databaseName}_log.ldf`;
      moveOptions.push(`MOVE '${file.LogicalName}' TO '${currentPath}'`);
    });
    
    // Restore the database
    console.log('Starting database restore...');
    console.log('Backup file path (in container):', backupPath);
    
    // Build restore query with MOVE options
    const moveClause = moveOptions.length > 0 ? moveOptions.join(', ') : '';
    const restoreQuery = `
      RESTORE DATABASE [${databaseName}]
      FROM DISK = '${backupPath.replace(/'/g, "''")}'
      ${moveClause ? `WITH REPLACE, ${moveClause}, RECOVERY` : 'WITH REPLACE, RECOVERY'}
    `;
    
    console.log('Executing restore query...');
    await pool.request().query(restoreQuery);
    console.log('Database restore completed successfully!');
    
    // Set database back to multi-user mode
    await pool.request().query(`
      ALTER DATABASE [${databaseName}] SET MULTI_USER
    `);
    console.log('Database set to multi-user mode');
    
    // Close the connection
    await pool.close();
    console.log('Connection closed');
    
    console.log('\n✅ Backup restoration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error restoring backup:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.originalError) {
      console.error('Original error:', error.originalError.message);
    }
    process.exit(1);
  }
}

// Run the restore
restoreBackup();
