/**
 * Error types for Congo River Compositional Intelligence
 * Provides structured error handling across services
 */

export enum ErrorCode {
  // Database errors
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED = 'DATABASE_QUERY_FAILED',
  DATABASE_MIGRATION_FAILED = 'DATABASE_MIGRATION_FAILED',
  
  // Service errors
  PYTHON_SERVICE_FAILED = 'PYTHON_SERVICE_FAILED',
  PYTHON_SERVICE_TIMEOUT = 'PYTHON_SERVICE_TIMEOUT',
  PYTHON_SERVICE_PARSE_ERROR = 'PYTHON_SERVICE_PARSE_ERROR',
  
  // Tool errors
  UNKNOWN_TOOL = 'UNKNOWN_TOOL',
  INVALID_TOOL_ARGUMENTS = 'INVALID_TOOL_ARGUMENTS',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INPUT_VALIDATION_FAILED = 'INPUT_VALIDATION_FAILED',
  
  // Configuration errors
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  MISSING_ENVIRONMENT_VARIABLE = 'MISSING_ENVIRONMENT_VARIABLE',
  
  // System errors
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
}

export class CongoError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'CongoError';
  }
}

export class ValidationError extends CongoError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends CongoError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.DATABASE_QUERY_FAILED, message, details);
    this.name = 'DatabaseError';
  }
}

export class ServiceError extends CongoError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.PYTHON_SERVICE_FAILED, message, details);
    this.name = 'ServiceError';
  }
}

export class ToolError extends CongoError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.TOOL_EXECUTION_FAILED, message, details);
    this.name = 'ToolError';
  }
}