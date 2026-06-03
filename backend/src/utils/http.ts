export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "HTTP_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const asyncHandler =
  <T extends (...args: any[]) => Promise<any>>(handler: T) =>
  (...args: Parameters<T>) => {
    handler(...args).catch(args[2]);
  };
