import { Mastra } from '@mastra/core/mastra'
import { Agent } from '@mastra/core/agent'
import { registerCopilotKit } from '@ag-ui/mastra/copilotkit'

export const hiringAgent = new Agent({
  id: 'hiringAgent',
  name: 'Hiring Assistant',
  instructions: `
    You are a professional hiring assistant for Lightloop. 
    Your goal is to help users find and manage candidates, define roles, and set compensation.
    
    Maintain a polished, minimalistic, and helpful tone (Apple/ChatGPT style).
    Use Generative UI components when appropriate:
    - Use 'SalarySlider' when discussing compensation.
    - Use 'Quiz' for technical assessments.
    - Use 'CandidateTable' for showing candidate lists.
  `,
  model: {
    provider: 'OPENAI',
    name: 'gpt-4o',
  } as any,
})

export const mastra = new Mastra({
  agents: { hiringAgent },
  server: {
    port: 4111,
    cors: {
      origin: '*',
      allowMethods: ['*'],
      allowHeaders: ['*'],
    },
    apiRoutes: [
      registerCopilotKit({
        path: '/chat',
        resourceId: 'hiringAgent'
      })
    ]
  },
})
