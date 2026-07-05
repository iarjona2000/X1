$root = 'C:\Users\tomas\Desktop\cbos-ext'
$files = @(
  'background\service-worker.js',
  'content\voice-listener.js',
  'content\voice-bridge.js',
  'content\chat-agent.js',
  'content\chat-sidebar.js',
  'offscreen\voice.html',
  'manifest.json',
  'sidepanel\panel.html',
  'sidepanel-ui\src\main.jsx',
  'sidepanel-ui\src\App.jsx',
  'sidepanel-ui\src\ChatView.jsx',
  'sidepanel-ui\src\RepoView.jsx',
  'sidepanel-ui\src\backend.js',
  'sidepanel-ui\src\tools.js',
  'sidepanel-ui\src\ProcessTimeline.jsx',
  'sidepanel-ui\src\icons.jsx',
  'worker\src\worker.js'
)
$total = 0
foreach ($f in $files) {
  $path = Join-Path $root $f
  if (Test-Path $path) {
    $c = (Get-Content $path | Measure-Object -Line).Lines
    $total += $c
    Write-Host ('{0}: {1}' -f $f, $c)
  } else {
    Write-Host ('{0}: NOT FOUND' -f $f)
  }
}
Write-Host '---'
Write-Host ('TOTAL SOURCE CODE: {0} lines' -f $total)
