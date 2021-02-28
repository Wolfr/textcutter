# TextCutter

TextCutter is a lightweight plugin for Figma to split or join text layers. There is no UI and it's focused on speed of interaction.

Plugin have two commands:

## Split

Splitting one selected text layer to several by line break. Width of the text layers stay the same as the original.

After splitting all created layers are selected so you can wrap them into autolayout, group or frame, or just drag around as you like.

## Join

Joining texts from the selected text layers into top-leftmost one, adding white spaces between merged texts. Width of the target layer stays preserved.

## Details

- Width of text layers preserved both with splitting and joining
- Not throwing an error when joining or splitting texts with different parameters, all mixed styling just drops to first character's style.
- If there a textstyle applied on the first character it is preserved on all the splitted layers
- If there is a textstyle applyed to top-leftmost text layer when joining it will be applyed to the whole text.

## Usage

Instal it via Figma Community plugin page [here](https://www.figma.com/community/plugin/739131137116544548/TextCutter)

It is handy to assign both commands to hotkeys and use it along with OCR software that helps extract texts from images, such as [TextSniper](https://textsniper.app/).
