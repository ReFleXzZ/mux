import { ExtensionContext, workspace, window } from "vscode";
import { getShell, getStateProvider, getSetting, getSessionName } from "./util";
import { spawnSync, SpawnSyncReturns } from "child_process";
import * as _ from 'lodash';
import { info, error } from "./log";

/**
 * Navigation direction enum for panes
 * 
 * @export
 * @enum {number} Navigation command input
 */
export enum PaneNavigationDirection {
    LAST_ACTIVE = "active",
    NEXT = "next",
    PREVIOUS = "previous",
    TOP = "top",
    BOTTOM = "bottom",
    LEFT = "left",
    RIGHT = "right",
    TOP_LEFT = "top-left",
    TOP_RIGHT = "top-right",
    BOTTOM_LEFT = "bottom-left",
    BOTTOM_RIGHT = "bottom-right",
    UP_OF = "up-of",
    DOWN_OF = "down-of",
    LEFT_OF = "left-of",
    RIGHT_OF = "right-of"
}


/**
 * Navigation direction enum for windows
 * 
 * @export
 * @enum {number} Navigation command input
 */
export enum WindowNavigationDirection {
    START = "start",
    END = "end",
    LAST_ACTIVE = "active",
    NEXT = "next",
    PREVIOUS = "previous"
}

export default interface MuxProvider {
    sessionExists(): boolean;
    createSession(windowName: string, startingCommand: string);
    createWindow(windowName: string, startingCommand: string);
    createPane(startingCommand: string, isHorizontal: boolean);
    moveToPane(direction: PaneNavigationDirection);
    moveToWindow(direction: WindowNavigationDirection);
    build(): boolean;
    attach();
    verifyExecutable(): boolean;
    killSession();
}

export class Runnable {
    protected context: ExtensionContext;
    protected readonly command: string = getSetting('executablePath', getSetting('provider'));
    protected readonly sessionName: string = getSessionName();

    constructor(context: ExtensionContext) {
        this.context = context;
    }

    protected runCommand(args: string[], ignoreErrors: boolean = false): SpawnSyncReturns<Buffer> {
        const shell = getShell();
        info(`[${this.constructor.name.replace("Provider", "").toLowerCase()}] Running ${this.command} ${args.join(' ')}`)
        const command = spawnSync(`${this.command}`, args, {'shell': shell, 'cwd': workspace.workspaceFolders[0].uri.path});
        
        if (!ignoreErrors && command.status != 0) {   
            error(`"${this.command} ${args.join(' ')}" gave "${_.upperFirst(command.stderr.toString().trim() || command.stdout.toString().trim())}" (${command.status})`);
        }

        return command;
    }
}