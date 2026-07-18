import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, AlertTriangle, CheckCircle2, Info, Search, Filter, Trash2, 
  Archive, CheckCircle, Download, FileText, Loader2, RefreshCw,
  TrendingUp, ShieldAlert, CloudLightning, Sprout, Droplets, MapPin,
  Calendar, BarChart2, Zap, Sparkles, Clock, ShieldCheck, ChevronRight, X, Eye
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { User, Farm } from '../types';
import { fetch } from '../utils/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { t as tr } from '../utils/i18n';

interface NotificationCenterProps {
  user: User;
  farms: Farm[];
  activeFarm: Farm | null;
  language?: 'en' | 'hi';
}

type Priority = 'high' | 'medium' | 'low';
type Category = 
  | 'disease' 
  | 'soil' 
  | 'weather' 
  | 'market' 
  | 'government' 
  | 'iot' 
  | 'irrigation' 
  | 'security' 
  | 'ai_recommendation';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: Category;
  priority: Priority;
  isRead: boolean;
  timestamp: string;
  farmId?: string;
  isArchived: boolean;
}

interface AgronomicDetails {
  crop: string;
  farm: string;
  analysis: string;
  causes: string;
  impact: string;
  actions: string;
  economicImpact: string;
  prevention: string;
}

const CATEGORIES: { id: Category; label: string; icon: any; color: string; bg: string; border: string }[] = [
  { id: 'disease', label: 'Disease Alerts', icon: Sprout, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { id: 'soil', label: 'Soil Alerts', icon: MapPin, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { id: 'weather', label: 'Weather Alerts', icon: CloudLightning, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'market', label: 'Market Prices', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'government', label: 'Gov Schemes', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { id: 'iot', label: 'IoT Devices', icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { id: 'irrigation', label: 'Irrigation', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-600/10', border: 'border-blue-600/20' },
  { id: 'security', label: 'Security', icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { id: 'ai_recommendation', label: 'AI Insights', icon: Sparkles, color: 'text-[#D946EF]', bg: 'bg-[#D946EF]/10', border: 'border-[#D946EF]/20' }
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { 
    id: 'n1', 
    title: 'Critical Soil Moisture Drop', 
    message: 'Zone 3 moisture level dropped below 20%. Immediate automatic irrigation cycle recommended.', 
    category: 'irrigation', 
    priority: 'high', 
    isRead: false, 
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), 
    isArchived: false 
  },
  { 
    id: 'n2', 
    title: 'Blight Risk Warning', 
    message: 'Climatic patterns indicate optimal humidity for Late Blight development. Preventative spraying advised.', 
    category: 'disease', 
    priority: 'high', 
    isRead: false, 
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), 
    isArchived: false 
  },
  { 
    id: 'n3', 
    title: 'Organic Soybeans Market Surge', 
    message: 'Wholesale Soybean prices increased by 14.5% across national commodity exchanges. Inventory liquidation favorable.', 
    category: 'market', 
    priority: 'medium', 
    isRead: true, 
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), 
    isArchived: false 
  },
  { 
    id: 'n4', 
    title: 'IoT Gateway Offline', 
    message: 'Primary soil sensor gateway (GT-992) lost ping telemetry. Re-establishing secure handshake protocol.', 
    category: 'iot', 
    priority: 'high', 
    isRead: false, 
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), 
    isArchived: false 
  },
  { 
    id: 'n5', 
    title: 'Solar Pump Subsidies Launched', 
    message: 'Ministry of Agriculture opens PM-KUSUM applications. Secure up to 60% reimbursement on off-grid systems.', 
    category: 'government', 
    priority: 'low', 
    isRead: true, 
    timestamp: new Date(Date.now() - 1000 * 60 * 1440).toISOString(), 
    isArchived: false 
  },
  { 
    id: 'n6', 
    title: 'Heavy Storm Forecast', 
    message: 'Adverse weather warning: High winds (>45 km/h) and hail expected. Secure greenhouse structural curtains.', 
    category: 'weather', 
    priority: 'high', 
    isRead: true, 
    timestamp: new Date(Date.now() - 1000 * 60 * 1800).toISOString(), 
    isArchived: false 
  },
  { 
    id: 'n7', 
    title: 'Perimeter Intrusion Detected', 
    message: 'Motion trigger alert: Unscheduled access registered at secondary equipment barn door.', 
    category: 'security', 
    priority: 'medium', 
    isRead: false, 
    timestamp: new Date(Date.now() - 1000 * 60 * 2880).toISOString(), 
    isArchived: false 
  },
  { 
    id: 'n8', 
    title: 'AI Harvesting Windows', 
    message: 'Yield model estimates that postponing Wheat Sector B harvesting by 4 days optimizes moisture grain density by 4.2%.', 
    category: 'ai_recommendation', 
    priority: 'medium', 
    isRead: false, 
    timestamp: new Date(Date.now() - 1000 * 60 * 4320).toISOString(), 
    isArchived: false 
  },
  { 
    id: 'n9', 
    title: 'Soil Acidification Warning', 
    message: 'Chemical sensors reported pH level of 5.3 in Orchard sector. Neutralizing lime application required.', 
    category: 'soil', 
    priority: 'medium', 
    isRead: true, 
    timestamp: new Date(Date.now() - 1000 * 60 * 5760).toISOString(), 
    isArchived: false 
  },
];

const ncTrans = {
  en: {
    title: 'Notification Center',
    subtitle: 'Smart Agronomic Alerting',
    heroDesc: 'Real-time digital twin monitoring dashboard, featuring automated disease, soil, weather, IoT, and AI-driven agricultural notifications.',
    criticalAlerts: 'Critical Alerts',
    warningAlerts: 'Warning Alerts',
    healthyFarms: 'Healthy Farms',
    aiRecs: 'AI Recommendations',
    filters: 'Filters',
    allAlerts: 'All Alerts',
    critical: 'Critical',
    warning: 'Warning',
    information: 'Information',
    resolved: 'Resolved',
    crop: 'Crop',
    farm: 'Farm',
    priority: 'Priority',
    date: 'Date',
    searchPlaceholder: 'Search notifications...',
    aiSummaryTitle: "Today's AI Farm Summary",
    overallHealth: 'Overall Farm Health',
    healthScore: 'Health Score',
    riskScore: 'Risk Score',
    quickActions: 'Quick Actions',
    generateReport: 'Generate Report',
    exportNotifs: 'Export Notifications',
    markAllRead: 'Mark All Read',
    refresh: 'Refresh Alerts',
    clearResolved: 'Clear Resolved',
    viewDetails: 'View Details',
    detailsTitle: 'Notification Details',
    resolveAlert: 'Resolve Alert',
    economicImpact: 'Estimated Economic Impact',
    preventionTips: 'Prevention Tips',
    causes: 'Possible Causes',
    impact: 'Potential Impact',
    aiAnalysis: 'AI Analysis',
    recommendedActions: 'Recommended Actions',
    triggerTestAlert: 'Trigger Test Alert',
    noAlertsFound: 'No Alerts Discovered',
    noAlertsDesc: 'No active agricultural telemetry alerts match the selected filters.',
    showing: 'Showing',
    to: 'to',
    of: 'of',
    alerts: 'alerts',
    prev: 'Prev',
    next: 'Next',
    summaryDiseaseRiskPre: 'Disease risk is ',
    summaryDiseaseRiskHighlight: 'HIGH',
    summaryDiseaseRiskPost: ' in Tomato sectors.',
    summarySoilMoisturePre: 'Soil moisture is ',
    summarySoilMoistureHighlight: 'LOW',
    summarySoilMoisturePost: ' in Zone 3 sensors.',
    summaryStormForecast: 'Heavy storm forecast expected tomorrow.',
    summaryIrrigationRecommended: 'Irrigation schedule recommended for today.',
    newFieldAdded: 'New Field Added',
    uiAlert: 'UI Alert'
  },
  hi: {
    title: 'अधिसूचना केंद्र',
    subtitle: 'स्मार्ट कृषि अलर्टिंग',
    heroDesc: 'वास्तविक समय डिजिटल ट्विन निगरानी डैशबोर्ड, जिसमें स्वचालित रोग, मिट्टी, मौसम, IoT और AI-संचालित कृषि सूचनाएं शामिल हैं।',
    criticalAlerts: 'गंभीर अलर्ट',
    warningAlerts: 'चेतावनी अलर्ट',
    healthyFarms: 'स्वस्थ फार्म',
    aiRecs: 'एआई सिफारिशें',
    filters: 'फ़िल्टर',
    allAlerts: 'सभी अलर्ट',
    critical: 'गंभीर',
    warning: 'चेतावनी',
    information: 'जानकारी',
    resolved: 'समाधानित',
    crop: 'फसल',
    farm: 'फार्म',
    priority: 'प्राथमिकता',
    date: 'तारीख',
    searchPlaceholder: 'अधिसूचनाएं खोजें...',
    aiSummaryTitle: "आज का एआई फार्म सारांश",
    overallHealth: 'कुल फार्म स्वास्थ्य',
    healthScore: 'स्वास्थ्य स्कोर',
    riskScore: 'जोखिम स्कोर',
    quickActions: 'त्वरित कार्रवाई',
    generateReport: 'रिपोर्ट बनाएं',
    exportNotifs: 'अधिसूचनाएं निर्यात करें',
    markAllRead: 'सभी पढ़ें',
    refresh: 'अलर्ट रीफ्रेश करें',
    clearResolved: 'समाधानित साफ़ करें',
    viewDetails: 'विवरण देखें',
    detailsTitle: 'अधिसूचना विवरण',
    resolveAlert: 'अलर्ट हल करें',
    economicImpact: 'अनुमानित आर्थिक प्रभाव',
    preventionTips: 'बचाव के उपाय',
    causes: 'संभावित कारण',
    impact: 'संभावित प्रभाव',
    aiAnalysis: 'एआई विश्लेषण',
    recommendedActions: 'अनुशंसित कार्रवाइयां',
    triggerTestAlert: 'परीक्षण अलर्ट ट्रिगर करें',
    noAlertsFound: 'कोई अलर्ट नहीं मिला',
    noAlertsDesc: 'चयनित फ़िल्टर के अनुकूल कोई कृषि अलर्ट उपलब्ध नहीं है।',
    showing: 'दिखा रहा है',
    to: 'से',
    of: 'का',
    alerts: 'अलर्ट',
    prev: 'पिछला',
    next: 'अगला',
    summaryDiseaseRiskPre: 'टमाटर क्षेत्रों में रोग का जोखिम ',
    summaryDiseaseRiskHighlight: 'उच्च',
    summaryDiseaseRiskPost: ' है।',
    summarySoilMoisturePre: 'ज़ोन 3 सेंसर में मिट्टी की नमी ',
    summarySoilMoistureHighlight: 'कम',
    summarySoilMoisturePost: ' है।',
    summaryStormForecast: 'कल भारी तूफान का पूर्वानुमान है।',
    summaryIrrigationRecommended: 'आज के लिए सिंचाई कार्यक्रम की सिफारिश की गई है।',
    newFieldAdded: 'नया फ़ील्ड जोड़ा गया',
    uiAlert: 'यूआई अलर्ट'
  }
};

export const translatePlainNotificationString = (text: string, lang: 'en' | 'hi') => {
  if (lang !== 'hi') return text;
  
  // Direct title/text lookups
  const directTranslations: Record<string, string> = {
    'New Field Added': 'नया फ़ील्ड जोड़ा गया',
    'UI Alert': 'यूआई अलर्ट',
    'Critical Soil Moisture Drop': 'मिट्टी की नमी में भारी गिरावट',
    'Blight Risk Warning': 'ब्लाइट रोग जोखिम चेतावनी',
    'Organic Soybeans Market Surge': 'जैविक सोयाबीन बाजार में उछाल',
    'IoT Gateway Offline': 'IoT गेटवे ऑफ़लाइन',
    'Solar Pump Subsidies Launched': 'सौर पंप सब्सिडी शुरू',
    'Heavy Storm Forecast': 'भारी तूफान का पूर्वानुमान',
    'Perimeter Intrusion Detected': 'परिसर में अनधिकृत प्रवेश का पता चला',
    'AI Harvesting Windows': 'एआई कटाई समय',
    'Soil Acidification Warning': 'मिट्टी अम्लीकरण चेतावनी',
    'New Farm Registered': 'नया फार्म पंजीकृत',
    'Farm Updated': 'फ़ार्म अद्यतन',
    'Farm Deleted': 'फ़ार्म हटाया गया',
    'Field Deleted': 'क्षेत्र हटाया गया',
    'New Crop Registered': 'नई फसल पंजीकृत',
    'New Sensor Configured': 'नया सेंसर कॉन्फ़िगर किया गया',
    'Sensor Status Update': 'सेंसर स्थिति अद्यतन',
    'Sensor Alert': 'सेंसर अलर्ट',
    'Irrigation Record Added': 'सिंचाई रिकॉर्ड जोड़ा गया',
    'Fertilizer Record Added': 'उर्वरक रिकॉर्ड जोड़ा गया',
    'Soil Analysis Completed': 'मिट्टी विश्लेषण पूरा हुआ',
    'Yield Projection Generated': 'उपज अनुमान जनरेट किया गया',
    'Crop Disease Detected': 'फसल रोग पाया गया',
    'Critical: High Risk Crop Disease!': 'गंभीर: उच्च जोखिम फसल रोग!',
    'Success: Crop Health Scan Complete': 'सफलता: फसल स्वास्थ्य स्कैन पूर्ण',
    'IoT Gateway Configured': 'आईओटी गेटवे कॉन्फ़िगर किया गया',
    'IoT Device Configured': 'IoT उपकरण कॉन्फ़िगर किया गया',
    'Irrigation Event Logged': 'सिंचाई घटना दर्ज की गई',
    'Weather Record Logged': 'मौसम रिकॉर्ड दर्ज किया गया',
    'AI Forecast Advice': 'एआई पूर्वानुमान सलाह',
    'AI Advisory Forecast': 'एआई सलाहकार पूर्वानुमान',
    'Government Scheme Logged': 'सरकारी योजना दर्ज की गई',
    'Wheat Rust Detected': 'गेहूं का रतुआ पाया गया',
    'Nitrogen Deficit Alert': 'नाइट्रोजन की कमी का अलर्ट',
    'Sudden Heat Warning': 'अचानक गर्मी की चेतावनी',
    'Grain Supply Spike': 'अनाज आपूर्ति में उछाल',
    'Organic Farming Incentives': 'जैविक खेती प्रोत्साहन',
    'Sensor Node Battery Critically Low': 'सेंसर नोड बैटरी गंभीर रूप से कम',
    'Water Valve Fault': 'पानी के वाल्व की खराबी',
    'Fence Boundary Anomaly': 'बाड़ सीमा विसंगति',
    'Optimal Pest Spraying Window': 'कीटनाशक छिड़काव का इष्टतम समय',
    'HIGH': 'उच्च',
    'LOW': 'निम्न',
    'MEDIUM': 'मध्यम',
    'CRITICAL': 'गंभीर',
    'INFO': 'जानकारी',
    'WARNING': 'चेतावनी',
    'SOIL ALERTS': 'मिट्टी अलर्ट',
    'IOT DEVICES': 'आईओटी उपकरण',
    'Zone 3 moisture level dropped below 20%. Immediate automatic irrigation cycle recommended.': 'जोन 3 में नमी का स्तर 20% से नीचे आ गया। तत्काल स्वचालित सिंचाई चक्र की सिफारिश की जाती है।',
    'Climatic patterns indicate optimal humidity for Late Blight development. Preventative spraying advised.': 'जलवायु पैटर्न लेट ब्लाइट रोग के विकास के लिए अनुकूल आर्द्रता का संकेत देते हैं। निवारक छिड़काव की सलाह दी जाती है।',
    'Wholesale Soybean prices increased by 14.5% across national commodity exchanges. Inventory liquidation favorable.': 'राष्ट्रीय कमोडिटी एक्सचेंजों में सोयाबीन की थोक कीमतों में 14.5% की वृद्धि हुई। स्टॉक बेचना अनुकूल रहेगा।',
    'Primary soil sensor gateway (GT-992) lost ping telemetry. Re-establishing secure handshake protocol.': 'प्राथमिक मिट्टी सेंसर गेटवे (GT-992) ने पिंग टेलीमेट्री खो दी। सुरक्षित हैंडशेक प्रोटोकॉल पुन: स्थापित किया जा रहा है।',
    'Ministry of Agriculture opens PM-KUSUM applications. Secure up to 60% reimbursement on off-grid systems.': 'कृषि मंत्रालय ने पीएम-कुसुम आवेदन खोले। ऑफ-ग्रिड प्रणालियों पर 60% तक प्रतिपूर्ति सुरक्षित करें।',
    'Adverse weather warning: High winds (>45 km/h) and hail expected. Secure greenhouse structural curtains.': 'प्रतिकूल मौसम की चेतावनी: तेज हवाएं (>45 किमी/घंटा) और ओलावृष्टि की संभावना। ग्रीनहाउस संरचनात्मक पर्दे सुरक्षित करें।',
    'Motion trigger alert: Unscheduled access registered at secondary equipment barn door.': 'मोशन ट्रिगर अलर्ट: द्वितीयक उपकरण खलिहान के दरवाजे पर अनधिकृत पहुंच दर्ज की गई।',
    'Yield model estimates that postponing Wheat Sector B harvesting by 4 days optimizes moisture grain density by 4.2%.': 'उपज मॉडल का अनुमान है कि गेहूं सेक्टर B की कटाई को 4 दिनों के लिए टालने से अनाज की नमी का घनत्व 4.2% तक अनुकूलित हो जाता है।',
    'Chemical sensors reported pH level of 5.3 in Orchard sector. Neutralizing lime application required.': 'रासायनिक सेंसरों ने ऑर्चर्ड सेक्टर में 5.3 के पीएच स्तर की सूचना दी। उदासीन करने वाले चूने के प्रयोग की आवश्यकता है।'
  };

  if (directTranslations[text]) {
    return directTranslations[text];
  }

  // Regex pattern matching fallbacks for dynamic fields in plain strings
  if (text.startsWith('Field "') && text.includes('has been added to farm')) {
    const match = text.match(/Field "([^"]+)" has been added to farm "([^"]+)"\./);
    if (match) return tr(lang, "notifications.fieldAdded", undefined, { fieldName: match[1], farmName: match[2] });
  }
  if (text.startsWith('Crop "') && text.includes('registered as growing on farm')) {
    const match = text.match(/Crop "([^"]+)"(?:\s*\(([^)]+)\))?\s*registered as growing on farm "([^"]+)"\./);
    if (match) return tr(lang, "notifications.cropRegistered", undefined, { cropName: match[1] + (match[2] ? ` (${match[2]})` : ''), farmName: match[3] });
  }
  if (text.startsWith('Sensor device "') && text.includes('is online on farm')) {
    const match = text.match(/Sensor device "([^"]+)"(?:\s*\(([^)]+)\))?\s*is online on farm "([^"]+)"\./);
    if (match) return tr(lang, "notifications.sensorOnline", undefined, { sensorName: match[1] + (match[2] ? ` (${match[2]})` : ''), farmName: match[3] });
  }
  if (text.startsWith('Soil analysis for "') && text.includes('completed')) {
    const match = text.match(/Soil analysis for "([^"]+)" completed\.(.*)/);
    if (match) {
      const main = tr(lang, "notifications.soilAnalysisCompleted", undefined, { farmName: match[1] });
      let extra = match[2] || '';
      if (extra && lang === 'hi') {
        extra = extra.replace('Health Score', 'स्वास्थ्य स्कोर');
      }
      return main + extra;
    }
  }

  if (text.startsWith('Digital Twin for "')) {
    const match = text.match(/Digital Twin for "([^"]+)" has been successfully created with ([^ ]+) acres of ([^.]+)\./);
    if (match) return `"${match[1]}" के लिए डिजिटल ट्विन सफलतापूर्वक ${match[2]} एकड़ ${match[3]} के साथ बनाया गया है।`;
  }
  if (text.startsWith('Details of your farm "')) {
    const match = text.match(/Details of your farm "([^"]+)" have been updated\./);
    if (match) return `आपके फ़ार्म "${match[1]}" के विवरण अपडेट कर दिए गए हैं।`;
  }
  if (text.startsWith('Farm "') && text.includes('has been removed')) {
    const match = text.match(/Farm "([^"]+)" has been removed\./);
    if (match) return `फ़ार्म "${match[1]}" हटा दिया गया है।`;
  }
  if (text.startsWith('Field "')) {
    const match = text.match(/Field "([^"]+)" was successfully removed from digital twin\./);
    if (match) return `डिजिटल ट्विन से फ़ील्ड "${match[1]}" सफलतापूर्वक हटा दी गई थी।`;
  }
  if (text.startsWith('New crop cycle "')) {
    const match = text.match(/New crop cycle "([^"]+)" registered for Field "([^"]+)"\./);
    if (match) return `फ़ील्ड "${match[2]}" के लिए नया फसल चक्र "${match[1]}" पंजीकृत किया गया।`;
  }
  if (text.startsWith('Sensor device "') && text.includes('online')) {
    const match = text.match(/Sensor device "([^"]+)" \(([^)]+)\) is now online\./);
    if (match) return `सेंसर उपकरण "${match[1]}" (${match[2]}) अब ऑनलाइन है।`;
  }
  if (text.startsWith('Sensor device "') && text.includes('offline')) {
    const match = text.match(/Sensor device "([^"]+)" went offline\. Telemetry connection lost\./);
    if (match) return `सेंसर उपकरण "${match[1]}" ऑफ़लाइन हो गया। टेलीमेट्री कनेक्शन टूट गया।`;
  }
  if (text.startsWith('Critical sensor alert: "')) {
    const match = text.match(/Critical sensor alert: "([^"]+)" reported high readings\./);
    if (match) return `गंभीर सेंसर अलर्ट: "${match[1]}" ने उच्च रीडिंग की सूचना दी।`;
  }
  if (text.startsWith('Irrigation of ')) {
    const match = text.match(/Irrigation of ([^ ]+)L recorded for ([^ ]+) in "([^"]+)"\./);
    if (match) return `"${match[3]}" में ${match[2]} के लिए ${match[1]}L सिंचाई दर्ज की गई।`;
  }
  if (text.startsWith('Fertilizer application of ')) {
    const match = text.match(/Fertilizer application of ([^ ]+)kg \(([^)]+)\) recorded for ([^.]+)\./);
    if (match) return `${match[3]} के लिए ${match[1]}kg (${match[2]}) उर्वरक प्रयोग दर्ज किया गया।`;
  }
  if (text.startsWith('Soil health analysis completed for "')) {
    const match = text.match(/Soil health analysis completed for "([^"]+)". pH: ([^,]+), Nitrogen: ([^ ]+) kg\/ha\./);
    if (match) return `"${match[1]}" के लिए मिट्टी स्वास्थ्य विश्लेषण पूरा हुआ। pH: ${match[2]}, नाइट्रोजन: ${match[3]} किग्रा/हेक्टेयर।`;
  }
  if (text.startsWith('AI model projected a yield of ')) {
    const match = text.match(/AI model projected a yield of ([^ ]+) tons for "([^"]+)" with ([^ ]+)% confidence accuracy\./);
    if (match) return `एआई मॉडल ने "${match[2]}" के लिए ${match[1]} टन उपज का अनुमान ${match[3]}% आत्मविश्वास सटीकता के साथ लगाया है।`;
  }
  if (text.startsWith('Disease "') || text.startsWith('A high risk disease "') || text.startsWith('A leaf scan for crop "')) {
    if (text.startsWith('Disease "')) {
      const match = text.match(/Disease "([^"]+)" detected on "([^"]+)"(?: on farm "([^"]+)")? with ([^ ]+)% confidence\./);
      if (match) {
        const farmPart = match[3] ? ` फ़ार्म "${match[3]}" पर` : '';
        let res = `फसल "${match[2]}"${farmPart} पर रोग "${match[1]}" की पहचान ${match[4]}% आत्मविश्वास के साथ हुई है।`;
        if (text.includes('Manual inspection is highly recommended')) {
          res += ' नोट: आत्मविश्वास 60% से कम है। मैन्युअल निरीक्षण की अत्यधिक सिफारिश की जाती है।';
        }
        return res;
      }
    } else if (text.startsWith('A high risk disease "')) {
      const match = text.match(/A high risk disease "([^"]+)" has been detected on "([^"]+)"(?: on farm "([^"]+)")? with severity "([^"]+)". Immediate action recommended!/);
      if (match) {
        const farmPart = match[3] ? ` फ़ार्म "${match[3]}" पर` : '';
        let res = `फसल "${match[2]}"${farmPart} पर एक उच्च जोखिम वाला रोग "${match[1]}" पाया गया है (गंभीरता "${match[4]}")। तत्काल कार्रवाई की सिफारिश की जाती है!`;
        if (text.includes('Manual inspection is highly recommended')) {
          res += ' नोट: आत्मविश्वास 60% से कम है। मैन्युअल निरीक्षण की अत्यधिक सिफारिश की जाती है।';
        }
        return res;
      }
    } else if (text.startsWith('A leaf scan for crop "')) {
      const match = text.match(/A leaf scan for crop "([^"]+)"(?: on farm "([^"]+)")? detected a healthy plant with ([^ ]+)% confidence\./);
      if (match) {
        const farmPart = match[2] ? ` फ़ार्म "${match[2]}" पर` : '';
        let res = `फसल "${match[1]}"${farmPart} के लिए पत्ती का स्कैन ${match[3]}% आत्मविश्वास के साथ एक स्वस्थ पौधा पाया गया।`;
        if (text.includes('Manual inspection is highly recommended')) {
          res += ' नोट: आत्मविश्वास 60% से कम है। मैन्युअल निरीक्षण की अत्यधिक सिफारिश की जाती है।';
        }
        return res;
      }
    }
  }

  return text;
};

const parseNotifText = (text: string, lang: 'en' | 'hi'): string => {
  if (!text) return '';
  let current = text;
  try {
    while (typeof current === 'string' && current.trim().startsWith('{')) {
      const obj = JSON.parse(current);
      if (obj && typeof obj === 'object') {
        const val = obj[lang] || obj['en'] || obj['title'] || obj['message'];
        if (val !== undefined) {
          current = val;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    return translatePlainNotificationString(current, lang);
  } catch (e) {
    return translatePlainNotificationString(current, lang);
  }
};

const translateCategoryLabel = (label: string, lang: 'en' | 'hi') => {
  if (lang !== 'hi') return label;
  const mapping: Record<string, string> = {
    'Disease Alerts': 'रोग अलर्ट',
    'Soil Alerts': 'मिट्टी अलर्ट',
    'Weather Alerts': 'मौसम अलर्ट',
    'Market Prices': 'बाजार मूल्य',
    'Gov Schemes': 'सरकारी योजनाएं',
    'IoT Devices': 'आईओटी उपकरण',
    'Irrigation': 'सिंचाई',
    'Security': 'सुरक्षा',
    'AI Insights': 'एआई अंतर्दृष्टि'
  };
  return mapping[label] || label;
};

const translatePriority = (priority: string, lang: 'en' | 'hi') => {
  if (!priority) return '';
  const lower = priority.toLowerCase();
  if (lower === 'high') return lang === 'hi' ? 'उच्च' : 'High';
  if (lower === 'low') return lang === 'hi' ? 'निम्न' : 'Low';
  if (lower === 'medium') return lang === 'hi' ? 'मध्यम' : 'Medium';
  if (lower === 'critical') return lang === 'hi' ? 'गंभीर' : 'Critical';
  return priority;
};

const getNotificationDetails = (n: AppNotification, farms: Farm[], lang: 'en' | 'hi' = 'en'): AgronomicDetails => {
  let farmName = 'North Field';
  if (n.farmId) {
    const f = farms.find(farm => farm.id === n.farmId);
    if (f) farmName = f.name;
  } else {
    if (farms.length > 0) {
      if (n.category === 'disease' || n.category === 'soil') {
        farmName = farms[0].name;
      } else if (n.category === 'irrigation' || n.category === 'iot') {
        farmName = farms[Math.min(1, farms.length - 1)].name;
      } else {
        farmName = farms[0].name;
      }
    }
  }

  const titleEnOrPlain = (() => {
    try {
      const obj = JSON.parse(n.title);
      return obj['en'] || n.title;
    } catch (e) {
      return n.title;
    }
  })();
  const msgEnOrPlain = (() => {
    try {
      const obj = JSON.parse(n.message);
      return obj['en'] || n.message;
    } catch (e) {
      return n.message;
    }
  })();

  const titleLower = titleEnOrPlain.toLowerCase();
  const msgLower = msgEnOrPlain.toLowerCase();

  if (titleLower.includes('moisture') || msgLower.includes('moisture') || n.category === 'irrigation') {
    return {
      crop: lang === 'hi' ? 'मक्का' : 'Maize',
      farm: farmName,
      analysis: lang === 'hi' 
        ? 'जोन 3 में मिट्टी की नमी का स्तर 20% की महत्वपूर्ण सीमा से नीचे गिर गया है, जिससे तनाव अलार्म ट्रिगर हो गया है।' 
        : 'Soil moisture levels in Zone 3 have dropped significantly below the critical thresholds of 20%, triggering stress alarms.',
      causes: lang === 'hi' 
        ? 'लंबे समय तक सूखा, बढ़ा हुआ तापमान और संभावित ड्रिप एमिटर कैल्सीफिकेशन ब्लॉक।' 
        : 'Prolonged dry spell, elevated temperature rates, and potential drip emitter calcification blocks.',
      impact: lang === 'hi' 
        ? 'सूखे से प्रेरित पोषक तत्वों का जमना, जड़ों की युक्तियों की मृत्यु, और पानी देने में देरी होने पर 15% तक की संभावित उपज में कमी।' 
        : 'Drought-induced nutrient locks, root tip death, and potential yield reduction of up to 15% if watering is delayed.',
      actions: lang === 'hi' 
        ? '55% क्षेत्र नमी क्षमता प्राप्त करने के लिए 45 मिनट के लिए वाल्व #3 के लिए स्वचालित ड्रिप सिंचाई चक्र शुरू करें।' 
        : 'Trigger automated drip irrigation cycle for Valve #3 for 45 minutes to achieve 55% field moisture capacity.',
      economicImpact: lang === 'hi' 
        ? 'यदि 48 घंटों तक अनुपचारित छोड़ दिया जाता है तो $450 की प्रत्यक्ष फसल उपज में गिरावट।' 
        : '$450 in direct crop yield degradation if left untreated for 48 hours.',
      prevention: lang === 'hi' 
        ? 'पानी के वाष्पीकरण को रोकने के लिए पुआल की मोटी परतें लगाएं। स्वचालित सेंसर सत्यापन अनुसूची करें।' 
        : 'Apply thick straw mulch layers to suppress water evaporation. Schedule automated sensors validations.'
    };
  }

  if (titleLower.includes('blight') || msgLower.includes('blight') || titleLower.includes('rust') || n.category === 'disease') {
    return {
      crop: lang === 'hi' ? 'टमाटर' : 'Tomato',
      farm: farmName,
      analysis: lang === 'hi' 
        ? 'पत्तियों की आर्द्रता सूचकांक 18°C पर लगातार 12 घंटों तक 85% से अधिक रहता है, जो स्पोर्स ऊष्मायन के लिए सही पैरामीटर प्रदान करता है।' 
        : 'Foliage humidity indexes exceed 85% for 12 straight hours at 18°C, providing perfect spores incubation parameters.',
      causes: lang === 'hi' 
        ? 'उच्च परिवेशी आर्द्रता के साथ-साथ पत्ती की सतहों पर सुबह की नमी का संघनन।' 
        : 'High ambient humidity coupled with damp morning dew condensation on leaf surfaces.',
      impact: lang === 'hi' 
        ? 'यदि रोगज़नक़ फैलता है तो 7 दिनों के भीतर तेजी से पत्ती झड़ना, तना सड़ना और कुल उपज का नुकसान।' 
        : 'Rapid defoliation, black stem rot, and total loss of foliage output within 7 days if pathogen spreads.',
      actions: lang === 'hi' 
        ? 'टमाटर क्षेत्र में निवारक जैविक तांबा कवकनाशी स्प्रे लागू करें और शुष्क हवा परिसंचरण को बढ़ावा देने के लिए निचली पत्तियों को ट्रिम करें।' 
        : 'Apply preventative biological copper fungicide spray to tomato zone and trim lower leaves to boost dry air circulation.',
      economicImpact: lang === 'hi' 
        ? 'संक्रमित क्षेत्र में संभावित फसल मूल्य में $1,200 का नुकसान।' 
        : '$1,200 loss in potential crop value across the infected sector.',
      prevention: lang === 'hi' 
        ? 'अगले रोपण चक्र में फसल की दूरी बढ़ाएं। सिंचाई कार्यक्रम को सुबह के समय स्थानांतरित करें।' 
        : 'Increase crop spacing in next planting cycle. Shift irrigation schedule to early morning hours.'
    };
  }

  if (titleLower.includes('soybean') || msgLower.includes('soybean') || n.category === 'market') {
    return {
      crop: lang === 'hi' ? 'सोयाबीन' : 'Soybeans',
      farm: farmName,
      analysis: lang === 'hi' 
        ? 'स्पॉट कमोडिटी एक्सचेंज जैविक तिलहन वेरिएंट के लिए एक तेज व्यापार प्रीमियम मूल्य वृद्धि (+14.5%) दर्शाते हैं।' 
        : 'Spot commodity exchanges show a sharp trading premium price increase (+14.5%) for organic oilseed variants.',
      causes: lang === 'hi' 
        ? 'प्रमुख उत्पादक क्षेत्रों में आयात प्रतिबंध और फसल आपूर्ति क्षति जिससे स्थानीय इन्वेंट्री की कमी हो रही है।' 
        : 'Import restrictions and crop supply damage in major producing regions creating localized inventory deficits.',
      impact: lang === 'hi' 
        ? 'खेत के सकल लाभ को अधिकतम करने के लिए उच्च मूल्य सूचकांकों का लाभ उठाने का अवसर।' 
        : 'Opportunity to capitalize on high pricing indices to maximize farm gross profits.',
      actions: lang === 'hi' 
        ? 'मूल्य मार्जिन बने रहने के दौरान 40% मानक सूखे जैविक सोयाबीन स्टॉक को तुरंत बेचें।' 
        : 'Sell 40% of standard dry organic soybean stocks immediately while price margins hold.',
      economicImpact: lang === 'hi' 
        ? 'इष्टतम इन्वेंट्री परिसमापन से सकल राजस्व में +$2,800 की वृद्धि।' 
        : '+$2,800 increase in gross revenues from optimal inventory liquidation.',
      prevention: lang === 'hi' 
        ? 'वास्तविक समय कृषि बाजार अलर्ट ट्रैकर सेट करें। वायुरोधी भंडारण की स्थिति बनाए रखें।' 
        : 'Set up real-time agricultural market alert trackers. Maintain airtight hermetic storage conditions.'
    };
  }

  if (titleLower.includes('pump') || msgLower.includes('pump') || titleLower.includes('subsidy') || n.category === 'government') {
    return {
      crop: lang === 'hi' ? 'सभी फसलें' : 'All Crops',
      farm: farmName,
      analysis: lang === 'hi' 
        ? 'राज्य सौर उपकरण एकीकरण के लिए पीएम-कुसुम सब्सिडी के लिए सरकारी योजना के आवेदन खुल गए हैं।' 
        : 'Government scheme applications for the PM-KUSUM subsidy have opened for state solar equipment integrations.',
      causes: lang === 'hi' 
        ? 'ग्रामीण क्षेत्रों में ग्रिड ओवरहेड्स को कम करने के उद्देश्य से नई सरकारी हरित ऊर्जा पहल।' 
        : 'New governmental green energy initiatives aimed at cutting grid overheads in rural areas.',
      impact: lang === 'hi' 
        ? 'गहरे कुएं के पंपों और स्वचालित सिंचाई नेटवर्क को चलाने के लिए दीर्घकालिक बिजली लागत को कम करता।' 
        : 'Reduces long-term power costs for running deep well pumps and automated irrigation networks.',
      actions: lang === 'hi' 
        ? '60% छूट का दावा करने के लिए राज्य पोर्टल पर प्रमाणित भूमि रजिस्ट्री फाइलें और जल परीक्षण प्रमाणपत्र अपलोड करें।' 
        : 'Upload certified land registry files and water testing certificates to the state portal to claim the 60% rebate.',
      economicImpact: lang === 'hi' 
        ? 'अनुमोदन होने पर $3,400 सीधे उपकरण लागत की बचत।' 
        : '$3,400 direct equipment cost savings upon approval.',
      prevention: lang === 'hi' 
        ? 'त्वरित आवेदनों के लिए स्पष्ट डिजिटल भूमि रिकॉर्ड बनाए रखें और फसल प्रमाणपत्र अपडेट रखें।' 
        : 'Maintain clear digitised land records and keep crop certifications updated for swift applications.'
    };
  }

  if (titleLower.includes('sensor') || titleLower.includes('offline') || titleLower.includes('gateway') || n.category === 'iot') {
    return {
      crop: lang === 'hi' ? 'लागू नहीं' : 'Not Applicable',
      farm: farmName,
      analysis: lang === 'hi' 
        ? 'सेंसर टेलीमेट्री तीन लगातार निर्धारित पोलिंग चक्रों के लिए अपडेट रिपोर्ट करने में विफल रही।' 
        : 'Sensor telemetry failed to report updates for three consecutive scheduled polling cycles.',
      causes: lang === 'hi' 
        ? 'IoT बैटरी सेल की निकासी 3.7V से नीचे, भौतिक पानी सील का उल्लंघन, या स्थानीय भौतिक क्षति।' 
        : 'IoT battery cell drainage below 3.7V, physical water seal breaches, or local physical damage.',
      impact: lang === 'hi' 
        ? 'लाइव डिजिटल ट्विन ट्रैकिंग मेट्रिक्स का नुकसान, इस क्षेत्र के लिए स्वचालित सीमा अलर्ट को अक्षम करना।' 
        : 'Loss of live digital twin tracking metrics, disabling automated threshold alerts for this zone.',
      actions: lang === 'hi' 
        ? 'लिथियम बैटरी पैक बदलें, सौर चार्जिंग शील्ड की जांच करें, और मैन्युअल रीबूट अनुक्रम करें।' 
        : 'Replace lithium battery pack, check solar charging shield, and perform manual reboot sequence.',
      economicImpact: lang === 'hi' 
        ? 'कोई प्रत्यक्ष फसल नुकसान नहीं, लेकिन मैन्युअल निगरानी के घंटे और स्वचालन विफलताओं का जोखिम बढ़ाता है।' 
        : 'No direct crop loss, but increases manual monitoring hours and automation failures risk.',
      prevention: lang === 'hi' 
        ? 'प्रत्येक 6 महीने में नैदानिक बैटरी जांच की योजना बनाएं। आवरण सीम पर जलरोधक सिलिकॉन कोटिंग्स लगाएं।' 
        : 'Schedule diagnostic battery checkups every 6 months. Apply waterproof silicon coatings to casing seams.'
    };
  }

  if (titleLower.includes('storm') || titleLower.includes('hail') || titleLower.includes('wind') || n.category === 'weather') {
    return {
      crop: lang === 'hi' ? 'सभी फसलें' : 'All Crops',
      farm: farmName,
      analysis: lang === 'hi' 
        ? '45 किमी/घंटे से अधिक हवा की गति और ओलावृष्टि की चेतावनी के साथ गंभीर तूफान की संभावना।' 
        : 'Severe storm cell incoming with forecasted wind speeds exceeding 45 km/h and hail warnings.',
      causes: lang === 'hi' 
        ? 'विपरीत ठंडे मोर्चे की टक्कर के कारण सूक्ष्म जलवायु संवहनी उतार-चढ़ाव।' 
        : 'Adverse cold front collision causing micro-climatic convective updrafts.',
      impact: lang === 'hi' 
        ? 'भौतिक फसल को नुकसान, पत्तियों का फटना, मिट्टी का कटाव और ग्रीनहाउस फ्रेम कवर की विफलता।' 
        : 'Physical crop damage, leaf tearing, soil erosion, and greenhouse frame cover failure.',
      actions: lang === 'hi' 
        ? 'ग्रीनहाउस की बगल की दीवारें बंद करें, शेड स्क्रीन को लॉक करें और सुनिश्चित करें कि सभी जल निकासी नहरें मलबे से मुक्त हों।' 
        : 'Close greenhouse side walls, lock shade screens, and ensure all drainage canals are free of debris.',
      economicImpact: lang === 'hi' 
        ? '$2,100 संभावित फसल क्षति और संरचनात्मक ग्रीनहाउस पॉली-कवरिंग प्रतिस्थापन।' 
        : '$2,100 potential crop damage and structural greenhouse poly-covering replacements.',
      prevention: lang === 'hi' 
        ? 'बाहरी ट्रेलिस सरणियों को सुदृढ़ करें। स्वचालित बंद होने के लिए आपातकालीन बैटरी बैकअप चार्ज रखें।' 
        : 'Reinforce exterior trellis arrays. Keep emergency battery backups charged for automatic closures.'
    };
  }

  if (titleLower.includes('intrusion') || titleLower.includes('security') || titleLower.includes('perimeter') || n.category === 'security') {
    return {
      crop: lang === 'hi' ? 'लागू नहीं' : 'Not Applicable',
      farm: farmName,
      analysis: lang === 'hi' 
        ? 'लेजर बैरियर टूटने से ड्यूटी के बाद सुरक्षा अलार्म बज उठा।' 
        : 'Boundary security alarm triggered during off-hours by laser barrier breaking.',
      causes: lang === 'hi' 
        ? 'अनधिकृत कर्मियों का प्रवेश या प्राथमिक गेट क्षेत्र को पार करने वाले जंगली जानवर।' 
        : 'Unscheduled personnel entry or wildlife traversing the primary gate field.',
      impact: lang === 'hi' 
        ? 'सुरक्षा क्षेत्रों के भीतर संपत्ति की चोरी, उपकरण क्षति, या फसल रौंदने का जोखिम।' 
        : 'Risk of asset theft, tool damage, or crop trampling inside security sectors.',
      actions: lang === 'hi' 
        ? 'गेट 2 का लाइव सीसीटीवी फीड देखें। परिधि बाड़ लगाने वाली लाइनों का निरीक्षण करने के लिए साइट पर नाइट फोरमैन को सचेत करें।' 
        : 'Check live CCTV feed of Gate 2. Alert on-site night foreman to inspect perimeter fencing lines.',
      economicImpact: lang === 'hi' 
        ? 'भारी मशीनरी या भंडारण उपकरण चोरी होने पर भारी नुकसान की संभावना।' 
        : 'High potential losses if heavy machinery or storage tools are stolen.',
      prevention: lang === 'hi' 
        ? 'सभी प्रवेश द्वारों पर गति-सक्रिय स्पॉटलाइट स्थापित करें। स्पष्ट चेतावनी नोटिस बनाए रखें।' 
        : 'Install motion-activated spotlights at all entry gates. Maintain clear warning notices.'
    };
  }

  if (titleLower.includes('harvest') || titleLower.includes('ripen') || n.category === 'ai_recommendation') {
    return {
      crop: lang === 'hi' ? 'गेहूं' : 'Wheat',
      farm: farmName,
      analysis: lang === 'hi' 
        ? 'गेहूं का नमी सूचकांक 13.5% पर आ गया है, जो उच्च गुणवत्ता वाले मिलिंग अनाज के लक्ष्यों से मेल खाता है।' 
        : 'Wheat moisture index has settled at 13.5%, matching high-quality milling grain targets.',
      causes: lang === 'hi' 
        ? 'गर्म, शुष्क मौसम समय पर अंतिम फसल सुखाने के चरणों को तेज करता है।' 
        : 'Warm, dry weather accelerate final crop dry-down phases on schedule.',
      impact: lang === 'hi' 
        ? 'उच्च दक्षता वाली यांत्रिक कटाई को सक्षम बनाता है और एलिवेटर्स पर नमी मूल्य निर्धारण दंड से बचाता है।' 
        : 'Enables high-efficiency mechanical harvesting and avoids moisture pricing penalties at elevators.',
      actions: lang === 'hi' 
        ? 'वापसी को अधिकतम करने के लिए अगले 4 दिनों के भीतर सेक्टर B में कंबाइन हार्वेस्टर टीमों को भेजें।' 
        : 'Dispatch combine harvester teams to Sector B within the next 4 days to maximize return.',
      economicImpact: lang === 'hi' 
        ? 'अनाज सुखाने के शुल्क और खेत के नुकसान से बचकर फसल लाभ मार्जिन में +$750।' 
        : '+$750 in crop profit margins by avoiding grain drying fees and field losses.',
      prevention: lang === 'hi' 
        ? 'सटीकता से परिपक्वता का अनुमान लगाने के लिए मिट्टी के तापमान के रुझान और सौर संचय को ट्रैक करें।' 
        : 'Track soil temperature trends and solar accumulation to project ripeness accurately.'
    };
  }

  if (titleLower.includes('acidification') || titleLower.includes('ph') || n.category === 'soil') {
    return {
      crop: lang === 'hi' ? 'सेब का बाग' : 'Apple Orchard',
      farm: farmName,
      analysis: lang === 'hi' 
        ? 'मिट्टी के सेंसर पीएच में 5.3 तक की भारी गिरावट का संकेत देते हैं, जिससे मैंगनीज और एल्यूमीनियम विषाक्तता का खतरा बढ़ जाता है।' 
        : 'Soil sensors indicate a severe pH drop to 5.3, raising risk of manganese and aluminum toxicity.',
      causes: lang === 'hi' 
        ? 'अत्यधिक नाइट्रोजन उर्वरक प्रयोग के बाद बारिश से मिट्टी के क्षारीय धनायनों का निक्षालन।' 
        : 'Excessive nitrogen fertilizer applications followed by rain leaching soil alkaline cations.',
      impact: lang === 'hi' 
        ? 'रूट सेल विभाजन का बाधित होना, खराब फास्फेट अवशोषण, और फसल की वृद्धि रुकना।' 
        : 'Inhibited root cell division, poor phosphate uptake, and stunted crop growth.',
      actions: lang === 'hi' 
        ? 'पीएच को वापस अनुकूलतम 6.5 बैंड तक बढ़ाने के लिए प्रति एकड़ 2.5 टन कैल्शियम कार्बोनेट चूना लागू करें।' 
        : 'Apply 2.5 tons of calcium carbonate lime per acre to raise pH back to the optimal 6.5 band.',
      economicImpact: lang === 'hi' 
        ? 'यदि पेड़ का तनाव बना रहने दिया जाता है तो पेड़ की उपज में $900 की गिरावट।' 
        : '$900 in tree yield degradation if tree stress is allowed to persist.',
      prevention: lang === 'hi' 
        ? 'ऑर्गेनिक खाद के साथ उच्च नाइट्रोजन रासायनिक आदानों को घुमाएं। तिमाही रासायनिक परीक्षण चलाएं।' 
        : 'Rotate high-nitrogen chemical inputs with organic compost. Run chemical tests quarterly.'
    };
  }

  return {
    crop: lang === 'hi' ? 'सामान्य फसलें' : 'General Crops',
    farm: farmName,
    analysis: lang === 'hi' 
      ? 'डिजिटल ट्विन मॉनिटरिंग इंजन द्वारा उत्पन्न सामान्य टेलीमेट्री ट्रिगर या नैदानिक अधिसूचना।' 
      : 'General telemetry trigger or diagnostic notification generated by the digital twin monitoring engine.',
    causes: lang === 'hi' 
      ? 'मानक सेंसर प्रतिक्रिया या निर्धारित कृषि प्रशासनिक कार्यक्रम।' 
      : 'Standard sensor feedback or scheduled agronomic administrative event.',
    impact: lang === 'hi' 
      ? 'सिस्टम को समीक्षा की आवश्यकता है। नियमित जांच के माध्यम से इष्टतम उपज बनी रहती है।' 
      : 'System requires review. Optimal yields are maintained via routine checkups.',
    actions: lang === 'hi' 
      ? 'सक्रिय खेत डैशबोर्ड की समीक्षा करें और निरीक्षण करने के बाद अधिसूचना अलर्ट साफ़ करें।' 
      : 'Review active farm dashboards and clear notification alerts once inspected.',
    economicImpact: lang === 'hi' 
      ? 'कम तत्काल वित्तीय जोखिम।' 
      : 'Low immediate financial risk.',
    prevention: lang === 'hi' 
      ? 'अत्यधिक अधिसूचना शोर को रोकने के लिए सेंसर थ्रेसहोल्ड कॉन्फ़िगर करें।' 
      : 'Configure sensor thresholds to prevent excess notification noise.'
  };
};

export default function NotificationCenter({ user, farms, activeFarm, language = 'en' }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const t = (() => {
    const translateKey = (key: string, params?: Record<string, string | number>): string => {
      if (!key) return '';
      let val = ncTrans[language]?.[key as keyof typeof ncTrans['en']];
      if (!val) {
        val = tr(language, key);
      }
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          val = val.replace(new RegExp(`{${k}}`, 'g'), String(v));
        });
      }
      return val;
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

  const renderText = (text: string) => {
    return parseNotifText(text, language);
  };

  // Visual layout sub-toggles
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'analytics'>('list');

  // Filters State
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'critical' | 'warning' | 'info' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<string>('all');
  const [selectedFarmFilter, setSelectedFarmFilter] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, searchQuery, selectedCrop, selectedFarmFilter, selectedPriority, selectedDateFilter]);

  // Fetch real notifications
  const fetchRealNotifications = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        if (data.notifications && data.notifications.length > 0) {
          const normalized = data.notifications.map((n: any) => ({
            id: n._id || n.id,
            title: n.title,
            message: n.message,
            category: n.category || 'ai_recommendation',
            priority: n.priority || 'medium',
            isRead: !!n.isRead,
            timestamp: n.createdAt || n.timestamp,
            isArchived: !!n.isArchived
          }));
          setNotifications(normalized);
          setDemoMode(false);
        } else {
          // Seed DB
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(INITIAL_NOTIFICATIONS)
          });
          const seedRes = await fetch(`/api/notifications?userId=${user.id}`);
          const seedData = await seedRes.json();
          if (seedData.success && seedData.notifications) {
            const normalized = seedData.notifications.map((n: any) => ({
              id: n._id || n.id,
              title: n.title,
              message: n.message,
              category: n.category || 'ai_recommendation',
              priority: n.priority || 'medium',
              isRead: !!n.isRead,
              timestamp: n.createdAt || n.timestamp,
              isArchived: !!n.isArchived
            }));
            setNotifications(normalized);
          } else {
            setNotifications(INITIAL_NOTIFICATIONS);
          }
          setDemoMode(false);
        }
      } else {
        setNotifications(INITIAL_NOTIFICATIONS);
        setDemoMode(true);
      }
    } catch (e) {
      console.warn("Using offline mode for notifications:", e);
      setNotifications(INITIAL_NOTIFICATIONS);
      setDemoMode(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealNotifications();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showBilingualToast = (messageKey: string, type: 'success' | 'error' | 'info' = 'success', dynamicVal?: string | number) => {
    let msg = '';
    if (language === 'hi') {
      const mappings: Record<string, string> = {
        'marked_resolved': 'अधिसूचना को समाधानित चिह्नित किया गया',
        'marked_unresolved': 'अधिसूचना को असमाधानित चिह्नित किया गया',
        'archived': 'अधिसूचना संग्रहीत की गई',
        'restored': 'अधिसूचना पुनः प्राप्त की गई',
        'deleted_permanently': 'अलर्ट स्थायी रूप से हटा दिया गया',
        'all_resolved': 'सभी सूचनाएं समाधानित चिह्नित की गईं',
        'no_resolved': 'साफ़ करने के लिए कोई समाधानित अधिसूचना नहीं है',
        'cleared_bulk': `संग्रह में ${dynamicVal} समाधानित अलर्ट साफ़ किए गए`,
        'processed_bulk': `${dynamicVal} अलर्ट के लिए थोक कार्रवाई संसाधित की गई`,
        'csv_success': 'CSV रिपोर्ट सफलतापूर्वक डाउनलोड की गई',
        'compiling_pdf': 'सुरक्षित पीडीएफ टेलीमेट्री दस्तावेज़ संकलित किया जा रहा है...',
        'pdf_success': 'पीडीएफ सफलतापूर्वक संकलित और डाउनलोड किया गया',
        'pdf_failed': `पीडीएफ संकलित करने में विफल: ${dynamicVal}`,
        'simulated': `नया ${dynamicVal} सिम्युलेटेड!`,
        'reset_filters': 'फ़िल्टर सफलतापूर्वक रीसेट किए गए',
        'assembling_digest': 'सजीव कृषि डाइजेस्ट रिपोर्ट तैयार की जा रही है...',
        'synced': 'अधिसूचना केंद्र सफलतापूर्वक सिंक किया गया'
      };
      msg = mappings[messageKey] || messageKey;
    } else {
      const mappings: Record<string, string> = {
        'marked_resolved': 'Notification marked as resolved',
        'marked_unresolved': 'Notification marked as unresolved',
        'archived': 'Notification archived',
        'restored': 'Notification restored',
        'deleted_permanently': 'Alert deleted permanently',
        'all_resolved': 'All notifications marked as resolved',
        'no_resolved': 'No resolved notifications to clear',
        'cleared_bulk': `Cleared ${dynamicVal} resolved alerts to archives`,
        'processed_bulk': `Processed bulk action for ${dynamicVal} alerts`,
        'csv_success': 'CSV report downloaded successfully',
        'compiling_pdf': 'Compiling secure PDF telemetry document...',
        'pdf_success': 'PDF compiled and downloaded successfully',
        'pdf_failed': `Failed to compile PDF: ${dynamicVal}`,
        'simulated': `New ${dynamicVal} simulated!`,
        'reset_filters': 'Filters reset successfully',
        'assembling_digest': 'Assembling live agronomic digest report...',
        'synced': 'Notification center synced successfully'
      };
      msg = mappings[messageKey] || messageKey;
    }
    showToast(msg, type);
  };

  // Filtered Notifications list
  const filteredNotifications = useMemo(() => {
    return notifications
      .filter(n => !n.isArchived)
      .filter(n => {
        if (selectedStatus === 'critical') return n.priority === 'high' && !n.isRead;
        if (selectedStatus === 'warning') return n.priority === 'medium' && !n.isRead;
        if (selectedStatus === 'info') return n.priority === 'low' && !n.isRead;
        if (selectedStatus === 'resolved') return n.isRead === true;
        return true;
      })
      .filter(n => selectedPriority === 'all' || n.priority === selectedPriority)
      .filter(n => {
        if (selectedCrop === 'all') return true;
        const details = getNotificationDetails(n, farms);
        return details.crop.toLowerCase() === selectedCrop.toLowerCase();
      })
      .filter(n => {
        if (selectedFarmFilter === 'all') return true;
        const details = getNotificationDetails(n, farms);
        return details.farm.toLowerCase() === selectedFarmFilter.toLowerCase();
      })
      .filter(n => {
        if (selectedDateFilter === 'all') return true;
        const diffDays = (Date.now() - new Date(n.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        if (selectedDateFilter === 'today') return diffDays <= 1;
        if (selectedDateFilter === 'yesterday') return diffDays > 1 && diffDays <= 2;
        if (selectedDateFilter === 'week') return diffDays <= 7;
        return true;
      })
      .filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, selectedStatus, selectedPriority, selectedCrop, selectedFarmFilter, selectedDateFilter, searchQuery, farms]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead && !n.isArchived).length;
  }, [notifications]);

  const criticalCount = useMemo(() => {
    return notifications.filter(n => n.priority === 'high' && !n.isRead && !n.isArchived).length;
  }, [notifications]);

  const warningCount = useMemo(() => {
    return notifications.filter(n => n.priority === 'medium' && !n.isRead && !n.isArchived).length;
  }, [notifications]);

  const aiRecsCount = useMemo(() => {
    return notifications.filter(n => n.category === 'ai_recommendation' && !n.isRead && !n.isArchived).length;
  }, [notifications]);

  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredNotifications.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredNotifications, currentPage]);

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);

  const handleToggleRead = async (id: string) => {
    const target = notifications.find(n => n.id === id);
    if (!target) return;
    
    const newIsRead = !target.isRead;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: newIsRead } : n));
    showBilingualToast(newIsRead ? 'marked_resolved' : 'marked_unresolved', 'success');

    // Update in selectedNotification if active
    if (selectedNotification && selectedNotification.id === id) {
      setSelectedNotification(prev => prev ? { ...prev, isRead: newIsRead } : null);
    }

    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: newIsRead })
      });
    } catch (err) {
      console.error("Failed to update read state in DB:", err);
    }
  };

  const handleToggleArchive = async (id: string) => {
    const target = notifications.find(n => n.id === id);
    if (!target) return;
    
    const newIsArchived = !target.isArchived;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isArchived: newIsArchived } : n));
    showBilingualToast(newIsArchived ? 'archived' : 'restored', 'info');

    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: newIsArchived })
      });
    } catch (err) {
      console.error("Failed to update archive state in DB:", err);
    }
  };

  const handleDelete = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    showBilingualToast('deleted_permanently', 'error');

    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error("Failed to delete notification in DB:", err);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    showBilingualToast('all_resolved', 'success');

    if (unreadIds.length > 0) {
      try {
        await fetch('/api/notifications/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: unreadIds, action: 'read' })
        });
      } catch (err) {
        console.error("Failed to mark all read in DB:", err);
      }
    }
  };

  const handleClearResolved = async () => {
    const resolvedIds = notifications.filter(n => n.isRead && !n.isArchived).map(n => n.id);
    if (resolvedIds.length === 0) {
      showBilingualToast('no_resolved', 'info');
      return;
    }

    setNotifications(prev => prev.map(n => resolvedIds.includes(n.id) ? { ...n, isArchived: true } : n));
    showBilingualToast('cleared_bulk', 'success', resolvedIds.length);

    try {
      await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: resolvedIds, action: 'archive' })
      });
    } catch (err) {
      console.error("Failed to clear resolved notifications:", err);
    }
  };

  const handleBulkAction = async (action: 'read' | 'archive' | 'delete') => {
    if (selectedIds.size === 0) return;
    const selectedIdsArray = Array.from(selectedIds);
    
    setNotifications(prev => {
      if (action === 'delete') {
        return prev.filter(n => !selectedIds.has(n.id));
      }
      return prev.map(n => {
        if (selectedIds.has(n.id)) {
          if (action === 'read') return { ...n, isRead: true };
          if (action === 'archive') return { ...n, isArchived: true };
        }
        return n;
      });
    });
    
    setSelectedIds(new Set());
    showBilingualToast('processed_bulk', 'success', selectedIdsArray.length);

    try {
      await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIdsArray, action })
      });
    } catch (err) {
      console.error("Failed to process bulk action in DB:", err);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getPriorityColor = (p: Priority) => {
    if (p === 'high') return 'text-red-400 bg-red-400/10 border-red-500/20';
    if (p === 'medium') return 'text-orange-400 bg-orange-400/10 border-orange-500/20';
    return 'text-blue-400 bg-blue-400/10 border-blue-500/20';
  };

  const getCategoryDetails = (c: Category) => {
    return CATEGORIES.find(cat => cat.id === c) || CATEGORIES[0];
  };

  const handleExportCSV = () => {
    const headers = 'ID,Title,Message,Category,Priority,IsRead,Timestamp\n';
    const rows = notifications
      .map(n => `"${n.id}","${n.title}","${n.message}","${n.category}","${n.priority}",${n.isRead},"${n.timestamp}"`)
      .join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `smart_agriculture_alerts_${new Date().toISOString().slice(0,10)}.csv`);
    a.click();
    showBilingualToast('csv_success', 'success');
  };

  const handleExportPDF = () => {
    showBilingualToast('compiling_pdf', 'info');
    setTimeout(() => {
      try {
        const doc = new jsPDF();
        
        // Header banner
        doc.setFillColor(147, 51, 234);
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(language === 'hi' ? 'स्मार्ट कृषि डिजिटल ट्विन' : 'SMART AGRICULTURE DIGITAL TWIN', 14, 18);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(language === 'hi' ? 'स्वचालित टेलीमेट्री अलर्ट और अधिसूचना रिपोर्ट' : 'Automated Telemetry Alerts & Notifications Report', 14, 26);
        doc.setFontSize(9);
        doc.text(`${language === 'hi' ? 'जनरेट किया गया' : 'Generated'}: ${new Date().toLocaleString()} | ${language === 'hi' ? 'उपयोगकर्ता' : 'User'}: ${user.name} (${user.email})`, 14, 34);

        // Map notifications list data
        const tableBody = notifications.map((n, index) => {
          const details = getNotificationDetails(n, farms, language);
          return [
            (index + 1).toString(),
            new Date(n.timestamp).toLocaleDateString(),
            renderText(n.title),
            translatePriority(n.priority, language).toUpperCase(),
            details.crop,
            details.farm,
            n.isRead ? (language === 'hi' ? 'समाधानित' : 'Resolved') : (language === 'hi' ? 'सक्रिय' : 'Active')
          ];
        });

        // Autotable
        autoTable(doc, {
          startY: 48,
          head: [language === 'hi' ? ['क्र.सं.', 'तारीख', 'अलर्ट शीर्षक', 'प्राथमिकता', 'फसल', 'फार्म', 'स्थिति'] : ['S.No', 'Date', 'Alert Title', 'Priority', 'Crop', 'Farm', 'Status']],
          body: tableBody,
          theme: 'striped',
          headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255] },
          styles: { fontSize: 8.5 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 20 },
            2: { cellWidth: 60 },
            3: { cellWidth: 20 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 },
            6: { cellWidth: 20 }
          }
        });

        // Key diagnostic callouts if alerts exist
        let currentY = (doc as any).lastAutoTable.finalY + 12;
        if (notifications.length > 0 && currentY < 250) {
          doc.setTextColor(147, 51, 234);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(language === 'hi' ? 'मुख्य अलर्ट गतिशील निदान:' : 'Key Alert Dynamic Diagnostics:', 14, currentY);
          currentY += 8;

          doc.setTextColor(60, 60, 60);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');

          notifications.slice(0, 3).forEach((n, idx) => {
            if (currentY > 260) {
              doc.addPage();
              currentY = 20;
            }
            const details = getNotificationDetails(n, farms, language);
            doc.setFont('helvetica', 'bold');
            doc.text(`${idx + 1}. [${translatePriority(n.priority, language).toUpperCase()}] ${renderText(n.title)}`, 14, currentY);
            currentY += 4.5;
            
            doc.setFont('helvetica', 'normal');
            const analysisText = language === 'hi' 
              ? `एआई सिफारिश: ${details.actions}\nबचाव के उपाय: ${details.prevention}`
              : `AI Recommendation: ${details.actions}\nPrevention: ${details.prevention}`;
            const textLines = doc.splitTextToSize(analysisText, 180);
            doc.text(textLines, 14, currentY);
            currentY += (textLines.length * 4.5) + 6;
          });
        }

        // Add page numbers
        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(7.5);
          doc.setTextColor(150, 150, 150);
          doc.text(language === 'hi' ? `पृष्ठ ${i} का ${totalPages} | जेमिनी एआई द्वारा संचालित` : `Page ${i} of ${totalPages} | Powered by Gemini AI`, 14, 287);
        }

        doc.save(`smart_agriculture_report_${new Date().toISOString().slice(0, 10)}.pdf`);
        showBilingualToast('pdf_success', 'success');
      } catch (err: any) {
        console.error('PDF compilation failed', err);
        showBilingualToast('pdf_failed', 'error', err.message);
      }
    }, 1200);
  };

  const simulateNotification = (type: Category) => {
    let title = '';
    let message = '';
    let priority: Priority = 'low';

    switch (type) {
      case 'disease':
        title = 'Wheat Rust Detected';
        message = 'AI Image scanner registered Puccinia graminis spores in Sector B. Isolated spraying advised.';
        priority = 'high';
        break;
      case 'soil':
        title = 'Nitrogen Deficit Alert';
        message = 'IoT Soil Spectrometer registered N-P-K depletion in Tomato greenhouse. Nitrogen top dressing required.';
        priority = 'medium';
        break;
      case 'weather':
        title = 'Sudden Heat Warning';
        message = 'Micro-climate sensors report rapid temperature rise to 39.5°C in high-tunnel greenhouses.';
        priority = 'high';
        break;
      case 'market':
        title = 'Grain Supply Spike';
        message = 'Heavy bumper harvests in neighboring states are putting downward pressure on spot Wheat pricing.';
        priority = 'low';
        break;
      case 'government':
        title = 'Organic Farming Incentives';
        message = 'State agriculture bureau announces direct income support schemes for bio-certified farmlands.';
        priority = 'low';
        break;
      case 'iot':
        title = 'Sensor Node Battery Critically Low';
        message = 'Battery level of Moisture Sensor #B14-Zone3 fell below 5%. Power cycle or cell swap recommended.';
        priority = 'medium';
        break;
      case 'irrigation':
        title = 'Water Valve Fault';
        message = 'Telemetry anomaly: Valve #3 remains closed despite irrigation system signal trigger.';
        priority = 'high';
        break;
      case 'security':
        title = 'Fence Boundary Anomaly';
        message = 'Infrared barrier alert: Laser grid interrupted along Sector C perimeter fencing.';
        priority = 'high';
        break;
      case 'ai_recommendation':
        title = 'Optimal Pest Spraying Window';
        message = 'Predictive models show high pest vulnerability over the next 48 hours. Wind conditions are optimal today.';
        priority = 'medium';
        break;
    }

    const newNotif: AppNotification = {
      id: 'n_sim_' + Math.random().toString(36).substr(2, 9),
      title,
      message,
      category: type,
      priority,
      isRead: false,
      timestamp: new Date().toISOString(),
      isArchived: false
    };

    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        message,
        category: type,
        priority
      })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
          fetchRealNotifications(true);
        } else {
          setNotifications(prev => [newNotif, ...prev]);
        }
      })
      .catch(err => {
        console.error("Failed to post simulated notification:", err);
        setNotifications(prev => [newNotif, ...prev]);
      });

    showBilingualToast('simulated', 'success', translateCategoryLabel(getCategoryDetails(type).label, language));
  };

  // Recharts Data preparation
  const volumeData = useMemo(() => {
    const days = language === 'hi' 
      ? ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = days.map(day => ({ name: day, Critical: 0, Warning: 0, Info: 0 }));
    
    notifications.forEach(n => {
      const date = n.timestamp;
      if (date) {
        const dayIndex = new Date(date).getDay();
        const priority = String(n.priority || '').toLowerCase();
        if (priority === 'high') {
          counts[dayIndex].Critical++;
        } else if (priority === 'medium') {
          counts[dayIndex].Warning++;
        } else {
          counts[dayIndex].Info++;
        }
      }
    });
    
    const monToSun = [1, 2, 3, 4, 5, 6, 0];
    return monToSun.map(idx => counts[idx]);
  }, [notifications]);



  const distributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    CATEGORIES.forEach(c => { counts[c.label] = 0; });
    notifications.forEach(n => {
      const label = getCategoryDetails(n.category).label;
      if (counts[label] !== undefined) counts[label]++;
    });
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => {
        const cat = CATEGORIES.find(c => c.label === name);
        return {
          name: translateCategoryLabel(name, language),
          value,
          color: cat ? cat.color.replace('text-', '#').replace('rose-400', 'f43f5e').replace('amber-400', 'fbbf24').replace('blue-400', '60a5fa').replace('emerald-400', '34d399').replace('purple-400', 'a78bfa').replace('cyan-400', '22d3ee').replace('blue-500', '3b82f6').replace('red-500', 'ef4444').replace('[#D946EF]', 'd946ef') : '#9333EA'
        };
      });
  }, [notifications]);

  const timelineGroups = useMemo(() => {
    const groups: Record<string, AppNotification[]> = {};
    filteredNotifications.forEach(n => {
      const date = new Date(n.timestamp);
      const todayStr = new Date().toDateString();
      const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
      
      let key = date.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      if (date.toDateString() === todayStr) key = language === 'hi' ? 'आज' : 'Today';
      else if (date.toDateString() === yesterdayStr) key = language === 'hi' ? 'कल' : 'Yesterday';

      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return Object.entries(groups);
  }, [filteredNotifications, language]);

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

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-black text-white tracking-tight">{t.title}</h2>
            <span className="px-2.5 py-1 bg-[#D946EF]/20 text-[#D946EF] border border-[#D946EF]/30 rounded-lg text-xs font-bold uppercase tracking-wider">
              {t.subtitle}
            </span>
          </div>
          <p className="text-[#E9D5FF] text-sm max-w-2xl leading-relaxed">
            {t.heroDesc}
          </p>
        </div>
      </div>

      {/* TOP SUMMARY SECTION - EXACTLY 4 CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Critical Alerts */}
        <div className="bg-[#121024]/80 backdrop-blur-xl p-5 rounded-3xl border border-rose-500/20 shadow-lg relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t.criticalAlerts}</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert className="h-4 w-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">{criticalCount}</span>
            <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +8%
            </span>
          </div>
        </div>

        {/* 2. Warning Alerts */}
        <div className="bg-[#121024]/80 backdrop-blur-xl p-5 rounded-3xl border border-amber-500/20 shadow-lg relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t.warningAlerts}</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">{warningCount}</span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              -2%
            </span>
          </div>
        </div>

        {/* 3. Healthy Farms Percentage */}
        <div className="bg-[#121024]/80 backdrop-blur-xl p-5 rounded-3xl border border-emerald-500/20 shadow-lg relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t.healthyFarms}</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-4xl font-black text-white">88%</span>
            <span className="text-[9px] text-gray-400 block mt-0.5">{language === 'hi' ? '6 में से 5 सेक्टर सामान्य' : '5 of 6 Sectors Normal'}</span>
          </div>
        </div>

        {/* 4. AI Recommendations pending */}
        <div className="bg-[#121024]/80 backdrop-blur-xl p-5 rounded-3xl border border-[#D946EF]/20 shadow-lg relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t.aiRecs}</span>
            <div className="p-1.5 rounded-lg bg-[#D946EF]/10 border border-[#D946EF]/20 text-[#D946EF]">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-4xl font-black text-white">{aiRecsCount}</span>
            <span className="text-[9px] text-gray-400 block mt-0.5">{language === 'hi' ? 'लंबित कार्रवाई वस्तुएं' : 'Pending Action Items'}</span>
          </div>
        </div>
      </div>

      {/* Main Structural Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* FILTER SECTION (Sidebar replacing old left navigation panel) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#121024]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#9333EA]" /> {t.filters}
              </h3>
              {((selectedStatus !== 'all') || searchQuery || (selectedCrop !== 'all') || (selectedFarmFilter !== 'all') || (selectedPriority !== 'all') || (selectedDateFilter !== 'all')) && (
                <button
                  onClick={() => {
                    setSelectedStatus('all');
                    setSearchQuery('');
                    setSelectedCrop('all');
                    setSelectedFarmFilter('all');
                    setSelectedPriority('all');
                    setSelectedDateFilter('all');
                    showBilingualToast('reset_filters', 'info');
                  }}
                  className="text-[10px] font-bold text-[#D946EF] hover:underline cursor-pointer"
                >
                  {language === 'hi' ? 'सभी साफ़ करें' : 'Clear All'}
                </button>
              )}
            </div>

            {/* Flat Selector Tabs */}
            <div className="space-y-1 bg-black/20 p-1.5 rounded-2xl border border-white/5">
              {[
                { id: 'all', label: t.allAlerts, color: 'border-l-[#9333EA]' },
                { id: 'critical', label: t.critical, color: 'border-l-rose-500' },
                { id: 'warning', label: t.warning, color: 'border-l-amber-500' },
                { id: 'info', label: t.information, color: 'border-l-blue-500' },
                { id: 'resolved', label: t.resolved, color: 'border-l-emerald-500' }
              ].map(status => (
                <button
                  key={status.id}
                  onClick={() => {
                    setSelectedStatus(status.id as any);
                    setSelectedIds(new Set());
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all border-l-4 flex items-center justify-between cursor-pointer ${status.color} ${
                    selectedStatus === status.id 
                      ? 'bg-white/5 text-white' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <span>{status.label}</span>
                  <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-md font-mono">
                    {status.id === 'all' ? notifications.filter(n => !n.isArchived).length :
                     status.id === 'critical' ? criticalCount :
                     status.id === 'warning' ? warningCount :
                     status.id === 'info' ? notifications.filter(n => n.priority === 'low' && !n.isRead && !n.isArchived).length :
                     notifications.filter(n => n.isRead && !n.isArchived).length}
                  </span>
                </button>
              ))}
            </div>

            <hr className="border-white/10" />

            {/* Dropdown Filters Grid */}
            <div className="space-y-4 text-xs">
              {/* Crop Filter */}
              <div>
                <label className="text-gray-400 font-bold block mb-1.5">{t.crop}</label>
                <select
                  value={selectedCrop}
                  onChange={e => setSelectedCrop(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#9333EA] transition-colors"
                >
                  <option value="all">{language === 'hi' ? 'सभी फसलें' : 'All Crops'}</option>
                  <option value="tomato">{language === 'hi' ? 'टमाटर' : 'Tomato'}</option>
                  <option value="wheat">{language === 'hi' ? 'गेहूं' : 'Wheat'}</option>
                  <option value="soybeans">{language === 'hi' ? 'सोयाबीन' : 'Soybeans'}</option>
                  <option value="maize">{language === 'hi' ? 'मक्का' : 'Maize'}</option>
                  <option value="apple orchard">{language === 'hi' ? 'सेब का बाग' : 'Apple Orchard'}</option>
                </select>
              </div>

              {/* Farm Filter */}
              <div>
                <label className="text-gray-400 font-bold block mb-1.5">{t.farm}</label>
                <select
                  value={selectedFarmFilter}
                  onChange={e => setSelectedFarmFilter(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#9333EA] transition-colors"
                >
                  <option value="all">{language === 'hi' ? 'सभी खेत' : 'All Farms'}</option>
                  {farms.map((f, idx) => (
                    <option key={idx} value={f.name.toLowerCase()}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="text-gray-400 font-bold block mb-1.5">{t.priority}</label>
                <select
                  value={selectedPriority}
                  onChange={e => setSelectedPriority(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#9333EA] transition-colors"
                >
                  <option value="all">{language === 'hi' ? 'सभी प्राथमिकताएं' : 'All Priorities'}</option>
                  <option value="high">{language === 'hi' ? 'उच्च प्राथमिकता' : 'High Priority'}</option>
                  <option value="medium">{language === 'hi' ? 'मध्यम प्राथमिकता' : 'Medium Priority'}</option>
                  <option value="low">{language === 'hi' ? 'निम्न प्राथमिकता' : 'Low Priority'}</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label className="text-gray-400 font-bold block mb-1.5">{t.date}</label>
                <select
                  value={selectedDateFilter}
                  onChange={e => setSelectedDateFilter(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#9333EA] transition-colors"
                >
                  <option value="all">{language === 'hi' ? 'पूरा समय' : 'All Time'}</option>
                  <option value="today">{language === 'hi' ? 'आज' : 'Today'}</option>
                  <option value="yesterday">{language === 'hi' ? 'कल' : 'Yesterday'}</option>
                  <option value="week">{language === 'hi' ? 'पिछले ७ दिन' : 'Last 7 Days'}</option>
                </select>
              </div>

              {/* Search Notifications */}
              <div>
                <label className="text-gray-400 font-bold block mb-1.5">{t.searchPlaceholder}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#9333EA] transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN ALERTS COLUMN & SIDEBAR DETAILS GRID */}
        <div className="lg:col-span-3 grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Main List Section */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-[#121024]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col min-h-[580px]">
              
              {/* Header Tab Toggles (Preserving Timeline & Analytics features cleanly inside view selector) */}
              <div className="p-4 border-b border-white/10 bg-white/5 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-2">
                  {[
                    { id: 'list', label: language === 'hi' ? 'सूची दृश्य' : 'List View', icon: Bell },
                    { id: 'timeline', label: language === 'hi' ? 'समयरेखा दृश्य' : 'Timeline View', icon: Clock },
                    { id: 'analytics', label: language === 'hi' ? 'विश्लेषण' : 'Analytics', icon: BarChart2 }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setViewMode(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        viewMode === tab.id
                          ? 'bg-[#9333EA]/20 text-[#D946EF] border border-[#9333EA]/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <tab.icon className="h-3.5 w-3.5" /> {tab.label}
                    </button>
                  ))}
                </div>

                {/* Bulk Select actions */}
                <div className="flex items-center gap-3">
                  {selectedIds.size > 0 ? (
                    <div className="flex items-center gap-2 bg-[#9333EA]/20 px-3 py-1.5 border border-[#9333EA]/30 rounded-xl animate-pulse">
                      <span className="text-xs font-bold text-[#D946EF] mr-1">{language === 'hi' ? `${selectedIds.size} चयनित` : `${selectedIds.size} Selected`}</span>
                      <button 
                        onClick={() => handleBulkAction('read')} 
                        className="p-1 hover:bg-white/10 rounded text-white transition-colors cursor-pointer" 
                        title={language === 'hi' ? 'पढ़ा हुआ चिह्नित करें' : 'Mark Read'}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => handleBulkAction('archive')} 
                        className="p-1 hover:bg-white/10 rounded text-white transition-colors cursor-pointer" 
                        title={language === 'hi' ? 'संग्रह करें' : 'Archive'}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => handleBulkAction('delete')} 
                        className="p-1 hover:bg-rose-500/20 rounded text-rose-400 transition-colors cursor-pointer" 
                        title={language === 'hi' ? 'हटाएं' : 'Delete'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    filteredNotifications.length > 0 && viewMode === 'list' && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-bold text-gray-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        {t.markAllRead}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Loader */}
              {loading ? (
                <div className="flex-1 p-4 space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="p-5 rounded-2xl border border-white/5 bg-white/5 animate-pulse flex items-start gap-4">
                      <div className="w-5 h-5 rounded border border-white/10 shrink-0 mt-1"></div>
                      <div className="w-10 h-10 rounded-xl bg-white/10 shrink-0"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-white/10 rounded w-1/4"></div>
                        <div className="h-3 bg-white/10 rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex-1 py-32 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10 shadow-lg">
                    <Bell className="h-10 w-10 text-gray-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{t.noAlertsFound}</h3>
                  <p className="text-sm text-gray-400 max-w-xs">{t.noAlertsDesc}</p>
                </div>
              ) : (
                <div className="flex-1 p-4 space-y-4">
                  {/* VIEW 1: MAIN NOTIFICATION CARDS LIST */}
                  {viewMode === 'list' && (
                    <div className="space-y-4">
                      <AnimatePresence>
                        {paginatedNotifications.map((notif) => {
                          const catInfo = getCategoryDetails(notif.category);
                          const CatIcon = catInfo.icon;
                          const isSelected = selectedIds.has(notif.id);
                          const details = getNotificationDetails(notif, farms, language);

                          // Semantic Status Colors: Red, Orange, Blue, Green
                          let cardColor = 'border-l-blue-500 bg-white/5 hover:border-white/10';
                          let iconColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                          if (notif.isRead) {
                            cardColor = 'border-l-emerald-500 bg-emerald-500/5 border border-emerald-500/10';
                            iconColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                          } else if (notif.priority === 'high') {
                            cardColor = 'border-l-rose-500 bg-rose-500/5 border border-rose-500/10';
                            iconColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                          } else if (notif.priority === 'medium') {
                            cardColor = 'border-l-orange-500 bg-orange-500/5 border border-orange-500/10';
                            iconColor = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
                          }

                          return (
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.98 }}
                              key={notif.id}
                              className={`p-5 rounded-3xl border-l-4 transition-all flex flex-col justify-between gap-4 ${cardColor} ${
                                isSelected ? 'ring-2 ring-[#9333EA]' : ''
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                {/* Bulk Selection Checkbox */}
                                <button 
                                  onClick={() => toggleSelection(notif.id)}
                                  className={`mt-1.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                                    isSelected ? 'bg-[#9333EA] border-[#9333EA]' : 'border-gray-500 hover:border-white'
                                  }`}
                                  aria-label="Select alert"
                                >
                                  {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                                </button>

                                {/* Category/Status Icon */}
                                <div className={`p-2.5 rounded-xl border flex-shrink-0 ${iconColor}`}>
                                  {notif.isRead ? <ShieldCheck className="h-5 w-5" /> : <CatIcon className="h-5 w-5" />}
                                </div>

                                {/* Content Details */}
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-base font-extrabold text-white tracking-tight leading-snug">
                                        {renderText(notif.title)}
                                      </h4>
                                      {!notif.isRead && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>}
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-mono">
                                      {new Date(notif.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>

                                  {/* Farm & Crop Labels */}
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                    <span className="text-gray-300 flex items-center gap-1.5">
                                      <Sprout className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                      <strong>{t.crop}:</strong> {details.crop}
                                    </span>
                                    <span className="text-gray-300 flex items-center gap-1.5">
                                      <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                      <strong>{t.farm}:</strong> {details.farm}
                                    </span>
                                  </div>

                                  {/* Message / Summary */}
                                  <p className="text-xs text-gray-400 leading-relaxed font-medium">
                                    {renderText(notif.message)}
                                  </p>

                                  {/* Short AI Analysis preview */}
                                  <div className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1 text-xs">
                                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                                      <Sparkles className="h-3.5 w-3.5" />
                                      <span>{language === 'hi' ? 'एआई पूर्वानुमान सलाह:' : 'AI Forecast Advice:'}</span>
                                    </div>
                                    <p className="text-gray-300 leading-relaxed italic">
                                      {details.actions}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Card Actions bar */}
                              <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1 pl-8">
                                <div className="flex gap-2">
                                  {notif.isRead ? (
                                    <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      {t.resolved}
                                    </span>
                                  ) : (
                                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${getPriorityColor(notif.priority)}`}>
                                      {translatePriority(notif.priority, language)}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center">
                                    • {translateCategoryLabel(catInfo.label, language)}
                                  </span>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setSelectedNotification(notif)}
                                    className="px-3.5 py-1.5 bg-[#9333EA]/20 hover:bg-[#9333EA]/35 border border-[#9333EA]/30 text-xs font-bold text-[#D946EF] rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="h-3.5 w-3.5" /> {t.viewDetails}
                                  </button>
                                  {!notif.isRead && (
                                    <button
                                      onClick={() => handleToggleRead(notif.id)}
                                      className="px-3.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold text-emerald-400 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" /> {t.resolveAlert}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* VIEW 2: CHRONOLOGICAL TIMELINE */}
                  {viewMode === 'timeline' && (
                    <div className="relative border-l border-[#9333EA]/30 ml-4 pl-8 space-y-8 py-4">
                      {timelineGroups.map(([dateGroup, items]) => (
                        <div key={dateGroup} className="relative space-y-4">
                          <div className="absolute -left-[45px] top-1 bg-[#130722] border border-[#9333EA]/50 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#D946EF] shadow-lg">
                            {dateGroup}
                          </div>

                          <div className="space-y-4 pt-8">
                            {items.map(item => {
                              const catInfo = getCategoryDetails(item.category);
                              const CatIcon = catInfo.icon;
                              const details = getNotificationDetails(item, farms, language);

                              return (
                                <motion.div
                                  key={item.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className={`p-4 rounded-2xl border transition-all relative ${
                                    item.isRead ? 'bg-white/5 border-transparent' : 'bg-[#9333EA]/10 border border-[#9333EA]/20 shadow-lg'
                                  }`}
                                >
                                  {/* Timeline node */}
                                  <div className={`absolute -left-[45px] top-4 w-7 h-7 rounded-full bg-[#121024] border-2 border-current ${catInfo.color} flex items-center justify-center shadow-md`}>
                                    <CatIcon className="h-3.5 w-3.5" />
                                  </div>

                                  <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-white leading-snug">{renderText(item.title)}</h4>
                                        {!item.isRead && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
                                      </div>
                                      <p className="text-xs text-gray-300 leading-relaxed">{renderText(item.message)}</p>
                                      
                                      <div className="flex gap-3 text-[10px] text-gray-400">
                                        <span>🌾 {details.crop}</span>
                                        <span>📍 {details.farm}</span>
                                      </div>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-mono">
                                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* VIEW 3: ANALYTICS CHARTS */}
                  {viewMode === 'analytics' && (
                    <div className="space-y-6">
                      <div className="bg-[#121024]/40 p-5 rounded-3xl border border-white/5">
                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Clock className="h-4 w-4" /> {language === 'hi' ? 'साप्ताहिक अलर्ट आवृत्ति चार्ट' : 'Weekly Alert Frequency Chart'}</h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={volumeData}>
                              <defs>
                                <linearGradient id="colorCrit" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorWarn" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                              <XAxis dataKey="name" stroke="#ffffff50" tick={{fontSize: 10}} />
                              <YAxis stroke="#ffffff50" tick={{fontSize: 10}} />
                              <RechartsTooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '8px', fontSize: 10 }} />
                              <Area type="monotone" dataKey="Critical" stroke="#ef4444" fillOpacity={1} fill="url(#colorCrit)" name={language === 'hi' ? 'गंभीर चेतावनियाँ' : 'Critical Warnings'} />
                              <Area type="monotone" dataKey="Warning" stroke="#f97316" fillOpacity={1} fill="url(#colorWarn)" name={language === 'hi' ? 'सामान्य अलर्ट' : 'General Alerts'} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* PieChart distribution */}
                      <div className="bg-[#121024]/40 p-5 rounded-3xl border border-white/5 flex flex-col items-center">
                        <h4 className="text-sm font-bold text-white mb-4 self-start flex items-center gap-2"><BarChart2 className="h-4 w-4" /> {language === 'hi' ? 'अलर्ट श्रेणी वितरण' : 'Alert Category Distribution'}</h4>
                        <div className="h-56 w-full relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={distributionData}
                                cx="50%" cy="50%"
                                innerRadius={45}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {distributionData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '8px', fontSize: 10 }} />
                              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pagination Footer */}
                  {totalPages > 1 && viewMode === 'list' && (
                    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/5 pt-4 px-2 gap-3 text-xs">
                      <span className="text-gray-400">
                        {t.showing} <span className="text-white font-medium">{Math.min(filteredNotifications.length, (currentPage - 1) * itemsPerPage + 1)}</span> {t.to} <span className="text-white font-medium">{Math.min(filteredNotifications.length, currentPage * itemsPerPage)}</span> {t.of} <span className="text-white font-medium">{filteredNotifications.length}</span> {t.alerts}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 text-white transition-all font-medium cursor-pointer"
                        >
                          {t.prev}
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }).map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentPage(index + 1)}
                              className={`w-7 h-7 rounded-lg text-center transition-all flex items-center justify-center font-medium ${
                                currentPage === index + 1
                                  ? 'bg-[#9333EA] text-white'
                                  : 'hover:bg-white/5 text-gray-400 hover:text-white cursor-pointer'
                              }`}
                            >
                              {index + 1}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 text-white transition-all font-medium cursor-pointer"
                        >
                          {t.next}
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>

          {/* Right Side Column: TODAY'S AI SUMMARY & QUICK ACTIONS */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Notion-style TODAY'S AI SUMMARY CARD */}
            <div className="bg-[#121024]/80 backdrop-blur-xl p-5 rounded-3xl border border-[#9333EA]/20 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <Sparkles className="h-4 w-4 text-[#D946EF] animate-pulse" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">{t.aiSummaryTitle}</h4>
              </div>
              
              {/* Bullet points */}
              <ul className="space-y-3 text-xs text-gray-300 leading-relaxed font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-extrabold mt-0.5">•</span>
                  <span>{t.summaryDiseaseRiskPre}<strong className="text-rose-400">{t.summaryDiseaseRiskHighlight}</strong>{t.summaryDiseaseRiskPost}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-500 font-extrabold mt-0.5">•</span>
                  <span>{t.summarySoilMoisturePre}<strong className="text-amber-400">{t.summarySoilMoistureHighlight}</strong>{t.summarySoilMoisturePost}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-blue-500 font-extrabold mt-0.5">•</span>
                  <span>{t.summaryStormForecast}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-extrabold mt-0.5">•</span>
                  <span>{t.summaryIrrigationRecommended}</span>
                </li>
              </ul>

              {/* Overall Health metrics (Linear trackers for premium Notion design) */}
              <div className="space-y-3 pt-3 border-t border-white/10 text-xs">
                <span className="text-gray-400 font-extrabold uppercase tracking-wider block mb-1">{t.overallHealth}</span>
                
                {/* Health Score */}
                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-300">{t.healthScore}</span>
                    <span className="text-emerald-400">85%</span>
                  </div>
                  <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: '85%' }} />
                  </div>
                </div>

                {/* Risk Score */}
                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-300">{t.riskScore}</span>
                    <span className="text-rose-400">15%</span>
                  </div>
                  <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-gradient-to-r from-rose-500 to-red-400 rounded-full" style={{ width: '15%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS CARD */}
            <div className="bg-[#121024]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-2xl space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-white/10 flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#D946EF]" /> {t.quickActions}
              </h4>

              <div className="grid grid-cols-1 gap-2.5 text-xs font-bold">
                {/* 1. Generate Report */}
                <button
                  onClick={() => {
                    showBilingualToast('assembling_digest', 'info');
                    handleExportPDF();
                  }}
                  className="w-full py-3 px-4 bg-[#9333EA]/20 hover:bg-[#9333EA]/35 border border-[#9333EA]/30 text-white rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#9333EA]/10"
                >
                  <FileText className="h-4 w-4 text-[#D946EF]" /> {t.generateReport}
                </button>

                {/* 2. Export Notifications (dropdown style for CSV/PDF) */}
                <div className="relative group">
                  <button
                    className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-[#D946EF]" /> {t.exportNotifs}
                  </button>
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#121024] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 overflow-hidden">
                    <button 
                      onClick={handleExportCSV} 
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center gap-2 text-gray-300 hover:text-white"
                    >
                      <FileText className="h-4 w-4 text-emerald-400" /> {language === 'hi' ? 'CSV निर्यात करें' : 'Export CSV'}
                    </button>
                    <button 
                      onClick={handleExportPDF} 
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center gap-2 text-gray-300 hover:text-white"
                    >
                      <Download className="h-4 w-4 text-rose-400" /> {language === 'hi' ? 'PDF निर्यात करें' : 'Export PDF'}
                    </button>
                  </div>
                </div>

                {/* 3. Mark All Read */}
                <button
                  onClick={handleMarkAllRead}
                  className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="h-4 w-4 text-emerald-400" /> {t.markAllRead}
                </button>

                {/* 4. Refresh */}
                <button
                  onClick={() => {
                    fetchRealNotifications();
                    showBilingualToast('synced', 'success');
                  }}
                  className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4 text-blue-400" /> {t.refresh}
                </button>

                {/* 5. Clear Resolved */}
                <button
                  onClick={handleClearResolved}
                  className="w-full py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" /> {t.clearResolved}
                </button>
              </div>

              {/* Collapsible Test simulator for demo completeness */}
              <div className="pt-3 border-t border-white/10">
                <div className="relative group">
                  <button className="w-full py-2 bg-black/40 hover:bg-black/60 border border-white/5 rounded-xl text-[10px] uppercase tracking-wider text-gray-400 font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <Zap className="h-3 w-3 text-amber-400" /> {t.triggerTestAlert}
                  </button>
                  <div className="absolute left-0 right-0 bottom-full mb-1.5 max-h-48 overflow-y-auto bg-[#121024] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 custom-scrollbar">
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => simulateNotification(cat.id)}
                          className="w-full text-left px-3 py-2 text-[10px] text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                        >
                          <Icon className={`h-3.5 w-3.5 ${cat.color}`} />
                          <span>{translateCategoryLabel(cat.label, language)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* DETAIL DRAWER OVERLAY VIEW */}
      <AnimatePresence>
        {selectedNotification && (() => {
          const details = getNotificationDetails(selectedNotification, farms, language);
          const catInfo = getCategoryDetails(selectedNotification.category);
          const CatIcon = catInfo.icon;

          return (
            <div className="fixed inset-0 z-50 flex justify-end">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedNotification(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm shadow-inner"
              />

              {/* Drawer Box */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-lg bg-[#121024] border-l border-white/10 h-full shadow-2xl flex flex-col justify-between text-white z-10"
              >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-black/30 border border-white/5 ${catInfo.color}`}>
                      <CatIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">{translateCategoryLabel(catInfo.label, language)}</span>
                      <h3 className="text-lg font-black text-white leading-snug">{t.detailsTitle}</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedNotification(null)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm">
                  {/* Alert Main Status */}
                  <div className="bg-black/30 p-5 rounded-3xl border border-white/5 space-y-3">
                    <h2 className="text-xl font-black text-white leading-snug">{renderText(selectedNotification.title)}</h2>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                      <div>
                        <span className="text-gray-400 block mb-0.5">{t.crop}</span>
                        <span className="font-extrabold text-white flex items-center gap-1.5">
                          <Sprout className="h-4 w-4 text-emerald-400" /> {details.crop}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">{t.farm}</span>
                        <span className="font-extrabold text-white flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-blue-400" /> {details.farm}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">{t.priority}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border inline-block ${getPriorityColor(selectedNotification.priority)}`}>
                          {translatePriority(selectedNotification.priority, language)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">{language === 'hi' ? 'पहचाना गया समय' : 'Detected Time'}</span>
                        <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-gray-500" />
                          {new Date(selectedNotification.timestamp).toLocaleDateString()} {new Date(selectedNotification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Analysis description */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-[#D946EF] flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" /> {t.aiAnalysis}
                    </h4>
                    <p className="text-gray-300 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">
                      {details.analysis}
                    </p>
                  </div>

                  {/* Causes & Potential Impact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-orange-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" /> {t.causes}
                      </h4>
                      <p className="text-gray-300 text-xs leading-relaxed bg-white/5 p-3.5 rounded-2xl border border-white/5 min-h-[90px]">
                        {details.causes}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-bold text-rose-400 flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4" /> {t.impact}
                      </h4>
                      <p className="text-gray-300 text-xs leading-relaxed bg-white/5 p-3.5 rounded-2xl border border-white/5 min-h-[90px]">
                        {details.impact}
                      </p>
                    </div>
                  </div>

                  {/* Action Strategy - Recommended Actions */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> {t.recommendedActions}
                    </h4>
                    <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 text-emerald-300 space-y-1">
                      <p className="font-bold leading-relaxed">{details.actions}</p>
                    </div>
                  </div>

                  {/* economic impact & prevention tips */}
                  <div className="grid grid-cols-1 gap-4">
                    {/* Economic Impact */}
                    <div className="space-y-1.5 bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">{t.economicImpact}</span>
                        <p className="text-base font-black text-rose-400">{details.economicImpact}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-rose-500/30 shrink-0" />
                    </div>

                    {/* Prevention Tips */}
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-blue-400 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4" /> {t.preventionTips}
                      </h4>
                      <p className="text-gray-300 text-xs leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">
                        {details.prevention}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-white/10 bg-black/20 flex gap-3">
                  <button
                    onClick={() => setSelectedNotification(null)}
                    className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-white font-bold rounded-xl transition-all cursor-pointer text-center text-sm"
                  >
                    {language === 'hi' ? 'बंद करें' : 'Close'}
                  </button>
                  {!selectedNotification.isRead && (
                    <button
                      onClick={() => {
                        handleToggleRead(selectedNotification.id);
                        setSelectedNotification(null);
                      }}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all cursor-pointer text-center text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15"
                    >
                      <CheckCircle className="h-4 w-4" /> {language === 'hi' ? 'हल करें और साफ़ करें' : 'Resolve & Clear'}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
