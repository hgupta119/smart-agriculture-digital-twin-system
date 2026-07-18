export interface SensorData {
  moisture: number; // %
  pH: number;
  temperature: number; // °C
  humidity: number; // %
  predictedYield: number; // tons
  waterRecommendation: 'Irrigate now' | 'Wait 12 hours' | 'Wait 24 hours';
}

export interface SensorHistoryPoint {
  timestamp: string;
  moisture: number;
  temperature: number;
  humidity: number;
}

export interface Actuator {
  id: string;
  name: string;
  type: 'valve' | 'pump';
  state: 'on' | 'off' | 'error';
  lastAction: string;
}

export interface Farm {
  id: string;
  name: string;
  area: number; // acres
  cropType: string;
  location: string;
  latitude?: number;
  longitude?: number;
  district?: string;
  state?: string;
  country?: string;
  fieldCount?: number;
  sensorCount?: number;
  healthStatus?: string;
  healthScore?: number;
  sensorData: SensorData;
  sensorHistory: SensorHistoryPoint[];
  actuators?: Actuator[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  farmCount: number;
  createdAt?: string;
  token?: string;
}

export interface DiseasePredictionResult {
  diseaseName: string;
  confidence: number;
  treatment: string;
  imageUrl?: string;
  cropType?: string;
  severity?: string;
  symptoms?: string;
  causes?: string;
  prevention?: string;
  estimatedRecovery?: string;
  irrigation?: string;
  fertilizer?: string;
  imageForensics?: string;
  metadataAnalysis?: string;
  explainableAi?: string;
  manipulationDetection?: string;
  riskAssessment?: string;
  investigationTimeline?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}
