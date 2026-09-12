import { describe, expect, it, vi } from 'vitest';
import {
  executeMutation,
  validateApprovalInput,
  validateTaskInput,
} from './mutationBoundary';

describe('mutation boundary', () => {
  it('commits a valid task and reports saved', async () => {
    const feedback = vi.fn();
    const commit = vi.fn().mockResolvedValue({ id: 1 });

    await executeMutation({
      action: 'task',
      input: { title: 'Move the draft', status: 'todo' },
      validate: validateTaskInput,
      applyOptimistic: () => vi.fn(),
      commit,
      feedback,
    });

    expect(commit).toHaveBeenCalledWith({ title: 'Move the draft', status: 'todo' });
    expect(feedback).toHaveBeenLastCalledWith({ status: 'saved', message: 'Task saved.' });
  });

  it('rejects malformed approval input before committing', async () => {
    const commit = vi.fn();

    await expect(executeMutation({
      action: 'approval',
      input: { id: '', status: 'approved' },
      validate: validateApprovalInput,
      applyOptimistic: () => vi.fn(),
      commit,
    })).rejects.toThrow('Approval needs a record id.');

    expect(commit).not.toHaveBeenCalled();
  });

  it('rolls back an optimistic update when the backend rejects it', async () => {
    const rollback = vi.fn();
    const feedback = vi.fn();

    await expect(executeMutation({
      action: 'task',
      input: { title: 'Will fail' },
      validate: validateTaskInput,
      applyOptimistic: () => rollback,
      commit: vi.fn().mockRejectedValue(new Error('backend unavailable')),
      feedback,
    })).rejects.toThrow('backend unavailable');

    expect(rollback).toHaveBeenCalledOnce();
    expect(feedback).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'failed' }));
  });
});
