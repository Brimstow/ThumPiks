// Augment Express Request with request ID property.
// Set by requestIdMiddleware; available on all requests after that middleware runs.

// This import makes the file a module, enabling proper declaration merging
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Request } from 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

// Required export to make this a proper ES module for declaration merging
export {};
