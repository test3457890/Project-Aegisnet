Write-Host "Running Security Audit on AegisNet..."

Write-Host "1. Auditing frontend dependencies..."
npm audit

Write-Host "2. Auditing backend dependencies..."
Push-Location services/api
npm audit
Pop-Location

Write-Host "3. Scanning for common secrets (very basic heuristic)..."
$matches = Select-String -Pattern "(?i)(password|secret|api_key|private_key|token) *[=:] *['""][^'""]{5,}['""]" -Path "src\app\*", "services\api\src\*" -Exclude "*.test.ts"
if ($matches) {
    Write-Host "WARNING: Possible hardcoded secrets found!" -ForegroundColor Red
    $matches | ForEach-Object { Write-Host $_.Line }
} else {
    Write-Host "✅ No obvious hardcoded secrets found." -ForegroundColor Green
}

Write-Host "Security check completed."
