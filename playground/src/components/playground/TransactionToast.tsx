import { toast } from 'sonner';

export type TransactionStatus = 'signing' | 'pending' | 'success' | 'error';

interface TransactionToastProps {
  status: TransactionStatus;
  txHash?: string;
  blockNumber?: number;
  error?: string;
}

export function showTransactionToast({ status, txHash, blockNumber, error }: TransactionToastProps) {
  switch (status) {
    case 'signing':
      toast.loading('Waiting for signature...', {
        description: 'Please confirm in your wallet',
        id: 'tx-toast',
      });
      break;
    
    case 'pending':
      toast.loading('Transaction submitted...', {
        description: 'Waiting for confirmation...',
        id: 'tx-toast',
      });
      break;
    
    case 'success':
      toast.success('Transaction Confirmed!', {
        description: `Block: ${blockNumber?.toLocaleString()}`,
        id: 'tx-toast',
      });
      break;
    
    case 'error':
      toast.error('Transaction Failed', {
        description: error || 'Unknown error occurred',
        action: {
          label: 'Try Again',
          onClick: () => {},
        },
        id: 'tx-toast',
      });
      break;
  }
}
