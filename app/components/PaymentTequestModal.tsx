'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ambassadorId: string;
  maxAmount: number; // pending commission
}

const MIN_PAYOUT = 3000;

const PaymentRequestModal = ({
  isOpen,
  onClose,
  ambassadorId,
  maxAmount,
}: Props) => {
  const [amount, setAmount] = useState<number>(maxAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError('');

    if (amount < MIN_PAYOUT) {
      setError(`Minimum payout is ₦${MIN_PAYOUT.toLocaleString()}`);
      return;
    }

    if (amount > maxAmount) {
      setError('Amount exceeds available balance');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('payout_requests').insert([
      {
        ambassador_id: ambassadorId,
        amount,
      },
    ]);

    setLoading(false);

    if (error) {
      setError('Something went wrong. Try again.');
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background w-full max-w-md rounded-2xl shadow-xl p-6 relative animate-in fade-in zoom-in-95">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X size={20} />
        </button>

        {/* Success State */}
        {success ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-bold mb-2">Request Submitted 🎉</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your payout request is being reviewed.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <h2 className="text-xl font-bold mb-1">Request Payout</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Withdraw your earnings to your account
            </p>

            {/* Balance */}
            <div className="bg-muted/20 rounded-lg p-4 mb-5">
              <p className="text-xs text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold">
                ₦{maxAmount.toLocaleString()}
              </p>
            </div>

            {/* Input */}
            <div className="mb-4">
              <label className="text-sm font-medium text-foreground mb-1 block">
                Amount (₦)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full border border-border rounded-lg px-4 py-2 bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Quick buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setAmount(maxAmount)}
                className="text-xs px-3 py-1 bg-muted rounded-full"
              >
                Max
              </button>
              <button
                onClick={() => setAmount(MIN_PAYOUT)}
                className="text-xs px-3 py-1 bg-muted rounded-full"
              >
                Min
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500 mb-3">{error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-primary/90"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              {loading ? 'Processing...' : 'Request Payout'}
            </button>

            {/* Note */}
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Minimum withdrawal is ₦{MIN_PAYOUT.toLocaleString()}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentRequestModal;