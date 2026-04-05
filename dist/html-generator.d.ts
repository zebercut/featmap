import { Feature } from "./types";
export interface HtmlOptions {
    live?: boolean;
    projectName?: string;
}
export declare function generateHtml(featuresDir: string, outPath: string, opts?: Pick<HtmlOptions, "projectName">): void;
export declare function buildHtmlFromFeatures(features: Feature[], opts?: HtmlOptions): string;
