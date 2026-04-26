import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : 🧠 Social Media Brain - Derin Analiz
// Nodes   : 9  |  Connections: 8
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// Her5Dakika                         scheduleTrigger
// NotionSmIcerikAl                   notion                     [creds]
// StatusDeepAnalysis                 notion                     [creds]
// PlatformTespit                     code
// ApifyMetaAl                        httpRequest
// SmAnalizIstegiHazRla               code
// GeminiSmAnaliz                     httpRequest
// AnalizParseEt                      code
// NotionAnalizYaz                    notion                     [creds]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// Her5Dakika
//    → NotionSmIcerikAl
//      → StatusDeepAnalysis
//        → PlatformTespit
//          → ApifyMetaAl
//            → SmAnalizIstegiHazRla
//              → GeminiSmAnaliz
//                → AnalizParseEt
//                  → NotionAnalizYaz
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'cijxgAyjKxOT8zBJ',
    name: '🧠 Social Media Brain - Derin Analiz',
    active: false,
    settings: { executionOrder: 'v1', callerPolicy: 'workflowsFromSameOwner', availableInMCP: false },
})
export class SocialMediaBrainDerinAnalizWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: 'sm-0001',
        name: '⏰ Her 5 Dakika',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.2,
        position: [-288, 80],
    })
    Her5Dakika = {
        rule: {
            interval: [
                {
                    field: 'minutes',
                    minutesInterval: 5,
                },
            ],
        },
    };

    @node({
        id: 'sm-0002',
        name: '📋 Notion - SM İçerik Al',
        type: 'n8n-nodes-base.notion',
        version: 2.2,
        position: [-64, 80],
        credentials: { notionApi: { id: 'e4tmmqbaPyONZSTY', name: 'Notion account' } },
    })
    NotionSmIcerikAl = {
        resource: 'databasePage',
        operation: 'getAll',
        databaseId: {
            __rl: true,
            value: 'a66165cd-5be6-43ac-a2dc-4b370e85de9c',
            mode: 'list',
            cachedResultName: 'Links for AI Agent Brain',
            cachedResultUrl: 'https://www.notion.so/a66165cd5be643aca2dc4b370e85de9c',
        },
        limit: 1,
        filterType: 'manual',
        filters: {
            conditions: [
                {
                    key: 'Status|status',
                    condition: 'equals',
                    statusValue: 'Done',
                },
                {
                    key: 'Tags|multi_select',
                    condition: 'contains',
                    multiSelectValue: 'Social Media',
                },
            ],
            combinator: 'and',
        },
        options: {
            downloadFiles: false,
        },
    };

    @node({
        id: 'sm-0003',
        name: '📝 Status → Deep Analysis',
        type: 'n8n-nodes-base.notion',
        version: 2.2,
        position: [208, 80],
        credentials: { notionApi: { id: 'e4tmmqbaPyONZSTY', name: 'Notion account' } },
    })
    StatusDeepAnalysis = {
        resource: 'databasePage',
        operation: 'update',
        pageId: {
            __rl: true,
            value: "={{ $('📋 Notion - SM İçerik Al').item.json.id }}",
            mode: 'id',
        },
        propertiesUi: {
            propertyValues: [
                {
                    key: 'Status|status',
                    statusValue: 'In progress',
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'sm-0004',
        name: '🔀 Platform Tespit',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [464, 80],
    })
    PlatformTespit = {
        jsCode: `const url = $('📋 Notion - SM İçerik Al').first().json.property_url || '';

const platformMap = {
  instagram: {
    actorId: 'shu8hvrXbJbY3Eb9W',
    bodyKey: 'directUrls',
    platform: 'instagram'
  },
  facebook: {
    actorId: 'PBJEdJdctLHQaqdfe',
    bodyKey: 'startUrls',
    platform: 'facebook'
  },
  youtube: {
    actorId: 'h7sDV53CddomktSi5',
    bodyKey: 'startUrls',
    platform: 'youtube'
  },
  tiktok: {
    actorId: '7200360993149553925',
    bodyKey: 'postURLs',
    platform: 'tiktok'
  }
};

let detected = 'unknown';
if (url.includes('instagram.com')) detected = 'instagram';
else if (url.includes('facebook.com') || url.includes('fb.watch')) detected = 'facebook';
else if (url.includes('youtube.com') || url.includes('youtu.be')) detected = 'youtube';
else if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) detected = 'tiktok';

const config = platformMap[detected];

if (!config) {
  return [{ json: { error: true, platform: 'unknown', url, message: 'Desteklenmeyen platform: ' + url } }];
}

const apifyToken = 'ENV_APIFY_TOKEN';
const apifyUrl = \`https://api.apify.com/v2/acts/\${config.actorId}/run-sync-get-dataset-items?token=\${apifyToken}\`;

let requestBody = {};
if (detected === 'instagram') requestBody = { directUrls: [url], resultsType: 'posts' };
else if (detected === 'facebook') requestBody = { startUrls: [{ url }] };
else if (detected === 'youtube') requestBody = { startUrls: [{ url }], maxResults: 1 };
else if (detected === 'tiktok') requestBody = { postURLs: [url] };

return [{ json: { error: false, platform: detected, url, apifyUrl, requestBody } }];`,
    };

    @node({
        id: 'sm-0005',
        name: '🎬 Apify - Meta Al',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [688, 80],
    })
    ApifyMetaAl = {
        method: 'POST',
        url: '={{ $json.apifyUrl }}',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ JSON.stringify($json.requestBody) }}',
        options: {
            timeout: 120000,
        },
    };

    @node({
        id: 'sm-0006',
        name: '🔄 SM Analiz İsteği Hazırla',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [944, 80],
    })
    SmAnalizIstegiHazRla = {
        jsCode: `const apifyData = $input.first().json;
const notionItem = $('📋 Notion - SM İçerik Al').first().json;
const contentUrl = notionItem.property_url || 'URL yok';
const title = notionItem.property_title || notionItem.name || 'Başlık yok';

const prompt = \`Sen dünya çapında deneyimli bir Sosyal Medya Stratejisti ve Büyüme Uzmanısın. Sana gösterilen içeriği (video veya görseller) EN DERİN düzeyde analiz et.

Bu analiz, bir emlak şirketinin sosyal medya beyni için yapılıyor. Her analiz bu beyni besleyecek ve geliştirecek. Amacımız: Gördüğümüz her içerikten öğrenilebilecek SOMUT, UYGULANABİLİR strateji ve taktikleri çıkarmak.

─────────────────────────────────
📋 ANALİZ YAPISI — AYNEN BU JSON FORMATINDA CEVAP VER:
─────────────────────────────────

{
  "content_summary": "İçeriğin 2-3 cümlelik özeti",
  
  "hook_analysis": {
    "hook_type": "İlk 3 saniyede kullanılan hook tipi (soru, şok istatistik, merak boşluğu, görsel dikkat çekici, vs.)",
    "hook_text": "Varsa hook'un tam metni",
    "hook_effectiveness": 8,
    "hook_lesson": "Bu hook'tan ne öğrenebiliriz? Kendi içeriklerimize nasıl uyarlayabiliriz?"
  },
  
  "content_structure": {
    "format": "Reel/Carousel/Story/Post/Video",
    "duration_seconds": 0,
    "scene_count": 0,
    "pacing": "Hızlı/Orta/Yavaş - açıklama",
    "text_overlay_used": true,
    "music_type": "Trending/Original/Voiceover/Sessiz",
    "cta_used": "Kullanılan CTA (call to action) varsa",
    "structure_lesson": "Bu yapıdan ne öğrenebiliriz?"
  },
  
  "algorithm_signals": {
    "watch_time_optimization": "İzlenme süresini artırmak için kullanılan teknikler",
    "engagement_triggers": ["Yorum yazdırmak için kullanılan taktikler"],
    "shareability_factors": "Paylaşılabilirliği artıran unsurlar",
    "save_worthiness": "Kaydetmeye değer kılan unsurlar",
    "algorithm_lesson": "Algoritma açısından ne öğrenebiliriz?"
  },
  
  "posting_strategy_insights": {
    "best_content_type_for_reach": "Bu tarz içerik reach için mi, engagement için mi, follower kazanmak için mi ideal?",
    "frequency_suggestion": "Bu tarz içerik haftada kaç kez paylaşılmalı?",
    "best_time_hint": "İçeriğin hedef kitlesine göre ideal paylaşım zamanı tahmini",
    "series_potential": "Bu içerik bir seriye dönüştürülebilir mi? Nasıl?"
  },
  
  "visual_branding": {
    "color_palette": "Kullanılan renk paleti",
    "typography": "Yazı tipi stili",
    "thumbnail_strategy": "Kapak görseli stratejisi",
    "brand_consistency": "Marka tutarlılığı değerlendirmesi",
    "visual_lesson": "Görsel açıdan ne öğrenebiliriz?"
  },
  
  "copywriting_analysis": {
    "caption_style": "Caption yazım stili",
    "hashtag_strategy": "Hashtag kullanımı analizi",
    "emoji_usage": "Emoji kullanım stratejisi",
    "storytelling_technique": "Hikaye anlatım tekniği",
    "copywriting_lesson": "Metin yazarlığından ne öğrenebiliriz?"
  },
  
  "adaptation_plan": {
    "can_we_adapt": true,
    "adaptation_idea": "Bu içeriği emlak/Letify markası için NASIL uyarlayabiliriz? Somut fikir ver.",
    "difficulty": "Kolay/Orta/Zor",
    "required_resources": "Gerekli kaynaklar (ekipman, yazılım, süre)",
    "expected_performance": "Beklenen performans tahmini"
  },
  
  "key_takeaways": [
    "1. En önemli çıkarım",
    "2. İkinci önemli çıkarım",
    "3. Üçüncü önemli çıkarım"
  ],
  
  "brain_tags": ["hook-stratejisi", "reels-format", "algorithm-hack"]
}

ÖNEMLİ KURALLAR:
- Her alanı DOLDUR, boş bırakma
- Genel/soyut cevaplar verme, HER ZAMAN somut ve uygulanabilir ol
- "brain_tags" alanına bu içerikten çıkan anahtar kavramları yaz (ileride arama/filtreleme için)
- Emlak/gayrimenkul sektörü perspektifinden değerlendir
- Rakamsal tahminler ver (engagement oranı, reach potansiyeli vs.)

İçerik Başlığı: \${title}
İçerik Linki: \${contentUrl}\`;

async function downloadAsBase64(url) {
  const response = await this.helpers.request({
    method: 'GET',
    uri: url,
    encoding: null,
  });
  return response.toString('base64');
}

function detectMime(url) {
  const lower = url.toLowerCase();
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.mp4')) return 'video/mp4';
  return 'image/jpeg';
}

let parts = [];

if (apifyData.videoUrl) {
  const base64 = await downloadAsBase64.call(this, apifyData.videoUrl);
  parts.push({ inlineData: { mimeType: 'video/mp4', data: base64 } });
} else if (apifyData.images && apifyData.images.length > 0) {
  const maxImages = Math.min(apifyData.images.length, 10);
  for (let i = 0; i < maxImages; i++) {
    const base64 = await downloadAsBase64.call(this, apifyData.images[i]);
    parts.push({ inlineData: { mimeType: detectMime(apifyData.images[i]), data: base64 } });
  }
} else if (apifyData.displayUrl) {
  const base64 = await downloadAsBase64.call(this, apifyData.displayUrl);
  parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } });
}

const caption = apifyData.caption || apifyData.alt || '';
if (caption) parts.push({ text: 'Post caption: ' + caption });

parts.push({ text: prompt });

const requestBody = {
  contents: [{ parts }],
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json'
  }
};

return [{ json: { requestBody } }];`,
    };

    @node({
        id: 'sm-0007',
        name: '🧠 Gemini SM Analiz',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [1200, 80],
    })
    GeminiSmAnaliz = {
        method: 'POST',
        url: '=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=AIzaSyD2i7wRCjysN41ka-hD0VKrAcpaEaDeezU',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ JSON.stringify($json.requestBody) }}',
        options: {
            timeout: 180000,
        },
    };

    @node({
        id: 'sm-0008',
        name: '📊 Analiz Parse Et',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1456, 80],
    })
    AnalizParseEt = {
        jsCode: `try {
  const responseText = $input.first().json.candidates[0].content.parts[0].text;
  const cleanText = responseText.replace(/\`\`\`json\\n?/g, '').replace(/\`\`\`\\n?/g, '').trim();
  const parsed = JSON.parse(cleanText);
  
  const brainSummary = [
    '📋 ' + (parsed.content_summary || ''),
    '',
    '🪝 HOOK: ' + (parsed.hook_analysis?.hook_type || 'N/A') + ' (Skor: ' + (parsed.hook_analysis?.hook_effectiveness || 'N/A') + '/10)',
    parsed.hook_analysis?.hook_lesson || '',
    '',
    '📐 YAPI: ' + (parsed.content_structure?.format || 'N/A') + ' | ' + (parsed.content_structure?.pacing || ''),
    parsed.content_structure?.structure_lesson || '',
    '',
    '📊 ALGORİTMA:',
    '  İzlenme Opt: ' + (parsed.algorithm_signals?.watch_time_optimization || 'N/A'),
    '  Engagement: ' + (parsed.algorithm_signals?.engagement_triggers?.join(', ') || 'N/A'),
    '  Paylaşılabilirlik: ' + (parsed.algorithm_signals?.shareability_factors || 'N/A'),
    parsed.algorithm_signals?.algorithm_lesson || '',
    '',
    '📅 PAYLAŞIM STRATEJİSİ:',
    '  Amaç: ' + (parsed.posting_strategy_insights?.best_content_type_for_reach || 'N/A'),
    '  Sıklık: ' + (parsed.posting_strategy_insights?.frequency_suggestion || 'N/A'),
    '  Seri Potansiyeli: ' + (parsed.posting_strategy_insights?.series_potential || 'N/A'),
    '',
    '🎨 GÖRSEL: ' + (parsed.visual_branding?.visual_lesson || 'N/A'),
    '',
    '✍️ COPY: ' + (parsed.copywriting_analysis?.copywriting_lesson || 'N/A'),
    '',
    '🔄 UYARLAMA: ' + (parsed.adaptation_plan?.adaptation_idea || 'N/A'),
    '  Zorluk: ' + (parsed.adaptation_plan?.difficulty || 'N/A'),
    '',
    '🎯 ÇIKANIMLAR:',
    ...(parsed.key_takeaways || []).map(t => '  • ' + t),
    '',
    '🏷️ TAGS: ' + (parsed.brain_tags || []).join(', ')
  ].join('\\n');
  
  return [{ json: {
    brainSummary,
    brainTags: parsed.brain_tags || [],
    hookType: parsed.hook_analysis?.hook_type || '',
    hookScore: parsed.hook_analysis?.hook_effectiveness || 0,
    contentFormat: parsed.content_structure?.format || '',
    adaptationIdea: parsed.adaptation_plan?.adaptation_idea || '',
    fullAnalysis: parsed
  }}];
  
} catch (e) {
  return [{ json: {
    brainSummary: 'HATA: Analiz parse edilemedi - ' + e.message,
    brainTags: [],
    hookType: '',
    hookScore: 0,
    contentFormat: '',
    adaptationIdea: '',
    fullAnalysis: null
  }}];
}`,
    };

    @node({
        id: 'sm-0009',
        name: '✅ Notion - Analiz Yaz',
        type: 'n8n-nodes-base.notion',
        version: 2.2,
        position: [1728, 80],
        credentials: { notionApi: { id: 'e4tmmqbaPyONZSTY', name: 'Notion account' } },
    })
    NotionAnalizYaz = {
        resource: 'databasePage',
        operation: 'update',
        pageId: {
            __rl: true,
            value: "={{ $('📋 Notion - SM İçerik Al').item.json.id }}",
            mode: 'id',
        },
        propertiesUi: {
            propertyValues: [
                {
                    key: 'AI Brain Analysis|rich_text',
                    textContent: '={{ $json.brainSummary.substring(0, 2000) }}',
                },
                {
                    key: 'Status|status',
                    statusValue: 'Done',
                },
            ],
        },
        options: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.Her5Dakika.out(0).to(this.NotionSmIcerikAl.in(0));
        this.NotionSmIcerikAl.out(0).to(this.StatusDeepAnalysis.in(0));
        this.StatusDeepAnalysis.out(0).to(this.PlatformTespit.in(0));
        this.PlatformTespit.out(0).to(this.ApifyMetaAl.in(0));
        this.ApifyMetaAl.out(0).to(this.SmAnalizIstegiHazRla.in(0));
        this.SmAnalizIstegiHazRla.out(0).to(this.GeminiSmAnaliz.in(0));
        this.GeminiSmAnaliz.out(0).to(this.AnalizParseEt.in(0));
        this.AnalizParseEt.out(0).to(this.NotionAnalizYaz.in(0));
    }
}
