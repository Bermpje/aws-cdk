/**
 * Properties required for setting up a Daily Automatic Backup Start Time
 */
export interface BackupStartTimeProps {
  /**
   * The hour of the day (from 0-24) at which the daily automatic backup starts.
   */
  readonly hour: number;
  /**
   * The minute of the hour (from 0-59) at which the daily automatic backup starts.
   */
  readonly minute: number;
}

/**
 * Class for scheduling a Daily Automatic Backup Start Time.
 */
export class BackupStartTime {
  /**
   * The hour of the day (from 00-24) at which the daily automatic backup starts.
   */
  private readonly hour: string;
  /**
   * The minute of the hour (from 00-59) at which the daily automatic backup starts.
   */
  private readonly minute: string;

  constructor(props: BackupStartTimeProps) {
    this.validate(props.hour, props.minute);
    this.hour = this.getTwoDigitString(props.hour);
    this.minute = this.getTwoDigitString(props.minute);
  }
  /**
   * Converts a hour, and minute into a timestamp as used by FSx for Windows's DailyAutomaticBackupStartTime field.
   */
  public toTimestamp(): string {
    return `${this.hour}:${this.minute}`;
  }

  /**
   * Pad an integer so that it always contains at least 2 digits. Assumes the number is a positive integer.
   */
  private getTwoDigitString(n: number): string {
    const numberString = n.toString();
    if (numberString.length === 1) {
      return `0${n}`;
    }
    return numberString;
  }

  /**
   * Validation needed for the values of the daily automatic backup start time
   */
  private validate(hour: number, minute: number) {
    if (!Number.isInteger(hour) || hour < 0 || hour > 24) {
      throw new Error('Maintenance time hour must be an integer between 0 and 24');
    }
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
      throw new Error('Maintenance time minute must be an integer between 0 and 59');
    }
  }
}