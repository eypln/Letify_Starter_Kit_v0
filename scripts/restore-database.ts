import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { config } from 'dotenv';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const BACKUP_DIR = path.join(process.cwd(), 'backups');

/**
 * Restore database from backup file
 */
export async function restoreBackup(filename: string, options: { dryRun?: boolean } = {}): Promise<void> {
  const filepath = path.join(BACKUP_DIR, filename);
  
  // Verify file exists
  try {
    await fs.access(filepath);
  } catch {
    throw new Error(`Backup file not found: ${filename}`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE!;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  // Read backup file
  const content = await fs.readFile(filepath, 'utf-8');
  const backup = JSON.parse(content);

  console.log('\n📋 Backup Info:');
  console.log(`📅 Date: ${backup.metadata.timestamp}`);
  console.log(`🏷️  Version: ${backup.metadata.version}`);
  console.log(`📦 Tables: ${backup.metadata.tables.join(', ')}`);

  if (options.dryRun) {
    console.log('\n🔍 DRY RUN - No changes will be made');
    
    for (const table of backup.metadata.tables) {
      const records = backup[table]?.length || 0;
      console.log(`  ${table}: ${records} records would be restored`);
    }
    return;
  }

  console.log('\n⚠️  WARNING: This will DELETE ALL EXISTING DATA and restore from backup!');
  const confirmed = await confirmRestore();
  
  if (!confirmed) {
    console.log('❌ Restore cancelled');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('\n🔄 Starting restore...');
    
    for (const table of backup.metadata.tables) {
      const records = backup[table];
      
      if (!records || records.length === 0) {
        console.log(`⏭️  Skipping ${table} (no data)`);
        continue;
      }

      console.log(`🔄 Restoring ${table} (${records.length} records)...`);
      
      // Delete existing data (be careful!)
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        console.error(`⚠️  Could not clear ${table}:`, deleteError.message);
      }

      // Insert backup data in batches
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from(table)
          .insert(batch);

        if (insertError) {
          console.error(`❌ Error restoring ${table} batch ${i}:`, insertError.message);
        } else {
          console.log(`  ✅ Restored ${Math.min(i + batchSize, records.length)}/${records.length}`);
        }
      }
    }

    console.log('\n✅ Database restored successfully');
  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  }
}

/**
 * Confirm restore with user
 */
async function confirmRestore(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Type "RESTORE" to confirm: ', (answer) => {
      rl.close();
      resolve(answer === 'RESTORE');
    });
  });
}

// CLI execution
if (require.main === module) {
  (async () => {
    try {
      const args = process.argv.slice(2);
      const dryRun = args.includes('--dry-run');
      
      // List available backups
      const files = await fs.readdir(BACKUP_DIR);
      const backups = files
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (backups.length === 0) {
        console.log('❌ No backups found');
        process.exit(1);
      }

      console.log('\n📋 Available backups:');
      backups.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup}`);
      });

      const filename = args.find(arg => arg.endsWith('.json')) || backups[0];
      
      console.log(`\n📂 Using backup: ${filename}`);
      
      await restoreBackup(filename, { dryRun });
      
      process.exit(0);
    } catch (error) {
      console.error('❌ Restore process failed:', error);
      process.exit(1);
    }
  })();
}
