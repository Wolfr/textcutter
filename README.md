# TextCutter

TextCutter is a lightweight plugin for Figma to split or join text layers. There is no UI, and it's focused on speed of interaction.

There are two commands in the plugin:

* Split text
* Join text

## Split text

The **Split Text** command splits a single selected text layer to several ones by line breaks. The width of the text layers kept the same as the original.

After splitting all created layers are selected, so you can wrap them into an autolayout, group or frame them, or just drag around as you like.

## Join text

The **Join Text** command Merges all texts from the selected text layers into the top-leftmost one, adding white spaces between merged texts. The width of the target layer stays preserved.

## Details

- Width of text layers preserved both with splitting and joining
- Not throwing an error when joining or splitting texts with different parameters, all mixed styling just drops to the first character's style.
- If there is a text style applied on the first character when splitting it is preserved on all the split layers
- If there is a text style applied to the top-leftmost text layer when joining it will be applied to the whole text.

## Usage

Install it via Figma Community plugin page [here](https://www.figma.com/community/plugin/739131137116544548/TextCutter)

It is handy to assign both commands to hotkeys and use it along with OCR software that helps extract texts from images, such as [TextSniper](https://textsniper.app/).
