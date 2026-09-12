import type { ForumPost, Task } from '../app/components/api';

export type MutationStatus = 'idle' | 'saving' | 'saved' | 'failed';

export interface MutationFeedback {
  status: MutationStatus;
  message?: string;
}

export class MutationError extends Error {
  readonly action: string;

  constructor(action: string, message: string) {
    super(message);
    this.name = 'MutationError';
    this.action = action;
  }
}

export interface MutationConfig<T> {
  action: string;
  input: unknown;
  validate: (input: unknown) => T;
  applyOptimistic: () => () => void;
  commit: (input: T) => Promise<unknown>;
  feedback?: (feedback: MutationFeedback) => void;
}

export async function executeMutation<T>(config: MutationConfig<T>): Promise<void> {
  let rollback: (() => void) | undefined;

  try {
    const input = config.validate(config.input);
    config.feedback?.({ status: 'saving', message: `Saving ${config.action}…` });
    rollback = config.applyOptimistic();
    await config.commit(input);
    config.feedback?.({ status: 'saved', message: `${capitalize(config.action)} saved.` });
  } catch (error) {
    rollback?.();
    const message = error instanceof Error ? error.message : 'The change could not be saved.';
    config.feedback?.({
      status: 'failed',
      message: `${capitalize(config.action)} failed. Check your connection and try again. ${message}`,
    });
    throw new MutationError(config.action, message);
  }
}

export function validateTaskInput(input: unknown): Partial<Task> {
  return validateRecord<Partial<Task>>(input, 'task', ['title', 'person', 'status', 'priority']);
}

export function validateContentItemInput(input: unknown): Partial<ForumPost> {
  return validateRecord<Partial<ForumPost>>(input, 'content item', ['author', 'content']);
}

export interface ApprovalInput {
  id: string;
  status: 'approved' | 'rejected' | 'pending';
  note?: string;
}

export function validateApprovalInput(input: unknown): ApprovalInput {
  if (!isRecord(input) || typeof input.id !== 'string' || input.id.trim() === '') {
    throw new Error('Approval needs a record id.');
  }
  if (input.status !== 'approved' && input.status !== 'rejected' && input.status !== 'pending') {
    throw new Error('Approval status must be approved, rejected, or pending.');
  }
  if (input.note !== undefined && typeof input.note !== 'string') {
    throw new Error('Approval note must be text.');
  }
  const note = typeof input.note === 'string' ? input.note : undefined;
  return { id: input.id, status: input.status, note };
}

function validateRecord<T>(input: unknown, label: string, requiredFields: string[]): T {
  if (!isRecord(input)) throw new Error(`${capitalize(label)} data must be an object.`);
  for (const field of requiredFields) {
    if (field in input && input[field] !== undefined && typeof input[field] !== 'string') {
      throw new Error(`${capitalize(label)} ${field} must be text.`);
    }
  }
  return input as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
