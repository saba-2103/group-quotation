import type { FormConfig } from "@shared/types";

// ============================================
// Shared Form Configurations
// ============================================

export const userRegistrationFormConfig: FormConfig = {
  id: "user-registration-form",
  title: "Create Account",
  description: "Fill in your details to create a new account",
  layout: {
    type: "grid",
    columns: 2,
    gap: "lg"
  },
  fields: [
    {
      id: "firstName",
      name: "firstName",
      label: "First Name",
      type: "text" as const,
      order: 1,
      size: "sm",
      placeholder: "John",
      validation: {
        required: true
      }
    },
    {
      id: "lastName",
      name: "lastName",
      label: "Last Name",
      type: "text" as const,
      order: 2,
      size: "sm",
      placeholder: "Doe",
      validation: {
        required: true
      }
    },
    {
      id: "email",
      name: "email",
      label: "Email Address",
      type: "email",
      order: 3,
      size: "full",
      placeholder: "Enter your email",
      validation: {
        required: true,
        email: true
      },
      icon: "Mail"
    },
    {
      id: "password",
      name: "password",
      label: "Password",
      type: "password",
      order: 4,
      size: "sm",
      placeholder: "Enter password",
      validation: {
        required: true,
        minLength: 8
      },
      icon: "Lock"
    },
    {
      id: "confirmPassword",
      name: "confirmPassword",
      label: "Confirm Password",
      type: "password",
      order: 5,
      size: "sm",
      placeholder: "Confirm password",
      validation: {
        required: true,
        minLength: 8
      },
      icon: "Lock"
    }
  ],
  actions: [
    {
      id: "submit",
      label: "Create Account",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/auth/register",
        method: "POST"
      }
    }
  ]
};