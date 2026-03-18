/**
 * Shared time/date formatting utilities.
 * Extracted in Sprint 16 to deduplicate logic across components.
 */

export const TZ_DATA = [
  { iana: 'Pacific/Honolulu', label: 'Hawaii Time', abbr: 'HST', searchTerms: 'hawaii honolulu hst pacific' },
  { iana: 'America/Anchorage', label: 'Alaska Time', abbr: 'AKT', searchTerms: 'alaska anchorage akt' },
  { iana: 'America/Los_Angeles', label: 'Pacific Time', abbr: 'PT', searchTerms: 'pacific los angeles seattle san francisco vancouver pst pdt pt west coast' },
  { iana: 'America/Phoenix', label: 'Arizona Time', abbr: 'MST', searchTerms: 'arizona phoenix mst mountain no dst' },
  { iana: 'America/Denver', label: 'Mountain Time', abbr: 'MT', searchTerms: 'mountain denver salt lake mst mdt mt colorado' },
  { iana: 'America/Chicago', label: 'Central Time', abbr: 'CT', searchTerms: 'central chicago dallas houston cst cdt ct midwest' },
  { iana: 'America/New_York', label: 'Eastern Time', abbr: 'ET', searchTerms: 'eastern new york boston miami atlanta est edt et east coast' },
  { iana: 'America/Halifax', label: 'Atlantic Time', abbr: 'AT', searchTerms: 'atlantic halifax nova scotia ast adt at' },
  { iana: 'America/St_Johns', label: 'Newfoundland Time', abbr: 'NT', searchTerms: 'newfoundland st johns nst ndt' },
  { iana: 'America/Sao_Paulo', label: 'Brasilia Time', abbr: 'BRT', searchTerms: 'brazil brasilia sao paulo brt south america' },
  { iana: 'America/Argentina/Buenos_Aires', label: 'Argentina Time', abbr: 'ART', searchTerms: 'argentina buenos aires art' },
  { iana: 'America/Mexico_City', label: 'Mexico City Time', abbr: 'CST', searchTerms: 'mexico city cst central' },
  { iana: 'America/Bogota', label: 'Colombia Time', abbr: 'COT', searchTerms: 'colombia bogota cot lima peru' },
  { iana: 'America/Toronto', label: 'Toronto (Eastern)', abbr: 'ET', searchTerms: 'toronto canada eastern est edt ontario' },
  { iana: 'America/Vancouver', label: 'Vancouver (Pacific)', abbr: 'PT', searchTerms: 'vancouver canada pacific pst pdt british columbia' },
  { iana: 'Europe/London', label: 'London (GMT/BST)', abbr: 'GMT', searchTerms: 'london uk united kingdom gmt bst greenwich britain england' },
  { iana: 'Europe/Dublin', label: 'Dublin (GMT/IST)', abbr: 'GMT', searchTerms: 'dublin ireland gmt ist' },
  { iana: 'Europe/Paris', label: 'Central European Time', abbr: 'CET', searchTerms: 'paris france cet cest central european' },
  { iana: 'Europe/Berlin', label: 'Berlin (CET)', abbr: 'CET', searchTerms: 'berlin germany cet cest' },
  { iana: 'Europe/Amsterdam', label: 'Amsterdam (CET)', abbr: 'CET', searchTerms: 'amsterdam netherlands cet cest' },
  { iana: 'Europe/Madrid', label: 'Madrid (CET)', abbr: 'CET', searchTerms: 'madrid spain cet cest' },
  { iana: 'Europe/Rome', label: 'Rome (CET)', abbr: 'CET', searchTerms: 'rome italy cet cest' },
  { iana: 'Europe/Zurich', label: 'Zurich (CET)', abbr: 'CET', searchTerms: 'zurich switzerland cet cest' },
  { iana: 'Europe/Stockholm', label: 'Stockholm (CET)', abbr: 'CET', searchTerms: 'stockholm sweden cet cest' },
  { iana: 'Europe/Warsaw', label: 'Warsaw (CET)', abbr: 'CET', searchTerms: 'warsaw poland cet cest' },
  { iana: 'Europe/Athens', label: 'Eastern European Time', abbr: 'EET', searchTerms: 'athens greece eet eest eastern european' },
  { iana: 'Europe/Bucharest', label: 'Bucharest (EET)', abbr: 'EET', searchTerms: 'bucharest romania eet eest' },
  { iana: 'Europe/Helsinki', label: 'Helsinki (EET)', abbr: 'EET', searchTerms: 'helsinki finland eet eest' },
  { iana: 'Europe/Moscow', label: 'Moscow Time', abbr: 'MSK', searchTerms: 'moscow russia msk' },
  { iana: 'Europe/Istanbul', label: 'Turkey Time', abbr: 'TRT', searchTerms: 'istanbul turkey trt' },
  { iana: 'Africa/Cairo', label: 'Cairo (EET)', abbr: 'EET', searchTerms: 'cairo egypt eet' },
  { iana: 'Africa/Lagos', label: 'West Africa Time', abbr: 'WAT', searchTerms: 'lagos nigeria wat west africa' },
  { iana: 'Africa/Johannesburg', label: 'South Africa Time', abbr: 'SAST', searchTerms: 'johannesburg south africa sast cape town' },
  { iana: 'Africa/Nairobi', label: 'East Africa Time', abbr: 'EAT', searchTerms: 'nairobi kenya eat east africa' },
  { iana: 'Asia/Dubai', label: 'Gulf Standard Time', abbr: 'GST', searchTerms: 'dubai uae gulf gst abu dhabi' },
  { iana: 'Asia/Riyadh', label: 'Arabia Standard Time', abbr: 'AST', searchTerms: 'riyadh saudi arabia ast' },
  { iana: 'Asia/Karachi', label: 'Pakistan Time', abbr: 'PKT', searchTerms: 'karachi pakistan pkt' },
  { iana: 'Asia/Kolkata', label: 'India Standard Time', abbr: 'IST', searchTerms: 'india kolkata mumbai delhi ist calcutta bangalore' },
  { iana: 'Asia/Dhaka', label: 'Bangladesh Time', abbr: 'BST', searchTerms: 'dhaka bangladesh bst' },
  { iana: 'Asia/Bangkok', label: 'Indochina Time', abbr: 'ICT', searchTerms: 'bangkok thailand ict indochina vietnam' },
  { iana: 'Asia/Singapore', label: 'Singapore Time', abbr: 'SGT', searchTerms: 'singapore sgt malaysia kuala lumpur' },
  { iana: 'Asia/Shanghai', label: 'China Standard Time', abbr: 'CST', searchTerms: 'shanghai china cst beijing' },
  { iana: 'Asia/Hong_Kong', label: 'Hong Kong Time', abbr: 'HKT', searchTerms: 'hong kong hkt' },
  { iana: 'Asia/Taipei', label: 'Taipei Time', abbr: 'CST', searchTerms: 'taipei taiwan cst' },
  { iana: 'Asia/Tokyo', label: 'Japan Standard Time', abbr: 'JST', searchTerms: 'tokyo japan jst osaka' },
  { iana: 'Asia/Seoul', label: 'Korea Standard Time', abbr: 'KST', searchTerms: 'seoul korea kst' },
  { iana: 'Australia/Perth', label: 'Australian Western', abbr: 'AWST', searchTerms: 'perth australia western awst' },
  { iana: 'Australia/Adelaide', label: 'Australian Central', abbr: 'ACST', searchTerms: 'adelaide australia central acst acdt' },
  { iana: 'Australia/Sydney', label: 'Australian Eastern', abbr: 'AEST', searchTerms: 'sydney australia eastern aest aedt melbourne' },
  { iana: 'Australia/Melbourne', label: 'Melbourne (AEST)', abbr: 'AEST', searchTerms: 'melbourne australia eastern aest aedt' },
  { iana: 'Pacific/Auckland', label: 'New Zealand Time', abbr: 'NZST', searchTerms: 'auckland new zealand nzst nzdt' },
  { iana: 'Pacific/Fiji', label: 'Fiji Time', abbr: 'FJT', searchTerms: 'fiji fjt' },
];

export function getTzLabel(iana) {
  const entry = TZ_DATA.find((t) => t.iana === iana);
  if (entry) return `${entry.label} (${entry.abbr})`;
  return iana.replace(/_/g, ' ').replace(/^.*\//, '');
}

export function getMonthData(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, currentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, currentMonth: false });
  }
  return cells;
}

export function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  try { document.execCommand('copy'); return true; }
  catch { return false; }
  finally { document.body.removeChild(textarea); }
}
