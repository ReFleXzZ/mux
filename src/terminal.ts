import { getSetting } from './util';
import { spawnSync } from 'child_process';
import { ExtensionContext } from 'vscode';
import { tmuxCommand } from './mux';
import * as _ from 'lodash';
import { EnumValues } from 'enum-values';
import { log } from './log';

/**
 * Navigation direction enum for panes
 * 
 * @export
 * @enum {number} Navigation command input
 */
export enum PaneNavigationDirection {
    LAST,
    NEXT,
    PREVIOUS,
    TOP,
    BOTTOM,
    LEFT,
    RIGHT,
    TOP_LEFT,
    TOP_RIGHT,
    BOTTOM_LEFT,
    BOTTOM_RIGHT,
    UP_OF,
    DOWN_OF,
    LEFT_OF,
    RIGHT_OF
}

/**
 * Move in the given direction in the session.
 * 
 * @export
 * @param {string} sessionName Session to move within
 * @param {PaneNavigationDirection} direction Direction to move in
 * @param {ExtensionContext} context Context of the extension
 * @returns {number} Output of tmuxCommand
 */
export function moveTo(sessionName: string, direction: PaneNavigationDirection, context: ExtensionContext): number {
    const enumName = EnumValues.getNameFromValue(PaneNavigationDirection, direction);
    return tmuxCommand(context, ['select-pane', '-t', `${sessionName}:0.{${_.kebabCase(enumName)}}`])
}