#!/bin/bash
# Clean Push Script - Ensures no nested git repositories

set -e

echo "🧹 Cleaning repository for safe push..."

# Step 1: Remove any nested .git directories
echo "Step 1: Removing nested .git directories..."
find adminui backend client -name ".git" -type d -exec rm -rf {} + 2>/dev/null || true

# Step 2: Remove from git cache if they exist as submodules
echo "Step 2: Cleaning git cache..."
git rm --cached adminui backend client 2>/dev/null || true

# Step 3: Add directories properly
echo "Step 3: Adding directories properly..."
git add adminui/ backend/ client/

# Step 4: Check status
echo ""
echo "Step 4: Repository status:"
git status --short | head -20

echo ""
echo "✅ Clean complete! Ready to commit and push."
echo ""
echo "To commit and push, run:"
echo "  git commit -m 'Clean push: ensure no nested repos'"
echo "  git push origin main"

