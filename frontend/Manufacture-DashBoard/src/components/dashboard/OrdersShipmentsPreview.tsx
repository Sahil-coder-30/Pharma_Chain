import React from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import { StatusBadge } from '../common/StatusBadge';
import { ShoppingCart, Truck, ArrowRight, Building2 } from 'lucide-react';

export const OrdersShipmentsPreview: React.FC = () => {
  const { orders, setActiveNav } = useDashboard();

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-subtle flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">B2B Pharmacy Orders</h3>
          <p className="text-xs text-slate-500 mt-0.5">Commercial fulfillment & stock transfers</p>
        </div>
        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
          <ShoppingCart className="w-4 h-4" />
        </div>
      </div>

      {/* Orders List */}
      <div className="divide-y divide-slate-100 my-2 max-h-72 overflow-y-auto">
        {orders.map((ord) => (
          <div
            key={ord.id}
            onClick={() => setActiveNav('orders')}
            className="py-3 px-1 hover:bg-slate-50/70 rounded-lg cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-brand-700">
                  {ord.orderNumber}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-xs font-medium text-slate-900 truncate max-w-[180px]">
                  {ord.pharmacyName}
                </span>
              </div>
              <StatusBadge status={ord.status} size="sm" />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
              <span>
                {ord.items.map((i) => `${i.medicineName} (${i.quantity.toLocaleString()})`).join(', ')}
              </span>
              <span className="font-semibold text-slate-700">
                ₹{ord.totalAmount.toLocaleString()}
              </span>
            </div>

            {ord.trackingNumber && (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <Truck className="w-3 h-3 text-slate-400" />
                <span>Tracking: {ord.trackingNumber}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-slate-100 flex justify-end">
        <button
          onClick={() => setActiveNav('orders')}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
        >
          <span>Manage Orders & Dispatch Workflow</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
