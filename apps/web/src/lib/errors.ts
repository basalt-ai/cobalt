export class AppError extends Error {
	constructor(
		message: string,
		public statusCode = 500,
		public code?: string,
	) {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}

export class NotFoundError extends AppError {
	constructor(message = 'Resource not found') {
		super(message, 404, 'NOT_FOUND');
	}
}

export class ValidationError extends AppError {
	constructor(message = 'Validation failed') {
		super(message, 400, 'VALIDATION_ERROR');
	}
}

export class DatabaseError extends AppError {
	constructor(message = 'Database operation failed') {
		super(message, 500, 'DATABASE_ERROR');
	}
}
