import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import markdownToHTML from "./utils/md-to-html.mjs";
import markdownToPDF from "./utils/md-to-pdf.js";
import htmlFileToPDF from "./utils/html-to-pdf.js";
import { splitBy, splitTextIntoChunks } from "./utils/split-text.mjs";

/////////////////////////////////////////////////////////////////////
///                        S E T T I N G S                        ///
/////////////////////////////////////////////////////////////////////

const INPUT_PATH = "input.txt";

const MAX_CHUNKS_TO_TRANSLATE = Infinity;

const MAX_CHUNK_SIZE = 3_000;


const allText = fs.readFileSync(INPUT_PATH, "utf-8");

const chunks = splitTextIntoChunks(allText, MAX_CHUNK_SIZE, splitBy.newlines);


const PROMPT_INITIAL = fs.readFileSync("prompts/initial.txt", "utf-8");

const PROMPT_CONTINUATION = fs.readFileSync("prompts/continuation.txt", "utf-8");

const PROMPT_SUGGET_NAME = fs.readFileSync("prompts/suggest-document-name.txt", "utf-8");


const OUTPUTS_DIR = "outputs";

const OUTPUT_PATH_MARKDOWN = path.join(OUTPUTS_DIR, "apended.md");

/////////////////////////////////////////////////////////////////////
///           A I   &   M E S S A G E S   H I S T O R Y           ///
/////////////////////////////////////////////////////////////////////

const openai = new OpenAI({ apiKey: process.env.OPEN_AI_KEY });

const NUM_HEAD_PAIRS = 3;
const NUM_TAIL_PAIRS = 3;

const allMessagesHistory = [];

allMessagesHistory.push({ role: "system", content: PROMPT_INITIAL });

async function sendMessagesToAI(messages) {
  const chatCompletion = await openai.chat.completions.create({
    messages,
    model: "gpt-4o",
    temperature: 0.3,
  });

  return chatCompletion.choices[0].message.content;
}

async function sendChunkAndAppendHistory(chunk) {
  allMessagesHistory.push({ role: "user", content: chunk });

  let messages;
  if (allMessagesHistory.length <= 1 + 2 * NUM_HEAD_PAIRS + 2 * NUM_TAIL_PAIRS + 1) {
    messages = allMessagesHistory;
  } else {
    const head = allMessagesHistory.slice(0, 1 + 2 * NUM_HEAD_PAIRS);
    const tail = allMessagesHistory.slice(-(2 * NUM_TAIL_PAIRS + 1));
    messages = [...head, { role: "system", content: PROMPT_CONTINUATION }, ...tail];
  }

  const response = await sendMessagesToAI(messages);
  allMessagesHistory.push({ role: "assistant", content: response });
  return response;
}

/////////////////////////////////////////////////////////////////////
///                       M A I N   L O O P                       ///
/////////////////////////////////////////////////////////////////////

if (!fs.existsSync(OUTPUTS_DIR)) {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
}

// this happens anyway, so let's be explicit.
fs.writeFileSync(OUTPUT_PATH_MARKDOWN, "");

let shouldStop = false;
process.on("SIGINT", () => {
  console.log(" Will stop soon.");
  shouldStop = true;
});


/*
const BASE_NAME = "טיפים לשריפת שומן במהירות ללא פעילות גופנית";
const INPUT_PATH_HTML = path.join(OUTPUTS_DIR, BASE_NAME + ".html");
const OUTPUT_PATH_PDF = path.join(OUTPUTS_DIR, BASE_NAME + ".pdf");

// דוגמת שימוש
(async () => {
  try {
    await htmlFileToPDF(INPUT_PATH_HTML, OUTPUT_PATH_PDF);
    console.log('PDF Created Successfuly');
  } catch (err) {
    console.error('error occured :', err);
  } finally {
    process.exit(0);
  }
})();
//*/

console.log("Starting! Gonna take", chunks.length, "chunks.");
console.log(`building "${OUTPUT_PATH_MARKDOWN}" as we go.\n`);

let documentTitle;
let resultHtmlPath;
let resultPdfPath;

try {
  const maxIndex = Math.min(MAX_CHUNKS_TO_TRANSLATE, chunks.length);
  for (let index = 0; index < maxIndex; index++) {
    console.log(`Translating chunk ${index} / ${chunks.length} (${chunks[index].length} chars)...`);

    let timeStart = Date.now();
    const result = await sendChunkAndAppendHistory(chunks[index]);
    console.log("Took", ((Date.now() - timeStart) / 1000).toFixed(2), "seconds.\n");

    fs.appendFileSync(OUTPUT_PATH_MARKDOWN, result);

    if (shouldStop) {
      console.log("Stopped due to SIGINT.\n");
      break;
    }

    if (index === 0) {
      console.log("Asking AI to name the file.");
      const name = await sendMessagesToAI([
        { role: "system", content: PROMPT_SUGGET_NAME + "\n" + result }
      ]);
      console.log(`AI suggested name: "${name}"\n`);
      documentTitle = name;
      resultHtmlPath = path.join(OUTPUTS_DIR, name + ".html");
      resultPdfPath = path.join(OUTPUTS_DIR, name + ".pdf");
    }

    const markdown = allMessagesHistory
      .filter((m) => m.role === "assistant")
      .map((m) => m.content)
      .join("\n");

    const html = await markdownToHTML(markdown, { title: documentTitle });
    fs.writeFileSync(resultHtmlPath, html);

    // const pdf = await markdownToPDF(markdown, { title: documentTitle });
    // fs.writeFileSync(resultPdfPath, pdf);
    await htmlFileToPDF(resultHtmlPath, resultPdfPath);

  }
  if (!shouldStop) {
    console.log("Done translating!\n");
  }
} catch (error) {
  console.error(`Stopped due to error: ${error.message}\n`);
}
