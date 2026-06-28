function escapeXml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function getChartSvgMarkup() {
    if (!chart) {
        throw new Error("No chart rendered");
    }

    const canvas = chart.canvas;
    const width = Math.max(400, Math.round(canvas.width || 1000));
    const height = Math.max(280, Math.round(canvas.height || 600));
    const chartArea = chart.chartArea || {};
    const left = chartArea.left || 44;
    const top = chartArea.top || 0;
    const right = chartArea.right || width - 24;
    const bottom = chartArea.bottom || height - 24;
    const plotTop = top;
    const plotLeft = left;
    const plotRight = right;
    const plotBottom = bottom;

    const body = [];
    body.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
    body.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>`);

    // 1. Draw Axes, Ticks, Tick Labels, Grid Lines dynamically from scales
    if (chart.scales) {
        const visibleYScaleIds = Object.keys(chart.scales).filter(id => id !== 'x' && chart.scales[id].options.display !== false);
        const firstVisibleYScaleId = visibleYScaleIds.find(id => chart.scales[id].position === 'left') || visibleYScaleIds[0];

        Object.keys(chart.scales).forEach((scaleId) => {
            const scale = chart.scales[scaleId];
            if (!scale || scale.options.display === false) return;

            const isHorizontal = scale.isHorizontal();

            if (isHorizontal) {
                // Draw horizontal scale line
                const yPos = scale.bottom;
                body.push(`<line x1="${plotLeft}" y1="${yPos}" x2="${plotRight}" y2="${yPos}" stroke="#666666" stroke-width="1"/>`);

                if (scale.ticks) {
                    scale.ticks.forEach((tick, index) => {
                        const xPx = scale.getPixelForValue(tick.value);
                        if (xPx >= plotLeft - 0.5 && xPx <= plotRight + 0.5) {
                            // Vertical grid line (skip borders to avoid overlap)
                            if (xPx > plotLeft + 1 && xPx < plotRight - 1) {
                                body.push(`<line x1="${xPx.toFixed(2)}" y1="${plotTop}" x2="${xPx.toFixed(2)}" y2="${plotBottom}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="2,2"/>`);
                            }
                            // Tick mark line
                            body.push(`<line x1="${xPx.toFixed(2)}" y1="${yPos}" x2="${xPx.toFixed(2)}" y2="${yPos + 4}" stroke="#666666" stroke-width="1"/>`);
                            // Tick text
                            const label = tick.label || scale.getLabelForValue(tick.value);
                            if (label) {
                                body.push(`<text x="${xPx.toFixed(2)}" y="${yPos + 24}" font-family="Arial, sans-serif" font-size="22" fill="#4b5563" text-anchor="middle">${escapeXml(label)}</text>`);
                            }
                        }
                    });
                }

                // Axis Title (Horizontal scale)
                if (scale.options.title && scale.options.title.display && scale.options.title.text) {
                    const titleText = scale.options.title.text;
                    const titleColor = scale.options.title.color || "#666666";
                    const titleFontSize = Math.max(28, (scale.options.title.font?.size || 12) + 14);
                    const isBold = scale.options.title.font?.weight === "bold";
                    // Position below tick labels and custom labels
                    const titleY = Math.round(scale.bottom + (axisLabels.start.visible || axisLabels.end.visible ? 74 : 50));
                    const titleX = Math.round((plotLeft + plotRight) / 2);
                    body.push(`<text x="${titleX}" y="${titleY}" font-family="Arial, sans-serif" font-size="${titleFontSize}" font-weight="${isBold ? 'bold' : 'normal'}" fill="${titleColor}" text-anchor="middle">${escapeXml(titleText)}</text>`);
                }
            } else {
                // Vertical Y scale
                const isLeft = scale.position === "left";
                const xPos = isLeft ? scale.right : scale.left;

                // Draw vertical scale line
                body.push(`<line x1="${xPos}" y1="${plotTop}" x2="${xPos}" y2="${plotBottom}" stroke="#666666" stroke-width="1"/>`);

                if (scale.ticks) {
                    scale.ticks.forEach((tick, index) => {
                        const yPx = scale.getPixelForValue(tick.value);
                        if (yPx >= plotTop - 0.5 && yPx <= plotBottom + 0.5) {
                            // Horizontal grid line (only draw for the primary Y scale to avoid duplicate overlapping grids)
                            if (scaleId === firstVisibleYScaleId && scale.options.grid && scale.options.grid.display !== false) {
                                if (yPx > plotTop + 1 && yPx < plotBottom - 1) {
                                    const gridColor = scale.options.grid.color || "#e5e7eb";
                                    body.push(`<line x1="${plotLeft}" y1="${yPx.toFixed(2)}" x2="${plotRight}" y2="${yPx.toFixed(2)}" stroke="${gridColor}" stroke-width="1"/>`);
                                }
                            }
                            // Tick mark line
                            const xTickEnd = isLeft ? xPos - 4 : xPos + 4;
                            body.push(`<line x1="${xPos}" y1="${yPx.toFixed(2)}" x2="${xTickEnd}" y2="${yPx.toFixed(2)}" stroke="#666666" stroke-width="1"/>`);
                            // Tick text
                            const label = tick.label || scale.getLabelForValue(tick.value);
                            if (label) {
                                const textX = isLeft ? xPos - 14 : xPos + 14;
                                const anchor = isLeft ? "end" : "start";
                                body.push(`<text x="${textX}" y="${(yPx + 7.5).toFixed(2)}" font-family="Arial, sans-serif" font-size="22" fill="#4b5563" text-anchor="${anchor}">${escapeXml(label)}</text>`);
                            }
                        }
                    });
                }

                // Axis Title (Vertical Y scale)
                if (scale.options.title && scale.options.title.display && scale.options.title.text) {
                    const titleText = scale.options.title.text;
                    const titleColor = scale.options.title.color || "#666666";
                    const titleFontSize = Math.max(28, (scale.options.title.font?.size || 12) + 14);
                    const isBold = scale.options.title.font?.weight === "bold";
                    const titleX = isLeft 
                        ? Math.max(15 + titleFontSize / 2, Math.round(xPos - 65)) 
                        : Math.min(width - 15 - titleFontSize / 2, Math.round(xPos + 65));
                    const titleY = Math.round((plotTop + plotBottom) / 2);
                    const rotation = isLeft ? -90 : 90;
                    body.push(`<text x="0" y="0" font-family="Arial, sans-serif" font-size="${titleFontSize}" font-weight="${isBold ? 'bold' : 'normal'}" fill="${titleColor}" text-anchor="middle" transform="translate(${titleX}, ${titleY}) rotate(${rotation})">${escapeXml(titleText)}</text>`);
                }
            }
        });
    }

    // 2. Draw Events (matching eventDrawerPlugin logic)
    if (Array.isArray(eventsList)) {
        const xScale = chart.scales && chart.scales.x;
        const minTime = xScale ? xScale.min : 0;
        const maxTime = xScale ? xScale.max : currentLogicalMaxMs;

        eventsList.forEach((ev) => {
            if ((ev.type & eventsMask) === 0) return;
            if (ev.time < minTime || ev.time > maxTime) return;

            const xPos = xScale ? xScale.getPixelForValue(ev.time) : null;
            if (Number.isFinite(xPos) && xPos >= plotLeft && xPos <= plotRight) {
                const color = eventColors[ev.type] || "black";
                // Vertical line
                body.push(`<line x1="${xPos.toFixed(2)}" y1="${plotTop}" x2="${xPos.toFixed(2)}" y2="${plotBottom}" stroke="${color}" stroke-width="1"/>`);
                // Rotated event text
                const textY = plotTop + 10;
                body.push(`<text x="${xPos.toFixed(2)}" y="${textY}" font-family="Arial, sans-serif" font-size="10" fill="${color}" transform="rotate(90, ${xPos.toFixed(2)}, ${textY})">${escapeXml(ev.text)}</text>`);
            }
        });
    }

    // 3. Draw Legend (datasets labels)
    const datasets = Array.isArray(chart.data && chart.data.datasets) ? chart.data.datasets : [];
    const legendItems = [];

    if (chart.legend && Array.isArray(chart.legend.legendItems) && chart.legend.legendItems.length > 0) {
        chart.legend.legendItems.forEach((item) => {
            legendItems.push({
                text: item.text || "",
                color: item.strokeStyle || item.fillStyle || item.backgroundColor || "#3b82f6",
                lineWidth: item.lineWidth || 2,
                hidden: !!item.hidden,
            });
        });
    } else {
        datasets.forEach((dataset) => {
            if (!dataset) return;
            legendItems.push({
                text: dataset.label || "Series",
                color: dataset.borderColor || dataset.pointBorderColor || "#3b82f6",
                lineWidth: dataset.borderWidth || 2,
                hidden: false,
            });
        });
    }

    if (legendItems.length > 0) {
        const legendBox = chart.legend && Number.isFinite(chart.legend.left) && Number.isFinite(chart.legend.top)
            ? {
                left: chart.legend.left,
                top: chart.legend.top,
            }
            : null;
        const legendLineLength = 34;
        const configFontSize = chart.options.plugins.legend?.labels?.font?.size || 20;
        const legendFontSize = Math.max(configFontSize + 2, Math.round(Math.min(width, height) * 0.025));
        const rowGap = Math.max(20, Math.round(legendFontSize * 1.25));
        const maxLegendWidth = Math.max(220, Math.round(width * 0.65));
        const legendY = legendBox
            ? Math.max(12, Math.round(legendBox.top))
            : Math.max(20, Math.round(plotTop - 20));
        const legendCenterX = Math.round(width / 2);
        const legendX = legendBox
            ? Math.max(24, Math.round(legendCenterX - maxLegendWidth / 2))
            : Math.max(24, Math.round(width * 0.08));
        let cursorX = legendX;
        let cursorY = legendY;

        legendItems.forEach((item) => {
            if (!item.text) return;
            const swatchColor = item.hidden ? "#cccccc" : item.color;
            const label = escapeXml(item.text);
            const rectW = 20;
            const rectH = 12;
            const rectY = cursorY + 2;
            const itemWidth = rectW + 8 + label.length * (legendFontSize * 0.6);
            if (cursorX + itemWidth > legendX + maxLegendWidth && cursorX > legendX) {
                cursorX = legendX;
                cursorY += rowGap;
            }
            body.push(`<rect x="${cursorX}" y="${rectY}" width="${rectW}" height="${rectH}" fill="${swatchColor}" stroke="none"/>`);
            body.push(`<text x="${cursorX + rectW + 8}" y="${cursorY + 12}" font-family="Arial, sans-serif" font-size="${legendFontSize}" fill="#333333">${label}</text>`);
            cursorX += itemWidth + 12;
        });
    }

    // 4. Draw Custom Axis Labels (shifted slightly lower to avoid tick overlaps)
    if (axisLabels.start.visible) {
        body.push(`<text x="${left}" y="${bottom + 44}" font-family="Arial, sans-serif" font-size="22" fill="#333333">${escapeXml(axisLabels.start.text)}</text>`);
    }

    if (axisLabels.end.visible) {
        body.push(`<text x="${right}" y="${bottom + 44}" text-anchor="end" font-family="Arial, sans-serif" font-size="22" fill="#333333">${escapeXml(axisLabels.end.text)}</text>`);
    }

    // 5. Draw Data (Bars first, then Polylines on top)
    // Pass A: Draw all Bar datasets
    datasets.forEach((dataset, datasetIndex) => {
        if (!dataset || !Array.isArray(dataset.data)) return;
        if (chart && typeof chart.isDatasetVisible === "function" && !chart.isDatasetVisible(datasetIndex)) {
            return;
        }

        const meta = chart.getDatasetMeta(datasetIndex);
        if (meta && meta.type === 'bar') {
            const metaData = meta.data || [];
            metaData.forEach((element) => {
                if (!element) return;
                
                // Get bar dimensions
                const x = element.x;
                const y = element.y;
                const base = element.base ?? y;
                const width = element.width ?? 10;
                
                const rectWidth = width;
                const rectHeight = Math.abs(y - base);
                const rectX = x - rectWidth / 2;
                const rectY = Math.min(y, base);

                // Clamp horizontally to chart area (plotLeft, plotRight)
                let drawX = rectX;
                let drawW = rectWidth;
                if (drawX < plotLeft) {
                    drawW -= (plotLeft - drawX);
                    drawX = plotLeft;
                }
                if (drawX + drawW > plotRight) {
                    drawW = plotRight - drawX;
                }

                if (drawW > 0) {
                    const fill = element.options?.backgroundColor || dataset.backgroundColor || "#3b82f6";
                    const stroke = element.options?.borderColor || dataset.borderColor || "none";
                    const strokeWidth = element.options?.borderWidth || dataset.borderWidth || 0;

                    body.push(`<rect x="${drawX.toFixed(2)}" y="${rectY.toFixed(2)}" width="${drawW.toFixed(2)}" height="${rectHeight.toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`);
                }
            });
        }
    });

    // Pass B: Draw all Line (Polyline) datasets on top of bars
    datasets.forEach((dataset, datasetIndex) => {
        if (!dataset || !Array.isArray(dataset.data)) return;
        if (chart && typeof chart.isDatasetVisible === "function" && !chart.isDatasetVisible(datasetIndex)) {
            return;
        }

        const meta = chart.getDatasetMeta(datasetIndex);
        if (meta && meta.type === 'bar') {
            return; // Already drawn in Pass A
        }

        // Default: Draw Polyline Data Points for line charts
        if (dataset.data.length < 2) return;
        const points = [];
        dataset.data.forEach((point, pointIndex) => {
            let xValue = null;
            let yValue = null;

            if (Array.isArray(point)) {
                xValue = point[0];
                yValue = point[1];
            } else if (point && typeof point === "object") {
                xValue = point.x ?? point.t ?? point[0];
                yValue = point.y ?? point.v ?? point[1];
            } else {
                xValue = pointIndex;
                yValue = point;
            }

            if (xValue === null || yValue === null || typeof xValue === "undefined" || typeof yValue === "undefined") {
                return;
            }

            const xScale = chart.scales && chart.scales.x;
            const yAxisId = dataset.yAxisID || "y";
            const scaleForY = chart.scales && chart.scales[yAxisId] ? chart.scales[yAxisId] : null;

            if (!xScale || !scaleForY) {
                return;
            }

            let xPx = xScale.getPixelForValue(xValue);
            let yPx = scaleForY.getPixelForValue(yValue);

            if (!Number.isFinite(xPx) || !Number.isFinite(yPx)) {
                return;
            }

            xPx = Math.max(plotLeft, Math.min(plotRight, xPx));
            yPx = Math.max(plotTop, Math.min(plotBottom, yPx));
            points.push(`${xPx.toFixed(2)},${yPx.toFixed(2)}`);
        });

        if (points.length >= 2) {
            const strokeColor = dataset.borderColor || dataset.pointBorderColor || "#3b82f6";
            const strokeWidth = dataset.borderWidth || 2;
            body.push(`<polyline fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" points="${points.join(" ")}"/>`);
        }
    });

    body.push("</svg>");
    return body.join("");
}

function getChartSvgDataUrl() {
    const svgMarkup = getChartSvgMarkup();
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgMarkup);
}

function getExportSettings() {
    const paper = document.getElementById("paperSize")?.value || "A4";
    const orientation = document.getElementById("orientation")?.value || "auto";
    let width = parseInt(document.getElementById("exportWidth")?.value || "1600", 10);
    let height = parseInt(document.getElementById("exportHeight")?.value || "900", 10);
    if (isNaN(width) || width < 100) width = 1600;
    if (isNaN(height) || height < 100) height = 900;

    const settings = { paper, orientation, width, height };
    console.log("[ExportSettings]", JSON.stringify(settings));
    if (enblDbg) dbglog("getExportSettings: " + JSON.stringify(settings));
    return settings;
}

function logExportSettingsChange() {
    const s = getExportSettings();
    const info = document.getElementById("settingsInfo");
    if (info) info.textContent = s.paper + " | " + s.orientation + " | " + s.width + "x" + s.height;

    const chartDiv = document.getElementById("myChartDiv");
    if (chartDiv) {
        chartDiv.style.flex = "none";
        chartDiv.style.width = s.width + "px";
        chartDiv.style.height = s.height + "px";
        if (typeof chart !== "undefined" && chart) {
            chart.resize();
        }
    }
}

function getChartBase64() {
    if (!chart) {
        throw new Error("No chart rendered");
    }

    try {
        const settings = getExportSettings();
        const svgDataUrl = getChartSvgDataUrl();

        console.log(
            `[Export] paper=${settings.paper} orientation=${settings.orientation} svg length=${svgDataUrl.length}`
        );

        return svgDataUrl;
    }
    catch (err) {
        console.error("getChartBase64 error:", err);
        throw err;
    }
}

function handleOrientationChange() {
    const val = document.getElementById("orientation")?.value;
    const wInput = document.getElementById("exportWidth");
    const hInput = document.getElementById("exportHeight");
    if (val === "portrait") {
        if (wInput) wInput.value = "900";
        if (hInput) hInput.value = "500";
    } else if (val === "landscape") {
        if (wInput) wInput.value = "1200";
        if (hInput) hInput.value = "600";
    }
}

// Attach change listeners to update the info bar
document.addEventListener("DOMContentLoaded", function() {
    const orientEl = document.getElementById("orientation");
    if (orientEl) {
        orientEl.addEventListener("change", handleOrientationChange);
        orientEl.addEventListener("input", handleOrientationChange);
    }

    ["paperSize", "orientation", "exportWidth", "exportHeight"].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", logExportSettingsChange);
        if (el) el.addEventListener("input", logExportSettingsChange);
    });
    logExportSettingsChange();
});
