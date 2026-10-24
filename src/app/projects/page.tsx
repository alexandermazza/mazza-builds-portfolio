import type { Metadata } from "next";
import { projects, type Half } from "@/data/projects";
import { ProjectsBoard } from "@/components/projects/ProjectsBoard";

export const metadata: Metadata = {
  title: "Projects",
  description: "Things I've built - from iOS apps to trading systems to AI automation",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { shift } = await searchParams;
  const initial: Half = shift === "night" ? "night" : "day";
  // only what the tiles draw goes to the client
  const tiles = projects.map(({ slug, half, name, kind, line, fill, markColor, textColor, bento, mark, markScale }) => ({
    slug, half, name, kind, line, fill, markColor, textColor, bento, mark, markScale,
  }));
  return <ProjectsBoard initial={initial} projects={tiles} />;
}
