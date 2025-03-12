import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import markdownToHTML from "./utils/md-to-html.mjs";
import { splitBy, splitTextIntoChunks } from "./utils/split-text.mjs";

/////////////////////////////////////////////////////////////////////
///                        S E T T I N G S                        ///
/////////////////////////////////////////////////////////////////////

const INPUT_PATH = "input.txt";

const MAX_CHUNK_SIZE = 3_000;

const allText = fs.readFileSync(INPUT_PATH, "utf-8");

const chunks = splitTextIntoChunks(allText, MAX_CHUNK_SIZE, splitBy.newlines);

const MAX_CHUNKS_TO_TRANSLATE = 5;

const INITIAL_PROMPT = fs.readFileSync("prompts/initial.txt", "utf-8");

const CONTINUATION_PROMPT = fs.readFileSync("prompts/continuation.txt", "utf-8");

const OUTPUTS_DIR = "outputs";

const OUTPUT_PATH_MARKDOWN = path.join(OUTPUTS_DIR, "apended.md");

const OUTPUT_PATH_HTML = path.join(OUTPUTS_DIR, "rtl-page.html");

/////////////////////////////////////////////////////////////////////
///           A I   &   M E S S A G E S   H I S T O R Y           ///
/////////////////////////////////////////////////////////////////////

const openai = new OpenAI({ apiKey: process.env.OPEN_AI_KEY });

const NUM_HEAD_PAIRS = 3;
const NUM_TAIL_PAIRS = 3;

const allMessagesHistory = [];

allMessagesHistory.push({ role: "system", content: INITIAL_PROMPT });

async function translateChunkAndAddToHistory(chunk) {
  allMessagesHistory.push({ role: "user", content: chunk });

  let messages;
  if (allMessagesHistory.length <= 1 + 2 * NUM_HEAD_PAIRS + 2 * NUM_TAIL_PAIRS + 1) {
    messages = allMessagesHistory;
  } else {
    const head = allMessagesHistory.slice(0, 1 + 2 * NUM_HEAD_PAIRS);
    const tail = allMessagesHistory.slice(-(2 * NUM_TAIL_PAIRS + 1));
    messages = [...head, { role: "system", content: CONTINUATION_PROMPT }, ...tail];
  }

  const chatCompletion = await openai.chat.completions.create({
    messages,
    model: "gpt-4o",
    temperature: 0.3,
  });

  const response = chatCompletion.choices[0].message.content;
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

console.log("Starting!");
console.log(`building "${OUTPUT_PATH_MARKDOWN}" as we go.\n`);

try {
  const maxIndex = Math.min(MAX_CHUNKS_TO_TRANSLATE, chunks.length);
  for (let index = 0; index < maxIndex; index++) {
    console.log(`Translating chunk ${index} (${chunks[index].length} chars)...`);

    let timeStart = Date.now();
    const result = await translateChunkAndAddToHistory(chunks[index]);
    console.log("Took", ((Date.now() - timeStart) / 1000).toFixed(2), "seconds.\n");

    fs.appendFileSync(OUTPUT_PATH_MARKDOWN, result);

    if (shouldStop) {
      console.log("Stopped due to SIGINT.\n");
      break;
    }
  }
  if (!shouldStop) {
    console.log("Done translating!\n");
  }
} catch (error) {
  console.error(`Stopped due to error: ${error.message}\n`);
}

const markdown = allMessagesHistory
  .filter((m) => m.role === "assistant")
  .map((m) => m.content)
  .join("\n");

const html = await markdownToHTML(markdown);
fs.writeFileSync(OUTPUT_PATH_HTML, html);

console.log("Converted markdown to html.");
console.log(`Check out "${OUTPUT_PATH_MARKDOWN}".\n`);
