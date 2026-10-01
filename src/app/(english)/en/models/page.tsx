import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ModelsPageContent } from "@/components/ModelsPageContent";
export const metadata: Metadata = pageMetadata({ title: "Analysis Workbench", description: "Transparent composite indicators, panel econometrics, trade networks, descriptive event windows, macro drivers, reduced-form VAR and Local Projections, subject to unchanged method-specific gates.", path: "/en/models/", locale: "en" });
export default function ModelsPage() { return <ModelsPageContent />; }
