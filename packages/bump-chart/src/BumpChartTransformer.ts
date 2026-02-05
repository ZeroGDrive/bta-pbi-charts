"use strict";

import powerbi from "powerbi-visuals-api";
import DataViewCategorical = powerbi.DataViewCategorical;
import { ChartData, DataPoint, formatDataValue, sortDateValues } from "@pbi-visuals/shared";

export interface BumpChartDataPoint extends DataPoint {
    rank: number;
}

export interface BumpChartData extends ChartData {
    rankedData: Map<string, BumpChartDataPoint[]>;
    maxRank: number;
    hasLegendRoleData: boolean;
}

export class BumpChartTransformer {
    public static transform(categorical: DataViewCategorical): BumpChartData {
        const dataPoints: DataPoint[] = [];
        const xValuesSet = new Set<string>();
        const yValuesSet = new Set<string>();
        const groupsSet = new Set<string>();
        let maxValue = 0;
        let minValue = Infinity;

        let xAxisIndex = -1;
        let yAxisIndex = -1;
        let legendIndex = -1;

        if (categorical.categories) {
            categorical.categories.forEach((cat, idx) => {
                const role = cat.source.roles;
                if (role) {
                    if (role["xAxis"]) xAxisIndex = idx;
                    if (role["yAxis"]) yAxisIndex = idx;
                    if (role["legend"]) legendIndex = idx;
                }
            });
        }

        const values = categorical.values?.[0]?.values || [];
        const valueFormatString = (categorical.values?.[0]?.source as any)?.format as string | undefined;

        for (let i = 0; i < values.length; i++) {
            const rawXValue = xAxisIndex >= 0 ? categorical.categories![xAxisIndex].values[i] : null;
            const xValue = formatDataValue(rawXValue, i);
            const yValue = yAxisIndex >= 0 ? String(categorical.categories![yAxisIndex].values[i] ?? "") : "Series";
            const groupValue = "All";
            const value = Number(values[i]) || 0;

            if (value > maxValue) maxValue = value;
            if (value < minValue && value > 0) minValue = value;

            xValuesSet.add(xValue);
            yValuesSet.add(yValue);
            groupsSet.add(groupValue);

            dataPoints.push({
                xValue,
                yValue,
                value,
                groupValue,
                index: i
            });
        }

        const xValues = sortDateValues(Array.from(xValuesSet));
        const yValues = Array.from(yValuesSet).sort();
        const groups = Array.from(groupsSet).sort();

        if (minValue === Infinity) minValue = 0;

        // Calculate ranks for each x position
        const rankedData = new Map<string, BumpChartDataPoint[]>();
        let maxRank = 0;

        yValues.forEach(y => {
            rankedData.set(y, []);
        });

        xValues.forEach(xVal => {
            // Get all data points at this x position
            const pointsAtX = dataPoints.filter(dp => dp.xValue === xVal);

            // Sort by value descending to get ranks (highest value = rank 1)
            const sorted = [...pointsAtX].sort((a, b) => b.value - a.value);

            // Assign ranks
            sorted.forEach((dp, idx) => {
                const rank = idx + 1;
                if (rank > maxRank) maxRank = rank;

                const rankedPoint: BumpChartDataPoint = {
                    ...dp,
                    rank
                };

                rankedData.get(dp.yValue)!.push(rankedPoint);
            });
        });

        // Sort each series by x position
        yValues.forEach(y => {
            const series = rankedData.get(y)!;
            series.sort((a, b) => xValues.indexOf(a.xValue) - xValues.indexOf(b.xValue));
        });

        return {
            dataPoints,
            xValues,
            yValues,
            groups,
            maxValue,
            minValue,
            rankedData,
            maxRank: maxRank || yValues.length,
            hasLegendRoleData: legendIndex >= 0,
            valueFormatString
        };
    }
}
