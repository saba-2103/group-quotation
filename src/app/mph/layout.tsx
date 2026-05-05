import { RoleSwitcher } from "@/components/mph/RoleSwitcher";

export default function MPHLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <RoleSwitcher />
    </>
  );
}
