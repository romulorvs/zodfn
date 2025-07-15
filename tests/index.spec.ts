import { z as z3 } from "zod/v3";
import { z as z4 } from "zod/v4";
import { z as z4mini } from "zod/v4-mini";
import { zfn, ZodFnError, InferArgs, InferReturns } from "..";

describe("zodfn", function () {
  test("ts check", async function () {
    const fn0 = zfn
      .build((z) => ({
        args: [
          z.number(),
          z.object({
            a: z.object({
              b: z.number(),
            }),
            c: z.optional(
              z.object({
                d: z.object({
                  e: z.string(),
                }),
              }),
            ),
          }),
        ],
        returns: z.number(),
      }))
      .create((arg1, arg2) => arg1 + arg2.a.b);

    expect(fn0(5, { a: { b: 13 } })).toBe(18);

    const fn1 = zfn
      .args(
        z4mini.number(),
        z4.object({
          a: z4.object({
            b: z4.number(),
          }),
          c: z4.optional(
            z4.object({
              d: z4.object({
                e: z4.string(),
              }),
            }),
          ),
        }),
      )
      .returns(z4.number())
      .create((arg1, arg2) => arg1 + arg2.a.b);

    expect(fn1(5, { a: { b: 13 } })).toBe(18);

    const fn2 = zfn.create((a: number, b: string) => a + Number(b));
    expect(fn2(5, "13")).toBe(18);

    const fn3 = zfn
      .build((z) => ({
        args: [z.string().or(z.boolean())],
      }))
      .returns(z3.string())
      .create((a) => `res: ${a}`);

    expect(fn3("val")).toBe("res: val");
    expect(fn3(true)).toBe("res: true");

    const fn4 = zfn.returns(z3.number()).create((a: number) => a + 1);
    expect(fn4(10)).toBe(11);

    const fn5 = zfn.returns(z4mini.number()).createAsync((a: number) => a + 2);
    expect(await fn5(10)).toBe(12);

    const fn6 = zfn.returns(z3.number()).create(async (a: number) => a + 3);
    expect(await fn6(10)).toBe(13);

    const fn7: InferArgs<typeof fn3> = [true];
    const fn8: InferArgs<typeof fn3> = ["val"];
    const fn9: InferReturns<typeof fn3> = "res: val";
    const fn10: InferArgs<typeof fn5> = [1];
    const fn11: InferReturns<typeof fn5> = 10;

    const fn12 = zfn
      .build((z) => ({
        args: [z.string().or(z.boolean()), z3.number()],
      }))
      .returns(z4mini.string())
      .create(async (a) => `res: ${a}`);

    const fn13 = zfn.returns(z4mini.number()).createAsync(async (a: number) => a + 2);

    const fn14: InferArgs<typeof fn12> = [true, 1];
    const fn15: InferArgs<typeof fn12> = ["val", 2];
    const fn16: InferReturns<typeof fn12> = Promise.resolve("res: val").catch((a) => a);
    const fn17: InferArgs<typeof fn13> = [1];
    const fn18: InferReturns<typeof fn13> = Promise.resolve(10).catch((a) => a);

    const fn19 = zfn
      .args(z4.number())
      .returns(z4.string())
      .create((a) => "val: " + a.toString());

    expect(fn19(10)).toBe("val: 10");

    fn19
      .mock((a) => `mock val: ${a}`)
      .spy((args, ret) => {
        expect(args[0]).toBe(10);
        expect(ret).toBe("mock val: 10");
      });

    expect(fn19(10)).toBe("mock val: 10");

    fn19
      .mock((a) => {
        throw new ZodFnError(`mock error: ${a}`);
      })
      .resetSpy()
      .onError((err, args) => {
        expect(err instanceof ZodFnError).toBe(true);
        expect(args[0]).toBe(11);
        expect(err.message).toBe("mock error: 11");
        return `handled error`;
      });

    expect(fn19(11)).toBe("handled error");

    fn19.resetMock();
    expect(fn19(12)).toBe("val: 12");

    const fn20 = zfn
      .args(z4.number())
      .returns(z4.string())
      .create(async (a) => "val: " + a.toString());

    fn20.mock(async (a) => `mock val: ${a}`).spy(async (args, ret) => {});

    fn20
      .mock((a) => {
        throw new ZodFnError(`mock error: ${a}`);
      })
      .resetSpy()
      .onError(async (err, args) => {
        return `handled error`;
      });

    fn20.resetMock();
    expect(await fn20(12)).toBe("val: 12");

    const fn21 = zfn
      .args(z4.number())
      .returns(z4.string())
      .createAsync((a) => "val: " + a.toString());

    fn21.mock((a) => `mock val: ${a}`).spy((args, ret) => {});

    fn21
      .mock((a) => {
        throw new ZodFnError(`mock error: ${a}`);
      })
      .resetSpy()
      .onError((err, args) => {
        return `handled error`;
      });

    fn21.resetMock();
    expect(await fn21(12)).toBe("val: 12");

    const fn22 = zfn
      .args(z4.number())
      .returns(z4.string())
      .createAsync(async (a) => "val: " + a.toString());

    fn22.mock(async (a) => `mock val: ${a}`).spy(async (args, ret) => {});

    fn22
      .mock((a) => {
        throw new ZodFnError(`mock error: ${a}`);
      })
      .resetSpy()
      .onError(async (err, args) => {
        return `handled error`;
      });

    fn22.resetMock();
    expect(await fn22(12)).toBe("val: 12");

    const fn23 = zfn
      .args(z4.number().transform((val) => String(val)))
      .returns(z4.number().transform((val) => `transformed: ${val}`))
      .createAsync(async (a) => Number(a));

    expect(await fn23(3)).toBe("transformed: 3");
  });
});
