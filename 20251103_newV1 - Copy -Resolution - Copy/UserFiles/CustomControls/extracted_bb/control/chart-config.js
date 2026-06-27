let timeWindowMs = 30 * 60 * 1000;
let timeExtensionMs = 5 * 60 * 1000;
let currentLogicalMaxMs = timeWindowMs;
let isManuallyZoomed = false;
let currentZoomY = 1.0;
let unzoomedYBounds = {};
let enblDbg = false;

let traces = [];
let datasets = [];
let chart = null;
let lastChartBase64 = "";
let currentChartMode = "line";
let phases = [];
let crosshairX = null;

let axisLabels = {
  start: { text: "", visible: false },
  end: { text: "", visible: false },
};

let eventsList = [];
let eventsMask = 0xffffffff;

let eventColors = {
  1: "black",
  2: "red",
  4: "blue",
};

/* plugins **************************************************************/

const axisLabelPlugin = {
  id: "axisLabelDrawer",
  afterDraw(chart) {
    if (enblDbg) dbglog("axisLabelPlugin -> afterDraw");
    const ctx = chart.ctx;
    const { left, right, bottom } = chart.chartArea;
    const yPos = chart.scales.x.bottom + 15;

    ctx.save();
    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "#333333";

    if (axisLabels.start.visible) {
      ctx.textAlign = "left";
      ctx.fillText(axisLabels.start.text, left, yPos);
    }

    if (axisLabels.end.visible) {
      ctx.textAlign = "right";
      ctx.fillText(axisLabels.end.text, right, yPos);
    }

    ctx.restore();
  },
};

const eventDrawerPlugin = {
  id: "eventDrawer",
  afterDatasetsDraw(chart, args, options) {
    if (enblDbg) dbglog("eventDrawerPlugin -> afterDatasetDraw");
    const ctx = chart.ctx;
    const xAxis = chart.scales.x;
    const yAxis =
      chart.scales[Object.keys(chart.scales).find((k) => k !== "x")];

    if (!xAxis || !yAxis) return;

    const minTime = xAxis.min;
    const maxTime = xAxis.max;
    const topY = chart.chartArea.top;
    const bottomY = chart.chartArea.bottom;

    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.font = "12px Arial";

    eventsList.forEach((ev) => {
      if ((ev.type & eventsMask) === 0) return;
      if (ev.time < minTime || ev.time > maxTime) return;

      const xPos = xAxis.getPixelForValue(ev.time);
      let color = eventColors[ev.type] || "black";

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;
      ctx.moveTo(xPos, topY);
      ctx.lineTo(xPos, bottomY);
      ctx.stroke();

      ctx.save();
      ctx.translate(xPos, topY + 10);
      ctx.rotate(Math.PI / 2);
      ctx.fillText(ev.text, 0, 0);
      ctx.restore();
    });

    ctx.restore();
  },
};

const phaseShadingPlugin = {
  id: "phaseShading",
  beforeDraw(chart) {
    if (typeof phases === "undefined" || !phases || phases.length === 0) return;
    const ctx = chart.ctx;
    const chartArea = chart.chartArea;
    const xScale = chart.scales.x;
    if (!xScale) return;

    ctx.save();
    phases.forEach((phase) => {
      const xStart = xScale.getPixelForValue(phase.start);
      const xEnd = xScale.getPixelForValue(phase.end);
      const leftPx = Math.max(chartArea.left, Math.min(chartArea.right, xStart));
      const rightPx = Math.max(chartArea.left, Math.min(chartArea.right, xEnd));
      const width = rightPx - leftPx;

      if (width > 0) {
        // Fill background
        ctx.fillStyle = phase.color || "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(leftPx, chartArea.top, width, chartArea.bottom - chartArea.top);

        // Draw vertical phase border
        ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rightPx, chartArea.top);
        ctx.lineTo(rightPx, chartArea.bottom);
        ctx.stroke();

        // Draw phase label text centered at the top
        ctx.fillStyle = "#64748b";
        ctx.font = "bold 11px Arial, sans-serif";
        ctx.textBaseline = "top";
        ctx.textAlign = "center";
        ctx.fillText(phase.label || "", leftPx + width / 2, chartArea.top + 6);
      }
    });
    ctx.restore();
  }
};

const crosshairLinePlugin = {
  id: "crosshairLine",
  afterDatasetsDraw(chart) {
    if (typeof crosshairX !== "undefined" && crosshairX !== null) {
      const ctx = chart.ctx;
      const chartArea = chart.chartArea;
      if (!chartArea) return;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(crosshairX, chartArea.top);
      ctx.lineTo(crosshairX, chartArea.bottom);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#475569";
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();
    }
  }
};

/* chart definition *****************************************************/

var jsonCfg = {
  type: "line",
  data: { datasets: [] },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    layout: {
      padding: { bottom: 20, left: 0, right: 0, top: 0 },
    },
    interaction: { mode: "nearest", axis: "x", intersect: false },
    plugins: {
      legend: {
        display: true,
        labels: {
          font: {
            size: 20,
          },
          boxWidth: 14,
          boxHeight: 8,
        },
      },
      tooltip: {
        callbacks: {
          title: function (tooltipItems) {
            if (!tooltipItems.length) return "";
            let value = tooltipItems[0].parsed.x;
            let totalSeconds = Math.floor(value / 1000);
            let minutes = Math.floor(totalSeconds / 60);
            let seconds = totalSeconds % 60;

            return (
              "Time: " +
              (minutes < 10 ? "0" + minutes : minutes) +
              ":" +
              (seconds < 10 ? "0" + seconds : seconds)
            );
          },
        },
      },
      zoom: {
        pan: {
          enabled: false,
          mode: "xy",
        },
        zoom: {
          wheel: { enabled: false },
          pinch: { enabled: false },
          mode: "xy",
        },
      },
      decimation: {
        enabled: false,
        algorithm: "lttb",
        samples: 800,
        threshold: 1000,
      },
    },
    elements: {
      point: { radius: 0 },
      line: { borderWidth: 1, tension: 0 },
    },
    scales: {
      x: {
        type: "linear",
        position: "bottom",
        min: 0,
        max: timeWindowMs,
        bounds: "ticks",
        ticks: {
          autoSkip: true,
          maxRotation: 0,
          callback: function (value) {
            var totalSeconds = Math.floor(value / 1000);
            var minutes = Math.floor(totalSeconds / 60);
            var seconds = totalSeconds % 60;
            return (
              (minutes < 10 ? "0" + minutes : minutes) +
              ":" +
              (seconds < 10 ? "0" + seconds : seconds)
            );
          },
        },
      },
    },
  },
  plugins: [eventDrawerPlugin, axisLabelPlugin, phaseShadingPlugin, crosshairLinePlugin],
};
