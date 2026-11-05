# Installs the nightgrid layout into the Herdr home (Windows).
#
# Copies, never symlinks: Herdr's asset loader does not follow symlinks, so
# icons and the background would silently go missing.
#
# Owned by this repo, always updated: layouts\nightgrid.json, mods\nightgrid,
# themes\tokyo-night.json, backgrounds\tokyo-grid.png, custom-icons\pi.svg.
# Third-party mods (tab-notes, herdr-filechanges) are copied only when missing,
# unless -Force. nightgrid-config.json is personal: created only when missing.
# programs.json: the `pi` entry is merged in, the rest of the file is kept.
#
# Usage:
#   pwsh -File tools\install.ps1 [-Force]
#   pwsh -File tools\install.ps1 -HerdrHome 'C:\Users\me\.config\herdr-app'

param(
  [string]$HerdrHome = $(if ($env:HERDR_APP_HOME) { $env:HERDR_APP_HOME } else { "$env:USERPROFILE\.config\herdr-app" }),
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
if (!(Test-Path $HerdrHome)) { throw "Herdr home not found: $HerdrHome (open the Herdr app once first)" }

$generated = @('jsconfig.json', 'gpui-kit.d.ts', '.DS_Store')

function Copy-Tree($src, $dst) {
  Get-ChildItem $src -Recurse -File | Where-Object { $generated -notcontains $_.Name -and $_.Name -notlike '*.error' } | ForEach-Object {
    $rel = $_.FullName.Substring($src.Length).TrimStart('\', '/')
    $target = Join-Path $dst $rel
    New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
    Copy-Item $_.FullName $target -Force
  }
}

# A new mod folder is staged in a hidden folder and moved in whole, so Herdr
# never sees main.js without mod.json (it would dock the mod into the layout).
function Copy-Mod($name) {
  $src = Join-Path $repo "mods\$name"
  $dest = Join-Path $HerdrHome "mods\$name"
  if (Test-Path $dest) {
    # Remove files the repo no longer has, keeping what Herdr generates.
    Get-ChildItem $dest -Recurse -File | Where-Object { $generated -notcontains $_.Name -and $_.Name -notlike '*.error' } | ForEach-Object {
      $rel = $_.FullName.Substring($dest.Length).TrimStart('\', '/')
      if (!(Test-Path (Join-Path $src $rel))) { Remove-Item $_.FullName -Force }
    }
    Copy-Tree $src $dest
  } else {
    $stage = Join-Path $HerdrHome "mods\.$name.stage"
    if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
    Copy-Tree $src $stage
    Move-Item $stage $dest
  }
  Write-Host "  mods\$name"
}

function Copy-One($rel) {
  $target = Join-Path $HerdrHome $rel
  New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
  Copy-Item (Join-Path $repo $rel) $target -Force
  Write-Host "  $rel"
}

Write-Host "Installing nightgrid into $HerdrHome"
Copy-Mod 'nightgrid'
foreach ($m in @('tab-notes', 'herdr-filechanges')) {
  if (!(Test-Path (Join-Path $HerdrHome "mods\$m")) -or $Force) { Copy-Mod $m } else { Write-Host "  mods\$m (kept, -Force to update)" }
}
foreach ($f in @('themes\tokyo-night.json', 'backgrounds\tokyo-grid.png', 'custom-icons\pi.svg', 'layouts\nightgrid.json')) { Copy-One $f }
if (!(Test-Path (Join-Path $HerdrHome 'nightgrid-config.json'))) { Copy-One 'nightgrid-config.json' }

$progDst = Join-Path $HerdrHome 'programs.json'
if (!(Test-Path $progDst)) {
  Copy-One 'programs.json'
} else {
  $src = Get-Content (Join-Path $repo 'programs.json') -Raw | ConvertFrom-Json
  $dst = Get-Content $progDst -Raw | ConvertFrom-Json
  if (!$dst.programs) { $dst | Add-Member -NotePropertyName programs -NotePropertyValue ([pscustomobject]@{}) }
  $added = @()
  foreach ($p in $src.programs.PSObject.Properties) {
    if (!$dst.programs.PSObject.Properties[$p.Name]) { $dst.programs | Add-Member -NotePropertyName $p.Name -NotePropertyValue $p.Value; $added += $p.Name }
  }
  if ($added.Count) { $dst | ConvertTo-Json -Depth 20 | Set-Content $progDst -Encoding utf8; Write-Host "  programs.json (added $($added -join ', '))" }
  else { Write-Host '  programs.json (pi already there)' }
}

if (Get-Command herdr-app -ErrorAction SilentlyContinue) {
  foreach ($m in @('nightgrid', 'tab-notes', 'herdr-filechanges')) { herdr-app check (Join-Path $HerdrHome "mods\$m") }
  Write-Host 'Done. Switch with: herdr-app do layout.switch --name nightgrid'
} else {
  Write-Host "Done. herdr-app not on PATH: run 'herdr-app check' on each mod, then switch to nightgrid (Ctrl+Shift+L)."
}
