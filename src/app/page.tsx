import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';


// Creates new Branch for accounting and payout module changes.
export default function Home() {
	return (
		<div className="min-h-screen bg-background p-8 font-[family-name:var(--font-geist-sans)]">
			<main className="max-w-4xl mx-auto space-y-8">
				<div className="space-y-2">
					<h1 className="text-3xl font-bold tracking-tight">Keystone UI Port</h1>
					<p className="text-muted-foreground">
						Welcome to the ported UI components and schema-driven engine.
					</p>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Dashboard</CardTitle>
							<CardDescription>
								Schema-driven dashboard with metrics and charts.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/test-dashboard">
								<Button>View Dashboard</Button>
							</Link>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Claims List</CardTitle>
							<CardDescription>
								Data table with filters and actions.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/claims">
								<Button variant="outline">View Claims</Button>
							</Link>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Quotations List</CardTitle>
							<CardDescription>
								Group Insurance Quotations mapping.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/quotations">
								<Button variant="outline">View Quotations</Button>
							</Link>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	);
}
