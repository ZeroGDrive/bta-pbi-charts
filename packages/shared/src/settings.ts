"use strict";

// Color scheme types - expanded with new options
export type ColorScheme =
    | "blues" | "greens" | "reds" | "purples" | "warm"
    | "oranges" | "teals" | "pinks"      // NEW single-hue
    | "rainbow" | "pastel" | "vibrant";  // NEW multi-color

export type LegendPosition = "top" | "right" | "bottom";
export type CellSize = "small" | "medium" | "large";
export type WeekStart = "sunday" | "monday";
export type RotateLabelsMode = "auto" | "always" | "never";

// Shared settings interfaces
export interface ISmallMultiplesSettings {
    columns: number;
    spacing: number;
    showTitle: boolean;
    titleFontSize: number;
    titleSpacing: number;  // NEW - gap between title and content
}

export interface ILegendSettings {
    showLegend: boolean;
    legendPosition: LegendPosition;
    legendFontSize: number;      // NEW
    maxLegendItems: number;      // NEW (default 10, was hardcoded 6)
}

// Custom colors for data groups - allows per-category color control
export interface ICustomColorSettings {
    useCustomColors: boolean;           // Toggle custom colors on/off
    customColors: string[];             // Array of hex colors for each data group
}

export interface IAxisSettings {
    showXAxis: boolean;
    xAxisFontSize: number;
    showYAxis: boolean;
    yAxisFontSize: number;
    rotateXLabels: RotateLabelsMode;  // Control X-axis label rotation
}

/**
 * Text size settings for manual font size control
 * Value of 0 means "auto/responsive", positive values (8-32) are manual overrides
 */
export interface ITextSizeSettings {
    xAxisFontSize: number;      // 0 = auto, 8-32 = manual
    yAxisFontSize: number;      // 0 = auto, 8-32 = manual
    legendFontSize: number;     // 0 = auto, 8-32 = manual
    panelTitleFontSize: number; // 0 = auto, 8-32 = manual
}

/**
 * Default text size settings (all auto)
 */
export const defaultTextSizeSettings: ITextSizeSettings = {
    xAxisFontSize: 0,
    yAxisFontSize: 0,
    legendFontSize: 0,
    panelTitleFontSize: 0
};

// Base settings interface that all visuals extend
export interface IBaseVisualSettings extends ILegendSettings, IAxisSettings, ICustomColorSettings {
    colorScheme: ColorScheme;
    smallMultiples: ISmallMultiplesSettings;
    responsiveText: boolean;  // NEW - enable/disable responsive scaling
    fontScaleFactor: number;  // Controls how aggressively fonts scale (0.5-2.0, default 1.0)
}

// Color scheme constants - expanded
export const colorSchemes: Record<ColorScheme, { min: string; max: string }> = {
    blues: { min: "#f7fbff", max: "#08519c" },
    greens: { min: "#f7fcf5", max: "#006d2c" },
    reds: { min: "#fff5f0", max: "#a50f15" },
    purples: { min: "#fcfbfd", max: "#54278f" },
    warm: { min: "#ffffcc", max: "#bd0026" },
    oranges: { min: "#fff5eb", max: "#d94701" },  // NEW
    teals: { min: "#f0fdfa", max: "#0d9488" },    // NEW
    pinks: { min: "#fdf2f8", max: "#be185d" },    // NEW
    rainbow: { min: "#ff0000", max: "#0000ff" },  // NEW (uses multi-stop in categorical)
    pastel: { min: "#fef3c7", max: "#a78bfa" },   // NEW
    vibrant: { min: "#22d3ee", max: "#f43f5e" }   // NEW
};

// Default small multiples settings
export const defaultSmallMultiplesSettings: ISmallMultiplesSettings = {
    columns: 2,
    spacing: 30,
    showTitle: true,
    titleFontSize: 14,
    titleSpacing: 25  // NEW
};

// Default legend settings
export const defaultLegendSettings: Partial<ILegendSettings> = {
    showLegend: true,
    legendPosition: "right" as LegendPosition,
    legendFontSize: 11,
    maxLegendItems: 10
};

// Default custom color settings
export const defaultCustomColorSettings: ICustomColorSettings = {
    useCustomColors: false,
    customColors: [
        "#3b82f6",  // Blue
        "#ef4444",  // Red
        "#22c55e",  // Green
        "#f59e0b",  // Amber
        "#8b5cf6",  // Purple
        "#ec4899",  // Pink
        "#06b6d4",  // Cyan
        "#f97316",  // Orange
        "#14b8a6",  // Teal
        "#6366f1",  // Indigo
        "#84cc16",  // Lime
        "#a855f7"   // Violet
    ]
};

// Default font scaling
export const defaultFontScaleFactor = 1.0;
