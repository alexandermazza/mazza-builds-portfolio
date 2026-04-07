import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Mazza Builds — Solo Indie Developer";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  const spaceGroteskBold = await readFile(
    join(process.cwd(), "public/fonts/SpaceGrotesk-Bold.ttf")
  );
  const spaceMonoRegular = await readFile(
    join(process.cwd(), "public/fonts/SpaceMono-Regular.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          background: "#000000",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
        }}
      >
        <div
          style={{
            fontFamily: "Space Grotesk",
            fontSize: "72px",
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
          }}
        >
          MAZZA BUILDS
        </div>
        <div
          style={{
            fontFamily: "Space Mono",
            fontSize: "16px",
            fontWeight: 400,
            color: "#999999",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          SOLO INDIE DEVELOPER
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Space Grotesk",
          data: spaceGroteskBold,
          style: "normal",
          weight: 700,
        },
        {
          name: "Space Mono",
          data: spaceMonoRegular,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}
