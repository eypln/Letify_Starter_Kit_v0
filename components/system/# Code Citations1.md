# Code Citations

## License: unknown
https://github.com/BasudevBharatBhushan/kibiz-n8n-docker-compose/blob/2a4a959a0cd31d319c068e24c3b159144ecf4ecb/kibiz-n8n-data.sql

```


Tebrikler, Triage Agent tamam! Şimdi Layer 2'nin ilk uzman ajanını yapalım: **Social Media Brain**.

## Konsept

Bu workflow, Triage'da "Social Media" kategorisine atanan her içeriği derinlemesine analiz edip, bilgiyi yapılandırılmış bir "beyin"e dönüştürür. Her yeni içerik beyni besler ve zenginleştirir.

### Akış Diyagramı
```
⏰ Her 5dk → 📋 Notion: "Social Media" + "Done" al (1 adet)
                    ↓
             📝 Status → "Deep Analysis"
                    ↓
             🎬 Apify: Video/Post meta al
                    ↓
             🔄 Code: Medya indir + Gemini body hazırla (UZMAN PROMPT)
                    ↓
             🧠 Gemini: Derinlemesine SM analizi
                    ↓
             📊 Code: Yanıtı parse et
                    ↓
             ✅ Notion: AI Brain Analysis + Status → "Analyzed" yaz
```

### Gemini'ye gönderilen UZMAN PROMPT

Gemini'den sadece kategori değil, **yapılandırılmış strateji bilgisi** çıkaracağız:

İşte tam workflow JSON'u:

```json
{
  "name": "🧠 Social Media Brain - Derin Analiz",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 5
            }
          ]
        }
      },
      "id": "sm-0001",
      "name": "⏰ Her 5 Dakika",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [-288, 80]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "getAll",
        "databaseId": {
          "__rl": true,
          "value": "a66165cd-5be6-43ac-a2dc-4b370e85de9c",
          "mode": "list",
          "cachedResultName": "Links for AI Agent Brain",
          "cachedResultUrl": "https://www.notion.so/a66165cd5be643aca2dc4b370e85de9c"
        },
        "limit": 1,
        "filterType": "manual",
        "filters": {
          "conditions": [
            {
              "key": "Status|status",
              "condition": "equals",
              "statusValue": "Done"
            },
            {
              "key": "Tags|multi_select",
              "condition": "contains",
              "multiSelectValue": "Social Media"
            }
          ],
          "combinator": "and"
        },
        "options": {
          "downloadFiles": false
        }
      },
      "id": "sm-0002",
      "name": "📋 Notion - SM İçerik Al",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [-64, 80],
      "credentials": {
        "notionApi": {
          "id": "e4tmmqbaPyONZSTY",
          "name": "Notion account"
        }
      }
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "update",
        "pageId": {
          "__rl": true,
          "value": "={{ $('📋 Notion - SM İçerik Al').item.json.id }}",
          "mode": "id"
        },
        "propertiesUi": {
          "propertyValues": [
            {
              "key": "Status|status",
              "statusValue": "In progress"
            }
          ]
        },
        "options": {}
      },
      "id": "sm-0003",
      "name": "📝 Status → Deep Analysis",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [208, 80],
      "credentials": {
        "notionApi": {
          "id": "e4tmmqbaPyONZSTY",
          "name": "Notion account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const url = $('📋 Notion - SM İçerik Al').first().json.property_url || '';\n\nconst platformMap = {\n  instagram: {\n    actorId: 'shu8hvrXbJbY3Eb9W',\n    bodyKey: 'directUrls',\n    platform: 'instagram'\n  },\n  facebook: {\n    actorId: 'PBJEdJdctLHQaqdfe',\n    bodyKey: 'startUrls',\n    platform: 'facebook'\n  },\n  youtube: {\n    actorId: 'h7sDV53CddomktSi5',\n    bodyKey: 'startUrls',\n    platform: 'youtube'\n  },\n  tiktok: {\n    actorId: '7200360993149553925',\n    bodyKey: 'postURLs',\n    platform: 'tiktok'\n  }\n};\n\nlet detected = 'unknown';\nif (url.includes('instagram.com')) detected = 'instagram';\nelse if (url.includes('facebook.com') || url.includes('fb.watch')) detected = 'facebook';\nelse if (url.includes('youtube.com') || url.includes('youtu.be')) detected = 'youtube';\nelse if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) detected = 'tiktok';\n\nconst config = platformMap[detected];\n\nif (!config) {\n  return [{ json: { error: true, platform: 'unknown', url, message: 'Desteklenmeyen platform: ' + url } }];\n}\n\nconst apifyToken = 'ENV_APIFY_TOKEN';\nconst apifyUrl = `https://api.apify.com/v2/acts/${config.actorId}/run-sync-get-dataset-items?token=${apifyToken}`;\n\nlet requestBody = {};\nif (detected === 'instagram') requestBody = { directUrls: [url], resultsType: 'posts' };\nelse if (detected === 'facebook') requestBody = { startUrls: [{ url }] };\nelse if (detected === 'youtube') requestBody = { startUrls: [{ url }], maxResults: 1 };\nelse if (detected === 'tiktok') requestBody = { postURLs: [url] };\n\nreturn [{ json: { error: false, platform: detected, url, apifyUrl, requestBody } }];"
      },
      "id": "sm-0004",
      "name": "🔀 Platform Tespit",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [464, 80]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $json.apifyUrl }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify($json
```


## License: unknown
https://github.com/BasudevBharatBhushan/kibiz-n8n-docker-compose/blob/2a4a959a0cd31d319c068e24c3b159144ecf4ecb/kibiz-n8n-data.sql

```


Tebrikler, Triage Agent tamam! Şimdi Layer 2'nin ilk uzman ajanını yapalım: **Social Media Brain**.

## Konsept

Bu workflow, Triage'da "Social Media" kategorisine atanan her içeriği derinlemesine analiz edip, bilgiyi yapılandırılmış bir "beyin"e dönüştürür. Her yeni içerik beyni besler ve zenginleştirir.

### Akış Diyagramı
```
⏰ Her 5dk → 📋 Notion: "Social Media" + "Done" al (1 adet)
                    ↓
             📝 Status → "Deep Analysis"
                    ↓
             🎬 Apify: Video/Post meta al
                    ↓
             🔄 Code: Medya indir + Gemini body hazırla (UZMAN PROMPT)
                    ↓
             🧠 Gemini: Derinlemesine SM analizi
                    ↓
             📊 Code: Yanıtı parse et
                    ↓
             ✅ Notion: AI Brain Analysis + Status → "Analyzed" yaz
```

### Gemini'ye gönderilen UZMAN PROMPT

Gemini'den sadece kategori değil, **yapılandırılmış strateji bilgisi** çıkaracağız:

İşte tam workflow JSON'u:

```json
{
  "name": "🧠 Social Media Brain - Derin Analiz",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 5
            }
          ]
        }
      },
      "id": "sm-0001",
      "name": "⏰ Her 5 Dakika",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [-288, 80]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "getAll",
        "databaseId": {
          "__rl": true,
          "value": "a66165cd-5be6-43ac-a2dc-4b370e85de9c",
          "mode": "list",
          "cachedResultName": "Links for AI Agent Brain",
          "cachedResultUrl": "https://www.notion.so/a66165cd5be643aca2dc4b370e85de9c"
        },
        "limit": 1,
        "filterType": "manual",
        "filters": {
          "conditions": [
            {
              "key": "Status|status",
              "condition": "equals",
              "statusValue": "Done"
            },
            {
              "key": "Tags|multi_select",
              "condition": "contains",
              "multiSelectValue": "Social Media"
            }
          ],
          "combinator": "and"
        },
        "options": {
          "downloadFiles": false
        }
      },
      "id": "sm-0002",
      "name": "📋 Notion - SM İçerik Al",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [-64, 80],
      "credentials": {
        "notionApi": {
          "id": "e4tmmqbaPyONZSTY",
          "name": "Notion account"
        }
      }
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "update",
        "pageId": {
          "__rl": true,
          "value": "={{ $('📋 Notion - SM İçerik Al').item.json.id }}",
          "mode": "id"
        },
        "propertiesUi": {
          "propertyValues": [
            {
              "key": "Status|status",
              "statusValue": "In progress"
            }
          ]
        },
        "options": {}
      },
      "id": "sm-0003",
      "name": "📝 Status → Deep Analysis",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [208, 80],
      "credentials": {
        "notionApi": {
          "id": "e4tmmqbaPyONZSTY",
          "name": "Notion account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const url = $('📋 Notion - SM İçerik Al').first().json.property_url || '';\n\nconst platformMap = {\n  instagram: {\n    actorId: 'shu8hvrXbJbY3Eb9W',\n    bodyKey: 'directUrls',\n    platform: 'instagram'\n  },\n  facebook: {\n    actorId: 'PBJEdJdctLHQaqdfe',\n    bodyKey: 'startUrls',\n    platform: 'facebook'\n  },\n  youtube: {\n    actorId: 'h7sDV53CddomktSi5',\n    bodyKey: 'startUrls',\n    platform: 'youtube'\n  },\n  tiktok: {\n    actorId: '7200360993149553925',\n    bodyKey: 'postURLs',\n    platform: 'tiktok'\n  }\n};\n\nlet detected = 'unknown';\nif (url.includes('instagram.com')) detected = 'instagram';\nelse if (url.includes('facebook.com') || url.includes('fb.watch')) detected = 'facebook';\nelse if (url.includes('youtube.com') || url.includes('youtu.be')) detected = 'youtube';\nelse if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) detected = 'tiktok';\n\nconst config = platformMap[detected];\n\nif (!config) {\n  return [{ json: { error: true, platform: 'unknown', url, message: 'Desteklenmeyen platform: ' + url } }];\n}\n\nconst apifyToken = 'ENV_APIFY_TOKEN';\nconst apifyUrl = `https://api.apify.com/v2/acts/${config.actorId}/run-sync-get-dataset-items?token=${apifyToken}`;\n\nlet requestBody = {};\nif (detected === 'instagram') requestBody = { directUrls: [url], resultsType: 'posts' };\nelse if (detected === 'facebook') requestBody = { startUrls: [{ url }] };\nelse if (detected === 'youtube') requestBody = { startUrls: [{ url }], maxResults: 1 };\nelse if (detected === 'tiktok') requestBody = { postURLs: [url] };\n\nreturn [{ json: { error: false, platform: detected, url, apifyUrl, requestBody } }];"
      },
      "id": "sm-0004",
      "name": "🔀 Platform Tespit",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [464, 80]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $json.apifyUrl }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify($json
```


## License: unknown
https://github.com/BasudevBharatBhushan/kibiz-n8n-docker-compose/blob/2a4a959a0cd31d319c068e24c3b159144ecf4ecb/kibiz-n8n-data.sql

```


Tebrikler, Triage Agent tamam! Şimdi Layer 2'nin ilk uzman ajanını yapalım: **Social Media Brain**.

## Konsept

Bu workflow, Triage'da "Social Media" kategorisine atanan her içeriği derinlemesine analiz edip, bilgiyi yapılandırılmış bir "beyin"e dönüştürür. Her yeni içerik beyni besler ve zenginleştirir.

### Akış Diyagramı
```
⏰ Her 5dk → 📋 Notion: "Social Media" + "Done" al (1 adet)
                    ↓
             📝 Status → "Deep Analysis"
                    ↓
             🎬 Apify: Video/Post meta al
                    ↓
             🔄 Code: Medya indir + Gemini body hazırla (UZMAN PROMPT)
                    ↓
             🧠 Gemini: Derinlemesine SM analizi
                    ↓
             📊 Code: Yanıtı parse et
                    ↓
             ✅ Notion: AI Brain Analysis + Status → "Analyzed" yaz
```

### Gemini'ye gönderilen UZMAN PROMPT

Gemini'den sadece kategori değil, **yapılandırılmış strateji bilgisi** çıkaracağız:

İşte tam workflow JSON'u:

```json
{
  "name": "🧠 Social Media Brain - Derin Analiz",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 5
            }
          ]
        }
      },
      "id": "sm-0001",
      "name": "⏰ Her 5 Dakika",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [-288, 80]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "getAll",
        "databaseId": {
          "__rl": true,
          "value": "a66165cd-5be6-43ac-a2dc-4b370e85de9c",
          "mode": "list",
          "cachedResultName": "Links for AI Agent Brain",
          "cachedResultUrl": "https://www.notion.so/a66165cd5be643aca2dc4b370e85de9c"
        },
        "limit": 1,
        "filterType": "manual",
        "filters": {
          "conditions": [
            {
              "key": "Status|status",
              "condition": "equals",
              "statusValue": "Done"
            },
            {
              "key": "Tags|multi_select",
              "condition": "contains",
              "multiSelectValue": "Social Media"
            }
          ],
          "combinator": "and"
        },
        "options": {
          "downloadFiles": false
        }
      },
      "id": "sm-0002",
      "name": "📋 Notion - SM İçerik Al",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [-64, 80],
      "credentials": {
        "notionApi": {
          "id": "e4tmmqbaPyONZSTY",
          "name": "Notion account"
        }
      }
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "update",
        "pageId": {
          "__rl": true,
          "value": "={{ $('📋 Notion - SM İçerik Al').item.json.id }}",
          "mode": "id"
        },
        "propertiesUi": {
          "propertyValues": [
            {
              "key": "Status|status",
              "statusValue": "In progress"
            }
          ]
        },
        "options": {}
      },
      "id": "sm-0003",
      "name": "📝 Status → Deep Analysis",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [208, 80],
      "credentials": {
        "notionApi": {
          "id": "e4tmmqbaPyONZSTY",
          "name": "Notion account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const url = $('📋 Notion - SM İçerik Al').first().json.property_url || '';\n\nconst platformMap = {\n  instagram: {\n    actorId: 'shu8hvrXbJbY3Eb9W',\n    bodyKey: 'directUrls',\n    platform: 'instagram'\n  },\n  facebook: {\n    actorId: 'PBJEdJdctLHQaqdfe',\n    bodyKey: 'startUrls',\n    platform: 'facebook'\n  },\n  youtube: {\n    actorId: 'h7sDV53CddomktSi5',\n    bodyKey: 'startUrls',\n    platform: 'youtube'\n  },\n  tiktok: {\n    actorId: '7200360993149553925',\n    bodyKey: 'postURLs',\n    platform: 'tiktok'\n  }\n};\n\nlet detected = 'unknown';\nif (url.includes('instagram.com')) detected = 'instagram';\nelse if (url.includes('facebook.com') || url.includes('fb.watch')) detected = 'facebook';\nelse if (url.includes('youtube.com') || url.includes('youtu.be')) detected = 'youtube';\nelse if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) detected = 'tiktok';\n\nconst config = platformMap[detected];\n\nif (!config) {\n  return [{ json: { error: true, platform: 'unknown', url, message: 'Desteklenmeyen platform: ' + url } }];\n}\n\nconst apifyToken = 'ENV_APIFY_TOKEN';\nconst apifyUrl = `https://api.apify.com/v2/acts/${config.actorId}/run-sync-get-dataset-items?token=${apifyToken}`;\n\nlet requestBody = {};\nif (detected === 'instagram') requestBody = { directUrls: [url], resultsType: 'posts' };\nelse if (detected === 'facebook') requestBody = { startUrls: [{ url }] };\nelse if (detected === 'youtube') requestBody = { startUrls: [{ url }], maxResults: 1 };\nelse if (detected === 'tiktok') requestBody = { postURLs: [url] };\n\nreturn [{ json: { error: false, platform: detected, url, apifyUrl, requestBody } }];"
      },
      "id": "sm-0004",
      "name": "🔀 Platform Tespit",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [464, 80]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $json.apifyUrl }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify($json.requestBody) }}",
        "options": {
          "timeout": 120000
        }
      },
      "id": "sm-0005",
      "name": "🎬 Apify - Meta Al",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [688, 80]
    },
    {
      "parameters": {
        "jsCode": "const apifyData = $input.first().json;\nconst notionItem = $('📋 Notion - SM İçerik Al').first().json;\nconst contentUrl = notionItem.property_url || 'URL yok';\nconst title = notionItem.property_title || notionItem.name || 'Başlık yok';\n\nconst prompt = `Sen dünya çapında deneyimli bir Sosyal Medya Stratejisti ve Büyüme Uzmanısın. Sana gösterilen içeriği (video veya görseller) EN DERİN düzeyde analiz et.\n\nBu analiz, bir emlak şirketinin sosyal medya beyni için yapılıyor. Her analiz bu beyni besleyecek ve geliştirecek. Amacımız: Gördüğümüz her içerikten öğrenilebilecek SOMUT, UYGULANABİLİR strateji ve taktikleri çıkarmak.\n\n─────────────────────────────────\n📋 ANALİZ YAPISI — AYNEN BU JSON FORMATINDA CEVAP VER:\n─────────────────────────────────\n\n{\n  \"content_summary\": \"İçeriğin 2-3 cümlelik özeti\",\n  \n  \"hook_analysis\": {\n    \"hook_type\": \"İlk 3 saniyede kullanılan hook tipi (soru, şok istatistik, merak boşluğu, görsel dikkat çekici, vs.)\",\n    \"hook_text\": \"Varsa hook'un tam metni\",\n    \"hook_effectiveness\": 8,\n    \"hook_lesson\": \"Bu hook'tan ne öğrenebiliriz? Kendi içeriklerimize nasıl uyarlayabiliriz?\"\n  },\n  \n  \"content_structure\": {\n    \"format\": \"Reel/Carousel/Story/Post/Video\",\n    \"duration_seconds\": 0,\n    \"scene_count\": 0,\n    \"pacing\": \"Hızlı/Orta/Yavaş - açıklama\",\n    \"text_overlay_used\": true,\n    \"music_type\": \"Trending/Original/Voiceover/Sessiz\",\n    \"cta_used\": \"Kullanılan CTA (call to action) varsa\",\n    \"structure_lesson\": \"Bu yapıdan ne öğrenebiliriz?\"\n  },\n  \n  \"algorithm_signals\": {\n    \"watch_time_optimization\": \"İzlenme süresini artırmak için kullanılan teknikler\",\n    \"engagement_triggers\": [\"Yorum yazdırmak için kullanılan taktikler\"],\n    \"shareability_factors\": \"Paylaşılabilirliği artıran unsurlar\",\n    \"save_worthiness\": \"Kaydetmeye değer kılan unsurlar\",\n    \"algorithm_lesson\": \"Algoritma açısından ne öğrenebiliriz?\"\n  },\n  \n  \"posting_strategy_insights\": {\n    \"best_content_type_for_reach\": \"Bu tarz içerik reach için mi, engagement için mi, follower kazanmak için mi ideal?\",\n    \"frequency_suggestion\": \"Bu tarz içerik haftada kaç kez paylaşılmalı?\",\n    \"best_time_hint\": \"İçeriğin hedef kitlesine göre ideal paylaşım zamanı tahmini\",\n    \"series_potential\": \"Bu içerik bir seriye dönüştürülebilir mi? Nasıl?\"\n  },\n  \n  \"visual_branding\": {\n    \"color_palette\": \"Kullanılan renk paleti\",\n    \"typography\": \"Yazı tipi stili\",\n    \"thumbnail_strategy\": \"Kapak görseli stratejisi\",\n    \"brand_consistency\": \"Marka tutarlılığı değerlendirmesi\",\n    \"visual_lesson\": \"Görsel açıdan ne öğrenebiliriz?\"\n  },\n  \n  \"copywriting_analysis\": {\n    \"caption_style\": \"Caption yazım stili\",\n    \"hashtag_strategy\": \"Hashtag kullanımı analizi\",\n    \"emoji_usage\": \"Emoji kullanım stratejisi\",\n    \"storytelling_technique\": \"Hikaye anlatım tekniği\",\n    \"copywriting_lesson\": \"Metin yazarlığından ne öğrenebiliriz?\"\n  },\n  \n  \"adaptation_plan\": {\n    \"can_we_adapt\": true,\n    \"adaptation_idea\": \"Bu içeriği emlak/Letify markası için NASIL uyarlayabiliriz? Somut fikir ver.\",\n    \"difficulty\": \"Kolay/Orta/Zor\",\n    \"required_resources\": \"Gerekli kaynaklar (ekipman, yazılım, süre)\",\n    \"expected_performance\": \"Beklenen performans tahmini\"\n  },\n  \n  \"key_takeaways\": [\n    \"1. En önemli çıkarım\",\n    \"2. İkinci önemli çıkarım\",\n    \"3. Üçüncü önemli çıkarım\"\n  ],\n  \n  \"brain_tags\": [\"hook-stratejisi\", \"reels-format\", \"algorithm-hack\"]\n}\n\nÖNEMLİ KURALLAR:\n- Her alanı DOLDUR, boş bırakma\n- Genel/soyut cevaplar verme, HER ZAMAN somut ve uygulanabilir ol\n- \"brain_tags\" alanına bu içerikten çıkan anahtar kavramları yaz (ileride arama/filtreleme için)\n- Emlak/gayrimenkul sektörü perspektifinden değerlendir\n- Rakamsal tahminler ver (engagement oranı, reach potansiyeli vs.)\n\nİçerik Başlığı: ${title}\nİçerik Linki: ${contentUrl}`;\n\nasync function downloadAsBase64(url) {\n  const response = await this.helpers.request({\n    method: 'GET',\n    uri: url,\n    encoding: null,\n  });\n  return response.toString('base64');\n}\n\nfunction detectMime(url) {\n  const lower = url.toLowerCase();\n  if (lower.includes('.webp')) return 'image/webp';\n  if (lower.includes('.png')) return 'image/png';\n  if (lower.includes('.mp4')) return 'video/mp4';\n  return 'image/jpeg';\n}\n\nlet parts = [];\n\nif (apifyData.videoUrl) {\n  const base64 = await downloadAsBase64.call(this, apifyData.videoUrl);\n  parts.push({ inlineData: { mimeType: 'video/mp4', data: base64 } });\n} else if (apifyData.images && apifyData.images.length > 0) {\n  const maxImages = Math.min(apifyData.images.length, 10);\n  for (let i = 0; i < maxImages; i++) {\n    const base64 = await downloadAsBase64.call(this, apifyData.images[i]);\n    parts.push({ inlineData: { mimeType: detectMime(apifyData.images[i]), data: base64 } });\n  }\n} else if (apifyData.displayUrl) {\n  const base64 = await downloadAsBase64.call(this, apifyData.displayUrl);\n  parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } });\n}\n\nconst caption = apifyData.caption || apifyData.alt || '';\nif (caption) parts.push({ text: 'Post caption: ' + caption });\n\nparts.push({ text: prompt });\n\nconst requestBody = {\n  contents: [{ parts }],\n  generationConfig: {\n    temperature: 0.3,\n    maxOutputTokens: 8192,\n    responseMimeType: 'application/json'\n  }\n};\n\nreturn [{ json: { requestBody } }];"
      },
      "id": "sm-0006",
      "name": "🔄 SM Analiz İsteği Hazırla",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [944, 80]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={{$env.GEMINI_API_KEY}}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify($json.requestBody) }}",
        "options": {
          "timeout": 180000
        }
      },
      "id": "sm-0007",
      "name": "
```


## License: unknown
https://github.com/BasudevBharatBhushan/kibiz-n8n-docker-compose/blob/2a4a959a0cd31d319c068e24c3b159144ecf4ecb/kibiz-n8n-data.sql

```


Tebrikler, Triage Agent tamam! Şimdi Layer 2'nin ilk uzman ajanını yapalım: **Social Media Brain**.

## Konsept

Bu workflow, Triage'da "Social Media" kategorisine atanan her içeriği derinlemesine analiz edip, bilgiyi yapılandırılmış bir "beyin"e dönüştürür. Her yeni içerik beyni besler ve zenginleştirir.

### Akış Diyagramı
```
⏰ Her 5dk → 📋 Notion: "Social Media" + "Done" al (1 adet)
                    ↓
             📝 Status → "Deep Analysis"
                    ↓
             🎬 Apify: Video/Post meta al
                    ↓
             🔄 Code: Medya indir + Gemini body hazırla (UZMAN PROMPT)
                    ↓
             🧠 Gemini: Derinlemesine SM analizi
                    ↓
             📊 Code: Yanıtı parse et
                    ↓
             ✅ Notion: AI Brain Analysis + Status → "Analyzed" yaz
```

### Gemini'ye gönderilen UZMAN PROMPT

Gemini'den sadece kategori değil, **yapılandırılmış strateji bilgisi** çıkaracağız:

İşte tam workflow JSON'u:

```json
{
  "name": "🧠 Social Media Brain - Derin Analiz",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 5
            }
          ]
        }
      },
      "id": "sm-0001",
      "name": "⏰ Her 5 Dakika",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [-288, 80]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "getAll",
        "databaseId": {
          "__rl": true,
          "value": "a66165cd-5be6-43ac-a2dc-4b370e85de9c",
          "mode": "list",
          "cachedResultName": "Links for AI Agent Brain",
          "cachedResultUrl": "https://www.notion.so/a66165cd5be643aca2dc4b370e85de9c"
        },
        "limit": 1,
        "filterType": "manual",
        "filters": {
          "conditions": [
            {
              "key": "Status|status",
              "condition": "equals",
              "statusValue": "Done"
            },
            {
              "key": "Tags|multi_select",
              "condition": "contains",
              "multiSelectValue": "Social Media"
            }
          ],
          "combinator": "and"
        },
        "options": {
          "downloadFiles": false
        }
      },
      "id": "sm-0002",
      "name": "📋 Notion - SM İçerik Al",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [-64, 80],
      "credentials": {
        "notionApi": {
          "id": "e4tmmqbaPyONZSTY",
          "name": "Notion account"
        }
      }
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "update",
        "pageId": {
          "__rl": true,
          "value": "={{ $('📋 Notion - SM İçerik Al').item.json.id }}",
          "mode": "id"
        },
        "propertiesUi": {
          "propertyValues": [
            {
              "key": "Status|status",
              "statusValue": "In progress"
            }
          ]
        },
        "options": {}
      },
      "id": "sm-0003",
      "name": "📝 Status → Deep Analysis",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [208, 80],
      "credentials": {
        "notionApi": {
          "id": "e4tmmqbaPyONZSTY",
          "name": "Notion account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const url = $('📋 Notion - SM İçerik Al').first().json.property_url || '';\n\nconst platformMap = {\n  instagram: {\n    actorId: 'shu8hvrXbJbY3Eb9W',\n    bodyKey: 'directUrls',\n    platform: 'instagram'\n  },\n  facebook: {\n    actorId: 'PBJEdJdctLHQaqdfe',\n    bodyKey: 'startUrls',\n    platform: 'facebook'\n  },\n  youtube: {\n    actorId: 'h7sDV53CddomktSi5',\n    bodyKey: 'startUrls',\n    platform: 'youtube'\n  },\n  tiktok: {\n    actorId: '7200360993149553925',\n    bodyKey: 'postURLs',\n    platform: 'tiktok'\n  }\n};\n\nlet detected = 'unknown';\nif (url.includes('instagram.com')) detected = 'instagram';\nelse if (url.includes('facebook.com') || url.includes('fb.watch')) detected = 'facebook';\nelse if (url.includes('youtube.com') || url.includes('youtu.be')) detected = 'youtube';\nelse if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) detected = 'tiktok';\n\nconst config = platformMap[detected];\n\nif (!config) {\n  return [{ json: { error: true, platform: 'unknown', url, message: 'Desteklenmeyen platform: ' + url } }];\n}\n\nconst apifyToken = 'ENV_APIFY_TOKEN';\nconst apifyUrl = `https://api.apify.com/v2/acts/${config.actorId}/run-sync-get-dataset-items?token=${apifyToken}`;\n\nlet requestBody = {};\nif (detected === 'instagram') requestBody = { directUrls: [url], resultsType: 'posts' };\nelse if (detected === 'facebook') requestBody = { startUrls: [{ url }] };\nelse if (detected === 'youtube') requestBody = { startUrls: [{ url }], maxResults: 1 };\nelse if (detected === 'tiktok') requestBody = { postURLs: [url] };\n\nreturn [{ json: { error: false, platform: detected, url, apifyUrl, requestBody } }];"
      },
      "id": "sm-0004",
      "name": "🔀 Platform Tespit",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [464, 80]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $json.apifyUrl }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify($json.requestBody) }}",
        "options": {
          "timeout": 120000
        }
      },
      "id": "sm-0005",
      "name": "🎬 Apify - Meta Al",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [688, 80]
    },
    {
      "parameters": {
        "jsCode": "const apifyData = $input.first().json;\nconst notionItem = $('📋 Notion - SM İçerik Al').first().json;\nconst contentUrl = notionItem.property_url || 'URL yok';\nconst title = notionItem.property_title || notionItem.name || 'Başlık yok';\n\nconst prompt = `Sen dünya çapında deneyimli bir Sosyal Medya Stratejisti ve Büyüme Uzmanısın. Sana gösterilen içeriği (video veya görseller) EN DERİN düzeyde analiz et.\n\nBu analiz, bir emlak şirketinin sosyal medya beyni için yapılıyor. Her analiz bu beyni besleyecek ve geliştirecek. Amacımız: Gördüğümüz her içerikten öğrenilebilecek SOMUT, UYGULANABİLİR strateji ve taktikleri çıkarmak.\n\n─────────────────────────────────\n📋 ANALİZ YAPISI — AYNEN BU JSON FORMATINDA CEVAP VER:\n─────────────────────────────────\n\n{\n  \"content_summary\": \"İçeriğin 2-3 cümlelik özeti\",\n  \n  \"hook_analysis\": {\n    \"hook_type\": \"İlk 3 saniyede kullanılan hook tipi (soru, şok istatistik, merak boşluğu, görsel dikkat çekici, vs.)\",\n    \"hook_text\": \"Varsa hook'un tam metni\",\n    \"hook_effectiveness\": 8,\n    \"hook_lesson\": \"Bu hook'tan ne öğrenebiliriz? Kendi içeriklerimize nasıl uyarlayabiliriz?\"\n  },\n  \n  \"content_structure\": {\n    \"format\": \"Reel/Carousel/Story/Post/Video\",\n    \"duration_seconds\": 0,\n    \"scene_count\": 0,\n    \"pacing\": \"Hızlı/Orta/Yavaş - açıklama\",\n    \"text_overlay_used\": true,\n    \"music_type\": \"Trending/Original/Voiceover/Sessiz\",\n    \"cta_used\": \"Kullanılan CTA (call to action) varsa\",\n    \"structure_lesson\": \"Bu yapıdan ne öğrenebiliriz?\"\n  },\n  \n  \"algorithm_signals\": {\n    \"watch_time_optimization\": \"İzlenme süresini artırmak için kullanılan teknikler\",\n    \"engagement_triggers\": [\"Yorum yazdırmak için kullanılan taktikler\"],\n    \"shareability_factors\": \"Paylaşılabilirliği artıran unsurlar\",\n    \"save_worthiness\": \"Kaydetmeye değer kılan unsurlar\",\n    \"algorithm_lesson\": \"Algoritma açısından ne öğrenebiliriz?\"\n  },\n  \n  \"posting_strategy_insights\": {\n    \"best_content_type_for_reach\": \"Bu tarz içerik reach için mi, engagement için mi, follower kazanmak için mi ideal?\",\n    \"frequency_suggestion\": \"Bu tarz içerik haftada kaç kez paylaşılmalı?\",\n    \"best_time_hint\": \"İçeriğin hedef kitlesine göre ideal paylaşım zamanı tahmini\",\n    \"series_potential\": \"Bu içerik bir seriye dönüştürülebilir mi? Nasıl?\"\n  },\n  \n  \"visual_branding\": {\n    \"color_palette\": \"Kullanılan renk paleti\",\n    \"typography\": \"Yazı tipi stili\",\n    \"thumbnail_strategy\": \"Kapak görseli stratejisi\",\n    \"brand_consistency\": \"Marka tutarlılığı değerlendirmesi\",\n    \"visual_lesson\": \"Görsel açıdan ne öğrenebiliriz?\"\n  },\n  \n  \"copywriting_analysis\": {\n    \"caption_style\": \"Caption yazım stili\",\n    \"hashtag_strategy\": \"Hashtag kullanımı analizi\",\n    \"emoji_usage\": \"Emoji kullanım stratejisi\",\n    \"storytelling_technique\": \"Hikaye anlatım tekniği\",\n    \"copywriting_lesson\": \"Metin yazarlığından ne öğrenebiliriz?\"\n  },\n  \n  \"adaptation_plan\": {\n    \"can_we_adapt\": true,\n    \"adaptation_idea\": \"Bu içeriği emlak/Letify markası için NASIL uyarlayabiliriz? Somut fikir ver.\",\n    \"difficulty\": \"Kolay/Orta/Zor\",\n    \"required_resources\": \"Gerekli kaynaklar (ekipman, yazılım, süre)\",\n    \"expected_performance\": \"Beklenen performans tahmini\"\n  },\n  \n  \"key_takeaways\": [\n    \"1. En önemli çıkarım\",\n    \"2. İkinci önemli çıkarım\",\n    \"3. Üçüncü önemli çıkarım\"\n  ],\n  \n  \"brain_tags\": [\"hook-stratejisi\", \"reels-format\", \"algorithm-hack\"]\n}\n\nÖNEMLİ KURALLAR:\n- Her alanı DOLDUR, boş bırakma\n- Genel/soyut cevaplar verme, HER ZAMAN somut ve uygulanabilir ol\n- \"brain_tags\" alanına bu içerikten çıkan anahtar kavramları yaz (ileride arama/filtreleme için)\n- Emlak/gayrimenkul sektörü perspektifinden değerlendir\n- Rakamsal tahminler ver (engagement oranı, reach potansiyeli vs.)\n\nİçerik Başlığı: ${title}\nİçerik Linki: ${contentUrl}`;\n\nasync function downloadAsBase64(url) {\n  const response = await this.helpers.request({\n    method: 'GET',\n    uri: url,\n    encoding: null,\n  });\n  return response.toString('base64');\n}\n\nfunction detectMime(url) {\n  const lower = url.toLowerCase();\n  if (lower.includes('.webp')) return 'image/webp';\n  if (lower.includes('.png')) return 'image/png';\n  if (lower.includes('.mp4')) return 'video/mp4';\n  return 'image/jpeg';\n}\n\nlet parts = [];\n\nif (apifyData.videoUrl) {\n  const base64 = await downloadAsBase64.call(this, apifyData.videoUrl);\n  parts.push({ inlineData: { mimeType: 'video/mp4', data: base64 } });\n} else if (apifyData.images && apifyData.images.length > 0) {\n  const maxImages = Math.min(apifyData.images.length, 10);\n  for (let i = 0; i < maxImages; i++) {\n    const base64 = await downloadAsBase64.call(this, apifyData.images[i]);\n    parts.push({ inlineData: { mimeType: detectMime(apifyData.images[i]), data: base64 } });\n  }\n} else if (apifyData.displayUrl) {\n  const base64 = await downloadAsBase64.call(this, apifyData.displayUrl);\n  parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } });\n}\n\nconst caption = apifyData.caption || apifyData.alt || '';\nif (caption) parts.push({ text: 'Post caption: ' + caption });\n\nparts.push({ text: prompt });\n\nconst requestBody = {\n  contents: [{ parts }],\n  generationConfig: {\n    temperature: 0.3,\n    maxOutputTokens: 8192,\n    responseMimeType: 'application/json'\n  }\n};\n\nreturn [{ json: { requestBody } }];"
      },
      "id": "sm-0006",
      "name": "🔄 SM Analiz İsteği Hazırla",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [944, 80]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={{$env.GEMINI_API_KEY}}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify($json.requestBody) }}",
        "options": {
          "timeout": 180000
        }
      },
      "id": "sm-0007",
      "name": "
```

