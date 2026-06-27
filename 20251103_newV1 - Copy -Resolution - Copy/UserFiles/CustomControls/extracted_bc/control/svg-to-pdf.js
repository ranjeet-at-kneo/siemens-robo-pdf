function drawSvgToPdf(handle, svgText, x, y, targetWidth, targetHeight) {
  const doc = docs[handle];
  if (!doc || !svgText) return false;

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(svgText, "image/svg+xml");
    const svgNode = xmlDoc.documentElement;
    if (!svgNode || svgNode.nodeName.toLowerCase() !== "svg") return false;

    const widthAttr = parseFloat(svgNode.getAttribute("width")) || 0;
    const heightAttr = parseFloat(svgNode.getAttribute("height")) || 0;
    const viewBox = svgNode.getAttribute("viewBox") || "";
    let vbWidth = widthAttr;
    let vbHeight = heightAttr;
    if (viewBox) {
      const parts = viewBox.split(/\s+/).map((item) => parseFloat(item));
      if (parts.length >= 4) {
        vbWidth = parts[2] || vbWidth;
        vbHeight = parts[3] || vbHeight;
      }
    }

    const svgW = vbWidth || widthAttr || 800;
    const svgH = vbHeight || heightAttr || 600;
    const scaleX = targetWidth ? targetWidth / svgW : 1;
    const scaleY = targetHeight ? targetHeight / svgH : (targetWidth ? targetWidth / svgW : 1);

    doc.save();
    doc.translate(x, y);
    doc.scale(scaleX, scaleY);

    const renderNode = (node, depth) => {
      if (!node || !node.tagName) return;
      const tag = String(node.tagName).toLowerCase();

      let transformed = false;
      const transformAttr = node.getAttribute("transform");
      if (transformAttr) {
        doc.save();
        transformed = true;

        // Support translate(dx, dy) or translate(dx)
        const translateMatch = transformAttr.match(/translate\(([-\d.]+)(?:\s*,\s*([-\d.]+))?\)/);
        if (translateMatch) {
          const tx = parseFloat(translateMatch[1]);
          const ty = parseFloat(translateMatch[2]) || 0;
          doc.translate(tx, ty);
        }

        // Support rotate(angle) or rotate(angle, cx, cy)
        const rotateMatch = transformAttr.match(/rotate\(([-\d.]+)(?:\s*,\s*([-\d.]+)\s*,\s*([-\d.]+))?\)/);
        if (rotateMatch) {
          const angle = parseFloat(rotateMatch[1]);
          if (rotateMatch[2] && rotateMatch[3]) {
            const cx = parseFloat(rotateMatch[2]);
            const cy = parseFloat(rotateMatch[3]);
            doc.translate(cx, cy);
            doc.rotate(angle);
            doc.translate(-cx, -cy);
          } else {
            doc.rotate(angle);
          }
        }
      }

      if (tag === "line") {
        const x1 = parseFloat(node.getAttribute("x1")) || 0;
        const y1 = parseFloat(node.getAttribute("y1")) || 0;
        const x2 = parseFloat(node.getAttribute("x2")) || 0;
        const y2 = parseFloat(node.getAttribute("y2")) || 0;
        const stroke = node.getAttribute("stroke") || "#000000";
        const width = parseFloat(node.getAttribute("stroke-width")) || 1;
        const dashAttr = node.getAttribute("stroke-dasharray");
        
        doc.save();
        if (dashAttr) {
          const dashArray = dashAttr.split(/\s*,\s*|\s+/).map(Number);
          doc.dash(dashArray[0] || 2, { space: dashArray[1] || dashArray[0] || 2 });
        }
        doc.lineWidth(width);
        doc.strokeColor(stroke);
        doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
        doc.restore();
      }
      else if (tag === "rect") {
        const rectX = parseFloat(node.getAttribute("x")) || 0;
        const rectY = parseFloat(node.getAttribute("y")) || 0;
        const rectW = parseFloat(node.getAttribute("width")) || 0;
        const rectH = parseFloat(node.getAttribute("height")) || 0;
        const fill = node.getAttribute("fill") || "none";
        const stroke = node.getAttribute("stroke") || "none";
        const strokeWidth = parseFloat(node.getAttribute("stroke-width")) || 0;
        doc.rect(rectX, rectY, rectW, rectH);
        if (fill !== "none") {
          doc.fillColor(fill).fill();
        }
        if (stroke !== "none" && strokeWidth > 0) {
          doc.lineWidth(strokeWidth);
          doc.strokeColor(stroke).stroke();
        }
      }
      else if (tag === "polyline") {
        const pointsAttr = node.getAttribute("points") || "";
        const points = pointsAttr.trim().split(/\s+/).filter(Boolean);
        if (points.length > 1) {
          const firstPoint = points[0].split(",");
          const x0 = parseFloat(firstPoint[0]) || 0;
          const y0 = parseFloat(firstPoint[1]) || 0;
          doc.moveTo(x0, y0);
          points.slice(1).forEach((point) => {
            const parts = point.split(",");
            if (parts.length >= 2) {
              doc.lineTo(parseFloat(parts[0]) || 0, parseFloat(parts[1]) || 0);
            }
          });
          const stroke = node.getAttribute("stroke") || "#000000";
          const width = parseFloat(node.getAttribute("stroke-width")) || 1;
          doc.lineWidth(width);
          doc.strokeColor(stroke).stroke();
        }
      }
      else if (tag === "circle") {
        const cx = parseFloat(node.getAttribute("cx")) || 0;
        const cy = parseFloat(node.getAttribute("cy")) || 0;
        const r = parseFloat(node.getAttribute("r")) || 0;
        const fill = node.getAttribute("fill") || "#000000";
        if (r > 0) {
          doc.circle(cx, cy, r);
          doc.fillColor(fill).fill();
        }
      }
      else if (tag === "text") {
        const tx = parseFloat(node.getAttribute("x")) || 0;
        const ty = parseFloat(node.getAttribute("y")) || 0;
        const fill = node.getAttribute("fill") || "#000000";
        const fontSize = parseFloat(node.getAttribute("font-size")) || 12;
        const textValue = node.textContent || "";
        const anchor = node.getAttribute("text-anchor") || "start";
        
        const fontFamily = node.getAttribute("font-family") || "";
        const fontWeight = node.getAttribute("font-weight") || "";
        const isBold = fontWeight === "bold" || fontFamily.toLowerCase().includes("bold");

        doc.save();
        doc.fontSize(fontSize);
        doc.fillColor(fill);
        if (isBold) {
          doc.font("Helvetica-Bold");
        } else {
          doc.font("Helvetica");
        }

        let drawX = tx;
        if (anchor === "end") {
          drawX = tx - doc.widthOfString(textValue);
        } else if (anchor === "middle") {
          drawX = tx - doc.widthOfString(textValue) / 2;
        }

        const drawY = ty - fontSize * 0.8;

        doc.text(textValue, drawX, drawY, { lineBreak: false });
        doc.restore();
      }

      const childNodes = node.children || [];
      Array.from(childNodes).forEach((childNode) => renderNode(childNode, depth + 1));

      if (transformed) {
        doc.restore();
      }
    };

    Array.from(svgNode.children || []).forEach((childNode) => renderNode(childNode, 0));
    doc.restore();
    return true;
  }
  catch (e) {
    dbglog("exception drawSvgToPdf: " + e);
    return false;
  }
}
