"use strict";

import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;
import {
    IBaseVisualSettings,
    ColorScheme,
    LegendPosition,
    RotateLabelsMode,
    colorSchemes,
    defaultSmallMultiplesSettings,
    defaultLegendSettings,
    defaultCustomColorSettings,
    defaultFontScaleFactor,
    defaultTooltipSettings,
    TooltipStyle,
    TooltipTheme
} from "@pbi-visuals/shared";

export interface IHeatmapSettings {
    cellPadding: number;
    showValues: boolean;
    minColor: string;
    maxColor: string;
    horizontalAlignment: "left" | "center" | "right";  // NEW
    verticalAlignment: "top" | "center" | "bottom";    // NEW
    marginTop: number;     // NEW
    marginBottom: number;  // NEW
    marginLeft: number;    // NEW
    marginRight: number;   // NEW
}

export interface IHeatmapTextSizeSettings {
    xAxisFontSize: number;      // 0 = auto, 8-32 = manual
    yAxisFontSize: number;      // 0 = auto, 8-32 = manual
    legendFontSize: number;     // 0 = auto, 8-32 = manual
    panelTitleFontSize: number; // 0 = auto, 8-32 = manual
    valueLabelFontSize: number; // 0 = auto, 8-32 = manual (cell values)
}

export interface IHeatmapVisualSettings extends IBaseVisualSettings {
    heatmap: IHeatmapSettings;
    textSizes: IHeatmapTextSizeSettings;
}

export const defaultSettings: IHeatmapVisualSettings = {
    colorScheme: "blues",
    showLegend: true,
    legendPosition: "right",
    legendFontSize: defaultLegendSettings.legendFontSize!,
    maxLegendItems: defaultLegendSettings.maxLegendItems!,
    showXAxis: true,
    xAxisFontSize: 10,
    showYAxis: true,
    yAxisFontSize: 11,
    rotateXLabels: "auto",
    responsiveText: true,
    fontScaleFactor: defaultFontScaleFactor,
    tooltip: { ...defaultTooltipSettings },
    useCustomColors: defaultCustomColorSettings.useCustomColors,
    customColors: [...defaultCustomColorSettings.customColors],
    heatmap: {
        cellPadding: 2,
        showValues: true,
        minColor: "#f7fbff",
        maxColor: "#08519c",
        horizontalAlignment: "left",
        verticalAlignment: "top",
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0
    },
    textSizes: {
        xAxisFontSize: 0,
        yAxisFontSize: 0,
        legendFontSize: 0,
        panelTitleFontSize: 0,
        valueLabelFontSize: 0
    },
    smallMultiples: { ...defaultSmallMultiplesSettings }
};

export function parseSettings(dataView: DataView): IHeatmapVisualSettings {
    const objects = dataView?.metadata?.objects;
    const settings: IHeatmapVisualSettings = JSON.parse(JSON.stringify(defaultSettings));

    if (!objects) {
        return settings;
    }

    // Color scheme
    const colorSchemeObj = objects["colorScheme"];
    if (colorSchemeObj) {
        settings.colorScheme = (colorSchemeObj["scheme"] as ColorScheme) ?? defaultSettings.colorScheme;
        const scheme = colorSchemes[settings.colorScheme];
        if (scheme) {
            settings.heatmap.minColor = scheme.min;
            settings.heatmap.maxColor = scheme.max;
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

    // X-Axis settings
    const xAxisObj = objects["xAxisSettings"];
    if (xAxisObj) {
        settings.showXAxis = (xAxisObj["show"] as boolean) ?? defaultSettings.showXAxis;
        settings.xAxisFontSize = (xAxisObj["fontSize"] as number) ?? defaultSettings.xAxisFontSize;
        settings.rotateXLabels = (xAxisObj["rotateLabels"] as RotateLabelsMode) ?? defaultSettings.rotateXLabels;
    }

    // Y-Axis settings
    const yAxisObj = objects["yAxisSettings"];
    if (yAxisObj) {
        settings.showYAxis = (yAxisObj["show"] as boolean) ?? defaultSettings.showYAxis;
        settings.yAxisFontSize = (yAxisObj["fontSize"] as number) ?? defaultSettings.yAxisFontSize;
    }

    // Text Sizes settings
    const textSizesObj = objects["textSizes"];
    if (textSizesObj) {
        settings.textSizes.xAxisFontSize = (textSizesObj["xAxisFontSize"] as number) ?? defaultSettings.textSizes.xAxisFontSize;
        settings.textSizes.yAxisFontSize = (textSizesObj["yAxisFontSize"] as number) ?? defaultSettings.textSizes.yAxisFontSize;
        settings.textSizes.legendFontSize = (textSizesObj["legendFontSize"] as number) ?? defaultSettings.textSizes.legendFontSize;
        settings.textSizes.panelTitleFontSize = (textSizesObj["panelTitleFontSize"] as number) ?? defaultSettings.textSizes.panelTitleFontSize;
        settings.textSizes.valueLabelFontSize = (textSizesObj["valueLabelFontSize"] as number) ?? defaultSettings.textSizes.valueLabelFontSize;
        // Clamp values (0 = auto, 8-32 = manual)
        settings.textSizes.xAxisFontSize = settings.textSizes.xAxisFontSize === 0 ? 0 : Math.max(8, Math.min(32, settings.textSizes.xAxisFontSize));
        settings.textSizes.yAxisFontSize = settings.textSizes.yAxisFontSize === 0 ? 0 : Math.max(8, Math.min(32, settings.textSizes.yAxisFontSize));
        settings.textSizes.legendFontSize = settings.textSizes.legendFontSize === 0 ? 0 : Math.max(8, Math.min(32, settings.textSizes.legendFontSize));
        settings.textSizes.panelTitleFontSize = settings.textSizes.panelTitleFontSize === 0 ? 0 : Math.max(8, Math.min(32, settings.textSizes.panelTitleFontSize));
        settings.textSizes.valueLabelFontSize = settings.textSizes.valueLabelFontSize === 0 ? 0 : Math.max(8, Math.min(32, settings.textSizes.valueLabelFontSize));
    }

    // Heatmap settings
    const heatmapObj = objects["heatmapSettings"];
    if (heatmapObj) {
        settings.heatmap.cellPadding = (heatmapObj["cellPadding"] as number) ?? defaultSettings.heatmap.cellPadding;
        settings.heatmap.showValues = (heatmapObj["showValues"] as boolean) ?? defaultSettings.heatmap.showValues;

        const minColorObj = heatmapObj["minColor"] as any;
        const maxColorObj = heatmapObj["maxColor"] as any;
        if (minColorObj?.solid?.color) {
            settings.heatmap.minColor = minColorObj.solid.color;
        }
        if (maxColorObj?.solid?.color) {
            settings.heatmap.maxColor = maxColorObj.solid.color;
        }

        // Alignment settings
        settings.heatmap.horizontalAlignment = (heatmapObj["horizontalAlignment"] as "left" | "center" | "right") ?? defaultSettings.heatmap.horizontalAlignment;
        settings.heatmap.verticalAlignment = (heatmapObj["verticalAlignment"] as "top" | "center" | "bottom") ?? defaultSettings.heatmap.verticalAlignment;

        // Margin settings
        settings.heatmap.marginTop = (heatmapObj["marginTop"] as number) ?? defaultSettings.heatmap.marginTop;
        settings.heatmap.marginBottom = (heatmapObj["marginBottom"] as number) ?? defaultSettings.heatmap.marginBottom;
        settings.heatmap.marginLeft = (heatmapObj["marginLeft"] as number) ?? defaultSettings.heatmap.marginLeft;
        settings.heatmap.marginRight = (heatmapObj["marginRight"] as number) ?? defaultSettings.heatmap.marginRight;

        // Clamp margin values
        settings.heatmap.marginTop = Math.max(0, Math.min(100, settings.heatmap.marginTop));
        settings.heatmap.marginBottom = Math.max(0, Math.min(100, settings.heatmap.marginBottom));
        settings.heatmap.marginLeft = Math.max(0, Math.min(100, settings.heatmap.marginLeft));
        settings.heatmap.marginRight = Math.max(0, Math.min(100, settings.heatmap.marginRight));
    }

    // Small Multiples settings
    const smallMultObj = objects["smallMultiples"];
    if (smallMultObj) {
        settings.smallMultiples.columns = (smallMultObj["columns"] as number) ?? defaultSettings.smallMultiples.columns;
        settings.smallMultiples.spacing = (smallMultObj["spacing"] as number) ?? defaultSettings.smallMultiples.spacing;
        settings.smallMultiples.showTitle = (smallMultObj["showTitle"] as boolean) ?? defaultSettings.smallMultiples.showTitle;
        settings.smallMultiples.titleFontSize = (smallMultObj["titleFontSize"] as number) ?? defaultSettings.smallMultiples.titleFontSize;
        settings.smallMultiples.titleSpacing = (smallMultObj["titleSpacing"] as number) ?? defaultSettings.smallMultiples.titleSpacing;
        // Clamp values
        settings.smallMultiples.columns = Math.max(1, Math.min(6, settings.smallMultiples.columns));
        settings.smallMultiples.spacing = Math.max(10, Math.min(50, settings.smallMultiples.spacing));
        settings.smallMultiples.titleSpacing = Math.max(10, Math.min(50, settings.smallMultiples.titleSpacing));
    }

    return settings;
}
