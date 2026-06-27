// this function is called from outside to allocate a trace
function tracesAdd(colorRGB, yAxisId, lblName) {
  try {
    let newDataArray = [];
    let newTrace = {
      label: lblName,
      backgroundColor: colorRGB,
      borderColor: colorRGB,
      borderWidth: 3,
      fill: false,
      tension: 0,
      pointRadius: 0,
      data: newDataArray, // con la funzione di decimazione contiene solo i dati decimati
      _fullData: newDataArray, // contiene i dati originali, da cancellare se si rimuove la decimazione e rimettere "data" in tutte le altre ricorrenze
      yAxisID: yAxisId,
      normalized: true,
      parsing: false,
      spanGaps: false,
    };
    traces.push(newTrace);
    if (enblDbg)
      dbglog(
        "tracesAdd added trace " +
          (traces.length - 1) +
          " with name " +
          lblName,
      );
  } catch (e) {
    dbglog("tracesAdd exception: " + e);
  }
  return traces.length - 1;
}

// this function is called from outside in two different ways
// 1. Set all traces in one single call, in which case it is
//    called with append set to false and receives a list
//    of traces where each element is an array of {x,y}
// 2. Add items to all traces in one single call, in which
//    case it is called with append set to true and receives
//    an array of samples where each element is an array with {x,y} for all traces
function tracesSetPoints(append, matrix) {
  try {
    if (enblDbg) dbglog("tracesSetPoints called with append=" + append);
    if (append) {
      // case 2
      if (enblDbg)
        dbglog(
          "tracesSetPoints adding " +
            matrix.length +
            " samples to all traces",
        );
      for (let i = 0; i < matrix.length; i++) {
        let tmp = matrix[i];
        for (let j = 0; j < tmp.length && j < traces.length; j++) {
          let tmpj = tmp[j];
          traces[j]._fullData.push(tmpj[0]);
        }
      }
    } else {
      // case 1
      if (enblDbg)
        dbglog("tracesSetPoints adding " + matrix.length + " traces");
      for (let i = 0; i < matrix.length; i++) {
        traces[i]._fullData = matrix[i];
      }
    }
  } catch (e) {
    dbglog("tracesSetPoints exception: " + e);
  }
}

// this function is called from outside to add an axis Y
function addAxisY(axisId, position, gridcolor) {
  if (enblDbg)
    dbglog("addAxisY axisId=" + axisId + " position=" + position);
  try {
    if (!jsonCfg.options.scales[axisId]) {
      jsonCfg.options.scales[axisId] = {
        type: "linear",
        display: true,
        position: position,
        grid: {
          color: gridcolor,
          display: true,
        },
      };
      if (chart) {
        chart.options.scales[axisId] = jsonCfg.options.scales[axisId];
        if (enblDbg)
          dbglog("addAxisY done " + chart.options.scales.length);
      }
    }
  } catch (e) {
    dbglog("addAxisY exception: " + e);
  }
}

// this function is called from outside to set the name and color of an Y axis
function axisSetTitle(axisId, text, color) {
  try {
    let titleColor = color || "#666";
    let showTitle = text && text !== "";

    const applyTitle = (scaleObj) => {
      if (!scaleObj) return;

      scaleObj.title = {
        display: showTitle,
        text: text,
        color: titleColor,
        font: {
          size: 14,
          weight: "bold",
        },
        padding: { top: 4, bottom: 4 },
      };
    };

    if (jsonCfg.options.scales[axisId]) {
      applyTitle(jsonCfg.options.scales[axisId]);
    }

    if (chart && chart.options.scales[axisId]) {
      applyTitle(chart.options.scales[axisId]);
    }
  } catch (e) {
    dbglog("axisSetTitle exception: " + e);
  }
}

// this function is called from outside to set min and max of an Y axis
function axisYMinMax(axisId, min, max) {
  try {
    const applyScale = (scaleObj) => {
      if (!scaleObj) return;

      if (isNaN(min) || min === null) delete scaleObj._origMin;
      else scaleObj._origMin = min;

      if (isNaN(max) || max === null) delete scaleObj._origMax;
      else scaleObj._origMax = max;
    };

    if (jsonCfg.options.scales[axisId])
      applyScale(jsonCfg.options.scales[axisId]);
    if (chart && chart.options.scales[axisId])
      applyScale(chart.options.scales[axisId]);
  } catch (e) {
    dbglog("axisYMinMax exception: " + e);
  }
}

// this function is called from outside to clear all Y axis defined
function axisYClear() {
  try {
    Object.keys(jsonCfg.options.scales).forEach((key) => {
      if (key !== "x") delete jsonCfg.options.scales[key];
    });
    if (chart) {
      Object.keys(chart.options.scales).forEach((key) => {
        if (key !== "x") delete chart.options.scales[key];
      });
    }
  } catch (e) {
    dbglog("axisYClear exception: " + e);
  }
}

// this function is cslled from outside to make an Y axis visible or not
function axisYVisible(axisId, visible) {
  try {
    if (jsonCfg.options.scales[axisId])
      jsonCfg.options.scales[axisId].display = visible;
    if (chart && chart.options.scales[axisId])
      chart.options.scales[axisId].display = visible;
  } catch (e) {
    dbglog("axisYVisible exception: " + e);
  }
}

// this function is called from outside to set a start date label
function setLabelStart(text, visible) {
  try {
    axisLabels.start.text = text || "";
    axisLabels.start.visible =
      String(visible) === "true" || visible === true || visible === 1;
  } catch (e) {
    dbglog("setLabelStart exception: " + e);
  }
}

// this function is called from outside to set an end date label
function setLabelEnd(text, visible) {
  try {
    axisLabels.end.text = text || "";
    axisLabels.end.visible =
      String(visible) === "true" || visible === true || visible === 1;
  } catch (e) {
    dbglog("setLabelEnd exception: " + e);
  }
}

// this function is called from outside to add an event
function eventAdd(type, time, text) {
  try {
    if (time === undefined || time === null) return;
    eventsList.push({
      type: Number(type),
      time: Number(time),
      text: String(text || ""),
    });
  } catch (e) {
    dbglog("eventAdd exception: " + e);
  }
}

// this function is called from outside to clear all events
function eventsClear() {
  eventsList = [];
}

// this function is called from outside to set mask of events to be shown
function eventsMaskSet(mask) {
  if (mask === undefined || mask === null) return;
  eventsMask = Number(mask);
}

// this function is called from outside to set the color of an event
function eventsColorSet(type, colorRGB) {
  if (!type || !colorRGB) return;
  eventColors[type] = colorRGB;
}

// this function is called from outside to clear all traces
function tracesClear() {
  try {
    traces.forEach((t) => {
      t._fullData.length = 0; // svuota la memoria totale
      t.data.length = 0; // svuota la memoria visiva
    });
    currentLogicalMaxMs = timeWindowMs;
  } catch (e) {
    dbglog("tracesClear exception: " + e);
  }
}

// this function is called from outside to set the color of a trace
function setTraceColor(index, colorRGB) {
  try {
    if (traces[index]) traces[index].borderColor = colorRGB;
  } catch (e) {
    dbglog("setTraceColor exception: " + e);
  }
}

// this function is called from outside to set the thickness of a trace
function setTraceThickness(index, thickness) {
  try {
    if (traces[index]) traces[index].borderWidth = thickness;
  } catch (e) {
    dbglog("setTraceThickness exception: " + e);
  }
}

// this function is called from outside to add a dataset
function datasetAdd(indexes) {
  if (enblDbg) dbglog("datasetAdd(" + indexes + ")");

  try {
    if (!Array.isArray(indexes)) return -1;
    let newGroup = [];
    for (let i = 0; i < indexes.length; i++) {
      if (traces[indexes[i]]) newGroup.push(traces[indexes[i]]);
    }
    datasets.push(newGroup);
    if (enblDbg) dbglog("datasetAdd done, total is " + datasets.length);
  } catch (e) {
    dbglog("datasetAdd exception: " + e);
  }
  return datasets.length - 1;
}

// this function is called from outside to overwrite a dataset definition
function datasetSet(index, indexes) {
  if (enblDbg) dbglog("datasetSet index=" + index);

  try {
    if (index === undefined || index === null || index < 0) return;
    if (!Array.isArray(indexes)) return;

    let newGroup = [];
    for (let i = 0; i < indexes.length; i++) {
      if (traces[indexes[i]]) newGroup.push(traces[indexes[i]]);
    }

    let isCurrentlyVisible = false;
    if (
      chart &&
      datasets[index] &&
      chart.data.datasets === datasets[index]
    ) {
      isCurrentlyVisible = true;
    }

    datasets[index] = newGroup;

    if (isCurrentlyVisible) {
      jsonCfg.data.datasets = newGroup;
      chart.data.datasets = newGroup;
    }
  } catch (e) {
    dbglog("datasetSet exception: " + e);
  }
}

// this function is called from outside to show one of the registered dataset
function datasetShow(index) {
  if (enblDbg) dbglog("datasetShow index=" + index);

  try {
    if (datasets[index]) {
      jsonCfg.data.datasets = datasets[index];

      // disable all y axes first
      Object.keys(jsonCfg.options.scales).forEach((key) => {
        if (key !== "x") jsonCfg.options.scales[key].display = false;
      });
      if (chart) {
        Object.keys(chart.options.scales).forEach((key) => {
          if (key !== "x") chart.options.scales[key].display = false;
        });
      }

      // list traces to determine which axes should be displayed
      let trcs = datasets[index];
      for (let i = 0; i < trcs.length; i++) {
        let trc = trcs[i];
        jsonCfg.options.scales[trc.yAxisID].display = true;
        if (chart) chart.options.scales[trc.yAxisID].display = true;
      }

      if (enblDbg)
        dbglog("datasetShow updated json datasets " + new Date());
      if (chart) {
        chart.data.datasets = datasets[index];
        if (enblDbg) dbglog("updated also json datasets " + new Date());
      }
    }
  } catch (e) {
    dbglog("datasetShow exception: " + e);
  }
}

// this function is called from outside to set a specific dataset
function datasetClear() {
  datasets = [];
}

// this is called from the outside to force chart update
function updateChart(none) {
  if (enblDbg) dbglog("UpdateChart start, whith none=" + none);
  updateDecimation(); // ricalcola i punti prima di disegnare
  try {
    if (none) {
      chart.update("none");
    } else {
      chart.update();
    }
    if (enblDbg) dbglog("UpdateChart done");
  } catch (e) {
    dbglog("updateChart exception: " + e);
  }
}
