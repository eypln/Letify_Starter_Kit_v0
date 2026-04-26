# Code Citations

## License: unknown
https://github.com/BasudevBharatBhushan/kibiz-n8n-docker-compose/blob/2a4a959a0cd31d319c068e24c3b159144ecf4ecb/kibiz-n8n-data.sql

```
## 🏷️ Triage Agent — Video Kategorize Workflow

### Akış Diyagramı

```
⏰ Her 3dk  →  📋 Notion: Not Started al (1 adet)
                     ↓
              ❓ Veri var mı?
              ↓ TRUE              ↓ FALSE
   📝 Status→Processing        ⏹️ Bitti
              ↓
   🎬 Apify: Video meta al
              ↓
   ⬇️ Video binary indir
              ↓
   🔄 Code: Base64 + Gemini body hazırla
              ↓
   🧠 Gemini: Videoyu multimodal izle + kategorize et
              ↓
   📊 Code: JSON yanıtı parse et
              ↓
   ✅ Notion: Kategori + Status → "Categorized" yaz
```

200 item × 3dk = ~10 saat. Gece çalıştırırsın, sabah tüm kütüphane kategorize.

---

### Ön Gereksinimler

| Servis | Ne Lazım | Nereden |
|--------|---------|--------|
| **Notion** | Internal Integration Token + Database ID | notion.so/my-integrations |
| **Gemini** | API Key (2.5 Pro) | aistudio.google.com/apikey |
| **Apify** | API Token + Actor ID (video indirici) | apify.com → Account → Integrations |
| **n8n** | Self-hosted veya Cloud | n8n.io |

**Apify Actor önerileri:**
- Instagram Reels → `apify/instagram-scraper` veya `microworlds/instagram-reel-scraper`
- TikTok → `clockworks/tiktok-scraper`
- YouTube → `bernardo/youtube-scraper`
- Universal → `microworlds/social-media-video-downloader`

---

### n8n Workflow JSON (Import Et)

n8n → **Menu → Import from JSON → Yapıştır:**

```json
{
  "name": "🏷️ Triage Agent - Video Kategorize",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 3
            }
          ]
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000001",
      "name": "⏰ Her 3 Dakika",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [0, 300]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "getAll",
        "databaseId": {
          "__rl": true,
          "value": "⚠️ NOTION_DATABASE_ID_BURAYA",
          "mode": "id"
        },
        "returnAll": false,
        "limit": 1,
        "filterType": "formula",
        "filters": {
          "conditions": [
            {
              "key": "AI Status|status",
              "condition": "equals",
              "statusValue": "Not Started"
            }
          ],
          "combinator": "and"
        },
        "options": {
          "downloadFiles": false
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000002",
      "name": "📋 Notion - Bekleyen Al",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [260, 300],
      "credentials": {
        "notionApi": {
          "id": "CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": ""
          },
          "conditions": [
            {
              "id": "cond-001",
              "leftValue": "={{ $json.id }}",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "isNotEmpty"
              }
            }
          ],
          "combinator": "and"
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000003",
      "name": "❓ Veri Var Mı",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [520, 300]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "update",
        "pageId": {
          "__rl": true,
          "value": "={{ $('📋 Notion - Bekleyen Al').item.json.id }}",
          "mode": "id"
        },
        "propertiesUi": {
          "propertyValues": [
            {
              "key": "AI Status|status",
              "statusValue": "AI Processing"
            }
          ]
        },
        "options": {}
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000004",
      "name": "📝 Status → Processing",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [780, 200],
      "credentials": {
        "notionApi": {
          "id": "CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.apify.com/v2/acts/⚠️ACTOR_ID_BURAYA/run-sync-get-dataset-items",
        "authentication": "none",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "token",
              "value": "⚠️ APIFY_TOKEN_BURAYA"
            }
          ]
        },
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
        "jsonBody": "={{ JSON.stringify({ directUrls: [$('
```


## License: unknown
https://github.com/BasudevBharatBhushan/kibiz-n8n-docker-compose/blob/2a4a959a0cd31d319c068e24c3b159144ecf4ecb/kibiz-n8n-data.sql

```
## 🏷️ Triage Agent — Video Kategorize Workflow

### Akış Diyagramı

```
⏰ Her 3dk  →  📋 Notion: Not Started al (1 adet)
                     ↓
              ❓ Veri var mı?
              ↓ TRUE              ↓ FALSE
   📝 Status→Processing        ⏹️ Bitti
              ↓
   🎬 Apify: Video meta al
              ↓
   ⬇️ Video binary indir
              ↓
   🔄 Code: Base64 + Gemini body hazırla
              ↓
   🧠 Gemini: Videoyu multimodal izle + kategorize et
              ↓
   📊 Code: JSON yanıtı parse et
              ↓
   ✅ Notion: Kategori + Status → "Categorized" yaz
```

200 item × 3dk = ~10 saat. Gece çalıştırırsın, sabah tüm kütüphane kategorize.

---

### Ön Gereksinimler

| Servis | Ne Lazım | Nereden |
|--------|---------|--------|
| **Notion** | Internal Integration Token + Database ID | notion.so/my-integrations |
| **Gemini** | API Key (2.5 Pro) | aistudio.google.com/apikey |
| **Apify** | API Token + Actor ID (video indirici) | apify.com → Account → Integrations |
| **n8n** | Self-hosted veya Cloud | n8n.io |

**Apify Actor önerileri:**
- Instagram Reels → `apify/instagram-scraper` veya `microworlds/instagram-reel-scraper`
- TikTok → `clockworks/tiktok-scraper`
- YouTube → `bernardo/youtube-scraper`
- Universal → `microworlds/social-media-video-downloader`

---

### n8n Workflow JSON (Import Et)

n8n → **Menu → Import from JSON → Yapıştır:**

```json
{
  "name": "🏷️ Triage Agent - Video Kategorize",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 3
            }
          ]
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000001",
      "name": "⏰ Her 3 Dakika",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [0, 300]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "getAll",
        "databaseId": {
          "__rl": true,
          "value": "⚠️ NOTION_DATABASE_ID_BURAYA",
          "mode": "id"
        },
        "returnAll": false,
        "limit": 1,
        "filterType": "formula",
        "filters": {
          "conditions": [
            {
              "key": "AI Status|status",
              "condition": "equals",
              "statusValue": "Not Started"
            }
          ],
          "combinator": "and"
        },
        "options": {
          "downloadFiles": false
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000002",
      "name": "📋 Notion - Bekleyen Al",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [260, 300],
      "credentials": {
        "notionApi": {
          "id": "CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": ""
          },
          "conditions": [
            {
              "id": "cond-001",
              "leftValue": "={{ $json.id }}",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "isNotEmpty"
              }
            }
          ],
          "combinator": "and"
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000003",
      "name": "❓ Veri Var Mı",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [520, 300]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "update",
        "pageId": {
          "__rl": true,
          "value": "={{ $('📋 Notion - Bekleyen Al').item.json.id }}",
          "mode": "id"
        },
        "propertiesUi": {
          "propertyValues": [
            {
              "key": "AI Status|status",
              "statusValue": "AI Processing"
            }
          ]
        },
        "options": {}
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000004",
      "name": "📝 Status → Processing",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [780, 200],
      "credentials": {
        "notionApi": {
          "id": "CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.apify.com/v2/acts/⚠️ACTOR_ID_BURAYA/run-sync-get-dataset-items",
        "authentication": "none",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "token",
              "value": "⚠️ APIFY_TOKEN_BURAYA"
            }
          ]
        },
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
        "jsonBody": "={{ JSON.stringify({ directUrls: [$('
```


## License: unknown
https://github.com/BasudevBharatBhushan/kibiz-n8n-docker-compose/blob/2a4a959a0cd31d319c068e24c3b159144ecf4ecb/kibiz-n8n-data.sql

```
## 🏷️ Triage Agent — Video Kategorize Workflow

### Akış Diyagramı

```
⏰ Her 3dk  →  📋 Notion: Not Started al (1 adet)
                     ↓
              ❓ Veri var mı?
              ↓ TRUE              ↓ FALSE
   📝 Status→Processing        ⏹️ Bitti
              ↓
   🎬 Apify: Video meta al
              ↓
   ⬇️ Video binary indir
              ↓
   🔄 Code: Base64 + Gemini body hazırla
              ↓
   🧠 Gemini: Videoyu multimodal izle + kategorize et
              ↓
   📊 Code: JSON yanıtı parse et
              ↓
   ✅ Notion: Kategori + Status → "Categorized" yaz
```

200 item × 3dk = ~10 saat. Gece çalıştırırsın, sabah tüm kütüphane kategorize.

---

### Ön Gereksinimler

| Servis | Ne Lazım | Nereden |
|--------|---------|--------|
| **Notion** | Internal Integration Token + Database ID | notion.so/my-integrations |
| **Gemini** | API Key (2.5 Pro) | aistudio.google.com/apikey |
| **Apify** | API Token + Actor ID (video indirici) | apify.com → Account → Integrations |
| **n8n** | Self-hosted veya Cloud | n8n.io |

**Apify Actor önerileri:**
- Instagram Reels → `apify/instagram-scraper` veya `microworlds/instagram-reel-scraper`
- TikTok → `clockworks/tiktok-scraper`
- YouTube → `bernardo/youtube-scraper`
- Universal → `microworlds/social-media-video-downloader`

---

### n8n Workflow JSON (Import Et)

n8n → **Menu → Import from JSON → Yapıştır:**

```json
{
  "name": "🏷️ Triage Agent - Video Kategorize",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 3
            }
          ]
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000001",
      "name": "⏰ Her 3 Dakika",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [0, 300]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "getAll",
        "databaseId": {
          "__rl": true,
          "value": "⚠️ NOTION_DATABASE_ID_BURAYA",
          "mode": "id"
        },
        "returnAll": false,
        "limit": 1,
        "filterType": "formula",
        "filters": {
          "conditions": [
            {
              "key": "AI Status|status",
              "condition": "equals",
              "statusValue": "Not Started"
            }
          ],
          "combinator": "and"
        },
        "options": {
          "downloadFiles": false
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000002",
      "name": "📋 Notion - Bekleyen Al",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [260, 300],
      "credentials": {
        "notionApi": {
          "id": "CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": ""
          },
          "conditions": [
            {
              "id": "cond-001",
              "leftValue": "={{ $json.id }}",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "isNotEmpty"
              }
            }
          ],
          "combinator": "and"
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000003",
      "name": "❓ Veri Var Mı",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [520, 300]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "update",
        "pageId": {
          "__rl": true,
          "value": "={{ $('📋 Notion - Bekleyen Al').item.json.id }}",
          "mode": "id"
        },
        "propertiesUi": {
          "propertyValues": [
            {
              "key": "AI Status|status",
              "statusValue": "AI Processing"
            }
          ]
        },
        "options": {}
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000004",
      "name": "📝 Status → Processing",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [780, 200],
      "credentials": {
        "notionApi": {
          "id": "CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.apify.com/v2/acts/⚠️ACTOR_ID_BURAYA/run-sync-get-dataset-items",
        "authentication": "none",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "token",
              "value": "⚠️ APIFY_TOKEN_BURAYA"
            }
          ]
        },
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
        "jsonBody": "={{ JSON.stringify({ directUrls: [$('
```


## License: unknown
https://github.com/BasudevBharatBhushan/kibiz-n8n-docker-compose/blob/2a4a959a0cd31d319c068e24c3b159144ecf4ecb/kibiz-n8n-data.sql

```
## 🏷️ Triage Agent — Video Kategorize Workflow

### Akış Diyagramı

```
⏰ Her 3dk  →  📋 Notion: Not Started al (1 adet)
                     ↓
              ❓ Veri var mı?
              ↓ TRUE              ↓ FALSE
   📝 Status→Processing        ⏹️ Bitti
              ↓
   🎬 Apify: Video meta al
              ↓
   ⬇️ Video binary indir
              ↓
   🔄 Code: Base64 + Gemini body hazırla
              ↓
   🧠 Gemini: Videoyu multimodal izle + kategorize et
              ↓
   📊 Code: JSON yanıtı parse et
              ↓
   ✅ Notion: Kategori + Status → "Categorized" yaz
```

200 item × 3dk = ~10 saat. Gece çalıştırırsın, sabah tüm kütüphane kategorize.

---

### Ön Gereksinimler

| Servis | Ne Lazım | Nereden |
|--------|---------|--------|
| **Notion** | Internal Integration Token + Database ID | notion.so/my-integrations |
| **Gemini** | API Key (2.5 Pro) | aistudio.google.com/apikey |
| **Apify** | API Token + Actor ID (video indirici) | apify.com → Account → Integrations |
| **n8n** | Self-hosted veya Cloud | n8n.io |

**Apify Actor önerileri:**
- Instagram Reels → `apify/instagram-scraper` veya `microworlds/instagram-reel-scraper`
- TikTok → `clockworks/tiktok-scraper`
- YouTube → `bernardo/youtube-scraper`
- Universal → `microworlds/social-media-video-downloader`

---

### n8n Workflow JSON (Import Et)

n8n → **Menu → Import from JSON → Yapıştır:**

```json
{
  "name": "🏷️ Triage Agent - Video Kategorize",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 3
            }
          ]
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000001",
      "name": "⏰ Her 3 Dakika",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [0, 300]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "getAll",
        "databaseId": {
          "__rl": true,
          "value": "⚠️ NOTION_DATABASE_ID_BURAYA",
          "mode": "id"
        },
        "returnAll": false,
        "limit": 1,
        "filterType": "formula",
        "filters": {
          "conditions": [
            {
              "key": "AI Status|status",
              "condition": "equals",
              "statusValue": "Not Started"
            }
          ],
          "combinator": "and"
        },
        "options": {
          "downloadFiles": false
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000002",
      "name": "📋 Notion - Bekleyen Al",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [260, 300],
      "credentials": {
        "notionApi": {
          "id": "CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": ""
          },
          "conditions": [
            {
              "id": "cond-001",
              "leftValue": "={{ $json.id }}",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "isNotEmpty"
              }
            }
          ],
          "combinator": "and"
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000003",
      "name": "❓ Veri Var Mı",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [520, 300]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "update",
        "pageId": {
          "__rl": true,
          "value": "={{ $('📋 Notion - Bekleyen Al').item.json.id }}",
          "mode": "id"
        },
        "propertiesUi": {
          "propertyValues": [
            {
              "key": "AI Status|status",
              "statusValue": "AI Processing"
            }
          ]
        },
        "options": {}
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000004",
      "name": "📝 Status → Processing",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [780, 200],
      "credentials": {
        "notionApi": {
          "id": "CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.apify.com/v2/acts/⚠️ACTOR_ID_BURAYA/run-sync-get-dataset-items",
        "authentication": "none",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "token",
              "value": "⚠️ APIFY_TOKEN_BURAYA"
            }
          ]
        },
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
        "jsonBody": "={{ JSON.stringify({ directUrls: [$('
```


## License: unknown
https://github.com/BasudevBharatBhushan/kibiz-n8n-docker-compose/blob/2a4a959a0cd31d319c068e24c3b159144ecf4ecb/kibiz-n8n-data.sql

```
## 🏷️ Triage Agent — Video Kategorize Workflow

### Akış Diyagramı

```
⏰ Her 3dk  →  📋 Notion: Not Started al (1 adet)
                     ↓
              ❓ Veri var mı?
              ↓ TRUE              ↓ FALSE
   📝 Status→Processing        ⏹️ Bitti
              ↓
   🎬 Apify: Video meta al
              ↓
   ⬇️ Video binary indir
              ↓
   🔄 Code: Base64 + Gemini body hazırla
              ↓
   🧠 Gemini: Videoyu multimodal izle + kategorize et
              ↓
   📊 Code: JSON yanıtı parse et
              ↓
   ✅ Notion: Kategori + Status → "Categorized" yaz
```

200 item × 3dk = ~10 saat. Gece çalıştırırsın, sabah tüm kütüphane kategorize.

---

### Ön Gereksinimler

| Servis | Ne Lazım | Nereden |
|--------|---------|--------|
| **Notion** | Internal Integration Token + Database ID | notion.so/my-integrations |
| **Gemini** | API Key (2.5 Pro) | aistudio.google.com/apikey |
| **Apify** | API Token + Actor ID (video indirici) | apify.com → Account → Integrations |
| **n8n** | Self-hosted veya Cloud | n8n.io |

**Apify Actor önerileri:**
- Instagram Reels → `apify/instagram-scraper` veya `microworlds/instagram-reel-scraper`
- TikTok → `clockworks/tiktok-scraper`
- YouTube → `bernardo/youtube-scraper`
- Universal → `microworlds/social-media-video-downloader`

---

### n8n Workflow JSON (Import Et)

n8n → **Menu → Import from JSON → Yapıştır:**

```json
{
  "name": "🏷️ Triage Agent - Video Kategorize",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 3
            }
          ]
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000001",
      "name": "⏰ Her 3 Dakika",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [0, 300]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "getAll",
        "databaseId": {
          "__rl": true,
          "value": "⚠️ NOTION_DATABASE_ID_BURAYA",
          "mode": "id"
        },
        "returnAll": false,
        "limit": 1,
        "filterType": "formula",
        "filters": {
          "conditions": [
            {
              "key": "AI Status|status",
              "condition": "equals",
              "statusValue": "Not Started"
            }
          ],
          "combinator": "and"
        },
        "options": {
          "downloadFiles": false
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000002",
      "name": "📋 Notion - Bekleyen Al",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [260, 300],
      "credentials": {
        "notionApi": {
          "id": "CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": ""
          },
          "conditions": [
            {
              "id": "cond-001",
              "leftValue": "={{ $json.id }}",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "isNotEmpty"
              }
            }
          ],
          "combinator": "and"
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000003",
      "name": "❓ Veri Var Mı",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [520, 300]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "update",
        "pageId": {
          "__rl": true,
          "value": "={{ $('📋 Notion - Bekleyen Al').item.json.id }}",
          "mode": "id"
        },
        "propertiesUi": {
          "propertyValues": [
            {
              "key": "AI Status|status",
              "statusValue": "AI Processing"
            }
          ]
        },
        "options": {}
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000004",
      "name": "📝 Status → Processing",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [780, 200],
      "credentials": {
        "notionApi": {
          "id": "CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.apify.com/v2/acts/⚠️ACTOR_ID_BURAYA/run-sync-get-dataset-items",
        "authentication": "none",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "token",
              "value": "⚠️ APIFY_TOKEN_BURAYA"
            }
          ]
        },
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
        "jsonBody": "={{ JSON.stringify({ directUrls: [$('
```


## License: unknown
https://github.com/BasudevBharatBhushan/kibiz-n8n-docker-compose/blob/2a4a959a0cd31d319c068e24c3b159144ecf4ecb/kibiz-n8n-data.sql

```
## 🏷️ Triage Agent — Video Kategorize Workflow

### Akış Diyagramı

```
⏰ Her 3dk  →  📋 Notion: Not Started al (1 adet)
                     ↓
              ❓ Veri var mı?
              ↓ TRUE              ↓ FALSE
   📝 Status→Processing        ⏹️ Bitti
              ↓
   🎬 Apify: Video meta al
              ↓
   ⬇️ Video binary indir
              ↓
   🔄 Code: Base64 + Gemini body hazırla
              ↓
   🧠 Gemini: Videoyu multimodal izle + kategorize et
              ↓
   📊 Code: JSON yanıtı parse et
              ↓
   ✅ Notion: Kategori + Status → "Categorized" yaz
```

200 item × 3dk = ~10 saat. Gece çalıştırırsın, sabah tüm kütüphane kategorize.

---

### Ön Gereksinimler

| Servis | Ne Lazım | Nereden |
|--------|---------|--------|
| **Notion** | Internal Integration Token + Database ID | notion.so/my-integrations |
| **Gemini** | API Key (2.5 Pro) | aistudio.google.com/apikey |
| **Apify** | API Token + Actor ID (video indirici) | apify.com → Account → Integrations |
| **n8n** | Self-hosted veya Cloud | n8n.io |

**Apify Actor önerileri:**
- Instagram Reels → `apify/instagram-scraper` veya `microworlds/instagram-reel-scraper`
- TikTok → `clockworks/tiktok-scraper`
- YouTube → `bernardo/youtube-scraper`
- Universal → `microworlds/social-media-video-downloader`

---

### n8n Workflow JSON (Import Et)

n8n → **Menu → Import from JSON → Yapıştır:**

```json
{
  "name": "🏷️ Triage Agent - Video Kategorize",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 3
            }
          ]
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000001",
      "name": "⏰ Her 3 Dakika",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [0, 300]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "getAll",
        "databaseId": {
          "__rl": true,
          "value": "⚠️ NOTION_DATABASE_ID_BURAYA",
          "mode": "id"
        },
        "returnAll": false,
        "limit": 1,
        "filterType": "formula",
        "filters": {
          "conditions": [
            {
              "key": "AI Status|status",
              "condition": "equals",
              "statusValue": "Not Started"
            }
          ],
          "combinator": "and"
        },
        "options": {
          "downloadFiles": false
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000002",
      "name": "📋 Notion - Bekleyen Al",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [260, 300],
      "credentials": {
        "notionApi": {
          "id": "CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": ""
          },
          "conditions": [
            {
              "id": "cond-001",
              "leftValue": "={{ $json.id }}",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "isNotEmpty"
              }
            }
          ],
          "combinator": "and"
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000003",
      "name": "❓ Veri Var Mı",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [520, 300]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "update",
        "pageId": {
          "__rl": true,
          "value": "={{ $('📋 Notion - Bekleyen Al').item.json.id }}",
          "mode": "id"
        },
        "propertiesUi": {
          "propertyValues": [
            {
              "key": "AI Status|status",
              "statusValue": "AI Processing"
            }
          ]
        },
        "options": {}
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000004",
      "name": "📝 Status → Processing",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [780, 200],
      "credentials": {
        "notionApi": {
          "id": "CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.apify.com/v2/acts/⚠️ACTOR_ID_BURAYA/run-sync-get-dataset-items",
        "authentication": "none",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "token",
              "value": "⚠️ APIFY_TOKEN_BURAYA"
            }
          ]
        },
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
        "jsonBody": "={{ JSON.stringify({ directUrls: [$('📋 Notion - Bekleyen Al').item.json['Content Link']], resultsType: 'details' }) }}",
        "options": {
          "timeout": 120000
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000005",
      "name": "🎬 Apify - Video Meta Al",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1040, 200]
    },
    {
      "parameters": {
        "method": "GET",
        "url": "={{ $json[0].videoUrl || $json[0].video_url || $json[0].url }}",
        "options": {
          "response": {
            "response": {
              "responseFormat": "file"
            }
          },
          "timeout": 60000
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000006",
      "name": "⬇️ Video Binary İndir",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1300, 200]
    },
    {
      "parameters": {
        "jsCode": "// ⚠️ Aşağıdaki KOD BLOĞU 1'i buraya yapıştırın"
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000007",
      "name": "🔄 Gemini İsteği Hazırla",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1560, 200]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=⚠️GEMINI_API_KEY_BURAYA",
        "authentication": "none",
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
        "jsonBody": "={{ JSON.stringify($json.
```


## License: unknown
https://github.com/BasudevBharatBhushan/kibiz-n8n-docker-compose/blob/2a4a959a0cd31d319c068e24c3b159144ecf4ecb/kibiz-n8n-data.sql

```
## 🏷️ Triage Agent — Video Kategorize Workflow

### Akış Diyagramı

```
⏰ Her 3dk  →  📋 Notion: Not Started al (1 adet)
                     ↓
              ❓ Veri var mı?
              ↓ TRUE              ↓ FALSE
   📝 Status→Processing        ⏹️ Bitti
              ↓
   🎬 Apify: Video meta al
              ↓
   ⬇️ Video binary indir
              ↓
   🔄 Code: Base64 + Gemini body hazırla
              ↓
   🧠 Gemini: Videoyu multimodal izle + kategorize et
              ↓
   📊 Code: JSON yanıtı parse et
              ↓
   ✅ Notion: Kategori + Status → "Categorized" yaz
```

200 item × 3dk = ~10 saat. Gece çalıştırırsın, sabah tüm kütüphane kategorize.

---

### Ön Gereksinimler

| Servis | Ne Lazım | Nereden |
|--------|---------|--------|
| **Notion** | Internal Integration Token + Database ID | notion.so/my-integrations |
| **Gemini** | API Key (2.5 Pro) | aistudio.google.com/apikey |
| **Apify** | API Token + Actor ID (video indirici) | apify.com → Account → Integrations |
| **n8n** | Self-hosted veya Cloud | n8n.io |

**Apify Actor önerileri:**
- Instagram Reels → `apify/instagram-scraper` veya `microworlds/instagram-reel-scraper`
- TikTok → `clockworks/tiktok-scraper`
- YouTube → `bernardo/youtube-scraper`
- Universal → `microworlds/social-media-video-downloader`

---

### n8n Workflow JSON (Import Et)

n8n → **Menu → Import from JSON → Yapıştır:**

```json
{
  "name": "🏷️ Triage Agent - Video Kategorize",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 3
            }
          ]
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000001",
      "name": "⏰ Her 3 Dakika",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [0, 300]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "getAll",
        "databaseId": {
          "__rl": true,
          "value": "⚠️ NOTION_DATABASE_ID_BURAYA",
          "mode": "id"
        },
        "returnAll": false,
        "limit": 1,
        "filterType": "formula",
        "filters": {
          "conditions": [
            {
              "key": "AI Status|status",
              "condition": "equals",
              "statusValue": "Not Started"
            }
          ],
          "combinator": "and"
        },
        "options": {
          "downloadFiles": false
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000002",
      "name": "📋 Notion - Bekleyen Al",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [260, 300],
      "credentials": {
        "notionApi": {
          "id": "CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": ""
          },
          "conditions": [
            {
              "id": "cond-001",
              "leftValue": "={{ $json.id }}",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "isNotEmpty"
              }
            }
          ],
          "combinator": "and"
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000003",
      "name": "❓ Veri Var Mı",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [520, 300]
    },
    {
      "parameters": {
        "resource": "databasePage",
        "operation": "update",
        "pageId": {
          "__rl": true,
          "value": "={{ $('📋 Notion - Bekleyen Al').item.json.id }}",
          "mode": "id"
        },
        "propertiesUi": {
          "propertyValues": [
            {
              "key": "AI Status|status",
              "statusValue": "AI Processing"
            }
          ]
        },
        "options": {}
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000004",
      "name": "📝 Status → Processing",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [780, 200],
      "credentials": {
        "notionApi": {
          "id": "CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.apify.com/v2/acts/⚠️ACTOR_ID_BURAYA/run-sync-get-dataset-items",
        "authentication": "none",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "token",
              "value": "⚠️ APIFY_TOKEN_BURAYA"
            }
          ]
        },
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
        "jsonBody": "={{ JSON.stringify({ directUrls: [$('📋 Notion - Bekleyen Al').item.json['Content Link']], resultsType: 'details' }) }}",
        "options": {
          "timeout": 120000
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000005",
      "name": "🎬 Apify - Video Meta Al",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1040, 200]
    },
    {
      "parameters": {
        "method": "GET",
        "url": "={{ $json[0].videoUrl || $json[0].video_url || $json[0].url }}",
        "options": {
          "response": {
            "response": {
              "responseFormat": "file"
            }
          },
          "timeout": 60000
        }
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000006",
      "name": "⬇️ Video Binary İndir",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1300, 200]
    },
    {
      "parameters": {
        "jsCode": "// ⚠️ Aşağıdaki KOD BLOĞU 1'i buraya yapıştırın"
      },
      "id": "f1a2b3c4-1111-4aaa-bbbb-000000000007",
      "name": "🔄 Gemini İsteği Hazırla",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1560, 200]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=⚠️GEMINI_API_KEY_BURAYA",
        "authentication": "none",
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
        "jsonBody": "={{ JSON.stringify($json.
```

