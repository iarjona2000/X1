Add-Type -AssemblyName System.Security

# Try to read from git credential store
$targets = @(
    "git:https://github.com",
    "git:https://iarjona2000@github.com",
    "git:https://calezamindset@github.com"
)

foreach ($target in $targets) {
    Write-Host "Target: $target"
    
    # Try vault credential reader
    try {
        $cred = Get-VaultCredential -Target $target -ErrorAction Stop
        Write-Host "  Found via Get-VaultCredential: $($cred.Credential.UserName)"
    } catch {
        Write-Host "  Not found via Get-VaultCredential"
    }
}

# Try reading from git credential helper directly
Write-Host "`n--- Trying git credential fill ---"
$input = "protocol=https`nhost=github.com`n"
$result = $input | git credential fill 2>&1
Write-Host $result
