# ZodFn

A runtime function validation library that uses [Zod](https://github.com/colinhacks/zod) validation schemas.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

## 💡 Example

```typescript
import { zfn } from "zodfn";
import { z } from "zod";

// Define a validation schema
const userSchema = zfn
  .args(z.object({ name: z.string(), age: z.number().min(18) }))
  .returns(z.string());

// Create a function
const processUser = userSchema.create((user) => `Welcome ${user.name}, age ${user.age}!`);

// ✅ Valid usage
processUser({ name: "Alice", age: 25 }); // "Welcome Alice, age 25!"

// ❌ Runtime validation errors
processUser({ name: "Bob", age: 16 }); // Throws: Path: age - Number must be greater than or equal to 18
processUser({ name: "Carol", age: "30" }); // Throws: Path: age - Expected number, received string
```

## ✨ Features

- 🛡️ **Runtime Validation**: Validate function arguments and return values at runtime
- 🔗 **Zod Integration**: Leverages the power of Zod schemas for robust validation
- 🎯 **TypeScript Support**: Full TypeScript support with type inference
- 🧪 **Testing Utilities**: Built-in mocking and spying capabilities
- 🚫 **Error Handling**: Custom error handler functions

## 📦 Installation

```bash
npm install zodfn
```

## 🚀 Quick Start

```typescript
import { zfn } from "zodfn";
import { z } from "zod";

// Create a validated function
const addNumbers = zfn
  .args(z.number(), z.number())
  .returns(z.number())
  .create((a, b) => a + b);

// Use it safely
const result = addNumbers(5, 10); // ✅ Returns 15
addNumbers(5, "10"); // ❌ Throws validation error
```

## 📖 Usage

### Basic Function Validation

```typescript
import { zfn }  from "zodfn";
import { z } from "zod";

// Validate arguments only
const greet = zfn.args(z.string()).create((name) => `Hello, ${name}!`);

// Validate return value only
const getAge = zfn.returns(z.number()).create(() => 25);

// Validate both arguments and return value
const multiply = zfn
  .args(z.number(), z.number())
  .returns(z.number())
  .create((a, b) => a * b);
```

> **Note:** You don't need to import Zod separately. Instead you can use the `.build()` function which provides a Zod instance for you. See the [Using the Build Pattern](#using-the-build-pattern) section for more details.

### Async Functions

> **Important:** You MUST use `createAsync` when working with async schema validation (like async `refine` or `transform` functions).

```typescript
// Async function with transform validation
const fetchUser = zfn
  .args(
    z.string().transform(async (userId) => {
      // Validate user exists before making the request
      const exists = await checkUserExists(userId);
      if (!exists) throw new Error(`User ${userId} not found`);
      return userId;
    }),
  )
  .returns(
    z
      .object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
      })
      .transform(async (user) => {
        // Transform the response to add computed fields
        const lastLogin = await getLastLogin(user.id);
        return { ...user, lastLogin };
      }),
  )
  .createAsync((userId) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  });
```

### Using the Build Function

Instead of importing zod separately, use the build function (that has a built-in zod instance) to define the function validation schema

```typescript
// More flexible schema definition
import { zfn }  from "zodfn";

const processOrder = zfn
  .build((z) => ({
    args: [
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            quantity: z.number().positive(),
          }),
        ),
        customerId: z.string().uuid(),
      }),
    ],
    returns: z.object({
      orderId: z.string(),
      total: z.number(),
      status: z.enum(["pending", "confirmed"]),
    }),
  }))
  .create((orderData) => {
    // Process order logic
    return {
      orderId: generateOrderId(),
      total: calculateTotal(orderData.items),
      status: "pending",
    };
  });
```

## 🧪 Testing Features

### Mocking

```typescript
const apiCall = zfn
  .args(z.string())
  .returns(z.object({ data: z.any() }))
  .create(async (endpoint) => {
    const response = await fetch(endpoint);
    return response.json();
  });

// Mock the function for testing
apiCall.mock(async () => ({ data: "mocked response" }));

// Use the mocked function
const result = await apiCall("/api/test"); // Returns { data: "mocked response" }

// Reset to original implementation
apiCall.resetMock();
```

### Spying

```typescript
const trackableFn = zfn
  .args(z.number())
  .returns(z.number())
  .create((x) => x * 2)
  .spy((args, result, nthCall) => {
    console.log(`${nthCall}# call with ${args[0]}, returned ${result}`);
  });

trackableFn(5); // Logs: "1# call with 5, returned 10"

// Remove spy
trackableFn.resetSpy();
```

## 🚫 Error Handling

`onError` can handle any execution error by updating the returned value or throwing a custom error.

```typescript
const riskyOperation = zfn
  .args(z.string())
  .returns(z.number())
  .create((input) => {
    if (input === "error") {
      throw new Error("Something went wrong");
    }
    return input.length;
  })
  .onError((error, args) => {
    console.error(`Error with input ${args[0]}: ${error.message}`);
    return -1; // Fallback value
  });

const result = riskyOperation("error"); // Returns -1 instead of throwing
```

## 🔧 API Reference

### Core Methods

#### `zfn.args(...schemas)`

Define validation schemas for function arguments.

```typescript
zfn.args(z.string(), z.number(), z.boolean());
```

#### `zfn.returns(schema)`

Define validation schema for the return value.

```typescript
zfn.returns(z.object({ success: z.boolean() }));
```

#### `zfn.build(fn)`

Build validation schemas using a function that receives a Zod instance.

```typescript
zfn.build((z) => ({
  args: [z.string(), z.number()],
  returns: z.boolean(),
}));
```

#### `zfn.create(fn)`

Create a validated synchronous function.

#### `zfn.createAsync(fn)`

Create a validated asynchronous function for async schemas.

### Function Methods

#### `mock(fn)`

Replace the function implementation with a mock.

#### `resetMock()`

Reset the function to its original implementation.

#### `spy(fn)`

Add a spy function that gets called after successful execution.

#### `resetSpy()`

Remove the spy function.

#### `onError(fn)`

Set an error handler for when the function throws.

## 🎯 Type Inference

ZodFn provides TypeScript support with automatic type inference:

```typescript
import { InferArgs, InferReturns } from "zodfn";

const myFunction = zfn
  .args(z.string(), z.number())
  .returns(z.boolean())
  .create((str, num) => str.length > num);

// Infer types
type Args = InferArgs<typeof myFunction>; // [string, number]
type Returns = InferReturns<typeof myFunction>; // boolean
```

## 🚫 Error Handling

ZodFn provides detailed error messages for validation failures:

```typescript
const fn = zfn.args(z.number(), z.string()).create((num, str) => `${num}: ${str}`);

try {
  fn("not a number", 123);
} catch (error) {
  console.error(error.message);
  // "Validation failed for 1st argument - Invalid input: expected number, received string"
}
```

For complex objects, path information is included:

```typescript
const fn = zfn
  .args(
    z.object({
      user: z.object({
        profile: z.object({
          age: z.number(),
        }),
      }),
    }),
  )
  .create((data) => data);

try {
  fn({ user: { profile: { age: "not a number" } } });
} catch (error) {
  console.error(error.message);
  // "Validation failed for 1st argument - Invalid input: expected number, received string - Path: user.profile.age"
}
```

## 📄 License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.
