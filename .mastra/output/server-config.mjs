import { registerCopilotKit } from '@ag-ui/mastra/copilotkit';

const server = {
  port: 4111,
  cors: {
    origin: "*",
    allowMethods: ["*"],
    allowHeaders: ["*"]
  },
  apiRoutes: [registerCopilotKit({
    path: "/chat",
    resourceId: "hiringAgent"
  })]
};

export { server };
