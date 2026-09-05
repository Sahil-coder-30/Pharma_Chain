import React, { useState } from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import {
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Plus,
  Minus,
  ShieldCheck,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  X,
  Scan,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export const POSTerminalView: React.FC = () => {
  const {
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    verifyScan,
    completePOSSale,
    loading,
    setIsScanModalOpen,
  } = useDashboard();

  const [scanInput, setScanInput] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'CASH' | 'CARD'>('UPI');

  const subtotal = cartItems.reduce((acc, it) => acc + it.unitMrp * it.quantity, 0);
  const taxAmount = Math.round(subtotal * 0.12 * 100) / 100;
  const discount = 0;
  const grandTotal = Math.round((subtotal + taxAmount - discount) * 100) / 100;

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    verifyScan(scanInput.trim(), 'DISPENSE');
    setScanInput('');
  };

  const handleCheckout = () => {
    completePOSSale({
      patientName,
      patientPhone,
      doctorName,
      paymentMode,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Pharmacy POS & Dispensing Terminal</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Live Counter Mode
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real-time cryptographic verification with automatic double-dispense and CDSCO recall rejection
          </p>
        </div>

        <button
          onClick={() => setIsScanModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
        >
          <Scan className="w-4 h-4" />
          <span>Open Camera Scanner</span>
        </button>
      </div>

      {/* 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ─── Left: Scanner & Item Scanner (7 Cols) ──────────────── */}
        <div className="lg:col-span-7 space-y-5">
          {/* Scanner Input Box */}
          <div className="bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border)] shadow-subtle space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Scan Barcode / 2D DataMatrix Token
            </h3>

            <form onSubmit={handleManualScanSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Paste QR Verify URL, Serial Token, or Pack Hash..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !scanInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {loading ? 'Verifying...' : 'Verify & Add'}
              </button>
            </form>
          </div>

          {/* Scanned Items in Current Bill */}
          <div className="bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border)] shadow-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Scanned Medicines in Cart ({cartItems.length})
                </h3>
              </div>
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-500 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Cart</span>
                </button>
              )}
            </div>

            {cartItems.length > 0 ? (
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={item.packHash}
                    className="p-4 rounded-2xl bg-[var(--bg-element)] border border-[var(--border)] flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[var(--text-primary)] truncate">
                          {item.medicineName}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {item.batchId}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {item.genericName} • {item.dosage} • Exp: {item.expiryDate}
                      </p>
                      <p className="font-mono text-[10px] text-[var(--text-muted)] truncate max-w-md">
                        Hash: {item.packHash}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-[var(--text-primary)] block">
                          ₹{(item.unitMrp * item.quantity).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          ₹{item.unitMrp.toFixed(2)} x {item.quantity}
                        </span>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.packHash)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-[var(--border)] rounded-2xl text-xs text-[var(--text-muted)] space-y-2">
                <ShoppingCart className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
                <p className="font-semibold text-[var(--text-primary)]">POS Cart is Empty</p>
                <p>Scan medicine pack 2D barcodes or click preset pills above to add items for dispensing.</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right: Patient Billing & Checkout Summary (5 Cols) ─── */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border)] shadow-subtle space-y-5">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <Receipt className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Prescription & Patient Details</h3>
            </div>

            {/* Patient Form */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Patient Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Ananya Sharma"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Patient Phone / Mobile</label>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="+91 98112 44332"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Prescribing Doctor (Optional)</label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. A. K. Verma"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-element)] border border-[var(--border)] text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1.5">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['UPI', 'CASH', 'CARD'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        paymentMode === mode
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-[var(--bg-element)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {mode === 'UPI' && <Smartphone className="w-3.5 h-3.5" />}
                      {mode === 'CASH' && <Banknote className="w-3.5 h-3.5" />}
                      {mode === 'CARD' && <CreditCard className="w-3.5 h-3.5" />}
                      <span>{mode}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bill Financial Summary */}
            <div className="p-4 rounded-2xl bg-[var(--bg-element)] border border-[var(--border)] space-y-2 text-xs">
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span>Subtotal ({cartItems.length} items)</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span>GST Tax (12%)</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span>Prescription Discount</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">-₹{discount.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between font-bold text-sm">
                <span className="text-[var(--text-primary)]">Total Payable</span>
                <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              disabled={loading || cartItems.length === 0}
              onClick={handleCheckout}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Committing Dispense to Fabric...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Dispense & Print Invoice (₹{grandTotal.toFixed(2)})</span>
                </>
              )}
            </button>

            <div className="text-center">
              <span className="text-[10px] text-[var(--text-muted)] flex items-center justify-center gap-1 font-mono">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>Hyperledger Fabric transition: AT_SHOP → SOLD</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
