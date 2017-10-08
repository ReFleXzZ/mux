import MuxProvider, { PaneNavigationDirection, WindowNavigationDirection, Runnable } from './provider';
import { ExtensionContext, workspace } from 'vscode';
import { getSetting, getShell, getStateProvider } from './util';
import { spawnSync } from 'child_process';
import { resolve } from 'path';
import * as _ from 'lodash';
import { tmpdir } from 'os';
import { appendFile, stat, mkdirSync, unlink } from 'fs';
import { info, error } from './log';

/**
 * Minimal provider for screen. Will complete this if demand arises.
 * 
 * @export
 * @class ScreenProvider
 * @extends {Runnable}
 * @implements {MuxProvider}
 */
export default class ScreenProvider extends Runnable implements MuxProvider {
    private readonly shell = getShell();

    constructor(context: ExtensionContext) {
        super(context);
        if (!this.verifyExecutable()) {
            throw new Error(`Using wrong executable for screen provider. \n(${this.runCommand(['-v']).output})`);
        }
    }

    /**
     * Check if the session exists
     * 
     * @returns {boolean} True if the session exists
     * @memberof ScreenProvider
     */
    sessionExists(): boolean {
        return this.runCommand(['-r', `'${this.sessionName}'`]).status !== 0;
    }

    /**
     * Create a new screen session and add a simple status line to show current tabs, hostname and date/time
     * 
     * @param {string} startingCommand Initial command to run
     * @param {string} windowName Name of the initla window
     * @memberof ScreenProvider
     */
    createSession(startingCommand: string, windowName: string) {
        this.addCommand(`sessionname '${this.sessionName}'`)
        this.addCommand('hardstatus alwayslastline');
        this.addCommand("hardstatus string '%{= kG}[ %{G}%H %{g}][%= %{= kw}%?%-Lw%?%{r}(%{W}%n*%f%t%?(%u)%?%{r})%{w}%?%+Lw%?%?%= %{g}][%{B} %m-%d %{W}%c %{g}]'");
        this.addCommand(`${this.command} -t '${windowName}' ${this.shell} -c '${startingCommand}'`);
    }

    /**
     * Create a window within the current session
     * 
     * @param {string} windowName Name of the window
     * @param {string} startingCommand Command to run within the window
     * @memberof ScreenProvider
     */
    createWindow(windowName: string, startingCommand: string) {
        this.addCommand(`${this.command} -t '${windowName}' ${this.shell} -c '${startingCommand}'`);
    }

    /**
     * Create a new pane in the current window
     * 
     * @param {string} startingCommand Initial command to run in the pane
     * @param {boolean} isHorizontal Whether or not to create a horizontal pane or not
     * @memberof ScreenProvider
     */
    createPane(startingCommand: string, isHorizontal: boolean) {
        this.addCommand(`split${isHorizontal ? ' ' : ' -v'}`);
        this.addCommand('focus down');
        this.addCommand(`${this.command} ${this.shell} -c '${startingCommand}'`);
    }

    /**
     * Move panes in the given direction
     * 
     * @param {PaneNavigationDirection} direction Direction to move
     * @memberof ScreenProvider
     */
    moveToPane(direction: PaneNavigationDirection) {
        throw new Error("Method not implemented.");
    }

    /**
     * Moves windows in the given direction
     * 
     * @param {WindowNavigationDirection} direction Direction to move
     * @memberof ScreenProvider
     */
    moveToWindow(direction: WindowNavigationDirection) {
        throw new Error("Method not implemented.");
    }

    /**
     * Attach to the session
     * 
     * @memberof ScreenProvider
     */
    attach() {
        this.runCommand(['-r', `'${this.sessionName}'`]);
    }

    /**
     * Ensure that the executable defined is the correct one for the provider
     * 
     * @returns {boolean} True if the executable is correct
     * @memberof ScreenProvider
     */
    verifyExecutable(): boolean {
        return this.runCommand(['-v']).output.toString().includes('Screen version');
    }

    /**
     * Add the command to the rc file
     * 
     * @private
     * @param {string} args Arguments to send
     * @memberof ScreenProvider
     */
    private addCommand(args: string) {
        let folder = this.context.storagePath;
        if (!folder) {
            folder = resolve(tmpdir(), `mux_${"xxxxx".replace(/[x]/g, c => {
                const r = Math.random() * 16 | 0;
                return r.toString(16);
            })}`);
        }
        stat(folder, (err, stats) => {
            if (err && err.code == "ENOENT")  {
                info(`Creating config folder "${folder}"`);
                mkdirSync(folder);
            }
            unlink(resolve(folder, `${this.sessionName}_screen`));
            appendFile(resolve(folder, `${this.sessionName}_screen`), `${args}\n`, err => error(`Error with file: "${err}"`));
        });
    }


    /**
     * Build a layout from the parsed commands
     * 
     * @memberof ScreenProvider
     */
    build() {
        throw new Error("Method not implemented.");
    }
}