/** Lets node:test resolve the renderer's @shared alias and extensionless imports. */
const shared = new URL('../src/shared/', import.meta.url)

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@shared/')) {
    return nextResolve(new URL(`${specifier.slice('@shared/'.length)}.ts`, shared).href, context)
  }
  if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    for (const suffix of ['.ts', '.tsx', '/index.ts']) {
      try {
        return await nextResolve(specifier + suffix, context)
      } catch {
        // Try the next candidate extension.
      }
    }
  }
  return nextResolve(specifier, context)
}
