import subprocess, sys

# Try git credential fill with a timeout
proc = subprocess.Popen(
    ['git', 'credential', 'fill'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

input_data = "protocol=https\nhost=github.com\n"
try:
    stdout, stderr = proc.communicate(input_data, timeout=5)
    print("STDOUT:", stdout)
    print("STDERR:", stderr)
except subprocess.TimeoutExpired:
    proc.kill()
    print("Timed out - git credential fill is blocking")
    
    # Try alternative: check git remote -v for token in URL
    proc2 = subprocess.Popen(
        ['git', 'remote', '-v'],
        cwd=r'C:\Users\tomas\Desktop\cbos-ext',
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    out, err = proc2.communicate(timeout=5)
    print("\nRemote URLs:")
    print(out)
