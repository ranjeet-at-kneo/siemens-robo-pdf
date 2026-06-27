/* helper functions ******************************************************/

function uint8ToBase64(uint8Array) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let base64 = "";
  let i;
  const len = uint8Array.length;

  // Processa 3 byte alla volta per ottenere 4 caratteri Base64
  for (i = 0; i < len - 2; i += 3) {
    base64 += chars[uint8Array[i] >> 2];
    base64 += chars[((uint8Array[i] & 3) << 4) | (uint8Array[i + 1] >> 4)];
    base64 += chars[((uint8Array[i + 1] & 15) << 2) | (uint8Array[i + 2] >> 6)];
    base64 += chars[uint8Array[i + 2] & 63];
  }

  // Gestione del padding finale (=) se la lunghezza non e multiplo di 3
  if (i === len - 2) {
    base64 += chars[uint8Array[i] >> 2];
    base64 += chars[((uint8Array[i] & 3) << 4) | (uint8Array[i + 1] >> 4)];
    base64 += chars[(uint8Array[i + 1] & 15) << 2];
    base64 += "=";
  } else if (i === len - 1) {
    base64 += chars[uint8Array[i] >> 2];
    base64 += chars[(uint8Array[i] & 3) << 4];
    base64 += "==";
  }

  return base64;    
}

function encode(text, encoding) {
  if (enblDbg) dbglog("calling encode text.length=" + text.length + " as " + encoding);
  try {
    const encoder = new TextEncoder(encoding);
    let uint8 = encoder.encode(text);
    let base64 = uint8ToBase64(uint8);
    return base64;
  }
  catch (e) {
    dbglog("exception encode: " + e);
  }
}

function parseSvgInput(buf) {
  if (!buf) return null;
  const value = String(buf).trim();
  if (!value) return null;
  if (value.indexOf("data:image/svg+xml") === 0) {
    const commaIndex = value.indexOf(",");
    if (commaIndex >= 0) {
      const encoded = value.substring(commaIndex + 1);
      try {
        return decodeURIComponent(encoded);
      } catch (e) {
        try {
          return atob(encoded);
        } catch (err) {
          return null;
        }
      }
    }
  }
  if (value.indexOf("<svg") === 0 || value.indexOf("<?xml") === 0) {
    return value;
  }
  return null;
}
