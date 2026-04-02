export const buttonMocks = {
  variants: [
    "default",
    "secondary",
    "destructive",
    "outline",
    "ghost",
    "link",
  ] as const,

  sizes: [
    "xs",
    "sm",
    "default",
    "lg",
    "icon",
    "icon-xs",
    "icon-sm",
    "icon-lg",
  ] as const,

  labels: {
    default: "Button",
    secondary: "Secondary",
    destructive: "Delete",
    outline: "Outline",
    ghost: "Ghost",
    link: "Link",
  },

  sizeLabels: {
    xs: "XS",
    sm: "SM",
    default: "Default",
    lg: "LG",
  },

  storyLabels: {
    xs: "XS Button",
    sm: "Small Button",
    default: "Button",
    lg: "Large Button",
  },
};
