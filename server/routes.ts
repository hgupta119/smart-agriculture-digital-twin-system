import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Farm, DiseaseDiagnosis, SoilAnalysis, YieldPrediction, Notification, Field, Crop, SensorDevice, SensorReading, IrrigationRecord, FertilizerRecord, WeatherRecord } from './models';
import { seedSensorHistory } from "./telemetrySimulator";
import { checkDBConnection } from './db';
import { aiService } from './aiService';
import { createNewFarm, generateSensorData } from '../src/utils/simData';

const router = Router();

// Middleware for validation
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

// Middleware to check DB
const requireDB = (req: any, res: any, next: any) => {
  try {
    checkDBConnection();
    next();
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Middleware to verify JWT token
const requireAuth = (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    
    // Inject or validate userId across requests for extra safety
    if (req.query.userId) {
      req.query.userId = decoded.id;
    }
    if (req.body.userId) {
      req.body.userId = decoded.id;
    }
    
    next();
  } catch (error: any) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// --- Auth Routes ---
router.put('/profile/:id', requireDB, requireAuth, [
  body('name').notEmpty().withMessage('Name is required'),
], validate, async (req: any, res: any) => {
  try {
    const { name } = req.body;
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized profile update" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.name = name;
    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        farmCount: await Farm.countDocuments({ userId: user._id })
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/auth/register', requireDB, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], validate, async (req: any, res: any) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, passwordHash });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });

    res.json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        farmCount: 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/auth/login', requireDB, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], validate, async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const farmCount = await Farm.countDocuments({ userId: user._id });

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        farmCount
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/auth/forgot-password', requireDB, [
  body('email').isEmail().withMessage('Valid email is required')
], validate, async (req: any, res: any) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "User with this email does not exist" });
    }
    res.json({
      success: true,
      message: "Reset link has been generated and sent (simulated)"
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/auth/reset-password', requireDB, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], validate, async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    
    res.json({
      success: true,
      message: "Password successfully reset"
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Geocoding Cache & Resolution Helper ---
async function geocodeLocation(location: string): Promise<{
  latitude?: number;
  longitude?: number;
  district?: string;
  state?: string;
  country?: string;
}> {
  if (!location) return {};

  // 1. Try parsing lat, lon coordinates directly from location text
  const regex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
  const match = location.match(regex);
  if (match) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lon)) {
      return { latitude: lat, longitude: lon, district: '', state: '', country: '' };
    }
  }

  // 2. Local offline resolution (Punjab, Sacramento, California, Texas, Delhi, Green Valley)
  const query = location.toLowerCase().trim();
  if (query.includes('punjab') || query.includes('india') || query.includes('delhi')) {
    if (query.includes('punjab')) {
      return { latitude: 31.1471, longitude: 75.3412, district: 'Jalandhar', state: 'Punjab', country: 'India' };
    }
    if (query.includes('delhi')) {
      return { latitude: 28.6139, longitude: 77.2090, district: 'New Delhi', state: 'Delhi', country: 'India' };
    }
  }
  if (query.includes('sacramento') || query.includes('california') || query.includes('ca')) {
    if (query.includes('sacramento')) {
      return { latitude: 38.5816, longitude: -121.4944, district: 'Sacramento County', state: 'California', country: 'United States' };
    }
    return { latitude: 36.7783, longitude: -119.4179, district: 'Fresno County', state: 'California', country: 'United States' };
  }
  if (query.includes('texas')) {
    return { latitude: 31.9686, longitude: -99.9018, district: 'Concho County', state: 'Texas', country: 'United States' };
  }
  if (query.includes('green valley')) {
    return { latitude: 37.7749, longitude: -122.4194, district: 'Santa Clara County', state: 'California', country: 'United States' };
  }

  // 3. Query OSM Nominatim public geocoding API
  try {
    const fetchMod = await import('node-fetch').then(m => m.default).catch(() => null);
    const fetchFn = typeof global.fetch === 'function' ? global.fetch : (fetchMod as any);
    if (fetchFn) {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(location)}&limit=1`;
      const res = await fetchFn(url, {
        headers: {
          'User-Agent': 'SmartAgricultureDigitalTwin/1.0 (contact: admin@smartagritwin.org)'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          const addr = item.address || {};
          const district = addr.county || addr.state_district || addr.city || addr.town || '';
          const state = addr.state || '';
          const country = addr.country || '';
          if (!isNaN(lat) && !isNaN(lon)) {
            return { latitude: lat, longitude: lon, district, state, country };
          }
        }
      }
    }
  } catch (err) {
    console.error('Nominatim online geocoder lookup error:', err);
  }

  return {};
}

// --- Farm Routes ---
router.get('/farms', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const farms = await Farm.find({ userId });
    
    // Map _id to id for frontend & resolve geocode caching, fieldCount, sensorCount, and healthStatus
    const mappedFarms = await Promise.all(farms.map(async (f: any) => {
      const farmObj = f.toObject();
      const farmId = farmObj._id.toString();
      farmObj.id = farmId;
      delete farmObj._id;
      delete farmObj.__v;

      // 1. Coordinates Cache Resolution
      if (farmObj.latitude === undefined || farmObj.longitude === undefined) {
        const coords = await geocodeLocation(farmObj.location);
        if (coords.latitude !== undefined && coords.longitude !== undefined) {
          farmObj.latitude = coords.latitude;
          farmObj.longitude = coords.longitude;
          farmObj.district = coords.district;
          farmObj.state = coords.state;
          farmObj.country = coords.country;

          // Save coordinates back to database to avoid hitting geocoding repeatedly
          await Farm.updateOne(
            { _id: f._id },
            { 
              $set: { 
                latitude: coords.latitude, 
                longitude: coords.longitude,
                district: coords.district,
                state: coords.state,
                country: coords.country
              } 
            }
          );
        }
      }

      // 2. Field Count
      farmObj.fieldCount = await Field.countDocuments({ farmId: f._id });

      // 3. Sensor Count
      farmObj.sensorCount = await SensorDevice.countDocuments({ farmId: f._id });

      // 4. Dynamic healthStatus and healthScore from Soil & Leaf scan records
      const latestSoil = await SoilAnalysis.findOne({ farmId: f._id }).sort({ createdAt: -1 });
      const latestDisease = await DiseaseDiagnosis.findOne({ farmId: f._id }).sort({ createdAt: -1 });

      const soilHealthScore = latestSoil?.soilHealth ? latestSoil.soilHealth * 10 : 85;
      const diseaseRiskPenalties = latestDisease?.severity === 'Severe' ? 40 : latestDisease?.severity === 'Moderate' ? 15 : 0;
      const healthScore = Math.max(0, Math.min(100, soilHealthScore - diseaseRiskPenalties));
      
      farmObj.healthScore = healthScore;
      farmObj.healthStatus = healthScore >= 80 ? 'Optimal' : healthScore >= 50 ? 'Under Stress' : 'Critical';

      return farmObj;
    }));

    res.json({ success: true, farms: mappedFarms });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/farms', requireDB, requireAuth, [
  body('name').notEmpty().withMessage('Name is required'),
  body('area').isNumeric().withMessage('Area must be a number'),
  body('cropType').notEmpty().withMessage('Crop Type is required'),
  body('location').notEmpty().withMessage('Location is required')
], validate, async (req: any, res: any) => {
  try {
    const { name, area, cropType, location, latitude, longitude, district, state, country } = req.body;
    const userId = req.user.id;

    const count = await Farm.countDocuments({ userId });
    if (count >= 10) {
      return res.status(400).json({ success: false, message: "Maximum limit of 10 farms reached" });
    }

    let lat = latitude;
    let lon = longitude;
    let dist = district;
    let st = state;
    let cntry = country;

    // Backend fallback geocoding if not provided by client
    if (lat === undefined || lon === undefined) {
      const coords = await geocodeLocation(location);
      if (coords.latitude !== undefined && coords.longitude !== undefined) {
        lat = coords.latitude;
        lon = coords.longitude;
        dist = coords.district;
        st = coords.state;
        cntry = coords.country;
      }
    }

    const newFarm = await Farm.create({
      userId,
      name,
      area,
      cropType,
      location,
      latitude: lat,
      longitude: lon,
      district: dist,
      state: st,
      country: cntry,
      sensorData: {
        moisture: 0,
        pH: 7.0,
        temperature: 0,
        humidity: 0,
        predictedYield: 0,
        waterRecommendation: 'Wait 24 hours'
      },
      sensorHistory: [],
      actuators: []
    });

    const bilingualNotif = getBilingualNotificationData('New Farm Registered', `Digital Twin for "${name}" has been successfully created with ${area} acres of ${cropType}.`);
    await Notification.create({
      userId,
      title: bilingualNotif.title,
      message: bilingualNotif.message,
      category: 'ai_recommendation',
      priority: 'low'
    });

    const farmResponse = newFarm.toObject() as any;
    farmResponse.id = farmResponse._id.toString();

    res.json({ success: true, farm: farmResponse });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/farms/:id', requireDB, requireAuth, [
  param('id').notEmpty().withMessage('Farm ID is required')
], validate, async (req: any, res: any) => {
  try {
    const { name, area, cropType, location, latitude, longitude, district, state, country } = req.body;
    const farm = await Farm.findOne({ _id: req.params.id, userId: req.user.id });

    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found or access denied" });
    }

    if (name) farm.name = name;
    
    if (location && location !== farm.location && (latitude === undefined || longitude === undefined)) {
      farm.location = location;
      const coords = await geocodeLocation(location);
      if (coords.latitude !== undefined && coords.longitude !== undefined) {
        farm.latitude = coords.latitude;
        farm.longitude = coords.longitude;
        farm.district = coords.district;
        farm.state = coords.state;
        farm.country = coords.country;
      } else {
        farm.latitude = undefined;
        farm.longitude = undefined;
        farm.district = undefined;
        farm.state = undefined;
        farm.country = undefined;
      }
    } else {
      if (location) farm.location = location;
      if (latitude !== undefined) farm.latitude = latitude;
      if (longitude !== undefined) farm.longitude = longitude;
      if (district !== undefined) farm.district = district;
      if (state !== undefined) farm.state = state;
      if (country !== undefined) farm.country = country;
    }

    await farm.save();

    await Notification.create({
      userId: req.user.id,
      title: 'Farm Updated',
      message: `Details of your farm "${farm.name}" have been updated.`,
      category: 'ai_recommendation',
      priority: 'low'
    });

    const farmResponse = farm.toObject() as any;
    farmResponse.id = farmResponse._id.toString();

    res.json({ success: true, farm: farmResponse });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/farms/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const result = await Farm.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!result) return res.status(404).json({ success: false, message: "Farm not found or access denied" });

    await Notification.create({
      userId: req.user.id,
      title: 'Farm Deleted',
      message: `Farm "${result.name}" has been removed.`,
      category: 'ai_recommendation',
      priority: 'medium'
    });

    res.json({ success: true, message: "Farm deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/farms/refresh', requireDB, requireAuth, [
  body('farmId').notEmpty().withMessage('Farm ID is required')
], validate, async (req: any, res: any) => {
  try {
    const farm = await Farm.findOne({ _id: req.body.farmId, userId: req.user.id });
    if (!farm) return res.status(404).json({ success: false, message: "Farm not found or access denied" });

    // Update telemetry using the latest readings from MongoDB
    const latestReadings = await SensorReading.find({ farmId: farm._id }).sort({ timestamp: -1 }).limit(10);
    const sensorsList = await SensorDevice.find({ farmId: farm._id });
    const moistureReading = latestReadings.find(r => {
      const sensor = sensorsList.find(s => s._id.toString() === r.sensorId.toString());
      return sensor?.type === 'moisture';
    });
    const tempReading = latestReadings.find(r => {
      const sensor = sensorsList.find(s => s._id.toString() === r.sensorId.toString());
      return sensor?.type === 'temperature';
    });
    const humidityReading = latestReadings.find(r => {
      const sensor = sensorsList.find(s => s._id.toString() === r.sensorId.toString());
      return sensor?.type === 'humidity';
    });
    const phReading = latestReadings.find(r => {
      const sensor = sensorsList.find(s => s._id.toString() === r.sensorId.toString());
      return sensor?.type === 'ph';
    });

    if (!farm.sensorData) {
      farm.sensorData = {
        moisture: 0,
        pH: 7.0,
        temperature: 0,
        humidity: 0,
        predictedYield: 0,
        waterRecommendation: 'Wait 24 hours'
      };
    }

    if (moistureReading) farm.sensorData.moisture = moistureReading.value;
    if (tempReading) farm.sensorData.temperature = tempReading.value;
    if (humidityReading) farm.sensorData.humidity = humidityReading.value;
    if (phReading) farm.sensorData.pH = phReading.value;

    if (moistureReading) {
      if (moistureReading.value < 30) farm.sensorData.waterRecommendation = 'Irrigate now';
      else if (moistureReading.value < 55) farm.sensorData.waterRecommendation = 'Wait 12 hours';
      else farm.sensorData.waterRecommendation = 'Wait 24 hours';
    }

    if (moistureReading || tempReading || humidityReading) {
      const now = new Date();
      const hourStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      farm.sensorHistory = farm.sensorHistory || [];
      farm.sensorHistory.push({
        timestamp: hourStr,
        moisture: farm.sensorData.moisture || 0,
        temperature: farm.sensorData.temperature || 0,
        humidity: farm.sensorData.humidity || 0
      });
      if (farm.sensorHistory.length > 8) {
        farm.sensorHistory.shift();
      }
    }

    await farm.save();

    // Check for abnormal IoT sensor readings during refresh
    if (farm.sensorData.moisture > 0 && farm.sensorData.moisture < 25) {
      await Notification.create({
        userId: req.user.id,
        title: 'Low Soil Moisture Warning',
        message: `Moisture level at "${farm.name}" has dropped to ${farm.sensorData.moisture}%. Recommended to activate irrigation system.`,
        category: 'irrigation',
        priority: 'high'
      });
    } else if (farm.sensorData.moisture > 80) {
      await Notification.create({
        userId: req.user.id,
        title: 'High Soil Moisture Alert',
        message: `Moisture level at "${farm.name}" is unusually high (${farm.sensorData.moisture}%). Potential waterlogging.`,
        category: 'irrigation',
        priority: 'medium'
      });
    }

    if (farm.sensorData.temperature > 38) {
      await Notification.create({
        userId: req.user.id,
        title: 'Extreme Temperature Warning',
        message: `Temperature at "${farm.name}" is critically high (${farm.sensorData.temperature}°C). Crop heat stress risk detected.`,
        category: 'weather',
        priority: 'high'
      });
    }
    
    const farmResponse = farm.toObject() as any;
    farmResponse.id = farmResponse._id.toString();

    res.json({ success: true, farm: farmResponse });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/farms/actuator', requireDB, requireAuth, [
  body('farmId').notEmpty().withMessage('Farm ID is required'),
  body('actuatorId').notEmpty().withMessage('Actuator ID is required'),
  body('state').isIn(['on', 'off']).withMessage('State must be on or off')
], validate, async (req: any, res: any) => {
  try {
    const { farmId, actuatorId, state } = req.body;
    const farm = await Farm.findOne({ _id: farmId, userId: req.user.id });
    if (!farm) {
      return res.status(404).json({ success: false, message: "Farm not found or access denied" });
    }

    if (!farm.actuators || farm.actuators.length === 0) {
      // Initialize if empty
      farm.actuators = [
        { id: 'a1', name: 'Zone 1 Irrigation Valve', type: 'valve', state: 'off', lastAction: 'Closed 2h ago' },
        { id: 'a2', name: 'Main Water Pump', type: 'pump', state: 'on', lastAction: 'Started 15m ago' },
        { id: 'a3', name: 'Nutrient Doser', type: 'pump', state: 'off', lastAction: 'Closed 1d ago' },
        { id: 'a4', name: 'Zone 2 Irrigation Valve', type: 'valve', state: 'error', lastAction: 'Failed to close' }
      ];
    }

    const actuator = farm.actuators.find((a: any) => a.id === actuatorId);
    if (!actuator) {
      return res.status(404).json({ success: false, message: "Actuator not found on this farm" });
    }

    if (actuator.state === 'error') {
      return res.status(400).json({ success: false, message: `Cannot control ${actuator.name}. Device in error state.` });
    }

    actuator.state = state;
    actuator.lastAction = `${state === 'on' ? 'Started' : 'Closed'} just now`;
    farm.markModified('actuators');
    await farm.save();

    // Create real notification
    await Notification.create({
      userId: req.user.id,
      title: `${actuator.name} Command Sent`,
      message: `Actuator "${actuator.name}" on farm "${farm.name}" was turned ${state.toUpperCase()} via IoT Command Center.`,
      category: 'iot',
      priority: 'low'
    });

    const farmResponse = farm.toObject() as any;
    farmResponse.id = farmResponse._id.toString();

    res.json({ success: true, farm: farmResponse });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- AI Routes ---

router.post('/disease-detection', requireDB, requireAuth, [
  body('base64Image').notEmpty().withMessage('Image data is required'),
  body('mimeType').notEmpty().withMessage('MIME Type is required'),
  body('cropType').notEmpty().withMessage('Crop Type is required')
], validate, async (req: any, res: any) => {
  const { base64Image, mimeType, cropType, farmId, language } = req.body;
  const userId = req.user.id;

  try {
    let farmName = "";
    // Verify farm ownership if farmId is provided
    if (farmId) {
      const farm = await Farm.findOne({ _id: farmId, userId });
      if (!farm) {
        return res.status(403).json({ success: false, message: "Access denied. Farm does not belong to user." });
      }
      farmName = farm.name;
    }

    const predictionData = await aiService.detectDisease(base64Image, mimeType, cropType, language || 'en');

    // Save diagnosis to DB
    const diagnosis = await DiseaseDiagnosis.create({
      userId,
      farmId,
      cropType: predictionData.cropType || cropType,
      diseaseName: predictionData.diseaseName || "Healthy",
      confidence: predictionData.confidence || 0.90,
      treatment: predictionData.treatment || "None required",
      imageUrl: base64Image ? `data:${mimeType};base64,${base64Image}` : undefined,
      severity: predictionData.severity || 'Low',
      symptoms: predictionData.symptoms || '',
      causes: predictionData.causes || '',
      prevention: predictionData.prevention || '',
      estimatedRecovery: predictionData.estimatedRecovery || 'N/A',
      irrigation: predictionData.irrigation || '',
      fertilizer: predictionData.fertilizer || '',
      imageForensics: predictionData.imageForensics || '',
      metadataAnalysis: predictionData.metadataAnalysis || '',
      explainableAi: predictionData.explainableAi || '',
      manipulationDetection: predictionData.manipulationDetection || '',
      riskAssessment: predictionData.riskAssessment || '',
      investigationTimeline: predictionData.investigationTimeline || ''
    });

    // Create a real notification based on Part 13 rules
    const isHealthy = diagnosis.diseaseName.toLowerCase().includes('healthy');
    const isHighRisk = diagnosis.severity === 'High' || diagnosis.severity === 'Critical';
    const isLowConfidence = diagnosis.confidence < 0.60;

    let notifTitle = 'Crop Disease Detected';
    let notifPriority = 'medium';
    let notifMsg = `Disease "${diagnosis.diseaseName}" detected on "${cropType}"${farmName ? ` on farm "${farmName}"` : ''} with ${Math.round(diagnosis.confidence * 100)}% confidence.`;

    if (isHighRisk) {
      notifTitle = 'Critical: High Risk Crop Disease!';
      notifPriority = 'high';
      notifMsg = `A high risk disease "${diagnosis.diseaseName}" has been detected on "${cropType}"${farmName ? ` on farm "${farmName}"` : ''} with severity "${diagnosis.severity}". Immediate action recommended!`;
    } else if (isHealthy) {
      notifTitle = 'Success: Crop Health Scan Complete';
      notifPriority = 'low';
      notifMsg = `A leaf scan for crop "${cropType}"${farmName ? ` on farm "${farmName}"` : ''} detected a healthy plant with ${Math.round(diagnosis.confidence * 100)}% confidence.`;
    }

    if (isLowConfidence) {
      notifMsg += ' Note: Confidence is below 60%. Manual inspection is highly recommended.';
      if (notifPriority === 'low') {
        notifPriority = 'medium';
      }
    }

    await Notification.create({
      userId,
      title: notifTitle,
      message: notifMsg,
      category: 'disease',
      priority: notifPriority
    });

    res.json({
      success: true,
      prediction: {
        diseaseName: diagnosis.diseaseName,
        confidence: diagnosis.confidence,
        treatment: diagnosis.treatment,
        cropType: diagnosis.cropType,
        severity: diagnosis.severity,
        symptoms: diagnosis.symptoms,
        causes: diagnosis.causes,
        prevention: diagnosis.prevention,
        estimatedRecovery: diagnosis.estimatedRecovery,
        irrigation: diagnosis.irrigation,
        fertilizer: diagnosis.fertilizer,
        imageForensics: diagnosis.imageForensics,
        metadataAnalysis: diagnosis.metadataAnalysis,
        explainableAi: diagnosis.explainableAi,
        manipulationDetection: diagnosis.manipulationDetection,
        riskAssessment: diagnosis.riskAssessment,
        investigationTimeline: diagnosis.investigationTimeline
      },
      diagnosisId: diagnosis._id
    });
  } catch (error: any) {
    const status = error.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
});

router.get('/disease-history', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const history = await DiseaseDiagnosis.find({ userId }).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, history });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/disease-history/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const result = await DiseaseDiagnosis.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }
    res.json({ success: true, message: "Disease report deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/translate', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { docId, moduleType, targetLanguage, data } = req.body;
    if (!targetLanguage || (targetLanguage !== 'en' && targetLanguage !== 'hi')) {
      return res.status(400).json({ success: false, message: 'Invalid target language' });
    }

    if (!docId) {
      if (!data) return res.status(400).json({ success: false, message: 'Data or docId is required' });
      const translated = await aiService.translateReport(data, targetLanguage);
      return res.json({ success: true, translated });
    }

    let model: any;
    if (moduleType === 'soil') model = SoilAnalysis;
    else if (moduleType === 'disease') model = DiseaseDiagnosis;
    else if (moduleType === 'yield') model = YieldPrediction;
    else return res.status(400).json({ success: false, message: 'Invalid module type' });

    const doc = await model.findOne({ _id: docId, userId: req.user.id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found or access denied' });
    }

    if (!doc.translations) {
      doc.translations = {};
    }

    if (doc.translations[targetLanguage]) {
      console.log(`[Translate API] Serving cached translation for ${moduleType} ${docId} in ${targetLanguage}`);
      return res.json({ success: true, translated: doc.translations[targetLanguage] });
    }

    const containsHindi = (text: string) => /[\u0900-\u097F]/.test(text);

    if (targetLanguage === 'en' && !containsHindi(doc.aiReport || doc.explainableAi || doc.treatment || '')) {
      let originalObj: any;
      if (moduleType === 'soil') {
        let parsedReport = {};
        try { parsedReport = JSON.parse(doc.aiReport || '{}'); } catch {}
        originalObj = {
          recommendations: doc.recommendations,
          deficiencies: doc.deficiencies,
          fertilizerRecommendation: doc.fertilizerRecommendation,
          irrigationRecommendation: doc.irrigationRecommendation,
          suitableCrops: doc.suitableCrops,
          riskLevel: doc.riskLevel,
          aiReport: parsedReport
        };
      } else if (moduleType === 'yield') {
        let parsedReport = {};
        try { parsedReport = JSON.parse(doc.aiReport || '{}'); } catch {}
        originalObj = {
          aiReport: parsedReport
        };
      } else if (moduleType === 'disease') {
        let parsedXAI = {};
        try { parsedXAI = JSON.parse(doc.explainableAi || '{}'); } catch {}
        originalObj = {
          diseaseName: doc.diseaseName,
          confidence: doc.confidence,
          treatment: doc.treatment,
          cropType: doc.cropType,
          severity: doc.severity,
          symptoms: doc.symptoms,
          causes: doc.causes,
          prevention: doc.prevention,
          estimatedRecovery: doc.estimatedRecovery,
          irrigation: doc.irrigation,
          fertilizer: doc.fertilizer,
          imageForensics: doc.imageForensics,
          metadataAnalysis: doc.metadataAnalysis,
          explainableAi: parsedXAI,
          manipulationDetection: doc.manipulationDetection,
          riskAssessment: doc.riskAssessment,
          investigationTimeline: doc.investigationTimeline
        };
      }
      if (originalObj && typeof originalObj.explainableAi === 'object') {
        originalObj.explainableAi = JSON.stringify(originalObj.explainableAi);
      }
      doc.translations[targetLanguage] = originalObj;
      doc.markModified('translations');
      await doc.save();
      return res.json({ success: true, translated: originalObj });
    }

    let sourceData: any;
    if (moduleType === 'soil') {
      let parsedReport = {};
      try { parsedReport = JSON.parse(doc.aiReport || '{}'); } catch {}
      sourceData = {
        recommendations: doc.recommendations,
        deficiencies: doc.deficiencies,
        fertilizerRecommendation: doc.fertilizerRecommendation,
        irrigationRecommendation: doc.irrigationRecommendation,
        suitableCrops: doc.suitableCrops,
        riskLevel: doc.riskLevel,
        aiReport: parsedReport
      };
    } else if (moduleType === 'yield') {
      let parsedReport = {};
      try { parsedReport = JSON.parse(doc.aiReport || '{}'); } catch {}
      sourceData = {
        aiReport: parsedReport
      };
    } else if (moduleType === 'disease') {
      let parsedXAI = {};
      try { parsedXAI = JSON.parse(doc.explainableAi || '{}'); } catch {}
      sourceData = {
        diseaseName: doc.diseaseName,
        confidence: doc.confidence,
        treatment: doc.treatment,
        cropType: doc.cropType,
        severity: doc.severity,
        symptoms: doc.symptoms,
        causes: doc.causes,
        prevention: doc.prevention,
        estimatedRecovery: doc.estimatedRecovery,
        irrigation: doc.irrigation,
        fertilizer: doc.fertilizer,
        imageForensics: doc.imageForensics,
        metadataAnalysis: doc.metadataAnalysis,
        explainableAi: parsedXAI,
        manipulationDetection: doc.manipulationDetection,
        riskAssessment: doc.riskAssessment,
        investigationTimeline: doc.investigationTimeline
      };
    }

    console.log(`[Translate API] Fetching new translation via AI for ${moduleType} ${docId} to ${targetLanguage}`);
    const translated = await aiService.translateReport(sourceData, targetLanguage);
    
    if (translated && typeof translated.explainableAi === 'object') {
      translated.explainableAi = JSON.stringify(translated.explainableAi);
    }
    
    doc.translations[targetLanguage] = translated;
    doc.markModified('translations');
    await doc.save();

    res.json({ success: true, translated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Soil Analysis Routes ---
router.post('/soil-analysis', requireDB, requireAuth, [
  body('farmId').notEmpty().withMessage('Farm ID is required'),
  body('moisture').isNumeric().withMessage('Moisture must be a number'),
  body('pH').isNumeric().withMessage('pH must be a number'),
  body('nitrogen').isNumeric().withMessage('Nitrogen must be a number'),
  body('phosphorus').isNumeric().withMessage('Phosphorus must be a number'),
  body('potassium').isNumeric().withMessage('Potassium must be a number'),
  body('organicCarbon').isNumeric().withMessage('Organic Carbon must be a number'),
  body('temperature').isNumeric().withMessage('Temperature must be a number'),
  body('humidity').isNumeric().withMessage('Humidity must be a number')
], validate, async (req: any, res: any) => {
  try {
    const { farmId, moisture, pH, nitrogen, phosphorus, potassium, organicCarbon, temperature, humidity, language } = req.body;
    const userId = req.user.id;

    // Verify farm ownership
    const farm = await Farm.findOne({ _id: farmId, userId });
    if (!farm) {
      return res.status(403).json({ success: false, message: "Access denied. Farm does not belong to user." });
    }

    const enhancedResult = await aiService.getSoilRecommendations({
      cropType: farm.cropType,
      moisture, pH, nitrogen, phosphorus, potassium, organicCarbon, temperature, humidity,
      language: language || 'en'
    });

    const analysis = await SoilAnalysis.create({
      userId,
      farmId,
      moisture, pH, nitrogen, phosphorus, potassium, organicCarbon, temperature, humidity,
      recommendations: enhancedResult.recommendations,
      soilHealth: enhancedResult.soilHealth,
      deficiencies: enhancedResult.deficiencies,
      fertilizerRecommendation: enhancedResult.fertilizerRecommendation,
      irrigationRecommendation: enhancedResult.irrigationRecommendation,
      suitableCrops: enhancedResult.suitableCrops,
      riskLevel: enhancedResult.riskLevel,
      aiReport: enhancedResult.aiReport || ''
    });

    // Trigger Notification for the new soil analysis
    const isOptimal = pH >= 6.0 && pH <= 7.5 && moisture >= 30 && moisture <= 70;
    await Notification.create({
      userId,
      title: 'Soil Analysis Completed',
      message: `Soil analysis for "${farm.name}" completed. Health Score: ${enhancedResult.soilHealth}/10. Risk: ${enhancedResult.riskLevel}.`,
      category: 'soil',
      priority: isOptimal ? 'low' : 'high'
    });

    res.json({ success: true, analysis });
  } catch (error: any) {
    const status = error.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
});

router.get('/soil-analysis', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const farmId = req.query.farmId;
    let history;
    if (farmId) {
      // Verify farm ownership
      const farm = await Farm.findOne({ _id: farmId, userId: req.user.id });
      if (!farm) {
        return res.status(403).json({ success: false, message: "Access denied. Farm does not belong to user." });
      }
      history = await SoilAnalysis.find({ farmId }).sort({ createdAt: -1 }).limit(100);
    } else {
      // Fetch all user's farms
      const userFarms = await Farm.find({ userId: req.user.id });
      const farmIds = userFarms.map(f => f._id);
      history = await SoilAnalysis.find({ farmId: { $in: farmIds } }).sort({ createdAt: -1 }).limit(100);
    }
    res.json({ success: true, history });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/soil-analysis/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const result = await SoilAnalysis.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }
    res.json({ success: true, message: "Soil report deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Yield Prediction Routes ---
router.post('/yield-predictions/predict', requireDB, requireAuth, [
  body('farmId').notEmpty().withMessage('Farm ID is required'),
  body('cropType').notEmpty().withMessage('Crop Type is required'),
  body('area').isNumeric().withMessage('Area must be a number'),
  body('season').notEmpty().withMessage('Season is required'),
  body('soilType').notEmpty().withMessage('Soil Type is required'),
  body('irrigation').notEmpty().withMessage('Irrigation type is required'),
  body('fertilizer').notEmpty().withMessage('Fertilizer regimen is required')
], validate, async (req: any, res: any) => {
  try {
    const { farmId, cropType, area, season, soilType, irrigation, fertilizer, historicalYield, language } = req.body;
    const userId = req.user.id;

    // Verify farm ownership
    const farm = await Farm.findOne({ _id: farmId, userId });
    if (!farm) return res.status(403).json({ success: false, message: 'Farm not found.' });

    // Fetch actual DB context in parallel
    const [latestSoil, latestWeather, irrigationRecords, fertilizerRecords, activeCrops] = await Promise.all([
      SoilAnalysis.findOne({ farmId }).sort({ createdAt: -1 }).lean(),
      WeatherRecord.findOne({ $or: [{ farmId }, { userId }] }).sort({ timestamp: -1 }).lean(),
      IrrigationRecord.find({ farmId }).sort({ date: -1 }).limit(5).lean(),
      FertilizerRecord.find({ farmId }).sort({ date: -1 }).limit(5).lean(),
      Crop.find({ farmId, status: 'Growing' }).lean()
    ]);

    const irrigationSummary = irrigationRecords.length > 0
      ? irrigationRecords.map((i: any) => `${new Date(i.date).toLocaleDateString()}: ${i.waterAmount}L/${i.duration}min`).join(', ')
      : 'No recent records';
    const fertilizerSummary = fertilizerRecords.length > 0
      ? fertilizerRecords.map((f: any) => `${new Date(f.date).toLocaleDateString()}: ${f.type} ${f.quantity}kg`).join(', ')
      : 'No recent records';
    const activeCropSummary = activeCrops.length > 0
      ? activeCrops.map((c: any) => `${c.name} (${c.variety})`).join(', ')
      : 'None recorded';

    const predictionResult = await aiService.predictYield({
      cropType, area, season, soilType, irrigation, fertilizer,
      historicalYield: parseFloat(historicalYield || '0'),
      weather: latestWeather ? latestWeather.condition : 'Unknown',
      // Extra DB context fields (passed through as any)
      ...(latestSoil ? {
        soilPH: latestSoil.pH,
        soilMoisture: latestSoil.moisture,
        soilNitrogen: latestSoil.nitrogen,
        soilPhosphorus: latestSoil.phosphorus,
        soilPotassium: latestSoil.potassium
      } : {}),
      ...(latestWeather ? { weatherTemp: latestWeather.temperature, weatherHumidity: latestWeather.humidity } : {}),
      irrigationSummary,
      fertilizerSummary,
      activeCrops: activeCropSummary,
      language: language || 'en'
    } as any);

    res.json({ success: true, prediction: predictionResult });
  } catch (error: any) {
    const status = error.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
});

router.post('/yield-predictions', requireDB, requireAuth, [
  body('farmId').notEmpty().withMessage('Farm ID is required'),
  body('cropType').notEmpty().withMessage('Crop Type is required'),
  body('area').isNumeric().withMessage('Area must be a number'),
  body('predictedYield').isNumeric().withMessage('Predicted Yield must be a number'),
  body('errorMargin').isNumeric().withMessage('Error Margin must be a number')
], validate, async (req: any, res: any) => {
  try {
    const { farmId, cropType, area, predictedYield, errorMargin, aiReport } = req.body;
    const userId = req.user.id;

    // Verify farm ownership
    const farm = await Farm.findOne({ _id: farmId, userId: req.user.id });
    if (!farm) {
      return res.status(403).json({ success: false, message: "Access denied. Farm does not belong to user." });
    }

    const prediction = await YieldPrediction.create({
      userId: req.user.id,
      farmId,
      cropType,
      area,
      predictedYield,
      errorMargin,
      aiReport: aiReport || ''
    });
    
    // Create automatic notification for Yield Prediction
    await Notification.create({
      userId: req.user.id,
      title: 'Yield Projection Generated',
      message: `AI model projected a yield of ${predictedYield} tons for "${farm.name}" with ${(100 - errorMargin).toFixed(1)}% confidence accuracy.`,
      category: 'ai_recommendation',
      priority: 'low'
    });

    res.json({ success: true, prediction });
  } catch (error: any) {
    const status = error.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
});

router.get('/yield-predictions', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const history = await YieldPrediction.find({ userId }).sort({ createdAt: -1 }).limit(150);
    res.json({ success: true, history });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/yield-predictions/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const result = await YieldPrediction.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }
    res.json({ success: true, message: "Yield prediction report deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Sensor Readings Routes ---
router.get('/sensors/readings', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { farmId, limit = '100' } = req.query;
    const userId = req.user.id;
    if (!farmId) return res.status(400).json({ success: false, message: 'farmId is required' });
    // Verify farm ownership
    const farm = await Farm.findOne({ _id: farmId, userId }).lean();
    if (!farm) return res.status(403).json({ success: false, message: 'Farm not found' });
    // Get sensor devices for this farm
    const devices = await SensorDevice.find({ farmId, userId }).lean();
    const sensorIds = devices.map((d: any) => d._id);
    const readings = await SensorReading.find({ sensorId: { $in: sensorIds } })
      .sort({ timestamp: -1 }).limit(parseInt(limit as string)).lean();
    // Enrich readings with sensor name/type
    const enriched = readings.map((r: any) => {
      const device = devices.find((d: any) => String(d._id) === String(r.sensorId));
      return { ...r, sensorName: device?.name, sensorType: device?.type };
    });
    res.json({ success: true, readings: enriched.reverse() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/sensors/reading', requireDB, requireAuth, [
  body('sensorId').notEmpty().withMessage('Sensor ID is required'),
  body('farmId').notEmpty().withMessage('Farm ID is required'),
  body('value').isNumeric().withMessage('Value must be a number')
], validate, async (req: any, res: any) => {
  try {
    const { sensorId, farmId, value } = req.body;
    const userId = req.user.id;
    const reading = await SensorReading.create({ userId, farmId, sensorId, value, timestamp: new Date() });
    res.json({ success: true, reading });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Full Summary Report Endpoint (for PDF generation) ---
router.get('/reports/full-summary', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { farmId } = req.query;
    const userId = req.user.id;
    if (!farmId) return res.status(400).json({ success: false, message: 'farmId is required' });
    const farm = await Farm.findOne({ _id: farmId, userId }).lean();
    if (!farm) return res.status(403).json({ success: false, message: 'Farm not found' });
    const [soilAnalyses, diseaseReports, yieldPredictions, irrigationRecords, fertilizerRecords, weatherRecords, crops] = await Promise.all([
      SoilAnalysis.find({ farmId }).sort({ createdAt: -1 }).limit(5).lean(),
      DiseaseDiagnosis.find({ farmId }).sort({ createdAt: -1 }).limit(5).lean(),
      YieldPrediction.find({ farmId }).sort({ createdAt: -1 }).limit(5).lean(),
      IrrigationRecord.find({ farmId }).sort({ date: -1 }).limit(5).lean(),
      FertilizerRecord.find({ farmId }).sort({ date: -1 }).limit(5).lean(),
      WeatherRecord.find({ $or: [{ farmId }, { userId }] }).sort({ timestamp: -1 }).limit(3).lean(),
      Crop.find({ farmId }).lean()
    ]);
    res.json({ success: true, farm, soilAnalyses, diseaseReports, yieldPredictions, irrigationRecords, fertilizerRecords, weatherRecords, crops });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/reports/toggle-favorite', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { id, type } = req.body;
    if (!id || !type) return res.status(400).json({ success: false, message: "ID and Type are required" });

    let model: any;
    if (type === 'Soil Analysis') model = SoilAnalysis;
    else if (type === 'Disease Diagnosis') model = DiseaseDiagnosis;
    else if (type === 'Yield Prediction') model = YieldPrediction;
    else if (type === 'AI Insights') model = Notification;
    else return res.status(400).json({ success: false, message: "Invalid report type" });

    const doc = await model.findOne({ _id: id, userId: req.user.id });
    if (!doc) return res.status(404).json({ success: false, message: "Report not found" });

    doc.isFavorite = !doc.isFavorite;
    await doc.save();

    res.json({ success: true, isFavorite: doc.isFavorite });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/reports/toggle-archive', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { id, type } = req.body;
    if (!id || !type) return res.status(400).json({ success: false, message: "ID and Type are required" });

    let model: any;
    if (type === 'Soil Analysis') model = SoilAnalysis;
    else if (type === 'Disease Diagnosis') model = DiseaseDiagnosis;
    else if (type === 'Yield Prediction') model = YieldPrediction;
    else if (type === 'AI Insights') model = Notification;
    else return res.status(400).json({ success: false, message: "Invalid report type" });

    const doc = await model.findOne({ _id: id, userId: req.user.id });
    if (!doc) return res.status(404).json({ success: false, message: "Report not found" });

    doc.isArchived = !doc.isArchived;
    await doc.save();

    res.json({ success: true, isArchived: doc.isArchived });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function getBilingualNotificationData(titleEn: string, messageEn: string) {
  try {
    if (titleEn.trim().startsWith('{') && messageEn.trim().startsWith('{')) {
      const tObj = JSON.parse(titleEn);
      const mObj = JSON.parse(messageEn);
      if (tObj && typeof tObj === 'object' && mObj && typeof mObj === 'object') {
        return {
          title: titleEn,
          message: messageEn
        };
      }
    }
  } catch (e) {}

  let titleHi = titleEn;
  const titleDict: Record<string, string> = {
    'New Field Added': 'नया फ़ील्ड जोड़ा गया',
    'UI Alert': 'यूआई अलर्ट',
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
    'AI Executive Health Report': 'एआई कार्यकारी स्वास्थ्य रिपोर्ट'
  };
  if (titleDict[titleEn]) {
    titleHi = titleDict[titleEn];
  }

  let messageHi = messageEn;
  const msgDict: Record<string, string> = {
    'AI Image scanner registered Puccinia graminis spores in Sector B. Isolated spraying advised.': 'एआई इमेज स्कैनर ने सेक्टर B में पुक्सिनिया ग्रामिनिस बीजाणुओं को दर्ज किया। अलग छिड़काव की सलाह दी गई।',
    'IoT Soil Spectrometer registered N-P-K depletion in Tomato greenhouse. Nitrogen top dressing required.': 'IoT सॉयल स्पेक्ट्रोमीटर ने टमाटर ग्रीनहाउस में N-P-K की कमी दर्ज की। नाइट्रोजन टॉप ड्रेसिंग की आवश्यकता है।',
    'Micro-climate sensors report rapid temperature rise to 39.5°C in high-tunnel greenhouses.': 'सूक्ष्म-जलवायु सेंसर उच्च-सुरंग ग्रीनहाउस में 39.5°C तक तेजी से तापमान वृद्धि की रिपोर्ट करते हैं।',
    'Heavy bumper harvests in neighboring states are putting downward pressure on spot Wheat pricing.': 'पड़ोसी राज्यों में भारी बंपर पैदावार से स्पॉट गेहूं के मूल्य निर्धारण पर दबाव पड़ रहा है।',
    'State agriculture bureau announces direct income support schemes for bio-certified farmlands.': 'राज्य कृषि ब्यूरो ने जैव-प्रमाणित कृषि भूमि के लिए सीधे आय सहायता योजनाओं की घोषणा की।',
    'Battery level of Moisture Sensor #B14-Zone3 fell below 5%. Power cycle or cell swap recommended.': 'नमी सेंसर #B14-Zone3 का बैटरी स्तर 5% से नीचे गिर गया। पावर चक्र या सेल स्वैप की सिफारिश की गई।',
    'Telemetry anomaly: Valve #3 remains closed despite irrigation system signal trigger.': 'टेलीमेट्री विसंगति: सिंचाई प्रणाली संकेत ट्रिगर के बावजूद वाल्व #3 बंद रहता है।',
    'Infrared barrier alert: Laser grid interrupted along Sector C perimeter fencing.': 'इन्फ्रारेड बैरियर अलर्ट: सेक्टर C परिधि बाड़ लगाने के साथ लेजर ग्रिड बाधित हुआ।',
    'Predictive models show high pest vulnerability over the next 48 hours. Wind conditions are optimal today.': 'भविष्यवाणी मॉडल अगले 48 घंटों में उच्च कीट संवेदनशीलता दिखाते हैं। हवा की स्थिति आज अनुकूलतम है।'
  };

  if (msgDict[messageEn]) {
    messageHi = msgDict[messageEn];
  } else {
    if (messageEn.startsWith('Field "') && messageEn.includes('has been added to farm')) {
      const match = messageEn.match(/Field "([^"]+)" has been added to farm "([^"]+)"\./);
      if (match) {
        messageHi = `फील्ड "${match[1]}" को "${match[2]}" खेत में जोड़ा गया है।`;
      }
    } else if (messageEn.startsWith('Crop "') && messageEn.includes('registered as growing on farm')) {
      const match = messageEn.match(/Crop "([^"]+)"(?:\s*\(([^)]+)\))?\s*registered as growing on farm "([^"]+)"\./);
      if (match) {
        messageHi = `फसल "${match[1]}${match[2] ? ` (${match[2]})` : ''}" को "${match[3]}" खेत में पंजीकृत किया गया है।`;
      }
    } else if (messageEn.startsWith('Sensor device "') && messageEn.includes('is online on farm')) {
      const match = messageEn.match(/Sensor device "([^"]+)"(?:\s*\(([^)]+)\))?\s*is online on farm "([^"]+)"\./);
      if (match) {
        messageHi = `सेंसर उपकरण "${match[1]}${match[2] ? ` (${match[2]})` : ''}" "${match[3]}" खेत पर ऑनलाइन है।`;
      }
    } else if (messageEn.startsWith('Soil analysis for "') && messageEn.includes('completed')) {
      const match = messageEn.match(/Soil analysis for "([^"]+)" completed\.(.*)/);
      if (match) {
        let extra = match[2] || '';
        extra = extra.replace('Health Score', 'स्वास्थ्य स्कोर');
        messageHi = `"${match[1]}" के लिए मिट्टी विश्लेषण पूरा हुआ।${extra}`;
      }
    } else if (messageEn.startsWith('Digital Twin for "')) {
      const match = messageEn.match(/Digital Twin for "([^"]+)" has been successfully created with ([^ ]+) acres of ([^.]+)\./);
      if (match) {
        messageHi = `"${match[1]}" के लिए डिजिटल ट्विन सफलतापूर्वक ${match[2]} एकड़ ${match[3]} के साथ बनाया गया है।`;
      }
    } else if (messageEn.startsWith('Details of your farm "')) {
      const match = messageEn.match(/Details of your farm "([^"]+)" have been updated\./);
      if (match) {
        messageHi = `आपके फ़ार्म "${match[1]}" के विवरण अपडेट कर दिए गए हैं।`;
      }
    } else if (messageEn.startsWith('Farm "') && messageEn.includes('has been removed')) {
      const match = messageEn.match(/Farm "([^"]+)" has been removed\./);
      if (match) {
        messageHi = `फ़ार्म "${match[1]}" हटा दिया गया है।`;
      }
    } else if (messageEn.startsWith('Field "')) {
      const match = messageEn.match(/Field "([^"]+)" was successfully removed from digital twin\./);
      if (match) {
        messageHi = `डिजिटल ट्विन से फ़ील्ड "${match[1]}" सफलतापूर्वक हटा दी गई थी।`;
      }
    } else if (messageEn.startsWith('New crop cycle "')) {
      const match = messageEn.match(/New crop cycle "([^"]+)" registered for Field "([^"]+)"\./);
      if (match) {
        messageHi = `फ़ील्ड "${match[2]}" के लिए नया फसल चक्र "${match[1]}" पंजीकृत किया गया।`;
      }
    } else if (messageEn.startsWith('Sensor device "') && messageEn.includes('online')) {
      const match = messageEn.match(/Sensor device "([^"]+)" \(([^)]+)\) is now online\./);
      if (match) {
        messageHi = `सेंसर उपकरण "${match[1]}" (${match[2]}) अब ऑनलाइन है।`;
      }
    } else if (messageEn.startsWith('Sensor device "') && messageEn.includes('offline')) {
      const match = messageEn.match(/Sensor device "([^"]+)" went offline\. Telemetry connection lost\./);
      if (match) {
        messageHi = `सेंसर उपकरण "${match[1]}" ऑफ़लाइन हो गया। टेलीमेट्री कनेक्शन टूट गया।`;
      }
    } else if (messageEn.startsWith('Critical sensor alert: "')) {
      const match = messageEn.match(/Critical sensor alert: "([^"]+)" reported high readings\./);
      if (match) {
        messageHi = `गंभीर सेंसर अलर्ट: "${match[1]}" ने उच्च रीडिंग की सूचना दी।`;
      }
    } else if (messageEn.startsWith('Irrigation of ')) {
      const match = messageEn.match(/Irrigation of ([^ ]+)L recorded for ([^ ]+) in "([^"]+)"\./);
      if (match) {
        messageHi = `"${match[3]}" में ${match[2]} के लिए ${match[1]}L सिंचाई दर्ज की गई।`;
      }
    } else if (messageEn.startsWith('Fertilizer application of ')) {
      const match = messageEn.match(/Fertilizer application of ([^ ]+)kg \(([^)]+)\) recorded for ([^.]+)\./);
      if (match) {
        messageHi = `${match[3]} के लिए ${match[1]}kg (${match[2]}) उर्वरक प्रयोग दर्ज किया गया।`;
      }
    } else if (messageEn.startsWith('Soil health analysis completed for "')) {
      const match = messageEn.match(/Soil health analysis completed for "([^"]+)". pH: ([^,]+), Nitrogen: ([^ ]+) kg\/ha\./);
      if (match) {
        messageHi = `"${match[1]}" के लिए मिट्टी स्वास्थ्य विश्लेषण पूरा हुआ। pH: ${match[2]}, नाइट्रोजन: ${match[3]} किग्रा/हेक्टेयर।`;
      }
    } else if (messageEn.startsWith('AI model projected a yield of ')) {
      const match = messageEn.match(/AI model projected a yield of ([^ ]+) tons for "([^"]+)" with ([^ ]+)% confidence accuracy\./);
      if (match) {
        messageHi = `एआई मॉडल ने "${match[2]}" के लिए ${match[1]} टन उपज का अनुमान ${match[3]}% आत्मविश्वास सटीकता के साथ लगाया है।`;
      }
    } else if (messageEn.startsWith('Disease "') || messageEn.startsWith('A high risk disease "') || messageEn.startsWith('A leaf scan for crop "')) {
      if (messageEn.startsWith('Disease "')) {
        const match = messageEn.match(/Disease "([^"]+)" detected on "([^"]+)"(?: on farm "([^"]+)")? with ([^ ]+)% confidence\./);
        if (match) {
          const farmPart = match[3] ? ` फ़ार्म "${match[3]}" पर` : '';
          messageHi = `फसल "${match[2]}"${farmPart} पर रोग "${match[1]}" की पहचान ${match[4]}% आत्मविश्वास के साथ हुई है।`;
        }
      } else if (messageEn.startsWith('A high risk disease "')) {
        const match = messageEn.match(/A high risk disease "([^"]+)" has been detected on "([^"]+)"(?: on farm "([^"]+)")? with severity "([^"]+)". Immediate action recommended!/);
        if (match) {
          const farmPart = match[3] ? ` फ़ार्म "${match[3]}" पर` : '';
          messageHi = `फसल "${match[2]}"${farmPart} पर एक उच्च जोखिम वाला रोग "${match[1]}" पाया गया है (गंभीरता "${match[4]}")। तत्काल कार्रवाई की सिफारिश की जाती है!`;
        }
      } else if (messageEn.startsWith('A leaf scan for crop "')) {
        const match = messageEn.match(/A leaf scan for crop "([^"]+)"(?: on farm "([^"]+)")? detected a healthy plant with ([^ ]+)% confidence\./);
        if (match) {
          const farmPart = match[2] ? ` फ़ार्म "${match[2]}" पर` : '';
          messageHi = `फसल "${match[1]}"${farmPart} के लिए पत्ती का स्कैन ${match[3]}% आत्मविश्वास के साथ एक स्वस्थ पौधा पाया गया।`;
        }
      }
      if (messageEn.includes('Manual inspection is highly recommended')) {
        messageHi += ' नोट: आत्मविश्वास 60% से कम है। मैन्युअल निरीक्षण की अत्यधिक सिफारिश की जाती है।';
      }
    } else if (messageEn.startsWith('New gateway device "')) {
      const match = messageEn.match(/New gateway device "([^"]+)" configured on field\./);
      if (match) {
        messageHi = `फ़ील्ड पर नया गेटवे उपकरण "${match[1]}" कॉन्फ़िगर किया गया।`;
      }
    } else if (messageEn.startsWith('New device "') && messageEn.includes('configured')) {
      const match = messageEn.match(/New device "([^"]+)" configured\./);
      if (match) {
        messageHi = `नया उपकरण "${match[1]}" कॉन्फ़िगर किया गया।`;
      }
    } else if (messageEn.startsWith('Irrigation schedule event: ')) {
      const match = messageEn.match(/Irrigation schedule event: ([^ ]+)L water applied on ([^.]+)\./);
      if (match) {
        messageHi = `सिंचाई अनुसूची घटना: ${match[2]} पर ${match[1]}L पानी लगाया गया।`;
      }
    } else if (messageEn.startsWith('Irrigation event logged: ')) {
      const match = messageEn.match(/Irrigation event logged: ([^ ]+)L applied to field\./);
      if (match) {
        messageHi = `सिंचाई घटना दर्ज: फ़ील्ड में ${match[1]}L पानी लगाया गया।`;
      }
    } else if (messageEn.startsWith('New weather data logged: ')) {
      const match = messageEn.match(/New weather data logged: Temp: ([^,]+), Rain: ([^.]+)\./);
      if (match) {
        messageHi = `नया मौसम डेटा दर्ज: तापमान: ${match[1]}, वर्षा: ${match[2]}।`;
      }
    } else if (messageEn.startsWith('New weather record: ')) {
      const match = messageEn.match(/New weather record: temp ([^°]+)°C, humidity ([^%]+)%\./);
      if (match) {
        messageHi = `नया मौसम रिकॉर्ड: तापमान ${match[1]}°C, आर्द्रता ${match[2]}%।`;
      }
    } else if (messageEn.includes('Optimal harvest window in ')) {
      const match = messageEn.match(/AI advisory forecast for "([^"]+)": Optimal harvest window in ([^.]+)\./);
      if (match) {
        messageHi = `"${match[1]}" के लिए एआई सलाहकार पूर्वानुमान: ${match[2]} में अनुकूलतम कटाई विंडो।`;
      }
    } else if (messageEn.includes('recommended nutrient adjustment for "')) {
      const match = messageEn.match(/AI advisor recommended nutrient adjustment for "([^"]+)": Apply ([^.]+)\./);
      if (match) {
        messageHi = `"${match[1]}" के लिए एआई सलाहकार द्वारा अनुशंसित पोषक तत्व समायोजन: ${match[2]} लागू करें।`;
      }
    } else if (messageEn.startsWith('Harvest advisory for farm: ')) {
      const match = messageEn.match(/Harvest advisory for farm: optimal harvest in ([^.]+)\./);
      if (match) {
        messageHi = `खेत के लिए फसल कटाई सलाहकार: ${match[1]} में अनुकूलतम कटाई।`;
      }
    } else if (messageEn.startsWith('Nutrient advisory: ')) {
      const match = messageEn.match(/Nutrient advisory: apply ([^ ]+)kg Nitrogen\./);
      if (match) {
        messageHi = `पोषक तत्व सलाहकार: ${match[1]}kg नाइट्रोजन लागू करें।`;
      }
    } else if (messageEn.startsWith('Government Scheme Alert: "')) {
      const match = messageEn.match(/Government Scheme Alert: "([^"]+)" is now active in your region\./);
      if (match) {
        messageHi = `सरकारी योजना अलर्ट: "${match[1]}" अब आपके क्षेत्र में सक्रिय है।`;
      }
    } else if (messageEn.startsWith('New scheme: "')) {
      const match = messageEn.match(/New scheme: "([^"]+)" is now active\./);
      if (match) {
        messageHi = `नई योजना: "${match[1]}" अब सक्रिय है।`;
      }
    }
  }

  return {
    title: JSON.stringify({ en: titleEn, hi: titleHi }),
    message: JSON.stringify({ en: messageEn, hi: messageHi })
  };
}

// Monkeypatch Notification Mongoose Model Methods to store bilingually
const originalCreate = Notification.create.bind(Notification);
Notification.create = async function(doc: any, ...args: any[]) {
  if (doc && typeof doc === 'object' && doc.title && doc.message) {
    const bilingual = getBilingualNotificationData(doc.title, doc.message);
    doc.title = bilingual.title;
    doc.message = bilingual.message;
  }
  return originalCreate(doc, ...args);
} as any;

const originalInsertMany = Notification.insertMany.bind(Notification);
Notification.insertMany = async function(docs: any[], ...args: any[]) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc && typeof doc === 'object' && doc.title && doc.message) {
        const bilingual = getBilingualNotificationData(doc.title, doc.message);
        doc.title = bilingual.title;
        doc.message = bilingual.message;
      }
    });
  }
  return originalInsertMany(docs, ...args);
} as any;

// --- Notifications Routes ---
router.post('/notifications', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    if (Array.isArray(req.body)) {
      const docs = req.body.map(item => {
        const bilingual = getBilingualNotificationData(item.title, item.message);
        return {
          userId,
          title: bilingual.title,
          message: bilingual.message,
          category: item.category || 'ai_recommendation',
          priority: item.priority || 'medium',
          isRead: !!item.isRead,
          isArchived: !!item.isArchived,
          createdAt: item.timestamp ? new Date(item.timestamp) : new Date()
        };
      });
      const created = await Notification.insertMany(docs);
      return res.json({ success: true, notifications: created });
    } else {
      const { title, message, category, priority } = req.body;
      const bilingual = getBilingualNotificationData(title, message);
      const notification = await Notification.create({
        userId,
        title: bilingual.title,
        message: bilingual.message,
        category: category || 'ai_recommendation',
        priority: priority || 'medium',
        isRead: false,
        isArchived: false
      });
      return res.json({ success: true, notification });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/notifications', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/notifications/:id/read', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const notification = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isRead: true }, { new: true });
    res.json({ success: true, notification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/notifications/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { isRead, isArchived } = req.body;
    const update: any = {};
    if (isRead !== undefined) update.isRead = isRead;
    if (isArchived !== undefined) update.isArchived = isArchived;
    
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      update,
      { new: true }
    );
    res.json({ success: true, notification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/notifications/bulk', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { ids, action } = req.body;
    if (!ids || !Array.isArray(ids) || !action) {
      return res.status(400).json({ success: false, message: "Missing ids or action" });
    }
    
    if (action === 'read') {
      await Notification.updateMany({ _id: { $in: ids }, userId: req.user.id }, { isRead: true });
    } else if (action === 'archive') {
      await Notification.updateMany({ _id: { $in: ids }, userId: req.user.id }, { isArchived: true });
    } else if (action === 'delete') {
      await Notification.deleteMany({ _id: { $in: ids }, userId: req.user.id });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/notifications/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    await Notification.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Chat Assistant Route ---
router.post('/chat', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { message, base64Image, mimeType, language } = req.body;
    const userId = req.user.id;
    
    if (!message && !base64Image) {
      return res.status(400).json({ success: false, message: 'Either message or image is required' });
    }

    console.log(`[Frontend Request] User ID: ${userId}, Has Image: ${!!base64Image}, Message: "${message || ''}"`);
    
    // Fetch all related databases in parallel
    const [
      farms,
      fields,
      crops,
      soilAnalyses,
      sensorDevices,
      weatherRecords,
      irrigationRecords,
      fertilizerRecords,
      diseaseReports
    ] = await Promise.all([
      Farm.find({ userId }).lean(),
      Field.find({ userId }).lean(),
      Crop.find({ userId }).lean(),
      SoilAnalysis.find({ userId }).lean(),
      SensorDevice.find({ userId }).lean(),
      WeatherRecord.find({ userId }).sort({ timestamp: -1 }).limit(5).lean(),
      IrrigationRecord.find({ userId }).sort({ date: -1 }).limit(10).lean(),
      FertilizerRecord.find({ userId }).sort({ date: -1 }).limit(10).lean(),
      DiseaseDiagnosis.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    // Requirement: If no farm data exists, clearly say: "No farm data is available yet. Please add a farm and sensor records."
    if (!farms || farms.length === 0) {
      console.log(`[Chat Route empty state] No farms found for user ${userId}`);
      return res.json({ success: true, reply: "No farm data is available yet. Please add a farm and sensor records." });
    }

    // Build dynamic context from records
    const contextParts: string[] = [];

    contextParts.push(`Farms:\n` + farms.map((f: any) => `- Name: ${f.name}, Location: ${f.location}, Area: ${f.area} acres, Crop: ${f.cropType}. Current sensor data: Moisture ${f.sensorData?.moisture ?? 'N/A'}%, pH ${f.sensorData?.pH ?? 'N/A'}, Temp ${f.sensorData?.temperature ?? 'N/A'}C, Humidity ${f.sensorData?.humidity ?? 'N/A'}%`).join('\n'));

    if (fields.length > 0) {
      contextParts.push(`Fields:\n` + fields.map((f: any) => `- Name: ${f.name}, Crop: ${f.cropType}, Area: ${f.area} acres`).join('\n'));
    }
    if (crops.length > 0) {
      contextParts.push(`Crops:\n` + crops.map((c: any) => `- Name: ${c.name}, Variety: ${c.variety}, Status: ${c.status}, Planted: ${c.plantedDate ? new Date(c.plantedDate).toLocaleDateString() : 'N/A'}`).join('\n'));
    }
    if (soilAnalyses.length > 0) {
      contextParts.push(`Soil Analyses:\n` + soilAnalyses.map((s: any) => `- Moisture: ${s.moisture}%, pH: ${s.pH}, Nitrogen: ${s.nitrogen ?? 0} mg/kg, Phosphorus: ${s.phosphorus ?? 0} mg/kg, Potassium: ${s.potassium ?? 0} mg/kg, Organic Carbon: ${s.organicCarbon ?? 0}%`).join('\n'));
    }
    if (sensorDevices.length > 0) {
      contextParts.push(`IoT Sensors:\n` + sensorDevices.map((d: any) => `- Name: ${d.name}, Type: ${d.type}, Status: ${d.status}, Battery: ${d.battery}%`).join('\n'));
    }
    if (weatherRecords.length > 0) {
      contextParts.push(`Weather Records (recent):\n` + weatherRecords.map((w: any) => `- Temp: ${w.temperature}C, Humidity: ${w.humidity}%, Wind: ${w.windSpeed} km/h, Rainfall: ${w.rainfall}mm, Condition: ${w.condition} (at ${new Date(w.timestamp).toLocaleDateString()})`).join('\n'));
    }
    if (irrigationRecords.length > 0) {
      contextParts.push(`Irrigation History:\n` + irrigationRecords.map((i: any) => `- Date: ${new Date(i.date).toLocaleDateString()}, Duration: ${i.duration} mins, Water: ${i.waterAmount}L, Status: ${i.status}`).join('\n'));
    }
    if (fertilizerRecords.length > 0) {
      contextParts.push(`Fertilizer Application History:\n` + fertilizerRecords.map((f: any) => `- Date: ${new Date(f.date).toLocaleDateString()}, Type: ${f.type}, Quantity: ${f.quantity}kg`).join('\n'));
    }
    if (diseaseReports.length > 0) {
      contextParts.push(`Disease Diagnostics Reports:\n` + diseaseReports.map((d: any) => `- Crop: ${d.cropType}, Disease: ${d.diseaseName}, Confidence: ${(d.confidence * 100).toFixed(0)}%, Treatment: ${d.treatment}`).join('\n'));
    }

    const farmContext = contextParts.join('\n\n');

    if (base64Image) {
      console.log(`[Chat Route Vision] Running Gemini Vision detection on attached image...`);
      const activeCropType = farms[0]?.cropType || 'Tomato';
      const predictionData = await aiService.detectDisease(base64Image, mimeType || 'image/jpeg', activeCropType);

      // Save diagnosis to DB
      const diagnosis = await DiseaseDiagnosis.create({
        userId,
        farmId: farms[0]?._id,
        cropType: predictionData.cropType || activeCropType,
        diseaseName: predictionData.diseaseName || "Healthy",
        confidence: predictionData.confidence || 0.90,
        treatment: predictionData.treatment || "None required",
        imageUrl: `data:${mimeType || 'image/jpeg'};base64,${base64Image}`,
        severity: predictionData.severity || 'Low',
        symptoms: predictionData.symptoms || '',
        causes: predictionData.causes || '',
        prevention: predictionData.prevention || '',
        estimatedRecovery: predictionData.estimatedRecovery || 'N/A',
        irrigation: predictionData.irrigation || '',
        fertilizer: predictionData.fertilizer || ''
      });

      // Construct rich markdown response
      let reply = `### Leaf Diagnosis Complete\n\n`;
      reply += `* **Crop Type:** ${diagnosis.cropType}\n`;
      reply += `* **Detected Condition:** **${diagnosis.diseaseName}**\n`;
      reply += `* **AI Confidence:** ${(diagnosis.confidence * 100).toFixed(0)}%\n`;
      reply += `* **Severity Level:** ${diagnosis.severity}\n`;
      reply += `* **Estimated Recovery:** ${diagnosis.estimatedRecovery}\n\n`;
      reply += `---\n\n`;
      reply += `### Symptoms & Causes\n`;
      reply += `* **Symptoms:** ${diagnosis.symptoms || 'No distinct symptoms visible.'}\n`;
      reply += `* **Causes:** ${diagnosis.causes || 'Environmental stress or normal growth patterns.'}\n\n`;
      reply += `---\n\n`;
      reply += `### Treatment Plan\n${diagnosis.treatment}\n\n`;
      reply += `---\n\n`;
      reply += `### Recommendations & Prevention\n`;
      reply += `* **Prevention:** ${diagnosis.prevention || 'Maintain standard crop hygiene.'}\n`;
      reply += `* **Irrigation Advice:** ${diagnosis.irrigation || 'Ensure adequate irrigation.'}\n`;
      reply += `* **Fertilization Advice:** ${diagnosis.fertilizer || 'Provide balanced nutrient plan.'}\n`;

      if (message) {
        const visionContext = `The user uploaded an image of crop [${diagnosis.cropType}]. Gemini Vision analyzed the image and detected [${diagnosis.diseaseName}] with severity [${diagnosis.severity}]. Symptoms: [${diagnosis.symptoms}]. Treatment: [${diagnosis.treatment}]. Prevention: [${diagnosis.prevention}].`;
        const customResponse = await aiService.chat(message, `${farmContext}\n\nVision Context: ${visionContext}`, language);
        reply += `\n\n---\n\n### Response to prompt ("${message}")\n\n${customResponse}`;
      }

      return res.json({ success: true, reply });
    }

    const reply = await aiService.chat(message, farmContext, language);
    res.json({ success: true, reply });
  } catch (error: any) {
    const status = error.name === 'ValidationError' ? 400 : 500;
    console.error(`[Chat Route Error] Status: ${status}, Message: "${error.message}"`);
    res.status(status).json({ success: false, message: error.message });
  }
});

// --- Weather Proxy Route ---
router.get('/weather', requireAuth, async (req: any, res: any) => {
  try {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: "Latitude and longitude required" });
    }
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout
      
      const apiResponse = await fetch(url, { signal: controller.signal as any });
      clearTimeout(timeoutId);
      
      if (!apiResponse.ok) {
        throw new Error(`Open-Meteo API returned status ${apiResponse.status}`);
      }
      const data = await apiResponse.json();
      res.json(data);
    } catch (fetchError: any) {
      console.error("Backend failed to fetch from open-meteo", fetchError);
      res.status(502).json({ success: false, message: "Weather service is currently offline. Please enter weather records manually." });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Fields Routes ---
router.post('/fields', requireDB, requireAuth, [
  body('farmId').notEmpty().withMessage('Farm ID is required'),
  body('name').notEmpty().withMessage('Field Name is required'),
  body('area').isNumeric().withMessage('Area must be a number'),
  body('cropType').notEmpty().withMessage('Crop Type is required')
], validate, async (req: any, res: any) => {
  try {
    const { farmId, name, area, cropType } = req.body;
    const userId = req.user.id;

    const farm = await Farm.findOne({ _id: farmId, userId });
    if (!farm) return res.status(403).json({ success: false, message: "Access denied. Farm does not belong to user." });

    const field = await Field.create({ userId, farmId, name, area, cropType });

    await Notification.create({
      userId,
      title: 'New Field Added',
      message: `Field "${name}" has been added to farm "${farm.name}".`,
      category: 'ai_recommendation',
      priority: 'low'
    });

    res.json({ success: true, field });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/fields', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const farmId = req.query.farmId;
    const query = farmId ? { userId, farmId } : { userId };
    const fields = await Field.find(query);
    res.json({ success: true, fields });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Crops Routes ---
router.post('/crops', requireDB, requireAuth, [
  body('farmId').notEmpty().withMessage('Farm ID is required'),
  body('name').notEmpty().withMessage('Crop name is required'),
  body('variety').notEmpty().withMessage('Variety is required'),
  body('plantedDate').notEmpty().withMessage('Planted date is required')
], validate, async (req: any, res: any) => {
  try {
    const { farmId, fieldId, name, variety, plantedDate } = req.body;
    const userId = req.user.id;

    // Verify farm ownership
    const farm = await Farm.findOne({ _id: farmId, userId });
    if (!farm) {
      return res.status(403).json({ success: false, message: "Access denied. Farm does not belong to user." });
    }

    // Verify field ownership if fieldId is provided
    if (fieldId) {
      const field = await Field.findOne({ _id: fieldId, farmId, userId });
      if (!field) {
        return res.status(403).json({ success: false, message: "Access denied. Field does not belong to user's farm." });
      }
    }

    const crop = await Crop.create({
      userId,
      farmId,
      fieldId: fieldId || undefined,
      name,
      variety,
      plantedDate: new Date(plantedDate),
      status: 'Growing'
    });

    await Notification.create({
      userId,
      title: 'New Crop Registered',
      message: `Crop "${name}" (${variety}) registered as growing on farm "${farm.name}".`,
      category: 'ai_recommendation',
      priority: 'low'
    });

    res.json({ success: true, crop });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/crops', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const farmId = req.query.farmId;
    const query = farmId ? { userId, farmId } : { userId };
    const crops = await Crop.find(query);
    res.json({ success: true, crops });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Sensors Routes ---
router.post('/sensors', requireDB, requireAuth, [
  body('farmId').notEmpty().withMessage('Farm ID is required'),
  body('name').notEmpty().withMessage('Sensor Name is required'),
  body('type').notEmpty().withMessage('Sensor Type is required')
], validate, async (req: any, res: any) => {
  try {
    const { farmId, fieldId, name, type } = req.body;
    const userId = req.user.id;

    // Verify farm ownership
    const farm = await Farm.findOne({ _id: farmId, userId });
    if (!farm) {
      return res.status(403).json({ success: false, message: "Access denied. Farm does not belong to user." });
    }

    // Verify field ownership if fieldId is provided
    if (fieldId) {
      const field = await Field.findOne({ _id: fieldId, farmId, userId });
      if (!field) {
        return res.status(403).json({ success: false, message: "Access denied. Field does not belong to user's farm." });
      }
    }

    const sensor = await SensorDevice.create({
      userId,
      farmId,
      fieldId: fieldId || undefined,
      name,
      type,
      status: 'online',
      battery: 100
    });

    try {
      await seedSensorHistory(userId, farmId, sensor._id, type);
    } catch (e: any) {
      console.error('Failed to seed sensor history in post route:', e.message);
    }

    await Notification.create({
      userId,
      title: 'New Sensor Configured',
      message: `Sensor device "${name}" (${type}) is online on farm "${farm.name}".`,
      category: 'iot',
      priority: 'low'
    });

    res.json({ success: true, sensor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/sensors', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const farmId = req.query.farmId;
    const query = farmId ? { userId, farmId } : { userId };
    const sensors = await SensorDevice.find(query);
    res.json({ success: true, sensors });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Sensor Readings Routes ---
router.post('/sensor-readings', requireDB, requireAuth, [
  body('farmId').notEmpty().withMessage('Farm ID is required'),
  body('sensorId').notEmpty().withMessage('Sensor ID is required'),
  body('value').isNumeric().withMessage('Reading value must be a number')
], validate, async (req: any, res: any) => {
  try {
    const { farmId, sensorId, value } = req.body;
    const userId = req.user.id;

    // Verify farm ownership
    const farm = await Farm.findOne({ _id: farmId, userId });
    if (!farm) {
      return res.status(403).json({ success: false, message: "Access denied. Farm does not belong to user." });
    }

    // Verify sensor ownership and association
    const sensor = await SensorDevice.findOne({ _id: sensorId, farmId, userId });
    if (!sensor) {
      return res.status(403).json({ success: false, message: "Access denied. Sensor device does not belong to user's farm." });
    }

    const reading = await SensorReading.create({
      userId,
      farmId,
      sensorId,
      value,
      timestamp: new Date()
    });

    // Update telemetry in the Farm document directly
    if (!farm.sensorData) {
      farm.sensorData = {
        moisture: 0,
        pH: 7.0,
        temperature: 0,
        humidity: 0,
        predictedYield: 0,
        waterRecommendation: 'Wait 24 hours'
      };
    }
    if (sensor.type === 'moisture') farm.sensorData.moisture = value;
    else if (sensor.type === 'temperature') farm.sensorData.temperature = value;
    else if (sensor.type === 'humidity') farm.sensorData.humidity = value;
    else if (sensor.type === 'ph') farm.sensorData.pH = value;

    if (sensor.type === 'moisture') {
      if (value < 30) farm.sensorData.waterRecommendation = 'Irrigate now';
      else if (value < 55) farm.sensorData.waterRecommendation = 'Wait 12 hours';
      else farm.sensorData.waterRecommendation = 'Wait 24 hours';
    }

    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    farm.sensorHistory = farm.sensorHistory || [];
    farm.sensorHistory.push({
      timestamp: timestampStr,
      moisture: farm.sensorData.moisture || 0,
      temperature: farm.sensorData.temperature || 0,
      humidity: farm.sensorData.humidity || 0
    });
    if (farm.sensorHistory.length > 8) {
      farm.sensorHistory.shift();
    }
    await farm.save();

    res.json({ success: true, reading });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/sensor-readings', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const farmId = req.query.farmId;
    const query = farmId ? { userId, farmId } : { userId };
    const readings = await SensorReading.find(query).sort({ timestamp: -1 });
    res.json({ success: true, readings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Irrigation Records Routes ---
router.post('/irrigation-records', requireDB, requireAuth, [
  body('farmId').notEmpty().withMessage('Farm ID is required'),
  body('duration').isNumeric().withMessage('Duration must be a number'),
  body('waterAmount').isNumeric().withMessage('Water amount must be a number')
], validate, async (req: any, res: any) => {
  try {
    const { farmId, duration, waterAmount, status } = req.body;
    const userId = req.user.id;

    // Verify farm ownership
    const farm = await Farm.findOne({ _id: farmId, userId });
    if (!farm) {
      return res.status(403).json({ success: false, message: "Access denied. Farm does not belong to user." });
    }

    const record = await IrrigationRecord.create({
      userId,
      farmId,
      date: new Date(),
      duration,
      waterAmount,
      status: status || 'Completed'
    });

    await Notification.create({
      userId,
      title: 'Irrigation Event Logged',
      message: `Watered "${farm.name}" for ${duration} minutes, usage: ${waterAmount}L.`,
      category: 'irrigation',
      priority: 'low'
    });

    res.json({ success: true, record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/irrigation-records', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const farmId = req.query.farmId;
    const query = farmId ? { userId, farmId } : { userId };
    const records = await IrrigationRecord.find(query).sort({ date: -1 });
    res.json({ success: true, records });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Fertilizer Records Routes ---
router.post('/fertilizer-records', requireDB, requireAuth, [
  body('farmId').notEmpty().withMessage('Farm ID is required'),
  body('type').notEmpty().withMessage('Fertilizer type is required'),
  body('quantity').isNumeric().withMessage('Quantity must be a number')
], validate, async (req: any, res: any) => {
  try {
    const { farmId, type, quantity } = req.body;
    const userId = req.user.id;

    // Verify farm ownership
    const farm = await Farm.findOne({ _id: farmId, userId });
    if (!farm) {
      return res.status(403).json({ success: false, message: "Access denied. Farm does not belong to user." });
    }

    const record = await FertilizerRecord.create({
      userId,
      farmId,
      date: new Date(),
      type,
      quantity
    });

    await Notification.create({
      userId,
      title: 'Fertilizer Applied',
      message: `Applied ${quantity}kg of ${type} to farm "${farm.name}".`,
      category: 'soil',
      priority: 'low'
    });

    res.json({ success: true, record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/fertilizer-records', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const farmId = req.query.farmId;
    const query = farmId ? { userId, farmId } : { userId };
    const records = await FertilizerRecord.find(query).sort({ date: -1 });
    res.json({ success: true, records });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Weather Records Routes ---
router.post('/weather-records', requireDB, requireAuth, [
  body('temperature').isNumeric().withMessage('Temperature must be a number'),
  body('humidity').isNumeric().withMessage('Humidity must be a number'),
  body('windSpeed').isNumeric().withMessage('Wind Speed must be a number'),
  body('rainfall').isNumeric().withMessage('Rainfall must be a number'),
  body('condition').notEmpty().withMessage('Condition is required')
], validate, async (req: any, res: any) => {
  try {
    const { farmId, temperature, humidity, windSpeed, rainfall, condition } = req.body;
    const userId = req.user.id;

    // Verify farm ownership if farmId is provided
    if (farmId) {
      const farm = await Farm.findOne({ _id: farmId, userId });
      if (!farm) {
        return res.status(403).json({ success: false, message: "Access denied. Farm does not belong to user." });
      }
    }

    const record = await WeatherRecord.create({
      userId,
      farmId: farmId || undefined,
      temperature,
      humidity,
      windSpeed,
      rainfall,
      condition,
      timestamp: new Date()
    });

    res.json({ success: true, record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/weather-records', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const records = await WeatherRecord.find({ userId }).sort({ timestamp: -1 });
    res.json({ success: true, records });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Manual Disease Reports Routes ---
router.post('/disease-reports', requireDB, requireAuth, [
  body('cropType').notEmpty().withMessage('Crop Type is required'),
  body('diseaseName').notEmpty().withMessage('Disease Name is required'),
  body('confidence').isNumeric().withMessage('Confidence must be a number'),
  body('treatment').notEmpty().withMessage('Treatment is required')
], validate, async (req: any, res: any) => {
  try {
    const { farmId, cropType, diseaseName, confidence, treatment } = req.body;
    const userId = req.user.id;

    // Verify farm ownership if farmId is provided
    if (farmId) {
      const farm = await Farm.findOne({ _id: farmId, userId });
      if (!farm) {
        return res.status(403).json({ success: false, message: "Access denied. Farm does not belong to user." });
      }
    }

    const diagnosis = await DiseaseDiagnosis.create({
      userId,
      farmId: farmId || undefined,
      cropType,
      diseaseName,
      confidence: confidence / 100,
      treatment
    });

    await Notification.create({
      userId,
      title: 'Crop Disease Record Added',
      message: `A manual disease record for crop "${cropType}" has been saved: "${diseaseName}".`,
      category: 'disease',
      priority: 'medium'
    });

    res.json({ success: true, diagnosisId: diagnosis._id });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Soil Analysis GET / DELETE / PUT ---
router.get('/soil-analysis', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const farmId = req.query.farmId;
    const query = farmId ? { userId, farmId } : { userId };
    const history = await SoilAnalysis.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, history });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/soil-analysis/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { moisture, pH, nitrogen, phosphorus, potassium, organicCarbon, temperature, humidity, recommendations } = req.body;
    const analysis = await SoilAnalysis.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { moisture, pH, nitrogen, phosphorus, potassium, organicCarbon, temperature, humidity, recommendations },
      { new: true }
    );
    res.json({ success: true, analysis });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/soil-analysis/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const result = await SoilAnalysis.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }
    res.json({ success: true, message: "Soil report deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Fields PUT / DELETE ---
router.put('/fields/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { name, area, cropType } = req.body;
    const field = await Field.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name, area, cropType },
      { new: true }
    );
    res.json({ success: true, field });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/fields/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const fieldId = req.params.id;
    const userId = req.user.id;
    await Field.deleteOne({ _id: fieldId, userId });
    await SensorDevice.deleteMany({ fieldId, userId });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Crops PUT / DELETE ---
router.put('/crops/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { name, variety, plantedDate, status } = req.body;
    const crop = await Crop.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name, variety, plantedDate: plantedDate ? new Date(plantedDate) : undefined, status },
      { new: true }
    );
    res.json({ success: true, crop });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/crops/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    await Crop.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Sensors PUT / DELETE ---
router.put('/sensors/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { name, type, status, battery } = req.body;
    const sensor = await SensorDevice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name, type, status, battery },
      { new: true }
    );
    res.json({ success: true, sensor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/sensors/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    await SensorDevice.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Sensor Readings PUT / DELETE ---
router.put('/sensor-readings/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { value } = req.body;
    const reading = await SensorReading.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { value },
      { new: true }
    );
    res.json({ success: true, reading });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/sensor-readings/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    await SensorReading.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Irrigation Records PUT / DELETE ---
router.put('/irrigation-records/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { duration, waterAmount, status } = req.body;
    const record = await IrrigationRecord.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { duration, waterAmount, status },
      { new: true }
    );
    res.json({ success: true, record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/irrigation-records/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    await IrrigationRecord.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Fertilizer Records PUT / DELETE ---
router.put('/fertilizer-records/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { type, quantity } = req.body;
    const record = await FertilizerRecord.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { type, quantity },
      { new: true }
    );
    res.json({ success: true, record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/fertilizer-records/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    await FertilizerRecord.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Weather Records PUT / DELETE ---
router.put('/weather-records/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { temperature, humidity, windSpeed, rainfall, condition } = req.body;
    const record = await WeatherRecord.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { temperature, humidity, windSpeed, rainfall, condition },
      { new: true }
    );
    res.json({ success: true, record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/weather-records/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    await WeatherRecord.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Disease Reports PUT / DELETE ---
router.put('/disease-reports/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    const { cropType, diseaseName, confidence, treatment } = req.body;
    const diagnosis = await DiseaseDiagnosis.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { cropType, diseaseName, confidence: confidence / 100, treatment },
      { new: true }
    );
    res.json({ success: true, diagnosis });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/disease-reports/:id', requireDB, requireAuth, async (req: any, res: any) => {
  try {
    await DiseaseDiagnosis.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

