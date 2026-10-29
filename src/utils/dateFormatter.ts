export class DateFormatter {
  private static parseDate(dateInput: string | Date | number): Date {
    if (dateInput instanceof Date) return dateInput;
    if (typeof dateInput === 'number') return new Date(dateInput);
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  static formatDateTime(dateInput: string | Date | number): string {
    const d = this.parseDate(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  static formatTime(dateInput: string | Date | number): string {
    const d = this.parseDate(dateInput);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  static formatDate(dateInput: string | Date | number): string {
    const d = this.parseDate(dateInput);
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }

  static formatCompactTime(dateInput: string | Date | number): string {
    const d = this.parseDate(dateInput);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ms = Math.floor(d.getMilliseconds() / 100);
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  static formatDuration(durationSeconds: number): string {
    const totalSec = Math.max(0, Math.floor(durationSeconds));
    const minutes = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const seconds = String(totalSec % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
}

export const formatDate = (d: string | Date | number) => DateFormatter.formatDate(d);
export const formatTime = (d: string | Date | number) => DateFormatter.formatTime(d);
export const formatDateTime = (d: string | Date | number) => DateFormatter.formatDateTime(d);
export const formatCompactTime = (d: string | Date | number) => DateFormatter.formatCompactTime(d);
export const formatDuration = (s: number) => DateFormatter.formatDuration(s);
