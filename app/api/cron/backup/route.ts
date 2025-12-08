import { NextRequest, NextResponse } from 'next/server';
import { createBackup, cleanOldBackups } from '@/scripts/backup-database';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.error('❌ Unauthorized backup attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔄 Starting automated backup...');
    const startTime = Date.now();
    
    // Create backup
    const backupPath = await createBackup({
      // excludeTables: ['analytics_events'] // Optional: exclude very large tables
    });
    
    // Clean old backups
    const deletedCount = await cleanOldBackups();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Backup completed in ${duration}s`);
    
    return NextResponse.json({
      success: true,
      message: 'Backup completed successfully',
      backup: backupPath.split('/').pop(),
      deletedBackups: deletedCount,
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Automated backup failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
