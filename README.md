# SAP OpenUI5 OData Client

Bu proje, SAP OData servisleri ile etkileşime giren, modern SAP Fiori tasarımına sahip bir OpenUI5 uygulamasıdır. Hem **SAP BTP Cloud Foundry** ortamında hem de **yerel geliştirme** ortamında çalıştırılabilir.

## Özellikler

*   **Güvenli Giriş:** Basic Authentication ile güvenli kullanıcı girişi.
*   **Çift Çalışma Modu:** Hem SAP BTP'de hem de lokalde sorunsuz çalışır.
*   **Dinamik Sunucu URL:** Giriş ekranından farklı SAP sunucularına bağlanabilme.
*   **Modern Arayüz:** SAP Fiori Horizon teması ve özelleştirilmiş CSS.
*   **CRUD İşlemleri:** Veri listeleme, detay görüntüleme, yeni kayıt ekleme.

---

## Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           KULLANICI TARAYICISI                          │
│                         (UI5 Uygulaması - index.html)                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
    ┌───────────────────────────┐   ┌───────────────────────────────────┐
    │     YEREL GELİŞTİRME      │   │      SAP BTP CLOUD FOUNDRY        │
    │   (npm run start-local)   │   │    (cf deploy ile dağıtım)        │
    ├───────────────────────────┤   ├───────────────────────────────────┤
    │  http-server (port 8080)  │   │  AppRouter (sap-ui5-odata-app-    │
    │  → UI5 statik dosyalar    │   │  router) → HTML5 Repo Runtime     │
    │                           │   │                                   │
    │  proxy.js (port 3000)     │   │  Connectivity Service             │
    │  → SAP backend proxy      │   │  → Cloud Connector Tunnel         │
    │  → Doğrudan internet      │   │  → OnPremise SAP Backend          │
    └───────────────────────────┘   └───────────────────────────────────┘
                    │                               │
                    ▼                               ▼
    ┌───────────────────────────┐   ┌───────────────────────────────────┐
    │   SAP Backend (Internet)  │   │   SAP Backend (OnPremise/VPN)     │
    │  https://78.186.247.89... │   │   http://10.0.1.210:44300         │
    └───────────────────────────┘   └───────────────────────────────────┘
```

---

## 1. Yerel Geliştirme (Local Development)

### Nasıl Çalışır?

Yerel geliştirmede iki bileşen paralel olarak çalışır:

| Bileşen | Port | Görevi |
|---------|------|--------|
| `http-server` | 8080 | UI5 statik dosyalarını sunar (`webapp/` klasörü) |
| `proxy.js` | 3000 | SAP backend'e istekleri proxy'ler, CORS ve SSL sorunlarını aşar |

**Akış:**
1. Tarayıcı → `localhost:8080/index.html` (UI5 uygulaması)
2. UI5 uygulaması → `localhost:3000/sap/...` (proxy)
3. Proxy → `https://78.186.247.89:44302/sap/...` (SAP backend)

### Kurulum

```bash
# 1. Projeyi klonlayın
git clone https://github.com/azizamerikali/sap-ui5-odata-app.git
cd sap-ui5-odata-app

# 2. Bağımlılıkları yükleyin
npm install

# 3. Uygulamayı başlatın
npm run start-local
```

### Erişim

Tarayıcıda açın: `http://localhost:8080/index.html`

### Proxy Yapılandırması

`proxy.js` dosyasındaki `DEFAULT_SAP_URL` değişkenini ihtiyacınıza göre değiştirebilirsiniz:

```javascript
const DEFAULT_SAP_URL = 'https://78.186.247.89:44302/sap/opu/odata/sap/YMONO_AKT_PLN_SRV';
```

---

## 2. SAP BTP Cloud Foundry Dağıtımı

### Nasıl Çalışır?

BTP ortamında uygulama şu servislerle entegre çalışır:

| Servis | Görevi |
|--------|--------|
| **AppRouter** | İstekleri yönlendirir, kimlik doğrulama yapar |
| **HTML5 Application Repository** | UI5 statik dosyalarını barındırır |
| **Destination Service** | Backend hedeflerini yönetir |
| **Connectivity Service** | Cloud Connector üzerinden OnPremise erişimi sağlar |
| **XSUAA** | Kimlik doğrulama ve yetkilendirme |

**Akış:**
1. Kullanıcı → AppRouter URL (BTP login)
2. AppRouter → HTML5 Repo Runtime (UI5 dosyaları)
3. AppRouter → Destination Service ("MBP" destination)
4. Connectivity Service → Cloud Connector → OnPremise SAP

### Ön Koşullar

*   SAP BTP Trial veya Enterprise hesabı
*   Cloud Foundry CLI (`cf`)
*   MTA Build Tool (`mbt`)
*   Cloud Connector kurulu ve yapılandırılmış

### BTP Cockpit Yapılandırması

#### 1. Destination Oluşturma

BTP Cockpit → Connectivity → Destinations → Create Destination:

| Alan | Değer |
|------|-------|
| Name | `MBP` |
| Type | HTTP |
| URL | `http://10.0.1.210:44300` |
| Proxy Type | OnPremise |
| Authentication | BasicAuthentication |
| User | SAP kullanıcı adı |
| Password | SAP şifresi |

#### 2. Cloud Connector Yapılandırması

Cloud Connector Admin Console'da:
1. "Cloud to On-Premise" → Mapping ekle
2. Virtual Host: `10.0.1.210:44300`
3. Resources: `/sap` (Path and all sub-paths)

### Derleme ve Dağıtım

```bash
# 1. MTA arşivi oluştur
mbt build

# 2. BTP'ye deploy et
cf deploy mta_archives/sap-ui5-odata-app_1.0.0.mtar
```

### Erişim

Deploy sonrası verilen URL:
```
https://00148a26trial-dev-sap-ui5-odata-app-router.cfapps.us10-001.hana.ondemand.com/sapuidemoodata/index.html
```

### SAP Oturumu Sonlandırma (Logoff)

Uygulama çıkış işlemi sırasında SAP backend oturumunu da sonlandırır:

```
┌────────────────────────────────────────────────────────┐
│  Çıkış Yap Butonu                                      │
│         │                                              │
│         ▼                                              │
│  fetch("/sap/public/bc/icf/logoff")                    │
│         │                                              │
│         ▼                                              │
│  SAP Backend Session Sonlandırılır                     │
│         │                                              │
│         ▼                                              │
│  OData Model Yok Edilir → Login Sayfasına Yönlendir    │
└────────────────────────────────────────────────────────┘
```

**İlgili Dosya:** `webapp/controller/Worklist.controller.js` → `onLogout()` fonksiyonu

---

## Proje Yapısı

```
sap-ui5-odata-app/
├── webapp/                    # UI5 kaynak kodları
│   ├── controller/            # Controller dosyaları
│   ├── view/                  # XML View dosyaları
│   ├── i18n/                  # Çoklu dil dosyaları
│   ├── css/                   # Stil dosyaları
│   ├── manifest.json          # UI5 uygulama tanımı
│   ├── xs-app.json            # AppRouter route tanımları
│   └── test_destination.html  # Backend bağlantı test aracı
├── router/                    # Standalone AppRouter (BTP)
│   ├── package.json
│   └── xs-app.json            # Router route tanımları
├── proxy.js                   # Yerel geliştirme proxy sunucusu
├── mta.yaml                   # MTA deployment tanımı
├── xs-security.json           # XSUAA yapılandırması
├── package.json               # NPM bağımlılıkları ve scriptler
└── ui5.yaml                   # UI5 Tooling yapılandırması
```

---

## Test Aracı: test_destination.html

`webapp/test_destination.html` dosyası, backend (OData) bağlantısını test etmek için kullanılan bir tanılama aracıdır.

### Amaç

*   BTP veya Local ortamda backend'e erişimi doğrulamak
*   AppRouter routing konfigürasyonunu test etmek
*   Cloud Connector ve Destination yapılandırma hatalarını tespit etmek

### Nasıl Çalışır?

```
┌─────────────────────────────────────────────────────────────┐
│              test_destination.html                          │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  "Test Connection" Butonu                           │   │
│   │         │                                           │   │
│   │         ▼                                           │   │
│   │  fetch("/sap/opu/odata/sap/YMONO_AKT_PLN_SRV/$metadata")│
│   │         │                                           │   │
│   │         ▼                                           │   │
│   │  ┌─────────────────────────────────────────────┐    │   │
│   │  │ Local: proxy.js → SAP Backend              │    │   │
│   │  │ BTP: AppRouter → Destination → Backend     │    │   │
│   │  └─────────────────────────────────────────────┘    │   │
│   │         │                                           │   │
│   │         ▼                                           │   │
│   │  Response: Status, Headers, Body (ilk 500 karakter) │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Kullanım

| Ortam | Erişim URL'si |
|-------|---------------|
| Local | `http://localhost:8080/test_destination.html` |
| BTP | `https://<router-url>/sapuidemoodata/test_destination.html` |

### Sonuç Yorumlama

| Status | Anlam | Çözüm |
|--------|-------|-------|
| **200 OK** | Bağlantı başarılı | - |
| **401 Unauthorized** | Kimlik doğrulama hatası | SAP kullanıcı/şifre veya Destination auth ayarları |
| **403 Forbidden** | Erişim engellendi | Cloud Connector'da kaynak izni (`/sap`) |
| **500 Internal Server Error** | Sunucu hatası | Connectivity Service bağlı mı? Destination var mı? |
| **502 Bad Gateway** | Proxy hatası | Backend URL doğru mu? Sunucu erişilebilir mi? |

---

## NPM Komutları

| Komut | Açıklama |
|-------|----------|
| `npm run start-local` | Proxy + HTTP Server (yerel geliştirme) |
| `npm run proxy` | Sadece proxy sunucusunu başlatır |
| `npm run serve` | Sadece HTTP server başlatır |
| `npm run build:cf` | UI5 uygulamasını derler (`dist/`) |
| `npm run build:zip` | Derleme + ZIP oluşturma (BTP deploy için) |

---

## Sorun Giderme

### Local: CORS Hatası
Proxy çalışıyor mu kontrol edin: `http://localhost:3000/health`

### BTP: 403 Access Denied
Cloud Connector'da ilgili kaynağa (`/sap`) erişim izni verildiğinden emin olun.

### BTP: 500 Internal Server Error
Connectivity Service'in router'a bağlı olduğunu kontrol edin (`mta.yaml`).

### BTP: Destination Bulunamadı
BTP Cockpit'te "MBP" adında bir destination tanımlı olduğundan emin olun.

---

## Lisans

MIT License
