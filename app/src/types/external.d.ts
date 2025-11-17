// Minimal ambient module declarations for libs without bundled types
declare module 'csso' {
  const csso: any
  export default csso
}

declare module 'html-minifier-terser' {
  export function minify(input: string, options?: any): Promise<string>
}


