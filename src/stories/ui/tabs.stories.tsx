import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { tabsMocks } from "@/stories/__mocks__";

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

// --- All Variants Composite Story ---

export const AllVariants: Story = {
  render: () => {
    return (
      <div className="flex flex-col gap-12 space-y-8 max-w-4xl p-4">
        <div>
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">
            Default (Pill Design)
          </h3>
          <Tabs defaultValue={tabsMocks.tabs.simple[0]}>
            <TabsList variant="default">
              {tabsMocks.tabs.simple.map((tab) => (
                <TabsTrigger key={tab} variant="default" value={tab}>
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="border border-t-0 p-4 rounded-b-lg border-muted">
              {tabsMocks.tabs.simple.map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-0">
                  {tabsMocks.content[tab.toLowerCase().replace(" ", "")] ||
                    `${tab} content goes here.`}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">
            Case Variant (Underline Design)
          </h3>
          <Tabs defaultValue={tabsMocks.tabs.case[0]}>
            <TabsList variant="case">
              {tabsMocks.tabs.case.slice(0, 2).map((tab) => (
                <TabsTrigger key={tab} variant="case" value={tab}>
                  {tab}
                </TabsTrigger>
              ))}
              <TabsTrigger variant="case" value="disabled" disabled>
                Disabled Tab
              </TabsTrigger>
            </TabsList>
            <div className="p-4 bg-muted/10">
              {tabsMocks.tabs.case.slice(0, 2).map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-0">
                  {tabsMocks.content[tab.toLowerCase().replace(" ", "")] ||
                    `${tab} tab content.`}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">
            Many Tabs (Horizontal Scroll)
          </h3>
          <Tabs defaultValue={tabsMocks.tabs.many[0]}>
            <TabsList
              variant="case"
              className="overflow-x-auto overflow-y-hidden border-b block whitespace-nowrap scrollbar-hide"
            >
              {tabsMocks.tabs.many.map((tab) => (
                <TabsTrigger key={tab} variant="case" value={tab}>
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="p-4 bg-muted/10">
              {tabsMocks.tabs.many.map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-0">
                  {tab} specific payload.
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
      </div>
    );
  },
};

// --- Default Variant (pill-style background) ---
export const Default: Story = {
  render: () => (
    <Tabs defaultValue={tabsMocks.tabs.simple[0]}>
      <TabsList variant="default">
        {tabsMocks.tabs.simple.map((tab) => (
          <TabsTrigger key={tab} variant="default" value={tab}>
            {tab}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabsMocks.tabs.simple.map((tab) => (
        <TabsContent key={tab} value={tab}>
          <p className="text-sm text-muted-foreground p-4">
            {tabsMocks.content[tab.toLowerCase().replace(" ", "")] ||
              `${tab} content goes here.`}
          </p>
        </TabsContent>
      ))}
    </Tabs>
  ),
};

// --- Case Variant (underline-style, used in quotation detail tabs) ---
export const Case: Story = {
  render: () => (
    <Tabs defaultValue={tabsMocks.tabs.case[0]}>
      <TabsList variant="case">
        {tabsMocks.tabs.case.map((tab) => (
          <TabsTrigger key={tab} variant="case" value={tab}>
            {tab}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabsMocks.tabs.case.map((tab) => (
        <TabsContent key={tab} value={tab}>
          <p className="text-sm text-muted-foreground p-4">
            {tabsMocks.content[tab.toLowerCase().replace(" ", "")] ||
              `${tab} tab content.`}
          </p>
        </TabsContent>
      ))}
    </Tabs>
  ),
};

// --- Disabled Tab ---
export const WithDisabledTab: Story = {
  render: () => (
    <Tabs defaultValue={tabsMocks.tabs.caseWithDisabled[0]}>
      <TabsList variant="case">
        {tabsMocks.tabs.caseWithDisabled.slice(0, 2).map((tab) => (
          <TabsTrigger key={tab} variant="case" value={tab}>
            {tab}
          </TabsTrigger>
        ))}
        <TabsTrigger variant="case" value="plans" disabled>
          Plans (Disabled)
        </TabsTrigger>
      </TabsList>
      {tabsMocks.tabs.caseWithDisabled.slice(0, 2).map((tab) => (
        <TabsContent key={tab} value={tab}>
          <p className="text-sm text-muted-foreground p-4">
            {tabsMocks.content[tab.toLowerCase().replace(" ", "")] ||
              `${tab} content.`}
          </p>
        </TabsContent>
      ))}
    </Tabs>
  ),
};

// --- Many Tabs (as in quotation-detail with 20 tabs) ---
export const ManyTabs: Story = {
  render: () => {
    return (
      <Tabs defaultValue={tabsMocks.tabs.many[0]}>
        <TabsList variant="case" className="overflow-x-auto">
          {tabsMocks.tabs.many.map((tab) => (
            <TabsTrigger key={tab} variant="case" value={tab}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabsMocks.tabs.many.map((tab) => (
          <TabsContent key={tab} value={tab}>
            <p className="text-sm text-muted-foreground p-4">
              {tab} content goes here.
            </p>
          </TabsContent>
        ))}
      </Tabs>
    );
  },
};
