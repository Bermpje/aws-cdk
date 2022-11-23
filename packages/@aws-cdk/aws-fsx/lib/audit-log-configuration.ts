/**
 * Enum for representing File Access Audit Log Level
 */
export enum FileAccessAuditLogLevel {
  /**
   * DISABLED - access auditing of files and folders is turned off.
   */
  DISABLED = 'DISABLED',

  /**
   * SUCCESS_ONLY - only successful attempts to access files or folders are logged.
   */
  SUCCESS_ONLY = 'SUCCESS_ONLY',

  /**
   * FAILURE_ONLY only failed attempts to access files or folders are logged.
   */
  FAILURE_ONLY = 'FAILURE_ONLY',

  /**
   * SUCCESS_AND_FAILURE - both successful attempts and failed attempts to access files or folders are logged.
   */
  SUCCESS_AND_FAILURE = 'SUCCESS_AND_FAILURE',
}


/**
 * Enum for representing File Share Access Audit Log Level
 */
 export enum FileShareAccessAuditLogLevel {
  /**
   * DISABLED - access auditing of file shares is turned off.
   */
  DISABLED = 'DISABLED',

  /**
   * SUCCESS_ONLY - only successful attempts to access file shares are logged.
   */
  SUCCESS_ONLY = 'SUCCESS_ONLY',

  /**
   * FAILURE_ONLY - only failed attempts to access file shares are logged.
   */
  FAILURE_ONLY = 'FAILURE_ONLY',

  /**
   * SUCCESS_AND_FAILURE - both successful attempts and failed attempts to access file shares are logged.
   */
  SUCCESS_AND_FAILURE = 'SUCCESS_AND_FAILURE',
}

/**
 * Properties required for setting up a Audit Log Configuration for Windows File Server.
 */
export interface AuditLogConfiguration {
  /**
   * The Amazon Resource Name (ARN) for the destination of the audit logs.
   */
  readonly auditLogDestination?: string;
  /**
   * Sets which attempt type is logged by Amazon FSx for file and folder accesses.
   */
  readonly fileAccessAuditLogLevel: FileAccessAuditLogLevel;
  /**
   * Sets which attempt type is logged by Amazon FSx for file share accesses.
   */
  readonly fileShareAccessAuditLogLevel: FileShareAccessAuditLogLevel;
}

