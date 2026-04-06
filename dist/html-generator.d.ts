import { Feature } from "./types";
export interface HtmlOptions {
    live?: boolean;
    projectName?: string;
}
/** Try to read "name" from the root package.json above featuresDir.
 *  Walks up to 10 levels and picks the topmost package.json found,
 *  so subpackages (packages/foo) don't shadow the main project name. */
export declare function detectProjectName(featuresDir: string): string;
export declare function generateHtml(featuresDir: string, outPath: string, opts?: Pick<HtmlOptions, "projectName">): void;
export declare function buildHtmlFromFeatures(features: Feature[], opts?: HtmlOptions): string;
