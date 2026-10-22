import { HealthierApp } from "@/components/healthier-app";
import { AppProviders } from "@/components/providers";

export default function Home() {
  return (
    <AppProviders>
      <HealthierApp />
    </AppProviders>
  );
}
