import { OutputChannel, window } from 'vscode';

/**
 * Log level enum (used for OutputChannel printing)
 * 
 * @export
 * @enum {number} Log level
 */
const enum LogLevel {
    INFO = "INFO",
    WARNING = "WARNING",
    ERROR = "ERROR"
}

/** OutputChannel to print to in the main editor */ 
let outputChannel: OutputChannel;

/**
 * Function to either log to the output channel, and create if not exists
 * 
 * @param {string} string Text to print in the OutputChannel
 * @param {LogLevel} [level] Log level to print (useful for output colorizr)
 */
function log(string: string, level: LogLevel) {
    if (!outputChannel) {
        outputChannel = window.createOutputChannel('Mux');
    }
    outputChannel.appendLine(`${level}: ${string}`);
}

/**
 * Log a string
 * 
 * @export
 * @param {string} string String to log
 */
export function info(string: string) {
    log(string, LogLevel.INFO);
}

/**
 * Log a warning
 * 
 * @export
 * @param {string} string Warning to log
 */
export function warning(string: string) {
    log(string, LogLevel.WARNING);   
}

/**
 * Log an error
 * 
 * @export
 * @param {string} string Error to log
 */
export function error(string: string) {
    log(string, LogLevel.ERROR);
}