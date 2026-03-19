# GitFlow

TcTidier now follows a lightweight GitFlow model:

- `main`
  Production-ready history only. Merge here from `release/*` and `hotfix/*`.
- `develop`
  Integration branch for upcoming work. Merge everyday work here from `feature/*`.
- `feature/<short-name>`
  Branch from `develop` for formatter changes, docs updates, test work, and tooling.
- `release/<version>`
  Branch from `develop` when preparing a release candidate such as `release/0.1.1`.
- `hotfix/<version>`
  Branch from `main` for urgent fixes that must ship before the next normal release.

## Normal Flow

1. Sync `main`.
2. Create or refresh `develop` from `main`.
3. Branch feature work from `develop`.
4. Open PRs from `feature/*` into `develop`.
5. Cut `release/<version>` from `develop` when the next release is ready.
6. On the release branch, update `CHANGELOG.md`, `package.json`, and any last release notes.
7. Merge the release branch into `main`, tag `v<version>`, then merge it back into `develop`.
8. For urgent production fixes, branch `hotfix/<version>` from `main`, merge back to `main`, tag, then back-merge into `develop`.

## Commands

```bash
git checkout main
git pull --ff-only origin main
git checkout -b develop
git push -u origin develop

git checkout develop
git pull --ff-only origin develop
git checkout -b feature/short-name

git checkout develop
git pull --ff-only origin develop
git checkout -b release/0.1.1

git checkout main
git pull --ff-only origin main
git checkout -b hotfix/0.1.2
```

## Repo Automation

- CI runs on `main`, `develop`, `feature/*`, `release/*`, and `hotfix/*`.
- Tag pushes matching `v*` package the extension, publish the generated `.vsix` to a GitHub release, and can publish to extension registries when secrets are configured.
- `npm run release:check` verifies the repo and creates a local `.vsix` package before a release PR or tag.

## GitHub Settings To Apply

These settings still need to be configured in GitHub because they are not stored in the repo:

- Push the new `develop` branch and consider making it the default branch for day-to-day PRs.
- Protect `main` and `develop`.
- Require PR review plus passing CI on protected branches.
- Restrict direct pushes to `main` and `develop`.
- Keep release tags in the form `vX.Y.Z` so the release workflow can detect them.
- Add `VSCE_PAT` if you want tag pushes to publish to the VS Code Marketplace.
- Add `OVSX_PAT` and create the `CodePiercerTechnologies` namespace on Open VSX if you want public Open VSX publishing.
