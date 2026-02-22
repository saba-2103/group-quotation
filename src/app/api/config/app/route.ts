import { NextResponse } from "next/server";
import { groupInsuranceAppConfig } from "@/mocks/original/group-insurance/config/app-config-mock";
import { autoClaimsAppConfig } from "@/mocks/original/auto-claims/config/app-config-mock";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get("appId") || "group-insurance";

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (appId === "auto-claims") {
        return NextResponse.json(autoClaimsAppConfig);
    }

    // Default to group insurance
    return NextResponse.json(groupInsuranceAppConfig);
}
