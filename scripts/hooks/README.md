# Git Hooks Setup

This directory contains git hooks for STORYMACHINE.

## Available Hooks

### pre-commit
Runs documentation quality checks on staged `.md` files before allowing commit.

**What it checks:**
- AI writing patterns in markdown files (using avoid-ai-writing Tier 1 patterns)
- Reports severity levels and suggested replacements

**Installation:**

**Option 1: Automatic (Recommended)**
```bash
npm run setup-hooks
```

**Option 2: Manual**
```bash
cp scripts/pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Bypass when needed:**
```bash
git commit --no-verify
```

Use `--no-verify` sparingly - only when you're confident the flagged patterns are legitimate.

---

## Hook Behavior

- **Skips** when no markdown files are staged
- **Skips** during merge/rebase operations
- **Runs** check-docs-quality.ts on staged .md files only
- **Blocks** commit if high-severity AI patterns found
- **Reports** findings with line numbers and suggestions

---

## Testing Hooks

Test the pre-commit hook without committing:

```bash
# Stage a markdown file
git add docs/test.md

# Run the hook manually
.git/hooks/pre-commit
```

---

## Disabling Hooks

**Temporarily (one commit):**
```bash
git commit --no-verify
```

**Permanently (not recommended):**
```bash
rm .git/hooks/pre-commit
```

---

## Hook Exit Codes

- **0:** All checks passed, commit allowed
- **1:** Issues found, commit blocked

---

## Related Files

- **Hook script:** `scripts/pre-commit.sh`
- **Doc checker:** `scripts/check-docs-quality.ts`
- **Setup script:** `npm run setup-hooks`
