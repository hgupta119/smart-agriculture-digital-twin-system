import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Plus, Loader2, CheckCircle2, AlertCircle, Sprout, Layers, 
  MapPin, Wifi, Activity, Droplets, Microscope, Sun, Thermometer, Wind,
  Trash2, Edit3, Search, RefreshCw, X, ChevronDown, ChevronRight, FileText, ClipboardList, AlertTriangle
} from 'lucide-react';
import { Farm, User } from '../types';
import { fetch } from '../utils/api';
import { CROP_TYPES } from '../utils/simData';
import { t as tr } from '../utils/i18n';

interface DataEntryProps {
  user: User;
  farms: Farm[];
  onRefreshFarms: () => Promise<void>;
  language?: 'en' | 'hi';
}

type RecordType = 
  | 'farm' 
  | 'field' 
  | 'crop' 
  | 'sensor' 
  | 'reading' 
  | 'irrigation' 
  | 'fertilizer' 
  | 'disease' 
  | 'weather';

const RECORD_TYPES: { id: RecordType; label: string; icon: any; color: string; bg: string }[] = [
  { id: 'farm', label: 'Add Farm', icon: MapPin, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  { id: 'field', label: 'Add Field', icon: Layers, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'crop', label: 'Add Crop', icon: Sprout, color: 'text-green-400', bg: 'bg-green-500/10' },
  { id: 'sensor', label: 'Add Sensor', icon: Wifi, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { id: 'reading', label: 'Sensor Reading', icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { id: 'irrigation', label: 'Irrigation Event', icon: Droplets, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { id: 'fertilizer', label: 'Fertilizer Record', icon: Microscope, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'disease', label: 'Disease Report', icon: Sprout, color: 'text-red-400', bg: 'bg-red-500/10' },
];

export const getRecordTypeLabel = (id: string, lang: 'en' | 'hi') => {
  if (lang === 'hi') {
    switch (id) {
      case 'farm': return 'फार्म जोड़ें';
      case 'field': return 'खेत जोड़ें';
      case 'crop': return 'फसल जोड़ें';
      case 'sensor': return 'सेंसर जोड़ें';
      case 'reading': return 'सेंसर रीडिंग';
      case 'irrigation': return 'सिंचाई विवरण';
      case 'fertilizer': return 'उर्वरक रिकॉर्ड';
      case 'disease': return 'रोग रिपोर्ट';
      case 'weather': return 'मौसम रिकॉर्ड';
      default: return id;
    }
  }
  switch (id) {
    case 'farm': return 'Add Farm';
    case 'field': return 'Add Field';
    case 'crop': return 'Add Crop';
    case 'sensor': return 'Add Sensor';
    case 'reading': return 'Sensor Reading';
    case 'irrigation': return 'Irrigation Event';
    case 'fertilizer': return 'Fertilizer Record';
    case 'disease': return 'Disease Report';
    case 'weather': return 'Weather Record';
    default: return id;
  }
};

const dataTrans = {
  en: {
    // Header
    pageTitle: 'Agricultural Record Registry',
    pageSubtitle: 'Configure and manage agricultural twin records securely inside your database.',
    createRecords: 'Create Records',
    manageRecords: 'Manage Records',
    recordSelection: 'Record Selection',
    // Form shared
    form: 'Form',
    selectFarm: 'Select Farm',
    selectField: 'Select Field',
    selectSensor: 'Select Sensor',
    chooseFarm: '-- Choose Farm --',
    chooseField: '-- Choose Field --',
    chooseSensor: '-- Choose Sensor --',
    noFieldsWarning: 'This farm contains no active fields. Create a Field first.',
    noSensorsWarning: 'No sensors registered on this farm. Create a Sensor first.',
    addRecord: 'Add Record',
    // Farm form
    farmName: 'Farm Name',
    farmNameHint: 'Unique identifier. Min 3 characters.',
    farmNamePlaceholder: 'e.g. Green Valley Farm',
    farmArea: 'Total Farm Area (Acres)',
    farmAreaPlaceholder: 'e.g. 100',
    farmLocation: 'Location',
    farmLocationPlaceholder: 'e.g. Delhi, IN',
    // Field form
    fieldName: 'Field Name',
    fieldNamePlaceholder: 'e.g. North Field',
    fieldArea: 'Field Area (Acres)',
    fieldAreaPlaceholder: 'e.g. 40',
    preferredCrop: 'Preferred Crop (Optional)',
    preferredCropNone: '-- None / Optional --',
    preferredCropHint: 'This is a preferred crop plan for this field and does not create an active crop record.',
    gpsCoords: 'GPS Coordinates (Optional)',
    gpsPlaceholder: 'e.g. 28.6139° N, 77.2090° E',
    // Crop form
    cropNameLabel: 'Crop Name',
    cropNamePlaceholder: 'e.g. Wheat',
    cropVariety: 'Variety',
    cropVarietyPlaceholder: 'e.g. HD 2967',
    plantedDate: 'Planted Date',
    // Sensor form
    sensorIdentifier: 'Sensor Identifier',
    sensorIdentifierPlaceholder: 'e.g. Node 1 Moisture',
    sensorType: 'Sensor Type',
    sensorTemp: 'Temperature (°C)',
    sensorMoisture: 'Soil Moisture (%)',
    sensorHumidity: 'Air Humidity (%)',
    sensorPH: 'Soil pH',
    sensorNitrogen: 'Nitrogen (N)',
    sensorPhosphorus: 'Phosphorus (P)',
    sensorPotassium: 'Potassium (K)',
    sensorRainfall: 'Precipitation (mm)',
    sensorLight: 'Solar Radiation (lux)',
    sensorWind: 'Wind Speed (m/s)',
    sensorTank: 'Water Tank (%)',
    sensorBattery: 'Battery Level (%)',
    // Reading form
    readingValue: 'Telemetry Reading Value',
    readingPlaceholder: 'e.g. 48.5',
    // Irrigation form
    irrigationDuration: 'Duration (Minutes)',
    irrigationDurationPlaceholder: 'e.g. 30',
    irrigationWater: 'Water Discharged (Liters)',
    irrigationWaterPlaceholder: 'e.g. 800',
    irrigationStatus: 'Execution Status',
    irrigationCompleted: 'Completed',
    irrigationScheduled: 'Scheduled',
    // Fertilizer form
    fertilizerBlend: 'Fertilizer Blend Type',
    fertilizerBlendPlaceholder: 'e.g. Urea or NPK 12-32-16',
    fertilizerQuantity: 'Quantity Dispersed (kg)',
    fertilizerQuantityPlaceholder: 'e.g. 150',
    // Disease form
    cropCategory: 'Crop category',
    diseaseName: 'Detected Disease/Pathogen',
    diseaseNamePlaceholder: 'e.g. Leaf Rust',
    scanConfidence: 'Scan Confidence (%)',
    scanConfidencePlaceholder: 'e.g. 92',
    treatmentPlan: 'AI Suggested Treatment Plan',
    treatmentPlaceholder: 'e.g. Apply copper fungicide, isolate infected nodes, optimize canopy spacing...',
    // Weather form
    farmMapping: 'Farm Mapping (Optional)',
    allTwinRegions: '-- All Twin Regions --',
    weatherCondition: 'Weather Condition',
    weatherSunny: 'Sunny',
    weatherCloudy: 'Cloudy',
    weatherRainy: 'Rainy',
    weatherStormy: 'Stormy',
    weatherWindy: 'Windy',
    tempLabel: 'Temp (°C)',
    humidLabel: 'Humid (%)',
    windLabel: 'Wind (km/h)',
    rainLabel: 'Rain (mm)',
    // Status Preview
    statusPreview: 'Status Preview',
    selectedFarm: 'Selected Farm',
    farmSize: 'Farm Size',
    fieldsCount: 'Fields count',
    remainingArea: 'Remaining Area budget',
    areaHint: 'Before saving changes, make sure total field sizes fit within remaining farm acreage limits.',
    selectFarmHint: 'Select a farm to view remaining available area budget.',
    registeringFarm: 'Registering Farm',
    farmPreviewHint: 'Farms registered here represent core digital twin anchors that contain connected fields and crops.',
    // Field Created Prompt
    fieldCreatedTitle: 'Field Created Successfully',
    fieldCreatedMsg: 'has been registered.',
    addCropPrompt: 'Would you like to add your first crop to this field?',
    addCropNow: 'Add Crop Now',
    later: 'Later',
    // Hierarchy Explorer
    twinHierarchies: 'Agricultural Twin Hierarchies',
    syncHierarchy: 'Sync records hierarchy',
    searchPlaceholder: 'Search farm, field, crop name...',
    loadingTwins: 'Loading digital twin nested configurations...',
    noTwinsFound: 'No active farm twins registered in database matching search parameters.',
    noFieldsCreated: 'No fields have been created yet.',
    noCropsOrSensors: 'No crops or sensor nodes configured. Add Crops/Sensors records.',
    sensors: 'Sensors',
    noSensorsConfigured: 'No field sensors configured.',
    telemetryRecords: 'Telemetry Records',
    noReadingsLogged: 'No sensor readings logged.',
    reading: 'Reading',
    fieldSensorsNoCrop: 'Field Sensors (No active crop)',
    planted: 'Planted',
    battery: 'Battery',
    // Delete block popup
    dependencySafetyBlock: 'Dependency Safety Block',
    understood: 'Understood',
    deleteFarmBlocked: 'This farm contains active fields. Delete or reassign them first.',
    deleteFieldBlocked: 'This field contains active crops. Delete or reassign them first.',
    deleteConfirm: 'Are you sure you want to delete this record?',
    // Toast messages
    recordRegistered: 'Record registered successfully!',
    recordUpdated: 'Record updated successfully',
    recordDeleted: 'Record deleted successfully',
    syncError: 'Error syncing digital twin records database.',
    // Validation messages
    valFarmName: 'Farm name must be at least 3 characters.',
    valAreaPositive: 'Area must be greater than 0.',
    valAreaMax: 'Area cannot exceed 100,000 acres.',
    valLocation: 'Location cannot be empty.',
    valFarmExists: 'A farm with this name already exists.',
    valSelectFarm: 'Please select a parent farm.',
    valFieldName: 'Field name must be at least 2 characters.',
    valFieldArea: 'Total field area cannot exceed farm area.',
    valSelectFarmCrop: 'Please select a farm.',
    valSelectFieldCrop: 'Please select a field.',
    valCropName: 'Crop name cannot be empty.',
    valCropVariety: 'Crop variety is required.',
    valPlantedDate: 'Planted date is required.',
    valSelectFarmSensor: 'Please select a farm.',
    valSensorId: 'Sensor identifier is required.',
    valSelectSensor: 'Please select a sensor.',
    valReadingValue: 'Please enter a valid reading value.',
    valSelectFarmIrrigation: 'Please select a farm.',
    valDuration: 'Duration must be greater than 0.',
    valWaterAmount: 'Water amount must be greater than 0.',
    valSelectFarmFertilizer: 'Please select a farm.',
    valFertilizerType: 'Fertilizer type is required.',
    valFertilizerQty: 'Quantity must be greater than 0.',
    valDiseaseName: 'Disease name is required.',
    valConfidenceRange: 'Confidence must be between 0 and 100%.',
    valTreatment: 'Recommended treatment action is required.',
    valTemp: 'Temperature must be a valid number.',
    valHumidity: 'Humidity must be between 0 and 100%.',
    valWind: 'Wind speed must be positive.',
    valRain: 'Rainfall must be positive.',
    // Acres unit
    acres: 'Acres',
  },
  hi: {
    // Header
    pageTitle: 'कृषि रिकॉर्ड रजिस्ट्री',
    pageSubtitle: 'डेटाबेस के भीतर सुरक्षित रूप से कृषि ट्विन रिकॉर्ड कॉन्फ़िगर और प्रबंधित करें।',
    createRecords: 'रिकॉर्ड बनाएं',
    manageRecords: 'रिकॉर्ड प्रबंधित करें',
    recordSelection: 'रिकॉर्ड चयन',
    // Form shared
    form: 'फॉर्म',
    selectFarm: 'फार्म चुनें',
    selectField: 'खेत चुनें',
    selectSensor: 'सेंसर चुनें',
    chooseFarm: '-- फार्म चुनें --',
    chooseField: '-- खेत चुनें --',
    chooseSensor: '-- सेंसर चुनें --',
    noFieldsWarning: 'इस फार्म में कोई सक्रिय खेत नहीं है। पहले खेत बनाएं।',
    noSensorsWarning: 'इस फार्म पर कोई सेंसर पंजीकृत नहीं है। पहले सेंसर बनाएं।',
    addRecord: 'रिकॉर्ड जोड़ें',
    // Farm form
    farmName: 'फार्म का नाम',
    farmNameHint: 'अद्वितीय पहचानकर्ता। न्यूनतम 3 अक्षर।',
    farmNamePlaceholder: 'जैसे: हरी घाटी फार्म',
    farmArea: 'कुल फार्म क्षेत्र (एकड़)',
    farmAreaPlaceholder: 'जैसे: 100',
    farmLocation: 'स्थान',
    farmLocationPlaceholder: 'जैसे: दिल्ली, IN',
    // Field form
    fieldName: 'खेत का नाम',
    fieldNamePlaceholder: 'जैसे: उत्तरी खेत',
    fieldArea: 'खेत क्षेत्र (एकड़)',
    fieldAreaPlaceholder: 'जैसे: 40',
    preferredCrop: 'पसंदीदा फसल (वैकल्पिक)',
    preferredCropNone: '-- कोई नहीं / वैकल्पिक --',
    preferredCropHint: 'यह खेत की पसंदीदा फसल योजना है और सक्रिय फसल रिकॉर्ड नहीं बनाता।',
    gpsCoords: 'GPS निर्देशांक (वैकल्पिक)',
    gpsPlaceholder: 'जैसे: 28.6139° N, 77.2090° E',
    // Crop form
    cropNameLabel: 'फसल का नाम',
    cropNamePlaceholder: 'जैसे: गेहूं',
    cropVariety: 'किस्म',
    cropVarietyPlaceholder: 'जैसे: HD 2967',
    plantedDate: 'बुआई तिथि',
    // Sensor form
    sensorIdentifier: 'सेंसर पहचानकर्ता',
    sensorIdentifierPlaceholder: 'जैसे: नोड 1 नमी',
    sensorType: 'सेंसर प्रकार',
    sensorTemp: 'तापमान (Temperature)',
    sensorMoisture: 'मिट्टी की नमी (Soil Moisture)',
    sensorHumidity: 'आर्द्रता (Humidity)',
    sensorPH: 'मिट्टी का pH (Soil pH)',
    sensorNitrogen: 'नाइट्रोजन (Nitrogen)',
    sensorPhosphorus: 'फास्फोरस (Phosphorus)',
    sensorPotassium: 'पोटाश (Potassium)',
    sensorRainfall: 'वर्षा (Rainfall)',
    sensorLight: 'प्रकाश (Solar Radiation)',
    sensorWind: 'हवा की गति (Wind Speed)',
    sensorTank: 'पानी की टंकी (Water Tank)',
    sensorBattery: 'बैटरी स्तर (Battery Level)',
    // Reading form
    readingValue: 'टेलीमेट्री रीडिंग मूल्य',
    readingPlaceholder: 'जैसे: 48.5',
    // Irrigation form
    irrigationDuration: 'अवधि (मिनट)',
    irrigationDurationPlaceholder: 'जैसे: 30',
    irrigationWater: 'पानी की मात्रा (लीटर)',
    irrigationWaterPlaceholder: 'जैसे: 800',
    irrigationStatus: 'निष्पादन स्थिति',
    irrigationCompleted: 'पूर्ण',
    irrigationScheduled: 'निर्धारित',
    // Fertilizer form
    fertilizerBlend: 'उर्वरक मिश्रण प्रकार',
    fertilizerBlendPlaceholder: 'जैसे: यूरिया या NPK 12-32-16',
    fertilizerQuantity: 'मात्रा (किग्रा)',
    fertilizerQuantityPlaceholder: 'जैसे: 150',
    // Disease form
    cropCategory: 'फसल श्रेणी',
    diseaseName: 'पता चला रोग / रोगज़नक़',
    diseaseNamePlaceholder: 'जैसे: पत्ती जंग',
    scanConfidence: 'स्कैन विश्वास (%)',
    scanConfidencePlaceholder: 'जैसे: 92',
    treatmentPlan: 'AI सुझाया उपचार योजना',
    treatmentPlaceholder: 'जैसे: कॉपर फफूंदनाशक लगाएं, संक्रमित नोड्स अलग करें...',
    // Weather form
    farmMapping: 'फार्म मैपिंग (वैकल्पिक)',
    allTwinRegions: '-- सभी ट्विन क्षेत्र --',
    weatherCondition: 'मौसम की स्थिति',
    weatherSunny: 'धूप',
    weatherCloudy: 'बादल',
    weatherRainy: 'बारिश',
    weatherStormy: 'तूफानी',
    weatherWindy: 'हवादार',
    tempLabel: 'तापमान (°C)',
    humidLabel: 'आर्द्रता (%)',
    windLabel: 'हवा (km/h)',
    rainLabel: 'वर्षा (mm)',
    // Status Preview
    statusPreview: 'स्थिति पूर्वावलोकन',
    selectedFarm: 'चयनित फार्म',
    farmSize: 'फार्म का आकार',
    fieldsCount: 'खेत संख्या',
    remainingArea: 'शेष क्षेत्र बजट',
    areaHint: 'परिवर्तन सहेजने से पहले सुनिश्चित करें कि कुल खेत आकार शेष फार्म एकड़ सीमा में फिट हो।',
    selectFarmHint: 'उपलब्ध क्षेत्र बजट देखने के लिए फार्म चुनें।',
    registeringFarm: 'फार्म पंजीकृत करना',
    farmPreviewHint: 'यहां पंजीकृत फार्म मुख्य डिजिटल ट्विन एंकर का प्रतिनिधित्व करते हैं।',
    // Field Created Prompt
    fieldCreatedTitle: 'खेत सफलतापूर्वक बनाया गया',
    fieldCreatedMsg: 'पंजीकृत हो गया है।',
    addCropPrompt: 'क्या आप इस खेत में अपनी पहली फसल जोड़ना चाहेंगे?',
    addCropNow: 'अभी फसल जोड़ें',
    later: 'बाद में',
    // Hierarchy Explorer
    twinHierarchies: 'कृषि ट्विन पदानुक्रम',
    syncHierarchy: 'रिकॉर्ड पदानुक्रम सिंक करें',
    searchPlaceholder: 'फार्म, खेत, फसल नाम खोजें...',
    loadingTwins: 'डिजिटल ट्विन कॉन्फ़िगरेशन लोड हो रही है...',
    noTwinsFound: 'खोज पैरामीटर से मेल खाने वाला कोई सक्रिय फार्म ट्विन पंजीकृत नहीं।',
    noFieldsCreated: 'अभी तक कोई खेत नहीं बनाया गया।',
    noCropsOrSensors: 'कोई फसल या सेंसर नोड कॉन्फ़िगर नहीं। फसल/सेंसर रिकॉर्ड जोड़ें।',
    sensors: 'सेंसर',
    noSensorsConfigured: 'कोई फील्ड सेंसर कॉन्फ़िगर नहीं।',
    telemetryRecords: 'टेलीमेट्री रिकॉर्ड',
    noReadingsLogged: 'कोई सेंसर रीडिंग दर्ज नहीं।',
    reading: 'रीडिंग',
    fieldSensorsNoCrop: 'फील्ड सेंसर (कोई सक्रिय फसल नहीं)',
    planted: 'बुआई',
    battery: 'बैटरी',
    // Delete block popup
    dependencySafetyBlock: 'निर्भरता सुरक्षा अवरोध',
    understood: 'समझ गया',
    deleteFarmBlocked: 'इस फार्म में सक्रिय खेत हैं। पहले उन्हें हटाएं या पुनः आवंटित करें।',
    deleteFieldBlocked: 'इस खेत में सक्रिय फसलें हैं। पहले उन्हें हटाएं या पुनः आवंटित करें।',
    deleteConfirm: 'क्या आप वाकई इस रिकॉर्ड को हटाना चाहते हैं?',
    // Toast messages
    recordRegistered: 'रिकॉर्ड सफलतापूर्वक पंजीकृत!',
    recordUpdated: 'रिकॉर्ड सफलतापूर्वक अपडेट किया गया',
    recordDeleted: 'रिकॉर्ड सफलतापूर्वक हटाया गया',
    syncError: 'डिजिटल ट्विन रिकॉर्ड डेटाबेस सिंक करने में त्रुटि।',
    // Validation messages
    valFarmName: 'फार्म नाम कम से कम 3 अक्षर का होना चाहिए।',
    valAreaPositive: 'क्षेत्र 0 से अधिक होना चाहिए।',
    valAreaMax: 'क्षेत्र 100,000 एकड़ से अधिक नहीं हो सकता।',
    valLocation: 'स्थान खाली नहीं हो सकता।',
    valFarmExists: 'इस नाम का फार्म पहले से मौजूद है।',
    valSelectFarm: 'कृपया पैरेंट फार्म चुनें।',
    valFieldName: 'खेत का नाम कम से कम 2 अक्षर का होना चाहिए।',
    valFieldArea: 'कुल खेत क्षेत्र फार्म क्षेत्र से अधिक नहीं हो सकता।',
    valSelectFarmCrop: 'कृपया एक फार्म चुनें।',
    valSelectFieldCrop: 'कृपया एक खेत चुनें।',
    valCropName: 'फसल का नाम खाली नहीं हो सकता।',
    valCropVariety: 'फसल किस्म आवश्यक है।',
    valPlantedDate: 'बुआई तिथि आवश्यक है।',
    valSelectFarmSensor: 'कृपया एक फार्म चुनें।',
    valSensorId: 'सेंसर पहचानकर्ता आवश्यक है।',
    valSelectSensor: 'कृपया एक सेंसर चुनें।',
    valReadingValue: 'कृपया एक वैध रीडिंग मूल्य दर्ज करें।',
    valSelectFarmIrrigation: 'कृपया एक फार्म चुनें।',
    valDuration: 'अवधि 0 से अधिक होनी चाहिए।',
    valWaterAmount: 'पानी की मात्रा 0 से अधिक होनी चाहिए।',
    valSelectFarmFertilizer: 'कृपया एक फार्म चुनें।',
    valFertilizerType: 'उर्वरक प्रकार आवश्यक है।',
    valFertilizerQty: 'मात्रा 0 से अधिक होनी चाहिए।',
    valDiseaseName: 'रोग का नाम आवश्यक है।',
    valConfidenceRange: 'विश्वास 0 और 100% के बीच होना चाहिए।',
    valTreatment: 'अनुशंसित उपचार क्रिया आवश्यक है।',
    valTemp: 'तापमान एक वैध संख्या होनी चाहिए।',
    valHumidity: 'आर्द्रता 0 और 100% के बीच होनी चाहिए।',
    valWind: 'हवा की गति धनात्मक होनी चाहिए।',
    valRain: 'वर्षा धनात्मक होनी चाहिए।',
    // Acres unit
    acres: 'एकड़',
  },
} as const;

export default function DataEntry({ user, farms, onRefreshFarms, language = 'en' }: DataEntryProps) {
  const [activeForm, setActiveForm] = useState<RecordType>('farm');
  const [activeView, setActiveView] = useState<'create' | 'manage'>('create');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Hierarchy Database Stores
  const [dbFarms, setDbFarms] = useState<any[]>([]);
  const [dbFields, setDbFields] = useState<any[]>([]);
  const [dbCrops, setDbCrops] = useState<any[]>([]);
  const [dbSensors, setDbSensors] = useState<any[]>([]);
  const [dbReadings, setDbReadings] = useState<any[]>([]);
  const [dbIrrigations, setDbIrrigations] = useState<any[]>([]);
  const [dbFertilizers, setDbFertilizers] = useState<any[]>([]);
  const [dbDiseases, setDbDiseases] = useState<any[]>([]);
  const [dbWeathers, setDbWeathers] = useState<any[]>([]);
  const [createdFieldPrompt, setCreatedFieldPrompt] = useState<{ fieldId: string; fieldName: string; farmId: string } | null>(null);

  // Selected farm's active entities
  const [fields, setFields] = useState<any[]>([]);
  const [sensors, setSensors] = useState<any[]>([]);

  // Local Form state
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [selectedSensorId, setSelectedSensorId] = useState('');

  // 1. Farm Form
  const [farmName, setFarmName] = useState('');
  const [farmArea, setFarmArea] = useState('');
  const [farmLocation, setFarmLocation] = useState('');

  // 2. Field Form
  const [fieldName, setFieldName] = useState('');
  const [fieldArea, setFieldArea] = useState('');
  const [fieldCropCategory, setFieldCropCategory] = useState('');
  const [fieldGPS, setFieldGPS] = useState('');

  // 3. Crop Form
  const [cropName, setCropName] = useState('');
  const [cropVariety, setCropVariety] = useState('');
  const [cropPlantedDate, setCropPlantedDate] = useState('');

  // 4. Sensor Form
  const [sensorName, setSensorName] = useState('');
  const [sensorType, setSensorType] = useState('temperature');

  // 5. Sensor Reading Form
  const [readingValue, setReadingValue] = useState('');

  // 6. Irrigation Form
  const [irrigationDuration, setIrrigationDuration] = useState('');
  const [irrigationWaterAmount, setIrrigationWaterAmount] = useState('');
  const [irrigationStatus, setIrrigationStatus] = useState('Completed');

  // 7. Fertilizer Form
  const [fertilizerType, setFertilizerType] = useState('');
  const [fertilizerQuantity, setFertilizerQuantity] = useState('');

  // 8. Disease Report Form
  const [diseaseCropType, setDiseaseCropType] = useState(CROP_TYPES[0]);
  const [diseaseName, setDiseaseName] = useState('');
  const [diseaseConfidence, setDiseaseConfidence] = useState('90');
  const [diseaseTreatment, setDiseaseTreatment] = useState('');

  // 9. Weather Form
  const [weatherTemp, setWeatherTemp] = useState('');
  const [weatherHumidity, setWeatherHumidity] = useState('');
  const [weatherWind, setWeatherWind] = useState('');
  const [weatherRain, setWeatherRain] = useState('');
  const [weatherCondition, setWeatherCondition] = useState('Sunny');

  // Manage records state
  const [manageCategory, setManageCategory] = useState<RecordType>('farm');
  const [searchQuery, setSearchQuery] = useState('');
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editPayload, setEditPayload] = useState<any>({});
  
  // Collapsible tree state mapping record ID to boolean
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Safety Warnings Popup State
  const [deleteBlockMessage, setDeleteBlockMessage] = useState<string | null>(null);

  // Fetch lists based on selected Farm
  useEffect(() => {
    if (selectedFarmId) {
      fetchFields(selectedFarmId);
      fetchSensors(selectedFarmId);
    } else {
      setSelectedFieldId('');
      setSelectedSensorId('');
    }
  }, [selectedFarmId]);

  // Handle default farm selection
  useEffect(() => {
    if (farms.length > 0 && !selectedFarmId) {
      setSelectedFarmId(farms[0].id);
    }
  }, [farms, selectedFarmId]);

  // Load all entity logs on view transition or category changes
  useEffect(() => {
    loadHierarchyDatabase();
  }, [activeView, manageCategory]);

  const loadHierarchyDatabase = async () => {
    setRecordsLoading(true);
    try {
      const [farmsRes, fieldsRes, cropsRes, sensorsRes, readingsRes, irrigationsRes, fertilizersRes, diseasesRes, weathersRes] = await Promise.all([
        fetch('/api/farms'),
        fetch('/api/fields'),
        fetch('/api/crops'),
        fetch('/api/sensors'),
        fetch('/api/sensor-readings'),
        fetch('/api/irrigation-records'),
        fetch('/api/fertilizer-records'),
        fetch('/api/disease-history?userId=' + user.id),
        fetch('/api/weather-records')
      ]);

      const fData = await farmsRes.json();
      const fiData = await fieldsRes.json();
      const cData = await cropsRes.json();
      const sData = await sensorsRes.json();
      const rData = await readingsRes.json();
      const iData = await irrigationsRes.json();
      const feData = await fertilizersRes.json();
      const dData = await diseasesRes.json();
      const wData = await weathersRes.json();

      if (fData.success) setDbFarms(fData.farms || []);
      if (fiData.success) setDbFields(fiData.fields || []);
      if (cData.success) setDbCrops(cData.crops || []);
      if (sData.success) setDbSensors(sData.sensors || []);
      if (rData.success) setDbReadings(rData.readings || []);
      if (iData.success) setDbIrrigations(iData.records || []);
      if (feData.success) setDbFertilizers(feData.records || []);
      if (dData.success) setDbDiseases(dData.history || []);
      if (wData.success) setDbWeathers(wData.records || []);

      // Temporary diagnostic console logging for verification
      console.log("[DataEntry Debug] Syncing Twin Hierarchy Database:");
      console.log(`- Number of farms: ${fData.farms?.length || 0}`);
      console.log(`- Number of fields: ${fiData.fields?.length || 0}`);
      console.log(`- Number of crops: ${cData.crops?.length || 0}`);
      console.log(`- Farm IDs:`, (fData.farms || []).map((f: any) => f.id || f._id));
      console.log(`- Field Farm IDs:`, (fiData.fields || []).map((fi: any) => fi.farmId));
      console.log(`- Crop Field IDs:`, (cData.crops || []).map((cr: any) => cr.fieldId));

      (fiData.fields || []).forEach((fi: any) => {
        const matchingFarm = (fData.farms || []).find((f: any) => (f.id || f._id?.toString()) === fi.farmId?.toString());
        if (!matchingFarm) {
          console.warn(`[DataEntry Warning] Field "${fi.name}" (ID: ${fi._id}) is orphan! Its farmId "${fi.farmId}" does not match any loaded farm!`);
        }
      });

    } catch (e) {
      console.error(e);
      showToast('Error syncing digital twin records database.', 'error');
    } finally {
      setRecordsLoading(false);
    }
  };

  const fetchFields = async (farmId: string) => {
    try {
      const res = await fetch(`/api/fields?farmId=${farmId}`);
      const data = await res.json();
      if (data.success) {
        // Find existing match
        const list = data.fields || [];
        setFields(list);
        if (list.length > 0) {
          setSelectedFieldId(list[0]._id || list[0].id);
        } else {
          setSelectedFieldId('');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSensors = async (farmId: string) => {
    try {
      const res = await fetch(`/api/sensors?farmId=${farmId}`);
      const data = await res.json();
      if (data.success) {
        const list = data.sensors || [];
        setSensors(list);
        if (list.length > 0) {
          setSelectedSensorId(list[0]._id || list[0].id);
        } else {
          setSelectedSensorId('');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Inline inputs validation checks (Single source of truth)
  const validateForm = () => {
    const T = dataTrans[language];
    // 1. Farm Validation
    if (activeForm === 'farm') {
      if (!farmName.trim() || farmName.trim().length < 3) {
        return T.valFarmName;
      }
      const areaNum = parseFloat(farmArea);
      if (isNaN(areaNum) || areaNum <= 0) {
        return T.valAreaPositive;
      }
      if (areaNum > 100000) {
        return T.valAreaMax;
      }
      if (!farmLocation.trim()) {
        return T.valLocation;
      }
      // Name uniqueness check
      const nameExists = farms.some(f => f.name.trim().toLowerCase() === farmName.trim().toLowerCase());
      if (nameExists) {
        return T.valFarmExists;
      }
    }

    // 2. Field Validation
    if (activeForm === 'field') {
      if (!selectedFarmId) return T.valSelectFarm;
      if (!fieldName.trim() || fieldName.trim().length < 2) {
        return T.valFieldName;
      }
      const areaNum = parseFloat(fieldArea);
      if (isNaN(areaNum) || areaNum <= 0) {
        return T.valAreaPositive;
      }

      // Check field boundary budget limits
      const parentFarm = farms.find(f => f.id === selectedFarmId);
      if (parentFarm) {
        const farmFields = dbFields.filter(f => f.farmId === selectedFarmId);
        const currentSum = farmFields.reduce((sum, f) => sum + f.area, 0);
        if (currentSum + areaNum > parentFarm.area) {
          return T.valFieldArea;
        }
      }
    }

    // 3. Crop Validation
    if (activeForm === 'crop') {
      if (!selectedFarmId) return T.valSelectFarmCrop;
      if (!selectedFieldId) return T.valSelectFieldCrop;
      if (!cropName.trim()) return T.valCropName;
      if (!cropVariety.trim()) return T.valCropVariety;
      if (!cropPlantedDate) return T.valPlantedDate;
    }

    // 4. Sensor
    if (activeForm === 'sensor') {
      if (!selectedFarmId) return T.valSelectFarmSensor;
      if (!sensorName.trim()) return T.valSensorId;
    }

    // 5. Reading
    if (activeForm === 'reading') {
      if (!selectedSensorId) return T.valSelectSensor;
      const reading = parseFloat(readingValue);
      if (isNaN(reading)) return T.valReadingValue;
    }

    // 6. Irrigation
    if (activeForm === 'irrigation') {
      if (!selectedFarmId) return T.valSelectFarmIrrigation;
      const dur = parseFloat(irrigationDuration);
      const amt = parseFloat(irrigationWaterAmount);
      if (isNaN(dur) || dur <= 0) return T.valDuration;
      if (isNaN(amt) || amt <= 0) return T.valWaterAmount;
    }

    // 7. Fertilizer
    if (activeForm === 'fertilizer') {
      if (!selectedFarmId) return T.valSelectFarmFertilizer;
      if (!fertilizerType.trim()) return T.valFertilizerType;
      const qty = parseFloat(fertilizerQuantity);
      if (isNaN(qty) || qty <= 0) return T.valFertilizerQty;
    }

    // 8. Disease
    if (activeForm === 'disease') {
      if (!diseaseName.trim()) return T.valDiseaseName;
      const conf = parseFloat(diseaseConfidence);
      if (isNaN(conf) || conf < 0 || conf > 100) return T.valConfidenceRange;
      if (!diseaseTreatment.trim()) return T.valTreatment;
    }

    // 9. Weather
    if (activeForm === 'weather') {
      const temp = parseFloat(weatherTemp);
      const humid = parseFloat(weatherHumidity);
      const wind = parseFloat(weatherWind);
      const rain = parseFloat(weatherRain);
      if (isNaN(temp)) return T.valTemp;
      if (isNaN(humid) || humid < 0 || humid > 100) return T.valHumidity;
      if (isNaN(wind) || wind < 0) return T.valWind;
      if (isNaN(rain) || rain < 0) return T.valRain;
    }

    return null;
  };

  const validationError = useMemo(() => {
    return validateForm();
  }, [
    language,
    activeForm, selectedFarmId, selectedFieldId, selectedSensorId,
    farmName, farmArea, farmLocation, fieldName, fieldArea, fieldCropCategory, fieldGPS,
    cropName, cropVariety, cropPlantedDate, sensorName, sensorType, readingValue,
    irrigationDuration, irrigationWaterAmount, irrigationStatus, fertilizerType, fertilizerQuantity,
    diseaseCropType, diseaseName, diseaseConfidence, diseaseTreatment,
    weatherTemp, weatherHumidity, weatherWind, weatherRain, weatherCondition, dbFields, farms
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setLoading(true);
    try {
      let endpoint = '';
      let payload = {};

      if (activeForm === 'farm') {
        endpoint = '/api/farms';
        payload = {
          name: farmName.trim(),
          area: parseFloat(farmArea),
          cropType: 'Unassigned', //satisfy backend validation constraint
          location: farmLocation.trim()
        };
      } else if (activeForm === 'field') {
        endpoint = '/api/fields';
        payload = {
          farmId: selectedFarmId,
          // Append GPS bounds in parentheses to persist in name field cleanly without DB schema modifications
          name: fieldGPS.trim() ? `${fieldName.trim()} (${fieldGPS.trim()})` : fieldName.trim(),
          area: parseFloat(fieldArea),
          cropType: fieldCropCategory || 'None'
        };
      } else if (activeForm === 'crop') {
        endpoint = '/api/crops';
        payload = {
          farmId: selectedFarmId,
          fieldId: selectedFieldId || undefined,
          name: cropName.trim(),
          variety: cropVariety.trim(),
          plantedDate: cropPlantedDate
        };
      } else if (activeForm === 'sensor') {
        endpoint = '/api/sensors';
        payload = {
          farmId: selectedFarmId,
          fieldId: selectedFieldId || undefined,
          name: sensorName.trim(),
          type: sensorType
        };
      } else if (activeForm === 'reading') {
        endpoint = '/api/sensor-readings';
        payload = {
          farmId: selectedFarmId,
          sensorId: selectedSensorId,
          value: parseFloat(readingValue)
        };
      } else if (activeForm === 'irrigation') {
        endpoint = '/api/irrigation-records';
        payload = {
          farmId: selectedFarmId,
          duration: parseFloat(irrigationDuration),
          waterAmount: parseFloat(irrigationWaterAmount),
          status: irrigationStatus
        };
      } else if (activeForm === 'fertilizer') {
        endpoint = '/api/fertilizer-records';
        payload = {
          farmId: selectedFarmId,
          type: fertilizerType.trim(),
          quantity: parseFloat(fertilizerQuantity)
        };
      } else if (activeForm === 'disease') {
        endpoint = '/api/disease-reports';
        payload = {
          farmId: selectedFarmId || undefined,
          cropType: diseaseCropType,
          diseaseName: diseaseName.trim(),
          confidence: parseFloat(diseaseConfidence),
          treatment: diseaseTreatment.trim()
        };
      } else if (activeForm === 'weather') {
        endpoint = '/api/weather-records';
        payload = {
          farmId: selectedFarmId || undefined,
          temperature: parseFloat(weatherTemp),
          humidity: parseFloat(weatherHumidity),
          windSpeed: parseFloat(weatherWind),
          rainfall: parseFloat(weatherRain),
          condition: weatherCondition
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Saving record failed');
      }

      showToast(dataTrans[language].recordRegistered, 'success');
      
      // Reset forms
      if (activeForm === 'farm') {
        setFarmName(''); setFarmArea(''); setFarmLocation('');
      } else if (activeForm === 'field') {
        setFieldName(''); setFieldArea(''); setFieldGPS(''); setFieldCropCategory('');
        if (data.field) {
          const rawName = data.field.name || '';
          const displayName = rawName.split(' (')[0];
          setCreatedFieldPrompt({
            fieldId: data.field._id || data.field.id,
            fieldName: displayName,
            farmId: selectedFarmId
          });
        }
      } else if (activeForm === 'crop') {
        setCropName(''); setCropVariety(''); setCropPlantedDate('');
      } else if (activeForm === 'sensor') {
        setSensorName('');
      } else if (activeForm === 'reading') {
        setReadingValue('');
      } else if (activeForm === 'irrigation') {
        setIrrigationDuration(''); setIrrigationWaterAmount('');
      } else if (activeForm === 'fertilizer') {
        setFertilizerType(''); setFertilizerQuantity('');
      } else if (activeForm === 'disease') {
        setDiseaseName(''); setDiseaseTreatment('');
      } else if (activeForm === 'weather') {
        setWeatherTemp(''); setWeatherHumidity(''); setWeatherWind(''); setWeatherRain('');
      }

      // Refresh parent lists
      await onRefreshFarms();
      await loadHierarchyDatabase();
      
      if (selectedFarmId) {
        await fetchFields(selectedFarmId);
        await fetchSensors(selectedFarmId);
      }
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (record: any) => {
    setEditingRecordId(record._id || record.id);
    setEditPayload({ ...record });
  };

  const handleEditSave = async (recordId: string) => {
    let endpoint = '';
    if (manageCategory === 'farm') endpoint = `/api/farms/${recordId}`;
    else if (manageCategory === 'field') endpoint = `/api/fields/${recordId}`;
    else if (manageCategory === 'crop') endpoint = `/api/crops/${recordId}`;
    else if (manageCategory === 'sensor') endpoint = `/api/sensors/${recordId}`;
    else if (manageCategory === 'reading') endpoint = `/api/sensor-readings/${recordId}`;
    else if (manageCategory === 'irrigation') endpoint = `/api/irrigation-records/${recordId}`;
    else if (manageCategory === 'fertilizer') endpoint = `/api/fertilizer-records/${recordId}`;
    else if (manageCategory === 'disease') endpoint = `/api/disease-reports/${recordId}`;
    else if (manageCategory === 'weather') endpoint = `/api/weather-records/${recordId}`;

    try {
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPayload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(dataTrans[language].recordUpdated, 'success');
        setEditingRecordId(null);
        loadHierarchyDatabase();
        onRefreshFarms();
      } else {
        showToast(data.message || 'Failed to update record', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error occurred', 'error');
    }
  };

  // Enforce delete safety checks client side before API deletion triggers
  const handleDeleteRecord = async (recordId: string, category: RecordType) => {
    const T = dataTrans[language];
    if (category === 'farm') {
      const hasFields = dbFields.some(f => f.farmId === recordId);
      if (hasFields) {
        setDeleteBlockMessage(T.deleteFarmBlocked);
        return;
      }
    }

    if (category === 'field') {
      const hasCrops = dbCrops.some(c => c.fieldId === recordId);
      if (hasCrops) {
        setDeleteBlockMessage(T.deleteFieldBlocked);
        return;
      }
    }

    if (!confirm(T.deleteConfirm)) return;

    let endpoint = '';
    if (category === 'farm') endpoint = `/api/farms/${recordId}`;
    else if (category === 'field') endpoint = `/api/fields/${recordId}`;
    else if (category === 'crop') endpoint = `/api/crops/${recordId}`;
    else if (category === 'sensor') endpoint = `/api/sensors/${recordId}`;
    else if (category === 'reading') endpoint = `/api/sensor-readings/${recordId}`;
    else if (category === 'irrigation') endpoint = `/api/irrigation-records/${recordId}`;
    else if (category === 'fertilizer') endpoint = `/api/fertilizer-records/${recordId}`;
    else if (category === 'disease') endpoint = `/api/disease-reports/${recordId}`;
    else if (category === 'weather') endpoint = `/api/weather-records/${recordId}`;

    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(dataTrans[language].recordDeleted, 'success');
        loadHierarchyDatabase();
        onRefreshFarms();
      } else {
        showToast(data.message || 'Failed to delete record', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error occurred', 'error');
    }
  };

  // Preview stats for the selected Farm
  const selectedFarmPreview = useMemo(() => {
    if (!selectedFarmId) return null;
    const farmObj = farms.find(f => f.id === selectedFarmId);
    if (!farmObj) return null;

    const farmFields = dbFields.filter(f => f.farmId === selectedFarmId);
    const totalFieldsArea = farmFields.reduce((sum, f) => sum + f.area, 0);
    const remainingArea = Math.max(0, farmObj.area - totalFieldsArea);

    return {
      name: farmObj.name,
      location: farmObj.location,
      totalArea: farmObj.area,
      fieldsCount: farmFields.length,
      remainingArea: remainingArea
    };
  }, [selectedFarmId, farms, dbFields]);

  // Hierarchy toggle nodes helper
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Collapsible explorer data matching search query
  const searchableHierarchy = useMemo(() => {
    if (!searchQuery) return dbFarms;
    const q = searchQuery.toLowerCase();
    
    // Filter farms that match or contain fields/crops matching query
    return dbFarms.filter(farm => {
      const farmMatch = farm.name.toLowerCase().includes(q) || farm.location.toLowerCase().includes(q);
      const fields = dbFields.filter(f => f.farmId === farm.id);
      const fieldMatch = fields.some(f => f.name.toLowerCase().includes(q));
      
      const crops = dbCrops.filter(c => c.farmId === farm.id);
      const cropMatch = crops.some(c => c.name.toLowerCase().includes(q) || c.variety.toLowerCase().includes(q));

      return farmMatch || fieldMatch || cropMatch;
    });
  }, [dbFarms, dbFields, dbCrops, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      
      {/* Field Created - Crop creation prompt modal */}
      <AnimatePresence>
        {createdFieldPrompt && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121024] border border-white/10 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl"
            >
              <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">{dataTrans[language].fieldCreatedTitle}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {language === 'hi' ? 'खेत' : 'Field'} <span className="text-white font-bold">"{createdFieldPrompt.fieldName}"</span> {dataTrans[language].fieldCreatedMsg}
                </p>
                <p className="text-xs text-[#E9D5FF] font-medium leading-relaxed">
                  {dataTrans[language].addCropPrompt}
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveForm('crop');
                    setSelectedFarmId(createdFieldPrompt.farmId);
                    setSelectedFieldId(createdFieldPrompt.fieldId);
                    // Pre-populate crop name with preferred crop category if specified
                    if (fieldCropCategory && fieldCropCategory !== 'None') {
                      setCropName(fieldCropCategory);
                    }
                    setCreatedFieldPrompt(null);
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white text-xs font-bold rounded-xl cursor-pointer shadow hover:shadow-purple-500/10 transition-all uppercase tracking-wider animate-pulse"
                >
                  {dataTrans[language].addCropNow}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedFieldPrompt(null);
                  }}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl cursor-pointer uppercase tracking-wider transition-colors"
                >
                  {dataTrans[language].later}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Header toolbar */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5.5 w-5.5 text-[#D946EF]" /> {dataTrans[language].pageTitle}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {dataTrans[language].pageSubtitle}
          </p>
        </div>
        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10 self-start">
          <button
            onClick={() => setActiveView('create')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
              activeView === 'create' ? 'bg-[#9333EA] text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            {dataTrans[language].createRecords}
          </button>
          <button
            onClick={() => setActiveView('manage')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
              activeView === 'manage' ? 'bg-[#9333EA] text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            {dataTrans[language].manageRecords}
          </button>
        </div>
      </div>

      {activeView === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar selector */}
          <div className="bg-[#121024]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-lg space-y-1.5 h-fit">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2">
              {dataTrans[language].recordSelection}
            </p>
            {RECORD_TYPES.map((type) => {
              const Icon = type.icon;
              const isActive = activeForm === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setActiveForm(type.id)}
                  className={`w-full h-11 flex items-center gap-3 px-4 rounded-2xl text-xs font-bold uppercase transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white shadow-md'
                      : 'text-[#A78BFA] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{getRecordTypeLabel(type.id, language)}</span>
                </button>
              );
            })}
          </div>

          {/* Form and Preview Container */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Form sheet */}
            <div className="md:col-span-2 bg-[#121024]/80 border border-white/10 rounded-3xl shadow-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[480px]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#9333EA]/10 blur-[80px] rounded-full pointer-events-none"></div>

              <div>
                <h3 className="text-base font-black text-white mb-6 border-b border-white/5 pb-3 flex items-center gap-2">
                  {React.createElement(RECORD_TYPES.find(r => r.id === activeForm)?.icon, { className: `h-5 w-5 ${RECORD_TYPES.find(r => r.id === activeForm)?.color}` })}
                  {getRecordTypeLabel(activeForm, language)} {dataTrans[language].form}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4 relative z-10 text-xs">
                  
                  {/* Select Farm for nested items */}
                  {activeForm !== 'farm' && activeForm !== 'weather' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].selectFarm} <span className="text-red-400">*</span></label>
                        <select
                          required
                          value={selectedFarmId}
                          onChange={(e) => setSelectedFarmId(e.target.value)}
                          className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#9333EA] cursor-pointer"
                        >
                          <option value="" disabled className="bg-[#121024]">{dataTrans[language].chooseFarm}</option>
                          {farms.map((f) => (
                            <option key={f.id} value={f.id} className="bg-[#121024]">{f.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Select Field for Crop and Sensors */}
                      {(activeForm === 'crop' || activeForm === 'sensor') && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].selectField} <span className="text-red-400">*</span></label>
                          <select
                            required
                            value={selectedFieldId}
                            onChange={(e) => setSelectedFieldId(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#9333EA] cursor-pointer"
                          >
                            <option value="" disabled className="bg-[#121024]">{dataTrans[language].chooseField}</option>
                            {fields.map((f) => (
                              <option key={f._id} value={f._id} className="bg-[#121024]">{f.name}</option>
                            ))}
                          </select>
                          {fields.length === 0 && (
                            <span className="text-[10px] text-amber-400 block mt-1">{dataTrans[language].noFieldsWarning}</span>
                          )}
                        </div>
                      )}

                      {/* Select Sensor for Readings */}
                      {activeForm === 'reading' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].selectSensor} <span className="text-red-400">*</span></label>
                          <select
                            required
                            value={selectedSensorId}
                            onChange={(e) => setSelectedSensorId(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#9333EA] cursor-pointer"
                          >
                            <option value="" disabled className="bg-[#121024]">{dataTrans[language].chooseSensor}</option>
                            {sensors.map((s) => (
                              <option key={s._id} value={s._id} className="bg-[#121024]">{s.name} ({s.type})</option>
                            ))}
                          </select>
                          {sensors.length === 0 && (
                            <span className="text-[10px] text-amber-400 block mt-1">{dataTrans[language].noSensorsWarning}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 1. Farm Form Fields */}
                  {activeForm === 'farm' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].farmName} <span className="text-red-400">*</span></label>
                        <input
                          type="text" required placeholder={dataTrans[language].farmNamePlaceholder} value={farmName} onChange={(e) => setFarmName(e.target.value)}
                          className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                        />
                        <span className="text-[9px] text-gray-400 block">{dataTrans[language].farmNameHint}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].farmArea} <span className="text-red-400">*</span></label>
                          <input
                            type="number" step="any" required placeholder={dataTrans[language].farmAreaPlaceholder} value={farmArea} onChange={(e) => setFarmArea(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].farmLocation} <span className="text-red-400">*</span></label>
                          <input
                            type="text" required placeholder={dataTrans[language].farmLocationPlaceholder} value={farmLocation} onChange={(e) => setFarmLocation(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Field Form Fields */}
                  {activeForm === 'field' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].fieldName} <span className="text-red-400">*</span></label>
                        <input
                          type="text" required placeholder={dataTrans[language].fieldNamePlaceholder} value={fieldName} onChange={(e) => setFieldName(e.target.value)}
                          className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].fieldArea} <span className="text-red-400">*</span></label>
                          <input
                            type="number" step="any" required placeholder={dataTrans[language].fieldAreaPlaceholder} value={fieldArea} onChange={(e) => setFieldArea(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].preferredCrop}</label>
                          <select
                            value={fieldCropCategory} onChange={(e) => setFieldCropCategory(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#9333EA] cursor-pointer"
                          >
                            <option value="" className="bg-[#121024]">{dataTrans[language].preferredCropNone}</option>
                            {CROP_TYPES.map(c => <option key={c} value={c} className="bg-[#121024]">{c}</option>)}
                          </select>
                          <span className="text-[9px] text-gray-400 block mt-1">{dataTrans[language].preferredCropHint}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].gpsCoords}</label>
                        <input
                          type="text" placeholder={dataTrans[language].gpsPlaceholder} value={fieldGPS} onChange={(e) => setFieldGPS(e.target.value)}
                          className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                        />
                      </div>
                    </div>
                  )}

                  {/* 3. Crop Form Fields */}
                  {activeForm === 'crop' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].cropNameLabel} <span className="text-red-400">*</span></label>
                        <input
                          type="text" required placeholder={dataTrans[language].cropNamePlaceholder} value={cropName} onChange={(e) => setCropName(e.target.value)}
                          className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].cropVariety} <span className="text-red-400">*</span></label>
                          <input
                            type="text" required placeholder={dataTrans[language].cropVarietyPlaceholder} value={cropVariety} onChange={(e) => setCropVariety(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].plantedDate} <span className="text-red-400">*</span></label>
                          <input
                            type="date" required value={cropPlantedDate} onChange={(e) => setCropPlantedDate(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#9333EA] cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Sensor Form Fields */}
                  {activeForm === 'sensor' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].sensorIdentifier} <span className="text-red-400">*</span></label>
                        <input
                          type="text" required placeholder={dataTrans[language].sensorIdentifierPlaceholder} value={sensorName} onChange={(e) => setSensorName(e.target.value)}
                          className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].sensorType} <span className="text-red-400">*</span></label>
                        <select
                          value={sensorType} onChange={(e) => setSensorType(e.target.value)}
                          className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#9333EA] cursor-pointer"
                        >
                          <option value="temperature" className="bg-[#121024]">{dataTrans[language].sensorTemp}</option>
                          <option value="moisture" className="bg-[#121024]">{dataTrans[language].sensorMoisture}</option>
                          <option value="humidity" className="bg-[#121024]">{dataTrans[language].sensorHumidity}</option>
                          <option value="ph" className="bg-[#121024]">{dataTrans[language].sensorPH}</option>
                          <option value="nitrogen" className="bg-[#121024]">{dataTrans[language].sensorNitrogen}</option>
                          <option value="phosphorus" className="bg-[#121024]">{dataTrans[language].sensorPhosphorus}</option>
                          <option value="potassium" className="bg-[#121024]">{dataTrans[language].sensorPotassium}</option>
                          <option value="rainfall" className="bg-[#121024]">{dataTrans[language].sensorRainfall}</option>
                          <option value="light" className="bg-[#121024]">{dataTrans[language].sensorLight}</option>
                          <option value="wind" className="bg-[#121024]">{dataTrans[language].sensorWind}</option>
                          <option value="tank" className="bg-[#121024]">{dataTrans[language].sensorTank}</option>
                          <option value="battery" className="bg-[#121024]">{dataTrans[language].sensorBattery}</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* 5. Sensor Reading Form Fields */}
                  {activeForm === 'reading' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].readingValue} <span className="text-red-400">*</span></label>
                      <input
                        type="number" step="any" required placeholder={dataTrans[language].readingPlaceholder} value={readingValue} onChange={(e) => setReadingValue(e.target.value)}
                        className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                      />
                    </div>
                  )}

                  {/* 6. Irrigation Form Fields */}
                  {activeForm === 'irrigation' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].irrigationDuration} <span className="text-red-400">*</span></label>
                        <input
                          type="number" required placeholder={dataTrans[language].irrigationDurationPlaceholder} value={irrigationDuration} onChange={(e) => setIrrigationDuration(e.target.value)}
                          className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].irrigationWater} <span className="text-red-400">*</span></label>
                        <input
                          type="number" required placeholder={dataTrans[language].irrigationWaterPlaceholder} value={irrigationWaterAmount} onChange={(e) => setIrrigationWaterAmount(e.target.value)}
                          className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].irrigationStatus}</label>
                        <select
                          value={irrigationStatus} onChange={(e) => setIrrigationStatus(e.target.value)}
                          className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#9333EA] cursor-pointer"
                        >
                          <option value="Completed" className="bg-[#121024]">{dataTrans[language].irrigationCompleted}</option>
                          <option value="Scheduled" className="bg-[#121024]">{dataTrans[language].irrigationScheduled}</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* 7. Fertilizer Form Fields */}
                  {activeForm === 'fertilizer' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].fertilizerBlend} <span className="text-red-400">*</span></label>
                        <input
                          type="text" required placeholder={dataTrans[language].fertilizerBlendPlaceholder} value={fertilizerType} onChange={(e) => setFertilizerType(e.target.value)}
                          className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].fertilizerQuantity} <span className="text-red-400">*</span></label>
                        <input
                          type="number" required placeholder={dataTrans[language].fertilizerQuantityPlaceholder} value={fertilizerQuantity} onChange={(e) => setFertilizerQuantity(e.target.value)}
                          className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                        />
                      </div>
                    </div>
                  )}

                  {/* 8. Disease Report Form Fields */}
                  {activeForm === 'disease' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].cropCategory}</label>
                          <select
                            value={diseaseCropType} onChange={(e) => setDiseaseCropType(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#9333EA] cursor-pointer"
                          >
                            {CROP_TYPES.map(c => <option key={c} value={c} className="bg-[#121024]">{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].diseaseName} <span className="text-red-400">*</span></label>
                          <input
                            type="text" required placeholder={dataTrans[language].diseaseNamePlaceholder} value={diseaseName} onChange={(e) => setDiseaseName(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].scanConfidence} <span className="text-red-400">*</span></label>
                        <input
                          type="number" min="0" max="100" required placeholder={dataTrans[language].scanConfidencePlaceholder} value={diseaseConfidence} onChange={(e) => setDiseaseConfidence(e.target.value)}
                          className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].treatmentPlan} <span className="text-red-400">*</span></label>
                        <textarea
                          required placeholder={dataTrans[language].treatmentPlaceholder} rows={3} value={diseaseTreatment} onChange={(e) => setDiseaseTreatment(e.target.value)}
                          className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                        />
                      </div>
                    </div>
                  )}

                  {/* 9. Weather Form Fields */}
                  {activeForm === 'weather' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].farmMapping}</label>
                          <select
                            value={selectedFarmId}
                            onChange={(e) => setSelectedFarmId(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#9333EA] cursor-pointer"
                          >
                            <option value="" className="bg-[#121024]">{dataTrans[language].allTwinRegions}</option>
                            {farms.map((f) => (
                              <option key={f.id} value={f.id} className="bg-[#121024]">{f.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider">{dataTrans[language].weatherCondition}</label>
                          <select
                            value={weatherCondition} onChange={(e) => setWeatherCondition(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#9333EA] cursor-pointer"
                          >
                            <option value="Sunny" className="bg-[#121024]">{dataTrans[language].weatherSunny}</option>
                            <option value="Cloudy" className="bg-[#121024]">{dataTrans[language].weatherCloudy}</option>
                            <option value="Rainy" className="bg-[#121024]">{dataTrans[language].weatherRainy}</option>
                            <option value="Stormy" className="bg-[#121024]">{dataTrans[language].weatherStormy}</option>
                            <option value="Windy" className="bg-[#121024]">{dataTrans[language].weatherWindy}</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider flex items-center gap-1"><Thermometer className="h-3 w-3" /> {dataTrans[language].tempLabel}</label>
                          <input
                            type="number" step="any" required placeholder="e.g. 26.5" value={weatherTemp} onChange={(e) => setWeatherTemp(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider flex items-center gap-1 flex-nowrap"><Droplets className="h-3 w-3" /> {dataTrans[language].humidLabel}</label>
                          <input
                            type="number" step="any" required placeholder="e.g. 62" value={weatherHumidity} onChange={(e) => setWeatherHumidity(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider flex items-center gap-1"><Wind className="h-3 w-3" /> {dataTrans[language].windLabel}</label>
                          <input
                            type="number" step="any" required placeholder="e.g. 14.5" value={weatherWind} onChange={(e) => setWeatherWind(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#E9D5FF] uppercase tracking-wider flex items-center gap-1 flex-nowrap"><Sun className="h-3 w-3" /> {dataTrans[language].rainLabel}</label>
                          <input
                            type="number" step="any" required placeholder="e.g. 0.0" value={weatherRain} onChange={(e) => setWeatherRain(e.target.value)}
                            className="w-full h-11 px-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#9333EA]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Display Instant Validation Warning Banner */}
                  {validationError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-start gap-2.5">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                      <span className="font-semibold text-[11px] leading-tight">{validationError}</span>
                    </div>
                  )}

                  {/* Form Submission Button */}
                  <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                      type="submit"
                      disabled={loading || !!validationError}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#9333EA] to-[#C026D3] hover:shadow-lg hover:shadow-[#9333EA]/30 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2 disabled:opacity-40 disabled:grayscale focus:outline-none cursor-pointer"
                    >
                      {loading && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                      {dataTrans[language].addRecord}
                    </button>
                  </div>

                </form>
              </div>
            </div>

            {/* SUMMARY PREVIEW STATUS WIDGET */}
            <div className="bg-[#121024]/60 border border-white/10 rounded-3xl p-5 shadow-2xl h-fit space-y-4">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sun className="h-4 w-4 text-purple-400 animate-spin" /> {dataTrans[language].statusPreview}
              </h4>

              {activeForm !== 'farm' ? (
                selectedFarmPreview ? (
                  <div className="space-y-3.5 text-xs">
                    <div className="bg-black/35 p-3 rounded-2xl border border-white/5 space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">{dataTrans[language].selectedFarm}</span>
                      <span className="font-black text-white block">{selectedFarmPreview.name}</span>
                      <span className="text-[10px] text-gray-400 block">{selectedFarmPreview.location}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-black/35 p-2.5 rounded-xl border border-white/5">
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block mb-0.5">{dataTrans[language].farmSize}</span>
                        <span className="font-black text-white">{selectedFarmPreview.totalArea} ac</span>
                      </div>
                      <div className="bg-black/35 p-2.5 rounded-xl border border-white/5">
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block mb-0.5">{dataTrans[language].fieldsCount}</span>
                        <span className="font-black text-white">{selectedFarmPreview.fieldsCount}</span>
                      </div>
                    </div>

                    <div className="bg-black/35 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                      <span className="text-gray-300">{dataTrans[language].remainingArea}</span>
                      <span className={`font-black ${selectedFarmPreview.remainingArea === 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {selectedFarmPreview.remainingArea.toFixed(1)} {dataTrans[language].acres}
                      </span>
                    </div>

                    <p className="text-[9px] text-gray-400 leading-relaxed">
                      {dataTrans[language].areaHint}
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400">{dataTrans[language].selectFarmHint}</p>
                )
              ) : (
                /* Preview for adding a Farm */
                <div className="space-y-3 text-xs">
                  <div className="bg-black/35 p-3 rounded-2xl border border-white/5 space-y-2">
                    <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">{dataTrans[language].registeringFarm}</span>
                    <p className="font-bold text-white truncate">{language === 'hi' ? 'नाम' : 'Name'}: {farmName.trim() || <span className="text-gray-500 italic">e.g. North Site</span>}</p>
                    <p className="text-gray-300">{language === 'hi' ? 'एकड़' : 'Acreage'}: {farmArea ? `${farmArea} ${dataTrans[language].acres}` : <span className="text-gray-500 italic">e.g. 50 ac</span>}</p>
                    <p className="text-gray-300">{language === 'hi' ? 'स्थान' : 'Location'}: {farmLocation.trim() || <span className="text-gray-500 italic">e.g. Punjab, IN</span>}</p>
                  </div>
                  <p className="text-[9px] text-gray-400 leading-relaxed">
                    {dataTrans[language].farmPreviewHint}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        /* --- COLLAPSIBLE HIERARCHY TREE EXPLORER --- */
        <div className="bg-[#121024] border border-white/10 rounded-3xl shadow-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#9333EA]/10 blur-[80px] rounded-full pointer-events-none"></div>

          {/* Toolbar controllers */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6 z-10 relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-gray-300">{dataTrans[language].twinHierarchies}</span>
              <button
                onClick={loadHierarchyDatabase}
                disabled={recordsLoading}
                className="h-9 w-9 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white transition-colors cursor-pointer"
                title={dataTrans[language].syncHierarchy}
              >
                <RefreshCw className={`h-4 w-4 ${recordsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Search inputs */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={dataTrans[language].searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-black/40 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#9333EA] placeholder-gray-500"
              />
            </div>
          </div>

          {/* Expander list tree layout */}
          <div className="z-10 relative">
            {recordsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 text-[#9333EA] animate-spin" />
                <p className="text-sm text-gray-400">{dataTrans[language].loadingTwins}</p>
              </div>
            ) : searchableHierarchy.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-gray-400">{dataTrans[language].noTwinsFound}</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {searchableHierarchy.map((farm) => {
                  const farmFields = dbFields.filter(f => f.farmId === farm.id);
                  const isFarmExpanded = !!expandedNodes[farm.id];
                  const usedArea = farmFields.reduce((sum, f) => sum + f.area, 0);

                  return (
                    <div key={farm.id} className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                      
                      {/* Farm Header Row */}
                      <div 
                        onClick={() => toggleNode(farm.id)}
                        className="p-4 bg-white/5 hover:bg-white/10 flex items-center justify-between gap-4 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isFarmExpanded ? <ChevronDown className="h-4.5 w-4.5 text-gray-400" /> : <ChevronRight className="h-4.5 w-4.5 text-gray-400" />}
                          <MapPin className="h-5 w-5 text-rose-400 shrink-0" />
                          <div className="truncate">
                            <span className="font-extrabold text-white text-sm">{farm.name}</span>
                            <span className="text-[10px] text-gray-400 ml-2">({farm.location} | {farm.area} ac)</span>
                          </div>
                        </div>
                        
                        {/* Farm Actions */}
                        <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                          <span className="text-[9px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded">
                            {farmFields.length} fields ({usedArea}/{farm.area} ac)
                          </span>
                          <button
                            onClick={() => handleDeleteRecord(farm.id, 'farm')}
                            className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Remove Farm Twin"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Fields Node */}
                      <AnimatePresence initial={false}>
                        {isFarmExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/5 divide-y divide-white/5 bg-black/40 pl-6"
                          >
                            {farmFields.length === 0 ? (
                              <div className="p-4 text-gray-400 italic">{dataTrans[language].noFieldsCreated}</div>
                            ) : (
                              farmFields.map((field) => {
                                const fieldCrops = dbCrops.filter(c => c.fieldId === field._id);
                                const fieldSensors = dbSensors.filter(s => s.fieldId === field._id);
                                const isFieldExpanded = !!expandedNodes[field._id];

                                return (
                                  <div key={field._id} className="transition-all">
                                    {/* Field Header Row */}
                                    <div 
                                      onClick={() => toggleNode(field._id)}
                                      className="p-3 hover:bg-white/5 flex items-center justify-between gap-4 cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        {isFieldExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                                        <Layers className="h-4.5 w-4.5 text-blue-400 shrink-0" />
                                        <span className="font-bold text-gray-200">{field.name}</span>
                                        <span className="text-[10px] text-gray-500">({field.area} ac)</span>
                                      </div>

                                      <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">
                                          {fieldCrops.length} Crops | {fieldSensors.length} Sensors
                                        </span>
                                        <button
                                          onClick={() => handleDeleteRecord(field._id, 'field')}
                                          className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                                          title="Remove Field config"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Collapsible Crops/Sensors List */}
                                    <AnimatePresence initial={false}>
                                      {isFieldExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="border-t border-white/5 bg-black/60 pl-8 divide-y divide-white/5"
                                        >
                                          {fieldCrops.length === 0 && fieldSensors.length === 0 ? (
                                            <div className="p-3 text-gray-500 italic">{dataTrans[language].noCropsOrSensors}</div>
                                          ) : (
                                            <div className="divide-y divide-white/5">
                                              {/* Crops list (parent of Sensors & Records) */}
                                              {fieldCrops.map((crop) => {
                                                const isCropExpanded = !!expandedNodes[crop._id];
                                                const cropSensors = fieldSensors; // All field sensors are linked to the crop of the field
                                                const cropReadings = dbReadings.filter(r => 
                                                  cropSensors.some(s => s._id.toString() === r.sensorId?.toString())
                                                ).slice(0, 5); // display latest 5 telemetry readings

                                                return (
                                                  <div key={crop._id} className="transition-all bg-black/10">
                                                    {/* Crop Header Row */}
                                                    <div 
                                                      onClick={() => toggleNode(crop._id)}
                                                      className="p-3 hover:bg-white/5 flex items-center justify-between gap-4 cursor-pointer text-xs text-gray-300"
                                                    >
                                                      <div className="flex items-center gap-2 min-w-0">
                                                        {isCropExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                                                        <Sprout className="h-4 w-4 text-green-400 shrink-0" />
                                                        <span className="font-semibold text-white truncate">{crop.name}</span>
                                                        <span className="text-gray-400 font-mono shrink-0">({crop.variety})</span>
                                                        <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider shrink-0">{crop.status}</span>
                                                      </div>
                                                      <div className="flex items-center gap-2.5 shrink-0" onClick={e => e.stopPropagation()}>
                                                        <span className="text-gray-500 text-[10px]">{dataTrans[language].planted}: {new Date(crop.plantedDate).toLocaleDateString()}</span>
                                                        <button
                                                          onClick={() => handleDeleteRecord(crop._id, 'crop')}
                                                          className="p-1 text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                                                        >
                                                          <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                      </div>
                                                    </div>

                                                    {/* Collapsible Sensors and Records lists under Crop */}
                                                    <AnimatePresence initial={false}>
                                                      {isCropExpanded && (
                                                        <motion.div
                                                          initial={{ height: 0, opacity: 0 }}
                                                          animate={{ height: 'auto', opacity: 1 }}
                                                          exit={{ height: 0, opacity: 0 }}
                                                          className="border-t border-white/5 bg-black/30 pl-8 pr-4 py-2 space-y-3"
                                                        >
                                                          {/* Sensors List under Crop */}
                                                          <div className="space-y-1">
                                                            <div className="text-[9px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                                                              <Wifi className="h-3.5 w-3.5" /> {dataTrans[language].sensors} ({cropSensors.length})
                                                            </div>
                                                            {cropSensors.length === 0 ? (
                                                              <div className="pl-5 text-gray-500 italic text-[10px]">{dataTrans[language].noSensorsConfigured}</div>
                                                            ) : (
                                                              <div className="pl-3 space-y-1">
                                                                {cropSensors.map(sensor => (
                                                                  <div key={sensor._id} className="p-1.5 bg-black/35 rounded-lg flex items-center justify-between text-[11px] text-gray-300">
                                                                    <span className="font-semibold text-white">{sensor.name} <span className="text-[9px] text-gray-400 uppercase">({sensor.type})</span></span>
                                                                    <span className="text-[9px] text-emerald-400 font-bold">{dataTrans[language].battery}: {sensor.battery}%</span>
                                                                  </div>
                                                                ))}
                                                              </div>
                                                            )}
                                                          </div>

                                                          {/* Records List under Crop */}
                                                          <div className="space-y-1">
                                                            <div className="text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                                                              <FileText className="h-3.5 w-3.5" /> {dataTrans[language].telemetryRecords} ({cropReadings.length})
                                                            </div>
                                                            {cropReadings.length === 0 ? (
                                                              <div className="pl-5 text-gray-500 italic text-[10px]">{dataTrans[language].noReadingsLogged}</div>
                                                            ) : (
                                                              <div className="pl-3 space-y-1">
                                                                {cropReadings.map(reading => {
                                                                  const sRef = cropSensors.find(s => s._id.toString() === reading.sensorId?.toString());
                                                                  return (
                                                                    <div key={reading._id} className="p-1.5 bg-black/35 rounded-lg flex justify-between text-[10px] text-gray-400">
                                                                      <span>{dataTrans[language].reading}: <strong className="text-white">{reading.value}</strong> {sRef ? `(${sRef.name})` : ''}</span>
                                                                      <span>{new Date(reading.createdAt || reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>
                                                                  );
                                                                })}
                                                              </div>
                                                            )}
                                                          </div>
                                                        </motion.div>
                                                      )}
                                                    </AnimatePresence>
                                                  </div>
                                                );
                                              })}

                                              {/* If no Crops but has Sensors, show them under a Field-level container */}
                                              {fieldCrops.length === 0 && fieldSensors.length > 0 && (
                                                <div className="p-3 bg-black/10 text-gray-300 space-y-2">
                                                  <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Wifi className="h-3.5 w-3.5" /> {dataTrans[language].fieldSensorsNoCrop}
                                                  </div>
                                                  <div className="pl-3 space-y-1">
                                                    {fieldSensors.map(sensor => (
                                                      <div key={sensor._id} className="p-1.5 bg-black/35 rounded-lg flex items-center justify-between text-[11px] text-gray-300">
                                                        <span className="font-semibold text-white">{sensor.name} <span className="text-[9px] text-gray-400 uppercase">({sensor.type})</span></span>
                                                        <span className="text-[9px] text-emerald-400 font-bold">{dataTrans[language].battery}: {sensor.battery}%</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete safety warnings validation overlay popup */}
      <AnimatePresence>
        {deleteBlockMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#121024] border border-red-500/20 rounded-3xl w-full max-w-sm p-6 text-center text-xs space-y-4 shadow-2xl">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto border border-red-500/30">
                <AlertTriangle className="h-7 w-7 text-red-500 animate-bounce" />
              </div>
              <h4 className="text-lg font-black text-white uppercase tracking-wider">{dataTrans[language].dependencySafetyBlock}</h4>
              <p className="text-gray-300 leading-relaxed font-medium">
                {deleteBlockMessage}
              </p>
              <button
                onClick={() => setDeleteBlockMessage(null)}
                className="w-full py-2.5 bg-gradient-to-r from-[#9333EA] to-[#C026D3] hover:shadow-lg text-white rounded-xl font-bold focus:outline-none cursor-pointer"
              >
                {dataTrans[language].understood}
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
