import JSDOM from "jsdom";
import { marked } from "marked";

export default async function markdownToHTML(md, { title }) {
  const html = await marked.parse(md);

  const document = new JSDOM.JSDOM(html).window.document;

  document.title = title;

  document.body.dir = "rtl";
  document.body.style.padding = "16px";
  document.body.style.maxWidth = "80ch";
  document.body.style.margin = "auto";

  return document.documentElement.outerHTML;
}
