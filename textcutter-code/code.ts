// Figma plugin - Split multiline text

// @author Johan Ronsse
// @description Takes a layer with multiple lines of text and splits it into separate text layers. Empty lines get discarded automatically.
// Example use case: when you put text through OCR, you end up with a long string, which you will probably want in separate layers in Figma to start building a UI. This plugin avoids the manual splitting of layers.

function clone(val) {
  return JSON.parse(JSON.stringify(val))
}

async function main(): Promise<string | undefined> {

  // Roboto Regular is the font that objects will be created with by default in
  // Figma. We need to wait for fonts to load before creating text using them.
  await figma.loadFontAsync({ family: "Roboto", style: "Regular" })

  // First, some checks and balances.
  // Make sure the selection is a single piece of text before proceeding.
  if (figma.currentPage.selection.length !== 1) {
    return "Select a single node."
  }

  // Make sure we are dealing with a single text node
  const node = figma.currentPage.selection[0]
  if (node.type !== 'TEXT') {
    return "Select a single text node."
  }

  // Font check
  if (node.hasMissingFont) {
    return('Whoops, you need to have the font for this layer installed.');
  }

  // We get the characters from our current selected layer
  var inputText = node.characters;

  // We also get the styles from our selected layer
  // var inputStyles = node.TextStyle;

  // This regex splits multiline string into multiple lines and puts it in an array
  var result = inputText.split(/\r?\n/);

  // Lines get sanitized in 2 ways:
  // * All empty strings get removed (Boolean filter)
  // * We trim away the whitespace at the end of the string
  var filteredResults = result.filter(Boolean).map(s => s.trim());

  // Now we need to make text layers that contain the text content of each of the array items
  const nodes: SceneNode[] = [];

  for (let i = 0; i < filteredResults.length; i++) {
    const text = figma.createText();
    // Need to replace this by the found text later
    text.characters = filteredResults[i];
    text.y = i * 30;
    figma.currentPage.appendChild(text);
    nodes.push(text);
  }

  // Add everything to a group
  figma.group(nodes, node.parent);
  figma.currentPage.selection = nodes;
  figma.viewport.scrollAndZoomIntoView(nodes);
  
}

main().then((message: string | undefined) => {
  figma.closePlugin(message)
})
