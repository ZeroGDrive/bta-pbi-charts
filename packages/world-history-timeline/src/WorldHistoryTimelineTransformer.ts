"use strict";

import powerbi from "powerbi-visuals-api";
import DataViewCategorical = powerbi.DataViewCategorical;
import { ChartData, DataPoint, formatDataValue, formatGroupValue } from "@pbi-visuals/shared";

type RoleColumn = {
    values: any[];
    source: powerbi.DataViewMetadataColumn;
};

export interface WorldHistoryTimelinePoint extends DataPoint {
    civilization: string;
    region: string;
    startYear: number;
    endYear: number;
    duration: number;
}

export interface WorldHistoryTimelineData extends ChartData {
    items: WorldHistoryTimelinePoint[];
    regions: string[];
    minYear: number;
    maxYear: number;
    hasRegionRoleData: boolean;
    startFormatString?: string;
    endFormatString?: string;
    timeScaleMode: "numeric" | "date";
}

export class WorldHistoryTimelineTransformer {
    private static getRoleColumns(
        categorical: DataViewCategorical,
        roleName: string,
        options?: { includeValues?: boolean; includeCategories?: boolean }
    ): RoleColumn[] {
        const includeValues = options?.includeValues !== false;
        const includeCategories = options?.includeCategories !== false;
        const columns: RoleColumn[] = [];

        if (includeValues && categorical.values) {
            for (const valueColumn of categorical.values) {
                const roles = valueColumn.source?.roles;
                if (roles?.[roleName]) {
                    columns.push(valueColumn as unknown as RoleColumn);
                }
            }
        }

        if (includeCategories && categorical.categories) {
            for (const categoryColumn of categorical.categories) {
                const roles = categoryColumn.source?.roles;
                if (roles?.[roleName]) {
                    columns.push(categoryColumn as unknown as RoleColumn);
                }
            }
        }

        return columns;
    }

    private static toTimelineValue(rawValue: any): number | null {
        if (rawValue === null || rawValue === undefined) {
            return null;
        }

        if (rawValue instanceof Date) {
            const t = rawValue.getTime();
            return Number.isFinite(t) ? t : null;
        }

        if (typeof rawValue === "number") {
            return Number.isFinite(rawValue) ? rawValue : null;
        }

        if (typeof rawValue === "string") {
            const trimmed = rawValue.trim();
            if (!trimmed) return null;

            const asNumber = Number(trimmed);
            if (Number.isFinite(asNumber)) {
                return asNumber;
            }

            const asDate = Date.parse(trimmed);
            return Number.isFinite(asDate) ? asDate : null;
        }

        return null;
    }

    private static isDateLikeColumn(column: RoleColumn | undefined): boolean {
        if (!column) return false;

        const sourceType = (column.source as any)?.type;
        if (sourceType?.dateTime === true || sourceType?.temporal === true) {
            return true;
        }

        const looksLikeDateString = (value: string): boolean => {
            const s = value.trim();
            if (!s) return false;

            if (/^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(s)) return true;
            if (/^\d{4}\/\d{2}\/\d{2}(?:[T\s].*)?$/.test(s)) return true;
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return true;
            if (/^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}$/.test(s)) return true;

            return false;
        };

        const looksLikeUnixTimestamp = (value: number): boolean => {
            if (!Number.isFinite(value)) return false;
            const abs = Math.abs(value);
            // Supports epoch seconds or milliseconds in modern ranges.
            return (abs >= 1_000_000_000 && abs <= 9_999_999_999)
                || (abs >= 1_000_000_000_000 && abs <= 9_999_999_999_999);
        };

        return column.values.some((v) => {
            if (v instanceof Date) return true;
            if (typeof v === "number") return looksLikeUnixTimestamp(v);
            if (typeof v === "string") return looksLikeDateString(v);
            return false;
        });
    }

    private static isDateLikeColumns(columns: RoleColumn[]): boolean {
        return columns.some((column) => WorldHistoryTimelineTransformer.isDateLikeColumn(column));
    }

    private static resolveTimelineValue(columns: RoleColumn[], rowIndex: number): number | null {
        for (let i = columns.length - 1; i >= 0; i--) {
            const parsed = WorldHistoryTimelineTransformer.toTimelineValue(columns[i].values[rowIndex]);
            if (Number.isFinite(parsed)) {
                return Number(parsed);
            }
        }
        return null;
    }

    private static getFormatString(columns: RoleColumn[]): string | undefined {
        for (let i = columns.length - 1; i >= 0; i--) {
            const fmt = (columns[i].source as any)?.format as string | undefined;
            if (typeof fmt === "string" && fmt.trim()) {
                return fmt;
            }
        }
        return undefined;
    }

    private static joinCategoryLabel(columns: RoleColumn[], rowIndex: number, fallback: string): string {
        if (!columns.length) {
            return fallback;
        }

        const parts: string[] = [];
        for (const column of columns) {
            const rawValue = column.values[rowIndex];
            if (rawValue === null || rawValue === undefined) {
                continue;
            }

            const label = formatDataValue(rawValue, rowIndex);
            if (label.trim()) {
                parts.push(label);
            }
        }

        return parts.length ? parts.join(" • ") : fallback;
    }

    private static joinGroupLabel(columns: RoleColumn[], rowIndex: number, fallback: string): string {
        if (!columns.length) {
            return fallback;
        }

        const parts = columns.map((column) => formatGroupValue(column.values[rowIndex]));
        return parts.length ? parts.join(" • ") : fallback;
    }

    public static transform(categorical: DataViewCategorical): WorldHistoryTimelineData {
        const dataPoints: DataPoint[] = [];
        const items: WorldHistoryTimelinePoint[] = [];
        const regionsSet = new Set<string>();

        const civilizationColumns = WorldHistoryTimelineTransformer.getRoleColumns(categorical, "civilization", {
            includeValues: false
        });
        const regionColumns = WorldHistoryTimelineTransformer.getRoleColumns(categorical, "region", {
            includeValues: false
        });

        const startColumns = WorldHistoryTimelineTransformer.getRoleColumns(categorical, "startYear");
        const endColumns = WorldHistoryTimelineTransformer.getRoleColumns(categorical, "endYear");

        if (!startColumns.length && categorical.values?.[0]) {
            startColumns.push(categorical.values[0] as unknown as RoleColumn);
        }
        if (!endColumns.length && categorical.values?.[1]) {
            endColumns.push(categorical.values[1] as unknown as RoleColumn);
        }

        if (!startColumns.length || !endColumns.length) {
            return {
                dataPoints,
                items,
                xValues: [],
                yValues: [],
                groups: [],
                regions: [],
                maxValue: 0,
                minValue: 0,
                minYear: 0,
                maxYear: 0,
                hasRegionRoleData: regionColumns.length > 0,
                timeScaleMode: "numeric"
            };
        }

        const isDateScale = WorldHistoryTimelineTransformer.isDateLikeColumns(startColumns)
            || WorldHistoryTimelineTransformer.isDateLikeColumns(endColumns);
        const allColumns = [
            ...civilizationColumns,
            ...regionColumns,
            ...startColumns,
            ...endColumns
        ];
        const rowCount = allColumns.length > 0
            ? Math.max(...allColumns.map((column) => column.values.length))
            : 0;

        let minYear = Number.POSITIVE_INFINITY;
        let maxYear = Number.NEGATIVE_INFINITY;
        let maxDuration = Number.NEGATIVE_INFINITY;
        let minDuration = Number.POSITIVE_INFINITY;

        let index = 0;
        for (let i = 0; i < rowCount; i++) {
            let startYear = WorldHistoryTimelineTransformer.resolveTimelineValue(startColumns, i);
            let endYear = WorldHistoryTimelineTransformer.resolveTimelineValue(endColumns, i);
            if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
                continue;
            }

            startYear = Number(startYear);
            endYear = Number(endYear);
            if (endYear < startYear) {
                const t = startYear;
                startYear = endYear;
                endYear = t;
            }

            const civilization = WorldHistoryTimelineTransformer.joinCategoryLabel(civilizationColumns, i, `Entry ${index + 1}`);
            const region = WorldHistoryTimelineTransformer.joinGroupLabel(regionColumns, i, "World");

            const duration = Math.max(0, endYear - startYear);

            minYear = Math.min(minYear, startYear);
            maxYear = Math.max(maxYear, endYear);
            minDuration = Math.min(minDuration, duration);
            maxDuration = Math.max(maxDuration, duration);

            regionsSet.add(region);

            const point: WorldHistoryTimelinePoint = {
                xValue: String(startYear),
                yValue: civilization,
                value: duration,
                groupValue: "All",
                index,
                civilization,
                region,
                startYear,
                endYear,
                duration
            };

            dataPoints.push(point);
            items.push(point);
            index += 1;
        }

        if (!Number.isFinite(minYear) || !Number.isFinite(maxYear)) {
            minYear = 0;
            maxYear = 0;
        }

        if (!Number.isFinite(minDuration)) {
            minDuration = 0;
        }

        if (!Number.isFinite(maxDuration)) {
            maxDuration = 0;
        }

        const regions = Array.from(regionsSet).sort((a, b) => a.localeCompare(b));

        return {
            dataPoints,
            items,
            xValues: [String(minYear), String(maxYear)],
            yValues: items.map((d) => d.civilization),
            groups: ["All"],
            regions,
            minValue: minDuration,
            maxValue: maxDuration,
            minYear,
            maxYear,
            hasRegionRoleData: regionColumns.length > 0,
            startFormatString: WorldHistoryTimelineTransformer.getFormatString(startColumns),
            endFormatString: WorldHistoryTimelineTransformer.getFormatString(endColumns),
            timeScaleMode: isDateScale ? "date" : "numeric"
        };
    }
}
