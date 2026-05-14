import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppContextProvider } from "@/components/providers/AppContextProvider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DualPanelNav } from "@/components/navigation/DualPanelNav";
import { RoleProvider } from "@/contexts/RoleContext";
import { RoleSwitcher } from "@/components/widgets/role/RoleSwitcher";
import { Toaster } from "@/components/ui/toast";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Anaira",
	description: "Anaira insurance platform",
	icons: {
		icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
		shortcut: "/favicon.svg",
		apple: "/favicon.svg",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
			</head>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<Providers>
					<RoleProvider>
						<AppContextProvider>
							<SidebarProvider defaultOpen={true}>
								<DualPanelNav />
								<main className="w-full min-w-0 flex-1 overflow-x-hidden p-6 relative">
									<SidebarTrigger className="absolute top-6 left-6 z-50 md:hidden" />
									<div className="absolute top-4 right-6 z-50">
										<RoleSwitcher />
									</div>
									<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
										{children}
									</div>
								</main>
							</SidebarProvider>
						</AppContextProvider>
					</RoleProvider>
					<Toaster />
				</Providers>
			</body>
		</html>
	);
}
