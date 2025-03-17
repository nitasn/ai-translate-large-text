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
    displayHeaderFooter: true,
    footerTemplate: `
      <div style="font-size:10px; width:100%; text-align:center; padding:5px 0;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `,
    headerTemplate: '<div></div>',
    margin: {
      top: '1cm',
      bottom: '1.5cm',
      left: '1cm',
      right: '1cm'
    }
  });

  await browser.close();
}
