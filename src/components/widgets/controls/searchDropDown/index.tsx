"use client";

import React, { useState } from "react";
import { WidgetConfig } from "@/types/widget";
import { Dropdown } from "./dropDown";

export const SearchableDropdownWidget: React.FC<{ config: WidgetConfig }> = ({
  config,
}) => {
  const [value, setValue] = useState<string>(config.props?.value ?? "");
  const props = config.props ?? {};

  return (
    <div className="flex flex-col gap-1.5">
      {props.label && (
        <label className="text-sm font-medium leading-none">
          {props.label}
          {props.mandatory && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}
      <Dropdown
        variableCode={props.variableCode}
        entityId={props.entityId}
        language={props.language}
        endpoint={props.endpoint}
        mandatory={props.mandatory}
        options={props.options}
        value={value}
        onChange={setValue}
        placeholder={props.placeholder}
        disabled={props.disabled}
      />
    </div>
  );
};
