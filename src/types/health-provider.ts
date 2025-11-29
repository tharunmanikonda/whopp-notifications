/**
 * Generic interface for all health data providers
 * Allows easy integration of Whoop, Fitbit, Garmin, Apple Health, etc.
 */

export interface HealthMetrics {
  // Recovery & Readiness
  recoveryScore?: number; // 0-100%
  readinessScore?: number; // 0-100%

  // Sleep
  sleepDuration?: number; // minutes
  sleepScore?: number; // 0-100%
  sleepQuality?: string; // 'good', 'fair', 'poor'

  // Activity & Strain
  strain?: number; // 0-21 (Whoop), can be normalized
  activityScore?: number; // 0-100%

  // Heart Rate & HRV
  restingHeartRate?: number; // bpm
  averageHeartRate?: number; // bpm
  maxHeartRate?: number; // bpm
  hrv?: number; // Heart Rate Variability in ms

  // Steps & Movement
  steps?: number;
  distance?: number; // meters
  calories?: number; // kcal

  // Stress & Recovery
  stressLevel?: number; // 0-100%
  spO2?: number; // Blood Oxygen %

  // Respiratory
  respiratoryRate?: number; // breaths per minute

  // Body Composition
  weight?: number; // kg
  bmi?: number;
  bodyFat?: number; // percentage

  // Temperature
  skinTemperature?: number; // relative deviation from baseline

  // Metadata
  timestamp: string; // ISO 8601
  provider: string; // 'whoop', 'fitbit', 'garmin', etc.
  dataAge?: number; // How old the data is (minutes)
}

export interface HealthDataProvider {
  /**
   * Get today's health metrics
   */
  getMetrics(): Promise<HealthMetrics | null>;

  /**
   * Provider name for identification
   */
  getName(): string;

  /**
   * Check if the provider is properly configured
   */
  isConfigured(): boolean;

  /**
   * Validate authentication/connection
   */
  validateConnection(): Promise<boolean>;
}

/**
 * Aggregated health data from multiple providers
 */
export interface AggregatedHealthData {
  primary: HealthMetrics | null; // Main data source
  secondary: HealthMetrics[]; // Additional sources

  // Calculated/averaged metrics
  averageRecoveryScore?: number;
  averageSleepScore?: number;

  // Data quality
  dataCompleteness: number; // 0-100% (how much data we have)
  providers: string[]; // Which providers provided data
}
