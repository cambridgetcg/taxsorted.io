import type { ReactNode } from "react";

export default function LearnLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div lang="en" dir="ltr">
      {children}
    </div>
  );
}
