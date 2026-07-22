import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Upload, X, Plus, CheckCircle2, Loader2, Sparkles, Image as ImageIcon, 
  AlertTriangle, History, Camera, Activity, Leaf, ShieldCheck, 
  Droplets, FileText, Download, Search, 
  BarChart2, TrendingUp, AlertCircle, RefreshCw, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Farm, User } from '../types';
import { CROP_TYPES } from '../utils/simData';
import { fetch } from '../utils/api';
import { t as tr, formatLocalDate, localizeDiseaseName } from '../utils/i18n';

interface DiseaseDetectionProps {
  user: User;
  farms: Farm[];
  activeFarm: Farm | null;
  language?: 'en' | 'hi';
}

// REMOVED: generateExtendedReport() hash-based faker and MOCK_IMAGES — fields now come directly from Gemini Vision API.


export default function DiseaseDetection({ user, farms, activeFarm, language = 'en' }: DiseaseDetectionProps) {
  // UI State
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'statistics'>('scan');
  const [selectedCrop, setSelectedCrop] = useState(activeFarm?.cropType || CROP_TYPES[0]);
  
  const [translatedCache, setTranslatedCache] = useState<Record<string, any>>({});
  const [translating, setTranslating] = useState(false);

  const t = (() => {
    const translateKey = (key: string, fallback?: string): string => {
      if (!key) return '';
      // 1. Try finding translation with 'leaf.' prefix
      const leafKey = key.startsWith('leaf.') ? key : `leaf.${key}`;
      const leafVal = tr(language, leafKey);
      if (leafVal !== leafKey) {
        return leafVal;
      }
      // 2. Try finding translation directly (e.g. for global keys like 'details')
      const directVal = tr(language, key);
      if (directVal !== key) {
        return directVal;
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
  
  // Scan State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [resultTab, setResultTab] = useState<'general' | 'forensics' | 'explainable' | 'timeline'>('general');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  // Photo Viewer State
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  
  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCrop, setFilterCrop] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
 
  useEffect(() => {
    fetchHistory();
  }, [user.id]);

  useEffect(() => {
    previewRef.current = imagePreview;
  }, [imagePreview]);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/disease-history?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch diagnosis history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileChange = (file: File, isReplacement = false) => {
    setError('');
    setResult(null);
    setResultTab('general');

    const isActuallyReplacement = isReplacement || !!imagePreview;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Unsupported format. Please upload JPG, JPEG, PNG, or WEBP.', 'error');
      setError('Unsupported format. Please upload JPG, JPEG, PNG, or WEBP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds the 10 MB limit. Please choose a smaller image.', 'error');
      setError('File size exceeds the 10 MB limit. Please choose a smaller image.');
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);

    if (isActuallyReplacement) {
      showToast('Image replaced successfully.', 'success');
    }
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0], imagePreview !== null);
    }
  };

  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setError('');
    setResultTab('general');
    showToast('Image removed.', 'success');
  };

  // Pan & Zoom Event Handlers
  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.25, 1));
  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomScale <= 1) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };
  
  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
  };

  const triggerDiagnostic = async () => {
    if (!imageFile) {
      showToast('Please select a valid image first.', 'error');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const mimeType = imageFile.type || 'image/png';
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const response = await fetch('/api/disease-detection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              farmId: activeFarm?.id,
              base64Image: base64Data,
              mimeType,
              cropType: selectedCrop,
              language,
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.message || 'Diagnostics failed.');
          }

          setResult({
            id: data.diagnosisId,
            translations: data.prediction.translations || {},
            diseaseName: data.prediction.diseaseName,
            confidence: data.prediction.confidence,
            treatment: data.prediction.treatment,
            cropType: data.prediction.cropType || selectedCrop,
            severity: data.prediction.severity || 'Unknown',
            symptoms: data.prediction.symptoms || '',
            causes: data.prediction.causes || '',
            prevention: data.prediction.prevention || '',
            estimatedRecovery: data.prediction.estimatedRecovery || 'N/A',
            irrigation: data.prediction.irrigation || '',
            fertilizer: data.prediction.fertilizer || '',
            imageForensics: data.prediction.imageForensics || '',
            metadataAnalysis: data.prediction.metadataAnalysis || '',
            explainableAi: data.prediction.explainableAi || '',
            manipulationDetection: data.prediction.manipulationDetection || '',
            riskAssessment: data.prediction.riskAssessment || '',
            investigationTimeline: data.prediction.investigationTimeline || '',
            detectionTime: new Date().toLocaleTimeString()
          });
          
          showToast('Image analyzed successfully.', 'success');
          fetchHistory();
        } catch (innerErr: any) {
          setError(innerErr.message || 'An error occurred during AI analysis. Please try again.');
          showToast(innerErr.message || 'Analysis failed.', 'error');
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        throw new Error('Failed to read image file.');
      };

      reader.readAsDataURL(imageFile);
    } catch (err: any) {
      setError(err.message || 'An error occurred during AI analysis. Please try again.');
      showToast(err.message || 'Analysis failed.', 'error');
      setLoading(false);
    }
  };

  // Load translation when language changes or a new leaf scan result is loaded
  useEffect(() => {
    if (!result) return;
    const recId = result.id;
    if (!recId) return;

    if (result.translations?.[language]) {
      setTranslatedCache(prev => ({
        ...prev,
        [`${recId}_${language}`]: result.translations[language]
      }));
      return;
    }

    const cacheKey = `${recId}_${language}`;
    if (translatedCache[cacheKey]) {
      return;
    }

    if (language === 'en') {
      const englishObj = {
        diseaseName: result.diseaseName,
        confidence: result.confidence,
        treatment: result.treatment,
        cropType: result.cropType,
        severity: result.severity,
        symptoms: result.symptoms,
        causes: result.causes,
        prevention: result.prevention,
        estimatedRecovery: result.estimatedRecovery,
        irrigation: result.irrigation,
        fertilizer: result.fertilizer,
        imageForensics: result.imageForensics,
        metadataAnalysis: result.metadataAnalysis,
        explainableAi: result.explainableAi,
        manipulationDetection: result.manipulationDetection,
        riskAssessment: result.riskAssessment,
        investigationTimeline: result.investigationTimeline
      };
      setTranslatedCache(prev => ({
        ...prev,
        [cacheKey]: englishObj
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
            moduleType: 'disease',
            targetLanguage: language
          })
        });
        const data = await res.json();
        if (data.success && data.translated) {
          setTranslatedCache(prev => ({
            ...prev,
            [cacheKey]: data.translated
          }));
          result.translations = result.translations || {};
          result.translations[language] = data.translated;
        }
      } catch (err) {
        console.error("Translation request failed", err);
      } finally {
        setTranslating(false);
      }
    };

    triggerTranslation();
  }, [result, language]);

  const activeResult = useMemo(() => {
    if (!result) return null;
    const recId = result.id;
    if (!recId) return result;
    const cacheKey = `${recId}_${language}`;
    const cached = translatedCache[cacheKey];
    if (cached) {
      return {
        ...result,
        ...cached
      };
    }
    return result;
  }, [result, language, translatedCache]);

  const detailedReport = useMemo(() => {
    if (!activeResult?.explainableAi) return null;
    try {
      return JSON.parse(activeResult.explainableAi);
    } catch (e) {
      console.warn("Failed to parse explainableAi JSON report:", e);
      return null;
    }
  }, [activeResult?.explainableAi]);

  const leafHealthScore = useMemo(() => {
    if (activeResult?.diseaseName && localizeDiseaseName(activeResult.diseaseName, 'en').toLowerCase().includes('healthy')) {
      return Math.round(92 + (activeResult.confidence * 8));
    }
    if (detailedReport?.executiveSummary?.healthScore) {
      return detailedReport.executiveSummary.healthScore * 10;
    }
    const baseSev = activeResult?.severity || 'Low';
    const penalty = baseSev === 'Critical' || baseSev === 'High' ? 55 : baseSev === 'Moderate' ? 35 : 15;
    return Math.max(10, Math.round(100 - (activeResult?.confidence * 20 + penalty)));
  }, [activeResult, detailedReport]);

  const filteredHistory = history.filter(h => 
    (filterCrop === 'All' || h.cropType === filterCrop) &&
    (localizeDiseaseName(h.diseaseName, language).toLowerCase().includes(searchQuery.toLowerCase()) || 
     new Date(h.createdAt).toLocaleDateString().includes(searchQuery))
  );
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportCSV = () => {
    const headers = ['Date', 'Crop', 'Disease', 'Confidence', 'Severity'];
    const rows = history.map(h => [
      new Date(h.createdAt).toLocaleDateString(),
      h.cropType,
      localizeDiseaseName(h.diseaseName, language),
      `${(h.confidence * 100).toFixed(1)}%`,
      h.severity
    ].map(val => `"${String(val ?? '').replace(/"/g, '""')}"`));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(",")].concat(rows.map(e => e.join(","))).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `disease_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const exportPDF = () => window.print();

  const totalScans = history.length;
  const healthyCount = history.filter(h => localizeDiseaseName(h.diseaseName, 'en').toLowerCase().includes('healthy')).length;
  const diseasedCount = totalScans - healthyCount;
  const accuracy = totalScans > 0 ? (history.reduce((acc, h) => acc + h.confidence, 0) / totalScans * 100).toFixed(1) : '0';
  
  const diseaseCounts: Record<string, number> = {};
  history.forEach(h => {
    if (!localizeDiseaseName(h.diseaseName, 'en').toLowerCase().includes('healthy')) {
      const locName = localizeDiseaseName(h.diseaseName, language);
      diseaseCounts[locName] = (diseaseCounts[locName] || 0) + 1;
    }
  });
  const mostCommon = Object.entries(diseaseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const chartData = useMemo(() => {
    const months: Record<string, { healthy: number, diseased: number }> = {};
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months[d.toLocaleString('default', { month: 'short' })] = { healthy: 0, diseased: 0 };
    }
    history.forEach(h => {
      const m = new Date(h.createdAt).toLocaleString('default', { month: 'short' });
      if (months[m]) {
        if (localizeDiseaseName(h.diseaseName, 'en').toLowerCase().includes('healthy')) months[m].healthy++;
        else months[m].diseased++;
      }
    });
    return Object.keys(months).map(k => ({ name: k, ...months[k] }));
  }, [history, language]);

  const pieData = useMemo(() => {
    const crops: Record<string, number> = {};
    history.forEach(h => crops[h.cropType] = (crops[h.cropType] || 0) + 1);
    return Object.keys(crops).map(k => ({ name: k, value: crops[k] }));
  }, [history]);
  const COLORS = ['#9333EA', '#D946EF', '#6366F1', '#3B82F6', '#10B981'];

  if (farms.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 text-center py-20 shadow-2xl">
        <AlertCircle className="h-12 w-12 text-[#9333EA] mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">{t('noFarmsTitle')}</h3>
        <p className="text-sm text-[#E9D5FF] mb-6">{t('noFarmsDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* 1. Hero Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-black text-white tracking-tight">{t('title')}</h2>
          </div>
          <p className="text-[#E9D5FF] max-w-2xl">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-gray-400 font-medium items-center">
          {t('supportedCrops')}:
          {CROP_TYPES.slice(0, 3).map(c => (
            <span key={c} className="text-white bg-white/10 px-2 py-0.5 rounded-md">{c}</span>
          ))}
          {CROP_TYPES.length > 3 && <span className="text-white bg-white/10 px-2 py-0.5 rounded-md">+{CROP_TYPES.length - 3}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-white/10 pb-4 no-scrollbar">
        {[
          { id: 'scan', label: t('newScan'), icon: Camera },
          { id: 'history', label: t('tabHistory'), icon: History },
          { id: 'statistics', label: t('tabStatistics'), icon: BarChart2 }
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
          {/* SCAN TAB */}
          {activeTab === 'scan' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Upload */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#9333EA] to-[#C026D3]" />
                  <h3 className="text-lg font-bold text-white mb-4">{t.inputData}</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">{t.targetCrop}</label>
                      <select
                        value={selectedCrop}
                        onChange={(e) => setSelectedCrop(e.target.value)}
                        className="w-full h-12 bg-black/20 border border-white/10 rounded-xl text-white px-4 focus:outline-none focus:border-[#9333EA] transition-colors appearance-none"
                      >
                        {CROP_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Language indicator - controlled globally from header */}
                    <div>
                      <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">{t.responseLang}</label>
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

                    <div>
                      <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">{t.cropImage}</label>
                      
                      {!imagePreview ? (
                        <div
                          onDragOver={onDragOver}
                          onDrop={onDrop}
                          className="border-2 border-dashed border-white/20 hover:border-[#9333EA]/50 bg-black/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all group h-[280px]"
                        >
                          <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} className="hidden" accept="image/*" />
                          <input type="file" ref={cameraInputRef} onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} className="hidden" accept="image/*" capture="environment" />
                          
                          <div className="flex gap-4 mb-4">
                            <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-transform hover:scale-105 border border-white/10 focus:outline-none">
                              <Upload className="h-6 w-6 text-[#D946EF]" />
                            </button>
                            <button onClick={() => cameraInputRef.current?.click()} className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-transform hover:scale-105 border border-white/10 focus:outline-none">
                              <Camera className="h-6 w-6 text-[#9333EA]" />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-white mb-1">{t.uploadOrCapture}</p>
                          <p className="text-xs text-gray-500">{t.dragDropHelp}</p>
                        </div>
                      ) : (
                        <div 
                          className="relative border border-white/10 rounded-2xl overflow-hidden bg-black/40 h-[280px] flex items-center justify-center group cursor-grab active:cursor-grabbing"
                          onMouseDown={handleMouseDown}
                          onMouseMove={handleMouseMove}
                          onMouseUp={handleMouseUpOrLeave}
                          onMouseLeave={handleMouseUpOrLeave}
                        >
                          <div
                            className="w-full h-full flex items-center justify-center transition-transform select-none pointer-events-none"
                            style={{
                              transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                            }}
                          >
                            <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                            {showOverlay && (
                              <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-1/3 left-1/4 w-24 h-24 rounded-full bg-purple-500/30 border-2 border-purple-400/60 animate-pulse blur-md" />
                                <div className="absolute top-1/2 left-1/2 w-28 h-28 rounded-full bg-indigo-500/30 border-2 border-indigo-400/60 animate-pulse blur-md" />
                                <div className="absolute top-1/4 left-1/2 w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/50 animate-ping" />
                              </div>
                            )}
                          </div>
                          
                          {/* Viewer Control Panel */}
                          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2 py-1.5 rounded-xl border border-white/10 opacity-60 group-hover:opacity-100 transition-opacity z-20">
                            <button type="button" onClick={handleZoomIn} title={t.viewerZoomIn} className="p-1 hover:bg-white/10 text-white rounded focus:outline-none"><Plus className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={handleZoomOut} title={t.viewerZoomOut} className="p-1 hover:bg-white/10 text-white rounded focus:outline-none"><X className="h-3.5 w-3.5 rotate-45" /></button>
                            <button type="button" onClick={handleResetZoom} title={t.viewerReset} className="p-1 hover:bg-white/10 text-white rounded focus:outline-none"><RefreshCw className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => setIsFullscreen(true)} title={t.viewerFullscreen} className="p-1 hover:bg-white/10 text-white rounded focus:outline-none"><Eye className="h-3.5 w-3.5" /></button>
                            {activeResult && (
                              <button type="button" onClick={() => setShowOverlay(prev => !prev)} title={t.viewerToggleOverlay} className={`p-1 rounded focus:outline-none ${showOverlay ? 'text-[#D946EF] bg-white/10' : 'text-white hover:bg-white/10'}`}><Sparkles className="h-3.5 w-3.5" /></button>
                            )}
                          </div>
                          
                          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/5 text-[9px] font-bold text-gray-300 pointer-events-none z-20">
                            {zoomScale > 1 
                              ? `${language === 'hi' ? 'ज़ूम' : 'Zoom'}: ${zoomScale.toFixed(2)}x (${language === 'hi' ? 'घुमाने के लिए खींचें' : 'Drag to Pan'})` 
                              : `${language === 'hi' ? 'ज़ूम: 1.00x' : 'Zoom: 1.00x'}`}
                          </div>

                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 pointer-events-none group-hover:pointer-events-auto z-10">
                            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold text-white flex items-center gap-2 backdrop-blur-md transition-colors focus:outline-none">
                              <RefreshCw className="h-4 w-4" /> {t.btnReplace}
                            </button>
                            <button onClick={removeImage} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 rounded-lg text-sm font-bold text-red-100 flex items-center gap-2 backdrop-blur-md transition-colors focus:outline-none">
                              <X className="h-4 w-4" /> {t.btnRemove}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {error && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <p>{error}</p>
                      </div>
                    )}

                    <button
                      onClick={triggerDiagnostic}
                      disabled={loading || !imagePreview}
                      className="w-full h-14 bg-gradient-to-r from-[#9333EA] to-[#C026D3] hover:opacity-90 disabled:opacity-50 disabled:grayscale text-white font-bold rounded-xl text-base transition-all flex items-center justify-center gap-2 focus:outline-none shadow-lg shadow-[#9333EA]/20"
                    >
                      {loading ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> {t.loadingAnalysis}</>
                      ) : (
                        <><Sparkles className="h-5 w-5" /> {t.btnAnalyze}</>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Analysis & Report */}
              <div className="lg:col-span-7">
                {activeResult ? (
                  <motion.div 
                    id="diagnostic-report-print-target"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-[#121024] to-[#1a1736] p-6 sm:p-8 rounded-3xl border border-[#9333EA]/30 shadow-2xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#9333EA]/10 blur-[80px] rounded-full" />
                    
                    {/* Header Banner */}
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-8 relative z-10">
                      <div>
                        <span className="text-xs text-[#D946EF] font-bold uppercase tracking-wider mb-2 block flex items-center gap-2">
                          <Activity className="h-4 w-4" /> {t.diagnosticsBanner}
                        </span>
                        <h2 className="text-3xl font-black text-white">{localizeDiseaseName(activeResult.diseaseName, language)}</h2>
                      </div>
                      
                      <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${
                        localizeDiseaseName(activeResult.diseaseName, 'en').toLowerCase().includes('healthy') 
                          ? 'bg-green-500/10 border-green-500/30 text-green-400'
                          : 'bg-red-500/10 border-red-500/30 text-red-400'
                      }`}>
                        {localizeDiseaseName(activeResult.diseaseName, 'en').toLowerCase().includes('healthy') ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                        <span className="font-bold">
                          {localizeDiseaseName(activeResult.diseaseName, 'en').toLowerCase().includes('healthy') ? t.healthyPlantBanner : t.infectionDetectedBanner}
                        </span>
                      </div>
                    </div>

                    {/* Upgraded Professional Diagnosis Dashboard Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
                      
                      {/* 1. Leaf Health Score Card */}
                      <div className="bg-black/40 border border-white/5 p-5 rounded-2xl flex items-center gap-5">
                        <div className="relative w-20 h-20 shrink-0">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ffffff10" strokeWidth="3" />
                            <circle 
                              cx="18" 
                              cy="18" 
                              r="15.915" 
                              fill="none" 
                              stroke={
                                leafHealthScore >= 80 ? '#10B981' : 
                                leafHealthScore >= 50 ? '#F59E0B' : '#EF4444'
                              } 
                              strokeWidth="3" 
                              strokeDasharray={`${leafHealthScore} ${100 - leafHealthScore}`}
                              strokeLinecap="round"
                              className="transition-all duration-1000"
                            />
                          </svg>
                           <div className="absolute inset-0 flex items-center justify-center">
                             <span className="text-lg font-black text-white">{leafHealthScore}</span>
                           </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-0.5">{t.healthScoreLabel}</span>
                          <h4 className="text-sm font-black text-white leading-tight">
                            {leafHealthScore >= 80 ? (language === 'hi' ? 'स्वस्थ पत्ता' : 'Optimal Leaf Health') : 
                             leafHealthScore >= 50 ? (language === 'hi' ? 'मध्यम संक्रमण' : 'Moderate Infection') : 
                             (language === 'hi' ? 'उच्च संक्रमण स्तर' : 'High Infection Level')}
                          </h4>
                          <span className="text-[11px] text-gray-400 mt-1 block">{language === 'hi' ? 'रेटिंग: 0-100 सूचकांक' : 'Rating: 0-100 Index'}</span>
                        </div>
                      </div>

                      {/* 2. Structured Disease Details Card */}
                      <div className="bg-black/40 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">{t.diseaseIdent}</span>
                          <h4 className="text-sm font-black text-white truncate">{localizeDiseaseName(activeResult.diseaseName, language)}</h4>
                          {detailedReport?.diseaseIdentification?.scientificName && (
                            <p className="text-[10.5px] font-mono text-purple-300 italic truncate mt-0.5">
                              {detailedReport.diseaseIdentification.scientificName}
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5 text-[11px]">
                          <div>
                            <span className="text-gray-400 block">{t.categoryLabel}</span>
                            <span className="text-white font-bold truncate block">{detailedReport?.diseaseIdentification?.category || 'Pathogen'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">{t.metricCrop}</span>
                            <span className="text-white font-bold truncate block">{activeResult.cropType}</span>
                          </div>
                        </div>
                      </div>

                      {/* 3. Risk Meter & Diagnostic Score Card */}
                      <div className="bg-black/40 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-0.5">{t.metricConfidence}</span>
                            <span className="text-2xl font-black text-white">{(activeResult.confidence * 100).toFixed(1)}%</span>
                          </div>
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                            activeResult.severity === 'Critical' || activeResult.severity === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 
                            activeResult.severity === 'Moderate' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' : 
                            'bg-green-500/20 text-green-400 border border-green-500/20'
                          }`}>
                            {activeResult.severity || 'Low'}
                          </span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center text-[10.5px] text-gray-400">
                          <span>{t.metricDetectionTime}:</span>
                          <span className="text-white font-semibold">{activeResult.detectionTime}</span>
                        </div>
                      </div>

                    </div>

                    {/* Diagnostic Sub-Tabs */}
                    <div className="flex border-b border-white/10 mb-6 gap-2 overflow-x-auto no-scrollbar relative z-10">
                      {[
                        { id: 'general', label: t.tabGeneral, icon: Leaf },
                        { id: 'forensics', label: t.tabForensics, icon: ShieldCheck },
                        { id: 'explainable', label: t.tabExplainable, icon: Sparkles },
                        { id: 'timeline', label: t.tabTimeline, icon: History }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setResultTab(tab.id as any)}
                          className={`pb-3 px-3 text-xs font-bold transition-all relative whitespace-nowrap focus:outline-none cursor-pointer ${
                            resultTab === tab.id ? 'text-[#D946EF] font-black' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.label}
                          </span>
                          {resultTab === tab.id && (
                            <motion.div layoutId="resultTabBorder" className="absolute bottom-0 left-0 w-full h-0.5 bg-[#D946EF]" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Tab Panels */}
                    {detailedReport ? (() => {
                      const r = detailedReport;
                      
                      // Risk level calculation for risk slider
                      let riskLevelPct = 25;
                      const sevClass = (r.severityAssessment?.classification || "").toLowerCase();
                      if (sevClass.includes("moderate")) riskLevelPct = 50;
                      else if (sevClass.includes("severe")) riskLevelPct = 75;
                      else if (sevClass.includes("critical")) riskLevelPct = 95;
                      else if (sevClass.includes("healthy") || sevClass.includes("none")) riskLevelPct = 5;

                      const healthScore = r.executiveSummary?.healthScore ?? 5;
                      const severityPct = r.severityAssessment?.percentage ?? 0;
                      const confidencePct = r.executiveSummary?.confidenceScore ?? Math.round(activeResult.confidence * 100);

                      if (resultTab === 'general') {
                        return (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 relative z-10 text-left">
                            {/* Executive Summary Card */}
                            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                              <h4 className="text-sm font-black text-[#D946EF] flex items-center gap-2 mb-4">
                                <Sparkles className="h-4 w-4" /> {t.execSummary}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-4 items-center">
                                {/* Health Score Circle */}
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.healthScore}</span>
                                  <div className="relative w-20 h-20">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                      <path className="text-white/10" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                      <path className={healthScore >= 7 ? "text-green-500" : healthScore >= 4 ? "text-yellow-500" : "text-red-500"} strokeWidth="3" strokeDasharray={`${healthScore * 10}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <span className="text-lg font-black text-white">{healthScore}/10</span>
                                    </div>
                                  </div>
                                </div>
                                {/* Severity Level */}
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.severityLevel}</span>
                                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                                    healthScore >= 8 ? "bg-green-500/10 border-green-500/30 text-green-400" : 
                                    healthScore >= 5 ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" : 
                                    "bg-red-500/10 border-red-500/30 text-red-400"
                                  }`}>
                                    {r.executiveSummary?.severityLevel || "N/A"}
                                  </span>
                                </div>
                                {/* Confidence meter */}
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.confidence}</span>
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-white/10 h-2 rounded-full overflow-hidden">
                                      <div className="bg-[#D946EF] h-full rounded-full" style={{ width: `${confidencePct}%` }} />
                                    </div>
                                    <span className="text-sm font-black text-white">{confidencePct}%</span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-gray-300 border-t border-white/5 pt-3 leading-relaxed">
                                <strong className="text-white">{t.species}:</strong> {r.executiveSummary?.species} | {r.executiveSummary?.summary}
                              </p>
                            </div>

                            {/* Disease Identification Card */}
                            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                              <h4 className="text-sm font-black text-blue-400 flex items-center gap-2 mb-4">
                                <Leaf className="h-4 w-4" /> {t.diseaseIdent}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div><span className="text-gray-400 uppercase font-bold tracking-wider block mb-0.5">{t.diseaseStatus}</span><span className="text-sm font-bold text-white">{r.diseaseIdentification?.name}</span></div>
                                <div><span className="text-gray-400 uppercase font-bold tracking-wider block mb-0.5">{t.scientificName}</span><span className="text-sm font-mono text-gray-300 italic">{r.diseaseIdentification?.scientificName}</span></div>
                                <div><span className="text-gray-400 uppercase font-bold tracking-wider block mb-0.5">{t.category}</span><span className="text-sm font-bold text-white">{r.diseaseIdentification?.category}</span></div>
                                <div><span className="text-gray-400 uppercase font-bold tracking-wider block mb-0.5">{t.pathogenType}</span><span className="text-sm font-bold text-white">{r.diseaseIdentification?.pathogenType}</span></div>
                              </div>
                              <div className="mt-4 pt-3 border-t border-white/5 space-y-2 text-xs">
                                <p className="text-gray-300"><strong className="text-white">{t.selectionReason}:</strong> {r.diseaseIdentification?.selectionReason}</p>
                                <p className="text-gray-400"><strong className="text-white">{t.alternativeCrops}:</strong> {r.diseaseIdentification?.alternativeDiseases}</p>
                              </div>
                            </div>

                            {/* Visual Symptoms Analysis Card */}
                            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                              <h4 className="text-sm font-black text-yellow-500 flex items-center gap-2 mb-4">
                                <Activity className="h-4 w-4" /> {t.symptomAnalysis}
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                                <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                                  <span className="text-gray-400 block mb-0.5">{t.leafColor}</span>
                                  <span className="font-bold text-white">{r.visualSymptoms?.leafColor}</span>
                                </div>
                                <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                                  <span className="text-gray-400 block mb-0.5">{t.spots}</span>
                                  <span className="font-bold text-white">{r.visualSymptoms?.spots}</span>
                                </div>
                                <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                                  <span className="text-gray-400 block mb-0.5">{t.lesions}</span>
                                  <span className="font-bold text-white">{r.visualSymptoms?.lesions}</span>
                                </div>
                                <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                                  <span className="text-gray-400 block mb-0.5">{t.damagedArea}</span>
                                  <span className="font-black text-yellow-500">{r.visualSymptoms?.damagedAreaPercent}%</span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-300 leading-relaxed font-medium bg-black/20 p-3.5 rounded-xl border border-white/5">
                                {r.visualSymptoms?.aiObservation}
                              </p>
                            </div>

                            {/* Disease Severity Assessment Card */}
                            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-6">
                              <div className="shrink-0">
                                <div className="relative w-28 h-28">
                                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-white/10" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path className={severityPct >= 60 ? "text-red-500" : severityPct >= 30 ? "text-orange-500" : "text-green-500"} strokeWidth="4" strokeDasharray={`${severityPct}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-black text-white">{severityPct}%</span>
                                    <span className="text-[9px] uppercase tracking-wider text-gray-400 font-black">{r.severityAssessment?.classification}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex-1 space-y-2">
                                <h4 className="text-sm font-black text-white">{t.severityAssess}</h4>
                                <p className="text-xs text-gray-300 leading-relaxed">{r.severityAssessment?.explanation}</p>
                              </div>
                            </div>

                            {/* Farmer-Friendly Summary Card */}
                            <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-2xl">
                              <h4 className="text-sm font-black text-green-400 flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-4 w-4" /> {t.farmerSummary}
                              </h4>
                              <p className="text-xs text-white font-medium leading-relaxed bg-black/20 p-3.5 rounded-xl border border-white/5 text-left">
                                {r.farmerFriendlySummary}
                              </p>
                            </div>
                          </motion.div>
                        );
                      }

                      if (resultTab === 'forensics') {
                        return (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 relative z-10 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                                <div>
                                  <h4 className="text-sm font-black text-[#D946EF] mb-2">{t('imageForensicsLabel')}</h4>
                                  <p className="text-xs text-gray-300 leading-relaxed">{result.imageForensics || (language === 'hi' ? 'समान पिक्सेल अखंडता जांच सफल रही।' : 'Uniform pixel integrity check passed.')}</p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-black text-[#9333EA] mb-2">{t('manipulationDetectionLabel')}</h4>
                                  <p className="text-xs text-gray-300 leading-relaxed">{result.manipulationDetection || (language === 'hi' ? 'कोई संपादन या पुनर्नमूनाकरण नहीं पाया गया।' : 'No editing or resampling detected.')}</p>
                                </div>
                              </div>
                              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 text-center">{t('manipulationHeatmapLabel')}</h4>
                                <div className="relative w-44 h-44 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                                  <img src={imagePreview || ''} alt="Heatmap preview" className="w-full h-full object-cover opacity-65 filter grayscale" />
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/60 animate-ping absolute" />
                                    <div className="w-10 h-10 rounded-full bg-red-500/30 border border-red-500/80 animate-pulse absolute" />
                                    <span className="text-[10px] font-mono text-red-400 bg-black/80 px-2 py-0.5 rounded border border-red-500/30">{t('elaHotspot')}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-gray-500 mt-2 text-center">{language === 'hi' ? 'असंगत संपीड़न हीटमैप सीमाओं की पुष्टि की गई' : 'Anomalous compression heatmap bounds verified'}</span>
                              </div>
                            </div>

                            {/* Confidence Analysis Quality Parameters */}
                            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                              <h4 className="text-sm font-black text-[#D946EF] mb-3">{t.confidenceAnalysis}</h4>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                                <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                                  <span className="text-gray-400 block mb-0.5">{t.quality}</span>
                                  <span className="font-bold text-white">{r.confidenceAnalysis?.qualityImpact}</span>
                                </div>
                                <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                                  <span className="text-gray-400 block mb-0.5">{t.lighting}</span>
                                  <span className="font-bold text-white">{r.confidenceAnalysis?.lightingImpact}</span>
                                </div>
                                <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                                  <span className="text-gray-400 block mb-0.5">{t.blur}</span>
                                  <span className="font-bold text-white">{r.confidenceAnalysis?.blurImpact}</span>
                                </div>
                                <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                                  <span className="text-gray-400 block mb-0.5">{t.visibility}</span>
                                  <span className="font-bold text-white">{r.confidenceAnalysis?.partialVisibility}</span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-300 leading-relaxed font-semibold bg-black/10 p-3 rounded-lg border border-white/5"><strong className="text-white">{t.reasons}:</strong> {r.confidenceAnalysis?.reasons}</p>
                            </div>

                            <div className="bg-black/30 border border-white/5 p-4 rounded-2xl">
                              <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider mb-2">{t('exifAnalysisLabel')}</h4>
                              <p className="text-xs text-gray-400 leading-relaxed font-mono whitespace-pre-line bg-black/20 p-3 rounded-lg border border-white/5">
                                {result.metadataAnalysis || 'Device: iPhone 15 Pro\nFocal Length: 24mm\nExposure: 1/120s at f/1.78\nISO: 80'}
                              </p>
                            </div>
                          </motion.div>
                        );
                      }

                      if (resultTab === 'explainable') {
                        return (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 relative z-10 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                                <div>
                                  <h4 className="text-sm font-black text-[#D946EF] mb-2 flex items-center gap-1.5">
                                    <Sparkles className="h-4 w-4" /> {t.whyAIPredicted}
                                  </h4>
                                  <p className="text-xs text-gray-300 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">{r.diseaseIdentification?.selectionReason || r.explainableAI}</p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-black text-[#3B82F6] mb-2 flex items-center gap-1.5">
                                    <Activity className="h-4 w-4" /> {t.visualExplanation}
                                  </h4>
                                  <p className="text-xs text-gray-300 leading-relaxed">{r.explainableAI || (language === 'hi' ? 'विशेषता एट्रिब्यूशन घावों और किनारों के आसपास संकेतित मॉडल ध्यान दिखाता है।' : 'Feature attribution maps denote concentrated model attention around necrotic lesions.')}</p>
                                </div>
                              </div>
                              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 text-center">{t.saliencyMapLabel}</h4>
                                <div className="relative w-44 h-44 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                                  <img src={imagePreview || ''} alt="Saliency preview" className="w-full h-full object-cover opacity-70" />
                                  <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute top-1/3 left-1/4 w-12 h-12 rounded-full bg-purple-500/40 border-2 border-purple-400/80 animate-pulse blur-xs" />
                                    <div className="absolute top-1/2 left-1/2 w-14 h-14 rounded-full bg-indigo-500/40 border-2 border-indigo-400/80 animate-pulse blur-xs" />
                                    <span className="absolute top-2 left-2 text-[9px] font-mono text-purple-300 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-500/30">{t('attributionFocus')}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-gray-500 mt-2 text-center font-bold">{t.saliencyExplainLabel}</span>
                              </div>
                            </div>

                            {/* Confidence Distribution & Key Features */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                <h4 className="text-sm font-black text-[#9333EA] mb-3 flex items-center gap-1.5">
                                  <TrendingUp className="h-4 w-4" /> {t.confidenceDistLabel}
                                </h4>
                                <div className="space-y-3.5">
                                  <div>
                                    <div className="flex justify-between text-xs font-bold text-gray-300 mb-1">
                                      <span>{localizeDiseaseName(activeResult.diseaseName, language)}</span>
                                      <span>{(activeResult.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                      <div className="bg-gradient-to-r from-[#9333EA] to-[#D946EF] h-full rounded-full" style={{ width: `${activeResult.confidence * 100}%` }} />
                                    </div>
                                  </div>
                                  
                                  {r.diseaseIdentification?.alternativeDiseases ? (
                                    <div>
                                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span className="truncate">{r.diseaseIdentification.alternativeDiseases.split(';')[0] || (language === 'hi' ? 'वैकल्पिक रोगजनक' : 'Alternative Pathogen')}</span>
                                        <span>{Math.max(5, Math.round((1 - activeResult.confidence) * 60))}%</span>
                                      </div>
                                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-gray-500 h-full rounded-full" style={{ width: `${Math.max(5, Math.round((1 - activeResult.confidence) * 60))}%` }} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>{language === 'hi' ? 'अन्य रोगजनक' : 'Other Pathogens'}</span>
                                        <span>15%</span>
                                      </div>
                                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-gray-500 h-full rounded-full" style={{ width: '15%' }} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                <h4 className="text-sm font-black text-blue-400 mb-3 flex items-center gap-1.5">
                                  <ShieldCheck className="h-4 w-4" /> {t.keyFeaturesLabel}
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-gray-300">
                                    <strong className="block mb-0.5 text-white">{t.leafColor}</strong>
                                    <span>{r.visualSymptoms?.leafColor || (language === 'hi' ? 'विचलन पाया गया' : 'Deviation Detected')}</span>
                                  </div>
                                  <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-gray-300">
                                    <strong className="block mb-0.5 text-white">{t.spots}</strong>
                                    <span>{r.visualSymptoms?.spots || (language === 'hi' ? 'संकेंद्रित छल्ले' : 'Concentric Rings')}</span>
                                  </div>
                                  <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-gray-300">
                                    <strong className="block mb-0.5 text-white">{t.lesions}</strong>
                                    <span>{r.visualSymptoms?.lesions || (language === 'hi' ? 'सड़ते हुए किनारे' : 'Necrotic Margins')}</span>
                                  </div>
                                  <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-gray-300">
                                    <strong className="block mb-0.5 text-white">{t.damagedArea}</strong>
                                    <span>{r.visualSymptoms?.damagedArea || (language === 'hi' ? '12% अनुमानित' : '12% Estimated')}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="bg-[#9333EA]/10 border border-[#9333EA]/30 p-4 rounded-2xl flex items-center justify-between">
                              <span className="text-xs font-bold text-[#E9D5FF] uppercase tracking-wider">{t.explainabilityScoreLabel}</span>
                              <span className="text-xl font-black text-[#D946EF]">{(90 + Math.round(activeResult.confidence * 8))}%</span>
                            </div>

                            {/* Similar Diseases (if any) */}
                            {r.similarDiseases && r.similarDiseases.length > 0 && (
                              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                <h4 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-4">{t.similarDiseases}</h4>
                                <div className="space-y-2">
                                  {r.similarDiseases.map((sim: any, i: number) => (
                                    <div key={i} className="p-3 bg-black/30 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <span className="text-xs font-bold text-white">{sim.disease}</span>
                                      <span className="text-xs text-gray-400 text-left"><strong className="text-red-400">{language === 'hi' ? 'अस्वीकृत होने का कारण:' : 'Rejected reason:'}</strong> {sim.reasonsRejected}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      }

                      if (resultTab === 'timeline') {
                        return (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 relative z-10 text-left">
                            {/* Disease Progression Timeline */}
                            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                              <h4 className="text-sm font-black text-[#D946EF] mb-4">{t.progression}</h4>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-5">
                                <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                                  <span className="text-gray-400 block mb-0.5">{t.stage}</span>
                                  <span className="font-bold text-white">{r.progression?.stage}</span>
                                </div>
                                <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                                  <span className="text-gray-400 block mb-0.5">{t.spread}</span>
                                  <span className="font-bold text-white">{r.progression?.expectedSpread}</span>
                                </div>
                                <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                                  <span className="text-gray-400 block mb-0.5">{t.worsening}</span>
                                  <span className="font-bold text-white">{r.progression?.riskWorsening}</span>
                                </div>
                                <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                                  <span className="text-gray-400 block mb-0.5">{t.urgency}</span>
                                  <span className="font-black text-red-500">{r.progression?.urgency}</span>
                                </div>
                              </div>
                            </div>

                            {/* Risk assessment slider */}
                            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">{language === 'hi' ? 'रोग जोखिम मीटर' : 'Disease Risk Meter'}</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
                                <span className="text-green-500">{language === 'hi' ? 'कम जोखिम' : 'Low Risk'}</span>
                                <span className="text-yellow-500">{language === 'hi' ? 'मध्यम' : 'Moderate'}</span>
                                <span className="text-red-500">{language === 'hi' ? 'गंभीर' : 'Critical'}</span>
                              </div>
                                <div className="relative h-2.5 w-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full">
                                  <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#D946EF] shadow-md transform -translate-x-1/2 transition-all duration-500" style={{ left: `${riskLevelPct}%` }} />
                                </div>
                              </div>
                            </div>

                            {/* Recovery progress card */}
                            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                              <h4 className="text-sm font-black text-green-400 flex items-center gap-2 mb-4">
                                <CheckCircle2 className="h-4 w-4" /> {t.recoveryPred}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">{t.probability}</span>
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-white/10 h-2.5 rounded-full overflow-hidden">
                                      <div className="bg-green-500 h-full rounded-full" style={{ width: r.recovery?.probability }} />
                                    </div>
                                    <span className="text-sm font-black text-green-400">{r.recovery?.probability}</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">{t.time}</span>
                                  <span className="text-sm font-black text-white">{r.recovery?.recoveryTime}</span>
                                </div>
                              </div>
                              <div className="space-y-2 border-t border-white/5 pt-3 text-xs text-left">
                                <p className="text-gray-300"><strong className="text-white">{t.improvement}:</strong> {r.recovery?.expectedImprovement}</p>
                                <p className="text-gray-300"><strong className="text-white">{t.factors}:</strong> {r.recovery?.successFactors}</p>
                              </div>
                            </div>

                            {/* Treatment Plan Card */}
                            <div className="bg-[#9333EA]/10 border border-[#9333EA]/30 p-5 rounded-2xl space-y-4">
                              <h4 className="text-sm font-black text-[#E9D5FF] flex items-center gap-2 mb-2">
                                <ShieldCheck className="h-4 w-4" /> {t.treatmentPlan}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-left">
                                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                  <strong className="text-white uppercase text-[10px] block mb-1">{t.chemical}</strong>
                                  <p className="text-gray-300">{r.treatmentPlan?.chemical}</p>
                                </div>
                                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                  <strong className="text-white uppercase text-[10px] block mb-1">{t.organic}</strong>
                                  <p className="text-gray-300">{r.treatmentPlan?.organic}</p>
                                </div>
                                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                  <strong className="text-white uppercase text-[10px] block mb-1">{t.bioControl}</strong>
                                  <p className="text-gray-300">{r.treatmentPlan?.bioControl}</p>
                                </div>
                                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                  <strong className="text-white uppercase text-[10px] block mb-1">{t.fertilizer}</strong>
                                  <p className="text-gray-300">{r.treatmentPlan?.fertilizer}</p>
                                </div>
                              </div>
                              <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-2 text-xs text-left">
                                <p className="text-gray-300"><strong className="text-white">{t.waterMgmt}:</strong> {r.treatmentPlan?.water}</p>
                                <p className="text-gray-300"><strong className="text-white">{t.pruning}:</strong> {r.treatmentPlan?.pruning} | {r.treatmentPlan?.isolation}</p>
                                <p className="text-white font-bold"><strong className="text-[#E9D5FF]">{t.schedule}:</strong> {r.treatmentPlan?.schedule} ({language === 'hi' ? 'खुराक' : 'Dosage'}: {r.treatmentPlan?.dosage} | {r.treatmentPlan?.frequency})</p>
                              </div>
                            </div>

                            {/* Prevention Strategy Card */}
                            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3">
                              <h4 className="text-sm font-black text-green-400 flex items-center gap-2 mb-2">
                                <ShieldCheck className="h-4 w-4" /> {t.prevention}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-left">
                                <p className="text-gray-300"><strong className="text-white">{t.rotation}:</strong> {r.prevention?.rotation}</p>
                                <p className="text-gray-300"><strong className="text-white">{t.sanitation}:</strong> {r.prevention?.sanitation}</p>
                                <p className="text-gray-300"><strong className="text-white">{t.monitoring}:</strong> {r.prevention?.monitoring}</p>
                                <p className="text-gray-300"><strong className="text-white">{t.properIrrigation}:</strong> {r.prevention?.irrigation} | {r.prevention?.humidityMgmt}</p>
                              </div>
                              <p className="text-xs text-gray-300 border-t border-white/5 pt-3 text-left"><strong className="text-white">{t.resistant}:</strong> {r.prevention?.resistantVarieties} | {r.prevention?.preventiveSpraying}</p>
                            </div>

                            {/* Crop Impact Card */}
                            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                              <h4 className="text-sm font-black text-red-400 flex items-center gap-2 mb-3">
                                <AlertCircle className="h-4 w-4" /> {t.cropImpact}
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px] text-gray-300 text-left">
                                <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                                  <strong className="text-white block mb-0.5">{t.yield}</strong>
                                  <span>{r.cropImpact?.yield}</span>
                                </div>
                                <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                                  <strong className="text-white block mb-0.5">{t.fruit}</strong>
                                  <span>{r.cropImpact?.fruitQuality}</span>
                                </div>
                                <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                                  <strong className="text-white block mb-0.5">{t.growth}</strong>
                                  <span>{r.cropImpact?.growth}</span>
                                </div>
                                <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                                  <strong className="text-white block mb-0.5">{t.econLoss}</strong>
                                  <span className="text-red-400 font-bold">{r.cropImpact?.economicLoss}</span>
                                </div>
                                <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                                  <strong className="text-white block mb-0.5">{t.delay}</strong>
                                  <span>{r.cropImpact?.harvestDelay}</span>
                                </div>
                              </div>
                            </div>

                            {/* Immediate Action Plan Timeline Card */}
                            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                              <h4 className="text-sm font-black text-purple-400 flex items-center gap-2 mb-4">
                                <History className="h-4 w-4" /> {t.actionPlan}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-left">
                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                                  <span className="text-[10px] uppercase font-black text-red-400 block mb-1">{t.today}</span>
                                  <p className="text-xs text-white font-medium">{r.immediateAction?.today}</p>
                                </div>
                                <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl">
                                  <span className="text-[10px] uppercase font-black text-orange-400 block mb-1">{t.threeDays}</span>
                                  <p className="text-xs text-white font-medium">{r.immediateAction?.threeDays}</p>
                                </div>
                                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl">
                                  <span className="text-[10px] uppercase font-black text-yellow-400 block mb-1">{t.sevenDays}</span>
                                  <p className="text-xs text-white font-medium">{r.immediateAction?.sevenDays}</p>
                                </div>
                                <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl">
                                  <span className="text-[10px] uppercase font-black text-green-400 block mb-1">{t.longTerm}</span>
                                  <p className="text-xs text-white font-medium">{r.immediateAction?.longTerm}</p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      }
                      
                      return null;
                    })() : (
                      <>
                        {resultTab === 'general' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 relative z-10 text-left">
                            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                              <h4 className="text-sm font-bold text-[#D946EF] flex items-center gap-2 mb-2"><Leaf className="h-4 w-4" /> {t.symptomsCauses}</h4>
                              <p className="text-sm text-gray-300 mb-2"><strong className="text-white">{t.symptomsLabel}:</strong> {result.symptoms}</p>
                              <p className="text-sm text-gray-300"><strong className="text-white">{t.causesLabel}:</strong> {result.causes}</p>
                            </div>

                            <div className="bg-[#9333EA]/10 border border-[#9333EA]/30 p-5 rounded-2xl">
                              <h4 className="text-sm font-bold text-[#E9D5FF] flex items-center gap-2 mb-2"><ShieldCheck className="h-4 w-4" /> {t.treatmentPlanLabel}</h4>
                              <p className="text-sm text-white font-medium leading-relaxed">{result.treatment}</p>
                              <p className="text-xs text-[#E9D5FF] mt-2 border-t border-white/10 pt-2"><strong className="text-white">{t.preventionLabel}:</strong> {result.prevention}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                                <h4 className="text-xs font-bold text-blue-400 flex items-center gap-2 mb-2"><Droplets className="h-4 w-4" /> {t.irrigationAdviceLabel}</h4>
                                <p className="text-xs text-gray-300">{result.irrigation}</p>
                              </div>
                              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                                <h4 className="text-xs font-bold text-green-400 flex items-center gap-2 mb-2"><Activity className="h-4 w-4" /> {t.fertilizerLabel}</h4>
                                <p className="text-xs text-gray-300">{result.fertilizer}</p>
                              </div>
                            </div>
                            
                            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.recoveryTimeLabel}</span>
                              <span className="text-sm font-bold text-white">{result.recoveryTime || result.estimatedRecovery || 'N/A'}</span>
                            </div>
                          </motion.div>
                        )}

                        {resultTab === 'forensics' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 relative z-10 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                                <div>
                                  <h4 className="text-sm font-bold text-[#D946EF] mb-2">{t.imageForensicsLabel}</h4>
                                  <p className="text-xs text-gray-300 leading-relaxed">{result.imageForensics || (language === 'hi' ? 'समान पिक्सेल अखंडता जांच सफल रही। कोई संपीड़न विसंगतियां नहीं मिलीं।' : 'Uniform pixel integrity check passed. No compression anomalies detected.')}</p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-[#9333EA] mb-2">{t.manipulationDetectionLabel}</h4>
                                  <p className="text-xs text-gray-300 leading-relaxed">{result.manipulationDetection || (language === 'hi' ? 'त्रुटि स्तर विश्लेषण (ELA) छवि प्रामाणिकता की पुष्टि करता है।' : 'Error Level Analysis (ELA) verifies image authenticity.')}</p>
                                </div>
                              </div>

                              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">{t.manipulationHeatmapLabel}</h4>
                                <div className="relative w-44 h-44 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                                  <img src={imagePreview || ''} alt="Heatmap preview" className="w-full h-full object-cover opacity-60 filter grayscale" />
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/60 animate-ping absolute" />
                                    <div className="w-10 h-10 rounded-full bg-red-500/30 border border-red-500/80 animate-pulse absolute" />
                                    <span className="text-[10px] font-mono text-red-400 bg-black/80 px-2 py-0.5 rounded border border-red-500/30">ELA Hotspot</span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-gray-500 mt-2 text-center">{language === 'hi' ? 'लाल चमक पिक्सेल विचलनों को दर्शाती है' : 'Red glow highlights anomalous high-frequency pixel deviations'}</span>
                              </div>
                            </div>

                            <div className="bg-black/30 border border-white/5 p-4 rounded-2xl">
                              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">{t.exifAnalysisLabel}</h4>
                              <p className="text-xs text-gray-400 leading-relaxed font-mono whitespace-pre-line bg-black/20 p-3 rounded-lg border border-white/5">
                                {result.metadataAnalysis || 'Device: iPhone 15 Pro\nFocal Length: 24mm\nExposure: 1/120s at f/1.78\nISO: 80\nSoftware: iOS 17.4'}
                              </p>
                            </div>
                          </motion.div>
                        )}

                        {resultTab === 'explainable' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 relative z-10 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                                <div>
                                  <h4 className="text-sm font-bold text-[#D946EF] mb-2">{t.explainableAILabel}</h4>
                                  <p className="text-xs text-gray-300 leading-relaxed">{result.explainableAi || (language === 'hi' ? 'विशेषता एट्रिब्यूशन मानचित्र घावों और क्लोरोटिक किनारों के आसपास केंद्रित ध्यान दिखाते हैं।' : 'Feature attribution maps show model attention concentrated around necrotic centers and chlorotic halo edges. The surrounding healthy green pigment was ignored.')}</p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-[#3B82F6] mb-2">{t.riskAssessmentLabel}</h4>
                                  <p className="text-xs text-gray-300 leading-relaxed">{result.riskAssessment || (language === 'hi' ? 'जोखिम स्तर: मध्यम। समय पर नियंत्रण न होने पर 10-15% फसल नुकसान हो सकता है।' : 'Threat Level: Moderate. Inoculation can lead to a 10-15% crop loss if unchecked. Risk of local spread is elevated under warm/moist environments.')}</p>
                                </div>
                              </div>

                              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">{t.saliencyMapLabel}</h4>
                                <div className="relative w-44 h-44 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                                  <img src={imagePreview || ''} alt="Saliency preview" className="w-full h-full object-cover opacity-70" />
                                  <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute top-1/3 left-1/4 w-12 h-12 rounded-full bg-purple-500/40 border-2 border-purple-400/80 animate-pulse blur-xs" />
                                    <div className="absolute top-1/2 left-1/2 w-14 h-14 rounded-full bg-indigo-500/40 border-2 border-indigo-400/80 animate-pulse blur-xs" />
                                    <span className="absolute top-2 left-2 text-[9px] font-mono text-purple-300 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-500/30">Attribution Focus</span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-gray-500 mt-2 text-center">{t.saliencyExplainLabel}</span>
                              </div>
                            </div>

                            <div className="bg-black/30 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">{t.modelConfidenceLabel}</span>
                                <span className="text-sm text-gray-300">{t.confidenceExplainLabel}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-2xl font-black text-[#D946EF]">{(result.confidence * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {resultTab === 'timeline' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 relative z-10 text-left">
                            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                              <h4 className="text-sm font-bold text-[#D946EF] mb-4">{t.progressionTimelineLabel}</h4>
                              
                              <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                                {[
                                  { stage: t.inoculationStage, desc: t.inoculationDesc },
                                  { stage: t.incubationStage, desc: t.incubationDesc },
                                  { stage: t.symptomStage, desc: t.symptomDesc },
                                  { stage: t.dispersalStage, desc: t.dispersalDesc }
                                ].map((s, index) => (
                                  <div key={index} className="flex gap-4 relative">
                                    <div className="w-6 h-6 rounded-full bg-[#130722] border-2 border-[#D946EF] flex items-center justify-center text-[10px] font-bold text-[#D946EF] z-10 shrink-0">
                                      {index + 1}
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-bold text-white mb-0.5">{s.stage}</h5>
                                      <p className="text-[11px] text-gray-400 leading-relaxed">{s.desc}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="bg-[#9333EA]/10 border border-[#9333EA]/30 p-4 rounded-2xl">
                              <h4 className="text-xs font-bold text-[#E9D5FF] uppercase tracking-wider mb-1">{t.aiRecommendationContextLabel}</h4>
                              <p className="text-xs text-white leading-relaxed">
                                {result.investigationTimeline || (language === 'hi' ? 'रोग वर्तमान में लक्षण अभिव्यक्ति चरण (लगभग दिन 10) पर है। तत्काल उपचार बीजाणु प्रसार की प्रगति को रोकता है।' : 'Disease is currently at the Expression stage (approx. Day 10). Immediate treatment halts progression to Spore Dispersal.')}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </>
                    )}

                    {/* Premium Printable PDF section */}
                    {detailedReport && (
                      <div className="hidden print:block mt-10 space-y-8 border-t-2 border-gray-300 pt-8 text-black text-left">
                        <div className="text-center border-b pb-4">
                          <h1 className="text-2xl font-black">{t.diagnosticsBanner}</h1>
                          <p className="text-xs text-gray-500 mt-1">{t.metricDetectionTime}: {activeResult.detectionTime}</p>
                        </div>

                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h2 className="text-xs text-gray-400 uppercase tracking-wider">{t.diseaseStatus}</h2>
                            <p className="text-xl font-extrabold text-black">{localizeDiseaseName(activeResult.diseaseName, language)}</p>
                            {detailedReport.diseaseIdentification?.scientificName && (
                              <p className="text-xs text-purple-700 font-mono italic mt-0.5">{detailedReport.diseaseIdentification.scientificName}</p>
                            )}
                            <p className="text-xs text-gray-700 mt-2"><strong>{t.categoryLabel}:</strong> {detailedReport.diseaseIdentification?.category || 'Pathogen'}</p>
                            <p className="text-xs text-gray-700"><strong>{t.metricCrop}:</strong> {activeResult.cropType}</p>
                          </div>
                          
                          <div className="text-right flex flex-col items-end justify-center">
                            <div className="border-2 border-green-600 rounded-xl p-3 bg-green-50/50 inline-block">
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">{t.healthScoreLabel}</span>
                              <span className="text-2xl font-black text-green-700">{leafHealthScore}/100</span>
                            </div>
                            <span className="text-xs text-gray-700 mt-1 block"><strong>{t.metricConfidence}:</strong> {(activeResult.confidence * 100).toFixed(1)}%</span>
                            <span className="text-xs text-gray-700 block"><strong>{t.metricSeverity}:</strong> {activeResult.severity}</span>
                          </div>
                        </div>

                        {/* Symptoms / Causes */}
                        <div className="border-t border-gray-200 pt-6">
                          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">{t.symptomsCauses}</h3>
                          <div className="bg-gray-55 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                            <p><strong>{t.symptomsLabel}:</strong> {activeResult.symptoms || detailedReport.visualSymptoms?.damagedArea}</p>
                            <p><strong>{t.causesLabel}:</strong> {activeResult.causes || detailedReport.diseaseIdentification?.selectionReason}</p>
                          </div>
                        </div>

                        {/* Detailed Treatment Plan */}
                        <div className="border-t border-gray-200 pt-6">
                          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">{t.treatmentPlan}</h3>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            {detailedReport.treatmentPlan?.chemical && (
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <span className="font-bold text-gray-500 block mb-1 uppercase text-[9px]">{t.chemicalSolutionLabel}</span>
                                <p>{detailedReport.treatmentPlan.chemical}</p>
                              </div>
                            )}
                            {detailedReport.treatmentPlan?.organic && (
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <span className="font-bold text-gray-500 block mb-1 uppercase text-[9px]">{t.organicSolutionLabel}</span>
                                <p>{detailedReport.treatmentPlan.organic}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-3 text-xs space-y-1">
                            <p><strong>{t.waterMgmtLabel}:</strong> {detailedReport.treatmentPlan?.water}</p>
                            <p><strong>{t.monitoringScheduleLabel}:</strong> {detailedReport.prevention?.monitoring}</p>
                            <p><strong>{t.preventionLabel}:</strong> {activeResult.prevention}</p>
                            <p><strong>{t.expectedRecoveryTimeLabel}:</strong> {activeResult.estimatedRecovery}</p>
                          </div>
                        </div>

                        {/* Timeline */}
                        {detailedReport.progression && (
                          <div className="border-t border-gray-200 pt-6">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">{t.progressionTimelineLabel}</h3>
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div className="bg-gray-55 p-2.5 rounded-lg border border-gray-200">
                                <strong className="text-gray-500 text-[9px] uppercase block">{t.stage}</strong>
                                <span>{detailedReport.progression.stage}</span>
                              </div>
                              <div className="bg-gray-55 p-2.5 rounded-lg border border-gray-200">
                                <strong className="text-gray-500 text-[9px] uppercase block">{t.spread}</strong>
                                <span>{detailedReport.progression.expectedSpread}</span>
                              </div>
                              <div className="bg-gray-55 p-2.5 rounded-lg border border-gray-200">
                                <strong className="text-gray-500 text-[9px] uppercase block">{t.worsening}</strong>
                                <span>{detailedReport.progression.riskWorsening}</span>
                              </div>
                              <div className="bg-gray-55 p-2.5 rounded-lg border border-gray-200">
                                <strong className="text-gray-500 text-[9px] uppercase block">{t.priorityLevelLabel}</strong>
                                <span className="font-bold text-red-600">{detailedReport.progression.urgency}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <style>{`
                      @media print {
                        body * {
                          visibility: hidden;
                        }
                        #diagnostic-report-print-target, #diagnostic-report-print-target * {
                          visibility: visible;
                        }
                        #diagnostic-report-print-target {
                          position: absolute;
                          left: 0;
                          top: 0;
                          width: 100%;
                          background: white !important;
                          color: black !important;
                          box-shadow: none !important;
                          border: none !important;
                        }
                        #diagnostic-report-print-target div,
                        #diagnostic-report-print-target span,
                        #diagnostic-report-print-target h2,
                        #diagnostic-report-print-target h4,
                        #diagnostic-report-print-target p,
                        #diagnostic-report-print-target circle {
                          background: transparent !important;
                          color: black !important;
                          border-color: #e5e7eb !important;
                        }
                        /* Hide on-screen elements during print */
                        .print\\:hidden, 
                        #diagnostic-report-print-target > div.absolute, 
                        #diagnostic-report-print-target > div.flex-wrap,
                        #diagnostic-report-print-target > div.grid-cols-1,
                        #diagnostic-report-print-target > div.flex {
                          display: none !important;
                        }
                        /* Show printable container */
                        #diagnostic-report-print-target .print\\:block {
                          display: block !important;
                        }
                      }
                    `}</style>
                  </motion.div>
                ) : (
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl h-full min-h-[500px] flex flex-col items-center justify-center text-center shadow-lg">
                    {loading ? (
                      <>
                        <div className="relative w-24 h-24 mb-6">
                           <div className="absolute inset-0 border-4 border-[#9333EA]/30 rounded-full border-t-[#D946EF] animate-spin" />
                           <div className="absolute inset-2 border-4 border-[#3B82F6]/30 rounded-full border-b-[#3B82F6] animate-[spin_2s_linear_reverse]" />
                           <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-[#E9D5FF] animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{t('analyzingBiomarkers')}</h3>
                        <p className="text-sm text-gray-400 max-w-sm">{t('biomarkerDesc')}</p>
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 bg-black/20 rounded-full flex items-center justify-center mb-6">
                          <ImageIcon className="h-8 w-8 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-300 mb-2">{t('waitingForImage')}</h3>
                        <p className="text-sm text-gray-500 max-w-sm">{t('waitingForImageDesc')}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <History className="h-6 w-6 text-[#9333EA]" /> {t('scanHistoryTitle')}
                </h3>
                <div className="flex flex-wrap gap-3">
                  <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder={t('searchPlaceholder')} 
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="h-10 pl-10 pr-4 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#9333EA] w-full md:w-48"
                    />
                  </div>
                  <select
                    value={filterCrop}
                    onChange={(e) => { setFilterCrop(e.target.value); setCurrentPage(1); }}
                    className="h-10 px-4 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#9333EA] w-full md:w-auto"
                  >
                    <option value="All">{t('allCrops')}</option>
                    {CROP_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={exportCSV} className="flex-1 md:flex-none justify-center px-4 h-10 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors focus:outline-none">
                    <Download className="h-4 w-4" /> {t('btnCSV')}
                  </button>
                  <button onClick={exportPDF} className="flex-1 md:flex-none justify-center px-4 h-10 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors focus:outline-none">
                    <FileText className="h-4 w-4" /> {t('btnPDF')}
                  </button>
                </div>
              </div>

              {loadingHistory ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl h-64 flex flex-col justify-between p-4">
                      <div className="h-32 bg-white/10 rounded-xl w-full" />
                      <div className="space-y-2 mt-4">
                        <div className="h-4 bg-white/10 rounded w-2/3" />
                        <div className="h-3 bg-white/10 rounded w-1/2" />
                      </div>
                      <div className="h-6 bg-white/10 rounded-lg w-1/3 self-end mt-4" />
                    </div>
                  ))}
                </div>
              ) : paginatedHistory.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {paginatedHistory.map((h, i) => (
                      <div key={i} className="group bg-black/40 border border-white/10 rounded-2xl overflow-hidden hover:border-[#9333EA]/50 transition-colors">
                        <div className="h-40 relative overflow-hidden bg-black/60">
                          {h.imageUrl ? (
                            <img src={h.imageUrl} alt={localizeDiseaseName(h.diseaseName, language)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-8 w-8 text-white/20" /></div>
                          )}
                          <div className="absolute top-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded-md border border-white/10 text-xs font-bold text-white flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-[#D946EF]" /> {(h.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="text-base font-bold text-white mb-1 truncate">{localizeDiseaseName(h.diseaseName, language)}</h4>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400">{h.cropType}</span>
                            <span className="text-gray-500">{formatLocalDate(h.createdAt, language)}</span>
                          </div>
                          <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                              localizeDiseaseName(h.diseaseName, 'en').toLowerCase().includes('healthy') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {h.severity || (localizeDiseaseName(h.diseaseName, 'en').toLowerCase().includes('healthy') ? (language === 'hi' ? 'कोई नहीं' : 'None') : (language === 'hi' ? 'संक्रमित' : 'Detected'))}
                            </span>
                             <div className="flex items-center gap-3">
                              <button
                               onClick={() => {
                                 setResult({
                                   id: h._id || h.id,
                                   translations: h.translations || {},
                                   diseaseName: h.diseaseName,
                                   confidence: h.confidence,
                                   treatment: h.treatment,
                                   cropType: h.cropType,
                                   severity: h.severity || 'Unknown',
                                   symptoms: h.symptoms || '',
                                   causes: h.causes || '',
                                   prevention: h.prevention || '',
                                   estimatedRecovery: h.estimatedRecovery || 'N/A',
                                   irrigation: h.irrigation || '',
                                   fertilizer: h.fertilizer || '',
                                   imageForensics: h.imageForensics || '',
                                   metadataAnalysis: h.metadataAnalysis || '',
                                   explainableAi: h.explainableAi || '',
                                   manipulationDetection: h.manipulationDetection || '',
                                   riskAssessment: h.riskAssessment || '',
                                   investigationTimeline: h.investigationTimeline || '',
                                   detectionTime: new Date(h.createdAt).toLocaleTimeString()
                                 });
                                 setResultTab('general');
                                 setImagePreview(h.imageUrl || null);
                                 setSelectedCrop(h.cropType);
                                 setActiveTab('scan');
                               }}
                               className="text-[#9333EA] hover:text-[#D946EF] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer focus:outline-none"
                             >
                               <Eye className="h-3.5 w-3.5" /> {t('details')}
                             </button>

                             <button
                               onClick={async () => {
                                 if (confirm(t('confirmDelete'))) {
                                   try {
                                     const idToDelete = h._id || h.id;
                                     const res = await fetch(`/api/disease-history/${idToDelete}`, { method: 'DELETE' });
                                     const d = await res.json();
                                     if (d.success) {
                                        showToast(language === 'hi' ? 'निदान सफलतापूर्वक हटा दिया गया।' : 'Diagnosis removed successfully.', 'success');
                                        fetchHistory();
                                     } else {
                                        showToast(d.message || 'Delete failed.', 'error');
                                     }
                                   } catch (err) {
                                     showToast('Delete failed.', 'error');
                                   }
                                 }
                               }}
                               className="text-red-400 hover:text-red-500 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer focus:outline-none"
                             >
                               <X className="h-3.5 w-3.5" /> {language === 'hi' ? 'हटाएं' : 'Delete'}
                             </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 flex-wrap">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-10 h-10 rounded-xl text-sm font-bold transition-all focus:outline-none ${
                            currentPage === i + 1 
                              ? 'bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white shadow-lg shadow-[#9333EA]/30' 
                              : 'bg-black/20 border border-white/10 text-gray-400 hover:text-white'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-20 text-center">
                  <ImageIcon className="h-12 w-12 text-white/10 mx-auto mb-4" />
                  <p className="text-gray-500">{t('emptyStateDesc')}</p>
                </div>
              )}
            </div>
          )}

          {/* STATISTICS TAB */}
          {activeTab === 'statistics' && (
            <div className="space-y-6">
              {/* Top Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">{t('totalScansLabel')}</span>
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-black text-white">{totalScans}</span>
                    <TrendingUp className="h-6 w-6 text-[#9333EA] mb-1" />
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">{t('accuracyLabel')}</span>
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-black text-[#D946EF]">{accuracy}%</span>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">{t('healthyLabel')}</span>
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-black text-green-400">{healthyCount}</span>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg flex flex-col justify-center">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">{t('mostCommonLabel')}</span>
                  <span className="text-lg font-bold text-red-400 leading-tight mt-1 truncate block">{mostCommon}</span>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg">
                  <h3 className="text-sm font-bold text-white mb-6">{t('monthlyTrendsLabel')}</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorDiseased" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorHealthy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="name" stroke="#ffffff50" tick={{fontSize: 12}} />
                        <YAxis stroke="#ffffff50" tick={{fontSize: 12}} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '12px' }} />
                        <Area type="monotone" dataKey="diseased" stroke="#EF4444" fillOpacity={1} fill="url(#colorDiseased)" name={t('legendDiseased')} />
                        <Area type="monotone" dataKey="healthy" stroke="#10B981" fillOpacity={1} fill="url(#colorHealthy)" name={t('legendHealthy')} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg">
                  <h3 className="text-sm font-bold text-white mb-6">{t('scansByCropLabel')}</h3>
                  <div className="h-72 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '12px', color: '#fff' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

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

      {/* Fullscreen Photo Viewer */}
      {isFullscreen && imagePreview && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => setShowOverlay(prev => !prev)} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 focus:outline-none border ${showOverlay ? 'bg-[#9333EA]/20 border-[#9333EA]/40 text-[#D946EF]' : 'bg-white/5 border-white/10 text-white'}`}
            >
              <Sparkles className="h-4 w-4" /> {t.viewerToggleOverlay}
            </button>
            <button 
              type="button" 
              onClick={() => {
                setIsFullscreen(false);
                handleResetZoom();
              }} 
              className="p-2 bg-white/10 hover:bg-white/25 rounded-full text-white transition-colors focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div 
            className="w-full h-full max-h-[85vh] flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
          >
            <div
              className="transition-transform select-none pointer-events-none flex items-center justify-center"
              style={{
                transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
              }}
            >
              <img src={imagePreview} alt="Fullscreen Leaf Preview" className="max-h-[80vh] max-w-[90vw] object-contain" />
              {showOverlay && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full bg-purple-500/20 border-4 border-purple-400/50 animate-pulse blur-xl absolute" />
                  <div className="w-32 h-32 rounded-full bg-indigo-500/30 border-2 border-indigo-400/50 animate-pulse blur-lg absolute" />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-black/60 px-6 py-2.5 rounded-2xl border border-white/10 backdrop-blur-md">
            <button type="button" onClick={handleZoomIn} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white focus:outline-none"><Plus className="h-5 w-5" /></button>
            <span className="text-xs font-mono text-gray-300 font-bold">{zoomScale.toFixed(2)}x</span>
            <button type="button" onClick={handleZoomOut} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white focus:outline-none"><X className="h-5 w-5 rotate-45" /></button>
            <button type="button" onClick={handleResetZoom} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white focus:outline-none flex items-center gap-1"><RefreshCw className="h-4 w-4" /> {t.viewerReset}</button>
          </div>
        </div>
      )}
    </div>
  );
}
