/** Demo identity is not production authentication. Keep the prototype local. */
export function assertPrototypeEnvironment(environment = process.env.NODE_ENV): void {
  if (environment === 'production') {
    throw new Error('The prototype API is disabled in production. Reviewed authentication and privacy controls are required before deployment.');
  }
}
