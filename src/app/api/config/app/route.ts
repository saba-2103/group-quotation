import { NextResponse } from "next/server";
import { groupInsuranceAppConfig } from "@/mocks/original/group-insurance/config/app-config-mock";
import { autoClaimsAppConfig } from "@/mocks/original/auto-claims/config/app-config-mock";
import type { AppConfig } from "@shared/types";
import type { NavigationItem } from "@shared/types";
import { ROLES, type Role } from "@/types/group-pas/roles";

// Filter a menu tree by `allowedRoles`. Items without `allowedRoles` are
// visible to every role (the "public" default). Mutates a deep copy so the
// canonical mock config stays intact across requests.
function filterMenuByRole(items: NavigationItem[], role: Role): NavigationItem[] {
    return items
        .filter((item) => !item.allowedRoles || item.allowedRoles.includes(role))
        .map((item) => ({
            ...item,
            subMenuItems: item.subMenuItems
                ? filterMenuByRole(item.subMenuItems, role)
                : undefined,
        }));
}

function applyRoleFilter(config: AppConfig, role: Role | null): AppConfig {
    if (!role) return config;
    return {
        ...config,
        navigation: {
            ...config.navigation,
            menuItems: filterMenuByRole(config.navigation.menuItems, role),
        },
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get("appId") || "group-insurance";
    const roleParam = searchParams.get("role");
    const role: Role | null =
        roleParam && (ROLES as string[]).includes(roleParam)
            ? (roleParam as Role)
            : null;

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (appId === "auto-claims") {
        return NextResponse.json(applyRoleFilter(autoClaimsAppConfig, role));
    }

    // Default to group insurance
    return NextResponse.json(applyRoleFilter(groupInsuranceAppConfig, role));
}
