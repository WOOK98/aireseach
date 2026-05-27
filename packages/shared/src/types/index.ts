export type EnumToConstant<T extends readonly string[]> = {
  [K in Uppercase<T[number]>]: T[number] extends infer V
    ? V extends string
      ? Uppercase<V> extends K
        ? V
        : never
      : never
    : never;
};

export type Override<T, R> = Omit<T, keyof R> & R;

export type CommonKeys<A, B> = keyof A & keyof B extends infer K
  ? K extends keyof A & keyof B
    ? A[K] extends B[K]
      ? B[K] extends A[K]
        ? K
        : never
      : never
    : never
  : never;

export type CommonProps<A, B> = Pick<A, CommonKeys<A, B>>;
