# Adds the LiveKit settings to ~/drone.env on the Pi (keeps the Supabase lines). The secret is hidden while you paste it.
$OutputEncoding = [Text.UTF8Encoding]::new($false)
Write-Host "From cloud.livekit.io -> your project -> Settings -> API keys. Keyboard on ENG. Right-click or Ctrl+V pastes." -ForegroundColor Yellow
$url = (Read-Host "1/3  LiveKit URL (wss://....livekit.cloud)").Trim()
$key = (Read-Host "2/3  API key (starts with API...)").Trim()
$sec = Read-Host "3/3  API secret (hidden, nothing shows)" -AsSecureString
$secret = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)).Trim()
# LiveKit values are plain English letters/digits: anything else means a typo or the Arabic keyboard
$bad = @()
if ($url -notmatch '^wss://[a-z0-9-]+\.livekit\.cloud/?$') { $bad += "URL should look like wss://name-xxxx.livekit.cloud" }
if ($key -notmatch '^API[A-Za-z0-9]+$') { $bad += "API key should start with API and have only letters/digits" }
if ($secret -notmatch '^[A-Za-z0-9]{20,}$') { $bad += "API secret has $($secret.Length) characters, some not English letters/digits: switch keyboard to ENG and paste with the copy button" }
if ($bad) { $bad | ForEach-Object { Write-Host "NOT SAVED: $_" -ForegroundColor Red }; $secret = $null; return }
Write-Host "secret looks right ($($secret.Length) characters), sending..." -ForegroundColor Green
"LIVEKIT_URL=$url`nLIVEKIT_API_KEY=$key`nLIVEKIT_API_SECRET=$secret`n" | ssh pi@drone.local "umask 077; grep -v '^LIVEKIT_' ~/drone.env > ~/drone.env.new; tr -d '\r' >> ~/drone.env.new && mv ~/drone.env.new ~/drone.env && echo SAVED-ON-PI"
$secret = $null
