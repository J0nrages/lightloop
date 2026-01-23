import { useCopilotAction } from "@copilotkit/react-core";
import { SalarySlider } from "@/components/gen-ui/SalarySlider";
import { Quiz } from "@/components/gen-ui/Quiz";
import { CandidateTable } from "@/components/gen-ui/CandidateTable";

export function useCopilotRegistry() {
  useCopilotAction({
    name: "showSalarySlider",
    description: "Shows a salary slider to set compensation range",
    parameters: [
      { name: "min", type: "number" },
      { name: "max", type: "number" },
      { name: "currency", type: "string" },
      { name: "current", type: "number" },
    ],
    render: (props) => {
      return <SalarySlider {...props.args as any} />;
    },
  });

  useCopilotAction({
    name: "showQuiz",
    description: "Shows a technical quiz or assessment",
    parameters: [
      { name: "question", type: "string" },
      { name: "options", type: "object" }, // Simplified
    ],
    render: (props) => {
      return <Quiz {...props.args as any} />;
    },
  });

  useCopilotAction({
    name: "showCandidates",
    description: "Shows a table of matching candidates",
    parameters: [
      { name: "candidates", type: "object" },
    ],
    render: (props) => {
      return <CandidateTable {...props.args as any} />;
    },
  });
}
