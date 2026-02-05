"use strict";

import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;
import {
    IBaseVisualSettings,
    LegendPosition,
    RotateLabelsMode,
    defaultSmallMultiplesSettings,
    defaultLegendSettings,
    defaultCustomColorSettings,
    defaultTooltipSettings,
    TooltipStyle,
    TooltipTheme
} from "@pbi-visuals/shared";

export interface IBollingerSettings {
    period: number;              // Default: 20
    stdDeviation: number;        // Default: 2
    showPriceLine: boolean;      // Default: true
    showMiddleBand: boolean;     // Default: true
    showBands: boolean;          // Default: true
    showBandFill: boolean;       // Default: true
    priceLineColor: string;      // Default: "#2171b5" (blue)
    middleBandColor: string;     // Default: "#aaaaaa" (gray)
    upperBandColor: string;      // Default: "#e41a1c" (red)
    lowerBandColor: string;      // Default: "#4daf4a" (green)
    bandFillColor: string;       // Default: "#cccccc"
    bandFillOpacity: number;     // Default: 0.2
    lineWidth: number;           // Default: 1.5
}

export interface IBollingerTextSizeSettings {
    xAxisFontSize: number;      // 0 = auto, 8-32 = manual
    yAxisFontSize: number;      // 0 = auto, 8-32 = manual
    legendFontSize: number;     // 0 = auto, 8-32 = manual
    panelTitleFontSize: number; // 0 = auto, 8-32 = manual
}

export interface IBollingerVisualSettings extends IBaseVisualSettings {
    bollinger: IBollingerSettings;
    textSizes: IBollingerTextSizeSettings;
}

export const defaultBollingerSettings: IBollingerSettings = {
    period: 20,
    stdDeviation: 2,
    showPriceLine: true,
    showMiddleBand: true,
    showBands: true,
    showBandFill: true,
    priceLineColor: "#2171b5",
    middleBandColor: "#aaaaaa",
    upperBandColor: "#e41a1c",
    lowerBandColor: "#4daf4a",
    bandFillColor: "#cccccc",
    bandFillOpacity: 0.2,
    lineWidth: 1.5
};

export const defaultSettings: IBollingerVisualSettings = {
    colorScheme: "blues",
    legendPosition: "topRight",
    legendFontSize: defaultLegendSettings.legendFontSize!,
    maxLegendItems: defaultLegendSettings.maxLegendItems!,
    showXAxis: true,
    xAxisFontSize: 10,
    xAxisFontFamily: "Segoe UI",
    xAxisBold: false,
    xAxisItalic: false,
    xAxisUnderline: false,
    xAxisColor: "#666666",
    showYAxis: true,
    yAxisFontSize: 11,
    yAxisFontFamily: "Segoe UI",
    yAxisBold: false,
    yAxisItalic: false,
    yAxisUnderline: false,
    yAxisColor: "#333333",
    rotateXLabels: "auto",
    tooltip: { ...defaultTooltipSettings },
    useCustomColors: defaultCustomColorSettings.useCustomColors,
    customColors: [...defaultCustomColorSettings.customColors],
    bollinger: { ...defaultBollingerSettings },
    textSizes: {
        xAxisFontSize: 0,
        yAxisFontSize: 0,
        legendFontSize: 0,
        panelTitleFontSize: 0
    },
    smallMultiples: { ...defaultSmallMultiplesSettings }
};

export function parseSettings(dataView: DataView): IBollingerVisualSettings {
    const objects = dataView?.metadata?.objects;
    const settings: IBollingerVisualSettings = JSON.parse(JSON.stringify(defaultSettings));

    if (!objects) {
        return settings;
    }

    // Legend settings
    const legendObj = objects["legend"];
    if (legendObj) {
        settings.legendPosition = (legendObj["position"] as LegendPosition) ?? defaultSettings.legendPosition;
        settings.legendFontSize = (legendObj["fontSize"] as number) ?? defaultSettings.legendFontSize;
        settings.maxLegendItems = (legendObj["maxItems"] as number) ?? defaultSettings.maxLegendItems;
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

    // X-Axis settings
    const xAxisObj = objects["xAxisSettings"];
    if (xAxisObj) {
        settings.showXAxis = (xAxisObj["show"] as boolean) ?? defaultSettings.showXAxis;
        settings.xAxisFontSize = (xAxisObj["fontSize"] as number) ?? defaultSettings.xAxisFontSize;
        settings.rotateXLabels = (xAxisObj["rotateLabels"] as RotateLabelsMode) ?? defaultSettings.rotateXLabels;
        settings.xAxisFontFamily = (xAxisObj["fontFamily"] as string) ?? defaultSettings.xAxisFontFamily;
        settings.xAxisBold = (xAxisObj["bold"] as boolean) ?? defaultSettings.xAxisBold;
        settings.xAxisItalic = (xAxisObj["italic"] as boolean) ?? defaultSettings.xAxisItalic;
        settings.xAxisUnderline = (xAxisObj["underline"] as boolean) ?? defaultSettings.xAxisUnderline;
        const xColor = xAxisObj["color"] as any;
        if (xColor?.solid?.color) settings.xAxisColor = xColor.solid.color;
    }

    // Y-Axis settings
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

    // Text Sizes settings
    const textSizesObj = objects["textSizes"];
    if (textSizesObj) {
        settings.textSizes.xAxisFontSize = (textSizesObj["xAxisFontSize"] as number) ?? defaultSettings.textSizes.xAxisFontSize;
        settings.textSizes.yAxisFontSize = (textSizesObj["yAxisFontSize"] as number) ?? defaultSettings.textSizes.yAxisFontSize;
        settings.textSizes.legendFontSize = (textSizesObj["legendFontSize"] as number) ?? defaultSettings.textSizes.legendFontSize;
        settings.textSizes.panelTitleFontSize = (textSizesObj["panelTitleFontSize"] as number) ?? defaultSettings.textSizes.panelTitleFontSize;
        // Clamp values (0 = auto, otherwise 6-40)
        const clampFontSize = (v: number): number => {
            const n = Number(v);
            if (!Number.isFinite(n) || n <= 0) return 0;
            return Math.max(6, Math.min(40, n));
        };
        settings.textSizes.xAxisFontSize = clampFontSize(settings.textSizes.xAxisFontSize);
        settings.textSizes.yAxisFontSize = clampFontSize(settings.textSizes.yAxisFontSize);
        settings.textSizes.legendFontSize = clampFontSize(settings.textSizes.legendFontSize);
        settings.textSizes.panelTitleFontSize = clampFontSize(settings.textSizes.panelTitleFontSize);
    }

    // Bollinger Bands settings
    const bollingerObj = objects["bollingerSettings"];
    if (bollingerObj) {
        settings.bollinger.period = (bollingerObj["period"] as number) ?? defaultSettings.bollinger.period;
        settings.bollinger.stdDeviation = (bollingerObj["stdDeviation"] as number) ?? defaultSettings.bollinger.stdDeviation;
        settings.bollinger.showPriceLine = (bollingerObj["showPriceLine"] as boolean) ?? defaultSettings.bollinger.showPriceLine;
        settings.bollinger.showMiddleBand = (bollingerObj["showMiddleBand"] as boolean) ?? defaultSettings.bollinger.showMiddleBand;
        settings.bollinger.showBands = (bollingerObj["showBands"] as boolean) ?? defaultSettings.bollinger.showBands;
        settings.bollinger.showBandFill = (bollingerObj["showBandFill"] as boolean) ?? defaultSettings.bollinger.showBandFill;
        settings.bollinger.lineWidth = (bollingerObj["lineWidth"] as number) ?? defaultSettings.bollinger.lineWidth;

        // Parse color values
        const priceColor = bollingerObj["priceLineColor"] as any;
        const middleColor = bollingerObj["middleBandColor"] as any;
        const upperColor = bollingerObj["upperBandColor"] as any;
        const lowerColor = bollingerObj["lowerBandColor"] as any;
        const fillColor = bollingerObj["bandFillColor"] as any;

        if (priceColor?.solid?.color) settings.bollinger.priceLineColor = priceColor.solid.color;
        if (middleColor?.solid?.color) settings.bollinger.middleBandColor = middleColor.solid.color;
        if (upperColor?.solid?.color) settings.bollinger.upperBandColor = upperColor.solid.color;
        if (lowerColor?.solid?.color) settings.bollinger.lowerBandColor = lowerColor.solid.color;
        if (fillColor?.solid?.color) settings.bollinger.bandFillColor = fillColor.solid.color;

        settings.bollinger.bandFillOpacity = (bollingerObj["bandFillOpacity"] as number) ?? defaultSettings.bollinger.bandFillOpacity;

        // Clamp values
        settings.bollinger.period = Math.max(2, Math.min(200, settings.bollinger.period));
        settings.bollinger.stdDeviation = Math.max(0.5, Math.min(5, settings.bollinger.stdDeviation));
        settings.bollinger.lineWidth = Math.max(0.5, Math.min(5, settings.bollinger.lineWidth));
        settings.bollinger.bandFillOpacity = Math.max(0, Math.min(1, settings.bollinger.bandFillOpacity));
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
