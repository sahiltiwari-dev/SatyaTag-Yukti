# ============================================================
# SATYATAG local PostgreSQL helper
# ============================================================
# Creates and starts a user-owned PostgreSQL cluster on port 5433 so that
# no admin rights or changes to the system PostgreSQL are required.
# ============================================================
$ErrorActionPreference = 'Stop'

$PgData = Join-Path $env:LOCALAPPDATA 'satyatag\pgdata'
$Password = 'satyatag-dev-password-2026'
$PgBin = 'C:\Program Files\PostgreSQL\18\bin'
$Port = 5433

if (-not (Test-Path (Join-Path $PgBin 'initdb.exe'))) {
    Write-Error "PostgreSQL binaries not found at $PgBin. Install PostgreSQL 18 first."
    exit 1
}

if (-not (Test-Path (Join-Path $PgData 'PG_VERSION'))) {
    Write-Host "Initialising new PostgreSQL cluster at $PgData ..."
    New-Item -ItemType Directory -Force -Path $PgData | Out-Null
    $pwFile = Join-Path $env:TEMP 'satyatag_pw.txt'
    Set-Content -Path $pwFile -Value $Password -NoNewline
    & (Join-Path $PgBin 'initdb.exe') -D $PgData -U satyatag --auth=scram-sha-256 --pwfile=$pwFile -E UTF8 --locale=C | Out-Host
    Remove-Item $pwFile -Force
}

$conf = Join-Path $PgData 'postgresql.conf'
$confText = Get-Content $conf -Raw
if ($confText -notmatch '(?m)^\s*port\s*=') { Add-Content $conf "`nport = $Port`n" }
if ($confText -notmatch '(?m)^\s*listen_addresses\s*=') { Add-Content $conf "listen_addresses = '127.0.0.1'`n" }

$running = & (Join-Path $PgBin 'pg_isready.exe') -h 127.0.0.1 -p $Port 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Starting PostgreSQL cluster ...'
    & (Join-Path $PgBin 'pg_ctl.exe') start -D $PgData -l (Join-Path $PgData 'server.log') | Out-Host
    Start-Sleep -Seconds 2
}

$env:PGPASSWORD = $Password
$dbExists = & (Join-Path $PgBin 'psql.exe') -h 127.0.0.1 -p $Port -U satyatag -d postgres -w -tA -c "SELECT 1 FROM pg_database WHERE datname='satyatag'"
if ($dbExists -notmatch '^\s*1\s*$') {
    & (Join-Path $PgBin 'createdb.exe') -h 127.0.0.1 -p $Port -U satyatag satyatag
}
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
Write-Host 'PostgreSQL ready: 127.0.0.1:5433 (database: satyatag)'