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
    LAST_ACTIVE,
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

export enum WindowNavigationDirection {
    START,
    END,
    LAST_ACTIVE,
    NEXT,
    PREVIOUS
}

/**
 * Move in the given pane direction in the session.
 * 
 * @export
 * @param {string} sessionName Session to move within
 * @param {PaneNavigationDirection} direction Direction to move in
 * @param {ExtensionContext} context Context of the extension
 * @returns {number} Output of tmuxCommand
 */
export function moveToPaneDirection(sessionName: string, direction: PaneNavigationDirection, context: ExtensionContext): number {
    const enumName = _.kebabCase(EnumValues.getNameFromValue(PaneNavigationDirection, direction));
    return tmuxCommand(context, ['select-pane', '-t', `${sessionName}:0.{${enumName}}`])
}


/**
 * Move to a given window by the passed id
 * 
 * @export
 * @param {string} sessionName Session to move within
 * @param {string} windowId Window ID to move to
 * @param {ExtensionContext} context Context of the extension
 * @returns {number} Output of tmuxCommand
 */
export function moveToWindowById(sessionName: string, windowId: string, context: ExtensionContext): number {
    return tmuxCommand(context, ['select-window', '-t', `${sessionName}:${windowId}`]);
}


/**
 * Move in the given window direction in the session
 * 
 * @export
 * @param {string} sessionName 
 * @param {WindowNavigationDirection} direction 
 * @param {ExtensionContext} context 
 * @returns {number} 
 */
export function moveToWindowDirection(sessionName: string, direction: WindowNavigationDirection, context: ExtensionContext): number {
    const enumName =  _.kebabCase(EnumValues.getNameFromValue(WindowNavigationDirection, direction));
    return tmuxCommand(context, ['select-window', '-t',`${sessionName}:{${enumName}}`]);
}