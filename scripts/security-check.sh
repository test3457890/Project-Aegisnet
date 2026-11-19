#!/usr/bin/env bash
echo "Running Security Audit on AegisNet..."

echo "1. Auditing frontend dependencies..."
npm audit

echo "2. Auditing backend dependencies..."
cd services/api || exit 1
npm audit
cd ../../

echo "3. Scanning for common secrets (very basic heuristic)..."
grep -rinE "(password|secret|api_key|private_key|token) *[=:] *['\"][^'\"]{5,}['\"]" src/app/ services/api/src/ --exclude="*.test.ts" > .secrets_scan.tmp

if [ -s .secrets_scan.tmp ]; then
    echo "WARNING: Possible hardcoded secrets found!"
    cat .secrets_scan.tmp
else
    echo "✅ No obvious hardcoded secrets found."
fi
rm -f .secrets_scan.tmp

echo "Security check completed."
