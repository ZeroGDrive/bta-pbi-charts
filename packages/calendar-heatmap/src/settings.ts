"use strict";

import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;
import {
    IBaseVisualSettings,
    ColorScheme,
    CellSize,
    WeekStart,
    colorSchemes,
    defaultSmallMultiplesSettings,
    defaultLegendSettings,
    defaultCustomColorSettings,
    defaultTooltipSettings,
    TooltipStyle,
    TooltipTheme
} from "@pbi-visuals/shared";

export interface ICalendarSettings {
    cellSize: CellSize;
    showMonthLabels: boolean;
    weekStartsOn: WeekStart;
    minColor: string;
    maxColor: string;
}

export interface ICalendarTextSizeSettings {
    yearLabelFontSize: number;    // 0 = auto, 8-32 = manual
    monthLabelFontSize: number;   // 0 = auto, 8-32 = manual
    dayLabelFontSize: number;     // 0 = auto, 8-32 = manual (Y-axis day labels)
    panelTitleFontSize: number;   // 0 = auto, 8-32 = manual
}

export interface ICalendarVisualSettings extends IBaseVisualSettings {
    calendar: ICalendarSettings;
    textSizes: ICalendarTextSizeSettings;
}

export const defaultSettings: ICalendarVisualSettings = {
    colorScheme: "greens",
    legendPosition: "topRight",
    legendFontSize: defaultLegendSettings.legendFontSize!,
    maxLegendItems: defaultLegendSettings.maxLegendItems!,
    showXAxis: false,
    xAxisFontSize: 10,
    xAxisFontFamily: "Segoe UI",
    xAxisBold: false,
    xAxisItalic: false,
    xAxisUnderline: false,
    xAxisColor: "#666666",
    showYAxis: true,
    yAxisFontSize: 8,
    yAxisFontFamily: "Segoe UI",
    yAxisBold: false,
    yAxisItalic: false,
    yAxisUnderline: false,
    yAxisColor: "#333333",
    rotateXLabels: "never",  // Calendar doesn't use X-axis rotation but needs the property
    tooltip: { ...defaultTooltipSettings },
    useCustomColors: defaultCustomColorSettings.useCustomColors,
    customColors: [...defaultCustomColorSettings.customColors],
    calendar: {
        cellSize: "medium",
        showMonthLabels: true,
        weekStartsOn: "sunday",
        minColor: "#f7fcf5",
        maxColor: "#006d2c"
    },
    textSizes: {
        yearLabelFontSize: 0,
        monthLabelFontSize: 0,
        dayLabelFontSize: 0,
        panelTitleFontSize: 0
    },
    smallMultiples: { ...defaultSmallMultiplesSettings }
};

export function parseSettings(dataView: DataView): ICalendarVisualSettings {
    const objects = dataView?.metadata?.objects;
    const settings: ICalendarVisualSettings = JSON.parse(JSON.stringify(defaultSettings));

    if (!objects) {
        return settings;
    }

    // Color scheme
    const colorSchemeObj = objects["colorScheme"];
    if (colorSchemeObj) {
        settings.colorScheme = (colorSchemeObj["scheme"] as ColorScheme) ?? defaultSettings.colorScheme;
        // Update default min/max colors based on color scheme
        const scheme = colorSchemes[settings.colorScheme];
        if (scheme) {
            settings.calendar.minColor = scheme.min;
            settings.calendar.maxColor = scheme.max;
        }
    }

    // Tooltip settings
    const tooltipObj = objects["tooltipSettings"];
    if (tooltipObj) {
        settings.tooltip.enabled = (tooltipObj["enabled"] as boolean) ?? defaultSettings.tooltip.enabled;
        settings.tooltip.style = (tooltipObj["style"] as TooltipStyle) ?? defaultSettings.tooltip.style;
        settings.tooltip.theme = (tooltipObj["theme"] as TooltipTheme) ?? defaultSettings.tooltip.theme;

        const bg = tooltipObj["backgroundColor"] as any;
        const border = tooltipObj["borderColor"] as any;
        const text = tooltipObj["textColor"] as any;
        if (bg?.solid?.color) settings.tooltip.backgroundColor = bg.solid.color;
        if (border?.solid?.color) settings.tooltip.borderColor = border.solid.color;
        if (text?.solid?.color) settings.tooltip.textColor = text.solid.color;

        settings.tooltip.borderRadius = (tooltipObj["borderRadius"] as number) ?? defaultSettings.tooltip.borderRadius;
        settings.tooltip.shadow = (tooltipObj["shadow"] as boolean) ?? defaultSettings.tooltip.shadow;
        settings.tooltip.maxWidth = (tooltipObj["maxWidth"] as number) ?? defaultSettings.tooltip.maxWidth;
        settings.tooltip.showColorSwatch = (tooltipObj["showColorSwatch"] as boolean) ?? defaultSettings.tooltip.showColorSwatch;

        settings.tooltip.borderRadius = Math.max(0, Math.min(24, settings.tooltip.borderRadius));
        settings.tooltip.maxWidth = Math.max(160, Math.min(560, settings.tooltip.maxWidth));
    }

    // Custom colors settings
    const customColorsObj = objects["customColors"];
    if (customColorsObj) {
        settings.useCustomColors = (customColorsObj["useCustomColors"] as boolean) ?? defaultSettings.useCustomColors;

        // Parse comma-separated color list
        const colorListStr = customColorsObj["colorList"] as string;
        if (colorListStr && typeof colorListStr === "string" && colorListStr.trim()) {
            const parsedColors = colorListStr
                .split(",")
                .map(c => c.trim())
                .filter(c => c.length > 0 && (c.startsWith("#") || c.match(/^[a-fA-F0-9]{6}$/)));

            settings.customColors = parsedColors.map(c => c.startsWith("#") ? c : `#${c}`);
        }
    }

    // Y-Axis (Day labels) settings
    const yAxisObj = objects["yAxisSettings"];
    if (yAxisObj) {
        settings.showYAxis = (yAxisObj["show"] as boolean) ?? defaultSettings.showYAxis;
        settings.yAxisFontSize = (yAxisObj["fontSize"] as number) ?? defaultSettings.yAxisFontSize;
        settings.yAxisFontFamily = (yAxisObj["fontFamily"] as string) ?? defaultSettings.yAxisFontFamily;
        settings.yAxisBold = (yAxisObj["bold"] as boolean) ?? defaultSettings.yAxisBold;
        settings.yAxisItalic = (yAxisObj["italic"] as boolean) ?? defaultSettings.yAxisItalic;
        settings.yAxisUnderline = (yAxisObj["underline"] as boolean) ?? defaultSettings.yAxisUnderline;
        const yColor = yAxisObj["color"] as any;
        if (yColor?.solid?.color) settings.yAxisColor = yColor.solid.color;
    }

    // Calendar settings
    const calendarObj = objects["calendarSettings"];
    if (calendarObj) {
        settings.calendar.cellSize = (calendarObj["cellSize"] as CellSize) ?? defaultSettings.calendar.cellSize;
        settings.calendar.showMonthLabels = (calendarObj["showMonthLabels"] as boolean) ?? defaultSettings.calendar.showMonthLabels;
        settings.calendar.weekStartsOn = (calendarObj["weekStartsOn"] as WeekStart) ?? defaultSettings.calendar.weekStartsOn;

        // Custom gradient colors
        const minColorObj = calendarObj["minColor"] as any;
        const maxColorObj = calendarObj["maxColor"] as any;
        if (minColorObj?.solid?.color) {
            settings.calendar.minColor = minColorObj.solid.color;
        }
        if (maxColorObj?.solid?.color) {
            settings.calendar.maxColor = maxColorObj.solid.color;
        }
    }

    // Text Sizes settings
    const textSizesObj = objects["textSizes"];
    if (textSizesObj) {
        settings.textSizes.yearLabelFontSize = (textSizesObj["yearLabelFontSize"] as number) ?? defaultSettings.textSizes.yearLabelFontSize;
        settings.textSizes.monthLabelFontSize = (textSizesObj["monthLabelFontSize"] as number) ?? defaultSettings.textSizes.monthLabelFontSize;
        settings.textSizes.dayLabelFontSize = (textSizesObj["dayLabelFontSize"] as number) ?? defaultSettings.textSizes.dayLabelFontSize;
        settings.textSizes.panelTitleFontSize = (textSizesObj["panelTitleFontSize"] as number) ?? defaultSettings.textSizes.panelTitleFontSize;
        // Clamp values (0 = auto, otherwise 6-40)
        const clampFontSize = (v: number): number => {
            const n = Number(v);
            if (!Number.isFinite(n) || n <= 0) return 0;
            return Math.max(6, Math.min(40, n));
        };
        settings.textSizes.yearLabelFontSize = clampFontSize(settings.textSizes.yearLabelFontSize);
        settings.textSizes.monthLabelFontSize = clampFontSize(settings.textSizes.monthLabelFontSize);
        settings.textSizes.dayLabelFontSize = clampFontSize(settings.textSizes.dayLabelFontSize);
        settings.textSizes.panelTitleFontSize = clampFontSize(settings.textSizes.panelTitleFontSize);
    }

    // Small Multiples settings
    const smallMultObj = objects["smallMultiples"];
    if (smallMultObj) {
        settings.smallMultiples.columns = (smallMultObj["columns"] as number) ?? defaultSettings.smallMultiples.columns;
        settings.smallMultiples.spacing = (smallMultObj["spacing"] as number) ?? defaultSettings.smallMultiples.spacing;
        settings.smallMultiples.showTitle = (smallMultObj["showTitle"] as boolean) ?? defaultSettings.smallMultiples.showTitle;
        settings.smallMultiples.titleFontSize = (smallMultObj["titleFontSize"] as number) ?? defaultSettings.smallMultiples.titleFontSize;
        settings.smallMultiples.titleSpacing = (smallMultObj["titleSpacing"] as number) ?? defaultSettings.smallMultiples.titleSpacing;
        settings.smallMultiples.columns = Math.max(1, Math.min(6, settings.smallMultiples.columns));
        settings.smallMultiples.spacing = Math.max(10, Math.min(200, settings.smallMultiples.spacing));
        settings.smallMultiples.titleSpacing = Math.max(10, Math.min(120, settings.smallMultiples.titleSpacing));
    }

    return settings;
}
