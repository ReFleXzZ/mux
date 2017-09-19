import { OutputChannel, window } from 'vscode';

/**
 * Log level enum (used for OutputChannel printing)
 * 
 * @export
 * @enum {number} Log level
 */
export const enum LogLevel {
    INFO,
    WARNING,
    ERROR
}

/** OutputChannel to print to in the main editor */ 
let outputChannel: OutputChannel;

/**
 * Function to either log to the output channel, or create if not exists
 * 
 * @export
 * @param {string} string Text to print in the OutputChannel
 * @param {types.LogLevel} [level] Log level to print (useful for output colorizr)
 */
export function log(string: string, level?: LogLevel) {
    if (!outputChannel) {
        outputChannel = window.createOutputChannel('Mux');
    }
    outputChannel.appendLine(`${(level && level.toString()) || 'INFO'}: ${string}`);
}