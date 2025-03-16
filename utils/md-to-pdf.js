import { marked } from "marked";
import JSDOM from "jsdom";
import puppeteer from "puppeteer";

export default async function markdownToPDF(md, { title }) {
  const htmlContent = await marked.parse(md);

  const dom = new JSDOM.JSDOM(htmlContent);
  const document = dom.window.document;

  document.title = title;

  document.body.dir = "rtl";
  document.body.style.padding = "16px";
  document.body.style.maxWidth = "80ch";
  document.body.style.margin = "auto";
  
  const html = document.documentElement.outerHTML;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

  await browser.close();

  return pdfBuffer;
}
