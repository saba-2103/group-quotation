import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { MswProvider } from "@/components/providers/MswProvider";
import { RoleProvider } from "@/contexts/RoleContext";
import { Toaster } from "@/components/ui/toast";
import { ScrollbarController } from "@/components/ScrollbarController";

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
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full overflow-hidden`}>
				<MswProvider>
					<Providers>
						<RoleProvider>
							{children}
							<Toaster />
							<ScrollbarController />
						</RoleProvider>
					</Providers>
				</MswProvider>
			</body>
		</html>
	);
}
