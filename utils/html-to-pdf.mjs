import fs from 'fs';
import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';

export default async function htmlFileToPDF(htmlFilePath, pdfPath) {
  let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');

  // יצירת תוכן עניינים מהכותרות
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  const headings = document.querySelectorAll('h1, h2, h3');

  const customStyles = `
    <style>
      .table-of-contents {
        font-family: Arial, sans-serif;
        margin: 30px 0;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 8px;
        background-color: #f9f9f9;
        direction: rtl;
        text-align: right;
      }
      .table-of-contents h1 {
        font-size: 20px;
        margin: 20px 0;
        text-align: center;
      }
      .table-of-contents ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .table-of-contents li {
        margin-bottom: 6px;
      }
      .table-of-contents li a {
        text-decoration: none;
        color: #007acc;
      }
      .table-of-contents li a:hover {
        text-decoration: underline;
        color: #005a99;
      }
      .table-of-contents li.toc-level-2 { margin-right: 0px; }
      .table-of-contents li.toc-level-3 { margin-right: 20px; }

      h1 {
        text-align: center;
        margin: 30px 0;
      }
    </style>
  `;

  let tocHtml = `${customStyles}<div class="table-of-contents"><h1>תוכן עניינים</h1><ul>`;

  headings.forEach((heading, index) => {
    if (heading.tagName === 'H1') return; // דילוג על כותרות ראשיות בתוכן העניינים
    const id = `heading-${index}`;
    heading.id = id;
    tocHtml += `<li class="toc-level-${parseInt(heading.tagName[1])}"><a href="#${id}">${heading.textContent}</a></li>`;
  });

  tocHtml += '</ul></div><hr/>';

  // הוספת תוכן העניינים אחרי הכותרת הראשית הראשונה בלבד
  const firstHeading = document.querySelector('h1');
  if (firstHeading) {
    firstHeading.insertAdjacentHTML('afterend', tocHtml);
  } else {
    // אם אין כותרת ראשית, מוסיפים לראש הדף
    const body = document.querySelector('body');
    body.insertAdjacentHTML('afterbegin', tocHtml);
  }

  // יישור הכותרת הראשית במרכז
  if (firstHeading) {
    firstHeading.style.textAlign = 'center';
    firstHeading.style.margin = '30px 0';
  }

  // המרה חזרה ל-HTML
  htmlContent = '<!DOCTYPE html>' + document.documentElement.outerHTML;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: pdfPath,
    format: 'A4',
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
