import {ExtensionContext, OutputChannel, workspace, window, commands, Memento} from 'vscode';

/**
 * Get the vscode-compatible platform (useful for finding platform settings)
 * 
 * @export
 * @returns {string} vscode-compatible platform
 */
export function getPlatform(): string {
    const platform = process.platform;
    switch(platform) {
        case 'darwin':
            return 'osx';
        default:
            return platform;
    }
}

/**
 * Return the name of the project (doesn't support mutli-root worksapces yet)
 * 
 * @export
 * @returns {string} The name of the first project in the workspace
 */
export function getProjectName(): string {
    return workspace.workspaceFolders[0].name;
}


/**
 * Returns the setting for the default shell
 * 
 * @export
 * @returns {string} The default shell
 */
export function getShell(): string {
    return workspace.getConfiguration('terminal.integrated.shell').get<string>(getPlatform());
}


/**
 * Returns either workspaceState or globalState depending on the current use case
 * 
 * @export
 * @param {ExtensionContext} context Context to run methods on
 * @returns {Memento} workspaceState or globalState object for current context
 */
export function getStateProvider(context: ExtensionContext): Memento {
    return context.globalState.get('useWorkspaceState') ? context.workspaceState : context.globalState;
}


/**
 * Retrieve a setting from the current workspace
 * 
 * @export
 * @template T Type of setting to retrieve
 * @param {string} settingKey The key to get from the setting store
 * @param {T} [defaultValue] If no value was found, return this
 * @returns {T} Either `defaultValue` or the value
 */
export function getSetting<T>(settingKey: string, defaultValue?: T): T {
    const settings = workspace.getConfiguration('mux');
    return settings.has(settingKey) ? settings.get(settingKey) : defaultValue;
}


/**
 * Set `settingKey` to `value`
 * 
 * @export
 * @template T Type of setting
 * @param {string} settingKey The key to set in the setting store
 * @param {T} value The value to set
 */
export function updateSetting<T>(settingKey: string, value: T) {
    const settings = workspace.getConfiguration('mux');
    settings.update(settingKey, value);
}


/**
 * Convert a string to spawn-appropriate argument array
 * 
 * @export
 * @param {string} string String to convert
 * @returns {string[]} Array of arguments
 */
export function stringToArgs(string: string): string[] {
    return string.match(/('.*?'|[^'\s]+)+(?=\s*|\s*$)/g);
}