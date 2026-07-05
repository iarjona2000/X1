$root = 'C:\Users\tomas\Desktop\cbos-ext'
$exts = @('*.js','*.jsx','*.html')
$exclude = @('node_modules','dist')
$total = 0
$count = 0
Get-ChildItem $root -Recurse -Include $exts -Exclude $exclude | ForEach-Object {
  $c = (Get-Content $_.FullName | Measure-Object -Line).Lines
  $total += $c
  $count++
  Write-Host ('{0}: {1}' -f $_.FullName.Replace($root + '\',''), $c)
}
Write-Host '---'
Write-Host ('TOTAL: {0} lines in {1} files' -f $total, $count)
