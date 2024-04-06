import { Expect, Equal } from '../src/types/helpers';
import { match, P } from '../src';
import { Blog } from './types-catalog/utils';
import { InvertPattern } from '../src/types/InvertPattern';
import { ExtractPreciseValue } from '../src/types/ExtractPreciseValue';

describe('wildcards', () => {
  it('should match String wildcards', () => {
    const res = match<string | number | boolean | null | undefined>('')
      .with(NaN, () => '')
      .with(P.string, (x) => {
        type t = Expect<Equal<typeof x, string>>;
        return true;
      })
      .otherwise(() => false);

    expect(res).toEqual(true);
  });

  it('should match Number wildcards', () => {
    const res = match<string | number | boolean | null | undefined>(2)
      .with(P.number, (x) => {
        type t = Expect<Equal<typeof x, number>>;
        return true;
      })
      .otherwise(() => false);

    expect(res).toEqual(true);
  });

  it('should match Boolean wildcards', () => {
    const res = match<string | number | boolean | null | undefined>(true)
      .with(P.boolean, (x) => {
        type t = Expect<Equal<typeof x, boolean>>;
        return true;
      })
      .otherwise(() => false);

    expect(res).toEqual(true);
  });

  it('should match nullish wildcard', () => {
    const res = match<string | number | boolean | null | undefined>(null)
      .with(P.nullish, (x) => {
        type t = Expect<Equal<typeof x, null | undefined>>;
        return true;
      })
      .otherwise(() => false);

    const res2 = match<string | number | boolean | null | undefined>(undefined)
      .with(P.nullish, (x) => {
        type t = Expect<Equal<typeof x, null | undefined>>;
        return true;
      })
      .otherwise(() => false);

    expect(res).toEqual(true);
    expect(res2).toEqual(true);
  });

  describe('P.nonNullable', () => {
    it('should narrow primitive types correctly', () => {
      type Input = string | number | boolean | null | undefined;
      const res = match<Input>(false)
        .with(P.nonNullable, (x) => {
          type t = Expect<Equal<typeof x, string | number | boolean>>;
          return true;
        })
        .otherwise(() => false);

      const res2 = match<0 | 1 | 2 | null>(0)
        .with(P.nonNullable, (x) => {
          type t = Expect<Equal<typeof x, 0 | 1 | 2>>;
          return true;
        })
        .with(null, () => false)
        .exhaustive();

      expect(res).toEqual(true);
      expect(res2).toEqual(true);
    });

    it('should narrow object types correctly', () => {
      type Input =
        | {
            __typename: 'ValidationRejection';
            fields: {
              __typename: 'ValidationFieldError';
              path: string[];
              message: string;
            }[];
          }
        | {
            __typename: 'ValidationRejection';
          };

      const pattern = {
        __typename: 'ValidationRejection',
        fields: P.nonNullable,
      } as const;
      type X = InvertPattern<typeof pattern, Input>;
      type Y = ExtractPreciseValue<Input, X>;

      const fn = (data: Input) =>
        match(data)
          .with(
            { __typename: 'ValidationRejection', fields: P.nonNullable },
            ({ fields }) => {
              type t = Expect<
                Equal<
                  typeof fields,
                  {
                    __typename: 'ValidationFieldError';
                    path: string[];
                    message: string;
                  }[]
                >
              >;
            }
          )
          .otherwise(() => {});

      const fn2 = (data: Input) =>
        match(data)
          .with(
            { __typename: 'ValidationRejection', fields: P.not(P.nullish) },
            ({ fields }) => {
              type t = Expect<
                Equal<
                  typeof fields,
                  {
                    __typename: 'ValidationFieldError';
                    path: string[];
                    message: string;
                  }[]
                >
              >;
            }
          )
          .otherwise(() => {});
    });
  });

  it('should match String, Number and Boolean wildcards', () => {
    // Will be { id: number, title: string } | { errorMessage: string }
    let httpResult = {
      id: 20,
      title: 'hellooo',
    }; /* API logic. */

    const res = match<any, Blog | Error>(httpResult)
      .with({ id: P.number, title: P.string }, (r) => ({
        id: r.id,
        title: r.title,
      }))
      .with({ errorMessage: P.string }, (r) => new Error(r.errorMessage))
      .otherwise(() => new Error('Client parse error'));

    expect(res).toEqual({
      id: 20,
      title: 'hellooo',
    });
  });

  it('should infer correctly negated String wildcards', () => {
    const res = match<string | number | boolean>('')
      .with(P.not(P.string), (x) => {
        type t = Expect<Equal<typeof x, number | boolean>>;
        return true;
      })
      .otherwise(() => false);

    expect(res).toEqual(false);
  });

  it('should infer correctly negated Number wildcards', () => {
    const res = match<string | number | boolean>(2)
      .with(P.not(P.number), (x) => {
        type t = Expect<Equal<typeof x, string | boolean>>;
        return true;
      })
      .otherwise(() => false);

    expect(res).toEqual(false);
  });

  it('should infer correctly negated Boolean wildcards', () => {
    const res = match<string | number | boolean>(true)
      .with(P.not(P.boolean), (x) => {
        type t = Expect<Equal<typeof x, string | number>>;
        return true;
      })
      .otherwise(() => false);

    expect(res).toEqual(false);
  });

  it("when used as an object property pattern, it shouldn't match if the key isn't defined on the object.", () => {
    type Id = { teamId: number } | { storeId: number };

    const selectedId: Id = { teamId: 1 };

    const res = match<Id>(selectedId)
      .with({ storeId: P._ }, () => 'storeId')
      .with({ teamId: P._ }, () => 'teamId')
      .exhaustive();

    expect(res).toEqual('teamId');
  });

  describe('catch all', () => {
    const allValueTypes = [
      undefined,
      null,
      Symbol(2),
      2,
      'string',
      true,
      () => {},
      {},
      [],
      new Map(),
      new Set(),
    ];

    allValueTypes.forEach((value) => {
      it(`should match ${typeof value} values`, () => {
        expect(
          match(value)
            .with(P._, () => 'yes')
            .run()
        ).toEqual('yes');
      });
    });
  });
});
