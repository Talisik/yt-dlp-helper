import * as child_process from 'child_process';
import * as crypto from 'crypto';
import * as os from 'os';
import treeKill from 'tree-kill';
import { Config } from './config.js';

export class Terminal {
    /**
     * @type {Record<string, Terminal>}
     */
    static #all: Record<string, Terminal> = {};
    static #lastRun = 0;
    static runIntervalMS = 500;

    #id: string;
    #process: import('child_process').ChildProcess;
    #data: any;
    #running: boolean;
    #valueSelector: ((text: string) => any) | null;
    #exitCode: any;
    #exitSignal: any;

    /**
     * Retrieves the unique identifier for this Terminal instance.
     *
     * @returns The unique identifier.
     */
    get id() {
        return this.#id;
    }

    /**
     * Returns the process that this Terminal is controlling.
     *
     * @returns The controlled process.
     */
    get process() {
        return this.#process;
    }

    /**
     * Checks if the controlled process has been terminated.
     *
     * @returns True if the process has been killed, otherwise false.
     */
    get killed() {
        return this.#process.killed;
    }

    /**
     * Checks if the controlled process is currently running.
     *
     * @returns True if the process is running, otherwise false.
     */
    get running() {
        return this.#running;
    }

    /**
     * Retrieves the exit code of the controlled process, if available.
     *
     * @returns The exit code of the process, or null if the process
     * has not yet exited or the exit code is unavailable.
     */
    get exitCode() {
        return this.#exitCode;
    }

    /**
     * Retrieves the exit signal of the controlled process, if available.
     *
     * @returns The signal that caused the process to exit,
     * or null if the process exited without a signal.
     */
    get exitSignal() {
        return this.#exitSignal;
    }

    /**
     * Constructs a new Terminal instance.
     *
     * @param {import('child_process').ChildProcess} process - The process to
     *   control.
     * @param {function(string): any} valueSelector -
     *   A function that takes a chunk of the process's stdout and returns an
     *   object with the following properties:
     *
     *   - `ok`: A boolean indicating whether the chunk contains a value to be
     *     yielded.
     *   - `data`: The value to be yielded. If `ok` is false, this property will
     *     be ignored.
     *   - `stop`: A boolean indicating whether the process should be stopped.
     *     If true, the process will be killed and the async generator will
     *     immediately return.
     */
    constructor(
        process: import('child_process').ChildProcess,
        valueSelector: ((text: string) => any) | null
    ) {
        this.#id = crypto.randomBytes(16).toString('hex');
        this.#data = [];
        this.#running = true;
        this.#process = process;
        this.#valueSelector = valueSelector;

        Terminal.#all[this.#id] = this;

        if (process.stdout)
            process.stdout.on('data', this.#data.push);

        process.on('close', (code, signal) => {
            this.#running = false;
            this.#exitCode = code;
            this.#exitSignal = signal;

            delete Terminal.#all[this.#id];
        });
    }

    /**
     * Kills the controlled process using the given signal.
     *
     * If the process has already exited or been killed, this method does nothing.
     *
     * If the platform is Windows, the `taskkill` command is used to ensure the
     * process is terminated.
     *
     * @param {NodeJS.Signals} [signal='SIGTERM'] - The signal to send to the process.
     *   Defaults to 'SIGTERM'.
     */
    kill(signal: NodeJS.Signals = 'SIGTERM') {
        if (!this.#running) return;

        if (this.#process.killed) return;

        if (os.platform() === 'win32') {
            const pid = this.#process.pid;

            if (pid == null) return;

            treeKill(pid, signal);
        } else {
            this.#process.kill(signal);
        }

        if (Config.log)
            console.debug(`Process '${this.#id}' killed.`);
    }

    async *#listen() {
        let i = 0;

        while (i < this.#data.length) {
            yield Buffer.from(this.#data[i++]).toString(
                'utf-8'
            );
        }

        if (!this.#process.stdout) return;

        for await (const bytes of this.#process.stdout) {
            yield Buffer.from(bytes).toString('utf-8');
        }
    }

    /**
     * Yields values from the process's stdout as they are received.
     *
     * The values yielded are determined by the `valueSelector` function
     * given to the constructor. If the process has exited, the async
     * generator will immediately return.
     *
     * @yields {any} Values from the process's stdout.
     */
    async *listen() {
        for await (const text of this.#listen()) {
            if (Config.log)
                console.debug(text.substring(0, 32));

            if (this.#valueSelector) {
                yield this.#valueSelector(text);
            } else {
                yield text;
            }
        }
    }

    /**
     * Waits for the process to exit.
     *
     * If the process has already exited, the function will immediately return.
     *
     * @returns {Promise<void>} A promise that resolves when the process has exited.
     */
    async wait(): Promise<void> {
        if (!this.#running) {
            return;
        }

        await new Promise((resolve) =>
            this.#process.once('close', resolve)
        );
    }

    /**
     * Constructs a new Terminal instance.
     *
     * This function will attempt to spawn the given command with the given
     * arguments and value selector. If the spawn fails, it will retry up to
     * the given number of times with a delay of the given length between each
     * retry.
     *
     * @param {Object} options - The options for the function.
     * @param {string} options.command - The command to spawn.
     * @param {string[]} [options.args] - The arguments to pass to the command.
     * @param {function(string): any} [options.valueSelector] -
     *   A function that takes a chunk of the process's stdout and returns an
     *   object with the following properties:
     *
     *   - `ok`: A boolean indicating whether the chunk contains a value to be
     *     yielded.
     *   - `data`: The value to be yielded. If `ok` is false, this property will
     *     be ignored.
     *   - `stop`: A boolean indicating whether the process should be stopped.
     *     If true, the process will be killed and the async generator will
     *     immediately return.
     * @param {number} [options.tryCount=3] - The number of times to retry if
     *   the spawn fails.
     * @param {number} [options.retryIntervalMS=1_500] - The delay between
     *   retries in milliseconds.
     * @param {number} [options.intermissionMS=1_000] - The delay between the
     *   process spawning and the async generator starting in milliseconds.
     *
     * @returns {Promise<Terminal | null>} - A promise that resolves with an instance
     *   of Terminal, or null if the spawn fails all of the retries.
     */
    static async new({
        command,
        args,
        valueSelector = null,
        tryCount = 10,
        retryIntervalMS = 500,
        intermissionMS = 1_000,
    }: {
        command: string;
        args: string[];
        valueSelector?: ((text: string) => any) | null;
        tryCount?: number;
        retryIntervalMS?: number;
        intermissionMS?: number;
    }): Promise<Terminal | null> {
        const now = Date.now();
        const nextRun =
            Terminal.#lastRun + Terminal.runIntervalMS;

        if (nextRun > now) {
            Terminal.#lastRun = nextRun;
            const sleepTime = nextRun - now;

            if (Config.log)
                console.debug(
                    `Ran too early. Sleeping for ${sleepTime}ms...`
                );

            await new Promise((resolve) =>
                setTimeout(resolve, sleepTime)
            );
        } else {
            Terminal.#lastRun = now;
        }

        if (Config.log)
            console.debug(
                `Running '${command} ${args.join(' ')}'...`
            );

        for (let i = 0; i < tryCount; i++) {
            try {
                const process = child_process.spawn(
                    command,
                    args,
                    {
                        windowsHide: true,
                        stdio: ['ignore', 'pipe', 'ignore'],
                    }
                );

                const terminal = new Terminal(
                    process,
                    valueSelector
                );
                let error: any = null;

                process.once('error', (e) => (error = e));
                process.stdout.once(
                    'error',
                    (e) => (error = e)
                );

                await new Promise((resolve, reject) => {
                    if (error != null) {
                        reject(error);
                        return;
                    }

                    process.once('error', reject);
                    process.stdout.once('error', reject);

                    setTimeout(resolve, intermissionMS);
                });

                return terminal;
            } catch (e) {
                if (Config.log)
                    console.debug('An error occurred.', e);

                await new Promise((resolve) =>
                    setTimeout(resolve, retryIntervalMS)
                );
            }
        }

        return null;
    }

    /**
     * Retrieves a Terminal instance by its unique identifier.
     *
     * @param {string} id - The unique identifier.
     * @returns {Terminal?} The associated Terminal instance, or
     *   undefined if no such instance exists.
     */
    static fromID(id: string): Terminal | null {
        return Terminal.#all[id];
    }
}
