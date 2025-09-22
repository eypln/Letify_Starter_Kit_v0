# n8n → Supabase Listing Update Mapping

Bu doküman, n8n workflow'larında üretilen verilerin Supabase'deki `listings` tablosuna nasıl yazılacağını ve HTTP Request node'larının nasıl yapılandırılacağını açıklar.

## API Endpoint

```
POST /api/listings/update
```

## Gönderilecek Alanlar
- `jobId` veya `listingId` (en az biri zorunlu)
- `images` (dizi, yüklenen resimler)
- `facebook_post_url` veya `fb_post_url` (Facebook post linki)
- `fb_reels_url` (Reels linki)
- `video_url` (Reels preview/video linki)
- `status` ("published" gibi, stepper tamamlanınca)

## Mapping ve Örnek Payloadlar

### 1. Facebook Post Adımı
- **n8n output:** `post_url`
- **Payload:**
```json
{
  "jobId": "{{ $json.jobId }}",
  "fb_post_url": "{{ $json.post_url }}"
}
```

### 2. Video Prepare (Reels Preview) Adımı
- **n8n output:** `reelsPreviewUrl`
- **Payload:**
```json
{
  "jobId": "{{ $json.jobId }}",
  "video_url": "{{ $json.reelsPreviewUrl }}"
}
```

### 3. Reels Publish Adımı
- **n8n output:** `reelPublishId` veya reels linki
- **Payload:**
```json
{
  "jobId": "{{ $json.jobId }}",
  "fb_reels_url": "{{ $json.reelPublishId }}"
}
```
veya
```json
{
  "jobId": "{{ $json.jobId }}",
  "fb_reels_url": "{{ $json.reels_url }}"
}
```

### 4. Resim Yükleme Adımı
- **n8n output:** `images` (dizi)
- **Payload:**
```json
{
  "jobId": "{{ $json.jobId }}",
  "images": {{ $json.images }}
}
```

### 5. Stepper Tamamlandığında (Final)
- **Payload:**
```json
{
  "jobId": "{{ $json.jobId }}",
  "status": "published"
}
```

## Notlar
- Sadece güncellenecek alanı göndermek yeterlidir.
- jobId ile ilgili satır bulunamazsa, `listingId` kullanılabilir.
- Tüm alanlar opsiyoneldir, birden fazla alan aynı anda güncellenebilir.

---

Her adımda n8n HTTP Request node'unu bu örneklere göre yapılandırabilirsiniz.
