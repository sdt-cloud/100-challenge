# 100 Challenge - GitHub Push Script
# Bu script görseli yerleştirir ve tüm değişiklikleri GitHub'a pushlar.

$sourceImage = "C:\Users\sedat\.gemini\antigravity\brain\e514a875-ae82-4a07-9298-82dd11bdd89f\100_challenge_hero_1775855691967.png"
$targetDir = "assets"
$targetImage = "assets\hero.png"

Write-Host "--- 100 Challenge Repo Geliştirme ---" -ForegroundColor Cyan

# 1. Assets klasörünü oluştur
if (!(Test-Path $targetDir)) {
    Write-Host "[+] Assets klasörü oluşturuluyor..."
    New-Item -ItemType Directory -Path $targetDir | Out-Null
}

# 2. Görseli kopyala
if (Test-Path $sourceImage) {
    Write-Host "[+] Banner görseli kopyalanıyor..."
    Copy-Item $sourceImage $targetImage -Force
} else {
    Write-Warning "[!] Kaynak görsel bulunamadı! Lütfen README'deki yolu kontrol edin."
}

# 3. Git işlemleri
Write-Host "[+] Değişiklikler paketleniyor (Git Add)..."
git add .

Write-Host "[+] Commit oluşturuluyor..."
git commit -m "Revitalize documentation and branding (Premium README, License, Hero Banner)"

Write-Host "[+] GitHub'a gönderiliyor (Git Push)..." -ForegroundColor Yellow
git push

Write-Host "`n--- İŞLEM TAMAMLANDI! ---" -ForegroundColor Green
Write-Host "GitHub deponu kontrol edebilirsin:)"
pause
