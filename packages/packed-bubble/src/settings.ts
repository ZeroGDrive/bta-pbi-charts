"use strict";

import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;
import {
    IBaseVisualSettings,
    ColorScheme,
    LegendPosition,
    defaultSmallMultiplesSettings,
    defaultLegendSettings,
    defaultCustomColorSettings,
    defaultTooltipSettings,
    TooltipStyle,
    TooltipTheme
} from "@pbi-visuals/shared";

export interface IBubbleSettings {
    minBubbleSize: number;
    maxBubbleSize: number;
    showLabels: boolean;
    clusterByCategory: boolean;
    labelSizeMode: "auto" | "fixed";  // NEW
    labelFontSize: number;            // NEW (used when fixed)
    minLabelFontSize: number;         // NEW (min for auto)
    maxLabelFontSize: number;         // NEW (max for auto)
}

export interface IBubbleTextSizeSettings {
    legendFontSize: number;       // 0 = auto, 8-32 = manual
    panelTitleFontSize: number;   // 0 = auto, 8-32 = manual
}

export interface IBubbleVisualSettings extends IBaseVisualSettings {
    bubble: IBubbleSettings;
    textSizes: IBubbleTextSizeSettings;
}

export const defaultSettings: IBubbleVisualSettings = {
    colorScheme: "blues",
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
    showYAxis: false,
    yAxisFontSize: 11,
    yAxisFontFamily: "Segoe UI",
    yAxisBold: false,
    yAxisItalic: false,
    yAxisUnderline: false,
    yAxisColor: "#333333",
    rotateXLabels: "never",  // Packed bubble doesn't use X-axis but needs the property
    tooltip: { ...defaultTooltipSettings },
    useCustomColors: defaultCustomColorSettings.useCustomColors,
    customColors: [...defaultCustomColorSettings.customColors],
    bubble: {
        minBubbleSize: 15,
        maxBubbleSize: 60,
        showLabels: true,
        clusterByCategory: true,
        labelSizeMode: "auto",
        labelFontSize: 12,
        minLabelFontSize: 8,
        maxLabelFontSize: 16
    },
    textSizes: {
        legendFontSize: 0,
        panelTitleFontSize: 0
    },
    smallMultiples: { ...defaultSmallMultiplesSettings }
};

export function parseSettings(dataView: DataView): IBubbleVisualSettings {
    const objects = dataView?.metadata?.objects;
    const settings: IBubbleVisualSettings = JSON.parse(JSON.stringify(defaultSettings));

    if (!objects) {
        return settings;
    }

    // Color scheme
    const colorSchemeObj = objects["colorScheme"];
    if (colorSchemeObj) {
        settings.colorScheme = (colorSchemeObj["scheme"] as ColorScheme) ?? defaultSettings.colorScheme;
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

    // Bubble settings
    const bubbleObj = objects["bubbleSettings"];
    if (bubbleObj) {
        settings.bubble.minBubbleSize = (bubbleObj["minBubbleSize"] as number) ?? defaultSettings.bubble.minBubbleSize;
        settings.bubble.maxBubbleSize = (bubbleObj["maxBubbleSize"] as number) ?? defaultSettings.bubble.maxBubbleSize;
        settings.bubble.showLabels = (bubbleObj["showLabels"] as boolean) ?? defaultSettings.bubble.showLabels;
        settings.bubble.clusterByCategory = (bubbleObj["clusterByCategory"] as boolean) ?? defaultSettings.bubble.clusterByCategory;
        settings.bubble.labelSizeMode = (bubbleObj["labelSizeMode"] as "auto" | "fixed") ?? defaultSettings.bubble.labelSizeMode;
        settings.bubble.labelFontSize = (bubbleObj["labelFontSize"] as number) ?? defaultSettings.bubble.labelFontSize;
        settings.bubble.minLabelFontSize = (bubbleObj["minLabelFontSize"] as number) ?? defaultSettings.bubble.minLabelFontSize;
        settings.bubble.maxLabelFontSize = (bubbleObj["maxLabelFontSize"] as number) ?? defaultSettings.bubble.maxLabelFontSize;
        // Clamp values
        settings.bubble.minBubbleSize = Math.max(10, Math.min(30, settings.bubble.minBubbleSize));
        settings.bubble.maxBubbleSize = Math.max(40, Math.min(100, settings.bubble.maxBubbleSize));
        settings.bubble.labelFontSize = Math.max(6, Math.min(24, settings.bubble.labelFontSize));
        settings.bubble.minLabelFontSize = Math.max(6, Math.min(14, settings.bubble.minLabelFontSize));
        settings.bubble.maxLabelFontSize = Math.max(10, Math.min(24, settings.bubble.maxLabelFontSize));
    }

    // Text Sizes settings
    const textSizesObj = objects["textSizes"];
    if (textSizesObj) {
        settings.textSizes.legendFontSize = (textSizesObj["legendFontSize"] as number) ?? defaultSettings.textSizes.legendFontSize;
        settings.textSizes.panelTitleFontSize = (textSizesObj["panelTitleFontSize"] as number) ?? defaultSettings.textSizes.panelTitleFontSize;
        // Clamp values (0 = auto, otherwise 6-40)
        const clampFontSize = (v: number): number => {
            const n = Number(v);
            if (!Number.isFinite(n) || n <= 0) return 0;
            return Math.max(6, Math.min(40, n));
        };
        settings.textSizes.legendFontSize = clampFontSize(settings.textSizes.legendFontSize);
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
