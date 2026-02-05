"use strict";

import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ITooltipService = powerbi.extensibility.ITooltipService;

import {
    d3,
    RenderContext,
    createLegendCard,
    createSmallMultiplesCard,
    createTextSizesCard,
    createTooltipCard,
    createXAxisCard,
    createYAxisCard,
    renderEmptyState,
    HtmlTooltip
} from "@pbi-visuals/shared";
import { IBollingerVisualSettings, parseSettings } from "./settings";
import { BollingerTransformer } from "./BollingerTransformer";
import { BollingerRenderer } from "./BollingerRenderer";

function createBollingerSettingsCard(settings: IBollingerVisualSettings["bollinger"]): powerbi.visuals.FormattingCard {
    return {
        displayName: "Bollinger Bands",
        uid: "bollinger_card",
        groups: [
            {
                displayName: "Calculation",
                uid: "bollinger_calc_group",
                slices: [
                    {
                        uid: "bollinger_period",
                        displayName: "Period (N)",
                        control: {
                            type: powerbi.visuals.FormattingComponent.NumUpDown,
                            properties: {
                                descriptor: { objectName: "bollingerSettings", propertyName: "period" },
                                value: settings.period
                            }
                        }
                    } as powerbi.visuals.FormattingSlice,
                    {
                        uid: "bollinger_stdDeviation",
                        displayName: "Std Deviations (K)",
                        control: {
                            type: powerbi.visuals.FormattingComponent.NumUpDown,
                            properties: {
                                descriptor: { objectName: "bollingerSettings", propertyName: "stdDeviation" },
                                value: settings.stdDeviation
                            }
                        }
                    } as powerbi.visuals.FormattingSlice
                ]
            },
            {
                displayName: "Display",
                uid: "bollinger_display_group",
                slices: [
                    {
                        uid: "bollinger_showPriceLine",
                        displayName: "Show Price Line",
                        control: {
                            type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                            properties: {
                                descriptor: { objectName: "bollingerSettings", propertyName: "showPriceLine" },
                                value: settings.showPriceLine
                            }
                        }
                    } as powerbi.visuals.FormattingSlice,
                    {
                        uid: "bollinger_showMiddleBand",
                        displayName: "Show Middle Band (SMA)",
                        control: {
                            type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                            properties: {
                                descriptor: { objectName: "bollingerSettings", propertyName: "showMiddleBand" },
                                value: settings.showMiddleBand
                            }
                        }
                    } as powerbi.visuals.FormattingSlice,
                    {
                        uid: "bollinger_showBands",
                        displayName: "Show Upper/Lower Bands",
                        control: {
                            type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                            properties: {
                                descriptor: { objectName: "bollingerSettings", propertyName: "showBands" },
                                value: settings.showBands
                            }
                        }
                    } as powerbi.visuals.FormattingSlice,
                    {
                        uid: "bollinger_showBandFill",
                        displayName: "Show Band Fill",
                        control: {
                            type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                            properties: {
                                descriptor: { objectName: "bollingerSettings", propertyName: "showBandFill" },
                                value: settings.showBandFill
                            }
                        }
                    } as powerbi.visuals.FormattingSlice
                ]
            }
        ]
    };
}

export class Visual implements IVisual {
    private static instanceCounter: number = 0;
    private target: HTMLElement;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private container: d3.Selection<SVGGElement, unknown, null, undefined>;
    private host: IVisualHost;
    private tooltipService: ITooltipService;
    private settings: IBollingerVisualSettings | null = null;
    private renderer: BollingerRenderer | null = null;
    private htmlTooltip: HtmlTooltip | null = null;
    private tooltipOwnerId: string;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.target = options.element;
        this.tooltipService = this.host.tooltipService;
        this.tooltipOwnerId = `bta-bollinger-${Visual.instanceCounter++}`;

        this.svg = d3.select(this.target)
            .append("svg")
            .classed("pbi-visual", true)
            .classed("bollinger-visual", true);

        this.svg
            .style("position", "absolute")
            .style("inset", "0");

        this.container = this.svg.append("g")
            .classed("chart-container", true);
    }

    public update(options: VisualUpdateOptions) {
        this.svg.selectAll("*").remove();
        this.container = this.svg.append("g").classed("chart-container", true);
        this.htmlTooltip?.hide();

        const width = options.viewport.width;
        const height = options.viewport.height;

        this.svg.attr("width", width).attr("height", height).attr("viewBox", `0 0 ${width} ${height}`);

        // Hide tooltip when mouse leaves the chart entirely
        this.svg.on("mouseleave", () => {
            this.htmlTooltip?.hide();
            this.host.tooltipService.hide({ immediately: true, isTouchEvent: false });
        });

        if (!options.dataViews || !options.dataViews[0] || !options.dataViews[0].categorical) {
            this.renderNoData(width, height);
            return;
        }

        const dataView = options.dataViews[0];
        this.settings = parseSettings(dataView);
        this.syncHtmlTooltip();

        const context: RenderContext = {
            svg: this.svg,
            container: this.container,
            tooltipService: this.tooltipService,
            root: this.target,
            width,
            height,
            htmlTooltip: this.htmlTooltip
        };

        this.renderer = new BollingerRenderer(context);
        const chartData = BollingerTransformer.transform(
            dataView.categorical,
            this.settings.bollinger.period,
            this.settings.bollinger.stdDeviation
        );

        if (!chartData.dataPoints || chartData.dataPoints.length === 0) {
            this.renderNoData(width, height);
            return;
        }

        this.renderer.render(chartData, this.settings);
    }

    private renderNoData(width: number, height: number): void {
        renderEmptyState(this.container, width, height, {
            title: "Set up Bollinger Bands",
            lines: [
                "Date/Time: Date field for X-axis",
                "Legend (optional): Split into series",
                "Value: Numeric measure (e.g., closing price)",
                "Group (optional): Split into panels"
            ],
            hint: "Tip: Adjust Period (N) and Std Deviations (K) in the Format pane."
        });
    }

    private syncHtmlTooltip(): void {
        const tooltip = this.settings?.tooltip;
        const shouldUseCustom = !!(tooltip?.enabled && tooltip.style === "custom" && typeof document !== "undefined");

        if (!shouldUseCustom) {
            if (this.htmlTooltip) {
                this.htmlTooltip.destroy();
                this.htmlTooltip = null;
            }
            return;
        }

        if (!this.htmlTooltip) {
            this.htmlTooltip = new HtmlTooltip(this.target, tooltip!, this.tooltipOwnerId);
        } else {
            this.htmlTooltip.updateSettings(tooltip!);
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        const cards: powerbi.visuals.FormattingCard[] = [];

        if (!this.settings) {
            return { cards };
        }

        cards.push(createBollingerSettingsCard(this.settings.bollinger));

        cards.push(createTooltipCard(this.settings.tooltip));

        cards.push(createLegendCard({
            position: this.settings.legendPosition,
            fontSize: this.settings.legendFontSize,
            maxItems: this.settings.maxLegendItems
        }));

        cards.push(createYAxisCard({
            show: this.settings.showYAxis,
            fontSize: this.settings.yAxisFontSize,
            fontFamily: this.settings.yAxisFontFamily,
            bold: this.settings.yAxisBold,
            italic: this.settings.yAxisItalic,
            underline: this.settings.yAxisUnderline,
            color: this.settings.yAxisColor
        }));

        cards.push(createXAxisCard({
            show: this.settings.showXAxis,
            fontSize: this.settings.xAxisFontSize,
            rotateLabels: this.settings.rotateXLabels,
            fontFamily: this.settings.xAxisFontFamily,
            bold: this.settings.xAxisBold,
            italic: this.settings.xAxisItalic,
            underline: this.settings.xAxisUnderline,
            color: this.settings.xAxisColor
        }));

        cards.push(createTextSizesCard({
            xAxisFontSize: this.settings.textSizes.xAxisFontSize || this.settings.xAxisFontSize,
            yAxisFontSize: this.settings.textSizes.yAxisFontSize || this.settings.yAxisFontSize,
            legendFontSize: this.settings.textSizes.legendFontSize || this.settings.legendFontSize,
            panelTitleFontSize: this.settings.textSizes.panelTitleFontSize || this.settings.smallMultiples.titleFontSize
        }));

        cards.push(createSmallMultiplesCard({
            spacing: this.settings.smallMultiples.spacing,
            showTitle: this.settings.smallMultiples.showTitle,
            titleSpacing: this.settings.smallMultiples.titleSpacing
        }));

        return { cards };
    }

    public destroy(): void {
        try {
            this.htmlTooltip?.destroy();
            this.htmlTooltip = null;
            this.target.querySelectorAll('[data-bta-tooltip="true"]').forEach(el => el.remove());
        } catch {
            // ignore
        }
        try {
            this.svg?.remove();
        } catch {
            // ignore
        }
        this.renderer = null;
        this.settings = null;
    }
}
