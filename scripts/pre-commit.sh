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

# Get list of staged markdown files
STAGED_MD_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.md$' || true)

if [ -z "$STAGED_MD_FILES" ]; then
    echo "✓ No markdown files staged, skipping doc quality check"
    exit 0
fi

echo "📝 Checking documentation quality for staged .md files..."

# Run doc quality check on staged files
node --experimental-strip-types scripts/check-docs-quality.ts $STAGED_MD_FILES

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
