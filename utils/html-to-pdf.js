import fs from "fs";
import puppeteer from "puppeteer";

export default async function htmlFileToPDF(htmlFilePath, pdfOutputPath) {
  // קריאת קובץ HTML
  const htmlContent = fs.readFileSync(htmlFilePath, "utf-8");

  // פתיחת דפדפן Puppeteer
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // טעינת תוכן HTML לעמוד
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  // יצירת קובץ PDF
  await page.pdf({
    path: pdfOutputPath,
    format: "A4",
    printBackground: true,
  });

  await browser.close();
}

// דוגמת שימוש
// htmlFileToPDF("example.html", "output.pdf")
//   .then(() => console.log("PDF נוצר בהצלחה."))
//   .catch((err) => console.error("שגיאה:", err));