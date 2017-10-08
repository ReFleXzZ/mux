import {ExtensionContext, OutputChannel, workspace, window, commands, Memento} from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import * as cp from 'child_process';
import * as hash from 'object-hash';
import * as promisify from 'util.promisify';
import * as util from './util';
import { Validator, Schema } from 'jsonschema';
import TmuxProvider from './tmuxProvider';
import MuxProvider from './provider';
import { info, error, warning } from './log';

/**
 * Check whether a session called `sessionName` is found
 * 
 * @export
 * @param {string} sessionName Name of the session to find
 * @returns {Promise<boolean>} True if session is found, false otherwise
 */
export function sessionExists(context: ExtensionContext, sessionName: string): number {
    return tmuxCommand(context, ['has-session', '-t', sessionName], true);
}


/**
 * Run a tmux command and handle errors neatly
 * 
 * @export
 * @param {ExtensionContext} context Context of the current extension
 * @param {string[]} args Array of arguemnts to run
 * @returns {number} 0 if command ran successfully, -1 otherwise
 */
// TODO: Move this to a TmuxProvider class
export function tmuxCommand(context: ExtensionContext, args: string[], ignoreErrors: boolean = false): number {
    const shell = util.getShell();

    info(`Running ${util.getSetting('executablePath')} ${args.join(' ')}`)
    const tmux = cp.spawnSync(`${util.getSetting('executablePath')}`, args, {'shell': shell, 'cwd': workspace.workspaceFolders[0].uri.path});
    const stateProvider = util.getStateProvider(context);
    
    if (tmux.status === 0) {
        const commands = stateProvider.get<string[][]>('commands');
        stateProvider.update('commands', [...commands, [`${util.getSetting('executablePath')}`, ...args]])
        return 0;
    } else if (!ignoreErrors) {   
        error(`"${util.getSetting('executablePath')} ${args.join(' ')}" gave ${_.upperFirst(tmux.stderr.toString())} (${tmux.status})`);
        return -1;
    }
}

// TODO: Clean this up slightly
/**
 * Attempt to attach to the running session
 * 
 * @export
 */
export function runTmux() {
    const shell = util.getShell();
    const projectName =  util.getProjectName();
    const args = `${util.getSetting('executablePath')} -2 attach-session -t ${util.getSetting('prefix')}-${projectName}`;
    info(`Attaching to session: ${util.getSetting('prefix')}-${projectName}`);
    const term = window.createTerminal(projectName, `${shell}`, ["-c", `${args}`]);
    term.show();
}


/**
 * Run saved commands and attach to the session if they exited cleanly
 * 
 * @export
 * @param {ExtensionContext} context Context of the extension
 */
export function runTmuxAndCommands(context: ExtensionContext) {
    const shell = util.getShell();
    const stateProvider = util.getStateProvider(context);
    const result = !_.some(stateProvider.get<string[][]>('commands'), command => {
        const args = _.slice(command, 1, command.length);
        const tmuxCode = tmuxCommand(context, args);
        if (tmuxCode == -1) {
            return true;
        }
    });
    if (result) {
        runTmux();
    }
}


/**
 * Get all running tmux sessions
 * 
 * @export
 * @param {ExtensionContext} context Context of the extension
 * @returns {string[]} Array of output of `tmux ls` in lines
 */
export function getSessions(context: ExtensionContext): string[] {
    const prefix = util.getSetting('prefix');
    const executablePath = util.getSetting('executablePath');

    const tmuxLs = cp.spawnSync(`${executablePath}`, ['ls']);
    return tmuxLs.stdout.toString().match(/[^\r\n]+/g);
}


/**
 * Kill all sessions starting with `mux.prefix`
 * 
 * @export
 * @param {ExtensionContext} context Context of the extension
 */
export function killSessions(context: ExtensionContext) {
    const sessions = getSessions(context);
    let items = [];
    sessions.forEach(session => {
        if (session.startsWith(util.getSetting('prefix'))) {
            const tokens = session.split(' ');
            items.push({description: `${tokens[1]} window${tokens[1] == '1' ? '' : 's'}`, label: tokens[0].substring(0, tokens[0].length-1)});
        }
    });
    window.showQuickPick(items, {placeHolder: 'Select which session to kill'}).then(val => val ? killSession(val.label) : null);
}


/**
 * Navigate through the configuration and create tmux commands to run
 * 
 * @export
 * @param {ExtensionContext} context Context of the extension
 * @returns {boolean} True if all commands exited cleanly, false otherwise
 */
export async function parseArgs(context: ExtensionContext, provider: MuxProvider): Promise<boolean> {
    const stateProvider = util.getStateProvider(context);
    const projectName = util.getProjectName();
    const prefix = util.getSetting('prefix');    
    const sessionName = `${prefix}-${projectName}`;
    const configuration = stateProvider.get('configuration');
    
    if (configuration) {
        if (configuration.hasOwnProperty('windows')) {
            const windows = configuration['windows'];
            provider.createSession(windows[0].title ||  windows[0].command, windows[0].command);
            windows[0].panes.forEach(pane => {
                provider.createPane(pane.command, pane.isHorizontal);
            });
            _.filter(windows, window => window.title !== windows[0].title).forEach(window => {
                provider.createWindow(window.title || window.command, window.command);
                if (window.hasOwnProperty('panes')) {
                    window.panes.forEach(pane => {
                        provider.createPane(pane.command, pane.isHorizontal);
                    });
                }
            });
        }
    }

    // return !_.some(args, arg => tmuxCommand(context, arg) != 0);
    // TODO: Refactor Provider interface to builder and run build/apply here
    // return promisify(true);
    // return false;
    return provider.build();
}


/**
 * Kill session called `sessionName`
 * 
 * @export
 * @param {string} sessionName 
 * @returns {cp.SpawnSyncReturns<string>} ChildProcess detailing the command
 */
export function killSession(sessionName: string): cp.SpawnSyncReturns<string> {
    console.info(`Killing ${sessionName}`);
    return cp.spawnSync(`${util.getSetting('executablePath')}`, ['kill-session', '-t', sessionName]);
}


/**
 * Load the config into the settings store and validate the config file.
 * 
 * This validation logic will be migrated to logic to live validate the config file
 * 
 * @export
 * @param {ExtensionContext} context Context of the extension
 */
export function loadConfig(context: ExtensionContext) {
    const stateProvider: Memento = util.getStateProvider(context);
    stateProvider.update('commands', []);
    stateProvider.update('configuration', {});
    // TODO: Add support for contextually checking the global file 
    const filePath = path.join(workspace.workspaceFolders[0].uri.fsPath, '.mux.json');
    const file = JSON.parse(fs.readFileSync(filePath).toString());

    const paneSchema = {
        "id": "/Pane",
        "type": "object",
        "properties": {
            "isHorizontal": {
                "type": "boolean",
            },
            "command": {
                "type": "string"
            }
        },
        "required": [
            "command",
            "isHorizontal"
        ]
    }

    const windowSchema = {
        "id": "/Window",
        "type": "object",
        "properties": {
            "title": {
                "type": "string"
            },
            "command": {
                "type": "string"
            },
            "panes": {
                "type": "array",
                "items": {
                    "$ref": "/Pane"
                }
            }
        },
        "required": [
            "command"
        ]
    }

    const sessionSchema = {
        "id": "/Session",
        "type": "object",
        "properties": {
            "title": {
                "type": "string"
            },
            "windows": {
                "type": "array",
                "items": {
                    "$ref": "/Window"
                }
            }
        },
        "required": [
            "windows"
        ]
    }

    const v = new Validator();
    v.addSchema(sessionSchema, "/Session");
    v.addSchema(windowSchema, "/Window");
    v.addSchema(paneSchema, "/Pane");
    const result = v.validate(file, sessionSchema);
    if (result.valid) {
        info('Using valid project config');
        stateProvider.update('configuration', file);
    } else if (util.getSetting('globalConfiguration')) {
        // TODO: Implement a problem matcher
        warning('Project config is invalid, using global config');
        stateProvider.update('configuration', util.getSetting('globalConfiguration'));
    }
}

