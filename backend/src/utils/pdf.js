async function drawSignature(page, image, box) {
  const imgDims = image.scale(1);

  const scale = Math.min(
    box.width / imgDims.width,
    box.height / imgDims.height
  );

  const drawWidth = imgDims.width * scale;
  const drawHeight = imgDims.height * scale;

  page.drawImage(image, {
    x: box.x + (box.width - drawWidth) / 2,
    y: box.y + (box.height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  });
}

module.exports = { drawSignature };
