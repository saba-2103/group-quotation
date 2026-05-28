import { injectRowData } from "@/components/widgets/forms/OverlaidForm";
import type { WidgetConfig } from "@/types/widget";

// Regression coverage for the OverlaidForm rowData-substitution contract.
//
// Bug: `refreshKey: "/api/quotation/quotes/:id"` was passed to React Query's
// invalidate predicate as the literal `:id` placeholder. Real queryKeys hold
// the UUID, so the predicate matched nothing and the KeyValueGrid above the
// form retained stale values after a 204-success PUT (e.g. Key Data edit).
// `injectRowData` now substitutes `:id` (and other `:param` placeholders) in
// `refreshKey` the same way it does for `api.endpoint`.

const makeConfig = (
  overrides: Partial<WidgetConfig["props"]> = {},
): WidgetConfig => ({
  id: "edit-quote-policy-detail-form",
  type: "form-container",
  props: {
    fields: [],
    actions: [
      {
        id: "submit",
        type: "api-mutation",
        submitAction: true,
        refreshKey: "/api/quotation/quotes/:id",
        api: {
          endpoint: "/api/quotation/quotes/:id/policy-detail",
          method: "PUT",
        },
      },
    ],
    ...overrides,
  },
});

describe("OverlaidForm.injectRowData", () => {
  it("substitutes :id into both api.endpoint and refreshKey from rowData", () => {
    const enriched = injectRowData(makeConfig(), {
      id: "1cd3ad5d-a276-42d3-a815-baed9f40fded",
    });
    const action = (enriched.props?.actions as Array<Record<string, unknown>>)[0];
    expect((action.api as Record<string, unknown>).endpoint).toBe(
      "/api/quotation/quotes/1cd3ad5d-a276-42d3-a815-baed9f40fded/policy-detail",
    );
    expect(action.refreshKey).toBe(
      "/api/quotation/quotes/1cd3ad5d-a276-42d3-a815-baed9f40fded",
    );
  });

  it("leaves refreshKey untouched when no :param placeholders are present", () => {
    const config = makeConfig({
      actions: [
        {
          id: "submit",
          type: "api-mutation",
          submitAction: true,
          refreshKey: "/api/quotation/quotes/list",
          api: { endpoint: "/api/quotation/quotes/list", method: "GET" },
        },
      ],
    });
    const enriched = injectRowData(config, { id: "QTE-1" });
    const action = (enriched.props?.actions as Array<Record<string, unknown>>)[0];
    expect(action.refreshKey).toBe("/api/quotation/quotes/list");
  });

  it("keeps :id literal when rowData has no matching field", () => {
    // Defensive — substituteEndpointParams leaves unknown :params untouched
    // rather than producing "/api/.../undefined".
    const enriched = injectRowData(makeConfig(), {});
    const action = (enriched.props?.actions as Array<Record<string, unknown>>)[0];
    expect(action.refreshKey).toBe("/api/quotation/quotes/:id");
    expect((action.api as Record<string, unknown>).endpoint).toBe(
      "/api/quotation/quotes/:id/policy-detail",
    );
  });
});
