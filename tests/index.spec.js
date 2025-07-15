const { z: z3 } = require("zod/v3");
const { z: z4 } = require("zod/v4");
const { z: z4mini } = require("zod/v4-mini");
const { zfn, ZodFnError } = require("..");

describe("zodfn", function () {
  describe("default function", function () {
    test("validation", function () {
      let fn = zfn
        .args(z4.number(), z4.number())
        .returns(z4.number())
        .create((a, b) => a + b);

      expect(fn(5, 13)).toBe(18);

      fn = zfn.args(z3.number(), z4.number()).create((a, b) => a + b);
      expect(fn(5, 13)).toBe(18);

      fn = zfn.returns(z4.number(), z3.number()).create((a, b) => a + b);
      expect(fn(5, 13)).toBe(18);

      fn = zfn.create((a, b) => a + b);
      expect(fn(5, 13)).toBe(18);

      fn = zfn
        .args(z3.string().or(z3.boolean()))
        .returns(z3.string())
        .create((a) => `res: ${a}`);

      expect(fn("val")).toBe("res: val");
      expect(fn(true)).toBe("res: true");

      fn = zfn
        .args(z4.string().or(z4.boolean()))
        .returns(z3.string())
        .create((a) => `res: ${a}`);

      expect(fn("val")).toBe("res: val");
      expect(fn(true)).toBe("res: true");

      fn = zfn
        .args(z3.string().or(z3.boolean()))
        .returns(z4.string())
        .create((a) => `res: ${a}`);

      expect(fn("val")).toBe("res: val");
      expect(fn(true)).toBe("res: true");

      fn = zfn
        .args(
          z4.object({
            a: z4.object({
              b: z4.number(),
            }),
            c: z4.object({
              d: z4.object({
                e: z4.string(),
              }),
            }),
          }),
        )
        .create((a) => a);

      expect(fn({ a: { b: 1 }, c: { d: { e: "a" } } })).toEqual({
        a: { b: 1 },
        c: { d: { e: "a" } },
      });

      fn = zfn
        .returns(
          z3.object({
            a: z3.object({
              b: z3.tuple([z3.number(), z3.string(), z3.number()]),
            }),
          }),
        )
        .create((a) => a);

      expect(fn({ a: { b: [1, "2", 3] } })).toEqual({ a: { b: [1, "2", 3] } });
    });

    test("promises", async () => {
      let fn = zfn
        .args(z4.number(), z4.number())
        .returns(z4.number())
        .create(async (a, b) => a + b);

      expect(await fn(5, 13)).toBe(18);

      expect(await fn(5, 13)).toBe(18);

      fn = zfn.args(z3.number(), z4.number()).create(async (a, b) => a + b);
      expect(await fn(5, 13)).toBe(18);

      fn = zfn.returns(z4.number(), z3.number()).create(async (a, b) => a + b);
      expect(await fn(5, 13)).toBe(18);

      fn = zfn.create(async (a, b) => a + b);
      expect(await fn(5, 13)).toBe(18);

      fn = zfn
        .args(z3.string().or(z3.boolean()))
        .returns(z3.string())
        .create(async (a) => `res: ${a}`);

      expect(await fn("val")).toBe("res: val");
      expect(await fn(true)).toBe("res: true");

      fn = zfn
        .args(z4.string().or(z4.boolean()))
        .returns(z3.string())
        .create(async (a) => `res: ${a}`);

      expect(await fn("val")).toBe("res: val");
      expect(await fn(true)).toBe("res: true");

      fn = zfn
        .args(z3.string().or(z3.boolean()))
        .returns(z4.string())
        .create(async (a) => `res: ${a}`);

      expect(await fn("val")).toBe("res: val");
      expect(await fn(true)).toBe("res: true");
    });

    test("mocking", function () {
      const fn = zfn
        .args(z3.number(), z4.number())
        .returns(z4.number())
        .create((a, b) => a + b);

      expect(fn(5, 13)).toBe(18);

      fn.mock((a, b) => a * b);
      expect(fn(5, 13)).toBe(65);

      fn.mock((a, b) => a ** b);
      expect(fn(5, 13)).toBe(1220703125);

      fn.resetMock();
      expect(fn(5, 13)).toBe(18);

      try {
        zfn.returns(z3.number()).create(() => "a")();
      } catch (error) {
        expect(error instanceof ZodFnError).toBe(true);
      }
    });

    test("spying", async () => {
      let num = 0;
      let fn = zfn.create((a, b) => a + b);

      fn.spy((args, ret) => {
        num += 3;
        expect(args).toEqual([5, 13]);
        expect(ret).toBe(18);
      });

      expect(num).toBe(0);
      fn(5, 13);
      expect(num).toBe(3);
      fn.resetSpy();
      fn(5, 13);
      expect(num).toBe(3);

      fn.spy((args, ret) => {
        num *= 3;
        expect(args).toEqual([13, 17]);
        expect(ret).toBe(30);
      });

      fn(13, 17);
      expect(num).toBe(9);

      num = 0;
      fn = zfn.create(async (a, b) => a + b);

      fn.spy(async (args, ret) => {
        num += 3;
        expect(args).toEqual([5, 13]);
        expect(ret).toBe(18);
      });

      expect(num).toBe(0);
      await fn(5, 13);
      expect(num).toBe(3);
      fn.resetSpy();
      await fn(5, 13);
      expect(num).toBe(3);

      expect(() => zfn.create(() => 10).spy(async () => {})()).toThrow(
        "Spy handler function cannot return a promise in a synchronous context",
      );
    });

    test("onError", async function () {
      let fn = zfn.create(() => {
        throw new Error("Error message");
      });

      expect(() => fn()).toThrow("Error message");

      fn = zfn
        .create((a, b) => {
          throw new Error("Error message");
        })
        .onError((error, args) => {
          expect("error: " + error.message).toBe("error: Error message");
          return `args: ${args.join(", ")}`;
        });

      expect(fn(10, true)).toBe("args: 10, true");

      fn = zfn.create(() => {
        throw new Error("Error message");
      });
      fn.onError((error) => {
        throw new Error("error: " + error.message);
      });

      expect(() => fn()).toThrow("error: Error message");

      fn = zfn.create(async () => {
        throw new Error("Error message");
      });

      try {
        await fn();
      } catch (error) {
        expect(error.message).toBe("Error message");
      }

      fn = zfn.create(async () => {
        throw new Error("Error message");
      });
      fn.onError((error) => {
        expect("error: " + error.message).toBe("error: Error message");
      });

      await fn();

      fn = zfn
        .create(async () => {
          throw new Error("Error message");
        })
        .onError((error) => {
          throw new Error("error: " + error.message);
        });

      try {
        await fn();
      } catch (error) {
        expect(error.message).toBe("error: Error message");
      }

      fn = zfn.args(z4.string().transform((arg) => Number(arg))).create((a) => a);
      expect(() => fn(10)).toThrow(
        "Validation failed for 1st argument - Invalid input: expected string, received number",
      );
    });

    test("validation errors", async function () {
      let fn = zfn.args(z4.number(), z4.number()).create((a, b) => a + b);
      expect(() => fn(5, "13")).toThrow(
        "Validation failed for 2nd argument - Invalid input: expected number, received string",
      );

      fn = zfn.args(z4.number(), z4.number(), z4.number()).create((a, b, c) => a + b + c);
      expect(() => fn(5, 13, "17")).toThrow(
        "Validation failed for 3rd argument - Invalid input: expected number, received string",
      );

      fn = zfn
        .args(z4.number(), z4.number(), z4.number(), z4.number())
        .create((a, b, c, d) => a + b + c + d);
      expect(() => fn(5, 13, 17, "19")).toThrow(
        "Validation failed for 4th argument - Invalid input: expected number, received string",
      );

      fn = zfn.args(z3.number(), z3.number()).create((a, b) => a + b);
      expect(() => fn(5, "13")).toThrow(
        "Validation failed for 2nd argument - Expected number, received string",
      );

      fn = zfn.returns(z4.string()).create((a, b) => a + b);
      expect(() => fn(5, 13)).toThrow(
        "Validation failed for return value - Invalid input: expected string, received number",
      );

      fn = zfn.returns(z3.string()).create((a, b) => a + b);
      expect(() => fn(5, 13)).toThrow(
        "Validation failed for return value - Expected string, received number",
      );

      fn = zfn
        .args(
          z4.object({
            a: z4.object({
              b: z4.number(),
            }),
            c: z4.object({
              d: z4.object({
                e: z4.string(),
              }),
            }),
          }),
        )
        .create((a) => a);
      expect(() => fn({ a: { b: 1 }, c: { d: { e: 2 } } })).toThrow(
        "Validation failed for 1st argument - Path: c.d.e - Invalid input: expected string, received number",
      );

      fn = zfn
        .returns(
          z3.object({
            a: z3.object({
              b: z3.tuple([z3.number(), z3.string(), z3.number()]),
            }),
          }),
        )
        .create((a) => a);
      expect(() => fn({ a: { b: [1, 2, 3] } })).toThrow(
        "Validation failed for return value - Path: a.b.1 - Expected string, received number",
      );

      try {
        fn = zfn.args(z4.number(), z4.number()).create(async (a, b) => a + b);
        await fn("5", 13);
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for 1st argument - Invalid input: expected number, received string",
        );
      }

      try {
        fn = zfn.args(z3.number(), z3.number()).create(async (a, b) => a + b);
        await fn("5", 13);
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for 1st argument - Expected number, received string",
        );
      }

      try {
        fn = zfn.returns(z4.string()).create(async (a, b) => a + b);
        await fn(5, 13);
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for return value - Invalid input: expected string, received number",
        );
      }

      try {
        fn = zfn.returns(z3.string()).create(async (a, b) => a + b);
        await fn(5, 13);
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for return value - Expected string, received number",
        );
      }

      try {
        fn = zfn
          .args(
            z4.object({
              a: z4.object({
                b: z4.number(),
              }),
              c: z4.object({
                d: z4.object({
                  e: z4.string(),
                }),
              }),
            }),
          )
          .create(async (a) => a);

        await fn({ a: { b: 1 }, c: { d: { e: 2 } } });
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for 1st argument - Path: c.d.e - Invalid input: expected string, received number",
        );
      }

      try {
        fn = zfn
          .returns(
            z3.object({
              a: z3.object({
                b: z3.tuple([z3.number(), z3.string(), z3.number()]),
              }),
            }),
          )
          .create(async (a) => a);
        await fn({ a: { b: [1, 2, 3] } });
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for return value - Path: a.b.1 - Expected string, received number",
        );
      }

      fn = zfn.returns(z4.number()).create((a, b) => a + b);
      fn.mock((a, b) => String(a + b));

      expect(() => fn(5, 13)).toThrow(
        "Validation failed for return value - Invalid input: expected number, received string",
      );

      try {
        fn.mock(async (a, b) => a ** b);
        await fn(1, "_");
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for return value - Invalid input: expected number, received NaN",
        );
      }

      fn.resetMock();
    });

    test("errors", async function () {
      expect(() => zfn.create()).toThrow("Create function not provided");
      expect(() => zfn.create(1)).toThrow("Create argument must be a function");
      expect(() => zfn.args()).toThrow("Argument schemas not provided");
      expect(() => zfn.returns()).toThrow("Return schema not provided");
      expect(() => zfn.create(() => {}).onError()).toThrow("onError handler function not provided");
      expect(() => zfn.create(() => {}).onError(1)).toThrow("onError handler must be a function");
      expect(() => zfn.create(() => {}).mock()).toThrow("Mock function argument not provided");
      expect(() => zfn.create(() => {}).mock(1)).toThrow("Mock argument must be a function");
      expect(() => zfn.create(() => {}).spy()).toThrow("Spy handler function not provided");
      expect(() => zfn.create(() => {}).spy(1)).toThrow("Spy handler must be a function");
      expect(() => zfn.build()).toThrow("Build function argument not provided");
      expect(() => zfn.build(1)).toThrow("Build argument must be a function");
      expect(() => zfn.build(() => 1)).toThrow("Build function return value is not valid");

      expect(() => zfn.args(async () => z4.number()).create((a) => {})).toThrow(
        "1st argument must be a valid Zod schema",
      );

      expect(() =>
        zfn.args(z4.number(), Promise.resolve(z4.number())).create((_a, _b) => {}),
      ).toThrow("2nd argument must be a valid Zod schema");

      expect(() => zfn.returns(async () => z4.number()).create((a) => {})).toThrow(
        "Return value must be a valid Zod schema",
      );

      expect(() => zfn.returns(Promise.resolve(z4.number())).create((a) => {})).toThrow(
        "Return value must be a valid Zod schema",
      );

      expect(() => zfn.args(1).create((a) => a)).toThrow("1st argument must be a valid Zod schema");

      expect(() => zfn.args(z4.number(), 1).create((a, _) => a)).toThrow(
        "2nd argument must be a valid Zod schema",
      );

      expect(() => zfn.args(z4.number(), z4.number(), 1).create((a, _, __) => a)).toThrow(
        "3rd argument must be a valid Zod schema",
      );

      expect(() =>
        zfn.args(z4.number(), z4.number(), z4.number(), 1).create((a, _, __, ___) => a),
      ).toThrow("4th argument must be a valid Zod schema");

      expect(() => zfn.args(() => 1).create(() => {})).toThrow(
        "1st argument must be a valid Zod schema",
      );

      expect(() => zfn.returns(z4.string()).create(() => 1)()).toThrow(
        "Validation failed for return value - Invalid input: expected string, received number",
      );

      expect(() => zfn.returns(1).create(() => {})).toThrow(
        "Return value must be a valid Zod schema",
      );

      expect(() => zfn.returns(() => 1).create(() => {})).toThrow(
        "Return value must be a valid Zod schema",
      );

      expect(() =>
        zfn
          .returns(
            z4.number().transform(async (val) => {
              await new Promise((resolve) => setTimeout(resolve, 100));
              return val + 1;
            }),
          )
          .create((a) => a)(0),
      ).toThrow("Encountered Promise during synchronous parse. Use .createAsync() instead.");

      try {
        await zfn
          .create(async () => {
            throw new Error("Error message");
          })
          .onError(async () => {
            throw new Error("onError Function Error message");
          })();
      } catch (error) {
        expect(error.message).toBe("onError Function Error message");
      }

      expect(() =>
        zfn
          .create(() => {
            throw new Error("Error message");
          })
          .onError(async () => {
            throw new Error("onError Function Error message");
          })(),
      ).toThrow("onError handler function cannot return a promise in a synchronous context");

      expect(() =>
        zfn
          .create(() => {})
          .spy(async () => {
            throw new Error("Spy Function Error message");
          })(),
      ).toThrow("Spy handler function cannot return a promise in a synchronous context");

      expect(() =>
        zfn
          .returns(z4.number())
          .create(() => {
            throw new Error("Error message");
          })
          .spy(async () => {})
          .onError(async () => 10)(),
      ).toThrow("onError handler function cannot return a promise in a synchronous context");

      expect(() => zfn.create(() => {}).spy(async () => {})()).toThrow(
        "Spy handler function cannot return a promise in a synchronous context",
      );
    });
  });

  describe("async function", function () {
    test("validation", async function () {
      let fn = zfn
        .build((z) => ({
          args: [z.number(), z3.number()],
        }))
        .returns(z4mini.number())
        .createAsync((a, b) => a + b);

      expect(await fn(5, 13)).toBe(18);

      fn = zfn
        .build(() => ({
          returns: z4.number(),
        }))
        .args(z3.number(), z4.number())
        .createAsync(async (a, b) => a + b);

      expect(await fn(5, 13)).toBe(18);

      fn = zfn
        .args(
          z4.number().transform(async (val) => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return val + 1;
          }),
          z3.number().transform(async (val) => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return val + 1;
          }),
        )
        .returns(
          z3.number().transform(async (val) => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return val * 2;
          }),
        )
        .createAsync(async (a, b) => a + b);

      expect(await fn(5, 13)).toBe(40);
    });

    test("promises", async () => {
      let fn = zfn
        .args(
          z4.number().transform(async (val) => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return val + 1;
          }),
          z4.number().transform(async (val) => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return val * 2;
          }),
        )
        .createAsync((a, b) => a + b);

      expect(await fn(2, 4)).toBe(11);

      fn = zfn
        .build((z) => ({
          returns: z.number().transform(async (val) => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return val * 3;
          }),
        }))
        .createAsync(async (a, b) => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return a + b;
        });

      expect(await fn(2, 4)).toBe(18);
    });

    test("mocking", async function () {
      let fn = zfn
        .args(z3.number(), z4.number())
        .returns(z4.number())
        .createAsync((a, b) => a + b);

      expect(await fn(5, 13)).toBe(18);
      let time = 0;

      fn.mock(async (a, b) => {
        const start = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 80));
        time = Date.now() - start;
        return a * b;
      });
      expect(await fn(5, 13)).toBe(65);
      expect(time).toBeGreaterThan(75);
      expect(time).toBeLessThan(100);

      fn.mock((a, b) => a ** b);
      expect(await fn(5, 13)).toBe(1220703125);

      fn.resetMock();
      expect(await fn(5, 13)).toBe(18);
    });

    test("spying", async () => {
      let num = 0;
      let fn = zfn.createAsync((a, b) => a + b);
      let count = 1;

      fn.spy((args, ret, nth) => {
        num += 3;
        expect(args).toEqual([5, 13]);
        expect(ret).toBe(18);
        expect(nth).toBe(count);
      });

      expect(num).toBe(0);
      await fn(5, 13);
      count++;
      expect(num).toBe(3);
      await fn(5, 13);
      count++;
      expect(num).toBe(6);
      await fn(5, 13);
      fn.resetSpy();
      expect(num).toBe(9);
      await fn(5, 13);
      expect(num).toBe(9);

      fn.spy((args, ret, nth) => {
        num *= 3;
        expect(args).toEqual([13, 17]);
        expect(ret).toBe(30);
        expect(nth).toBe(1);
      });

      await fn(13, 17);
      expect(num).toBe(27);
      let time = 0;

      fn.spy(async (args, ret, nth) => {
        const start = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 80));
        time = Date.now() - start;
        expect(args).toEqual([5, 7]);
        expect(ret).toBe(12);
        expect(nth).toBe(1);
      });

      await fn(5, 7);
      expect(time).toBeGreaterThan(75);
      expect(time).toBeLessThan(100);
    });

    test("onError", async function () {
      let fn = zfn.createAsync(() => {
        throw new Error("Error message");
      });

      try {
        await fn();
      } catch (error) {
        expect(error.message).toBe("Error message");
      }

      fn = zfn.createAsync(() => {
        throw new Error("Error message");
      });
      fn.onError((error) => {
        expect("error: " + error.message).toBe("error: Error message");
      });

      await fn();
      let time = 0;

      fn = zfn
        .createAsync(() => {
          throw new Error("Error message");
        })
        .onError(async (error) => {
          const start = Date.now();
          await new Promise((resolve) => setTimeout(resolve, 80));
          time = Date.now() - start;
          expect("async error: " + error.message).toBe("async error: Error message");
        });

      await fn();
      expect(time).toBeGreaterThan(75);
      expect(time).toBeLessThan(100);

      fn = zfn.createAsync(async () => {
        throw new Error("Error message");
      });

      try {
        await fn();
      } catch (error) {
        expect(error.message).toBe("Error message");
      }

      fn = zfn
        .createAsync(async () => {
          throw new Error("Async Error message");
        })
        .onError((error) => {
          throw new Error("message: " + error.message);
        });

      try {
        await fn();
      } catch (error) {
        expect(error.message).toBe("message: Async Error message");
      }

      fn = zfn.createAsync(async () => {
        throw new Error("Async Error message");
      });
      fn.onError(async (error) => {
        throw new Error("message: " + error.message);
      });

      try {
        await fn();
      } catch (error) {
        expect(error.message).toBe("message: Async Error message");
      }

      fn = zfn.createAsync(async () => {
        throw new Error("Async Function Error message");
      });
      fn.onError((error) => {
        expect(error.message).toBe("Async Function Error message");
      });

      await fn();

      fn = zfn.createAsync(() => {
        throw new Error("msg1");
      });
      fn.onError((error) => {
        return "return message: " + error.message;
      });

      expect(await fn()).toBe("return message: msg1");

      fn = zfn
        .createAsync(async () => {
          throw new Error("msg2");
        })
        .onError((error) => {
          return "return message: " + error.message;
        });

      expect(await fn()).toBe("return message: msg2");

      fn = zfn.createAsync(async () => {
        throw new Error("msg3");
      });
      fn.onError(async (error) => {
        return "return message: " + error.message;
      });

      expect(await fn()).toBe("return message: msg3");

      fn = zfn.createAsync(() => {
        throw new Error("msg4");
      });
      fn.onError(async (error) => {
        return "return message: " + error.message;
      });

      expect(await fn()).toBe("return message: msg4");
    });

    test("validation errors", async function () {
      let fn = zfn.args(z4.number(), z4.number()).createAsync((a, b) => a + b);

      try {
        await fn(5, "13");
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for 2nd argument - Invalid input: expected number, received string",
        );
      }

      fn = zfn
        .build((z) => ({
          args: [
            z4.string().transform((arg) => Number(arg)),
            z.number(),
            z.string().transform(async (arg) => {
              await new Promise((resolve) => setTimeout(resolve, 100));
              return arg;
            }),
          ],
        }))
        .createAsync((a, b, c) => a + b + Number(c));

      try {
        await fn("5", 13, "17");
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for 1st argument - Invalid input: expected number, received string",
        );
      }

      try {
        await fn("5", 13, 17);
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for 3rd argument - Invalid input: expected string, received number",
        );
      }

      fn = zfn.returns(z4.string()).createAsync((a, b) => a + b);

      try {
        await fn(5, 13);
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for return value - Invalid input: expected string, received number",
        );
      }

      fn = zfn.returns(z4.string()).createAsync(async (a, b) => a + b);

      try {
        await fn(5, 13);
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for return value - Invalid input: expected string, received number",
        );
      }

      try {
        fn = zfn.args(z4.number(), z4.number()).createAsync(async (a, b) => a + b);
        await fn("5", 13);
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for 1st argument - Invalid input: expected number, received string",
        );
      }

      try {
        fn = zfn.returns(z4.string()).createAsync(async (a, b) => a + b);
        await fn(5, 13);
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for return value - Invalid input: expected string, received number",
        );
      }

      fn = zfn.returns(z4.number()).createAsync((a, b) => a + b);
      fn.mock((a, b) => String(a + b));

      try {
        await fn(5, 13);
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for return value - Invalid input: expected number, received string",
        );
      }

      try {
        fn.mock(async (a, b) => a ** b);
        await fn(1, "_");
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for return value - Invalid input: expected number, received NaN",
        );
      }

      fn.resetMock();
    });

    test("errors", async function () {
      expect(() => zfn.createAsync()).toThrow("Create function not provided");
      expect(() => zfn.createAsync(1)).toThrow("Create argument must be a function");
      expect(() => zfn.args()).toThrow("Argument schemas not provided");
      expect(() => zfn.returns()).toThrow("Return schema not provided");
      expect(() => zfn.createAsync(() => {}).onError(1)).toThrow(
        "onError handler must be a function",
      );
      expect(() => zfn.createAsync(() => {}).mock()).toThrow("Mock function argument not provided");
      expect(() => zfn.createAsync(() => {}).mock(1)).toThrow("Mock argument must be a function");
      expect(() => zfn.createAsync(() => {}).spy()).toThrow("Spy handler function not provided");
      expect(() => zfn.createAsync(() => {}).spy(1)).toThrow("Spy handler must be a function");

      expect(() => zfn.createAsync(() => {}).onError()).toThrow(
        "onError handler function not provided",
      );

      try {
        await zfn.args(Promise.resolve({})).createAsync((a) => a)(1);
      } catch (error) {
        expect(error.message).toBe("1st argument must be a valid Zod schema");
      }

      try {
        await zfn.args(Promise.resolve({ parse() {} })).createAsync((a) => a)(1);
      } catch (error) {
        expect(error.message).toBe("1st argument must be a valid Zod schema");
      }

      try {
        await zfn.returns(Promise.resolve({ parse() {} })).createAsync(() => {})();
      } catch (error) {
        expect(error.message).toBe("Return value must be a valid Zod schema");
      }

      expect(() => zfn.args(() => 1).createAsync(() => {})).toThrow(
        "1st argument must be a valid Zod schema",
      );

      try {
        await zfn.returns(z4.string()).createAsync(() => 1)();
      } catch (error) {
        expect(error.message).toBe(
          "Validation failed for return value - Invalid input: expected string, received number",
        );
      }

      expect(() => zfn.returns(() => 1).createAsync(() => {})).toThrow(
        "Return value must be a valid Zod schema",
      );

      expect(() =>
        zfn
          .args(
            z4.number().transform(async (val) => {
              await new Promise((resolve) => setTimeout(resolve, 100));
              return val + 1;
            }),
          )
          .create((a) => a)(0),
      ).toThrow("Encountered Promise during synchronous parse. Use .createAsync() instead.");
    });
  });
});
