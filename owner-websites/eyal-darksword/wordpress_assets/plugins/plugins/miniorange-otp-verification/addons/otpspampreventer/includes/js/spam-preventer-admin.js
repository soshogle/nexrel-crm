/**
 * OTP Spam Preventer Admin JavaScript
 *
 * @package miniorange-otp-verification/addons
 */

(function($mo) {
    'use strict';

    var MO_OSP_Admin = {
        init: function() {
            this.bindEvents();
            this.initializeAdvancedSettings();
        },

        bindEvents: function() {
            var self = this;
            
            // Settings form validation
            $mo(document).on('submit', '#mo_osp_settings_form', function(e) {
                var isValid = self.validateSettings();
                if (!isValid) {
                    e.preventDefault();
                }
            });

            // Advanced settings toggle
            $mo(document).on('click', '#mo-osp-toggle-advanced', function(e) {
                e.preventDefault();
                self.toggleAdvancedSettings();
            });

            // Real-time validation
            $mo(document).on('input', '.mo-form-input', function() {
                self.validateField($mo(this));
                
                // Also validate cross-field relationships for relevant fields
                var fieldId = $mo(this).attr('id');
                if (fieldId === 'mo_osp_max_attempts' || fieldId === 'mo_osp_hourly_limit' || fieldId === 'mo_osp_daily_limit') {
                    // Clear previous validation summary to avoid confusion
                    $mo('.mo-osp-validation-summary').remove();
                    // Validate cross-field relationships
                    self.validateCrossFieldRelationships();
                }
            });
        },

        /**
         * Initialize advanced settings state
         */
        initializeAdvancedSettings: function() {
            // Always start hidden by default, ignore localStorage for initial state
            this.hideAdvancedSettings();
        },

        /**
         * Toggle advanced settings visibility
         */
        toggleAdvancedSettings: function() {
            var $moadvancedSection = $mo('#mo-osp-advanced-settings');
            var $motoggleButton = $mo('#mo-osp-toggle-advanced');
            var $motoggleText = $mo('#mo-osp-toggle-text');
            var $motoggleIcon = $mo('#mo-osp-toggle-icon');

            if ($moadvancedSection.hasClass('mo-osp-advanced-hidden')) {
                this.showAdvancedSettings();
            } else {
                this.hideAdvancedSettings();
            }
        },

        /**
         * Show advanced settings
         */
        showAdvancedSettings: function() {
            var $moadvancedSection = $mo('#mo-osp-advanced-settings');
            var $motoggleText = $mo('#mo-osp-toggle-text');
            var $motoggleIcon = $mo('#mo-osp-toggle-icon');

            $moadvancedSection.removeClass('mo-osp-advanced-hidden').addClass('mo-osp-advanced-visible');
            $motoggleText.text('Hide Advanced');
            $motoggleIcon.addClass('rotate-180');
            
            localStorage.setItem('mo_osp_advanced_expanded', 'true');
        },

        /**
         * Hide advanced settings
         */
        hideAdvancedSettings: function() {
            var $moadvancedSection = $mo('#mo-osp-advanced-settings');
            var $motoggleText = $mo('#mo-osp-toggle-text');
            var $motoggleIcon = $mo('#mo-osp-toggle-icon');

            $moadvancedSection.removeClass('mo-osp-advanced-visible').addClass('mo-osp-advanced-hidden');
            $motoggleText.text('Show Advanced');
            $motoggleIcon.removeClass('rotate-180');
            
            localStorage.setItem('mo_osp_advanced_expanded', 'false');
        },

        /**
         * Validate individual field
         */
        validateField: function($mofield) {
            var fieldId = $mofield.attr('id');
            var value = $mofield.val();
            var isValid = true;
            var errorMessage = '';

            // Remove existing error styling
            $mofield.removeClass('mo-osp-error-field');
            $mofield.siblings('.mo-osp-validation-error').remove();

            switch (fieldId) {
                case 'mo_osp_cooldown_time':
                    var cooldownTime = parseInt(value);
                    if (isNaN(cooldownTime) || cooldownTime < 0 || cooldownTime > 86400) {
                        isValid = false;
                        errorMessage = 'Wait time must be between 0 and 86400 seconds (24 hours)';
                    }
                    break;

                case 'mo_osp_max_attempts':
                    var maxAttempts = parseInt(value);
                    if (isNaN(maxAttempts) || maxAttempts < 3 || maxAttempts > 10) {
                        isValid = false;
                        errorMessage = 'Maximum attempts must be between 3 and 10';
                    }
                    break;

                case 'mo_osp_block_time':
                    var blockTime = parseInt(value);
                    if (isNaN(blockTime) || blockTime < 60 || blockTime > 604800) {
                        isValid = false;
                        errorMessage = 'Block time must be between 60 seconds and 604800 seconds (7 days)';
                    }
                    break;

                case 'mo_osp_daily_limit':
                    var dailyLimit = parseInt(value);
                    if (isNaN(dailyLimit) || dailyLimit < 1 || dailyLimit > 1000) {
                        isValid = false;
                        errorMessage = 'Daily limit must be between 1 and 1000';
                    }
                    break;

                case 'mo_osp_hourly_limit':
                    var hourlyLimit = parseInt(value);
                    if (isNaN(hourlyLimit) || hourlyLimit < 1 || hourlyLimit > 100) {
                        isValid = false;
                        errorMessage = 'Hourly limit must be between 1 and 100';
                    }
                    break;
            }

            if (!isValid) {
                $mofield.addClass('mo-osp-error-field');
                $mofield.parent().append('<span class="mo-osp-validation-error">' + errorMessage + '</span>');
            }

            return isValid;
        },

        /**
         * Validate entire settings form
         */
        validateSettings: function() {
            var isValid = true;
            var errors = [];

            // Clear previous errors
            $mo('.mo-osp-error-field').removeClass('mo-osp-error-field');
            $mo('.mo-osp-validation-error').remove();

            // Validate all form fields
            var $mofields = $mo('#mo_osp_settings_form .mo-form-input');
            var self = this;
            $mofields.each(function() {
                if (!self.validateField($mo(this))) {
                    isValid = false;
                }
            });

            // Validate cross-field relationships
            if (isValid && !this.validateCrossFieldRelationships()) {
                isValid = false;
            }

            // Show summary if there are errors
            if (!isValid && errors.length === 0) {
                this.showValidationSummary('Please correct the highlighted fields before saving.');
            }

            return isValid;
        },

        /**
         * Show validation summary
         */
        showValidationSummary: function(message) {
            // Remove existing summary
            $mo('.mo-osp-validation-summary').remove();
            
            // Add new summary
            var $mosummary = $mo('<div class="mo-osp-validation-error mo-osp-validation-summary" style="margin-bottom: 20px; padding: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px;">' + message + '</div>');
            $mo('#mo_osp_settings_form').prepend($mosummary);
            
            // Scroll to top
            $mo('html, body').animate({
                scrollTop: $mosummary.offset().top - 100
            }, 500);
        },

        /**
         * Validate cross-field relationships to ensure settings make logical sense
         */
        validateCrossFieldRelationships: function() {
            var maxAttempts = parseInt($mo('#mo_osp_max_attempts').val()) || 3;
            var hourlyLimit = parseInt($mo('#mo_osp_hourly_limit').val()) || 5;
            var dailyLimit = parseInt($mo('#mo_osp_daily_limit').val()) || 10;
            
            var errors = [];
            
            // Hourly limit must be greater than max attempts per window
            if (hourlyLimit <= maxAttempts) {
                errors.push('Hourly limit (' + hourlyLimit + ') must be greater than max attempts per window (' + maxAttempts + ')');
                $mo('#mo_osp_hourly_limit').addClass('mo-osp-error-field');
            } else {
                $mo('#mo_osp_hourly_limit').removeClass('mo-osp-error-field');
            }
            
            // Daily limit must be greater than hourly limit
            if (dailyLimit <= hourlyLimit) {
                errors.push('Daily limit (' + dailyLimit + ') must be greater than hourly limit (' + hourlyLimit + ')');
                $mo('#mo_osp_daily_limit').addClass('mo-osp-error-field');
            } else {
                $mo('#mo_osp_daily_limit').removeClass('mo-osp-error-field');
            }
            
            // Show cross-field validation errors
            if (errors.length > 0) {
                this.showValidationSummary('Settings validation failed: ' + errors.join('; '));
                return false;
            }
            
            return true;
        },
    };

    // Initialize when document is ready
    $mo(document).ready(function() {
        if (typeof mo_osp_admin_ajax !== 'undefined') {
            MO_OSP_Admin.init();
        }
    });

    // Make it globally accessible for debugging
    window.MO_OSP_Admin = MO_OSP_Admin;

})(jQuery);