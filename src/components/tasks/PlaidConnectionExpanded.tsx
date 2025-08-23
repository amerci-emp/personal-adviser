'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, X, Shield, Eye, Database, CheckCircle, Download } from 'lucide-react';
import { PlaidLinkButton } from '../plaid/PlaidLinkButton';
import { Button } from '../ui/button';

interface PlaidConnectionExpandedProps {
  isExpanded: boolean;
  onCollapse: () => void;
  onSuccess: () => void;
}

type ConnectionState = 'idle' | 'connecting' | 'importing' | 'success';

export function PlaidConnectionExpanded({ isExpanded, onCollapse, onSuccess }: PlaidConnectionExpandedProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [importResult, setImportResult] = useState<any>(null);

  const handlePlaidSuccess = (publicToken: string, institution: { name: string; id: string }) => {
    console.log('Plaid connection successful:', institution.name);
    setConnectionState('connecting');
  };

  const handlePlaidComplete = () => {
    // Called after successful token exchange
    setConnectionState('importing');
    
    // Simulate the import process with a slight delay for better UX
    setTimeout(() => {
      setConnectionState('success');
      
      // Show success for 2 seconds, then trigger completion
      setTimeout(() => {
        onSuccess(); // Notify parent component
        // Don't collapse immediately - let user see the success
      }, 2000);
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ 
            duration: 0.4, 
            ease: "easeInOut",
            opacity: { duration: 0.3 }
          }}
          className="overflow-hidden"
        >
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            exit={{ y: -20 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white border border-green-200 rounded-lg shadow-lg mx-4 mb-4 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Connect Your Bank Account</h3>
                    <p className="text-sm text-slate-600">Securely link your account to start tracking finances</p>
                  </div>
                </div>
                <button
                  onClick={onCollapse}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {connectionState === 'idle' && (
                <>
                  {/* Security Information */}
                  <div className="bg-slate-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center mb-3">
                      <Shield className="w-5 h-5 text-green-600 mr-2" />
                      <h4 className="font-semibold text-slate-800">Your data is secure</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 text-green-500 mr-2" />
                        <span>Bank-level encryption</span>
                      </div>
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 text-green-500 mr-2" />
                        <span>Read-only access</span>
                      </div>
                      <div className="flex items-center">
                        <Database className="w-4 h-4 text-green-500 mr-2" />
                        <span>Never stored by Plaid</span>
                      </div>
                    </div>
                  </div>

                  {/* Points Reward */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-green-800">Reward for completing this task</h4>
                        <p className="text-sm text-green-600">Connect your account and earn points</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">+500</div>
                        <div className="text-sm text-green-600">Points</div>
                      </div>
                    </div>
                  </div>

                  {/* Plaid Connection */}
                  <div className="space-y-4">
                    <PlaidLinkButton 
                      onSuccess={handlePlaidSuccess}
                      onComplete={handlePlaidComplete}
                    />
                    
                    <div className="flex justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={onCollapse}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {connectionState === 'connecting' && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
                  <h4 className="font-semibold text-slate-800 mb-2">Connecting to your bank...</h4>
                  <p className="text-slate-600">This may take a moment</p>
                </div>
              )}

              {connectionState === 'importing' && (
                <div className="text-center py-8">
                  <Download className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-bounce" />
                  <h4 className="font-semibold text-slate-800 mb-2">Importing your data...</h4>
                  <p className="text-slate-600">Fetching accounts, statements, and transactions</p>
                  <div className="mt-4 bg-blue-50 rounded-lg p-3">
                    <div className="text-sm text-blue-600">
                      ✓ Accounts connected<br/>
                      ✓ Importing statements...<br/>
                      ✓ Syncing transactions...
                    </div>
                  </div>
                </div>
              )}

              {connectionState === 'success' && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h4 className="font-bold text-green-800 text-xl mb-2">🎉 Connection Complete!</h4>
                  <p className="text-green-600 mb-4">Your financial data has been imported successfully</p>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="text-sm text-green-700">
                      <div className="flex justify-between items-center mb-2">
                        <span>Task Completed:</span>
                        <span className="font-bold">+500 Points</span>
                      </div>
                      <div className="text-xs opacity-75">
                        Your account is connected and data is ready to review!
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-600 text-sm">
                    Redirecting to dashboard to view your data...
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}