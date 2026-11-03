# Writes the Supabase settings onto the Pi (~/drone.env), keeping the LiveKit lines from set-livekit.ps1.
# The key is hidden while you paste it.
Write-Host "Paste each value, then press Enter. Right-click or Ctrl+V pastes." -ForegroundColor Yellow
$url = (Read-Host "1/3  Supabase Project URL (https://....supabase.co)").Trim()
$sec = Read-Host "2/3  service_role key (hidden, nothing shows)" -AsSecureString
$id  = (Read-Host "3/3  Drone ID from the drones table").Trim()
$key = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)).Trim()
"SUPABASE_URL=$url`nSUPABASE_SERVICE_ROLE_KEY=$key`nDRONE_ID=$id`n" | ssh pi@drone.local "umask 077; touch ~/drone.env; grep '^LIVEKIT_' ~/drone.env > ~/drone.env.new; tr -d '\r' >> ~/drone.env.new && mv ~/drone.env.new ~/drone.env && echo SAVED-ON-PI"
$key = $null
