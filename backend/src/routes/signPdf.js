const express = require("express");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

const { hashBuffer } = require("../utils/hash");
const { drawSignature } = require("../utils/pdf");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { pdfBase64, signatureBase64, box } = req.body;

    // Load PDF
    const pdfBytes = Buffer.from(pdfBase64, "base64");
    const originalHash = hashBuffer(pdfBytes);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];

    // Load signature image
    const imageBytes = Buffer.from(signatureBase64, "base64");
    const image = await pdfDoc.embedPng(imageBytes);

    // Draw signature
    await drawSignature(page, image, box);

    // Save new PDF
    const signedPdf = await pdfDoc.save();
    const finalHash = hashBuffer(signedPdf);

    const outputPath = path.join(__dirname, "../../uploads/signed.pdf");
    fs.writeFileSync(outputPath, signedPdf);

    res.json({
      message: "PDF signed successfully",
      originalHash,
      finalHash,
      url: "http://localhost:5000/uploads/signed.pdf",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signing failed" });
  }
});

module.exports = router;
