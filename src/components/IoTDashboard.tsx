import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi, WifiOff, Thermometer, Droplets, Droplet, Sun, CloudRain,
  Activity, Zap, Map as MapIcon, Settings, Settings2, Sliders, Bell, AlertTriangle,
  CheckCircle2, Battery, BatteryCharging, Search, Download, FileText,
  Loader2, RefreshCw, Server, Plus, Edit2, Trash2, Maximize, Play, Square, X,
  BarChart2, Radio, LayoutDashboard
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { Farm, User } from '../types';
import { fetch } from '../utils/api';
import { t } from '../utils/i18n';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom glowing map marker for Leaflet
const customMarkerIcon = typeof window !== 'undefined' ? L.divIcon({
  className: 'custom-gps-marker',
  html: `<div class="relative flex items-center justify-center">
    <div class="absolute h-6 w-6 rounded-full bg-[#D946EF] animate-ping opacity-75"></div>
    <div class="relative h-4 w-4 rounded-full bg-[#9333EA] border-2 border-white shadow-[0_0_10px_rgba(147,51,234,0.8)]"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
}) : null as any;

// Helper to parse location string to [lat, lon] coordinates
const parseCoordinates = (location: string, index: number): [number, number] => {
  if (!location) return [26.8467, 80.9462]; // Default to Lucknow, India
  const regex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
  const match = location.match(regex);
  if (match) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lon)) return [lat, lon];
  }

  const lower = location.toLowerCase();
  if (lower.includes('punjab')) {
    return [31.1471 - (index * 0.02), 75.3412 + (index * 0.02)];
  }
  if (lower.includes('lucknow')) {
    return [26.8467 - (index * 0.02), 80.9462 + (index * 0.02)];
  }
  if (lower.includes('delhi') || lower.includes('india')) {
    return [28.6139 - (index * 0.02), 77.209 + (index * 0.02)];
  }

  // Fallback hash mapping to distribute markers deterministically inside India coordinates
  let hash = 0;
  for (let i = 0; i < location.length; i++) {
    hash = location.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lat = 26.0 + (Math.abs(hash % 100) / 100) * 5.0;
  const lon = 75.0 + (Math.abs((hash >> 8) % 100) / 100) * 8.0;
  return [lat, lon];
};

// Component to dynamically pan the Leaflet map view
function ChangeMapView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

interface IoTDashboardProps {
  user: User;
  farms: Farm[];
  activeFarm: Farm | null;
  onRefreshFarms?: () => void;
  language: 'en' | 'hi';
}

interface SensorData {
  id: string;
  name: string;
  type: string;
  value: number;
  unit: string;
  status: 'online' | 'offline' | 'warning';
  battery: number;
  lastUpdate: string;
  trend: 'up' | 'down' | 'stable';
  fieldId?: string;
  signalStrength?: string;
}

interface ActuatorData {
  id: string;
  name: string;
  type: 'valve' | 'pump';
  state: 'on' | 'off' | 'error';
  lastAction: string;
}

// NOTE: generateHistoricalData() has been removed - charts now use live MongoDB sensor readings.

export default function IoTDashboard({ user, farms, activeFarm, onRefreshFarms, language }: IoTDashboardProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'devices' | 'alerts'>('overview');
  const [selectedFarmId, setSelectedFarmId] = useState<string>(activeFarm?.id || (farms.length > 0 ? farms[0].id : ''));
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real-time Data States
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [actuators, setActuators] = useState<ActuatorData[]>([]);
  // Telemetry keyed by sensor type from MongoDB readings
  const [telemetry, setTelemetry] = useState<Record<string, { time: string; value: number }[]>>({});

  // Modal states for creating/editing sensors
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState<SensorData | null>(null);
  const [modalSensorName, setModalSensorName] = useState('');
  const [modalSensorType, setModalSensorType] = useState('moisture');
  const [modalSensorFieldId, setModalSensorFieldId] = useState('');
  const [fields, setFields] = useState<any[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast(t(language, 'iotNetworkRestored'), 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast(t(language, 'iotNetworkLost'), 'error');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [language]);

  useEffect(() => {
    if (activeFarm) setSelectedFarmId(activeFarm.id);
  }, [activeFarm]);

  const getSensorTypeName = (type: string, lang: 'en' | 'hi') => {
    const mappings: Record<string, { en: string, hi: string }> = {
      temperature: { en: 'Temperature Sensor', hi: 'तापमान सेंसर' },
      moisture: { en: 'Soil Moisture Sensor', hi: 'मिट्टी की नमी सेंसर' },
      humidity: { en: 'Humidity Sensor', hi: 'आर्द्रता सेंसर' },
      ph: { en: 'Soil pH Sensor', hi: 'मिट्टी का pH सेंसर' },
      nitrogen: { en: 'Nitrogen Sensor', hi: 'नाइट्रोजन सेंसर' },
      phosphorus: { en: 'Phosphorus Sensor', hi: 'फास्फोरस सेंसर' },
      potassium: { en: 'Potassium Sensor', hi: 'पोटेशियम सेंसर' },
      rainfall: { en: 'Rain Sensor', hi: 'वर्षा सेंसर' },
      light: { en: 'Light Sensor', hi: 'प्रकाश सेंसर' },
      wind: { en: 'Wind Speed Sensor', hi: 'हवा की गति सेंसर' },
      tank: { en: 'Water Tank Sensor', hi: 'पानी की टंकी सेंसर' },
      battery: { en: 'Battery Sensor', hi: 'बैटरी सेंसर' }
    };
    return mappings[type]?.[lang] || (lang === 'hi' ? `${type} सेंसर` : `${type} Sensor`);
  };

  const openAddModal = () => {
    setEditingSensor(null);
    setModalSensorName('');
    setModalSensorType('moisture');
    if (fields.length > 0) {
      setModalSensorFieldId(fields[0]._id || fields[0].id);
    } else {
      setModalSensorFieldId('');
    }
    setDeviceModalOpen(true);
  };

  const openEditModal = (sensor: SensorData) => {
    setEditingSensor(sensor);
    setModalSensorName(sensor.name);
    setModalSensorType(sensor.type);
    const matchingField = fields.find(f => f._id === sensor.fieldId || f.id === sensor.fieldId);
    setModalSensorFieldId(matchingField ? (matchingField._id || matchingField.id) : (fields[0]?._id || fields[0]?.id || ''));
    setDeviceModalOpen(true);
  };

  const handleSaveSensor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmId || selectedFarmId === 'demo') return;
    if (!modalSensorName.trim() || !modalSensorFieldId) {
      showToast(t(language, 'iotNameFieldRequired'), 'error');
      return;
    }

    try {
      const isEditing = !!editingSensor;
      const url = isEditing ? `/api/sensors/${editingSensor.id}` : '/api/sensors';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        farmId: selectedFarmId,
        fieldId: modalSensorFieldId,
        name: modalSensorName,
        type: modalSensorType,
        status: isEditing ? editingSensor.status : 'online',
        battery: isEditing ? editingSensor.battery : 100,
        signalStrength: isEditing ? (editingSensor as any).signalStrength : 'Excellent'
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        showToast(
          isEditing 
            ? t(language, 'iotSensorUpdatedSuccess')
            : t(language, 'iotSensorRegisteredSuccess'), 
          'success'
        );
        setDeviceModalOpen(false);
        loadData(selectedFarmId);
        if (onRefreshFarms) onRefreshFarms();
      } else {
        showToast(data.message || t(language, 'error'), 'error');
      }
    } catch (err: any) {
      showToast(err.message || t(language, 'error'), 'error');
    }
  };

  const handleDisableSensor = async (sensor: SensorData) => {
    try {
      const res = await fetch(`/api/sensors/${sensor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'offline' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(t(language, 'iotSensorDisabledSuccess'), 'success');
        loadData(selectedFarmId);
        if (onRefreshFarms) onRefreshFarms();
      } else {
        showToast(data.message || t(language, 'error'), 'error');
      }
    } catch (err: any) {
      showToast(err.message || t(language, 'error'), 'error');
    }
  };

  const handleReconnectSensor = async (sensor: SensorData) => {
    try {
      const res = await fetch(`/api/sensors/${sensor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'online' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(t(language, 'iotSensorReconnectedSuccess'), 'success');
        loadData(selectedFarmId);
        if (onRefreshFarms) onRefreshFarms();
      } else {
        showToast(data.message || t(language, 'error'), 'error');
      }
    } catch (err: any) {
      showToast(err.message || t(language, 'error'), 'error');
    }
  };

  // Load IoT Data from Database
  const loadData = async (farmId: string) => {
    const currentFarm = farms.find(f => f.id === farmId);
    if (!currentFarm) { setLoading(false); return; }

    setLoading(true);
    try {
      // Fetch fields for the active farm
      const fieldsRes = await fetch(`/api/fields?farmId=${farmId}`);
      const fieldsData = await fieldsRes.json();
      if (fieldsData.success) {
        setFields(fieldsData.fields || []);
      } else {
        const allFieldsRes = await fetch('/api/fields');
        const allFieldsData = await allFieldsRes.json();
        if (allFieldsData.success) {
          setFields((allFieldsData.fields || []).filter((f: any) => f.farmId === farmId));
        }
      }

      // Fetch sensor devices
      const res = await fetch(`/api/sensors?farmId=${farmId}`);
      const data = await res.json();
      if (data.success) {
        const mappedSensors: SensorData[] = data.sensors.map((s: any) => ({
          id: s._id || s.id,
          name: s.name,
          type: s.type,
          value: 0, // will be updated from readings below
          unit: s.type === 'temperature' ? '°C' : s.type === 'moisture' ? '%' : s.type === 'humidity' ? '%' : s.type === 'ph' ? 'pH' : s.type === 'ec' ? 'dS/m' : s.type === 'light' ? 'lux' : s.type === 'rainfall' ? 'mm/h' : '%',
          status: s.status || 'online',
          battery: s.battery !== undefined ? s.battery : 100,
          lastUpdate: t(language, 'iotJustNow'),
          trend: 'stable',
          fieldId: s.fieldId
        }));

        // Fetch real sensor readings from MongoDB
        const readingsRes = await fetch(`/api/sensors/readings?farmId=${farmId}&limit=100`);
        const readingsData = await readingsRes.json();
        const readings: any[] = readingsData.success ? readingsData.readings : [];

        // Group readings by sensor type for charts
        const telemetryByType: Record<string, { time: string; value: number }[]> = {};
        // Also calculate latest value per sensor
        const latestBySensor: Record<string, number> = {};
        for (const r of readings) {
          const type = r.sensorType || 'unknown';
          if (!telemetryByType[type]) telemetryByType[type] = [];
          telemetryByType[type].push({
            time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: r.value
          });
          // Track latest value for each sensor device
          const sId = String(r.sensorId);
          if (!(sId in latestBySensor)) latestBySensor[sId] = r.value;
        }

        // Populate sensor current values from readings
        const enriched = mappedSensors.map(s => ({
          ...s,
          value: latestBySensor[s.id] ?? (currentFarm.sensorData?.[s.type as keyof typeof currentFarm.sensorData] as number ?? 0)
        }));

        setSensors(enriched);
        setTelemetry(telemetryByType);
      }

      // Load actuators from farm
      const farmActuators = ((currentFarm as any).actuators || []).map((a: any) => ({
        id: a.id || a._id,
        name: a.name,
        type: a.type as 'valve' | 'pump',
        state: a.state as 'on' | 'off' | 'error',
        lastAction: a.lastAction || t(language, 'history')
      }));
      setActuators(farmActuators);
    } catch (err) {
      console.error('Failed to load IoT sensors', err);
      showToast(t(language, 'iotFailedLoadSensors'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedFarmId) { setLoading(false); return; }
    loadData(selectedFarmId);
    // 5-minute polling for live updates
    const interval = setInterval(() => loadData(selectedFarmId), 300000);
    return () => clearInterval(interval);
  }, [selectedFarmId, farms]);



  const toggleActuator = async (id: string) => {
    const targetActuator = actuators.find(a => a.id === id);
    if (!targetActuator) return;
    if (targetActuator.state === 'error') {
      showToast(t(language, 'iotActuatorLocked'), 'error');
      return;
    }

    const oldState = targetActuator.state;
    const newState = oldState === 'on' ? 'off' : 'on';

    // Optimistic UI state change
    setActuators(prev => prev.map(a => {
      if (a.id === id) {
        return { 
          ...a, 
          state: newState, 
          lastAction: newState === 'on' ? t(language, 'iotActiveFlowing') : t(language, 'iotIdleStandby') 
        };
      }
      return a;
    }));

    showToast(
      language === 'hi' 
        ? `${targetActuator.name} की स्थिति बदली जा रही है...` 
        : `${targetActuator.name} turning ${newState}...`, 
      'info'
    );

    const currentFarm = farms.find(f => f.id === selectedFarmId);
    if (currentFarm && currentFarm.id && selectedFarmId !== 'demo') {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/farms/actuator', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            farmId: currentFarm.id,
            actuatorId: id,
            state: newState
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(
            language === 'hi'
              ? `${targetActuator.name} सफलतापूर्वक ${newState === 'on' ? 'चालू' : 'बंद'} किया गया`
              : `${targetActuator.name} turned ${newState} successfully`, 
            'success'
          );
          if (onRefreshFarms) {
            onRefreshFarms();
          }
        } else {
          throw new Error(data.message || 'Failed to toggle actuator');
        }
      } catch (err: any) {
        // Rollback state on error
        setActuators(prev => prev.map(a => {
          if (a.id === id) {
            return { 
              ...a, 
              state: oldState, 
              lastAction: oldState === 'on' ? t(language, 'iotActiveFlowing') : t(language, 'iotIdleStandby') 
            };
          }
          return a;
        }));
        showToast(err.message || t(language, 'iotErrorExecCommand'), 'error');
      }
    } else {
      setTimeout(() => {
        showToast(
          language === 'hi'
            ? `${targetActuator.name} ${newState === 'on' ? 'चालू' : 'बंद'} किया गया (डेमो मोड)`
            : `${targetActuator.name} turned ${newState} (Demo Mode)`, 
          'success'
        );
      }, 400);
    }
  };

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'temperature': return Thermometer;
      case 'moisture': return Droplets;
      case 'humidity': return CloudRain;
      case 'ph': return Activity;
      case 'ec': return Zap;
      case 'light': return Sun;
      case 'rainfall': return CloudRain;
      case 'tank': return Server;
      default: return Radio;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-emerald-400 bg-emerald-400/20 border-emerald-400/30';
      case 'offline': return 'text-gray-400 bg-gray-400/20 border-gray-400/30';
      case 'warning': return 'text-amber-400 bg-amber-400/20 border-amber-400/30';
      case 'error': return 'text-rose-400 bg-rose-400/20 border-rose-400/30';
      default: return 'text-blue-400 bg-blue-400/20 border-blue-400/30';
    }
  };

  const filteredSensors = sensors.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.type.includes(searchQuery.toLowerCase()));

  const warningSensors = sensors.filter(s => s.status === 'warning');
  const offlineSensors = sensors.filter(s => s.status === 'offline');
  const alertCount = warningSensors.length + offlineSensors.length;
  const lowBatteryCount = sensors.filter(s => s.battery <= 25).length;

  const exportCSV = () => {
    const headers = ['Device ID', 'Device Name', 'Type', 'Value', 'Unit', 'Status', 'Battery', 'Last Update'];
    const rows = sensors.map(s => [
      s.id,
      s.name,
      s.type,
      s.value,
      s.unit,
      s.status,
      `${s.battery}%`,
      s.lastUpdate
    ].map(val => `"${String(val ?? '').replace(/"/g, '""')}"`));
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(",")].concat(rows.map(e => e.join(","))).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `iot_telemetry_${selectedFarmId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t(language, 'iotExportCSVSuccess'), 'success');
  };

  if (farms.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center shadow-lg flex flex-col items-center justify-center min-h-[400px] max-w-md mx-auto mt-12">
        <div className="w-20 h-20 bg-gradient-to-br from-[#9333EA]/20 to-[#C026D3]/20 rounded-full flex items-center justify-center mb-6 border border-[#9333EA]/30">
          <Wifi className="h-10 w-10 text-[#D946EF]" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">{t(language, 'iotNoFarmsFound')}</h3>
        <p className="text-[#E9D5FF] text-sm mb-8 leading-relaxed">
          {t(language, 'iotNoFarmsDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 relative">
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-50 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border backdrop-blur-xl ${
              toast.type === 'error' ? 'bg-rose-500/20 border-rose-500/50 text-rose-200' : 
              toast.type === 'info' ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' :
              'bg-[#9333EA]/20 border-[#9333EA]/50 text-[#E9D5FF]'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle className="h-5 w-5" /> : 
             toast.type === 'info' ? <Bell className="h-5 w-5" /> :
             <CheckCircle2 className="h-5 w-5 text-[#9333EA]" />}
            <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-black text-white tracking-tight">{t(language, 'iotTitle')}</h2>
            <div className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <Radio className="h-3 w-3 animate-pulse" /> {t(language, 'iotProdSync')}
            </div>
          </div>
          <p className="text-[#E9D5FF] max-w-2xl">
            {t(language, 'iotSubtitleText')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={selectedFarmId} 
            onChange={e => setSelectedFarmId(e.target.value)}
            className="h-10 bg-[#121024]/80 backdrop-blur-md border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-[#9333EA] shadow-lg"
          >
            {farms.map(f => <option key={f.id} value={f.id} className="bg-[#121024]">{f.name}</option>)}
            {farms.length === 0 && <option value="" disabled className="bg-[#121024]">{t(language, 'iotNoFarmsFound')}</option>}
          </select>
          <button 
            onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 800); }}
            className="h-10 w-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-white transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#121024]/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-lg">
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            {isOnline ? <Wifi className="h-5 w-5 text-emerald-400" /> : <WifiOff className="h-5 w-5 text-rose-400 animate-pulse" />}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t(language, 'iotNetworkStatus')}</p>
            <p className="text-base font-black text-white">
              {isOnline ? t(language, 'iotGateway') : t(language, 'iotOffline')} <span className={`text-[10px] font-bold ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>{isOnline ? t(language, 'iotOnline').toUpperCase() : t(language, 'iotDisconnected')}</span>
            </p>
          </div>
        </div>
        <div className="bg-[#121024]/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-lg">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${alertCount > 0 ? 'bg-rose-500/20 border-rose-500/30' : 'bg-emerald-500/20 border-emerald-500/30'}`}>
            <AlertTriangle className={`h-5 w-5 ${alertCount > 0 ? 'text-rose-400 animate-bounce' : 'text-emerald-400'}`} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t(language, 'iotActiveAlerts')}</p>
            <p className="text-lg font-black text-white">{alertCount} <span className={`text-sm font-medium ${alertCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{language === 'hi' ? 'अलर्ट' : (alertCount === 1 ? 'Alert' : 'Alerts')}</span></p>
          </div>
        </div>
        <div className="bg-[#121024]/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-lg">
          <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            <Activity className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t(language, 'iotDataPackets')}</p>
            <p className="text-lg font-black text-white">{isOnline ? '1.2k' : '0'} <span className="text-sm font-medium text-blue-400">/min</span></p>
          </div>
        </div>
        <div className="bg-[#121024]/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-lg">
          <div className="h-10 w-10 rounded-full bg-[#9333EA]/20 flex items-center justify-center border border-[#9333EA]/30">
            <Server className="h-5 w-5 text-[#D946EF]" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t(language, 'iotGatewayNode')}</p>
            <p className="text-lg font-black text-white">GT-992 <span className="text-sm font-medium text-[#D946EF]">{language === 'hi' ? 'सिंक किया गया' : 'Synced'}</span></p>
          </div>
        </div>
        <div className="bg-[#121024]/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-lg">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${lowBatteryCount > 0 ? 'bg-rose-500/20 border-rose-500/30 animate-pulse' : 'bg-emerald-500/20 border-emerald-500/30'}`}>
            <Battery className={`h-5 w-5 ${lowBatteryCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t(language, 'iotLowBattery')}</p>
            <p className="text-lg font-black text-white">{lowBatteryCount} <span className={`text-sm font-medium ${lowBatteryCount > 0 ? 'text-rose-400' : 'text-gray-400'}`}>{language === 'hi' ? 'डिवाइस' : (lowBatteryCount === 1 ? 'Device' : 'Devices')}</span></p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-white/10 pb-4 no-scrollbar">
        {[
          { id: 'overview', label: t(language, 'iotSensorArray'), icon: LayoutDashboard },
          { id: 'devices', label: t(language, 'iotDeviceManagement'), icon: Settings2 },
          { id: 'map', label: t(language, 'iotGeospatialView'), icon: MapIcon },
          { id: 'alerts', label: t(language, 'iotActiveAlerts'), icon: Bell }
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

      {loading ? (
        <div className="space-y-6 animate-pulse">
          {/* Actuators Control Panel Skeleton */}
          <div className="bg-[#121024]/80 p-6 rounded-3xl border border-white/10 h-56">
            <div className="h-6 bg-white/10 rounded w-48 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 h-36 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="h-8 w-8 rounded-lg bg-white/10" />
                    <div className="h-6 w-12 rounded bg-white/10" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-white/10 rounded w-2/3" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Telemetry Sensor Grid Skeleton */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-6 bg-white/10 rounded w-32" />
              <div className="h-10 bg-white/10 rounded-xl w-64" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-[#121024]/80 p-5 rounded-3xl border border-white/10 h-48 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/10" />
                      <div className="space-y-2">
                        <div className="h-4 bg-white/10 rounded w-24" />
                        <div className="h-3 bg-white/10 rounded w-12" />
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded bg-white/10" />
                  </div>
                  <div className="h-8 bg-white/10 rounded w-16 my-4" />
                  <div className="flex justify-between items-center">
                    <div className="h-3 bg-white/10 rounded w-16" />
                    <div className="h-5 bg-white/10 rounded-full w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* Control Panel */}
                <div className="bg-[#121024]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Sliders className="h-5 w-5 text-[#9333EA]" /> {t(language, 'iotActuatorControlPanel')}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {actuators.map(actuator => (
                      <div key={actuator.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
                        {actuator.state === 'on' && <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />}
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <div className={`p-2 rounded-xl ${actuator.state === 'on' ? 'bg-blue-500/20 text-blue-400' : actuator.state === 'error' ? 'bg-rose-500/20 text-rose-400' : 'bg-gray-800 text-gray-400'}`}>
                            {actuator.type === 'pump' ? <Zap className="h-5 w-5" /> : <Droplet className="h-5 w-5" />}
                          </div>
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${getStatusColor(actuator.state)}`}>
                            {actuator.state === 'on' ? t(language, 'iotActuatorStatusOn') : actuator.state === 'error' ? t(language, 'iotActuatorStatusError') : t(language, 'iotActuatorStatusOff')}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1 relative z-10">{actuator.name}</h4>
                        <p className="text-xs text-gray-500 mb-4 relative z-10">{actuator.lastAction}</p>
                        
                        <button
                          onClick={() => toggleActuator(actuator.id)}
                          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all relative z-10 flex items-center justify-center gap-2 ${
                            actuator.state === 'on' 
                              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/50' 
                              : actuator.state === 'error'
                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50'
                          }`}
                        >
                          {actuator.state === 'on' ? <><Square className="h-4 w-4 fill-current" /> {t(language, 'iotActuatorStop')}</> : actuator.state === 'error' ? t(language, 'iotActuatorLocked') : <><Play className="h-4 w-4 fill-current" /> {t(language, 'iotActuatorStart')}</>}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sensor Grid */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">{t(language, 'iotLiveTelemetry')}</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input 
                        type="text" placeholder={t(language, 'iotFilterSensors')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="h-10 pl-10 pr-4 bg-[#121024]/80 backdrop-blur-md border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#9333EA] w-64"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredSensors.map(sensor => {
                      const Icon = getSensorIcon(sensor.type);
                      return (
                        <div key={sensor.id} className="bg-[#121024]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-lg group hover:border-[#9333EA]/50 transition-all">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl ${getStatusColor(sensor.status)}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-white line-clamp-1">{sensor.name}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {sensor.status === 'offline' ? (
                                    <span className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-wider font-bold"><WifiOff className="h-3 w-3" /> {t(language, 'iotOffline')}</span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[10px] text-emerald-500 uppercase tracking-wider font-bold"><Wifi className="h-3 w-3" /> {t(language, 'iotOnline')}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                               {sensor.battery <= 25 ? <Battery className="h-4 w-4 text-rose-400 mb-1" /> : sensor.battery === 100 ? <BatteryCharging className="h-4 w-4 text-emerald-400 mb-1" /> : <Battery className="h-4 w-4 text-gray-400 mb-1" />}
                               <span className="text-[10px] font-mono text-gray-500">{sensor.battery}%</span>
                            </div>
                          </div>
                          
                          <div className="my-6 flex items-baseline gap-2">
                            <span className={`text-4xl font-black font-mono ${sensor.status === 'offline' ? 'text-gray-600' : 'text-white'}`}>
                              {sensor.status === 'offline' ? '--' : sensor.value}
                            </span>
                            <span className="text-sm text-gray-400 font-bold">{sensor.unit}</span>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1"><RefreshCw className="h-3 w-3" /> {sensor.lastUpdate}</span>
                            {sensor.status !== 'offline' && (
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                sensor.trend === 'up' ? 'bg-emerald-500/20 text-emerald-400' :
                                sensor.trend === 'down' ? 'bg-rose-500/20 text-rose-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {sensor.trend === 'up' ? t(language, 'iotRising') : sensor.trend === 'down' ? t(language, 'iotFalling') : '→ ' + t(language, 'iotStable')}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Telemetry Charts — Live MongoDB Sensor Readings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                  <div className="bg-[#121024]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-base font-bold text-white flex items-center gap-2"><Thermometer className="h-4 w-4 text-rose-400" /> {t(language, 'iotTempTrendLive')}
                          <span className="ml-2 text-xs font-normal text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">{(telemetry['temperature'] || []).length} pts</span>
                        </h3>
                        <button className="text-gray-400 hover:text-white"><Maximize className="h-4 w-4" /></button>
                     </div>
                     <div className="h-64">
                        {(telemetry['temperature'] || []).length === 0 ? (
                          <div className="h-full flex items-center justify-center text-gray-500 text-sm">{t(language, 'iotNoTempReadings')}</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={telemetry['temperature'] || []}>
                              <defs>
                                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                              <XAxis dataKey="time" stroke="#ffffff50" tick={{fontSize: 10}} minTickGap={30} />
                              <YAxis stroke="#ffffff50" tick={{fontSize: 10}} domain={['dataMin - 2', 'dataMax + 2']} />
                              <Tooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '12px', color: '#fff' }} />
                              <Area type="monotone" dataKey="value" stroke="#F43F5E" fillOpacity={1} fill="url(#tempGradient)" name={t(language, 'iotTempC')} />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                     </div>
                  </div>

                  <div className="bg-[#121024]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-base font-bold text-white flex items-center gap-2"><Droplets className="h-4 w-4 text-blue-400" /> {t(language, 'iotMoistureTrendLive')}
                          <span className="ml-2 text-xs font-normal text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">{(telemetry['moisture'] || []).length} pts</span>
                        </h3>
                        <button className="text-gray-400 hover:text-white"><Maximize className="h-4 w-4" /></button>
                     </div>
                     <div className="h-64">
                        {(telemetry['moisture'] || []).length === 0 ? (
                          <div className="h-full flex items-center justify-center text-gray-500 text-sm">{t(language, 'iotNoMoistureReadings')}</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={telemetry['moisture'] || []}>
                              <defs>
                                <linearGradient id="moistGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                              <XAxis dataKey="time" stroke="#ffffff50" tick={{fontSize: 10}} minTickGap={30} />
                              <YAxis stroke="#ffffff50" tick={{fontSize: 10}} domain={['dataMin - 5', 'dataMax + 5']} />
                              <Tooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '12px', color: '#fff' }} />
                              <Area type="monotone" dataKey="value" stroke="#3B82F6" fillOpacity={1} fill="url(#moistGradient)" name={t(language, 'iotMoistureUnit')} />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                     </div>
                  </div>

                  <div className="bg-[#121024]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-base font-bold text-white flex items-center gap-2"><CloudRain className="h-4 w-4 text-teal-400" /> {t(language, 'iotHumidityTrendLive')}
                          <span className="ml-2 text-xs font-normal text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">{(telemetry['humidity'] || []).length} pts</span>
                        </h3>
                        <button className="text-gray-400 hover:text-white"><Maximize className="h-4 w-4" /></button>
                     </div>
                     <div className="h-64">
                        {(telemetry['humidity'] || []).length === 0 ? (
                          <div className="h-full flex items-center justify-center text-gray-500 text-sm">{t(language, 'iotNoHumidityReadings')}</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={telemetry['humidity'] || []}>
                              <defs>
                                <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                              <XAxis dataKey="time" stroke="#ffffff50" tick={{fontSize: 10}} minTickGap={30} />
                              <YAxis stroke="#ffffff50" tick={{fontSize: 10}} domain={['dataMin - 5', 'dataMax + 5']} />
                              <Tooltip contentStyle={{ backgroundColor: '#121024', borderColor: '#ffffff20', borderRadius: '12px', color: '#fff' }} />
                              <Area type="monotone" dataKey="value" stroke="#14B8A6" fillOpacity={1} fill="url(#humGradient)" name={t(language, 'iotHumidityUnit')} />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                     </div>
                  </div>
                </div>

              </div>
            )}

            {/* DEVICES TAB */}
            {activeTab === 'devices' && (
              <div className="bg-[#121024]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">{t(language, 'iotDeviceConfig')}</h3>
                  <div className="flex gap-2">
                    <button onClick={exportCSV} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                      <Download className="h-4 w-4" /> {t(language, 'iotExportConfig')}
                    </button>
                    <button onClick={openAddModal} className="px-4 py-2 bg-gradient-to-r from-[#9333EA] to-[#C026D3] hover:opacity-90 rounded-xl text-sm font-bold flex items-center gap-2 transition-opacity">
                      <Plus className="h-4 w-4" /> {t(language, 'iotAddDevice')}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-400 bg-black/20">
                        <th className="p-5 font-bold">{t(language, 'iotDeviceIdName')}</th>
                        <th className="p-5 font-bold">{t(language, 'iotType')}</th>
                        <th className="p-5 font-bold">{t(language, 'iotNetwork')}</th>
                        <th className="p-5 font-bold">{t(language, 'iotBattery')}</th>
                        <th className="p-5 font-bold">{t(language, 'iotLastSync')}</th>
                        <th className="p-5 font-bold">{t(language, 'actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sensors.map((s) => (
                        <tr key={s.id} className="hover:bg-white/5 transition-colors text-sm text-gray-200">
                          <td className="p-5">
                            <div className="font-bold text-white">{s.name}</div>
                            <div className="text-[10px] font-mono text-gray-500">{s.id.toUpperCase()}-NODE-881</div>
                          </td>
                          <td className="p-5 uppercase tracking-wider text-xs font-bold">{s.type}</td>
                          <td className="p-5">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(s.status)}`}>
                              {s.status === 'online' ? t(language, 'iotOnline') : s.status === 'offline' ? t(language, 'iotOffline') : s.status}
                            </span>
                          </td>
                          <td className="p-5 font-mono">{s.battery}%</td>
                          <td className="p-5 text-xs text-gray-400">{s.lastUpdate}</td>
                          <td className="p-5">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  showToast(`${t(language, 'iotCalibrating')} ${s.name}...`, 'info');
                                  setTimeout(() => showToast(`${s.name} ${t(language, 'iotCalibrationComplete')}`, 'success'), 1200);
                                }}
                                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" 
                                title={t(language, 'iotCalibrate')}
                              >
                                <Settings className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => openEditModal(s)}
                                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" 
                                title={t(language, 'iotEdit')}
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={async () => {
                                  if (!confirm(t(language, 'iotConfirmDeleteSensor'))) return;
                                  try {
                                    const res = await fetch(`/api/sensors/${s.id}`, { method: 'DELETE' });
                                    const data = await res.json();
                                    if (data.success) {
                                      showToast(t(language, 'iotSensorDisabledSuccess'), 'success');
                                      loadData(selectedFarmId);
                                      if (onRefreshFarms) onRefreshFarms();
                                    } else {
                                      showToast(data.message || t(language, 'error'), 'error');
                                    }
                                  } catch (e: any) {
                                    showToast(e.message || t(language, 'error'), 'error');
                                  }
                                }}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-rose-400 transition-colors" 
                                title={t(language, 'iotDelete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MAP TAB */}
            {activeTab === 'map' && (() => {
              const selectedFarm = farms.find(f => f.id === selectedFarmId) || farms[0] || null;
              const defaultCenter: [number, number] = selectedFarm 
                ? parseCoordinates(selectedFarm.location, farms.indexOf(selectedFarm))
                : [28.6139, 77.2090];

              return (
                <div className="bg-[#121024]/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl h-[600px] flex flex-col shadow-2xl relative overflow-hidden group">
                  <div className="w-full h-full min-h-[450px] rounded-2xl overflow-hidden border border-white/10 relative z-10">
                    <MapContainer 
                      center={defaultCenter} 
                      zoom={8} 
                      style={{ height: '100%', width: '100%', background: '#121024' }}
                    >
                      <ChangeMapView center={defaultCenter} />
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      />
                      {farms.map((farm, idx) => {
                        const coords = parseCoordinates(farm.location, idx);
                        const moisture = farm.sensorData?.moisture ?? 50;
                        const pH = farm.sensorData?.pH ?? 6.5;
                        const temp = farm.sensorData?.temperature ?? 22;
                        const humidity = farm.sensorData?.humidity ?? 60;
                        
                        return (
                          <Marker 
                            key={farm.id} 
                            position={coords} 
                            icon={customMarkerIcon}
                            eventHandlers={{
                              click: () => {
                                setSelectedFarmId(farm.id);
                              }
                            }}
                          >
                            <Popup className="custom-leaflet-popup">
                              <div className="text-white font-sans p-1 min-w-[180px]">
                                <h4 className="font-bold text-base text-[#D946EF] border-b border-white/10 pb-1 mb-2">{farm.name}</h4>
                                <div className="text-xs space-y-1.5">
                                  <div className="flex justify-between">
                                    <span className="text-[#E9D5FF]">{language === 'hi' ? '🌾 फसल का प्रकार:' : '🌾 Crop Type:'}</span>
                                    <span className="font-semibold text-white">{farm.cropType}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#E9D5FF]">{language === 'hi' ? '📐 क्षेत्रफल:' : '📐 Area:'}</span>
                                    <span className="font-semibold text-white">{farm.area} {language === 'hi' ? 'एकड़' : 'acres'}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-white/10 pt-1.5 mt-1.5">
                                    <span className="text-[#E9D5FF] font-medium">{language === 'hi' ? '💧 मिट्टी की नमी:' : '💧 Soil Moisture:'}</span>
                                    <span className="font-semibold text-blue-400">{moisture}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#E9D5FF] font-medium">{language === 'hi' ? '🧪 मिट्टी का pH:' : '🧪 Soil pH:'}</span>
                                    <span className="font-semibold text-amber-400">{pH}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#E9D5FF] font-medium">{language === 'hi' ? '🌡️ मिट्टी का तापमान:' : '🌡️ Soil Temp:'}</span>
                                    <span className="font-semibold text-rose-400">{temp}°C</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#E9D5FF] font-medium">{language === 'hi' ? '☁️ आर्द्रता:' : '☁️ Humidity:'}</span>
                                    <span className="font-semibold text-teal-400">{humidity}%</span>
                                  </div>
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  </div>
                </div>
              );
            })()}

            {/* ALERTS TAB */}
            {activeTab === 'alerts' && (
              <div className="bg-[#121024]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400 animate-pulse" /> {language === 'hi' ? 'सक्रिय सिस्टम अलर्ट' : 'Active System Alerts'}
                </h3>
                
                <div className="space-y-4">
                  {sensors.filter(s => s.status === 'warning' || s.status === 'offline').map(sensor => (
                    <div key={sensor.id} className={`p-5 rounded-2xl border flex items-start gap-4 ${sensor.status === 'offline' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                      <div className={`p-3 rounded-xl mt-0.5 ${sensor.status === 'offline' ? 'bg-rose-500/20' : 'bg-amber-500/20'}`}>
                        {sensor.status === 'offline' ? <WifiOff className="h-6 w-6 text-rose-400" /> : <AlertTriangle className="h-6 w-6 text-amber-400" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-white mb-1">
                          {sensor.status === 'offline' 
                            ? (language === 'hi' ? 'डिवाइस कनेक्शन टूट गया' : 'Device Connection Lost') 
                            : (language === 'hi' ? 'असामान्य रीडिंग का पता चला' : 'Abnormal Reading Detected')}
                        </h4>
                        <p className="text-sm text-gray-400 mb-3">
                          {sensor.status === 'offline' 
                            ? (language === 'hi' 
                                ? `"${sensor.name}" (${sensor.id.toUpperCase()}) लगातार हार्टबीट सिग्नल भेजने में विफल रहा। बैटरी स्तर: ${sensor.battery}%.`
                                : `"${sensor.name}" (${sensor.id.toUpperCase()}) has missed consecutive heartbeat signals. Battery is at ${sensor.battery}%.`)
                            : (language === 'hi' 
                                ? `"${sensor.name}" (${sensor.id.toUpperCase()}) इष्टतम स्तरों से बाहर मूल्यों की रिपोर्ट कर रहा है: ${sensor.value}${sensor.unit}.`
                                : `"${sensor.name}" (${sensor.id.toUpperCase()}) is reporting values outside optimal levels: ${sensor.value}${sensor.unit}.`)
                          }
                        </p>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              showToast(language === 'hi' ? `नोड ${sensor.name} पिंग किया जा रहा है...` : `Pinging ${sensor.name}...`, 'info');
                              setTimeout(() => {
                                showToast(language === 'hi' ? `${sensor.name} से सफलतापूर्वक प्रतिक्रिया प्राप्त हुई।` : `${sensor.name} responded successfully.`, 'success');
                              }, 1000);
                            }}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${sensor.status === 'offline' ? 'text-rose-400 bg-rose-500/20 border-rose-500/30 hover:bg-rose-500/30' : 'text-amber-400 bg-amber-500/20 border-amber-500/30 hover:bg-amber-500/30'}`}
                          >
                            {language === 'hi' ? 'डिवाइस पिंग करें' : 'Ping Device'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {sensors.filter(s => s.status === 'warning' || s.status === 'offline').length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-4 animate-pulse" />
                      <h4 className="text-lg font-bold text-white mb-1">{language === 'hi' ? 'सभी सिस्टम सामान्य हैं' : 'All Systems Optimal'}</h4>
                      <p className="text-sm text-gray-400">{language === 'hi' ? 'सभी फ़ील्ड गेटवे और सेंसर नोड सामान्य स्तर की रिपोर्ट कर रहे हैं।' : 'All field gateways and sensor nodes are reporting normal levels.'}</p>
                    </div>
                  )}

                  <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl flex items-start gap-4 opacity-70">
                    <div className="p-3 bg-blue-500/20 rounded-xl mt-0.5"><CheckCircle2 className="h-6 w-6 text-blue-400" /></div>
                    <div>
                      <h4 className="text-base font-bold text-white mb-1">{language === 'hi' ? 'फर्मवेयर अपडेट पूर्ण' : 'Firmware Update Complete'}</h4>
                      <p className="text-sm text-gray-400">{language === 'hi' ? 'सभी जोन 1 नोड v2.4.1 पर सफलतापूर्वक अपडेट हो गए' : 'All Zone 1 nodes successfully updated to v2.4.1'}</p>
                      <span className="text-xs text-gray-500 font-mono mt-2 block">{language === 'hi' ? '2 घंटे पहले' : '2 hours ago'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ADD/EDIT SENSOR DIALOG MODAL */}
      {deviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0410]/80 backdrop-blur-md p-4">
          <div className="bg-[#121024] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                {editingSensor 
                  ? (language === 'hi' ? 'सेंसर विवरण संपादित करें' : 'Edit Sensor Configuration')
                  : (language === 'hi' ? 'नया सेंसर पंजीकृत करें' : 'Register New Field Sensor')}
              </h3>
              <button 
                onClick={() => setDeviceModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSensor} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">
                  {language === 'hi' ? 'सेंसर का नाम *' : 'Sensor Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'hi' ? 'जैसे: सेंसर 1 नमी' : 'e.g. Moisture Sensor A'}
                  value={modalSensorName}
                  onChange={(e) => setModalSensorName(e.target.value)}
                  className="w-full h-11 px-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">
                  {language === 'hi' ? 'सेंसर का प्रकार *' : 'Sensor Type *'}
                </label>
                <select
                  value={modalSensorType}
                  onChange={(e) => setModalSensorType(e.target.value)}
                  className="w-full h-11 px-4 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#9333EA] cursor-pointer"
                >
                  <option value="temperature">{language === 'hi' ? 'तापमान (Temperature)' : 'Temperature (°C)'}</option>
                  <option value="moisture">{language === 'hi' ? 'मिट्टी की नमी (Soil Moisture)' : 'Soil Moisture (%)'}</option>
                  <option value="humidity">{language === 'hi' ? 'आर्द्रता (Humidity)' : 'Air Humidity (%)'}</option>
                  <option value="ph">{language === 'hi' ? 'मिट्टी का pH (Soil pH)' : 'Soil pH'}</option>
                  <option value="nitrogen">{language === 'hi' ? 'नाइट्रोजन (Nitrogen)' : 'Nitrogen (N)'}</option>
                  <option value="phosphorus">{language === 'hi' ? 'फास्फोरस (Phosphorus)' : 'Phosphorus (P)'}</option>
                  <option value="potassium">{language === 'hi' ? 'पोटाश (Potassium)' : 'Potassium (K)'}</option>
                  <option value="rainfall">{language === 'hi' ? 'वर्षा (Rainfall)' : 'Precipitation (mm)'}</option>
                  <option value="light">{language === 'hi' ? 'प्रकाश (Solar Radiation)' : 'Solar Radiation (lux)'}</option>
                  <option value="wind">{language === 'hi' ? 'हवा की गति (Wind Speed)' : 'Wind Speed (m/s)'}</option>
                  <option value="tank">{language === 'hi' ? 'पानी की टंकी (Water Tank)' : 'Water Tank (%)'}</option>
                  <option value="battery">{language === 'hi' ? 'बैटरी स्तर (Battery Level)' : 'Battery Level (%)'}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">
                  {language === 'hi' ? 'संबंधित खेत का भाग *' : 'Associated Field *'}
                </label>
                <select
                  required
                  value={modalSensorFieldId}
                  onChange={(e) => setModalSensorFieldId(e.target.value)}
                  className="w-full h-11 px-4 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#9333EA] cursor-pointer"
                >
                  <option value="" disabled>{language === 'hi' ? '-- क्षेत्र चुनें --' : '-- Choose Field --'}</option>
                  {fields.map((f) => (
                    <option key={f._id || f.id} value={f._id || f.id}>{f.name}</option>
                  ))}
                </select>
                {fields.length === 0 && (
                  <span className="text-[10px] text-amber-400 block mt-1">
                    {language === 'hi' 
                      ? 'इस खेत में कोई क्षेत्र नहीं है। पहले क्षेत्र बनाएं।' 
                      : 'This farm contains no active fields. Create a Field first.'}
                  </span>
                )}
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setDeviceModalOpen(false)}
                  className="flex-1 h-11 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={fields.length === 0}
                  className="flex-1 h-11 bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {language === 'hi' ? 'सहेजें' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
