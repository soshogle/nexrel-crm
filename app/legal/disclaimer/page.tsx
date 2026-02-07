/**
 * Medical Device Disclaimer Page
 * Legal disclaimers for AI analysis and medical imaging features
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Medical Device Disclaimer',
  description: 'Important disclaimers regarding AI analysis and medical imaging features',
};

export default function DisclaimerPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Medical Device Disclaimer</h1>

      <div className="space-y-6">
        <section className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
            Important Disclaimer
          </h2>
          <div className="space-y-3 text-sm">
            <p>
              <strong>AI Analysis:</strong> The AI analysis feature is for information purposes only. 
              It is NOT intended for diagnostic use.
            </p>
            <p>
              <strong>Professional Interpretation Required:</strong> All AI-generated analysis requires 
              professional interpretation by a licensed dental professional.
            </p>
            <p>
              <strong>Not a Substitute:</strong> This software and its AI analysis capabilities are NOT 
              a substitute for professional judgment, clinical evaluation, or diagnostic procedures.
            </p>
            <p>
              <strong>No Diagnostic Claims:</strong> This software does not diagnose, treat, cure, or 
              prevent any disease or condition.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Software Classification</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            This software is classified as a <strong>practice management system</strong> and is NOT 
            registered as a medical device with Health Canada or the FDA.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The software is intended for administrative and management purposes, including:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
            <li>Patient record management</li>
            <li>Appointment scheduling</li>
            <li>Billing and invoicing</li>
            <li>Image storage and viewing</li>
            <li>Administrative workflow management</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">DICOM Image Viewing</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            The DICOM viewer is intended for:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>Displaying and viewing medical images</li>
            <li>Image manipulation (zoom, pan, rotate)</li>
            <li>Measurement tools for reference</li>
            <li>Annotation capabilities</li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            The viewer does NOT provide diagnostic capabilities and requires professional 
            interpretation of all images.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">User Responsibility</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Users of this software acknowledge and agree that:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
            <li>All clinical decisions must be made by licensed professionals</li>
            <li>AI analysis is advisory only and not binding</li>
            <li>Professional judgment supersedes any AI recommendations</li>
            <li>Users are responsible for compliance with applicable regulations</li>
            <li>Users must maintain appropriate professional liability insurance</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Limitation of Liability</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This software is provided "as is" without warranties of any kind. The software provider 
            shall not be liable for any damages arising from the use or inability to use this software, 
            including but not limited to diagnostic errors, treatment decisions, or patient outcomes.
          </p>
        </section>

        <section className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Contact</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            For questions about this disclaimer or regulatory compliance, please contact:
          </p>
          <p className="text-sm mt-2">
            <strong>Email:</strong> legal@yourcompany.com<br />
            <strong>Phone:</strong> [Your Phone Number]
          </p>
        </section>
      </div>

      <div className="mt-8 pt-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
