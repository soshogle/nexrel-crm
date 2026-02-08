/**
 * Combined VNA Configuration and Routing Rules Component
 * Phase 2: Manages both VNA configs and routing rules together
 */

'use client';

import { useState, useEffect } from 'react';
import { VnaConfigurationManager } from './vna-configuration';
import { RoutingRulesBuilder } from './routing-rules-builder';

interface VnaConfig {
  id: string;
  name: string;
}

interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: {
    location?: string;
    imageType?: string[];
    patientId?: string;
    leadId?: string;
  };
  action: {
    vnaId: string;
    compress?: boolean;
  };
}

export function VnaConfigurationWithRouting() {
  const [vnas, setVnas] = useState<VnaConfig[]>([]);
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVnas();
    fetchRoutingRules();
  }, []);

  const fetchVnas = async () => {
    try {
      const response = await fetch('/api/dental/vna');
      if (response.ok) {
        const data = await response.json();
        setVnas((data.vnas || []).map((v: any) => ({ id: v.id, name: v.name })));
      }
    } catch (error) {
      console.error('Error fetching VNAs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutingRules = async () => {
    try {
      // Fetch routing rules from VNA configs
      const response = await fetch('/api/dental/vna');
      if (response.ok) {
        const data = await response.json();
        const allRules: RoutingRule[] = [];
        
        (data.vnas || []).forEach((vna: any) => {
          if (vna.routingRules && Array.isArray(vna.routingRules)) {
            allRules.push(...vna.routingRules);
          }
        });
        
        setRoutingRules(allRules);
      }
    } catch (error) {
      console.error('Error fetching routing rules:', error);
    }
  };

  const handleRulesChange = async (rules: RoutingRule[]) => {
    setRoutingRules(rules);
    
    // Save routing rules to the first VNA config (or create a default one)
    // In production, you might want to store rules separately or per-VNA
    if (vnas.length > 0) {
      try {
        await fetch('/api/dental/vna', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: vnas[0].id,
            routingRules: rules,
          }),
        });
      } catch (error) {
        console.error('Error saving routing rules:', error);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading VNA configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">VNA Configurations</h3>
        <p className="text-sm text-gray-600 mb-4">
          Configure your Vendor Neutral Archive (VNA) connections. Images will be automatically routed based on your rules.
        </p>
        <VnaConfigurationManager />
      </div>
      
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-2">Routing Rules</h3>
        <p className="text-sm text-gray-600 mb-4">
          Define rules to automatically route images to specific VNAs based on location, image type, or patient.
        </p>
        <RoutingRulesBuilder
          vnas={vnas}
          rules={routingRules}
          onRulesChange={handleRulesChange}
        />
      </div>
    </div>
  );
}
