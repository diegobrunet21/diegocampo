import React from "react";
import { Zap, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-400/20 mb-6">
          <Zap className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-6xl font-bold text-[#f1f5f9] mb-2">404</h1>
        <p className="text-[#94a3b8] mb-8">This page doesn't exist in DealMapper</p>
        <Link
          to={createPageUrl("Dashboard")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}