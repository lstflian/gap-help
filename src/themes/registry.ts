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
        setFileState: (file: string, docDir: string) => void
    ) => string | null;
    renderFile: (
        filePath: string,
        docDir: string,
        gapRoot: string,
        cspSource: string,
        navScript: string,
        toWebviewUri: (absPath: string) => string
    ) => string | null;
}> = {
    [native.STYLE_NAME]: native,
};
