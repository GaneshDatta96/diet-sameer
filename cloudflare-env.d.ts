interface CloudflareEnv {
  ORDER_STORE: {
    get(key: string, type: "text"): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
}
