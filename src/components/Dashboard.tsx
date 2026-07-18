import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  Droplets, Thermometer, CloudRain, Activity, TrendingUp, Sparkles, AlertCircle,
  CheckCircle, RefreshCw, Sun, Cloud, CloudLightning, Wind, Bell, Clock,
  Calendar, Plus, MessageSquare, FileText, Microscope, Sprout, ShieldCheck,
  ServerCrash, Cpu, Navigation, ChevronRight, Check, MapPin, Layers, Zap,
  BarChart2, Shield, Heart, Leaf, Wifi, WifiOff, AlertTriangle, Info, Database,
  Settings, Eye, Camera, ArrowUpRight, ArrowRight, Bot, TriangleAlert, CircleCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Farm } from '../types';
import { fetch } from '../utils/api';
import { t as tr, localizeDiseaseName } from '../utils/i18n';
import { translatePlainNotificationString } from './NotificationCenter';

const parseNotifText = (text: string, lang: 'en' | 'hi') => {
  if (!text) return '';
  try {
    const obj = JSON.parse(text);
    return obj[lang] || obj['en'] || text;
  } catch (e) {
    return translatePlainNotificationString(text, lang);
  }
};

interface DashboardProps {
  user?: any;
  farms: Farm[];
  activeFarm: Farm | null;
  onSelectFarm: (farm: Farm) => void;
  onRefreshFarmData: () => void;
  onNavigate?: (tab: string) => void;
  language?: 'en' | 'hi';
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
};

const itemVariants: any = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 280, damping: 22 } }
};

// ─── Safe Value Helpers ──────────────────────────────────────────────────────
const safeNum = (v: any, fallback: number = 0): number =>
  (v !== null && v !== undefined && !isNaN(Number(v))) ? Number(v) : fallback;

const safeStr = (v: any, fallback = 'N/A'): string =>
  (v !== null && v !== undefined && String(v).trim() !== '' && String(v) !== 'undefined') ? String(v) : fallback;

// ─── Weather Code → Icon ──────────────────────────────────────────────────────
const WeatherIcon = ({ code, size = 'md' }: { code: number; size?: 'sm' | 'md' | 'lg' }) => {
  const cls = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8';
  if (code === 0) return <Sun className={`${cls} text-yellow-400`} />;
  if (code >= 1 && code <= 3) return <Cloud className={`${cls} text-gray-300`} />;
  if (code >= 51 && code <= 67) return <CloudRain className={`${cls} text-blue-400`} />;
  if (code >= 95) return <CloudLightning className={`${cls} text-purple-400`} />;
  return <Cloud className={`${cls} text-gray-400`} />;
};

const weatherLabel = (code: number, lang: 'en' | 'hi' = 'en'): string => {
  if (lang === 'hi') {
    if (code === 0) return 'साफ़ आसमान';
    if (code >= 1 && code <= 3) return 'आंशिक रूप से बादल';
    if (code >= 51 && code <= 67) return 'बारिश';
    if (code >= 95) return 'आंधी-तूफान';
    return 'घने बादल';
  }
  if (code === 0) return 'Clear Sky';
  if (code >= 1 && code <= 3) return 'Partly Cloudy';
  if (code >= 51 && code <= 67) return 'Rainy';
  if (code >= 95) return 'Thunderstorm';
  return 'Overcast';
};

// ─── Greeting based on hour ───────────────────────────────────────────────────
const getGreeting = (h: number, lang: 'en' | 'hi' = 'en'): string => {
  if (lang === 'hi') {
    if (h < 5) return 'शुभ रात्रि';
    if (h < 12) return 'शुभ प्रभात';
    if (h < 17) return 'शुभ दोपहर';
    if (h < 21) return 'शुभ संध्या';
    return 'शुभ रात्रि';
  }
  if (h < 5) return 'Good Night';
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
};

// ─── Health Score from sensor data ───────────────────────────────────────────
const computeHealthScore = (farm: Farm | null): number => {
  if (!farm) return 0;
  const m = safeNum(farm.sensorData?.moisture, 55);
  const ph = safeNum(farm.sensorData?.pH, 7.0);
  if (m === 0 && ph === 7.0) return 95;
  let score = 100;
  if (m < 35) score -= (35 - m) * 1.5;
  if (m > 75) score -= (m - 75) * 1.5;
  if (ph < 6.0) score -= (6.0 - ph) * 20;
  if (ph > 7.5) score -= (ph - 7.5) * 20;
  return Math.max(40, Math.min(100, Math.round(score)));
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusPill = ({ status, lang = 'en' }: { status: 'online' | 'warning' | 'offline' | 'critical'; lang?: 'en' | 'hi' }) => {
  const map: Record<string, string> = {
    online: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    offline: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    critical: 'bg-red-600/30 text-red-400 border-red-600/40',
  };
  const labelMap: Record<string, string> = lang === 'hi' ? {
    online: 'ऑनलाइन',
    warning: 'चेतावनी',
    offline: 'ऑफ़लाइन',
    critical: 'गंभीर',
  } : {
    online: 'online',
    warning: 'warning',
    offline: 'offline',
    critical: 'critical',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${map[status]}`}>
      {labelMap[status] || status}
    </span>
  );
};

// ─── Mini Progress Bar ────────────────────────────────────────────────────────
const ProgressBar = ({ value, max = 100, color = 'from-[#9333EA] to-[#D946EF]' }: { value: number; max?: number; color?: string }) => (
  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
    <div
      className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
      style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
    />
  </div>
);

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ user, farms, activeFarm, onSelectFarm, onRefreshFarmData, onNavigate, language = 'en' }: DashboardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [weather, setWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherError, setWeatherError] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Real data from backend
  const [notifications, setNotifications] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [sensorsList, setSensorsList] = useState<any[]>([]);
  const [soilHistory, setSoilHistory] = useState<any[]>([]);
  const [diseaseHistory, setDiseaseHistory] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const currentFarm = activeFarm || farms[0] || null;

  // ── Clock ticker ────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Data fetch on user login ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    setDataLoading(true);
    Promise.all([
      fetch(`/api/notifications?userId=${user.id}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/yield-predictions?userId=${user.id}`).then(r => r.json()).catch(() => ({})),
      fetch('/api/soil-analysis').then(r => r.json()).catch(() => ({})),
      fetch('/api/disease-history').then(r => r.json()).catch(() => ({})),
      fetch('/api/fields').then(r => r.json()).catch(() => ({})),
    ]).then(([nData, yData, sData, dData, fData]) => {
      if (nData.success) setNotifications(nData.notifications || []);
      if (yData.success) setPredictions(yData.history || []);
      if (sData.success) setSoilHistory(sData.history || []);
      if (dData.success) setDiseaseHistory(dData.history || []);
      if (fData.success) setFields(fData.fields || []);
    }).catch(console.error)
      .finally(() => setDataLoading(false));
  }, [user?.id]);

  // ── Sensors fetch when farm changes ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || !currentFarm?.id) { setSensorsList([]); return; }
    fetch(`/api/sensors?farmId=${currentFarm.id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setSensorsList(d.sensors || []); })
      .catch(console.error);
  }, [user?.id, currentFarm?.id]);

  // ── Weather ──────────────────────────────────────────────────────────────────
  const fetchWeather = async () => {
    setWeatherLoading(true);
    try {
      let lat = 28.6139, lon = 77.2090;
      if (currentFarm?.location?.toLowerCase().includes('punjab')) { lat = 31.1471; lon = 75.3412; }
      else if (currentFarm?.location?.toLowerCase().includes('california')) { lat = 36.7783; lon = -119.4179; }
      const res = await fetch(`/api/weather?latitude=${lat}&longitude=${lon}`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const d = await res.json();
      setWeather(d.current);
      setForecast(d);
      setWeatherError(false);
    } catch {
      setWeatherError(true);
      setWeather(null);
      setForecast(null);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const iv = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [currentFarm?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    onRefreshFarmData();
    setTimeout(() => setRefreshing(false), 800);
  };

  // ── Derived values ───────────────────────────────────────────────────────────
  const sensorData = currentFarm?.sensorData || { moisture: 0, pH: 7.0, temperature: 0, humidity: 0, predictedYield: 0, waterRecommendation: 'Wait 24 hours' };

  const healthScore = useMemo(() => computeHealthScore(currentFarm), [currentFarm]);

  const latestPrediction = predictions[0];
  const latestSoil = soilHistory[0];
  const latestDisease = diseaseHistory[0];

  const predictedYield = useMemo(() => {
    const v = safeNum(latestPrediction?.expectedYield ?? latestPrediction?.predictedYield, -1);
    if (v < 0) return language === 'hi' ? 'कोई भविष्यवाणी नहीं' : 'No prediction yet';
    return language === 'hi' ? `${v} टन` : `${v} tons`;
  }, [latestPrediction, language]);

  const unreadAlerts = notifications.filter(n => !n.isRead).length;
  const criticalAlerts = notifications.filter(n => n.severity === 'critical').length;
  const warningAlerts = notifications.filter(n => n.severity === 'warning').length;
  const infoAlerts = notifications.filter(n => n.severity === 'info').length;

  const hasSoil = soilHistory.length > 0;
  const hasLeaf = diseaseHistory.length > 0;
  const hasYield = predictions.length > 0;
  const hasNotifications = notifications.length > 0;
  const aiConfidenceValue = hasSoil || hasLeaf || hasYield ? '92%' : 'Not Available';
  const riskLevelValue = hasSoil || hasLeaf || hasYield ? (criticalAlerts > 0 ? 'High' : warningAlerts > 0 ? 'Med' : 'Low') : 'Not Available';

  const totalArea = farms.reduce((s, f) => s + safeNum(f.area), 0);
  const totalFields = fields.length;
  const onlineSensors = sensorsList.filter(s => s.status === 'online').length;

  // AI Summary bullets based on real data
  const aiSummaryLines = useMemo(() => {
    const lines: string[] = [];
    if (language === 'hi') {
      if (healthScore >= 80) lines.push('पंजीकृत खेतों में फसल का स्वास्थ्य उत्कृष्ट है।');
      else if (healthScore >= 60) lines.push('फसल का स्वास्थ्य सामान्य है — मिट्टी की नमी के स्तर की समीक्षा करें।');
      else lines.push('⚠ फसल के स्वास्थ्य पर तत्काल ध्यान देने की आवश्यकता है।');

      if (latestSoil) lines.push(`नवीनतम मिट्टी पीएच: ${safeNum(latestSoil.pH, 7).toFixed(1)} — ${safeNum(latestSoil.pH, 7) >= 6 && safeNum(latestSoil.pH, 7) <= 7.5 ? 'इष्टतम सीमा के भीतर' : 'समायोजन आवश्यक है'}।`);
      else lines.push('अभी तक कोई मिट्टी विश्लेषण दर्ज नहीं किया गया है। सिफ़ारिशों के लिए परीक्षण चलाएं।');

      if (latestDisease) lines.push(`अंतिम पत्ती स्कैन: "${safeStr(localizeDiseaseName(latestDisease.diseaseName, 'hi'), 'अज्ञात')}" (${latestDisease.severity === 'high' ? 'उच्च' : latestDisease.severity === 'medium' ? 'सामान्य' : 'कम'} गंभीरता)।`);
      else lines.push('हाल के पत्ती स्कैन में कोई बीमारी नहीं पाई गई।');
    } else {
      if (healthScore >= 80) lines.push('Crop health is excellent across registered fields.');
      else if (healthScore >= 60) lines.push('Crop health is moderate — review soil moisture levels.');
      else lines.push('⚠ Crop health needs immediate attention.');

      if (latestSoil) lines.push(`Latest soil pH: ${safeNum(latestSoil.pH, 7).toFixed(1)} — ${safeNum(latestSoil.pH, 7) >= 6 && safeNum(latestSoil.pH, 7) <= 7.5 ? 'within optimal range' : 'adjust required'}.`);
      else lines.push('No soil analysis recorded yet. Run a test for recommendations.');

      if (latestDisease) lines.push(`Last leaf scan: "${safeStr(localizeDiseaseName(latestDisease.diseaseName, 'en'), 'Unknown')}" (${safeStr(latestDisease.severity, 'N/A')} severity).`);
      else lines.push('No disease detected in recent leaf scans.');
    }

    if (weather) {
      lines.push(language === 'hi'
        ? `वर्तमान मौसम: ${weatherLabel(weather.weather_code ?? 0, language)}, ${safeNum(weather.temperature_2m, 25)}°C।`
        : `Current weather: ${weatherLabel(weather.weather_code ?? 0)}, ${safeNum(weather.temperature_2m, 25)}°C.`);
    }
    if (sensorData.waterRecommendation) {
      const recText = sensorData.waterRecommendation;
      let displayRec: string = recText;
      if (language === 'hi') {
        if (recText === 'Wait 24 hours') displayRec = '24 घंटे प्रतीक्षा करें';
        else if (recText === 'Wait 12 hours') displayRec = '12 घंटे प्रतीक्षा करें';
        else if (recText === 'Irrigate now') displayRec = 'अभी सिंचाई करें';
        lines.push(`सिंचाई सलाह: ${displayRec}।`);
      } else {
        lines.push(`Irrigation advisory: ${recText}.`);
      }
    }
    return lines.slice(0, 5);
  }, [healthScore, latestSoil, latestDisease, weather, sensorData, language]);

  // ── Chart data ───────────────────────────────────────────────────────────────
  const yieldTrendData = useMemo(() => {
    if (predictions.length > 0) {
      return predictions.slice(0, 7).reverse().map(p => ({
        month: new Date(p.createdAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { month: 'short', day: 'numeric' }),
        yield: safeNum(p.expectedYield ?? p.predictedYield, 0)
      })).filter(d => d.yield > 0);
    }
    // Sensor-based fallback (no fabrication — just show "no data")
    return [];
  }, [predictions, language]);

  const weatherChartData = useMemo(() => {
    if (forecast?.hourly?.time) {
      return forecast.hourly.time.slice(0, 10).map((t: string, i: number) => ({
        time: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temp: safeNum(forecast.hourly.temperature_2m?.[i], 25),
        humidity: safeNum(forecast.hourly.relative_humidity_2m?.[i], 60)
      }));
    }
    if (currentFarm?.sensorHistory?.length) {
      return currentFarm.sensorHistory.slice(0, 10).map((h: any) => ({
        time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temp: safeNum(h.temperature, 25),
        humidity: safeNum(h.humidity, 60)
      }));
    }
    return [];
  }, [forecast, currentFarm]);

  const soilTrendData = useMemo(() => {
    if (soilHistory.length > 0) {
      return soilHistory.slice(0, 6).reverse().map(s => ({
        date: new Date(s.createdAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { month: 'short', day: 'numeric' }),
        pH: safeNum(s.pH, 7),
        moisture: safeNum(s.moisture, 50),
        nitrogen: safeNum(s.nitrogen, 20),
      }));
    }
    return [];
  }, [soilHistory, language]);

  // System health
  const systemItems = [
    { label: 'API Gateway', status: 'online' as const, icon: Wifi },
    { label: 'MongoDB Atlas', status: 'online' as const, icon: Database },
    { label: 'Gemini AI', status: 'online' as const, icon: Bot },
    { label: 'IoT Sensors', status: sensorsList.length > 0 ? 'online' as const : 'warning' as const, icon: Cpu },
    { label: 'Weather Feed', status: weatherError ? 'offline' as const : 'online' as const, icon: Cloud },
  ];

  // ─── Empty state ──────────────────────────────────────────────────────────────
  if (farms.length === 0 || !currentFarm) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-[#9333EA]/20 to-[#C026D3]/20 rounded-full flex items-center justify-center mb-6 border border-[#9333EA]/30">
          <Sprout className="h-12 w-12 text-[#D946EF]" />
        </div>
        <h3 className="text-2xl font-black text-white mb-2">{language === 'hi' ? 'कमांड सेंटर ऑफ़लाइन' : 'Command Center Offline'}</h3>
        <p className="text-sm text-[#A78BFA] mb-8 max-w-sm leading-relaxed">
          {language === 'hi'
            ? 'आपका डिजिटल ट्विन डैशबोर्ड डेटा की प्रतीक्षा कर रहा है। लाइव एनालिटिक्स सक्रिय करने के लिए अपना पहला फ़ार्म जोड़ें।'
            : 'Your Digital Twin Dashboard is waiting for data. Add your first farm to activate live analytics.'}
        </p>
        <button onClick={() => onNavigate?.('data-entry')}
          className="px-8 py-3 bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95">
          <Plus className="h-5 w-5" /> {language === 'hi' ? 'अपना पहला फार्म जोड़ें' : 'Add Your First Farm'}
        </button>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────────
  return (
    <motion.div className="space-y-6 pb-24 max-w-7xl mx-auto" variants={containerVariants} initial="hidden" animate="visible">

      {/* ── SECTION 1: Welcome Banner ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants}
        className="relative bg-gradient-to-r from-[#1A0D2E] via-[#130722] to-[#1A0D2E] rounded-3xl border border-white/10 overflow-hidden shadow-2xl p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-[#9333EA]/15 blur-[100px] pointer-events-none rounded-full -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#D946EF]/10 blur-[80px] pointer-events-none rounded-full translate-y-1/2" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-6">
          {/* Left: Greeting */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#9333EA] uppercase tracking-widest">
              <span className="w-2 h-2 bg-[#9333EA] rounded-full animate-pulse" />
              {language === 'hi' ? 'डिजिटल ट्विन कमांड सेंटर' : 'Digital Twin Command Center'}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {getGreeting(currentTime.getHours(), language)}, {user?.name?.split(' ')[0] || (language === 'hi' ? 'किसान' : 'Farmer')} 👋
            </h1>
            <div className="flex flex-wrap gap-3 text-xs text-[#A78BFA] font-medium">
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg">
                <Calendar className="h-3.5 w-3.5 text-[#D946EF]" />
                {currentTime.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg font-mono">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              {currentFarm && (
                <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg">
                  <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                  {safeStr(currentFarm.location, language === 'hi' ? 'अज्ञात स्थान' : 'Unknown Location')}
                </span>
              )}
            </div>
          </div>

          {/* Right: Weather + Alerts */}
          <div className="flex items-start gap-3 flex-wrap lg:flex-nowrap">
            {/* Weather mini-card */}
            <div className="bg-black/30 border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-4 min-w-[180px]">
              {weatherLoading && !weather ? (
                <div className="animate-pulse flex gap-3 items-center">
                  <div className="h-8 w-8 bg-white/10 rounded-full" />
                  <div className="h-8 w-20 bg-white/10 rounded" />
                </div>
              ) : weather ? (
                <>
                  <WeatherIcon code={weather.weather_code ?? 0} size="md" />
                  <div>
                    <div className="text-2xl font-black text-white leading-none">{safeNum(weather.temperature_2m, 25)}°C</div>
                    <div className="text-xs text-[#A78BFA] mt-0.5">{weatherLabel(weather.weather_code ?? 0, language)}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 flex gap-2">
                      <span>💧 {safeNum(weather.relative_humidity_2m, 0)}%</span>
                      <span>💨 {safeNum(weather.wind_speed_10m, 0)} {language === 'hi' ? 'किमी/घंटा' : 'km/h'}</span>
                    </div>
                  </div>
                  {weatherError && (
                    <button onClick={fetchWeather} title="Retry weather" className="ml-1 text-amber-400 hover:text-amber-300 cursor-pointer">
                      <AlertCircle className="h-4 w-4 animate-pulse" />
                    </button>
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-400 flex gap-2 items-center">
                  <CloudLightning className="h-5 w-5 text-gray-500" /> {language === 'hi' ? 'मौसम अनुपलब्ध' : 'Weather unavailable'}
                </div>
              )}
            </div>

            {/* Unread alerts badge */}
            <button onClick={() => onNavigate?.('notifications')}
              className="bg-black/30 border border-white/10 rounded-2xl px-5 py-4 flex flex-col items-center gap-1 hover:bg-white/5 transition-colors cursor-pointer min-w-[90px]">
              <Bell className="h-5 w-5 text-[#D946EF]" />
              <span className="text-xl font-black text-white">{unreadAlerts}</span>
              <span className="text-[10px] text-[#A78BFA] uppercase font-bold">{language === 'hi' ? 'अपठित' : 'Unread'}</span>
            </button>

            {/* Farm health mini */}
            <div className="bg-black/30 border border-white/10 rounded-2xl px-5 py-4 flex flex-col items-center gap-1 min-w-[90px]">
              <Heart className="h-5 w-5 text-emerald-400" />
              <span className="text-xl font-black text-emerald-400">{healthScore}%</span>
              <span className="text-[10px] text-gray-400 uppercase font-bold">{language === 'hi' ? 'स्वास्थ्य' : 'Health'}</span>
            </div>
          </div>
        </div>

        {/* AI Summary Strip */}
        <div className="relative z-10 mt-5 bg-black/20 border border-[#9333EA]/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-[#D946EF] animate-pulse" />
            <span className="text-xs font-black text-white uppercase tracking-wider">{language === 'hi' ? 'आज का एआई सारांश' : "Today's AI Summary"}</span>
          </div>
          <ul className="space-y-1">
            {aiSummaryLines.map((line, i) => (
              <li key={i} className="text-xs text-[#E9D5FF] flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" /> {line}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* ── SECTION 2: Farm Selector ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-lg relative z-20">
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-[#A78BFA] whitespace-nowrap">{language === 'hi' ? 'सक्रिय डिजिटल ट्विन:' : 'Active Twin:'}</label>
          <div className="relative">
            <select
              className="appearance-none bg-black/20 border border-white/10 text-white text-sm font-medium rounded-xl focus:ring-2 focus:ring-[#9333EA] block p-2.5 pr-10 outline-none transition-all cursor-pointer min-w-[220px]"
              value={currentFarm.id}
              onChange={e => { const f = farms.find(f => f.id === e.target.value); if (f) onSelectFarm(f); }}
            >
              {farms.map(f => (
                <option key={f.id} value={f.id} className="bg-[#1E1B4B]">{f.name} ({safeStr(f.cropType)})</option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none rotate-90" />
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-2.5 rounded-xl transition-all text-sm font-medium disabled:opacity-50 active:scale-95">
            <RefreshCw className={`h-4 w-4 text-[#D946EF] ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? (language === 'hi' ? 'सिंक हो रहा है...' : 'Syncing...') : (language === 'hi' ? 'आईओटी सिंक करें' : 'Sync IoT')}
          </button>
          <button onClick={() => onNavigate?.('iot')}
            className="flex items-center gap-2 bg-[#9333EA]/10 hover:bg-[#9333EA]/20 border border-[#9333EA]/20 text-[#D946EF] px-5 py-2.5 rounded-xl transition-all text-sm font-medium active:scale-95">
            <Wifi className="h-4 w-4" /> {language === 'hi' ? 'आईओटी डैशबोर्ड' : 'IoT Dashboard'}
          </button>
        </div>
      </motion.div>

      {/* ── SECTION 3: Digital Twin Overview Grid ────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: tr(language, 'registeredFarms'), value: farms.length, icon: Navigation, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-500/20' },
          { label: tr(language, 'totalFields'), value: totalFields || 'N/A', icon: Layers, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-500/20' },
          { label: tr(language, 'area'), value: totalArea > 0 ? `${totalArea.toFixed(0)}ac` : 'N/A', icon: MapPin, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-500/20' },
          { 
            label: tr(language, 'farmHealth'), 
            value: hasSoil && hasLeaf ? `${healthScore}%` : tr(language, 'na'), 
            icon: Heart, 
            color: hasSoil && hasLeaf ? 'text-emerald-400' : 'text-gray-400', 
            bg: hasSoil && hasLeaf ? 'bg-emerald-400/10' : 'bg-neutral-800/40', 
            border: hasSoil && hasLeaf ? 'border-emerald-500/20' : 'border-white/5' 
          },
          { 
            label: tr(language, 'totalAlerts'), 
            value: hasNotifications ? unreadAlerts : tr(language, 'na'), 
            icon: Bell, 
            color: hasNotifications && unreadAlerts > 0 ? 'text-amber-400' : 'text-gray-400', 
            bg: hasNotifications && unreadAlerts > 0 ? 'bg-amber-400/10' : 'bg-neutral-800/40', 
            border: hasNotifications && unreadAlerts > 0 ? 'border-amber-500/20' : 'border-white/5' 
          },
          { label: tr(language, 'activeSensors'), value: sensorsList.length > 0 ? `${onlineSensors}/${sensorsList.length}` : 'N/A', icon: Cpu, color: 'text-[#9333EA]', bg: 'bg-[#9333EA]/10', border: 'border-[#9333EA]/20' },
          { 
            label: tr(language, 'aiConfidence'), 
            value: aiConfidenceValue === 'Not Available' ? tr(language, 'na') : aiConfidenceValue, 
            icon: Sparkles, 
            color: aiConfidenceValue !== 'Not Available' ? 'text-[#D946EF]' : 'text-gray-400', 
            bg: aiConfidenceValue !== 'Not Available' ? 'bg-[#D946EF]/10' : 'bg-neutral-800/40', 
            border: aiConfidenceValue !== 'Not Available' ? 'border-[#D946EF]/20' : 'border-white/5' 
          },
          { 
            label: tr(language, 'threatLevel'), 
            value: riskLevelValue === 'Not Available' ? tr(language, 'na') : (riskLevelValue === 'High' ? tr(language, 'high') : riskLevelValue === 'Med' ? tr(language, 'medium') : tr(language, 'low')), 
            icon: Shield, 
            color: riskLevelValue === 'High' ? 'text-red-400' : riskLevelValue === 'Med' ? 'text-amber-400' : riskLevelValue === 'Low' ? 'text-emerald-400' : 'text-gray-400', 
            bg: riskLevelValue === 'High' ? 'bg-red-400/10' : riskLevelValue === 'Med' ? 'bg-amber-400/10' : riskLevelValue === 'Low' ? 'bg-emerald-400/10' : 'bg-neutral-800/40', 
            border: riskLevelValue === 'High' ? 'border-red-500/20' : riskLevelValue === 'Med' ? 'border-amber-500/20' : riskLevelValue === 'Low' ? 'border-emerald-500/20' : 'border-white/5' 
          },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} border ${s.border} p-3.5 rounded-2xl flex flex-col items-center text-center gap-1.5 hover:-translate-y-1 transition-all duration-300 shadow`}>
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <div className={`${typeof s.value === 'string' && s.value.length > 8 ? 'text-[10px]' : 'text-base'} font-black ${s.color}`}>{s.value}</div>
            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-tight">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* ── SECTION 4: KPI Cards ──────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: tr(language, 'farmHealth'),
            value: hasSoil && hasLeaf ? `${healthScore}%` : tr(language, 'na'),
            sub: hasSoil && hasLeaf ? (healthScore >= 80 ? (language === 'hi' ? 'उत्कृष्ट' : 'Excellent') : healthScore >= 60 ? (language === 'hi' ? 'मध्यम' : 'Moderate') : (language === 'hi' ? 'ध्यान देने की आवश्यकता' : 'Needs Attention')) : (language === 'hi' ? 'मिट्टी और पत्ती विश्लेषण चलाएं' : 'Run Soil & Leaf Analysis'),
            icon: Heart,
            color: hasSoil && hasLeaf ? 'text-emerald-400' : 'text-gray-400',
            bg: hasSoil && hasLeaf ? 'from-emerald-900/30 to-emerald-950/20' : 'from-neutral-900/30 to-neutral-950/20',
            border: hasSoil && hasLeaf ? 'border-emerald-500/20' : 'border-white/5',
            progress: hasSoil && hasLeaf ? healthScore : 0,
            progressColor: 'from-emerald-500 to-emerald-400'
          },
          {
            label: tr(language, 'predictedYield'),
            value: hasYield ? (language === 'hi' ? `${predictedYield.replace('tons', 'टन')}` : predictedYield) : tr(language, 'na'),
            sub: hasYield && latestPrediction ? `${language === 'hi' ? 'फसल' : 'Crop'}: ${latestPrediction.cropType}` : (language === 'hi' ? 'उपज भविष्यवाणी उत्पन्न करें' : 'Generate Yield Prediction'),
            icon: TrendingUp,
            color: hasYield ? 'text-[#D946EF]' : 'text-gray-400',
            bg: hasYield ? 'from-purple-900/30 to-purple-950/20' : 'from-neutral-900/30 to-neutral-950/20',
            border: hasYield ? 'border-purple-500/20' : 'border-white/5',
            progress: hasYield && latestPrediction ? Math.min(safeNum(latestPrediction.expectedYield ?? latestPrediction.predictedYield, 0) / 500 * 100, 100) : 0,
            progressColor: 'from-[#9333EA] to-[#D946EF]'
          },
          {
            label: tr(language, 'soilQuality'),
            value: hasSoil && latestSoil ? `pH ${safeNum(latestSoil.pH, 7).toFixed(1)}` : tr(language, 'na'),
            sub: hasSoil && latestSoil ? `${language === 'hi' ? 'नमी' : 'Moisture'}: ${safeNum(latestSoil.moisture, 0)}%` : (language === 'hi' ? 'मिट्टी विश्लेषण चलाएं' : 'Run Soil Analysis'),
            icon: Microscope,
            color: hasSoil ? 'text-amber-400' : 'text-gray-400',
            bg: hasSoil ? 'from-amber-900/30 to-amber-950/20' : 'from-neutral-900/30 to-neutral-950/20',
            border: hasSoil ? 'border-amber-500/20' : 'border-white/5',
            progress: hasSoil && latestSoil ? Math.min((safeNum(latestSoil.pH, 7) / 14) * 100, 100) : 0,
            progressColor: 'from-amber-500 to-yellow-400'
          },
          {
            label: tr(language, 'diseaseRisk'),
            value: hasLeaf && latestDisease ? (latestDisease.severity === 'high' ? tr(language, 'high') : latestDisease.severity === 'medium' ? tr(language, 'medium') : tr(language, 'low')) : tr(language, 'na'),
            sub: hasLeaf && latestDisease ? localizeDiseaseName(latestDisease.diseaseName, language) : (language === 'hi' ? 'पत्ती निदान चलाएं' : 'Run Leaf Diagnostics'),
            icon: ShieldCheck,
            color: hasLeaf && latestDisease?.severity === 'high' ? 'text-red-400' : hasLeaf && latestDisease?.severity === 'medium' ? 'text-amber-400' : hasLeaf ? 'text-emerald-400' : 'text-gray-400',
            bg: hasLeaf && latestDisease?.severity === 'high' ? 'from-red-900/30 to-red-950/20' : hasLeaf ? 'from-green-900/20 to-green-950/10' : 'from-neutral-900/30 to-neutral-950/20',
            border: hasLeaf && latestDisease?.severity === 'high' ? 'border-red-500/20' : hasLeaf ? 'border-emerald-500/20' : 'border-white/5',
            progress: hasLeaf && latestDisease ? (latestDisease.severity?.toLowerCase() === 'high' ? 80 : latestDisease.severity?.toLowerCase() === 'medium' ? 45 : 15) : 0,
            progressColor: hasLeaf && latestDisease?.severity === 'high' ? 'from-red-500 to-rose-400' : 'from-emerald-500 to-emerald-400'
          },
        ].map((k, i) => (
          <div key={i} className={`bg-gradient-to-br ${k.bg} border ${k.border} p-5 rounded-2xl shadow-lg hover:-translate-y-1 transition-all duration-300 space-y-3`}>
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-xl bg-black/30 ${k.color}`}><k.icon className="h-5 w-5" /></div>
            </div>
            <div className={`text-2xl font-black ${k.color}`}>{k.value}</div>
            <div className="text-xs font-bold text-white">{k.label}</div>
            <div className="text-[10px] text-gray-400">{k.sub}</div>
            <ProgressBar value={k.progress} color={k.progressColor} />
          </div>
        ))}
      </motion.div>

      {/* ── SECTION 5: Module Summary Cards ─────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            label: tr(language, 'soil'),
            summary: latestSoil ? `pH ${safeNum(latestSoil.pH, 7).toFixed(1)} · ${safeNum(latestSoil.moisture, 0)}% ${language === 'hi' ? 'नमी' : 'moisture'}` : (language === 'hi' ? 'कोई विश्लेषण नहीं' : 'No analysis yet'),
            badge: soilHistory.length > 0 ? `${soilHistory.length} ${language === 'hi' ? 'परीक्षण' : 'tests'}` : (language === 'hi' ? 'पहला परीक्षण चलाएं' : 'Run first test'),
            icon: Microscope,
            color: 'text-amber-400',
            tab: 'soil'
          },
          {
            label: tr(language, 'disease'),
            summary: latestDisease ? `${localizeDiseaseName(latestDisease.diseaseName, language)} — ${latestDisease.severity === 'high' ? tr(language, 'high') : latestDisease.severity === 'medium' ? tr(language, 'medium') : tr(language, 'low')} ${language === 'hi' ? 'जोखिम' : 'risk'}` : (language === 'hi' ? 'कोई स्कैन नहीं' : 'No scan yet'),
            badge: diseaseHistory.length > 0 ? `${diseaseHistory.length} ${language === 'hi' ? 'स्कैन' : 'scans'}` : (language === 'hi' ? 'पहला स्कैन चलाएं' : 'Run first scan'),
            icon: Leaf,
            color: 'text-green-400',
            tab: 'disease'
          },
          {
            label: tr(language, 'yield'),
            summary: latestPrediction ? `${safeNum(latestPrediction.expectedYield ?? latestPrediction.predictedYield, 0)} ${language === 'hi' ? 'टन अनुमानित' : 'tons projected'}` : (language === 'hi' ? 'कोई भविष्यवाणी नहीं' : 'No prediction yet'),
            badge: predictions.length > 0 ? `${predictions.length} ${language === 'hi' ? 'दौरे' : 'runs'}` : (language === 'hi' ? 'पहली भविष्यवाणी' : 'Run first prediction'),
            icon: TrendingUp,
            color: 'text-[#D946EF]',
            tab: 'yield'
          },
          {
            label: tr(language, 'notifications'),
            summary: unreadAlerts > 0 ? `${unreadAlerts} ${language === 'hi' ? 'अपठित अलर्ट' : 'unread alerts'}` : (language === 'hi' ? 'सब ठीक है' : 'All caught up'),
            badge: criticalAlerts > 0 ? `${criticalAlerts} ${tr(language, 'critical')}` : `${notifications.length} ${language === 'hi' ? 'कुल' : 'total'}`,
            icon: Bell,
            color: unreadAlerts > 0 ? 'text-amber-400' : 'text-gray-400',
            tab: 'notifications'
          },
          {
            label: tr(language, 'chat'),
            summary: language === 'hi' ? 'खेती के प्रश्न पूछें, स्मार्ट फसल सलाह प्राप्त करें।' : 'Ask farming questions, get smart crop advice.',
            badge: language === 'hi' ? 'हमेशा सक्रिय' : 'Always on',
            icon: Bot,
            color: 'text-purple-400',
            tab: 'chat'
          },
        ].map((card, i) => (
          <button key={i} onClick={() => onNavigate?.(card.tab)}
            className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-2xl text-left flex flex-col gap-3 group transition-all hover:-translate-y-1 duration-300 shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9333EA]">
            <div className="flex items-center justify-between">
              <card.icon className={`h-5 w-5 ${card.color}`} />
              <ArrowRight className="h-3.5 w-3.5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
            <div className="text-xs font-black text-white">{card.label}</div>
            <div className="text-[10px] text-gray-400 leading-relaxed flex-1">{card.summary}</div>
            <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-black/30 ${card.color}`}>
              {card.badge}
            </span>
          </button>
        ))}
      </motion.div>

      {/* ── SECTION 6: Quick Actions ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-[#9333EA]" /> {tr(language, 'quickActions')}
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: tr(language, 'addFarm'), icon: Plus, tab: 'farms', color: 'text-blue-400', bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20' },
            { label: tr(language, 'analyzeSoil'), icon: Microscope, tab: 'soil', color: 'text-amber-400', bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20' },
            { label: tr(language, 'uploadImage'), icon: Leaf, tab: 'disease', color: 'text-green-400', bg: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20' },
            { label: tr(language, 'predict'), icon: TrendingUp, tab: 'yield', color: 'text-[#D946EF]', bg: 'bg-[#D946EF]/10 hover:bg-[#D946EF]/20 border-[#D946EF]/20' },
            { label: tr(language, 'generateReport'), icon: FileText, tab: 'reports', color: 'text-purple-400', bg: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20' },
            { label: tr(language, 'notifications'), icon: Bell, tab: 'notifications', color: 'text-rose-400', bg: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20' },
            { label: tr(language, 'chat'), icon: MessageSquare, tab: 'chat', color: 'text-cyan-400', bg: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20' },
          ].map((a, i) => (
            <button key={i} onClick={() => onNavigate?.(a.tab)}
              className={`border ${a.bg} ${a.color} p-4 rounded-2xl flex flex-col items-center gap-2 transition-all hover:-translate-y-1 active:scale-95 cursor-pointer focus:outline-none`}>
              <a.icon className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wide">{a.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── SECTION 7: Main Content Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Charts */}
        <div className="lg:col-span-2 space-y-6">

          {/* Yield Trend Chart */}
          <motion.div variants={itemVariants} className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#D946EF]" /> {language === 'hi' ? 'उपज का रुख' : 'Yield Trend'}
              </h3>
              <button onClick={() => onNavigate?.('yield')} className="text-[10px] text-[#A78BFA] hover:text-white flex items-center gap-1 cursor-pointer">
                {language === 'hi' ? 'सभी देखें' : 'View All'} <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            {yieldTrendData.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={yieldTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D946EF" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#D946EF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15,10,30,0.95)', borderColor: 'rgba(147,51,234,0.3)', borderRadius: '12px' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="yield" name={language === 'hi' ? 'उपज (टन)' : 'Yield (tons)'} stroke="#D946EF" strokeWidth={3} fillOpacity={1} fill="url(#yieldGrad)" activeDot={{ r: 5, fill: '#D946EF', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl">
                <TrendingUp className="h-8 w-8 text-gray-600 mb-2" />
                <p className="text-xs text-gray-400">{language === 'hi' ? 'अभी तक कोई उपज भविष्यवाणी नहीं' : 'No yield predictions yet'}</p>
                <button onClick={() => onNavigate?.('yield')} className="mt-3 text-xs text-purple-400 hover:text-white font-bold cursor-pointer">{language === 'hi' ? 'उपज विश्लेषण चलाएं →' : 'Run Yield Analysis →'}</button>
              </div>
            )}
          </motion.div>

          {/* 24H Microclimate Chart */}
          <motion.div variants={itemVariants} className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-xl">
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-6">
              <Thermometer className="h-4 w-4 text-[#9333EA]" /> {language === 'hi' ? '24 घंटे का सूक्ष्म जलवायु' : '24H Microclimate'}
            </h3>
            {weatherChartData.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weatherChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="l" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="r" orientation="right" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15,10,30,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                    <Line yAxisId="l" type="monotone" dataKey="temp" name={language === 'hi' ? 'तापमान (°C)' : 'Temp (°C)'} stroke="#F87171" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    <Line yAxisId="r" type="monotone" dataKey="humidity" name={language === 'hi' ? 'नमी (%)' : 'Humidity (%)'} stroke="#60A5FA" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl">
                <CloudRain className="h-8 w-8 text-gray-600 mb-2" />
                <p className="text-xs text-gray-400">{language === 'hi' ? 'मौसम डेटा लोड हो रहा है…' : 'Weather data loading…'}</p>
              </div>
            )}
          </motion.div>

          {/* Soil Trend Chart */}
          <motion.div variants={itemVariants} className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-amber-400" /> {language === 'hi' ? 'मिट्टी स्वास्थ्य रुख' : 'Soil Health Trend'}
              </h3>
              <button onClick={() => onNavigate?.('soil')} className="text-[10px] text-[#A78BFA] hover:text-white flex items-center gap-1 cursor-pointer">
                {language === 'hi' ? 'पूर्ण विश्लेषण' : 'Full Analysis'} <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            {soilTrendData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={soilTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15,10,30,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                    <Bar dataKey="pH" name="pH" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="moisture" name={language === 'hi' ? 'नमी %' : 'Moisture %'} fill="#9333EA" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl">
                <Microscope className="h-8 w-8 text-gray-600 mb-2" />
                <p className="text-xs text-gray-400">{language === 'hi' ? 'कोई मिट्टी विश्लेषण डेटा नहीं' : 'No soil analysis data yet'}</p>
                <button onClick={() => onNavigate?.('soil')} className="mt-3 text-xs text-amber-400 hover:text-white font-bold cursor-pointer">{language === 'hi' ? 'मिट्टी विश्लेषण चलाएं →' : 'Run Soil Analysis →'}</button>
              </div>
            )}
          </motion.div>

          {/* Live Sensor Metrics */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: tr(language, 'soilMoistureLabel'), value: hasSoil ? `${safeNum(sensorData.moisture, 0)}%` : tr(language, 'na'), icon: Droplets, color: hasSoil ? 'text-blue-400' : 'text-gray-400', glow: hasSoil ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.05)' },
              { label: tr(language, 'soilPHLabel'), value: hasSoil ? safeNum(sensorData.pH, 0).toFixed(1) : tr(language, 'na'), icon: Activity, color: hasSoil ? 'text-[#D946EF]' : 'text-gray-400', glow: hasSoil ? 'rgba(217,70,239,0.4)' : 'rgba(255,255,255,0.05)' },
              { label: tr(language, 'humidityLabel'), value: hasSoil ? `${safeNum(sensorData.humidity, 0)}%` : tr(language, 'na'), icon: CloudRain, color: hasSoil ? 'text-indigo-400' : 'text-gray-400', glow: hasSoil ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.05)' },
              { label: tr(language, 'soilTempLabel'), value: hasSoil ? `${safeNum(sensorData.temperature, 0)}°C` : tr(language, 'na'), icon: Thermometer, color: hasSoil ? 'text-yellow-400' : 'text-gray-400', glow: hasSoil ? 'rgba(250,204,21,0.4)' : 'rgba(255,255,255,0.05)' },
            ].map((m, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg hover:bg-white/10 transition-colors">
                <m.icon className={`h-7 w-7 ${m.color} mb-2`} style={{ filter: `drop-shadow(0 0 8px ${m.glow})` }} />
                <div className={`${typeof m.value === 'string' && m.value.length > 8 ? 'text-[10px]' : 'text-xl'} font-black ${m.color}`}>{m.value}</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{m.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Sidebar panels */}
        <div className="space-y-6">

          {/* AI Insights Panel */}
          <motion.div variants={itemVariants}
            className="bg-gradient-to-br from-[#4C1D95]/60 to-[#2E1065]/60 backdrop-blur-xl p-6 rounded-2xl border border-[#8B5CF6]/30 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#8B5CF6]/20 blur-[50px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2" />
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-5">
              <Sparkles className="h-4 w-4 text-[#D946EF]" /> {language === 'hi' ? 'एआई अंतर्दृष्टि' : 'AI Insights'}
            </h3>
            <div className="space-y-3 relative z-10">
              {notifications.filter(n => n.category === 'ai_recommendation').slice(0, 3).length > 0 ? (
                notifications.filter(n => n.category === 'ai_recommendation').slice(0, 3).map((n, i) => (
                  <div key={i} className="bg-black/20 border border-white/10 p-3 rounded-xl hover:bg-black/40 transition-colors">
                    <div className="flex gap-2 items-start">
                      <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-white mb-0.5">{parseNotifText(n.title, language)}</div>
                        <div className="text-[10px] text-[#E9D5FF] leading-relaxed">{parseNotifText(n.message, language)}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-2">
                  {aiSummaryLines.map((line, i) => (
                    <div key={i} className="bg-black/20 border border-white/10 p-3 rounded-xl text-[10px] text-[#E9D5FF] flex gap-2 items-start">
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" /> {line}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => onNavigate?.('chat')}
                className="w-full py-2.5 bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer mt-1">
                <MessageSquare className="h-4 w-4" /> {language === 'hi' ? 'एआई सहायक से पूछें' : 'Ask AI Assistant'}
              </button>
            </div>
          </motion.div>

          {/* Notification Summary */}
          <motion.div variants={itemVariants} className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#A78BFA]" /> {language === 'hi' ? 'अलर्ट' : 'Alerts'}
              </h3>
              <button onClick={() => onNavigate?.('notifications')} className="text-[10px] text-[#A78BFA] hover:text-white cursor-pointer">
                {language === 'hi' ? 'सभी देखें →' : 'View All →'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4 text-center text-xs">
              {[
                { label: tr(language, 'critical'), count: criticalAlerts, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                { label: language === 'hi' ? 'चेतावनी' : 'Warning', count: warningAlerts, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                { label: language === 'hi' ? 'जानकारी' : 'Info', count: infoAlerts, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                { label: language === 'hi' ? 'कुल' : 'Total', count: notifications.length, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
              ].map(a => (
                <div key={a.label} className={`${a.bg} border rounded-xl p-2`}>
                  <div className={`text-base font-black ${a.color}`}>{a.count}</div>
                  <div className="text-[9px] text-gray-400 font-bold uppercase">{a.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {notifications.slice(0, 3).map((n, i) => (
                <div key={i} className="bg-black/20 border border-white/5 p-2.5 rounded-xl flex items-start gap-2">
                  {n.severity === 'critical' ? <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" /> :
                    n.severity === 'warning' ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" /> :
                      <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />}
                  <div>
                    <div className="text-[10px] font-bold text-white leading-tight">{parseNotifText(n.title, language)}</div>
                    <div className="text-[9px] text-gray-400 mt-0.5 line-clamp-1">{parseNotifText(n.message, language)}</div>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="text-center py-3">
                  <CircleCheck className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
                  <p className="text-[10px] text-gray-400">{language === 'hi' ? 'सभी स्पष्ट — कोई अलर्ट नहीं' : 'All clear — no alerts'}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Sensor Network Health */}
          <motion.div variants={itemVariants} className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-xl">
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-5">
              <Cpu className="h-4 w-4 text-[#9333EA]" /> {language === 'hi' ? 'सेंसर नेटवर्क' : 'Sensor Network'}
            </h3>
            {sensorsList.length > 0 ? (
              <div className="space-y-4">
                {['moisture', 'temperature', 'ph'].map(type => {
                  const total = sensorsList.filter(s => s.type === type).length;
                  const online = sensorsList.filter(s => s.type === type && s.status === 'online').length;
                  if (total === 0) return null;
                  
                  let labelText = type;
                  if (type === 'moisture') labelText = language === 'hi' ? 'नमी सेंसर' : 'moisture sensors';
                  else if (type === 'temperature') labelText = language === 'hi' ? 'तापमान सेंसर' : 'temperature sensors';
                  else if (type === 'ph') labelText = language === 'hi' ? 'pH सेंसर' : 'pH sensors';

                  return (
                    <div key={type}>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span className="text-gray-200 capitalize">{labelText}</span>
                        <span className={online === total ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{online}/{total}</span>
                      </div>
                      <ProgressBar value={online} max={total} color={online === total ? 'from-emerald-500 to-emerald-400' : 'from-amber-500 to-yellow-400'} />
                    </div>
                  );
                })}
                <div className="text-[10px] text-gray-400 text-center pt-1">
                  {onlineSensors}/{sensorsList.length} {language === 'hi' ? 'डिवाइस ऑनलाइन' : 'devices online'}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <WifiOff className="h-6 w-6 text-gray-500 mx-auto mb-2" />
                <p className="text-[10px] text-gray-400">{language === 'hi' ? 'इस फार्म के लिए कोई सेंसर पंजीकृत नहीं है' : 'No sensors registered for this farm'}</p>
                <button onClick={() => onNavigate?.('iot')} className="mt-2 text-[10px] text-purple-400 hover:text-white font-bold cursor-pointer">
                  {language === 'hi' ? 'IoT सेट अप करें →' : 'Set up IoT →'}
                </button>
              </div>
            )}
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants} className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-xl">
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-5">
              <Clock className="h-4 w-4 text-[#A78BFA]" /> {language === 'hi' ? 'हाल की गतिविधि' : 'Recent Activity'}
            </h3>
            <div className="relative pl-5 border-l border-white/10 space-y-4">
              {notifications.slice(0, 5).length > 0 ? (
                notifications.slice(0, 5).map((act, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[22px] top-1 w-2 h-2 rounded-full bg-[#9333EA] border border-black" />
                    <div className="text-[10px] font-bold text-white">{parseNotifText(act.title, language)}</div>
                    <div className="text-[9px] text-gray-400 mt-0.5 line-clamp-1">{parseNotifText(act.message, language)}</div>
                    <div className="text-[9px] text-[#D946EF] mt-0.5">{act.timestamp ? new Date(act.timestamp).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-US') : ''}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-2">
                  <Clock className="h-6 w-6 text-gray-500 mx-auto mb-1" />
                  <p className="text-[10px] text-gray-400">{language === 'hi' ? 'अभी तक कोई गतिविधि दर्ज नहीं की गई' : 'No activity recorded yet'}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── SECTION 8: System Health ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-xl">
        <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-emerald-400" /> {language === 'hi' ? 'सिस्टम स्वास्थ्य' : 'System Health'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {systemItems.map((s, i) => {
            let labelText = s.label;
            if (s.label === 'API Gateway') labelText = language === 'hi' ? 'एपीआई गेटवे' : 'API Gateway';
            else if (s.label === 'Database Sync') labelText = language === 'hi' ? 'डेटाबेस सिंक' : 'Database Sync';
            else if (s.label === 'IoT Broker') labelText = language === 'hi' ? 'आईओटी ब्रोकर' : 'IoT Broker';
            else if (s.label === 'AI Analytics Engine') labelText = language === 'hi' ? 'एआई एनालिटिक्स इंजन' : 'AI Analytics Engine';
            else if (s.label === 'ESP32 Bridge') labelText = language === 'hi' ? 'ESP32 ब्रिज' : 'ESP32 Bridge';

            return (
              <div key={i} className="bg-black/30 border border-white/5 p-3 rounded-xl flex items-center gap-3">
                <s.icon className={`h-4 w-4 shrink-0 ${s.status === 'online' ? 'text-emerald-400' : s.status === 'warning' ? 'text-amber-400' : 'text-rose-400'}`} />
                <div>
                  <div className="text-[10px] font-bold text-white">{labelText}</div>
                  <StatusPill status={s.status} lang={language} />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── SECTION 9: 7-Day Weather Forecast ───────────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Sun className="h-4 w-4 text-yellow-400" /> {language === 'hi' ? '7-दिवसीय पूर्वानुमान' : '7-Day Forecast'}
            {weatherError && (
              <span className="px-2 py-0.5 bg-rose-500/15 text-rose-400 border border-rose-500/20 rounded-full text-[9px] font-bold">
                {language === 'hi' ? 'ऑफ़लाइन' : 'Offline'}
              </span>
            )}
          </h3>
          {weatherError && (
            <button onClick={fetchWeather} className="text-[10px] text-amber-400 hover:text-white flex items-center gap-1 cursor-pointer">
              <RefreshCw className="h-3 w-3" /> {language === 'hi' ? 'पुनः प्रयास करें' : 'Retry'}
            </button>
          )}
        </div>
        <div className="overflow-x-auto pb-2 custom-scrollbar">
          <div className="flex gap-3 min-w-max">
            {forecast?.daily?.time?.map((t: string, i: number) => {
              const dayStr = new Date(t).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'short' });
              return (
                <div key={i} className="bg-black/20 hover:bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col items-center min-w-[110px] hover:-translate-y-1 transition-all duration-300">
                  <span className="text-xs font-bold text-[#E9D5FF] mb-2 uppercase">{dayStr}</span>
                  <WeatherIcon code={forecast.daily.weather_code?.[i] ?? 0} size="md" />
                  <div className="mt-3 text-center">
                    <div className="text-base font-black text-white">{safeNum(forecast.daily.temperature_2m_max?.[i], 0)}°</div>
                    <div className="text-xs text-[#A78BFA]">{safeNum(forecast.daily.temperature_2m_min?.[i], 0)}°</div>
                  </div>
                  <div className="mt-2 text-[10px] text-blue-400 flex items-center gap-1 font-bold">
                    <CloudRain className="h-3 w-3" /> {safeNum(forecast.daily.precipitation_probability_max?.[i], 0)}%
                  </div>
                </div>
              );
            })}
            {!forecast && Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-black/20 border border-white/5 p-4 rounded-2xl flex flex-col items-center min-w-[110px] h-44">
                <div className="h-4 w-10 bg-white/10 rounded mb-3" />
                <div className="h-8 w-8 bg-white/10 rounded-full mb-3" />
                <div className="h-5 w-8 bg-white/10 rounded mb-1" />
                <div className="h-3 w-6 bg-white/10 rounded" />
              </div>
            ))}
            {forecast && !forecast.daily?.time && (
              <div className="text-center py-6 text-xs text-gray-400">
                {language === 'hi' ? 'पूर्वानुमान डेटा उपलब्ध नहीं है' : 'No forecast data available'}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Floating AI Widget ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.2, type: 'spring', stiffness: 200, damping: 20 }}
        className="fixed bottom-6 right-6 z-50 w-72 bg-gradient-to-br from-[#4C1D95] to-[#2E1065] rounded-2xl shadow-2xl border border-[#8B5CF6]/50 overflow-hidden hidden lg:block"
      >
        <div className="p-4 flex items-center gap-3 border-b border-white/10">
          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 relative">
            <Sparkles className="h-5 w-5 text-[#D946EF]" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-[#2E1065]" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white">{language === 'hi' ? 'एग्रीसेंस एआई' : 'AgriSense AI'}</h4>
            <p className="text-[10px] text-emerald-400 font-medium">{language === 'hi' ? 'ऑनलाइन · सहायता के लिए तैयार' : 'Online · Ready to assist'}</p>
          </div>
        </div>
        <div className="p-4 bg-black/30">
          <p className="text-xs text-gray-100 mb-3 font-medium leading-relaxed">
            {aiSummaryLines[0] || (language === 'hi' ? `फार्म स्वास्थ्य ${healthScore}% पर है।` : `Farm health is at ${healthScore}%.`)}
          </p>
          <div className="space-y-1.5 mb-3">
            {[
              language === 'hi' ? 'मुझे आज क्या करना चाहिए?' : 'What should I do today?',
              language === 'hi' ? 'सिंचाई अनुसूची दिखाएं' : 'Show irrigation schedule'
            ].map((q, i) => (
              <button key={i} onClick={() => onNavigate?.('chat')}
                className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] text-[#E9D5FF] py-2 px-3 rounded-lg transition-colors truncate cursor-pointer">
                "{q}"
              </button>
            ))}
          </div>
          <button onClick={() => onNavigate?.('chat')}
            className="w-full bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95">
            <MessageSquare className="h-4 w-4" /> {language === 'hi' ? 'सहायक खोलें' : 'Open Assistant'}
          </button>
        </div>
      </motion.div>

    </motion.div>
  );
}
