import { HealthDataProvider, HealthMetrics, AggregatedHealthData } from '../types/health-provider.js';

/**
 * Aggregates health data from multiple providers
 * Prioritizes primary provider but falls back to secondary sources
 */
export class HealthAggregator {
  private providers: HealthDataProvider[] = [];
  private primaryProviderName: string = 'whoop'; // Default primary

  /**
   * Register a health data provider
   */
  registerProvider(provider: HealthDataProvider): void {
    if (!provider.isConfigured()) {
      console.log(`⚠️  Provider "${provider.getName()}" is not configured. Skipping.`);
      return;
    }

    this.providers.push(provider);
    console.log(`✅ Registered health provider: ${provider.getName()}`);
  }

  /**
   * Set which provider is primary (used for main motivation message)
   */
  setPrimaryProvider(providerName: string): void {
    if (!this.providers.find((p) => p.getName() === providerName)) {
      throw new Error(
        `Provider "${providerName}" not registered. Available: ${this.providers.map((p) => p.getName()).join(', ')}`
      );
    }
    this.primaryProviderName = providerName;
    console.log(`✅ Primary provider set to: ${providerName}`);
  }

  /**
   * Get aggregated health data from all providers
   */
  async getAggregatedMetrics(): Promise<AggregatedHealthData> {
    console.log(`📊 Fetching data from ${this.providers.length} provider(s)...`);

    const results: { provider: string; metrics: HealthMetrics | null; error?: string }[] = [];

    // Fetch from all providers in parallel
    await Promise.all(
      this.providers.map(async (provider) => {
        try {
          const metrics = await provider.getMetrics();
          results.push({
            provider: provider.getName(),
            metrics,
          });
        } catch (error: any) {
          results.push({
            provider: provider.getName(),
            metrics: null,
            error: error.message,
          });
          console.error(`❌ Error fetching from ${provider.getName()}: ${error.message}`);
        }
      })
    );

    // Find primary and secondary data
    const primaryResult = results.find((r) => r.provider === this.primaryProviderName);
    const secondaryResults = results.filter((r) => r.provider !== this.primaryProviderName && r.metrics);

    const primaryMetrics = primaryResult?.metrics || null;
    const secondaryMetrics = secondaryResults.map((r) => r.metrics!);

    // Calculate data completeness
    const successCount = results.filter((r) => r.metrics !== null).length;
    const dataCompleteness = (successCount / results.length) * 100;

    console.log(
      `✅ Successfully fetched from ${successCount}/${results.length} providers (${Math.round(dataCompleteness)}% complete)`
    );

    // Calculate averages for overlapping metrics
    const aggregated: AggregatedHealthData = {
      primary: primaryMetrics,
      secondary: secondaryMetrics,
      dataCompleteness,
      providers: results.filter((r) => r.metrics).map((r) => r.provider),
    };

    // Calculate averaged recovery score if we have multiple sources
    if (primaryMetrics?.recoveryScore || secondaryMetrics.some((m) => m.recoveryScore)) {
      const allRecoveryScores = [
        primaryMetrics?.recoveryScore,
        ...secondaryMetrics.map((m) => m.recoveryScore),
      ].filter((s) => s !== undefined) as number[];

      if (allRecoveryScores.length > 0) {
        aggregated.averageRecoveryScore = allRecoveryScores.reduce((a, b) => a + b) / allRecoveryScores.length;
      }
    }

    // Calculate averaged sleep score if we have multiple sources
    if (primaryMetrics?.sleepScore || secondaryMetrics.some((m) => m.sleepScore)) {
      const allSleepScores = [primaryMetrics?.sleepScore, ...secondaryMetrics.map((m) => m.sleepScore)].filter(
        (s) => s !== undefined
      ) as number[];

      if (allSleepScores.length > 0) {
        aggregated.averageSleepScore = allSleepScores.reduce((a, b) => a + b) / allSleepScores.length;
      }
    }

    return aggregated;
  }

  /**
   * Get list of registered providers
   */
  getProviders(): string[] {
    return this.providers.map((p) => p.getName());
  }

  /**
   * Check health of all providers
   */
  async validateAllProviders(): Promise<Record<string, boolean>> {
    console.log('🔍 Validating provider connections...');

    const results: Record<string, boolean> = {};

    await Promise.all(
      this.providers.map(async (provider) => {
        try {
          const isValid = await provider.validateConnection();
          results[provider.getName()] = isValid;
          console.log(`${isValid ? '✅' : '❌'} ${provider.getName()}: ${isValid ? 'Connected' : 'Disconnected'}`);
        } catch (error) {
          results[provider.getName()] = false;
          console.error(`❌ ${provider.getName()}: Error validating`);
        }
      })
    );

    return results;
  }
}
