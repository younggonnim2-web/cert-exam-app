# init-project.ps1
# 새 프로젝트 초기화: CLAUDE.md의 {PROJECT_NAME} 등 플레이스홀더를 치환한다.
# 사용법:
#   powershell -ExecutionPolicy Bypass -File scripts/init-project.ps1 -ProjectName "my-project" -Owner "홍길동"
# 또는 PowerShell 안에서:
#   .\scripts\init-project.ps1 -ProjectName "my-project" -Owner "홍길동"

param(
    [string]$ProjectName = "my-project",
    [string]$Owner = ""
)

$ErrorActionPreference = "Stop"

# Owner 미지정 시 git config에서 가져오기
if ([string]::IsNullOrWhiteSpace($Owner)) {
    try {
        $Owner = (git config user.name).Trim()
    } catch {
        $Owner = "unknown"
    }
    if ([string]::IsNullOrWhiteSpace($Owner)) { $Owner = "unknown" }
}

$StartDate = Get-Date -Format "yyyy-MM-dd"
$ClaudeMd = "CLAUDE.md"

if (-not (Test-Path $ClaudeMd)) {
    Write-Error "CLAUDE.md not found. Run this script from project root."
    exit 1
}

# CLAUDE.md 치환
$content = Get-Content $ClaudeMd -Raw -Encoding UTF8
$content = $content -replace '\{PROJECT_NAME\}', $ProjectName
$content = $content -replace '\{OWNER\}', $Owner
$content = $content -replace '\{START_DATE\}', $StartDate
Set-Content -Path $ClaudeMd -Value $content -Encoding UTF8 -NoNewline

# docs 하위 폴더에 .gitkeep 생성
$docsDirs = @("docs/prd", "docs/plans", "docs/design-reviews")
foreach ($d in $docsDirs) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
    }
    $keep = Join-Path $d ".gitkeep"
    if (-not (Test-Path $keep)) {
        New-Item -ItemType File -Path $keep -Force | Out-Null
    }
}

Write-Host "[OK] Initialized: $ProjectName (owner=$Owner, date=$StartDate)" -ForegroundColor Green
Write-Host "-> CLAUDE.md 하단의 '프로젝트별 설정'에서 기술 스택을 채워주세요." -ForegroundColor Yellow
