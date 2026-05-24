const assert = require('assert');

function originalRender(blocks) {
  const result = [];
  let lineIdx = 0;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    let className = "";

    const blockLines = block.text.split("\n");
    for (let j = 0; j < blockLines.length; j++) {
      const lineText = blockLines[j];
      const isLastBlock = i === blocks.length - 1;
      const isLastLineInBlock = j === blockLines.length - 1;

      result.push({
        key: lineIdx,
        className,
        text: (lineText || " ") + (!(isLastBlock && isLastLineInBlock) ? "\n" : "")
      });
      lineIdx++;
    }
  }
  return result;
}

function optimizedRender(blocks) {
  const result = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    let className = "";

    const isLastBlock = i === blocks.length - 1;

    result.push({
      key: i,
      className,
      text: (block.text || " ") + (!isLastBlock ? "\n" : "")
    });
  }
  return result;
}

const blocks = [
  { text: "INT. COFFEE SHOP - DAY" },
  { text: "ALICE" },
  { text: "Hello." },
  { text: "" }
];

const resOriginal = originalRender(blocks);
const resOptimized = optimizedRender(blocks);

assert.deepStrictEqual(resOriginal, resOptimized);
console.log("Equivalence Test Passed!");
