# Claude Code Instructions

## Before making any changes

Always run a build first to confirm the project is in a clean state:

```
npm run build
```

Fix any pre-existing errors before proceeding with your task.

## After making changes

Run the build and tests to verify nothing is broken:

```
npm run build
npm test -- --run
```

Both must pass before committing. Never commit a broken build.

## Development workflow

- Branch: work on the branch specified in the task description
- Commit: clear, descriptive messages
- Push: `git push -u origin <branch>` when done
