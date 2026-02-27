# ═══════════════════════════════════════════════════════════════
# BuildFi — Organiser les fichiers du 27 fév dans le repo GitHub
# Exécuter depuis PowerShell dans le dossier racine du repo buildfi/
# ═══════════════════════════════════════════════════════════════

# --- CONFIGURATION ---
# Adapter ce chemin si ton dossier Téléchargements est ailleurs
$downloads = "$env:USERPROFILE\Downloads"
$repo = Get-Location  # Exécuter ce script DEPUIS le dossier buildfi/

# --- VÉRIFICATION ---
if (-not (Test-Path "$repo\planner.html")) {
    Write-Host "ERREUR: Ce script doit être exécuté depuis la racine du repo buildfi/" -ForegroundColor Red
    Write-Host "Fais: cd C:\chemin\vers\buildfi" -ForegroundColor Yellow
    exit 1
}

# --- CRÉER LES DOSSIERS ---
Write-Host "`n--- Création des dossiers ---" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "$repo\app\outils\dettes"
New-Item -ItemType Directory -Force -Path "$repo\assets"
Write-Host "OK: dossiers créés" -ForegroundColor Green

# --- LANDING PAGE ---
Write-Host "`n--- Landing page v9 ---" -ForegroundColor Cyan
$landingSource = Get-ChildItem "$downloads\landing page*" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $landingSource) {
    $landingSource = Get-ChildItem "$downloads\index-v9*" -ErrorAction SilentlyContinue | Select-Object -First 1
}
if ($landingSource) {
    Copy-Item $landingSource.FullName "$repo\public\index.html" -Force
    Write-Host "OK: $($landingSource.Name) -> public/index.html" -ForegroundColor Green
} else {
    Write-Host "SKIP: landing page non trouvée dans Downloads" -ForegroundColor Yellow
}

# --- DEBT TOOL ---
Write-Host "`n--- Debt tool ---" -ForegroundColor Cyan
$debtSource = Get-ChildItem "$downloads\debt-tool.*" -Exclude "*.js" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $debtSource) {
    $debtSource = Get-ChildItem "$downloads\debt-tool.jsx" -ErrorAction SilentlyContinue | Select-Object -First 1
}
if ($debtSource) {
    # Ajouter "use client"; en première ligne si pas déjà là
    $content = Get-Content $debtSource.FullName -Raw
    if ($content -notmatch '^"use client"') {
        $content = "`"use client`";`n" + $content
    }
    Set-Content -Path "$repo\app\outils\dettes\page.tsx" -Value $content -Encoding UTF8
    Write-Host "OK: $($debtSource.Name) -> app/outils/dettes/page.tsx (avec 'use client')" -ForegroundColor Green
} else {
    Write-Host "SKIP: debt-tool non trouvé dans Downloads" -ForegroundColor Yellow
}

# --- DEBT TOOL TESTS ---
Write-Host "`n--- Debt tool tests ---" -ForegroundColor Cyan
$testsSource = Get-ChildItem "$downloads\debt-tool-tests.js" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($testsSource) {
    Copy-Item $testsSource.FullName "$repo\app\outils\dettes\tests.js" -Force
    Write-Host "OK: debt-tool-tests.js -> app/outils/dettes/tests.js" -ForegroundColor Green
} else {
    Write-Host "SKIP: debt-tool-tests.js non trouvé dans Downloads" -ForegroundColor Yellow
}

# --- GUIDES PDF ---
Write-Host "`n--- Guides PDF ---" -ForegroundColor Cyan
$guide101 = Get-ChildItem "$downloads\guide-101*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($guide101) {
    Copy-Item $guide101.FullName "$repo\assets\guide-101-les-bases-de-vos-finances.pdf" -Force
    Write-Host "OK: $($guide101.Name) -> assets/guide-101-les-bases-de-vos-finances.pdf" -ForegroundColor Green
} else {
    Write-Host "SKIP: guide-101 non trouvé dans Downloads" -ForegroundColor Yellow
}

$guide201 = Get-ChildItem "$downloads\guide-201*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($guide201) {
    Copy-Item $guide201.FullName "$repo\assets\guide-201-optimiser-votre-retraite.pdf" -Force
    Write-Host "OK: $($guide201.Name) -> assets/guide-201-optimiser-votre-retraite.pdf" -ForegroundColor Green
} else {
    Write-Host "SKIP: guide-201 non trouvé dans Downloads" -ForegroundColor Yellow
}

# --- ROBOTS.TXT ---
Write-Host "`n--- robots.txt ---" -ForegroundColor Cyan
$robotsContent = @"
User-agent: *
Allow: /
Disallow: /outils/
Disallow: /api/
Disallow: /assets/
"@
Set-Content -Path "$repo\public\robots.txt" -Value $robotsContent -Encoding UTF8
Write-Host "OK: public/robots.txt créé (Disallow /outils/, /api/, /assets/)" -ForegroundColor Green

# --- RÉSUMÉ ---
Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Get-ChildItem "$repo\public\index.html" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  public/index.html           $([math]::Round($_.Length/1KB))KB" }
Get-ChildItem "$repo\app\outils\dettes\page.tsx" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  app/outils/dettes/page.tsx  $([math]::Round($_.Length/1KB))KB" }
Get-ChildItem "$repo\app\outils\dettes\tests.js" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  app/outils/dettes/tests.js  $([math]::Round($_.Length/1KB))KB" }
Get-ChildItem "$repo\assets\*.pdf" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  assets/$($_.Name)  $([math]::Round($_.Length/1KB))KB" }
Get-ChildItem "$repo\public\robots.txt" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  public/robots.txt           $([math]::Round($_.Length/1KB))KB" }

Write-Host ""
Write-Host "  Prochaine étape:" -ForegroundColor Yellow
Write-Host "    git add ." -ForegroundColor White
Write-Host "    git commit -m 'feat: landing v9, debt tool, guides PDF, robots.txt'" -ForegroundColor White
Write-Host "    git push" -ForegroundColor White
Write-Host ""

# --- NOTE app/page.tsx ---
if (Test-Path "$repo\app\page.tsx") {
    Write-Host "  ⚠️  app/page.tsx existe encore (redirige vers quiz)." -ForegroundColor Yellow
    Write-Host "     Si tu veux que buildfi.ca affiche la landing page," -ForegroundColor Yellow
    Write-Host "     supprime ou renomme app/page.tsx après le push." -ForegroundColor Yellow
    Write-Host ""
}
