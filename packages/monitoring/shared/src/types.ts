export interface MonitoringProviderStrategy {
  /**
   * Capture an exception
   * @param error - The error to capture
   */
  captureException<Extra extends Record<string, unknown>>(
    error: unknown,
    extra?: Extra,
  ): void;

  /**
   * Identify a user in the monitoring service - used for tracking user actions
   * @param info
   */
  identify<Info extends { id: string }>(info: Info): unknown;

  /**
   * Initialize the monitoring service
   */
  initialize(): void | Promise<void>;
}
