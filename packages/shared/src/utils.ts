"use strict";

/**
 * Formats a data value for display, handling null/undefined values
 */
export function formatDataValue(value: any, index: number): string {
    if (value === null || value === undefined) {
        return `Point ${index}`;
    }
    return String(value);
}

/**
 * Sorts date values in chronological order
 * Supports formats: "MMM YYYY" (e.g., "Jan 2024") and "YYYY-MM" (e.g., "2024-01")
 */
export function sortDateValues(xValues: string[]): string[] {
    const months: Record<string, number> = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
    };

    const parseDate = (s: string): number | null => {
        // "MMM YYYY" format
        const mmmYYYY = s.match(/^([A-Za-z]{3})\s+(\d{4})$/);
        if (mmmYYYY) {
            return parseInt(mmmYYYY[2]) * 100 + (months[mmmYYYY[1]] || 0);
        }
        // "YYYY-MM" format
        const yyyyMM = s.match(/^(\d{4})-(\d{2})$/);
        if (yyyyMM) {
            return parseInt(yyyyMM[1]) * 100 + parseInt(yyyyMM[2]);
        }
        return null;
    };

    return xValues.sort((a, b) => {
        const aNum = parseDate(a);
        const bNum = parseDate(b);
        if (aNum !== null && bNum !== null) {
            return aNum - bNum;
        }
        return a.localeCompare(b);
    });
}
