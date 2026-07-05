Add-Type @"
using System;
using System.Runtime.InteropServices;

public class CredUI {
    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern bool CredRead(string target, int type, out IntPtr credentialPtr);
    
    [DllImport("advapi32.dll")]
    public static extern void CredFree(IntPtr buffer);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct CREDENTIAL {
        public int Flags;
        public int Type;
        public IntPtr TargetName;
        public IntPtr Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public IntPtr TargetAlias;
        public IntPtr UserName;
        public int CredentialBlobSize2;
    }
}
"@

$targets = @(
    "git:https://github.com",
    "git:https://iarjona2000@github.com",
    "git:https://calezamindset@github.com"
)

foreach ($target in $targets) {
    $ptr = [IntPtr]::Zero
    $result = [CredUI]::CredRead($target, 1, [ref]$ptr)
    if ($result) {
        $cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][CredUI+CREDENTIAL])
        $userName = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($cred.UserName)
        $password = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($cred.CredentialBlob)
        Write-Host "Target: $target"
        Write-Host "  User: $userName"
        Write-Host "  Pass: $password"
        [CredUI]::CredFree($ptr)
    } else {
        $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
        Write-Host "Target: $target - Not found (error: $err)"
    }
}
