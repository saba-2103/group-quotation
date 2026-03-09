import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cardMocks } from "@/stories/__mocks__";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

// --- Grid of Cards (All Variants style) ---
export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 border p-4 bg-muted/20 rounded-xl">
      {cardMocks.data.metrics.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="pb-2">
            <CardDescription>{metric.title}</CardDescription>
            <CardTitle className="text-3xl font-bold">{metric.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={metric.badge.variant as any}>
              {metric.badge.label}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  ),
};

// --- Basic Card ---

export const Default: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>{cardMocks.data.basic.title}</CardTitle>
        <CardDescription>{cardMocks.data.basic.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {cardMocks.data.basic.content}
        </p>
      </CardContent>
    </Card>
  ),
};

// --- Card with Footer Actions ---
export const WithFooter: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>{cardMocks.data.withFooter.title}</CardTitle>
        <CardDescription>
          {cardMocks.data.withFooter.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {cardMocks.data.withFooter.content}
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button variant="default">Create Quotation</Button>
      </CardFooter>
    </Card>
  ),
};

// --- Metric / Summary Card (as used in your dashboard widgets) ---
export const MetricCard: Story = {
  render: () => (
    <Card className="w-[220px]">
      <CardHeader className="pb-2">
        <CardDescription>{cardMocks.data.metric.title}</CardDescription>
        <CardTitle className="text-3xl font-bold">
          {cardMocks.data.metric.value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Badge variant={cardMocks.data.metric.badge.variant as any}>
          {cardMocks.data.metric.badge.label}
        </Badge>
      </CardContent>
    </Card>
  ),
};
