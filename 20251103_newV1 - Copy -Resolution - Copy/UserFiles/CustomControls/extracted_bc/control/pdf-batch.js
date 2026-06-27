function embedImageAt(handle, buf, x, y) {
  if (enblDbg) dbglog("calling embedImageAt handle=" + handle + " x=" + x + " y=" + y);
  try {
    let doc = docs[handle];
    const svgText = parseSvgInput(buf);
    if (svgText) {
      const handled = drawSvgToPdf(handle, svgText, x, y, null, null);
      if (handled) return;
    }
    doc.image(buf, x, y);
  }
  catch (e) {
     dbglog("exception embedImageAt: " + e);
  }
}

function embedImageAtToFit(handle, buf, x, y, w, alh, alv) {
  if (enblDbg) dbglog("calling embedImageAtToFit handle=" + handle + " x=" + x + " y=" + y + " w=" + w + " alh=" + alh + " alv=" + alv);
  try {
    let doc = docs[handle];
    const svgText = parseSvgInput(buf);
    if (svgText) {
      const handled = drawSvgToPdf(handle, svgText, x, y, w, null);
      if (handled) return;
    }
    doc.image(buf, x, y, {width: w, align: alh, valign: alv});
  }
  catch (e) {
     dbglog("exception embedImageToFitAt: " + e);
  }
}

function getNumberOfPages(handle) {
  if (enblDbg) dbglog("calling getNumberOfPages handle=" + handle);
  try {
    let doc = docs[handle];
    const range = doc.bufferedPageRange();
    return range.count;
  }
  catch (e) {
     dbglog("exception getNumberOfPages: " + e);
  }
}

function switchToPage(handle, page) {
  if (enblDbg) dbglog("calling switchToPage handle=" + handle + " page=" + page);
  try {
    let doc = docs[handle];
    doc.switchToPage(page);
  }
  catch (e) {
     dbglog("exception switchToPage: " + e);
  }
}

function endPDFAndBase64(handle) {
  if (enblDbg) dbglog("calling endPDFAndBase64 handle=" + handle);
 
  return new Promise((resolve, reject) => {
    let stream = streams[handle];
  
    stream.on('finish', () => {
      try {
        const blob = stream.toBlob();
        const reader = new FileReader();

        reader.onloadend = () => {
          const parts = reader.result.split(',');
          const base64 = parts[1]; // Prendiamo solo i dati, senza il prefisso data:...
          if (enblDbg) dbglog("resolving base64");
          resolve(base64);
        };

        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(blob);
      }
      catch (e2) {
        reject(e2);
      }
    });

    stream.on('error', (err) => reject(err));

    try {
      let doc = docs[handle];
      doc.end();
      docs[handle]    = undefined;
      streams[handle] = undefined;
    }
    catch (e) {
      dbglog("exception during doc.end: " + e);
      reject(e);
    }
  });
}

function batchPDF(handle, list) {
  if (enblDbg) dbglog("calling batchPDF handle=" + handle + " on " + list.length + " commands");
  try {
    for (let i = 0; i < list.length; i++) {
      let args = list[i];
      switch (args.cmd) {
        case "SetFont":
          setFont(handle, args.name);
          break;
        case "SetFontSize":
          setFontSize(handle, args.size);
          break;
        case "WriteTextAt":
          writeTextAt(handle, args.text, args.x, args.y);
          break;
        case "WriteTextAtWithFormat":
          writeTextAtWithFormat(handle, args.text, args.x, args.y, args.w, args.al);
          break;
        case "EmbedImageAt":
          embedImageAt(handle, args.buffer, args.x, args.y);
          break;
        case "EmbedImageAtToFit":
          embedImageAtToFit(handle, args.buffer, args.x, args.y, args.w, args.alh, args.alv);
          break;
        case "SwitchToPage":
          switchToPage(handle, args.page);
          break;
        case "AddPage":
          addPage(handle);
          break;
        case "RectStroke":
          rectStroke(handle, args.x, args.y, args.w, args.h);
          break;
        case "RectFill":
          rectFill(handle, args.x, args.y, args.w, args.h);
          break;
        case "RectFillAndStroke":
          rectFillAndStroke(handle, args.x, args.y, args.w, args.h);
          break;
        case "Stroke":
          stroke(handle, args.color);
          break;
        case "Fill":
          fill(handle, args.color);
          break;
        case "DrawLine":
          drawLine(handle, args.x1, args.y1, args.x2, args.y2, args.thickness, args.color);
          break;
      }
    }
  }
  catch (e) {
    dbglog("exception batchPDF: " + e);
  }
}
