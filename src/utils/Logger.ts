import { ILogger } from './interfaces/ILogger';

class Logger implements ILogger {
    private eventListeners: { [event: string]: ((...args: any[]) => void)[] } = {};

    log(message: string): void {
        console.log(message);
        this.emit('log', message);
    }

    error(message: string): void {
        console.error(message);
        this.emit('error', message);
    }

    warn(message: string): void {
        console.warn(message);
        this.emit('warn', message);
    }

    info(message: string): void {
        console.info(message);
        this.emit('info', message);
    }

    debug(message: string): void {
        console.debug(message);
        this.emit('debug', message);
    }

    trace(message: string): void {
        console.trace(message);
        this.emit('trace', message);
    }

    on(event: string, callback: (...args: any[]) => void): void {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    off(event: string, callback: (...args: any[]) => void): void {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }

    private emit(event: string, ...args: any[]): void {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event].forEach(callback => callback(...args));
    }
}

export { Logger };
