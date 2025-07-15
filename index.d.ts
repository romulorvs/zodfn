import type { ZodType as z3ZodType, input as InputV3 } from "zod/v3";
import type { ZodMiniType as z4ZodMiniType, input as InputV4Mini } from "zod/v4-mini";
import type { z as ZType, ZodType as z4ZodType, input as InputV4 } from "zod/v4";

/**
 * Infers the argument types from a ZodFunction or AsyncZodFunction.
 *
 * @template T - The ZodFunction or AsyncZodFunction type
 * @example
 * ```typescript
 * const fn = zfn.args(z.string(), z.number()).create(() => "result");
 * type Args = InferArgs<typeof fn>; // [string, number]
 * ```
 */
export type InferArgs<T> = T extends ZodFunction<infer A, any>
  ? A
  : T extends AsyncZodFunction<infer A, any>
  ? A
  : never;

/**
 * Infers the return type from a ZodFunction or AsyncZodFunction.
 *
 * @template T - The ZodFunction or AsyncZodFunction type
 * @example
 * ```typescript
 * const fn = zfn.returns(z.string()).create(() => "result");
 * type Return = InferReturns<typeof fn>; // string
 * ```
 */
export type InferReturns<T> = T extends ZodFunction<any, infer R>
  ? R
  : T extends AsyncZodFunction<any, infer R>
  ? R
  : never;

/**
 * Default error class for ZodFn errors.
 */
export declare class ZodFnError extends Error {
  constructor(message: string);
  name: "ZodFnError";
}

/**
 * Zod instance.
 */
type Z = typeof ZType & object; // 'object' added for better intellisense

type ZodType = z3ZodType | z4ZodType | z4ZodMiniType;

type InputZodType<T extends ZodType> = T extends z3ZodType
  ? InputV3<T>
  : T extends z4ZodType
  ? InputV4<T>
  : T extends z4ZodMiniType
  ? InputV4Mini<T>
  : never;

type InputZodTuple<T extends readonly ZodType[]> = {
  [K in keyof T]: InputZodType<T[K]>;
};

/**
 * Represents an async function with Zod validation and additional methods.
 *
 * @template Args - The argument types as a tuple
 * @template Returns - The return type
 */
type AsyncZodFunction<Args, Returns> = ((
  ...args: Args
) => Promise<Returns extends Promise<infer T> ? T : Returns>) & {
  /**
   * Replaces the function implementation with a mock function.
   *
   * @param fn - The mock function to use
   * @returns The same AsyncZodFunction instance for chaining
   */
  mock(fn: (...args: Args) => Returns): AsyncZodFunction<Args, Returns>;

  /**
   * Resets the function to its original implementation.
   *
   * @returns The same AsyncZodFunction instance for chaining
   */
  resetMock(): AsyncZodFunction<Args, Returns>;

  /**
   * Adds a spy function that gets called after successful execution.
   *
   * @param fn - The spy function that receives arguments and return value
   * @returns The same AsyncZodFunction instance for chaining
   */
  spy(fn: (args: Args, ret: Returns) => void): AsyncZodFunction<Args, Returns>;

  /**
   * Removes the spy function.
   *
   * @returns The same AsyncZodFunction instance for chaining
   */
  resetSpy(): AsyncZodFunction<Args, Returns>;

  /**
   * Sets an error handler that gets called when the function throws.
   *
   * @param fn - The error handler function
   * @returns The same AsyncZodFunction instance for chaining
   */
  onError<E extends Error>(fn: (error: E, args: Args) => Returns): AsyncZodFunction<Args, Returns>;
};

/**
 * Represents a synchronous function with Zod validation and additional methods.
 *
 * @template Args - The argument types as a tuple
 * @template Returns - The return type
 */
type ZodFunction<Args, Returns> = ((...args: Args) => Returns) & {
  /**
   * Replaces the function implementation with a mock function.
   *
   * @param fn - The mock function to use
   * @returns The same ZodFunction instance for chaining
   */
  mock(fn: (...args: Args) => Returns): ZodFunction<Args, Returns>;

  /**
   * Resets the function to its original implementation.
   *
   * @returns The same ZodFunction instance for chaining
   */
  resetMock(): ZodFunction<Args, Returns>;

  /**
   * Adds a spy function that gets called after successful execution.
   *
   * @param fn - The spy function that receives arguments and return value
   * @returns The same ZodFunction instance for chaining
   */
  spy(fn: (args: Args, ret: Returns) => void): ZodFunction<Args, Returns>;

  /**
   * Removes the spy function.
   *
   * @returns The same ZodFunction instance for chaining
   */
  resetSpy(): ZodFunction<Args, Returns>;

  /**
   * Sets an error handler that gets called when the function throws.
   *
   * @param fn - The error handler function
   * @returns The same ZodFunction instance for chaining
   */
  onError<E extends Error>(fn: (error: E, args: Args) => Returns): ZodFunction<Args, Returns>;
};

/**
 * The main builder interface for creating validated functions.
 *
 * @template Args - The argument types as a tuple
 * @template Returns - The return type
 */
type ZfnBase<Args, Returns> = {
  /**
   * Defines the argument schemas for validation.
   *
   * @param args - Zod schemas for each function argument
   * @returns A new builder instance with argument validation configured
   */
  args<T extends readonly ZodType[]>(...args: T): ZfnBase<InputZodTuple<T>, Returns>;

  /**
   * Defines the return value schema for validation.
   *
   * @param arg - Zod schema for the return value
   * @returns A new builder instance with return validation configured
   */
  returns<T extends ZodType>(arg: T): ZfnBase<Args, InputZodType<T>>;

  /**
   * Builds validation schemas using a function that receives the Zod instance.
   *
   * @param fn - Function that returns partial schema configuration
   * @returns A new builder instance with the specified schemas
   */
  build<A extends readonly ZodType[], R extends ZodType>(
    fn: (z: Z) => Partial<{ args: [...A]; returns: R }>,
  ): ZfnBase<
    A extends undefined ? Args : InputZodTuple<A>,
    R extends undefined ? Returns : InputZodType<R>
  >;

  /**
   * Creates an async validated function from the provided implementation.
   *
   * @param fn - The async function implementation
   * @returns An AsyncZodFunction with validation and additional methods
   */
  createAsync<A extends Args, R extends Returns>(fn: (...args: A) => R): AsyncZodFunction<A, R>;
  createAsync<A extends Args, R extends Promise<Returns>>(
    fn: (...args: A) => R,
  ): AsyncZodFunction<A, R>;

  /**
   * Creates a synchronous validated function from the provided implementation.
   *
   * @param fn - The function implementation
   * @returns A ZodFunction with validation and additional methods
   */
  create<A extends Args, R extends Returns>(fn: (...args: A) => R): ZodFunction<A, R>;
  create<A extends Args, R extends Promise<Returns>>(fn: (...args: A) => R): ZodFunction<A, R>;
};

/**
 * The main ZodFn instance.
 */
type Zfn = ZfnBase<unknown[], unknown>;

export declare const zfn: Zfn;
