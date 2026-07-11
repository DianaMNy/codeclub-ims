<#
.SYNOPSIS
  Backup and restore for the Code Club IMS Supabase database.

.DESCRIPTION
  BACKUP (default): runs pg_dump to create a timestamped, plain-SQL dump
  in backend/sql/db-backups/ (gitignored at the repo root - real data
  never hits GitHub).

  RESTORE (-Restore -BackupFile <path>): runs psql -f to load a dump file
  into whatever database $env:SUPABASE_DB_URL points at. Point this at a
  target/test database before restoring - this script does not create one
  for you, and does not stop you from restoring over a live database if
  that is what the connection string points at.

  Never hardcode credentials in this file - the connection string always
  comes from $env:SUPABASE_DB_URL.

.USAGE
  Backup:
    $env:SUPABASE_DB_URL = "postgresql://postgres.xxxx:PASSWORD@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
    .\backend\sql\backup-restore.ps1

  Restore (into a target database - read docs/BACKUP-RESTORE.md first):
    $env:SUPABASE_DB_URL = "<connection string for the TARGET database>"
    .\backend\sql\backup-restore.ps1 -Restore -BackupFile ".\backend\sql\db-backups\codeclub-backup-2026-07-11.sql"

  Where to get the connection string: Supabase dashboard -> Connect ->
  Session pooler (port 5432) -> copy it and substitute in your actual DB
  password. Use the Session pooler specifically, NOT the Transaction
  pooler (port 6543) the app itself uses at runtime (see DATABASE_URL in
  backend/.env) - pg_dump needs session-level features that PgBouncer's
  transaction pooling mode doesn't support, so a dump attempted through
  port 6543 will fail or come out corrupt.

  Requires the PostgreSQL client tools (pg_dump, psql) on PATH - install
  via the PostgreSQL installer, or winget install PostgreSQL.PostgreSQL.

  Full runbook, including what to expect during restore and how to
  confirm success: docs/BACKUP-RESTORE.md
#>

param(
    [switch]$Restore,
    [string]$BackupFile
)

function Get-MaskedConnectionString {
    # Never print the raw connection string anywhere - it contains the DB
    # password. This swaps the password portion for *** for display only.
    param([string]$ConnString)
    return $ConnString -replace '(://[^:]+:)[^@]+(@)', '$1***$2'
}

if (-not $env:SUPABASE_DB_URL) {
    Write-Error "SUPABASE_DB_URL is not set. See the usage notes at the top of this script (Get-Help .\backup-restore.ps1 -Full)."
    exit 1
}

if ($Restore) {
    if (-not $BackupFile) {
        Write-Error "-Restore requires -BackupFile <path to a .sql dump>."
        exit 1
    }
    if (-not (Test-Path $BackupFile)) {
        Write-Error "Backup file not found: $BackupFile"
        exit 1
    }

    $maskedTarget = Get-MaskedConnectionString $env:SUPABASE_DB_URL
    Write-Host "Restoring $BackupFile into $maskedTarget ..."
    Write-Warning "Expect harmless errors on Supabase-internal schemas (supabase_vault, vault.secrets, auth) - these are NOT data loss. See docs/BACKUP-RESTORE.md."

    psql $env:SUPABASE_DB_URL -f $BackupFile

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "psql exited with code $LASTEXITCODE. Some errors are expected (see above) - confirm success with row counts per docs/BACKUP-RESTORE.md, don't rely on the exit code alone."
    } else {
        Write-Host "Restore command completed. Confirm success with row counts per docs/BACKUP-RESTORE.md."
    }
    exit 0
}

# --- Backup (default) ---------------------------------------------------
$backupDir = Join-Path $PSScriptRoot "db-backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$dateStamp = Get-Date -Format "yyyy-MM-dd"
$outFile = Join-Path $backupDir "codeclub-backup-$dateStamp.sql"

Write-Host "Backing up to $outFile ..."

# --no-owner / --no-privileges: skip role/ownership statements tied to
# Supabase-managed roles that won't exist (or won't match) on a restore
# target - without these flags, a restore fails/warns on every single
# CREATE statement trying to reassign ownership to a role that isn't there.
pg_dump $env:SUPABASE_DB_URL --no-owner --no-privileges --format=plain --file=$outFile

if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_dump failed (exit code $LASTEXITCODE). No usable backup was created at $outFile."
    exit $LASTEXITCODE
}

if (-not (Test-Path $outFile) -or (Get-Item $outFile).Length -eq 0) {
    Write-Error "pg_dump reported success but $outFile is missing or empty - treat this backup as failed and investigate before relying on it."
    exit 1
}

$sizeMB = [math]::Round((Get-Item $outFile).Length / 1MB, 1)
Write-Host "Backup complete: $outFile ($sizeMB MB)"
