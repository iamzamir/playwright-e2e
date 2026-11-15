param(
  [Parameter(Mandatory = $true)][string]$Path,
  [string]$NamePattern = ''
)

[xml]$plan = Get-Content -Raw -Encoding UTF8 $Path
$issues = 0
foreach ($tree in $plan.SelectNodes('//hashTree')) {
  $children = @($tree.ChildNodes | Where-Object { $_.NodeType -eq 'Element' })
  for ($i = 0; $i -lt $children.Count; $i++) {
    # JMeter requires every test element to be followed by exactly one hashTree
    if ((($i % 2) -eq 1) -ne ($children[$i].Name -eq 'hashTree')) {
      $issues++
      Write-Output "Pairing issue near <$($children[$i].Name) testname='$($children[$i].testname)'>"
    }
  }
}

$samplers = @($plan.SelectNodes('//HTTPSamplerProxy'))
Write-Output "Well-formed XML. Samplers: $($samplers.Count). Pairing issues: $issues"
if ($NamePattern) {
  $samplers | Where-Object { $_.testname -match $NamePattern } | ForEach-Object { "  $($_.testname)" }
}
if ($issues -gt 0) { exit 1 }
