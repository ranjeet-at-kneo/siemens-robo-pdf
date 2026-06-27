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

      let startIndex = 0;
      let endIndex = sourceData.length;

      for (let k = 0; k < sourceData.length; k++) {
        if (sourceData[k].x >= viewMin) {
          startIndex = k;
          break;
        }
      }
      for (let k = startIndex; k < sourceData.length; k++) {
        if (sourceData[k].x > viewMax) {
          endIndex = k;
          break;
        }
      }
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
