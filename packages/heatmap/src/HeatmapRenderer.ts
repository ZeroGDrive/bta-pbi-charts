"use strict";

import * as d3 from "d3";
import { BaseRenderer, RenderContext, ChartData, calculateLabelRotation, formatLabel, measureMaxLabelWidth } from "@pbi-visuals/shared";
import { IHeatmapVisualSettings } from "./settings";

export class HeatmapRenderer extends BaseRenderer<IHeatmapVisualSettings> {
    constructor(context: RenderContext) {
        super(context);
    }

    public render(data: ChartData, settings: IHeatmapVisualSettings): void {
        this.settings = settings;

        if (data.dataPoints.length === 0) {
            this.renderNoData();
            return;
        }

        const { dataPoints, xValues, groups, maxValue } = data;

        // Measure Y-axis label width so we don't waste space when labels are short
        const yAxisFontSizeForMargin = this.getEffectiveFontSize(
            settings.textSizes.yAxisFontSize,
            settings.yAxisFontSize,
            8, 18
        );
        const yAxisLabelWidth = settings.showYAxis
            ? measureMaxLabelWidth(data.yValues, yAxisFontSizeForMargin)
            : 0;
        const yAxisLeftSpace = settings.showYAxis ? Math.ceil(yAxisLabelWidth + 20) : 10;

        const legendNeedsBottomSpace = settings.showLegend && settings.legendPosition === "bottom";

        const topLegendPadding = settings.showLegend && settings.legendPosition !== "bottom" ? 36 : 0;

        const margin = {
            top: 40 + topLegendPadding + settings.heatmap.marginTop,
            right: 20 + settings.heatmap.marginRight,
            bottom: (settings.showXAxis ? 80 : (legendNeedsBottomSpace ? 60 : 20)) + settings.heatmap.marginBottom,
            left: (yAxisLeftSpace) + settings.heatmap.marginLeft
        };

        const chartWidth = this.context.width - margin.left - margin.right;
        const groupCount = groups.length;
        const totalSpacing = (groupCount - 1) * settings.smallMultiples.spacing;
        const availableHeight = this.context.height - margin.top - margin.bottom - totalSpacing;

        // Use custom min/max colors from settings
        const colorScale = d3.scaleSequential()
            .domain([0, maxValue])
            .interpolator(d3.interpolate(settings.heatmap.minColor, settings.heatmap.maxColor));

        let currentY = margin.top;

        groups.forEach((groupName, groupIndex) => {
            const groupData = dataPoints.filter(d => d.groupValue === groupName);
            const groupYValues = [...new Set(groupData.map(d => d.yValue))].sort();
            const groupHeight = availableHeight / groupCount;

            const cellHeight = Math.max(20, (groupHeight - 30) / groupYValues.length - settings.heatmap.cellPadding);
            const cellWidth = Math.max(30, chartWidth / xValues.length - settings.heatmap.cellPadding);

            // Calculate chart actual dimensions for alignment
            const chartActualWidth = xValues.length * (cellWidth + settings.heatmap.cellPadding);
            const chartActualHeight = groupYValues.length * (cellHeight + settings.heatmap.cellPadding);

            // Compute horizontal offset based on alignment setting
            let offsetX = 0;
            if (settings.heatmap.horizontalAlignment === "center") {
                offsetX = Math.max(0, (chartWidth - chartActualWidth) / 2);
            } else if (settings.heatmap.horizontalAlignment === "right") {
                offsetX = Math.max(0, chartWidth - chartActualWidth);
            }

            // Compute vertical offset based on alignment setting
            let offsetY = 0;
            if (settings.heatmap.verticalAlignment === "center") {
                offsetY = Math.max(0, (groupHeight - chartActualHeight) / 2);
            } else if (settings.heatmap.verticalAlignment === "bottom") {
                offsetY = Math.max(0, groupHeight - chartActualHeight);
            }

            const panelGroup = this.context.container.append("g")
                .attr("class", "panel")
                .attr("transform", `translate(${Math.round(margin.left + offsetX)}, ${Math.round(currentY + offsetY)})`);

            // Group title with configurable spacing
            if (settings.smallMultiples.showTitle && groupName !== "All") {
                const titleSpacing = settings.smallMultiples.titleSpacing || 25;
                const titleFontSize = this.getEffectiveFontSize(
                    settings.textSizes.panelTitleFontSize,
                    settings.smallMultiples.titleFontSize,
                    10, 24
                );
                const displayTitle = formatLabel(groupName, chartWidth, titleFontSize);
                const title = panelGroup.append("text")
                    .attr("class", "panel-title")
                    .attr("x", 0)
                    .attr("y", -Math.round(titleSpacing))
                    .attr("font-size", `${titleFontSize}px`)
                    .attr("font-weight", "600")
                    .attr("fill", "#333")
                    .text(displayTitle);

                if (displayTitle !== groupName) {
                    this.addTooltip(title as any, [{ displayName: "Group", value: groupName }]);
                }
            }

            // Scales
            const yScale = d3.scaleBand<string>()
                .domain(groupYValues)
                .range([0, groupYValues.length * (cellHeight + settings.heatmap.cellPadding)])
                .padding(0.05);

            const xScale = d3.scaleBand<string>()
                .domain(xValues)
                .range([0, xValues.length * (cellWidth + settings.heatmap.cellPadding)])
                .padding(0.05);

            // Data lookup
            const dataLookup = new Map<string, typeof dataPoints[0]>();
            groupData.forEach(d => {
                dataLookup.set(`${d.xValue}|${d.yValue}`, d);
            });

            // Draw cells
            groupYValues.forEach(yVal => {
                xValues.forEach(xVal => {
                    const key = `${xVal}|${yVal}`;
                    const dataPoint = dataLookup.get(key);
                    const value = dataPoint?.value ?? 0;

                    const x = xScale(xVal) ?? 0;
                    const y = yScale(yVal) ?? 0;

                    const cell = panelGroup.append("rect")
                        .attr("class", "heatmap-cell")
                        .attr("x", x)
                        .attr("y", y)
                        .attr("width", xScale.bandwidth())
                        .attr("height", yScale.bandwidth())
                        .attr("rx", 3)
                        .attr("ry", 3)
                        .attr("fill", value === 0 ? "#f0f0f0" : colorScale(value))
                        .attr("stroke", "#fff")
                        .attr("stroke-width", 1);

                    // Add hover effect using border instead of filter
                    cell
                        .on("mouseenter", function() {
                            d3.select(this)
                                .attr("stroke", "#333")
                                .attr("stroke-width", 2);
                        })
                        .on("mouseleave", function() {
                            d3.select(this)
                                .attr("stroke", "#fff")
                                .attr("stroke-width", 1);
                        });

                    // Add tooltip
                    this.addTooltip(cell as any, [
                        { displayName: "Category", value: yVal },
                        { displayName: "Period", value: xVal },
                        { displayName: "Value", value: value.toString() },
                        ...(groupName !== "All" ? [{ displayName: "Group", value: groupName }] : [])
                    ]);

                    // Value label - use manual override or proportional sizing
                    if (settings.heatmap.showValues && value > 0) {
                        const textColor = this.getContrastColor(colorScale(value) as string);
                        // Use manual override or scale font size based on cell dimensions
                        const cellFontSize = settings.textSizes.valueLabelFontSize > 0
                            ? settings.textSizes.valueLabelFontSize
                            : this.getProportionalFontSize(
                                Math.min(xScale.bandwidth(), yScale.bandwidth()),
                                0.4,
                                8,
                                16
                            );

                        panelGroup.append("text")
                            .attr("class", "cell-value")
                            .attr("x", Math.round(x + xScale.bandwidth() / 2))
                            .attr("y", Math.round(y + yScale.bandwidth() / 2))
                            .attr("dy", "0.35em")
                            .attr("text-anchor", "middle")
                            .attr("font-size", `${cellFontSize}px`)
                            .attr("font-weight", "600")
                            .attr("fill", textColor)
                            .attr("pointer-events", "none")
                            .text(value);
                    }
                });
            });

            // Y-axis labels with manual override or responsive font size
            if (settings.showYAxis) {
                const yAxisFontSize = this.getEffectiveFontSize(
                    settings.textSizes.yAxisFontSize,
                    settings.yAxisFontSize,
                    8, 18
                );
                groupYValues.forEach(yVal => {
                    const y = Math.round((yScale(yVal) ?? 0) + yScale.bandwidth() / 2);
                    const maxLabelWidth = Math.max(0, margin.left + offsetX - 18);
                    const displayLabel = formatLabel(yVal, maxLabelWidth, yAxisFontSize);

                    const label = panelGroup.append("text")
                        .attr("class", "y-axis-label")
                        .attr("x", -8)
                        .attr("y", y)
                        .attr("dy", "0.35em")
                        .attr("text-anchor", "end")
                        .attr("font-size", `${yAxisFontSize}px`)
                        .attr("fill", "#333")
                        .text(displayLabel);

                    if (displayLabel !== yVal) {
                        this.addTooltip(label as any, [{ displayName: "Category", value: yVal }]);
                    }
                });
            }

            // X-axis labels (only on last group) with smart rotation
            if (settings.showXAxis && groupIndex === groups.length - 1) {
                const xAxisY = Math.round(groupYValues.length * (cellHeight + settings.heatmap.cellPadding) + 10);
                const xAxisFontSize = this.getEffectiveFontSize(
                    settings.textSizes.xAxisFontSize,
                    settings.xAxisFontSize,
                    8, 18
                );

                // Smart rotation detection
                const rotationResult = calculateLabelRotation({
                    mode: settings.rotateXLabels,
                    labels: xValues,
                    availableWidth: chartWidth,
                    fontSize: xAxisFontSize
                });
                const shouldRotate = rotationResult.shouldRotate;
                const skipInterval = rotationResult.skipInterval;

                xValues.forEach((xVal, i) => {
                    // Skip labels based on calculated interval
                    if (skipInterval > 1 && i % skipInterval !== 0 && i !== xValues.length - 1) {
                        return;
                    }

                    const x = Math.round((xScale(xVal) ?? 0) + xScale.bandwidth() / 2);
                    const spacePerLabel = chartWidth / Math.max(1, Math.ceil(xValues.length / Math.max(1, skipInterval)));
                    const displayText = formatLabel(xVal, Math.max(0, spacePerLabel - 6), xAxisFontSize);

                    const text = panelGroup.append("text")
                        .attr("class", "x-axis-label")
                        .attr("x", x)
                        .attr("y", xAxisY)
                        .attr("dy", "0.5em")
                        .attr("font-size", `${xAxisFontSize}px`)
                        .attr("fill", "#666")
                        .text(displayText);

                    if (displayText !== xVal) {
                        this.addTooltip(text as any, [{ displayName: "X", value: xVal }]);
                    }

                    if (shouldRotate) {
                        text
                            .attr("transform", `rotate(-45, ${x}, ${xAxisY})`)
                            .attr("text-anchor", "end");
                    } else {
                        text.attr("text-anchor", "middle");
                    }
                });
            }

            currentY += groupHeight + settings.smallMultiples.spacing;
        });

        // Color legend with custom gradient colors
        this.renderLegend(colorScale, maxValue, false, undefined, undefined, {
            min: settings.heatmap.minColor,
            max: settings.heatmap.maxColor
        });
    }
}
