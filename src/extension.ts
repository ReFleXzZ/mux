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
    stateProvider.update('commands', []);

    const projectName = util.getProjectName();

    mux.loadConfig(context);
    stateProvider.update('hash', hash(stateProvider.get('configuration')));

    mux.sessionExists(`${util.getSetting('prefix')}-${util.getProjectName()}`).then(result => {
        if (result) {
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
    })

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

    // Movement commands (too messy, need to somehow clean this up)
    
    let moveLastCommand = commands.registerCommand('extension.moveLast', () => terminal.moveTo(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.LAST, context))
    let moveNextCommand = commands.registerCommand('extension.moveNext', () => terminal.moveTo(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.NEXT, context));    
    let movePreviousCommand = commands.registerCommand('extension.movePrevious', () => terminal.moveTo(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.PREVIOUS, context));    
    let moveTopCommand = commands.registerCommand('extension.moveTop', () => terminal.moveTo(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.TOP, context));    
    let moveBottomCommand = commands.registerCommand('extension.moveBottom', () => terminal.moveTo(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.BOTTOM, context));    
    let moveLeftCommand = commands.registerCommand('extension.moveLeft', () => terminal.moveTo(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.LEFT, context));    
    let moveRightCommand = commands.registerCommand('extension.moveRight', () => terminal.moveTo(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.RIGHT, context));    
    let moveTopLeftCommand = commands.registerCommand('extension.moveTopLeft', () => terminal.moveTo(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.TOP_LEFT, context));    
    let moveTopRightCommand = commands.registerCommand('extension.moveTopRight', () => terminal.moveTo(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.TOP_RIGHT, context));    
    let moveBottomLeftCommand = commands.registerCommand('extension.moveBottomLeft', () => terminal.moveTo(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.BOTTOM_LEFT, context));    
    let moveBottomRightCommand = commands.registerCommand('extension.moveBottomRight', () => terminal.moveTo(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.BOTTOM_RIGHT, context));    
    let moveUpOfCommand = commands.registerCommand('extension.moveUpOf', () => terminal.moveTo(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.UP_OF, context));    
    let moveDownOfCommand = commands.registerCommand('extension.moveDownOf', () => terminal.moveTo(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.DOWN_OF, context));    
    let moveLeftOfCommand = commands.registerCommand('extension.moveLeftOf', () => terminal.moveTo(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.LEFT_OF, context));    
    let moveRightOfCommand = commands.registerCommand('extension.moveRightOf', () => terminal.moveTo(`${util.getSetting('prefix')}-${util.getProjectName()}`, terminal.PaneNavigationDirection.RIGHT_OF, context));    
    
    let killSessionsCommand = commands.registerCommand('extension.killSessions', () => mux.killSessions(context));
    let killSessionCommand = commands.registerCommand('extension.killCurrentSession', () => mux.killSession(`${util.getSetting('prefix')}-${util.getProjectName()}`));

    context.subscriptions.push(
        showMuxCommand, 
        killSessionCommand, 
        killSessionsCommand,
        moveLastCommand,
        moveNextCommand,
        movePreviousCommand,
        moveTopCommand,
        moveBottomCommand,
        moveLeftCommand,
        moveRightCommand,
        moveTopLeftCommand,
        moveTopRightCommand,
        moveBottomLeftCommand,
        moveBottomRightCommand,
        moveUpOfCommand,
        moveDownOfCommand,
        moveLeftOfCommand,
        moveRightOfCommand,
    );
}


/**
 * Gets called when the extension is deactivated. Should be used to cleanup temp files, if we get there
 * 
 * @export
 */
export function deactivate() {
}
