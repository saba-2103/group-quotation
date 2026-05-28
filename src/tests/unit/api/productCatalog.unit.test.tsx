import * as productCatalog from "@/lib/api/productCatalog";

describe("productCatalog client", () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeAll(() => {
    (global as unknown as { fetch: typeof fetch }).fetch =
      fetchMock as unknown as typeof fetch;
  });

  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    (global as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  const okResponse = (body: unknown) =>
    ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify(body),
    }) as Response;

  it("hits GET /api/product-catalog/plans", async () => {
    fetchMock.mockResolvedValueOnce(okResponse([{ planNo: "GTL-BASIC" }]));
    const result = await productCatalog.listPlans();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/product-catalog/plans");
    expect(init?.method).toBe("GET");
    expect(result).toEqual([{ planNo: "GTL-BASIC" }]);
  });

  it("hits GET /api/product-catalog/products", async () => {
    fetchMock.mockResolvedValueOnce(okResponse([{ productCode: "GTL-BASE" }]));
    const result = await productCatalog.listProducts();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/product-catalog/products");
    expect(init?.method).toBe("GET");
    expect(result).toEqual([{ productCode: "GTL-BASE" }]);
  });

  it("hits GET /api/product-catalog/benefits", async () => {
    fetchMock.mockResolvedValueOnce(okResponse([{ code: "DEATH", mandatory: true }]));
    const result = await productCatalog.listBenefits();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/product-catalog/benefits");
    expect(init?.method).toBe("GET");
    expect(result).toEqual([{ code: "DEATH", mandatory: true }]);
  });
});
