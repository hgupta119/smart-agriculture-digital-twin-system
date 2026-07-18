import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Download, Loader2, Calendar, Search, Filter, 
  ChevronDown, ArrowUpRight, BarChart2, PieChart as PieChartIcon,
  Activity, Leaf, Droplets, Target, Sparkles, Printer, Share2, 
  Star, MoreVertical, ShieldCheck, Trash2, ChevronLeft, ChevronRight,
  CheckCircle2, X, AlertTriangle, Archive, BookOpen, Clock, Pin, Compass, Info, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { User, Farm } from '../types';
import { fetch } from '../utils/api';
import { t as tr, localizeDiseaseName } from '../utils/i18n';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { translatePlainNotificationString } from './NotificationCenter';

interface ReportsProps {
  user: User;
  farms: Farm[];
  language?: 'en' | 'hi';
}

const reportsTrans: Record<'en' | 'hi', Record<string, string>> = {
  en: {
    reportsTitle: 'Farm Intelligence Hub',
    reportsSubtitle: 'Transforming multi-sensor digital twin logs and diagnostic assessments into unified agronomic intelligence.',
    aiPoweredAnalysis: 'AI-Powered Analytics',
    consultAIAgronomist: 'Consult AI Agronomist',
    consultingAI: 'Consulting AI...',
    print: 'Print',
    exportPDF: 'Export PDF',
    exportCSV: 'Export CSV',
    tabDashboard: 'Intelligence Dashboard',
    tabExplorer: 'Document Explorer',
    tabComparison: 'Comparison Sheet',
    tabTimeline: 'Chronological Timeline',
    aiSummaryTitle: 'AI Farm Performance Summary',
    overallFarmHealth: 'Overall Health',
    yield: 'Average Yield',
    diseaseStatus: 'Disease Status',
    waterEfficiency: 'Water Efficiency',
    systemRisk: 'System Risk Level',
    aiRecommendation: 'AI Overall Recommendation:',
    liveAssessment: 'Unified live telemetry assessment across all twin sectors',
    statusExcellent: '88/100 EXCELLENT',
    perfScore: 'Farm Perf. Score',
    activeWarning: 'Active Warning',
    medium: 'Medium',
    overallRecommendationText: 'Soil nitrogen retention and drip line efficiency are highly favorable. We recommend beginning biological fungicide sprays in North Field to mitigate blight risks forecasted due to local relative humidity trends (>80%). Postpone wheat harvesting by 3 days for maximum seed dry weight margins.',
    farmHealth: 'Farm Health',
    predictedYield: 'Predicted Yield',
    soil: 'Soil Analysis',
    disease: 'Disease Detection',
    weatherIndex: 'Weather Index',
    sustainability: 'Sustainability',
    excellentLabel: 'Excellent',
    averageLabel: 'Average',
    lowRiskLabel: 'Low Risk',
    stormWarningLabel: 'Storm Warning',
    optimalLabel: 'Optimal',
    reportsCount: 'Total Reports',
    avgAIAccuracy: 'Avg AI Quality',
    avgSoilScore: 'Avg Soil Health',
    commonPathogen: 'Common Pathogen',
    totalCrops: 'Total Crops',
    digitalTwins: 'Total Farm Twin Sites',
    avgExpectedYield: 'Avg Expected Yield',
    trendMappingTitle: 'Farm Telemetry Trend Mapping',
    chartYield: 'Yield',
    chartDisease: 'Disease',
    chartNutrients: 'Nutrients',
    chartSoil: 'Soil Health',
    chartWater: 'Water',
    chartRisk: 'Risk Index',
    noHistoricalReadings: 'No historical readings.',
    chartLabelYield: 'Yield (Tons)',
    chartLabelConfidence: 'Scanner Confidence (%)',
    chartLabelNPK: 'Avg NPK Level (mg/kg)',
    chartLabelSoilHealth: 'Soil Health Score',
    chartLabelMoisture: 'Soil Moisture (%)',
    chartLabelRiskRating: 'Risk rating index',
    chartLabelConfidenceEn: 'Confidence (%)',
    chartLabelRiskRatingEn: 'Risk Rating',
    aiInsightsDashboard: 'AI Insights Dashboard',
    mostCommonDisease: 'Most Common Disease',
    bestPerformingCrop: 'Best Performing Crop',
    worstPerformingCrop: 'Worst Performing Crop',
    mostFertileFarmSite: 'Most Fertile Farm Site',
    mostRecommendedFertilizer: 'Most Recommended Fertilizer',
    none: 'None',
    wheatSectorB: 'Wheat (Sector B)',
    tomatoZoneA: 'Tomato (Zone A)',
    northFarm: 'North Farm',
    npkFertilizer: 'NPK 12-32-16',
    aiAdvisoryTasks: 'AI Advisory Tasks',
    cropRotationNeeded: 'Crop Rotation Needed',
    cropRotationDesc: 'Repeat diagnostic scans indicate potential pest building patterns. Rotate wheat Sector B with legumes next season.',
    irrigationDeficitTitle: 'Irrigation Deficit in Orchard Site',
    irrigationDeficitDesc: 'Telemetry reports trace high soil dryness trends during afternoon periods. Boost irrigation cycles by 15 minutes.',
    optimizeNitrogenTitle: 'Optimize Nitrogen applications',
    optimizeNitrogenDesc: 'Soil analyses indicate high Nitrogen nitrogen density. Minimize urea fertilizer inputs to prevent chemical locks.',
    telemetryIntegrityCheck: 'Telemetry Integrity Check',
    allSensorsOnline: 'All telemetry sensors verified online.',
    searchPlaceholder: 'Try searching "Show tomato reports from July with high risk"',
    clearFilters: 'Clear Filters',
    allCategories: 'All Categories',
    allStatuses: 'All Statuses',
    allFarms: 'All Farms',
    allTime: 'All Time',
    last7Days: 'Last 7 Days',
    last30Days: 'Last 30 Days',
    thisYear: 'This Year',
    allRisks: 'All Risks',
    highRiskVal: 'High Risk (>70)',
    mediumRiskVal: 'Medium Risk (35-70)',
    lowRiskVal: 'Low Risk (<35)',
    allYields: 'All Yields',
    highYieldVal: 'High Yield (>80t)',
    avgYieldVal: 'Avg Yield (20t-80t)',
    lowYieldVal: 'Low Yield (<20t)',
    allAIScores: 'All AI Scores',
    excellentAIScore: 'Excellent (>90)',
    averageAIScore: 'Average (70-90)',
    lowAIScore: 'Low (<70)',
    recent: 'Recent',
    recentlyViewed: 'Recently Viewed',
    noReportsPreviewed: 'No reports previewed yet.',
    reportsSelected: '{count} Reports Selected',
    exportCSVBtn: 'Export CSV',
    exportExcelBtn: 'Export Excel',
    exportJSONBtn: 'Export JSON',
    mergeSelected: 'Merge Selected',
    deleteBtn: 'Delete',
    noAgriculturalReports: 'No Agricultural Reports Discovered',
    noRecordsMatched: 'No records matched the active filter options.',
    colDate: 'Date',
    colCategory: 'Category',
    colDetails: 'Parameters & Details',
    colQuality: 'Report Quality Score',
    colActions: 'Actions',
    preview: 'Preview',
    showingEntries: 'Showing {start} to {end} of {total} entries',
    scoreLabel: 'Score',
    confLabel: 'Conf',
    riskLabel: 'Risk',
    aiGenerated: 'AI Generated',
    tagHealthy: 'Healthy',
    tagLowMoisture: 'Low Moisture',
    tagNutrientDeficit: 'Nutrient Deficit',
    tagCritical: 'Critical',
    tagFungalDisease: 'Fungal Disease',
    tagExcellentYield: 'Excellent Yield',
    tagHighConfidence: 'High Confidence',
    compareSheetTitle: 'Reports Comparison Sheet',
    compareSheetSubtitle: 'Select multiple reports in Document Explorer to generate diagnostic side-by-side progression tracking.',
    compileUnifiedPDF: 'Compile Unified PDF',
    comparePlaceholderTitle: 'Select 2 or more reports from the **Document Explorer** to run dynamic comparisons.',
    goToExplorer: 'Go to Document Explorer',
    comparisonTitle: 'Report Comparison',
    comparisonSubtitle: 'Compare AI reports across farms and time.',
    comparisonEmptyState: 'Select two reports to compare.',
    goExplorer: 'Open Document Explorer',
    trySearchPlaceholder: 'Search reports...',
    recentLabel: 'Recent',
    previewLabel: 'Preview',
    colParameters: 'Parameters',
    colQualityScore: 'Quality Score',
    reportNum: 'REPORT #{num}',
    soilMetricChanges: 'Soil Metric Changes:',
    pHLevel: 'pH Level',
    moisture: 'Moisture',
    diseaseAndSeverity: 'Disease & Severity:',
    detectedPathogen: 'Detected Pathogen',
    severityClassification: 'Severity Classification',
    yieldOutputs: 'Yield Outputs:',
    cropType: 'Crop Type',
    yieldOutput: 'Yield Output',
    aiObservations: 'AI Observations:',
    soilObservationsFallback: 'Nitrogen values are optimal. Maintain drip irrigation timings.',
    diseaseObservationsFallback: 'Traces of {diseaseName} detected. Apply biological treatments.',
    yieldObservationsFallback: 'Climate stability indicators suggest optimal canopy growth.',
    timelineTitle: 'Chronological Farm Timeline',
    timelineSubtitle: 'Telemetry diagnostic sequence mapped over time.',
    noTimelineEvents: 'No timeline events logged.',
    soilTimelineText: 'Analyzed soil moisture levels ({moisture}%) and pH ({pH}) for {farmName}',
    diseaseTimelineText: 'Executed scan diagnostics. Pathogen detected: {diseaseName} with {confidence}% confidence',
    yieldTimelineText: 'Calculated expected production metrics for {cropType}. Projected yield output: {predictedYield} tons',
    intelligencePreview: '{farmName} Intelligence Preview',
    refLabel: 'REF',
    qualityRating: 'Quality Rating',
    aiOverallConfidence: 'AI Confidence',
    systemRiskIndex: 'System Risk Index',
    dateCompiled: 'Date Compiled',
    aiDiagnosticsRec: 'AI Diagnostics Recommendation',
    soilRecFallback: 'NPK and acidity indexes are optimal. Boost irrigation during direct sunlight hours.',
    diseaseRecFallback: 'Traces of {diseaseName} detected. Apply biological treatments immediately.',
    yieldRecFallback: 'Canopy coverage is at maximum capacity. Expected harvest timings are normal.',
    agronomyTelemetry: 'Agronomy Parameter Telemetry',
    parameterSoilPH: 'Soil pH Level',
    parameterMoisture: 'Moisture Content',
    parameterNitrogen: 'Nitrogen (N)',
    parameterPhosphorus: 'Phosphorus (P)',
    parameterPotassium: 'Potassium (K)',
    parameterSeverity: 'Severity Level',
    parameterTreatment: 'Treatment Plan',
    parameterIntegrity: 'EXIF Scan Image Integrity',
    verifiedOriginal: 'Verified Original',
    parameterPlantedArea: 'Planted Area Size',
    parameterErrorMargin: 'Error Margin Variance',
    closePreview: 'Close Preview',
    downloadPDFReport: 'Download PDF Report',
    chatConsultingToast: 'Consulting Gemini AI agronomist...',
    chatGeneratingSuccessToast: 'AI Insights report generated successfully!',
    chatGeneratingFailedToast: 'AI generation failed: {error}',
    chatSaveFailedToast: 'Failed to save generated report.',
    chatErrorToast: 'Error generating AI report',
    chatNoFarmsToast: 'Please add at least one farm site to generate AI Insights.',
    bookmarkAdded: 'Added to Bookmarks',
    bookmarkRemoved: 'Removed from Bookmarks',
    reportPinned: 'Report pinned for quick access',
    reportUnpinned: 'Report unpinned',
    reportArchived: 'Report archived successfully',
    reportRestored: 'Report restored from archive',
    reportDeleted: 'Report deleted successfully',
    bulkDeleted: 'Deleted {count} reports',
    mergeSelectAlert: 'Please select at least 2 reports to merge.',
    mergingToast: 'Merging selected reports into complete farm digest...',
    mergeSuccessToast: 'Unified Farm Report PDF downloaded successfully',
    mergeFailedToast: 'Failed to merge reports: {error}',
    failedLoadLiveReports: 'Failed to load live reports data.',
    pdfTitle: 'UNIFIED FARM INTELLIGENCE REPORT',
    pdfPlatformName: 'Smart Agriculture Analytics Platform',
    pdfFarmerUser: 'Farmer/User: {name}',
    pdfRegisteredEmail: 'Registered Email: {email}',
    pdfCompiledOn: 'Compiled on: {date}',
    pdfDocCount: 'Consolidated documents count: {count}',
    pdfConfidential: 'Confidential - Internal Farm Logistics Use Only',
    pdfTOC: 'Table of Contents',
    pdfSectionHeader: 'SECTION {num}: {type}',
    pdfFarmSite: 'Farm Site: {farmName} | Date: {date}',
    pdfFindingsHeader: 'Detailed Findings & AI Recommendations',
    pdfSoilPH: 'pH Value: {pH}',
    pdfSoilMoisture: 'Moisture Ratio: {moisture}%',
    pdfSoilNPK: 'Primary Nutrients (N/P/K): {n}/{p}/{k} mg/kg',
    pdfSoilOC: 'Organic Carbon Ratio: {oc}%',
    pdfSoilRec: 'Telemetry Recommendations: {recs}',
    pdfDiseasePathogen: 'Detected Pathogen/Anomaly: {disease}',
    pdfDiseaseSeverity: 'Severity Level: {severity}',
    pdfDiseaseTreatment: 'Diagnostic Treatment Strategy: {treatment}',
    pdfDiseasePrevention: 'Agronomic Prevention Advisory: {prevention}',
    pdfYieldCrop: 'Cultivated Crop Type: {crop}',
    pdfYieldArea: 'Fields Planted Area: {area} acres',
    pdfYieldOutput: 'AI Expected Yield Output: {yield} tons',
    pdfYieldRationale: 'Scientific Rationale: The models indicate that nitrogen preservation and uniform solar levels will contribute to maximum potential production.',
    pdfVerificationHeader: 'UNIFIED FARM INTELLIGENCE REPORT - SIGNATURES & VERIFICATION',
    pdfVerificationText: 'This compiled dossier contains multi-sensor digital twin logs and diagnostic recommendations generated automatically using artificial intelligence models. All recommendations should be checked prior to chemical treatment application.',
    pdfFarmerSignature: 'Lead Farmer/Operator Signature',
    pdfAISignature: 'Antigravity Agronomist AI Verification',
    pdfFooterText: 'Page {i} of {totalPages} | Unified Farm Report | Powered by Gemini AI',
    pdfSingleCompiling: 'Compiling secure PDF telemetry document...',
    pdfSingleSubtitle: 'Report',
    pdfSingleMetadataHeader: '1. Document Metadata & Analysis Scores',
    pdfSingleTargetTwin: 'Target Farm Twin: {farm}',
    pdfSingleQualityScore: 'AI Overall Quality Score: {score}/100',
    pdfSingleConfidence: 'AI Prediction Confidence: {conf}%',
    pdfSingleRisk: 'Environmental Risk Factor: {risk}/100',
    pdfSingleFindingsHeader: '2. Technical Diagnostics & Telemetry Findings',
    pdfSingleCheckHeader: '3. Security Sign-off & Verification Code',
    pdfSingleTimestamp: 'Verification Timestamp: {time}',
    pdfSingleDigitalSignoff: 'Digital Sign-off: SYSTEM_VERIFIED_AI',
    pdfSingleFooterText: 'Page {i} of {totalPages} | {type} Report | Powered by Gemini AI',
    pdfSingleSuccess: 'PDF compiled and downloaded successfully',
  },
  hi: {
    reportsTitle: 'कृषि खुफिया हब',
    reportsSubtitle: 'मल्टी-सेंसर डिजिटल ट्विन लॉग और नैदानिक आकलन को एकीकृत कृषि खुफिया में बदलना।',
    aiPoweredAnalysis: 'एआई-संचालित विश्लेषण',
    consultAIAgronomist: 'एआई कृषि विज्ञानी से परामर्श लें',
    consultingAI: 'एआई से परामर्श कर रहे हैं...',
    print: 'प्रिंट',
    exportPDF: 'पीडीएफ निर्यात करें',
    exportCSV: 'सीएसवी निर्यात करें',
    tabDashboard: 'खुफिया डैशबोर्ड',
    tabExplorer: 'दस्तावेज़ एक्सप्लोरर',
    tabComparison: 'तुलना पत्रक',
    tabTimeline: 'कालानुक्रमिक समयरेखा',
    aiSummaryTitle: 'एआई फार्म प्रदर्शन सारांश',
    overallFarmHealth: 'कुल मिलाकर स्वास्थ्य',
    yield: 'औसत उपज',
    diseaseStatus: 'रोग की स्थिति',
    waterEfficiency: 'जल दक्षता',
    systemRisk: 'सिस्टम जोखिम स्तर',
    aiRecommendation: 'एआई समग्र सिफारिश:',
    liveAssessment: 'सभी ट्विन क्षेत्रों में एकीकृत लाइव टेलीमेट्री मूल्यांकन',
    statusExcellent: '88/100 उत्कृष्ट',
    perfScore: 'फार्म प्रदर्शन स्कोर',
    activeWarning: 'सक्रिय चेतावनी',
    medium: 'मध्यम',
    overallRecommendationText: 'मिट्टी में नाइट्रोजन प्रतिधारण और ड्रिप लाइन दक्षता अत्यधिक अनुकूल हैं। हम उत्तर क्षेत्र में जैविक कवकनाशी स्प्रे शुरू करने की सलाह देते हैं ताकि स्थानीय सापेक्ष आर्द्रता प्रवृत्तियों (>80%) के कारण अनुमानित झुलसा रोग के खतरों को कम किया जा सके। अधिकतम बीज शुष्क भार मार्जिन के लिए गेहूं की कटाई को 3 दिनों के लिए टाल दें।',
    farmHealth: 'फार्म स्वास्थ्य',
    predictedYield: 'अपेक्षित उपज',
    soil: 'मिट्टी विश्लेषण',
    disease: 'रोग निदान',
    weatherIndex: 'मौसम सूचकांक',
    sustainability: 'सततता (सस्टेनेबिलिटी)',
    excellentLabel: 'उत्कृष्ट',
    averageLabel: 'औसत',
    lowRiskLabel: 'कम जोखिम',
    stormWarningLabel: 'तूफान की चेतावनी',
    optimalLabel: 'इष्टतम',
    reportsCount: 'कुल रिपोर्ट',
    avgAIAccuracy: 'औसत एआई गुणवत्ता',
    avgSoilScore: 'औसत मिट्टी स्वास्थ्य',
    commonPathogen: 'सामान्य रोगजनक',
    totalCrops: 'कुल फसलें',
    digitalTwins: 'कुल फार्म ट्विन साइट्स',
    avgExpectedYield: 'औसत अपेक्षित उपज',
    trendMappingTitle: 'फार्म टेलीमेट्री ट्रेंड मैपिंग',
    chartYield: 'उपज',
    chartDisease: 'रोग',
    chartNutrients: 'पोषक तत्व',
    chartSoil: 'मिट्टी स्वास्थ्य',
    chartWater: 'पानी',
    chartRisk: 'जोखिम सूचकांक',
    noHistoricalReadings: 'कोई ऐतिहासिक रीडिंग नहीं।',
    chartLabelYield: 'उपज (टन)',
    chartLabelConfidence: 'स्कैनर विश्वसनीयता (%)',
    chartLabelNPK: 'औसत NPK स्तर (mg/kg)',
    chartLabelSoilHealth: 'मिट्टी स्वास्थ्य स्कोर',
    chartLabelMoisture: 'मिट्टी की नमी (%)',
    chartLabelRiskRating: 'जोखिम रेटिंग सूचकांक',
    chartLabelConfidenceEn: 'विश्वास (%)',
    chartLabelRiskRatingEn: 'जोखिम रेटिंग',
    aiInsightsDashboard: 'एआई अंतर्दृष्टि डैशबोर्ड',
    mostCommonDisease: 'सबसे आम बीमारी',
    bestPerformingCrop: 'सर्वश्रेष्ठ प्रदर्शन करने वाली फसल',
    worstPerformingCrop: 'सबसे खराब प्रदर्शन करने वाली फसल',
    mostFertileFarmSite: 'सबसे उपजाऊ फार्म स्थल',
    mostRecommendedFertilizer: 'सबसे अनुशंसित उर्वरक',
    none: 'कोई नहीं',
    wheatSectorB: 'गेहूं (सेक्टर B)',
    tomatoZoneA: 'टमाटर (ज़ोन A)',
    northFarm: 'उत्तर फार्म',
    npkFertilizer: 'NPK 12-32-16',
    aiAdvisoryTasks: 'एआई सलाहकार कार्य',
    cropRotationNeeded: 'फसल चक्रण आवश्यक',
    cropRotationDesc: 'बार-बार किए गए नैदानिक स्कैन संभावित कीट निर्माण पैटर्न का संकेत देते हैं। अगले सीजन में गेहूं सेक्टर B को फलियों के साथ बदलें।',
    irrigationDeficitTitle: 'ऑर्चर्ड स्थल में सिंचाई की कमी',
    irrigationDeficitDesc: 'टेलीमेट्री रिपोर्ट दोपहर की अवधि के दौरान उच्च मिट्टी के सूखेपन के रुझान को दर्शाती है। सिंचाई चक्र को 15 मिनट बढ़ाएं।',
    optimizeNitrogenTitle: 'नाइट्रोजन अनुप्रयोगों को अनुकूलित करें',
    optimizeNitrogenDesc: 'मिट्टी का विश्लेषण उच्च नाइट्रोजन घनत्व को दर्शाता है। रासायनिक अवरोधों को रोकने के लिए यूरिया उर्वरक इनपुट को कम करें।',
    telemetryIntegrityCheck: 'टेलीमेट्री अखंडता जांच',
    allSensorsOnline: 'सभी टेलीमेट्री सेंसर ऑनलाइन सत्यापित।',
    searchPlaceholder: 'खोजने का प्रयास करें "जुलाई से उच्च जोखिम वाली टमाटर रिपोर्ट दिखाएं"',
    clearFilters: 'फ़िल्टर साफ़ करें',
    allCategories: 'सभी श्रेणियां',
    allStatuses: 'सभी स्थितियां',
    allFarms: 'सभी फार्म',
    allTime: 'सभी समय',
    last7Days: 'पिछले 7 दिन',
    last30Days: 'पिछले 30 दिन',
    thisYear: 'इस वर्ष',
    allRisks: 'सभी जोखिम स्तर',
    highRiskVal: 'उच्च जोखिम (>70)',
    mediumRiskVal: 'मध्यम जोखिम (35-70)',
    lowRiskVal: 'कम जोखिम (<35)',
    allYields: 'सभी उपज स्तर',
    highYieldVal: 'उच्च उपज (>80t)',
    avgYieldVal: 'औसत उपज (20t-80t)',
    lowYieldVal: 'कम उपज (<20t)',
    allAIScores: 'सभी एआई स्कोर',
    excellentAIScore: 'उत्कृष्ट (>90)',
    averageAIScore: 'औसत (70-90)',
    lowAIScore: 'कम (<70)',
    recent: 'हाल ही का',
    recentlyViewed: 'हाल ही में देखे गए',
    noReportsPreviewed: 'अभी तक कोई रिपोर्ट प्रीव्यू नहीं की गई है।',
    reportsSelected: '{count} रिपोर्ट चयनित',
    exportCSVBtn: 'सीएसवी निर्यात करें',
    exportExcelBtn: 'एक्सेल निर्यात करें',
    exportJSONBtn: 'जेएसओएन निर्यात करें',
    mergeSelected: 'चयनित मर्ज करें',
    deleteBtn: 'हटाएं',
    noAgriculturalReports: 'कोई कृषि रिपोर्ट नहीं मिली',
    noRecordsMatched: 'सक्रिय फ़िल्टर विकल्पों से कोई रिकॉर्ड मेल नहीं खाता।',
    colDate: 'तारीख',
    colCategory: 'श्रेणी',
    colDetails: 'मापदंड और विवरण',
    colQuality: 'रिपोर्ट गुणवत्ता स्कोर',
    colActions: 'कार्रवाई',
    preview: 'पूर्वावलोकन',
    showingEntries: '{total} प्रविष्टियों में से {start} से {end} तक दिखाई जा रही हैं',
    scoreLabel: 'स्कोर',
    confLabel: 'विश्वास',
    riskLabel: 'जोखिम',
    aiGenerated: 'एआई जनरेटेड',
    tagHealthy: 'स्वस्थ',
    tagLowMoisture: 'कम नमी',
    tagNutrientDeficit: 'पोषक तत्वों की कमी',
    tagCritical: 'गंभीर',
    tagFungalDisease: 'कवक रोग',
    tagExcellentYield: 'उत्कृष्ट उपज',
    tagHighConfidence: 'उच्च आत्मविश्वास',
    compareSheetTitle: 'रिपोर्ट्स तुलना पत्रक',
    compareSheetSubtitle: 'डॉक्यूमेंट एक्सप्लोरर में कई रिपोर्ट चुनें ताकि साइड-बाय-साइड प्रगति ट्रैकिंग जनरेट की जा सके।',
    compileUnifiedPDF: 'एकीकृत पीडीएफ संकलित करें',
    comparePlaceholderTitle: 'गतिशील तुलना चलाने के लिए **दस्तावेज़ एक्सप्लोरर** से 2 या अधिक रिपोर्ट का चयन करें।',
    goToExplorer: 'दस्तावेज़ एक्सप्लोरर पर जाएं',
    comparisonTitle: 'रिपोर्ट तुलना',
    comparisonSubtitle: 'विभिन्न रिपोर्टों की तुलना करें।',
    comparisonEmptyState: 'तुलना के लिए दो रिपोर्ट चुनें।',
    goExplorer: 'दस्तावेज़ एक्सप्लोरर खोलें',
    trySearchPlaceholder: 'रिपोर्ट खोजें...',
    recentLabel: 'हाल ही में',
    previewLabel: 'पूर्वावलोकन',
    colParameters: 'पैरामीटर',
    colQualityScore: 'गुणवत्ता स्कोर',
    reportNum: 'रिपोर्ट #{num}',
    soilMetricChanges: 'मिट्टी मीट्रिक परिवर्तन:',
    pHLevel: 'पीएच स्तर',
    moisture: 'नमी',
    diseaseAndSeverity: 'रोग और गंभीरता:',
    detectedPathogen: 'पता चला रोगजनक',
    severityClassification: 'गंभीरता वर्गीकरण',
    yieldOutputs: 'उपज परिणाम:',
    cropType: 'फसल का प्रकार',
    yieldOutput: 'उपज उत्पादन',
    aiObservations: 'एआई अवलोकन:',
    soilObservationsFallback: 'नाइट्रोजन मान अनुकूलतम हैं। ड्रिप सिंचाई समय बनाए रखें।',
    diseaseObservationsFallback: 'ट्रेस {diseaseName} पाया गया। जैविक उपचार लागू करें।',
    yieldObservationsFallback: 'जलवायु स्थिरता संकेतक अनुकूलतम चंदवा विकास का सुझाव देते हैं।',
    timelineTitle: 'कालानुक्रमिक फार्म समयरेखा',
    timelineSubtitle: 'समय के साथ मैप किया गया टेलीमेट्री डायग्नोस्टिक अनुक्रम।',
    noTimelineEvents: 'कोई समयरेखा घटना दर्ज नहीं की गई।',
    soilTimelineText: '{farmName} के लिए मिट्टी की नमी का स्तर ({moisture}%) और पीएच ({pH}) विश्लेषण किया गया',
    diseaseTimelineText: 'स्कैन डायग्नोस्टिक्स निष्पादित। रोगजनक का पता चला: {diseaseName} {confidence}% विश्वसनीयता के साथ',
    yieldTimelineText: '{cropType} के लिए अपेक्षित उत्पादन मेट्रिक्स की गणना की गई। अनुमानित उपज उत्पादन: {predictedYield} टन',
    intelligencePreview: '{farmName} इंटेलिजेंस पूर्वावलोकन',
    refLabel: 'संदर्भ',
    qualityRating: 'गुणवत्ता रेटिंग',
    aiOverallConfidence: 'एआई आत्मविश्वास',
    systemRiskIndex: 'सिस्टम जोखिम सूचकांक',
    dateCompiled: 'संकलित तिथि',
    aiDiagnosticsRec: 'एआई डायग्नोस्टिक्स सिफारिश',
    soilRecFallback: 'NPK और अम्लता सूचकांक इष्टतम हैं। सीधी धूप के घंटों के दौरान सिंचाई बढ़ाएं।',
    diseaseRecFallback: 'ट्रेस {diseaseName} पाया गया। तुरंत जैविक उपचार लागू करें।',
    yieldRecFallback: 'कैनोपी कवरेज अधिकतम क्षमता पर है। अपेक्षित कटाई का समय सामान्य है।',
    agronomyTelemetry: 'कृषि पैरामीटर टेलीमेट्री',
    parameterSoilPH: 'मिट्टी का पीएच स्तर',
    parameterMoisture: 'नमी की मात्रा',
    parameterNitrogen: 'नाइट्रोजन (N)',
    parameterPhosphorus: 'फास्फोरस (P)',
    parameterPotassium: 'पोटेशियम (K)',
    parameterSeverity: 'गंभीरता स्तर',
    parameterTreatment: 'उपचार योजना',
    parameterIntegrity: 'EXIF स्कैन छवि अखंडता',
    verifiedOriginal: 'सत्यापित मूल',
    parameterPlantedArea: 'रोपित क्षेत्र का आकार',
    parameterErrorMargin: 'त्रुटि मार्जिन भिन्नता',
    closePreview: 'पूर्वावलोकन बंद करें',
    downloadPDFReport: 'डाउनलोड पीडीएफ रिपोर्ट',
    chatConsultingToast: 'जेमिनी एआई कृषि विज्ञानी से परामर्श कर रहे हैं...',
    chatGeneratingSuccessToast: 'एआई अंतर्दृष्टि रिपोर्ट सफलतापूर्वक तैयार की गई!',
    chatGeneratingFailedToast: 'एआई जनरेशन विफल: {error}',
    chatSaveFailedToast: 'तैयार रिपोर्ट को सहेजने में विफल।',
    chatErrorToast: 'एआई रिपोर्ट जनरेट करने में त्रुटि',
    chatNoFarmsToast: 'कृपया एआई अंतर्दृष्टि उत्पन्न करने के लिए कम से कम एक फार्म साइट जोड़ें।',
    bookmarkAdded: 'बुकमार्क में जोड़ा गया',
    bookmarkRemoved: 'बुकमार्क से हटाया गया',
    reportPinned: 'त्वरित पहुंच के लिए रिपोर्ट पिन की गई',
    reportUnpinned: 'रिपोर्ट अनपिन की गई',
    reportArchived: 'रिपोर्ट सफलतापूर्वक संग्रहीत की गई',
    reportRestored: 'संग्रह से रिपोर्ट पुनर्स्थापित की गई',
    reportDeleted: 'रिपोर्ट सफलतापूर्वक हटा दी गई',
    bulkDeleted: '{count} रिपोर्ट हटा दी गईं',
    mergeSelectAlert: 'मर्ज करने के लिए कृपया कम से कम 2 रिपोर्ट चुनें।',
    mergingToast: 'चयनित रिपोर्ट को पूर्ण फार्म डाइजेस्ट में मर्ज किया जा रहा है...',
    mergeSuccessToast: 'एकीकृत फार्म रिपोर्ट पीडीएफ सफलतापूर्वक डाउनलोड की गई',
    mergeFailedToast: 'रिपोर्ट मर्ज करने में विफल: {error}',
    failedLoadLiveReports: 'लाइव रिपोर्ट डेटा लोड करने में विफल।',
    pdfTitle: 'एकीकृत फार्म इंटेलिजेंस रिपोर्ट',
    pdfPlatformName: 'स्मार्ट कृषि विश्लेषिकी मंच',
    pdfFarmerUser: 'किसान/उपयोगकर्ता: {name}',
    pdfRegisteredEmail: 'पंजीकृत ईमेल: {email}',
    pdfCompiledOn: 'संकलित तिथि: {date}',
    pdfDocCount: 'समेकित दस्तावेजों की संख्या: {count}',
    pdfConfidential: 'गोपनीय - केवल आंतरिक कृषि रसद उपयोग के लिए',
    pdfTOC: 'विषय सूची',
    pdfSectionHeader: 'अनुभाग {num}: {type}',
    pdfFarmSite: 'फार्म स्थल: {farmName} | तिथि: {date}',
    pdfFindingsHeader: 'विस्तृत निष्कर्ष और एआई सिफारिशें',
    pdfSoilPH: 'पीएच मान: {pH}',
    pdfSoilMoisture: 'नमी अनुपात: {moisture}%',
    pdfSoilNPK: 'प्राथमिक पोषक तत्व (N/P/K): {n}/{p}/{k} mg/kg',
    pdfSoilOC: 'जैविक कार्बन अनुपात: {oc}%',
    pdfSoilRec: 'टेलीमेट्री सिफारिशें: {recs}',
    pdfDiseasePathogen: 'पता चला रोगजनक/विसंगति: {disease}',
    pdfDiseaseSeverity: 'गंभीरता स्तर: {severity}',
    pdfDiseaseTreatment: 'नैदानिक उपचार रणनीति: {treatment}',
    pdfDiseasePrevention: 'कृषि रोकथाम सलाहकार: {prevention}',
    pdfYieldCrop: 'कृषि फसल प्रकार: {crop}',
    pdfYieldArea: 'खेतों में बोया गया क्षेत्र: {area} एकड़',
    pdfYieldOutput: 'एआई अपेक्षित उपज उत्पादन: {yield} टन',
    pdfYieldRationale: 'वैज्ञानिक तर्क: मॉडल संकेत देते हैं कि नाइट्रोजन संरक्षण और समान सौर स्तर अधिकतम संभावित उत्पादन में योगदान देंगे।',
    pdfVerificationHeader: 'एकीकृत फार्म इंटेलिजेंस रिपोर्ट - हस्ताक्षर और सत्यापन',
    pdfVerificationText: 'इस संकलित डोजियर में संबंधित सेंसर डिजिटल ट्विन लॉग और कृत्रिम बुद्धिमत्ता मॉडल का उपयोग करके स्वचालित रूप से उत्पन्न नैदानिक सिफारिशें शामिल हैं। रासायनिक उपचार लागू करने से पहले सभी सिफारिशों की जांच की जानी चाहिए।',
    pdfFarmerSignature: 'प्रधान किसान/संचालक हस्ताक्षर',
    pdfAISignature: 'एंटीग्रेविटी कृषि विज्ञानी एआई सत्यापन',
    pdfFooterText: 'पृष्ठ {i} का {totalPages} | एकीकृत फार्म रिपोर्ट | जेमिनी एआई द्वारा संचालित',
    pdfSingleCompiling: 'सुरक्षित पीडीएफ टेलीमेट्री दस्तावेज़ संकलित कर रहे हैं...',
    pdfSingleSubtitle: 'रिपोर्ट',
    pdfSingleMetadataHeader: '1. दस्तावेज़ मेटाडेटा और विश्लेषण स्कोर',
    pdfSingleTargetTwin: 'लक्षित फार्म ट्विन: {farm}',
    pdfSingleQualityScore: 'एआई समग्र गुणवत्ता स्कोर: {score}/100',
    pdfSingleConfidence: 'एआई भविष्यवाणी विश्वसनीयता: {conf}%',
    pdfSingleRisk: 'पर्यावरणीय जोखिम कारक: {risk}/100',
    pdfSingleFindingsHeader: '2. तकनीकी निदान और टेलीमेट्री निष्कर्ष',
    pdfSingleCheckHeader: '3. सुरक्षा साइन-ऑफ और सत्यापन कोड',
    pdfSingleTimestamp: 'सत्यापन समय: {time}',
    pdfSingleDigitalSignoff: 'डिजिटल साइन-ऑफ: SYSTEM_VERIFIED_AI',
    pdfSingleFooterText: 'पृष्ठ {i} का {totalPages} | {type} रिपोर्ट | जेमिनी एआई द्वारा संचालित',
    pdfSingleSuccess: 'पीडीएफ संकलित और सफलतापूर्वक डाउनलोड किया गया',
  }
};

const REPORT_TYPES = ['All', 'Soil Analysis', 'Disease Diagnosis', 'Yield Prediction', 'AI Insights'];
const STATUSES = ['All', 'Completed', 'Processing', 'Failed', 'Archived', 'Favorites'];
const COLORS = ['#9333EA', '#D946EF', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444'];

export const getReportTypeLabel = (type: string, lang: 'en' | 'hi') => {
  const local = reportsTrans[lang]?.[type];
  if (local !== undefined) return local;
  if (lang === 'hi') {
    switch (type) {
      case 'All': return 'सभी श्रेणियां';
      case 'Soil Analysis': return 'मिट्टी विश्लेषण';
      case 'Disease Diagnosis': return 'रोग निदान';
      case 'Yield Prediction': return 'उपज भविष्यवाणी';
      case 'AI Insights': return 'एआई अंतर्दृष्टि';
      default: return type;
    }
  }
  return type;
};

export const getStatusLabel = (status: string, lang: 'en' | 'hi') => {
  const local = reportsTrans[lang]?.[status];
  if (local !== undefined) return local;
  if (lang === 'hi') {
    switch (status) {
      case 'All': return 'सभी स्थितियां';
      case 'Completed': return 'पूर्ण';
      case 'Processing': return 'प्रगति पर';
      case 'Failed': return 'विफल';
      case 'Archived': return 'संग्रहीत';
      case 'Favorites': return 'पसंदीदा';
      default: return status;
    }
  }
  return status;
};

export const translateAIPromptResponse = (text: string, lang: 'en' | 'hi') => {
  if (!text) return '';
  try {
    const parsed = JSON.parse(text);
    const val = parsed[lang] || parsed['en'] || text;
    return translatePlainNotificationString(val, lang);
  } catch (e) {
    if (lang === 'hi') {
      if (text.includes('All crop vitals are operating within optimal range.')) {
        return 'सभी फसल महत्वपूर्ण पैरामीटर इष्टतम सीमा के भीतर काम कर रहे हैं।';
      }
      if (text.includes('Soil nitrogen retention and drip line efficiency are highly favorable.')) {
        return 'मिट्टी में नाइट्रोजन प्रतिधारण और ड्रिप लाइन दक्षता अत्यधिक अनुकूल हैं।';
      }
      if (text.includes('AI Image scanner registered Puccinia graminis spores')) {
        return 'एआई इमेज स्कैनर ने पुक्सिनिया ग्रामिनिस बीजाणुओं को दर्ज किया।';
      }
      if (text.includes('IoT Soil Spectrometer registered N-P-K depletion')) {
        return 'IoT सॉयल स्पेक्ट्रोमीटर ने N-P-K की कमी दर्ज की।';
      }
      if (text.includes('Micro-climate sensors report rapid temperature rise')) {
        return 'सूक्ष्म-जलवायु सेंसर तेजी से तापमान वृद्धि की रिपोर्ट करते हैं।';
      }
      if (text.includes('Battery level of Moisture Sensor #B14-Zone3 fell below 5%')) {
        return 'नमी सेंसर #B14-Zone3 का बैटरी स्तर 5% से नीचे गिर गया।';
      }
      if (text.includes('Predictive models show high pest vulnerability over the next 48 hours')) {
        return 'भविष्यवाणी मॉडल अगले 48 घंटों में उच्च कीट संवेदनशीलता दिखाते हैं।';
      }
      if (text.includes('Optimal Pest Spraying Window')) {
        return 'कीटनाशक छिड़काव का इष्टतम समय';
      }
      if (text.includes('AI Executive Health Report')) {
        return 'एआई कार्यकारी स्वास्थ्य रिपोर्ट';
      }
      return translatePlainNotificationString(text, lang);
    }
    return text;
  }
};

export const translateTag = (tag: string, lang: 'en' | 'hi') => {
  if (lang === 'hi') {
    switch (tag) {
      case 'AI Generated': return 'एआई जनरेटेड';
      case 'Healthy': return 'स्वस्थ';
      case 'Low Moisture': return 'कम नमी';
      case 'Nutrient Deficit': return 'पोषक तत्वों की कमी';
      case 'Moderate Risk': return 'मध्यम जोखिम';
      case 'Critical': return 'गंभीर';
      case 'Fungal Disease': return 'कवक रोग';
      case 'Excellent Yield': return 'उत्कृष्ट उपज';
      case 'High Confidence': return 'उच्च विश्वसनीयता';
      case 'Severe': return 'गंभीर';
      case 'Moderate': return 'मध्यम';
      case 'Low': return 'कम';
      default: return tag;
    }
  }
  return tag;
};

export default function Reports({ user, farms, language = 'en' }: ReportsProps) {
  const t = (() => {
    const translateKey = (key: string, params?: Record<string, string | number>, fallback?: string) => {
      const local = reportsTrans[language]?.[key];
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
      get(target, prop) {
        if (typeof prop === 'string') {
          return translateKey(prop);
        }
        return Reflect.get(target, prop);
      }
    }) as any;
  })();

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'archive' | 'compare' | 'timeline'>('dashboard');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterFarm, setFilterFarm] = useState('All');
  const [filterDate, setFilterDate] = useState('All Time');
  const [filterRisk, setFilterRisk] = useState('All');
  const [filterYield, setFilterYield] = useState('All');
  const [filterAIScore, setFilterAIScore] = useState('All');

  // Selection, Pinning & Pagination
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('pinned_reports');
    return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
  });
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  // UI Dialog States
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Active chart type state for Interactive Charts widget
  const [activeChartType, setActiveChartType] = useState<'yield' | 'disease' | 'nutrients' | 'soil' | 'water' | 'risk'>('yield');

  useEffect(() => {
    fetchData();
  }, [user.id, farms]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [soilRes, diseaseRes, yieldRes, notificationsRes] = await Promise.all([
        fetch(`/api/soil-analysis`),
        fetch(`/api/disease-history?userId=${user.id}`),
        fetch(`/api/yield-predictions?userId=${user.id}`),
        fetch(`/api/notifications?userId=${user.id}`)
      ]);
      
      const soilData = await soilRes.json();
      const diseaseData = await diseaseRes.json();
      const yieldData = await yieldRes.json();
      const notificationsData = await notificationsRes.json();
      
      const combined = [
        ...(soilData.history || []).map((i: any) => ({ 
          ...i, 
          type: 'Soil Analysis', 
          status: i.isArchived ? 'Archived' : 'Completed', 
          farmName: farms.find(f => f.id === i.farmId)?.name || 'Unknown Farm Site',
          isFavorite: !!i.isFavorite,
          isArchived: !!i.isArchived,
          aiScore: i.soilHealth ? i.soilHealth * 10 : 75,
          riskScore: i.riskLevel === 'High' ? 85 : i.riskLevel === 'Medium' ? 45 : 15,
          confidence: 92
        })),
        ...(diseaseData.history || []).map((i: any) => ({ 
          ...i, 
          type: 'Disease Diagnosis', 
          status: i.isArchived ? 'Archived' : 'Completed', 
          farmName: farms.find(f => f.id === i.farmId)?.name || 'Unknown Farm Site',
          isFavorite: !!i.isFavorite,
          isArchived: !!i.isArchived,
          aiScore: i.confidence ? Math.round(i.confidence * 100) : 80,
          riskScore: i.severity === 'Severe' ? 90 : i.severity === 'Moderate' ? 50 : 20,
          confidence: i.confidence ? Math.round(i.confidence * 100) : 85
        })),
        ...(yieldData.history || []).map((i: any) => ({ 
          ...i, 
          type: 'Yield Prediction', 
          status: i.isArchived ? 'Archived' : 'Completed', 
          farmName: farms.find(f => f.id === i.farmId)?.name || 'Unknown Farm Site',
          isFavorite: !!i.isFavorite,
          isArchived: !!i.isArchived,
          aiScore: i.errorMargin ? 100 - i.errorMargin : 88,
          riskScore: i.errorMargin ? i.errorMargin * 3 : 25,
          confidence: i.errorMargin ? 100 - i.errorMargin : 94
        })),
        ...(notificationsData.notifications || [])
          .filter((n: any) => n.category === 'ai_recommendation')
          .map((n: any) => ({
            _id: n._id,
            type: 'AI Insights',
            status: n.isArchived ? 'Archived' : 'Completed',
            createdAt: n.createdAt,
            farmName: 'All Farm Sites',
            summary: n.message,
            isFavorite: !!n.isFavorite,
            isArchived: !!n.isArchived,
            aiScore: 95,
            riskScore: n.priority === 'high' ? 75 : n.priority === 'medium' ? 40 : 15,
            confidence: 96
          }))
      ];
      
      setHistory(combined);
    } catch (e) {
      console.error(e);
      setHistory([]);
      showToast(t.failedLoadLiveReports, 'error');
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = history.find(h => h._id === id);
    if (!target) return;
    const newIsFavorite = !target.isFavorite;

    setHistory(prev => prev.map(h => h._id === id ? { ...h, isFavorite: newIsFavorite } : h));
    showToast(newIsFavorite ? t.bookmarkAdded : t.bookmarkRemoved, 'success');

    if (selectedReport?._id === id) {
      setSelectedReport(prev => prev ? { ...prev, isFavorite: newIsFavorite } : null);
    }

    try {
      await fetch('/api/reports/toggle-favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type: target.type })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = new Set(pinnedIds);
    if (newPinned.has(id)) {
      newPinned.delete(id);
      showToast(t.reportUnpinned, 'info');
    } else {
      newPinned.add(id);
      showToast(t.reportPinned, 'success');
    }
    setPinnedIds(newPinned);
    localStorage.setItem('pinned_reports', JSON.stringify(Array.from(newPinned)));
  };

  const toggleArchive = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = history.find(h => h._id === id);
    if (!target) return;
    const newIsArchived = !target.isArchived;

    setHistory(prev => prev.map(h => h._id === id ? { ...h, isArchived: newIsArchived, status: newIsArchived ? 'Archived' : 'Completed' } : h));
    showToast(newIsArchived ? t.reportArchived : t.reportRestored, 'success');

    if (selectedReport?._id === id) {
      setSelectedReport(prev => prev ? { ...prev, isArchived: newIsArchived, status: newIsArchived ? 'Archived' : 'Completed' } : null);
    }

    try {
      await fetch('/api/reports/toggle-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type: target.type })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSingleDelete = async (id: string) => {
    const targetReport = history.find(h => h._id === id);
    if (!targetReport) return;

    setHistory(prev => prev.filter(h => h._id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    
    if (selectedReport?._id === id) {
      setSelectedReport(null);
    }
    
    showToast(t.reportDeleted, 'success');

    try {
      let endpoint = '';
      if (targetReport.type === 'Soil Analysis') endpoint = `/api/soil-analysis/${id}`;
      else if (targetReport.type === 'Disease Diagnosis') endpoint = `/api/disease-history/${id}`;
      else if (targetReport.type === 'Yield Prediction') endpoint = `/api/yield-predictions/${id}`;
      else if (targetReport.type === 'AI Insights') endpoint = `/api/notifications/${id}`;
      
      if (endpoint) {
        await fetch(endpoint, { method: 'DELETE' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const idsToDelete = Array.from(selectedIds);
    setHistory(prev => prev.filter(h => !selectedIds.has(h._id)));
    setSelectedIds(new Set());
    
    if (selectedReport && selectedIds.has(selectedReport._id)) {
      setSelectedReport(null);
    }
    showToast(t('bulkDeleted', { count: idsToDelete.length }), 'success');

    try {
      await Promise.all(idsToDelete.map(async (id) => {
        const targetReport = history.find(h => h._id === id);
        if (!targetReport) return;
        let endpoint = '';
        if (targetReport.type === 'Soil Analysis') endpoint = `/api/soil-analysis/${id}`;
        else if (targetReport.type === 'Disease Diagnosis') endpoint = `/api/disease-history/${id}`;
        else if (targetReport.type === 'Yield Prediction') endpoint = `/api/yield-predictions/${id}`;
        else if (targetReport.type === 'AI Insights') endpoint = `/api/notifications/${id}`;
        if (endpoint) await fetch(endpoint, { method: 'DELETE' });
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const generateAIReport = async () => {
    if (farms.length === 0) {
      showToast(t.chatNoFarmsToast, 'error');
      return;
    }
    setGeneratingAI(true);
    showToast(t.chatConsultingToast, 'info');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Please generate a comprehensive, highly detailed professional agronomist health and telemetry executive report for my farm sites based on current conditions. Return the response as a JSON string with 'en' and 'hi' keys, where 'en' is the English version and 'hi' is the Hindi translation. Keep each translation under 3 sentences. Return only the raw JSON, no markdown blocks or surrounding text."
        })
      });
      const data = await response.json();
      if (data.success) {
        const notifResponse = await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'AI Executive Health Report',
            message: data.reply || JSON.stringify({ en: 'All crop vitals are operating within optimal range.', hi: 'सभी फसल महत्वपूर्ण पैरामीटर इष्टतम सीमा के भीतर काम कर रहे हैं।' }),
            category: 'ai_recommendation',
            priority: 'medium'
          })
        });
        const notifData = await notifResponse.json();
        if (notifData.success) {
          showToast(t.chatGeneratingSuccessToast, 'success');
          await fetchData();
        } else {
          showToast(t.chatSaveFailedToast, 'error');
        }
      } else {
        showToast(t('chatGeneratingFailedToast', { error: data.message || 'Offline' }), 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(t.chatErrorToast, 'error');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleShare = (item: any) => {
    let detailsStr = "";
    if (item.type === 'Soil Analysis') detailsStr = `Moisture: ${item.moisture}%, pH: ${item.pH}`;
    if (item.type === 'Disease Diagnosis') detailsStr = `${language === 'hi' ? 'रोग' : 'Disease'}: ${localizeDiseaseName(item.diseaseName, language)} (Confidence: ${item.confidence}%)`;
    if (item.type === 'Yield Prediction') {
      detailsStr = language === 'hi'
        ? `अनुमानित उपज: ${item.predictedYield} टन ${item.cropType} की`
        : `Predicted Yield: ${item.predictedYield} tons of ${item.cropType}`;
    }
    if (item.type === 'AI Insights') detailsStr = translateAIPromptResponse(item.summary, language);

    const shareText = `Agricultural Report - ${item.type}\nFarm: ${item.farmName}\nDate: ${new Date(item.createdAt).toLocaleString()}\nFindings: ${detailsStr}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      showToast(language === 'hi' ? 'रिपोर्ट क्लिपबोर्ड पर कॉपी की गई!' : 'Report copied to clipboard!', 'success');
    } else {
      showToast(language === 'hi' ? 'इस ब्राउज़र पर साझा करना समर्थित नहीं है' : 'Sharing not supported on this browser', 'error');
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map(d => d._id)));
    }
  };

  const handleExportCSV = () => {
    const dataToExport = selectedIds.size > 0 ? history.filter(h => selectedIds.has(h._id)) : history;
    const csvHeaders = "Date,Type,Status,Farm,Details,AI Score,Risk Score\n";
    const csvRows = dataToExport.map(h => {
      let details = "";
      if (h.type === 'Soil Analysis') details = `Moisture: ${h.moisture}% pH: ${h.pH}`;
      if (h.type === 'Disease Diagnosis') details = `Disease: ${localizeDiseaseName(h.diseaseName, language)} (${h.confidence}%)`;
      if (h.type === 'Yield Prediction') details = `Crop: ${h.cropType} Yield: ${h.predictedYield}t`;
      if (h.type === 'AI Insights') details = translateAIPromptResponse(h.summary, language) || 'Insight report';
      return `${new Date(h.createdAt).toLocaleDateString()},"${h.type}","${h.status}","${h.farmName}","${details.replace(/"/g, '""')}",${h.aiScore},${h.riskScore}`;
    }).join("\n");
    
    const blob = new Blob([csvHeaders + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `farm_intelligence_export_${Date.now()}.csv`);
    link.click();
    showToast(language === 'hi' ? 'सीएसवी सफलतापूर्वक निर्यात किया गया' : 'CSV exported successfully');
  };

  const handleExportExcel = () => {
    const dataToExport = selectedIds.size > 0 ? history.filter(h => selectedIds.has(h._id)) : history;
    const headers = "Date\tType\tStatus\tFarm\tDetails\tAI Score\tRisk Score\n";
    const rows = dataToExport.map(h => {
      let details = "";
      if (h.type === 'Soil Analysis') details = `Moisture: ${h.moisture}% pH: ${h.pH}`;
      if (h.type === 'Disease Diagnosis') details = `Disease: ${localizeDiseaseName(h.diseaseName, language)} (${h.confidence}%)`;
      if (h.type === 'Yield Prediction') details = `Crop: ${h.cropType} Yield: ${h.predictedYield}t`;
      if (h.type === 'AI Insights') details = translateAIPromptResponse(h.summary, language) || 'Insight report';
      return `${new Date(h.createdAt).toLocaleDateString()}\t${h.type}\t${h.status}\t${h.farmName}\t${details}\t${h.aiScore}\t${h.riskScore}`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `farm_intelligence_export_${Date.now()}.xls`);
    link.click();
    showToast(language === 'hi' ? 'एक्सेल रिपोर्ट सफलतापूर्वक डाउनलोड की गई' : 'Excel report downloaded successfully');
  };

  const handleExportJSON = () => {
    const dataToExport = selectedIds.size > 0 ? history.filter(h => selectedIds.has(h._id)) : history;
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `farm_intelligence_export_${Date.now()}.json`);
    link.click();
    showToast(language === 'hi' ? 'जेएसओएन पैकेज सफलतापूर्वक निर्यात किया गया' : 'JSON package exported successfully');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // Automated Natural Language Query Parser
  const parseNaturalLanguageSearch = (query: string, items: any[]) => {
    if (!query) return items;
    const lq = query.toLowerCase();

    // Check query expressions
    const isTomato = lq.includes('tomato');
    const isWheat = lq.includes('wheat');
    const isSoybeans = lq.includes('soybean');
    const isMaize = lq.includes('maize');

    const isDisease = lq.includes('disease') || lq.includes('pathogen') || lq.includes('blight') || lq.includes('rust');
    const isSoil = lq.includes('soil') || lq.includes('moisture') || lq.includes('ph');
    const isYield = lq.includes('yield') || lq.includes('prediction') || lq.includes('expected');
    const isInsights = lq.includes('insight') || lq.includes('executive');

    const isHighRisk = lq.includes('high risk') || lq.includes('critical') || lq.includes('danger');
    const isHealthy = lq.includes('healthy') || lq.includes('excellent') || lq.includes('optimal');

    const hasJuly = lq.includes('july');
    const hasJune = lq.includes('june');
    const hasMay = lq.includes('may');
    const hasMarch = lq.includes('march');

    return items.filter(item => {
      // Crop match
      if (isTomato && !item.cropType?.toLowerCase().includes('tomato') && !item.farmName?.toLowerCase().includes('tomato')) return false;
      if (isWheat && !item.cropType?.toLowerCase().includes('wheat') && !item.farmName?.toLowerCase().includes('wheat')) return false;
      if (isSoybeans && !item.cropType?.toLowerCase().includes('soybean') && !item.farmName?.toLowerCase().includes('soybean')) return false;
      if (isMaize && !item.cropType?.toLowerCase().includes('maize') && !item.farmName?.toLowerCase().includes('maize')) return false;

      // Type match
      if (isDisease && item.type !== 'Disease Diagnosis') return false;
      if (isSoil && item.type !== 'Soil Analysis') return false;
      if (isYield && item.type !== 'Yield Prediction') return false;
      if (isInsights && item.type !== 'AI Insights') return false;

      // Risk match
      if (isHighRisk && item.riskScore < 70) return false;
      if (isHealthy && item.aiScore < 85) return false;

      // Month match
      if (hasJuly && new Date(item.createdAt).getMonth() !== 6) return false;
      if (hasJune && new Date(item.createdAt).getMonth() !== 5) return false;
      if (hasMay && new Date(item.createdAt).getMonth() !== 4) return false;
      if (hasMarch && new Date(item.createdAt).getMonth() !== 2) return false;

      // Generic search match
      if (!isTomato && !isWheat && !isSoybeans && !isMaize && !isDisease && !isSoil && !isYield && !isInsights && !isHighRisk && !isHealthy && !hasJuly && !hasJune && !hasMay && !hasMarch) {
        return (
          item.type?.toLowerCase().includes(lq) || 
          item.farmName?.toLowerCase().includes(lq) ||
          localizeDiseaseName(item.diseaseName || '', language).toLowerCase().includes(lq) ||
          item.cropType?.toLowerCase().includes(lq) ||
          (item.summary && item.summary.toLowerCase().includes(lq))
        );
      }

      return true;
    });
  };

  // Filtered & Sorted History
  const filteredData = useMemo(() => {
    let filtered = [...history];

    // Status filter
    filtered = filtered.filter(item => {
      const matchesType = filterType === 'All' || item.type === filterType;
      const matchesStatus = 
        filterStatus === 'All' 
          ? !item.isArchived
          : filterStatus === 'Archived'
            ? !!item.isArchived
            : filterStatus === 'Favorites'
              ? !!item.isFavorite && !item.isArchived
              : item.status === filterStatus && !item.isArchived;

      const matchesFarm = filterFarm === 'All' || item.farmName === filterFarm;
      
      let matchesDate = true;
      if (filterDate !== 'All Time') {
        const itemDate = new Date(item.createdAt);
        const now = new Date();
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        if (filterDate === 'Last 7 Days') matchesDate = diffDays <= 7;
        if (filterDate === 'Last 30 Days') matchesDate = diffDays <= 30;
        if (filterDate === 'This Year') matchesDate = itemDate.getFullYear() === now.getFullYear();
      }

      // Advanced filters
      const matchesRisk = 
        filterRisk === 'All' || 
        (filterRisk === 'High' && item.riskScore >= 70) ||
        (filterRisk === 'Medium' && item.riskScore >= 35 && item.riskScore < 70) ||
        (filterRisk === 'Low' && item.riskScore < 35);

      const matchesYield = 
        filterYield === 'All' ||
        (filterYield === 'High' && item.type === 'Yield Prediction' && parseFloat(item.predictedYield) > 80) ||
        (filterYield === 'Average' && item.type === 'Yield Prediction' && parseFloat(item.predictedYield) >= 20 && parseFloat(item.predictedYield) <= 80) ||
        (filterYield === 'Low' && item.type === 'Yield Prediction' && parseFloat(item.predictedYield) < 20);

      const matchesAIScore = 
        filterAIScore === 'All' ||
        (filterAIScore === 'Excellent' && item.aiScore >= 90) ||
        (filterAIScore === 'Average' && item.aiScore >= 70 && item.aiScore < 90) ||
        (filterAIScore === 'Low' && item.aiScore < 70);

      return matchesType && matchesStatus && matchesFarm && matchesDate && matchesRisk && matchesYield && matchesAIScore;
    });

    // Smart natural language search
    filtered = parseNaturalLanguageSearch(searchQuery, filtered);

    // Sorting
    filtered.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      
      if (sortConfig.key === 'createdAt') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else {
        valA = valA !== undefined ? String(valA).toLowerCase() : '';
        valB = valB !== undefined ? String(valB).toLowerCase() : '';
      }
      
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [history, searchQuery, filterType, filterStatus, filterFarm, filterDate, filterRisk, filterYield, filterAIScore, sortConfig]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Statistics calculation
  const reportStats = useMemo(() => {
    const total = history.length;
    const avgScore = total > 0 ? Math.round(history.reduce((acc, h) => acc + (h.aiScore || 0), 0) / total) : 0;
    
    const yieldReports = history.filter(h => h.type === 'Yield Prediction');
    const avgYield = yieldReports.length > 0 ? (yieldReports.reduce((acc, h) => acc + parseFloat(h.predictedYield || '0'), 0) / yieldReports.length).toFixed(1) : '0';

    const diseaseReports = history.filter(h => h.type === 'Disease Diagnosis' && h.diseaseName);
    const diseaseCounts: Record<string, number> = {};
    diseaseReports.forEach(r => {
      const locName = localizeDiseaseName(r.diseaseName, language);
      diseaseCounts[locName] = (diseaseCounts[locName] || 0) + 1;
    });
    const mostCommonDisease = Object.entries(diseaseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    const soilReports = history.filter(h => h.type === 'Soil Analysis');
    const avgSoil = soilReports.length > 0 ? (soilReports.reduce((acc, h) => acc + (h.soilHealth || 7), 0) / soilReports.length).toFixed(1) : '7.5';

    // Unique crops
    const crops = new Set(history.map(h => h.cropType).filter(Boolean));

    return {
      total,
      avgScore,
      avgYield,
      mostCommonDisease,
      avgSoil,
      uniqueCropsCount: crops.size || 3
    };
  }, [history, language]);

  // Report Auto Tag Generator
  const getReportTags = (item: any) => {
    const tags = ['AI Generated'];
    if (item.type === 'Soil Analysis') {
      if (item.soilHealth >= 8) tags.push('Healthy');
      if (item.moisture < 25) tags.push('Low Moisture');
      if (item.nitrogen < 40 || item.phosphorus < 20) tags.push('Nutrient Deficit');
    } else if (item.type === 'Disease Diagnosis') {
      tags.push(item.severity || 'Moderate Risk');
      if (item.severity === 'Severe') tags.push('Critical');
      if (localizeDiseaseName(item.diseaseName || '', 'en').toLowerCase().includes('blight') || localizeDiseaseName(item.diseaseName || '', 'en').toLowerCase().includes('rot')) {
        tags.push('Fungal Disease');
      }
    } else if (item.type === 'Yield Prediction') {
      const yieldVal = parseFloat(item.predictedYield);
      if (yieldVal > 80) tags.push('Excellent Yield');
      if (item.errorMargin < 5) tags.push('High Confidence');
    }
    return tags;
  };

  // Selected compare reports array
  const compareReports = useMemo(() => {
    return history.filter(h => selectedIds.has(h._id));
  }, [history, selectedIds]);

  // Recharts interactive datasets
  const activeChartData = useMemo(() => {
    // Collect data points from history chronologically
    const sorted = [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return sorted.map((h, idx) => {
      const date = new Date(h.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
      return {
        name: date,
        'Yield (Tons)': h.type === 'Yield Prediction' ? parseFloat(h.predictedYield || '0') : null,
        'Confidence (%)': h.confidence || h.aiScore || 85,
        'NPK Level': h.type === 'Soil Analysis' ? (h.nitrogen + h.phosphorus + h.potassium) / 3 : null,
        'Soil Health Score': h.type === 'Soil Analysis' ? h.soilHealth : null,
        'Moisture (%)': h.type === 'Soil Analysis' ? h.moisture : null,
        'Risk Rating': h.riskScore || 20
      };
    });
  }, [history]);

  // Unified Farm PDF Merger
  const handleMergePDF = () => {
    if (selectedIds.size < 2) {
      showToast(t.mergeSelectAlert, 'error');
      return;
    }
    showToast(t.mergingToast, 'info');

    setTimeout(() => {
      try {
        const doc = new jsPDF();
        const selected = history.filter(h => selectedIds.has(h._id));

        // 1. Professional Cover Page
        doc.setFillColor(18, 16, 36); // Deep space background
        doc.rect(0, 0, 210, 297, 'F');

        // Decorative borders
        doc.setDrawColor(147, 51, 234);
        doc.setLineWidth(2);
        doc.rect(5, 5, 200, 287);

        // Logo
        doc.setTextColor(217, 70, 239);
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text('ANTIGRAVITY D-TWIN', 105, 70, { align: 'center' });

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(t.pdfPlatformName, 105, 80, { align: 'center' });

        // Divider
        doc.setDrawColor(255, 255, 255, 0.1);
        doc.line(40, 110, 170, 110);

        // Title
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(t.pdfTitle, 105, 130, { align: 'center' });

        // Meta info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(t('pdfFarmerUser', { name: user.name }), 105, 170, { align: 'center' });
        doc.text(t('pdfRegisteredEmail', { email: user.email }), 105, 178, { align: 'center' });
        doc.text(t('pdfCompiledOn', { date: new Date().toLocaleString() }), 105, 186, { align: 'center' });
        doc.text(t('pdfDocCount', { count: selected.length }), 105, 194, { align: 'center' });

        // QR Code box decoration
        doc.setDrawColor(147, 51, 234);
        doc.rect(85, 215, 40, 40);
        doc.setFontSize(7);
        doc.text(language === 'hi' ? '[सुरक्षित टेलीमेट्री क्यूआर]' : '[SECURE TELEMETRY QR]', 105, 237, { align: 'center' });

        // Add page numbering details
        doc.setFontSize(8);
        doc.text(t.pdfConfidential, 105, 275, { align: 'center' });

        // Table of Contents Page
        doc.addPage();
        doc.setFillColor(255, 255, 255);
        doc.setTextColor(18, 16, 36);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(t.pdfTOC, 14, 25);
        doc.line(14, 28, 196, 28);

        let tableRows: any[] = [];
        selected.forEach((report, index) => {
          tableRows.push([
            (index + 1).toString(),
            new Date(report.createdAt).toLocaleDateString(),
            getReportTypeLabel(report.type, language),
            report.farmName,
            language === 'hi' ? `पृष्ठ ${index + 3}` : `Page ${index + 3}`
          ]);
        });

        autoTable(doc, {
          startY: 35,
          head: [language === 'hi' 
            ? ['सूचकांक', 'विश्लेषण तिथि', 'रिपोर्ट श्रेणी', 'लक्षित फार्म स्थल', 'संदर्भ पृष्ठ'] 
            : ['Index', 'Analysis Date', 'Report Category', 'Target Farm Site', 'Reference Page']
          ],
          body: tableRows,
          theme: 'striped',
          headStyles: { fillColor: [147, 51, 234] }
        });

        // Loop through reports and add a detailed summary page for each selected
        selected.forEach((report, idx) => {
          doc.addPage();
          
          // Page Header header block
          doc.setFillColor(147, 51, 234);
          doc.rect(0, 0, 210, 25, 'F');
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(t('pdfSectionHeader', { num: idx + 1, type: getReportTypeLabel(report.type, language).toUpperCase() }), 14, 11);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.text(t('pdfFarmSite', { farmName: report.farmName, date: new Date(report.createdAt).toLocaleString() }), 14, 18);

          doc.setTextColor(30, 30, 30);
          
          let y = 38;
          // Document metrics table
          let metaRows = [
            [language === 'hi' ? 'स्थिति' : 'Status', getStatusLabel(report.status, language)],
            [language === 'hi' ? 'रिपोर्ट आईडी संदर्भ' : 'Report ID Reference', report._id],
            [language === 'hi' ? 'गुणवत्ता स्कोर सूचकांक' : 'Quality Score Index', `${report.aiScore}/100`],
            [language === 'hi' ? 'एआई मॉडल विश्वसनीयता' : 'AI Model Confidence', `${report.confidence}%`],
            [language === 'hi' ? 'पर्यावरणीय जोखिम रेटिंग' : 'Environmental Risk Rating', `${report.riskScore}/100`]
          ];
          
          autoTable(doc, {
            startY: y,
            head: [language === 'hi' ? ['तकनीकी पैरामीटर', 'मूल्यांकन विवरण'] : ['Technical Parameter', 'Evaluation Vitals']],
            body: metaRows,
            styles: { fontSize: 8.5 },
            headStyles: { fillColor: [59, 130, 246] }
          });
          y = (doc as any).lastAutoTable.finalY + 12;

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(t.pdfFindingsHeader, 14, y);
          y += 6;

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          
          let detailsText = '';
          if (report.type === 'Soil Analysis') {
            const parsedRecs = (report.recommendations || []).map((r: string) => {
              try {
                if (r.trim().startsWith('{')) {
                  const p = JSON.parse(r);
                  return p[language] || p['en'] || r;
                }
              } catch (e) {}
              return r;
            });
            detailsText = `${language === 'hi' ? 'पीएच मान' : 'pH Value'}: ${report.pH}\n` +
              `${language === 'hi' ? 'नमी अनुपात' : 'Moisture Ratio'}: ${report.moisture}%\n` +
              `${language === 'hi' ? 'प्राथमिक पोषक तत्व (N/P/K)' : 'Primary Nutrients (N/P/K)'}: ${report.nitrogen || 0}/${report.phosphorus || 0}/${report.potassium || 0} mg/kg\n` +
              `${language === 'hi' ? 'जैविक कार्बन अनुपात' : 'Organic Carbon Ratio'}: ${report.organicCarbon || 0.75}%\n` +
              `${language === 'hi' ? 'टेलीमेट्री सिफारिशें' : 'Telemetry Recommendations'}: ${parsedRecs.join(', ')}`;
          } else if (report.type === 'Disease Diagnosis') {
            detailsText = `${language === 'hi' ? 'पता चला रोगजनक/विसंगति' : 'Detected Pathogen/Anomaly'}: ${localizeDiseaseName(report.diseaseName, language)}\n` +
              `${language === 'hi' ? 'गंभीरता स्तर' : 'Severity Level'}: ${report.severity || 'Moderate'}\n` +
              `${language === 'hi' ? 'नैदानिक उपचार रणनीति' : 'Diagnostic Treatment Strategy'}: ${report.treatment}\n` +
              `${language === 'hi' ? 'कृषि रोकथाम सलाहकार' : 'Agronomic Prevention Advisory'}: ${report.prevention || 'Maintain dynamic crop spacing and crop rotation schedules.'}`;
          } else if (report.type === 'Yield Prediction') {
            detailsText = `${language === 'hi' ? 'कृषि फसल प्रकार' : 'Cultivated Crop Type'}: ${report.cropType}\n` +
              `${language === 'hi' ? 'खेतों में बोया गया क्षेत्र' : 'Fields Planted Area'}: ${report.area} ${language === 'hi' ? 'एकड़' : 'acres'}\n` +
              `${language === 'hi' ? 'एआई अपेक्षित उपज उत्पादन' : 'AI Expected Yield Output'}: ${report.predictedYield} ${language === 'hi' ? 'टन' : 'tons'}\n` +
              `${language === 'hi' ? 'वैज्ञानिक तर्क: मॉडल संकेत देते हैं कि नाइट्रोजन संरक्षण और समान सौर स्तर अधिकतम संभावित उत्पादन में योगदान देंगे।' : 'Scientific Rationale: The models indicate that nitrogen preservation and uniform solar levels will contribute to maximum potential production.'}`;
          } else {
            detailsText = translateAIPromptResponse(report.summary, language) || 'Summary findings log entry.';
          }

          const detailsLines = doc.splitTextToSize(detailsText, 180);
          doc.text(detailsLines, 14, y);
        });

        // Add Signatures page
        doc.addPage();
        doc.setFillColor(147, 51, 234);
        doc.rect(0, 0, 210, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(t.pdfVerificationHeader, 14, 10);

        doc.setTextColor(30, 30, 30);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.text(t.pdfVerificationText, 14, 25, { maxWidth: 180 });

        // Signature lines
        doc.setDrawColor(150, 150, 150);
        doc.line(14, 90, 80, 90);
        doc.text(t.pdfFarmerSignature, 14, 95);

        doc.line(120, 90, 186, 90);
        doc.text(t.pdfAISignature, 120, 95);

        // Add page numbers on all pages
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(7.5);
          doc.setTextColor(150, 150, 150);
          doc.text(t('pdfFooterText', { i: i, totalPages: totalPages }), 14, 287);
        }

        doc.save(`unified_complete_farm_report_${Date.now()}.pdf`);
        showToast(t.mergeSuccessToast, 'success');
      } catch (err: any) {
        console.error('PDF merge failed', err);
        showToast(t('mergeFailedToast', { error: err.message }), 'error');
      }
    }, 1200);
  };

  const handleDownloadSingleReport = async (item: any) => {
    showToast(t.pdfSingleCompiling, 'info');
    try {
      const doc = new jsPDF();
      const farmName = item.farmName || 'Farm Report';
      const date = new Date(item.createdAt).toLocaleString();

      // Cover block
      doc.setFillColor(147, 51, 234);
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'hi' ? 'स्मार्ट कृषि डिजिटल ट्विन' : 'Smart Agriculture Digital Twin', 14, 12);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(t('pdfSingleSubtitle', { type: getReportTypeLabel(item.type, language) }), 14, 20);
      doc.setFontSize(8);
      doc.text(`${language === 'hi' ? 'जनरेट किया गया' : 'Generated'}: ${date} | ${language === 'hi' ? 'उपयोगकर्ता' : 'User'}: ${user.name}`, 14, 26);

      // Metadata section
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(t.pdfSingleMetadataHeader, 14, 40);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(t('pdfSingleTargetTwin', { farm: farmName }), 14, 48);
      doc.text(t('pdfSingleQualityScore', { score: item.aiScore }), 14, 54);
      doc.text(t('pdfSingleConfidence', { conf: item.confidence }), 14, 60);
      doc.text(t('pdfSingleRisk', { risk: item.riskScore }), 14, 66);

      // Main content box
      let y = 78;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(t.pdfSingleFindingsHeader, 14, y);
      y += 8;

      let tableData: any[] = [];
      if (item.type === 'Soil Analysis') {
        tableData = [
          [language === 'hi' ? 'मिट्टी पैरामीटर' : 'Soil parameter', language === 'hi' ? 'वर्तमान मान' : 'Current Value'],
          [language === 'hi' ? 'पीएच स्तर' : 'pH level', item.pH],
          [language === 'hi' ? 'मिट्टी की नमी' : 'Soil Moisture', `${item.moisture}%`],
          [language === 'hi' ? 'नाइट्रोजन (N)' : 'Nitrogen (N)', `${item.nitrogen || 0} mg/kg`],
          [language === 'hi' ? 'फास्फोरस (P)' : 'Phosphorus (P)', `${item.phosphorus || 0} mg/kg`],
          [language === 'hi' ? 'पोटेशियम (K)' : 'Potassium (K)', `${item.potassium || 0} mg/kg`],
          [language === 'hi' ? 'जैविक कार्बन' : 'Organic Carbon', `${item.organicCarbon || 0.75}%`]
        ];
      } else if (item.type === 'Disease Diagnosis') {
        tableData = [
          [language === 'hi' ? 'नैदानिक जांच' : 'Diagnostic Check', language === 'hi' ? 'विवरण' : 'Details'],
          [language === 'hi' ? 'पता चला रोगजनक' : 'Pathogen Detected', localizeDiseaseName(item.diseaseName, language)],
          [language === 'hi' ? 'विश्वसनीयता रेटिंग' : 'Confidence rating', `${item.confidence}%`],
          [language === 'hi' ? 'गंभीरता स्तर' : 'Severity Level', item.severity || 'Moderate'],
          [language === 'hi' ? 'उपचार कार्रवाई' : 'Treatment Action', item.treatment],
          [language === 'hi' ? 'स्वच्छता कार्रवाई' : 'Sanitation Action', item.prevention || 'Rotate crops next season.']
        ];
      } else if (item.type === 'Yield Prediction') {
        tableData = [
          [language === 'hi' ? 'उपज मूल्यांकन' : 'Yield assessment', language === 'hi' ? 'विवरण' : 'Details'],
          [language === 'hi' ? 'फसल का प्रकार' : 'Crop Type', item.cropType],
          [language === 'hi' ? 'बोया गया क्षेत्र' : 'Planted Area', `${item.area} ${language === 'hi' ? 'एकड़' : 'acres'}`],
          [language === 'hi' ? 'अपेक्षित उपज उत्पादन' : 'Expected Yield Output', `${item.predictedYield} ${language === 'hi' ? 'टन' : 'tons'}`],
          [language === 'hi' ? 'सटीकता मार्जिन' : 'Accuracy Margin', `${item.confidence}%`]
        ];
      } else {
        tableData = [[language === 'hi' ? 'विवरण' : 'Details', translateAIPromptResponse(item.summary, language) || 'Summary info.']];
      }

      autoTable(doc, {
        startY: y,
        body: tableData,
        styles: { fontSize: 8.5 },
        theme: 'grid'
      });
      y = (doc as any).lastAutoTable.finalY + 12;

      // QR Code Simulation
      if (y > 230) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(t.pdfSingleCheckHeader, 14, y);
      y += 6;

      doc.setDrawColor(147, 51, 234);
      doc.rect(14, y, 30, 30);
      doc.setFontSize(6.5);
      doc.text(language === 'hi' ? '[सुरक्षित क्यूआर]' : '[SECURE QR]', 21, y + 16);

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${language === 'hi' ? 'सत्यापन समय' : 'Verification Timestamp'}: ${new Date().toISOString()}`, 52, y + 8);
      doc.text(`${language === 'hi' ? 'डिजिटल साइन-ऑफ' : 'Digital Sign-off'}: SYSTEM_VERIFIED_AI`, 52, y + 16);

      // Add page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(150, 150, 150);
        doc.text(t('pdfSingleFooterText', { i: i, totalPages: pageCount, type: getReportTypeLabel(item.type, language) }), 14, 287);
      }

      doc.save(`${item.type.toLowerCase().replace(/\s+/g, '_')}_report_${Date.now()}.pdf`);
      showToast(t.pdfSingleSuccess, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(language === 'hi' ? 'पीडीएफ संकलित करने में विफल: ' + err.message : 'Failed to compile PDF: ' + err.message, 'error');
    }
  };

  const handleOpenPreview = (report: any) => {
    setSelectedReport(report);
    // Add to recently viewed
    setRecentlyViewed(prev => {
      const filtered = prev.filter(r => r._id !== report._id);
      return [report, ...filtered].slice(0, 5);
    });
    setIsPreviewOpen(true);
  };

  // Chronological timeline grouping
  const timelineEvents = useMemo(() => {
    return [...history]
      .filter(h => !h.isArchived)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [history]);

  // AI-wide recommendations mock scanning all reports
  const aiFarmRecommendations = useMemo(() => {
    const recs = [
      { id: 1, title: 'Crop Rotation Needed', desc: 'Repeat diagnostic scans indicate potential pest building patterns. Rotate wheat Sector B with legumes next season.', category: 'Crop Health' },
      { id: 2, title: 'Irrigation Deficit in Orchard Site', desc: 'Telemetry reports trace high soil dryness trends during afternoon periods. Boost irrigation cycles by 15 minutes.', category: 'Irrigation' },
      { id: 3, title: 'Optimize Nitrogen applications', desc: 'Soil analyses indicate high Nitrogen nitrogen density. Minimize urea fertilizer inputs to prevent chemical locks.', category: 'Soil Nutrition' }
    ];
    return recs;
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 relative text-white">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-50 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border backdrop-blur-xl ${
              toast.type === 'error' ? 'bg-rose-500/20 border-rose-500/50 text-rose-200 shadow-rose-900/40' : 
              toast.type === 'info' ? 'bg-blue-500/20 border-blue-500/50 text-blue-200 shadow-blue-900/40' :
              'bg-[#9333EA]/20 border-[#9333EA]/50 text-[#E9D5FF] shadow-purple-950/50'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle className="h-5 w-5" /> : 
             toast.type === 'info' ? <Info className="h-5 w-5" /> :
             <CheckCircle2 className="h-5 w-5" />}
            <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-black text-white tracking-tight">
              {t.reportsTitle}
            </h2>
            <span className="px-2.5 py-1 bg-[#D946EF]/20 text-[#D946EF] border border-[#D946EF]/30 rounded-lg text-xs font-bold uppercase tracking-wider">
              {t.aiPoweredAnalysis}
            </span>
          </div>
          <p className="text-[#E9D5FF] text-sm max-w-2xl leading-relaxed">
            {t.reportsSubtitle}
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={generateAIReport} 
            disabled={generatingAI}
            className="px-4 py-2.5 bg-gradient-to-r from-[#D946EF] to-[#8B5CF6] hover:opacity-90 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#D946EF]/20 disabled:opacity-50 cursor-pointer"
          >
            {generatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generatingAI ? t.consultingAI : t.consultAIAgronomist}
          </button>
          <button onClick={handlePrint} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer">
            <Printer className="h-4 w-4" /> {t.print}
          </button>
          <button onClick={handleExportCSV} className="px-4 py-2.5 bg-gradient-to-r from-[#9333EA] to-[#C026D3] hover:opacity-90 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#9333EA]/20 cursor-pointer">
            <Download className="h-4 w-4" /> {t.exportCSV}
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex overflow-x-auto gap-2 border-b border-white/10 pb-4 no-scrollbar">
        {[
          { id: 'dashboard', label: t.tabDashboard, icon: BarChart2 },
          { id: 'archive', label: t.tabExplorer, icon: FileText },
          { id: 'compare', label: t.tabComparison, icon: BookOpen },
          { id: 'timeline', label: t.tabTimeline, icon: Clock }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap focus:outline-none cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-[#9333EA]/20 text-[#D946EF] border border-[#9333EA]/30' 
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: INTELLIGENCE DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* AI Executive Summary Card */}
          <div className="bg-gradient-to-br from-[#121024] to-[#1a1738] p-6 rounded-3xl border border-[#9333EA]/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D946EF]/5 rounded-full blur-3xl -z-10" />
            <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wide">
                  <Sparkles className="h-5 w-5 text-[#D946EF] animate-pulse" /> {t.aiSummaryTitle}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {t.liveAssessment}
                </p>
              </div>
              <span className="bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 px-3 py-1 rounded-xl text-xs font-black">
                {t.statusExcellent}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: t.perfScore, value: '88/100', color: 'text-purple-400' },
                { label: t.overallFarmHealth, value: '85%', color: 'text-emerald-400' },
                { label: t.yield, value: `${reportStats.avgYield} ${language === 'hi' ? 'टन' : 'tons'}`, color: 'text-blue-400' },
                { label: t.diseaseStatus, value: t.activeWarning, color: 'text-rose-400' },
                { label: t.waterEfficiency, value: '92%', color: 'text-cyan-400' },
                { label: t.systemRisk, value: t.medium, color: 'text-orange-400' }
              ].map((perf, i) => (
                <div key={i} className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-gray-400 font-extrabold block uppercase tracking-wider">{perf.label}</span>
                  <span className={`text-base font-black ${perf.color}`}>{perf.value}</span>
                </div>
              ))}
            </div>

            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 mt-4 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>{t.aiRecommendation}</span>
              </div>
              <p className="text-gray-300 leading-relaxed font-medium">
                {t.overallRecommendationText}
              </p>
            </div>
          </div>

          {/* Farm Performance Scorecard Widgets */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              { label: t.farmHealth, value: '85/100', status: t.excellentLabel, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
              { label: t.predictedYield, value: '78/100', status: t.averageLabel, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
              { label: t.soil, value: `${(parseFloat(reportStats.avgSoil) * 10).toFixed(0)}/100`, status: t.excellentLabel, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
              { label: t.disease, value: '92/100', status: t.lowRiskLabel, color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
              { label: t.weatherIndex, value: '68/100', status: t.stormWarningLabel, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
              { label: t.sustainability, value: '94/100', status: t.optimalLabel, color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' }
            ].map((score, i) => (
              <div key={i} className={`p-4 rounded-3xl border text-center space-y-1.5 flex flex-col justify-between ${score.color}`}>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">{score.label}</span>
                <span className="text-2xl font-black block">{score.value}</span>
                <span className="text-[9px] bg-black/40 py-0.5 rounded px-2 font-bold inline-block mx-auto uppercase tracking-wide">{score.status}</span>
              </div>
            ))}
          </div>

          {/* Report Statistics ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
            {[
              { label: t.reportsCount, value: reportStats.total, color: 'text-purple-400' },
              { label: t.avgAIAccuracy, value: `${reportStats.avgScore}%`, color: 'text-[#D946EF]' },
              { label: t.avgSoilScore, value: `${reportStats.avgSoil}/10`, color: 'text-blue-400' },
              { label: t.commonPathogen, value: reportStats.mostCommonDisease === 'None' ? t.none : reportStats.mostCommonDisease, color: 'text-rose-400' },
              { label: t.totalCrops, value: reportStats.uniqueCropsCount, color: 'text-teal-400' },
              { label: t.digitalTwins, value: farms.length, color: 'text-emerald-400' },
              { label: t.avgExpectedYield, value: `${reportStats.avgYield}t`, color: 'text-cyan-400' }
            ].map((stat, i) => (
              <div key={i} className="bg-[#121024] p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">{stat.label}</span>
                <span className={`text-lg font-black block truncate ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Dynamic Interactive Analytics Chart Box */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Interactive charts panel */}
            <div className="lg:col-span-3 bg-[#121024]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-[#D946EF]" /> {t.trendMappingTitle}
                </h4>
                
                {/* Selector Buttons */}
                <div className="flex flex-wrap gap-1.5 text-xs font-bold bg-black/40 p-1 rounded-xl border border-white/5">
                  {[
                    { id: 'yield', label: t.chartYield },
                    { id: 'disease', label: t.chartDisease },
                    { id: 'nutrients', label: t.chartNutrients },
                    { id: 'soil', label: t.chartSoil },
                    { id: 'water', label: t.chartWater },
                    { id: 'risk', label: t.chartRisk }
                  ].map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChartType(ch.id as any)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        activeChartType === ch.id 
                          ? 'bg-[#9333EA]/20 text-[#D946EF] border border-[#9333EA]/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Plot */}
              <div className="h-72">
                {activeChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">{t.noHistoricalReadings}</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="name" stroke="#ffffff50" tick={{fontSize: 10}} />
                      <YAxis stroke="#ffffff50" tick={{fontSize: 10}} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '12px', fontSize: 11 }} />
                      
                      {activeChartType === 'yield' && (
                        <Line type="monotone" dataKey="Yield (Tons)" stroke="#10B981" strokeWidth={3} activeDot={{ r: 6 }} name={t.chartLabelYield} />
                      )}
                      {activeChartType === 'disease' && (
                        <Line type="monotone" dataKey="Confidence (%)" stroke="#EF4444" strokeWidth={3} name={t.chartLabelConfidence} />
                      )}
                      {activeChartType === 'nutrients' && (
                        <Line type="monotone" dataKey="NPK Level" stroke="#D946EF" strokeWidth={3} name={t.chartLabelNPK} />
                      )}
                      {activeChartType === 'soil' && (
                        <Line type="monotone" dataKey="Soil Health Score" stroke="#8B5CF6" strokeWidth={3} name={t.chartLabelSoilHealth} />
                      )}
                      {activeChartType === 'water' && (
                        <Line type="monotone" dataKey="Moisture (%)" stroke="#06B6D4" strokeWidth={3} name={t.chartLabelMoisture} />
                      )}
                      {activeChartType === 'risk' && (
                        <Line type="monotone" dataKey="Risk Rating" stroke="#F97316" strokeWidth={3} name={t.chartLabelRiskRating} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Farm-wide recommendations right column */}
            <div className="lg:col-span-1 bg-[#121024]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-2xl space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#D946EF]" /> {t.aiAdvisoryTasks}
                </h4>
                
                <div className="space-y-3 mt-3">
                  {[
                    { id: 1, title: t.cropRotationNeeded, desc: t.cropRotationDesc, category: language === 'hi' ? 'फसल स्वास्थ्य' : 'Crop Health' },
                    { id: 2, title: t.irrigationDeficitTitle, desc: t.irrigationDeficitDesc, category: language === 'hi' ? 'सिंचाई' : 'Irrigation' },
                    { id: 3, title: t.optimizeNitrogenTitle, desc: t.optimizeNitrogenDesc, category: language === 'hi' ? 'मिट्टी पोषण' : 'Soil Nutrition' }
                  ].map(rec => (
                    <div key={rec.id} className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                      <span className="text-[8px] bg-[#9333EA]/20 text-[#D946EF] font-bold px-2 py-0.5 rounded uppercase tracking-wider inline-block">{rec.category}</span>
                      <h5 className="text-xs font-extrabold text-white">{rec.title}</h5>
                      <p className="text-[10px] text-gray-400 leading-relaxed font-medium">{rec.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-3 rounded-2xl border border-emerald-500/20 text-center text-xs">
                <span className="text-[#34D399] font-bold block mb-1">{t.telemetryIntegrityCheck}</span>
                <span className="text-gray-300 font-medium">{t.allSensorsOnline}</span>
              </div>
            </div>

          </div>

          {/* AI Insights Summary dashboard */}
          <div className="bg-[#121024]/40 p-5 rounded-3xl border border-white/5">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5"><Compass className="h-4 w-4 text-[#D946EF]" /> {t.aiInsightsDashboard}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
              {[
                { title: t.mostCommonDisease, value: reportStats.mostCommonDisease === 'None' ? t.none : reportStats.mostCommonDisease, icon: Activity, color: 'text-rose-400' },
                { title: t.bestPerformingCrop, value: t.wheatSectorB, icon: Leaf, color: 'text-emerald-400' },
                { title: t.worstPerformingCrop, value: t.tomatoZoneA, icon: AlertTriangle, color: 'text-orange-400' },
                { title: t.mostFertileFarmSite, value: farms[0]?.name || t.northFarm, icon: Droplets, color: 'text-cyan-400' },
                { title: t.mostRecommendedFertilizer, value: t.npkFertilizer, icon: Target, color: 'text-purple-400' }
              ].map((ins, i) => (
                <div key={i} className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1.5 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-tight">{ins.title}</span>
                    <ins.icon className={`h-4 w-4 shrink-0 ${ins.color}`} />
                  </div>
                  <span className="font-extrabold text-white truncate block text-sm mt-1">{ins.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOCUMENT ARCHIVE */}
      {activeTab === 'archive' && (
        <div className="bg-[#121024]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col min-h-[580px]">
          
          {/* Smart Search & Advanced Filters toolbar */}
          <div className="p-4 border-b border-white/10 bg-white/5 space-y-4">
            
            {/* Row 1: Search & Filter toggle buttons */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex-1 min-w-[280px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder={t.trySearchPlaceholder}
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full h-11 pl-10 pr-4 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#9333EA] transition-colors"
                />
              </div>

              {/* Reset filters */}
              {((filterType !== 'All') || (filterStatus !== 'All') || (filterFarm !== 'All') || (filterDate !== 'All Time') || (filterRisk !== 'All') || (filterYield !== 'All') || (filterAIScore !== 'All') || searchQuery) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('All');
                    setFilterStatus('All');
                    setFilterFarm('All');
                    setFilterDate('All Time');
                    setFilterRisk('All');
                    setFilterYield('All');
                    setFilterAIScore('All');
                    showToast(t.filtersResetToast, 'info');
                  }}
                  className="text-xs font-bold text-[#D946EF] hover:underline cursor-pointer"
                >
                  {t.clearFilters}
                </button>
              )}
            </div>

            {/* Row 2: Select Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
              {/* Type */}
              <div>
                <select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }} className="w-full h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-white focus:outline-none">
                  <option value="All">{t.allCategories}</option>
                  {REPORT_TYPES.slice(1).map(type => <option key={type} value={type}>{getReportTypeLabel(type, language)}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="w-full h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-white focus:outline-none">
                  <option value="All">{t.allStatuses}</option>
                  {STATUSES.slice(1).map(stat => <option key={stat} value={stat}>{getStatusLabel(stat, language)}</option>)}
                </select>
              </div>

              {/* Farm */}
              <div>
                <select value={filterFarm} onChange={e => { setFilterFarm(e.target.value); setCurrentPage(1); }} className="w-full h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-white focus:outline-none">
                  <option value="All">{t.allFarms}</option>
                  {farms.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
              </div>

              {/* Date */}
              <div>
                <select value={filterDate} onChange={e => { setFilterDate(e.target.value); setCurrentPage(1); }} className="w-full h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-white focus:outline-none">
                  <option value="All Time">{t.allTime}</option>
                  <option value="Last 7 Days">{t.last7Days}</option>
                  <option value="Last 30 Days">{t.last30Days}</option>
                  <option value="This Year">{t.thisYear}</option>
                </select>
              </div>

              {/* Risk */}
              <div>
                <select value={filterRisk} onChange={e => { setFilterRisk(e.target.value); setCurrentPage(1); }} className="w-full h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-white focus:outline-none">
                  <option value="All">{t.allRisks}</option>
                  <option value="High">{t.highRiskSelect}</option>
                  <option value="Medium">{t.mediumRiskSelect}</option>
                  <option value="Low">{t.lowRiskSelect}</option>
                </select>
              </div>

              {/* Yield */}
              <div>
                <select value={filterYield} onChange={e => { setFilterYield(e.target.value); setCurrentPage(1); }} className="w-full h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-white focus:outline-none">
                  <option value="All">{t.allYields}</option>
                  <option value="High">{t.highYieldSelect}</option>
                  <option value="Average">{t.averageYieldSelect}</option>
                  <option value="Low">{t.lowYieldSelect}</option>
                </select>
              </div>

              {/* AI Score */}
              <div>
                <select value={filterAIScore} onChange={e => { setFilterAIScore(e.target.value); setCurrentPage(1); }} className="w-full h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-white focus:outline-none">
                  <option value="All">{t.allAIScores}</option>
                  <option value="Excellent">{t.excellentScoreSelect}</option>
                  <option value="Average">{t.averageScoreSelect}</option>
                  <option value="Low">{t.lowScoreSelect}</option>
                </select>
              </div>

              {/* Recently viewed list popup */}
              <div className="relative group">
                <button className="w-full h-10 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-center text-xs font-bold transition-all flex items-center justify-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {t.recentLabel}
                </button>
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#121024] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 overflow-hidden">
                  <div className="p-2 border-b border-white/5 text-[9px] uppercase tracking-wider text-gray-400 font-bold">{t.recentlyViewedHeader}</div>
                  {recentlyViewed.length === 0 ? (
                    <div className="p-3 text-[10px] text-gray-500 text-center">{t.noReportsPreviewed}</div>
                  ) : (
                    recentlyViewed.map(rv => (
                      <button 
                        key={rv._id} 
                        onClick={() => handleOpenPreview(rv)} 
                        className="w-full text-left px-3 py-2 text-[10px] hover:bg-white/5 transition-colors flex items-center gap-2 border-b border-white/5"
                      >
                        <FileText className="h-3 w-3 text-gray-400" />
                        <span className="truncate flex-1 font-bold text-gray-200">{getReportTypeLabel(rv.type, language)} ({rv.farmName})</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Bulk Actions Panel */}
          {selectedIds.size > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-[#9333EA]/20 border-b border-[#9333EA]/30 px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-[#E9D5FF] flex items-center gap-2">
                <Info className="h-4 w-4" /> {t('reportsSelectedCount', { count: selectedIds.size })}
              </span>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <button onClick={handleExportCSV} className="px-3 py-1.5 bg-black/40 hover:bg-black/60 rounded-xl text-white transition-colors cursor-pointer">{t.exportCSV}</button>
                <button onClick={handleExportExcel} className="px-3 py-1.5 bg-black/40 hover:bg-black/60 rounded-xl text-white transition-colors cursor-pointer">{t.exportExcel}</button>
                <button onClick={handleExportJSON} className="px-3 py-1.5 bg-black/40 hover:bg-black/60 rounded-xl text-white transition-colors cursor-pointer">{t.exportJSON}</button>
                <button onClick={handleMergePDF} className="px-3 py-1.5 bg-[#9333EA] hover:bg-purple-600 rounded-xl text-white transition-colors cursor-pointer flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> {t.mergeSelected}
                </button>
                <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/30 rounded-xl text-rose-300 transition-colors cursor-pointer">{t.deleteLabel}</button>
              </div>
            </motion.div>
          )}

          {/* Table list */}
          <div className="overflow-x-auto min-h-[400px]">
            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5"><Search className="h-6 w-6 text-gray-500" /></div>
                <h3 className="text-base font-bold text-white mb-2">{t.noReportsFound}</h3>
                <p className="text-gray-400 text-xs max-w-xs">{t.noReportsDesc}</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 bg-black/20 font-extrabold">
                    <th className="p-4 w-12 text-center">
                      <input type="checkbox" checked={selectedIds.size === paginatedData.length && paginatedData.length > 0} onChange={toggleAll} className="w-4 h-4 rounded border-white/20 bg-black/40 accent-[#9333EA] cursor-pointer" />
                    </th>
                    <th className="p-4 w-12"></th>
                    <th className="p-4 font-bold cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('createdAt')}>
                      <div className="flex items-center gap-2">{t.colDate} {sortConfig.key === 'createdAt' && <ChevronDown className={`h-3 w-3 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />}</div>
                    </th>
                    <th className="p-4 font-bold cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('type')}>
                      <div className="flex items-center gap-2">{t.colCategory} {sortConfig.key === 'type' && <ChevronDown className={`h-3 w-3 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />}</div>
                    </th>
                    <th className="p-4 font-bold">{t.colParameters}</th>
                    <th className="p-4 font-bold">{t.colQualityScore}</th>
                    <th className="p-4 font-bold text-right">{t.colActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedData.map((item) => {
                    const isSelected = selectedIds.has(item._id);
                    const isPinned = pinnedIds.has(item._id);
                    const tags = getReportTags(item);

                    const translateTag = (tag: string, lang: 'en' | 'hi') => {
                      if (lang === 'hi') {
                        switch (tag) {
                          case 'AI Generated': return 'एआई जनरेटेड';
                          case 'Healthy': return 'स्वस्थ';
                          case 'Low Moisture': return 'कम नमी';
                          case 'Nutrient Deficit': return 'पोषक तत्वों की कमी';
                          case 'Moderate Risk': return 'मध्यम जोखिम';
                          case 'Critical': return 'गंभीर';
                          case 'Fungal Disease': return 'कवक रोग';
                          case 'Excellent Yield': return 'उत्कृष्ट उपज';
                          case 'High Confidence': return 'उच्च विश्वसनीयता';
                          case 'Severe': return 'गंभीर';
                          case 'Moderate': return 'मध्यम';
                          case 'Low': return 'कम';
                          default: return tag;
                        }
                      }
                      return tag;
                    };

                    return (
                      <tr 
                        key={item._id} 
                        onClick={() => handleOpenPreview(item)}
                        className={`hover:bg-white/5 transition-colors cursor-pointer ${isSelected ? 'bg-[#9333EA]/10' : ''}`}
                      >
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={isSelected} onChange={(e) => toggleSelection(item._id, e as any)} className="w-4 h-4 rounded border-white/20 bg-black/40 accent-[#9333EA] cursor-pointer" />
                        </td>
                        <td className="p-4 flex gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                          <button onClick={(e) => togglePin(item._id, e)}>
                            <Pin className={`h-4.5 w-4.5 transition-colors ${isPinned ? 'fill-[#D946EF] text-[#D946EF]' : 'text-gray-500 hover:text-[#D946EF]'}`} />
                          </button>
                          <button onClick={(e) => toggleFavorite(item._id, e)}>
                            <Star className={`h-4.5 w-4.5 transition-colors ${item.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-gray-500 hover:text-yellow-500'}`} />
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-gray-200">{new Date(item.createdAt).toLocaleDateString()}</div>
                          <div className="text-[10px] text-gray-500">{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-bold text-white leading-snug">{getReportTypeLabel(item.type, language)}</div>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{item.farmName}</div>
                        </td>
                        <td className="p-4 space-y-1">
                          <div className="text-gray-300 max-w-xs truncate font-medium">
                            {item.type === 'Soil Analysis' && `${language === 'hi' ? 'नमी' : 'Moisture'}: ${item.moisture}%, pH: ${item.pH}`}
                            {item.type === 'Disease Diagnosis' && `${language === 'hi' ? 'पता चला' : 'Detected'}: ${localizeDiseaseName(item.diseaseName, language)} (${item.confidence}%)`}
                            {item.type === 'Yield Prediction' && `${language === 'hi' ? 'अनुमानित' : 'Est'}: ${item.predictedYield}t ${language === 'hi' ? 'फसल' : 'of'} ${item.cropType}`}
                            {item.type === 'AI Insights' && translateAIPromptResponse(item.summary, language)}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {tags.map((tag, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] text-gray-400 uppercase font-black tracking-wider">
                                {translateTag(tag, language)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          {/* AI Score Widgets */}
                          <div className="space-y-1 max-w-[120px]">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-gray-400">{language === 'hi' ? 'स्कोर:' : 'Score:'}</span>
                              <span className="text-emerald-400">{item.aiScore}/100</span>
                            </div>
                            <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden border border-white/5">
                              <div className="h-full bg-emerald-500" style={{ width: `${item.aiScore}%` }} />
                            </div>
                            <div className="flex justify-between text-[9px] text-gray-500">
                              <span>{language === 'hi' ? 'विश्वास:' : 'Conf:'} {item.confidence}%</span>
                              <span>{language === 'hi' ? 'जोखिम:' : 'Risk:'} {item.riskScore}%</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenPreview(item)}
                              className="px-2.5 py-1.5 bg-[#9333EA]/20 hover:bg-[#9333EA]/35 border border-[#9333EA]/30 text-[10px] font-bold text-[#D946EF] rounded-lg transition-all"
                            >
                              {t.previewLabel}
                            </button>
                            <button 
                              onClick={(e) => toggleArchive(item._id, e)}
                              className="p-1.5 text-gray-400 hover:text-[#D946EF] hover:bg-white/5 rounded-lg transition-colors"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleSingleDelete(item._id)}
                              className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between text-xs">
              <span className="text-gray-400">
                {t('showingEntries', { 
                  start: ((currentPage - 1) * itemsPerPage) + 1, 
                  end: Math.min(currentPage * itemsPerPage, filteredData.length), 
                  total: filteredData.length 
                })}
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

      {/* TAB 3: REPORT COMPARISON & MERGING */}
      {activeTab === 'compare' && (
        <div className="bg-[#121024]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <BookOpen className="h-5 w-5 text-[#D946EF]" /> {t.comparisonTitle}
              </h3>
              <p className="text-xs text-gray-400 mt-1">{t.comparisonSubtitle}</p>
            </div>
            {compareReports.length >= 2 && (
              <button
                onClick={handleMergePDF}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                {t.compileUnifiedPDF}
              </button>
            )}
          </div>

          {compareReports.length < 2 ? (
            <div className="py-24 text-center flex flex-col items-center">
              <BookOpen className="h-12 w-12 text-gray-600 mb-3" />
              <p className="text-sm text-gray-400">{t.comparisonEmptyState}</p>
              <button 
                onClick={() => setActiveTab('archive')}
                className="mt-4 px-4 py-2 bg-[#9333EA]/20 hover:bg-[#9333EA]/35 border border-[#9333EA]/30 text-xs font-bold text-[#D946EF] rounded-xl transition-all cursor-pointer"
              >
                {t.goExplorer}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {compareReports.map((report, idx) => {
                const isFirst = idx === 0;
                const prev = !isFirst ? compareReports[idx - 1] : null;

                return (
                  <div key={report._id} className="bg-black/30 p-5 rounded-3xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-start border-b border-white/5 pb-3">
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold">{language === 'hi' ? `रिपोर्ट #${idx + 1}` : `REPORT #${idx + 1}`}</span>
                        <h4 className="text-sm font-extrabold text-white">{getReportTypeLabel(report.type, language)}</h4>
                        <span className="text-[10px] text-gray-400">{report.farmName} | {new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className="bg-[#9333EA]/10 text-[#D946EF] border border-[#9333EA]/20 px-2 py-0.5 rounded text-[10px] font-bold">
                        {language === 'hi' ? 'स्कोर:' : 'Score:'} {report.aiScore}%
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* Soil Compare */}
                      {report.type === 'Soil Analysis' && (
                        <div className="space-y-2">
                          <span className="text-gray-400 font-bold block">{t.soilMetricChanges}</span>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-gray-500 block">{t.phLevel}</span>
                              <span className="font-extrabold text-white text-sm">
                                {report.pH} 
                                {prev && prev.type === 'Soil Analysis' && (
                                  <span className={`text-[10px] ml-1.5 ${report.pH >= prev.pH ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    ({report.pH >= prev.pH ? '+' : ''}{(report.pH - prev.pH).toFixed(1)})
                                  </span>
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 block">{t.moistureLabel}</span>
                              <span className="font-extrabold text-white text-sm">
                                {report.moisture}% 
                                {prev && prev.type === 'Soil Analysis' && (
                                  <span className={`text-[10px] ml-1.5 ${report.moisture >= prev.moisture ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    ({report.moisture >= prev.moisture ? '+' : ''}{(report.moisture - prev.moisture)}%)
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Disease Compare */}
                      {report.type === 'Disease Diagnosis' && (
                        <div className="space-y-2">
                          <span className="text-gray-400 font-bold block">{t.diseaseSeverityHeader}</span>
                          <div>
                            <span className="text-gray-500 block">{t.detectedPathogenLabel}</span>
                             <span className="font-extrabold text-rose-400 text-sm">{localizeDiseaseName(report.diseaseName, language)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">{t.severityClassificationLabel}</span>
                            <span className="font-extrabold text-white text-sm">
                              {language === 'hi' ? (report.severity === 'Severe' ? 'गंभीर' : report.severity === 'Moderate' ? 'मध्यम' : 'कम') : (report.severity || 'Moderate')}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Yield Compare */}
                      {report.type === 'Yield Prediction' && (
                        <div className="space-y-2">
                          <span className="text-gray-400 font-bold block">{t.yieldOutputsHeader}</span>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-gray-500 block">{t.cropTypeLabel}</span>
                              <span className="font-extrabold text-white text-sm">{report.cropType}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block">{t.yieldOutputLabel}</span>
                              <span className="font-extrabold text-emerald-400 text-sm">
                                {report.predictedYield}t 
                                {prev && prev.type === 'Yield Prediction' && (
                                  <span className={`text-[10px] ml-1.5 ${parseFloat(report.predictedYield) >= parseFloat(prev.predictedYield) ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    ({parseFloat(report.predictedYield) >= parseFloat(prev.predictedYield) ? '+' : ''}{(parseFloat(report.predictedYield) - parseFloat(prev.predictedYield)).toFixed(1)}t)
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* General AI Observations */}
                      <div className="space-y-1">
                        <span className="text-gray-400 font-bold block">{t.aiObservations}</span>
                        <p className="text-gray-300 leading-relaxed italic">
                          {report.type === 'Soil Analysis' ? t.soilObservationsFallback :
                           report.type === 'Disease Diagnosis' ? t('diseaseObservationsFallback', { diseaseName: report.diseaseName }) :
                           report.type === 'Yield Prediction' ? t.yieldObservationsFallback :
                           translateAIPromptResponse(report.summary, language)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* TAB 4: CHRONOLOGICAL FARM TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="bg-[#121024]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-wide">
              <Clock className="h-5 w-5 text-[#D946EF]" /> {t.timelineTitle}
            </h3>
            <p className="text-xs text-gray-400 mt-1">{t.timelineSubtitle}</p>
          </div>

          {timelineEvents.length === 0 ? (
            <div className="py-20 text-center text-gray-500 text-sm">{t.noTimelineEvents}</div>
          ) : (
            <div className="relative border-l border-[#9333EA]/30 ml-8 pl-8 space-y-8 py-4">
              {timelineEvents.map((item, idx) => {
                const tags = getReportTags(item);
                
                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-black/30 border border-white/5 rounded-2xl relative"
                  >
                    {/* Node marker */}
                    <div className="absolute -left-[43px] top-4 w-7 h-7 rounded-full bg-[#121024] border-2 border-[#D946EF] flex items-center justify-center font-bold text-xs text-white">
                      {idx + 1}
                    </div>

                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white leading-tight">{getReportTypeLabel(item.type, language)}</h4>
                          <span className="text-[9px] text-gray-500 font-mono">{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {item.type === 'Soil Analysis' && t('soilTimelineText', { moisture: item.moisture, pH: item.pH, farmName: item.farmName })}
                          {item.type === 'Disease Diagnosis' && t('diseaseTimelineText', { diseaseName: item.diseaseName, confidence: item.confidence })}
                          {item.type === 'Yield Prediction' && t('yieldTimelineText', { cropType: item.cropType, predictedYield: item.predictedYield })}
                          {item.type === 'AI Insights' && translateAIPromptResponse(item.summary, language)}
                        </p>
                        
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {tags.slice(0, 3).map((tag, tIdx) => (
                            <span key={tIdx} className="px-2 py-0.5 bg-[#9333EA]/10 border border-[#9333EA]/20 rounded-md text-[8px] text-[#D946EF] font-bold uppercase tracking-wider">
                              {translateTag(tag, language)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenPreview(item)}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white transition-all cursor-pointer"
                      >
                        {language === 'hi' ? 'विवरण' : 'Details'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DETAIL PREVIEW DRAWER MODEL DIALOG */}
      <AnimatePresence>
        {isPreviewOpen && selectedReport && (
          <React.Fragment>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
              onClick={() => setIsPreviewOpen(false)}
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-6 md:inset-x-24 lg:inset-x-48 top-12 bottom-12 bg-[#121024] border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col text-white"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-br from-white/5 to-transparent">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase bg-[#9333EA]/20 text-[#D946EF] border border-[#9333EA]/30 px-2.5 py-0.5 rounded font-black tracking-wider">{getReportTypeLabel(selectedReport.type, language)}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{t.refLabel}: {selectedReport._id}</span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1.5">{t('intelligencePreview', { farmName: selectedReport.farmName })}</h3>
                </div>
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
                
                {/* Score panel info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-black/40 p-4 rounded-3xl border border-white/5 text-center">
                  <div>
                    <span className="text-gray-400 block mb-0.5">{t.qualityRating}</span>
                    <span className="text-base font-extrabold text-emerald-400">{selectedReport.aiScore}/100</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">{t.aiOverallConfidence}</span>
                    <span className="text-base font-extrabold text-[#D946EF]">{selectedReport.confidence}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">{t.systemRiskIndex}</span>
                    <span className="text-base font-extrabold text-orange-400">{selectedReport.riskScore}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">{t.dateCompiled}</span>
                    <span className="text-base font-extrabold text-white">{new Date(selectedReport.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Recommendations Callout */}
                <div className="space-y-1.5 bg-[#9333EA]/10 p-4 rounded-2xl border border-[#9333EA]/20 text-[#E9D5FF]">
                  <h4 className="font-bold flex items-center gap-1.5 uppercase tracking-wide">
                    <Sparkles className="h-4 w-4 text-[#D946EF]" /> {t.aiDiagnosticsRec}
                  </h4>
                  <p className="leading-relaxed font-medium italic">
                    {selectedReport.type === 'Soil Analysis' ? t.soilRecFallback :
                     selectedReport.type === 'Disease Diagnosis' ? t('diseaseRecFallback', { diseaseName: selectedReport.diseaseName }) :
                     selectedReport.type === 'Yield Prediction' ? t.yieldRecFallback :
                     translateAIPromptResponse(selectedReport.summary, language)}
                  </p>
                </div>

                {/* Technical specifics table */}
                <div className="space-y-3">
                  <h4 className="font-bold text-white uppercase tracking-wider">{t.agronomyTelemetry}</h4>
                  <div className="bg-black/30 rounded-2xl border border-white/5 overflow-hidden">
                    {selectedReport.type === 'Soil Analysis' && (
                      <div className="divide-y divide-white/5">
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-400">{t.parameterSoilPH}</span>
                          <span className="font-bold text-white">{selectedReport.pH}</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-400">{t.parameterMoisture}</span>
                          <span className="font-bold text-blue-400">{selectedReport.moisture}%</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-400">{t.parameterNitrogen}</span>
                          <span className="font-bold text-white">{selectedReport.nitrogen || 0} mg/kg</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-400">{t.parameterPhosphorus}</span>
                          <span className="font-bold text-white">{selectedReport.phosphorus || 0} mg/kg</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-400">{t.parameterPotassium}</span>
                          <span className="font-bold text-white">{selectedReport.potassium || 0} mg/kg</span>
                        </div>
                      </div>
                    )}

                    {selectedReport.type === 'Disease Diagnosis' && (
                      <div className="divide-y divide-white/5">
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-400">{t.detectedPathogenLabel}</span>
                          <span className="font-bold text-rose-400">{localizeDiseaseName(selectedReport.diseaseName, language)}</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-400">{t.severityClassificationLabel}</span>
                          <span className="font-bold text-white">
                            {language === 'hi' ? (selectedReport.severity === 'Severe' ? 'गंभीर' : selectedReport.severity === 'Moderate' ? 'मध्यम' : 'कम') : (selectedReport.severity || 'Moderate')}
                          </span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-400">{t.parameterTreatment}</span>
                          <span className="font-bold text-white max-w-[220px] text-right inline-block">{selectedReport.treatment}</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-400">{t.parameterIntegrity}</span>
                          <span className="font-bold text-emerald-400">{t.verifiedOriginal}</span>
                        </div>
                      </div>
                    )}

                    {selectedReport.type === 'Yield Prediction' && (
                      <div className="divide-y divide-white/5">
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-400">{t.cropTypeLabel}</span>
                          <span className="font-bold text-white">{selectedReport.cropType}</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-400">{t.parameterPlantedArea}</span>
                          <span className="font-bold text-white">{selectedReport.area} {language === 'hi' ? 'एकड़' : 'acres'}</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-400">{t.yieldOutputLabel}</span>
                          <span className="font-bold text-emerald-400">{selectedReport.predictedYield} {language === 'hi' ? 'टन' : 'tons'}</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-gray-400">{t.parameterErrorMargin}</span>
                          <span className="font-bold text-white">{selectedReport.errorMargin || 6.2}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Footer controls */}
              <div className="p-6 border-t border-white/10 bg-black/20 flex gap-3">
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-white font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  {t.closePreview}
                </button>
                <button 
                  onClick={() => {
                    handleDownloadSingleReport(selectedReport);
                    setIsPreviewOpen(false);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-[#9333EA] to-[#C026D3] hover:opacity-90 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-950/20"
                >
                  <Download className="h-4 w-4" /> {t.downloadPDFReport}
                </button>
              </div>

            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>

    </div>
  );
}
