# Database Backup & Recovery System

## Overview

Letify implements a comprehensive database backup and recovery system without requiring Supabase Pro plan features. The system uses Supabase client SDK to export all tables as encrypted JSON files, stored locally with automated retention policies.

## Architecture

- **Backup Method**: Client-side Supabase queries
- **Format**: Encrypted JSON (AES-GCM)
- **Storage**: Local `backups/` directory
- **Retention**: 30 days automatic cleanup
- **Automation**: Vercel Cron (daily at 2 AM UTC)
- **Encryption**: Web Crypto API with AES-GCM algorithm

## Tables Backed Up

The system backs up all core application tables:
- `profiles` - User profiles
- `listings` - Property listings
- `clients` - Client information
- `viewings` - Viewing appointments
- `revenue` - Revenue tracking
- `activity` - Activity logs
- `notifications` - System notifications
- `user_roles` - Role assignments
- `team_members` - Team structure
- `agents` - Agent data
- `subscription_plans` - Subscription details
- `user_subscriptions` - User subscriptions
- `invoices` - Invoice records
- `facebook_integrations` - Facebook integration data

## Setup

### 1. Environment Variables

Add to your `.env.local` file:

```bash
# Required for automated cron backups
CRON_SECRET=your_random_secret_for_cron_authentication

# Required for backup encryption (must be exactly 32 characters)
BACKUP_ENCRYPTION_KEY=your_32_character_encryption_key_here
```

**Generate secure keys:**

```bash
# CRON_SECRET (any length)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# BACKUP_ENCRYPTION_KEY (must be 32 characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 2. Vercel Environment Variables

Add the same variables to your Vercel project:

```bash
vercel env add CRON_SECRET
vercel env add BACKUP_ENCRYPTION_KEY
```

### 3. Create Backups Directory

```bash
mkdir backups
```

This directory is automatically excluded from git via `.gitignore`.

## Usage

### Manual Backup

Create a backup manually:

```bash
npm run backup
```

This will:
1. Query all tables from Supabase
2. Export data as JSON
3. Encrypt using AES-GCM
4. Save to `backups/backup-YYYYMMDD-HHMMSS.json`
5. Clean up backups older than 30 days

### List Backups

View available backups:

```bash
npm run backup:list
```

### Manual Restore

Restore from a specific backup:

```bash
npm run restore
```

The restore script will:
1. List all available backups
2. Prompt you to select one
3. Ask for confirmation (type "RESTORE" to proceed)
4. Decrypt the backup file
5. Restore data to Supabase tables

**⚠️ Warning**: Restore operations will overwrite existing data. Always backup before restoring.

### Restore Latest Backup

Quickly restore the most recent backup:

```bash
npm run restore:latest
```

## Automated Backups

### Vercel Cron Configuration

The system is configured to run automated backups daily at 2 AM UTC via Vercel Cron Jobs.

**Configuration** (in `vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Cron Endpoint

- **Path**: `/api/cron/backup`
- **Method**: GET
- **Authentication**: Bearer token via `CRON_SECRET`
- **Max Duration**: 300 seconds (5 minutes)

Vercel automatically authenticates cron requests using the `CRON_SECRET` environment variable.

### Monitoring Cron Jobs

View cron execution logs in Vercel Dashboard:
1. Navigate to your project
2. Go to "Cron Jobs" tab
3. View execution history and logs

## Backup File Format

Backup files are encrypted JSON with the following structure:

```json
{
  "version": "1.0",
  "timestamp": "2025-01-08T02:00:00.000Z",
  "tables": {
    "profiles": [...],
    "listings": [...],
    "clients": [...]
  }
}
```

**Encryption Details:**
- Algorithm: AES-GCM
- Key Length: 256-bit
- IV: 12 bytes (random per backup)
- Authentication Tag: 16 bytes

## Retention Policy

- **Retention Period**: 30 days
- **Automatic Cleanup**: Runs with each backup
- **Manual Cleanup**: Delete files from `backups/` directory

Old backups are automatically removed when:
1. Creating a new backup via `npm run backup`
2. Automated cron backup runs

## Disaster Recovery

### Complete Database Loss

1. Verify latest backup exists:
   ```bash
   npm run backup:list
   ```

2. Restore from latest backup:
   ```bash
   npm run restore:latest
   ```

3. Verify data integrity in Supabase dashboard

### Partial Data Corruption

1. Identify affected tables
2. Create manual backup before restoration
3. Run restore script
4. Manually verify restored data

## Security Best Practices

### Encryption Keys

- **Never commit** `BACKUP_ENCRYPTION_KEY` to version control
- **Rotate keys** periodically (requires re-encrypting backups)
- **Store securely** in password manager or secret vault
- **Backup key separately** from backup files

### Access Control

- **Restrict access** to `backups/` directory
- **Limit permissions** on backup files (read/write for owner only)
- **Audit access** to Supabase service role key

### Backup Storage

For production environments, consider:
- **Off-site backups**: Copy backups to cloud storage (S3, Azure Blob, etc.)
- **Geographic redundancy**: Store backups in multiple regions
- **Version control**: Keep multiple backup versions

## Troubleshooting

### Backup Fails

**Error**: "Failed to query table"
- **Cause**: Supabase connection issue or RLS policy blocking query
- **Solution**: Check Supabase URL/key, verify service role permissions

**Error**: "Encryption failed"
- **Cause**: Invalid or missing `BACKUP_ENCRYPTION_KEY`
- **Solution**: Verify key is exactly 32 characters

### Restore Fails

**Error**: "Backup file not found"
- **Cause**: Missing backup file or incorrect path
- **Solution**: Run `npm run backup:list` to verify files

**Error**: "Decryption failed"
- **Cause**: Wrong encryption key or corrupted backup
- **Solution**: Verify `BACKUP_ENCRYPTION_KEY` matches key used for backup

### Cron Job Not Running

**Issue**: Backups not running at scheduled time
- **Check**: Vercel Cron Jobs dashboard for errors
- **Verify**: `CRON_SECRET` environment variable is set in Vercel
- **Test**: Manually trigger via `curl` with authentication

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/backup
```

## Cost Considerations

This backup system is designed to work **without Supabase Pro plan**:

- ✅ **Free Tier Compatible**: Uses standard Supabase client queries
- ✅ **No PITR Required**: Manual backup/restore approach
- ✅ **Vercel Free Tier**: Cron jobs included in Hobby plan
- ✅ **Local Storage**: No additional cloud storage costs

**Note**: For very large databases (>100MB), consider:
- Selective table backups
- Compressed backup files
- External storage solutions

## Version History

- **v2.5.0** (2025-01-08): Initial backup system implementation
  - Automated daily backups via Vercel Cron
  - Encrypted JSON export format
  - 30-day retention policy
  - Manual restore capabilities

## Support

For issues or questions about the backup system:
1. Check troubleshooting section above
2. Review Vercel Cron logs
3. Verify Supabase connectivity
4. Contact development team

---

**Last Updated**: January 8, 2025  
**Version**: 2.5.0
