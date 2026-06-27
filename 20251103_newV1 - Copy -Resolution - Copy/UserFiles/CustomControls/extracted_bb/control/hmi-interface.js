/* debug functions ******************************************************/

// this is called in the code to log debug messages
function dbglog(txt) {
  let tmp = txt + " | " + new Date();
  WebCC.Events.fire("trace", tmp);
}

// this function sets dynamically dbglog, easier than attaching to property event...
function setTraceMode(enable) {
  WebCC.Events.fire("trace", "SetTraceMode = " + enable);
  enblDbg = enable ? true : false;
}

// this function toggles dynamically dbglog, easier than attaching to property event...
function toggleTraceMode() {
  enblDbg = !enblDbg;
  WebCC.Events.fire("trace", "ToggleTraceMode = " + enblDbg);
}

/* WebCC ****************************************************************/

WebCC.start(
  function (result) {
    if (result) {
      console.log("ChartJS Connected (v5)");
      try {
        Chart.defaults.devicePixelRatio = 1;
        Chart.defaults.font.family = "'Siemens Sans', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif";
        chart = new Chart("myChart", jsonCfg);
      } catch (e) {
        console.error("Errore init Chart", e);
        dbglog("WebCC chart.js init exception " + e);
      }
    } else {
      console.log("WebCC Connection Failed");
      dbglog("WebCC chart.js Connection Failed");
    }
  },
  {
    methods: {
      SetTraceMode: function (args) {
        setTraceMode(args.enable);
      },
      ToggleTraceMode: function () {
        toggleTraceMode();
      },
      SetLabelStart: function (args) {
        setLabelStart(args.text, args.visible);
      },
      SetLabelEnd: function (args) {
        setLabelEnd(args.text, args.visible);
      },
      EventsClear: function () {
        eventsClear();
      },
      EventsMaskSet: function (args) {
        eventsMaskSet(args.mask);
      },
      EventsColorSet: function (args) {
        eventsColorSet(args.type, args.colorRGB);
      },
      EventAdd: function (args) {
        eventAdd(args.type, args.time, args.text);
      },
      ZoomX: function (args) {
        zoomX(args.factor);
      },
      ZoomY: function (args) {
        zoomY(args.factor);
      },
      PanX: function (args) {
        panX(args.pixels);
      },
      PanY: function (args) {
        panY(args.pixels);
      },
      ResetZoom: function () {
        resetZoom();
      },
      TracesSetColor: function (args) {
        setTraceColor(args.index, args.colorRGB);
      },
      TracesSetThickness: function (args) {
        setTraceThickness(args.index, args.thickness);
      },
      DatasetAdd: function (args) {
        return datasetAdd(args.indexes);
      },
      DatasetSet: function (args) {
        datasetSet(args.index, args.indexes);
      },
      DatasetClear: function () {
        datasetClear();
      },
      DatasetShow: function (args) {
        datasetShow(args.index);
      },
      TracesAdd: function (args) {
        return tracesAdd(args.colorRGB, args.yAxisId, args.lblName);
      },
      TracesClear: function () {
        tracesClear();
      },
      AddAxisY: function (args) {
        addAxisY(args.axisId, args.position, args.gridcolor);
      },
      AxisSetTitle: function (args) {
        axisSetTitle(args.axisId, args.text, args.color);
      },
      AxisYClear: function () {
        axisYClear();
      },
      AxisYVisible: function (args) {
        axisYVisible(args.axisId, args.visible);
      },
      AxisYMinMax: function (args) {
        axisYMinMax(args.axisId, args.min, args.max);
      },
      TracesSetPoints: async function (args) {
        await tracesSetPoints(args.append, args.matrix);
      },
      UpdateChart: function (args) {
        if (chart) updateChart(args.none);
      },
      CheckTimeAxis: function () {
        checkAndTimeAxisUpdate();
      },
      GetExportSettings: function () {
        return getExportSettings();
      },
      GetChartBase64: function () {
        try {
          let img = getChartBase64();
          lastChartBase64 = img;
          dbglog("GetChartBase64 length=" + img.length);
          WebCC.Events.fire("chartBase64", img);
        } catch (e) {
          dbglog("GetChartBase64 exception: " + e);
        }
      },
    },
    events: ["trace", "chartBase64"],
    properties: {
      TimeWindowMinutes: function (val) {
        timeWindowMs = val * 60 * 1000;
        if (chart) chart.options.scales.x.max = timeWindowMs;
      },
      TimeExtensionMinutes: function (val) {
        timeExtensionMs = val * 60 * 1000;
      },
      EnableDebugLog: function (val) {
        enblDbg = val;
      },
      ChartBase64Data: function (val) {
        if (typeof val !== "undefined") {
          lastChartBase64 = val;
        }
        return lastChartBase64;
      },
    },
  },
  [],
  10000,
);
