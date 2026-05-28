import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// PlanForm interaction tests for the PROP-0014 compose flow.
//
// Covers the happy path: pick a template → products + cover formula populate
// → submit dispatches the expected api-mutation body. Plus one negative-guard:
// removing a non-mandatory benefit drops it from the submitted payload.

// ─── Mocks ──────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "QTE-2026-0099" }),
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const mockDispatch = jest.fn().mockResolvedValue(undefined);
jest.mock("@/hooks/useActionHandler", () => ({
  useActionHandler: () => mockDispatch,
}));

// Suppress the confirm() check so applying a template after the form has
// products doesn't block the test. Default to allow.
const confirmSpy = jest.spyOn(window, "confirm").mockImplementation(() => true);

const TEMPLATE_PLANS = [
  {
    planNo: "GTL-STANDARD",
    planName: "Group Term Life — Standard",
    rateCardFile: "rate-cards/gtl-standard-2026.dmn",
    products: [
      {
        productCode: "GTL-BASE",
        productName: "Group Term Life — Base",
        productType: "BASE",
        benefits: [
          { code: "DEATH", name: "Death Benefit", mandatory: true },
          { code: "TERMINAL_ILLNESS", name: "Terminal Illness", mandatory: true },
        ],
        exclusions: [{ code: "SUICIDE_12_MONTHS", name: "Suicide 12 months" }],
      },
      {
        productCode: "APD",
        productName: "Accidental Permanent Disability Rider",
        productType: "RIDER",
        benefits: [
          { code: "ACCIDENTAL_TPD", name: "Accidental TPD", mandatory: true },
          { code: "ACCIDENTAL_PPD", name: "Accidental Partial PD", mandatory: false },
        ],
        exclusions: [],
      },
    ],
    coverAmountFormula: {
      type: "MULTIPLE_OF_MEMBER_ATTRIBUTE",
      multiplicationFactor: 4,
      memberAttributeName: "salary",
    },
    freeCoverLimitFormula: { type: "FIXED", fixedAmount: 5_000_000 },
  },
];

const CATALOG_PRODUCTS = [
  ...TEMPLATE_PLANS[0].products,
  {
    productCode: "WP",
    productName: "Waiver of Premium Rider",
    productType: "RIDER",
    benefits: [{ code: "WAIVER_OF_PREMIUM", name: "Waiver of Premium", mandatory: true }],
    exclusions: [],
  },
];

jest.mock("@/lib/api/productCatalog", () => ({
  listPlans: jest.fn(),
  listProducts: jest.fn(),
  listBenefits: jest.fn(),
}));

import * as productCatalog from "@/lib/api/productCatalog";
import { useOverlayStore } from "@/hooks/useOverlayStore";
import { PlanForm } from "@/components/widgets/forms/PlanForm";

beforeEach(() => {
  mockDispatch.mockClear();
  confirmSpy.mockClear();
  (productCatalog.listPlans as jest.Mock).mockResolvedValue(TEMPLATE_PLANS);
  (productCatalog.listProducts as jest.Mock).mockResolvedValue(CATALOG_PRODUCTS);
  (productCatalog.listBenefits as jest.Mock).mockResolvedValue([]);
  useOverlayStore.setState({ openOverlays: {} });
});

afterAll(() => {
  confirmSpy.mockRestore();
});

const renderInAddMode = () => {
  // Open the overlay in add mode with the quote id; PlanForm reads from the
  // overlay store on mount.
  useOverlayStore.getState().open("plan-edit-form", "sheet", {
    _mode: "add",
    quoteId: "QTE-2026-0099",
    // PlanForm gates submit on the parent quote's censusFileFormat being set
    // (backend rejects POST /quotes/{id}/plans otherwise). Provide a minimal
    // object so the form's submit button enables.
    censusFileFormat: {
      fileType: "CSV",
      headerRowCount: 1,
      columns: [],
    },
  });
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PlanForm />
    </QueryClientProvider>,
  );
};

describe("PlanForm — Product Catalog compose flow", () => {
  it("template picker seeds products, formula, and rate card; submit posts the composed body", async () => {
    const user = userEvent.setup();
    renderInAddMode();

    // Set the plan number first so validation passes once products land.
    const planNoInput = await screen.findByLabelText(/Plan number/i);
    await user.type(planNoInput, "01");

    // Wait for the template query to resolve.
    await waitFor(() => {
      expect(productCatalog.listPlans).toHaveBeenCalled();
    });

    // Open the template Select and pick GTL-STANDARD.
    const templateTrigger = screen.getByTestId("template-trigger");
    await user.click(templateTrigger);
    const option = await screen.findByRole("option", {
      name: /GTL-STANDARD/i,
    });
    await user.click(option);

    // Both products from the template render.
    await waitFor(() => {
      expect(screen.getByTestId("product-card-GTL-BASE")).toBeInTheDocument();
      expect(screen.getByTestId("product-card-APD")).toBeInTheDocument();
    });

    // Rate card pre-fills from the template.
    expect(screen.getByLabelText(/Rate card file/i)).toHaveValue(
      "rate-cards/gtl-standard-2026.dmn",
    );

    // Submit.
    const submit = screen.getByTestId("plan-form-submit");
    await waitFor(() => expect(submit).not.toBeDisabled());
    await user.click(submit);

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledTimes(1));
    const action = mockDispatch.mock.calls[0][0];
    expect(action).toMatchObject({
      type: "api-mutation",
      api: {
        endpoint: "/api/quotation/quotes/QTE-2026-0099/plans",
        method: "POST",
      },
    });
    const body = action.api.body;
    expect(body.planNo).toBe("01");
    expect(body.rateCardFile).toBe("rate-cards/gtl-standard-2026.dmn");
    expect(body.products).toHaveLength(2);
    expect(body.products[0].productCode).toBe("GTL-BASE");
    expect(body.products[1].productCode).toBe("APD");
    expect(body.coverAmountFormula).toMatchObject({
      type: "MULTIPLE_OF_MEMBER_ATTRIBUTE",
      multiplicationFactor: 4,
      memberAttributeName: "salary",
    });
    expect(body.freeCoverLimitFormula).toMatchObject({
      type: "FIXED",
      fixedAmount: 5_000_000,
    });
  });

  it("removes a non-mandatory benefit from the submitted body", async () => {
    const user = userEvent.setup();
    renderInAddMode();

    await user.type(await screen.findByLabelText(/Plan number/i), "02");

    await waitFor(() => expect(productCatalog.listPlans).toHaveBeenCalled());
    await user.click(screen.getByTestId("template-trigger"));
    await user.click(await screen.findByRole("option", { name: /GTL-STANDARD/i }));

    // APD has ACCIDENTAL_PPD as the only non-mandatory benefit.
    const removeBtn = await screen.findByRole("button", {
      name: /Remove benefit ACCIDENTAL_PPD/i,
    });
    await user.click(removeBtn);

    // Mandatory DEATH cannot be removed — sanity check that no remove
    // button exists for it.
    expect(
      screen.queryByRole("button", { name: /Remove benefit DEATH/i }),
    ).not.toBeInTheDocument();

    const submit = screen.getByTestId("plan-form-submit");
    await waitFor(() => expect(submit).not.toBeDisabled());
    await user.click(submit);

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledTimes(1));
    const body = mockDispatch.mock.calls[0][0].api.body;
    const apd = body.products.find(
      (p: { productCode: string }) => p.productCode === "APD",
    );
    expect(apd.benefits.map((b: { code: string }) => b.code)).toEqual([
      "ACCIDENTAL_TPD",
    ]);
  });
});
