import React, { useState, useEffect, useMemo } from 'react';
import { 
  Droplets, Compass, ShieldCheck, AlertCircle, Loader2, History,
  Activity, Thermometer, Wind, Leaf, TrendingUp, AlertTriangle, 
  CheckCircle2, Download, Search, FileText, BarChart2, Sparkles,
  Calendar, Info, Plus, ChevronDown, ChevronUp, Zap, CloudRain, Award, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, Cell
} from 'recharts';
import { Farm, User } from '../types';
import { fetch } from '../utils/api';
import { t } from '../utils/i18n';

interface SoilAnalysisProps {
  user: User;
  farms: Farm[];
  activeFarm: Farm | null;
  language?: 'en' | 'hi';
}

export default function SoilAnalysis({ user, farms, activeFarm, language = 'en' }: SoilAnalysisProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentRecs, setCurrentRecs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'recommendations' | 'history' | 'new-test'>('overview');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [translatedCache, setTranslatedCache] = useState<Record<string, any>>({});
  const [translating, setTranslating] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    execSummary: true,
    chemAnalysis: false,
    fertility: false,
    deficiency: false,
    cropSuitability: false,
    yield: false,
    irrigation: false,
    fertilizer: false,
    pestRisk: false,
    weather: false,
    sustainability: false,
    actionPlan: false,
    explainable: false,
    confidence: false
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Form Fields State
  const [pH, setPh] = useState('6.5');
  const [moisture, setMoisture] = useState('45');
  const [nitrogen, setNitrogen] = useState('80');
  const [phosphorus, setPhosphorus] = useState('40');
  const [potassium, setPotassium] = useState('150');
  const [organicCarbon, setOrganicCarbon] = useState('2.5');
  const [temperature, setTemperature] = useState('24');
  const [humidity, setHumidity] = useState('55');

  // History Table State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const currentFarm = activeFarm || farms[0] || null;

  useEffect(() => {
    if (currentFarm) {
      fetchHistory(currentFarm.id);
    }
  }, [currentFarm?.id]);

  // Adjust active tab if no records exist
  useEffect(() => {
    if (history.length === 0 && activeTab !== 'new-test') {
      setActiveTab('new-test');
    }
  }, [history]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchHistory = async (farmId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/soil-analysis?farmId=${farmId}`);
      const data = await res.json();
      if (data.success) {
        const sorted = (data.history || []).sort(
          (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setHistory(sorted);
        if (sorted.length > 0) {
          const latest = sorted[sorted.length - 1];
          setCurrentRecs(latest.recommendations || []);
        } else {
          setCurrentRecs([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch soil history', err);
      showToast(t(language, 'soilFetchFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFarm) return;

    setSaving(true);
    try {
      const res = await fetch('/api/soil-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId: currentFarm.id,
          pH: parseFloat(pH),
          moisture: parseFloat(moisture),
          nitrogen: parseFloat(nitrogen),
          phosphorus: parseFloat(phosphorus),
          potassium: parseFloat(potassium),
          organicCarbon: parseFloat(organicCarbon),
          temperature: parseFloat(temperature),
          humidity: parseFloat(humidity),
          language
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(t(language, 'soilSaveSuccess'), 'success');
        setSelectedRecordId(null);
        await fetchHistory(currentFarm.id);
        setActiveTab('overview');
      } else {
        showToast(data.message || t(language, 'soilSaveFailed'), 'error');
      }
    } catch (err: any) {
      showToast(err.message || t(language, 'soilErrorOccurred'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const latestRecord = useMemo(() => {
    if (history.length === 0) return null;
    if (selectedRecordId) {
      return history.find(h => h.id === selectedRecordId || h._id === selectedRecordId) || history[history.length - 1];
    }
    return history[history.length - 1];
  }, [history, selectedRecordId]);

  // Load translation when language changes or a new record is selected
  useEffect(() => {
    if (!latestRecord) return;
    const recId = latestRecord.id || latestRecord._id;

    if (latestRecord.translations?.[language]) {
      setTranslatedCache(prev => ({
        ...prev,
        [`${recId}_${language}`]: latestRecord.translations[language]
      }));
      return;
    }

    const cacheKey = `${recId}_${language}`;
    if (translatedCache[cacheKey]) {
      return;
    }

    if (language === 'en') {
      try {
        const parsed = JSON.parse(latestRecord.aiReport || '{}');
        const englishObj = {
          recommendations: latestRecord.recommendations || [],
          deficiencies: latestRecord.deficiencies || [],
          fertilizerRecommendation: latestRecord.fertilizerRecommendation || '',
          irrigationRecommendation: latestRecord.irrigationRecommendation || '',
          suitableCrops: latestRecord.suitableCrops || [],
          riskLevel: latestRecord.riskLevel || 'Low',
          aiReport: parsed
        };
        setTranslatedCache(prev => ({
          ...prev,
          [cacheKey]: englishObj
        }));
      } catch (e) {
        console.error(e);
      }
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
            moduleType: 'soil',
            targetLanguage: language
          })
        });
        const data = await res.json();
        if (data.success && data.translated) {
          setTranslatedCache(prev => ({
            ...prev,
            [cacheKey]: data.translated
          }));
          latestRecord.translations = latestRecord.translations || {};
          latestRecord.translations[language] = data.translated;
        }
      } catch (err) {
        console.error("Translation request failed", err);
      } finally {
        setTranslating(false);
      }
    };

    triggerTranslation();
  }, [latestRecord, language]);

  const activeTranslation = useMemo(() => {
    if (!latestRecord) return null;
    const recId = latestRecord.id || latestRecord._id;
    const cacheKey = `${recId}_${language}`;
    return translatedCache[cacheKey] || null;
  }, [latestRecord, language, translatedCache]);

  const aiReportData = useMemo(() => {
    if (activeTranslation) return activeTranslation.aiReport;
    if (!latestRecord || !latestRecord.aiReport) return null;
    try {
      return JSON.parse(latestRecord.aiReport);
    } catch (e) {
      console.error("Failed to parse aiReport JSON", e);
      return null;
    }
  }, [latestRecord, activeTranslation]);

  // Translate direct text fields dynamically from cached translation
  const activeRecommendations = useMemo(() => {
    if (activeTranslation?.recommendations) return activeTranslation.recommendations;
    return latestRecord?.recommendations || [];
  }, [latestRecord, activeTranslation]);

  const activeDeficiencies = useMemo(() => {
    if (activeTranslation?.deficiencies) return activeTranslation.deficiencies;
    return latestRecord?.deficiencies || [];
  }, [latestRecord, activeTranslation]);

  const activeFertilizerRec = useMemo(() => {
    if (activeTranslation?.fertilizerRecommendation) return activeTranslation.fertilizerRecommendation;
    return latestRecord?.fertilizerRecommendation || '';
  }, [latestRecord, activeTranslation]);

  const activeIrrigationRec = useMemo(() => {
    if (activeTranslation?.irrigationRecommendation) return activeTranslation.irrigationRecommendation;
    return latestRecord?.irrigationRecommendation || '';
  }, [latestRecord, activeTranslation]);

  const activeSuitableCrops = useMemo(() => {
    if (activeTranslation?.suitableCrops) return activeTranslation.suitableCrops;
    return latestRecord?.suitableCrops || [];
  }, [latestRecord, activeTranslation]);

  const activeRiskLevel = useMemo(() => {
    if (activeTranslation?.riskLevel) return activeTranslation.riskLevel;
    return latestRecord?.riskLevel || 'Low';
  }, [latestRecord, activeTranslation]);

  const computedHealthScore = useMemo(() => {
    if (!latestRecord) return 0;
    const moisture = latestRecord.moisture || 0;
    const pH = latestRecord.pH || 7.0;
    const nitrogen = latestRecord.nitrogen || 0;
    
    let score = 98;
    score -= Math.abs(pH - 6.5) * 12;
    if (moisture < 35) score -= (35 - moisture) * 1.0;
    if (moisture > 75) score -= (moisture - 75) * 1.0;
    if (nitrogen < 50) score -= (50 - nitrogen) * 0.3;
    
    return Math.max(50, Math.min(100, Math.round(score)));
  }, [latestRecord]);

  // Export Functions
  const exportCSV = () => {
    if (history.length === 0) {
      showToast(t(language, 'soilNoRecordsExport'), 'error');
      return;
    }
    const headers = [t(language, 'soilDateLogged'), t(language, 'soilMoistureFormLabel'), t(language, 'soilPHFormLabel'), t(language, 'soilNitrogenFormLabel'), t(language, 'soilPhosphorusFormLabel'), t(language, 'soilPotassiumFormLabel'), t(language, 'soilOrgCarbonFormLabel'), t(language, 'soilTempFormLabel'), t(language, 'soilAmbientHumidityFormLabel')];
    const rows = history.map(h => [
      new Date(h.createdAt).toLocaleDateString(),
      h.moisture,
      h.pH,
      h.nitrogen || 0,
      h.phosphorus || 0,
      h.potassium || 0,
      h.organicCarbon || 0,
      h.temperature || 0,
      h.humidity || 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `soil_history_${currentFarm?.name || 'farm'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    window.print();
  };

  if (farms.length === 0 || !currentFarm) {
    return (
      <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 text-center py-20 shadow-2xl">
        <AlertCircle className="h-12 w-12 text-[#9333EA] mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">{t(language, 'soilNoFarmsTitle')}</h3>
        <p className="text-sm text-[#E9D5FF] mb-6">{t(language, 'soilNoFarmsDesc')}</p>
      </div>
    );
  }

  // Table pagination
  const filteredHistory = [...history].reverse().filter(h => 
    new Date(h.createdAt).toLocaleDateString().includes(searchQuery) ||
    (h.pH && h.pH.toString().includes(searchQuery))
  );
  
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const chartData = history.map(h => ({
    date: new Date(h.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    moisture: h.moisture,
    pH: h.pH,
    health: 70 + (h.nitrogen % 30), // computed trend score
    N: h.nitrogen || 0,
    P: h.phosphorus || 0,
    K: h.potassium || 0,
    temp: h.temperature || 0
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight mb-1">{t(language, 'soilPanelTitle')}</h2>
          <p className="text-[#E9D5FF]">
            {t(language, 'soilPanelSubtitle')} <strong>{currentFarm.name}</strong>
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-bold transition-colors focus:outline-none cursor-pointer">
            <Download className="h-4 w-4 text-[#D946EF]" /> CSV
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-bold transition-colors focus:outline-none cursor-pointer">
            <FileText className="h-4 w-4 text-[#9333EA]" /> PDF
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-white/10 pb-4 no-scrollbar">
        {[
          { id: 'overview', label: t(language, 'soilTabOverview'), icon: Activity, disabled: history.length === 0 },
          { id: 'charts', label: t(language, 'soilTabCharts'), icon: BarChart2, disabled: history.length === 0 },
          { id: 'recommendations', label: t(language, 'soilTabRecommendations'), icon: ShieldCheck, disabled: history.length === 0 },
          { id: 'history', label: t(language, 'soilTabHistory'), icon: History, disabled: history.length === 0 },
          { id: 'new-test', label: t(language, 'soilTabNewTest'), icon: Plus, disabled: false }
        ].map(tab => (
          <button
            key={tab.id}
            disabled={tab.disabled}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap focus:outline-none ${
              tab.disabled 
                ? 'opacity-30 cursor-not-allowed text-gray-600'
                : activeTab === tab.id 
                  ? 'bg-[#9333EA]/20 text-[#D946EF] border border-[#9333EA]/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent cursor-pointer'
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Decker */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && latestRecord && (
            <div className="space-y-8">
              {/* Dashboard Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1 justify-center"><Droplets className="h-3.5 w-3.5 text-blue-400" /> {t(language, 'soilMoisture')}</p>
                  <p className="text-xl font-black text-white">{latestRecord.moisture}%</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1 justify-center"><Compass className="h-3.5 w-3.5 text-yellow-400" /> {t(language, 'soilPHLevel')}</p>
                  <p className="text-xl font-black text-white">{latestRecord.pH}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1 justify-center"><Leaf className="h-3.5 w-3.5 text-green-400" /> {t(language, 'soilNitrogen')}</p>
                  <p className="text-xl font-black text-white">{latestRecord.nitrogen || 0} <span className="text-[10px] text-gray-500">mg/kg</span></p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1 justify-center"><TrendingUp className="h-3.5 w-3.5 text-purple-400" /> {t(language, 'soilPotassium')}</p>
                  <p className="text-xl font-black text-white">{latestRecord.potassium || 0} <span className="text-[10px] text-gray-500">mg/kg</span></p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 justify-center">{t(language, 'soilPhosphorus')}</p>
                  <p className="text-xl font-black text-white">{latestRecord.phosphorus || 0} <span className="text-[10px] text-gray-500">mg/kg</span></p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 justify-center">{t(language, 'soilOrgCarbon')}</p>
                  <p className="text-xl font-black text-white">{latestRecord.organicCarbon || 0}%</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1 justify-center"><Thermometer className="h-3.5 w-3.5 text-rose-400" /> {t(language, 'soilTemp')}</p>
                  <p className="text-xl font-black text-white">{latestRecord.temperature || 0}°C</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1 justify-center"><Wind className="h-3.5 w-3.5 text-cyan-400" /> {t(language, 'soilHumidity')}</p>
                  <p className="text-xl font-black text-white">{latestRecord.humidity || 0}%</p>
                </div>
              </div>

              {translating && (
                <div className="bg-[#9333EA]/10 border border-[#9333EA]/20 p-4 rounded-2xl flex items-center gap-3 text-[#E9D5FF] animate-pulse">
                  <Loader2 className="h-5 w-5 animate-spin text-[#D946EF]" />
                  <span className="text-xs font-bold">{t(language, 'soilTranslating')}</span>
                </div>
              )}

              {!aiReportData ? (
                /* Legacy Record Warning and Old Recommendations view */
                <div className="space-y-6">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-5 rounded-2xl flex gap-3 text-yellow-300">
                    <Info className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold">{t(language, 'soilLegacyScan')}</h4>
                      <p className="text-xs text-yellow-400/80 mt-1">{t(language, 'soilLegacyScanDesc')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-gradient-to-br from-[#121024] to-[#1a1736] p-6 rounded-3xl border border-[#9333EA]/20 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#9333EA]/10 blur-[80px] rounded-full" />
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                        <Activity className="h-6 w-6 text-[#D946EF]" /> {t(language, 'soilAIQualityIndex')}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                          <span className="text-xs text-gray-400 font-bold uppercase mb-2 block">{t(language, 'soilHealthScoreLabel')}</span>
                          <span className="text-3xl font-black text-green-400">{latestRecord.soilHealth || 5.0}/10</span>
                        </div>
                        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                          <span className="text-xs text-gray-400 font-bold uppercase mb-2 block">{t(language, 'soilRiskLevelLabel')}</span>
                          <span className="text-lg font-bold text-yellow-400">{activeRiskLevel || t(language, 'soilModerateLabel')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Sparkles className="h-5 w-5 text-[#D946EF]" /> {t(language, 'soilTabRecommendations')}</h3>
                      <ul className="space-y-3">
                        {activeRecommendations.map((rec, i) => (
                          <li key={i} className="text-xs text-gray-300 bg-black/20 p-3 rounded-xl border border-white/5">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                /* Enhanced Dynamic 15-Section AI Agronomic Report & 6 Visualizations */
                <div className="space-y-8">
                  {/* VISUALIZATIONS SECTION */}
                  <div>
                    <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                      <BarChart2 className="h-6 w-6 text-[#D946EF]" /> {t(language, 'soilAgronomicVisualizations')}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* 1. Fertility Gauge */}
                      <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col justify-between h-[300px] shadow-lg">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">{t(language, 'soilFertilityGauge')}</h4>
                        <div className="relative flex flex-col items-center justify-center h-48">
                          <svg className="w-36 h-36 transform -rotate-90">
                            <circle cx="72" cy="72" r="54" stroke="#ffffff08" strokeWidth="10" fill="transparent" />
                            <circle cx="72" cy="72" r="54" stroke="url(#fertilityGrad)" strokeWidth="10" fill="transparent"
                                    strokeDasharray="339.3" strokeDashoffset={339.3 - (339.3 * ((parseFloat(aiReportData.executiveSummary.healthScore) || latestRecord.soilHealth || 7.0) / 10))}
                                    strokeLinecap="round" className="transition-all duration-1000" />
                            <defs>
                              <linearGradient id="fertilityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#9333EA" />
                                <stop offset="100%" stopColor="#D946EF" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-white">{(parseFloat(aiReportData.executiveSummary.healthScore) || latestRecord.soilHealth || 7.0).toFixed(1)}</span>
                            <span className="text-[9px] text-[#D946EF] font-bold uppercase tracking-widest mt-1">{t(language, 'soilHealthScoreGauge')}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-center text-gray-400">{t(language, 'soilClassified')}: <strong className="text-white">{aiReportData.soilFertilityAssessment?.classification || 'Good'}</strong></p>
                      </div>

                      {/* 2. Nutrient Radar Chart */}
                      <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col justify-between h-[300px] shadow-lg">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">{t(language, 'soilNutrientRadar')}</h4>
                        <div className="h-48 flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={[
                              { subject: 'pH', value: ((latestRecord.pH || 6.5) / 14) * 100 },
                              { subject: language === 'hi' ? 'नमी' : 'Moisture', value: latestRecord.moisture || 0 },
                              { subject: language === 'hi' ? 'नाइट्रोजन' : 'Nitrogen', value: Math.min(100, ((latestRecord.nitrogen || 0) / 150) * 100) },
                              { subject: language === 'hi' ? 'फास्फोरस' : 'Phosphorus', value: Math.min(100, ((latestRecord.phosphorus || 0) / 100) * 100) },
                              { subject: language === 'hi' ? 'पोटेशियम' : 'Potassium', value: Math.min(100, ((latestRecord.potassium || 0) / 250) * 100) },
                              { subject: language === 'hi' ? 'जैविक कार्बन' : 'Carbon', value: Math.min(100, ((latestRecord.organicCarbon || 0) / 5) * 100) }
                            ]}>
                              <PolarGrid stroke="#ffffff10" />
                              <PolarAngleAxis dataKey="subject" stroke="#ffffff70" tick={{ fontSize: 9 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="transparent" />
                              <Radar name={t(language, 'soilSoilParameters')} dataKey="value" stroke="#D946EF" fill="#9333EA" fillOpacity={0.4} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] text-center text-gray-400">{t(language, 'soilNormalizedLevels')}</p>
                      </div>

                      {/* 3. Risk Meter Gauge */}
                      <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col justify-between h-[300px] shadow-lg">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">{t(language, 'soilPestRiskMeter')}</h4>
                        <div className="space-y-4 py-12">
                          <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
                            <div className={`absolute top-0 left-0 h-full bg-gradient-to-r ${
                              aiReportData.pestDiseaseRisk?.riskLevel?.toLowerCase().includes('high') || aiReportData.pestDiseaseRisk?.riskLevel?.toLowerCase().includes('critical')
                                ? 'from-red-500 to-rose-600' : aiReportData.pestDiseaseRisk?.riskLevel?.toLowerCase().includes('moderate')
                                ? 'from-yellow-400 to-amber-500' : 'from-green-400 to-emerald-500'
                            }`} style={{ width: `${
                              aiReportData.pestDiseaseRisk?.riskLevel?.toLowerCase().includes('high') || aiReportData.pestDiseaseRisk?.riskLevel?.toLowerCase().includes('critical') ? 85 :
                              aiReportData.pestDiseaseRisk?.riskLevel?.toLowerCase().includes('moderate') ? 50 : 20
                            }%` }} />
                          </div>
                          <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                            <span>{t(language, 'soilLow')}</span>
                            <span>{t(language, 'soilModerateLabel')}</span>
                            <span>{t(language, 'soilHighCritical')}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-center text-gray-400">{t(language, 'soilAssessedThreat')}: <strong className="text-white">{aiReportData.pestDiseaseRisk?.riskLevel || t(language, 'soilLow')}</strong></p>
                      </div>

                      {/* 4. Yield Probability Chart */}
                      <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col justify-between h-[300px] shadow-lg">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">{t(language, 'soilYieldProbability')}</h4>
                        <div className="h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { name: t(language, 'soilYieldLow'), prob: 15 },
                              { name: t(language, 'soilYieldAvgMinus'), prob: 45 },
                              { name: t(language, 'soilExpected'), prob: 95 },
                              { name: t(language, 'soilYieldAvgPlus'), prob: 45 },
                              { name: t(language, 'soilYieldHigh'), prob: 15 }
                            ]}>
                              <XAxis dataKey="name" stroke="#ffffff40" tick={{ fontSize: 8 }} />
                              <YAxis hide />
                              <Tooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '12px' }} />
                              <Bar dataKey="prob" fill="#9333EA" radius={[6, 6, 0, 0]}>
                                {[15, 45, 95, 45, 15].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 2 ? '#D946EF' : '#9333EA30'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] text-center text-gray-400">{t(language, 'soilTargetValue')}: <strong className="text-white">{aiReportData.yieldPrediction?.expectedYield || 'N/A'}</strong></p>
                      </div>

                      {/* 5. NPK Comparison Chart */}
                      <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col justify-between h-[300px] shadow-lg">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">{t(language, 'soilNPKComparison')}</h4>
                        <div className="h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { name: t(language, 'soilNitrogenN'), Current: latestRecord.nitrogen || 0, Ideal: 80 },
                              { name: t(language, 'soilPhosphorusP'), Current: latestRecord.phosphorus || 0, Ideal: 40 },
                              { name: t(language, 'soilPotassiumK'), Current: latestRecord.potassium || 0, Ideal: 120 }
                            ]}>
                              <XAxis dataKey="name" stroke="#ffffff40" tick={{ fontSize: 9 }} />
                              <YAxis stroke="#ffffff40" tick={{ fontSize: 8 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '12px' }} />
                              <Legend wrapperStyle={{ fontSize: '9px' }} />
                              <Bar dataKey="Current" fill="#D946EF" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Ideal" fill="#3B82F6" radius={[4, 4, 0, 0]} fillOpacity={0.4} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] text-center text-gray-400">{t(language, 'soilValuesInMgKg')}</p>
                      </div>

                      {/* 6. Water Requirement Chart */}
                      <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col justify-between h-[300px] shadow-lg">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">{t(language, 'soilWaterDemand')}</h4>
                        <div className="h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { season: t(language, 'soilWinter'), Liters: 12000 },
                              { season: t(language, 'soilSpring'), Liters: 18000 },
                              { season: t(language, 'soilSummer'), Liters: 25000 },
                              { season: t(language, 'soilMonsoon'), Liters: 6000 }
                            ]}>
                              <XAxis dataKey="season" stroke="#ffffff40" tick={{ fontSize: 8 }} />
                              <YAxis stroke="#ffffff40" tick={{ fontSize: 8 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '12px' }} />
                              <Bar dataKey="Liters" fill="#3B82F6" radius={[6, 6, 0, 0]}>
                                {[12000, 18000, 25000, 6000].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 2 ? '#3B82F6' : '#3B82F640'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] text-center text-gray-400">{t(language, 'soilTargetCycle')}: <strong className="text-white">{aiReportData.irrigation?.interval || 'N/A'}</strong></p>
                      </div>
                    </div>
                  </div>

                  {/* 14 COLLAPSIBLE CARDS */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                      <Sparkles className="h-6 w-6 text-[#9333EA]" /> {t(language, 'soilDetailedReport')}
                    </h3>

                    {/* Section 1: Executive Summary */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => toggleSection('execSummary')} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none">
                        <span className="flex items-center gap-2 font-bold text-white text-sm"><Award className="h-4 w-4 text-[#D946EF]" /> {t(language, 'soilSec1ExecSummary')}</span>
                        {openSections.execSummary ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {openSections.execSummary && (
                        <div className="p-5 border-t border-white/5 bg-black/25 space-y-4 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-black/30 p-3 rounded-lg"><span className="text-gray-400 block mb-1">{t(language, 'soilHealthScoreLabel')}</span><strong className="text-green-400 text-lg">{aiReportData.executiveSummary.healthScore}/10</strong></div>
                            <div className="bg-black/30 p-3 rounded-lg"><span className="text-gray-400 block mb-1">{t(language, 'soilFertilityLevel')}</span><strong className="text-white text-sm">{aiReportData.executiveSummary.fertilityLevel}</strong></div>
                            <div className="bg-black/30 p-3 rounded-lg"><span className="text-gray-400 block mb-1">{t(language, 'soilProductivityPotential')}</span><strong className="text-[#D946EF] text-sm">{aiReportData.executiveSummary.productivityPotential}</strong></div>
                          </div>
                          <div><span className="text-gray-400 font-bold block mb-1">{t(language, 'soilCultivationSuitability')}:</span><p className="text-gray-300 leading-relaxed">{aiReportData.executiveSummary.cultivationSuitability}</p></div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl"><span className="text-green-400 font-bold block mb-1">{t(language, 'soilMajorStrengths')}:</span><p className="text-gray-300">{aiReportData.executiveSummary.majorStrengths}</p></div>
                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl"><span className="text-yellow-400 font-bold block mb-1">{t(language, 'soilMajorConcerns')}:</span><p className="text-gray-300">{aiReportData.executiveSummary.majorConcerns}</p></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 2: Chemical Analysis */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => toggleSection('chemAnalysis')} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none">
                        <span className="flex items-center gap-2 font-bold text-white text-sm"><Compass className="h-4 w-4 text-yellow-400" /> {t(language, 'soilSec2ChemAnalysis')}</span>
                        {openSections.chemAnalysis ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {openSections.chemAnalysis && (
                        <div className="p-5 border-t border-white/5 bg-black/25 text-xs overflow-x-auto">
                          <table className="w-full text-left min-w-[600px] border-collapse">
                            <thead>
                              <tr className="border-b border-white/10 text-gray-400 text-[10px] uppercase font-bold">
                                <th className="pb-3">{t(language, 'soilParameter')}</th>
                                <th className="pb-3">{t(language, 'soilValue')}</th>
                                <th className="pb-3">{t(language, 'soilIdealLabel')}</th>
                                <th className="pb-3">{t(language, 'soilInterpretation')}</th>
                                <th className="pb-3">{t(language, 'soilGrowthEffect')}</th>
                                <th className="pb-3">{t(language, 'soilSuggestions')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {Object.entries(aiReportData.chemicalAnalysis || {}).map(([key, data]: any) => (
                                <tr key={key} className="hover:bg-white/5 transition-colors">
                                  <td className="py-3 font-bold text-white uppercase">{key}</td>
                                  <td className="py-3 text-cyan-400 font-bold">{data.value}</td>
                                  <td className="py-3 text-gray-400">{data.ideal}</td>
                                  <td className="py-3 text-gray-300">{data.interpretation}</td>
                                  <td className="py-3 text-gray-300">{data.effect}</td>
                                  <td className="py-3 text-green-300">{data.improvements}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Section 3: Soil Fertility Assessment */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => toggleSection('fertility')} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none">
                        <span className="flex items-center gap-2 font-bold text-white text-sm"><Leaf className="h-4 w-4 text-green-400" /> {t(language, 'soilSec3Fertility')}</span>
                        {openSections.fertility ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {openSections.fertility && (
                        <div className="p-5 border-t border-white/5 bg-black/25 space-y-3 text-xs">
                          <div>
                            <span className="text-gray-400 font-bold block mb-1">{t(language, 'soilFertilityClassification')}:</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              aiReportData.soilFertilityAssessment.classification.toLowerCase().includes('excellent') ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                              aiReportData.soilFertilityAssessment.classification.toLowerCase().includes('good') ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                            }`}>{aiReportData.soilFertilityAssessment.classification}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold block mb-1">{t(language, 'soilDetailedExplanation')}:</span>
                            <p className="text-gray-300 leading-relaxed">{aiReportData.soilFertilityAssessment.explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 4: Nutrient Deficiency Analysis */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => toggleSection('deficiency')} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none">
                        <span className="flex items-center gap-2 font-bold text-white text-sm"><AlertCircle className="h-4 w-4 text-red-400" /> {t(language, 'soilSec4Deficiency')}</span>
                        {openSections.deficiency ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {openSections.deficiency && (
                        <div className="p-5 border-t border-white/5 bg-black/25 text-xs space-y-4">
                          {Object.entries(aiReportData.nutrientDeficiency || {}).map(([key, value]: any) => (
                            <div key={key} className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-bold text-white uppercase">{key.replace('Deficiency', '')} {t(language, 'soilStatus')}</h4>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${value.status.toLowerCase() === 'yes' || !value.status.toLowerCase().includes('no') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>{value.status}</span>
                                </div>
                                {value.symptoms !== 'None' && value.symptoms !== 'कोई नहीं' && (
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px]">
                                    <div><span className="text-gray-500 font-semibold block">{t(language, 'soilSymptoms')}:</span><span className="text-gray-300">{value.symptoms}</span></div>
                                    <div><span className="text-gray-500 font-semibold block">{t(language, 'soilCropImpact')}:</span><span className="text-gray-300">{value.impact}</span></div>
                                    <div><span className="text-gray-500 font-semibold block">{t(language, 'soilRecoveryMethods')}:</span><span className="text-green-400">{value.recovery}</span></div>
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section 5: Crop Suitability Analysis */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => toggleSection('cropSuitability')} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none">
                        <span className="flex items-center gap-2 font-bold text-white text-sm"><ShieldCheck className="h-4 w-4 text-green-400" /> {t(language, 'soilSec5CropSuitability')}</span>
                        {openSections.cropSuitability ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {openSections.cropSuitability && (
                        <div className="p-5 border-t border-white/5 bg-black/25 text-xs space-y-4">
                          {aiReportData.cropSuitability?.map((c: any, i: number) => (
                            <div key={i} className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <h4 className="font-black text-white text-sm flex items-center gap-2"><Award className="h-4 w-4 text-[#D946EF]" /> {c.crop}</h4>
                                <p className="text-gray-400">{t(language, 'soilExpectedPerformance')}: {c.performance}</p>
                                <p className="text-gray-500 text-[11px]">{t(language, 'soilReasons')}: {c.reasons}</p>
                                {c.risks && <p className="text-red-400/80 text-[11px]">{t(language, 'soilRisks')}: {c.risks}</p>}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-2xl font-black text-green-400">{c.suitability}%</span>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{t(language, 'soilSuitabilityLabel')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section 6: AI Yield Prediction */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => toggleSection('yield')} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none">
                        <span className="flex items-center gap-2 font-bold text-white text-sm"><TrendingUp className="h-4 w-4 text-[#D946EF]" /> {t(language, 'soilSec6YieldPrediction')}</span>
                        {openSections.yield ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {openSections.yield && (
                        <div className="p-5 border-t border-white/5 bg-black/25 text-xs space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-black/30 p-3 rounded-lg"><span className="text-gray-400 block mb-1">{t(language, 'soilExpectedYieldLabel')}</span><strong className="text-green-400 text-lg">{aiReportData.yieldPrediction.expectedYield}</strong></div>
                            <div className="bg-black/30 p-3 rounded-lg"><span className="text-gray-400 block mb-1">{t(language, 'soilAIPredictionConfidence')}</span><strong className="text-[#D946EF] text-lg">{aiReportData.yieldPrediction.confidence}</strong></div>
                          </div>
                          <div><span className="text-green-400 font-bold block mb-1">{t(language, 'soilImprovingFactors')}:</span><p className="text-gray-300">{aiReportData.yieldPrediction.improvingFactors}</p></div>
                          <div><span className="text-red-400 font-bold block mb-1">{t(language, 'soilReducingFactors')}:</span><p className="text-gray-300">{aiReportData.yieldPrediction.reducingFactors}</p></div>
                        </div>
                      )}
                    </div>

                    {/* Section 7: Irrigation Recommendation */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => toggleSection('irrigation')} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none">
                        <span className="flex items-center gap-2 font-bold text-white text-sm"><Droplets className="h-4 w-4 text-blue-400" /> {t(language, 'soilSec7Irrigation')}</span>
                        {openSections.irrigation ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {openSections.irrigation && (
                        <div className="p-5 border-t border-white/5 bg-black/25 text-xs space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-3 bg-black/30 rounded-xl"><span className="text-gray-400 block mb-1">{t(language, 'soilWaterRequirement')}</span><strong className="text-blue-400 text-base">{aiReportData.irrigation.waterRequirement}</strong></div>
                            <div className="p-3 bg-black/30 rounded-xl"><span className="text-gray-400 block mb-1">{t(language, 'soilIrrigationInterval')}</span><strong className="text-white text-base">{aiReportData.irrigation.interval}</strong></div>
                          </div>
                          <div><span className="text-blue-400 font-bold block mb-1">{t(language, 'soilWaterSaving')}:</span><p className="text-gray-300 leading-relaxed">{aiReportData.irrigation.waterSaving}</p></div>
                          <div><span className="text-gray-400 font-bold block mb-1">{t(language, 'soilSeasonalIrrigation')}:</span><p className="text-gray-300 leading-relaxed">{aiReportData.irrigation.seasonal}</p></div>
                        </div>
                      )}
                    </div>

                    {/* Section 8: Fertilizer Recommendation */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => toggleSection('fertilizer')} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none">
                        <span className="flex items-center gap-2 font-bold text-white text-sm"><Leaf className="h-4 w-4 text-green-400" /> {t(language, 'soilSec8Fertilizer')}</span>
                        {openSections.fertilizer ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {openSections.fertilizer && (
                        <div className="p-5 border-t border-white/5 bg-black/25 text-xs space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-[#9333EA]/10 border border-[#9333EA]/20 p-4 rounded-xl"><span className="text-[#E9D5FF] font-bold block mb-1"><Zap className="h-4 w-4 inline mr-1 text-[#D946EF]" /> {t(language, 'soilNPKChemical')}</span><p className="text-white font-medium">{aiReportData.fertilizer.npk}</p></div>
                            <div className="bg-white/5 border border-white/10 p-4 rounded-xl"><span className="text-green-400 font-bold block mb-1"><Leaf className="h-4 w-4 inline mr-1" /> {t(language, 'soilOrganicFertilizers')}</span><p className="text-gray-300">{aiReportData.fertilizer.organic}</p></div>
                          </div>
                          <div className="bg-black/30 p-4 rounded-xl space-y-2">
                            <div><span className="text-gray-400 font-bold">{t(language, 'soilBiofertilizers')}:</span><p className="text-gray-300">{aiReportData.fertilizer.biofertilizers}</p></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              <div><span className="text-gray-500 font-bold block">{t(language, 'soilApplicationSchedule')}:</span><span className="text-gray-300">{aiReportData.fertilizer.schedule}</span></div>
                              <div><span className="text-gray-500 font-bold block">{t(language, 'soilRecommendedDosage')}:</span><span className="text-green-300 font-medium">{aiReportData.fertilizer.dosage}</span></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 9: Pest & Disease Risk */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => toggleSection('pestRisk')} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none">
                        <span className="flex items-center gap-2 font-bold text-white text-sm"><AlertTriangle className="h-4 w-4 text-rose-400" /> {t(language, 'soilSec9PestRisk')}</span>
                        {openSections.pestRisk ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {openSections.pestRisk && (
                        <div className="p-5 border-t border-white/5 bg-black/25 text-xs space-y-3">
                          <div>
                            <span className="text-gray-400 font-bold block mb-1">{t(language, 'soilThreatAssessment')}:</span>
                            <span className={`px-2 py-0.5 rounded font-black ${
                              aiReportData.pestDiseaseRisk.riskLevel.toLowerCase().includes('high') || aiReportData.pestDiseaseRisk.riskLevel.toLowerCase().includes('critical') ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              aiReportData.pestDiseaseRisk.riskLevel.toLowerCase().includes('moderate') ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'
                            }`}>{aiReportData.pestDiseaseRisk.riskLevel}</span>
                          </div>
                          <div><span className="text-gray-400 font-bold block mb-1">{t(language, 'soilLikelyDiseases')}:</span><p className="text-red-300 font-medium">{aiReportData.pestDiseaseRisk.possibleDiseases}</p></div>
                          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl"><span className="text-red-400 font-bold block mb-1">{t(language, 'soilPreventiveMeasures')}:</span><p className="text-gray-300 leading-relaxed mt-1">{aiReportData.pestDiseaseRisk.preventiveMeasures}</p></div>
                        </div>
                      )}
                    </div>

                    {/* Section 10: Weather Impact Analysis */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => toggleSection('weather')} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none">
                        <span className="flex items-center gap-2 font-bold text-white text-sm"><Wind className="h-4 w-4 text-cyan-400" /> {t(language, 'soilSec10Weather')}</span>
                        {openSections.weather ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {openSections.weather && (
                        <div className="p-5 border-t border-white/5 bg-black/25 text-xs space-y-4">
                          <div className="bg-black/30 p-4 rounded-xl border border-white/5"><span className="text-gray-400 font-bold block mb-1">{t(language, 'soilCurrentWeatherEffect')}:</span><p className="text-gray-300 leading-relaxed">{aiReportData.weatherImpact.currentEffect}</p></div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 p-3 rounded-xl"><span className="text-yellow-400 font-bold block mb-1"><Thermometer className="h-4 w-4 inline mr-1" /> {t(language, 'soilThermalStress')}</span><p className="text-gray-300 mt-1">{aiReportData.weatherImpact.heatStress} / {aiReportData.weatherImpact.coldStress}</p></div>
                            <div className="bg-white/5 border border-white/10 p-3 rounded-xl"><span className="text-blue-400 font-bold block mb-1"><CloudRain className="h-4 w-4 inline mr-1" /> {t(language, 'soilDrySpellRainfall')}</span><p className="text-gray-300 mt-1">{aiReportData.weatherImpact.upcomingRisks} / {aiReportData.weatherImpact.rainfallImpact}</p></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 11: Sustainability Score */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => toggleSection('sustainability')} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none">
                        <span className="flex items-center gap-2 font-bold text-white text-sm"><Award className="h-4 w-4 text-green-400" /> {t(language, 'soilSec11Sustainability')}</span>
                        {openSections.sustainability ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {openSections.sustainability && (
                        <div className="p-5 border-t border-white/5 bg-black/25 text-xs space-y-4">
                          <div className="flex items-center justify-between bg-black/30 p-4 rounded-xl border border-white/5">
                            <div>
                              <h4 className="font-bold text-white">{t(language, 'soilSustainabilityIndex')}</h4>
                              <p className="text-gray-500 text-[10px]">{t(language, 'soilSustainabilityDesc')}</p>
                            </div>
                            <span className="text-3xl font-black text-green-400">{(aiReportData.sustainabilityScore.score || 8.0).toFixed(1)}/10</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10"><span className="text-gray-400 font-bold block">{t(language, 'soilOrgCarbonImpact')}:</span><p className="text-gray-300 mt-1">{aiReportData.sustainabilityScore.organicCarbon}</p></div>
                            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10"><span className="text-gray-400 font-bold block">{t(language, 'soilWaterEfficiency')}:</span><p className="text-gray-300 mt-1">{aiReportData.sustainabilityScore.waterEfficiency}</p></div>
                            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10"><span className="text-gray-400 font-bold block">{t(language, 'soilNutrientBalances')}:</span><p className="text-gray-300 mt-1">{aiReportData.sustainabilityScore.nutrientBalance}</p></div>
                            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10"><span className="text-gray-400 font-bold block">{t(language, 'soilEnvironmentalFootprint')}:</span><p className="text-gray-300 mt-1">{aiReportData.sustainabilityScore.environmentalImpact} ({aiReportData.sustainabilityScore.carbonFootprint})</p></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 12: AI Action Plan */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => toggleSection('actionPlan')} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none">
                        <span className="flex items-center gap-2 font-bold text-white text-sm"><Clock className="h-4 w-4 text-blue-400" /> {t(language, 'soilSec12ActionPlan')}</span>
                        {openSections.actionPlan ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {openSections.actionPlan && (
                        <div className="p-5 border-t border-white/5 bg-black/25 text-xs space-y-4">
                          <div className="relative border-l-2 border-white/10 pl-6 space-y-5">
                            <div className="relative">
                              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-red-500 border-4 border-black" />
                              <h4 className="font-bold text-white text-[13px]">{t(language, 'soilImmediateAction')}</h4>
                              <p className="text-gray-300 mt-1">{aiReportData.actionPlan.immediate}</p>
                            </div>
                            <div className="relative">
                              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-yellow-500 border-4 border-black" />
                              <h4 className="font-bold text-white text-[13px]">{t(language, 'soilNext7Days')}</h4>
                              <p className="text-gray-300 mt-1">{aiReportData.actionPlan.next7Days}</p>
                            </div>
                            <div className="relative">
                              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-blue-500 border-4 border-black" />
                              <h4 className="font-bold text-white text-[13px]">{t(language, 'soilNext30Days')}</h4>
                              <p className="text-gray-300 mt-1">{aiReportData.actionPlan.next30Days}</p>
                            </div>
                            <div className="relative">
                              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-green-500 border-4 border-black" />
                              <h4 className="font-bold text-white text-[13px]">{t(language, 'soilSeasonalRotation')}</h4>
                              <p className="text-gray-300 mt-1">{aiReportData.actionPlan.seasonal}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 13: Explainable AI */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => toggleSection('explainable')} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none">
                        <span className="flex items-center gap-2 font-bold text-white text-sm"><Sparkles className="h-4 w-4 text-[#D946EF]" /> {t(language, 'soilSec13Explainable')}</span>
                        {openSections.explainable ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {openSections.explainable && (
                        <div className="p-5 border-t border-white/5 bg-[#9333EA]/5 text-xs text-gray-200 leading-relaxed space-y-2">
                          <p>{aiReportData.explainableAI}</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-2 border-t border-white/5 pt-2">{t(language, 'soilModelInfo')}</p>
                        </div>
                      )}
                    </div>

                    {/* Section 14: Confidence Score */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => toggleSection('confidence')} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none">
                        <span className="flex items-center gap-2 font-bold text-white text-sm"><Info className="h-4 w-4 text-[#9333EA]" /> {t(language, 'soilSec14Confidence')}</span>
                        {openSections.confidence ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {openSections.confidence && (
                        <div className="p-5 border-t border-white/5 bg-black/25 text-xs space-y-3">
                          <div className="flex items-center justify-between bg-black/30 p-3 rounded-lg border border-white/5">
                            <span className="font-bold text-gray-400">{t(language, 'soilAIConfidence')}</span>
                            <span className="text-xl font-black text-[#D946EF]">{aiReportData.confidenceScore.score}%</span>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold block mb-1">{t(language, 'soilConfidenceRationale')}:</span>
                            <p className="text-gray-300 leading-relaxed">{aiReportData.confidenceScore.explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. CHARTS TAB */}
          {activeTab === 'charts' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* NPK Values */}
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg">
                  <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-green-400" /> {t(language, 'soilNPKOverTime')}
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="date" stroke="#ffffff50" tick={{fontSize: 11}} />
                        <YAxis stroke="#ffffff50" tick={{fontSize: 11}} />
                        <Tooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line type="monotone" dataKey="N" stroke="#4ADE80" strokeWidth={2.5} name={t(language, 'soilNitrogenN')} />
                        <Line type="monotone" dataKey="P" stroke="#FBBF24" strokeWidth={2.5} name={t(language, 'soilPhosphorusP')} />
                        <Line type="monotone" dataKey="K" stroke="#A78BFA" strokeWidth={2.5} name={t(language, 'soilPotassiumK')} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Moisture Trend */}
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg">
                  <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-400" /> {t(language, 'soilMoistureHistory')}
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorMoistSoil" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="date" stroke="#ffffff50" tick={{fontSize: 11}} />
                        <YAxis stroke="#ffffff50" tick={{fontSize: 11}} />
                        <Tooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '12px' }} />
                        <Area type="monotone" dataKey="moisture" stroke="#60A5FA" strokeWidth={2} fillOpacity={1} fill="url(#colorMoistSoil)" name={t(language, 'soilMoisturePercent')} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. RECOMMENDATIONS TAB */}
          {activeTab === 'recommendations' && latestRecord && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeFertilizerRec && (
                <div className="p-6 rounded-3xl border border-green-500/20 bg-green-500/5 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
                  <Leaf className="h-8 w-8 text-green-400 mb-4" />
                  <h4 className="text-lg font-bold text-white mb-2">{t(language, 'soilFertilizerAdvice')}</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{activeFertilizerRec}</p>
                </div>
              )}
              {activeIrrigationRec && (
                <div className="p-6 rounded-3xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
                  <Droplets className="h-8 w-8 text-blue-400 mb-4" />
                  <h4 className="text-lg font-bold text-white mb-2">{t(language, 'soilIrrigationMgmt')}</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{activeIrrigationRec}</p>
                </div>
              )}
              {activeRecommendations.map((rec, i) => (
                <div key={i} className="p-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
                  <Activity className="h-8 w-8 text-cyan-400 mb-4" />
                  <h4 className="text-lg font-bold text-white mb-2">{t(language, 'soilAIInsight')} {i + 1}</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{rec}</p>
                </div>
              ))}
              {/* Fallback if no structured recs */}
              {!activeFertilizerRec && !activeIrrigationRec && activeRecommendations.length === 0 && [
                { title: t(language, 'soilFertilizerAdvice'), desc: t(language, 'soilMaintainNutrition'), icon: Leaf, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
                { title: t(language, 'soilIrrigationMgmt'), desc: t(language, 'soilScheduleWater'), icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                { title: t(language, 'soilCropSuitabilityFallback'), desc: t(language, 'soilOptimalGrowth'), icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
                { title: t(language, 'soilPathologyRisks'), desc: t(language, 'soilNoAnomalies'), icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
                { title: t(language, 'soilQualityLabel'), desc: t(language, 'soilChemParsed'), icon: Info, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' }
              ].map((rec, i) => (
                <div key={i} className="p-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
                  <rec.icon className={`h-8 w-8 ${rec.color} mb-4`} />
                  <h4 className="text-lg font-bold text-white mb-2">{rec.title}</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{rec.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* 4. HISTORY LOGS */}
          {activeTab === 'history' && (
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-[#9333EA]" /> {t(language, 'soilPastTests')}
                </h3>
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder={t(language, 'soilSearchByDate')} 
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full h-10 pl-10 pr-4 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/20 border-b border-white/10 text-[10px] uppercase tracking-wider text-gray-400">
                      <th className="p-4">{t(language, 'soilDateLogged')}</th>
                      <th className="p-4">{t(language, 'soilPHLevel')}</th>
                      <th className="p-4">{t(language, 'soilMoisture')}</th>
                      <th className="p-4">{t(language, 'soilNPKMgKg')}</th>
                      <th className="p-4">{t(language, 'soilCarbonPercent')}</th>
                      <th className="p-4">{t(language, 'soilMicroclimate')}</th>
                      <th className="p-4 text-right">{t(language, 'soilAction')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paginatedHistory.map((h, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-sm text-white font-medium flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#9333EA]" />
                          {new Date(h.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-sm text-white">{h.pH}</td>
                        <td className="p-4 text-sm text-gray-300">{h.moisture}%</td>
                        <td className="p-4 text-xs font-mono text-gray-400">
                          <span className="text-green-400">{h.nitrogen || 0}</span> - <span className="text-yellow-400">{h.phosphorus || 0}</span> - <span className="text-purple-400">{h.potassium || 0}</span>
                        </td>
                        <td className="p-4 text-sm text-gray-300">{h.organicCarbon || 0}%</td>
                        <td className="p-4 text-xs text-gray-400">
                          {t(language, 'soilTempHumid').replace('{temp}', (h.temperature || 0).toString()).replace('{humid}', (h.humidity || 0).toString())}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecordId(h.id || h._id);
                              setActiveTab('overview');
                            }}
                            className="px-3 py-1 bg-[#9333EA]/20 text-[#D946EF] hover:bg-[#9333EA]/35 border border-[#9333EA]/30 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            {t(language, 'soilViewReport')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. LOG SOIL TEST FORM TAB */}
          {activeTab === 'new-test' && (
            <div className="max-w-3xl mx-auto bg-[#121024]/90 border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#9333EA]/10 blur-[80px] rounded-full pointer-events-none" />
              
              <h3 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-3 flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-400" /> {t(language, 'soilLogNewTest')}
              </h3>

              <form onSubmit={handleFormSubmit} className="space-y-6 relative z-10">
                {history.length === 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-3 text-yellow-300">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold">{t(language, 'soilNoTestDataYet')}</h4>
                      <p className="text-xs text-yellow-400/80 leading-relaxed mt-1">{t(language, 'soilNoTestDataDesc')}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* pH */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#E9D5FF] uppercase tracking-wider">{t(language, 'soilPHFormLabel')}</label>
                    <input 
                      type="number" step="any" required min="0" max="14" value={pH} onChange={e => setPh(e.target.value)}
                      className="w-full h-11 px-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                    />
                  </div>

                  {/* Moisture */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#E9D5FF] uppercase tracking-wider">{t(language, 'soilMoistureFormLabel')}</label>
                    <input 
                      type="number" step="any" required min="0" max="100" value={moisture} onChange={e => setMoisture(e.target.value)}
                      className="w-full h-11 px-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                    />
                  </div>

                  {/* Nitrogen */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#E9D5FF] uppercase tracking-wider">{t(language, 'soilNitrogenFormLabel')}</label>
                    <input 
                      type="number" required min="0" value={nitrogen} onChange={e => setNitrogen(e.target.value)}
                      className="w-full h-11 px-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                    />
                  </div>

                  {/* Phosphorus */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#E9D5FF] uppercase tracking-wider">{t(language, 'soilPhosphorusFormLabel')}</label>
                    <input 
                      type="number" required min="0" value={phosphorus} onChange={e => setPhosphorus(e.target.value)}
                      className="w-full h-11 px-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                    />
                  </div>

                  {/* Potassium */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#E9D5FF] uppercase tracking-wider">{t(language, 'soilPotassiumFormLabel')}</label>
                    <input 
                      type="number" required min="0" value={potassium} onChange={e => setPotassium(e.target.value)}
                      className="w-full h-11 px-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                    />
                  </div>

                  {/* Organic Carbon */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#E9D5FF] uppercase tracking-wider">{t(language, 'soilOrgCarbonFormLabel')}</label>
                    <input 
                      type="number" step="any" required min="0" max="100" value={organicCarbon} onChange={e => setOrganicCarbon(e.target.value)}
                      className="w-full h-11 px-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                    />
                  </div>

                  {/* Temperature */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#E9D5FF] uppercase tracking-wider">{t(language, 'soilTempFormLabel')}</label>
                    <input 
                      type="number" step="any" required value={temperature} onChange={e => setTemperature(e.target.value)}
                      className="w-full h-11 px-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                    />
                  </div>

                  {/* Humidity */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#E9D5FF] uppercase tracking-wider">{t(language, 'soilAmbientHumidityFormLabel')}</label>
                    <input 
                      type="number" step="any" required min="0" max="100" value={humidity} onChange={e => setHumidity(e.target.value)}
                      className="w-full h-11 px-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-8 py-3 bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white font-bold rounded-xl flex items-center gap-2 hover:shadow-lg disabled:opacity-50 active:scale-95 transition-all cursor-pointer focus:outline-none"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t(language, 'soilSubmitTest')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border bg-black/85 backdrop-blur-xl border-white/10 text-white">
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <AlertCircle className="h-5 w-5 text-red-400" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
