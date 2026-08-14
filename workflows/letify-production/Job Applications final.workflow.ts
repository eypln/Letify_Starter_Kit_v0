import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : Job Applications final
// Nodes   : 18  |  Connections: 18
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// FilterAlreadyProcessed             code
// MarkProcessed                      code
// ScheduleTrigger1                   scheduleTrigger
// GetLastrun1                        code
// SearchFilesAndFolders2             googleDrive                [creds]
// RemoveDuplicatesCurrentRun1        removeDuplicates
// LoopOverItems1                     splitInBatches
// DownloadFile2                      googleDrive                [creds]
// ExtractFromFile2                   extractFromFile
// InformationExtractorNationality2   informationExtractor       [AI]
// OpenaiChatModel2                   lmChatOpenAi               [creds] [ai_languageModel]
// CreateARow2                        supabase                   [creds]
// UpdateLastrun1                     code
// If_                                if
// HttpRequest                        httpRequest
// SetOcrText                         set
// Merge                              merge
// DownloadFileOcr                    googleDrive                [creds]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ScheduleTrigger1
//    → GetLastrun1
//      → SearchFilesAndFolders2
//        → RemoveDuplicatesCurrentRun1
//          → FilterAlreadyProcessed
//            → LoopOverItems1
//              → UpdateLastrun1
//             .out(1) → DownloadFile2
//                → ExtractFromFile2
//                  → If_
//                    → DownloadFileOcr
//                      → HttpRequest
//                        → SetOcrText
//                          → Merge
//                            → InformationExtractorNationality2
//                              → CreateARow2
//                                → MarkProcessed
//                                  → LoopOverItems1 (↩ loop)
//                   .out(1) → Merge.in(1) (↩ loop)
//
// AI CONNECTIONS
// InformationExtractorNationality2.uses({ ai_languageModel: OpenaiChatModel2 })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'baD3wkWjjZc5TMZc',
    name: 'Job Applications final',
    active: false,
    isArchived: false,
    settings: {
        executionOrder: 'v1',
        availableInMCP: true,
        timeSavedMode: 'fixed',
        timezone: 'Europe/Malta',
        callerPolicy: 'workflowsFromSameOwner',
        binaryMode: 'separate',
    },
})
export class JobApplicationsFinalWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '210ee378-b98c-4ce3-87ea-1e9ed896cb4e',
        name: 'Filter already processed',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [208, 1056],
    })
    FilterAlreadyProcessed = {
        jsCode: `const data = $getWorkflowStaticData('global');
data.processedIds ??= {}; // { [driveId]: timestampMs }

const now = Date.now();
const TTL_DAYS = 30;
const ttlMs = TTL_DAYS * 24 * 60 * 60 * 1000;

// prune old ids
for (const [id, ts] of Object.entries(data.processedIds)) {
  if (now - ts > ttlMs) delete data.processedIds[id];
}

const out = [];
for (const item of $input.all()) {
  const id = item.json.id;
  if (!id) continue;
  if (!data.processedIds[id]) out.push(item);
}

return out;
`,
    };

    @node({
        id: '798702b5-2e3f-45e8-ba49-d66f090e1fcd',
        name: 'Mark processed',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2032, 1040],
    })
    MarkProcessed = {
        jsCode: `const data = $getWorkflowStaticData('global');
data.processedIds ??= {};

const now = Date.now();
const driveId = $('Download file2').item.json.id;
if (driveId) {
    data.processedIds[driveId] = now;
}

return $input.all();
`,
    };

    @node({
        id: 'e4658dcf-8462-4045-9773-eabc7c6fd9ae',
        name: 'Schedule Trigger1',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1,
        position: [-704, 1056],
    })
    ScheduleTrigger1 = {
        rule: {
            interval: [
                {
                    field: 'minutes',
                    minutesInterval: 10,
                },
            ],
        },
    };

    @node({
        id: 'b29c6d75-f3f8-4fdf-9ee9-688063e760e7',
        name: 'Get lastRun1',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-480, 1056],
    })
    GetLastrun1 = {
        jsCode: `const data = $getWorkflowStaticData('global');
// default: look back 24h on first run
if (!data.lastRun) {
  data.lastRun = new Date(Date.now() - 24*60*60*1000).toISOString();
}
return [{ json: { lastRun: data.lastRun } }];
`,
    };

    @node({
        id: 'a47c4d44-5968-4e27-a597-2a76989c2c73',
        name: 'Search files and folders2',
        type: 'n8n-nodes-base.googleDrive',
        version: 3,
        position: [-240, 1056],
        credentials: { googleDriveOAuth2Api: { id: '5YGx4MhkxewTd4Hk', name: 'Google Drive account 2' } },
    })
    SearchFilesAndFolders2 = {
        resource: 'fileFolder',
        searchMethod: 'query',
        queryString: `=mimeType='application/pdf'
and createdTime > '{{ $json.lastRun }}'
and trashed=false
and (
  '1WZ8q9MSPg4kXGjXlG03Qz2HjFrZKlv-s' in parents or
  '1LpCdBxxLbH2BDYh4rkk1s2FIV2nyBcqa' in parents or
  '1VYTjm_rx2XfigTX1LKJQXiJsTJ6Q6PMS' in parents or
  '1q4-grrxWOrIExhsh3fE7BJ7T0cjwnxHJ' in parents or
  '1Mbtv8w10dGXbeJLFbIW5chKrXjzdfW-y' in parents or
  '1DogScQMzoIGW5Cja743oxlcLzQMeJCsI' in parents or
  '18-Yo2KQLPT4XWbUw0MoJGRF3j21eg6Iv' in parents or
  '18thPABdCcVeY7ji_JzRO9H_NrCISfeYq' in parents or
  '1Yk0ZLMUZPwcKLa1tnyubpwFeYmS9zrT4' in parents or
  '1UnPYcMoVNLZnV3mpcMJXbsQg-xMdaUZk' in parents or
  '1Clk7bn6iOVMfMmhuXvtsDNX9YWQTwWqs' in parents or
  '1qBmCp0VqhZF-_oCtQPUuRycQNzhzWFjl' in parents
)`,
        returnAll: true,
        filter: {},
        options: {
            fields: ['id', 'name', 'mimeType', 'webViewLink'],
        },
    };

    @node({
        id: '93924d05-1c03-47a9-ba21-83e21d990b9a',
        name: 'Remove Duplicates (current run)1',
        type: 'n8n-nodes-base.removeDuplicates',
        version: 1,
        position: [-16, 1056],
    })
    RemoveDuplicatesCurrentRun1 = {
        compare: 'selectedFields',
        fieldsToCompare: ['id'],
        options: {},
    };

    @node({
        id: 'b0e110a4-7ebb-4fed-8242-243624bf494a',
        name: 'Loop Over Items1',
        type: 'n8n-nodes-base.splitInBatches',
        version: 3,
        position: [480, 1008],
    })
    LoopOverItems1 = {
        options: {},
    };

    @node({
        id: '62d04ae2-251b-4eec-a7cb-635c31f49f44',
        name: 'Download file2',
        type: 'n8n-nodes-base.googleDrive',
        version: 3,
        position: [704, 784],
        credentials: { googleDriveOAuth2Api: { id: '5YGx4MhkxewTd4Hk', name: 'Google Drive account 2' } },
    })
    DownloadFile2 = {
        operation: 'download',
        fileId: {
            __rl: true,
            value: '={{$json.id}}',
            mode: 'id',
        },
        options: {},
    };

    @node({
        id: '91edbd8d-ff09-43dd-a1c6-23bd217bb010',
        name: 'Extract from File2',
        type: 'n8n-nodes-base.extractFromFile',
        version: 1.1,
        position: [864, 784],
    })
    ExtractFromFile2 = {
        operation: 'pdf',
        binaryPropertyName: 'data',
        destinationKey: 'text',
        options: {},
    };

    @node({
        id: '58d1bf1f-49fc-43ea-a637-52813f99eccc',
        name: 'Information Extractor-Nationality2',
        type: '@n8n/n8n-nodes-langchain.informationExtractor',
        version: 1.2,
        position: [1472, 864],
    })
    InformationExtractorNationality2 = {
        text: "={{ $json.text || $json.data?.text || '' }}",
        schemaType: 'manual',
        inputSchema: `{
  "type": "object",
  "properties": {
    "name": { "type": "string" },

    "phone": { "type": "string" },

    "email": {
      "anyOf": [
        { "type": "string", "format": "email" },
        { "type": "string", "maxLength": 0 }
      ]
    },

    "nationality": {
      "type": "string",
      "description": "Only if explicitly mentioned (Nationality/Citizenship)"
    },

    "nationality_inferred": {
      "type": "string",
      "description": "Best single-country guess if not explicit"
    },

    "nationality_iso2": {
      "anyOf": [
        { "type": "string", "minLength": 2, "maxLength": 2 },
        { "type": "string", "maxLength": 0 }
      ],
      "description": "ISO 3166-1 alpha-2 of nationality_inferred, uppercase (e.g., CO, AR, TR). Empty if not inferred."
    },

    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },

    "evidence": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Short evidence snippets used for inference"
    }
  },
  "required": ["name"],
  "additionalProperties": false
}
`,
        options: {
            systemPromptTemplate: `You are extracting fields from a resume. Return ONLY valid JSON matching the provided schema.

Nationality logic and evidence priority:
1) If nationality/citizenship is explicitly stated, set "nationality" and leave "nationality_inferred" empty.
2) If not explicit, INFER nationality with this priority order:
   (a) EDUCATION country (degree-granting institutions and their cities)
   (b) WORK history locations (employer city/country)
   (c) Explicit addresses/cities mentioned in the CV
   (d) Phone country code (residence indicator, weaker than education/work)
   (e) Other government IDs/passport hints
- Do NOT rely on languages spoken to infer nationality.
- If multiple countries appear, prefer the EDUCATION country; if multiple education countries, choose the one linked to the highest degree or longest program.
- Provide "nationality_iso2" as ISO 3166-1 alpha-2 (uppercase).
- "evidence": include short snippets like "Politecnico Grancolombiano (Bogotá, Colombia)" or "+57 phone code".
- If inference is weak, set a lower "confidence" (<0.6) or leave inferred fields empty with confidence = 0.
`,
        },
    };

    @node({
        id: 'e2bd92b7-3b0d-470f-8227-1a5920302b4d',
        name: 'OpenAI Chat Model2',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1.3,
        position: [1280, 1072],
        credentials: { openAiApi: { id: 'kfYh29FgQML52uYP', name: 'OpenAi account' } },
    })
    OpenaiChatModel2 = {
        model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4.1-mini',
        },
        builtInTools: {},
        options: {
            textFormat: {
                textOptions: {
                    type: 'json_object',
                },
            },
        },
    };

    @node({
        id: '5485b652-0d7a-42a3-8f82-2b4f43850b28',
        name: 'Create a row2',
        type: 'n8n-nodes-base.supabase',
        version: 1,
        position: [1824, 864],
        credentials: { supabaseApi: { id: 'wZcWsPQorjSv769P', name: 'Supabase account' } },
    })
    CreateARow2 = {
        tableId: 'applications',
        fieldsUi: {
            fieldValues: [
                {
                    fieldId: 'applicant_name',
                    fieldValue: '={{ $json.output.name }}',
                },
                {
                    fieldId: 'nationality',
                    fieldValue:
                        "={{ $json.output.nationality || $json.output.nationality_inferred || $json.output.nationality_iso2 || '' }}",
                },
                {
                    fieldId: 'phone',
                    fieldValue: '={{ $json.output.phone }}',
                },
                {
                    fieldId: 'email',
                    fieldValue: '={{ $json.output.email }}',
                },
                {
                    fieldId: 'user_id',
                    fieldValue: 'c75e2b9a-aeda-415d-bbfd-b7c90e6e54e1',
                },
                {
                    fieldId: 'application_date',
                    fieldValue: '={{$now.toUTC().toISO()}}',
                },
                {
                    fieldId: 'cv_webviewlink',
                    fieldValue: "={{ $('Search files and folders2').item.json.webViewLink }}",
                },
                {
                    fieldId: 'drive_file_id',
                    fieldValue: "={{ $('Download file2').item.json.id }}",
                },
            ],
        },
    };

    @node({
        id: '68b688ac-ae55-4178-9aad-48471e53211f',
        name: 'Update lastRun1',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [640, 528],
    })
    UpdateLastrun1 = {
        jsCode: `const data = $getWorkflowStaticData('global');
// lastRun is used in the next schedule tick
// Use 'now' AFTER the batch has completed
const now = new Date().toISOString();
data.lastRun = now;
return [{ json: { lastRun: now } }];
`,
    };

    @node({
        id: '1fe85205-ccb8-4044-9c5d-add935574924',
        name: 'If',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [1088, 624],
    })
    If_ = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 3,
            },
            conditions: [
                {
                    id: '7d6340f7-fc6a-4e05-8af2-4c747c18ed03',
                    leftValue: '={{ !$json.text || $json.text.trim().length === 0 }}',
                    rightValue: '',
                    operator: {
                        type: 'boolean',
                        operation: 'true',
                        singleValue: true,
                    },
                },
            ],
            combinator: 'and',
        },
        options: {},
    };

    @node({
        id: '470374f3-0904-4dec-a4af-2c9441671270',
        name: 'HTTP Request',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.4,
        position: [1408, 480],
    })
    HttpRequest = {
        method: 'POST',
        url: 'https://api.ocr.space/parse/image',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'apikey',
                    value: 'K86311226188957',
                },
            ],
        },
        sendBody: true,
        contentType: 'multipart-form-data',
        bodyParameters: {
            parameters: [
                {
                    parameterType: 'formBinaryData',
                    name: 'file',
                    inputDataFieldName: 'data',
                },
                {
                    name: 'language',
                    value: 'eng',
                },
                {
                    name: 'isOverlayRequired',
                    value: 'false',
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'ca434674-0b07-4069-b3bc-bc723070d6b4',
        name: 'Set Ocr Text',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [1568, 480],
    })
    SetOcrText = {
        assignments: {
            assignments: [
                {
                    id: 'c4bb7fa7-d7aa-462c-828f-b398c2bc33da',
                    name: 'text',
                    value: '={{ $json.ParsedResults[0].ParsedText }}',
                    type: 'string',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '86a8f626-6595-4389-9846-754fd0b91c33',
        name: 'Merge',
        type: 'n8n-nodes-base.merge',
        version: 3.2,
        position: [1728, 624],
    })
    Merge = {};

    @node({
        id: 'f3f5290c-3124-4778-97c4-3992c72d72f4',
        name: 'Download file OCR',
        type: 'n8n-nodes-base.googleDrive',
        version: 3,
        position: [1248, 480],
        credentials: { googleDriveOAuth2Api: { id: '5YGx4MhkxewTd4Hk', name: 'Google Drive account 2' } },
    })
    DownloadFileOcr = {
        operation: 'download',
        fileId: {
            __rl: true,
            value: '={{ $node["Download file2"].json["id"] }}',
            mode: 'id',
        },
        options: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.FilterAlreadyProcessed.out(0).to(this.LoopOverItems1.in(0));
        this.MarkProcessed.out(0).to(this.LoopOverItems1.in(0));
        this.ScheduleTrigger1.out(0).to(this.GetLastrun1.in(0));
        this.GetLastrun1.out(0).to(this.SearchFilesAndFolders2.in(0));
        this.SearchFilesAndFolders2.out(0).to(this.RemoveDuplicatesCurrentRun1.in(0));
        this.RemoveDuplicatesCurrentRun1.out(0).to(this.FilterAlreadyProcessed.in(0));
        this.LoopOverItems1.out(0).to(this.UpdateLastrun1.in(0));
        this.LoopOverItems1.out(1).to(this.DownloadFile2.in(0));
        this.DownloadFile2.out(0).to(this.ExtractFromFile2.in(0));
        this.ExtractFromFile2.out(0).to(this.If_.in(0));
        this.InformationExtractorNationality2.out(0).to(this.CreateARow2.in(0));
        this.CreateARow2.out(0).to(this.MarkProcessed.in(0));
        this.If_.out(0).to(this.DownloadFileOcr.in(0));
        this.If_.out(1).to(this.Merge.in(1));
        this.HttpRequest.out(0).to(this.SetOcrText.in(0));
        this.SetOcrText.out(0).to(this.Merge.in(0));
        this.Merge.out(0).to(this.InformationExtractorNationality2.in(0));
        this.DownloadFileOcr.out(0).to(this.HttpRequest.in(0));

        this.InformationExtractorNationality2.uses({
            ai_languageModel: this.OpenaiChatModel2.output,
        });
    }
}
