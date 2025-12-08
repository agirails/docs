import { z } from 'zod';

// Ethereum address validation regex
const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;

export const transactionFormSchema = z.object({
  provider: z
    .string()
    .min(1, { message: 'Provider address is required' })
    .regex(ethereumAddressRegex, { message: 'Invalid Ethereum address format' }),
  amount: z
    .string()
    .min(1, { message: 'Amount is required' })
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Amount must be greater than 0',
    })
    .refine((val) => parseFloat(val) >= 0.05, {
      message: 'Minimum amount is $0.05',
    }),
  deadlineValue: z
    .string()
    .min(1, { message: 'Deadline is required' })
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
      message: 'Deadline must be greater than 0',
    }),
  deadlineUnit: z.enum(['hours', 'days']),
  description: z
    .string()
    .max(280, { message: 'Description must be 280 characters or less' })
    .optional(),
});

export const txIdSchema = z.object({
  txId: z
    .string()
    .min(1, { message: 'Transaction ID is required' })
    .regex(/^0x[a-fA-F0-9]{64}$/, { message: 'Invalid transaction ID format' }),
});

export const stateTransitionSchema = z.object({
  txId: z
    .string()
    .min(1, { message: 'Transaction ID is required' })
    .regex(/^0x[a-fA-F0-9]{64}$/, { message: 'Invalid transaction ID format' }),
  newState: z
    .string()
    .min(1, { message: 'New state is required' }),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
export type TxIdFormValues = z.infer<typeof txIdSchema>;
export type StateTransitionFormValues = z.infer<typeof stateTransitionSchema>;

export interface ValidationErrors {
  [key: string]: string | undefined;
}

export function validateForm(
  methodId: string,
  values: Record<string, string>
): ValidationErrors {
  const errors: ValidationErrors = {};

  try {
    if (methodId === 'createTransaction') {
      transactionFormSchema.parse(values);
    } else if (['getTransaction', 'getEscrowBalance', 'cancelTransaction', 'releaseEscrow'].includes(methodId)) {
      txIdSchema.parse(values);
    } else if (methodId === 'transitionState') {
      stateTransitionSchema.parse(values);
    }
  } catch (error) {
    if (error instanceof z.ZodError && error.errors) {
      error.errors.forEach((err) => {
        const path = err.path[0] as string;
        if (path) {
          errors[path] = err.message;
        }
      });
    }
  }

  return errors;
}
