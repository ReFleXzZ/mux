'use strict';
import { OutputChannel, ExtensionContext, Memento, commands, window } from 'vscode';
import * as hash from 'object-hash';
import * as util from './util';
import * as mux from './mux';
import * as log from './log';
import * as terminal from './terminal';
import * as _ from 'lodash';
import { PaneNavigationDirection } from './terminal';
import { EnumValues } from 'enum-values';


/**
 * Main function. Gets called when the extension is manually activated and when a workspace is loaded.
 * 
 * @export
 * @param {ExtensionContext} context Context of the extension
 */
export function activate(context: ExtensionContext) {
    const stateProvider: Memento = util.getStateProvider(context);
    const projectName = util.getProjectName();

    mux.loadConfig(context);
    stateProvider.update('hash', hash(stateProvider.get('configuration')));

    let showMuxCommand = commands.registerCommand('extension.showMux', () => {
        mux.loadConfig(context);
        if (stateProvider.get('hash') != hash(stateProvider.get('configuration')) || stateProvider.get<string[][]>('commands').length == 0) {
            mux.parseArgs(context) ? mux.runTmux() : window.showErrorMessage('Error parsing commands');
        } else {
            mux.runTmuxAndCommands(context);
        }
    });

    context.subscriptions.push(
        showMuxCommand, 
        commands.registerCommand('extension.killSessions', () => mux.killSessions(context)), 
        commands.registerCommand('extension.killCurrentSession', () => mux.killSession(`${util.getSetting('prefix')}-${util.getProjectName()}`)),
        commands.registerCommand('extension.moveLastActivePane', () => terminal.moveToPaneDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.LAST_ACTIVE, context)),
        commands.registerCommand('extension.moveToNextPane', () => terminal.moveToPaneDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.NEXT, context)),
        commands.registerCommand('extension.moveToPreviousPane', () => terminal.moveToPaneDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.PREVIOUS, context)),
        commands.registerCommand('extension.moveToTopPane', () => terminal.moveToPaneDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.TOP, context)),
        commands.registerCommand('extension.moveToBottomPane', () => terminal.moveToPaneDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.BOTTOM, context)),
        commands.registerCommand('extension.moveToLeftPane', () => terminal.moveToPaneDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.LEFT, context)),
        commands.registerCommand('extension.moveToRightPane', () => terminal.moveToPaneDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.RIGHT, context)),
        commands.registerCommand('extension.moveToTopLeftPane', () => terminal.moveToPaneDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.TOP_LEFT, context)),
        commands.registerCommand('extension.moveToTopRightPane', () => terminal.moveToPaneDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.TOP_RIGHT, context)),
        commands.registerCommand('extension.moveToBottomLeftPane', () => terminal.moveToPaneDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.BOTTOM_LEFT, context)),
        commands.registerCommand('extension.moveToBottomRightPane', () => terminal.moveToPaneDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.BOTTOM_RIGHT, context)),
        commands.registerCommand('extension.moveToUpOfPane', () => terminal.moveToPaneDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.UP_OF, context)),
        commands.registerCommand('extension.moveToDownOfPane', () => terminal.moveToPaneDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.DOWN_OF, context)),
        commands.registerCommand('extension.moveToLeftOfPane', () => terminal.moveToPaneDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.LEFT_OF, context)),
        commands.registerCommand('extension.moveToRightOfPane', () => terminal.moveToPaneDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.RIGHT_OF, context)),
        
        commands.registerCommand('extension.moveToLastActiveWindow', () => terminal.moveToWindowDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.WindowNavigationDirection.LAST_ACTIVE, context)),
        commands.registerCommand('extension.moveToNextWindow', () => terminal.moveToWindowDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.WindowNavigationDirection.NEXT, context)),
        commands.registerCommand('extension.movePreviousWindow', () => terminal.moveToWindowDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.WindowNavigationDirection.PREVIOUS, context)),
        commands.registerCommand('extension.moveToStartWindow', () => terminal.moveToWindowDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.WindowNavigationDirection.START, context)),
        commands.registerCommand('extension.moveToEndWindow', () => terminal.moveToWindowDirection(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.WindowNavigationDirection.END, context)),
    );

    if (util.getSetting('runAtStartup')) {
        mux.sessionExists(`${util.getSetting('prefix')}-${util.getProjectName()}`).then(result => {
            if (result) {
                mux.runTmux();
            } else {
                mux.parseArgs(context) ? mux.runTmux() : window.showErrorMessage('Error parsing commands');
            }
        })
    }
}


/**
 * Gets called when the extension is deactivated. Should be used to cleanup temp files, if we get there
 * 
 * @export
 */
export function deactivate() {
}
