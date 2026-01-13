# SAP OpenUI5 OData Client

Bu proje, SAP OData servisleri ile etkileşime giren, modern SAP Fiori tasarımına sahip bir OpenUI5 uygulamasıdır.

## Özellikler

*   **Güvenli Giriş:** Basic Authentication ile güvenli kullanıcı girişi.
*   **Dinamik Proxy:**
    *   **Local:** Node.js Express proxy ile yerel geliştirmede CORS ve SSL sorunlarını aşma.
    *   **Vercel:** Serverless Function ile bulutta güvenli proxy katmanı.
*   **Dinamik Sunucu URL:** Giriş ekranından farklı SAP sunucularına bağlanabilme.
*   **Modern Arayüz:** SAP Fiori Horizon teması ve özelleştirilmiş CSS.
*   **CRUD İşlemleri:** Veri listeleme, detay görüntüleme, yeni kayıt ekleme (UI hazır, backend yetkisine bağlı).

## Kurulum ve Çalıştırma

### Gereksinimler

*   Node.js (v14 veya üzeri)
*   Git

### Yerel Geliştirme (Localhost)

1.  Projeyi klonlayın:
    ```bash
    git clone https://github.com/azizamerikali/sap-ui5-odata-app.git
    cd sap-ui5-odata-app
    ```

2.  Bağımlılıkları yükleyin:
    ```bash
    npm install
    ```

3.  Uygulamayı başlatın (Proxy ve Web Sunucusu aynı anda çalışır):
    ```bash
    npm start
    ```

4.  Tarayıcıda açın: `http://localhost:8080/index.html`

### Vercel Dağıtımı

Proje Vercel ile uyumludur. `vercel.json` dosyası gerekli yapılandırmayı içerir.

1.  GitHub reposunu Vercel'e bağlayın.
2.  Deploy edin.
3.  Vercel, `/api/sap/` yolunu otomatik olarak Serverless Function'a yönlendirecektir.

## Proje Yapısı

*   `webapp/`: OpenUI5 kaynak kodları (View, Controller, i18n, CSS).
*   `proxy.js`: Yerel geliştirme için Node.js proxy sunucusu.
*   `api/sap/`: Vercel için Serverless Proxy fonksiyonu.
*   `vercel.json`: Vercel yapılandırma dosyası.

## Kullanım

1.  **Giriş:** SAP kullanıcı adı ve şifrenizi girin.
2.  **Sunucu:** Varsayılan sunucu URL'si gelir, gerekirse değiştirebilirsiniz.
3.  **Liste:** Giriş başarılıysa kayıtlarınız listelenir.
4.  **Detay:** Bir kayda tıklayarak detaylarını görebilirsiniz.
