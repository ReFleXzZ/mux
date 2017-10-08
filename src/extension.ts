'use strict';
import { OutputChannel, ExtensionContext, Memento, commands, window } from 'vscode';
import * as hash from 'object-hash';
import * as util from './util';
import * as mux from './mux';
import * as log from './log';
import * as terminal from './terminal';
import * as _ from 'lodash';
import { PaneNavigationDirection } from './terminal';

/**
 * Main function. Gets called when the extension is manually activated and when a workspace is loaded.
 * 
 * @export
 * @param {ExtensionContext} context Context of the extension
 */
export function activate(context: ExtensionContext) {
    const stateProvider: Memento = util.getStateProvider(context);
    const sessionName = `${util.getSetting('prefix')}-${util.getProjectName()}`;
    // const result = mux.sessionExists(context, sessionName);

    mux.loadConfig(context);
    stateProvider.update('hash', hash(stateProvider.get('configuration')));

    let showMuxCommand = commands.registerCommand('extension.showMux', () => {
        // mux.loadConfig(context);
        // if (stateProvider.get('hash') != hash(stateProvider.get('configuration')) || stateProvider.get<string[][]>('commands').length == 0) {
        //     mux.parseArgs(context) ? mux.runTmux() : window.showErrorMessage('Error parsing commands');
        // } else {
        //     mux.runTmuxAndCommands(context);
        // }

        // if (result) {
        //     mux.runTmux();
        // } else {
        //     window.showErrorMessage(`Duplicate session for ${sessionName}`, null, {title: 'Restart'}, {title: 'Attach'}).then(clicked => {
        //         switch(clicked.title) {
        //             case 'Restart':
        //                 stateProvider.update('commands', []);
        //                 mux.killSession(sessionName);
        //                 // mux.parseArgs(context);
        //             case 'Attach':
        //                 mux.runTmux();
        //                 break;
        //             default:
        //                 break;
        //         }
        //     });
        // }
        startup(context, stateProvider);
    });

    context.subscriptions.push(
        showMuxCommand, 
        commands.registerCommand('extension.killSessions', () => mux.killSessions(context)), 
        commands.registerCommand('extension.killCurrentSession', () => mux.killSession(sessionName)),
        commands.registerCommand('extension.moveLastActivePane', () => terminal.moveToPaneDirection(sessionName, terminal.PaneNavigationDirection.LAST_ACTIVE, context)),
        commands.registerCommand('extension.moveToNextPane', () => terminal.moveToPaneDirection(sessionName, terminal.PaneNavigationDirection.NEXT, context)),
        commands.registerCommand('extension.moveToPreviousPane', () => terminal.moveToPaneDirection(sessionName, terminal.PaneNavigationDirection.PREVIOUS, context)),
        commands.registerCommand('extension.moveToTopPane', () => terminal.moveToPaneDirection(sessionName, terminal.PaneNavigationDirection.TOP, context)),
        commands.registerCommand('extension.moveToBottomPane', () => terminal.moveToPaneDirection(sessionName, terminal.PaneNavigationDirection.BOTTOM, context)),
        commands.registerCommand('extension.moveToLeftPane', () => terminal.moveToPaneDirection(sessionName, terminal.PaneNavigationDirection.LEFT, context)),
        commands.registerCommand('extension.moveToRightPane', () => terminal.moveToPaneDirection(sessionName, terminal.PaneNavigationDirection.RIGHT, context)),
        commands.registerCommand('extension.moveToTopLeftPane', () => terminal.moveToPaneDirection(sessionName, terminal.PaneNavigationDirection.TOP_LEFT, context)),
        commands.registerCommand('extension.moveToTopRightPane', () => terminal.moveToPaneDirection(sessionName, terminal.PaneNavigationDirection.TOP_RIGHT, context)),
        commands.registerCommand('extension.moveToBottomLeftPane', () => terminal.moveToPaneDirection(sessionName, terminal.PaneNavigationDirection.BOTTOM_LEFT, context)),
        commands.registerCommand('extension.moveToBottomRightPane', () => terminal.moveToPaneDirection(sessionName, terminal.PaneNavigationDirection.BOTTOM_RIGHT, context)),
        commands.registerCommand('extension.moveToUpOfPane', () => terminal.moveToPaneDirection(sessionName, terminal.PaneNavigationDirection.UP_OF, context)),
        commands.registerCommand('extension.moveToDownOfPane', () => terminal.moveToPaneDirection(sessionName, terminal.PaneNavigationDirection.DOWN_OF, context)),
        commands.registerCommand('extension.moveToLeftOfPane', () => terminal.moveToPaneDirection(sessionName, terminal.PaneNavigationDirection.LEFT_OF, context)),
        commands.registerCommand('extension.moveToRightOfPane', () => terminal.moveToPaneDirection(sessionName, terminal.PaneNavigationDirection.RIGHT_OF, context)),
        commands.registerCommand('extension.moveToLastActiveWindow', () => terminal.moveToWindowDirection(sessionName, terminal.WindowNavigationDirection.LAST_ACTIVE, context)),
        commands.registerCommand('extension.moveToNextWindow', () => terminal.moveToWindowDirection(sessionName, terminal.WindowNavigationDirection.NEXT, context)),
        commands.registerCommand('extension.movePreviousWindow', () => terminal.moveToWindowDirection(sessionName, terminal.WindowNavigationDirection.PREVIOUS, context)),
        commands.registerCommand('extension.moveToStartWindow', () => terminal.moveToWindowDirection(sessionName, terminal.WindowNavigationDirection.START, context)),
        commands.registerCommand('extension.moveToEndWindow', () => terminal.moveToWindowDirection(sessionName, terminal.WindowNavigationDirection.END, context)),
    );

    if (util.getSetting('runAtStartup')) {
        // const result = mux.sessionExists(context, sessionName);

        // if (result) {
        //     mux.runTmux();
        // } else {
        //     window.showErrorMessage(`Duplicate session for ${sessionName}`, null, {title: 'Restart'}, {title: 'Attach'}).then(clicked => {
        //         switch(clicked.title) {
        //             case 'Restart':
        //                 stateProvider.update('commands', []);
        //                 mux.killSession(sessionName);
        //                 mux.parseArgs(context);
        //             case 'Attach':
        //                 mux.runTmux();
        //                 break;
        //             default:
        //                 break;
        //         }
        //     });
        // }
        startup(context, stateProvider);
    }
}

function startup(context: ExtensionContext, stateProvider: Memento) {
    const sessionName = util.getSessionName();  
    util.getMuxProvider(context).then(provider => {
        if (!provider.sessionExists()) {
            mux.parseArgs(context, provider).then(result => {
                if (result) {
                    provider.attach();
                }
            }).catch(message => log.error(`Something went wrong getting the provider in extension activation '${message}'`));
        } else {
            window.showErrorMessage(`Duplicate session for ${sessionName}`, null, {title: 'Restart'}, {title: 'Attach'}).then(clicked => {
                switch(clicked.title) {
                    case 'Restart':
                        stateProvider.update('commands', []);
                        provider.killSession();
                    case 'Attach':
                        startup(context, stateProvider);
                        break;
                    default:
                        break;
                }
            });
        }
    }).catch(message => log.error(`Something went wrong getting the provider in extension activation '${message}'`));
}


/**
 * Gets called when the extension is deactivated. Should be used to cleanup temp files, if we get there
 * 
 * @export
 */
export function deactivate() {
}
