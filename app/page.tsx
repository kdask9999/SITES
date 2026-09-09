import { headers } from "next/headers";
import Dashboard from "./dashboard";

function decodeHeaderName(value: string | null, encoding: string | null) {
  if (!value) return "";
  if (encoding === "percent-encoded-utf-8") {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return value;
}

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email") || "";
  const fullName = decodeHeaderName(
    requestHeaders.get("oai-authenticated-user-full-name"),
    requestHeaders.get("oai-authenticated-user-full-name-encoding"),
  );

  return <Dashboard userName={fullName || email || "Equipe"} userEmail={email} />;
}
