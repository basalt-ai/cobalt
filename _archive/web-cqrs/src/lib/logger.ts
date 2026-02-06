type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
	private log(level: LogLevel, message: string, meta?: unknown) {
		const timestamp = new Date().toISOString();
		const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

		if (meta) {
			console[level](logMessage, meta);
		} else {
			console[level](logMessage);
		}
	}

	info(message: string, meta?: unknown) {
		this.log('info', message, meta);
	}

	warn(message: string, meta?: unknown) {
		this.log('warn', message, meta);
	}

	error(message: string, meta?: unknown) {
		this.log('error', message, meta);
	}

	debug(message: string, meta?: unknown) {
		if (process.env.NODE_ENV === 'development') {
			this.log('debug', message, meta);
		}
	}
}

export const logger = new Logger();
