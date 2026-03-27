"use client";

import React, { useState, useEffect, useCallback } from "react";
import { WidgetConfig } from "@/types/widget";
import { DropdownOption } from "./types";
import { Dropdown } from "./dropDown";

export const SearchableDropdownWidget: React.FC<{ config: WidgetConfig }> = ({ config }) => {
  const {
    label,
    mandatory,
    value: defaultValue = "",
    options,
    placeholder,
    disabled,
    className,
  } = (config.props ?? {}) as {
    label?: string;
    mandatory?: boolean;
    value?: string;
    options?: DropdownOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
  };

  const [value, setValue] = useState<string>(defaultValue);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setValue(defaultValue ?? "");
  }, [defaultValue]);

  const handleChange = useCallback((code: string) => {
    setValue(code);
    setTouched(true);
  }, []);

  const hasError = mandatory && touched && !value;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium leading-none">
          {label}
          {mandatory && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}
      <Dropdown
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        value={value}
        onChange={handleChange}
      />
      {hasError && (
        <p className="text-xs text-destructive">{label} is required</p>
      )}
    </div>
  );
};
