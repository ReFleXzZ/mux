import {ExtensionContext, OutputChannel, workspace, window, commands, Memento} from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as _ from 'lodash';
import * as cp from 'child_process';
import * as hash from 'object-hash';
import * as promisify from 'util.promisify';
import * as types from './types';
import * as util from './util';
import * as log from './log';

/**
 * Check whether a session called `sessionName` is found
 * 
 * @export
 * @param {string} sessionName Name of the session to find
 * @returns {Promise<boolean>} True if session is found, false otherwise
 */
export async function sessionExists(sessionName: string): Promise<boolean> {
    return parseInt(`${await promisify(cp.exec(`${util.getSetting('tmuxPath')} ls | grep ${sessionName}: | wc -l`))}`) > 0;
}


/**
 * Run a tmux command and handle errors neatly
 * 
 * @export
 * @param {ExtensionContext} context Context of the current extension
 * @param {string[]} args Array of arguemnts to run
 * @returns {number} 0 if command ran successfully, -1 otherwise
 */
export function tmuxCommand(context: ExtensionContext, args: string[]): number {
    const shell = util.getShell();

    const tmux = cp.spawnSync(`${util.getSetting('tmuxPath')}`, args, {'shell': shell, 'cwd': workspace.workspaceFolders[0].uri.path});
    const stateProvider = util.getStateProvider(context);
    
    if (tmux.status === 0) {
        const commands = stateProvider.get<string[][]>('commands');
        stateProvider.update('commands', [...commands, [`${util.getSetting('tmuxPath')}`, ...args]])
        return 0;
    } else {        
        log.log(`"${util.getSetting('tmuxPath')} ${args.join(' ')}" (${tmux.status}) stdout: ${tmux.stdout.toString()} stderr: ${tmux.stderr.toString()}`);
        
        if (tmux.stderr.toString().startsWith('duplicate session:')) {
            window.showErrorMessage(`${_.upperFirst(tmux.stderr.toString())}`, null, {title: 'Restart'}, {title: 'Attach'}).then(clicked => {
                switch(clicked.title) {
                    case 'Restart':
                        stateProvider.update('commands', []);
                        killSession(`${util.getSetting('prefix')}-${util.getProjectName()}`);
                        parseArgs(context);
                    case 'Attach':
                        runTmux();
                        break;
                    default:
                        break;
                }
            });
        } else {
            window.showErrorMessage(`${_.upperFirst(tmux.stderr.toString())}`);
        }
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
    const args = `${util.getSetting('tmuxPath')} -2 attach-session -t ${util.getSetting('prefix')}-${projectName}`;
    log.log(`Attaching to session: ${util.getSetting('prefix')}-${projectName}`);
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
    const tmuxPath = util.getSetting('tmuxPath');

    const tmuxLs = cp.spawnSync(`${tmuxPath}`, ['ls']);
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
export function parseArgs(context: ExtensionContext): boolean {
    const stateProvider = util.getStateProvider(context);
    const projectName = util.getProjectName();
    const prefix = util.getSetting('prefix');    
    const configuration = stateProvider.get('configuration');
    
    let args: string[][] = [];
    if (configuration && Object.keys(util.getSetting('projectConfiguration')).length > 0) {
        if (configuration.hasOwnProperty('session')) {
            const session = configuration['session'];
            if (session.hasOwnProperty('windows')) {
                const windows = session.windows;
                args.push(`new -d -s ${prefix}-${projectName} '${windows[0].command}'`.match(/('.*?'|[^'\s]+)+(?=\s*|\s*$)/g));
                windows.forEach((window, index) => {
                    if (window.hasOwnProperty('splits')) {
                        window.splits.forEach(split => {
                            args.push(`split-window -${split.isHorizontal ? 'h' : 'v'} '${split.command}'`.match(/('.*?'|[^'\s]+)+(?=\s*|\s*$)/g));
                        });
                    } else {
                        args.push(`new-window '${window.command}'`.match(/('.*?'|[^'\s]+)+(?=\s*|\s*$)/g));
                    }
                });
            }
        }
    } else {
        // TODO: Make this a bit safer
    }

    return !_.some(args, arg => tmuxCommand(context, arg) != 0);
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
    return cp.spawnSync(`${util.getSetting('tmuxPath')}`, ['kill-session', '-t', sessionName]);
}


/**
 * Load the config into the settings store
 * 
 * @export
 * @param {ExtensionContext} context Context of the extension
 */
export function loadConfig(context: ExtensionContext) {
    const stateProvider: Memento = util.getStateProvider(context);
    context.globalState.update('useWorkspaceState', false);
    if (Object.keys(util.getSetting('projectConfiguration')).length > 0) {
        log.log('Using project config');
        stateProvider.update('configuration', util.getSetting('projectConfiguration'));
        context.globalState.update('useWorkspaceState', true);
    } else if (util.getSetting('useGlobal')) {
        log.log('Using global config');
        stateProvider.update('configuration', util.getSetting('globalConfiguration'));
    } else {
        log.log('Using no configuration');
        stateProvider.update('configuration', {});
    }
}

