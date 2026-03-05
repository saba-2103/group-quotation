import React, { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { WidgetConfig } from "@/types/widget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { WidgetRenderer } from "@/components/registry/WidgetRenderer";

export const TabsContainer: React.FC<{ config: WidgetConfig }> = ({ config }) => {
    const { children } = config;

  const [activeTab, setActiveTab] = useState(children?.[0]?.id);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

    if (!children || children.length === 0) return null;

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="w-full mb-6 flex items-center gap-1 border-b border-border">
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
          <TabsList className="inline-flex w-max">
            {children.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                <span className="whitespace-nowrap">
                  {tab.props?.label || tab.id}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 mb-0.5"
            >
              <MoreHorizontal size={18} />
              <span className="sr-only">More tabs</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
            {children.map((tab) => (
              <DropdownMenuItem
                key={tab.id}
                onSelect={() => handleTabChange(tab.id)}
                className={activeTab === tab.id ? "bg-accent" : ""}
              >
                <span>{tab.props?.label || tab.id}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {children.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          {tab.children?.map(child => (
                        <WidgetRenderer key={child.id} config={child} />
                    ))}
                </TabsContent>
            ))}
        </Tabs>
    );
};
