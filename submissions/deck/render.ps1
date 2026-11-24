# Renders submissions/phase-1-deck.pptx to PNGs in submissions/deck/render/ with PowerPoint (COM)
# and prints a layout report: slide count, text that overflows its box, shapes past the content band.
# Run from anywhere:  pwsh submissions/deck/render.ps1
$ErrorActionPreference = 'Stop'
$pptx = (Resolve-Path (Join-Path $PSScriptRoot '..\phase-1-deck.pptx')).Path
$out = Join-Path $PSScriptRoot 'render'
New-Item -ItemType Directory -Force $out | Out-Null
Get-ChildItem $out -Filter *.png | Remove-Item

# Independent slide count straight from the package.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($pptx)
$parts = @($zip.Entries | Where-Object { $_.FullName -match '^ppt/slides/slide\d+\.xml$' }).Count
$zip.Dispose()
if ($parts -ne 6) { throw "Expected 6 slide parts in the pptx, found $parts" }

$wasRunning = [bool](Get-Process POWERPNT -ErrorAction SilentlyContinue) # never quit the user's own session
$app = New-Object -ComObject PowerPoint.Application
try {
  $pres = $app.Presentations.Open($pptx, -1, 0, 0) # ReadOnly, not Untitled, no window
  if ($pres.Slides.Count -ne 6) { throw "Expected 6 slides, PowerPoint sees $($pres.Slides.Count)" }
  $slideW = $pres.PageSetup.SlideWidth; $slideH = $pres.PageSetup.SlideHeight
  "slides: $($pres.Slides.Count) (zip parts: $parts), size ${slideW}x${slideH} pt"
  $bandBottom = 6.86 * 72 + 1 # content band; the footer sits below it
  foreach ($s in $pres.Slides) {
    foreach ($sh in $s.Shapes) {
      $bottom = $sh.Top + $sh.Height; $right = $sh.Left + $sh.Width
      $isFooter = $sh.Top -ge 7.0 * 72 - 1
      if ($sh.HasTable -eq -1) { "  slide $($s.SlideIndex) table: bottom at {0:n2} in (band ends 6.86)" -f ($bottom / 72) }
      if ((-not $isFooter -and $bottom -gt $bandBottom) -or $bottom -gt $slideH -or $right -gt $slideW + 1) {
        "  slide $($s.SlideIndex) PAST BAND: '$($sh.Name)' bottom {0:n2} in, right {1:n2} in" -f ($bottom / 72), ($right / 72)
      }
      if ($sh.HasTextFrame -eq -1 -and $sh.TextFrame.HasText -eq -1) {
        $tf = $sh.TextFrame2; $tr = $tf.TextRange
        $needH = $tr.BoundHeight + $tf.MarginTop + $tf.MarginBottom
        $needW = $tr.BoundWidth + $tf.MarginLeft + $tf.MarginRight
        if ($needH -gt $sh.Height + 1.5 -or $needW -gt $sh.Width + 6) { # BoundWidth counts trailing spaces of wrapped lines
          $t = $tr.Text; if ($t.Length -gt 50) { $t = $t.Substring(0, 50) }
          "  slide $($s.SlideIndex) TEXT OVERFLOW: needs {0:n2}x{1:n2} in, box {2:n2}x{3:n2} in: $t" -f ($needW / 72), ($needH / 72), ($sh.Width / 72), ($sh.Height / 72)
        }
      }
    }
  }
  $pres.Export($out, 'PNG', 1920, 1080)
  $pres.Close()
} finally {
  if (-not $wasRunning) { $app.Quit() }
  [Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
Get-ChildItem $out -Filter *.png | Sort-Object Name | ForEach-Object { $_.FullName }
