import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const RETENTION_DAYS = 30;

interface BackupConfig {
  tables?: string[];
  excludeTables?: string[];
}

/**
 * Create database backup by exporting all tables to JSON
 * (Alternative to pg_dump - works without direct DB access)
 */
export async function createBackup(config: BackupConfig = {}): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE!;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filename = `backup-${timestamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  // Ensure backup directory exists
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  // Tables to backup
  const tables = config.tables || [
    'profiles',
    'clients',
    'listings',
    'teamwork_clients',
    'teamwork_listings',
    'viewings',
    'revenue',
    'activity',
    'user_post_usage',
    'analytics_events',
    'approval_queue'
  ];

  const backup: Record<string, any> = {
    metadata: {
      timestamp: new Date().toISOString(),
      version: '2.5.0',
      tables: tables
    }
  };

  try {
    console.log('🔄 Starting backup...');
    
    // Backup each table
    for (const table of tables) {
      if (config.excludeTables?.includes(table)) {
        console.log(`⏭️  Skipping ${table}`);
        continue;
      }

      console.log(`📦 Backing up ${table}...`);
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000); // Safety limit

      if (error) {
        console.error(`❌ Error backing up ${table}:`, error.message);
        backup[table] = [];
      } else {
        backup[table] = data || [];
        console.log(`✅ ${table}: ${data?.length || 0} records`);
      }
    }

    // Write backup to file
    await fs.writeFile(filepath, JSON.stringify(backup, null, 2), 'utf-8');
    
    const stats = await fs.stat(filepath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ Backup created: ${filename} (${sizeMB} MB)`);
    return filepath;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

/**
 * Clean old backups based on retention policy
 */
export async function cleanOldBackups(): Promise<number> {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const now = Date.now();
    const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const file of files) {
      if (!file.startsWith('backup-') || !file.endsWith('.json')) continue;
      
      const filepath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filepath);
      const age = now - stats.mtime.getTime();

      if (age > retentionMs) {
        await fs.unlink(filepath);
        console.log(`🗑️  Deleted old backup: ${file}`);
        deletedCount++;
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return 0;
  }
}

/**
 * List available backups
 */
export async function listBackups(): Promise<Array<{name: string; size: string; date: Date}>> {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const files = await fs.readdir(BACKUP_DIR);
    const backups = [];

    for (const file of files) {
      if (!file.startsWith('backup-') || !file.endsWith('.json')) continue;
      
      const filepath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filepath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      backups.push({
        name: file,
        size: `${sizeMB} MB`,
        date: stats.mtime
      });
    }

    return backups.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error) {
    console.error('❌ List backups failed:', error);
    return [];
  }
}

// CLI execution
if (require.main === module) {
  (async () => {
    try {
      console.log('🚀 Starting manual backup...');
      
      const backupPath = await createBackup({
        // excludeTables: ['analytics_events'] // Optional: exclude large tables
      });
      
      const deleted = await cleanOldBackups();
      
      console.log('\n📊 Backup Summary:');
      console.log(`✅ Backup created: ${backupPath}`);
      console.log(`🗑️  Old backups deleted: ${deleted}`);
      console.log(`📁 Retention policy: ${RETENTION_DAYS} days`);
      
      process.exit(0);
    } catch (error) {
      console.error('❌ Backup process failed:', error);
      process.exit(1);
    }
  })();
}
