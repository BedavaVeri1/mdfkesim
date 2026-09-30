# L-Tipi Parçalı Kesim ve Bölüm Derinliklerinin Düzeltilmesi

Bu planda, "Dış Dikmeleri Parçala" (L kesim) özelliği aktif edildiğinde oluşan üç temel mantık hatası düzeltilecektir.

## Proposed Changes

### 1. script.js (Kesim Listesi Mantığı)
#### [MODIFY] script.js
- **Yan Dikme Gruplama (Akıllı Birleştirme):** `splitSides` açıkken her bölüm için ayrı yanak kesmek yerine, bitişik olan ve derinliği aynı olan bölümlerin yükseklikleri toplanıp tek bir yan dikme çıkarılacak.
- **Orta Dikmeler ve Raflar:** Bölüm döngüsü içerisinde hesaplanan Orta Dikme ve Sabit/Hareketli Rafların derinliği artık genel `global_d` yerine, o bölümün kendi derinliği (`secD`) baz alınarak hesaplanacak.
- **Üst Tabla:** Kesim listesinde Üst Tablanın derinliği, en üstteki bölümün derinliğine eşitlenecek.

### 2. 3d-viewer.js (3D Çizim Motoru)
#### [MODIFY] 3d-viewer.js
- **Derinliğe Göre Z-Ekseni Kaydırması (Hizalama):** 3D uzayda tüm objeler merkeze (Z=0) dizilir. Eğer bir bölüm 300mm ise, 600mm'lik ana gövdenin arkasına sıfır hizalanması için bölümün içerikleri Z ekseninde geriye doğru kaydırılacak (`secZOffset = (global_d - secD) / 2`).
- **Yan Dikme Gruplama Çizimi:** Çizgisel iz (hairline) kalmaması için 3D çizimde de yan dikmeler akıllı gruplamaya göre çizilecek.
- **Kapaklar:** Kapakların Z eksenindeki konumu, genel dolabın önü yerine, kendi bölümünün (`secD`) ön sınırına hizalanacak.
- **Üst Tabla ve Taç:** Üst tabla ve tacın derinliği en üst bölümün derinliği (`topSecD`) olarak güncellenecek ve arkaya hizalanacak.

## Verification Plan
Değişiklikler yapıldıktan sonra Vercel üzerinden "Dış Dikmeleri Parçala" özelliği açılarak:
1. Aynı derinliğe sahip 1. ve 2. bölümlerin tek bir yanak olarak listeye/çizime yansıdığı,
2. Dar olan 3. bölümdeki iç rafların, dikmelerin ve kapakların dışarı taşmadığı,
3. Üst tabla ve tacın 3. bölüme uyumlu şekilde daraldığı doğrulanacaktır.
