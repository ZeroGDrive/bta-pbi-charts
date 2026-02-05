"use strict";

import * as d3 from "./d3";

export interface EmptyStateOptions {
    title: string;
    lines: string[];
    hint?: string;
}

export function renderEmptyState(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number,
    height: number,
    options: EmptyStateOptions
): void {
    const { title, lines, hint } = options;

    const group = container.append("g")
        .attr("class", "empty-state")
        .attr("transform", `translate(${Math.round(width / 2)}, ${Math.round(height / 2)})`);

    const titleFontSize = 14;
    const lineFontSize = 11;
    const hintFontSize = 10;

    const maxLines = 6;
    const displayLines = lines.slice(0, maxLines);
    const showEllipsis = lines.length > maxLines;

    // Approximate heights (SVG text y is baseline-based; this keeps spacing consistent and avoids overlap)
    const titleHeight = Math.round(titleFontSize * 1.6);
    const lineHeight = Math.round(lineFontSize * 1.4);
    const hintHeight = Math.round(hintFontSize * 1.4);
    const gapAfterTitle = 6;
    const gapBeforeHint = 10;

    const bodyLineCount = displayLines.length + (showEllipsis ? 1 : 0);
    const bodyHeight = bodyLineCount * lineHeight;
    const hintBlockHeight = hint ? (gapBeforeHint + hintHeight) : 0;
    const totalHeight = titleHeight + gapAfterTitle + bodyHeight + hintBlockHeight;

    let currentY = -Math.round(totalHeight / 2) + titleFontSize;

    group.append("text")
        .attr("class", "empty-state-title")
        .attr("text-anchor", "middle")
        .attr("y", currentY)
        .attr("font-size", `${titleFontSize}px`)
        .attr("font-weight", "700")
        .attr("fill", "#374151")
        .text(title);

    currentY += titleHeight + gapAfterTitle;

    displayLines.forEach((line, index) => {
        group.append("text")
            .attr("class", "empty-state-line")
            .attr("text-anchor", "middle")
            .attr("y", currentY + index * lineHeight)
            .attr("font-size", `${lineFontSize}px`)
            .attr("font-weight", "500")
            .attr("fill", "#6B7280")
            .text(line);
    });

    if (showEllipsis) {
        group.append("text")
            .attr("class", "empty-state-more")
            .attr("text-anchor", "middle")
            .attr("y", currentY + displayLines.length * lineHeight)
            .attr("font-size", `${lineFontSize}px`)
            .attr("font-weight", "500")
            .attr("fill", "#6B7280")
            .text("…");
    }

    if (hint) {
        currentY += bodyHeight + gapBeforeHint;
        group.append("text")
            .attr("class", "empty-state-hint")
            .attr("text-anchor", "middle")
            .attr("y", currentY)
            .attr("font-size", `${hintFontSize}px`)
            .attr("font-weight", "500")
            .attr("fill", "#9CA3AF")
            .text(hint);
    }
}
