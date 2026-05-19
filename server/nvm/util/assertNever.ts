// Compile-time exhaustiveness guard. If a discriminated-union switch is missing
// a case, the value reaching this call is no longer `never` and TypeScript flags
// the call site. At runtime it throws — an unreachable branch was reached.
export function assertNever(x: never, context = 'value'): never {
  throw new Error(`Unhandled ${context}: ${JSON.stringify(x)}`);
}
