'use strict';
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as _ from 'lodash';
const { spawn, spawnSync } = require('child_process');
var hash = require('object-hash');

let outputChannel: vscode.OutputChannel;

const enum LogLevel {
    INFO,
    WARNING,
    ERROR
}

function log(string: string, level?: LogLevel) {
    if (outputChannel) {
        outputChannel.appendLine(`${(level && level.toString()) || 'INFO'}: ${string}`);
    } else {
        switch (level) {
            case LogLevel.INFO:
                console.info(`Mux: ${string}`);
                break;
            case LogLevel.WARNING:
                console.warn(`Mux: ${string}`);
                break;
            case LogLevel.ERROR:
                console.error(`Mux: ${string}`);
                break;
            default:
                console.log(`Mux: ${string}`);
                break;
        }
    }
}

function getPlatform() {
    const platform = process.platform;
    switch(platform) {
        case 'darwin':
            return 'osx';
        default:
            return platform;
    }
}

// TODO: Support multi-root workspaces
function getProjectName() {
    return vscode.workspace.workspaceFolders[0].name;
}

function getShell() {
    return vscode.workspace.getConfiguration('terminal.integrated.shell').get<string>(getPlatform());
}

function getStateProvider(context: vscode.ExtensionContext) {
    return context.globalState.get('useWorkspaceState') ? context.workspaceState : context.globalState;
}

function getSetting<T>(settingKey: string, defaultValue?: T) {
    const settings = vscode.workspace.getConfiguration('mux');
    return settings.has(settingKey) ? settings.get(settingKey) : defaultValue;
}

function updateSetting<T>(settingKey: string, value: T) {
    const settings = vscode.workspace.getConfiguration('mux');
    settings.update(settingKey, value);
}

function sessionExists(sessionName) {
    const tmuxPath = getSetting('tmuxPath');
    const ls = spawn(`${tmuxPath}`, ['ls']);
    const grep = spawn('grep', [`sessionName`]);
    const wc = spawn('wc', ['-l']);
    const logCommand = (command, code) => {
        if (code !== 0) {
            log(`${command} exited with code ${code}`);
        }
    }
    ls.stdout.on('data', data => grep.stdin.write(data));
    ls.on('close', code => {
        logCommand('tmux ls', code);
        grep.stdin.end();
    });
}

function tmuxCommand(context: vscode.ExtensionContext, args: string[]) {
    const shell = getShell();

    const tmux = spawnSync(`${getSetting('tmuxPath')}`, args, {'shell': shell, 'cwd': vscode.workspace.workspaceFolders[0].uri.path});
    const stateProvider = getStateProvider(context);
    
    // TODO: Move this to a log/output channel
    if (tmux.status === 0) {
        const commands = stateProvider.get<String[][]>('commands');
        stateProvider.update('commands', [...commands, [`${getSetting('tmuxPath')}`, ...args]])
        return 0;
    } else {        
        log(`"${getSetting('tmuxPath')} ${args.join(' ')}" (${tmux.status}) stdout: ${tmux.stdout.toString()} stderr: ${tmux.stderr.toString()}`);
        // if (isActivating) {
            // runTmux();
        if (tmux.stderr.toString().startsWith('duplicate session:')) {
            vscode.window.showErrorMessage(`${_.upperFirst(tmux.stderr.toString())}`, null, {title: 'Restart'}, {title: 'Attach'}).then(clicked => {
                switch(clicked.title) {
                    case 'Restart':
                        stateProvider.update('commands', []);
                        killSession(`${getSetting('prefix')}-${ getProjectName()}`);
                        parseArgs(stateProvider, context);
                    case 'Attach':
                        runTmux();
                        break;
                    default:
                        break;
                }
            });
        } else {
            vscode.window.showErrorMessage(`${_.upperFirst(tmux.stderr.toString())}`);
        }
        return -1;
    }
}

function runTmux() {
    const shell = getShell();
    const projectName =  getProjectName();
    const args = `${getSetting('tmuxPath')} -2 attach-session -t ${getSetting('prefix')}-${projectName}`;
    log(`Attaching to session: ${getSetting('prefix')}-${projectName}`);
    const term = vscode.window.createTerminal(projectName, `${shell}`, ["-c", `${args}`]);
    term.show();
}

function runTmuxAndCommands(context) {
    const shell = getShell();
    const stateProvider = getStateProvider(context);
    const result = !_.some(stateProvider.get<String[][]>('commands'), command => {
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

function getSessions(context) {
    const prefix = getSetting('prefix');
    const tmuxPath = getSetting('tmuxPath');

    const tmuxLs = spawnSync(`${tmuxPath}`, ['ls']);
    return tmuxLs.stdout.toString().match(/[^\r\n]+/g);
}

function killSessions(context) {
    const sessions = getSessions(context);
    let items = [];
    sessions.forEach(session => {
        if (session.startsWith(getSetting('prefix'))) {
            const tokens = session.split(' ');
            items.push({description: `${tokens[1]} window${tokens[1] == '1' ? '' : 's'}`, label: tokens[0].substring(0, tokens[0].length-1)});
        }
    });
    vscode.window.showQuickPick(items, {placeHolder: 'Select which session to kill'}).then(val => val ? killSession(val.label) : null);
}

function parseArgs(stateProvider, context) {
    const projectName = getProjectName();
    const prefix = getSetting('prefix');    
    const configuration = stateProvider.get('configuration');
    
    let args: String[][] = [];
    if (configuration && Object.keys(getSetting('projectConfiguration')).length > 0) {
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

function killSession(sessionName) {
    console.info(`Killing ${sessionName}`);
    return spawnSync(`${getSetting('tmuxPath')}`, ['kill-session', '-t', sessionName]);
}

function loadConfig(context: vscode.ExtensionContext) {
    const stateProvider: vscode.Memento = getStateProvider(context);
    context.globalState.update('useWorkspaceState', false);
    if (Object.keys(getSetting('projectConfiguration')).length > 0) {
        log('Using project config');
        stateProvider.update('configuration', getSetting('projectConfiguration'));
        context.globalState.update('useWorkspaceState', true);
    } else if (getSetting('useGlobal')) {
        log('Using global config');
        stateProvider.update('configuration', getSetting('globalConfiguration'));
    } else {
        log('Using no configuration');
        stateProvider.update('configuration', {});
    }
}

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Mux');
    const stateProvider: vscode.Memento = getStateProvider(context);
    stateProvider.update('commands', []);
    const tmuxPath = getSetting('tmuxPath');
    const prefix = getSetting('prefix');

    const projectName = getProjectName();

    loadConfig(context);
    sessionExists(`${getSetting('prefix')}-${getProjectName()}`);
    stateProvider.update('hash', hash(stateProvider.get('configuration')));

    const tmuxCode = parseArgs(stateProvider, context);

    if (getSetting('runAtStartup')) {
        if (tmuxCode) {
            runTmux();
        } else {
            vscode.window.createTerminal();
        }
    }

    let showMuxCommand = vscode.commands.registerCommand('extension.showMux', () => {
        loadConfig(context);
        if (stateProvider.get('hash') != hash(getSetting('projectConfiguration')) || stateProvider.get<String[][]>('commands').length == 0) {
            const tmuxCode = parseArgs(stateProvider, context);
            if (tmuxCode) {
                runTmux();
            } else {
                vscode.window.createTerminal();
            }
        } else {
            runTmuxAndCommands(context);
        }
    });

    let killSessionsCommand = vscode.commands.registerCommand('extension.killSessions', () => killSessions(context));
    let killSessionCommand = vscode.commands.registerCommand('extension.killCurrentSession', () => killSession(`${getSetting('prefix')}-${ getProjectName()}`));

    context.subscriptions.push(showMuxCommand, killSessionCommand, killSessionsCommand);
}

export function deactivate() {
}
