const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const app = express();

/* =====================
   MIDDLEWARE
===================== */
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/* =====================
   HEALTH CHECK (VERY IMPORTANT)
===================== */
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

/* =====================
   SIGN PDF API
===================== */
app.post("/sign-pdf", async (req, res) => {
  try {
    const { pdfBase64, signatureBase64, box } = req.body;

    if (!pdfBase64 || !signatureBase64 || !box) {
      return res.status(400).json({ error: "Missing data" });
    }

    // Decode inputs
    const pdfBytes = Buffer.from(pdfBase64, "base64");
    const sigBytes = Buffer.from(
      signatureBase64.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];

    // Embed signature image
    let sigImg;
    try {
      sigImg = await pdfDoc.embedPng(sigBytes);
    } catch {
      sigImg = await pdfDoc.embedJpg(sigBytes);
    }

    // Keep aspect ratio
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

    // Save PDF
    const outBytes = await pdfDoc.save();
    const outPath = path.join(__dirname, "../uploads/signed.pdf");
    fs.writeFileSync(outPath, outBytes);

    // IMPORTANT: Use Render public URL
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    res.json({
      success: true,
      url: `${baseUrl}/uploads/signed.pdf`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signing failed" });
  }
});

/* =====================
   START SERVER (RENDER SAFE)
===================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
