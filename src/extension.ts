'use strict';
import { OutputChannel, ExtensionContext, Memento, commands, window } from 'vscode';
import * as hash from 'object-hash';
import * as types from './types';
import * as util from './util';
import * as mux from './mux';
import * as log from './log';

/**
 * Main function. Gets called when the extension is manually activated and when a workspace is loaded.
 * 
 * @export
 * @param {ExtensionContext} context Context of the extension
 */
export function activate(context: ExtensionContext) {
    const stateProvider: Memento = util.getStateProvider(context);
    stateProvider.update('commands', []);

    const projectName = util.getProjectName();

    mux.loadConfig(context);
    stateProvider.update('hash', hash(stateProvider.get('configuration')));

    const sessionDoesExist = mux.sessionExists(`${util.getSetting('prefix')}-${util.getProjectName()}`);
    if (sessionDoesExist) {
        mux.runTmux();
    } else {
        const tmuxCode = mux.parseArgs(context);
        
            if (util.getSetting('runAtStartup')) {
                if (tmuxCode) {
                    mux.runTmux();
                } else {
                    window.createTerminal();
                }
            }
    }

    let showMuxCommand = commands.registerCommand('extension.showMux', () => {
        mux.loadConfig(context);
        if (stateProvider.get('hash') != hash(util.getSetting('projectConfiguration')) || stateProvider.get<string[][]>('commands').length == 0) {
            const tmuxCode = mux.parseArgs(context);
            if (tmuxCode) {
                mux.runTmux();
            } else {
                window.createTerminal();
            }
        } else {
            mux.runTmuxAndCommands(context);
        }
    });

    let killSessionsCommand = commands.registerCommand('extension.killSessions', () => mux.killSessions(context));
    let killSessionCommand = commands.registerCommand('extension.killCurrentSession', () => mux.killSession(`${util.getSetting('prefix')}-${util.getProjectName()}`));

    context.subscriptions.push(showMuxCommand, killSessionCommand, killSessionsCommand);
}


/**
 * Gets called when the extension is deactivated. Should be used to cleanup temp files, if we get there
 * 
 * @export
 */
export function deactivate() {
}
