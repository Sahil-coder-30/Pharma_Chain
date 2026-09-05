/**
 * Indian Standard Time (IST - Asia/Kolkata, UTC+05:30) Utility
 * PharmaChain Smart India Hackathon (SIH 2026)
 *
 * Ensures consistent timezone handling, serialization, and storage in IST.
 */

// Set process timezone to Indian Standard Time
process.env.TZ = 'Asia/Kolkata';

// Formatter configured strictly for Asia/Kolkata
const istFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
});

/**
 * Extracts IST calendar and time components from a Date or current time.
 * @param {Date|string|number} [d=new Date()]
 * @returns {{ year: string, month: string, day: string, hour: string, minute: string, second: string }}
 */
export const getISTParts = (d = new Date()) => {
    const dateObj = d instanceof Date ? d : new Date(d);
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
    const parts = istFormatter.formatToParts(validDate);
    const map = {};
    for (const p of parts) {
        map[p.type] = p.value;
    }
    return map;
};

/**
 * Returns an ISO-8601 string with Indian Standard Time offset (+05:30).
 * Example: "2026-09-05T23:10:34.447+05:30"
 * @param {Date|string|number} [d=new Date()]
 * @returns {string}
 */
export const getISTISOString = (d = new Date()) => {
    const dateObj = d instanceof Date ? d : new Date(d);
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
    const p = getISTParts(validDate);
    const ms = String(validDate.getMilliseconds()).padStart(3, '0');
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.${ms}+05:30`;
};

/**
 * Returns date in YYYY-MM-DD format in Indian Standard Time.
 * Example: "2026-09-05"
 * @param {Date|string|number} [d=new Date()]
 * @returns {string}
 */
export const getISTDateString = (d = new Date()) => {
    const p = getISTParts(d);
    return `${p.year}-${p.month}-${p.day}`;
};

/**
 * Returns compact date in DDMMYYYY format in Indian Standard Time.
 * Example: "05092026"
 * @param {Date|string|number} [d=new Date()]
 * @returns {string}
 */
export const getISTDateCompact = (d = new Date()) => {
    const p = getISTParts(d);
    return `${p.day}${p.month}${p.year}`;
};

/**
 * Returns time in HH:mm:ss format in Indian Standard Time.
 * Example: "23:10:34"
 * @param {Date|string|number} [d=new Date()]
 * @returns {string}
 */
export const getISTTimeString = (d = new Date()) => {
    const p = getISTParts(d);
    return `${p.hour}:${p.minute}:${p.second}`;
};

/**
 * Formats a date into a human-readable Indian Standard Time string.
 * Example: "05 Sep 2026, 11:10 PM"
 * @param {Date|string|number} [d=new Date()]
 * @returns {string}
 */
export const formatISTDateTime = (d = new Date()) => {
    const dateObj = d instanceof Date ? d : new Date(d);
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

/**
 * Globally initializes Indian Standard Time for the Node process:
 * 1. Sets process.env.TZ = 'Asia/Kolkata'
 * 2. Overrides Date.prototype.toJSON to return getISTISOString(this) so all
 *    JSON.stringify calls (res.json, lean query serialization, logging)
 *    automatically output Indian Standard Time with '+05:30' offset.
 */
export const initIST = () => {
    process.env.TZ = 'Asia/Kolkata';
    Date.prototype.toJSON = function () {
        return getISTISOString(this);
    };
};
