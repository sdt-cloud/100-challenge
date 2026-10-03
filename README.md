# 🚀 100 Challenge — Android & Web

<p align="center">
  <a href="https://github.com/sdt-cloud/100-challenge/releases/latest"><strong>📥 SON APK'YI İNDİR — ANDROID</strong></a>
</p>

**APK kurulum:** Yukarıdaki bağlantıyı Android telefonda aç → `100-Challenge.apk` dosyasını indir → dosyaya dokunup yükle. Android izin isterse bu kaynaktan uygulama yüklemeye izin ver. GitHub hesabı istemeden indirmen gerekirse README bağlantısını tarayıcıda aç; Actions artefact'i indirmek için GitHub oturumu isteyebilir.

## Bu sürümde
- Giriş/kayıt yok; listeler cihazda yerel saklanır.
- Keşfet: tüm küratörlü film, kitap, anime ve oyun listeleri uygulama paketiyle gelir ve internet gerekmeden açılır.
- İlk açılışta 22 hazır liste koleksiyona eklenir. Önceki APK'daki yerel listen varsa yeni sürüm onu korur ve eksik küratörlü listeleri ekler.
- Birden çok hedefi satır satır yapıştırıp topluca ekleme.
- **💾 Yedekle**: bütün yıl/listeleri JSON dosyası olarak dışa aktarır.
- **📂 Geri Yükle**: JSON yedeğini cihaza geri yükler. Geri yükleme mevcut kayıtların üzerine yazar; önce dışa aktarmanı öneririz.
- Filtreler, ilerleme yüzdesi, rastgele hedef seçimi ve açık/koyu tema.

## Yedekleme ve geri yükleme
Uygulamada üstteki **Yedekle** düğmesine basıp JSON dosyasını güvenli bir yere kaydet. Yeni telefonda veya uygulamayı yeniden kurduktan sonra **Geri Yükle** ile dosyayı seç. Yerel uygulama verileri uygulama kaldırıldığında silinebileceğinden düzenli yedek al.

## Toplu hedef ekleme
Bir listeyi aç, metin alanına her satıra bir hedef yaz/yapıştır ve **Ekle**'ye bas. Her satır ayrı hedef olur.

## Geliştirici / Build
- Vanilla JavaScript, HTML, CSS; Cordova Android wrapper
- Curated JSON listeleri `data/` altında. `build_data_bundle.py` bunları `data-bundle.js` içine paketleyerek Android WebView'de yerel JSON fetch kısıtlamalarını önler.
- GitHub Actions `main` branch'e her push'ta APK derler, Actions Artifact yükler ve test Release'ini günceller.
- Son yayınlar: [GitHub Releases](https://github.com/sdt-cloud/100-challenge/releases)
- Derlemeler: [GitHub Actions](https://github.com/sdt-cloud/100-challenge/actions)

## Geliştirme
```bash
git clone https://github.com/sdt-cloud/100-challenge.git
cd 100-challenge
python3 build_data_bundle.py
# Web sunucusu üzerinden açmak önerilir (özellikle JSON fallback için)
python3 -m http.server 8000
```

## Lisans
MIT — ayrıntı için [LICENSE](LICENSE).

---

# 🚀 100 Challenge — English

[📥 Download the latest Android APK](https://github.com/sdt-cloud/100-challenge/releases/latest)

This local-first app needs no account. Curated film, book, anime and game lists are bundled for offline Explore. Add many items by pasting one item per line. Use **Yedekle** to export all lists to JSON and **Geri Yükle** to restore a backup. Keep a backup before reinstalling; app-local data may be removed when the app is uninstalled.

The APK is built by GitHub Actions; see [Releases](https://github.com/sdt-cloud/100-challenge/releases) or [Actions](https://github.com/sdt-cloud/100-challenge/actions).

MIT License.
