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
 * Formats a grouping value for display.
 * Unlike `formatDataValue`, blanks are rendered as "(Blank)" to avoid
 * generating synthetic per-row labels that create noisy group panels.
 */
export function formatGroupValue(value: any): string {
    if (value === null || value === undefined) {
        return "(Blank)";
    }
    const str = String(value);
    return str.trim() ? str : "(Blank)";
}

// ---------------------------------------------------------------------------
// Lightweight PBI format-string parser (replaces heavy Globalize dependency)
// ---------------------------------------------------------------------------

/**
 * Parse the number of decimal places from a PBI / .NET-style format string.
 * Returns `null` when the string is not a recognisable numeric format.
 */
function parseDecimals(fmt: string): number | null {
    // Fixed-point patterns: "0.00", "#,##0.00", "#,0.0", etc.
    const dotMatch = fmt.match(/\.([0#]+)/);
    if (dotMatch) {
        return dotMatch[1].replace(/#/g, "").length; // only count '0' positions
    }

    // Whole-number patterns without a decimal part
    if (/^[#,0]+$/.test(fmt)) return 0;

    return null;
}

/**
 * Detect whether the format string is a percentage format.
 * PBI uses patterns like "0.00 %;-0.00 %;0.00 %" or "0%".
 */
function isPercentFormat(fmt: string): boolean {
    return fmt.includes("%");
}

/**
 * Detect currency symbol in the format string and return it (or null).
 */
function detectCurrencySymbol(fmt: string): string | null {
    // Common PBI patterns: "$#,##0.00", "€#,##0.00", "£#,##0", "¥#,0"
    const m = fmt.match(/^([$€£¥₹₽₩₪₫₴₵₦])/);
    if (m) return m[1];
    // Symbol at end: "#,##0.00 $"
    const mEnd = fmt.match(/([$€£¥₹₽₩₪₫₴₵₦])\s*$/);
    if (mEnd) return mEnd[1];
    return null;
}

/**
 * Detect whether the format string uses thousands grouping (commas).
 */
function usesGrouping(fmt: string): boolean {
    return fmt.includes(",");
}

/**
 * Lightweight replacement for `valueFormatter.format()` from
 * `powerbi-visuals-utils-formattingutils`.
 *
 * Handles the most common PBI numeric format strings:
 *   - Fixed-point:   "#,##0.00", "0.0", "0"
 *   - Percentage:    "0.00 %;-0.00 %;0.00 %", "0%"
 *   - Currency:      "$#,##0.00", "€#,0"
 *   - Whole number:  "#,##0"
 *
 * Falls back to `Intl.NumberFormat` / `toLocaleString` for anything exotic.
 */
function lightFormat(n: number, fmt: string): string | null {
    // PBI composite format strings can contain positive;negative;zero sections.
    // Pick the section matching the sign of n.
    const sections = fmt.split(";");
    let activeFmt: string;
    if (sections.length >= 3) {
        activeFmt = n > 0 ? sections[0] : n < 0 ? sections[1] : sections[2];
    } else if (sections.length === 2) {
        activeFmt = n >= 0 ? sections[0] : sections[1];
    } else {
        activeFmt = sections[0];
    }
    activeFmt = activeFmt.trim();
    if (!activeFmt) return null;

    const pct = isPercentFormat(activeFmt);
    const value = pct ? n * 100 : n;
    const absValue = Math.abs(value);

    const decimals = parseDecimals(activeFmt.replace(/[$€£¥₹₽₩₪₫₴₵₦%\s]/g, ""));
    if (decimals === null) return null; // unrecognised

    const grouping = usesGrouping(activeFmt);
    const currency = detectCurrencySymbol(activeFmt);

    const formatted = absValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: grouping,
    });

    // Re-apply sign (negative section in PBI sometimes omits the minus)
    const sign = value < 0 ? "-" : "";

    if (pct) {
        return `${sign}${formatted}%`;
    }
    if (currency) {
        // Place symbol where format string has it
        const symbolAtEnd = /[$€£¥₹₽₩₪₫₴₵₦]\s*$/.test(activeFmt);
        return symbolAtEnd
            ? `${sign}${formatted}${currency}`
            : `${sign}${currency}${formatted}`;
    }
    return `${sign}${formatted}`;
}

export function formatMeasureValue(
    value: number | null | undefined,
    formatString?: string,
    fallback?: Intl.NumberFormatOptions
): string {
    if (value === null || value === undefined) {
        return "(Blank)";
    }
    const n = Number(value);
    if (!Number.isFinite(n)) {
        return "N/A";
    }
    if (formatString && typeof formatString === "string" && formatString.trim()) {
        try {
            const result = lightFormat(n, formatString);
            if (result !== null) return result;
        } catch {
            // ignore and fall back
        }
    }
    const opts: Intl.NumberFormatOptions = fallback ?? {};
    return n.toLocaleString(undefined, opts);
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
