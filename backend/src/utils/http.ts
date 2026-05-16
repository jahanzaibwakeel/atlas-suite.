export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const asyncHandler =
  <T extends (...args: any[]) => Promise<any>>(handler: T) =>
  (...args: Parameters<T>) => {
    handler(...args).catch(args[2]);
  };
