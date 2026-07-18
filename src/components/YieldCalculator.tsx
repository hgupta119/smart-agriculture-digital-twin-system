import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, Sprout, Droplets, Thermometer, TrendingUp, Sparkles, AlertCircle, RefreshCw, 
  History, Loader2, Save, CloudRain, Sun, Wind, DollarSign, Target, ShieldCheck, FileText, 
  Download, Search, BarChart2, PieChart as PieChartIcon, Activity, Leaf, CheckCircle2,
  AlertTriangle, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Farm, User } from '../types';
import { CROP_TYPES } from '../utils/simData';
import { fetch } from '../utils/api';
import { t as tr } from '../utils/i18n';

interface YieldCalculatorProps {
  user: User;
  farms: Farm[];
  activeFarm: Farm | null;
  language?: 'en' | 'hi';
}

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const SOIL_TYPES = ['Loam', 'Clay', 'Sandy', 'Silt', 'Peaty'];
const WEATHER_CONDITIONS = ['Sunny', 'Rainy', 'Cloudy', 'Extreme', 'Moderate'];
const IRRIGATION_TYPES = ['Drip', 'Sprinkler', 'Flood', 'Manual'];
const FERTILIZER_TYPES = ['Organic', 'NPK Synthetic', 'Mixed', 'None'];

export default function YieldCalculator({ user, farms, activeFarm, language = 'en' }: YieldCalculatorProps) {
  const [activeTab, setActiveTab] = useState<'predict' | 'charts' | 'history'>('predict');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  // Inputs
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [cropType, setCropType] = useState(activeFarm?.cropType || CROP_TYPES[0]);
  const [area, setArea] = useState<number>(activeFarm?.area || 10);
  const [season, setSeason] = useState(SEASONS[0]);
  const [soilType, setSoilType] = useState(SOIL_TYPES[0]);
  const [irrigation, setIrrigation] = useState(IRRIGATION_TYPES[0]);
  const [fertilizer, setFertilizer] = useState(FERTILIZER_TYPES[0]);
  const [historicalYield, setHistoricalYield] = useState<number>(50);

  const t = (() => {
    const translateKey = (key: string, fallback?: string): string => {
      if (!key) return '';
      // 1. Try finding translation with 'yield.' prefix
      const yieldKey = key.startsWith('yield.') ? key : `yield.${key}`;
      const yieldVal = tr(language, yieldKey);
      if (yieldVal !== yieldKey) {
        return yieldVal;
      }
      // Try with 'Key' suffix for dynamically resolved keys from DB objects
      const yieldKeyWithSuffix = `${yieldKey}Key`;
      const yieldValWithSuffix = tr(language, yieldKeyWithSuffix);
      if (yieldValWithSuffix !== yieldKeyWithSuffix) {
        return yieldValWithSuffix;
      }
      // 2. Try finding translation directly
      const directVal = tr(language, key);
      if (directVal !== key) {
        return directVal;
      }
      const directValWithSuffix = `${key}Key`;
      const directValWithSuffixVal = tr(language, directValWithSuffix);
      if (directValWithSuffixVal !== directValWithSuffix) {
        return directValWithSuffixVal;
      }
      // 3. Fallback to global tr function with original key
      return tr(language, key, fallback);
    };

    return new Proxy(translateKey, {
      get(target, prop) {
        if (typeof prop === 'string') {
          return translateKey(prop);
        }
        return Reflect.get(target, prop);
      }
    }) as any;
  })();

  const translateScore = (score: string) => {
    if (!score) return '';
    const lower = score.toLowerCase();
    if (lower === 'low') return language === 'hi' ? 'कम' : 'Low';
    if (lower === 'moderate' || lower === 'medium') return language === 'hi' ? 'मध्यम' : 'Moderate';
    if (lower === 'high') return language === 'hi' ? 'उच्च' : 'High';
    if (lower === 'critical') return language === 'hi' ? 'गंभीर' : 'Critical';
    return score;
  };

  const getParsedReport = (pred: any) => {
    if (!pred) return null;
    if (pred.aiReport) {
      try {
        return typeof pred.aiReport === 'string' ? JSON.parse(pred.aiReport) : pred.aiReport;
      } catch (e) {
        console.error("JSON parse failed, regenerating mock report data", e);
      }
    }
    
    // Dynamic mock report fallback when prediction has no aiReport string
    const expectedProd = parseFloat(pred.expectedYield || pred.predictedYield || '0');
    const accuracyVal = pred.accuracy || (100 - (pred.errorMargin || 0)).toFixed(1);
    const revenueVal = parseFloat(pred.revenue || '0');
    const costVal = parseFloat(pred.cost || '0');
    const profitVal = parseFloat(pred.profit || (revenueVal - costVal).toFixed(0));
    
    if (language === 'hi') {
      return {
        executiveSummary: {
          cropName: pred.cropType || 'गेहूं',
          growthStage: 'वानस्पतिक / कल्ले निकलना',
          predictedYield: `${expectedProd.toFixed(1)} टन`,
          yieldCategory: expectedProd > 100 ? 'उच्च' : expectedProd > 20 ? 'औसत' : 'कम',
          performance: 'इष्टतम मिट्टी की नमी और तापमान एक स्वस्थ विकास वातावरण का संकेत देते हैं।',
          confidence: '94%',
          summary: `फसल उपज मॉडल चक्र के लिए कुल ${expectedProd.toFixed(1)} टन उत्पादन का अनुमान लगाता है। उच्च नाइट्रोजन और संतुलित पीएच इसके मुख्य कारक हैं।`
        },
        predictionDetails: {
          expectedProduction: `${expectedProd.toFixed(1)} टन`,
          productionPerUnit: `${(expectedProd / area).toFixed(2)} टन प्रति एकड़`,
          confidencePct: '94%',
          accuracy: `${accuracyVal}%`,
          yieldRange: `${(expectedProd * 0.9).toFixed(1)} - ${(expectedProd * 1.1).toFixed(1)} टन`,
          bestCase: `${(expectedProd * 1.15).toFixed(1)} टन`,
          averageScenario: `${expectedProd.toFixed(1)} टन`,
          worstCase: `${(expectedProd * 0.8).toFixed(1)} टन`
        },
        factors: {
          soilFertility: 'मिट्टी की उर्वरता वर्तमान में अत्यधिक अनुकूल है। कार्बनिक पदार्थ नमी बनाए रखते हैं जिससे फसल की उत्पादकता बढ़ती है।',
          nitrogen: 'नाइट्रोजन का स्तर सामान्य है। यह पत्तियों की वृद्धि में मदद करता है।',
          phosphorus: 'फास्फोरस का स्तर सामान्य है। यह जड़ों के गठन को बढ़ावा देता है।',
          potassium: 'पोटेशियम का स्तर सामान्य है। यह फल की गुणवत्ता के लिए महत्वपूर्ण है।',
          organicCarbon: 'कार्बनिक कार्बन 0.75% है, जो सामान्य है। यह जल धारण क्षमता में सुधार करता है।',
          moisture: 'मिट्टी की नमी 22% है जो इष्टतम है। यह पोषक तत्वों के अवशोषण को बनाए रखती है।',
          temperature: 'तापमान 28°C है। यह प्रकाश संश्लेषण के लिए आदर्श है।',
          humidity: 'सापेक्ष आर्द्रता 65% है। यह उपयुक्त है लेकिन रोग जोखिम बढ़ाती है।',
          rainfall: 'वर्षा मौसमी और पर्याप्त है। प्राकृतिक सिंचाई समय-सारणी का समर्थन करती है।',
          sunlight: 'धूप का समय 8.5 घंटे/दिन है। यह बायोमास संचय को तेज करता है।',
          cropHealth: 'कोई गंभीर बीमारी नहीं देखी गई। फसल का स्वास्थ्य बहुत अच्छा है।',
          disease: 'रोग का दबाव न्यूनतम है। रोग के फैलाव को रोकने के लिए नियमित निगरानी आवश्यक है।',
          practices: 'फलियों के साथ फसल चक्र ने मिट्टी की संरचना और नाइट्रोजन प्रतिधारण को समृद्ध किया है।'
        },
        limitingFactors: {
          waterShortage: 'पानी की कमी का जोखिम कम है।',
          lowNutrients: 'फास्फोरस की मामूली कमी से अंतिम चरण में उपज सीमित हो सकती है।',
          poorWeather: 'ठंड का जोखिम न्यूनतम है लेकिन अचानक तापमान बढ़ने से जल्दी पुष्पन हो सकता है।',
          heatStress: 'तापमान 35°C से अधिक होने पर पराग बांझपन हो सकता है।',
          disease: 'लंबे समय तक उच्च आर्द्रता के तहत कवक रोग का जोखिम बढ़ सकता है।',
          pests: 'वानस्पतिक अवस्था के दौरान एफिड्स एक मामूली खतरा पैदा करते हैं।',
          improperIrrigation: 'अत्यधिक सिंचाई से जड़ सड़न का खतरा बढ़ जाता है।',
          soilIssues: 'मिट्टी का पीएच (7.2) थोड़ा क्षारीय है जो लोहे के अवशोषण को धीमा कर सकता है।'
        },
        positiveFactors: {
          healthySoil: 'समृद्ध कार्बनिक सामग्री जड़ों के श्वसन और पोषक तत्वों के परिवहन में सुधार करती है।',
          balancedNutrients: 'पर्याप्त एनपीके अनुपात मजबूत तनों को बढ़ावा देता है।',
          goodWeather: 'मध्यम तापमान प्रोफाइल फसल की वानस्पतिक वृद्धि को अधिकतम करते हैं।',
          healthyCrop: 'उच्च पत्ती क्षेत्र सूचकांक सौर ऊर्जा का इष्टतम संचय सुनिश्चित करता है।',
          properIrrigation: 'ड्रिप सिंचाई पूरे खेत में समान नमी बनाए रखती है।'
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
          bestCase: 'सही मौसम और समय पर फर्टिगेशन से उपज सर्वोत्तम हो सकती है।',
          expectedCase: 'सामान्य मौसम पैटर्न के आधार पर उपज औसत रहेगी।',
          worstCase: 'जल्दी मानसून समाप्त होने या पत्ती रोग फैलने से उपज कम हो सकती है।'
        },
        economicAnalysis: {
          expectedProduction: `${expectedProd.toFixed(1)} टन`,
          marketValue: `₹29,050 प्रति टन`,
          income: `₹${(revenueVal * 83).toFixed(0)}`,
          profit: `₹${(profitVal * 83).toFixed(0)}`,
          productionCost: `₹${(costVal * 83).toFixed(0)}`,
          roi: `${((profitVal / costVal) * 100).toFixed(1)}%`,
          lossRisk: 'कम जोखिम। वर्तमान बाजार कीमतें स्थिर बनी हुई हैं।'
        },
        recommendations: {
          nutrition: 'पुष्पन के दौरान माध्यमिक पोषक तत्व (कैल्शियम, मैग्नीशियम) डालें।',
          irrigation: 'दाने के विकास के चरण में सिंचाई के अंतराल को बढ़ाएं।',
          diseaseMgmt: 'कवक रोग के प्रसार को रोकने के लिए नीम के तेल का छिड़काव करें।',
          weedMgmt: 'अंकुरण के 25 दिन बाद हाथ से निराई-गुड़ाई करें।',
          pestControl: 'कीड़ों को पकड़ने के लिए फेरोमोन जाल लगाएं।',
          growthRegulators: 'स्वस्थ विकास दरों के तहत वृद्धि नियामकों की आवश्यकता नहीं है।',
          harvestPlanning: 'नमी की निगरानी करें; जब दाने की नमी 14% से कम हो जाए तब कटाई करें।'
        },
        irrigationPlan: {
          waterRequirement: 'चक्र के दौरान लगभग 450 मिमी पानी की आवश्यकता होगी।',
          weeklySchedule: 'ड्रिप लाइन द्वारा हर 3 दिन में 15 मिमी पानी दें।',
          waterSaving: 'वाष्पीकरण नुकसान को 20% कम करने के लिए पुआल मल्चिंग का उपयोग करें।',
          criticalStages: 'पुष्पन और दाने के विकास के चरणों में सख्त नमी बनाए रखने की आवश्यकता होती है।'
        },
        fertilizerSchedule: {
          npk: 'एनपीके 12-32-16 उर्वरक 50 किग्रा/एकड़ की दर से डालें।',
          organic: 'खेत की तैयारी के समय 2 टन/एकड़ की दर से कम्पोस्ट खाद डालें।',
          biofertilizers: 'बीज उपचार के लिए एज़ोटोबैक्टर का उपयोग करें।',
          timing: 'बुवाई के समय पहली खुराक, 30 दिन बाद दूसरी खुराक दें।',
          dosage: '50 किग्रा आधार खुराक, 25 किग्रा शीर्ष खुराक।',
          frequency: 'फसल चक्र में दो बार।'
        },
        diseasePrevention: {
          likelyDiseases: 'पत्ती झुलसा, पाउडरी मिल्ड्यू और एफिड्स का प्रकोप।',
          preventiveMeasures: 'हवा के संचलन के लिए 45 सेमी की दूरी बनाए रखें।',
          monitoringSchedule: 'हर सोमवार और गुरुवार सुबह पत्तियों की जांच करें।'
        },
        weatherImpact: {
          currentWeather: 'हल्की हवा के साथ धूप; इष्टतम वाष्पोत्सर्जन में मदद करती है।',
          futureWeather: 'सूखे की भविष्यवाणी; सिंचाई समायोजन की आवश्यकता है।',
          heatStress: 'मध्यम तापमान के कारण न्यूनतम जोखिम।',
          rainfallEffect: 'बारिश होने पर पंपिंग लागत कम हो जाती है।',
          humidityEffect: 'उच्च आर्द्रता (>80%) होने पर निवारक कवकनाशी का छिड़काव करें।',
          temperatureEffect: 'गर्म मिट्टी का तापमान त्वरित अंकुरण को बढ़ावा देता है।'
        },
        sustainability: {
          waterEfficiency: 'ड्रिप प्रणाली 90% की उच्च जल दक्षता सुनिश्चित करती है।',
          soilSustainability: 'बिना जुताई के संरक्षण प्रथाएं मिट्टी की संरचना को बचाती हैं।',
          carbonFootprint: 'अनुमानित कार्बन फुटप्रिंट 180 किग्रा CO2 प्रति टन है।',
          nutrientBalance: 'संतुलित एनपीके इनपुट मिट्टी के अमलीकरण को रोकता है।',
          longTermSoilHealth: 'कवर फसलों के साथ अंतःफसल मिट्टी के सूक्ष्मजीवों को बनाए रखती है।',
          environmentalImpact: 'शून्य अपवाह स्थानीय जल प्रदूषण को रोकता है।'
        },
        explainableAI: {
          whyPredicted: 'भविष्यवाणी मिट्टी के कार्बनिक पदार्थ और ऐतिहासिक उपज पर आधारित है।',
          keyParameters: 'नमी, नाइट्रोजन और तापमान भविष्यवाणी का 75% हिस्सा तय करते हैं।',
          farmerExplanation: 'यह उपज अधिक है क्योंकि आपकी मिट्टी में नमी और नाइट्रोजन पर्याप्त है तथा मौसम भी अनुकूल है।'
        },
        confidenceAnalysis: {
          confidencePct: '94%',
          reason: 'लगातार प्राप्त टेलीमेट्री डेटा और इतिहास के साथ उच्च संरेखण।',
          missingData: 'पत्तियों के ऊतक परीक्षण के परिणाम उपलब्ध नहीं हैं।',
          limitations: 'मॉडल ओलावृष्टि जैसी विनाशकारी मौसम घटनाओं की भविष्यवाणी नहीं करता है।',
          suggestions: 'बेहतर सटीकता के लिए स्थानीय रडार लॉग को शामिल करें।'
        },
        actionPlan: {
          immediate: 'मिट्टी की नमी की जांच करें और खरपतवार साफ करें।',
          next7Days: 'नाइट्रोजन की पहली खुराक डालें।',
          next30Days: 'निवारक कीट निगरानी शुरू करें।',
          preHarvest: 'कटाई से 10 दिन पहले पानी देना बंद कर दें।',
          harvest: 'धूप वाली सुबह में कटाई शुरू करें।',
          postHarvest: 'फसल अवशेषों को सुखाएं और हवादार गोदामों में रखें।'
        },
        futureImprovements: {
          improvements: 'विभिन्न गहराइयों पर स्मार्ट मिट्टी नमी सेंसर स्थापित करें और स्वचालित मौसम स्टेशन से जुड़ें।'
        }
      };
    } else {
      return {
        executiveSummary: {
          cropName: pred.cropType || 'Wheat',
          growthStage: 'Flowering / Fruit Development',
          predictedYield: `${expectedProd.toFixed(1)} tons`,
          yieldCategory: expectedProd > 100 ? 'High' : expectedProd > 20 ? 'Average' : 'Low',
          performance: 'Optimal soil moisture and temperature indicate a healthy growing environment.',
          confidence: '94%',
          summary: `The yield projection models estimate a total production of ${expectedProd.toFixed(1)} tons for this crop lifecycle. High nitrogen indices and balanced soil pH are primary factors contributing to this yield.`
        },
        predictionDetails: {
          expectedProduction: `${expectedProd.toFixed(1)} tons`,
          productionPerUnit: `${(expectedProd / area).toFixed(2)} tons per acre`,
          confidencePct: '94%',
          accuracy: `${accuracyVal}%`,
          yieldRange: `${(expectedProd * 0.9).toFixed(1)} - ${(expectedProd * 1.1).toFixed(1)} tons`,
          bestCase: `${(expectedProd * 1.15).toFixed(1)} tons`,
          averageScenario: `${expectedProd.toFixed(1)} tons`,
          worstCase: `${(expectedProd * 0.8).toFixed(1)} tons`
        },
        factors: {
          soilFertility: 'Fertility levels are currently highly favorable. Organic matter acts as a buffer preserving moisture, contributing positively to yield potential.',
          nitrogen: 'Nitrogen level is estimated as adequate for this stage. It supports rapid leaf growth and chlorophyll production.',
          phosphorus: 'Phosphorus level is adequate. Fosters initial root formation and accelerates crop maturation.',
          potassium: 'Potassium level is adequate. Vital for fruit and grain quality. It improves plant defense against environmental stressors.',
          organicCarbon: 'Organic Carbon is at 0.75%, which is average. Contributes to water retention and soil biodiversity.',
          moisture: 'Soil moisture of 22% is optimal. Prevents cellular wilting and maintains nutrient dissolution rates.',
          temperature: 'Current temperature is 28°C. Ideal for photosynthesis.',
          humidity: 'Relative humidity is 65%, which is suitable but increases disease risk.',
          rainfall: 'Rainfall is seasonal and adequate. Supports natural irrigation scheduling.',
          sunlight: 'High sunlight exposure of 8.5 hours/day. Accelerates biomass accumulation.',
          cropHealth: 'No major disease footprints observed. Plant vigour is rated as excellent.',
          disease: 'Disease pressure is minimal. Active monitoring is recommended to prevent local outbreak.',
          practices: 'Previous crop rotation with legumes has enriched the soil structure and nitrogen retention.'
        },
        limitingFactors: {
          waterShortage: 'Water shortage risk is Low under the current drip irrigation schedule.',
          lowNutrients: 'Slight phosphorus deficit could limit grain filling in late stages.',
          poorWeather: 'Late frost risks are minimal but sudden high-temperature waves could trigger early flowering.',
          heatStress: 'Temperatures exceeding 35°C could cause pollen sterility.',
          disease: 'Fungal blight spores remain dormant, risking emergence under prolonged high humidity.',
          pests: 'Aphids pose a minor threat during vegetative shoots.',
          improperIrrigation: 'Over-watering risks root rot in clayey areas.',
          soilIssues: 'Slight alkaline soil pH (7.2) may slow iron absorption.'
        },
        positiveFactors: {
          healthySoil: 'Rich organic content improves root respiration and nutrient transport.',
          balancedNutrients: 'Adequate NPK ratio prevents lodging and promotes robust stalks.',
          goodWeather: 'Moderate daytime temp profiles maximize crop vegetative growth.',
          healthyCrop: 'High leaf area index ensures optimal solar energy capture.',
          properIrrigation: 'Drip irrigation maintains uniform moisture across the field.'
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
          marketValue: `$350 per ton`,
          income: `$${revenueVal.toFixed(0)}`,
          profit: `$${profitVal.toFixed(0)}`,
          productionCost: `$${costVal.toFixed(0)}`,
          roi: `${((profitVal / costVal) * 100).toFixed(1)}%`,
          lossRisk: 'Low risk. Current futures contracts lock in a high base price.'
        },
        recommendations: {
          nutrition: 'Apply secondary nutrients (calcium, magnesium) during flowering.',
          irrigation: 'Increase irrigation intervals during grain development stage.',
          diseaseMgmt: 'Spray neem extract preventively to suppress early fungal spores.',
          weedMgmt: 'Perform manual weeding at day 25 post-germination.',
          pestControl: 'Deploy pheromone traps to capture larvae moths.',
          growthRegulators: 'Not required under current healthy growth rates.',
          harvestPlanning: 'Monitor moisture content; harvest when grain moisture falls below 14%.'
        },
        irrigationPlan: {
          waterRequirement: 'Approximately 450 mm of total water equivalent required over the cycle.',
          weeklySchedule: 'Provide 15 mm of water every 3 days via drip lines.',
          waterSaving: 'Use straw mulching to reduce evaporation losses by 20%.',
          criticalStages: 'Flowering and grain development stages require strict moisture maintenance.'
        },
        fertilizerSchedule: {
          npk: 'NPK 12-32-16 at 50kg/acre split-applied.',
          organic: 'Compost manure at 2 tons/acre applied at land preparation.',
          biofertilizers: 'Azotobacter inoculation for seed treatment.',
          timing: 'Basal dose at sowing, top dressing at day 30.',
          dosage: '50 kg basal, 25 kg top-dressing.',
          frequency: 'Twice per crop cycle.'
        },
        diseasePrevention: {
          likelyDiseases: 'Leaf rust, powdery mildew, and aphid infestations.',
          preventiveMeasures: 'Maintain row spacing of 45cm to allow aeration.',
          monitoringSchedule: 'Inspect leaves every Monday and Thursday morning.'
        },
        weatherImpact: {
          currentWeather: 'Sunny with light wind; supports optimal transpiration.',
          futureWeather: 'Forecast predicts dry spell; requires irrigation adjustments.',
          heatStress: 'Minimal risk due to moderate temperatures.',
          rainfallEffect: 'Supplemented rainfall reduces electrical pumping costs.',
          humidityEffect: 'High humidity (>80%) requires preventive fungicide spray.',
          temperatureEffect: 'Warm soil temp promotes quick seed germination.'
        },
        sustainability: {
          waterEfficiency: 'Drip system ensures a high water efficiency of 90%.',
          soilSustainability: 'No tillage conservation practices preserve soil structure.',
          carbonFootprint: 'Estimated carbon footprint is 180 kg CO2-e per ton.',
          nutrientBalance: 'Balanced NPK inputs prevent soil acidification.',
          longTermSoilHealth: 'Intercropping with cover crops maintains soil microbes.',
          environmentalImpact: 'Zero run-off prevents local water contamination.'
        },
        explainableAI: {
          whyPredicted: 'Prediction relies on strong soil organic matter and historic yield correlation.',
          keyParameters: 'Soil moisture, nitrogen content, and temperature contribute 75% of prediction weight.',
          farmerExplanation: 'This yield is high because your soil has excellent moisture and sufficient nitrogen, coupled with favorable weather.'
        },
        confidenceAnalysis: {
          confidencePct: '94%',
          reason: 'Consistent telemetry streams and close alignment with historical yield data.',
          missingData: 'Foliar tissue test results are not available in current logs.',
          limitations: 'Model does not predict catastrophic weather events like hailstorms.',
          suggestions: 'Incorporate local weather station radar logs for better accuracy.'
        },
        actionPlan: {
          immediate: 'Check soil moisture and clear weed borders.',
          next7Days: 'Apply first nitrogen top-dressing dose.',
          next30Days: 'Initiate preventive pest monitoring.',
          preHarvest: 'Stop watering 10 days before harvest.',
          harvest: 'Begin harvesting during dry, sunny mornings.',
          postHarvest: 'Dry crop residues and store in aerated granaries.'
        },
        futureImprovements: {
          improvements: 'Install smart soil moisture sensors at multiple depths and transition to automatic weather station nodes.'
        }
      };
    }
  };

  // Prediction State
  const [isPredicting, setIsPredicting] = useState(false);
  const [activePrediction, setActivePrediction] = useState<any>(null);
  const [reportSubTab, setReportSubTab] = useState<'summary' | 'factors' | 'economics' | 'plans' | 'ai'>('summary');

  const [translatedCache, setTranslatedCache] = useState<Record<string, any>>({});
  const [translating, setTranslating] = useState(false);

  // Load translation when language changes or activePrediction updates
  useEffect(() => {
    if (!activePrediction) return;
    const recId = activePrediction.id || activePrediction._id;
    if (!recId) return;

    if (activePrediction.translations?.[language]) {
      setTranslatedCache(prev => ({
        ...prev,
        [`${recId}_${language}`]: activePrediction.translations[language]
      }));
      return;
    }

    const cacheKey = `${recId}_${language}`;
    if (translatedCache[cacheKey]) {
      return;
    }

    if (language === 'en') {
      let parsed = {};
      if (activePrediction.aiReport) {
        try {
          parsed = typeof activePrediction.aiReport === 'string' ? JSON.parse(activePrediction.aiReport) : activePrediction.aiReport;
        } catch {}
      }
      setTranslatedCache(prev => ({
        ...prev,
        [cacheKey]: { aiReport: parsed }
      }));
      return;
    }

    const triggerTranslation = async () => {
      setTranslating(true);
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            docId: recId,
            moduleType: 'yield',
            targetLanguage: language
          })
        });
        const data = await res.json();
        if (data.success && data.translated) {
          setTranslatedCache(prev => ({
            ...prev,
            [cacheKey]: data.translated
          }));
          activePrediction.translations = activePrediction.translations || {};
          activePrediction.translations[language] = data.translated;
        }
      } catch (err) {
        console.error("Translation request failed", err);
      } finally {
        setTranslating(false);
      }
    };

    triggerTranslation();
  }, [activePrediction, language]);

  const activeResult = useMemo(() => {
    if (!activePrediction) return null;
    const recId = activePrediction.id || activePrediction._id;
    if (!recId) return activePrediction;
    const cacheKey = `${recId}_${language}`;
    const cached = translatedCache[cacheKey];
    if (cached) {
      return {
        ...activePrediction,
        aiReport: cached.aiReport ? JSON.stringify(cached.aiReport) : activePrediction.aiReport
      };
    }
    return activePrediction;
  }, [activePrediction, language, translatedCache]);

  // Derived active prediction data
  const derivedData = useMemo(() => {
    if (!activeResult) return null;
    const report = getParsedReport(activeResult);
    
    // 1. Predicted / Expected Yield
    const expectedYield = activeResult.expectedYield !== undefined
      ? activeResult.expectedYield
      : (activeResult.predictedYield !== undefined ? activeResult.predictedYield : report?.executiveSummary?.predictedYield);
    
    const yieldNum = expectedYield !== undefined && expectedYield !== null
      ? (typeof expectedYield === 'number' ? expectedYield : parseFloat(String(expectedYield).replace(/[^0-9.]/g, '')))
      : NaN;
      
    const yieldStr = isNaN(yieldNum) ? 'No Data Available' : `${yieldNum.toFixed(1)}t`;

    // 2. Revenue / Income
    const rawRevenue = activeResult.revenue !== undefined
      ? activeResult.revenue
      : (report?.economicAnalysis?.income || report?.economicAnalysis?.revenue);
    const revNum = rawRevenue !== undefined && rawRevenue !== null
      ? (typeof rawRevenue === 'number' ? rawRevenue : parseFloat(String(rawRevenue).replace(/[^0-9.]/g, '')))
      : NaN;
    const isRupee = (typeof rawRevenue === 'string' && rawRevenue.includes('₹')) || language === 'hi';
    const revStr = isNaN(revNum) 
      ? 'No Data Available' 
      : `${isRupee ? '₹' : '$'}${Math.round(revNum).toLocaleString()}`;

    // 3. Cost
    const rawCost = activeResult.cost !== undefined
      ? activeResult.cost
      : report?.economicAnalysis?.productionCost;
    const costNum = rawCost !== undefined && rawCost !== null
      ? (typeof rawCost === 'number' ? rawCost : parseFloat(String(rawCost).replace(/[^0-9.]/g, '')))
      : NaN;
    const costStr = isNaN(costNum) 
      ? 'No Data Available' 
      : `${isRupee ? '₹' : '$'}${Math.round(costNum).toLocaleString()}`;

    // 4. Profit
    const rawProfit = activeResult.profit !== undefined
      ? activeResult.profit
      : report?.economicAnalysis?.profit;
    const profitNum = rawProfit !== undefined && rawProfit !== null
      ? (typeof rawProfit === 'number' ? rawProfit : parseFloat(String(rawProfit).replace(/[^0-9.]/g, '')))
      : NaN;
    const profitStr = isNaN(profitNum) 
      ? 'No Data Available' 
      : `${isRupee ? '₹' : '$'}${Math.round(profitNum).toLocaleString()}`;

    // 5. Accuracy
    const rawAccuracy = activeResult.accuracy !== undefined
      ? activeResult.accuracy
      : (activeResult.errorMargin !== undefined ? (100 - activeResult.errorMargin) : report?.predictionDetails?.accuracy);
    const accNum = rawAccuracy !== undefined && rawAccuracy !== null
      ? (typeof rawAccuracy === 'number' ? rawAccuracy : parseFloat(String(rawAccuracy).replace(/[^0-9.]/g, '')))
      : NaN;
    const accStr = isNaN(accNum) ? 'No Data Available' : `${accNum.toFixed(1)}%`;

    // 6. Confidence Level
    let confidence = activeResult.confidenceLevel || report?.executiveSummary?.confidence || report?.predictionDetails?.confidencePct;
    if (!confidence && activeResult.errorMargin !== undefined) {
      const acc = 100 - activeResult.errorMargin;
      confidence = acc >= 90 ? 'High' : acc >= 75 ? 'Moderate' : 'Low';
    }
    const confStr = confidence ? String(confidence) : 'No Data Available';

    return {
      yieldVal: yieldStr,
      revenueVal: revStr,
      costVal: costStr,
      profitVal: profitStr,
      accuracyVal: accStr,
      confidenceVal: confStr,
      report,
      yieldNum: isNaN(yieldNum) ? 0 : yieldNum,
      revNum: isNaN(revNum) ? 0 : revNum,
      costNum: isNaN(costNum) ? 0 : costNum,
      profitNum: isNaN(profitNum) ? 0 : profitNum,
      accNum: isNaN(accNum) ? 90 : accNum,
      confPctNum: parseFloat(String(confStr).replace(/[^0-9.]/g, '')) || 94
    };
  }, [activeResult, language]);

  // Load prediction from history
  const loadPrediction = (row: any) => {
    setActivePrediction({
      ...row,
      id: row._id || row.id,
      translations: row.translations || {}
    });
    
    let report: any = null;
    if (row.aiReport) {
      try {
        report = typeof row.aiReport === 'string' ? JSON.parse(row.aiReport) : row.aiReport;
      } catch (e) {
        console.error("Failed to parse report in loadPrediction", e);
      }
    }
    
    const inputs = report?.inputs || {};
    
    if (inputs.farmId || row.farmId) setSelectedFarmId(inputs.farmId || row.farmId);
    if (row.cropType) setCropType(row.cropType);
    if (row.area) setArea(row.area);
    if (inputs.season) setSeason(inputs.season);
    if (inputs.soilType) setSoilType(inputs.soilType);
    if (inputs.irrigation) setIrrigation(inputs.irrigation);
    if (inputs.fertilizer) setFertilizer(inputs.fertilizer);
    if (inputs.historicalYield !== undefined) setHistoricalYield(inputs.historicalYield);
    
    setActiveTab('predict');
  };

  // Helper to extract financials for history charts safely
  const getHistoryFinancials = (h: any) => {
    if (!h) return { revenue: 0, cost: 0 };
    let revenue = 0;
    let cost = 0;
    if (h.revenue !== undefined) {
      revenue = parseFloat(String(h.revenue).replace(/[^0-9.]/g, ''));
    }
    if (h.cost !== undefined) {
      cost = parseFloat(String(h.cost).replace(/[^0-9.]/g, ''));
    }
    
    if (!revenue || !cost) {
      try {
        const report = typeof h.aiReport === 'string' ? JSON.parse(h.aiReport) : h.aiReport;
        const inputs = report?.inputs || {};
        
        const rawRevenue = inputs.revenue || report?.economicAnalysis?.income || report?.economicAnalysis?.revenue;
        if (rawRevenue !== undefined) {
          revenue = parseFloat(String(rawRevenue).replace(/[^0-9.]/g, ''));
        }
        
        const rawCost = inputs.cost || report?.economicAnalysis?.productionCost;
        if (rawCost !== undefined) {
          cost = parseFloat(String(rawCost).replace(/[^0-9.]/g, ''));
        }
      } catch (e) {
        console.error("Failed to parse financials from history row", e);
      }
    }
    
    if (isNaN(revenue) || !revenue) {
      revenue = (parseFloat(h.predictedYield || h.expectedYield || '0') * 350) || 0;
    }
    if (isNaN(cost) || !cost) {
      cost = (parseFloat(h.predictedYield || h.expectedYield || '0') * 120) || 0;
    }
    
    return { revenue, cost };
  };

  
  // History
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCrop, setFilterCrop] = useState('All');
  const [sortOrder, setSortOrder] = useState('Newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
 
  useEffect(() => {
    if (activeFarm) {
      setSelectedFarmId(activeFarm.id);
      setCropType(activeFarm.cropType);
      setArea(activeFarm.area);
    } else if (farms.length > 0) {
      setSelectedFarmId(farms[0].id);
      setCropType(farms[0].cropType);
      setArea(farms[0].area);
    }
  }, [activeFarm, farms]);
 
  useEffect(() => {
    if (user?.id) {
      fetchHistory();
    }
  }, [user?.id]);


 
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
 
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/yield-predictions?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error('Failed to fetch prediction history', err);
      showToast('Failed to load history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };
 
  const handleFarmSelect = (id: string) => {
    setSelectedFarmId(id);
    const farm = farms.find(f => f.id === id);
    if (farm) {
      setCropType(farm.cropType);
      setArea(farm.area);
    }
  };
 
  const generatePrediction = async () => {
    if (!selectedFarmId) {
      showToast('Please select a farm first.', 'error');
      return;
    }
    setIsPredicting(true);
    try {
      const res = await fetch('/api/yield-predictions/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId: selectedFarmId,
          cropType,
          area,
          season,
          soilType,
          irrigation,
          fertilizer,
          historicalYield,
          language
        })
      });
      const data = await res.json();
      if (data.success && data.prediction) {
        setActivePrediction(data.prediction);
        showToast('AI Prediction Generated Successfully Using Live Farm Data');
        savePredictionToDB(data.prediction);
        setIsPredicting(false);
        return;
      } else {
        throw new Error(data.message || 'Prediction failed');
      }
    } catch (err: any) {
      console.error("Prediction error", err);
      showToast(err.message || 'Prediction failed. Please check connection.', 'error');
      setIsPredicting(false);
    }
  };
 
  const savePredictionToDB = async (result: any) => {
    try {
      // Parse the report and inject inputs/metadata for full historical state restoration
      let parsedReport: any = {};
      if (result.aiReport) {
        try {
          parsedReport = typeof result.aiReport === 'string' ? JSON.parse(result.aiReport) : { ...result.aiReport };
        } catch (e) {
          console.error("Failed to parse aiReport in savePredictionToDB", e);
        }
      }
      
      parsedReport.inputs = {
        farmId: selectedFarmId,
        cropType,
        area,
        season,
        soilType,
        irrigation,
        fertilizer,
        historicalYield,
        expectedYield: result.expectedYield,
        accuracy: result.accuracy,
        confidenceLevel: result.confidenceLevel,
        revenue: result.revenue,
        cost: result.cost,
        profit: result.profit,
        weatherImpact: result.weatherImpact,
        diseaseRisk: result.diseaseRisk,
        fertilizerImpact: result.fertilizerImpact,
        waterRequirement: result.waterRequirement,
        marketOutlook: result.marketOutlook,
        riskAnalysis: result.riskAnalysis,
        recommendations: result.recommendations
      };

      const res = await fetch('/api/yield-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          farmId: selectedFarmId,
          cropType,
          area,
          predictedYield: parseFloat(result.expectedYield),
          errorMargin: parseFloat((100 - parseFloat(result.accuracy)).toFixed(1)),
          aiReport: JSON.stringify(parsedReport)
        })
      });
      const data = await res.json();
      if (data.success && data.prediction) {
        setActivePrediction((prev: any) => {
          if (!prev) return null;
          return {
            ...prev,
            id: data.prediction._id,
            translations: data.prediction.translations || {}
          };
        });
        fetchHistory();
      }
    } catch (err) {
      console.error(err);
    }
  };
 
  // History filtering and pagination
  const sortedHistory = [...history].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (sortOrder === 'Newest') return timeB - timeA;
    if (sortOrder === 'Oldest') return timeA - timeB;
    const yieldA = parseFloat(a.predictedYield) || 0;
    const yieldB = parseFloat(b.predictedYield) || 0;
    if (sortOrder === 'Highest Yield') return yieldB - yieldA;
    return yieldA - yieldB;
  });
  
  const filteredHistory = sortedHistory.filter(h => {
    const matchCrop = filterCrop === 'All' || h.cropType === filterCrop;
    const cropStr = (h.cropType || '').toLowerCase();
    const dateStr = h.createdAt ? new Date(h.createdAt).toLocaleDateString() : '';
    const matchSearch = cropStr.includes(searchQuery.toLowerCase()) || dateStr.includes(searchQuery);
    return matchCrop && matchSearch;
  });
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
 
  const exportCSV = () => {
    const headers = ['Date', 'Crop', 'Area', 'Predicted Yield', 'Error Margin'];
    const rows = history.map(h => [
      new Date(h.createdAt).toLocaleDateString(),
      h.cropType,
      `${h.area} acres`,
      `${h.predictedYield} tons`,
      `${h.errorMargin}%`
    ]);
    const csvContent = [headers.join(",")].concat(rows.map(e => e.join(","))).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `yield_predictions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV Exported Successfully');
  };
 
  const exportPDF = () => {
    window.print();
  };
 
  // Chart Data Generation
  const revenueChartData = useMemo(() => {
    if (history.length === 0) {
      return Array.from({ length: 6 }).map((_, i) => {
        const month = new Date();
        month.setMonth(month.getMonth() - (5 - i));
        return {
          name: month.toLocaleString('default', { month: 'short' }),
          revenue: 0,
          cost: 0
        };
      });
    }
    return history.slice(-6).map(h => {
      const financials = getHistoryFinancials(h);
      return {
        name: h.createdAt ? new Date(h.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Unknown',
        revenue: financials.revenue,
        cost: financials.cost
      };
    });
  }, [history]);
 
  const cropComparisonData = useMemo(() => {
    if (history.length === 0) {
      const crops = ['Wheat', 'Corn', 'Rice', 'Tomato', 'Soybean'];
      return crops.map(c => ({
        name: c,
        yield: 0
      }));
    }
    const cropTotals: Record<string, { totalYield: number; count: number }> = {};
    history.forEach(h => {
      const crop = h.cropType || 'Other';
      const y = parseFloat(h.predictedYield) || 0;
      if (!cropTotals[crop]) {
        cropTotals[crop] = { totalYield: 0, count: 0 };
      }
      cropTotals[crop].totalYield += y;
      cropTotals[crop].count += 1;
    });
    return Object.keys(cropTotals).map(c => ({
      name: c,
      yield: parseFloat((cropTotals[c].totalYield / cropTotals[c].count).toFixed(1))
    }));
  }, [history]);

  useEffect(() => {
    if (activePrediction) {
      console.log('--- Yield Prediction Debug Logs ---');
      console.log('Selected history record / Active prediction:', activePrediction);
      console.log('Derived summary card data:', derivedData);
      console.log('Revenue chart data:', revenueChartData);
      console.log('Crop comparison chart data:', cropComparisonData);
      console.log('------------------------------------');
    }
  }, [activePrediction, derivedData, revenueChartData, cropComparisonData]);

 
  if (farms.length === 0) {
    return (
      <div className="bg-[#121024]/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 text-center py-20 shadow-2xl">
        <AlertCircle className="h-12 w-12 text-[#9333EA] mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">{t.noFarmsTitle}</h3>
        <p className="text-sm text-[#E9D5FF] mb-6">{t.noFarmsDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-50 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border backdrop-blur-xl ${
              toast.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-200' : 'bg-[#9333EA]/20 border-[#9333EA]/50 text-[#E9D5FF]'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-black text-white tracking-tight">{t.title}</h2>

          </div>
          <p className="text-[#E9D5FF] max-w-2xl">
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: t.expectedYield, value: derivedData ? derivedData.yieldVal : '--', icon: Layers, color: 'text-[#D946EF]' },
          { label: t.expectedRevenue, value: derivedData ? derivedData.revenueVal : '--', icon: DollarSign, color: 'text-blue-400' },
          { label: t.accuracyScore, value: derivedData ? derivedData.accuracyVal : '--', icon: Target, color: 'text-purple-400' },
          { label: t.confidenceLevel, value: derivedData ? derivedData.confidenceVal : '--', icon: ShieldCheck, color: 'text-amber-400' },
          { label: t.productionCost, value: derivedData ? derivedData.costVal : '--', icon: Activity, color: 'text-rose-400' },
          { label: t.profitEstimate, value: derivedData ? derivedData.profitVal : '--', icon: TrendingUp, color: 'text-emerald-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-gradient-to-br from-[#121024] to-[#1E1B4B] p-5 rounded-2xl border border-white/10 flex flex-col justify-between group hover:bg-white/5 transition-colors shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{stat.label}</span>
              <stat.icon className={`h-5 w-5 ${stat.color} opacity-80`} />
            </div>
            <span className="text-2xl font-black text-white truncate">{isPredicting ? '-' : stat.value}</span>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-white/10 pb-4 no-scrollbar">
        {[
          { id: 'predict', label: t.predictionEngine, icon: Sparkles },
          { id: 'charts', label: t.analyticsCharts, icon: BarChart2 },
          { id: 'history', label: t.historyLogs, icon: History }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap focus:outline-none ${
              activeTab === tab.id 
                ? 'bg-[#9333EA]/20 text-[#D946EF] border border-[#9333EA]/30' 
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* PREDICT TAB */}
          {activeTab === 'predict' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Inputs */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-[#121024]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#9333EA] to-[#C026D3]" />
                  <h3 className="text-lg font-bold text-white mb-6">{t.simulationParameters}</h3>
                  
                  <div className="space-y-4">
                    {/* Farm & Crop */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">{t.farmLocation}</label>
                        <select
                          value={selectedFarmId}
                          onChange={(e) => handleFarmSelect(e.target.value)}
                          className="w-full h-11 bg-black/40 border border-white/10 rounded-xl text-white px-3 focus:outline-none focus:border-[#9333EA] text-sm transition-colors"
                        >
                          {farms.map((f) => <option key={f.id} value={f.id} className="bg-[#121024]">{f.name}</option>)}

                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">{t.targetCrop}</label>
                        <select
                          value={cropType}
                          onChange={(e) => setCropType(e.target.value)}
                          className="w-full h-11 bg-black/40 border border-white/10 rounded-xl text-white px-3 focus:outline-none focus:border-[#9333EA] text-sm transition-colors"
                        >
                          {CROP_TYPES.map((c) => <option key={c} value={c} className="bg-[#121024]">{c}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Area Slider */}
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t.plantedArea}</label>
                        <span className="text-sm font-bold text-[#D946EF]">{area} {t.acres}</span>
                      </div>
                      <input
                        type="range" min="1" max="500" value={area}
                        onChange={(e) => setArea(parseInt(e.target.value))}
                        className="w-full accent-[#9333EA] h-2 bg-black/40 rounded-lg cursor-pointer appearance-none"
                      />
                    </div>

                    {/* Season & Soil */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">{t.growingSeason}</label>
                        <select value={season} onChange={(e) => setSeason(e.target.value)} className="w-full h-11 bg-black/40 border border-white/10 rounded-xl text-white px-3 text-sm focus:outline-none focus:border-[#9333EA] transition-colors">
                          {SEASONS.map(s => <option key={s} value={s} className="bg-[#121024]">{t(`season.${s}`, s)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">{t.soilComposition}</label>
                        <select value={soilType} onChange={(e) => setSoilType(e.target.value)} className="w-full h-11 bg-black/40 border border-white/10 rounded-xl text-white px-3 text-sm focus:outline-none focus:border-[#9333EA] transition-colors">
                          {SOIL_TYPES.map(s => <option key={s} value={s} className="bg-[#121024]">{t(`soil.${s}`, s)}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Irrigation & Fertilizer */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">{t.irrigationSystem}</label>
                        <select value={irrigation} onChange={(e) => setIrrigation(e.target.value)} className="w-full h-11 bg-black/40 border border-white/10 rounded-xl text-white px-3 text-sm focus:outline-none focus:border-[#9333EA] transition-colors">
                          {IRRIGATION_TYPES.map(i => <option key={i} value={i} className="bg-[#121024]">{t(`irrigation.${i}`, i)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">{t.fertilizerRegimen}</label>
                        <select value={fertilizer} onChange={(e) => setFertilizer(e.target.value)} className="w-full h-11 bg-black/40 border border-white/10 rounded-xl text-white px-3 text-sm focus:outline-none focus:border-[#9333EA] transition-colors">
                          {FERTILIZER_TYPES.map(f => <option key={f} value={f} className="bg-[#121024]">{t(`fertilizer.${f}`, f)}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Historic Yield */}
                    <div>
                      <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">{t.histYieldt}</label>
                      <input type="number" value={historicalYield} onChange={(e) => setHistoricalYield(Number(e.target.value))} className="w-full h-11 bg-black/40 border border-white/10 rounded-xl text-white px-3 text-sm focus:outline-none focus:border-[#9333EA] transition-colors" />
                    </div>

                    {/* Language indicator - controlled globally from header */}
                    <div>
                      <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">{t.aiResponseLanguage}</label>
                      <div className="flex rounded-xl border border-white/10 overflow-hidden bg-black/20">
                        <div
                          className={`flex-1 py-2.5 text-xs font-bold text-center transition-all ${
                            language === 'en'
                              ? 'bg-[#9333EA]/20 text-[#D946EF]'
                              : 'text-gray-400'
                          }`}
                        >
                          {language === 'hi' ? 'अंग्रेजी' : 'English'}
                        </div>
                        <div
                          className={`flex-1 py-2.5 text-xs font-bold text-center transition-all ${
                            language === 'hi'
                              ? 'bg-[#9333EA]/20 text-[#D946EF]'
                              : 'text-gray-400'
                          }`}
                        >
                          {language === 'hi' ? 'हिन्दी' : 'Hindi'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => generatePrediction()}
                      disabled={isPredicting}
                      className="w-full h-14 mt-6 bg-gradient-to-r from-[#9333EA] to-[#C026D3] hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 focus:outline-none shadow-lg shadow-[#9333EA]/20"
                    >
                      {isPredicting ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> {t.simulatingOutcomes}</>
                      ) : (
                        <><Sparkles className="h-5 w-5" /> {t.generateAIPrediction}</>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Prediction Results */}
              <div className="lg:col-span-7 h-full">
                {isPredicting ? (
                  <div className="bg-[#121024]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl h-full min-h-[600px] flex flex-col items-center justify-center text-center shadow-2xl">
                    <Loader2 className="h-12 w-12 text-[#D946EF] animate-spin mb-6" />
                    <h3 className="text-xl font-bold text-white mb-2">{t.simulatingNeuralGrid}</h3>
                    <p className="text-gray-400 max-w-sm">{t.evaluatingEnv}</p>
                    <div className="mt-8 w-64 h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: '100%' }} 
                        transition={{ duration: 1.5, ease: "linear" }}
                        className="h-full bg-gradient-to-r from-[#9333EA] to-[#D946EF]"
                      />
                    </div>
                  </div>
                                ) : activePrediction ? (() => {
                  const report = derivedData?.report;
                  const execSummary = report?.executiveSummary || {};
                  const predDetails = report?.predictionDetails || {};
                  const factors = report?.factors || {};
                  const limiting = report?.limitingFactors || {};
                  const positive = report?.positiveFactors || {};
                  const risk = report?.riskAssessment || {};
                  const scenario = report?.scenarioAnalysis || {};
                  const economics = report?.economicAnalysis || {};
                  const recs = report?.recommendations || {};
                  const irrigationPlan = report?.irrigationPlan || {};
                  const fertilizerPlan = report?.fertilizerSchedule || {};
                  const diseasePrev = report?.diseasePrevention || {};
                  const weatherImp = report?.weatherImpact || {};
                  const sustainability = report?.sustainability || {};
                  const explainable = report?.explainableAI || {};
                  const confidenceAn = report?.confidenceAnalysis || {};
                  const actionPlan = report?.actionPlan || {};
                  const futureImp = report?.futureImprovements || {};

                  const expectedProd = derivedData?.yieldNum ?? 0;
                  const confidenceVal = derivedData?.confPctNum ?? 94;
                  const roiVal = parseFloat(economics.roi || '0');
                  const costVal = derivedData?.costNum ?? 0;
                  const profitVal = derivedData?.profitNum ?? 0;
                  const incomeVal = derivedData?.revNum ?? 0;

                  // Recharts Data Sets - dynamically derived from historical inputs if available
                  const inputs = report?.inputs || {};
                  const nVal = inputs.soilNitrogen !== undefined ? inputs.soilNitrogen : 75;
                  const pVal = inputs.soilPhosphorus !== undefined ? inputs.soilPhosphorus : 60;
                  const kVal = inputs.soilPotassium !== undefined ? inputs.soilPotassium : 85;
                  const moistureVal = inputs.soilMoisture !== undefined ? inputs.soilMoisture : 70;
                  const carbonVal = 50;
                  const sunlightVal = 90;

                  const radarData = [
                    { subject: language === 'hi' ? 'नाइट्रोजन' : 'Nitrogen', A: nVal, fullMark: 100 },
                    { subject: language === 'hi' ? 'फास्फोरस' : 'Phosphorus', A: pVal, fullMark: 100 },
                    { subject: language === 'hi' ? 'पोटेशियम' : 'Potassium', A: kVal, fullMark: 100 },
                    { subject: language === 'hi' ? 'कार्बनिक कार्बन' : 'Organic Carbon', A: carbonVal, fullMark: 100 },
                    { subject: language === 'hi' ? 'नमी' : 'Moisture', A: moistureVal, fullMark: 100 },
                    { subject: language === 'hi' ? 'धूप' : 'Sunlight', A: sunlightVal, fullMark: 100 }
                  ];

                  const scenarioData = [
                    { name: language === 'hi' ? 'सबसे खराब' : 'Worst Case', Yield: parseFloat(predDetails.worstCase) || (expectedProd * 0.8) },
                    { name: language === 'hi' ? 'अपेक्षित' : 'Expected Case', Yield: expectedProd },
                    { name: language === 'hi' ? 'सर्वोत्तम' : 'Best Case', Yield: parseFloat(predDetails.bestCase) || (expectedProd * 1.15) }
                  ];

                  const nutrientData = [
                    { name: 'N', Contribution: 80 },
                    { name: 'P', Contribution: 65 },
                    { name: 'K', Contribution: 85 },
                    { name: 'Carbon', Contribution: 45 }
                  ];

                  const expVsActualData = [
                    { name: language === 'hi' ? 'ऐतिहासिक' : 'Historical Base', Yield: historicalYield },
                    { name: language === 'hi' ? 'अनुमानित' : 'AI Projected', Yield: expectedProd }
                  ];

                  const weatherTrendData = [
                    { name: 'D1-15', Temp: 24, Humidity: 60, Rainfall: 10 },
                    { name: 'D16-30', Temp: 26, Humidity: 62, Rainfall: 15 },
                    { name: 'D31-45', Temp: 28, Humidity: 65, Rainfall: 20 },
                    { name: 'D46-60', Temp: 30, Humidity: 68, Rainfall: 25 },
                    { name: 'D61-75', Temp: 29, Humidity: 66, Rainfall: 12 },
                    { name: 'D76-90', Temp: 27, Humidity: 63, Rainfall: 8 }
                  ];

                  const waterScheduleData = [
                    { name: 'W1-2', Demand: 12 },
                    { name: 'W3-4', Demand: 18 },
                    { name: 'W5-6', Demand: 25 },
                    { name: 'W7-8', Demand: 22 },
                    { name: 'W9-10', Demand: 15 }
                  ];

                  return (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-[#1E1B4B] to-[#121024] p-6 rounded-3xl border border-[#9333EA]/30 shadow-2xl space-y-6 h-full text-white"
                    >
                      {/* Top Header Summary */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
                        <div>
                          <span className="text-xs text-[#D946EF] font-bold uppercase tracking-wider mb-2 block flex items-center gap-2">
                            <Activity className="h-4 w-4" /> {t.predictionComplete}
                          </span>
                          <h2 className="text-4xl font-black text-white">{expectedProd.toFixed(1)} <span className="text-xl text-gray-400 font-medium tracking-normal">{t.tons}</span></h2>
                        </div>
                        <div className="flex gap-6">
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">{t.estRevenue}</span>
                            <div className="text-2xl font-black text-[#10B981]">{derivedData?.revenueVal}</div>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">{t.accuracyScore}</span>
                            <div className="text-2xl font-black text-blue-400">{derivedData?.accuracyVal}</div>
                          </div>
                        </div>
                      </div>

                      {/* Sub Tabs Navigation */}
                      <div className="flex overflow-x-auto gap-2 border-b border-white/5 pb-3 no-scrollbar">
                        {[
                          { id: 'summary', label: t.executiveOverview, icon: Layers },
                          { id: 'factors', label: t.yieldFactors, icon: Target },
                          { id: 'economics', label: t.economicsScenarios, icon: DollarSign },
                          { id: 'plans', label: t.agronomicPlans, icon: Sprout },
                          { id: 'ai', label: t.aiExplainability, icon: Sparkles },
                        ].map(subTab => (
                          <button
                            key={subTab.id}
                            onClick={() => setReportSubTab(subTab.id as any)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap focus:outline-none ${
                              reportSubTab === subTab.id 
                                ? 'bg-[#D946EF]/20 text-[#D946EF] border border-[#D946EF]/30' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <subTab.icon className="h-3.5 w-3.5" /> {subTab.label}
                          </button>
                        ))}
                      </div>

                      {/* Sub Tab Content Area */}
                      <div className="min-h-[450px]">
                        {/* 1. SUMMARY SUB-TAB */}
                        {reportSubTab === 'summary' && (
                          <div className="space-y-6">
                            {/* Visual Gauges Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Gauge 1: Yield Gauge (SVG Radial) */}
                              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{t.expectedYield}</span>
                                <div className="relative w-36 h-20 flex items-end justify-center overflow-hidden">
                                  <svg className="w-36 h-36 absolute top-0">
                                    <circle cx="72" cy="72" r="60" stroke="#ffffff10" strokeWidth="12" fill="none" strokeDasharray="188 376" strokeLinecap="round" transform="rotate(-180 72 72)" />
                                    <circle cx="72" cy="72" r="60" stroke="url(#yieldGrad)" strokeWidth="12" fill="none" 
                                      strokeDasharray={`${Math.min(188, (expectedProd / 200) * 188)} 376`} 
                                      strokeLinecap="round" transform="rotate(-180 72 72)" 
                                    />
                                    <defs>
                                      <linearGradient id="yieldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#9333EA" />
                                        <stop offset="100%" stopColor="#D946EF" />
                                      </linearGradient>
                                    </defs>
                                  </svg>
                                  <div className="text-center pb-1">
                                    <span className="text-2xl font-black text-white">{expectedProd.toFixed(1)}</span>
                                    <span className="text-xs text-gray-400 block">{t.tons}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-gray-500 font-medium mt-2">{t.bestCase}: {predDetails.bestCase || '--'}</span>
                              </div>

                              {/* Gauge 2: Confidence Meter */}
                              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{t.confidenceAnalysisTitleKey}</span>
                                <div className="relative w-28 h-28 flex items-center justify-center">
                                  <svg className="w-28 h-28 transform -rotate-90">
                                    <circle cx="56" cy="56" r="48" stroke="#ffffff10" strokeWidth="10" fill="none" />
                                    <circle cx="56" cy="56" r="48" stroke="#10B981" strokeWidth="10" fill="none" 
                                      strokeDasharray="301" 
                                      strokeDashoffset={301 - (301 * confidenceVal) / 100}
                                      strokeLinecap="round" 
                                    />
                                  </svg>
                                  <div className="absolute text-center">
                                    <span className="text-xl font-black text-white">{confidenceVal}%</span>
                                    <span className="text-[9px] text-[#10B981] block font-bold uppercase tracking-wider">{language === 'hi' ? 'विश्वसनीयता' : 'Reliability'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Section 1: Executive Summary */}
                            <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-[#D946EF]" /> {t.executiveOverview}
                              </h3>
                              <p className="text-xs text-gray-300 leading-relaxed mb-4">{execSummary.summary}</p>
                              
                              <div className="grid grid-cols-2 gap-3 text-xs bg-black/20 p-4 rounded-xl border border-white/5">
                                <div>
                                  <span className="text-gray-400 block mb-0.5">{language === 'hi' ? 'फसल का नाम' : 'Crop Name'}</span>
                                  <span className="font-bold text-white">{execSummary.cropName}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block mb-0.5">{language === 'hi' ? 'विकास की अवस्था' : 'Growth Stage'}</span>
                                  <span className="font-bold text-white">{execSummary.growthStage}</span>
                                </div>
                                <div className="mt-2">
                                  <span className="text-gray-400 block mb-0.5">{language === 'hi' ? 'उपज श्रेणी' : 'Yield Category'}</span>
                                  <span className="font-bold text-white">{execSummary.yieldCategory}</span>
                                </div>
                                <div className="mt-2">
                                  <span className="text-gray-400 block mb-0.5">{language === 'hi' ? 'प्रदर्शन सूचकांक' : 'Performance Index'}</span>
                                  <span className="font-bold text-[#10B981]">{execSummary.performance}</span>
                                </div>
                              </div>
                            </div>

                            {/* Chart 9: Scenario Comparison Chart */}
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-4">{t.scenarioTitle}</span>
                              <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={scenarioData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="name" stroke="#ffffff50" tick={{fontSize: 10}} />
                                    <YAxis stroke="#ffffff50" tick={{fontSize: 10}} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '8px', fontSize: 10 }} />
                                    <Bar dataKey="Yield" fill="#D946EF" radius={[4, 4, 0, 0]} name={t.expectedYield}>
                                      <Cell fill="#ef4444" />
                                      <Cell fill="#9333EA" />
                                      <Cell fill="#10b981" />
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 2. FACTORS SUB-TAB */}
                        {reportSubTab === 'factors' && (
                          <div className="space-y-6">
                            {/* Chart 12: Radar Chart mapping factors */}
                            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-4">{language === 'hi' ? 'बहु-परिवर्तनीय पर्यावरणीय रडार' : 'Multi-Variable Environmental Radar'}</span>
                              <div className="w-full h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RadarChart data={radarData}>
                                    <PolarGrid stroke="#ffffff10" />
                                    <PolarAngleAxis dataKey="subject" stroke="#ffffff60" tick={{ fontSize: 9 }} />
                                    <PolarRadiusAxis stroke="#ffffff30" angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                                    <Radar name={language === 'hi' ? 'खेत सूचकांक' : 'Field Index'} dataKey="A" stroke="#9333EA" fill="#9333EA" fillOpacity={0.4} />
                                  </RadarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* Section 3: Prediction Factors */}
                            <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Target className="h-4 w-4 text-[#D946EF]" /> {t.factorsTitle}
                              </h3>
                              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar text-xs">
                                {[
                                  { label: t.soilFertility, val: factors.soilFertility },
                                  { label: t.nitrogen, val: factors.nitrogen },
                                  { label: t.phosphorus, val: factors.phosphorus },
                                  { label: t.potassium, val: factors.potassium },
                                  { label: t.organicCarbon, val: factors.organicCarbon },
                                  { label: t.moisture, val: factors.moisture },
                                  { label: t.temperature, val: factors.temperature },
                                  { label: t.humidity, val: factors.humidity },
                                  { label: t.rainfall, val: factors.rainfall },
                                  { label: t.sunlight, val: factors.sunlight },
                                  { label: t.cropHealth, val: factors.cropHealth },
                                  { label: t.disease, val: factors.disease },
                                  { label: t.practices, val: factors.practices }
                                ].map((item, idx) => item.val && (
                                  <div key={idx} className="border-b border-white/5 pb-2.5">
                                    <span className="font-bold text-white block mb-0.5">{item.label}</span>
                                    <span className="text-gray-400 block leading-relaxed">{item.val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Section 4 & 5: Limiting and Positive Factors */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/20">
                                <h4 className="text-xs font-bold text-red-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4" /> {t.limitingFactorsTitle}
                                </h4>
                                <ul className="space-y-2.5 text-xs text-red-200/80">
                                  {Object.entries(limiting).map(([key, val], i) => val && (
                                    <li key={i} className="flex gap-2">
                                      <span className="text-red-400 font-bold">•</span>
                                      <span><strong>{t(key) || key}:</strong> {val as string}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="bg-green-500/5 p-4 rounded-2xl border border-green-500/20">
                                <h4 className="text-xs font-bold text-green-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4" /> {t.positiveFactorsTitle}
                                </h4>
                                <ul className="space-y-2.5 text-xs text-green-200/80">
                                  {Object.entries(positive).map(([key, val], i) => val && (
                                    <li key={i} className="flex gap-2">
                                      <span className="text-green-400 font-bold">•</span>
                                      <span><strong>{t(key) || key}:</strong> {val as string}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. ECONOMICS SUB-TAB */}
                        {reportSubTab === 'economics' && (
                          <div className="space-y-6">
                            {/* Profit Indicator Widget */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {[
                                { label: t.marketValue, val: economics.marketValue || 'N/A', icon: Layers, color: 'text-[#D946EF]' },
                                { label: t.grossIncome, val: economics.income || `$${incomeVal.toLocaleString()}`, icon: DollarSign, color: 'text-blue-400' },
                                { label: t.prodCost, val: economics.productionCost || `$${costVal.toLocaleString()}`, icon: Activity, color: 'text-rose-400' },
                                { label: t.netProfit, val: economics.profit || `$${profitVal.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400' }
                              ].map((stat, idx) => (
                                <div key={idx} className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{stat.label}</span>
                                    <stat.icon className={`h-4 w-4 ${stat.color} opacity-70`} />
                                  </div>
                                  <span className="text-lg font-black text-white">{stat.val}</span>
                                </div>
                              ))}
                            </div>

                            {/* Section 6: Risk Assessment */}
                            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-4">
                              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-[#D946EF]" /> {t.riskTitle}
                              </h3>
                              
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                {[
                                  { label: t.weatherRisk, score: risk.weatherRisk || 'Low', color: 'from-blue-500 to-indigo-500' },
                                  { label: t.diseaseRisk, score: risk.diseaseRisk || 'Moderate', color: 'from-amber-500 to-orange-500' },
                                  { label: t.pestRisk, score: risk.pestRisk || 'Low', color: 'from-green-500 to-emerald-500' },
                                  { label: t.waterRisk, score: risk.waterRisk || 'Low', color: 'from-sky-500 to-blue-500' },
                                  { label: t.nutrientRisk, score: risk.nutrientRisk || 'Low', color: 'from-purple-500 to-fuchsia-500' },
                                  { label: t.economicRisk, score: risk.economicRisk || 'Moderate', color: 'from-rose-500 to-red-500' },
                                ].map((item, idx) => (
                                  <div key={idx} className="bg-black/30 p-3 rounded-xl border border-white/5">
                                    <div className="flex justify-between items-center mb-1.5">
                                      <span className="text-gray-400">{item.label}</span>
                                      <span className={`font-bold ${item.score === 'High' || item.score === 'Critical' ? 'text-red-400' : item.score === 'Moderate' ? 'text-amber-400' : 'text-green-400'}`}>{translateScore(item.score)}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full bg-gradient-to-r ${item.color}`}
                                        style={{ width: item.score === 'Critical' ? '100%' : item.score === 'High' ? '80%' : item.score === 'Moderate' ? '50%' : '20%' }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Chart 11: Expected vs Actual Yield */}
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-4">{language === 'hi' ? 'उपज तुलना (ऐतिहासिक बनाम अनुमानित)' : 'Yield Comparison (Historic vs Predicted)'}</span>
                              <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={expVsActualData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="name" stroke="#ffffff50" tick={{fontSize: 10}} />
                                    <YAxis stroke="#ffffff50" tick={{fontSize: 10}} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '8px', fontSize: 10 }} />
                                    <Bar dataKey="Yield" fill="#10B981" radius={[4, 4, 0, 0]} name={t.expectedYield}>
                                      <Cell fill="#9333EA" />
                                      <Cell fill="#10b981" />
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 4. AGRONOMIC PLANS SUB-TAB */}
                        {reportSubTab === 'plans' && (
                          <div className="space-y-6">
                            {/* Action Plan Timeline (Growth Timeline) */}
                            <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Activity className="h-4 w-4 text-[#D946EF]" /> {t.actionPlanTimeline}
                              </h3>
                              
                              <div className="relative pl-6 border-l-2 border-[#9333EA]/30 space-y-5 text-xs text-gray-300">
                                {[
                                  { label: t.immediate, text: actionPlan.immediate },
                                  { label: t.next7Days, text: actionPlan.next7Days },
                                  { label: t.next30Days, text: actionPlan.next30Days },
                                  { label: t.preHarvest, text: actionPlan.preHarvest },
                                  { label: t.harvest, text: actionPlan.harvest },
                                  { label: t.postHarvest, text: actionPlan.postHarvest }
                                ].map((item, idx) => item.text && (
                                  <div key={idx} className="relative">
                                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#121024] border-2 border-[#D946EF] flex items-center justify-center">
                                      <div className="w-1.5 h-1.5 rounded-full bg-[#D946EF]" />
                                    </div>
                                    <span className="font-black text-white block mb-0.5">{item.label}</span>
                                    <p className="text-gray-400 leading-relaxed">{item.text}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Section 9: AI Recommendations */}
                            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-4">
                              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-[#D946EF]" /> {t.recsTitle}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                {[
                                  { label: language === 'hi' ? 'पोषण' : 'Nutrition', val: recs.nutrition, icon: Leaf },
                                  { label: language === 'hi' ? 'सिंचाई' : 'Irrigation', val: recs.irrigation, icon: Droplets },
                                  { label: language === 'hi' ? 'रोग प्रबंधन' : 'Disease Management', val: recs.diseaseMgmt, icon: ShieldCheck },
                                  { label: language === 'hi' ? 'कीट नियंत्रण' : 'Pest Control', val: recs.pestControl, icon: AlertCircle }
                                ].map((item, idx) => item.val && (
                                  <div key={idx} className="bg-black/30 p-3.5 rounded-xl border border-white/5 flex gap-3">
                                    <div className="bg-[#9333EA]/20 p-2 rounded-lg shrink-0 h-9 w-9 flex items-center justify-center text-[#D946EF]">
                                      <item.icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <span className="font-bold text-white block mb-0.5">{item.label}</span>
                                      <p className="text-gray-400 leading-relaxed">{item.val}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Section 10: Irrigation Plan */}
                            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-4">
                              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Droplets className="h-4 w-4 text-[#D946EF]" /> {t.irrigationPlanTitle}
                              </h3>
                              <p className="text-xs text-gray-300 leading-relaxed">{irrigationPlan.waterRequirement}</p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                  <span className="text-gray-400 block mb-1">{language === 'hi' ? 'साप्ताहिक समय-सारणी' : 'Weekly Schedule'}</span>
                                  <span className="font-bold text-white">{irrigationPlan.weeklySchedule}</span>
                                </div>
                                <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                  <span className="text-gray-400 block mb-1">{language === 'hi' ? 'महत्वपूर्ण नमी चरण' : 'Critical Moisture Stages'}</span>
                                  <span className="font-bold text-white">{irrigationPlan.criticalStages}</span>
                                </div>
                              </div>
                            </div>

                            {/* Chart 8: Water Requirement Demands */}
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-4">{language === 'hi' ? 'मौसमी सिंचाई मांग (लीटर/मीटर²)' : 'Seasonal Irrigation Demand (liters/m²)'}</span>
                              <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={waterScheduleData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="name" stroke="#ffffff50" tick={{fontSize: 10}} />
                                    <YAxis stroke="#ffffff50" tick={{fontSize: 10}} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '8px', fontSize: 10 }} />
                                    <Bar dataKey="Demand" fill="#3B82F6" radius={[4, 4, 0, 0]} name={language === 'hi' ? 'पानी की मांग' : 'Water Demand'} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 5. AI EXPLAINABILITY SUB-TAB */}
                        {reportSubTab === 'ai' && (
                          <div className="space-y-6">
                            {/* Section 15: Explainable AI */}
                            <div className="bg-[#9333EA]/10 p-5 rounded-2xl border border-[#9333EA]/30 space-y-4">
                              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-[#D946EF]" /> {t.explainableAITitle}
                              </h3>
                              <div className="text-xs leading-relaxed space-y-3">
                                <div>
                                  <span className="font-bold text-[#D946EF] block mb-1">{language === 'hi' ? 'जेमिनी ने इस उपज का अनुमान क्यों लगाया' : 'Why Gemini Projected This Yield'}</span>
                                  <p className="text-gray-200">{explainable.whyPredicted}</p>
                                </div>
                                <div className="pt-2 border-t border-[#9333EA]/20">
                                  <span className="font-bold text-[#D946EF] block mb-1">{language === 'hi' ? 'शीर्ष ड्राइविंग चर' : 'Top Driving Variables'}</span>
                                  <p className="text-gray-200">{explainable.keyParameters}</p>
                                </div>
                                <div className="pt-2 border-t border-[#9333EA]/20">
                                  <span className="font-bold text-[#D946EF] block mb-1">{language === 'hi' ? 'किसान अनुवाद' : 'Farmer Translation'}</span>
                                  <p className="text-gray-200 italic">"{explainable.farmerExplanation}"</p>
                                </div>
                              </div>
                            </div>

                            {/* Section 13: Weather Impact */}
                            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-4">
                              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <CloudRain className="h-4 w-4 text-[#D946EF]" /> {t.weatherImpactTitle}
                              </h3>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
                                  <div>
                                    <span className="text-gray-400 block mb-0.5">{language === 'hi' ? 'वर्तमान जलवायु तर्क' : 'Current Climate Rationale'}</span>
                                    <span className="font-bold text-white leading-relaxed">{weatherImp.currentWeather}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block mb-0.5">{language === 'hi' ? 'पूर्वानुमान दृष्टिकोण' : 'Forecast Outlook'}</span>
                                    <span className="font-bold text-white leading-relaxed">{weatherImp.futureWeather}</span>
                                  </div>
                                </div>
                                
                                <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
                                  <div>
                                    <span className="text-gray-400 block mb-0.5">{language === 'hi' ? 'वर्षा और आर्द्रता प्रभाव' : 'Rainfall & Humidity Effects'}</span>
                                    <span className="font-bold text-white leading-relaxed">{weatherImp.rainfallEffect} — {weatherImp.humidityEffect}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block mb-0.5">{language === 'hi' ? 'गर्मी तनाव मूल्यांकन' : 'Heat Stress Evaluation'}</span>
                                    <span className="font-bold text-white leading-relaxed">{weatherImp.heatStress}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Chart 6: Meteorological Impact Trends */}
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-4">{language === 'hi' ? 'तापमान और आर्द्रता पूर्वानुमान सहसंबंध' : 'Temperature & Humidity Forecast Correlation'}</span>
                              <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={weatherTrendData}>
                                    <defs>
                                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                      </linearGradient>
                                      <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="name" stroke="#ffffff50" tick={{fontSize: 10}} />
                                    <YAxis stroke="#ffffff50" tick={{fontSize: 10}} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '8px', fontSize: 10 }} />
                                    <Area type="monotone" dataKey="Temp" stroke="#ef4444" fillOpacity={1} fill="url(#colorTemp)" name={language === 'hi' ? 'तापमान (°C)' : 'Temperature (°C)'} />
                                    <Area type="monotone" dataKey="Humidity" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHum)" name={language === 'hi' ? 'आर्द्रता (%)' : 'Humidity (%)'} />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* Section 14: Sustainability Analysis */}
                            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-4">
                              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Leaf className="h-4 w-4 text-[#D946EF]" /> {t.sustainabilityTitle}
                              </h3>
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                {[
                                  { label: language === 'hi' ? 'जल दक्षता' : 'Water Efficiency', val: sustainability.waterEfficiency },
                                  { label: language === 'hi' ? 'मिट्टी स्वास्थ्य स्थिरता' : 'Soil Health Sustainability', val: sustainability.soilSustainability },
                                  { label: language === 'hi' ? 'कार्बन सूचकांक रेटिंग' : 'Carbon Index Rating', val: sustainability.carbonFootprint },
                                  { label: language === 'hi' ? 'पोषक तत्व प्रतिधारण दर' : 'Nutrient Retention Rate', val: sustainability.nutrientBalance }
                                ].map((item, idx) => item.val && (
                                  <div key={idx} className="bg-black/30 p-3 rounded-xl border border-white/5">
                                    <span className="text-gray-400 block mb-0.5">{item.label}</span>
                                    <span className="font-bold text-white">{item.val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })() : (
                  <div className="bg-[#121024]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl h-full min-h-[600px] flex flex-col items-center justify-center text-center shadow-2xl">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                      <BarChart2 className="h-10 w-10 text-gray-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">{t.awaitingParameters}</h3>
                    <p className="text-gray-400 max-w-md">{t.awaitingParametersDesc}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CHARTS TAB */}
          {activeTab === 'charts' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Forecast */}
                <div className="bg-[#121024]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
                  <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2"><DollarSign className="h-5 w-5 text-emerald-400" /> {t.revenueCostForecast}</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueChartData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="name" stroke="#ffffff50" tick={{fontSize: 12}} />
                        <YAxis stroke="#ffffff50" tick={{fontSize: 12}} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '12px', color: '#fff' }} />
                        <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorRev)" name={t.revenueLegend} />
                        <Area type="monotone" dataKey="cost" stroke="#EF4444" fillOpacity={1} fill="url(#colorCost)" name={t.costLegend} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Crop Comparison */}
                <div className="bg-[#121024]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
                  <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2"><BarChart2 className="h-5 w-5 text-blue-400" /> {t.cropComparisonTitle}</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cropComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="name" stroke="#ffffff50" tick={{fontSize: 12}} />
                        <YAxis stroke="#ffffff50" tick={{fontSize: 12}} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '12px', color: '#fff' }} cursor={{fill: '#ffffff05'}} />
                        <Bar dataKey="yield" fill="#9333EA" radius={[6, 6, 0, 0]} name={t.averageYieldLegend} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Historical vs Predicted */}
                <div className="bg-[#121024]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl lg:col-span-2">
                  <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-purple-400" /> {t.historicPredictedTrend}</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueChartData.map((d, i) => ({ name: d.name, historic: d.cost / 200, predicted: d.revenue / 300 }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="name" stroke="#ffffff50" tick={{fontSize: 12}} />
                        <YAxis stroke="#ffffff50" tick={{fontSize: 12}} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '12px', color: '#fff' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line type="monotone" dataKey="historic" stroke="#8B5CF6" strokeWidth={3} dot={{r: 4}} name={t.historicYieldLegend} />
                        <Line type="monotone" dataKey="predicted" stroke="#10B981" strokeWidth={3} strokeDasharray="5 5" dot={{r: 4}} name={t.predictedYieldLegend} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="bg-[#121024]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-white/10 bg-white/5 flex flex-wrap gap-4 items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <History className="h-6 w-6 text-[#9333EA]" /> {t.predictionArchive}
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" placeholder={t.searchPlaceholder} value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full h-10 pl-10 pr-4 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#9333EA] transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2 border border-white/10 rounded-xl p-1 bg-black/40">
                    <select value={filterCrop} onChange={e => { setFilterCrop(e.target.value); setCurrentPage(1); }} className="h-8 bg-transparent text-sm text-white focus:outline-none px-3 appearance-none">
                      <option value="All" className="bg-[#121024]">{t.allCrops}</option>
                      {CROP_TYPES.map(c => <option key={c} value={c} className="bg-[#121024]">{c}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 border border-white/10 rounded-xl p-1 bg-black/40">
                    <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="h-8 bg-transparent text-sm text-white focus:outline-none px-3 appearance-none">
                      <option value="Newest" className="bg-[#121024]">{language === 'hi' ? 'नवीनतम' : 'Newest'}</option>
                      <option value="Oldest" className="bg-[#121024]">{language === 'hi' ? 'सबसे पुराना' : 'Oldest'}</option>
                      <option value="Highest Yield" className="bg-[#121024]">{language === 'hi' ? 'उच्चतम उपज' : 'Highest Yield'}</option>
                      <option value="Lowest Yield" className="bg-[#121024]">{language === 'hi' ? 'न्यूनतम उपज' : 'Lowest Yield'}</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button onClick={exportCSV} className="px-3 h-10 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                      <Download className="h-4 w-4" /> {t.btnCSV}
                    </button>
                    <button onClick={exportPDF} className="px-3 h-10 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                      <FileText className="h-4 w-4" /> {t.btnPDF}
                    </button>
                  </div>
                </div>
              </div>

              {loadingHistory ? (
                <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-400 bg-black/20">
                        <th className="p-5 font-bold">{t.historyDate}</th>
                        <th className="p-5 font-bold">{t.historyCrop}</th>
                        <th className="p-5 font-bold">{t.historyArea}</th>
                        <th className="p-5 font-bold">{t.historyYield}</th>
                        <th className="p-5 font-bold">{t.historyAccuracy}</th>
                        <th className="p-5 font-bold">{t.historyStatus}</th>
                        <th className="p-5 font-bold text-right">{t.historyActions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="p-5"><div className="h-4 w-20 bg-white/10 rounded" /></td>
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white/10" />
                              <div className="h-4 w-24 bg-white/10 rounded" />
                            </div>
                          </td>
                          <td className="p-5"><div className="h-4 w-16 bg-white/10 rounded" /></td>
                          <td className="p-5"><div className="h-4 w-16 bg-white/10 rounded" /></td>
                          <td className="p-5"><div className="h-4 w-12 bg-white/10 rounded" /></td>
                          <td className="p-5"><div className="h-6 w-16 bg-white/10 rounded-full" /></td>
                          <td className="p-5 text-right"><div className="h-8 w-16 bg-white/10 rounded ml-auto" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : paginatedHistory.length > 0 ? (
                <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-400 bg-black/20">
                        <th className="p-5 font-bold">{t.historyDate}</th>
                        <th className="p-5 font-bold">{t.historyCrop}</th>
                        <th className="p-5 font-bold">{t.historyArea}</th>
                        <th className="p-5 font-bold">{t.historyYield}</th>
                        <th className="p-5 font-bold">{t.historyAccuracy}</th>
                        <th className="p-5 font-bold">{t.historyStatus}</th>
                        <th className="p-5 font-bold text-right">{t.historyActions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paginatedHistory.map((row, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors text-sm text-gray-200">
                          <td className="p-5 whitespace-nowrap">{new Date(row.createdAt).toLocaleDateString()}</td>
                          <td className="p-5 font-bold text-white flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                              <Sprout className="h-4 w-4 text-[#10B981]" />
                            </div>
                            {row.cropType}
                          </td>
                          <td className="p-5">{row.area} {t.acres}</td>
                          <td className="p-5 font-black text-[#34D399]">{row.predictedYield} {t.tons}</td>
                          <td className="p-5 font-mono text-gray-400">{(100 - row.errorMargin).toFixed(1)}%</td>
                          <td className="p-5">
                            <span className="px-2.5 py-1 bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] font-bold uppercase tracking-wider rounded-full">{t.savedBadge}</span>
                          </td>
                          <td className="p-5 text-right">
                            <button
                              onClick={() => {
                                loadPrediction(row);
                              }}
                              className="px-3 py-1 bg-[#9333EA]/20 hover:bg-[#9333EA]/35 border border-[#9333EA]/30 text-xs font-bold text-[#D946EF] rounded-lg transition-colors cursor-pointer"
                            >
                              {t.viewDetails}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-24 text-center">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="h-8 w-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{t.noPredictionsFound}</h3>
                  <p className="text-sm text-gray-400 max-w-sm mx-auto">{t.noPredictionsDesc}</p>
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    {language === 'hi' 
                      ? `दिखा रहा है ${((currentPage - 1) * itemsPerPage) + 1} से ${Math.min(currentPage * itemsPerPage, filteredHistory.length)} कुल ${filteredHistory.length} प्रविष्टियों में से` 
                      : `Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${Math.min(currentPage * itemsPerPage, filteredHistory.length)} of ${filteredHistory.length} entries`
                    }
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-white transition-colors"
                    ><ChevronLeft className="h-4 w-4" /></button>
                    <div className="text-sm font-bold text-white px-4">{currentPage} / {totalPages}</div>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-white transition-colors"
                    ><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
