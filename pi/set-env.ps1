# Writes the Supabase settings straight onto the Pi (~/drone.env). The key is hidden while you paste it.
Write-Host "Paste each value, then press Enter. Right-click or Ctrl+V pastes." -ForegroundColor Yellow
$url = (Read-Host "1/4  Supabase Project URL (https://....supabase.co)").Trim()
$sec = Read-Host "2/4  service_role key (hidden, nothing shows)" -AsSecureString
$id  = (Read-Host "3/4  Drone ID from the drones table").Trim()
$cam = (Read-Host "4/4  Camera URL from 'tailscale funnel status' (Enter to skip)").Trim()
$key = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)).Trim()
"SUPABASE_URL=$url`nSUPABASE_SERVICE_ROLE_KEY=$key`nDRONE_ID=$id`nCAMERA_URL=$cam`n" | ssh pi@drone.local "umask 077; tr -d '\r' > ~/drone.env && echo SAVED-ON-PI"
$key = $null
