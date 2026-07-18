import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, MapPin, Layers, Sprout, Check, X, AlertTriangle, 
  Loader2, Search, ArrowUpDown, Droplets, CloudRain,
  Thermometer, Activity, ArrowLeft, Image as ImageIcon,
  Map as MapIcon, Calendar, CheckCircle2, AlertCircle, Wind, ChevronRight, Leaf,
  Compass, TrendingUp, Gauge, FileText, Sparkles, Clock, Pin, ShieldCheck,
  TrendingDown, ShieldAlert, Zap, Waves, ClipboardList, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Farm, User } from '../types';
import { CROP_TYPES } from '../utils/simData';
import { fetch } from '../utils/api';
import { t as tr, localizeDiseaseName } from '../utils/i18n';
import { translatePlainNotificationString } from './NotificationCenter';

interface FarmManagementProps {
  user: User;
  farms: Farm[];
  onAddFarm: (
    name: string, 
    area: number, 
    cropType: string, 
    location: string,
    latitude?: number,
    longitude?: number,
    district?: string,
    state?: string,
    country?: string
  ) => Promise<void>;
  onEditFarm: (
    farmId: string, 
    name: string, 
    area: number, 
    cropType: string, 
    location: string,
    latitude?: number,
    longitude?: number,
    district?: string,
    state?: string,
    country?: string
  ) => Promise<void>;
  onDeleteFarm: (farmId: string) => Promise<void>;
  onNavigate?: (tab: string) => void;
  language?: 'en' | 'hi';
}

export default function FarmManagement({ 
  user, 
  farms, 
  onAddFarm, 
  onEditFarm, 
  onDeleteFarm, 
  onNavigate,
  language = 'en'
}: FarmManagementProps) {
  const farmTrans: Record<'en' | 'hi', Record<string, string>> = {
    en: {
      backToFieldList: 'Back to Field List',
      modifyConfig: 'Modify Config',
      removeTwin: 'Remove Twin',
      digitalTwinProfile: 'Digital Twin Profile',
      twinSyncActive: 'Twin Sync: Active',
      executiveSummary: 'Executive Summary',
      liveTelemetryStatus: 'Live Telemetry Status',
      twinCalibrationGauges: 'Digital Twin Calibration Gauges',
      farmHealthScore: 'Farm Health Score',
      yieldForecastGauge: 'Yield Forecast Gauge',
      environmentalRiskIndex: 'Environmental Risk Index',
      soilAnalysis: 'Soil Analysis',
      leafDiagnostics: 'Leaf Diagnostics',
      yieldPrediction: 'Yield Prediction',
      fieldGPSMapping: 'Field GPS Mapping',
      twinCropOverview: 'Twin Crop Overview',
      twinCommands: 'Twin Commands',
      aiDiagnosticInsights: 'AI Diagnostic Insights',
      recentActivity: 'Recent Activity',
      noActivity: 'No diagnostic operations run on this field.',
      cropSeason: 'Crop Season',
      currentCropStage: 'Current Crop Stage',
      daysSincePlantation: 'Days Since Plantation',
      expectedHarvest: 'Expected Harvest',
      lastIrrigation: 'Last Irrigation Cycle',
      waterRequirement: 'Water Requirement',
      openSoilAnalysis: 'Open Soil Analysis',
      openLeafDiagnostics: 'Open Leaf Diagnostics',
      openYieldCalculator: 'Open Yield Calculator',
      generateFullFarmReport: 'Generate Full Farm Report',
      viewNotifications: 'View Notifications',
      keyStrengths: 'Key Strengths',
      limitingWeaknesses: 'Limiting Weaknesses',
      criticalConcerns: 'Critical Concerns',
      actionsNextTasks: 'Actions & Next Tasks',
      daysUnit: 'Days',
      hoursAgo: '12 hours ago',
      waterGalAc: '12,500 Gal/Ac',
      noSoilCompleted: 'No Soil Analysis Completed yet.',
      noLeafCompleted: 'No Leaf Scan Diagnostics registered yet.',
      noYieldCompleted: 'No Yield prediction models run yet.',
      gpsCoordsLabel: 'GPS: {gps}',
      gpsUnavailable: 'Location not available',
      executiveSummaryText: 'The digital twin for {name} indicates an overall farm health index of {health}% with a {risk} environmental threat score. Sensor telemetry streams for moisture ({moisture}) and pH levels ({pH}) are dynamically tracked and aligned with expected crop stage targets.',
      
      // CRUD Dialogs
      editFieldTwin: 'Edit Field Digital Twin',
      registerNewField: 'Register New Field',
      fieldCoverImage: 'Field Cover Image',
      imageSelected: 'Image selected. Click to change.',
      clickToUpload: 'Click to upload Cover image (Optional)',
      farmNameLabel: 'Farm Name',
      farmNamePlaceholder: 'e.g. Sacramento Crop Twin A',
      areaLabel: 'Area (Acres)',
      areaPlaceholder: 'e.g. 24.5',
      cropTypeLabel: 'Crop Type',
      locationLabel: 'Location',
      locationPlaceholder: 'Search location (e.g. Punjab, India or Sacramento, CA)',
      cancel: 'Cancel',
      saveChanges: 'Save Changes',
      createTwin: 'Create Twin',
      
      // Delete dialog
      deleteConfirmTitle: 'Delete Field Digital Twin?',
      deleteConfirmDesc: 'This action is irreversible. All telemetry mapping logs, soil scores, yield history, and connected AI reports for this twin will be wiped.',
      confirmDelete: 'Confirm Delete',

      // List and Filters
      totalFarms: 'Total Farms',
      registeredSites: 'Registered sites',
      activeDigitalTwins: 'Active Digital Twins',
      iotSyncActive: 'IoT sync stream active',
      cropTypes: 'Crop Types',
      diversityIndex: 'Diversity index',
      totalArea: 'Total Area',
      combinedCoverage: 'Combined coverage',
      averageFarmHealth: 'Average Farm Health',
      aggregatedHealthIndex: 'Aggregated health index',
      averageExpectedYield: 'Average Expected Yield',
      aggForecast: 'Agg agronomic forecast',
      averageSoilScore: 'Average Soil Score',
      npkCarbonAvg: 'NPK & organic carbon avg',
      averageAIConfidence: 'Average AI Confidence',
      diagnosticPrecision: 'Diagnostic precision margin',
      searchPlaceholder: 'Search twin profiles by name, location, crop...',
      addFieldTwin: 'Add Field Digital Twin',
      allCrops: 'All Crops',
      allLocations: 'All Locations',
      allHealthScores: 'All Health Scores',
      excellentRange: 'Excellent (>=85%)',
      warningRange: 'Warning (60-84%)',
      criticalRange: 'Critical (<60%)',
      allRiskLevels: 'All Risk Levels',
      lowRisk: 'Low Risk',
      mediumRisk: 'Medium Risk',
      highRisk: 'High Risk',
      sortNewest: 'Sort: Newest',
      sortName: 'Sort: Name A-Z',
      sortArea: 'Sort: Crop Area',
      resetFilters: 'Reset Filters',
      noMatchingFields: 'No Matching Fields Found',
      adjustSearch: 'Try adjusting search keywords or clearing active filters to locate your farm digital twin profiles.',
      syncLabel: 'Sync',
      notYetRecorded: 'Not Yet Recorded',
      healthPrefix: 'Health',
      riskPrefix: 'Risk',
      yieldTargetPrefix: 'Yield Target',
      noData: 'No Data'
    },
    hi: {
      backToFieldList: 'फ़ील्ड सूची पर वापस जाएं',
      modifyConfig: 'कॉन्फ़िगरेशन संशोधित करें',
      removeTwin: 'डिजिटल ट्विन हटाएं',
      digitalTwinProfile: 'डिजिटल ट्विन प्रोफाइल',
      twinSyncActive: 'ट्विन सिंक: सक्रिय',
      executiveSummary: 'कार्यकारी सारांश',
      liveTelemetryStatus: 'लाइव टेलीमेट्री स्थिति',
      twinCalibrationGauges: 'डिजिटल ट्विन अंशांकन गेज',
      farmHealthScore: 'फार्म स्वास्थ्य स्कोर',
      yieldForecastGauge: 'उपज पूर्वानुमान गेज',
      environmentalRiskIndex: 'पर्यावरण जोखिम सूचकांक',
      soilAnalysis: 'मिट्टी विश्लेषण',
      leafDiagnostics: 'फसल रोग निदान',
      yieldPrediction: 'उपज का अनुमान',
      fieldGPSMapping: 'फील्ड जीपीएस मैपिंग',
      twinCropOverview: 'ट्विन फसल का अवलोकन',
      twinCommands: 'ट्विन कमांड',
      aiDiagnosticInsights: 'एआई नैदानिक अंतर्दृष्टि',
      recentActivity: 'हाल ही की गतिविधि',
      noActivity: 'इस क्षेत्र पर कोई नैदानिक संचालन नहीं चलाया गया।',
      cropSeason: 'फसल सीजन',
      currentCropStage: 'वर्तमान फसल चरण',
      daysSincePlantation: 'रोपण के बाद के दिन',
      expectedHarvest: 'अपेक्षित कटाई',
      lastIrrigation: 'अंतिम सिंचाई चक्र',
      waterRequirement: 'पानी की आवश्यकता',
      openSoilAnalysis: 'मिट्टी विश्लेषण खोलें',
      openLeafDiagnostics: 'रोग निदान खोलें',
      openYieldCalculator: 'उपज कैलकुलेटर खोलें',
      generateFullFarmReport: 'पूर्ण फार्म रिपोर्ट जनरेट करें',
      viewNotifications: 'सूचनाएं देखें',
      keyStrengths: 'प्रमुख ताकतें',
      limitingWeaknesses: 'सीमित कमजोरियां',
      criticalConcerns: 'गंभीर चिंताएं',
      actionsNextTasks: 'कार्रवाई और अगले कार्य',
      daysUnit: 'दिन',
      hoursAgo: '12 घंटे पहले',
      waterGalAc: '12,500 गैलन/एकड़',
      noSoilCompleted: 'अभी तक कोई मिट्टी विश्लेषण पूरा नहीं हुआ है।',
      noLeafCompleted: 'अभी तक कोई लीफ स्कैन डायग्नोस्टिक्स पंजीकृत नहीं है।',
      noYieldCompleted: 'अभी तक कोई उपज पूर्वानुमान मॉडल नहीं चलाया गया है।',
      gpsCoordsLabel: 'जीपीएस: {gps}',
      gpsUnavailable: 'स्थान उपलब्ध नहीं है',
      executiveSummaryText: '{name} के लिए डिजिटल ट्विन {health}% का समग्र कृषि स्वास्थ्य सूचकांक और {risk} पर्यावरणीय खतरे का स्कोर दर्शाता है। नमी ({moisture}) और पीएच स्तर ({pH}) के लिए सेंसर टेलीमेट्री स्ट्रीम गतिशील रूप से ट्रैक किए जाते हैं और अपेक्षित फसल चरण लक्ष्यों के साथ संरेखित होते हैं।',
      
      // CRUD Dialogs
      editFieldTwin: 'फील्ड डिजिटल ट्विन संपादित करें',
      registerNewField: 'नया क्षेत्र पंजीकृत करें',
      fieldCoverImage: 'फील्ड कवर इमेज',
      imageSelected: 'छवि चुनी गई। बदलने के लिए क्लिक करें।',
      clickToUpload: 'कवर छवि अपलोड करने के लिए क्लिक करें (वैकल्पिक)',
      farmNameLabel: 'फ़ार्म का नाम',
      farmNamePlaceholder: 'उदा. सैक्रामेंटो क्रॉप ट्विन ए',
      areaLabel: 'क्षेत्रफल (एकड़)',
      areaPlaceholder: 'उदा. 24.5',
      cropTypeLabel: 'फसल का प्रकार',
      locationLabel: 'स्थान',
      locationPlaceholder: 'स्थान खोजें (उदा. पंजाब, भारत या सैक्रामेंटो, सीए)',
      cancel: 'रद्द करें',
      saveChanges: 'परिवर्तन सहेजें',
      createTwin: 'ट्विन बनाएं',
      
      // Delete dialog
      deleteConfirmTitle: 'फील्ड डिजिटल ट्विन हटाएं?',
      deleteConfirmDesc: 'यह क्रिया अपरिवर्तनीय है। इस ट्विन के लिए सभी टेलीमेट्री मैपिंग लॉग, मिट्टी के स्कोर, उपज इतिहास और जुड़े हुए एआई रिपोर्ट मिटा दिए जाएंगे।',
      confirmDelete: 'हटाने की पुष्टि करें',

      // List and Filters
      totalFarms: 'कुल फार्म',
      registeredSites: 'पंजीकृत स्थल',
      activeDigitalTwins: 'सक्रिय डिजिटल ट्विन',
      iotSyncActive: 'IoT सिंक स्ट्रीम सक्रिय',
      cropTypes: 'फसल प्रकार',
      diversityIndex: 'विविधता सूचकांक',
      totalArea: 'कुल क्षेत्रफल',
      combinedCoverage: 'संयुक्त कवरेज',
      averageFarmHealth: 'औसत फार्म स्वास्थ्य',
      aggregatedHealthIndex: 'एकीकृत स्वास्थ्य सूचकांक',
      averageExpectedYield: 'औसत अपेक्षित उपज',
      aggForecast: 'कृषि पूर्वानुमान',
      averageSoilScore: 'औसत मिट्टी स्कोर',
      npkCarbonAvg: 'NPK और जैविक कार्बन औसत',
      averageAIConfidence: 'औसत एआई विश्वास',
      diagnosticPrecision: 'नैदानिक सटीकता मार्जिन',
      searchPlaceholder: 'नाम, स्थान, फसल द्वारा डिजिटल ट्विन खोजें...',
      addFieldTwin: 'खेत डिजिटल ट्विन जोड़ें',
      allCrops: 'सभी फसलें',
      allLocations: 'सभी स्थान',
      allHealthScores: 'सभी स्वास्थ्य स्कोर',
      excellentRange: 'उत्कृष्ट (>=85%)',
      warningRange: 'चेतावनी (60-84%)',
      criticalRange: 'गंभीर (<60%)',
      allRiskLevels: 'सभी जोखिम स्तर',
      lowRisk: 'कम जोखिम',
      mediumRisk: 'मध्यम जोखिम',
      highRisk: 'उच्च जोखिम',
      sortNewest: 'सॉर्ट: सबसे नया',
      sortName: 'सॉर्ट: नाम A-Z',
      sortArea: 'सॉर्ट: फसल क्षेत्र',
      resetFilters: 'फ़िल्टर साफ़ करें',
      noMatchingFields: 'कोई मेल खाते खेत नहीं मिले',
      adjustSearch: 'अपने फार्म डिजिटल ट्विन प्रोफाइल का पता लगाने के लिए खोज कीवर्ड समायोजित करने या सक्रिय फ़िल्टर साफ़ करने का प्रयास करें।',
      syncLabel: 'सिंक',
      notYetRecorded: 'अभी तक दर्ज नहीं',
      healthPrefix: 'स्वास्थ्य',
      riskPrefix: 'जोखिम',
      yieldTargetPrefix: 'उपज लक्ष्य',
      noData: 'कोई डेटा नहीं'
    }
  };

  const t = (() => {
    const translateKey = (key: string, params?: Record<string, string | number>, fallback?: string) => {
      const local = farmTrans[language]?.[key];
      if (local !== undefined) {
        let val = local;
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            val = val.replace(new RegExp(`{${k}}`, 'g'), String(v));
          });
        }
        return val;
      }
      return tr(language, key, fallback, params);
    };

    return new Proxy(translateKey, {
      get: (target, prop) => {
        if (typeof prop === 'string') {
          return translateKey(prop);
        }
        return (target as any)[prop];
      }
    }) as any;
  })();

  const translateRisk = (risk: string, lang: 'en' | 'hi') => {
    if (lang === 'hi') {
      if (risk === 'Low') return 'कम';
      if (risk === 'Medium') return 'मध्यम';
      if (risk === 'High') return 'उच्च';
    }
    return risk;
  };

  const translateCondition = (cond: string, lang: 'en' | 'hi') => {
    if (lang === 'hi') {
      if (cond === 'Healthy') return 'स्वस्थ';
      if (cond === 'Warning') return 'चेतावनी';
      if (cond === 'Diseased') return 'रोगग्रस्त';
    }
    return cond;
  };

  const translateGrowthStage = (stage: string, lang: 'en' | 'hi') => {
    if (lang === 'hi') {
      if (stage === 'Seedling Emergence') return 'अंकुरण उद्भव';
      if (stage === 'Vegetative Growth') return 'वानस्पतिक विकास';
      if (stage === 'Flowering/Pollination') return 'फूल आना/परागण';
      if (stage === 'Fruit/Grain Setting') return 'फल/अनाज निर्धारण';
      if (stage === 'Harvest Ready') return 'कटाई के लिए तैयार';
      if (stage === 'Vegetative Stage') return 'वानस्पतिक चरण';
    }
    return stage;
  };

  const translateSeason = (season: string, lang: 'en' | 'hi') => {
    if (lang === 'hi') {
      if (season === 'Summer Season') return 'गर्मी का मौसम';
      if (season === 'Rabi (Winter)') return 'रबी (शीतकालीन)';
      if (season === 'Kharif (Monsoon)') return 'खरीफ (मानसून)';
      if (season === 'Zaid (Spring)') return 'जायद (वसंत)';
    }
    return season;
  };

  const translateInsightText = (text: string, lang: 'en' | 'hi') => {
    if (lang !== 'hi') return text;
    
    if (text === "Ideal moisture retention across root sectors.") return "जड़ क्षेत्रों में आदर्श नमी प्रतिधारण।";
    if (text === "Soil pH value is balanced for optimal nutrient ingestion.") return "इष्टतम पोषक तत्वों के सेवन के लिए मिट्टी का पीएच मान संतुलित है।";
    if (text === "High Nitrogen composition encouraging rich leaf growth.") return "उच्च नाइट्रोजन संरचना समृद्ध पत्ती विकास को प्रोत्साहित करती है।";
    if (text === "Uniform solar exposure monitored in field plots.") return "खेत के भूखंडों में समान सौर जोखिम की निगरानी की गई।";

    if (text === "Dehydrated soil plots mapped near southern perimeter.") return "दक्षिणी परिधि के पास निर्जलित मिट्टी के भूखंडों का मानचित्रण किया गया।";
    if (text === "Low Potassium distribution; potential flowering limits.") return "कम पोटेशियम वितरण; संभावित फूलों की सीमाएं।";
    if (text === "Sub-optimal Organic Carbon levels mapped in soil profile.") return "मिट्टी के प्रोफाइल में उप-इष्टतम कार्बनिक कार्बन स्तर का मानचित्रण किया गया।";
    if (text === "Slight micro-nutrient deficiency recorded in history.") return "इतिहास में दर्ज सूक्ष्म पोषक तत्वों की थोड़ी कमी।";

    if (text.startsWith("Active Spore Scan: ")) {
      const match = text.match(/Active Spore Scan: ([^ ]+) detected\./);
      if (match) return `सक्रिय बीजाणु स्कैन: ${match[1]} का पता चला।`;
    }
    if (text === "Extreme moisture stress risks crop wilting.") return "अत्यधिक नमी का तनाव फसल के मुरझाने का जोखिम पैदा करता है।";
    if (text === "High environmental telemetry warning flags active.") return "उच्च पर्यावरणीय टेलीमेट्री चेतावनी झंडे सक्रिय हैं।";
    if (text === "No critical agricultural risks flagged currently.") return "वर्तमान में कोई गंभीर कृषि जोखिम चिन्हित नहीं है।";

    if (text === "Chlorophyll density indicators improved by 8% over last scans.") return "पिछले स्कैन की तुलना में क्लोरोफिल घनत्व संकेतकों में 8% सुधार हुआ है।";
    if (text === "Telemetry stability matches model growth target curve.") return "टेलीमेट्री स्थिरता मॉडल विकास लक्ष्य वक्र से मेल खाती है।";

    if (text === "Activate emergency drip irrigation valve.") return "आपातकालीन ड्रिप सिंचाई वाल्व सक्रिय करें।";
    if (text.startsWith("Apply ")) {
      const treatment = text.replace("Apply ", "").replace(".", "");
      return `लागू करें ${treatment}।`;
    }
    if (text === "Spread nitrogen fertilizer (NPK 12-32-16 ratio).") return "नाइट्रोजन उर्वरक फैलाएं (NPK 12-32-16 अनुपात)।";
    if (text === "Maintain current automated irrigation cycles.") return "वर्तमान स्वचालित सिंचाई चक्र बनाए रखें।";

    if (text === "Conduct weekly drone leaf diagnostic sweep.") return "साप्ताहिक ड्रोन लीफ डायग्नोस्टिक स्वीप आयोजित करें।";
    if (text === "Validate soil moisture readings manually in 3 days.") return "3 दिनों में मैन्युअल रूप से मिट्टी की नमी की रीडिंग को सत्यापित करें।";

    return text;
  };

  const translateActivity = (act: any, lang: 'en' | 'hi') => {
    if (lang !== 'hi') return act;
    
    let title = act.title;
    if (title === 'Soil Analysis Completed') title = 'मिट्टी विश्लेषण पूर्ण हुआ';
    else if (title === 'Leaf Scan Diagnostic') title = 'पत्ती स्कैन नैदानिक';
    else if (title === 'Yield Prediction Generated') title = 'उपज अनुमान जनरेट किया गया';
    else if (title === 'New Field Added') title = 'नया फ़ील्ड जोड़ा गया';
    else if (title === 'UI Alert') title = 'यूआई अलर्ट';
    else if (title === 'Critical Soil Moisture Drop') title = 'मिट्टी की नमी में भारी गिरावट';
    else if (title === 'Blight Risk Warning') title = 'ब्लाइट रोग जोखिम चेतावनी';
    else if (title === 'Organic Soybeans Market Surge') title = 'जैविक सोयाबीन बाजार में उछाल';
    else if (title === 'IoT Gateway Offline') title = 'IoT गेटवे ऑफ़लाइन';
    else if (title === 'Solar Pump Subsidies Launched') title = 'सौर पंप सब्सिडी शुरू';
    else if (title === 'Heavy Storm Forecast') title = 'भारी तूफान का पूर्वानुमान';
    else if (title === 'Perimeter Intrusion Detected') title = 'परिसर में अनधिकृत प्रवेश का पता चला';
    else if (title === 'AI Harvesting Windows') title = 'एआई कटाई समय';
    else if (title === 'Soil Acidification Warning') title = 'मिट्टी अम्लीकरण चेतावनी';

    let details = act.details;
    if (details.includes('pH:') && details.includes('Moisture:')) {
      details = details.replace('Moisture:', 'नमी:');
    } else if (details.includes('Confidence')) {
      details = details.replace('Confidence', 'विश्वसनीयता');
    } else if (details.startsWith('Expected: ') && details.includes('Tons/Acre')) {
      details = details.replace('Expected:', 'अपेक्षित:').replace('Tons/Acre', 'टन/एकड़');
    } else {
      details = translatePlainNotificationString(details, 'hi');
    }

    return {
      ...act,
      title,
      details
    };
  };

  // Asynchronous telemetry states
  const [soilHistory, setSoilHistory] = useState<any[]>([]);
  const [diseaseHistory, setDiseaseHistory] = useState<any[]>([]);
  const [yieldHistory, setYieldHistory] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Modal & selection states
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [cropType, setCropType] = useState(CROP_TYPES[0]);
  const [location, setLocation] = useState('');
  const [selectedLat, setSelectedLat] = useState<number | undefined>(undefined);
  const [selectedLon, setSelectedLon] = useState<number | undefined>(undefined);
  const [selectedDistrict, setSelectedDistrict] = useState<string | undefined>(undefined);
  const [selectedState, setSelectedState] = useState<string | undefined>(undefined);
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>(undefined);

  const [searchQueryLocation, setSearchQueryLocation] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  useEffect(() => {
    if (!searchQueryLocation || searchQueryLocation.length < 3) {
      setLocationResults([]);
      return;
    }
    if (searchQueryLocation === location) {
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setSearchingLocation(true);
      try {
        const res = await window.fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(searchQueryLocation)}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocationResults(data);
          setShowLocationSuggestions(true);
        }
      } catch (err) {
        console.error("Autocomplete Nominatim lookup failed", err);
      } finally {
        setSearchingLocation(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQueryLocation, location]);

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Filter toolbar states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCrop, setFilterCrop] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterHealth, setFilterHealth] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'area' | 'newest'>('newest');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch all related databases for digital twin correlation
  useEffect(() => {
    const fetchAllData = async () => {
      setLoadingData(true);
      try {
        const [soilRes, diseaseRes, yieldRes, notificationsRes] = await Promise.all([
          fetch(`/api/soil-analysis`),
          fetch(`/api/disease-history?userId=${user.id}`),
          fetch(`/api/yield-predictions?userId=${user.id}`),
          fetch(`/api/notifications?userId=${user.id}`)
        ]);

        const soil = await soilRes.json();
        const disease = await diseaseRes.json();
        const yieldData = await yieldRes.json();
        const notif = await notificationsRes.json();

        if (soil.success) setSoilHistory(soil.history || []);
        if (disease.success) setDiseaseHistory(disease.history || []);
        if (yieldData.success) setYieldHistory(yieldData.history || []);
        if (notif.success) setNotifications(notif.notifications || []);
      } catch (err) {
        console.error("Failed to load digital twin telemetry database", err);
      } finally {
        setLoadingData(false);
      }
    };

    if (user?.id) {
      fetchAllData();
    }
  }, [user?.id, farms]);

  // Farm Telemetry Correlator (One source of truth, no contradictions)
  const getFarmTelemetry = (farm: Farm) => {
    // 1. Soil Analysis
    const farmSoil = soilHistory
      .filter(s => s.farmId === farm.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latestSoil = farmSoil[0] || null;

    // 2. Leaf Diagnostics
    const farmDisease = diseaseHistory
      .filter(d => d.farmId === farm.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latestDisease = farmDisease[0] || null;

    // 3. Yield Prediction
    const farmYield = yieldHistory
      .filter(y => y.farmId === farm.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latestYield = farmYield[0] || null;

    // 4. Notifications
    const farmAlerts = notifications.filter(n => 
      n.message?.toLowerCase().includes(farm.name.toLowerCase()) || 
      n.title?.toLowerCase().includes(farm.name.toLowerCase())
    );
    const unreadAlertCount = farmAlerts.filter(n => !n.isRead).length;

    // Deterministic plantation metrics (bound to ID to prevent flickering)
    const idHash = farm.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const plantationDays = (idHash % 60) + 30; // 30-90 days passed
    const growthProgress = Math.min(100, Math.round((plantationDays / 90) * 100));

    let growthStage = 'Vegetative Stage';
    if (growthProgress < 20) growthStage = 'Seedling Emergence';
    else if (growthProgress < 45) growthStage = 'Vegetative Growth';
    else if (growthProgress < 70) growthStage = 'Flowering/Pollination';
    else if (growthProgress < 90) growthStage = 'Fruit/Grain Setting';
    else growthStage = 'Harvest Ready';

    const expectedHarvestDate = new Date();
    expectedHarvestDate.setDate(expectedHarvestDate.getDate() + (90 - plantationDays));

    // Real coordinates from database or offline simulations
    let gpsCoords = null;
    if (farm.latitude !== undefined && farm.longitude !== undefined) {
      const latDir = farm.latitude >= 0 ? 'N' : 'S';
      const lonDir = farm.longitude >= 0 ? 'E' : 'W';
      gpsCoords = `${Math.abs(farm.latitude).toFixed(4)}° ${latDir}, ${Math.abs(farm.longitude).toFixed(4)}° ${lonDir}`;
    } else if (farm.location.toLowerCase().includes('sacramento') || farm.location.toLowerCase().includes('ca')) {
      gpsCoords = "38.5816° N, 121.4944° W";
    } else if (farm.location.toLowerCase().includes('punjab') || farm.location.toLowerCase().includes('in')) {
      gpsCoords = "31.1471° N, 75.3412° E";
    } else if (farm.location.toLowerCase().includes('delhi')) {
      gpsCoords = "28.6139° N, 77.2090° E";
    } else if (farm.location.toLowerCase().includes('california')) {
      gpsCoords = "36.7783° N, 119.4179° W";
    } else {
      gpsCoords = 'Location not available';
    }

    // Resolving Season
    const month = new Date().getMonth();
    let season = 'Summer Season';
    if (month >= 10 || month <= 2) season = 'Rabi (Winter)';
    else if (month >= 6 && month <= 9) season = 'Kharif (Monsoon)';
    else season = 'Zaid (Spring)';

    // Telemetry variables
    const pH = latestSoil?.pH ?? farm.sensorData?.pH ?? null;
    const moisture = latestSoil?.moisture ?? farm.sensorData?.moisture ?? null;
    const temp = latestSoil?.temperature ?? farm.sensorData?.temperature ?? null;
    const humidity = latestSoil?.humidity ?? farm.sensorData?.humidity ?? null;
    const nitrogen = latestSoil?.nitrogen ?? null;
    const phosphorus = latestSoil?.phosphorus ?? null;
    const potassium = latestSoil?.potassium ?? null;
    const organicCarbon = latestSoil?.organicCarbon ?? null;

    // AI Health scoring calculations
    const soilHealthScore = latestSoil?.soilHealth ? latestSoil.soilHealth * 10 : 85;
    const diseaseRiskPenalties = latestDisease?.severity === 'Severe' ? 40 : latestDisease?.severity === 'Moderate' ? 15 : 0;
    const farmHealthScore = Math.max(15, Math.min(100, soilHealthScore - diseaseRiskPenalties));
    
    // Risk Level determination
    let riskLevel = 'Low';
    if (farmHealthScore < 50 || latestDisease?.severity === 'Severe' || farmAlerts.some(a => a.priority === 'high' && !a.isRead)) {
      riskLevel = 'High';
    } else if (farmHealthScore < 75 || latestDisease?.severity === 'Moderate') {
      riskLevel = 'Medium';
    }

    // Crop Condition
    let condition = 'Healthy';
    if (latestDisease?.severity === 'Severe') condition = 'Diseased';
    else if (latestDisease?.severity === 'Moderate') condition = 'Warning';

    // Yield Potential
    let yieldPotential = 'Good';
    if (farmHealthScore >= 85) yieldPotential = 'Excellent';
    else if (farmHealthScore < 60) yieldPotential = 'Below Average';

    // AI Confidence
    const yieldConfidence = latestYield?.confidence ?? 90;
    const diseaseConfidence = latestDisease?.confidence ? latestDisease.confidence * 100 : 92;
    const aiConfidence = Math.round((yieldConfidence + diseaseConfidence) / 2);

    // Timeline compiler
    const recentActivity = [
      ...(farmSoil.map((s: any) => ({
        title: 'Soil Analysis Completed',
        date: new Date(s.createdAt),
        details: `pH: ${s.pH} | Moisture: ${s.moisture}%`,
        icon: Activity,
        color: 'text-blue-400'
      }))),
      ...(farmDisease.map((d: any) => ({
        title: 'Leaf Scan Diagnostic',
        date: new Date(d.createdAt),
        details: `${localizeDiseaseName(d.diseaseName, language)} (${Math.round(d.confidence * 100)}% Confidence)`,
        icon: Leaf,
        color: 'text-purple-400'
      }))),
      ...(farmYield.map((y: any) => ({
        title: 'Yield Prediction Generated',
        date: new Date(y.createdAt),
        details: `Expected: ${y.predictedYield} Tons/Acre`,
        icon: TrendingUp,
        color: 'text-emerald-400'
      }))),
      ...(farmAlerts.map((a: any) => ({
        title: a.title || 'Notification Triggered',
        date: new Date(a.createdAt),
        details: a.message,
        icon: AlertTriangle,
        color: a.priority === 'high' ? 'text-rose-400' : 'text-amber-400'
      })))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    // Generate Contextual AI Insights
    const insights = {
      strengths: [] as string[],
      weaknesses: [] as string[],
      concerns: [] as string[],
      trends: [] as string[],
      actions: [] as string[],
      tasks: [] as string[]
    };

    // Strengths
    if (moisture && moisture >= 35 && moisture <= 65) insights.strengths.push("Ideal moisture retention across root sectors.");
    if (pH && pH >= 6.0 && pH <= 7.2) insights.strengths.push("Soil pH value is balanced for optimal nutrient ingestion.");
    if (nitrogen && nitrogen > 45) insights.strengths.push("High Nitrogen composition encouraging rich leaf growth.");
    if (insights.strengths.length === 0) insights.strengths.push("Uniform solar exposure monitored in field plots.");

    // Weaknesses
    if (moisture && moisture < 30) insights.weaknesses.push("Dehydrated soil plots mapped near southern perimeter.");
    if (potassium && potassium < 30) insights.weaknesses.push("Low Potassium distribution; potential flowering limits.");
    if (organicCarbon && organicCarbon < 0.6) insights.weaknesses.push("Sub-optimal Organic Carbon levels mapped in soil profile.");
    if (insights.weaknesses.length === 0) insights.weaknesses.push("Slight micro-nutrient deficiency recorded in history.");

    if (latestDisease) {
      insights.concerns.push(
        language === 'hi'
          ? `सक्रिय कवक बीजाणु स्कैन: ${localizeDiseaseName(latestDisease.diseaseName, 'hi')} पाया गया।`
          : `Active Spore Scan: ${localizeDiseaseName(latestDisease.diseaseName, 'en')} detected.`
      );
    }
    if (moisture && moisture < 20) insights.concerns.push("Extreme moisture stress risks crop wilting.");
    if (riskLevel === 'High') insights.concerns.push("High environmental telemetry warning flags active.");
    if (insights.concerns.length === 0) insights.concerns.push("No critical agricultural risks flagged currently.");

    // Trends
    insights.trends.push("Chlorophyll density indicators improved by 8% over last scans.");
    insights.trends.push("Telemetry stability matches model growth target curve.");

    // Actions
    if (moisture && moisture < 35) insights.actions.push("Activate emergency drip irrigation valve.");
    if (latestDisease) insights.actions.push(`Apply ${latestDisease.treatment?.split('.')[0] || 'fungicide spray'}.`);
    if (nitrogen && nitrogen < 35) insights.actions.push("Spread nitrogen fertilizer (NPK 12-32-16 ratio).");
    if (insights.actions.length === 0) insights.actions.push("Maintain current automated irrigation cycles.");

    // Tasks
    insights.tasks.push("Conduct weekly drone leaf diagnostic sweep.");
    insights.tasks.push("Validate soil moisture readings manually in 3 days.");

    return {
      latestSoil,
      latestDisease,
      latestYield,
      farmSoil,
      farmDisease,
      farmYield,
      farmAlerts,
      unreadAlertCount,
      plantationDays,
      growthProgress,
      growthStage,
      gpsCoords,
      season,
      pH,
      moisture,
      temp,
      humidity,
      nitrogen,
      phosphorus,
      potassium,
      organicCarbon,
      farmHealthScore,
      riskLevel,
      condition,
      yieldPotential,
      aiConfidence,
      recentActivity,
      insights,
      expectedHarvestDate
    };
  };

  // Pre-calculated stats for all farm digital twins
  const calculatedStats = useMemo(() => {
    if (farms.length === 0) {
      return {
        totalFarms: 0,
        activeTwins: 0,
        uniqueCrops: 0,
        totalArea: 0,
        avgHealth: 0,
        avgYield: 0,
        avgSoilScore: 0,
        avgAIConfidence: 0
      };
    }

    let healthSum = 0;
    let yieldSum = 0;
    let yieldCount = 0;
    let soilScoreSum = 0;
    let confidenceSum = 0;

    farms.forEach(f => {
      const data = getFarmTelemetry(f);
      healthSum += data.farmHealthScore;
      
      const yieldVal = data.latestYield?.predictedYield ?? f.sensorData?.predictedYield;
      if (yieldVal !== undefined) {
        yieldSum += parseFloat(yieldVal.toString());
        yieldCount++;
      }

      soilScoreSum += data.latestSoil?.soilHealth ? data.latestSoil.soilHealth * 10 : 85;
      confidenceSum += data.aiConfidence;
    });

    return {
      totalFarms: farms.length,
      activeTwins: farms.length,
      uniqueCrops: new Set(farms.map(f => f.cropType)).size,
      totalArea: farms.reduce((sum, f) => sum + f.area, 0),
      avgHealth: Math.round(healthSum / farms.length),
      avgYield: yieldCount > 0 ? (yieldSum / yieldCount).toFixed(1) : '0',
      avgSoilScore: Math.round(soilScoreSum / farms.length),
      avgAIConfidence: Math.round(confidenceSum / farms.length)
    };
  }, [farms, soilHistory, diseaseHistory, yieldHistory, notifications]);

  // Form management routines
  const resetForm = () => {
    setName('');
    setArea('');
    setCropType(CROP_TYPES[0]);
    setLocation('');
    setSelectedLat(undefined);
    setSelectedLon(undefined);
    setSelectedDistrict(undefined);
    setSelectedState(undefined);
    setSelectedCountry(undefined);
    setSearchQueryLocation('');
    setLocationResults([]);
    setShowLocationSuggestions(false);
    setImagePreview(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingId(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (farm: Farm, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setName(farm.name);
    setArea(farm.area.toString());
    setCropType(farm.cropType);
    setLocation(farm.location);
    setSelectedLat(farm.latitude);
    setSelectedLon(farm.longitude);
    setSelectedDistrict(farm.district);
    setSelectedState(farm.state);
    setSelectedCountry(farm.country);
    setSearchQueryLocation(farm.location);
    setImagePreview(null); 
    setEditingId(farm.id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !area || !cropType || !location) {
      showToast('Please fill in all fields.', 'error');
      return;
    }
    const areaVal = parseFloat(area);
    if (isNaN(areaVal) || areaVal <= 0) {
      showToast('Area must be a positive number.', 'error');
      return;
    }

    setLoadingData(true);
    try {
      if (editingId) {
        await onEditFarm(
          editingId, name, areaVal, cropType, location,
          selectedLat, selectedLon, selectedDistrict, selectedState, selectedCountry
        );
        showToast('Farm Digital Twin modified successfully!', 'success');
      } else {
        await onAddFarm(
          name, areaVal, cropType, location,
          selectedLat, selectedLon, selectedDistrict, selectedState, selectedCountry
        );
        showToast('Farm Digital Twin registered successfully!', 'success');
      }
      setIsFormOpen(false);
      resetForm();
    } catch (err: any) {
      showToast(err.message || 'Operation failed.', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoadingData(true);
    try {
      await onDeleteFarm(id);
      showToast('Farm digital twin deleted.', 'success');
      setDeleteConfirmId(null);
      if (selectedFarm?.id === id) {
        setSelectedFarm(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete digital twin.', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const getFarmImage = (crop: string) => {
    const map: Record<string, string> = {
      'Wheat': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&q=80',
      'Rice': 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=500&q=80',
      'Maize': 'https://images.unsplash.com/photo-1601002361660-f00e57c6b5b5?w=500&q=80',
      'Cotton': 'https://images.unsplash.com/photo-1596739343725-780829875e53?w=500&q=80',
      'Sugarcane': 'https://images.unsplash.com/photo-1626084050212-094191d4e414?w=500&q=80'
    };
    return map[crop] || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=500&q=80';
  };

  // Location filter choices list
  const locationOptions = useMemo(() => {
    const locs = farms.map(f => f.location);
    return Array.from(new Set(locs));
  }, [farms]);

  // Filtered and Sorted Digital Twin Farms List
  const filteredAndSortedFarms = useMemo(() => {
    let result = farms.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      f.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.cropType.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Crop filter
    if (filterCrop !== 'all') {
      result = result.filter(f => f.cropType === filterCrop);
    }

    // Location filter
    if (filterLocation !== 'all') {
      result = result.filter(f => f.location === filterLocation);
    }

    // Health score filter
    if (filterHealth !== 'all') {
      result = result.filter(f => {
        const tel = getFarmTelemetry(f);
        if (filterHealth === 'excellent') return tel.farmHealthScore >= 85;
        if (filterHealth === 'warning') return tel.farmHealthScore >= 60 && tel.farmHealthScore < 85;
        if (filterHealth === 'critical') return tel.farmHealthScore < 60;
        return true;
      });
    }

    // Risk filter
    if (filterRisk !== 'all') {
      result = result.filter(f => {
        const tel = getFarmTelemetry(f);
        return tel.riskLevel === filterRisk;
      });
    }
    
    // Sorting
    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'area') {
      result.sort((a, b) => b.area - a.area);
    } else {
      // Keep list order (newest registered)
    }

    return result;
  }, [farms, searchQuery, filterCrop, filterLocation, filterHealth, filterRisk, sortBy, soilHistory, diseaseHistory, yieldHistory, notifications]);

  // Adjust pagination index on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCrop, filterLocation, filterHealth, filterRisk, sortBy]);

  const paginatedFarms = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedFarms.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedFarms, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedFarms.length / itemsPerPage);

  // Selected correlated telemetry values
  const activeTwinData = selectedFarm ? getFarmTelemetry(selectedFarm) : null;

  return (
    <>
      {/* Toast Notification popup */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl ${
              toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
              toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
              'bg-[#121024]/90 border-white/10 text-purple-300'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : 
             toast.type === 'error' ? <AlertCircle className="h-5 w-5" /> : 
             <Sparkles className="h-5 w-5 text-[#D946EF]" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {!selectedFarm ? (
            <motion.div 
              key="list-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* TOP SUMMARY RIBBON */}
              {/* TOP SUMMARY RIBBON */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: t.totalFarms, value: calculatedStats.totalFarms, sub: t.registeredSites, icon: Layers, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
                  { label: t.activeDigitalTwins, value: `${calculatedStats.activeTwins}/${farms.length}`, sub: t.iotSyncActive, icon: Activity, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                  { label: t.cropTypes, value: calculatedStats.uniqueCrops, sub: t.diversityIndex, icon: Sprout, color: 'text-[#D946EF] bg-[#D946EF]/10 border-[#D946EF]/20' },
                  { label: t.totalArea, value: `${calculatedStats.totalArea.toFixed(1)} ${language === 'hi' ? 'एकड़' : 'ac'}`, sub: t.combinedCoverage, icon: MapIcon, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                  { label: t.averageFarmHealth, value: `${calculatedStats.avgHealth}%`, sub: t.aggregatedHealthIndex, icon: ShieldCheck, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
                  { label: t.averageExpectedYield, value: `${calculatedStats.avgYield} ${language === 'hi' ? 'टन/एकड़' : 't/ac'}`, sub: t.aggForecast, icon: TrendingUp, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
                  { label: t.averageSoilScore, value: `${calculatedStats.avgSoilScore}/100`, sub: t.npkCarbonAvg, icon: Zap, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                  { label: t.averageAIConfidence, value: `${calculatedStats.avgAIConfidence}%`, sub: t.diagnosticPrecision, icon: Sparkles, color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20' }
                ].map((stat, i) => (
                  <div key={i} className={`p-4 rounded-3xl border shadow-lg flex items-center justify-between group hover:bg-white/5 transition-all duration-300 ${stat.color}`}>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold block mb-1">{stat.label}</span>
                      <h4 className="text-2xl font-black text-white">{stat.value}</h4>
                      <span className="text-[9px] text-gray-400 mt-0.5 block">{stat.sub}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/5 group-hover:scale-110 transition-transform duration-300">
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                ))}
              </div>

              {/* FILTER TOOLBAR & SEARCH */}
              <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-xl space-y-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  {/* Search input */}
                  <div className="flex-1 min-w-[280px] relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder={t.searchPlaceholder}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-11 pl-11 pr-4 bg-black/40 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA] transition-colors"
                    />
                  </div>

                  {/* Add Field Trigger */}
                  <button
                    onClick={handleOpenAdd}
                    disabled={farms.length >= 12}
                    className="h-11 px-6 bg-gradient-to-r from-[#9333EA] to-[#C026D3] hover:shadow-lg hover:shadow-[#9333EA]/30 text-white rounded-2xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale focus:outline-none cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> {t.addFieldTwin}
                  </button>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  {/* Crop Filter */}
                  <div>
                    <select 
                      value={filterCrop} 
                      onChange={e => setFilterCrop(e.target.value)}
                      className="w-full h-10 bg-black/30 border border-white/10 rounded-xl px-3 text-white focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="all">{t.allCrops}</option>
                      {CROP_TYPES.map(crop => <option key={crop} value={crop}>{crop}</option>)}
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <select 
                      value={filterLocation} 
                      onChange={e => setFilterLocation(e.target.value)}
                      className="w-full h-10 bg-black/30 border border-white/10 rounded-xl px-3 text-white focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="all">{t.allLocations}</option>
                      {locationOptions.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  </div>

                  {/* Health Filter */}
                  <div>
                    <select 
                      value={filterHealth} 
                      onChange={e => setFilterHealth(e.target.value)}
                      className="w-full h-10 bg-black/30 border border-white/10 rounded-xl px-3 text-white focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="all">{t.allHealthScores}</option>
                      <option value="excellent">{t.excellentRange}</option>
                      <option value="warning">{t.warningRange}</option>
                      <option value="critical">{t.criticalRange}</option>
                    </select>
                  </div>

                  {/* Risk Filter */}
                  <div>
                    <select 
                      value={filterRisk} 
                      onChange={e => setFilterRisk(e.target.value)}
                      className="w-full h-10 bg-black/30 border border-white/10 rounded-xl px-3 text-white focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="all">{t.allRiskLevels}</option>
                      <option value="Low">{t.lowRisk}</option>
                      <option value="Medium">{t.mediumRisk}</option>
                      <option value="High">{t.highRisk}</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <select 
                      value={sortBy} 
                      onChange={e => setSortBy(e.target.value as any)}
                      className="w-full h-10 bg-black/30 border border-white/10 rounded-xl px-3 text-white focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="newest">{t.sortNewest}</option>
                      <option value="name">{t.sortName}</option>
                      <option value="area">{t.sortArea}</option>
                    </select>
                  </div>

                  {/* Clear Filter button */}
                  {((filterCrop !== 'all') || (filterLocation !== 'all') || (filterHealth !== 'all') || (filterRisk !== 'all') || searchQuery) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterCrop('all');
                        setFilterLocation('all');
                        setFilterHealth('all');
                        setFilterRisk('all');
                        showToast(language === 'hi' ? 'फ़िल्टर साफ़ किए गए' : 'Filters cleared', 'info');
                      }}
                      className="w-full h-10 bg-[#D946EF]/10 border border-[#D946EF]/20 hover:bg-[#D946EF]/20 text-[#D946EF] font-bold rounded-xl transition-all flex items-center justify-center gap-1 focus:outline-none cursor-pointer"
                    >
                      {t.resetFilters}
                    </button>
                  )}
                </div>
              </div>

              {/* FARM DIGITAL TWIN PROFILE CARDS GRID */}
              {filteredAndSortedFarms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedFarms.map((farm) => {
                    const telemetry = getFarmTelemetry(farm);
                    const lastUpdated = telemetry.recentActivity[0]?.date 
                      ? telemetry.recentActivity[0].date.toLocaleDateString()
                      : 'Not Yet Recorded';

                    return (
                      <motion.div 
                        key={farm.id}
                        layout
                        whileHover={{ y: -6, boxShadow: '0 20px 25px -5px rgba(147, 51, 234, 0.15)' }}
                        onClick={() => setSelectedFarm(farm)}
                        className="bg-[#121024]/70 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col cursor-pointer group"
                      >
                        {/* Hero Section */}
                        <div className="h-44 relative overflow-hidden">
                          <img 
                            src={getFarmImage(farm.cropType)} 
                            alt={farm.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0410] via-transparent to-black/40" />
                          
                          {/* Badges Overlay */}
                          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider backdrop-blur-md border ${
                              telemetry.farmHealthScore >= 80 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                              telemetry.farmHealthScore >= 60 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                              'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}>
                              {t.healthPrefix}: {telemetry.farmHealthScore}%
                            </span>
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider backdrop-blur-md border ${
                              telemetry.riskLevel === 'Low' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              telemetry.riskLevel === 'Medium' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                              'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}>
                              {t.riskPrefix}: {translateRisk(telemetry.riskLevel, language)}
                            </span>
                          </div>

                          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                            <div>
                              <h3 className="text-xl font-bold text-white mb-0.5 truncate tracking-tight">{farm.name}</h3>
                              <p className="text-[10px] text-gray-300 font-medium flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-[#D946EF]" /> {farm.location}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">
                              {translateGrowthStage(telemetry.growthStage, language)}
                            </span>
                          </div>
                        </div>

                        {/* Telemetry parameter blocks */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="bg-black/35 p-2 rounded-xl border border-white/5">
                              <span className="text-[8px] uppercase tracking-wider text-gray-400 block mb-0.5">{language === 'hi' ? 'नमी' : 'Moisture'}</span>
                              <span className="text-xs font-bold text-white">
                                {telemetry.moisture !== null ? `${telemetry.moisture}%` : t.noData}
                              </span>
                            </div>
                            <div className="bg-black/35 p-2 rounded-xl border border-white/5">
                              <span className="text-[8px] uppercase tracking-wider text-gray-400 block mb-0.5">{language === 'hi' ? 'तापमान' : 'Temp'}</span>
                              <span className="text-xs font-bold text-white">
                                {telemetry.temp !== null ? `${telemetry.temp}°C` : t.noData}
                              </span>
                            </div>
                            <div className="bg-black/35 p-2 rounded-xl border border-white/5">
                              <span className="text-[8px] uppercase tracking-wider text-gray-400 block mb-0.5">pH</span>
                              <span className="text-xs font-bold text-white">
                                {telemetry.pH !== null ? telemetry.pH : t.noData}
                              </span>
                            </div>
                            <div className="bg-black/35 p-2 rounded-xl border border-white/5">
                              <span className="text-[8px] uppercase tracking-wider text-gray-400 block mb-0.5">{t.yieldTargetPrefix}</span>
                              <span className="text-xs font-bold text-emerald-400">
                                {telemetry.latestYield ? `${telemetry.latestYield.predictedYield}t` : (farm.sensorData.predictedYield ? `${farm.sensorData.predictedYield}t` : t.noData)}
                              </span>
                            </div>
                          </div>

                          {/* Secondary diagnostics tags */}
                          <div className="flex items-center justify-between text-[10px] text-gray-400 border-t border-white/5 pt-3">
                            <span className="flex items-center gap-1"><Sprout className="h-3.5 w-3.5 text-green-400" /> {farm.cropType}</span>
                            <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5 text-blue-400" /> {farm.area} {language === 'hi' ? 'एकड़' : 'ac'}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-indigo-400" /> {t.syncLabel}: {lastUpdated === 'Not Yet Recorded' ? t.notYetRecorded : lastUpdated}</span>
                          </div>

                          {/* Card bottom triggers */}
                          <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <span className="text-[#D946EF] font-bold text-xs flex items-center gap-1 hover:underline">
                              {t.digitalTwinProfile} <ChevronRight className="h-4 w-4" />
                            </span>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => handleOpenEdit(farm, e)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors focus:outline-none"
                                title={t.modifyConfig}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(farm.id); }}
                                className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors focus:outline-none"
                                title={t.removeTwin}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center shadow-lg">
                  <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-1">{t.noMatchingFields}</h3>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto">
                    {t.adjustSearch}
                  </p>
                </div>
              )}

              {/* PAGINATION PANEL */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <div className="flex items-center gap-2 bg-[#121024]/80 border border-white/10 p-2 rounded-2xl">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors focus:outline-none"
                    >
                      <ChevronRight className="h-5 w-5 rotate-180" />
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all focus:outline-none ${
                          currentPage === i + 1 
                            ? 'bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white shadow-lg' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors focus:outline-none"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* DETAILED FARM PROFILE DRILL-DOWN PANEL */
            <motion.div 
              key="detail-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Back navigation bar */}
              <div className="flex items-center justify-between bg-[#121024]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg">
                <button 
                  onClick={() => setSelectedFarm(null)}
                  className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors focus:outline-none px-3 py-1.5 rounded-lg hover:bg-white/5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-sm font-bold">{t.backToFieldList}</span>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(selectedFarm)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-colors focus:outline-none border border-white/5"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-[#D946EF]" /> {t.modifyConfig}
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(selectedFarm.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-colors focus:outline-none"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t.removeTwin}
                  </button>
                </div>
              </div>

              {/* Cover hero section */}
              <div className="relative w-full h-64 md:h-80 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                <img 
                  src={getFarmImage(selectedFarm.cropType)} 
                  alt={selectedFarm.name} 
                  className="absolute inset-0 w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0410] via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full flex flex-wrap justify-between items-end gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#9333EA]/40 text-[#E9D5FF] border border-[#9333EA]/50 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                        {t.digitalTwinProfile}
                      </span>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${
                        activeTwinData!.farmHealthScore >= 80 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}>
                        {t.twinSyncActive}
                      </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">{selectedFarm.name}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300 font-semibold">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#D946EF]" /> {selectedFarm.location}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5 text-blue-400" /> {selectedFarm.area} {language === 'hi' ? 'एकड़' : 'Acres'}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      <span className="flex items-center gap-1"><Sprout className="h-3.5 w-3.5 text-emerald-400" /> {selectedFarm.cropType}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed profile dashboard grids */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main telemetry details */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Executive Summary Card */}
                  <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <ClipboardList className="h-4.5 w-4.5 text-[#D946EF]" /> {t.executiveSummary}
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {t('executiveSummaryText', {
                        name: selectedFarm.name,
                        health: activeTwinData!.farmHealthScore,
                        risk: translateRisk(activeTwinData!.riskLevel, language),
                        moisture: activeTwinData!.moisture !== null ? `${activeTwinData!.moisture}%` : t.noData,
                        pH: activeTwinData!.pH !== null ? activeTwinData!.pH : t.noData
                      })}
                    </p>
                  </div>

                  {/* Live sensor grid */}
                  <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Activity className="h-4.5 w-4.5 text-emerald-400 animate-pulse" /> {t.liveTelemetryStatus}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: language === 'hi' ? 'मिट्टी की नमी' : 'Soil Moisture', val: activeTwinData!.moisture !== null ? `${activeTwinData!.moisture}%` : t.noData, sub: language === 'hi' ? 'इष्टतम: 40-60%' : 'Optimal: 40-60%', icon: Droplets, color: 'text-blue-400 bg-blue-500/5' },
                        { label: language === 'hi' ? 'तापमान' : 'Temperature', val: activeTwinData!.temp !== null ? `${activeTwinData!.temp}°C` : t.noData, sub: language === 'hi' ? 'इष्टतम: 20-30°C' : 'Optimal: 20-30°C', icon: Thermometer, color: 'text-red-400 bg-red-500/5' },
                        { label: language === 'hi' ? 'आर्द्रता' : 'Humidity', val: activeTwinData!.humidity !== null ? `${activeTwinData!.humidity}%` : t.noData, sub: language === 'hi' ? 'इष्टतम: 50-70%' : 'Optimal: 50-70%', icon: Wind, color: 'text-indigo-400 bg-indigo-500/5 font-bold' },
                        { label: language === 'hi' ? 'मिट्टी का पीएच' : 'Soil pH', val: activeTwinData!.pH !== null ? activeTwinData!.pH : t.noData, sub: language === 'hi' ? 'इष्टतम: 6.0-7.2' : 'Optimal: 6.0-7.2', icon: Gauge, color: 'text-teal-400 bg-teal-500/5' },
                        { label: language === 'hi' ? 'नाइट्रोजन (N)' : 'Nitrogen (N)', val: activeTwinData!.nitrogen !== null ? `${activeTwinData!.nitrogen} mg/kg` : (language === 'hi' ? 'कोई डेटा उपलब्ध नहीं' : 'No Data Available'), sub: language === 'hi' ? 'कमी का स्कैन' : 'Deficiency scan', icon: Sprout, color: 'text-emerald-400 bg-emerald-500/5 col-span-2' },
                        { label: language === 'hi' ? 'फास्फोरस (P)' : 'Phosphorus (P)', val: activeTwinData!.phosphorus !== null ? `${activeTwinData!.phosphorus} mg/kg` : (language === 'hi' ? 'कोई डेटा उपलब्ध नहीं' : 'No Data Available'), sub: language === 'hi' ? 'अवशोषण की जांच' : 'Absorption check', icon: Zap, color: 'text-purple-400 bg-purple-500/5' },
                        { label: language === 'hi' ? 'पोटेशियम (K)' : 'Potassium (K)', val: activeTwinData!.potassium !== null ? `${activeTwinData!.potassium} mg/kg` : (language === 'hi' ? 'कोई डेटा उपलब्ध नहीं' : 'No Data Available'), sub: language === 'hi' ? 'टेलीमेट्री स्कैन' : 'Telemetry scan', icon: MapIcon, color: 'text-[#D946EF] bg-[#D946EF]/5' }
                      ].map((item, i) => (
                        <div key={i} className={`p-4 rounded-2xl border border-white/5 ${item.color} flex flex-col justify-between min-h-[100px]`}>
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block mb-1">{item.label}</span>
                            <span className="text-lg font-black text-white">{item.val}</span>
                          </div>
                          <span className="text-[8px] text-gray-400 block mt-2">{item.sub}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gauges & Visual meters section */}
                  <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Gauge className="h-4.5 w-4.5 text-purple-400" /> {t.twinCalibrationGauges}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Health radial progress gauge */}
                      <div className="bg-black/30 p-4 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-between">
                        <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider mb-3">{t.farmHealthScore}</span>
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="56" cy="56" r="48" className="stroke-white/5 fill-transparent" strokeWidth="8" />
                            <circle 
                              cx="56" cy="56" r="48" 
                              className="stroke-emerald-400 fill-transparent transition-all duration-1000" 
                              strokeWidth="8" 
                              strokeDasharray={2 * Math.PI * 48}
                              strokeDashoffset={2 * Math.PI * 48 * (1 - activeTwinData!.farmHealthScore / 100)}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-xl font-black text-white">{activeTwinData!.farmHealthScore}%</span>
                        </div>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md mt-4 font-bold uppercase tracking-wider">{translateCondition(activeTwinData!.condition, language)}</span>
                      </div>

                      {/* Yield slider gauge */}
                      <div className="bg-black/30 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                        <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider mb-3">{t.yieldForecastGauge}</span>
                        <div className="space-y-4">
                          <div className="flex justify-between items-end">
                            <span className="text-2xl font-black text-white">
                              {activeTwinData!.latestYield ? `${activeTwinData!.latestYield.predictedYield} ${language === 'hi' ? 'टन/एकड़' : 't/ac'}` : (selectedFarm.sensorData.predictedYield ? `${selectedFarm.sensorData.predictedYield} ${language === 'hi' ? 'टन/एकड़' : 't/ac'}` : t.noData)}
                            </span>
                            <span className="text-[9px] text-[#D946EF] font-bold">{language === 'hi' ? 'विश्वास' : 'Confidence'}: {activeTwinData!.aiConfidence}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#9333EA] to-[#C026D3]" style={{ width: `${activeTwinData!.aiConfidence}%` }} />
                          </div>
                          <p className="text-[9px] text-gray-400 leading-relaxed">
                            {language === 'hi' ? 'उपज मेट्रिक्स उच्च-विश्वास फसल प्रतिगमन मॉडल के साथ संरेखित हैं।' : 'Yield metrics align with high-confidence crop regression models.'}
                          </p>
                        </div>
                      </div>

                      {/* Threat Meter & Water indicator */}
                      <div className="bg-black/30 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                        <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider mb-3">{t.environmentalRiskIndex}</span>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className={`text-lg font-black ${
                              activeTwinData!.riskLevel === 'Low' ? 'text-green-400' :
                              activeTwinData!.riskLevel === 'Medium' ? 'text-amber-400' :
                              'text-rose-400'
                            }`}>{translateRisk(activeTwinData!.riskLevel, language)}</span>
                            <span className="text-[9px] text-gray-400">{language === 'hi' ? 'नमी' : 'Moisture'}: {activeTwinData!.moisture !== null ? `${activeTwinData!.moisture}%` : t.noData}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            <div className={`h-2 rounded-l-md ${activeTwinData!.riskLevel === 'Low' || activeTwinData!.riskLevel === 'Medium' || activeTwinData!.riskLevel === 'High' ? 'bg-green-500' : 'bg-white/10'}`} />
                            <div className={`h-2 ${activeTwinData!.riskLevel === 'Medium' || activeTwinData!.riskLevel === 'High' ? 'bg-amber-500' : 'bg-white/10'}`} />
                            <div className={`h-2 rounded-r-md ${activeTwinData!.riskLevel === 'High' ? 'bg-rose-500' : 'bg-white/10'}`} />
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
                            <Waves className="h-3.5 w-3.5 text-blue-400" />
                            <span>{language === 'hi' ? 'सिंचाई की आवश्यकता' : 'Irrigation requirement'}: {activeTwinData!.latestSoil?.recommendations ? (language === 'hi' ? 'उच्च' : 'High') : (language === 'hi' ? 'सामान्य' : 'Normal')}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Modules attached reports */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Soil report block */}
                    <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5"><Activity className="h-4 w-4 text-blue-400" /> {t.soilAnalysis}</h4>
                      {activeTwinData!.latestSoil ? (
                        <div className="space-y-2 text-xs">
                          <p className="text-gray-300 font-semibold">{language === 'hi' ? 'नमी' : 'Moisture'}: {activeTwinData!.latestSoil.moisture}%</p>
                          <p className="text-gray-400">pH: {activeTwinData!.latestSoil.pH} | {language === 'hi' ? 'स्वास्थ्य सूचकांक' : 'Health Index'}: {activeTwinData!.latestSoil.soilHealth}/10</p>
                          <button onClick={() => onNavigate?.('soil')} className="text-[#D946EF] font-bold text-[10px] mt-2 block hover:underline cursor-pointer">{t.openSoilAnalysis} &rarr;</button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400">{t.noSoilCompleted}</p>
                      )}
                    </div>

                    {/* Disease report block */}
                    <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5"><Leaf className="h-4 w-4 text-purple-400" /> {t.leafDiagnostics}</h4>
                      {activeTwinData!.latestDisease ? (
                        <div className="space-y-2 text-xs">
                          <p className="text-gray-300 font-semibold truncate">{language === 'hi' ? 'बीमारी' : 'Disease'}: {localizeDiseaseName(activeTwinData!.latestDisease.diseaseName, language)}</p>
                          <p className="text-gray-400">
                            {language === 'hi' ? 'गंभीरता' : 'Severity'}: {language === 'hi' ? (activeTwinData!.latestDisease.severity === 'Severe' ? 'गंभीर' : activeTwinData!.latestDisease.severity === 'Moderate' ? 'मध्यम' : 'कम') : (activeTwinData!.latestDisease.severity || 'Moderate')} ({Math.round(activeTwinData!.latestDisease.confidence * 100)}%)
                          </p>
                          <button onClick={() => onNavigate?.('disease')} className="text-[#D946EF] font-bold text-[10px] mt-2 block hover:underline cursor-pointer">{t.openLeafDiagnostics} &rarr;</button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400">{t.noLeafCompleted}</p>
                      )}
                    </div>

                    {/* Yield report block */}
                    <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-emerald-400" /> {t.yieldPrediction}</h4>
                      {activeTwinData!.latestYield ? (
                        <div className="space-y-2 text-xs">
                          <p className="text-gray-300 font-semibold">{language === 'hi' ? 'अनुमानित' : 'Predicted'}: {activeTwinData!.latestYield.predictedYield} {language === 'hi' ? 'टन/एकड़' : 't/ac'}</p>
                          <p className="text-gray-400">{language === 'hi' ? 'विश्वास' : 'Confidence'}: {activeTwinData!.latestYield.confidence}%</p>
                          <button onClick={() => onNavigate?.('yield')} className="text-[#D946EF] font-bold text-[10px] mt-2 block hover:underline cursor-pointer">{t.openYieldCalculator} &rarr;</button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400">{t.noYieldCompleted}</p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Side profile info column */}
                <div className="space-y-6">
                  
                  {/* Location & GPS Map visualizer */}
                  <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <MapIcon className="h-4.5 w-4.5 text-[#9333EA]" /> {t.fieldGPSMapping}
                    </h3>
                    <div className="w-full h-44 bg-black/40 rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center group cursor-pointer">
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#9333EA 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0410] to-transparent opacity-80" />
                      <div className="flex flex-col items-center justify-center z-10 transition-transform duration-300 group-hover:scale-105">
                        <MapPin className="h-8 w-8 text-[#D946EF] drop-shadow-[0_0_12px_rgba(217,70,239,0.8)]" />
                        <span className="text-xs font-black text-white mt-2 bg-black/60 px-3 py-1 rounded-xl border border-white/10 backdrop-blur-md">
                          {selectedFarm.location}
                        </span>
                        <span className="text-[9px] font-mono text-gray-400 mt-1">{t('gpsCoordsLabel', { gps: activeTwinData!.gpsCoords || t.gpsUnavailable })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Digital Twin Overview details */}
                  <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Sprout className="h-4.5 w-4.5 text-[#D946EF]" /> {t.twinCropOverview}
                    </h3>
                    <ul className="space-y-3.5 text-xs text-gray-300">
                      <li className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span>{t.cropSeason}</span>
                        <span className="font-bold text-white">{translateSeason(activeTwinData!.season, language)}</span>
                      </li>
                      <li className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span>{t.currentCropStage}</span>
                        <span className="font-bold text-[#E9D5FF]">{translateGrowthStage(activeTwinData!.growthStage, language)}</span>
                      </li>
                      <li className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span>{t.daysSincePlantation}</span>
                        <span className="font-bold text-white">{activeTwinData!.plantationDays} {t.daysUnit}</span>
                      </li>
                      <li className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span>{t.expectedHarvest}</span>
                        <span className="font-bold text-[#34D399]">{activeTwinData!.expectedHarvestDate.toLocaleDateString()}</span>
                      </li>
                      <li className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span>{t.lastIrrigation}</span>
                        <span className="font-bold text-white">{t.hoursAgo}</span>
                      </li>
                      <li className="flex justify-between items-center">
                        <span>{t.waterRequirement}</span>
                        <span className="font-bold text-[#38BDF8]">{t.waterGalAc}</span>
                      </li>
                    </ul>
                  </div>

                  {/* Quick actions panel redirect */}
                  <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Zap className="h-4.5 w-4.5 text-[#D946EF]" /> {t.twinCommands}
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      <button onClick={() => onNavigate?.('soil')} className="w-full py-2.5 bg-black/40 hover:bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-left px-3 flex items-center gap-2 transition-colors cursor-pointer">
                        <Droplets className="h-4 w-4 text-blue-400" /> {t.openSoilAnalysis}
                      </button>
                      <button onClick={() => onNavigate?.('disease')} className="w-full py-2.5 bg-black/40 hover:bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-left px-3 flex items-center gap-2 transition-colors cursor-pointer">
                        <Leaf className="h-4 w-4 text-purple-400" /> {t.openLeafDiagnostics}
                      </button>
                      <button onClick={() => onNavigate?.('yield')} className="w-full py-2.5 bg-black/40 hover:bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-left px-3 flex items-center gap-2 transition-colors cursor-pointer">
                        <TrendingUp className="h-4 w-4 text-emerald-400" /> {t.openYieldCalculator}
                      </button>
                      <button onClick={() => onNavigate?.('reports')} className="w-full py-2.5 bg-black/40 hover:bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-left px-3 flex items-center gap-2 transition-colors cursor-pointer">
                        <FileText className="h-4 w-4 text-[#D946EF]" /> {t.generateFullFarmReport}
                      </button>
                      <button onClick={() => onNavigate?.('notifications')} className="w-full py-2.5 bg-black/40 hover:bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-left px-3 flex items-center gap-2 transition-colors cursor-pointer">
                        <Bell className="h-4 w-4 text-rose-400" /> {t.viewNotifications}
                      </button>
                    </div>
                  </div>

                  {/* AI insights panel compiles strengths/weaknesses */}
                  <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Sparkles className="h-4.5 w-4.5 text-[#D946EF]" /> {t.aiDiagnosticInsights}
                    </h3>
                    
                    <div className="space-y-4 text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-emerald-400 block mb-1">{t.keyStrengths}</span>
                        <ul className="list-disc pl-4 space-y-1 text-gray-300">
                          {activeTwinData!.insights.strengths.map((s, idx) => <li key={idx}>{translateInsightText(s, language)}</li>)}
                        </ul>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase font-bold text-amber-400 block mb-1">{t.limitingWeaknesses}</span>
                        <ul className="list-disc pl-4 space-y-1 text-gray-300">
                          {activeTwinData!.insights.weaknesses.map((w, idx) => <li key={idx}>{translateInsightText(w, language)}</li>)}
                        </ul>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase font-bold text-rose-400 block mb-1">{t.criticalConcerns}</span>
                        <ul className="list-disc pl-4 space-y-1 text-gray-300">
                          {activeTwinData!.insights.concerns.map((c, idx) => <li key={idx}>{translateInsightText(c, language)}</li>)}
                        </ul>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase font-bold text-blue-400 block mb-1">{t.actionsNextTasks}</span>
                        <ul className="list-disc pl-4 space-y-1 text-gray-300">
                          {activeTwinData!.insights.actions.map((a, idx) => <li key={idx}>{translateInsightText(a, language)}</li>)}
                          {activeTwinData!.insights.tasks.map((taskItem, idx) => <li key={idx}>{translateInsightText(taskItem, language)}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Timeline recent activity visual stream */}
                  <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Clock className="h-4.5 w-4.5 text-purple-400" /> {t.recentActivity}
                    </h3>
                    {activeTwinData!.recentActivity.length === 0 ? (
                      <p className="text-xs text-gray-400">{t.noDiagnosticActivity}</p>
                    ) : (
                      <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10 pl-6">
                        {activeTwinData!.recentActivity.slice(0, 5).map((rawAct, idx) => {
                          const act = translateActivity(rawAct, language);
                          const Icon = act.icon;
                          return (
                            <div key={idx} className="relative space-y-0.5 text-xs">
                              <div className="absolute -left-6 top-0.5 p-1 bg-[#121024] rounded-full border border-white/10">
                                <Icon className={`h-3 w-3 ${act.color}`} />
                              </div>
                              <p className="font-bold text-white">{act.title}</p>
                              <p className="text-[10px] text-gray-400">{act.details}</p>
                              <p className="text-[9px] text-gray-500">{act.date.toLocaleDateString()}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CRUD REGISTER & EDIT MODALS */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121024] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-black text-white">
                  {editingId ? t.editFieldTwin : t.registerNewField}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-white transition-colors focus:outline-none cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
                {/* Upload Image box mock */}
                <label className="flex items-center gap-4 p-4 border border-dashed border-white/20 rounded-2xl bg-black/20 group hover:border-[#9333EA]/50 transition-colors cursor-pointer relative overflow-hidden">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                  )}
                  <div className="w-12 h-12 rounded-full bg-[#9333EA]/20 flex items-center justify-center group-hover:bg-[#9333EA]/40 transition-colors relative z-10">
                    <ImageIcon className="h-5 w-5 text-[#D946EF]" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-sm font-semibold text-white">{t.fieldCoverImage}</p>
                    <p className="text-xs text-gray-400">{imagePreview ? t.imageSelected : t.clickToUpload}</p>
                  </div>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-semibold text-[#E9D5FF] uppercase tracking-wider">{t.farmNameLabel}</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.farmNamePlaceholder}
                      className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-[#E9D5FF] uppercase tracking-wider">{t.areaLabel}</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder={t.areaPlaceholder}
                      className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-[#E9D5FF] uppercase tracking-wider">{t.cropTypeLabel}</label>
                    <select
                      value={cropType}
                      onChange={(e) => setCropType(e.target.value)}
                      className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#9333EA] appearance-none cursor-pointer"
                    >
                      {CROP_TYPES.map((c) => (
                        <option key={c} value={c} className="bg-[#121024]">{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2 relative">
                    <label className="text-[10px] font-semibold text-[#E9D5FF] uppercase tracking-wider">{t.locationLabel}</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={searchQueryLocation}
                        onChange={(e) => {
                          setSearchQueryLocation(e.target.value);
                          if (e.target.value !== location) {
                            setLocation('');
                          }
                        }}
                        placeholder={t.locationPlaceholder}
                        className="w-full h-11 pl-10 pr-10 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                      />
                      {searchingLocation && (
                        <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400 animate-spin" />
                      )}
                    </div>

                    {showLocationSuggestions && locationResults.length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-[#121024] border border-white/10 rounded-xl shadow-2xl divide-y divide-white/5 no-scrollbar">
                        {locationResults.map((item) => {
                          const county = item.address?.county || item.address?.state_district || item.address?.city || item.address?.town || '';
                          const state = item.address?.state || '';
                          const country = item.address?.country || '';
                          
                          return (
                            <button
                              key={item.place_id || item.osm_id}
                              type="button"
                              onClick={() => {
                                setLocation(item.display_name);
                                setSearchQueryLocation(item.display_name);
                                setSelectedLat(parseFloat(item.lat));
                                setSelectedLon(parseFloat(item.lon));
                                setSelectedDistrict(county);
                                setSelectedState(state);
                                setSelectedCountry(country);
                                setShowLocationSuggestions(false);
                                setLocationResults([]);
                              }}
                              className="w-full text-left px-4 py-3 text-xs text-gray-200 hover:bg-white/5 transition-colors focus:outline-none flex flex-col gap-0.5 cursor-pointer"
                            >
                              <span className="font-bold text-white truncate">{item.display_name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                Lat: {parseFloat(item.lat).toFixed(4)} | Lon: {parseFloat(item.lon).toFixed(4)}
                                {county ? ` | ${county}` : ''}
                                {state ? `, ${state}` : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors focus:outline-none cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-[#9333EA] to-[#C026D3] hover:shadow-lg hover:shadow-[#9333EA]/30 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2 focus:outline-none cursor-pointer"
                  >
                    {editingId ? t.saveChanges : t.createTwin}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Confirmation Alert Modal */}
        {deleteConfirmId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121024] border border-red-500/20 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center text-xs"
            >
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                <AlertTriangle className="h-7 w-7 text-red-500 animate-bounce" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">{t.deleteConfirmTitle}</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                {t.deleteConfirmDesc}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors focus:outline-none cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 hover:shadow-lg text-white rounded-xl font-bold transition-all active:scale-95 focus:outline-none cursor-pointer"
                >
                  {t.confirmDelete}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
