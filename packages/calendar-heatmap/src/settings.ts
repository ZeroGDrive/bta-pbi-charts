"use strict";

import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;
import {
    IBaseVisualSettings,
    ColorScheme,
    LegendPosition,
    CellSize,
    WeekStart,
    colorSchemes,
    defaultSmallMultiplesSettings,
    defaultLegendSettings,
    defaultCustomColorSettings,
    defaultFontScaleFactor
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
    legendFontSize: number;       // 0 = auto, 8-32 = manual
    panelTitleFontSize: number;   // 0 = auto, 8-32 = manual
}

export interface ICalendarVisualSettings extends IBaseVisualSettings {
    calendar: ICalendarSettings;
    textSizes: ICalendarTextSizeSettings;
}

export const defaultSettings: ICalendarVisualSettings = {
    colorScheme: "greens",
    showLegend: true,
    legendPosition: "right",
    legendFontSize: defaultLegendSettings.legendFontSize!,
    maxLegendItems: defaultLegendSettings.maxLegendItems!,
    showXAxis: false,
    xAxisFontSize: 10,
    showYAxis: true,
    yAxisFontSize: 8,
    rotateXLabels: "never",  // Calendar doesn't use X-axis rotation but needs the property
    responsiveText: true,
    fontScaleFactor: defaultFontScaleFactor,
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
        legendFontSize: 0,
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

    // Legend settings
    const legendObj = objects["legend"];
    if (legendObj) {
        settings.showLegend = (legendObj["show"] as boolean) ?? defaultSettings.showLegend;
        settings.legendPosition = (legendObj["position"] as LegendPosition) ?? defaultSettings.legendPosition;
        settings.legendFontSize = (legendObj["fontSize"] as number) ?? defaultSettings.legendFontSize;
        settings.maxLegendItems = (legendObj["maxItems"] as number) ?? defaultSettings.maxLegendItems;
    }

    // Responsive text setting (from general settings)
    const generalObj = objects["general"];
    if (generalObj) {
        settings.responsiveText = (generalObj["responsiveText"] as boolean) ?? defaultSettings.responsiveText;
        settings.fontScaleFactor = (generalObj["fontScaleFactor"] as number) ?? defaultSettings.fontScaleFactor;
        // Clamp font scale factor between 0.5 and 2.0
        settings.fontScaleFactor = Math.max(0.5, Math.min(2.0, settings.fontScaleFactor));
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
        settings.textSizes.legendFontSize = (textSizesObj["legendFontSize"] as number) ?? defaultSettings.textSizes.legendFontSize;
        settings.textSizes.panelTitleFontSize = (textSizesObj["panelTitleFontSize"] as number) ?? defaultSettings.textSizes.panelTitleFontSize;
        // Clamp values (0 = auto, 8-32 = manual)
        settings.textSizes.yearLabelFontSize = settings.textSizes.yearLabelFontSize === 0 ? 0 : Math.max(8, Math.min(32, settings.textSizes.yearLabelFontSize));
        settings.textSizes.monthLabelFontSize = settings.textSizes.monthLabelFontSize === 0 ? 0 : Math.max(8, Math.min(32, settings.textSizes.monthLabelFontSize));
        settings.textSizes.dayLabelFontSize = settings.textSizes.dayLabelFontSize === 0 ? 0 : Math.max(8, Math.min(32, settings.textSizes.dayLabelFontSize));
        settings.textSizes.legendFontSize = settings.textSizes.legendFontSize === 0 ? 0 : Math.max(8, Math.min(32, settings.textSizes.legendFontSize));
        settings.textSizes.panelTitleFontSize = settings.textSizes.panelTitleFontSize === 0 ? 0 : Math.max(8, Math.min(32, settings.textSizes.panelTitleFontSize));
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
        settings.smallMultiples.spacing = Math.max(10, Math.min(50, settings.smallMultiples.spacing));
        settings.smallMultiples.titleSpacing = Math.max(10, Math.min(50, settings.smallMultiples.titleSpacing));
    }

    return settings;
}
