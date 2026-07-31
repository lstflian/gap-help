/**
 * Theme registry.
 */
import { native } from './native';
import { HelpEntry } from '../indexData';

export const STYLES: Record<string, {
    STYLE_NAME: string;
    renderEntry: (
        entry: HelpEntry,
        gapRoot: string,
        cspSource: string,
        navScript: string,
        toWebviewUri: (absPath: string) => string,
        setFileState: (file: string, docDir: string) => void,
        docStyle?: string,
        mathJax?: boolean
    ) => string | null;
    renderFile: (
        filePath: string,
        docDir: string,
        gapRoot: string,
        cspSource: string,
        navScript: string,
        toWebviewUri: (absPath: string) => string,
        docStyle?: string,
        mathJax?: boolean
    ) => string | null;
}> = {
    [native.STYLE_NAME]: native,
};
