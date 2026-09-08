/**
 * Minimal ambient type declaration for `fontkit` (2.0.4), scoped to exactly the
 * surface `inter-typography.test.ts` (D-09/D-10) uses.
 *
 * `fontkit` ships no bundled `.d.ts` and no `@types/fontkit` is installed —
 * per 41-RESEARCH.md, "fontkit is already a transitive dependency... no new
 * dependency needed for the D-09 test," and per this repo's package-install
 * policy, adding a new devDependency (even a well-known DefinitelyTyped
 * package) requires human verification rather than a silent auto-install.
 * A local ambient declaration avoids the install entirely.
 */
declare module 'fontkit' {
  export interface Font {
    /** e.g. 'Inter-Regular', 'Inter-Medium', 'Inter-SemiBold', 'Inter-Bold' */
    postscriptName: string;
    hasGlyphForCodePoint(codePoint: number): boolean;
  }

  export function openSync(filePath: string, postscriptName?: string): Font;
}
