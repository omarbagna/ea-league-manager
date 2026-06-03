import { Badge } from "@/components/ui/badge";

export function FormBadge({ result }: { result: "W" | "D" | "L" }) {
  const variant = result === "W" ? "win" : result === "D" ? "draw" : "loss";
  return <Badge variant={variant}>{result}</Badge>;
}
