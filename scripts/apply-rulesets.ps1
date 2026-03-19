param(
  [string]$Owner,
  [string]$Repo,
  [string]$Token = $env:GITHUB_TOKEN,
  [string]$RulesetDir = (Join-Path $PSScriptRoot "..\\.github\\rulesets")
)

$ErrorActionPreference = "Stop"

function Resolve-RepositoryFromRemote {
  $remoteUrl = git remote get-url origin

  $patterns = @(
    "github(?:-[^:]+)?:([^/]+)/(.+?)(?:\.git)?$",
    "github\.com[:/]([^/]+)/(.+?)(?:\.git)?$"
  )

  foreach ($pattern in $patterns) {
    $match = [regex]::Match($remoteUrl, $pattern)
    if ($match.Success) {
      return @{
        Owner = $match.Groups[1].Value
        Repo = $match.Groups[2].Value
      }
    }
  }

  throw "Could not determine owner/repo from remote URL: $remoteUrl"
}

if (-not $Token) {
  throw "Set GITHUB_TOKEN to a token with repository administration write access before applying rulesets."
}

if (-not (Test-Path $RulesetDir)) {
  throw "Ruleset directory not found: $RulesetDir"
}

if (-not $Owner -or -not $Repo) {
  $resolved = Resolve-RepositoryFromRemote
  if (-not $Owner) {
    $Owner = $resolved.Owner
  }
  if (-not $Repo) {
    $Repo = $resolved.Repo
  }
}

$headers = @{
  Accept                 = "application/vnd.github+json"
  Authorization          = "Bearer $Token"
  "X-GitHub-Api-Version" = "2022-11-28"
  "User-Agent"           = "TcTidier-ruleset-sync"
}

$baseUrl = "https://api.github.com/repos/$Owner/$Repo/rulesets"
$existingRulesets = @(Invoke-RestMethod -Method Get -Uri $baseUrl -Headers $headers)

Get-ChildItem -Path $RulesetDir -Filter *.json | Sort-Object Name | ForEach-Object {
  $path = $_.FullName
  $payload = Get-Content $path -Raw
  $definition = $payload | ConvertFrom-Json
  $existing = $existingRulesets | Where-Object { $_.name -eq $definition.name } | Select-Object -First 1

  if ($existing) {
    $url = "$baseUrl/$($existing.id)"
    $result = Invoke-RestMethod -Method Put -Uri $url -Headers $headers -Body $payload -ContentType "application/json"
    Write-Host "Updated ruleset '$($definition.name)' -> $($result._links.html.href)"
  } else {
    $result = Invoke-RestMethod -Method Post -Uri $baseUrl -Headers $headers -Body $payload -ContentType "application/json"
    Write-Host "Created ruleset '$($definition.name)' -> $($result._links.html.href)"
  }
}
