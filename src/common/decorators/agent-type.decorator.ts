import { SetMetadata } from '@nestjs/common';

export const AGENT_CHECK_KEY = 'agent_check';

export type AgentCheckType = 'is_sales_agent' | 'is_logistic_agent';

export const AgentType = (type: AgentCheckType, allowAdmin = false) =>
  SetMetadata(AGENT_CHECK_KEY, {
    type,
    allowAdmin,
  });
