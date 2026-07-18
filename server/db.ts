import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { 
  User, Farm, Field, Crop, SoilAnalysis, SensorDevice, SensorReading,
  WeatherRecord, IrrigationRecord, FertilizerRecord, DiseaseDiagnosis 
} from './models';
import { createNewFarm } from '../src/utils/simData';

let isConnected = false;

export const seedDB = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log("ℹ️ Database already contains data. Skipping seed.");
      return;
    }

    console.log("🌱 Seeding database with realistic sample data...");

    // Create a default user
    const passwordHash = await bcrypt.hash('password123', 10);
    const defaultUser = await User.create({
      name: "Smart Farmer",
      email: "darkfantasy937@gmail.com",
      passwordHash
    });

    const userId = defaultUser._id;
    console.log("✅ Created default user:", defaultUser.email);

    // Create a default Farm
    const defaultFarm = await Farm.create({
      userId,
      name: "Green Valley Farm",
      area: 40,
      cropType: "Tomato",
      location: "California, USA",
      sensorData: {
        moisture: 42,
        pH: 6.4,
        temperature: 24,
        humidity: 62,
        predictedYield: 600,
        waterRecommendation: "Wait 12 hours"
      },
      sensorHistory: [
        { timestamp: "09:00 AM", moisture: 45, temperature: 22, humidity: 65 },
        { timestamp: "12:00 PM", moisture: 43, temperature: 25, humidity: 60 },
        { timestamp: "03:00 PM", moisture: 42, temperature: 24, humidity: 62 }
      ],
      actuators: [
        { id: "sprinkler_1", name: "Main Sprinkler", type: "sprinkler", state: "off", lastAction: "Irrigated 30m" }
      ]
    });
    const farmId = defaultFarm._id;
    console.log("✅ Created default farm:", defaultFarm.name);

    // Create a Field
    const defaultField = await Field.create({
      userId,
      farmId,
      name: "North Field",
      area: 20,
      cropType: "Tomato"
    });
    console.log("✅ Created default field:", defaultField.name);

    // Create a Crop
    const defaultCrop = await Crop.create({
      userId,
      farmId,
      fieldId: defaultField._id,
      name: "Tomato Roma",
      variety: "Roma",
      plantedDate: new Date(Date.now() - 60 * 86400000), // 60 days ago
      status: "Growing"
    });
    console.log("✅ Created default crop:", defaultCrop.name);

    // Create a Soil Analysis record
    const seededReport = {
      executiveSummary: {
        healthScore: 7.8,
        fertilityLevel: "High",
        productivityPotential: "Excellent",
        cultivationSuitability: "Highly suitable for Tomato Roma cultivation under standard management.",
        majorStrengths: "Optimal soil temperature (24C) and stable Organic Carbon (2.1%).",
        majorConcerns: "No urgent chemical stress concerns."
      },
      chemicalAnalysis: {
        pH: { value: 6.4, ideal: "6.0 - 7.2", interpretation: "Optimal", effect: "Influences soil nutrient bioavailability directly.", risks: "Nutrient lockout if out of bounds", improvements: "Apply organic matter buffers" },
        nitrogen: { value: 80, ideal: "60 - 100", interpretation: "Adequate", effect: "Key driver of leaf canopy growth.", risks: "Stunted growth if deficient", improvements: "Apply nitrogenous feed" },
        phosphorus: { value: 40, ideal: "30 - 50", interpretation: "Adequate", effect: "Promotes root architecture expansion.", risks: "Poor root development", improvements: "Apply bone meal or rock phosphate" },
        potassium: { value: 120, ideal: "100 - 150", interpretation: "Adequate", effect: "Enhances stem strength and disease defense.", risks: "Susceptibility to fungal pathogens", improvements: "Apply sulfate of potash" },
        organicCarbon: { value: 2.1, ideal: "1.5 - 3.0", interpretation: "Stable", fill: "url(#healthGradient)", effect: "Supports beneficial soil microorganisms.", risks: "Decline degrades soil water retention", improvements: "Incorporate compost and cover crop residues" },
        moisture: { value: 42, ideal: "40% - 60%", interpretation: "Normal", effect: "Transports minerals into plant roots.", risks: "Root dehydration and leaf wilt", improvements: "Execute targeted irrigation cycle" },
        temperature: { value: 24, ideal: "20°C - 30°C", interpretation: "Optimal", effect: "Drives chemical and metabolic activity.", risks: "Thermal shock to roots if high", improvements: "Mulch with agricultural straw" },
        humidity: { value: 62, ideal: "50% - 70%", interpretation: "Normal", effect: "Regulates leaf transpiration balance.", risks: "High humidity fosters fungal growth", improvements: "Ensure row ventilation" }
      },
      soilFertilityAssessment: {
        classification: "Good",
        explanation: "The chemical structure is well-balanced with active carbon levels."
      },
      nutrientDeficiency: {
        nitrogenDeficiency: { status: "No", symptoms: "None", impact: "None", recovery: "None" },
        phosphorusDeficiency: { status: "No", symptoms: "None", impact: "None", recovery: "None" },
        potassiumDeficiency: { status: "No", symptoms: "None", impact: "None", recovery: "None" },
        micronutrientDeficiencies: { status: "Mild Zinc Deficiency", symptoms: "White chlorotic bands on corn/maize leaves", impact: "Enzyme and growth hormone blockages", recovery: "Foliar zinc sulfate spray application" }
      },
      cropSuitability: [
        { crop: "Tomato Roma", suitability: 95, performance: "High yield output possible", reasons: "Optimal N and K nutrient reserves", risks: "Water deficit if dry spell occurs" },
        { crop: "Maize", suitability: 85, performance: "Good stalk height and grain count", reasons: "Well draining soil profile", risks: "Nutrient wash if excessive rainfall" },
        { crop: "Soybean", suitability: 80, performance: "Average pod count", reasons: "Supports nitrogen fixation pathways", risks: "Fungal leaf spot" }
      ],
      yieldPrediction: {
        expectedYield: "6.8 tons / acre",
        confidence: "90%",
        improvingFactors: "Favorable temperature and stable Organic Carbon reserves.",
        reducingFactors: "Water scheduling deficits"
      },
      irrigation: {
        waterRequirement: "20,000 liters / acre / week",
        interval: "Every 4 days",
        waterSaving: "Leverage drip lines and schedule operations strictly at night to avoid evaporation.",
        seasonal: "Cut volumes by half during wet seasons to prevent root rot."
      },
      fertilizer: {
        npk: "NPK 19-19-19 chemical fertilizer at 40kg/acre.",
        organic: "Decomposed cattle manure at 3 tons/acre.",
        biofertilizers: "Mycorrhiza fungi and Azotobacter at 2kg/acre.",
        schedule: "50% basal at seeding, 25% at vegetative stage, 25% at flowering.",
        dosage: "40kg per acre total."
      },
      pestDiseaseRisk: {
        riskLevel: "Moderate",
        possibleDiseases: "Root rot, damping off, late blight",
        preventiveMeasures: "Implement seed treatment and avoid water-logging in clay pockets."
      },
      weatherImpact: {
        currentEffect: "Warm ambient temperature is driving photosynthesis.",
        upcomingRisks: "Expected heat wave could accelerate soil drying.",
        rainfallImpact: "Scattered rainfall will reduce irrigation dependencies.",
        heatStress: "Implement mulching layer immediately to protect roots from high heat.",
        coldStress: "No cold/frost damage risk for this vegetative phase."
      },
      sustainabilityScore: {
        score: 7.8,
        organicCarbon: "Organic carbon level maintains structural soil life.",
        waterEfficiency: "Drip setup reduces wastage by over 30%.",
        nutrientBalance: "Nutrient inputs balance crop withdrawals.",
        environmentalImpact: "Low runoff risk protects local streams.",
        carbonFootprint: "Minimal chemical inputs optimize overall carbon footprints."
      },
      actionPlan: {
        immediate: "Irrigate the field immediately if moisture is low.",
        next7Days: "Mulch soil beds with organic straw.",
        next30Days: "Apply secondary nitrogen compost top-dressing.",
        seasonal: "Rotate fields with alfalfa or cover crops post-harvest to renew nitrogen."
      },
      explainableAI: "Recommendations are derived directly from input pH of 6.4 and moisture of 42%. Soil acidity is optimal for direct biological assimilation of macronutrients.",
      confidenceScore: {
        score: 95,
        explanation: "Sensors show excellent calibration and match local baseline soil profiles."
      }
    };

    await SoilAnalysis.create({
      userId,
      farmId,
      moisture: 42,
      pH: 6.4,
      nitrogen: 80,
      phosphorus: 40,
      potassium: 120,
      organicCarbon: 2.1,
      temperature: 24,
      humidity: 62,
      soilHealth: 7.8,
      deficiencies: [],
      fertilizerRecommendation: "NPK 19-19-19 chemical fertilizer at 40kg/acre.",
      irrigationRecommendation: "Every 4 days, drip scheduling.",
      suitableCrops: ["Tomato Roma", "Maize", "Soybean"],
      riskLevel: "Moderate",
      recommendations: ["Maintain current nitrogen levels", "Add calcium if blossom end rot occurs"],
      aiReport: JSON.stringify(seededReport)
    });
    console.log("✅ Created default soil analysis");

    // Create Sensor Devices
    const dev1 = await SensorDevice.create({
      userId,
      farmId,
      fieldId: defaultField._id,
      name: "Moisture Sensor A",
      type: "moisture",
      status: "online",
      battery: 88
    });
    console.log("✅ Created default sensor device:", dev1.name);

    // Seed 24 hours of historical SensorReading records (every 30 min)
    const sensorReadings = [];
    const baseMoisture = 42;
    for (let i = 47; i >= 0; i--) {
      const t = new Date(Date.now() - i * 30 * 60 * 1000);
      // Deterministic variation without Math.random: sine wave pattern
      const variation = Math.round(Math.sin(i * 0.4) * 4);
      sensorReadings.push({
        userId, farmId,
        sensorId: dev1._id,
        value: Math.max(20, Math.min(80, baseMoisture + variation)),
        timestamp: t
      });
    }
    await SensorReading.insertMany(sensorReadings);
    console.log(`✅ Seeded ${sensorReadings.length} sensor readings for ${dev1.name}`);

    // Create additional sensors
    const dev2 = await SensorDevice.create({ userId, farmId, name: "Temperature Probe B", type: "temperature", status: "online", battery: 92 });
    const tempReadings = [];
    for (let i = 47; i >= 0; i--) {
      const t = new Date(Date.now() - i * 30 * 60 * 1000);
      const variation = Math.round(Math.cos(i * 0.3) * 2);
      tempReadings.push({ userId, farmId, sensorId: dev2._id, value: Math.max(10, Math.min(45, 24 + variation)), timestamp: t });
    }
    await SensorReading.insertMany(tempReadings);
    console.log(`✅ Seeded ${tempReadings.length} temperature readings for ${dev2.name}`);

    const dev3 = await SensorDevice.create({ userId, farmId, name: "Humidity Sensor C", type: "humidity", status: "online", battery: 75 });
    const humReadings = [];
    for (let i = 47; i >= 0; i--) {
      const t = new Date(Date.now() - i * 30 * 60 * 1000);
      const variation = Math.round(Math.sin(i * 0.5 + 1) * 5);
      humReadings.push({ userId, farmId, sensorId: dev3._id, value: Math.max(30, Math.min(95, 62 + variation)), timestamp: t });
    }
    await SensorReading.insertMany(humReadings);
    console.log(`✅ Seeded ${humReadings.length} humidity readings for ${dev3.name}`);


    // Create Weather Records
    await WeatherRecord.create({
      userId,
      farmId,
      temperature: 24,
      humidity: 62,
      windSpeed: 12,
      rainfall: 0,
      condition: "Clear",
      timestamp: new Date()
    });
    console.log("✅ Created default weather record");

    // Create Irrigation Records
    await IrrigationRecord.create({
      userId,
      farmId,
      date: new Date(Date.now() - 86400000), // yesterday
      duration: 30,
      waterAmount: 2000,
      status: "Completed"
    });
    console.log("✅ Created default irrigation record");

    // Create Fertilizer Records
    await FertilizerRecord.create({
      userId,
      farmId,
      date: new Date(Date.now() - 3 * 86400000), // 3 days ago
      type: "Organic Compost",
      quantity: 15
    });
    console.log("✅ Created default fertilizer record");

    // Create Disease Diagnostics
    await DiseaseDiagnosis.create({
      userId,
      farmId,
      cropType: "Tomato",
      diseaseName: "Early Blight",
      confidence: 0.85,
      treatment: "Prune affected lower leaves and apply copper-based fungicide.",
      imageUrl: "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=400",
      isArchived: false,
      isFavorite: false
    });
    console.log("✅ Created default disease diagnosis");

    console.log("✅ Database seeding completed successfully.");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
};

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  
  if (uri) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
      isConnected = true;
      console.log("✅ Connected to MongoDB successfully.");
      await seedDB();
      return;
    } catch (error: any) {
      console.warn("⚠️ Could not connect to real MongoDB:", error.message);
    }
  } else {
    console.warn("⚠️ MONGODB_URI not found in environment.");
  }

  // Fallback to in-memory MongoDB
  console.log("🌱 Starting in-memory MongoDB server...");
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const memoryUri = mongod.getUri();
    await mongoose.connect(memoryUri);
    isConnected = true;
    console.log(`✅ In-memory MongoDB connected at: ${memoryUri}`);
    console.warn("⚠️ WARNING: Data will NOT persist across server restarts.");
    
    // Seed the database
    await seedDB();
  } catch (memErr: any) {
    console.error("❌ Failed to start in-memory MongoDB:", memErr.message);
  }
};

export const checkDBConnection = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Database connection not established. Please configure MONGODB_URI.");
  }
};

