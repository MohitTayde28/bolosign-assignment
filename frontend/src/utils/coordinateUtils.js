export function convertToPdfCoords({
  x,
  y,
  width,
  height,
  pageWidth,
  pageHeight,
}) {
  const pdfX = x;
  const pdfY = pageHeight - y - height;

  return {
    x: pdfX,
    y: pdfY,
    width,
    height,
  };
}
