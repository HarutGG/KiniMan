import { QuizWizard } from "@/components/QuizWizard";

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const resolved =
    mode === "pair" ? "pair" : mode === "surprise" ? "surprise" : "solo";
  return <QuizWizard mode={resolved} />;
}
