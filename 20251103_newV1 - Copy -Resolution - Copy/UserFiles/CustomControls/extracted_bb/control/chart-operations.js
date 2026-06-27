// this function is called internally to get the max "t" of traces (meaning x)
function getMaxTimeFromTraces() {
  let maxT = 0;

  try {
    traces.forEach((t) => {
      if (t._fullData && t._fullData.length > 0) {
        let lastPoint = t._fullData[t._fullData.length - 1];
        if (lastPoint.x > maxT) maxT = lastPoint.x;
      }
    });
    if (enblDbg) dbglog("getMaxTimeFromTraces returns maxT=" + maxT);
  } catch (e) {
    dbglog("getMaxTimeFromTraces exception: " + e);
  }
  return maxT;
}

// this function is called from outside after adding points to eventually prolong x axis
function checkAndTimeAxisUpdate() {
  if (enblDbg) dbglog("calling checkAndTimeAxisUpdate");

  try {
    let safeWindow =
      typeof timeWindowMs !== "undefined" ? timeWindowMs : 1800000;
    let safeExtension =
      typeof timeExtensionMs !== "undefined" ? timeExtensionMs : 300000;

    if (!currentLogicalMaxMs || currentLogicalMaxMs < safeWindow) {
      currentLogicalMaxMs = safeWindow;
    }

    let currentMaxDataTime = getMaxTimeFromTraces();

    if (currentMaxDataTime > currentLogicalMaxMs) {
      let newMax = currentLogicalMaxMs + safeExtension;
      while (currentMaxDataTime > newMax) {
        newMax += safeExtension;
      }
      currentLogicalMaxMs = newMax;
    }

    if (enblDbg)
      dbglog(
        "checkAndTimeAxisUpdate got currentLogicalMaxMs=" +
          currentLogicalMaxMs,
      );

    // aggiorna la scala SOLO se NON zoom manuale
    if (chart && !isManuallyZoomed) {
      chart.options.scales.x.min = 0;
      chart.options.scales.x.max = currentLogicalMaxMs;
      updateDecimation(); //estrae i nuovi punti visibili dal _fullData
    }
  } catch (e) {
    dbglog("checkAndTimeAxisUpdate exception: " + e);
  }
}

// Decimazione Forzata ad hoc
function binarySearchX(data, targetX, strict) {
  let low = 0;
  let high = data.length - 1;
  while (low <= high) {
    let mid = (low + high) >> 1;
    const val = data[mid].x;
    if (strict ? val > targetX : val >= targetX) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return low;
}

// Decimazione Forzata ad hoc
function updateDecimation() {
  try {
    if (!chart) return;
    const TARGET_POINTS = 1000;

    let viewMin = chart.options.scales.x.min;
    let viewMax = chart.options.scales.x.max;
    if (viewMin === undefined) viewMin = 0;
    if (viewMax === undefined) viewMax = currentLogicalMaxMs;

    chart.data.datasets.forEach((chartDataset, i) => {
      let sourceData = chartDataset._fullData;
      if (!sourceData || sourceData.length === 0) return;

      let startIndex = binarySearchX(sourceData, viewMin, false);
      let endIndex = binarySearchX(sourceData, viewMax, true);

      if (startIndex > 0) startIndex--;
      if (endIndex < sourceData.length) endIndex++;

      let visibleCount = endIndex - startIndex;
      if (visibleCount < 0) visibleCount = 0;

      if (visibleCount <= TARGET_POINTS) {
        chartDataset.data = sourceData.slice(startIndex, endIndex);
      } else {
        let sampledData = [];
        let bucketCount = TARGET_POINTS / 2;
        let step = visibleCount / bucketCount;

        for (let j = 0; j < bucketCount; j++) {
          let bucketStartIdx = startIndex + Math.floor(j * step);
          let bucketEndIdx = startIndex + Math.floor((j + 1) * step);
          if (bucketEndIdx > endIndex) bucketEndIdx = endIndex;

          let minP = null,
            maxP = null;

          for (let k = bucketStartIdx; k < bucketEndIdx; k++) {
            let p = sourceData[k];
            if (p.y === null || p.y === undefined || isNaN(p.y)) continue;
            if (minP === null) {
              minP = p;
              maxP = p;
            } else {
              if (p.y < minP.y) minP = p;
              if (p.y > maxP.y) maxP = p;
            }
          }

          if (minP !== null) {
            if (minP === maxP) sampledData.push(minP);
            else {
              if (minP.x < maxP.x) {
                sampledData.push(minP);
                sampledData.push(maxP);
              } else {
                sampledData.push(maxP);
                sampledData.push(minP);
              }
            }
          } else {
            if (sourceData[bucketStartIdx])
              sampledData.push({
                x: sourceData[bucketStartIdx].x,
                y: Number.NaN,
              });
          }
        }
        chartDataset.data = sampledData;
      }
    });
  } catch (e) {
    dbglog("updateDecimation exception: " + e);
  }
}

// factor > 1 avvicina la vista
// factor < 1 allontana la vista
function zoomX(factor) {
  if (enblDbg) dbglog("ZoomX chiamato con factor=" + factor);
  try {
    if (chart && factor) {
      isManuallyZoomed = true;
      if (typeof chart.zoom === "function") {
        chart.zoom({ x: factor }); //solo su x
      }
      clampXAxis(); // applica i limiti
      updateDecimation(); // ricalcola post-zoom
    }
  } catch (e) {
    dbglog("zoomX exception: " + e);
  }
}

function zoomY(factor) {
  if (enblDbg) dbglog("ZoomY chiamato con factor=" + factor);
  try {
    if (!chart || !factor) return;

    // se siamo al 100%, memorizza i limiti
    if (currentZoomY === 1.0) {
      Object.keys(chart.scales).forEach((id) => {
        if (id !== "x")
          unzoomedYBounds[id] = {
            min: chart.scales[id].min,
            max: chart.scales[id].max,
          };
      });
    }

    let newZoom = currentZoomY * factor;

    // 1. Limite ZOOM IN (Massimo 10x)
    if (newZoom > 10.0) {
      factor = 10.0 / currentZoomY;
      newZoom = 10.0;
    }

    // 2. Limite ZOOM OUT (Ritorno al 100%)
    if (newZoom <= 1.0) {
      currentZoomY = 1.0;
      Object.keys(chart.options.scales).forEach((axisId) => {
        if (axisId !== "x") {
          delete chart.options.scales[axisId].min;
          delete chart.options.scales[axisId].max;
        }
      });
      return;
    }

    // esegui lo zoom
    isManuallyZoomed = true;
    chart.zoom({ y: factor });
    currentZoomY = newZoom;

    applyYLimits();
  } catch (e) {
    dbglog("zoomY exception: " + e);
  }
}

// pixels > 0 sposta i dati verso destra
// pixels < 0 sposta i dati verso sinistra
function panX(pixels) {
  if (enblDbg) dbglog("PanX chiamato con pixels=" + pixels);
  try {
    if (chart && pixels) {
      isManuallyZoomed = true;
      if (typeof chart.pan === "function") {
        chart.pan({ x: pixels }, undefined, "default"); // solo su X
      }
      clampXAxis(); // applica i limiti
      updateDecimation(); // ricalcola post-pan
      chart.update("none"); // applica i nuovi dati
    }
  } catch (e) {
    dbglog("panX exception: " + e);
  }
}

// pixels > 0 sposta i dati verso il basso
// pixels < 0 sposta i dati verso l'alto
function panY(pixels) {
  if (enblDbg) dbglog("PanY chiamato con pixels=" + pixels);
  try {
    if (!chart || !pixels) return;

    // se 100% di zoom, no Pan.
    if (currentZoomY <= 1.0) return;

    isManuallyZoomed = true;
    chart.pan({ y: pixels }, undefined, "default");

    applyYLimits(); // applica i limiti
    chart.update("none"); // applica i nuovi dati
  } catch (e) {
    dbglog("panY exception: " + e);
  }
}

// ripristina zooom
function resetZoom() {
  if (enblDbg) dbglog("ResetZoom chiamato");
  try {
    if (chart) {
      isManuallyZoomed = false;
      currentZoomY = 1.0; // ripristino scala y

      if (typeof chart.resetZoom === "function") chart.resetZoom();

      // Reset X
      chart.options.scales.x.min = 0;
      chart.options.scales.x.max = currentLogicalMaxMs;

      // Reset Y
      Object.keys(chart.options.scales).forEach((axisId) => {
        if (axisId !== "x") {
          delete chart.options.scales[axisId].min;
          delete chart.options.scales[axisId].max;
        }
      });

      updateDecimation();
      chart.update("none");
    }
  } catch (e) {
    dbglog("resetZoom exception: " + e);
  }
}

// limiti forzati per Pan e Zoom
function clampXAxis() {
  if (!chart || !chart.scales.x) return;

  try {
    let min = chart.scales.x.min;
    let max = chart.scales.x.max;

    if (min === undefined) min = chart.options.scales.x.min;
    if (max === undefined) max = chart.options.scales.x.max;

    let range = max - min;

    // 1. Limite massimo di Zoom-In
    const MIN_ZOOM_RANGE = 30000; // 30 secondi in ms
    if (range < MIN_ZOOM_RANGE) {
      let center = (min + max) / 2;
      min = center - MIN_ZOOM_RANGE / 2;
      max = center + MIN_ZOOM_RANGE / 2;
      range = MIN_ZOOM_RANGE;
    }

    // 2. Limite massimo di Zoom-Out
    if (range >= currentLogicalMaxMs) {
      min = 0;
      max = currentLogicalMaxMs;
      range = currentLogicalMaxMs;
    }

    // 3. Limite Sinistro per il Pan
    if (min < 0) {
      min = 0;
      max = min + range;
    }

    // 4. limite Destro per il Pan
    let realMaxDataTime = getMaxTimeFromTraces();
    if (realMaxDataTime <= 0) realMaxDataTime = currentLogicalMaxMs;
    if (max > realMaxDataTime) {
      max = realMaxDataTime;
      min = max - range;

      if (min < 0) min = 0;
    }

    // applica i limiti corretti
    chart.options.scales.x.min = min;
    chart.options.scales.x.max = max;
  } catch (e) {
    dbglog("clampXAxis exception: " + e);
  }
}

// limiti Y
function applyYLimits() {
  // cerca asse Y di riferimento
  try {
    let baseAxis = Object.keys(chart.options.scales).find(
      (k) => k !== "x" && chart.options.scales[k].display !== false,
    );
    if (!baseAxis || !unzoomedYBounds[baseAxis]) return;

    let optMin = chart.options.scales[baseAxis].min;
    let optMax = chart.options.scales[baseAxis].max;
    let unzoomed = unzoomedYBounds[baseAxis];

    if (optMin === undefined || optMax === undefined) return;

    let currentRange = optMax - optMin;
    let shiftRatio = 0;

    // se sceso sotto il minimo originale
    if (optMin < unzoomed.min) {
      shiftRatio = (unzoomed.min - optMin) / currentRange;
    }
    // se salito sopra il massimo originale
    else if (optMax > unzoomed.max) {
      shiftRatio = (unzoomed.max - optMax) / currentRange;
    }

    // se out, sposta tutti gli assi della stessa percentuale
    if (shiftRatio !== 0) {
      Object.keys(chart.options.scales).forEach((k) => {
        if (k === "x") return;
        let min = chart.options.scales[k].min;
        let max = chart.options.scales[k].max;
        if (min !== undefined && max !== undefined) {
          let range = max - min;
          chart.options.scales[k].min = min + range * shiftRatio;
          chart.options.scales[k].max = max + range * shiftRatio;
        }
      });
    }
  } catch (e) {
    dbglog("applyYLimits exception: " + e);
  }
}

// dynamic chart type switching (line, bar, mixed)
function applyCurrentChartMode() {
  if (!chart) return;
  const mode = currentChartMode || "line";
  
  try {
    // Set root configuration type
    if (mode === "bar") {
      chart.config.type = "bar";
      jsonCfg.type = "bar";
    } else {
      chart.config.type = "line";
      jsonCfg.type = "line";
    }

    // Set individual dataset types
    const currentDatasets = chart.data.datasets || [];
    currentDatasets.forEach((dataset, index) => {
      if (mode === "line") {
        dataset.type = "line";
      } else if (mode === "bar") {
        dataset.type = "bar";
      } else if (mode === "mixed") {
        // Determine type based on the stable master trace index matching by label
        const masterIndex = (typeof traces !== "undefined" && Array.isArray(traces)) 
            ? traces.findIndex(t => t.label === dataset.label) 
            : index;
        const targetIndex = (masterIndex !== -1) ? masterIndex : index;
        dataset.type = (targetIndex % 2 === 0) ? "line" : "bar";
      }
    });
  } catch (e) {
    dbglog("applyCurrentChartMode exception: " + e);
  }
}

function changeChartType(mode) {
  if (enblDbg) dbglog("changeChartType called with mode=" + mode);
  currentChartMode = mode;
  applyCurrentChartMode();
  
  try {
    // Redraw the chart
    if (typeof updateChart !== "undefined") {
      updateChart();
    } else {
      chart.update();
    }
    if (enblDbg) dbglog("changeChartType complete, type is " + chart.config.type);
  } catch (e) {
    dbglog("changeChartType exception: " + e);
  }
}

// -------------------------------------------------------------
// Timeline Range Brush Implementation
// -------------------------------------------------------------
var isDraggingBrush = false;
var dragStartType = ""; // 'pan', 'left-handle', 'right-handle'
var dragStartX = 0;
var dragStartMin = 0;
var dragStartMax = 0;

function drawBrush() {
  try {
    const canvas = document.getElementById("brushCanvas");
    if (!canvas || !chart) return;

    // Adjust canvas resolution dynamically to match client size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Get current scale limits
    let chartMin = chart.options.scales.x.min;
    let chartMax = chart.options.scales.x.max;
    let maxT = currentLogicalMaxMs || (30 * 60 * 1000);

    if (chartMin === undefined || chartMin === null) chartMin = 0;
    if (chartMax === undefined || chartMax === null) chartMax = maxT;

    // Ratios
    const rMin = Math.max(0, Math.min(1.0, chartMin / maxT));
    const rMax = Math.max(0, Math.min(1.0, chartMax / maxT));

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Background Track (light gray rounded bar)
    const trackHeight = 8;
    const trackY = (height - trackHeight) / 2;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(0, trackY, width, trackHeight, 4);
    } else {
      ctx.rect(0, trackY, width, trackHeight);
    }
    ctx.fillStyle = "#e2e8f0";
    ctx.fill();

    // 2. Draw Highlighted Viewport Region (translucent Siemens blue)
    const leftPx = rMin * width;
    const rightPx = rMax * width;
    const highlightW = rightPx - leftPx;

    ctx.beginPath();
    ctx.rect(leftPx, trackY, highlightW, trackHeight);
    ctx.fillStyle = "rgba(0, 92, 138, 0.2)";
    ctx.fill();
    ctx.strokeStyle = "#005c8a";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Draw Handles (Siemens blue pill style shapes at edges)
    const handleW = 6;
    const handleH = 16;
    const handleY = (height - handleH) / 2;

    // Left Handle
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(leftPx - handleW / 2, handleY, handleW, handleH, 2);
    } else {
      ctx.rect(leftPx - handleW / 2, handleY, handleW, handleH);
    }
    ctx.fillStyle = "#005c8a";
    ctx.fill();

    // Right Handle
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(rightPx - handleW / 2, handleY, handleW, handleH, 2);
    } else {
      ctx.rect(rightPx - handleW / 2, handleY, handleW, handleH);
    }
    ctx.fillStyle = "#005c8a";
    ctx.fill();

  } catch (e) {
    console.error("drawBrush error:", e);
  }
}

function initBrushEvents() {
  const canvas = document.getElementById("brushCanvas");
  if (!canvas) return;

  let animationFrameId = null;

  const getMouseX = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return clientX - rect.left;
  };

  const handleStart = (e) => {
    if (!chart) return;
    const mouseX = getMouseX(e);
    const width = canvas.getBoundingClientRect().width;
    const ratio = mouseX / width;

    let chartMin = chart.options.scales.x.min;
    let chartMax = chart.options.scales.x.max;
    const maxT = currentLogicalMaxMs || (30 * 60 * 1000);

    if (chartMin === undefined || chartMin === null) chartMin = 0;
    if (chartMax === undefined || chartMax === null) chartMax = maxT;

    const leftPx = (chartMin / maxT) * width;
    const rightPx = (chartMax / maxT) * width;

    const handleTolerance = 8; // Click area tolerance around handles

    if (Math.abs(mouseX - leftPx) <= handleTolerance) {
      isDraggingBrush = true;
      dragStartType = "left-handle";
    } else if (Math.abs(mouseX - rightPx) <= handleTolerance) {
      isDraggingBrush = true;
      dragStartType = "right-handle";
    } else if (mouseX >= leftPx && mouseX <= rightPx) {
      isDraggingBrush = true;
      dragStartType = "pan";
      dragStartX = mouseX;
      dragStartMin = chartMin;
      dragStartMax = chartMax;
    } else {
      // Clicked outside: snap viewport center to click position
      const range = chartMax - chartMin;
      const clickedTime = ratio * maxT;
      let newMin = clickedTime - range / 2;
      let newMax = clickedTime + range / 2;

      if (newMin < 0) {
        newMax = range;
        newMin = 0;
      } else if (newMax > maxT) {
        newMin = maxT - range;
        newMax = maxT;
      }

      chart.options.scales.x.min = newMin;
      chart.options.scales.x.max = newMax;
      isManuallyZoomed = true;
      
      if (typeof updateChart !== "undefined") {
        updateChart();
      } else {
        chart.update();
      }
      drawBrush();
    }
  };

  const handleMove = (e) => {
    if (!chart) return;
    const mouseX = getMouseX(e);
    const width = canvas.getBoundingClientRect().width;
    const maxT = currentLogicalMaxMs || (30 * 60 * 1000);

    let chartMin = chart.options.scales.x.min;
    let chartMax = chart.options.scales.x.max;
    if (chartMin === undefined || chartMin === null) chartMin = 0;
    if (chartMax === undefined || chartMax === null) chartMax = maxT;

    const leftPx = (chartMin / maxT) * width;
    const rightPx = (chartMax / maxT) * width;

    // Toggle cursor styles
    if (!isDraggingBrush) {
      if (Math.abs(mouseX - leftPx) <= 8 || Math.abs(mouseX - rightPx) <= 8) {
        canvas.style.cursor = "col-resize";
      } else if (mouseX >= leftPx && mouseX <= rightPx) {
        canvas.style.cursor = "grab";
      } else {
        canvas.style.cursor = "pointer";
      }
      return;
    }

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    animationFrameId = requestAnimationFrame(() => {
      const ratio = mouseX / width;
      // Dragging active
      if (dragStartType === "left-handle") {
        let newMin = ratio * maxT;
        newMin = Math.max(0, Math.min(chartMax - 1000, newMin)); // limit min x (at least 1s width)
        chart.options.scales.x.min = newMin;
        isManuallyZoomed = true;
      } else if (dragStartType === "right-handle") {
        let newMax = ratio * maxT;
        newMax = Math.min(maxT, Math.max(chartMin + 1000, newMax)); // limit max x (at least 1s width)
        chart.options.scales.x.max = newMax;
        isManuallyZoomed = true;
      } else if (dragStartType === "pan") {
        const deltaX = mouseX - dragStartX;
        const deltaMs = (deltaX / width) * maxT;
        let newMin = dragStartMin + deltaMs;
        let newMax = dragStartMax + deltaMs;

        // Bound viewport check
        if (newMin < 0) {
          newMax -= newMin;
          newMin = 0;
        } else if (newMax > maxT) {
          newMin -= (newMax - maxT);
          newMax = maxT;
        }

        chart.options.scales.x.min = newMin;
        chart.options.scales.x.max = newMax;
        isManuallyZoomed = true;
      }

      // Fast draw update
      if (typeof updateChart !== "undefined") {
        updateChart("none"); // suppresses full decimation calculation during smooth dragging
      } else {
        chart.update("none");
      }
      drawBrush();
    });
  };

  const handleEnd = () => {
    if (isDraggingBrush) {
      isDraggingBrush = false;
      // Do a clean update to rebuild decimation on final dragged boundaries
      if (typeof updateChart !== "undefined") {
        updateChart();
      } else {
        chart.update();
      }
      drawBrush();
    }
  };

  // Mouse Listeners
  canvas.addEventListener("mousedown", handleStart);
  window.addEventListener("mousemove", handleMove);
  window.addEventListener("mouseup", handleEnd);

  // Touch Support
  canvas.addEventListener("touchstart", handleStart, { passive: true });
  window.addEventListener("touchmove", handleMove, { passive: true });
  window.addEventListener("touchend", handleEnd);
}

// Global hook to draw brush on window resize or redraws
window.addEventListener("resize", drawBrush);

// Bind event listeners on DOM Load
document.addEventListener("DOMContentLoaded", function () {
  const selectEl = document.getElementById("chartType");
  if (selectEl) {
    selectEl.addEventListener("change", function (e) {
      changeChartType(e.target.value);
    });
    selectEl.addEventListener("input", function (e) {
      changeChartType(e.target.value);
    });
  }
  
  initBrushEvents();
  initCrosshair();
});

// -------------------------------------------------------------
// Phase Shading APIs
// -------------------------------------------------------------
function phaseAdd(startMs, endMs, label, colorRGB) {
  if (enblDbg) dbglog("phaseAdd: " + label + " [" + startMs + " to " + endMs + "] color: " + colorRGB);
  try {
    phases.push({
      start: parseFloat(startMs) || 0,
      end: parseFloat(endMs) || 0,
      label: label || "",
      color: colorRGB || "rgba(0, 0, 0, 0.05)"
    });
    if (chart) {
      chart.update();
    }
  } catch (e) {
    dbglog("phaseAdd exception: " + e);
  }
}

function phasesClear() {
  if (enblDbg) dbglog("phasesClear");
  try {
    phases = [];
    if (chart) {
      chart.update();
    }
  } catch (e) {
    dbglog("phasesClear exception: " + e);
  }
}

// -------------------------------------------------------------
// Interactive Hover Crosshair & Values Panel
// -------------------------------------------------------------
function initCrosshair() {
  const canvas = document.getElementById("myChart");
  const panel = document.getElementById("crosshairPanel");
  const timeEl = document.getElementById("crosshairTime");
  const valsEl = document.getElementById("crosshairValues");

  if (!canvas || !panel) return;

  const handleHover = (clientX) => {
    if (!chart || !chart.chartArea) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const chartArea = chart.chartArea;

    // Only activate crosshair if pointer is within chart margins
    if (x >= chartArea.left && x <= chartArea.right) {
      crosshairX = x;
      panel.style.display = "block";

      const xScale = chart.scales.x;
      const timeVal = xScale.getValueForPixel(x);

      // Display formatted time
      let totalSeconds = Math.floor(timeVal / 1000);
      let minutes = Math.floor(totalSeconds / 60);
      let seconds = totalSeconds % 60;
      timeEl.textContent = "Time: " + 
        (minutes < 10 ? "0" + minutes : minutes) + ":" + 
        (seconds < 10 ? "0" + seconds : seconds);

      // Fetch closest data points for each visible dataset
      let rowsHtml = "";
      const currentDatasets = chart.data.datasets || [];
      currentDatasets.forEach((dataset, datasetIdx) => {
        if (!dataset || !Array.isArray(dataset.data) || dataset.data.length === 0) return;

        // Binary search to find closest point
        const sourceData = dataset.data;
        let low = 0;
        let high = sourceData.length - 1;
        let closestPt = null;
        let minDiff = Infinity;

        while (low <= high) {
          let mid = (low + high) >> 1;
          let pt = sourceData[mid];
          let ptX = pt.x ?? pt.t ?? pt[0];
          let diff = Math.abs(ptX - timeVal);

          if (diff < minDiff) {
            minDiff = diff;
            closestPt = pt;
          }

          if (ptX < timeVal) {
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }

        if (closestPt) {
          let valY = closestPt.y ?? closestPt.v ?? closestPt[1];
          const scaleId = dataset.yAxisID || "y";
          const scale = chart.scales && chart.scales[scaleId];
          let unit = " °C";
          if (scale && scale.options && scale.options.title && scale.options.title.text) {
            const titleText = String(scale.options.title.text).toLowerCase();
            if (titleText.includes("bar") || titleText.includes("pressure") || titleText.includes("pres")) {
              unit = " bar";
            }
          } else if (scaleId.toLowerCase().includes("bar")) {
            unit = " bar";
          }
          if (valY !== undefined && valY !== null) {
            rowsHtml += `
              <div class="crosshair-val-row">
                <div class="crosshair-color-box" style="background-color: ${dataset.borderColor || dataset.backgroundColor || '#005c8a'};"></div>
                <span class="crosshair-label">${dataset.label || 'Trace'}:</span>
                <span class="crosshair-value">${valY.toFixed(2)}${unit}</span>
              </div>
            `;
          }
        }
      });

      valsEl.innerHTML = rowsHtml;
      chart.draw(); // Fast re-render of canvas crosshair line
    } else {
      hidePanel();
    }
  };

  const hidePanel = () => {
    if (crosshairX !== null) {
      crosshairX = null;
      panel.style.display = "none";
      if (chart) chart.draw();
    }
  };

  canvas.addEventListener("mousemove", (e) => {
    handleHover(e.clientX);
  });

  canvas.addEventListener("mouseleave", () => {
    hidePanel();
  });

  // Touch controls support for Unified Comfort Panels
  canvas.addEventListener("touchmove", (e) => {
    if (e.touches && e.touches[0]) {
      handleHover(e.touches[0].clientX);
    }
  }, { passive: true });

  canvas.addEventListener("touchend", () => {
    hidePanel();
  });
}

