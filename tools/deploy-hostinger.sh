#!/usr/bin/env bash
# Cập nhật nhánh "deploy" từ thư mục dist/ của commit hiện tại.
# Hostinger (hPanel → Git) kéo nhánh này về public_html.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
if ! git diff --quiet HEAD -- dist; then
  echo "dist/ còn thay đổi chưa commit. Hãy build và commit trước." >&2
  exit 1
fi
SHA=$(git subtree split --prefix dist HEAD)
git push origin "$SHA:refs/heads/deploy" --force
echo "Đã cập nhật nhánh deploy -> $SHA"
