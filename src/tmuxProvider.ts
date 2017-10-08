import MuxProvider, { PaneNavigationDirection, WindowNavigationDirection, Runnable } from './provider';
import { ExtensionContext, workspace, window } from 'vscode';
import { tmuxCommand } from './mux';
import { getShell, getSetting, getStateProvider, getProjectName } from './util';
import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as _ from 'lodash';
import { info } from './log';

/**
 * Provider for tmux. 
 * Enables creation of sessions, windows & panes.
 * 
 * @export
 * @class TmuxProvider
 * @extends {Runnable}
 * @implements {MuxProvider}
 */
export default class TmuxProvider extends Runnable implements MuxProvider {
    constructor(context: ExtensionContext) {
        super(context);
        if (!this.verifyExecutable()) {
            throw new Error(`Using wrong executable for tmux provider. \n(${this.runCommand(['-V']).output})`);
        }
    }

    /**
     * Create a new tmux session if the current one doesn't exist
     * 
     * @param {string} startingCommand Initial command to run
     * @param {string} windowName Name of the initial window
     * @memberof TmuxProvider
     */
    createSession(windowName: string, startingCommand: string) {
        this.addCommand(['new', '-d', '-s', `'${this.sessionName}'`, '-n', `'${windowName}'`, `'${startingCommand}'` ]);
    }

    /**
     * Create a window within the current session
     * 
     * @param {string} windowName Name of the window
     * @param {string} startingCommand Command to run within the window
     * @memberof TmuxProvider
     */
    createWindow(windowName: string, startingCommand: string) {
        this.addCommand(['new-window', '-n', `'${windowName}'`, startingCommand]);
    }

    /**
     * Create a new pane in the current window
     * 
     * @param {string} startingCommand Initial command to run in the pane
     * @param {boolean} isHorizontal Whether or not to create a horizontal pane or not
     * @memberof TmuxProvider
     */
    createPane(startingCommand: string, isHorizontal: boolean) {
        this.addCommand(['split-window', `-${isHorizontal ? 'h' : 'v'}`, `'${startingCommand}'`]);
    }

    /**
     * Move panes in the given direction
     * 
     * @param {PaneNavigationDirection} direction Direction to move
     * @memberof TmuxProvider
     */
    moveToPane(direction: PaneNavigationDirection) {
        this.runCommand(['select-pane', '-t', `=${this.sessionName}:{${PaneNavigationDirection[direction]}}, '-t', this.sessionName`]);
    }

    /**
     * Moves windows in the given direction
     * 
     * @param {WindowNavigationDirection} direction Direction to move
     * @memberof TmuxProvider
     */
    moveToWindow(direction: WindowNavigationDirection) {
        this.runCommand(['select-window', '-t', `=${this.sessionName}:{${WindowNavigationDirection[direction]}}, '-t', this.sessionName`]);
    }

    /**
     * Check if the session exists
     * 
     * @returns {boolean} True if the session exists
     * @memberof TmuxProvider
     */
    sessionExists(): boolean {
        return this.runCommand(['has-session', '-t', this.sessionName], true).status === 0;
    }

    /**
     * Attach to the session
     * 
     * @memberof TmuxProvider
     */
    attach() {
        const shell = getShell();
        const args = `${this.command} -2 attach-session -t ${this.sessionName}`;
        info(`[tmux] Attaching to session: ${this.sessionName}`);
        const term = window.createTerminal(getProjectName(), `${shell}`, ["-c", `${args}`]);
        term.show();
    }

    /**
     * Ensure that the executable defined is the correct one for the provider
     * 
     * @returns {boolean} True if the executable is correct
     * @memberof TmuxProvider
     */
    verifyExecutable(): boolean {
        const result = this.runCommand(['-V'], true).output.toString().includes('tmux');
        return result;
    }

    /**
     * Add the command to the commands object
     * 
     * @private
     * @param {string} args Arguments to send
     * @memberof ScreenProvider
     */
    private addCommand(args: string[]) {
        const stateProvider = getStateProvider(this.context);
        const commands: string[][] = stateProvider.get('commands');
        stateProvider.update('commands', [...commands, [this.command, ...args]]);
    }

    /**
     * Build a layout from the parsed configuration
     * 
     * @memberof TmuxProvider
     */
    build(): boolean {
        const stateProvider = getStateProvider(this.context);
        const commands = stateProvider.get('commands');
        const shell = getShell();
        return !_.some(commands, command => this.runCommand(command.slice(1)).status != 0)
    }

    /**
     * Kill the current session
     * 
     * @memberof TmuxProvider
     */
    killSession() {
        return this.runCommand(['kill-session', '-t', this.sessionName]);
    }
}