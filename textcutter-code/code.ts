// Figma plugin - Split multiline text

// @author Johan Ronsse
// @version 3.0
// @description
//    Split and join text layers with lightweight noUI plugin

/*
  Example use case: when you put text through OCR, you end up with a long string,
  which you will probably want in separate layers in Figma to start building a UI.
  This plugin avoids the manual splitting of layers.
*/

// Helper functions

// Recursively checking if selected node is inside the instance — if it is we can't split layers, as we can't add new ones in instance
let nodeInInstance = (item) => {
  if (item.parent.type == "PAGE"){
    return false

  }
  else{
    if (item.parent.type == "INSTANCE"){
    return true}
    else{
      nodeInInstance(item.parent)
    }
  }
}

async function loadFonts(node: TextNode, uniqueFonts: Set<string>): Promise<void> {
  const fonts = Array.from(uniqueFonts).map(fontString => JSON.parse(fontString) as FontName);
  await Promise.all(fonts.map(font => figma.loadFontAsync(font)));

  if (typeof node.fontName !== 'symbol') {
    await figma.loadFontAsync(node.fontName);
  } else {
    console.log('Mixed fonts detected. Loading all fonts used in the text node.');
    const nodeFonts = await getUniqueFonts(node);
    await Promise.all(nodeFonts.map(font => figma.loadFontAsync(font)));
  }
}

async function getUniqueFonts(node: TextNode): Promise<FontName[]> {
  const uniqueFonts: Set<string> = new Set();
  for (let i = 0; i < node.characters.length; i++) {
    const font = node.getRangeFontName(i, i + 1);
    uniqueFonts.add(JSON.stringify(font));
  }
  return Array.from(uniqueFonts).map(font => JSON.parse(font) as FontName);
}

async function main(): Promise<string | undefined> {

  if (figma.command === 'removeBullets') {
    // REMOVE BULLETS COMMAND
    const selectedNodes = figma.currentPage.selection.filter(node => node.type === "TEXT") as TextNode[];

    if (selectedNodes.length === 0) {
      return "No text layers selected. Please select at least one text layer.";
    }

    let bulletCount = 0;

    // Load fonts for all selected nodes
    const uniqueFonts = new Set<string>();
    for (const node of selectedNodes) {
      const nodeFonts = await getUniqueFonts(node);
      for (const font of nodeFonts) {
        uniqueFonts.add(JSON.stringify(font));
      }
    }
    await loadFonts(selectedNodes[0], uniqueFonts);

    for (const node of selectedNodes) {
      const text = node.characters;
      const bulletRegex = /[•·∙‣⁃◦⦿⦾■□▪▫●○◉◎◈◇◆★☆✦✧✱✲✳✴✶✷✸✹✺✻✼✽✾✿❀❁❂❃❄❅❆❇❈❉❊❋]\s?/g;
      if (bulletRegex.test(text)) {
        const newText = text.replace(bulletRegex, '');

        // Get formatting of the original text
        const formatting = getFormattingRanges(node, 0, text.length);
        
        // Update the node's text
        node.characters = newText;
        
        // Apply formatting to the new text, adjusting for removed characters
        const charsRemoved = text.length - newText.length;
        const adjustedFormatting = formatting.map(function(range) {
          return {
            start: Math.max(0, range.start - charsRemoved),
            end: Math.max(0, range.end - charsRemoved),
            fontSize: range.fontSize,
            fontName: range.fontName,
            textCase: range.textCase,
            textDecoration: range.textDecoration,
            letterSpacing: range.letterSpacing,
            lineHeight: range.lineHeight,
            fills: range.fills,
            textStyleId: range.textStyleId,
            fillStyleId: range.fillStyleId
          };
        }).filter(range => range.end > range.start); // Filter out empty ranges
        
        await applyFormattingRanges(node, adjustedFormatting);
        
        bulletCount++;
      }
    }

    return `Removed bullets from ${bulletCount} out of ${selectedNodes.length} selected text layers.`;
  }

  if (figma.command === 'splitWords') {
    // SPLIT WORDS COMMAND

    // Checks and balances
    const singleTextNodeError = "Select a single text node to split words."
    if (figma.currentPage.selection.length !== 1) {
      return singleTextNodeError
    }

    const node = figma.currentPage.selection[0];
    if (node.type !== 'TEXT') {
      return singleTextNodeError
    }

    if (node.hasMissingFont) {
      return 'Oops, you need to have the font for this layer installed.';
    }

    if (nodeInInstance(node)){
      return "Can't split words inside of a component instance. Try splitting words in main component."
    }

    let inputText = node.characters;
    let nodeParent = node.parent

    // Split the text into words
    let words = inputText.split(/\s+/).filter(Boolean);

    if (words.length === 1){
      return "Nothing to split. There is only one word in the selected text layer."
    }

    // Load fonts
    const uniqueFonts = await getUniqueFonts(node);
    await loadFonts(node, new Set(uniqueFonts.map(font => JSON.stringify(font))));

    // Create new text nodes for each word
    const nodes: SceneNode[] = [];
    let xOffset = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const startIndex = inputText.indexOf(word, i === 0 ? 0 : inputText.indexOf(words[i-1]) + words[i-1].length);
      const endIndex = startIndex + word.length;

      const wordNode = figma.createText();
      wordNode.fontName = typeof node.fontName !== 'symbol' ? node.fontName : { family: "Inter", style: "Regular" };
      wordNode.characters = word;

      wordNode.x = node.x + xOffset;
      wordNode.y = node.y;

      // Apply formatting
      const formattingRanges = getFormattingRanges(node, startIndex, endIndex);
      await applyFormattingRanges(wordNode, formattingRanges);

      wordNode.textAutoResize = "WIDTH_AND_HEIGHT";
      
      // Calculate the width of the word node
      const wordWidth = wordNode.width;
 
      // Add the word width to the offset
      xOffset += wordWidth;

      if (i < words.length - 1) {
        const fontSize = wordNode.fontSize;
        if (fontSize !== figma.mixed) {
          const spaceWidth = fontSize * 0.25; // Approximate space width
          xOffset += spaceWidth;
        } else {
          // Handle mixed font sizes
          const averageFontSize = 16; // You might want to calculate this based on your specific needs
          const spaceWidth = averageFontSize * 0.25;
          xOffset += spaceWidth;
        }
      }

      nodeParent.appendChild(wordNode);
      nodes.push(wordNode);
    }

    // Remove the original node
    node.remove();

    // Select newly created nodes
    figma.currentPage.selection = nodes;

    return `Split text into ${nodes.length} words`;
  }

  if (figma.command === 'split') {
    // SPLIT COMMAND

    // First, some checks and balances common for both commands
    const singleTextNodeError = "Select a single text node to split text."
    // Make sure the selection is a single piece of text before proceeding.
    if (figma.currentPage.selection.length !== 1) {
      return singleTextNodeError
    }

    // Make sure we are dealing with a single text node
    const node = figma.currentPage.selection[0];

    if (node.type !== 'TEXT') {
      return singleTextNodeError
    }

    // Font check
    if (node.hasMissingFont) {
      return('Oops, you need to have the font for this layer installed.');
    }

    if (nodeInInstance(node)){
      return "Can't split texts inside of a component instance. Try splitting text in main component."
    }

    // We get the characters from our current selected layer, and parent to put individual lines in it later
    let inputText = node.characters;
    let nodeParent = node.parent

    // This regex splits multiline string into multiple lines and puts it in an array
    let result = inputText.split(/\r?\n/);

    /*
      Lines get sanitized in 2 ways:
      * All empty strings get removed (Boolean filter)
      * We trim away the whitespace at the end of the string
     */

    let filteredResults = result.filter(Boolean).map(s => s.trim());

    // Checking if there is just one line in array, in that case doing nothing so original stays in place
    if (filteredResults.length === 1){
      return "Nothing to split. There is only one line in the selected text layer. Please select multi-line text to split it."
    }

    // Scan styles and prepare formatting information before creating new text nodes
    let formattingInfo = [];
    let uniqueFonts = new Set<string>();

    for (let i = 0; i < filteredResults.length; i++) {
      const line = filteredResults[i];
      const startIndex = inputText.indexOf(line);
      const endIndex = startIndex + line.length;

      const lineFormatting = getFormattingRanges(node, startIndex, endIndex);
      formattingInfo.push(lineFormatting);

      // Collect unique fonts
      lineFormatting.forEach(range => {
        if (typeof range.fontName !== 'symbol') {
          uniqueFonts.add(JSON.stringify(range.fontName));
        }
      });
    }

    // Load all fonts
    await loadFonts(node, uniqueFonts);

    // Now we need to make text layers that contain the text content of each of the array items
    const nodes: SceneNode[] = [];

    // Offset to position lines correctly
    let vshift = 0

//
    // For each new line in array we create a new text node, populate it with line content, and place it after the previous one
    for (let i = 0; i < filteredResults.length; i++) {
      const line = figma.createText();
      line.fontName = typeof node.fontName !== 'symbol' ? node.fontName : { family: "Inter", style: "Regular" };
      line.characters = filteredResults[i];

      line.x = node.x;
      line.y = node.y + vshift;
      line.characters = filteredResults[i];

      // Apply formatting ranges to the new line
      await applyFormattingRanges(line, formattingInfo[i]);

      line.textAutoResize = "HEIGHT";
      vshift = vshift + line.height;
      nodeParent.appendChild(line);
      nodes.push(line);
    }

    // After all separate line nodes have been created, the original one is being deleted
    node.remove();

    // Selecting newly created list of layers. Layers are not grouped so can be immediately put in frame, autolayout or just moved separately
    figma.currentPage.selection = nodes;

    // After job is done showing confirmation with number of layers created, and closing plugin
    return `Split text into ${nodes.length} layers`;
  }

  if (figma.command === 'join' || figma.command === 'joinWithBreaks') {
    console.log("Join command started");

    // JOIN COMMAND

    // Filtering text layers from selection
    let list = figma.currentPage.selection
    let textlist = list.filter(node => node.type == "TEXT") as TextNode[]
    console.log(`Selected ${textlist.length} text layers`);

    // Checking if there is enough layers to join
    if(textlist.length === 0) {
      return "No text layers selected to join"
    }

    if(textlist.length < 2) {
      return "Select at least 2 text layers to join"
    }

    // Font check
    if(textlist.find(node => node.hasMissingFont)){
      return 'Whoops, you need to have the font for all selected layers installed first.'
    }

    // Finding the top-leftmost one from selected text layers. It will be our "main" node, we will merge joined text content into it later.
    console.log("Sorting text layers");
    textlist.sort((a, b) => {
      if (
        (a.y === b.absoluteTransform[1][2] &&
          a.absoluteTransform[0][2] < b.absoluteTransform[0][2]) ||
        a.absoluteTransform[1][2] < b.absoluteTransform[1][2]
      ) {
        return -1;
      }
      if (
        (a.absoluteTransform[1][2] === b.absoluteTransform[1][2] &&
          a.absoluteTransform[0][2] > b.absoluteTransform[0][2]) ||
        a.absoluteTransform[1][2] > b.absoluteTransform[1][2]
      ) {
        return 1;
      }
      return 0;
    });

    let mainNode = textlist[0]
    console.log("Main node selected:", mainNode.id);

    // Checking if there is text layers placed in instance among the text nodes.
    if(textlist.filter(node => nodeInInstance(node)).length > 0){
      return "Can't join texts from the layers inside of the instance! Try joining texts in main component"
    }

    console.log("Getting unique fonts");
    const uniqueFonts = await Promise.all(textlist.map(node => getUniqueFonts(node)));
    const allUniqueFonts = Array.from(new Set(uniqueFonts.flat().map(font => `${font.family},${font.style}`)))
      .map(fontString => {
        const [family, style] = fontString.split(',');
        return { family, style } as FontName;
      });
    console.log(`Found ${allUniqueFonts.length} unique fonts`);

    console.log("Loading fonts");
    // Load all fonts asynchronously
    await Promise.all(allUniqueFonts.map(font => figma.loadFontAsync(font)));
    console.log("Fonts loaded");

    console.log("Starting to join text");
    let joinedText = '';
    let formattingRanges = [];
    let currentOffset = 0;

    for (let i = 0; i < textlist.length; i++) {
      console.log(`Processing node ${i + 1} of ${textlist.length}`);
      const node = textlist[i];
      const nodeText = node.characters;

    // Copy text from current node
    if (figma.command === 'joinWithBreaks') {
      joinedText += nodeText + (i < textlist.length - 1 ? '\n' : '');
    } else {
      joinedText += nodeText + (i < textlist.length - 1 ? ' ' : '');
    }

    // Get formatting ranges for this node
    const nodeRanges = getFormattingRanges(node, 0, nodeText.length);
    for (let j = 0; j < nodeRanges.length; j++) {
      const range = nodeRanges[j];
      formattingRanges.push({
        start: range.start + currentOffset,
        end: range.end + currentOffset,
        fontSize: range.fontSize,
        fontName: range.fontName,
        textCase: range.textCase,
        textDecoration: range.textDecoration,
        letterSpacing: range.letterSpacing,
        lineHeight: range.lineHeight,
        fills: range.fills,
        textStyleId: range.textStyleId,
        fillStyleId: range.fillStyleId
      });
    }

    currentOffset += nodeText.length + (i < textlist.length - 1 ? 1 : 0); // Add 1 for space or newline
      // Remove the current node if it's not the main node
      if (i > 0) {
        node.remove();
      }
    }

    console.log("Applying joined text to main node");
    // Apply joined text to the main node
    mainNode.characters = joinedText;
    mainNode.textAutoResize = "HEIGHT";

    console.log("Applying formatting");
    // Apply formatting
    await applyFormattingRanges(mainNode, formattingRanges);

    console.log("Join operation completed");

    // After the job is done showing confirmation with number of layers joined, then closing plugin
    return `Joined ${textlist.length} layers${figma.command === 'joinWithBreaks' ? ' with line breaks' : ''}`;
  }
}


function getFormattingRanges(textNode: TextNode, startOffset: number, endOffset: number) {
  const ranges = [];
  const length = endOffset - startOffset;

  for (let i = 0; i < length; i++) {
    const originalIndex = startOffset + i;
    ranges.push({
      start: i,
      end: i + 1,
      fontSize: textNode.getRangeFontSize(originalIndex, originalIndex + 1),
      fontName: textNode.getRangeFontName(originalIndex, originalIndex + 1),
      textCase: textNode.getRangeTextCase(originalIndex, originalIndex + 1),
      textDecoration: textNode.getRangeTextDecoration(originalIndex, originalIndex + 1),
      letterSpacing: textNode.getRangeLetterSpacing(originalIndex, originalIndex + 1),
      lineHeight: textNode.getRangeLineHeight(originalIndex, originalIndex + 1),
      fills: textNode.getRangeFills(originalIndex, originalIndex + 1),
      textStyleId: textNode.getRangeTextStyleId(originalIndex, originalIndex + 1),
      fillStyleId: textNode.getRangeFillStyleId(originalIndex, originalIndex + 1)
    });
  }

  return ranges;
}

// Helper function to apply formatting ranges to a text node
async function applyFormattingRanges(textNode: TextNode, ranges: any[]) {
  for (const range of ranges) {
    textNode.setRangeFontSize(range.start, range.end, range.fontSize);
    textNode.setRangeFontName(range.start, range.end, range.fontName);
    textNode.setRangeTextCase(range.start, range.end, range.textCase);
    textNode.setRangeTextDecoration(range.start, range.end, range.textDecoration);
    textNode.setRangeLetterSpacing(range.start, range.end, range.letterSpacing);
    textNode.setRangeLineHeight(range.start, range.end, range.lineHeight);
    textNode.setRangeFills(range.start, range.end, range.fills);
    textNode.setRangeTextStyleIdAsync(range.start, range.end, range.textStyleId);
    textNode.setRangeFillStyleIdAsync(range.start, range.end, range.fillStyleId);
  }
}

main().then((message: string | undefined) => {
  figma.closePlugin(message)
})