function newPDF(paper, orientation, margin) {
   if (enblDbg) dbglog("calling newPDF paper=" + paper + " orientation=" + orientation);
   try {
     const pdfOptions = {
       size:  paper,               // 'A4' o 'LETTER'
       layout: orientation,        // 'portrait' 'landscape'
       bufferPages: true,          // bufferizza le pagine per contarle
       ownerPassword: 'TH54321!',  // Password per le modifiche
       userPassword: '',           // Password per l'apertura
       permissions: {
         modifying: false,
         annotating: false,
         copying: true,
         printing: 'highResolution'
       },
       margin: margin,
       pdfVersion: '1.4' // Forza una versione compatibile con la crittografia standard
     };
     let handle = ++count;
     let doc = new PDFDocument(pdfOptions);
     if (typeof doc.end !== 'function') {
       dbglog("errori ed orrori");
     }
     docs[handle] = doc;
     streams[handle] = doc.pipe(blobStream());
     if (enblDbg) dbglog("docs returned handle=" + handle);
     return handle;
   }
   catch (e) {
     dbglog("exception newPDF: " + e);
     throw e;
   }
}

function getPageSize(handle) {
  if (enblDbg) dbglog("calling getPageSize handle=" + handle);
  try {
    let doc = docs[handle];
    let ret = { width: doc.page.width, height: doc.page.height};
    if (enblDbg) dbglog("getPageSize about to return " + JSON.stringify(ret));
    return ret;
  }
  catch (e) {
     dbglog("exception getPageSize: " + e);
     throw e;
  }
}

function getTextSize(handle, text, w) {
  let opt;
  if (w !== undefined) {
    opt = {width: w};
  }
  let doc = docs[handle];
  let wret = doc.widthOfString(text);
  let hret = doc.heightOfString(text, opt);
  return { width: wret, height: hret };
}

function setFont(handle, name) {
  if (enblDbg) dbglog("calling setFont handle=" + handle + " name=" + name);
  try {
    let doc = docs[handle];
    doc.font(name);
  }
  catch (e) {
     dbglog("exception setFont: " + e);
  }
}

function setFontSize(handle, size) {
  if (enblDbg) dbglog("calling setFontSize handle=" + handle + " size=" + size);
  try {
    let doc = docs[handle];
    doc.fontSize(size);
  }
  catch (e) {
     dbglog("exception setFontSize: " + e);
  }
}

function writeTextAt(handle, txt, x, y) {
  if (enblDbg) dbglog("calling writeTextAt handle=" + handle + " text=" + txt + " x=" + x + " y=" + y);
  try {
    let doc = docs[handle];
    doc.text(txt, x, y);
  }
  catch (e) {
     dbglog("exception writeTexAt: " + e);
  }
}

function writeTextAtWithFormat(handle, txt, x, y, w, al) {
  if (enblDbg) dbglog("calling writeTextAtWithFormat handle=" + handle + " text=" + txt + " x=" + x + " y=" + y + " w=" + w + " al=" + al);
  try {
    let doc = docs[handle];
    doc.text(txt, x, y, {width: w, align: al});
  }
  catch (e) {
     dbglog("exception writeTextAtWithFormat: " + e);
  }
}

function addPage(handle, options) {
  let doc = docs[handle];
  doc.addPage(options);
}

function rectStroke(handle, x, y, w, h) {
  if (enblDbg) dbglog("calling rectStroke handle=" + handle + " x=" + x + " y=" + y + " w=" + w + " h=" + h);
  try {
    let doc = docs[handle];
    doc.rect(x, y, w, h).stroke();
  }
  catch (e) {
    dbglog("exception rectStroke: " + e);
  }
}

function rectFill(handle, x, y, w, h) {
  if (enblDbg) dbglog("calling rectFill handle=" + handle + " x=" + x + " y=" + y + " w=" + w + " h=" + h);
  try {
    let doc = docs[handle];
    doc.rect(x, y, w, h).fill();
  }
  catch (e) {
    dbglog("exception rectFill: " + e);
  }
}

function rectFillAndStroke(handle, x, y, w, h) {
  if (enblDbg) dbglog("calling rectFillAndStroke handle=" + handle + " x=" + x + " y=" + y + " w=" + w + " h=" + h);
  try {
    let doc = docs[handle];
    doc.rect(x, y, w, h).fillAndStroke();
  }
  catch (e) {
    dbglog("exception rectFillAndStroke: " + e);
  }
}

function stroke(handle, color) {
  if (enblDbg) dbglog("calling stroke handle=" + handle + " color=" + color);
   try {
     let doc = docs[handle];
     doc.strokeColor(color);
   }
  catch (e) {
    dbglog("exception stroke: " + e);
  }
}

function fill(handle, color) {
  if (enblDbg) dbglog("calling fill handle=" + handle + " color=" + color);
  try {
    let doc = docs[handle];
    doc.fillColor(color);
  }
  catch (e) {
    dbglog("exception fill: " + e);
  }
}

function drawLine(handle, x1, y1, x2, y2, thickness, color) {
  if (enblDbg) dbglog("calling drawLine handle=" + handle + " (" + x1 + "," + y1 + ")(" + x2 + "," + y2 + ") thickness=" + thickness + " color=" + color);
  try {
    let doc = docs[handle];
    doc.moveTo(x1, y1).lineTo(x2, y2).lineWidth(thickness).stroke(color);
  }
  catch (e) {
    dbglog("exception drawLine: " + e);
  }
}
