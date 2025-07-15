const { z } = require("zod/v4");

class ZodFnError extends Error {
  constructor(message) {
    super(message);
    this.name = "ZodFnError";
  }
}

function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k != 11) return "st";
  if (j === 2 && k != 12) return "nd";
  if (j === 3 && k != 13) return "rd";
  return "th";
}

function argValidation(arg, position, schema, isAsync) {
  const throwError = (error) => {
    let json;
    let errMessage = "";

    try {
      json = JSON.parse(error.message);
    } catch (_) {
      errMessage = error.message?.replace("parseAsync()", "createAsync()");

      throw new ZodFnError(errMessage);
    }

    if (Array.isArray(json) && json?.[0]?.message && json?.[0]?.path) {
      const path = json[0].path.join(".");
      const message = json[0].message;
      const positionStr = `${position}${getOrdinalSuffix(position)}`;

      errMessage = `Validation failed for ${positionStr} argument`;
      if (path) errMessage += ` - Path: ${path}`;
      errMessage += ` - ${message}`;
    } else {
      /* istanbul ignore next */
      errMessage = error.message; // Fallback for unexpected error formats
    }
    errMessage = errMessage?.replace("parseAsync()", "createAsync()");

    throw new ZodFnError(errMessage);
  };

  if (isAsync) {
    return (async () => {
      try {
        return await schema.parseAsync(arg);
      } catch (error) {
        throwError(error);
      }
    })();
  }

  try {
    return schema.parse(arg);
  } catch (error) {
    throwError(error);
  }
}

function returnValidation(arg, schema, isAsync) {
  if (schema === undefined) {
    return arg;
  }

  const throwError = (error) => {
    let json;

    let errMessage = "";

    try {
      json = JSON.parse(error.message);
    } catch (_) {
      errMessage = error.message?.replace("parseAsync()", "createAsync()");

      throw new ZodFnError(errMessage);
    }

    if (Array.isArray(json) && json?.[0]?.message && json?.[0]?.path) {
      const path = json[0].path.join(".");
      const message = json[0].message;

      errMessage = `Validation failed for return value`;
      if (path) errMessage += ` - Path: ${path}`;
      errMessage += ` - ${message}`;
    } else {
      /* istanbul ignore next */
      errMessage = error.message; // Fallback for unexpected error formats
    }
    errMessage = errMessage?.replace("parseAsync()", "createAsync()");

    throw new ZodFnError(errMessage);
  };

  if (isAsync) {
    return (async () => {
      try {
        return await schema.parseAsync(arg);
      } catch (error) {
        throwError(error);
      }
    })();
  }

  try {
    return schema.parse(arg);
  } catch (error) {
    throwError(error);
  }
}

function getExecFn(ogFn, fnBuilder) {
  const options = {
    execFn: ogFn,
    spyFn: (_args, _ret) => {},
    spyFnCount: 0,
    onErrorFn: (err, _args) => {
      throw err;
    },
  };

  const resFn = fnBuilder(options);

  resFn.mock = (_mock) => {
    if (_mock === undefined) {
      throw new ZodFnError("Mock function argument not provided");
    }

    if (typeof _mock !== "function") {
      throw new ZodFnError("Mock argument must be a function");
    }

    options.execFn = _mock;
    return resFn;
  };

  resFn.resetMock = () => {
    options.execFn = ogFn;
    return resFn;
  };

  resFn.spy = (_spy) => {
    if (_spy === undefined) {
      throw new ZodFnError("Spy handler function not provided");
    }

    if (typeof _spy !== "function") {
      throw new ZodFnError("Spy handler must be a function");
    }

    options.spyFnCount = 0;
    options.spyFn = _spy;
    return resFn;
  };

  resFn.resetSpy = () => {
    options.spyFnCount = 0;
    options.spyFn = (_args, _ret) => {};
    return resFn;
  };

  resFn.onError = (_onError) => {
    if (_onError === undefined) {
      throw new ZodFnError("onError handler function not provided");
    }

    if (typeof _onError !== "function") {
      throw new ZodFnError("onError handler must be a function");
    }

    options.onErrorFn = _onError;
    return resFn;
  };

  return resFn;
}

function getBuilderInstance(obj) {
  if ("_schemas" in obj) {
    return obj;
  }

  const newInstance = Object.create(obj);

  newInstance._schemas = {
    args: [],
    return: undefined,
  };

  return newInstance;
}

const zfnBuilder = {
  args(...argSchemas) {
    const builder = getBuilderInstance(this);

    if (!argSchemas.length) {
      throw new ZodFnError("Argument schemas not provided");
    }

    for (let i = 0; i < argSchemas.length; i++) {
      const schema = argSchemas[i];

      if (typeof schema?.parseAsync !== "function" && typeof schema?.parseAsync !== "function") {
        throw new ZodFnError(
          `${i + 1}${getOrdinalSuffix(i + 1)} argument must be a valid Zod schema`,
        );
      }
    }

    builder._schemas.args = argSchemas;
    return builder;
  },

  returns(returnSchema) {
    const builder = getBuilderInstance(this);

    if (returnSchema === undefined) {
      throw new ZodFnError("Return schema not provided");
    }

    if (
      typeof returnSchema?.parseAsync !== "function" &&
      typeof returnSchema?.parseAsync !== "function"
    ) {
      throw new ZodFnError("Return value must be a valid Zod schema");
    }

    builder._schemas.return = returnSchema;
    return builder;
  },

  build(_buildFn) {
    let builder = getBuilderInstance(this);

    if (_buildFn === undefined) {
      throw new ZodFnError("Build function argument not provided");
    }

    if (typeof _buildFn !== "function") {
      throw new ZodFnError("Build argument must be a function");
    }

    const result = _buildFn(z);

    if (typeof result !== "object" || result === null) {
      throw new ZodFnError("Build function return value is not valid");
    }

    if (result.args) builder.args(...result.args);
    if (result.returns) builder.returns(result.returns);

    return builder;
  },

  create(fn) {
    if (fn === undefined) {
      throw new ZodFnError("Create function not provided");
    }

    if (typeof fn !== "function") {
      throw new ZodFnError("Create argument must be a function");
    }

    const builder = getBuilderInstance(this);

    return getExecFn(fn, (builderOpts) => (...args) => {
      const parsedArgs = [];

      for (let i = 0; i < args.length; i++) {
        const schema = builder._schemas.args[i];

        if (schema) {
          parsedArgs.push(argValidation(args[i], i + 1, schema, false));
        } else {
          parsedArgs.push(args[i]);
        }
      }

      let ret;

      try {
        ret = builderOpts.execFn(...parsedArgs);

        if (ret instanceof Promise) {
          return (async () => {
            try {
              ret = await ret;
            } catch (error) {
              ret = builderOpts.onErrorFn(error, parsedArgs);

              if (ret instanceof Promise) {
                ret = await ret;
              }
            }

            ret = returnValidation(ret, builder._schemas.return, false);
            builderOpts.spyFnCount++;
            const spyFnRes = builderOpts.spyFn(parsedArgs, ret, builderOpts.spyFnCount);

            if (spyFnRes instanceof Promise) {
              await spyFnRes;
            }

            return ret;
          })();
        }
      } catch (error) {
        ret = builderOpts.onErrorFn(error, parsedArgs);

        if (ret instanceof Promise) {
          ret.catch(() => {}); // avoid unhandled promise rejection

          throw new ZodFnError(
            "onError handler function cannot return a promise in a synchronous context",
          );
        }
      }

      ret = returnValidation(ret, builder._schemas.return, false);
      builderOpts.spyFnCount++;
      const spyFnRes = builderOpts.spyFn(parsedArgs, ret, builderOpts.spyFnCount);

      if (spyFnRes instanceof Promise) {
        spyFnRes.catch(() => {}); // avoid unhandled promise rejection

        throw new ZodFnError(
          "Spy handler function cannot return a promise in a synchronous context",
        );
      }

      return ret;
    });
  },

  createAsync(fn) {
    if (fn === undefined) {
      throw new ZodFnError("Create function not provided");
    }

    if (typeof fn !== "function") {
      throw new ZodFnError("Create argument must be a function");
    }

    const builder = getBuilderInstance(this);

    return getExecFn(fn, (builderOpts) => async (...args) => {
      const parsedArgs = [];

      for (let i = 0; i < args.length; i++) {
        let schema = builder._schemas.args[i];

        if (schema) {
          parsedArgs.push(await argValidation(args[i], i + 1, schema, true));
        } else {
          parsedArgs.push(args[i]);
        }
      }

      let ret;

      try {
        ret = builderOpts.execFn(...parsedArgs);

        if (ret instanceof Promise) {
          ret = await ret;
        }
      } catch (error) {
        ret = builderOpts.onErrorFn(error, parsedArgs);

        if (ret instanceof Promise) {
          ret = await ret;
        }
      }

      ret = await returnValidation(ret, builder._schemas.return, true);
      builderOpts.spyFnCount++;
      const spyRet = builderOpts.spyFn(parsedArgs, ret, builderOpts.spyFnCount);

      if (spyRet instanceof Promise) {
        await spyRet;
      }

      return ret;
    });
  },
};

module.exports = {
  zfn: zfnBuilder,
  ZodFnError,
};
