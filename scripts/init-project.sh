#!/usr/bin/env bash
# 새 프로젝트 초기화: CLAUDE.md의 {PROJECT_NAME} 등 플레이스홀더를 치환한다.
# 사용법: bash scripts/init-project.sh "my-project" "홍길동"

set -euo pipefail

PROJECT_NAME="${1:-my-project}"
OWNER="${2:-$(git config user.name || echo 'unknown')}"
START_DATE="$(date +%Y-%m-%d)"

CLAUDE_MD="CLAUDE.md"
if [ ! -f "$CLAUDE_MD" ]; then
  echo "CLAUDE.md not found. Run this script from project root." >&2
  exit 1
fi

sed -i.bak \
  -e "s|{PROJECT_NAME}|$PROJECT_NAME|g" \
  -e "s|{OWNER}|$OWNER|g" \
  -e "s|{START_DATE}|$START_DATE|g" \
  "$CLAUDE_MD"
rm -f "$CLAUDE_MD.bak"

# docs 플레이스홀더 디렉토리 유지를 위해 .gitkeep 생성
for d in docs/prd docs/plans docs/design-reviews; do
  mkdir -p "$d"
  touch "$d/.gitkeep"
done

echo "✅ Initialized: $PROJECT_NAME (owner=$OWNER, date=$START_DATE)"
echo "→ 이제 CLAUDE.md 하단의 '프로젝트별 설정'에서 기술 스택을 채워주세요."
