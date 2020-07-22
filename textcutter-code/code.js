// Figma plugin - Split multiline text
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// @author Johan Ronsse
// @version 2.0
// @description
//    Takes a layer with multiple lines of text and splits it
//    into separate text layers. Empty lines get discarded automatically.
/*
  Example use case: when you put text through OCR, you end up with a long string,
  which you will probably want in separate layers in Figma to start building a UI.
  This plugin avoids the manual splitting of layers.
*/
/*
  @todo position the text to right the original text, except when there is no space, then position it left
  @todo Always consider that a text properties could have mixed values
  @todo post a message when text has been splitted
*/
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // Roboto Regular is the font that objects will be created with by default in
        // Figma. We need to wait for fonts to load before creating text using them.
        yield figma.loadFontAsync({ family: "Roboto", style: "Regular" });
        // First, some checks and balances.
        // Make sure the selection is a single piece of text before proceeding.
        if (figma.currentPage.selection.length !== 1) {
            return "Select a single node.";
        }
        // Make sure we are dealing with a single text node
        const node = figma.currentPage.selection[0];
        if (node.type !== 'TEXT') {
            return "Select a single text node.";
        }
        // Font check
        if (node.hasMissingFont) {
            return ('Whoops, you need to have the font for this layer installed.');
        }
        var nodeOriginalX = node.x;
        var nodeOriginalY = node.y;
        var nodeOriginalWidth = node.width;
        // We get the characters from our current selected layer
        var inputText = node.characters;
        // We also get the styles from our selected layer
        if (node.fontSize == figma.mixed) {
            return ('Whoops, we do not support mixed font size values. Make sure all of your text is the same size.');
        }
        else {
            var nodeFontSize = Number(node.fontSize);
        }
        if (node.fontName == figma.mixed) {
            return ('Whoops, we do not support mixed font family values. Make sure all of your text is the same font family.');
        }
        else {
            var nodeFontName = node.fontName;
            console.log(nodeFontName);
        }
        let nodeFills = node.fills;
        let nodeLineHeight = node.lineHeight;
        let nodeLetterSpacing = node.letterSpacing;
        let nodeTextCase = node.textCase;
        let nodeTextDecoration = node.textDecoration;
        yield figma.loadFontAsync(nodeFontName);
        // This regex splits multiline string into multiple lines and puts it in an array
        var result = inputText.split(/\r?\n/);
        // Lines get sanitized in 2 ways:
        // * All empty strings get removed (Boolean filter)
        // * We trim away the whitespace at the end of the string
        var filteredResults = result.filter(Boolean).map(s => s.trim());
        // Now we need to make text layers that contain the text content of each of the array items
        const nodes = [];
        for (let i = 0; i < filteredResults.length; i++) {
            const text = figma.createText();
            // Need to replace this by the found text later
            text.characters = filteredResults[i];
            text.fontName = nodeFontName;
            text.fontSize = nodeFontSize;
            text.fills = nodeFills;
            text.letterSpacing = nodeLetterSpacing;
            text.lineHeight = nodeLineHeight;
            text.textCase = nodeTextCase;
            text.textDecoration = nodeTextDecoration;
            // Space apart between the lines with some extra space to signify things have been split.
            text.y = i * nodeFontSize;
            figma.currentPage.appendChild(text);
            nodes.push(text);
        }
        // Add everything to a group
        let groupedNodes = figma.group(nodes, node.parent);
        // Position the group to the right of the original group
        groupedNodes.x = nodeOriginalX + nodeOriginalWidth * 1.5;
        groupedNodes.y = nodeOriginalY;
        figma.currentPage.selection = nodes;
        figma.viewport.scrollAndZoomIntoView(nodes);
    });
}
main().then((message) => {
    figma.closePlugin(message);
});
