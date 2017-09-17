import * as types from './types';
import { OutputChannel, window } from 'vscode';

/** OutputChannel to print to in the main editor */ 
let outputChannel: OutputChannel;

/**
 * Function to either log to the output channel, or create if not exists
 * 
 * @export
 * @param {string} string Text to print in the OutputChannel
 * @param {types.LogLevel} [level] Log level to print (useful for output colorizr)
 */
export function log(string: string, level?: types.LogLevel) {
    if (!outputChannel) {
        outputChannel = window.createOutputChannel('Mux');
    }
    outputChannel.appendLine(`${(level && level.toString()) || 'INFO'}: ${string}`);
}