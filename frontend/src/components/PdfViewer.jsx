import { Document, Page, pdfjs } from "react-pdf";
import Draggable from "react-draggable";
import { useRef, useState } from "react";

import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

/* ✅ SAFE BASE64 HELPER (FIXES STACK OVERFLOW) */
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize)
    );
  }

  return btoa(binary);
}

export default function PdfViewer() {
  const [boxPos, setBoxPos] = useState({ x: 100, y: 100 });
  const [pdfSize, setPdfSize] = useState({ width: 0, height: 0 });

  const nodeRef = useRef(null);

  function handlePageRender(page) {
    const viewport = page.getViewport({ scale: 1 });
    setPdfSize({
      width: viewport.width,
      height: viewport.height,
    });
  }

  function convertToPdfCoords(x, y) {
    if (!pdfSize.width || !pdfSize.height) return;

    const xPercent = x / pdfSize.width;
    const yPercent = y / pdfSize.height;

    const PDF_WIDTH = 595;  // A4 width (points)
    const PDF_HEIGHT = 842; // A4 height (points)

    const coords = {
      x: +(xPercent * PDF_WIDTH).toFixed(2),
      y: +(PDF_HEIGHT - yPercent * PDF_HEIGHT).toFixed(2),
      width: 200,
      height: 80,
    };

    console.log("PDF COORDS:", coords);

    // ✅ REQUIRED FOR SIGN BUTTON
    window.__PDF_BOX__ = coords;
  }

  async function signPdf() {
    if (!window.__PDF_BOX__) {
      alert("Drag the signature box first");
      return;
    }

    // 1️⃣ Read PDF safely
    const pdfRes = await fetch("/sample.pdf");
    const pdfBuf = await pdfRes.arrayBuffer();
    const pdfBase64 = arrayBufferToBase64(pdfBuf);

    // 2️⃣ Read signature image safely
    const sigRes = await fetch("/signature.png");
    const sigBuf = await sigRes.arrayBuffer();
    const signatureBase64 =
      "data:image/png;base64," +
      arrayBufferToBase64(sigBuf);

    // 3️⃣ Coordinates
    const box = window.__PDF_BOX__;

    // 4️⃣ Send to backend
    const res = await fetch("http://localhost:5000/sign-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pdfBase64,
        signatureBase64,
        box,
      }),
    });

    const data = await res.json();

    // 5️⃣ Open signed PDF
    window.open(data.url, "_blank");
  }

  return (
    <div>
      <div style={{ position: "relative", display: "inline-block" }}>
        <Document file="/sample.pdf">
          <Page
            pageNumber={1}
            onRenderSuccess={handlePageRender}
          />
        </Document>

        <Draggable
          nodeRef={nodeRef}
          position={boxPos}
          onStop={(e, data) => {
            setBoxPos({ x: data.x, y: data.y });
            convertToPdfCoords(data.x, data.y);
          }}
        >
          <div
            ref={nodeRef}
            style={{
              position: "absolute",
              width: 200,
              height: 80,
              border: "2px dashed red",
              background: "rgba(255,0,0,0.1)",
              cursor: "move",
              top: 0,
              left: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            Signature
          </div>
        </Draggable>
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={signPdf}>Sign PDF</button>
      </div>
    </div>
  );
}
