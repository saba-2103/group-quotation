"use client";

import React, { useState, useId } from "react";
import { WidgetConfig } from "@/types/widget";
import { DateRange } from "./types";
import { CalendarDatePicker } from "./CalendarDatePicker";
import { DateRangePicker } from "./DateRangePicker";
import { DateDisplay } from "./DateDisplay";

export const DateWidget: React.FC<{ config: WidgetConfig }> = ({ config }) => {
  const [value, setValue] = useState<string>(config.props?.value ?? "");
  const [range, setRange] = useState<DateRange>({
    from: config.props?.from ?? "",
    to: config.props?.to ?? "",
  });
  const inputId = useId();
  const props = config.props ?? {};
  const mode: "single" | "range" | "display" = props.mode ?? "single";

  switch (mode) {
    case "display":
      return (
        <div className="flex flex-col gap-1.5">
          {props.label && (
            <span className="text-sm font-medium leading-none text-muted-foreground">
              {props.label}
            </span>
          )}
          <DateDisplay value={value} />
        </div>
      );

    case "range":
      return (
        <div className="flex flex-col gap-1.5">
          {props.label && (
            <label className="text-sm font-medium leading-none">
              {props.label}
              {props.mandatory && (
                <span className="ml-1 text-destructive">*</span>
              )}
            </label>
          )}
          <DateRangePicker
            from={range.from}
            to={range.to}
            onChange={setRange}
            disabled={props.disabled}
            placeholder={props.placeholder}
          />
        </div>
      );

    default: // "single"
      return (
        <div className="flex flex-col gap-1.5">
          {props.label && (
            <label htmlFor={inputId} className="text-sm font-medium leading-none">
              {props.label}
              {props.mandatory && <span className="ml-1 text-destructive">*</span>}
            </label>
          )}
          <CalendarDatePicker
            id={inputId}
            value={value}
            onChange={setValue}
            disabled={props.disabled}
            placeholder={props.placeholder}
          />
        </div>
      );
  }
};
