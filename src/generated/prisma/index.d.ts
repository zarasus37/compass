
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * The single user. Single-user assumption for v1 (D7); schema is multi-user ready.
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Session
 * Server-side session row. Cookie holds the session id; we look this up
 * to resolve the current user. Sessions are revocable (logout = delete
 * row) and can carry last-seen / last-ip metadata for security review.
 */
export type Session = $Result.DefaultSelection<Prisma.$SessionPayload>
/**
 * Model Account
 * Where money lives. In v1 these are "connected" via the mock flow
 * (Cluster 1 step 14). L2 routing (Plaid) is a future feature.
 */
export type Account = $Result.DefaultSelection<Prisma.$AccountPayload>
/**
 * Model Envelope
 * A vessel. The 7 default envelopes are seeded with planetary affiliation
 * (D14) so each one carries a glyph + color (visual only — never labeled in copy).
 */
export type Envelope = $Result.DefaultSelection<Prisma.$EnvelopePayload>
/**
 * Model Transaction
 * The atomic money event. Amount is signed: +income, -expense, integer cents.
 * `isPrimaMateria` is true for income transactions that trigger auto-allocate.
 */
export type Transaction = $Result.DefaultSelection<Prisma.$TransactionPayload>
/**
 * Model PaySchedule
 * The user's pay schedule — cadence + which account paychecks land in.
 * Used to derive the period range and to schedule recurring paycheck detection.
 */
export type PaySchedule = $Result.DefaultSelection<Prisma.$PaySchedulePayload>
/**
 * Model Goal
 * A life goal the user is working toward. The "Your Direction" section.
 * Top priority flag controls what shows in the dashboard hero.
 */
export type Goal = $Result.DefaultSelection<Prisma.$GoalPayload>
/**
 * Model AllocationPlan
 * A user's allocation plan (D11/D12). When armed, every paycheck
 * transaction triggers the rules silently — no confirm modal (D12).
 */
export type AllocationPlan = $Result.DefaultSelection<Prisma.$AllocationPlanPayload>
/**
 * Model AllocationRule
 * One row per (plan, envelope) — the percentage of each paycheck that
 * gets distributed into that envelope. Sums should be ≤ 100 (remainder
 * goes to a default "buffer" or is held).
 */
export type AllocationRule = $Result.DefaultSelection<Prisma.$AllocationRulePayload>
/**
 * Model AuditLog
 * Every L1+ action the system takes on the user's behalf. The
 * "auto-allocate" engine writes here. The user can browse their
 * audit log in a future cluster.
 */
export type AuditLog = $Result.DefaultSelection<Prisma.$AuditLogPayload>
/**
 * Model SystemSettings
 * Global system configuration. One row, identified by the constant
 * "GLOBAL_CONFIG". Stores cross-cutting toggles that aren't user-scoped
 * (e.g. active engine level — L1 rules vs. L2 AI). The TopAppBar's
 * engine pill reads this row to show the current state and toggles it
 * via the toggleEngineAction server action.
 */
export type SystemSettings = $Result.DefaultSelection<Prisma.$SystemSettingsPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const GoalKind: {
  TRANSFER: 'TRANSFER',
  MILESTONE: 'MILESTONE'
};

export type GoalKind = (typeof GoalKind)[keyof typeof GoalKind]

}

export type GoalKind = $Enums.GoalKind

export const GoalKind: typeof $Enums.GoalKind

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.PrismaClientConstructorArgs<ClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.session`: Exposes CRUD operations for the **Session** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Sessions
    * const sessions = await prisma.session.findMany()
    * ```
    */
  get session(): Prisma.SessionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.account`: Exposes CRUD operations for the **Account** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Accounts
    * const accounts = await prisma.account.findMany()
    * ```
    */
  get account(): Prisma.AccountDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.envelope`: Exposes CRUD operations for the **Envelope** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Envelopes
    * const envelopes = await prisma.envelope.findMany()
    * ```
    */
  get envelope(): Prisma.EnvelopeDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.transaction`: Exposes CRUD operations for the **Transaction** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Transactions
    * const transactions = await prisma.transaction.findMany()
    * ```
    */
  get transaction(): Prisma.TransactionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.paySchedule`: Exposes CRUD operations for the **PaySchedule** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PaySchedules
    * const paySchedules = await prisma.paySchedule.findMany()
    * ```
    */
  get paySchedule(): Prisma.PayScheduleDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.goal`: Exposes CRUD operations for the **Goal** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Goals
    * const goals = await prisma.goal.findMany()
    * ```
    */
  get goal(): Prisma.GoalDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.allocationPlan`: Exposes CRUD operations for the **AllocationPlan** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AllocationPlans
    * const allocationPlans = await prisma.allocationPlan.findMany()
    * ```
    */
  get allocationPlan(): Prisma.AllocationPlanDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.allocationRule`: Exposes CRUD operations for the **AllocationRule** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AllocationRules
    * const allocationRules = await prisma.allocationRule.findMany()
    * ```
    */
  get allocationRule(): Prisma.AllocationRuleDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.auditLog`: Exposes CRUD operations for the **AuditLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AuditLogs
    * const auditLogs = await prisma.auditLog.findMany()
    * ```
    */
  get auditLog(): Prisma.AuditLogDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.systemSettings`: Exposes CRUD operations for the **SystemSettings** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SystemSettings
    * const systemSettings = await prisma.systemSettings.findMany()
    * ```
    */
  get systemSettings(): Prisma.SystemSettingsDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.9.1
   * Query Engine version: e922089b7d7502aff4249d5da3420f6fa55fc6ad
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * Resolved type of the argument passed to the `PrismaClient` constructor.
   *
   * When called without a narrower options type (the common case), this resolves
   * to `PrismaClientOptions` directly, which produces a clear TypeScript error
   * message (`not assignable to parameter of type 'PrismaClientOptions'`) when
   * the argument is missing or incomplete. When the user supplies a narrower
   * options type (e.g. via a literal), it falls back to `Subset` to keep
   * filtering out unknown properties.
   */
  export type PrismaClientConstructorArgs<Options extends PrismaClientOptions> =
    [PrismaClientOptions] extends [Options] ? PrismaClientOptions : Subset<Options, PrismaClientOptions>;

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      ((Without<T, U> & U) | (Without<U, T> & T)) & object
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Session: 'Session',
    Account: 'Account',
    Envelope: 'Envelope',
    Transaction: 'Transaction',
    PaySchedule: 'PaySchedule',
    Goal: 'Goal',
    AllocationPlan: 'AllocationPlan',
    AllocationRule: 'AllocationRule',
    AuditLog: 'AuditLog',
    SystemSettings: 'SystemSettings'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "session" | "account" | "envelope" | "transaction" | "paySchedule" | "goal" | "allocationPlan" | "allocationRule" | "auditLog" | "systemSettings"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Session: {
        payload: Prisma.$SessionPayload<ExtArgs>
        fields: Prisma.SessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findFirst: {
            args: Prisma.SessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findMany: {
            args: Prisma.SessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          create: {
            args: Prisma.SessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          createMany: {
            args: Prisma.SessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SessionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          delete: {
            args: Prisma.SessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          update: {
            args: Prisma.SessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          deleteMany: {
            args: Prisma.SessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SessionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          upsert: {
            args: Prisma.SessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          aggregate: {
            args: Prisma.SessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSession>
          }
          groupBy: {
            args: Prisma.SessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SessionCountArgs<ExtArgs>
            result: $Utils.Optional<SessionCountAggregateOutputType> | number
          }
        }
      }
      Account: {
        payload: Prisma.$AccountPayload<ExtArgs>
        fields: Prisma.AccountFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AccountFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AccountFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          findFirst: {
            args: Prisma.AccountFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AccountFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          findMany: {
            args: Prisma.AccountFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>[]
          }
          create: {
            args: Prisma.AccountCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          createMany: {
            args: Prisma.AccountCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AccountCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>[]
          }
          delete: {
            args: Prisma.AccountDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          update: {
            args: Prisma.AccountUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          deleteMany: {
            args: Prisma.AccountDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AccountUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AccountUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>[]
          }
          upsert: {
            args: Prisma.AccountUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          aggregate: {
            args: Prisma.AccountAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAccount>
          }
          groupBy: {
            args: Prisma.AccountGroupByArgs<ExtArgs>
            result: $Utils.Optional<AccountGroupByOutputType>[]
          }
          count: {
            args: Prisma.AccountCountArgs<ExtArgs>
            result: $Utils.Optional<AccountCountAggregateOutputType> | number
          }
        }
      }
      Envelope: {
        payload: Prisma.$EnvelopePayload<ExtArgs>
        fields: Prisma.EnvelopeFieldRefs
        operations: {
          findUnique: {
            args: Prisma.EnvelopeFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EnvelopePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.EnvelopeFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EnvelopePayload>
          }
          findFirst: {
            args: Prisma.EnvelopeFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EnvelopePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.EnvelopeFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EnvelopePayload>
          }
          findMany: {
            args: Prisma.EnvelopeFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EnvelopePayload>[]
          }
          create: {
            args: Prisma.EnvelopeCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EnvelopePayload>
          }
          createMany: {
            args: Prisma.EnvelopeCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.EnvelopeCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EnvelopePayload>[]
          }
          delete: {
            args: Prisma.EnvelopeDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EnvelopePayload>
          }
          update: {
            args: Prisma.EnvelopeUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EnvelopePayload>
          }
          deleteMany: {
            args: Prisma.EnvelopeDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.EnvelopeUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.EnvelopeUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EnvelopePayload>[]
          }
          upsert: {
            args: Prisma.EnvelopeUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EnvelopePayload>
          }
          aggregate: {
            args: Prisma.EnvelopeAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateEnvelope>
          }
          groupBy: {
            args: Prisma.EnvelopeGroupByArgs<ExtArgs>
            result: $Utils.Optional<EnvelopeGroupByOutputType>[]
          }
          count: {
            args: Prisma.EnvelopeCountArgs<ExtArgs>
            result: $Utils.Optional<EnvelopeCountAggregateOutputType> | number
          }
        }
      }
      Transaction: {
        payload: Prisma.$TransactionPayload<ExtArgs>
        fields: Prisma.TransactionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TransactionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TransactionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          findFirst: {
            args: Prisma.TransactionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TransactionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          findMany: {
            args: Prisma.TransactionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>[]
          }
          create: {
            args: Prisma.TransactionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          createMany: {
            args: Prisma.TransactionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TransactionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>[]
          }
          delete: {
            args: Prisma.TransactionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          update: {
            args: Prisma.TransactionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          deleteMany: {
            args: Prisma.TransactionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TransactionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TransactionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>[]
          }
          upsert: {
            args: Prisma.TransactionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          aggregate: {
            args: Prisma.TransactionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTransaction>
          }
          groupBy: {
            args: Prisma.TransactionGroupByArgs<ExtArgs>
            result: $Utils.Optional<TransactionGroupByOutputType>[]
          }
          count: {
            args: Prisma.TransactionCountArgs<ExtArgs>
            result: $Utils.Optional<TransactionCountAggregateOutputType> | number
          }
        }
      }
      PaySchedule: {
        payload: Prisma.$PaySchedulePayload<ExtArgs>
        fields: Prisma.PayScheduleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PayScheduleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaySchedulePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PayScheduleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaySchedulePayload>
          }
          findFirst: {
            args: Prisma.PayScheduleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaySchedulePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PayScheduleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaySchedulePayload>
          }
          findMany: {
            args: Prisma.PayScheduleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaySchedulePayload>[]
          }
          create: {
            args: Prisma.PayScheduleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaySchedulePayload>
          }
          createMany: {
            args: Prisma.PayScheduleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PayScheduleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaySchedulePayload>[]
          }
          delete: {
            args: Prisma.PayScheduleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaySchedulePayload>
          }
          update: {
            args: Prisma.PayScheduleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaySchedulePayload>
          }
          deleteMany: {
            args: Prisma.PayScheduleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PayScheduleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PayScheduleUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaySchedulePayload>[]
          }
          upsert: {
            args: Prisma.PayScheduleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaySchedulePayload>
          }
          aggregate: {
            args: Prisma.PayScheduleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePaySchedule>
          }
          groupBy: {
            args: Prisma.PayScheduleGroupByArgs<ExtArgs>
            result: $Utils.Optional<PayScheduleGroupByOutputType>[]
          }
          count: {
            args: Prisma.PayScheduleCountArgs<ExtArgs>
            result: $Utils.Optional<PayScheduleCountAggregateOutputType> | number
          }
        }
      }
      Goal: {
        payload: Prisma.$GoalPayload<ExtArgs>
        fields: Prisma.GoalFieldRefs
        operations: {
          findUnique: {
            args: Prisma.GoalFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GoalPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.GoalFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>
          }
          findFirst: {
            args: Prisma.GoalFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GoalPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.GoalFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>
          }
          findMany: {
            args: Prisma.GoalFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>[]
          }
          create: {
            args: Prisma.GoalCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>
          }
          createMany: {
            args: Prisma.GoalCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.GoalCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>[]
          }
          delete: {
            args: Prisma.GoalDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>
          }
          update: {
            args: Prisma.GoalUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>
          }
          deleteMany: {
            args: Prisma.GoalDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.GoalUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.GoalUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>[]
          }
          upsert: {
            args: Prisma.GoalUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>
          }
          aggregate: {
            args: Prisma.GoalAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateGoal>
          }
          groupBy: {
            args: Prisma.GoalGroupByArgs<ExtArgs>
            result: $Utils.Optional<GoalGroupByOutputType>[]
          }
          count: {
            args: Prisma.GoalCountArgs<ExtArgs>
            result: $Utils.Optional<GoalCountAggregateOutputType> | number
          }
        }
      }
      AllocationPlan: {
        payload: Prisma.$AllocationPlanPayload<ExtArgs>
        fields: Prisma.AllocationPlanFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AllocationPlanFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationPlanPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AllocationPlanFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationPlanPayload>
          }
          findFirst: {
            args: Prisma.AllocationPlanFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationPlanPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AllocationPlanFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationPlanPayload>
          }
          findMany: {
            args: Prisma.AllocationPlanFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationPlanPayload>[]
          }
          create: {
            args: Prisma.AllocationPlanCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationPlanPayload>
          }
          createMany: {
            args: Prisma.AllocationPlanCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AllocationPlanCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationPlanPayload>[]
          }
          delete: {
            args: Prisma.AllocationPlanDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationPlanPayload>
          }
          update: {
            args: Prisma.AllocationPlanUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationPlanPayload>
          }
          deleteMany: {
            args: Prisma.AllocationPlanDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AllocationPlanUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AllocationPlanUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationPlanPayload>[]
          }
          upsert: {
            args: Prisma.AllocationPlanUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationPlanPayload>
          }
          aggregate: {
            args: Prisma.AllocationPlanAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAllocationPlan>
          }
          groupBy: {
            args: Prisma.AllocationPlanGroupByArgs<ExtArgs>
            result: $Utils.Optional<AllocationPlanGroupByOutputType>[]
          }
          count: {
            args: Prisma.AllocationPlanCountArgs<ExtArgs>
            result: $Utils.Optional<AllocationPlanCountAggregateOutputType> | number
          }
        }
      }
      AllocationRule: {
        payload: Prisma.$AllocationRulePayload<ExtArgs>
        fields: Prisma.AllocationRuleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AllocationRuleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationRulePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AllocationRuleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationRulePayload>
          }
          findFirst: {
            args: Prisma.AllocationRuleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationRulePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AllocationRuleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationRulePayload>
          }
          findMany: {
            args: Prisma.AllocationRuleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationRulePayload>[]
          }
          create: {
            args: Prisma.AllocationRuleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationRulePayload>
          }
          createMany: {
            args: Prisma.AllocationRuleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AllocationRuleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationRulePayload>[]
          }
          delete: {
            args: Prisma.AllocationRuleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationRulePayload>
          }
          update: {
            args: Prisma.AllocationRuleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationRulePayload>
          }
          deleteMany: {
            args: Prisma.AllocationRuleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AllocationRuleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AllocationRuleUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationRulePayload>[]
          }
          upsert: {
            args: Prisma.AllocationRuleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AllocationRulePayload>
          }
          aggregate: {
            args: Prisma.AllocationRuleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAllocationRule>
          }
          groupBy: {
            args: Prisma.AllocationRuleGroupByArgs<ExtArgs>
            result: $Utils.Optional<AllocationRuleGroupByOutputType>[]
          }
          count: {
            args: Prisma.AllocationRuleCountArgs<ExtArgs>
            result: $Utils.Optional<AllocationRuleCountAggregateOutputType> | number
          }
        }
      }
      AuditLog: {
        payload: Prisma.$AuditLogPayload<ExtArgs>
        fields: Prisma.AuditLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuditLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuditLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          findFirst: {
            args: Prisma.AuditLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuditLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          findMany: {
            args: Prisma.AuditLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          create: {
            args: Prisma.AuditLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          createMany: {
            args: Prisma.AuditLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AuditLogCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          delete: {
            args: Prisma.AuditLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          update: {
            args: Prisma.AuditLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          deleteMany: {
            args: Prisma.AuditLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AuditLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AuditLogUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          upsert: {
            args: Prisma.AuditLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          aggregate: {
            args: Prisma.AuditLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAuditLog>
          }
          groupBy: {
            args: Prisma.AuditLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<AuditLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuditLogCountArgs<ExtArgs>
            result: $Utils.Optional<AuditLogCountAggregateOutputType> | number
          }
        }
      }
      SystemSettings: {
        payload: Prisma.$SystemSettingsPayload<ExtArgs>
        fields: Prisma.SystemSettingsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SystemSettingsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemSettingsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SystemSettingsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemSettingsPayload>
          }
          findFirst: {
            args: Prisma.SystemSettingsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemSettingsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SystemSettingsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemSettingsPayload>
          }
          findMany: {
            args: Prisma.SystemSettingsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemSettingsPayload>[]
          }
          create: {
            args: Prisma.SystemSettingsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemSettingsPayload>
          }
          createMany: {
            args: Prisma.SystemSettingsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SystemSettingsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemSettingsPayload>[]
          }
          delete: {
            args: Prisma.SystemSettingsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemSettingsPayload>
          }
          update: {
            args: Prisma.SystemSettingsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemSettingsPayload>
          }
          deleteMany: {
            args: Prisma.SystemSettingsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SystemSettingsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SystemSettingsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemSettingsPayload>[]
          }
          upsert: {
            args: Prisma.SystemSettingsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemSettingsPayload>
          }
          aggregate: {
            args: Prisma.SystemSettingsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSystemSettings>
          }
          groupBy: {
            args: Prisma.SystemSettingsGroupByArgs<ExtArgs>
            result: $Utils.Optional<SystemSettingsGroupByOutputType>[]
          }
          count: {
            args: Prisma.SystemSettingsCountArgs<ExtArgs>
            result: $Utils.Optional<SystemSettingsCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * A driver adapter that PrismaClient uses to connect to your database, such as the ones provided by `@prisma/adapter-pg`, `@prisma/adapter-libsql`, `@prisma/adapter-planetscale`, etc.
     * 
     * A driver adapter is **required** unless you connect to your database through Prisma Accelerate (in which case use `accelerateUrl` instead).
     * 
     * Learn more: https://pris.ly/d/driver-adapters
     * 
     * @example
     * ```ts
     * import { PrismaPg } from '@prisma/adapter-pg'
     * import { PrismaClient } from './generated/prisma/client'
     * 
     * const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
     * const prisma = new PrismaClient({ adapter })
     * ```
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * The Prisma Accelerate connection URL. Use this option to connect to your database through Prisma Accelerate instead of using a driver adapter to connect directly.
     * 
     * Learn more: https://pris.ly/d/accelerate
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    session?: SessionOmit
    account?: AccountOmit
    envelope?: EnvelopeOmit
    transaction?: TransactionOmit
    paySchedule?: PayScheduleOmit
    goal?: GoalOmit
    allocationPlan?: AllocationPlanOmit
    allocationRule?: AllocationRuleOmit
    auditLog?: AuditLogOmit
    systemSettings?: SystemSettingsOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    sessions: number
    accounts: number
    envelopes: number
    transactions: number
    paySchedules: number
    goals: number
    allocationPlans: number
    auditLog: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sessions?: boolean | UserCountOutputTypeCountSessionsArgs
    accounts?: boolean | UserCountOutputTypeCountAccountsArgs
    envelopes?: boolean | UserCountOutputTypeCountEnvelopesArgs
    transactions?: boolean | UserCountOutputTypeCountTransactionsArgs
    paySchedules?: boolean | UserCountOutputTypeCountPaySchedulesArgs
    goals?: boolean | UserCountOutputTypeCountGoalsArgs
    allocationPlans?: boolean | UserCountOutputTypeCountAllocationPlansArgs
    auditLog?: boolean | UserCountOutputTypeCountAuditLogArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAccountsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AccountWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountEnvelopesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EnvelopeWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountPaySchedulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PayScheduleWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountGoalsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GoalWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAllocationPlansArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AllocationPlanWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAuditLogArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditLogWhereInput
  }


  /**
   * Count Type AccountCountOutputType
   */

  export type AccountCountOutputType = {
    transactions: number
    paySchedules: number
  }

  export type AccountCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    transactions?: boolean | AccountCountOutputTypeCountTransactionsArgs
    paySchedules?: boolean | AccountCountOutputTypeCountPaySchedulesArgs
  }

  // Custom InputTypes
  /**
   * AccountCountOutputType without action
   */
  export type AccountCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AccountCountOutputType
     */
    select?: AccountCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AccountCountOutputType without action
   */
  export type AccountCountOutputTypeCountTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
  }

  /**
   * AccountCountOutputType without action
   */
  export type AccountCountOutputTypeCountPaySchedulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PayScheduleWhereInput
  }


  /**
   * Count Type EnvelopeCountOutputType
   */

  export type EnvelopeCountOutputType = {
    transactions: number
    allocationRules: number
  }

  export type EnvelopeCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    transactions?: boolean | EnvelopeCountOutputTypeCountTransactionsArgs
    allocationRules?: boolean | EnvelopeCountOutputTypeCountAllocationRulesArgs
  }

  // Custom InputTypes
  /**
   * EnvelopeCountOutputType without action
   */
  export type EnvelopeCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EnvelopeCountOutputType
     */
    select?: EnvelopeCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * EnvelopeCountOutputType without action
   */
  export type EnvelopeCountOutputTypeCountTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
  }

  /**
   * EnvelopeCountOutputType without action
   */
  export type EnvelopeCountOutputTypeCountAllocationRulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AllocationRuleWhereInput
  }


  /**
   * Count Type AllocationPlanCountOutputType
   */

  export type AllocationPlanCountOutputType = {
    rules: number
  }

  export type AllocationPlanCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    rules?: boolean | AllocationPlanCountOutputTypeCountRulesArgs
  }

  // Custom InputTypes
  /**
   * AllocationPlanCountOutputType without action
   */
  export type AllocationPlanCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationPlanCountOutputType
     */
    select?: AllocationPlanCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AllocationPlanCountOutputType without action
   */
  export type AllocationPlanCountOutputTypeCountRulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AllocationRuleWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserAvgAggregateOutputType = {
    aiTier: number | null
    routingLevel: number | null
  }

  export type UserSumAggregateOutputType = {
    aiTier: number | null
    routingLevel: number | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    passwordHash: string | null
    aiTier: number | null
    routingLevel: number | null
    defaultViewId: string | null
    settings: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    passwordHash: string | null
    aiTier: number | null
    routingLevel: number | null
    defaultViewId: string | null
    settings: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    name: number
    email: number
    passwordHash: number
    aiTier: number
    routingLevel: number
    defaultViewId: number
    settings: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserAvgAggregateInputType = {
    aiTier?: true
    routingLevel?: true
  }

  export type UserSumAggregateInputType = {
    aiTier?: true
    routingLevel?: true
  }

  export type UserMinAggregateInputType = {
    id?: true
    name?: true
    email?: true
    passwordHash?: true
    aiTier?: true
    routingLevel?: true
    defaultViewId?: true
    settings?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    name?: true
    email?: true
    passwordHash?: true
    aiTier?: true
    routingLevel?: true
    defaultViewId?: true
    settings?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    name?: true
    email?: true
    passwordHash?: true
    aiTier?: true
    routingLevel?: true
    defaultViewId?: true
    settings?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UserAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UserSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _avg?: UserAvgAggregateInputType
    _sum?: UserSumAggregateInputType
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    name: string
    email: string
    passwordHash: string
    aiTier: number
    routingLevel: number
    defaultViewId: string | null
    settings: string
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    passwordHash?: boolean
    aiTier?: boolean
    routingLevel?: boolean
    defaultViewId?: boolean
    settings?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    sessions?: boolean | User$sessionsArgs<ExtArgs>
    accounts?: boolean | User$accountsArgs<ExtArgs>
    envelopes?: boolean | User$envelopesArgs<ExtArgs>
    transactions?: boolean | User$transactionsArgs<ExtArgs>
    paySchedules?: boolean | User$paySchedulesArgs<ExtArgs>
    goals?: boolean | User$goalsArgs<ExtArgs>
    allocationPlans?: boolean | User$allocationPlansArgs<ExtArgs>
    auditLog?: boolean | User$auditLogArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    passwordHash?: boolean
    aiTier?: boolean
    routingLevel?: boolean
    defaultViewId?: boolean
    settings?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    passwordHash?: boolean
    aiTier?: boolean
    routingLevel?: boolean
    defaultViewId?: boolean
    settings?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    name?: boolean
    email?: boolean
    passwordHash?: boolean
    aiTier?: boolean
    routingLevel?: boolean
    defaultViewId?: boolean
    settings?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "email" | "passwordHash" | "aiTier" | "routingLevel" | "defaultViewId" | "settings" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sessions?: boolean | User$sessionsArgs<ExtArgs>
    accounts?: boolean | User$accountsArgs<ExtArgs>
    envelopes?: boolean | User$envelopesArgs<ExtArgs>
    transactions?: boolean | User$transactionsArgs<ExtArgs>
    paySchedules?: boolean | User$paySchedulesArgs<ExtArgs>
    goals?: boolean | User$goalsArgs<ExtArgs>
    allocationPlans?: boolean | User$allocationPlansArgs<ExtArgs>
    auditLog?: boolean | User$auditLogArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      sessions: Prisma.$SessionPayload<ExtArgs>[]
      accounts: Prisma.$AccountPayload<ExtArgs>[]
      envelopes: Prisma.$EnvelopePayload<ExtArgs>[]
      transactions: Prisma.$TransactionPayload<ExtArgs>[]
      paySchedules: Prisma.$PaySchedulePayload<ExtArgs>[]
      goals: Prisma.$GoalPayload<ExtArgs>[]
      allocationPlans: Prisma.$AllocationPlanPayload<ExtArgs>[]
      auditLog: Prisma.$AuditLogPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      email: string
      passwordHash: string
      /**
       * AI capability tier (D2): 0=off, 1=assistive, 2=co-pilot, 3=autonomous.
       */
      aiTier: number
      /**
       * Routing level (D4): 0=tracking, 1=planned (L1 in v1), 2=actual (L2 future).
       */
      routingLevel: number
      /**
       * Default saved dashboard view for this user.
       */
      defaultViewId: string | null
      /**
       * Free-form settings (theme, currency, locale, etc.) — JSON-encoded string.
       * String instead of Json because Prisma 7's Json type uses JSONB, which SQLite
       * doesn't support. We serialize/parse in app code (lib/json.ts) — the contract
       * stays the same and Postgres migration in the future is trivial.
       */
      settings: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    sessions<T extends User$sessionsArgs<ExtArgs> = {}>(args?: Subset<T, User$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    accounts<T extends User$accountsArgs<ExtArgs> = {}>(args?: Subset<T, User$accountsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    envelopes<T extends User$envelopesArgs<ExtArgs> = {}>(args?: Subset<T, User$envelopesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EnvelopePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    transactions<T extends User$transactionsArgs<ExtArgs> = {}>(args?: Subset<T, User$transactionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    paySchedules<T extends User$paySchedulesArgs<ExtArgs> = {}>(args?: Subset<T, User$paySchedulesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaySchedulePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    goals<T extends User$goalsArgs<ExtArgs> = {}>(args?: Subset<T, User$goalsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    allocationPlans<T extends User$allocationPlansArgs<ExtArgs> = {}>(args?: Subset<T, User$allocationPlansArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AllocationPlanPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    auditLog<T extends User$auditLogArgs<ExtArgs> = {}>(args?: Subset<T, User$auditLogArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly name: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly passwordHash: FieldRef<"User", 'String'>
    readonly aiTier: FieldRef<"User", 'Int'>
    readonly routingLevel: FieldRef<"User", 'Int'>
    readonly defaultViewId: FieldRef<"User", 'String'>
    readonly settings: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.sessions
   */
  export type User$sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    cursor?: SessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * User.accounts
   */
  export type User$accountsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    where?: AccountWhereInput
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    cursor?: AccountWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * User.envelopes
   */
  export type User$envelopesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Envelope
     */
    select?: EnvelopeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Envelope
     */
    omit?: EnvelopeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnvelopeInclude<ExtArgs> | null
    where?: EnvelopeWhereInput
    orderBy?: EnvelopeOrderByWithRelationInput | EnvelopeOrderByWithRelationInput[]
    cursor?: EnvelopeWhereUniqueInput
    take?: number
    skip?: number
    distinct?: EnvelopeScalarFieldEnum | EnvelopeScalarFieldEnum[]
  }

  /**
   * User.transactions
   */
  export type User$transactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    cursor?: TransactionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * User.paySchedules
   */
  export type User$paySchedulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaySchedule
     */
    select?: PayScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaySchedule
     */
    omit?: PayScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayScheduleInclude<ExtArgs> | null
    where?: PayScheduleWhereInput
    orderBy?: PayScheduleOrderByWithRelationInput | PayScheduleOrderByWithRelationInput[]
    cursor?: PayScheduleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PayScheduleScalarFieldEnum | PayScheduleScalarFieldEnum[]
  }

  /**
   * User.goals
   */
  export type User$goalsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Goal
     */
    omit?: GoalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null
    where?: GoalWhereInput
    orderBy?: GoalOrderByWithRelationInput | GoalOrderByWithRelationInput[]
    cursor?: GoalWhereUniqueInput
    take?: number
    skip?: number
    distinct?: GoalScalarFieldEnum | GoalScalarFieldEnum[]
  }

  /**
   * User.allocationPlans
   */
  export type User$allocationPlansArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationPlan
     */
    select?: AllocationPlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationPlan
     */
    omit?: AllocationPlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationPlanInclude<ExtArgs> | null
    where?: AllocationPlanWhereInput
    orderBy?: AllocationPlanOrderByWithRelationInput | AllocationPlanOrderByWithRelationInput[]
    cursor?: AllocationPlanWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AllocationPlanScalarFieldEnum | AllocationPlanScalarFieldEnum[]
  }

  /**
   * User.auditLog
   */
  export type User$auditLogArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    where?: AuditLogWhereInput
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    cursor?: AuditLogWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Session
   */

  export type AggregateSession = {
    _count: SessionCountAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  export type SessionMinAggregateOutputType = {
    id: string | null
    userId: string | null
    tokenHash: string | null
    userAgent: string | null
    ip: string | null
    lastSeenAt: Date | null
    createdAt: Date | null
    expiresAt: Date | null
  }

  export type SessionMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    tokenHash: string | null
    userAgent: string | null
    ip: string | null
    lastSeenAt: Date | null
    createdAt: Date | null
    expiresAt: Date | null
  }

  export type SessionCountAggregateOutputType = {
    id: number
    userId: number
    tokenHash: number
    userAgent: number
    ip: number
    lastSeenAt: number
    createdAt: number
    expiresAt: number
    _all: number
  }


  export type SessionMinAggregateInputType = {
    id?: true
    userId?: true
    tokenHash?: true
    userAgent?: true
    ip?: true
    lastSeenAt?: true
    createdAt?: true
    expiresAt?: true
  }

  export type SessionMaxAggregateInputType = {
    id?: true
    userId?: true
    tokenHash?: true
    userAgent?: true
    ip?: true
    lastSeenAt?: true
    createdAt?: true
    expiresAt?: true
  }

  export type SessionCountAggregateInputType = {
    id?: true
    userId?: true
    tokenHash?: true
    userAgent?: true
    ip?: true
    lastSeenAt?: true
    createdAt?: true
    expiresAt?: true
    _all?: true
  }

  export type SessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Session to aggregate.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Sessions
    **/
    _count?: true | SessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SessionMaxAggregateInputType
  }

  export type GetSessionAggregateType<T extends SessionAggregateArgs> = {
        [P in keyof T & keyof AggregateSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSession[P]>
      : GetScalarType<T[P], AggregateSession[P]>
  }




  export type SessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithAggregationInput | SessionOrderByWithAggregationInput[]
    by: SessionScalarFieldEnum[] | SessionScalarFieldEnum
    having?: SessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SessionCountAggregateInputType | true
    _min?: SessionMinAggregateInputType
    _max?: SessionMaxAggregateInputType
  }

  export type SessionGroupByOutputType = {
    id: string
    userId: string
    tokenHash: string
    userAgent: string | null
    ip: string | null
    lastSeenAt: Date
    createdAt: Date
    expiresAt: Date
    _count: SessionCountAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  type GetSessionGroupByPayload<T extends SessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SessionGroupByOutputType[P]>
            : GetScalarType<T[P], SessionGroupByOutputType[P]>
        }
      >
    >


  export type SessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    tokenHash?: boolean
    userAgent?: boolean
    ip?: boolean
    lastSeenAt?: boolean
    createdAt?: boolean
    expiresAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    tokenHash?: boolean
    userAgent?: boolean
    ip?: boolean
    lastSeenAt?: boolean
    createdAt?: boolean
    expiresAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    tokenHash?: boolean
    userAgent?: boolean
    ip?: boolean
    lastSeenAt?: boolean
    createdAt?: boolean
    expiresAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectScalar = {
    id?: boolean
    userId?: boolean
    tokenHash?: boolean
    userAgent?: boolean
    ip?: boolean
    lastSeenAt?: boolean
    createdAt?: boolean
    expiresAt?: boolean
  }

  export type SessionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "tokenHash" | "userAgent" | "ip" | "lastSeenAt" | "createdAt" | "expiresAt", ExtArgs["result"]["session"]>
  export type SessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type SessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type SessionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $SessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Session"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      /**
       * Hashed cookie token. We never store the raw token, so a DB leak
       * doesn't allow session hijack.
       */
      tokenHash: string
      userAgent: string | null
      ip: string | null
      /**
       * Last-seen timestamp — refreshes on every authenticated request.
       */
      lastSeenAt: Date
      createdAt: Date
      /**
       * Absolute expiry. Sliding sessions (extend on activity) are a future
       * enhancement; v1 uses a fixed window so "log out everywhere" is a
       * single `deleteMany` per user.
       */
      expiresAt: Date
    }, ExtArgs["result"]["session"]>
    composites: {}
  }

  type SessionGetPayload<S extends boolean | null | undefined | SessionDefaultArgs> = $Result.GetResult<Prisma.$SessionPayload, S>

  type SessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SessionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SessionCountAggregateInputType | true
    }

  export interface SessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Session'], meta: { name: 'Session' } }
    /**
     * Find zero or one Session that matches the filter.
     * @param {SessionFindUniqueArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SessionFindUniqueArgs>(args: SelectSubset<T, SessionFindUniqueArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Session that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SessionFindUniqueOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SessionFindUniqueOrThrowArgs>(args: SelectSubset<T, SessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Session that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SessionFindFirstArgs>(args?: SelectSubset<T, SessionFindFirstArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Session that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SessionFindFirstOrThrowArgs>(args?: SelectSubset<T, SessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Sessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Sessions
     * const sessions = await prisma.session.findMany()
     * 
     * // Get first 10 Sessions
     * const sessions = await prisma.session.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const sessionWithIdOnly = await prisma.session.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SessionFindManyArgs>(args?: SelectSubset<T, SessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Session.
     * @param {SessionCreateArgs} args - Arguments to create a Session.
     * @example
     * // Create one Session
     * const Session = await prisma.session.create({
     *   data: {
     *     // ... data to create a Session
     *   }
     * })
     * 
     */
    create<T extends SessionCreateArgs>(args: SelectSubset<T, SessionCreateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Sessions.
     * @param {SessionCreateManyArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SessionCreateManyArgs>(args?: SelectSubset<T, SessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Sessions and returns the data saved in the database.
     * @param {SessionCreateManyAndReturnArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Sessions and only return the `id`
     * const sessionWithIdOnly = await prisma.session.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SessionCreateManyAndReturnArgs>(args?: SelectSubset<T, SessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Session.
     * @param {SessionDeleteArgs} args - Arguments to delete one Session.
     * @example
     * // Delete one Session
     * const Session = await prisma.session.delete({
     *   where: {
     *     // ... filter to delete one Session
     *   }
     * })
     * 
     */
    delete<T extends SessionDeleteArgs>(args: SelectSubset<T, SessionDeleteArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Session.
     * @param {SessionUpdateArgs} args - Arguments to update one Session.
     * @example
     * // Update one Session
     * const session = await prisma.session.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SessionUpdateArgs>(args: SelectSubset<T, SessionUpdateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Sessions.
     * @param {SessionDeleteManyArgs} args - Arguments to filter Sessions to delete.
     * @example
     * // Delete a few Sessions
     * const { count } = await prisma.session.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SessionDeleteManyArgs>(args?: SelectSubset<T, SessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Sessions
     * const session = await prisma.session.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SessionUpdateManyArgs>(args: SelectSubset<T, SessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sessions and returns the data updated in the database.
     * @param {SessionUpdateManyAndReturnArgs} args - Arguments to update many Sessions.
     * @example
     * // Update many Sessions
     * const session = await prisma.session.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Sessions and only return the `id`
     * const sessionWithIdOnly = await prisma.session.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SessionUpdateManyAndReturnArgs>(args: SelectSubset<T, SessionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Session.
     * @param {SessionUpsertArgs} args - Arguments to update or create a Session.
     * @example
     * // Update or create a Session
     * const session = await prisma.session.upsert({
     *   create: {
     *     // ... data to create a Session
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Session we want to update
     *   }
     * })
     */
    upsert<T extends SessionUpsertArgs>(args: SelectSubset<T, SessionUpsertArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionCountArgs} args - Arguments to filter Sessions to count.
     * @example
     * // Count the number of Sessions
     * const count = await prisma.session.count({
     *   where: {
     *     // ... the filter for the Sessions we want to count
     *   }
     * })
    **/
    count<T extends SessionCountArgs>(
      args?: Subset<T, SessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SessionAggregateArgs>(args: Subset<T, SessionAggregateArgs>): Prisma.PrismaPromise<GetSessionAggregateType<T>>

    /**
     * Group by Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SessionGroupByArgs['orderBy'] }
        : { orderBy?: SessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Session model
   */
  readonly fields: SessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Session.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Session model
   */
  interface SessionFieldRefs {
    readonly id: FieldRef<"Session", 'String'>
    readonly userId: FieldRef<"Session", 'String'>
    readonly tokenHash: FieldRef<"Session", 'String'>
    readonly userAgent: FieldRef<"Session", 'String'>
    readonly ip: FieldRef<"Session", 'String'>
    readonly lastSeenAt: FieldRef<"Session", 'DateTime'>
    readonly createdAt: FieldRef<"Session", 'DateTime'>
    readonly expiresAt: FieldRef<"Session", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Session findUnique
   */
  export type SessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findUniqueOrThrow
   */
  export type SessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findFirst
   */
  export type SessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findFirstOrThrow
   */
  export type SessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findMany
   */
  export type SessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Sessions to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session create
   */
  export type SessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to create a Session.
     */
    data: XOR<SessionCreateInput, SessionUncheckedCreateInput>
  }

  /**
   * Session createMany
   */
  export type SessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
  }

  /**
   * Session createManyAndReturn
   */
  export type SessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Session update
   */
  export type SessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to update a Session.
     */
    data: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
    /**
     * Choose, which Session to update.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session updateMany
   */
  export type SessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Sessions.
     */
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyInput>
    /**
     * Filter which Sessions to update
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to update.
     */
    limit?: number
  }

  /**
   * Session updateManyAndReturn
   */
  export type SessionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * The data used to update Sessions.
     */
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyInput>
    /**
     * Filter which Sessions to update
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Session upsert
   */
  export type SessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The filter to search for the Session to update in case it exists.
     */
    where: SessionWhereUniqueInput
    /**
     * In case the Session found by the `where` argument doesn't exist, create a new Session with this data.
     */
    create: XOR<SessionCreateInput, SessionUncheckedCreateInput>
    /**
     * In case the Session was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
  }

  /**
   * Session delete
   */
  export type SessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter which Session to delete.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session deleteMany
   */
  export type SessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Sessions to delete
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to delete.
     */
    limit?: number
  }

  /**
   * Session without action
   */
  export type SessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
  }


  /**
   * Model Account
   */

  export type AggregateAccount = {
    _count: AccountCountAggregateOutputType | null
    _avg: AccountAvgAggregateOutputType | null
    _sum: AccountSumAggregateOutputType | null
    _min: AccountMinAggregateOutputType | null
    _max: AccountMaxAggregateOutputType | null
  }

  export type AccountAvgAggregateOutputType = {
    currentBalance: number | null
    sortOrder: number | null
  }

  export type AccountSumAggregateOutputType = {
    currentBalance: number | null
    sortOrder: number | null
  }

  export type AccountMinAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    type: string | null
    currentBalance: number | null
    institution: string | null
    mask: string | null
    routingEnabled: boolean | null
    isArchived: boolean | null
    sortOrder: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AccountMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    type: string | null
    currentBalance: number | null
    institution: string | null
    mask: string | null
    routingEnabled: boolean | null
    isArchived: boolean | null
    sortOrder: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AccountCountAggregateOutputType = {
    id: number
    userId: number
    name: number
    type: number
    currentBalance: number
    institution: number
    mask: number
    routingEnabled: number
    isArchived: number
    sortOrder: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AccountAvgAggregateInputType = {
    currentBalance?: true
    sortOrder?: true
  }

  export type AccountSumAggregateInputType = {
    currentBalance?: true
    sortOrder?: true
  }

  export type AccountMinAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    type?: true
    currentBalance?: true
    institution?: true
    mask?: true
    routingEnabled?: true
    isArchived?: true
    sortOrder?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AccountMaxAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    type?: true
    currentBalance?: true
    institution?: true
    mask?: true
    routingEnabled?: true
    isArchived?: true
    sortOrder?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AccountCountAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    type?: true
    currentBalance?: true
    institution?: true
    mask?: true
    routingEnabled?: true
    isArchived?: true
    sortOrder?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AccountAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Account to aggregate.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Accounts
    **/
    _count?: true | AccountCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AccountAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AccountSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AccountMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AccountMaxAggregateInputType
  }

  export type GetAccountAggregateType<T extends AccountAggregateArgs> = {
        [P in keyof T & keyof AggregateAccount]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAccount[P]>
      : GetScalarType<T[P], AggregateAccount[P]>
  }




  export type AccountGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AccountWhereInput
    orderBy?: AccountOrderByWithAggregationInput | AccountOrderByWithAggregationInput[]
    by: AccountScalarFieldEnum[] | AccountScalarFieldEnum
    having?: AccountScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AccountCountAggregateInputType | true
    _avg?: AccountAvgAggregateInputType
    _sum?: AccountSumAggregateInputType
    _min?: AccountMinAggregateInputType
    _max?: AccountMaxAggregateInputType
  }

  export type AccountGroupByOutputType = {
    id: string
    userId: string
    name: string
    type: string
    currentBalance: number
    institution: string | null
    mask: string | null
    routingEnabled: boolean
    isArchived: boolean
    sortOrder: number
    createdAt: Date
    updatedAt: Date
    _count: AccountCountAggregateOutputType | null
    _avg: AccountAvgAggregateOutputType | null
    _sum: AccountSumAggregateOutputType | null
    _min: AccountMinAggregateOutputType | null
    _max: AccountMaxAggregateOutputType | null
  }

  type GetAccountGroupByPayload<T extends AccountGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AccountGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AccountGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AccountGroupByOutputType[P]>
            : GetScalarType<T[P], AccountGroupByOutputType[P]>
        }
      >
    >


  export type AccountSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    type?: boolean
    currentBalance?: boolean
    institution?: boolean
    mask?: boolean
    routingEnabled?: boolean
    isArchived?: boolean
    sortOrder?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    transactions?: boolean | Account$transactionsArgs<ExtArgs>
    paySchedules?: boolean | Account$paySchedulesArgs<ExtArgs>
    _count?: boolean | AccountCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["account"]>

  export type AccountSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    type?: boolean
    currentBalance?: boolean
    institution?: boolean
    mask?: boolean
    routingEnabled?: boolean
    isArchived?: boolean
    sortOrder?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["account"]>

  export type AccountSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    type?: boolean
    currentBalance?: boolean
    institution?: boolean
    mask?: boolean
    routingEnabled?: boolean
    isArchived?: boolean
    sortOrder?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["account"]>

  export type AccountSelectScalar = {
    id?: boolean
    userId?: boolean
    name?: boolean
    type?: boolean
    currentBalance?: boolean
    institution?: boolean
    mask?: boolean
    routingEnabled?: boolean
    isArchived?: boolean
    sortOrder?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AccountOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "name" | "type" | "currentBalance" | "institution" | "mask" | "routingEnabled" | "isArchived" | "sortOrder" | "createdAt" | "updatedAt", ExtArgs["result"]["account"]>
  export type AccountInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    transactions?: boolean | Account$transactionsArgs<ExtArgs>
    paySchedules?: boolean | Account$paySchedulesArgs<ExtArgs>
    _count?: boolean | AccountCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AccountIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type AccountIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $AccountPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Account"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      transactions: Prisma.$TransactionPayload<ExtArgs>[]
      paySchedules: Prisma.$PaySchedulePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      name: string
      /**
       * checking | savings | credit | cash | other
       */
      type: string
      /**
       * Current balance in cents.
       */
      currentBalance: number
      institution: string | null
      /**
       * Last 4 digits of the account number, for display.
       */
      mask: string | null
      /**
       * When L2 lands: whether the app can move money on this account.
       */
      routingEnabled: boolean
      isArchived: boolean
      sortOrder: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["account"]>
    composites: {}
  }

  type AccountGetPayload<S extends boolean | null | undefined | AccountDefaultArgs> = $Result.GetResult<Prisma.$AccountPayload, S>

  type AccountCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AccountFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AccountCountAggregateInputType | true
    }

  export interface AccountDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Account'], meta: { name: 'Account' } }
    /**
     * Find zero or one Account that matches the filter.
     * @param {AccountFindUniqueArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AccountFindUniqueArgs>(args: SelectSubset<T, AccountFindUniqueArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Account that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AccountFindUniqueOrThrowArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AccountFindUniqueOrThrowArgs>(args: SelectSubset<T, AccountFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Account that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountFindFirstArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AccountFindFirstArgs>(args?: SelectSubset<T, AccountFindFirstArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Account that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountFindFirstOrThrowArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AccountFindFirstOrThrowArgs>(args?: SelectSubset<T, AccountFindFirstOrThrowArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Accounts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Accounts
     * const accounts = await prisma.account.findMany()
     * 
     * // Get first 10 Accounts
     * const accounts = await prisma.account.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const accountWithIdOnly = await prisma.account.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AccountFindManyArgs>(args?: SelectSubset<T, AccountFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Account.
     * @param {AccountCreateArgs} args - Arguments to create a Account.
     * @example
     * // Create one Account
     * const Account = await prisma.account.create({
     *   data: {
     *     // ... data to create a Account
     *   }
     * })
     * 
     */
    create<T extends AccountCreateArgs>(args: SelectSubset<T, AccountCreateArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Accounts.
     * @param {AccountCreateManyArgs} args - Arguments to create many Accounts.
     * @example
     * // Create many Accounts
     * const account = await prisma.account.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AccountCreateManyArgs>(args?: SelectSubset<T, AccountCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Accounts and returns the data saved in the database.
     * @param {AccountCreateManyAndReturnArgs} args - Arguments to create many Accounts.
     * @example
     * // Create many Accounts
     * const account = await prisma.account.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Accounts and only return the `id`
     * const accountWithIdOnly = await prisma.account.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AccountCreateManyAndReturnArgs>(args?: SelectSubset<T, AccountCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Account.
     * @param {AccountDeleteArgs} args - Arguments to delete one Account.
     * @example
     * // Delete one Account
     * const Account = await prisma.account.delete({
     *   where: {
     *     // ... filter to delete one Account
     *   }
     * })
     * 
     */
    delete<T extends AccountDeleteArgs>(args: SelectSubset<T, AccountDeleteArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Account.
     * @param {AccountUpdateArgs} args - Arguments to update one Account.
     * @example
     * // Update one Account
     * const account = await prisma.account.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AccountUpdateArgs>(args: SelectSubset<T, AccountUpdateArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Accounts.
     * @param {AccountDeleteManyArgs} args - Arguments to filter Accounts to delete.
     * @example
     * // Delete a few Accounts
     * const { count } = await prisma.account.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AccountDeleteManyArgs>(args?: SelectSubset<T, AccountDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Accounts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Accounts
     * const account = await prisma.account.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AccountUpdateManyArgs>(args: SelectSubset<T, AccountUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Accounts and returns the data updated in the database.
     * @param {AccountUpdateManyAndReturnArgs} args - Arguments to update many Accounts.
     * @example
     * // Update many Accounts
     * const account = await prisma.account.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Accounts and only return the `id`
     * const accountWithIdOnly = await prisma.account.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AccountUpdateManyAndReturnArgs>(args: SelectSubset<T, AccountUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Account.
     * @param {AccountUpsertArgs} args - Arguments to update or create a Account.
     * @example
     * // Update or create a Account
     * const account = await prisma.account.upsert({
     *   create: {
     *     // ... data to create a Account
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Account we want to update
     *   }
     * })
     */
    upsert<T extends AccountUpsertArgs>(args: SelectSubset<T, AccountUpsertArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Accounts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountCountArgs} args - Arguments to filter Accounts to count.
     * @example
     * // Count the number of Accounts
     * const count = await prisma.account.count({
     *   where: {
     *     // ... the filter for the Accounts we want to count
     *   }
     * })
    **/
    count<T extends AccountCountArgs>(
      args?: Subset<T, AccountCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AccountCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Account.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AccountAggregateArgs>(args: Subset<T, AccountAggregateArgs>): Prisma.PrismaPromise<GetAccountAggregateType<T>>

    /**
     * Group by Account.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AccountGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AccountGroupByArgs['orderBy'] }
        : { orderBy?: AccountGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AccountGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAccountGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Account model
   */
  readonly fields: AccountFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Account.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AccountClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    transactions<T extends Account$transactionsArgs<ExtArgs> = {}>(args?: Subset<T, Account$transactionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    paySchedules<T extends Account$paySchedulesArgs<ExtArgs> = {}>(args?: Subset<T, Account$paySchedulesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaySchedulePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Account model
   */
  interface AccountFieldRefs {
    readonly id: FieldRef<"Account", 'String'>
    readonly userId: FieldRef<"Account", 'String'>
    readonly name: FieldRef<"Account", 'String'>
    readonly type: FieldRef<"Account", 'String'>
    readonly currentBalance: FieldRef<"Account", 'Int'>
    readonly institution: FieldRef<"Account", 'String'>
    readonly mask: FieldRef<"Account", 'String'>
    readonly routingEnabled: FieldRef<"Account", 'Boolean'>
    readonly isArchived: FieldRef<"Account", 'Boolean'>
    readonly sortOrder: FieldRef<"Account", 'Int'>
    readonly createdAt: FieldRef<"Account", 'DateTime'>
    readonly updatedAt: FieldRef<"Account", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Account findUnique
   */
  export type AccountFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account findUniqueOrThrow
   */
  export type AccountFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account findFirst
   */
  export type AccountFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Accounts.
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Accounts.
     */
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * Account findFirstOrThrow
   */
  export type AccountFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Accounts.
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Accounts.
     */
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * Account findMany
   */
  export type AccountFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Accounts to fetch.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Accounts.
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Accounts.
     */
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * Account create
   */
  export type AccountCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * The data needed to create a Account.
     */
    data: XOR<AccountCreateInput, AccountUncheckedCreateInput>
  }

  /**
   * Account createMany
   */
  export type AccountCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Accounts.
     */
    data: AccountCreateManyInput | AccountCreateManyInput[]
  }

  /**
   * Account createManyAndReturn
   */
  export type AccountCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * The data used to create many Accounts.
     */
    data: AccountCreateManyInput | AccountCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Account update
   */
  export type AccountUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * The data needed to update a Account.
     */
    data: XOR<AccountUpdateInput, AccountUncheckedUpdateInput>
    /**
     * Choose, which Account to update.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account updateMany
   */
  export type AccountUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Accounts.
     */
    data: XOR<AccountUpdateManyMutationInput, AccountUncheckedUpdateManyInput>
    /**
     * Filter which Accounts to update
     */
    where?: AccountWhereInput
    /**
     * Limit how many Accounts to update.
     */
    limit?: number
  }

  /**
   * Account updateManyAndReturn
   */
  export type AccountUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * The data used to update Accounts.
     */
    data: XOR<AccountUpdateManyMutationInput, AccountUncheckedUpdateManyInput>
    /**
     * Filter which Accounts to update
     */
    where?: AccountWhereInput
    /**
     * Limit how many Accounts to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Account upsert
   */
  export type AccountUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * The filter to search for the Account to update in case it exists.
     */
    where: AccountWhereUniqueInput
    /**
     * In case the Account found by the `where` argument doesn't exist, create a new Account with this data.
     */
    create: XOR<AccountCreateInput, AccountUncheckedCreateInput>
    /**
     * In case the Account was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AccountUpdateInput, AccountUncheckedUpdateInput>
  }

  /**
   * Account delete
   */
  export type AccountDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter which Account to delete.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account deleteMany
   */
  export type AccountDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Accounts to delete
     */
    where?: AccountWhereInput
    /**
     * Limit how many Accounts to delete.
     */
    limit?: number
  }

  /**
   * Account.transactions
   */
  export type Account$transactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    cursor?: TransactionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Account.paySchedules
   */
  export type Account$paySchedulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaySchedule
     */
    select?: PayScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaySchedule
     */
    omit?: PayScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayScheduleInclude<ExtArgs> | null
    where?: PayScheduleWhereInput
    orderBy?: PayScheduleOrderByWithRelationInput | PayScheduleOrderByWithRelationInput[]
    cursor?: PayScheduleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PayScheduleScalarFieldEnum | PayScheduleScalarFieldEnum[]
  }

  /**
   * Account without action
   */
  export type AccountDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
  }


  /**
   * Model Envelope
   */

  export type AggregateEnvelope = {
    _count: EnvelopeCountAggregateOutputType | null
    _avg: EnvelopeAvgAggregateOutputType | null
    _sum: EnvelopeSumAggregateOutputType | null
    _min: EnvelopeMinAggregateOutputType | null
    _max: EnvelopeMaxAggregateOutputType | null
  }

  export type EnvelopeAvgAggregateOutputType = {
    targetBalance: number | null
    currentBalance: number | null
    sortOrder: number | null
  }

  export type EnvelopeSumAggregateOutputType = {
    targetBalance: number | null
    currentBalance: number | null
    sortOrder: number | null
  }

  export type EnvelopeMinAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    targetBalance: number | null
    currentBalance: number | null
    planet: string | null
    color: string | null
    icon: string | null
    destinationAccountId: string | null
    enforceHardCap: boolean | null
    sortOrder: number | null
    isArchived: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type EnvelopeMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    targetBalance: number | null
    currentBalance: number | null
    planet: string | null
    color: string | null
    icon: string | null
    destinationAccountId: string | null
    enforceHardCap: boolean | null
    sortOrder: number | null
    isArchived: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type EnvelopeCountAggregateOutputType = {
    id: number
    userId: number
    name: number
    targetBalance: number
    currentBalance: number
    planet: number
    color: number
    icon: number
    destinationAccountId: number
    enforceHardCap: number
    sortOrder: number
    isArchived: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type EnvelopeAvgAggregateInputType = {
    targetBalance?: true
    currentBalance?: true
    sortOrder?: true
  }

  export type EnvelopeSumAggregateInputType = {
    targetBalance?: true
    currentBalance?: true
    sortOrder?: true
  }

  export type EnvelopeMinAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    targetBalance?: true
    currentBalance?: true
    planet?: true
    color?: true
    icon?: true
    destinationAccountId?: true
    enforceHardCap?: true
    sortOrder?: true
    isArchived?: true
    createdAt?: true
    updatedAt?: true
  }

  export type EnvelopeMaxAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    targetBalance?: true
    currentBalance?: true
    planet?: true
    color?: true
    icon?: true
    destinationAccountId?: true
    enforceHardCap?: true
    sortOrder?: true
    isArchived?: true
    createdAt?: true
    updatedAt?: true
  }

  export type EnvelopeCountAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    targetBalance?: true
    currentBalance?: true
    planet?: true
    color?: true
    icon?: true
    destinationAccountId?: true
    enforceHardCap?: true
    sortOrder?: true
    isArchived?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type EnvelopeAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Envelope to aggregate.
     */
    where?: EnvelopeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Envelopes to fetch.
     */
    orderBy?: EnvelopeOrderByWithRelationInput | EnvelopeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: EnvelopeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Envelopes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Envelopes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Envelopes
    **/
    _count?: true | EnvelopeCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: EnvelopeAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: EnvelopeSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EnvelopeMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EnvelopeMaxAggregateInputType
  }

  export type GetEnvelopeAggregateType<T extends EnvelopeAggregateArgs> = {
        [P in keyof T & keyof AggregateEnvelope]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEnvelope[P]>
      : GetScalarType<T[P], AggregateEnvelope[P]>
  }




  export type EnvelopeGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EnvelopeWhereInput
    orderBy?: EnvelopeOrderByWithAggregationInput | EnvelopeOrderByWithAggregationInput[]
    by: EnvelopeScalarFieldEnum[] | EnvelopeScalarFieldEnum
    having?: EnvelopeScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EnvelopeCountAggregateInputType | true
    _avg?: EnvelopeAvgAggregateInputType
    _sum?: EnvelopeSumAggregateInputType
    _min?: EnvelopeMinAggregateInputType
    _max?: EnvelopeMaxAggregateInputType
  }

  export type EnvelopeGroupByOutputType = {
    id: string
    userId: string
    name: string
    targetBalance: number
    currentBalance: number
    planet: string | null
    color: string | null
    icon: string | null
    destinationAccountId: string | null
    enforceHardCap: boolean
    sortOrder: number
    isArchived: boolean
    createdAt: Date
    updatedAt: Date
    _count: EnvelopeCountAggregateOutputType | null
    _avg: EnvelopeAvgAggregateOutputType | null
    _sum: EnvelopeSumAggregateOutputType | null
    _min: EnvelopeMinAggregateOutputType | null
    _max: EnvelopeMaxAggregateOutputType | null
  }

  type GetEnvelopeGroupByPayload<T extends EnvelopeGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EnvelopeGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EnvelopeGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EnvelopeGroupByOutputType[P]>
            : GetScalarType<T[P], EnvelopeGroupByOutputType[P]>
        }
      >
    >


  export type EnvelopeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    targetBalance?: boolean
    currentBalance?: boolean
    planet?: boolean
    color?: boolean
    icon?: boolean
    destinationAccountId?: boolean
    enforceHardCap?: boolean
    sortOrder?: boolean
    isArchived?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    transactions?: boolean | Envelope$transactionsArgs<ExtArgs>
    allocationRules?: boolean | Envelope$allocationRulesArgs<ExtArgs>
    _count?: boolean | EnvelopeCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["envelope"]>

  export type EnvelopeSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    targetBalance?: boolean
    currentBalance?: boolean
    planet?: boolean
    color?: boolean
    icon?: boolean
    destinationAccountId?: boolean
    enforceHardCap?: boolean
    sortOrder?: boolean
    isArchived?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["envelope"]>

  export type EnvelopeSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    targetBalance?: boolean
    currentBalance?: boolean
    planet?: boolean
    color?: boolean
    icon?: boolean
    destinationAccountId?: boolean
    enforceHardCap?: boolean
    sortOrder?: boolean
    isArchived?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["envelope"]>

  export type EnvelopeSelectScalar = {
    id?: boolean
    userId?: boolean
    name?: boolean
    targetBalance?: boolean
    currentBalance?: boolean
    planet?: boolean
    color?: boolean
    icon?: boolean
    destinationAccountId?: boolean
    enforceHardCap?: boolean
    sortOrder?: boolean
    isArchived?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type EnvelopeOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "name" | "targetBalance" | "currentBalance" | "planet" | "color" | "icon" | "destinationAccountId" | "enforceHardCap" | "sortOrder" | "isArchived" | "createdAt" | "updatedAt", ExtArgs["result"]["envelope"]>
  export type EnvelopeInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    transactions?: boolean | Envelope$transactionsArgs<ExtArgs>
    allocationRules?: boolean | Envelope$allocationRulesArgs<ExtArgs>
    _count?: boolean | EnvelopeCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type EnvelopeIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type EnvelopeIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $EnvelopePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Envelope"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      transactions: Prisma.$TransactionPayload<ExtArgs>[]
      allocationRules: Prisma.$AllocationRulePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      name: string
      /**
       * Target balance in cents (the cap / goal).
       */
      targetBalance: number
      /**
       * Cached current balance. Recomputed on every transaction; kept in sync
       * by the auto-allocate engine and the transaction write path.
       */
      currentBalance: number
      /**
       * sol | luna | mars | mercury | jupiter | venus | saturn — null for custom envelopes.
       */
      planet: string | null
      /**
       * Color (hex) — for non-planetary custom envelopes.
       */
      color: string | null
      /**
       * Icon — single character or short code. Defaults to the planetary glyph.
       */
      icon: string | null
      /**
       * Optional destination account — the account money from this envelope "leaves to"
       * when L1 routing is armed.
       */
      destinationAccountId: string | null
      /**
       * Hard cap behavior: 0 = soft warning, 1 = hard block (D16 enforcement).
       */
      enforceHardCap: boolean
      /**
       * Sort order in lists.
       */
      sortOrder: number
      isArchived: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["envelope"]>
    composites: {}
  }

  type EnvelopeGetPayload<S extends boolean | null | undefined | EnvelopeDefaultArgs> = $Result.GetResult<Prisma.$EnvelopePayload, S>

  type EnvelopeCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<EnvelopeFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: EnvelopeCountAggregateInputType | true
    }

  export interface EnvelopeDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Envelope'], meta: { name: 'Envelope' } }
    /**
     * Find zero or one Envelope that matches the filter.
     * @param {EnvelopeFindUniqueArgs} args - Arguments to find a Envelope
     * @example
     * // Get one Envelope
     * const envelope = await prisma.envelope.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends EnvelopeFindUniqueArgs>(args: SelectSubset<T, EnvelopeFindUniqueArgs<ExtArgs>>): Prisma__EnvelopeClient<$Result.GetResult<Prisma.$EnvelopePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Envelope that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {EnvelopeFindUniqueOrThrowArgs} args - Arguments to find a Envelope
     * @example
     * // Get one Envelope
     * const envelope = await prisma.envelope.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends EnvelopeFindUniqueOrThrowArgs>(args: SelectSubset<T, EnvelopeFindUniqueOrThrowArgs<ExtArgs>>): Prisma__EnvelopeClient<$Result.GetResult<Prisma.$EnvelopePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Envelope that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EnvelopeFindFirstArgs} args - Arguments to find a Envelope
     * @example
     * // Get one Envelope
     * const envelope = await prisma.envelope.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends EnvelopeFindFirstArgs>(args?: SelectSubset<T, EnvelopeFindFirstArgs<ExtArgs>>): Prisma__EnvelopeClient<$Result.GetResult<Prisma.$EnvelopePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Envelope that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EnvelopeFindFirstOrThrowArgs} args - Arguments to find a Envelope
     * @example
     * // Get one Envelope
     * const envelope = await prisma.envelope.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends EnvelopeFindFirstOrThrowArgs>(args?: SelectSubset<T, EnvelopeFindFirstOrThrowArgs<ExtArgs>>): Prisma__EnvelopeClient<$Result.GetResult<Prisma.$EnvelopePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Envelopes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EnvelopeFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Envelopes
     * const envelopes = await prisma.envelope.findMany()
     * 
     * // Get first 10 Envelopes
     * const envelopes = await prisma.envelope.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const envelopeWithIdOnly = await prisma.envelope.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends EnvelopeFindManyArgs>(args?: SelectSubset<T, EnvelopeFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EnvelopePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Envelope.
     * @param {EnvelopeCreateArgs} args - Arguments to create a Envelope.
     * @example
     * // Create one Envelope
     * const Envelope = await prisma.envelope.create({
     *   data: {
     *     // ... data to create a Envelope
     *   }
     * })
     * 
     */
    create<T extends EnvelopeCreateArgs>(args: SelectSubset<T, EnvelopeCreateArgs<ExtArgs>>): Prisma__EnvelopeClient<$Result.GetResult<Prisma.$EnvelopePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Envelopes.
     * @param {EnvelopeCreateManyArgs} args - Arguments to create many Envelopes.
     * @example
     * // Create many Envelopes
     * const envelope = await prisma.envelope.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends EnvelopeCreateManyArgs>(args?: SelectSubset<T, EnvelopeCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Envelopes and returns the data saved in the database.
     * @param {EnvelopeCreateManyAndReturnArgs} args - Arguments to create many Envelopes.
     * @example
     * // Create many Envelopes
     * const envelope = await prisma.envelope.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Envelopes and only return the `id`
     * const envelopeWithIdOnly = await prisma.envelope.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends EnvelopeCreateManyAndReturnArgs>(args?: SelectSubset<T, EnvelopeCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EnvelopePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Envelope.
     * @param {EnvelopeDeleteArgs} args - Arguments to delete one Envelope.
     * @example
     * // Delete one Envelope
     * const Envelope = await prisma.envelope.delete({
     *   where: {
     *     // ... filter to delete one Envelope
     *   }
     * })
     * 
     */
    delete<T extends EnvelopeDeleteArgs>(args: SelectSubset<T, EnvelopeDeleteArgs<ExtArgs>>): Prisma__EnvelopeClient<$Result.GetResult<Prisma.$EnvelopePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Envelope.
     * @param {EnvelopeUpdateArgs} args - Arguments to update one Envelope.
     * @example
     * // Update one Envelope
     * const envelope = await prisma.envelope.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends EnvelopeUpdateArgs>(args: SelectSubset<T, EnvelopeUpdateArgs<ExtArgs>>): Prisma__EnvelopeClient<$Result.GetResult<Prisma.$EnvelopePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Envelopes.
     * @param {EnvelopeDeleteManyArgs} args - Arguments to filter Envelopes to delete.
     * @example
     * // Delete a few Envelopes
     * const { count } = await prisma.envelope.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends EnvelopeDeleteManyArgs>(args?: SelectSubset<T, EnvelopeDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Envelopes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EnvelopeUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Envelopes
     * const envelope = await prisma.envelope.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends EnvelopeUpdateManyArgs>(args: SelectSubset<T, EnvelopeUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Envelopes and returns the data updated in the database.
     * @param {EnvelopeUpdateManyAndReturnArgs} args - Arguments to update many Envelopes.
     * @example
     * // Update many Envelopes
     * const envelope = await prisma.envelope.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Envelopes and only return the `id`
     * const envelopeWithIdOnly = await prisma.envelope.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends EnvelopeUpdateManyAndReturnArgs>(args: SelectSubset<T, EnvelopeUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EnvelopePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Envelope.
     * @param {EnvelopeUpsertArgs} args - Arguments to update or create a Envelope.
     * @example
     * // Update or create a Envelope
     * const envelope = await prisma.envelope.upsert({
     *   create: {
     *     // ... data to create a Envelope
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Envelope we want to update
     *   }
     * })
     */
    upsert<T extends EnvelopeUpsertArgs>(args: SelectSubset<T, EnvelopeUpsertArgs<ExtArgs>>): Prisma__EnvelopeClient<$Result.GetResult<Prisma.$EnvelopePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Envelopes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EnvelopeCountArgs} args - Arguments to filter Envelopes to count.
     * @example
     * // Count the number of Envelopes
     * const count = await prisma.envelope.count({
     *   where: {
     *     // ... the filter for the Envelopes we want to count
     *   }
     * })
    **/
    count<T extends EnvelopeCountArgs>(
      args?: Subset<T, EnvelopeCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EnvelopeCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Envelope.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EnvelopeAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EnvelopeAggregateArgs>(args: Subset<T, EnvelopeAggregateArgs>): Prisma.PrismaPromise<GetEnvelopeAggregateType<T>>

    /**
     * Group by Envelope.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EnvelopeGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends EnvelopeGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: EnvelopeGroupByArgs['orderBy'] }
        : { orderBy?: EnvelopeGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, EnvelopeGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEnvelopeGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Envelope model
   */
  readonly fields: EnvelopeFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Envelope.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__EnvelopeClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    transactions<T extends Envelope$transactionsArgs<ExtArgs> = {}>(args?: Subset<T, Envelope$transactionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    allocationRules<T extends Envelope$allocationRulesArgs<ExtArgs> = {}>(args?: Subset<T, Envelope$allocationRulesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AllocationRulePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Envelope model
   */
  interface EnvelopeFieldRefs {
    readonly id: FieldRef<"Envelope", 'String'>
    readonly userId: FieldRef<"Envelope", 'String'>
    readonly name: FieldRef<"Envelope", 'String'>
    readonly targetBalance: FieldRef<"Envelope", 'Int'>
    readonly currentBalance: FieldRef<"Envelope", 'Int'>
    readonly planet: FieldRef<"Envelope", 'String'>
    readonly color: FieldRef<"Envelope", 'String'>
    readonly icon: FieldRef<"Envelope", 'String'>
    readonly destinationAccountId: FieldRef<"Envelope", 'String'>
    readonly enforceHardCap: FieldRef<"Envelope", 'Boolean'>
    readonly sortOrder: FieldRef<"Envelope", 'Int'>
    readonly isArchived: FieldRef<"Envelope", 'Boolean'>
    readonly createdAt: FieldRef<"Envelope", 'DateTime'>
    readonly updatedAt: FieldRef<"Envelope", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Envelope findUnique
   */
  export type EnvelopeFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Envelope
     */
    select?: EnvelopeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Envelope
     */
    omit?: EnvelopeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnvelopeInclude<ExtArgs> | null
    /**
     * Filter, which Envelope to fetch.
     */
    where: EnvelopeWhereUniqueInput
  }

  /**
   * Envelope findUniqueOrThrow
   */
  export type EnvelopeFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Envelope
     */
    select?: EnvelopeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Envelope
     */
    omit?: EnvelopeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnvelopeInclude<ExtArgs> | null
    /**
     * Filter, which Envelope to fetch.
     */
    where: EnvelopeWhereUniqueInput
  }

  /**
   * Envelope findFirst
   */
  export type EnvelopeFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Envelope
     */
    select?: EnvelopeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Envelope
     */
    omit?: EnvelopeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnvelopeInclude<ExtArgs> | null
    /**
     * Filter, which Envelope to fetch.
     */
    where?: EnvelopeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Envelopes to fetch.
     */
    orderBy?: EnvelopeOrderByWithRelationInput | EnvelopeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Envelopes.
     */
    cursor?: EnvelopeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Envelopes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Envelopes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Envelopes.
     */
    distinct?: EnvelopeScalarFieldEnum | EnvelopeScalarFieldEnum[]
  }

  /**
   * Envelope findFirstOrThrow
   */
  export type EnvelopeFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Envelope
     */
    select?: EnvelopeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Envelope
     */
    omit?: EnvelopeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnvelopeInclude<ExtArgs> | null
    /**
     * Filter, which Envelope to fetch.
     */
    where?: EnvelopeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Envelopes to fetch.
     */
    orderBy?: EnvelopeOrderByWithRelationInput | EnvelopeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Envelopes.
     */
    cursor?: EnvelopeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Envelopes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Envelopes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Envelopes.
     */
    distinct?: EnvelopeScalarFieldEnum | EnvelopeScalarFieldEnum[]
  }

  /**
   * Envelope findMany
   */
  export type EnvelopeFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Envelope
     */
    select?: EnvelopeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Envelope
     */
    omit?: EnvelopeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnvelopeInclude<ExtArgs> | null
    /**
     * Filter, which Envelopes to fetch.
     */
    where?: EnvelopeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Envelopes to fetch.
     */
    orderBy?: EnvelopeOrderByWithRelationInput | EnvelopeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Envelopes.
     */
    cursor?: EnvelopeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Envelopes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Envelopes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Envelopes.
     */
    distinct?: EnvelopeScalarFieldEnum | EnvelopeScalarFieldEnum[]
  }

  /**
   * Envelope create
   */
  export type EnvelopeCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Envelope
     */
    select?: EnvelopeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Envelope
     */
    omit?: EnvelopeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnvelopeInclude<ExtArgs> | null
    /**
     * The data needed to create a Envelope.
     */
    data: XOR<EnvelopeCreateInput, EnvelopeUncheckedCreateInput>
  }

  /**
   * Envelope createMany
   */
  export type EnvelopeCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Envelopes.
     */
    data: EnvelopeCreateManyInput | EnvelopeCreateManyInput[]
  }

  /**
   * Envelope createManyAndReturn
   */
  export type EnvelopeCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Envelope
     */
    select?: EnvelopeSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Envelope
     */
    omit?: EnvelopeOmit<ExtArgs> | null
    /**
     * The data used to create many Envelopes.
     */
    data: EnvelopeCreateManyInput | EnvelopeCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnvelopeIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Envelope update
   */
  export type EnvelopeUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Envelope
     */
    select?: EnvelopeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Envelope
     */
    omit?: EnvelopeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnvelopeInclude<ExtArgs> | null
    /**
     * The data needed to update a Envelope.
     */
    data: XOR<EnvelopeUpdateInput, EnvelopeUncheckedUpdateInput>
    /**
     * Choose, which Envelope to update.
     */
    where: EnvelopeWhereUniqueInput
  }

  /**
   * Envelope updateMany
   */
  export type EnvelopeUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Envelopes.
     */
    data: XOR<EnvelopeUpdateManyMutationInput, EnvelopeUncheckedUpdateManyInput>
    /**
     * Filter which Envelopes to update
     */
    where?: EnvelopeWhereInput
    /**
     * Limit how many Envelopes to update.
     */
    limit?: number
  }

  /**
   * Envelope updateManyAndReturn
   */
  export type EnvelopeUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Envelope
     */
    select?: EnvelopeSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Envelope
     */
    omit?: EnvelopeOmit<ExtArgs> | null
    /**
     * The data used to update Envelopes.
     */
    data: XOR<EnvelopeUpdateManyMutationInput, EnvelopeUncheckedUpdateManyInput>
    /**
     * Filter which Envelopes to update
     */
    where?: EnvelopeWhereInput
    /**
     * Limit how many Envelopes to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnvelopeIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Envelope upsert
   */
  export type EnvelopeUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Envelope
     */
    select?: EnvelopeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Envelope
     */
    omit?: EnvelopeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnvelopeInclude<ExtArgs> | null
    /**
     * The filter to search for the Envelope to update in case it exists.
     */
    where: EnvelopeWhereUniqueInput
    /**
     * In case the Envelope found by the `where` argument doesn't exist, create a new Envelope with this data.
     */
    create: XOR<EnvelopeCreateInput, EnvelopeUncheckedCreateInput>
    /**
     * In case the Envelope was found with the provided `where` argument, update it with this data.
     */
    update: XOR<EnvelopeUpdateInput, EnvelopeUncheckedUpdateInput>
  }

  /**
   * Envelope delete
   */
  export type EnvelopeDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Envelope
     */
    select?: EnvelopeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Envelope
     */
    omit?: EnvelopeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnvelopeInclude<ExtArgs> | null
    /**
     * Filter which Envelope to delete.
     */
    where: EnvelopeWhereUniqueInput
  }

  /**
   * Envelope deleteMany
   */
  export type EnvelopeDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Envelopes to delete
     */
    where?: EnvelopeWhereInput
    /**
     * Limit how many Envelopes to delete.
     */
    limit?: number
  }

  /**
   * Envelope.transactions
   */
  export type Envelope$transactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    cursor?: TransactionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Envelope.allocationRules
   */
  export type Envelope$allocationRulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationRule
     */
    select?: AllocationRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationRule
     */
    omit?: AllocationRuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationRuleInclude<ExtArgs> | null
    where?: AllocationRuleWhereInput
    orderBy?: AllocationRuleOrderByWithRelationInput | AllocationRuleOrderByWithRelationInput[]
    cursor?: AllocationRuleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AllocationRuleScalarFieldEnum | AllocationRuleScalarFieldEnum[]
  }

  /**
   * Envelope without action
   */
  export type EnvelopeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Envelope
     */
    select?: EnvelopeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Envelope
     */
    omit?: EnvelopeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnvelopeInclude<ExtArgs> | null
  }


  /**
   * Model Transaction
   */

  export type AggregateTransaction = {
    _count: TransactionCountAggregateOutputType | null
    _avg: TransactionAvgAggregateOutputType | null
    _sum: TransactionSumAggregateOutputType | null
    _min: TransactionMinAggregateOutputType | null
    _max: TransactionMaxAggregateOutputType | null
  }

  export type TransactionAvgAggregateOutputType = {
    amount: number | null
  }

  export type TransactionSumAggregateOutputType = {
    amount: number | null
  }

  export type TransactionMinAggregateOutputType = {
    id: string | null
    userId: string | null
    accountId: string | null
    envelopeId: string | null
    amount: number | null
    date: Date | null
    payee: string | null
    notes: string | null
    source: string | null
    metadata: string | null
    isPrimaMateria: boolean | null
    fromPlanId: string | null
    fromPaycheckId: string | null
    cleared: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TransactionMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    accountId: string | null
    envelopeId: string | null
    amount: number | null
    date: Date | null
    payee: string | null
    notes: string | null
    source: string | null
    metadata: string | null
    isPrimaMateria: boolean | null
    fromPlanId: string | null
    fromPaycheckId: string | null
    cleared: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TransactionCountAggregateOutputType = {
    id: number
    userId: number
    accountId: number
    envelopeId: number
    amount: number
    date: number
    payee: number
    notes: number
    source: number
    metadata: number
    isPrimaMateria: number
    fromPlanId: number
    fromPaycheckId: number
    cleared: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TransactionAvgAggregateInputType = {
    amount?: true
  }

  export type TransactionSumAggregateInputType = {
    amount?: true
  }

  export type TransactionMinAggregateInputType = {
    id?: true
    userId?: true
    accountId?: true
    envelopeId?: true
    amount?: true
    date?: true
    payee?: true
    notes?: true
    source?: true
    metadata?: true
    isPrimaMateria?: true
    fromPlanId?: true
    fromPaycheckId?: true
    cleared?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TransactionMaxAggregateInputType = {
    id?: true
    userId?: true
    accountId?: true
    envelopeId?: true
    amount?: true
    date?: true
    payee?: true
    notes?: true
    source?: true
    metadata?: true
    isPrimaMateria?: true
    fromPlanId?: true
    fromPaycheckId?: true
    cleared?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TransactionCountAggregateInputType = {
    id?: true
    userId?: true
    accountId?: true
    envelopeId?: true
    amount?: true
    date?: true
    payee?: true
    notes?: true
    source?: true
    metadata?: true
    isPrimaMateria?: true
    fromPlanId?: true
    fromPaycheckId?: true
    cleared?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TransactionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Transaction to aggregate.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Transactions
    **/
    _count?: true | TransactionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TransactionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TransactionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TransactionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TransactionMaxAggregateInputType
  }

  export type GetTransactionAggregateType<T extends TransactionAggregateArgs> = {
        [P in keyof T & keyof AggregateTransaction]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTransaction[P]>
      : GetScalarType<T[P], AggregateTransaction[P]>
  }




  export type TransactionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithAggregationInput | TransactionOrderByWithAggregationInput[]
    by: TransactionScalarFieldEnum[] | TransactionScalarFieldEnum
    having?: TransactionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TransactionCountAggregateInputType | true
    _avg?: TransactionAvgAggregateInputType
    _sum?: TransactionSumAggregateInputType
    _min?: TransactionMinAggregateInputType
    _max?: TransactionMaxAggregateInputType
  }

  export type TransactionGroupByOutputType = {
    id: string
    userId: string
    accountId: string
    envelopeId: string | null
    amount: number
    date: Date
    payee: string
    notes: string | null
    source: string
    metadata: string
    isPrimaMateria: boolean
    fromPlanId: string | null
    fromPaycheckId: string | null
    cleared: boolean
    createdAt: Date
    updatedAt: Date
    _count: TransactionCountAggregateOutputType | null
    _avg: TransactionAvgAggregateOutputType | null
    _sum: TransactionSumAggregateOutputType | null
    _min: TransactionMinAggregateOutputType | null
    _max: TransactionMaxAggregateOutputType | null
  }

  type GetTransactionGroupByPayload<T extends TransactionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TransactionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TransactionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TransactionGroupByOutputType[P]>
            : GetScalarType<T[P], TransactionGroupByOutputType[P]>
        }
      >
    >


  export type TransactionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    accountId?: boolean
    envelopeId?: boolean
    amount?: boolean
    date?: boolean
    payee?: boolean
    notes?: boolean
    source?: boolean
    metadata?: boolean
    isPrimaMateria?: boolean
    fromPlanId?: boolean
    fromPaycheckId?: boolean
    cleared?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    account?: boolean | AccountDefaultArgs<ExtArgs>
    envelope?: boolean | Transaction$envelopeArgs<ExtArgs>
  }, ExtArgs["result"]["transaction"]>

  export type TransactionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    accountId?: boolean
    envelopeId?: boolean
    amount?: boolean
    date?: boolean
    payee?: boolean
    notes?: boolean
    source?: boolean
    metadata?: boolean
    isPrimaMateria?: boolean
    fromPlanId?: boolean
    fromPaycheckId?: boolean
    cleared?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    account?: boolean | AccountDefaultArgs<ExtArgs>
    envelope?: boolean | Transaction$envelopeArgs<ExtArgs>
  }, ExtArgs["result"]["transaction"]>

  export type TransactionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    accountId?: boolean
    envelopeId?: boolean
    amount?: boolean
    date?: boolean
    payee?: boolean
    notes?: boolean
    source?: boolean
    metadata?: boolean
    isPrimaMateria?: boolean
    fromPlanId?: boolean
    fromPaycheckId?: boolean
    cleared?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    account?: boolean | AccountDefaultArgs<ExtArgs>
    envelope?: boolean | Transaction$envelopeArgs<ExtArgs>
  }, ExtArgs["result"]["transaction"]>

  export type TransactionSelectScalar = {
    id?: boolean
    userId?: boolean
    accountId?: boolean
    envelopeId?: boolean
    amount?: boolean
    date?: boolean
    payee?: boolean
    notes?: boolean
    source?: boolean
    metadata?: boolean
    isPrimaMateria?: boolean
    fromPlanId?: boolean
    fromPaycheckId?: boolean
    cleared?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TransactionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "accountId" | "envelopeId" | "amount" | "date" | "payee" | "notes" | "source" | "metadata" | "isPrimaMateria" | "fromPlanId" | "fromPaycheckId" | "cleared" | "createdAt" | "updatedAt", ExtArgs["result"]["transaction"]>
  export type TransactionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    account?: boolean | AccountDefaultArgs<ExtArgs>
    envelope?: boolean | Transaction$envelopeArgs<ExtArgs>
  }
  export type TransactionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    account?: boolean | AccountDefaultArgs<ExtArgs>
    envelope?: boolean | Transaction$envelopeArgs<ExtArgs>
  }
  export type TransactionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    account?: boolean | AccountDefaultArgs<ExtArgs>
    envelope?: boolean | Transaction$envelopeArgs<ExtArgs>
  }

  export type $TransactionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Transaction"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      account: Prisma.$AccountPayload<ExtArgs>
      envelope: Prisma.$EnvelopePayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      accountId: string
      /**
       * Nullable — uncategorized transactions (e.g. imported before categorization).
       */
      envelopeId: string | null
      /**
       * Signed: +income, -expense, in cents.
       */
      amount: number
      date: Date
      payee: string
      notes: string | null
      /**
       * manual | csv | recurring | ai_suggested | routing
       */
      source: string
      /**
       * Free-form JSON metadata (e.g. AI categorization suggestions, recurring rule id).
       */
      metadata: string
      /**
       * True if this transaction is a paycheck that should trigger auto-allocate.
       */
      isPrimaMateria: boolean
      /**
       * Set by the auto-allocate engine to indicate which plan produced this row.
       */
      fromPlanId: string | null
      /**
       * Set by the auto-allocate engine to indicate the paycheck row that produced this row.
       */
      fromPaycheckId: string | null
      cleared: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["transaction"]>
    composites: {}
  }

  type TransactionGetPayload<S extends boolean | null | undefined | TransactionDefaultArgs> = $Result.GetResult<Prisma.$TransactionPayload, S>

  type TransactionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TransactionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TransactionCountAggregateInputType | true
    }

  export interface TransactionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Transaction'], meta: { name: 'Transaction' } }
    /**
     * Find zero or one Transaction that matches the filter.
     * @param {TransactionFindUniqueArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TransactionFindUniqueArgs>(args: SelectSubset<T, TransactionFindUniqueArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Transaction that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TransactionFindUniqueOrThrowArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TransactionFindUniqueOrThrowArgs>(args: SelectSubset<T, TransactionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Transaction that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionFindFirstArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TransactionFindFirstArgs>(args?: SelectSubset<T, TransactionFindFirstArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Transaction that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionFindFirstOrThrowArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TransactionFindFirstOrThrowArgs>(args?: SelectSubset<T, TransactionFindFirstOrThrowArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Transactions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Transactions
     * const transactions = await prisma.transaction.findMany()
     * 
     * // Get first 10 Transactions
     * const transactions = await prisma.transaction.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const transactionWithIdOnly = await prisma.transaction.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TransactionFindManyArgs>(args?: SelectSubset<T, TransactionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Transaction.
     * @param {TransactionCreateArgs} args - Arguments to create a Transaction.
     * @example
     * // Create one Transaction
     * const Transaction = await prisma.transaction.create({
     *   data: {
     *     // ... data to create a Transaction
     *   }
     * })
     * 
     */
    create<T extends TransactionCreateArgs>(args: SelectSubset<T, TransactionCreateArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Transactions.
     * @param {TransactionCreateManyArgs} args - Arguments to create many Transactions.
     * @example
     * // Create many Transactions
     * const transaction = await prisma.transaction.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TransactionCreateManyArgs>(args?: SelectSubset<T, TransactionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Transactions and returns the data saved in the database.
     * @param {TransactionCreateManyAndReturnArgs} args - Arguments to create many Transactions.
     * @example
     * // Create many Transactions
     * const transaction = await prisma.transaction.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Transactions and only return the `id`
     * const transactionWithIdOnly = await prisma.transaction.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TransactionCreateManyAndReturnArgs>(args?: SelectSubset<T, TransactionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Transaction.
     * @param {TransactionDeleteArgs} args - Arguments to delete one Transaction.
     * @example
     * // Delete one Transaction
     * const Transaction = await prisma.transaction.delete({
     *   where: {
     *     // ... filter to delete one Transaction
     *   }
     * })
     * 
     */
    delete<T extends TransactionDeleteArgs>(args: SelectSubset<T, TransactionDeleteArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Transaction.
     * @param {TransactionUpdateArgs} args - Arguments to update one Transaction.
     * @example
     * // Update one Transaction
     * const transaction = await prisma.transaction.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TransactionUpdateArgs>(args: SelectSubset<T, TransactionUpdateArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Transactions.
     * @param {TransactionDeleteManyArgs} args - Arguments to filter Transactions to delete.
     * @example
     * // Delete a few Transactions
     * const { count } = await prisma.transaction.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TransactionDeleteManyArgs>(args?: SelectSubset<T, TransactionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Transactions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Transactions
     * const transaction = await prisma.transaction.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TransactionUpdateManyArgs>(args: SelectSubset<T, TransactionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Transactions and returns the data updated in the database.
     * @param {TransactionUpdateManyAndReturnArgs} args - Arguments to update many Transactions.
     * @example
     * // Update many Transactions
     * const transaction = await prisma.transaction.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Transactions and only return the `id`
     * const transactionWithIdOnly = await prisma.transaction.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TransactionUpdateManyAndReturnArgs>(args: SelectSubset<T, TransactionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Transaction.
     * @param {TransactionUpsertArgs} args - Arguments to update or create a Transaction.
     * @example
     * // Update or create a Transaction
     * const transaction = await prisma.transaction.upsert({
     *   create: {
     *     // ... data to create a Transaction
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Transaction we want to update
     *   }
     * })
     */
    upsert<T extends TransactionUpsertArgs>(args: SelectSubset<T, TransactionUpsertArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Transactions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionCountArgs} args - Arguments to filter Transactions to count.
     * @example
     * // Count the number of Transactions
     * const count = await prisma.transaction.count({
     *   where: {
     *     // ... the filter for the Transactions we want to count
     *   }
     * })
    **/
    count<T extends TransactionCountArgs>(
      args?: Subset<T, TransactionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TransactionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Transaction.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TransactionAggregateArgs>(args: Subset<T, TransactionAggregateArgs>): Prisma.PrismaPromise<GetTransactionAggregateType<T>>

    /**
     * Group by Transaction.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TransactionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TransactionGroupByArgs['orderBy'] }
        : { orderBy?: TransactionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TransactionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTransactionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Transaction model
   */
  readonly fields: TransactionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Transaction.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TransactionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    account<T extends AccountDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AccountDefaultArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    envelope<T extends Transaction$envelopeArgs<ExtArgs> = {}>(args?: Subset<T, Transaction$envelopeArgs<ExtArgs>>): Prisma__EnvelopeClient<$Result.GetResult<Prisma.$EnvelopePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Transaction model
   */
  interface TransactionFieldRefs {
    readonly id: FieldRef<"Transaction", 'String'>
    readonly userId: FieldRef<"Transaction", 'String'>
    readonly accountId: FieldRef<"Transaction", 'String'>
    readonly envelopeId: FieldRef<"Transaction", 'String'>
    readonly amount: FieldRef<"Transaction", 'Int'>
    readonly date: FieldRef<"Transaction", 'DateTime'>
    readonly payee: FieldRef<"Transaction", 'String'>
    readonly notes: FieldRef<"Transaction", 'String'>
    readonly source: FieldRef<"Transaction", 'String'>
    readonly metadata: FieldRef<"Transaction", 'String'>
    readonly isPrimaMateria: FieldRef<"Transaction", 'Boolean'>
    readonly fromPlanId: FieldRef<"Transaction", 'String'>
    readonly fromPaycheckId: FieldRef<"Transaction", 'String'>
    readonly cleared: FieldRef<"Transaction", 'Boolean'>
    readonly createdAt: FieldRef<"Transaction", 'DateTime'>
    readonly updatedAt: FieldRef<"Transaction", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Transaction findUnique
   */
  export type TransactionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction findUniqueOrThrow
   */
  export type TransactionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction findFirst
   */
  export type TransactionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Transactions.
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transactions.
     */
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Transaction findFirstOrThrow
   */
  export type TransactionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Transactions.
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transactions.
     */
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Transaction findMany
   */
  export type TransactionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transactions to fetch.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Transactions.
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transactions.
     */
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Transaction create
   */
  export type TransactionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * The data needed to create a Transaction.
     */
    data: XOR<TransactionCreateInput, TransactionUncheckedCreateInput>
  }

  /**
   * Transaction createMany
   */
  export type TransactionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Transactions.
     */
    data: TransactionCreateManyInput | TransactionCreateManyInput[]
  }

  /**
   * Transaction createManyAndReturn
   */
  export type TransactionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * The data used to create many Transactions.
     */
    data: TransactionCreateManyInput | TransactionCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Transaction update
   */
  export type TransactionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * The data needed to update a Transaction.
     */
    data: XOR<TransactionUpdateInput, TransactionUncheckedUpdateInput>
    /**
     * Choose, which Transaction to update.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction updateMany
   */
  export type TransactionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Transactions.
     */
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyInput>
    /**
     * Filter which Transactions to update
     */
    where?: TransactionWhereInput
    /**
     * Limit how many Transactions to update.
     */
    limit?: number
  }

  /**
   * Transaction updateManyAndReturn
   */
  export type TransactionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * The data used to update Transactions.
     */
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyInput>
    /**
     * Filter which Transactions to update
     */
    where?: TransactionWhereInput
    /**
     * Limit how many Transactions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Transaction upsert
   */
  export type TransactionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * The filter to search for the Transaction to update in case it exists.
     */
    where: TransactionWhereUniqueInput
    /**
     * In case the Transaction found by the `where` argument doesn't exist, create a new Transaction with this data.
     */
    create: XOR<TransactionCreateInput, TransactionUncheckedCreateInput>
    /**
     * In case the Transaction was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TransactionUpdateInput, TransactionUncheckedUpdateInput>
  }

  /**
   * Transaction delete
   */
  export type TransactionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter which Transaction to delete.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction deleteMany
   */
  export type TransactionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Transactions to delete
     */
    where?: TransactionWhereInput
    /**
     * Limit how many Transactions to delete.
     */
    limit?: number
  }

  /**
   * Transaction.envelope
   */
  export type Transaction$envelopeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Envelope
     */
    select?: EnvelopeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Envelope
     */
    omit?: EnvelopeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnvelopeInclude<ExtArgs> | null
    where?: EnvelopeWhereInput
  }

  /**
   * Transaction without action
   */
  export type TransactionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
  }


  /**
   * Model PaySchedule
   */

  export type AggregatePaySchedule = {
    _count: PayScheduleCountAggregateOutputType | null
    _avg: PayScheduleAvgAggregateOutputType | null
    _sum: PayScheduleSumAggregateOutputType | null
    _min: PayScheduleMinAggregateOutputType | null
    _max: PayScheduleMaxAggregateOutputType | null
  }

  export type PayScheduleAvgAggregateOutputType = {
    amount: number | null
  }

  export type PayScheduleSumAggregateOutputType = {
    amount: number | null
  }

  export type PayScheduleMinAggregateOutputType = {
    id: string | null
    userId: string | null
    cadence: string | null
    amount: number | null
    accountId: string | null
    startDate: Date | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PayScheduleMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    cadence: string | null
    amount: number | null
    accountId: string | null
    startDate: Date | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PayScheduleCountAggregateOutputType = {
    id: number
    userId: number
    cadence: number
    amount: number
    accountId: number
    startDate: number
    isActive: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type PayScheduleAvgAggregateInputType = {
    amount?: true
  }

  export type PayScheduleSumAggregateInputType = {
    amount?: true
  }

  export type PayScheduleMinAggregateInputType = {
    id?: true
    userId?: true
    cadence?: true
    amount?: true
    accountId?: true
    startDate?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PayScheduleMaxAggregateInputType = {
    id?: true
    userId?: true
    cadence?: true
    amount?: true
    accountId?: true
    startDate?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PayScheduleCountAggregateInputType = {
    id?: true
    userId?: true
    cadence?: true
    amount?: true
    accountId?: true
    startDate?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type PayScheduleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PaySchedule to aggregate.
     */
    where?: PayScheduleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaySchedules to fetch.
     */
    orderBy?: PayScheduleOrderByWithRelationInput | PayScheduleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PayScheduleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaySchedules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaySchedules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PaySchedules
    **/
    _count?: true | PayScheduleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PayScheduleAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PayScheduleSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PayScheduleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PayScheduleMaxAggregateInputType
  }

  export type GetPayScheduleAggregateType<T extends PayScheduleAggregateArgs> = {
        [P in keyof T & keyof AggregatePaySchedule]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePaySchedule[P]>
      : GetScalarType<T[P], AggregatePaySchedule[P]>
  }




  export type PayScheduleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PayScheduleWhereInput
    orderBy?: PayScheduleOrderByWithAggregationInput | PayScheduleOrderByWithAggregationInput[]
    by: PayScheduleScalarFieldEnum[] | PayScheduleScalarFieldEnum
    having?: PayScheduleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PayScheduleCountAggregateInputType | true
    _avg?: PayScheduleAvgAggregateInputType
    _sum?: PayScheduleSumAggregateInputType
    _min?: PayScheduleMinAggregateInputType
    _max?: PayScheduleMaxAggregateInputType
  }

  export type PayScheduleGroupByOutputType = {
    id: string
    userId: string
    cadence: string
    amount: number
    accountId: string
    startDate: Date
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    _count: PayScheduleCountAggregateOutputType | null
    _avg: PayScheduleAvgAggregateOutputType | null
    _sum: PayScheduleSumAggregateOutputType | null
    _min: PayScheduleMinAggregateOutputType | null
    _max: PayScheduleMaxAggregateOutputType | null
  }

  type GetPayScheduleGroupByPayload<T extends PayScheduleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PayScheduleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PayScheduleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PayScheduleGroupByOutputType[P]>
            : GetScalarType<T[P], PayScheduleGroupByOutputType[P]>
        }
      >
    >


  export type PayScheduleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    cadence?: boolean
    amount?: boolean
    accountId?: boolean
    startDate?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    account?: boolean | AccountDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["paySchedule"]>

  export type PayScheduleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    cadence?: boolean
    amount?: boolean
    accountId?: boolean
    startDate?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    account?: boolean | AccountDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["paySchedule"]>

  export type PayScheduleSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    cadence?: boolean
    amount?: boolean
    accountId?: boolean
    startDate?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    account?: boolean | AccountDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["paySchedule"]>

  export type PayScheduleSelectScalar = {
    id?: boolean
    userId?: boolean
    cadence?: boolean
    amount?: boolean
    accountId?: boolean
    startDate?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type PayScheduleOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "cadence" | "amount" | "accountId" | "startDate" | "isActive" | "createdAt" | "updatedAt", ExtArgs["result"]["paySchedule"]>
  export type PayScheduleInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    account?: boolean | AccountDefaultArgs<ExtArgs>
  }
  export type PayScheduleIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    account?: boolean | AccountDefaultArgs<ExtArgs>
  }
  export type PayScheduleIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    account?: boolean | AccountDefaultArgs<ExtArgs>
  }

  export type $PaySchedulePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PaySchedule"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      account: Prisma.$AccountPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      /**
       * weekly | biweekly | semi_monthly | monthly
       */
      cadence: string
      /**
       * Default paycheck amount in cents.
       */
      amount: number
      /**
       * Account paychecks land in.
       */
      accountId: string
      /**
       * Anchor date — usually the first known paycheck.
       */
      startDate: Date
      isActive: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["paySchedule"]>
    composites: {}
  }

  type PayScheduleGetPayload<S extends boolean | null | undefined | PayScheduleDefaultArgs> = $Result.GetResult<Prisma.$PaySchedulePayload, S>

  type PayScheduleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PayScheduleFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PayScheduleCountAggregateInputType | true
    }

  export interface PayScheduleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PaySchedule'], meta: { name: 'PaySchedule' } }
    /**
     * Find zero or one PaySchedule that matches the filter.
     * @param {PayScheduleFindUniqueArgs} args - Arguments to find a PaySchedule
     * @example
     * // Get one PaySchedule
     * const paySchedule = await prisma.paySchedule.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PayScheduleFindUniqueArgs>(args: SelectSubset<T, PayScheduleFindUniqueArgs<ExtArgs>>): Prisma__PayScheduleClient<$Result.GetResult<Prisma.$PaySchedulePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one PaySchedule that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PayScheduleFindUniqueOrThrowArgs} args - Arguments to find a PaySchedule
     * @example
     * // Get one PaySchedule
     * const paySchedule = await prisma.paySchedule.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PayScheduleFindUniqueOrThrowArgs>(args: SelectSubset<T, PayScheduleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PayScheduleClient<$Result.GetResult<Prisma.$PaySchedulePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PaySchedule that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PayScheduleFindFirstArgs} args - Arguments to find a PaySchedule
     * @example
     * // Get one PaySchedule
     * const paySchedule = await prisma.paySchedule.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PayScheduleFindFirstArgs>(args?: SelectSubset<T, PayScheduleFindFirstArgs<ExtArgs>>): Prisma__PayScheduleClient<$Result.GetResult<Prisma.$PaySchedulePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PaySchedule that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PayScheduleFindFirstOrThrowArgs} args - Arguments to find a PaySchedule
     * @example
     * // Get one PaySchedule
     * const paySchedule = await prisma.paySchedule.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PayScheduleFindFirstOrThrowArgs>(args?: SelectSubset<T, PayScheduleFindFirstOrThrowArgs<ExtArgs>>): Prisma__PayScheduleClient<$Result.GetResult<Prisma.$PaySchedulePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more PaySchedules that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PayScheduleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PaySchedules
     * const paySchedules = await prisma.paySchedule.findMany()
     * 
     * // Get first 10 PaySchedules
     * const paySchedules = await prisma.paySchedule.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const payScheduleWithIdOnly = await prisma.paySchedule.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PayScheduleFindManyArgs>(args?: SelectSubset<T, PayScheduleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaySchedulePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a PaySchedule.
     * @param {PayScheduleCreateArgs} args - Arguments to create a PaySchedule.
     * @example
     * // Create one PaySchedule
     * const PaySchedule = await prisma.paySchedule.create({
     *   data: {
     *     // ... data to create a PaySchedule
     *   }
     * })
     * 
     */
    create<T extends PayScheduleCreateArgs>(args: SelectSubset<T, PayScheduleCreateArgs<ExtArgs>>): Prisma__PayScheduleClient<$Result.GetResult<Prisma.$PaySchedulePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many PaySchedules.
     * @param {PayScheduleCreateManyArgs} args - Arguments to create many PaySchedules.
     * @example
     * // Create many PaySchedules
     * const paySchedule = await prisma.paySchedule.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PayScheduleCreateManyArgs>(args?: SelectSubset<T, PayScheduleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PaySchedules and returns the data saved in the database.
     * @param {PayScheduleCreateManyAndReturnArgs} args - Arguments to create many PaySchedules.
     * @example
     * // Create many PaySchedules
     * const paySchedule = await prisma.paySchedule.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PaySchedules and only return the `id`
     * const payScheduleWithIdOnly = await prisma.paySchedule.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PayScheduleCreateManyAndReturnArgs>(args?: SelectSubset<T, PayScheduleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaySchedulePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a PaySchedule.
     * @param {PayScheduleDeleteArgs} args - Arguments to delete one PaySchedule.
     * @example
     * // Delete one PaySchedule
     * const PaySchedule = await prisma.paySchedule.delete({
     *   where: {
     *     // ... filter to delete one PaySchedule
     *   }
     * })
     * 
     */
    delete<T extends PayScheduleDeleteArgs>(args: SelectSubset<T, PayScheduleDeleteArgs<ExtArgs>>): Prisma__PayScheduleClient<$Result.GetResult<Prisma.$PaySchedulePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one PaySchedule.
     * @param {PayScheduleUpdateArgs} args - Arguments to update one PaySchedule.
     * @example
     * // Update one PaySchedule
     * const paySchedule = await prisma.paySchedule.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PayScheduleUpdateArgs>(args: SelectSubset<T, PayScheduleUpdateArgs<ExtArgs>>): Prisma__PayScheduleClient<$Result.GetResult<Prisma.$PaySchedulePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more PaySchedules.
     * @param {PayScheduleDeleteManyArgs} args - Arguments to filter PaySchedules to delete.
     * @example
     * // Delete a few PaySchedules
     * const { count } = await prisma.paySchedule.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PayScheduleDeleteManyArgs>(args?: SelectSubset<T, PayScheduleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PaySchedules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PayScheduleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PaySchedules
     * const paySchedule = await prisma.paySchedule.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PayScheduleUpdateManyArgs>(args: SelectSubset<T, PayScheduleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PaySchedules and returns the data updated in the database.
     * @param {PayScheduleUpdateManyAndReturnArgs} args - Arguments to update many PaySchedules.
     * @example
     * // Update many PaySchedules
     * const paySchedule = await prisma.paySchedule.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more PaySchedules and only return the `id`
     * const payScheduleWithIdOnly = await prisma.paySchedule.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PayScheduleUpdateManyAndReturnArgs>(args: SelectSubset<T, PayScheduleUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaySchedulePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one PaySchedule.
     * @param {PayScheduleUpsertArgs} args - Arguments to update or create a PaySchedule.
     * @example
     * // Update or create a PaySchedule
     * const paySchedule = await prisma.paySchedule.upsert({
     *   create: {
     *     // ... data to create a PaySchedule
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PaySchedule we want to update
     *   }
     * })
     */
    upsert<T extends PayScheduleUpsertArgs>(args: SelectSubset<T, PayScheduleUpsertArgs<ExtArgs>>): Prisma__PayScheduleClient<$Result.GetResult<Prisma.$PaySchedulePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of PaySchedules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PayScheduleCountArgs} args - Arguments to filter PaySchedules to count.
     * @example
     * // Count the number of PaySchedules
     * const count = await prisma.paySchedule.count({
     *   where: {
     *     // ... the filter for the PaySchedules we want to count
     *   }
     * })
    **/
    count<T extends PayScheduleCountArgs>(
      args?: Subset<T, PayScheduleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PayScheduleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PaySchedule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PayScheduleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PayScheduleAggregateArgs>(args: Subset<T, PayScheduleAggregateArgs>): Prisma.PrismaPromise<GetPayScheduleAggregateType<T>>

    /**
     * Group by PaySchedule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PayScheduleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PayScheduleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PayScheduleGroupByArgs['orderBy'] }
        : { orderBy?: PayScheduleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PayScheduleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPayScheduleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PaySchedule model
   */
  readonly fields: PayScheduleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PaySchedule.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PayScheduleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    account<T extends AccountDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AccountDefaultArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PaySchedule model
   */
  interface PayScheduleFieldRefs {
    readonly id: FieldRef<"PaySchedule", 'String'>
    readonly userId: FieldRef<"PaySchedule", 'String'>
    readonly cadence: FieldRef<"PaySchedule", 'String'>
    readonly amount: FieldRef<"PaySchedule", 'Int'>
    readonly accountId: FieldRef<"PaySchedule", 'String'>
    readonly startDate: FieldRef<"PaySchedule", 'DateTime'>
    readonly isActive: FieldRef<"PaySchedule", 'Boolean'>
    readonly createdAt: FieldRef<"PaySchedule", 'DateTime'>
    readonly updatedAt: FieldRef<"PaySchedule", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * PaySchedule findUnique
   */
  export type PayScheduleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaySchedule
     */
    select?: PayScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaySchedule
     */
    omit?: PayScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayScheduleInclude<ExtArgs> | null
    /**
     * Filter, which PaySchedule to fetch.
     */
    where: PayScheduleWhereUniqueInput
  }

  /**
   * PaySchedule findUniqueOrThrow
   */
  export type PayScheduleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaySchedule
     */
    select?: PayScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaySchedule
     */
    omit?: PayScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayScheduleInclude<ExtArgs> | null
    /**
     * Filter, which PaySchedule to fetch.
     */
    where: PayScheduleWhereUniqueInput
  }

  /**
   * PaySchedule findFirst
   */
  export type PayScheduleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaySchedule
     */
    select?: PayScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaySchedule
     */
    omit?: PayScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayScheduleInclude<ExtArgs> | null
    /**
     * Filter, which PaySchedule to fetch.
     */
    where?: PayScheduleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaySchedules to fetch.
     */
    orderBy?: PayScheduleOrderByWithRelationInput | PayScheduleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PaySchedules.
     */
    cursor?: PayScheduleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaySchedules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaySchedules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PaySchedules.
     */
    distinct?: PayScheduleScalarFieldEnum | PayScheduleScalarFieldEnum[]
  }

  /**
   * PaySchedule findFirstOrThrow
   */
  export type PayScheduleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaySchedule
     */
    select?: PayScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaySchedule
     */
    omit?: PayScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayScheduleInclude<ExtArgs> | null
    /**
     * Filter, which PaySchedule to fetch.
     */
    where?: PayScheduleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaySchedules to fetch.
     */
    orderBy?: PayScheduleOrderByWithRelationInput | PayScheduleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PaySchedules.
     */
    cursor?: PayScheduleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaySchedules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaySchedules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PaySchedules.
     */
    distinct?: PayScheduleScalarFieldEnum | PayScheduleScalarFieldEnum[]
  }

  /**
   * PaySchedule findMany
   */
  export type PayScheduleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaySchedule
     */
    select?: PayScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaySchedule
     */
    omit?: PayScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayScheduleInclude<ExtArgs> | null
    /**
     * Filter, which PaySchedules to fetch.
     */
    where?: PayScheduleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaySchedules to fetch.
     */
    orderBy?: PayScheduleOrderByWithRelationInput | PayScheduleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PaySchedules.
     */
    cursor?: PayScheduleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaySchedules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaySchedules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PaySchedules.
     */
    distinct?: PayScheduleScalarFieldEnum | PayScheduleScalarFieldEnum[]
  }

  /**
   * PaySchedule create
   */
  export type PayScheduleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaySchedule
     */
    select?: PayScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaySchedule
     */
    omit?: PayScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayScheduleInclude<ExtArgs> | null
    /**
     * The data needed to create a PaySchedule.
     */
    data: XOR<PayScheduleCreateInput, PayScheduleUncheckedCreateInput>
  }

  /**
   * PaySchedule createMany
   */
  export type PayScheduleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PaySchedules.
     */
    data: PayScheduleCreateManyInput | PayScheduleCreateManyInput[]
  }

  /**
   * PaySchedule createManyAndReturn
   */
  export type PayScheduleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaySchedule
     */
    select?: PayScheduleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PaySchedule
     */
    omit?: PayScheduleOmit<ExtArgs> | null
    /**
     * The data used to create many PaySchedules.
     */
    data: PayScheduleCreateManyInput | PayScheduleCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayScheduleIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * PaySchedule update
   */
  export type PayScheduleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaySchedule
     */
    select?: PayScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaySchedule
     */
    omit?: PayScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayScheduleInclude<ExtArgs> | null
    /**
     * The data needed to update a PaySchedule.
     */
    data: XOR<PayScheduleUpdateInput, PayScheduleUncheckedUpdateInput>
    /**
     * Choose, which PaySchedule to update.
     */
    where: PayScheduleWhereUniqueInput
  }

  /**
   * PaySchedule updateMany
   */
  export type PayScheduleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PaySchedules.
     */
    data: XOR<PayScheduleUpdateManyMutationInput, PayScheduleUncheckedUpdateManyInput>
    /**
     * Filter which PaySchedules to update
     */
    where?: PayScheduleWhereInput
    /**
     * Limit how many PaySchedules to update.
     */
    limit?: number
  }

  /**
   * PaySchedule updateManyAndReturn
   */
  export type PayScheduleUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaySchedule
     */
    select?: PayScheduleSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PaySchedule
     */
    omit?: PayScheduleOmit<ExtArgs> | null
    /**
     * The data used to update PaySchedules.
     */
    data: XOR<PayScheduleUpdateManyMutationInput, PayScheduleUncheckedUpdateManyInput>
    /**
     * Filter which PaySchedules to update
     */
    where?: PayScheduleWhereInput
    /**
     * Limit how many PaySchedules to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayScheduleIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * PaySchedule upsert
   */
  export type PayScheduleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaySchedule
     */
    select?: PayScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaySchedule
     */
    omit?: PayScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayScheduleInclude<ExtArgs> | null
    /**
     * The filter to search for the PaySchedule to update in case it exists.
     */
    where: PayScheduleWhereUniqueInput
    /**
     * In case the PaySchedule found by the `where` argument doesn't exist, create a new PaySchedule with this data.
     */
    create: XOR<PayScheduleCreateInput, PayScheduleUncheckedCreateInput>
    /**
     * In case the PaySchedule was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PayScheduleUpdateInput, PayScheduleUncheckedUpdateInput>
  }

  /**
   * PaySchedule delete
   */
  export type PayScheduleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaySchedule
     */
    select?: PayScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaySchedule
     */
    omit?: PayScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayScheduleInclude<ExtArgs> | null
    /**
     * Filter which PaySchedule to delete.
     */
    where: PayScheduleWhereUniqueInput
  }

  /**
   * PaySchedule deleteMany
   */
  export type PayScheduleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PaySchedules to delete
     */
    where?: PayScheduleWhereInput
    /**
     * Limit how many PaySchedules to delete.
     */
    limit?: number
  }

  /**
   * PaySchedule without action
   */
  export type PayScheduleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaySchedule
     */
    select?: PayScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaySchedule
     */
    omit?: PayScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayScheduleInclude<ExtArgs> | null
  }


  /**
   * Model Goal
   */

  export type AggregateGoal = {
    _count: GoalCountAggregateOutputType | null
    _avg: GoalAvgAggregateOutputType | null
    _sum: GoalSumAggregateOutputType | null
    _min: GoalMinAggregateOutputType | null
    _max: GoalMaxAggregateOutputType | null
  }

  export type GoalAvgAggregateOutputType = {
    targetAmount: number | null
    currentAmount: number | null
    sortOrder: number | null
  }

  export type GoalSumAggregateOutputType = {
    targetAmount: number | null
    currentAmount: number | null
    sortOrder: number | null
  }

  export type GoalMinAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    description: string | null
    targetAmount: number | null
    currentAmount: number | null
    targetDate: Date | null
    envelopeId: string | null
    planet: string | null
    isPrimary: boolean | null
    kind: $Enums.GoalKind | null
    sortOrder: number | null
    isArchived: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type GoalMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    description: string | null
    targetAmount: number | null
    currentAmount: number | null
    targetDate: Date | null
    envelopeId: string | null
    planet: string | null
    isPrimary: boolean | null
    kind: $Enums.GoalKind | null
    sortOrder: number | null
    isArchived: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type GoalCountAggregateOutputType = {
    id: number
    userId: number
    name: number
    description: number
    targetAmount: number
    currentAmount: number
    targetDate: number
    envelopeId: number
    planet: number
    isPrimary: number
    kind: number
    sortOrder: number
    isArchived: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type GoalAvgAggregateInputType = {
    targetAmount?: true
    currentAmount?: true
    sortOrder?: true
  }

  export type GoalSumAggregateInputType = {
    targetAmount?: true
    currentAmount?: true
    sortOrder?: true
  }

  export type GoalMinAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    description?: true
    targetAmount?: true
    currentAmount?: true
    targetDate?: true
    envelopeId?: true
    planet?: true
    isPrimary?: true
    kind?: true
    sortOrder?: true
    isArchived?: true
    createdAt?: true
    updatedAt?: true
  }

  export type GoalMaxAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    description?: true
    targetAmount?: true
    currentAmount?: true
    targetDate?: true
    envelopeId?: true
    planet?: true
    isPrimary?: true
    kind?: true
    sortOrder?: true
    isArchived?: true
    createdAt?: true
    updatedAt?: true
  }

  export type GoalCountAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    description?: true
    targetAmount?: true
    currentAmount?: true
    targetDate?: true
    envelopeId?: true
    planet?: true
    isPrimary?: true
    kind?: true
    sortOrder?: true
    isArchived?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type GoalAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Goal to aggregate.
     */
    where?: GoalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Goals to fetch.
     */
    orderBy?: GoalOrderByWithRelationInput | GoalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: GoalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Goals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Goals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Goals
    **/
    _count?: true | GoalCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GoalAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GoalSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GoalMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GoalMaxAggregateInputType
  }

  export type GetGoalAggregateType<T extends GoalAggregateArgs> = {
        [P in keyof T & keyof AggregateGoal]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGoal[P]>
      : GetScalarType<T[P], AggregateGoal[P]>
  }




  export type GoalGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GoalWhereInput
    orderBy?: GoalOrderByWithAggregationInput | GoalOrderByWithAggregationInput[]
    by: GoalScalarFieldEnum[] | GoalScalarFieldEnum
    having?: GoalScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GoalCountAggregateInputType | true
    _avg?: GoalAvgAggregateInputType
    _sum?: GoalSumAggregateInputType
    _min?: GoalMinAggregateInputType
    _max?: GoalMaxAggregateInputType
  }

  export type GoalGroupByOutputType = {
    id: string
    userId: string
    name: string
    description: string | null
    targetAmount: number
    currentAmount: number
    targetDate: Date | null
    envelopeId: string | null
    planet: string | null
    isPrimary: boolean
    kind: $Enums.GoalKind
    sortOrder: number
    isArchived: boolean
    createdAt: Date
    updatedAt: Date
    _count: GoalCountAggregateOutputType | null
    _avg: GoalAvgAggregateOutputType | null
    _sum: GoalSumAggregateOutputType | null
    _min: GoalMinAggregateOutputType | null
    _max: GoalMaxAggregateOutputType | null
  }

  type GetGoalGroupByPayload<T extends GoalGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GoalGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GoalGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GoalGroupByOutputType[P]>
            : GetScalarType<T[P], GoalGroupByOutputType[P]>
        }
      >
    >


  export type GoalSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    description?: boolean
    targetAmount?: boolean
    currentAmount?: boolean
    targetDate?: boolean
    envelopeId?: boolean
    planet?: boolean
    isPrimary?: boolean
    kind?: boolean
    sortOrder?: boolean
    isArchived?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["goal"]>

  export type GoalSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    description?: boolean
    targetAmount?: boolean
    currentAmount?: boolean
    targetDate?: boolean
    envelopeId?: boolean
    planet?: boolean
    isPrimary?: boolean
    kind?: boolean
    sortOrder?: boolean
    isArchived?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["goal"]>

  export type GoalSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    description?: boolean
    targetAmount?: boolean
    currentAmount?: boolean
    targetDate?: boolean
    envelopeId?: boolean
    planet?: boolean
    isPrimary?: boolean
    kind?: boolean
    sortOrder?: boolean
    isArchived?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["goal"]>

  export type GoalSelectScalar = {
    id?: boolean
    userId?: boolean
    name?: boolean
    description?: boolean
    targetAmount?: boolean
    currentAmount?: boolean
    targetDate?: boolean
    envelopeId?: boolean
    planet?: boolean
    isPrimary?: boolean
    kind?: boolean
    sortOrder?: boolean
    isArchived?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type GoalOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "name" | "description" | "targetAmount" | "currentAmount" | "targetDate" | "envelopeId" | "planet" | "isPrimary" | "kind" | "sortOrder" | "isArchived" | "createdAt" | "updatedAt", ExtArgs["result"]["goal"]>
  export type GoalInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type GoalIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type GoalIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $GoalPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Goal"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      name: string
      description: string | null
      /**
       * Target amount in cents.
       */
      targetAmount: number
      /**
       * Cached current amount in cents.
       */
      currentAmount: number
      /**
       * Optional target date.
       */
      targetDate: Date | null
      /**
       * Which envelope funds this goal (e.g. "Savings" envelope → Emergency Fund goal).
       */
      envelopeId: string | null
      /**
       * Which planet this goal is associated with — purely visual.
       */
      planet: string | null
      /**
       * Hero priority — at most one per user (enforced in app code).
       */
      isPrimary: boolean
      /**
       * TRANSFER = automatic money movement (e.g. emergency-fund sweep,
       * savings transfer — surfaces in the HorizonStrip's transfer tag).
       * MILESTONE = a destination amount the user is working toward
       * (e.g. "Debt Free", "Visit Family"). Replaces the brittle
       * name-pattern regex in the HorizonStrip's transfer detection.
       */
      kind: $Enums.GoalKind
      sortOrder: number
      isArchived: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["goal"]>
    composites: {}
  }

  type GoalGetPayload<S extends boolean | null | undefined | GoalDefaultArgs> = $Result.GetResult<Prisma.$GoalPayload, S>

  type GoalCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<GoalFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: GoalCountAggregateInputType | true
    }

  export interface GoalDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Goal'], meta: { name: 'Goal' } }
    /**
     * Find zero or one Goal that matches the filter.
     * @param {GoalFindUniqueArgs} args - Arguments to find a Goal
     * @example
     * // Get one Goal
     * const goal = await prisma.goal.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends GoalFindUniqueArgs>(args: SelectSubset<T, GoalFindUniqueArgs<ExtArgs>>): Prisma__GoalClient<$Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Goal that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {GoalFindUniqueOrThrowArgs} args - Arguments to find a Goal
     * @example
     * // Get one Goal
     * const goal = await prisma.goal.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends GoalFindUniqueOrThrowArgs>(args: SelectSubset<T, GoalFindUniqueOrThrowArgs<ExtArgs>>): Prisma__GoalClient<$Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Goal that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GoalFindFirstArgs} args - Arguments to find a Goal
     * @example
     * // Get one Goal
     * const goal = await prisma.goal.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends GoalFindFirstArgs>(args?: SelectSubset<T, GoalFindFirstArgs<ExtArgs>>): Prisma__GoalClient<$Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Goal that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GoalFindFirstOrThrowArgs} args - Arguments to find a Goal
     * @example
     * // Get one Goal
     * const goal = await prisma.goal.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends GoalFindFirstOrThrowArgs>(args?: SelectSubset<T, GoalFindFirstOrThrowArgs<ExtArgs>>): Prisma__GoalClient<$Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Goals that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GoalFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Goals
     * const goals = await prisma.goal.findMany()
     * 
     * // Get first 10 Goals
     * const goals = await prisma.goal.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const goalWithIdOnly = await prisma.goal.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends GoalFindManyArgs>(args?: SelectSubset<T, GoalFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Goal.
     * @param {GoalCreateArgs} args - Arguments to create a Goal.
     * @example
     * // Create one Goal
     * const Goal = await prisma.goal.create({
     *   data: {
     *     // ... data to create a Goal
     *   }
     * })
     * 
     */
    create<T extends GoalCreateArgs>(args: SelectSubset<T, GoalCreateArgs<ExtArgs>>): Prisma__GoalClient<$Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Goals.
     * @param {GoalCreateManyArgs} args - Arguments to create many Goals.
     * @example
     * // Create many Goals
     * const goal = await prisma.goal.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends GoalCreateManyArgs>(args?: SelectSubset<T, GoalCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Goals and returns the data saved in the database.
     * @param {GoalCreateManyAndReturnArgs} args - Arguments to create many Goals.
     * @example
     * // Create many Goals
     * const goal = await prisma.goal.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Goals and only return the `id`
     * const goalWithIdOnly = await prisma.goal.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends GoalCreateManyAndReturnArgs>(args?: SelectSubset<T, GoalCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Goal.
     * @param {GoalDeleteArgs} args - Arguments to delete one Goal.
     * @example
     * // Delete one Goal
     * const Goal = await prisma.goal.delete({
     *   where: {
     *     // ... filter to delete one Goal
     *   }
     * })
     * 
     */
    delete<T extends GoalDeleteArgs>(args: SelectSubset<T, GoalDeleteArgs<ExtArgs>>): Prisma__GoalClient<$Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Goal.
     * @param {GoalUpdateArgs} args - Arguments to update one Goal.
     * @example
     * // Update one Goal
     * const goal = await prisma.goal.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends GoalUpdateArgs>(args: SelectSubset<T, GoalUpdateArgs<ExtArgs>>): Prisma__GoalClient<$Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Goals.
     * @param {GoalDeleteManyArgs} args - Arguments to filter Goals to delete.
     * @example
     * // Delete a few Goals
     * const { count } = await prisma.goal.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends GoalDeleteManyArgs>(args?: SelectSubset<T, GoalDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Goals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GoalUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Goals
     * const goal = await prisma.goal.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends GoalUpdateManyArgs>(args: SelectSubset<T, GoalUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Goals and returns the data updated in the database.
     * @param {GoalUpdateManyAndReturnArgs} args - Arguments to update many Goals.
     * @example
     * // Update many Goals
     * const goal = await prisma.goal.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Goals and only return the `id`
     * const goalWithIdOnly = await prisma.goal.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends GoalUpdateManyAndReturnArgs>(args: SelectSubset<T, GoalUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Goal.
     * @param {GoalUpsertArgs} args - Arguments to update or create a Goal.
     * @example
     * // Update or create a Goal
     * const goal = await prisma.goal.upsert({
     *   create: {
     *     // ... data to create a Goal
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Goal we want to update
     *   }
     * })
     */
    upsert<T extends GoalUpsertArgs>(args: SelectSubset<T, GoalUpsertArgs<ExtArgs>>): Prisma__GoalClient<$Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Goals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GoalCountArgs} args - Arguments to filter Goals to count.
     * @example
     * // Count the number of Goals
     * const count = await prisma.goal.count({
     *   where: {
     *     // ... the filter for the Goals we want to count
     *   }
     * })
    **/
    count<T extends GoalCountArgs>(
      args?: Subset<T, GoalCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GoalCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Goal.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GoalAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GoalAggregateArgs>(args: Subset<T, GoalAggregateArgs>): Prisma.PrismaPromise<GetGoalAggregateType<T>>

    /**
     * Group by Goal.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GoalGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends GoalGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GoalGroupByArgs['orderBy'] }
        : { orderBy?: GoalGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, GoalGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGoalGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Goal model
   */
  readonly fields: GoalFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Goal.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GoalClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Goal model
   */
  interface GoalFieldRefs {
    readonly id: FieldRef<"Goal", 'String'>
    readonly userId: FieldRef<"Goal", 'String'>
    readonly name: FieldRef<"Goal", 'String'>
    readonly description: FieldRef<"Goal", 'String'>
    readonly targetAmount: FieldRef<"Goal", 'Int'>
    readonly currentAmount: FieldRef<"Goal", 'Int'>
    readonly targetDate: FieldRef<"Goal", 'DateTime'>
    readonly envelopeId: FieldRef<"Goal", 'String'>
    readonly planet: FieldRef<"Goal", 'String'>
    readonly isPrimary: FieldRef<"Goal", 'Boolean'>
    readonly kind: FieldRef<"Goal", 'GoalKind'>
    readonly sortOrder: FieldRef<"Goal", 'Int'>
    readonly isArchived: FieldRef<"Goal", 'Boolean'>
    readonly createdAt: FieldRef<"Goal", 'DateTime'>
    readonly updatedAt: FieldRef<"Goal", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Goal findUnique
   */
  export type GoalFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Goal
     */
    omit?: GoalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null
    /**
     * Filter, which Goal to fetch.
     */
    where: GoalWhereUniqueInput
  }

  /**
   * Goal findUniqueOrThrow
   */
  export type GoalFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Goal
     */
    omit?: GoalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null
    /**
     * Filter, which Goal to fetch.
     */
    where: GoalWhereUniqueInput
  }

  /**
   * Goal findFirst
   */
  export type GoalFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Goal
     */
    omit?: GoalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null
    /**
     * Filter, which Goal to fetch.
     */
    where?: GoalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Goals to fetch.
     */
    orderBy?: GoalOrderByWithRelationInput | GoalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Goals.
     */
    cursor?: GoalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Goals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Goals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Goals.
     */
    distinct?: GoalScalarFieldEnum | GoalScalarFieldEnum[]
  }

  /**
   * Goal findFirstOrThrow
   */
  export type GoalFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Goal
     */
    omit?: GoalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null
    /**
     * Filter, which Goal to fetch.
     */
    where?: GoalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Goals to fetch.
     */
    orderBy?: GoalOrderByWithRelationInput | GoalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Goals.
     */
    cursor?: GoalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Goals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Goals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Goals.
     */
    distinct?: GoalScalarFieldEnum | GoalScalarFieldEnum[]
  }

  /**
   * Goal findMany
   */
  export type GoalFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Goal
     */
    omit?: GoalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null
    /**
     * Filter, which Goals to fetch.
     */
    where?: GoalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Goals to fetch.
     */
    orderBy?: GoalOrderByWithRelationInput | GoalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Goals.
     */
    cursor?: GoalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Goals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Goals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Goals.
     */
    distinct?: GoalScalarFieldEnum | GoalScalarFieldEnum[]
  }

  /**
   * Goal create
   */
  export type GoalCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Goal
     */
    omit?: GoalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null
    /**
     * The data needed to create a Goal.
     */
    data: XOR<GoalCreateInput, GoalUncheckedCreateInput>
  }

  /**
   * Goal createMany
   */
  export type GoalCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Goals.
     */
    data: GoalCreateManyInput | GoalCreateManyInput[]
  }

  /**
   * Goal createManyAndReturn
   */
  export type GoalCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Goal
     */
    omit?: GoalOmit<ExtArgs> | null
    /**
     * The data used to create many Goals.
     */
    data: GoalCreateManyInput | GoalCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Goal update
   */
  export type GoalUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Goal
     */
    omit?: GoalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null
    /**
     * The data needed to update a Goal.
     */
    data: XOR<GoalUpdateInput, GoalUncheckedUpdateInput>
    /**
     * Choose, which Goal to update.
     */
    where: GoalWhereUniqueInput
  }

  /**
   * Goal updateMany
   */
  export type GoalUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Goals.
     */
    data: XOR<GoalUpdateManyMutationInput, GoalUncheckedUpdateManyInput>
    /**
     * Filter which Goals to update
     */
    where?: GoalWhereInput
    /**
     * Limit how many Goals to update.
     */
    limit?: number
  }

  /**
   * Goal updateManyAndReturn
   */
  export type GoalUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Goal
     */
    omit?: GoalOmit<ExtArgs> | null
    /**
     * The data used to update Goals.
     */
    data: XOR<GoalUpdateManyMutationInput, GoalUncheckedUpdateManyInput>
    /**
     * Filter which Goals to update
     */
    where?: GoalWhereInput
    /**
     * Limit how many Goals to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Goal upsert
   */
  export type GoalUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Goal
     */
    omit?: GoalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null
    /**
     * The filter to search for the Goal to update in case it exists.
     */
    where: GoalWhereUniqueInput
    /**
     * In case the Goal found by the `where` argument doesn't exist, create a new Goal with this data.
     */
    create: XOR<GoalCreateInput, GoalUncheckedCreateInput>
    /**
     * In case the Goal was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GoalUpdateInput, GoalUncheckedUpdateInput>
  }

  /**
   * Goal delete
   */
  export type GoalDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Goal
     */
    omit?: GoalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null
    /**
     * Filter which Goal to delete.
     */
    where: GoalWhereUniqueInput
  }

  /**
   * Goal deleteMany
   */
  export type GoalDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Goals to delete
     */
    where?: GoalWhereInput
    /**
     * Limit how many Goals to delete.
     */
    limit?: number
  }

  /**
   * Goal without action
   */
  export type GoalDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Goal
     */
    omit?: GoalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null
  }


  /**
   * Model AllocationPlan
   */

  export type AggregateAllocationPlan = {
    _count: AllocationPlanCountAggregateOutputType | null
    _min: AllocationPlanMinAggregateOutputType | null
    _max: AllocationPlanMaxAggregateOutputType | null
  }

  export type AllocationPlanMinAggregateOutputType = {
    id: string | null
    userId: string | null
    strategyId: string | null
    isArmed: boolean | null
    name: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AllocationPlanMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    strategyId: string | null
    isArmed: boolean | null
    name: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AllocationPlanCountAggregateOutputType = {
    id: number
    userId: number
    strategyId: number
    isArmed: number
    name: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AllocationPlanMinAggregateInputType = {
    id?: true
    userId?: true
    strategyId?: true
    isArmed?: true
    name?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AllocationPlanMaxAggregateInputType = {
    id?: true
    userId?: true
    strategyId?: true
    isArmed?: true
    name?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AllocationPlanCountAggregateInputType = {
    id?: true
    userId?: true
    strategyId?: true
    isArmed?: true
    name?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AllocationPlanAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AllocationPlan to aggregate.
     */
    where?: AllocationPlanWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AllocationPlans to fetch.
     */
    orderBy?: AllocationPlanOrderByWithRelationInput | AllocationPlanOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AllocationPlanWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AllocationPlans from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AllocationPlans.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AllocationPlans
    **/
    _count?: true | AllocationPlanCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AllocationPlanMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AllocationPlanMaxAggregateInputType
  }

  export type GetAllocationPlanAggregateType<T extends AllocationPlanAggregateArgs> = {
        [P in keyof T & keyof AggregateAllocationPlan]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAllocationPlan[P]>
      : GetScalarType<T[P], AggregateAllocationPlan[P]>
  }




  export type AllocationPlanGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AllocationPlanWhereInput
    orderBy?: AllocationPlanOrderByWithAggregationInput | AllocationPlanOrderByWithAggregationInput[]
    by: AllocationPlanScalarFieldEnum[] | AllocationPlanScalarFieldEnum
    having?: AllocationPlanScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AllocationPlanCountAggregateInputType | true
    _min?: AllocationPlanMinAggregateInputType
    _max?: AllocationPlanMaxAggregateInputType
  }

  export type AllocationPlanGroupByOutputType = {
    id: string
    userId: string
    strategyId: string
    isArmed: boolean
    name: string | null
    createdAt: Date
    updatedAt: Date
    _count: AllocationPlanCountAggregateOutputType | null
    _min: AllocationPlanMinAggregateOutputType | null
    _max: AllocationPlanMaxAggregateOutputType | null
  }

  type GetAllocationPlanGroupByPayload<T extends AllocationPlanGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AllocationPlanGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AllocationPlanGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AllocationPlanGroupByOutputType[P]>
            : GetScalarType<T[P], AllocationPlanGroupByOutputType[P]>
        }
      >
    >


  export type AllocationPlanSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    strategyId?: boolean
    isArmed?: boolean
    name?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    rules?: boolean | AllocationPlan$rulesArgs<ExtArgs>
    _count?: boolean | AllocationPlanCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["allocationPlan"]>

  export type AllocationPlanSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    strategyId?: boolean
    isArmed?: boolean
    name?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["allocationPlan"]>

  export type AllocationPlanSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    strategyId?: boolean
    isArmed?: boolean
    name?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["allocationPlan"]>

  export type AllocationPlanSelectScalar = {
    id?: boolean
    userId?: boolean
    strategyId?: boolean
    isArmed?: boolean
    name?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AllocationPlanOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "strategyId" | "isArmed" | "name" | "createdAt" | "updatedAt", ExtArgs["result"]["allocationPlan"]>
  export type AllocationPlanInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    rules?: boolean | AllocationPlan$rulesArgs<ExtArgs>
    _count?: boolean | AllocationPlanCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AllocationPlanIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type AllocationPlanIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $AllocationPlanPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AllocationPlan"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      rules: Prisma.$AllocationRulePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      /**
       * envelope | zero_based | fifty_thirty_twenty | pay_yourself_first
       */
      strategyId: string
      /**
       * Armed: when true, every paycheck transaction runs the rules.
       */
      isArmed: boolean
      /**
       * Optional human-readable name ("Mom's plan").
       */
      name: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["allocationPlan"]>
    composites: {}
  }

  type AllocationPlanGetPayload<S extends boolean | null | undefined | AllocationPlanDefaultArgs> = $Result.GetResult<Prisma.$AllocationPlanPayload, S>

  type AllocationPlanCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AllocationPlanFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AllocationPlanCountAggregateInputType | true
    }

  export interface AllocationPlanDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AllocationPlan'], meta: { name: 'AllocationPlan' } }
    /**
     * Find zero or one AllocationPlan that matches the filter.
     * @param {AllocationPlanFindUniqueArgs} args - Arguments to find a AllocationPlan
     * @example
     * // Get one AllocationPlan
     * const allocationPlan = await prisma.allocationPlan.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AllocationPlanFindUniqueArgs>(args: SelectSubset<T, AllocationPlanFindUniqueArgs<ExtArgs>>): Prisma__AllocationPlanClient<$Result.GetResult<Prisma.$AllocationPlanPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AllocationPlan that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AllocationPlanFindUniqueOrThrowArgs} args - Arguments to find a AllocationPlan
     * @example
     * // Get one AllocationPlan
     * const allocationPlan = await prisma.allocationPlan.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AllocationPlanFindUniqueOrThrowArgs>(args: SelectSubset<T, AllocationPlanFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AllocationPlanClient<$Result.GetResult<Prisma.$AllocationPlanPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AllocationPlan that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AllocationPlanFindFirstArgs} args - Arguments to find a AllocationPlan
     * @example
     * // Get one AllocationPlan
     * const allocationPlan = await prisma.allocationPlan.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AllocationPlanFindFirstArgs>(args?: SelectSubset<T, AllocationPlanFindFirstArgs<ExtArgs>>): Prisma__AllocationPlanClient<$Result.GetResult<Prisma.$AllocationPlanPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AllocationPlan that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AllocationPlanFindFirstOrThrowArgs} args - Arguments to find a AllocationPlan
     * @example
     * // Get one AllocationPlan
     * const allocationPlan = await prisma.allocationPlan.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AllocationPlanFindFirstOrThrowArgs>(args?: SelectSubset<T, AllocationPlanFindFirstOrThrowArgs<ExtArgs>>): Prisma__AllocationPlanClient<$Result.GetResult<Prisma.$AllocationPlanPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AllocationPlans that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AllocationPlanFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AllocationPlans
     * const allocationPlans = await prisma.allocationPlan.findMany()
     * 
     * // Get first 10 AllocationPlans
     * const allocationPlans = await prisma.allocationPlan.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const allocationPlanWithIdOnly = await prisma.allocationPlan.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AllocationPlanFindManyArgs>(args?: SelectSubset<T, AllocationPlanFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AllocationPlanPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AllocationPlan.
     * @param {AllocationPlanCreateArgs} args - Arguments to create a AllocationPlan.
     * @example
     * // Create one AllocationPlan
     * const AllocationPlan = await prisma.allocationPlan.create({
     *   data: {
     *     // ... data to create a AllocationPlan
     *   }
     * })
     * 
     */
    create<T extends AllocationPlanCreateArgs>(args: SelectSubset<T, AllocationPlanCreateArgs<ExtArgs>>): Prisma__AllocationPlanClient<$Result.GetResult<Prisma.$AllocationPlanPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AllocationPlans.
     * @param {AllocationPlanCreateManyArgs} args - Arguments to create many AllocationPlans.
     * @example
     * // Create many AllocationPlans
     * const allocationPlan = await prisma.allocationPlan.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AllocationPlanCreateManyArgs>(args?: SelectSubset<T, AllocationPlanCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AllocationPlans and returns the data saved in the database.
     * @param {AllocationPlanCreateManyAndReturnArgs} args - Arguments to create many AllocationPlans.
     * @example
     * // Create many AllocationPlans
     * const allocationPlan = await prisma.allocationPlan.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AllocationPlans and only return the `id`
     * const allocationPlanWithIdOnly = await prisma.allocationPlan.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AllocationPlanCreateManyAndReturnArgs>(args?: SelectSubset<T, AllocationPlanCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AllocationPlanPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AllocationPlan.
     * @param {AllocationPlanDeleteArgs} args - Arguments to delete one AllocationPlan.
     * @example
     * // Delete one AllocationPlan
     * const AllocationPlan = await prisma.allocationPlan.delete({
     *   where: {
     *     // ... filter to delete one AllocationPlan
     *   }
     * })
     * 
     */
    delete<T extends AllocationPlanDeleteArgs>(args: SelectSubset<T, AllocationPlanDeleteArgs<ExtArgs>>): Prisma__AllocationPlanClient<$Result.GetResult<Prisma.$AllocationPlanPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AllocationPlan.
     * @param {AllocationPlanUpdateArgs} args - Arguments to update one AllocationPlan.
     * @example
     * // Update one AllocationPlan
     * const allocationPlan = await prisma.allocationPlan.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AllocationPlanUpdateArgs>(args: SelectSubset<T, AllocationPlanUpdateArgs<ExtArgs>>): Prisma__AllocationPlanClient<$Result.GetResult<Prisma.$AllocationPlanPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AllocationPlans.
     * @param {AllocationPlanDeleteManyArgs} args - Arguments to filter AllocationPlans to delete.
     * @example
     * // Delete a few AllocationPlans
     * const { count } = await prisma.allocationPlan.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AllocationPlanDeleteManyArgs>(args?: SelectSubset<T, AllocationPlanDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AllocationPlans.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AllocationPlanUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AllocationPlans
     * const allocationPlan = await prisma.allocationPlan.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AllocationPlanUpdateManyArgs>(args: SelectSubset<T, AllocationPlanUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AllocationPlans and returns the data updated in the database.
     * @param {AllocationPlanUpdateManyAndReturnArgs} args - Arguments to update many AllocationPlans.
     * @example
     * // Update many AllocationPlans
     * const allocationPlan = await prisma.allocationPlan.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AllocationPlans and only return the `id`
     * const allocationPlanWithIdOnly = await prisma.allocationPlan.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AllocationPlanUpdateManyAndReturnArgs>(args: SelectSubset<T, AllocationPlanUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AllocationPlanPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AllocationPlan.
     * @param {AllocationPlanUpsertArgs} args - Arguments to update or create a AllocationPlan.
     * @example
     * // Update or create a AllocationPlan
     * const allocationPlan = await prisma.allocationPlan.upsert({
     *   create: {
     *     // ... data to create a AllocationPlan
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AllocationPlan we want to update
     *   }
     * })
     */
    upsert<T extends AllocationPlanUpsertArgs>(args: SelectSubset<T, AllocationPlanUpsertArgs<ExtArgs>>): Prisma__AllocationPlanClient<$Result.GetResult<Prisma.$AllocationPlanPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AllocationPlans.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AllocationPlanCountArgs} args - Arguments to filter AllocationPlans to count.
     * @example
     * // Count the number of AllocationPlans
     * const count = await prisma.allocationPlan.count({
     *   where: {
     *     // ... the filter for the AllocationPlans we want to count
     *   }
     * })
    **/
    count<T extends AllocationPlanCountArgs>(
      args?: Subset<T, AllocationPlanCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AllocationPlanCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AllocationPlan.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AllocationPlanAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AllocationPlanAggregateArgs>(args: Subset<T, AllocationPlanAggregateArgs>): Prisma.PrismaPromise<GetAllocationPlanAggregateType<T>>

    /**
     * Group by AllocationPlan.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AllocationPlanGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AllocationPlanGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AllocationPlanGroupByArgs['orderBy'] }
        : { orderBy?: AllocationPlanGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AllocationPlanGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAllocationPlanGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AllocationPlan model
   */
  readonly fields: AllocationPlanFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AllocationPlan.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AllocationPlanClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    rules<T extends AllocationPlan$rulesArgs<ExtArgs> = {}>(args?: Subset<T, AllocationPlan$rulesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AllocationRulePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AllocationPlan model
   */
  interface AllocationPlanFieldRefs {
    readonly id: FieldRef<"AllocationPlan", 'String'>
    readonly userId: FieldRef<"AllocationPlan", 'String'>
    readonly strategyId: FieldRef<"AllocationPlan", 'String'>
    readonly isArmed: FieldRef<"AllocationPlan", 'Boolean'>
    readonly name: FieldRef<"AllocationPlan", 'String'>
    readonly createdAt: FieldRef<"AllocationPlan", 'DateTime'>
    readonly updatedAt: FieldRef<"AllocationPlan", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AllocationPlan findUnique
   */
  export type AllocationPlanFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationPlan
     */
    select?: AllocationPlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationPlan
     */
    omit?: AllocationPlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationPlanInclude<ExtArgs> | null
    /**
     * Filter, which AllocationPlan to fetch.
     */
    where: AllocationPlanWhereUniqueInput
  }

  /**
   * AllocationPlan findUniqueOrThrow
   */
  export type AllocationPlanFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationPlan
     */
    select?: AllocationPlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationPlan
     */
    omit?: AllocationPlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationPlanInclude<ExtArgs> | null
    /**
     * Filter, which AllocationPlan to fetch.
     */
    where: AllocationPlanWhereUniqueInput
  }

  /**
   * AllocationPlan findFirst
   */
  export type AllocationPlanFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationPlan
     */
    select?: AllocationPlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationPlan
     */
    omit?: AllocationPlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationPlanInclude<ExtArgs> | null
    /**
     * Filter, which AllocationPlan to fetch.
     */
    where?: AllocationPlanWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AllocationPlans to fetch.
     */
    orderBy?: AllocationPlanOrderByWithRelationInput | AllocationPlanOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AllocationPlans.
     */
    cursor?: AllocationPlanWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AllocationPlans from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AllocationPlans.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AllocationPlans.
     */
    distinct?: AllocationPlanScalarFieldEnum | AllocationPlanScalarFieldEnum[]
  }

  /**
   * AllocationPlan findFirstOrThrow
   */
  export type AllocationPlanFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationPlan
     */
    select?: AllocationPlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationPlan
     */
    omit?: AllocationPlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationPlanInclude<ExtArgs> | null
    /**
     * Filter, which AllocationPlan to fetch.
     */
    where?: AllocationPlanWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AllocationPlans to fetch.
     */
    orderBy?: AllocationPlanOrderByWithRelationInput | AllocationPlanOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AllocationPlans.
     */
    cursor?: AllocationPlanWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AllocationPlans from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AllocationPlans.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AllocationPlans.
     */
    distinct?: AllocationPlanScalarFieldEnum | AllocationPlanScalarFieldEnum[]
  }

  /**
   * AllocationPlan findMany
   */
  export type AllocationPlanFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationPlan
     */
    select?: AllocationPlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationPlan
     */
    omit?: AllocationPlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationPlanInclude<ExtArgs> | null
    /**
     * Filter, which AllocationPlans to fetch.
     */
    where?: AllocationPlanWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AllocationPlans to fetch.
     */
    orderBy?: AllocationPlanOrderByWithRelationInput | AllocationPlanOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AllocationPlans.
     */
    cursor?: AllocationPlanWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AllocationPlans from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AllocationPlans.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AllocationPlans.
     */
    distinct?: AllocationPlanScalarFieldEnum | AllocationPlanScalarFieldEnum[]
  }

  /**
   * AllocationPlan create
   */
  export type AllocationPlanCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationPlan
     */
    select?: AllocationPlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationPlan
     */
    omit?: AllocationPlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationPlanInclude<ExtArgs> | null
    /**
     * The data needed to create a AllocationPlan.
     */
    data: XOR<AllocationPlanCreateInput, AllocationPlanUncheckedCreateInput>
  }

  /**
   * AllocationPlan createMany
   */
  export type AllocationPlanCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AllocationPlans.
     */
    data: AllocationPlanCreateManyInput | AllocationPlanCreateManyInput[]
  }

  /**
   * AllocationPlan createManyAndReturn
   */
  export type AllocationPlanCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationPlan
     */
    select?: AllocationPlanSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationPlan
     */
    omit?: AllocationPlanOmit<ExtArgs> | null
    /**
     * The data used to create many AllocationPlans.
     */
    data: AllocationPlanCreateManyInput | AllocationPlanCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationPlanIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AllocationPlan update
   */
  export type AllocationPlanUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationPlan
     */
    select?: AllocationPlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationPlan
     */
    omit?: AllocationPlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationPlanInclude<ExtArgs> | null
    /**
     * The data needed to update a AllocationPlan.
     */
    data: XOR<AllocationPlanUpdateInput, AllocationPlanUncheckedUpdateInput>
    /**
     * Choose, which AllocationPlan to update.
     */
    where: AllocationPlanWhereUniqueInput
  }

  /**
   * AllocationPlan updateMany
   */
  export type AllocationPlanUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AllocationPlans.
     */
    data: XOR<AllocationPlanUpdateManyMutationInput, AllocationPlanUncheckedUpdateManyInput>
    /**
     * Filter which AllocationPlans to update
     */
    where?: AllocationPlanWhereInput
    /**
     * Limit how many AllocationPlans to update.
     */
    limit?: number
  }

  /**
   * AllocationPlan updateManyAndReturn
   */
  export type AllocationPlanUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationPlan
     */
    select?: AllocationPlanSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationPlan
     */
    omit?: AllocationPlanOmit<ExtArgs> | null
    /**
     * The data used to update AllocationPlans.
     */
    data: XOR<AllocationPlanUpdateManyMutationInput, AllocationPlanUncheckedUpdateManyInput>
    /**
     * Filter which AllocationPlans to update
     */
    where?: AllocationPlanWhereInput
    /**
     * Limit how many AllocationPlans to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationPlanIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AllocationPlan upsert
   */
  export type AllocationPlanUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationPlan
     */
    select?: AllocationPlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationPlan
     */
    omit?: AllocationPlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationPlanInclude<ExtArgs> | null
    /**
     * The filter to search for the AllocationPlan to update in case it exists.
     */
    where: AllocationPlanWhereUniqueInput
    /**
     * In case the AllocationPlan found by the `where` argument doesn't exist, create a new AllocationPlan with this data.
     */
    create: XOR<AllocationPlanCreateInput, AllocationPlanUncheckedCreateInput>
    /**
     * In case the AllocationPlan was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AllocationPlanUpdateInput, AllocationPlanUncheckedUpdateInput>
  }

  /**
   * AllocationPlan delete
   */
  export type AllocationPlanDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationPlan
     */
    select?: AllocationPlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationPlan
     */
    omit?: AllocationPlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationPlanInclude<ExtArgs> | null
    /**
     * Filter which AllocationPlan to delete.
     */
    where: AllocationPlanWhereUniqueInput
  }

  /**
   * AllocationPlan deleteMany
   */
  export type AllocationPlanDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AllocationPlans to delete
     */
    where?: AllocationPlanWhereInput
    /**
     * Limit how many AllocationPlans to delete.
     */
    limit?: number
  }

  /**
   * AllocationPlan.rules
   */
  export type AllocationPlan$rulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationRule
     */
    select?: AllocationRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationRule
     */
    omit?: AllocationRuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationRuleInclude<ExtArgs> | null
    where?: AllocationRuleWhereInput
    orderBy?: AllocationRuleOrderByWithRelationInput | AllocationRuleOrderByWithRelationInput[]
    cursor?: AllocationRuleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AllocationRuleScalarFieldEnum | AllocationRuleScalarFieldEnum[]
  }

  /**
   * AllocationPlan without action
   */
  export type AllocationPlanDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationPlan
     */
    select?: AllocationPlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationPlan
     */
    omit?: AllocationPlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationPlanInclude<ExtArgs> | null
  }


  /**
   * Model AllocationRule
   */

  export type AggregateAllocationRule = {
    _count: AllocationRuleCountAggregateOutputType | null
    _avg: AllocationRuleAvgAggregateOutputType | null
    _sum: AllocationRuleSumAggregateOutputType | null
    _min: AllocationRuleMinAggregateOutputType | null
    _max: AllocationRuleMaxAggregateOutputType | null
  }

  export type AllocationRuleAvgAggregateOutputType = {
    pct: number | null
    fixedCents: number | null
    sortOrder: number | null
  }

  export type AllocationRuleSumAggregateOutputType = {
    pct: number | null
    fixedCents: number | null
    sortOrder: number | null
  }

  export type AllocationRuleMinAggregateOutputType = {
    id: string | null
    planId: string | null
    envelopeId: string | null
    pct: number | null
    fixedCents: number | null
    sortOrder: number | null
    createdAt: Date | null
  }

  export type AllocationRuleMaxAggregateOutputType = {
    id: string | null
    planId: string | null
    envelopeId: string | null
    pct: number | null
    fixedCents: number | null
    sortOrder: number | null
    createdAt: Date | null
  }

  export type AllocationRuleCountAggregateOutputType = {
    id: number
    planId: number
    envelopeId: number
    pct: number
    fixedCents: number
    sortOrder: number
    createdAt: number
    _all: number
  }


  export type AllocationRuleAvgAggregateInputType = {
    pct?: true
    fixedCents?: true
    sortOrder?: true
  }

  export type AllocationRuleSumAggregateInputType = {
    pct?: true
    fixedCents?: true
    sortOrder?: true
  }

  export type AllocationRuleMinAggregateInputType = {
    id?: true
    planId?: true
    envelopeId?: true
    pct?: true
    fixedCents?: true
    sortOrder?: true
    createdAt?: true
  }

  export type AllocationRuleMaxAggregateInputType = {
    id?: true
    planId?: true
    envelopeId?: true
    pct?: true
    fixedCents?: true
    sortOrder?: true
    createdAt?: true
  }

  export type AllocationRuleCountAggregateInputType = {
    id?: true
    planId?: true
    envelopeId?: true
    pct?: true
    fixedCents?: true
    sortOrder?: true
    createdAt?: true
    _all?: true
  }

  export type AllocationRuleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AllocationRule to aggregate.
     */
    where?: AllocationRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AllocationRules to fetch.
     */
    orderBy?: AllocationRuleOrderByWithRelationInput | AllocationRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AllocationRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AllocationRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AllocationRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AllocationRules
    **/
    _count?: true | AllocationRuleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AllocationRuleAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AllocationRuleSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AllocationRuleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AllocationRuleMaxAggregateInputType
  }

  export type GetAllocationRuleAggregateType<T extends AllocationRuleAggregateArgs> = {
        [P in keyof T & keyof AggregateAllocationRule]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAllocationRule[P]>
      : GetScalarType<T[P], AggregateAllocationRule[P]>
  }




  export type AllocationRuleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AllocationRuleWhereInput
    orderBy?: AllocationRuleOrderByWithAggregationInput | AllocationRuleOrderByWithAggregationInput[]
    by: AllocationRuleScalarFieldEnum[] | AllocationRuleScalarFieldEnum
    having?: AllocationRuleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AllocationRuleCountAggregateInputType | true
    _avg?: AllocationRuleAvgAggregateInputType
    _sum?: AllocationRuleSumAggregateInputType
    _min?: AllocationRuleMinAggregateInputType
    _max?: AllocationRuleMaxAggregateInputType
  }

  export type AllocationRuleGroupByOutputType = {
    id: string
    planId: string
    envelopeId: string
    pct: number
    fixedCents: number | null
    sortOrder: number
    createdAt: Date
    _count: AllocationRuleCountAggregateOutputType | null
    _avg: AllocationRuleAvgAggregateOutputType | null
    _sum: AllocationRuleSumAggregateOutputType | null
    _min: AllocationRuleMinAggregateOutputType | null
    _max: AllocationRuleMaxAggregateOutputType | null
  }

  type GetAllocationRuleGroupByPayload<T extends AllocationRuleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AllocationRuleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AllocationRuleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AllocationRuleGroupByOutputType[P]>
            : GetScalarType<T[P], AllocationRuleGroupByOutputType[P]>
        }
      >
    >


  export type AllocationRuleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    planId?: boolean
    envelopeId?: boolean
    pct?: boolean
    fixedCents?: boolean
    sortOrder?: boolean
    createdAt?: boolean
    plan?: boolean | AllocationPlanDefaultArgs<ExtArgs>
    envelope?: boolean | EnvelopeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["allocationRule"]>

  export type AllocationRuleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    planId?: boolean
    envelopeId?: boolean
    pct?: boolean
    fixedCents?: boolean
    sortOrder?: boolean
    createdAt?: boolean
    plan?: boolean | AllocationPlanDefaultArgs<ExtArgs>
    envelope?: boolean | EnvelopeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["allocationRule"]>

  export type AllocationRuleSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    planId?: boolean
    envelopeId?: boolean
    pct?: boolean
    fixedCents?: boolean
    sortOrder?: boolean
    createdAt?: boolean
    plan?: boolean | AllocationPlanDefaultArgs<ExtArgs>
    envelope?: boolean | EnvelopeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["allocationRule"]>

  export type AllocationRuleSelectScalar = {
    id?: boolean
    planId?: boolean
    envelopeId?: boolean
    pct?: boolean
    fixedCents?: boolean
    sortOrder?: boolean
    createdAt?: boolean
  }

  export type AllocationRuleOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "planId" | "envelopeId" | "pct" | "fixedCents" | "sortOrder" | "createdAt", ExtArgs["result"]["allocationRule"]>
  export type AllocationRuleInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    plan?: boolean | AllocationPlanDefaultArgs<ExtArgs>
    envelope?: boolean | EnvelopeDefaultArgs<ExtArgs>
  }
  export type AllocationRuleIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    plan?: boolean | AllocationPlanDefaultArgs<ExtArgs>
    envelope?: boolean | EnvelopeDefaultArgs<ExtArgs>
  }
  export type AllocationRuleIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    plan?: boolean | AllocationPlanDefaultArgs<ExtArgs>
    envelope?: boolean | EnvelopeDefaultArgs<ExtArgs>
  }

  export type $AllocationRulePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AllocationRule"
    objects: {
      plan: Prisma.$AllocationPlanPayload<ExtArgs>
      envelope: Prisma.$EnvelopePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      planId: string
      envelopeId: string
      /**
       * 0–100. Integer percent.
       */
      pct: number
      /**
       * Optional per-rule override: distribute a fixed amount in cents instead.
       * If both are set, the engine uses fixedCents if set, else pct of paycheck.
       */
      fixedCents: number | null
      sortOrder: number
      createdAt: Date
    }, ExtArgs["result"]["allocationRule"]>
    composites: {}
  }

  type AllocationRuleGetPayload<S extends boolean | null | undefined | AllocationRuleDefaultArgs> = $Result.GetResult<Prisma.$AllocationRulePayload, S>

  type AllocationRuleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AllocationRuleFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AllocationRuleCountAggregateInputType | true
    }

  export interface AllocationRuleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AllocationRule'], meta: { name: 'AllocationRule' } }
    /**
     * Find zero or one AllocationRule that matches the filter.
     * @param {AllocationRuleFindUniqueArgs} args - Arguments to find a AllocationRule
     * @example
     * // Get one AllocationRule
     * const allocationRule = await prisma.allocationRule.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AllocationRuleFindUniqueArgs>(args: SelectSubset<T, AllocationRuleFindUniqueArgs<ExtArgs>>): Prisma__AllocationRuleClient<$Result.GetResult<Prisma.$AllocationRulePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AllocationRule that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AllocationRuleFindUniqueOrThrowArgs} args - Arguments to find a AllocationRule
     * @example
     * // Get one AllocationRule
     * const allocationRule = await prisma.allocationRule.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AllocationRuleFindUniqueOrThrowArgs>(args: SelectSubset<T, AllocationRuleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AllocationRuleClient<$Result.GetResult<Prisma.$AllocationRulePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AllocationRule that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AllocationRuleFindFirstArgs} args - Arguments to find a AllocationRule
     * @example
     * // Get one AllocationRule
     * const allocationRule = await prisma.allocationRule.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AllocationRuleFindFirstArgs>(args?: SelectSubset<T, AllocationRuleFindFirstArgs<ExtArgs>>): Prisma__AllocationRuleClient<$Result.GetResult<Prisma.$AllocationRulePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AllocationRule that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AllocationRuleFindFirstOrThrowArgs} args - Arguments to find a AllocationRule
     * @example
     * // Get one AllocationRule
     * const allocationRule = await prisma.allocationRule.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AllocationRuleFindFirstOrThrowArgs>(args?: SelectSubset<T, AllocationRuleFindFirstOrThrowArgs<ExtArgs>>): Prisma__AllocationRuleClient<$Result.GetResult<Prisma.$AllocationRulePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AllocationRules that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AllocationRuleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AllocationRules
     * const allocationRules = await prisma.allocationRule.findMany()
     * 
     * // Get first 10 AllocationRules
     * const allocationRules = await prisma.allocationRule.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const allocationRuleWithIdOnly = await prisma.allocationRule.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AllocationRuleFindManyArgs>(args?: SelectSubset<T, AllocationRuleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AllocationRulePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AllocationRule.
     * @param {AllocationRuleCreateArgs} args - Arguments to create a AllocationRule.
     * @example
     * // Create one AllocationRule
     * const AllocationRule = await prisma.allocationRule.create({
     *   data: {
     *     // ... data to create a AllocationRule
     *   }
     * })
     * 
     */
    create<T extends AllocationRuleCreateArgs>(args: SelectSubset<T, AllocationRuleCreateArgs<ExtArgs>>): Prisma__AllocationRuleClient<$Result.GetResult<Prisma.$AllocationRulePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AllocationRules.
     * @param {AllocationRuleCreateManyArgs} args - Arguments to create many AllocationRules.
     * @example
     * // Create many AllocationRules
     * const allocationRule = await prisma.allocationRule.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AllocationRuleCreateManyArgs>(args?: SelectSubset<T, AllocationRuleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AllocationRules and returns the data saved in the database.
     * @param {AllocationRuleCreateManyAndReturnArgs} args - Arguments to create many AllocationRules.
     * @example
     * // Create many AllocationRules
     * const allocationRule = await prisma.allocationRule.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AllocationRules and only return the `id`
     * const allocationRuleWithIdOnly = await prisma.allocationRule.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AllocationRuleCreateManyAndReturnArgs>(args?: SelectSubset<T, AllocationRuleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AllocationRulePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AllocationRule.
     * @param {AllocationRuleDeleteArgs} args - Arguments to delete one AllocationRule.
     * @example
     * // Delete one AllocationRule
     * const AllocationRule = await prisma.allocationRule.delete({
     *   where: {
     *     // ... filter to delete one AllocationRule
     *   }
     * })
     * 
     */
    delete<T extends AllocationRuleDeleteArgs>(args: SelectSubset<T, AllocationRuleDeleteArgs<ExtArgs>>): Prisma__AllocationRuleClient<$Result.GetResult<Prisma.$AllocationRulePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AllocationRule.
     * @param {AllocationRuleUpdateArgs} args - Arguments to update one AllocationRule.
     * @example
     * // Update one AllocationRule
     * const allocationRule = await prisma.allocationRule.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AllocationRuleUpdateArgs>(args: SelectSubset<T, AllocationRuleUpdateArgs<ExtArgs>>): Prisma__AllocationRuleClient<$Result.GetResult<Prisma.$AllocationRulePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AllocationRules.
     * @param {AllocationRuleDeleteManyArgs} args - Arguments to filter AllocationRules to delete.
     * @example
     * // Delete a few AllocationRules
     * const { count } = await prisma.allocationRule.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AllocationRuleDeleteManyArgs>(args?: SelectSubset<T, AllocationRuleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AllocationRules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AllocationRuleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AllocationRules
     * const allocationRule = await prisma.allocationRule.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AllocationRuleUpdateManyArgs>(args: SelectSubset<T, AllocationRuleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AllocationRules and returns the data updated in the database.
     * @param {AllocationRuleUpdateManyAndReturnArgs} args - Arguments to update many AllocationRules.
     * @example
     * // Update many AllocationRules
     * const allocationRule = await prisma.allocationRule.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AllocationRules and only return the `id`
     * const allocationRuleWithIdOnly = await prisma.allocationRule.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AllocationRuleUpdateManyAndReturnArgs>(args: SelectSubset<T, AllocationRuleUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AllocationRulePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AllocationRule.
     * @param {AllocationRuleUpsertArgs} args - Arguments to update or create a AllocationRule.
     * @example
     * // Update or create a AllocationRule
     * const allocationRule = await prisma.allocationRule.upsert({
     *   create: {
     *     // ... data to create a AllocationRule
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AllocationRule we want to update
     *   }
     * })
     */
    upsert<T extends AllocationRuleUpsertArgs>(args: SelectSubset<T, AllocationRuleUpsertArgs<ExtArgs>>): Prisma__AllocationRuleClient<$Result.GetResult<Prisma.$AllocationRulePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AllocationRules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AllocationRuleCountArgs} args - Arguments to filter AllocationRules to count.
     * @example
     * // Count the number of AllocationRules
     * const count = await prisma.allocationRule.count({
     *   where: {
     *     // ... the filter for the AllocationRules we want to count
     *   }
     * })
    **/
    count<T extends AllocationRuleCountArgs>(
      args?: Subset<T, AllocationRuleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AllocationRuleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AllocationRule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AllocationRuleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AllocationRuleAggregateArgs>(args: Subset<T, AllocationRuleAggregateArgs>): Prisma.PrismaPromise<GetAllocationRuleAggregateType<T>>

    /**
     * Group by AllocationRule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AllocationRuleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AllocationRuleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AllocationRuleGroupByArgs['orderBy'] }
        : { orderBy?: AllocationRuleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AllocationRuleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAllocationRuleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AllocationRule model
   */
  readonly fields: AllocationRuleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AllocationRule.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AllocationRuleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    plan<T extends AllocationPlanDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AllocationPlanDefaultArgs<ExtArgs>>): Prisma__AllocationPlanClient<$Result.GetResult<Prisma.$AllocationPlanPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    envelope<T extends EnvelopeDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EnvelopeDefaultArgs<ExtArgs>>): Prisma__EnvelopeClient<$Result.GetResult<Prisma.$EnvelopePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AllocationRule model
   */
  interface AllocationRuleFieldRefs {
    readonly id: FieldRef<"AllocationRule", 'String'>
    readonly planId: FieldRef<"AllocationRule", 'String'>
    readonly envelopeId: FieldRef<"AllocationRule", 'String'>
    readonly pct: FieldRef<"AllocationRule", 'Int'>
    readonly fixedCents: FieldRef<"AllocationRule", 'Int'>
    readonly sortOrder: FieldRef<"AllocationRule", 'Int'>
    readonly createdAt: FieldRef<"AllocationRule", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AllocationRule findUnique
   */
  export type AllocationRuleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationRule
     */
    select?: AllocationRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationRule
     */
    omit?: AllocationRuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationRuleInclude<ExtArgs> | null
    /**
     * Filter, which AllocationRule to fetch.
     */
    where: AllocationRuleWhereUniqueInput
  }

  /**
   * AllocationRule findUniqueOrThrow
   */
  export type AllocationRuleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationRule
     */
    select?: AllocationRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationRule
     */
    omit?: AllocationRuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationRuleInclude<ExtArgs> | null
    /**
     * Filter, which AllocationRule to fetch.
     */
    where: AllocationRuleWhereUniqueInput
  }

  /**
   * AllocationRule findFirst
   */
  export type AllocationRuleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationRule
     */
    select?: AllocationRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationRule
     */
    omit?: AllocationRuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationRuleInclude<ExtArgs> | null
    /**
     * Filter, which AllocationRule to fetch.
     */
    where?: AllocationRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AllocationRules to fetch.
     */
    orderBy?: AllocationRuleOrderByWithRelationInput | AllocationRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AllocationRules.
     */
    cursor?: AllocationRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AllocationRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AllocationRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AllocationRules.
     */
    distinct?: AllocationRuleScalarFieldEnum | AllocationRuleScalarFieldEnum[]
  }

  /**
   * AllocationRule findFirstOrThrow
   */
  export type AllocationRuleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationRule
     */
    select?: AllocationRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationRule
     */
    omit?: AllocationRuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationRuleInclude<ExtArgs> | null
    /**
     * Filter, which AllocationRule to fetch.
     */
    where?: AllocationRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AllocationRules to fetch.
     */
    orderBy?: AllocationRuleOrderByWithRelationInput | AllocationRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AllocationRules.
     */
    cursor?: AllocationRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AllocationRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AllocationRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AllocationRules.
     */
    distinct?: AllocationRuleScalarFieldEnum | AllocationRuleScalarFieldEnum[]
  }

  /**
   * AllocationRule findMany
   */
  export type AllocationRuleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationRule
     */
    select?: AllocationRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationRule
     */
    omit?: AllocationRuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationRuleInclude<ExtArgs> | null
    /**
     * Filter, which AllocationRules to fetch.
     */
    where?: AllocationRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AllocationRules to fetch.
     */
    orderBy?: AllocationRuleOrderByWithRelationInput | AllocationRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AllocationRules.
     */
    cursor?: AllocationRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AllocationRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AllocationRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AllocationRules.
     */
    distinct?: AllocationRuleScalarFieldEnum | AllocationRuleScalarFieldEnum[]
  }

  /**
   * AllocationRule create
   */
  export type AllocationRuleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationRule
     */
    select?: AllocationRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationRule
     */
    omit?: AllocationRuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationRuleInclude<ExtArgs> | null
    /**
     * The data needed to create a AllocationRule.
     */
    data: XOR<AllocationRuleCreateInput, AllocationRuleUncheckedCreateInput>
  }

  /**
   * AllocationRule createMany
   */
  export type AllocationRuleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AllocationRules.
     */
    data: AllocationRuleCreateManyInput | AllocationRuleCreateManyInput[]
  }

  /**
   * AllocationRule createManyAndReturn
   */
  export type AllocationRuleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationRule
     */
    select?: AllocationRuleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationRule
     */
    omit?: AllocationRuleOmit<ExtArgs> | null
    /**
     * The data used to create many AllocationRules.
     */
    data: AllocationRuleCreateManyInput | AllocationRuleCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationRuleIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AllocationRule update
   */
  export type AllocationRuleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationRule
     */
    select?: AllocationRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationRule
     */
    omit?: AllocationRuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationRuleInclude<ExtArgs> | null
    /**
     * The data needed to update a AllocationRule.
     */
    data: XOR<AllocationRuleUpdateInput, AllocationRuleUncheckedUpdateInput>
    /**
     * Choose, which AllocationRule to update.
     */
    where: AllocationRuleWhereUniqueInput
  }

  /**
   * AllocationRule updateMany
   */
  export type AllocationRuleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AllocationRules.
     */
    data: XOR<AllocationRuleUpdateManyMutationInput, AllocationRuleUncheckedUpdateManyInput>
    /**
     * Filter which AllocationRules to update
     */
    where?: AllocationRuleWhereInput
    /**
     * Limit how many AllocationRules to update.
     */
    limit?: number
  }

  /**
   * AllocationRule updateManyAndReturn
   */
  export type AllocationRuleUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationRule
     */
    select?: AllocationRuleSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationRule
     */
    omit?: AllocationRuleOmit<ExtArgs> | null
    /**
     * The data used to update AllocationRules.
     */
    data: XOR<AllocationRuleUpdateManyMutationInput, AllocationRuleUncheckedUpdateManyInput>
    /**
     * Filter which AllocationRules to update
     */
    where?: AllocationRuleWhereInput
    /**
     * Limit how many AllocationRules to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationRuleIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AllocationRule upsert
   */
  export type AllocationRuleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationRule
     */
    select?: AllocationRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationRule
     */
    omit?: AllocationRuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationRuleInclude<ExtArgs> | null
    /**
     * The filter to search for the AllocationRule to update in case it exists.
     */
    where: AllocationRuleWhereUniqueInput
    /**
     * In case the AllocationRule found by the `where` argument doesn't exist, create a new AllocationRule with this data.
     */
    create: XOR<AllocationRuleCreateInput, AllocationRuleUncheckedCreateInput>
    /**
     * In case the AllocationRule was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AllocationRuleUpdateInput, AllocationRuleUncheckedUpdateInput>
  }

  /**
   * AllocationRule delete
   */
  export type AllocationRuleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationRule
     */
    select?: AllocationRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationRule
     */
    omit?: AllocationRuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationRuleInclude<ExtArgs> | null
    /**
     * Filter which AllocationRule to delete.
     */
    where: AllocationRuleWhereUniqueInput
  }

  /**
   * AllocationRule deleteMany
   */
  export type AllocationRuleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AllocationRules to delete
     */
    where?: AllocationRuleWhereInput
    /**
     * Limit how many AllocationRules to delete.
     */
    limit?: number
  }

  /**
   * AllocationRule without action
   */
  export type AllocationRuleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AllocationRule
     */
    select?: AllocationRuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AllocationRule
     */
    omit?: AllocationRuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AllocationRuleInclude<ExtArgs> | null
  }


  /**
   * Model AuditLog
   */

  export type AggregateAuditLog = {
    _count: AuditLogCountAggregateOutputType | null
    _avg: AuditLogAvgAggregateOutputType | null
    _sum: AuditLogSumAggregateOutputType | null
    _min: AuditLogMinAggregateOutputType | null
    _max: AuditLogMaxAggregateOutputType | null
  }

  export type AuditLogAvgAggregateOutputType = {
    aiTierAtTime: number | null
  }

  export type AuditLogSumAggregateOutputType = {
    aiTierAtTime: number | null
  }

  export type AuditLogMinAggregateOutputType = {
    id: string | null
    userId: string | null
    actionType: string | null
    payload: string | null
    aiTierAtTime: number | null
    createdAt: Date | null
  }

  export type AuditLogMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    actionType: string | null
    payload: string | null
    aiTierAtTime: number | null
    createdAt: Date | null
  }

  export type AuditLogCountAggregateOutputType = {
    id: number
    userId: number
    actionType: number
    payload: number
    aiTierAtTime: number
    createdAt: number
    _all: number
  }


  export type AuditLogAvgAggregateInputType = {
    aiTierAtTime?: true
  }

  export type AuditLogSumAggregateInputType = {
    aiTierAtTime?: true
  }

  export type AuditLogMinAggregateInputType = {
    id?: true
    userId?: true
    actionType?: true
    payload?: true
    aiTierAtTime?: true
    createdAt?: true
  }

  export type AuditLogMaxAggregateInputType = {
    id?: true
    userId?: true
    actionType?: true
    payload?: true
    aiTierAtTime?: true
    createdAt?: true
  }

  export type AuditLogCountAggregateInputType = {
    id?: true
    userId?: true
    actionType?: true
    payload?: true
    aiTierAtTime?: true
    createdAt?: true
    _all?: true
  }

  export type AuditLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditLog to aggregate.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AuditLogs
    **/
    _count?: true | AuditLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AuditLogAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AuditLogSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuditLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuditLogMaxAggregateInputType
  }

  export type GetAuditLogAggregateType<T extends AuditLogAggregateArgs> = {
        [P in keyof T & keyof AggregateAuditLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAuditLog[P]>
      : GetScalarType<T[P], AggregateAuditLog[P]>
  }




  export type AuditLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditLogWhereInput
    orderBy?: AuditLogOrderByWithAggregationInput | AuditLogOrderByWithAggregationInput[]
    by: AuditLogScalarFieldEnum[] | AuditLogScalarFieldEnum
    having?: AuditLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuditLogCountAggregateInputType | true
    _avg?: AuditLogAvgAggregateInputType
    _sum?: AuditLogSumAggregateInputType
    _min?: AuditLogMinAggregateInputType
    _max?: AuditLogMaxAggregateInputType
  }

  export type AuditLogGroupByOutputType = {
    id: string
    userId: string
    actionType: string
    payload: string
    aiTierAtTime: number
    createdAt: Date
    _count: AuditLogCountAggregateOutputType | null
    _avg: AuditLogAvgAggregateOutputType | null
    _sum: AuditLogSumAggregateOutputType | null
    _min: AuditLogMinAggregateOutputType | null
    _max: AuditLogMaxAggregateOutputType | null
  }

  type GetAuditLogGroupByPayload<T extends AuditLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuditLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuditLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuditLogGroupByOutputType[P]>
            : GetScalarType<T[P], AuditLogGroupByOutputType[P]>
        }
      >
    >


  export type AuditLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    actionType?: boolean
    payload?: boolean
    aiTierAtTime?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    actionType?: boolean
    payload?: boolean
    aiTierAtTime?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    actionType?: boolean
    payload?: boolean
    aiTierAtTime?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectScalar = {
    id?: boolean
    userId?: boolean
    actionType?: boolean
    payload?: boolean
    aiTierAtTime?: boolean
    createdAt?: boolean
  }

  export type AuditLogOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "actionType" | "payload" | "aiTierAtTime" | "createdAt", ExtArgs["result"]["auditLog"]>
  export type AuditLogInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type AuditLogIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type AuditLogIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $AuditLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AuditLog"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      /**
       * auto_allocate | plan_armed | plan_paused | plan_edited | envelope_created | ...
       */
      actionType: string
      /**
       * Free-form JSON describing what happened.
       */
      payload: string
      /**
       * Snapshot of the user's AI tier at the time of the action.
       */
      aiTierAtTime: number
      createdAt: Date
    }, ExtArgs["result"]["auditLog"]>
    composites: {}
  }

  type AuditLogGetPayload<S extends boolean | null | undefined | AuditLogDefaultArgs> = $Result.GetResult<Prisma.$AuditLogPayload, S>

  type AuditLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AuditLogFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AuditLogCountAggregateInputType | true
    }

  export interface AuditLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AuditLog'], meta: { name: 'AuditLog' } }
    /**
     * Find zero or one AuditLog that matches the filter.
     * @param {AuditLogFindUniqueArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AuditLogFindUniqueArgs>(args: SelectSubset<T, AuditLogFindUniqueArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AuditLog that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AuditLogFindUniqueOrThrowArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AuditLogFindUniqueOrThrowArgs>(args: SelectSubset<T, AuditLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindFirstArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AuditLogFindFirstArgs>(args?: SelectSubset<T, AuditLogFindFirstArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindFirstOrThrowArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AuditLogFindFirstOrThrowArgs>(args?: SelectSubset<T, AuditLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AuditLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AuditLogs
     * const auditLogs = await prisma.auditLog.findMany()
     * 
     * // Get first 10 AuditLogs
     * const auditLogs = await prisma.auditLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const auditLogWithIdOnly = await prisma.auditLog.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AuditLogFindManyArgs>(args?: SelectSubset<T, AuditLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AuditLog.
     * @param {AuditLogCreateArgs} args - Arguments to create a AuditLog.
     * @example
     * // Create one AuditLog
     * const AuditLog = await prisma.auditLog.create({
     *   data: {
     *     // ... data to create a AuditLog
     *   }
     * })
     * 
     */
    create<T extends AuditLogCreateArgs>(args: SelectSubset<T, AuditLogCreateArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AuditLogs.
     * @param {AuditLogCreateManyArgs} args - Arguments to create many AuditLogs.
     * @example
     * // Create many AuditLogs
     * const auditLog = await prisma.auditLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AuditLogCreateManyArgs>(args?: SelectSubset<T, AuditLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AuditLogs and returns the data saved in the database.
     * @param {AuditLogCreateManyAndReturnArgs} args - Arguments to create many AuditLogs.
     * @example
     * // Create many AuditLogs
     * const auditLog = await prisma.auditLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AuditLogs and only return the `id`
     * const auditLogWithIdOnly = await prisma.auditLog.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AuditLogCreateManyAndReturnArgs>(args?: SelectSubset<T, AuditLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AuditLog.
     * @param {AuditLogDeleteArgs} args - Arguments to delete one AuditLog.
     * @example
     * // Delete one AuditLog
     * const AuditLog = await prisma.auditLog.delete({
     *   where: {
     *     // ... filter to delete one AuditLog
     *   }
     * })
     * 
     */
    delete<T extends AuditLogDeleteArgs>(args: SelectSubset<T, AuditLogDeleteArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AuditLog.
     * @param {AuditLogUpdateArgs} args - Arguments to update one AuditLog.
     * @example
     * // Update one AuditLog
     * const auditLog = await prisma.auditLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AuditLogUpdateArgs>(args: SelectSubset<T, AuditLogUpdateArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AuditLogs.
     * @param {AuditLogDeleteManyArgs} args - Arguments to filter AuditLogs to delete.
     * @example
     * // Delete a few AuditLogs
     * const { count } = await prisma.auditLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AuditLogDeleteManyArgs>(args?: SelectSubset<T, AuditLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AuditLogs
     * const auditLog = await prisma.auditLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AuditLogUpdateManyArgs>(args: SelectSubset<T, AuditLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditLogs and returns the data updated in the database.
     * @param {AuditLogUpdateManyAndReturnArgs} args - Arguments to update many AuditLogs.
     * @example
     * // Update many AuditLogs
     * const auditLog = await prisma.auditLog.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AuditLogs and only return the `id`
     * const auditLogWithIdOnly = await prisma.auditLog.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AuditLogUpdateManyAndReturnArgs>(args: SelectSubset<T, AuditLogUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AuditLog.
     * @param {AuditLogUpsertArgs} args - Arguments to update or create a AuditLog.
     * @example
     * // Update or create a AuditLog
     * const auditLog = await prisma.auditLog.upsert({
     *   create: {
     *     // ... data to create a AuditLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AuditLog we want to update
     *   }
     * })
     */
    upsert<T extends AuditLogUpsertArgs>(args: SelectSubset<T, AuditLogUpsertArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogCountArgs} args - Arguments to filter AuditLogs to count.
     * @example
     * // Count the number of AuditLogs
     * const count = await prisma.auditLog.count({
     *   where: {
     *     // ... the filter for the AuditLogs we want to count
     *   }
     * })
    **/
    count<T extends AuditLogCountArgs>(
      args?: Subset<T, AuditLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuditLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AuditLogAggregateArgs>(args: Subset<T, AuditLogAggregateArgs>): Prisma.PrismaPromise<GetAuditLogAggregateType<T>>

    /**
     * Group by AuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AuditLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuditLogGroupByArgs['orderBy'] }
        : { orderBy?: AuditLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AuditLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuditLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AuditLog model
   */
  readonly fields: AuditLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AuditLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuditLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AuditLog model
   */
  interface AuditLogFieldRefs {
    readonly id: FieldRef<"AuditLog", 'String'>
    readonly userId: FieldRef<"AuditLog", 'String'>
    readonly actionType: FieldRef<"AuditLog", 'String'>
    readonly payload: FieldRef<"AuditLog", 'String'>
    readonly aiTierAtTime: FieldRef<"AuditLog", 'Int'>
    readonly createdAt: FieldRef<"AuditLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AuditLog findUnique
   */
  export type AuditLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog findUniqueOrThrow
   */
  export type AuditLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog findFirst
   */
  export type AuditLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditLogs.
     */
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog findFirstOrThrow
   */
  export type AuditLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditLogs.
     */
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog findMany
   */
  export type AuditLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLogs to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditLogs.
     */
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog create
   */
  export type AuditLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The data needed to create a AuditLog.
     */
    data: XOR<AuditLogCreateInput, AuditLogUncheckedCreateInput>
  }

  /**
   * AuditLog createMany
   */
  export type AuditLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AuditLogs.
     */
    data: AuditLogCreateManyInput | AuditLogCreateManyInput[]
  }

  /**
   * AuditLog createManyAndReturn
   */
  export type AuditLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * The data used to create many AuditLogs.
     */
    data: AuditLogCreateManyInput | AuditLogCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuditLog update
   */
  export type AuditLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The data needed to update a AuditLog.
     */
    data: XOR<AuditLogUpdateInput, AuditLogUncheckedUpdateInput>
    /**
     * Choose, which AuditLog to update.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog updateMany
   */
  export type AuditLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AuditLogs.
     */
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AuditLogs to update
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to update.
     */
    limit?: number
  }

  /**
   * AuditLog updateManyAndReturn
   */
  export type AuditLogUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * The data used to update AuditLogs.
     */
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AuditLogs to update
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuditLog upsert
   */
  export type AuditLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The filter to search for the AuditLog to update in case it exists.
     */
    where: AuditLogWhereUniqueInput
    /**
     * In case the AuditLog found by the `where` argument doesn't exist, create a new AuditLog with this data.
     */
    create: XOR<AuditLogCreateInput, AuditLogUncheckedCreateInput>
    /**
     * In case the AuditLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuditLogUpdateInput, AuditLogUncheckedUpdateInput>
  }

  /**
   * AuditLog delete
   */
  export type AuditLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter which AuditLog to delete.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog deleteMany
   */
  export type AuditLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditLogs to delete
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to delete.
     */
    limit?: number
  }

  /**
   * AuditLog without action
   */
  export type AuditLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
  }


  /**
   * Model SystemSettings
   */

  export type AggregateSystemSettings = {
    _count: SystemSettingsCountAggregateOutputType | null
    _min: SystemSettingsMinAggregateOutputType | null
    _max: SystemSettingsMaxAggregateOutputType | null
  }

  export type SystemSettingsMinAggregateOutputType = {
    id: string | null
    activeEngineLvl: string | null
    updatedAt: Date | null
  }

  export type SystemSettingsMaxAggregateOutputType = {
    id: string | null
    activeEngineLvl: string | null
    updatedAt: Date | null
  }

  export type SystemSettingsCountAggregateOutputType = {
    id: number
    activeEngineLvl: number
    updatedAt: number
    _all: number
  }


  export type SystemSettingsMinAggregateInputType = {
    id?: true
    activeEngineLvl?: true
    updatedAt?: true
  }

  export type SystemSettingsMaxAggregateInputType = {
    id?: true
    activeEngineLvl?: true
    updatedAt?: true
  }

  export type SystemSettingsCountAggregateInputType = {
    id?: true
    activeEngineLvl?: true
    updatedAt?: true
    _all?: true
  }

  export type SystemSettingsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SystemSettings to aggregate.
     */
    where?: SystemSettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SystemSettings to fetch.
     */
    orderBy?: SystemSettingsOrderByWithRelationInput | SystemSettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SystemSettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SystemSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SystemSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SystemSettings
    **/
    _count?: true | SystemSettingsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SystemSettingsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SystemSettingsMaxAggregateInputType
  }

  export type GetSystemSettingsAggregateType<T extends SystemSettingsAggregateArgs> = {
        [P in keyof T & keyof AggregateSystemSettings]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSystemSettings[P]>
      : GetScalarType<T[P], AggregateSystemSettings[P]>
  }




  export type SystemSettingsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SystemSettingsWhereInput
    orderBy?: SystemSettingsOrderByWithAggregationInput | SystemSettingsOrderByWithAggregationInput[]
    by: SystemSettingsScalarFieldEnum[] | SystemSettingsScalarFieldEnum
    having?: SystemSettingsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SystemSettingsCountAggregateInputType | true
    _min?: SystemSettingsMinAggregateInputType
    _max?: SystemSettingsMaxAggregateInputType
  }

  export type SystemSettingsGroupByOutputType = {
    id: string
    activeEngineLvl: string
    updatedAt: Date
    _count: SystemSettingsCountAggregateOutputType | null
    _min: SystemSettingsMinAggregateOutputType | null
    _max: SystemSettingsMaxAggregateOutputType | null
  }

  type GetSystemSettingsGroupByPayload<T extends SystemSettingsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SystemSettingsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SystemSettingsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SystemSettingsGroupByOutputType[P]>
            : GetScalarType<T[P], SystemSettingsGroupByOutputType[P]>
        }
      >
    >


  export type SystemSettingsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    activeEngineLvl?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["systemSettings"]>

  export type SystemSettingsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    activeEngineLvl?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["systemSettings"]>

  export type SystemSettingsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    activeEngineLvl?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["systemSettings"]>

  export type SystemSettingsSelectScalar = {
    id?: boolean
    activeEngineLvl?: boolean
    updatedAt?: boolean
  }

  export type SystemSettingsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "activeEngineLvl" | "updatedAt", ExtArgs["result"]["systemSettings"]>

  export type $SystemSettingsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SystemSettings"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      /**
       * "L1" (deterministic rules engine) or "L2" (AI-driven). The pill
       * on the TopAppBar surfaces this value and the engine toggle flips
       * it between the two states.
       */
      activeEngineLvl: string
      updatedAt: Date
    }, ExtArgs["result"]["systemSettings"]>
    composites: {}
  }

  type SystemSettingsGetPayload<S extends boolean | null | undefined | SystemSettingsDefaultArgs> = $Result.GetResult<Prisma.$SystemSettingsPayload, S>

  type SystemSettingsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SystemSettingsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SystemSettingsCountAggregateInputType | true
    }

  export interface SystemSettingsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SystemSettings'], meta: { name: 'SystemSettings' } }
    /**
     * Find zero or one SystemSettings that matches the filter.
     * @param {SystemSettingsFindUniqueArgs} args - Arguments to find a SystemSettings
     * @example
     * // Get one SystemSettings
     * const systemSettings = await prisma.systemSettings.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SystemSettingsFindUniqueArgs>(args: SelectSubset<T, SystemSettingsFindUniqueArgs<ExtArgs>>): Prisma__SystemSettingsClient<$Result.GetResult<Prisma.$SystemSettingsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one SystemSettings that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SystemSettingsFindUniqueOrThrowArgs} args - Arguments to find a SystemSettings
     * @example
     * // Get one SystemSettings
     * const systemSettings = await prisma.systemSettings.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SystemSettingsFindUniqueOrThrowArgs>(args: SelectSubset<T, SystemSettingsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SystemSettingsClient<$Result.GetResult<Prisma.$SystemSettingsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SystemSettings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemSettingsFindFirstArgs} args - Arguments to find a SystemSettings
     * @example
     * // Get one SystemSettings
     * const systemSettings = await prisma.systemSettings.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SystemSettingsFindFirstArgs>(args?: SelectSubset<T, SystemSettingsFindFirstArgs<ExtArgs>>): Prisma__SystemSettingsClient<$Result.GetResult<Prisma.$SystemSettingsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SystemSettings that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemSettingsFindFirstOrThrowArgs} args - Arguments to find a SystemSettings
     * @example
     * // Get one SystemSettings
     * const systemSettings = await prisma.systemSettings.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SystemSettingsFindFirstOrThrowArgs>(args?: SelectSubset<T, SystemSettingsFindFirstOrThrowArgs<ExtArgs>>): Prisma__SystemSettingsClient<$Result.GetResult<Prisma.$SystemSettingsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more SystemSettings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemSettingsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SystemSettings
     * const systemSettings = await prisma.systemSettings.findMany()
     * 
     * // Get first 10 SystemSettings
     * const systemSettings = await prisma.systemSettings.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const systemSettingsWithIdOnly = await prisma.systemSettings.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SystemSettingsFindManyArgs>(args?: SelectSubset<T, SystemSettingsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SystemSettingsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a SystemSettings.
     * @param {SystemSettingsCreateArgs} args - Arguments to create a SystemSettings.
     * @example
     * // Create one SystemSettings
     * const SystemSettings = await prisma.systemSettings.create({
     *   data: {
     *     // ... data to create a SystemSettings
     *   }
     * })
     * 
     */
    create<T extends SystemSettingsCreateArgs>(args: SelectSubset<T, SystemSettingsCreateArgs<ExtArgs>>): Prisma__SystemSettingsClient<$Result.GetResult<Prisma.$SystemSettingsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many SystemSettings.
     * @param {SystemSettingsCreateManyArgs} args - Arguments to create many SystemSettings.
     * @example
     * // Create many SystemSettings
     * const systemSettings = await prisma.systemSettings.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SystemSettingsCreateManyArgs>(args?: SelectSubset<T, SystemSettingsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SystemSettings and returns the data saved in the database.
     * @param {SystemSettingsCreateManyAndReturnArgs} args - Arguments to create many SystemSettings.
     * @example
     * // Create many SystemSettings
     * const systemSettings = await prisma.systemSettings.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SystemSettings and only return the `id`
     * const systemSettingsWithIdOnly = await prisma.systemSettings.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SystemSettingsCreateManyAndReturnArgs>(args?: SelectSubset<T, SystemSettingsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SystemSettingsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a SystemSettings.
     * @param {SystemSettingsDeleteArgs} args - Arguments to delete one SystemSettings.
     * @example
     * // Delete one SystemSettings
     * const SystemSettings = await prisma.systemSettings.delete({
     *   where: {
     *     // ... filter to delete one SystemSettings
     *   }
     * })
     * 
     */
    delete<T extends SystemSettingsDeleteArgs>(args: SelectSubset<T, SystemSettingsDeleteArgs<ExtArgs>>): Prisma__SystemSettingsClient<$Result.GetResult<Prisma.$SystemSettingsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one SystemSettings.
     * @param {SystemSettingsUpdateArgs} args - Arguments to update one SystemSettings.
     * @example
     * // Update one SystemSettings
     * const systemSettings = await prisma.systemSettings.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SystemSettingsUpdateArgs>(args: SelectSubset<T, SystemSettingsUpdateArgs<ExtArgs>>): Prisma__SystemSettingsClient<$Result.GetResult<Prisma.$SystemSettingsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more SystemSettings.
     * @param {SystemSettingsDeleteManyArgs} args - Arguments to filter SystemSettings to delete.
     * @example
     * // Delete a few SystemSettings
     * const { count } = await prisma.systemSettings.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SystemSettingsDeleteManyArgs>(args?: SelectSubset<T, SystemSettingsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SystemSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemSettingsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SystemSettings
     * const systemSettings = await prisma.systemSettings.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SystemSettingsUpdateManyArgs>(args: SelectSubset<T, SystemSettingsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SystemSettings and returns the data updated in the database.
     * @param {SystemSettingsUpdateManyAndReturnArgs} args - Arguments to update many SystemSettings.
     * @example
     * // Update many SystemSettings
     * const systemSettings = await prisma.systemSettings.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more SystemSettings and only return the `id`
     * const systemSettingsWithIdOnly = await prisma.systemSettings.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SystemSettingsUpdateManyAndReturnArgs>(args: SelectSubset<T, SystemSettingsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SystemSettingsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one SystemSettings.
     * @param {SystemSettingsUpsertArgs} args - Arguments to update or create a SystemSettings.
     * @example
     * // Update or create a SystemSettings
     * const systemSettings = await prisma.systemSettings.upsert({
     *   create: {
     *     // ... data to create a SystemSettings
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SystemSettings we want to update
     *   }
     * })
     */
    upsert<T extends SystemSettingsUpsertArgs>(args: SelectSubset<T, SystemSettingsUpsertArgs<ExtArgs>>): Prisma__SystemSettingsClient<$Result.GetResult<Prisma.$SystemSettingsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of SystemSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemSettingsCountArgs} args - Arguments to filter SystemSettings to count.
     * @example
     * // Count the number of SystemSettings
     * const count = await prisma.systemSettings.count({
     *   where: {
     *     // ... the filter for the SystemSettings we want to count
     *   }
     * })
    **/
    count<T extends SystemSettingsCountArgs>(
      args?: Subset<T, SystemSettingsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SystemSettingsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SystemSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemSettingsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SystemSettingsAggregateArgs>(args: Subset<T, SystemSettingsAggregateArgs>): Prisma.PrismaPromise<GetSystemSettingsAggregateType<T>>

    /**
     * Group by SystemSettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemSettingsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SystemSettingsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SystemSettingsGroupByArgs['orderBy'] }
        : { orderBy?: SystemSettingsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SystemSettingsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSystemSettingsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SystemSettings model
   */
  readonly fields: SystemSettingsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SystemSettings.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SystemSettingsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SystemSettings model
   */
  interface SystemSettingsFieldRefs {
    readonly id: FieldRef<"SystemSettings", 'String'>
    readonly activeEngineLvl: FieldRef<"SystemSettings", 'String'>
    readonly updatedAt: FieldRef<"SystemSettings", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SystemSettings findUnique
   */
  export type SystemSettingsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemSettings
     */
    select?: SystemSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemSettings
     */
    omit?: SystemSettingsOmit<ExtArgs> | null
    /**
     * Filter, which SystemSettings to fetch.
     */
    where: SystemSettingsWhereUniqueInput
  }

  /**
   * SystemSettings findUniqueOrThrow
   */
  export type SystemSettingsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemSettings
     */
    select?: SystemSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemSettings
     */
    omit?: SystemSettingsOmit<ExtArgs> | null
    /**
     * Filter, which SystemSettings to fetch.
     */
    where: SystemSettingsWhereUniqueInput
  }

  /**
   * SystemSettings findFirst
   */
  export type SystemSettingsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemSettings
     */
    select?: SystemSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemSettings
     */
    omit?: SystemSettingsOmit<ExtArgs> | null
    /**
     * Filter, which SystemSettings to fetch.
     */
    where?: SystemSettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SystemSettings to fetch.
     */
    orderBy?: SystemSettingsOrderByWithRelationInput | SystemSettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SystemSettings.
     */
    cursor?: SystemSettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SystemSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SystemSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SystemSettings.
     */
    distinct?: SystemSettingsScalarFieldEnum | SystemSettingsScalarFieldEnum[]
  }

  /**
   * SystemSettings findFirstOrThrow
   */
  export type SystemSettingsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemSettings
     */
    select?: SystemSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemSettings
     */
    omit?: SystemSettingsOmit<ExtArgs> | null
    /**
     * Filter, which SystemSettings to fetch.
     */
    where?: SystemSettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SystemSettings to fetch.
     */
    orderBy?: SystemSettingsOrderByWithRelationInput | SystemSettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SystemSettings.
     */
    cursor?: SystemSettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SystemSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SystemSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SystemSettings.
     */
    distinct?: SystemSettingsScalarFieldEnum | SystemSettingsScalarFieldEnum[]
  }

  /**
   * SystemSettings findMany
   */
  export type SystemSettingsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemSettings
     */
    select?: SystemSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemSettings
     */
    omit?: SystemSettingsOmit<ExtArgs> | null
    /**
     * Filter, which SystemSettings to fetch.
     */
    where?: SystemSettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SystemSettings to fetch.
     */
    orderBy?: SystemSettingsOrderByWithRelationInput | SystemSettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SystemSettings.
     */
    cursor?: SystemSettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SystemSettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SystemSettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SystemSettings.
     */
    distinct?: SystemSettingsScalarFieldEnum | SystemSettingsScalarFieldEnum[]
  }

  /**
   * SystemSettings create
   */
  export type SystemSettingsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemSettings
     */
    select?: SystemSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemSettings
     */
    omit?: SystemSettingsOmit<ExtArgs> | null
    /**
     * The data needed to create a SystemSettings.
     */
    data: XOR<SystemSettingsCreateInput, SystemSettingsUncheckedCreateInput>
  }

  /**
   * SystemSettings createMany
   */
  export type SystemSettingsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SystemSettings.
     */
    data: SystemSettingsCreateManyInput | SystemSettingsCreateManyInput[]
  }

  /**
   * SystemSettings createManyAndReturn
   */
  export type SystemSettingsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemSettings
     */
    select?: SystemSettingsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SystemSettings
     */
    omit?: SystemSettingsOmit<ExtArgs> | null
    /**
     * The data used to create many SystemSettings.
     */
    data: SystemSettingsCreateManyInput | SystemSettingsCreateManyInput[]
  }

  /**
   * SystemSettings update
   */
  export type SystemSettingsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemSettings
     */
    select?: SystemSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemSettings
     */
    omit?: SystemSettingsOmit<ExtArgs> | null
    /**
     * The data needed to update a SystemSettings.
     */
    data: XOR<SystemSettingsUpdateInput, SystemSettingsUncheckedUpdateInput>
    /**
     * Choose, which SystemSettings to update.
     */
    where: SystemSettingsWhereUniqueInput
  }

  /**
   * SystemSettings updateMany
   */
  export type SystemSettingsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SystemSettings.
     */
    data: XOR<SystemSettingsUpdateManyMutationInput, SystemSettingsUncheckedUpdateManyInput>
    /**
     * Filter which SystemSettings to update
     */
    where?: SystemSettingsWhereInput
    /**
     * Limit how many SystemSettings to update.
     */
    limit?: number
  }

  /**
   * SystemSettings updateManyAndReturn
   */
  export type SystemSettingsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemSettings
     */
    select?: SystemSettingsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SystemSettings
     */
    omit?: SystemSettingsOmit<ExtArgs> | null
    /**
     * The data used to update SystemSettings.
     */
    data: XOR<SystemSettingsUpdateManyMutationInput, SystemSettingsUncheckedUpdateManyInput>
    /**
     * Filter which SystemSettings to update
     */
    where?: SystemSettingsWhereInput
    /**
     * Limit how many SystemSettings to update.
     */
    limit?: number
  }

  /**
   * SystemSettings upsert
   */
  export type SystemSettingsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemSettings
     */
    select?: SystemSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemSettings
     */
    omit?: SystemSettingsOmit<ExtArgs> | null
    /**
     * The filter to search for the SystemSettings to update in case it exists.
     */
    where: SystemSettingsWhereUniqueInput
    /**
     * In case the SystemSettings found by the `where` argument doesn't exist, create a new SystemSettings with this data.
     */
    create: XOR<SystemSettingsCreateInput, SystemSettingsUncheckedCreateInput>
    /**
     * In case the SystemSettings was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SystemSettingsUpdateInput, SystemSettingsUncheckedUpdateInput>
  }

  /**
   * SystemSettings delete
   */
  export type SystemSettingsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemSettings
     */
    select?: SystemSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemSettings
     */
    omit?: SystemSettingsOmit<ExtArgs> | null
    /**
     * Filter which SystemSettings to delete.
     */
    where: SystemSettingsWhereUniqueInput
  }

  /**
   * SystemSettings deleteMany
   */
  export type SystemSettingsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SystemSettings to delete
     */
    where?: SystemSettingsWhereInput
    /**
     * Limit how many SystemSettings to delete.
     */
    limit?: number
  }

  /**
   * SystemSettings without action
   */
  export type SystemSettingsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemSettings
     */
    select?: SystemSettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemSettings
     */
    omit?: SystemSettingsOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    name: 'name',
    email: 'email',
    passwordHash: 'passwordHash',
    aiTier: 'aiTier',
    routingLevel: 'routingLevel',
    defaultViewId: 'defaultViewId',
    settings: 'settings',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const SessionScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    tokenHash: 'tokenHash',
    userAgent: 'userAgent',
    ip: 'ip',
    lastSeenAt: 'lastSeenAt',
    createdAt: 'createdAt',
    expiresAt: 'expiresAt'
  };

  export type SessionScalarFieldEnum = (typeof SessionScalarFieldEnum)[keyof typeof SessionScalarFieldEnum]


  export const AccountScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    name: 'name',
    type: 'type',
    currentBalance: 'currentBalance',
    institution: 'institution',
    mask: 'mask',
    routingEnabled: 'routingEnabled',
    isArchived: 'isArchived',
    sortOrder: 'sortOrder',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type AccountScalarFieldEnum = (typeof AccountScalarFieldEnum)[keyof typeof AccountScalarFieldEnum]


  export const EnvelopeScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    name: 'name',
    targetBalance: 'targetBalance',
    currentBalance: 'currentBalance',
    planet: 'planet',
    color: 'color',
    icon: 'icon',
    destinationAccountId: 'destinationAccountId',
    enforceHardCap: 'enforceHardCap',
    sortOrder: 'sortOrder',
    isArchived: 'isArchived',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type EnvelopeScalarFieldEnum = (typeof EnvelopeScalarFieldEnum)[keyof typeof EnvelopeScalarFieldEnum]


  export const TransactionScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    accountId: 'accountId',
    envelopeId: 'envelopeId',
    amount: 'amount',
    date: 'date',
    payee: 'payee',
    notes: 'notes',
    source: 'source',
    metadata: 'metadata',
    isPrimaMateria: 'isPrimaMateria',
    fromPlanId: 'fromPlanId',
    fromPaycheckId: 'fromPaycheckId',
    cleared: 'cleared',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TransactionScalarFieldEnum = (typeof TransactionScalarFieldEnum)[keyof typeof TransactionScalarFieldEnum]


  export const PayScheduleScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    cadence: 'cadence',
    amount: 'amount',
    accountId: 'accountId',
    startDate: 'startDate',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type PayScheduleScalarFieldEnum = (typeof PayScheduleScalarFieldEnum)[keyof typeof PayScheduleScalarFieldEnum]


  export const GoalScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    name: 'name',
    description: 'description',
    targetAmount: 'targetAmount',
    currentAmount: 'currentAmount',
    targetDate: 'targetDate',
    envelopeId: 'envelopeId',
    planet: 'planet',
    isPrimary: 'isPrimary',
    kind: 'kind',
    sortOrder: 'sortOrder',
    isArchived: 'isArchived',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type GoalScalarFieldEnum = (typeof GoalScalarFieldEnum)[keyof typeof GoalScalarFieldEnum]


  export const AllocationPlanScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    strategyId: 'strategyId',
    isArmed: 'isArmed',
    name: 'name',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type AllocationPlanScalarFieldEnum = (typeof AllocationPlanScalarFieldEnum)[keyof typeof AllocationPlanScalarFieldEnum]


  export const AllocationRuleScalarFieldEnum: {
    id: 'id',
    planId: 'planId',
    envelopeId: 'envelopeId',
    pct: 'pct',
    fixedCents: 'fixedCents',
    sortOrder: 'sortOrder',
    createdAt: 'createdAt'
  };

  export type AllocationRuleScalarFieldEnum = (typeof AllocationRuleScalarFieldEnum)[keyof typeof AllocationRuleScalarFieldEnum]


  export const AuditLogScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    actionType: 'actionType',
    payload: 'payload',
    aiTierAtTime: 'aiTierAtTime',
    createdAt: 'createdAt'
  };

  export type AuditLogScalarFieldEnum = (typeof AuditLogScalarFieldEnum)[keyof typeof AuditLogScalarFieldEnum]


  export const SystemSettingsScalarFieldEnum: {
    id: 'id',
    activeEngineLvl: 'activeEngineLvl',
    updatedAt: 'updatedAt'
  };

  export type SystemSettingsScalarFieldEnum = (typeof SystemSettingsScalarFieldEnum)[keyof typeof SystemSettingsScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'GoalKind'
   */
  export type EnumGoalKindFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'GoalKind'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    name?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    passwordHash?: StringFilter<"User"> | string
    aiTier?: IntFilter<"User"> | number
    routingLevel?: IntFilter<"User"> | number
    defaultViewId?: StringNullableFilter<"User"> | string | null
    settings?: StringFilter<"User"> | string
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    sessions?: SessionListRelationFilter
    accounts?: AccountListRelationFilter
    envelopes?: EnvelopeListRelationFilter
    transactions?: TransactionListRelationFilter
    paySchedules?: PayScheduleListRelationFilter
    goals?: GoalListRelationFilter
    allocationPlans?: AllocationPlanListRelationFilter
    auditLog?: AuditLogListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    aiTier?: SortOrder
    routingLevel?: SortOrder
    defaultViewId?: SortOrderInput | SortOrder
    settings?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    sessions?: SessionOrderByRelationAggregateInput
    accounts?: AccountOrderByRelationAggregateInput
    envelopes?: EnvelopeOrderByRelationAggregateInput
    transactions?: TransactionOrderByRelationAggregateInput
    paySchedules?: PayScheduleOrderByRelationAggregateInput
    goals?: GoalOrderByRelationAggregateInput
    allocationPlans?: AllocationPlanOrderByRelationAggregateInput
    auditLog?: AuditLogOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    name?: StringFilter<"User"> | string
    passwordHash?: StringFilter<"User"> | string
    aiTier?: IntFilter<"User"> | number
    routingLevel?: IntFilter<"User"> | number
    defaultViewId?: StringNullableFilter<"User"> | string | null
    settings?: StringFilter<"User"> | string
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    sessions?: SessionListRelationFilter
    accounts?: AccountListRelationFilter
    envelopes?: EnvelopeListRelationFilter
    transactions?: TransactionListRelationFilter
    paySchedules?: PayScheduleListRelationFilter
    goals?: GoalListRelationFilter
    allocationPlans?: AllocationPlanListRelationFilter
    auditLog?: AuditLogListRelationFilter
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    aiTier?: SortOrder
    routingLevel?: SortOrder
    defaultViewId?: SortOrderInput | SortOrder
    settings?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _avg?: UserAvgOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
    _sum?: UserSumOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    name?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    passwordHash?: StringWithAggregatesFilter<"User"> | string
    aiTier?: IntWithAggregatesFilter<"User"> | number
    routingLevel?: IntWithAggregatesFilter<"User"> | number
    defaultViewId?: StringNullableWithAggregatesFilter<"User"> | string | null
    settings?: StringWithAggregatesFilter<"User"> | string
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type SessionWhereInput = {
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    id?: StringFilter<"Session"> | string
    userId?: StringFilter<"Session"> | string
    tokenHash?: StringFilter<"Session"> | string
    userAgent?: StringNullableFilter<"Session"> | string | null
    ip?: StringNullableFilter<"Session"> | string | null
    lastSeenAt?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    expiresAt?: DateTimeFilter<"Session"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type SessionOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    tokenHash?: SortOrder
    userAgent?: SortOrderInput | SortOrder
    ip?: SortOrderInput | SortOrder
    lastSeenAt?: SortOrder
    createdAt?: SortOrder
    expiresAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type SessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    tokenHash?: string
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    userId?: StringFilter<"Session"> | string
    userAgent?: StringNullableFilter<"Session"> | string | null
    ip?: StringNullableFilter<"Session"> | string | null
    lastSeenAt?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    expiresAt?: DateTimeFilter<"Session"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "tokenHash">

  export type SessionOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    tokenHash?: SortOrder
    userAgent?: SortOrderInput | SortOrder
    ip?: SortOrderInput | SortOrder
    lastSeenAt?: SortOrder
    createdAt?: SortOrder
    expiresAt?: SortOrder
    _count?: SessionCountOrderByAggregateInput
    _max?: SessionMaxOrderByAggregateInput
    _min?: SessionMinOrderByAggregateInput
  }

  export type SessionScalarWhereWithAggregatesInput = {
    AND?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    OR?: SessionScalarWhereWithAggregatesInput[]
    NOT?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Session"> | string
    userId?: StringWithAggregatesFilter<"Session"> | string
    tokenHash?: StringWithAggregatesFilter<"Session"> | string
    userAgent?: StringNullableWithAggregatesFilter<"Session"> | string | null
    ip?: StringNullableWithAggregatesFilter<"Session"> | string | null
    lastSeenAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
    expiresAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
  }

  export type AccountWhereInput = {
    AND?: AccountWhereInput | AccountWhereInput[]
    OR?: AccountWhereInput[]
    NOT?: AccountWhereInput | AccountWhereInput[]
    id?: StringFilter<"Account"> | string
    userId?: StringFilter<"Account"> | string
    name?: StringFilter<"Account"> | string
    type?: StringFilter<"Account"> | string
    currentBalance?: IntFilter<"Account"> | number
    institution?: StringNullableFilter<"Account"> | string | null
    mask?: StringNullableFilter<"Account"> | string | null
    routingEnabled?: BoolFilter<"Account"> | boolean
    isArchived?: BoolFilter<"Account"> | boolean
    sortOrder?: IntFilter<"Account"> | number
    createdAt?: DateTimeFilter<"Account"> | Date | string
    updatedAt?: DateTimeFilter<"Account"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    transactions?: TransactionListRelationFilter
    paySchedules?: PayScheduleListRelationFilter
  }

  export type AccountOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    currentBalance?: SortOrder
    institution?: SortOrderInput | SortOrder
    mask?: SortOrderInput | SortOrder
    routingEnabled?: SortOrder
    isArchived?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    transactions?: TransactionOrderByRelationAggregateInput
    paySchedules?: PayScheduleOrderByRelationAggregateInput
  }

  export type AccountWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AccountWhereInput | AccountWhereInput[]
    OR?: AccountWhereInput[]
    NOT?: AccountWhereInput | AccountWhereInput[]
    userId?: StringFilter<"Account"> | string
    name?: StringFilter<"Account"> | string
    type?: StringFilter<"Account"> | string
    currentBalance?: IntFilter<"Account"> | number
    institution?: StringNullableFilter<"Account"> | string | null
    mask?: StringNullableFilter<"Account"> | string | null
    routingEnabled?: BoolFilter<"Account"> | boolean
    isArchived?: BoolFilter<"Account"> | boolean
    sortOrder?: IntFilter<"Account"> | number
    createdAt?: DateTimeFilter<"Account"> | Date | string
    updatedAt?: DateTimeFilter<"Account"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    transactions?: TransactionListRelationFilter
    paySchedules?: PayScheduleListRelationFilter
  }, "id">

  export type AccountOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    currentBalance?: SortOrder
    institution?: SortOrderInput | SortOrder
    mask?: SortOrderInput | SortOrder
    routingEnabled?: SortOrder
    isArchived?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AccountCountOrderByAggregateInput
    _avg?: AccountAvgOrderByAggregateInput
    _max?: AccountMaxOrderByAggregateInput
    _min?: AccountMinOrderByAggregateInput
    _sum?: AccountSumOrderByAggregateInput
  }

  export type AccountScalarWhereWithAggregatesInput = {
    AND?: AccountScalarWhereWithAggregatesInput | AccountScalarWhereWithAggregatesInput[]
    OR?: AccountScalarWhereWithAggregatesInput[]
    NOT?: AccountScalarWhereWithAggregatesInput | AccountScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Account"> | string
    userId?: StringWithAggregatesFilter<"Account"> | string
    name?: StringWithAggregatesFilter<"Account"> | string
    type?: StringWithAggregatesFilter<"Account"> | string
    currentBalance?: IntWithAggregatesFilter<"Account"> | number
    institution?: StringNullableWithAggregatesFilter<"Account"> | string | null
    mask?: StringNullableWithAggregatesFilter<"Account"> | string | null
    routingEnabled?: BoolWithAggregatesFilter<"Account"> | boolean
    isArchived?: BoolWithAggregatesFilter<"Account"> | boolean
    sortOrder?: IntWithAggregatesFilter<"Account"> | number
    createdAt?: DateTimeWithAggregatesFilter<"Account"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Account"> | Date | string
  }

  export type EnvelopeWhereInput = {
    AND?: EnvelopeWhereInput | EnvelopeWhereInput[]
    OR?: EnvelopeWhereInput[]
    NOT?: EnvelopeWhereInput | EnvelopeWhereInput[]
    id?: StringFilter<"Envelope"> | string
    userId?: StringFilter<"Envelope"> | string
    name?: StringFilter<"Envelope"> | string
    targetBalance?: IntFilter<"Envelope"> | number
    currentBalance?: IntFilter<"Envelope"> | number
    planet?: StringNullableFilter<"Envelope"> | string | null
    color?: StringNullableFilter<"Envelope"> | string | null
    icon?: StringNullableFilter<"Envelope"> | string | null
    destinationAccountId?: StringNullableFilter<"Envelope"> | string | null
    enforceHardCap?: BoolFilter<"Envelope"> | boolean
    sortOrder?: IntFilter<"Envelope"> | number
    isArchived?: BoolFilter<"Envelope"> | boolean
    createdAt?: DateTimeFilter<"Envelope"> | Date | string
    updatedAt?: DateTimeFilter<"Envelope"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    transactions?: TransactionListRelationFilter
    allocationRules?: AllocationRuleListRelationFilter
  }

  export type EnvelopeOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    targetBalance?: SortOrder
    currentBalance?: SortOrder
    planet?: SortOrderInput | SortOrder
    color?: SortOrderInput | SortOrder
    icon?: SortOrderInput | SortOrder
    destinationAccountId?: SortOrderInput | SortOrder
    enforceHardCap?: SortOrder
    sortOrder?: SortOrder
    isArchived?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    transactions?: TransactionOrderByRelationAggregateInput
    allocationRules?: AllocationRuleOrderByRelationAggregateInput
  }

  export type EnvelopeWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: EnvelopeWhereInput | EnvelopeWhereInput[]
    OR?: EnvelopeWhereInput[]
    NOT?: EnvelopeWhereInput | EnvelopeWhereInput[]
    userId?: StringFilter<"Envelope"> | string
    name?: StringFilter<"Envelope"> | string
    targetBalance?: IntFilter<"Envelope"> | number
    currentBalance?: IntFilter<"Envelope"> | number
    planet?: StringNullableFilter<"Envelope"> | string | null
    color?: StringNullableFilter<"Envelope"> | string | null
    icon?: StringNullableFilter<"Envelope"> | string | null
    destinationAccountId?: StringNullableFilter<"Envelope"> | string | null
    enforceHardCap?: BoolFilter<"Envelope"> | boolean
    sortOrder?: IntFilter<"Envelope"> | number
    isArchived?: BoolFilter<"Envelope"> | boolean
    createdAt?: DateTimeFilter<"Envelope"> | Date | string
    updatedAt?: DateTimeFilter<"Envelope"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    transactions?: TransactionListRelationFilter
    allocationRules?: AllocationRuleListRelationFilter
  }, "id">

  export type EnvelopeOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    targetBalance?: SortOrder
    currentBalance?: SortOrder
    planet?: SortOrderInput | SortOrder
    color?: SortOrderInput | SortOrder
    icon?: SortOrderInput | SortOrder
    destinationAccountId?: SortOrderInput | SortOrder
    enforceHardCap?: SortOrder
    sortOrder?: SortOrder
    isArchived?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: EnvelopeCountOrderByAggregateInput
    _avg?: EnvelopeAvgOrderByAggregateInput
    _max?: EnvelopeMaxOrderByAggregateInput
    _min?: EnvelopeMinOrderByAggregateInput
    _sum?: EnvelopeSumOrderByAggregateInput
  }

  export type EnvelopeScalarWhereWithAggregatesInput = {
    AND?: EnvelopeScalarWhereWithAggregatesInput | EnvelopeScalarWhereWithAggregatesInput[]
    OR?: EnvelopeScalarWhereWithAggregatesInput[]
    NOT?: EnvelopeScalarWhereWithAggregatesInput | EnvelopeScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Envelope"> | string
    userId?: StringWithAggregatesFilter<"Envelope"> | string
    name?: StringWithAggregatesFilter<"Envelope"> | string
    targetBalance?: IntWithAggregatesFilter<"Envelope"> | number
    currentBalance?: IntWithAggregatesFilter<"Envelope"> | number
    planet?: StringNullableWithAggregatesFilter<"Envelope"> | string | null
    color?: StringNullableWithAggregatesFilter<"Envelope"> | string | null
    icon?: StringNullableWithAggregatesFilter<"Envelope"> | string | null
    destinationAccountId?: StringNullableWithAggregatesFilter<"Envelope"> | string | null
    enforceHardCap?: BoolWithAggregatesFilter<"Envelope"> | boolean
    sortOrder?: IntWithAggregatesFilter<"Envelope"> | number
    isArchived?: BoolWithAggregatesFilter<"Envelope"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"Envelope"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Envelope"> | Date | string
  }

  export type TransactionWhereInput = {
    AND?: TransactionWhereInput | TransactionWhereInput[]
    OR?: TransactionWhereInput[]
    NOT?: TransactionWhereInput | TransactionWhereInput[]
    id?: StringFilter<"Transaction"> | string
    userId?: StringFilter<"Transaction"> | string
    accountId?: StringFilter<"Transaction"> | string
    envelopeId?: StringNullableFilter<"Transaction"> | string | null
    amount?: IntFilter<"Transaction"> | number
    date?: DateTimeFilter<"Transaction"> | Date | string
    payee?: StringFilter<"Transaction"> | string
    notes?: StringNullableFilter<"Transaction"> | string | null
    source?: StringFilter<"Transaction"> | string
    metadata?: StringFilter<"Transaction"> | string
    isPrimaMateria?: BoolFilter<"Transaction"> | boolean
    fromPlanId?: StringNullableFilter<"Transaction"> | string | null
    fromPaycheckId?: StringNullableFilter<"Transaction"> | string | null
    cleared?: BoolFilter<"Transaction"> | boolean
    createdAt?: DateTimeFilter<"Transaction"> | Date | string
    updatedAt?: DateTimeFilter<"Transaction"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    account?: XOR<AccountScalarRelationFilter, AccountWhereInput>
    envelope?: XOR<EnvelopeNullableScalarRelationFilter, EnvelopeWhereInput> | null
  }

  export type TransactionOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    accountId?: SortOrder
    envelopeId?: SortOrderInput | SortOrder
    amount?: SortOrder
    date?: SortOrder
    payee?: SortOrder
    notes?: SortOrderInput | SortOrder
    source?: SortOrder
    metadata?: SortOrder
    isPrimaMateria?: SortOrder
    fromPlanId?: SortOrderInput | SortOrder
    fromPaycheckId?: SortOrderInput | SortOrder
    cleared?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    account?: AccountOrderByWithRelationInput
    envelope?: EnvelopeOrderByWithRelationInput
  }

  export type TransactionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TransactionWhereInput | TransactionWhereInput[]
    OR?: TransactionWhereInput[]
    NOT?: TransactionWhereInput | TransactionWhereInput[]
    userId?: StringFilter<"Transaction"> | string
    accountId?: StringFilter<"Transaction"> | string
    envelopeId?: StringNullableFilter<"Transaction"> | string | null
    amount?: IntFilter<"Transaction"> | number
    date?: DateTimeFilter<"Transaction"> | Date | string
    payee?: StringFilter<"Transaction"> | string
    notes?: StringNullableFilter<"Transaction"> | string | null
    source?: StringFilter<"Transaction"> | string
    metadata?: StringFilter<"Transaction"> | string
    isPrimaMateria?: BoolFilter<"Transaction"> | boolean
    fromPlanId?: StringNullableFilter<"Transaction"> | string | null
    fromPaycheckId?: StringNullableFilter<"Transaction"> | string | null
    cleared?: BoolFilter<"Transaction"> | boolean
    createdAt?: DateTimeFilter<"Transaction"> | Date | string
    updatedAt?: DateTimeFilter<"Transaction"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    account?: XOR<AccountScalarRelationFilter, AccountWhereInput>
    envelope?: XOR<EnvelopeNullableScalarRelationFilter, EnvelopeWhereInput> | null
  }, "id">

  export type TransactionOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    accountId?: SortOrder
    envelopeId?: SortOrderInput | SortOrder
    amount?: SortOrder
    date?: SortOrder
    payee?: SortOrder
    notes?: SortOrderInput | SortOrder
    source?: SortOrder
    metadata?: SortOrder
    isPrimaMateria?: SortOrder
    fromPlanId?: SortOrderInput | SortOrder
    fromPaycheckId?: SortOrderInput | SortOrder
    cleared?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TransactionCountOrderByAggregateInput
    _avg?: TransactionAvgOrderByAggregateInput
    _max?: TransactionMaxOrderByAggregateInput
    _min?: TransactionMinOrderByAggregateInput
    _sum?: TransactionSumOrderByAggregateInput
  }

  export type TransactionScalarWhereWithAggregatesInput = {
    AND?: TransactionScalarWhereWithAggregatesInput | TransactionScalarWhereWithAggregatesInput[]
    OR?: TransactionScalarWhereWithAggregatesInput[]
    NOT?: TransactionScalarWhereWithAggregatesInput | TransactionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Transaction"> | string
    userId?: StringWithAggregatesFilter<"Transaction"> | string
    accountId?: StringWithAggregatesFilter<"Transaction"> | string
    envelopeId?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    amount?: IntWithAggregatesFilter<"Transaction"> | number
    date?: DateTimeWithAggregatesFilter<"Transaction"> | Date | string
    payee?: StringWithAggregatesFilter<"Transaction"> | string
    notes?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    source?: StringWithAggregatesFilter<"Transaction"> | string
    metadata?: StringWithAggregatesFilter<"Transaction"> | string
    isPrimaMateria?: BoolWithAggregatesFilter<"Transaction"> | boolean
    fromPlanId?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    fromPaycheckId?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    cleared?: BoolWithAggregatesFilter<"Transaction"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"Transaction"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Transaction"> | Date | string
  }

  export type PayScheduleWhereInput = {
    AND?: PayScheduleWhereInput | PayScheduleWhereInput[]
    OR?: PayScheduleWhereInput[]
    NOT?: PayScheduleWhereInput | PayScheduleWhereInput[]
    id?: StringFilter<"PaySchedule"> | string
    userId?: StringFilter<"PaySchedule"> | string
    cadence?: StringFilter<"PaySchedule"> | string
    amount?: IntFilter<"PaySchedule"> | number
    accountId?: StringFilter<"PaySchedule"> | string
    startDate?: DateTimeFilter<"PaySchedule"> | Date | string
    isActive?: BoolFilter<"PaySchedule"> | boolean
    createdAt?: DateTimeFilter<"PaySchedule"> | Date | string
    updatedAt?: DateTimeFilter<"PaySchedule"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    account?: XOR<AccountScalarRelationFilter, AccountWhereInput>
  }

  export type PayScheduleOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    cadence?: SortOrder
    amount?: SortOrder
    accountId?: SortOrder
    startDate?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    account?: AccountOrderByWithRelationInput
  }

  export type PayScheduleWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: PayScheduleWhereInput | PayScheduleWhereInput[]
    OR?: PayScheduleWhereInput[]
    NOT?: PayScheduleWhereInput | PayScheduleWhereInput[]
    userId?: StringFilter<"PaySchedule"> | string
    cadence?: StringFilter<"PaySchedule"> | string
    amount?: IntFilter<"PaySchedule"> | number
    accountId?: StringFilter<"PaySchedule"> | string
    startDate?: DateTimeFilter<"PaySchedule"> | Date | string
    isActive?: BoolFilter<"PaySchedule"> | boolean
    createdAt?: DateTimeFilter<"PaySchedule"> | Date | string
    updatedAt?: DateTimeFilter<"PaySchedule"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    account?: XOR<AccountScalarRelationFilter, AccountWhereInput>
  }, "id">

  export type PayScheduleOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    cadence?: SortOrder
    amount?: SortOrder
    accountId?: SortOrder
    startDate?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: PayScheduleCountOrderByAggregateInput
    _avg?: PayScheduleAvgOrderByAggregateInput
    _max?: PayScheduleMaxOrderByAggregateInput
    _min?: PayScheduleMinOrderByAggregateInput
    _sum?: PayScheduleSumOrderByAggregateInput
  }

  export type PayScheduleScalarWhereWithAggregatesInput = {
    AND?: PayScheduleScalarWhereWithAggregatesInput | PayScheduleScalarWhereWithAggregatesInput[]
    OR?: PayScheduleScalarWhereWithAggregatesInput[]
    NOT?: PayScheduleScalarWhereWithAggregatesInput | PayScheduleScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"PaySchedule"> | string
    userId?: StringWithAggregatesFilter<"PaySchedule"> | string
    cadence?: StringWithAggregatesFilter<"PaySchedule"> | string
    amount?: IntWithAggregatesFilter<"PaySchedule"> | number
    accountId?: StringWithAggregatesFilter<"PaySchedule"> | string
    startDate?: DateTimeWithAggregatesFilter<"PaySchedule"> | Date | string
    isActive?: BoolWithAggregatesFilter<"PaySchedule"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"PaySchedule"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"PaySchedule"> | Date | string
  }

  export type GoalWhereInput = {
    AND?: GoalWhereInput | GoalWhereInput[]
    OR?: GoalWhereInput[]
    NOT?: GoalWhereInput | GoalWhereInput[]
    id?: StringFilter<"Goal"> | string
    userId?: StringFilter<"Goal"> | string
    name?: StringFilter<"Goal"> | string
    description?: StringNullableFilter<"Goal"> | string | null
    targetAmount?: IntFilter<"Goal"> | number
    currentAmount?: IntFilter<"Goal"> | number
    targetDate?: DateTimeNullableFilter<"Goal"> | Date | string | null
    envelopeId?: StringNullableFilter<"Goal"> | string | null
    planet?: StringNullableFilter<"Goal"> | string | null
    isPrimary?: BoolFilter<"Goal"> | boolean
    kind?: EnumGoalKindFilter<"Goal"> | $Enums.GoalKind
    sortOrder?: IntFilter<"Goal"> | number
    isArchived?: BoolFilter<"Goal"> | boolean
    createdAt?: DateTimeFilter<"Goal"> | Date | string
    updatedAt?: DateTimeFilter<"Goal"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type GoalOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    targetAmount?: SortOrder
    currentAmount?: SortOrder
    targetDate?: SortOrderInput | SortOrder
    envelopeId?: SortOrderInput | SortOrder
    planet?: SortOrderInput | SortOrder
    isPrimary?: SortOrder
    kind?: SortOrder
    sortOrder?: SortOrder
    isArchived?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type GoalWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: GoalWhereInput | GoalWhereInput[]
    OR?: GoalWhereInput[]
    NOT?: GoalWhereInput | GoalWhereInput[]
    userId?: StringFilter<"Goal"> | string
    name?: StringFilter<"Goal"> | string
    description?: StringNullableFilter<"Goal"> | string | null
    targetAmount?: IntFilter<"Goal"> | number
    currentAmount?: IntFilter<"Goal"> | number
    targetDate?: DateTimeNullableFilter<"Goal"> | Date | string | null
    envelopeId?: StringNullableFilter<"Goal"> | string | null
    planet?: StringNullableFilter<"Goal"> | string | null
    isPrimary?: BoolFilter<"Goal"> | boolean
    kind?: EnumGoalKindFilter<"Goal"> | $Enums.GoalKind
    sortOrder?: IntFilter<"Goal"> | number
    isArchived?: BoolFilter<"Goal"> | boolean
    createdAt?: DateTimeFilter<"Goal"> | Date | string
    updatedAt?: DateTimeFilter<"Goal"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id">

  export type GoalOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    targetAmount?: SortOrder
    currentAmount?: SortOrder
    targetDate?: SortOrderInput | SortOrder
    envelopeId?: SortOrderInput | SortOrder
    planet?: SortOrderInput | SortOrder
    isPrimary?: SortOrder
    kind?: SortOrder
    sortOrder?: SortOrder
    isArchived?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: GoalCountOrderByAggregateInput
    _avg?: GoalAvgOrderByAggregateInput
    _max?: GoalMaxOrderByAggregateInput
    _min?: GoalMinOrderByAggregateInput
    _sum?: GoalSumOrderByAggregateInput
  }

  export type GoalScalarWhereWithAggregatesInput = {
    AND?: GoalScalarWhereWithAggregatesInput | GoalScalarWhereWithAggregatesInput[]
    OR?: GoalScalarWhereWithAggregatesInput[]
    NOT?: GoalScalarWhereWithAggregatesInput | GoalScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Goal"> | string
    userId?: StringWithAggregatesFilter<"Goal"> | string
    name?: StringWithAggregatesFilter<"Goal"> | string
    description?: StringNullableWithAggregatesFilter<"Goal"> | string | null
    targetAmount?: IntWithAggregatesFilter<"Goal"> | number
    currentAmount?: IntWithAggregatesFilter<"Goal"> | number
    targetDate?: DateTimeNullableWithAggregatesFilter<"Goal"> | Date | string | null
    envelopeId?: StringNullableWithAggregatesFilter<"Goal"> | string | null
    planet?: StringNullableWithAggregatesFilter<"Goal"> | string | null
    isPrimary?: BoolWithAggregatesFilter<"Goal"> | boolean
    kind?: EnumGoalKindWithAggregatesFilter<"Goal"> | $Enums.GoalKind
    sortOrder?: IntWithAggregatesFilter<"Goal"> | number
    isArchived?: BoolWithAggregatesFilter<"Goal"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"Goal"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Goal"> | Date | string
  }

  export type AllocationPlanWhereInput = {
    AND?: AllocationPlanWhereInput | AllocationPlanWhereInput[]
    OR?: AllocationPlanWhereInput[]
    NOT?: AllocationPlanWhereInput | AllocationPlanWhereInput[]
    id?: StringFilter<"AllocationPlan"> | string
    userId?: StringFilter<"AllocationPlan"> | string
    strategyId?: StringFilter<"AllocationPlan"> | string
    isArmed?: BoolFilter<"AllocationPlan"> | boolean
    name?: StringNullableFilter<"AllocationPlan"> | string | null
    createdAt?: DateTimeFilter<"AllocationPlan"> | Date | string
    updatedAt?: DateTimeFilter<"AllocationPlan"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    rules?: AllocationRuleListRelationFilter
  }

  export type AllocationPlanOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    strategyId?: SortOrder
    isArmed?: SortOrder
    name?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    rules?: AllocationRuleOrderByRelationAggregateInput
  }

  export type AllocationPlanWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AllocationPlanWhereInput | AllocationPlanWhereInput[]
    OR?: AllocationPlanWhereInput[]
    NOT?: AllocationPlanWhereInput | AllocationPlanWhereInput[]
    userId?: StringFilter<"AllocationPlan"> | string
    strategyId?: StringFilter<"AllocationPlan"> | string
    isArmed?: BoolFilter<"AllocationPlan"> | boolean
    name?: StringNullableFilter<"AllocationPlan"> | string | null
    createdAt?: DateTimeFilter<"AllocationPlan"> | Date | string
    updatedAt?: DateTimeFilter<"AllocationPlan"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    rules?: AllocationRuleListRelationFilter
  }, "id">

  export type AllocationPlanOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    strategyId?: SortOrder
    isArmed?: SortOrder
    name?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AllocationPlanCountOrderByAggregateInput
    _max?: AllocationPlanMaxOrderByAggregateInput
    _min?: AllocationPlanMinOrderByAggregateInput
  }

  export type AllocationPlanScalarWhereWithAggregatesInput = {
    AND?: AllocationPlanScalarWhereWithAggregatesInput | AllocationPlanScalarWhereWithAggregatesInput[]
    OR?: AllocationPlanScalarWhereWithAggregatesInput[]
    NOT?: AllocationPlanScalarWhereWithAggregatesInput | AllocationPlanScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AllocationPlan"> | string
    userId?: StringWithAggregatesFilter<"AllocationPlan"> | string
    strategyId?: StringWithAggregatesFilter<"AllocationPlan"> | string
    isArmed?: BoolWithAggregatesFilter<"AllocationPlan"> | boolean
    name?: StringNullableWithAggregatesFilter<"AllocationPlan"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"AllocationPlan"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"AllocationPlan"> | Date | string
  }

  export type AllocationRuleWhereInput = {
    AND?: AllocationRuleWhereInput | AllocationRuleWhereInput[]
    OR?: AllocationRuleWhereInput[]
    NOT?: AllocationRuleWhereInput | AllocationRuleWhereInput[]
    id?: StringFilter<"AllocationRule"> | string
    planId?: StringFilter<"AllocationRule"> | string
    envelopeId?: StringFilter<"AllocationRule"> | string
    pct?: IntFilter<"AllocationRule"> | number
    fixedCents?: IntNullableFilter<"AllocationRule"> | number | null
    sortOrder?: IntFilter<"AllocationRule"> | number
    createdAt?: DateTimeFilter<"AllocationRule"> | Date | string
    plan?: XOR<AllocationPlanScalarRelationFilter, AllocationPlanWhereInput>
    envelope?: XOR<EnvelopeScalarRelationFilter, EnvelopeWhereInput>
  }

  export type AllocationRuleOrderByWithRelationInput = {
    id?: SortOrder
    planId?: SortOrder
    envelopeId?: SortOrder
    pct?: SortOrder
    fixedCents?: SortOrderInput | SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
    plan?: AllocationPlanOrderByWithRelationInput
    envelope?: EnvelopeOrderByWithRelationInput
  }

  export type AllocationRuleWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AllocationRuleWhereInput | AllocationRuleWhereInput[]
    OR?: AllocationRuleWhereInput[]
    NOT?: AllocationRuleWhereInput | AllocationRuleWhereInput[]
    planId?: StringFilter<"AllocationRule"> | string
    envelopeId?: StringFilter<"AllocationRule"> | string
    pct?: IntFilter<"AllocationRule"> | number
    fixedCents?: IntNullableFilter<"AllocationRule"> | number | null
    sortOrder?: IntFilter<"AllocationRule"> | number
    createdAt?: DateTimeFilter<"AllocationRule"> | Date | string
    plan?: XOR<AllocationPlanScalarRelationFilter, AllocationPlanWhereInput>
    envelope?: XOR<EnvelopeScalarRelationFilter, EnvelopeWhereInput>
  }, "id">

  export type AllocationRuleOrderByWithAggregationInput = {
    id?: SortOrder
    planId?: SortOrder
    envelopeId?: SortOrder
    pct?: SortOrder
    fixedCents?: SortOrderInput | SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
    _count?: AllocationRuleCountOrderByAggregateInput
    _avg?: AllocationRuleAvgOrderByAggregateInput
    _max?: AllocationRuleMaxOrderByAggregateInput
    _min?: AllocationRuleMinOrderByAggregateInput
    _sum?: AllocationRuleSumOrderByAggregateInput
  }

  export type AllocationRuleScalarWhereWithAggregatesInput = {
    AND?: AllocationRuleScalarWhereWithAggregatesInput | AllocationRuleScalarWhereWithAggregatesInput[]
    OR?: AllocationRuleScalarWhereWithAggregatesInput[]
    NOT?: AllocationRuleScalarWhereWithAggregatesInput | AllocationRuleScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AllocationRule"> | string
    planId?: StringWithAggregatesFilter<"AllocationRule"> | string
    envelopeId?: StringWithAggregatesFilter<"AllocationRule"> | string
    pct?: IntWithAggregatesFilter<"AllocationRule"> | number
    fixedCents?: IntNullableWithAggregatesFilter<"AllocationRule"> | number | null
    sortOrder?: IntWithAggregatesFilter<"AllocationRule"> | number
    createdAt?: DateTimeWithAggregatesFilter<"AllocationRule"> | Date | string
  }

  export type AuditLogWhereInput = {
    AND?: AuditLogWhereInput | AuditLogWhereInput[]
    OR?: AuditLogWhereInput[]
    NOT?: AuditLogWhereInput | AuditLogWhereInput[]
    id?: StringFilter<"AuditLog"> | string
    userId?: StringFilter<"AuditLog"> | string
    actionType?: StringFilter<"AuditLog"> | string
    payload?: StringFilter<"AuditLog"> | string
    aiTierAtTime?: IntFilter<"AuditLog"> | number
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type AuditLogOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    actionType?: SortOrder
    payload?: SortOrder
    aiTierAtTime?: SortOrder
    createdAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type AuditLogWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AuditLogWhereInput | AuditLogWhereInput[]
    OR?: AuditLogWhereInput[]
    NOT?: AuditLogWhereInput | AuditLogWhereInput[]
    userId?: StringFilter<"AuditLog"> | string
    actionType?: StringFilter<"AuditLog"> | string
    payload?: StringFilter<"AuditLog"> | string
    aiTierAtTime?: IntFilter<"AuditLog"> | number
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id">

  export type AuditLogOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    actionType?: SortOrder
    payload?: SortOrder
    aiTierAtTime?: SortOrder
    createdAt?: SortOrder
    _count?: AuditLogCountOrderByAggregateInput
    _avg?: AuditLogAvgOrderByAggregateInput
    _max?: AuditLogMaxOrderByAggregateInput
    _min?: AuditLogMinOrderByAggregateInput
    _sum?: AuditLogSumOrderByAggregateInput
  }

  export type AuditLogScalarWhereWithAggregatesInput = {
    AND?: AuditLogScalarWhereWithAggregatesInput | AuditLogScalarWhereWithAggregatesInput[]
    OR?: AuditLogScalarWhereWithAggregatesInput[]
    NOT?: AuditLogScalarWhereWithAggregatesInput | AuditLogScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AuditLog"> | string
    userId?: StringWithAggregatesFilter<"AuditLog"> | string
    actionType?: StringWithAggregatesFilter<"AuditLog"> | string
    payload?: StringWithAggregatesFilter<"AuditLog"> | string
    aiTierAtTime?: IntWithAggregatesFilter<"AuditLog"> | number
    createdAt?: DateTimeWithAggregatesFilter<"AuditLog"> | Date | string
  }

  export type SystemSettingsWhereInput = {
    AND?: SystemSettingsWhereInput | SystemSettingsWhereInput[]
    OR?: SystemSettingsWhereInput[]
    NOT?: SystemSettingsWhereInput | SystemSettingsWhereInput[]
    id?: StringFilter<"SystemSettings"> | string
    activeEngineLvl?: StringFilter<"SystemSettings"> | string
    updatedAt?: DateTimeFilter<"SystemSettings"> | Date | string
  }

  export type SystemSettingsOrderByWithRelationInput = {
    id?: SortOrder
    activeEngineLvl?: SortOrder
    updatedAt?: SortOrder
  }

  export type SystemSettingsWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: SystemSettingsWhereInput | SystemSettingsWhereInput[]
    OR?: SystemSettingsWhereInput[]
    NOT?: SystemSettingsWhereInput | SystemSettingsWhereInput[]
    activeEngineLvl?: StringFilter<"SystemSettings"> | string
    updatedAt?: DateTimeFilter<"SystemSettings"> | Date | string
  }, "id">

  export type SystemSettingsOrderByWithAggregationInput = {
    id?: SortOrder
    activeEngineLvl?: SortOrder
    updatedAt?: SortOrder
    _count?: SystemSettingsCountOrderByAggregateInput
    _max?: SystemSettingsMaxOrderByAggregateInput
    _min?: SystemSettingsMinOrderByAggregateInput
  }

  export type SystemSettingsScalarWhereWithAggregatesInput = {
    AND?: SystemSettingsScalarWhereWithAggregatesInput | SystemSettingsScalarWhereWithAggregatesInput[]
    OR?: SystemSettingsScalarWhereWithAggregatesInput[]
    NOT?: SystemSettingsScalarWhereWithAggregatesInput | SystemSettingsScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"SystemSettings"> | string
    activeEngineLvl?: StringWithAggregatesFilter<"SystemSettings"> | string
    updatedAt?: DateTimeWithAggregatesFilter<"SystemSettings"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionCreateNestedManyWithoutUserInput
    accounts?: AccountCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleCreateNestedManyWithoutUserInput
    goals?: GoalCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanCreateNestedManyWithoutUserInput
    auditLog?: AuditLogCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleUncheckedCreateNestedManyWithoutUserInput
    goals?: GoalUncheckedCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanUncheckedCreateNestedManyWithoutUserInput
    auditLog?: AuditLogUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUpdateManyWithoutUserNestedInput
    accounts?: AccountUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUpdateManyWithoutUserNestedInput
    goals?: GoalUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUncheckedUpdateManyWithoutUserNestedInput
    goals?: GoalUncheckedUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUncheckedUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionCreateInput = {
    id?: string
    tokenHash: string
    userAgent?: string | null
    ip?: string | null
    lastSeenAt?: Date | string
    createdAt?: Date | string
    expiresAt: Date | string
    user: UserCreateNestedOneWithoutSessionsInput
  }

  export type SessionUncheckedCreateInput = {
    id?: string
    userId: string
    tokenHash: string
    userAgent?: string | null
    ip?: string | null
    lastSeenAt?: Date | string
    createdAt?: Date | string
    expiresAt: Date | string
  }

  export type SessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ip?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutSessionsNestedInput
  }

  export type SessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ip?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionCreateManyInput = {
    id?: string
    userId: string
    tokenHash: string
    userAgent?: string | null
    ip?: string | null
    lastSeenAt?: Date | string
    createdAt?: Date | string
    expiresAt: Date | string
  }

  export type SessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ip?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ip?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AccountCreateInput = {
    id?: string
    name: string
    type: string
    currentBalance?: number
    institution?: string | null
    mask?: string | null
    routingEnabled?: boolean
    isArchived?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutAccountsInput
    transactions?: TransactionCreateNestedManyWithoutAccountInput
    paySchedules?: PayScheduleCreateNestedManyWithoutAccountInput
  }

  export type AccountUncheckedCreateInput = {
    id?: string
    userId: string
    name: string
    type: string
    currentBalance?: number
    institution?: string | null
    mask?: string | null
    routingEnabled?: boolean
    isArchived?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutAccountInput
    paySchedules?: PayScheduleUncheckedCreateNestedManyWithoutAccountInput
  }

  export type AccountUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    currentBalance?: IntFieldUpdateOperationsInput | number
    institution?: NullableStringFieldUpdateOperationsInput | string | null
    mask?: NullableStringFieldUpdateOperationsInput | string | null
    routingEnabled?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutAccountsNestedInput
    transactions?: TransactionUpdateManyWithoutAccountNestedInput
    paySchedules?: PayScheduleUpdateManyWithoutAccountNestedInput
  }

  export type AccountUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    currentBalance?: IntFieldUpdateOperationsInput | number
    institution?: NullableStringFieldUpdateOperationsInput | string | null
    mask?: NullableStringFieldUpdateOperationsInput | string | null
    routingEnabled?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutAccountNestedInput
    paySchedules?: PayScheduleUncheckedUpdateManyWithoutAccountNestedInput
  }

  export type AccountCreateManyInput = {
    id?: string
    userId: string
    name: string
    type: string
    currentBalance?: number
    institution?: string | null
    mask?: string | null
    routingEnabled?: boolean
    isArchived?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AccountUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    currentBalance?: IntFieldUpdateOperationsInput | number
    institution?: NullableStringFieldUpdateOperationsInput | string | null
    mask?: NullableStringFieldUpdateOperationsInput | string | null
    routingEnabled?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AccountUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    currentBalance?: IntFieldUpdateOperationsInput | number
    institution?: NullableStringFieldUpdateOperationsInput | string | null
    mask?: NullableStringFieldUpdateOperationsInput | string | null
    routingEnabled?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EnvelopeCreateInput = {
    id?: string
    name: string
    targetBalance?: number
    currentBalance?: number
    planet?: string | null
    color?: string | null
    icon?: string | null
    destinationAccountId?: string | null
    enforceHardCap?: boolean
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutEnvelopesInput
    transactions?: TransactionCreateNestedManyWithoutEnvelopeInput
    allocationRules?: AllocationRuleCreateNestedManyWithoutEnvelopeInput
  }

  export type EnvelopeUncheckedCreateInput = {
    id?: string
    userId: string
    name: string
    targetBalance?: number
    currentBalance?: number
    planet?: string | null
    color?: string | null
    icon?: string | null
    destinationAccountId?: string | null
    enforceHardCap?: boolean
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutEnvelopeInput
    allocationRules?: AllocationRuleUncheckedCreateNestedManyWithoutEnvelopeInput
  }

  export type EnvelopeUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    targetBalance?: IntFieldUpdateOperationsInput | number
    currentBalance?: IntFieldUpdateOperationsInput | number
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAccountId?: NullableStringFieldUpdateOperationsInput | string | null
    enforceHardCap?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutEnvelopesNestedInput
    transactions?: TransactionUpdateManyWithoutEnvelopeNestedInput
    allocationRules?: AllocationRuleUpdateManyWithoutEnvelopeNestedInput
  }

  export type EnvelopeUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    targetBalance?: IntFieldUpdateOperationsInput | number
    currentBalance?: IntFieldUpdateOperationsInput | number
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAccountId?: NullableStringFieldUpdateOperationsInput | string | null
    enforceHardCap?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutEnvelopeNestedInput
    allocationRules?: AllocationRuleUncheckedUpdateManyWithoutEnvelopeNestedInput
  }

  export type EnvelopeCreateManyInput = {
    id?: string
    userId: string
    name: string
    targetBalance?: number
    currentBalance?: number
    planet?: string | null
    color?: string | null
    icon?: string | null
    destinationAccountId?: string | null
    enforceHardCap?: boolean
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type EnvelopeUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    targetBalance?: IntFieldUpdateOperationsInput | number
    currentBalance?: IntFieldUpdateOperationsInput | number
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAccountId?: NullableStringFieldUpdateOperationsInput | string | null
    enforceHardCap?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EnvelopeUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    targetBalance?: IntFieldUpdateOperationsInput | number
    currentBalance?: IntFieldUpdateOperationsInput | number
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAccountId?: NullableStringFieldUpdateOperationsInput | string | null
    enforceHardCap?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionCreateInput = {
    id?: string
    amount: number
    date: Date | string
    payee: string
    notes?: string | null
    source?: string
    metadata?: string
    isPrimaMateria?: boolean
    fromPlanId?: string | null
    fromPaycheckId?: string | null
    cleared?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutTransactionsInput
    account: AccountCreateNestedOneWithoutTransactionsInput
    envelope?: EnvelopeCreateNestedOneWithoutTransactionsInput
  }

  export type TransactionUncheckedCreateInput = {
    id?: string
    userId: string
    accountId: string
    envelopeId?: string | null
    amount: number
    date: Date | string
    payee: string
    notes?: string | null
    source?: string
    metadata?: string
    isPrimaMateria?: boolean
    fromPlanId?: string | null
    fromPaycheckId?: string | null
    cleared?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    payee?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    metadata?: StringFieldUpdateOperationsInput | string
    isPrimaMateria?: BoolFieldUpdateOperationsInput | boolean
    fromPlanId?: NullableStringFieldUpdateOperationsInput | string | null
    fromPaycheckId?: NullableStringFieldUpdateOperationsInput | string | null
    cleared?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTransactionsNestedInput
    account?: AccountUpdateOneRequiredWithoutTransactionsNestedInput
    envelope?: EnvelopeUpdateOneWithoutTransactionsNestedInput
  }

  export type TransactionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    envelopeId?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    payee?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    metadata?: StringFieldUpdateOperationsInput | string
    isPrimaMateria?: BoolFieldUpdateOperationsInput | boolean
    fromPlanId?: NullableStringFieldUpdateOperationsInput | string | null
    fromPaycheckId?: NullableStringFieldUpdateOperationsInput | string | null
    cleared?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionCreateManyInput = {
    id?: string
    userId: string
    accountId: string
    envelopeId?: string | null
    amount: number
    date: Date | string
    payee: string
    notes?: string | null
    source?: string
    metadata?: string
    isPrimaMateria?: boolean
    fromPlanId?: string | null
    fromPaycheckId?: string | null
    cleared?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    payee?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    metadata?: StringFieldUpdateOperationsInput | string
    isPrimaMateria?: BoolFieldUpdateOperationsInput | boolean
    fromPlanId?: NullableStringFieldUpdateOperationsInput | string | null
    fromPaycheckId?: NullableStringFieldUpdateOperationsInput | string | null
    cleared?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    envelopeId?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    payee?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    metadata?: StringFieldUpdateOperationsInput | string
    isPrimaMateria?: BoolFieldUpdateOperationsInput | boolean
    fromPlanId?: NullableStringFieldUpdateOperationsInput | string | null
    fromPaycheckId?: NullableStringFieldUpdateOperationsInput | string | null
    cleared?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PayScheduleCreateInput = {
    id?: string
    cadence: string
    amount: number
    startDate: Date | string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutPaySchedulesInput
    account: AccountCreateNestedOneWithoutPaySchedulesInput
  }

  export type PayScheduleUncheckedCreateInput = {
    id?: string
    userId: string
    cadence: string
    amount: number
    accountId: string
    startDate: Date | string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PayScheduleUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    cadence?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutPaySchedulesNestedInput
    account?: AccountUpdateOneRequiredWithoutPaySchedulesNestedInput
  }

  export type PayScheduleUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    cadence?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    accountId?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PayScheduleCreateManyInput = {
    id?: string
    userId: string
    cadence: string
    amount: number
    accountId: string
    startDate: Date | string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PayScheduleUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    cadence?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PayScheduleUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    cadence?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    accountId?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GoalCreateInput = {
    id?: string
    name: string
    description?: string | null
    targetAmount: number
    currentAmount?: number
    targetDate?: Date | string | null
    envelopeId?: string | null
    planet?: string | null
    isPrimary?: boolean
    kind?: $Enums.GoalKind
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutGoalsInput
  }

  export type GoalUncheckedCreateInput = {
    id?: string
    userId: string
    name: string
    description?: string | null
    targetAmount: number
    currentAmount?: number
    targetDate?: Date | string | null
    envelopeId?: string | null
    planet?: string | null
    isPrimary?: boolean
    kind?: $Enums.GoalKind
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GoalUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    targetAmount?: IntFieldUpdateOperationsInput | number
    currentAmount?: IntFieldUpdateOperationsInput | number
    targetDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    envelopeId?: NullableStringFieldUpdateOperationsInput | string | null
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    isPrimary?: BoolFieldUpdateOperationsInput | boolean
    kind?: EnumGoalKindFieldUpdateOperationsInput | $Enums.GoalKind
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutGoalsNestedInput
  }

  export type GoalUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    targetAmount?: IntFieldUpdateOperationsInput | number
    currentAmount?: IntFieldUpdateOperationsInput | number
    targetDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    envelopeId?: NullableStringFieldUpdateOperationsInput | string | null
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    isPrimary?: BoolFieldUpdateOperationsInput | boolean
    kind?: EnumGoalKindFieldUpdateOperationsInput | $Enums.GoalKind
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GoalCreateManyInput = {
    id?: string
    userId: string
    name: string
    description?: string | null
    targetAmount: number
    currentAmount?: number
    targetDate?: Date | string | null
    envelopeId?: string | null
    planet?: string | null
    isPrimary?: boolean
    kind?: $Enums.GoalKind
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GoalUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    targetAmount?: IntFieldUpdateOperationsInput | number
    currentAmount?: IntFieldUpdateOperationsInput | number
    targetDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    envelopeId?: NullableStringFieldUpdateOperationsInput | string | null
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    isPrimary?: BoolFieldUpdateOperationsInput | boolean
    kind?: EnumGoalKindFieldUpdateOperationsInput | $Enums.GoalKind
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GoalUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    targetAmount?: IntFieldUpdateOperationsInput | number
    currentAmount?: IntFieldUpdateOperationsInput | number
    targetDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    envelopeId?: NullableStringFieldUpdateOperationsInput | string | null
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    isPrimary?: BoolFieldUpdateOperationsInput | boolean
    kind?: EnumGoalKindFieldUpdateOperationsInput | $Enums.GoalKind
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AllocationPlanCreateInput = {
    id?: string
    strategyId?: string
    isArmed?: boolean
    name?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutAllocationPlansInput
    rules?: AllocationRuleCreateNestedManyWithoutPlanInput
  }

  export type AllocationPlanUncheckedCreateInput = {
    id?: string
    userId: string
    strategyId?: string
    isArmed?: boolean
    name?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    rules?: AllocationRuleUncheckedCreateNestedManyWithoutPlanInput
  }

  export type AllocationPlanUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    strategyId?: StringFieldUpdateOperationsInput | string
    isArmed?: BoolFieldUpdateOperationsInput | boolean
    name?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutAllocationPlansNestedInput
    rules?: AllocationRuleUpdateManyWithoutPlanNestedInput
  }

  export type AllocationPlanUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    strategyId?: StringFieldUpdateOperationsInput | string
    isArmed?: BoolFieldUpdateOperationsInput | boolean
    name?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rules?: AllocationRuleUncheckedUpdateManyWithoutPlanNestedInput
  }

  export type AllocationPlanCreateManyInput = {
    id?: string
    userId: string
    strategyId?: string
    isArmed?: boolean
    name?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AllocationPlanUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    strategyId?: StringFieldUpdateOperationsInput | string
    isArmed?: BoolFieldUpdateOperationsInput | boolean
    name?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AllocationPlanUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    strategyId?: StringFieldUpdateOperationsInput | string
    isArmed?: BoolFieldUpdateOperationsInput | boolean
    name?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AllocationRuleCreateInput = {
    id?: string
    pct: number
    fixedCents?: number | null
    sortOrder?: number
    createdAt?: Date | string
    plan: AllocationPlanCreateNestedOneWithoutRulesInput
    envelope: EnvelopeCreateNestedOneWithoutAllocationRulesInput
  }

  export type AllocationRuleUncheckedCreateInput = {
    id?: string
    planId: string
    envelopeId: string
    pct: number
    fixedCents?: number | null
    sortOrder?: number
    createdAt?: Date | string
  }

  export type AllocationRuleUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    pct?: IntFieldUpdateOperationsInput | number
    fixedCents?: NullableIntFieldUpdateOperationsInput | number | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    plan?: AllocationPlanUpdateOneRequiredWithoutRulesNestedInput
    envelope?: EnvelopeUpdateOneRequiredWithoutAllocationRulesNestedInput
  }

  export type AllocationRuleUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    envelopeId?: StringFieldUpdateOperationsInput | string
    pct?: IntFieldUpdateOperationsInput | number
    fixedCents?: NullableIntFieldUpdateOperationsInput | number | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AllocationRuleCreateManyInput = {
    id?: string
    planId: string
    envelopeId: string
    pct: number
    fixedCents?: number | null
    sortOrder?: number
    createdAt?: Date | string
  }

  export type AllocationRuleUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    pct?: IntFieldUpdateOperationsInput | number
    fixedCents?: NullableIntFieldUpdateOperationsInput | number | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AllocationRuleUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    envelopeId?: StringFieldUpdateOperationsInput | string
    pct?: IntFieldUpdateOperationsInput | number
    fixedCents?: NullableIntFieldUpdateOperationsInput | number | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogCreateInput = {
    id?: string
    actionType: string
    payload?: string
    aiTierAtTime?: number
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutAuditLogInput
  }

  export type AuditLogUncheckedCreateInput = {
    id?: string
    userId: string
    actionType: string
    payload?: string
    aiTierAtTime?: number
    createdAt?: Date | string
  }

  export type AuditLogUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    actionType?: StringFieldUpdateOperationsInput | string
    payload?: StringFieldUpdateOperationsInput | string
    aiTierAtTime?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutAuditLogNestedInput
  }

  export type AuditLogUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    actionType?: StringFieldUpdateOperationsInput | string
    payload?: StringFieldUpdateOperationsInput | string
    aiTierAtTime?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogCreateManyInput = {
    id?: string
    userId: string
    actionType: string
    payload?: string
    aiTierAtTime?: number
    createdAt?: Date | string
  }

  export type AuditLogUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    actionType?: StringFieldUpdateOperationsInput | string
    payload?: StringFieldUpdateOperationsInput | string
    aiTierAtTime?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    actionType?: StringFieldUpdateOperationsInput | string
    payload?: StringFieldUpdateOperationsInput | string
    aiTierAtTime?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SystemSettingsCreateInput = {
    id?: string
    activeEngineLvl?: string
    updatedAt?: Date | string
  }

  export type SystemSettingsUncheckedCreateInput = {
    id?: string
    activeEngineLvl?: string
    updatedAt?: Date | string
  }

  export type SystemSettingsUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    activeEngineLvl?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SystemSettingsUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    activeEngineLvl?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SystemSettingsCreateManyInput = {
    id?: string
    activeEngineLvl?: string
    updatedAt?: Date | string
  }

  export type SystemSettingsUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    activeEngineLvl?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SystemSettingsUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    activeEngineLvl?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SessionListRelationFilter = {
    every?: SessionWhereInput
    some?: SessionWhereInput
    none?: SessionWhereInput
  }

  export type AccountListRelationFilter = {
    every?: AccountWhereInput
    some?: AccountWhereInput
    none?: AccountWhereInput
  }

  export type EnvelopeListRelationFilter = {
    every?: EnvelopeWhereInput
    some?: EnvelopeWhereInput
    none?: EnvelopeWhereInput
  }

  export type TransactionListRelationFilter = {
    every?: TransactionWhereInput
    some?: TransactionWhereInput
    none?: TransactionWhereInput
  }

  export type PayScheduleListRelationFilter = {
    every?: PayScheduleWhereInput
    some?: PayScheduleWhereInput
    none?: PayScheduleWhereInput
  }

  export type GoalListRelationFilter = {
    every?: GoalWhereInput
    some?: GoalWhereInput
    none?: GoalWhereInput
  }

  export type AllocationPlanListRelationFilter = {
    every?: AllocationPlanWhereInput
    some?: AllocationPlanWhereInput
    none?: AllocationPlanWhereInput
  }

  export type AuditLogListRelationFilter = {
    every?: AuditLogWhereInput
    some?: AuditLogWhereInput
    none?: AuditLogWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type SessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AccountOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type EnvelopeOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TransactionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PayScheduleOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type GoalOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AllocationPlanOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AuditLogOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    aiTier?: SortOrder
    routingLevel?: SortOrder
    defaultViewId?: SortOrder
    settings?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserAvgOrderByAggregateInput = {
    aiTier?: SortOrder
    routingLevel?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    aiTier?: SortOrder
    routingLevel?: SortOrder
    defaultViewId?: SortOrder
    settings?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    aiTier?: SortOrder
    routingLevel?: SortOrder
    defaultViewId?: SortOrder
    settings?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserSumOrderByAggregateInput = {
    aiTier?: SortOrder
    routingLevel?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type SessionCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    tokenHash?: SortOrder
    userAgent?: SortOrder
    ip?: SortOrder
    lastSeenAt?: SortOrder
    createdAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type SessionMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    tokenHash?: SortOrder
    userAgent?: SortOrder
    ip?: SortOrder
    lastSeenAt?: SortOrder
    createdAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type SessionMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    tokenHash?: SortOrder
    userAgent?: SortOrder
    ip?: SortOrder
    lastSeenAt?: SortOrder
    createdAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type AccountCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    currentBalance?: SortOrder
    institution?: SortOrder
    mask?: SortOrder
    routingEnabled?: SortOrder
    isArchived?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AccountAvgOrderByAggregateInput = {
    currentBalance?: SortOrder
    sortOrder?: SortOrder
  }

  export type AccountMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    currentBalance?: SortOrder
    institution?: SortOrder
    mask?: SortOrder
    routingEnabled?: SortOrder
    isArchived?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AccountMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    currentBalance?: SortOrder
    institution?: SortOrder
    mask?: SortOrder
    routingEnabled?: SortOrder
    isArchived?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AccountSumOrderByAggregateInput = {
    currentBalance?: SortOrder
    sortOrder?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type AllocationRuleListRelationFilter = {
    every?: AllocationRuleWhereInput
    some?: AllocationRuleWhereInput
    none?: AllocationRuleWhereInput
  }

  export type AllocationRuleOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type EnvelopeCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    targetBalance?: SortOrder
    currentBalance?: SortOrder
    planet?: SortOrder
    color?: SortOrder
    icon?: SortOrder
    destinationAccountId?: SortOrder
    enforceHardCap?: SortOrder
    sortOrder?: SortOrder
    isArchived?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnvelopeAvgOrderByAggregateInput = {
    targetBalance?: SortOrder
    currentBalance?: SortOrder
    sortOrder?: SortOrder
  }

  export type EnvelopeMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    targetBalance?: SortOrder
    currentBalance?: SortOrder
    planet?: SortOrder
    color?: SortOrder
    icon?: SortOrder
    destinationAccountId?: SortOrder
    enforceHardCap?: SortOrder
    sortOrder?: SortOrder
    isArchived?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnvelopeMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    targetBalance?: SortOrder
    currentBalance?: SortOrder
    planet?: SortOrder
    color?: SortOrder
    icon?: SortOrder
    destinationAccountId?: SortOrder
    enforceHardCap?: SortOrder
    sortOrder?: SortOrder
    isArchived?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnvelopeSumOrderByAggregateInput = {
    targetBalance?: SortOrder
    currentBalance?: SortOrder
    sortOrder?: SortOrder
  }

  export type AccountScalarRelationFilter = {
    is?: AccountWhereInput
    isNot?: AccountWhereInput
  }

  export type EnvelopeNullableScalarRelationFilter = {
    is?: EnvelopeWhereInput | null
    isNot?: EnvelopeWhereInput | null
  }

  export type TransactionCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    accountId?: SortOrder
    envelopeId?: SortOrder
    amount?: SortOrder
    date?: SortOrder
    payee?: SortOrder
    notes?: SortOrder
    source?: SortOrder
    metadata?: SortOrder
    isPrimaMateria?: SortOrder
    fromPlanId?: SortOrder
    fromPaycheckId?: SortOrder
    cleared?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TransactionAvgOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type TransactionMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    accountId?: SortOrder
    envelopeId?: SortOrder
    amount?: SortOrder
    date?: SortOrder
    payee?: SortOrder
    notes?: SortOrder
    source?: SortOrder
    metadata?: SortOrder
    isPrimaMateria?: SortOrder
    fromPlanId?: SortOrder
    fromPaycheckId?: SortOrder
    cleared?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TransactionMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    accountId?: SortOrder
    envelopeId?: SortOrder
    amount?: SortOrder
    date?: SortOrder
    payee?: SortOrder
    notes?: SortOrder
    source?: SortOrder
    metadata?: SortOrder
    isPrimaMateria?: SortOrder
    fromPlanId?: SortOrder
    fromPaycheckId?: SortOrder
    cleared?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TransactionSumOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type PayScheduleCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    cadence?: SortOrder
    amount?: SortOrder
    accountId?: SortOrder
    startDate?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PayScheduleAvgOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type PayScheduleMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    cadence?: SortOrder
    amount?: SortOrder
    accountId?: SortOrder
    startDate?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PayScheduleMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    cadence?: SortOrder
    amount?: SortOrder
    accountId?: SortOrder
    startDate?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PayScheduleSumOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type EnumGoalKindFilter<$PrismaModel = never> = {
    equals?: $Enums.GoalKind | EnumGoalKindFieldRefInput<$PrismaModel>
    in?: $Enums.GoalKind[]
    notIn?: $Enums.GoalKind[]
    not?: NestedEnumGoalKindFilter<$PrismaModel> | $Enums.GoalKind
  }

  export type GoalCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    targetAmount?: SortOrder
    currentAmount?: SortOrder
    targetDate?: SortOrder
    envelopeId?: SortOrder
    planet?: SortOrder
    isPrimary?: SortOrder
    kind?: SortOrder
    sortOrder?: SortOrder
    isArchived?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type GoalAvgOrderByAggregateInput = {
    targetAmount?: SortOrder
    currentAmount?: SortOrder
    sortOrder?: SortOrder
  }

  export type GoalMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    targetAmount?: SortOrder
    currentAmount?: SortOrder
    targetDate?: SortOrder
    envelopeId?: SortOrder
    planet?: SortOrder
    isPrimary?: SortOrder
    kind?: SortOrder
    sortOrder?: SortOrder
    isArchived?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type GoalMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    targetAmount?: SortOrder
    currentAmount?: SortOrder
    targetDate?: SortOrder
    envelopeId?: SortOrder
    planet?: SortOrder
    isPrimary?: SortOrder
    kind?: SortOrder
    sortOrder?: SortOrder
    isArchived?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type GoalSumOrderByAggregateInput = {
    targetAmount?: SortOrder
    currentAmount?: SortOrder
    sortOrder?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type EnumGoalKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.GoalKind | EnumGoalKindFieldRefInput<$PrismaModel>
    in?: $Enums.GoalKind[]
    notIn?: $Enums.GoalKind[]
    not?: NestedEnumGoalKindWithAggregatesFilter<$PrismaModel> | $Enums.GoalKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumGoalKindFilter<$PrismaModel>
    _max?: NestedEnumGoalKindFilter<$PrismaModel>
  }

  export type AllocationPlanCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    strategyId?: SortOrder
    isArmed?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AllocationPlanMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    strategyId?: SortOrder
    isArmed?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AllocationPlanMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    strategyId?: SortOrder
    isArmed?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type AllocationPlanScalarRelationFilter = {
    is?: AllocationPlanWhereInput
    isNot?: AllocationPlanWhereInput
  }

  export type EnvelopeScalarRelationFilter = {
    is?: EnvelopeWhereInput
    isNot?: EnvelopeWhereInput
  }

  export type AllocationRuleCountOrderByAggregateInput = {
    id?: SortOrder
    planId?: SortOrder
    envelopeId?: SortOrder
    pct?: SortOrder
    fixedCents?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
  }

  export type AllocationRuleAvgOrderByAggregateInput = {
    pct?: SortOrder
    fixedCents?: SortOrder
    sortOrder?: SortOrder
  }

  export type AllocationRuleMaxOrderByAggregateInput = {
    id?: SortOrder
    planId?: SortOrder
    envelopeId?: SortOrder
    pct?: SortOrder
    fixedCents?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
  }

  export type AllocationRuleMinOrderByAggregateInput = {
    id?: SortOrder
    planId?: SortOrder
    envelopeId?: SortOrder
    pct?: SortOrder
    fixedCents?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
  }

  export type AllocationRuleSumOrderByAggregateInput = {
    pct?: SortOrder
    fixedCents?: SortOrder
    sortOrder?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type AuditLogCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    actionType?: SortOrder
    payload?: SortOrder
    aiTierAtTime?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogAvgOrderByAggregateInput = {
    aiTierAtTime?: SortOrder
  }

  export type AuditLogMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    actionType?: SortOrder
    payload?: SortOrder
    aiTierAtTime?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    actionType?: SortOrder
    payload?: SortOrder
    aiTierAtTime?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogSumOrderByAggregateInput = {
    aiTierAtTime?: SortOrder
  }

  export type SystemSettingsCountOrderByAggregateInput = {
    id?: SortOrder
    activeEngineLvl?: SortOrder
    updatedAt?: SortOrder
  }

  export type SystemSettingsMaxOrderByAggregateInput = {
    id?: SortOrder
    activeEngineLvl?: SortOrder
    updatedAt?: SortOrder
  }

  export type SystemSettingsMinOrderByAggregateInput = {
    id?: SortOrder
    activeEngineLvl?: SortOrder
    updatedAt?: SortOrder
  }

  export type SessionCreateNestedManyWithoutUserInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type AccountCreateNestedManyWithoutUserInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
  }

  export type EnvelopeCreateNestedManyWithoutUserInput = {
    create?: XOR<EnvelopeCreateWithoutUserInput, EnvelopeUncheckedCreateWithoutUserInput> | EnvelopeCreateWithoutUserInput[] | EnvelopeUncheckedCreateWithoutUserInput[]
    connectOrCreate?: EnvelopeCreateOrConnectWithoutUserInput | EnvelopeCreateOrConnectWithoutUserInput[]
    createMany?: EnvelopeCreateManyUserInputEnvelope
    connect?: EnvelopeWhereUniqueInput | EnvelopeWhereUniqueInput[]
  }

  export type TransactionCreateNestedManyWithoutUserInput = {
    create?: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput> | TransactionCreateWithoutUserInput[] | TransactionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutUserInput | TransactionCreateOrConnectWithoutUserInput[]
    createMany?: TransactionCreateManyUserInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type PayScheduleCreateNestedManyWithoutUserInput = {
    create?: XOR<PayScheduleCreateWithoutUserInput, PayScheduleUncheckedCreateWithoutUserInput> | PayScheduleCreateWithoutUserInput[] | PayScheduleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PayScheduleCreateOrConnectWithoutUserInput | PayScheduleCreateOrConnectWithoutUserInput[]
    createMany?: PayScheduleCreateManyUserInputEnvelope
    connect?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
  }

  export type GoalCreateNestedManyWithoutUserInput = {
    create?: XOR<GoalCreateWithoutUserInput, GoalUncheckedCreateWithoutUserInput> | GoalCreateWithoutUserInput[] | GoalUncheckedCreateWithoutUserInput[]
    connectOrCreate?: GoalCreateOrConnectWithoutUserInput | GoalCreateOrConnectWithoutUserInput[]
    createMany?: GoalCreateManyUserInputEnvelope
    connect?: GoalWhereUniqueInput | GoalWhereUniqueInput[]
  }

  export type AllocationPlanCreateNestedManyWithoutUserInput = {
    create?: XOR<AllocationPlanCreateWithoutUserInput, AllocationPlanUncheckedCreateWithoutUserInput> | AllocationPlanCreateWithoutUserInput[] | AllocationPlanUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AllocationPlanCreateOrConnectWithoutUserInput | AllocationPlanCreateOrConnectWithoutUserInput[]
    createMany?: AllocationPlanCreateManyUserInputEnvelope
    connect?: AllocationPlanWhereUniqueInput | AllocationPlanWhereUniqueInput[]
  }

  export type AuditLogCreateNestedManyWithoutUserInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
  }

  export type SessionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type AccountUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
  }

  export type EnvelopeUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<EnvelopeCreateWithoutUserInput, EnvelopeUncheckedCreateWithoutUserInput> | EnvelopeCreateWithoutUserInput[] | EnvelopeUncheckedCreateWithoutUserInput[]
    connectOrCreate?: EnvelopeCreateOrConnectWithoutUserInput | EnvelopeCreateOrConnectWithoutUserInput[]
    createMany?: EnvelopeCreateManyUserInputEnvelope
    connect?: EnvelopeWhereUniqueInput | EnvelopeWhereUniqueInput[]
  }

  export type TransactionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput> | TransactionCreateWithoutUserInput[] | TransactionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutUserInput | TransactionCreateOrConnectWithoutUserInput[]
    createMany?: TransactionCreateManyUserInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type PayScheduleUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<PayScheduleCreateWithoutUserInput, PayScheduleUncheckedCreateWithoutUserInput> | PayScheduleCreateWithoutUserInput[] | PayScheduleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PayScheduleCreateOrConnectWithoutUserInput | PayScheduleCreateOrConnectWithoutUserInput[]
    createMany?: PayScheduleCreateManyUserInputEnvelope
    connect?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
  }

  export type GoalUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<GoalCreateWithoutUserInput, GoalUncheckedCreateWithoutUserInput> | GoalCreateWithoutUserInput[] | GoalUncheckedCreateWithoutUserInput[]
    connectOrCreate?: GoalCreateOrConnectWithoutUserInput | GoalCreateOrConnectWithoutUserInput[]
    createMany?: GoalCreateManyUserInputEnvelope
    connect?: GoalWhereUniqueInput | GoalWhereUniqueInput[]
  }

  export type AllocationPlanUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<AllocationPlanCreateWithoutUserInput, AllocationPlanUncheckedCreateWithoutUserInput> | AllocationPlanCreateWithoutUserInput[] | AllocationPlanUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AllocationPlanCreateOrConnectWithoutUserInput | AllocationPlanCreateOrConnectWithoutUserInput[]
    createMany?: AllocationPlanCreateManyUserInputEnvelope
    connect?: AllocationPlanWhereUniqueInput | AllocationPlanWhereUniqueInput[]
  }

  export type AuditLogUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type SessionUpdateManyWithoutUserNestedInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutUserInput | SessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutUserInput | SessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutUserInput | SessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type AccountUpdateManyWithoutUserNestedInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    upsert?: AccountUpsertWithWhereUniqueWithoutUserInput | AccountUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    set?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    disconnect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    delete?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    update?: AccountUpdateWithWhereUniqueWithoutUserInput | AccountUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AccountUpdateManyWithWhereWithoutUserInput | AccountUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AccountScalarWhereInput | AccountScalarWhereInput[]
  }

  export type EnvelopeUpdateManyWithoutUserNestedInput = {
    create?: XOR<EnvelopeCreateWithoutUserInput, EnvelopeUncheckedCreateWithoutUserInput> | EnvelopeCreateWithoutUserInput[] | EnvelopeUncheckedCreateWithoutUserInput[]
    connectOrCreate?: EnvelopeCreateOrConnectWithoutUserInput | EnvelopeCreateOrConnectWithoutUserInput[]
    upsert?: EnvelopeUpsertWithWhereUniqueWithoutUserInput | EnvelopeUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: EnvelopeCreateManyUserInputEnvelope
    set?: EnvelopeWhereUniqueInput | EnvelopeWhereUniqueInput[]
    disconnect?: EnvelopeWhereUniqueInput | EnvelopeWhereUniqueInput[]
    delete?: EnvelopeWhereUniqueInput | EnvelopeWhereUniqueInput[]
    connect?: EnvelopeWhereUniqueInput | EnvelopeWhereUniqueInput[]
    update?: EnvelopeUpdateWithWhereUniqueWithoutUserInput | EnvelopeUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: EnvelopeUpdateManyWithWhereWithoutUserInput | EnvelopeUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: EnvelopeScalarWhereInput | EnvelopeScalarWhereInput[]
  }

  export type TransactionUpdateManyWithoutUserNestedInput = {
    create?: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput> | TransactionCreateWithoutUserInput[] | TransactionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutUserInput | TransactionCreateOrConnectWithoutUserInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutUserInput | TransactionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TransactionCreateManyUserInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutUserInput | TransactionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutUserInput | TransactionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type PayScheduleUpdateManyWithoutUserNestedInput = {
    create?: XOR<PayScheduleCreateWithoutUserInput, PayScheduleUncheckedCreateWithoutUserInput> | PayScheduleCreateWithoutUserInput[] | PayScheduleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PayScheduleCreateOrConnectWithoutUserInput | PayScheduleCreateOrConnectWithoutUserInput[]
    upsert?: PayScheduleUpsertWithWhereUniqueWithoutUserInput | PayScheduleUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: PayScheduleCreateManyUserInputEnvelope
    set?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    disconnect?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    delete?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    connect?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    update?: PayScheduleUpdateWithWhereUniqueWithoutUserInput | PayScheduleUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: PayScheduleUpdateManyWithWhereWithoutUserInput | PayScheduleUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: PayScheduleScalarWhereInput | PayScheduleScalarWhereInput[]
  }

  export type GoalUpdateManyWithoutUserNestedInput = {
    create?: XOR<GoalCreateWithoutUserInput, GoalUncheckedCreateWithoutUserInput> | GoalCreateWithoutUserInput[] | GoalUncheckedCreateWithoutUserInput[]
    connectOrCreate?: GoalCreateOrConnectWithoutUserInput | GoalCreateOrConnectWithoutUserInput[]
    upsert?: GoalUpsertWithWhereUniqueWithoutUserInput | GoalUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: GoalCreateManyUserInputEnvelope
    set?: GoalWhereUniqueInput | GoalWhereUniqueInput[]
    disconnect?: GoalWhereUniqueInput | GoalWhereUniqueInput[]
    delete?: GoalWhereUniqueInput | GoalWhereUniqueInput[]
    connect?: GoalWhereUniqueInput | GoalWhereUniqueInput[]
    update?: GoalUpdateWithWhereUniqueWithoutUserInput | GoalUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: GoalUpdateManyWithWhereWithoutUserInput | GoalUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: GoalScalarWhereInput | GoalScalarWhereInput[]
  }

  export type AllocationPlanUpdateManyWithoutUserNestedInput = {
    create?: XOR<AllocationPlanCreateWithoutUserInput, AllocationPlanUncheckedCreateWithoutUserInput> | AllocationPlanCreateWithoutUserInput[] | AllocationPlanUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AllocationPlanCreateOrConnectWithoutUserInput | AllocationPlanCreateOrConnectWithoutUserInput[]
    upsert?: AllocationPlanUpsertWithWhereUniqueWithoutUserInput | AllocationPlanUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AllocationPlanCreateManyUserInputEnvelope
    set?: AllocationPlanWhereUniqueInput | AllocationPlanWhereUniqueInput[]
    disconnect?: AllocationPlanWhereUniqueInput | AllocationPlanWhereUniqueInput[]
    delete?: AllocationPlanWhereUniqueInput | AllocationPlanWhereUniqueInput[]
    connect?: AllocationPlanWhereUniqueInput | AllocationPlanWhereUniqueInput[]
    update?: AllocationPlanUpdateWithWhereUniqueWithoutUserInput | AllocationPlanUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AllocationPlanUpdateManyWithWhereWithoutUserInput | AllocationPlanUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AllocationPlanScalarWhereInput | AllocationPlanScalarWhereInput[]
  }

  export type AuditLogUpdateManyWithoutUserNestedInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    upsert?: AuditLogUpsertWithWhereUniqueWithoutUserInput | AuditLogUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    set?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    disconnect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    delete?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    update?: AuditLogUpdateWithWhereUniqueWithoutUserInput | AuditLogUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AuditLogUpdateManyWithWhereWithoutUserInput | AuditLogUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
  }

  export type SessionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutUserInput | SessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutUserInput | SessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutUserInput | SessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type AccountUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    upsert?: AccountUpsertWithWhereUniqueWithoutUserInput | AccountUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    set?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    disconnect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    delete?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    update?: AccountUpdateWithWhereUniqueWithoutUserInput | AccountUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AccountUpdateManyWithWhereWithoutUserInput | AccountUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AccountScalarWhereInput | AccountScalarWhereInput[]
  }

  export type EnvelopeUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<EnvelopeCreateWithoutUserInput, EnvelopeUncheckedCreateWithoutUserInput> | EnvelopeCreateWithoutUserInput[] | EnvelopeUncheckedCreateWithoutUserInput[]
    connectOrCreate?: EnvelopeCreateOrConnectWithoutUserInput | EnvelopeCreateOrConnectWithoutUserInput[]
    upsert?: EnvelopeUpsertWithWhereUniqueWithoutUserInput | EnvelopeUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: EnvelopeCreateManyUserInputEnvelope
    set?: EnvelopeWhereUniqueInput | EnvelopeWhereUniqueInput[]
    disconnect?: EnvelopeWhereUniqueInput | EnvelopeWhereUniqueInput[]
    delete?: EnvelopeWhereUniqueInput | EnvelopeWhereUniqueInput[]
    connect?: EnvelopeWhereUniqueInput | EnvelopeWhereUniqueInput[]
    update?: EnvelopeUpdateWithWhereUniqueWithoutUserInput | EnvelopeUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: EnvelopeUpdateManyWithWhereWithoutUserInput | EnvelopeUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: EnvelopeScalarWhereInput | EnvelopeScalarWhereInput[]
  }

  export type TransactionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput> | TransactionCreateWithoutUserInput[] | TransactionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutUserInput | TransactionCreateOrConnectWithoutUserInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutUserInput | TransactionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TransactionCreateManyUserInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutUserInput | TransactionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutUserInput | TransactionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type PayScheduleUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<PayScheduleCreateWithoutUserInput, PayScheduleUncheckedCreateWithoutUserInput> | PayScheduleCreateWithoutUserInput[] | PayScheduleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PayScheduleCreateOrConnectWithoutUserInput | PayScheduleCreateOrConnectWithoutUserInput[]
    upsert?: PayScheduleUpsertWithWhereUniqueWithoutUserInput | PayScheduleUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: PayScheduleCreateManyUserInputEnvelope
    set?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    disconnect?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    delete?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    connect?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    update?: PayScheduleUpdateWithWhereUniqueWithoutUserInput | PayScheduleUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: PayScheduleUpdateManyWithWhereWithoutUserInput | PayScheduleUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: PayScheduleScalarWhereInput | PayScheduleScalarWhereInput[]
  }

  export type GoalUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<GoalCreateWithoutUserInput, GoalUncheckedCreateWithoutUserInput> | GoalCreateWithoutUserInput[] | GoalUncheckedCreateWithoutUserInput[]
    connectOrCreate?: GoalCreateOrConnectWithoutUserInput | GoalCreateOrConnectWithoutUserInput[]
    upsert?: GoalUpsertWithWhereUniqueWithoutUserInput | GoalUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: GoalCreateManyUserInputEnvelope
    set?: GoalWhereUniqueInput | GoalWhereUniqueInput[]
    disconnect?: GoalWhereUniqueInput | GoalWhereUniqueInput[]
    delete?: GoalWhereUniqueInput | GoalWhereUniqueInput[]
    connect?: GoalWhereUniqueInput | GoalWhereUniqueInput[]
    update?: GoalUpdateWithWhereUniqueWithoutUserInput | GoalUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: GoalUpdateManyWithWhereWithoutUserInput | GoalUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: GoalScalarWhereInput | GoalScalarWhereInput[]
  }

  export type AllocationPlanUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<AllocationPlanCreateWithoutUserInput, AllocationPlanUncheckedCreateWithoutUserInput> | AllocationPlanCreateWithoutUserInput[] | AllocationPlanUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AllocationPlanCreateOrConnectWithoutUserInput | AllocationPlanCreateOrConnectWithoutUserInput[]
    upsert?: AllocationPlanUpsertWithWhereUniqueWithoutUserInput | AllocationPlanUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AllocationPlanCreateManyUserInputEnvelope
    set?: AllocationPlanWhereUniqueInput | AllocationPlanWhereUniqueInput[]
    disconnect?: AllocationPlanWhereUniqueInput | AllocationPlanWhereUniqueInput[]
    delete?: AllocationPlanWhereUniqueInput | AllocationPlanWhereUniqueInput[]
    connect?: AllocationPlanWhereUniqueInput | AllocationPlanWhereUniqueInput[]
    update?: AllocationPlanUpdateWithWhereUniqueWithoutUserInput | AllocationPlanUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AllocationPlanUpdateManyWithWhereWithoutUserInput | AllocationPlanUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AllocationPlanScalarWhereInput | AllocationPlanScalarWhereInput[]
  }

  export type AuditLogUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    upsert?: AuditLogUpsertWithWhereUniqueWithoutUserInput | AuditLogUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    set?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    disconnect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    delete?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    update?: AuditLogUpdateWithWhereUniqueWithoutUserInput | AuditLogUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AuditLogUpdateManyWithWhereWithoutUserInput | AuditLogUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutSessionsInput = {
    create?: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSessionsInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutSessionsNestedInput = {
    create?: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSessionsInput
    upsert?: UserUpsertWithoutSessionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSessionsInput, UserUpdateWithoutSessionsInput>, UserUncheckedUpdateWithoutSessionsInput>
  }

  export type UserCreateNestedOneWithoutAccountsInput = {
    create?: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAccountsInput
    connect?: UserWhereUniqueInput
  }

  export type TransactionCreateNestedManyWithoutAccountInput = {
    create?: XOR<TransactionCreateWithoutAccountInput, TransactionUncheckedCreateWithoutAccountInput> | TransactionCreateWithoutAccountInput[] | TransactionUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutAccountInput | TransactionCreateOrConnectWithoutAccountInput[]
    createMany?: TransactionCreateManyAccountInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type PayScheduleCreateNestedManyWithoutAccountInput = {
    create?: XOR<PayScheduleCreateWithoutAccountInput, PayScheduleUncheckedCreateWithoutAccountInput> | PayScheduleCreateWithoutAccountInput[] | PayScheduleUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: PayScheduleCreateOrConnectWithoutAccountInput | PayScheduleCreateOrConnectWithoutAccountInput[]
    createMany?: PayScheduleCreateManyAccountInputEnvelope
    connect?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
  }

  export type TransactionUncheckedCreateNestedManyWithoutAccountInput = {
    create?: XOR<TransactionCreateWithoutAccountInput, TransactionUncheckedCreateWithoutAccountInput> | TransactionCreateWithoutAccountInput[] | TransactionUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutAccountInput | TransactionCreateOrConnectWithoutAccountInput[]
    createMany?: TransactionCreateManyAccountInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type PayScheduleUncheckedCreateNestedManyWithoutAccountInput = {
    create?: XOR<PayScheduleCreateWithoutAccountInput, PayScheduleUncheckedCreateWithoutAccountInput> | PayScheduleCreateWithoutAccountInput[] | PayScheduleUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: PayScheduleCreateOrConnectWithoutAccountInput | PayScheduleCreateOrConnectWithoutAccountInput[]
    createMany?: PayScheduleCreateManyAccountInputEnvelope
    connect?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type UserUpdateOneRequiredWithoutAccountsNestedInput = {
    create?: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAccountsInput
    upsert?: UserUpsertWithoutAccountsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAccountsInput, UserUpdateWithoutAccountsInput>, UserUncheckedUpdateWithoutAccountsInput>
  }

  export type TransactionUpdateManyWithoutAccountNestedInput = {
    create?: XOR<TransactionCreateWithoutAccountInput, TransactionUncheckedCreateWithoutAccountInput> | TransactionCreateWithoutAccountInput[] | TransactionUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutAccountInput | TransactionCreateOrConnectWithoutAccountInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutAccountInput | TransactionUpsertWithWhereUniqueWithoutAccountInput[]
    createMany?: TransactionCreateManyAccountInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutAccountInput | TransactionUpdateWithWhereUniqueWithoutAccountInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutAccountInput | TransactionUpdateManyWithWhereWithoutAccountInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type PayScheduleUpdateManyWithoutAccountNestedInput = {
    create?: XOR<PayScheduleCreateWithoutAccountInput, PayScheduleUncheckedCreateWithoutAccountInput> | PayScheduleCreateWithoutAccountInput[] | PayScheduleUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: PayScheduleCreateOrConnectWithoutAccountInput | PayScheduleCreateOrConnectWithoutAccountInput[]
    upsert?: PayScheduleUpsertWithWhereUniqueWithoutAccountInput | PayScheduleUpsertWithWhereUniqueWithoutAccountInput[]
    createMany?: PayScheduleCreateManyAccountInputEnvelope
    set?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    disconnect?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    delete?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    connect?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    update?: PayScheduleUpdateWithWhereUniqueWithoutAccountInput | PayScheduleUpdateWithWhereUniqueWithoutAccountInput[]
    updateMany?: PayScheduleUpdateManyWithWhereWithoutAccountInput | PayScheduleUpdateManyWithWhereWithoutAccountInput[]
    deleteMany?: PayScheduleScalarWhereInput | PayScheduleScalarWhereInput[]
  }

  export type TransactionUncheckedUpdateManyWithoutAccountNestedInput = {
    create?: XOR<TransactionCreateWithoutAccountInput, TransactionUncheckedCreateWithoutAccountInput> | TransactionCreateWithoutAccountInput[] | TransactionUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutAccountInput | TransactionCreateOrConnectWithoutAccountInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutAccountInput | TransactionUpsertWithWhereUniqueWithoutAccountInput[]
    createMany?: TransactionCreateManyAccountInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutAccountInput | TransactionUpdateWithWhereUniqueWithoutAccountInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutAccountInput | TransactionUpdateManyWithWhereWithoutAccountInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type PayScheduleUncheckedUpdateManyWithoutAccountNestedInput = {
    create?: XOR<PayScheduleCreateWithoutAccountInput, PayScheduleUncheckedCreateWithoutAccountInput> | PayScheduleCreateWithoutAccountInput[] | PayScheduleUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: PayScheduleCreateOrConnectWithoutAccountInput | PayScheduleCreateOrConnectWithoutAccountInput[]
    upsert?: PayScheduleUpsertWithWhereUniqueWithoutAccountInput | PayScheduleUpsertWithWhereUniqueWithoutAccountInput[]
    createMany?: PayScheduleCreateManyAccountInputEnvelope
    set?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    disconnect?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    delete?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    connect?: PayScheduleWhereUniqueInput | PayScheduleWhereUniqueInput[]
    update?: PayScheduleUpdateWithWhereUniqueWithoutAccountInput | PayScheduleUpdateWithWhereUniqueWithoutAccountInput[]
    updateMany?: PayScheduleUpdateManyWithWhereWithoutAccountInput | PayScheduleUpdateManyWithWhereWithoutAccountInput[]
    deleteMany?: PayScheduleScalarWhereInput | PayScheduleScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutEnvelopesInput = {
    create?: XOR<UserCreateWithoutEnvelopesInput, UserUncheckedCreateWithoutEnvelopesInput>
    connectOrCreate?: UserCreateOrConnectWithoutEnvelopesInput
    connect?: UserWhereUniqueInput
  }

  export type TransactionCreateNestedManyWithoutEnvelopeInput = {
    create?: XOR<TransactionCreateWithoutEnvelopeInput, TransactionUncheckedCreateWithoutEnvelopeInput> | TransactionCreateWithoutEnvelopeInput[] | TransactionUncheckedCreateWithoutEnvelopeInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutEnvelopeInput | TransactionCreateOrConnectWithoutEnvelopeInput[]
    createMany?: TransactionCreateManyEnvelopeInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type AllocationRuleCreateNestedManyWithoutEnvelopeInput = {
    create?: XOR<AllocationRuleCreateWithoutEnvelopeInput, AllocationRuleUncheckedCreateWithoutEnvelopeInput> | AllocationRuleCreateWithoutEnvelopeInput[] | AllocationRuleUncheckedCreateWithoutEnvelopeInput[]
    connectOrCreate?: AllocationRuleCreateOrConnectWithoutEnvelopeInput | AllocationRuleCreateOrConnectWithoutEnvelopeInput[]
    createMany?: AllocationRuleCreateManyEnvelopeInputEnvelope
    connect?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
  }

  export type TransactionUncheckedCreateNestedManyWithoutEnvelopeInput = {
    create?: XOR<TransactionCreateWithoutEnvelopeInput, TransactionUncheckedCreateWithoutEnvelopeInput> | TransactionCreateWithoutEnvelopeInput[] | TransactionUncheckedCreateWithoutEnvelopeInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutEnvelopeInput | TransactionCreateOrConnectWithoutEnvelopeInput[]
    createMany?: TransactionCreateManyEnvelopeInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type AllocationRuleUncheckedCreateNestedManyWithoutEnvelopeInput = {
    create?: XOR<AllocationRuleCreateWithoutEnvelopeInput, AllocationRuleUncheckedCreateWithoutEnvelopeInput> | AllocationRuleCreateWithoutEnvelopeInput[] | AllocationRuleUncheckedCreateWithoutEnvelopeInput[]
    connectOrCreate?: AllocationRuleCreateOrConnectWithoutEnvelopeInput | AllocationRuleCreateOrConnectWithoutEnvelopeInput[]
    createMany?: AllocationRuleCreateManyEnvelopeInputEnvelope
    connect?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
  }

  export type UserUpdateOneRequiredWithoutEnvelopesNestedInput = {
    create?: XOR<UserCreateWithoutEnvelopesInput, UserUncheckedCreateWithoutEnvelopesInput>
    connectOrCreate?: UserCreateOrConnectWithoutEnvelopesInput
    upsert?: UserUpsertWithoutEnvelopesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutEnvelopesInput, UserUpdateWithoutEnvelopesInput>, UserUncheckedUpdateWithoutEnvelopesInput>
  }

  export type TransactionUpdateManyWithoutEnvelopeNestedInput = {
    create?: XOR<TransactionCreateWithoutEnvelopeInput, TransactionUncheckedCreateWithoutEnvelopeInput> | TransactionCreateWithoutEnvelopeInput[] | TransactionUncheckedCreateWithoutEnvelopeInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutEnvelopeInput | TransactionCreateOrConnectWithoutEnvelopeInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutEnvelopeInput | TransactionUpsertWithWhereUniqueWithoutEnvelopeInput[]
    createMany?: TransactionCreateManyEnvelopeInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutEnvelopeInput | TransactionUpdateWithWhereUniqueWithoutEnvelopeInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutEnvelopeInput | TransactionUpdateManyWithWhereWithoutEnvelopeInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type AllocationRuleUpdateManyWithoutEnvelopeNestedInput = {
    create?: XOR<AllocationRuleCreateWithoutEnvelopeInput, AllocationRuleUncheckedCreateWithoutEnvelopeInput> | AllocationRuleCreateWithoutEnvelopeInput[] | AllocationRuleUncheckedCreateWithoutEnvelopeInput[]
    connectOrCreate?: AllocationRuleCreateOrConnectWithoutEnvelopeInput | AllocationRuleCreateOrConnectWithoutEnvelopeInput[]
    upsert?: AllocationRuleUpsertWithWhereUniqueWithoutEnvelopeInput | AllocationRuleUpsertWithWhereUniqueWithoutEnvelopeInput[]
    createMany?: AllocationRuleCreateManyEnvelopeInputEnvelope
    set?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    disconnect?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    delete?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    connect?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    update?: AllocationRuleUpdateWithWhereUniqueWithoutEnvelopeInput | AllocationRuleUpdateWithWhereUniqueWithoutEnvelopeInput[]
    updateMany?: AllocationRuleUpdateManyWithWhereWithoutEnvelopeInput | AllocationRuleUpdateManyWithWhereWithoutEnvelopeInput[]
    deleteMany?: AllocationRuleScalarWhereInput | AllocationRuleScalarWhereInput[]
  }

  export type TransactionUncheckedUpdateManyWithoutEnvelopeNestedInput = {
    create?: XOR<TransactionCreateWithoutEnvelopeInput, TransactionUncheckedCreateWithoutEnvelopeInput> | TransactionCreateWithoutEnvelopeInput[] | TransactionUncheckedCreateWithoutEnvelopeInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutEnvelopeInput | TransactionCreateOrConnectWithoutEnvelopeInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutEnvelopeInput | TransactionUpsertWithWhereUniqueWithoutEnvelopeInput[]
    createMany?: TransactionCreateManyEnvelopeInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutEnvelopeInput | TransactionUpdateWithWhereUniqueWithoutEnvelopeInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutEnvelopeInput | TransactionUpdateManyWithWhereWithoutEnvelopeInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type AllocationRuleUncheckedUpdateManyWithoutEnvelopeNestedInput = {
    create?: XOR<AllocationRuleCreateWithoutEnvelopeInput, AllocationRuleUncheckedCreateWithoutEnvelopeInput> | AllocationRuleCreateWithoutEnvelopeInput[] | AllocationRuleUncheckedCreateWithoutEnvelopeInput[]
    connectOrCreate?: AllocationRuleCreateOrConnectWithoutEnvelopeInput | AllocationRuleCreateOrConnectWithoutEnvelopeInput[]
    upsert?: AllocationRuleUpsertWithWhereUniqueWithoutEnvelopeInput | AllocationRuleUpsertWithWhereUniqueWithoutEnvelopeInput[]
    createMany?: AllocationRuleCreateManyEnvelopeInputEnvelope
    set?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    disconnect?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    delete?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    connect?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    update?: AllocationRuleUpdateWithWhereUniqueWithoutEnvelopeInput | AllocationRuleUpdateWithWhereUniqueWithoutEnvelopeInput[]
    updateMany?: AllocationRuleUpdateManyWithWhereWithoutEnvelopeInput | AllocationRuleUpdateManyWithWhereWithoutEnvelopeInput[]
    deleteMany?: AllocationRuleScalarWhereInput | AllocationRuleScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutTransactionsInput = {
    create?: XOR<UserCreateWithoutTransactionsInput, UserUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutTransactionsInput
    connect?: UserWhereUniqueInput
  }

  export type AccountCreateNestedOneWithoutTransactionsInput = {
    create?: XOR<AccountCreateWithoutTransactionsInput, AccountUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: AccountCreateOrConnectWithoutTransactionsInput
    connect?: AccountWhereUniqueInput
  }

  export type EnvelopeCreateNestedOneWithoutTransactionsInput = {
    create?: XOR<EnvelopeCreateWithoutTransactionsInput, EnvelopeUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: EnvelopeCreateOrConnectWithoutTransactionsInput
    connect?: EnvelopeWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutTransactionsNestedInput = {
    create?: XOR<UserCreateWithoutTransactionsInput, UserUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutTransactionsInput
    upsert?: UserUpsertWithoutTransactionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutTransactionsInput, UserUpdateWithoutTransactionsInput>, UserUncheckedUpdateWithoutTransactionsInput>
  }

  export type AccountUpdateOneRequiredWithoutTransactionsNestedInput = {
    create?: XOR<AccountCreateWithoutTransactionsInput, AccountUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: AccountCreateOrConnectWithoutTransactionsInput
    upsert?: AccountUpsertWithoutTransactionsInput
    connect?: AccountWhereUniqueInput
    update?: XOR<XOR<AccountUpdateToOneWithWhereWithoutTransactionsInput, AccountUpdateWithoutTransactionsInput>, AccountUncheckedUpdateWithoutTransactionsInput>
  }

  export type EnvelopeUpdateOneWithoutTransactionsNestedInput = {
    create?: XOR<EnvelopeCreateWithoutTransactionsInput, EnvelopeUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: EnvelopeCreateOrConnectWithoutTransactionsInput
    upsert?: EnvelopeUpsertWithoutTransactionsInput
    disconnect?: EnvelopeWhereInput | boolean
    delete?: EnvelopeWhereInput | boolean
    connect?: EnvelopeWhereUniqueInput
    update?: XOR<XOR<EnvelopeUpdateToOneWithWhereWithoutTransactionsInput, EnvelopeUpdateWithoutTransactionsInput>, EnvelopeUncheckedUpdateWithoutTransactionsInput>
  }

  export type UserCreateNestedOneWithoutPaySchedulesInput = {
    create?: XOR<UserCreateWithoutPaySchedulesInput, UserUncheckedCreateWithoutPaySchedulesInput>
    connectOrCreate?: UserCreateOrConnectWithoutPaySchedulesInput
    connect?: UserWhereUniqueInput
  }

  export type AccountCreateNestedOneWithoutPaySchedulesInput = {
    create?: XOR<AccountCreateWithoutPaySchedulesInput, AccountUncheckedCreateWithoutPaySchedulesInput>
    connectOrCreate?: AccountCreateOrConnectWithoutPaySchedulesInput
    connect?: AccountWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutPaySchedulesNestedInput = {
    create?: XOR<UserCreateWithoutPaySchedulesInput, UserUncheckedCreateWithoutPaySchedulesInput>
    connectOrCreate?: UserCreateOrConnectWithoutPaySchedulesInput
    upsert?: UserUpsertWithoutPaySchedulesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutPaySchedulesInput, UserUpdateWithoutPaySchedulesInput>, UserUncheckedUpdateWithoutPaySchedulesInput>
  }

  export type AccountUpdateOneRequiredWithoutPaySchedulesNestedInput = {
    create?: XOR<AccountCreateWithoutPaySchedulesInput, AccountUncheckedCreateWithoutPaySchedulesInput>
    connectOrCreate?: AccountCreateOrConnectWithoutPaySchedulesInput
    upsert?: AccountUpsertWithoutPaySchedulesInput
    connect?: AccountWhereUniqueInput
    update?: XOR<XOR<AccountUpdateToOneWithWhereWithoutPaySchedulesInput, AccountUpdateWithoutPaySchedulesInput>, AccountUncheckedUpdateWithoutPaySchedulesInput>
  }

  export type UserCreateNestedOneWithoutGoalsInput = {
    create?: XOR<UserCreateWithoutGoalsInput, UserUncheckedCreateWithoutGoalsInput>
    connectOrCreate?: UserCreateOrConnectWithoutGoalsInput
    connect?: UserWhereUniqueInput
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type EnumGoalKindFieldUpdateOperationsInput = {
    set?: $Enums.GoalKind
  }

  export type UserUpdateOneRequiredWithoutGoalsNestedInput = {
    create?: XOR<UserCreateWithoutGoalsInput, UserUncheckedCreateWithoutGoalsInput>
    connectOrCreate?: UserCreateOrConnectWithoutGoalsInput
    upsert?: UserUpsertWithoutGoalsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutGoalsInput, UserUpdateWithoutGoalsInput>, UserUncheckedUpdateWithoutGoalsInput>
  }

  export type UserCreateNestedOneWithoutAllocationPlansInput = {
    create?: XOR<UserCreateWithoutAllocationPlansInput, UserUncheckedCreateWithoutAllocationPlansInput>
    connectOrCreate?: UserCreateOrConnectWithoutAllocationPlansInput
    connect?: UserWhereUniqueInput
  }

  export type AllocationRuleCreateNestedManyWithoutPlanInput = {
    create?: XOR<AllocationRuleCreateWithoutPlanInput, AllocationRuleUncheckedCreateWithoutPlanInput> | AllocationRuleCreateWithoutPlanInput[] | AllocationRuleUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: AllocationRuleCreateOrConnectWithoutPlanInput | AllocationRuleCreateOrConnectWithoutPlanInput[]
    createMany?: AllocationRuleCreateManyPlanInputEnvelope
    connect?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
  }

  export type AllocationRuleUncheckedCreateNestedManyWithoutPlanInput = {
    create?: XOR<AllocationRuleCreateWithoutPlanInput, AllocationRuleUncheckedCreateWithoutPlanInput> | AllocationRuleCreateWithoutPlanInput[] | AllocationRuleUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: AllocationRuleCreateOrConnectWithoutPlanInput | AllocationRuleCreateOrConnectWithoutPlanInput[]
    createMany?: AllocationRuleCreateManyPlanInputEnvelope
    connect?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
  }

  export type UserUpdateOneRequiredWithoutAllocationPlansNestedInput = {
    create?: XOR<UserCreateWithoutAllocationPlansInput, UserUncheckedCreateWithoutAllocationPlansInput>
    connectOrCreate?: UserCreateOrConnectWithoutAllocationPlansInput
    upsert?: UserUpsertWithoutAllocationPlansInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAllocationPlansInput, UserUpdateWithoutAllocationPlansInput>, UserUncheckedUpdateWithoutAllocationPlansInput>
  }

  export type AllocationRuleUpdateManyWithoutPlanNestedInput = {
    create?: XOR<AllocationRuleCreateWithoutPlanInput, AllocationRuleUncheckedCreateWithoutPlanInput> | AllocationRuleCreateWithoutPlanInput[] | AllocationRuleUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: AllocationRuleCreateOrConnectWithoutPlanInput | AllocationRuleCreateOrConnectWithoutPlanInput[]
    upsert?: AllocationRuleUpsertWithWhereUniqueWithoutPlanInput | AllocationRuleUpsertWithWhereUniqueWithoutPlanInput[]
    createMany?: AllocationRuleCreateManyPlanInputEnvelope
    set?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    disconnect?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    delete?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    connect?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    update?: AllocationRuleUpdateWithWhereUniqueWithoutPlanInput | AllocationRuleUpdateWithWhereUniqueWithoutPlanInput[]
    updateMany?: AllocationRuleUpdateManyWithWhereWithoutPlanInput | AllocationRuleUpdateManyWithWhereWithoutPlanInput[]
    deleteMany?: AllocationRuleScalarWhereInput | AllocationRuleScalarWhereInput[]
  }

  export type AllocationRuleUncheckedUpdateManyWithoutPlanNestedInput = {
    create?: XOR<AllocationRuleCreateWithoutPlanInput, AllocationRuleUncheckedCreateWithoutPlanInput> | AllocationRuleCreateWithoutPlanInput[] | AllocationRuleUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: AllocationRuleCreateOrConnectWithoutPlanInput | AllocationRuleCreateOrConnectWithoutPlanInput[]
    upsert?: AllocationRuleUpsertWithWhereUniqueWithoutPlanInput | AllocationRuleUpsertWithWhereUniqueWithoutPlanInput[]
    createMany?: AllocationRuleCreateManyPlanInputEnvelope
    set?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    disconnect?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    delete?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    connect?: AllocationRuleWhereUniqueInput | AllocationRuleWhereUniqueInput[]
    update?: AllocationRuleUpdateWithWhereUniqueWithoutPlanInput | AllocationRuleUpdateWithWhereUniqueWithoutPlanInput[]
    updateMany?: AllocationRuleUpdateManyWithWhereWithoutPlanInput | AllocationRuleUpdateManyWithWhereWithoutPlanInput[]
    deleteMany?: AllocationRuleScalarWhereInput | AllocationRuleScalarWhereInput[]
  }

  export type AllocationPlanCreateNestedOneWithoutRulesInput = {
    create?: XOR<AllocationPlanCreateWithoutRulesInput, AllocationPlanUncheckedCreateWithoutRulesInput>
    connectOrCreate?: AllocationPlanCreateOrConnectWithoutRulesInput
    connect?: AllocationPlanWhereUniqueInput
  }

  export type EnvelopeCreateNestedOneWithoutAllocationRulesInput = {
    create?: XOR<EnvelopeCreateWithoutAllocationRulesInput, EnvelopeUncheckedCreateWithoutAllocationRulesInput>
    connectOrCreate?: EnvelopeCreateOrConnectWithoutAllocationRulesInput
    connect?: EnvelopeWhereUniqueInput
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type AllocationPlanUpdateOneRequiredWithoutRulesNestedInput = {
    create?: XOR<AllocationPlanCreateWithoutRulesInput, AllocationPlanUncheckedCreateWithoutRulesInput>
    connectOrCreate?: AllocationPlanCreateOrConnectWithoutRulesInput
    upsert?: AllocationPlanUpsertWithoutRulesInput
    connect?: AllocationPlanWhereUniqueInput
    update?: XOR<XOR<AllocationPlanUpdateToOneWithWhereWithoutRulesInput, AllocationPlanUpdateWithoutRulesInput>, AllocationPlanUncheckedUpdateWithoutRulesInput>
  }

  export type EnvelopeUpdateOneRequiredWithoutAllocationRulesNestedInput = {
    create?: XOR<EnvelopeCreateWithoutAllocationRulesInput, EnvelopeUncheckedCreateWithoutAllocationRulesInput>
    connectOrCreate?: EnvelopeCreateOrConnectWithoutAllocationRulesInput
    upsert?: EnvelopeUpsertWithoutAllocationRulesInput
    connect?: EnvelopeWhereUniqueInput
    update?: XOR<XOR<EnvelopeUpdateToOneWithWhereWithoutAllocationRulesInput, EnvelopeUpdateWithoutAllocationRulesInput>, EnvelopeUncheckedUpdateWithoutAllocationRulesInput>
  }

  export type UserCreateNestedOneWithoutAuditLogInput = {
    create?: XOR<UserCreateWithoutAuditLogInput, UserUncheckedCreateWithoutAuditLogInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuditLogInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutAuditLogNestedInput = {
    create?: XOR<UserCreateWithoutAuditLogInput, UserUncheckedCreateWithoutAuditLogInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuditLogInput
    upsert?: UserUpsertWithoutAuditLogInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAuditLogInput, UserUpdateWithoutAuditLogInput>, UserUncheckedUpdateWithoutAuditLogInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedEnumGoalKindFilter<$PrismaModel = never> = {
    equals?: $Enums.GoalKind | EnumGoalKindFieldRefInput<$PrismaModel>
    in?: $Enums.GoalKind[]
    notIn?: $Enums.GoalKind[]
    not?: NestedEnumGoalKindFilter<$PrismaModel> | $Enums.GoalKind
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedEnumGoalKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.GoalKind | EnumGoalKindFieldRefInput<$PrismaModel>
    in?: $Enums.GoalKind[]
    notIn?: $Enums.GoalKind[]
    not?: NestedEnumGoalKindWithAggregatesFilter<$PrismaModel> | $Enums.GoalKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumGoalKindFilter<$PrismaModel>
    _max?: NestedEnumGoalKindFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type SessionCreateWithoutUserInput = {
    id?: string
    tokenHash: string
    userAgent?: string | null
    ip?: string | null
    lastSeenAt?: Date | string
    createdAt?: Date | string
    expiresAt: Date | string
  }

  export type SessionUncheckedCreateWithoutUserInput = {
    id?: string
    tokenHash: string
    userAgent?: string | null
    ip?: string | null
    lastSeenAt?: Date | string
    createdAt?: Date | string
    expiresAt: Date | string
  }

  export type SessionCreateOrConnectWithoutUserInput = {
    where: SessionWhereUniqueInput
    create: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput>
  }

  export type SessionCreateManyUserInputEnvelope = {
    data: SessionCreateManyUserInput | SessionCreateManyUserInput[]
  }

  export type AccountCreateWithoutUserInput = {
    id?: string
    name: string
    type: string
    currentBalance?: number
    institution?: string | null
    mask?: string | null
    routingEnabled?: boolean
    isArchived?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionCreateNestedManyWithoutAccountInput
    paySchedules?: PayScheduleCreateNestedManyWithoutAccountInput
  }

  export type AccountUncheckedCreateWithoutUserInput = {
    id?: string
    name: string
    type: string
    currentBalance?: number
    institution?: string | null
    mask?: string | null
    routingEnabled?: boolean
    isArchived?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutAccountInput
    paySchedules?: PayScheduleUncheckedCreateNestedManyWithoutAccountInput
  }

  export type AccountCreateOrConnectWithoutUserInput = {
    where: AccountWhereUniqueInput
    create: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput>
  }

  export type AccountCreateManyUserInputEnvelope = {
    data: AccountCreateManyUserInput | AccountCreateManyUserInput[]
  }

  export type EnvelopeCreateWithoutUserInput = {
    id?: string
    name: string
    targetBalance?: number
    currentBalance?: number
    planet?: string | null
    color?: string | null
    icon?: string | null
    destinationAccountId?: string | null
    enforceHardCap?: boolean
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionCreateNestedManyWithoutEnvelopeInput
    allocationRules?: AllocationRuleCreateNestedManyWithoutEnvelopeInput
  }

  export type EnvelopeUncheckedCreateWithoutUserInput = {
    id?: string
    name: string
    targetBalance?: number
    currentBalance?: number
    planet?: string | null
    color?: string | null
    icon?: string | null
    destinationAccountId?: string | null
    enforceHardCap?: boolean
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutEnvelopeInput
    allocationRules?: AllocationRuleUncheckedCreateNestedManyWithoutEnvelopeInput
  }

  export type EnvelopeCreateOrConnectWithoutUserInput = {
    where: EnvelopeWhereUniqueInput
    create: XOR<EnvelopeCreateWithoutUserInput, EnvelopeUncheckedCreateWithoutUserInput>
  }

  export type EnvelopeCreateManyUserInputEnvelope = {
    data: EnvelopeCreateManyUserInput | EnvelopeCreateManyUserInput[]
  }

  export type TransactionCreateWithoutUserInput = {
    id?: string
    amount: number
    date: Date | string
    payee: string
    notes?: string | null
    source?: string
    metadata?: string
    isPrimaMateria?: boolean
    fromPlanId?: string | null
    fromPaycheckId?: string | null
    cleared?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    account: AccountCreateNestedOneWithoutTransactionsInput
    envelope?: EnvelopeCreateNestedOneWithoutTransactionsInput
  }

  export type TransactionUncheckedCreateWithoutUserInput = {
    id?: string
    accountId: string
    envelopeId?: string | null
    amount: number
    date: Date | string
    payee: string
    notes?: string | null
    source?: string
    metadata?: string
    isPrimaMateria?: boolean
    fromPlanId?: string | null
    fromPaycheckId?: string | null
    cleared?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionCreateOrConnectWithoutUserInput = {
    where: TransactionWhereUniqueInput
    create: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput>
  }

  export type TransactionCreateManyUserInputEnvelope = {
    data: TransactionCreateManyUserInput | TransactionCreateManyUserInput[]
  }

  export type PayScheduleCreateWithoutUserInput = {
    id?: string
    cadence: string
    amount: number
    startDate: Date | string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    account: AccountCreateNestedOneWithoutPaySchedulesInput
  }

  export type PayScheduleUncheckedCreateWithoutUserInput = {
    id?: string
    cadence: string
    amount: number
    accountId: string
    startDate: Date | string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PayScheduleCreateOrConnectWithoutUserInput = {
    where: PayScheduleWhereUniqueInput
    create: XOR<PayScheduleCreateWithoutUserInput, PayScheduleUncheckedCreateWithoutUserInput>
  }

  export type PayScheduleCreateManyUserInputEnvelope = {
    data: PayScheduleCreateManyUserInput | PayScheduleCreateManyUserInput[]
  }

  export type GoalCreateWithoutUserInput = {
    id?: string
    name: string
    description?: string | null
    targetAmount: number
    currentAmount?: number
    targetDate?: Date | string | null
    envelopeId?: string | null
    planet?: string | null
    isPrimary?: boolean
    kind?: $Enums.GoalKind
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GoalUncheckedCreateWithoutUserInput = {
    id?: string
    name: string
    description?: string | null
    targetAmount: number
    currentAmount?: number
    targetDate?: Date | string | null
    envelopeId?: string | null
    planet?: string | null
    isPrimary?: boolean
    kind?: $Enums.GoalKind
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GoalCreateOrConnectWithoutUserInput = {
    where: GoalWhereUniqueInput
    create: XOR<GoalCreateWithoutUserInput, GoalUncheckedCreateWithoutUserInput>
  }

  export type GoalCreateManyUserInputEnvelope = {
    data: GoalCreateManyUserInput | GoalCreateManyUserInput[]
  }

  export type AllocationPlanCreateWithoutUserInput = {
    id?: string
    strategyId?: string
    isArmed?: boolean
    name?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    rules?: AllocationRuleCreateNestedManyWithoutPlanInput
  }

  export type AllocationPlanUncheckedCreateWithoutUserInput = {
    id?: string
    strategyId?: string
    isArmed?: boolean
    name?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    rules?: AllocationRuleUncheckedCreateNestedManyWithoutPlanInput
  }

  export type AllocationPlanCreateOrConnectWithoutUserInput = {
    where: AllocationPlanWhereUniqueInput
    create: XOR<AllocationPlanCreateWithoutUserInput, AllocationPlanUncheckedCreateWithoutUserInput>
  }

  export type AllocationPlanCreateManyUserInputEnvelope = {
    data: AllocationPlanCreateManyUserInput | AllocationPlanCreateManyUserInput[]
  }

  export type AuditLogCreateWithoutUserInput = {
    id?: string
    actionType: string
    payload?: string
    aiTierAtTime?: number
    createdAt?: Date | string
  }

  export type AuditLogUncheckedCreateWithoutUserInput = {
    id?: string
    actionType: string
    payload?: string
    aiTierAtTime?: number
    createdAt?: Date | string
  }

  export type AuditLogCreateOrConnectWithoutUserInput = {
    where: AuditLogWhereUniqueInput
    create: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput>
  }

  export type AuditLogCreateManyUserInputEnvelope = {
    data: AuditLogCreateManyUserInput | AuditLogCreateManyUserInput[]
  }

  export type SessionUpsertWithWhereUniqueWithoutUserInput = {
    where: SessionWhereUniqueInput
    update: XOR<SessionUpdateWithoutUserInput, SessionUncheckedUpdateWithoutUserInput>
    create: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput>
  }

  export type SessionUpdateWithWhereUniqueWithoutUserInput = {
    where: SessionWhereUniqueInput
    data: XOR<SessionUpdateWithoutUserInput, SessionUncheckedUpdateWithoutUserInput>
  }

  export type SessionUpdateManyWithWhereWithoutUserInput = {
    where: SessionScalarWhereInput
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyWithoutUserInput>
  }

  export type SessionScalarWhereInput = {
    AND?: SessionScalarWhereInput | SessionScalarWhereInput[]
    OR?: SessionScalarWhereInput[]
    NOT?: SessionScalarWhereInput | SessionScalarWhereInput[]
    id?: StringFilter<"Session"> | string
    userId?: StringFilter<"Session"> | string
    tokenHash?: StringFilter<"Session"> | string
    userAgent?: StringNullableFilter<"Session"> | string | null
    ip?: StringNullableFilter<"Session"> | string | null
    lastSeenAt?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    expiresAt?: DateTimeFilter<"Session"> | Date | string
  }

  export type AccountUpsertWithWhereUniqueWithoutUserInput = {
    where: AccountWhereUniqueInput
    update: XOR<AccountUpdateWithoutUserInput, AccountUncheckedUpdateWithoutUserInput>
    create: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput>
  }

  export type AccountUpdateWithWhereUniqueWithoutUserInput = {
    where: AccountWhereUniqueInput
    data: XOR<AccountUpdateWithoutUserInput, AccountUncheckedUpdateWithoutUserInput>
  }

  export type AccountUpdateManyWithWhereWithoutUserInput = {
    where: AccountScalarWhereInput
    data: XOR<AccountUpdateManyMutationInput, AccountUncheckedUpdateManyWithoutUserInput>
  }

  export type AccountScalarWhereInput = {
    AND?: AccountScalarWhereInput | AccountScalarWhereInput[]
    OR?: AccountScalarWhereInput[]
    NOT?: AccountScalarWhereInput | AccountScalarWhereInput[]
    id?: StringFilter<"Account"> | string
    userId?: StringFilter<"Account"> | string
    name?: StringFilter<"Account"> | string
    type?: StringFilter<"Account"> | string
    currentBalance?: IntFilter<"Account"> | number
    institution?: StringNullableFilter<"Account"> | string | null
    mask?: StringNullableFilter<"Account"> | string | null
    routingEnabled?: BoolFilter<"Account"> | boolean
    isArchived?: BoolFilter<"Account"> | boolean
    sortOrder?: IntFilter<"Account"> | number
    createdAt?: DateTimeFilter<"Account"> | Date | string
    updatedAt?: DateTimeFilter<"Account"> | Date | string
  }

  export type EnvelopeUpsertWithWhereUniqueWithoutUserInput = {
    where: EnvelopeWhereUniqueInput
    update: XOR<EnvelopeUpdateWithoutUserInput, EnvelopeUncheckedUpdateWithoutUserInput>
    create: XOR<EnvelopeCreateWithoutUserInput, EnvelopeUncheckedCreateWithoutUserInput>
  }

  export type EnvelopeUpdateWithWhereUniqueWithoutUserInput = {
    where: EnvelopeWhereUniqueInput
    data: XOR<EnvelopeUpdateWithoutUserInput, EnvelopeUncheckedUpdateWithoutUserInput>
  }

  export type EnvelopeUpdateManyWithWhereWithoutUserInput = {
    where: EnvelopeScalarWhereInput
    data: XOR<EnvelopeUpdateManyMutationInput, EnvelopeUncheckedUpdateManyWithoutUserInput>
  }

  export type EnvelopeScalarWhereInput = {
    AND?: EnvelopeScalarWhereInput | EnvelopeScalarWhereInput[]
    OR?: EnvelopeScalarWhereInput[]
    NOT?: EnvelopeScalarWhereInput | EnvelopeScalarWhereInput[]
    id?: StringFilter<"Envelope"> | string
    userId?: StringFilter<"Envelope"> | string
    name?: StringFilter<"Envelope"> | string
    targetBalance?: IntFilter<"Envelope"> | number
    currentBalance?: IntFilter<"Envelope"> | number
    planet?: StringNullableFilter<"Envelope"> | string | null
    color?: StringNullableFilter<"Envelope"> | string | null
    icon?: StringNullableFilter<"Envelope"> | string | null
    destinationAccountId?: StringNullableFilter<"Envelope"> | string | null
    enforceHardCap?: BoolFilter<"Envelope"> | boolean
    sortOrder?: IntFilter<"Envelope"> | number
    isArchived?: BoolFilter<"Envelope"> | boolean
    createdAt?: DateTimeFilter<"Envelope"> | Date | string
    updatedAt?: DateTimeFilter<"Envelope"> | Date | string
  }

  export type TransactionUpsertWithWhereUniqueWithoutUserInput = {
    where: TransactionWhereUniqueInput
    update: XOR<TransactionUpdateWithoutUserInput, TransactionUncheckedUpdateWithoutUserInput>
    create: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput>
  }

  export type TransactionUpdateWithWhereUniqueWithoutUserInput = {
    where: TransactionWhereUniqueInput
    data: XOR<TransactionUpdateWithoutUserInput, TransactionUncheckedUpdateWithoutUserInput>
  }

  export type TransactionUpdateManyWithWhereWithoutUserInput = {
    where: TransactionScalarWhereInput
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyWithoutUserInput>
  }

  export type TransactionScalarWhereInput = {
    AND?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
    OR?: TransactionScalarWhereInput[]
    NOT?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
    id?: StringFilter<"Transaction"> | string
    userId?: StringFilter<"Transaction"> | string
    accountId?: StringFilter<"Transaction"> | string
    envelopeId?: StringNullableFilter<"Transaction"> | string | null
    amount?: IntFilter<"Transaction"> | number
    date?: DateTimeFilter<"Transaction"> | Date | string
    payee?: StringFilter<"Transaction"> | string
    notes?: StringNullableFilter<"Transaction"> | string | null
    source?: StringFilter<"Transaction"> | string
    metadata?: StringFilter<"Transaction"> | string
    isPrimaMateria?: BoolFilter<"Transaction"> | boolean
    fromPlanId?: StringNullableFilter<"Transaction"> | string | null
    fromPaycheckId?: StringNullableFilter<"Transaction"> | string | null
    cleared?: BoolFilter<"Transaction"> | boolean
    createdAt?: DateTimeFilter<"Transaction"> | Date | string
    updatedAt?: DateTimeFilter<"Transaction"> | Date | string
  }

  export type PayScheduleUpsertWithWhereUniqueWithoutUserInput = {
    where: PayScheduleWhereUniqueInput
    update: XOR<PayScheduleUpdateWithoutUserInput, PayScheduleUncheckedUpdateWithoutUserInput>
    create: XOR<PayScheduleCreateWithoutUserInput, PayScheduleUncheckedCreateWithoutUserInput>
  }

  export type PayScheduleUpdateWithWhereUniqueWithoutUserInput = {
    where: PayScheduleWhereUniqueInput
    data: XOR<PayScheduleUpdateWithoutUserInput, PayScheduleUncheckedUpdateWithoutUserInput>
  }

  export type PayScheduleUpdateManyWithWhereWithoutUserInput = {
    where: PayScheduleScalarWhereInput
    data: XOR<PayScheduleUpdateManyMutationInput, PayScheduleUncheckedUpdateManyWithoutUserInput>
  }

  export type PayScheduleScalarWhereInput = {
    AND?: PayScheduleScalarWhereInput | PayScheduleScalarWhereInput[]
    OR?: PayScheduleScalarWhereInput[]
    NOT?: PayScheduleScalarWhereInput | PayScheduleScalarWhereInput[]
    id?: StringFilter<"PaySchedule"> | string
    userId?: StringFilter<"PaySchedule"> | string
    cadence?: StringFilter<"PaySchedule"> | string
    amount?: IntFilter<"PaySchedule"> | number
    accountId?: StringFilter<"PaySchedule"> | string
    startDate?: DateTimeFilter<"PaySchedule"> | Date | string
    isActive?: BoolFilter<"PaySchedule"> | boolean
    createdAt?: DateTimeFilter<"PaySchedule"> | Date | string
    updatedAt?: DateTimeFilter<"PaySchedule"> | Date | string
  }

  export type GoalUpsertWithWhereUniqueWithoutUserInput = {
    where: GoalWhereUniqueInput
    update: XOR<GoalUpdateWithoutUserInput, GoalUncheckedUpdateWithoutUserInput>
    create: XOR<GoalCreateWithoutUserInput, GoalUncheckedCreateWithoutUserInput>
  }

  export type GoalUpdateWithWhereUniqueWithoutUserInput = {
    where: GoalWhereUniqueInput
    data: XOR<GoalUpdateWithoutUserInput, GoalUncheckedUpdateWithoutUserInput>
  }

  export type GoalUpdateManyWithWhereWithoutUserInput = {
    where: GoalScalarWhereInput
    data: XOR<GoalUpdateManyMutationInput, GoalUncheckedUpdateManyWithoutUserInput>
  }

  export type GoalScalarWhereInput = {
    AND?: GoalScalarWhereInput | GoalScalarWhereInput[]
    OR?: GoalScalarWhereInput[]
    NOT?: GoalScalarWhereInput | GoalScalarWhereInput[]
    id?: StringFilter<"Goal"> | string
    userId?: StringFilter<"Goal"> | string
    name?: StringFilter<"Goal"> | string
    description?: StringNullableFilter<"Goal"> | string | null
    targetAmount?: IntFilter<"Goal"> | number
    currentAmount?: IntFilter<"Goal"> | number
    targetDate?: DateTimeNullableFilter<"Goal"> | Date | string | null
    envelopeId?: StringNullableFilter<"Goal"> | string | null
    planet?: StringNullableFilter<"Goal"> | string | null
    isPrimary?: BoolFilter<"Goal"> | boolean
    kind?: EnumGoalKindFilter<"Goal"> | $Enums.GoalKind
    sortOrder?: IntFilter<"Goal"> | number
    isArchived?: BoolFilter<"Goal"> | boolean
    createdAt?: DateTimeFilter<"Goal"> | Date | string
    updatedAt?: DateTimeFilter<"Goal"> | Date | string
  }

  export type AllocationPlanUpsertWithWhereUniqueWithoutUserInput = {
    where: AllocationPlanWhereUniqueInput
    update: XOR<AllocationPlanUpdateWithoutUserInput, AllocationPlanUncheckedUpdateWithoutUserInput>
    create: XOR<AllocationPlanCreateWithoutUserInput, AllocationPlanUncheckedCreateWithoutUserInput>
  }

  export type AllocationPlanUpdateWithWhereUniqueWithoutUserInput = {
    where: AllocationPlanWhereUniqueInput
    data: XOR<AllocationPlanUpdateWithoutUserInput, AllocationPlanUncheckedUpdateWithoutUserInput>
  }

  export type AllocationPlanUpdateManyWithWhereWithoutUserInput = {
    where: AllocationPlanScalarWhereInput
    data: XOR<AllocationPlanUpdateManyMutationInput, AllocationPlanUncheckedUpdateManyWithoutUserInput>
  }

  export type AllocationPlanScalarWhereInput = {
    AND?: AllocationPlanScalarWhereInput | AllocationPlanScalarWhereInput[]
    OR?: AllocationPlanScalarWhereInput[]
    NOT?: AllocationPlanScalarWhereInput | AllocationPlanScalarWhereInput[]
    id?: StringFilter<"AllocationPlan"> | string
    userId?: StringFilter<"AllocationPlan"> | string
    strategyId?: StringFilter<"AllocationPlan"> | string
    isArmed?: BoolFilter<"AllocationPlan"> | boolean
    name?: StringNullableFilter<"AllocationPlan"> | string | null
    createdAt?: DateTimeFilter<"AllocationPlan"> | Date | string
    updatedAt?: DateTimeFilter<"AllocationPlan"> | Date | string
  }

  export type AuditLogUpsertWithWhereUniqueWithoutUserInput = {
    where: AuditLogWhereUniqueInput
    update: XOR<AuditLogUpdateWithoutUserInput, AuditLogUncheckedUpdateWithoutUserInput>
    create: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput>
  }

  export type AuditLogUpdateWithWhereUniqueWithoutUserInput = {
    where: AuditLogWhereUniqueInput
    data: XOR<AuditLogUpdateWithoutUserInput, AuditLogUncheckedUpdateWithoutUserInput>
  }

  export type AuditLogUpdateManyWithWhereWithoutUserInput = {
    where: AuditLogScalarWhereInput
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyWithoutUserInput>
  }

  export type AuditLogScalarWhereInput = {
    AND?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
    OR?: AuditLogScalarWhereInput[]
    NOT?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
    id?: StringFilter<"AuditLog"> | string
    userId?: StringFilter<"AuditLog"> | string
    actionType?: StringFilter<"AuditLog"> | string
    payload?: StringFilter<"AuditLog"> | string
    aiTierAtTime?: IntFilter<"AuditLog"> | number
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
  }

  export type UserCreateWithoutSessionsInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    accounts?: AccountCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleCreateNestedManyWithoutUserInput
    goals?: GoalCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanCreateNestedManyWithoutUserInput
    auditLog?: AuditLogCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutSessionsInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleUncheckedCreateNestedManyWithoutUserInput
    goals?: GoalUncheckedCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanUncheckedCreateNestedManyWithoutUserInput
    auditLog?: AuditLogUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutSessionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
  }

  export type UserUpsertWithoutSessionsInput = {
    update: XOR<UserUpdateWithoutSessionsInput, UserUncheckedUpdateWithoutSessionsInput>
    create: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSessionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSessionsInput, UserUncheckedUpdateWithoutSessionsInput>
  }

  export type UserUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    accounts?: AccountUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUpdateManyWithoutUserNestedInput
    goals?: GoalUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUncheckedUpdateManyWithoutUserNestedInput
    goals?: GoalUncheckedUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUncheckedUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutAccountsInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleCreateNestedManyWithoutUserInput
    goals?: GoalCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanCreateNestedManyWithoutUserInput
    auditLog?: AuditLogCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutAccountsInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleUncheckedCreateNestedManyWithoutUserInput
    goals?: GoalUncheckedCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanUncheckedCreateNestedManyWithoutUserInput
    auditLog?: AuditLogUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutAccountsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
  }

  export type TransactionCreateWithoutAccountInput = {
    id?: string
    amount: number
    date: Date | string
    payee: string
    notes?: string | null
    source?: string
    metadata?: string
    isPrimaMateria?: boolean
    fromPlanId?: string | null
    fromPaycheckId?: string | null
    cleared?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutTransactionsInput
    envelope?: EnvelopeCreateNestedOneWithoutTransactionsInput
  }

  export type TransactionUncheckedCreateWithoutAccountInput = {
    id?: string
    userId: string
    envelopeId?: string | null
    amount: number
    date: Date | string
    payee: string
    notes?: string | null
    source?: string
    metadata?: string
    isPrimaMateria?: boolean
    fromPlanId?: string | null
    fromPaycheckId?: string | null
    cleared?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionCreateOrConnectWithoutAccountInput = {
    where: TransactionWhereUniqueInput
    create: XOR<TransactionCreateWithoutAccountInput, TransactionUncheckedCreateWithoutAccountInput>
  }

  export type TransactionCreateManyAccountInputEnvelope = {
    data: TransactionCreateManyAccountInput | TransactionCreateManyAccountInput[]
  }

  export type PayScheduleCreateWithoutAccountInput = {
    id?: string
    cadence: string
    amount: number
    startDate: Date | string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutPaySchedulesInput
  }

  export type PayScheduleUncheckedCreateWithoutAccountInput = {
    id?: string
    userId: string
    cadence: string
    amount: number
    startDate: Date | string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PayScheduleCreateOrConnectWithoutAccountInput = {
    where: PayScheduleWhereUniqueInput
    create: XOR<PayScheduleCreateWithoutAccountInput, PayScheduleUncheckedCreateWithoutAccountInput>
  }

  export type PayScheduleCreateManyAccountInputEnvelope = {
    data: PayScheduleCreateManyAccountInput | PayScheduleCreateManyAccountInput[]
  }

  export type UserUpsertWithoutAccountsInput = {
    update: XOR<UserUpdateWithoutAccountsInput, UserUncheckedUpdateWithoutAccountsInput>
    create: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAccountsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAccountsInput, UserUncheckedUpdateWithoutAccountsInput>
  }

  export type UserUpdateWithoutAccountsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUpdateManyWithoutUserNestedInput
    goals?: GoalUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutAccountsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUncheckedUpdateManyWithoutUserNestedInput
    goals?: GoalUncheckedUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUncheckedUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
  }

  export type TransactionUpsertWithWhereUniqueWithoutAccountInput = {
    where: TransactionWhereUniqueInput
    update: XOR<TransactionUpdateWithoutAccountInput, TransactionUncheckedUpdateWithoutAccountInput>
    create: XOR<TransactionCreateWithoutAccountInput, TransactionUncheckedCreateWithoutAccountInput>
  }

  export type TransactionUpdateWithWhereUniqueWithoutAccountInput = {
    where: TransactionWhereUniqueInput
    data: XOR<TransactionUpdateWithoutAccountInput, TransactionUncheckedUpdateWithoutAccountInput>
  }

  export type TransactionUpdateManyWithWhereWithoutAccountInput = {
    where: TransactionScalarWhereInput
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyWithoutAccountInput>
  }

  export type PayScheduleUpsertWithWhereUniqueWithoutAccountInput = {
    where: PayScheduleWhereUniqueInput
    update: XOR<PayScheduleUpdateWithoutAccountInput, PayScheduleUncheckedUpdateWithoutAccountInput>
    create: XOR<PayScheduleCreateWithoutAccountInput, PayScheduleUncheckedCreateWithoutAccountInput>
  }

  export type PayScheduleUpdateWithWhereUniqueWithoutAccountInput = {
    where: PayScheduleWhereUniqueInput
    data: XOR<PayScheduleUpdateWithoutAccountInput, PayScheduleUncheckedUpdateWithoutAccountInput>
  }

  export type PayScheduleUpdateManyWithWhereWithoutAccountInput = {
    where: PayScheduleScalarWhereInput
    data: XOR<PayScheduleUpdateManyMutationInput, PayScheduleUncheckedUpdateManyWithoutAccountInput>
  }

  export type UserCreateWithoutEnvelopesInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionCreateNestedManyWithoutUserInput
    accounts?: AccountCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleCreateNestedManyWithoutUserInput
    goals?: GoalCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanCreateNestedManyWithoutUserInput
    auditLog?: AuditLogCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutEnvelopesInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleUncheckedCreateNestedManyWithoutUserInput
    goals?: GoalUncheckedCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanUncheckedCreateNestedManyWithoutUserInput
    auditLog?: AuditLogUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutEnvelopesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutEnvelopesInput, UserUncheckedCreateWithoutEnvelopesInput>
  }

  export type TransactionCreateWithoutEnvelopeInput = {
    id?: string
    amount: number
    date: Date | string
    payee: string
    notes?: string | null
    source?: string
    metadata?: string
    isPrimaMateria?: boolean
    fromPlanId?: string | null
    fromPaycheckId?: string | null
    cleared?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutTransactionsInput
    account: AccountCreateNestedOneWithoutTransactionsInput
  }

  export type TransactionUncheckedCreateWithoutEnvelopeInput = {
    id?: string
    userId: string
    accountId: string
    amount: number
    date: Date | string
    payee: string
    notes?: string | null
    source?: string
    metadata?: string
    isPrimaMateria?: boolean
    fromPlanId?: string | null
    fromPaycheckId?: string | null
    cleared?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionCreateOrConnectWithoutEnvelopeInput = {
    where: TransactionWhereUniqueInput
    create: XOR<TransactionCreateWithoutEnvelopeInput, TransactionUncheckedCreateWithoutEnvelopeInput>
  }

  export type TransactionCreateManyEnvelopeInputEnvelope = {
    data: TransactionCreateManyEnvelopeInput | TransactionCreateManyEnvelopeInput[]
  }

  export type AllocationRuleCreateWithoutEnvelopeInput = {
    id?: string
    pct: number
    fixedCents?: number | null
    sortOrder?: number
    createdAt?: Date | string
    plan: AllocationPlanCreateNestedOneWithoutRulesInput
  }

  export type AllocationRuleUncheckedCreateWithoutEnvelopeInput = {
    id?: string
    planId: string
    pct: number
    fixedCents?: number | null
    sortOrder?: number
    createdAt?: Date | string
  }

  export type AllocationRuleCreateOrConnectWithoutEnvelopeInput = {
    where: AllocationRuleWhereUniqueInput
    create: XOR<AllocationRuleCreateWithoutEnvelopeInput, AllocationRuleUncheckedCreateWithoutEnvelopeInput>
  }

  export type AllocationRuleCreateManyEnvelopeInputEnvelope = {
    data: AllocationRuleCreateManyEnvelopeInput | AllocationRuleCreateManyEnvelopeInput[]
  }

  export type UserUpsertWithoutEnvelopesInput = {
    update: XOR<UserUpdateWithoutEnvelopesInput, UserUncheckedUpdateWithoutEnvelopesInput>
    create: XOR<UserCreateWithoutEnvelopesInput, UserUncheckedCreateWithoutEnvelopesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutEnvelopesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutEnvelopesInput, UserUncheckedUpdateWithoutEnvelopesInput>
  }

  export type UserUpdateWithoutEnvelopesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUpdateManyWithoutUserNestedInput
    accounts?: AccountUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUpdateManyWithoutUserNestedInput
    goals?: GoalUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutEnvelopesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUncheckedUpdateManyWithoutUserNestedInput
    goals?: GoalUncheckedUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUncheckedUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
  }

  export type TransactionUpsertWithWhereUniqueWithoutEnvelopeInput = {
    where: TransactionWhereUniqueInput
    update: XOR<TransactionUpdateWithoutEnvelopeInput, TransactionUncheckedUpdateWithoutEnvelopeInput>
    create: XOR<TransactionCreateWithoutEnvelopeInput, TransactionUncheckedCreateWithoutEnvelopeInput>
  }

  export type TransactionUpdateWithWhereUniqueWithoutEnvelopeInput = {
    where: TransactionWhereUniqueInput
    data: XOR<TransactionUpdateWithoutEnvelopeInput, TransactionUncheckedUpdateWithoutEnvelopeInput>
  }

  export type TransactionUpdateManyWithWhereWithoutEnvelopeInput = {
    where: TransactionScalarWhereInput
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyWithoutEnvelopeInput>
  }

  export type AllocationRuleUpsertWithWhereUniqueWithoutEnvelopeInput = {
    where: AllocationRuleWhereUniqueInput
    update: XOR<AllocationRuleUpdateWithoutEnvelopeInput, AllocationRuleUncheckedUpdateWithoutEnvelopeInput>
    create: XOR<AllocationRuleCreateWithoutEnvelopeInput, AllocationRuleUncheckedCreateWithoutEnvelopeInput>
  }

  export type AllocationRuleUpdateWithWhereUniqueWithoutEnvelopeInput = {
    where: AllocationRuleWhereUniqueInput
    data: XOR<AllocationRuleUpdateWithoutEnvelopeInput, AllocationRuleUncheckedUpdateWithoutEnvelopeInput>
  }

  export type AllocationRuleUpdateManyWithWhereWithoutEnvelopeInput = {
    where: AllocationRuleScalarWhereInput
    data: XOR<AllocationRuleUpdateManyMutationInput, AllocationRuleUncheckedUpdateManyWithoutEnvelopeInput>
  }

  export type AllocationRuleScalarWhereInput = {
    AND?: AllocationRuleScalarWhereInput | AllocationRuleScalarWhereInput[]
    OR?: AllocationRuleScalarWhereInput[]
    NOT?: AllocationRuleScalarWhereInput | AllocationRuleScalarWhereInput[]
    id?: StringFilter<"AllocationRule"> | string
    planId?: StringFilter<"AllocationRule"> | string
    envelopeId?: StringFilter<"AllocationRule"> | string
    pct?: IntFilter<"AllocationRule"> | number
    fixedCents?: IntNullableFilter<"AllocationRule"> | number | null
    sortOrder?: IntFilter<"AllocationRule"> | number
    createdAt?: DateTimeFilter<"AllocationRule"> | Date | string
  }

  export type UserCreateWithoutTransactionsInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionCreateNestedManyWithoutUserInput
    accounts?: AccountCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleCreateNestedManyWithoutUserInput
    goals?: GoalCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanCreateNestedManyWithoutUserInput
    auditLog?: AuditLogCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutTransactionsInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeUncheckedCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleUncheckedCreateNestedManyWithoutUserInput
    goals?: GoalUncheckedCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanUncheckedCreateNestedManyWithoutUserInput
    auditLog?: AuditLogUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutTransactionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutTransactionsInput, UserUncheckedCreateWithoutTransactionsInput>
  }

  export type AccountCreateWithoutTransactionsInput = {
    id?: string
    name: string
    type: string
    currentBalance?: number
    institution?: string | null
    mask?: string | null
    routingEnabled?: boolean
    isArchived?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutAccountsInput
    paySchedules?: PayScheduleCreateNestedManyWithoutAccountInput
  }

  export type AccountUncheckedCreateWithoutTransactionsInput = {
    id?: string
    userId: string
    name: string
    type: string
    currentBalance?: number
    institution?: string | null
    mask?: string | null
    routingEnabled?: boolean
    isArchived?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    paySchedules?: PayScheduleUncheckedCreateNestedManyWithoutAccountInput
  }

  export type AccountCreateOrConnectWithoutTransactionsInput = {
    where: AccountWhereUniqueInput
    create: XOR<AccountCreateWithoutTransactionsInput, AccountUncheckedCreateWithoutTransactionsInput>
  }

  export type EnvelopeCreateWithoutTransactionsInput = {
    id?: string
    name: string
    targetBalance?: number
    currentBalance?: number
    planet?: string | null
    color?: string | null
    icon?: string | null
    destinationAccountId?: string | null
    enforceHardCap?: boolean
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutEnvelopesInput
    allocationRules?: AllocationRuleCreateNestedManyWithoutEnvelopeInput
  }

  export type EnvelopeUncheckedCreateWithoutTransactionsInput = {
    id?: string
    userId: string
    name: string
    targetBalance?: number
    currentBalance?: number
    planet?: string | null
    color?: string | null
    icon?: string | null
    destinationAccountId?: string | null
    enforceHardCap?: boolean
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    allocationRules?: AllocationRuleUncheckedCreateNestedManyWithoutEnvelopeInput
  }

  export type EnvelopeCreateOrConnectWithoutTransactionsInput = {
    where: EnvelopeWhereUniqueInput
    create: XOR<EnvelopeCreateWithoutTransactionsInput, EnvelopeUncheckedCreateWithoutTransactionsInput>
  }

  export type UserUpsertWithoutTransactionsInput = {
    update: XOR<UserUpdateWithoutTransactionsInput, UserUncheckedUpdateWithoutTransactionsInput>
    create: XOR<UserCreateWithoutTransactionsInput, UserUncheckedCreateWithoutTransactionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutTransactionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutTransactionsInput, UserUncheckedUpdateWithoutTransactionsInput>
  }

  export type UserUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUpdateManyWithoutUserNestedInput
    accounts?: AccountUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUpdateManyWithoutUserNestedInput
    goals?: GoalUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUncheckedUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUncheckedUpdateManyWithoutUserNestedInput
    goals?: GoalUncheckedUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUncheckedUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
  }

  export type AccountUpsertWithoutTransactionsInput = {
    update: XOR<AccountUpdateWithoutTransactionsInput, AccountUncheckedUpdateWithoutTransactionsInput>
    create: XOR<AccountCreateWithoutTransactionsInput, AccountUncheckedCreateWithoutTransactionsInput>
    where?: AccountWhereInput
  }

  export type AccountUpdateToOneWithWhereWithoutTransactionsInput = {
    where?: AccountWhereInput
    data: XOR<AccountUpdateWithoutTransactionsInput, AccountUncheckedUpdateWithoutTransactionsInput>
  }

  export type AccountUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    currentBalance?: IntFieldUpdateOperationsInput | number
    institution?: NullableStringFieldUpdateOperationsInput | string | null
    mask?: NullableStringFieldUpdateOperationsInput | string | null
    routingEnabled?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutAccountsNestedInput
    paySchedules?: PayScheduleUpdateManyWithoutAccountNestedInput
  }

  export type AccountUncheckedUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    currentBalance?: IntFieldUpdateOperationsInput | number
    institution?: NullableStringFieldUpdateOperationsInput | string | null
    mask?: NullableStringFieldUpdateOperationsInput | string | null
    routingEnabled?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    paySchedules?: PayScheduleUncheckedUpdateManyWithoutAccountNestedInput
  }

  export type EnvelopeUpsertWithoutTransactionsInput = {
    update: XOR<EnvelopeUpdateWithoutTransactionsInput, EnvelopeUncheckedUpdateWithoutTransactionsInput>
    create: XOR<EnvelopeCreateWithoutTransactionsInput, EnvelopeUncheckedCreateWithoutTransactionsInput>
    where?: EnvelopeWhereInput
  }

  export type EnvelopeUpdateToOneWithWhereWithoutTransactionsInput = {
    where?: EnvelopeWhereInput
    data: XOR<EnvelopeUpdateWithoutTransactionsInput, EnvelopeUncheckedUpdateWithoutTransactionsInput>
  }

  export type EnvelopeUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    targetBalance?: IntFieldUpdateOperationsInput | number
    currentBalance?: IntFieldUpdateOperationsInput | number
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAccountId?: NullableStringFieldUpdateOperationsInput | string | null
    enforceHardCap?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutEnvelopesNestedInput
    allocationRules?: AllocationRuleUpdateManyWithoutEnvelopeNestedInput
  }

  export type EnvelopeUncheckedUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    targetBalance?: IntFieldUpdateOperationsInput | number
    currentBalance?: IntFieldUpdateOperationsInput | number
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAccountId?: NullableStringFieldUpdateOperationsInput | string | null
    enforceHardCap?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    allocationRules?: AllocationRuleUncheckedUpdateManyWithoutEnvelopeNestedInput
  }

  export type UserCreateWithoutPaySchedulesInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionCreateNestedManyWithoutUserInput
    accounts?: AccountCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    goals?: GoalCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanCreateNestedManyWithoutUserInput
    auditLog?: AuditLogCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutPaySchedulesInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    goals?: GoalUncheckedCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanUncheckedCreateNestedManyWithoutUserInput
    auditLog?: AuditLogUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutPaySchedulesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutPaySchedulesInput, UserUncheckedCreateWithoutPaySchedulesInput>
  }

  export type AccountCreateWithoutPaySchedulesInput = {
    id?: string
    name: string
    type: string
    currentBalance?: number
    institution?: string | null
    mask?: string | null
    routingEnabled?: boolean
    isArchived?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutAccountsInput
    transactions?: TransactionCreateNestedManyWithoutAccountInput
  }

  export type AccountUncheckedCreateWithoutPaySchedulesInput = {
    id?: string
    userId: string
    name: string
    type: string
    currentBalance?: number
    institution?: string | null
    mask?: string | null
    routingEnabled?: boolean
    isArchived?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutAccountInput
  }

  export type AccountCreateOrConnectWithoutPaySchedulesInput = {
    where: AccountWhereUniqueInput
    create: XOR<AccountCreateWithoutPaySchedulesInput, AccountUncheckedCreateWithoutPaySchedulesInput>
  }

  export type UserUpsertWithoutPaySchedulesInput = {
    update: XOR<UserUpdateWithoutPaySchedulesInput, UserUncheckedUpdateWithoutPaySchedulesInput>
    create: XOR<UserCreateWithoutPaySchedulesInput, UserUncheckedCreateWithoutPaySchedulesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutPaySchedulesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutPaySchedulesInput, UserUncheckedUpdateWithoutPaySchedulesInput>
  }

  export type UserUpdateWithoutPaySchedulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUpdateManyWithoutUserNestedInput
    accounts?: AccountUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    goals?: GoalUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutPaySchedulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    goals?: GoalUncheckedUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUncheckedUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
  }

  export type AccountUpsertWithoutPaySchedulesInput = {
    update: XOR<AccountUpdateWithoutPaySchedulesInput, AccountUncheckedUpdateWithoutPaySchedulesInput>
    create: XOR<AccountCreateWithoutPaySchedulesInput, AccountUncheckedCreateWithoutPaySchedulesInput>
    where?: AccountWhereInput
  }

  export type AccountUpdateToOneWithWhereWithoutPaySchedulesInput = {
    where?: AccountWhereInput
    data: XOR<AccountUpdateWithoutPaySchedulesInput, AccountUncheckedUpdateWithoutPaySchedulesInput>
  }

  export type AccountUpdateWithoutPaySchedulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    currentBalance?: IntFieldUpdateOperationsInput | number
    institution?: NullableStringFieldUpdateOperationsInput | string | null
    mask?: NullableStringFieldUpdateOperationsInput | string | null
    routingEnabled?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutAccountsNestedInput
    transactions?: TransactionUpdateManyWithoutAccountNestedInput
  }

  export type AccountUncheckedUpdateWithoutPaySchedulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    currentBalance?: IntFieldUpdateOperationsInput | number
    institution?: NullableStringFieldUpdateOperationsInput | string | null
    mask?: NullableStringFieldUpdateOperationsInput | string | null
    routingEnabled?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutAccountNestedInput
  }

  export type UserCreateWithoutGoalsInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionCreateNestedManyWithoutUserInput
    accounts?: AccountCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanCreateNestedManyWithoutUserInput
    auditLog?: AuditLogCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutGoalsInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleUncheckedCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanUncheckedCreateNestedManyWithoutUserInput
    auditLog?: AuditLogUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutGoalsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutGoalsInput, UserUncheckedCreateWithoutGoalsInput>
  }

  export type UserUpsertWithoutGoalsInput = {
    update: XOR<UserUpdateWithoutGoalsInput, UserUncheckedUpdateWithoutGoalsInput>
    create: XOR<UserCreateWithoutGoalsInput, UserUncheckedCreateWithoutGoalsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutGoalsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutGoalsInput, UserUncheckedUpdateWithoutGoalsInput>
  }

  export type UserUpdateWithoutGoalsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUpdateManyWithoutUserNestedInput
    accounts?: AccountUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutGoalsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUncheckedUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUncheckedUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutAllocationPlansInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionCreateNestedManyWithoutUserInput
    accounts?: AccountCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleCreateNestedManyWithoutUserInput
    goals?: GoalCreateNestedManyWithoutUserInput
    auditLog?: AuditLogCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutAllocationPlansInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleUncheckedCreateNestedManyWithoutUserInput
    goals?: GoalUncheckedCreateNestedManyWithoutUserInput
    auditLog?: AuditLogUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutAllocationPlansInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAllocationPlansInput, UserUncheckedCreateWithoutAllocationPlansInput>
  }

  export type AllocationRuleCreateWithoutPlanInput = {
    id?: string
    pct: number
    fixedCents?: number | null
    sortOrder?: number
    createdAt?: Date | string
    envelope: EnvelopeCreateNestedOneWithoutAllocationRulesInput
  }

  export type AllocationRuleUncheckedCreateWithoutPlanInput = {
    id?: string
    envelopeId: string
    pct: number
    fixedCents?: number | null
    sortOrder?: number
    createdAt?: Date | string
  }

  export type AllocationRuleCreateOrConnectWithoutPlanInput = {
    where: AllocationRuleWhereUniqueInput
    create: XOR<AllocationRuleCreateWithoutPlanInput, AllocationRuleUncheckedCreateWithoutPlanInput>
  }

  export type AllocationRuleCreateManyPlanInputEnvelope = {
    data: AllocationRuleCreateManyPlanInput | AllocationRuleCreateManyPlanInput[]
  }

  export type UserUpsertWithoutAllocationPlansInput = {
    update: XOR<UserUpdateWithoutAllocationPlansInput, UserUncheckedUpdateWithoutAllocationPlansInput>
    create: XOR<UserCreateWithoutAllocationPlansInput, UserUncheckedCreateWithoutAllocationPlansInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAllocationPlansInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAllocationPlansInput, UserUncheckedUpdateWithoutAllocationPlansInput>
  }

  export type UserUpdateWithoutAllocationPlansInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUpdateManyWithoutUserNestedInput
    accounts?: AccountUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUpdateManyWithoutUserNestedInput
    goals?: GoalUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutAllocationPlansInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUncheckedUpdateManyWithoutUserNestedInput
    goals?: GoalUncheckedUpdateManyWithoutUserNestedInput
    auditLog?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
  }

  export type AllocationRuleUpsertWithWhereUniqueWithoutPlanInput = {
    where: AllocationRuleWhereUniqueInput
    update: XOR<AllocationRuleUpdateWithoutPlanInput, AllocationRuleUncheckedUpdateWithoutPlanInput>
    create: XOR<AllocationRuleCreateWithoutPlanInput, AllocationRuleUncheckedCreateWithoutPlanInput>
  }

  export type AllocationRuleUpdateWithWhereUniqueWithoutPlanInput = {
    where: AllocationRuleWhereUniqueInput
    data: XOR<AllocationRuleUpdateWithoutPlanInput, AllocationRuleUncheckedUpdateWithoutPlanInput>
  }

  export type AllocationRuleUpdateManyWithWhereWithoutPlanInput = {
    where: AllocationRuleScalarWhereInput
    data: XOR<AllocationRuleUpdateManyMutationInput, AllocationRuleUncheckedUpdateManyWithoutPlanInput>
  }

  export type AllocationPlanCreateWithoutRulesInput = {
    id?: string
    strategyId?: string
    isArmed?: boolean
    name?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutAllocationPlansInput
  }

  export type AllocationPlanUncheckedCreateWithoutRulesInput = {
    id?: string
    userId: string
    strategyId?: string
    isArmed?: boolean
    name?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AllocationPlanCreateOrConnectWithoutRulesInput = {
    where: AllocationPlanWhereUniqueInput
    create: XOR<AllocationPlanCreateWithoutRulesInput, AllocationPlanUncheckedCreateWithoutRulesInput>
  }

  export type EnvelopeCreateWithoutAllocationRulesInput = {
    id?: string
    name: string
    targetBalance?: number
    currentBalance?: number
    planet?: string | null
    color?: string | null
    icon?: string | null
    destinationAccountId?: string | null
    enforceHardCap?: boolean
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutEnvelopesInput
    transactions?: TransactionCreateNestedManyWithoutEnvelopeInput
  }

  export type EnvelopeUncheckedCreateWithoutAllocationRulesInput = {
    id?: string
    userId: string
    name: string
    targetBalance?: number
    currentBalance?: number
    planet?: string | null
    color?: string | null
    icon?: string | null
    destinationAccountId?: string | null
    enforceHardCap?: boolean
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutEnvelopeInput
  }

  export type EnvelopeCreateOrConnectWithoutAllocationRulesInput = {
    where: EnvelopeWhereUniqueInput
    create: XOR<EnvelopeCreateWithoutAllocationRulesInput, EnvelopeUncheckedCreateWithoutAllocationRulesInput>
  }

  export type AllocationPlanUpsertWithoutRulesInput = {
    update: XOR<AllocationPlanUpdateWithoutRulesInput, AllocationPlanUncheckedUpdateWithoutRulesInput>
    create: XOR<AllocationPlanCreateWithoutRulesInput, AllocationPlanUncheckedCreateWithoutRulesInput>
    where?: AllocationPlanWhereInput
  }

  export type AllocationPlanUpdateToOneWithWhereWithoutRulesInput = {
    where?: AllocationPlanWhereInput
    data: XOR<AllocationPlanUpdateWithoutRulesInput, AllocationPlanUncheckedUpdateWithoutRulesInput>
  }

  export type AllocationPlanUpdateWithoutRulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    strategyId?: StringFieldUpdateOperationsInput | string
    isArmed?: BoolFieldUpdateOperationsInput | boolean
    name?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutAllocationPlansNestedInput
  }

  export type AllocationPlanUncheckedUpdateWithoutRulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    strategyId?: StringFieldUpdateOperationsInput | string
    isArmed?: BoolFieldUpdateOperationsInput | boolean
    name?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EnvelopeUpsertWithoutAllocationRulesInput = {
    update: XOR<EnvelopeUpdateWithoutAllocationRulesInput, EnvelopeUncheckedUpdateWithoutAllocationRulesInput>
    create: XOR<EnvelopeCreateWithoutAllocationRulesInput, EnvelopeUncheckedCreateWithoutAllocationRulesInput>
    where?: EnvelopeWhereInput
  }

  export type EnvelopeUpdateToOneWithWhereWithoutAllocationRulesInput = {
    where?: EnvelopeWhereInput
    data: XOR<EnvelopeUpdateWithoutAllocationRulesInput, EnvelopeUncheckedUpdateWithoutAllocationRulesInput>
  }

  export type EnvelopeUpdateWithoutAllocationRulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    targetBalance?: IntFieldUpdateOperationsInput | number
    currentBalance?: IntFieldUpdateOperationsInput | number
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAccountId?: NullableStringFieldUpdateOperationsInput | string | null
    enforceHardCap?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutEnvelopesNestedInput
    transactions?: TransactionUpdateManyWithoutEnvelopeNestedInput
  }

  export type EnvelopeUncheckedUpdateWithoutAllocationRulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    targetBalance?: IntFieldUpdateOperationsInput | number
    currentBalance?: IntFieldUpdateOperationsInput | number
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAccountId?: NullableStringFieldUpdateOperationsInput | string | null
    enforceHardCap?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutEnvelopeNestedInput
  }

  export type UserCreateWithoutAuditLogInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionCreateNestedManyWithoutUserInput
    accounts?: AccountCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleCreateNestedManyWithoutUserInput
    goals?: GoalCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutAuditLogInput = {
    id?: string
    name: string
    email: string
    passwordHash: string
    aiTier?: number
    routingLevel?: number
    defaultViewId?: string | null
    settings?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    envelopes?: EnvelopeUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    paySchedules?: PayScheduleUncheckedCreateNestedManyWithoutUserInput
    goals?: GoalUncheckedCreateNestedManyWithoutUserInput
    allocationPlans?: AllocationPlanUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutAuditLogInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAuditLogInput, UserUncheckedCreateWithoutAuditLogInput>
  }

  export type UserUpsertWithoutAuditLogInput = {
    update: XOR<UserUpdateWithoutAuditLogInput, UserUncheckedUpdateWithoutAuditLogInput>
    create: XOR<UserCreateWithoutAuditLogInput, UserUncheckedCreateWithoutAuditLogInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAuditLogInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAuditLogInput, UserUncheckedUpdateWithoutAuditLogInput>
  }

  export type UserUpdateWithoutAuditLogInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUpdateManyWithoutUserNestedInput
    accounts?: AccountUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUpdateManyWithoutUserNestedInput
    goals?: GoalUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutAuditLogInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    aiTier?: IntFieldUpdateOperationsInput | number
    routingLevel?: IntFieldUpdateOperationsInput | number
    defaultViewId?: NullableStringFieldUpdateOperationsInput | string | null
    settings?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    envelopes?: EnvelopeUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    paySchedules?: PayScheduleUncheckedUpdateManyWithoutUserNestedInput
    goals?: GoalUncheckedUpdateManyWithoutUserNestedInput
    allocationPlans?: AllocationPlanUncheckedUpdateManyWithoutUserNestedInput
  }

  export type SessionCreateManyUserInput = {
    id?: string
    tokenHash: string
    userAgent?: string | null
    ip?: string | null
    lastSeenAt?: Date | string
    createdAt?: Date | string
    expiresAt: Date | string
  }

  export type AccountCreateManyUserInput = {
    id?: string
    name: string
    type: string
    currentBalance?: number
    institution?: string | null
    mask?: string | null
    routingEnabled?: boolean
    isArchived?: boolean
    sortOrder?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type EnvelopeCreateManyUserInput = {
    id?: string
    name: string
    targetBalance?: number
    currentBalance?: number
    planet?: string | null
    color?: string | null
    icon?: string | null
    destinationAccountId?: string | null
    enforceHardCap?: boolean
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionCreateManyUserInput = {
    id?: string
    accountId: string
    envelopeId?: string | null
    amount: number
    date: Date | string
    payee: string
    notes?: string | null
    source?: string
    metadata?: string
    isPrimaMateria?: boolean
    fromPlanId?: string | null
    fromPaycheckId?: string | null
    cleared?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PayScheduleCreateManyUserInput = {
    id?: string
    cadence: string
    amount: number
    accountId: string
    startDate: Date | string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GoalCreateManyUserInput = {
    id?: string
    name: string
    description?: string | null
    targetAmount: number
    currentAmount?: number
    targetDate?: Date | string | null
    envelopeId?: string | null
    planet?: string | null
    isPrimary?: boolean
    kind?: $Enums.GoalKind
    sortOrder?: number
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AllocationPlanCreateManyUserInput = {
    id?: string
    strategyId?: string
    isArmed?: boolean
    name?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AuditLogCreateManyUserInput = {
    id?: string
    actionType: string
    payload?: string
    aiTierAtTime?: number
    createdAt?: Date | string
  }

  export type SessionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ip?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ip?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    ip?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AccountUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    currentBalance?: IntFieldUpdateOperationsInput | number
    institution?: NullableStringFieldUpdateOperationsInput | string | null
    mask?: NullableStringFieldUpdateOperationsInput | string | null
    routingEnabled?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUpdateManyWithoutAccountNestedInput
    paySchedules?: PayScheduleUpdateManyWithoutAccountNestedInput
  }

  export type AccountUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    currentBalance?: IntFieldUpdateOperationsInput | number
    institution?: NullableStringFieldUpdateOperationsInput | string | null
    mask?: NullableStringFieldUpdateOperationsInput | string | null
    routingEnabled?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutAccountNestedInput
    paySchedules?: PayScheduleUncheckedUpdateManyWithoutAccountNestedInput
  }

  export type AccountUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    currentBalance?: IntFieldUpdateOperationsInput | number
    institution?: NullableStringFieldUpdateOperationsInput | string | null
    mask?: NullableStringFieldUpdateOperationsInput | string | null
    routingEnabled?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EnvelopeUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    targetBalance?: IntFieldUpdateOperationsInput | number
    currentBalance?: IntFieldUpdateOperationsInput | number
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAccountId?: NullableStringFieldUpdateOperationsInput | string | null
    enforceHardCap?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUpdateManyWithoutEnvelopeNestedInput
    allocationRules?: AllocationRuleUpdateManyWithoutEnvelopeNestedInput
  }

  export type EnvelopeUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    targetBalance?: IntFieldUpdateOperationsInput | number
    currentBalance?: IntFieldUpdateOperationsInput | number
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAccountId?: NullableStringFieldUpdateOperationsInput | string | null
    enforceHardCap?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutEnvelopeNestedInput
    allocationRules?: AllocationRuleUncheckedUpdateManyWithoutEnvelopeNestedInput
  }

  export type EnvelopeUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    targetBalance?: IntFieldUpdateOperationsInput | number
    currentBalance?: IntFieldUpdateOperationsInput | number
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    destinationAccountId?: NullableStringFieldUpdateOperationsInput | string | null
    enforceHardCap?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    payee?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    metadata?: StringFieldUpdateOperationsInput | string
    isPrimaMateria?: BoolFieldUpdateOperationsInput | boolean
    fromPlanId?: NullableStringFieldUpdateOperationsInput | string | null
    fromPaycheckId?: NullableStringFieldUpdateOperationsInput | string | null
    cleared?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    account?: AccountUpdateOneRequiredWithoutTransactionsNestedInput
    envelope?: EnvelopeUpdateOneWithoutTransactionsNestedInput
  }

  export type TransactionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    envelopeId?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    payee?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    metadata?: StringFieldUpdateOperationsInput | string
    isPrimaMateria?: BoolFieldUpdateOperationsInput | boolean
    fromPlanId?: NullableStringFieldUpdateOperationsInput | string | null
    fromPaycheckId?: NullableStringFieldUpdateOperationsInput | string | null
    cleared?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    envelopeId?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    payee?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    metadata?: StringFieldUpdateOperationsInput | string
    isPrimaMateria?: BoolFieldUpdateOperationsInput | boolean
    fromPlanId?: NullableStringFieldUpdateOperationsInput | string | null
    fromPaycheckId?: NullableStringFieldUpdateOperationsInput | string | null
    cleared?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PayScheduleUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    cadence?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    account?: AccountUpdateOneRequiredWithoutPaySchedulesNestedInput
  }

  export type PayScheduleUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    cadence?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    accountId?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PayScheduleUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    cadence?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    accountId?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GoalUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    targetAmount?: IntFieldUpdateOperationsInput | number
    currentAmount?: IntFieldUpdateOperationsInput | number
    targetDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    envelopeId?: NullableStringFieldUpdateOperationsInput | string | null
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    isPrimary?: BoolFieldUpdateOperationsInput | boolean
    kind?: EnumGoalKindFieldUpdateOperationsInput | $Enums.GoalKind
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GoalUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    targetAmount?: IntFieldUpdateOperationsInput | number
    currentAmount?: IntFieldUpdateOperationsInput | number
    targetDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    envelopeId?: NullableStringFieldUpdateOperationsInput | string | null
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    isPrimary?: BoolFieldUpdateOperationsInput | boolean
    kind?: EnumGoalKindFieldUpdateOperationsInput | $Enums.GoalKind
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GoalUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    targetAmount?: IntFieldUpdateOperationsInput | number
    currentAmount?: IntFieldUpdateOperationsInput | number
    targetDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    envelopeId?: NullableStringFieldUpdateOperationsInput | string | null
    planet?: NullableStringFieldUpdateOperationsInput | string | null
    isPrimary?: BoolFieldUpdateOperationsInput | boolean
    kind?: EnumGoalKindFieldUpdateOperationsInput | $Enums.GoalKind
    sortOrder?: IntFieldUpdateOperationsInput | number
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AllocationPlanUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    strategyId?: StringFieldUpdateOperationsInput | string
    isArmed?: BoolFieldUpdateOperationsInput | boolean
    name?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rules?: AllocationRuleUpdateManyWithoutPlanNestedInput
  }

  export type AllocationPlanUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    strategyId?: StringFieldUpdateOperationsInput | string
    isArmed?: BoolFieldUpdateOperationsInput | boolean
    name?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rules?: AllocationRuleUncheckedUpdateManyWithoutPlanNestedInput
  }

  export type AllocationPlanUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    strategyId?: StringFieldUpdateOperationsInput | string
    isArmed?: BoolFieldUpdateOperationsInput | boolean
    name?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    actionType?: StringFieldUpdateOperationsInput | string
    payload?: StringFieldUpdateOperationsInput | string
    aiTierAtTime?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    actionType?: StringFieldUpdateOperationsInput | string
    payload?: StringFieldUpdateOperationsInput | string
    aiTierAtTime?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    actionType?: StringFieldUpdateOperationsInput | string
    payload?: StringFieldUpdateOperationsInput | string
    aiTierAtTime?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionCreateManyAccountInput = {
    id?: string
    userId: string
    envelopeId?: string | null
    amount: number
    date: Date | string
    payee: string
    notes?: string | null
    source?: string
    metadata?: string
    isPrimaMateria?: boolean
    fromPlanId?: string | null
    fromPaycheckId?: string | null
    cleared?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PayScheduleCreateManyAccountInput = {
    id?: string
    userId: string
    cadence: string
    amount: number
    startDate: Date | string
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionUpdateWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    payee?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    metadata?: StringFieldUpdateOperationsInput | string
    isPrimaMateria?: BoolFieldUpdateOperationsInput | boolean
    fromPlanId?: NullableStringFieldUpdateOperationsInput | string | null
    fromPaycheckId?: NullableStringFieldUpdateOperationsInput | string | null
    cleared?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTransactionsNestedInput
    envelope?: EnvelopeUpdateOneWithoutTransactionsNestedInput
  }

  export type TransactionUncheckedUpdateWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    envelopeId?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    payee?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    metadata?: StringFieldUpdateOperationsInput | string
    isPrimaMateria?: BoolFieldUpdateOperationsInput | boolean
    fromPlanId?: NullableStringFieldUpdateOperationsInput | string | null
    fromPaycheckId?: NullableStringFieldUpdateOperationsInput | string | null
    cleared?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUncheckedUpdateManyWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    envelopeId?: NullableStringFieldUpdateOperationsInput | string | null
    amount?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    payee?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    metadata?: StringFieldUpdateOperationsInput | string
    isPrimaMateria?: BoolFieldUpdateOperationsInput | boolean
    fromPlanId?: NullableStringFieldUpdateOperationsInput | string | null
    fromPaycheckId?: NullableStringFieldUpdateOperationsInput | string | null
    cleared?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PayScheduleUpdateWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    cadence?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutPaySchedulesNestedInput
  }

  export type PayScheduleUncheckedUpdateWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    cadence?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PayScheduleUncheckedUpdateManyWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    cadence?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionCreateManyEnvelopeInput = {
    id?: string
    userId: string
    accountId: string
    amount: number
    date: Date | string
    payee: string
    notes?: string | null
    source?: string
    metadata?: string
    isPrimaMateria?: boolean
    fromPlanId?: string | null
    fromPaycheckId?: string | null
    cleared?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AllocationRuleCreateManyEnvelopeInput = {
    id?: string
    planId: string
    pct: number
    fixedCents?: number | null
    sortOrder?: number
    createdAt?: Date | string
  }

  export type TransactionUpdateWithoutEnvelopeInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    payee?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    metadata?: StringFieldUpdateOperationsInput | string
    isPrimaMateria?: BoolFieldUpdateOperationsInput | boolean
    fromPlanId?: NullableStringFieldUpdateOperationsInput | string | null
    fromPaycheckId?: NullableStringFieldUpdateOperationsInput | string | null
    cleared?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTransactionsNestedInput
    account?: AccountUpdateOneRequiredWithoutTransactionsNestedInput
  }

  export type TransactionUncheckedUpdateWithoutEnvelopeInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    payee?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    metadata?: StringFieldUpdateOperationsInput | string
    isPrimaMateria?: BoolFieldUpdateOperationsInput | boolean
    fromPlanId?: NullableStringFieldUpdateOperationsInput | string | null
    fromPaycheckId?: NullableStringFieldUpdateOperationsInput | string | null
    cleared?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUncheckedUpdateManyWithoutEnvelopeInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    payee?: StringFieldUpdateOperationsInput | string
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    metadata?: StringFieldUpdateOperationsInput | string
    isPrimaMateria?: BoolFieldUpdateOperationsInput | boolean
    fromPlanId?: NullableStringFieldUpdateOperationsInput | string | null
    fromPaycheckId?: NullableStringFieldUpdateOperationsInput | string | null
    cleared?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AllocationRuleUpdateWithoutEnvelopeInput = {
    id?: StringFieldUpdateOperationsInput | string
    pct?: IntFieldUpdateOperationsInput | number
    fixedCents?: NullableIntFieldUpdateOperationsInput | number | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    plan?: AllocationPlanUpdateOneRequiredWithoutRulesNestedInput
  }

  export type AllocationRuleUncheckedUpdateWithoutEnvelopeInput = {
    id?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    pct?: IntFieldUpdateOperationsInput | number
    fixedCents?: NullableIntFieldUpdateOperationsInput | number | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AllocationRuleUncheckedUpdateManyWithoutEnvelopeInput = {
    id?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    pct?: IntFieldUpdateOperationsInput | number
    fixedCents?: NullableIntFieldUpdateOperationsInput | number | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AllocationRuleCreateManyPlanInput = {
    id?: string
    envelopeId: string
    pct: number
    fixedCents?: number | null
    sortOrder?: number
    createdAt?: Date | string
  }

  export type AllocationRuleUpdateWithoutPlanInput = {
    id?: StringFieldUpdateOperationsInput | string
    pct?: IntFieldUpdateOperationsInput | number
    fixedCents?: NullableIntFieldUpdateOperationsInput | number | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    envelope?: EnvelopeUpdateOneRequiredWithoutAllocationRulesNestedInput
  }

  export type AllocationRuleUncheckedUpdateWithoutPlanInput = {
    id?: StringFieldUpdateOperationsInput | string
    envelopeId?: StringFieldUpdateOperationsInput | string
    pct?: IntFieldUpdateOperationsInput | number
    fixedCents?: NullableIntFieldUpdateOperationsInput | number | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AllocationRuleUncheckedUpdateManyWithoutPlanInput = {
    id?: StringFieldUpdateOperationsInput | string
    envelopeId?: StringFieldUpdateOperationsInput | string
    pct?: IntFieldUpdateOperationsInput | number
    fixedCents?: NullableIntFieldUpdateOperationsInput | number | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}