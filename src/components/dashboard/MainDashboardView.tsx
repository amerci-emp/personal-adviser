"use client";

import { motion } from "framer-motion";
import { Sparkles, Plus, Building, CreditCard, DollarSign } from "lucide-react";

import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";

export function MainDashboardView() {
  // Fetch user's account and transaction data
  const { data: user } = trpc.user.profile.useQuery();
  const { data: accounts } = trpc.bankAccount.getAll.useQuery();
  
  // Check if user has connected accounts
  const hasConnectedAccounts = accounts && accounts.length > 0;
  const totalBalance = accounts?.reduce((sum, account) => sum + Number(account.balance || 0), 0) || 0;
  
  // Get recent transactions
  const recentTransactions = accounts?.flatMap(account => 
    account.transactions?.slice(0, 5) || []
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5) || [];
  return (
    <motion.div
      initial={{ opacity: 0, x: 0 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "-100%" }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Left Column: Treasury */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="lg:col-span-2 bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-6"
      >
        <h3 className="text-xl font-bold text-slate-800 mb-4">
          Your Treasury
        </h3>
        
        {hasConnectedAccounts ? (
          <div className="space-y-4">
            {/* Total Balance */}
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Total Balance</p>
                  <p className="text-2xl font-bold">${totalBalance.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-white/80" />
              </div>
            </div>
            
            {/* Account List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-700">Connected Accounts</h4>
              {accounts?.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-800">{account.name}</p>
                      <p className="text-sm text-slate-500">
                        {account.financialInstitution} • ****{account.lastFourDigits}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">${Number(account.balance || 0).toFixed(2)}</p>
                    <p className="text-xs text-slate-500 capitalize">{account.accountType}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <Building className="h-16 w-16 mx-auto text-slate-400 mb-4" />
            <h4 className="text-lg font-semibold text-slate-700">
              Your Treasury is Empty
            </h4>
            <p className="text-slate-500 mt-2 mb-6">
              Link your first account to start discovering treasure.
            </p>
            <Button className="bg-gradient-to-r from-slate-700 to-green-600 text-white font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Link First Account
            </Button>
          </div>
        )}
      </motion.div>

      {/* Right Column: Ledger */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-6"
      >
        <h3 className="text-xl font-bold text-slate-800 mb-4">The Ledger</h3>
        
        {recentTransactions.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-600 text-sm">Recent Transactions</h4>
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-slate-800 text-sm">{transaction.description}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">${Number(transaction.amount).toFixed(2)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    transaction.category === 'uncategorized' 
                      ? 'bg-yellow-100 text-yellow-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {transaction.category}
                  </span>
                </div>
              </div>
            ))}
            {recentTransactions.some(t => t.category === 'uncategorized') && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm font-medium">📝 Review Needed</p>
                <p className="text-yellow-700 text-xs">Some transactions need categorization</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <Sparkles className="h-16 w-16 mx-auto text-slate-400 mb-4" />
            <h4 className="text-lg font-semibold text-slate-700">All Clear!</h4>
            <p className="text-slate-500 mt-2">
              {hasConnectedAccounts 
                ? "No transactions found yet. They'll appear here once imported."
                : "Connect an account to see your transactions here."
              }
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
