#!/usr/bin/env bash
#
# STORYMACHINE Pre-Commit Hook
# Runs documentation quality checks before allowing commit
#
# Installation:
#   cp scripts/pre-commit.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Or use npm script:
#   npm run setup-hooks

set -e

echo "🔍 Running pre-commit checks..."

# Check if we're on a real commit (not during rebase/merge)
if [ -f .git/MERGE_HEAD ]; then
    echo "⚠️  Merge in progress, skipping pre-commit checks"
    exit 0
fi

# Get list of staged markdown files. NUL-delimited end to end (git diff -z,
# read -d '', an array) so a filename containing a space — e.g. anything
# under docs/brain/ — survives intact instead of being word-split into
# bogus path fragments (`docs/brain/Audits/Audit - 2026-07-14 High-End
# Audit.md` becoming seven separate nonexistent "files") and crashing
# check-docs-quality.ts with ENOENT/EISDIR instead of ever checking the doc.
STAGED_MD_FILES=()
while IFS= read -r -d '' f; do
    STAGED_MD_FILES+=("$f")
done < <(git diff --cached --name-only --diff-filter=ACM -z -- '*.md')

if [ ${#STAGED_MD_FILES[@]} -eq 0 ]; then
    echo "✓ No markdown files staged, skipping doc quality check"
    exit 0
fi

echo "📝 Checking documentation quality for staged .md files..."

# Run doc quality check on staged files
node --experimental-strip-types scripts/check-docs-quality.ts "${STAGED_MD_FILES[@]}"

# Check exit code
if [ $? -eq 0 ]; then
    echo "✓ Documentation quality check passed"
    exit 0
else
    echo ""
    echo "❌ Documentation quality check found issues"
    echo ""
    echo "Options:"
    echo "  1. Fix the flagged AI patterns in your markdown files"
    echo "  2. Run: git commit --no-verify (bypass checks - use sparingly)"
    echo "  3. Review findings and decide if they're false positives"
    echo ""
    exit 1
fi
