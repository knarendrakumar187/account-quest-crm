# Asks for your Account Quest token (hidden while you paste) and writes it to .env.
$secure = Read-Host "Paste your Account Quest token (starts with aq1), then press Enter" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
Set-Content -Path $envFile -Value ("AQ_TOKEN=" + $plain.Trim()) -Encoding ascii -NoNewline
Write-Host ("Saved to " + $envFile + " (" + $plain.Trim().Length + " characters).")
