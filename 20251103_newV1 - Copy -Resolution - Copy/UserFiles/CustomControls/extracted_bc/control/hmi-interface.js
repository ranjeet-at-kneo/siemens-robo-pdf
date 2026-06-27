/* WebCC ****************************************************************/

WebCC.start(
  function(result) {
    if (result) {
      console.log("ChartJS Connected (v5)");
    }
    else {
      console.log("WebCC Connection Failed");
      dbglog("WebCC chart.js Connection Failed");
    }
  },
  {
    methods: {
        SetTraceMode:          function(args) { setTraceMode(args.enable); },
        NewPDF:                function(args) { return newPDF(args.paper, args.orientation, args.margin); },
        GetPageSize:           function(args) { return getPageSize(args.handle); },
        GetTextSize:           function(args) { return getTextSize(args.handle, args.text, args.w); },
        SetFont:               function(args) { setFont(args.handle, args.name); },
        SetFontSize:           function(args) { setFontSize(args.handle, args.size); },
        WriteTextAt:           function(args) { writeTextAt(args.handle, args.text, args.x, args.y); },
        WriteTextAtWithFormat: function(args) { writeTextAtWithFormat(args.handle, args.text, args.x, args.y, args.w, args.al); },
        EmbedImageAt:          function(args) { embedImageAt(args.handle, args.buffer, args.x, args.y);  },
        EmbedImageAtToFit:     function(args) { embedImageAtToFit(args.handle, args.buffer, args.x, args.y, args.w, args.alh, args.alv);  },
        SwitchToPage:          function(args) { switchToPage(args.handle, args.page); },
        GetNumberOfPages:      function(args) { return getNumberOfPages(args.handle); },
        EndPDFAndBase64:       function(args) { return endPDFAndBase64(args.handle); },
        AddPage:               function(args) { addPage(args.handle, args.orientation); },
        RectStroke:            function(args) { rectStroke(args.handle, args.x, args.y, args.w, args.h); },
        RectFill:              function(args) { rectFill(args.handle, args.x, args.y, args.w, args.h); },
        RectFillAndStroke:     function(args) { rectFillAndStroke(args.handle, args.x, args.y, args.w, args.h); },
        Stroke:                function(args) { stroke(args.handle, args.color); },
        Fill:                  function(args) { fill(args.handle, args.color); },
        DrawLine:              function(args) { drawLine(args.handle, args.x1, args.y1, args.x2, args.y2, args.thickness, args.color);},
        BatchPDF:              function(args) { batchPDF(args.handle, args.list); },
        Encode:                function(args) { return encode(args.text, args.encoding); }
    },
    events: ["trace"],
    properties: {
        EnableDebugLog: function(val) {
            enblDbg = val;
        }
    }
  }, [], 10000
);
