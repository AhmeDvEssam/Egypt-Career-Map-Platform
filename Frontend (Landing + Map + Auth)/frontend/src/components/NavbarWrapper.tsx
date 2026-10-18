"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

// Pages that should NOT show the navbar
const HIDDEN_NAVBAR_ROUTES = ["/login"];

export default function NavbarWrapper() {
  const pathname = usePathname();

  if (HIDDEN_NAVBAR_ROUTES.includes(pathname)) {
    return null;
  }

  return <Navbar />;
}
