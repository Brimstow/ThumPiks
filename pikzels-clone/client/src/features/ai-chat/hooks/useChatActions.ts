import { useCallback } from 'react';
import type { EditorAction } from '../../../components/editor/hooks/useCommandExecutor';
import type { ActionResult } from '../types';

// ============================================================================
// Chat Actions Hook
// Bridges chat action output to the existing useCommandExecutor pipeline
// Wraps execution in BATCH_START/BATCH_END for single undo unit
// ============================================================================

interface UseCommandExecutorLike {
  executeAction: (action: EditorAction) => Promise<string | void>;
  startBatch?: (label: string) => void;
  endBatch?: () => void;
}

interface UseChatActionsOptions {
  commandExecutor: UseCommandExecutorLike;
  updateActionResult: (
    messageId: string,
    actionIndex: number,
    status: ActionResult['status'],
    error?: string,
    resultText?: string,
  ) => void;
}

export function useChatActions({
  commandExecutor,
  updateActionResult,
}: UseChatActionsOptions) {
  /**
   * Execute all actions from a chat message sequentially.
   * Updates action result status in the chat UI as each action executes.
   * Wraps the entire batch in BATCH_START/BATCH_END for single undo.
   */
  const executeActions = useCallback(
    async (actions: EditorAction[], messageId: string) => {
      // Start undo batch — all actions will be a single undo unit
      commandExecutor.startBatch?.(`AI: ${actions.length} action${actions.length > 1 ? 's' : ''}`);

      try {
        for (let i = 0; i < actions.length; i++) {
          updateActionResult(messageId, i, 'executing');

          try {
            const result = await commandExecutor.executeAction(actions[i]);
            // If result is a string, it's analysis text (from analyzeImage/vision)
            if (typeof result === 'string') {
              updateActionResult(messageId, i, 'success', undefined, result);
            } else {
              updateActionResult(messageId, i, 'success');
            }
          } catch (err: any) {
            updateActionResult(
              messageId,
              i,
              'error',
              err.message || 'Action failed',
            );
          }
        }
      } finally {
        // End undo batch — pushes one consolidated history entry
        commandExecutor.endBatch?.();
      }
    },
    [commandExecutor, updateActionResult],
  );

  return { executeActions };
}
