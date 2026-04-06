import { TransitionContainer } from "@/transitions";

export default function Template({ children }: { children: React.ReactNode }) {
  return <TransitionContainer>{children}</TransitionContainer>;
}
