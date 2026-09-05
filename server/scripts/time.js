/**
 * Indian Standard Time (IST - Asia/Kolkata, UTC+05:30) Utility
 * PharmaChain Smart India Hackathon (SIH 2026)
 */

process.env.TZ = 'Asia/Kolkata';

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

export const getISTISOString = (d = new Date()) => {
    const dateObj = d instanceof Date ? d : new Date(d);
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
    const p = getISTParts(validDate);
    const ms = String(validDate.getMilliseconds()).padStart(3, '0');
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.${ms}+05:30`;
};

export const getISTDateString = (d = new Date()) => {
    const p = getISTParts(d);
    return `${p.year}-${p.month}-${p.day}`;
};

export const getISTDateCompact = (d = new Date()) => {
    const p = getISTParts(d);
    return `${p.day}${p.month}${p.year}`;
};

export const getISTTimeString = (d = new Date()) => {
    const p = getISTParts(d);
    return `${p.hour}:${p.minute}:${p.second}`;
};

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

export const initIST = () => {
    process.env.TZ = 'Asia/Kolkata';
    Date.prototype.toJSON = function () {
        return getISTISOString(this);
    };
};
