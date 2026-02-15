/**
 * Popup Preview Script
 * Prevents form submission in preview mode for all popup types
 * Used by UserChoicePopup, ExternalPopup, and ErrorPopup
 */
(function($mo) {
    'use strict';

    /**
     * Global function to submit the validation go back form
     * Used by ErrorPopup and other popup types
     */
    window.mo_validation_goback = function() {
        var form = document.getElementById("validation_goBack_form");
        if (form) {
            form.submit();
        }
    };

    /**
     * Initialize popup preview functionality
     * Works with both moUserChoicePreview and moExternalPreview localization objects
     */
    function initPopupPreview() {
        // Check for UserChoice preview mode
        var isUserChoicePreview = typeof moUserChoicePreview !== 'undefined' && moUserChoicePreview.isPreview;
        
        // Check for External preview mode
        var isExternalPreview = typeof moExternalPreview !== 'undefined' && moExternalPreview.isPreview;

        // Only proceed if in preview mode
        if (!isUserChoicePreview && !isExternalPreview) {
            return;
        }

        // Prevent form submission in preview mode
        $mo("#mo_validate_form").submit(function(e) {
            e.preventDefault();
        });
    }

    // Initialize when document is ready
    $mo(document).ready(function() {
        initPopupPreview();
    });

})(jQuery);

