# Copies nightgrid's live files from the Herdr home back into this repo
# (Windows). Edit in Herdr (changes apply live), then run this and commit.
#
# Only what this repo owns comes back: the layout, mods\nightgrid, the theme,
# the background and the pi icon. Personal files (nightgrid-config.json,
# programs.json) and third-party mods stay out; -All also brings back
# tab-notes and herdr-filechanges.
#
# Usage: pwsh -File tools\sync-from-live.ps1 [-All] [-HerdrHome <path>]

param(
  [string]$HerdrHome = $(if ($env:HERDR_APP_HOME) { $env:HERDR_APP_HOME } else { "$env:USERPROFILE\.config\herdr-app" }),
  [switch]$All
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
if (!(Test-Path $HerdrHome)) { throw "Herdr home not found: $HerdrHome" }

$skip = @('jsconfig.json', 'gpui-kit.d.ts', '.DS_Store')
$keepInRepo = @('LICENSE', 'LICENSE-lucide')

$mods = @('nightgrid')
if ($All) { $mods += @('tab-notes', 'herdr-filechanges') }
foreach ($m in $mods) {
  $src = Join-Path $HerdrHome "mods\$m"
  $dst = Join-Path $repo "mods\$m"
  # Drop repo files the live mod no longer has (but never its licenses).
  if (Test-Path $dst) {
    Get-ChildItem $dst -Recurse -File | Where-Object { $keepInRepo -notcontains $_.Name } | ForEach-Object {
      $rel = $_.FullName.Substring($dst.Length).TrimStart('\', '/')
      if (!(Test-Path (Join-Path $src $rel))) { Remove-Item $_.FullName -Force }
    }
  }
  Get-ChildItem $src -Recurse -File | Where-Object { $skip -notcontains $_.Name -and $_.Name -notlike '*.error' } | ForEach-Object {
    $rel = $_.FullName.Substring($src.Length).TrimStart('\', '/')
    $target = Join-Path $dst $rel
    New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
    Copy-Item $_.FullName $target -Force
  }
}
foreach ($f in @('layouts\nightgrid.json', 'themes\tokyo-night.json', 'backgrounds\tokyo-grid.png', 'custom-icons\pi.svg')) {
  Copy-Item (Join-Path $HerdrHome $f) (Join-Path $repo $f) -Force
}

Write-Host "synced from $HerdrHome"
git -C $repo status --short -- .
