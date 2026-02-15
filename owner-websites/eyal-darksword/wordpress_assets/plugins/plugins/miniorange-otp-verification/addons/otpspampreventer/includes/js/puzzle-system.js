/**
 * OTP Puzzle Verification System
 * 
 * Secure puzzle system for human verification before OTP sending.
 * Features:
 * - Server-side puzzle generation and validation
 * - Session-based security with fallback storage
 * - Multiple detection methods for puzzle requirements
 * - Comprehensive error handling and logging
 * 
 * @package otpspampreventer
 */

(function($mo) {
    'use strict';

    // Puzzle Verification System
    window.MO_OSP_Puzzle = {
        // State variables
        currentPuzzle: null,
        currentAnswer: null,
        lastUserAnswer: null,
        pendingOtpData: null,
        isShowing: false,
        puzzleCheckCount: 0,
        lastVerificationResponse: null,
        isGenerating: false, // Flag to prevent duplicate generate calls
        isVerifying: false, // Flag to prevent duplicate verify calls
        eventsBound: false, // Flag to prevent duplicate event binding

        /**
         * Initialize the puzzle system
         */
        init: function() {
            // Only bind events once to prevent duplicate handlers
            if (!this.eventsBound) {
                this.bindEvents();
                this.eventsBound = true;
            }
            this.puzzleCheckCount = 0; // Initialize counter to prevent infinite loops
        },

        /**
         * Bind all puzzle-related event handlers
         * CRITICAL: Unbind previous handlers first to prevent duplicate event binding
         */
        bindEvents: function() {
            var self = this;
            
            // CRITICAL FIX: Unbind all previous handlers to prevent duplicate event binding
            $mo(document).off('click', '.mo-osp-puzzle-close');
            $mo(document).off('click', '.mo-osp-puzzle-popup');
            $mo(document).off('click', '#mo-osp-puzzle-refresh');
            $mo(document).off('click', '#mo-osp-puzzle-verify');
            $mo(document).off('keypress', '#mo-osp-puzzle-answer');
            $mo(document).off('input', '#mo-osp-puzzle-answer');
            
            // Close puzzle popup
            $mo(document).on('click', '.mo-osp-puzzle-close', function() {
                self.closePuzzle();
            });

            // Prevent closing when clicking inside popup
            $mo(document).on('click', '.mo-osp-puzzle-popup', function(e) {
                e.stopPropagation();
            });

            // Refresh puzzle
            $mo(document).on('click', '#mo-osp-puzzle-refresh', function() {
                self.generatePuzzle();
                $mo('#mo-osp-puzzle-answer').val('').focus();
            });

            // Verify puzzle - prevent duplicate calls
            $mo(document).on('click', '#mo-osp-puzzle-verify', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Prevent duplicate calls - check if verification is already in progress
                if (self.isVerifying) {
                    return false;
                }
                
                self.verifyPuzzle();
                return false;
            });

            // Enter key in puzzle input - prevent duplicate calls
            $mo(document).on('keypress', '#mo-osp-puzzle-answer', function(e) {
                if (e.which === 13) { // Enter key
                    e.preventDefault();
                    
                    // Prevent duplicate calls
                    if (self.isVerifying) {
                        return false;
                    }
                    
                    self.verifyPuzzle();
                    return false;
                }
            });

            // Clear error on input
            $mo(document).on('input', '#mo-osp-puzzle-answer', function() {
                self.hideError();
            });

            // Note: checkForPuzzleMessage() is now only called when OTP request is made
            // This prevents puzzle popup from showing on every page load
        },

        /**
         * Check for puzzle requirement messages in DOM
         * Uses circuit breaker to prevent infinite loops
         */
        checkForPuzzleMessage: function() {
            var self = this;
            
            // Prevent infinite loop - only check if puzzle is not already showing
            if (self.isShowing) {
                return;
            }
            
            // Circuit breaker: Stop checking after 30 attempts (30 seconds) to prevent infinite loops
            if (!this.puzzleCheckCount) {
                this.puzzleCheckCount = 0;
            }
            this.puzzleCheckCount++;
            
            if (this.puzzleCheckCount > 30) {
                return;
            }
            
            
            // Look for the puzzle message in various message containers
            var messageSelectors = [
                '#mo_message',
                '.mo_message', 
                '[id*="mo_message"]',
                '.woocommerce-message',
                '.notice',
                '.alert',
                '[class*="message"]',
                '.mo-otp-message',
                'div[style*="color"]', // Catch styled message divs
                '.error',
                '.success',
                '.info'
            ];
            
            var found = false;
            var allMessages = [];
            
            // Specific puzzle message patterns (must be precise to avoid false positives)
            var puzzlePatterns = [
                'Please complete the security verification to continue',
                'solve this simple puzzle to verify you are human before sending an OTP',
                'complete the security verification to continue',
                'puzzle to verify you are human before sending',
                'security purposes, please solve this simple puzzle'
            ];
            
            for (var i = 0; i < messageSelectors.length && !found; i++) {
                $mo(messageSelectors[i]).each(function() {
                    var messageText = $mo(this).text().trim();
                    if (messageText) {
                        allMessages.push({
                            selector: messageSelectors[i],
                            text: messageText,
                            element: this
                        });
                    }
                    
                    // Check against multiple puzzle patterns
                    if (messageText && typeof messageText.includes === 'function') {
                        var messageTextLower = messageText.toLowerCase();
                        for (var j = 0; j < puzzlePatterns.length; j++) {
                            if (messageTextLower.includes(puzzlePatterns[j].toLowerCase())) {
                                // DON'T remove the message box - just clear its content and hide it temporarily
                                $mo(this).empty().hide();
                                self.showPuzzle({});
                                found = true;
                                return false;
                            }
                        }
                    }
                });
            }
            
            if (!found) {
                
                // Use exponential backoff to reduce performance impact
                var delay = Math.min(1000 + (this.puzzleCheckCount * 100), 3000); // Max 3 seconds
                
                // Continue checking with increasing delay
                setTimeout(function() {
                    self.checkForPuzzleMessage();
                }, delay);
            } else {
                // Reset counter when puzzle is found and shown
                this.puzzleCheckCount = 0;
            }
        },

        /**
         * Generate a new puzzle using secure server-side generation
         */
        generatePuzzle: function() {
            var self = this;
            
            // CRITICAL FIX: Prevent duplicate calls
            if (this.isGenerating) {
                return;
            }
            
            // Set generating flag to prevent duplicate calls
            this.isGenerating = true;
            
            $mo.ajax({
                url: mo_osp_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'mo_osp_generate_puzzle',
                    nonce: mo_osp_ajax.nonce
                },
                success: function(response) {
                    // Reset generating flag
                    self.isGenerating = false;
                    
                    if (response.success && response.data.question) {
                        self.currentPuzzle = response.data.question;
                        // SECURITY: Never store the answer client-side
                        self.currentAnswer = null;
                        
                        // SECURITY ENHANCEMENT: Display puzzle as image to prevent bot bypass
                        if (response.data.image) {
                            // Show image, hide text
                            $mo('#mo-osp-puzzle-image').attr('src', response.data.image).show();
                            $mo('#mo-osp-puzzle-text').hide();
                        } else {
                            // Fallback to text if image generation failed
                            $mo('#mo-osp-puzzle-text').text(response.data.question).show();
                            $mo('#mo-osp-puzzle-image').hide();
                        }
                        
                        $mo('#mo-osp-puzzle-answer').val('').focus();
                        self.hideError();
                        
                    } else {
                        self.showError('Failed to generate puzzle. Please try again.');
                    }
                },
                error: function() {
                    // Reset generating flag on error
                    self.isGenerating = false;
                    self.showError('Failed to generate puzzle. Please try again.');
                }
            });
        },

        /**
         * Show the puzzle popup
         */
        showPuzzle: function(otpData) {
            // Prevent duplicate calls - if puzzle is already showing, don't show again
            if (this.isShowing) {
                return;
            }
            
            this.isShowing = true;
            this.pendingOtpData = otpData;
            this.generatePuzzle();
            
            // CRITICAL: Ensure puzzle overlay has higher z-index than WooCommerce checkout popup
            // WooCommerce checkout popup uses z-index: 100000, so puzzle needs to be higher
            var $puzzleOverlay = $mo('#mo-osp-puzzle-overlay');
            $puzzleOverlay.css('z-index', '100001');
            $puzzleOverlay.removeClass('mo-osp-hidden');
            
            // Also ensure puzzle popup container has high z-index
            var $puzzlePopup = $mo('#mo-osp-puzzle-popup-outer-div');
            if ($puzzlePopup.length > 0) {
                $puzzlePopup.css('z-index', '100002');
            }
            
            $mo('body').addClass('mo-osp-puzzle-open');
            $mo('#mo-osp-puzzle-answer').focus();
        },

        /**
         * Close the puzzle popup
         */
        closePuzzle: function() {
            this.isShowing = false; // Clear flag to allow future puzzle checks
            this.isGenerating = false; // Reset generating flag
            this.isVerifying = false; // Reset verifying flag
            
            // Hide puzzle overlay
            $mo('#mo-osp-puzzle-overlay').addClass('mo-osp-hidden');
            
            // CRITICAL: Also hide the outer wrapper div (especially important for WooCommerce checkout popup)
            $mo('#mo-osp-puzzle-popup-outer-div').hide();
            
            $mo('body').removeClass('mo-osp-puzzle-open');
            this.pendingOtpData = null;
            this.hideError();
            // Re-enable verify button
            $mo('#mo-osp-puzzle-verify').prop('disabled', false);
        },

        /**
         * Verify puzzle answer using secure server-side validation
         */
        verifyPuzzle: function() {
            var self = this;
            
            // CRITICAL FIX: Prevent duplicate calls
            if (this.isVerifying) {
                return;
            }
            
            var userAnswer = parseInt($mo('#mo-osp-puzzle-answer').val());

            
            if (isNaN(userAnswer)) {
                this.showError('Please enter a valid number.');
                return;
            }
            
            // Set verifying flag to prevent duplicate calls
            this.isVerifying = true;
            
            // Disable verify button to prevent multiple clicks
            $mo('#mo-osp-puzzle-verify').prop('disabled', true);
            
            // Store user's answer for later form submission
            this.lastUserAnswer = userAnswer;
            
            
            // SECURITY ENHANCEMENT: Verify puzzle through secure session-based AJAX endpoint
            
            $mo.ajax({    
                url: mo_osp_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'mo_osp_verify_puzzle',
                    nonce: mo_osp_ajax.nonce,
                    puzzle_answer: userAnswer,
                    // SECURITY: No longer sending question - server validates against session
                    email: this.getEmailFromForm(),
                    phone: this.getPhoneFromForm(),
                    browser_id: window.mo_osp_browser_id || window.MO_OTP_SpamPreventer.browserID || ''
                },
                success: function(response) {
                    // Reset verifying flag
                    self.isVerifying = false;
                    $mo('#mo-osp-puzzle-verify').prop('disabled', false);
                    
                    if (response.success) {
                        
                        // Set global flag to indicate puzzle was just completed
                        window.mo_osp_puzzle_just_completed = true;
                        
                        // Store verification data for secure form submission
                        self.lastVerificationResponse = response.data;
                        
                        self.closePuzzle();
                        
                        // Notify spam preventer of successful puzzle completion
                        if (typeof window.MO_OSP_SpamPreventer_onPuzzleSuccess !== 'undefined') {
                            window.MO_OSP_SpamPreventer_onPuzzleSuccess();
                        }
                        
                        self.proceedWithOTP();
                    } else {
                        // SECURITY: Check if puzzle was reset (new puzzle generated)
                        if (response.data && response.data.puzzle_reset) {
                            
                            // Check if image element exists
                            var $puzzleImage = $mo('#mo-osp-puzzle-image');
                            var $puzzleText = $mo('#mo-osp-puzzle-text');
                            
                            
                            // CRITICAL: Clear answer field FIRST before updating puzzle
                            $mo('#mo-osp-puzzle-answer').val('').attr('placeholder', '?');
                            
                            // Handle puzzle image if provided
                            if (response.data.puzzle_image) {
                                
                                // Display new puzzle image (question is server-side only for security)
                                // Force image reload by adding timestamp to prevent caching
                                var imageUrl = response.data.puzzle_image;
                                var timestamp = new Date().getTime();
                                
                                // Always add timestamp to force reload, even if URL already has query params
                                if (imageUrl.indexOf('?') === -1) {
                                    imageUrl += '?t=' + timestamp;
                                } else {
                                    imageUrl += '&t=' + timestamp;
                                }
                                
                                
                                if ($puzzleImage.length > 0) {
                                    // CRITICAL: Use .on('load') to ensure image is loaded before showing
                                    $puzzleImage.off('load error').on('load', function() {
                                        $mo(this).show();
                                        $puzzleText.hide();
                                    }).on('error', function() {
                                        console.error('[Puzzle] ERROR: Failed to load puzzle image');
                                        // Fallback: show text if image fails
                                        if ($puzzleText.length > 0) {
                                            $puzzleText.text('New puzzle generated. Please refresh if image does not appear.').show();
                                        }
                                        $mo(this).hide();
                                    });
                                    
                                    // Set the src AFTER binding load handler
                                    var oldSrc = $puzzleImage.attr('src');
                                    
                                    // Force image reload by setting src
                                    if (oldSrc === imageUrl) {
                                        // If URL is same (shouldn't happen with timestamp), force reload by clearing first
                                        $puzzleImage.attr('src', '');
                                        setTimeout(function() {
                                            $puzzleImage.attr('src', imageUrl);
                                        }, 50);
                                    } else {
                                        $puzzleImage.attr('src', imageUrl);
                                    }
                                    
                                    // Ensure image is visible (in case it was hidden)
                                    $puzzleImage.show();
                                    $puzzleText.hide();
                                } else {
                                    console.error('[Puzzle] ERROR: Puzzle image element not found!');
                                }
                            } else if (response.data.puzzle_question) {
                                // Fallback: show puzzle question as text if image not available
                                if ($puzzleText.length > 0) {
                                    $puzzleText.text(response.data.puzzle_question).show();
                                    $puzzleImage.hide();
                                }
                            } else {
                                console.error('[Puzzle] ERROR: No puzzle image or question provided in response!');
                                // Show generic message
                                if ($puzzleText.length > 0) {
                                    $puzzleText.text('A new puzzle has been generated. Please try again.').show();
                                }
                                $puzzleImage.hide();
                            }
                            
                            // Clear puzzle state
                            self.currentPuzzle = null;
                            self.currentAnswer = null;
                            
                            // Hide error temporarily while new puzzle loads
                            self.hideError();
                            
                            // Show error message after a brief delay to ensure puzzle image is visible
                            setTimeout(function() {
                                self.showError(response.data.message || 'Incorrect answer. A new puzzle has been generated. Please solve it.');
                                $mo('#mo-osp-puzzle-answer').focus();
                            }, 200);
                        } else {
                            // No puzzle reset - same puzzle, just show error and allow retry
                            
                            // Just clear the answer field and show error - puzzle stays the same
                            self.showError(response.data.message || 'Incorrect answer. Please try again.');
                            $mo('#mo-osp-puzzle-answer').val('').focus();
                        }
                        
                        // Ensure verify button stays visible after incorrect answer
                        $mo('#mo-osp-puzzle-verify').show().prop('disabled', false);
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Puzzle verification AJAX error: ' + status + ' - ' + error);
                    // Reset verifying flag
                    self.isVerifying = false;
                    self.showError('Verification failed. Please try again.');
                    // Ensure verify button stays visible after error
                    $mo('#mo-osp-puzzle-verify').show().prop('disabled', false);
                }
            });
        },

        /**
         * Proceed with OTP sending after successful puzzle verification
         */
        proceedWithOTP: function() {
            var self = this; // Store reference to this for use in nested functions
            
            // Get verification data from the last successful verification
            var verificationData = this.lastVerificationResponse || {};
            
            // Add secure puzzle verification data to all forms
            $mo('form').each(function() {
                var $moform = $mo(this);
                
                // Remove any old puzzle processed flags
                $moform.find('input[name="mo_osp_puzzle_processed"]').remove();
                
                // Add puzzle verification flag
                if (!$moform.find('input[name="puzzle_verified"]').length) {
                    $moform.append('<input type="hidden" name="puzzle_verified" value="true">');
                }
                
                if (verificationData.puzzle_nonce && !$moform.find('input[name="mo_osp_puzzle_nonce"]').length) {
                    $moform.append('<input type="hidden" name="mo_osp_puzzle_nonce" value="' + verificationData.puzzle_nonce + '">');
                }
                
                if (verificationData.verification_token && !$moform.find('input[name="verification_token"]').length) {
                    $moform.append('<input type="hidden" name="verification_token" value="' + verificationData.verification_token + '">');
                }
                
                // Add the user's puzzle answer for server verification
                if (self.lastUserAnswer && !$moform.find('input[name="puzzle_answer"]').length) {
                    $moform.append('<input type="hidden" name="puzzle_answer" value="' + self.lastUserAnswer + '">');
                }
                
                // SECURITY: No longer sending puzzle question - server has it in session
            });
            
            // Set global verification flag for AJAX interception
            window.mo_osp_puzzle_verified = true;
            
            
            // PRIORITY 1: Check for external popup callback (highest priority)
            if (typeof window.MO_OSP_Puzzle_onExternalPopupSuccess === 'function') {
                try {
                    // Close puzzle before calling callback
                    self.closePuzzle();
                    window.MO_OSP_Puzzle_onExternalPopupSuccess(verificationData);
                } catch (e) {
                    console.error('Error in external popup success callback:', e);
                    // Ensure puzzle is closed even on error
                    self.closePuzzle();
                }
                return;
            }
            
            // PRIORITY 2: Check if we're in AJAX form context (callback registered by spam-preventer.js)
            if (typeof window.MO_OSP_Puzzle_onAjaxSuccess === 'function') {
                try {
                    // Close puzzle before calling callback
                    self.closePuzzle();
                    window.MO_OSP_Puzzle_onAjaxSuccess(verificationData);
                } catch (e) {
                    console.error('Error in AJAX success callback:', e);
                    // Ensure puzzle is closed even on error
                    self.closePuzzle();
                }
                return;
            }
            
            // Check if we're in popup context (callback registered by popup-timer.js or inline script)
            if (typeof window.MO_OSP_Puzzle_onPopupSuccess === 'function') {
                try {
                    // Close puzzle before calling callback
                    self.closePuzzle();
                    window.MO_OSP_Puzzle_onPopupSuccess();
                } catch (e) {
                    console.error('Error in popup success callback:', e);
                    // Ensure puzzle is closed even on error
                    self.closePuzzle();
                }
                return;
            }
            
            
            // Check if we're in a popup (DefaultPopup) - look for resend form
            var resendForm = document.getElementById('verification_resend_otp_form');
            if (resendForm) {
                // CRITICAL: Close puzzle before submitting form
                self.closePuzzle();
                
                // Add puzzle verification data to the resend form
                var puzzleVerifiedInput = document.createElement('input');
                puzzleVerifiedInput.type = 'hidden';
                puzzleVerifiedInput.name = 'puzzle_verified';
                puzzleVerifiedInput.value = 'true';
                resendForm.appendChild(puzzleVerifiedInput);
                
                if (verificationData.puzzle_nonce) {
                    var nonceInput = document.createElement('input');
                    nonceInput.type = 'hidden';
                    nonceInput.name = 'mo_osp_puzzle_nonce';
                    nonceInput.value = verificationData.puzzle_nonce;
                    resendForm.appendChild(nonceInput);
                }
                
                if (verificationData.verification_token) {
                    var tokenInput = document.createElement('input');
                    tokenInput.type = 'hidden';
                    tokenInput.name = 'verification_token';
                    tokenInput.value = verificationData.verification_token;
                    resendForm.appendChild(tokenInput);
                }
                
                // Submit the resend form to trigger OTP sending
                resendForm.submit();
                return;
            }
            
            
            // CRITICAL FIX: For popup context, show OTP form instead of reloading
            // Check if we're in a popup (DefaultPopup was shown)
            var $moPopup = $mo('#mo_site_otp_form, .mo_customer_validation-modal');
            if ($moPopup.length > 0) {
                
                // CRITICAL: Close puzzle before showing OTP popup again
                self.closePuzzle();
                
                // Show the popup again (it was hidden when puzzle was shown)
                $mo('#mo_site_otp_form').show();
                $mo('.mo_customer_validation-modal').show();
                $mo('.mo-modal-backdrop').show();
                
                // Update the message in popup to show OTP form message
                var $moPopupBody = $mo('.mo_customer_validation-modal-body');
                if ($moPopupBody.length > 0) {
                    // Check if OTP form exists in popup
                    var $moOtpForm = $mo('#mo_validate_form');
                    if ($moOtpForm.length > 0) {
                        // OTP form exists, trigger OTP sending via resend link
                        var $moResendLink = $mo('a.mo-resend, a[onclick*="mo_otp_verification_resend"]');
                        if ($moResendLink.length > 0) {
                            // Add puzzle verification data to the OTP form first
                            var $moOtpFormInputs = $moOtpForm;
                            if (!$moOtpFormInputs.find('input[name="puzzle_verified"]').length) {
                                $moOtpFormInputs.append('<input type="hidden" name="puzzle_verified" value="true">');
                            }
                            if (verificationData.puzzle_nonce && !$moOtpFormInputs.find('input[name="mo_osp_puzzle_nonce"]').length) {
                                $moOtpFormInputs.append('<input type="hidden" name="mo_osp_puzzle_nonce" value="' + verificationData.puzzle_nonce + '">');
                            }
                            if (verificationData.verification_token && !$moOtpFormInputs.find('input[name="verification_token"]').length) {
                                $moOtpFormInputs.append('<input type="hidden" name="verification_token" value="' + verificationData.verification_token + '">');
                            }
                            // Trigger resend to send OTP
                            $moResendLink.trigger('click');
                            return;
                        }
                    }
                }
            }
            
            // Fallback: For regular forms, we need to resubmit the original form
            // Since puzzle is verified, the next OTP request should succeed
            
            // Try to find the original login/submission form
            var $moOriginalForm = $mo('form[name="loginform"], form#loginform, form.wp-login-form');
            if ($moOriginalForm.length === 0) {
                // Try other common form selectors
                $moOriginalForm = $mo('form').not('#mo_validate_form').not('#validation_goBack_form').not('#verification_resend_otp_form').first();
            }
            
            if ($moOriginalForm.length > 0) {
                // Add puzzle verification data to the form
                if (!$moOriginalForm.find('input[name="puzzle_verified"]').length) {
                    $moOriginalForm.append('<input type="hidden" name="puzzle_verified" value="true">');
                }
                if (verificationData.puzzle_nonce && !$moOriginalForm.find('input[name="mo_osp_puzzle_nonce"]').length) {
                    $moOriginalForm.append('<input type="hidden" name="mo_osp_puzzle_nonce" value="' + verificationData.puzzle_nonce + '">');
                }
                if (verificationData.verification_token && !$moOriginalForm.find('input[name="verification_token"]').length) {
                    $moOriginalForm.append('<input type="hidden" name="verification_token" value="' + verificationData.verification_token + '">');
                }
                // Submit the form to trigger OTP sending
                $moOriginalForm.submit();
                return;
            }
            
            // Last resort: Reload the page
            // Store puzzle completion flag in sessionStorage
            sessionStorage.setItem('mo_osp_puzzle_completed', 'true');
            // Reload to show OTP form
            window.location.reload();
        },

        /**
         * Click the Send OTP button after puzzle verification
         */
        clickSendOTPButton: function() {
            
            // Find and click the send OTP button
            var sendButton = this.findSendOTPButton();
            
            if (sendButton && sendButton.length > 0) {
                // Trigger OTP send directly
                this.triggerOTPSendDirectly();
            } else {
                // Reset the flag after a short delay to allow user to click manually
                setTimeout(function() {
                    window.mo_otp_button_clicked = false;
                }, 2000);
            }
        },

        /**
         * Trigger OTP send directly
         */
        triggerOTPSendDirectly: function() {
            
            // Find the send OTP button
            var sendButton = this.findSendOTPButton();
            
            if (sendButton && sendButton.length > 0) {
                
                // Trigger the button click
                sendButton.trigger('click');
                
            } else {
                // Show error message
                var messageBox = $mo('#mo_message, .mo_message, [id*="mo_message"]').first();
                if (messageBox.length > 0) {
                    messageBox.empty().append('Error: Could not find Send OTP button.').css({
                        'color': '#ff5b5b',
                        'background': '#ffefef',
                        'padding': '10px',
                        'border-radius': '5px'
                    });
                } else {
                    // Fallback: Create temporary message
                    $mo('body').append('<div id="mo_osp_temp_message" style="position: fixed; top: 20px; right: 20px; background: #ffefef; color: #ff5b5b; padding: 10px; border-radius: 5px; z-index: 9999;">Error: Could not find Send OTP button.</div>');
                    setTimeout(function() {
                        $mo('#mo_osp_temp_message').remove();
                    }, 5000);
                }
            }
        },

        /**
         * Find the Send OTP button on the page
         */
        findSendOTPButton: function() {
            // Try multiple selectors to find the send OTP button
            var buttonSelectors = [
                '#mo_wc_send_otp',
                'input[id*="send_otp"]',
                'button[id*="send_otp"]',
                'input[value*="Send OTP"]',
                'button[value*="Send OTP"]',
                'input[id*="mo_wc_send_otp"]',
                'button[id*="mo_wc_send_otp"]',
                '.mo-send-otp-button',
                '[class*="send-otp"]',
                'input[name*="send_otp"]',
                'button[name*="send_otp"]'
            ];
            
            for (var i = 0; i < buttonSelectors.length; i++) {
                var button = $mo(buttonSelectors[i]);
                if (button.length > 0) {
                    return button.first();
                }
            }
            return null;
        },

        /**
         * Intercept AJAX calls to add puzzle verification data
         */
        interceptAjaxCalls: function() {
            
            var self = this;
            var originalAjax = $mo.ajax;
            
            $mo.ajax = function(options) {
                // Get verification data
                var verificationData = self.lastVerificationResponse || {};
                
                // Check for AJAX actions that might be OTP-related
                var otpActions = [
                    'miniorange_ajax_otp',
                    'mo_ajax_form_validate',
                    'mo_send_otp',
                    'mo_resend_otp',
                    'woocommerce_checkout'
                ];
                
                var isOtpRelated = false;
                if (options.data) {
                    var dataStr = typeof options.data === 'string' ? options.data : JSON.stringify(options.data);
                    for (var i = 0; i < otpActions.length; i++) {
                        if (dataStr.includes(otpActions[i]) || 
                            dataStr.includes('send_otp') || dataStr.includes('verify_otp')) {
                            isOtpRelated = true;
                            break;
                        }
                    }
                }
                
                if (isOtpRelated && window.mo_osp_puzzle_verified) {
                    
                    // Add puzzle verification data to AJAX request
                    if (typeof options.data === 'string') {
                        if (!options.data.includes('puzzle_verified')) {
                            options.data += '&puzzle_verified=true';
                        }
                        if (verificationData.puzzle_nonce && !options.data.includes('mo_osp_puzzle_nonce')) {
                            options.data += '&mo_osp_puzzle_nonce=' + encodeURIComponent(verificationData.puzzle_nonce);
                        }
                        if (verificationData.verification_token && !options.data.includes('verification_token')) {
                            options.data += '&verification_token=' + encodeURIComponent(verificationData.verification_token);
                        }
                        if (window.MO_OSP_Puzzle.lastUserAnswer && !options.data.includes('puzzle_answer')) {
                            options.data += '&puzzle_answer=' + encodeURIComponent(window.MO_OSP_Puzzle.lastUserAnswer);
                        }
                        if (!options.data.includes('mo_osp_browser_id')) {
                            options.data += '&mo_osp_browser_id=' + encodeURIComponent(window.mo_osp_browser_id || '');
                        }
                    } else {
                        // If data is null/undefined, create new data object with secure verification
                        options.data = options.data || {};
                        options.data.mo_osp_browser_id = window.mo_osp_browser_id || '';
                        
                        if (window.mo_osp_puzzle_verified) {
                            options.data.puzzle_verified = 'true';
                            if (verificationData.puzzle_nonce) {
                                options.data.mo_osp_puzzle_nonce = verificationData.puzzle_nonce;
                            }
                            if (verificationData.verification_token) {
                                options.data.verification_token = verificationData.verification_token;
                            }
                            if (window.MO_OSP_Puzzle.lastUserAnswer) {
                                options.data.puzzle_answer = window.MO_OSP_Puzzle.lastUserAnswer;
                            }
                            // SECURITY: No longer sending puzzle question - server has it in session
                        }
                    }
                    
                    
                    // Wrap the success callback for universal handling
                    var originalSuccess = options.success;
                    options.success = function(response) {
                        
                        // Check if response contains puzzle requirement (multiple detection methods)
                        var isPuzzleRequired = false;
                        var detectionMethod = '';
                        
                        // Method 1: Check structured response format
                        if (response && (response.puzzle_required === true || response.authType === 'PUZZLE_REQUIRED' || response.result === 'puzzle_required')) {
                            isPuzzleRequired = true;
                            detectionMethod = 'structured_response';
                        }
                        // Method 2: Check message content (fallback)
                        else if (response && response.message && 
                            response.message.includes('Please complete the security verification to continue')) {
                            isPuzzleRequired = true;
                            detectionMethod = 'message_content';
                        }
                        
                        if (isPuzzleRequired) {
                            
                            // Call original success handler first
                            if (originalSuccess && typeof originalSuccess === 'function') {
                                originalSuccess.call(this, response);
                            }
                            
                            // Wait a moment for DOM to update, then show puzzle
                            setTimeout(function() {
                                if (typeof MO_OSP_Puzzle !== 'undefined' && !MO_OSP_Puzzle.isShowing) {
                                    MO_OSP_Puzzle.showPuzzle({});
                                }
                            }, 500);
                            
                            // Also trigger manual puzzle check as fallback
                            setTimeout(function() {
                                if (typeof MO_OSP_Puzzle !== 'undefined') {
                                    MO_OSP_Puzzle.triggerPuzzleCheck();
                                }
                            }, 1000);
                            return;
                        }
                        
                        // Call original success handler first - let it handle all UI updates
                        if (originalSuccess && typeof originalSuccess === 'function') {
                            originalSuccess.call(this, response);
                        }
                    };
                    
                    // Also wrap error callback to catch puzzle requirements in error responses
                    var originalError = options.error;
                    options.error = function(xhr, status, error) {
                        
                        // Try to parse error response for puzzle requirements
                        try {
                            var errorResponse = JSON.parse(xhr.responseText);
                            if (errorResponse && (errorResponse.puzzle_required === true || errorResponse.authType === 'PUZZLE_REQUIRED' || errorResponse.result === 'puzzle_required')) {
                                
                                
                                // Show puzzle for error response
                                setTimeout(function() {
                                    if (typeof MO_OSP_Puzzle !== 'undefined' && !MO_OSP_Puzzle.isShowing) {
                                        MO_OSP_Puzzle.showPuzzle({});
                                    }
                                }, 500);
                                
                                // Don't call original error handler for puzzle requirements
                                return;
                            }
                        } catch (e) {
                            // Not JSON or parsing failed, continue with normal error handling
                        }
                        
                        // Call original error handler for non-puzzle errors
                        if (originalError && typeof originalError === 'function') {
                            originalError.call(this, xhr, status, error);
                        }
                    };
                }
                
                // Call the original ajax function
                return originalAjax.call(this, options);
            };
            
            // Restore original AJAX after 10 seconds (longer for universal coverage)
            setTimeout(function() {
                $mo.ajax = originalAjax;
                
            }, 10000);
        },

        /**
         * Manual trigger for puzzle when we know it should appear (after OTP request)
         */
        triggerPuzzleCheck: function() {
            
            var self = this;
            
            // Reset counter for new check sequence
            this.puzzleCheckCount = 0;
            
            // Check immediately
            this.checkForPuzzleMessage();
            
            // Only check a few more times with reasonable delays (not aggressive)
            setTimeout(function() { self.checkForPuzzleMessage(); }, 500);
            setTimeout(function() { self.checkForPuzzleMessage(); }, 1500);
        },

        /**
         * Get email from form fields
         */
        getEmailFromForm: function() {
            var email = '';
            
            // Try to get from visible email inputs first
            $mo('input[type="email"]:visible, input[name*="email"]:visible, input[id*="email"]:visible').each(function() {
                var $field = $mo(this);
                var type = ($field.attr('type') || '').toLowerCase();
                if (type === 'button' || type === 'submit' || type === 'reset') {
                    return;
                }
                var value = $field.val();
                if (value && !/send\s+otp|verify\s+otp/i.test(value)) {
                    email = value;
                    return false; // Break loop
                }
            });
            
            // Fallback to hidden inputs (from popup forms with extra_post_data)
            if (!email) {
                $mo('input[type="hidden"][name*="email"], input[type="hidden"][id*="email"]').each(function() {
                    if ($mo(this).val()) {
                        email = $mo(this).val();
                        return false; // Break loop
                    }
                });
            }
            
            
            return email;
        },

        /**
         * Get phone from form fields
         */
        getPhoneFromForm: function() {
            var phone = '';
            
            // Try to get from visible phone inputs first
            $mo('input[type="tel"]:visible, input[name*="phone"]:visible, input[id*="phone"]:visible, input[name*="mobile"]:visible').each(function() {
                var $field = $mo(this);
                var type = ($field.attr('type') || '').toLowerCase();
                if (type === 'button' || type === 'submit' || type === 'reset') {
                    return;
                }
                var value = $field.val();
                if (!value || /send\s+otp|verify\s+otp/i.test(value)) {
                    return;
                }
                // Normalize to digits/+ and require a minimum length to avoid tokens like "6ff2c895dc".
                var normalized = String(value).replace(/[^0-9+]/g, '');
                var digitCount = normalized.replace(/\D/g, '').length;
                if (digitCount >= 6) {
                    phone = normalized;
                    return false; // Break loop
                }
            });
            
            // Fallback to hidden inputs (from popup forms with extra_post_data)
            if (!phone) {
            $mo('input[type="hidden"][name*="phone"], input[type="hidden"][id*="phone"], input[type="hidden"][name*="mobile"]').each(function() {
                    var value = $mo(this).val();
                    if (!value || /send\s+otp|verify\s+otp/i.test(value)) {
                        return;
                    }
                    var normalized = String(value).replace(/[^0-9+]/g, '');
                    var digitCount = normalized.replace(/\D/g, '').length;
                    if (digitCount >= 6) {
                        phone = normalized;
                        return false; // Break loop
                    }
                });
            }
            
            
            return phone;
        },

        /**
         * Show error message in puzzle popup
         */
        showError: function(message) {
            $mo('#mo-osp-puzzle-error-text').text(message);
            $mo('#mo-osp-puzzle-error').show();
        },

        /**
         * Hide error message in puzzle popup
         */
        hideError: function() {
            $mo('#mo-osp-puzzle-error').hide();
        }
    };

    // Initialize puzzle system when document is ready
    $mo(document).ready(function() {
        // Initialize puzzle system only when needed (not automatically on every page load)
        // Puzzle will be initialized when OTP request triggers puzzle requirement
        if (typeof MO_OSP_Puzzle !== 'undefined') {
            // Initialize fully - bind events and mark as initialized
            MO_OSP_Puzzle.init();
            MO_OSP_Puzzle.initialized = true;
        }
    });

})(jQuery);
