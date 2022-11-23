import { strictEqual } from 'assert';
import { Weekday } from '../lib';
import { LustreMaintenanceTime } from '../lib/lustre-maintenance-time';

test.each([
  [Weekday.SUNDAY, 0, 0, '7:00:00'],
  [Weekday.SATURDAY, 0, 0, '6:00:00'],
  [Weekday.SUNDAY, 24, 0, '7:24:00'],
  [Weekday.SUNDAY, 0, 59, '7:00:59'],
])('valid maintenance time %s:%d:%d returns %s', (day: Weekday, hour: number, minute: number, expected: string) => {
  strictEqual(
    new LustreMaintenanceTime({ day, hour, minute }).toTimestamp(),
    expected,
  );
});

test.each([
  [Weekday.TUESDAY, -1, 0],
  [Weekday.TUESDAY, 25, 0],
  [Weekday.TUESDAY, 1.2, 0],
])('invalid maintenance time hour %s:%d:%d', (day: Weekday, hour: number, minute: number) => {
  expect(() => {
    new LustreMaintenanceTime({ day, hour, minute });
  }).toThrowError('Maintenance time hour must be an integer between 0 and 24');
});

test.each([
  [Weekday.TUESDAY, 0, -1],
  [Weekday.TUESDAY, 0, 60],
  [Weekday.TUESDAY, 0, 1.2],
])('invalid maintenance time minute %s:%d:%d', (day: Weekday, hour: number, minute: number) => {
  expect(() => {
    new LustreMaintenanceTime({ day, hour, minute });
  }).toThrowError('Maintenance time minute must be an integer between 0 and 59');
});