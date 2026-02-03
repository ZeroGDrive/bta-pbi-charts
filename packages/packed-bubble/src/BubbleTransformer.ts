"use strict";

import powerbi from "powerbi-visuals-api";
import DataViewCategorical = powerbi.DataViewCategorical;

export interface BubbleNode {
    id: string;
    category: string;
    value: number;
    radius: number;
    groupValue: string;
    index: number;
    x?: number;
    y?: number;
}

export interface BubbleData {
    nodes: BubbleNode[];
    categories: string[];
    groups: string[];
    maxValue: number;
    minValue: number;
    categoryColorMap?: Map<string, string>;
}

export class BubbleTransformer {
    public static transform(categorical: DataViewCategorical): BubbleData {
        const nodes: BubbleNode[] = [];
        const categoriesSet = new Set<string>();
        const groupsSet = new Set<string>();
        let maxValue = 0;
        let minValue = Infinity;

        let yAxisIndex = -1;
        let groupByIndex = -1;
        let legendIndex = -1;

        if (categorical.categories) {
            categorical.categories.forEach((cat, idx) => {
                const role = cat.source.roles;
                if (role) {
                    if (role["yAxis"]) yAxisIndex = idx;
                    if (role["groupBy"]) groupByIndex = idx;
                    if (role["legend"]) legendIndex = idx;
                }
            });
        }

        const values = categorical.values?.[0]?.values || [];

        for (let i = 0; i < values.length; i++) {
            // Use yAxis for category (bubble grouping), fallback to legend if no yAxis
            const categorySource = yAxisIndex >= 0 ? yAxisIndex : legendIndex;
            const category = categorySource >= 0
                ? String(categorical.categories![categorySource].values[i] ?? "")
                : "All";
            const groupValue = groupByIndex >= 0
                ? String(categorical.categories![groupByIndex].values[i] ?? "")
                : "All";
            const value = Number(values[i]) || 0;

            if (value > 0) {
                if (value > maxValue) maxValue = value;
                if (value < minValue) minValue = value;

                categoriesSet.add(category);
                groupsSet.add(groupValue);

                nodes.push({
                    id: `bubble-${i}`,
                    category,
                    value,
                    radius: 0, // Will be calculated based on scale
                    groupValue,
                    index: i
                });
            }
        }

        const categories = Array.from(categoriesSet).sort();
        const groups = Array.from(groupsSet).sort();

        if (minValue === Infinity) minValue = 0;

        return { nodes, categories, groups, maxValue, minValue };
    }
}
