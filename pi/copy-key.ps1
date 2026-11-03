# Copies this PC's SSH public key to the Pi. Asks for the Pi password once.
Write-Host "Type the Pi password you chose in Imager (nothing shows while typing), then Enter:" -ForegroundColor Yellow
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub" | ssh -o StrictHostKeyChecking=accept-new pi@drone.local "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo KEY-INSTALLED"
