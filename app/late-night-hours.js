export function isLateNightHours(closingHour) {
  // 00:00 exactly is not after midnight; 00:01–05:59 is the late-night window.
  return closingHour > 0 && closingHour < 6;
}
