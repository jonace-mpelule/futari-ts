export type Config = { 
    cors: boolean,
    /**
     * @description - Root path of your project file
     * @example - root: proccess.cwd()
     */
    root: string,

    port: number,
    compressionEnabled?: boolean,
}