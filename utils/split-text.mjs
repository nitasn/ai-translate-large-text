export function splitTextIntoChunks(text, maxChunkSize, splitter) {
  const sentences = splitter(text);
  const chunks = [];
  let currentChunk = "";
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = "";
    }
    currentChunk += sentence + "\n";
  }
  chunks.push(currentChunk);

  return chunks.map((s) => s.trim()).filter((s) => s.length > 0);
}

export const splitBy = {
  periods: (str) => {
    return str
      .split(/(?<!\.)\.(?!\.)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s + ".");
  },

  newlines: (str) => {
    return str
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  },
};
