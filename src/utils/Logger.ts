import { ILogger } from './interfaces/ILogger';

class Logger implements ILogger {
    private eventListeners: { [event: string]: ((...args: any[]) => void)[] } = {};

    log(message: string, ...optionalParams: any[]): void {
        console.log(message, ...optionalParams);
        this.emit('log', message, ...optionalParams);
    }

    error(message: string, ...optionalParams: any[]): void {
        console.error(message, ...optionalParams);
        this.emit('error', message, ...optionalParams);
    }

    warn(message: string, ...optionalParams: any[]): void {
        console.warn(message, ...optionalParams);
        this.emit('warn', message, ...optionalParams);
    }

    info(message: string, ...optionalParams: any[]): void {
        console.info(message, ...optionalParams);
        this.emit('info', message, ...optionalParams);
    }

    debug(message: string, ...optionalParams: any[]): void {
        console.debug(message, ...optionalParams);
        this.emit('debug', message, ...optionalParams);
    }

    trace(message: string, ...optionalParams: any[]): void {
        console.trace(message, ...optionalParams);
        this.emit('trace', message, ...optionalParams);
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
