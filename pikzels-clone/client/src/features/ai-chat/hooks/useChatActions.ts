import { useCallback } from 'react';
import type { EditorAction } from '../../../components/editor/hooks/useCommandExecutor';
import type { ActionResult } from '../types';

// ============================================================================
// Chat Actions Hook
// Bridges chat action output to the existing useCommandExecutor pipeline
// ============================================================================

interface UseCommandExecutorLike {
  executeAction: (action: EditorAction) => Promise<void>;
}

interface UseChatActionsOptions {
  commandExecutor: UseCommandExecutorLike;
  updateActionResult: (
    messageId: string,
    actionIndex: number,
    status: ActionResult['status'],
    error?: string,
  ) => void;
}

export function useChatActions({
  commandExecutor,
  updateActionResult,
}: UseChatActionsOptions) {
  /**
   * Execute all actions from a chat message sequentially.
   * Updates action result status in the chat UI as each action executes.
   */
  const executeActions = useCallback(
    async (actions: EditorAction[], messageId: string) => {
      for (let i = 0; i < actions.length; i++) {
        updateActionResult(messageId, i, 'executing');

        try {
          await commandExecutor.executeAction(actions[i]);
          updateActionResult(messageId, i, 'success');
        } catch (err: any) {
          updateActionResult(
            messageId,
            i,
            'error',
            err.message || 'Action failed',
          );
        }
      }
    },
    [commandExecutor, updateActionResult],
  );

  return { executeActions };
}
