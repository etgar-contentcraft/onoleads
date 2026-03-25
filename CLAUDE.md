# CLAUDE.md — Base Project Configuration

> This file defines the rules, standards, and workflow for every project.
> Customize the sections marked with `[EDIT THIS]` for each specific project.

---

## 📌 Project Overview

**Project Name:** [EDIT THIS]
**Description:** [EDIT THIS — what does this system do? Who is it for?]
**Stack / Tech Used:** [EDIT THIS — e.g. Node.js, React, Python, etc.]
**Owner:** [EDIT THIS]
**Last Updated:** [EDIT THIS]

---

## 📚 System Documentation

> A full explanation of what this system does, how it works, and how to develop it.
> Anyone who wants to contribute should read this section first.

### What This System Does

[EDIT THIS — describe the purpose of the system in plain language]

### How It Works

[EDIT THIS — describe the main components and how they connect]

### Folder Structure

```
/
├── src/           # Main source code
├── tests/         # All tests (unit + e2e)
├── docs/          # Additional documentation
├── .github/       # GitHub Actions workflows
├── CHANGELOG.md   # Full history of all changes
└── CLAUDE.md      # This file
```

### Key Concepts

[EDIT THIS — list any important terms, patterns, or decisions a developer needs to know]

---

## 📋 Changelog

> Every new feature, fix, or change must be logged here.
> Format: `[VERSION] YYYY-MM-DD — Short description`

| Version | Date   | Change                | Author |
| ------- | ------ | --------------------- | ------ |
| 0.1.0   | [DATE] | Initial project setup | [NAME] |

> ⚠️ Always update this table before opening a Pull Request.
> Also maintain a `CHANGELOG.md` file at the root of the project with full details.

---

## 🧹 Code Quality Standards

These rules apply to **every file, in every project, always.**

### Clean Code

- Keep functions small — one function does one thing
- Use clear, descriptive names for variables and functions (no `x`, `temp`, `data2`)
- Remove dead code — never leave commented-out code blocks
- Avoid deep nesting — maximum 3 levels of indentation
- Prefer readability over cleverness

### Documentation in Code

- Every function must have a comment explaining **what it does** and **why**
- Complex logic must have inline comments
- Every file must start with a 1–2 line comment describing its purpose
- Use this format for functions:

```javascript
/**
 * [What this function does]
 * @param {type} paramName - [description]
 * @returns {type} - [description]
 */
function myFunction(paramName) { ... }
```

```python
def my_function(param_name):
    """
    [What this function does]
    Args:
        param_name (type): description
    Returns:
        type: description
    """
```

### No Magic Numbers

- Never use raw numbers in logic — define named constants instead

```javascript
// ❌ Bad
if (retries > 3) { ... }

// ✅ Good
const MAX_RETRIES = 3;
if (retries > MAX_RETRIES) { ... }
```

---

## 🚀 Development Workflow

> This is a professional development process. Follow it for every change, no exceptions.

---

### 🧩 One-Time Setup (Do This First)

1. **Install Git and GitHub CLI (`gh`)**

2. **Authenticate with GitHub:**

   ```bash
   gh auth login
   ```

3. **Connect your project to GitHub:**

   ```bash
   git init
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

4. **Add automatic test runner (GitHub Actions):**

   Create this file: `.github/workflows/test.yml`

   ```yaml
   name: Run Tests

   on:
     pull_request:
       branches: [main]

   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Install dependencies
           run: npm install # change to: pip install -r requirements.txt for Python
         - name: Run tests
           run: npm test # change to: pytest for Python
   ```

   ✅ This ensures every Pull Request is automatically tested
   ❌ PRs cannot be merged if tests fail

---

### 🌿 Step 1 — Create a Branch

Never work directly on `main`.

```bash
git checkout -b feature/my-new-feature
```

Use clear branch names:

- `feature/add-login-page`
- `fix/broken-signup-form`
- `docs/update-readme`

---

### 💻 Step 2 — Make Your Changes

- Write clean code (see Code Quality Standards above)
- Document every function
- Keep changes focused — one branch = one feature or fix

---

### 🧪 Step 3 — Add Tests (Required)

Every change must include:

- **Unit tests** — test individual functions and logic
- **End-to-end (e2e) tests** — test real user flows from start to finish

No tests = no merge.

---

### 📝 Step 4 — Update the Changelog

Before committing, update the changelog table in this file **and** in `CHANGELOG.md`:

```markdown
## [0.2.0] - 2024-01-15

### Added

- User login page with email/password validation

### Fixed

- Broken redirect after signup

### Changed

- Renamed `user_data` to `userData` for consistency
```

---

### 💾 Step 5 — Commit and Push

```bash
git add .
git commit -m "Add: short description of what changed"
git push -u origin feature/my-new-feature
```

**Commit message format:**

- `Add: new feature description`
- `Fix: what was broken`
- `Update: what was changed`
- `Remove: what was deleted`
- `Docs: documentation change`

---

### 🔀 Step 6 — Open a Pull Request

```bash
gh pr create --base main --head feature/my-new-feature --fill
```

---

### 📋 Step 7 — Describe Your PR

Every Pull Request description must include:

```
## What was added
[describe the feature or fix]

## Why it was needed
[explain the reason]

## How it was tested
[describe what tests were written and what they check]

## Changelog updated?
- [ ] Yes — updated CLAUDE.md and CHANGELOG.md
```

---

### ⛔ Step 8 — Wait for Tests

- GitHub will run tests automatically on every PR
- If tests fail → fix them before continuing
- PR **cannot** be merged until all tests pass

---

### ✅ Step 9 — Review and Approve

Before merging, a reviewer must check:

- [ ] Code is clean and readable
- [ ] Every function is documented
- [ ] Tests exist and pass
- [ ] Changelog was updated
- [ ] Feature works as expected

Approve via GitHub CLI:

```bash
gh pr review --approve
```

Merge after approval:

```bash
gh pr merge --squash
```

---

### 🔄 Step 10 — Sync After Merge

After the PR is merged, update your local main:

```bash
git checkout main
git pull origin main
```

---

## 🔒 Rules — Non-Negotiable

| Rule                                          | Status       |
| --------------------------------------------- | ------------ |
| Never push directly to `main`                 | ❌ Forbidden |
| Never merge without passing tests             | ❌ Forbidden |
| Never skip writing tests                      | ❌ Forbidden |
| Always use Pull Requests                      | ✅ Required  |
| Always document your code                     | ✅ Required  |
| Always update the changelog                   | ✅ Required  |
| Always push to GitHub before ending a session | ✅ Required  |

---

## 🌐 Always Push to GitHub

At the end of every working session — even if the feature is not finished — push your current branch so all work is backed up and visible online:

```bash
git add .
git commit -m "WIP: short description of current progress"
git push
```

This ensures:

- Nothing is lost
- Work can be reviewed or continued from any device
- The team always sees current progress

---

## 📎 Notes for Claude

When helping with this project:

1. Always follow the workflow above — no shortcuts
2. Always write clean, documented code
3. Always suggest what tests need to be written
4. Always remind the user to update the changelog
5. Always end with the exact Git commands needed to push and sync
6. Explain every terminal command in plain language
7. Assume the user is non-technical — use simple, clear language
8. If something could break `main`, say so clearly before proceeding
9. Always push to the guthub account etgar-contentcraft. don't ask me to choose account
10. make sure it will push to https://onoleads.vercel.app/
