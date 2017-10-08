'use strict';
import { OutputChannel, ExtensionContext, Memento, commands, window } from 'vscode';
import * as hash from 'object-hash';
import * as util from './util';
import * as mux from './mux';
import * as log from './log';
import * as _ from 'lodash';
import MuxProvider, { PaneNavigationDirection, WindowNavigationDirection } from './provider';

/**
 * Main function. Gets called when the extension is manually activated and when a workspace is loaded.
 * 
 * @export
 * @param {ExtensionContext} context Context of the extension
 */
export function activate(context: ExtensionContext) {
    const provider = util.getMuxProvider(context).then(provider => {
        const stateProvider: Memento = util.getStateProvider(context);
        const sessionName =  util.getSessionName();
        mux.loadConfig(context);
        stateProvider.update('hash', hash(stateProvider.get('configuration')));
        context.subscriptions.push(
            commands.registerCommand('extension.showMux', () => startup(context, stateProvider, provider)), 
            commands.registerCommand('extension.killSessions', () => mux.killSessions(context)), 
            commands.registerCommand('extension.killCurrentSession', () => mux.killSession(sessionName)),
            commands.registerCommand('extension.moveLastActivePane', () => provider.moveToPane(PaneNavigationDirection.LAST_ACTIVE)),
            commands.registerCommand('extension.moveToNextPane', () => provider.moveToPane(PaneNavigationDirection.NEXT)),
            commands.registerCommand('extension.moveToPreviousPane', () => provider.moveToPane(PaneNavigationDirection.PREVIOUS)),
            commands.registerCommand('extension.moveToTopPane', () => provider.moveToPane(PaneNavigationDirection.TOP)),
            commands.registerCommand('extension.moveToBottomPane', () => provider.moveToPane(PaneNavigationDirection.BOTTOM)),
            commands.registerCommand('extension.moveToLeftPane', () => provider.moveToPane(PaneNavigationDirection.LEFT)),
            commands.registerCommand('extension.moveToRightPane', () => provider.moveToPane(PaneNavigationDirection.RIGHT)),
            commands.registerCommand('extension.moveToTopLeftPane', () => provider.moveToPane(PaneNavigationDirection.TOP_LEFT)),
            commands.registerCommand('extension.moveToTopRightPane', () => provider.moveToPane(PaneNavigationDirection.TOP_RIGHT)),
            commands.registerCommand('extension.moveToBottomLeftPane', () => provider.moveToPane(PaneNavigationDirection.BOTTOM_LEFT)),
            commands.registerCommand('extension.moveToBottomRightPane', () => provider.moveToPane(PaneNavigationDirection.BOTTOM_RIGHT)),
            commands.registerCommand('extension.moveToUpOfPane', () => provider.moveToPane(PaneNavigationDirection.UP_OF)),
            commands.registerCommand('extension.moveToDownOfPane', () => provider.moveToPane(PaneNavigationDirection.DOWN_OF)),
            commands.registerCommand('extension.moveToLeftOfPane', () => provider.moveToPane(PaneNavigationDirection.LEFT_OF)),
            commands.registerCommand('extension.moveToRightOfPane', () => provider.moveToPane(PaneNavigationDirection.RIGHT_OF)),
            commands.registerCommand('extension.moveToLastActiveWindow', () => provider.moveToWindow(WindowNavigationDirection.LAST_ACTIVE)),
            commands.registerCommand('extension.moveToNextWindow', () => provider.moveToWindow(WindowNavigationDirection.NEXT)),
            commands.registerCommand('extension.movePreviousWindow', () => provider.moveToWindow(WindowNavigationDirection.PREVIOUS)),
            commands.registerCommand('extension.moveToStartWindow', () => provider.moveToWindow(WindowNavigationDirection.START)),
            commands.registerCommand('extension.moveToEndWindow', () => provider.moveToWindow(WindowNavigationDirection.END)),
        );
        if (util.getSetting('runAtStartup')) {
            startup(context, stateProvider, provider);
        }
    }).catch(message => log.error(`Something went wrong getting the provider in extension activation '${message}'`));


}

/**
 * Create a mux layout 
 * 
 * @param {ExtensionContext} context 
 * @param {Memento} stateProvider 
 */
function startup(context: ExtensionContext, stateProvider: Memento, provider: MuxProvider) {
    const sessionName = util.getSessionName();  
    mux.loadConfig(context);
    
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
                    startup(context, stateProvider, provider);
                    break;
                default:
                    break;
            }
        });
    }
}


/**
 * Gets called when the extension is deactivated. Should be used to cleanup temp files, if we get there
 * 
 * @export
 */
export function deactivate() {
}
