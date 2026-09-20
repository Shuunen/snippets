import { blue, bold, cyan, dim, gray, green, italic, red, strikeThrough, yellow } from 'shuutils'
import type { BySide } from '../core/types'

/** the inner content width of each side's box, borders excluded */
export type ColumnWidths = BySide<number>

/**
 * Every glyph the interactive merge UI draws, in one place. Change one here to change it
 * everywhere it's used.
 */
export const glyphs = {
  arrowToLeft: '⬅',
  arrowToRight: '➜',
  boxBottomLeft: '└',
  boxBottomRight: '┘',
  boxHorizontal: '─',
  boxTopLeft: '┌',
  boxTopRight: '┐',
  boxVertical: '│',
  confirmKey: '⏎',
  ellipsis: '…',
  gutterBar: '▌',
  navigateKeys: '↑↓',
  pendingMarker: '?',
  previewBar: '┊',
}

/**
 * Every color the merge UI applies, as ready-to-call functions (composed from shuutils' ANSI
 * helpers) so callers never hardcode a color name — swap the function here to reskin the UI.
 */
export const colors = {
  addition: green,
  context: gray,
  /**
   * A dimmed, struck-through, red style for content a pending choice would delete, so it stays
   * visible instead of just vanishing from view before the choice is confirmed
   * @param text the text to style
   * @returns the styled text
   */
  deletedContent: (text: string): string => strikeThrough(red(text)),
  divider: gray,
  /**
   * The key badge in the footer hints, e.g. `[w]`
   * @param text the badge text
   * @returns the colored badge
   */
  keyBadge: (text: string): string => bold(cyan(text)),
  modification: yellow,
  /**
   * A dimmed style for the gap arrow while no choice has been made yet for the current block
   * @param text the text to style
   * @returns the styled text
   */
  pendingChoice: (text: string): string => dim(gray(text)),
  /**
   * A dimmed, italicized style for the next/previous conflict's text, shown as a preview once
   * the true common context runs out, so it reads as "coming up" rather than actual context
   * @param text the text to style
   * @returns the styled text
   */
  preview: (text: string): string => dim(italic(gray(text))),
  removal: red,
  /**
   * The box border / gap arrow / title for the side a pending or confirmed choice would overwrite
   * @param text the text to color
   * @returns the colored text
   */
  selectedSide: (text: string): string => bold(blue(text)),
}

/**
 * A truecolor background approximating pure blue blended at ~10% opacity over a dark terminal —
 * used to wash the currently selected block's rows — instead of a harsh, fully-saturated ANSI
 * background color. Terminals don't expose real alpha blending, so this is a fixed approximation;
 * tune the RGB values to taste.
 */
export const selectionBackground = {
  end: '[49m',
  start: '[48;2;30;32;60m',
}

/**
 * A saturated truecolor background used to wash the exact characters that differ between the two
 * sides of a modified line, so a one-word change doesn't get lost in the subtle whole-block wash
 * above. Deliberately brighter than `selectionBackground`.
 */
export const changeHighlightBackground = {
  end: '[49m',
  start: '[48;2;60;100;235m',
}

/**
 * Layout numbers that shape the merge UI : column widths, how much terminal chrome to reserve
 * when budgeting context lines, and spacing.
 */
export const layout = {
  /** rows always reserved outside the boxes : file/block line, blank, box top/bottom, status footer, blank, divider, 2 hint rows */
  chromeRowCount: 9,
  fallbackTerminalRows: 30,
  fallbackTerminalWidth: 100,
  /** width of the space between the two boxes, where the direction arrow appears */
  gapWidth: 2,
  /** width of the per-line change marker reserved on both sides */
  gutterWidth: 2,
  minColumnWidth: 24,
  /** smallest gap kept between footer hint columns when spacing them across the width */
  minHintGap: 2,
  /** box-drawing characters spent on each side of a box (the two vertical bars) */
  perBoxBorderWidth: 2,
  /** space reserved around a box title for its leading dash and padding spaces */
  titleSideCharsWidth: 4,
}

/** the blank space drawn between the two boxes, where the direction arrow appears */
export const gap = ' '.repeat(layout.gapWidth)

/** appended to a box's title once a choice in this session would overwrite it */
export const modifiedSuffix = ' (modified)'

/**
 * External merge tools to look for on this machine, in preference order, when the user asks for
 * one (the `e` key) instead of resolving a file block by block.
 */
export const externalTools = ['meld', 'kdiff3', 'diffuse', 'bcompare', 'araxismerge', 'araxismergecmd']

export type Hint = {
  /** shown next to the key */ description: string
  /** the single key that triggers this hint */ key: string
}

/** the footer's first row of keybinding hints */
export const primaryHints: Hint[] = [
  { description: 'move block to left', key: glyphs.arrowToLeft },
  { description: 'move block to right', key: glyphs.arrowToRight },
  { description: 'confirm', key: glyphs.confirmKey },
  { description: 'move between blocks', key: glyphs.navigateKeys },
]

/**
 * The footer's second row of keybinding hints. A function because the wrap toggle's description
 * depends on the current wrap state.
 * @param wrapEnabled whether wrapping is currently on
 * @returns the hints
 */
export function getSecondaryHints(wrapEnabled: boolean): Hint[] {
  return [
    { description: 'external merge tool', key: 'e' },
    { description: wrapEnabled ? 'un-wrap text' : 'wrap text', key: 'w' },
    { description: 'skip this file', key: 's' },
    { description: 'abort everything', key: 'a/q' },
  ]
}

export type NamedAction = {
  /** shown next to the key */ description: string
  /** the single key that triggers this action */ key: string
  /** the action name returned when matched */ name: string
}

/** keys offered when a file is still different after a merge attempt */
export const retryActions: NamedAction[] = [
  { description: 'abort everything', key: 'a/q', name: 'abort' },
  { description: 'retry merging this file', key: 'r', name: 'retry' },
  { description: 'skip this file for now', key: 's', name: 'skip' },
]
