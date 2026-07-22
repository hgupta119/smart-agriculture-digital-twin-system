import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

/**
 * Centralized dynamic Gemini model selection.
 * Fetches available models from Google API and selects the best one dynamically.
 */
let cachedModels: string[] = [];
let currentModelIndex = 0;
let cachedGeminiModel: string | null = null;
let GEMINI_MODEL = process.env.GEMINI_MODEL || "";

function getModelScore(modelName: string): number {
  const name = modelName.toLowerCase();
  let score = 0;

  // Prefer newer major versions if mentioned in the model name
  if (name.includes('gemini-2.5')) {
    score += 50;
  } else if (name.includes('gemini-2.0')) {
    score += 40;
  } else if (name.includes('gemini-1.5')) {
    score += 30;
  } else if (name.includes('gemini-1.0')) {
    score += 20;
  } else {
    score += 10;
  }

  // Tier preferences: pro > flash > flash-lite / others
  if (name.includes('-pro') || name.includes('pro-')) {
    score += 5;
  } else if (name.includes('-flash-lite')) {
    score += 1;
  } else if (name.includes('-flash') || name.includes('flash-')) {
    score += 3;
  }

  // Deprioritize experimental, tuning, or temporary models
  if (name.includes('exp') || name.includes('experimental') || name.includes('preview')) {
    score -= 10;
  }
  if (name.includes('tuning') || name.includes('tuned')) {
    score -= 20;
  }

  return score;
}

async function getSupportedModel(apiKey: string, forceNext = false): Promise<string> {
  if (cachedGeminiModel && !forceNext) {
    return cachedGeminiModel;
  }

  if (cachedModels.length > 0 && forceNext) {
    currentModelIndex++;
    if (currentModelIndex < cachedModels.length) {
      cachedGeminiModel = cachedModels[currentModelIndex];
      GEMINI_MODEL = cachedGeminiModel;
      console.log(`[AI Init] Switched model to next available: ${cachedGeminiModel} (index ${currentModelIndex}/${cachedModels.length})`);
      return cachedGeminiModel;
    } else {
      console.warn(`[AI Init] Exhausted all available models in cache. Re-fetching model list...`);
      cachedModels = [];
      currentModelIndex = 0;
    }
  }

  console.log(`[AI Init] Fetching available Gemini models from API...`);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`[AI Init Error] Failed to fetch models: HTTP ${res.status} | Body: ${errBody}`);
    throw new Error(`Unable to fetch Gemini models (HTTP ${res.status})`);
  }

  const data = await res.json();
  const available = (data.models || [])
    .filter((m: any) =>
      (m.supportedGenerationMethods || []).includes("generateContent")
    )
    .map((m: any) => m.name);

  if (available.length === 0) {
    throw new Error("No Gemini generateContent models found in API response.");
  }

  // Rank the available models
  const ranked = available.map((name: string) => ({
    name,
    score: getModelScore(name)
  }));

  // If a GEMINI_MODEL env var exists, we can boost it to be chosen first if it exists in available models
  const envModel = process.env.GEMINI_MODEL;
  if (envModel) {
    const matched = ranked.find((r: any) => r.name.toLowerCase() === envModel.toLowerCase() || r.name.toLowerCase().endsWith(envModel.toLowerCase()));
    if (matched) {
      matched.score += 1000; // Boost to top
    }
  }

  ranked.sort((a: any, b: any) => b.score - a.score);
  cachedModels = ranked.map((r: any) => r.name);
  currentModelIndex = 0;
  cachedGeminiModel = cachedModels[0];
  GEMINI_MODEL = cachedGeminiModel;

  console.log(`[AI Init] Available Ranked Models:`, cachedModels);
  console.log(`[AI Init] Selected Model: ${cachedGeminiModel}`);
  return cachedGeminiModel;
}

function maskKey(key: string | undefined): string {
  if (!key) return 'NOT_SET';
  return `${key.substring(0, 6)}...${key.substring(Math.max(0, key.length - 4))} (len=${key.length})`;
}

export interface IDiseaseResponse {
  diseaseName: string;
  confidence: number;
  treatment: string;
  cropType?: string;
  // Rich Gemini-powered fields
  severity?: string;
  symptoms?: string;
  causes?: string;
  prevention?: string;
  estimatedRecovery?: string;
  irrigation?: string;
  fertilizer?: string;
  imageForensics?: string;
  metadataAnalysis?: string;
  explainableAi?: string;
  manipulationDetection?: string;
  riskAssessment?: string;
  investigationTimeline?: string;
}

export interface ISoilAnalysisResult {
  soilHealth: number;
  deficiencies: string[];
  fertilizerRecommendation: string;
  irrigationRecommendation: string;
  suitableCrops: string[];
  riskLevel: 'Low' | 'Moderate' | 'High';
  recommendations: string[];
  aiReport?: string;
}

export interface IYieldResponse {
  expectedYield: string;
  accuracy: string;
  confidenceLevel: 'High' | 'Moderate' | 'Low';
  revenue: string;
  cost: string;
  profit: string;
  weatherImpact: 'Positive' | 'Negative' | 'Neutral';
  diseaseRisk: 'Low' | 'Moderate' | 'High';
  fertilizerImpact: 'Optimal' | 'Sub-optimal' | 'Deficient';
  waterRequirement: 'Efficient' | 'High Usage' | 'Deficient';
  marketOutlook: 'Bullish' | 'Stable' | 'Bearish';
  riskAnalysis: string;
  recommendations: {
    increaseYield: string;
    waterOpt: string;
    nutrient: string;
    disease: string;
    harvest: string;
  };
  aiReport?: string;
}

let openaiClient: OpenAI | null = null;

const getOpenAIClient = (): OpenAI => {
  if (!openaiClient) {
    const key = process.env.OPENAI_API_KEY;
    const len = key ? key.length : 0;
    const prefix = key ? key.substring(0, 6) : "N/A";
    const suffix = key ? key.substring(Math.max(0, len - 4)) : "N/A";
    console.log(`[AI Init] Initializing OpenAI Client. Key Length: ${len}, Key Preview: ${prefix}...${suffix}`);
    openaiClient = new OpenAI({
      apiKey: key || "MOCK_KEY"
    });
  }
  return openaiClient;
};

export const getAIProvider = (): 'openai' | 'gemini' | 'mock' => {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase().trim();
  const openAIKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (provider === 'openai') {
    if (openAIKey && openAIKey !== 'MOCK_KEY' && openAIKey.trim().length > 0) {
      return 'openai';
    }
    console.warn("⚠️ OpenAI requested but OPENAI_API_KEY is missing. Falling back to mock.");
    return 'mock';
  }

  if (provider === 'gemini') {
    if (geminiKey && geminiKey !== 'MOCK_KEY' && geminiKey.trim().length > 0) {
      return 'gemini';
    }
    console.warn(`⚠️ Gemini requested but GEMINI_API_KEY is missing or invalid. Key Length: ${geminiKey ? geminiKey.length : 0}. Falling back to mock.`);
    return 'mock';
  }

  return 'mock';
};

/**
 * Perform a direct REST API call to Gemini Generative Language API.
 * This bypasses SDK authentication checks which misclassify the new AQ. API key prefixes.
 * Includes automatic retry with exponential backoff for 429 RESOURCE_EXHAUSTED errors.
 */
async function callGeminiRest(model: string, payload: any, apiKey: string, moduleName: string, maxRetries: number = 3): Promise<string> {
  let activeModel = await getSupportedModel(apiKey);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;
    const maskedUrl = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=MASKED`;
    console.log(`\n[Gemini Request] Module: ${moduleName}`);
    console.log(`  Key:   ${maskKey(apiKey)}`);
    console.log(`  Model: ${activeModel}`);
    console.log(`  URL:   ${maskedUrl}`);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log(`[Gemini Response] Module: ${moduleName} | Attempt: ${attempt}/${maxRetries} | HTTP Status: ${res.status} ${res.statusText}`);

      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[Gemini FULL Error Body] Module: ${moduleName} | Status: ${res.status} | Body:\n${errBody}`);

        // If the model is not found (404/NOT_FOUND or specific API message)
        const isNotFound = res.status === 404 || 
                           errBody.includes("NOT_FOUND") || 
                           errBody.includes("is no longer available") || 
                           errBody.includes("model is not found") ||
                           errBody.includes("Model not found") ||
                           (errBody.includes("models/") && errBody.includes("not found"));

        if (isNotFound) {
          console.warn(`[Gemini Model Fallback] Model ${activeModel} is not available (HTTP ${res.status}). Switching to the next available model...`);
          try {
            activeModel = await getSupportedModel(apiKey, true);
            // Reset attempt counter so this fallback attempt doesn't count against retry limits
            attempt = 0;
            continue;
          } catch (fallbackErr: any) {
            console.error(`[Gemini Model Fallback Error] Failed to switch models: ${fallbackErr.message}`);
            throw new Error(`Gemini API Error (HTTP ${res.status}): ${errBody.substring(0, 500)}`);
          }
        }

        // Only retry on 429; all other errors are fatal
        if (res.status === 429 && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[Gemini Retry] ${delay}ms backoff before attempt ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Final failure — include the real status code in the error message
        throw new Error(`Gemini API Error (HTTP ${res.status}): ${errBody.substring(0, 500)}`);
      }

      // SUCCESS path
      const data = await res.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        console.error(`[Gemini REST Error] Invalid response structure:`, JSON.stringify(data).substring(0, 500));
        throw new Error("Gemini API response structure is missing generated text content candidates.");
      }

      console.log(`[Gemini Success] Module: ${moduleName} | Response length: ${candidateText.length} chars`);
      return candidateText;
    } catch (err: any) {
      if (err.message?.includes('Gemini API Error') || attempt >= maxRetries) {
        console.error(`[Gemini FATAL] Module: ${moduleName} | ${err.message}`);
        throw err;
      }
      // Network error on non-final attempt
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`[Gemini Network Error] Module: ${moduleName} | attempt ${attempt}/${maxRetries} | ${err.message} | Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('callGeminiRest: exhausted all retries');
}

/**
 * Hindi language instruction appended to AI prompts when language is 'hi'.
 */
const HINDI_PROMPT_INSTRUCTION = `
IMPORTANT: You MUST respond entirely in simple, natural Hindi (Devanagari script, UTF-8 encoded).
Use easy Hindi that Indian farmers can easily understand.
Do not use English except for technical/scientific terms like pH, NPK, mg/kg, etc.
Provide complete, detailed responses — not short summaries.`;

export const aiService = {
  /**
   * Leaf Disease Diagnostics Analysis
   * @param language - 'en' for English (default), 'hi' for Hindi
   */
  async detectDisease(base64Image: string, mimeType: string, cropType: string, language: 'en' | 'hi' = 'en'): Promise<IDiseaseResponse> {
    const provider = getAIProvider();
    console.log(`[AI Disease Scan] Active Provider: ${provider}, cropType: "${cropType}", language: "${language}"`);

    if (provider === 'openai') {
      console.log(`[Backend Request] Provider: openai, Model: gpt-4o-mini, Crop: "${cropType}", Language: "${language}"`);
      const client = getOpenAIClient();
      const promptText = `You are an expert plant pathologist and agricultural scientist. Analyze this crop leaf image of crop type: "${cropType}".
Generate a detailed report between 1000–1800 words based on the leaf image.
Return a JSON object matching EXACTLY this schema (no extra fields, no markdown, no comments):
{
  "diseaseName": "string — name of disease or 'Healthy' if no disease found",
  "confidence": 0.00,
  "treatment": "string — step-by-step treatment instructions",
  "severity": "None|Low|Moderate|High|Critical",
  "symptoms": "string — visible symptoms description",
  "causes": "string — biological or environmental causes",
  "prevention": "string — prevention measures",
  "estimatedRecovery": "string — e.g. '7-10 days' or 'N/A'",
  "irrigation": "string — specific watering advice to manage or prevent the disease",
  "fertilizer": "string — specific fertilizing advice to strengthen plant defenses against the disease",
  "imageForensics": "string - analysis of image pixels, EXIF integrity",
  "metadataAnalysis": "string - device metadata, timestamps, and sensor details",
  "explainableAi": "string - short summary of feature focus",
  "manipulationDetection": "string - details of any cloning or editing detected",
  "riskAssessment": "string - overall threat level, potential yield loss, pathogen speed",
  "investigationTimeline": "string - progression of the disease",
  "detailedReport": {
    "executiveSummary": {
      "species": "string - crop species",
      "healthScore": 0.0,
      "diseaseStatus": "string - health status",
      "severityLevel": "string - severity",
      "confidenceScore": 0,
      "summary": "string - executive summary"
    },
    "diseaseIdentification": {
      "name": "string",
      "scientificName": "string",
      "category": "string - Fungal|Bacterial|Viral|Nutrient deficiency|Water stress|Other",
      "pathogenType": "string",
      "affectedPlant": "string",
      "confidence": 0,
      "alternativeDiseases": "string",
      "selectionReason": "string"
    },
    "visualSymptoms": {
      "leafColor": "string",
      "spots": "string",
      "lesions": "string",
      "yellowing": "string",
      "browning": "string",
      "wilting": "string",
      "dryEdges": "string",
      "curling": "string",
      "mold": "string",
      "texture": "string",
      "veinCondition": "string",
      "damagedAreaPercent": 0,
      "aiObservation": "string - what the AI observed from the image"
    },
    "severityAssessment": {
      "classification": "Healthy|Early Stage|Moderate|Severe|Critical",
      "explanation": "string",
      "percentage": 0
    },
    "causes": {
      "fungal": "string",
      "bacterial": "string",
      "viral": "string",
      "nutrient": "string",
      "water": "string",
      "heat": "string",
      "cold": "string",
      "soil": "string",
      "humidity": "string",
      "overwatering": "string",
      "underwatering": "string"
    },
    "progression": {
      "stage": "string",
      "expectedSpread": "string",
      "riskWorsening": "string",
      "urgency": "string"
    },
    "treatmentPlan": {
      "chemical": "string",
      "organic": "string",
      "bioControl": "string",
      "fertilizer": "string",
      "water": "string",
      "pruning": "string",
      "isolation": "string",
      "schedule": "string",
      "dosage": "string",
      "frequency": "string"
    },
    "prevention": {
      "rotation": "string",
      "sanitation": "string",
      "monitoring": "string",
      "irrigation": "string",
      "humidity": "string",
      "resistantVarieties": "string",
      "preventiveSpraying": "string"
    },
    "recovery": {
      "probability": "string",
      "recoveryTime": "string",
      "expectedImprovement": "string",
      "successFactors": "string"
    },
    "cropImpact": {
      "yield": "string",
      "fruitQuality": "string",
      "growth": "string",
      "economicLoss": "string",
      "harvestDelay": "string"
    },
    "weatherRisk": "string - weather influence description",
    "explainableAI": "string - user-friendly explainable AI rationale",
    "confidenceAnalysis": {
      "confidencePercent": 0,
      "reasons": "string - reasons confidence is high or low",
      "qualityImpact": "string",
      "lightingImpact": "string",
      "blurImpact": "string",
      "partialVisibility": "string"
    },
    "immediateAction": {
      "today": "string",
      "threeDays": "string",
      "sevenDays": "string",
      "longTerm": "string"
    },
    "similarDiseases": [
      {
        "disease": "string",
        "reasonsRejected": "string"
      }
    ],
    "farmerFriendlySummary": "string - simplified explanation for a farmer with no technical background"
  }
}${language === 'hi' ? HINDI_PROMPT_INSTRUCTION : ''}`;

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' }
      });

      const resultText = response.choices[0]?.message?.content || '{}';
      console.log(`[Gemini/OpenAI Response] Raw: ${resultText}`);
      const parsed = JSON.parse(resultText);
      console.log(`[AI Disease Success] OpenAI result:`, parsed);
      return {
        diseaseName: parsed.diseaseName || 'Healthy',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : parseFloat(parsed.confidence || '0.90'),
        treatment: parsed.treatment || 'No specific treatment required.',
        severity: parsed.severity || 'None',
        symptoms: parsed.symptoms || '',
        causes: parsed.causes || '',
        prevention: parsed.prevention || '',
        estimatedRecovery: parsed.estimatedRecovery || 'N/A',
        irrigation: parsed.irrigation || 'Maintain normal irrigation schedule.',
        fertilizer: parsed.fertilizer || 'Maintain standard fertilization regimen.',
        imageForensics: parsed.imageForensics || '',
        metadataAnalysis: parsed.metadataAnalysis || '',
        explainableAi: parsed.detailedReport ? JSON.stringify(parsed.detailedReport) : (parsed.explainableAi || ''),
        manipulationDetection: parsed.manipulationDetection || '',
        riskAssessment: parsed.riskAssessment || '',
        investigationTimeline: parsed.investigationTimeline || ''
      };
    }

    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY || "";
      console.log(`[Backend Request] Provider: gemini, Model: ${GEMINI_MODEL}, API Key: ${maskKey(apiKey)}, Crop: "${cropType}", Language: "${language}"`);
      const promptText = `You are an expert plant pathologist and agricultural scientist. Analyze this crop leaf image of crop type: "${cropType}".
Generate a detailed report between 1000–1800 words based on the leaf image.
Return a JSON object matching EXACTLY this schema (no extra fields, no markdown, no comments):
{
  "diseaseName": "string — name of disease or 'Healthy' if no disease found",
  "confidence": 0.00,
  "treatment": "string — step-by-step treatment instructions",
  "severity": "None|Low|Moderate|High|Critical",
  "symptoms": "string — visible symptoms description",
  "causes": "string — biological or environmental causes",
  "prevention": "string — prevention measures",
  "estimatedRecovery": "string — e.g. '7-10 days' or 'N/A'",
  "irrigation": "string — specific watering advice to manage or prevent the disease",
  "fertilizer": "string — specific fertilizing advice to strengthen plant defenses against the disease",
  "imageForensics": "string - analysis of image pixels, EXIF integrity",
  "metadataAnalysis": "string - device metadata, timestamps, and sensor details",
  "explainableAi": "string - short summary of feature focus",
  "manipulationDetection": "string - details of any cloning or editing detected",
  "riskAssessment": "string - overall threat level, potential yield loss, pathogen speed",
  "investigationTimeline": "string - progression of the disease",
  "detailedReport": {
    "executiveSummary": {
      "species": "string - crop species",
      "healthScore": 0.0,
      "diseaseStatus": "string - health status",
      "severityLevel": "string - severity",
      "confidenceScore": 0,
      "summary": "string - executive summary"
    },
    "diseaseIdentification": {
      "name": "string",
      "scientificName": "string",
      "category": "string - Fungal|Bacterial|Viral|Nutrient deficiency|Water stress|Other",
      "pathogenType": "string",
      "affectedPlant": "string",
      "confidence": 0,
      "alternativeDiseases": "string",
      "selectionReason": "string"
    },
    "visualSymptoms": {
      "leafColor": "string",
      "spots": "string",
      "lesions": "string",
      "yellowing": "string",
      "browning": "string",
      "wilting": "string",
      "dryEdges": "string",
      "curling": "string",
      "mold": "string",
      "texture": "string",
      "veinCondition": "string",
      "damagedAreaPercent": 0,
      "aiObservation": "string - what the AI observed from the image"
    },
    "severityAssessment": {
      "classification": "Healthy|Early Stage|Moderate|Severe|Critical",
      "explanation": "string",
      "percentage": 0
    },
    "causes": {
      "fungal": "string",
      "bacterial": "string",
      "viral": "string",
      "nutrient": "string",
      "water": "string",
      "heat": "string",
      "cold": "string",
      "soil": "string",
      "humidity": "string",
      "overwatering": "string",
      "underwatering": "string"
    },
    "progression": {
      "stage": "string",
      "expectedSpread": "string",
      "riskWorsening": "string",
      "urgency": "string"
    },
    "treatmentPlan": {
      "chemical": "string",
      "organic": "string",
      "bioControl": "string",
      "fertilizer": "string",
      "water": "string",
      "pruning": "string",
      "isolation": "string",
      "schedule": "string",
      "dosage": "string",
      "frequency": "string"
    },
    "prevention": {
      "rotation": "string",
      "sanitation": "string",
      "monitoring": "string",
      "irrigation": "string",
      "humidity": "string",
      "resistantVarieties": "string",
      "preventiveSpraying": "string"
    },
    "recovery": {
      "probability": "string",
      "recoveryTime": "string",
      "expectedImprovement": "string",
      "successFactors": "string"
    },
    "cropImpact": {
      "yield": "string",
      "fruitQuality": "string",
      "growth": "string",
      "economicLoss": "string",
      "harvestDelay": "string"
    },
    "weatherRisk": "string - weather influence description",
    "explainableAI": "string - user-friendly explainable AI rationale",
    "confidenceAnalysis": {
      "confidencePercent": 0,
      "reasons": "string - reasons confidence is high or low",
      "qualityImpact": "string",
      "lightingImpact": "string",
      "blurImpact": "string",
      "partialVisibility": "string"
    },
    "immediateAction": {
      "today": "string",
      "threeDays": "string",
      "sevenDays": "string",
      "longTerm": "string"
    },
    "similarDiseases": [
      {
        "disease": "string",
        "reasonsRejected": "string"
      }
    ],
    "farmerFriendlySummary": "string - simplified explanation for a farmer with no technical background"
  }
}${language === 'hi' ? HINDI_PROMPT_INSTRUCTION : ''}`;

      const payload = {
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data: base64Image } },
              { text: promptText }
            ]
          }
        ],
        generationConfig: { responseMimeType: "application/json" }
      };

      const resultText = await callGeminiRest(GEMINI_MODEL, payload, apiKey, "Leaf Diagnostics");
      console.log(`[Gemini Response] Disease Raw: ${resultText.substring(0, 300)}`);
      const parsed = JSON.parse(resultText || '{}');
      return {
        diseaseName: parsed.diseaseName || 'Healthy',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : parseFloat(parsed.confidence || '0.90'),
        treatment: parsed.treatment || 'No specific treatment required.',
        severity: parsed.severity || 'None',
        symptoms: parsed.symptoms || '',
        causes: parsed.causes || '',
        prevention: parsed.prevention || '',
        estimatedRecovery: parsed.estimatedRecovery || 'N/A',
        irrigation: parsed.irrigation || 'Maintain normal irrigation schedule.',
        fertilizer: parsed.fertilizer || 'Maintain standard fertilization regimen.',
        imageForensics: parsed.imageForensics || '',
        metadataAnalysis: parsed.metadataAnalysis || '',
        explainableAi: parsed.detailedReport ? JSON.stringify(parsed.detailedReport) : (parsed.explainableAi || ''),
        manipulationDetection: parsed.manipulationDetection || '',
        riskAssessment: parsed.riskAssessment || '',
        investigationTimeline: parsed.investigationTimeline || ''
      };
    }

    // --- Mock Fallback Mode ---
    console.log(`[AI Disease Scan] Running mock fallback logic (language: ${language})...`);
    const lowerCrop = cropType?.toLowerCase() || '';
    const isHealthy = lowerCrop.includes('healthy') || lowerCrop.includes('स्वस्थ');

    // Leaf diagnostics helper function to generate the detailed 16-section report mock
    const generateMockLeafReport = (crop: string, healthy: boolean, lang: 'en' | 'hi') => {
      if (lang === 'hi') {
        if (healthy) {
          return {
            executiveSummary: { species: crop, healthScore: 9.5, diseaseStatus: "स्वस्थ (Healthy)", severityLevel: "कोई नहीं (None)", confidenceScore: 95, summary: "पत्ती की संरचना पूर्णतः स्वस्थ है। कोई कवक या जीवाणु जनित लक्षण नहीं दिखे।" },
            diseaseIdentification: { name: "स्वस्थ पत्ती", scientificName: "N/A", category: "स्वस्थ", pathogenType: "N/A", affectedPlant: crop, confidence: 95, alternativeDiseases: "कोई नहीं", selectionReason: "पत्ती पर कोई धब्बे या क्लोरोसिस के निशान नहीं हैं।" },
            visualSymptoms: { leafColor: "गहरा हरा", spots: "कोई नहीं", lesions: "कोई नहीं", yellowing: "कोई नहीं", browning: "कोई नहीं", wilting: "कोई नहीं", dryEdges: "कोई नहीं", curling: "कोई नहीं", mold: "कोई नहीं", texture: "चिकनी", veinCondition: "स्वस्थ", damagedAreaPercent: 0, aiObservation: "पत्ती का रंग और शिराएं पूर्णतः स्वस्थ हैं।" },
            severityAssessment: { classification: "Healthy", explanation: "पौधे में रोग के कोई लक्षण नहीं हैं।", percentage: 0 },
            causes: { fungal: "कोई नहीं", bacterial: "कोई नहीं", viral: "कोई नहीं", nutrient: "संतुलित", water: "इष्टतम", heat: "सामान्य", cold: "सामान्य", soil: "अच्छा", humidity: "अनुकूल", overwatering: "नहीं", underwatering: "नहीं" },
            progression: { stage: "कोई नहीं", expectedSpread: "कोई नहीं", riskWorsening: "निम्न", urgency: "सामान्य" },
            treatmentPlan: { chemical: "कोई नहीं", organic: "नीम तेल का छिड़काव सुरक्षा के लिए", bioControl: "ट्राइकोडर्मा छिड़काव कर सकते हैं", fertilizer: "नियमित जैविक खाद", water: "सामान्य सिंचाई", pruning: "कोई नहीं", isolation: "कोई नहीं", schedule: "N/A", dosage: "N/A", frequency: "N/A" },
            prevention: { rotation: "नियमित फसल चक्र", sanitation: "खेत की सफाई रखें", monitoring: "साप्ताहिक जांच", irrigation: "सुबह पानी दें", humidity: "हवा का प्रवाह बढ़ाएं", resistantVarieties: "प्रतिरोधी बीज", preventiveSpraying: "नीम तेल" },
            recovery: { probability: "100%", recoveryTime: "N/A", expectedImprovement: "N/A", successFactors: "N/A" },
            cropImpact: { yield: "कोई नुकसान नहीं", fruitQuality: "उत्कृष्ट", growth: "तेज", economicLoss: "0%", harvestDelay: "कोई नहीं" },
            weatherRisk: "मौसम अनुकूल है।",
            explainableAI: "हरे रंग की सुसंगत संरचना और धब्बों की अनुपस्थिति से स्पष्ट है कि पत्ती पूरी तरह स्वस्थ है।",
            confidenceAnalysis: { confidencePercent: 95, reasons: "स्पष्ट प्रकाश व्यवस्था और उच्च गुणवत्ता वाली छवि।", qualityImpact: "अच्छा", lightingImpact: "उत्कृष्ट", blurImpact: "कोई नहीं", partialVisibility: "पूर्ण पत्ती दृश्य" },
            immediateAction: { today: "सामान्य देखभाल", threeDays: "नमी की जांच", sevenDays: "नियमित पोषण", longTerm: "कीट निगरानी" },
            similarDiseases: [
              { disease: "पोषक तत्वों की कमी", reasonsRejected: "पत्तियों का रंग समान रूप से हरा है।" }
            ],
            farmerFriendlySummary: "आपकी फसल पूरी तरह स्वस्थ है। कोई छिड़काव करने की आवश्यकता नहीं है, बस नियमित सिंचाई जारी रखें।"
          };
        }
        return {
          executiveSummary: { species: crop, healthScore: 4.2, diseaseStatus: "अगेती झुलसा रोग (Early Blight)", severityLevel: "मध्यम (Moderate)", confidenceScore: 87, summary: "पत्ती पर अल्टरनेरिया सोलानी कवक के संक्रमण के कारण संकेंद्रित धब्बे देखे गए हैं।" },
          diseaseIdentification: { name: "अगेती झुलसा रोग", scientificName: "Alternaria solani", category: "कवक जनित (Fungal)", pathogenType: "कवक बीजाणु (Spores)", affectedPlant: crop, confidence: 87, alternativeDiseases: "पछेती झुलसा रोग, सेप्टोरिया धब्बा", selectionReason: "लक्षणों में संकेंद्रीय छल्ले (टारगेट धब्बे) स्पष्ट रूप से दिखाई दे रहे हैं।" },
          visualSymptoms: { leafColor: "हल्का पीला और भूरा धब्बेदार", spots: "गहरे भूरे संकेंद्रित धब्बे", lesions: "शुष्क और खुरदरे घाव", yellowing: "धब्बों के चारों ओर पीलापन (क्लोरोटिक हेलो)", browning: "किनारों पर भूरापन", wilting: "हल्का मुरझाना", dryEdges: "सूखे किनारे", curling: "पत्तियों का मुड़ना", mold: "सूक्ष्म कवक जाल", texture: "खुरदरी और शुष्क", veinCondition: "संक्रमित", damagedAreaPercent: 25, aiObservation: "निचली पत्तियों पर बड़े काले धब्बे और चारों ओर पीलापन देखा गया है।" },
          severityAssessment: { classification: "Moderate", explanation: "संक्रमण पत्तियों के 25% हिस्से में फैल चुका है, लेकिन मुख्य तना सुरक्षित है।", percentage: 25 },
          causes: { fungal: "अल्टरनेरिया सोलानी कवक", bacterial: "कोई नहीं", viral: "कोई नहीं", nutrient: "नाइट्रोजन की कमी से संवेदनशीलता", water: "पत्तियों पर लंबे समय तक नमी", heat: "गर्म मौसम", cold: "कोई नहीं", soil: "जल निकासी की कमी", humidity: "उच्च आर्द्रता (80% से अधिक)", overwatering: "पत्तियों पर पानी छिड़कना", underwatering: "नहीं" },
          progression: { stage: "सक्रिय वानस्पतिक फैलाव", expectedSpread: "हवा द्वारा पड़ोसी पौधों में फैल सकता है", riskWorsening: "उच्च यदि नमी बनी रहे", urgency: "अति आवश्यक" },
          treatmentPlan: { chemical: "कॉपर ऑक्सीक्लोराइड 3 ग्राम प्रति लीटर या मैंकोजेब का छिड़काव करें।", organic: "नीम तेल और बेकिंग सोडा का मिश्रण", bioControl: "स्यूडोमोनास फ्लोरेसेंस 5 ग्राम/लीटर", fertilizer: "पोटेशियम उर्वरक बढ़ाएं, नाइट्रोजन कम करें", water: "केवल जड़ों में पानी दें, ड्रिप सिंचाई अपनाएं", pruning: "संक्रमित पत्तियों को काटकर जला दें", isolation: "संक्रमित पौधों को अलग करें", schedule: "तुरंत पहला छिड़काव, 10 दिन बाद दूसरा", dosage: "3 ग्राम दवा प्रति लीटर पानी", frequency: "10 दिनों के अंतराल पर" },
          prevention: { rotation: "3 साल का फसल चक्र अपनाएं", sanitation: "खेत से पुराना कचरा हटा दें", monitoring: "दैनिक निरीक्षण", irrigation: "सुबह के समय सिंचाई करें", humidity: "पौधों के बीच उचित दूरी रखें", resistantVarieties: "सत्यम या प्रतिरोधी किस्में", preventiveSpraying: "जैविक कवकनाशी" },
          recovery: { probability: "85%", recoveryTime: "7-14 दिन", expectedImprovement: "छिड़काव के 3 दिन बाद नए धब्बे रुकेंगे", successFactors: "समय पर कवकनाशी का छिड़काव और संक्रमित पत्तियों को हटाना" },
          cropImpact: { yield: "15-20% कमी का अनुमान यदि उपचार न किया जाए", fruitQuality: "छोटे फल और धूप से झुलसना", growth: "धीमा विकास", economicLoss: "मध्यम वित्तीय नुकसान", harvestDelay: "7-10 दिन" },
          weatherRisk: "उच्च आर्द्रता और 25-30°C तापमान कवक के फैलाव के लिए अत्यंत अनुकूल है।",
          explainableAI: "घावों के चारों ओर क्लोरोटिक हेलो और पत्तियों पर संकेंद्रित छल्लों की उपस्थिति मुख्य पहचान है जो अगेती झुलसा रोग की पुष्टि करती है।",
          confidenceAnalysis: { confidencePercent: 87, reasons: "छवि में घावों की स्पष्ट संकेंद्रीय संरचना दिखाई दे रही है।", qualityImpact: "अच्छा", lightingImpact: "पर्याप्त", blurImpact: "न्यूनतम", partialVisibility: "पूरी पत्ती दिखाई दे रही है" },
          immediateAction: { today: "संक्रमित पत्तियों को तोड़कर नष्ट करें और सिंचाई बंद करें।", threeDays: "कॉपर युक्त कवकनाशी का छिड़काव करें।", sevenDays: "पोटेशियम आधारित पोषक तत्व डालें।", longTerm: "सुबह की सिंचाई व्यवस्था लागू करें।" },
          similarDiseases: [
            { disease: "पछेती झुलसा रोग (Late Blight)", reasonsRejected: "पछेती झुलसा में संकेंद्रीय छल्ले नहीं होते और धब्बे तेजी से काले होते हैं।" },
            { disease: "सेप्टोरिया पत्ती धब्बा", reasonsRejected: "सेप्टोरिया के धब्बे छोटे और केंद्र में भूरे होते हैं।" }
          ],
          farmerFriendlySummary: "आपकी फसल में झुलसा रोग लगा है। घबराएं नहीं, संक्रमित पत्तियां तोड़कर फेंक दें और कवकनाशी दवा का छिड़काव करें। पानी केवल जड़ों में दें।"
        };
      } else {
        if (healthy) {
          return {
            executiveSummary: { species: crop, healthScore: 9.5, diseaseStatus: "Healthy", severityLevel: "None", confidenceScore: 95, summary: "The leaf structure is fully healthy with consistent green pigment and no signs of bacterial or fungal lesions." },
            diseaseIdentification: { name: "Healthy Leaf", scientificName: "N/A", category: "Healthy", pathogenType: "N/A", affectedPlant: crop, confidence: 95, alternativeDiseases: "None", selectionReason: "No visible chlorosis, necrosis, or structural spots found." },
            visualSymptoms: { leafColor: "Consistent Green", spots: "None", lesions: "None", yellowing: "None", browning: "None", wilting: "None", dryEdges: "None", curling: "None", mold: "None", texture: "Smooth", veinCondition: "Healthy", damagedAreaPercent: 0, aiObservation: "Leaf margins and vascular veins are structurally intact with no discoloration." },
            severityAssessment: { classification: "Healthy", explanation: "No pathogen infection detected.", percentage: 0 },
            causes: { fungal: "None", bacterial: "None", viral: "None", nutrient: "Balanced", water: "Optimal", heat: "Normal", cold: "Normal", soil: "Good", humidity: "Balanced", overwatering: "No", underwatering: "No" },
            progression: { stage: "None", expectedSpread: "None", riskWorsening: "Low", urgency: "Routine" },
            treatmentPlan: { chemical: "None", organic: "Apply neem oil as a preventive safeguard", bioControl: "Trichoderma can be used preventively", fertilizer: "Standard balanced NPK", water: "Maintain regular irrigation", pruning: "None", isolation: "None", schedule: "N/A", dosage: "N/A", frequency: "N/A" },
            prevention: { rotation: "Standard rotation schedule", sanitation: "Keep beds clear of organic litter", monitoring: "Weekly inspection", irrigation: "Water base in early hours", humidity: "Maintain proper row spacing", resistantVarieties: "Standard varieties", preventiveSpraying: "Neem oil" },
            recovery: { probability: "100%", recoveryTime: "N/A", expectedImprovement: "N/A", successFactors: "N/A" },
            cropImpact: { yield: "No impact", fruitQuality: "Excellent", growth: "Optimal", economicLoss: "0%", harvestDelay: "None" },
            weatherRisk: "Current weather favors healthy growth.",
            explainableAI: "Uniform chloroplast distribution and absence of cellular lesions indicate a healthy specimen.",
            confidenceAnalysis: { confidencePercent: 95, reasons: "High-resolution image with good illumination and crisp focus.", qualityImpact: "Excellent", lightingImpact: "Optimal", blurImpact: "None", partialVisibility: "Full leaf visible" },
            immediateAction: { today: "Routine check", threeDays: "Monitor soil moisture", sevenDays: "Check nutrient logs", longTerm: "Weekly scouting" },
            similarDiseases: [
              { disease: "Nutrient Deficiency", reasonsRejected: "Chlorophyll concentration is uniform." }
            ],
            farmerFriendlySummary: "Your crop leaf is healthy. No treatment needed, keep up the normal watering and check again next week."
          };
        }
        return {
          executiveSummary: { species: crop, healthScore: 4.2, diseaseStatus: "Early Blight", severityLevel: "Moderate", confidenceScore: 87, summary: "Fungal infection by Alternaria solani detected, characterized by dark concentric rings and chlorotic yellowing." },
          diseaseIdentification: { name: "Early Blight", scientificName: "Alternaria solani", category: "Fungal", pathogenType: "Spore-borne fungi", affectedPlant: crop, confidence: 87, alternativeDiseases: "Late Blight, Septoria Leaf Spot", selectionReason: "Concentric target lesions with surrounding yellow chlorotic halos are diagnostic of Alternaria solani." },
          visualSymptoms: { leafColor: "Pale green with dark spots", spots: "Concentric dark brown rings", lesions: "Dry leathery lesions", yellowing: "Chlorotic halo surrounding lesions", browning: "Brown margins", wilting: "Mild foliar wilt", dryEdges: "Dry leaf edges", curling: "Slight leaf curl", mold: "Fine dark mycelia under humid conditions", texture: "Dry and brittle spots", veinCondition: "Necrotic where crossed by lesions", damagedAreaPercent: 25, aiObservation: "Dark leathery spots with target-like rings visible on lower leaf sections." },
          severityAssessment: { classification: "Moderate", explanation: "Lesions occupy roughly 25% of leaf surface. Stalk and crown remain uninfected.", percentage: 25 },
          causes: { fungal: "Alternaria solani conidia", bacterial: "None", viral: "None", nutrient: "Susceptibility heightened by low Nitrogen", water: "Free surface moisture on leaves", heat: "Warm temperatures (25-30C)", cold: "None", soil: "Poor drainage and aeration", humidity: "Relative humidity > 80%", overwatering: "Overhead sprinkler splash", underwatering: "No" },
          progression: { stage: "Active vegetative colonization", expectedSpread: "Wind and splash dispersion to nearby rows", riskWorsening: "High if leaf wetness persists", urgency: "Immediate" },
          treatmentPlan: { chemical: "Apply Copper Oxychloride 3g/L or Mancozeb immediately.", organic: "Spray baking soda and neem oil solution.", bioControl: "Apply Pseudomonas fluorescens bio-agent.", fertilizer: "Boost Potassium to strengthen cells, restrict Nitrogen.", water: "Switch to drip lines to prevent splashing.", pruning: "Cut and burn infected leaves.", isolation: "Quarantine severely affected plants.", schedule: "First spray today, repeat in 10 days.", dosage: "3g per Liter of water.", frequency: "Every 10 days" },
          prevention: { rotation: "3-year crop rotation with non-solanaceous crops", sanitation: "Burn crop residues post-harvest", monitoring: "Daily row scouting", irrigation: "Water base of plant in morning", humidity: "Maintain wide spacing for air draft", resistantVarieties: "Use certified resistant seeds", preventiveSpraying: "Bio-fungicides weekly" },
          recovery: { probability: "85%", recoveryTime: "7-14 days", expectedImprovement: "Foliar spread halts in 3 days, new leaves emerge clean", successFactors: "Pruning infected tissues and applying fungicides promptly" },
          cropImpact: { yield: "15-20% reduction if untreated", fruitQuality: "Sunscald risk and small sizing", growth: "Stunted foliage development", economicLoss: "Moderate loss of market value", harvestDelay: "7-10 days" },
          weatherRisk: "Warm weather coupled with high humidity provides ideal conditions for Alternaria spore germination.",
          explainableAI: "Concentric 'target-board' lesions surrounded by clear yellow halos (chlorosis) are signature morphological signs of Alternaria solani.",
          confidenceAnalysis: { confidencePercent: 87, reasons: "Lesion structures are clearly visible and well-focused.", qualityImpact: "High", lightingImpact: "Satisfactory", blurImpact: "Negligible", partialVisibility: "Full leaf frame" },
          immediateAction: { today: "Prune off and safely destroy infected lower leaves.", threeDays: "Spray recommended copper fungicide.", sevenDays: "Apply organic compost side-dressing.", longTerm: "Transition to drip lines." },
          similarDiseases: [
            { disease: "Late Blight", reasonsRejected: "Late blight lesions are dark, water-soaked, and lack concentric rings." },
            { disease: "Septoria Leaf Spot", reasonsRejected: "Septoria spots are smaller, more numerous, and feature tiny black specks (pycnidia) in the center." }
          ],
          farmerFriendlySummary: "Your crop has Early Blight (a fungal disease). Trim off the spotted leaves immediately, spray copper fungicide, and avoid wetting the leaves when watering."
        };
      }
    };

    const mockReportData = generateMockLeafReport(cropType, isHealthy, language);

    return {
      diseaseName: isHealthy 
        ? (language === 'hi' ? 'स्वस्थ पत्ती संरचना' : 'Healthy Leaf Structure') 
        : (language === 'hi' ? 'अगेती झुलसा रोग (अल्टरनेरिया सोलानी)' : 'Early Blight (Alternaria solani)'),
      confidence: isHealthy ? 0.95 : 0.87,
      treatment: isHealthy 
        ? (language === 'hi' ? 'कोई उपचार आवश्यक नहीं है।' : 'No treatment required.') 
        : (language === 'hi' ? 'निचली पत्तियों की छँटाई करें और ताँबा-आधारित फफूंदनाशक का छिड़काव करें।' : 'Prune lower leaves and apply copper-based fungicide.'),
      severity: isHealthy ? 'None' : 'Moderate',
      symptoms: isHealthy 
        ? '' 
        : (language === 'hi' ? 'निचली पत्तियों पर पीले घेरे वाले गहरे भूरे धब्बे।' : 'Dark lesions with yellow halos on lower leaves.'),
      causes: isHealthy 
        ? '' 
        : (language === 'hi' ? 'लंबे समय तक पत्तियों पर नमी बने रहने से फफूंद संक्रमण।' : 'Fungal infection from prolonged leaf wetness.'),
      prevention: isHealthy 
        ? '' 
        : (language === 'hi' ? 'हवा का प्रवाह बेहतर बनाएँ, ऊपर से पानी देने से बचें।' : 'Improve air circulation, avoid overhead watering.'),
      estimatedRecovery: isHealthy ? 'N/A' : '7-14 days',
      irrigation: isHealthy 
        ? (language === 'hi' ? 'सामान्य सिंचाई।' : 'Maintain normal irrigation.') 
        : (language === 'hi' ? 'सुबह जड़ में ही पानी दें।' : 'Water base of plant in morning.'),
      fertilizer: isHealthy 
        ? (language === 'hi' ? 'सामान्य उर्वरक।' : 'Standard fertilizer.') 
        : (language === 'hi' ? 'कोशिका भित्ति मजबूत करने के लिए पोटैशियम बढ़ाएँ।' : 'Apply Potassium to strengthen cell walls.'),
      imageForensics: isHealthy 
        ? (language === 'hi' ? 'पिक्सेल अखंडता जांच: 100% सुसंगत।' : 'Pixel integrity check: 100% consistent.') 
        : (language === 'hi' ? 'पिक्सेल शोर सुसंगत है।' : 'Sensor noise structure is consistent.'),
      metadataAnalysis: 'Device: iPhone 15 Pro | ISO: 80',
      explainableAi: JSON.stringify(mockReportData),
      manipulationDetection: 'Verified authentic image.',
      riskAssessment: isHealthy ? 'None' : 'Threat Level: Moderate. Yield impact: 15-20%.',
      investigationTimeline: isHealthy ? 'None' : 'Day 0: Spores. Day 4: Spotting. Day 8: Rings. Day 14: Spore dispersion.'
    };
  },

  /**
   * Soil Analysis recommendations
   * @param language - 'en' for English (default), 'hi' for Hindi
   */
  async getSoilRecommendations(params: {
    cropType: string;
    moisture: number;
    pH: number;
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    organicCarbon: number;
    temperature: number;
    humidity: number;
    language?: 'en' | 'hi';
  }): Promise<ISoilAnalysisResult> {
    const provider = getAIProvider();
    const language = params.language || 'en';
    console.log(`[AI Soil Recs] Provider: ${provider}, crop: "${params.cropType}", pH: ${params.pH}, moisture: ${params.moisture}%, language: "${language}"`);
    
    const prompt = `You are an expert plant soil scientist and agronomist. Analyze these real soil test parameters for a farm targeting crop type "${params.cropType}":
- Soil Moisture: ${params.moisture}%
- Soil pH: ${params.pH}
- Nitrogen (N): ${params.nitrogen} mg/kg
- Phosphorus (P): ${params.phosphorus} mg/kg
- Potassium (K): ${params.potassium} mg/kg
- Organic Carbon: ${params.organicCarbon}%
- Temperature: ${params.temperature}°C
- Humidity: ${params.humidity}%

Provide a highly detailed agronomic analysis of 800-1500 words. You MUST return a JSON object matching EXACTLY this schema (no markdown, no extra text):
{
  "soilHealth": 7.5,
  "deficiencies": ["Nitrogen", "Phosphorus"],
  "fertilizerRecommendation": "NPK advice summary",
  "irrigationRecommendation": "watering schedule summary",
  "suitableCrops": ["Crop1", "Crop2", "Crop3"],
  "riskLevel": "Low",
  "recommendations": ["Point 1", "Point 2", "Point 3"],
  "aiReport": {
    "executiveSummary": {
      "healthScore": 7.5,
      "fertilityLevel": "High|Good|Moderate|Poor",
      "productivityPotential": "Excellent|Good|Average|Low",
      "cultivationSuitability": "overall cultivation suitability details",
      "majorStrengths": "major strengths description",
      "majorConcerns": "major concerns description"
    },
    "chemicalAnalysis": {
      "pH": { "value": ${params.pH}, "ideal": "ideal range", "interpretation": "interpretation text", "effect": "effect on growth", "risks": "possible risks", "improvements": "suggestions" },
      "nitrogen": { "value": ${params.nitrogen}, "ideal": "ideal range", "interpretation": "interpretation text", "effect": "effect on growth", "risks": "possible risks", "improvements": "suggestions" },
      "phosphorus": { "value": ${params.phosphorus}, "ideal": "ideal range", "interpretation": "interpretation text", "effect": "effect on growth", "risks": "possible risks", "improvements": "suggestions" },
      "potassium": { "value": ${params.potassium}, "ideal": "ideal range", "interpretation": "interpretation text", "effect": "effect on growth", "risks": "possible risks", "improvements": "suggestions" },
      "organicCarbon": { "value": ${params.organicCarbon}, "ideal": "ideal range", "interpretation": "interpretation text", "effect": "effect on growth", "risks": "possible risks", "improvements": "suggestions" },
      "moisture": { "value": ${params.moisture}, "ideal": "ideal range", "interpretation": "interpretation text", "effect": "effect on growth", "risks": "possible risks", "improvements": "suggestions" },
      "temperature": { "value": ${params.temperature}, "ideal": "ideal range", "interpretation": "interpretation text", "effect": "effect on growth", "risks": "possible risks", "improvements": "suggestions" },
      "humidity": { "value": ${params.humidity}, "ideal": "ideal range", "interpretation": "interpretation text", "effect": "effect on growth", "risks": "possible risks", "improvements": "suggestions" }
    },
    "soilFertilityAssessment": {
      "classification": "Excellent|Good|Moderate|Poor",
      "explanation": "detailed explain why this classification is given"
    },
    "nutrientDeficiency": {
      "nitrogenDeficiency": { "status": "Yes|No", "symptoms": "symptoms details", "impact": "impact on crop", "recovery": "recovery methods" },
      "phosphorusDeficiency": { "status": "Yes|No", "symptoms": "symptoms details", "impact": "impact on crop", "recovery": "recovery methods" },
      "potassiumDeficiency": { "status": "Yes|No", "symptoms": "symptoms details", "impact": "impact on crop", "recovery": "recovery methods" },
      "micronutrientDeficiencies": { "status": "Zinc/Iron etc.", "symptoms": "symptoms details", "impact": "impact on crop", "recovery": "recovery methods" }
    },
    "cropSuitability": [
      { "crop": "Crop Name", "suitability": 95, "performance": "expected performance description", "reasons": "reasons for this rating", "risks": "potential risks" }
    ],
    "yieldPrediction": {
      "expectedYield": "expected yield details",
      "confidence": "prediction confidence percentage",
      "improvingFactors": "factors improving yield",
      "reducingFactors": "factors reducing yield"
    },
    "irrigation": {
      "waterRequirement": "expected volume",
      "interval": "irrigation interval",
      "waterSaving": "water-saving suggestions",
      "seasonal": "seasonal recommendations"
    },
    "fertilizer": {
      "npk": "NPK chemical recommendations",
      "organic": "Organic manure recommendation",
      "biofertilizers": "Bio-fertilizers recommended",
      "schedule": "application timeline schedule",
      "dosage": "exact dosage quantities"
    },
    "pestDiseaseRisk": {
      "riskLevel": "Low|Moderate|High|Critical",
      "possibleDiseases": "list of possible diseases and pests",
      "preventiveMeasures": "preventive measures details"
    },
    "weatherImpact": {
      "currentEffect": "current weather effect details",
      "upcomingRisks": "upcoming risks",
      "rainfallImpact": "rainfall impact",
      "heatStress": "heat stress",
      "coldStress": "cold stress"
    },
    "sustainabilityScore": {
      "score": 8.5,
      "organicCarbon": "organic carbon impact",
      "waterEfficiency": "water efficiency impact",
      "nutrientBalance": "nutrient balance impact",
      "environmentalImpact": "environmental impact",
      "carbonFootprint": "carbon footprint impact"
    },
    "actionPlan": {
      "immediate": "immediate actions",
      "next7Days": "actions next 7 days",
      "next30Days": "actions next 30 days",
      "seasonal": "seasonal planning"
    },
    "explainableAI": "scientific rationale explaining how pH, moisture, temperature, and NPK metrics led to these specific crop, irrigation, and fertilizer decisions",
    "confidenceScore": {
      "score": 90,
      "explanation": "reasons for high/low confidence"
    }
  }
}
soilHealth must be a number from 1 to 10. riskLevel must be "Low", "Moderate", or "High".${language === 'hi' ? HINDI_PROMPT_INSTRUCTION : ''}`;

    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY || "";
      console.log(`[Backend Request] Provider: gemini, Model: ${GEMINI_MODEL}, API Key: ${maskKey(apiKey)}`);
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      };
      const text = await callGeminiRest(GEMINI_MODEL, payload, apiKey, "Soil Analysis");
      console.log(`[Gemini Response] Soil Raw: ${text.substring(0, 300)}`);
      const parsed = JSON.parse(text || '{}');
      return {
        soilHealth: typeof parsed.soilHealth === 'number' ? parsed.soilHealth : 5.0,
        deficiencies: Array.isArray(parsed.deficiencies) ? parsed.deficiencies : [],
        fertilizerRecommendation: parsed.fertilizerRecommendation || '',
        irrigationRecommendation: parsed.irrigationRecommendation || '',
        suitableCrops: Array.isArray(parsed.suitableCrops) ? parsed.suitableCrops : [],
        riskLevel: (['Low','Moderate','High'].includes(parsed.riskLevel) ? parsed.riskLevel : 'Low') as 'Low'|'Moderate'|'High',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        aiReport: parsed.aiReport ? JSON.stringify(parsed.aiReport) : ''
      };
    }

    if (provider === 'openai') {
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });
      const text = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(text);
      return {
        soilHealth: typeof parsed.soilHealth === 'number' ? parsed.soilHealth : 5.0,
        deficiencies: Array.isArray(parsed.deficiencies) ? parsed.deficiencies : [],
        fertilizerRecommendation: parsed.fertilizerRecommendation || '',
        irrigationRecommendation: parsed.irrigationRecommendation || '',
        suitableCrops: Array.isArray(parsed.suitableCrops) ? parsed.suitableCrops : [],
        riskLevel: (['Low','Moderate','High'].includes(parsed.riskLevel) ? parsed.riskLevel : 'Low') as 'Low'|'Moderate'|'High',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        aiReport: parsed.aiReport ? JSON.stringify(parsed.aiReport) : ''
      };
    }

    // --- Mock Fallback Mode ---
    console.log(`[AI Soil Recs] Running mock fallback logic (language: ${language})...`);
    const phOk = params.pH >= 6.0 && params.pH <= 7.2;
    const healthScore = phOk && params.moisture > 35 ? 7.8 : 5.2;

    const mockReportData = (() => {
      if (language === 'hi') {
        return {
          executiveSummary: {
            healthScore,
            fertilityLevel: phOk ? "उच्च (High)" : "मध्यम (Moderate)",
            productivityPotential: phOk ? "उत्कृष्ट (Excellent)" : "सामान्य (Average)",
            cultivationSuitability: `यह मिट्टी ${params.cropType} फसल के लिए ${phOk ? 'अत्यंत उपयुक्त' : 'मध्यम उपयुक्त'} है।`,
            majorStrengths: `${params.nitrogen >= 50 ? 'पर्याप्त नाइट्रोजन,' : ''} संतुलित पोटैशियम स्तर और अनुकूल जैविक कार्बन स्तर।`,
            majorConcerns: `${params.moisture < 35 ? 'कम नमी स्तर, सिंचाई की तत्काल आवश्यकता।' : 'कोई बड़ी चिंता नहीं है।'}`
          },
          chemicalAnalysis: {
            pH: { value: params.pH, ideal: "6.0 - 7.2", interpretation: phOk ? "सामान्य" : "असंतुलित", effect: "पोषक तत्वों के अवशोषण के लिए सही है।", risks: "कोई नहीं", improvements: "सामान्य रखरखाव" },
            nitrogen: { value: params.nitrogen, ideal: "60 - 100", interpretation: params.nitrogen >= 50 ? "पर्याप्त" : "कम", effect: "पत्तियों के विकास में सहायक।", risks: params.nitrogen < 50 ? "पत्तियों का पीला पड़ना" : "कोई नहीं", improvements: params.nitrogen < 50 ? "यूरिया डालें" : "संतुलन बनाए रखें" },
            phosphorus: { value: params.phosphorus, ideal: "30 - 50", interpretation: params.phosphorus >= 30 ? "सामान्य" : "कम", effect: "जड़ों के विकास के लिए आवश्यक।", risks: params.phosphorus < 30 ? "जड़ों का धीमा विकास" : "कोई नहीं", improvements: params.phosphorus < 30 ? "DAP डालें" : "संतुलन रखें" },
            potassium: { value: params.potassium, ideal: "100 - 150", interpretation: params.potassium >= 100 ? "सामान्य" : "कम", effect: "रोग प्रतिरोधक क्षमता बढ़ाता है।", risks: params.potassium < 100 ? "रोगों का खतरा" : "कोई नहीं", improvements: params.potassium < 100 ? "म्यूरेट ऑफ पोटाश डालें" : "संतुलन रखें" },
            organicCarbon: { value: params.organicCarbon, ideal: "1.5 - 3.0", interpretation: "सामान्य", effect: "मिट्टी की जल धारण क्षमता में सुधार।", risks: "कम कार्बन से मिट्टी कठोर होगी", improvements: "गोबर की खाद डालें" },
            moisture: { value: params.moisture, ideal: "40% - 60%", interpretation: params.moisture >= 35 ? "सामान्य" : "कम", effect: "जड़ों द्वारा पोषण सोखना।", risks: params.moisture < 35 ? "पौधों का मुरझाना" : "कोई नहीं", improvements: params.moisture < 35 ? "ड्रिप सिंचाई करें" : "नियमित सिंचाई" },
            temperature: { value: params.temperature, ideal: "20°C - 30°C", interpretation: "इष्टतम", effect: "जड़ों की श्वसन क्रिया में सहायक।", risks: "अधिक तापमान से वाष्पीकरण", improvements: "मल्चिंग करें" },
            humidity: { value: params.humidity, ideal: "50% - 70%", interpretation: "सामान्य", effect: "पत्ती वाष्पोत्सर्जन को संतुलित करता है।", risks: params.humidity > 80 ? "फफूंद संक्रमण का खतरा" : "कोई नहीं", improvements: "उचित दूरी बनाए रखें" }
          },
          soilFertilityAssessment: {
            classification: phOk ? "Excellent" : "Moderate",
            explanation: `मिट्टी का pH ${params.pH} ${phOk ? 'पूर्णतः अनुकूल है, जो पोषक तत्वों की उपलब्धता को बढ़ाता है।' : 'संतुलित नहीं है, जिससे पौधों के पोषण में बाधा आती है।'}`
          },
          nutrientDeficiency: {
            nitrogenDeficiency: { status: params.nitrogen < 50 ? "Yes" : "No", symptoms: params.nitrogen < 50 ? "पुरानी पत्तियों का पीला पड़ना" : "कोई नहीं", impact: params.nitrogen < 50 ? "विकास में रुकावट" : "कोई नहीं", recovery: "यूरिया का छिड़काव" },
            phosphorusDeficiency: { status: params.phosphorus < 30 ? "Yes" : "No", symptoms: params.phosphorus < 30 ? "पत्तियों का बैंगनी होना" : "कोई नहीं", impact: "कमजोर जड़ें", recovery: "सुपरफॉस्फेट डालें" },
            potassiumDeficiency: { status: params.potassium < 100 ? "Yes" : "No", symptoms: params.potassium < 100 ? "पत्तियों के किनारे जलना" : "कोई नहीं", impact: "कमजोर तना", recovery: "पोटाश का उपयोग" },
            micronutrientDeficiencies: { status: "सामान्य कमी", symptoms: "नई पत्तियों पर हल्का पीलापन", impact: "धीमा विकास", recovery: "सूक्ष्म पोषक मिश्रण का छिड़काव" }
          },
          cropSuitability: [
            { crop: params.cropType, suitability: phOk ? 95 : 75, performance: "अच्छी उपज की संभावना", reasons: "अनुकूल तापमान और नाइट्रोजन", risks: "असंतुलित नमी" },
            { crop: "मक्का (Maize)", suitability: 85, performance: "सामान्य से बेहतर", reasons: "अच्छी जल निकासी वाली मिट्टी", risks: "अत्यधिक सूखा" },
            { crop: "सोयाबीन (Soybean)", suitability: 80, performance: "औसत उपज", reasons: "उपयुक्त जैविक कार्बन", risks: "कीटों का हमला" }
          ],
          yieldPrediction: {
            expectedYield: phOk ? "6.8 टन / एकड़" : "4.5 टन / एकड़",
            confidence: "90%",
            improvingFactors: "संतुलित तापमान और जैविक कार्बन स्तर।",
            reducingFactors: `${params.moisture < 35 ? 'सिंचाई में देरी' : 'सूक्ष्म पोषक तत्वों की कमी।'}`
          },
          irrigation: {
            waterRequirement: "20,000 लीटर / एकड़ / सप्ताह",
            interval: params.moisture < 35 ? "हर 2 दिन में" : "हर 4 दिन में",
            waterSaving: "ड्रिप सिंचाई प्रणाली का उपयोग करें और सुबह के समय पानी दें।",
            seasonal: "बरसात के मौसम में सिंचाई कम करें और जलभराव से बचें।"
          },
          fertilizer: {
            npk: "NPK 19-19-19 उर्वरक 40 किलो प्रति एकड़।",
            organic: "गोबर की खाद 3 टन प्रति एकड़।",
            biofertilizers: "ट्राइकोडर्मा और पीएसबी कल्चर 2 किलो प्रति एकड़।",
            schedule: "बुवाई के समय आधी मात्रा और 30 दिन बाद शेष आधी मात्रा।",
            dosage: "40 किलो प्रति एकड़।"
          },
          pestDiseaseRisk: {
            riskLevel: params.humidity > 80 ? "High" : "Moderate",
            possibleDiseases: "जड़ सड़न, फफूंद जनित रोग",
            preventiveMeasures: "बीज उपचार करें और खेत में जलभराव न होने दें।"
          },
          weatherImpact: {
            currentEffect: "गर्म तापमान पौधों के विकास में सहायक है।",
            upcomingRisks: "आने वाले दिनों में तेज गर्मी की संभावना।",
            rainfallImpact: "पर्याप्त वर्षा होने पर अतिरिक्त सिंचाई की आवश्यकता नहीं होगी।",
            heatStress: "तेज धूप से बचने के लिए दोपहर में हल्की सिंचाई करें।",
            coldStress: "इस मौसम में पाले का कोई खतरा नहीं है।"
          },
          sustainabilityScore: {
            score: healthScore,
            organicCarbon: "जैविक कार्बन का अच्छा स्तर मिट्टी की उर्वरता बनाए रखता है।",
            waterEfficiency: "ड्रिप सिंचाई अपनाने से पानी की बचत होगी।",
            nutrientBalance: "NPK स्तर नियंत्रण में है जिससे पोषक तत्वों का क्षरण कम होगा।",
            environmentalImpact: "पर्यावरण के अनुकूल खेती की जा सकती है।",
            carbonFootprint: "कम रासायनिक खाद उपयोग से कार्बन उत्सर्जन कम होगा।"
          },
          actionPlan: {
            immediate: "यदि मिट्टी सूखी है तो तुरंत सिंचाई करें।",
            next7Days: "खेत की खरपतवार निकालें और मल्चिंग करें।",
            next30Days: "फसल के विकास के अनुसार यूरिया या कम्पोस्ट की टॉप ड्रेसिंग करें।",
            seasonal: "फसल कटाई के बाद दलहनी फसलें लगाकर नाइट्रोजन बढ़ाएं।"
          },
          explainableAI: `यह सिफारिशें pH (${params.pH}) और नमी (${params.moisture}%) के स्तर पर आधारित हैं। pH स्तर ${phOk ? 'अनुकूल' : 'असंतुलित'} है, इसलिए तदनुसार खाद का सुझाव दिया गया है।`,
          confidenceScore: {
            score: 95,
            explanation: " सेंसर डेटा की उच्च शुद्धता और क्षेत्रीय ऐतिहासिक रिकॉर्ड के कारण विश्वास उच्च है।"
          }
        };
      } else {
        return {
          executiveSummary: {
            healthScore,
            fertilityLevel: phOk ? "High" : "Moderate",
            productivityPotential: phOk ? "Excellent" : "Average",
            cultivationSuitability: `Highly suitable for ${params.cropType} cultivation under standard management.`,
            majorStrengths: `Optimal soil temperature and stable Organic Carbon (${params.organicCarbon}%).`,
            majorConcerns: `${params.moisture < 35 ? 'Low moisture level indicates root water stress.' : 'No urgent chemical stress concerns.'}`
          },
          chemicalAnalysis: {
            pH: { value: params.pH, ideal: "6.0 - 7.2", interpretation: phOk ? "Optimal" : "Sub-optimal", effect: "Influences soil nutrient bioavailability directly.", risks: "Nutrient lockout if out of bounds", improvements: "Apply organic matter buffers" },
            nitrogen: { value: params.nitrogen, ideal: "60 - 100", interpretation: params.nitrogen >= 50 ? "Adequate" : "Deficient", effect: "Key driver of leaf canopy growth.", risks: "Stunted growth if deficient", improvements: "Apply nitrogenous feed" },
            phosphorus: { value: params.phosphorus, ideal: "30 - 50", interpretation: params.phosphorus >= 30 ? "Adequate" : "Deficient", effect: "Promotes root architecture expansion.", risks: "Poor root development", improvements: "Apply bone meal or rock phosphate" },
            potassium: { value: params.potassium, ideal: "100 - 150", interpretation: params.potassium >= 100 ? "Adequate" : "Deficient", effect: "Enhances stem strength and disease defense.", risks: "Susceptibility to fungal pathogens", improvements: "Apply sulfate of potash" },
            organicCarbon: { value: params.organicCarbon, ideal: "1.5 - 3.0", interpretation: "Stable", effect: "Supports beneficial soil microorganisms.", risks: "Decline degrades soil water retention", improvements: "Incorporate compost and cover crop residues" },
            moisture: { value: params.moisture, ideal: "40% - 60%", interpretation: params.moisture >= 35 ? "Normal" : "Dry", effect: "Transports minerals into plant roots.", risks: "Root dehydration and leaf wilt", improvements: "Execute targeted irrigation cycle" },
            temperature: { value: params.temperature, ideal: "20°C - 30°C", interpretation: "Optimal", effect: "Drives chemical and metabolic activity.", risks: "Thermal shock to roots if high", improvements: "Mulch with agricultural straw" },
            humidity: { value: params.humidity, ideal: "50% - 70%", interpretation: "Normal", effect: "Regulates leaf transpiration balance.", risks: "High humidity fosters fungal growth", improvements: "Ensure row ventilation" }
          },
          soilFertilityAssessment: {
            classification: phOk ? "Good" : "Moderate",
            explanation: `The chemical structure is ${phOk ? 'well-balanced with active carbon levels.' : 'exhibiting pH imbalances which limit nutrient accessibility.'}`
          },
          nutrientDeficiency: {
            nitrogenDeficiency: { status: params.nitrogen < 50 ? "Yes" : "No", symptoms: params.nitrogen < 50 ? "Pale yellowing of older lower leaves" : "None", impact: "Reduced leaf size and stunted stalks", recovery: "Apply urea or blood meal" },
            phosphorusDeficiency: { status: params.phosphorus < 30 ? "Yes" : "No", symptoms: params.phosphorus < 30 ? "Purple coloration on leaf undersides" : "None", impact: "Delayed root growth and weak flowers", recovery: "Incorporate bone meal or superphosphate" },
            potassiumDeficiency: { status: params.potassium < 100 ? "Yes" : "No", symptoms: params.potassium < 100 ? "Leaf edge scorching and necrosis" : "None", impact: "Weak stalks and low disease resistance", recovery: "Add potash fertilizers" },
            micronutrientDeficiencies: { status: "Mild Zinc Deficiency", symptoms: "White chlorotic bands on corn/maize leaves", impact: "Enzyme and growth hormone blockages", recovery: "Foliar zinc sulfate spray application" }
          },
          cropSuitability: [
            { crop: params.cropType, suitability: phOk ? 95 : 75, performance: "High yield output possible", reasons: "Optimal N and K nutrient reserves", risks: "Water deficit if dry spell occurs" },
            { crop: "Maize", suitability: 85, performance: "Good stalk height and grain count", reasons: "Well draining soil profile", risks: "Nutrient wash if excessive rainfall" },
            { crop: "Soybean", suitability: 80, performance: "Average pod count", reasons: "Supports nitrogen fixation pathways", risks: "Fungal leaf spot" }
          ],
          yieldPrediction: {
            expectedYield: phOk ? "6.8 tons / acre" : "4.5 tons / acre",
            confidence: "90%",
            improvingFactors: "Favorable temperature and stable Organic Carbon reserves.",
            reducingFactors: `${params.moisture < 35 ? 'Water scheduling deficits' : 'Micronutrient zinc locks.'}`
          },
          irrigation: {
            waterRequirement: "20,000 liters / acre / week",
            interval: params.moisture < 35 ? "Every 2 days" : "Every 4 days",
            waterSaving: "Leverage drip lines and schedule operations strictly at night to avoid evaporation.",
            seasonal: "Cut volumes by half during wet seasons to prevent root rot."
          },
          fertilizer: {
            npk: "NPK 19-19-19 chemical fertilizer at 40kg/acre.",
            organic: "Decomposed cattle manure at 3 tons/acre.",
            biofertilizers: "Mycorrhiza fungi and Azotobacter at 2kg/acre.",
            schedule: "50% basal at seeding, 25% at vegetative stage, 25% at flowering.",
            dosage: "40kg per acre total."
          },
          pestDiseaseRisk: {
            riskLevel: params.humidity > 80 ? "High" : "Moderate",
            possibleDiseases: "Root rot, damping off, late blight",
            preventiveMeasures: "Implement seed treatment and avoid water-logging in clay pockets."
          },
          weatherImpact: {
            currentEffect: "Warm ambient temperature is driving photosynthesis.",
            upcomingRisks: "Expected heat wave could accelerate soil drying.",
            rainfallImpact: "Scattered rainfall will reduce irrigation dependencies.",
            heatStress: "Implement mulching layer immediately to protect roots from high heat.",
            coldStress: "No cold/frost damage risk for this vegetative phase."
          },
          sustainabilityScore: {
            score: healthScore,
            organicCarbon: "Organic carbon level maintains structural soil life.",
            waterEfficiency: "Drip setup reduces wastage by over 30%.",
            nutrientBalance: "Nutrient inputs balance crop withdrawals.",
            environmentalImpact: "Low runoff risk protects local streams.",
            carbonFootprint: "Minimal chemical inputs optimize overall carbon footprints."
          },
          actionPlan: {
            immediate: "Irrigate the field immediately if moisture is low.",
            next7Days: "Mulch soil beds with organic straw.",
            next30Days: "Apply secondary nitrogen compost top-dressing.",
            seasonal: "Rotate fields with alfalfa or cover crops post-harvest to renew nitrogen."
          },
          explainableAI: `Recommendations are derived directly from input pH of ${params.pH} and moisture of ${params.moisture}%. Soil acidity is ${phOk ? 'optimal' : 'sub-optimal'} for direct biological assimilation of macronutrients.`,
          confidenceScore: {
            score: 95,
            explanation: "Sensors show excellent calibration and match local baseline soil profiles."
          }
        };
      }
    })();

    if (language === 'hi') {
      return {
        soilHealth: phOk && params.moisture > 35 ? 7.2 : 5.0,
        deficiencies: params.nitrogen < 50 ? ['नाइट्रोजन'] : params.phosphorus < 30 ? ['फास्फोरस'] : [],
        fertilizerRecommendation: `${params.nitrogen < 50 ? 'नाइट्रोजन युक्त खाद डालें जैसे यूरिया या DAP। प्रति एकड़ 40 किलो नाइट्रोजन दें।' : 'संतुलित NPK 19-19-19 उर्वरक डालें।'}`,
        irrigationRecommendation: `नमी ${params.moisture}% है। ${params.moisture < 35 ? 'तुरंत सिंचाई करें।' : 'सामान्य सिंचाई अनुसूची जारी रखें।'}`,
        suitableCrops: [params.cropType, 'मक्का', 'सोयाबीन'],
        riskLevel: params.humidity > 80 ? 'High' : phOk ? 'Low' : 'Moderate',
        recommendations: [
          `मिट्टी का pH ${params.pH} ${phOk ? 'उपयुक्त है।' : 'अनुपयुक्त है। चूना या जिप्सम डालें।'}`,
          `नाइट्रोजन ${params.nitrogen} mg/kg — ${params.nitrogen < 50 ? 'बूस्टर खाद डालें।' : 'पर्याप्त है।'}`,
          `नमी ${params.moisture}% — ${params.moisture < 35 ? 'अभी सिंचाई करें।' : 'सामान्य अनुसूची।'}`,
          `तापमान ${params.temperature}°C सक्रिय विकास के लिए उपयुक्त है।`,
          `आर्द्रता ${params.humidity}% — ${params.humidity > 80 ? 'फयूंद का खतरा है।' : 'फयूंद का खतरा कम है।'}`
        ],
        aiReport: JSON.stringify(mockReportData)
      };
    }

    return {
      soilHealth: phOk && params.moisture > 35 ? 7.2 : 5.0,
      deficiencies: params.nitrogen < 50 ? ['Nitrogen'] : params.phosphorus < 30 ? ['Phosphorus'] : [],
      fertilizerRecommendation: `Apply ${params.nitrogen < 50 ? 'nitrogen-rich' : 'balanced NPK 19-19-19'} fertilizer.`,
      irrigationRecommendation: `Moisture at ${params.moisture}%. ${params.moisture < 35 ? 'Irrigate immediately.' : 'Maintain normal schedule.'}`,
      suitableCrops: [params.cropType, 'Maize', 'Soybean'],
      riskLevel: params.humidity > 80 ? 'High' : phOk ? 'Low' : 'Moderate',
      recommendations: [
        `Soil pH ${params.pH} is ${phOk ? 'optimal' : 'sub-optimal'} for ${params.cropType}.`,
        `Nitrogen at ${params.nitrogen} mg/kg — ${params.nitrogen < 50 ? 'apply booster' : 'adequate'}.`,
        `Moisture ${params.moisture}% — ${params.moisture < 35 ? 'irrigate now' : 'normal schedule'}.`,
        `Temperature ${params.temperature}°C suitable for active growth.`,
        `Humidity ${params.humidity}% — ${params.humidity > 80 ? 'monitor for fungal risk' : 'low fungal risk'}.`
      ],
      aiReport: JSON.stringify(mockReportData)
    };
  },

  /**
   * Yield prediction model calculations
   * @param language - 'en' for English (default), 'hi' for Hindi
   */
  async predictYield(params: {
    cropType: string;
    area: number;
    season: string;
    soilType: string;
    weather: string;
    irrigation: string;
    fertilizer: string;
    historicalYield: number;
    language?: 'en' | 'hi';
  }): Promise<IYieldResponse> {
    const provider = getAIProvider();
    const language = params.language || 'en';
    const apiKeyPreview = maskKey(process.env.GEMINI_API_KEY);
    console.log(`[AI Yield Predict] Active Provider: ${provider}, API Key: ${apiKeyPreview}, Model: ${GEMINI_MODEL}, Language: ${language}`);
    console.log(`[AI Yield Predict] Params:`, JSON.stringify({ cropType: params.cropType, area: params.area, season: params.season }));
    
    const prompt = `You are a senior agricultural scientist, agronomist, and crop yield specialist. Using the ACTUAL farm data provided below, generate a precise, professional, multi-section yield prediction report. 

Your report must be unique, highly customized to the supplied farm details, and avoid generic recommendations.

FARM DATA:
- Crop Type: ${params.cropType}
- Planted Area: ${params.area} acres
- Season: ${params.season}
- Soil Type: ${params.soilType}
- Latest Soil pH: ${(params as any).soilPH ?? '6.5'}
- Soil Moisture: ${(params as any).soilMoisture ?? '22'}%
- Soil Nitrogen (N): ${(params as any).soilNitrogen ?? '45'} mg/kg
- Soil Phosphorus (P): ${(params as any).soilPhosphorus ?? '28'} mg/kg
- Soil Potassium (K): ${(params as any).soilPotassium ?? '180'} mg/kg
- Active Crops: ${(params as any).activeCrops ?? 'None'}
- Latest Weather: ${params.weather}
- Latest Temperature: ${(params as any).weatherTemp ?? '28'}°C
- Latest Humidity: ${(params as any).weatherHumidity ?? '65'}%
- Irrigation Type: ${params.irrigation}
- Irrigation Sessions (last 5): ${(params as any).irrigationSummary ?? 'No recent records'}
- Fertilizer Applications (last 5): ${(params as any).fertilizerSummary ?? 'No recent records'}
- Historical Yield: ${params.historicalYield} tons

Return ONLY a valid JSON object (do not include any markdown styling, code blocks like \`\`\`json, or extra comments) matching this exact schema:
{
  "expectedYield": "numeric yield in tons as string",
  "accuracy": "predicted accuracy percentage 85-99 as string",
  "confidenceLevel": "High",
  "revenue": "estimated revenue USD as string",
  "cost": "estimated cost USD as string",
  "profit": "estimated net profit USD as string",
  "weatherImpact": "Positive",
  "diseaseRisk": "Low",
  "fertilizerImpact": "Optimal",
  "waterRequirement": "Efficient",
  "marketOutlook": "Bullish",
  "riskAnalysis": "detailed risk analysis",
  "recommendations": {
    "increaseYield": "recommendation for increasing yield",
    "waterOpt": "recommendation for water optimization",
    "nutrient": "recommendation for nutrient optimization",
    "disease": "recommendation for disease management",
    "harvest": "recommendation for harvest timing"
  },
  "aiReport": {
    "executiveSummary": {
      "cropName": "Name of the crop",
      "growthStage": "Current estimated growth stage based on season and parameters",
      "predictedYield": "Expected total yield in tons",
      "yieldCategory": "High / Average / Low",
      "performance": "Overall farm performance status",
      "confidence": "AI confidence level rating (e.g., 94%)",
      "summary": "Concise executive overview of the yield projection"
    },
    "predictionDetails": {
      "expectedProduction": "Total expected production in tons",
      "productionPerUnit": "Expected production per acre/hectare",
      "confidencePct": "Confidence score in %",
      "accuracy": "Expected prediction accuracy %",
      "yieldRange": "Possible yield range (e.g., 20 - 24 tons)",
      "bestCase": "Best case yield in tons",
      "averageScenario": "Expected average scenario yield in tons",
      "worstCase": "Worst case yield in tons"
    },
    "factors": {
      "soilFertility": "Current status, yield influence, positive impacts, negative impacts, and overall contribution for Soil fertility",
      "nitrogen": "Current status, yield influence, positive impacts, negative impacts, and overall contribution for Nitrogen (N)",
      "phosphorus": "Current status, yield influence, positive impacts, negative impacts, and overall contribution for Phosphorus (P)",
      "potassium": "Current status, yield influence, positive impacts, negative impacts, and overall contribution for Potassium (K)",
      "organicCarbon": "Current status, yield influence, positive impacts, negative impacts, and overall contribution for Organic Carbon",
      "moisture": "Current status, yield influence, positive impacts, negative impacts, and overall contribution for Soil Moisture",
      "temperature": "Current status, yield influence, positive impacts, negative impacts, and overall contribution for Temperature",
      "humidity": "Current status, yield influence, positive impacts, negative impacts, and overall contribution for Humidity",
      "rainfall": "Current status, yield influence, positive impacts, negative impacts, and overall contribution for Rainfall",
      "sunlight": "Current status, yield influence, positive impacts, negative impacts, and overall contribution for Sunlight exposure",
      "cropHealth": "Current status, yield influence, positive impacts, negative impacts, and overall contribution for Crop health",
      "disease": "Current status, yield influence, positive impacts, negative impacts, and overall contribution for Disease pressure",
      "practices": "Current status, yield influence, positive impacts, negative impacts, and overall contribution for Previous farming practices"
    },
    "limitingFactors": {
      "waterShortage": "How water shortage is reducing expected yield",
      "lowNutrients": "How low nutrients are reducing expected yield",
      "poorWeather": "How poor weather reduces expected yield",
      "heatStress": "How heat stress reduces expected yield",
      "disease": "How disease reduces expected yield",
      "pests": "How pests reduce expected yield",
      "improperIrrigation": "How improper irrigation reduces expected yield",
      "soilIssues": "How soil issues reduce expected yield"
    },
    "positiveFactors": {
      "healthySoil": "How healthy soil increases expected yield",
      "balancedNutrients": "How balanced nutrients increase expected yield",
      "goodWeather": "How good weather increases expected yield",
      "healthyCrop": "How healthy crop increases expected yield",
      "properIrrigation": "How proper irrigation increases expected yield"
    },
    "riskAssessment": {
      "weatherRisk": "Very Low / Low / Moderate / High / Critical",
      "diseaseRisk": "Very Low / Low / Moderate / High / Critical",
      "pestRisk": "Very Low / Low / Moderate / High / Critical",
      "waterRisk": "Very Low / Low / Moderate / High / Critical",
      "nutrientRisk": "Very Low / Low / Moderate / High / Critical",
      "economicRisk": "Very Low / Low / Moderate / High / Critical"
    },
    "scenarioAnalysis": {
      "bestCase": "Best Case scenario parameters and why it may happen",
      "expectedCase": "Expected Case scenario parameters and why it may happen",
      "worstCase": "Worst Case scenario parameters and why it may happen"
    },
    "economicAnalysis": {
      "expectedProduction": "Total expected production in tons",
      "marketValue": "Estimated market value per ton",
      "income": "Estimated gross income",
      "profit": "Estimated net profit",
      "productionCost": "Estimated production cost",
      "roi": "Expected return on investment %",
      "lossRisk": "Loss risk rating and details"
    },
    "recommendations": {
      "nutrition": "Nutrition recommendations to improve yield",
      "irrigation": "Irrigation recommendations to improve yield",
      "diseaseMgmt": "Disease management recommendations to improve yield",
      "weedMgmt": "Weed management recommendations to improve yield",
      "pestControl": "Pest control recommendations to improve yield",
      "growthRegulators": "Growth regulators recommendations to improve yield",
      "harvestPlanning": "Harvest planning recommendations to improve yield"
    },
    "irrigationPlan": {
      "waterRequirement": "Water requirement description",
      "weeklySchedule": "Weekly irrigation schedule",
      "waterSaving": "Water-saving methods",
      "criticalStages": "Critical irrigation stages"
    },
    "fertilizerSchedule": {
      "npk": "NPK recommendations",
      "organic": "Organic fertilizers details",
      "biofertilizers": "Biofertilizers details",
      "timing": "Application timing",
      "dosage": "Dosage details",
      "frequency": "Frequency details"
    },
    "diseasePrevention": {
      "likelyDiseases": "Likely diseases details",
      "preventiveMeasures": "Preventive measures details",
      "monitoringSchedule": "Monitoring schedule details"
    },
    "weatherImpact": {
      "currentWeather": "Current weather explanation",
      "futureWeather": "Future weather prediction",
      "heatStress": "Heat stress explanation",
      "rainfallEffect": "Rainfall effect explanation",
      "humidityEffect": "Humidity effect explanation",
      "temperatureEffect": "Temperature effect explanation"
    },
    "sustainability": {
      "waterEfficiency": "Water efficiency analysis",
      "soilSustainability": "Soil sustainability details",
      "carbonFootprint": "Carbon footprint details",
      "nutrientBalance": "Nutrient balance analysis",
      "longTermSoilHealth": "Long term soil health analysis",
      "environmentalImpact": "Environmental impact analysis"
    },
    "explainableAI": {
      "whyPredicted": "Why Gemini predicted this yield",
      "keyParameters": "Key farm parameters that contributed the most",
      "farmerExplanation": "Simple explanation understandable by farmers"
    },
    "confidenceAnalysis": {
      "confidencePct": "Confidence score in %",
      "reason": "Reason for confidence",
      "missingData": "Missing data description",
      "limitations": "Prediction limitations",
      "suggestions": "Suggestions for improving accuracy"
    },
    "actionPlan": {
      "immediate": "Immediate actions",
      "next7Days": "Next 7 days actions",
      "next30Days": "Next 30 days actions",
      "preHarvest": "Pre-harvest actions",
      "harvest": "Harvest actions",
      "postHarvest": "Post-harvest actions"
    },
    "futureImprovements": {
      "improvements": "Practical improvements list that could increase future yields"
    }
  }
}${language === 'hi' ? '\nIMPORTANT: Provide the response entirely in Hindi. Keep values consistent, but translate all descriptions, titles, and text contents into clear, professional Hindi.' : ''}`;

    if (provider === 'openai') {
      console.log(`[Backend Request] Provider: openai, Model: gpt-4o-mini`);
      const client = getOpenAIClient();
      try {
        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        });
        const text = response.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(text);
        if (parsed.aiReport) {
          parsed.aiReport = typeof parsed.aiReport === 'string' ? parsed.aiReport : JSON.stringify(parsed.aiReport);
        }
        return parsed;
      } catch (err) {
        console.error("OpenAI yield prediction error, falling back to mock", err);
      }
    }

    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY || "";
      console.log(`[Backend Request] Provider: gemini, Model: ${GEMINI_MODEL}`);
      try {
        const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        };
        const text = await callGeminiRest(GEMINI_MODEL, payload, apiKey, "Yield Prediction");
        const parsed = JSON.parse(text || '{}');
        if (parsed.aiReport) {
          parsed.aiReport = typeof parsed.aiReport === 'string' ? parsed.aiReport : JSON.stringify(parsed.aiReport);
        }
        return parsed;
      } catch (err) {
        console.error("Gemini yield prediction error, falling back to mock", err);
      }
    }

    // --- Mock Fallback Mode ---
    console.log(`[AI Yield Predict] Running mock fallback logic (language: ${language})...`);
    const { cropType, area, fertilizer, season, soilType, weather } = params;
    const yieldMap: Record<string, number> = { Wheat: 2.8, Corn: 4.5, Rice: 3.8, Tomato: 22.0, Soybean: 1.6, Cotton: 1.1, Sugarcane: 36.5, Potato: 12.0, Apple: 18.0, 'Green Chilli': 8.0 };
    const baseYield = area * (yieldMap[cropType] || 2.5) * (season === 'Winter' ? 0.8 : 1.0) * (fertilizer === 'None' ? 0.7 : 1.0);
    const priceMap: Record<string, number> = { Wheat: 280, Rice: 450, Tomato: 600, Cotton: 800, Sugarcane: 120, 'Green Chilli': 500 };
    const expectedProd = baseYield;
    const prodPerAcre = baseYield / area;
    const revenue = baseYield * (priceMap[cropType] || 350);
    const cost = area * 480;
    const profit = revenue - cost;
    const roi = ((profit / cost) * 100);

    const mockReportDataEn = {
      executiveSummary: {
        cropName: cropType,
        growthStage: season === 'Winter' ? 'Vegetative / Tillering' : 'Flowering / Fruit Development',
        predictedYield: `${expectedProd.toFixed(1)} tons`,
        yieldCategory: expectedProd > 100 ? 'High' : expectedProd > 20 ? 'Average' : 'Low',
        performance: 'Optimal soil moisture and temperature indicate a healthy growing environment.',
        confidence: '94%',
        summary: `The yield projection models estimate a total production of ${expectedProd.toFixed(1)} tons for this crop lifecycle. High nitrogen indices and balanced soil pH are primary factors contributing to this yield.`
      },
      predictionDetails: {
        expectedProduction: `${expectedProd.toFixed(1)} tons`,
        productionPerUnit: `${prodPerAcre.toFixed(2)} tons per acre`,
        confidencePct: '94%',
        accuracy: '92.5%',
        yieldRange: `${(expectedProd * 0.9).toFixed(1)} - ${(expectedProd * 1.1).toFixed(1)} tons`,
        bestCase: `${(expectedProd * 1.15).toFixed(1)} tons`,
        averageScenario: `${expectedProd.toFixed(1)} tons`,
        worstCase: `${(expectedProd * 0.8).toFixed(1)} tons`
      },
      factors: {
        soilFertility: `Fertility levels are currently highly favorable. Organic matter acts as a buffer preserving moisture, contributing positively to yield potential.`,
        nitrogen: `Nitrogen level is estimated at ${(params as any).soilNitrogen ?? 45} mg/kg, which is adequate for this stage. It supports rapid leaf growth and chlorophyll production.`,
        phosphorus: `Phosphorus is at ${(params as any).soilPhosphorus ?? 28} mg/kg. Fosters initial root formation and accelerates crop maturation.`,
        potassium: `Potassium is at ${(params as any).soilPotassium ?? 180} mg/kg, vital for fruit and grain quality. It improves plant defense against environmental stressors.`,
        organicCarbon: `Organic Carbon is at 0.75%, which is average. Contributes to water retention and soil biodiversity.`,
        moisture: `Soil moisture of ${(params as any).soilMoisture ?? 22}% is optimal. Prevents cellular wilting and maintains nutrient dissolution rates.`,
        temperature: `Current temperature is ${(params as any).weatherTemp ?? 28}°C. Ideal for photosynthesis.`,
        humidity: `Relative humidity is ${(params as any).weatherHumidity ?? 65}%, which is suitable but increases disease risk.`,
        rainfall: `Rainfall is seasonal and adequate. Supports natural irrigation scheduling.`,
        sunlight: `High sunlight exposure of 8.5 hours/day. Accelerates biomass accumulation.`,
        cropHealth: `No major disease footprints observed. Plant vigour is rated as excellent.`,
        disease: `Disease pressure is minimal. Active monitoring is recommended to prevent local outbreak.`,
        practices: `Previous crop rotation with legumes has enriched the soil structure and nitrogen retention.`
      },
      limitingFactors: {
        waterShortage: `Water shortage risk is Low under the current drip irrigation schedule.`,
        lowNutrients: `Slight phosphorus deficit could limit grain filling in late stages.`,
        poorWeather: `Late frost risks are minimal but sudden high-temperature waves could trigger early flowering.`,
        heatStress: `Temperatures exceeding 35°C could cause pollen sterility.`,
        disease: `Fungal blight spores remain dormant, risking emergence under prolonged high humidity.`,
        pests: `Aphids pose a minor threat during vegetative shoots.`,
        improperIrrigation: `Over-watering risks root rot in clayey areas.`,
        soilIssues: `Slight alkaline soil pH (7.2) may slow iron absorption.`
      },
      positiveFactors: {
        healthySoil: `Rich organic content improves root respiration and nutrient transport.`,
        balancedNutrients: `Adequate NPK ratio prevents lodging and promotes robust stalks.`,
        goodWeather: `Moderate daytime temp profiles maximize crop vegetative growth.`,
        healthyCrop: `High leaf area index ensures optimal solar energy capture.`,
        properIrrigation: `Drip irrigation maintains uniform moisture across the field.`
      },
      riskAssessment: {
        weatherRisk: 'Low',
        diseaseRisk: 'Moderate',
        pestRisk: 'Low',
        waterRisk: 'Low',
        nutrientRisk: 'Low',
        economicRisk: 'Moderate'
      },
      scenarioAnalysis: {
        bestCase: `Yield reaches ${(expectedProd * 1.15).toFixed(1)} tons due to perfect climate, timely fertigation, and absence of pests.`,
        expectedCase: `Yield stabilizes at ${expectedProd.toFixed(1)} tons based on standard weather patterns and routine weeding.`,
        worstCase: `Yield drops to ${(expectedProd * 0.8).toFixed(1)} tons due to an early monsoon exit or leaf rust disease outbreak.`
      },
      economicAnalysis: {
        expectedProduction: `${expectedProd.toFixed(1)} tons`,
        marketValue: `$${(priceMap[cropType] || 350)} per ton`,
        income: `$${revenue.toFixed(0)}`,
        profit: `$${profit.toFixed(0)}`,
        productionCost: `$${cost.toFixed(0)}`,
        roi: `${roi.toFixed(1)}%`,
        lossRisk: `Low risk. Current futures contracts lock in a high base price.`
      },
      recommendations: {
        nutrition: `Apply secondary nutrients (calcium, magnesium) during flowering.`,
        irrigation: `Increase irrigation intervals during grain development stage.`,
        diseaseMgmt: `Spray neem extract preventively to suppress early fungal spores.`,
        weedMgmt: `Perform manual weeding at day 25 post-germination.`,
        pestControl: `Deploy pheromone traps to capture larvae moths.`,
        growthRegulators: `Not required under current healthy growth rates.`,
        harvestPlanning: `Monitor moisture content; harvest when grain moisture falls below 14%.`
      },
      irrigationPlan: {
        waterRequirement: `Approximately 450 mm of total water equivalent required over the cycle.`,
        weeklySchedule: `Provide 15 mm of water every 3 days via drip lines.`,
        waterSaving: `Use straw mulching to reduce evaporation losses by 20%.`,
        criticalStages: `Flowering and grain development stages require strict moisture maintenance.`
      },
      fertilizerSchedule: {
        npk: `NPK 12-32-16 at 50kg/acre split-applied.`,
        organic: `Compost manure at 2 tons/acre applied at land preparation.`,
        biofertilizers: `Azotobacter inoculation for seed treatment.`,
        timing: `Basal dose at sowing, top dressing at day 30.`,
        dosage: `50 kg basal, 25 kg top-dressing.`,
        frequency: `Twice per crop cycle.`
      },
      diseasePrevention: {
        likelyDiseases: `Leaf rust, powdery mildew, and aphid infestations.`,
        preventiveMeasures: `Maintain row spacing of 45cm to allow aeration.`,
        monitoringSchedule: `Inspect leaves every Monday and Thursday morning.`
      },
      weatherImpact: {
        currentWeather: `Sunny with light wind; supports optimal transpiration.`,
        futureWeather: `Forecast predicts dry spell; requires irrigation adjustments.`,
        heatStress: `Minimal risk due to moderate temperatures.`,
        rainfallEffect: `Supplemented rainfall reduces electrical pumping costs.`,
        humidityEffect: `High humidity (>80%) requires preventive fungicide spray.`,
        temperatureEffect: `Warm soil temp promotes quick seed germination.`
      },
      sustainability: {
        waterEfficiency: `Drip system ensures a high water efficiency of 90%.`,
        soilSustainability: `No tillage conservation practices preserve soil structure.`,
        carbonFootprint: `Estimated carbon footprint is 180 kg CO2-e per ton.`,
        nutrientBalance: `Balanced NPK inputs prevent soil acidification.`,
        longTermSoilHealth: `Intercropping with cover crops maintains soil microbes.`,
        environmentalImpact: `Zero run-off prevents local water contamination.`
      },
      explainableAI: {
        whyPredicted: `Prediction relies on strong soil organic matter and historic yield correlation.`,
        keyParameters: `Soil moisture, nitrogen content, and temperature contribute 75% of prediction weight.`,
        farmerExplanation: `This yield is high because your soil has excellent moisture and sufficient nitrogen, coupled with favorable weather.`
      },
      confidenceAnalysis: {
        confidencePct: '94%',
        reason: `Consistent telemetry streams and close alignment with historical yield data.`,
        missingData: `Foliar tissue test results are not available in current logs.`,
        limitations: `Model does not predict catastrophic weather events like hailstorms.`,
        suggestions: `Incorporate local weather station radar logs for better accuracy.`
      },
      actionPlan: {
        immediate: `Check soil moisture and clear weed borders.`,
        next7Days: `Apply first nitrogen top-dressing dose.`,
        next30Days: `Initiate preventive pest monitoring.`,
        preHarvest: `Stop watering 10 days before harvest.`,
        harvest: `Begin harvesting during dry, sunny mornings.`,
        postHarvest: `Dry crop residues and store in aerated granaries.`
      },
      futureImprovements: {
        improvements: `Install smart soil moisture sensors at multiple depths and transition to automatic weather station nodes.`
      }
    };

    const mockReportDataHi = {
      executiveSummary: {
        cropName: cropType === 'Wheat' ? 'गेहूं' : cropType === 'Rice' ? 'चावल' : cropType === 'Tomato' ? 'टमाटर' : cropType,
        growthStage: season === 'Winter' ? 'वानस्पतिक / कल्ले निकलना' : 'पुष्पन / फल विकास अवस्था',
        predictedYield: `${expectedProd.toFixed(1)} टन`,
        yieldCategory: expectedProd > 100 ? 'उच्च' : expectedProd > 20 ? 'औसत' : 'कम',
        performance: 'इष्टतम मिट्टी की नमी और तापमान एक स्वस्थ विकास वातावरण का संकेत देते हैं।',
        confidence: '94%',
        summary: `फसल उपज मॉडल चक्र के लिए कुल ${expectedProd.toFixed(1)} टन उत्पादन का अनुमान लगाता है। उच्च नाइट्रोजन और संतुलित पीएच इसके मुख्य कारक हैं।`
      },
      predictionDetails: {
        expectedProduction: `${expectedProd.toFixed(1)} टन`,
        productionPerUnit: `${prodPerAcre.toFixed(2)} टन प्रति एकड़`,
        confidencePct: '94%',
        accuracy: '92.5%',
        yieldRange: `${(expectedProd * 0.9).toFixed(1)} - ${(expectedProd * 1.1).toFixed(1)} टन`,
        bestCase: `${(expectedProd * 1.15).toFixed(1)} टन`,
        averageScenario: `${expectedProd.toFixed(1)} टन`,
        worstCase: `${(expectedProd * 0.8).toFixed(1)} टन`
      },
      factors: {
        soilFertility: `मिट्टी की उर्वरता वर्तमान में अत्यधिक अनुकूल है। कार्बनिक पदार्थ नमी बनाए रखते हैं जिससे फसल की उत्पादकता बढ़ती है।`,
        nitrogen: `नाइट्रोजन का स्तर ${(params as any).soilNitrogen ?? 45} मिलीग्राम/किग्रा है, जो इस चरण के लिए पर्याप्त है। यह पत्तियों की वृद्धि में मदद करता है।`,
        phosphorus: `फास्फोरस का स्तर ${(params as any).soilPhosphorus ?? 28} मिलीग्राम/किग्रा है। यह जड़ों के गठन को बढ़ावा देता है।`,
        potassium: `पोटेशियम ${(params as any).soilPotassium ?? 180} मिलीग्राम/किग्रा है, जो फल की गुणवत्ता के लिए महत्वपूर्ण है। यह तनाव प्रतिरोध को बढ़ाता है।`,
        organicCarbon: `कार्बनिक कार्बन 0.75% है, जो सामान्य है। यह जल धारण क्षमता में सुधार करता है।`,
        moisture: `मिट्टी की नमी ${(params as any).soilMoisture ?? 22}% है जो इष्टतम है। यह पोषक तत्वों के अवशोषण को बनाए रखती है।`,
        temperature: `तापमान ${(params as any).weatherTemp ?? 28}°C है। यह प्रकाश संश्लेषण के लिए आदर्श है।`,
        humidity: `सापेक्ष आर्द्रता ${(params as any).weatherHumidity ?? 65}% है। यह उपयुक्त है लेकिन रोग जोखिम बढ़ाती है।`,
        rainfall: `वर्षा मौसमी और पर्याप्त है। प्राकृतिक सिंचाई समय-सारणी का समर्थन करती है।`,
        sunlight: `धूप का समय 8.5 घंटे/दिन है। यह बायोमास संचय को तेज करता है।`,
        cropHealth: `कोई गंभीर बीमारी नहीं देखी गई। फसल का स्वास्थ्य बहुत अच्छा है।`,
        disease: `रोग का दबाव न्यूनतम है। रोग के फैलाव को रोकने के लिए नियमित निगरानी आवश्यक है।`,
        practices: `फलियों के साथ फसल चक्र ने मिट्टी की संरचना और नाइट्रोजन प्रतिधारण को समृद्ध किया है।`
      },
      limitingFactors: {
        waterShortage: `ड्रिप सिंचाई कार्यक्रम के तहत पानी की कमी का जोखिम कम है।`,
        lowNutrients: `फास्फोरस की मामूली कमी से अंतिम चरण में उपज सीमित हो सकती है।`,
        poorWeather: `ठंड का जोखिम न्यूनतम है लेकिन अचानक तापमान बढ़ने से जल्दी पुष्पन हो सकता है।`,
        heatStress: `तापमान 35°C से अधिक होने पर पराग बांझपन हो सकता है।`,
        disease: `लंबे समय तक उच्च आर्द्रता के तहत कवक रोग का जोखिम बढ़ सकता है।`,
        pests: `वानस्पतिक अवस्था के दौरान एफिड्स एक मामूली खतरा पैदा करते हैं।`,
        improperIrrigation: `अत्यधिक सिंचाई से जड़ सड़न का खतरा बढ़ जाता है।`,
        soilIssues: `मिट्टी का पीएच (7.2) थोड़ा क्षारीय है जो लोहे के अवशोषण को धीमा कर सकता है।`
      },
      positiveFactors: {
        healthySoil: `समृद्ध कार्बनिक सामग्री जड़ों के श्वसन और पोषक तत्वों के परिवहन में सुधार करती है।`,
        balancedNutrients: `पर्याप्त एनपीके अनुपात मजबूत तनों को बढ़ावा देता है।`,
        goodWeather: `मध्यम तापमान प्रोफाइल फसल की वानस्पतिक वृद्धि को अधिकतम करते हैं।`,
        healthyCrop: `उच्च पत्ती क्षेत्र सूचकांक सौर ऊर्जा का इष्टतम संचय सुनिश्चित करता है।`,
        properIrrigation: `ड्रिप सिंचाई पूरे खेत में समान नमी बनाए रखती है।`
      },
      riskAssessment: {
        weatherRisk: 'Low',
        diseaseRisk: 'Moderate',
        pestRisk: 'Low',
        waterRisk: 'Low',
        nutrientRisk: 'Low',
        economicRisk: 'Moderate'
      },
      scenarioAnalysis: {
        bestCase: `सही मौसम और समय पर फर्टिगेशन से उपज ${(expectedProd * 1.15).toFixed(1)} टन तक पहुंच सकती है।`,
        expectedCase: `सामान्य मौसम पैटर्न के आधार पर उपज ${expectedProd.toFixed(1)} टन पर स्थिर रहेगी।`,
        worstCase: `जल्दी मानसून समाप्त होने या पत्ती रोग फैलने से उपज ${(expectedProd * 0.8).toFixed(1)} टन तक गिर सकती है।`
      },
      economicAnalysis: {
        expectedProduction: `${expectedProd.toFixed(1)} टन`,
        marketValue: `₹${((priceMap[cropType] || 350) * 83).toFixed(0)} प्रति टन`,
        income: `₹${(revenue * 83).toFixed(0)}`,
        profit: `₹${(profit * 83).toFixed(0)}`,
        productionCost: `₹${(cost * 83).toFixed(0)}`,
        roi: `${roi.toFixed(1)}%`,
        lossRisk: `कम जोखिम। वर्तमान बाजार कीमतें स्थिर बनी हुई हैं।`
      },
      recommendations: {
        nutrition: `पुष्पन के दौरान माध्यमिक पोषक तत्व (कैल्शियम, मैग्नीशियम) डालें।`,
        irrigation: `दाने के विकास के चरण में सिंचाई के अंतराल को बढ़ाएं।`,
        diseaseMgmt: `कवक रोग के प्रसार को रोकने के लिए नीम के तेल का छिड़काव करें।`,
        weedMgmt: `अंकुरण के 25 दिन बाद हाथ से निराई-गुड़ाई करें।`,
        pestControl: `कीड़ों को पकड़ने के लिए फेरोमोन जाल लगाएं।`,
        growthRegulators: `स्वस्थ विकास दरों के तहत वृद्धि नियामकों की आवश्यकता नहीं है।`,
        harvestPlanning: `नमी की निगरानी करें; जब दाने की नमी 14% से कम हो जाए तब कटाई करें।`
      },
      irrigationPlan: {
        waterRequirement: `चक्र के दौरान लगभग 450 मिमी पानी की आवश्यकता होगी।`,
        weeklySchedule: `ड्रिप लाइन द्वारा हर 3 दिन में 15 मिमी पानी दें।`,
        waterSaving: `वाष्पीकरण नुकसान को 20% कम करने के लिए पुआल मल्चिंग का उपयोग करें।`,
        criticalStages: `पुष्पन और दाने के विकास के चरणों में सख्त नमी बनाए रखने की आवश्यकता होती है।`
      },
      fertilizerSchedule: {
        npk: `एनपीके 12-32-16 उर्वरक 50 किग्रा/एकड़ की दर से डालें।`,
        organic: `खेत की तैयारी के समय 2 टन/एकड़ की दर से कम्पोस्ट खाद डालें।`,
        biofertilizers: `बीज उपचार के लिए एज़ोटोबैक्टर का उपयोग करें।`,
        timing: `बुवाई के समय पहली खुराक, 30 दिन बाद दूसरी खुराक दें।`,
        dosage: `50 किग्रा आधार खुराक, 25 किग्रा शीर्ष खुराक।`,
        frequency: `फसल चक्र में दो बार।`
      },
      diseasePrevention: {
        likelyDiseases: `पत्ती झुलसा, पाउडरी मिल्ड्यू और एफिड्स का प्रकोप।`,
        preventiveMeasures: `हवा के संचलन के लिए 45 सेमी की दूरी बनाए रखें।`,
        monitoringSchedule: `हर सोमवार और गुरुवार सुबह पत्तियों की जांच करें।`
      },
      weatherImpact: {
        currentWeather: `हल्की हवा के साथ धूप; इष्टतम वाष्पोत्सर्जन में मदद करती है।`,
        futureWeather: `सूखे की भविष्यवाणी; सिंचाई समायोजन की आवश्यकता है।`,
        heatStress: `मध्यम तापमान के कारण न्यूनतम जोखिम।`,
        rainfallEffect: `बारिश होने पर पंपिंग लागत कम हो जाती है।`,
        humidityEffect: `उच्च आर्द्रता (>80%) होने पर निवारक कवकनाशी का छिड़काव करें।`,
        temperatureEffect: `गर्म मिट्टी का तापमान त्वरित अंकुरण को बढ़ावा देता है।`
      },
      sustainability: {
        waterEfficiency: `ड्रिप प्रणाली 90% की उच्च जल दक्षता सुनिश्चित करती है।`,
        soilSustainability: `बिना जुताई के संरक्षण प्रथाएं मिट्टी की संरचना को बचाती हैं।`,
        carbonFootprint: `अनुमानित कार्बन फुटप्रिंट 180 किग्रा CO2 प्रति टन है।`,
        nutrientBalance: `संतुलित एनपीके इनपुट मिट्टी के अमलीकरण को रोकता है।`,
        longTermSoilHealth: `कवर फसलों के साथ अंतःफसल मिट्टी के सूक्ष्मजीवों को बनाए रखती है।`,
        environmentalImpact: `शून्य अपवाह स्थानीय जल प्रदूषण को रोकता है।`
      },
      explainableAI: {
        whyPredicted: `भविष्यवाणी मिट्टी के कार्बनिक पदार्थ और ऐतिहासिक उपज पर आधारित है।`,
        keyParameters: `नमी, नाइट्रोजन और तापमान भविष्यवाणी का 75% हिस्सा तय करते हैं।`,
        farmerExplanation: `यह उपज अधिक है क्योंकि आपकी मिट्टी में नमी और नाइट्रोजन पर्याप्त है तथा मौसम भी अनुकूल है।`
      },
      confidenceAnalysis: {
        confidencePct: '94%',
        reason: `लगातार प्राप्त टेलीमेट्री डेटा और इतिहास के साथ उच्च संरेखण।`,
        missingData: `पत्तियों के ऊतक परीक्षण के परिणाम उपलब्ध नहीं हैं।`,
        limitations: `मॉडल ओलावृष्टि जैसी विनाशकारी मौसम घटनाओं की भविष्यवाणी नहीं करता है।`,
        suggestions: `बेहतर सटीकता के लिए स्थानीय रडार लॉग को शामिल करें।`
      },
      actionPlan: {
        immediate: `मिट्टी की नमी की जांच करें और खरपतवार साफ करें।`,
        next7Days: `नाइट्रोजन की पहली खुराक डालें।`,
        next30Days: `निवारक कीट निगरानी शुरू करें।`,
        preHarvest: `कटाई से 10 दिन पहले पानी देना बंद कर दें।`,
        harvest: `धूप वाली सुबह में कटाई शुरू करें।`,
        postHarvest: `फसल अवशेषों को सुखाएं और हवादार गोदामों में रखें।`
      },
      futureImprovements: {
        improvements: `विभिन्न गहराइयों पर स्मार्ट मिट्टी नमी सेंसर स्थापित करें और स्वचालित मौसम स्टेशन से जुड़ें।`
      }
    };

    const mockReportData = language === 'hi' ? mockReportDataHi : mockReportDataEn;

    return {
      expectedYield: baseYield.toFixed(1),
      accuracy: '94.0',
      confidenceLevel: 'High',
      revenue: Math.max(0, revenue).toFixed(0),
      cost: cost.toFixed(0),
      profit: (revenue - cost).toFixed(0),
      weatherImpact: weather === 'Sunny' ? 'Positive' : 'Neutral',
      diseaseRisk: 'Low',
      fertilizerImpact: fertilizer === 'None' ? 'Deficient' : 'Optimal',
      waterRequirement: 'Efficient',
      marketOutlook: revenue > cost ? 'Bullish' : 'Stable',
      riskAnalysis: language === 'hi' 
        ? 'मानक कृषि मॉडल पर आधारित। वर्तमान मौसम और मिट्टी की स्थिति के अनुसार फसल का अनुमान लगाया गया है।'
        : 'Based on standard agronomic models. Actual live Gemini analysis unavailable in mock mode.',
      recommendations: {
        increaseYield: language === 'hi' ? 'वानस्पतिक अवस्था में उर्वरक का उपयोग बढ़ाएं।' : 'Apply top-dressing during vegetative stage.',
        waterOpt: language === 'hi' ? 'ड्रिप सिंचाई का उपयोग करें जिससे 30% पानी की बचत होगी।' : 'Use drip irrigation to save 30% water.',
        nutrient: fertilizer === 'None' 
          ? (language === 'hi' ? 'तुरंत NPK उर्वरक डालें।' : 'Apply NPK immediately.') 
          : (language === 'hi' ? 'सूक्ष्म पोषक तत्व जैसे जिंक डालें।' : 'Supplement with micronutrients.'),
        disease: language === 'hi' ? 'कीड़ों और रोगों की नियमित जाँच करें।' : 'Monitor weekly for pests.',
        harvest: language === 'hi' ? '45-60 दिनों में सही समय पर कटाई करें।' : 'Target optimal harvest in 45-60 days.'
      },
      aiReport: JSON.stringify(mockReportData)
    };
  },

  /**
   * Conversational Agronomist Chat AI
   */
  async chat(message: string, farmContext: string, language: 'en' | 'hi' = 'en'): Promise<string> {
    const provider = getAIProvider();
    
    const key = process.env.GEMINI_API_KEY;
    const keyLength = key ? key.length : 0;
    const keyPrefix = key ? key.substring(0, 6) : "N/A";
    const keySuffix = key ? key.substring(Math.max(0, keyLength - 4)) : "N/A";
    console.log(`[AI Chat Request] Provider: ${provider}, GEMINI_API_KEY present: ${!!key} (Length: ${keyLength}, Prefix: ${keyPrefix}..., Suffix: ...${keySuffix})`);

    if (provider === 'openai') {
      console.log(`[Backend Request] Provider: openai, Model: gpt-4o-mini, Message: "${message}"`);
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI agricultural assistant. Use the user's farm data for context. Respond concisely and helpfully as an agronomist. Respond strictly in the ${language === 'hi' ? 'Hindi' : 'English'} language.`
          },
          {
            role: 'user',
            content: `Farm Context: [${farmContext}]. User Question: "${message}"`
          }
        ]
      });
      const replyText = response.choices[0]?.message?.content || '';
      console.log(`[AI Chat Success] OpenAI Response: "${replyText.substring(0, 100)}..."`);
      return replyText;
    }

    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY || "";
      console.log(`[Backend Request] Provider: gemini, Model: ${GEMINI_MODEL}, API Key: ${maskKey(apiKey)}, Message: "${message}"`);
      
      const prompt = `You are a professional agronomist and AI agricultural assistant. 
Your goal is to help the farmer using the actual farm telemetry, sensor records, and history provided below.
Prioritize using the details in the Farm Context to answer the user's question, rather than generic agricultural knowledge.

FARM CONTEXT:
${farmContext}

USER QUESTION:
"${message}"

CONSTRAINTS & INSTRUCTIONS:
1. Keep the AI strictly focused on agriculture, farming, crops, soil, weather, irrigation, pests, and agricultural operations. If the user's question is not related to these topics, politely decline to answer.
2. Respond strictly in the ${language === 'hi' ? 'Hindi' : 'English'} language.
3. You must return your response in a structured format with the following exact Markdown headings (do not change or omit these headers):

### ${language === 'hi' ? 'सारांश' : 'Summary'}
[Provide a concise summary of the issue or topic]

### ${language === 'hi' ? 'विश्लेषण' : 'Analysis'}
[Analyze the situation using the provided farm context, sensor data, and crop details]

### ${language === 'hi' ? 'सिफारिश' : 'Recommendation'}
[Provide actionable recommendations customized to this farm's records]

### ${language === 'hi' ? 'अगला कदम' : 'Next Action'}
[Specify the immediate next steps the farmer should take]`;

      console.log(`[AI Chat Flow] Prompt Context Length: ${farmContext.length}, Message: "${message}"`);

      const payload = {
        contents: [{ parts: [{ text: prompt }] }]
      };
      
      const replyText = await callGeminiRest(GEMINI_MODEL, payload, apiKey, "AI Assistant");
      console.log(`[Gemini Response]: "${replyText}"`);
      return replyText;
    }

    // --- Mock Fallback Mode (Only runs when AI_PROVIDER === 'mock') ---
    console.log(`[AI Chat Flow] Running mock fallback logic in "${language}"...`);
    if (language === 'hi') {
      return `### सारांश
एआई सहायक वर्तमान में सिमुलेशन मोड में है।

### विश्लेषण
मॉक मोड सक्रिय है। इन-मेमोरी डेटा स्थिर नमी स्तर और स्वस्थ फसल संकेतक दिखाता है।

### सिफारिश
अपने फार्म ट्विन के लाइव, संदर्भ-समृद्ध विश्लेषण को सक्रिय करने के लिए एक वैध GEMINI_API_KEY सेट करें।

### अगला कदम
पर्यावरण फ़ाइल में अपने API क्रेडेंशियल जोड़ें।`;
    }
    return `### Summary
The AI Assistant is currently in simulation mode.

### Analysis
Mock mode is active. In-memory data shows stable moisture levels and healthy crop indicators.

### Recommendation
Set up a valid GEMINI_API_KEY to activate live, context-rich analysis of your farm twin.

### Next Action
Add your API credentials to the environment file.`;
  },

  async translateReport(jsonData: any, targetLanguage: 'en' | 'hi'): Promise<any> {
    const provider = getAIProvider();
    if (provider === 'mock') {
      console.log(`[AI Translation] Mock translation mode active.`);
      return recursiveMockTranslate(jsonData, targetLanguage);
    }

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey || apiKey === 'MOCK_KEY') {
      console.log(`[AI Translation] Gemini Key is missing or mock, falling back to local translator.`);
      return recursiveMockTranslate(jsonData, targetLanguage);
    }

    const prompt = `You are a professional agricultural translator fluent in English and Hindi.
Your task is to translate all user-facing text fields (descriptions, symptoms, recommendations, summaries, action plans, etc.) in the provided JSON object from English to Hindi (or Hindi to English) as requested.

CRITICAL RULES:
1. Translate ONLY text values.
2. DO NOT translate, change, or modify:
   - Numbers (e.g. 5, 23.5, etc. - keep them in Western Arabic numerals)
   - Percentages (e.g. 95% - keep exactly)
   - Units (e.g. tons, kg, acres, mg/kg, %, °C, L, liters - keep exactly)
   - Coordinates (e.g. 38.5816° N, 121.4944° W)
   - Farm names, Crop names/IDs, Scientific names (e.g. "Sacramento Farm", "Solanum lycopersicum", "Maize", "Wheat")
   - Soil metrics, NPK values, pH levels, moisture percentages, temperatures (e.g. "pH 6.5", "Moisture 45%", "24°C", "NPK 80-40-150")
   - Dates (keep the date format exactly)
   - JSON keys (keep keys exactly identical to the input JSON).
3. The response must be a valid JSON object matching the exact schema of the input JSON, but with the values translated.

Input JSON to translate:
${JSON.stringify(jsonData, null, 2)}

Translate to: ${targetLanguage === 'hi' ? 'Hindi' : 'English'}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    };

    try {
      const resultText = await callGeminiRest(GEMINI_MODEL, payload, apiKey, "Translate AI Report");
      return JSON.parse(resultText || '{}');
    } catch (err) {
      console.error("[AI Translation] Error calling Gemini translator:", err);
      return recursiveMockTranslate(jsonData, targetLanguage);
    }
  }
};

function recursiveMockTranslate(obj: any, targetLanguage: 'en' | 'hi'): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return mockTranslateText(obj, targetLanguage);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => recursiveMockTranslate(item, targetLanguage));
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = recursiveMockTranslate(obj[key], targetLanguage);
      }
    }
    return newObj;
  }
  return obj;
}

const mockTranslationMap: Record<string, string> = {
  "Fall Armyworm Infestation": "फॉल आर्मीवर्म का प्रकोप",
  "Fall Armyworm": "फॉल आर्मीवर्म",
  "Early Blight (Alternaria solani)": "अगेती झुलसा रोग (अल्टरनेरिया सोलानी)",
  "Early Blight": "अगेती झुलसा रोग",
  "Alternaria solani": "अल्टरनेरिया सोलानी",
  "Late Blight (Phytophthora infestans)": "पछेती झुलसा रोग (फाइटोफ्थोरा इन्फेस्टन्स)",
  "Late Blight": "पछेती झुलसा रोग",
  "Phytophthora infestans": "फाइटोफ्थोरा इन्फेस्टन्स",
  "Leaf Curl": "पत्ती मुड़ना (लीफ कर्ल)",
  "Healthy Leaf Structure": "स्वस्थ पत्ती संरचना",
  "Healthy Leaf": "स्वस्थ पत्ती",
  "Root Rot": "जड़ सड़न",
  "Powdery Mildew": "पाउडर जैसी फफूंदी (पाउडरी मिल्ड्यू)",
  "Optimal": "इष्टतम",
  "Sub-optimal": "उप-इष्टतम",
  "Adequate": "पर्याप्त",
  "Deficient": "अपूर्ण / न्यून",
  "High": "उच्च",
  "Moderate": "मध्यम",
  "Low": "कम",
  "Normal": "सामान्य",
  "Dry": "सूखा",
  "Stable": "स्थिर",
  "None": "कोई नहीं",
  "Healthy": "स्वस्थ",
  "Fungal": "कवक",
  "Bacterial": "जीवाणु",
  "Viral": "विषाणु",
  "Favorable": "अनुकूल",
  "Unfavorable": "प्रतिकूल",
  "Yes": "हाँ",
  "No": "नहीं",
  "Root rot": "जड़ सड़न",
  "late blight": "अंगमारी रोग",
  "symptoms": "लक्षण",
  "causes": "कारण",
  "prevention": "रोकथाम",
  "treatment": "उपचार",
  "recommendation": "सिफारिश",
  "Expected Case": "अपेक्षित स्थिति",
  "Worst Case": "सबसे खराब स्थिति",
  "Best Case": "सर्वोत्तम स्थिति",
  "Historical Base": "ऐतिहासिक आधार",
  "AI Projected": "एॉई अनुमानित",
  "Nitrogen": "नाइट्रोजन",
  "Phosphorus": "फास्फोरस",
  "Potassium": "पोटेशियम",
  "Organic Carbon": "जैविक कार्बन",
  "Moisture": "नमी",
  "Sunlight": "धूप",
  "Executive Overview": "अवलोकन",
  "Yield Factors": "उपज कारक",
  "Economics & Scenarios": "आर्थिक विश्लेषण",
  "Agronomic Plans": "कृषि योजनाएं",
  "AI Explainability": "एआई स्पष्टीकरण",
};

function mockTranslateText(text: string, targetLanguage: 'en' | 'hi'): string {
  if (targetLanguage === 'en') {
    let translated = text;
    for (const [enKey, hiVal] of Object.entries(mockTranslationMap)) {
      translated = translated.replaceAll(hiVal, enKey);
    }
    translated = translated.replaceAll('टन प्रति एकड़', 'tons per acre');
    translated = translated.replaceAll('प्रति एकड़', 'per acre');
    translated = translated.replaceAll('टन', 'tons');
    translated = translated.replaceAll('एकड़', 'acres');
    return translated;
  }
  if (mockTranslationMap[text]) {
    return mockTranslationMap[text];
  }
  let translated = text;
  for (const [enKey, hiVal] of Object.entries(mockTranslationMap)) {
    const regex = new RegExp(`\\b${enKey}\\b`, 'gi');
    translated = translated.replace(regex, hiVal);
  }
  return translated;
}
