# Futures AI Mobile — Binance USDT-M Signal & Research Platform

<p align="center">
  <b>Android Mobile Application & AI Core for Binance USDT-M Futures Only</b><br>
  <i>Spot is strictly excluded. Chronological learning, multi-timeframe ensembles, professional mobile chart, and explainable signals.</i>
</p>

---

## 🚀 Genel Bakış (Overview)

**Futures AI**, Binance USDT-M Vadeli İşlemler (Futures) piyasası için özel olarak tasarlanmış, **kronolojik öğrenme (chronological learning)** ve **çoklu zaman dilimi (multi-timeframe)** mimarisine sahip yapay zeka araştırma, analiz, geriye dönük test (backtesting), sanal işlem (paper trading) ve sinyal üretim platformudur.

`MASTER_PROMPT_TR.md` ve `mobile_mockup.html` içerisindeki tüm görsel ve teknik şartlara harfiyen uygundur:
- **Kapsam:** Yalnızca Binance USDT-M Vadeli İşlemler. Spot desteği kesinlikle hariçtir.
- **Kullanıcı Girişi:** Login/Register ekranı yoktur; 2.0 saniyelik neon-orbit animasyonlu splash ile doğrudan başlar.
- **Arayüz Tasarımı:** Mobil görünüm yapısı (390×844) korunmuştur; masaüstü görünümüne dönüştürülmez.
- **Neon Orbit Görsel Dili:** Siyah arka plan (`#020307`), neon mor (`#a855f7`), camgöbeği (`#00e5ff`), neon yeşil (`#39ff88`), neon kırmızı (`#ff3158`), merkezde parlayan çekirdek ve dinamik parçacık yörüngeleri.
- **Çoklu Zaman Dilimi (MTF):** 1m, 3m, 5m, 15m, 30m, 1h, 4h, 1d.
- **Veri Saklama:** Birincil zaman serisi depolaması `data/{symbol}/{timeframe}/` altında **Apache Parquet** formatında tutulur; meta veriler **SQLite** ile izlenir. CSV birincil depolama olarak kullanılmaz.
- **Model Kayıt Defteri (Model Registry):** Kötü performans veren yeni modeller otomatik olarak reddedilir (`REJECTED`) ve önceki şampiyon model korunur.

---

## 📱 Ekranlar & Modüller

1. **Animated Splash (Açılış):** 2.0 saniyelik neon-orbit çekirdek animasyonu ve otomatik ana sayfaya geçiş.
2. **Home (Ana Sayfa):**
   - Canlı USDT-M ticker fiyatı, 24s değişim %, 24s En Yüksek/En Düşük, Fonlama Oranı (Funding Rate), Açık Pozisyon (OI) ve 24s Hacim.
   - Sistem Durumları: `DATA: PARQUET`, `MODELS: 4 ACTIVE`, `SIGNAL: ACTIVE`, `STREAM: 24ms`.
   - `NeonOrbitProgress` bileşeni ile eğitim önizlemesi.
   - Aktif Sinyal Kartı: `LONG`/`SHORT`, Skor `88/100`, Giriş, TP1 (%81 olasılık), TP2 (%63 olasılık), SL (%17 olasılık), R:R oranı, beklenen süre, piyasa rejimi ve gerekçe (rationale).
   - Tek tıkla Paper Trading işlemi açma.
3. **Training (13 Adımlı Kronolojik Eğitim):**
   - Parite ve çoklu zaman dilimi seçimi (1m - 1d).
   - Model Aileleri: Klasik ML (LightGBM, XGBoost, Random Forest) + Derin Öğrenme (LSTM).
   - 13 Adımlı Boru Hattı:
     1. Data check ➔ 2. Validation/normalization ➔ 3. Timeframe construction ➔ 4. Feature engineering ➔ 5. Indicator calculations ➔ 6. Label generation ➔ 7. Model training ➔ 8. Validation ➔ 9. Walk-forward evaluation ➔ 10. Backtest ➔ 11. Model evaluation ➔ 12. Checkpoint/registry ➔ 13. Ready.
   - %25, %50, %75, %100 adımlarıyla çalışan `NeonOrbitProgress`.
4. **Signals (Sinyal Tarayıcı & Geçmişi):**
   - Radar tarama modu.
   - Filtreler: Tümü, Sadece LONG, Sadece SHORT, Minimum Skor.
   - Açıklanabilir (explainable) çok faktörlü sinyal kartları.
   - Paper Trading entegrasyonu.
5. **Chart (Profesyonel Mobil Grafik):**
   - Mum (Candlestick), Heikin Ashi ve Çizgi grafikleri.
   - Sürükleyerek kaydırma (pan), yakınlaştırma (zoom), crosshair (artı gösterge).
   - Python hesaplamalı indikatörler: EMA 20, EMA 50, Bollinger Bantları, RSI (14) alt paneli.
   - Sinyal hedef seviyeleri (Giriş, TP1, TP2, SL) doğrudan mumların üzerinde kesikli neon çizgilerle gösterilir.
   - Yatay çizgi çizim aracı.
6. **Data Manager (Parquet Veri Yöneticisi):**
   - `data/{symbol}/{timeframe}/` Parquet bölümleri.
   - Eksik veri senkronizasyonu (Sync Missing).
7. **Model Registry (Model Kayıt Defteri):**
   - Aktif, arşivlenmiş ve reddedilmiş model versiyonları.
   - Kazanma oranı, kâr faktörü, Sharpe oranı ve max drawdown karşılaştırması.
8. **Backtest & Paper Trading:**
   - Binance vadeli işlem komisyonları (Maker %0.02, Taker %0.05), kayma (slippage) ve fonlama maliyeti hesabı.
   - $10,000 USDT sanal bakiye, anlık kâr/zarar, kaldıraçlı marjin ve pozisyon kapatma.
9. **Structured Logs (Yapılandırılmış Günlükler):**
   - Standart hata kodları (`UI-1001`, `DATA-2001`, `NETWORK-3001`, `TRAIN-6001`, `SIGNAL-8001` vb.).
   - Kategori ve önem derecesi filtreleme, arama çubuğu.
   - JSON, TXT ve CSV formatlarında dışa aktarma (export).

---

## 🛠️ Mimari ve Dizin Yapısı

```
Ai-Signal/
├── MASTER_PROMPT_TR.md      # Ana şartname belgesi
├── mobile_mockup.html       # Orijinal mobil HTML mockup
├── README.md                # Proje dokümantasyonu
├── requirements.txt         # Python bağımlılıkları
├── run.sh                   # Tek komutla başlatma betiği
├── ai_engine/               # Python Yapay Zeka & Vadeli Çekirdek
│   ├── indicators.py        # calculate_indicator(data, settings) standardı
│   ├── timeframe.py         # Sızıntısız kronolojik MTF birleştirici
│   ├── data_manager.py      # Apache Parquet & SQLite senkronizasyon yöneticisi
│   ├── models.py            # ML Ensemble & Model Registry
│   ├── signal_engine.py     # Açıklanabilir sinyal üretim motoru
│   ├── backtest.py          # Futures ücretleri ve Paper Trading motoru
│   └── logger.py            # Yapılandırılmış log ve hata kodu sistemi
├── server/
│   └── app.py               # FastAPI REST & Statik Mobil UI Sunucusu
├── web/                     # Mobil Web Arayüzü (390x844 Frame + Fullscreen)
│   ├── index.html           # Ana mobil uygulama kabuğu
│   ├── css/style.css        # Neon cyberpunk koyu tema stilleri
│   └── js/
│       ├── orbit.js         # Reusable NeonOrbitProgress bileşeni
│       ├── chart.js         # Canvas tabanlı profesyonel mobil grafik
│       ├── api.js           # REST API istemcisi
│       └── app.js           # Sayfa yönlendirmeleri ve olay yöneticisi
├── android/                 # Yerel Android Jetpack Compose Proje Yapısı
│   └── app/src/main/java/com/futuresai/signal/
│       ├── MainActivity.kt
│       ├── ui/components/NeonOrbitProgress.kt
│       ├── ui/screens/HomeScreen.kt
│       └── ui/theme/Color.kt
└── tests/                   # Otomasyon testleri
    ├── test_indicators.py
    ├── test_timeframe.py
    └── test_signals.py
```

---

## ⚡ Çalıştırma (Quick Start)

### 1. Bağımlılıkları Yükleyin:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Uygulamayı Başlatın:
```bash
./run.sh
```
Uygulama `http://0.0.0.0:8000` adresinde çalışacaktır. Tarayıcınızdan açarak canlı mobil simülasyonu doğrudan kullanabilirsiniz.

### 3. Testleri Çalıştırın:
```bash
PYTHONPATH=. pytest tests/
```
