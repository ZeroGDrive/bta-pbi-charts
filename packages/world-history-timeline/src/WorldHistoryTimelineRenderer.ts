"use strict";

import {
    d3,
    BaseRenderer,
    ChartData,
    RenderContext,
    formatLabel,
    formatMeasureValue
} from "@pbi-visuals/shared";
import { IWorldHistoryTimelineVisualSettings } from "./settings";
import { WorldHistoryTimelineData, WorldHistoryTimelinePoint } from "./WorldHistoryTimelineTransformer";

interface TimelineRow {
    key: string;
    point: WorldHistoryTimelinePoint;
}

export class WorldHistoryTimelineRenderer extends BaseRenderer<IWorldHistoryTimelineVisualSettings> {
    constructor(context: RenderContext) {
        super(context);
    }

    public render(data: ChartData, settings: IWorldHistoryTimelineVisualSettings): void {
        this.settings = settings;
        const timelineData = data as WorldHistoryTimelineData;

        if (!timelineData.items.length) {
            this.renderNoData();
            return;
        }

        const axisFontSize = this.getEffectiveFontSize(
            settings.textSizes.xAxisFontSize > 0 ? settings.textSizes.xAxisFontSize : settings.xAxisFontSize,
            6,
            40
        );
        const laneFontSize = this.getEffectiveFontSize(
            settings.textSizes.yAxisFontSize > 0 ? settings.textSizes.yAxisFontSize : settings.yAxisFontSize,
            6,
            40
        );
        const labelFontSize = this.getEffectiveFontSize(
            settings.textSizes.endLabelFontSize > 0 ? settings.textSizes.endLabelFontSize : settings.yAxisFontSize,
            6,
            40
        );
        const legendFontSize = this.getEffectiveFontSize(
            settings.textSizes.legendFontSize > 0 ? settings.textSizes.legendFontSize : settings.legendFontSize,
            6,
            40
        );
        const legendAvailableWidth = Math.max(120, (this.context.root?.clientWidth || this.context.width) - 16);
        const legendAvailableHeight = Math.max(80, (this.context.root?.clientHeight || this.context.height) - 16);

        const hasLegend = settings.showLegend && timelineData.hasRegionRoleData && timelineData.regions.length > 0;
        const legendReserve = hasLegend
            ? this.getLegendReservation({
                isOrdinal: true,
                categories: timelineData.regions,
                legendFontSize,
                availableWidth: legendAvailableWidth,
                availableHeight: legendAvailableHeight
            })
            : { top: 0, right: 0, bottom: 0, left: 0 };

        const sortedItems = [...timelineData.items].sort((a, b) => {
            const timeCompare = (): number => {
                const startCmp = a.startYear - b.startYear;
                if (startCmp !== 0) return startCmp;
                return a.endYear - b.endYear;
            };

            switch (settings.timeline.sortBy) {
                case "region": {
                    const regionCmp = a.region.localeCompare(b.region);
                    if (regionCmp !== 0) return regionCmp;
                    break;
                }
                case "category": {
                    const categoryCmp = a.civilization.localeCompare(b.civilization);
                    if (categoryCmp !== 0) return categoryCmp;
                    break;
                }
                case "end": {
                    const endCmp = a.endYear - b.endYear;
                    if (endCmp !== 0) return endCmp;
                    break;
                }
                case "duration": {
                    const durationCmp = b.duration - a.duration;
                    if (durationCmp !== 0) return durationCmp;
                    break;
                }
                default:
                    break;
            }

            return timeCompare();
        });

        const rows: TimelineRow[] = sortedItems.map((point, idx) => ({
            key: `${point.civilization}\u001f${idx}`,
            point
        }));

        // Labels are rendered near bars, so keep the structural left gutter minimal.
        const leftLabelSpace = settings.showYAxis ? 18 : 10;

        const topAxisReserve = settings.showXAxis && settings.timeline.showTopAxis ? Math.round(axisFontSize + 18) : 0;
        const bottomAxisReserve = settings.showXAxis && settings.timeline.showBottomAxis ? Math.round(axisFontSize + 18) : 0;
        const sortControlReserve = Math.max(0, Number((settings.timeline as any).sortControlReservePx ?? 0));

        const margin = {
            top: 10 + legendReserve.top + topAxisReserve + sortControlReserve,
            right: 14 + legendReserve.right,
            bottom: 10 + legendReserve.bottom + bottomAxisReserve,
            left: leftLabelSpace + legendReserve.left
        };

        const chartWidth = this.context.width - margin.left - margin.right;
        const chartHeight = this.context.height - margin.top - margin.bottom;

        if (chartWidth <= 0 || chartHeight <= 0) {
            return;
        }

        let minYear = Math.min(timelineData.minYear, timelineData.maxYear);
        let maxYear = Math.max(timelineData.minYear, timelineData.maxYear);
        const isDateScale = timelineData.timeScaleMode === "date";
        if (minYear === maxYear) {
            const singlePointPadding = isDateScale ? 24 * 60 * 60 * 1000 : 1;
            minYear -= singlePointPadding;
            maxYear += singlePointPadding;
        }

        const xScale = d3.scaleLinear()
            .domain([minYear, maxYear])
            .range([0, chartWidth]);

        const yScale = d3.scalePoint<string>()
            .domain(rows.map((row) => row.key))
            .range([0, chartHeight])
            .padding(Math.max(0, Math.min(0.95, settings.timeline.lanePadding + 0.04)));
        const laneStep = rows.length > 1
            ? Math.abs((yScale(rows[1].key) ?? 0) - (yScale(rows[0].key) ?? 0))
            : chartHeight;
        const barHeight = Math.max(1, Math.min(16, laneStep * Math.max(0.2, (1 - settings.timeline.lanePadding)) * 0.82));

        const regionDomain = timelineData.regions.length ? timelineData.regions : ["World"];
        const colorScale = this.getCategoryColors(regionDomain, timelineData.categoryColorMap);

        const panel = this.context.container.append("g")
            .attr("class", "timeline-panel")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        const formatYear = (value: number): string => {
            const year = Math.round(value);
            return year < 0 ? `${Math.abs(year)} BC` : `${year}`;
        };
        const timeSpanMs = Math.max(1, maxYear - minYear);
        const axisDateFormatter = (() => {
            if (timeSpanMs >= 1000 * 60 * 60 * 24 * 365 * 25) {
                return new Intl.DateTimeFormat(undefined, { year: "numeric" });
            }
            if (timeSpanMs >= 1000 * 60 * 60 * 24 * 365 * 2) {
                return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });
            }
            return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
        })();
        const tooltipDateFormatter = new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
        const formatTimelineValue = (value: number): string => {
            if (!isDateScale) {
                return formatYear(value);
            }
            return axisDateFormatter.format(new Date(value));
        };
        const formatTooltipDateValue = (value: number): string => {
            if (!isDateScale) {
                return formatYear(value);
            }
            return tooltipDateFormatter.format(new Date(value));
        };
        const formatDuration = (duration: number): string => {
            if (!isDateScale) {
                return formatMeasureValue(duration);
            }

            const milliseconds = Math.max(0, duration);
            const day = 24 * 60 * 60 * 1000;
            const month = day * 30.4375;
            const year = day * 365.25;

            if (milliseconds >= year) {
                const years = milliseconds / year;
                return `${years.toLocaleString(undefined, { maximumFractionDigits: years >= 10 ? 0 : 1 })} years`;
            }
            if (milliseconds >= month) {
                const months = milliseconds / month;
                return `${months.toLocaleString(undefined, { maximumFractionDigits: months >= 10 ? 0 : 1 })} months`;
            }
            if (milliseconds >= day) {
                const days = Math.round(milliseconds / day);
                return `${days.toLocaleString()} days`;
            }

            const hours = milliseconds / (60 * 60 * 1000);
            if (hours >= 1) {
                return `${Math.round(hours).toLocaleString()} hours`;
            }

            const minutes = milliseconds / (60 * 1000);
            if (minutes >= 1) {
                return `${Math.round(minutes).toLocaleString()} minutes`;
            }

            return `${Math.round(milliseconds / 1000).toLocaleString()} seconds`;
        };

        const rawTicks = xScale.ticks(Math.max(2, Math.floor(chartWidth / 110)));
        const xTicks: number[] = [];
        const seenTicks = new Set<number>();
        const minTick = Math.floor(minYear);
        const maxTick = Math.ceil(maxYear);
        const pushTick = (value: number) => {
            const rounded = Math.round(value);
            if (rounded < minTick || rounded > maxTick || seenTicks.has(rounded)) {
                return;
            }
            seenTicks.add(rounded);
            xTicks.push(rounded);
        };
        pushTick(minYear);
        rawTicks.forEach(pushTick);
        pushTick(maxYear);
        xTicks.sort((a, b) => a - b);
        // Avoid overlapping end labels (e.g., "2000" and "2018" merging visually).
        const minTickGapPx = Math.max(42, Math.round(axisFontSize * 4.2));
        const filteredTicks: number[] = [];
        for (const tick of xTicks) {
            if (filteredTicks.length === 0) {
                filteredTicks.push(tick);
                continue;
            }
            const prev = filteredTicks[filteredTicks.length - 1];
            const gap = Math.abs(xScale(tick) - xScale(prev));
            if (gap >= minTickGapPx) {
                filteredTicks.push(tick);
            }
        }
        // Keep first and last ticks, but avoid crowding by replacing the previous one when needed.
        if (xTicks.length > 0 && filteredTicks[0] !== xTicks[0]) {
            filteredTicks.unshift(xTicks[0]);
        }
        if (xTicks.length > 1) {
            const lastTick = xTicks[xTicks.length - 1];
            const lastFiltered = filteredTicks[filteredTicks.length - 1];
            if (lastFiltered !== lastTick) {
                const gap = Math.abs(xScale(lastTick) - xScale(lastFiltered));
                if (gap < minTickGapPx && filteredTicks.length > 1) {
                    filteredTicks[filteredTicks.length - 1] = lastTick;
                } else {
                    filteredTicks.push(lastTick);
                }
            }
        }
        const xTicksToRender = filteredTicks;
        const axisStroke = this.isHighContrastMode() ? this.getThemeForeground("#111827") : "#d1d5db";
        const axisTextColor = this.isHighContrastMode() ? this.getThemeForeground(settings.xAxisColor) : settings.xAxisColor;

        let topAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
        if (settings.showXAxis && settings.timeline.showTopAxis) {
            const headerPadTop = Math.round(axisFontSize + 16);
            const headerPadBottom = 12;
            const headerHeight = headerPadTop + headerPadBottom;
            // Sticky behavior:
            // - initial (scrollTop=0): axis sits below top legend reservation
            // - after scrolling past that reservation: axis snaps to top edge
            const pinnedTopBaseY = -margin.top;
            const stickyOffset = Math.max(0, Math.round(legendReserve.top + sortControlReserve));
            const pinnedTopOffset = Math.max(0, Math.round(legendReserve.top + sortControlReserve));
            const axisBaselineY = Math.max(12, headerPadTop - 2);

            topAxisGroup = panel.append("g")
                .attr("class", "x-axis timeline-axis top pinned-top-axis")
                .attr("data-base-y", `${pinnedTopBaseY}`)
                .attr("data-sticky-offset", `${stickyOffset}`)
                .attr("data-pin-top", `${pinnedTopOffset}`)
                .attr("transform", `translate(0, ${Math.round(pinnedTopBaseY)})`);

            topAxisGroup.append("rect")
                .attr("class", "pinned-top-axis-bg")
                .attr("x", -2)
                .attr("y", 0)
                .attr("width", Math.max(0, chartWidth + 4))
                .attr("height", Math.max(0, headerHeight))
                .attr("fill", this.getThemeBackground("#ffffff"))
                .attr("pointer-events", "none");

            topAxisGroup.append("line")
                .attr("x1", 0)
                .attr("x2", chartWidth)
                .attr("y1", axisBaselineY)
                .attr("y2", axisBaselineY)
                .attr("stroke", axisStroke)
                .attr("stroke-width", 1);

            xTicksToRender.forEach((tick) => {
                const x = this.snapToPixelInt(xScale(tick));
                topAxisGroup.append("line")
                    .attr("x1", x)
                    .attr("x2", x)
                    .attr("y1", axisBaselineY)
                    .attr("y2", axisBaselineY - 5)
                    .attr("stroke", axisStroke)
                    .attr("stroke-width", 1);

                topAxisGroup.append("text")
                    .attr("x", x)
                    .attr("y", axisBaselineY - 8)
                    .attr("text-anchor", "middle")
                    .attr("font-size", `${axisFontSize}px`)
                    .attr("font-family", settings.xAxisFontFamily)
                    .style("font-weight", settings.xAxisBold ? "700" : "400")
                    .style("font-style", settings.xAxisItalic ? "italic" : "normal")
                    .style("text-decoration", settings.xAxisUnderline ? "underline" : "none")
                    .attr("fill", axisTextColor)
                    .text(formatTimelineValue(tick));
            });

            topAxisGroup.append("line")
                .attr("x1", 0)
                .attr("x2", chartWidth)
                .attr("y1", headerHeight - 1)
                .attr("y2", headerHeight - 1)
                .attr("stroke", this.getGridStroke("#e5e7eb"))
                .attr("stroke-width", 1)
                .attr("stroke-opacity", this.isHighContrastMode() ? 1 : 0.65);
        }

        if (settings.showXAxis && settings.timeline.showBottomAxis) {
            const bottomAxisGroup = panel.append("g")
                .attr("class", "x-axis timeline-axis bottom")
                .attr("transform", `translate(0, ${chartHeight})`);

            bottomAxisGroup.append("line")
                .attr("x1", 0)
                .attr("x2", chartWidth)
                .attr("y1", 0)
                .attr("y2", 0)
                .attr("stroke", axisStroke)
                .attr("stroke-width", 1);

            xTicksToRender.forEach((tick) => {
                const x = this.snapToPixelInt(xScale(tick));
                bottomAxisGroup.append("line")
                    .attr("x1", x)
                    .attr("x2", x)
                    .attr("y1", 0)
                    .attr("y2", 5)
                    .attr("stroke", axisStroke)
                    .attr("stroke-width", 1);

                bottomAxisGroup.append("text")
                    .attr("x", x)
                    .attr("y", 14)
                    .attr("text-anchor", "middle")
                    .attr("font-size", `${axisFontSize}px`)
                    .attr("font-family", settings.xAxisFontFamily)
                    .style("font-weight", settings.xAxisBold ? "700" : "400")
                    .style("font-style", settings.xAxisItalic ? "italic" : "normal")
                    .style("text-decoration", settings.xAxisUnderline ? "underline" : "none")
                    .attr("fill", axisTextColor)
                    .text(formatTimelineValue(tick));
            });
        }

        const rowLayer = panel.append("g").attr("class", "timeline-rows");

        rowLayer.selectAll("line.lane-line")
            .data(rows)
            .enter()
            .append("line")
            .attr("class", "lane-line")
            .attr("x1", 0)
            .attr("x2", chartWidth)
            .attr("y1", (row) => {
                const y = yScale(row.key) ?? 0;
                return this.snapToPixel(y);
            })
            .attr("y2", (row) => {
                const y = yScale(row.key) ?? 0;
                return this.snapToPixel(y);
            })
            .attr("stroke", this.getGridStroke("#e5e7eb"))
            .attr("stroke-width", 1)
            .attr("stroke-opacity", this.isHighContrastMode() ? 1 : 0.45);

        const rowGroups = rowLayer.selectAll("g.timeline-row")
            .data(rows)
            .enter()
            .append("g")
            .attr("class", "timeline-row");

        rowGroups.each((row, idx, nodes) => {
            const point = row.point;
            const yCenter = yScale(row.key) ?? 0;
            const barY = this.snapToPixelInt(yCenter - (barHeight / 2));

            const startX = xScale(point.startYear);
            const rawWidth = xScale(point.endYear) - startX;
            const barWidth = Math.max(settings.timeline.minBarWidth, rawWidth);

            const regionKey = timelineData.hasRegionRoleData ? point.region : "World";
            const fill = colorScale(regionKey);

            const rowGroup = d3.select(nodes[idx]);

            const bar = rowGroup.append("rect")
                .attr("class", "timeline-bar")
                .attr("data-selection-key", regionKey)
                .attr("x", this.snapToPixelInt(startX))
                .attr("y", barY)
                .attr("width", this.snapToPixelInt(barWidth))
                .attr("height", this.snapToPixelInt(barHeight))
                .attr("rx", settings.timeline.barCornerRadius)
                .attr("fill", fill)
                .attr("stroke", this.isHighContrastMode() ? this.getThemeForeground("#111827") : "#ffffff")
                .attr("stroke-width", this.isHighContrastMode() ? 1.5 : 1);

            const rows: Array<{ displayName: string; value: string; color?: string }> = [
                { displayName: "Region", value: point.region, color: fill },
                { displayName: "Start", value: formatTooltipDateValue(point.startYear) },
                { displayName: "End", value: formatTooltipDateValue(point.endYear) },
                { displayName: "Duration", value: formatDuration(point.duration) }
            ];

            this.addTooltip(bar as any, rows, {
                title: point.civilization,
                subtitle: `${formatTooltipDateValue(point.startYear)} to ${formatTooltipDateValue(point.endYear)}`,
                color: fill
            });

            if (settings.timeline.showLabels) {
                const leftSpace = Math.max(0, startX - 8);
                const rightSpace = Math.max(0, chartWidth - (startX + barWidth) - 8);
                const insideSpace = Math.max(0, barWidth - 8);
                const outsideMax = Math.max(leftSpace, rightSpace);

                let labelMode: "left" | "right" | "inside" | "skip" = "skip";
                if (outsideMax >= 28) {
                    labelMode = rightSpace >= leftSpace ? "right" : "left";
                } else if (insideSpace >= 28) {
                    labelMode = "inside";
                }

                if (labelMode === "skip") {
                    return;
                }

                const maxWidth = labelMode === "left"
                    ? leftSpace
                    : labelMode === "right"
                        ? rightSpace
                        : insideSpace;
                const display = formatLabel(point.civilization, Math.max(24, maxWidth), labelFontSize);
                const textX = labelMode === "left"
                    ? (startX - 6)
                    : labelMode === "right"
                        ? (startX + barWidth + 6)
                        : (startX + (barWidth / 2));
                const textAnchor = labelMode === "left"
                    ? "end"
                    : labelMode === "right"
                        ? "start"
                        : "middle";
                const labelColor = labelMode === "inside"
                    ? this.getContrastColor(fill)
                    : (this.isHighContrastMode() ? this.getThemeForeground(settings.yAxisColor) : settings.yAxisColor);

                const label = rowGroup.append("text")
                    .attr("class", "timeline-label")
                    .attr("x", this.snapToPixelInt(textX))
                    .attr("y", this.snapToPixelInt(barY + (barHeight / 2)))
                    .attr("dy", "0.35em")
                    .attr("text-anchor", textAnchor)
                    .attr("font-size", `${labelFontSize}px`)
                    .attr("font-family", settings.yAxisFontFamily)
                    .style("font-weight", settings.yAxisBold ? "700" : "400")
                    .style("font-style", settings.yAxisItalic ? "italic" : "normal")
                    .style("text-decoration", settings.yAxisUnderline ? "underline" : "none")
                    .attr("fill", labelColor)
                    .text(display);

                if (display !== point.civilization) {
                    this.addTooltip(label as any, [{ displayName: "Civilization", value: point.civilization }], {
                        title: point.civilization,
                        color: fill
                    });
                }
            }
        });

        if (settings.timeline.showTodayLine) {
            const todayValue = isDateScale ? Date.now() : new Date().getFullYear();
            if (todayValue >= minYear && todayValue <= maxYear) {
                const todayX = this.snapToPixel(xScale(todayValue));
                const todayColor = this.isHighContrastMode()
                    ? this.getThemeForegroundSelected("#b91c1c")
                    : "#dc2626";
                const labelPadding = 4;
                const useEndAnchor = todayX > chartWidth - 72;
                const labelX = useEndAnchor ? todayX - labelPadding : todayX + labelPadding;

                panel.append("line")
                    .attr("class", "timeline-today-line")
                    .attr("x1", todayX)
                    .attr("x2", todayX)
                    .attr("y1", 0)
                    .attr("y2", chartHeight)
                    .attr("stroke", todayColor)
                    .attr("stroke-width", 1.5)
                    .attr("stroke-dasharray", "5,4")
                    .attr("stroke-opacity", this.isHighContrastMode() ? 1 : 0.9)
                    .style("pointer-events", "none");

                panel.append("text")
                    .attr("class", "timeline-today-label")
                    .attr("x", this.snapToPixelInt(labelX))
                    .attr("y", 12)
                    .attr("text-anchor", useEndAnchor ? "end" : "start")
                    .attr("font-size", `${Math.max(9, axisFontSize - 1)}px`)
                    .attr("font-family", settings.xAxisFontFamily)
                    .style("font-weight", "600")
                    .attr("fill", todayColor)
                    .text("Today")
                    .style("pointer-events", "none");
            }
        }

        if (settings.timeline.showCrosshair) {
            const crosshair = panel.append("line")
                .attr("class", "timeline-crosshair")
                .attr("y1", 0)
                .attr("y2", chartHeight)
                .attr("stroke", this.isHighContrastMode() ? this.getThemeForeground("#374151") : "rgba(17, 24, 39, 0.25)")
                .attr("stroke-width", 1)
                .style("pointer-events", "none")
                .style("opacity", 0);

            panel.on("mousemove", (event: MouseEvent) => {
                const [mx, my] = d3.pointer(event, panel.node() as SVGGElement);
                if (mx < 0 || mx > chartWidth || my < 0 || my > chartHeight) {
                    crosshair.style("opacity", 0);
                    return;
                }
                crosshair
                    .attr("x1", this.snapToPixel(mx))
                    .attr("x2", this.snapToPixel(mx))
                    .style("opacity", 1);
            });

            panel.on("mouseleave", () => {
                crosshair.style("opacity", 0);
            });
        }

        // Keep sticky top axis above bars/grid/crosshair.
        topAxisGroup?.raise();

        if (hasLegend) {
            this.renderLegend(colorScale, data.maxValue, true, timelineData.regions, undefined, undefined, {
                alignFrame: {
                    x: margin.left,
                    y: margin.top,
                    width: chartWidth,
                    height: chartHeight
                },
                availableWidth: legendAvailableWidth,
                availableHeight: legendAvailableHeight
            });

            // Make the legend sticky in viewport space (handled by visual scroll sync).
            const legendNodes = this.context.container.selectAll<SVGGElement, unknown>("g.color-legend").nodes();
            const legendPinLeft = 8;
            const legendPinTop = 6;
            let stickyLegendBottom = 0;
            legendNodes.forEach((legendNode) => {
                const legend = d3.select(legendNode);
                const bbox = legendNode.getBBox();
                const padX = 8;
                const padY = 6;
                const legendHeight = Math.max(0, Math.ceil(bbox.height) + padY * 2);
                stickyLegendBottom = Math.max(stickyLegendBottom, legendPinTop + legendHeight);

                legend.selectAll("rect.pinned-top-legend-bg").remove();
                legend.insert("rect", ":first-child")
                    .attr("class", "pinned-top-legend-bg")
                    .attr("x", -padX)
                    .attr("y", -padY)
                    .attr("width", Math.max(0, Math.ceil(bbox.width) + padX * 2))
                    .attr("height", Math.max(0, Math.ceil(bbox.height) + padY * 2))
                    .attr("fill", this.getThemeBackground("#ffffff"))
                    .attr("opacity", 0.98)
                    .attr("rx", 6)
                    .attr("pointer-events", "none");

                legend
                    .classed("pinned-top-legend", true)
                    .attr("data-pin-left", `${legendPinLeft}`)
                    .attr("data-pin-top", `${legendPinTop}`)
                    .attr("transform", `translate(${legendPinLeft}, ${legendPinTop})`);
            });

            // Keep axis glued to the legend (no vertical gap) while scrolling.
            if (topAxisGroup) {
                const axisTop = Math.max(0, Math.round(stickyLegendBottom + sortControlReserve));
                topAxisGroup
                    .attr("data-pin-top", `${axisTop}`)
                    .attr("data-sticky-offset", `${axisTop}`);
            }
        }
    }
}
