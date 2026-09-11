# Stops the SATYATAG local PostgreSQL cluster (port 5433).
$PgData = Join-Path $env:LOCALAPPDATA 'satyatag\pgdata'
$PgBin = 'C:\Program Files\PostgreSQL\18\bin'
if (Test-Path (Join-Path $PgData 'PG_VERSION')) {
    & (Join-Path $PgBin 'pg_ctl.exe') stop -D $PgData -m fast
} else {
    Write-Host 'SATYATAG PostgreSQL cluster is not initialised.'
}