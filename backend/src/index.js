const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// serve uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.post("/sign-pdf", async (req, res) => {
  try {
    const { pdfBase64, signatureBase64, box } = req.body;

    // decode inputs
    const pdfBytes = Buffer.from(pdfBase64, "base64");
    const sigBytes = Buffer.from(
      signatureBase64.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    // load pdf
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];

    // embed image (PNG or JPG both ok)
    let sigImg;
    try {
      sigImg = await pdfDoc.embedPng(sigBytes);
    } catch {
      sigImg = await pdfDoc.embedJpg(sigBytes);
    }

    // draw with aspect-ratio safety
    const imgDims = sigImg.scale(1);
    const scale = Math.min(
      box.width / imgDims.width,
      box.height / imgDims.height
    );

    const drawW = imgDims.width * scale;
    const drawH = imgDims.height * scale;

    page.drawImage(sigImg, {
      x: box.x + (box.width - drawW) / 2,
      y: box.y + (box.height - drawH) / 2,
      width: drawW,
      height: drawH,
    });

    // save
    const outBytes = await pdfDoc.save();
    const outPath = path.join(__dirname, "../uploads/signed.pdf");
    fs.writeFileSync(outPath, outBytes);

    res.json({ url: "http://localhost:5000/uploads/signed.pdf" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Signing failed" });
  }
});

app.listen(5000, () =>
  console.log("Backend running on http://localhost:5000")
);
