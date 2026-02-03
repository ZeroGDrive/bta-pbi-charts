"use strict";

import powerbi from "powerbi-visuals-api";
import DataViewCategorical = powerbi.DataViewCategorical;
import { ChartData, DataPoint, formatDataValue, sortDateValues } from "@pbi-visuals/shared";

export class HeatmapTransformer {
    public static transform(categorical: DataViewCategorical): ChartData {
        const dataPoints: DataPoint[] = [];
        const xValuesSet = new Set<string>();
        const yValuesSet = new Set<string>();
        const groupsSet = new Set<string>();
        let maxValue = 0;
        let minValue = Infinity;

        let xAxisIndex = -1;
        let yAxisIndex = -1;
        let groupByIndex = -1;

        if (categorical.categories) {
            categorical.categories.forEach((cat, idx) => {
                const role = cat.source.roles;
                if (role) {
                    if (role["xAxis"]) xAxisIndex = idx;
                    if (role["yAxis"]) yAxisIndex = idx;
                    if (role["groupBy"]) groupByIndex = idx;
                }
            });
        }

        const values = categorical.values?.[0]?.values || [];

        for (let i = 0; i < values.length; i++) {
            const rawXValue = xAxisIndex >= 0 ? categorical.categories![xAxisIndex].values[i] : null;
            const xValue = formatDataValue(rawXValue, i);
            const yValue = yAxisIndex >= 0 ? String(categorical.categories![yAxisIndex].values[i] ?? "") : "Series";
            const groupValue = groupByIndex >= 0 ? String(categorical.categories![groupByIndex].values[i] ?? "") : "All";
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

        return { dataPoints, xValues, yValues, groups, maxValue, minValue };
    }
}
