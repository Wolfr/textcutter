// Figma plugin - Split multiline text
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
var nodeInInstance = (item) => {
    if (item.parent.type == "PAGE") {
        return false;
    }
    else {
        if (item.parent.type == "INSTANCE") {
            return true;
        }
        else {
            nodeInInstance(item.parent);
        }
    }
};
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        if (figma.command === 'split') {
            // SPLIT COMMAND
            // First, some checks and balances common for both commands
            // Make sure the selection is a single piece of text before proceeding.
            if (figma.currentPage.selection.length !== 1) {
                return "Select a single text node to split.";
            }
            // Make sure we are dealing with a single text node
            const node = figma.currentPage.selection[0];
            if (node.type !== 'TEXT') {
                return "Select a single text node to split.";
            }
            // Font check
            if (node.hasMissingFont) {
                return ('Whoops, you need to have the font for this layer installed.');
            }
            if (nodeInInstance(node)) {
                return "Can’t split texts inside of the instance! Try splitting text in main component";
            }
            // We get the characters from our current selected layer, and parent to put individual lines in it later
            var inputText = node.characters;
            var nodeParent = node.parent;
            var nodeFirstStyle = node.getRangeTextStyleId(0, 1);
            // Detecting the font from the first character, loading it, and applying it to the whole node. This way we can drop styling without loading all used fonts
            var nodeFirstFont = node.getRangeFontName(0, 1);
            yield figma.loadFontAsync(nodeFirstFont);
            // If there was style on the first character we applying it to whole text, if not, changing the font of whole text to one from the first character.
            if (nodeFirstStyle) {
                node.textStyleId = nodeFirstStyle;
            }
            else {
                node.fontName = nodeFirstFont;
            }
            // This regex splits multiline string into multiple lines and puts it in an array
            var result = inputText.split(/\r?\n/);
            // Lines get sanitized in 2 ways:
            // * All empty strings get removed (Boolean filter)
            // * We trim away the whitespace at the end of the string
            var filteredResults = result.filter(Boolean).map(s => s.trim());
            // Checking if there is just one line in array, in that case doing nothing so original stays in place
            if (filteredResults.length === 1) {
                return "Nothing to split! There is only one row in the text layer";
            }
            // Now we need to make text layers that contain the text content of each of the array items
            const nodes = [];
            // Offset to position lines correctly
            let vshift = 0;
            // For each new line in array we duplicating original layer, populate it with line content, and place after the previous one
            for (let i = 0; i < filteredResults.length; i++) {
                const line = node.clone();
                line.characters = filteredResults[i];
                line.y = line.y + vshift;
                line.textAutoResize = "HEIGHT";
                vshift = vshift + line.height;
                nodeParent.appendChild(line);
                nodes.push(line);
            }
            // After all separate line nodes has been created, the original one is being deleted
            node.remove();
            // Selecting newly created list of layers. Layers are not grouped so can be immediatly put in frame, autolayout or just moved separately
            figma.currentPage.selection = nodes;
            // After job is done showing confirmation with number of layers created, and closing plugin
            return `Splitted into ${nodes.length} layers`;
        }
        if (figma.command === 'join') {
            // JOIN COMMAND
            //Filtering text layers from selection
            var list = figma.currentPage.selection;
            var textlist = list.filter(node => node.type == "TEXT");
            // Checking if there is enough layers to join
            if (textlist.length === 0) {
                return "No text layers selected to join";
            }
            if (textlist.length < 2) {
                return "Select at least 2 text layers to join";
            }
            // Font check
            if (textlist.find(node => node.hasMissingFont)) {
                return 'Whoops, you need to have the font for all selected layers installed first.';
            }
            // Finding the top-leftmost one from selected text layers. It will be our "main" node, we will merge joined text content into it later.
            textlist.sort((a, b) => {
                if ((a.y === b.absoluteTransform[1][2] &&
                    a.absoluteTransform[0][2] < b.absoluteTransform[0][2]) ||
                    a.absoluteTransform[1][2] < b.absoluteTransform[1][2]) {
                    return -1;
                }
                if ((a.absoluteTransform[1][2] === b.absoluteTransform[1][2] &&
                    a.absoluteTransform[0][2] > b.absoluteTransform[0][2]) ||
                    a.absoluteTransform[1][2] > b.absoluteTransform[1][2]) {
                    return 1;
                }
                return 0;
            });
            var mainNode = textlist[0];
            // checking if there is text layers placed in instance among the text nodes.
            if (textlist.filter(node => nodeInInstance(node)).length > 0) {
                return "Can’t join texts from the layers inside of the instance! Try joining texts in main component";
            }
            // Collecting joined text from all text nodes into variable and removing all other text nodes apart from main one
            var joinedText = '';
            for (let i = 0; i < textlist.length; i++) {
                if (textlist[i].type == "TEXT") {
                    joinedText = joinedText == '' ? textlist[i].characters : joinedText + " " + textlist[i].characters;
                }
                if (i > 0) {
                    textlist[i].remove();
                }
            }
            // Dropping mixed styling and applying joined text to the main node
            var nodeFirstStyle = mainNode.getRangeTextStyleId(0, 1);
            // Detecting first character's font, loading it, and applying it to the whole node. This way we can drop styling without loading all used fonts
            var nodeFirstFont = mainNode.getRangeFontName(0, 1);
            yield figma.loadFontAsync(nodeFirstFont);
            // If there was style on the first character we applying it to the whole text, if not, changing the font of the whole text to one from the first character.
            if (nodeFirstStyle) {
                mainNode.textStyleId = nodeFirstStyle;
            }
            else {
                mainNode.fontName = nodeFirstFont;
            }
            mainNode.textAutoResize = "HEIGHT";
            mainNode.characters = joinedText;
            // After the job is done showing confirmation with number of layers joined, then closing plugin
            return `Joined ${textlist.length} layers`;
        }
    });
}
main().then((message) => {
    figma.closePlugin(message);
});
