# Rulesets

TcTidier includes standard GitHub ruleset definitions under `.github/rulesets/`:

- `main.json`
  Protects `main` with PRs, one approval, resolved review threads, plus the `Build, Test, Package` and `Validate GitFlow PR policy` checks.
- `develop.json`
  Protects `develop` with PRs, resolved review threads, plus the `Build, Test, Package` and `Validate GitFlow PR policy` checks.
- `release.json`
  Protects `release/*` branches from deletion or force-pushes and requires the `Build, Test, Package` check.
- `version-tags.json`
  Protects `v*` tags from updates or deletion after creation.

## Apply In GitHub UI

1. Open the repository on GitHub.
2. Go to `Settings` -> `Rules` -> `Rulesets`.
3. Create a new ruleset and import the matching JSON file, or recreate the settings manually.
4. Confirm that the required status check contexts match the check names shown by GitHub Actions for this repo. The templates use `Build, Test, Package` and `Validate GitFlow PR policy`.
5. Add any bypass actors you want, such as administrators or a release-maintainer team.

## Apply By API

Use the helper script with a GitHub token that has repository administration write access:

```powershell
$env:GITHUB_TOKEN = "<token>"
.\scripts\apply-rulesets.ps1
```

The script creates missing rulesets and updates existing ones by name.

## Notes

- Rulesets live on GitHub, not in git history, so these JSON files are the source-controlled templates.
- If your GitHub check names differ from `Build, Test, Package` or `Validate GitFlow PR policy`, update the JSON before applying.
